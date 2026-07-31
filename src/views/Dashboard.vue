<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import apexchart from '@/components/plugins/Apexcharts.vue'
import {
  getDashboardEnvironment,
  getDashboardProgressTrend,
  type DashboardEnvironmentResponse,
  type DashboardProgressTrendResponse,
} from '@/api/dashboard'
import { useAppVariableStore } from '@/stores/app-variable'
import { useWorkspaceStore } from '@/stores/workspace'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const appVariable = useAppVariableStore()
const loading = ref(false)
const errorMessage = ref('')
const trend = ref<DashboardProgressTrendResponse | null>(null)
const environmentLoading = ref(false)
const environmentError = ref('')
const environment = ref<DashboardEnvironmentResponse | null>(null)
let loadSequence = 0
let environmentLoadSequence = 0
let environmentRefreshTimer: ReturnType<typeof window.setInterval> | null = null

const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const projectName = computed(() => workspaceStore.currentProject?.name ?? '目前工程')
const hasAnyData = computed(() => (trend.value?.points.length ?? 0) > 0)
const isDashboardLoading = computed(() => loading.value || environmentLoading.value)

function toTimestamp(date: string): number {
  return new Date(`${date}T00:00:00`).getTime()
}

function todayLocalDate(): string {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toFixed(2).replace(/\.?0+$/, '')}%`
}

function formatReading(
  value: number | null | undefined,
  unit: string,
  maximumFractionDigits = 1,
): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toLocaleString('zh-TW', { maximumFractionDigits })}${unit}`
}

