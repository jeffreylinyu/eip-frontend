<template>
  <div class="document-shelf-page a4-dark">
    <PageHeader
      v-if="!hidePageHeader"
      :title="pageTitle"
      icon="fa fa-folder-open"
      :breadcrumbs="pageBreadcrumbs"
    />

    <Card>
      <CardBody>
        <div class="alert alert-info mb-4">
          <h5 class="alert-heading">
            <i class="fa fa-info-circle me-2"></i>說明
          </h5>
          <p class="mb-0">{{ shelfConfig.description }}</p>
        </div>

        <!-- A-6：監造帳號可切換工程端／監造端（與 A-5 一致） -->
        <div v-if="isA6Shelf && isSupervisoryUser && !isContractorRoute" class="mb-4">
          <ul class="nav nav-tabs shelf-tabs">
            <li class="nav-item">
              <a
                class="nav-link"
                :class="{ active: activeTab === 'SUPERVISORY' }"
                href="javascript:;"
                @click="switchTab('SUPERVISORY')"
              >
                <i class="fa fa-hard-hat me-1"></i>工程端
              </a>
            </li>
            <li class="nav-item">
              <a
                class="nav-link"
                :class="{ active: activeTab === 'SUPERVISION_COMPANY' }"
                href="javascript:;"
                @click="switchTab('SUPERVISION_COMPANY')"
              >
                <i class="fa fa-building me-1"></i>監造端
              </a>
            </li>
          </ul>
        </div>

        <div v-if="!constructionId" class="alert alert-warning mb-0">
          <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案。
        </div>

        <template v-else>
          <div v-if="isLoading" class="text-center py-4">
            <span class="spinner-border spinner-border-sm me-2"></span>載入中...
          </div>

          <div v-else class="document-shelf-content">
            <div class="d-flex justify-content-between align-items-center gap-3 mb-3 flex-wrap">
              <div></div>
              <button
                type="button"
                class="btn btn-sm btn-primary"
                :disabled="isCreating"
                @click="addRecord"
              >
                <i v-if="isCreating" class="fa fa-spinner fa-spin me-1"></i>
                <i v-else class="fa fa-plus me-1"></i>
                新增紀錄
              </button>
            </div>

            <div v-if="records.length === 0" class="text-center py-4 text-muted border rounded">
              <i class="fa fa-inbox fa-2x mb-2 d-block"></i>
              尚無紀錄
              <div class="small mt-1">點擊「新增紀錄」開始建立</div>
            </div>

            <div v-else class="table-responsive mb-0">
              <table class="table a4-table mb-0">
                <thead>
                  <tr>
                    <th style="width: 80px;">序號</th>
                    <th style="min-width: 160px;">關聯公文</th>
                    <th style="min-width: 140px;">相關文件</th>
                    <th style="width: 100px;" class="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, idx) in records" :key="r.id">
                    <td class="align-middle">{{ idx + 1 }}</td>
                    <td class="align-middle">
                      <div v-if="linkedDocByRecordId[r.id]" class="d-flex align-items-center gap-1">
                        <span
                          class="small shelf-doc-link text-truncate"
                          style="max-width: 12rem; cursor: pointer;"
                          :title="linkedDocByRecordId[r.id]"
                          @click="previewLinkedDocInRow(r)"
                        >
                          {{ linkedDocByRecordId[r.id] }}
                        </span>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger p-0 px-1"
                          style="font-size: 0.7rem; line-height: 1.2; flex-shrink: 0;"
                          title="取消關聯"
                          @click="clearLinkedDocForRecord(r)"
                        >
                          <i class="fa fa-times"></i>
                        </button>
                      </div>
                      <button
                        v-else
                        type="button"
                        class="btn btn-sm btn-outline-info"
                        @click="openDocPickerForRow(r)"
                      >
                        <i class="fa fa-file-lines me-1"></i>選擇公文
                      </button>
                    </td>
                    <td class="align-middle">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-info"
                        @click="openAttachmentModal(r)"
                      >
                        <i class="fa fa-file-pdf me-1"></i>相關文件
                        <span
                          v-if="attachmentCountByRecordId[r.id]"
                          class="badge rounded-pill bg-danger ms-1"
                          style="font-size: 0.65rem;"
                        >{{ attachmentCountByRecordId[r.id] }}</span>
                      </button>
                    </td>
                    <td class="align-middle text-center">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        @click="deleteRecord(r)"
                      >
                        <i class="fa fa-trash me-1"></i>刪除
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </CardBody>
    </Card>

    <!-- 公文選擇器（關聯公文） -->
    <DocumentPicker
      :show="showDocPicker"
      title="選擇公文"
      :constructionId="constructionId ?? ''"
      :darkMode="true"
      :showNameInput="false"
      @update:show="(v: boolean) => { if (!v) showDocPicker = false; recordForDocPicker = null }"
      @select="onDocumentPicked"
    />

    <!-- 相關文件 Modal（共用組件） -->
    <RelatedDocumentsModal
      :show="showAttachmentModal"
      title="相關文件"
      :loading="isLoadingAttachments"
      :linked-docs="modalLinkedDocs"
      :attachments="modalAttachments"
      :uploading="isUploadingInModal"
      :downloading-all="isDownloadingAll"
      :show-select-doc-button="true"
      @update:show="(v: boolean) => { if (!v) { showAttachmentModal = false; currentRecord = null } }"
      @upload="handleModalUpload"
      @download-all="handleDownloadAll"
      @unlink-doc="unlinkDoc"
      @preview-doc="previewDoc"
      @download-doc="downloadDoc"
      @select-doc="openDocPickerForRecord"
      @preview-att="previewAtt"
      @download-att="downloadAtt"
      @delete-att="deleteAtt"
    />

    <!-- 預覽 Modal -->
    <Modal
      :show="showPreviewModal"
      :title="'預覽 - ' + previewFileName"
      size="lg"
      @update:show="(v: boolean) => { if (!v) { showPreviewModal = false; previewUrl = '' } }"
    >
      <template #body>
        <div v-if="!previewUrl" class="text-center py-5 text-muted">無法預覽</div>
        <iframe v-else :src="previewUrl" style="width: 100%; height: 75vh; border: none; border-radius: 6px;"></iframe>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import DocumentPicker from '@/components/document/DocumentPicker.vue'
