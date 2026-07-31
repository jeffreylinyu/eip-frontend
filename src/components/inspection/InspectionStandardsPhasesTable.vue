<template>
  <div class="inspection-standards-phases-table">
    <div v-if="!interactive && !hasAnyStdContent" class="text-center py-4 text-muted">
      <slot name="empty">
        <p class="mb-0 small">{{ emptyText }}</p>
      </slot>
    </div>
    <div v-else class="hierarchy-root">
      <div
        v-if="showBulkToolbar"
        class="hierarchy-bulk-toolbar d-flex flex-nowrap align-items-center w-100"
        role="region"
        :aria-label="bulkToolbarAriaLabel"
      >
        <slot name="bulk-left">
          <div v-if="showHierarchySearch" class="hierarchy-bulk-toolbar__search flex-grow-1 min-w-0">
            <label class="visually-hidden" for="hierarchy-search-input">搜尋{{ inspectionLabel }}標準階層</label>
            <div class="hierarchy-search-merge d-flex align-items-center gap-2 min-w-0">
              <i class="fa fa-search hierarchy-search-merge__icon flex-shrink-0" aria-hidden="true"></i>
              <input
                id="hierarchy-search-input"
                v-model="hierarchySearch"
                type="search"
                class="form-control form-control-sm hierarchy-search-input"
                :placeholder="`搜尋階段、流程、管理項目、檢查點與${inspectionLabel}內容…`"
                autocomplete="off"
                enterkeyhint="search"
              />
            </div>
          </div>
        </slot>
        <div
          class="hierarchy-bulk-toolbar__actions d-flex align-items-center gap-2 flex-shrink-0 ms-auto"
        >
          <button
            v-if="interactive && showAiGenerateButton"
            type="button"
            class="btn-ai-generate btn-ai-generate--toolbar"
            :disabled="aiGenerating"
            @click="emit('aiGenerateFromDb')"
            :title="aiGenerateButtonTitle"
          >
            <i
              class="fa fa-wand-magic-sparkles me-1 me-sm-2 d-none d-sm-inline"
              aria-hidden="true"
            ></i>
            <span v-if="aiGenerating" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            {{ aiGenerateButtonLabel }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-primary hierarchy-toolbar-btn"
            @click="expandAll"
          >
            <i class="fa fa-expand me-1 d-none d-sm-inline" aria-hidden="true"></i>全部展開
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary hierarchy-toolbar-btn"
            @click="collapseAll"
          >
            <i class="fa fa-compress me-1 d-none d-sm-inline" aria-hidden="true"></i>全部收合
          </button>
        </div>
      </div>

      <div
        v-if="searchQueryActive && !hasFilteredPhases"
        class="hierarchy-search-empty small mb-3 py-2 px-0"
        role="status"
      >
        沒有符合「{{ hierarchySearch.trim() }}」的項目
      </div>

      <div
        v-for="pRow in hierarchyViewRows"
        :key="'ph-' + String(pRow.phaseKey)"
        class="hierarchy-phase"
      >
        <div class="hierarchy-panel hierarchy-panel--phase">
        <!-- 施工階段 -->
        <div
          class="hierarchy-header hierarchy-header--phase"
          :class="{ 'is-collapsed': !isPhaseOpen(String(pRow.phaseKey)) }"
        >
          <button
            type="button"
            class="hierarchy-toggle btn btn-link p-0 text-decoration-none"
            :aria-expanded="isPhaseOpen(String(pRow.phaseKey))"
            @click="togglePhase(String(pRow.phaseKey))"
          >
            <i
              class="fa fa-fw"
              :class="isPhaseOpen(String(pRow.phaseKey)) ? 'fa-chevron-down' : 'fa-chevron-right'"
            />
          </button>
          <div
            class="hierarchy-title flex-grow-1 min-w-0"
            role="button"
            tabindex="0"
            @click="togglePhase(String(pRow.phaseKey))"
            @keydown.enter.prevent="togglePhase(String(pRow.phaseKey))"
            @keydown.space.prevent="togglePhase(String(pRow.phaseKey))"
          >
            <span class="hierarchy-label">施工階段</span>
            <span class="hierarchy-value text-truncate">{{ pRow.phaseKey }}</span>
          </div>
          <div
            v-if="interactive && !lockFlowStructure"
            class="hierarchy-actions hierarchy-actions--inline flex-shrink-0"
            @click.stop
          >
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              @click="emit('addFlow', String(pRow.phaseKey))"
            >
              <i class="fa fa-plus me-1" aria-hidden="true"></i>新增施工流程
            </button>
          </div>
        </div>

        <div
          v-show="isPhaseOpen(String(pRow.phaseKey))"
          class="hierarchy-panel__body hierarchy-panel__body--phase"
        >
          <template v-if="pRow.flows.length > 0">
            <div
              v-for="fr in pRow.flows"
              :key="`fl-${String(pRow.phaseKey)}-${fr.flowIdx}`"
              class="hierarchy-flow"
            >
              <div class="hierarchy-panel hierarchy-panel--flow">
              <!-- 第二層：預設「施工流程」，P 類動態頁可改為「主要工序」 -->
              <div
                class="hierarchy-header hierarchy-header--flow"
                :class="{ 'is-collapsed': !isFlowOpen(String(pRow.phaseKey), fr.flowIdx) }"
              >
                <button
                  type="button"
                  class="hierarchy-toggle btn btn-link p-0 text-decoration-none"
                  :aria-expanded="isFlowOpen(String(pRow.phaseKey), fr.flowIdx)"
                  @click="toggleFlow(String(pRow.phaseKey), fr.flowIdx)"
                >
                  <i
                    class="fa fa-fw"
                    :class="
                      isFlowOpen(String(pRow.phaseKey), fr.flowIdx)
                        ? 'fa-chevron-down'
                        : 'fa-chevron-right'
                    "
                  />
                </button>
                <div
                  class="hierarchy-title hierarchy-title--expand flex-grow-1 min-w-0"
                  role="button"
                  tabindex="0"
                  @click="toggleFlow(String(pRow.phaseKey), fr.flowIdx)"
                  @keydown.enter.prevent="toggleFlow(String(pRow.phaseKey), fr.flowIdx)"
                  @keydown.space.prevent="toggleFlow(String(pRow.phaseKey), fr.flowIdx)"
                >
                  <span class="hierarchy-label">{{ secondLevelHeaderLabel }}</span>
                  <span
                    class="hierarchy-value text-truncate"
                    :class="{ 'is-clickable': interactive && !lockFlowStructure }"
                    :title="interactive && !lockFlowStructure ? '點擊編輯流程名稱' : undefined"
                    :tabindex="interactive && !lockFlowStructure ? 0 : -1"
                    @click.stop="
                      onFlowNameActivate(String(pRow.phaseKey), fr.flowIdx, $event)
                    "
                    @keydown.enter.stop.prevent="
                      onFlowNameKeydown(String(pRow.phaseKey), fr.flowIdx, $event)
                    "
                    @keydown.space.stop.prevent="
                      onFlowNameKeydown(String(pRow.phaseKey), fr.flowIdx, $event)
                    "
                    >{{ fr.flow.flowLabel }}</span>
                </div>
                <div v-if="interactive" class="hierarchy-actions hierarchy-actions--inline flex-shrink-0" @click.stop>
                  <button
                    v-if="!hideAddMgmtItem"
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    @click="emit('addMgmtItem', String(pRow.phaseKey), fr.flowIdx)"
                  >
                    <i class="fa fa-plus me-1" aria-hidden="true"></i>新增管理項目
                  </button>
                  <button
                    v-if="!lockFlowStructure"
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    @click="emit('removeFlow', String(pRow.phaseKey), fr.flowIdx)"
                  >
                    <i class="fa fa-trash me-1" aria-hidden="true"></i>刪除流程
                  </button>
                </div>
              </div>

              <div
                v-show="isFlowOpen(String(pRow.phaseKey), fr.flowIdx)"
                class="hierarchy-panel__body hierarchy-panel__body--flow"
              >
                <div class="table-responsive hierarchy-table-responsive--flush">
                  <table class="table table-bordered table-hover align-middle inspection-standards-inner-table mb-0">
                    <thead>
                      <tr>
                        <th style="width: 180px">管理項目</th>
                        <th style="width: 100px">施工檢查點</th>
                        <th style="width: 250px">{{ inspectionLabel }}標準</th>
                        <th style="width: 120px">{{ inspectionLabel }}時機</th>
                        <th style="width: 150px">{{ inspectionLabel }}頻率</th>
                        <th style="width: 200px">{{ inspectionLabel }}方法</th>
                        <th>不合格之處理</th>
                        <th
                          v-if="interactive && !hideRemoveRowButton"
                          style="width: 72px"
                          class="text-center"
                        >
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-if="fr.mgmts.length > 0">
                        <tr v-for="row in flattenMgmtRows(fr)" :key="`${row.mgmtIdx}-${row.subIdx}`">
                          <td
                            :class="cellFieldClass"
                            :title="interactive ? '點擊編輯' : undefined"
                            @click="
                              interactive
                                ? onEditField(
                                    String(pRow.phaseKey),
                                    fr.flowIdx,
                                    row.mgmtIdx,
                                    row.subIdx,
                                    '管理項目'
                                  )
                                : undefined
                            "
                          >
                            {{ row.manageProject || '-' }}
                          </td>
                          <td
                            :class="cellFieldClass"
                            :title="interactive ? '點擊編輯' : undefined"
                            @click="
                              interactive
                                ? onEditField(
                                    String(pRow.phaseKey),
                                    fr.flowIdx,
                                    row.mgmtIdx,
                                    row.subIdx,
                                    '施工檢查點'
                                  )
                                : undefined
                            "
                          >
                            {{ row.sub.checkPoint || '-' }}
                          </td>
                          <td
                            :class="cellFieldClass"
                            :title="interactive ? '點擊編輯' : undefined"
                            @click="
                              interactive
                                ? onEditField(
                                    String(pRow.phaseKey),
                                    fr.flowIdx,
                                    row.mgmtIdx,
                                    row.subIdx,
                                    '抽查標準'
                                  )
                                : undefined
                            "
                          >
                            {{ row.sub.checkStandard || '-' }}
                          </td>
                          <td
                            :class="cellFieldClass"
                            :title="interactive ? '點擊編輯' : undefined"
                            @click="
                              interactive
                                ? onEditField(
                                    String(pRow.phaseKey),
                                    fr.flowIdx,
                                    row.mgmtIdx,
                                    row.subIdx,
                                    '抽查時機'
                                  )
                                : undefined
                            "
                          >
                            {{ row.sub.checkTiming || '-' }}
                          </td>
                          <td
                            :class="cellFieldClass"
                            :title="interactive ? '點擊編輯' : undefined"
                            @click="
                              interactive
                                ? onEditField(
                                    String(pRow.phaseKey),
                                    fr.flowIdx,
                                    row.mgmtIdx,
                                    row.subIdx,
                                    '抽查頻率'
                                  )
                                : undefined
                            "
                          >
                            {{ row.sub.checkFrequency || '-' }}
                          </td>
                          <td
                            :class="cellFieldClass"
                            :title="interactive ? '點擊編輯' : undefined"
                            @click="
                              interactive
                                ? onEditField(
                                    String(pRow.phaseKey),
                                    fr.flowIdx,
                                    row.mgmtIdx,
                                    row.subIdx,
                                    '抽查方法'
                                  )
                                : undefined
                            "
                          >
                            {{ row.sub.checkMethod || '-' }}
                          </td>
                          <td
                            class="small text-muted"
                            :class="cellFieldClass"
                            :title="interactive ? '點擊編輯' : undefined"
                            @click="
                              interactive
                                ? onEditField(
                                    String(pRow.phaseKey),
                                    fr.flowIdx,
                                    row.mgmtIdx,
                                    row.subIdx,
                                    '不合格之處理'
                                  )
                                : undefined
                            "
                          >
                            {{ row.sub.failureHandle || '—' }}
                          </td>
                          <td
                            v-if="interactive && !hideRemoveRowButton"
                            class="text-center align-middle text-nowrap"
                          >
                            <div class="d-flex flex-column gap-1">
                              <button
                                v-if="row.sub.id != null && row.sub.id !== undefined"
                                type="button"
                                class="btn btn-sm btn-outline-danger"
                                @click.stop="emit('removeRow', Number(row.sub.id))"
                              >
                                <i class="fa fa-trash me-1" aria-hidden="true"></i>刪除
                              </button>
                            </div>
                          </td>
                        </tr>
                      </template>
                      <tr v-else>
                        <td :colspan="innerTableColspan" class="text-center text-muted py-3">
                          <template v-if="hideAddMgmtItem">
                            此{{ secondLevelHeaderLabel }}下暫無明細列。
                          </template>
                          <template v-else>
                            此{{ secondLevelHeaderLabel }}下暫無明細列，請使用右上方「新增管理項目」。
                          </template>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            </div>
          </template>
          <div v-else class="hierarchy-panel-empty hierarchy-panel-empty--muted">
            此施工階段尚無{{ secondLevelHeaderLabel }}資料
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  type InspectionPhaseBlock,
  type InspectionPhaseFlowGroup,
  type InspectionRow,
  withFixedWorkProcessGroups
} from '@/utils/buildInspectionPhasesFromLines'

