
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { storage, StorageKeys } from '@/utils/storage'
import { workspaceApi, transformWorkspaceFromApi, transformWorkspaceToApi, type WorkspaceDetailResponse, type WorkspaceCompany, type InviteCompanyRequest, type RemoveCompanyRequest, type ParticipatingUnitsResponse } from '@/api/workspace'
import { useUserCacheStore, type UserBasicInfo } from '@/stores/user-cache'
import { userApi, authApi, countDistinctConstructionProjects, dedupeJoinedProjectsByConstructionId } from '@/api/user'
import { getConstructionsByWorkspace, getConstructionDetail, getLegacyContractorField, type Construction, type SignLevel } from '@/api/construction'
import { useAuthStore } from '@/stores/auth'

// 工作空間介面定義
export interface Workspace {
  id: string
  name: string
  description: string
  companyId: string
  companyName: string
  ownerId: string
  ownerName: string
  memberCount: number
  projectCount: number
  createdAt: string
  isOwner: boolean
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
}

// 工程案介面定義  
export interface WorkspaceProject {
  id: string
  name: string
  workspaceId: string
  location: string
  budget: string
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED'
  signDate?: string
  startDate: string
  endDate: string
  progress: number
  managerName: string
  description: string
  // 擴展屬性，這些可能在某些情況下存在
  contractNumber?: string
  hostAgency?: string
  contractorName?: string
  constructionPeriod?: string
  currentContractAmount?: string
  projectCategory?: string
  paymentMethod?: string
  advancePaymentRatio?: string
  retentionRatio?: string
  inspectionMethods?: string[]
  // 新增欄位
  constructionConfirmDate?: string
  constructionProjectId?: string
  supervisoryCompanyName?: string | null // 新增：監造公司名稱
  contractorCompanyName?: string | null // 新增：營造公司名稱
  designCompany?: string | null // 新增：設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
  segmentedAcceptance?: boolean
  partialAcceptance?: boolean
  completionAcceptance?: boolean
  signLevel?: SignLevel[]
  workDay?: number
  durationType?: 'CALENDAR_DAYS' | 'WORKING_DAYS' // 工期計算模式
  totalExtensionDays?: number // 累計展延天數（已棄用，始終為 0）
  totalStopDays?: number // 累計停工天數（SPECIFIC_DATES）
  permission?: 'ADMIN' | 'MEMBER' | 'VIEWER' // 新增：工程案權限
  /** master_construction 樂觀鎖版本（基本資料 PATCH 需帶回） */
  version?: number
}

