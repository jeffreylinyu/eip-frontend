<template>
  <div class="material-inspection-panel">
    <div class="mi-grid">
      <!-- Left: Materials -->
      <div class="mi-col">
        <div class="border rounded-3 p-3 h-100 mi-card">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="fw-semibold">
              <i class="fa fa-cubes me-2"></i>材料
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">{{ materials.length }}</span>
              <div class="d-flex gap-2">
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  @click="setAllMaterialsUsed(true)"
                  :disabled="!canBatchSetUsed"
                >
                  全選
                </button>
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  @click="setAllMaterialsUsed(false)"
                  :disabled="!canBatchSetUsed"
                >
                  清除
                </button>
              </div>
            </div>
          </div>
          <input v-model="materialKeyword" class="form-control form-control-sm mb-2" placeholder="搜尋材料名稱/編碼/項次" />
          <div class="list-group list-group-flush modal-list">
            <button
              v-for="m in filteredMaterials"
              :key="m.itemCode"
              type="button"
              class="list-group-item list-group-item-action py-2"
              :class="{
                active: selectedMaterialKey === m.itemCode,
                'material-row-disabled': !isMaterialUsed(m.itemCode)
              }"
              :disabled="!m.itemCode"
              @click="selectMaterial(m.itemCode)"
            >
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="text-truncate">
                  <div class="small text-muted">{{ m.itemCode || '—' }}</div>
                  <div class="fw-semibold material-name">{{ m.name }}</div>
                </div>
                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                  <label class="d-flex align-items-center gap-1 small text-muted user-select-none" title="是否使用此材料">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :checked="isMaterialUsed(m.itemCode)"
                      :disabled="savingUsedKey === m.itemCode"
                      @click.stop
                      @change="setMaterialUsed(m.itemCode, ($event.target as HTMLInputElement).checked)"
                    />
                    使用
                  </label>
                  <span class="badge bg-primary-subtle text-primary border border-primary-subtle">
                    {{ getLinkCountForMaterial(m.itemCode) }}
                  </span>
                </div>
              </div>
            </button>
            <div v-if="filteredMaterials.length === 0" class="text-muted small py-3 text-center">沒有符合的材料</div>
          </div>
        </div>
      </div>

      <!-- Middle: Test items (from pcces codes with type=TEST_ITEM) -->
      <div class="mi-col">
        <div class="border rounded-3 p-3 h-100 mi-card">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="fw-semibold">
              <i class="fa fa-vial me-2"></i>試驗項
            </div>
            <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">{{ allTestItems.length }}</span>
          </div>

          <input v-model="testItemKeyword" class="form-control form-control-sm mb-2" placeholder="搜尋試驗項名稱/料碼/項次" />
          <div class="list-group list-group-flush modal-list">
            <div
              v-for="t in filteredAllTestItems"
              :key="t.id"
              class="list-group-item py-2"
            >
              <div class="d-flex align-items-start gap-2">
                <input
                  class="form-check-input mt-1 flex-shrink-0"
                  type="checkbox"
                  :disabled="selectedMaterialKey == null || !selectedMaterialUsed"
                  :checked="selectedTestItemIds.has(t.id)"
                  @change="toggleSelectedTestItem(t.id, $event)"
                />
                <div class="flex-grow-1 min-w-0">
                  <div class="small text-muted">{{ t.itemNo || '—' }} / {{ t.pccesCode || '—' }}</div>
                  <div class="fw-semibold" style="word-break:break-word">{{ t.name }}</div>
                </div>
              </div>
            </div>
            <div v-if="filteredAllTestItems.length === 0" class="text-muted small py-3 text-center">
              {{ allTestItems.length === 0 ? '尚無試驗項，請在「標單明細」將類型設為「試驗項」' : '沒有符合的試驗項' }}
            </div>
          </div>
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="selectAllTestItems" :disabled="selectedMaterialKey == null || !selectedMaterialUsed">
              全選
            </button>
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="clearSelectedTestItems" :disabled="selectedMaterialKey == null || !selectedMaterialUsed">
              清除
            </button>
            <button
              class="btn btn-primary btn-sm ms-auto"
              type="button"
              @click="saveForSelectedMaterial"
              :disabled="selectedMaterialKey == null || saving || !selectedMaterialUsed"
              title="取代該材料的關聯清單"
            >
              <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="fa fa-save me-2"></i>儲存此材料關聯
            </button>
          </div>
          <!-- 錯誤訊息顯示在儲存按鈕下方，確保使用者看得到 -->
          <div v-if="saveError" class="alert alert-danger alert-sm py-1 px-2 mt-2 mb-0 small">
            <i class="fa fa-circle-exclamation me-1"></i>{{ saveError }}
          </div>
          <div v-if="selectedMaterialKey == null" class="text-muted small mt-2">
            請先在左側選擇一個材料，才可勾選試驗項與儲存。
          </div>
          <div v-else-if="!selectedMaterialUsed" class="text-muted small mt-2">
            此材料已設為不使用，請先勾選「使用」再儲存關聯。
          </div>
        </div>
      </div>

      <!-- Relations：顯示所有有試驗項關聯的材料，分組可收合 -->
      <div class="mi-col">
        <div class="border rounded-3 p-3 h-100 mi-card">
          <div class="d-flex align-items-center justify-content-between mb-2 gap-2">
            <div class="fw-semibold text-nowrap">
              <i class="fa fa-link me-2"></i>已建立關聯
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
              <span
                class="badge bg-secondary-subtle text-secondary border border-secondary-subtle"
                :title="`${groupedMaterialLinks.length} 種材料 / 共 ${totalLinkCount} 筆關聯`"
              >
                {{ groupedMaterialLinks.length }} / {{ totalLinkCount }}
              </span>
              <div class="d-flex gap-2">
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  @click="expandAllGroups"
                  :disabled="groupedMaterialLinks.length === 0"
                  title="展開全部分組"
                >
                  <i class="fa fa-angles-down me-1"></i>全部展開
                </button>
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  @click="collapseAllGroups"
                  :disabled="groupedMaterialLinks.length === 0"
                  title="收合全部分組"
                >
                  <i class="fa fa-angles-up me-1"></i>全部收合
                </button>
              </div>
            </div>
          </div>

          <div class="modal-list">
            <div
              v-if="groupedMaterialLinks.length === 0"
              class="text-muted small py-4 text-center"
            >
              尚未建立任何材料-試驗項關聯
            </div>
            <div
              v-for="g in groupedMaterialLinks"
              :key="g.itemCode"
              class="mi-link-group mb-2"
            >
              <button
                type="button"
                class="mi-link-header w-100 d-flex align-items-center gap-2"
                :class="{ 'mi-link-header--current': selectedMaterialKey === g.itemCode }"
                @click="toggleCollapse(g.itemCode)"
                :aria-expanded="!collapsedMaterialKeys.has(g.itemCode)"
              >
                <i
                  :class="[
                    'mi-link-chevron',
                    collapsedMaterialKeys.has(g.itemCode) ? 'fa fa-chevron-right' : 'fa fa-chevron-down'
                  ]"
                ></i>
                <div class="flex-grow-1 text-start min-w-0">
                  <div class="small text-muted text-truncate">{{ g.itemCode }}</div>
                  <div class="fw-semibold mi-link-mat-name">{{ g.materialName }}</div>
                </div>
                <span
                  class="badge bg-primary-subtle text-primary border border-primary-subtle flex-shrink-0"
                >
                  {{ g.links.length }}
                </span>
              </button>
              <div
                v-show="!collapsedMaterialKeys.has(g.itemCode)"
                class="mi-link-body"
              >
                <table class="table table-sm align-middle mb-0">
                  <tbody>
                    <tr v-for="link in g.links" :key="link.id">
                      <td>
                        <div class="small text-muted">
                          {{ testItemById.get(link.pccesCodeId)?.itemNo || '—' }} /
                          {{ testItemById.get(link.pccesCodeId)?.pccesCode || '—' }}
                        </div>
                        <div>
                          {{ testItemById.get(link.pccesCodeId)?.name || `#${link.pccesCodeId}` }}
                        </div>
                      </td>
                      <td class="text-end" style="width: 72px;">
                        <button
                          class="btn btn-outline-danger btn-sm"
                          type="button"
                          @click="removeLink(link.id)"
                          :disabled="saving"
                          title="移除關聯"
                        >
                          <i class="fa fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger alert-sm py-1 px-2 mt-2 mb-0 small">
            <i class="fa fa-circle-exclamation me-1"></i>{{ error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  batchSetPccesMaterialUsage,
  deletePccesMaterialTestItemLink,
  ensureTestItemsFromBreakdown,
  getConstructionPccesCodes,
  getPccesMaterialUsage,
  listPccesMaterialTestItemLinks,
  replacePccesMaterialTestItemLinksForMaterial,
  setPccesMaterialUsage,
  PccesItemType,
  type ConstructionPccesCode,
  type PccesMaterialTestItemLink
} from '@/api/pcces'

type PanelMaterial = {
  id: number
  refItemNo?: string | null
  itemCode?: string | null
  name: string
  unit?: string | null
  source?: string | null
}

/**
 * 統一的試驗項視圖。
 * - source='DETAIL'   → 來自 pcces_codes，id 為正數 (pcces_code.id)，可直接建立關聯
 * - source='BREAKDOWN'→ 來自 cost_breakdown，id 為負數 (-breakdown.id)，
 *                        建立關聯前需先呼叫 ensureTestItemsFromBreakdown 取得 pcces_code_id
 */
type TestItemView = {
  id: number
  itemNo: string | null
  pccesCode: string | null
  name: string
  source: 'DETAIL' | 'BREAKDOWN'
}

/** 與「試驗項」合併顯示所需之單價分析列（可為 API 列或 ProjectItemDatabase 的 BreakdownProjectItem） */
type MaterialPanelBreakdownRow = {
  id: number | string
  /** BreakdownProjectItem 為 string；API 為 PccesItemType */
  type: PccesItemType | string | null
  name: string
  itemCode?: string | null
  refItemNo?: string | null
}

const props = defineProps<{
  constructionId: string
  designChangeId: number | null
  materials: PanelMaterial[]
  /** 單價分析列表（父層傳入，用於即時顯示 type=TEST_ITEM 的試驗項） */
  breakdownItems?: MaterialPanelBreakdownRow[]
  /** 面板是否可見；可見時自動 refresh */
  active?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh-needed'): void
}>()

/** 已在 pcces_codes 登記的試驗項（標單明細 type=TEST_ITEM） */
const testItems = ref<ConstructionPccesCode[]>([])

const loading = ref(false)
const saving = ref(false)
const error = ref('')      // 關聯刪除等其他操作的錯誤
const saveError = ref('')  // 儲存關聯的錯誤（顯示在儲存按鈕下方）
const links = ref<PccesMaterialTestItemLink[]>([])

const selectedMaterialKey = ref<string | null>(null)
const selectedTestItemIds = ref<Set<number>>(new Set())
const materialUsedByCode = ref<Record<string, boolean>>({})
const savingUsedKey = ref<string | null>(null)
const usageLoaded = ref(false)

const materialKeyword = ref('')
const testItemKeyword = ref('')

/**
 * 所有試驗項，合併兩個來源：
 * 1. pcces_codes（type=TEST_ITEM）→ source='DETAIL'，id 為正數
 * 2. cost_breakdown（type=TEST_ITEM）→ source='BREAKDOWN'，id 為負數 (-breakdown.id)
 *    已在 pcces_codes 中存在同名者略過（避免重複）
 */
const allTestItems = computed((): TestItemView[] => {
  const result: TestItemView[] = []
  const detailNames = new Set<string>()

  // 1. DETAIL 來源（pcces_codes）
  for (const c of testItems.value) {
    const name = String(c.name ?? '').trim()
    if (!name) continue
    detailNames.add(name)
    result.push({
      id: c.id,
      itemNo: c.itemNo ?? null,
      pccesCode: c.pccesCode ?? null,
      name,
      source: 'DETAIL'
    })
  }

  // 2. BREAKDOWN 來源（cost_breakdown，type=TEST_ITEM）
  for (const b of (props.breakdownItems ?? [])) {
    if (b.type !== PccesItemType.TEST_ITEM) continue
    const name = String(b.name ?? '').trim()
    if (!name || detailNames.has(name)) continue  // 同名 DETAIL 已存在，略過
    const bid = typeof b.id === 'number' ? b.id : parseInt(String(b.id), 10)
    if (!Number.isFinite(bid)) continue
    result.push({
      id: -bid, // 負數標識：尚無 pcces_codes 記錄
      itemNo: b.refItemNo ?? null,
      pccesCode: b.itemCode ?? null,
      name,
      source: 'BREAKDOWN'
    })
  }

  return result
})

const selectedMaterialUsed = computed(() => {
  const k = selectedMaterialKey.value
  if (!k) return false
  return materialUsedByCode.value[k] !== false
})

const canBatchSetUsed = computed(() => {
  return !!props.constructionId && savingUsedKey.value == null
})

const filteredMaterials = computed(() => {
  const k = materialKeyword.value.trim().toLowerCase()
  if (!k) return props.materials
  return props.materials.filter((m) => {
    const s = `${m.refItemNo ?? ''} ${m.itemCode ?? ''} ${m.name ?? ''}`.toLowerCase()
    return s.includes(k)
  })
})

const filteredAllTestItems = computed(() => {
  const k = testItemKeyword.value.trim().toLowerCase()
  if (!k) return allTestItems.value
  return allTestItems.value.filter((t) => {
    const s = `${t.itemNo ?? ''} ${t.pccesCode ?? ''} ${t.name ?? ''}`.toLowerCase()
    return s.includes(k)
  })
})

const testItemById = computed(() => {
  return new Map(allTestItems.value.map((t) => [t.id, t]))
})

/** 「已建立關聯」分組：每個有關聯的材料一組，依 itemCode 排序 */
type LinkedMaterialGroup = {
  itemCode: string
  materialName: string
  links: PccesMaterialTestItemLink[]
}

const groupedMaterialLinks = computed<LinkedMaterialGroup[]>(() => {
  const nameMap = new Map<string, string>()
  for (const m of props.materials || []) {
    const code = String(m.itemCode ?? '').trim()
    if (code) nameMap.set(code, m.name ?? code)
  }
  const map = new Map<string, LinkedMaterialGroup>()
  for (const l of links.value) {
    const code = String(l.itemCode ?? '').trim()
    if (!code) continue
    let g = map.get(code)
    if (!g) {
      g = { itemCode: code, materialName: nameMap.get(code) || code, links: [] }
      map.set(code, g)
    }
    g.links.push(l)
  }
  return Array.from(map.values()).sort((a, b) => a.itemCode.localeCompare(b.itemCode))
})

const totalLinkCount = computed(() => links.value.length)

/** 收合的材料 itemCode 集合；不在集合中表示展開（預設全展開） */
const collapsedMaterialKeys = ref<Set<string>>(new Set())

function toggleCollapse(itemCode: string) {
  const next = new Set(collapsedMaterialKeys.value)
  if (next.has(itemCode)) next.delete(itemCode)
  else next.add(itemCode)
  collapsedMaterialKeys.value = next
}

function expandAllGroups() {
  collapsedMaterialKeys.value = new Set()
}

function collapseAllGroups() {
  collapsedMaterialKeys.value = new Set(groupedMaterialLinks.value.map((g) => g.itemCode))
}

function getLinkCountForMaterial(itemCode: string): number {
  const k = String(itemCode ?? '').trim()
  if (!k) return 0
  return links.value.filter((l) => String(l.itemCode ?? '').trim() === k).length
}

function isMaterialUsed(itemCode: string): boolean {
  const k = String(itemCode ?? '').trim()
  if (!k) return true
  return materialUsedByCode.value[k] !== false
}

async function setAllMaterialsUsed(used: boolean) {
  if (!props.constructionId) return
  if (savingUsedKey.value != null) return
  const codes = (props.materials || [])
    .map((m) => String(m.itemCode ?? '').trim())
    .filter((c) => !!c)
  if (codes.length === 0) return
  savingUsedKey.value = '__BATCH__'
  const prevMap = { ...materialUsedByCode.value }
  try {
    const next: Record<string, boolean> = { ...materialUsedByCode.value }
    for (const c of codes) next[c] = used
    materialUsedByCode.value = next
    if (!used) {
      selectedMaterialKey.value = null
      selectedTestItemIds.value = new Set()
    }
    await batchSetPccesMaterialUsage(props.constructionId, codes, used, props.designChangeId)
    await refreshUsage()
  } catch (e: any) {
    materialUsedByCode.value = prevMap
    const msg = e?.response?.data?.message ?? e?.message
    alert(typeof msg === 'string' && msg ? msg : '批次更新材料使用狀態失敗')
  } finally {
    savingUsedKey.value = null
  }
}

async function setMaterialUsed(itemCode: string, used: boolean) {
  const k = String(itemCode ?? '').trim()
  if (!k) return
  if (savingUsedKey.value === k) return
  const prev = isMaterialUsed(k)
  materialUsedByCode.value = { ...materialUsedByCode.value, [k]: used }
  if (!used && selectedMaterialKey.value === k) {
    selectedMaterialKey.value = null
    selectedTestItemIds.value = new Set()
  } else if (used) {
    selectMaterial(k)
  }
  savingUsedKey.value = k
  try {
    await setPccesMaterialUsage(props.constructionId, k, used, props.designChangeId)
  } catch (e: any) {
    materialUsedByCode.value = { ...materialUsedByCode.value, [k]: prev }
    if (used && !prev && selectedMaterialKey.value === k) {
      selectedMaterialKey.value = null
      selectedTestItemIds.value = new Set()
    }
    const msg = e?.response?.data?.message ?? e?.message
    alert(typeof msg === 'string' && msg ? msg : '更新材料使用狀態失敗')
  } finally {
    savingUsedKey.value = null
  }
}

function selectMaterial(itemCode: string) {
  const k = String(itemCode ?? '').trim()
  if (!k) return
  if (!isMaterialUsed(k)) return
  selectedMaterialKey.value = k
  saveError.value = ''
  const set = new Set<number>()
  for (const l of links.value) {
    if (String(l.itemCode ?? '').trim() === k) set.add(l.pccesCodeId)
  }
  selectedTestItemIds.value = set
}

function toggleSelectedTestItem(id: number, ev: Event) {
  if (!selectedMaterialUsed.value) return
  const checked = (ev.target as HTMLInputElement).checked
  const next = new Set(selectedTestItemIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedTestItemIds.value = next
}

function selectAllTestItems() {
  if (selectedMaterialKey.value == null) return
  if (!selectedMaterialUsed.value) return
  selectedTestItemIds.value = new Set(allTestItems.value.map((t) => t.id))
}

function clearSelectedTestItems() {
  if (selectedMaterialKey.value == null) return
  if (!selectedMaterialUsed.value) return
  selectedTestItemIds.value = new Set()
}

async function saveForSelectedMaterial() {
  if (!props.constructionId || selectedMaterialKey.value == null) return
  if (!selectedMaterialUsed.value) return
  saving.value = true
  saveError.value = ''
  try {
    const allIds = Array.from(selectedTestItemIds.value)
    const positiveIds = allIds.filter((id) => id > 0)   // 已在 pcces_codes 的試驗項
    const negativeIds = allIds.filter((id) => id < 0)   // 來自 breakdown，尚無 pcces_codes 記錄

    // 若有 breakdown 來源的試驗項，先 lazy-create pcces_codes 記錄取得真實 ID
    let finalIds = [...positiveIds]
    if (negativeIds.length > 0) {
      const breakdownIds = negativeIds.map((id) => -id)  // 還原正數 breakdown.id
      const mapping = await ensureTestItemsFromBreakdown(
        props.constructionId,
        props.designChangeId,
        breakdownIds
      )
      for (const bdId of breakdownIds) {
        const pccesCodeId = mapping[bdId]
        if (pccesCodeId) finalIds.push(pccesCodeId)
      }
    }

    await replacePccesMaterialTestItemLinksForMaterial(
      props.constructionId, selectedMaterialKey.value, finalIds, props.designChangeId
    )
    // refresh 會重新載入 pcces_codes，剛建立的試驗項記錄會從 BREAKDOWN 升格為 DETAIL 顯示
    await refresh()
  } catch (e: any) {
    saveError.value = e?.response?.data?.message ?? e?.message ?? '儲存關聯失敗'
  } finally {
    saving.value = false
  }
}

async function removeLink(linkId: number) {
  if (!props.constructionId) return
  saving.value = true
  error.value = ''
  try {
    await deletePccesMaterialTestItemLink(props.constructionId, linkId, props.designChangeId)
    await refresh()
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? '移除關聯失敗'
  } finally {
    saving.value = false
  }
}

async function refreshUsage() {
  if (!props.constructionId) return
  try {
    const rows = await getPccesMaterialUsage(props.constructionId, props.designChangeId)
    const next: Record<string, boolean> = { ...materialUsedByCode.value }
    for (const r of rows) next[String(r.itemCode ?? '').trim()] = r.used
    materialUsedByCode.value = next
    usageLoaded.value = true
  } catch {
    usageLoaded.value = false
  }
}

async function fetchTestItems() {
  if (!props.constructionId) return
  try {
    const codes = await getConstructionPccesCodes(props.constructionId, props.designChangeId)
    testItems.value = codes.filter((c) => c.type === PccesItemType.TEST_ITEM)
  } catch {
    // 不阻斷主流程
  }
}

async function refresh() {
  if (!props.constructionId) return
  loading.value = true
  error.value = ''
  try {
    await Promise.all([
      listPccesMaterialTestItemLinks(props.constructionId, props.designChangeId).then((v) => { links.value = v }),
      fetchTestItems(),
      refreshUsage()
    ])
    if (selectedMaterialKey.value != null) selectMaterial(selectedMaterialKey.value)
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? '載入關聯失敗'
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.constructionId, props.designChangeId, props.active] as const,
  ([cid, _did, active]) => {
    if (!cid) return
    if (active === false) return
    void refresh()
  },
  { immediate: true }
)

defineExpose({ refresh })

watch(
  () => props.materials,
  (rows) => {
    const next: Record<string, boolean> = { ...materialUsedByCode.value }
    for (const r of (rows || []) as PanelMaterial[]) {
      const k = String(r.itemCode ?? '').trim()
      if (!k) continue
      if (next[k] === undefined) next[k] = true
    }
    materialUsedByCode.value = next
  },
  { immediate: true }
)
</script>

<style scoped>
.material-inspection-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mi-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  min-width: 0;
}

.mi-col {
  display: flex;
  min-height: 0;
  min-width: 0;
}

.mi-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  min-width: 0;
}

