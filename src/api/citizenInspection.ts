import http from '@/api/http'

export interface CitizenInspectionForm {
  id: number | null
  reportDate: string | null
  reporterName: string | null
  contactPhone: string | null
  reportingUnit: string | null
  projectName: string | null
  contractorName: string | null
  projectLocation: string | null
  inspectionSubject: string | null
  problemDescription: string | null
  affectedScope: string | null
  correctiveActions: string | null
  hasPhoto: boolean
  hasSupportingDocument: boolean
}

export type CitizenInspectionAttachmentType = 'PHOTO' | 'SUPPORTING_DOCUMENT'

export interface CitizenInspectionAttachment {
  id: number
  attachmentType: CitizenInspectionAttachmentType
  fileName: string
  fileSize: number
  contentType: string | null
  downloadUrl: string | null
  createdAt: string | null
}

function base(constructionId: string): string {
  return `/management/constructions/${encodeURIComponent(constructionId)}/citizen-inspection-form`
}

export async function listCitizenInspectionForms(
  constructionId: string,
): Promise<CitizenInspectionForm[]> {
  return await http.get(base(constructionId)) as unknown as CitizenInspectionForm[]
}

export async function getCitizenInspectionForm(
  constructionId: string,
  recordId: number,
): Promise<CitizenInspectionForm> {
  return await http.get(`${base(constructionId)}/${recordId}`) as unknown as CitizenInspectionForm
}

export async function createCitizenInspectionForm(
  constructionId: string,
  payload: CitizenInspectionForm,
): Promise<CitizenInspectionForm> {
  return await http.post(base(constructionId), payload) as unknown as CitizenInspectionForm
}

export async function updateCitizenInspectionForm(
  constructionId: string,
  recordId: number,
  payload: CitizenInspectionForm,
): Promise<CitizenInspectionForm> {
  return await http.put(
    `${base(constructionId)}/${recordId}`,
    payload,
  ) as unknown as CitizenInspectionForm
}

export async function deleteCitizenInspectionForm(
  constructionId: string,
  recordId: number,
): Promise<void> {
  await http.delete(`${base(constructionId)}/${recordId}`)
}

export async function exportCitizenInspectionForm(
  constructionId: string,
  recordId: number,
): Promise<Blob> {
  return await http.post(`${base(constructionId)}/${recordId}/export`, undefined, {
    responseType: 'blob',
  }) as unknown as Blob
}

export async function exportCitizenInspectionBundle(
  constructionId: string,
  recordId: number,
): Promise<Blob> {
  return await http.post(`${base(constructionId)}/${recordId}/export-bundle`, undefined, {
    responseType: 'blob',
  }) as unknown as Blob
}

export async function listCitizenInspectionAttachments(
  constructionId: string,
  recordId: number,
): Promise<CitizenInspectionAttachment[]> {
  return await http.get(
    `${base(constructionId)}/${recordId}/attachments`,
  ) as unknown as CitizenInspectionAttachment[]
}

export async function uploadCitizenInspectionAttachments(
  constructionId: string,
  recordId: number,
  attachmentType: CitizenInspectionAttachmentType,
  files: File[],
): Promise<CitizenInspectionAttachment[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  return await http.post(`${base(constructionId)}/${recordId}/attachments`, formData, {
    params: { attachmentType },
  }) as unknown as CitizenInspectionAttachment[]
}

export async function deleteCitizenInspectionAttachment(
  constructionId: string,
  recordId: number,
  attachmentId: number,
): Promise<void> {
  await http.delete(`${base(constructionId)}/${recordId}/attachments/${attachmentId}`)
}
