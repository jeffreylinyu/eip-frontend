import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders
} from 'axios'
import { storage, StorageKeys } from '@/utils/storage'
import { resolveEffectiveViewTypeForHttpRequest } from '@/utils/effectiveViewTypeApi'
import { getApiBaseURL } from '@/utils/apiBaseUrl'
import {
  isPerspectiveOrPermission401Payload,
  parseAxios401ResponseData
} from '@/utils/authHttpErrors'
import router from '@/router'
import toastService from '@/components/bootstrap/ToastService.js'

/**
 * 建立一個預設的 Axios 實例，所有 API 請求都用它
 */
const http: AxiosInstance = axios.create({
  baseURL: getApiBaseURL(), // 初始化時使用預設值
  timeout: 50000, // 超時設定：50s
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 更新 HTTP 實例的 Base URL
 * 用於開發者測試時即時更新 API 網址
 */
export const updateBaseURL = (newBaseURL: string | null) => {
  // 生產環境不允許動態覆寫 API 來源，維持與部署設定一致。
  if (import.meta.env.PROD) {
    http.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
    return
  }

  if (newBaseURL && newBaseURL.trim()) {
    http.defaults.baseURL = newBaseURL.trim()
  } else {
    // 如果清空，使用預設值
    http.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  }
}

/**
 * 請求攔截器：每次發請求前都會進來這裡
 */
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const getHeader = (name: string): string | undefined => {
      const h: any = config.headers
      if (!h) return undefined
      // Axios v1: headers may be AxiosHeaders
      if (typeof h.get === 'function') return h.get(name)
      return h[name] ?? h[name.toLowerCase()]
    }

    const setHeader = (name: string, value: string) => {
      const h: any = config.headers
      if (!h) {
        config.headers = new AxiosHeaders()
      }
      const hh: any = config.headers
      if (typeof hh.set === 'function') hh.set(name, value)
      else hh[name] = value
    }

    // 動態更新 baseURL（從 localStorage 讀取最新值）
    const currentBaseURL = getApiBaseURL()
    if (config.baseURL !== currentBaseURL) {
      config.baseURL = currentBaseURL
    }

    // 上傳 FormData 時不可帶 Content-Type：讓瀏覽器自動設為 multipart/form-data; boundary=...
    if (config.data instanceof FormData) {
      delete config.headers!['Content-Type']
    }

    // 從 localStorage 獲取 token，加到 header（若呼叫方已帶 Authorization 則不覆寫，避免時序導致漏帶）
    if (!config.headers?.['Authorization']) {
      const token = storage.get<string>(StorageKeys.AUTH_TOKEN)
      if (token) {
        config.headers!['Authorization'] = `Bearer ${token}`
      }
    }

    // 從 localStorage 獲取用戶信息，解析出 userId
    const authUser = storage.get<{ userId?: string }>(StorageKeys.AUTH_USER)

    if (authUser && authUser.userId) {
      setHeader('userId', authUser.userId)
    }

    // 雙視角：後端 resolveViewType 會驗證標頭須在允許視角內（/forms 等路由無 contractor 前綴時依 localStorage）
    // 若呼叫端已明確指定 X-Effective-View-Type（例如 /company/* 無前綴路由），則不要覆寫
    if (!getHeader('X-Effective-View-Type')) {
      const effectiveView = resolveEffectiveViewTypeForHttpRequest()
      if (effectiveView) {
        setHeader('X-Effective-View-Type', effectiveView)
      }
    }

    // Debug：僅針對 companyList 印出實際送出的 view header（用來比對 6 vs 8 的根因）
    try {
      const url = String(config.url || '')
      if (url.includes('/management/constructionMember/companyList')) {
        // eslint-disable-next-line no-console
        console.log('[HTTPDebug] companyList request', {
          href: typeof window !== 'undefined' ? window.location.href : '',
          params: (config as any)?.params,
          effectiveViewHeader: getHeader('X-Effective-View-Type'),
        })
      }
    } catch {
      /* ignore */
    }

    return config
  },
  (error: AxiosError) => {
    // 請求送出錯誤時（如網路斷線）
    return Promise.reject(error)
  }
)

/**
 * 回應攔截器：收到回應後都會進來這裡
 */
