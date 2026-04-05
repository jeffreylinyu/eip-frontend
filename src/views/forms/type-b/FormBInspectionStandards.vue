<template>
  <div class="form-b-inspection-standards-page a4-dark h-100">
    <div class="d-flex align-items-center gap-3 mb-3 inspection-standards-page__toolbar">
      <button type="button" class="btn btn-outline-secondary" @click="goBack">
        <i class="fa fa-arrow-left me-1"></i> 返回清單
      </button>
      <nav aria-label="breadcrumb" class="flex-grow-1">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item text-muted">施工項目</li>
          <li class="breadcrumb-item text-muted">{{ currentItem?.name || '載入中...' }}</li>
          <li class="breadcrumb-item active" aria-current="page">抽查標準表</li>
        </ol>
      </nav>
    </div>

    <Card class="mb-3 report-card report-card--full" style="min-height: 500px">
      <CardBody class="report-card__body" data-bs-theme="dark">
        <div
          v-if="loadingItem"
          class="d-flex align-items-center justify-content-center gap-2 py-5 text-muted"
        >
          <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
          <span>載入工項資訊中...</span>
        </div>

        <template v-else>
          <div
            v-if="aiGenerating"
            class="inspection-standards-page-loading-overlay d-flex flex-column align-items-center justify-content-center gap-2"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
            <div class="text-muted small">AI 生成中，約 1~3 分鐘，請耐心等待…</div>
            <div class="text-warning-emphasis small">請勿關閉頁面</div>
          </div>

          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
            <div class="flex-grow-1">
              <h4 class="fw-bold mb-1">{{ currentItem?.name || '載入中...' }}</h4>
              <div class="text-muted small mb-0">{{ currentItem?.description || '無描述' }}</div>
              <div class="inspection-standards-shared-hint small mt-2">
                <i class="fa fa-circle-info me-1" aria-hidden="true"></i>
                <span class="hint-strong">施工階段</span>與<span class="hint-strong">施工流程</span>為
                <span class="hint-strong">施工 / 安衛共用骨架</span>
                <span class="hint-sep">•</span>
                <span class="hint-strong">改一邊</span>
                <span class="hint-strong">另一邊也會同步變更</span>
              </div>
            </div>
          </div>

          <InspectionStandardsPhasesTable
            class="mb-0"
            :phases="itemData.phases"
            :interactive="true"
            :ai-generating="aiGenerating"
            :empty-text="`目前尚無${masterKindLabel}資料`"
            :persistence-key="collapsePersistenceKey"
            @ai-generate-from-db="onAiGenerateFromDb"
            @edit-field="editField"
            @edit-flow="editFlowItem"
            @add-flow="onAddFlow"
            @add-mgmt-item="onAddMgmtItem"
            @add-sub-item="onAddSubItem"
            @remove-mgmt="onRemoveMgmt"
            @remove-flow="onRemoveFlow"
            @remove-row="onRemoveRow"
          >
            <template #bulk-left>
              <div
                class="inspection-standards-toolbar-bulk flex-grow-1 min-w-0 d-flex flex-nowrap align-items-center gap-3"
              >
                <div
                  class="inspection-standards-kind-switch min-w-0"
                  role="tablist"
                  aria-label="抽查標準分頁切換"
                >
                  <button
                    type="button"
                    class="kind-seg kind-seg--construction"
                    :class="{ 'is-active': activeStandardsTab === 'construction' }"
                    role="tab"
                    :aria-selected="activeStandardsTab === 'construction'"
                    @click="setStandardsTab('construction')"
                  >
                    <i class="fa fa-clipboard-check me-2" aria-hidden="true"></i>
                    施工抽查標準
                  </button>
                  <button
                    type="button"
                    class="kind-seg kind-seg--safety"
                    :class="{ 'is-active': activeStandardsTab === 'safety' }"
                    role="tab"
                    :aria-selected="activeStandardsTab === 'safety'"
                    @click="setStandardsTab('safety')"
                  >
                    <i class="fa fa-hard-hat me-2" aria-hidden="true"></i>
                    安全衛生抽查標準
                  </button>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary inspection-standards-flowchart-btn flex-shrink-0"
                  title="預覽施工流程圖（與匯出監造計畫書相同）"
                  :disabled="!constructionId || loadingItem || flowChartLoading"
                  @click="openB1FlowChartModal"
                >
                  <i class="fa fa-sitemap me-2" aria-hidden="true"></i>
                  施工流程圖
                </button>
              </div>
            </template>
          </InspectionStandardsPhasesTable>
        </template>
      </CardBody>
    </Card>

    <Modal
      :show="showAddFlowModal"
      title="新增施工流程"
      icon="fa fa-plus"
      size="lg"
      @update:show="showAddFlowModal = $event"
      confirmText="新增"
      cancelText="取消"
      @confirm="confirmAddFlow"
    >
      <template #body>
        <div class="mb-0">
          <label class="form-label">施工流程名稱</label>
          <input
            v-model="addFlowName"
            type="text"
            class="form-control"
            placeholder="例如：模板工程、鋼筋綁紮…"
          />
        </div>
      </template>
    </Modal>

    <Modal
      :show="showAddMgmtModal"
      title="新增管理項目"
      icon="fa fa-plus"
      size="lg"
      @update:show="showAddMgmtModal = $event"
      confirmText="新增"
      cancelText="取消"
      @confirm="confirmAddMgmt"
    >
      <template #body>
        <div class="mb-0">
          <label class="form-label">管理項目名稱</label>
          <input v-model="addMgmtName" type="text" class="form-control" placeholder="例如：鋼筋材料檢驗…" />
        </div>
      </template>
    </Modal>

    <!-- 編輯欄位 Modal (通用) -->
    <Modal
      :show="showB1FlowChartModal"
      title="施工流程圖"
      icon="fa fa-sitemap"
      size="xl"
      :hide-footer="true"
      :hide-confirm-button="true"
      :elevate-z-index="true"
      @update:show="onB1FlowChartModalShow"
    >
      <template #body>
        <p class="text-muted small mb-3 mb-md-2">
          與匯出監造計畫書時一併產生的施工流程圖相同，依目前本施工大項的施工階段與施工流程產生。
        </p>
        <div v-if="flowChartLoading" class="text-center py-5 text-muted">
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          載入流程圖中…
        </div>
        <div
          v-else-if="b1FlowChartObjectUrl"
          class="text-center bg-white rounded p-2 inspection-standards-flowchart-img-wrap"
        >
          <img
            :src="b1FlowChartObjectUrl"
            alt="施工流程圖"
            class="img-fluid inspection-standards-flowchart-img"
          />
        </div>
      </template>
    </Modal>

    <Modal
      :show="showEditModal"
      :title="editModalTitle"
      icon="fa fa-edit"
      size="lg"
      @update:show="showEditModal = $event"
      confirmText="保存"
      cancelText="取消"
      @confirm="saveEdit"
    >
      <template #body>
          <div v-if="editingField === '不合格之處理'">
             <label class="form-label">不合格之處理</label>
             <textarea class="form-control" rows="5" v-model="editValue.current"></textarea>
          </div>
          <div v-else-if="editingField === '施工檢查點'">
              <label class="form-label">{{ editingField }}</label>
              <select class="form-select" v-model="editValue.current">
                  <option value="">(無)</option>
                  <option value="★">★</option>
                  <option value="※">※</option>
                  <option value="★※">★※</option>
              </select>
          </div>
          <div v-else>
             <label class="form-label">{{ editingField }}</label>
             <textarea class="form-control" rows="5" v-model="editValue.current"></textarea>
          </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { 
    getConstructionMajorItemById, 
    getConstructionMajorItemStandards,
    getConstructionMajorItemSafetyStandards,
    aiGenerateOverwriteConstructionMajorItemAllStandards,
    createConstructionMajorItemStandard,
    createConstructionMajorItemSafetyStandard,
    updateConstructionMajorItemStandard,
    updateConstructionMajorItemSafetyStandard,
    deleteConstructionMajorItemStandard,
    deleteConstructionMajorItemStandardsByManageProject,
    deleteConstructionMajorItemSafetyStandard,
    deleteConstructionMajorItemSafetyStandardsByManageProject,
    fetchConstructionMajorItemB1FlowChartPng,
    type ConstructionMajorItem, 
    type ConstructionMajorItemStandardResponse
} from '@/api/pcces'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import InspectionStandardsPhasesTable from '@/components/inspection/InspectionStandardsPhasesTable.vue'
import {
    buildMergedInspectionPhasesForTab,
    INSPECTION_PLACEHOLDER_FLOW,
    type InspectionStandardsKind,
} from '@/utils/buildInspectionPhasesFromLines'
import {
    flowLabelToScopedDeleteDetail,
    flowLabelToApiWorkProcessDetail,
    phaseKeyToWorkProcess,
    uniqueManageProjectNamesInFlow
} from '@/utils/inspectionStandardsCreateHelpers'
import {
    scrollPreservingAlert,
    scrollPreservingConfirm,
    readScrollSnapshot,
    restoreScrollSnapshot
} from '@/utils/scrollPreserve'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const itemId = route.params.id as string