const LS_PREFIX = 'eip.inspectionStandards.collapse.v1'

const props = withDefaults(
  defineProps<{
    phases: Record<string, InspectionPhaseBlock>
    interactive?: boolean
    /** 是否顯示「依資料庫工程案資料建構」按鈕（營造端分項抽查表不顯示） */
    showAiGenerateButton?: boolean
    /** 工程案資料建構中：避免連點 */
    aiGenerating?: boolean
    emptyText?: string
    /** 不為空時將收合狀態寫入 localStorage */
    persistenceKey?: string
    /** 為 true 時隱藏「新增／刪除施工流程」且不可點擊編輯流程名稱（P 類動態頁：流程由施工方法與步驟帶入） */
    lockFlowStructure?: boolean
    /** 為 false 時隱藏工具列搜尋框且不篩選階層（P 類動態頁） */
    showHierarchySearch?: boolean
    /** 第二層標題文字（預設「施工流程」；P 類可改為「主要工序」） */
    secondLevelHeaderLabel?: string
    /** 為 true 時隱藏「新增管理項目」按鈕（P 類動態頁：明細由 reconcile 產生，不手動新增群組） */
    hideAddMgmtItem?: boolean
    /** 為 true 時隱藏明細列「刪除」按鈕與操作欄（P 類動態頁） */
    hideRemoveRowButton?: boolean
    /** 工程案資料建構按鈕顯示文字（預設「依資料庫工程案資料建構」） */
    aiGenerateButtonLabel?: string
    /** 工程案資料建構按鈕 title 提示 */
    aiGenerateButtonTitle?: string
    /** 使用者介面的檢查用語；監造預設「抽查」，營造可傳「自主檢查」 */
    inspectionLabel?: string
  }>(),
  {
    interactive: false,
    showAiGenerateButton: true,
    aiGenerating: false,
    emptyText: '目前尚無資料',
    persistenceKey: '',
    lockFlowStructure: false,
    showHierarchySearch: true,
    secondLevelHeaderLabel: '施工流程',
    hideAddMgmtItem: false,
    hideRemoveRowButton: false,
    aiGenerateButtonLabel: '依資料庫工程案資料建構',
    aiGenerateButtonTitle: '依資料庫內容由工程案資料建構產出抽查標準並覆寫',
    inspectionLabel: '抽查'
  }
)

