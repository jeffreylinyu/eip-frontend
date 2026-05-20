/**
 * 共用格式化工具
 * 提供統一的數據格式化功能
 */

/**
 * 金額格式化函數
 * @param amount 金額（字串或數字）
 * @returns 格式化後的金額字串
 */
export const formatAmount = (amount: string | number): string => {
  if (!amount) return '0'
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '0'
  
  // 如果金額大於等於 10000，使用萬為單位
  if (numAmount >= 10000) {
    const wanAmount = numAmount / 10000
    if (wanAmount >= 100) {
      // 大於等於 100 萬時，顯示整數
      return `${Math.round(wanAmount)}萬`
    } else {
      // 小於 100 萬時，顯示一位小數
      return `${wanAmount.toFixed(1)}萬`
    }
  } else {
    // 小於 10000 時，使用逗號分隔
    return numAmount.toLocaleString('zh-TW')
  }
}

/**
 * 日期格式化函數
 * @param date 日期字串或 Date 對象
 * @param format 格式類型：'date' | 'datetime' | 'time'
 * @returns 格式化後的日期字串
 */
export const formatDate = (date: string | Date, format: 'date' | 'datetime' | 'time' = 'date'): string => {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  const hours = String(dateObj.getHours()).padStart(2, '0')
  const minutes = String(dateObj.getMinutes()).padStart(2, '0')
  const seconds = String(dateObj.getSeconds()).padStart(2, '0')
  
  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`
    case 'datetime':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    case 'time':
      return `${hours}:${minutes}:${seconds}`
    default:
      return `${year}-${month}-${day}`
  }
}

/**
 * 數字格式化函數（帶逗號分隔）
 * @param num 數字
 * @returns 格式化後的數字字串
 */
export const formatNumber = (num: number | string): string => {
  if (!num) return '0'
  
  const numValue = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(numValue)) return '0'
  
  return numValue.toLocaleString('zh-TW')
}

/**
 * 將金額轉為口語化中文（以「萬」為基底）
 * 例：2220萬 → 2千2百20萬；2億5千萬；9800 → 9千8百元
 */
export const formatAmountColloquialChinese = (
  raw: number | string | null | undefined
): string => {
  if (raw === null || raw === undefined || raw === '') return ''

  const n = Math.floor(Number(String(raw).replace(/[^\d]/g, '')))
  if (!Number.isFinite(n) || n <= 0) return ''

  const toUnder10kText = (v: number, suffix: string): string => {
    if (v <= 0) return ''

    const qian = Math.floor(v / 1000)
    const bai = Math.floor((v % 1000) / 100)
    const shi = Math.floor((v % 100) / 10)
    const ge = v % 10

    let s = ''
    if (qian) s += `${qian}千`
    if (bai) s += `${bai}百`

    const shiPart = shi * 10 + ge
    if (shiPart) s += `${shiPart}`

    return `${s}${suffix}`
  }

  const toWanText = (wan: number): string => {
    if (wan <= 0) return ''
    if (wan < 10) return `${wan}萬`
    return toUnder10kText(wan, '萬')
  }

  if (n < 10000) return toUnder10kText(n, '元')

  const zhao = Math.floor(n / 1000000000000)
  const yi = Math.floor((n % 1000000000000) / 100000000)
  const wan = Math.floor((n % 100000000) / 10000)
  const yuan = n % 10000

  const zhaoText = zhao > 0 ? `${zhao}兆` : ''
  const yiText = yi > 0 ? `${yi}億` : ''
  const wanText = toWanText(wan)
  const yuanText = toUnder10kText(yuan, '元')

  return `${zhaoText}${yiText}${wanText}${yuanText}`
}

/**
 * 百分比格式化函數
 * @param value 數值
 * @param decimals 小數位數，預設為 0
 * @returns 格式化後的百分比字串
 */
export const formatPercentage = (value: number | string, decimals: number = 0): string => {
  if (!value) return '0%'
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '0%'
  
  return `${numValue.toFixed(decimals)}%`
}

/**
 * 文件大小格式化函數
 * @param bytes 位元組數
 * @returns 格式化後的文件大小字串
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * 電話號碼格式化函數
 * @param phone 電話號碼
 * @returns 格式化後的電話號碼字串
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return ''
  
  // 移除所有非數字字符
  const cleaned = phone.replace(/\D/g, '')
  
  // 台灣手機號碼格式
  if (cleaned.length === 10 && cleaned.startsWith('09')) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  // 台灣市話格式
  if (cleaned.length === 9 || cleaned.length === 10) {
    if (cleaned.startsWith('02')) {
      // 台北市
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    } else {
      // 其他縣市
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
  }
  
  return phone
}

/**
 * 統一社會信用代碼格式化函數
 * @param code 統一社會信用代碼
 * @returns 格式化後的代碼字串
 */
export const formatUnifiedCode = (code: string): string => {
  if (!code) return ''
  
  // 移除所有非字母數字字符
  const cleaned = code.replace(/[^A-Za-z0-9]/g, '')
  
  if (cleaned.length === 18) {
    return `${cleaned.slice(0, 1)}${cleaned.slice(1, 6)}${cleaned.slice(6, 9)}${cleaned.slice(9, 17)}${cleaned.slice(17)}`
  }
  
  return code
}

/**
 * 西元年轉民國年
 * @param year 西元年
 * @returns 民國年
 */
export const toRepublicYear = (year: number): number => {
  return year - 1911
}

/** 基本資料預覽等 API 回傳之日期欄位 key */
export const BASIC_PREVIEW_DATE_FIELD_KEYS = new Set([
  'constructionStartDate',
  'constructionEndDate',
  'signDate',
  'constructionConfirmDate'
])

/**
 * 將 yyyy-MM-dd 或含時間的 ISO 字串轉為「民國○○年○月○日」；已是民國格式則原樣回傳。
 */
export function formatRepublicDateFromIso(value: string | null | undefined): string {
  if (value == null || value === '' || value === '—') return '—'
  if (/民國/.test(value)) return value
  const m = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!m) return value
  const roc = parseInt(m[1], 10) - 1911
  return `民國${roc}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`
}

export function formatBasicPreviewFieldDisplay(key: string, display: string): string {
  if (BASIC_PREVIEW_DATE_FIELD_KEYS.has(key)) {
    return formatRepublicDateFromIso(display)
  }
  return display
}

/** ProjectForm 表單日期欄位（snake_case） */
export const PROJECT_FORM_DATE_FIELD_KEYS = new Set([
  'sign_date',
  'start_date',
  'completion_date',
  'construction_confirm_date'
])

/** 表單唯讀資訊列：民國日期；空值顯示「－」 */
export function formatProjectFormDateDisplay(value: string | null | undefined): string {
  const s = formatRepublicDateFromIso(value)
  return s === '—' ? '－' : s
}
