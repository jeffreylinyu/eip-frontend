<template>
  <div class="contractor-basic-data">
    <div class="view-badge mb-3">
      <span class="badge bg-success">
        <i class="bi bi-eye me-1"></i>
        營造視角
      </span>
    </div>
    <BasicDataView />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useWorkspaceStore } from '@/stores/workspace'
import BasicDataView from '@/views/basic/BasicData.vue'

const { initViewType } = useViewPerspective()
const workspaceStore = useWorkspaceStore()

onMounted(async () => {
  // 初始化視角
  if (workspaceStore.currentWorkspace?.id) {
    await initViewType(workspaceStore.currentWorkspace.id)
  }
})
</script>

<style scoped>
.view-badge {
  display: flex;
  justify-content: flex-end;
}
</style>
