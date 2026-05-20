import http from './http'

/** 與監造施工大項明細欄位對齊（營造分項掛載之施工／安全衛生標準） */
export interface SubdivisionWorkItemStandardLine {
  id?: number | null
  stepOrder?: number | null
  itemName?: string | null
  workProcess?: string | null
  workProcessDetail?: string | null
  manageProject?: string | null
  checkPoint?: string | null
  checkStandard?: string | null
  checkTiming?: string | null
  checkMethod?: string | null
  checkFeq?: string | null
  failureHandle?: string | null
  manageRecord?: string | null
  remark?: string | null
  isActive?: boolean
}

export interface SubdivisionWorkItem {
  id: number
  constructionId: string
  designChangeId: number | null
  sortOrder: number
  name: string
  remark: string | null
  createdAt?: string | null
  updatedAt?: string | null
  constructionStandards?: SubdivisionWorkItemStandardLine[]
  safetyStandards?: SubdivisionWorkItemStandardLine[]
  /** 施工要領步驟筆數（此版本；無資料則 0） */
  guideStepCount?: number
}

export type SubdivisionWorkItemGuideStep = {
  sortOrder: number
  stepType?: 'PROCESS' | 'CHECKPOINT'
  /** ＊/◎/＊◎ */
  checkpointMark?: '＊' | '◎' | '＊◎' | null
  title: string
  materials?: string[]
  equipment?: string[]
  notes?: string[]
}

export type SubdivisionWorkItemGuide = {
  constructionId: string
  designChangeId: number | null
  subdivisionWorkItemId: number
  isFallback?: boolean
  fallbackFromDesignChangeId?: number | null
  flowGraphJson?: string | null
  flowGraphImageObjectName?: string | null
  materials?: string[]
  equipment?: string[]
  notes?: string[]
  steps?: SubdivisionWorkItemGuideStep[]
}

function unwrapList(data: unknown): SubdivisionWorkItem[] {
  if (Array.isArray(data)) return data as SubdivisionWorkItem[]
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: SubdivisionWorkItem[] }).data
  }
  return []
}

export async function listSubdivisionWorkItems(
  constructionId: string,
  designChangeId?: number | null
): Promise<SubdivisionWorkItem[]> {
  const params: Record<string, string | number> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = designChangeId
  }
  const data = await http.get<unknown>('/management/construction/subdivision-work-items', { params })
  return unwrapList(data)
}

export async function createSubdivisionWorkItem(payload: {
  constructionId: string
  designChangeId?: number | null
  name: string
  remark?: string | null
}): Promise<SubdivisionWorkItem> {
  const data = await http.post<SubdivisionWorkItem | { data?: SubdivisionWorkItem }>(
    '/management/construction/subdivision-work-items',
    payload
  )
  if (data && typeof data === 'object' && 'id' in data) return data as unknown as SubdivisionWorkItem
  return (data as { data?: SubdivisionWorkItem })?.data as SubdivisionWorkItem
}

export async function updateSubdivisionWorkItem(
  id: number,
  payload: {
    constructionId: string
    designChangeId?: number | null
    name: string
    remark?: string | null
  }
): Promise<SubdivisionWorkItem> {
  const data = await http.patch<SubdivisionWorkItem | { data?: SubdivisionWorkItem }>(
    `/management/construction/subdivision-work-items/${id}`,
    payload
  )
  if (data && typeof data === 'object' && 'id' in data) return data as unknown as SubdivisionWorkItem
  return (data as { data?: SubdivisionWorkItem })?.data as SubdivisionWorkItem
}

export async function deleteSubdivisionWorkItem(
  id: number,
  constructionId: string,
  designChangeId?: number | null
): Promise<void> {
  const params: Record<string, string | number> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = designChangeId
  }
  await http.delete(`/management/construction/subdivision-work-items/${id}`, { params })
}

export async function reorderSubdivisionWorkItems(payload: {
  constructionId: string
  designChangeId?: number | null
  orderedIds: number[]
}): Promise<void> {
  await http.put('/management/construction/subdivision-work-items/reorder', payload)
}

