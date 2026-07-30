<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AiBatchModalEngineering from '@/components/dashboard/AiBatchModalEngineering.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import { useAiBatchEngineeringBuild } from '@/composables/useAiBatchEngineeringBuild'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { getDesignChangeList, type DesignChangeItem } from '@/api/designChange'
import {
  getPlanGenerationOptions,
  type PlanGenerationOption
} from '@/api/aiBatchGenerate'

const {
  currentProject,
  aiBatchModalOpen,
  aiBatchProgress,
  aiBatchError,
  batchMode,
  activePhases,
  displayedPercent,
  phaseIndex,
  visibleSubs,
  coreStates,
  startAiBatchGenerate,
  startPlanBatchGenerate,
  closeAiBatchModal
} = useAiBatchEngineeringBuild()

const { isSupervisory } = useViewPerspective()
const actionModalOpen = ref(false)
const versionModalOpen = ref(false)
const planModalOpen = ref(false)
const loadingVersions = ref(false)
const loadingPlanOptions = ref(false)
const designChanges = ref<DesignChangeItem[]>([])
const selectedVersionKey = ref('original')
const planOptions = ref<PlanGenerationOption[]>([])
const selectedPlanKeys = ref<string[]>([])
let planOptionsRequestId = 0

const sourceType = computed<'SUPERVISORY' | 'CONTRACTOR'>(() =>
  isSupervisory.value ? 'SUPERVISORY' : 'CONTRACTOR'
)
const allPlansSelected = computed(
  () => planOptions.value.length > 0 && selectedPlanKeys.value.length === planOptions.value.length
)
const selectedExistingPlans = computed(() =>
  planOptions.value.filter(
    (option) => option.hasExistingData && selectedPlanKeys.value.includes(option.key)
  )
)

function versionLabel(item: DesignChangeItem, index: number): string {
  return item.versionName?.trim() || `變更設計${index + 1}`
}

function selectedDesignChangeId(): number | null {
  if (selectedVersionKey.value === 'original') return null
  const id = Number(selectedVersionKey.value)
  return Number.isFinite(id) ? id : null
}

async function loadVersions() {
  const constructionId = currentProject.value?.id
  if (!constructionId) return
  const list = await getDesignChangeList(constructionId, sourceType.value, undefined, false)
  designChanges.value = [...list].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  )
}

