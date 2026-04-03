/** work_process 為空時與後端刪除 API 使用的區塊鍵一致 */
export const UNCLASSIFIED_WORK_PROCESS_PHASE_KEY = '未分類施工階段'

/** work_process_detail 為空時在畫面上的群組標題 */
export const UNCLASSIFIED_WORK_PROCESS_FLOW_KEY = '未分類施工流程'

/** 前端占位列（僅用於讓空流程/空管理項目可持久化）的 remark 標記 */
export const INSPECTION_PLACEHOLDER_PREFIX = '__EIP_PLACEHOLDER__'
export const INSPECTION_PLACEHOLDER_FLOW = `${INSPECTION_PLACEHOLDER_PREFIX}:FLOW`
export const INSPECTION_PLACEHOLDER_MGMT = `${INSPECTION_PLACEHOLDER_PREFIX}:MGMT`

/**
 * 將施工／安全衛生抽查標準平面列轉成監造／營造「抽查標準維護」頁的階段式結構。
 *
 * 與後端欄位對齊的層級定義（B 表／明細共用）：
 * 1. **施工階段** `work_process`（施工前階段、施工中階段、施工後階段三欄）。
 * 2. **施工流程** `work_process_detail`（空白歸入「未分類施工流程」）。
 * 3. **明細列**：每列包含 `manage_project`（管理項目）與其餘欄位（含施工檢查點/抽查標準等）。
 */

export interface InspectionStandardLineLike {
  id?: number | null
  /** 施工階段（施工前／中／後），對應 work_process；空則歸入「未分類施工階段」 */
  workProcess?: string | null
  /** 施工流程（施工項目），對應 work_process_detail */
  workProcessDetail?: string | null
  manageProject?: string | null
  checkPoint?: string | null
  checkStandard?: string | null
  checkTiming?: string | null
  checkFeq?: string | null
  checkMethod?: string | null
  failureHandle?: string | null
  manageRecord?: string | null
  remark?: string | null
}

export interface InspectionRow {
  id?: number | null
  manageProject: string
  checkPoint: string
  checkStandard: string
  checkTiming: string
  checkFrequency: string
  checkMethod: string
  failureHandle: string
  /** 已不在維護頁使用，但保留欄位以承接既有 API 資料 */
  manageRecord: string
  /** 已不在維護頁使用，但保留欄位以承接既有 API 資料 */
  remark: string
}

/** 同一施工階段下，依 work_process_detail 分組 */
export interface InspectionPhaseFlowGroup {
  /** 畫面顯示用；空白資料為「未分類施工流程」 */
  flowLabel: string
  rows: InspectionRow[]
  /** 若此施工流程是用占位列建立，記住那筆 line id，方便後續刪除/更名 */
  _placeholderId?: number
  /** 合併施工／安衛視圖時：施工占位列 id */
  _placeholderConstructionId?: number
  /** 合併施工／安衛視圖時：安衛占位列 id */
  _placeholderSafetyId?: number
}

export interface InspectionPhaseBlock {
  /** 施工階段標題（來自 work_process；空資料時為「未分類施工階段」） */
  phaseLabel: string
  /** 施工階段 → 施工流程 → 明細列 */
  flows: InspectionPhaseFlowGroup[]
}

/** 與後端 B-1 [WORK_PROCESS_ORDER]、匯出篩選一致的三個固定施工階段 */
export const FIXED_WORK_PROCESS_GROUP_LABELS = [
  '施工前階段',
  '施工中階段',
  '施工後階段'
] as const

export type FixedWorkProcessGroupLabel = (typeof FIXED_WORK_PROCESS_GROUP_LABELS)[number]

const FIXED_SET = new Set<string>(FIXED_WORK_PROCESS_GROUP_LABELS)

/**
 * 一律帶出三個施工階段（施工前／中／後）（空則 施工流程群組 為 []）；其餘非固定鍵（如「未分類施工階段」）排在後面。
 */
export function withFixedWorkProcessGroups(
  phases: Record<string, InspectionPhaseBlock>
): Record<string, InspectionPhaseBlock> {
  const out: Record<string, InspectionPhaseBlock> = {}
  for (const key of FIXED_WORK_PROCESS_GROUP_LABELS) {
    const existing = phases[key]
    out[key] = existing ?? { phaseLabel: key, flows: [] }
  }
  for (const [k, block] of Object.entries(phases)) {
    if (!FIXED_SET.has(k)) {
      out[k] = block
    }
  }
  return out
}

