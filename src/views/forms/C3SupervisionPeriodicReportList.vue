<template>
  <div class="c3-page">
    <PageHeader
      title="C-2 施工月報"
      icon="fa fa-calendar-days"
      :breadcrumbs="[
        { text: '監造 C 類表單', href: 'javascript:;' },
        { text: 'C-2 施工月報', active: true },
      ]"
    />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案件
    </div>

    <Card v-else class="report-card report-card--full c3-card">
      <CardHeader class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div>
          <h5 class="mb-1">報表版本</h5>
          <p class="mb-0 small text-muted">每份報表獨立保存內容與送審紀錄。</p>
        </div>
        <div class="d-flex gap-2">
          <button class="win-btn win-btn--sm" :disabled="loading" @click="load">
            <i class="fa fa-rotate me-1"></i>重新整理
          </button>
          <button class="win-btn win-btn--sm win-btn-accent" :disabled="creating" @click="create">
            <i :class="creating ? 'fa fa-spinner fa-spin' : 'fa fa-plus'" class="me-1"></i>
            新增報表
          </button>
        </div>
      </CardHeader>
      <CardBody>
        <div v-if="loading" class="text-center py-5 text-muted">
          <i class="fa fa-spinner fa-spin fa-2x"></i>
        </div>
        <div v-else-if="!records.length" class="empty-state">
          <i class="fa fa-calendar-days fa-3x mb-3"></i>
          <div>目前沒有施工月報</div>
          <div class="small mt-2">點擊「新增報表」建立第一份資料。</div>
        </div>
        <div v-else class="row g-3">
          <div v-for="record in records" :key="record.id" class="col-12 col-xl-6">
            <article class="version-card h-100">
              <div class="d-flex gap-3">
                <div class="version-icon"><i class="fa fa-calendar-check"></i></div>
                <div class="flex-fill min-w-0">
                  <h5 class="text-truncate mb-2">{{ record.title }}</h5>
                  <div class="small text-muted mb-1">
                    報告期間：{{ record.reportData.reportPeriod || '尚未填寫' }}
                  </div>
                  <div class="small text-muted">更新時間：{{ formatDateTime(record.updatedAt) }}</div>
                </div>
              </div>
              <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                <button class="win-btn win-btn--sm win-btn-danger" @click="remove(record)">
                  <i class="fa fa-trash me-1"></i>刪除
                </button>
                <button class="win-btn win-btn--sm win-btn-accent" @click="open(record.id)">
                  <i class="fa fa-pen-to-square me-1"></i>開啟編輯
                </button>
              </div>
            </article>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  createC3Report,
  deleteC3Report,
  listC3Reports,
  type C3ReportData,
  type C3SupervisionPeriodicReport,
} from '@/api/c3SupervisionPeriodicReport'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const records = ref<C3SupervisionPeriodicReport[]>([])
const loading = ref(false)
const creating = ref(false)

const emptyData = (): C3ReportData => {
  const project = workspaceStore.currentProject
  const now = new Date()
  const month = now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })
  return {
    hostAgency: '',
    projectName: project?.name ?? '',
    serviceName: '',
    reportTitle: '施工月報',
    reportPeriod: month,
    issueDate: now.toISOString().slice(0, 10),
    supervisionUnit: '',
    responsiblePerson: '',
    designUnit: project?.designCompany ?? '',
    contractorUnit: project?.contractorCompanyName ?? '',
    projectScope: project?.location ?? '',
    constructionPeriod: '',
    plannedProgress: '',
    actualProgress: '',
    delayReason: '',
    recoveryPlan: '',
    monthlyAchievements: '',
    c3SummaryRows: [],
    c3ConstructionInspectionRows: [],
    c3MaterialInspectionRows: [],
    c3StaffRows: [],
    c3OutgoingDocumentRows: [],
    c3IncomingDocumentRows: [],
    c3RiskRows: [],
  }
}

const load = async () => {
  if (!constructionId.value) return
  loading.value = true
  try {
    records.value = await listC3Reports(constructionId.value)
  } catch (error) {
    console.error('[C3] load failed', error)
    toastService.error('載入 C-2 報表失敗')
  } finally {
    loading.value = false
  }
}

const create = async () => {
  if (!constructionId.value || creating.value) return
  creating.value = true
  try {
    const data = emptyData()
    const record = await createC3Report(constructionId.value, {
      title: `C-2 ${data.reportPeriod}施工月報`,
      reportData: data,
    })
    await open(record.id)
  } catch (error) {
    console.error('[C3] create failed', error)
    toastService.error('新增 C-2 報表失敗')
  } finally {
    creating.value = false
  }
}

const open = (recordId: number) =>
  router.push(`/forms/c2-supervision-periodic-report/records/${recordId}`)

const remove = async (record: C3SupervisionPeriodicReport) => {
  if (!window.confirm(`確定刪除「${record.title}」及其送審紀錄？`)) return
  try {
    await deleteC3Report(constructionId.value, record.id)
    toastService.success('報表已刪除')
    await load()
  } catch (error) {
    console.error('[C3] delete failed', error)
    toastService.error('刪除 C-2 報表失敗')
  }
}

const formatDateTime = (value: string) =>
  value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '-'

watch(constructionId, load)
onMounted(async () => {
  if (!workspaceStore.currentWorkspace) await workspaceStore.initWorkspaces()
  await load()
})
</script>

<style scoped>
.c3-page {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1000px 520px at 10% 0%, rgba(var(--bs-primary-rgb), 0.08), transparent 62%),
    rgba(15, 23, 42, 0.1);
}
.c3-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.9));
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}
.c3-card :deep(.card-header),
.c3-card :deep(.card-body) { background: transparent; }
.version-card {
  padding: 1.1rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.65rem;
  background: #2d3136;
}
.version-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  display: grid;
  place-items: center;
  border-radius: 0.65rem;
  color: #fff;
  background: linear-gradient(135deg, #b56b19, #d99a39);
}
.empty-state { padding: 4rem 1rem; text-align: center; color: var(--bs-secondary-color); }
.min-w-0 { min-width: 0; }
</style>
