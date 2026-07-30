<template>
  <Modal
    :show="show"
    :title="`${planLabel} — 送審紀錄`"
    icon="fa fa-clipboard-list"
    size="xl"
    modalClass="psp-modal-dark"
    :draggable="true"
    :resizable="true"
    hide-footer
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <template #body>
      <div class="psp-dark">
        <!-- 載入中 -->
        <div v-if="loading" class="text-center py-5">
          <i class="fa fa-spinner fa-spin fa-2x mb-3 psp-muted"></i>
          <p class="psp-muted mb-0">載入中…</p>
        </div>

        <template v-else>
          <div class="table-responsive">
            <table class="psp-table">
              <thead>
                <tr>
                  <th class="psp-th-num">送審次數</th>
                  <th class="psp-th-doc">送審文號與日期</th>
                  <th class="psp-th-docs">審查結果公文</th>
                  <th class="psp-th-result">審查結果</th>
                  <th class="psp-th-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="record in records" :key="record.id">
                  <tr class="psp-row">
                    <!-- 送審次數 -->
                    <td class="psp-cell psp-cell-num">
                      <div class="psp-num-title">第 {{ record.submissionNumber }} 次</div>
                    </td>

                    <!-- 送審文號與日期（單一公文帶出） -->
                    <td
                      class="psp-cell psp-cell-doc"
                      @click="!record.submissionDocument && openPicker(record, 'SUBMISSION')"
                    >
                      <template v-if="record.submissionDocument">
                        <div class="psp-doc-linked">
                          <div class="psp-doc-name">
                            {{ docField(record.submissionDocument.documentId, 'documentNumber') || record.submissionDocument.documentName }}
                          </div>
                          <div v-if="docField(record.submissionDocument.documentId, 'issueDate')" class="psp-doc-date">
                            {{ docField(record.submissionDocument.documentId, 'issueDate') }}
                          </div>
                          <button
                            class="btn btn-sm psp-doc-unlink"
                            title="取消關聯"
                            @click.stop="doUnlink(record, record.submissionDocument.referenceId)"
                          >
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </template>
                      <template v-else>
                        <div class="psp-doc-empty">
                          <i class="fa fa-plus-circle me-1"></i>點擊選擇或新增公文
                        </div>
                      </template>
                    </td>

                    <!-- 審查結果公文（可多份） -->
                    <td class="psp-cell psp-cell-docs">
                      <div
                        v-for="docRef in record.reviewDocuments"
                        :key="docRef.referenceId"
                        class="psp-doc-linked psp-doc-linked-multi"
                      >
                        <div class="psp-doc-name">
                          {{ docField(docRef.documentId, 'documentNumber') || docRef.documentName }}
                        </div>
                        <div v-if="docField(docRef.documentId, 'issueDate')" class="psp-doc-date">
                          {{ docField(docRef.documentId, 'issueDate') }}
                        </div>
                        <button
                          class="btn btn-sm psp-doc-unlink"
                          title="取消關聯"
                          @click.stop="doUnlink(record, docRef.referenceId)"
                        >
                          <i class="fa fa-times"></i>
                        </button>
                      </div>
                      <div class="psp-doc-empty psp-doc-empty-add" @click="openPicker(record, 'REVIEW')">
                        <i class="fa fa-plus-circle me-1"></i>{{ record.reviewDocuments.length > 0 ? '新增更多公文' : '點擊選擇或新增公文' }}
                      </div>
                    </td>

                    <!-- 審查結果 -->
                    <td class="psp-cell psp-cell-result">
                      <select
                        class="form-select form-select-sm psp-result-select"
                        :value="record.reviewResult ?? ''"
                        :disabled="!!savingResultByRecord[record.id]"
                        @change="onReviewResultChange(record, ($event.target as HTMLSelectElement).value)"
                      >
                        <option value="">－（審查中）</option>
                        <option v-for="opt in REVIEW_RESULT_OPTIONS" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </option>
                      </select>
                    </td>

                    <!-- 操作 -->
                    <td class="psp-cell psp-cell-actions">
                      <button
                        class="psp-action-btn"
                        :disabled="!!uploadingByRecord[record.id]"
                        @click="triggerUpload(record)"
                      >
                        <i :class="uploadingByRecord[record.id] ? 'fa fa-spinner fa-spin' : 'fa fa-upload'"></i>
                        上傳檔案
                      </button>
                      <button class="psp-action-btn" @click="goExplorer(record)">
                        <i class="fa fa-folder-open"></i>
                        預覽關聯檔案
                      </button>
                      <button
                        v-if="record.attachments.length > 0"
                        class="psp-action-btn psp-action-btn-ghost"
                        @click="toggleAttachments(record.id)"
                      >
                        <i :class="expandedAttachments.has(record.id) ? 'fa fa-chevron-up' : 'fa fa-paperclip'"></i>
                        附件 {{ record.attachments.length }} 個
                      </button>
                      <button class="psp-action-btn psp-action-btn-danger" @click="confirmDelete(record)">
                        <i class="fa fa-trash"></i>
                        刪除
                      </button>
                    </td>
                  </tr>

                  <!-- 附件列（展開時顯示） -->
                  <tr v-if="expandedAttachments.has(record.id)" class="psp-attachment-row">
                    <td class="psp-cell" colspan="5">
                      <div class="psp-attachment-list">
                        <div v-for="att in record.attachments" :key="att.id" class="psp-attachment-chip">
                          <i class="fa fa-file me-1"></i>
                          <span class="psp-attachment-name" :title="att.fileName">{{ att.fileName }}</span>
                          <span class="psp-attachment-size">{{ formatSize(att.fileSize) }}</span>
                          <button
                            class="psp-attachment-remove"
                            title="刪除附件"
                            @click="deleteAttachment(record, att)"
                          >
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr v-if="records.length === 0">
                  <td class="psp-cell text-center psp-muted py-4" colspan="5">尚無送審紀錄</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 新增次數按鈕 -->
          <div class="psp-add-row" @click="doAdd">
            <i class="fa fa-plus me-2"></i>新增第 {{ records.length + 1 }} 次送審
          </div>
        </template>

        <input ref="uploadInputRef" type="file" multiple class="d-none" @change="onUploadFiles" />
      </div>
    </template>
  </Modal>

  <!-- 公文選擇器（共用組件） -->
  <DocumentPicker
    :show="showPicker"
    :title="pickerRole === 'SUBMISSION' ? '送審文號與日期 — 選擇或新增公文' : '審查結果公文 — 選擇或新增公文'"
    :constructionId="constructionId"
    :darkMode="true"
    :showNameInput="true"
    @update:show="(v: boolean) => { if (!v) showPicker = false }"
    @select="onDocumentPicked"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import Modal from '@/components/bootstrap/Modal.vue'
