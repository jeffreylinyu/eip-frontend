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
  applyToSidebar: boolean
  isDefault: boolean
  isLocked: boolean
  /** E 類專用：關聯分項工程 id（同步分項工程時寫入） */
  subdivisionWorkItemId?: number | null
  /** 營造自訂 P 類動態頁：工程規模概述；預設列為 null */
  customPScaleOverview?: string | null
  /** 營造自訂 P 類動態頁：安全衛生執行要點（長文） */
  customPSafetyHealthExecutionPoints?: string | null
  /** 營造自訂 P 類動態頁：環境保護注意事項（長文） */
  customPEnvironmentProtectionNotes?: string | null
  /** 營造自訂 P 類動態頁：人員職掌說明表（JSON） */
  customPPersonnelDutiesJson?: string | null
  /** 營造自訂 P 類動態頁：分項工程組織表（JSON） */
  customPSubdivisionOrganizationJson?: string | null
  /** 營造自訂 P 類動態頁：施工人員組織圖（JSON graph） */
  customPOrganizationChartJson?: string | null
  /** 營造自訂 P 類動態頁：施工方法與步驟（JSON） */
  customPConstructionStagePlanJson?: string | null
  /** 營造自訂 P 類動態頁：施工抽查標準明細（JSON 陣列） */
  customPConstructionInspectionStandardsJson?: string | null
  /** 營造自訂 P 類動態頁：第四章機具與材料兩表（JSON） */
  customPChapter4EquipmentMaterialsJson?: string | null
  /** 營造自訂 P 類動態頁：施工人員組織圖（前端預覽截圖 objectName） */
  customPOrganizationChartImageObjectName?: string | null
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
  applyToSidebar?: boolean
}

export interface UpdateContractorDocumentClassificationRequest {
  documentName?: string
  retentionYears?: number | null
  itemNumber?: string
  retentionPermanent?: boolean
  requiredSubmissionSchedule?: string | null
  applyToSidebar?: boolean
  /** 僅自訂 P 類：動態頁工程規模概述 */
  customPScaleOverview?: string | null
  /** 僅自訂 P 類：安全衛生執行要點（長文） */
  customPSafetyHealthExecutionPoints?: string | null
  /** 僅自訂 P 類：環境保護注意事項（長文） */
  customPEnvironmentProtectionNotes?: string | null
  /** 僅自訂 P 類：動態頁人員職掌說明表（JSON） */
  customPPersonnelDutiesJson?: string | null
  /** 僅自訂 P 類：分項工程組織表（JSON） */
  customPSubdivisionOrganizationJson?: string | null
  /** 僅自訂 P 類：施工人員組織圖（JSON graph） */
  customPOrganizationChartJson?: string | null
  /** 僅自訂 P 類：施工方法與步驟（JSON） */
  customPConstructionStagePlanJson?: string | null
  /** 僅自訂 P 類：施工抽查標準明細（JSON 陣列） */
  customPConstructionInspectionStandardsJson?: string | null
  /** 僅自訂 P 類：第四章機具與材料兩表（JSON） */
  customPChapter4EquipmentMaterialsJson?: string | null
  /** 僅自訂 P 類：施工人員組織圖（前端預覽截圖 objectName） */
  customPOrganizationChartImageObjectName?: string | null
}

export interface ContractorBatchUpdateItem {
  id: number
  itemNumber?: string
  documentName?: string
  retentionYears?: number | null
  retentionPermanent?: boolean
  requiredSubmissionSchedule?: string | null
  applyToSidebar?: boolean
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

  /** 與監造施工項目 B-1 施工流程圖相同演算法（蛇形四欄 PNG）；節點僅為主要工序名稱。 */
  async fetchConstructionStagePlanFlowChartPng(
    constructionId: string,
    id: number,
    designChangeId: number | null | undefined
  ): Promise<Blob> {
    const buf = await http.get<ArrayBuffer>(
      `/management/constructions/${constructionId}/contractor-document-classification/${id}/construction-stage-plan/flow-chart.png`,
      { responseType: 'arraybuffer', params: versionParams(designChangeId) }
    )
    return new Blob([buf as unknown as ArrayBuffer], { type: 'image/png' })
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

  async syncCategoryE(constructionId: string, designChangeId: number | null | undefined): Promise<void> {
    await http.post(
      `/management/constructions/${constructionId}/contractor-document-classification/sync-category-e`,
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
  },

  async uploadOrganizationChartImage(
    constructionId: string,
    id: number,
    designChangeId: number | null | undefined,
    file: Blob
  ): Promise<{ objectName: string; signedUrl?: string | null }> {
    const form = new FormData()
    form.append('file', file, `p-dynamic-org-chart-${constructionId}-${id}.png`)
    const res: any = await http.post(
      `/management/constructions/${constructionId}/contractor-document-classification/${id}/organization-chart-image/upload`,
      form,
      {
        params: versionParams(designChangeId),
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    )
    return res.data ?? res
  }
}
