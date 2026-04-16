import http from './http'

// 公司介面定義
// 公司介面定義
export interface Company {
  companyId: string
  companyName: string
  companyCode: string // 統一編號 (對應 API 的 companyUnifiedNumber)
  companyType: 'CONTRACTOR' | 'SUPERVISION' | 'THIRD_PARTY'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'CIVIL_CONTRACTOR' // 營造等級，僅當 companyType 為 CONTRACTOR 時需要
  contactPerson: string
  contactPhone: string
  contactEmail: string
  address: string
  /** 公司電話 */
  phone?: string
  description?: string
  status: 'ACTIVE' | 'INACTIVE'
  ownerUserId: string
  createdAt: string
  updatedAt: string
  // 新增字段（來自 CompanyMember）
  userRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'  // 向後兼容：公司職位
  jobTitle?: 'OWNER' | 'ADMIN' | 'LABOUR_SAFETY' | 'CONSTRUCTION_MANAGER' | 'TECHNICIAN' | 'ARCHITECT' | 'QUALITY' | 'ADMIN_STAFF' | 'SITE_WORKER' | 'SITE_ENGINEER' | 'SITE_CONSTRUCTION_WORKER'  // 新欄位：公司職位
  companyPermission?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'  // 新欄位：公司權限
  joinedAt?: string
  memberCount?: number
}



export interface CreateCompanyRequest {
  companyName: string
  companyUnifiedNumber: string
  companyType: 'CONTRACTOR' | 'SUPERVISION' | 'THIRD_PARTY'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'CIVIL_CONTRACTOR' // 營造等級，僅當 companyType 為 CONTRACTOR 時需要
  /** 公司地址 */
  address?: string
  /** 公司電話 */
  phone?: string
}

export interface UpdateCompanyRequest {
  companyId: string
  companyName?: string
  companyUnifiedNumber?: string
  companyStatus?: 'Y' | 'N'
  companyType?: 'CONTRACTOR' | 'SUPERVISION' | 'THIRD_PARTY'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'CIVIL_CONTRACTOR' // 統一使用 contractorLevel
  /** 公司地址 */
  address?: string
  /** 公司電話 */
  phone?: string
}

export interface CompanyListResponse {
  companies: Company[]
  total: number
  page: number
  pageSize: number
}

export interface CompanyDetailResponse extends Company {}

// 公司類型選項
export const COMPANY_TYPE_OPTIONS = [
  { value: 'CONTRACTOR', label: '營造廠商', color: 'primary' },
  { value: 'SUPERVISION', label: '監造單位', color: 'info' },
  { value: 'THIRD_PARTY', label: '第三方單位', color: 'success' },
] as const

// 營造等級選項（僅適用於營造廠商）
export const CONTRACTOR_LEVEL_OPTIONS = [
  { value: 'CLASS_A', label: '甲等', color: 'primary' },
  { value: 'CLASS_B', label: '乙等', color: 'info' },
  { value: 'CLASS_C', label: '丙等', color: 'success' },
  { value: 'CIVIL_CONTRACTOR', label: '土木包工業', color: 'danger' }
] as const

// 公司狀態選項
export const COMPANY_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '啟用', color: 'success' },
  { value: 'INACTIVE', label: '停用', color: 'danger' }
] as const