export async function getSubdivisionWorkItemGuide(
  subdivisionWorkItemId: number,
  ctx: { constructionId: string; designChangeId?: number | null }
): Promise<SubdivisionWorkItemGuide> {
  const params: Record<string, string | number> = { constructionId: ctx.constructionId }
  if (ctx.designChangeId !== undefined && ctx.designChangeId !== null) {
    params.designChangeId = ctx.designChangeId
  }
  const raw = await http.get<unknown>(`/management/construction/subdivision-work-items/${subdivisionWorkItemId}/guide`, {
    params
  })
  // 後端多數回 BaseResponse；此處兩種都接
  if (raw && typeof raw === 'object' && 'constructionId' in (raw as any)) return raw as unknown as SubdivisionWorkItemGuide
  const wrapped = raw as { code?: number; message?: string; data?: SubdivisionWorkItemGuide }
  if (wrapped?.code != null && wrapped.code !== 200) {
    throw new Error(wrapped.message || '載入失敗')
  }
  return (wrapped?.data as SubdivisionWorkItemGuide) || ({} as SubdivisionWorkItemGuide)
}

export async function upsertSubdivisionWorkItemGuide(
  subdivisionWorkItemId: number,
  payload: {
    constructionId: string
    designChangeId?: number | null
    flowGraphJson?: string | null
    materials?: string[]
    equipment?: string[]
    notes?: string[]
    steps: SubdivisionWorkItemGuideStep[]
  }
): Promise<SubdivisionWorkItemGuide> {
  const raw = await http.put<unknown>(`/management/construction/subdivision-work-items/${subdivisionWorkItemId}/guide`, payload)
  if (raw && typeof raw === 'object' && 'constructionId' in (raw as any)) return raw as unknown as SubdivisionWorkItemGuide
  const wrapped = raw as { code?: number; message?: string; data?: SubdivisionWorkItemGuide }
  if (wrapped?.code != null && wrapped.code !== 200) {
    throw new Error(wrapped.message || '儲存失敗')
  }
  return (wrapped?.data as SubdivisionWorkItemGuide) || ({} as SubdivisionWorkItemGuide)
}

export async function aiGenerateSubdivisionWorkItemGuide(
  subdivisionWorkItemId: number,
  ctx: { constructionId: string; designChangeId?: number | null }
): Promise<SubdivisionWorkItemGuide> {
  const params: Record<string, string | number> = { constructionId: ctx.constructionId }
  if (ctx.designChangeId !== undefined && ctx.designChangeId !== null) {
    params.designChangeId = ctx.designChangeId
  }
  const raw = await http.post<unknown>(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/guide/ai-generate`,
    {},
    { params }
  )
  if (raw && typeof raw === 'object' && 'constructionId' in (raw as any)) return raw as unknown as SubdivisionWorkItemGuide
  const wrapped = raw as { code?: number; message?: string; data?: SubdivisionWorkItemGuide; error?: string }
  if (wrapped?.code != null && wrapped.code !== 200) {
    throw new Error(wrapped.message || wrapped.error || '工程案資料建構失敗')
  }
  return (wrapped?.data as SubdivisionWorkItemGuide) || ({} as SubdivisionWorkItemGuide)
}

export async function uploadSubdivisionWorkItemGuideFlowImage(
  subdivisionWorkItemId: number,
  ctx: { constructionId: string; designChangeId?: number | null; file: File }
): Promise<{ objectName: string; signedUrl?: string }> {
  const form = new FormData()
  form.append('constructionId', ctx.constructionId)
  if (ctx.designChangeId !== undefined && ctx.designChangeId !== null) {
    form.append('designChangeId', String(ctx.designChangeId))
  }
  form.append('file', ctx.file)
  const raw = await http.post<unknown>(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/guide/flow-image/upload`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  if (raw && typeof raw === 'object' && 'objectName' in (raw as any)) return raw as any
  const wrapped = raw as { data?: any }
  return wrapped?.data ?? { objectName: '' }
}

/** 與監造施工大項明細 PATCH 可更新欄位一致（更新時 workProcess 後端會忽略；**建立**明細時可帶以區分施工階段） */
export type SubdivisionWorkItemStandardUpdatePayload = {
  itemName?: string | null
  workProcess?: string | null
  workProcessDetail?: string | null
  manageProject?: string | null
  checkPoint?: string | null
  checkStandard?: string | null
  checkTiming?: string | null
  checkMethod?: string | null
  checkFeq?: string | null
  failureHandle?: string | null
  manageRecord?: string | null
  remark?: string | null
  isActive?: boolean | null
}

function unwrapStandardPatchResponse(data: unknown): SubdivisionWorkItemStandardLine {
  if (data && typeof data === 'object' && 'id' in data) {
    return data as SubdivisionWorkItemStandardLine
  }
  const wrapped = data as { code?: number; message?: string; data?: SubdivisionWorkItemStandardLine }
  if (wrapped?.code != null && wrapped.code !== 200) {
    throw new Error(wrapped.message || '更新失敗')
  }
  if (wrapped?.data && typeof wrapped.data === 'object') {
    return wrapped.data
  }
  throw new Error('更新回應格式錯誤')
}

function standardListContextParams(constructionId: string, designChangeId?: number | null) {
  const params: Record<string, string | number> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = designChangeId
  }
  return { params }
}

