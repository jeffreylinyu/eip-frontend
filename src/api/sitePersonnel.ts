import http from './http'

// 工地人員介面定義 (對應 ConstructionMember)
export interface SitePersonnel {
  id: string
  memberId: string // API: memberId
  fullName: string // API: fullName
  email: string
  phone: string
  sex: 'M' | 'F'
  identityNumber?: string // 身分證號
  companyId: string
  constructionId?: string // 所屬工程案 ID
  projectId?: string // Alias for constructionId
  departmentCode?: string
  subDepartmentCode?: string
  level?: string
  occupation?: string // 職位名稱
  licenseNumber?: string // 證照號碼
  licenseExpiryDate?: string // 證照到期日
  workStartDate?: string // 到職日
  status: 'Y' | 'N' | 'ARCHIVED' // Y=在職, N=離職, ARCHIVED=封存
  comments?: string
  hasPhoto?: boolean // 是否有上傳證照檔案
  // 前端可能需要的額外欄位或舊欄位兼容
  name?: string // 兼容舊代碼，映射到 fullName
  position?: string // 兼容舊代碼
}

// 建立人員請求
export interface CreateSitePersonnelRequest {
  memberId?: string // 若未提供後端會自動產生
  fullName: string
  identityNumber: string
  companyId: string
  sex: 'M' | 'F'
  phone: string
  email: string
  occupation?: string
  departmentCode?: string
  subDepartmentCode?: string
  level?: string
  licenseNumber?: string
  licenseExpiryDate?: string
  workStartDate?: string
  status?: 'Y' | 'N' | 'ARCHIVED'
  comments?: string
}

// 更新人員請求
export interface UpdateSitePersonnelRequest {
  memberId: string
  fullName?: string
  identityNumber?: string
  phone?: string
  email?: string
  sex?: 'M' | 'F'
  occupation?: string
  departmentCode?: string
  subDepartmentCode?: string
  level?: string
  licenseNumber?: string
  licenseExpiryDate?: string
  workStartDate?: string
  status?: 'Y' | 'N' | 'ARCHIVED'
  comments?: string
}

// 指派專案請求
export interface AssignProjectRequest {
  memberIdList: string[]
  constructionId: string
}

// 移除專案請求
export interface RemoveProjectRequest {
  memberIdList: string[]
}

export interface SitePersonnelListResponse {
  code: number
  message: string
  data: SitePersonnel[]
}

// 職位選項
// 職位選項
export const POSITION_OPTIONS = [
  { value: 'OWNER', label: '負責人', departmentCode: 'BS', color: 'dark', icon: 'fa-user-tie' },
  { value: 'ADMIN', label: '公司管理員', departmentCode: 'OE', color: 'secondary', icon: 'fa-user-cog' },
  { value: 'LABOUR_SAFETY', label: '勞安', departmentCode: 'LS', color: 'danger', icon: 'fa-shield-alt' },
  { value: 'CONSTRUCTION_MANAGER', label: '工地負責人', departmentCode: 'CM', color: 'primary', icon: 'fa-hard-hat' },
  { value: 'TECHNICIAN', label: '技師', departmentCode: 'TL', color: 'info', icon: 'fa-user-graduate' },
  { value: 'ARCHITECT', label: '建築師', departmentCode: 'AT', color: 'info', icon: 'fa-pencil-ruler' },
  { value: 'QUALITY', label: '品管', departmentCode: 'QT', color: 'warning', icon: 'fa-check-circle' },
  { value: 'ADMIN_STAFF', label: '行政人員', departmentCode: 'AS', color: 'success', icon: 'fa-user' },
  { value: 'SITE_WORKER', label: '現場人員', departmentCode: 'SW', color: 'secondary', icon: 'fa-user-nurse' }
] as const

// 狀態選項
export const STATUS_OPTIONS = [
  { value: 'Y', label: '在職', color: 'success', icon: 'fa-check' },
  { value: 'N', label: '離職', color: 'danger', icon: 'fa-times' },
  { value: 'ARCHIVED', label: '已封存', color: 'secondary', icon: 'fa-archive' }
] as const

