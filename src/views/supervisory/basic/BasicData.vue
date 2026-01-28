<template>
  <div class="supervisory-basic-data">
    <div class="view-badge mb-3">
      <span class="badge bg-primary">
        <i class="bi bi-eye me-1"></i>
        監造視角
      </span>
    </div>
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

<style scoped>
.view-badge {
  display: flex;
  justify-content: flex-end;
}
</style>
