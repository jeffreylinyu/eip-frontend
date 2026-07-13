<template>
  <div class="self-check-photos-panel">
    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <h5 class="fw-bold mb-0">自主檢查照片</h5>
      <span class="badge bg-secondary">{{ photos.length }}</span>
      <div class="flex-grow-1"></div>
      <button
        v-if="photos.length > 1"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :disabled="uploading || loading"
        @click="showOrderModal = true"
      >
        <i class="fa fa-sort me-1"></i>編輯順序
      </button>
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="uploading || recordItems.length === 0"
        @click="triggerFilePick"
      >
        <i v-if="uploading" class="fa fa-spinner fa-spin me-1"></i>
        <i v-else class="fa fa-image me-1"></i>
        {{ uploading ? '上傳中…' : '選擇照片' }}
      </button>
      <input
        ref="fileInputRef"
        type="file"
        class="d-none"
        accept="image/*"
        multiple
        @change="onFilesPicked"
      />
    </div>

    <p v-if="recordItems.length === 0" class="text-muted small mb-3">
      尚無抽查項目，無法上傳照片。
    </p>
    <p v-else class="text-muted small mb-3">
      可一次選擇多張照片，選取後即自動上傳；下方欄位可直接修改，變更後自動儲存。縮圖右下角會顯示日期。
    </p>

    <div v-if="loading" class="text-center py-4 text-muted">
      <i class="fa fa-spinner fa-spin me-2"></i>載入照片中…
    </div>

    <div v-else-if="loadError" class="alert alert-danger py-2 mb-0">{{ loadError }}</div>

    <div v-else-if="photos.length === 0" class="text-center py-4 text-muted border rounded">
      尚無照片
    </div>

    <div v-else class="uploaded-photos">
      <div class="row g-3">
        <div v-for="photo in photos" :key="photo.id" class="col-12">
          <div class="uploaded-photo-card border rounded p-3">
            <div class="row g-3 align-items-start">
              <div class="col-md-3 col-lg-2">
                <SelfCheckInspectionPhotoThumb
                  :photo="photo"
                  :construction-id="constructionId"
                  :record-id="recordId"
                  :owner-type="ownerType"
                  :date-label="formatDate(drafts[photo.id]?.photoDate)"
                />
                <div class="small text-muted mt-1 text-truncate" :title="photo.fileName">
                  {{ photo.fileName }}
                </div>
              </div>
              <div v-if="drafts[photo.id]" class="col-md-9 col-lg-10 photo-form-fields">
                <div class="row g-2">
                  <div class="col-md-8">
                    <label class="form-label small text-muted mb-1">項目 <span class="text-danger">*</span></label>
                    <select
                      v-model.number="drafts[photo.id].recordItemId"
                      class="form-select form-select-sm photo-field-control"
                      @change="schedulePhotoSave(photo.id)"
                    >
                      <option :value="null" disabled>請選擇抽查項目</option>
                      <option v-for="opt in itemOptions" :key="opt.id" :value="opt.id">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small text-muted mb-1">日期</label>
                    <RepublicDatePicker
                      v-model="drafts[photo.id].photoDate"
                      input-class="form-control form-control-sm photo-field-control photo-date-input"
                      :use-republic-year="true"
                      @update:model-value="schedulePhotoSave(photo.id)"
                    />
                  </div>
                  <div class="col-12">
                    <label class="form-label small text-muted mb-1">位置</label>
                    <input
                      v-model="drafts[photo.id].photoLocation"
                      type="text"
                      class="form-control form-control-sm photo-field-control"
                      placeholder="位置"
                      @input="schedulePhotoSave(photo.id)"
                    />
                  </div>
                  <div class="col-12">
                    <div class="d-flex align-items-center justify-content-between gap-2 mb-1">
                      <label class="form-label small text-muted mb-0">說明</label>
                      <button
                        type="button"
                        class="btn btn-outline-secondary btn-sm photo-copy-btn"
                        :disabled="!drafts[photo.id].recordItemId"
                        @click="fillDescriptionFromActualSituation(photo.id)"
                      >
                        帶入抽查情形
                      </button>
                    </div>
                    <textarea
                      v-model="drafts[photo.id].description"
                      class="form-control form-control-sm photo-field-textarea"
                      rows="2"
                      placeholder="說明"
                      @input="schedulePhotoSave(photo.id)"
                    />
                  </div>
                </div>
                <div class="d-flex align-items-center gap-2 mt-2 justify-content-end">
                  <span v-if="savingPhotoId === photo.id" class="text-muted small">
                    <i class="fa fa-spinner fa-spin me-1"></i>儲存中…
                  </span>
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    :disabled="deletingId === photo.id || savingPhotoId === photo.id"
                    @click="removePhoto(photo)"
                  >
                    <i v-if="deletingId === photo.id" class="fa fa-spinner fa-spin me-1"></i>
                    <i v-else class="fa fa-trash me-1"></i>刪除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <SelfCheckInspectionPhotoOrderModal
      v-model:show="showOrderModal"
      :photos="photos"
      :construction-id="constructionId"
      :record-id="recordId"
      :owner-type="ownerType"
      @saved="onPhotosReordered"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onUnmounted, reactive, ref, watch } from 'vue'
