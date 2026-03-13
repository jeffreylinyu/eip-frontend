import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig
} from 'axios'
import { storage, StorageKeys } from '@/utils/storage'
import router from '@/router'
import toastService from '@/components/bootstrap/ToastService.js'

/**
 * 獲取當前的 API Base URL
 * 優先順序：localStorage 自訂網址 > 環境變數 > 預設值
 */
const getBaseURL = (): string => {
  const customUrl = storage.get<string>(StorageKeys.CUSTOM_API_BASE_URL)
  if (customUrl && customUrl.trim()) {
    return customUrl.trim()
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8080'
}

/**
 * 建立一個預設的 Axios 實例，所有 API 請求都用它
 */
const http: AxiosInstance = axios.create({
  baseURL: getBaseURL(), // 初始化時使用預設值
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
    // 動態更新 baseURL（從 localStorage 讀取最新值）
    const currentBaseURL = getBaseURL()
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
      config.headers!['userId'] = authUser.userId
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
  (error: AxiosError) => {
    const { response } = error
    
    // 全域錯誤處理
    if (response) {
      switch (response.status) {
        case 401: {
          // 若請求標記為 skipAuthRedirectOn401（例如核心資料 Modal），僅清除認證、不 toast／不跳轉，讓呼叫方自行處理
          const skipRedirect = (error.config as any)?.skipAuthRedirectOn401 === true
          if (skipRedirect) {
            import('@/stores/auth').then(({ useAuthStore }) => {
              useAuthStore().clearAuthState?.()
            }).catch(() => {
              storage.remove(StorageKeys.AUTH_TOKEN)
              storage.remove(StorageKeys.AUTH_USER)
            })
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
            const errorData = response.data as any
            const backendMessage = errorData?.message
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
            const errorData = response.data as any
            const backendMessage = errorData?.message
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
