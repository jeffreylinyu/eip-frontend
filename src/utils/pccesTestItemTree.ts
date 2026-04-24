/**
 * 工程項目標單樹狀「試驗項」勾選：父層三態 + 僅葉節點持久化
 */

export interface PccesTestItemTreeNode {
  id: string
  isTestItem?: boolean
  children?: PccesTestItemTreeNode[]
}

export function getTestItemRowSource(row: any): { isTestItem?: boolean; id?: string } {
  return row?.taskData ?? row
}

function getNodeChildren(node: any): any[] | null {
  if (!node) return null
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

export function isTestItemTreeParentNode(data: any): boolean {
  if (data?.hasChildRecords === true) return true
  const kids = getNodeChildren(data)
  return kids != null && kids.length > 0
}

export function collectTestItemDescendantLeafRows(node: any): any[] {
  const children = getNodeChildren(node)
  if (!children?.length) {
    return [getTestItemRowSource(node)]
  }
  return children.flatMap((c) => collectTestItemDescendantLeafRows(c))
}

export type TestItemGroupState = 'all' | 'none' | 'some'

export function getTestItemGroupState(leaves: { isTestItem?: boolean }[]): TestItemGroupState {
  if (leaves.length === 0) return 'none'
  const checked = leaves.filter((l) => l.isTestItem === true).length
  if (checked === 0) return 'none'
  if (checked === leaves.length) return 'all'
  return 'some'
}

export function getNextBulkTestItemValue(current: TestItemGroupState): boolean {
  return current !== 'all'
}

export function syncTreeTestItemFlagsFromFlat<T extends PccesTestItemTreeNode>(
  treeRoots: T[],
  flatItems: { id: string; isTestItem?: boolean }[]
): void {
  const map = new Map(flatItems.map((i) => [i.id, i]))
  function walk(nodes: T[]): void {
    for (const n of nodes) {
      const f = map.get(String(n.id))
      if (f) n.isTestItem = !!f.isTestItem
      if (n.children?.length) walk(n.children as T[])
    }
  }
  walk(treeRoots)
}
