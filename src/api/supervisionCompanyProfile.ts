import http from './http'

export interface SupervisionCompanyProfileData {
  id?: number
  companyId?: string
  constructionId?: string

  // 工程基本資訊
  constructionName?: string
  contractNumber?: string
  constructionLocation?: string
  constructionType?: string

  // 監造專屬
  supervisoryBudget?: string
  supervisoryContact?: string
  internalCode?: string
  supervisoryNotes?: string

  // 工期
  signDate?: string
  constructionStartDate?: string
  constructionEndDate?: string
  constructionConfirmDate?: string
  workDay?: number | null
  durationType?: string
  totalExtensionDays?: number | null
  totalStopDays?: number | null

  // 預算與付款
  budgetFrom?: string
  payMethod?: string
  prePayRatio?: number | null
  retainedRatio?: number | null

  // 簽核
  signLevel?: any

  createdAt?: string
  updatedAt?: string
}

export const supervisionCompanyProfileApi = {
  async getProfile(constructionId: string, workspaceId?: string): Promise<SupervisionCompanyProfileData> {
    try {
      const params: any = { constructionId }
      if (workspaceId) params.workspaceId = workspaceId
      const response: any = await http.get('/management/supervision-company-profile/get', { params })
      return response || {}
    } catch (error) {
      console.error('取得監造公司基本資料失敗:', error)
      throw error
    }
  },

  async saveProfile(data: SupervisionCompanyProfileData, workspaceId?: string): Promise<SupervisionCompanyProfileData> {
    try {
      const params = workspaceId ? { workspaceId } : {}
      const response: any = await http.put('/management/supervision-company-profile/save', data, { params })
      return response || {}
    } catch (error) {
      console.error('儲存監造公司基本資料失敗:', error)
      throw error
    }
  }
}
