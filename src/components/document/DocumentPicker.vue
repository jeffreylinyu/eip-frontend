<template>
  <Modal
    :show="show"
    :title="title"
    icon="fa fa-file-lines"
    size="lg"
    :modalClass="darkMode ? 'doc-picker-modal-dark' : ''"
    :elevateZIndex="true"
    @update:show="(v: boolean) => { if (!v) close() }"
  >
    <template #body>
      <!-- Tab 切換（hideSelectTab 時隱藏，直接顯示上傳） -->
      <ul v-if="!hideSelectTab" class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: tab === 'select' }" @click="tab = 'select'">
            <i class="fa fa-search me-1"></i>選擇現有公文
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: tab === 'upload' }" @click="tab = 'upload'">
            <i class="fa fa-upload me-1"></i>上傳新公文
          </button>
        </li>
      </ul>

      <!-- Tab: 選擇現有公文 -->
      <div v-if="tab === 'select'">
        <div v-if="showNameInput" class="mb-3">
          <label class="form-label fw-bold">公文名稱（快照顯示用）</label>
          <input v-model="documentName" type="text" class="form-control" placeholder="例：監造計畫送審函" />
        </div>
        <div class="mb-3">
          <input v-model="searchKeyword" type="text" class="form-control" placeholder="搜尋：主旨 / 發文者 / 檔名" />
        </div>
        <div class="list-group doc-picker-list">
          <div v-if="docListLoading" class="list-group-item text-center text-muted py-4">
            <i class="fa fa-spinner fa-spin me-1"></i>載入中…
          </div>
          <div v-else-if="filteredDocList.length === 0" class="list-group-item text-center text-muted py-4">
            公文中心尚無公文，請切換到「上傳新公文」
          </div>
          <button
            v-for="doc in filteredDocList"
            :key="doc.id"
            type="button"
            class="list-group-item list-group-item-action"
            :class="{ active: selectedDocId === doc.id }"
            @click="selectDoc(doc)"
          >
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-bold small">{{ doc.subject || doc.fileName }}</div>
                <div class="text-muted small">
                  {{ doc.sender || '－' }} → {{ doc.recipient || '－' }}
                  <span v-if="doc.issueDate" class="ms-2">{{ doc.issueDate }}</span>
                  <span v-if="doc.documentNumber" class="ms-2">{{ doc.documentNumber }}</span>
                </div>
              </div>
              <i v-if="selectedDocId === doc.id" class="fa fa-check-circle text-primary fs-5"></i>
            </div>
          </button>
        </div>
      </div>

      <!-- Tab: 上傳新公文 -->
      <div v-if="tab === 'upload'">
        <!-- Step 1: 選檔（樣式比照標單匯入拖放區） -->
        <template v-if="uploadStep === 'file'">
          <div class="mb-3">
            <label class="form-label fw-semibold">選擇檔案（PDF / 圖片）</label>
            <input
              ref="uploadFileRef"
              type="file"
              class="form-control d-none"
              accept=".pdf,image/*"
              @change="onUploadFileChange"
            />
            <div
              class="doc-import-dropzone border rounded-3 p-4 text-center user-select-none"
              :class="{
                'doc-import-dropzone--active': uploadDragDepth > 0,
                'doc-import-dropzone--has-file': !!uploadFile
              }"
              role="button"
              tabindex="0"
              @click="triggerUploadFileInput"
              @keydown.enter.prevent="triggerUploadFileInput"
              @keydown.space.prevent="triggerUploadFileInput"
              @dragenter.prevent="onUploadDragEnter"
              @dragleave.prevent="onUploadDragLeave"
              @dragover.prevent="onUploadDragOver"
              @drop.prevent="onUploadDrop"
            >
              <template v-if="uploadFile">
                <i class="fa fa-check-circle doc-import-file-check d-block mb-2" aria-hidden="true"></i>
                <span class="doc-import-ready-badge">已選擇檔案</span>
                <div class="doc-import-filename text-break mt-2 mb-1">
                  <i class="fa fa-file-alt me-2" aria-hidden="true"></i>{{ uploadFile.name }}
                </div>
                <div class="doc-import-filemeta">{{ formatImportFileSize(uploadFile.size) }}</div>
                <p class="doc-import-replace-hint mb-0 mt-3 small">點此區域或拖放其他檔案可更換</p>
              </template>
              <template v-else>
                <i class="fa fa-file-pdf fa-2x mb-2 d-block text-secondary" aria-hidden="true"></i>
                <p class="mb-1 fw-medium">將 PDF 或圖片拖放到此處，或按一下選擇檔案</p>
                <p class="mb-0 small text-muted">支援 PDF 與常見圖片格式</p>
              </template>
            </div>
          </div>
        </template>

        <!-- Step 2: 確認欄位 -->
        <template v-if="uploadStep === 'confirm'">
          <p class="text-muted small mb-2">請確認辨識結果，可編輯後再儲存。</p>
          <div class="row g-2 mb-2">
            <div class="col-md-6">
              <label class="form-label small fw-bold">類別</label>
              <select v-model="uploadForm.documentCategory" class="form-select form-select-sm">
                <option value="">—</option>
                <option v-for="opt in DOCUMENT_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
          <div class="row g-2 mb-2">
            <div class="col-md-6">
              <label class="form-label small fw-bold">發文者</label>
              <input v-model="uploadForm.sender" type="text" class="form-control form-control-sm" />
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-bold">受文者</label>
              <input v-model="uploadForm.recipient" type="text" class="form-control form-control-sm" />
            </div>
          </div>
          <div class="mb-2">
            <label class="form-label small fw-bold">主旨</label>
            <textarea v-model="uploadForm.subject" class="form-control form-control-sm" rows="2"></textarea>
          </div>
          <div class="row g-2 mb-2">
            <div class="col-md-6">
              <label class="form-label small fw-bold">發文日期</label>
              <RepublicDatePicker
                v-model="uploadForm.issueDate"
                inputClass="form-control form-control-sm"
                :useRepublicYear="true"
                :hideIcon="true"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-bold">發文字號</label>
              <input v-model="uploadForm.documentNumber" type="text" class="form-control form-control-sm" placeholder="發文字號" />
            </div>
          </div>
          <div class="mb-2">
            <label class="form-label small fw-bold">正本</label>
            <textarea v-model="uploadForm.originalCopy" class="form-control form-control-sm" rows="1"></textarea>
          </div>
          <div class="mb-2">
            <label class="form-label small fw-bold">副本</label>
            <textarea v-model="uploadForm.carbonCopy" class="form-control form-control-sm" rows="1"></textarea>
          </div>
          <div v-if="showNameInput" class="mb-3">
            <label class="form-label small fw-bold">公文名稱（快照顯示用）</label>
            <input v-model="documentName" type="text" class="form-control form-control-sm" placeholder="例：監造計畫送審函" />
          </div>
          <!-- OCR 原始文字 -->
          <details v-if="uploadRawText" class="mt-2" open>
            <summary class="text-muted small" style="cursor: pointer;">OCR 原始文字</summary>
            <pre class="mt-1 p-2 small" style="max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; background: rgba(0,0,0,0.15); border-radius: 4px; color: #fff;">{{ uploadRawText }}</pre>
          </details>
        </template>
      </div>

      <div v-if="error" class="alert alert-danger mt-3 mb-0">{{ error }}</div>
    </template>
    <template #footer>
      <!-- 上傳 Tab - Step 1: 選檔按鈕 -->
      <template v-if="tab === 'upload' && uploadStep === 'file'">
        <button type="button" class="btn btn-outline-secondary" @click="close">取消</button>
        <button
          type="button"
          class="btn btn-success"
          :disabled="!uploadFile || uploadExtracting"
          @click="doUploadExtract"
        >
          <span v-if="uploadExtracting" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="fa fa-robot me-2"></i>
          {{ uploadExtracting ? '辨識中，請稍候...' : '上傳並辨識' }}
        </button>
      </template>
      <!-- 上傳 Tab - Step 2: 確認儲存按鈕 -->
      <template v-else-if="tab === 'upload' && uploadStep === 'confirm'">
        <button type="button" class="btn btn-outline-secondary" @click="uploadStep = 'file'">上一步</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="uploadSaving || (showNameInput && !documentName.trim())"
          @click="doUploadSaveAndSelect"
        >
          <i v-if="uploadSaving" class="fa fa-spinner fa-spin me-1"></i>
          {{ hideSelectTab ? '確認儲存' : '儲存公文並選取' }}
        </button>
      </template>
      <!-- 選擇 Tab -->
      <template v-else>
        <button type="button" class="btn btn-outline-secondary" @click="close">取消</button>
        <button
          v-if="!hideSelectTab"
          type="button"
          class="btn btn-primary"
          :disabled="saving || !selectedDocId || (showNameInput && !documentName.trim())"
          @click="confirmSelect"
        >
          <i v-if="saving" class="fa fa-spinner fa-spin me-1"></i>
          確認選取
        </button>
      </template>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import {
  getDocumentCenterList,
  importExtract,
  saveDocument,
  DOCUMENT_CATEGORY_OPTIONS,
  type DocumentCenterListItem,
  type OfficialDocumentExtractDto
} from '@/api/documentCenter'

