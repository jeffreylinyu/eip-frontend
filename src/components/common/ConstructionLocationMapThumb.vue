<script setup lang="ts">
/**
 * 工程位置圖／圖說縮圖：優先使用 list API 的 signedUrl；若後端無法產生簽名 URL（常見於 ADC），
 * 改以帶 JWT 的 download 端點拉取 blob 預覽。
 */
import { computed, ref, watch, onUnmounted } from 'vue'
import http from '@/api/http'
import type { ConstructionLocationMapImageInfo } from '@/api/constructionLocationMaps'

const props = withDefaults(
  defineProps<{
    img: ConstructionLocationMapImageInfo
    constructionId: string
    designChangeId?: number | null
    /** P 類動態「預定作業進度圖」等需帶文件分類列 id */
    documentClassificationId?: number | null
    type: string
    linkClass?: string
    emptyClass?: string
    showB2Overlay?: boolean
    thumbHeight?: string
  }>(),
  {
    linkClass: '',
    emptyClass: '',
    showB2Overlay: false,
    designChangeId: undefined,
    documentClassificationId: undefined,
    thumbHeight: '200px',
  }
)

const displayUrl = ref<string | null>(props.img.signedUrl ?? null)
const loading = ref(false)

let blobObjectUrl: string | null = null
const thumbStyle = computed(() => ({ height: props.thumbHeight }))

function revokeBlob() {
  if (blobObjectUrl) {
    URL.revokeObjectURL(blobObjectUrl)
    blobObjectUrl = null
  }
}

async function ensurePreviewUrl() {
  revokeBlob()
  if (props.img.signedUrl) {
    displayUrl.value = props.img.signedUrl
    return
  }
  loading.value = true
  displayUrl.value = null
  try {
    const params: Record<string, string | number> = {
      constructionId: props.constructionId,
      type: props.type,
    }
    if (props.designChangeId != null && props.designChangeId !== undefined) {
      params.designChangeId = props.designChangeId
    }
    if (props.documentClassificationId != null && props.documentClassificationId !== undefined) {
      params.documentClassificationId = props.documentClassificationId
    }
    const raw = await http.get(`/management/construction/location-maps/download/${props.img.id}`, {
      params,
      responseType: 'blob',
    })
    const blob = raw as unknown as Blob
    if (!(blob instanceof Blob) || blob.size === 0) {
      displayUrl.value = null
      return
    }
    const url = URL.createObjectURL(blob)
    blobObjectUrl = url
    displayUrl.value = url
  } catch {
    displayUrl.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () =>
    [
      props.img.id,
      props.img.signedUrl,
      props.constructionId,
      props.designChangeId,
      props.documentClassificationId,
      props.type
    ] as const,
  () => {
    void ensurePreviewUrl()
  },
  { immediate: true }
)

onUnmounted(() => revokeBlob())
</script>

<template>
  <a
    v-if="displayUrl"
    class="loc-thumb__link"
    :class="linkClass"
    :style="thumbStyle"
    :href="displayUrl"
    target="_blank"
    rel="noopener"
    :title="img.fileName"
  >
    <img class="loc-thumb__img" :src="displayUrl" :alt="img.fileName" />
    <div v-if="showB2Overlay" class="loc-thumb__overlay">
      <span class="loc-thumb__hint"><i class="fa fa-up-right-from-square me-1"></i>開啟</span>
    </div>
  </a>
  <div v-else class="loc-thumb__empty" :class="emptyClass" :style="thumbStyle">
    <span v-if="loading" class="text-muted small">載入中…</span>
    <span v-else class="text-muted small">無法預覽</span>
  </div>
</template>

<style scoped>
.loc-thumb__link {
  display: block;
  width: 100%;
  overflow: hidden;
}

.loc-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
}

.loc-thumb__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
</style>
