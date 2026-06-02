<script setup lang="ts">
import { computed, onMounted } from 'vue'

type AttachImage = {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}

const props = defineProps<{
  img: AttachImage
  loading?: boolean
  failed?: boolean
  fetchBlob: () => Promise<Blob>
  ensurePreview: () => Promise<void> | void
}>()

const altText = computed(() => props.img.fileName || props.img.objectName || 'attachment')

onMounted(() => {
  // 讓外層有機會先取得 signedUrl（或 fallback blob url）
  if (!props.img.signedUrl && !props.loading && !props.failed) {
    try {
      void props.ensurePreview()
    } catch {
      /* ignore */
    }
  }
})
</script>

<template>
  <div class="cm-attach-thumb">
    <div class="cm-attach-thumb__frame" :class="{ 'is-loading': !!loading, 'is-failed': !!failed }">
      <template v-if="img.signedUrl">
        <img class="cm-attach-thumb__img" :src="img.signedUrl" :alt="altText" loading="lazy" />
      </template>
      <template v-else-if="loading">
        <div class="cm-attach-thumb__placeholder">
          <i class="fa fa-spinner fa-spin me-2" aria-hidden="true"></i>載入中…
        </div>
      </template>
      <template v-else-if="failed">
        <div class="cm-attach-thumb__placeholder">
          <i class="fa fa-triangle-exclamation me-2" aria-hidden="true"></i>無法預覽
        </div>
      </template>
      <template v-else>
        <button type="button" class="cm-attach-thumb__placeholder cm-attach-thumb__retry" @click="ensurePreview()">
          <i class="fa fa-image me-2" aria-hidden="true"></i>載入預覽
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cm-attach-thumb {
  width: 110px;
  height: 76px;
}

.cm-attach-thumb__frame {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cm-attach-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cm-attach-thumb__placeholder {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.65);
  font-size: 0.8rem;
  padding: 0.35rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cm-attach-thumb__retry {
  cursor: pointer;
}

.cm-attach-thumb__frame.is-failed {
  border-color: rgba(220, 38, 38, 0.35);
  background: rgba(220, 38, 38, 0.06);
}
</style>

