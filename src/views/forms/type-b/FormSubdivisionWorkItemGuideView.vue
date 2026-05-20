<template>
  <div class="form-b-inspection-standards-page a4-dark h-100 subdivision-guide-page">
    <template v-if="!isContractor">
      <Card class="mb-3 report-card report-card--full" style="min-height: 500px">
        <CardBody class="report-card__body" data-bs-theme="dark">
          <div class="alert alert-info mb-0" role="alert">
            <i class="fa fa-info-circle me-2"></i>
            此頁僅供營造端編輯分項工程之施工要領。
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
            <li class="breadcrumb-item active" aria-current="page">施工要領</li>
          </ol>
        </nav>
      </div>

      <Card class="mb-3 report-card report-card--full" style="min-height: 500px">
        <CardBody class="report-card__body" data-bs-theme="dark">
          <div v-if="loading" class="d-flex align-items-center justify-content-center gap-2 py-5 text-muted">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span>載入施工要領中...</span>
          </div>
          <div v-else-if="loadError" class="alert alert-danger mb-0">{{ loadError }}</div>
          <template v-else>
            <div v-if="isAiGenerating" class="text-panels__ai-overlay" aria-live="polite">
              <div class="text-panels__ai-overlay-inner">
                <i class="fa fa-spinner fa-spin fa-2x mb-2 text-primary"></i>
                <div class="fw-semibold">工程案資料建構中…</div>
                <div class="small text-muted mt-1">完成後會覆蓋目前內容並自動儲存</div>
              </div>
            </div>

            <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
              <div class="flex-grow-1">
                <h4 class="fw-bold mb-1">{{ currentItem?.name || '' }}</h4>
                <div class="text-muted small mb-0">
                  {{ currentItem?.remark?.trim() ? currentItem?.remark : '無備註' }}
                </div>
                <div class="inspection-standards-shared-hint small mt-2">
                  <i class="fa fa-circle-info me-1" aria-hidden="true"></i>
                  <span class="hint-strong">施工步驟</span>與<span class="hint-strong">施工流程圖</span>為
                  <span class="hint-strong">同一套骨架</span>
                  <span class="hint-sep">•</span>
                  <span class="hint-strong">修改步驟</span>
                  <span class="hint-strong">流程圖會自動同步更新</span>
                </div>
              </div>
            </div>

            <div class="hierarchy-root">
              <div class="hierarchy-bulk-toolbar d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div class="inspection-standards-toolbar-bulk flex-grow-1 min-w-0 d-flex flex-nowrap align-items-center gap-3">
                  <button
                    type="button"
                    class="btn btn-sm inspection-standards-flowchart-btn guide-flowchart-btn flex-shrink-0"
                    title="預覽施工流程圖（依施工步驟自動更新）"
                    :disabled="steps.length === 0"
                    @click="openFlowChartModal"
                  >
                    <i class="fa fa-sitemap me-2" aria-hidden="true"></i>
                    施工流程圖
                  </button>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <button
                    v-if="isSuperAdmin"
                    type="button"
                    class="btn-ai-generate btn-ai-generate--toolbar"
                    :disabled="isAiGenerating"
                    @click="generateByAi"
                  >
                    <i class="fa me-2" :class="isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                    依標單工程案資料建構
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-primary" @click="addStep">
                    <i class="fa fa-plus me-1"></i>新增步驟
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-success" :disabled="saving" @click="saveNow">
                    <i v-if="saving" class="fa fa-spinner fa-spin me-1"></i>
                    <i v-else class="fa fa-floppy-disk me-1"></i>儲存
                  </button>
                </div>
              </div>

              <div class="table-responsive guide-steps-wrap">
                <table class="table table-bordered table-hover align-middle mb-0 guide-steps-table">
                  <thead>
                    <tr>
                      <th style="width: 70px">項次</th>
                      <th style="width: 220px">類型</th>
                      <th style="width: 220px">標題</th>
                      <th style="min-width: 220px">使用材料</th>
                      <th style="min-width: 220px">機具設備</th>
                      <th style="min-width: 220px">注意事項</th>
                      <th style="width: 170px" class="text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!steps.length">
                      <td colspan="7" class="text-center text-muted py-4">尚無步驟，請新增或使用工程案資料建構。</td>
                    </tr>
                    <tr v-for="(s, idx) in steps" :key="idx" :class="{ 'guide-step--checkpoint': s.stepType === 'CHECKPOINT' }">
                      <td class="text-center fw-semibold">{{ idx + 1 }}</td>
                      <td>
                        <div class="d-flex flex-column gap-2">
                          <select v-model="s.stepType" class="form-select form-select-sm" @change="onStepTypeChange(s)">
                            <option value="PROCESS">施工步驟</option>
                            <option value="CHECKPOINT">檢查點（菱形）</option>
                          </select>
                          <select
                            v-if="s.stepType === 'CHECKPOINT'"
                            v-model="s.checkpointMark"
                            class="form-select form-select-sm"
                            @change="scheduleAutoSave"
                          >
                            <option value="＊">＊（廠商自主檢查點）</option>
                            <option value="◎">◎（檢驗停留點/監造查驗點）</option>
                            <option value="＊◎">＊◎（兩者）</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <textarea
                          v-model="s.title"
                          class="form-control form-control-sm guide-steps-title"
                          rows="2"
                          placeholder="步驟標題"
                          @input="scheduleAutoSave"
                        />
                      </td>
                      <td>
                        <textarea
                          v-if="s.stepType !== 'CHECKPOINT'"
                          v-model="s.materialsText"
                          class="form-control form-control-sm guide-steps-textarea"
                          rows="3"
                          placeholder="一行一項；需要時才填"
                          @input="scheduleAutoSave"
                        />
                        <div v-else class="text-muted small py-2 guide-steps-disabled-hint">檢查點不需填寫</div>
                      </td>
                      <td>
                        <textarea
                          v-if="s.stepType !== 'CHECKPOINT'"
                          v-model="s.equipmentText"
                          class="form-control form-control-sm guide-steps-textarea"
                          rows="3"
                          placeholder="一行一項；需要時才填"
                          @input="scheduleAutoSave"
                        />
                        <div v-else class="text-muted small py-2 guide-steps-disabled-hint">檢查點不需填寫</div>
                      </td>
                      <td>
                        <textarea
                          v-if="s.stepType !== 'CHECKPOINT'"
                          v-model="s.notesText"
                          class="form-control form-control-sm guide-steps-textarea"
                          rows="3"
                          placeholder="一行一項；需要時才填"
                          @input="scheduleAutoSave"
                        />
                        <div v-else class="text-muted small py-2 guide-steps-disabled-hint">檢查點不需填寫</div>
                      </td>
                      <td class="text-center">
                        <div class="btn-group btn-group-sm">
                          <button type="button" class="btn btn-outline-secondary" :disabled="idx === 0" @click="moveStep(idx, -1)">上移</button>
                          <button type="button" class="btn btn-outline-secondary" :disabled="idx === steps.length - 1" @click="moveStep(idx, +1)">下移</button>
                          <button type="button" class="btn btn-outline-danger" @click="removeStep(idx)">刪除</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </template>
        </CardBody>
      </Card>
    </template>
  </div>

  <Modal
    :show="showFlowChartModal"
    title="施工流程圖"
    icon="fa fa-sitemap"
    size="lg"
    modal-class="guide-flow-modal"
    :hide-footer="true"
    :hide-confirm-button="true"
    :elevate-z-index="true"
    @update:show="showFlowChartModal = $event"
  >
    <template #body>
      <p class="text-muted small mb-3 mb-md-2">
        依目前施工要領的<span class="fw-semibold">施工步驟</span>自動生成；如需調整流程，請修改步驟順序/名稱/檢查點符號。
      </p>
      <div v-if="!flowGraphJson" class="text-center py-5 text-muted">
        尚無流程圖資料（請先新增步驟或使用工程案資料建構）。
      </div>
      <div v-else class="text-center bg-white rounded p-2 inspection-standards-flowchart-img-wrap">
        <FlowGraphSyncfusionView :flow-json="flowGraphJson" :height="flowChartHeightPx" />
      </div>
    </template>
  </Modal>

  <!-- 隱藏匯出用：保持與前端預覽一致的 Syncfusion 渲染，供 exportPngBlob 上傳 -->
  <div class="guide-flow-export-host" aria-hidden="true">
    <FlowGraphSyncfusionView ref="flowExportRef" :flow-json="flowGraphJson" :height="'520px'" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { debounce } from 'lodash'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import FlowGraphSyncfusionView from '@/components/diagram/FlowGraphSyncfusionView.vue'
