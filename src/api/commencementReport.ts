import http from './http'

export const REPORT_TYPES = ['COMMENCEMENT', 'COMPLETION', 'SUSPENSION'] as const
export type ReportType = (typeof REPORT_TYPES)[number]

/** 監造(A-3) / 營造(O-1)，對應後端不同資料表 */
export type CommencementReportSource = 'SUPERVISORY' | 'CONTRACTOR'

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  COMMENCEMENT: '開工報告',
  COMPLETION: '竣工報告',
  SUSPENSION: '停工報告'
}

/** 報告類別（用於 Word 模板佔位符 {{reportTypeLabel}}：開工/停工/竣工） */
export const REPORT_TYPE_CATEGORY_LABELS: Record<ReportType, string> = {
  COMMENCEMENT: '開工',
  COMPLETION: '竣工',
  SUSPENSION: '停工'
}

export const REPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '待審核',
  APPROVED: '已核准',
  REJECTED: '退回'
}

export interface CommencementReportItem {
  id: number
  constructionId: string
  reportType: ReportType
  status?: string
  sortOrder?: number
  /** 申報日期 YYYY-MM-DD（開工/竣工/停工） */
  actualReportDate?: string
  createdAt?: string
  updatedAt?: string
}

export interface CommencementReportLinkedDocument {
  referenceId: number
  documentId: number
  sourceType: string
  displayTitle: string
  targetRole: string
  targetName: string
}

export interface CommencementReportAttachment {
  id: number
  reportId: number
  fileName: string
  fileSize: number
  contentType: string
  createdAt?: string
}

/** 取得工程的報告列表，可選 reportType 篩選。source 區分監造/營造資料 */
export const getCommencementReportList = async (
  constructionId: string,
  reportType?: ReportType,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<CommencementReportItem[]> => {
  const response = await http.get('/management/commencement-report/list', {
    params: { constructionId, ...(reportType ? { reportType } : {}), source }
  })
  const data = (response as any)?.data ?? response
  return Array.isArray(data) ? data : []
}

/** 新增一筆該類型的報告 */
export const createCommencementReport = async (
  constructionId: string,
  reportType: ReportType,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<CommencementReportItem> => {
  const response = await http.post(
    '/management/commencement-report/create',
    { constructionId, reportType },
    { params: { source } }
  )
  const data = (response as any)?.data ?? response
  return data as CommencementReportItem
}

/** 刪除一筆報告（含公文關聯與附件） */
export const deleteCommencementReport = async (
  reportId: number,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.delete(`/management/commencement-report/${reportId}`, { params: { source } })
}

/** 拖曳排序 */
export const reorderCommencementReports = async (
  constructionId: string,
  reportType: ReportType,
  reportIds: number[],
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.post(
    '/management/commencement-report/reorder',
    { constructionId, reportType, reportIds },
    { params: { source } }
  )
}

/** 更新報告狀態 */
export const updateCommencementReportStatus = async (
  reportId: number,
  status: string,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.patch(`/management/commencement-report/${reportId}/status`, { status }, { params: { source } })
}

/** 更新申報日期（開工/竣工/停工），YYYY-MM-DD；空字串則清空 */
export const updateCommencementReportActualDate = async (
  reportId: number,
  actualReportDate: string,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.patch(
    `/management/commencement-report/${reportId}/actual-date`,
    { actualReportDate: actualReportDate || null },
    { params: { source } }
  )
}

/** 關聯公文 */
export const linkCommencementReportDocument = async (
  reportId: number,
  documentId: number,
  reportTypeLabel: string,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.post(
    `/management/commencement-report/${reportId}/documents`,
    { documentId, reportTypeLabel },
    { params: { source } }
  )
}

/** 取得報告的關聯公文 */
export const getCommencementReportLinkedDocuments = async (
  reportId: number,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<CommencementReportLinkedDocument[]> => {
  const response = await http.get(`/management/commencement-report/${reportId}/documents`, {
    params: { source }
  })
  const data = (response as any)?.data ?? response
  return Array.isArray(data) ? data : []
}

/** 取消關聯公文 */
export const unlinkCommencementReportDocument = async (
  reportId: number,
  referenceId: number
): Promise<void> => {
  await http.delete(`/management/commencement-report/${reportId}/documents/${referenceId}`)
}

/** 上傳附件 */
export const uploadCommencementReportAttachment = async (
  reportId: number,
  file: File,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<CommencementReportAttachment> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await http.post(
    `/management/commencement-report/${reportId}/attachments`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, params: { source } }
  )
  return response as unknown as CommencementReportAttachment
}

/** 取得報告的附件列表 */
export const getCommencementReportAttachments = async (
  reportId: number,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<CommencementReportAttachment[]> => {
  const response = await http.get(`/management/commencement-report/${reportId}/attachments`, {
    params: { source }
  })
  const data = (response as any)?.data ?? response
  return Array.isArray(data) ? data : []
}

/** 刪除附件 */
export const deleteCommencementReportAttachment = async (
  reportId: number,
  attachmentId: number,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<void> => {
  await http.delete(`/management/commencement-report/${reportId}/attachments/${attachmentId}`, {
    params: { source }
  })
}

/** 預覽附件 */
export const previewCommencementReportAttachment = async (
  reportId: number,
  attachmentId: number,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<{ url: string; fileName: string }> => {
  const response = await http.get(
    `/management/commencement-report/${reportId}/attachments/${attachmentId}/preview`,
    { params: { source } }
  )
  const data = (response as any)?.data ?? response
  return data as { url: string; fileName: string }
}

/** 下載單一附件 */
export const downloadCommencementReportAttachment = async (
  reportId: number,
  attachmentId: number,
  fileName: string,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<void> => {
  const response = await http.get(
    `/management/commencement-report/${reportId}/attachments/${attachmentId}/download`,
    { responseType: 'blob', params: { source } }
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

/** 下載全部附件（ZIP） */
export const downloadAllCommencementReportAttachments = async (
  reportId: number,
  source: CommencementReportSource = 'SUPERVISORY'
): Promise<void> => {
  const response = await http.get(
    `/management/commencement-report/${reportId}/attachments/download-all`,
    { responseType: 'blob', params: { source } }
  ) as unknown as Blob
  const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/zip' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `開竣停工報告附件_${reportId}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
