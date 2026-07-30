import type { AxiosRequestConfig } from 'axios'
import http from './http'

export interface DocumentClassification {
  id: number
  constructionId: string
  designChangeId: number | null
  category: string // 'A' | 'B' | 'C' | 'D' | 'H' | 'I' | 'L'
  categoryDisplayName: string
  itemNumber: string
  fixedFormCode?: string | null
  documentName: string
  retentionYears: number | null
  /** B 類（監造）／P 類（營造複製後）：規定提送日程 */
  requiredSubmissionSchedule?: string | null
  /** 僅營造端 P 類使用：是否套用到側邊欄 */
  applyToSidebar?: boolean
  isDefault: boolean
  isLocked: boolean
  constructionMajorItemId?: string | null
  /** E 類（營造）專用：關聯分項工程 id */
  subdivisionWorkItemId?: number | null
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

function versionParams(designChangeId: number | null | undefined): Record<string, string> {
  const p: Record<string, string> = {}
  if (designChangeId != null && designChangeId !== undefined) {
    p.designChangeId = String(designChangeId)
  }
  return p
}

export interface CreateDocumentClassificationRequest {
  category: string
  documentName: string
  retentionYears?: number
  requiredSubmissionSchedule?: string
}

export interface UpdateDocumentClassificationRequest {
  documentName?: string
  retentionYears?: number
  itemNumber?: string
  requiredSubmissionSchedule?: string
}

export interface BatchUpdateItem {
  id: number
  itemNumber?: string
  documentName?: string
  retentionYears?: number | null
  requiredSubmissionSchedule?: string
}

export interface BatchUpdateDocumentClassificationRequest {
  items: BatchUpdateItem[]
}

export const documentClassificationApi = {
  async getAll(
    constructionId: string,
    designChangeId: number | null | undefined,
    config?: { skipAuthRedirectOn401?: boolean }
  ): Promise<DocumentClassification[]> {
    const response: any = await http.get(`/management/constructions/${constructionId}/document-classification`, {
      ...(config ?? {}) as AxiosRequestConfig,
      params: { ...versionParams(designChangeId), ...((config as AxiosRequestConfig)?.params as object) }
    })
    return response.data || response
  },

  async getByCategory(
    constructionId: string,
    category: string,
    designChangeId: number | null | undefined
  ): Promise<DocumentClassification[]> {
    const response: any = await http.get(
      `/management/constructions/${constructionId}/document-classification/${category}`,
      { params: versionParams(designChangeId) }
    )
    return response.data || response
  },

  async create(
    constructionId: string,
    designChangeId: number | null | undefined,
    data: CreateDocumentClassificationRequest
  ): Promise<DocumentClassification> {
    const response: any = await http.post(
      `/management/constructions/${constructionId}/document-classification`,
      data,
      { params: versionParams(designChangeId) }
    )
    return response.data || response
  },

  async update(
    constructionId: string,
    id: number,
    designChangeId: number | null | undefined,
    data: UpdateDocumentClassificationRequest
  ): Promise<DocumentClassification> {
    const response: any = await http.put(
      `/management/constructions/${constructionId}/document-classification/${id}`,
      data,
      { params: versionParams(designChangeId) }
    )
    return response.data || response
  },

  async batchUpdate(
    constructionId: string,
    designChangeId: number | null | undefined,
    data: BatchUpdateDocumentClassificationRequest
  ): Promise<DocumentClassification[]> {
    const response: any = await http.put(
      `/management/constructions/${constructionId}/document-classification/batch`,
      data,
      { params: versionParams(designChangeId) }
    )
    return response.data || response
  },

  async delete(constructionId: string, id: number, designChangeId: number | null | undefined): Promise<void> {
    await http.delete(`/management/constructions/${constructionId}/document-classification/${id}`, {
      params: versionParams(designChangeId)
    })
  },

  async syncCategoryD(
    constructionId: string,
    designChangeId: number | null | undefined
  ): Promise<DocumentClassification[]> {
    const response: any = await http.post(
      `/management/constructions/${constructionId}/document-classification/sync-category-d`,
      null,
      { params: versionParams(designChangeId) }
    )
    return response.data || response
  },

  async resetAll(
    constructionId: string,
    designChangeId: number | null | undefined
  ): Promise<DocumentClassification[]> {
    const response: any = await http.post(
      `/management/constructions/${constructionId}/document-classification/reset`,
      null,
      { params: versionParams(designChangeId) }
    )
    return response.data || response
  },

  async copyFromPrevious(constructionId: string, targetDesignChangeId: number): Promise<{ copied: boolean }> {
    const response: any = await http.post(
      `/management/constructions/${constructionId}/document-classification/copy-from-previous`,
      null,
      { params: { targetDesignChangeId: String(targetDesignChangeId) } }
    )
    return response.data || response
  }
}
