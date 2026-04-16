<template>
  <div class="construction-insurance-page form-b2-safety-supervision-plan-page">
    <PageHeader
      :title="pageTitle"
      icon="fa fa-shield-halved"
      :breadcrumbs="[
        { text: '基本資料維護', href: 'javascript:;' },
        { text: pageTitle, active: true }
      ]"
    />

    <Card v-if="constructionId" class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div class="b2-content-toolbar">
          <div class="b2-toolbar-left">
            <div v-if="isSupervisory && !hideScopeSwitcher" class="btn-group" role="tablist" aria-label="保險分類">
              <button
                type="button"
                class="btn btn-outline-primary"
                :class="{ active: activeScope === 'PROJECT' }"
                @click="activeScope = 'PROJECT'"
              >
                工程案
              </button>
              <button
                type="button"
                class="btn btn-outline-primary"
                :class="{ active: activeScope === 'SUPERVISION_COMPANY_IN_PROJECT' }"
                @click="activeScope = 'SUPERVISION_COMPANY_IN_PROJECT'"
              >
                監造公司（本案）
              </button>
            </div>
            <div v-else class="d-flex align-items-center gap-2 flex-wrap">
              <div class="fw-bold" style="color: rgba(255, 255, 255, 0.90);">
                <i class="fa fa-list-check me-2 text-info"></i>保險清單
              </div>
            </div>
          </div>

          <div class="b2-toolbar-right">
            <button class="btn btn-sm btn-outline-secondary" @click="refreshAll" :disabled="loading">
              <i class="fa fa-sync me-1"></i>重新整理
            </button>
            <button class="btn btn-sm btn-primary" @click="openCreate" :disabled="loading">
              <i class="fa fa-plus me-1"></i>新增保險
            </button>
          </div>
        </div>

        <div v-if="error" class="alert alert-danger py-2 mb-0">
          <i class="fa fa-exclamation-circle me-2"></i>{{ error }}
        </div>

        <div v-else-if="loading && insurances.length === 0" class="text-center py-4 text-muted">
          <span class="spinner-border spinner-border-sm me-2"></span>載入中…
        </div>

        <div v-else>
          <div v-if="insurances.length === 0" class="text-muted small py-2">
            目前尚無資料。
          </div>

          <div v-else class="table-scroll-wrap">
            <table class="table align-middle p1-resource-table mb-0 insurance-table">
              <thead>
                <tr>
                  <th style="width: 130px;">保單號</th>
                  <th style="width: 160px;">保險公司</th>
                  <th>險種</th>
                  <th style="width: 210px;">期間</th>
                  <th style="width: 240px;" class="text-end">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in insurances" :key="it.id">
                  <td class="font-monospace">{{ it.policyNo || '-' }}</td>
                  <td>{{ it.insuranceCompanyName || '-' }}</td>
                  <td>{{ it.insuranceType || '-' }}</td>
                  <td class="small">
                    {{ formatDateRoc(it.startDate) }} ~ {{ formatDateRoc(it.endDate) }}
                  </td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-info me-2" @click="openAttachments(it)" :disabled="loading">
                      <i class="fa fa-paperclip me-1"></i>附件
                      <span v-if="attachmentCounts[it.id] != null" class="badge rounded-pill bg-danger ms-1" style="font-size: 0.65rem;">
                        {{ attachmentCounts[it.id] }}
                      </span>
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-2" @click="openEdit(it)">
                      編輯
                    </button>
                    <button class="btn btn-sm btn-outline-danger" @click="removeInsurance(it)" :disabled="loading">
                      刪除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardBody>
    </Card>

    <div v-else class="alert alert-danger">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案。
    </div>

    <Modal :show="showEditModal" @update:show="showEditModal = $event" title="保險資料" size="lg">
      <template #body>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">保單號</label>
            <input class="form-control" v-model="editForm.policyNo" />
          </div>
          <div class="col-md-6">
            <label class="form-label">保險公司</label>
            <input class="form-control" v-model="editForm.insuranceCompanyName" />
          </div>
          <div class="col-md-6">
            <label class="form-label">險種</label>
            <input class="form-control" v-model="editForm.insuranceType" />
          </div>
          <div class="col-md-3">
            <label class="form-label">起日</label>
            <RepublicDatePicker
              v-model="editForm.startDate"
              value-format="YYYY-MM-DD"
              auto-apply
              placeholder="請選擇起日"
              input-class="form-control"
            />
          </div>
          <div class="col-md-3">
            <label class="form-label">迄日</label>
            <RepublicDatePicker
              v-model="editForm.endDate"
              value-format="YYYY-MM-DD"
              auto-apply
              placeholder="請選擇迄日"
              input-class="form-control"
            />
          </div>
          <div class="col-12">
            <label class="form-label">備註</label>
            <textarea class="form-control" rows="3" v-model="editForm.note"></textarea>
          </div>
        </div>
      </template>
      <template #footer>
        <button class="btn btn-outline-secondary" @click="showEditModal = false" :disabled="loading">取消</button>
        <button class="btn btn-primary" @click="saveEdit" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>儲存
        </button>
      </template>
    </Modal>

    <RelatedDocumentsModal
      :show="showAttachmentModal"
      title="保單附件"
      :loading="isLoadingAttachments"
      :linked-docs="[]"
      :attachments="currentAttachments"
      :uploading="isUploadingInModal"
      :show-linked-section="false"
      :show-download-all="false"
      upload-label="上傳附件"
      modal-class="a5-dark"
      @update:show="(v: boolean) => { if (!v) showAttachmentModal = false }"
      @upload="handleModalUpload"
      @preview-att="handlePreviewAttachment"
      @download-att="handleDownloadAttachment"
      @delete-att="handleDeleteAttachment"
    />

    <Modal
      :show="showPreviewModal"
      :title="'預覽 - ' + previewFileName"
      icon="fa fa-eye"
      size="xl"
      modalClass="a5-dark"
      :hideFooter="true"
      @update:show="(v: boolean) => { if (!v) { showPreviewModal = false; previewUrl = '' } }"
    >
      <template #body>
        <div v-if="isLoadingPreview" class="text-center py-5">
          <i class="fa fa-spinner fa-spin me-1"></i>載入中...
        </div>
        <div v-else-if="!previewUrl" class="text-center py-5 text-muted">
          <i class="fa fa-exclamation-circle fa-2x mb-2 d-block"></i>
          <span>無法產生預覽連結</span>
        </div>
        <iframe
          v-else
          :src="previewUrl"
          style="width: 100%; height: 75vh; border: none; border-radius: 6px;"
        ></iframe>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
