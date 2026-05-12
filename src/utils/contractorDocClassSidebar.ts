/**
 * 營造端「文件檔案分類表（B / E / G / R / T / Q 類）」依分類項目動態產生 sidebar。
 *
 * 與監造端 `supervisoryBPlanSidebar.ts` 一致：採用「**單一事件**」設計，
 * sidebar store 收到事件後一次重新載入所有 6 類動態項目，因為
 * `ContractorDocumentClassification.vue` 的 handler 不分類別共用、且重複請求成本極低。
 *
 * 注意：營造端另有既有事件 `contractor-sidebar-p-menu-refresh`，
 * 由 `contractorPMenuSidebar.ts` 提供，用於既有的 P 類動態項目。
 * 兩者各自獨立、互不干擾；handler 端應「**無條件雙 dispatch**」。
 */
export function requestContractorDocClassSidebarRefresh(): void {
  window.dispatchEvent(new Event('contractor-sidebar-doc-class-refresh'))
}