/** 與舊路由 `/safety-standards` 或 query `?tab=safety` 對齊 */
const activeStandardsTab = ref<InspectionStandardsKind>('construction')
const isSafetyMode = computed(() => activeStandardsTab.value === 'safety')

const masterKindLabel = computed(() =>
    isSafetyMode.value ? '安全衛生抽查標準來源（主檔）' : '施工抽查標準來源（主檔）'
)

// 獲取當前工程 ID
const constructionId = computed(() => workspaceStore.currentProject?.id || '')

/** 施工／安衛共用同一套階段與流程骨架，摺疊狀態不分頁 */
const collapsePersistenceKey = computed(() => {
  const cid = constructionId.value
  if (!cid.trim() || !itemId) return ''
  return `${cid.trim()}:${itemId}:supervisory-inspection-shared`
})

const loadingItem = ref(false)
const currentItem = ref<ConstructionMajorItem | null>(null)

// 資料結構 (Hierarchical)
const itemData = ref<any>({ phases: {} })

const standardsConstruction = ref<ConstructionMajorItemStandardResponse[]>([])
const standardsSafety = ref<ConstructionMajorItemStandardResponse[]>([])

function applyMergedDisplay() {
  itemData.value = buildMergedInspectionPhasesForTab(
    standardsConstruction.value,
    standardsSafety.value,
    activeStandardsTab.value
  )
}