import {
  aiGenerateSubdivisionWorkItemGuide,
  getSubdivisionWorkItemGuide,
  listSubdivisionWorkItems,
  upsertSubdivisionWorkItemGuide,
  uploadSubdivisionWorkItemGuideFlowImage,
  type SubdivisionWorkItem,
  type SubdivisionWorkItemGuideStep
} from '@/api/subdivisionWorkItems'

const route = useRoute()
const router = useRouter()
const itemId = computed(() => Number(route.params.itemId))

const workspaceStore = useWorkspaceStore()
const { isContractor, isSuperAdmin } = useViewPerspective()
const currentProject = computed(() => workspaceStore.currentProject)

const designChangeId = computed((): number | null => {
  const raw = route.query.designChangeId
  if (raw === undefined || raw === null || raw === '') return null
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = Number(s)
  return Number.isFinite(n) ? n : null
})

const currentItem = ref<SubdivisionWorkItem | null>(null)
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const isAiGenerating = ref(false)

type StepDraft = SubdivisionWorkItemGuideStep & {
  materialsText: string
  equipmentText: string
  notesText: string
}

const steps = ref<StepDraft[]>([])
const flowGraphJson = ref<string>('')
const showFlowChartModal = ref(false)
// 表格呈現：不需要收合/展開狀態

