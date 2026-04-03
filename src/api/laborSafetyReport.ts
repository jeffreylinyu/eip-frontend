import http from './http'

export type LaborSafetyReportSource = 'SUPERVISORY' | 'CONTRACTOR'

export interface LaborSafetyReportItem {
  id: number
  constructionId: string
  status: string
  /** 使用資料版本（變更設計版本）；null 代表原契約 */
  designChangeId?: number | null
  /** 資料依據日（YYYY-MM-DD）；O-4 多版本時由使用者選擇，用於決定版本與在職人員 */
  dataReferenceDate?: string | null
  organizationName?: string | null
  totalMaleWorkers?: number | null
  totalFemaleWorkers?: number | null
  contractorMaleWorkers?: number | null
  contractorFemaleWorkers?: number | null
  safetyUnitLevel?: string | null
  performanceRecognized?: boolean | null
  businessUnitCode?: string | null
  industryStandardCode?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface LaborSafetyReportLinkedDocument {
  referenceId: number
  documentId: number
  sourceType: string
  displayTitle: string
  targetRole: string
  targetName: string
}

export const getLaborSafetyReportList = async (
  constructionId: string,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<LaborSafetyReportItem[]> => {
  const response = await http.get('/management/labor-safety-report/list', {
    params: { constructionId, source }
  })
  const data = (response as any)?.data ?? response
  return Array.isArray(data) ? data : []
}

export const createLaborSafetyReport = async (
  constructionId: string,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<LaborSafetyReportItem> => {
  const response = await http.post(
    '/management/labor-safety-report/create',
    { constructionId },
    { params: { source } }
  )
  const data = (response as any)?.data ?? response
  return data as LaborSafetyReportItem
}

export const linkLaborSafetyReportDocument = async (
  reportId: number,
  documentId: number,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.post(
    `/management/labor-safety-report/${reportId}/documents`,
    { documentId },
    { params: { source } }
  )
}

export const getLaborSafetyReportLinkedDocuments = async (
  reportId: number,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<LaborSafetyReportLinkedDocument[]> => {
  const response = await http.get(`/management/labor-safety-report/${reportId}/documents`, {
    params: { source }
  })
  const data = (response as any)?.data ?? response
  return Array.isArray(data) ? data : []
}

export const unlinkLaborSafetyReportDocument = async (
  reportId: number,
  referenceId: number
): Promise<void> => {
  await http.delete(`/management/labor-safety-report/${reportId}/documents/${referenceId}`)
}

export const deleteLaborSafetyReport = async (
  reportId: number,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.delete(`/management/labor-safety-report/${reportId}`, {
    params: { source }
  })
}

export const updateLaborSafetyReportStatus = async (
  reportId: number,
  status: string,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.patch(
    `/management/labor-safety-report/${reportId}/status`,
    { status },
    { params: { source } }
  )
}

export interface LaborSafetyReportUpdatePayload {
  designChangeId?: number | null
  dataReferenceDate?: string | null
  organizationName?: string | null
  totalMaleWorkers?: number | null
  totalFemaleWorkers?: number | null
  contractorMaleWorkers?: number | null
  contractorFemaleWorkers?: number | null
  safetyUnitLevel?: string | null
  performanceRecognized?: boolean | null
  businessUnitCode?: string | null
  industryStandardCode?: string | null
}

export const updateLaborSafetyReportFields = async (
  reportId: number,
  payload: LaborSafetyReportUpdatePayload,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<LaborSafetyReportItem> => {
  const response = await http.patch(
    `/management/labor-safety-report/${reportId}`,
    payload,
    { params: { source } }
  )
  const data = (response as any)?.data ?? response
  return data as LaborSafetyReportItem
}

// ── 附件（與 A-4 展延附件一致） ──

export interface LaborSafetyReportAttachment {
  id: number
  reportId: number
  fileName: string
  fileSize: number
  contentType: string
  createdAt?: string
}

/** 工程案勞安證照檔案（O-4 相關文件用） */
export interface LaborLicenseFileInfo {
  memberId: string
  fullName?: string | null
  licenseNumber?: string | null
  occupationCategory?: string | null
}

/** O-4 勞安配置提示用：工程案勞安人員 */
export interface LaborSafetyMemberInfo {
  memberId: string
  fullName?: string | null
  occupationCategory?: string | null
}

export const getLaborSafetyMembers = async (
  constructionId: string,
  source: LaborSafetyReportSource = 'CONTRACTOR'
): Promise<LaborSafetyMemberInfo[]> => {
  const response = await http.get('/management/labor-safety-report/labor-safety-members', {
    params: { constructionId, source }
  })
  const data = (response as any)?.data ?? response
  return Array.isArray(data) ? data : []
}

export const getLaborSafetyReportLaborLicenseFiles = async (
  reportId: number,
  source: LaborSafetyReportSource = 'CONTRACTOR'
): Promise<LaborLicenseFileInfo[]> => {
  const response = await http.get(`/management/labor-safety-report/${reportId}/labor-license-files`, {
    params: { source }
  })
  const data = (response as any)?.data ?? response
  return Array.isArray(data) ? data : []
}

export const uploadLaborSafetyReportAttachment = async (
  reportId: number,
  file: File,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<LaborSafetyReportAttachment> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await http.post(
    `/management/labor-safety-report/${reportId}/attachments`,
    formData,
    { params: { source }, headers: { 'Content-Type': 'multipart/form-data' } }
  )
  const data = (response as any)?.data ?? response
  return data as LaborSafetyReportAttachment
}

export const getLaborSafetyReportAttachments = async (
  reportId: number,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<LaborSafetyReportAttachment[]> => {
  const response = await http.get(`/management/labor-safety-report/${reportId}/attachments`, {
    params: { source }
  })
  const data = (response as any)?.data ?? response
  return Array.isArray(data) ? data : []
}

export const deleteLaborSafetyReportAttachment = async (
  reportId: number,
  attachmentId: number,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.delete(`/management/labor-safety-report/${reportId}/attachments/${attachmentId}`, {
    params: { source }
  })
}

export const previewLaborSafetyReportAttachment = async (
  reportId: number,
  attachmentId: number,
  source: LaborSafetyReportSource = 'SUPERVISORY'
): Promise<{ url: string; fileName: string }> => {
  const response = await http.get(
    `/management/labor-safety-report/${reportId}/attachments/${attachmentId}/preview`,
    { params: { source } }
  )
  const data = (response as any)?.data ?? response
  return data as { url: string; fileName: string }
}

export const downloadLaborSafetyReportAttachment = async (
  reportId: number,
  attachmentId: number,
  fileName: string,
  source: LaborSafetyReportSource = 'SUPERVISORY',
  options?: { signal?: AbortSignal }
): Promise<void> => {
  const response = await http.get(
    `/management/labor-safety-report/${reportId}/attachments/${attachmentId}/download`,
    { params: { source }, responseType: 'blob', signal: options?.signal }
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

export const downloadAllLaborSafetyReportAttachments = async (
  reportId: number,
  source: LaborSafetyReportSource = 'SUPERVISORY',
  options?: { signal?: AbortSignal }
): Promise<void> => {
  const response = await http.get(
    `/management/labor-safety-report/${reportId}/attachments/download-all`,
    { params: { source }, responseType: 'blob', signal: options?.signal }
  ) as unknown as Blob
  const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/zip' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `職安報備附件_${reportId}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * O-4 匯出職安報備書 Word（labourSetting.docx）
 */
export const exportLaborSafetyReportWord = async (
  reportId: number,
  constructionId: string,
  source: LaborSafetyReportSource = 'CONTRACTOR',
  options?: { signal?: AbortSignal }
): Promise<Blob> => {
  const response = await http.get(
    `/management/labor-safety-report/${reportId}/export`,
    { params: { constructionId, source }, responseType: 'blob', signal: options?.signal }
  ) as unknown as Blob
  return response instanceof Blob ? response : new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

