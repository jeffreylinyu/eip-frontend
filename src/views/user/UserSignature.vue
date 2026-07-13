<template>
  <div class="user-signature-page">
    <PageHeader
      title="個人簽名檔"
      icon="bi bi-pen"
      :breadcrumbs="[
        { text: '個人設定' },
        { text: '個人簽名檔', active: true }
      ]"
    />

    <div class="row g-4">
      <!-- 左側：簽名編輯區 -->
      <div class="col-lg-8">
        <Card>
          <CardHeader>
            <div>
              <span class="fw-semibold">{{ editingId ? '編輯簽名檔' : '新增簽名檔' }}</span>
              <small v-if="editingId" class="text-muted ms-2">正在編輯：{{ editingName }}</small>
            </div>
          </CardHeader>
          <CardBody>
            <div class="mb-3">
              <label class="form-label">簽名檔名稱</label>
              <input
                v-model="signatureName"
                type="text"
                class="form-control"
                placeholder="例如：正式簽名、簡稱簽名"
                maxlength="30"
              />
            </div>

            <!-- 筆畫／背景設定 -->
            <div class="signature-style-panel mb-3">
              <div class="row g-3 align-items-end">
                <div class="col-6 col-md-3">
                  <label class="form-label">筆色</label>
                  <div class="d-flex align-items-center gap-2">
                    <input v-model="strokeColor" type="color" class="form-control form-control-color color-input" title="筆色" />
                    <span class="small text-muted text-truncate">{{ strokeColor }}</span>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <label class="form-label">背景色</label>
                  <div class="d-flex align-items-center gap-2">
                    <input
                      v-model="padBackgroundColor"
                      type="color"
                      class="form-control form-control-color color-input"
                      title="背景色"
                      :disabled="transparentBackground"
                    />
                    <span class="small text-muted text-truncate">
                      {{ transparentBackground ? '透明' : padBackgroundColor }}
                    </span>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <label class="form-label">筆畫粗細</label>
                  <select v-model="strokeThickness" class="form-select">
                    <option v-for="opt in strokeThicknessOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div class="col-6 col-md-3">
                  <label class="form-label d-block">透明背景</label>
                  <div class="form-check form-switch mt-1">
                    <input
                      id="transparent-bg-switch"
                      v-model="transparentBackground"
                      class="form-check-input"
                      type="checkbox"
                      role="switch"
                    />
                    <label class="form-check-label small text-muted" for="transparent-bg-switch">
                      疊加公文用（儲存不含背景）
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="signature-pad-wrap" :class="{ 'is-transparent': transparentBackground }">
              <ejs-signature
                ref="signatureRef"
                id="user-signature-pad"
                :backgroundColor="effectiveBackgroundColor"
                :strokeColor="strokeColor"
                :minStrokeWidth="minStrokeWidth"
                :maxStrokeWidth="maxStrokeWidth"
                :saveWithBackground="saveWithBackground"
                @change="onSignatureChange"
              />
            </div>

            <input
              ref="uploadInputRef"
              type="file"
              class="d-none"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              @change="handleUploadImage"
            />

            <div class="d-flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="!canUndo"
                @click="handleUndo"
              >
                <i class="bi bi-arrow-counterclockwise me-1"></i>復原
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="!canRedo"
                @click="handleRedo"
              >
                <i class="bi bi-arrow-clockwise me-1"></i>重做
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="isEmpty"
                @click="handleClear"
              >
                <i class="bi bi-eraser me-1"></i>清除
              </button>
              <div class="ms-auto d-flex flex-wrap gap-2">
                <button
                  v-if="editingId"
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  @click="handleStartNew"
                >
                  <i class="bi bi-plus-lg me-1"></i>另存新檔
                </button>
                <button
                  type="button"
                  class="btn btn-theme"
                  :disabled="isEmpty || isSaving"
                  @click="handleSave"
                >
                  <span v-if="isSaving" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  {{ editingId ? '更新簽名檔' : '儲存簽名檔' }}
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <!-- 右側：已儲存列表 -->
      <div class="col-lg-4">
        <Card>
          <CardHeader>
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-2">
                <span class="fw-semibold">我的簽名檔</span>
                <span class="badge bg-secondary">{{ savedSignatures.length }}</span>
              </div>
              <button
                type="button"
                class="btn btn-upload-signature btn-sm"
                @click="uploadInputRef?.click()"
              >
                <i class="bi bi-upload me-1"></i>上傳簽名
              </button>
            </div>
          </CardHeader>
          <CardBody class="p-0">
            <div v-if="savedSignatures.length === 0" class="saved-signature-empty text-muted text-center py-5 px-3">
              <i class="bi bi-images fs-1 d-block mb-2 opacity-50"></i>
              <p class="mb-0">尚未儲存簽名檔</p>
              <small>完成簽名後點擊「儲存簽名檔」</small>
            </div>

            <ul v-else class="signature-list list-unstyled mb-0">
              <li
                v-for="item in sortedSignatures"
                :key="item.id"
                class="signature-list-item"
                :class="{ active: editingId === item.id }"
              >
                <div
                  class="signature-list-thumb"
                  :class="{ 'is-transparent': item.settings?.transparentBackground }"
                >
                  <img :src="item.imageData" :alt="item.name" />
                </div>
                <div class="signature-list-body">
                  <div class="fw-semibold text-truncate">{{ item.name }}</div>
                  <div class="text-muted small">
                    更新於 {{ formatUpdatedAt(item.updatedAt) }}
                    <span v-if="item.settings?.transparentBackground" class="ms-1 badge bg-secondary">透明</span>
                  </div>
                  <div class="d-flex flex-wrap gap-1 mt-2">
                    <button
                      type="button"
                      class="btn btn-outline-theme btn-sm py-0 px-2"
                      @click="handleLoadItem(item)"
                    >
                      載入
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm py-0 px-2"
                      @click="handleDownloadSaved(item, 'Png')"
                    >
                      PNG
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm py-0 px-2"
                      @click="handleDownloadSaved(item, 'Svg')"
                    >
                      SVG
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm py-0 px-2"
                      @click="handleDeleteItem(item)"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </CardBody>
        </Card>

        <Card class="mt-4">
          <CardBody>
            <h6 class="fw-semibold mb-2">使用說明</h6>
            <ul class="small text-muted mb-0 ps-3">
              <li>可儲存多張簽名檔，並以名稱區分用途。</li>
              <li>「透明背景」適合疊加在公文上，儲存與下載時不含底色。</li>
              <li>可上傳 PNG / JPEG / SVG 簽名圖片作為簽名起點再微調。</li>
              <li>在已儲存列表可下載 PNG / SVG 到本機。</li>
              <li>載入既有簽名後，可按「另存新檔」保留原檔並新增一份副本。</li>
              <li>目前僅儲存於本機瀏覽器，後端 API 串接後將改為雲端同步。</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref } from 'vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import type { SignatureComponent } from '@syncfusion/ej2-vue-inputs'
