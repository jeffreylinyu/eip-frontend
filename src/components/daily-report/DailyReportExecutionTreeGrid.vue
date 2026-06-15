<template>
  <div class="treegrid-wrapper pcces-treegrid-embedded">
    <div class="treegrid-body">
      <ejs-treegrid
        ref="treegridRef"
        :dataSource="treeGridData"
        :allowPaging="false"
        :allowSorting="false"
        :allowFiltering="true"
        :filterSettings="treeGridFilterSettings"
        :actionBegin="onTreeGridActionBegin"
        :allowResizing="true"
        :allowReordering="false"
        :allowSelection="false"
        :treeColumnIndex="treeColumnIndex"
        :childMapping="'children'"
        :rowDataBound="onRowDataBound"
        height="100%"
        locale="zh-TW"
        :enableHover="true"
      >
        <e-columns>
          <e-column
            field="itemNo"
            headerText="項次"
            width="120"
            textAlign="Left"
            :template="'itemNoTemplate'"
            :filter="containsFilter"
          />
          <e-column
            field="name"
            headerText="工項名稱"
            width="280"
            textAlign="Left"
            :template="'nameTemplate'"
            :filter="containsFilter"
          />
          <e-column
            field="unit"
            headerText="單位"
            width="90"
            textAlign="Center"
            :template="'unitTemplate'"
            :allowFiltering="false"
          />
          <e-column
            field="contractQuantity"
            headerText="契約數量"
            width="120"
            textAlign="Right"
            :template="'contractQuantityTemplate'"
            :allowFiltering="false"
          />
          <e-column
            field="todayQuantity"
            headerText="本日完成數量"
            width="140"
            textAlign="Right"
            :template="'todayQuantityTemplate'"
            :allowFiltering="false"
          />
          <e-column
            field="cumulativeQuantity"
            headerText="累計完成數量"
            width="140"
            textAlign="Right"
            :template="'cumulativeQuantityTemplate'"
            :allowFiltering="false"
          />
          <e-column
            field="remark"
            headerText="備註"
            width="200"
            textAlign="Left"
            :template="'remarkTemplate'"
            :allowFiltering="false"
          />
        </e-columns>

        <template v-slot:itemNoTemplate="{ data }">
          <span>{{ data.itemNo }}</span>
        </template>

        <template v-slot:nameTemplate="{ data }">
          <div class="execution-tree-name-cell">
            <i
              v-if="data.type"
              :class="getPccesTypeIcon(data.type)"
              :title="getPccesTypeLabel(data.type)"
            ></i>
            <span :class="nameTextClass(data)">
              {{ data.name }}
            </span>
          </div>
        </template>

        <template v-slot:unitTemplate="{ data }">
          <span v-if="resolveItem(data.id)?.fillable">{{ data.unit || '—' }}</span>
          <span v-else class="text-muted">—</span>
        </template>

        <template v-slot:contractQuantityTemplate="{ data }">
          <span v-if="resolveItem(data.id)?.fillable" class="text-end d-block">
            {{ data.contractQuantity != null ? formatNumber(data.contractQuantity) : '—' }}
          </span>
          <span v-else-if="data.type === 'MAIN_ITEM'" class="text-end d-block">
            {{ formatMainItemContractDisplay(data) }}
          </span>
          <span v-else class="text-muted">—</span>
        </template>

        <template v-slot:todayQuantityTemplate="{ data }">
          <input
            v-if="resolveItem(data.id)?.fillable"
            type="number"
            class="form-control form-control-sm text-end"
            min="0"
            step="0.01"
            :value="resolveItem(data.id)?.todayQuantity ?? ''"
            @input="onTodayQuantityInput(data.id, $event)"
            @click.stop
          />
          <span v-else-if="data.type === 'MAIN_ITEM'" class="text-end d-block">
            {{ formatMainItemTodayDisplay(data.id) }}
          </span>
          <span v-else class="text-muted">—</span>
        </template>

        <template v-slot:cumulativeQuantityTemplate="{ data }">
          <span
            v-if="resolveItem(data.id)?.fillable"
            class="text-end d-block execution-cumulative-readonly"
          >
            {{ formatDisplayedCumulative(data.id) }}
          </span>
          <span v-else-if="data.type === 'MAIN_ITEM'" class="text-end d-block">
            {{ formatMainItemCumulativeDisplay(data.id) }}
          </span>
          <span v-else class="text-muted">—</span>
        </template>

        <template v-slot:remarkTemplate="{ data }">
          <input
            v-if="resolveItem(data.id)?.fillable"
            type="text"
            class="form-control form-control-sm"
            :value="resolveItem(data.id)?.remark ?? ''"
            @input="onRemarkInput(data.id, $event)"
            @click.stop
          />
          <span v-else class="text-muted">—</span>
        </template>
      </ejs-treegrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref, shallowRef, watch } from 'vue'
