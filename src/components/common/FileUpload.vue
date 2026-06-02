<template>
  <div
    class="file-upload"
    :class="[
      `file-upload--${layout}`,
      variant === 'dark' ? 'file-upload--dark' : 'file-upload--light',
      { 'file-upload--disabled': disabled || uploading },
    ]"
  >
    <input
      ref="inputRef"
      type="file"
      class="file-upload__input"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled || uploading"
      @change="onInputChange"
    />

    <!-- 拖放區模式 -->
    <div
      v-if="layout === 'dropzone'"
      class="file-upload__dropzone"
      :class="{
        'file-upload__dropzone--active': dragDepth > 0,
        'file-upload__dropzone--has-files': modelValue.length > 0,
      }"
      role="button"
      tabindex="0"
      @click="openPicker"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
      @dragenter.prevent="onDragEnter"
      @dragleave.prevent="onDragLeave"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <template v-if="modelValue.length > 0">
        <i class="fa fa-check-circle file-upload__check-icon" aria-hidden="true"></i>
        <span class="file-upload__ready-badge">已選擇 {{ modelValue.length }} 個檔案</span>
        <p class="file-upload__replace-hint mb-0 mt-2 small">點此區域或拖放可新增／更換檔案</p>
      </template>
      <template v-else>
        <i class="fa fa-cloud-upload-alt fa-2x mb-2 d-block file-upload__cloud-icon" aria-hidden="true"></i>
        <p class="mb-1 fw-medium">{{ dropzoneTitle }}</p>
        <p v-if="resolvedHint" class="mb-0 small file-upload__hint">{{ resolvedHint }}</p>
      </template>
    </div>

    <!-- 工具列模式（選檔 + 上傳按鈕） -->
    <div v-else class="file-upload__toolbar">
      <div class="file-upload__toolbar-text">
        <div v-if="modelValue.length" class="file-upload__pending-pill">
          已選取 {{ modelValue.length }} 個檔案<span v-if="showUploadButton">，按「{{ uploadButtonText }}」送出</span>
        </div>
        <div v-else-if="resolvedHint" class="small file-upload__hint">{{ resolvedHint }}</div>
      </div>
      <div class="d-flex align-items-center gap-2 flex-shrink-0">
        <button
          type="button"
          class="btn btn-sm btn-outline-light"
          :disabled="disabled || uploading"
          @click="openPicker"
        >
          <i class="fa fa-folder-open me-1"></i>{{ pickButtonText }}
        </button>
        <button
          v-if="showUploadButton"
          type="button"
          class="btn btn-sm btn-outline-primary"
          :disabled="disabled || uploading || modelValue.length === 0"
          @click="emitUpload"
        >
          <i class="fa me-1" :class="uploading ? 'fa-spinner fa-spin' : 'fa-upload'"></i>
          {{ uploading ? uploadingText : uploadButtonText }}
        </button>
        <slot name="toolbar-actions" />
      </div>
    </div>

    <!-- 已選檔案列表 -->
    <ul v-if="showFileList && modelValue.length" class="file-upload__list list-unstyled mb-0 mt-2">
      <li
        v-for="(file, index) in modelValue"
        :key="fileKey(file, index)"
        class="file-upload__list-item"
      >
        <div class="file-upload__file-meta">
          <i class="fa fa-file me-2 file-upload__file-icon" aria-hidden="true"></i>
          <button
            type="button"
            class="file-upload__file-name file-upload__file-name--clickable"
            :title="`預覽 ${file.name}`"
            :disabled="disabled || uploading"
            @click="openPendingFile(file)"
          >
            {{ file.name }}
          </button>
          <span class="file-upload__file-size">{{ formatFileSize(file.size) }}</span>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-outline-danger"
          :disabled="disabled || uploading"
          :title="`移除 ${file.name}`"
          @click.stop="removeAt(index)"
        >
          <i class="fa fa-times"></i>
        </button>
      </li>
    </ul>

    <p v-if="errorMessage" class="file-upload__error small mb-0 mt-2">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { openLocalFilePreviewOrDownload } from '@/utils/openFilePreview'

