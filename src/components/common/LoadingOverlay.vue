<template>
  <div v-if="show" class="loading-overlay" role="status" aria-live="polite">
    <div class="spinner-border loading-overlay-spinner text-light" role="status">
      <span class="visually-hidden">{{ text || '載入中...' }}</span>
    </div>
    <p v-if="text" class="loading-overlay-text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  /** 選填，不傳則只顯示 spinner */
  text?: string
}>()
</script>
