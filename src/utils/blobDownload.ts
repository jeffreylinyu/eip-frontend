/**
 * Blob 檔案下載工具
 * 用於處理需要下載二進位檔案（如 Word、PDF）的 API 請求
 * 直接使用 axios 以避免 http 攔截器處理 blob 資料
 */

import { storage, StorageKeys } from './storage'
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
    includeContentType = method === 'POST'
  } = options

  // 從 storage 獲取 token 和 userId（與 http 攔截器保持一致）
  const token = storage.get<string>(StorageKeys.AUTH_TOKEN)
  const authUser = storage.get<{ userId?: string }>(StorageKeys.AUTH_USER)

  if (!token) {
    throw new Error('未找到認證 token，請重新登入')
  }

  // 構建 headers
  const headers: Record<string, string> = {
    'Accept': 'application/octet-stream, application/vnd.openxmlformats-officedocument.wordprocessingml.document, */*',
    'Authorization': `Bearer ${token}`,
    ...customHeaders
  }

  if (includeContentType && !customHeaders['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (authUser?.userId) {
    headers['userId'] = authUser.userId
  }

  // 動態導入 axios
  const axios = await import('axios')

  // 構建請求配置
  const config: AxiosRequestConfig = {
    method,
    url: `${import.meta.env.VITE_API_URL}${url}`,
    responseType: 'blob',
    headers,
    timeout
  }

  if (method === 'POST' && data) {
    config.data = data
  }

  if (method === 'GET' && params) {
    config.params = params
  }

  // 發送請求
  const response = await axios.default(config)

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