const displayPhases = computed(() => withFixedWorkProcessGroups(props.phases ?? {}))

const innerTableColspan = computed(() => {
  if (!props.interactive) return 7
  if (props.hideRemoveRowButton) return 7
  return 8
})

const hasAnyStdContent = computed(() =>
  Object.values(displayPhases.value).some((b) => (b.flows ?? []).some((f) => (f.rows?.length ?? 0) > 0))
)

const showBulkToolbar = computed(() => Object.keys(displayPhases.value).length > 0)

const bulkToolbarAriaLabel = computed(() =>
  props.showHierarchySearch ? '搜尋與階層展開收合' : '階層展開收合'
)

const hierarchySearch = ref('')

const searchQueryActive = computed(
  () => props.showHierarchySearch && hierarchySearch.value.trim().length > 0
)

function subItemMatches(sub: InspectionRow, q: string): boolean {
  const parts = [
    sub.manageProject,
    sub.checkPoint,
    sub.checkStandard,
    sub.checkTiming,
    sub.checkFrequency,
    sub.checkMethod,
    sub.failureHandle
  ].map((x) => (x ?? '').toString().toLowerCase())
  return parts.some((p) => p.includes(q))
}

/** 搜尋篩選後仍保留後端／父層使用的原始 flowIdx、mgmtIdx、subIdx */
type HierarchySubRow = { subIdx: number; sub: InspectionRow }
type HierarchyMgmtRow = {
  mgmtIdx: number
  item: { name: string }
  subs: HierarchySubRow[]
}
type HierarchyFlowRow = {
  flowIdx: number
  flow: InspectionPhaseFlowGroup
  mgmts: HierarchyMgmtRow[]
}
type HierarchyPhaseRow = {
  phaseKey: string
  block: InspectionPhaseBlock
  flows: HierarchyFlowRow[]
}

