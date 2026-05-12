import { INSPECTION_PLACEHOLDER_FLOW } from '@/utils/buildInspectionPhasesFromLines'
import type { InspectionPhaseBlock, InspectionPhaseFlowGroup, InspectionRow } from '@/utils/buildInspectionPhasesFromLines'

/** 與分項施工抽查標準列對齊，並附帶對應「施工方法與步驟」之階段／工序 id */
export type PDynamicInspectionConstructionLine = {
  id: number
  pStageId: string
  pProcessId: string
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
}

export type StagePlanRowLike = {
  id: string
  name: string
  processes: { id: string; name: string }[]
}

export function nextTempLineId(lines: { id?: number | null }[]): number {
  let m = 0
  for (const x of lines) {
    const n = typeof x.id === 'number' && Number.isFinite(x.id) ? x.id : 0
    if (n > m) m = n
  }
  return m + 1
}

export function stageDisplayName(stage: StagePlanRowLike, stageIdx: number): string {
  return String(stage?.name || '').trim() || `階段${stageIdx + 1}`
}

export function processDisplayName(proc: { name: string }, procIdx: number): string {
  return String(proc?.name || '').trim() || `工序${procIdx + 1}`
}

/** 與監造／分項抽查表固定「施工前階段」等鍵一致，避免 withFixedWorkProcessGroups 出現重複空區塊 */
export function normalizeWorkProcessPhaseName(displayName: string): string {
  const t = displayName.trim()
  if (t === '施工前' || t === '施工前階段') return '施工前階段'
  if (t === '施工中' || t === '施工中階段') return '施工中階段'
  if (t === '施工後' || t === '施工後階段') return '施工後階段'
  return t
}

export function findPStageProcessIdsByLabels(
  stages: StagePlanRowLike[],
  phaseKey: string,
  flowLabel: string
): { stageId: string; processId: string } | null {
  const pk = phaseKey.trim()
  const fk = flowLabel.trim()
  for (let si = 0; si < stages.length; si++) {
    const st = stages[si]
    const wn = normalizeWorkProcessPhaseName(stageDisplayName(st, si))
    if (wn !== pk) continue
    const procs = st.processes || []
    for (let pi = 0; pi < procs.length; pi++) {
      const proc = procs[pi]
      if (processDisplayName(proc, pi) === fk) {
        return { stageId: st.id, processId: proc.id }
      }
    }
  }
  return null
}

/**
 * 依目前「施工方法與步驟」同步施工抽查標準平面列：每個主要工序對應一個施工流程群組；
 * 保留既有 id 與抽查欄位，更新 work_process / work_process_detail 與 stage／process id；刪除已不存在的工序列。
 */
export function reconcilePInspectionConstructionLines(
  stages: StagePlanRowLike[],
  existing: PDynamicInspectionConstructionLine[]
): PDynamicInspectionConstructionLine[] {
  const wanted = new Set<string>()
  for (const st of stages) {
    for (const p of st.processes || []) {
      wanted.add(`${st.id}:${p.id}`)
    }
  }

  const kept = existing.filter((l) => {
    const k = `${l.pStageId}:${l.pProcessId}`
    return wanted.has(k)
  })

  const byKey = new Map<string, PDynamicInspectionConstructionLine[]>()
  for (const l of kept) {
    const k = `${l.pStageId}:${l.pProcessId}`
    const arr = byKey.get(k) ?? []
    arr.push(l)
    byKey.set(k, arr)
  }

  const out: PDynamicInspectionConstructionLine[] = []
  let idCursor = nextTempLineId([...kept, ...existing])

  stages.forEach((st, si) => {
    const wn = normalizeWorkProcessPhaseName(stageDisplayName(st, si))
    ;(st.processes || []).forEach((proc, pi) => {
      const pn = processDisplayName(proc, pi)
      const key = `${st.id}:${proc.id}`
      const group = byKey.get(key)
      if (!group || group.length === 0) {
        out.push({
          id: idCursor++,
          pStageId: st.id,
          pProcessId: proc.id,
          workProcess: wn,
          workProcessDetail: pn,
          remark: INSPECTION_PLACEHOLDER_FLOW
        })
        return
      }
      const sorted = [...group].sort((a, b) => {
        const ap = a.remark === INSPECTION_PLACEHOLDER_FLOW ? 0 : 1
        const bp = b.remark === INSPECTION_PLACEHOLDER_FLOW ? 0 : 1
        if (ap !== bp) return ap - bp
        return (a.id ?? 0) - (b.id ?? 0)
      })
      for (const l of sorted) {
        out.push({
          ...l,
          workProcess: wn,
          workProcessDetail: pn,
          pStageId: st.id,
          pProcessId: proc.id
        })
      }
    })
  })

  return out
}

export function parsePInspectionConstructionLinesJson(raw: string | null | undefined): PDynamicInspectionConstructionLine[] {
  if (!raw || !String(raw).trim()) return []
  try {
    const arr = JSON.parse(String(raw)) as unknown
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x) => x && typeof x === 'object')
      .map((x: any) => ({
        id: Number(x.id),
        pStageId: String(x.pStageId ?? '').trim(),
        pProcessId: String(x.pProcessId ?? '').trim(),
        workProcess: x.workProcess ?? null,
        workProcessDetail: x.workProcessDetail ?? null,
        manageProject: x.manageProject ?? null,
        checkPoint: x.checkPoint ?? null,
        checkStandard: x.checkStandard ?? null,
        checkTiming: x.checkTiming ?? null,
        checkMethod: x.checkMethod ?? null,
        checkFeq: x.checkFeq ?? null,
        failureHandle: x.failureHandle ?? null,
        manageRecord: x.manageRecord ?? null,
        remark: x.remark ?? null
      }))
      .filter((x) => Number.isFinite(x.id) && x.pStageId.length > 0 && x.pProcessId.length > 0)
  } catch {
    return []
  }
}

export function serializePInspectionConstructionLinesJson(lines: PDynamicInspectionConstructionLine[]): string {
  return JSON.stringify(lines)
}

function groupRowsByManageProject(flow: InspectionPhaseFlowGroup): { name: string; rows: InspectionRow[] }[] {
  const rows = flow.rows ?? []
  const out: { name: string; rows: InspectionRow[] }[] = []
  const idx = new Map<string, number>()
  for (const r of rows) {
    const name = (r?.manageProject ?? '').toString().trim() || '未命名項目'
    const i = idx.get(name)
    if (i === undefined) {
      idx.set(name, out.length)
      out.push({ name, rows: [r] })
    } else {
      out[i].rows.push(r)
    }
  }
  return out
}

/** 由合併後 phases 以 phaseKey / flowIdx / mgmtIdx / subIdx 取得明細列（與分項頁邏輯一致） */
export function getInspectionRowByMgmtSub(
  phases: Record<string, InspectionPhaseBlock>,
  phaseKey: string,
  flowIdx: number,
  mgmtIdx: number,
  subIdx: number
): InspectionRow | null {
  const flow = phases[phaseKey]?.flows?.[flowIdx]
  if (!flow) return null
  const groups = groupRowsByManageProject(flow)
  return groups?.[mgmtIdx]?.rows?.[subIdx] ?? null
}
