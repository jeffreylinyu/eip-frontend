import type { CalendarDailyWeather } from '@/api/construction'

/** 將各種日期字串正規化為 YYYY-MM-DD（本地語意） */
export function normalizeCalendarDateKey(date: string): string {
  const trimmed = date.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const isoDatePrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDatePrefix) return isoDatePrefix[1]

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return trimmed

  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface ResolvedCalendarWeather {
  morning: string
  afternoon: string
  /** 上午是否來自使用者編輯 */
  morningFromUser: boolean
  /** 下午是否來自使用者編輯 */
  afternoonFromUser: boolean
}

/** 行事曆顯示／日報帶入：優先使用者天氣，無則 fallback 氣象局彙整 */
export function resolveCalendarDisplayWeather(
  row: CalendarDailyWeather | null | undefined
): ResolvedCalendarWeather {
  if (!row) {
    return { morning: '', afternoon: '', morningFromUser: false, afternoonFromUser: false }
  }

  const userMorning = row.weatherMorning?.trim() || ''
  const userAfternoon = row.weatherAfternoon?.trim() || ''
  const cwaMorning = row.cwaWeatherMorning?.trim() || ''
  const cwaAfternoon = row.cwaWeatherAfternoon?.trim() || ''

  return {
    morning: userMorning || cwaMorning,
    afternoon: userAfternoon || cwaAfternoon,
    morningFromUser: !!userMorning,
    afternoonFromUser: !!userAfternoon,
  }
}

export function hasCalendarWeatherRecord(row: CalendarDailyWeather | null | undefined): boolean {
  const resolved = resolveCalendarDisplayWeather(row)
  return !!(resolved.morning || resolved.afternoon)
}

export function formatCalendarWeatherTooltip(row: CalendarDailyWeather | null | undefined): string {
  if (!row) return ''

  const resolved = resolveCalendarDisplayWeather(row)
  const morningLabel = resolved.morning
    ? resolved.morningFromUser
      ? resolved.morning
      : `${resolved.morning}（氣象局）`
    : '—'
  const afternoonLabel = resolved.afternoon
    ? resolved.afternoonFromUser
      ? resolved.afternoon
      : `${resolved.afternoon}（氣象局）`
    : '—'

  return `上午：${morningLabel}｜下午：${afternoonLabel}`
}