interface Props {
  /** 控制 Modal 開關 */
  show: boolean
  /** Modal 標題 */
  title?: string
  /** 工程案 ID（必須） */
  constructionId: string
  /** 暗色模式 */
  darkMode?: boolean
  /** 是否顯示公文名稱輸入框（用於需要 documentName 的場景） */
  showNameInput?: boolean
  /** 隱藏「選擇現有公文」Tab，僅顯示上傳功能 */
  hideSelectTab?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '選擇或新增公文',
  darkMode: true,
  showNameInput: false,
  hideSelectTab: false
})

const emit = defineEmits<{
  /** 關閉 Modal */
  'update:show': [value: boolean]
  /** 使用者選取公文後（選擇現有或上傳新的都走這裡） */
  'select': [payload: {
    document: DocumentCenterListItem
    documentName: string
  }]
}>()

// ── 狀態 ──
const tab = ref<'select' | 'upload'>('select')
const documentName = ref('')
const selectedDocId = ref<number | null>(null)
const selectedDoc = ref<DocumentCenterListItem | null>(null)
const saving = ref(false)
const error = ref('')
const searchKeyword = ref('')
const docList = ref<DocumentCenterListItem[]>([])
const docListLoading = ref(false)

// Upload state
const uploadStep = ref<'file' | 'confirm'>('file')
const uploadFileRef = ref<HTMLInputElement | null>(null)
const uploadFile = ref<File | null>(null)
const uploadDragDepth = ref(0)
const uploadExtracting = ref(false)
const uploadSaving = ref(false)
const uploadRawText = ref('')
const uploadForm = ref<OfficialDocumentExtractDto>({
  sender: '', recipient: '', subject: '', issueDate: '', documentNumber: '', originalCopy: '', carbonCopy: '', documentCategory: ''
})