import {
  selfCheckInspectionApi,
  type SelfCheckInspectionRecordPhoto,
  type SelfCheckOwnerType
} from '@/api/selfCheckInspection'
import type { SelfCheckFormItem } from '@/components/self-check/SelfCheckInspectionItemsTable.vue'
import SelfCheckInspectionPhotoThumb from '@/components/self-check/SelfCheckInspectionPhotoThumb.vue'
import SelfCheckInspectionPhotoOrderModal from '@/components/self-check/SelfCheckInspectionPhotoOrderModal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import { formatRepublicDateFromIso } from '@/utils/format'

const props = defineProps<{
  constructionId: string
  recordId: number
  ownerType: SelfCheckOwnerType
  recordItems: SelfCheckFormItem[]
  defaultDate?: string
  defaultLocation?: string
}>()

const instance = getCurrentInstance()
const proxy = instance?.proxy as { $toast?: { success: (m: string) => void; error: (m: string) => void } } | undefined

interface PhotoDraft {
  recordItemId: number | null
  photoDate: string
  photoLocation: string
  description: string
}

const AUTO_SAVE_DELAY_MS = 600

const fileInputRef = ref<HTMLInputElement | null>(null)
const photos = ref<SelfCheckInspectionRecordPhoto[]>([])
const drafts = reactive<Record<number, PhotoDraft>>({})
const loading = ref(false)
const loadError = ref('')
const uploading = ref(false)
const deletingId = ref<number | null>(null)
const savingPhotoId = ref<number | null>(null)
const showOrderModal = ref(false)

const saveTimers = new Map<number, ReturnType<typeof setTimeout>>()

function buildItemLabel(item: SelfCheckFormItem, index: number): string {
  const parts = [item.manageProject, item.checkPoint, item.workProcessDetail]
    .map((v) => v?.trim())
    .filter((v): v is string => !!v)
  const label = parts.length > 0 ? parts.join(' / ') : `項目 #${index + 1}`
  return label
}

const itemOptions = computed(() =>
  props.recordItems.map((item, index) => ({
    id: item.id,
    label: buildItemLabel(item, index)
  }))
)

function formatDate(value?: string | null): string {
  return formatRepublicDateFromIso(value)
}

function draftFromPhoto(photo: SelfCheckInspectionRecordPhoto): PhotoDraft {
  return {
    recordItemId: photo.recordItemId,
    photoDate: photo.photoDate?.slice(0, 10) ?? '',
    photoLocation: photo.photoLocation ?? '',
    description: photo.description ?? ''
  }
}

function syncDrafts(rows: SelfCheckInspectionRecordPhoto[]) {
  const ids = new Set(rows.map((p) => p.id))
  for (const key of Object.keys(drafts)) {
    const id = Number(key)
    if (!ids.has(id)) delete drafts[id]
  }
  for (const photo of rows) {
    drafts[photo.id] = draftFromPhoto(photo)
  }
}

function photoEqualsDraft(photo: SelfCheckInspectionRecordPhoto, draft: PhotoDraft): boolean {
  return (
    photo.recordItemId === draft.recordItemId &&
    (photo.photoDate?.slice(0, 10) ?? '') === draft.photoDate &&
    (photo.photoLocation ?? '') === draft.photoLocation &&
    (photo.description ?? '') === draft.description
  )
}

function defaultMetadata() {
  const recordItemId = props.recordItems[0]?.id
  if (!recordItemId) return null
  return {
    recordItemId,
    photoDate: props.defaultDate || null,
    photoLocation: props.defaultLocation || null,
    description: null as string | null
  }
}

function triggerFilePick() {
  fileInputRef.value?.click()
}

function clearSaveTimer(photoId: number) {
  const timer = saveTimers.get(photoId)
  if (timer) {
    clearTimeout(timer)
    saveTimers.delete(photoId)
  }
}

function schedulePhotoSave(photoId: number) {
  clearSaveTimer(photoId)
  saveTimers.set(
    photoId,
    setTimeout(() => {
      saveTimers.delete(photoId)
      void persistPhoto(photoId)
    }, AUTO_SAVE_DELAY_MS)
  )
}

function fillDescriptionFromActualSituation(photoId: number) {
  const draft = drafts[photoId]
  if (!draft?.recordItemId) {
    proxy?.$toast?.error('請先選擇抽查項目')
    return
  }
  const item = props.recordItems.find((it) => it.id === draft.recordItemId)
  const text = item?.actualSituation?.trim() ?? ''
  if (!text) {
    proxy?.$toast?.error('該項目尚無實際抽查情形')
    return
  }
  draft.description = text
  schedulePhotoSave(photoId)
}