// API 服務
export const sitePersonnelApi = {
  // 取得公司工地人員列表
  // GET /management/constructionMember/companyList?companyId={companyId}
  async getList(companyId: string): Promise<SitePersonnel[]> {
    const response: any = await http.get('/management/constructionMember/companyList', {
      params: { companyId }
    })
    
    // http 攔截器已解包 response.data.data (即陣列)，若直接回傳則為陣列
    // 若攔截器未解包完全或結構不同，則嘗試取 response.data
    const list = Array.isArray(response) ? response : (response.data || [])
    return list.map(sitePersonnelDataTransform.fromApi)
  },

  // 取得工地人員詳情
  // GET /management/constructionMember/get/{id}
  async getDetail(id: string): Promise<SitePersonnel> {
    const response: any = await http.get(`/management/constructionMember/get/${id}`)
    return sitePersonnelDataTransform.fromApi(response)
  },

  // 建立工地人員
  // POST /management/constructionMember/create
  async create(data: CreateSitePersonnelRequest): Promise<SitePersonnel> {
    const response: any = await http.post('/management/constructionMember/create', data)
    return sitePersonnelDataTransform.fromApi(response)
  },

  // 更新工地人員
  // PATCH /management/constructionMember/update
  async update(data: UpdateSitePersonnelRequest): Promise<SitePersonnel> {
    const response: any = await http.patch('/management/constructionMember/update', data)
    return sitePersonnelDataTransform.fromApi(response)
  },

  // 刪除工地人員
  // DELETE /management/constructionMember/delete?memberId={memberId}
  async delete(memberId: string): Promise<void> {
    await http.delete('/management/constructionMember/delete', {
      params: { memberId }
    })
  },

  // 分配項目
  // PATCH /management/constructionMember/addConstructionProject
  async assignProject(data: AssignProjectRequest): Promise<void> {
    await http.patch('/management/constructionMember/addConstructionProject', data)
  },

  // 移除項目
  // PATCH /management/constructionMember/removeConstructionProject
  async removeProject(data: RemoveProjectRequest): Promise<void> {
    await http.patch('/management/constructionMember/removeConstructionProject', data)
  },

  // 搜尋工地人員 (使用公司列表 API 進行前端過濾或後端若有提供搜尋 API)
  async search(companyId: string, query: string): Promise<SitePersonnel[]> {
    const list = await this.getList(companyId)
    if (!query) return list
    
    const lowerQuery = query.toLowerCase()
    return list.filter(p => 
      p.fullName.toLowerCase().includes(lowerQuery) || 
      p.email.toLowerCase().includes(lowerQuery) ||
      p.phone.includes(query)
    )
  },

  // 新增工地人員（含照片）
  // POST /management/constructionMember/createWithPhoto
  async createWithPhoto(memberData: CreateSitePersonnelRequest, photoFile: File): Promise<any> {
    const formData = new FormData()
    
    // 將 memberData 轉換為 JSON 字串
    formData.append('memberData', JSON.stringify(memberData))
    
    // 添加照片檔案
    if (photoFile) {
      formData.append('photoFile', photoFile)
    }
    
    const response: any = await http.post('/management/constructionMember/createWithPhoto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    return sitePersonnelDataTransform.fromApi(response)
  },

  // 下載人員照片 (證照)
  // GET /management/constructionMember/downloadPhoto?constructionMemberId={id}
  async downloadPhoto(memberId: string): Promise<Blob> {
    const response = await http.get('/management/constructionMember/downloadPhoto', {
      params: { constructionMemberId: memberId },
      responseType: 'blob'
    })
    return response as unknown as Blob
  }
}

// 資料轉換工具
export const sitePersonnelDataTransform = {
  // 將 API 回應轉換為前端格式
  fromApi(apiData: any): SitePersonnel {
    return {
      id: apiData.id, // 資料庫主鍵
      memberId: apiData.memberId, // 業務 ID
      fullName: apiData.fullName,
      name: apiData.fullName, // 兼容舊欄位
      email: apiData.email,
      phone: apiData.phone,
      identityNumber: apiData.identityNumber,
      sex: apiData.sex || 'M',
      companyId: apiData.companyId,
      constructionId: apiData.constructionId || apiData.projectId, // 假設後端回傳 constructionId
      projectId: apiData.constructionId || apiData.projectId, // Alias
      departmentCode: apiData.departmentCode,
      subDepartmentCode: apiData.subDepartmentCode,
      level: apiData.level,
      occupation: apiData.occupation,
      position: apiData.occupation, // 兼容舊欄位
      licenseNumber: apiData.licenseNumber,
      licenseExpiryDate: apiData.licenseExpiryDate,
      workStartDate: apiData.workStartDate,
      status: apiData.status || 'Y',
      comments: apiData.comments,
      hasPhoto: apiData.hasPhoto
    }
  },

  // 將前端格式轉換為 API 格式
  toApi(personnelData: Partial<SitePersonnel>): any {
    return {
      memberId: personnelData.memberId,
      fullName: personnelData.fullName,
      email: personnelData.email,
      phone: personnelData.phone,
      identityNumber: personnelData.identityNumber,
      sex: personnelData.sex,
      companyId: personnelData.companyId,
      occupation: personnelData.occupation,
      departmentCode: personnelData.departmentCode,
      licenseNumber: personnelData.licenseNumber,
      licenseExpiryDate: personnelData.licenseExpiryDate,
      workStartDate: personnelData.workStartDate,
      status: personnelData.status,
      comments: personnelData.comments
    }
  }
}

export default sitePersonnelApi
