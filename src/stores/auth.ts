import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginData, type User } from '@/api/user'
import { useWorkspaceStore } from '@/stores/workspace'

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
    // console.log('🔐 開始登入流程...')
    // console.log('📧 登入郵箱:', loginData.email)
    
    try {
      // 使用 API 服務層的登入方法
      // console.log('🌐 調用登入 API...')
      const response = await authApi.login(loginData)
      // console.log('✅ 登入 API 回應:', response)
      
      // 根據實際後端返回格式調整: 直接回傳 { id, userId, jwtToken }
      // console.log('📦 解析回應資料:', response)
      
      token.value = response.jwtToken
      // console.log('🎫 Token 已設定:', token.value ? '有值' : '無值')
      
      user.value = {
        id: response.id.toString(), // 轉換為字串以匹配 User 介面
        userId: response.userId,
        username: '', // 將在 fetchCurrentUser 中填充
        email: loginData.email,
        role: '',
        createdAt: '',
        updatedAt: '',
        verify: false
      }
      // console.log('👤 用戶資訊已設定:', user.value)
      
      // 保存token和用戶信息到localStorage
      // console.log('💾 開始保存到 localStorage...')
      localStorage.setItem('auth_token', response.jwtToken)
      localStorage.setItem('auth_user', JSON.stringify(user.value))
      
      // 驗證是否成功保存
      const savedToken = localStorage.getItem('auth_token')
      const savedUser = localStorage.getItem('auth_user')
      // console.log('✅ localStorage 驗證:')
      // console.log('  - auth_token:', savedToken ? '已保存' : '未保存')
      // console.log('  - auth_user:', savedUser ? '已保存' : '未保存')
      
      // 登入成功後初始化工作空間
      try {
        // console.log('🏗️ 開始初始化工作空間...')
        const workspaceStore = useWorkspaceStore()
        await workspaceStore.initWorkspaces()
        // console.log('✅ 工作空間初始化完成')
      } catch (error) {
        console.warn('⚠️ 工作空間初始化失敗:', error)
      }
      
      return { success: true, message: '登入成功' }
    } catch (error: any) {
      console.error('❌ 登入失敗:', error)
      console.error('❌ 錯誤詳情:', error.response?.data)
      return { 
        success: false, 
        message: error.response?.data?.message || '登入失敗，請檢查您的憑證' 
      }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    // console.log('🚪 開始登出流程...')
    try {
      // 使用 API 服務層的登出方法，傳入userId
      if (user.value?.userId) {
        // console.log('🌐 調用登出 API...')
        await authApi.logout(user.value.userId)
        // console.log('✅ 登出 API 調用成功')
      } else {
        // console.log('⚠️ 沒有 userId，跳過登出 API 調用')
      }
    } catch (error) {
      console.error('❌ 登出 API 調用失敗:', error)
    } finally {
      // 無論 API 調用是否成功，都清除本地狀態
      // console.log('🧹 清除本地認證狀態...')
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      
      // 驗證是否成功清除
      const remainingToken = localStorage.getItem('auth_token')
      const remainingUser = localStorage.getItem('auth_user')
      // console.log('✅ 清除驗證:')
      // console.log('  - auth_token:', remainingToken ? '仍存在' : '已清除')
      // console.log('  - auth_user:', remainingUser ? '仍存在' : '已清除')
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
    // console.log('🔄 初始化認證狀態...')
    const savedToken = localStorage.getItem('auth_token')
    // console.log('🎫 從 localStorage 讀取 token:', savedToken ? '有值' : '無值')
    
    if (savedToken) {
      token.value = savedToken
      // console.log('✅ Token 已載入到 store')
      
      // 如果有保存的用戶信息，使用其userId獲取最新信息
      const savedUser = localStorage.getItem('auth_user')
      // console.log('👤 從 localStorage 讀取用戶資訊:', savedUser ? '有值' : '無值')
      
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser)
          user.value = userData
          // console.log('✅ 用戶資訊已載入到 store:', userData)
          
          // 驗證token是否有效並獲取最新用戶信息
          // console.log('🔍 開始驗證 token 並獲取最新用戶資訊...')
          await fetchCurrentUser(userData.userId)
          
          // 初始化工作空間
          try {
            // console.log('🏗️ 開始初始化工作空間...')
            const workspaceStore = useWorkspaceStore()
            await workspaceStore.initWorkspaces()
            // console.log('✅ 工作空間初始化完成')
          } catch (error) {
            console.warn('⚠️ 工作空間初始化失敗:', error)
          }
        } catch (error) {
          console.error('❌ 解析保存的用戶信息失敗:', error)
          logout()
        }
      } else {
        // console.log('⚠️ 沒有找到保存的用戶資訊')
      }
    } else {
      // console.log('⚠️ 沒有找到保存的 token，用戶未登入')
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