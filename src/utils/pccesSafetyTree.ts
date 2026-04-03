/**
 * 工程項目標單樹狀「安全衛生設施」勾選：父層三態 + 僅葉節點持久化
 */

export interface PccesSafetyTreeNode {
  id: string
  isSafetyHealthFacility?: boolean
  children?: PccesSafetyTreeNode[]
}

/**
 * Syncfusion TreeGrid 列物件為 extend({}, treeNode)，布林欄位為淺拷貝；
 * 真實資料在 taskData（指向原始樹節點），勾選／三態務必讀寫此參照。
 */
export function getSafetyRowSource(row: any): { isSafetyHealthFacility?: boolean; id?: string } {
  return row?.taskData ?? row
}

/**
 * Syncfusion TreeGrid 內部列：可能用 hasChildRecords / childRecords，
 * 不一定還帶有原始樹狀的 children（或僅在 taskData 上）。
 */
function getNodeChildren(node: any): any[] | null {
  if (!node) return null
  // 內部 flat 列常見：子列陣列
  if (Array.isArray(node.childRecords) && node.childRecords.length > 0) {
    return node.childRecords
  }
  const src = node.taskData ?? node
  if (Array.isArray(src?.children) && src.children.length > 0) {
    return src.children
  }
  if (Array.isArray(node.children) && node.children.length > 0) {
    return node.children
  }
  return null
}

/** 有子節點＝群組列（僅葉節點寫入後端） */
export function isSafetyTreeParentNode(data: any): boolean {
  if (data?.hasChildRecords === true) return true
  const kids = getNodeChildren(data)
  return kids != null && kids.length > 0
}

/** 取得子樹中所有「葉節點」對應的來源物件（優先 taskData，供寫入與三態計算） */
export function collectDescendantLeafRows(node: any): any[] {
  const children = getNodeChildren(node)
  if (!children?.length) {
    return [getSafetyRowSource(node)]
  }
  return children.flatMap((c) => collectDescendantLeafRows(c))
}

export type SafetyGroupState = 'all' | 'none' | 'some'

/** 依葉節點勾選情形決定父層三態 */
export function getSafetyGroupState(
  leaves: { isSafetyHealthFacility?: boolean }[]
): SafetyGroupState {
  if (leaves.length === 0) return 'none'
  const checked = leaves.filter((l) => l.isSafetyHealthFacility === true).length
  if (checked === 0) return 'none'
  if (checked === leaves.length) return 'all'
  return 'some'
}

/**
 * 點擊父層勾選的下一目標值（全勾時改為全不勾；未勾或半選時改為全勾）
 */
export function getNextBulkSafetyValue(current: SafetyGroupState): boolean {
  return current !== 'all'
}

/**
 * 僅將平面 items 上的「安全衛生設施」勾選同步到現有樹狀資料（不重建樹），
 * 以保留 Syncfusion TreeGrid 的展開／收合狀態與捲動位置。
 */
export function syncTreeSafetyFlagsFromFlat<T extends PccesSafetyTreeNode>(
  treeRoots: T[],
  flatItems: { id: string; isSafetyHealthFacility?: boolean }[]
): void {
  const map = new Map(flatItems.map((i) => [i.id, i]))
  function walk(nodes: T[]): void {
    for (const n of nodes) {
      const f = map.get(String(n.id))
      if (f) n.isSafetyHealthFacility = !!f.isSafetyHealthFacility
      if (n.children?.length) walk(n.children as T[])
    }
  }
  walk(treeRoots)
}
