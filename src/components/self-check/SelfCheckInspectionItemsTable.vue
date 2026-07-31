<template>
  <div class="self-check-items-section">
    <div class="d-flex align-items-center gap-2 mb-2">
      <h5 class="fw-bold mb-0">{{ title }}</h5>
      <span class="badge bg-secondary">{{ items.length }}</span>
    </div>
    <p v-if="description" class="text-muted small mb-3">{{ description }}</p>

    <div v-if="items.length === 0" class="text-center py-4 text-muted border rounded">
      {{ emptyText }}
    </div>

    <div v-else class="self-check-items-grid-wrap">
      <ejs-grid
        :dataSource="items"
        :allowPaging="false"
        :allowSorting="false"
        :allowFiltering="false"
        :allowResizing="true"
        :allowSelection="false"
        :enableHover="true"
        :height="gridHeight"
        locale="zh-TW"
        @rowDataBound="onRowDataBound"
      >
        <e-columns>
          <e-column
            headerText="#"
            width="48"
            textAlign="Center"
            :allowResizing="false"
            :template="'rowNoTemplate'"
          />
          <e-column
            field="workProcess"
            headerText="施工階段"
            width="100"
            textAlign="Left"
            clipMode="EllipsisWithTooltip"
            :template="'workProcessTemplate'"
          />
          <e-column
            field="workProcessDetail"
            headerText="施工流程"
            width="110"
            textAlign="Left"
            clipMode="EllipsisWithTooltip"
            :template="'workProcessDetailTemplate'"
          />
          <e-column
            field="manageProject"
            headerText="管理項目"
            width="150"
            textAlign="Left"
            :template="'manageProjectTemplate'"
          />
          <e-column
            field="checkStandard"
            :headerText="`${inspectionLabel}標準`"
            width="180"
            textAlign="Left"
            clipMode="EllipsisWithTooltip"
            :template="'checkStandardTemplate'"
          />
          <e-column
            field="actualSituation"
            :headerText="`實際${inspectionLabel}情形`"
            width="220"
            textAlign="Left"
            :template="'actualSituationTemplate'"
          />
          <e-column
            field="inspectionResult"
            :headerText="`${inspectionLabel}結果`"
            width="120"
            textAlign="Center"
            :template="'inspectionResultTemplate'"
          />
          <e-column
            field="exportEnabled"
            headerText="匯出"
            width="72"
            textAlign="Center"
            :allowResizing="false"
            :template="'exportEnabledTemplate'"
          />
        </e-columns>

        <template v-slot:rowNoTemplate="{ data }">
          <span class="text-muted">{{ itemRowNo(data) }}</span>
        </template>

        <template v-slot:workProcessTemplate="{ data }">
          <span class="small fw-semibold" :class="workProcessToneClass(data)">
            {{ data.workProcess?.trim() || '—' }}
          </span>
        </template>

        <template v-slot:workProcessDetailTemplate="{ data }">
          <span class="small text-muted">{{ data.workProcessDetail || '—' }}</span>
        </template>

        <template v-slot:manageProjectTemplate="{ data }">
          <div class="small">
            <div>{{ data.manageProject || '—' }}</div>
            <div v-if="data.checkPoint" class="text-warning-emphasis">{{ data.checkPoint }}</div>
          </div>
        </template>

        <template v-slot:checkStandardTemplate="{ data }">
          <span class="small">{{ data.checkStandard || '—' }}</span>
        </template>

        <template v-slot:actualSituationTemplate="{ data }">
          <div class="actual-situation-cell">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm actual-copy-btn"
              :disabled="!hasCheckStandard(data.id)"
              :title="`將此列${inspectionLabel}標準複製到實際${inspectionLabel}情形`"
              @click.stop="onCopyCheckStandard(data.id)"
            >
              <i class="fa fa-copy me-1"></i>複製{{ inspectionLabel }}標準
            </button>
            <textarea
              :value="resolveItem(data.id)?.actualSituation ?? ''"
              class="form-control form-control-sm self-check-cell-input"
              rows="2"
              :placeholder="`實際${inspectionLabel}情形`"
              @click.stop
              @input="onActualSituationInput(data.id, $event)"
            />
          </div>
        </template>

        <template v-slot:inspectionResultTemplate="{ data }">
          <select
            :value="resolveItem(data.id)?.inspectionResult ?? '合格'"
            class="form-select form-select-sm self-check-cell-input"
            @click.stop
            @change="onInspectionResultChange(data.id, $event)"
          >
            <option value="合格">合格</option>
            <option value="不合格">不合格</option>
          </select>
        </template>

        <template v-slot:exportEnabledTemplate="{ data }">
          <div class="form-check form-switch self-check-export-switch mb-0">
            <input
              :id="`export-enabled-${data.id}`"
              class="form-check-input"
              type="checkbox"
              role="switch"
              :checked="isExportEnabled(data.id)"
              @click.stop
              @change="onExportEnabledChange(data.id, $event)"
            />
          </div>
        </template>
      </ejs-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue'
import {
  GridComponent as EjsGrid,
  ColumnsDirective as EColumns,
  ColumnDirective as EColumn,
  Resize
} from '@syncfusion/ej2-vue-grids'

export interface SelfCheckFormItem {
  id: number
  workProcess?: string | null
  workProcessDetail?: string | null
  manageProject?: string | null
  checkPoint?: string | null
  checkStandard?: string | null
  actualSituation: string
  inspectionResult: string
  exportEnabled: boolean
}

