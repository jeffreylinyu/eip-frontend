<template>
  <div class="g2-editor-page">
    <PageHeader
      title="G-2 施工網狀圖"
      icon="fa fa-chart-gantt"
      :breadcrumbs="[
        { text: '營造 G 類表單', href: 'javascript:;' },
        { text: 'G-2 施工網狀圖', href: '/forms/g2-construction-network-diagram' },
        { text: form.title || '版本編輯', active: true },
      ]"
    />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案。
    </div>

    <div v-else-if="loading" class="card g2-loading-card">
      <div class="card-body text-center py-5">
        <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
      </div>
    </div>

    <template v-else>
      <Card class="mb-3 report-card report-card--full g2-meta-card">
        <CardBody class="report-card__body">
          <div class="b2-content-toolbar g2-toolbar">
            <div class="g2-toolbar-left">
              <button type="button" class="win-btn win-btn--sm" @click="goBack">
                <i class="fa fa-arrow-left me-1"></i>返回列表
              </button>
              <span class="g2-form-label">
                <i class="fa fa-chart-gantt me-2 text-warning"></i>施工網狀圖版本設定
              </span>
            </div>
            <div class="g2-toolbar-right">
              <button type="button" class="win-btn" @click="showSubmissionModal = true">
                <i class="fa fa-clipboard-list"></i>送審紀錄
              </button>
              <button type="button" class="win-btn win-btn-accent" :disabled="saving" @click="save">
                <i class="fa me-1" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
                {{ saving ? '儲存中…' : '儲存' }}
              </button>
              <FormExportWordButton
                :loading="exporting"
                :disabled="!tasks.length"
                @click="exportWord"
              />
            </div>
          </div>
          <div class="g2-version-panel">
            <label for="g2-version-title" class="form-label">版本名稱</label>
            <input
              id="g2-version-title"
              v-model="form.title"
              class="form-control"
              maxlength="255"
            />
            <span class="g2-version-hint">此名稱會顯示於 G-2 版本列表，並作為 Word 匯出檔名。</span>
          </div>
        </CardBody>
      </Card>

      <ProgressScheduleEditor
        ref="editorRef"
        v-model="tasks"
        :construction-id="constructionId"
        :title="projectName"
        source-type="contractor"
        source-label="分項工程"
      />
    </template>

    <PlanSubmissionPModal
      v-model:show="showSubmissionModal"
      :construction-id="constructionId"
      plan-type="G02"
      plan-label="G-2 施工網狀圖"
      :context-record-id="recordId"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import FormExportWordButton from '@/components/common/FormExportWordButton.vue'
import PlanSubmissionPModal from '@/components/forms/PlanSubmissionPModal.vue'
import ProgressScheduleEditor from '@/views/progress2/components/ProgressScheduleEditor.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Progress2Task } from '@/stores/progress2'
import {
  exportG2ScheduleForm,
  getG2ScheduleForm,
  updateG2ScheduleForm,
} from '@/api/g2ScheduleForm'

type ScheduleEditorRef = {
  captureChartBlobs: () => Promise<{ ganttPages: Blob[]; curve: Blob } | null>
}

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const projectName = computed(() => (workspaceStore.currentProject as any)?.name || '')
const recordId = computed(() => Number(route.params.recordId))
const form = reactive({ title: '' })
const tasks = ref<Progress2Task[]>([])
const loading = ref(true)
const saving = ref(false)
const exporting = ref(false)
const showSubmissionModal = ref(false)
const editorRef = ref<ScheduleEditorRef | null>(null)

const load = async () => {
  if (!constructionId.value || !recordId.value) return
  loading.value = true
  try {
    const record = await getG2ScheduleForm(constructionId.value, recordId.value)
    form.title = record.title
    tasks.value = record.tasks
  } catch (error) {
    console.error('[G2] 載入版本失敗', error)
    toastService.error('載入 G-2 版本失敗')
  } finally {
    loading.value = false
  }
}

const save = async (): Promise<boolean> => {
  if (!constructionId.value || !recordId.value || saving.value) return false
  saving.value = true
  try {
    const saved = await updateG2ScheduleForm(constructionId.value, recordId.value, {
      title: form.title,
      tasks: tasks.value,
    })
    form.title = saved.title
    toastService.success('G-2 版本已儲存')
    return true
  } catch (error) {
    console.error('[G2] 儲存失敗', error)
    toastService.error('儲存失敗')
    return false
  } finally {
    saving.value = false
  }
}

const exportWord = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    if (!(await save())) return
    const charts = await editorRef.value?.captureChartBlobs()
    if (!charts) throw new Error('圖表產生失敗')
    const blob = await exportG2ScheduleForm(
      constructionId.value,
      recordId.value,
      charts.ganttPages,
      charts.curve,
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${form.title.replace(/[\\/:*?"<>|]+/g, '_') || 'G-2_Construction_Network_Diagram'}.docx`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('[G2] 匯出失敗', error)
    toastService.error('匯出失敗，請確認 Word 樣板已放入指定資料夾')
  } finally {
    exporting.value = false
  }
}

const goBack = () => router.push('/forms/g2-construction-network-diagram')

onMounted(async () => {
  if (!workspaceStore.currentWorkspace) await workspaceStore.initWorkspaces()
  await load()
})
</script>

<style scoped>
.g2-editor-page {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1200px 600px at 12% 0%, rgba(var(--bs-primary-rgb), 0.06), transparent 60%),
    radial-gradient(900px 500px at 88% 10%, rgba(255, 255, 255, 0.03), transparent 55%),
    rgba(15, 23, 42, 0.1);
}
.g2-loading-card,
.g2-meta-card {
  position: relative;
  background-color: #0f172a;
  background-image: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}
.g2-meta-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(700px 220px at 20% 0%, rgba(var(--bs-primary-rgb), 0.12), transparent 55%);
  opacity: 0.9;
  pointer-events: none;
}
.g2-meta-card :deep(.card-body) {
  position: relative;
  z-index: 1;
  background: transparent;
}
.report-card__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
}
.g2-toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 0;
}
.g2-toolbar-left,
.g2-toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.g2-toolbar-right {
  justify-content: flex-end;
}
.g2-form-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: 700;
}
.g2-version-panel {
  display: grid;
  grid-template-columns: 110px minmax(260px, 680px) 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.035);
}
.g2-version-panel .form-label {
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
}
.g2-version-panel .form-control {
  color: rgba(255, 255, 255, 0.92);
  background-color: rgba(0, 0, 0, 0.22);
  border-color: rgba(255, 255, 255, 0.18);
}
.g2-version-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.78rem;
}
.g2-meta-card :deep(.b2-export-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1.2rem;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #fff !important;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
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
@media (max-width: 767.98px) {
  .g2-toolbar,
  .g2-toolbar-left,
  .g2-toolbar-right {
    align-items: stretch;
  }
  .g2-version-panel {
    grid-template-columns: 1fr;
  }
}
</style>
