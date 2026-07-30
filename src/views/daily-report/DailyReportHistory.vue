<template>
  <div class="archive-page">
    <PageHeader :title="pageTitle" icon="fa fa-calendar-days" :breadcrumbs="breadcrumbs" />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程專案
    </div>

    <template v-else>
      <Card class="archive-filter mb-3">
        <CardBody>
          <div class="filter-toolbar">
            <div>
              <h5 class="mb-1">{{ reportLabel }}區間總覽</h5>
              <p class="small text-muted mb-0">集中檢視每日填報狀態，單日內容仍於原日誌頁編輯。</p>
            </div>
            <div class="d-flex gap-2 flex-wrap">
              <button type="button" class="win-btn" :disabled="loading" @click="load">
                <i :class="loading ? 'fa fa-spinner fa-spin' : 'fa fa-rotate'" class="me-1"></i>
                查詢
              </button>
              <button
                type="button"
                class="win-btn win-btn-accent"
                :disabled="exporting || !records.length"
                @click="exportRange"
              >
                <i :class="exporting ? 'fa fa-spinner fa-spin' : 'fa fa-file-zipper'" class="me-1"></i>
                匯出區間全部日誌
              </button>
            </div>
          </div>
          <div class="row g-3 mt-1">
            <div class="col-12 col-md-4">
              <label class="form-label">開始日期</label>
              <input v-model="filters.startDate" type="date" class="form-control" />
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">結束日期</label>
              <input v-model="filters.endDate" type="date" class="form-control" />
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label">填報狀態</label>
              <select v-model="filters.status" class="form-select">
                <option value="">全部狀態</option>
                <option value="DRAFT">草稿</option>
                <option value="SUBMITTED">已送出</option>
              </select>
            </div>
          </div>
          <div class="small text-muted mt-3">
            區間匯出會產生 ZIP，內含此期間每個已建立日期的一份 {{ reportLabel }} Word。
          </div>
        </CardBody>
      </Card>

      <div class="summary-grid mb-3">
        <article class="summary-card">
          <i class="fa fa-calendar-check"></i>
          <div><strong>{{ records.length }}</strong><span>區間日誌</span></div>
        </article>
        <article class="summary-card">
          <i class="fa fa-pen-ruler"></i>
          <div><strong>{{ draftCount }}</strong><span>草稿</span></div>
        </article>
        <article class="summary-card">
          <i class="fa fa-paper-plane"></i>
          <div><strong>{{ submittedCount }}</strong><span>已送出</span></div>
        </article>
        <article class="summary-card">
          <i class="fa fa-users"></i>
          <div><strong>{{ totalPeople }}</strong><span>區間出工人次</span></div>
        </article>
      </div>

      <Card class="archive-list">
        <CardHeader class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div>
            <h5 class="mb-1">{{ reportLabel }}列表</h5>
            <div class="small text-muted">目前顯示 {{ filteredRecords.length }} 筆</div>
          </div>
          <button type="button" class="win-btn win-btn--sm win-btn-accent" @click="openDate(today)">
            <i class="fa fa-plus me-1"></i>開啟今日日誌
          </button>
        </CardHeader>
        <CardBody>
          <div v-if="loading" class="text-center py-5 text-muted">
            <i class="fa fa-spinner fa-spin fa-2x"></i>
          </div>
          <div v-else-if="!filteredRecords.length" class="empty-state">
            <i class="fa fa-calendar-xmark fa-3x mb-3"></i>
            <div>此區間沒有符合條件的{{ reportLabel }}</div>
            <div class="small mt-2">可調整日期，或直接開啟指定日期建立日誌。</div>
          </div>
          <div v-else class="table-responsive">
            <table class="table archive-table align-middle mb-0">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>狀態</th>
                  <th>天候</th>
                  <th class="text-center">施工項目</th>
                  <th class="text-center">材料</th>
                  <th class="text-center">出工人數</th>
                  <th class="text-center">機具數量</th>
                  <th>重要記事</th>
                  <th>更新時間</th>
                  <th class="action-col">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in filteredRecords" :key="record.reportDate">
                  <td class="date-cell">{{ formatDate(record.reportDate) }}</td>
                  <td>
                    <span class="status-badge" :class="record.status.toLowerCase()">
                      {{ record.status === 'SUBMITTED' ? '已送出' : '草稿' }}
                    </span>
                  </td>
                  <td>{{ weatherText(record) }}</td>
                  <td class="text-center">{{ record.constructionItemCount }}</td>
                  <td class="text-center">{{ record.materialCount }}</td>
                  <td class="text-center">{{ formatNumber(record.totalPeople) }}</td>
                  <td class="text-center">{{ formatNumber(record.totalMachine) }}</td>
                  <td class="important-cell" :title="record.importantMatters || ''">
                    {{ record.importantMatters || '—' }}
                  </td>
                  <td>{{ formatDateTime(record.updatedAt) }}</td>
                  <td>
                    <div class="d-flex gap-2">
                      <button
                        type="button"
                        class="win-btn win-btn--sm win-btn-accent"
                        title="編輯單日日誌"
                        @click="openDate(record.reportDate)"
                      >
                        <i class="fa fa-pen-to-square"></i>
                      </button>
                      <button
                        type="button"
                        class="win-btn win-btn--sm"
                        title="匯出單日 Word"
                        :disabled="exportingDate === record.reportDate"
                        @click="exportOne(record.reportDate)"
                      >
                        <i
                          :class="exportingDate === record.reportDate ? 'fa fa-spinner fa-spin' : 'fa fa-file-word'"
                        ></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import {
  exportDailyReportArchive,
  exportDailyReportToWord,
  listDailyReportArchive,
  type DailyReportArchiveSummary,
} from '@/api/dailyReport'
import { downloadBlobAsFile } from '@/api/forms'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const { isSupervisory } = useViewPerspective()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const fixedFormCode = computed(() => String(route.meta.fixedFormCode ?? ''))
const supervisory = computed(() =>
  fixedFormCode.value === 'C05' || (fixedFormCode.value !== 'G06' && isSupervisory.value),
)
const ownerType = computed<'SUPERVISORY' | 'CONTRACTOR'>(() =>
  supervisory.value ? 'SUPERVISORY' : 'CONTRACTOR',
)
const formCode = computed(() => supervisory.value ? 'C-5' : 'G-6')
const reportLabel = computed(() => supervisory.value ? '公共工程監造報表' : '公共工程施工日誌')
const pageTitle = computed(() => `${formCode.value} ${reportLabel.value}`)
const breadcrumbs = computed(() => [
  { text: supervisory.value ? '監造 C 類表單' : '營造 G 類表單', href: 'javascript:;' },
  { text: pageTitle.value, active: true as const },
])

