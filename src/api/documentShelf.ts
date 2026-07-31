import http from './http'

export type DocumentShelfType = 'A1' | 'A2' | 'A6' | 'DYNAMIC'

/** 與 A-5 估驗 ownerType 一致，A-6 書架分離監造／營造資料 */
export type DocumentShelfOwnerType = 'SUPERVISORY' | 'SUPERVISION_COMPANY' | 'CONTRACTOR'

export interface DocumentShelfRecord {
  id: number
  constructionId: string
  shelfType: string
  ownerType?: string
  classificationKey?: string | null
  sortOrder: number
  createdAt?: string | null
}

export interface DocumentShelfAttachment {
  id: number
  recordId: number
  fileName: string
  objectName: string
  fileSize: number
  contentType: string
  createdAt?: string | null
}

export interface DocumentShelfLinkedDocument {
  referenceId: number
  documentId: number
  sourceType: string
  displayTitle: string
  targetRole: string
  targetName: string
}

const shelfTypeParam = (shelfType: DocumentShelfType, classificationKey?: string) => ({
  shelfType,
  ...(classificationKey ? { classificationKey } : {})
})

const withOwnerType = (ownerType?: DocumentShelfOwnerType) =>
  ownerType ? { ownerType } : {}

export const documentShelfApi = {
  listRecords: async (
    constructionId: string,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType,
    classificationKey?: string
  ): Promise<DocumentShelfRecord[]> => {
    const response = await http.get('/management/document-shelf/records', {
      params: { constructionId, ...shelfTypeParam(shelfType, classificationKey), ...withOwnerType(ownerType) }
    })
    const data = (response as any)?.data ?? response
    return Array.isArray(data) ? data : []
  },

  createRecord: async (
    constructionId: string,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType,
    classificationKey?: string
  ): Promise<DocumentShelfRecord> => {
    const response = await http.post(
      '/management/document-shelf/records',
      { constructionId },
      { params: { ...shelfTypeParam(shelfType, classificationKey), ...withOwnerType(ownerType) } }
    )
    const data = (response as any)?.data ?? response
    return data as DocumentShelfRecord
  },

  deleteRecord: async (
    recordId: number,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<void> => {
    await http.delete(`/management/document-shelf/records/${recordId}`, {
      params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) }
    })
  },

  getLinkedDocuments: async (
    recordId: number,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<DocumentShelfLinkedDocument[]> => {
    const response = await http.get(`/management/document-shelf/records/${recordId}/documents`, {
      params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) }
    })
    const data = (response as any)?.data ?? response
    return Array.isArray(data) ? data : []
  },

  linkDocument: async (
    recordId: number,
    documentId: number,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<void> => {
    await http.post(
      `/management/document-shelf/records/${recordId}/documents`,
      { documentId },
      { params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) } }
    )
  },

  unlinkDocument: async (
    recordId: number,
    referenceId: number,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<void> => {
    await http.delete(`/management/document-shelf/records/${recordId}/documents/${referenceId}`, {
      params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) }
    })
  },

  listAttachments: async (
    recordId: number,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<DocumentShelfAttachment[]> => {
    const response = await http.get(`/management/document-shelf/records/${recordId}/attachments`, {
      params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) }
    })
    const data = (response as any)?.data ?? response
    return Array.isArray(data) ? data : []
  },

  uploadAttachment: async (
    recordId: number,
    file: File,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<DocumentShelfAttachment> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await http.post(
      `/management/document-shelf/records/${recordId}/attachments`,
      formData,
      { params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) }, headers: { 'Content-Type': 'multipart/form-data' } }
    )
    const data = (response as any)?.data ?? response
    return data as DocumentShelfAttachment
  },

  deleteAttachment: async (
    recordId: number,
    attachmentId: number,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<void> => {
    await http.delete(`/management/document-shelf/records/${recordId}/attachments/${attachmentId}`, {
      params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) }
    })
  },

  previewAttachment: async (
    recordId: number,
    attachmentId: number,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<{ url: string; fileName: string }> => {
    const response = await http.get(
      `/management/document-shelf/records/${recordId}/attachments/${attachmentId}/preview`,
      { params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) } }
    )
    const data = (response as any)?.data ?? response
    return data as { url: string; fileName: string }
  },

  downloadAttachment: async (
    recordId: number,
    attachmentId: number,
    fileName: string,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<void> => {
    const response = await http.get(
      `/management/document-shelf/records/${recordId}/attachments/${attachmentId}/download`,
      { params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) }, responseType: 'blob' }
    ) as unknown as Blob
    const blob = response instanceof Blob ? response : new Blob([response])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  downloadAll: async (
    recordId: number,
    shelfType: DocumentShelfType,
    ownerType?: DocumentShelfOwnerType
  ): Promise<void> => {
    const response = await http.get(
      `/management/document-shelf/records/${recordId}/attachments/download-all`,
      { params: { ...shelfTypeParam(shelfType), ...withOwnerType(ownerType) }, responseType: 'blob' }
    ) as unknown as Blob
    const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/zip' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `書架_${recordId}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
}
