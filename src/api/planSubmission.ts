import http from '@/api/http'

// ===========================
// 型別定義
// ===========================

export interface DocumentReferenceDto {
  id: number
  documentId: number
  sourceType: string
  sourceId: string
  breadcrumbs: BreadcrumbNodeDto[]
  target: TargetInfoDto
  displayTitle: string
  createdAt: string | null
}

export interface BreadcrumbNodeDto {
  level: string
  label: string
  id?: string
  routePath?: string
}

export interface TargetInfoDto {
  name: string
  role?: string
  status?: string
}

export interface PlanSubmissionRecord {
  id: number
  constructionId: string
  submissionNumber: number
  submissionDate: string | null
  status: string
  reviewDate: string | null
  reviewComment: string | null
  note: string | null
  /** 使用資料版本：null = 原契約，非 null = design_change.id（舊資料可能無此欄位） */
  designChangeId?: number | null
  createdBy: string | null
  createdAt: string | null
  supervisionDocument: DocumentReferenceDto | null
  governmentDocument: DocumentReferenceDto | null
}

// ===========================
// API
// ===========================

function unwrap<T>(data: any): T {
  if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
    return data.data as T
  }
  return data as T
}

/** 可傳給 http 的額外設定（例如 skipAuthRedirectOn401） */
export type PlanSubmissionRequestConfig = { skipAuthRedirectOn401?: boolean }

/** 取得某工程案的所有送審紀錄 */
export async function getPlanSubmissions(constructionId: string, config?: PlanSubmissionRequestConfig): Promise<PlanSubmissionRecord[]> {
  const data = await http.get<any>(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions`,
    config ?? {}
  )
  const result = unwrap<PlanSubmissionRecord[]>(data)
  return Array.isArray(result) ? result : []
}

/** 取得單一送審紀錄 */
export async function getPlanSubmission(constructionId: string, id: number): Promise<PlanSubmissionRecord | null> {
  const data = await http.get<any>(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions/${id}`
  )
  return unwrap<PlanSubmissionRecord>(data) ?? null
}

/** 新增送審紀錄 */
export async function createPlanSubmission(
  constructionId: string,
  body: { submissionDate?: string; note?: string }
): Promise<PlanSubmissionRecord | null> {
  const data = await http.post<any>(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions`,
    body
  )
  return unwrap<PlanSubmissionRecord>(data) ?? null
}

/** 更新送審紀錄 */
export async function updatePlanSubmission(
  constructionId: string,
  id: number,
  body: {
    status?: string
    submissionDate?: string
    reviewDate?: string
    reviewComment?: string
    note?: string
    designChangeId?: number | null
  }
): Promise<PlanSubmissionRecord | null> {
  const data = await http.put<any>(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions/${id}`,
    body
  )
  return unwrap<PlanSubmissionRecord>(data) ?? null
}

/** 僅更新送審紀錄的「使用資料版本」（null = 原契約） */
export async function updatePlanSubmissionDesignChangeId(
  constructionId: string,
  id: number,
  designChangeId: number | null
): Promise<PlanSubmissionRecord | null> {
  const data = await http.patch<any>(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions/${id}/design-change-id`,
    { designChangeId }
  )
  return unwrap<PlanSubmissionRecord>(data) ?? null
}

/** 關聯公文到送審紀錄 */
export async function linkDocument(
  constructionId: string,
  recordId: number,
  body: { documentId: number; role: string; documentName: string }
): Promise<boolean> {
  const data = await http.post<any>(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions/${recordId}/documents`,
    body
  )
  const result = unwrap<{ linked?: boolean }>(data)
  return result?.linked === true
}

/** 取消公文關聯 */
export async function unlinkDocument(
  constructionId: string,
  recordId: number,
  referenceId: number
): Promise<boolean> {
  const data = await http.delete<any>(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions/${recordId}/documents/${referenceId}`
  )
  const result = unwrap<{ unlinked?: boolean }>(data)
  return result?.unlinked === true
}

/** 刪除送審紀錄 */
export async function deletePlanSubmission(constructionId: string, id: number): Promise<boolean> {
  const data = await http.delete<any>(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions/${id}`
  )
  const result = unwrap<{ deleted?: boolean }>(data)
  return result?.deleted === true
}

/** 取得監造計畫核定公文資訊 */
export async function getPlanSubmissionApproval(constructionId: string): Promise<{
  documentRef: DocumentReferenceDto | null
  docNumber: string
  issueDate: string
}> {
  const data = await http.get<any>(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions/approval`
  )
  const result = unwrap<any>(data)
  return {
    documentRef: result?.documentRef || null,
    docNumber: result?.docNumber || '',
    issueDate: result?.issueDate || ''
  }
}

/** 關聯核定公文 */
export async function linkApprovalDocument(
  constructionId: string,
  documentId: number,
  documentName: string
): Promise<void> {
  await http.post(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions/approval`,
    { documentId, documentName }
  )
}

/** 取消核定公文關聯 */
export async function unlinkApprovalDocument(constructionId: string, referenceId: number): Promise<void> {
  await http.delete(
    `/management/constructions/${encodeURIComponent(constructionId)}/plan-submissions/approval/${referenceId}`
  )
}
