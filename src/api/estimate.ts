import http from './http'

// 估驗詳細表記錄介面
export interface EstimateRecord {
  id?: string
  constructionId: string
  period?: string // 前端顯示用的期別欄位
  estimateAmount: number
  adjustPriceIndex: number
  deductAmount: number
  retention: number
  deductionAdvancePayment: number
  deductedReason?: string
  amountPayable?: number
  createdAt?: string
  updatedAt?: string
  
  // 新增的欄位（根據 API 回傳格式）
  accumulatedAdvancePayment: number
  cumulativeDisbursementAdvancePayment: number
  lastUpdateAmountContract: number
  notDeductedAdvancePayment: number
  originContractPayment: number
  payment: number
  percentageOfFinish: number
  percentageOfTotalFinish: number
  previewsAdjustPriceIndex: number
  previewsDeductAmount: number
  previewsDeductionAdvancePayment: number
  previewsEstimateAmount: number
  previewsRetention: number
  previewsTotalPayment: number
  totalAdjustPriceIndex: number
  totalDeductAmount: number
  totalDeductionAdvancePayment: number
  totalEstimateAmount: number
  totalPayment: number
  totalRetention: number
  workedDay: number
}

// 估驗列表查詢參數
export interface EstimateListParams {
  constructionId: string
  page?: number
  limit?: number
}

// 估驗列表回應
export interface EstimateListResponse {
  data: EstimateRecord[]
  total: number
  page: number
  limit: number
}

// 新增估驗記錄請求
export interface CreateEstimateRequest {
  constructionId: string
  estimateAmount: number
  adjustPriceIndex: number
  deductAmount: number
  retention: number
  deductionAdvancePayment: number
  deductedReason?: string
}

// 更新估驗記錄請求
export interface UpdateEstimateRequest {
  estimateId: string
  estimateAmount?: number
  originContractPayment?: number
  comment?: string
  adjustPriceIndex?: number
  disbursementAdvancePayment?: number
  retention?: number
  deductedReason?: string
}

// 估驗記錄回應
export interface EstimateResponse {
  success: boolean
  data: EstimateRecord
  message?: string
}

// 估驗詳細表 API
export const estimateApi = {
  // 取得估驗記錄列表
  async getEstimateList(params: EstimateListParams): Promise<EstimateListResponse> {
    try {
      const response = await http.get('/management/estimate/list', { params })
      
      // 處理不同的 API 回應格式
      if (Array.isArray(response.data)) {
        // 直接回傳陣列格式
        return {
          data: response.data,
          total: response.data.length,
          page: 1,
          limit: response.data.length
        }
      } else if (response.data && Array.isArray(response.data.data)) {
        // 巢狀 data 格式
        return {
          data: response.data.data,
          total: response.data.total || response.data.data.length,
          page: response.data.page || 1,
          limit: response.data.limit || response.data.data.length
        }
      } else {
        // 其他格式，嘗試直接使用
        return {
          data: response.data || [],
          total: 0,
          page: 1,
          limit: 0
        }
      }
    } catch (error) {
      console.error('取得估驗記錄列表失敗:', error)
      throw error
    }
  },

  // 新增估驗記錄
  async createEstimate(data: CreateEstimateRequest): Promise<EstimateResponse> {
    try {
      const response = await http.post('/management/estimate/create', data)
      return response.data
    } catch (error) {
      console.error('新增估驗記錄失敗:', error)
      throw error
    }
  },

  // 更新估驗記錄
  async updateEstimate(data: UpdateEstimateRequest): Promise<EstimateResponse> {
    try {
      const response = await http.patch('/management/estimate/update', data)
      return response.data
    } catch (error) {
      console.error('更新估驗記錄失敗:', error)
      throw error
    }
  },

  // 刪除估驗記錄
  async deleteEstimate(id: string): Promise<EstimateResponse> {
    try {
      const response = await http.delete(`/management/estimate/delete/${id}`)
      return response.data
    } catch (error) {
      console.error('刪除估驗記錄失敗:', error)
      throw error
    }
  },

  // 批量更新估驗記錄
  async batchUpdateEstimates(records: EstimateRecord[]): Promise<EstimateResponse> {
    try {
      const response = await http.patch('/management/estimate/batch-update', { records })
      return response.data
    } catch (error) {
      console.error('批量更新估驗記錄失敗:', error)
      throw error
    }
  }
}