import RelatedDocumentsModal from '@/components/related-documents/RelatedDocumentsModal.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import {
  documentShelfApi,
  type DocumentShelfType,
  type DocumentShelfOwnerType,
  type DocumentShelfRecord,
  type DocumentShelfAttachment
} from '@/api/documentShelf'
import { getDocumentCenterList, type DocumentCenterListItem } from '@/api/documentCenter'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { isSupervisory } = useViewPerspective()
const isSupervisoryUser = computed(() => isSupervisory.value)
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')

interface Props {
  shelfType?: DocumentShelfType
  ownerType?: DocumentShelfOwnerType
  classificationKey?: string
  title?: string
  description?: string
  categoryLabel?: string
  hidePageHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  shelfType: undefined,
  ownerType: undefined,
  classificationKey: '',
  title: '',
  description: '',
  categoryLabel: '',
  hidePageHeader: false,
})
const hidePageHeader = computed(() => props.hidePageHeader)

const isContractorRoute = computed(() => (route.path || '').toLowerCase().includes('/forms/o6-insurance'))

const shelfType = computed<DocumentShelfType>(() => {
  if (props.shelfType) return props.shelfType
  const path = (route.path || '').toLowerCase()
  if (path.includes('a1-contract')) return 'A1'
  if (path.includes('a2-budget')) return 'A2'
  if (path.includes('a6-insurance') || path.includes('o6-insurance')) return 'A6'
  return 'A1'
})

const isA6Shelf = computed(() => shelfType.value === 'A6')

const activeTab = ref<DocumentShelfOwnerType>('SUPERVISORY')
const switchTab = (tab: DocumentShelfOwnerType) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  linkedRefIdByRecordId.value = {}
  linkedDocByRecordId.value = {}
  linkedDocumentIdByRecordId.value = {}
  attachmentCountByRecordId.value = {}
  void loadRecords()
}

