import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { workspaceApi, transformWorkspaceFromApi, transformWorkspaceToApi, type WorkspaceDetailResponse, type WorkspaceCompany, type InviteCompanyRequest, type RemoveCompanyRequest } from '@/api/workspace'
import { useUserCacheStore, type UserBasicInfo } from '@/stores/user-cache'
import { getConstructionsByWorkspace, type Construction, type SignLevel } from '@/api/construction'

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

// 工程項目介面定義  
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
  supervisionUnit?: string
  constructionPeriod?: string
  currentContractAmount?: string
  projectCategory?: string
  paymentMethod?: string
  advancePaymentRatio?: string
  retentionRatio?: string
  inspectionMethods?: string[]
  insurancePolicyNumber?: string
  insuranceCompany?: string
  insuranceStartDate?: string
  insuranceEndDate?: string
  insuranceType?: string
  // 新增欄位
  constructionConfirmDate?: string
  constructionProjectId?: string
  segmentedAcceptance?: boolean
  partialAcceptance?: boolean
  completionAcceptance?: boolean
  signLevel?: SignLevel[]
  workDay?: number
}

export const useWorkspaceStore = defineStore('workspace', () => {
  // 狀態
  const workspaces = ref<Workspace[]>([])
  const currentWorkspace = ref<Workspace | null>(null)
  const workspaceProjects = ref<WorkspaceProject[]>([])
  const currentProject = ref<WorkspaceProject | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false) // 添加初始化狀態標記
  
  // 工作空間公司管理相關狀態
  const workspaceCompanies = ref<WorkspaceCompany[]>([])
  const availableCompanies = ref<{
    companyId: string
    companyName: string
    companyUnifiedNumber: string
    companyType: 'CONTRACTOR' | 'SUPERVISOR' | 'CONSULTING' | 'OTHER'
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

    // 模擬工程項目資料
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
    currentProject.value?.name || '請選擇工程項目'
  )

  const hasCurrentWorkspace = computed(() => 
    currentWorkspace.value !== null
  )

  const hasCurrentProject = computed(() => 
    currentProject.value !== null
  )

  const getProjectsByWorkspace = async (workspaceId: string): Promise<WorkspaceProject[]> => {
    try {
      // 先檢查 localStorage 中是否有緩存的工程項目資料
      const cacheKey = `eip-workspace-projects-${workspaceId}`
      const cachedData = localStorage.getItem(cacheKey)
      
      if (cachedData) {
        try {
          const { projects, timestamp } = JSON.parse(cachedData)
          // 檢查緩存是否在 5 分鐘內（300000 毫秒）
          if (Date.now() - timestamp < 300000) {
            workspaceProjects.value = projects
            return projects
          }
        } catch (error) {
        }
      }
      
      // 調用 API 獲取工程項目
      const constructions = await getConstructionsByWorkspace(workspaceId)
      
      // 將 Construction 格式轉換為 WorkspaceProject 格式
      const projects: WorkspaceProject[] = constructions.map(construction => ({
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
        // 額外的工程項目詳細資訊
        contractNumber: construction.contractId || '',
        hostAgency: construction.leadOrganization || '',
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
        insurancePolicyNumber: construction.insuranceId || '',
        insuranceCompany: construction.insuranceCompanyName || '',
        insuranceStartDate: construction.insuranceStartDate || '',
        insuranceEndDate: construction.insuranceEndDate || '',
        insuranceType: construction.insuranceType || '',
        // 新增欄位映射
        constructionConfirmDate: construction.constructionConfirmDate || '',
        constructionProjectId: construction.constructionProjectId || '',
        segmentedAcceptance: construction.segmentedAcceptance || false,
        partialAcceptance: construction.partialAcceptance || false,
        completionAcceptance: construction.completionAcceptance || false,
        signLevel: construction.signLevel || [],
        workDay: construction.workDay || 0
      }))
      
      // 更新本地狀態
      workspaceProjects.value = projects
      
      // 將資料緩存到 localStorage
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          projects,
          timestamp: Date.now()
        }))
      } catch (error) {
      }
      
      return projects
    } catch (error) {
      console.error('❌ 獲取工作空間工程項目失敗:', error)
      // 如果 API 失敗，返回空陣列
      return []
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
  const setCurrentWorkspace = (workspace: Workspace) => {
    currentWorkspace.value = workspace
    // 切換工作空間時清除當前項目
    currentProject.value = null
    
    // 清除工程項目選擇（因為工作空間變了）
    try {
      localStorage.removeItem('eip-selected-project')
    } catch (error) {
    }
  }

  const setCurrentProject = (project: WorkspaceProject, triggerReload: boolean = true) => {
    currentProject.value = project
    // 確保工作空間也設定正確
    const workspace = workspaces.value.find(ws => ws.id === project.workspaceId)
    if (workspace && workspace.id !== currentWorkspace.value?.id) {
      currentWorkspace.value = workspace
    }
    
    // 保存到 localStorage
    try {
      localStorage.setItem('eip-selected-project', JSON.stringify({
        projectId: project.id,
        workspaceId: project.workspaceId,
        timestamp: Date.now()
      }))
    } catch (error) {
    }
    
    // 只有在需要時才觸發重新載入（避免無限循環）
    if (triggerReload) {
      // 這裡可以添加其他需要觸發的邏輯
    }
  }

  // 從 localStorage 載入保存的選擇
  const loadSavedSelections = async () => {
    try {
      // 直接從工程項目選擇中獲取工作空間信息
      const savedProject = localStorage.getItem('eip-selected-project')
      if (savedProject) {
        const { projectId, workspaceId } = JSON.parse(savedProject)
        
        // 設定工作空間
        const workspace = workspaces.value.find(ws => ws.id === workspaceId)
        if (workspace) {
          // 只在工作空間不同時才更新
          if (currentWorkspace.value?.id !== workspaceId) {
            currentWorkspace.value = workspace
          }
          
          // 載入該工作空間的工程項目
          await getProjectsByWorkspace(workspaceId)
          
          // 設定工程項目
          const project = workspaceProjects.value.find(proj => proj.id === projectId)
          if (project) {
            // 只在工程項目不同時才更新
            if (currentProject.value?.id !== projectId) {
              currentProject.value = project
            }
          }
        }
      }
    } catch (error) {
    }
  }

  const initWorkspaces = async () => {
    // 先檢查 localStorage 中是否有緩存的工作空間資料
    const cacheKey = 'eip-workspaces-cache'
    const cachedData = localStorage.getItem(cacheKey)
    
    if (cachedData) {
      try {
        const { workspaces: cachedWorkspaces, timestamp } = JSON.parse(cachedData)
        // 檢查緩存是否在 10 分鐘內（600000 毫秒）
        if (Date.now() - timestamp < 600000) {
          workspaces.value = cachedWorkspaces
          isInitialized.value = true
          
          // 載入保存的選擇
          await loadSavedSelections()
          
          // 如果沒有保存的選擇且有工作空間，設定預設工作空間
          if (!currentWorkspace.value && workspaces.value.length > 0) {
            setCurrentWorkspace(workspaces.value[0])
          }
          
          return
        }
      } catch (error) {
      }
    }
    
    // 如果已經初始化過，跳過重複調用
    if (isInitialized.value && workspaces.value.length > 0) {
      return
    }
    
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
      
      // 將工作空間資料緩存到 localStorage
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          workspaces: workspaces.value,
          timestamp: Date.now()
        }))
      } catch (error) {
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
      
      // 如果沒有保存的選擇且有工作空間，設定預設工作空間
      if (!currentWorkspace.value && workspaces.value.length > 0) {
        setCurrentWorkspace(workspaces.value[0])
      }
      
      // 標記為已初始化
      isInitialized.value = true
      
    } catch (error) {
      console.error('Failed to load workspaces:', error)
      // API 調用失敗時不自動載入測試資料
      workspaces.value = []
    } finally {
      isLoading.value = false
    }
  }

  const switchWorkspace = (workspaceId: string) => {
    const workspace = workspaces.value.find(ws => ws.id === workspaceId)
    if (workspace) {
      setCurrentWorkspace(workspace)
    }
  }

  const switchProject = (projectId: string) => {
    const project = workspaceProjects.value.find(proj => proj.id === projectId)
    if (project) {
      setCurrentProject(project)
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
      case 'SUPERVISOR':
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
      // 檢查邀請規則
      if (inviteData.role === 'MAIN_CONTRACTOR' && !canInviteContractor.value) {
        throw new Error('工作空間已有主要承包商，無法再邀請')
      }
      if (inviteData.role === 'SUPERVISOR' && !canInviteSupervisor.value) {
        throw new Error('工作空間已有監造單位，無法再邀請')
      }
      if (!canInviteCompany.value) {
        throw new Error('您沒有邀請公司的權限')
      }

      const newCompany = await workspaceApi.inviteCompany(workspaceId, inviteData)
      workspaceCompanies.value.push(newCompany)
      
      if (newCompany.status === 'PENDING') {
        pendingInvites.value.push(newCompany)
      }

      return newCompany
    } catch (error) {
      console.error('Failed to invite company:', error)
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

  // 角色檢查
  const canManageWorkspace = computed(() => {
    return currentWorkspace.value?.role === 'OWNER' || currentWorkspace.value?.role === 'ADMIN'
  })

  const canEditProject = computed(() => {
    return currentWorkspace.value?.role !== 'VIEWER'
  })

  // 工作空間公司邀請規則
  const getCompanyByRole = (role: 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY') => {
    if (!Array.isArray(workspaceCompanies.value)) {
      console.warn('workspaceCompanies.value is not an array:', workspaceCompanies.value)
      return []
    }
    return workspaceCompanies.value.filter(company => company.role === role && company.status === 'ACTIVE')
  }

  const canInviteCompany = computed(() => {
    return currentWorkspace.value?.role === 'OWNER' || currentWorkspace.value?.role === 'ADMIN'
  })

  const canInviteContractor = computed(() => {
    return canInviteCompany.value && getCompanyByRole('MAIN_CONTRACTOR').length === 0
  })

  const canInviteSupervisor = computed(() => {
    return canInviteCompany.value && getCompanyByRole('SUPERVISOR').length === 0
  })

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
  const clearSavedSelections = () => {
    try {
      localStorage.removeItem('eip-selected-workspace')
      localStorage.removeItem('eip-selected-project')
    } catch (error) {
      console.warn('⚠️ 清除 localStorage 失敗:', error)
    }
  }

  // 清除所有緩存
  const clearAllCache = () => {
    try {
      localStorage.removeItem('eip-workspaces-cache')
      localStorage.removeItem('eip-selected-workspace')
      localStorage.removeItem('eip-selected-project')
      // 清除工程項目緩存
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('eip-workspace-projects-')) {
          localStorage.removeItem(key)
        }
      })
      isInitialized.value = false
    } catch (error) {
    }
  }

  return {
    // State
    workspaces,
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
    searchAvailableCompanies,
    inviteCompanyToWorkspace,
    respondToCompanyInvite,
    requestRemoveCompany,
    respondToRemovalRequest
  }
}) 