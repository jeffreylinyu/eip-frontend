<template>
  <div class="supervisory-participation-units">
    <ParticipationUnitsView />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useWorkspaceStore } from '@/stores/workspace'
import ParticipationUnitsView from '@/views/basic/ParticipationUnits.vue'

const { initViewType } = useViewPerspective()
const workspaceStore = useWorkspaceStore()

onMounted(async () => {
  // 初始化視角
  if (workspaceStore.currentWorkspace?.id) {
    await initViewType(workspaceStore.currentWorkspace.id)
  }
})
</script>

