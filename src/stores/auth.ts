import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginData, type User } from '@/api/user'

export const useAuthStore = defineStore('auth', () => {
  // 狀態
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value)

  // Actions
  const login = async (loginData: LoginData) => {
    isLoading.value = true
    try {
      // 使用 API 服務層的登入方法
      const response = await authApi.login(loginData)
      // 根據實際後端返回格式調整: { id, userId, jwtToken }
      token.value = response.jwtToken
      user.value = {
        id: response.id,
        userId: response.userId,
        email: loginData.email
      }
      
      // 保存token和用戶信息到localStorage
      localStorage.setItem('auth_token', response.jwtToken)
      localStorage.setItem('auth_user', JSON.stringify(user.value))
      
      return { success: true, message: '登入成功' }
    } catch (error: any) {
      return { 
        success: false, 
        message: error.response?.data?.message || '登入失敗，請檢查您的憑證' 
      }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      // 使用 API 服務層的登出方法，傳入userId
      if (user.value?.userId) {
        await authApi.logout(user.value.userId)
      }
    } catch (error) {
      console.error('登出 API 調用失敗:', error)
    } finally {
      // 無論 API 調用是否成功，都清除本地狀態
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
  }

  // 獲取當前用戶信息
  const fetchCurrentUser = async (userId?: string) => {
    if (!token.value) return
    
    // 如果沒有提供userId，嘗試從當前user中獲取
    const targetUserId = userId || user.value?.userId
    if (!targetUserId) {
      console.warn('無法獲取用戶信息：缺少userId')
      return
    }

    try {
      const userData = await authApi.getCurrentUser(targetUserId)
      user.value = userData
    } catch (error) {
      console.error('獲取用戶信息失敗:', error)
      // 如果token無效，清除認證狀態
      logout()
    }
  }

  const initAuth = async () => {
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      token.value = savedToken
      // 如果有保存的用戶信息，使用其userId獲取最新信息
      const savedUser = localStorage.getItem('auth_user')
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser)
          user.value = userData
          // 驗證token是否有效並獲取最新用戶信息
          await fetchCurrentUser(userData.userId)
        } catch (error) {
          console.error('解析保存的用戶信息失敗:', error)
          logout()
        }
      }
    }
  }

  return {
    // 狀態
    token,
    user,
    isLoading,
    // Getters
    isAuthenticated,
    // Actions
    login,
    logout,
    initAuth,
    fetchCurrentUser
  }
}) 