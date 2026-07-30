<template>
  <div class="form-citizen-inspection-page">
    <PageHeader :title="pageTitle" icon="fa fa-people-group" :breadcrumbs="breadcrumbs" />

    <div v-if="!currentProject?.id" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案。
    </div>

    <Card v-else class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div class="b2-content-toolbar">
          <div class="citizen-toolbar-left">
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="goBack">
              <i class="fa fa-arrow-left me-1"></i>返回列表
            </button>
            <span class="citizen-form-label">
              <i class="fa fa-people-group me-2 text-warning"></i>
              全民督工案件檢查表
            </span>
            <span class="save-state" :class="saveState">
              <i :class="saveStateIcon"></i>{{ saveStateLabel }}
            </span>
          </div>
          <div class="citizen-toolbar-right">
            <button type="button" class="win-btn" @click="showSubmissionModal = true">
              <i class="fa fa-clipboard-list"></i>送審紀錄
            </button>
            <button
              type="button"
              class="btn b2-export-btn"
              :disabled="exporting || loading"
              @click="exportWord"
            >
              <i :class="exporting ? 'fa fa-spinner fa-spin' : 'fa fa-file-word'"></i>
              {{ exporting ? '匯出中…' : '匯出 Word' }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入表單中…
        </div>

        <div v-else class="citizen-sections">
          <div class="row g-3 align-items-stretch">
            <div class="col-12 col-xl-6 d-flex">
              <section class="section-card flex-fill">
                <div class="section-card__header">
                  <i class="fa fa-user-pen me-2 text-warning"></i>填報資訊
                </div>
                <div class="section-card__body">
                  <div class="row g-3">
                    <div class="col-12 col-md-6">
                      <label class="form-label">填報日期</label>
                      <RepublicDatePicker v-model="form.reportDate" />
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label">填報人姓名</label>
                      <input v-model="form.reporterName" class="form-control" type="text" />
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label">聯絡電話</label>
                      <input v-model="form.contactPhone" class="form-control" type="tel" />
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label">通報單位</label>
                      <input v-model="form.reportingUnit" class="form-control" type="text" />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div class="col-12 col-xl-6 d-flex">
              <section class="section-card flex-fill">
                <div class="section-card__header">
                  <i class="fa fa-building me-2 text-success"></i>案件基本資料
                </div>
                <div class="section-card__body">
                  <div class="row g-3">
                    <div class="col-12 col-md-6">
                      <label class="form-label">工程名稱</label>
                      <input v-model="form.projectName" class="form-control" type="text" />
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label">施工單位</label>
                      <input v-model="form.contractorName" class="form-control" type="text" />
                    </div>
                    <div class="col-12">
                      <label class="form-label">工程地點</label>
                      <input v-model="form.projectLocation" class="form-control" type="text" />
                    </div>
                    <div class="col-12">
                      <label class="form-label">督工事項</label>
                      <input v-model="form.inspectionSubject" class="form-control" type="text" />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <section class="section-card">
            <div class="section-card__header">
              <i class="fa fa-message me-2 text-info"></i>問題描述與建議
            </div>
            <div class="section-card__body">
              <div class="row g-3 align-items-stretch">
                <div class="col-12 col-lg-4 d-flex">
                  <div class="text-panel flex-fill">
                    <div class="text-panel__header">
                      <div class="text-panel__label">問題說明</div>
                    </div>
                    <div class="text-panel__body">
                      <textarea
                        v-model="form.problemDescription"
                        class="form-control text-panel__textarea"
                        rows="6"
                        placeholder="請輸入問題說明"
                      />
                    </div>
                  </div>
                </div>
                <div class="col-12 col-lg-4 d-flex">
                  <div class="text-panel flex-fill">
                    <div class="text-panel__header">
                      <div class="text-panel__label">影響範圍</div>
                    </div>
                    <div class="text-panel__body">
                      <textarea
                        v-model="form.affectedScope"
                        class="form-control text-panel__textarea"
                        rows="6"
                        placeholder="請輸入影響範圍"
                      />
                    </div>
                  </div>
                </div>
                <div class="col-12 col-lg-4 d-flex">
                  <div class="text-panel flex-fill">
                    <div class="text-panel__header">
                      <div class="text-panel__label">建議改善措施</div>
                    </div>
                    <div class="text-panel__body">
                      <textarea
                        v-model="form.correctiveActions"
                        class="form-control text-panel__textarea"
                        rows="6"
                        placeholder="請輸入建議改善措施"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="section-card">
            <div class="section-card__header">
              <i class="fa fa-paperclip me-2 text-warning"></i>附件註記
            </div>
            <div class="section-card__body">
              <div class="attachment-options">
                <div
                  v-for="group in attachmentGroups"
                  :key="group.type"
                  class="attachment-panel"
                >
                  <div class="attachment-panel__header">
                    <div class="text-panel__label">
                      <i :class="group.icon" class="me-2"></i>{{ group.label }}
                    </div>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      :disabled="uploadingType === group.type"
                      @click="triggerAttachmentUpload(group.type)"
                    >
                      <i
                        :class="uploadingType === group.type ? 'fa fa-spinner fa-spin' : 'fa fa-upload'"
                        class="me-1"
                      ></i>
                      上傳
                    </button>
                  </div>
                  <div v-if="attachmentsByType(group.type).length === 0" class="attachment-empty">
                    尚未上傳{{ group.label }}
                  </div>
                  <div v-else class="attachment-list">
                    <div
                      v-for="attachment in attachmentsByType(group.type)"
                      :key="attachment.id"
                      class="attachment-row"
                    >
                      <a
                        v-if="attachment.downloadUrl"
                        :href="attachment.downloadUrl"
                        target="_blank"
                        rel="noopener"
                        class="attachment-name"
                      >
                        <i class="fa fa-file me-2"></i>{{ attachment.fileName }}
                      </a>
                      <span v-else class="attachment-name">
                        <i class="fa fa-file me-2"></i>{{ attachment.fileName }}
                      </span>
                      <span class="attachment-size">{{ formatFileSize(attachment.fileSize) }}</span>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        title="刪除附件"
                        @click="removeAttachment(attachment)"
                      >
                        <i class="fa fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <input
                ref="photoInputRef"
                type="file"
                accept="image/*"
                multiple
                class="d-none"
                @change="onAttachmentFiles('PHOTO', $event)"
              />
              <input
                ref="supportingInputRef"
                type="file"
                multiple
                class="d-none"
                @change="onAttachmentFiles('SUPPORTING_DOCUMENT', $event)"
              />
            </div>
          </section>
        </div>
      </CardBody>
    </Card>

    <PlanSubmissionPModal
      v-model:show="showSubmissionModal"
      :construction-id="currentProject?.id ?? ''"
      :plan-type="fixedFormCode"
      :plan-label="pageTitle"
      :context-record-id="recordId ?? undefined"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import PlanSubmissionPModal from '@/components/forms/PlanSubmissionPModal.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  exportCitizenInspectionForm,
  exportCitizenInspectionBundle,
  getCitizenInspectionForm,
  listCitizenInspectionAttachments,
  uploadCitizenInspectionAttachments,
  deleteCitizenInspectionAttachment,
  updateCitizenInspectionForm,
  type CitizenInspectionForm,
  type CitizenInspectionAttachment,
  type CitizenInspectionAttachmentType,
} from '@/api/citizenInspection'
import { downloadBlobAsFile } from '@/api/forms'
import toastService from '@/components/bootstrap/ToastService.js'
import { getDesignChangeList } from '@/api/designChange'
import { documentClassificationApi } from '@/api/documentClassification'
import { contractorDocumentClassificationApi } from '@/api/contractorDocumentClassification'

