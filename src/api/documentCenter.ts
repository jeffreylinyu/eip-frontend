import http from '@/api/http'

export interface DocumentUsage {
  referenceId: number
  sourceType: string
  displayTitle: string
  routePath: string
}

/** 公文類別選項（與後端 document_category 對應） */
export const DOCUMENT_CATEGORY_OPTIONS = [
  { value: 'RECEIVE_OWNER', label: '[收文] 業主來文' },
  { value: 'RECEIVE_CONTRACTOR', label: '[收文] 廠商來文' },
  { value: 'RECEIVE_OTHER', label: '[收文] 其他單位來文' },
  { value: 'SEND', label: '[發文]' }
] as const

export type DocumentCategoryValue = typeof DOCUMENT_CATEGORY_OPTIONS[number]['value']

export interface DocumentCenterListItem {
  id: number
  fileName: string
  fileType: string
  fileExt: string
  fileSize: string
  fileUrl: string
  uploadedAt: string
  uploader: string
  uploaderId?: string
  sender: string
  recipient: string
  subject: string
  issueDate: string
  documentNumber: string
  originalCopy: string
  carbonCopy: string
  documentCategory: string
  usages: DocumentUsage[]
}

export interface OfficialDocumentExtractDto {
  sender: string
  recipient: string
  subject: string
  issueDate: string
  documentNumber: string
  originalCopy: string
  carbonCopy: string
  documentCategory?: string
}

export interface ImportExtractResponse {
  rawText: string
  extracted: OfficialDocumentExtractDto
}

/** 取得該工程案公文列表 */
export async function getDocumentCenterList(
  constructionId: string
): Promise<DocumentCenterListItem[]> {
  const data = await http.get<DocumentCenterListItem[] | { code: number; data?: DocumentCenterListItem[] }>(
    `/management/constructions/${encodeURIComponent(constructionId)}/document-center`
  )
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: DocumentCenterListItem[] }).data)) {
    return (data as { data: DocumentCenterListItem[] }).data
  }
  return []
}

/** 匯入辨識：上傳 PDF/圖片，回傳 OCR 原始文字與擷取欄位 */
export async function importExtract(
  constructionId: string,
  file: File
): Promise<ImportExtractResponse | null> {
  const formData = new FormData()
  formData.append('file', file)
  const data = await http.post<ImportExtractResponse | { code: number; message: string; data?: ImportExtractResponse }>(
    `/management/constructions/${encodeURIComponent(constructionId)}/document-center/import`,
    formData
  )
  if (data && typeof data === 'object' && 'rawText' in data && 'extracted' in data) {
    return data as ImportExtractResponse
  }
  if (data && typeof data === 'object' && 'data' in data && (data as { data?: ImportExtractResponse }).data) {
    return (data as { data: ImportExtractResponse }).data
  }
  return null
}

/** 使用者確認後儲存：上傳檔案並寫入公文欄位 */
export async function saveDocument(
  constructionId: string,
  file: File,
  fields: OfficialDocumentExtractDto
): Promise<{ id: number; fileName: string; uploadedAt: string } | null> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('sender', fields.sender ?? '')
  formData.append('recipient', fields.recipient ?? '')
  formData.append('subject', fields.subject ?? '')
  formData.append('issueDate', fields.issueDate ?? '')
  formData.append('documentNumber', fields.documentNumber ?? '')
  formData.append('originalCopy', fields.originalCopy ?? '')
  formData.append('carbonCopy', fields.carbonCopy ?? '')
  formData.append('documentCategory', fields.documentCategory ?? '')
  const data = await http.post<{ id: number; fileName: string; uploadedAt: string } | { code: number; data?: { id: number; fileName: string; uploadedAt: string } }>(
    `/management/constructions/${encodeURIComponent(constructionId)}/document-center`,
    formData
  )
  if (data && typeof data === 'object' && 'id' in data) {
    return data as unknown as { id: number; fileName: string; uploadedAt: string }
  }
  if (data && typeof data === 'object' && 'data' in data && (data as { data?: { id: number } }).data) {
    return (data as { data: { id: number; fileName: string; uploadedAt: string } }).data
  }
  return null
}

/** 更新公文欄位（不重新上傳檔案） */
export async function updateDocument(
  constructionId: string,
  documentId: number,
  fields: OfficialDocumentExtractDto
): Promise<OfficialDocumentExtractDto | null> {
  const data = await http.put<OfficialDocumentExtractDto | { code: number; data?: OfficialDocumentExtractDto }>(
    `/management/constructions/${encodeURIComponent(constructionId)}/document-center/${documentId}`,
    fields
  )
  if (data && typeof data === 'object' && 'sender' in data) {
    return data as unknown as OfficialDocumentExtractDto
  }
  if (data && typeof data === 'object' && 'data' in data && (data as { data?: OfficialDocumentExtractDto }).data) {
    return (data as { data: OfficialDocumentExtractDto }).data
  }
  return null
}

/** 刪除公文（含 Cloudinary 檔案及所有關聯） */
export async function deleteDocument(
  constructionId: string,
  documentId: number
): Promise<boolean> {
  const data = await http.delete<{ deleted?: boolean } | { code: number; data?: { deleted?: boolean } }>(
    `/management/constructions/${encodeURIComponent(constructionId)}/document-center/${documentId}`
  )
  if (data && typeof data === 'object' && 'deleted' in data) {
    return (data as { deleted?: boolean }).deleted === true
  }
  if (data && typeof data === 'object' && 'data' in data && (data as { data?: { deleted?: boolean } }).data) {
    return (data as { data: { deleted: boolean } }).data.deleted === true
  }
  return false
}
