<template>
  <div class="g5-page">
    <PageHeader
      title="G-5 營建剩餘土石方管理"
      icon="fa fa-mountain-sun"
      :breadcrumbs="breadcrumbs"
    />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程專案
    </div>

    <Card v-else class="g5-shell">
      <CardHeader class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div>
          <h5 class="mb-1">土石方管理文件</h5>
          <p class="mb-0 small text-muted">
            本項目沒有固定樣板，每筆紀錄可自行上傳文件並維護獨立送審紀錄。
          </p>
        </div>
        <button
          type="button"
          class="win-btn win-btn--sm win-btn-accent"
          :disabled="creating"
          @click="createRecord"
        >
          <i :class="creating ? 'fa fa-spinner fa-spin' : 'fa fa-plus'" class="me-1"></i>
          新增文件紀錄
        </button>
      </CardHeader>
      <CardBody>
        <div v-if="loading" class="text-center py-5 text-muted">
          <i class="fa fa-spinner fa-spin fa-2x"></i>
        </div>
        <div v-else-if="records.length === 0" class="empty-state">
          <i class="fa fa-folder-open fa-3x mb-3"></i>
          <div>目前沒有營建剩餘土石方管理文件</div>
          <div class="small mt-2">請新增一筆紀錄後上傳文件。</div>
        </div>
        <div v-else class="record-grid">
          <article v-for="record in records" :key="record.id" class="record-card">
            <div class="record-heading">
              <div class="record-icon"><i class="fa fa-file-shield"></i></div>
              <div class="flex-fill min-w-0">
                <label class="form-label">紀錄名稱</label>
                <input v-model="record.title" class="form-control" maxlength="255" />
              </div>
            </div>

            <label class="form-label mt-3">備註</label>
            <textarea
              v-model="record.note"
              class="form-control"
              rows="3"
              placeholder="可填寫文件用途、期別或其他說明"
            ></textarea>

            <div class="file-section">
              <div class="file-section__heading">
                <strong><i class="fa fa-paperclip me-2 text-warning"></i>已上傳文件</strong>
                <button
                  type="button"
                  class="win-btn win-btn--sm"
                  :disabled="uploadingId === record.id"
                  @click="selectFiles(record)"
                >
                  <i
                    :class="uploadingId === record.id ? 'fa fa-spinner fa-spin' : 'fa fa-upload'"
                    class="me-1"
                  ></i>
                  上傳文件
                </button>
              </div>
              <div v-if="record.attachments.length === 0" class="file-empty">尚未上傳文件</div>
              <div v-else class="file-list">
                <div
                  v-for="attachment in record.attachments"
                  :key="attachment.id"
                  class="file-row"
                >
                  <a
                    :href="attachment.downloadUrl || undefined"
                    target="_blank"
                    rel="noopener"
                    class="file-link"
                    :class="{ disabled: !attachment.downloadUrl }"
                  >
                    <i class="fa fa-file-lines"></i>
                    <span class="text-truncate">{{ attachment.fileName }}</span>
                    <small>{{ formatSize(attachment.fileSize) }}</small>
                  </a>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    title="刪除文件"
                    @click="removeAttachment(record, attachment)"
                  >
                    <i class="fa fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            <div class="record-footer">
              <small class="text-muted">更新：{{ formatDateTime(record.updatedAt) }}</small>
              <div class="d-flex gap-2 flex-wrap justify-content-end">
                <button class="win-btn win-btn--sm" @click="openSubmission(record)">
                  <i class="fa fa-clipboard-list me-1"></i>送審紀錄
                </button>
                <button
                  class="win-btn win-btn--sm win-btn-accent"
                  :disabled="savingId === record.id"
                  @click="saveRecord(record)"
                >
                  <i
                    :class="savingId === record.id ? 'fa fa-spinner fa-spin' : 'fa fa-floppy-disk'"
                    class="me-1"
                  ></i>
                  儲存
                </button>
                <button class="win-btn win-btn--sm win-btn-danger" @click="removeRecord(record)">
                  <i class="fa fa-trash me-1"></i>刪除
                </button>
              </div>
            </div>
          </article>
        </div>
      </CardBody>
    </Card>

    <input ref="fileInput" type="file" multiple class="d-none" @change="onFilesSelected" />

    <PlanSubmissionPModal
      v-if="submissionRecord"
      v-model:show="showSubmissionModal"
      :construction-id="constructionId"
      plan-type="G05"
      plan-label="G-5 營建剩餘土石方管理"
      :context-record-id="submissionRecord.id"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import PlanSubmissionPModal from '@/components/forms/PlanSubmissionPModal.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  createG5SoilManagementRecord,
  deleteG5SoilManagementAttachment,
  deleteG5SoilManagementRecord,
  listG5SoilManagementRecords,
  updateG5SoilManagementRecord,
  uploadG5SoilManagementAttachments,
  type G5SoilManagementAttachment,
  type G5SoilManagementRecord,
} from '@/api/g5SoilManagementRecord'

const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const breadcrumbs = [
  { text: '營造 G 類表單', href: 'javascript:;' },
  { text: 'G-5 營建剩餘土石方管理', active: true as const },
]
const records = ref<G5SoilManagementRecord[]>([])
const loading = ref(false)
const creating = ref(false)
const savingId = ref<number | null>(null)
const uploadingId = ref<number | null>(null)
const uploadRecord = ref<G5SoilManagementRecord | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const submissionRecord = ref<G5SoilManagementRecord | null>(null)
const showSubmissionModal = ref(false)

