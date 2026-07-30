import http from '@/api/http'

export interface G5SoilManagementAttachment {
  id: number
  fileName: string
  fileSize: number
  contentType?: string | null
  downloadUrl?: string | null
  createdAt: string
}

export interface G5SoilManagementRecord {
  id: number
  constructionId: string
  title: string
  note?: string | null
  attachments: G5SoilManagementAttachment[]
  createdAt: string
  updatedAt: string
}

export interface G5SoilManagementPayload {
  title: string
  note?: string | null
}

function base(constructionId: string) {
  return `/management/constructions/${encodeURIComponent(constructionId)}/g5-soil-management-records`
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: T }).data
  return raw as T
}

export async function listG5SoilManagementRecords(
  constructionId: string,
): Promise<G5SoilManagementRecord[]> {
  return unwrap<G5SoilManagementRecord[]>(await http.get(base(constructionId))) ?? []
}

export async function createG5SoilManagementRecord(
  constructionId: string,
  payload: G5SoilManagementPayload,
): Promise<G5SoilManagementRecord> {
  return unwrap<G5SoilManagementRecord>(await http.post(base(constructionId), payload))
}

export async function updateG5SoilManagementRecord(
  constructionId: string,
  recordId: number,
  payload: G5SoilManagementPayload,
): Promise<G5SoilManagementRecord> {
  return unwrap<G5SoilManagementRecord>(
    await http.put(`${base(constructionId)}/${recordId}`, payload),
  )
}

export async function deleteG5SoilManagementRecord(
  constructionId: string,
  recordId: number,
): Promise<void> {
  await http.delete(`${base(constructionId)}/${recordId}`)
}

export async function uploadG5SoilManagementAttachments(
  constructionId: string,
  recordId: number,
  files: File[],
): Promise<G5SoilManagementAttachment[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  return unwrap<G5SoilManagementAttachment[]>(
    await http.post(`${base(constructionId)}/${recordId}/attachments`, formData),
  )
}

export async function deleteG5SoilManagementAttachment(
  constructionId: string,
  recordId: number,
  attachmentId: number,
): Promise<void> {
  await http.delete(`${base(constructionId)}/${recordId}/attachments/${attachmentId}`)
}
