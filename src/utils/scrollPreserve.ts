/**
 * 擷取目前頁面可能的捲動來源（window / document / .app-content），
 * 供 Modal、confirm、alert、或大量 DOM 更新後還原捲動。
 */
export interface ScrollSnapshot {
  windowX: number
  windowY: number
  documentElementTop: number
  documentElementLeft: number
  bodyTop: number
  bodyLeft: number
  appContentTop: number | null
  appContentLeft: number | null
  appRootTop: number | null
  appRootLeft: number | null
}

function queryAppRoot(): HTMLElement | null {
  return (document.getElementById('app') || document.querySelector('.app')) as HTMLElement | null
}

export function readScrollSnapshot(): ScrollSnapshot {
  const ac = document.querySelector('.app-content') as HTMLElement | null
  const root = queryAppRoot()
  return {
    windowX: window.scrollX,
    windowY: window.scrollY,
    documentElementTop: document.documentElement.scrollTop,
    documentElementLeft: document.documentElement.scrollLeft,
    bodyTop: document.body.scrollTop,
    bodyLeft: document.body.scrollLeft,
    appContentTop: ac ? ac.scrollTop : null,
    appContentLeft: ac ? ac.scrollLeft : null,
    appRootTop: root ? root.scrollTop : null,
    appRootLeft: root ? root.scrollLeft : null
  }
}

/** 還原捲動；rAF + setTimeout 讓 layout／Vue 更新後再套一次 */
export function restoreScrollSnapshot(s: ScrollSnapshot): void {
  const apply = () => {
    window.scrollTo(s.windowX, s.windowY)
    document.documentElement.scrollTop = s.documentElementTop
    document.documentElement.scrollLeft = s.documentElementLeft
    document.body.scrollTop = s.bodyTop
    document.body.scrollLeft = s.bodyLeft
    const ac = document.querySelector('.app-content') as HTMLElement | null
    if (ac && s.appContentTop != null && s.appContentLeft != null) {
      ac.scrollTop = s.appContentTop
      ac.scrollLeft = s.appContentLeft
    }
    const root = queryAppRoot()
    if (root && s.appRootTop != null && s.appRootLeft != null) {
      root.scrollTop = s.appRootTop
      root.scrollLeft = s.appRootLeft
    }
  }
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(() => {
      apply()
      setTimeout(apply, 0)
    })
  })
}

/** @deprecated 請優先用 readScrollSnapshot；兼容舊呼叫 */
export function readWindowScroll(): { x: number; y: number } {
  return {
    x: window.scrollX || document.documentElement.scrollLeft || 0,
    y: window.scrollY || document.documentElement.scrollTop || 0
  }
}

/** @deprecated 請優先用 restoreScrollSnapshot；僅還原 window 捲動 */
export function restoreWindowScroll(pos: { x: number; y: number }): void {
  requestAnimationFrame(() => {
    window.scrollTo(pos.x, pos.y)
    requestAnimationFrame(() => {
      window.scrollTo(pos.x, pos.y)
    })
  })
}

/** 避免原生 alert 結束後捲動跳到頁首 */
export function scrollPreservingAlert(message: string): void {
  const snap = readScrollSnapshot()
  window.alert(message)
  restoreScrollSnapshot(snap)
}

/** 避免原生 confirm 結束後捲動跳到頁首 */
export function scrollPreservingConfirm(message: string): boolean {
  const snap = readScrollSnapshot()
  const ok = window.confirm(message)
  restoreScrollSnapshot(snap)
  return ok
}