/** A-6 書架 API 使用的 ownerType：O-6=營造、監造 A-6 依 Tab */
const requestOwnerType = computed((): DocumentShelfOwnerType | undefined => {
  if (props.ownerType) return props.ownerType
  if (!isA6Shelf.value) return undefined
  if (isContractorRoute.value) return 'CONTRACTOR'
  if (!isSupervisoryUser.value) return 'CONTRACTOR'
  return activeTab.value
})

function apiOwnerType(): DocumentShelfOwnerType | undefined {
  return requestOwnerType.value
}

const shelfConfig = computed(() => {
  if (props.title) {
    return {
      title: props.title,
      description: props.description || '可建立多筆紀錄，每筆可關聯一個公文並上傳多個附件。',
    }
  }
  const t = shelfType.value
  const map = {
    A1: { title: 'A-1 工程契約', description: '工程契約書架：可建立多筆紀錄，每筆可關聯一個公文並上傳多個附件。' },
    A2: { title: 'A-2 施工預算書', description: '施工預算書書架：可建立多筆紀錄，每筆可關聯一個公文並上傳多個附件。' },
    A6: {
      title: isContractorRoute.value ? 'O-6 營造工程保險' : 'A-6 工程保險',
      description: isContractorRoute.value
        ? '營造端工程保險書架：可建立多筆紀錄，每筆可關聯一個公文並上傳多個附件。'
        : '監造端工程保險書架：可分「工程端」與「監造端」維護資料，每筆可關聯公文並上傳附件。'
    },
    DYNAMIC: {
      title: '文件分類書架',
      description: '可建立多筆紀錄，每筆可關聯一個公文並上傳多個附件。',
    },
  }
  return map[t]
})

const pageTitle = computed(() => shelfConfig.value.title)
const pageBreadcrumbs = computed(() => {
  const last = { text: pageTitle.value, active: true as const }
  if (shelfType.value === 'DYNAMIC') {
    return [
      { text: '表單生成與管理', href: 'javascript:;' },
      { text: props.categoryLabel || '文件分類書架', href: 'javascript:;' },
      last,
    ]
  }
  if (isContractorRoute.value) {
    return [
      { text: '表單匯出', href: 'javascript:;' },
      { text: 'O類表單', href: 'javascript:;' },
      last
    ]
  }
  return [
    { text: '表單匯出', href: 'javascript:;' },
    { text: 'A類表單', href: 'javascript:;' },
    last
  ]
})

const records = ref<DocumentShelfRecord[]>([])
const isLoading = ref(false)
const isCreating = ref(false)
const docCacheMap = ref<Map<number, DocumentCenterListItem>>(new Map())
const linkedRefIdByRecordId = ref<Record<number, number>>({})
const linkedDocByRecordId = ref<Record<number, string>>({})
const linkedDocumentIdByRecordId = ref<Record<number, number>>({})
const attachmentCountByRecordId = ref<Record<number, number>>({})

const showDocPicker = ref(false)
const recordForDocPicker = ref<DocumentShelfRecord | null>(null)
const showAttachmentModal = ref(false)
const currentRecord = ref<DocumentShelfRecord | null>(null)
const isLoadingAttachments = ref(false)
const modalLinkedDocs = ref<DocumentCenterListItem[]>([])
const modalLinkedRefs = ref<{ referenceId: number; documentId: number }[]>([])
const modalAttachments = ref<DocumentShelfAttachment[]>([])
const isUploadingInModal = ref(false)
const isDownloadingAll = ref(false)
const showPreviewModal = ref(false)
const previewUrl = ref('')
const previewFileName = ref('')

