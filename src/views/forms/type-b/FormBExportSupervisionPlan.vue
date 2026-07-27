<template>
  <div class="form-b-export-supervision-plan-page">
    <PageHeader
      title="B-1 監造計劃書"
      icon="fa fa-file-export"
      :breadcrumbs="[
        { text: '表單匯出', href: 'javascript:;' },
        { text: 'B類表單', href: 'javascript:;' },
        { text: 'B-1 監造計劃書', active: true }
      ]"
    />

    <PlanSubmissionPModal
      v-model:show="showSubmissionModal"
      plan-type="B1"
      plan-label="B-1 監造計劃書"
    />

    <!-- 工程規模概述（依版本維護，B-1 匯出時帶入） -->
    <Card v-if="hasCurrentProject" class="mb-3 report-card report-card--full">
      <CardHeader class="report-card__header">
        <div class="d-flex flex-wrap align-items-center justify-content-between w-100 gap-2">
          <div class="d-flex align-items-center gap-2">
            <i class="fa fa-ruler-combined report-card__icon text-primary"></i>
            <span class="report-card__title">工程規模概述</span>
          </div>
          <div class="b1-card-actions">
            <DesignChangeVersionSwitcher
              :model-value="selectedDesignChangeId"
              :construction-id="currentProject?.id"
              source-type="SUPERVISORY"
              @update:model-value="onVersionChange"
            />
            <button
              v-if="showPlanSubmissionBlock"
              type="button"
              class="win-btn"
              @click="showSubmissionModal = true"
            >
              <i class="fa fa-clipboard-list"></i>送審紀錄
            </button>
            <button
              type="button"
              class="btn b1-export-btn"
              :disabled="isExporting || !currentProject?.id"
              title="匯出監造計劃書（Word）"
              @click="exportB1Plan"
            >
              <i class="fa" :class="isExporting ? 'fa-spinner fa-spin' : 'fa-file-word'"></i>
              <span>{{ isExporting ? '匯出中…' : '匯出 Word' }}</span>
            </button>
          </div>
        </div>
      </CardHeader>
      <CardBody class="report-card__body">
        <div v-if="loadingOverview" class="text-center py-3 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入中…
        </div>
        <template v-else>
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <label class="form-label small text-muted mb-0">此內容會帶入 B-1 監造計劃書匯出，可依版本分別維護。</label>
            <button
              type="button"
              class="btn-ai-generate"
              :disabled="aiOverviewLoading || !currentProject?.id"
              @click="generateOverviewByAi"
              title="依目前版本標單由工程案資料建構產出工程規模概述（用於 B-1 監造計劃書）"
            >
              <i class="fa me-2" :class="aiOverviewLoading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
              {{ aiOverviewLoading ? '生成中…' : '資料建構' }}
            </button>
          </div>
          <textarea
            v-model="overviewText"
            class="form-control b1-overview-textarea"
            rows="4"
            placeholder="請輸入工程規模概述…"
            :disabled="savingOverview"
            @blur="saveOverview"
          />
          <div v-if="savingOverview" class="small text-muted">
            <i class="fa fa-spinner fa-spin me-1"></i>儲存中…
          </div>
        </template>
      </CardBody>
    </Card>

    <LoadingOverlay :show="aiOverviewLoading" text="工程案資料建構中…" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'
import PlanSubmissionPModal from '@/components/forms/PlanSubmissionPModal.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useExportLoading } from '@/composables/useExportLoading'
import { getConstructionDetail, updateConstruction, getConstructionScaleOverviewAiGenerate } from '@/api/construction'
import {
  formBApi,
  downloadBlobAsFile,
  type ExportConstructionReportRequest
} from '@/api/forms'
import { extractFileNameFromResponse } from '@/utils/blobDownload'

const workspaceStore = useWorkspaceStore()
const { fetchViewType } = useViewPerspective()
const { runWithExportLoading } = useExportLoading()

/** 送審紀錄區塊僅監造；依後端視角解析，避免與 composable 同步狀態不一致 */
const showPlanSubmissionBlock = ref(false)