const flowExportRef = ref<InstanceType<typeof FlowGraphSyncfusionView> | null>(null)
const lastUploadedFlowJson = ref<string>('')
const flowGraphImageObjectName = ref<string>('')

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function tryExportFlowPngBlobWithRetry(): Promise<Blob | null> {
  const ok = await flowExportRef.value?.waitUntilReady?.(4000)
  if (!ok) return null
  const blob = await flowExportRef.value?.exportPngBlob?.()
  return blob && blob.size > 0 ? blob : null
}

const flowChartHeightPx = ref('520px')

function recomputeFlowChartHeight() {
  // Syncfusion Diagram 的 height 不吃 vh，這裡用視窗高度換算 px
  const h = window.innerHeight || 900
  // 施工流程圖預覽：希望「偏高」而不是只變寬
  const px = Math.round(h * 0.72)
  const clamped = Math.max(420, Math.min(820, px))
  flowChartHeightPx.value = `${clamped}px`
}

function parseLines(s: string): string[] {
  return (s || '')
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
}

function toLines(list?: string[] | null): string {
  return (list || []).map((x) => String(x || '').trim()).filter(Boolean).join('\n')
}

function toPayloadSteps(): SubdivisionWorkItemGuideStep[] {
  return steps.value.map((s, idx) => ({
    sortOrder: idx + 1,
    stepType: (s.stepType || 'PROCESS') as any,
    checkpointMark: s.stepType === 'CHECKPOINT' ? (s.checkpointMark || '＊') : null,
    title: (s.title || '').trim(),
    materials: s.stepType === 'CHECKPOINT' ? [] : parseLines(s.materialsText),
    equipment: s.stepType === 'CHECKPOINT' ? [] : parseLines(s.equipmentText),
    notes: s.stepType === 'CHECKPOINT' ? [] : parseLines(s.notesText)
  }))
}