async function loadRecords() {
  if (!constructionId.value) return
  isLoading.value = true
  try {
    records.value = await documentShelfApi.listRecords(
      constructionId.value,
      shelfType.value,
      apiOwnerType(),
      props.classificationKey || undefined,
    )
    const docList = await getDocumentCenterList(constructionId.value)
    const map = new Map<number, DocumentCenterListItem>()
    docList.forEach(d => map.set(d.id, d))
    docCacheMap.value = map
    const counts: Record<number, number> = {}
    for (const r of records.value) {
      const [refs, atts] = await Promise.all([
        documentShelfApi.getLinkedDocuments(r.id, shelfType.value, apiOwnerType()),
        documentShelfApi.listAttachments(r.id, shelfType.value, apiOwnerType())
      ])
      if (refs.length > 0) {
        linkedRefIdByRecordId.value[r.id] = refs[0].referenceId
        linkedDocumentIdByRecordId.value[r.id] = refs[0].documentId
        const doc = docCacheMap.value.get(refs[0].documentId)
        const first = refs[0] as { displayTitle?: string }
        linkedDocByRecordId.value[r.id] = doc?.documentNumber || doc?.fileName || first?.displayTitle || ''
      }
      counts[r.id] = (refs.length > 0 ? 1 : 0) + atts.length
    }
    attachmentCountByRecordId.value = counts
  } finally {
    isLoading.value = false
  }
}

watch(
  [constructionId, shelfType, requestOwnerType, () => props.classificationKey],
  loadRecords,
  { immediate: true },
)

async function addRecord() {
  if (!constructionId.value) return
  isCreating.value = true
  try {
    const created = await documentShelfApi.createRecord(
      constructionId.value,
      shelfType.value,
      apiOwnerType(),
      props.classificationKey || undefined,
    )
    records.value = [...records.value, created]
    attachmentCountByRecordId.value = { ...attachmentCountByRecordId.value, [created.id!]: 0 }
  } finally {
    isCreating.value = false
  }
}

async function deleteRecord(r: DocumentShelfRecord) {
  if (!r.id || !confirm('確定要刪除此筆紀錄？')) return
  try {
    await documentShelfApi.deleteRecord(r.id, shelfType.value, apiOwnerType())
    records.value = records.value.filter(x => x.id !== r.id)
    const { [r.id]: _, ...rest } = attachmentCountByRecordId.value
    attachmentCountByRecordId.value = rest
  } catch (e) {
    console.error(e)
  }
}

function openDocPickerForRecord() {
  if (!currentRecord.value) return
  recordForDocPicker.value = currentRecord.value
  showDocPicker.value = true
}

function openDocPickerForRow(r: DocumentShelfRecord) {
  recordForDocPicker.value = r
  showDocPicker.value = true
}

async function onDocumentPicked(payload: { document: { id: number; documentNumber?: string; fileName?: string }; documentName?: string }) {
  const rec = recordForDocPicker.value
  if (!rec?.id) return
  try {
    await documentShelfApi.linkDocument(rec.id, payload.document.id, shelfType.value, apiOwnerType())
    const refs = await documentShelfApi.getLinkedDocuments(rec.id, shelfType.value, apiOwnerType())
    if (refs.length > 0) {
      const ref = refs[0]
      const doc = docCacheMap.value.get(ref.documentId)
      const label = doc?.documentNumber || doc?.fileName || payload.document?.documentNumber || payload.document?.fileName || payload.documentName || ''
      linkedRefIdByRecordId.value = { ...linkedRefIdByRecordId.value, [rec.id]: ref.referenceId }
      linkedDocumentIdByRecordId.value = { ...linkedDocumentIdByRecordId.value, [rec.id]: ref.documentId }
      linkedDocByRecordId.value = { ...linkedDocByRecordId.value, [rec.id]: label }
      attachmentCountByRecordId.value = { ...attachmentCountByRecordId.value, [rec.id]: (attachmentCountByRecordId.value[rec.id] ?? 0) + 1 }
      if (currentRecord.value?.id === rec.id) {
        modalLinkedRefs.value = refs.map(r => ({ referenceId: r.referenceId, documentId: r.documentId }))
        modalLinkedDocs.value = modalLinkedRefs.value.map(r => docCacheMap.value.get(r.documentId)).filter(Boolean) as DocumentCenterListItem[]
      }
    }
  } catch (e) {
    console.error(e)
  }
  showDocPicker.value = false
  recordForDocPicker.value = null
}

