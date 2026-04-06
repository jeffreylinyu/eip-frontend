/**
 * Blob 檔案下載工具
 * 用於處理需要下載二進位檔案（如 Word、PDF）的 API 請求
 * 直接使用 axios 以避免 http 攔截器改寫成功回應的 blob；但認證標頭與 http 一致（含 X-Effective-View-Type）
 */

import { storage, StorageKeys } from './storage'
import { getApiBaseURL } from '@/utils/apiBaseUrl'
import { resolveEffectiveViewTypeForHttpRequest } from '@/utils/effectiveViewTypeApi'
import {
  isPerspectiveOrPermission401Payload,
  parseAxios401ResponseData
} from '@/utils/authHttpErrors'
import type { AxiosResponse, AxiosRequestConfig } from 'axios'

export interface BlobDownloadOptions {
  /** API 端點路徑（相對於 baseURL） */
  url: string
  /** 請求方法 */
  method?: 'GET' | 'POST'
  /** 請求體資料（POST 請求時使用） */
  data?: any
  /** 查詢參數（GET 請求時使用） */
  params?: Record<string, string | number | boolean>
  /** 額外的 headers */
  headers?: Record<string, string>
  /** 超時時間（毫秒），預設 60000 */
  timeout?: number
  /** 是否包含 Content-Type header，預設 true（POST 時） */
  includeContentType?: boolean
  /** 用於中途取消請求的 AbortSignal */
  signal?: AbortSignal
}

/**
 * 下載 Blob 檔案
 * @param options 下載選項
 * @returns Promise<AxiosResponse> 完整的 response 物件（包含 headers）
 */
export const downloadBlob = async (options: BlobDownloadOptions): Promise<AxiosResponse> => {
  const {
    url,
    method = 'GET',
    data,
    params,
    headers: customHeaders = {},
    timeout = 60000,
    includeContentType = method === 'POST',
    signal
  } = options

  // 從 storage 獲取 token 和 userId（與 http 攔截器保持一致）
  const token = storage.get<string>(StorageKeys.AUTH_TOKEN)
  const authUser = storage.get<{ userId?: string }>(StorageKeys.AUTH_USER)

  if (!token) {
    throw new Error('未找到認證 token，請重新登入')
  }

  // 構建 headers
  const headers: Record<string, string> = {
    Accept:
      'application/octet-stream, application/vnd.openxmlformats-officedocument.wordprocessingml.document, */*',
    Authorization: `Bearer ${token}`,
    ...customHeaders
  }

  if (includeContentType && !customHeaders['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (authUser?.userId) {
    headers['userId'] = authUser.userId
  }

  const effectiveView = resolveEffectiveViewTypeForHttpRequest()
  if (effectiveView) {
    headers['X-Effective-View-Type'] = effectiveView
  }

  // 動態導入 axios
  const axios = await import('axios')

  const baseURL = getApiBaseURL()

  // 構建請求配置
  const config: AxiosRequestConfig = {
    method,
    url: `${baseURL}${url}`,
    responseType: 'blob',
    headers,
    timeout
  }
  if (signal) {
    config.signal = signal
  }

  if (method === 'POST' && data) {
    config.data = data
  }

  if (method === 'GET' && params) {
    config.params = params
  }

  // 發送請求（blob 下載不走 http.ts 攔截器，因此這裡需要自行處理 401）
  let response: AxiosResponse
  try {
    response = await axios.default(config)
  } catch (error: any) {
    const status = error?.response?.status
    if (status === 401) {
      const parsed401 = await parseAxios401ResponseData(error?.response?.data)

      if (isPerspectiveOrPermission401Payload(parsed401)) {
        const ep = parsed401 as Record<string, unknown>
        const text =
          (typeof ep?.message === 'string' && ep.message) ||
          (typeof ep?.error === 'string' && ep.error) ||
          '目前視角無權限存取此功能，請確認已切換監造／營造'
        try {
          const toastServiceModule = await import('@/components/bootstrap/ToastService.js')
          toastServiceModule.default?.warning?.(text)
        } catch {
          /* ignore */
        }
        console.warn('[Auth] 401 視角／權限（blob 下載，非登入過期）:', text)
        throw new Error(text)
      }

      // 登入過期：與 http 攔截器一致，清狀態並導向登入
      try {
        const [{ default: router }, toastServiceModule, authStoreModule] = await Promise.all([
          import('@/router'),
          import('@/components/bootstrap/ToastService.js'),
          import('@/stores/auth')
        ])

        const currentPath = router.currentRoute.value.path
        const isLoginPage = currentPath === '/page/login' || currentPath.startsWith('/page/login')

        try {
          const authStore = authStoreModule.useAuthStore()
          authStore.clearAuthState?.()
        } catch {
          storage.remove(StorageKeys.AUTH_TOKEN)
          storage.remove(StorageKeys.AUTH_USER)
        }

        const backendMessage =
          parsed401 && typeof parsed401 === 'object'
            ? (parsed401 as Record<string, unknown>).message
            : undefined
        if (backendMessage) {
          console.warn('[Auth] 401 unauthorized (blob download):', backendMessage)
        }

        if (!isLoginPage) {
          toastServiceModule.default?.warning?.('登入已過期，請重新登入')
          router.push('/page/login').catch(() => {})
        }
      } catch {
        storage.remove(StorageKeys.AUTH_TOKEN)
        storage.remove(StorageKeys.AUTH_USER)
      }

      throw new Error('登入已過期，請重新登入')
    }

    throw error
  }

  // 檢查回應是否為有效的 Blob
  if (!(response.data instanceof Blob)) {
    console.error('回應不是 Blob 類型:', response.data)
    throw new Error('API 回應格式錯誤')
  }

  return response
}

/**
 * 從響應標頭中提取檔案名稱
 * @param response Axios 回應物件
 * @returns 檔案名稱，如果無法提取則返回 null
 */
export const extractFileNameFromResponse = (response: AxiosResponse): string | null => {
  try {
    const contentDisposition = response.headers['content-disposition']
    if (contentDisposition) {
      // 解析 Content-Disposition 標頭中的檔案名稱
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (fileNameMatch) {
        return fileNameMatch[1].replace(/['"]/g, '')
      }
    }
    return null
  } catch (error) {
    console.error('檔案名稱提取失敗:', error)
    return null
  }
}