// ── 過濾 ──
const filteredDocList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return docList.value
  return docList.value.filter((d) => {
    const hay = `${d.subject || ''} ${d.sender || ''} ${d.recipient || ''} ${d.fileName || ''} ${d.documentNumber || ''}`.toLowerCase()
    return hay.includes(kw)
  })
})

// ── 載入公文列表 ──
async function loadDocList() {
  if (!props.constructionId) return
  docListLoading.value = true
  try {
    docList.value = await getDocumentCenterList(props.constructionId)
  } catch {
    docList.value = []
  } finally {
    docListLoading.value = false
  }
}

// ── 選取公文 ──
function selectDoc(doc: DocumentCenterListItem) {
  selectedDocId.value = doc.id
  selectedDoc.value = doc
  if (props.showNameInput && !documentName.value.trim()) {
    documentName.value = doc.subject || doc.fileName || ''
  }
}

// ── 確認選取 ──
function confirmSelect() {
  if (!selectedDoc.value) return
  saving.value = true
  emit('select', {
    document: selectedDoc.value,
    documentName: documentName.value.trim()
  })
  saving.value = false
  close()
}

// ── 上傳相關 ──
function formatImportFileSize(bytes: number): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isAcceptableUploadFile(file: File): boolean {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.pdf')) return true
  const t = (file.type || '').toLowerCase()
  return t.startsWith('image/') || t === 'application/pdf'
}

function assignUploadFile(file: File | null) {
  if (!file) {
    uploadFile.value = null
    return
  }
  if (!isAcceptableUploadFile(file)) {
    error.value = '請選擇 PDF 或圖片檔案'
    uploadFile.value = null
    if (uploadFileRef.value) uploadFileRef.value.value = ''
    return
  }
  uploadFile.value = file
  error.value = ''
}

