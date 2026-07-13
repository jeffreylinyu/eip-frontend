// 施工進度2 共用日期工具（甘特圖 / S 曲線）
export const DAY_MS = 24 * 60 * 60 * 1000

/** 解析 YYYY-MM-DD 為當地時區當日 00:00；無效回傳 null */
export const parseYmd = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export const toYmd = (date: Date): string => {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const da = String(date.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** b - a 的天數差（整數） */
export const diffDays = (a: Date, b: Date): number =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS)

/** 含首尾的工期天數；end < start 回傳 0 */
export const inclusiveDays = (start: Date, end: Date): number => {
  const diff = diffDays(start, end)
  return diff >= 0 ? diff + 1 : 0
}

/** 顯示用：YYYY/MM/DD */
export const formatDisplay = (date: Date): string => {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const da = String(date.getDate()).padStart(2, '0')
  return `${y}/${mo}/${da}`
}
