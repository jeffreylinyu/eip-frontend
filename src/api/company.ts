import http from './http'

// 公司介面定義
export interface Company {
  id: string
  companyId: string
  companyName: string
  companyCode: string // 統一編號 (對應 API 的 companyUnifiedNumber)
  companyType: 'CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'CIVIL_CONTRACTOR' // 營造等級，僅當 companyType 為 CONTRACTOR 時需要
  contactPerson: string
  contactPhone: string
  contactEmail: string
  address: string
  description?: string
  status: 'ACTIVE' | 'INACTIVE'
  ownerUserId: string
  createdAt: string
  updatedAt: string
  // 新增字段（來自 CompanyMember）
  userRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt?: string
  memberCount?: number
}



export interface CreateCompanyRequest {
  companyName: string
  companyUnifiedNumber: string
  companyType: 'CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'CIVIL_CONTRACTOR' // 營造等級，僅當 companyType 為 CONTRACTOR 時需要
}

export interface UpdateCompanyRequest {
  companyId: string
  companyName?: string
  companyUnifiedNumber?: string
  companyStatus?: 'Y' | 'N'
  companyType?: 'CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'CIVIL_CONTRACTOR' // 統一使用 contractorLevel
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
  { value: 'SUPERVISOR', label: '監造單位', color: 'info' },
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
    return response as unknown as Company
  },

  // 獲取公司列表
  async getList(): Promise<Company[]> {
    const response = await http.get('/management/company/list')
    const data = response as any
    
    // 處理後端多層嵌套的格式
    return data.data?.data || data.data || data
  },



  // 獲取公司詳情
  async getDetail(companyId: string): Promise<CompanyDetailResponse> {
    const response = await http.get(`/management/company/${companyId}`)
    return response as unknown as CompanyDetailResponse
  },

  // 更新公司
  async update(data: UpdateCompanyRequest): Promise<Company> {
    const response = await http.patch('/management/company/update', data)
    return response as unknown as Company
  },

  // 刪除公司
  async delete(companyId: string): Promise<void> {
    await http.delete(`/management/company/delete/${companyId}`)
  },

  // 檢查公司權限
  async checkPermission(companyId: string): Promise<{
    hasPermission: boolean
    userRole: string
  }> {
    const response = await http.get(`/management/company/${companyId}/permission`)
    return response as unknown as { hasPermission: boolean; userRole: string }
  }
}

// 資料轉換工具
export const companyDataTransform = {
  // 將 API 回應轉換為前端格式
  fromApi(apiData: any): Company {
    return {
      id: apiData.id,
      companyId: apiData.companyId || apiData.company_id,
      companyName: apiData.companyName || apiData.company_name,
      companyCode: apiData.companyUnifiedNumber || apiData.companyCode || apiData.company_code,
      companyType: apiData.companyType || apiData.company_type,
      contractorLevel: apiData.contractorLevel || apiData.contractor_level || apiData.contractLevel,
      contactPerson: apiData.contactPerson || apiData.contact_person || '',
      contactPhone: apiData.contactPhone || apiData.contact_phone || '',
      contactEmail: apiData.contactEmail || apiData.contact_email || '',
      address: apiData.address || '',
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