async function persistPhoto(photoId: number) {
  const photo = photos.value.find((p) => p.id === photoId)
  const draft = drafts[photoId]
  if (!photo || !draft) return
  if (photoEqualsDraft(photo, draft)) return
  if (!draft.recordItemId) {
    proxy?.$toast?.error('請選擇對應抽查項目')
    return
  }

  savingPhotoId.value = photoId
  try {
    const updated = await selfCheckInspectionApi.updatePhoto(
      props.constructionId,
      props.recordId,
      photoId,
      props.ownerType,
      {
        recordItemId: draft.recordItemId,
        photoDate: draft.photoDate || null,
        photoLocation: draft.photoLocation || null,
        description: draft.description || null
      }
    )
    photos.value = photos.value.map((p) => (p.id === photoId ? updated : p))
    drafts[photoId] = draftFromPhoto(updated)
  } catch (e: unknown) {
    console.error(e)
    drafts[photoId] = draftFromPhoto(photo)
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '儲存失敗'
    proxy?.$toast?.error(msg)
  } finally {
    if (savingPhotoId.value === photoId) savingPhotoId.value = null
  }
}

async function onFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0) return

  const meta = defaultMetadata()
  if (!meta) {
    proxy?.$toast?.error('尚無抽查項目，無法上傳照片')
    return
  }

  uploading.value = true
  try {
    const metadata = files.map(() => ({ ...meta }))
    const uploaded = await selfCheckInspectionApi.uploadPhotos(
      props.constructionId,
      props.recordId,
      props.ownerType,
      files,
      metadata
    )
    photos.value = [...photos.value, ...uploaded]
    for (const photo of uploaded) {
      drafts[photo.id] = draftFromPhoto(photo)
    }
    proxy?.$toast?.success(`已上傳 ${uploaded.length} 張照片`)
  } catch (e: unknown) {
    console.error(e)
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '上傳失敗'
    proxy?.$toast?.error(msg)
  } finally {
    uploading.value = false
  }
}

async function loadPhotos() {
  if (!props.constructionId || !props.recordId) return
  loading.value = true
  loadError.value = ''
  try {
    photos.value = await selfCheckInspectionApi.listPhotos(
      props.constructionId,
      props.recordId,
      props.ownerType
    )
    syncDrafts(photos.value)
  } catch (e: unknown) {
    console.error(e)
    loadError.value =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '載入照片失敗'
  } finally {
    loading.value = false
  }
}

function onPhotosReordered(rows: SelfCheckInspectionRecordPhoto[]) {
  photos.value = rows
  syncDrafts(rows)
}

async function removePhoto(photo: SelfCheckInspectionRecordPhoto) {
  if (!window.confirm(`確定刪除「${photo.fileName}」？`)) return
  clearSaveTimer(photo.id)
  deletingId.value = photo.id
  try {
    await selfCheckInspectionApi.deletePhoto(
      props.constructionId,
      props.recordId,
      photo.id,
      props.ownerType
    )
    photos.value = photos.value.filter((p) => p.id !== photo.id)
    delete drafts[photo.id]
    proxy?.$toast?.success('已刪除')
  } catch (e) {
    console.error(e)
    proxy?.$toast?.error('刪除失敗')
  } finally {
    deletingId.value = null
  }
}

watch(
  () => [props.constructionId, props.recordId, props.ownerType] as const,
  () => {
    for (const photoId of saveTimers.keys()) clearSaveTimer(photoId)
    void loadPhotos()
  },
  { immediate: true }
)

onUnmounted(() => {
  for (const photoId of saveTimers.keys()) clearSaveTimer(photoId)
})
</script>

<style scoped>
.uploaded-photo-card {
  background: rgba(255, 255, 255, 0.02);
}

/* 與 RepublicDatePicker（35px）等高 */
.photo-form-fields :deep(.photo-field-control.form-control),
.photo-form-fields :deep(.photo-field-control.form-select) {
  min-height: 35px;
  height: 35px;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  line-height: 1.25;
}

.photo-form-fields :deep(.republic-date-picker .dp__main) {
  height: 35px !important;
  min-height: 35px !important;
}

.photo-form-fields :deep(.photo-date-input .dp__input) {
  text-align: left !important;
  padding-left: 2rem !important;
  padding-right: 0.75rem !important;
}

.photo-form-fields :deep(.photo-field-textarea) {
  min-height: 4.5rem;
  resize: vertical;
}

.photo-copy-btn {
  font-size: 0.75rem;
  line-height: 1.2;
  padding: 0.15rem 0.45rem;
  white-space: nowrap;
}
</style>