function groupRowsByManageProject(flow: InspectionPhaseFlowGroup): { name: string; rows: InspectionRow[] }[] {
  const rows = flow.rows ?? []
  const out: { name: string; rows: InspectionRow[] }[] = []
  const idx = new Map<string, number>()
  for (const r of rows) {
    const name = (r.manageProject || '').trim() || '未命名項目'
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

function mapSubsAll(group: { rows: InspectionRow[] }): HierarchySubRow[] {
  return (group.rows ?? []).map((sub, subIdx) => ({ subIdx, sub }))
}

function flattenMgmtRows(fr: HierarchyFlowRow): { mgmtIdx: number; subIdx: number; sub: InspectionRow; manageProject: string }[] {
  const out: { mgmtIdx: number; subIdx: number; sub: InspectionRow; manageProject: string }[] = []
  const groupNameByIdx = new Map<number, string>()
  for (const mr of fr.mgmts) {
    groupNameByIdx.set(mr.mgmtIdx, (mr.item?.name ?? '').toString().trim())
    for (const sr of mr.subs) {
      out.push({
        mgmtIdx: mr.mgmtIdx,
        subIdx: sr.subIdx,
        sub: sr.sub,
        manageProject: (mr.item?.name ?? '').toString().trim()
      })
    }
  }
  return out
}

const hierarchyViewRows = computed((): HierarchyPhaseRow[] => {
  const raw = displayPhases.value
  const q = (props.showHierarchySearch ? hierarchySearch.value : '').trim().toLowerCase()
  const out: HierarchyPhaseRow[] = []

  for (const [phaseKey, block] of Object.entries(raw)) {
    const flowsIn = block.flows ?? []

    if (!q) {
      out.push({
        phaseKey,
        block,
        flows: flowsIn.map((flow, flowIdx) => ({
          flowIdx,
          flow,
          mgmts: groupRowsByManageProject(flow).map((g, mgmtIdx) => ({
            mgmtIdx,
            item: { name: g.name },
            subs: mapSubsAll(g)
          }))
        }))
      })
      continue
    }

    const phaseMatch = phaseKey.toLowerCase().includes(q)

    if (phaseMatch) {
      out.push({
        phaseKey,
        block,
        flows: flowsIn.map((flow, flowIdx) => ({
          flowIdx,
          flow,
          mgmts: groupRowsByManageProject(flow).map((g, mgmtIdx) => ({
            mgmtIdx,
            item: { name: g.name },
            subs: mapSubsAll(g)
          }))
        }))
      })
      continue
    }

    const flowRows: HierarchyFlowRow[] = []

    for (let flowIdx = 0; flowIdx < flowsIn.length; flowIdx++) {
      const flow = flowsIn[flowIdx]
      const flowMatch = (flow.flowLabel ?? '').toLowerCase().includes(q)

      if (flowMatch) {
        flowRows.push({
          flowIdx,
          flow,
          mgmts: groupRowsByManageProject(flow).map((g, mgmtIdx) => ({
            mgmtIdx,
            item: { name: g.name },
            subs: mapSubsAll(g)
          }))
        })
        continue
      }

      const mgmtsIn = groupRowsByManageProject(flow)
      const mgmtRows: HierarchyMgmtRow[] = []

      for (let mgmtIdx = 0; mgmtIdx < mgmtsIn.length; mgmtIdx++) {
        const g = mgmtsIn[mgmtIdx]
        const mgmtMatch = (g.name ?? '').toString().toLowerCase().includes(q)
        const subsIn = g.rows ?? []
        const subRows = mgmtMatch
          ? subsIn.map((sub, subIdx) => ({ subIdx, sub }))
          : subsIn
              .map((sub, subIdx) => ({ subIdx, sub }))
              .filter(({ sub }) => subItemMatches(sub, q))

        if (mgmtMatch || subRows.length > 0) {
          mgmtRows.push({ mgmtIdx, item: { name: g.name }, subs: subRows })
        }
      }

      if (mgmtRows.length > 0) {
        flowRows.push({ flowIdx, flow, mgmts: mgmtRows })
      }
    }

    if (flowRows.length > 0) {
      out.push({ phaseKey, block, flows: flowRows })
    }
  }

  return out
})

const hasFilteredPhases = computed(() => hierarchyViewRows.value.length > 0)

function expandAll() {
  const patches: Record<string, boolean> = {}
  const data = displayPhases.value
  for (const phaseKey of Object.keys(data)) {
    patches[keyPhase(phaseKey)] = true
    const flows = data[phaseKey].flows ?? []
    flows.forEach((flow, flowIdx) => {
      patches[keyFlow(phaseKey, flowIdx)] = true
    })
  }
  openMap.value = { ...openMap.value, ...patches }
}

function collapseAll() {
  const patches: Record<string, boolean> = {}
  const data = displayPhases.value
  for (const phaseKey of Object.keys(data)) {
    patches[keyPhase(phaseKey)] = false
    const flows = data[phaseKey].flows ?? []
    flows.forEach((flow, flowIdx) => {
      patches[keyFlow(phaseKey, flowIdx)] = false
    })
  }
  openMap.value = { ...openMap.value, ...patches }
}

const emit = defineEmits<{
  editField: [phaseKey: string, flowIdx: number, mgmtIdx: number, subIdx: number, fieldName: string]
  addMgmtItem: [phaseKey: string, flowIdx?: number]
  addFlow: [phaseKey: string]
  addSubItem: [phaseKey: string, flowIdx: number, mgmtIdx: number]
  removeMgmt: [phaseKey: string, flowIdx: number, manageProject: string]
  removeFlow: [phaseKey: string, flowIdx: number]
  editFlow: [phaseKey: string, flowIdx: number]
  removeRow: [standardId: number]
  aiGenerateFromDb: []
}>()

const openMap = ref<Record<string, boolean>>({})

function storageFullKey(): string {
  return `${LS_PREFIX}:${props.persistenceKey}`
}

function loadFromStorage(): void {
  if (!props.persistenceKey) {
    openMap.value = {}
    return
  }
  try {
    const raw = localStorage.getItem(storageFullKey())
    openMap.value = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    openMap.value = {}
  }
}

watch(
  () => props.persistenceKey,
  () => loadFromStorage(),
  { immediate: true }
)

watch(
  openMap,
  (m) => {
    if (!props.persistenceKey) return
    try {
      localStorage.setItem(storageFullKey(), JSON.stringify(m))
    } catch {
      /* ignore quota */
    }
  },
  { deep: true }
)

function encPhase(pk: string): string {
  return encodeURIComponent(pk)
}

function keyPhase(phaseKey: string): string {
  return `p:${encPhase(phaseKey)}`
}

function keyFlow(phaseKey: string, flowIdx: number): string {
  return `p:${encPhase(phaseKey)}|f:${flowIdx}`
}


function isOpen(id: string, defaultOpen = true): boolean {
  const v = openMap.value[id]
  return v === undefined ? defaultOpen : v
}

function setOpen(id: string, open: boolean): void {
  openMap.value = { ...openMap.value, [id]: open }
}

function isPhaseOpen(phaseKey: string): boolean {
  return isOpen(keyPhase(phaseKey), true)
}

function isFlowOpen(phaseKey: string, flowIdx: number): boolean {
  return isOpen(keyFlow(phaseKey, flowIdx), true)
}


function togglePhase(phaseKey: string): void {
  const k = keyPhase(phaseKey)
  setOpen(k, !isOpen(k, true))
}

function toggleFlow(phaseKey: string, flowIdx: number): void {
  const k = keyFlow(phaseKey, flowIdx)
  setOpen(k, !isOpen(k, true))
}


function onFlowNameActivate(phaseKey: string, flowIdx: number, e: MouseEvent) {
  e.stopPropagation()
  if (!props.interactive) {
    toggleFlow(phaseKey, flowIdx)
    return
  }
  if (props.lockFlowStructure) {
    toggleFlow(phaseKey, flowIdx)
    return
  }
  emit('editFlow', phaseKey, flowIdx)
}

function onFlowNameKeydown(phaseKey: string, flowIdx: number, e: KeyboardEvent) {
  e.stopPropagation()
  if (!props.interactive) return
  if (props.lockFlowStructure) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleFlow(phaseKey, flowIdx)
    }
    return
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('editFlow', phaseKey, flowIdx)
  }
}

