/**
 * 營造端「P 類(計劃書)表單」側邊欄依文件分類表產生。
 * 使用者編輯分類表後呼叫，會清快取並立即重新載入側邊欄選單。
 */
export function requestContractorPMenuSidebarRefresh(): void {
  window.dispatchEvent(new Event('contractor-sidebar-p-menu-refresh'))
}
