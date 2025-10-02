import http from './http'

// 工地人員介面定義
export interface SitePersonnel {
  id: string
  personnelId: string
  name: string
  email: string
  phone: string
  idNumber: string // 身分證號
  position: 'QUALITY_CONTROL' | 'SAFETY_OFFICER' | 'PROFESSIONAL_ENGINEER'
  specialization?: string // 專業領域（針對專業技師）
  licenseNumber?: string // 證照號碼
  licenseExpiryDate?: string // 證照到期日
  licenseFile?: string // 證照檔案路徑
  companyId: string
  projectId?: string // 分配的項目ID
  projectName?: string // 分配的項目名稱
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  hireDate: string // 僱用日期
  leaveDate?: string // 離職日期
  notes?: string // 備註
  createdAt: string
  updatedAt: string
}

// 新增工地人員（含照片）的請求介面
export interface CreateConstructionMemberRequest {
  memberId: string
  fullName: string
  companyId: string
  workStartDate: string
  occupation: string
  licenseNumber?: string
  sex: 'M' | 'F'
  email: string
  phone: string
  licenseExpiryDate?: string
  comments?: string
  constructionId: string
  identityNumber: string
}

// 新增工地人員（含照片）的回應介面
export interface CreateConstructionMemberResponse {
  success: boolean
  message: string
  memberId?: string
}

export interface CreateSitePersonnelRequest {
  name: string
  email: string
  phone: string
  idNumber: string
  position: 'QUALITY_CONTROL' | 'SAFETY_OFFICER' | 'PROFESSIONAL_ENGINEER'
  specialization?: string
  licenseNumber?: string
  licenseExpiryDate?: string
  licenseFile?: string
  companyId: string
  projectId?: string
  hireDate: string
  notes?: string
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
}

export interface UpdateSitePersonnelRequest {
  personnelId: string
  name?: string
  email?: string
  phone?: string
  idNumber?: string
  position?: 'QUALITY_CONTROL' | 'SAFETY_OFFICER' | 'PROFESSIONAL_ENGINEER'
  specialization?: string
  licenseNumber?: string
  licenseExpiryDate?: string
  licenseFile?: string
  projectId?: string
  status?: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  hireDate?: string
  leaveDate?: string
  notes?: string
}

export interface AssignProjectRequest {
  personnelId: string
  projectId: string
}

export interface SitePersonnelListResponse {
  personnel: SitePersonnel[]
  total: number
  page: number
  pageSize: number
}

// 職位選項
export const POSITION_OPTIONS = [
  { value: 'QUALITY_CONTROL', label: '品管人員', color: 'primary', icon: 'fa-check-circle' },
  { value: 'SAFETY_OFFICER', label: '勞安人員', color: 'warning', icon: 'fa-shield-alt' },
  { value: 'PROFESSIONAL_ENGINEER', label: '專業技師', color: 'success', icon: 'fa-user-graduate' }
] as const

// 狀態選項
export const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '在職', color: 'success', icon: 'fa-check' },
  { value: 'ON_LEAVE', label: '休假', color: 'info', icon: 'fa-calendar-times' },
  { value: 'TERMINATED', label: '離職', color: 'danger', icon: 'fa-times' }
] as const