const emptyForm = (): CitizenInspectionForm => ({
  id: null,
  reportDate: null,
  reporterName: null,
  contactPhone: null,
  reportingUnit: null,
  projectName: null,
  contractorName: null,
  projectLocation: null,
  inspectionSubject: null,
  problemDescription: null,
  affectedScope: null,
  correctiveActions: null,
  hasPhoto: false,
  hasSupportingDocument: false,
})

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const currentProject = computed(() => workspaceStore.currentProject)
const fixedFormCode = computed(() => String(route.meta.fixedFormCode ?? 'C01'))
const recordId = computed(() => {
  const value = Number(route.params.recordId)
  return Number.isFinite(value) && value > 0 ? value : null
})
const category = computed(() => fixedFormCode.value.startsWith('G') ? 'G' : 'C')
const documentName = ref('')
const pageTitle = computed(() => `${category.value}-1 ${documentName.value || '全民督工案件'}`)
const breadcrumbs = computed(() => [
  { text: '表單管理', href: 'javascript:;' },
  { text: `${category.value}類表單`, href: 'javascript:;' },
  { text: pageTitle.value, active: true as const },
])

const form = reactive<CitizenInspectionForm>(emptyForm())
const loading = ref(false)
const exporting = ref(false)
const hydrated = ref(false)
const showSubmissionModal = ref(false)
const attachments = ref<CitizenInspectionAttachment[]>([])
const uploadingType = ref<CitizenInspectionAttachmentType | null>(null)
const photoInputRef = ref<HTMLInputElement | null>(null)
const supportingInputRef = ref<HTMLInputElement | null>(null)
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
let saveTimer: ReturnType<typeof setTimeout> | null = null

