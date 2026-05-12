import http from './http'

/** 與後端 `ConstructionLocationMapService.P_DYNAMIC_SCHEDULED_PROGRESS` 一致 */
export const P_DYNAMIC_SCHEDULED_PROGRESS_TYPE = 'P_DYNAMIC_SCHEDULED_PROGRESS' as const

export type ConstructionLocationMapImageType =
  | 'LOCATION_MAP'
  | 'SCOPE_DIAGRAM'
  | 'SECTION_DIAGRAM'
  | 'P1_SITE_LOCATION_MAP'
  | 'P1_MAIN_STANDARD_DRAWINGS'
  | 'P1_SCHEDULED_PROJECT_PROGRESS'
  | typeof P_DYNAMIC_SCHEDULED_PROGRESS_TYPE

export interface ConstructionLocationMapImageInfo {
  id: number
  constructionId: string
  designChangeId?: number | null
  imageType?: string
  fileName: string
  objectName: string
  signedUrl?: string | null
  sortOrder: number
  contentType: string
  fileSize: number
  createdAt?: string | null
  documentClassificationId?: number | null
}

export async function listConstructionLocationMaps(
  constructionId: string,
  type: ConstructionLocationMapImageType,
  designChangeId?: number | null,
  documentClassificationId?: number | null
): Promise<ConstructionLocationMapImageInfo[]> {
  const params: Record<string, string | number> = { constructionId, type }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = designChangeId
  }
  if (documentClassificationId !== undefined && documentClassificationId !== null) {
    params.documentClassificationId = documentClassificationId
  }
  const data: any = await http.get('/management/construction/location-maps/list', { params })
  const list = Array.isArray(data) ? data : (data?.data ?? [])
  return (list || []) as ConstructionLocationMapImageInfo[]
}

export async function uploadConstructionLocationMaps(
  constructionId: string,
  files: File[],
  type: ConstructionLocationMapImageType,
  designChangeId?: number | null,
  documentClassificationId?: number | null
): Promise<ConstructionLocationMapImageInfo[]> {
  const form = new FormData()
  form.append('constructionId', constructionId)
  form.append('type', type)
  if (designChangeId !== undefined && designChangeId !== null) {
    form.append('designChangeId', String(designChangeId))
  }
  if (documentClassificationId !== undefined && documentClassificationId !== null) {
    form.append('documentClassificationId', String(documentClassificationId))
  }
  files.forEach((f) => form.append('files', f))
  const data: any = await http.post('/management/construction/location-maps/upload', form)
  const list = Array.isArray(data) ? data : (data?.data ?? [])
  return (list || []) as ConstructionLocationMapImageInfo[]
}

export async function deleteConstructionLocationMap(
  constructionId: string,
  id: number,
  type: ConstructionLocationMapImageType,
  designChangeId?: number | null,
  documentClassificationId?: number | null
): Promise<void> {
  const params: Record<string, string | number> = { constructionId, type }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = designChangeId
  }
  if (documentClassificationId !== undefined && documentClassificationId !== null) {
    params.documentClassificationId = documentClassificationId
  }
  await http.delete(`/management/construction/location-maps/${id}`, { params })
}