const cellFieldClass = computed(() => (props.interactive ? 'cell-field-interactive hover-highlight' : ''))

function onEditField(
  phaseKey: string,
  flowIdx: number,
  mgmtIdx: number,
  subIdx: number,
  fieldName: string
) {
  emit('editField', phaseKey, flowIdx, mgmtIdx, subIdx, fieldName)
}

</script>

<style scoped>
.inspection-standards-phases-table {
  font-variant-numeric: tabular-nums;
}

.hierarchy-root {
  --h-border: var(--bs-border-color);
  /* 左色條預設：與外框色調和，較細、較不刺眼；若要恢復亮色可在外層設 --h-accent-phase 等覆寫 */
  --h-stripe-phase: color-mix(in srgb, var(--bs-primary) 34%, var(--h-border));
  --h-stripe-flow: color-mix(in srgb, var(--bs-info) 30%, var(--h-border));
  --h-stripe-mgmt: color-mix(in srgb, var(--bs-secondary) 32%, var(--h-border));
  --h-radius-lg: 0.625rem;
  --h-radius-md: 0.5rem;
  --h-radius-sm: 0.375rem;
}

/* 頂部工具列：與外層卡片融為一體，無獨立框線與內距 */
.hierarchy-bulk-toolbar {
  padding: 0;
  margin: 0 0 0.75rem;
  border: none;
  background: transparent;
  box-shadow: none;
  gap: 0.65rem 0.75rem;
}