async function clearLinkedDocForRecord(r: DocumentShelfRecord) {
  const refId = linkedRefIdByRecordId.value[r.id]
  if (!r.id || refId == null) return
  if (!confirm('確定要取消關聯此公文？')) return
  try {
    await documentShelfApi.unlinkDocument(r.id, refId, shelfType.value, apiOwnerType())
    const { [r.id]: __, ...restRef } = linkedRefIdByRecordId.value
    linkedRefIdByRecordId.value = restRef
    const { [r.id]: ___, ...restDoc } = linkedDocByRecordId.value
    linkedDocByRecordId.value = restDoc
    const { [r.id]: ____, ...restDocId } = linkedDocumentIdByRecordId.value
    linkedDocumentIdByRecordId.value = restDocId
    const cur = attachmentCountByRecordId.value[r.id] ?? 0
    if (cur > 0) attachmentCountByRecordId.value = { ...attachmentCountByRecordId.value, [r.id]: cur - 1 }
    if (currentRecord.value?.id === r.id) {
      modalLinkedRefs.value = []
      modalLinkedDocs.value = []
    }
  } catch (e) {
    console.error(e)
  }
}

function previewLinkedDocInRow(r: DocumentShelfRecord) {
  const docId = linkedDocumentIdByRecordId.value[r.id]
  if (docId == null) return
  const doc = docCacheMap.value.get(docId)
  if (doc) previewDoc(doc)
}

async function openAttachmentModal(r: DocumentShelfRecord) {
  currentRecord.value = r
  showAttachmentModal.value = true
  isLoadingAttachments.value = true
  modalLinkedDocs.value = []
  modalLinkedRefs.value = []
  modalAttachments.value = []
  try {
    const [refs, atts] = await Promise.all([
      documentShelfApi.getLinkedDocuments(r.id, shelfType.value, apiOwnerType()),
      documentShelfApi.listAttachments(r.id, shelfType.value, apiOwnerType())
    ])
    modalAttachments.value = atts
    modalLinkedRefs.value = refs.map(ref => ({ referenceId: ref.referenceId, documentId: ref.documentId }))
    if (refs.length > 0 && docCacheMap.value.size > 0) {
      modalLinkedDocs.value = refs.map((ref: any) => docCacheMap.value.get(ref.documentId)).filter(Boolean) as DocumentCenterListItem[]
    }
  } finally {
    isLoadingAttachments.value = false
  }
}

function previewDoc(doc: DocumentCenterListItem) {
  if (!doc.fileUrl) return
  previewFileName.value = doc.documentNumber || doc.fileName || ''
  previewUrl.value = doc.fileUrl
  showPreviewModal.value = true
}

