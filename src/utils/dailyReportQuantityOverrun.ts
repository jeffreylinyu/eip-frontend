import type { ExecutionSummaryItem, MaterialUsageSummaryItem } from '@/types/dailyReport'
import { getDisplayedCumulativeQuantity } from '@/utils/executionSummaryQuantity'

export interface QuantityOverrunInfo {
  contractQuantity: number
  cumulativeQuantity: number
  overrunQuantity: number
}

function formatQuantity(value: number): string {
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

/** 契約數量為空、0 或非數字時不進行超出比對 */
export function parseContractQuantity(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value
}

export function getQuantityOverrun(
  cumulative: number | null | undefined,
  contract: number | null | undefined
): QuantityOverrunInfo | null {
  const contractQuantity = parseContractQuantity(contract)
  if (contractQuantity == null) return null

  const cumulativeQuantity = cumulative ?? 0
  if (!Number.isFinite(cumulativeQuantity) || cumulativeQuantity <= contractQuantity) {
    return null
  }

  return {
    contractQuantity,
    cumulativeQuantity,
    overrunQuantity: cumulativeQuantity - contractQuantity
  }
}

export function formatOverrunTooltip(info: QuantityOverrunInfo, unit?: string): string {
  const unitSuffix = unit?.trim() ? ` ${unit.trim()}` : ''
  return [
    `契約 ${formatQuantity(info.contractQuantity)}${unitSuffix}`,
    `累計 ${formatQuantity(info.cumulativeQuantity)}${unitSuffix}`,
    `超出 ${formatQuantity(info.overrunQuantity)}${unitSuffix}`
  ].join('｜')
}

export function formatOverrunDisplayValue(
  cumulative: number,
  info: QuantityOverrunInfo | null
): string {
  const base = formatQuantity(cumulative)
  if (!info) return base
  return `${base}（+${formatQuantity(info.overrunQuantity)}）`
}

export function getExecutionItemOverrun(item: ExecutionSummaryItem): QuantityOverrunInfo | null {
  if (!item.fillable) return null
  return getQuantityOverrun(getDisplayedCumulativeQuantity(item), item.contractQuantity)
}

export function getMaterialItemOverrun(item: MaterialUsageSummaryItem): QuantityOverrunInfo | null {
  return getQuantityOverrun(item.cumulativeUsage, item.contractQuantity)
}

export function countExecutionOverruns(items: ExecutionSummaryItem[]): number {
  let count = 0
  for (const item of items) {
    if (getExecutionItemOverrun(item)) count++
  }
  return count
}

export function countMaterialOverruns(items: MaterialUsageSummaryItem[]): number {
  let count = 0
  for (const item of items) {
    if (getMaterialItemOverrun(item)) count++
  }
  return count
}