/** 目前分頁對應的施工／安衛列表由 API 更新後，寫回 cache 並重算合併畫面 */
function replaceActiveKindStandards(list: ConstructionMajorItemStandardResponse[]) {
  if (activeStandardsTab.value === 'safety') {
    standardsSafety.value = list
  } else {
    standardsConstruction.value = list
  }
  applyMergedDisplay()
}

async function reloadBothStandardsLists() {
  if (!constructionId.value) return
  const [c, s] = await Promise.all([
    getConstructionMajorItemStandards(constructionId.value, itemId),
    getConstructionMajorItemSafetyStandards(constructionId.value, itemId),
  ])
  standardsConstruction.value = c
  standardsSafety.value = s
  applyMergedDisplay()
}

function syncTabFromRouteQuery() {
  const q = route.query.tab
  if (q === 'safety') activeStandardsTab.value = 'safety'
  else activeStandardsTab.value = 'construction'
}

function setStandardsTab(tab: InspectionStandardsKind) {
  activeStandardsTab.value = tab
  applyMergedDisplay()
  const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>
  if (tab === 'safety') nextQuery.tab = 'safety'
  else delete nextQuery.tab
  router.replace({ path: route.path, query: nextQuery })
}

watch(
  () => route.query.tab,
  () => {
    syncTabFromRouteQuery()
    applyMergedDisplay()
  }
)

// 編輯 Modal
const showEditModal = ref(false)
const editModalTitle = ref('')
const editingField = ref('')
// 指向當前編輯的位置
const editTarget = ref<{
  phase: string
  flowIdx: number
  mgmtIdx: number
  subIdx: number
} | null>(null)
const editValue = ref<any>({})

// 新增施工流程 Modal
const showAddFlowModal = ref(false)
const addFlowPhaseKey = ref('')
const addFlowName = ref('')

// 新增管理項目 Modal
const showAddMgmtModal = ref(false)
const addMgmtPhaseKey = ref('')
const addMgmtFlowIdx = ref<number | null>(null)
const addMgmtName = ref('')

const loadData = async () => {
    if (!constructionId.value) {
        alert('請先選擇工程案')
        return
    }

    loadingItem.value = true
    try {
        syncTabFromRouteQuery()
        const item = await getConstructionMajorItemById(constructionId.value, itemId)
        if (item) {
            currentItem.value = item
        }
        await reloadBothStandardsLists()
    } catch (e) {
        console.error('Load data failed', e)
    } finally {
        loadingItem.value = false
    }
}

const goBack = () => router.back()

function groupRowsByManageProject(flow: any): { name: string; rows: any[] }[] {
    const rows = (flow?.rows ?? []) as any[]
    const out: { name: string; rows: any[] }[] = []
    const idx = new Map<string, number>()
    for (const r of rows) {
        const name = (r?.manageProject ?? '').toString().trim() || '未命名項目'
        const i = idx.get(name)
        if (i === undefined) {
            idx.set(name, out.length)
            out.push({ name, rows: [r] })
        } else {
            out[i].rows.push(r)
        }
    }
    return out
}

function getFlow(phaseKey: string, flowIdx: number): any | null {
    return itemData.value?.phases?.[phaseKey]?.flows?.[flowIdx] ?? null
}

function getRowByMgmtSub(phaseKey: string, flowIdx: number, mgmtIdx: number, subIdx: number): any | null {
    const flow = getFlow(phaseKey, flowIdx)
    if (!flow) return null
    const groups = groupRowsByManageProject(flow)
    const g = groups[mgmtIdx]
    return g?.rows?.[subIdx] ?? null
}