import { Sort, Resize, Filter } from '@syncfusion/ej2-vue-treegrid'
import type { TreeGridComponent } from '@syncfusion/ej2-vue-treegrid'
import type { ExecutionSummaryItem } from '@/types/dailyReport'
import { buildExecutionSummaryTreeData } from '@/utils/buildExecutionSummaryTreeData'
import {
  computeMainItemCumulativeRollupByItemId,
  computeMainItemTodayRollupByItemId,
  formatAmountWithPercent
} from '@/utils/computeMainItemTodayRollup'
import { getDisplayedCumulativeQuantity } from '@/utils/executionSummaryQuantity'
import { getPccesTypeIcon, getPccesTypeLabel } from '@/utils/pccesItemTypeDisplay'

const props = defineProps<{
  items: ExecutionSummaryItem[]
}>()

provide('treegrid', [Sort, Resize, Filter])

const treegridRef = ref<TreeGridComponent | null>(null)
const treeGridFilterSettings = { type: 'FilterBar', mode: 'Immediate', immediateModeDelay: 200 }
const containsFilter = { operator: 'contains' }

/** 項次後為樹狀欄 */
const treeColumnIndex = 1

const itemsById = computed(() => {
  const map = new Map<string, ExecutionSummaryItem>()
  for (const item of props.items) {
    map.set(item.id, item)
  }
  return map
})

/** 僅在樹狀結構／靜態欄位變更時重建，避免輸入時整表重繪奪走焦點 */
function buildStructureKey(items: ExecutionSummaryItem[]): string {
  return items
    .map((item) =>
      [
        item.id,
        item.logicalId ?? '',
        item.parentLogicalId ?? '',
        item.itemNo ?? '',
        item.item,
        item.type ?? '',
        item.fillable ? '1' : '0',
        item.executionRowKind ?? '',
        item.unit,
        item.contractQuantity ?? '',
        item.contractAmount ?? '',
        item.contractAmountPercent ?? '',
        item.unitPrice ?? ''
      ].join('\x1f')
    )
    .join('\n')
}

const treeGridData = shallowRef(buildExecutionSummaryTreeData(props.items))

watch(
  () => buildStructureKey(props.items),
  () => {
    treeGridData.value = buildExecutionSummaryTreeData(props.items)
  }
)

const mainItemTodayRollupById = computed(() => computeMainItemTodayRollupByItemId(props.items))
const mainItemCumulativeRollupById = computed(() =>
  computeMainItemCumulativeRollupByItemId(props.items)
)

const displayedCumulativeByItemId = computed(() => {
  const map = new Map<string, number>()
  for (const item of props.items) {
    if (item.fillable) {
      map.set(item.id, getDisplayedCumulativeQuantity(item))
    }
  }
  return map
})

const resolveItem = (id: string): ExecutionSummaryItem | undefined => itemsById.value.get(id)

const nameTextClass = (data: { executionRowKind?: string }) => ({
  'fw-semibold execution-tree-section-title': data.executionRowKind === 'SECTION_HEADER'
})

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

const formatMainItemContractDisplay = (data: {
  contractAmount?: number | null
  contractAmountPercent?: number | null
}): string => formatAmountWithPercent(data.contractAmount, data.contractAmountPercent)

const formatMainItemTodayDisplay = (itemId: string): string => {
  const rollup = mainItemTodayRollupById.value.get(itemId)
  if (!rollup) return '—'
  return formatAmountWithPercent(rollup.amount, rollup.percent)
}

const formatMainItemCumulativeDisplay = (itemId: string): string => {
  const rollup = mainItemCumulativeRollupById.value.get(itemId)
  if (!rollup) return '—'
  return formatAmountWithPercent(rollup.amount, rollup.percent)
}

const parseNumberInput = (event: Event): number | null => {
  const value = (event.target as HTMLInputElement | null)?.value ?? ''
  return value === '' ? null : Number(value)
}