async function loadAll() {
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value || !Number.isFinite(itemId.value)) return

  loading.value = true
  loadError.value = ''
  try {
    const list = await listSubdivisionWorkItems(cid, designChangeId.value)
    currentItem.value = list.find((x) => x.id === itemId.value) || null

    const guide = await getSubdivisionWorkItemGuide(itemId.value, {
      constructionId: cid,
      designChangeId: designChangeId.value
    })
    flowGraphJson.value = guide.flowGraphJson ?? ''
    flowGraphImageObjectName.value = String(guide.flowGraphImageObjectName || '')
    steps.value =
      (guide.steps || [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((s) => ({
          sortOrder: s.sortOrder,
          stepType: (s.stepType || 'PROCESS') as any,
          checkpointMark: (s.checkpointMark || null) as any,
          title: s.title || '',
          materials: s.materials || [],
          equipment: s.equipment || [],
          notes: s.notes || [],
          materialsText: toLines(s.materials),
          equipmentText: toLines(s.equipment),
          notesText: toLines(s.notes)
        }))
  } catch (e: any) {
    loadError.value = e?.message || '載入失敗'
  } finally {
    loading.value = false
  }
}

async function ensureFlowImageUploaded() {
  const cid = currentProject.value?.id
  if (!cid || !Number.isFinite(itemId.value)) return
  const curFlow = String(flowGraphJson.value || '')
  if (!curFlow.trim()) return
  if (flowGraphImageObjectName.value.trim()) return

  await nextTick()
  const blob = await tryExportFlowPngBlobWithRetry()
  if (!blob) return

  const file = new File([blob], `subdivision-guide-flow-${itemId.value}.png`, { type: 'image/png' })
  const res = await uploadSubdivisionWorkItemGuideFlowImage(itemId.value, {
    constructionId: cid,
    designChangeId: designChangeId.value,
    file
  })
  flowGraphImageObjectName.value = res?.objectName || ''
  lastUploadedFlowJson.value = curFlow
}

async function saveNow() {
  const cid = currentProject.value?.id
  if (!cid || !Number.isFinite(itemId.value)) return
  saving.value = true
  try {
    await upsertSubdivisionWorkItemGuide(itemId.value, {
      constructionId: cid,
      designChangeId: designChangeId.value,
      flowGraphJson: flowGraphJson.value,
      steps: toPayloadSteps()
    })

    // 以「前端 Syncfusion 匯出」為準，上傳 PNG 供匯出使用（避免留白/樣式不一致）
    const curFlow = String(flowGraphJson.value || '')
    if (curFlow.trim() && (curFlow !== lastUploadedFlowJson.value || !flowGraphImageObjectName.value.trim())) {
      // 等待隱藏 diagram 完成 layout 後再匯出
      await nextTick()
      const blob = await tryExportFlowPngBlobWithRetry()
      if (blob) {
        const file = new File([blob], `subdivision-guide-flow-${itemId.value}.png`, { type: 'image/png' })
        const res = await uploadSubdivisionWorkItemGuideFlowImage(itemId.value, {
          constructionId: cid,
          designChangeId: designChangeId.value,
          file
        })
        flowGraphImageObjectName.value = res?.objectName || flowGraphImageObjectName.value
        lastUploadedFlowJson.value = curFlow
      }
    }
  } catch (e: any) {
    window.alert(e?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

const debouncedAutoSave = debounce(saveNow, 900)
function scheduleAutoSave() {
  // 流程圖依步驟自動生成（比照監造抽查標準表：流程圖是輸出/預覽，不是獨立編輯來源）
  syncFlowGraphFromSteps()
  debouncedAutoSave()
}

function addStep() {
  const next: StepDraft = {
    sortOrder: steps.value.length + 1,
    stepType: 'PROCESS',
    checkpointMark: null,
    title: '',
    materials: [],
    equipment: [],
    notes: [],
    materialsText: '',
    equipmentText: '',
    notesText: ''
  }
  steps.value.push(next)
  scheduleAutoSave()
}

function onStepTypeChange(s: StepDraft) {
  if (s.stepType === 'CHECKPOINT') {
    if (!s.checkpointMark) s.checkpointMark = '＊'
    s.materialsText = ''
    s.equipmentText = ''
    s.notesText = ''
  } else {
    s.checkpointMark = null
  }
  scheduleAutoSave()
}

function removeStep(idx: number) {
  steps.value.splice(idx, 1)
  scheduleAutoSave()
}

function moveStep(idx: number, delta: -1 | 1) {
  const j = idx + delta
  if (j < 0 || j >= steps.value.length) return
  const arr = steps.value
  const tmp = arr[idx]
  arr[idx] = arr[j]
  arr[j] = tmp
  scheduleAutoSave()
}

function openFlowChartModal() {
  syncFlowGraphFromSteps()
  showFlowChartModal.value = true
}

function syncFlowGraphFromSteps() {
  const next = buildFlowGraphJsonFromSteps()
  if (next && next !== flowGraphJson.value) {
    flowGraphJson.value = next
  }
}

function buildFlowGraphJsonFromSteps(): string {
  const nodes = steps.value
    .filter((s) => (s.title || '').trim())
    .map((s, idx) => {
      const title = (s.title || '').trim()
      const isCheckpoint = s.stepType === 'CHECKPOINT'
      const mark = isCheckpoint ? String(s.checkpointMark || '＊').trim() : ''
      return {
        id: `n${idx + 1}`,
        label: isCheckpoint ? `${mark} ${title}`.trim() : title,
        kind: isCheckpoint ? 'decision' : 'process'
      }
    })
  if (nodes.length === 0) return ''
  nodes.unshift({ id: 'n0', label: '施工前', kind: 'start' })
  nodes.push({ id: `n${nodes.length}`, label: '結束', kind: 'end' })
  const edges = []
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i].id, to: nodes[i + 1].id, label: '' })
  }
  return JSON.stringify({ type: 'graph', nodes, edges })
}