const aiGenerating = ref(false)

async function onAiGenerateFromDb() {
    if (!constructionId.value) {
        scrollPreservingAlert('請先選擇工程案')
        return
    }
    if (!currentItem.value?.name?.trim()) {
        scrollPreservingAlert('施工項目名稱不存在，無法生成')
        return
    }
    if (aiGenerating.value) return

    const ok = await scrollPreservingConfirm(
        '將以 AI 一次重新生成並覆寫「施工抽查標準 + 安全衛生抽查標準」明細（全刪全建）。\n' +
        '兩者會共用同一組施工階段與施工流程。\n\n是否繼續？'
    )
    if (!ok) return

    const scrollSnap = readScrollSnapshot()
    aiGenerating.value = true
    try {
        const generated = await aiGenerateOverwriteConstructionMajorItemAllStandards(constructionId.value, itemId)
        standardsConstruction.value = generated.constructionStandards
        standardsSafety.value = generated.safetyStandards
        applyMergedDisplay()
        await nextTick()
        await nextTick()
        restoreScrollSnapshot(scrollSnap)
    } catch (e: unknown) {
        console.error(e)
        const err = e as { response?: { data?: { error?: string; message?: string; detail?: string } }; message?: string }
        scrollPreservingAlert(
            err?.response?.data?.error ??
                err?.response?.data?.message ??
                err?.message ??
                'AI 生成失敗，請稍後再試'
        )
    } finally {
        aiGenerating.value = false
    }
}

function onAddFlow(phaseKey: string) {
    addFlowPhaseKey.value = phaseKey
    addFlowName.value = ''
    showAddFlowModal.value = true
}

async function confirmAddFlow() {
    if (!constructionId.value) {
        scrollPreservingAlert('請先選擇工程案')
        return
    }
    const phaseKey = addFlowPhaseKey.value
    const newLabelRaw = (addFlowName.value ?? '').trim()
    if (!newLabelRaw) {
        scrollPreservingAlert('請輸入施工流程名稱')
        return
    }
    const apiDetail = flowLabelToApiWorkProcessDetail(newLabelRaw)
    const payload: Partial<ConstructionMajorItemStandardResponse> = {
        workProcess: phaseKeyToWorkProcess(phaseKey) ?? null,
        workProcessDetail: apiDetail ?? null,
        remark: INSPECTION_PLACEHOLDER_FLOW
    }
    const scrollSnap = readScrollSnapshot()
    try {
        if (isSafetyMode.value) {
            await createConstructionMajorItemSafetyStandard(constructionId.value, itemId, payload)
        } else {
            await createConstructionMajorItemStandard(constructionId.value, itemId, payload)
        }
        const standards = isSafetyMode.value
            ? await getConstructionMajorItemSafetyStandards(constructionId.value, itemId)
            : await getConstructionMajorItemStandards(constructionId.value, itemId)
        replaceActiveKindStandards(standards)
        showAddFlowModal.value = false
        await nextTick()
        await nextTick()
        restoreScrollSnapshot(scrollSnap)
    } catch (e) {
        console.error(e)
        scrollPreservingAlert('新增施工流程失敗，請稍後再試')
    }
}

async function onAddMgmtItem(phaseKey: string, flowIdx?: number) {
    addMgmtPhaseKey.value = phaseKey
    addMgmtFlowIdx.value = flowIdx ?? null
    addMgmtName.value = ''
    showAddMgmtModal.value = true
}

async function confirmAddMgmt() {
    if (!constructionId.value) {
        scrollPreservingAlert('請先選擇工程案')
        return
    }
    const phaseKey = addMgmtPhaseKey.value
    const flowIdx = addMgmtFlowIdx.value
    const name = (addMgmtName.value ?? '').trim()
    if (!name) {
        scrollPreservingAlert('請輸入管理項目名稱')
        return
    }

    const flowBlock =
        flowIdx != null ? itemData.value.phases[phaseKey]?.flows?.[flowIdx] : undefined
    const apiDetail =
        flowIdx != null ? flowLabelToApiWorkProcessDetail(flowBlock?.flowLabel ?? '') : undefined

    const payload: Partial<ConstructionMajorItemStandardResponse> = {
        workProcess: phaseKeyToWorkProcess(phaseKey) ?? null,
        workProcessDetail: apiDetail ?? null,
        manageProject: name,
    }
    const scrollSnap = readScrollSnapshot()
    try {
        if (isSafetyMode.value) {
            await createConstructionMajorItemSafetyStandard(constructionId.value, itemId, payload)
        } else {
            await createConstructionMajorItemStandard(constructionId.value, itemId, payload)
        }
        const standards = isSafetyMode.value
            ? await getConstructionMajorItemSafetyStandards(constructionId.value, itemId)
            : await getConstructionMajorItemStandards(constructionId.value, itemId)
        replaceActiveKindStandards(standards)
        showAddMgmtModal.value = false
        await nextTick()
        await nextTick()
        restoreScrollSnapshot(scrollSnap)
    } catch (e) {
        console.error(e)
        scrollPreservingAlert('新增管理項目失敗，請稍後再試')
    }
}