async function handleBuildClick() {
  const constructionId = currentProject.value?.id
  if (!constructionId || loadingVersions.value) return

  actionModalOpen.value = false
  loadingVersions.value = true
  try {
    await loadVersions()
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
  versionModalOpen.value = false
  await startAiBatchGenerate(selectedDesignChangeId())
}

async function loadPlanOptions() {
  const constructionId = currentProject.value?.id
  if (!constructionId) return
  const requestId = ++planOptionsRequestId
  loadingPlanOptions.value = true
  planOptions.value = []
  selectedPlanKeys.value = []
  try {
    const options = await getPlanGenerationOptions(
      constructionId,
      sourceType.value,
      selectedDesignChangeId()
    )
    if (requestId !== planOptionsRequestId) return
    planOptions.value = options
    selectedPlanKeys.value = options.map((option) => option.key)
  } catch {
    if (requestId === planOptionsRequestId) {
      window.alert('無法取得計劃書清單，請稍後再試。')
    }
  } finally {
    if (requestId === planOptionsRequestId) loadingPlanOptions.value = false
  }
}

async function handlePlanClick() {
  if (!currentProject.value?.id || loadingVersions.value) return
  actionModalOpen.value = false
  loadingVersions.value = true
  try {
    await loadVersions()
    selectedVersionKey.value = designChanges.value.length
      ? String(designChanges.value[designChanges.value.length - 1].id)
      : 'original'
    await loadPlanOptions()
    planModalOpen.value = true
  } catch {
    window.alert('無法取得計劃書資料，請稍後再試。')
  } finally {
    loadingVersions.value = false
  }
}

function toggleAllPlans() {
  selectedPlanKeys.value = allPlansSelected.value
    ? []
    : planOptions.value.map((option) => option.key)
}

async function confirmPlanGeneration() {
  if (selectedPlanKeys.value.length === 0 || loadingPlanOptions.value) return
  if (selectedExistingPlans.value.length > 0) {
    const names = selectedExistingPlans.value.map((option) => `・${option.label}`).join('\n')
    const confirmed = window.confirm(
      `下列計劃書已有可生成內容，本次生成將覆寫相關欄位：\n\n${names}\n\n確定繼續？`
    )
    if (!confirmed) return
  }
  const planKeys = [...selectedPlanKeys.value]
  const designChangeId = selectedDesignChangeId()
  planModalOpen.value = false
  await startPlanBatchGenerate(designChangeId, planKeys)
}

watch(selectedVersionKey, () => {
  if (planModalOpen.value) void loadPlanOptions()
})
</script>

<template>
  <div class="engineering-data-build-header">
    <button
      type="button"
      class="btn-ai-generate header-engineering-data-build-btn"
      :disabled="!currentProject?.id || loadingVersions"
      title="選擇全案資料建構或計劃書生成"
      @click="actionModalOpen = true"
    >
      <i
        class="fa me-2"
        :class="loadingVersions ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
        aria-hidden="true"
      ></i>
      <span>資料建構</span>
    </button>

    <Modal
      v-model:show="actionModalOpen"
      title="選擇資料建構方式"
      icon="fa fa-wand-magic-sparkles"
      size="lg"
      :hide-footer="true"
    >
      <template #body>
        <p class="text-muted mb-3">請選擇本次要執行的資料建構方式。</p>
        <div class="build-action-options">
          <button type="button" class="build-action-option" @click="handleBuildClick">
            <span class="build-action-option__icon">
              <i class="fa fa-diagram-project" aria-hidden="true"></i>
            </span>
            <span class="build-action-option__content">
              <span class="build-action-option__title">全案資料建構</span>
              <span class="build-action-option__description">
                建立施工項目、施工要領、抽查標準與材料管控資料，不包含計劃書。
              </span>
            </span>
            <i class="fa fa-chevron-right text-muted" aria-hidden="true"></i>
          </button>

          <button type="button" class="build-action-option" @click="handlePlanClick">
            <span class="build-action-option__icon">
              <i class="fa fa-file-lines" aria-hidden="true"></i>
            </span>
            <span class="build-action-option__content">
              <span class="build-action-option__title">計劃書生成</span>
              <span class="build-action-option__description">
                選擇版本與計劃書，獨立生成 B 類或 P 類計劃書內容。
              </span>
            </span>
            <i class="fa fa-chevron-right text-muted" aria-hidden="true"></i>
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      v-model:show="versionModalOpen"
      title="選擇全案資料建構版本"
      icon="fa fa-code-branch"
      size="sm"
      confirm-text="開始全案資料建構"
      confirm-icon="fa fa-wand-magic-sparkles"
      @confirm="confirmVersionAndStart"
    >
      <template #body>
        <p class="text-muted mb-3">此工程案有多個資料版本，請選擇本次資料建構要寫入的版本。</p>
        <label class="form-label fw-semibold" for="header-ai-build-version">資料版本</label>
        <select id="header-ai-build-version" v-model="selectedVersionKey" class="form-select">
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

    <Modal
      v-model:show="planModalOpen"
      title="計劃書生成"
      icon="fa fa-file-lines"
      size="lg"
      :hide-confirm-button="true"
    >
      <template #body>
        <div class="mb-4">
          <label class="form-label fw-semibold" for="header-plan-version">資料版本</label>
          <select id="header-plan-version" v-model="selectedVersionKey" class="form-select">
            <option value="original">原契約</option>
            <option
              v-for="(item, index) in designChanges"
              :key="item.id"
              :value="String(item.id)"
            >
              {{ versionLabel(item, index) }}
            </option>
          </select>
        </div>

        <div class="d-flex align-items-center justify-content-between mb-2">
          <div class="fw-semibold">選擇要生成的計劃書</div>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="loadingPlanOptions || planOptions.length === 0"
            @click="toggleAllPlans"
          >
            {{ allPlansSelected ? '取消全選' : '全選' }}
          </button>
        </div>

        <div v-if="loadingPlanOptions" class="text-center text-muted py-4">
          <span class="spinner-border spinner-border-sm me-2"></span>
          讀取計劃書狀態…
        </div>
        <div v-else-if="planOptions.length === 0" class="alert alert-info mb-0">
          此版本目前沒有可生成的計劃書。
        </div>
        <div v-else class="plan-option-list">
          <label
            v-for="option in planOptions"
            :key="option.key"
            class="plan-option-row"
          >
            <input
              v-model="selectedPlanKeys"
              class="form-check-input"
              type="checkbox"
              :value="option.key"
            />
            <span class="flex-grow-1">{{ option.label }}</span>
            <span v-if="option.hasExistingData" class="badge text-bg-warning">
              已有可生成內容，將覆寫
            </span>
            <span v-else class="badge text-bg-secondary">尚無可生成內容</span>
          </label>
        </div>
      </template>

      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="planModalOpen = false">
          取消
        </button>
        <button
          type="button"
          class="btn btn-theme"
          :disabled="loadingPlanOptions || selectedPlanKeys.length === 0"
          @click="confirmPlanGeneration"
        >
          <i class="fa fa-file-circle-plus me-2"></i>
          生成所選計劃書
        </button>
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
      :phases="activePhases"
      :title="batchMode === 'plan' ? '計劃書生成中' : '工程核心啟動中'"
      :subtitle="batchMode === 'plan' ? 'Plan Generation System' : 'Engineering Intelligence System'"
      :completion-title="batchMode === 'plan' ? '計劃書生成完成' : '工程資料建立完成'"
      :completion-subtitle="batchMode === 'plan' ? '已完成所選計劃書內容' : '已完成公共工程邏輯整合'"
      :done-badge="batchMode === 'plan' ? '所選計劃書生成完成' : '公共工程邏輯建構完成'"
      :working-text="batchMode === 'plan' ? '系統正在生成計劃書，請稍候…' : '系統正在建構中，請稍候…'"
      @close="closeAiBatchModal"
    />
  </div>
</template>

<style scoped>
.engineering-data-build-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-engineering-data-build-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.8125rem;
  white-space: nowrap;
}

.build-action-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.build-action-option {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  min-height: 8rem;
  padding: 1rem;
  color: inherit;
  text-align: left;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.build-action-option:hover {
  background: var(--bs-tertiary-bg);
  border-color: var(--bs-info);
  transform: translateY(-1px);
}

.build-action-option__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  color: var(--bs-info);
  background: rgba(var(--bs-info-rgb), 0.12);
  border-radius: 0.5rem;
  flex: 0 0 auto;
}

.build-action-option__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.35rem;
}

.build-action-option__title {
  font-weight: 600;
}

.build-action-option__description {
  color: var(--bs-secondary-color);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.plan-option-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 22rem;
  overflow-y: auto;
}

.plan-option-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  cursor: pointer;
}

.plan-option-row:hover {
  background: var(--bs-tertiary-bg);
}

@media (max-width: 575.98px) {
  .build-action-options {
    grid-template-columns: 1fr;
  }
}
</style>
