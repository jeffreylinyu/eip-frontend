<template>
  <div class="curve-chart-wrapper d-flex flex-column flex-fill position-relative">
    <div class="chart-toolbar position-absolute top-0 end-0 p-3 d-flex gap-2">
      <button class="btn btn-sm btn-outline-light" @click="refreshChart" title="重新整理">
        <i class="fa fa-sync-alt me-1"></i>重新整理
      </button>
      <div class="btn-group">
        <button
          type="button"
          class="btn btn-sm btn-outline-light dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          匯出
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="#" @click.prevent="exportAs('PNG')">匯出 PNG</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="exportAs('JPG')">匯出 JPG</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="exportAs('SVG')">匯出 SVG</a></li>
          <li><a class="dropdown-item" href="#" @click.prevent="exportAs('PDF')">匯出 PDF</a></li>
        </ul>
      </div>
      <select
        v-model="pointDensity"
        class="form-select form-select-sm chart-density-select"
      >
        <option value="auto">自動刻度</option>
        <option value="daily">每天一點</option>
        <option value="every3">每 3 天一點</option>
        <option value="every5">每 5 天一點</option>
        <option value="every10">每 10 天一點</option>
        <option value="weekly">每週一點</option>
        <option value="monthly">每月一點</option>
      </select>
    </div>

    <div class="chart-body flex-fill h-100 w-100">
      <div
        v-if="!hasCurveData"
        class="empty-state d-flex flex-column justify-content-center align-items-center h-100 text-center"
      >
        <i class="fa fa-info-circle fa-3x text-muted mb-3"></i>
        <h5 class="text-muted mb-2">尚未產生 S 曲線</h5>
        <p class="text-muted mb-0">{{ emptyStateHint }}</p>
      </div>

      <ejs-chart
        v-else
        ref="progressChart"
        :primaryXAxis="primaryXAxis"
        :primaryYAxis="primaryYAxis"
        :axes="additionalAxes"
        :chartArea="chartArea"
        :legendSettings="legendSettings"
        :tooltip="tooltipSettings"
        :title="chartTitle"
        height="100%"
        @axisLabelRender="handleAxisLabelRender"
        @tooltipRender="handleTooltipRender"
      >
        <e-series-collection>
          <!-- 預定進度 -->
          <e-series
            :dataSource="chartSeriesData"
            type="Column"
            xName="date"
            yName="displayIncrementPercent"
            :xAxisName="percentAxisName"
            yAxisName="incrementYAxis"
            :name="incrementSeriesName"
            :columnSpacing="0.2"
            :border="{ width: 0 }"
            :fill="'rgba(13,110,253,0.45)'"
            :marker="{ visible: false }"
          ></e-series>
          <!-- 累計進度：跟下方資料一樣 -->
          <e-series
            :dataSource="displayedProgressData"
            type="Spline"
            xName="date"
            yName="plannedPercent"
            :name="seriesName"
            :width="2.5"
            :fill="'#0d6efd'"
            :marker="{
              visible: true,
              width: 7,
              height: 7,
              shape: 'Circle',
              isFilled: true,
              fill: '#000000',
              border: { width: 0 }
            }"
          ></e-series>
        </e-series-collection>
      </ejs-chart>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, provide, ref, watch } from 'vue'
import { useScheduleStore } from '@/stores/schedule'
import {
  ChartComponent as EjsChart,
  ColumnSeries,
  SplineSeries,
  DateTime,
  Legend,
  Tooltip,
  DataLabel,
  Export
} from '@syncfusion/ej2-vue-charts'

provide('chart', [ColumnSeries, SplineSeries, DateTime, Legend, Tooltip, DataLabel, Export])

const SERIES_NAME = '累計進度'
const INCREMENT_SERIES_NAME = '預定進度'
const PERCENT_AXIS_NAME = 'percent-summary-axis'
const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate())

const ensureDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : startOfDay(value)
  }
  const parsed = new Date(value as string | number)
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed)
}