const today = new Date().toISOString().slice(0, 10)
const filters = reactive({
  startDate: `${today.slice(0, 8)}01`,
  endDate: today,
  status: '',
})
const records = ref<DailyReportArchiveSummary[]>([])
const loading = ref(false)
const exporting = ref(false)
const exportingDate = ref<string | null>(null)
const filteredRecords = computed(() =>
  filters.status
    ? records.value.filter((record) => record.status === filters.status)
    : records.value,
)
const draftCount = computed(() => records.value.filter((record) => record.status === 'DRAFT').length)
const submittedCount = computed(() => records.value.filter((record) => record.status === 'SUBMITTED').length)
const totalPeople = computed(() =>
  formatNumber(records.value.reduce((sum, record) => sum + Number(record.totalPeople || 0), 0)),
)

async function load() {
  if (!constructionId.value) return
  if (!filters.startDate || !filters.endDate || filters.startDate > filters.endDate) {
    toastService.error('請設定正確的日期區間')
    return
  }
  loading.value = true
  try {
    records.value = await listDailyReportArchive(
      constructionId.value,
      filters.startDate,
      filters.endDate,
      ownerType.value,
    )
  } catch (error) {
    console.error('[DailyReportArchive] load failed', error)
    toastService.error(`載入${reportLabel.value}總覽失敗`)
  } finally {
    loading.value = false
  }
}

function openDate(date: string) {
  void router.push({ path: '/daily-report', query: { reportDate: date } })
}

async function exportOne(date: string) {
  if (exportingDate.value) return
  exportingDate.value = date
  try {
    await exportDailyReportToWord(
      constructionId.value,
      date,
      supervisory.value ? 'supervision' : 'construction',
      { ownerType: ownerType.value },
    )
  } catch (error) {
    console.error('[DailyReportArchive] single export failed', error)
    toastService.error('單日 Word 匯出失敗')
  } finally {
    exportingDate.value = null
  }
}

async function exportRange() {
  if (exporting.value) return
  exporting.value = true
  try {
    const blob = await exportDailyReportArchive(
      constructionId.value,
      filters.startDate,
      filters.endDate,
      ownerType.value,
    )
    downloadBlobAsFile(
      blob,
      `${formCode.value}_${reportLabel.value}_${filters.startDate}_${filters.endDate}.zip`,
    )
  } catch (error) {
    console.error('[DailyReportArchive] range export failed', error)
    toastService.error('區間日誌匯出失敗')
  } finally {
    exporting.value = false
  }
}

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('zh-TW')
const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '—'
const formatNumber = (value: number) =>
  new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)
const weatherText = (record: DailyReportArchiveSummary) => {
  const morning = record.weatherMorning || '—'
  const afternoon = record.weatherAfternoon || '—'
  return `${morning} / ${afternoon}`
}

watch([constructionId, ownerType], load)
onMounted(async () => {
  if (!workspaceStore.currentWorkspace) await workspaceStore.initWorkspaces()
  await load()
})
</script>

<style scoped>
.archive-page {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1050px 540px at 10% 0%, rgba(var(--bs-primary-rgb), 0.08), transparent 62%),
    rgba(15, 23, 42, 0.1);
}
.archive-filter,
.archive-list {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.9));
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}
.archive-filter :deep(.card-body),
.archive-list :deep(.card-header),
.archive-list :deep(.card-body) { background: transparent; }
.filter-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}
.summary-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.65rem;
  background: #252a30;
}
.summary-card > i {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: #f4c15d;
  border-radius: 0.55rem;
  background: rgba(180, 120, 25, 0.2);
}
.summary-card div { display: grid; }
.summary-card strong { font-size: 1.35rem; line-height: 1.1; }
.summary-card span { color: var(--bs-secondary-color); font-size: 0.82rem; }
.archive-table {
  min-width: 1180px;
  color: var(--bs-body-color);
  --bs-table-bg: transparent;
  --bs-table-border-color: rgba(255, 255, 255, 0.1);
}
.archive-table thead th { color: #cbd5e1; background: rgba(2, 6, 23, 0.55); white-space: nowrap; }
.date-cell { color: #f4c15d; font-weight: 700; white-space: nowrap; }
.important-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.action-col { width: 116px; }
.status-badge {
  display: inline-flex;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}
.status-badge.draft { color: #cbd5e1; background: rgba(148, 163, 184, 0.18); }
.status-badge.submitted { color: #86efac; background: rgba(34, 197, 94, 0.16); }
.empty-state { padding: 4rem 1rem; text-align: center; color: var(--bs-secondary-color); }
@media (max-width: 991px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 575px) {
  .archive-page { padding: 0.65rem; }
  .summary-grid { grid-template-columns: 1fr; }
}
</style>