const props = withDefaults(defineProps<{
  title: string
  description?: string
  emptyText: string
  items: SelfCheckFormItem[]
  inspectionLabel?: string
}>(), {
  inspectionLabel: '抽查'
})

const inspectionLabel = computed(() => props.inspectionLabel)

const emit = defineEmits<{
  change: []
}>()

provide('grid', [Resize])

const itemsById = computed(() => {
  const map = new Map<number, SelfCheckFormItem>()
  for (const item of props.items) {
    map.set(item.id, item)
  }
  return map
})

function resolveItem(id: number): SelfCheckFormItem | undefined {
  return itemsById.value.get(id)
}

function onActualSituationInput(id: number, event: Event) {
  const item = resolveItem(id)
  if (!item) return
  item.actualSituation = (event.target as HTMLTextAreaElement | null)?.value ?? ''
  emit('change')
}

function hasCheckStandard(id: number): boolean {
  return Boolean(resolveItem(id)?.checkStandard?.trim())
}

function onCopyCheckStandard(id: number) {
  const item = resolveItem(id)
  if (!item) return
  const standard = item.checkStandard?.trim() ?? ''
  if (!standard) return
  item.actualSituation = standard
  emit('change')
}

function onInspectionResultChange(id: number, event: Event) {
  const item = resolveItem(id)
  if (!item) return
  item.inspectionResult = (event.target as HTMLSelectElement | null)?.value ?? ''
  emit('change')
}

function isExportEnabled(id: number): boolean {
  return resolveItem(id)?.exportEnabled !== false
}

function onExportEnabledChange(id: number, event: Event) {
  const item = resolveItem(id)
  if (!item) return
  item.exportEnabled = (event.target as HTMLInputElement).checked
  const row = (event.target as HTMLElement | null)?.closest('tr')
  if (row) {
    row.classList.toggle('self-check-item-disabled', !item.exportEnabled)
  }
  emit('change')
}

function onRowDataBound(args: { data?: SelfCheckFormItem; row?: HTMLElement }) {
  const row = args.row
  const data = args.data
  if (!row || !data) return
  const disabled = data.exportEnabled === false
  row.classList.toggle('self-check-item-disabled', disabled)
  const cells = row.querySelectorAll('td')
  cells.forEach((cell, index) => {
    if (index === cells.length - 1) {
      cell.classList.add('self-check-export-cell')
    }
  })
}

const PHASE_TONE_CLASSES = [
  'self-check-phase-tone-0',
  'self-check-phase-tone-1',
  'self-check-phase-tone-2',
  'self-check-phase-tone-3',
  'self-check-phase-tone-4'
] as const

function normalizeWorkProcess(value?: string | null): string {
  return value?.trim() || '—'
}

const workProcessToneByKey = computed(() => {
  const map = new Map<string, string>()
  let toneIdx = 0
  for (const item of props.items) {
    const key = normalizeWorkProcess(item.workProcess)
    if (!map.has(key)) {
      map.set(key, PHASE_TONE_CLASSES[toneIdx % PHASE_TONE_CLASSES.length])
      toneIdx++
    }
  }
  return map
})

function workProcessToneClass(data: SelfCheckFormItem): string {
  return workProcessToneByKey.value.get(normalizeWorkProcess(data.workProcess)) ?? PHASE_TONE_CLASSES[0]
}

function itemRowNo(data: SelfCheckFormItem): number {
  const idx = props.items.findIndex((it) => it.id === data.id)
  return idx >= 0 ? idx + 1 : 0
}

const gridHeight = computed(() => {
  const rowCount = props.items.length
  const estimated = 52 + rowCount * 78
  return Math.min(560, Math.max(280, estimated))
})
</script>

<style scoped>
.self-check-items-grid-wrap {
  border-radius: 0.375rem;
  overflow: hidden;
}

.self-check-items-grid-wrap :deep(.e-grid) {
  border-radius: 0.375rem;
}

.self-check-cell-input {
  min-width: 0;
  width: 100%;
}

.self-check-items-grid-wrap :deep(.e-rowcell) {
  vertical-align: middle;
}

.self-check-phase-tone-0 {
  color: #6ea8fe;
}

.self-check-phase-tone-1 {
  color: #ffc107;
}

.self-check-phase-tone-2 {
  color: #75b798;
}

.self-check-phase-tone-3 {
  color: #e685b5;
}

.self-check-phase-tone-4 {
  color: #adb5bd;
}

.self-check-items-grid-wrap :deep(textarea.self-check-cell-input) {
  min-height: 3.25rem;
  resize: vertical;
}

.actual-situation-cell {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.actual-copy-btn {
  align-self: flex-start;
  font-size: 0.75rem;
  line-height: 1.2;
  padding: 0.15rem 0.45rem;
}

.self-check-export-switch {
  display: flex;
  justify-content: center;
  padding-top: 0.15rem;
}

.self-check-export-switch .form-check-input {
  margin: 0;
  float: none;
}

.self-check-items-grid-wrap :deep(tr.self-check-item-disabled td:not(.self-check-export-cell)) {
  opacity: 0.42;
  filter: grayscale(0.9);
}

.self-check-items-grid-wrap :deep(tr.self-check-item-disabled td.self-check-export-cell) {
  opacity: 1;
  filter: none;
}
</style>