function triggerUploadFileInput() {
  if (uploadExtracting.value) return
  uploadFileRef.value?.click()
}

function onUploadDragEnter(e: DragEvent) {
  if (e.dataTransfer?.types?.includes('Files')) {
    uploadDragDepth.value += 1
  }
}

function onUploadDragLeave() {
  uploadDragDepth.value = Math.max(0, uploadDragDepth.value - 1)
}

function onUploadDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onUploadDrop(e: DragEvent) {
  uploadDragDepth.value = 0
  const files = e.dataTransfer?.files
  if (!files?.length) return
  assignUploadFile(files[0])
}

function onUploadFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    assignUploadFile(target.files[0])
  }
}

async function doUploadExtract() {
  const file = uploadFile.value
  if (!props.constructionId || !file) return
  uploadExtracting.value = true
  error.value = ''
  try {
    const result = await importExtract(props.constructionId, file)
    if (result) {
      uploadForm.value = { ...result.extracted }
      uploadRawText.value = result.rawText || ''
      documentName.value = result.extracted.subject || file.name
      uploadStep.value = 'confirm'
    } else {
      error.value = '辨識失敗'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? '辨識失敗'
  } finally {
    uploadExtracting.value = false
  }
}

async function doUploadSaveAndSelect() {
  const file = uploadFile.value
  if (!props.constructionId || !file) return
  uploadSaving.value = true
  error.value = ''
  try {
    const saved = await saveDocument(props.constructionId, file, uploadForm.value)
    if (!saved) {
      error.value = '儲存公文失敗'
      return
    }
    // 重新載入列表取得完整的 item
    await loadDocList()
    const savedDoc = docList.value.find(d => d.id === saved.id)
    if (savedDoc) {
      emit('select', {
        document: savedDoc,
        documentName: documentName.value.trim()
      })
    } else {
      // fallback：用有限資料組成
      emit('select', {
        document: {
          id: saved.id,
          fileName: saved.fileName || '',
          fileType: '',
          fileExt: '',
          fileSize: '',
          fileUrl: '',
          uploadedAt: saved.uploadedAt || '',
          uploader: '',
          sender: uploadForm.value.sender,
          recipient: uploadForm.value.recipient,
          subject: uploadForm.value.subject,
          issueDate: uploadForm.value.issueDate,
          documentNumber: uploadForm.value.documentNumber,
          originalCopy: uploadForm.value.originalCopy,
          carbonCopy: uploadForm.value.carbonCopy,
          documentCategory: uploadForm.value.documentCategory ?? '',
          usages: []
        },
        documentName: documentName.value.trim()
      })
    }
    close()
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
  } finally {
    uploadSaving.value = false
  }
}

// ── 關閉/重置 ──
function close() {
  emit('update:show', false)
  resetState()
}

function resetState() {
  tab.value = props.hideSelectTab ? 'upload' : 'select'
  documentName.value = ''
  selectedDocId.value = null
  selectedDoc.value = null
  searchKeyword.value = ''
  error.value = ''
  uploadStep.value = 'file'
  uploadFile.value = null
  uploadDragDepth.value = 0
  if (uploadFileRef.value) uploadFileRef.value.value = ''
  uploadExtracting.value = false
  uploadSaving.value = false
  uploadRawText.value = ''
  uploadForm.value = { sender: '', recipient: '', subject: '', issueDate: '', documentNumber: '', originalCopy: '', carbonCopy: '', documentCategory: '' }
}

// ── show 時自動載入列表 ──
watch(() => props.show, (newVal) => {
  if (newVal) {
    resetState()
    loadDocList()
  }
})
</script>

<style scoped>
.doc-picker-list {
  max-height: 300px;
  overflow-y: auto;
}

/* ===== 暗色模式 ===== */
:deep(.doc-picker-modal-dark .modal-content) {
  background: #25282c;
  border: 1px solid #3a3d42;
  color: #e4e6eb;
}

:deep(.doc-picker-modal-dark .modal-header) {
  border-bottom-color: #3a3d42;
  color: #e4e6eb;
}

:deep(.doc-picker-modal-dark .modal-footer) {
  border-top-color: #3a3d42;
}

:deep(.doc-picker-modal-dark .modal-title) {
  color: #e4e6eb;
}

:deep(.doc-picker-modal-dark .btn-close) {
  filter: invert(1) grayscale(100%) brightness(200%);
}

:deep(.doc-picker-modal-dark .nav-tabs) {
  border-bottom-color: #3a3d42;
}

:deep(.doc-picker-modal-dark .nav-tabs .nav-link) {
  color: #b0b3b8;
}

:deep(.doc-picker-modal-dark .nav-tabs .nav-link.active) {
  background: #25282c;
  border-color: #3a3d42 #3a3d42 #25282c;
  color: #60a5fa;
}

:deep(.doc-picker-modal-dark .nav-tabs .nav-link:hover:not(.active)) {
  color: #e4e6eb;
  border-color: transparent;
}

:deep(.doc-picker-modal-dark .form-control),
:deep(.doc-picker-modal-dark .form-control-sm) {
  background: #2d3139;
  border-color: #3a3d42;
  color: #e4e6eb;
}

:deep(.doc-picker-modal-dark .form-control:focus),
:deep(.doc-picker-modal-dark .form-control-sm:focus) {
  background: #2d3139;
  border-color: #60a5fa;
  color: #e4e6eb;
  box-shadow: 0 0 0 0.15rem rgba(96, 165, 250, 0.25);
}

:deep(.doc-picker-modal-dark .form-label) {
  color: #b0b3b8;
}

:deep(.doc-picker-modal-dark .list-group-item) {
  background: #2d3139;
  border-color: #3a3d42;
  color: #e4e6eb;
}

:deep(.doc-picker-modal-dark .list-group-item:hover),
:deep(.doc-picker-modal-dark .list-group-item-action:hover) {
  background: rgba(255, 255, 255, 0.06);
}

:deep(.doc-picker-modal-dark .list-group-item.active) {
  background: rgba(96, 165, 250, 0.12);
  border-color: #60a5fa;
  color: #60a5fa;
}

:deep(.doc-picker-modal-dark .list-group-item.active .text-muted) {
  color: #b0b3b8 !important;
}

:deep(.doc-picker-modal-dark .btn-outline-secondary) {
  color: #b0b3b8;
  border-color: #3a3d42;
}

:deep(.doc-picker-modal-dark .btn-outline-secondary:hover) {
  color: #e4e6eb;
  background: rgba(255, 255, 255, 0.06);
  border-color: #b0b3b8;
}

:deep(.doc-picker-modal-dark .alert-danger) {
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.25);
  color: #fca5a5;
}

