import http from './http'

// API 請求接口
export interface CreateWorkspaceRequest {
  workspaceName: string
  workspaceDescription: string
  companyId: string
}

// 工作空間公司成員
export interface WorkspaceCompany {
  companyId?: string
  companyName: string
  companyUnifiedNumber: string
  companyType: 'CONTRACTOR' | 'SUPERVISOR' | 'CONSULTING' | 'OTHER'
  companyStatus?: string // API 回傳的狀態欄位
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'SPECIAL'
  joinedAt?: string
  status?: 'ACTIVE' | 'PENDING' | 'REJECTED'
  invitedBy?: string
  role?: 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY'
  memberCount?: number
}

// 工作空間邀請公司請求
export interface InviteCompanyRequest {
  companyId: string
  role: 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY'
  message?: string
}

// 公司移除請求
export interface RemoveCompanyRequest {
  companyId: string
  reason: string
  requestType: 'MUTUAL_AGREEMENT' | 'CUSTOMER_SERVICE'
  customerServiceNote?: string
}

// API 響應接口
export interface WorkspaceDetailResponse {
  id: number
  workspaceId: string
  workspaceName: string
  workspaceDescription: string
  companyId: string
  companyName: string
  ownerUserId: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  companyRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  userRoleInCompany: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  companyCount: number
  companies?: WorkspaceCompany[]
}

export interface WorkspacePermissionResponse {
  hasPermission: boolean
  userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
}

export interface WorkspaceListResponse {
  workspaces: WorkspaceDetailResponse[]
  total: number
}

// 工作空間 API 服務
export const workspaceApi = {
  /**
   * 創建工作空間
   * @param data 工作空間創建數據
   * @returns 創建結果
   */
  create: (data: CreateWorkspaceRequest): Promise<WorkspaceDetailResponse> => {
    return http.post('/management/workspace/create', data)
  },

  /**
   * 獲取用戶工作空間列表
   * @returns 工作空間列表
   */
  getList: (): Promise<WorkspaceListResponse | WorkspaceDetailResponse[]> => {
    return http.get('/management/workspace/list')
  },

  /**
   * 獲取工作空間詳情
   * @param workspaceId 工作空間ID
   * @returns 工作空間詳細信息
   */
  getDetail: (workspaceId: string): Promise<WorkspaceDetailResponse> => {
    return http.get(`/management/workspace/${workspaceId}`)
  },

  /**
   * 檢查工作空間權限
   * @param workspaceId 工作空間ID
   * @returns 權限信息
   */
  checkPermission: (workspaceId: string): Promise<WorkspacePermissionResponse> => {
    return http.get(`/management/workspace/${workspaceId}/permission`)
  },

  /**
   * 更新工作空間
   * @param workspaceId 工作空間ID
   * @param data 更新數據
   * @returns 更新結果
   */
  update: (workspaceId: string, data: Partial<CreateWorkspaceRequest>): Promise<WorkspaceDetailResponse> => {
    return http.put(`/management/workspace/${workspaceId}`, data)
  },

  /**
   * 刪除工作空間
   * @param workspaceId 工作空間ID
   * @returns 刪除結果
   */
  delete: (workspaceId: string): Promise<void> => {
    return http.delete(`/management/workspace/${workspaceId}`)
  },

  /**
   * 獲取工作空間公司列表
   * @param workspaceId 工作空間ID
   * @returns 公司列表
   */
  getCompanies: (workspaceId: string): Promise<WorkspaceCompany[]> => {
    return http.get('/management/companyWorkspace/companyList', {
      params: { workspaceId }
    })
  },

  /**
   * 邀請公司加入工作空間
   * @param workspaceId 工作空間ID
   * @param data 邀請數據
   * @returns 邀請結果
   */
  inviteCompany: (workspaceId: string, data: InviteCompanyRequest): Promise<WorkspaceCompany> => {
    return http.post('/management/companyWorkspace/invite-company', { ...data, workspaceId })
  },

  /**
   * 回應公司邀請
   * @param workspaceId 工作空間ID
   * @param action 接受或拒絕
   * @returns 回應結果
   */
  respondToInvite: (workspaceId: string, action: 'ACCEPT' | 'REJECT'): Promise<void> => {
    return http.post('/management/companyWorkspace/respond-invite', { workspaceId, action })
  },

  /**
   * 請求移除公司
   * @param workspaceId 工作空間ID
   * @param data 移除請求數據
   * @returns 請求結果
   */
  requestRemoveCompany: (workspaceId: string, data: RemoveCompanyRequest): Promise<void> => {
    return http.post('/management/companyWorkspace/request-remove-company', { ...data, workspaceId })
  },

  /**
   * 回應公司移除請求
   * @param workspaceId 工作空間ID
   * @param requestId 請求ID
   * @param action 同意或拒絕
   * @returns 回應結果
   */
  respondToRemoveRequest: (workspaceId: string, requestId: string, action: 'APPROVE' | 'REJECT'): Promise<void> => {
    return http.post('/management/companyWorkspace/respond-remove-request', { workspaceId, requestId, action })
  },

  /**
   * 搜索可邀請的公司
   * @param workspaceId 工作空間ID
   * @param search 搜索關鍵字（公司名稱或統一編號）
   * @param companyType 公司類型篩選
   * @returns 公司列表
   */
  searchAvailableCompanies: (workspaceId: string, search?: string, companyType?: string): Promise<{
    companyId: string
    companyName: string
    companyUnifiedNumber: string
    companyType: 'CONTRACTOR' | 'SUPERVISOR' | 'CONSULTING' | 'OTHER'
    contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'SPECIAL'
  }[]> => {
    return http.get('/management/companyWorkspace/companyList', { 
      params: { workspaceId, search, companyType } 
    })
  },

  /**
   * 根據公司代碼搜索公司
   * @param companyCode 公司代碼（系統內部唯一識別碼）
   * @returns 公司信息
   */
  searchCompanyByCode: (companyCode: string): Promise<{
    companyId: string
    companyName: string
    companyUnifiedNumber: string
    companyType: 'CONTRACTOR' | 'SUPERVISOR' | 'CONSULTING' | 'OTHER'
    contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'SPECIAL'
  } | null> => {
    return http.get(`/management/companyWorkspace/search-company-by-code/${companyCode}`)
  }
}

/**
 * 工具函數：將 API 響應轉換為 Store 使用的格式
 */
export const transformWorkspaceFromApi = (apiWorkspace: WorkspaceDetailResponse) => {
  return {
    id: apiWorkspace.workspaceId,
    name: apiWorkspace.workspaceName,
    description: apiWorkspace.workspaceDescription,
    companyId: apiWorkspace.companyId,
    companyName: apiWorkspace.companyName || '', // API 已提供公司名稱
    ownerId: apiWorkspace.ownerUserId,
    ownerName: '', // 將從用戶緩存中獲取
    memberCount: apiWorkspace.companyCount || 0, // 使用 companyCount 作為成員數量
    projectCount: 0, // 需要從其他地方獲取或另外調用API
    createdAt: apiWorkspace.createdAt.split('T')[0], // 只取日期部分
    isOwner: apiWorkspace.userRoleInCompany === 'OWNER', // 使用 userRoleInCompany
    role: apiWorkspace.userRoleInCompany // 使用 userRoleInCompany
  }
}

/**
 * 工具函數：將 Store 格式轉換為 API 請求格式
 */
export const transformWorkspaceToApi = (workspace: { name: string; description: string; companyId: string }): CreateWorkspaceRequest => {
  return {
    workspaceName: workspace.name,
    workspaceDescription: workspace.description,
    companyId: workspace.companyId
  }
}