async function load() {
  if (!constructionId.value) {
    records.value = []
    return
  }
  loading.value = true
  try {
    records.value = await listG5SoilManagementRecords(constructionId.value)
  } catch (error) {
    console.error('[G5SoilManagement] load failed', error)
    toastService.error('載入營建剩餘土石方管理文件失敗')
  } finally {
    loading.value = false
  }
}

async function createRecord() {
  if (!constructionId.value || creating.value) return
  creating.value = true
  try {
    const created = await createG5SoilManagementRecord(constructionId.value, {
      title: `G-5 營建剩餘土石方管理 ${records.value.length + 1}`,
      note: '',
    })
    records.value.unshift(created)
  } catch (error) {
    console.error('[G5SoilManagement] create failed', error)
    toastService.error('新增文件紀錄失敗')
  } finally {
    creating.value = false
  }
}

async function saveRecord(record: G5SoilManagementRecord) {
  if (savingId.value) return
  savingId.value = record.id
  try {
    const saved = await updateG5SoilManagementRecord(constructionId.value, record.id, {
      title: record.title,
      note: record.note,
    })
    Object.assign(record, saved)
    toastService.success('文件紀錄已儲存')
  } catch (error) {
    console.error('[G5SoilManagement] save failed', error)
    toastService.error('儲存文件紀錄失敗')
  } finally {
    savingId.value = null
  }
}

function selectFiles(record: G5SoilManagementRecord) {
  uploadRecord.value = record
  fileInput.value?.click()
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const record = uploadRecord.value
  if (!record || !files.length) return
  uploadingId.value = record.id
  try {
    record.attachments = await uploadG5SoilManagementAttachments(
      constructionId.value,
      record.id,
      files,
    )
    toastService.success('文件已上傳並同步至檔案總管')
  } catch (error) {
    console.error('[G5SoilManagement] upload failed', error)
    toastService.error('文件上傳失敗')
  } finally {
    uploadingId.value = null
    uploadRecord.value = null
  }
}

async function removeAttachment(
  record: G5SoilManagementRecord,
  attachment: G5SoilManagementAttachment,
) {
  if (!window.confirm(`確定刪除「${attachment.fileName}」？`)) return
  try {
    await deleteG5SoilManagementAttachment(
      constructionId.value,
      record.id,
      attachment.id,
    )
    record.attachments = record.attachments.filter((item) => item.id !== attachment.id)
  } catch (error) {
    console.error('[G5SoilManagement] attachment delete failed', error)
    toastService.error('刪除文件失敗')
  }
}

async function removeRecord(record: G5SoilManagementRecord) {
  if (!window.confirm(`確定刪除「${record.title}」、全部文件及送審紀錄？`)) return
  try {
    await deleteG5SoilManagementRecord(constructionId.value, record.id)
    records.value = records.value.filter((item) => item.id !== record.id)
  } catch (error) {
    console.error('[G5SoilManagement] delete failed', error)
    toastService.error('刪除文件紀錄失敗')
  }
}

function openSubmission(record: G5SoilManagementRecord) {
  submissionRecord.value = record
  showSubmissionModal.value = true
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const formatDateTime = (value: string) =>
  value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '-'

watch(constructionId, load)
onMounted(async () => {
  if (!workspaceStore.currentWorkspace) await workspaceStore.initWorkspaces()
  await load()
})
</script>

<style scoped>
.g5-page {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1000px 520px at 8% 0%, rgba(var(--bs-primary-rgb), 0.08), transparent 62%),
    rgba(15, 23, 42, 0.1);
}
.g5-shell {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.9));
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}
.g5-shell :deep(.card-header),
.g5-shell :deep(.card-body) { background: transparent; }
.record-grid { display: grid; gap: 1rem; }
.record-card {
  padding: 1.15rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.7rem;
  background: #2d3136;
}
.record-heading { display: flex; align-items: flex-end; gap: 0.9rem; }
.record-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: grid;
  place-items: center;
  color: #fff;
  border-radius: 0.6rem;
  background: linear-gradient(135deg, #8a6116, #d8a33d);
}
.file-section {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.6rem;
  background: rgba(2, 6, 23, 0.38);
}
.file-section__heading,
.record-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.file-empty { padding: 1.5rem 0 0.5rem; text-align: center; color: var(--bs-secondary-color); }
.file-list { display: grid; gap: 0.55rem; margin-top: 0.9rem; }
.file-row { display: flex; align-items: center; gap: 0.55rem; }
.file-link {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  color: var(--bs-body-color);
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.45rem;
  background: rgba(15, 23, 42, 0.68);
}
.file-link:hover { border-color: rgba(var(--bs-primary-rgb), 0.6); }
.file-link.disabled { pointer-events: none; opacity: 0.6; }
.file-link span { min-width: 0; flex: 1; }
.file-link small { color: var(--bs-secondary-color); white-space: nowrap; }
.record-footer { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1); }
.empty-state { padding: 4rem 1rem; text-align: center; color: var(--bs-secondary-color); }
.min-w-0 { min-width: 0; }
@media (max-width: 767px) {
  .g5-page { padding: 0.65rem; }
  .record-heading { align-items: flex-start; }
  .record-footer { align-items: flex-start; }
}
</style>