function downloadDoc(doc: DocumentCenterListItem) {
  if (!doc.fileUrl) return
  const link = document.createElement('a')
  link.href = doc.fileUrl
  link.download = doc.fileName || `${doc.documentNumber}.pdf`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function unlinkDoc(doc: DocumentCenterListItem) {
  const ref = modalLinkedRefs.value.find(r => r.documentId === doc.id)
  if (!ref || !currentRecord.value) return
  if (!confirm('確定要取消關聯此公文？')) return
  try {
    await documentShelfApi.unlinkDocument(currentRecord.value.id!, ref.referenceId, shelfType.value, apiOwnerType())
    modalLinkedDocs.value = modalLinkedDocs.value.filter(d => d.id !== doc.id)
    modalLinkedRefs.value = modalLinkedRefs.value.filter(r => r.documentId !== doc.id)
    const cnt = (attachmentCountByRecordId.value[currentRecord.value.id!] ?? 1) - 1
    attachmentCountByRecordId.value = { ...attachmentCountByRecordId.value, [currentRecord.value.id!]: Math.max(0, cnt) }
  } catch (e) {
    console.error(e)
  }
}

async function handleModalUpload(files: FileList) {
  if (!files?.length || !currentRecord.value) return
  isUploadingInModal.value = true
  try {
    for (const file of Array.from(files)) {
      await documentShelfApi.uploadAttachment(currentRecord.value.id!, file, shelfType.value, apiOwnerType())
    }
    modalAttachments.value = await documentShelfApi.listAttachments(currentRecord.value.id!, shelfType.value, apiOwnerType())
    const linkedCount = modalLinkedDocs.value.length > 0 ? 1 : 0
    attachmentCountByRecordId.value = { ...attachmentCountByRecordId.value, [currentRecord.value.id!]: modalAttachments.value.length + linkedCount }
  } finally {
    isUploadingInModal.value = false
  }
}

async function handleDownloadAll() {
  if (!currentRecord.value) return
  isDownloadingAll.value = true
  try {
    await documentShelfApi.downloadAll(currentRecord.value.id!, shelfType.value, apiOwnerType())
  } finally {
    isDownloadingAll.value = false
  }
}

async function previewAtt(att: DocumentShelfAttachment) {
  if (!currentRecord.value) return
  try {
    const result = await documentShelfApi.previewAttachment(currentRecord.value.id!, att.id, shelfType.value, apiOwnerType())
    previewFileName.value = result.fileName
    previewUrl.value = result.url
    showPreviewModal.value = true
  } catch (e) {
    console.error(e)
  }
}

async function downloadAtt(att: DocumentShelfAttachment) {
  if (!currentRecord.value) return
  try {
    await documentShelfApi.downloadAttachment(currentRecord.value.id!, att.id, att.fileName, shelfType.value, apiOwnerType())
  } catch (e) {
    console.error(e)
  }
}

async function deleteAtt(att: DocumentShelfAttachment) {
  if (!currentRecord.value || !confirm(`確定要刪除「${att.fileName}」？`)) return
  try {
    await documentShelfApi.deleteAttachment(currentRecord.value.id!, att.id, shelfType.value, apiOwnerType())
    modalAttachments.value = modalAttachments.value.filter(a => a.id !== att.id)
    const linkedCount = modalLinkedDocs.value.length > 0 ? 1 : 0
    attachmentCountByRecordId.value = { ...attachmentCountByRecordId.value, [currentRecord.value.id!]: modalAttachments.value.length + linkedCount }
  } catch (e) {
    console.error(e)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
</script>

<style scoped>
/* 暗色主題（與 A-4 / A-7 一致） */
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

.document-shelf-page {
  padding: 1rem;
  color: var(--a4-text);
}

:deep(.card) {
  background: var(--a4-card);
  border-color: var(--a4-border);
  color: var(--a4-text);
}

:deep(.alert-info) {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.25);
  color: #93c5fd;
}

:deep(.alert-warning) {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
}

.shelf-doc-link {
  color: var(--a4-accent, #60a5fa);
}
.shelf-doc-link:hover {
  text-decoration: underline;
}

.a4-table {
  border: 2px solid var(--a4-border);
  border-collapse: collapse;
  width: 100%;
  color: var(--a4-text);
}

.a4-table thead th {
  background: var(--a4-thead);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.65rem 0.5rem;
  border: 1.5px solid var(--a4-border);
  color: var(--a4-muted);
}

.a4-table tbody td {
  border: 1.5px solid var(--a4-border);
  padding: 0.6rem 0.5rem;
  vertical-align: middle;
  background: var(--a4-card);
  color: var(--a4-text);
}

.a4-table tbody tr:hover td {
  background: var(--a4-hover);
}

.shelf-tabs {
  border-bottom-color: var(--a4-border);
}
.shelf-tabs .nav-link {
  color: var(--a4-muted);
  border: 1px solid transparent;
  border-radius: 0.375rem 0.375rem 0 0;
  padding: 0.5rem 1rem;
}
.shelf-tabs .nav-link:hover {
  color: var(--a4-text);
  border-color: var(--a4-border) var(--a4-border) transparent;
  background: var(--a4-hover);
}
.shelf-tabs .nav-link.active {
  color: var(--a4-accent);
  background: var(--a4-card);
  border-color: var(--a4-border) var(--a4-border) var(--a4-card);
}
</style>

<style>
/* Modal 暗色（Teleport 到 body，需非 scoped） */
.a4-date-modal-dark .modal-content {
  background: #1e2125;
  border-color: #3a3d42;
  color: #e4e6eb;
}
.a4-date-modal-dark .modal-header {
  border-bottom-color: #3a3d42;
  color: #e4e6eb;
}
.a4-date-modal-dark .modal-body {
  color: #e4e6eb;
}
.a4-date-modal-dark .list-group-item {
  background: rgba(255, 255, 255, 0.04);
  border-color: #3a3d42;
  color: #e4e6eb;
}
</style>
