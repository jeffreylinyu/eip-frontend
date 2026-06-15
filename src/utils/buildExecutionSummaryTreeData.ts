import type { ExecutionSummaryItem } from '@/types/dailyReport'

export interface ExecutionSummaryTreeNode {
  id: string
  logicalId?: string
  itemNo: string
  code: string
  name: string
  type?: string | null
  unit: string
  contractQuantity: number | null
  contractAmount?: number | null
  contractAmountPercent?: number | null
  unitPrice?: number | null
  todayAmount?: number | null
  todayAmountPercent?: number | null
  todayQuantity: number | null
  cumulativeQuantity: number | null
  remark: string
  fillable: boolean
  executionRowKind?: ExecutionSummaryItem['executionRowKind']
  children?: ExecutionSummaryTreeNode[]
}

/** 將扁平施工項目轉為 TreeGrid 樹狀資料（順序沿用後端 DFS） */
export function buildExecutionSummaryTreeData(
  items: ExecutionSummaryItem[]
): ExecutionSummaryTreeNode[] {
  const childrenMap = new Map<string, ExecutionSummaryItem[]>()
  const roots: ExecutionSummaryItem[] = []

  for (const item of items) {
    const parentKey = item.parentLogicalId
    if (!parentKey) {
      roots.push(item)
    } else {
      const list = childrenMap.get(parentKey) ?? []
      list.push(item)
      childrenMap.set(parentKey, list)
    }
  }

  const buildNode = (item: ExecutionSummaryItem): ExecutionSummaryTreeNode => {
    const children = item.logicalId ? childrenMap.get(item.logicalId) : undefined
    const node: ExecutionSummaryTreeNode = {
      id: item.id,
      logicalId: item.logicalId,
      itemNo: item.itemNo || '',
      code: item.code || '',
      name: item.item,
      type: item.type ?? null,
      unit: item.unit || '',
      contractQuantity: item.contractQuantity ?? null,
      contractAmount: item.contractAmount ?? null,
      contractAmountPercent: item.contractAmountPercent ?? null,
      unitPrice: item.unitPrice ?? null,
      todayAmount: item.todayAmount ?? null,
      todayAmountPercent: item.todayAmountPercent ?? null,
      todayQuantity: item.todayQuantity ?? null,
      cumulativeQuantity: item.cumulativeQuantity ?? null,
      remark: item.remark || '',
      fillable: item.fillable ?? false,
      executionRowKind: item.executionRowKind
    }
    if (children && children.length > 0) {
      node.children = children.map(buildNode)
    }
    return node
  }

  return roots.map(buildNode)
}
