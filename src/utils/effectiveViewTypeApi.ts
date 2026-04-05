const STORAGE_KEY = 'cm.xEffectiveViewType'

export type EffectiveViewHeader = 'SUPERVISORY' | 'CONTRACTOR'

export function setStoredEffectiveViewType(v: EffectiveViewHeader | null): void {
  if (!v) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, v)
}

export function clearStoredEffectiveViewType(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getStoredEffectiveViewType(): EffectiveViewHeader | null {
  const v = localStorage.getItem(STORAGE_KEY)?.trim().toUpperCase()
  if (v === 'SUPERVISORY' || v === 'CONTRACTOR') return v
  return null
}

/**
 * 供 API 請求帶入 X-Effective-View-Type：
 * 有視角路由前綴時以前綴為準；否則用使用者上次在 UI 選的視角（營造選單多為 /forms 等無前綴路由）。
 */
export function resolveEffectiveViewTypeForHttpRequest(): EffectiveViewHeader | null {
  try {
    const path = window.location.hash.replace(/^#/, '') || '/'
    if (path.startsWith('/contractor/')) return 'CONTRACTOR'
    if (path.startsWith('/supervisory/')) return 'SUPERVISORY'
  } catch {
    /* ignore */
  }
  return getStoredEffectiveViewType()
}
