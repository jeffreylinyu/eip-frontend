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
    baseURL: import.meta.env.VITE_API_URL,  // 從 .env 讀取 API 根址
    timeout: 20000,                          // 超時設定：20s
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  /**
   * 請求攔截器：每次發請求前都會進來這裡
   */
  http.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // 範例：從 localStorage 拿 token，加到 header
      const token = localStorage.getItem('auth_token')
      if (token) {
        // headers 在 InternalAxiosRequestConfig 一定存在
        config.headers!['Authorization'] = `Bearer ${token}`
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
      // 直接回傳 data，省去調用端再寫 .data
      return response.data.data
    },
    (error: AxiosError) => {
      // 全域錯誤處理
      if (error.response) {
        const status = error.response.status
        switch (status) {
          case 401:
            window.location.href = '/login'
            break
          case 403:
            alert('您沒有權限執行此操作')
            break
          case 500:
            alert('伺服器錯誤，請稍後再試')
            break
        }
      } else {
        // 無回應（網路問題）
        alert('無法連上伺服器，請檢查網路或稍後再試')
      }
      return Promise.reject(error)
    }
  )
  
  export default http
  