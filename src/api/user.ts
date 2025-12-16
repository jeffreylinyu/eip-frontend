import http from './http'

export interface LoginData {
  password: string
  email: string
}

export interface LoginResponse {
    id?: number
    userId: string
    jwtToken: string
    role: string  // 用戶角色：ADMIN, SUPER_ADMIN, 等
}

export interface User {
  id: string
  userId: string
  username: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
  verify: boolean
  // 可以添加更多用戶字段
}

// 個人戶註冊數據
export interface IndividualRegisterData {
  username: string
  email: string
  password: string
}


export const authApi = {
  // 登入
  login: (data: LoginData): Promise<LoginResponse> => {
    return http.post('/management/user/login', data)
  },

  // 登出（需要傳入 userId）
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
  },

  // 個人戶註冊
  registerIndividual: (data: IndividualRegisterData): Promise<any> => {
    return http.post('/management/user/register', data)
  }
} 