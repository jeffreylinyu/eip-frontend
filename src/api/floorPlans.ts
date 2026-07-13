import http from './http'

/** 與後端 FloorPlanService 常數一致 */
export type FloorPlanLinkType = 'MAJOR_ITEM' | 'SUBDIVISION_WORK_ITEM'

export interface FloorPlanPinLink {
  id: string
  linkedItemType: FloorPlanLinkType
  linkedItemId: string
  itemName?: string | null
}

export interface FloorPlanPin {
  id: string
  pageId: string
  xRatio: number
  yRatio: number
  title: string
  note?: string | null
  sortOrder: number
  links: FloorPlanPinLink[]
}

export interface FloorPlanPage {
  id: string
  pageNumber: number
  objectName: string
  signedUrl?: string | null
  width?: number | null
  height?: number | null
  pins: FloorPlanPin[]
}

export interface FloorPlan {
  id: string
  name: string
  sourceType: 'IMAGE' | 'PDF'
  sortOrder: number
  pages: FloorPlanPage[]
}

export interface LinkableItem {
  type: FloorPlanLinkType
  id: string
  name: string
  /** D/E 類自主檢查表文件分類項目 id */
  documentClassificationId?: number | null
}

const BASE = '/management/construction/floor-plans'

function unwrapList<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[]
  return (data?.data ?? []) as T[]
}

export async function listFloorPlans(
  constructionId: string,
  designChangeId?: number | null
): Promise<FloorPlan[]> {
  const params: Record<string, string | number> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) params.designChangeId = designChangeId
  const data = await http.get(BASE, { params })
  return unwrapList<FloorPlan>(data)
}

export async function listLinkableItems(
  constructionId: string,
  designChangeId?: number | null
): Promise<LinkableItem[]> {
  const params: Record<string, string | number> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = designChangeId
  }
  const data = await http.get(`${BASE}/linkable-items`, { params })
  return unwrapList<LinkableItem>(data)
}

export async function uploadFloorPlans(
  constructionId: string,
  designChangeId: number | null,
  files: File[]
): Promise<FloorPlan[]> {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId !== null) form.append('designChangeId', String(designChangeId))
  files.forEach((f) => form.append('files', f))
  const data = await http.post(`${BASE}/upload`, form)
  return unwrapList<FloorPlan>(data)
}

export async function renameFloorPlan(
  constructionId: string,
  planId: string,
  name: string
): Promise<void> {
  await http.patch(`${BASE}/${planId}`, { name }, { params: { constructionId } })
}

export async function deleteFloorPlan(constructionId: string, planId: string): Promise<void> {
  await http.delete(`${BASE}/${planId}`, { params: { constructionId } })
}

export interface CreatePinPayload {
  pageId: string
  xRatio: number
  yRatio: number
  title?: string
  note?: string
  linkedItemIds?: string[]
}

export async function createPin(
  constructionId: string,
  payload: CreatePinPayload
): Promise<FloorPlanPin> {
  const data = await http.post(`${BASE}/pins`, payload, { params: { constructionId } })
  return (data?.data ?? data) as FloorPlanPin
}

export interface UpdatePinPayload {
  title?: string
  note?: string | null
  xRatio?: number
  yRatio?: number
  /** 非 undefined 時全量覆寫連結項目 */
  linkedItemIds?: string[]
}

export async function updatePin(
  constructionId: string,
  pinId: string,
  payload: UpdatePinPayload
): Promise<FloorPlanPin> {
  const data = await http.patch(`${BASE}/pins/${pinId}`, payload, { params: { constructionId } })
  return (data?.data ?? data) as FloorPlanPin
}

export async function deletePin(constructionId: string, pinId: string): Promise<void> {
  await http.delete(`${BASE}/pins/${pinId}`, { params: { constructionId } })
}
