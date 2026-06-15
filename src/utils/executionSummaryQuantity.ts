import type { ExecutionSummaryItem } from '@/types/dailyReport'

/** 本日之前的累計數量（由後端回傳之累計與本日數量推算） */
export function getHistoricalCumulative(item: ExecutionSummaryItem): number {
  if (item.historicalCumulative != null && Number.isFinite(item.historicalCumulative)) {
    return item.historicalCumulative
  }
  return (item.cumulativeQuantity ?? 0) - (item.todayQuantity ?? 0)
}

/** 顯示用累計完成數量 = 歷史累計 + 本日完成數量 */
export function getDisplayedCumulativeQuantity(item: ExecutionSummaryItem): number {
  return getHistoricalCumulative(item) + (item.todayQuantity ?? 0)
}