async function refreshPlanSubmissionVisibility() {
  const wid = workspaceStore.currentWorkspace?.id
  if (!wid) {
    showPlanSubmissionBlock.value = false
    return
  }
  try {
    const vt = await fetchViewType(wid)
    showPlanSubmissionBlock.value = vt === ViewType.SUPERVISORY
  } catch {
    showPlanSubmissionBlock.value = false
  }
}

const hasCurrentProject = computed(() => !!workspaceStore.currentProject?.id)
const currentProject = computed(() => workspaceStore.currentProject)

/** 送審紀錄 Modal（新版：文號帶出＋審查結果公文多份＋附件） */
const showSubmissionModal = ref(false)

const selectedDesignChangeId = ref<number | null>(null)
const overviewText = ref('')
const loadingOverview = ref(false)
const savingOverview = ref(false)
const aiOverviewLoading = ref(false)
const isExporting = ref(false)

async function loadOverview() {
  const cid = currentProject.value?.id
  const wid = currentProject.value?.workspaceId
  if (!cid || !wid) {
    overviewText.value = ''
    lastLoadedOverview.value = ''
    return
  }
  loadingOverview.value = true
  try {
    const data = await getConstructionDetail(cid, wid, 'SUPERVISORY', selectedDesignChangeId.value)
    overviewText.value = data.constructionScaleOverview ?? ''
    lastLoadedOverview.value = overviewText.value
  } catch {
    overviewText.value = ''
    lastLoadedOverview.value = ''
  } finally {
    loadingOverview.value = false
  }
}

function onVersionChange(value: number | null) {
  selectedDesignChangeId.value = value
}

async function saveOverview() {
  const cid = currentProject.value?.id
  if (!cid || overviewText.value === lastLoadedOverview.value) return
  savingOverview.value = true
  try {
    await updateConstruction(cid, { constructionScaleOverview: overviewText.value } as any, selectedDesignChangeId.value)
    lastLoadedOverview.value = overviewText.value
  } catch {
    // 可選：toast 錯誤
  } finally {
    savingOverview.value = false
  }
}

async function generateOverviewByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  aiOverviewLoading.value = true
  try {
    const res = await getConstructionScaleOverviewAiGenerate(cid, selectedDesignChangeId.value)
    overviewText.value = res?.text?.trim() ?? ''
    if (!overviewText.value) {
      // 標單無資料時後端回傳空字串
      if (typeof (window as any).alert === 'function') (window as any).alert('目前版本無標單資料，或 工程案資料建構未產出內容。請先匯入標單或手動填寫。')
    } else {
      // 生成成功後自動儲存至目前版本
      await saveOverview()
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試或手動填寫。'
    if (typeof (window as any).alert === 'function') (window as any).alert(msg)
  } finally {
    aiOverviewLoading.value = false
  }
}

async function exportB1Plan() {
  const cid = currentProject.value?.id
  if (!cid) {
    window.alert('請先選擇工程案')
    return
  }

  isExporting.value = true
  try {
    const taskId = `b1-export-${cid}-${Date.now()}`
    const response = await runWithExportLoading(taskId, 'B-1 監造計劃書', async (signal) => {
      await saveOverview()
      const reportData: ExportConstructionReportRequest['valueMap']['reportData'] = {
        constructionId: cid,
        designChangeId: selectedDesignChangeId.value
      }
      const request: ExportConstructionReportRequest = {
        itemNumber: 0,
        valueMap: { reportData }
      }
      return formBApi.exportSupervisoryPlan(request, { signal })
    })
    const fileName =
      extractFileNameFromResponse(response) ||
      `監造計劃書_B-1_${Date.now()}.docx`
    downloadBlobAsFile(response.data, fileName)
  } catch (e: any) {
    if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') return
    window.alert(e?.response?.data?.message ?? e?.message ?? '匯出失敗')
  } finally {
    isExporting.value = false
  }
}

const lastLoadedOverview = ref('')

