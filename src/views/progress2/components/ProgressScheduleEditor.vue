<template>
  <Card class="schedule-card report-card report-card--full">
    <CardBody class="schedule-card__body">
      <ul class="nav nav-tabs schedule-tabs mb-0">
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

      <div class="schedule-panel d-flex flex-column overflow-hidden">
        <div class="b2-content-toolbar schedule-toolbar">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <button type="button" class="win-btn win-btn--sm win-btn-accent" @click="showImportModal = true">
              <i class="fa fa-file-import me-1"></i>匯入{{ sourceLabel }}
            </button>
            <button type="button" class="win-btn win-btn--sm" @click="addTask">
              <i class="fa fa-plus me-1"></i>新增項目
            </button>
            <button
              type="button"
              class="btn-ai-generate btn-ai-generate--toolbar"
              :disabled="!tasks.length"
              @click="showAiModal = true"
            >
              <i class="fa fa-wand-magic-sparkles me-1"></i>AI 智慧編排
            </button>
          </div>

          <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
            <span v-if="loading" class="spinner-border spinner-border-sm text-muted" title="同步中"></span>
            <span v-if="tasks.length" class="text-muted small">
              共 {{ tasks.length }} 項｜已排程 {{ scheduledCount }} 項｜權重合計 {{ totalCostRatio }}%
            </span>
            <slot name="toolbar-actions" />
            <button
              type="button"
              class="win-btn win-btn--sm win-btn-danger"
              :disabled="!tasks.length"
              @click="clearAll"
            >
              <i class="fa fa-trash me-1"></i>清空全部
            </button>
          </div>
        </div>

        <div class="schedule-chart flex-fill overflow-hidden d-flex flex-column">
          <Gantt2Editor
            v-if="activeTab === 'gantt'"
            ref="ganttRef"
            :tasks="tasks"
            :title="title"
            class="flex-fill"
            @update-task="updateTask"
            @remove-task="removeTask"
            @move-task="moveTask"
          />
          <SCurve2Chart
            v-else
            ref="curveRef"
            :tasks="tasks"
            :title="title"
            class="flex-fill"
          />
        </div>
      </div>
    </CardBody>
  </Card>

  <MajorItemImportModal
    v-model:show="showImportModal"
    :construction-id="constructionId"
    :source-type="sourceType"
    :imported-ids="importedMajorItemIds"
    @import="importItems"
  />
  <AiArrangeModal
    v-model:show="showAiModal"
    :construction-id="constructionId"
    :tasks="tasks"
    :source-label="sourceLabel"
    @apply="applyAi"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Gantt2Editor from './Gantt2Editor.vue'
import SCurve2Chart from './SCurve2Chart.vue'
import MajorItemImportModal from './MajorItemImportModal.vue'
import AiArrangeModal from './AiArrangeModal.vue'
import { genProgress2Id, type Progress2Task } from '@/stores/progress2'

type GanttExportRef = {
  renderPngBlob: () => Promise<Blob | null>
  renderPngBlobs: () => Promise<Blob[]>
}
type ChartExportRef = { renderPngBlob: () => Promise<Blob | null> }

const props = defineProps<{
  modelValue: Progress2Task[]
  constructionId: string
  title: string
  sourceType: 'supervisory' | 'contractor'
  sourceLabel: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [tasks: Progress2Task[]]
}>()

const activeTab = ref<'gantt' | 'curve'>('gantt')
const showImportModal = ref(false)
const showAiModal = ref(false)
const ganttRef = ref<GanttExportRef | null>(null)
const curveRef = ref<ChartExportRef | null>(null)
const tasks = computed(() => props.modelValue)

const normalizeTask = (raw: Partial<Progress2Task>): Progress2Task => ({
  id: raw.id || genProgress2Id(),
  majorItemId: raw.majorItemId != null ? String(raw.majorItemId) : null,
  name: String(raw.name ?? ''),
  startDate: raw.startDate || null,
  endDate: raw.endDate || null,
  progress: Math.min(100, Math.max(0, Number(raw.progress) || 0)),
  costRatio: Math.max(0, Number(raw.costRatio) || 0),
})