import DocumentPicker from '@/components/document/DocumentPicker.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import {
  getPlanSubmissionPRecords,
  createPlanSubmissionPRecord,
  updatePlanSubmissionPReviewResult,
  deletePlanSubmissionPRecord,
  linkPlanSubmissionPDocument,
  unlinkPlanSubmissionPDocument,
  uploadPlanSubmissionPAttachments,
  deletePlanSubmissionPAttachment,
  REVIEW_RESULT_OPTIONS,
  type PlanSubmissionPRecord,
  type PlanSubmissionPAttachment
} from '@/api/planSubmissionP'
import { getDocumentCenterList, type DocumentCenterListItem } from '@/api/documentCenter'

const props = defineProps<{
  show: boolean
  /** P1 / P2 / P3 */
  planType: string
  /** 例：P-2 整體品質計劃 */
  planLabel: string
  contextRecordId?: number
}>()

const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')

const records = ref<PlanSubmissionPRecord[]>([])
const loading = ref(false)
const savingResultByRecord = ref<Record<number, boolean>>({})
const uploadingByRecord = ref<Record<number, boolean>>({})
const expandedAttachments = ref<Set<number>>(new Set())

/* ---------------------------- 載入 ---------------------------- */

async function loadRecords() {
  if (!constructionId.value) return
  loading.value = true
  try {
    const [list] = await Promise.all([
      getPlanSubmissionPRecords(constructionId.value, props.planType, props.contextRecordId),
      refreshDocCache()
    ])
    records.value = list
  } catch (e) {
    console.error('[PlanSubmissionP] 載入失敗', e)
    records.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  (visible) => {
    if (visible) loadRecords()
  }
)

/* ---------------------------- 公文快取（顯示文號/日期） ---------------------------- */

const docCache = ref<Map<number, DocumentCenterListItem>>(new Map())

function docField(docId: number, field: keyof DocumentCenterListItem): string {
  const item = docCache.value.get(docId)
  if (!item) return ''
  const value = String(item[field] || '')
  return field === 'issueDate' ? formatToRepublicDate(value) : value
}

/** 西元 ISO 日期（YYYY-MM-DD）→ 民國年顯示（113.01.04）；非 ISO 格式（如已是民國文字）原樣顯示 */
function formatToRepublicDate(isoDate: string): string {
  const dateOnly = isoDate.trim().split('T')[0]
  const m = dateOnly.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return isoDate
  const rocYear = Number(m[1]) - 1911
  if (rocYear <= 0) return isoDate
  return `${rocYear}.${m[2].padStart(2, '0')}.${m[3].padStart(2, '0')}`
}

async function refreshDocCache() {
  if (!constructionId.value) return
  try {
    const list = await getDocumentCenterList(constructionId.value)
    const map = new Map<number, DocumentCenterListItem>()
    for (const item of list) map.set(item.id, item)
    docCache.value = map
  } catch {
    /* ignore */
  }
}

/* ---------------------------- 紀錄操作 ---------------------------- */

async function doAdd() {
  try {
    await createPlanSubmissionPRecord(
      constructionId.value,
      props.planType,
      props.contextRecordId,
    )
    await loadRecords()
  } catch (e) {
    console.error('[PlanSubmissionP] 新增失敗', e)
    toastService.error(extractErrorMessage(e) || '新增失敗，請稍後再試')
  }
}

async function confirmDelete(record: PlanSubmissionPRecord) {
  const message = `確定刪除「第 ${record.submissionNumber} 次送審」？\n附件將一併刪除；公文本身不會被刪除，僅移除關聯。`
  if (!window.confirm(message)) return
  try {
    await deletePlanSubmissionPRecord(constructionId.value, record.id)
    toastService.success('已刪除送審紀錄')
    await loadRecords()
  } catch (e) {
    console.error('[PlanSubmissionP] 刪除失敗', e)
    toastService.error(extractErrorMessage(e) || '刪除失敗，請稍後再試')
  }
}

async function onReviewResultChange(record: PlanSubmissionPRecord, value: string) {
  savingResultByRecord.value[record.id] = true
  try {
    await updatePlanSubmissionPReviewResult(constructionId.value, record.id, value || null)
    const idx = records.value.findIndex((r) => r.id === record.id)
    if (idx !== -1) records.value[idx] = { ...records.value[idx], reviewResult: value || null }
  } catch (e) {
    console.error('[PlanSubmissionP] 更新審查結果失敗', e)
    toastService.error(extractErrorMessage(e) || '更新失敗，請稍後再試')
    await loadRecords()
  } finally {
    savingResultByRecord.value[record.id] = false
  }
}

/* ---------------------------- 公文關聯 ---------------------------- */

const showPicker = ref(false)
const pickerRole = ref<'SUBMISSION' | 'REVIEW'>('SUBMISSION')
const pickerRecordId = ref(0)

function openPicker(record: PlanSubmissionPRecord, role: 'SUBMISSION' | 'REVIEW') {
  pickerRecordId.value = record.id
  pickerRole.value = role
  showPicker.value = true
}

async function onDocumentPicked(payload: { document: DocumentCenterListItem; documentName: string }) {
  try {
    await linkPlanSubmissionPDocument(constructionId.value, pickerRecordId.value, {
      documentId: payload.document.id,
      role: pickerRole.value,
      documentName: payload.documentName || payload.document.subject || payload.document.fileName || ''
    })
    showPicker.value = false
    await loadRecords()
  } catch (e) {
    console.error('[PlanSubmissionP] 關聯失敗', e)
    toastService.error(extractErrorMessage(e) || '關聯失敗，請稍後再試')
  }
}

async function doUnlink(record: PlanSubmissionPRecord, referenceId: number) {
  if (!window.confirm('確定取消此公文的關聯？（公文本身不會被刪除）')) return
  try {
    await unlinkPlanSubmissionPDocument(constructionId.value, record.id, referenceId)
    await loadRecords()
  } catch (e) {
    console.error('[PlanSubmissionP] 取消關聯失敗', e)
    toastService.error(extractErrorMessage(e) || '取消關聯失敗，請稍後再試')
  }
}

/* ---------------------------- 附件 ---------------------------- */

const uploadInputRef = ref<HTMLInputElement | null>(null)
const uploadRecordId = ref(0)

function triggerUpload(record: PlanSubmissionPRecord) {
  uploadRecordId.value = record.id
  uploadInputRef.value?.click()
}

async function onUploadFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const recordId = uploadRecordId.value
  if (files.length === 0 || !recordId) return
  uploadingByRecord.value[recordId] = true
  try {
    await uploadPlanSubmissionPAttachments(constructionId.value, recordId, files)
    toastService.success(`已上傳 ${files.length} 個檔案`)
    expandedAttachments.value.add(recordId)
    await loadRecords()
  } catch (e) {
    console.error('[PlanSubmissionP] 上傳失敗', e)
    toastService.error(extractErrorMessage(e) || '上傳失敗，請稍後再試')
  } finally {
    uploadingByRecord.value[recordId] = false
  }
}

