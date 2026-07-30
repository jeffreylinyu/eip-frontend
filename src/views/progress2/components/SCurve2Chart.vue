<template>
  <div class="scurve2-wrapper d-flex flex-column h-100">
    <!-- 工具列 -->
    <div class="d-flex align-items-center gap-2 p-2 border-bottom flex-wrap">
      <span class="fw-semibold"><i class="fa fa-chart-area me-2"></i>{{ chartTitle }}</span>
      <div class="ms-auto d-flex align-items-center gap-2">
        <select v-model="pointDensity" class="form-select form-select-sm scurve2-density">
          <option value="auto">自動刻度</option>
          <option value="daily">每天一點</option>
          <option value="every3">每 3 天一點</option>
          <option value="every5">每 5 天一點</option>
          <option value="every7">每週一點</option>
          <option value="monthly">每月一點</option>
        </select>
        <div class="d-flex gap-1">
          <button type="button" class="win-btn win-btn--sm" @click="exportSvg">
            <i class="fa fa-download me-1"></i>SVG
          </button>
          <button type="button" class="win-btn win-btn--sm" @click="exportPng">
            <i class="fa fa-image me-1"></i>PNG
          </button>
        </div>
      </div>
    </div>

    <!-- 摘要 -->
    <div v-if="hasData" class="d-flex gap-3 px-3 py-2 border-bottom flex-wrap scurve2-summary">
      <span class="badge text-bg-primary">今日預定進度 {{ fmtPercent(plannedTodayPercent) }}</span>
      <span class="badge text-bg-warning">目前實際進度 {{ fmtPercent(actualPercent) }}</span>
      <span class="badge" :class="scheduleGap >= 0 ? 'text-bg-success' : 'text-bg-danger'">
        {{ scheduleGap >= 0 ? '超前' : '落後' }} {{ fmtPercent(Math.abs(scheduleGap)) }}
      </span>
      <span class="text-muted small align-self-center">
        工期 {{ projectRange.totalDays }} 天（{{ rangeLabel }}）｜權重採
        {{ usesDurationWeight ? '工期天數' : '權重(%)' }}加權
      </span>
    </div>

    <!-- 圖面 -->
    <div ref="containerEl" class="scurve2-body flex-fill position-relative">
      <div v-if="!hasData" class="d-flex flex-column justify-content-center align-items-center h-100 text-center text-muted">
        <i class="fa fa-info-circle fa-3x mb-3"></i>
        <h5 class="mb-2">尚未產生 S 曲線</h5>
        <p class="mb-0">請先在甘特圖中為各項目設定起訖日期（可搭配權重%）。</p>
      </div>

      <svg
        v-else
        ref="svgEl"
        class="scurve2-svg"
        :viewBox="`0 0 ${size.width} ${size.height}`"
        @mousemove="onHover"
        @mouseleave="hoverPoint = null"
      >
        <!-- 背景 -->
        <rect x="0" y="0" :width="size.width" :height="size.height" fill="#0f172a" />

        <!-- Y 左軸格線與標籤（累計 %） -->
        <g v-for="tick in yTicks" :key="'y' + tick">
          <line
            :x1="plot.left"
            :x2="plot.right"
            :y1="yScale(tick)"
            :y2="yScale(tick)"
            stroke="#334155"
            stroke-width="1"
          />
          <text :x="plot.left - 8" :y="yScale(tick) + 4" text-anchor="end" class="sc-axis-text">
            {{ tick }}%
          </text>
        </g>

        <!-- Y 右軸標籤（區段增量 %） -->
        <g v-for="tick in incTicks" :key="'r' + tick">
          <text :x="plot.right + 8" :y="incScale(tick) + 4" text-anchor="start" class="sc-axis-text sc-axis-text-inc">
            {{ tick }}%
          </text>
        </g>

        <!-- X 軸標籤 -->
        <g v-for="(p, i) in displayedPoints" :key="'x' + i">
          <line
            :x1="xScale(p.dayIndex)"
            :x2="xScale(p.dayIndex)"
            :y1="plot.bottom"
            :y2="plot.bottom + 4"
            stroke="#64748b"
          />
          <text
            v-if="showXLabel(i)"
            :x="xScale(p.dayIndex)"
            :y="plot.bottom + 16"
            text-anchor="middle"
            class="sc-axis-text"
            :transform="xLabelRotate ? `rotate(45 ${xScale(p.dayIndex)} ${plot.bottom + 16})` : undefined"
          >
            {{ fmtDateShort(p.date) }}
          </text>
        </g>

        <!-- 區段預定進度（柱） -->
        <g>
          <rect
            v-for="(p, i) in displayedPoints"
            :key="'bar' + i"
            :x="xScale(p.dayIndex) - barWidth / 2"
            :y="incScale(p.displayIncrement)"
            :width="barWidth"
            :height="Math.max(0, plot.bottom - incScale(p.displayIncrement))"
            fill="rgba(13,110,253,0.35)"
          />
        </g>

        <!-- 累計預定進度（S 曲線） -->
        <path :d="curvePath" fill="none" stroke="#0d6efd" stroke-width="2.5" />
        <circle
          v-for="(p, i) in displayedPoints"
          :key="'pt' + i"
          :cx="xScale(p.dayIndex)"
          :cy="yScale(p.plannedPercent)"
          r="3"
          fill="#0b2e59"
        />

        <!-- 今天：垂直虛線 + 實際進度點 -->
        <g v-if="todayDayIndex != null">
          <line
            :x1="xScale(todayDayIndex)"
            :x2="xScale(todayDayIndex)"
            :y1="plot.top"
            :y2="plot.bottom"
            stroke="#dc3545"
            stroke-width="1.5"
            stroke-dasharray="5 4"
          />
          <text :x="xScale(todayDayIndex) + 4" :y="plot.top + 12" class="sc-axis-text sc-today-text">今天</text>
          <circle :cx="xScale(todayDayIndex)" :cy="yScale(actualPercent)" r="6" fill="#fd7e14" stroke="#fff" stroke-width="2" />
          <text
            :x="xScale(todayDayIndex) + 10"
            :y="yScale(actualPercent) + 4"
            class="sc-axis-text sc-actual-text"
          >
            實際 {{ fmtPercent(actualPercent) }}
          </text>
        </g>

        <!-- 軸線 -->
        <line :x1="plot.left" :x2="plot.left" :y1="plot.top" :y2="plot.bottom" stroke="#94a3b8" />
        <line :x1="plot.right" :x2="plot.right" :y1="plot.top" :y2="plot.bottom" stroke="#94a3b8" />
        <line :x1="plot.left" :x2="plot.right" :y1="plot.bottom" :y2="plot.bottom" stroke="#94a3b8" />

        <!-- 軸標題 -->
        <text :x="plot.left" :y="16" class="sc-axis-title">累計進度 (%)</text>
        <text :x="plot.right" :y="16" text-anchor="end" class="sc-axis-title sc-axis-text-inc">預定進度-區段 (%)</text>

        <!-- 圖例 -->
        <g :transform="`translate(${plot.left}, ${size.height - 8})`">
          <rect x="0" y="-9" width="18" height="9" fill="rgba(13,110,253,0.35)" />
          <text x="24" y="0" class="sc-axis-text">預定進度（區段）</text>
          <line x1="140" x2="166" y1="-5" y2="-5" stroke="#0d6efd" stroke-width="2.5" />
          <text x="172" y="0" class="sc-axis-text">累計預定進度</text>
          <circle cx="290" cy="-5" r="5" fill="#fd7e14" />
          <text x="300" y="0" class="sc-axis-text">目前實際進度</text>
        </g>

        <!-- hover 十字與提示 -->
        <g v-if="hoverPoint">
          <line
            :x1="xScale(hoverPoint.dayIndex)"
            :x2="xScale(hoverPoint.dayIndex)"
            :y1="plot.top"
            :y2="plot.bottom"
            stroke="#98a2b3"
            stroke-dasharray="3 3"
          />
          <circle :cx="xScale(hoverPoint.dayIndex)" :cy="yScale(hoverPoint.plannedPercent)" r="5" fill="#0d6efd" />
        </g>
      </svg>

      <!-- HTML tooltip -->
      <div
        v-if="hoverPoint && hoverTooltipStyle"
        class="scurve2-tooltip"
        :style="hoverTooltipStyle"
      >
        <div class="fw-semibold">{{ fmtDateFull(hoverPoint.date) }}｜第 {{ hoverPoint.dayIndex + 1 }} 天</div>
        <div>累計預定：{{ fmtPercent(hoverPoint.plannedPercent) }}</div>
        <div>區段預定：{{ fmtPercent(hoverPoint.displayIncrement) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Progress2Task } from '@/stores/progress2'
import { DAY_MS, addDays, diffDays, inclusiveDays, parseYmd, startOfDay } from '@/utils/progress2/date'

interface Props {
  tasks: Progress2Task[]
  title?: string
}

const props = defineProps<Props>()

const chartTitle = computed(() => (props.title ? `${props.title}｜S 曲線` : 'S 曲線'))

// ---------- 資料計算 ----------
interface CurveTask {
  startDay: number
  span: number
  weight: number
  dailyWeight: number
  progress: number
}

interface CurvePoint {
  dayIndex: number
  date: Date
  plannedPercent: number
  /** 相對於前一個「顯示點」的增量，取樣後計算 */
  displayIncrement: number
}

const today = startOfDay(new Date())

const datedTasks = computed(() => {
  return props.tasks
    .map((t) => {
      const start = parseYmd(t.startDate)
      const end = parseYmd(t.endDate)
      if (!start || !end || end < start) return null
      return {
        start,
        end,
        duration: inclusiveDays(start, end),
        costRatio: Math.max(0, Number(t.costRatio) || 0),
        progress: Math.min(100, Math.max(0, Number(t.progress) || 0))
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)
})

const usesDurationWeight = computed(() => {
  const costTotal = datedTasks.value.reduce((sum, t) => sum + t.costRatio, 0)
  return costTotal <= 0
})

const projectRange = computed(() => {
  const items = datedTasks.value
  if (!items.length) return { start: null as Date | null, end: null as Date | null, totalDays: 0 }
  const startTime = Math.min(...items.map((t) => t.start.getTime()))
  const endTime = Math.max(...items.map((t) => t.end.getTime()))
  const start = startOfDay(new Date(startTime))
  const end = startOfDay(new Date(endTime))
  return { start, end, totalDays: inclusiveDays(start, end) }
})

const curveSource = computed(() => {
  const range = projectRange.value
  if (!range.start || !range.totalDays) return { tasks: [] as CurveTask[], total: 0 }
  const useDuration = usesDurationWeight.value
  const tasks: CurveTask[] = datedTasks.value.map((t) => {
    const weight = useDuration ? t.duration : t.costRatio
    const startDay = Math.max(0, diffDays(range.start as Date, t.start))
    const span = Math.max(1, t.duration)
    return { startDay, span, weight, dailyWeight: weight / span, progress: t.progress }
  })
  const total = tasks.reduce((sum, t) => sum + t.weight, 0)
  return { tasks, total }
})

/** 每日累計預定進度（%） */
const dailyPlanned = computed<{ dayIndex: number; date: Date; plannedPercent: number }[]>(() => {
  const range = projectRange.value
  const { tasks, total } = curveSource.value
  if (!range.start || !range.totalDays || !tasks.length || total <= 0) return []
  const base = range.start.getTime()
  const result: { dayIndex: number; date: Date; plannedPercent: number }[] = []
  for (let day = 0; day < range.totalDays; day++) {
    let value = 0
    tasks.forEach((t) => {
      if (day < t.startDay) return
      const done = Math.min(t.span, day - t.startDay + 1)
      value += Math.min(t.weight, done * t.dailyWeight)
    })
    const percent = Math.min(100, Math.max(0, (value / total) * 100))
    result.push({ dayIndex: day, date: new Date(base + day * DAY_MS), plannedPercent: percent })
  }
  if (result.length) result[result.length - 1].plannedPercent = 100
  return result
})

const hasData = computed(() => dailyPlanned.value.length > 0)

// 取樣密度
const pointDensity = ref<'auto' | 'daily' | 'every3' | 'every5' | 'every7' | 'monthly'>('auto')

const sampleStep = computed(() => {
  const total = projectRange.value.totalDays
  switch (pointDensity.value) {
    case 'daily': return 1
    case 'every3': return 3
    case 'every5': return 5
    case 'every7': return 7
    case 'monthly': return 30
    default:
      if (total > 365) return 30
      if (total > 180) return 14
      if (total > 90) return 7
      if (total > 45) return 5
      if (total > 21) return 3
      return 1
  }
})

const displayedPoints = computed<CurvePoint[]>(() => {
  const full = dailyPlanned.value
  if (!full.length) return []
  const step = sampleStep.value
  const sampled: typeof full = []
  for (let i = 0; i < full.length; i += step) sampled.push(full[i])
  const last = full[full.length - 1]
  if (sampled[sampled.length - 1].dayIndex !== last.dayIndex) sampled.push(last)
  return sampled.map((p, i) => ({
    ...p,
    displayIncrement: i === 0 ? p.plannedPercent : Math.max(0, p.plannedPercent - sampled[i - 1].plannedPercent)
  }))
})

// 今日與實際進度
const todayDayIndex = computed(() => {
  const range = projectRange.value
  if (!range.start) return null
  const offset = diffDays(range.start, today)
  if (offset < 0 || offset >= range.totalDays) return null
  return offset
})

const plannedTodayPercent = computed(() => {
  const idx = todayDayIndex.value
  if (idx == null) {
    const range = projectRange.value
    if (range.end && today > range.end) return 100
    return 0
  }
  return dailyPlanned.value[idx]?.plannedPercent ?? 0
})

/** 目前整體實際進度：各項目進度 × 權重加權 */
const actualPercent = computed(() => {
  const { tasks, total } = curveSource.value
  if (!tasks.length || total <= 0) return 0
  const value = tasks.reduce((sum, t) => sum + (t.weight * t.progress) / 100, 0)
  return Math.min(100, Math.max(0, (value / total) * 100))
})

const scheduleGap = computed(() => actualPercent.value - plannedTodayPercent.value)

const rangeLabel = computed(() => {
  const range = projectRange.value
  if (!range.start || !range.end) return ''
  return `${fmtDateFull(range.start)} ~ ${fmtDateFull(range.end)}`
})

// ---------- 版面與比例尺 ----------
const containerEl = ref<HTMLElement | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)
const size = ref({ width: 960, height: 480 })
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerEl.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width > 0 && rect.height > 0) {
        size.value = { width: Math.max(480, rect.width), height: Math.max(300, rect.height) }
      }
    })
    resizeObserver.observe(containerEl.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

const plot = computed(() => ({
  left: 56,
  right: size.value.width - 72,
  top: 28,
  bottom: size.value.height - (xLabelRotate.value ? 72 : 56)
}))

const xLabelRotate = computed(() => displayedPoints.value.length > 18)

const xScale = (dayIndex: number) => {
  const total = Math.max(1, projectRange.value.totalDays - 1)
  const p = plot.value
  return p.left + (dayIndex / total) * (p.right - p.left)
}

const yScale = (percent: number) => {
  const p = plot.value
  return p.bottom - (Math.min(100, Math.max(0, percent)) / 100) * (p.bottom - p.top)
}

const yTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

const maxIncrement = computed(() =>
  displayedPoints.value.reduce((m, p) => Math.max(m, p.displayIncrement), 0)
)

const incMax = computed(() => Math.max(5, Math.ceil(maxIncrement.value / 5) * 5))

const incTicks = computed(() => {
  const step = incMax.value / 5
  return Array.from({ length: 6 }, (_, i) => Math.round(i * step * 10) / 10)
})

const incScale = (value: number) => {
  const p = plot.value
  return p.bottom - (Math.min(incMax.value, Math.max(0, value)) / incMax.value) * (p.bottom - p.top)
}

const barWidth = computed(() => {
  const pts = displayedPoints.value
  if (pts.length < 2) return 16
  const gap = (plot.value.right - plot.value.left) / Math.max(1, pts.length - 1)
  return Math.max(3, Math.min(26, gap * 0.55))
})

const curvePath = computed(() => {
  const pts = displayedPoints.value
  if (!pts.length) return ''
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.dayIndex).toFixed(1)},${yScale(p.plannedPercent).toFixed(1)}`)
    .join(' ')
})

const showXLabel = (index: number) => {
  const count = displayedPoints.value.length
  const maxLabels = xLabelRotate.value ? 30 : 18
  const step = Math.ceil(count / maxLabels)
  return index % step === 0 || index === count - 1
}

// ---------- 互動 ----------
const hoverPoint = ref<CurvePoint | null>(null)
const hoverClient = ref<{ x: number; y: number } | null>(null)

const onHover = (event: MouseEvent) => {
  const svg = svgEl.value
  if (!svg || !displayedPoints.value.length) return
  const rect = svg.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * size.value.width
  let nearest: CurvePoint | null = null
  let minDiff = Number.POSITIVE_INFINITY
  displayedPoints.value.forEach((p) => {
    const diff = Math.abs(xScale(p.dayIndex) - x)
    if (diff < minDiff) {
      minDiff = diff
      nearest = p
    }
  })
  hoverPoint.value = nearest
  hoverClient.value = { x: event.clientX, y: event.clientY }
}

const hoverTooltipStyle = computed(() => {
  const container = containerEl.value
  const client = hoverClient.value
  if (!container || !client) return null
  const rect = container.getBoundingClientRect()
  const left = Math.min(rect.width - 190, client.x - rect.left + 14)
  const top = Math.max(4, client.y - rect.top - 60)
  return { left: `${left}px`, top: `${top}px` }
})

// ---------- 格式化 ----------
const percentFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})

const fmtPercent = (value: number) =>
  Number.isFinite(value) ? `${percentFormatter.format(Math.max(0, value))}%` : '0.0%'

const fmtDateShort = (date: Date) =>
  `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`

function fmtDateFull(date: Date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

// ---------- 匯出 ----------
const exportFileName = () => {
  const base = (props.title || '施工進度').replace(/[\\/:*?"<>|]+/g, '_')
  return `${base}_S曲線_${new Date().toISOString().slice(0, 10)}`
}

const svgMarkup = (): string | null => {
  const svg = svgEl.value
  if (!svg) return null
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(size.value.width))
  clone.setAttribute('height', String(size.value.height))
  // 畫面採暗黑模式，但下載與 Word 套版維持適合列印的白底圖。
  clone.querySelector('rect')?.setAttribute('fill', '#ffffff')
  clone.querySelectorAll('line[stroke="#334155"]').forEach((line) => line.setAttribute('stroke', '#e4e7ec'))
  clone.querySelectorAll('line[stroke="#94a3b8"]').forEach((line) => line.setAttribute('stroke', '#667085'))
  // 內嵌樣式（scoped class 匯出後會失效，改為固定樣式）
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = `
    .sc-axis-text { font: 16px "Noto Sans TC", sans-serif; fill: #344054; }
    .sc-axis-title { font: 600 18px "Noto Sans TC", sans-serif; fill: #344054; }
    .sc-axis-text-inc { fill: #0d6efd; }
    .sc-today-text { fill: #dc3545; }
    .sc-actual-text { fill: #fd7e14; font-size: 17px; font-weight: 600; }
  `
  clone.insertBefore(style, clone.firstChild)
  return new XMLSerializer().serializeToString(clone)
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const exportSvg = () => {
  const markup = svgMarkup()
  if (!markup) return
  downloadBlob(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${exportFileName()}.svg`)
}

const renderPngBlob = (): Promise<Blob | null> => {
  const markup = svgMarkup()
  if (!markup) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    const svgUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = size.value.width * scale
      canvas.height = size.value.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(svgUrl)
        resolve(null)
        return
      }
      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size.value.width, size.value.height)
      ctx.drawImage(img, 0, 0, size.value.width, size.value.height)
      URL.revokeObjectURL(svgUrl)
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      resolve(null)
    }
    img.src = svgUrl
  })
}

