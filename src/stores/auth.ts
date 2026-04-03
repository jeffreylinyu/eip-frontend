import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage, StorageKeys } from '@/utils/storage'
import { authApi, type LoginData, type User } from '@/api/user'
import { getGoogleIdToken } from '@/firebase'
import { useWorkspaceStore } from '@/stores/workspace'

export const useAuthStore = defineStore('auth', () => {
  // 狀態
  const token = ref<string | null>(storage.get<string>(StorageKeys.AUTH_TOKEN))
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value)

  // Actions
  const login = async (loginData: LoginData) => {
    isLoading.value = true
    
    
    try {
      // 使用 API 服務層的登入方法
      const { email, password } = loginData
      const response = await authApi.login({ email, password })
      
      
      // 根據實際後端返回格式調整: 直接回傳 { userId, jwtToken, role }
      
      
      token.value = response.jwtToken
      
      
      // 從 API 回應中直接讀取 role（後端已包含在登入回應中）
      // 保存 token 到 localStorage (fetchCurrentUser / 之後的 API 需要用到)
      storage.set(StorageKeys.AUTH_TOKEN, response.jwtToken)

      // 獲取完整用戶資訊 (確保包含 companyId)
      await fetchCurrentUser(response.userId)
      
      // 如果 fetch 成功，保存完整 user 到 localStorage
      if (user.value) {
        storage.set(StorageKeys.AUTH_USER, user.value)
      } else {
        // Fallback: 若 fetch 失敗，至少設定基本資訊
        user.value = {
          id: response.id?.toString() || response.userId,
          userId: response.userId,
          username: '', 
          email: loginData.email,
          role: response.role || '',
          createdAt: '',
          updatedAt: '',
          verify: false
        }
        storage.set(StorageKeys.AUTH_USER, user.value)
      }
      
      // 驗證是否成功保存
      const savedToken = storage.get<string>(StorageKeys.AUTH_TOKEN)
      const savedUser = storage.get<User>(StorageKeys.AUTH_USER)
      
      
      // 登入成功後初始化工作空間
      try {
        
        const workspaceStore = useWorkspaceStore()
        await workspaceStore.initWorkspaces()
        
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

  /** Google 登入：Firebase ID Token → 後端換發系統 JWT */
  const loginWithGoogle = async () => {
    isLoading.value = true
    try {
      const idToken = await getGoogleIdToken()
      if (!idToken) {
        return { success: false, message: 'Google 登入已取消或失敗' }
      }
      const response = await authApi.loginWithFirebase(idToken)
      token.value = response.jwtToken
      storage.set(StorageKeys.AUTH_TOKEN, response.jwtToken)
      await fetchCurrentUser(response.userId)
      if (user.value) {
        storage.set(StorageKeys.AUTH_USER, user.value)
      } else {
        user.value = {
          id: response.id?.toString() || response.userId,
          userId: response.userId,
          username: '',
          email: '',
          role: response.role || '',
          createdAt: '',
          updatedAt: '',
          verify: false
        }
        storage.set(StorageKeys.AUTH_USER, user.value)
      }
      try {
        const workspaceStore = useWorkspaceStore()
        await workspaceStore.initWorkspaces()
      } catch (error) {
        console.warn('⚠️ 工作空間初始化失敗:', error)
      }
      return { success: true, message: '登入成功' }
    } catch (error: any) {
      console.error('❌ Google 登入失敗:', error)
      return {
        success: false,
        message: error.response?.data?.message || error?.message || 'Google 登入失敗'
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
        
      } else {
        
      }
    } catch (error) {
      console.error('❌ 登出 API 調用失敗:', error)
    } finally {
      clearAuthState()
    }
  }

  // 清除本地認證狀態（不打 API，不跳轉）
  const clearAuthState = () => {
    token.value = null
    user.value = null
    storage.remove(StorageKeys.AUTH_TOKEN)
    storage.remove(StorageKeys.AUTH_USER)
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
      const userData: any = await authApi.getCurrentUser(targetUserId)
      
      // 相容 snake_case (如果後端回傳 company_id)
      if (userData.company_id && !userData.companyId) {
          userData.companyId = userData.company_id
      }
      
      // 處理後端回傳的 companyIds (List<String>)
      // 注意: Spring Boot 預設 JSON 欄位可能是 companyIds
      if (userData.companyIds && Array.isArray(userData.companyIds) && userData.companyIds.length > 0) {
          // 如果目前沒有設定 companyId，或者想以列表第一個為準
          if (!userData.companyId) {
            userData.companyId = userData.companyIds[0];
          }
      }

      user.value = userData
    } catch (error) {
      console.error('獲取用戶信息失敗:', error)
      // 如果token無效，清除認證狀態
      clearAuthState()
    }
  }

  const initAuth = async () => {
    
    const savedToken = storage.get<string>(StorageKeys.AUTH_TOKEN)
    
    
    if (savedToken) {
      token.value = savedToken
      
      
      // 如果有保存的用戶信息，使用其userId獲取最新信息
      const savedUser = storage.get<User>(StorageKeys.AUTH_USER)
      
      
      if (savedUser) {
        try {
          user.value = savedUser
          
          
          // 驗證token是否有效並獲取最新用戶信息
          
          await fetchCurrentUser(savedUser.userId)
          
          // 初始化工作空間
          try {
            // 若 token 已無效，fetchCurrentUser 會清掉本地狀態；此時不要再呼叫 initWorkspaces
            if (token.value && user.value) {
              const workspaceStore = useWorkspaceStore()
              await workspaceStore.initWorkspaces()
            }
            
          } catch (error) {
            console.warn('⚠️ 工作空間初始化失敗:', error)
          }
        } catch (error) {
          console.error('❌ 解析保存的用戶信息失敗:', error)
          logout()
        }
      } else {
        
      }
    } else {
      
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
    loginWithGoogle,
    logout,
    clearAuthState,
    initAuth,
    fetchCurrentUser
  }
}) 