const attachmentGroups: Array<{
  type: CitizenInspectionAttachmentType
  label: string
  icon: string
}> = [
  { type: 'PHOTO', label: '照片', icon: 'fa fa-image text-info' },
  {
    type: 'SUPPORTING_DOCUMENT',
    label: '相關證明文件',
    icon: 'fa fa-file-circle-check text-warning',
  },
]

const saveStateLabel = computed(() => ({
  idle: '尚未變更',
  saving: '儲存中',
  saved: '已自動儲存',
  error: '儲存失敗',
})[saveState.value])
const saveStateIcon = computed(() => ({
  idle: 'fa fa-minus-circle',
  saving: 'fa fa-spinner fa-spin',
  saved: 'fa fa-circle-check',
  error: 'fa fa-circle-exclamation',
})[saveState.value])

function applyDefaults() {
  const project = currentProject.value
  if (!project) return
  if (!form.projectName) form.projectName = project.name
  if (!form.contractorName) {
    form.contractorName = project.contractorCompanyName || project.contractorName || null
  }
  if (!form.projectLocation) form.projectLocation = project.location || null
}

async function loadForm() {
  const constructionId = currentProject.value?.id
  hydrated.value = false
  attachments.value = []
  Object.assign(form, emptyForm())
  if (!constructionId || !recordId.value) return
  loading.value = true
  try {
    const [record, recordAttachments] = await Promise.all([
      getCitizenInspectionForm(constructionId, recordId.value),
      listCitizenInspectionAttachments(constructionId, recordId.value),
    ])
    Object.assign(form, record)
    attachments.value = recordAttachments
    applyDefaults()
    saveState.value = 'idle'
  } catch {
    toastService.error('全民督工案件表單載入失敗')
  } finally {
    loading.value = false
    hydrated.value = true
  }
}

async function loadDocumentName() {
  const constructionId = currentProject.value?.id
  documentName.value = ''
  if (!constructionId) return
  let designChangeId: number | null = null
  try {
    const versions = await getDesignChangeList(
      constructionId,
      undefined,
      { skipAuthRedirectOn401: true },
      false,
    )
    designChangeId = versions.reduce<{ id: number; sortOrder: number } | null>((latest, item) => {
      if (!latest || item.sortOrder > latest.sortOrder) {
        return { id: item.id, sortOrder: item.sortOrder }
      }
      return latest
    }, null)?.id ?? null
  } catch {
    designChangeId = null
  }

  try {
    const rows = category.value === 'C'
      ? await documentClassificationApi.getAll(
          constructionId,
          designChangeId,
          { skipAuthRedirectOn401: true },
        )
      : await contractorDocumentClassificationApi.getAll(
          constructionId,
          designChangeId,
          { skipAuthRedirectOn401: true } as any,
        )
    const row = rows.find((item) => item.fixedFormCode === fixedFormCode.value)
    documentName.value = row?.documentName?.trim() ?? ''
  } catch {
    documentName.value = ''
  }
}

async function persist() {
  const constructionId = currentProject.value?.id
  if (!constructionId || !recordId.value || !hydrated.value) return
  saveState.value = 'saving'
  try {
    await updateCitizenInspectionForm(constructionId, recordId.value, { ...form })
    saveState.value = 'saved'
  } catch {
    saveState.value = 'error'
  }
}

async function exportWord() {
  const constructionId = currentProject.value?.id
  if (!constructionId || !recordId.value) return
  exporting.value = true
  try {
    await persist()
    const includeAttachments = attachments.value.length > 0 && window.confirm(
      '此案件有附件。\n按「確定」下載 Word 與全部附件 ZIP；按「取消」僅下載 Word。',
    )
    const blob = includeAttachments
      ? await exportCitizenInspectionBundle(constructionId, recordId.value)
      : await exportCitizenInspectionForm(constructionId, recordId.value)
    downloadBlobAsFile(
      blob,
      includeAttachments
        ? `${category.value}-1_全民督工案件檢查表_含附件.zip`
        : `${category.value}-1_全民督工案件檢查表.docx`,
    )
  } catch {
    toastService.error('Word 匯出失敗')
  } finally {
    exporting.value = false
  }
}

function attachmentsByType(type: CitizenInspectionAttachmentType) {
  return attachments.value.filter((attachment) => attachment.attachmentType === type)
}