.modal-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  min-width: 0;
}

/* 避免 list item 內部 flex 撐爆欄寬 */
.material-inspection-panel :deep(.list-group-item) {
  min-width: 0;
}

.material-inspection-panel :deep(.material-row-disabled) {
  opacity: 0.55;
  filter: grayscale(1);
}

.material-inspection-panel :deep(.mi-disabled-pane) {
  opacity: 0.55;
  filter: grayscale(1);
}

/* 暗黑模式：材料清單 hover/active 樣式 */
.material-inspection-panel :deep(.list-group-item-action) {
  background-color: transparent;
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.22);
}

.material-inspection-panel :deep(.list-group-item-action:hover) {
  background: rgba(148, 163, 184, 0.12);
  color: #f8fafc;
}

.material-inspection-panel :deep(.list-group-item-action:focus) {
  background: rgba(148, 163, 184, 0.14);
  color: #f8fafc;
  box-shadow: none;
}

.material-inspection-panel :deep(.list-group-item.active) {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.35);
  color: #f8fafc;
}

.material-inspection-panel :deep(.list-group-item.active .text-muted) {
  color: rgba(226, 232, 240, 0.9) !important;
}

.material-inspection-panel :deep(.material-name) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.35;
  word-break: break-word;
}

/* ── 已建立關聯：分組可收合樣式 ── */
.mi-link-group {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 0.5rem;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.25);
}

.mi-link-header {
  appearance: none;
  background: rgba(148, 163, 184, 0.08);
  color: #e2e8f0;
  border: none;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.12s ease;
  text-align: left;
}
.mi-link-header:hover {
  background: rgba(148, 163, 184, 0.18);
}
.mi-link-header:focus {
  outline: none;
  background: rgba(148, 163, 184, 0.18);
}

.mi-link-header--current {
  background: rgba(56, 189, 248, 0.16);
}
.mi-link-header--current:hover {
  background: rgba(56, 189, 248, 0.24);
}

.mi-link-chevron {
  width: 12px;
  flex-shrink: 0;
  color: #94a3b8;
  font-size: 0.85rem;
}

.mi-link-mat-name {
  line-height: 1.3;
  word-break: break-word;
}

.mi-link-body {
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  padding: 0.25rem 0.5rem;
}

.material-inspection-panel :deep(.mi-link-body .table) {
  margin-bottom: 0;
  color: #e2e8f0;
}
.material-inspection-panel :deep(.mi-link-body .table > :not(caption) > * > *) {
  padding: 0.4rem 0.5rem;
  border-color: rgba(148, 163, 184, 0.12);
}

@media (max-width: 991.98px) {
  .mi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
