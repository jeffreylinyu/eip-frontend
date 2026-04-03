/**
 * P-4 與工程項目標單頁共用：安全衛生設施樹狀勾選（父層三態、葉節點寫入 API）
 * Syncfusion TreeGrid 列為淺拷貝，勾選狀態須讀寫 taskData（與樹狀來源同源）
 */
import { ref, nextTick, type Ref } from 'vue'
import {
  batchUpdatePccesCodeSafetyHealthFacility,
  updatePccesCodeSafetyHealthFacility
} from '@/api/pcces'
import {
  collectDescendantLeafRows,
  getNextBulkSafetyValue,
  getSafetyGroupState,
  isSafetyTreeParentNode,
  syncTreeSafetyFlagsFromFlat,
  getSafetyRowSource,
  type SafetyGroupState
} from '@/utils/pccesSafetyTree'

export interface PccesSafetyFlatItem {
  id: string
  isSafetyHealthFacility: boolean
}

export function usePccesSafetyHealthTreeGrid(options: {
  items: Ref<PccesSafetyFlatItem[]>
  treeGridData: Ref<any[]>
  getConstructionId: () => string
  getDesignChangeId: () => number | null
  /** 預設 window.alert */
  alert?: (msg: string) => void
}) {
  const savingSafetyId = ref<string | null>(null)
  const savingSafetyBatch = ref(false)
  /** 遞增以強制 TreeGrid 欄位模板重算（列資料非響應式時必須） */
  const safetyUiVersion = ref(0)
  const alertFn = options.alert ?? ((msg: string) => window.alert(msg))

  /**
   * 父層三態（依賴 safetyUiVersion，讓 Vue 在樂觀更新後重繪）
   */
  function getParentSafetyGroupState(data: any): SafetyGroupState {
    void safetyUiVersion.value
    return getSafetyGroupState(collectDescendantLeafRows(data))
  }

  /**
   * 將平面 items 同步到樹狀 taskData，並強制觸發 Vue + Syncfusion 綁定更新（不呼叫 refresh，避免收合展開）
   */
  async function syncSafetyUiFromItems() {
    syncTreeSafetyFlagsFromFlat(options.treeGridData.value, options.items.value)
    const roots = options.treeGridData.value
    if (roots.length) {
      options.treeGridData.value = roots.slice()
    }
    await nextTick()
    safetyUiVersion.value++
  }

  async function onParentSafetyHealthChange(data: any, e: Event) {
    e.preventDefault()
    e.stopPropagation()
    if (savingSafetyBatch.value) return
    const cid = options.getConstructionId()
    if (!cid) return
    const leaves = collectDescendantLeafRows(data)
    if (leaves.length === 0) return
    const current = getSafetyGroupState(leaves)
    const nextTarget = getNextBulkSafetyValue(current)
    const ids = leaves
      .map((l) => parseInt(String(l.id), 10))
      .filter((n) => !Number.isNaN(n))
    if (ids.length === 0) return

    // 1) 樂觀更新：先用前端目標值更新 items + 樹，父層三態會立刻重算
    const prevById = new Map<number, boolean>()
    for (const id of ids) {
      const flat = options.items.value.find((i) => i.id === String(id))
      if (flat) {
        prevById.set(id, flat.isSafetyHealthFacility)
        flat.isSafetyHealthFacility = nextTarget
      }
    }
    await syncSafetyUiFromItems()

    savingSafetyBatch.value = true
    try {
      await batchUpdatePccesCodeSafetyHealthFacility({
        constructionId: cid,
        designChangeId: options.getDesignChangeId(),
        ids,
        isSafetyHealthFacility: nextTarget
      })
      // 2) 後端成功：再同步一次（與伺服器寫入一致）
      await syncSafetyUiFromItems()
    } catch (err: any) {
      // 失敗：回滾前端
      for (const [id, prev] of prevById) {
        const flat = options.items.value.find((i) => i.id === String(id))
        if (flat) flat.isSafetyHealthFacility = prev
      }
      await syncSafetyUiFromItems()
      alertFn(err?.response?.data?.message ?? err?.message ?? '批次更新失敗')
    } finally {
      savingSafetyBatch.value = false
    }
  }

  async function onSafetyHealthChange(data: { id: string }, e: Event) {
    const input = e.target as HTMLInputElement
    const checked = input.checked
    const numId = parseInt(String(data.id), 10)
    if (!options.getConstructionId() || Number.isNaN(numId)) return

    const flat = options.items.value.find((i) => i.id === String(data.id))
    if (!flat) return
    const prev = flat.isSafetyHealthFacility

    // 1) 樂觀更新（使用者已勾選／取消，先與 items、樹一致）
    flat.isSafetyHealthFacility = checked
    await syncSafetyUiFromItems()

    savingSafetyId.value = String(data.id)
    try {
      await updatePccesCodeSafetyHealthFacility(
        options.getConstructionId(),
        numId,
        checked,
        options.getDesignChangeId()
      )
      await syncSafetyUiFromItems()
    } catch (err: any) {
      flat.isSafetyHealthFacility = prev
      input.checked = prev
      await syncSafetyUiFromItems()
      alertFn(err?.response?.data?.message ?? err?.message ?? '更新失敗')
    } finally {
      savingSafetyId.value = null
    }
  }

  function isSafetyChecked(row: any): boolean {
    void safetyUiVersion.value
    return getSafetyRowSource(row).isSafetyHealthFacility === true
  }

  return {
    savingSafetyId,
    savingSafetyBatch,
    safetyUiVersion,
    getParentSafetyGroupState,
    onParentSafetyHealthChange,
    onSafetyHealthChange,
    isSafetyTreeParentNode,
    getSafetyRowSource,
    isSafetyChecked
  }
}
