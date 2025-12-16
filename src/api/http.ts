import axios, {
    AxiosInstance,
    AxiosResponse,
    AxiosError,
    InternalAxiosRequestConfig
  } from 'axios'
  
  /**
   * 建立一個預設的 Axios 實例，所有 API 請求都用它
   */
  const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',  // 從 .env 讀取 API 根址，預設為 localhost:8080
  timeout: 50000,                          // 超時設定：50s
  headers: {
    'Content-Type': 'application/json',
  },
})
  
  /**
   * 請求攔截器：每次發請求前都會進來這裡
   */
import { storage, StorageKeys } from '@/utils/storage'

// ... (imports)

// ... (http instance creation)

/**
 * 請求攔截器：每次發請求前都會進來這裡
 */
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // console.log('🌐 HTTP 請求:', config.method?.toUpperCase(), config.url)
    
    // 從 localStorage 獲取 token，加到 header
    const token = storage.get<string>(StorageKeys.AUTH_TOKEN)
    // console.log('🎫 請求攔截器 - Token:', token ? '有值' : '無值')
    
    if (token) {
      // headers 在 InternalAxiosRequestConfig 一定存在
      config.headers!['Authorization'] = `Bearer ${token}`
      // console.log('✅ Authorization header 已設定')
    } else {
      // console.log('⚠️ 沒有 token，跳過 Authorization header')
    }
    
    // 從 localStorage 獲取用戶信息，解析出 userId
    // 注意：這裡我們需要定義一個簡單的 User 介面或使用 any，因為 http.ts 不應該依賴完整的 User 類型以免循環依賴
    const authUser = storage.get<{ userId?: string }>(StorageKeys.AUTH_USER)
    // console.log('👤 請求攔截器 - 用戶資訊:', authUser ? '有值' : '無值')
    
    if (authUser && authUser.userId) {
      config.headers!['userId'] = authUser.userId
      // console.log('✅ userId header 已設定:', authUser.userId)
    } else {
      // console.log('⚠️ 用戶資訊中沒有 userId 或無用戶資訊')
    }
    
    // console.log('📤 完整請求 headers:', config.headers)
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
      // 直接回傳 data，省去調用端再寫 .data
      // 但對於某些 API，我們需要完整的 response.data
      // console.log('📥 HTTP Response:', response.config.url, '→', response.status)
      // console.log('📦 Response Data:', response.data)
      
      // 如果回應有標準的 { code, message, data } 格式，檢查是否成功
      if (response.data && typeof response.data === 'object' && 'code' in response.data) {
        if (response.data.code === 200) {
          // console.log('✅ API 調用成功')
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
      // 全域錯誤處理
      // if (error.response) {
      //   const status = error.response.status
      //   switch (status) {
      //     case 401:
      //       window.location.href = '/login'
      //       break
      //     case 403:
      //       alert('您沒有權限執行此操作')
      //       break
      //     case 500:
      //       alert('伺服器錯誤，請稍後再試')
      //       break
      //   }
      // } else {
      //   // 無回應（網路問題）
      //   alert('無法連上伺服器，請檢查網路或稍後再試')
      // }
      return Promise.reject(error)
    }
  )
  
  export default http
  