import { useAuthStore } from '@/stores/auth'
import { storage } from '@/utils/storage'

type StrokeThickness = 'thin' | 'medium' | 'thick'
type SignatureFileType = 'Png' | 'Svg'

interface SignatureStyleSettings {
  strokeColor: string
  padBackgroundColor: string
  transparentBackground: boolean
  strokeThickness: StrokeThickness
}

interface SavedSignature {
  id: string
  name: string
  imageData: string
  svgData?: string
  createdAt: string
  updatedAt: string
  settings?: SignatureStyleSettings
}

/** 舊版單筆儲存格式（向後相容） */
interface LegacySavedSignature {
  imageData: string
  updatedAt: string
}

interface SignatureInstance {
  undo: () => void
  redo: () => void
  clear: () => void
  load: (data: string, width?: number, height?: number) => void
  getSignature: (type?: string) => string
  save: (type?: SignatureFileType, fileName?: string) => void
  canUndo: () => boolean
  canRedo: () => boolean
  isEmpty: () => boolean
  disabled?: boolean
  isReadOnly?: boolean
}

const STORAGE_KEY_PREFIX = 'user-signature:'
const DEFAULT_SIGNATURE_NAME = '簽名檔'
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

const strokeThicknessMap: Record<StrokeThickness, { min: number; max: number }> = {
  thin: { min: 0.5, max: 1.5 },
  medium: { min: 1, max: 3 },
  thick: { min: 2, max: 5 }
}