async function onAddSubItem(phaseKey: string, flowIdx: number, mgmtIdx: number) {
    if (!constructionId.value) {
        scrollPreservingAlert('請先選擇工程案')
        return
    }
    const flow = getFlow(phaseKey, flowIdx)
    if (!flow) {
        scrollPreservingAlert('無法新增：找不到施工流程')
        return
    }
    const groups = groupRowsByManageProject(flow)
    const g = groups[mgmtIdx]
    if (!g?.name) {
        scrollPreservingAlert('無法新增：找不到對應的管理項目')
        return
    }
    const body: Partial<ConstructionMajorItemStandardResponse> = {
        workProcess: phaseKeyToWorkProcess(phaseKey) ?? null,
        workProcessDetail: flowLabelToApiWorkProcessDetail(flow.flowLabel) ?? null,
        manageProject: g.name
    }
    const scrollSnap = readScrollSnapshot()
    try {
        if (isSafetyMode.value) {
            await createConstructionMajorItemSafetyStandard(constructionId.value, itemId, body)
        } else {
            await createConstructionMajorItemStandard(constructionId.value, itemId, body)
        }
        const standards = isSafetyMode.value
            ? await getConstructionMajorItemSafetyStandards(constructionId.value, itemId)
            : await getConstructionMajorItemStandards(constructionId.value, itemId)
        replaceActiveKindStandards(standards)
        await nextTick()
        await nextTick()
        restoreScrollSnapshot(scrollSnap)
    } catch (e) {
        console.error(e)
        scrollPreservingAlert('新增施工檢查點列失敗，請稍後再試')
    }
}

async function onRemoveFlow(phaseKey: string, flowIdx: number) {
    if (!constructionId.value) {
        scrollPreservingAlert('請先選擇工程案')
        return
    }
    const flowBlock = itemData.value.phases[phaseKey]?.flows?.[flowIdx]
    const flowLabel = flowBlock?.flowLabel ?? ''
    const names = uniqueManageProjectNamesInFlow(flowBlock)
    const detailFilter = flowLabelToScopedDeleteDetail(flowLabel)
    if (names.length === 0) {
        const phC = flowBlock?._placeholderConstructionId
        const phS = flowBlock?._placeholderSafetyId
        if (phC == null && phS == null) {
            scrollPreservingAlert('此施工流程下尚無管理項目，無需刪除。')
            return
        }
        if (!scrollPreservingConfirm(`確定刪除施工流程「${flowLabel}」？`)) return
        const scrollSnap = readScrollSnapshot()
        try {
            const tasks: Promise<unknown>[] = []
            if (phC != null) {
                tasks.push(deleteConstructionMajorItemStandard(constructionId.value, itemId, phC))
            }
            if (phS != null) {
                tasks.push(deleteConstructionMajorItemSafetyStandard(constructionId.value, itemId, phS))
            }
            await Promise.all(tasks)
            await reloadBothStandardsLists()
            await nextTick()
            await nextTick()
            restoreScrollSnapshot(scrollSnap)
        } catch (e) {
            console.error(e)
            scrollPreservingAlert('刪除施工流程失敗，請稍後再試')
        }
        return
    }
    if (!scrollPreservingConfirm(`確定刪除施工流程「${flowLabel}」及其下全部管理項目與檢查點？`)) return
    const scrollSnap = readScrollSnapshot()
    try {
        for (const manageProject of names) {
            if (isSafetyMode.value) {
                await deleteConstructionMajorItemSafetyStandardsByManageProject(
                    constructionId.value,
                    itemId,
                    phaseKey,
                    manageProject,
                    detailFilter
                )
            } else {
                await deleteConstructionMajorItemStandardsByManageProject(
                    constructionId.value,
                    itemId,
                    phaseKey,
                    manageProject,
                    detailFilter
                )
            }
        }
        const standards = isSafetyMode.value
            ? await getConstructionMajorItemSafetyStandards(constructionId.value, itemId)
            : await getConstructionMajorItemStandards(constructionId.value, itemId)
        replaceActiveKindStandards(standards)
        await nextTick()
        await nextTick()
        restoreScrollSnapshot(scrollSnap)
    } catch (e) {
        console.error(e)
        scrollPreservingAlert('刪除施工流程失敗，請稍後再試')
    }
}