/* 版面與樣式對齊 /forms/b2-safety-supervision-plan（FormB2SafetySupervisionPlan.vue） */
.form-b2-safety-supervision-plan-page {
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

.b2-toolbar-left {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  min-width: 240px;
}

.b2-toolbar-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

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
.text-panel__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
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
  gap: 0.5rem;
  flex-wrap: wrap;
}

.text-panel__textarea {
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

.table-scroll-wrap {
  max-height: 420px;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.65rem;
  background: rgba(2, 6, 23, 0.45);
}
.p1-resource-table {
  margin: 0;
  color: rgba(241, 245, 249, 0.95);
}
.p1-resource-table thead th {
  position: sticky;
  top: 0;
  z-index: 12;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(226, 232, 240, 0.92);
}
.p1-resource-table tbody td {
  background: rgba(15, 23, 42, 0.45);
  border-color: rgba(255, 255, 255, 0.10);
}

.insurance-table :deep(th),
.insurance-table :deep(td) {
  border-color: rgba(255, 255, 255, 0.08);
}

.construction-insurance-page :deep(.text-muted) {
  color: rgba(255, 255, 255, 0.62) !important;
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { toRepublicYear } from '@/utils/format'
import toastService from '@/components/bootstrap/ToastService.js'
import RelatedDocumentsModal, {
  type RelatedDocumentsAttachment
} from '@/components/related-documents/RelatedDocumentsModal.vue'
import {
  constructionInsuranceApi,
  type ConstructionInsurance,
  type ConstructionInsuranceScope
} from '@/api/constructionInsurance'

const props = withDefaults(defineProps<{
  fixedScope?: ConstructionInsuranceScope
  hideScopeSwitcher?: boolean
  pageTitle?: string
}>(), {
  hideScopeSwitcher: false,
  pageTitle: '工程保險',
})

const workspaceStore = useWorkspaceStore()
const { isSupervisory, isContractor } = useViewPerspective()

const constructionId = computed(() => workspaceStore.currentProject?.id || '')
const activeScope = ref<ConstructionInsuranceScope>('PROJECT')

watch(
  () => [isContractor.value, props.fixedScope] as const,
  () => {
    // 固定 scope（用於「各自頁面維護」）
    if (props.fixedScope) {
      activeScope.value = props.fixedScope
      return
    }
    // 營造端只允許 PROJECT
    if (isContractor.value) activeScope.value = 'PROJECT'
  },
  { immediate: true }
)

const pageTitle = computed(() => props.pageTitle || '工程保險')
const hideScopeSwitcher = computed(() => props.hideScopeSwitcher === true || !!props.fixedScope)
const activeScopeLabel = computed(() => {
  if (activeScope.value === 'PROJECT') return '工程案'
  return '監造公司（本案）'
})

const insurances = ref<ConstructionInsurance[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const refreshAll = async () => {
  const cid = constructionId.value
  if (!cid) return
  loading.value = true
  error.value = null
  try {
    const scope = activeScope.value
    insurances.value = await constructionInsuranceApi.list(cid, scope)
    await loadAttachmentCounts()
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? '載入失敗'
  } finally {
    loading.value = false
  }
}

watch([constructionId, activeScope], () => {
  if (constructionId.value) refreshAll()
})

onMounted(() => {
  if (constructionId.value) refreshAll()
})

const formatDate = (iso?: string | null) => {
  if (!iso) return '-'
  return iso.split('T')[0]
}

const formatDateRoc = (iso?: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.split('T')[0]
  const roc = toRepublicYear(d.getFullYear())
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${roc}/${m}/${day}`
}

// ---- attachments (per insurance) ----
const attachmentCounts = ref<Record<number, number>>({})
const showAttachmentModal = ref(false)
const currentAttachmentInsurance = ref<ConstructionInsurance | null>(null)
const currentAttachments = ref<RelatedDocumentsAttachment[]>([])
const isLoadingAttachments = ref(false)
const isUploadingInModal = ref(false)

const showPreviewModal = ref(false)
const previewUrl = ref('')
const previewFileName = ref('')
const isLoadingPreview = ref(false)

async function loadAttachmentCounts() {
  const cid = constructionId.value
  if (!cid) return
  const scope = activeScope.value
  const results = await Promise.all(
    insurances.value.map(async (it) => {
      try {
        const files = await constructionInsuranceApi.listFiles(cid, scope, it.id)
        return [it.id, files.length] as const
      } catch {
        return [it.id, 0] as const
      }
    })
  )
  const next: Record<number, number> = {}
  for (const [id, cnt] of results) next[id] = cnt
  attachmentCounts.value = next
}

async function openAttachments(it: ConstructionInsurance) {
  const cid = constructionId.value
  if (!cid) return
  currentAttachmentInsurance.value = it
  showAttachmentModal.value = true
  isLoadingAttachments.value = true
  currentAttachments.value = []
  try {
    const files = await constructionInsuranceApi.listFiles(cid, activeScope.value, it.id)
    currentAttachments.value = files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileSize: f.sizeBytes ?? 0,
    }))
    attachmentCounts.value = { ...attachmentCounts.value, [it.id]: currentAttachments.value.length }
  } finally {
    isLoadingAttachments.value = false
  }
}

async function handleModalUpload(files: FileList) {
  const cid = constructionId.value
  const it = currentAttachmentInsurance.value
  if (!cid || !it) return
  isUploadingInModal.value = true
  try {
    for (const f of Array.from(files)) {
      await constructionInsuranceApi.uploadFile(cid, activeScope.value, f, it.id)
    }
    const list = await constructionInsuranceApi.listFiles(cid, activeScope.value, it.id)
    currentAttachments.value = list.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileSize: f.sizeBytes ?? 0,
    }))
    attachmentCounts.value = { ...attachmentCounts.value, [it.id]: currentAttachments.value.length }
    toastService.success('上傳成功')
  } catch (e: any) {
    toastService.error(e?.response?.data?.message ?? e?.message ?? '上傳失敗')
  } finally {
    isUploadingInModal.value = false
  }
}

async function handlePreviewAttachment(att: RelatedDocumentsAttachment) {
  const cid = constructionId.value
  const it = currentAttachmentInsurance.value
  if (!cid || !it) return
  isLoadingPreview.value = true
  previewUrl.value = ''
  previewFileName.value = att.fileName
  showPreviewModal.value = true
  try {
    const list = await constructionInsuranceApi.listFiles(cid, activeScope.value, it.id)
    const target = list.find((x) => x.id === att.id)
    previewUrl.value = target?.signedUrl ?? ''
  } finally {
    isLoadingPreview.value = false
  }
}

async function handleDownloadAttachment(att: RelatedDocumentsAttachment) {
  const cid = constructionId.value
  const it = currentAttachmentInsurance.value
  if (!cid || !it) return
  const list = await constructionInsuranceApi.listFiles(cid, activeScope.value, it.id)
  const target = list.find((x) => x.id === att.id)
  if (!target?.signedUrl) return
  window.open(target.signedUrl, '_blank', 'noopener')
}

async function handleDeleteAttachment(att: RelatedDocumentsAttachment) {
  const cid = constructionId.value
  const it = currentAttachmentInsurance.value
  if (!cid || !it) return
  if (!confirm('確定要刪除這個附件嗎？')) return
  try {
    await constructionInsuranceApi.removeFile(cid, att.id)
    currentAttachments.value = currentAttachments.value.filter((a) => a.id !== att.id)
    attachmentCounts.value = { ...attachmentCounts.value, [it.id]: currentAttachments.value.length }
    toastService.success('刪除成功')
  } catch (e: any) {
    toastService.error(e?.response?.data?.message ?? e?.message ?? '刪除失敗')
  }
}

// ---- CRUD insurance ----
const showEditModal = ref(false)
const editingId = ref<number | null>(null)
const editForm = ref({
  policyNo: '',
  insuranceCompanyName: '',
  insuranceType: '',
  startDate: '',
  endDate: '',
  note: '',
})

const openCreate = () => {
  editingId.value = null
  editForm.value = { policyNo: '', insuranceCompanyName: '', insuranceType: '', startDate: '', endDate: '', note: '' }
  showEditModal.value = true
}

const openEdit = (it: ConstructionInsurance) => {
  editingId.value = it.id
  editForm.value = {
    policyNo: it.policyNo || '',
    insuranceCompanyName: it.insuranceCompanyName || '',
    insuranceType: it.insuranceType || '',
    startDate: formatDate(it.startDate),
    endDate: formatDate(it.endDate),
    note: it.note || '',
  }
  showEditModal.value = true
}

const saveEdit = async () => {
  const cid = constructionId.value
  if (!cid) return
  loading.value = true
  try {
    const req = {
      scope: activeScope.value,
      policyNo: editForm.value.policyNo || null,
      insuranceCompanyName: editForm.value.insuranceCompanyName || null,
      insuranceType: editForm.value.insuranceType || null,
      startDate: editForm.value.startDate ? `${editForm.value.startDate}T00:00:00` : null,
      endDate: editForm.value.endDate ? `${editForm.value.endDate}T00:00:00` : null,
      note: editForm.value.note || null,
    }
    if (editingId.value == null) {
      await constructionInsuranceApi.create(cid, req)
      toastService.success('新增成功')
    } else {
      await constructionInsuranceApi.update(cid, editingId.value, req)
      toastService.success('更新成功')
    }
    showEditModal.value = false
    await refreshAll()
  } catch (e: any) {
    toastService.error(e?.response?.data?.message ?? e?.message ?? '儲存失敗')
  } finally {
    loading.value = false
  }
}

const removeInsurance = async (it: ConstructionInsurance) => {
  const cid = constructionId.value
  if (!cid) return
  if (!confirm('確定要刪除這筆保險嗎？')) return
  loading.value = true
  try {
    await constructionInsuranceApi.remove(cid, it.id)
    toastService.success('刪除成功')
    await refreshAll()
  } catch (e: any) {
    toastService.error(e?.response?.data?.message ?? e?.message ?? '刪除失敗')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.construction-insurance-page {
  padding: 1rem;
}
</style>