async function deleteAttachment(record: PlanSubmissionPRecord, att: PlanSubmissionPAttachment) {
  if (!window.confirm(`確定刪除附件「${att.fileName}」？`)) return
  try {
    await deletePlanSubmissionPAttachment(constructionId.value, record.id, att.id)
    toastService.success('附件已刪除')
    await loadRecords()
  } catch (e) {
    console.error('[PlanSubmissionP] 刪除附件失敗', e)
    toastService.error(extractErrorMessage(e) || '刪除失敗，請稍後再試')
  }
}

function toggleAttachments(recordId: number) {
  if (expandedAttachments.value.has(recordId)) expandedAttachments.value.delete(recordId)
  else expandedAttachments.value.add(recordId)
}

/* ---------------------------- 檔案總管 ---------------------------- */

function goExplorer(record: PlanSubmissionPRecord) {
  emit('update:show', false)
  router.push({
    path: '/file-explorer',
    query: {
      sourceType: `PLAN_SUBMISSION_${props.planType.toUpperCase()}`,
      sourceId: String(record.id)
    }
  })
}

/* ---------------------------- 工具 ---------------------------- */

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extractErrorMessage(e: unknown): string {
  const resp = (e as { response?: { data?: { message?: string } } })?.response
  return resp?.data?.message ?? ''
}
</script>