const onTodayQuantityInput = (id: string, event: Event) => {
  const item = resolveItem(id)
  if (item) item.todayQuantity = parseNumberInput(event)
}

const formatDisplayedCumulative = (itemId: string): string => {
  const value = displayedCumulativeByItemId.value.get(itemId)
  if (value === undefined) return '—'
  return formatNumber(value)
}

const onRemarkInput = (id: string, event: Event) => {
  const item = resolveItem(id)
  if (item) item.remark = (event.target as HTMLInputElement | null)?.value ?? ''
}

const onRowDataBound = (args: {
  data?: { id?: string; executionRowKind?: string }
  row?: HTMLElement
}) => {
  const row = args.row
  const data = args.data
  if (!row || !data?.id) return
  row.classList.remove('execution-tree-section-row')
  if (data.executionRowKind === 'SECTION_HEADER') {
    row.classList.add('execution-tree-section-row')
  }
}

function onTreeGridActionBegin(e: {
  requestType?: string
  columns?: Array<{ field?: string; operator?: string }>
}) {
  if (e?.requestType === 'filtering' && Array.isArray(e.columns)) {
    for (const col of e.columns) {
      if (!col) continue
      col.operator = 'contains'
    }
  }
}

</script>

<style scoped>
.treegrid-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  overflow: hidden;
  background-color: #0f172a;
  min-height: 280px;
  max-height: min(65vh, 800px);
}

.treegrid-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-color: #0f172a;
  height: min(65vh, 800px);
}

:deep(.e-treegrid) {
  background-color: #0f172a !important;
  height: 100% !important;
}

:deep(.e-treegrid .e-gridcontent),
:deep(.e-treegrid .e-gridheader),
:deep(.e-treegrid .e-content),
:deep(.e-treegrid .e-headercontent) {
  background-color: #0f172a !important;
}

:deep(.e-treegrid .e-gridcontent) {
  overflow-y: auto !important;
}

:deep(.e-treegrid .e-row),
:deep(.e-treegrid .e-altrow) {
  background-color: transparent !important;
}

:deep(.e-treegrid .e-headercell),
:deep(.e-treegrid .e-rowcell) {
  background-color: transparent !important;
  border-color: #475569 !important;
  color: rgba(255, 255, 255, 0.92);
}

:deep(.e-treegrid .e-treecolumn-container) {
  display: flex !important;
  align-items: center !important;
  white-space: nowrap !important;
  flex-wrap: nowrap !important;
}

:deep(.e-treegrid .e-treegridexpand),
:deep(.e-treegrid .e-treegridcollapse) {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  flex-shrink: 0;
}

:deep(.e-treegrid .e-treegridcell) {
  display: flex;
  align-items: center;
  vertical-align: middle;
}

:deep(.e-treegrid .e-treegridcell-content) {
  display: flex;
  align-items: center;
  line-height: 1.5;
  white-space: nowrap;
  flex-wrap: nowrap;
  min-width: 0;
  width: 100%;
}

.execution-tree-name-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  line-height: 1.2;
  min-width: 0;
  width: 100%;
}

.execution-tree-name-cell > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.text-purple) {
  color: #a855f7;
}

:deep(.e-treegrid .execution-tree-section-row .e-rowcell) {
  font-weight: 600;
}

:deep(.e-treegrid .execution-tree-section-row .execution-tree-section-title) {
  color: #e2e8f0;
}

:deep(.e-treegrid .e-rowcell .form-control) {
  background-color: rgba(15, 23, 42, 0.85);
  border-color: #475569;
  color: #f8fafc;
  min-width: 72px;
}

:deep(.e-treegrid .e-rowcell .form-control:focus) {
  background-color: rgba(15, 23, 42, 0.95);
  border-color: #64748b;
  color: #f8fafc;
  box-shadow: 0 0 0 0.15rem rgba(100, 116, 139, 0.35);
}

.execution-cumulative-readonly {
  color: rgba(248, 250, 252, 0.92);
  padding: 0.25rem 0.35rem;
}

:deep(.e-treegrid .e-filterbarcell input) {
  background-color: rgba(15, 23, 42, 0.85);
  border-color: #475569;
  color: #f8fafc;
}

:deep(.e-treegrid .e-filterbarcell input::placeholder) {
  color: rgba(148, 163, 184, 0.9);
}
</style>