async function onRemoveMgmt(phaseKey: string, flowIdx: number, manageProject: string) {
    if (!constructionId.value) {
        scrollPreservingAlert('請先選擇工程案')
        return
    }
    if (!manageProject?.trim()) {
        scrollPreservingAlert('無法移除：管理項目名稱異常')
        return
    }
    const flowBlock = itemData.value.phases[phaseKey]?.flows?.[flowIdx]
    const detailFilter = flowLabelToScopedDeleteDetail(flowBlock?.flowLabel ?? '')
    if (!scrollPreservingConfirm(`確定移除管理項目「${manageProject}」及其下全部檢查點列？`)) return
    const scrollSnap = readScrollSnapshot()
    try {
        if (isSafetyMode.value) {
            await deleteConstructionMajorItemSafetyStandardsByManageProject(
                constructionId.value,
                itemId,
                phaseKey,
                manageProject,
                detailFilter
            )
        } else {
            await deleteConstructionMajorItemStandardsByManageProject(
                constructionId.value,
                itemId,
                phaseKey,
                manageProject,
                detailFilter
            )
        }
        const standards = isSafetyMode.value
            ? await getConstructionMajorItemSafetyStandards(constructionId.value, itemId)
            : await getConstructionMajorItemStandards(constructionId.value, itemId)
        replaceActiveKindStandards(standards)
        await nextTick()
        await nextTick()
        restoreScrollSnapshot(scrollSnap)
    } catch (e) {
        console.error(e)
        scrollPreservingAlert('移除失敗，請稍後再試')
    }
}

async function onRemoveRow(standardId: number) {
    if (!constructionId.value) {
        scrollPreservingAlert('請先選擇工程案')
        return
    }
    if (!Number.isFinite(standardId)) return
    if (!scrollPreservingConfirm('確定移除此筆檢查點明細？')) return
    const scrollSnap = readScrollSnapshot()
    try {
        if (isSafetyMode.value) {
            await deleteConstructionMajorItemSafetyStandard(constructionId.value, itemId, standardId)
        } else {
            await deleteConstructionMajorItemStandard(constructionId.value, itemId, standardId)
        }
        const standards = isSafetyMode.value
            ? await getConstructionMajorItemSafetyStandards(constructionId.value, itemId)
            : await getConstructionMajorItemStandards(constructionId.value, itemId)
        replaceActiveKindStandards(standards)
        await nextTick()
        await nextTick()
        restoreScrollSnapshot(scrollSnap)
    } catch (e) {
        console.error(e)
        scrollPreservingAlert('移除失敗，請稍後再試')
    }
}

// 編輯功能
const editField = (
    phaseKey: string,
    flowIdx: number,
    mgmtIdx: number,
    subIdx: number,
    fieldName: string
) => {
    editingField.value = fieldName
    editModalTitle.value = `編輯 ${fieldName}`
    editTarget.value = { phase: phaseKey, flowIdx, mgmtIdx, subIdx }
    
    const subItem = getRowByMgmtSub(phaseKey, flowIdx, mgmtIdx, subIdx)
    if (!subItem) {
        scrollPreservingAlert('無法編輯：找不到對應的明細列')
        return
    }
    
    const key = rowKeyForFieldName(fieldName)
    editValue.value = { current: (subItem as any)[key] || '' }
    
    showEditModal.value = true
}

function rowKeyForFieldName(fieldName: string): string {
    switch (fieldName) {
        case '管理項目': return 'manageProject'
        case '施工檢查點': return 'checkPoint'
        case '抽查標準': return 'checkStandard'
        case '抽查時機': return 'checkTiming'
        case '抽查頻率': return 'checkFrequency'
        case '抽查方法': return 'checkMethod'
        case '不合格之處理': return 'failureHandle'
        default: return fieldName
    }
}