<style scoped>
/* ===== 暗色主題（與 B-1 送審紀錄一致的色系） ===== */
.psp-dark {
  --psp-card: #25282c;
  --psp-border: #4a4d54;
  --psp-text: #e4e6eb;
  --psp-muted: #b0b3b8;
  --psp-thead: #2d3748;
  --psp-hover: rgba(255, 255, 255, 0.06);
  --psp-accent: #60a5fa;
  --psp-accent-dim: rgba(96, 165, 250, 0.12);
  --psp-danger: #f87171;
  --psp-input-bg: #2d3139;
  --psp-input-border: #3a3d42;
  color: var(--psp-text);
}

.psp-muted { color: var(--psp-muted); }

/* ===== 表格 ===== */
.psp-table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid var(--psp-border);
}

.psp-table thead th {
  background: var(--psp-thead);
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  padding: 0.75rem;
  border: 1.5px solid var(--psp-border);
  color: var(--psp-muted);
}

.psp-th-num { width: 100px; }
.psp-th-doc { width: 24%; }
.psp-th-docs { width: 30%; }
.psp-th-result { width: 150px; }
.psp-th-actions { width: 150px; }

.psp-cell {
  border: 1.5px solid var(--psp-border);
  padding: 0.75rem;
  vertical-align: middle;
}

.psp-cell-num {
  text-align: center;
}

.psp-num-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--psp-text);
}

/* ===== 公文儲存格 ===== */
.psp-cell-doc {
  cursor: pointer;
  transition: background 0.15s;
}

.psp-cell-doc:hover {
  background: var(--psp-hover);
}

.psp-doc-linked {
  position: relative;
  padding-right: 2.5rem;
}

.psp-doc-linked-multi + .psp-doc-linked-multi {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--psp-border);
}

.psp-doc-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--psp-accent);
  margin-bottom: 0.15rem;
  word-break: break-all;
}

.psp-doc-date {
  font-size: 0.8rem;
  color: var(--psp-muted);
}

