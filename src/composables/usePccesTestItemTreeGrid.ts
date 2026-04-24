/**
 * 工程項目標單：試驗項樹狀勾選（父層三態、葉節點寫入 API）
 */
import { ref, nextTick, type Ref } from 'vue'
import { batchUpdatePccesCodeTestItem, updatePccesCodeTestItem } from '@/api/pcces'
import {
  collectTestItemDescendantLeafRows,
  getNextBulkTestItemValue,
  getTestItemGroupState,
  isTestItemTreeParentNode,
  syncTreeTestItemFlagsFromFlat,
  getTestItemRowSource,
  type TestItemGroupState
} from '@/utils/pccesTestItemTree'

export interface PccesTestItemFlatItem {
  id: string
  isTestItem: boolean
}

export function usePccesTestItemTreeGrid(options: {
  items: Ref<PccesTestItemFlatItem[]>
  treeGridData: Ref<any[]>
  getConstructionId: () => string
  getDesignChangeId: () => number | null
  alert?: (msg: string) => void
}) {
  const savingTestItemId = ref<string | null>(null)
  const savingTestItemBatch = ref(false)
  const testItemUiVersion = ref(0)
  const alertFn = options.alert ?? ((msg: string) => window.alert(msg))

  function getParentTestItemGroupState(data: any): TestItemGroupState {
    void testItemUiVersion.value
    return getTestItemGroupState(collectTestItemDescendantLeafRows(data))
  }

  async function syncTestItemUiFromItems() {
    syncTreeTestItemFlagsFromFlat(options.treeGridData.value, options.items.value)
    const roots = options.treeGridData.value
    if (roots.length) {
      options.treeGridData.value = roots.slice()
    }
    await nextTick()
    testItemUiVersion.value++
  }

  async function onParentTestItemChange(data: any, e: Event) {
    e.preventDefault()
    e.stopPropagation()
    if (savingTestItemBatch.value) return
    const cid = options.getConstructionId()
    if (!cid) return
    const leaves = collectTestItemDescendantLeafRows(data)
    if (leaves.length === 0) return
    const current = getTestItemGroupState(leaves)
    const nextTarget = getNextBulkTestItemValue(current)
    const ids = leaves
      .map((l) => parseInt(String(l.id), 10))
      .filter((n) => !Number.isNaN(n))
    if (ids.length === 0) return

    const prevById = new Map<number, boolean>()
    for (const id of ids) {
      const flat = options.items.value.find((i) => i.id === String(id))
      if (flat) {
        prevById.set(id, flat.isTestItem)
        flat.isTestItem = nextTarget
      }
    }
    await syncTestItemUiFromItems()

    savingTestItemBatch.value = true
    try {
      await batchUpdatePccesCodeTestItem({
        constructionId: cid,
        designChangeId: options.getDesignChangeId(),
        ids,
        isTestItem: nextTarget
      })
      await syncTestItemUiFromItems()
    } catch (err: any) {
      for (const [id, prev] of prevById) {
        const flat = options.items.value.find((i) => i.id === String(id))
        if (flat) flat.isTestItem = prev
      }
      await syncTestItemUiFromItems()
      alertFn(err?.response?.data?.message ?? err?.message ?? '批次更新失敗')
    } finally {
      savingTestItemBatch.value = false
    }
  }

  async function onTestItemChange(data: { id: string }, e: Event) {
    const input = e.target as HTMLInputElement
    const checked = input.checked
    const numId = parseInt(String(data.id), 10)
    if (!options.getConstructionId() || Number.isNaN(numId)) return

    const flat = options.items.value.find((i) => i.id === String(data.id))
    if (!flat) return
    const prev = flat.isTestItem

    flat.isTestItem = checked
    await syncTestItemUiFromItems()

    savingTestItemId.value = String(data.id)
    try {
      await updatePccesCodeTestItem(
        options.getConstructionId(),
        numId,
        checked,
        options.getDesignChangeId()
      )
      await syncTestItemUiFromItems()
    } catch (err: any) {
      flat.isTestItem = prev
      input.checked = prev
      await syncTestItemUiFromItems()
      alertFn(err?.response?.data?.message ?? err?.message ?? '更新失敗')
    } finally {
      savingTestItemId.value = null
    }
  }

  function isTestItemChecked(row: any): boolean {
    void testItemUiVersion.value
    return getTestItemRowSource(row).isTestItem === true
  }

  return {
    savingTestItemId,
    savingTestItemBatch,
    testItemUiVersion,
    getParentTestItemGroupState,
    onParentTestItemChange,
    onTestItemChange,
    isTestItemTreeParentNode,
    getTestItemRowSource,
    isTestItemChecked
  }
}