function triggerAttachmentUpload(type: CitizenInspectionAttachmentType) {
  if (type === 'PHOTO') photoInputRef.value?.click()
  else supportingInputRef.value?.click()
}

async function onAttachmentFiles(type: CitizenInspectionAttachmentType, event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const constructionId = currentProject.value?.id
  if (!constructionId || !recordId.value || files.length === 0) return
  uploadingType.value = type
  try {
    attachments.value = await uploadCitizenInspectionAttachments(
      constructionId,
      recordId.value,
      type,
      files,
    )
    form.hasPhoto = attachmentsByType('PHOTO').length > 0
    form.hasSupportingDocument = attachmentsByType('SUPPORTING_DOCUMENT').length > 0
    toastService.success(`已上傳 ${files.length} 個附件`)
  } catch {
    toastService.error('附件上傳失敗')
  } finally {
    uploadingType.value = null
  }
}

async function removeAttachment(attachment: CitizenInspectionAttachment) {
  const constructionId = currentProject.value?.id
  if (!constructionId || !recordId.value) return
  if (!window.confirm(`確定刪除「${attachment.fileName}」？`)) return
  try {
    await deleteCitizenInspectionAttachment(constructionId, recordId.value, attachment.id)
    attachments.value = attachments.value.filter((item) => item.id !== attachment.id)
    form.hasPhoto = attachmentsByType('PHOTO').length > 0
    form.hasSupportingDocument = attachmentsByType('SUPPORTING_DOCUMENT').length > 0
  } catch {
    toastService.error('附件刪除失敗')
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

watch(
  () => [currentProject.value?.id, recordId.value],
  () => {
    void loadForm()
    void loadDocumentName()
  },
  { immediate: true },
)

function goBack() {
  void router.push(category.value === 'C'
    ? '/forms/c1-public-supervision-case'
    : '/forms/g1-public-supervision-case')
}

watch(
  form,
  () => {
    if (!hydrated.value) return
    saveState.value = 'saving'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { void persist() }, 700)
  },
  { deep: true },
)
</script>

<style scoped>
.report-card :deep(.card-body) {
  background: transparent;
}
.report-card__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
}
.b2-content-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-top: -0.1rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}
.citizen-toolbar-left,
.citizen-toolbar-right {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}
.citizen-toolbar-right {
  justify-content: flex-end;
}
.citizen-form-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: 700;
}
.save-state {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.8rem;
}
.save-state.saved {
  color: rgba(134, 239, 172, 0.9);
}
.save-state.error {
  color: rgba(252, 165, 165, 0.95);
}
.b2-export-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1.2rem;
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
.citizen-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.section-card {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.85rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(0, 0, 0, 0.15));
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.25);
}
.section-card__header {
  padding: 0.75rem 1rem;
  color: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 700;
}
.section-card__body {
  padding: 0.85rem;
}
.form-label {
  margin-bottom: 0.4rem;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.88rem;
  font-weight: 600;
}
.section-card .form-control {
  color: rgba(255, 255, 255, 0.92);
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
}
.section-card .form-control:focus {
  color: rgba(255, 255, 255, 0.92);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  background: rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
}
.text-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
}
.text-panel__header {
  display: flex;
  align-items: center;
  margin-bottom: 0.6rem;
}
.text-panel__label {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 700;
}
.text-panel__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
}
.text-panel__textarea {
  flex: 1 1 auto;
  min-height: 10rem;
  resize: vertical;
}
.text-panel__textarea::placeholder {
  color: rgba(255, 255, 255, 0.45);
}
.attachment-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}
.attachment-panel {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
}
.attachment-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.attachment-empty {
  padding: 1.25rem 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
  font-size: 0.85rem;
}
.attachment-list {
  display: flex;
  flex-direction: column;
}
.attachment-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.65rem 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.attachment-row:last-child {
  border-bottom: 0;
}
.attachment-name {
  overflow: hidden;
  flex: 1;
  min-width: 0;
  color: rgba(255, 255, 255, 0.88);
  text-overflow: ellipsis;
  white-space: nowrap;
}
a.attachment-name:hover {
  color: var(--bs-primary);
}
.attachment-size {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.75rem;
  white-space: nowrap;
}
@media (max-width: 767px) {
  .b2-content-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
  .citizen-toolbar-left,
  .citizen-toolbar-right {
    width: 100%;
    flex-wrap: wrap;
  }
  .citizen-toolbar-right {
    justify-content: flex-start;
  }
  .attachment-options {
    grid-template-columns: 1fr;
  }
}
</style>