const { proxy } = getCurrentInstance() as { proxy: { $toast?: { success?: (m: string) => void; error?: (m: string) => void; warning?: (m: string) => void } } }
const authStore = useAuthStore()

const signatureRef = ref<InstanceType<typeof SignatureComponent> | null>(null)
const uploadInputRef = ref<HTMLInputElement | null>(null)
const signatureName = ref('')
const strokeColor = ref('#1a1a1a')
const padBackgroundColor = ref('#ffffff')
const transparentBackground = ref(false)
const strokeThickness = ref<StrokeThickness>('medium')

const canUndo = ref(false)
const canRedo = ref(false)
const isEmpty = ref(true)
const isSaving = ref(false)
const savedSignatures = ref<SavedSignature[]>([])
const editingId = ref<string | null>(null)

const strokeThicknessOptions = [
  { value: 'thin' as const, label: '細' },
  { value: 'medium' as const, label: '中' },
  { value: 'thick' as const, label: '粗' }
]

const storageKey = computed(() => {
  const userId = authStore.user?.userId || authStore.user?.id
  return userId ? `${STORAGE_KEY_PREFIX}${userId}` : null
})

const editingName = computed(() => {
  if (!editingId.value) return ''
  return savedSignatures.value.find((s) => s.id === editingId.value)?.name ?? ''
})

const sortedSignatures = computed(() => {
  return [...savedSignatures.value].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
})

const minStrokeWidth = computed(() => strokeThicknessMap[strokeThickness.value].min)
const maxStrokeWidth = computed(() => strokeThicknessMap[strokeThickness.value].max)
const effectiveBackgroundColor = computed(() => (transparentBackground.value ? 'transparent' : padBackgroundColor.value))
const saveWithBackground = computed(() => !transparentBackground.value)

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const getCurrentStyleSettings = (): SignatureStyleSettings => ({
  strokeColor: strokeColor.value,
  padBackgroundColor: padBackgroundColor.value,
  transparentBackground: transparentBackground.value,
  strokeThickness: strokeThickness.value
})

const applyStyleSettings = (settings?: SignatureStyleSettings) => {
  if (!settings) return
  strokeColor.value = settings.strokeColor
  padBackgroundColor.value = settings.padBackgroundColor
  transparentBackground.value = settings.transparentBackground
  strokeThickness.value = settings.strokeThickness
}

const getSignatureInstance = (): SignatureInstance | null => {
  return (signatureRef.value as { ej2Instances?: SignatureInstance } | null)?.ej2Instances ?? null
}

const syncActionState = () => {
  const signature = getSignatureInstance()
  if (!signature || signature.disabled || signature.isReadOnly) {
    canUndo.value = false
    canRedo.value = false
    isEmpty.value = true
    return
  }
  canUndo.value = signature.canUndo()
  canRedo.value = signature.canRedo()
  isEmpty.value = signature.isEmpty()
}

const persistSignatures = () => {
  if (!storageKey.value) return
  storage.set(storageKey.value, savedSignatures.value)
}

const onSignatureChange = () => {
  syncActionState()
}

const sanitizeFileName = (name: string) => {
  const trimmed = name.trim() || DEFAULT_SIGNATURE_NAME
  return trimmed.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)
}

const handleUndo = () => {
  const signature = getSignatureInstance()
  if (!signature || signature.disabled || signature.isReadOnly || !signature.canUndo()) return
  signature.undo()
  syncActionState()
}

