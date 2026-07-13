<template>
  <div class="page-wrapper d-flex flex-column">
    <div class="d-flex justify-content-between align-items-start">
      <PageHeader
        title="施工進度"
        icon="fa fa-chart-gantt"
        :breadcrumbs="[
          { text: '工程排程管理', href: 'javascript:;' },
          { text: '施工進度', active: true }
        ]"
      />
    </div>

    <!-- 尚未選擇工程案 -->
    <div v-if="!constructionId" class="content-area d-flex flex-column align-items-center justify-content-center">
      <i class="fa fa-folder-open fa-4x mb-4 text-muted"></i>
      <h4 class="mb-3">尚未選擇工程案</h4>
      <p class="text-muted mb-0">請先於上方選擇工程案，再進行施工進度編排。</p>
    </div>

    <div v-else class="content-area d-flex flex-column">
      <!-- Tab 切換 -->
      <ul class="nav nav-tabs mb-0">
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: activeTab === 'gantt' }"
            href="javascript:;"
            @click="activeTab = 'gantt'"
          >
            <i class="fa fa-chart-gantt me-2"></i>進度編排（甘特圖）
          </a>
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: activeTab === 'curve' }"
            href="javascript:;"
            @click="activeTab = 'curve'"
          >
            <i class="fa fa-chart-area me-2"></i>S 曲線
          </a>
        </li>
      </ul>

      <div class="flex-fill border border-top-0 rounded-bottom d-flex flex-column overflow-hidden main-panel">
        <!-- 工具列 -->
        <div class="d-flex align-items-center gap-2 p-3 border-bottom flex-wrap">
          <button type="button" class="btn btn-sm btn-primary" @click="showImportModal = true">
            <i class="fa fa-file-import me-1"></i>匯入{{ sourceLabel }}
          </button>
          <button type="button" class="btn btn-sm btn-outline-primary" @click="handleAddTask">
            <i class="fa fa-plus me-1"></i>新增項目
          </button>
          <div class="vr"></div>
          <button
            type="button"
            class="btn btn-sm btn-theme"
            :disabled="!tasks.length"
            title="以 AI 依施工順序自動編排起訖日期與權重"
            @click="showAiModal = true"
          >
            <i class="fa fa-wand-magic-sparkles me-1"></i>AI 智慧編排
          </button>
          <div class="ms-auto d-flex align-items-center gap-2">
            <span
              v-if="progress2Store.loading"
              class="spinner-border spinner-border-sm text-muted"
              title="同步中"
            ></span>
            <span v-if="tasks.length" class="text-muted small">
              共 {{ tasks.length }} 項｜已排程 {{ scheduledCount }} 項｜權重合計 {{ totalCostRatio }}%
            </span>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              :disabled="!tasks.length"
              @click="handleClearAll"
            >
              <i class="fa fa-trash me-1"></i>清空全部
            </button>
          </div>
        </div>

        <!-- 內容 -->
        <div class="flex-fill overflow-hidden d-flex flex-column">
          <Gantt2Editor
            v-if="activeTab === 'gantt'"
            :tasks="tasks"
            :title="projectName"
            class="flex-fill"
            @update-task="handleUpdateTask"
            @remove-task="handleRemoveTask"
            @move-task="handleMoveTask"
          />
          <SCurve2Chart
            v-else
            :tasks="tasks"
            :title="projectName"
            class="flex-fill"
          />
        </div>
      </div>
    </div>

    <!-- 匯入來源項目（監造：施工項目；營造：分項工程） -->
    <MajorItemImportModal
      v-model:show="showImportModal"
      :construction-id="constructionId"
      :source-type="sourceType"
      :imported-ids="importedMajorItemIds"
      @import="handleImport"
    />

    <!-- AI 智慧編排 -->
    <AiArrangeModal
      v-model:show="showAiModal"
      :construction-id="constructionId"
      :tasks="tasks"
      :source-label="sourceLabel"
      @apply="handleAiApply"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Gantt2Editor from './components/Gantt2Editor.vue'
