import { useExportLoadingStore } from '@/stores/export-loading'

/**
 * 匯出時顯示可移動小視窗的 loading，支援多個匯出並行與中途取消。
 * 用法：
 *   const { runWithExportLoading } = useExportLoading()
 *   await runWithExportLoading('unique-id', 'B-1 監造計畫', async (signal) => {
 *     const response = await formBApi.exportSupervisoryPlan(request, { signal })
 *     downloadBlobAsFile(response.data, fileName)
 *   })
 * 視窗內可點「取消」中斷請求；fn 會收到 AbortSignal 傳給支援 signal 的 API。
 */
export function useExportLoading() {
  const store = useExportLoadingStore()

  function startExport(id: string, label: string, abort?: () => void) {
    store.addTask(id, label, abort)
  }

  function endExport(id: string) {
    store.removeTask(id)
  }

  async function runWithExportLoading<T>(
    id: string,
    label: string,
    fn: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    const controller = new AbortController()
    startExport(id, label, () => controller.abort())
    try {
      return await fn(controller.signal)
    } finally {
      endExport(id)
    }
  }

  return {
    startExport,
    endExport,
    runWithExportLoading
  }
}
