import http from './http'
import { downloadBlob, extractFileNameFromResponse } from '@/utils/blobDownload'
import { downloadBlobAsFile } from '@/api/forms'

export type SelfCheckOwnerType = 'SUPERVISORY' | 'CONTRACTOR'

export type SelfCheckStandardKind = 'CONSTRUCTION' | 'SAFETY'

export type SelfCheckInspectionTiming = 'INSPECTION_STOP' | 'SAFETY_INSPECTION' | 'IRREGULAR'

export type SelfCheckConstructionProcess = 'BEFORE' | 'DURING' | 'AFTER'

export interface SelfCheckInspectionRecordItem {
  id: number
  sortOrder: number
  sourceStandardId?: number | null
  workProcess?: string | null
  workProcessDetail?: string | null
  manageProject?: string | null
  checkPoint?: string | null
  checkStandard?: string | null
  actualSituation?: string | null
  inspectionResult?: string | null
  itemRemark?: string | null
  exportEnabled?: boolean
}

export interface SelfCheckInspectionRecord {
  id: number
  constructionId: string
  designChangeId: number | null
  documentClassificationId: number
  standardKind: SelfCheckStandardKind
  inspectionDate: string
  title?: string | null
  subdivisionProjectName?: string | null
  inspectionLocation?: string | null
  inspectionTimings?: SelfCheckInspectionTiming[]
  constructionProcesses?: SelfCheckConstructionProcess[]
  remark?: string | null
  inspectorName?: string | null
  inspectorSignature?: string | null
  reviewerName?: string | null
  reviewerSignature?: string | null
  itemCount: number
  items?: SelfCheckInspectionRecordItem[] | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface SelfCheckInspectionRecordCreateRequest {
  documentClassificationId: number
  standardKind: SelfCheckStandardKind
  inspectionDate?: string | null
  title?: string | null
}

export interface SelfCheckInspectionRecordUpdateRequest {
  inspectionDate: string | null
  subdivisionProjectName?: string | null
  inspectionLocation?: string | null
  inspectionTimings?: SelfCheckInspectionTiming[]
  constructionProcesses?: SelfCheckConstructionProcess[]
  items: Array<{
    id: number
    actualSituation?: string | null
    inspectionResult?: string | null
    itemRemark?: string | null
    exportEnabled?: boolean
  }>
}

export type SelfCheckSignRole = 'INSPECTOR' | 'REVIEWER'

export interface SelfCheckInspectionSignRequest {
  bindingId: number
  signRole: SelfCheckSignRole
  signatureImage: string
}

export interface SelfCheckInspectionRecordPhoto {
  id: number
  recordId: number
  recordItemId: number | null
  recordItemLabel?: string | null
  photoDate?: string | null
  photoLocation?: string | null
  description?: string | null
  fileName: string
  contentType?: string | null
  fileSize?: number | null
  sortOrder: number
  signedUrl?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface SelfCheckInspectionPhotoMetadata {
  recordItemId: number
  photoDate?: string | null
  photoLocation?: string | null
  description?: string | null
}

export interface SelfCheckInspectionPhotoUpdateBody {
  recordItemId: number
  photoDate?: string | null
  photoLocation?: string | null
  description?: string | null
}

function ownerParams(ownerType: SelfCheckOwnerType, constructionId: string) {
  return { constructionId, ownerType }
}

function unwrap<T>(response: unknown): T {
  const r = response as { data?: T }
  return (r?.data ?? response) as T
}

export const selfCheckInspectionApi = {
  async list(
    constructionId: string,
    documentClassificationId: number,
    ownerType: SelfCheckOwnerType,
    standardKind: SelfCheckStandardKind
  ): Promise<SelfCheckInspectionRecord[]> {
    const res = await http.get('/management/self-check-inspections', {
      params: {
        ...ownerParams(ownerType, constructionId),
        documentClassificationId: String(documentClassificationId),
        standardKind
      }
    })
    return unwrap<SelfCheckInspectionRecord[]>(res) ?? []
  },

  async listAll(
    constructionId: string,
    ownerType: SelfCheckOwnerType,
    standardKind: SelfCheckStandardKind
  ): Promise<SelfCheckInspectionRecord[]> {
    const res = await http.get('/management/self-check-inspections/all', {
      params: {
        ...ownerParams(ownerType, constructionId),
        standardKind
      }
    })
    return unwrap<SelfCheckInspectionRecord[]>(res) ?? []
  },

  async get(
    constructionId: string,
    recordId: number,
    ownerType: SelfCheckOwnerType
  ): Promise<SelfCheckInspectionRecord> {
    const res = await http.get(`/management/self-check-inspections/${recordId}`, {
      params: ownerParams(ownerType, constructionId)
    })
    return unwrap<SelfCheckInspectionRecord>(res)
  },

  async create(
    constructionId: string,
    ownerType: SelfCheckOwnerType,
    body: SelfCheckInspectionRecordCreateRequest
  ): Promise<SelfCheckInspectionRecord> {
    const res = await http.post('/management/self-check-inspections', body, {
      params: ownerParams(ownerType, constructionId)
    })
    return unwrap<SelfCheckInspectionRecord>(res)
  },

  async update(
    constructionId: string,
    recordId: number,
    ownerType: SelfCheckOwnerType,
    body: SelfCheckInspectionRecordUpdateRequest
  ): Promise<SelfCheckInspectionRecord> {
    const res = await http.put(`/management/self-check-inspections/${recordId}`, body, {
      params: ownerParams(ownerType, constructionId)
    })
    return unwrap<SelfCheckInspectionRecord>(res)
  },

  /** 以明確選擇的 bindingId 簽署（檢查人 / 複核人） */
  async sign(
    constructionId: string,
    recordId: number,
    ownerType: SelfCheckOwnerType,
    body: SelfCheckInspectionSignRequest
  ): Promise<SelfCheckInspectionRecord> {
    const res = await http.post(`/management/self-check-inspections/${recordId}/sign`, body, {
      params: ownerParams(ownerType, constructionId)
    })
    return unwrap<SelfCheckInspectionRecord>(res)
  },

  async delete(constructionId: string, recordId: number, ownerType: SelfCheckOwnerType): Promise<void> {
    await http.delete(`/management/self-check-inspections/${recordId}`, {
      params: ownerParams(ownerType, constructionId)
    })
  },

  async export(constructionId: string, recordId: number, ownerType: SelfCheckOwnerType): Promise<void> {
    const response = await downloadBlob({
      url: `/management/self-check-inspections/${recordId}/export`,
      method: 'POST',
      params: { constructionId, ownerType }
    })
    const fileName =
      extractFileNameFromResponse(response) ??
      `SelfCheckInspection_${recordId}.docx`
    downloadBlobAsFile(response.data, decodeURIComponent(fileName))
  },

  async listPhotos(
    constructionId: string,
    recordId: number,
    ownerType: SelfCheckOwnerType
  ): Promise<SelfCheckInspectionRecordPhoto[]> {
    const res = await http.get(`/management/self-check-inspections/${recordId}/photos`, {
      params: ownerParams(ownerType, constructionId)
    })
    return unwrap<SelfCheckInspectionRecordPhoto[]>(res) ?? []
  },

  async uploadPhotos(
    constructionId: string,
    recordId: number,
    ownerType: SelfCheckOwnerType,
    files: File[],
    metadata: SelfCheckInspectionPhotoMetadata[]
  ): Promise<SelfCheckInspectionRecordPhoto[]> {
    const form = new FormData()
    files.forEach((file) => form.append('files', file))
    form.append('metadata', JSON.stringify(metadata))
    const res = await http.post(`/management/self-check-inspections/${recordId}/photos`, form, {
      params: ownerParams(ownerType, constructionId),
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return unwrap<SelfCheckInspectionRecordPhoto[]>(res) ?? []
  },

  async updatePhoto(
    constructionId: string,
    recordId: number,
    photoId: number,
    ownerType: SelfCheckOwnerType,
    body: SelfCheckInspectionPhotoUpdateBody
  ): Promise<SelfCheckInspectionRecordPhoto> {
    const res = await http.put(`/management/self-check-inspections/${recordId}/photos/${photoId}`, body, {
      params: ownerParams(ownerType, constructionId)
    })
    return unwrap<SelfCheckInspectionRecordPhoto>(res)
  },

  async reorderPhotos(
    constructionId: string,
    recordId: number,
    ownerType: SelfCheckOwnerType,
    photoIds: number[]
  ): Promise<SelfCheckInspectionRecordPhoto[]> {
    const res = await http.put(`/management/self-check-inspections/${recordId}/photos/reorder`, { photoIds }, {
      params: ownerParams(ownerType, constructionId)
    })
    return unwrap<SelfCheckInspectionRecordPhoto[]>(res) ?? []
  },

  async deletePhoto(
    constructionId: string,
    recordId: number,
    photoId: number,
    ownerType: SelfCheckOwnerType
  ): Promise<void> {
    await http.delete(`/management/self-check-inspections/${recordId}/photos/${photoId}`, {
      params: ownerParams(ownerType, constructionId)
    })
  },

  async downloadPhotoBlob(
    constructionId: string,
    recordId: number,
    photoId: number,
    ownerType: SelfCheckOwnerType
  ): Promise<Blob> {
    const raw = await http.get(
      `/management/self-check-inspections/${recordId}/photos/${photoId}/download`,
      {
        params: ownerParams(ownerType, constructionId),
        responseType: 'blob'
      }
    )
    const blob = raw as unknown as Blob
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('無法載入照片')
    }
    return blob
  }
}