export function buildInspectionPhasesFromLines(
  list: InspectionStandardLineLike[] | null | undefined
): { phases: Record<string, InspectionPhaseBlock> } {
  if (!list || list.length === 0) {
    return { phases: withFixedWorkProcessGroups({}) }
  }

  const phases: Record<string, InspectionPhaseBlock> = {}

  for (const item of list) {
    const phaseName = item.workProcess?.trim() || UNCLASSIFIED_WORK_PROCESS_PHASE_KEY
    const flowName =
      item.workProcessDetail?.trim() || UNCLASSIFIED_WORK_PROCESS_FLOW_KEY
    const remark = item.remark?.trim() || ''
    const isFlowPlaceholder = remark === INSPECTION_PLACEHOLDER_FLOW

    if (!phases[phaseName]) {
      phases[phaseName] = {
        phaseLabel: phaseName,
        flows: []
      }
    }

    let flowGroup = phases[phaseName].flows.find((f) => f.flowLabel === flowName)
    if (!flowGroup) {
      flowGroup = { flowLabel: flowName, rows: [] }
      phases[phaseName].flows.push(flowGroup)
    }

    // 只建立「施工流程」群組，不落入明細列
    if (isFlowPlaceholder) {
      if (item.id != null) {
        flowGroup._placeholderId = Number(item.id)
      }
      continue
    }

    flowGroup.rows.push({
      id: item.id ?? undefined,
      manageProject: item.manageProject?.trim() || '未命名項目',
      checkPoint: item.checkPoint?.trim() || '',
      checkStandard: item.checkStandard?.trim() || '',
      checkTiming: item.checkTiming?.trim() || '',
      checkFrequency: item.checkFeq?.trim() || '',
      checkMethod: item.checkMethod?.trim() || '',
      failureHandle: item.failureHandle?.trim() || '',
      manageRecord: item.manageRecord?.trim() || '',
      remark: item.remark?.trim() || ''
    })
  }

  return { phases: withFixedWorkProcessGroups(phases) }
}

/** 監造「抽查標準表」頁：施工／安衛分頁切換時使用 */
export type InspectionStandardsKind = 'construction' | 'safety'

function mergeFlowLabelsOrder(
  flowsA: InspectionPhaseFlowGroup[],
  flowsB: InspectionPhaseFlowGroup[]
): string[] {
  const labels: string[] = []
  const seen = new Set<string>()
  for (const f of flowsA) {
    if (!seen.has(f.flowLabel)) {
      seen.add(f.flowLabel)
      labels.push(f.flowLabel)
    }
  }
  for (const f of flowsB) {
    if (!seen.has(f.flowLabel)) {
      seen.add(f.flowLabel)
      labels.push(f.flowLabel)
    }
  }
  return labels
}

function orderedPhaseKeysForMerge(
  builtC: Record<string, InspectionPhaseBlock>,
  builtS: Record<string, InspectionPhaseBlock>
): string[] {
  const keys = new Set<string>([...Object.keys(builtC), ...Object.keys(builtS)])
  const out: string[] = []
  for (const k of FIXED_WORK_PROCESS_GROUP_LABELS) {
    if (keys.has(k)) out.push(k)
  }
  if (keys.has(UNCLASSIFIED_WORK_PROCESS_PHASE_KEY)) {
    out.push(UNCLASSIFIED_WORK_PROCESS_PHASE_KEY)
  }
  const rest = [...keys]
    .filter((k) => !FIXED_SET.has(k) && k !== UNCLASSIFIED_WORK_PROCESS_PHASE_KEY)
    .sort()
  out.push(...rest)
  return out
}

/**
 * 合併施工與安衛兩份平面明細的「階段＋施工流程」骨架；明細列僅顯示目前分頁對應那份。
 * 後端已共用 phase/flow，此處再以兩份 API 結果做 union，避免只填一側時另一側分頁看不到流程節點。
 */
export function buildMergedInspectionPhasesForTab(
  constructionLines: InspectionStandardLineLike[] | null | undefined,
  safetyLines: InspectionStandardLineLike[] | null | undefined,
  activeTab: InspectionStandardsKind
): { phases: Record<string, InspectionPhaseBlock> } {
  const builtC = buildInspectionPhasesFromLines(constructionLines).phases
  const builtS = buildInspectionPhasesFromLines(safetyLines).phases
  const phaseKeys = orderedPhaseKeysForMerge(builtC, builtS)
  const out: Record<string, InspectionPhaseBlock> = {}

  for (const phase of phaseKeys) {
    const blockC = builtC[phase]
    const blockS = builtS[phase]
    const flowLabels = mergeFlowLabelsOrder(blockC?.flows ?? [], blockS?.flows ?? [])
    const flows: InspectionPhaseFlowGroup[] = flowLabels.map((flowLabel) => {
      const fC = blockC?.flows.find((f) => f.flowLabel === flowLabel)
      const fS = blockS?.flows.find((f) => f.flowLabel === flowLabel)
      const activeFlow = activeTab === 'construction' ? fC : fS
      const rows = [...(activeFlow?.rows ?? [])]
      const phC = fC?._placeholderId
      const phS = fS?._placeholderId
      return {
        flowLabel,
        rows,
        _placeholderId: activeTab === 'construction' ? phC : phS,
        _placeholderConstructionId: phC,
        _placeholderSafetyId: phS,
      }
    })
    out[phase] = {
      phaseLabel: phase,
      flows,
    }
  }

  return { phases: withFixedWorkProcessGroups(out) }
}