@media (min-width: 768px) {
  .hierarchy-bulk-toolbar__search {
    max-width: min(28rem, 100%);
  }
}

.hierarchy-search-merge {
  margin: 0;
  padding: 0.2rem 0;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--h-border) 65%, transparent);
  border-radius: 0;
  background: transparent;
  transition: border-color 0.15s ease;
}

.hierarchy-search-merge:focus-within {
  border-bottom-color: var(--bs-primary);
}

.hierarchy-search-merge__icon {
  font-size: 0.9rem;
  color: var(--bs-secondary-color);
  opacity: 0.85;
}

.hierarchy-search-merge .hierarchy-search-input {
  flex: 1 1 auto;
  min-width: 0;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0.15rem 0;
}

.hierarchy-search-merge .hierarchy-search-input:focus {
  border: none !important;
  box-shadow: none !important;
}

.hierarchy-search-input::placeholder {
  color: var(--bs-secondary-color);
  opacity: 0.8;
}

.hierarchy-toolbar-btn {
  min-width: 5.25rem;
  font-weight: 500;
  border-radius: var(--h-radius-sm);
}

.hierarchy-search-empty {
  margin: 0;
  color: var(--bs-secondary-color);
  background: transparent;
  border: none;
}

.hierarchy-phase {
  margin-bottom: 1.35rem;
}