// API 服務
export const sitePersonnelApi = {
  // 取得公司工地人員列表
  async getList(companyId: string, page = 1, pageSize = 20): Promise<SitePersonnelListResponse> {
    const response = await http.get(`/management/company/${companyId}/site-personnel`, {
      params: { page, pageSize }
    })
    return response as unknown as SitePersonnelListResponse
  },

  // 取得工地人員詳情
  async getDetail(personnelId: string): Promise<SitePersonnel> {
    const response = await http.get(`/management/site-personnel/${personnelId}`)
    return response as unknown as SitePersonnel
  },

  // 建立工地人員
  async create(data: CreateSitePersonnelRequest): Promise<SitePersonnel> {
    const response = await http.post('/management/site-personnel/create', data)
    return response as unknown as SitePersonnel
  },

  // 更新工地人員
  async update(data: UpdateSitePersonnelRequest): Promise<SitePersonnel> {
    const response = await http.patch('/management/site-personnel/update', data)
    return response as unknown as SitePersonnel
  },

  // 刪除工地人員
  async delete(personnelId: string): Promise<void> {
    await http.delete(`/management/site-personnel/delete/${personnelId}`)
  },

  // 分配項目
  async assignProject(data: AssignProjectRequest): Promise<SitePersonnel> {
    const response = await http.post('/management/site-personnel/assign-project', data)
    return response as unknown as SitePersonnel
  },

  // 移除項目分配
  async removeProjectAssignment(personnelId: string): Promise<SitePersonnel> {
    const response = await http.post('/management/site-personnel/remove-project', { personnelId })
    return response as unknown as SitePersonnel
  },

  // 搜尋工地人員
  async search(companyId: string, query: string): Promise<SitePersonnel[]> {
    const response = await http.get(`/management/company/${companyId}/site-personnel/search`, {
      params: { query }
    })
    return response as unknown as SitePersonnel[]
  },

  // 根據項目取得工地人員
  async getByProject(projectId: string): Promise<SitePersonnel[]> {
    const response = await http.get(`/management/project/${projectId}/site-personnel`)
    return response as unknown as SitePersonnel[]
  },

  // 新增工地人員（含照片）
  async createWithPhoto(memberData: CreateConstructionMemberRequest, photoFile: File): Promise<CreateConstructionMemberResponse> {
    const formData = new FormData()
    
    // 將 memberData 轉換為 JSON 字串
    formData.append('memberData', JSON.stringify(memberData))
    
    // 添加照片檔案
    formData.append('photoFile', photoFile)
    
    const response = await http.post('/management/constructionMember/createWithPhoto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    return response as unknown as CreateConstructionMemberResponse
  }
}

// 資料轉換工具
export const sitePersonnelDataTransform = {
  // 將 API 回應轉換為前端格式
  fromApi(apiData: any): SitePersonnel {
    return {
      id: apiData.id,
      personnelId: apiData.personnelId || apiData.personnel_id,
      name: apiData.name,
      email: apiData.email,
      phone: apiData.phone,
      idNumber: apiData.idNumber || apiData.id_number,
      position: apiData.position,
      specialization: apiData.specialization,
      licenseNumber: apiData.licenseNumber || apiData.license_number,
      licenseExpiryDate: apiData.licenseExpiryDate || apiData.license_expiry_date,
      companyId: apiData.companyId || apiData.company_id,
      projectId: apiData.projectId || apiData.project_id,
      projectName: apiData.projectName || apiData.project_name,
      status: apiData.status,
      hireDate: apiData.hireDate || apiData.hire_date,
      leaveDate: apiData.leaveDate || apiData.leave_date,
      notes: apiData.notes,
      createdAt: apiData.createdAt || apiData.created_at,
      updatedAt: apiData.updatedAt || apiData.updated_at
    }
  },

  // 將前端格式轉換為 API 格式
  toApi(personnelData: Partial<SitePersonnel>): any {
    return {
      name: personnelData.name,
      email: personnelData.email,
      phone: personnelData.phone,
      idNumber: personnelData.idNumber,
      position: personnelData.position,
      specialization: personnelData.specialization,
      licenseNumber: personnelData.licenseNumber,
      licenseExpiryDate: personnelData.licenseExpiryDate,
      companyId: personnelData.companyId,
      projectId: personnelData.projectId,
      hireDate: personnelData.hireDate,
      notes: personnelData.notes
    }
  }
}

export default sitePersonnelApi

// 測試新增工地人員（含照片）的函數
export const testCreateConstructionMember = async (photoFile?: File) => {
  const testMemberData: CreateConstructionMemberRequest = {
    memberId: "M12345",
    fullName: "王大明",
    companyId: "CYDuGs506wpfdm94zvJKGDRRzE8JM",
    workStartDate: "2024-08-28T09:00:00",
    occupation: "SITE_MANAGER",
    licenseNumber: "SM-2024-001",
    sex: "M",
    email: "wang.daming@example.com",
    phone: "0912-345-678",
    licenseExpiryDate: "2026-12-31T17:00:00",
    comments: "工地主任，經驗豐富",
    constructionId: "CT259c45ee7ba7440997ffaf37ca9abdc7",
    identityNumber: "A12345699"
  }

  try {
    // console.log('🧪 開始測試新增工地人員（含照片）...')
    // console.log('📋 測試資料:', testMemberData)
    // console.log('📸 照片檔案:', photoFile ? photoFile.name : '無照片')
    
    // 如果沒有提供照片檔案，建立一個假的檔案用於測試
    let testPhotoFile = photoFile
    if (!testPhotoFile) {
      // 建立一個假的檔案物件用於測試
      const fakeFile = new File(['fake image data'], 'test-photo.jpg', { type: 'image/jpeg' })
      testPhotoFile = fakeFile
      // console.log('⚠️ 使用假照片檔案進行測試')
    }
    
    const result = await sitePersonnelApi.createWithPhoto(testMemberData, testPhotoFile)
    
    // console.log('✅ 測試成功！工地人員已建立')
    // console.log('📄 回應結果:', result)
    
    return result
  } catch (error) {
    console.error('❌ 測試失敗:', error)
    throw error
  }
}
