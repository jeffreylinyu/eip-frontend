<template>
  <Modal
    v-model:show="visible"
    title="編輯照片順序"
    icon="fa fa-sort"
    size="xl"
    modal-id="selfCheckPhotoOrderModal"
    :draggable="false"
    :resizable="false"
    confirm-text="儲存順序"
    confirm-icon="fa fa-check"
    :is-loading="saving"
    loading-text="儲存中…"
    @hide="handleClose"
    @confirm="handleSave"
  >
    <p class="text-muted small mb-3">
      拖曳照片以調整順序，由上到下、由左至右為匯出與列表顯示順序。
    </p>

    <draggable
      v-model="localPhotos"
      item-key="id"
      class="photo-order-grid"
      :animation="200"
      ghost-class="photo-order-ghost"
      drag-class="photo-order-drag"
      chosen-class="photo-order-chosen"
    >
      <template #item="{ element: photo, index }">
        <div class="photo-order-item" :title="photo.fileName">
          <span class="photo-order-index">{{ index + 1 }}</span>
          <div class="photo-order-thumb">
            <SelfCheckInspectionPhotoThumb
              :photo="photo"
              :construction-id="constructionId"
              :record-id="recordId"
              :owner-type="ownerType"
              :interactive="false"
            />
          </div>
          <div class="photo-order-caption text-truncate" :title="photo.fileName">
            {{ photo.fileName }}
          </div>
          <div v-if="photo.recordItemLabel" class="photo-order-item-label text-truncate" :title="photo.recordItemLabel">
            {{ photo.recordItemLabel }}
          </div>
        </div>
      </template>
    </draggable>
  </Modal>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import Modal from '@/components/bootstrap/Modal.vue'
import SelfCheckInspectionPhotoThumb from '@/components/self-check/SelfCheckInspectionPhotoThumb.vue'
import {
  selfCheckInspectionApi,
  type SelfCheckInspectionRecordPhoto,
  type SelfCheckOwnerType
} from '@/api/selfCheckInspection'

const props = defineProps<{
  show: boolean
  photos: SelfCheckInspectionRecordPhoto[]
  constructionId: string
  recordId: number
  ownerType: SelfCheckOwnerType
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  saved: [photos: SelfCheckInspectionRecordPhoto[]]
}>()

const instance = getCurrentInstance()
const proxy = instance?.proxy as { $toast?: { success: (m: string) => void; error: (m: string) => void } } | undefined

const localPhotos = ref<SelfCheckInspectionRecordPhoto[]>([])
const saving = ref(false)

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
})

function clonePhotos(rows: SelfCheckInspectionRecordPhoto[]) {
  return rows.map((photo) => ({ ...photo }))
}

function orderChanged(): boolean {
  if (localPhotos.value.length !== props.photos.length) return true
  return localPhotos.value.some((photo, index) => photo.id !== props.photos[index]?.id)
}

function handleClose() {
  if (saving.value) return
  emit('update:show', false)
}

async function handleSave() {
  if (!orderChanged()) {
    emit('update:show', false)
    return
  }

  saving.value = true
  try {
    const photoIds = localPhotos.value.map((photo) => photo.id)
    const updated = await selfCheckInspectionApi.reorderPhotos(
      props.constructionId,
      props.recordId,
      props.ownerType,
      photoIds
    )
    emit('saved', updated)
    emit('update:show', false)
    proxy?.$toast?.success('照片順序已儲存')
  } catch (e: unknown) {
    console.error(e)
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '儲存順序失敗'
    proxy?.$toast?.error(msg)
    localPhotos.value = clonePhotos(props.photos)
  } finally {
    saving.value = false
  }
}

watch(
  () => props.show,
  (open) => {
    if (open) {
      localPhotos.value = clonePhotos(props.photos)
    }
  }
)
</script>

<style scoped>
.photo-order-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
  min-height: 120px;
}

.photo-order-item {
  position: relative;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
  cursor: grab;
  user-select: none;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.photo-order-item:active {
  cursor: grabbing;
}

.photo-order-index {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  z-index: 1;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.photo-order-thumb {
  width: 100%;
  border-radius: 0.375rem;
  overflow: hidden;
}

.photo-order-caption {
  margin-top: 0.4rem;
  font-size: 0.75rem;
  color: var(--bs-body-color);
}

.photo-order-item-label {
  margin-top: 0.15rem;
  font-size: 0.7rem;
  color: var(--bs-secondary-color);
}

.photo-order-ghost {
  opacity: 0.45;
}

.photo-order-chosen {
  box-shadow: 0 0 0 2px rgba(var(--bs-primary-rgb), 0.35);
}

.photo-order-drag {
  opacity: 0.9;
}
</style>
