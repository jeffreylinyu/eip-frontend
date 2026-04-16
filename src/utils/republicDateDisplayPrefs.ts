import { ref } from 'vue'

const STORAGE_KEY = 'cm.republicDateShowLiteral'

function readFromStorage(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === '1' || v === 'true') return true
    if (v === '0' || v === 'false') return false
  } catch {
    /* ignore */
  }
  return false
}

/**
 * 民國年日期顯示是否帶「民國」二字前綴（全站 RepublicDatePicker 預設讀此值；預設 false）。
 * 可呼叫 setRepublicDateShowLiteral 或寫入 localStorage 鍵 `cm.republicDateShowLiteral`（'1'/'0'）調整。
 */
export const republicDateShowLiteralRef = ref(readFromStorage())

export function setRepublicDateShowLiteral(show: boolean): void {
  republicDateShowLiteralRef.value = show
  try {
    localStorage.setItem(STORAGE_KEY, show ? '1' : '0')
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      republicDateShowLiteralRef.value = readFromStorage()
    }
  })
}