// API 服務
export const companyApi = {
  // 建立公司
  async create(data: CreateCompanyRequest): Promise<Company> {
    const response = await http.post('/management/company/create', data)
    const apiData = (response as any).data || response
    return companyDataTransform.fromApi(apiData)
  },

  /**
   * [Admin] 系統管理員建立公司
   */
  async adminCreate(data: CreateCompanyRequest): Promise<Company> {
    const response = await http.post('/management/admin/company/create', data)
    const apiData = (response as any).data || response
    return companyDataTransform.fromApi(apiData)
  },

  // 獲取公司列表
  async getList(params?: { search?: string; companyType?: string }): Promise<Company[]> {
    const response = await http.get('/management/company/list', { params })
    const data = response as any
    
    // 處理後端多層嵌套的格式
    const list = data.data?.data || data.data || data
    
    // 確保是陣列並進行轉換
    if (Array.isArray(list)) {
      return list.map((item: any) => companyDataTransform.fromApi(item))
    }
    return []
  },

  /**
   * [Admin] 獲取所有公司 (Admin Hub 使用)
   */
  async adminGetAll(): Promise<Company[]> {
    const response = await http.get('/management/admin/company/all')
    const data = response as any
    // Back-end returns { code: 200, message: "success", data: [...] }
    const list = data.data || data
     if (Array.isArray(list)) {
      return list.map((item: any) => companyDataTransform.fromApi(item))
    }
    return []
  },



  // 獲取公司詳情
  async getDetail(companyId: string): Promise<CompanyDetailResponse> {
    const response = await http.get(`/management/company/${companyId}`)
    const apiData = (response as any).data || response
    return companyDataTransform.fromApi(apiData)
  },

  // 更新公司
  async update(data: UpdateCompanyRequest): Promise<Company> {
    const response = await http.patch('/management/company/update', data)
    const apiData = (response as any).data || response
    return companyDataTransform.fromApi(apiData)
  },

  /**
   * [Admin] 系統管理員更新公司
   */
  async adminUpdate(data: UpdateCompanyRequest): Promise<Company> {
    const response = await http.patch('/management/admin/company/update', data)
    const apiData = (response as any).data || response
    return companyDataTransform.fromApi(apiData)
  },

  // 刪除公司
  async delete(companyId: string): Promise<void> {
    await http.delete(`/management/company/delete/${companyId}`)
  },

  /**
   * [Admin] 系統管理員刪除公司
   */
  async adminDelete(companyId: string): Promise<void> {
    await http.delete(`/management/admin/company/delete/${companyId}`)
  },

  // 檢查公司權限
  async checkPermission(companyId: string): Promise<{
    hasPermission: boolean
    userRole: string
  }> {
    const response: any = await http.get(`/management/company/${companyId}/permission`)
    return {
        hasPermission: response.hasPermission || response.has_permission || false,
        userRole: response.userRole || response.user_role || response.role || ''
    }
  },

  // 取得公司成員列表
  async getMembers(companyId: string): Promise<any[]> {
    const response = await http.get(`/management/companyMember/members/${companyId}`)
    const data = (response as any).data || response
    return Array.isArray(data) ? data : []
  },

  // 獲取使用者在該公司範圍內已加入的專案
  async getUserProjectsInCompany(companyId: string, userId: string): Promise<any[]> {
    const response = await http.get(`/management/company/${companyId}/member/${userId}/projects`)
    const data = (response as any).data || response
    return Array.isArray(data) ? data : []
  },

  // 邀請成員加入公司 (直接加入)
  async inviteMember(data: { userId: string; companyId: string; role: string }): Promise<void> {
    await http.post('/management/companyMember/invite', data)
  },

  // 移除公司成員
  async removeMember(companyId: string, targetUserId: string): Promise<void> {
    await http.delete(`/management/companyMember/remove/${companyId}/${targetUserId}`)
  },

  /** 更新公司成員權限（companyPermission） */
  async updateMemberPermission(companyId: string, targetUserId: string, role: string): Promise<void> {
    await http.patch('/management/companyMember/permission', { companyId, targetUserId, role })
  }
}

// 資料轉換工具
export const companyDataTransform = {
  // 將 API 回應轉換為前端格式
  fromApi(apiData: any): Company {
    return {
      companyId: apiData.companyId || apiData.company_id,
      companyName: apiData.companyName || apiData.company_name || apiData.name || apiData.title,
      companyCode: apiData.companyUnifiedNumber || apiData.companyCode || apiData.company_code || apiData.unified_number || apiData.tax_id || apiData.uniform_numbers,
      companyType: apiData.companyType || apiData.company_type,
      contractorLevel: apiData.contractorLevel || apiData.contractor_level || apiData.contractLevel,
      contactPerson: apiData.contactPerson || apiData.contact_person || '',
      contactPhone: apiData.contactPhone || apiData.contact_phone || '',
      contactEmail: apiData.contactEmail || apiData.contact_email || '',
      address: apiData.address || '',
      phone: apiData.phone || '',
      description: apiData.description || '',
      status: apiData.status || 'ACTIVE',
      ownerUserId: apiData.ownerUserId || apiData.owner_user_id,
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at,
      // 用戶角色相關欄位
      userRole: apiData.userRole,
      joinedAt: apiData.joinedAt,
      memberCount: apiData.memberCount
    }
  },



  // 將前端格式轉換為 API 格式
  toApi(companyData: Partial<Company>): any {
    const apiData: any = {
      companyName: companyData.companyName,
      companyUnifiedNumber: companyData.companyCode, // 前端的 companyCode 對應 API 的 companyUnifiedNumber
      companyType: companyData.companyType
    }

    // 只有當公司類型是營造廠商時才添加營造等級
    if (companyData.companyType === 'CONTRACTOR' && companyData.contractorLevel) {
      apiData.contractorLevel = companyData.contractorLevel
    }

    if (companyData.address !== undefined) {
      apiData.address = companyData.address
    }
    if (companyData.phone !== undefined) {
      apiData.phone = companyData.phone
    }

    return apiData
  },

  // 將前端格式轉換為更新 API 格式（包含所有可選欄位）
  toUpdateApi(companyData: Partial<Company>): any {
    const apiData: any = {
      companyName: companyData.companyName,
      companyUnifiedNumber: companyData.companyCode,
      companyType: companyData.companyType,
      contactPerson: companyData.contactPerson,
      contactPhone: companyData.contactPhone,
      contactEmail: companyData.contactEmail,
      address: companyData.address,
      phone: companyData.phone,
      description: companyData.description,
      status: companyData.status
    }
    
    // 只有當公司類型是營造廠商時才添加營造等級
    if (companyData.companyType === 'CONTRACTOR' && companyData.contractorLevel) {
      apiData.contractorLevel = companyData.contractorLevel
    }
    
    return apiData
  }
}

export default companyApi