export interface FileUploadValidateOptions {
  maxCount?: number
  maxSizeBytes?: number
  accept?: string
}

const props = withDefaults(
  defineProps<{
    /** 待上傳檔案（v-model） */
    modelValue?: File[]
    /** dropzone：拖放區；toolbar：選檔 + 上傳按鈕列 */
    layout?: 'dropzone' | 'toolbar'
    /** light：淺色表單；dark：深色卡片（表單 B 類） */
    variant?: 'light' | 'dark'
    accept?: string
    multiple?: boolean
    maxCount?: number
    /** 單檔大小上限（bytes） */
    maxSizeBytes?: number
    disabled?: boolean
    uploading?: boolean
    showFileList?: boolean
    /** toolbar 模式是否顯示上傳按鈕 */
    showUploadButton?: boolean
    pickButtonText?: string
    uploadButtonText?: string
    uploadingText?: string
    dropzoneTitle?: string
    hint?: string
    /** 為 true 時不顯示 hint（含自動產生的格式說明） */
    hideHint?: boolean
  }>(),
  {
    modelValue: () => [],
    layout: 'dropzone',
    variant: 'dark',
    accept: '',
    multiple: true,
    maxCount: undefined,
    maxSizeBytes: undefined,
    disabled: false,
    uploading: false,
    showFileList: true,
    showUploadButton: true,
    pickButtonText: '選取檔案',
    uploadButtonText: '上傳',
    uploadingText: '上傳中…',
    dropzoneTitle: '將檔案拖放到此處，或按一下選擇檔案',
    hint: '',
    hideHint: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
  change: [files: File[]]
  upload: [files: File[]]
  error: [message: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const dragDepth = ref(0)
const errorMessage = ref('')

const defaultHint = computed(() => {
  const parts: string[] = []
  if (props.accept) parts.push(`格式：${props.accept}`)
  if (props.maxSizeBytes) parts.push(`單檔 ≤ ${formatFileSize(props.maxSizeBytes)}`)
  if (props.maxCount) parts.push(`最多 ${props.maxCount} 個`)
  return parts.join(' · ') || '可選擇一個或多個檔案'
})

const resolvedHint = computed(() => {
  if (props.hideHint) return ''
  if (props.hint) return props.hint
  return defaultHint.value
})

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileKey(file: File, index: number): string {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`
}

function matchesAccept(file: File, accept: string): boolean {
  const rules = accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (rules.length === 0) return true

  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()

  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule)
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, -1)
      return type.startsWith(prefix)
    }
    return type === rule
  })
}

function validateIncoming(incoming: File[]): { ok: File[]; error?: string } {
  if (incoming.length === 0) return { ok: [] }

  const merged = props.multiple ? [...props.modelValue, ...incoming] : [incoming[0]]

  if (props.maxCount != null && merged.length > props.maxCount) {
    return { ok: [], error: `最多只能選擇 ${props.maxCount} 個檔案` }
  }

  for (const file of incoming) {
    if (props.maxSizeBytes != null && file.size > props.maxSizeBytes) {
      return {
        ok: [],
        error: `「${file.name}」超過大小上限（${formatFileSize(props.maxSizeBytes)}）`,
      }
    }
    if (props.accept && !matchesAccept(file, props.accept)) {
      return { ok: [], error: `「${file.name}」不符合允許的檔案格式` }
    }
  }

  return { ok: props.multiple ? merged : [merged[0]] }
}

function setFiles(files: File[]) {
  errorMessage.value = ''
  emit('update:modelValue', files)
  emit('change', files)
}

function applyFiles(incoming: File[]) {
  const { ok, error } = validateIncoming(incoming)
  if (error) {
    errorMessage.value = error
    emit('error', error)
    return
  }
  setFiles(ok)
}

function onInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files || [])
  input.value = ''
  applyFiles(picked)
}

function onDragEnter() {
  if (props.disabled || props.uploading) return
  dragDepth.value += 1
}

function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}

function onDrop(e: DragEvent) {
  dragDepth.value = 0
  if (props.disabled || props.uploading) return
  const dropped = Array.from(e.dataTransfer?.files || [])
  applyFiles(dropped)
}

function openPicker() {
  if (props.disabled || props.uploading) return
  inputRef.value?.click()
}

function removeAt(index: number) {
  if (props.disabled || props.uploading) return
  const next = props.modelValue.filter((_, i) => i !== index)
  setFiles(next)
}

function clear() {
  errorMessage.value = ''
  if (inputRef.value) inputRef.value.value = ''
  setFiles([])
}

function emitUpload() {
  if (props.disabled || props.uploading || props.modelValue.length === 0) return
  emit('upload', [...props.modelValue])
}

function openPendingFile(file: File) {
  if (props.disabled || props.uploading) return
  void openLocalFilePreviewOrDownload(file)
}

watch(
  () => props.uploading,
  (v) => {
    if (!v) errorMessage.value = ''
  },
)

defineExpose({ openPicker, clear })
</script>

<style scoped>
.file-upload__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.file-upload {
  position: relative;
}

.file-upload--disabled {
  opacity: 0.65;
  pointer-events: none;
}

/* ── Dropzone ── */
.file-upload__dropzone {
  cursor: pointer;
  border: 1px dashed;
  border-radius: 0.5rem;
  padding: 1.5rem 1rem;
  text-align: center;
  user-select: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.file-upload--dark .file-upload__dropzone {
  background-color: rgba(15, 23, 42, 0.35);
  border-color: #64748b;
}

.file-upload--dark .file-upload__dropzone:hover {
  border-color: #94a3b8;
  background-color: rgba(30, 41, 59, 0.45);
}

.file-upload--light .file-upload__dropzone {
  background-color: rgba(var(--bs-primary-rgb), 0.04);
  border-color: var(--bs-border-color);
}

.file-upload--light .file-upload__dropzone:hover {
  border-color: var(--bs-primary);
  background-color: rgba(var(--bs-primary-rgb), 0.08);
}

.file-upload__dropzone--active {
  border-color: #38bdf8 !important;
  background-color: rgba(14, 165, 233, 0.12) !important;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.35);
}

.file-upload--dark .file-upload__dropzone--has-files:not(.file-upload__dropzone--active) {
  border-style: solid;
  border-width: 2px;
  border-color: #22c55e;
  background: linear-gradient(165deg, rgba(34, 197, 94, 0.22) 0%, rgba(15, 23, 42, 0.92) 55%);
}

.file-upload__check-icon {
  font-size: 2.5rem;
  color: #4ade80;
  line-height: 1;
}

.file-upload__cloud-icon {
  color: #94a3b8;
}

.file-upload__ready-badge {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #052e16;
  background: #4ade80;
  border-radius: 999px;
}

.file-upload--dark .file-upload__hint,
.file-upload--dark .file-upload__replace-hint {
  color: rgba(226, 232, 240, 0.65);
}

.file-upload--light .file-upload__hint,
.file-upload--light .file-upload__replace-hint {
  color: var(--bs-secondary-color);
}

/* ── Toolbar ── */
.file-upload__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.file-upload__pending-pill {
  font-size: 0.875rem;
  color: #7dd3fc;
}

.file-upload--light .file-upload__pending-pill {
  color: var(--bs-primary);
}

/* ── File list ── */
.file-upload__list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.45rem 0.65rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.15);
}

.file-upload--light .file-upload__list-item {
  border-color: var(--bs-border-color);
  background: rgba(var(--bs-primary-rgb), 0.04);
}

.file-upload__list-item + .file-upload__list-item {
  margin-top: 0.35rem;
}

.file-upload__file-meta {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
  gap: 0.35rem;
}

.file-upload__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.file-upload__file-name--clickable {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(148, 163, 184, 0.45);
  text-underline-offset: 2px;
}

.file-upload__file-name--clickable:hover:not(:disabled) {
  text-decoration-color: currentColor;
}

.file-upload__file-name--clickable:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  text-decoration: none;
}

.file-upload--dark .file-upload__file-name {
  color: rgba(226, 232, 240, 0.92);
}

.file-upload__file-size {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.95);
}

.file-upload__file-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.file-upload__error {
  color: #fca5a5;
}

.file-upload--light .file-upload__error {
  color: var(--bs-danger);
}
</style>
