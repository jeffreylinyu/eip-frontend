<template>
  <a
    v-if="displayUrl && interactive"
    class="photo-thumb-link"
    href="#"
    :title="photo.fileName || '預覽'"
    @click.prevent="onOpen"
  >
    <img class="photo-thumb-img" :src="displayUrl" :alt="photo.fileName" draggable="false" />
    <span v-if="dateLabel && dateLabel !== '—'" class="photo-date-badge">{{ dateLabel }}</span>
    <span class="photo-thumb-hint"><i class="fa fa-up-right-from-square me-1"></i>預覽</span>
  </a>
  <div v-else-if="displayUrl" class="photo-thumb-static">
    <img class="photo-thumb-img" :src="displayUrl" :alt="photo.fileName" draggable="false" />
    <span v-if="dateLabel && dateLabel !== '—'" class="photo-date-badge">{{ dateLabel }}</span>
  </div>
  <div v-else class="photo-thumb-empty">
    <span v-if="loading" class="text-muted small">載入中…</span>
    <span v-else class="text-muted small">無法預覽</span>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import {
  selfCheckInspectionApi,
  type SelfCheckInspectionRecordPhoto,
  type SelfCheckOwnerType
} from '@/api/selfCheckInspection'
import { openFilePreviewOrDownload } from '@/utils/openFilePreview'

const props = withDefaults(
  defineProps<{
    photo: SelfCheckInspectionRecordPhoto
    constructionId: string
    recordId: number
    ownerType: SelfCheckOwnerType
    /** 民國日期顯示（疊加於縮圖右下角） */
    dateLabel?: string
    /** 是否可點擊預覽（排序 modal 等場景設為 false） */
    interactive?: boolean
  }>(),
  { interactive: true }
)

const displayUrl = ref<string | null>(props.photo.signedUrl ?? null)
const loading = ref(false)

let blobObjectUrl: string | null = null

function revokeBlob() {
  if (blobObjectUrl) {
    URL.revokeObjectURL(blobObjectUrl)
    blobObjectUrl = null
  }
}

async function ensurePreviewUrl() {
  revokeBlob()
  if (props.photo.signedUrl) {
    displayUrl.value = props.photo.signedUrl
    return
  }
  loading.value = true
  displayUrl.value = null
  try {
    const blob = await selfCheckInspectionApi.downloadPhotoBlob(
      props.constructionId,
      props.recordId,
      props.photo.id,
      props.ownerType
    )
    const url = URL.createObjectURL(blob)
    blobObjectUrl = url
    displayUrl.value = url
  } catch {
    displayUrl.value = null
  } finally {
    loading.value = false
  }
}

async function fetchBlob(): Promise<Blob> {
  return selfCheckInspectionApi.downloadPhotoBlob(
    props.constructionId,
    props.recordId,
    props.photo.id,
    props.ownerType
  )
}

async function onOpen() {
  if (!displayUrl.value) {
    await ensurePreviewUrl()
  }
  await openFilePreviewOrDownload({
    url: displayUrl.value,
    fileName: props.photo.fileName,
    contentType: props.photo.contentType ?? undefined,
    fetchBlob
  })
}

watch(
  () => [props.photo.id, props.photo.signedUrl, props.constructionId, props.recordId] as const,
  () => {
    void ensurePreviewUrl()
  },
  { immediate: true }
)

onUnmounted(() => revokeBlob())
</script>

<style scoped>
.photo-thumb-link {
  display: block;
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 0.375rem;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.photo-thumb-static {
  display: block;
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 0.375rem;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  pointer-events: none;
}

.photo-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.photo-date-badge {
  position: absolute;
  right: 0.35rem;
  bottom: 0.35rem;
  font-size: 0.7rem;
  padding: 0.2rem 0.45rem;
  border-radius: 0.25rem;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  line-height: 1.2;
  pointer-events: none;
  max-width: calc(100% - 0.7rem);
  text-align: right;
}

.photo-thumb-hint {
  position: absolute;
  right: 0.35rem;
  top: 0.35rem;
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.photo-thumb-link:hover .photo-thumb-hint {
  opacity: 1;
}

.photo-thumb-empty {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.04);
}
</style>