const saveEdit = async () => {
    if (!editTarget.value) return 
    const { phase, flowIdx, mgmtIdx, subIdx } = editTarget.value
    
    // 批次更新施工流程（work_process_detail）：同流程下全部明細
    if (editingField.value === '施工流程') {
        const flow = itemData.value.phases[phase]?.flows?.[flowIdx]
        if (!flow) return
        const newLabelRaw = (editValue.value.current ?? '').trim()
        if (!newLabelRaw) {
            scrollPreservingAlert('請輸入施工流程名稱')
            return
        }

        const allSubs: { id?: number }[] = []
        for (const r of flow.rows ?? []) {
            if (r?.id) allSubs.push(r)
        }

        const apiDetail = flowLabelToApiWorkProcessDetail(newLabelRaw)
        const payload: Partial<ConstructionMajorItemStandardResponse> = {
            workProcessDetail: apiDetail ?? null
        }

        try {
            loadingItem.value = true
            if (!constructionId.value) {
                scrollPreservingAlert('請先選擇工程案')
                return
            }
            if (allSubs.length > 0) {
                await Promise.all(
                    allSubs.map((sub) =>
                        sub.id
                            ? isSafetyMode.value
                                ? updateConstructionMajorItemSafetyStandard(
                                      constructionId.value,
                                      itemId,
                                      sub.id,
                                      payload
                                  )
                                : updateConstructionMajorItemStandard(
                                      constructionId.value,
                                      itemId,
                                      sub.id,
                                      payload
                                  )
                            : Promise.resolve()
                    )
                )
            } else {
                const phC = flow._placeholderConstructionId
                const phS = flow._placeholderSafetyId
                const phTasks: Promise<unknown>[] = []
                if (phC != null) {
                    phTasks.push(
                        updateConstructionMajorItemStandard(constructionId.value, itemId, phC, payload)
                    )
                }
                if (phS != null) {
                    phTasks.push(
                        updateConstructionMajorItemSafetyStandard(constructionId.value, itemId, phS, payload)
                    )
                }
                if (phTasks.length === 0) {
                    scrollPreservingAlert('此流程下尚無明細，無法更新流程名稱')
                    return
                }
                await Promise.all(phTasks)
            }
            await reloadBothStandardsLists()
            showEditModal.value = false
            scrollPreservingAlert('施工流程名稱更新成功')
        } catch (e) {
            console.error(e)
            scrollPreservingAlert('更新失敗，部分項目可能未同步')
        } finally {
            loadingItem.value = false
        }
        return
    }

    const subItem = getRowByMgmtSub(phase, flowIdx, mgmtIdx, subIdx)
    
    if (!subItem?.id) {
        scrollPreservingAlert('無法編輯：缺少 ID')
        return
    }

    const payload: Partial<ConstructionMajorItemStandardResponse> = {}

    if (editingField.value === '不合格之處理') {
        payload.failureHandle = editValue.value.current
    } else {
        // Mapping UI fields to API fields
        switch(editingField.value) {
            case '施工檢查點': payload.checkPoint = editValue.value.current; break;
            case '抽查標準': payload.checkStandard = editValue.value.current; break;
            case '抽查時機': payload.checkTiming = editValue.value.current; break;
            case '抽查頻率': payload.checkFeq = editValue.value.current; break;
            case '抽查方法': payload.checkMethod = editValue.value.current; break;
        }
    }

    try {
        if (!constructionId.value) {
            scrollPreservingAlert('請先選擇工程案')
            return
        }
        if (isSafetyMode.value) {
            await updateConstructionMajorItemSafetyStandard(constructionId.value, itemId, subItem.id, payload)
        } else {
            await updateConstructionMajorItemStandard(constructionId.value, itemId, subItem.id, payload)
        }
        
        // Update local state
        const key = rowKeyForFieldName(editingField.value)
        if (key === 'checkFrequency') {
            ;(subItem as any).checkFrequency = editValue.value.current
        } else {
            ;(subItem as any)[key] = key === 'failureHandle' ? payload.failureHandle : editValue.value.current
        }
        
        showEditModal.value = false
    } catch(e) {
        console.error(e)
        scrollPreservingAlert('儲存失敗')
    }
}

const editFlowItem = (phaseKey: string, flowIdx: number) => {
    editingField.value = '施工流程'
    editModalTitle.value = '編輯施工流程名稱'
    editTarget.value = { phase: phaseKey, flowIdx, mgmtIdx: -1, subIdx: -1 }
    const flow = itemData.value.phases[phaseKey]?.flows?.[flowIdx]
    editValue.value = { current: flow?.flowLabel ?? '' }
    showEditModal.value = true
}

/** 與 B-1 A-Page-Image 匯出圖一致（後端 FlowChartImageGenerator） */
const showB1FlowChartModal = ref(false)
const b1FlowChartObjectUrl = ref('')
const flowChartLoading = ref(false)

function revokeB1FlowChartUrl() {
  if (b1FlowChartObjectUrl.value) {
    URL.revokeObjectURL(b1FlowChartObjectUrl.value)
    b1FlowChartObjectUrl.value = ''
  }
}

function closeB1FlowChartModal() {
  showB1FlowChartModal.value = false
  revokeB1FlowChartUrl()
}

function onB1FlowChartModalShow(v: boolean) {
  if (!v) closeB1FlowChartModal()
}