const inclusiveDuration = (start: Date, end: Date): number => {
  const s = startOfDay(start).getTime()
  const e = startOfDay(end).getTime()
  if (Number.isNaN(s) || Number.isNaN(e)) return 0
  const diff = Math.round((e - s) / DAY_MS)
  return diff >= 0 ? diff + 1 : 0
}

const getDayOffset = (start: Date, target: Date): number => {
  const base = startOfDay(start).getTime()
  const goal = startOfDay(target).getTime()
  return Math.round((goal - base) / DAY_MS)
}

const computeIntervalOptions = (totalDays: number) => {
  if (totalDays <= 0) return { intervalType: 'Days', interval: 1, labelFormat: 'MM/dd' as const }
  if (totalDays > 365) return { intervalType: 'Months', interval: 1, labelFormat: 'yyyy/MM' as const }
  if (totalDays > 150) return { intervalType: 'Weeks', interval: 2, labelFormat: 'MM/dd' as const }
  if (totalDays > 90) return { intervalType: 'Days', interval: 7, labelFormat: 'MM/dd' as const }
  if (totalDays > 45) return { intervalType: 'Days', interval: 5, labelFormat: 'MM/dd' as const }
  if (totalDays > 21) return { intervalType: 'Days', interval: 3, labelFormat: 'MM/dd' as const }
  if (totalDays > 14) return { intervalType: 'Days', interval: 2, labelFormat: 'MM/dd' as const }
  return { intervalType: 'Days', interval: 1, labelFormat: 'MM/dd' as const }
}

const percentFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})

const dateFormatter = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

const formatPercent = (value: number) =>
  Number.isFinite(value) ? `${percentFormatter.format(Math.max(0, value))}%` : '0.0%'

interface CurveLeafTask {
  id: string
  startDate: Date
  endDate: Date
  duration: number
  costRatio: number
}

interface CurveTask {
  id: string
  startDay: number
  endDay: number
  span: number
  plannedWeight: number
  plannedDaily: number
}

interface ProgressPoint {
  dayIndex: number
  date: Date
  plannedPercent: number
  plannedIncrementPercent: number
  plannedValue: number
}

interface Props {
  versionId?: number | null
}

const props = defineProps<Props>()
const scheduleStore = useScheduleStore()
const progressChart = ref<any>(null)
const pointDensity = ref<'auto' | 'daily' | 'every3' | 'every5' | 'every10' | 'weekly' | 'monthly'>('auto')

const currentVersion = computed(() => {
  if (props.versionId) {
    return scheduleStore.versions.find(v => v.id === props.versionId) || null
  }
  return scheduleStore.currentVersion
})

const currentTasks = computed(() => currentVersion.value?.tasks || [])

const leafTasks = computed<CurveLeafTask[]>(() => {
  const items: CurveLeafTask[] = []
  const visit = (nodes: any[]) => {
    nodes.forEach(node => {
      const children = Array.isArray(node.subtasks) ? node.subtasks : []
      if (children.length > 0) {
        visit(children)
        return
      }
      const start = ensureDate(node.StartDate)
      const end = ensureDate(node.EndDate)
      if (!start || !end) return

      const rawDuration = Number(node.Duration)
      const duration =
        Number.isFinite(rawDuration) && rawDuration > 0
          ? Math.round(rawDuration)
          : inclusiveDuration(start, end)
      if (!duration || duration <= 0) return

      const costRatio = Number(node.CostRatio)
      items.push({
        id: String(node.Uid || node.TaskID || items.length + 1),
        startDate: start,
        endDate: end,
        duration: Math.max(1, duration),
        costRatio: Number.isFinite(costRatio) ? Math.max(0, costRatio) : 0
      })
    })
  }
  visit(currentTasks.value || [])
  return items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
})