export const useWorkspaceStore = defineStore('workspace', () => {
  // 狀態
  const workspaces = ref<Workspace[]>([])
  const currentWorkspace = ref<Workspace | null>(null)
  const workspaceProjects = ref<WorkspaceProject[]>([])
  const currentProject = ref<WorkspaceProject | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false) // 添加初始化狀態標記
  const joinedProjectsCount = ref(0) // 新增：已參與的工程案數量 (跨工作空間)
  const initPromise = ref<Promise<void> | null>(null) // 新增
  
  const emitContractorSidebarPMenuRefresh = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('contractor-sidebar-p-menu-refresh'))
  }

  // 工程案在登入初始化後才會補齊，這裡主動通知側邊欄重載動態 P 類，避免必須手動重整
  watch(
    () => currentProject.value?.id || '',
    (next, prev) => {
      if (!next || next === prev) return
      emitContractorSidebarPMenuRefresh()
    }
  )
  
  
  // 工作空間公司管理相關狀態
  const workspaceCompanies = ref<WorkspaceCompany[]>([])
  // 新增：參與單位結構化狀態
  const participatingUnits = ref<ParticipatingUnitsResponse>({
    supervisoryCompany: null,
    contractorCompany: null,
    otherCompanies: []
    // 注意：設計公司已移除，改為工程案層級的基本資料
  })
  const availableCompanies = ref<{
    companyId: string
    companyName: string
    companyUnifiedNumber: string
    companyType: 'CONTRACTOR' | 'SUPERVISION' | 'CONSULTING' | 'OTHER'
    contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'SPECIAL'
  }[]>([])
  const pendingInvites = ref<WorkspaceCompany[]>([])
  const pendingRemovalRequests = ref<{
    id: string
    companyId: string
    companyName: string
    reason: string
    requestType: 'MUTUAL_AGREEMENT' | 'CUSTOMER_SERVICE'
    requestedAt: string
    requestedBy: string
  }[]>([])
  
  // 用戶緩存 store
  const userCacheStore = useUserCacheStore()

  // 假資料初始化
  const initMockData = () => {
    // 模擬工作空間資料
    workspaces.value = [
      {
        id: 'ws-001',
        name: '台北市政府工務局',
        description: '負責台北市各項公共工程建設管理',
        companyId: 'comp-001',
        companyName: '台北市政府',
        ownerId: 'user-001',
        ownerName: '張主任',
        memberCount: 15,
        projectCount: 8,
        createdAt: '2024-01-15',
        isOwner: true,
        role: 'OWNER'
      },
      {
        id: 'ws-002', 
        name: '鴻泰建設工程股份有限公司',
        description: '專業建築工程承包商',
        companyId: 'comp-002',
        companyName: '鴻泰建設股份有限公司',
        ownerId: 'user-002',
        ownerName: '王總經理',
        memberCount: 25,
        projectCount: 12,
        createdAt: '2024-02-01',
        isOwner: false,
        role: 'ADMIN'
      },
      {
        id: 'ws-003',
        name: '新北市住宅發展處',
        description: '新北市社會住宅開發建設',
        companyId: 'comp-003',
        companyName: '新北市政府',
        ownerId: 'user-003',
        ownerName: '李處長',
        memberCount: 10,
        projectCount: 5,
        createdAt: '2024-01-20',
        isOwner: false,
        role: 'MEMBER'
      }
    ]

    // 模擬工程案資料
    workspaceProjects.value = [
      // 台北市政府工務局的項目
      {
        id: 'proj-001',
        name: '信義區A21社會住宅新建工程',
        workspaceId: 'ws-001',
        location: '台北市信義區松勤街50號',
        budget: '12億元',
        status: 'IN_PROGRESS',
        startDate: '2024-03-01',
        endDate: '2026-02-28',
        progress: 35,
        managerName: '陳工程師',
        description: '地上15層地下3層，共計300戶社會住宅'
      },
      {
        id: 'proj-002', 
        name: '大安森林公園地下停車場改善工程',
        workspaceId: 'ws-001',
        location: '台北市大安區新生南路二段1號',
        budget: '3.5億元',
        status: 'PLANNING',
        startDate: '2024-06-01',
        endDate: '2025-05-31',
        progress: 10,
        managerName: '林工程師',
        description: '地下停車場結構補強及設備更新'
      },
      {
        id: 'proj-003',
        name: '士林夜市周邊道路改善工程',
        workspaceId: 'ws-001', 
        location: '台北市士林區大東路、大南路',
        budget: '8000萬元',
        status: 'COMPLETED',
        startDate: '2023-08-01',
        endDate: '2024-01-31',
        progress: 100,
        managerName: '黃工程師',
        description: '人行道拓寬、排水系統改善、路燈更新'
      },
      
      // 鴻泰建設的項目
      {
        id: 'proj-004',
        name: '板橋江翠北側區段徵收開發案',
        workspaceId: 'ws-002',
        location: '新北市板橋區江翠北側重劃區',
        budget: '50億元',
        status: 'IN_PROGRESS',
        startDate: '2024-01-01',
        endDate: '2027-12-31',
        progress: 20,
        managerName: '蔡經理',
        description: '住宅區開發，預計興建1200戶住宅'
      },
      {
        id: 'proj-005',
        name: '三重重陽重劃區商辦大樓',
        workspaceId: 'ws-002',
        location: '新北市三重區重陽路一段',
        budget: '25億元',
        status: 'IN_PROGRESS',
        startDate: '2024-02-15',
        endDate: '2026-08-15',
        progress: 45,
        managerName: '劉經理',
        description: '地上20層商辦大樓，含地下3層停車場'
      },
      
      // 新北市住宅發展處的項目
      {
        id: 'proj-006',
        name: '中和秀峰段社會住宅新建工程',
        workspaceId: 'ws-003',
        location: '新北市中和區秀峰段',
        budget: '15億元',
        status: 'PLANNING',
        startDate: '2024-07-01',
        endDate: '2026-12-31',
        progress: 5,
        managerName: '郭主任',
        description: '地上12層，共計250戶社會住宅'
      }
    ]

    // 設定預設選中的工作空間和項目
    if (workspaces.value.length > 0) {
      currentWorkspace.value = workspaces.value[0]
      // 注意：這裡不設定預設項目，因為 getProjectsByWorkspace 是異步的
      // 預設項目將在 loadSavedSelections 中處理
    }
  }

  // Getters (computed)
  const getCurrentWorkspaceName = computed(() => 
    currentWorkspace.value?.name || '請選擇工作空間'
  )

  const getCurrentProjectName = computed(() => 
    currentProject.value?.name || '請選擇工程案'
  )

  const hasCurrentWorkspace = computed(() => 
    currentWorkspace.value !== null
  )

  const hasCurrentProject = computed(() => 
    currentProject.value !== null
  )

  // 轉換 Construction 到 WorkspaceProject 的輔助函數
  const transformConstructionToProject = (construction: Construction, workspaceId: string): WorkspaceProject => {
    return {
        id: construction.constructionId || '',
        name: construction.constructionName || '',
        workspaceId: workspaceId,
        location: construction.constructionLocation || '',
        budget: construction.constructionBudget?.toString() || '',
        status: 'IN_PROGRESS' as const, // 預設狀態，可以根據實際 API 回應調整
        signDate: construction.signDate || '',
        startDate: construction.constructionStartDate || '',
        endDate: construction.constructionEndDate || '',
        progress: 0, // 預設進度，可以根據實際 API 回應調整
        managerName: construction.leadOrganization || '',
        description: `${construction.constructionType || ''} - ${construction.budgetFrom || ''}`,
        // 額外的工程案詳細資訊
        contractNumber: construction.contractId || '',
        hostAgency: construction.leadOrganization || '',
        contractorName: getLegacyContractorField(construction as Record<string, unknown>),
        constructionPeriod: construction.workDay?.toString() || '', // 工期天數
        currentContractAmount: construction.currentContractAmount?.toString() || construction.constructionBudget?.toString() || '',
        projectCategory: construction.constructionType || '',
        paymentMethod: construction.payMethod || '',
        advancePaymentRatio: construction.prePayRatio?.toString() || '',
        retentionRatio: construction.retainedRatio?.toString() || '',
        inspectionMethods: [
          construction.segmentedAcceptance ? '分段驗收' : '',
          construction.partialAcceptance ? '部分驗收' : '',
          construction.completionAcceptance ? '竣工驗收' : ''
        ].filter(Boolean),
        // 新增欄位映射
        constructionConfirmDate: construction.constructionConfirmDate || '',
        constructionProjectId: construction.constructionProjectId || '',
        supervisoryCompanyName: construction.supervisoryCompanyName || null,
        contractorCompanyName: construction.contractorCompanyName || null,
        designCompany: construction.designCompany || null, // 設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
        segmentedAcceptance: construction.segmentedAcceptance || false,
        partialAcceptance: construction.partialAcceptance || false,
        completionAcceptance: construction.completionAcceptance || false,
        signLevel: construction.signLevel || [],
        workDay: construction.workDay || 0,
        durationType: construction.durationType || 'WORKING_DAYS', // 工期計算模式
        totalExtensionDays: construction.totalExtensionDays || 0, // 累計展延天數
        totalStopDays: construction.totalStopDays || 0, // 累計停工天數
        permission: construction.permission,
        version: typeof construction.version === 'number' ? construction.version : undefined
    }
  }

  const getProjectsByWorkspace = async (workspaceId: string): Promise<WorkspaceProject[]> => {
    try {
      // 調用 API 獲取工程案
      const constructions = await getConstructionsByWorkspace(workspaceId)
      
      // 將 Construction 格式轉換為 WorkspaceProject 格式
      const projects: WorkspaceProject[] = constructions.map(construction => 
        transformConstructionToProject(construction, workspaceId)
      )
      
      // 更新本地狀態
      workspaceProjects.value = projects
      
      return projects
    } catch (error) {
      console.error('❌ 獲取工作空間工程案失敗:', error)
      // 如果 API 失敗，返回空陣列
      return []
    }
  }

  // 獲取單一工程案詳情並更新狀態
  // designChangeId：變更設計版本 ID，不傳或 null 為預設版
  const fetchProjectDetail = async (
    projectId: string,
    workspaceId: string,
    viewType?: string,
    designChangeId?: number | null
  ): Promise<WorkspaceProject | null> => {
    try {
      const construction = await getConstructionDetail(projectId, workspaceId, viewType, designChangeId)
      
      const project = transformConstructionToProject(construction, workspaceId)
      
      // 更新列表中的項目
      const index = workspaceProjects.value.findIndex(p => p.id === projectId)
      if (index > -1) {
        workspaceProjects.value[index] = project
      } else {
        // 如果不在列表中，添加到列表
        workspaceProjects.value.push(project)
      }
      
      // 如果是當前選中的項目，也更新currentProject
      if (currentProject.value?.id === projectId) {
        currentProject.value = project
      }
      
      return project
    } catch (error) {
      console.error('獲取工程案詳情失敗:', error)
      return null
    }
  }

  const getCurrentWorkspaceProjects = computed(() => {
    if (!currentWorkspace.value) return []
    return getProjectsByWorkspace(currentWorkspace.value.id)
  })

  // 帶用戶信息的工作空間列表
  const workspacesWithUserInfo = computed(() => {
    return workspaces.value.map(workspace => {
      const userInfo = userCacheStore.getCachedUserInfo(workspace.ownerId)
      return {
        ...workspace,
        ownerInfo: userInfo,
        ownerDisplayName: userInfo?.username || workspace.ownerName || `User ${workspace.ownerId.slice(-4)}`
      }
    })
  })

  // 獲取工作空間的用戶信息
  const getWorkspaceOwnerInfo = async (workspaceId: string): Promise<UserBasicInfo | null> => {
    const workspace = workspaces.value.find(ws => ws.id === workspaceId)
    if (!workspace) return null
    
    return await userCacheStore.getUserInfo(workspace.ownerId)
  }

  // Actions
  const setCurrentWorkspace = async (workspace: Workspace, preserveProject: boolean = false) => {
    // 檢查是否為相同的工作空間
    const isSameWorkspace = currentWorkspace.value?.id === workspace?.id
    
    currentWorkspace.value = workspace
    
    // 當工作空間變更時，先載入參與單位，然後重新初始化視角
    if (workspace?.id) {
      try {
        // 先載入參與單位資料，這樣視角判斷才能正確
        await fetchParticipatingUnits(workspace.id)
        
        // 然後初始化視角
        const { useViewPerspective } = await import('@/composables/useViewPerspective')
        const { initViewType } = useViewPerspective()
        await initViewType(workspace.id)
      } catch (error) {
        console.error('初始化視角失敗:', error)
      }
    }
    
    // 切換工作空間時是否清除工程案：
    // - 若目前工程案已屬於該 workspace，永遠不清除（避免「切換後又跳回去」）
    // - 若 localStorage 有此 workspace 的最近選擇，也不要清除（讓 loadSavedSelections 接手恢復）
    const savedProject = storage.get<{ projectId: string; workspaceId: string; timestamp?: number }>(StorageKeys.SELECTED_PROJECT)
    const hasSavedForWorkspace = !!savedProject?.projectId && savedProject?.workspaceId === workspace?.id
    const currentBelongsToWorkspace = !!currentProject.value && currentProject.value.workspaceId === workspace?.id

    if (!currentBelongsToWorkspace && !hasSavedForWorkspace) {
      if (!preserveProject || !isSameWorkspace) {
        // 如果當前工程案不屬於新工作空間，清除它
        if (currentProject.value && currentProject.value.workspaceId !== workspace?.id) {
          currentProject.value = null
          try {
            storage.remove(StorageKeys.SELECTED_PROJECT)
          } catch {
            // ignore
          }
        } else if (!preserveProject) {
          // preserveProject=false 且沒有可恢復的選擇時才清除
          currentProject.value = null
          try {
            storage.remove(StorageKeys.SELECTED_PROJECT)
          } catch {
            // ignore
          }
        }
      }
    }
  }

  const setCurrentProject = async (project: WorkspaceProject, triggerReload: boolean = true) => {
    currentProject.value = project
    
    // 確保工作空間也設定正確
    let workspace = workspaces.value.find(ws => ws.id === project.workspaceId)
    
    // 如果工作空間不在列表中，嘗試載入或創建最小對象
    if (!workspace && project.workspaceId) {
      try {
        // 先嘗試初始化工作空間列表（如果還沒初始化）
        if (!isInitialized.value) {
          await initWorkspaces()
          workspace = workspaces.value.find(ws => ws.id === project.workspaceId)
        }
        
        // 如果還是不在列表中，創建一個最小的工作空間對象
        // 注意：不調用 getWorkspaceDetail API，因為它需要工作空間權限
        // 根據權限設計，訪問工程案只需要工程案權限，不需要工作空間權限
        if (!workspace) {
          // 創建最小的工作空間對象（只包含基本信息）
          const minimalWorkspace: Workspace = {
            id: project.workspaceId,
            name: `工作空間 ${project.workspaceId.slice(0, 8)}`, // 使用 ID 前 8 位作為名稱
            description: '',
            companyId: '', // 暫時為空，需要時可以從工程案信息中獲取
            companyName: '',
            ownerId: '',
            ownerName: '',
            memberCount: 0,
            projectCount: 0,
            createdAt: '',
            isOwner: false,
            role: 'MEMBER' // 預設為成員權限
          }
          
          // 添加到工作空間列表
          workspaces.value.push(minimalWorkspace)
          workspace = minimalWorkspace
        }
      } catch (error) {
        console.warn('無法初始化工作空間列表:', error)
        // 即使初始化失敗，也創建最小對象
        if (!workspace && project.workspaceId) {
          const minimalWorkspace: Workspace = {
            id: project.workspaceId,
            name: `工作空間 ${project.workspaceId.slice(0, 8)}`,
            description: '',
            companyId: '',
            companyName: '',
            ownerId: '',
            ownerName: '',
            memberCount: 0,
            projectCount: 0,
            createdAt: '',
            isOwner: false,
            role: 'MEMBER'
          }
          workspaces.value.push(minimalWorkspace)
          workspace = minimalWorkspace
        }
      }
    }
    
    // 設定當前工作空間（如果找到且與當前不同）
    if (workspace && workspace.id !== currentWorkspace.value?.id) {
      // 使用 preserveProject=true 避免清除剛設置的工程案
      await setCurrentWorkspace(workspace, true)
    }
    
    // 再次確認工程案還在（防止被清除）
    if (!currentProject.value || currentProject.value.id !== project.id) {
      // 重新設置
      currentProject.value = project
    }

    // 無論後端是否更新成功，都先保存到 localStorage，避免重新整理回到第一個工程案
    try {
      storage.set(StorageKeys.SELECTED_PROJECT, {
        projectId: project.id,
        workspaceId: project.workspaceId,
        timestamp: Date.now()
      })
    } catch {
      // ignore
    }
    
    // 保存到後端
    try {
      const authStore = useAuthStore()
      if (authStore.user?.userId) {
        // 調用後端 API 更新當前工程案和工作空間
        // 注意：project.id 應該是 constructionId（工程編號），不是 constructionProjectId
        await authApi.updateCurrentConstruction(project.id, project.workspaceId)
      }
    } catch (error) {
      // 後端更新失敗：localStorage 已先保存，這裡僅靜默處理
    }
    
    // 只有在需要時才觸發重新載入（避免無限循環）
    if (triggerReload) {
      // 這裡可以添加其他需要觸發的邏輯
    }
  }

  // 從後端或 localStorage 載入保存的選擇
  const loadSavedSelections = async () => {
    try {
      const authStore = useAuthStore()
      let projectId: string | null = null
      let workspaceId: string | null = null

      // 若使用者剛剛在本機切換工程案，優先用 localStorage（避免後端 currentConstructionId 延遲寫入造成「切過去又跳回來」）
      const savedProject = storage.get<{ projectId: string; workspaceId: string; timestamp?: number }>(StorageKeys.SELECTED_PROJECT)
      const savedTs = savedProject?.timestamp ?? 0
      const isFreshLocalSelection = !!savedProject?.projectId && Date.now() - savedTs < 5 * 60 * 1000 // 5 分鐘
      if (isFreshLocalSelection) {
        projectId = savedProject!.projectId
        workspaceId = savedProject!.workspaceId
      }
      
      // 優先從後端獲取當前工程案和工作空間
      if (!projectId && authStore.user?.userId) {
        try {
          // 獲取最新用戶信息（包含 currentConstructionId 和 currentWorkspaceId）
          await authStore.fetchCurrentUser()
          
          if (authStore.user?.currentConstructionId) {
            projectId = authStore.user.currentConstructionId
            // 優先使用後端記錄的 workspaceId
            if (authStore.user?.currentWorkspaceId) {
              workspaceId = authStore.user.currentWorkspaceId
            }
          }
        } catch (error) {
          console.warn('從後端獲取當前工程案和工作空間失敗:', error)
        }
      }
      
      // 如果後端沒有，嘗試從 localStorage 獲取
      if (!projectId) {
        if (savedProject && savedProject.projectId) {
          projectId = savedProject.projectId
          workspaceId = savedProject.workspaceId
        }
      }
      
      // 如果有工程案 ID，嘗試載入
      if (projectId) {
        try {
          const { getConstructionDetail } = await import('@/api/construction')
          
          // 如果沒有 workspaceId，先嘗試獲取工程案詳情（可能需要 workspaceId）
          // 如果失敗，將在 catch 中處理
          let construction
          if (workspaceId) {
            construction = await getConstructionDetail(projectId, workspaceId)
          } else {
            // 嘗試不提供 workspaceId（如果 API 支持）
            try {
              construction = await getConstructionDetail(projectId, '')
            } catch {
              // 如果失敗，嘗試從已載入的工作空間中查找
              for (const ws of workspaces.value) {
                try {
                  construction = await getConstructionDetail(projectId, ws.id)
                  workspaceId = ws.id
                  break
                } catch {
                  // 繼續嘗試下一個工作空間
                }
              }
            }
          }
          
          if (construction) {
            // 轉換為 WorkspaceProject 格式
            const projectWorkspaceId = construction.workspaceId || workspaceId
            if (!projectWorkspaceId) {
              return
            }
            
            const project = transformConstructionToProject(construction, projectWorkspaceId)
            
            // 設定工程案（這會自動保存到後端和 localStorage）
            currentProject.value = project
            
            // 優先從後端記錄的工作空間 ID 設置工作空間
            let targetWorkspaceId = authStore.user?.currentWorkspaceId || projectWorkspaceId
            
            // 如果工作空間在列表中，設定工作空間（但不主動獲取工作空間資料）
            let workspace = workspaces.value.find(ws => ws.id === targetWorkspaceId)
            
            // 如果工作空間不在列表中，創建最小對象（與 setCurrentProject 邏輯一致）
            if (!workspace && targetWorkspaceId) {
              const minimalWorkspace: Workspace = {
                id: targetWorkspaceId,
                name: `工作空間 ${targetWorkspaceId.slice(0, 8)}`,
                description: '',
                companyId: '',
                companyName: '',
                ownerId: '',
                ownerName: '',
                memberCount: 0,
                projectCount: 0,
                createdAt: '',
                isOwner: false,
                role: 'MEMBER'
              }
              workspaces.value.push(minimalWorkspace)
              workspace = minimalWorkspace
            }
            
            if (workspace) {
              // 使用 setCurrentWorkspace 以確保視角初始化
              await setCurrentWorkspace(workspace)
            }
            
            // 更新工程案列表中的項目
            const index = workspaceProjects.value.findIndex(p => p.id === projectId)
            if (index > -1) {
              workspaceProjects.value[index] = project
            } else {
              workspaceProjects.value.push(project)
            }

            return // 成功恢復，直接返回
          }
        } catch (error) {
          console.warn('載入工程案失敗:', error)
          // 如果載入失敗，清除無效的選擇
          if (authStore.user?.userId) {
            try {
              // 清除後端的無效記錄
              await authApi.updateCurrentConstruction(null)
            } catch {
              // 忽略清除失敗
            }
          }
          storage.remove(StorageKeys.SELECTED_PROJECT)
          currentProject.value = null
        }
      }
    } catch (error) {
      // 載入失敗時靜默處理
      console.warn('載入保存的選擇失敗:', error)
    }
  }



  const initWorkspaces = async (force: boolean = false) => {
    const authStore = useAuthStore()
    // 未登入時不應打工作空間 API（避免登入頁刷新噴 401 / toast）
    if (!authStore.isAuthenticated) {
      workspaces.value = []
      return
    }

    // 如果已經初始化過且不是強制重新載入，跳過重複調用
    if (!force && isInitialized.value && workspaces.value.length > 0) {
      return
    }

    // [FIX] 如果正在初始化，返回現有的 Promise，避免Router Guard直接返回而未等待資料
    if (initPromise.value) {
      return initPromise.value
    }
    
    // 建立新的 Promise 並保存
    initPromise.value = (async () => {
        isLoading.value = true
        try {
          // 調用真實 API 獲取工作空間列表
          const response = await workspaceApi.getList()
          
          // 處理 API 響應格式
          let workspacesList: WorkspaceDetailResponse[] = []
          
          if (Array.isArray(response)) {
            // 直接數組格式（符合您的 API 回傳格式）
            workspacesList = response
          } else if (response && response.workspaces && Array.isArray(response.workspaces)) {
            // 標準格式：{ workspaces: [...], total: number }
            workspacesList = response.workspaces
          } else if (response && (response as any).data && Array.isArray((response as any).data)) {
            // 嵌套 data 格式
            workspacesList = (response as any).data
          } else {
            console.warn('Unexpected API response format:', response)
            throw new Error('Invalid API response format')
          }
          
          workspaces.value = workspacesList.map(transformWorkspaceFromApi)
          
          // Sync joined projects count
          const authStore = useAuthStore()
          if (authStore.user?.userId) {
              try {
                  const joinedProjects = await userApi.getJoinedProjects(authStore.user.userId)
                  joinedProjectsCount.value = countDistinctConstructionProjects(joinedProjects)
              } catch (err) {
                   console.warn('Failed to fetch joined projects count:', err)
              }
          }

          // 預加載所有工作空間的用戶信息
          const ownerIds = workspaces.value.map(ws => ws.ownerId).filter(Boolean)
          if (ownerIds.length > 0) {
            try {
              await userCacheStore.preloadUsers(ownerIds)
            } catch (error) {
              console.warn('Failed to preload user info:', error)
            }
          }
          
          
          // 載入保存的選擇
          await loadSavedSelections()
          
          // 如果沒有當前工程案，嘗試自動選擇第一個工程案
          if (!currentProject.value) {
            // 優先使用 getUserProjects API 獲取用戶的所有工程案（跨工作空間）
            try {
              const authStore = useAuthStore()
              if (authStore.user?.userId) {
                const { userApi } = await import('@/api/user')
                const userProjects = await userApi.getJoinedProjects(authStore.user.userId)
                
                if (Array.isArray(userProjects) && userProjects.length > 0) {
                  const uniqueProjects = dedupeJoinedProjectsByConstructionId(userProjects)
                  const firstProject = uniqueProjects[0]
                  const constructionId = firstProject.constructionId || firstProject.projectId
                  
                  if (constructionId) {
                    const { getConstructionDetail } = await import('@/api/construction')
                    let construction
                    let targetWorkspaceId: string | null = null
                    
                    // 嘗試獲取工程案詳情
                    if (firstProject.workspaceId) {
                      targetWorkspaceId = firstProject.workspaceId
                      try {
                        construction = await getConstructionDetail(constructionId, targetWorkspaceId)
                      } catch (error) {
                        // 如果失敗，嘗試不提供 workspaceId
                        try {
                          construction = await getConstructionDetail(constructionId, '')
                          targetWorkspaceId = construction.workspaceId || null
                        } catch (error2) {
                          // 繼續嘗試其他工作空間
                        }
                      }
                    } else {
                      // 優先嘗試不提供 workspaceId 直接獲取（從工程案詳情中獲取 workspaceId）
                      try {
                        construction = await getConstructionDetail(constructionId, '')
                        targetWorkspaceId = construction.workspaceId || null
                      } catch (error) {
                        // 如果失敗，嘗試從所有工作空間中查找
                        if (workspaces.value.length > 0) {
                          for (const ws of workspaces.value) {
                            try {
                              construction = await getConstructionDetail(constructionId, ws.id)
                              targetWorkspaceId = ws.id
                              break
                            } catch (error2) {
                              // 繼續嘗試下一個工作空間
                            }
                          }
                        }
                      }
                    }
                    
                    if (construction && targetWorkspaceId) {
                      const project = transformConstructionToProject(construction, targetWorkspaceId)
                      
                      // 設定工作空間
                      let workspace = workspaces.value.find(ws => ws.id === targetWorkspaceId)
                      if (!workspace && targetWorkspaceId) {
                        workspace = {
                          id: targetWorkspaceId,
                          name: `工作空間 ${targetWorkspaceId.slice(0, 8)}`,
                          description: '',
                          companyId: '',
                          companyName: '',
                          ownerId: '',
                          ownerName: '',
                          memberCount: 0,
                          projectCount: 0,
                          createdAt: '',
                          isOwner: false,
                          role: 'MEMBER'
                        }
                        workspaces.value.push(workspace)
                      }
                      
                      if (workspace) {
                        await setCurrentWorkspace(workspace, true) // preserveProject=true 避免清除工程案
                      }
                      
                      // 載入該工作空間的工程案列表
                      await getProjectsByWorkspace(targetWorkspaceId)
                      
                      // 設定工程案
                      await setCurrentProject(project, false)
                      return // 成功選擇，直接返回
                    }
                  }
                }
              }
            } catch (error) {
              // 靜默處理錯誤
            }
            
            // 如果 getUserProjects 方法失敗，使用工作空間方法作為備用
            // 如果沒有當前工作空間但有工作空間列表，設定第一個工作空間
            if (!currentWorkspace.value && workspaces.value.length > 0) {
              await setCurrentWorkspace(workspaces.value[0])
            }
            
            // 如果還是沒有當前工程案，嘗試從工作空間載入
            if (!currentProject.value && currentWorkspace.value) {
              // 如果 workspaceProjects 為空，先載入工程案列表
              if (workspaceProjects.value.length === 0) {
                await getProjectsByWorkspace(currentWorkspace.value.id)
              }
              // 如果有工程案，自動選擇第一個
              if (workspaceProjects.value.length > 0) {
                await setCurrentProject(workspaceProjects.value[0], false)
              } else {
                // 如果當前工作空間沒有工程案，嘗試其他工作空間
                for (const workspace of workspaces.value) {
                  if (workspace.id === currentWorkspace.value.id) continue
                  
                  const projects = await getProjectsByWorkspace(workspace.id)
                  if (projects.length > 0) {
                    await setCurrentWorkspace(workspace)
                    await setCurrentProject(projects[0], false)
                    break
                  }
                }
              }
            }
          }
          
          // 標記為已初始化
          isInitialized.value = true
          
        } catch (error) {
          // 若在登入頁初始化時遇到 401，交由 http 攔截器清除 token，這裡不再噴錯
          // API 調用失敗時不自動載入測試資料
          workspaces.value = []
        } finally {
          isLoading.value = false
          initPromise.value = null // 清除 Promise
        }
    })()

    return initPromise.value
  }

  const switchWorkspace = (workspaceId: string) => {
    const workspace = workspaces.value.find(ws => ws.id === workspaceId)
    if (workspace) {
      setCurrentWorkspace(workspace)
    }
  }

  const switchProject = async (projectId: string) => {
    // 1. 先從列表查找並切換（提供即時回饋）
    const project = workspaceProjects.value.find(proj => proj.id === projectId)
    if (project) {
      await setCurrentProject(project)
    }

    // 2. 異步獲取完整詳情並更新
    if (currentWorkspace.value) {
      await fetchProjectDetail(projectId, currentWorkspace.value.id)
    }
  }

  const addWorkspace = async (workspaceData: { name: string; description: string; companyId: string }): Promise<Workspace> => {
    try {
      
      // 調用 API 創建工作空間
      const apiData = transformWorkspaceToApi(workspaceData)
      
      const response = await workspaceApi.create(apiData)
      
      const newWorkspace = transformWorkspaceFromApi(response)
      
      // 將新工作空間添加到本地狀態
      workspaces.value.push(newWorkspace)
      
      return newWorkspace
    } catch (error) {
      console.error('❌ 創建工作空間失敗:', error)
      console.error('❌ 錯誤詳情:', error.response?.data)
      throw error
    }
  }

  const updateWorkspace = async (workspaceId: string, updates: { name: string; description: string; companyId?: string }): Promise<Workspace> => {
    try {
      // 調用 API 更新工作空間
      // 如果沒有提供 companyId，使用當前工作空間的 companyId
      const currentWs = workspaces.value.find(ws => ws.id === workspaceId)
      const updateData = {
        name: updates.name,
        description: updates.description,
        companyId: updates.companyId || currentWs?.companyId || ''
      }
      const apiData = transformWorkspaceToApi(updateData)
      const response = await workspaceApi.update(workspaceId, apiData)
      const updatedWorkspace = transformWorkspaceFromApi(response)
      
      // 更新本地狀態
      const index = workspaces.value.findIndex(ws => ws.id === workspaceId)
      if (index > -1) {
        workspaces.value[index] = updatedWorkspace
        
        // 如果更新的是當前工作空間，也要更新當前狀態
        if (currentWorkspace.value?.id === workspaceId) {
          currentWorkspace.value = updatedWorkspace
        }
      }
      
      return updatedWorkspace
    } catch (error) {
      console.error('Failed to update workspace:', error)
      throw error
    }
  }

  const removeWorkspace = async (workspaceId: string): Promise<void> => {
    try {
      // 調用 API 刪除工作空間
      await workspaceApi.delete(workspaceId)
      
      // 更新本地狀態
      const index = workspaces.value.findIndex(ws => ws.id === workspaceId)
      if (index > -1) {
        workspaces.value.splice(index, 1)
        // 同時移除該工作空間下的所有項目
        workspaceProjects.value = workspaceProjects.value.filter(proj => proj.workspaceId !== workspaceId)
        // 如果刪除的是當前工作空間，清除當前狀態
        if (currentWorkspace.value?.id === workspaceId) {
          currentWorkspace.value = null
          currentProject.value = null
        }
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error)
      throw error
    }
  }

  const getWorkspaceDetail = async (workspaceId: string): Promise<Workspace> => {
    try {
      const response = await workspaceApi.getDetail(workspaceId)
      return transformWorkspaceFromApi(response)
    } catch (error) {
      console.error('Failed to get workspace detail:', error)
      throw error
    }
  }

  const checkWorkspacePermission = async (workspaceId: string) => {
    try {
      const response = await workspaceApi.checkPermission(workspaceId)
      return response
    } catch (error) {
      console.error('Failed to check workspace permission:', error)
      throw error
    }
  }

  const addProject = (project: WorkspaceProject) => {
    workspaceProjects.value.push(project)
    // 更新工作空間項目計數
    const workspace = workspaces.value.find(ws => ws.id === project.workspaceId)
    if (workspace) {
      workspace.projectCount += 1
    }
  }

  const updateProject = (projectId: string, updates: Partial<WorkspaceProject>) => {
    const index = workspaceProjects.value.findIndex(proj => proj.id === projectId)
    if (index > -1) {
      workspaceProjects.value[index] = { ...workspaceProjects.value[index], ...updates }
    }
  }

  const removeProject = (projectId: string) => {
    const index = workspaceProjects.value.findIndex(proj => proj.id === projectId)
    if (index > -1) {
      const project = workspaceProjects.value[index]
      workspaceProjects.value.splice(index, 1)
      
      // 更新工作空間項目計數
      const workspace = workspaces.value.find(ws => ws.id === project.workspaceId)
      if (workspace) {
        workspace.projectCount = Math.max(0, workspace.projectCount - 1)
      }
      
      // 如果刪除的是當前項目，清除當前狀態
      if (currentProject.value?.id === projectId) {
        currentProject.value = null
      }
    }
  }

  // 工具函數：將公司類型映射到角色
  const mapCompanyTypeToRole = (companyType: string): 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY' => {
    switch (companyType) {
      case 'CONTRACTOR':
        return 'MAIN_CONTRACTOR'
      case 'SUPERVISION':
        return 'SUPERVISOR'
      default:
        return 'THIRD_PARTY'
    }
  }

  // 工作空間公司管理方法
  const loadWorkspaceCompanies = async (workspaceId: string) => {
    if (!workspaceId) return
    
    try {
      const companies = await workspaceApi.getCompanies(workspaceId)
      
      // 確保 companies 是數組並轉換資料格式
      const processedCompanies = Array.isArray(companies) ? companies.map(company => ({
        ...company,
        companyId: company.companyId || company.companyUnifiedNumber, // 使用統一編號作為 ID
        status: company.status || (company.companyStatus === 'Y' ? 'ACTIVE' : 'PENDING'), // 轉換狀態
        role: company.role || mapCompanyTypeToRole(company.companyType), // 根據公司類型設定角色
        joinedAt: company.joinedAt || new Date().toISOString(),
        invitedBy: company.invitedBy || '',
        memberCount: company.memberCount || 1
      })) : []
      
      workspaceCompanies.value = processedCompanies
      
      // 分離待處理邀請
      pendingInvites.value = processedCompanies.filter(company => company.status === 'PENDING')
    } catch (error) {
      console.error('Failed to load workspace companies:', error)
      // 發生錯誤時設置為空數組
      workspaceCompanies.value = []
      pendingInvites.value = []
    }
  }

  const searchAvailableCompanies = async (workspaceId: string, search?: string, companyType?: string) => {
    try {
      const companies = await workspaceApi.searchAvailableCompanies(workspaceId, search, companyType)
      availableCompanies.value = companies
    } catch (error) {
      console.error('Failed to search available companies:', error)
    }
  }

  const inviteCompanyToWorkspace = async (workspaceId: string, inviteData: InviteCompanyRequest) => {
    try {
      const platformAdmin = isElevatedPlatformAdministrator()

      // 檢查邀請規則（平台管理員由後端處理唯一性，略過前端阻擋）
      if (!platformAdmin && !inviteData.companyType) {
        if (inviteData.role === 'MAIN_CONTRACTOR' && !canInviteContractor.value) {
          throw new Error('工作空間已有主要承包商，無法再邀請')
        }
        if (inviteData.role === 'SUPERVISOR' && !canInviteSupervisor.value) {
          throw new Error('工作空間已有監造單位，無法再邀請')
        }
           // 注意：設計單位 (DESIGNER) 的檢查如果有的話也應該在這裡，但原始代碼似乎沒有檢查 DESIGNER
      }
      
      if (!canInviteCompany.value) {
        throw new Error('您沒有邀請公司的權限')
      }

      const newCompany = await workspaceApi.inviteCompany(workspaceId, inviteData)

      // 僅在操作的是「目前選中」工作空間時同步 store（後台管理其他專案時勿污染列表）
      if (currentWorkspace.value?.id === workspaceId) {
        workspaceCompanies.value.push(newCompany)
        if (newCompany.status === 'PENDING') {
          pendingInvites.value.push(newCompany)
        }
      }

      return newCompany
    } catch (error) {
      console.error('Failed to invite company:', error)
      throw error
    }
  }

  // 新增：獲取參與單位結構化資料
  const fetchParticipatingUnits = async (workspaceId: string) => {
    try {
      const response = await workspaceApi.getParticipatingUnits(workspaceId)
      participatingUnits.value = response
      
      // 同步更新 workspaceCompanies 以維持相容性 (如果需要)
      // 如果確定不再使用 workspaceCompanies，可以移除這部分
      // 這裡暫時保留以防萬一，將結構化資料扁平化為數組
      // 注意：設計公司已移除，改為工程案層級的基本資料
      const flatList: WorkspaceCompany[] = []
      if (response.contractorCompany) flatList.push({ ...response.contractorCompany, role: 'MAIN_CONTRACTOR', status: 'ACTIVE' })
      if (response.supervisoryCompany) flatList.push({ ...response.supervisoryCompany, role: 'SUPERVISOR', status: 'ACTIVE' })
      response.otherCompanies.forEach(c => flatList.push({ ...c, role: 'THIRD_PARTY', status: 'ACTIVE' }))
      workspaceCompanies.value = flatList

    } catch (error) {
      console.error('Failed to fetch participating units:', error)
    }
  }

  // 更新公司類型
  // 注意：DESIGN 類型已移除，設計公司改為工程案層級的基本資料
  const updateCompanyType = async (workspaceId: string, companyId: string, companyType: 'CONTRACTOR' | 'SUPERVISION' | 'OTHER') => {
    try {
      await workspaceApi.updateCompanyType({
        workspaceId,
        companyId,
        companyType
      })
      // 更新成功後重新載入公司列表 (使用新的 API)
      await fetchParticipatingUnits(workspaceId)
    } catch (error) {
      console.error('Failed to update company type:', error)
      throw error
    }
  }

  const respondToCompanyInvite = async (workspaceId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      await workspaceApi.respondToInvite(workspaceId, action)
      
      // 重新載入工作空間公司列表
      await loadWorkspaceCompanies(workspaceId)
    } catch (error) {
      console.error('Failed to respond to invite:', error)
      throw error
    }
  }

  const requestRemoveCompany = async (workspaceId: string, removeData: RemoveCompanyRequest) => {
    try {
      await workspaceApi.requestRemoveCompany(workspaceId, removeData)
      
      // 添加到待處理移除請求列表
      pendingRemovalRequests.value.push({
        id: Date.now().toString(),
        companyId: removeData.companyId,
        companyName: workspaceCompanies.value.find(c => c.companyId === removeData.companyId)?.companyName || '',
        reason: removeData.reason,
        requestType: removeData.requestType,
        requestedAt: new Date().toISOString(),
        requestedBy: 'current-user' // 應該從當前用戶獲取
      })
    } catch (error) {
      console.error('Failed to request company removal:', error)
      throw error
    }
  }

  const respondToRemovalRequest = async (workspaceId: string, requestId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await workspaceApi.respondToRemoveRequest(workspaceId, requestId, action)
      
      // 從待處理列表中移除
      const index = pendingRemovalRequests.value.findIndex(req => req.id === requestId)
      if (index > -1) {
        const request = pendingRemovalRequests.value[index]
        pendingRemovalRequests.value.splice(index, 1)
        
        // 如果同意移除，從公司列表中移除
        if (action === 'APPROVE') {
          const companyIndex = workspaceCompanies.value.findIndex(company => company.companyId === request.companyId)
          if (companyIndex > -1) {
            workspaceCompanies.value.splice(companyIndex, 1)
          }
        }
      }
    } catch (error) {
      console.error('Failed to respond to removal request:', error)
      throw error
    }
  }

  // 權限檢查
  const canManageWorkspace = computed(() => {
    if (!currentWorkspace.value) return false
    const permission = currentWorkspace.value.role
    return permission === 'ADMIN' || permission === 'OWNER'
  })

  const canEditProject = computed(() => {
    if (!currentWorkspace.value) return false
    const permission = currentWorkspace.value.role
    return permission !== 'VIEWER'
  })

  // 工作空間公司邀請規則
  const getCompanyByRole = (role: 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'DESIGNER' | 'THIRD_PARTY') => {
    if (!Array.isArray(workspaceCompanies.value)) {
      console.warn('workspaceCompanies.value is not an array:', workspaceCompanies.value)
      return []
    }
    return workspaceCompanies.value.filter(company => company.role === role && company.status === 'ACTIVE')
  }

  /** 與後端 SystemRoleEnum.isElevatedPlatformAdministrator 對齊 */
  const isElevatedPlatformAdministrator = (): boolean => {
    const authStore = useAuthStore()
    const systemRole = authStore.user?.systemRole ?? authStore.user?.role
    const r = (systemRole ?? '').trim().toUpperCase()
    return r === 'SUPER_ADMIN' || r === 'ADMIN'
  }

  const canInviteCompany = computed(() => {
    if (isElevatedPlatformAdministrator()) return true
    if (!currentWorkspace.value) return false
    const permission = currentWorkspace.value.role
    return permission === 'ADMIN' || permission === 'OWNER'
  })

  const canInviteContractor = computed(() => {
    return canInviteCompany.value && getCompanyByRole('MAIN_CONTRACTOR').length === 0
  })

  const canInviteSupervisor = computed(() => {
    return canInviteCompany.value && getCompanyByRole('SUPERVISOR').length === 0
  })

  // 注意：設計單位已移除，改為工程案層級的基本資料
  const canInviteThirdParty = computed(() => {
    return canInviteCompany.value // 第三方公司可以邀請多間
  })

  const mainContractor = computed(() => getCompanyByRole('MAIN_CONTRACTOR')[0] || null)
  const supervisor = computed(() => getCompanyByRole('SUPERVISOR')[0] || null)
  const thirdPartyCompanies = computed(() => getCompanyByRole('THIRD_PARTY'))

  const activeCompaniesCount = computed(() => {
    if (!Array.isArray(workspaceCompanies.value)) {
      return 0
    }
    return workspaceCompanies.value.filter(company => company.status === 'ACTIVE').length
  })

  // 清除 localStorage 中的選擇
  // 清除 localStorage 中的選擇
  const clearSavedSelections = () => {
    try {
      storage.remove(StorageKeys.SELECTED_WORKSPACE)
      storage.remove(StorageKeys.SELECTED_PROJECT)
    } catch (error) {
      console.warn('⚠️ 清除 localStorage 失敗:', error)
    }
  }

  // 清除所有緩存
  // 清除所有緩存
  const clearAllCache = () => {
    try {
      storage.remove(StorageKeys.WORKSPACES_CACHE)
      storage.remove(StorageKeys.SELECTED_WORKSPACE)
      storage.remove(StorageKeys.SELECTED_PROJECT)
      // 清除工程案緩存
      storage.removeByPattern('workspace-projects-')
      
      isInitialized.value = false
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  return {
    // State
    workspaces,
    joinedProjectsCount,
    currentWorkspace,
    workspaceProjects,
    currentProject,
    isLoading,
    isInitialized,
    
    // 工作空間公司管理狀態
    workspaceCompanies,
    availableCompanies,
    pendingInvites,
    pendingRemovalRequests,
    
    // Getters
    getCurrentWorkspaceName,
    getCurrentProjectName,
    hasCurrentWorkspace,
    hasCurrentProject,
    getCurrentWorkspaceProjects,
    workspacesWithUserInfo,
    canManageWorkspace,
    canEditProject,
    
    // 公司邀請規則檢查
    canInviteCompany,
    canInviteContractor,
    canInviteSupervisor,
    canInviteThirdParty,
    mainContractor,
    supervisor,
    thirdPartyCompanies,
    activeCompaniesCount,
    
    // Actions
    initWorkspaces,
    setCurrentWorkspace,
    setCurrentProject,
    switchWorkspace,
    switchProject,
    getProjectsByWorkspace,
    fetchProjectDetail,
    getWorkspaceDetail,
    checkWorkspacePermission,
    getWorkspaceOwnerInfo,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
    addProject,
    updateProject,
    removeProject,
    
    // localStorage 相關方法
    loadSavedSelections,
    clearSavedSelections,
    clearAllCache,
    
    // 工作空間公司管理方法
    loadWorkspaceCompanies,
    fetchParticipatingUnits,
    participatingUnits,
    searchAvailableCompanies,
    inviteCompanyToWorkspace,
    updateCompanyType,
    respondToCompanyInvite,
    requestRemoveCompany,
    respondToRemovalRequest
  }
}) 