function buildFlowFromSteps() {
  // 保留舊入口（避免既有按鈕/呼叫點），改為同步生成 + 開啟預覽
  syncFlowGraphFromSteps()
  showFlowChartModal.value = true
  debouncedAutoSave()
}

async function generateByAi() {
  const cid = currentProject.value?.id
  if (!cid || !Number.isFinite(itemId.value)) return
  isAiGenerating.value = true
  try {
    const guide = await aiGenerateSubdivisionWorkItemGuide(itemId.value, {
      constructionId: cid,
      designChangeId: designChangeId.value
    })
    flowGraphJson.value = guide.flowGraphJson ?? ''
    steps.value =
      (guide.steps || [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((s) => ({
          sortOrder: s.sortOrder,
          title: s.title || '',
          materials: s.materials || [],
          equipment: s.equipment || [],
          notes: s.notes || [],
          materialsText: toLines(s.materials),
          equipmentText: toLines(s.equipment),
          notesText: toLines(s.notes)
        }))
    scheduleAutoSave()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    isAiGenerating.value = false
  }
}

function goBack() {
  router.push({
    path: '/forms/subdivision-work-items',
    query: designChangeId.value != null ? { designChangeId: String(designChangeId.value) } : {}
  })
}

onMounted(() => {
  recomputeFlowChartHeight()
  window.addEventListener('resize', recomputeFlowChartHeight)
  void loadAll().then(() => {
    // 若既有資料沒有上傳過流程圖 PNG，進頁面後自動補上，避免匯出仍落回後端 renderer
    void ensureFlowImageUploaded()
  })
})
onUnmounted(() => {
  debouncedAutoSave.cancel()
  window.removeEventListener('resize', recomputeFlowChartHeight)
})
</script>

<style scoped>
.subdivision-guide-page {
  /* 與抽查標準表頁一致 */
  padding: 1rem;
}

/* 與監造抽查標準表頁一致：暗色主題變數 */
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

/* 與抽查標準表頁一致：頁面外框 */
.form-b-inspection-standards-page {
  padding: 1rem;
  color: var(--a4-text);
}

/* 與抽查標準表頁一致：報表卡片外觀 */
::deep(.card.report-card) {
  position: relative;
  /* 固定底色避免看起來「透明」 */
  background-color: var(--a4-card) !important;
  background-image: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85)) !important;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

::deep(.card.report-card::before) {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(700px 220px at 20% 0%, rgba(var(--bs-primary-rgb), 0.12), transparent 55%);
  opacity: 0.9;
  pointer-events: none;
}

::deep(.card.report-card .card-body.report-card__body) {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent;
  color: var(--a4-text);
}

::deep(.breadcrumb-item),
::deep(.breadcrumb-item + .breadcrumb-item::before) {
  color: var(--a4-muted);
}

::deep(.breadcrumb-item.active) {
  color: var(--a4-text);
}

::deep(.btn-outline-secondary) {
  --bs-btn-color: var(--a4-muted);
  --bs-btn-border-color: var(--a4-border);
  --bs-btn-hover-bg: rgba(255, 255, 255, 0.08);
  --bs-btn-hover-border-color: var(--a4-border);
  --bs-btn-hover-color: var(--a4-text);
}

::deep(.alert-info) {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.25);
  color: #93c5fd;
}

