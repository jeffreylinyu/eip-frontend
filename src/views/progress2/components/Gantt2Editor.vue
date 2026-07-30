<template>
  <div class="gantt2-wrapper d-flex flex-column h-100">
    <!-- 甘特圖工具列 -->
    <div class="gantt2-toolbar d-flex align-items-center gap-2 p-2 border-bottom flex-wrap">
      <div class="d-flex gap-1" role="group" aria-label="時間刻度">
        <button
          v-for="z in zoomOptions"
          :key="z.key"
          type="button"
          class="win-btn win-btn--sm"
          :class="{ 'win-btn-accent': zoom === z.key }"
          @click="zoom = z.key"
        >
          {{ z.label }}
        </button>
      </div>
      <button type="button" class="win-btn win-btn--sm" @click="scrollToToday">
        <i class="fa fa-crosshairs me-1"></i>回到今天
      </button>
      <button type="button" class="win-btn win-btn--sm" @click="gridCollapsed = !gridCollapsed">
        <i class="fa me-1" :class="gridCollapsed ? 'fa-table-columns' : 'fa-minimize'"></i>
        {{ gridCollapsed ? '展開欄位' : '收合欄位' }}
      </button>
      <button
        type="button"
        class="win-btn win-btn--sm"
        :disabled="!tasks.length"
        title="將甘特圖匯出為 PNG 圖片"
        @click="exportPng"
      >
        <i class="fa fa-image me-1"></i>匯出 PNG
      </button>
      <span class="text-muted small ms-auto">
        <i class="fa fa-hand-pointer me-1"></i>拖曳長條移動日期、拖曳兩端調整工期；未排程項目可在時間軸上點擊排入
      </span>
    </div>

    <!-- 主體：單一捲動容器（左表格 sticky） -->
    <div ref="scrollEl" class="gantt2-scroll flex-fill">
      <div class="gantt2-inner" :style="{ width: totalWidth + 'px' }">
        <!-- 表頭 -->
        <div class="gantt2-header d-flex">
          <div class="gantt2-left gantt2-left-header d-flex" :style="{ width: leftWidth + 'px' }">
            <div class="g2-cell g2-col-index">#</div>
            <div class="g2-cell g2-col-name" :style="{ width: nameColumnWidth + 'px' }">
              項目名稱
              <button
                type="button"
                class="g2-column-resizer"
                title="拖曳調整項目名稱欄寬"
                aria-label="拖曳調整項目名稱欄寬"
                @mousedown.stop.prevent="startNameColumnResize"
              ></button>
            </div>
            <template v-if="!gridCollapsed">
              <div class="g2-cell g2-col-date">開始日期</div>
              <div class="g2-cell g2-col-date">結束日期</div>
              <div class="g2-cell g2-col-num">工期</div>
              <div class="g2-cell g2-col-num">權重%</div>
              <div class="g2-cell g2-col-num">進度%</div>
              <div class="g2-cell g2-col-op"></div>
            </template>
          </div>
          <div class="gantt2-timeline-header" :style="{ width: chartWidth + 'px' }">
            <div class="g2-tl-groups d-flex">
              <div
                v-for="(g, i) in headerGroups"
                :key="'g' + i"
                class="g2-tl-group"
                :style="{ width: g.width + 'px' }"
              >
                {{ g.label }}
              </div>
            </div>
            <div class="g2-tl-ticks d-flex">
              <div
                v-for="(t, i) in headerTicks"
                :key="'t' + i"
                class="g2-tl-tick"
                :class="{ 'g2-tick-weekend': t.weekend }"
                :style="{ width: t.width + 'px' }"
              >
                {{ t.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- 內容列 -->
        <div class="gantt2-body position-relative">
          <!-- 週末底色與今天線（整體覆蓋層） -->
          <div class="gantt2-overlay" :style="{ left: leftWidth + 'px', width: chartWidth + 'px' }">
            <div
              v-for="(band, i) in weekendBands"
              :key="'w' + i"
              class="g2-weekend-band"
              :style="{ left: band.left + 'px', width: band.width + 'px' }"
            ></div>
            <div
              v-for="(line, i) in boundaryLines"
              :key="'b' + i"
              class="g2-boundary-line"
              :style="{ left: line + 'px' }"
            ></div>
            <div v-if="todayOffsetPx != null" class="g2-today-line" :style="{ left: todayOffsetPx + 'px' }">
              <span class="g2-today-label">今天</span>
            </div>
          </div>

          <div
            v-for="(task, index) in tasks"
            :key="task.id"
            class="gantt2-row d-flex"
            :class="{ 'g2-row-selected': selectedId === task.id }"
            @click="selectedId = task.id"
          >
            <div class="gantt2-left d-flex" :style="{ width: leftWidth + 'px' }">
              <div class="g2-cell g2-col-index">
                <span class="me-1">{{ index + 1 }}</span>
                <span class="g2-order-btns">
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 g2-order-btn"
                    :disabled="index === 0"
                    title="上移"
                    @click.stop="$emit('move-task', task.id, -1)"
                  >
                    <i class="fa fa-caret-up"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 g2-order-btn"
                    :disabled="index === tasks.length - 1"
                    title="下移"
                    @click.stop="$emit('move-task', task.id, 1)"
                  >
                    <i class="fa fa-caret-down"></i>
                  </button>
                </span>
              </div>
              <div class="g2-cell g2-col-name" :style="{ width: nameColumnWidth + 'px' }">
                <input
                  type="text"
                  class="form-control form-control-sm g2-input"
                  :value="task.name"
                  :title="task.majorItemId ? '來源：施工大項' : '人工新增項目'"
                  @change="onNameChange(task, $event)"
                />
                <i
                  v-if="task.majorItemId"
                  class="fa fa-link g2-source-icon"
                  title="來源：施工大項"
                ></i>
              </div>
              <template v-if="!gridCollapsed">
                <div class="g2-cell g2-col-date">
                  <input
                    type="date"
                    class="form-control form-control-sm g2-input"
                    :value="task.startDate || ''"
                    @change="onStartChange(task, $event)"
                  />
                </div>
                <div class="g2-cell g2-col-date">
                  <input
                    type="date"
                    class="form-control form-control-sm g2-input"
                    :value="task.endDate || ''"
                    @change="onEndChange(task, $event)"
                  />
                </div>
                <div class="g2-cell g2-col-num text-muted">
                  {{ durationOf(task) || '-' }}
                </div>
                <div class="g2-cell g2-col-num">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    class="form-control form-control-sm g2-input"
                    :value="task.costRatio"
                    @change="onNumberChange(task, 'costRatio', $event)"
                  />
                </div>
                <div class="g2-cell g2-col-num">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    class="form-control form-control-sm g2-input"
                    :value="task.progress"
                    @change="onNumberChange(task, 'progress', $event)"
                  />
                </div>
                <div class="g2-cell g2-col-op">
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 text-danger"
                    title="刪除項目"
                    @click.stop="$emit('remove-task', task.id)"
                  >
                    <i class="fa fa-trash"></i>
                  </button>
                </div>
              </template>
            </div>

            <div
              class="gantt2-row-chart position-relative"
              :style="{ width: chartWidth + 'px' }"
              @mousedown="onEmptyChartMouseDown(task, $event)"
            >
              <div
                v-if="barGeometry(task)"
                class="gantt2-bar"
                :class="barClass(task)"
                :style="barStyle(task)"
                :title="barTitle(task)"
                @mousedown.stop="onBarMouseDown(task, 'move', $event)"
              >
                <div class="g2-bar-progress" :style="{ width: clampPercent(task.progress) + '%' }"></div>
                <span class="g2-bar-label">{{ task.name }}</span>
                <div class="g2-bar-handle g2-bar-handle-start" @mousedown.stop="onBarMouseDown(task, 'resize-start', $event)"></div>
                <div class="g2-bar-handle g2-bar-handle-end" @mousedown.stop="onBarMouseDown(task, 'resize-end', $event)"></div>
              </div>
              <div v-else class="g2-bar-placeholder text-muted small">
                <i class="fa fa-plus me-1"></i>點擊排入
              </div>
            </div>
          </div>

          <div v-if="!tasks.length" class="p-4 text-center text-muted">
            尚無進度項目，請先以「匯入施工大項」或「新增項目」建立項目。
          </div>
        </div>
      </div>
    </div>

    <!-- 拖曳提示 -->
    <div v-if="dragTooltip" class="gantt2-drag-tooltip" :style="{ left: dragTooltip.x + 'px', top: dragTooltip.y + 'px' }">
      {{ dragTooltip.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import type { Progress2Task } from '@/stores/progress2'
import {
  addDays,
  diffDays,
  formatDisplay,
  inclusiveDays,
  parseYmd,
  startOfDay,
  toYmd
} from '@/utils/progress2/date'

interface Props {
  tasks: Progress2Task[]
  /** 圖表標題（匯出用，通常為工程案名稱） */
  title?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update-task': [id: string, patch: Partial<Progress2Task>]
  'remove-task': [id: string]
  'move-task': [id: string, direction: -1 | 1]
}>()

// ---------- 檢視狀態 ----------
type ZoomKey = 'day' | 'week' | 'month'
const zoomOptions: { key: ZoomKey; label: string }[] = [
  { key: 'day', label: '日' },
  { key: 'week', label: '週' },
  { key: 'month', label: '月' }
]
const zoom = ref<ZoomKey>('day')
const gridCollapsed = ref(false)
const selectedId = ref<string | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const nameColumnWidth = ref(220)

const dayWidth = computed(() => (zoom.value === 'day' ? 28 : zoom.value === 'week' ? 9 : 3.2))

const expandedFixedWidth = 64 + 140 * 2 + 78 * 3 + 40
const collapsedFixedWidth = 64
const leftWidth = computed(
  () => nameColumnWidth.value + (gridCollapsed.value ? collapsedFixedWidth : expandedFixedWidth),
)

let nameResizeStartX = 0
let nameResizeStartWidth = 0

const onNameColumnResize = (event: MouseEvent) => {
  nameColumnWidth.value = Math.min(
    600,
    Math.max(140, nameResizeStartWidth + event.clientX - nameResizeStartX),
  )
}

const stopNameColumnResize = () => {
  document.removeEventListener('mousemove', onNameColumnResize)
  document.removeEventListener('mouseup', stopNameColumnResize)
  document.body.classList.remove('gantt2-column-resizing')
}

const startNameColumnResize = (event: MouseEvent) => {
  nameResizeStartX = event.clientX
  nameResizeStartWidth = nameColumnWidth.value
  document.addEventListener('mousemove', onNameColumnResize)
  document.addEventListener('mouseup', stopNameColumnResize)
  document.body.classList.add('gantt2-column-resizing')
}

// ---------- 時間範圍 ----------
const today = startOfDay(new Date())

const dateRange = computed(() => {
  let min: Date | null = null
  let max: Date | null = null
  props.tasks.forEach((t) => {
    const s = parseYmd(t.startDate)
    const e = parseYmd(t.endDate)
    if (s && (!min || s < min)) min = s
    if (e && (!max || e > max)) max = e
  })
  let start = min ?? today
  let end = max ?? addDays(today, 30)
  if (start > today) start = today
  if (end < today) end = today
  // 前後留白，並對齊月初/月底讓表頭完整
  start = addDays(start, -7)
  end = addDays(end, 14)
  start = new Date(start.getFullYear(), start.getMonth(), 1)
  end = new Date(end.getFullYear(), end.getMonth() + 1, 0)
  return { start, end }
})

const totalDays = computed(() => inclusiveDays(dateRange.value.start, dateRange.value.end))
const chartWidth = computed(() => Math.ceil(totalDays.value * dayWidth.value))
const totalWidth = computed(() => leftWidth.value + chartWidth.value)

const dayToPx = (dayOffset: number) => dayOffset * dayWidth.value

const todayOffsetPx = computed(() => {
  const offset = diffDays(dateRange.value.start, today)
  if (offset < 0 || offset >= totalDays.value) return null
  return dayToPx(offset)
})

// ---------- 表頭（上：群組；下：刻度） ----------
interface HeaderGroup { label: string; width: number }
interface HeaderTick { label: string; width: number; weekend?: boolean }

const headerGroups = computed<HeaderGroup[]>(() => {
  const { start, end } = dateRange.value
  const groups: HeaderGroup[] = []
  if (zoom.value === 'month') {
    // 年為群組
    let cursor = new Date(start.getFullYear(), 0, 1)
    while (cursor <= end) {
      const yearStart = cursor < start ? start : cursor
      const yearEnd = new Date(cursor.getFullYear(), 11, 31)
      const clampedEnd = yearEnd > end ? end : yearEnd
      groups.push({
        label: `${cursor.getFullYear()}年`,
        width: inclusiveDays(yearStart, clampedEnd) * dayWidth.value
      })
      cursor = new Date(cursor.getFullYear() + 1, 0, 1)
    }
  } else {
    // 月為群組
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cursor <= end) {
      const monthStart = cursor < start ? start : cursor
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const clampedEnd = monthEnd > end ? end : monthEnd
      groups.push({
        label: `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`,
        width: inclusiveDays(monthStart, clampedEnd) * dayWidth.value
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  }
  return groups
})

const headerTicks = computed<HeaderTick[]>(() => {
  const { start, end } = dateRange.value
  const ticks: HeaderTick[] = []
  if (zoom.value === 'day') {
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const dow = d.getDay()
      ticks.push({ label: String(d.getDate()), width: dayWidth.value, weekend: dow === 0 || dow === 6 })
    }
  } else if (zoom.value === 'week') {
    // 以週一為週起始
    let cursor = new Date(start)
    while (cursor <= end) {
      const dow = cursor.getDay()
      const daysToMonday = dow === 1 ? 7 : ((8 - dow) % 7 || 7)
      const weekEnd = addDays(cursor, daysToMonday - 1)
      const clampedEnd = weekEnd > end ? end : weekEnd
      ticks.push({
        label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
        width: inclusiveDays(cursor, clampedEnd) * dayWidth.value
      })
      cursor = addDays(clampedEnd, 1)
    }
  } else {
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cursor <= end) {
      const monthStart = cursor < start ? start : cursor
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const clampedEnd = monthEnd > end ? end : monthEnd
      ticks.push({
        label: `${cursor.getMonth() + 1}月`,
        width: inclusiveDays(monthStart, clampedEnd) * dayWidth.value
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  }
  return ticks
})

// 週末底色（僅日檢視）
const weekendBands = computed<{ left: number; width: number }[]>(() => {
  if (zoom.value !== 'day') return []
  const bands: { left: number; width: number }[] = []
  const { start } = dateRange.value
  for (let i = 0; i < totalDays.value; i++) {
    const dow = addDays(start, i).getDay()
    if (dow === 0 || dow === 6) {
      const prev = bands[bands.length - 1]
      const left = dayToPx(i)
      if (prev && Math.abs(prev.left + prev.width - left) < 0.5) {
        prev.width += dayWidth.value
      } else {
        bands.push({ left, width: dayWidth.value })
      }
    }
  }
  return bands
})

// 月（或年）分界線
const boundaryLines = computed<number[]>(() => {
  const lines: number[] = []
  let acc = 0
  headerGroups.value.forEach((g, i) => {
    acc += g.width
    if (i < headerGroups.value.length - 1) lines.push(acc)
  })
  return lines
})

// ---------- 長條計算 ----------
interface DragState {
  taskId: string
  mode: 'move' | 'resize-start' | 'resize-end'
  originStart: Date
  originEnd: Date
  startClientX: number
  deltaDays: number
}
const dragState = ref<DragState | null>(null)
const dragTooltip = ref<{ x: number; y: number; text: string } | null>(null)

const clampPercent = (v: number) => Math.min(100, Math.max(0, Number(v) || 0))

const durationOf = (task: Progress2Task): number => {
  const s = parseYmd(task.startDate)
  const e = parseYmd(task.endDate)
  if (!s || !e) return 0
  return inclusiveDays(s, e)
}

/** 套用拖曳中的預覽位移後的起訖日 */
const effectiveDates = (task: Progress2Task): { start: Date; end: Date } | null => {
  const s = parseYmd(task.startDate)
  const e = parseYmd(task.endDate)
  if (!s || !e) return null
  const drag = dragState.value
  if (!drag || drag.taskId !== task.id) return { start: s, end: e }
  let start = new Date(drag.originStart)
  let end = new Date(drag.originEnd)
  if (drag.mode === 'move') {
    start = addDays(start, drag.deltaDays)
    end = addDays(end, drag.deltaDays)
  } else if (drag.mode === 'resize-start') {
    start = addDays(start, drag.deltaDays)
    if (start > end) start = new Date(end)
  } else {
    end = addDays(end, drag.deltaDays)
    if (end < start) end = new Date(start)
  }
  return { start, end }
}

const barGeometry = (task: Progress2Task): { left: number; width: number } | null => {
  const dates = effectiveDates(task)
  if (!dates) return null
  const offset = diffDays(dateRange.value.start, dates.start)
  const span = inclusiveDays(dates.start, dates.end)
  return { left: dayToPx(offset), width: Math.max(dayWidth.value, span * dayWidth.value) }
}

const barStyle = (task: Progress2Task) => {
  const geo = barGeometry(task)
  if (!geo) return {}
  return { left: geo.left + 'px', width: geo.width + 'px' }
}

const barClass = (task: Progress2Task) => {
  const e = parseYmd(task.endDate)
  const done = clampPercent(task.progress) >= 100
  const delayed = !done && e != null && e < today
  return {
    'g2-bar-done': done,
    'g2-bar-delayed': delayed,
    'g2-bar-dragging': dragState.value?.taskId === task.id
  }
}

const barTitle = (task: Progress2Task) => {
  const dates = effectiveDates(task)
  if (!dates) return task.name
  return `${task.name}\n${formatDisplay(dates.start)} ~ ${formatDisplay(dates.end)}（${inclusiveDays(dates.start, dates.end)} 天）\n進度 ${clampPercent(task.progress)}%`
}

// ---------- 拖曳 ----------
const onBarMouseDown = (task: Progress2Task, mode: DragState['mode'], event: MouseEvent) => {
  if (event.button !== 0) return
  const s = parseYmd(task.startDate)
  const e = parseYmd(task.endDate)
  if (!s || !e) return
  event.preventDefault()
  selectedId.value = task.id
  dragState.value = {
    taskId: task.id,
    mode,
    originStart: s,
    originEnd: e,
    startClientX: event.clientX,
    deltaDays: 0
  }
  updateDragTooltip(task, event)
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.body.classList.add('gantt2-no-select')
}

const findTask = (id: string) => props.tasks.find((t) => t.id === id) || null

const updateDragTooltip = (task: Progress2Task, event: MouseEvent) => {
  const dates = effectiveDates(task)
  if (!dates) {
    dragTooltip.value = null
    return
  }
  dragTooltip.value = {
    x: event.clientX + 14,
    y: event.clientY + 14,
    text: `${formatDisplay(dates.start)} ~ ${formatDisplay(dates.end)}（${inclusiveDays(dates.start, dates.end)} 天）`
  }
}

const onDragMove = (event: MouseEvent) => {
  const drag = dragState.value
  if (!drag) return
  drag.deltaDays = Math.round((event.clientX - drag.startClientX) / dayWidth.value)
  const task = findTask(drag.taskId)
  if (task) updateDragTooltip(task, event)
}

const onDragEnd = () => {
  const drag = dragState.value
  if (drag) {
    const task = findTask(drag.taskId)
    if (task && drag.deltaDays !== 0) {
      const dates = effectiveDates(task)
      if (dates) {
        emit('update-task', task.id, { startDate: toYmd(dates.start), endDate: toYmd(dates.end) })
      }
    }
  }
  dragState.value = null
  dragTooltip.value = null
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.body.classList.remove('gantt2-no-select')
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.body.classList.remove('gantt2-no-select')
  stopNameColumnResize()
})

/** 未排程項目：點擊時間軸直接排入（預設 7 天） */
const onEmptyChartMouseDown = (task: Progress2Task, event: MouseEvent) => {
  if (event.button !== 0) return
  if (parseYmd(task.startDate) && parseYmd(task.endDate)) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const offsetDays = Math.floor((event.clientX - rect.left) / dayWidth.value)
  const start = addDays(dateRange.value.start, Math.max(0, Math.min(totalDays.value - 1, offsetDays)))
  const end = addDays(start, 6)
  selectedId.value = task.id
  emit('update-task', task.id, { startDate: toYmd(start), endDate: toYmd(end) })
}

// ---------- 表格編輯 ----------
const onNameChange = (task: Progress2Task, event: Event) => {
  const value = (event.target as HTMLInputElement).value.trim()
  if (value) emit('update-task', task.id, { name: value })
}

const onStartChange = (task: Progress2Task, event: Event) => {
  const value = (event.target as HTMLInputElement).value || null
  const patch: Partial<Progress2Task> = { startDate: value }
  const s = parseYmd(value)
  const e = parseYmd(task.endDate)
  if (s && !e) patch.endDate = toYmd(addDays(s, 6))
  else if (s && e && e < s) patch.endDate = toYmd(s)
  emit('update-task', task.id, patch)
}

const onEndChange = (task: Progress2Task, event: Event) => {
  const value = (event.target as HTMLInputElement).value || null
  const patch: Partial<Progress2Task> = { endDate: value }
  const e = parseYmd(value)
  const s = parseYmd(task.startDate)
  if (e && !s) patch.startDate = toYmd(e)
  else if (e && s && s > e) patch.startDate = toYmd(e)
  emit('update-task', task.id, patch)
}

const onNumberChange = (task: Progress2Task, field: 'costRatio' | 'progress', event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update-task', task.id, { [field]: Number.isFinite(value) ? value : 0 })
}

// ---------- 匯出 PNG（自製 canvas 繪製，不依賴第三方套件） ----------
const EXPORT_COLORS = {
  bg: '#ffffff',
  border: '#d0d5dd',
  text: '#344054',
  muted: '#667085',
  weekend: '#f2f4f7',
  weekendText: '#dc3545',
  barNormal: '#0d6efd',
  barDone: '#198754',
  barDelayed: '#dc3545',
  progressOverlay: 'rgba(0, 0, 0, 0.28)',
  today: '#dc3545',
  selectedHeaderBg: '#f8f9fa'
}

interface ExportColumn {
  label: string
  width: number
  align: 'left' | 'center'
  value: (task: Progress2Task, index: number) => string
}

const exportColumns: ExportColumn[] = [
  { label: '#', width: 48, align: 'center', value: (_t, i) => String(i + 1) },
  { label: '項目名稱', width: 240, align: 'left', value: (t) => t.name },
  { label: '開始日期', width: 120, align: 'center', value: (t) => t.startDate || '-' },
  { label: '結束日期', width: 120, align: 'center', value: (t) => t.endDate || '-' },
  { label: '工期', width: 64, align: 'center', value: (t) => (durationOf(t) ? `${durationOf(t)}天` : '-') },
  { label: '權重%', width: 72, align: 'center', value: (t) => String(t.costRatio ?? 0) },
  { label: '進度%', width: 72, align: 'center', value: (t) => String(clampPercent(t.progress)) }
]

const drawClippedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  align: 'left' | 'center'
) => {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y - 18, maxWidth, 36)
  ctx.clip()
  ctx.textAlign = align
  const tx = align === 'center' ? x + maxWidth / 2 : x + 6
  ctx.fillText(text, tx, y)
  ctx.restore()
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

const renderPngBlobAtCurrentZoom = (
  renderTasks: Progress2Task[] = props.tasks,
): Promise<Blob | null> => {
  if (!renderTasks.length) return Promise.resolve(null)
  exportColumns[1].width = nameColumnWidth.value
  const C = EXPORT_COLORS
  const pad = 22
  const titleH = 58
  const groupH = 32
  const tickH = 30
  const rowH = 62
  const exportLeftW = exportColumns.reduce((sum, c) => sum + c.width, 0)
  const chartW = chartWidth.value
  const width = pad * 2 + exportLeftW + chartW
  const headerTop = pad + titleH
  const bodyTop = headerTop + groupH + tickH
  const height = bodyTop + renderTasks.length * rowH + pad
  const chartX = pad + exportLeftW

  const scale = Math.min(2, Math.max(1, 6000 / width))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.scale(scale, scale)
  ctx.textBaseline = 'middle'

  // 背景與標題
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = C.text
  ctx.font = '600 30px "Noto Sans TC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${props.title ? props.title + '｜' : ''}施工進度甘特圖`, pad, pad + 22)
  ctx.font = '16px "Noto Sans TC", sans-serif'
  ctx.fillStyle = C.muted
  ctx.textAlign = 'right'
  ctx.fillText(`匯出日期：${formatDisplay(new Date())}`, width - pad, pad + 22)

  // 表頭底色
  ctx.fillStyle = C.selectedHeaderBg
  ctx.fillRect(pad, headerTop, exportLeftW + chartW, groupH + tickH)

  // 時間軸表頭：群組列
  ctx.font = '600 17px "Noto Sans TC", sans-serif'
  ctx.fillStyle = C.text
  let gx = chartX
  headerGroups.value.forEach((g) => {
    drawClippedText(ctx, g.label, gx, headerTop + groupH / 2, g.width, 'center')
    ctx.strokeStyle = C.border
    ctx.beginPath()
    ctx.moveTo(gx + g.width, headerTop)
    ctx.lineTo(gx + g.width, headerTop + groupH)
    ctx.stroke()
    gx += g.width
  })

  // 時間軸表頭：刻度列
  ctx.font = '15px "Noto Sans TC", sans-serif'
  let tx = chartX
  headerTicks.value.forEach((t) => {
    if (t.weekend) {
      ctx.fillStyle = 'rgba(220, 53, 69, 0.08)'
      ctx.fillRect(tx, headerTop + groupH, t.width, tickH)
    }
    ctx.fillStyle = t.weekend ? C.weekendText : C.muted
    if (t.width >= 14) {
      drawClippedText(ctx, t.label, tx, headerTop + groupH + tickH / 2, t.width, 'center')
    }
    tx += t.width
  })

  // 左表格表頭
  ctx.font = '600 17px "Noto Sans TC", sans-serif'
  ctx.fillStyle = C.text
  let cx = pad
  exportColumns.forEach((col) => {
    drawClippedText(ctx, col.label, cx, headerTop + (groupH + tickH) / 2, col.width, 'center')
    cx += col.width
  })

  // 圖區背景：週末底色與月（年）分界線
  const bodyHeight = renderTasks.length * rowH
  weekendBands.value.forEach((band) => {
    ctx.fillStyle = C.weekend
    ctx.fillRect(chartX + band.left, bodyTop, band.width, bodyHeight)
  })
  ctx.strokeStyle = C.border
  boundaryLines.value.forEach((line) => {
    ctx.beginPath()
    ctx.moveTo(chartX + line, bodyTop)
    ctx.lineTo(chartX + line, bodyTop + bodyHeight)
    ctx.stroke()
  })

  // 各列
  renderTasks.forEach((task, index) => {
    const rowY = bodyTop + index * rowH
    const centerY = rowY + rowH / 2

    // 左表格文字
    ctx.font = '18px "Noto Sans TC", sans-serif'
    ctx.fillStyle = C.text
    let colX = pad
    exportColumns.forEach((col) => {
      drawClippedText(ctx, col.value(task, index), colX, centerY, col.width, col.align)
      colX += col.width
    })

    // 長條
    const geo = barGeometry(task)
    if (geo) {
      const done = clampPercent(task.progress) >= 100
      const end = parseYmd(task.endDate)
      const delayed = !done && end != null && end < today
      const barX = chartX + geo.left
      const barHeight = 34
      const barY = rowY + (rowH - barHeight) / 2
      ctx.fillStyle = done ? C.barDone : delayed ? C.barDelayed : C.barNormal
      drawRoundedRect(ctx, barX, barY, geo.width, barHeight, 6)
      ctx.fill()
      // 進度覆蓋
      const progressW = (geo.width * clampPercent(task.progress)) / 100
      if (progressW > 0) {
        ctx.save()
        drawRoundedRect(ctx, barX, barY, geo.width, barHeight, 6)
        ctx.clip()
        ctx.fillStyle = C.progressOverlay
        ctx.fillRect(barX, barY, progressW, barHeight)
        ctx.restore()
      }
      // 名稱
      ctx.fillStyle = '#ffffff'
      ctx.font = '16px "Noto Sans TC", sans-serif'
      drawClippedText(ctx, task.name, barX, barY + barHeight / 2, Math.max(0, geo.width - 8), 'left')
    } else {
      ctx.fillStyle = C.muted
      ctx.font = '16px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('（未排程）', chartX + 8, centerY)
    }

    // 列分隔線
    ctx.strokeStyle = C.border
    ctx.beginPath()
    ctx.moveTo(pad, rowY + rowH)
    ctx.lineTo(pad + exportLeftW + chartW, rowY + rowH)
    ctx.stroke()
  })

  // 表格框線（欄分隔 + 外框 + 表頭分隔）
  ctx.strokeStyle = C.border
  let lineX = pad
  exportColumns.forEach((col) => {
    lineX += col.width
    ctx.beginPath()
    ctx.moveTo(lineX, headerTop)
    ctx.lineTo(lineX, bodyTop + bodyHeight)
    ctx.stroke()
  })
  ctx.strokeRect(pad, headerTop, exportLeftW + chartW, groupH + tickH + bodyHeight)
  ctx.beginPath()
  ctx.moveTo(pad, bodyTop)
  ctx.lineTo(pad + exportLeftW + chartW, bodyTop)
  ctx.stroke()

  // 今天線
  if (todayOffsetPx.value != null) {
    const x = chartX + todayOffsetPx.value
    ctx.strokeStyle = C.today
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(x, bodyTop)
    ctx.lineTo(x, bodyTop + bodyHeight)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineWidth = 1
    ctx.fillStyle = C.today
    ctx.font = '14px "Noto Sans TC", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('今天', x + 5, bodyTop + 14)
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

const renderPngBlob = (exportZoom: ZoomKey = 'month'): Promise<Blob | null> => {
  const previousZoom = zoom.value
  zoom.value = exportZoom
  try {
    return renderPngBlobAtCurrentZoom()
  } finally {
    zoom.value = previousZoom
  }
}

const renderPngBlobs = async (
  exportZoom: ZoomKey = 'month',
  pageSize = 15,
): Promise<Blob[]> => {
  if (!props.tasks.length) return []
  const normalizedPageSize = Math.max(1, Math.floor(pageSize))
  const previousZoom = zoom.value
  zoom.value = exportZoom
  try {
    const blobs: Blob[] = []
    for (let index = 0; index < props.tasks.length; index += normalizedPageSize) {
      const blob = await renderPngBlobAtCurrentZoom(
        props.tasks.slice(index, index + normalizedPageSize),
      )
      if (blob) blobs.push(blob)
    }
    return blobs
  } finally {
    zoom.value = previousZoom
  }
}

const exportPng = async () => {
  const blob = await renderPngBlob()
  if (!blob) return
  const base = (props.title || '施工進度').replace(/[\\/:*?"<>|]+/g, '_')
  const fileName = `${base}_甘特圖_${new Date().toISOString().slice(0, 10)}.png`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

// ---------- 捲動 ----------
const scrollToToday = () => {
  const el = scrollEl.value
  if (!el || todayOffsetPx.value == null) return
  const viewport = el.clientWidth - leftWidth.value
  el.scrollLeft = Math.max(0, todayOffsetPx.value - viewport / 2)
}

defineExpose({ scrollToToday, renderPngBlob, renderPngBlobs })
</script>

<style scoped>
.gantt2-wrapper {
  min-height: 420px;
  color: rgba(226, 232, 240, 0.92);
  background-color: #0f172a;
}

.gantt2-toolbar {
  background-color: #1e293b;
  border-bottom-color: rgba(255, 255, 255, 0.12) !important;
}

.gantt2-scroll {
  overflow: auto;
  position: relative;
  background-color: #0f172a;
}

.gantt2-inner {
  min-width: 100%;
}

/* ---------- 表頭 ---------- */
.gantt2-header {
  position: sticky;
  top: 0;
  z-index: 6;
  background-color: #1e293b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.gantt2-left {
  position: sticky;
  left: 0;
  z-index: 5;
  background-color: #111827;
  border-right: 2px solid rgba(255, 255, 255, 0.14);
  flex-shrink: 0;
}

.gantt2-left-header {
  z-index: 7;
  font-weight: 600;
  font-size: 0.8rem;
  align-items: center;
}

.g2-tl-groups,
.g2-tl-ticks {
  white-space: nowrap;
}

.g2-tl-group {
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  border-right: 1px solid rgba(255, 255, 255, 0.14);
  overflow: hidden;
  padding: 2px 0;
  flex-shrink: 0;
}

.g2-tl-tick {
  font-size: 0.68rem;
  text-align: center;
  color: rgba(203, 213, 225, 0.72);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  padding: 1px 0;
  flex-shrink: 0;
}

.g2-tick-weekend {
  background: rgba(220, 53, 69, 0.08);
  color: var(--bs-danger);
}

/* ---------- 儲存格 ---------- */
.g2-cell {
  padding: 4px 6px;
  display: flex;
  align-items: center;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  flex-shrink: 0;
}

.g2-col-index { width: 64px; font-size: 0.75rem; }
.g2-col-name {
  flex: 0 0 auto;
  min-width: 140px;
  position: relative;
}
.gantt2-left-header .g2-col-name {
  overflow: visible;
}
.g2-col-date { width: 140px; }
.g2-col-num { width: 78px; font-size: 0.78rem; justify-content: center; }
.g2-col-op { width: 40px; justify-content: center; }

.g2-input {
  font-size: 0.78rem;
  padding: 2px 6px;
  color: rgba(255, 255, 255, 0.92);
  background-color: rgba(2, 6, 23, 0.72);
  border-color: rgba(255, 255, 255, 0.16);
  color-scheme: dark;
}

.g2-input:focus {
  color: #fff;
  background-color: rgba(2, 6, 23, 0.9);
  border-color: rgba(var(--bs-primary-rgb), 0.65);
  box-shadow: 0 0 0 0.15rem rgba(var(--bs-primary-rgb), 0.16);
}

.g2-source-icon {
  position: absolute;
  right: 12px;
  font-size: 0.65rem;
  color: var(--bs-secondary-color);
  pointer-events: none;
}

.g2-column-resizer {
  position: absolute;
  z-index: 3;
  top: 0;
  right: -1px;
  bottom: 0;
  width: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
}

.g2-column-resizer::after {
  content: '';
  position: absolute;
  top: 20%;
  right: 3px;
  bottom: 20%;
  width: 2px;
  border-radius: 2px;
  background: rgba(148, 163, 184, 0.45);
  transition: background 0.12s ease;
}

.g2-column-resizer:hover::after {
  background: #60a5fa;
}

.g2-order-btns {
  display: inline-flex;
  flex-direction: column;
  line-height: 0.7;
}

.g2-order-btn {
  color: var(--bs-secondary-color);
  font-size: 0.7rem;
  line-height: 0.8;
}

.g2-order-btn:disabled {
  opacity: 0.25;
}

/* ---------- 內容列 ---------- */
.gantt2-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  height: 40px;
}

.gantt2-row .gantt2-left {
  align-items: center;
}

.g2-row-selected .gantt2-left {
  /* 需維持不透明：以底色打底再疊選取色，避免長條捲到左側表格下方時透出 */
  background-color: #172554;
  background-image: linear-gradient(rgba(13, 110, 253, 0.12), rgba(13, 110, 253, 0.12));
}

.gantt2-row-chart {
  flex-shrink: 0;
  height: 100%;
  background-color: #0f172a;
}

/* ---------- 覆蓋層 ---------- */
.gantt2-overlay {
  position: absolute;
  top: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.g2-weekend-band {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(148, 163, 184, 0.07);
}

.g2-boundary-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.14);
}

.g2-today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--bs-danger);
  opacity: 0.75;
}

.g2-today-label {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 0.62rem;
  color: var(--bs-danger);
  white-space: nowrap;
}

/* ---------- 長條 ---------- */
.gantt2-bar {
  position: absolute;
  top: 7px;
  height: 26px;
  background: rgba(13, 110, 253, 0.85);
  border: 1px solid rgba(13, 110, 253, 1);
  border-radius: 5px;
  cursor: grab;
  z-index: 2;
  display: flex;
  align-items: center;
  overflow: hidden;
  user-select: none;
}

.gantt2-bar:active,
.g2-bar-dragging {
  cursor: grabbing;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.35);
}

.g2-bar-done {
  background: rgba(25, 135, 84, 0.85);
  border-color: rgb(25, 135, 84);
}

.g2-bar-delayed {
  background: rgba(220, 53, 69, 0.75);
  border-color: rgb(220, 53, 69);
}

.g2-bar-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.g2-bar-label {
  position: relative;
  z-index: 1;
  font-size: 0.7rem;
  color: #fff;
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.g2-bar-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 2;
}

.g2-bar-handle-start { left: 0; border-radius: 5px 0 0 5px; }
.g2-bar-handle-end { right: 0; border-radius: 0 5px 5px 0; }

.g2-bar-handle:hover {
  background: rgba(255, 255, 255, 0.35);
}

.g2-bar-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding-left: 12px;
  opacity: 0;
  cursor: copy;
  transition: opacity 0.15s;
}

.gantt2-row-chart:hover .g2-bar-placeholder {
  opacity: 0.7;
}

/* ---------- 拖曳提示 ---------- */
.gantt2-drag-tooltip {
  position: fixed;
  z-index: 2000;
  background: var(--bs-dark, #212529);
  color: #fff;
  font-size: 0.72rem;
  padding: 4px 8px;
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
</style>

<style>
/* 拖曳期間停用文字選取（掛在 body 上，需全域樣式） */
body.gantt2-no-select {
  user-select: none !important;
}
body.gantt2-column-resizing {
  cursor: col-resize !important;
  user-select: none !important;
}
</style>