import SCurve2Chart from './components/SCurve2Chart.vue'
import MajorItemImportModal from './components/MajorItemImportModal.vue'
import AiArrangeModal from './components/AiArrangeModal.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useProgress2Store, type Progress2Task } from '@/stores/progress2'

const workspaceStore = useWorkspaceStore()
const progress2Store = useProgress2Store()
const { viewType, isContractor } = useViewPerspective()
const instance = getCurrentInstance()
const proxy = instance?.proxy as any

const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const projectName = computed(() => (workspaceStore.currentProject as any)?.name || '')

/** 監造與營造資料各自維護；項目來源：監造 = 施工項目、營造 = 分項工程 */
const sourceType = computed<'supervisory' | 'contractor'>(() =>
  isContractor.value ? 'contractor' : 'supervisory'
)
const sourceLabel = computed(() => (isContractor.value ? '分項工程' : '施工項目'))

const activeTab = ref<'gantt' | 'curve'>('gantt')
const showImportModal = ref(false)
const showAiModal = ref(false)

const tasks = computed(() => progress2Store.tasks)

const scheduledCount = computed(
  () => tasks.value.filter((t) => t.startDate && t.endDate).length
)

const totalCostRatio = computed(() => {
  const sum = tasks.value.reduce((acc, t) => acc + (Number(t.costRatio) || 0), 0)
  return Math.round(sum * 10) / 10
})

const importedMajorItemIds = computed(() =>
  tasks.value.map((t) => t.majorItemId).filter((id): id is string => !!id)
)

watch(
  [constructionId, viewType],
  ([cid, vt]) => {
    progress2Store.setContext(cid, String(vt || 'SUPERVISORY'))
  },
  { immediate: true }
)

onMounted(async () => {
  if (!workspaceStore.currentWorkspace) {
    await workspaceStore.initWorkspaces()
  }
  progress2Store.setContext(constructionId.value, String(viewType.value || 'SUPERVISORY'))
})

// ---------- 操作 ----------
const handleImport = (items: { id: string; name: string }[]) => {
  const added = progress2Store.importMajorItems(items)
  if (added > 0) {
    proxy?.$toast?.success?.(`已匯入 ${added} 個${sourceLabel.value}`)
  } else {
    proxy?.$toast?.info?.('沒有新的項目可匯入')
  }
}

const handleAddTask = () => {
  progress2Store.addTask()
}

const handleUpdateTask = (id: string, patch: Partial<Progress2Task>) => {
  progress2Store.updateTask(id, patch)
}

const handleRemoveTask = (id: string) => {
  const task = tasks.value.find((t) => t.id === id)
  if (!task) return
  if (!confirm(`確定刪除項目「${task.name}」？`)) return
  progress2Store.removeTask(id)
}

const handleMoveTask = (id: string, direction: -1 | 1) => {
  progress2Store.moveTask(id, direction)
}

const handleClearAll = () => {
  if (!confirm('確定清空此工程案的全部進度項目？此操作無法復原。')) return
  progress2Store.clearTasks()
}

const handleAiApply = (
  patches: { taskId: string; startDate: string; endDate: string; costRatio?: number }[]
) => {
  patches.forEach((p) => {
    progress2Store.updateTask(p.taskId, {
      startDate: p.startDate,
      endDate: p.endDate,
      ...(p.costRatio != null ? { costRatio: p.costRatio } : {})
    })
  })
  proxy?.$toast?.success?.(`AI 編排已套用（${patches.length} 個項目）`)
  activeTab.value = 'gantt'
}
</script>

<style scoped>
.page-wrapper {
  min-height: calc(100vh - 120px);
}

.content-area {
  flex: 1 1 auto;
  min-height: 560px;
}

.main-panel {
  min-height: 520px;
}
</style>
