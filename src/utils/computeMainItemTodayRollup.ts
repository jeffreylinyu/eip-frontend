import type { ExecutionSummaryItem } from '@/types/dailyReport'
import { getDisplayedCumulativeQuantity } from '@/utils/executionSummaryQuantity'

export interface MainItemAmountRollup {
  amount: number
  percent: number | null
}

function buildChildrenByParent(items: ExecutionSummaryItem[]): Map<string, ExecutionSummaryItem[]> {
  const childrenByParent = new Map<string, ExecutionSummaryItem[]>()
  for (const item of items) {
    if (!item.parentLogicalId) continue
    const list = childrenByParent.get(item.parentLogicalId) ?? []
    list.push(item)
    childrenByParent.set(item.parentLogicalId, list)
  }
  return childrenByParent
}

function collectDescendants(
  logicalId: string,
  childrenByParent: Map<string, ExecutionSummaryItem[]>
): ExecutionSummaryItem[] {
  const result: ExecutionSummaryItem[] = []
  const walk = (lid: string) => {
    for (const child of childrenByParent.get(lid) ?? []) {
      result.push(child)
      if (child.logicalId) walk(child.logicalId)
    }
  }
  walk(logicalId)
  return result
}

function computeRollup(
  items: ExecutionSummaryItem[],
  quantityFor: (item: ExecutionSummaryItem) => number
): Map<string, MainItemAmountRollup> {
  const childrenByParent = buildChildrenByParent(items)
  const rollup = new Map<string, MainItemAmountRollup>()
  for (const item of items) {
    if (item.type !== 'MAIN_ITEM' || !item.logicalId) continue
    const mainAmount = item.contractAmount
    const subtotal = collectDescendants(item.logicalId, childrenByParent)
      .filter((d) => d.fillable)
      .reduce((sum, d) => sum + quantityFor(d) * (d.unitPrice ?? 0), 0)
    const roundedAmount = Math.round(subtotal * 100) / 100
    const percent =
      mainAmount != null && mainAmount > 0
        ? Math.round((roundedAmount / mainAmount) * 10000) / 100
        : null
    rollup.set(item.id, { amount: roundedAmount, percent })
  }
  return rollup
}

/** 大項本日完成金額：子樹可填寫項目之本日數量×單價加總，及佔大項總額百分比 */
export function computeMainItemTodayRollupByItemId(
  items: ExecutionSummaryItem[]
): Map<string, MainItemAmountRollup> {
  return computeRollup(items, (d) => d.todayQuantity ?? 0)
}

/** 大項累計完成金額：子樹可填寫項目之累計數量×單價加總，及佔大項總額百分比 */
export function computeMainItemCumulativeRollupByItemId(
  items: ExecutionSummaryItem[]
): Map<string, MainItemAmountRollup> {
  return computeRollup(items, (d) => getDisplayedCumulativeQuantity(d))
}

export function formatAmountWithPercent(
  amount: number | null | undefined,
  percent: number | null | undefined
): string {
  if (amount === null || amount === undefined) return '—'
  const amountText = amount.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
  if (percent === null || percent === undefined) return amountText
  const percentText = percent.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
  return `${amountText} (${percentText}%)`
}
