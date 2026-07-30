import http from '@/api/http'

export interface SiteInspectionAttendeeRow {
  unitName: string
  jobTitle: string
  signerName: string
  contactPhone: string
}

export interface SiteInspectionData {
  hostAgency: string
  projectName: string
  inspectionSubject: string
  inspectionDate: string
  inspectionPeriod: string
  inspectionTime: string
  location: string
  chairperson: string
  recorder: string
  handlingReason: string
  suggestionSummary: string
  inspectionOpinions: string
  inspectionConclusion: string
  attendeeRows: SiteInspectionAttendeeRow[]
}

export interface SiteInspectionRecord {
  id: number
  constructionId: string
  ownerType: 'SUPERVISORY' | 'CONTRACTOR'
  title: string
  inspectionData: SiteInspectionData
  createdAt: string
  updatedAt: string
}

export interface SiteInspectionPhoto {
  id: number
  fileName: string
  fileSize: number
  contentType?: string | null
  capturedAt?: string | null
  caption?: string | null
  displayOrder: number
  downloadUrl?: string | null
}

export interface SiteInspectionPayload {
  title: string
  inspectionData: SiteInspectionData
}

function base(constructionId: string) {
  return `/management/constructions/${encodeURIComponent(constructionId)}/site-inspection-records`
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: T }).data
  return raw as T
}

export async function listSiteInspections(constructionId: string): Promise<SiteInspectionRecord[]> {
  return unwrap<SiteInspectionRecord[]>(await http.get(base(constructionId))) ?? []
}

export async function getSiteInspection(
  constructionId: string,
  recordId: number,
): Promise<SiteInspectionRecord> {
  return unwrap<SiteInspectionRecord>(await http.get(`${base(constructionId)}/${recordId}`))
}

export async function createSiteInspection(
  constructionId: string,
  payload: SiteInspectionPayload,
): Promise<SiteInspectionRecord> {
  return unwrap<SiteInspectionRecord>(await http.post(base(constructionId), payload))
}

export async function updateSiteInspection(
  constructionId: string,
  recordId: number,
  payload: SiteInspectionPayload,
): Promise<SiteInspectionRecord> {
  return unwrap<SiteInspectionRecord>(
    await http.put(`${base(constructionId)}/${recordId}`, payload),
  )
}

export async function deleteSiteInspection(
  constructionId: string,
  recordId: number,
): Promise<void> {
  await http.delete(`${base(constructionId)}/${recordId}`)
}

export async function listSiteInspectionPhotos(
  constructionId: string,
  recordId: number,
): Promise<SiteInspectionPhoto[]> {
  return unwrap<SiteInspectionPhoto[]>(
    await http.get(`${base(constructionId)}/${recordId}/photos`),
  ) ?? []
}

export async function uploadSiteInspectionPhotos(
  constructionId: string,
  recordId: number,
  files: File[],
): Promise<SiteInspectionPhoto[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  return unwrap<SiteInspectionPhoto[]>(
    await http.post(`${base(constructionId)}/${recordId}/photos`, formData),
  )
}

export async function updateSiteInspectionPhoto(
  constructionId: string,
  recordId: number,
  photoId: number,
  payload: Pick<SiteInspectionPhoto, 'capturedAt' | 'caption' | 'displayOrder'>,
): Promise<SiteInspectionPhoto> {
  return unwrap<SiteInspectionPhoto>(
    await http.put(`${base(constructionId)}/${recordId}/photos/${photoId}`, payload),
  )
}

export async function deleteSiteInspectionPhoto(
  constructionId: string,
  recordId: number,
  photoId: number,
): Promise<void> {
  await http.delete(`${base(constructionId)}/${recordId}/photos/${photoId}`)
}

export async function exportSiteInspection(
  constructionId: string,
  recordId: number,
): Promise<Blob> {
  return await http.get(`${base(constructionId)}/${recordId}/export`, {
    responseType: 'blob',
  }) as unknown as Blob
}
