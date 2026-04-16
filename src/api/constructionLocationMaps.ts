import http from './http'

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
}

export async function listConstructionLocationMaps(
  constructionId: string,
  type:
    | 'LOCATION_MAP'
    | 'SCOPE_DIAGRAM'
    | 'SECTION_DIAGRAM'
    | 'P1_SITE_LOCATION_MAP'
    | 'P1_MAIN_STANDARD_DRAWINGS'
    | 'P1_SCHEDULED_PROJECT_PROGRESS',
  designChangeId?: number | null
): Promise<ConstructionLocationMapImageInfo[]> {
  const params: any = { constructionId, type }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = designChangeId
  }
  const data: any = await http.get('/management/construction/location-maps/list', { params })
  // BaseResponse: { code, message, data }
  const list = Array.isArray(data) ? data : (data?.data ?? [])
  return (list || []) as ConstructionLocationMapImageInfo[]
}

export async function uploadConstructionLocationMaps(
  constructionId: string,
  files: File[],
  type:
    | 'LOCATION_MAP'
    | 'SCOPE_DIAGRAM'
    | 'SECTION_DIAGRAM'
    | 'P1_SITE_LOCATION_MAP'
    | 'P1_MAIN_STANDARD_DRAWINGS'
    | 'P1_SCHEDULED_PROJECT_PROGRESS',
  designChangeId?: number | null
): Promise<ConstructionLocationMapImageInfo[]> {
  const form = new FormData()
  form.append('constructionId', constructionId)
  form.append('type', type)
  if (designChangeId !== undefined && designChangeId !== null) {
    form.append('designChangeId', String(designChangeId))
  }
  files.forEach((f) => form.append('files', f))
  const data: any = await http.post('/management/construction/location-maps/upload', form)
  const list = Array.isArray(data) ? data : (data?.data ?? [])
  return (list || []) as ConstructionLocationMapImageInfo[]
}

export async function deleteConstructionLocationMap(
  constructionId: string,
  id: number,
  type:
    | 'LOCATION_MAP'
    | 'SCOPE_DIAGRAM'
    | 'SECTION_DIAGRAM'
    | 'P1_SITE_LOCATION_MAP'
    | 'P1_MAIN_STANDARD_DRAWINGS'
    | 'P1_SCHEDULED_PROJECT_PROGRESS',
  designChangeId?: number | null
): Promise<void> {
  const params: any = { constructionId, type }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = designChangeId
  }
  await http.delete(`/management/construction/location-maps/${id}`, { params })
}