export async function createSubdivisionConstructionStandard(
  subdivisionWorkItemId: number,
  ctx: { constructionId: string; designChangeId?: number | null },
  body?: SubdivisionWorkItemStandardUpdatePayload
): Promise<SubdivisionWorkItemStandardLine> {
  const raw = await http.post<unknown>(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/construction-standards`,
    body ?? {},
    standardListContextParams(ctx.constructionId, ctx.designChangeId)
  )
  return unwrapStandardPatchResponse(raw)
}

export async function createSubdivisionSafetyStandard(
  subdivisionWorkItemId: number,
  ctx: { constructionId: string; designChangeId?: number | null },
  body?: SubdivisionWorkItemStandardUpdatePayload
): Promise<SubdivisionWorkItemStandardLine> {
  const raw = await http.post<unknown>(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/safety-standards`,
    body ?? {},
    standardListContextParams(ctx.constructionId, ctx.designChangeId)
  )
  return unwrapStandardPatchResponse(raw)
}

export async function updateSubdivisionConstructionStandard(
  subdivisionWorkItemId: number,
  standardId: number,
  body: SubdivisionWorkItemStandardUpdatePayload,
  ctx: { constructionId: string; designChangeId?: number | null }
): Promise<SubdivisionWorkItemStandardLine> {
  const raw = await http.patch<unknown>(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/construction-standards/${standardId}`,
    body,
    standardListContextParams(ctx.constructionId, ctx.designChangeId)
  )
  return unwrapStandardPatchResponse(raw)
}

export async function updateSubdivisionSafetyStandard(
  subdivisionWorkItemId: number,
  standardId: number,
  body: SubdivisionWorkItemStandardUpdatePayload,
  ctx: { constructionId: string; designChangeId?: number | null }
): Promise<SubdivisionWorkItemStandardLine> {
  const raw = await http.patch<unknown>(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/safety-standards/${standardId}`,
    body,
    standardListContextParams(ctx.constructionId, ctx.designChangeId)
  )
  return unwrapStandardPatchResponse(raw)
}

export async function deleteSubdivisionConstructionStandard(
  subdivisionWorkItemId: number,
  standardId: number,
  ctx: { constructionId: string; designChangeId?: number | null }
): Promise<void> {
  await http.delete(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/construction-standards/${standardId}`,
    standardListContextParams(ctx.constructionId, ctx.designChangeId)
  )
}

export async function deleteSubdivisionConstructionStandardsByPhase(
  subdivisionWorkItemId: number,
  phaseKey: string,
  ctx: { constructionId: string; designChangeId?: number | null }
): Promise<void> {
  await http.delete(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/construction-standards/by-phase`,
    {
      params: {
        ...standardListContextParams(ctx.constructionId, ctx.designChangeId).params,
        phaseKey
      }
    }
  )
}

export async function deleteSubdivisionConstructionStandardsByManageProject(
  subdivisionWorkItemId: number,
  phaseKey: string,
  manageProject: string,
  ctx: { constructionId: string; designChangeId?: number | null },
  workProcessDetail?: string | null
): Promise<void> {
  const params: Record<string, string | number | undefined> = {
    ...standardListContextParams(ctx.constructionId, ctx.designChangeId).params,
    phaseKey,
    manageProject
  }
  if (workProcessDetail !== undefined && workProcessDetail !== null) {
    params.workProcessDetail = workProcessDetail
  }
  await http.delete(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/construction-standards/by-manage-project`,
    { params }
  )
}

export async function deleteSubdivisionSafetyStandard(
  subdivisionWorkItemId: number,
  standardId: number,
  ctx: { constructionId: string; designChangeId?: number | null }
): Promise<void> {
  await http.delete(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/safety-standards/${standardId}`,
    standardListContextParams(ctx.constructionId, ctx.designChangeId)
  )
}