const handleRedo = () => {
  const signature = getSignatureInstance()
  if (!signature || signature.disabled || signature.isReadOnly || !signature.canRedo()) return
  signature.redo()
  syncActionState()
}

const handleClear = () => {
  const signature = getSignatureInstance()
  if (!signature || signature.disabled || signature.isReadOnly || signature.isEmpty()) return
  signature.clear()
  syncActionState()
}

const handleUploadImage = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) return

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    proxy?.$toast?.warning?.('僅支援 PNG、JPEG、SVG 圖片')
    return
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    proxy?.$toast?.warning?.('圖片大小不可超過 2 MB')
    return
  }

  try {
    const dataUrl = await readFileAsDataUrl(file)
    const signature = getSignatureInstance()
    if (!signature) return
    signature.load(dataUrl)
    await nextTick()
    syncActionState()
    proxy?.$toast?.success?.('已載入圖片，可繼續編輯')
  } catch (error) {
    console.error('上傳簽名圖片失敗:', error)
    proxy?.$toast?.error?.('讀取圖片失敗')
  }
}

const readFileAsDataUrl = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('invalid file result'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

const triggerFileDownload = (dataUrl: string, fileName: string) => {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleDownloadSaved = async (item: SavedSignature, type: SignatureFileType) => {
  const fileName = sanitizeFileName(item.name)

  if (type === 'Png') {
    try {
      triggerFileDownload(item.imageData, `${fileName}.png`)
      proxy?.$toast?.success?.(`已下載「${item.name}」PNG 檔案`)
    } catch (error) {
      console.error('下載簽名檔失敗:', error)
      proxy?.$toast?.error?.('下載失敗')
    }
    return
  }

  try {
    if (!item.svgData) {
      proxy?.$toast?.warning?.('這筆舊簽名尚未保存 SVG 資料，請載入後重新儲存一次')
      return
    }
    triggerFileDownload(item.svgData, `${fileName}.svg`)
    proxy?.$toast?.success?.(`已下載「${item.name}」SVG 檔案`)
  } catch (error) {
    console.error('下載簽名檔失敗:', error)
    proxy?.$toast?.error?.('下載失敗')
  }
}

const resolveSignatureName = () => {
  const name = signatureName.value.trim()
  if (name) return name
  return `${DEFAULT_SIGNATURE_NAME} ${savedSignatures.value.length + 1}`
}

const handleSave = async () => {
  const signature = getSignatureInstance()
  if (!signature || signature.isEmpty()) {
    proxy?.$toast?.warning?.('請先完成簽名再儲存')
    return
  }
  if (!storageKey.value) {
    proxy?.$toast?.error?.('無法取得使用者資訊，請重新登入')
    return
  }

  const name = resolveSignatureName()
  const duplicate = savedSignatures.value.find(
    (s) => s.name === name && s.id !== editingId.value
  )
  if (duplicate) {
    proxy?.$toast?.warning?.('已有相同名稱的簽名檔，請改用其他名稱')
    return
  }

  isSaving.value = true
  try {
    const imageData = signature.getSignature('Png')
    const svgData = signature.getSignature('Svg')
    const now = new Date().toISOString()
    const settings = getCurrentStyleSettings()

    if (editingId.value) {
      const index = savedSignatures.value.findIndex((s) => s.id === editingId.value)
      if (index >= 0) {
        savedSignatures.value[index] = {
          ...savedSignatures.value[index],
          name,
          imageData,
          svgData,
          settings,
          updatedAt: now
        }
      }
      proxy?.$toast?.success?.('簽名檔已更新')
    } else {
      const payload: SavedSignature = {
        id: createId(),
        name,
        imageData,
        svgData,
        settings,
        createdAt: now,
        updatedAt: now
      }
      savedSignatures.value.push(payload)
      editingId.value = payload.id
      proxy?.$toast?.success?.('簽名檔已儲存')
    }

    signatureName.value = name
    persistSignatures()
  } catch (error) {
    console.error('儲存簽名檔失敗:', error)
    proxy?.$toast?.error?.('儲存簽名檔失敗')
  } finally {
    isSaving.value = false
  }
}

const handleLoadItem = async (item: SavedSignature) => {
  const signature = getSignatureInstance()
  if (!signature) return
  applyStyleSettings(item.settings)
  await nextTick()
  signature.load(item.imageData)
  editingId.value = item.id
  signatureName.value = item.name
  await nextTick()
  syncActionState()
  proxy?.$toast?.success?.(`已載入「${item.name}」`)
}

const handleDeleteItem = (item: SavedSignature) => {
  if (!storageKey.value) return
  if (!window.confirm(`確定要刪除「${item.name}」嗎？`)) return

  savedSignatures.value = savedSignatures.value.filter((s) => s.id !== item.id)
  persistSignatures()

  if (editingId.value === item.id) {
    handleStartNew()
  }

  proxy?.$toast?.success?.('已刪除簽名檔')
}

const handleStartNew = async () => {
  editingId.value = null
  signatureName.value = ''
  strokeColor.value = '#1a1a1a'
  padBackgroundColor.value = '#ffffff'
  transparentBackground.value = false
  strokeThickness.value = 'medium'
  handleClear()
  await nextTick()
  syncActionState()
}

const migrateLegacySignature = (legacy: LegacySavedSignature): SavedSignature => {
  const now = legacy.updatedAt || new Date().toISOString()
  return {
    id: createId(),
    name: '預設簽名',
    imageData: legacy.imageData,
    svgData: undefined,
    createdAt: now,
    updatedAt: now
  }
}

const loadSavedSignatures = () => {
  if (!storageKey.value) return

  const raw = storage.get<SavedSignature[] | LegacySavedSignature>(storageKey.value)
  if (!raw) {
    savedSignatures.value = []
    return
  }

  if (Array.isArray(raw)) {
    savedSignatures.value = raw.filter((item) => item?.id && item?.imageData)
    return
  }

  if (raw.imageData) {
    savedSignatures.value = [migrateLegacySignature(raw)]
    persistSignatures()
  }
}

const formatUpdatedAt = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  loadSavedSignatures()
  await nextTick()
  syncActionState()
})
</script>

