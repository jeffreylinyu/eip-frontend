<script setup lang="ts">
import AiBatchModalEngineering from '@/components/dashboard/AiBatchModalEngineering.vue'
import { ENGINEERING_PHASES, useAiBatchEngineeringBuild } from '@/composables/useAiBatchEngineeringBuild'

const {
  currentProject,
  aiBatchModalOpen,
  aiBatchProgress,
  aiBatchError,
  displayedPercent,
  phaseIndex,
  visibleSubs,
  coreStates,
  startAiBatchGenerate,
  closeAiBatchModal
} = useAiBatchEngineeringBuild()
</script>

<template>
  <div class="engineering-data-build-header">
    <button
      type="button"
      class="btn-ai-generate header-engineering-data-build-btn"
      :disabled="!currentProject?.id"
      title="針對目前選定工程案，依視角一次執行全部 AI 生成"
      @click="startAiBatchGenerate"
    >
      <i class="fa fa-wand-magic-sparkles me-2" aria-hidden="true"></i>
      <span class="d-none d-lg-inline">工程案資料建構</span>
      <span class="d-lg-none">資料建構</span>
    </button>

    <AiBatchModalEngineering
      v-if="aiBatchModalOpen"
      :open="aiBatchModalOpen"
      :progress="aiBatchProgress"
      :error="aiBatchError"
      :displayed-percent="displayedPercent"
      :phase-index="phaseIndex"
      :visible-subs="visibleSubs"
      :core-states="coreStates"
      :phases="ENGINEERING_PHASES"
      @close="closeAiBatchModal"
    />
  </div>
</template>

<style scoped>
.header-engineering-data-build-btn {
  padding: 0.35rem 0.85rem;
  font-size: 0.8125rem;
  white-space: nowrap;
}
</style>