const projectRange = computed(() => {
  const tasks = leafTasks.value
  if (!tasks.length) {
    return { startDate: null as Date | null, endDate: null as Date | null, totalCalendarDays: 0 }
  }
  const startTime = Math.min(...tasks.map(task => task.startDate.getTime()))
  const endTime = Math.max(...tasks.map(task => task.endDate.getTime()))
  const startDate = startOfDay(new Date(startTime))
  const endDate = startOfDay(new Date(endTime))
  const totalCalendarDays = inclusiveDuration(startDate, endDate)
  return { startDate, endDate, totalCalendarDays }
})

const curveSource = computed(() => {
  const tasks = leafTasks.value
  const startDate = projectRange.value.startDate
  if (!startDate || !tasks.length) {
    return { tasks: [] as CurveTask[], plannedTotal: 0, startDate: null as Date | null }
  }

  let costTotal = 0
  tasks.forEach(task => {
    if (task.costRatio > 0) costTotal += task.costRatio
  })

  let usesDuration = costTotal <= 0
  let plannedTotal = usesDuration
    ? tasks.reduce((sum, task) => sum + task.duration, 0)
    : costTotal

  if (!plannedTotal || plannedTotal <= 0) {
    plannedTotal = tasks.reduce((sum, task) => sum + task.duration, 0)
    usesDuration = true
  }

  const normalized: CurveTask[] = tasks.map(task => {
    const plannedWeight = usesDuration ? task.duration : Math.max(0, task.costRatio)
    const startDay = Math.max(0, getDayOffset(startDate, task.startDate))
    const span = Math.max(1, Math.round(task.duration))
    const endDay = startDay + span - 1
    const plannedDaily = plannedWeight / span
    return {
      id: task.id,
      startDay,
      endDay,
      span,
      plannedWeight,
      plannedDaily
    }
  })

  return {
    tasks: normalized,
    plannedTotal,
    startDate
  }
})

const computePlannedCumulative = (task: CurveTask, dayIndex: number) => {
  if (dayIndex < task.startDay) return 0
  if (dayIndex >= task.endDay) return task.plannedWeight
  const completed = dayIndex - task.startDay + 1
  return Math.min(task.plannedWeight, completed * task.plannedDaily)
}

/** 每天一筆的原始資料 */
const progressData = computed<ProgressPoint[]>(() => {
  const ctx = curveSource.value
  const totalDays = projectRange.value.totalCalendarDays
  if (!ctx.startDate || !ctx.tasks.length || !ctx.plannedTotal || totalDays <= 0) {
    return []
  }
  const baseTime = ctx.startDate.getTime()
  let cumulativePlanned = 0
  let previousPercent = 0
  const data: ProgressPoint[] = []

  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(baseTime + day * DAY_MS)
    let plannedValue = 0

    ctx.tasks.forEach(task => {
      plannedValue += computePlannedCumulative(task, day)
    })

    cumulativePlanned = Math.max(cumulativePlanned, plannedValue)
    let plannedPercent = (cumulativePlanned / ctx.plannedTotal) * 100
    plannedPercent = Math.min(100, Math.max(0, plannedPercent))

    const plannedIncrement = Math.max(0, plannedPercent - previousPercent)
    previousPercent = plannedPercent

    data.push({
      dayIndex: day,
      date: currentDate,
      plannedPercent,
      plannedIncrementPercent: plannedIncrement,
      plannedValue: cumulativePlanned
    })
  }

  if (data.length) {
    const last = data[data.length - 1]
    last.plannedPercent = 100
  }

  return data
})

/** 跟 X 軸 interval 一樣的資料（下方數據） */
const axisIntervalOptions = computed(() =>
  computeIntervalOptions(projectRange.value.totalCalendarDays)
)

