import http from '@/api/http'

/* ---------------------------- 型別 ---------------------------- */

export interface PlanSubmissionPDocRef {
  /** document_reference.id（取消關聯用） */
  referenceId: number
  documentId: number
  /** SUBMISSION（送審文號與日期）/ REVIEW（審查結果公文） */
  role: string
  documentName: string
}

export interface PlanSubmissionPAttachment {
  id: number
  fileName: string
  fileSize: number
  contentType: string | null
  createdAt: string | null
}

export interface PlanSubmissionPRecord {
  id: number
  planType: string
  submissionNumber: number
  /** APPROVED / REJECTED / null（審查中） */
  reviewResult: string | null
  submissionDocument: PlanSubmissionPDocRef | null
  reviewDocuments: PlanSubmissionPDocRef[]
  attachments: PlanSubmissionPAttachment[]
  createdAt: string | null
}

export const REVIEW_RESULT_OPTIONS = [
  { value: 'APPROVED', label: '同意核定' },
  { value: 'REJECTED', label: '退回修正' }
] as const

function base(constructionId: string): string {
  return `/management/constructions/${encodeURIComponent(constructionId)}/plan-submission-p`
}

function unwrap<T>(data: unknown): T | null {
  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return ((data as Record<string, unknown>).data as T) ?? null
  }
  return (data as T) ?? null
}

/* ---------------------------- API ---------------------------- */

export async function getPlanSubmissionPRecords(
  constructionId: string,
  planType: string,
  contextRecordId?: number,
): Promise<PlanSubmissionPRecord[]> {
  const data = await http.get(`${base(constructionId)}/records`, {
    params: { planType, contextRecordId },
  })
  return unwrap<PlanSubmissionPRecord[]>(data) ?? []
}

export async function createPlanSubmissionPRecord(
  constructionId: string,
  planType: string,
  contextRecordId?: number,
): Promise<PlanSubmissionPRecord | null> {
  const data = await http.post(`${base(constructionId)}/records`, { planType, contextRecordId })
  return unwrap<PlanSubmissionPRecord>(data)
}

export async function updatePlanSubmissionPReviewResult(
  constructionId: string,
  recordId: number,
  reviewResult: string | null
): Promise<PlanSubmissionPRecord | null> {
  const data = await http.put(`${base(constructionId)}/records/${recordId}/review-result`, { reviewResult })
  return unwrap<PlanSubmissionPRecord>(data)
}

export async function deletePlanSubmissionPRecord(constructionId: string, recordId: number): Promise<void> {
  await http.delete(`${base(constructionId)}/records/${recordId}`)
}

export async function linkPlanSubmissionPDocument(
  constructionId: string,
  recordId: number,
  payload: { documentId: number; role: 'SUBMISSION' | 'REVIEW'; documentName: string }
): Promise<void> {
  await http.post(`${base(constructionId)}/records/${recordId}/documents`, payload)
}

export async function unlinkPlanSubmissionPDocument(
  constructionId: string,
  recordId: number,
  referenceId: number
): Promise<void> {
  await http.delete(`${base(constructionId)}/records/${recordId}/documents/${referenceId}`)
}

export async function uploadPlanSubmissionPAttachments(
  constructionId: string,
  recordId: number,
  files: File[]
): Promise<PlanSubmissionPAttachment[]> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  const data = await http.post(`${base(constructionId)}/records/${recordId}/attachments`, formData)
  return unwrap<PlanSubmissionPAttachment[]>(data) ?? []
}

export async function deletePlanSubmissionPAttachment(
  constructionId: string,
  recordId: number,
  attachmentId: number
): Promise<void> {
  await http.delete(`${base(constructionId)}/records/${recordId}/attachments/${attachmentId}`)
}
