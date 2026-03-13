<template>
  <div class="supervisory-basic-data">
    <BasicDataView />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective'
import { useWorkspaceStore } from '@/stores/workspace'
import BasicDataView from '@/views/basic/BasicData.vue'

const { viewType, initViewType } = useViewPerspective()
const workspaceStore = useWorkspaceStore()

onMounted(async () => {
  // 初始化視角
  if (workspaceStore.currentWorkspace?.id) {
    await initViewType(workspaceStore.currentWorkspace.id)
  }
})
</script>