.doc-import-dropzone {
  cursor: pointer;
  background-color: rgba(15, 23, 42, 0.35);
  border-color: #64748b !important;
  border-style: dashed !important;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}
.doc-import-dropzone:hover {
  border-color: #94a3b8 !important;
  background-color: rgba(30, 41, 59, 0.45);
}
.doc-import-dropzone--active {
  border-color: #38bdf8 !important;
  background-color: rgba(14, 165, 233, 0.12);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.35);
}
.doc-import-dropzone--has-file:not(.doc-import-dropzone--active) {
  border-style: solid !important;
  border-width: 2px !important;
  border-color: #22c55e !important;
  background: linear-gradient(165deg, rgba(34, 197, 94, 0.22) 0%, rgba(15, 23, 42, 0.92) 55%);
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.45), 0 8px 24px rgba(34, 197, 94, 0.12);
}
.doc-import-dropzone--has-file:not(.doc-import-dropzone--active):hover {
  border-color: #4ade80 !important;
  box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.55), 0 10px 28px rgba(34, 197, 94, 0.18);
}
.doc-import-file-check {
  font-size: 2.75rem;
  color: #4ade80;
  line-height: 1;
  filter: drop-shadow(0 0 10px rgba(74, 222, 128, 0.45));
}
.doc-import-ready-badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #052e16;
  background: linear-gradient(180deg, #86efac 0%, #4ade80 100%);
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.35);
}
.doc-import-filename {
  font-size: 1.15rem;
  font-weight: 700;
  color: #ecfdf5;
  line-height: 1.35;
  word-break: break-word;
}
.doc-import-filemeta {
  font-size: 0.9rem;
  color: #a7f3d0;
  font-weight: 600;
}
.doc-import-replace-hint {
  color: #94a3b8;
}
</style>