const replaceTasks = (next: Progress2Task[]) => emit('update:modelValue', next.map(normalizeTask))
const scheduledCount = computed(() => tasks.value.filter((task) => task.startDate && task.endDate).length)
const totalCostRatio = computed(() =>
  Math.round(tasks.value.reduce((sum, task) => sum + (Number(task.costRatio) || 0), 0) * 10) / 10,
)
const importedMajorItemIds = computed(() =>
  tasks.value.map((task) => task.majorItemId).filter((id): id is string => !!id),
)

const addTask = () => replaceTasks([
  ...tasks.value,
  normalizeTask({ name: `新項目 ${tasks.value.length + 1}` }),
])

const updateTask = (id: string, patch: Partial<Progress2Task>) => {
  replaceTasks(tasks.value.map((task) =>
    task.id === id ? normalizeTask({ ...task, ...patch, id }) : task,
  ))
}

const removeTask = (id: string) => {
  const task = tasks.value.find((item) => item.id === id)
  if (task && window.confirm(`確定刪除項目「${task.name}」？`)) {
    replaceTasks(tasks.value.filter((item) => item.id !== id))
  }
}

const moveTask = (id: string, direction: -1 | 1) => {
  const next = [...tasks.value]
  const index = next.findIndex((task) => task.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= next.length) return
  const [task] = next.splice(index, 1)
  next.splice(target, 0, task)
  replaceTasks(next)
}

const clearAll = () => {
  if (window.confirm('確定清空全部進度項目？此操作無法復原。')) replaceTasks([])
}

const importItems = (items: { id: string; name: string }[]) => {
  const existing = new Set(importedMajorItemIds.value)
  const additions = items
    .filter((item) => !existing.has(String(item.id)))
    .map((item) => normalizeTask({ majorItemId: String(item.id), name: item.name }))
  if (additions.length) replaceTasks([...tasks.value, ...additions])
}

const applyAi = (
  patches: { taskId: string; startDate: string; endDate: string; costRatio?: number }[],
) => {
  const patchMap = new Map(patches.map((patch) => [patch.taskId, patch]))
  replaceTasks(tasks.value.map((task) => {
    const patch = patchMap.get(task.id)
    return patch ? normalizeTask({ ...task, ...patch }) : task
  }))
  activeTab.value = 'gantt'
}

const captureChartBlobs = async (): Promise<{ ganttPages: Blob[]; curve: Blob } | null> => {
  const originalTab = activeTab.value
  try {
    activeTab.value = 'gantt'
    await nextTick()
    const ganttPages = await ganttRef.value?.renderPngBlobs()
    activeTab.value = 'curve'
    await nextTick()
    const curve = await curveRef.value?.renderPngBlob()
    return ganttPages?.length && curve ? { ganttPages, curve } : null
  } finally {
    activeTab.value = originalTab
  }
}

defineExpose({ captureChartBlobs })
</script>

<style scoped>
.schedule-card {
  position: relative;
  min-height: 560px;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
  background-color: #0f172a;
  background-image: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}
.schedule-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(700px 220px at 20% 0%, rgba(var(--bs-primary-rgb), 0.12), transparent 55%);
  opacity: 0.9;
  pointer-events: none;
}
.schedule-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 560px;
  padding: 1.25rem;
  background: transparent;
}
.schedule-tabs {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}
.schedule-tabs .nav-link {
  color: rgba(226, 232, 240, 0.68);
  border-color: transparent;
}
.schedule-tabs .nav-link.active {
  color: rgba(255, 255, 255, 0.96);
  background-color: #1e293b;
  border-color: rgba(255, 255, 255, 0.14);
  border-bottom-color: #1e293b;
}
.schedule-panel {
  min-height: 500px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-top: 0;
  border-radius: 0 0 0.5rem 0.5rem;
  background-color: #111827;
}
.schedule-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 0;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background-color: #1e293b;
}
.schedule-chart {
  min-height: 430px;
  background-color: #0f172a;
}
@media (max-width: 767.98px) {
  .schedule-toolbar {
    align-items: stretch;
  }
}
</style>