<style scoped>
.user-signature-page {
  padding: 1rem;
}

.signature-style-panel {
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
}

.color-input {
  width: 2.75rem;
  height: 2.25rem;
  padding: 0.15rem;
}

.btn-upload-signature {
  color: #fff;
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.btn-upload-signature:hover,
.btn-upload-signature:focus {
  color: #fff;
  background-color: #0b5ed7;
  border-color: #0a58ca;
}

.signature-pad-wrap {
  height: 280px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.5rem;
  overflow: hidden;
  background: #fff;
}

.signature-pad-wrap.is-transparent {
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #e9ecef 25%, transparent 25%),
    linear-gradient(-45deg, #e9ecef 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e9ecef 75%),
    linear-gradient(-45deg, transparent 75%, #e9ecef 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.signature-pad-wrap :deep(#user-signature-pad),
.signature-pad-wrap :deep(.e-signature) {
  width: 100%;
  height: 100%;
}

.saved-signature-empty {
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 0.5rem;
}

.signature-list-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: background-color 0.15s ease;
}

.signature-list-item:last-child {
  border-bottom: none;
}

.signature-list-item.active {
  background: rgba(var(--bs-theme-rgb, 52, 143, 226), 0.12);
}

.signature-list-thumb {
  flex-shrink: 0;
  width: 72px;
  height: 52px;
  border-radius: 0.25rem;
  background: #fff;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.signature-list-thumb.is-transparent {
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #e9ecef 25%, transparent 25%),
    linear-gradient(-45deg, #e9ecef 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e9ecef 75%),
    linear-gradient(-45deg, transparent 75%, #e9ecef 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0;
}

.signature-list-thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.signature-list-body {
  min-width: 0;
  flex: 1;
}
</style>