.hierarchy-phase:last-child {
  margin-bottom: 0;
}

.hierarchy-actions--inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
}

/* 外框：標題 + 內容屬於同一區塊 */
.hierarchy-panel {
  border: 1px solid color-mix(in srgb, var(--h-border) 92%, transparent);
  border-radius: var(--h-radius-md);
  overflow: hidden;
  background: var(--bs-body-bg);
}

.hierarchy-panel--phase {
  border-left: 3px solid var(--h-accent-phase, var(--h-stripe-phase));
  box-shadow:
    0 1px 3px color-mix(in srgb, var(--bs-body-color) 7%, transparent),
    0 4px 14px color-mix(in srgb, var(--bs-body-color) 4%, transparent);
}

.hierarchy-panel__body--phase {
  padding: 0.9rem 1rem 1.05rem;
  background: color-mix(in srgb, var(--bs-body-color) 3.5%, var(--bs-body-bg));
  border-top: 1px solid color-mix(in srgb, var(--h-border) 85%, transparent);
}

.hierarchy-flow {
  margin-bottom: 0.85rem;
}

.hierarchy-flow:last-child {
  margin-bottom: 0;
}

.hierarchy-panel--flow {
  border-radius: var(--h-radius-sm);
  border-left: 2px solid var(--h-accent-flow, var(--h-stripe-flow));
  box-shadow: 0 1px 3px color-mix(in srgb, var(--bs-body-color) 6%, transparent);
}

/* 施工流程內容區塊改為無外框/無間距：表格直接貼齊，由表格格線呈現 */
.hierarchy-panel__body--flow .hierarchy-table-responsive--flush {
  margin: 0;
  padding: 0;
  border: 0;
}

.hierarchy-panel__body--flow .inspection-standards-inner-table {
  margin: 0;
  border-radius: 0;
  border: 0;
  border-collapse: collapse !important;
}

.hierarchy-panel__body--flow {
  padding: 0;
  background: color-mix(in srgb, var(--bs-body-color) 2.2%, var(--bs-body-bg));
  border-top: 1px solid color-mix(in srgb, var(--h-border) 88%, transparent);
}

.hierarchy-mgmt {
  margin-bottom: 0.75rem;
}

.hierarchy-mgmt:last-child {
  margin-bottom: 0;
}

.hierarchy-panel--mgmt {
  border-radius: calc(var(--h-radius-sm) - 0.05rem);
  border-left: 2px solid var(--h-accent-mgmt, var(--h-stripe-mgmt));
  box-shadow: 0 1px 2px color-mix(in srgb, var(--bs-body-color) 5%, transparent);
}

.hierarchy-panel__body--mgmt {
  padding: 0;
  background: var(--bs-body-bg);
  border-top: none;
}

/* 管理項目：表格與面板內緣貼齊，由格線與上緣分隔線定義區域 */
.hierarchy-panel__body--mgmt .hierarchy-table-responsive--flush {
  margin: 0;
}