const displayedProgressData = computed<ProgressPoint[]>(() => {
  const full = progressData.value
  const { startDate, endDate, totalCalendarDays } = projectRange.value
  if (!full.length || !startDate || !endDate) return []

  const density = pointDensity.value
  const result: ProgressPoint[] = []

  // 1) 使用者手動選的
  if (density === 'daily') {
    return full
  }

  if (density === 'every3') {
    for (let i = 0; i < full.length; i += 3) {
      result.push(full[i])
    }
    const last = full[full.length - 1]
    if (!result.length || result[result.length - 1].date.getTime() !== last.date.getTime()) {
      result.push(last)
    }
    return result
  }

  if (density === 'every5') {
    for (let i = 0; i < full.length; i += 5) {
      result.push(full[i])
    }
    const last = full[full.length - 1]
    if (!result.length || result[result.length - 1].date.getTime() !== last.date.getTime()) {
      result.push(last)
    }
    return result
  }

  if (density === 'every10') {
    for (let i = 0; i < full.length; i += 10) {
      result.push(full[i])
    }
    const last = full[full.length - 1]
    if (!result.length || result[result.length - 1].date.getTime() !== last.date.getTime()) {
      result.push(last)
    }
    return result
  }

  if (density === 'weekly') {
    const findNearest = (d: Date): ProgressPoint | null => {
      const target = startOfDay(d).getTime()
      let nearest: ProgressPoint | null = null
      let diff = Number.POSITIVE_INFINITY
      for (const p of full) {
        const t = startOfDay(p.date).getTime()
        const dff = Math.abs(t - target)
        if (dff < diff) {
          diff = dff
          nearest = p
        }
      }
      return nearest
    }
    const startTime = startDate.getTime()
    for (let t = startTime; t <= endDate.getTime(); t += 7 * DAY_MS) {
      const nearest = findNearest(new Date(t))
      if (nearest) {
        result.push(nearest)
      }
    }
    const last = full[full.length - 1]
    if (!result.length || result[result.length - 1].date.getTime() !== last.date.getTime()) {
      result.push(last)
    }
    return result
  }

  if (density === 'monthly') {
    const findNearest = (d: Date): ProgressPoint | null => {
      const target = startOfDay(d).getTime()
      let nearest: ProgressPoint | null = null
      let diff = Number.POSITIVE_INFINITY
      for (const p of full) {
        const t = startOfDay(p.date).getTime()
        const dff = Math.abs(t - target)
        if (dff < diff) {
          diff = dff
          nearest = p
        }
      }
      return nearest
    }
    const d = new Date(startDate)
    while (d <= endDate) {
      const nearest = findNearest(d)
      if (nearest) result.push(nearest)
      d.setMonth(d.getMonth() + 1)
    }
    const last = full[full.length - 1]
    if (!result.length || result[result.length - 1].date.getTime() !== last.date.getTime()) {
      result.push(last)
    }
    return result
  }

  // 2) 原本的「自動」邏輯
  const opts = axisIntervalOptions.value
  if (opts.intervalType === 'Days') {
    for (let i = 0; i < totalCalendarDays; i += opts.interval) {
      const p = full[i]
      if (p) result.push(p)
    }
    const last = full[full.length - 1]
    if (!result.length || result[result.length - 1].date.getTime() !== last.date.getTime()) {
      result.push(last)
    }
    return result
  }

  // 其他（週、月）就用原本的寫法
  const findNearest = (d: Date): ProgressPoint | null => {
    const target = startOfDay(d).getTime()
    let nearest: ProgressPoint | null = null
    let diff = Number.POSITIVE_INFINITY
    for (const p of full) {
      const t = startOfDay(p.date).getTime()
      const dff = Math.abs(t - target)
      if (dff < diff) {
        diff = dff
        nearest = p
      }
    }
    return nearest
  }

  if (opts.intervalType === 'Weeks') {
    const step = 7 * opts.interval
    const startTime = startDate.getTime()
    for (let t = startTime; t <= endDate.getTime(); t += step * DAY_MS) {
      const p = findNearest(new Date(t))
      if (p) result.push(p)
    }
    const last = full[full.length - 1]
    if (result.length && result[result.length - 1].date.getTime() !== last.date.getTime()) {
      result.push(last)
    }
    return result
  }

  if (opts.intervalType === 'Months') {
    const d = new Date(startDate)
    while (d <= endDate) {
      const p = findNearest(d)
      if (p) result.push(p)
      d.setMonth(d.getMonth() + opts.interval)
    }
    const last = full[full.length - 1]
    if (result.length && result[result.length - 1].date.getTime() !== last.date.getTime()) {
      result.push(last)
    }
    return result
  }

  return full
})

