import http from '@/api/http'

export interface DesignChangeItem {
  id: number
  constructionId: string
  sourceType?: string
  effectiveDate: string
  /** 應用區間迄日（後端計算，最後一版與專案完工日同步） */
  effectiveEndDate?: string
  /** 版本名稱，預設為變更設計1、變更設計2…，使用者可自訂 */
  versionName?: string
  reason: string
  approvalNumber: string
  remark: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  documentIds: number[]
}

export interface DesignChangeRequest {
  constructionId: string
  effectiveDate: string
  /** 版本名稱，未填時新增預設為變更設計1、變更設計2… */
  versionName?: string
  reason?: string
  approvalNumber?: string
  remark?: string
  documentIds?: number[]
}

function unwrapData<T>(data: T | { code: number; data?: T }): T | null {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data?: T }).data ?? null
  }
  return Array.isArray(data) || (data && typeof data === 'object') ? (data as T) : null
}

/** 可傳給 http 的額外設定（例如 skipAuthRedirectOn401） */
export type DesignChangeRequestConfig = { skipAuthRedirectOn401?: boolean }

/** 取得該工程案變更設計列表（依生效日升序）。sourceType 可傳 CONTRACTOR/SUPERVISORY 依視角取對應列表。 */
export async function getDesignChangeList(
  constructionId: string,
  sourceType?: string,
  config?: DesignChangeRequestConfig
): Promise<DesignChangeItem[]> {
  const cid = constructionId?.trim()
  if (!cid) return []
  const params: Record<string, string> = {}
  if (sourceType === 'CONTRACTOR' || sourceType === 'SUPERVISORY') params.sourceType = sourceType
  const data = await http.get<DesignChangeItem[] | { code: number; data?: DesignChangeItem[] }>(
    `/management/constructions/${encodeURIComponent(cid)}/design-changes`,
    { params, ...config }
  )
  const list = unwrapData(data)
  return Array.isArray(list) ? list : []
}

/** 新增變更設計 */
export async function createDesignChange(
  constructionId: string,
  payload: DesignChangeRequest
): Promise<DesignChangeItem | null> {
  const body = { ...payload, constructionId }
  const data = await http.post<DesignChangeItem | { code: number; data?: DesignChangeItem }>(
    `/management/constructions/${encodeURIComponent(constructionId)}/design-changes`,
    body
  )
  const item = unwrapData(data)
  return item && typeof item === 'object' && 'id' in item ? (item as unknown as DesignChangeItem) : null
}

/** 更新變更設計 */
export async function updateDesignChange(
  constructionId: string,
  id: number,
  payload: DesignChangeRequest
): Promise<DesignChangeItem | null> {
  const body = { ...payload, constructionId }
  const data = await http.put<DesignChangeItem | { code: number; data?: DesignChangeItem }>(
    `/management/constructions/${encodeURIComponent(constructionId)}/design-changes/${id}`,
    body
  )
  const item = unwrapData(data)
  return item && typeof item === 'object' && 'id' in item ? (item as unknown as DesignChangeItem) : null
}

/** 各版本契約金額（原契約＋各變更設計），供人員配置建議等依版本顯示。 */
export interface VersionContractAmount {
  designChangeId: number | null
  versionName: string
  contractAmount: number
}

export async function getContractAmountsByVersion(
  constructionId: string,
  sourceType?: string,
  config?: DesignChangeRequestConfig
): Promise<VersionContractAmount[]> {
  const cid = constructionId?.trim()
  if (!cid) return []
  const params: Record<string, string> = {}
  if (sourceType === 'CONTRACTOR' || sourceType === 'SUPERVISORY') params.sourceType = sourceType
  const data = await http.get<VersionContractAmount[] | { code: number; data?: VersionContractAmount[] }>(
    `/management/constructions/${encodeURIComponent(cid)}/design-changes/contract-amounts`,
    { params, ...config }
  )
  const list = unwrapData(data)
  return Array.isArray(list) ? list : []
}

/** 刪除變更設計 */
export async function deleteDesignChange(constructionId: string, id: number): Promise<boolean> {
  const data = await http.delete<{ deleted?: boolean } | { code: number; data?: unknown }>(
    `/management/constructions/${encodeURIComponent(constructionId)}/design-changes/${id}`
  )
  if (data && typeof data === 'object' && 'deleted' in data) return (data as { deleted: boolean }).deleted === true
  const unwrapped = unwrapData(data)
  return unwrapped !== null
}
