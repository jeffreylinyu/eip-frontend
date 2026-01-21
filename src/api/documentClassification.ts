import http from './http'

export interface DocumentClassification {
  id: number
  constructionId: string
  category: string // 'A' | 'B' | 'C' | 'D' | 'H' | 'I' | 'L'
  categoryDisplayName: string
  itemNumber: string
  documentName: string
  retentionYears: number
  isDefault: boolean
  isLocked: boolean
  constructionMajorItemId?: string | null
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

export interface CreateDocumentClassificationRequest {
  category: string
  documentName: string
  retentionYears?: number
}

export interface UpdateDocumentClassificationRequest {
  documentName?: string
  retentionYears?: number
  itemNumber?: string
}

export interface BatchUpdateItem {
  id: number
  itemNumber?: string
  documentName?: string
  retentionYears?: number
}

export interface BatchUpdateDocumentClassificationRequest {
  items: BatchUpdateItem[]
}

export const documentClassificationApi = {
  /**
   * 取得某工程案的所有文件分類項目
   */
  async getAll(constructionId: string): Promise<DocumentClassification[]> {
    const response: any = await http.get(`/management/constructions/${constructionId}/document-classification`)
    return response.data || response
  },

  /**
   * 取得某工程案特定大項的所有分類項目
   */
  async getByCategory(constructionId: string, category: string): Promise<DocumentClassification[]> {
    const response: any = await http.get(`/management/constructions/${constructionId}/document-classification/${category}`)
    return response.data || response
  },

  /**
   * 新增自訂項目
   */
  async create(constructionId: string, data: CreateDocumentClassificationRequest): Promise<DocumentClassification> {
    const response: any = await http.post(`/management/constructions/${constructionId}/document-classification`, data)
    return response.data || response
  },

  /**
   * 更新項目
   */
  async update(constructionId: string, id: number, data: UpdateDocumentClassificationRequest): Promise<DocumentClassification> {
    const response: any = await http.put(`/management/constructions/${constructionId}/document-classification/${id}`, data)
    return response.data || response
  },

  /**
   * 批次更新多個項目的順序/內容
   */
  async batchUpdate(constructionId: string, data: BatchUpdateDocumentClassificationRequest): Promise<DocumentClassification[]> {
    const response: any = await http.put(`/management/constructions/${constructionId}/document-classification/batch`, data)
    return response.data || response
  },

  /**
   * 刪除項目
   */
  async delete(constructionId: string, id: number): Promise<void> {
    await http.delete(`/management/constructions/${constructionId}/document-classification/${id}`)
  },

  /**
   * 同步 D 類別 (根據施工大項重新生成)
   */
  async syncCategoryD(constructionId: string): Promise<DocumentClassification[]> {
    const response: any = await http.post(`/management/constructions/${constructionId}/document-classification/sync-category-d`)
    return response.data || response
  },

  /**
   * 恢復預設值 (全域)
   */
  async resetAll(constructionId: string): Promise<DocumentClassification[]> {
    const response: any = await http.post(`/management/constructions/${constructionId}/document-classification/reset`)
    return response.data || response
  }
}