// 真的拿去畫圖的資料：同一批日期，但增量是「這個點 - 上一個點」
const chartSeriesData = computed(() => {
  const src = displayedProgressData.value
  if (!src.length) return []

  const out: Array<ProgressPoint & { displayIncrementPercent: number }> = []
  for (let i = 0; i < src.length; i++) {
    const curr = src[i]
    const prev = src[i - 1]
    const incr = prev
      ? Math.max(0, curr.plannedPercent - prev.plannedPercent)
      : curr.plannedPercent // 第一筆就當成從 0 漲到這裡
    out.push({
      ...curr,
      displayIncrementPercent: incr
    })
  }
  return out
})

/** 這裡開始都改成用 displayedProgressData，確保圖表=下面數據 */
const displayedLookup = computed(() => {
  const m = new Map<number, ProgressPoint>()
  displayedProgressData.value.forEach(p => {
    m.set(startOfDay(p.date).getTime(), p)
  })
  return m
})

const getDisplayedNearestPoint = (time: number): ProgressPoint | null => {
  const map = displayedLookup.value
  const direct = map.get(time)
  if (direct) return direct
  let nearest: ProgressPoint | null = null
  let minDiff = Number.POSITIVE_INFINITY
  displayedProgressData.value.forEach(p => {
    const diff = Math.abs(startOfDay(p.date).getTime() - time)
    if (diff < minDiff) {
      minDiff = diff
      nearest = p
    }
  })
  return nearest
}

const getDisplayedPercentAt = (date: Date): number => {
  const point = getDisplayedNearestPoint(startOfDay(date).getTime())
  return point ? point.plannedPercent : 0
}

const getDisplayedIncrementForInterval = (date: Date, axis: any): { increment: number; cumulative: number } => {
  const currentPercent = getDisplayedPercentAt(date)
  const { startDate } = projectRange.value
  if (!startDate) return { increment: 0, cumulative: 0 }

  const interval = axis?.interval ?? 1
  const intervalType = axis?.intervalType || axis?.valueType || 'Days'

  let previousDate: Date
  if (intervalType === 'Weeks') {
    previousDate = new Date(date.getTime() - interval * 7 * DAY_MS)
  } else if (intervalType === 'Months') {
    previousDate = new Date(date)
    previousDate.setMonth(previousDate.getMonth() - interval)
  } else {
    previousDate = new Date(date.getTime() - interval * DAY_MS)
  }

  if (previousDate < startDate) {
    previousDate = startDate
  }

  const previousPercent = getDisplayedPercentAt(previousDate)
  const increment = Math.max(0, currentPercent - previousPercent)
  return { increment, cumulative: currentPercent }
}

const hasCurveData = computed(() => progressData.value.length > 0)

const emptyStateHint = computed(() => {
  if (!currentTasks.value.length) {
    return '請先在其他頁面新增工項並設定起訖日期與工期。'
  }
  return '請確認各工項已設定起訖日期與工期，以便計算預定與累計進度。'
})

const primaryXAxis = computed(() => {
  const { startDate, endDate, totalCalendarDays } = projectRange.value
  const opts = axisIntervalOptions.value
  return {
    valueType: 'DateTime',
    minimum: startDate || undefined,
    maximum: endDate || undefined,
    intervalType: opts.intervalType,
    interval: opts.interval,
    labelFormat: opts.labelFormat,
    opposedPosition: true,
    edgeLabelPlacement: 'Shift',
    majorGridLines: { width: 0 },
    minorGridLines: { width: 0 },
    majorTickLines: { width: 0 },
    lineStyle: { width: 1, color: '#6c757d' },
    labelIntersectAction:
      opts.intervalType === 'Days' && totalCalendarDays > 45 ? 'Rotate45' : 'Auto',
    title: '日期',
    titleStyle: { color: '#333', fontWeight: '600', size: '12px' },
    labelStyle: { color: '#333', size: '11px', fontFamily: 'inherit' }
  }
})

