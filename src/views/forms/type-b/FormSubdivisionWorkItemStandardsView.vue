<template>
  <div class="form-b-inspection-standards-page a4-dark h-100">
    <template v-if="!isContractor">
      <Card class="mb-3 report-card report-card--full" style="min-height: 500px">
        <CardBody class="report-card__body" data-bs-theme="dark">
          <div class="alert alert-info mb-0" role="alert">
            <i class="fa fa-info-circle me-2"></i>
            此頁僅供營造端編輯分項工程之自主檢查標準明細。
          </div>
        </CardBody>
      </Card>
    </template>

    <template v-else>
      <div class="d-flex align-items-center gap-3 mb-3 inspection-standards-page__toolbar">
        <button type="button" class="btn btn-outline-secondary" @click="goBack">
          <i class="fa fa-arrow-left me-1"></i> 返回清單
        </button>
        <nav aria-label="breadcrumb" class="flex-grow-1">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item text-muted">分項工程維護</li>
            <li class="breadcrumb-item text-muted">{{ currentItem?.name || '載入中...' }}</li>
            <li class="breadcrumb-item active" aria-current="page">自主檢查標準表</li>
          </ol>
        </nav>
      </div>

      <Card class="mb-3 report-card report-card--full" style="min-height: 500px">
        <CardBody class="report-card__body" data-bs-theme="dark">
          <div v-if="loading" class="d-flex align-items-center justify-content-center gap-2 py-5 text-muted">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span>載入分項資料中...</span>
          </div>
          <div v-else-if="loadError" class="alert alert-danger mb-0">{{ loadError }}</div>
          <template v-else-if="currentItem">
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
              <div class="flex-grow-1">
                <h4 class="fw-bold mb-1">{{ currentItem.name }}</h4>
                <div class="text-muted small mb-0">
                  {{ currentItem.remark?.trim() ? currentItem.remark : '無備註' }}
                </div>
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
              :show-ai-generate-button="false"
              :empty-text="emptyPhaseText"
              :persistence-key="collapsePersistenceKey"
              inspection-label="自主檢查"
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
                    aria-label="自主檢查標準分頁切換"
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
                      施工自主檢查標準
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
                      安全衛生自主檢查標準
                    </button>
                  </div>
                </div>
              </template>
            </InspectionStandardsPhasesTable>
          </template>
        </CardBody>
      </Card>
    </template>

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
          <textarea v-model="editValue.current" class="form-control" rows="5"></textarea>
        </div>
        <div v-else-if="editingField === '施工檢查點'">
          <label class="form-label">{{ displayEditingField }}</label>
          <select v-model="editValue.current" class="form-select">
            <option value="">(無)</option>
            <option value="★">★</option>
            <option value="※">※</option>
            <option value="★※">★※</option>
          </select>
        </div>
        <div v-else>
          <label class="form-label">{{ editingField }}</label>
          <textarea v-model="editValue.current" class="form-control" rows="5"></textarea>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import {
  listSubdivisionWorkItems,
  createSubdivisionConstructionStandard,
  createSubdivisionSafetyStandard,
  updateSubdivisionConstructionStandard,
  updateSubdivisionSafetyStandard,
  deleteSubdivisionConstructionStandard,
  deleteSubdivisionConstructionStandardsByPhase,
  deleteSubdivisionConstructionStandardsByManageProject,
  deleteSubdivisionSafetyStandard,
  deleteSubdivisionSafetyStandardsByPhase,
  deleteSubdivisionSafetyStandardsByManageProject,
  type SubdivisionWorkItem,
  type SubdivisionWorkItemStandardLine,
  type SubdivisionWorkItemStandardUpdatePayload
} from '@/api/subdivisionWorkItems'
import type { ConstructionMajorItemStandardResponse } from '@/api/pcces'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import InspectionStandardsPhasesTable from '@/components/inspection/InspectionStandardsPhasesTable.vue'
import {
  buildMergedInspectionPhasesForTab,
  type InspectionPhaseBlock,
  type InspectionStandardsKind,
  INSPECTION_PLACEHOLDER_FLOW,
  UNCLASSIFIED_WORK_PROCESS_FLOW_KEY
} from '@/utils/buildInspectionPhasesFromLines'
import {
  buildCreatePayloadForNewMgmt,
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
const { isContractor } = useViewPerspective()

/** 與監造「抽查標準表」頁：query ?tab=safety 或舊路由 redirect 對齊 */
const activeStandardsTab = ref<InspectionStandardsKind>('construction')
const isSafetyMode = computed(() => activeStandardsTab.value === 'safety')

const masterKindLabel = computed(() =>
  isSafetyMode.value ? '安全衛生自主檢查標準來源（主檔）' : '施工自主檢查標準來源（主檔）'
)

const emptyPhaseText = computed(() => `目前尚無${masterKindLabel.value}資料`)

const constructionId = computed(() => workspaceStore.currentProject?.id?.trim() ?? '')

const designChangeId = computed((): number | null => {
  const raw = route.query.designChangeId
  if (raw === undefined || raw === null || raw === '') return null
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = Number(s)
  return Number.isFinite(n) ? n : null
})

const itemIdParam = computed(() => {
  const raw = route.params.itemId
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
})

/** 施工／安衛共用同一套階段與流程骨架，摺疊狀態不分頁（與監造一致） */
const collapsePersistenceKey = computed(() => {
  const cid = constructionId.value
  const sid = itemIdParam.value
  if (!cid || !Number.isFinite(sid)) return ''
  const d = designChangeId.value
  return `${cid}:${sid}:${d === null ? 'null' : d}:contractor-subdivision-inspection-shared`
})

const loading = ref(false)
const loadError = ref('')
const currentItem = ref<SubdivisionWorkItem | null>(null)

const standardsConstruction = ref<SubdivisionWorkItemStandardLine[]>([])
const standardsSafety = ref<SubdivisionWorkItemStandardLine[]>([])

const itemData = ref<{ phases: Record<string, InspectionPhaseBlock> }>({ phases: {} })

const showEditModal = ref(false)
const editModalTitle = ref('')
const editingField = ref('')
const displayEditingField = computed(() => editingField.value.replace('抽查', '自主檢查'))
const editTarget = ref<{
  phase: string
  flowIdx: number
  mgmtIdx: number
  subIdx: number
} | null>(null)
const editValue = ref<{
  current?: string
  failure?: string
  record?: string
  note?: string
}>({})

const showAddFlowModal = ref(false)
const addFlowPhaseKey = ref('')
const addFlowName = ref('')

const showAddMgmtModal = ref(false)
const addMgmtPhaseKey = ref('')
const addMgmtFlowIdx = ref<number | null>(null)
const addMgmtName = ref('')

function applyMergedDisplay() {
  itemData.value = buildMergedInspectionPhasesForTab(
    standardsConstruction.value,
    standardsSafety.value,
    activeStandardsTab.value
  )
}

function syncStandardsFromCurrentItem() {
  if (!currentItem.value) {
    standardsConstruction.value = []
    standardsSafety.value = []
    itemData.value = { phases: {} }
    return
  }
  standardsConstruction.value = currentItem.value.constructionStandards ?? []
  standardsSafety.value = currentItem.value.safetyStandards ?? []
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
  return (itemData.value as any)?.phases?.[phaseKey]?.flows?.[flowIdx] ?? null
}

function getRowByMgmtSub(phaseKey: string, flowIdx: number, mgmtIdx: number, subIdx: number): any | null {
  const flow = getFlow(phaseKey, flowIdx)
  if (!flow) return null
  const groups = groupRowsByManageProject(flow)
  return groups?.[mgmtIdx]?.rows?.[subIdx] ?? null
}

async function load(options?: { quiet?: boolean }) {
  loadError.value = ''
  if (!isContractor.value) {
    loading.value = false
    return
  }
  const cid = constructionId.value
  if (!cid) {
    loadError.value = '請先於左側選擇工程案'
    currentItem.value = null
    standardsConstruction.value = []
    standardsSafety.value = []
    itemData.value = { phases: {} }
    return
  }
  const idNum = itemIdParam.value
  if (!Number.isFinite(idNum)) {
    loadError.value = '無效的分項編號'
    currentItem.value = null
    standardsConstruction.value = []
    standardsSafety.value = []
    itemData.value = { phases: {} }
    return
  }
  const quiet = options?.quiet === true
  if (!quiet) loading.value = true
  try {
    syncTabFromRouteQuery()
    const rows = await listSubdivisionWorkItems(cid, designChangeId.value)
    const found = rows.find((r) => r.id === idNum) ?? null
    if (!found) {
      loadError.value = '找不到此分項工程，或已不屬於目前選取之版本'
      currentItem.value = null
      standardsConstruction.value = []
      standardsSafety.value = []
      itemData.value = { phases: {} }
      return
    }
    currentItem.value = found
    syncStandardsFromCurrentItem()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    loadError.value = err?.response?.data?.message ?? err?.message ?? '載入失敗'
    currentItem.value = null
    standardsConstruction.value = []
    standardsSafety.value = []
    itemData.value = { phases: {} }
  } finally {
    if (!quiet) loading.value = false
  }
}

function goBack() {
  router.push({
    path: '/forms/subdivision-work-items',
    query:
      designChangeId.value != null ? { designChangeId: String(designChangeId.value) } : {}
  })
}

function onAddFlow(phaseKey: string) {
  addFlowPhaseKey.value = phaseKey
  addFlowName.value = ''
  showAddFlowModal.value = true
}

async function confirmAddFlow() {
  const cid = constructionId.value
  if (!cid || !currentItem.value) return
  const sid = itemIdParam.value
  if (!Number.isFinite(sid)) return
  const phaseKey = addFlowPhaseKey.value
  const newLabelRaw = (addFlowName.value ?? '').trim()
  if (!newLabelRaw) {
    scrollPreservingAlert('請輸入施工流程名稱')
    return
  }
  const apiDetail = flowLabelToApiWorkProcessDetail(newLabelRaw)
  const payload: SubdivisionWorkItemStandardUpdatePayload = {
    workProcess: phaseKeyToWorkProcess(phaseKey) ?? null,
    workProcessDetail: apiDetail ?? null,
    remark: INSPECTION_PLACEHOLDER_FLOW
  }
  const ctx = { constructionId: cid, designChangeId: designChangeId.value }
  const scrollSnap = readScrollSnapshot()
  try {
    if (isSafetyMode.value) {
      await createSubdivisionSafetyStandard(sid, ctx, payload)
    } else {
      await createSubdivisionConstructionStandard(sid, ctx, payload)
    }
    await load({ quiet: true })
    showAddFlowModal.value = false
    await nextTick()
    await nextTick()
    restoreScrollSnapshot(scrollSnap)
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    scrollPreservingAlert(err?.response?.data?.message ?? err?.message ?? '新增施工流程失敗')
  }
}

async function onAddMgmtItem(phaseKey: string, flowIdx?: number) {
  addMgmtPhaseKey.value = phaseKey
  addMgmtFlowIdx.value = flowIdx ?? null
  addMgmtName.value = ''
  showAddMgmtModal.value = true
}

async function confirmAddMgmt() {
  const cid = constructionId.value
  if (!cid || !currentItem.value) return
  const sid = itemIdParam.value
  if (!Number.isFinite(sid)) return
  const phaseKey = addMgmtPhaseKey.value
  const flowIdx = addMgmtFlowIdx.value
  const name = (addMgmtName.value ?? '').trim()
  if (!name) {
    scrollPreservingAlert('請輸入管理項目名稱')
    return
  }
  const ctx = { constructionId: cid, designChangeId: designChangeId.value }
  const flowBlock =
    flowIdx != null ? (itemData.value as any).phases[phaseKey]?.flows?.[flowIdx] : undefined
  const apiDetail =
    flowIdx != null ? flowLabelToApiWorkProcessDetail(flowBlock?.flowLabel ?? '') : undefined
  const payload: SubdivisionWorkItemStandardUpdatePayload = {
    workProcess: phaseKeyToWorkProcess(phaseKey) ?? null,
    workProcessDetail: apiDetail ?? null,
    manageProject: name,
  }
  const scrollSnap = readScrollSnapshot()
  try {
    if (isSafetyMode.value) {
      await createSubdivisionSafetyStandard(sid, ctx, payload)
    } else {
      await createSubdivisionConstructionStandard(sid, ctx, payload)
    }
    await load({ quiet: true })
    showAddMgmtModal.value = false
    await nextTick()
    await nextTick()
    restoreScrollSnapshot(scrollSnap)
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    scrollPreservingAlert(err?.response?.data?.message ?? err?.message ?? '新增管理項目失敗')
  }
}

async function onAddSubItem(phaseKey: string, flowIdx: number, mgmtIdx: number) {
  const cid = constructionId.value
  if (!cid || !currentItem.value) return
  const sid = itemIdParam.value
  if (!Number.isFinite(sid)) return
  const ctx = { constructionId: cid, designChangeId: designChangeId.value }
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
  const apiDetail = flowLabelToApiWorkProcessDetail(flow?.flowLabel ?? '')
  const body: SubdivisionWorkItemStandardUpdatePayload = {
    workProcess: phaseKeyToWorkProcess(phaseKey) ?? null,
    workProcessDetail: apiDetail ?? null,
    manageProject: g.name
  }
  const scrollSnap = readScrollSnapshot()
  try {
    if (isSafetyMode.value) {
      await createSubdivisionSafetyStandard(sid, ctx, body)
    } else {
      await createSubdivisionConstructionStandard(sid, ctx, body)
    }
    await load({ quiet: true })
    await nextTick()
    await nextTick()
    restoreScrollSnapshot(scrollSnap)
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    scrollPreservingAlert(err?.response?.data?.message ?? err?.message ?? '新增施工檢查點列失敗')
  }
}

async function onRemoveFlow(phaseKey: string, flowIdx: number) {
  const cid = constructionId.value
  if (!cid || !currentItem.value) return
  const sid = itemIdParam.value
  if (!Number.isFinite(sid)) return
  const flowBlock = itemData.value.phases[phaseKey]?.flows?.[flowIdx]
  const flowLabel = flowBlock?.flowLabel ?? ''
  const names = uniqueManageProjectNamesInFlow(flowBlock)
  const detailFilter = flowLabelToScopedDeleteDetail(flowLabel)
  if (names.length === 0) {
    const phC = (flowBlock as any)?._placeholderConstructionId as number | undefined
    const phS = (flowBlock as any)?._placeholderSafetyId as number | undefined
    if (phC == null && phS == null) {
      scrollPreservingAlert('此施工流程下尚無管理項目，無需刪除。')
      return
    }
    if (!scrollPreservingConfirm(`確定刪除施工流程「${flowLabel}」？`)) return
    const ctx = { constructionId: cid, designChangeId: designChangeId.value }
    const scrollSnap = readScrollSnapshot()
    try {
      const tasks: Promise<unknown>[] = []
      if (phC != null) tasks.push(deleteSubdivisionConstructionStandard(sid, phC, ctx))
      if (phS != null) tasks.push(deleteSubdivisionSafetyStandard(sid, phS, ctx))
      await Promise.all(tasks)
      await load({ quiet: true })
      await nextTick()
      await nextTick()
      restoreScrollSnapshot(scrollSnap)
    } catch (e: unknown) {
      console.error(e)
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      scrollPreservingAlert(err?.response?.data?.message ?? err?.message ?? '刪除施工流程失敗')
    }
    return
  }
  if (!scrollPreservingConfirm(`確定刪除施工流程「${flowLabel}」及其下全部管理項目與檢查點？`)) return
  const ctx = { constructionId: cid, designChangeId: designChangeId.value }
  const scrollSnap = readScrollSnapshot()
  try {
    for (const manageProject of names) {
      if (isSafetyMode.value) {
        await deleteSubdivisionSafetyStandardsByManageProject(
          sid,
          phaseKey,
          manageProject,
          ctx,
          detailFilter
        )
      } else {
        await deleteSubdivisionConstructionStandardsByManageProject(
          sid,
          phaseKey,
          manageProject,
          ctx,
          detailFilter
        )
      }
    }
    await load({ quiet: true })
    await nextTick()
    await nextTick()
    restoreScrollSnapshot(scrollSnap)
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    scrollPreservingAlert(err?.response?.data?.message ?? err?.message ?? '刪除施工流程失敗')
  }
}

async function onRemoveMgmt(phaseKey: string, flowIdx: number, manageProject: string) {
  const cid = constructionId.value
  if (!cid || !currentItem.value) return
  const sid = itemIdParam.value
  if (!Number.isFinite(sid)) return
  if (!manageProject?.trim()) {
    scrollPreservingAlert('無法移除：管理項目名稱異常')
    return
  }
  const flowBlock = itemData.value.phases[phaseKey]?.flows?.[flowIdx]
  const detailFilter = flowLabelToScopedDeleteDetail(flowBlock?.flowLabel ?? '')
  if (!scrollPreservingConfirm(`確定移除管理項目「${manageProject}」及其下全部檢查點列？`)) return
  const ctx = { constructionId: cid, designChangeId: designChangeId.value }
  const scrollSnap = readScrollSnapshot()
  try {
    if (isSafetyMode.value) {
      await deleteSubdivisionSafetyStandardsByManageProject(
        sid,
        phaseKey,
        manageProject,
        ctx,
        detailFilter
      )
    } else {
      await deleteSubdivisionConstructionStandardsByManageProject(
        sid,
        phaseKey,
        manageProject,
        ctx,
        detailFilter
      )
    }
    await load({ quiet: true })
    await nextTick()
    await nextTick()
    restoreScrollSnapshot(scrollSnap)
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    scrollPreservingAlert(err?.response?.data?.message ?? err?.message ?? '移除失敗')
  }
}

async function onRemoveRow(standardId: number) {
  const cid = constructionId.value
  if (!cid || !currentItem.value) return
  const sid = itemIdParam.value
  if (!Number.isFinite(sid) || !Number.isFinite(standardId)) return
  if (!scrollPreservingConfirm('確定移除此筆檢查點明細？')) return
  const ctx = { constructionId: cid, designChangeId: designChangeId.value }
  const scrollSnap = readScrollSnapshot()
  try {
    if (isSafetyMode.value) {
      await deleteSubdivisionSafetyStandard(sid, standardId, ctx)
    } else {
      await deleteSubdivisionConstructionStandard(sid, standardId, ctx)
    }
    await load({ quiet: true })
    await nextTick()
    await nextTick()
    restoreScrollSnapshot(scrollSnap)
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    scrollPreservingAlert(err?.response?.data?.message ?? err?.message ?? '移除失敗')
  }
}

function editField(
  phaseKey: string,
  flowIdx: number,
  mgmtIdx: number,
  subIdx: number,
  fieldName: string
) {
  editingField.value = fieldName
  editModalTitle.value = `編輯 ${fieldName.replace('抽查', '自主檢查')}`
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
    case '管理項目':
      return 'manageProject'
    case '施工檢查點':
      return 'checkPoint'
    case '抽查標準':
      return 'checkStandard'
    case '抽查時機':
      return 'checkTiming'
    case '抽查頻率':
      return 'checkFrequency'
    case '抽查方法':
      return 'checkMethod'
    case '不合格之處理':
      return 'failureHandle'
    default:
      return fieldName
  }
}