const exportPng = async () => {
  const blob = await renderPngBlob()
  if (blob) downloadBlob(blob, `${exportFileName()}.png`)
}

defineExpose({ renderPngBlob })
</script>

<style scoped>
.scurve2-wrapper {
  min-height: 420px;
  color: rgba(226, 232, 240, 0.92);
  background-color: #0f172a;
}

.scurve2-wrapper > .border-bottom {
  background-color: #1e293b;
  border-bottom-color: rgba(255, 255, 255, 0.12) !important;
}

.scurve2-density {
  width: 140px;
  color: rgba(255, 255, 255, 0.92);
  background-color: rgba(2, 6, 23, 0.72);
  border-color: rgba(255, 255, 255, 0.16);
  color-scheme: dark;
}

.scurve2-body {
  overflow: hidden;
  background-color: #0f172a;
  min-height: 320px;
}

.scurve2-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.sc-axis-text {
  font-size: 10px;
  fill: #cbd5e1;
}

.sc-axis-title {
  font-size: 11px;
  font-weight: 600;
  fill: #e2e8f0;
}

.sc-axis-text-inc {
  fill: #0d6efd;
}

.sc-today-text {
  fill: #dc3545;
}

.sc-actual-text {
  fill: #fd7e14;
  font-weight: 600;
}

.scurve2-tooltip {
  position: absolute;
  z-index: 20;
  background: rgba(15, 23, 42, 0.98);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.75rem;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}

.scurve2-summary .badge {
  font-weight: 500;
}
</style>
