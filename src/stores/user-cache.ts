import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type User } from '@/api/user'

// 用戶基本信息接口
export interface UserBasicInfo {
  userId: string
  username?: string
  email?: string
  avatar?: string
}

export const useUserCacheStore = defineStore('userCache', () => {
  // 用戶信息緩存 Map: userId -> UserBasicInfo
  const userCache = ref<Map<string, UserBasicInfo>>(new Map())
  
  // 正在請求的用戶 ID Set，避免重複請求
  const pendingRequests = ref<Set<string>>(new Set())

  /**
   * 獲取用戶信息（帶緩存）
   * @param userId 用戶 ID
   * @returns 用戶基本信息
   */
  const getUserInfo = async (userId: string): Promise<UserBasicInfo | null> => {
    // 檢查緩存
    if (userCache.value.has(userId)) {
      return userCache.value.get(userId)!
    }

    // 檢查是否正在請求中
    if (pendingRequests.value.has(userId)) {
      // 等待正在進行的請求完成
      while (pendingRequests.value.has(userId)) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return userCache.value.get(userId) || null
    }

    // 開始新的請求
    pendingRequests.value.add(userId)
    
    try {
      const user: User = await authApi.getCurrentUser(userId)
      const userInfo: UserBasicInfo = {
        userId: user.userId,
        username: user.username, // 直接使用 API 回應中的 username
        email: user.email
      }
      
      // 緩存結果
      userCache.value.set(userId, userInfo)
      return userInfo
    } catch (error) {
      console.error(`Failed to fetch user info for ${userId}:`, error)
      // 緩存空結果，避免重複請求失敗的用戶
      const fallbackInfo: UserBasicInfo = {
        userId,
        username: `User ${userId.slice(-4)}` // 使用 ID 後四位作為備用顯示
      }
      userCache.value.set(userId, fallbackInfo)
      return fallbackInfo
    } finally {
      pendingRequests.value.delete(userId)
    }
  }

  /**
   * 批量獲取用戶信息
   * @param userIds 用戶 ID 數組
   * @returns 用戶信息 Map
   */
  const getBatchUserInfo = async (userIds: string[]): Promise<Map<string, UserBasicInfo>> => {
    // 過濾出需要查詢的用戶 ID（未緩存且未在請求中）
    const needFetch = userIds.filter(id => 
      !userCache.value.has(id) && !pendingRequests.value.has(id)
    )
    
    // 並行請求所有需要的用戶信息
    const promises = needFetch.map(userId => getUserInfo(userId))
    await Promise.allSettled(promises)
    
    // 返回請求的用戶信息
    const result = new Map<string, UserBasicInfo>()
    userIds.forEach(userId => {
      const userInfo = userCache.value.get(userId)
      if (userInfo) {
        result.set(userId, userInfo)
      }
    })
    
    return result
  }

  /**
   * 預加載用戶信息
   * @param userIds 需要預加載的用戶 ID 數組
   */
  const preloadUsers = async (userIds: string[]): Promise<void> => {
    await getBatchUserInfo(userIds)
  }

  /**
   * 清除緩存
   */
  const clearCache = (): void => {
    userCache.value.clear()
    pendingRequests.value.clear()
  }

  /**
   * 獲取緩存的用戶信息（同步）
   * @param userId 用戶 ID
   * @returns 緩存的用戶信息或 null
   */
  const getCachedUserInfo = (userId: string): UserBasicInfo | null => {
    return userCache.value.get(userId) || null
  }

  // Computed: 緩存統計
  const cacheStats = computed(() => ({
    cached: userCache.value.size,
    pending: pendingRequests.value.size
  }))

  return {
    // Actions
    getUserInfo,
    getBatchUserInfo,
    preloadUsers,
    clearCache,
    getCachedUserInfo,
    
    // Getters
    cacheStats
  }
}) 