function editFlowItem(phaseKey: string, flowIdx: number) {
  editingField.value = '施工流程'
  editModalTitle.value = '編輯施工流程名稱'
  editTarget.value = { phase: phaseKey, flowIdx, mgmtIdx: -1, subIdx: -1 }
  const flow = (itemData.value as { phases: Record<string, InspectionPhaseBlock> }).phases[
    phaseKey
  ]?.flows?.[flowIdx]
  editValue.value = { current: flow?.flowLabel ?? '' }
  showEditModal.value = true
}

async function saveEdit() {
  if (!editTarget.value || !constructionId.value) return
  const { phase, flowIdx, mgmtIdx, subIdx } = editTarget.value
  const ctx = { constructionId: constructionId.value, designChangeId: designChangeId.value }
  const subId = itemIdParam.value

  if (editingField.value === '施工流程') {
    const flow = (itemData.value as { phases: Record<string, InspectionPhaseBlock> }).phases[phase]
      ?.flows?.[flowIdx]
    if (!flow) return
    const newLabelRaw = (editValue.value.current ?? '').trim()
    if (!newLabelRaw) {
      scrollPreservingAlert('請輸入施工流程名稱')
      return
    }
    const allSubs: { id?: number }[] = []
    for (const r of (flow as any).rows ?? []) {
      if (r?.id) allSubs.push(r)
    }

    const apiDetail = flowLabelToApiWorkProcessDetail(newLabelRaw)
    const payload: SubdivisionWorkItemStandardUpdatePayload = {
      workProcessDetail: apiDetail ?? null
    }

    try {
      loading.value = true
      if (allSubs.length > 0) {
        await Promise.all(
          allSubs.map((sub) =>
            sub.id
              ? isSafetyMode.value
                ? updateSubdivisionSafetyStandard(subId, sub.id, payload, ctx)
                : updateSubdivisionConstructionStandard(subId, sub.id, payload, ctx)
              : Promise.resolve()
          )
        )
      } else {
        const phC = (flow as any)._placeholderConstructionId as number | undefined
        const phS = (flow as any)._placeholderSafetyId as number | undefined
        const phTasks: Promise<unknown>[] = []
        if (phC != null) {
          phTasks.push(updateSubdivisionConstructionStandard(subId, phC, payload, ctx))
        }
        if (phS != null) {
          phTasks.push(updateSubdivisionSafetyStandard(subId, phS, payload, ctx))
        }
        if (phTasks.length === 0) {
          scrollPreservingAlert('此流程下尚無明細，無法更新流程名稱')
          return
        }
        await Promise.all(phTasks)
      }
      await load({ quiet: true })
      showEditModal.value = false
      scrollPreservingAlert('施工流程名稱更新成功')
    } catch (e: unknown) {
      console.error(e)
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      scrollPreservingAlert(err?.response?.data?.message ?? err?.message ?? '更新失敗')
    } finally {
      loading.value = false
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
    switch (editingField.value) {
      case '施工檢查點':
        payload.checkPoint = editValue.value.current
        break
      case '抽查標準':
        payload.checkStandard = editValue.value.current
        break
      case '抽查時機':
        payload.checkTiming = editValue.value.current
        break
      case '抽查頻率':
        payload.checkFeq = editValue.value.current
        break
      case '抽查方法':
        payload.checkMethod = editValue.value.current
        break
    }
  }

  try {
    if (isSafetyMode.value) {
      await updateSubdivisionSafetyStandard(subId, subItem.id, payload, ctx)
    } else {
      await updateSubdivisionConstructionStandard(subId, subItem.id, payload, ctx)
    }

    const key = rowKeyForFieldName(editingField.value)
    if (key === 'checkFrequency') {
      ;(subItem as any).checkFrequency = editValue.value.current
    } else {
      ;(subItem as any)[key] = key === 'failureHandle' ? payload.failureHandle : editValue.value.current
    }

    showEditModal.value = false
  } catch (e: unknown) {
    console.error(e)
    scrollPreservingAlert('儲存失敗')
  }
}

watch(
  () => route.query.tab,
  () => {
    syncTabFromRouteQuery()
    applyMergedDisplay()
  }
)

watch(
  () =>
    [
      isContractor.value,
      workspaceStore.currentProject?.id ?? '',
      route.params.itemId,
      route.query.designChangeId
    ] as const,
  () => {
    load()
  },
  { immediate: true }
)
</script>

<style scoped>
/* 與施工項目／分項維護報表卡片邊框一致 */
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

:deep(.alert-info) {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.25);
  color: #93c5fd;
}

:deep(.alert-danger) {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
  color: #fecaca;
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
