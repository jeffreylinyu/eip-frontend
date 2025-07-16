import http from './http'

export interface LoginData {
  password: string
  email: string
}

export interface LoginResponse {
    id: string
    userId: string
    jwtToken: string
}

export interface User {
  id: string
  userId: string
  email: string
  // 可以添加更多用戶字段
}

export const authApi = {
  // 登入
  login: (data: LoginData): Promise<LoginResponse> => {
    return http.post('/management/user/login', data)
  },

  // 登出
  logout: (userId: string): Promise<void> => {
    return http.post('/management/user/logout', { userId })
  },

  // 獲取指定用戶信息
  getCurrentUser: (userId: string): Promise<User> => {
    return http.get(`/management/user/${userId}`)
  },

  // 刷新token
  refreshToken: (): Promise<{ jwtToken: string }> => {
    return http.post('/management/user/refresh-token')
  }
} 