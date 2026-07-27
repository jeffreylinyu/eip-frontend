<script setup lang="ts">
import { computed, ref } from 'vue'
import AiBatchModalEngineering from '@/components/dashboard/AiBatchModalEngineering.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import { ENGINEERING_PHASES, useAiBatchEngineeringBuild } from '@/composables/useAiBatchEngineeringBuild'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { getDesignChangeList, type DesignChangeItem } from '@/api/designChange'

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

const { isSupervisory } = useViewPerspective()
const versionModalOpen = ref(false)
const loadingVersions = ref(false)
const designChanges = ref<DesignChangeItem[]>([])
const selectedVersionKey = ref('original')

const sourceType = computed(() => isSupervisory.value ? 'SUPERVISORY' : 'CONTRACTOR')

function versionLabel(item: DesignChangeItem, index: number): string {
  return item.versionName?.trim() || `變更設計${index + 1}`
}

async function handleBuildClick() {
  const constructionId = currentProject.value?.id
  if (!constructionId || loadingVersions.value) return

  loadingVersions.value = true
  try {
    const list = await getDesignChangeList(constructionId, sourceType.value, undefined, false)
    designChanges.value = [...list].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    )

    if (designChanges.value.length === 0) {
      await startAiBatchGenerate(null)
      return
    }

    selectedVersionKey.value = String(designChanges.value[designChanges.value.length - 1].id)
    versionModalOpen.value = true
  } catch {
    window.alert('無法取得變更設計版本，請稍後再試。')
  } finally {
    loadingVersions.value = false
  }
}

async function confirmVersionAndStart() {
  const designChangeId =
    selectedVersionKey.value === 'original' ? null : Number(selectedVersionKey.value)
  if (designChangeId !== null && !Number.isFinite(designChangeId)) return

  versionModalOpen.value = false
  await startAiBatchGenerate(designChangeId)
}
</script>

<template>
  <div class="engineering-data-build-header">
    <button
      type="button"
      class="btn-ai-generate header-engineering-data-build-btn"
      :disabled="!currentProject?.id || loadingVersions"
      title="針對目前選定工程案執行資料建構；有變更設計時可選擇版本"
      @click="handleBuildClick"
    >
      <i
        class="fa me-2"
        :class="loadingVersions ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
        aria-hidden="true"
      ></i>
      <span>資料建構</span>
    </button>

    <Modal
      v-model:show="versionModalOpen"
      title="選擇資料建構版本"
      icon="fa fa-code-branch"
      size="sm"
      confirm-text="開始資料建構"
      confirm-icon="fa fa-wand-magic-sparkles"
      @confirm="confirmVersionAndStart"
    >
      <template #body>
        <p class="text-muted mb-3">此工程案有多個資料版本，請選擇本次資料建構要寫入的版本。</p>
        <label class="form-label fw-semibold" for="header-ai-build-version">資料版本</label>
        <select
          id="header-ai-build-version"
          v-model="selectedVersionKey"
          class="form-select"
        >
          <option value="original">原契約</option>
          <option
            v-for="(item, index) in designChanges"
            :key="item.id"
            :value="String(item.id)"
          >
            {{ versionLabel(item, index) }}
          </option>
        </select>
      </template>
    </Modal>

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
