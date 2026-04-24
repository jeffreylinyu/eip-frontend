<template>
  <div class="form-p2-quality-plan-page">
    <PageHeader title="P-2 整體品質計劃" icon="fa fa-file-lines" :breadcrumbs="breadcrumbs">
      <template v-if="hasCurrentProject && isContractor" #extra>
        <DesignChangeVersionSwitcher
          :model-value="selectedDesignChangeId"
          :construction-id="currentProject?.id"
          source-type="CONTRACTOR"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!isContractor" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      「P-2 整體品質計劃」僅供營造端維護。
    </div>

    <Card v-else class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <!-- 先做截圖中這段工具列 UI（版型與 P-1 一致） -->
        <div class="b2-content-toolbar">
          <div class="p1-toolbar-left">
            <label class="p1-refdate-label" for="p2-data-reference-date">
              資料依據日
              <span
                class="p1-info-icon"
                data-tooltip="此日期用於匯出時的人員統計與內容判斷;預設會帶入目前版本的起始日。"
                tabindex="0"
                aria-label="資料依據日說明"
              >
                <i class="fa fa-circle-info"></i>
              </span>
            </label>
            <RepublicDatePicker
              id="p2-data-reference-date"
              v-model="dataReferenceDate"
              class="p1-refdate-picker"
              placeholder="請選擇資料依據日"
              value-format="YYYY-MM-DD"
              auto-apply
            />
          </div>

          <div class="p1-toolbar-right">
            <div v-if="selectedDesignChangeId != null" class="btn-group">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="自前一個變更設計版本複製 P-2 內容到目前版本"
              >
                <i class="fa fa-copy me-1"></i>
                複製前一個版本
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li>
                  <button type="button" class="dropdown-item text-danger" @click="copyFromPrevious">
                    覆寫目前版本（P-2）
                  </button>
                </li>
              </ul>
            </div>

            <button type="button" class="btn b2-export-btn" :disabled="isExporting" @click="exportWord">
              <i class="fa fa-file-word"></i>
              {{ isExporting ? '匯出中…' : '匯出 Word' }}
            </button>
          </div>
        </div>

        <div v-if="isTextLoading" class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入文字內容中…
        </div>
        <div v-else class="text-panels text-panels--ai-wrap">
          <div v-if="isAiGenerating" class="text-panels__ai-overlay" aria-live="polite">
            <div class="text-panels__ai-overlay-inner">
              <i class="fa fa-spinner fa-spin fa-2x mb-2 text-primary"></i>
              <div class="fw-semibold">AI 生成中…</div>
              <div class="small text-muted mt-1">產生內容後會自動儲存至目前版本</div>
            </div>
          </div>

          <div class="row g-3 align-items-stretch">
            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-ruler-combined me-2 text-warning"></i>
                    工程規模概述
                  </div>
                  <div class="text-panel__toolbar">
                    <button
                      type="button"
                      class="btn-ai-generate"
                      :disabled="isAiGenerating || !currentProject?.id"
                      @click="generateScaleOverviewByAi"
                    >
                      <i
                        class="fa me-2"
                        :class="aiLoading.scaleOverview ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                      ></i>
                      {{ aiLoading.scaleOverview ? '生成中…' : '依標單 AI 生成' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <textarea
                    v-model="p2QualityScaleOverview"
                    class="form-control text-panel__textarea"
                    rows="7"
                    placeholder="請輸入工程規模概述（P-2 獨立欄位）"
                    @input="scheduleAutoSave"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { debounce } from 'lodash'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useExportLoading } from '@/composables/useExportLoading'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import { formPApi, downloadBlobAsFile, type ExportConstructionReportRequest } from '@/api/forms'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
import { getConstructionDetail, getP1TextAiGenerate, updateConstruction } from '@/api/construction'

const workspaceStore = useWorkspaceStore()
const { isContractor } = useViewPerspective()
const { runWithExportLoading } = useExportLoading()

const currentProject = computed(() => workspaceStore.currentProject)
const hasCurrentProject = computed(() => !!currentProject.value?.id)

const selectedDesignChangeId = ref<number | null>(null)
const dataReferenceDate = ref('')
const isExporting = ref(false)

const isTextLoading = ref(false)
const isAiGenerating = ref(false)
const aiLoading = ref({ scaleOverview: false })

const p2QualityScaleOverview = ref('')

const breadcrumbs = [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: 'P類(計劃書)表單', href: 'javascript:;' },
  { text: 'P-2 整體品質計劃', active: true },
]

async function onVersionChange(versionId: number | null) {
  selectedDesignChangeId.value = versionId
  if (!dataReferenceDate.value) {
    dataReferenceDate.value = new Date().toISOString().slice(0, 10)
  }
  await loadTexts()
}

function copyFromPrevious() {
  window.alert('尚未實作：後續會依 P-1 行為加入「複製前一個版本」的 API 串接。')
}

async function loadTexts() {
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value) return

  isTextLoading.value = true
  try {
    const detail = await getConstructionDetail(cid, undefined, 'CONTRACTOR', selectedDesignChangeId.value)
    p2QualityScaleOverview.value = detail.p2QualityScaleOverview ?? ''
    if (!dataReferenceDate.value) {
      dataReferenceDate.value = new Date().toISOString().slice(0, 10)
    }
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '載入失敗'
    window.alert(msg)
  } finally {
    isTextLoading.value = false
  }
}

