import type { AxiosRequestConfig } from 'axios'
import http from './http'

export interface SupervisoryBNonDefaultRow {
  itemNumber: string
  documentName: string
  retentionYears: number | null
  requiredSubmissionSchedule: string | null
}

export interface ContractorDocumentClassification {
  id: number
  constructionId: string
  designChangeId: number | null
  category: string
  categoryDisplayName: string
  itemNumber: string
  documentName: string
  retentionYears: number | null
  requiredSubmissionSchedule?: string | null
  isDefault: boolean
  isLocked: boolean
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

export interface CreateContractorDocumentClassificationRequest {
  category: string
  documentName: string
  retentionYears?: number | null
  requiredSubmissionSchedule?: string | null
}

export interface UpdateContractorDocumentClassificationRequest {
  documentName?: string
  retentionYears?: number | null
  itemNumber?: string
  retentionPermanent?: boolean
  requiredSubmissionSchedule?: string | null
}

export interface ContractorBatchUpdateItem {
  id: number
  itemNumber?: string
  documentName?: string
  retentionYears?: number | null
  retentionPermanent?: boolean
  requiredSubmissionSchedule?: string | null
}

export const contractorDocumentClassificationApi = {
  async getAll(
    constructionId: string,
    designChangeId: number | null | undefined,
    config?: AxiosRequestConfig
  ): Promise<ContractorDocumentClassification[]> {
    const res: any = await http.get(`/management/constructions/${constructionId}/contractor-document-classification`, {
      ...config,
      params: { ...versionParams(designChangeId), ...config?.params }
    })
    return res.data ?? res
  },

  async create(
    constructionId: string,
    designChangeId: number | null | undefined,
    data: CreateContractorDocumentClassificationRequest
  ): Promise<ContractorDocumentClassification> {
    const res: any = await http.post(
      `/management/constructions/${constructionId}/contractor-document-classification`,
      data,
      { params: versionParams(designChangeId) }
    )
    return res.data ?? res
  },

  async update(
    constructionId: string,
    id: number,
    designChangeId: number | null | undefined,
    data: UpdateContractorDocumentClassificationRequest
  ): Promise<ContractorDocumentClassification> {
    const res: any = await http.put(
      `/management/constructions/${constructionId}/contractor-document-classification/${id}`,
      data,
      { params: versionParams(designChangeId) }
    )
    return res.data ?? res
  },

  async batchUpdate(
    constructionId: string,
    designChangeId: number | null | undefined,
    items: ContractorBatchUpdateItem[]
  ): Promise<ContractorDocumentClassification[]> {
    const res: any = await http.put(
      `/management/constructions/${constructionId}/contractor-document-classification/batch`,
      { items },
      { params: versionParams(designChangeId) }
    )
    return res.data ?? res
  },

  async delete(constructionId: string, id: number, designChangeId: number | null | undefined): Promise<void> {
    await http.delete(`/management/constructions/${constructionId}/contractor-document-classification/${id}`, {
      params: versionParams(designChangeId)
    })
  },

  async resetAll(constructionId: string, designChangeId: number | null | undefined): Promise<ContractorDocumentClassification[]> {
    const res: any = await http.post(
      `/management/constructions/${constructionId}/contractor-document-classification/reset`,
      null,
      { params: versionParams(designChangeId) }
    )
    return res.data ?? res
  },

  async importSubdivisionsToE(constructionId: string, designChangeId: number | null | undefined): Promise<void> {
    await http.post(
      `/management/constructions/${constructionId}/contractor-document-classification/import-subdivisions-to-e`,
      null,
      { params: versionParams(designChangeId) }
    )
  },

  async copyFromPrevious(constructionId: string, targetDesignChangeId: number): Promise<{ copied: boolean }> {
    const res: any = await http.post(
      `/management/constructions/${constructionId}/contractor-document-classification/copy-from-previous`,
      null,
      { params: { targetDesignChangeId: String(targetDesignChangeId) } }
    )
    return res.data ?? res
  },

  async getSupervisoryBCustomPreview(
    constructionId: string,
    supervisoryDesignChangeId: number | null | undefined
  ): Promise<SupervisoryBNonDefaultRow[]> {
    const params: Record<string, string> = {}
    if (supervisoryDesignChangeId != null && supervisoryDesignChangeId !== undefined) {
      params.supervisoryDesignChangeId = String(supervisoryDesignChangeId)
    }
    const res: any = await http.get(
      `/management/constructions/${constructionId}/contractor-document-classification/supervisory-b-custom-preview`,
      { params }
    )
    return res.data ?? res
  },

  async copySupervisoryBToContractorP(
    constructionId: string,
    body: {
      supervisoryDesignChangeId: number | null | undefined
      contractorDesignChangeId: number | null | undefined
    }
  ): Promise<ContractorDocumentClassification[]> {
    const res: any = await http.post(
      `/management/constructions/${constructionId}/contractor-document-classification/copy-supervisory-b-to-contractor-p`,
      {
        supervisoryDesignChangeId: body.supervisoryDesignChangeId ?? null,
        contractorDesignChangeId: body.contractorDesignChangeId ?? null
      }
    )
    return res.data ?? res
  }
}
