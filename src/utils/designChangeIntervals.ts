import type { DesignChangeItem } from '@/api/designChange'

export interface IntervalISO {
  /** YYYY-MM-DD */
  start: string | null
  /** YYYY-MM-DD，若 openEnded=true 則可為 null */
  end: string | null
  /** 是否為開放區間（迄今） */
  openEnded: boolean
}

function toDateOnly(s: string | null | undefined): string | null {
  if (!s) return null
  const part = String(s).trim().split('T')[0]
  return part || null
}

function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function clampEndNotBeforeStart(start: string | null, end: string | null): string | null {
  if (!start || !end) return end
  return end < start ? start : end
}

/**
 * 計算「原契約」區間（起日=訂約日期）。
 * - end：若有第一筆變更設計則 = first.effectiveDate - 1；否則 = projectEndDate（若無則 openEnded）
 * - 若 end < signDate：夾到 signDate（避免倒序；通常代表舊資料或同日）
 */
export function getOriginalContractIntervalISO(input: {
  signDate?: string | null
  designChangeList: DesignChangeItem[]
  projectEndDate?: string | null
}): IntervalISO {
  const sign = toDateOnly(input.signDate) ?? null
  if (!sign) return { start: null, end: null, openEnded: false }

  const list = [...(input.designChangeList || [])].sort(
    (a, b) => (toDateOnly(a.effectiveDate) ?? '').localeCompare(toDateOnly(b.effectiveDate) ?? '')
  )
  const firstStart = toDateOnly(list[0]?.effectiveDate) ?? null
  if (firstStart) {
    const end = clampEndNotBeforeStart(sign, addDays(firstStart, -1))
    return { start: sign, end, openEnded: false }
  }

  const projectEnd = toDateOnly(input.projectEndDate) ?? null
  if (projectEnd) return { start: sign, end: clampEndNotBeforeStart(sign, projectEnd), openEnded: false }
  return { start: sign, end: null, openEnded: true }
}

/**
 * 計算指定變更設計版本的區間（起日=effectiveDate）。
 * - 優先使用後端 effectiveEndDate（若有）。
 * - 否則 end = 下一筆 effectiveDate - 1；若無下一筆則用 projectEndDate（若無則 openEnded）。
 * - 若 end < start：夾到 start（避免倒序）。
 */
export function getDesignChangeIntervalISO(input: {
  item: DesignChangeItem
  index: number
  designChangeList: DesignChangeItem[]
  projectEndDate?: string | null
}): IntervalISO {
  const start = toDateOnly(input.item.effectiveDate) ?? null
  if (!start) return { start: null, end: null, openEnded: false }

  const explicitEnd = toDateOnly(input.item.effectiveEndDate) ?? null
  if (explicitEnd) return { start, end: clampEndNotBeforeStart(start, explicitEnd), openEnded: false }

  const list = input.designChangeList || []
  const next = list[input.index + 1]
  const nextStart = toDateOnly(next?.effectiveDate) ?? null
  if (nextStart) {
    const end = clampEndNotBeforeStart(start, addDays(nextStart, -1))
    return { start, end, openEnded: false }
  }

  const projectEnd = toDateOnly(input.projectEndDate) ?? null
  if (projectEnd) return { start, end: clampEndNotBeforeStart(start, projectEnd), openEnded: false }
  return { start, end: null, openEnded: true }
}

/** 以列表回傳：原契約 + 各變更設計（區間不含版本名稱） */
export function getAllVersionIntervalsISO(input: {
  signDate?: string | null
  designChangeList: DesignChangeItem[]
  projectEndDate?: string | null
}): { id: number | null; interval: IntervalISO }[] {
  const list = input.designChangeList || []
  const original = getOriginalContractIntervalISO({
    signDate: input.signDate,
    designChangeList: list,
    projectEndDate: input.projectEndDate
  })
  const versions = list.map((d, idx) => ({
    id: d.id,
    interval: getDesignChangeIntervalISO({ item: d, index: idx, designChangeList: list, projectEndDate: input.projectEndDate })
  }))
  return [{ id: null, interval: original }, ...versions]
}