.psp-doc-unlink {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.2rem 0.4rem;
  font-size: 0.75rem;
  color: var(--psp-danger);
  border: 1px solid rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.1);
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s;
}

.psp-cell:hover .psp-doc-unlink {
  opacity: 1;
}

.psp-doc-unlink:hover {
  color: #fff;
  background: var(--psp-danger);
  border-color: var(--psp-danger);
}

.psp-doc-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  color: var(--psp-muted);
  font-size: 0.85rem;
  border: 2px dashed var(--psp-border);
  border-radius: 6px;
  transition: all 0.15s;
  padding: 0.75rem;
}

.psp-cell-doc:hover .psp-doc-empty,
.psp-doc-empty-add:hover {
  color: var(--psp-accent);
  border-color: var(--psp-accent);
  background: var(--psp-accent-dim);
}

.psp-doc-empty-add {
  cursor: pointer;
  min-height: 40px;
  padding: 0.4rem;
  font-size: 0.8rem;
}

.psp-doc-linked-multi ~ .psp-doc-empty-add,
.psp-doc-linked + .psp-doc-empty-add {
  margin-top: 0.5rem;
}

/* ===== 審查結果 ===== */
.psp-result-select {
  background-color: var(--psp-input-bg);
  border: 1px solid var(--psp-input-border);
  color: var(--psp-text);
  font-size: 0.85rem;
}

.psp-result-select option {
  background-color: var(--psp-input-bg);
  color: var(--psp-text);
}

.psp-result-select:focus {
  border-color: var(--psp-accent);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

.psp-result-select:disabled {
  opacity: 0.7;
}

/* ===== 操作 ===== */
.psp-cell-actions {
  text-align: center;
}

.psp-action-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  width: 100%;
  padding: 0.3rem 0.6rem;
  margin-bottom: 0.3rem;
  background: transparent;
  border: 1px solid var(--psp-border);
  border-radius: 5px;
  color: var(--psp-text);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.psp-action-btn:last-child {
  margin-bottom: 0;
}

.psp-action-btn:hover:not(:disabled) {
  background: var(--psp-hover);
  border-color: var(--psp-accent);
}

.psp-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.psp-action-btn i {
  color: var(--psp-accent);
  width: 14px;
  text-align: center;
}

.psp-action-btn-ghost {
  border-style: dashed;
  color: var(--psp-muted);
}

.psp-action-btn-danger {
  color: var(--psp-danger);
}

.psp-action-btn-danger i {
  color: var(--psp-danger);
}

.psp-action-btn-danger:hover {
  background: rgba(248, 113, 113, 0.1) !important;
  border-color: var(--psp-danger) !important;
}

/* ===== 附件列 ===== */
.psp-attachment-row {
  background: rgba(255, 255, 255, 0.02);
}

.psp-attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.psp-attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  background: var(--psp-input-bg);
  border: 1px solid var(--psp-input-border);
  border-radius: 6px;
  font-size: 0.8rem;
  max-width: 320px;
}

.psp-attachment-chip > i {
  color: var(--psp-accent);
}

.psp-attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.psp-attachment-size {
  color: var(--psp-muted);
  font-size: 0.72rem;
  flex-shrink: 0;
}

.psp-attachment-remove {
  background: transparent;
  border: none;
  color: var(--psp-muted);
  padding: 0 0.15rem;
  cursor: pointer;
  flex-shrink: 0;
}

.psp-attachment-remove:hover {
  color: var(--psp-danger);
}

/* ===== 新增次數按鈕列 ===== */
.psp-add-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem;
  font-size: 0.9rem;
  color: var(--psp-accent);
  cursor: pointer;
  border: 2px dashed var(--psp-border);
  border-top: none;
  transition: background 0.15s, color 0.15s;
}

.psp-add-row:hover {
  background: var(--psp-accent-dim);
  color: #93c5fd;
}

</style>

<!-- Modal 經 Teleport 掛到 body，皮膚規則需為全域 -->
<style>
.psp-modal-dark .modal-content {
  background: #25282c;
  border: 1px solid #3a3d42;
  color: #e4e6eb;
}

.psp-modal-dark .modal-header {
  border-bottom-color: #3a3d42;
  color: #e4e6eb;
}

.psp-modal-dark .modal-title {
  color: #e4e6eb;
}

.psp-modal-dark .btn-close {
  filter: invert(1);
}
</style>
