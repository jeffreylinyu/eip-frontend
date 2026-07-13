<template>
  <button
    type="button"
    class="btn b2-export-btn"
    :class="buttonClass"
    :disabled="disabled || loading"
    :title="title"
    @click="$emit('click', $event)"
  >
    <i class="fa" :class="loading ? 'fa-spinner fa-spin' : 'fa-file-word'"></i>
    <span v-if="!iconOnly">{{ loading ? loadingLabel : label }}</span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    disabled?: boolean
    loading?: boolean
    label?: string
    loadingLabel?: string
    title?: string
    iconOnly?: boolean
    buttonClass?: string | Record<string, boolean> | Array<string>
  }>(),
  {
    disabled: false,
    loading: false,
    label: '匯出 Word',
    loadingLabel: '匯出中…',
    title: '匯出 Word 檔案',
    iconOnly: false
  }
)

defineEmits<{
  click: [MouseEvent]
}>()
</script>