export async function deleteSubdivisionSafetyStandardsByPhase(
  subdivisionWorkItemId: number,
  phaseKey: string,
  ctx: { constructionId: string; designChangeId?: number | null }
): Promise<void> {
  await http.delete(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/safety-standards/by-phase`,
    {
      params: {
        ...standardListContextParams(ctx.constructionId, ctx.designChangeId).params,
        phaseKey
      }
    }
  )
}

export async function deleteSubdivisionSafetyStandardsByManageProject(
  subdivisionWorkItemId: number,
  phaseKey: string,
  manageProject: string,
  ctx: { constructionId: string; designChangeId?: number | null },
  workProcessDetail?: string | null
): Promise<void> {
  const params: Record<string, string | number | undefined> = {
    ...standardListContextParams(ctx.constructionId, ctx.designChangeId).params,
    phaseKey,
    manageProject
  }
  if (workProcessDetail !== undefined && workProcessDetail !== null) {
    params.workProcessDetail = workProcessDetail
  }
  await http.delete(
    `/management/construction/subdivision-work-items/${subdivisionWorkItemId}/safety-standards/by-manage-project`,
    { params }
  )
}

/**
 * 從前一個版本複製分項工程至目標版本（含標準明細）。
 * sourceDesignChangeId 不傳或 null = 來源為原契約。
 * overwrite=true 先清空目標版本再複製；false 合併至既有之後。未傳 options 時由後端預設（目前為覆寫）。
 */
export async function copySubdivisionFromPrevious(
  constructionId: string,
  targetDesignChangeId: number,
  sourceDesignChangeId?: number | null,
  options?: { overwrite?: boolean }
): Promise<{ copiedCount: number }> {
  const params: Record<string, string | number | boolean> = {
    constructionId,
    targetDesignChangeId
  }
  if (options?.overwrite !== undefined) {
    params.overwrite = options.overwrite
  }
  if (sourceDesignChangeId !== undefined && sourceDesignChangeId !== null) {
    params.sourceDesignChangeId = sourceDesignChangeId
  }
  const data = await http.post<unknown>(
    '/management/construction/subdivision-work-items/copy-from-previous',
    {},
    { params }
  )
  if (data && typeof data === 'object' && 'copiedCount' in data) {
    return { copiedCount: Number((data as { copiedCount: number }).copiedCount) }
  }
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data?: { copiedCount?: number } }).data
    return { copiedCount: Number(inner?.copiedCount ?? 0) }
  }
  return { copiedCount: 0 }
}

/** 監造端「施工項目」匯出（JSON，供營造分項匯入） */
export interface SupervisorySubdivisionExportPayload {
  formatVersion: number
  kind: string
  constructionId: string
  iv: string
  ciphertext: string
}

export async function exportSupervisorySubdivisionJson(
  constructionId: string,
  designChangeId?: number | null
): Promise<SupervisorySubdivisionExportPayload> {
  const params: Record<string, string | number> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = designChangeId
  }
  const data = await http.get<SupervisorySubdivisionExportPayload | { data?: SupervisorySubdivisionExportPayload }>(
    '/management/generate/subdivision-work-items/supervisory-export',
    { params }
  )
  const isEncryptedPayload = (raw: unknown): raw is SupervisorySubdivisionExportPayload => {
    if (!raw || typeof raw !== 'object') return false
    const obj = raw as Record<string, unknown>
    return (
      typeof obj.kind === 'string' &&
      typeof obj.constructionId === 'string' &&
      typeof obj.iv === 'string' &&
      typeof obj.ciphertext === 'string'
    )
  }
  if (isEncryptedPayload(data)) return data
  const inner = (data as { data?: SupervisorySubdivisionExportPayload })?.data
  if (isEncryptedPayload(inner)) return inner
  throw new Error('匯出資料格式錯誤')
}

/**
 * 匯入監造端匯出之 JSON 為營造分項（覆寫該版本既有分項）。
 */
export async function importSubdivisionFromSupervisoryExport(payload: {
  constructionId: string
  designChangeId?: number | null
  items?: {
    sortOrder?: number | null
    name: string
    supervisoryMajorItemId?: string | null
    constructionStandards?: SubdivisionWorkItemStandardLine[]
    safetyStandards?: SubdivisionWorkItemStandardLine[]
  }[]
  encryptedPayload?: SupervisorySubdivisionExportPayload
}): Promise<{ importedCount: number }> {
  const body = {
    constructionId: payload.constructionId,
    designChangeId: payload.designChangeId ?? null,
    items: (payload.items ?? []).map((x) => ({
      sortOrder: x.sortOrder ?? undefined,
      name: x.name,
      supervisoryMajorItemId: x.supervisoryMajorItemId ?? undefined,
      constructionStandards: x.constructionStandards ?? [],
      safetyStandards: x.safetyStandards ?? []
    })),
    encryptedPayload: payload.encryptedPayload ?? null
  }
  const raw = await http.post<unknown>('/management/construction/subdivision-work-items/import-from-supervisory-export', body)
  if (raw && typeof raw === 'object') {
    const r = raw as { code?: number; message?: string; importedCount?: number; data?: { importedCount?: number } }
    if (r.code != null && r.code !== 200) {
      throw new Error(r.message || '匯入失敗')
    }
    if (typeof r.importedCount === 'number') return { importedCount: r.importedCount }
    if (r.data?.importedCount != null) return { importedCount: Number(r.data.importedCount) }
  }
  throw new Error('匯入回應格式錯誤')
}

/** 監造施工項目筆數預覽（營造分項複製用，不含明細內容） */
export interface SupervisorySubdivisionPreviewResponse {
  itemCount: number
  constructionStandardCount: number
  safetyStandardCount: number
  supervisoryVersionAvailable?: boolean
  contractorVersionLabel?: string | null
  resolvedSupervisoryVersionLabel?: string | null
}

export async function getSupervisorySubdivisionPreview(
  constructionId: string,
  contractorDesignChangeId?: number | null
): Promise<SupervisorySubdivisionPreviewResponse> {
  const params: Record<string, string> = { constructionId }
  if (contractorDesignChangeId != null && contractorDesignChangeId !== undefined) {
    params.contractorDesignChangeId = String(contractorDesignChangeId)
  }
  const raw = await http.get<unknown>(
    '/management/construction/subdivision-work-items/supervisory-preview',
    { params }
  )
  const data =
    raw && typeof raw === 'object' && 'itemCount' in raw
      ? raw
      : (raw as { data?: SupervisorySubdivisionPreviewResponse })?.data
  if (!data || typeof data !== 'object') {
    return {
      itemCount: 0,
      constructionStandardCount: 0,
      safetyStandardCount: 0,
      supervisoryVersionAvailable: false
    }
  }
  return {
    itemCount: Number((data as SupervisorySubdivisionPreviewResponse).itemCount ?? 0),
    constructionStandardCount: Number(
      (data as SupervisorySubdivisionPreviewResponse).constructionStandardCount ?? 0
    ),
    safetyStandardCount: Number((data as SupervisorySubdivisionPreviewResponse).safetyStandardCount ?? 0),
    supervisoryVersionAvailable:
      (data as SupervisorySubdivisionPreviewResponse).supervisoryVersionAvailable !== false,
    contractorVersionLabel: (data as SupervisorySubdivisionPreviewResponse).contractorVersionLabel ?? null,
    resolvedSupervisoryVersionLabel:
      (data as SupervisorySubdivisionPreviewResponse).resolvedSupervisoryVersionLabel ?? null
  }
}

/** 自監造對應版本複製施工項目至營造分項（含抽查標準明細） */
export async function copySubdivisionFromSupervisory(
  constructionId: string,
  contractorDesignChangeId: number | null | undefined,
  options?: { overwrite?: boolean }
): Promise<{ copiedCount: number }> {
  const body = {
    constructionId,
    contractorDesignChangeId: contractorDesignChangeId ?? null,
    overwrite: options?.overwrite !== false
  }
  const raw = await http.post<unknown>(
    '/management/construction/subdivision-work-items/copy-from-supervisory',
    body
  )
  if (raw && typeof raw === 'object') {
    const r = raw as { code?: number; message?: string; copiedCount?: number; data?: { copiedCount?: number } }
    if (r.code != null && r.code !== 200) {
      throw new Error(r.message || '複製失敗')
    }
    if (typeof r.copiedCount === 'number') return { copiedCount: r.copiedCount }
    if (r.data?.copiedCount != null) return { copiedCount: Number(r.data.copiedCount) }
  }
  throw new Error('複製回應格式錯誤')
}