async function openB1FlowChartModal() {
  if (!constructionId.value || !itemId) return
  flowChartLoading.value = true
  revokeB1FlowChartUrl()
  showB1FlowChartModal.value = true
  try {
    const blob = await fetchConstructionMajorItemB1FlowChartPng(constructionId.value, itemId)
    b1FlowChartObjectUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    console.error(e)
    scrollPreservingAlert('無法載入施工流程圖，請稍後再試')
    showB1FlowChartModal.value = false
  } finally {
    flowChartLoading.value = false
  }
}

onBeforeUnmount(() => {
  revokeB1FlowChartUrl()
})

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 與施工項目清單（FormBConstructionMaintenance）報表卡片邊框一致 */
.a4-dark {
  --a4-bg: #1a1d21;
  --a4-card: #25282c;
  --a4-border: #4a4d54;
  --a4-text: #e4e6eb;
  --a4-muted: #b0b3b8;
  --a4-thead: #2d3748;
  --a4-hover: rgba(255, 255, 255, 0.06);
  --a4-input-bg: #2d3139;
  --a4-input-border: #3a3d42;
  --a4-accent: #60a5fa;
}

.form-b-inspection-standards-page {
  padding: 1rem;
  color: var(--a4-text);
}

:deep(.card.report-card) {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

:deep(.card.report-card::before) {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(700px 220px at 20% 0%, rgba(var(--bs-primary-rgb), 0.12), transparent 55%);
  opacity: 0.9;
  pointer-events: none;
}

.report-card--full {
  width: 100%;
}

:deep(.card.report-card .card-body.report-card__body) {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent;
  color: var(--a4-text);
}

:deep(.breadcrumb-item),
:deep(.breadcrumb-item + .breadcrumb-item::before) {
  color: var(--a4-muted);
}

:deep(.breadcrumb-item.active) {
  color: var(--a4-text);
}

:deep(.btn-outline-secondary) {
  --bs-btn-color: var(--a4-muted);
  --bs-btn-border-color: var(--a4-border);
  --bs-btn-hover-bg: rgba(255, 255, 255, 0.08);
  --bs-btn-hover-border-color: var(--a4-border);
  --bs-btn-hover-color: var(--a4-text);
}
.inspection-standards-page-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--bs-body-bg) 65%, transparent);
  backdrop-filter: blur(2px);
}

.inspection-standards-kind-tabs {
  border-bottom-color: var(--a4-border);
}
.inspection-standards-kind-tabs .nav-link {
  color: var(--a4-muted);
  background: transparent;
  border: 1px solid transparent;
}
.inspection-standards-kind-tabs .nav-link:hover {
  color: var(--a4-text);
  border-color: var(--a4-border);
}
.inspection-standards-kind-tabs .nav-link.active {
  color: var(--a4-accent);
  background: rgba(96, 165, 250, 0.08);
  border-color: var(--a4-border);
  border-bottom-color: transparent;
}

.inspection-standards-shared-hint {
  color: #93c5fd;
  padding: 0.15rem 0;
}

.inspection-standards-shared-hint > i {
  color: inherit;
}

.hint-strong {
  font-weight: 900;
  color: inherit;
}

.hint-sep {
  display: inline-block;
  margin: 0 0.5rem;
  color: inherit;
}

.inspection-standards-toolbar-bulk .inspection-standards-kind-switch {
  flex: 1 1 320px;
  min-width: min(100%, 260px);
  max-width: 720px;
  width: auto;
}

.inspection-standards-flowchart-btn {
  white-space: nowrap;
  border-radius: 0.55rem;
}

.inspection-standards-flowchart-img-wrap {
  max-height: 72vh;
  overflow: auto;
}

.inspection-standards-flowchart-img {
  max-width: 100%;
  height: auto;
  vertical-align: middle;
}

.inspection-standards-kind-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  max-width: 720px;
  padding: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--a4-border) 80%, transparent);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.035);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.kind-seg {
  --kind-accent: var(--a4-accent);
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: 0.6rem;
  padding: 0.5rem 0.9rem;
  font-weight: 800;
  font-size: 0.92rem;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  background: transparent;
  color: color-mix(in srgb, var(--a4-text) 70%, var(--a4-muted));
  position: relative;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease, transform 120ms ease;
  user-select: none;
}

.kind-seg:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--a4-text);
}

.kind-seg.is-active {
  background: rgba(15, 23, 42, 0.65);
  color: var(--a4-text);
  border-color: color-mix(in srgb, var(--kind-accent) 65%, transparent);
  box-shadow:
    0 10px 26px rgba(0, 0, 0, 0.22),
    inset 0 0 0 1px color-mix(in srgb, var(--kind-accent) 45%, transparent);
}

.kind-seg--construction {
  --kind-accent: #60a5fa;
}

.kind-seg--safety {
  --kind-accent: #f59e0b;
}
</style>