function formatObservedAt(value: string | null | undefined): string {
  if (!value) return '尚無觀測時間'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function formatWindDirection(degrees: number | null | undefined): string {
  if (degrees == null || !Number.isFinite(Number(degrees))) return ''
  const directions = ['北', '東北', '東', '東南', '南', '西南', '西', '西北']
  const normalized = ((Number(degrees) % 360) + 360) % 360
  return `${directions[Math.round(normalized / 45) % 8]}風`
}

const currentPoint = computed(() => {
  const points = trend.value?.points ?? []
  const today = todayLocalDate()
  return [...points].reverse().find((point) => point.date <= today) ?? points[0] ?? null
})

const chartSeries = computed(() => {
  const points = trend.value?.points ?? []
  const mapSeries = (key: 'actualProgress' | 'budgetUsage' | 'plannedProgress') =>
    points.map((point) => ({
      x: toTimestamp(point.date),
      y: point[key] == null ? null : Number(point[key]),
    }))

  return [
    { name: '工程進度', data: mapSeries('actualProgress') },
    { name: '預算使用', data: mapSeries('budgetUsage') },
    { name: '計畫進度', data: mapSeries('plannedProgress') },
  ]
})

const chartOptions = computed(() => {
  const points = trend.value?.points ?? []
  const maximum = points.reduce((value, point) => {
    return Math.max(
      value,
      Number(point.actualProgress ?? 0),
      Number(point.budgetUsage ?? 0),
      Number(point.plannedProgress ?? 0),
    )
  }, 100)
  const yAxisMaximum = Math.max(100, Math.ceil(maximum / 10) * 10)
  const reportMarkers = points.flatMap((point, index) =>
    point.hasDailyReport
      ? [{
          seriesIndex: 0,
          dataPointIndex: index,
          fillColor: appVariable.color?.primary || '#348fe2',
          strokeColor: '#ffffff',
          size: 5,
          shape: 'circle',
        }]
      : [],
  )

  return {
    chart: {
      id: 'dashboard-progress-trend',
      type: 'line',
      background: 'transparent',
      animations: { enabled: true },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      events: {
        dataPointSelection: (_event: unknown, _chartContext: unknown, config: { dataPointIndex: number }) => {
          const point = points[config.dataPointIndex]
          if (point?.hasDailyReport) {
            void router.push({ path: '/daily-report', query: { reportDate: point.date } })
          }
        },
      },
    },
    colors: [
      appVariable.color?.primary || '#348fe2',
      appVariable.color?.warning || '#f59c1a',
      appVariable.color?.success || '#00acac',
    ],
    stroke: {
      curve: 'smooth',
      width: [3, 3, 2],
      dashArray: [0, 0, 6],
      connectNullData: false,
    },
    markers: {
      size: 0,
      hover: { sizeOffset: 4 },
      discrete: reportMarkers,
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: appVariable.color?.borderColor || 'rgba(255, 255, 255, 0.15)',
      strokeDashArray: 0,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
    },
    xaxis: {
      type: 'datetime',
      tickAmount: 7,
      labels: {
        datetimeUTC: false,
        format: 'yyyy/MM/dd',
        style: { colors: appVariable.color?.bodyColor },
      },
      axisBorder: {
        color: appVariable.color?.borderColor,
      },
      axisTicks: {
        color: appVariable.color?.borderColor,
      },
    },
    yaxis: {
      min: 0,
      max: yAxisMaximum,
      tickAmount: Math.max(5, yAxisMaximum / 20),
      labels: {
        formatter: (value: number) => `${Math.round(value)}%`,
        style: { colors: appVariable.color?.bodyColor },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { format: 'yyyy/MM/dd' },
      y: {
        formatter: (value: number | null) => formatPercent(value),
      },
    },
    noData: {
      text: '目前沒有可顯示的進度資料',
    },
  }
})

async function loadTrend() {
  const id = constructionId.value
  const sequence = ++loadSequence
  trend.value = null
  errorMessage.value = ''
  if (!id) return

  loading.value = true
  try {
    const response = await getDashboardProgressTrend(id)
    if (sequence === loadSequence) trend.value = response
  } catch (error) {
    console.error('[Dashboard] progress trend load failed', error)
    if (sequence === loadSequence) {
      errorMessage.value = '工程進度資料載入失敗，請稍後再試。'
    }
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

async function loadEnvironment() {
  const id = constructionId.value
  const sequence = ++environmentLoadSequence
  environment.value = null
  environmentError.value = ''
  if (!id) return

  environmentLoading.value = true
  try {
    const response = await getDashboardEnvironment(id)
    if (sequence === environmentLoadSequence) environment.value = response
  } catch (error) {
    console.error('[Dashboard] environment load failed', error)
    if (sequence === environmentLoadSequence) {
      environmentError.value = '目前無法取得環境資訊'
    }
  } finally {
    if (sequence === environmentLoadSequence) environmentLoading.value = false
  }
}

async function loadDashboard() {
  await Promise.all([loadTrend(), loadEnvironment()])
}

function goToSchedule() {
  void router.push('/schedule/progress')
}

function goToDailyReport() {
  void router.push('/daily-report')
}

function goToEstimate() {
  void router.push('/forms/o3-estimate')
}

watch(constructionId, () => {
  void loadDashboard()
}, { immediate: true })

onMounted(() => {
  environmentRefreshTimer = window.setInterval(() => {
    if (constructionId.value && !environmentLoading.value) {
      void loadEnvironment()
    }
  }, 10 * 60 * 1000)
})

onBeforeUnmount(() => {
  if (environmentRefreshTimer != null) {
    window.clearInterval(environmentRefreshTimer)
  }
})
</script>

<template>
  <div class="dashboard-page">
    <div class="dashboard-heading">
      <div>
        <h1 class="dashboard-title">工程進度儀表板</h1>
        <p class="dashboard-subtitle mb-0">{{ projectName }}</p>
      </div>
      <button
        type="button"
        class="btn btn-outline-primary btn-sm"
        :disabled="isDashboardLoading || !constructionId"
        @click="loadDashboard"
      >
        <i class="fa fa-rotate me-1" :class="{ 'fa-spin': isDashboardLoading }"></i>
        重新整理
      </button>
    </div>

    <div v-if="!constructionId" class="alert alert-warning">
      <i class="fa fa-triangle-exclamation me-2"></i>
      請先選擇工程專案。
    </div>

    <Card v-else class="environment-card mb-3">
      <CardHeader class="environment-card__header">
        <div>
          <h5 class="mb-1">
            <i class="fa fa-cloud-sun me-2"></i>
            當前環境資訊
          </h5>
          <div class="small text-muted">依工程位置對應最近測站，顯示最新公開觀測資料</div>
        </div>
        <span class="environment-live-badge">
          <span class="environment-live-dot"></span>
          最新觀測
        </span>
      </CardHeader>
      <CardBody>
        <div v-if="environmentLoading" class="environment-loading">
          <i class="fa fa-spinner fa-spin"></i>
          正在取得測站資料…
        </div>
        <div v-else-if="environmentError" class="environment-loading text-danger">
          <i class="fa fa-circle-exclamation"></i>
          {{ environmentError }}
        </div>
        <template v-else>
          <div class="environment-grid">
            <div class="environment-metric environment-metric--temperature">
              <div class="environment-metric__icon"><i class="fa fa-temperature-half"></i></div>
              <div class="environment-metric__content">
                <span>當前溫度</span>
                <strong>{{ formatReading(environment?.weather.temperatureCelsius, '°C') }}</strong>
                <small>{{ environment?.weather.message || '氣象署觀測' }}</small>
              </div>
            </div>

            <div class="environment-metric environment-metric--humidity">
              <div class="environment-metric__icon"><i class="fa fa-droplet"></i></div>
              <div class="environment-metric__content">
                <span>當前濕度</span>
                <strong>{{ formatReading(environment?.weather.relativeHumidityPercent, '%', 0) }}</strong>
                <small>{{ environment?.weather.message || '相對濕度' }}</small>
              </div>
            </div>

            <div class="environment-metric environment-metric--air">
              <div class="environment-metric__icon"><i class="fa fa-smog"></i></div>
              <div class="environment-metric__content">
                <span>PM2.5</span>
                <strong>{{ formatReading(environment?.airQuality.pm25, ' μg/m³', 0) }}</strong>
                <small>{{ environment?.airQuality.message || '環境部空品觀測' }}</small>
              </div>
            </div>

            <div class="environment-metric environment-metric--wind">
              <div class="environment-metric__icon"><i class="fa fa-wind"></i></div>
              <div class="environment-metric__content">
                <span>風力</span>
                <strong>{{ formatReading(environment?.weather.windSpeedMs, ' m/s') }}</strong>
                <small>
                  {{ formatWindDirection(environment?.weather.windDirectionDegrees)
                    || environment?.weather.message
                    || '即時風速' }}
                </small>
              </div>
            </div>

            <div class="environment-metric environment-metric--noise">
              <div class="environment-metric__icon"><i class="fa fa-volume-high"></i></div>
              <div class="environment-metric__content">
                <span>噪音</span>
                <strong>{{ formatReading(environment?.noise.decibels, ' dB', 0) }}</strong>
                <small>{{ environment?.noise.message || '工地監測設備' }}</small>
              </div>
            </div>
          </div>

          <div class="environment-sources">
            <div>
              <i class="fa fa-location-dot"></i>
              氣象站：{{ environment?.weather.stationName || '尚未設定' }}
              <span>{{ formatObservedAt(environment?.weather.observedAt) }}</span>
            </div>
            <div>
              <i class="fa fa-leaf"></i>
              空品站：{{ environment?.airQuality.stationName || '尚未取得' }}
              <span>{{ formatObservedAt(environment?.airQuality.observedAt) }}</span>
            </div>
          </div>
        </template>
      </CardBody>
    </Card>

    <Card v-if="constructionId" class="progress-card">
      <CardHeader class="progress-card-header">
        <div>
          <h5 class="mb-1">
            <i class="fa fa-chart-line me-2"></i>
            工程進度追蹤
          </h5>
          <div class="small text-muted">
            預定：施工進度排程｜實際：營造日報工項完成金額加權｜預算：營造端核定估驗累計
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div v-if="loading" class="dashboard-state">
          <i class="fa fa-spinner fa-spin fa-2x mb-3"></i>
          <span>正在彙整工程進度資料…</span>
        </div>

        <div v-else-if="errorMessage" class="dashboard-state text-danger">
          <i class="fa fa-circle-exclamation fa-2x mb-3"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <div v-else-if="!hasAnyData" class="dashboard-state">
          <i class="fa fa-chart-line fa-2x mb-3"></i>
          <strong>目前沒有可顯示的進度資料</strong>
          <span class="small">建立施工進度排程、填寫營造日報或新增核定估驗後即可顯示。</span>
        </div>

        <template v-else>
          <div class="progress-summary">
            <div class="summary-item">
              <span>工程進度</span>
              <strong class="text-primary">{{ formatPercent(currentPoint?.actualProgress) }}</strong>
            </div>
            <div class="summary-item">
              <span>預算使用</span>
              <strong class="text-warning">{{ formatPercent(currentPoint?.budgetUsage) }}</strong>
            </div>
            <div class="summary-item">
              <span>計畫進度</span>
              <strong class="text-success">{{ formatPercent(currentPoint?.plannedProgress) }}</strong>
            </div>
          </div>

          <apexchart
            :height="430"
            :options="chartOptions"
            :series="chartSeries"
          />

          <div class="chart-help">
            <i class="fa fa-circle-info me-1"></i>
            工程進度線上的圓點代表有營造日報，點擊可開啟該日日報。
          </div>

          <div class="data-status">
            <button type="button" :class="{ missing: !trend?.hasPlanData }" @click="goToSchedule">
              <i :class="trend?.hasPlanData ? 'fa fa-check' : 'fa fa-minus'"></i>
              {{ trend?.hasPlanData ? '已有排程資料' : '尚未建立排程' }}
            </button>
            <button type="button" :class="{ missing: !trend?.hasDailyReportData }" @click="goToDailyReport">
              <i :class="trend?.hasDailyReportData ? 'fa fa-check' : 'fa fa-minus'"></i>
              {{ trend?.hasDailyReportData ? '已有營造日報' : '尚無營造日報' }}
            </button>
            <button
              type="button"
              :class="{ missing: !trend?.hasEstimateData || !trend?.hasBudgetBaselineData }"
              @click="goToEstimate"
            >
              <i
                :class="trend?.hasEstimateData && trend?.hasBudgetBaselineData
                  ? 'fa fa-check'
                  : 'fa fa-minus'"
              ></i>
              {{
                !trend?.hasEstimateData
                  ? '尚無核定估驗'
                  : trend?.hasBudgetBaselineData
                    ? '已有核定估驗'
                    : '已有核定估驗，請補契約金額'
              }}
            </button>
          </div>
        </template>
      </CardBody>
    </Card>
  </div>
</template>

<style scoped>
.dashboard-page {
  padding: 1.5rem;
}

.dashboard-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.dashboard-title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 700;
}

.dashboard-subtitle {
  color: var(--bs-secondary-color);
}

.environment-card {
  overflow: hidden;
  border-color: rgba(var(--bs-primary-rgb), 0.2);
  background:
    radial-gradient(circle at 8% 0%, rgba(var(--bs-primary-rgb), 0.1), transparent 30%),
    var(--bs-card-bg);
}

.environment-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 72px;
  border-bottom-color: rgba(var(--bs-primary-rgb), 0.16);
  background: rgba(var(--bs-body-bg-rgb), 0.36);
}

.environment-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.32rem 0.7rem;
  border: 1px solid rgba(var(--bs-success-rgb), 0.3);
  border-radius: 999px;
  color: var(--bs-success);
  background: rgba(var(--bs-success-rgb), 0.08);
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.environment-live-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px rgba(var(--bs-success-rgb), 0.12);
}

.environment-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-height: 132px;
  color: var(--bs-secondary-color);
}

