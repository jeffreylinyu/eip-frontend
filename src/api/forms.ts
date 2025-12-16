import http from './http'
import { downloadBlob } from '@/utils/blobDownload'

// 擴展 Navigator 介面以支援 IE/Edge 的下載方法
declare global {
  interface Navigator {
    msSaveOrOpenBlob?: (blob: Blob, fileName: string) => void
  }
}

// 表單相關介面定義
export interface FormDownloadRequest {
  templateType?: string
  format?: string
  includeWatermark?: boolean
  includeSignature?: boolean
  customSettings?: Record<string, any>
}

// A-5 表單專用參數介面
export interface A5FormParams {
  constructionId: string
  title: string
  supervisoryName?: string
  supervisoryFactory?: string
  contractDate?: string
  startDate?: string
  finishDate?: string
  workedDay?: string
  disbursementAdvancePayment?: string
  estimateAmount?: string
  adjustPriceIndex?: string
  deductAmount?: string
  retention?: string
  deductionAdvancePayment?: string
  comment?: string
  deductedColumnReason?: string
  explainActualAmount?: string
}

// A-4 表單專用參數介面
export interface A4FormParams {
  constructionId: string
  title: string
  sequenceNumber?: string
  extensionFactor?: string
  approvalDocumentNumber?: string
  extensionDays?: string
  completionDateAfterExtension?: string
  originalSchedule?: string
  revisedSchedule?: string
  impactAnalysis?: string
  mitigationMeasures?: string
  additionalCost?: string
  approvalStatus?: string
  comment?: string
  supportingDocuments?: string
  approvalDate?: string
}

// A-7 表單專用參數介面
export interface A7FormParams {
  title: string
  constructionId: string
  companyId: string
}

export interface FormUpdateRequest {
  formData: Record<string, any>
  projectId?: string
  workspaceId?: string
}

// B類表單匯出（監造計畫書）請求
export interface ExportConstructionReportRequest {
  itemNumber?: number
  valueMap: {
    reportData: {
      constructionId: string
      companyId?: string
      fileId?: string
      freeVersion?: boolean
      address?: string
      phone?: string
      itemNumber?: number
      singleMap?: Record<string, any>
      defaultMap?: Record<string, any>
      inputMap?: Record<string, any>
    }
  }
}

export interface FormDownloadResponse {
  success: boolean
  message?: string
  fileName?: string
  fileSize?: number
  downloadUrl?: string
}