/* ===== 參照抽查標準表頁：hierarchy 面板風格（在該元件內是 scoped；此處複製必要樣式以達到一致性） ===== */
.hierarchy-root {
  font-variant-numeric: tabular-nums;
  --h-border: var(--bs-border-color);
  --h-stripe-phase: color-mix(in srgb, var(--bs-primary) 34%, var(--h-border));
  --h-stripe-flow: color-mix(in srgb, var(--bs-info) 30%, var(--h-border));
  --h-radius-lg: 0.625rem;
  --h-radius-md: 0.5rem;
}

.inspection-standards-shared-hint .hint-strong {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}
.inspection-standards-shared-hint .hint-sep {
  margin: 0 0.4rem;
  opacity: 0.6;
}

.hierarchy-bulk-toolbar {
  padding: 0;
  margin: 0 0 0.75rem;
  border: none;
  background: transparent;
  box-shadow: none;
}

.hierarchy-panel {
  border: 1px solid color-mix(in srgb, var(--h-border) 80%, transparent);
  border-radius: var(--h-radius-lg);
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}
.hierarchy-panel--phase {
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
}
.hierarchy-panel--flow {
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
}

.hierarchy-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid color-mix(in srgb, var(--h-border) 70%, transparent);
}
.hierarchy-header--phase {
  border-left: 0.35rem solid var(--h-stripe-phase);
}
.hierarchy-header--flow {
  border-left: 0.35rem solid var(--h-stripe-flow);
}

.hierarchy-toggle {
  color: rgba(255, 255, 255, 0.82);
}
.hierarchy-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}
.hierarchy-label {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
}
.hierarchy-value {
  color: rgba(255, 255, 255, 0.75);
  min-width: 0;
}

.hierarchy-actions--inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hierarchy-panel__body {
  padding: 0.85rem;
}
.hierarchy-panel__body--phase {
  background: rgba(0, 0, 0, 0.06);
}
.hierarchy-panel__body--flow {
  background: rgba(0, 0, 0, 0.04);
}

/* 施工要領：流程圖預覽區不要預設過高 */
.inspection-standards-flowchart-img-wrap {
  height: 100%;
  max-height: none;
  overflow: auto;
}

/* 施工要領：流程圖 modal 以「高度」為主 */
:deep(.guide-flow-modal .modal-dialog) {
  max-width: 960px;
}
:deep(.guide-flow-modal .modal-content) {
  max-height: 90vh;
}
:deep(.guide-flow-modal .modal-body) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 施工要領：表格編輯呈現 */
.guide-steps-table {
  color: var(--a4-text);
  --bs-table-color: var(--a4-text);
  --bs-table-bg: rgba(255, 255, 255, 0.02);
  --bs-table-border-color: color-mix(in srgb, var(--a4-border) 55%, transparent);
  --bs-table-hover-bg: rgba(255, 255, 255, 0.06);
  --bs-table-hover-color: var(--a4-text);
  table-layout: fixed;
}

.guide-steps-wrap {
  max-height: calc(100vh - 330px);
  overflow: auto;
  border-radius: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--a4-border) 35%, transparent);
}

.guide-steps-table thead th {
  /* sticky 時避免透明透出 */
  background: color-mix(in srgb, var(--a4-card) 78%, rgba(0, 0, 0, 0.55));
  backdrop-filter: blur(6px);
  color: var(--a4-muted);
  border-color: color-mix(in srgb, var(--a4-border) 75%, transparent);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 6;
}

.guide-steps-table thead tr {
  position: sticky;
  top: 0;
  z-index: 6;
}

.guide-steps-table thead th::after {
  /* 底部陰影線，滾動時更清楚 */
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: color-mix(in srgb, var(--a4-border) 70%, transparent);
  pointer-events: none;
}

.guide-steps-table tbody tr:hover > * {
  background-color: var(--bs-table-hover-bg);
}

.guide-steps-table tbody tr.guide-step--checkpoint > * {
  background: rgba(96, 165, 250, 0.06);
}