.environment-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
}

.environment-metric {
  --environment-accent: var(--bs-primary-rgb);
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  padding: 0.95rem;
  border: 1px solid rgba(var(--environment-accent), 0.22);
  border-radius: 0.75rem;
  background: linear-gradient(
    145deg,
    rgba(var(--environment-accent), 0.1),
    rgba(var(--bs-body-bg-rgb), 0.55)
  );
}

.environment-metric--temperature {
  --environment-accent: 245, 156, 26;
}

.environment-metric--humidity {
  --environment-accent: 52, 143, 226;
}

.environment-metric--air {
  --environment-accent: 0, 172, 172;
}

.environment-metric--wind {
  --environment-accent: 73, 182, 214;
}

.environment-metric--noise {
  --environment-accent: 145, 151, 163;
}

.environment-metric__icon {
  display: grid;
  flex: 0 0 2.6rem;
  width: 2.6rem;
  height: 2.6rem;
  place-items: center;
  border-radius: 0.7rem;
  color: rgb(var(--environment-accent));
  background: rgba(var(--environment-accent), 0.14);
  font-size: 1.05rem;
}

.environment-metric__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.environment-metric__content > span {
  color: var(--bs-secondary-color);
  font-size: 0.78rem;
  font-weight: 600;
}

.environment-metric__content strong {
  overflow: hidden;
  color: var(--bs-body-color);
  font-size: 1.3rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.environment-metric__content small {
  overflow: hidden;
  color: var(--bs-secondary-color);
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.environment-sources {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 0.85rem;
  padding: 0.65rem 0.8rem 0;
  border-top: 1px solid var(--bs-border-color);
  color: var(--bs-secondary-color);
  font-size: 0.75rem;
}

.environment-sources div {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.environment-sources i {
  color: var(--bs-primary);
}

.environment-sources span {
  padding-left: 0.25rem;
  color: var(--bs-tertiary-color);
}

.progress-card {
  overflow: hidden;
}

.progress-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
}

.dashboard-state {
  min-height: 430px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: var(--bs-secondary-color);
  text-align: center;
}

.progress-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background: rgba(var(--bs-body-color-rgb), 0.025);
}

.summary-item span {
  color: var(--bs-secondary-color);
  font-size: 0.875rem;
}

.summary-item strong {
  font-size: 1.15rem;
}

.chart-help {
  color: var(--bs-secondary-color);
  font-size: 0.82rem;
  text-align: center;
  margin-top: 0.25rem;
}

.data-status {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.data-status button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.65rem;
  border: 0;
  border-radius: 999px;
  color: var(--bs-success);
  background: rgba(var(--bs-success-rgb), 0.1);
  font-size: 0.78rem;
  cursor: pointer;
}

.data-status button:hover {
  filter: brightness(1.08);
}

.data-status button:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}

.data-status button.missing {
  color: var(--bs-secondary-color);
  background: rgba(var(--bs-secondary-rgb), 0.1);
}

@media (max-width: 767.98px) {
  .dashboard-page {
    padding: 1rem;
  }

  .dashboard-heading {
    align-items: flex-start;
  }

  .progress-summary {
    grid-template-columns: 1fr;
  }

  .environment-card__header {
    align-items: flex-start;
  }

  .environment-grid {
    grid-template-columns: 1fr;
  }

  .environment-sources {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (min-width: 768px) and (max-width: 1199.98px) {
  .environment-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
