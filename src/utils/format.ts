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