const primaryYAxis = computed(() => ({
  title: '累計進度 (%)',
  minimum: 0,
  maximum: 100,
  interval: 10,
  labelFormat: '{value}%',
  lineStyle: { width: 1, color: '#6c757d' },
  majorGridLines: { width: 0 },
  majorTickLines: { width: 1, color: '#6c757d' },
  minorGridLines: { width: 0 },
  labelStyle: { color: '#333', size: '11px', fontFamily: 'inherit' },
  titleStyle: { color: '#333', fontWeight: '600', size: '12px' }
}))

/** 右側 Y 軸也看「下方數據」的最大值 */
const maxIncrementDisplayed = computed(() =>
  chartSeriesData.value.reduce((m, p) => Math.max(m, p.displayIncrementPercent), 0)
)

const additionalAxes = computed(() => {
  const { startDate, endDate, totalCalendarDays } = projectRange.value
  if (!startDate || !endDate) return []
  const opts = axisIntervalOptions.value

  const percentX = {
    name: PERCENT_AXIS_NAME,
    valueType: 'DateTime',
    minimum: startDate,
    maximum: endDate,
    intervalType: opts.intervalType,
    interval: opts.interval,
    labelFormat: '',
    opposedPosition: false,
    majorGridLines: { width: 0 },
    minorGridLines: { width: 0 },
    majorTickLines: { width: 0 },
    lineStyle: { width: 0 },
    labelStyle: { color: '#333', size: '11px', fontFamily: 'inherit' },
    labelIntersectAction:
      opts.intervalType === 'Days' && totalCalendarDays > 45 ? 'Hide' : 'None'
  }

  const incMax = Math.max(5, Math.ceil(maxIncrementDisplayed.value))
  const incrementY = {
    name: 'incrementYAxis',
    opposedPosition: true,
    minimum: 0,
    maximum: incMax,
    interval: Math.max(1, Math.ceil(incMax / 5)),
    labelFormat: '{value}%',
    lineStyle: { width: 1, color: '#6c757d' },
    majorGridLines: { width: 0 },
    majorTickLines: { width: 1, color: '#6c757d' },
    labelStyle: { color: '#333', size: '11px', fontFamily: 'inherit' },
    title: '預定進度 (%)',
    titleStyle: { color: '#333', fontWeight: '600', size: '12px' }
  }

  return [percentX, incrementY]
})

const chartArea = {
  background: '#ffffff',
  border: { width: 0 }
}

const legendSettings = {
  visible: true,
  position: 'Bottom',
  alignment: 'Center',
  textStyle: { color: '#333', fontSize: '12px' }
}

const tooltipSettings = {
  enable: true,
  shared: true,
  enableMarker: false,
  fill: 'rgba(255, 255, 255, 0.98)',
  textStyle: { color: '#333', fontSize: '12px' }
}

const chartTitle = computed(() => {
  const name = currentVersion.value?.name
  return name ? `${name}｜S 曲線` : 'S 曲線'
})

const seriesName = SERIES_NAME
const incrementSeriesName = INCREMENT_SERIES_NAME
const percentAxisName = PERCENT_AXIS_NAME

const refreshChart = () => {
  const inst = progressChart.value?.ej2Instances
  if (inst && typeof inst.refresh === 'function') {
    inst.refresh()
  }
}

