import http from './http'

export enum EstimateStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

// 估驗詳細表記錄介面（對應後端 EstimateResponse）
export interface EstimateRecord {
  estimateId?: string
  id?: string
  constructionId?: string
  estimateAmount?: number
  adjustPriceIndex?: number
  deductAmount?: number
  retention?: number
  deductionAdvancePayment?: number
  payment?: number
  deductedReason?: string
  explainExtendReason?: string
  /** 估驗期間起日（YYYY-MM-DD） */
  estimatePeriodStart?: string
  /** 估驗期間訖日（YYYY-MM-DD） */
  estimatePeriodEnd?: string
  comment?: string
  workedDay?: number
  originContractPayment?: number
  lastUpdateAmountContract?: number
  accumulatedAdvancePayment?: number
  disbursementAdvancePayment?: number
  amountPayable?: number
  period?: string
  createdAt?: string
  updatedAt?: string
  sortOrder?: number
  status?: string
  // 累計欄位（後端有定義但 list API 未回傳，設為 optional）
  percentageOfFinish?: number
  percentageOfTotalFinish?: number
  cumulativeDisbursementAdvancePayment?: number
  notDeductedAdvancePayment?: number
  previewsAdjustPriceIndex?: number
  previewsDeductAmount?: number
  previewsDeductionAdvancePayment?: number
  previewsEstimateAmount?: number
  previewsRetention?: number
  previewsTotalPayment?: number
  totalAdjustPriceIndex?: number
  totalDeductAmount?: number
  totalDeductionAdvancePayment?: number
  totalEstimateAmount?: number
  totalPayment?: number
  totalRetention?: number
  /** 變更設計版本 ID（依估驗期間訖日＋視角判斷，後端回傳） */
  designChangeId?: number | null
  /** 版本顯示名稱（例：原契約、變更設計1） */
  versionLabel?: string | null
  /** 版本區間顯示（例：115.01.01 ～ 115.04.30） */
  versionRange?: string | null
  /** 本筆適用之保留款比例（%，例：5 表示 5%） */
  retentionRatePercent?: number | null
}

export interface EstimateListParams {
  constructionId: string
  /** 視角：CONTRACTOR=營造端，SUPERVISORY=工程端，SUPERVISION_COMPANY=監造端 */
  ownerType?: string
}

/** 單一版本保留款比例（供前端依畫面上日期動態顯示適用幾%） */
export interface RetentionRateByVersionItem {
  designChangeId: number | null
  retentionRatePercent: number
}

export interface EstimateCumulative {
  estimateAmount: number
  adjustPriceIndex: number
  deductAmount: number
  retention: number
  deductionAdvancePayment: number
  amountPayable: number
}

export interface EstimateListResponse {
  records: EstimateRecord[]
  cumulative: EstimateCumulative
}

export interface CreateEstimateRequest {
  constructionId: string
  /** 視角：CONTRACTOR / SUPERVISORY / SUPERVISION_COMPANY */
  ownerType?: string
  estimateAmount?: number
  adjustPriceIndex?: number
  deductAmount?: number
  retention?: number
  deductionAdvancePayment?: number
  deductedReason?: string
  explainExtendReason?: string
  estimatePeriodStart?: string
  estimatePeriodEnd?: string
  status?: string
}

export interface UpdateEstimateRequest {
  estimateId: string
  estimateAmount?: number
  adjustPriceIndex?: number
  deductAmount?: number
  retention?: number
  deductionAdvancePayment?: number
  disbursementAdvancePayment?: number
  deductedReason?: string
  explainExtendReason?: string
  estimatePeriodStart?: string
  estimatePeriodEnd?: string
  comment?: string
  originContractPayment?: number
  status?: string
}

