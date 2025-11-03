export type AnyRecord = Record<string, any>

const getUid = (rec: AnyRecord): string => {
  return String(
    (rec && (rec.Uid || rec.uid)) ||
    rec?.taskData?.Uid ||
    rec?.data?.Uid ||
    rec?.rowData?.Uid ||
    ''
  )
}

export function genUid(): string {
  // 瀏覽器環境優先使用 crypto.randomUUID
  const g: any = (globalThis as any)
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID()
  }
  return `uid_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

// 從 TreeGrid/Gantt 的 flatData 建樹（以 Uid 為鍵，保留其他欄位）
export function buildTreeFromFlat(flatData: AnyRecord[]): AnyRecord[] {
  const map = new Map<string, AnyRecord>()
  const roots: AnyRecord[] = []

  flatData.forEach(item => {
    const { TaskType, parentItem, childRecords, level, index, ...node } = item
    const uid = getUid(item) || String(node.Uid || '')
    if (!uid) return
    // 建樹時一律重置 subtasks，避免累積造成重複
    map.set(uid, { ...node, Uid: uid, subtasks: [] })
  })

  flatData.forEach(item => {
    const uid = getUid(item)
    const node = uid ? map.get(uid) : null
    if (!node) return
    const parentUid = item.parentItem ? getUid(item.parentItem) : ''
    if (parentUid) {
      const parent = map.get(parentUid)
      if (parent) {
        if (!Array.isArray(parent.subtasks)) parent.subtasks = []
        parent.subtasks.push(node)
      } else {
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  })

  return roots
}

// 將樹狀任務轉換為可綁定 TreeGrid 的資料（保留 subtasks）
export function flattenForGrid(tasks: AnyRecord[]): AnyRecord[] {
  // TreeGrid 原本即可使用 subtasks 綁定，通常不需要展平
  // 這裡僅確保每個節點具有必要欄位
  const ensure = (nodes: AnyRecord[]) => {
    nodes.forEach(n => {
      if (!Array.isArray(n.subtasks)) n.subtasks = []
      if (n.subtasks.length > 0) ensure(n.subtasks)
    })
  }
  ensure(tasks)
  return tasks
}

export function getUidFromRecord(rec: AnyRecord): string {
  return getUid(rec)
}

// 為樹狀任務補齊缺少的 Uid
export function ensureUidsInTree(tasks: AnyRecord[]): void {
  const walk = (nodes: AnyRecord[]) => {
    nodes.forEach(n => {
      if (!n.Uid) n.Uid = genUid()
      if (n.subtasks && n.subtasks.length > 0) walk(n.subtasks)
    })
  }
  walk(tasks)
}


