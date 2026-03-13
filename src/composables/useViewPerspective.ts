import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import http from '@/api/http'

/**
 * 視角類型
 */
export enum ViewType {
  SUPERVISORY = 'SUPERVISORY', // 監造
  CONTRACTOR = 'CONTRACTOR',   // 營造
  OWNER = 'OWNER',             // 業主
  PCM = 'PCM',                 // PCM
  SHARED = 'SHARED'            // 共用（個人設定、通知等）
}

/**
 * 視角判斷 Composable
 * 用於判斷用戶在當前工作空間的視角類型
 */
export function useViewPerspective() {
  const authStore = useAuthStore()
  const workspaceStore = useWorkspaceStore()
  
  // 當前視角（可手動切換）
  const currentViewType = ref<ViewType | null>(null)
  
  // 從後端獲取視角類型
  const fetchViewType = async (workspaceId: string): Promise<ViewType> => {
    try {
      const response = await http.get<{ 
        code: number
        message: string
        data: { 
          viewType: string
          viewTypeLabel: string
        }
      }>(`/management/viewType/resolve?workspaceId=${workspaceId}`)
      
      // http.get 已經處理了 response.data，所以這裡直接使用 response
      // 如果 response 是 BaseResponse 格式，則 response.data 包含實際資料
      // 如果 response 已經是 data 部分，則直接使用
      let viewTypeData: { viewType: string; viewTypeLabel: string } | null = null
      
      if (response && typeof response === 'object') {
        // 檢查是否為 BaseResponse 格式 { code, message, data }
        if ('data' in response && response.data && typeof response.data === 'object') {
          if ('viewType' in response.data) {
            viewTypeData = response.data as unknown as { viewType: string; viewTypeLabel: string }
          } else if ('data' in response.data && response.data.data && typeof response.data.data === 'object' && 'viewType' in response.data.data) {
            // 嵌套的 data.data 結構
            viewTypeData = response.data.data as unknown as { viewType: string; viewTypeLabel: string }
          }
        } else if ('viewType' in response) {
          // 直接是資料格式
          viewTypeData = response as unknown as { viewType: string; viewTypeLabel: string }
        }
      }
      
      if (viewTypeData?.viewType) {
        const viewType = viewTypeData.viewType as ViewType
        return viewType
      }
      
      return await getViewTypeFromCompanyType()
    } catch (error) {
      // 降級處理：根據用戶公司類型判斷
      return await getViewTypeFromCompanyType()
    }
  }
  
  // 根據公司類型判斷視角（降級方案）
  const getViewTypeFromCompanyType = async (): Promise<ViewType> => {
    const user = authStore.user
    if (!user) return ViewType.SUPERVISORY
    
    // 如果是 SUPER_ADMIN，預設為 SUPERVISORY（監造視角）
    if (user.systemRole === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN') {
      return ViewType.SUPERVISORY
    }
    
    // 根據當前工作空間的公司類型判斷
    const currentWorkspace = workspaceStore.currentWorkspace
    if (!currentWorkspace) return ViewType.SUPERVISORY
    
    // 確保參與單位資料已載入
    if (!workspaceStore.participatingUnits.supervisoryCompany && 
        !workspaceStore.participatingUnits.contractorCompany) {
      try {
        await workspaceStore.fetchParticipatingUnits(currentWorkspace.id)
      } catch (error) {
        console.warn('載入參與單位失敗，無法判斷視角:', error)
        return ViewType.SUPERVISORY
      }
    }
    
    // 從參與單位中查找用戶公司的類型
    const participatingUnits = workspaceStore.participatingUnits
    
    // 檢查是否為監造公司
    if (participatingUnits.supervisoryCompany?.companyId === user.companyId) {
      return ViewType.SUPERVISORY
    }
    
    // 檢查是否為營造公司
    if (participatingUnits.contractorCompany?.companyId === user.companyId) {
      return ViewType.CONTRACTOR
    }
    
    // 預設為共用視角
    return ViewType.SUPERVISORY
  }
  
  // 當前工作空間的視角類型（計算屬性）
  // 注意：由於降級處理是異步的，這裡只返回已設定的視角或 SUPERVISORY（預設監造視角）
  const viewType = computed<ViewType>(() => {
    // 如果手動設定了視角，優先使用
    if (currentViewType.value) {
      return currentViewType.value
    }
    
    // 如果沒有當前工作空間，返回 SUPERVISORY（預設監造視角）
    if (!workspaceStore.currentWorkspace) {
      return ViewType.SUPERVISORY
    }
    
    // 如果有參與單位資料，可以同步判斷
    const participatingUnits = workspaceStore.participatingUnits
    const user = authStore.user
    
    // 如果是 SUPER_ADMIN，預設為 SUPERVISORY（監造視角）
    if (user?.systemRole === 'SUPER_ADMIN' || user?.role === 'SUPER_ADMIN') {
      return ViewType.SUPERVISORY
    }
    
    if (user?.companyId) {
      // 檢查是否為監造公司
      if (participatingUnits.supervisoryCompany?.companyId === user.companyId) {
        return ViewType.SUPERVISORY
      }
      
      // 檢查是否為營造公司
      if (participatingUnits.contractorCompany?.companyId === user.companyId) {
        return ViewType.CONTRACTOR
      }
    }
    
    // 預設為 SUPERVISORY（監造視角，如果沒有設定，會通過 initViewType 從後端獲取）
    return ViewType.SUPERVISORY
  })
  
  // 是否為監造視角
  const isSupervisory = computed(() => viewType.value === ViewType.SUPERVISORY)
  
  // 是否為營造視角
  const isContractor = computed(() => viewType.value === ViewType.CONTRACTOR)
  
  // 是否為業主視角
  const isOwner = computed(() => viewType.value === ViewType.OWNER)
  
  // 是否為 PCM 視角
  const isPCM = computed(() => viewType.value === ViewType.PCM)
  
  // 是否為共用視角
  const isShared = computed(() => viewType.value === ViewType.SHARED)
  
  // 設定視角（用於手動切換）
  const setViewType = (type: ViewType | null) => {
    currentViewType.value = type
  }
  
  // 初始化視角（從後端獲取）
  const initViewType = async (workspaceId: string) => {
    try {
      const type = await fetchViewType(workspaceId)
      currentViewType.value = type
      return type
    } catch (error) {
      // 使用降級方案
      const fallbackType = await getViewTypeFromCompanyType()
      currentViewType.value = fallbackType
      return fallbackType
    }
  }
  
  // 重置視角（清除手動設定）
  const resetViewType = () => {
    currentViewType.value = null
  }
  
  // 獲取視角顯示名稱
  const getViewTypeLabel = (type: ViewType): string => {
    const labels: Record<ViewType, string> = {
      [ViewType.SUPERVISORY]: '監造',
      [ViewType.CONTRACTOR]: '營造',
      [ViewType.OWNER]: '業主',
      [ViewType.PCM]: 'PCM',
      [ViewType.SHARED]: '共用'
    }
    return labels[type] || '未知'
  }
  
  return {
    // 狀態
    viewType,
    currentViewType,
    
    // 計算屬性
    isSupervisory,
    isContractor,
    isOwner,
    isPCM,
    isShared,
    
    // 方法
    setViewType,
    initViewType,
    resetViewType,
    fetchViewType,
    getViewTypeLabel,
    getViewTypeFromCompanyType
  }
}