// http interceptor 已將 { code, data } 解包，回傳的 response 即為內層 data
export const estimateApi = {
  async getEstimateList(params: EstimateListParams): Promise<EstimateListResponse> {
    try {
      const response: any = await http.get('/management/estimate/list', { params })

      const records = Array.isArray(response?.records)
        ? response.records
        : Array.isArray(response)
          ? response
          : []

      const defaultCumulative: EstimateCumulative = {
        estimateAmount: 0, adjustPriceIndex: 0, deductAmount: 0,
        retention: 0, deductionAdvancePayment: 0, amountPayable: 0
      }

      return {
        records,
        cumulative: response?.cumulative ?? defaultCumulative
      }
    } catch (error) {
      console.error('取得估驗記錄列表失敗:', error)
      throw error
    }
  },

  async createEstimate(data: CreateEstimateRequest): Promise<any> {
    try {
      return await http.post('/management/estimate/create', data)
    } catch (error) {
      console.error('新增估驗記錄失敗:', error)
      throw error
    }
  },

  async updateEstimate(data: UpdateEstimateRequest): Promise<any> {
    try {
      return await http.patch('/management/estimate/update', data)
    } catch (error) {
      console.error('更新估驗記錄失敗:', error)
      throw error
    }
  },

  async deleteEstimate(estimateId: string): Promise<any> {
    try {
      return await http.delete(`/management/estimate/delete/${estimateId}`)
    } catch (error) {
      console.error('刪除估驗記錄失敗:', error)
      throw error
    }
  },

  /** 各版本「目前」保留款比例（%），依畫面上估驗期間訖日動態顯示適用幾%；基本資料改動後重拉即更新 */
  async getRetentionRatesByVersion(constructionId: string, ownerType?: string): Promise<RetentionRateByVersionItem[]> {
    const response: any = await http.get('/management/estimate/retention-rates-by-version', {
      params: { constructionId, ownerType }
    })
    const list = Array.isArray(response) ? response : response?.data ?? []
    return list.map((item: any) => ({
      designChangeId: item.designChangeId ?? null,
      retentionRatePercent: Number(item.retentionRatePercent) || 0
    }))
  },

  async reorderEstimates(
    constructionId: string,
    orderedEstimateIds: string[],
    ownerType?: string
  ): Promise<any> {
    try {
      return await http.put('/management/estimate/reorder', {
        constructionId,
        orderedEstimateIds,
        ...(ownerType != null && { ownerType })
      })
    } catch (error) {
      console.error('排序估驗記錄失敗:', error)
      throw error
    }
  }
}

// ── 公文關聯（與 A-4 設計一致） ──

export interface EstimateLinkedDocument {
  referenceId: number
  documentId: number
  sourceType: string
  displayTitle: string
  targetRole: string
  targetName: string
}

/** 取得估驗紀錄的所有公文關聯。GET /estimate/{estimateId}/documents */
export const getEstimateLinkedDocuments = async (
  estimateId: string
): Promise<EstimateLinkedDocument[]> => {
  const response = await http.get(`/management/estimate/${estimateId}/documents`)
  const data = (response as any)?.data ?? response
  const list = Array.isArray(data) ? data : []
  return list as EstimateLinkedDocument[]
}

/** 將公文關聯到估驗紀錄。POST /estimate/{estimateId}/documents */
export const linkEstimateDocument = async (
  estimateId: string,
  documentId: number,
  sequence: number
): Promise<any> => {
  return await http.post(`/management/estimate/${estimateId}/documents`, {
    documentId,
    sequence
  })
}

/** 取消公文與估驗紀錄的關聯。DELETE /estimate/{estimateId}/documents/{referenceId} */
export const unlinkEstimateDocument = async (
  estimateId: string,
  referenceId: number
): Promise<any> => {
  return await http.delete(`/management/estimate/${estimateId}/documents/${referenceId}`)
}

// ===========================
// PDF 附件（與 A-4 設計一致）
// ===========================

export interface EstimateAttachment {
  id: number
  estimateId: string
  fileName: string
  fileSize: number
  contentType: string
  createdAt?: string
}

export const uploadEstimateAttachment = async (
  estimateId: string,
  file: File
): Promise<EstimateAttachment> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await http.post(
    `/management/estimate/${estimateId}/attachments`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return response as unknown as EstimateAttachment
}

export const getEstimateAttachments = async (
  estimateId: string
): Promise<EstimateAttachment[]> => {
  const response = await http.get(`/management/estimate/${estimateId}/attachments`)
  const data = (response as any)?.data ?? response
  return Array.isArray(data) ? data : []
}

export const deleteEstimateAttachment = async (
  estimateId: string,
  attachmentId: number
): Promise<void> => {
  await http.delete(`/management/estimate/${estimateId}/attachments/${attachmentId}`)
}

export const previewEstimateAttachment = async (
  estimateId: string,
  attachmentId: number
): Promise<{ url: string; fileName: string }> => {
  const response = await http.get(
    `/management/estimate/${estimateId}/attachments/${attachmentId}/preview`
  )
  const data = (response as any)?.data ?? response
  return data as { url: string; fileName: string }
}

export const downloadEstimateAttachment = async (
  estimateId: string,
  attachmentId: number,
  fileName: string
): Promise<void> => {
  const response = await http.get(
    `/management/estimate/${estimateId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' }
  ) as unknown as Blob
  const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const downloadAllEstimateAttachments = async (
  estimateId: string
): Promise<void> => {
  const response = await http.get(
    `/management/estimate/${estimateId}/attachments/download-all`,
    { responseType: 'blob' }
  ) as unknown as Blob
  const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/zip' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `估驗附件_${estimateId}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