// A-5 施工計畫書 API
export const formA5Api = {
  // 下載 A-5 表單報告
  downloadReport: async (formData?: A5FormParams | Record<string, any>): Promise<Blob> => {
    const requestId = Date.now() + Math.random().toString(36).substr(2, 9)
    
    try {
      // 如果有表單資料，使用 POST 請求發送
      let response
      if (formData && Object.keys(formData).length > 0) {
        // 如果是 A5FormParams 類型，轉換為 API 需要的格式
        let apiData = formData
        if ('constructionId' in formData && 'title' in formData) {
          const a5Params = formData as A5FormParams
          apiData = {
            constructionId: a5Params.constructionId,
            title: a5Params.title,
            supervisoryName: a5Params.supervisoryName || '',
            supervisoryFactory: a5Params.supervisoryFactory || '',
            contractDate: a5Params.contractDate || '',
            startDate: a5Params.startDate || '',
            finishDate: a5Params.finishDate || '',
            workedDay: a5Params.workedDay || '',
            disbursementAdvancePayment: a5Params.disbursementAdvancePayment || '',
            estimateAmount: a5Params.estimateAmount || '',
            adjustPriceIndex: a5Params.adjustPriceIndex || '',
            deductAmount: a5Params.deductAmount || '',
            retention: a5Params.retention || '',
            deductionAdvancePayment: a5Params.deductionAdvancePayment || '',
            comment: a5Params.comment || '',
            deductedColumnReason: a5Params.deductedColumnReason || '',
            explainActualAmount: a5Params.explainActualAmount || ''
          }
        }
        
        // 使用共用的 blob 下載工具
        response = await downloadBlob({
          url: '/management/construction/export/report/AFive',
          method: 'POST',
          data: apiData,
            timeout: 30000
          })
      } else {
        // 無參數時使用 GET 請求
        response = await downloadBlob({
          url: '/management/construction/export/report/AFive',
          method: 'GET',
            timeout: 30000
          })
      }
      
      // 檢查回應是否為有效的 Blob
      if (!(response.data instanceof Blob)) {
        console.error('回應不是 Blob 類型:', response.data)
        throw new Error('API 回應格式錯誤')
      }
      
      return response.data
    } catch (error) {
      console.error(`[A-5 API] 請求失敗 ${requestId}:`, error)
      
      // 如果是 axios 錯誤，檢查詳細信息
      if (error.response) {
        console.error('API 錯誤回應:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        })
      }
      
      throw error
    }
  },

  // 更新 A-5 表單資料
  updateForm: async (data: FormUpdateRequest): Promise<any> => {
    try {
      const response = await http.post('/management/construction/a5/update', data)
      return response.data
    } catch (error) {
      console.error('A-5 表單更新失敗:', error)
      throw error
    }
  }
}

// B類表單 - 監造計畫書匯出
export const formBApi = {
  /**
   * 匯出監造計畫書（B 類表單）
   * @param request ExportConstructionReportRequest
   * @returns AxiosResponse<Blob>
   */
  exportSupervisoryPlan: async (request: ExportConstructionReportRequest) => {
    const response = await downloadBlob({
      url: '/management/generate/export/report/BOne',
      method: 'POST',
      data: request
    })
    return response
  }
}

// A-4 工期展延申請總表 API
export const formA4Api = {
  // 下載 A-4 表單報告
  downloadReport: async (formData?: A4FormParams | Record<string, any>): Promise<Blob> => {
    const requestId = Date.now() + Math.random().toString(36).substr(2, 9)
    
    try {
      // 如果有表單資料，使用 POST 請求發送
      let response
      if (formData && Object.keys(formData).length > 0) {
        // 如果是 A4FormParams 類型，轉換為 API 需要的格式
        let apiData = formData
        if ('constructionId' in formData && 'title' in formData) {
          const a4Params = formData as A4FormParams
          apiData = {
            constructionId: a4Params.constructionId,
            title: a4Params.title,
            sequenceNumber: a4Params.sequenceNumber || '',
            extensionFactor: a4Params.extensionFactor || '',
            approvalDocumentNumber: a4Params.approvalDocumentNumber || '',
            extensionDays: a4Params.extensionDays || '',
            completionDateAfterExtension: a4Params.completionDateAfterExtension || '',
            originalSchedule: a4Params.originalSchedule || '',
            revisedSchedule: a4Params.revisedSchedule || '',
            impactAnalysis: a4Params.impactAnalysis || '',
            mitigationMeasures: a4Params.mitigationMeasures || '',
            additionalCost: a4Params.additionalCost || '',
            approvalStatus: a4Params.approvalStatus || '',
            comment: a4Params.comment || '',
            supportingDocuments: a4Params.supportingDocuments || '',
            approvalDate: a4Params.approvalDate || ''
          }
        }
        
        // 使用共用的 blob 下載工具
        response = await downloadBlob({
          url: '/management/construction/export/report/AFour',
          method: 'POST',
          data: apiData,
            timeout: 30000
          })
      } else {
        // 無參數時使用 GET 請求
        response = await downloadBlob({
          url: '/management/construction/export/report/AFour',
          method: 'GET',
            timeout: 30000
          })
      }
      
      // downloadBlob 已經檢查過 Blob 類型，直接返回
      return response.data
    } catch (error) {
      console.error(`[A-4 API] 請求失敗 ${requestId}:`, error)
      
      // 如果是 axios 錯誤，檢查詳細信息
      if (error.response) {
        console.error('A-4 API 錯誤回應:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        })
      }
      
      throw error
    }
  },

  // 更新 A-4 表單資料
  updateForm: async (data: FormUpdateRequest): Promise<any> => {
    try {
      const response = await http.post('/management/construction/a4/update', data)
      return response.data
    } catch (error) {
      console.error('A-4 表單更新失敗:', error)
      throw error
    }
  }
}

// A-7 品質管制計畫 API
export const formA7Api = {
  // 下載 A-7 表單報告
  downloadReport: async (formData?: A7FormParams | Record<string, any>): Promise<Blob> => {
    const requestId = Date.now() + Math.random().toString(36).substr(2, 9)
    
    try {
      // 如果有表單資料，使用 POST 請求發送
      let response
      if (formData && Object.keys(formData).length > 0) {
        // 如果是 A7FormParams 類型，轉換為 API 需要的格式
        let apiData = formData
        if ('constructionId' in formData) {
          const a7Params = formData as A7FormParams
          apiData = {
            title: a7Params.title,
            constructionId: a7Params.constructionId,
            companyId: a7Params.companyId
          }
        }
        
        // 使用共用的 blob 下載工具
        response = await downloadBlob({
          url: '/management/construction/export/report/ASeven',
          method: 'POST',
          data: apiData,
            timeout: 30000
          })
      } else {
        // 無參數時使用 GET 請求
        response = await downloadBlob({
          url: '/management/construction/export/report/ASeven',
          method: 'GET',
            timeout: 30000
          })
      }
      
      // downloadBlob 已經檢查過 Blob 類型，直接返回
      return response.data
    } catch (error) {
      console.error(`[A-7 API] 請求失敗 ${requestId}:`, error)
      
      // 如果是 axios 錯誤，檢查詳細信息
      if (error.response) {
        console.error('A-7 API 錯誤回應:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        })
      }
      
      throw error
    }
  },

  // 更新 A-7 表單資料
  updateForm: async (data: FormUpdateRequest): Promise<any> => {
    try {
      const response = await http.post('/management/construction/a7/update', data)
      return response.data
    } catch (error) {
      console.error('A-7 表單更新失敗:', error)
      throw error
    }
  }
}

// 通用檔案下載處理函數
export const downloadBlobAsFile = (blob: Blob, fileName: string): void => {
  try {
    // 檢查 blob 是否有效
    if (!blob || blob.size === 0) {
      console.error('Blob 無效或為空:', blob)
      throw new Error('檔案資料無效')
    }
    
    // 確保檔案名稱有副檔名
    if (!fileName.includes('.')) {
      fileName = fileName + '.docx'
    }
    
    // 嘗試使用現代下載方法
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      // IE/Edge 專用方法
      window.navigator.msSaveOrOpenBlob(blob, fileName)
      return
    }
    
    // 創建 blob URL
    const url = window.URL.createObjectURL(blob)
    
    // 創建下載連結
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    
    // 確保 link 有效
    if (typeof link.download === 'undefined') {
      // 對於不支援 download 屬性的瀏覽器，嘗試在新視窗開啟
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 100)
      return
    }
    
    // 觸發下載
    document.body.appendChild(link)
    
    // 只使用一種觸發方式，避免重複下載
    link.click()
    
    // 延遲清理，確保下載開始
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link)
      }
      window.URL.revokeObjectURL(url)
    }, 100)
    
  } catch (error) {
    console.error('檔案下載失敗:', error)
    throw new Error('檔案下載失敗: ' + (error as Error).message)
  }
}

// 注意：extractFileNameFromResponse 已移至 @/utils/blobDownload
// 如需使用，請從該模組導入

// 檔案大小格式化
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 錯誤處理輔助函數
export const handleApiError = (error: any): string => {
  if (error.response) {
    // 伺服器回應錯誤
    const status = error.response.status
    const message = error.response.data?.message || error.message
    
    switch (status) {
      case 400:
        return '請求參數錯誤，請檢查輸入資料'
      case 401:
        return '未授權，請重新登入'
      case 403:
        return '權限不足，無法執行此操作'
      case 404:
        return '找不到指定的資源'
      case 500:
        return '伺服器內部錯誤，請稍後重試'
      default:
        return message || '未知錯誤'
    }
  } else if (error.request) {
    // 網路錯誤
    return '網路連線失敗，請檢查網路狀態'
  } else {
    // 其他錯誤
    return error.message || '操作失敗'
  }
}