type ExportFormat = 'PNG' | 'JPG' | 'SVG' | 'PDF'
const exportAs = (format: ExportFormat) => {
  const inst = progressChart.value?.ej2Instances
  if (!inst) return
  const base = currentVersion.value?.name || '進度曲線'
  const sanitized = base.replace(/[\\/:*?"<>|]+/g, '_')
  const fileName = `${sanitized}_S曲線_${new Date().toISOString().slice(0, 10)}`
  inst.export(format, fileName)
}

/** tooltip 也改成用下方資料 */
const handleTooltipRender = (args: any) => {
  const index: number | undefined = args.point?.index
  if (index === undefined) return
  
  if (args.series?.name === incrementSeriesName) {
    // 柱狀圖使用 chartSeriesData
    const point = chartSeriesData.value[index]
    if (!point) return
    const header = dateFormatter.format(point.date)
    args.header = `${header}｜第 ${point.dayIndex + 1} 天`
    args.text = `預定進度（區段）：${formatPercent(point.displayIncrementPercent)}`
  } else {
    // 折線圖使用 displayedProgressData
    const point = displayedProgressData.value[index]
    if (!point) return
    const header = dateFormatter.format(point.date)
    args.header = `${header}｜第 ${point.dayIndex + 1} 天`
    args.text = `累計進度：${formatPercent(point.plannedPercent)}`
  }
}

/** ★★★ 最重要：軸標籤也用 chartSeriesData 算，這樣就跟上面柱狀圖一樣了 */
const handleAxisLabelRender = (args: any) => {
  if (args.axis?.name !== PERCENT_AXIS_NAME) return
  if (!chartSeriesData.value.length) {
    args.cancel = true
    return
  }

  const targetTime = startOfDay(new Date(args.value)).getTime()
  const point = chartSeriesData.value.find(
    p => startOfDay(p.date).getTime() === targetTime
  )
  
  // 沒有這一天的資料就不要畫這個標籤，避免出現「有字但沒柱子」
  if (!point) {
    args.cancel = true
    return
  }

  args.text = `預定：${formatPercent(point.displayIncrementPercent)}<br>累計：${formatPercent(point.plannedPercent)}`
  args.labelStyle = {
    ...args.labelStyle,
    color: '#333',
    fontFamily: 'inherit',
    size: '10px'
  }
}

watch(
  () => props.versionId,
  () => {
    nextTick(() => refreshChart())
  }
)

watch(
  currentTasks,
  () => {
    nextTick(() => refreshChart())
  },
  { deep: true }
)

watch(displayedProgressData, () => {
  nextTick(() => refreshChart())
})

onMounted(() => {
  if (hasCurveData.value) {
    nextTick(() => refreshChart())
  }
})
</script>

<style scoped>
.curve-chart-wrapper {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  overflow: hidden;
  min-height: 360px;
}

.chart-toolbar {
  z-index: 10;
}

.chart-toolbar .btn {
  backdrop-filter: blur(4px);
  border-color: rgba(0, 0, 0, 0.2);
  color: #333;
  background: rgba(255, 255, 255, 0.9);
}

.chart-toolbar .chart-density-select {
  width: 140px;
  backdrop-filter: blur(4px);
  border-color: rgba(0, 0, 0, 0.2);
  color: #333;
  background: rgba(255, 255, 255, 0.9);
}

.chart-body {
  padding: 0.75rem;
}

.empty-state h5,
.empty-state p {
  color: rgba(0, 0, 0, 0.6);
}

:deep(.e-chart) {
  background: transparent !important;
}

:deep(.e-chart svg) {
  font-family: inherit !important;
}

:deep(.e-chart-title),
:deep(.e-legend-text),
:deep(.e-axis-label),
:deep(.e-axis-title) {
  fill: #333 !important;
}

:deep(.e-chart-title) {
  font-size: 16px;
  font-weight: 600;
}

/* 讓 <br> 真的分成兩行 */
:deep(.e-chart .e-axis-label tspan) {
  display: block;
}

:deep(.e-tooltip-wrap) {
  border: 1px solid rgba(0, 0, 0, 0.2) !important;
  border-radius: 6px;
}

:deep(.e-marker-inner) {
  stroke: rgba(0, 0, 0, 0.4);
  stroke-width: 1;
}
</style>