http.interceptors.response.use(
  (response: AxiosResponse) => {
    // 如果回應有標準的 { code, message, data } 格式，檢查是否成功
    if (response.data && typeof response.data === 'object' && 'code' in response.data) {
      if (response.data.code === 200) {
        // 對於有 data 欄位的回應，返回 data 內容
        return response.data.data || response.data
      } else {
        console.warn('⚠️ API 回應非成功狀態:', response.data)
        return response.data
      }
    }
    
    return response.data
  },
  async (error: AxiosError) => {
    const { response } = error
    
    // 全域錯誤處理
    if (response) {
      switch (response.status) {
        case 401: {
          const parsed401 = await parseAxios401ResponseData(response.data)
          // 若請求標記為 skipAuthRedirectOn401（例如核心資料 Modal）：不跳轉登入頁
          // 但「視角／權限不符」的 401 不可清 token，否則營造端會被誤導成登入過期
          const skipRedirect = (error.config as any)?.skipAuthRedirectOn401 === true
          if (skipRedirect) {
            if (isPerspectiveOrPermission401Payload(parsed401)) {
              return Promise.reject(error)
            }
            import('@/stores/auth').then(({ useAuthStore }) => {
              useAuthStore().clearAuthState?.()
            }).catch(() => {
              storage.remove(StorageKeys.AUTH_TOKEN)
              storage.remove(StorageKeys.AUTH_USER)
            })
            return Promise.reject(error)
          }

          if (isPerspectiveOrPermission401Payload(parsed401)) {
            const ep = parsed401 as Record<string, unknown>
            const text =
              (typeof ep?.message === 'string' && ep.message) ||
              (typeof ep?.error === 'string' && ep.error) ||
              '目前視角無權限存取此功能，請確認已切換監造／營造'
            console.warn('[Auth] 401 視角／權限（非登入過期）:', text)
            toastService.warning(text)
            return Promise.reject(error)
          }

          // Token 無效或過期：清除本地認證狀態
          const currentPath = router.currentRoute.value.path
          const hashPath = (typeof window !== 'undefined' ? (window.location.hash || '') : '').replace('#', '')
          const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
          const isLoginPage =
            currentPath === '/page/login' ||
            currentPath.startsWith('/page/login') ||
            hashPath === '/page/login' ||
            hashPath.startsWith('/page/login') ||
            pathname === '/page/login' ||
            pathname.startsWith('/page/login')
          
          // 使用動態 import 避免循環依賴（auth.ts -> user.ts -> http.ts）
          import('@/stores/auth').then(({ useAuthStore }) => {
            const authStore = useAuthStore()
            // 401 時一律先清掉本地狀態，避免登入頁重整仍持續帶舊 token 打 API
            authStore.clearAuthState?.()

            // 登入頁不提示、不跳轉（避免干擾登入流程）
            if (isLoginPage) return

            // 不要把後端的技術訊息直接顯示給用戶（例如：JWT token not valid）
            const backendMessage =
              parsed401 && typeof parsed401 === 'object'
                ? (parsed401 as Record<string, unknown>).message
                : undefined
            if (backendMessage) {
              console.warn('[Auth] 401 unauthorized:', backendMessage)
            }
            toastService.warning('登入已過期，請重新登入')
            router.push('/page/login').catch(() => {})
          }).catch(() => {
            // 若無法載入 authStore，至少清除 localStorage
            storage.remove(StorageKeys.AUTH_TOKEN)
            storage.remove(StorageKeys.AUTH_USER)

            if (isLoginPage) return
            const backendMessage =
              parsed401 && typeof parsed401 === 'object'
                ? (parsed401 as Record<string, unknown>).message
                : undefined
            if (backendMessage) {
              console.warn('[Auth] 401 unauthorized:', backendMessage)
            }
            toastService.warning('登入已過期，請重新登入')
            router.push('/page/login').catch(() => {})
          })

          // 在登入頁遇到 401：視為「已處理」，避免上層 catch 再噴 toast
          if (isLoginPage) {
            return Promise.resolve(null as any)
          }
          break
        }
        case 403:
          // 檢查是否為「需要重設密碼」的訊息
          // 注意：AxiosError 的 response.data 類型是 any，需要根據實際後端回傳結構判斷
          // 假設回傳結構包含 message 欄位
          const data = response.data as any
          if (data && data.message === "Password reset required") {
            toastService.warning("首次登入，請先修改密碼")
            router.push('/user/profile') // 導向修改密碼頁面
          }
          break
        case 409:
          // 樂觀鎖衝突
          toastService.error("資料已被他人更新，請重新載入最新內容")
          break
      }
    }
    
    return Promise.reject(error)
  }
)

export default http