watch(
  [hasCurrentProject, selectedDesignChangeId],
  () => {
    if (hasCurrentProject.value) loadOverview()
    else {
      overviewText.value = ''
      lastLoadedOverview.value = ''
    }
  },
  { immediate: true }
)

watch(
  () => workspaceStore.currentWorkspace?.id,
  () => {
    void refreshPlanSubmissionVisibility()
  },
  { immediate: true }
)
</script>

<style scoped>
.form-b-export-supervision-plan-page {
  padding: 1rem;
}

.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

/* 暗黑模式卡片背景 */
:deep(.card) {
  background-color: var(--bs-component-bg);
  border-color: rgba(255, 255, 255, 0.08);
}
:deep(.card .card-body) {
  background-color: var(--bs-component-bg);
}
:deep(.card .card-header) {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

/* 內層卡片（填寫狀況區） */
:deep(.card .card.border-0.shadow-sm) {
  background-color: rgba(255, 255, 255, 0.03);
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* 依賴設定頁面的子卡片 */
:deep(.row .card.h-100) {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* alert 區塊暗黑適配 */
:deep(.alert-info) {
  background-color: rgba(13, 202, 240, 0.1);
  border-color: rgba(13, 202, 240, 0.2);
  color: #6edff6;
}
:deep(.alert-warning) {
  background-color: rgba(255, 193, 7, 0.1);
  border-color: rgba(255, 193, 7, 0.2);
  color: #ffda6a;
}
:deep(.alert-secondary) {
  background-color: rgba(108, 117, 125, 0.1);
  border-color: rgba(108, 117, 125, 0.2);
  color: #a7acb1;
}
:deep(.alert-success) {
  background-color: rgba(25, 135, 84, 0.1);
  border-color: rgba(25, 135, 84, 0.2);
  color: #75b798;
}
:deep(.alert-danger) {
  background-color: rgba(220, 53, 69, 0.1);
  border-color: rgba(220, 53, 69, 0.2);
  color: #ea868f;
}

/* 匯出操作卡片 */
:deep(.card.border-primary) {
  border-color: rgba(13, 110, 253, 0.4) !important;
}
:deep(.card.border-primary .card-header.bg-primary) {
  background-color: rgba(13, 110, 253, 0.7) !important;
}

/* progress bar 暗黑背景 */
:deep(.progress) {
  background-color: rgba(255, 255, 255, 0.08);
}

/* text-muted 在暗黑模式更亮一點 */
:deep(.text-muted) {
  color: rgba(255, 255, 255, 0.55) !important;
}
</style>

<style scoped>
/* 參考 daily-report 的收合卡片樣式 */
.report-card {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
}

.report-card--full {
  width: 100%;
}

/* 內容區與 daily-report 一致：沿用卡片背景，不套用其他頁的 .card-body 背景 */
.report-card :deep(.card-body) {
  background: transparent;
}

.report-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--bs-border-color-translucent);
  background: linear-gradient(
    135deg,
    rgba(var(--bs-primary-rgb), 0.08) 0%,
    rgba(var(--bs-primary-rgb), 0.03) 60%,
    transparent 100%
  );
}

.cursor-pointer {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cursor-pointer:hover {
  background: linear-gradient(
    135deg,
    rgba(var(--bs-primary-rgb), 0.12) 0%,
    rgba(var(--bs-primary-rgb), 0.06) 60%,
    transparent 100%
  );
}

.report-card__icon {
  font-size: 1.125rem;
}

.report-card__title {
  font-weight: 600;
  font-size: 1rem;
}

.report-card__body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.b1-card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

.b1-export-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1.2rem;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #fff !important;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(
    145deg,
    rgba(var(--bs-primary-rgb), 0.58) 0%,
    rgba(var(--bs-primary-rgb), 0.32) 42%,
    rgba(15, 23, 42, 0.45) 100%
  );
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.b1-export-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.38);
  filter: brightness(1.05);
}

.b1-export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.b1-overview-textarea {
  height: 300px;
  resize: vertical;
}
</style>
