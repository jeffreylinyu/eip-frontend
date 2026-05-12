/**
 * 監造端「文件檔案分類表（B / C / D / H / I / L 類）」依分類項目動態產生 sidebar。
 *
 * 與營造端 P 類做法一致（見 `contractorPMenuSidebar.ts`）：
 * 任何頁面新增／更新／刪除／批次更新分類表項目後呼叫此函式，
 * sidebar store 會收到事件、清除快取並立即重新載入動態項目。
 *
 * 第二版改為「**統一一個事件**」（不分 category），sidebar 收到後一次重新載入所有 6 類，
 * 因為 `DocumentClassification.vue` 的 handler 不分類別共用、且重複請求成本極低。
 */
export function requestSupervisoryDocClassSidebarRefresh(): void {
  window.dispatchEvent(new Event('supervisory-sidebar-doc-class-refresh'))
}

/**
 * @deprecated 改用 [requestSupervisoryDocClassSidebarRefresh]。保留為 alias 以避免破壞既有呼叫端。
 */
export function requestSupervisoryBPlanSidebarRefresh(): void {
  requestSupervisoryDocClassSidebarRefresh()
}
