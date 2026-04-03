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
  subDepartmentCode?: string
  level?: string
  occupation?: string // 職稱（父項）
  occupationCategory?: string // 職稱類別（子項），如勞安→甲級職安、專任工程人員→土木技師
  licenseNumber?: string // 證照號碼
  licenseExpiryDate?: string // 證照到期日
  workStartDate?: string // 到職日
  status: 'Y' | 'N' | 'ARCHIVED' // Y=在職, N=離職, ARCHIVED=封存
  comments?: string
  hasPhoto?: boolean // 是否有上傳證照檔案
  /** 是否專職 */
  isDedicated?: boolean
  /** 是否仍屬於工程案的最後一版（用於判斷「所屬專案」） */
  isInLatestVersion?: boolean
  /** 所有指派（工程、多段任職） */
  assignments?: { id?: number; constructionId: string; workStartDate?: string | null; workEndDate?: string | null; isActive?: boolean }[]
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
  occupationCategory?: string
  subDepartmentCode?: string
  level?: string
  licenseNumber?: string
  licenseExpiryDate?: string
  workStartDate?: string
  status?: 'Y' | 'N' | 'ARCHIVED'
  comments?: string
  /** 是否專職 */
  isDedicated?: boolean
}

// 更新人員請求
export interface UpdateSitePersonnelRequest {
  memberId: string
  /** updateWithPhoto 需要用於權限檢查 */
  companyId?: string
  fullName?: string
  identityNumber?: string
  phone?: string
  email?: string
  sex?: 'M' | 'F'
  occupation?: string
  occupationCategory?: string
  subDepartmentCode?: string
  level?: string
  licenseNumber?: string
  licenseExpiryDate?: string
  workStartDate?: string
  status?: 'Y' | 'N' | 'ARCHIVED'
  comments?: string
  /** 是否專職 */
  isDedicated?: boolean
}

// 指派專案請求
export interface AssignProjectRequest {
  memberIdList: string[]
  constructionId: string
  /** 到職日（YYYY-MM-DD） */
  assignmentStartDate: string
  /** 公司 ID（必傳：監造端須傳監造公司 ID，後端依此判斷使用監造/營造人員表） */
  companyId?: string
}

// 移除專案請求
export interface RemoveProjectRequest {
  memberIdList: string[]
  /** 若提供則只移除此工程的指派；不提供則移除該員所有指派 */
  constructionId?: string
  /** 離職日（YYYY-MM-DD）；若 hardDeleteAssignment 為 true 可不填 */
  assignmentEndDate?: string
  /** 是否要硬刪除此工程的任職紀錄（不寫離職日，直接刪除 assignment） */
  hardDeleteAssignment?: boolean
  /** 公司 ID（監造端須傳監造公司 ID，後端依此判斷使用監造/營造人員表） */
  companyId?: string
}

export interface SitePersonnelListResponse {
  code: number
  message: string
  data: SitePersonnel[]
}

// 職稱選項由 @/api/sitePersonnelOccupations 提供（監造/營造分開、含類別子項）
export { POSITION_OPTIONS_FLAT as POSITION_OPTIONS, LEGACY_OCCUPATION_MAP } from './sitePersonnelOccupations'

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
  async getList(companyId: string, config?: { skipAuthRedirectOn401?: boolean }): Promise<SitePersonnel[]> {
    const response: any = await http.get('/management/constructionMember/companyList', {
      params: { companyId },
      ...config
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

  // 更新工地人員（含照片）
  // PATCH /management/constructionMember/updateWithPhoto
  async updateWithPhoto(memberData: UpdateSitePersonnelRequest, photoFile: File): Promise<SitePersonnel> {
    const formData = new FormData()
    formData.append('memberData', JSON.stringify(memberData))
    if (photoFile) formData.append('photoFile', photoFile)

    const response: any = await http.patch('/management/constructionMember/updateWithPhoto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
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

  // 更新任職紀錄的到職日、離職日
  // PATCH /management/constructionMember/updateAssignment
  async updateAssignment(data: { assignmentId: number; assignmentStartDate?: string | null; assignmentEndDate?: string | null }): Promise<void> {
    await http.patch('/management/constructionMember/updateAssignment', data)
  },

  // 移除單筆任職紀錄
  // DELETE /management/constructionMember/assignment/{assignmentId}
  async deleteAssignment(assignmentId: number): Promise<void> {
    await http.delete(`/management/constructionMember/assignment/${assignmentId}`)
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
      constructionId: apiData.constructionId || apiData.projectId,
      projectId: apiData.constructionId || apiData.projectId, // Alias
      subDepartmentCode: apiData.subDepartmentCode,
      level: apiData.level,
      occupation: apiData.occupation,
      occupationCategory: apiData.occupationCategory,
      position: apiData.occupation, // 兼容舊欄位
      licenseNumber: apiData.licenseNumber,
      licenseExpiryDate: apiData.licenseExpiryDate,
      workStartDate: apiData.workStartDate,
      status: apiData.status || 'Y',
      comments: apiData.comments,
      hasPhoto: apiData.hasPhoto,
      isInLatestVersion: apiData.isInLatestVersion ?? false,
      isDedicated: apiData.isDedicated ?? undefined,
      assignments: apiData.assignments
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
      occupationCategory: personnelData.occupationCategory,
      licenseNumber: personnelData.licenseNumber,
      licenseExpiryDate: personnelData.licenseExpiryDate,
      workStartDate: personnelData.workStartDate,
      status: personnelData.status,
      comments: personnelData.comments,
      isDedicated: personnelData.isDedicated
    }
  }
}

export default sitePersonnelApi