.guide-steps-table td {
  border-color: color-mix(in srgb, var(--a4-border) 55%, transparent);
  vertical-align: top;
}

.guide-steps-textarea {
  resize: none;
  height: 104px;
  min-height: 104px;
  max-height: 104px;
  overflow: auto;
  line-height: 1.35;
}

.guide-steps-title {
  resize: none;
  height: 104px;
  min-height: 104px;
  max-height: 104px;
  overflow: auto;
  line-height: 1.35;
}

.guide-steps-disabled-hint {
  min-height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed color-mix(in srgb, var(--a4-border) 55%, transparent);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.02);
}

/* 施工流程圖按鈕：更清楚的主操作樣式（暗黑友善） */
.guide-flowchart-btn {
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--a4-accent) 55%, var(--a4-border));
  color: rgba(255, 255, 255, 0.92);
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.18), rgba(34, 211, 238, 0.10));
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.20);
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.guide-flowchart-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.26), rgba(34, 211, 238, 0.16));
}
.guide-flowchart-btn:active:not(:disabled) {
  transform: translateY(0);
}
.guide-flowchart-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.guide-steps-table :deep(.form-control),
.guide-steps-table :deep(.form-select) {
  background: var(--a4-input-bg);
  border-color: var(--a4-input-border);
  color: var(--a4-text);
}

.guide-steps-table :deep(.form-select) {
  /* 下拉箭頭改白色（Bootstrap 以 background-image 呈現） */
  --bs-form-select-bg-img: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='rgba(228,230,235,0.95)' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-image: var(--bs-form-select-bg-img);
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
}

/* option 清單文字顏色（各瀏覽器行為不一，盡量拉齊暗黑） */
.guide-steps-table :deep(select.form-select),
.guide-steps-table :deep(select.form-select option) {
  color: var(--a4-text);
}

.guide-steps-table :deep(.form-control:focus),
.guide-steps-table :deep(.form-select:focus) {
  border-color: color-mix(in srgb, var(--a4-accent) 70%, var(--a4-input-border));
  box-shadow: 0 0 0 0.2rem rgba(96, 165, 250, 0.18);
}

.guide-steps-table :deep(.form-control:disabled),
.guide-steps-table :deep(.form-select:disabled) {
  background: color-mix(in srgb, var(--a4-input-bg) 60%, rgba(0, 0, 0, 0.55));
  color: color-mix(in srgb, var(--a4-muted) 75%, transparent);
  border-color: color-mix(in srgb, var(--a4-input-border) 65%, transparent);
  opacity: 1;
  cursor: not-allowed;
}

.guide-steps-table :deep(.form-control::placeholder) {
  color: color-mix(in srgb, var(--a4-muted) 70%, transparent);
}

.text-panels__ai-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(1px);
  border-radius: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.text-panels__ai-overlay-inner {
  text-align: center;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.80);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

/* 最終覆寫：用 Vue 官方支援的 :deep() 與更高選擇器，確保卡片不透明 */
.form-b-inspection-standards-page :deep(.card.report-card) {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85)) !important;
  background-color: var(--a4-card) !important;
  --bs-card-bg: var(--a4-card);
}

.form-b-inspection-standards-page :deep(.card.report-card .card-body.report-card__body) {
  background: transparent !important;
}

/* 修正：先前誤用 `:::deep`（無效選擇器）導致卡片外觀沒套用。
   這裡補上正確的 `::deep` 規則，確保與監造抽查標準表一致。 */
::deep(.card.report-card) {
  position: relative;
  background-color: var(--a4-card) !important;
  background-image: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85)) !important;
  /* 用 shorthand 防止被 background: transparent 蓋掉 */
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85)) !important;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

::deep(.card.report-card::before) {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(700px 220px at 20% 0%, rgba(var(--bs-primary-rgb), 0.12), transparent 55%);
  opacity: 0.9;
  pointer-events: none;
}

::deep(.card.report-card .card-body.report-card__body) {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent;
  color: var(--a4-text);
}

/* 隱藏匯出用流程圖：放到畫面外，但保留尺寸以便 Syncfusion 正常算 layout */
.guide-flow-export-host {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 1200px;
  height: 520px;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
}
</style>

