<template>
  <Modal
    :show="show"
    :title="title"
    icon="fa fa-folder-open"
    size="lg"
    :modalClass="modalClass"
    :hideFooter="true"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <template #body>
      <div v-if="loading" class="text-center py-4">
        <i class="fa fa-spinner fa-spin me-1"></i>載入中...
      </div>
      <template v-else>
        <!-- 操作列：上傳 + 下載全部（固定位置） -->
        <div v-if="showUpload || showDownloadAll" class="d-flex gap-2 mb-4 align-items-center">
          <label v-if="showUpload" class="btn btn-sm btn-outline-success mb-0">
            <i class="fa fa-upload me-1"></i>{{ uploadLabel }}
            <input
              type="file"
              :accept="uploadAccept"
              multiple
              class="d-none"
              @change="onFileChange"
            />
          </label>
          <button
            v-if="showDownloadAll && (linkedDocs.length > 0 || attachments.length > 0)"
            class="btn btn-sm btn-outline-primary"
            :disabled="downloadingAll"
            @click="emit('downloadAll')"
          >
            <i v-if="downloadingAll" class="fa fa-spinner fa-spin me-1"></i>
            <i v-else class="fa fa-file-zipper me-1"></i>
            {{ downloadAllLabel }}
          </button>
        </div>

        <div v-if="uploading" class="text-center py-2 small text-muted mb-3">
          <i class="fa fa-spinner fa-spin me-1"></i>上傳中...
        </div>

        <!-- 關聯公文區塊 -->
        <div v-if="showLinkedSection" class="mb-4">
          <h6 class="fw-bold small mb-2"><i class="fa fa-file-lines me-1 text-info"></i>關聯公文</h6>
          <div v-if="linkedDocs.length > 0" class="list-group">
            <div
              v-for="doc in linkedDocs"
              :key="doc.id"
              class="list-group-item d-flex justify-content-between align-items-center rd-list-item"
            >
              <div class="text-truncate">
                <div class="small fw-semibold">{{ doc.documentNumber || doc.fileName }}</div>
                <div class="text-muted small">{{ doc.subject }}</div>
              </div>
              <div class="d-flex gap-1 flex-shrink-0">
                <button
                  v-if="doc.fileUrl"
                  class="btn btn-sm btn-outline-info"
                  title="預覽"
                  @click="emit('previewDoc', doc)"
                >
                  <i class="fa fa-eye"></i>
                </button>
                <button
                  v-if="doc.fileUrl"
                  class="btn btn-sm btn-outline-primary"
                  title="下載"
                  @click="emit('downloadDoc', doc)"
                >
                  <i class="fa fa-download"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-danger"
                  title="取消關聯"
                  @click="emit('unlinkDoc', doc)"
                >
                  <i class="fa fa-unlink"></i>
                </button>
              </div>
            </div>
          </div>
          <div v-else-if="showSelectDocButton" class="mb-0">
            <button type="button" class="btn btn-sm btn-outline-info" @click="emit('selectDoc')">
              <i class="fa fa-plus me-1"></i>選擇公文
            </button>
          </div>
        </div>

        <!-- 額外區塊（如 A-7 職安證照） -->
        <slot name="extra" />

        <!-- 上傳附件區塊 -->
        <div>
          <h6 class="fw-bold small mb-2"><i class="fa fa-paperclip me-1 text-warning"></i>上傳附件</h6>
          <div v-if="attachments.length === 0" class="text-muted small text-center py-3">
            <i class="fa fa-inbox fa-lg mb-2 d-block"></i>尚無上傳附件
          </div>
          <div v-else class="list-group">
            <div
              v-for="att in attachments"
              :key="att.id"
              class="list-group-item d-flex justify-content-between align-items-center rd-list-item"
            >
              <div class="text-truncate">
                <div class="small fw-semibold">{{ att.fileName }}</div>
                <div class="text-muted" style="font-size: 0.7rem;">{{ formatFileSize(att.fileSize) }}</div>
              </div>
              <div class="d-flex gap-1 flex-shrink-0">
                <button class="btn btn-sm btn-outline-info" title="預覽" @click="emit('previewAtt', att)">
                  <i class="fa fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" title="下載" @click="emit('downloadAtt', att)">
                  <i class="fa fa-download"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="刪除" @click="emit('deleteAtt', att)">
                  <i class="fa fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/bootstrap/Modal.vue'

/** 關聯公文顯示用（與 DocumentCenterListItem 相容） */
export interface RelatedDocumentsLinkedDoc {
  id: number
  documentNumber?: string
  fileName?: string
  subject?: string
  fileUrl?: string
}

/** 附件顯示用（至少需 id, fileName, fileSize） */
export interface RelatedDocumentsAttachment {
  id: number
  fileName: string
  fileSize: number
}

const props = withDefaults(
  defineProps<{
    show: boolean
    title?: string
    loading?: boolean
    linkedDocs?: RelatedDocumentsLinkedDoc[]
    attachments?: RelatedDocumentsAttachment[]
    uploading?: boolean
    downloadingAll?: boolean
    showLinkedSection?: boolean
    showUpload?: boolean
    showDownloadAll?: boolean
    showSelectDocButton?: boolean
    uploadLabel?: string
    uploadAccept?: string
    downloadAllLabel?: string
    modalClass?: string
  }>(),
  {
    title: '相關文件',
    loading: false,
    linkedDocs: () => [],
    attachments: () => [],
    uploading: false,
    downloadingAll: false,
    showLinkedSection: true,
    showUpload: true,
    showDownloadAll: true,
    showSelectDocButton: false,
    uploadLabel: '上傳檔案',
    uploadAccept: '',
    downloadAllLabel: '下載全部',
    modalClass: 'a4-date-modal-dark'
  }
)

const emit = defineEmits<{
  'update:show': [value: boolean]
  upload: [files: FileList]
  downloadAll: []
  unlinkDoc: [doc: RelatedDocumentsLinkedDoc]
  previewDoc: [doc: RelatedDocumentsLinkedDoc]
  downloadDoc: [doc: RelatedDocumentsLinkedDoc]
  selectDoc: []
  previewAtt: [att: RelatedDocumentsAttachment]
  downloadAtt: [att: RelatedDocumentsAttachment]
  deleteAtt: [att: RelatedDocumentsAttachment]
}>()

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (files?.length) emit('upload', files)
  input.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.rd-list-item {
  background: var(--a4-card-bg, #1e293b);
  border-color: var(--a4-border, #334155);
}
</style>