async function saveTexts() {
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value) return
  await updateConstruction(
    cid,
    {
      // updateConstruction payload 會自己帶 constructionId；這裡僅送變更欄位
      p2QualityScaleOverview: p2QualityScaleOverview.value,
    } as any,
    selectedDesignChangeId.value
  )
}

const debouncedAutoSave = debounce(async () => {
  try {
    await saveTexts()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
    window.alert(msg)
  }
}, 800)

function scheduleAutoSave() {
  debouncedAutoSave()
}

async function generateScaleOverviewByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  aiLoading.value.scaleOverview = true
  try {
    const { text } = await getP1TextAiGenerate(cid, selectedDesignChangeId.value)
    p2QualityScaleOverview.value = text ?? ''
    await saveTexts()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? 'AI 生成失敗'
    window.alert(msg)
  } finally {
    aiLoading.value.scaleOverview = false
    isAiGenerating.value = false
  }
}

async function exportWord() {
  const cid = currentProject.value?.id
  if (!cid) {
    window.alert('請先選擇工程案')
    return
  }
  const reportData: ExportConstructionReportRequest['valueMap']['reportData'] = {
    constructionId: cid,
    designChangeId: selectedDesignChangeId.value
  }
  if (dataReferenceDate.value) {
    reportData.dataReferenceDate = dataReferenceDate.value
  }
  const request: ExportConstructionReportRequest = { valueMap: { reportData } }
  isExporting.value = true
  try {
    const taskId = `p2-export-${cid}-${Date.now()}`
    const res = await runWithExportLoading(taskId, 'P-2 整體品質計劃', (signal) =>
      formPApi.exportP2QualityPlan(request, { signal })
    )
    const fileName = extractFileNameFromResponse(res) || `P-2_整體品質計劃_${Date.now()}.docx`
    downloadBlobAsFile(res.data, fileName)
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '匯出失敗'
    window.alert(msg)
  } finally {
    isExporting.value = false
  }
}

onMounted(async () => {
  if (!dataReferenceDate.value) {
    dataReferenceDate.value = new Date().toISOString().slice(0, 10)
  }
  await loadTexts()
})

watch(
  () => currentProject.value?.id,
  async () => {
    selectedDesignChangeId.value = null
    await loadTexts()
  }
)

onUnmounted(() => {
  debouncedAutoSave.cancel()
})
</script>

<style scoped>
/* 版型/邊距/卡片樣式：完全對齊 P-1（目前先複製必要子集合） */
.form-p2-quality-plan-page {
  padding: 1rem;
  background: radial-gradient(1200px 600px at 12% 0%, rgba(var(--bs-primary-rgb), 0.06), transparent 60%),
    radial-gradient(900px 500px at 88% 10%, rgba(255, 255, 255, 0.03), transparent 55%),
    rgba(15, 23, 42, 0.10);
}

.report-card {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}
.report-card::before {
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
.report-card :deep(.card-body) {
  background: transparent;
}
.report-card__body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.b2-content-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-top: -0.1rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}
.p1-toolbar-left {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 330px;
}
.p1-toolbar-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}
.p1-refdate-label {
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.p1-refdate-picker {
  min-width: 190px;
  max-width: 240px;
}
.p1-refdate-picker :deep(.dp__input) {
  height: 34px;
  border-radius: 0.5rem;
}
.p1-info-icon {
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.85rem;
  cursor: help;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  position: relative;
}
.p1-info-icon::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  top: calc(100% + 8px);
  transform: translateX(-50%);
  min-width: 280px;
  max-width: 380px;
  padding: 0.45rem 0.6rem;
  border-radius: 0.45rem;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.94);
  font-size: 0.76rem;
  line-height: 1.35;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  opacity: 0;
  pointer-events: none;
  z-index: 30;
  transition: opacity 0.15s ease;
  white-space: normal;
}
.p1-info-icon::before {
  content: '';
  position: absolute;
  left: 50%;
  top: calc(100% + 2px);
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(255, 255, 255, 0.18);
  opacity: 0;
  pointer-events: none;
  z-index: 30;
}
.p1-info-icon:hover::after,
.p1-info-icon:hover::before,
.p1-info-icon:focus-visible::after,
.p1-info-icon:focus-visible::before {
  opacity: 1;
}
.b2-export-btn {
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
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease,
    filter 0.16s ease;
}
.b2-export-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.38);
  filter: brightness(1.05);
  box-shadow:
    0 8px 24px rgba(var(--bs-primary-rgb), 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.b2-export-btn:active:not(:disabled) {
  transform: translateY(0);
  filter: brightness(0.98);
}
.b2-export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

/* 文字區塊：完全對齊 P-1 */
.text-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0.9rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.20);
}
.text-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}
.text-panel__label {
  display: flex;
  align-items: center;
  font-weight: 700;
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
  color: rgba(255, 255, 255, 0.90);
}
.text-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  margin: 0;
}
.text-panel__toolbar .btn-ai-generate {
  padding: 0.45rem 1.05rem;
  font-size: 0.92rem;
}
.text-panel__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.text-panel__textarea {
  flex: 1 1 auto;
  min-height: 10rem;
  width: 100%;
  resize: vertical;
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
}
.text-panel__textarea:focus {
  background: rgba(0, 0, 0, 0.20);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
  color: rgba(255, 255, 255, 0.92);
}
.text-panel__textarea::placeholder {
  color: rgba(255, 255, 255, 0.45);
}
.text-panels {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
</style>

