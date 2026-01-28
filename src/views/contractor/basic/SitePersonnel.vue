<template>
  <div class="contractor-site-personnel">
    <div class="view-badge mb-3">
      <span class="badge bg-success">
        <i class="bi bi-eye me-1"></i>
        營造視角
      </span>
    </div>
    <SitePersonnelView />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useWorkspaceStore } from '@/stores/workspace'
import SitePersonnelView from '@/views/basic/SitePersonnel.vue'

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
