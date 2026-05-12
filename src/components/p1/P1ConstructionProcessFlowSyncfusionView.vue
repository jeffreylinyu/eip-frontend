<script setup lang="ts">
import { ref } from 'vue'
import FlowGraphSyncfusionView from '@/components/diagram/FlowGraphSyncfusionView.vue'

defineProps<{
  /** P-1 施工流程圖 JSON（type=graph, nodes, edges） */
  flowJson: string
  displayMode?: 'flow' | 'organization'
}>()

const innerRef = ref<{ exportPngBlob?: () => Promise<Blob | null> } | null>(null)

defineExpose({
  exportPngBlob: async () => (await innerRef.value?.exportPngBlob?.()) ?? null
})
</script>

<template>
  <FlowGraphSyncfusionView ref="innerRef" :flow-json="flowJson" :display-mode="displayMode" />
</template>

