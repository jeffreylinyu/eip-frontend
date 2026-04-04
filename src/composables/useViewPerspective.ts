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

/** 與路由守衛共用：後端 resolve 回傳的允許視角 */
const allowedViewTypesGlobal = ref<string[]>([])

type ResolvePayload = {
  viewType: string | null
  allowedViewTypes: string[]
}

/** 從 http 回傳物件解析 viewType / allowedViewTypes（供 composable 與 router 共用） */
export function parseViewResolveResponse(response: unknown): ResolvePayload {
  let viewType: string | null = null
  let allowedRaw: unknown = null

  if (response && typeof response === 'object') {
    const r = response as Record<string, unknown>
    if ('data' in r && r.data && typeof r.data === 'object') {
      const d = r.data as Record<string, unknown>
      if ('viewType' in d && typeof d.viewType === 'string') {
        viewType = d.viewType
        allowedRaw = d.allowedViewTypes
      } else if (
        'data' in d &&
        d.data &&
        typeof d.data === 'object' &&
        'viewType' in (d.data as object)
      ) {
        const inner = d.data as Record<string, unknown>
        if (typeof inner.viewType === 'string') viewType = inner.viewType
        allowedRaw = inner.allowedViewTypes
      }
    } else if ('viewType' in r && typeof r.viewType === 'string') {
      viewType = r.viewType
      allowedRaw = r.allowedViewTypes
    }
  }

  let allowedViewTypes: string[] = []
  if (Array.isArray(allowedRaw)) {
    allowedViewTypes = allowedRaw.map((x) => String(x).toUpperCase())
  }
  if (allowedViewTypes.length === 0 && viewType) {
    allowedViewTypes = [viewType]
  }

  return { viewType, allowedViewTypes }
}

/**
 * 同步全域允許視角（路由守衛在解析 API 後呼叫，與 Header 切換器一致）
 */
export function applyAllowedViewTypesFromResolveResponse(response: unknown): ResolvePayload {
  const parsed = parseViewResolveResponse(response)
  allowedViewTypesGlobal.value = parsed.allowedViewTypes
  return parsed
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

  const allowedViewTypes = computed(() => allowedViewTypesGlobal.value)
  
  // 從後端獲取視角類型
  const fetchViewType = async (workspaceId: string): Promise<ViewType> => {
    try {
      const response = await http.get<unknown>(
        `/management/viewType/resolve?workspaceId=${workspaceId}`
      )

      const parsed = applyAllowedViewTypesFromResolveResponse(response)

      if (parsed.viewType) {
        return parsed.viewType as ViewType
      }

      return await getViewTypeFromCompanyType()
    } catch (error) {
      allowedViewTypesGlobal.value = []
      // 降級處理：根據用戶公司類型判斷
      return await getViewTypeFromCompanyType()
    }
  }
  
  // 根據公司類型判斷視角（降級方案）
  const getViewTypeFromCompanyType = async (): Promise<ViewType> => {
    const user = authStore.user
    if (!user) return ViewType.SUPERVISORY

    const adminRoles = [ViewType.SUPERVISORY, ViewType.CONTRACTOR]
    if (user.systemRole === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN') {
      allowedViewTypesGlobal.value = adminRoles
      return ViewType.SUPERVISORY
    }
    if (user.systemRole === 'ADMIN' || user.role === 'ADMIN') {
      allowedViewTypesGlobal.value = adminRoles
      return ViewType.SUPERVISORY
    }

    const currentWorkspace = workspaceStore.currentWorkspace
    if (!currentWorkspace) return ViewType.SUPERVISORY

    if (
      !workspaceStore.participatingUnits.supervisoryCompany &&
      !workspaceStore.participatingUnits.contractorCompany
    ) {
      try {
        await workspaceStore.fetchParticipatingUnits(currentWorkspace.id)
      } catch (error) {
        console.warn('載入參與單位失敗，無法判斷視角:', error)
        return ViewType.SUPERVISORY
      }
    }

    const participatingUnits = workspaceStore.participatingUnits
    const ids =
      user.companyIds && user.companyIds.length > 0
        ? user.companyIds
        : user.companyId
          ? [user.companyId]
          : []
    const supId = participatingUnits.supervisoryCompany?.companyId
    const conId = participatingUnits.contractorCompany?.companyId
    const allow: string[] = []
    if (supId && ids.includes(supId)) allow.push(ViewType.SUPERVISORY)
    if (conId && ids.includes(conId)) allow.push(ViewType.CONTRACTOR)
    if (allow.length > 0) {
      allowedViewTypesGlobal.value = allow
      return allow.includes(ViewType.SUPERVISORY)
        ? ViewType.SUPERVISORY
        : (allow[0] as ViewType)
    }

    if (user.companyId) {
      if (supId === user.companyId) {
        allowedViewTypesGlobal.value = [ViewType.SUPERVISORY]
        return ViewType.SUPERVISORY
      }
      if (conId === user.companyId) {
        allowedViewTypesGlobal.value = [ViewType.CONTRACTOR]
        return ViewType.CONTRACTOR
      }
    }

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

  const canUseViewType = (t: ViewType) => {
    const allowed = allowedViewTypesGlobal.value
    if (allowed.length === 0) return false
    return allowed.includes(t)
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
    allowedViewTypes,

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
    getViewTypeFromCompanyType,
    canUseViewType
  }
}
