import {
  type InspectionPhaseBlock,
  type InspectionPhaseFlowGroup,
  UNCLASSIFIED_WORK_PROCESS_FLOW_KEY,
  UNCLASSIFIED_WORK_PROCESS_PHASE_KEY
} from '@/utils/buildInspectionPhasesFromLines'

/** 「未分類施工階段」對應後端 work_process 空值（未選施工前／中／後） */
export function phaseKeyToWorkProcess(phaseKey: string): string | undefined {
  if (!phaseKey || phaseKey === UNCLASSIFIED_WORK_PROCESS_PHASE_KEY) return undefined
  return phaseKey
}

/** 畫面上的流程群組名稱 → API 的 work_process_detail（未分類不送或送 undefined） */
export function flowLabelToApiWorkProcessDetail(flowLabel: string): string | undefined {
  if (!flowLabel || flowLabel === UNCLASSIFIED_WORK_PROCESS_FLOW_KEY) return undefined
  return flowLabel
}

/** 依管理項目刪除 API：限縮施工流程時帶入（未分類傳空字串） */
export function flowLabelToScopedDeleteDetail(flowLabel: string): string {
  if (!flowLabel || flowLabel === UNCLASSIFIED_WORK_PROCESS_FLOW_KEY) return ''
  return flowLabel.trim()
}

function nextUniqueManageProjectNameInList(list: { manageProject?: string }[]): string {
  const used = new Set(list.map((m) => (m.manageProject || '').trim()).filter((s) => s.length > 0))
  let n = list.length + 1
  let candidate = `管理項目${n}`
  while (used.has(candidate)) {
    n++
    candidate = `管理項目${n}`
  }
  return candidate
}

/** 整個施工階段內管理項目名稱不可重複（跨施工流程） */
function nextUniqueManageProjectNameInPhase(phase: InspectionPhaseBlock | undefined): string {
  const all: { manageProject?: string }[] = []
  for (const flow of phase?.flows ?? []) {
    all.push(...(flow.rows ?? []))
  }
  return nextUniqueManageProjectNameInList(all)
}

function nextUniqueManageProjectNameInFlow(flow: InspectionPhaseFlowGroup | undefined): string {
  return nextUniqueManageProjectNameInList(flow?.rows ?? [])
}

/**
 * 在施工階段/施工流程下新增一筆明細列用的 manageProject 預設名稱。
 */
export function buildCreatePayloadForNewMgmt(
  phaseKey: string,
  itemData: { phases: Record<string, InspectionPhaseBlock> },
  flowIdx?: number
): { workProcess?: string; manageProject: string; workProcessDetail?: string } {
  const phase = itemData.phases[phaseKey]
  if (flowIdx !== undefined) {
    const flow = phase?.flows?.[flowIdx]
    if (!flow) throw new Error('找不到施工流程群組')
    return {
      workProcess: phaseKeyToWorkProcess(phaseKey),
      workProcessDetail: flowLabelToApiWorkProcessDetail(flow.flowLabel),
      manageProject: nextUniqueManageProjectNameInFlow(flow)
    }
  }
  return {
    workProcess: phaseKeyToWorkProcess(phaseKey),
    manageProject: nextUniqueManageProjectNameInPhase(phase)
  }
}

/** 同一施工流程下要呼叫 by-manage-project 刪除時，收集不重複的管理項目名稱。 */
export function uniqueManageProjectNamesInFlow(
  flow: InspectionPhaseFlowGroup | undefined
): string[] {
  if (!flow?.rows?.length) return []
  const set = new Set<string>()
  for (const r of flow.rows) {
    const n = (r.manageProject || '').trim()
    if (n) set.add(n)
  }
  return [...set]
}

/** 已移除「管理項目 → 子項」層級：明細列即為列層級，不再支援以 mgmtIdx 新增子項。 */
export function buildCreatePayloadForSubItem(
  phaseKey: string,
  flowIdx: number,
  itemData: { phases: Record<string, InspectionPhaseBlock> },
  mgmtIdx: number
): { workProcess?: string; manageProject: string; workProcessDetail?: string } {
  throw new Error('不支援：已改為「施工流程 → 多筆明細列」結構，請改用新增明細列流程')
}