.hierarchy-panel__body--mgmt .inspection-standards-inner-table {
  margin-bottom: 0;
  border-radius: 0;
  /* 外圍交由 .hierarchy-panel--mgmt 框線；表格只保留儲存格格線 */
  border-left: none;
  border-right: none;
  border-bottom: none;
  --bs-table-border-color: var(--h-border);
  border-color: var(--h-border);
  /* 合併相鄰邊框，避免橫／豎線因畫在不同元素上看起來色深不一 */
  border-collapse: collapse !important;
}

/*
 * Bootstrap .table-bordered：橫線在 thead/tbody、直線在 tr；th/td 另有自己的邊，易有色差。
 * 注意：> :not(caption) > * > * 在 BS5 選到的是 th/td，若對它設 border:0 會把格線整個清掉。
 * 只清掉 thead/tbody 與 tr 的邊框，格線僅由儲存格繪製。
 */
.hierarchy-panel__body--mgmt .inspection-standards-inner-table.table-bordered > :not(caption) > * {
  border: 0 !important;
}

.hierarchy-panel__body--mgmt .inspection-standards-inner-table.table-bordered thead > tr,
.hierarchy-panel__body--mgmt .inspection-standards-inner-table.table-bordered tbody > tr {
  border: 0 !important;
}

.hierarchy-panel__body--mgmt .inspection-standards-inner-table :is(th, td) {
  border: 1px solid var(--h-border) !important;
}

.hierarchy-panel-empty {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: var(--h-radius-sm);
  border: 1px dashed color-mix(in srgb, var(--h-border) 80%, transparent);
  background: color-mix(in srgb, var(--bs-body-color) 2.5%, var(--bs-body-bg));
}

.hierarchy-panel-empty--muted {
  color: var(--bs-secondary-color);
}

.hierarchy-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.62rem 0.9rem;
  margin-bottom: 0;
  border: none;
  border-radius: 0;
}

.hierarchy-header--phase {
  background: color-mix(in srgb, var(--bs-primary) 6%, var(--bs-body-bg));
}

.hierarchy-header--phase .hierarchy-label {
  font-weight: 700;
  color: color-mix(in srgb, var(--bs-primary) 38%, var(--bs-body-color));
  opacity: 0.92;
}

.hierarchy-header--flow {
  background: color-mix(in srgb, var(--bs-info) 5.5%, var(--bs-body-bg));
}

.hierarchy-header--flow .hierarchy-label {
  font-weight: 700;
  color: color-mix(in srgb, var(--bs-info) 34%, var(--bs-body-color));
  opacity: 0.92;
}

.hierarchy-header--mgmt {
  background: color-mix(in srgb, var(--bs-secondary) 5%, var(--bs-body-bg));
}

.hierarchy-header--mgmt .hierarchy-label {
  font-weight: 700;
  color: color-mix(in srgb, var(--bs-secondary) 36%, var(--bs-body-color));
  opacity: 0.92;
}

.hierarchy-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  min-width: 0;
}

.hierarchy-title--expand {
  cursor: pointer;
}

.hierarchy-value.is-clickable {
  cursor: pointer;
}

.hierarchy-value.is-clickable:hover {
  color: var(--bs-primary);
  text-decoration: underline;
}

.hierarchy-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.65;
}

.hierarchy-value {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.25;
}

.hierarchy-toggle {
  color: var(--bs-body-color);
  opacity: 0.8;
  flex-shrink: 0;
  width: 1.85rem;
  height: 1.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--h-radius-sm);
  transition:
    background-color 0.12s ease,
    color 0.12s ease,
    opacity 0.12s ease;
}

.hierarchy-toggle:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--bs-body-color) 7%, transparent);
  color: var(--bs-primary);
}

.hierarchy-toggle:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--bs-primary) 28%, transparent);
}

.hierarchy-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem;
}

.hierarchy-actions :deep(.btn) {
  font-weight: 500;
  border-radius: var(--h-radius-sm);
}

.hierarchy-panel__body--mgmt .inspection-standards-inner-table thead th {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: color-mix(in srgb, var(--bs-body-color) 78%, var(--bs-secondary-color));
  background: color-mix(in srgb, var(--bs-body-color) 5%, var(--bs-body-bg));
  vertical-align: middle;
  padding-top: 0.55rem;
  padding-bottom: 0.55rem;
}

.inspection-standards-inner-table.table-hover tbody tr:hover td {
  background-color: rgba(var(--bs-primary-rgb), 0.05);
}

.cell-field-interactive.hover-highlight:hover {
  background-color: rgba(var(--bs-primary-rgb), 0.1) !important;
  text-decoration: underline;
  color: var(--bs-primary) !important;
}
</style>
