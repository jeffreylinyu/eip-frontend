import type { AnyRecord } from './tree'
import { getUidFromRecord } from './tree'

// 依照當前 flatData 的層級結構，產生 Uid -> 顯示用 TaskID 的映射
export function computeDisplayIdsFromFlat(flatData: AnyRecord[]): Map<string, string> {
  const uidToDisplayId = new Map<string, string>()
  const siblingCounterByParent: Map<string, number> = new Map()

  // 以 level 為主建立階層，較可靠
  const stack: string[] = [] // 各層的 parent Uid
  let topIndex = 0

  flatData.forEach(row => {
    const uid = getUidFromRecord(row)
    if (!uid) return
    const level = typeof row.level === 'number' ? row.level : (row.hasChildRecords || row.parentItem ? (row.parentItem ? 1 : 0) : 0)

    if (level <= 0) {
      topIndex += 1
      uidToDisplayId.set(uid, String(topIndex))
      stack[0] = uid
      // 清理更深層stack
      stack.length = 1
      return
    }

    const parentUid = stack[level - 1]
    if (!parentUid) {
      // 後備：嘗試從 parentItem 取得
      const pUid = row.parentItem ? getUidFromRecord(row.parentItem) : ''
      if (pUid) {
        stack[level - 1] = pUid
      }
    }
    const effectiveParentUid = stack[level - 1]
    const parentDisplayId = effectiveParentUid ? uidToDisplayId.get(effectiveParentUid) : undefined
    if (!effectiveParentUid || !parentDisplayId) {
      // 無法推斷父 → 當作頂層處理
      topIndex += 1
      uidToDisplayId.set(uid, String(topIndex))
      stack[0] = uid
      stack.length = 1
      return
    }

    const nextSibling = (siblingCounterByParent.get(effectiveParentUid) || 0) + 1
    siblingCounterByParent.set(effectiveParentUid, nextSibling)
    const displayId = `${parentDisplayId}.${nextSibling}`
    uidToDisplayId.set(uid, displayId)
    stack[level] = uid
    stack.length = level + 1
  })

  return uidToDisplayId
}

// 將顯示ID套用到 store 的樹狀任務上（依 Uid）
export function applyDisplayIdsToStore(tasks: AnyRecord[], uidToDisplayId: Map<string, string>): void {
  const walk = (nodes: AnyRecord[]) => {
    nodes.forEach(n => {
      const uid = String(n.Uid || '')
      const id = uidToDisplayId.get(uid)
      if (id) n.TaskID = id
      if (n.subtasks && n.subtasks.length > 0) walk(n.subtasks)
    })
  }
  walk(tasks)
}

// 就地更新 TreeGrid 內部 flatData 的 TaskID，避免重綁 dataSource
export function applyDisplayIdsToGridFlat(gridInstance: any, uidToDisplayId: Map<string, string>): void {
  try {
    const grid = gridInstance?.ej2Instances || gridInstance
    if (!grid || !Array.isArray(grid.flatData)) return
    grid.flatData.forEach((row: AnyRecord) => {
      const uid = getUidFromRecord(row)
      const id = uidToDisplayId.get(uid)
      if (uid && id && row.TaskID !== id) {
        row.TaskID = id
        if (row.taskData) row.taskData.TaskID = id
      }
    })
    if (grid.refresh) grid.refresh()
  } catch {
    // no-op
  }
}

// 依賴字串（TaskID 為單位）使用舊ID->新ID映射重寫
export function rewritePredecessorByIdMap(tasks: AnyRecord[], oldIdToNewId: Record<string, string>): void {
  const rewrite = (pred: string): string => {
    const parts = pred.split(',').map(p => p.trim()).filter(Boolean)
    const mapped: string[] = []
    parts.forEach(p => {
      const m = p.match(/^(\d+(?:\.\d+)*)\s+(FS|SS|FF|SF)(?:\+(\d+))?$/i)
      if (!m) return
      const oldId = m[1]
      const type = m[2]
      const offset = m[3]
      const newId = oldIdToNewId[oldId]
      if (!newId) return
      mapped.push(`${newId} ${type}${offset ? `+${offset}` : ''}`)
    })
    return mapped.join(', ')
  }

  const walk = (nodes: AnyRecord[]) => {
    nodes.forEach(n => {
      if (n.Predecessor) n.Predecessor = rewrite(String(n.Predecessor))
      if (n.subtasks && n.subtasks.length > 0) walk(n.subtasks)
    })
  }
  walk(tasks)
}


