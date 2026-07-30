<template>
  <div class="inspection-list-page">
    <PageHeader :title="pageTitle" icon="fa fa-clipboard-check" :breadcrumbs="breadcrumbs" />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程專案
    </div>

    <Card v-else class="inspection-list-card">
      <CardHeader class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div>
          <h5 class="mb-1">會勘紀錄版本</h5>
          <p class="mb-0 small text-muted">每次會勘建立一筆獨立紀錄、照片與送審資料。</p>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="win-btn win-btn--sm" :disabled="loading" @click="load">
            <i class="fa fa-rotate me-1"></i>重新載入
          </button>
          <button
            type="button"
            class="win-btn win-btn--sm win-btn-accent"
            :disabled="creating"
            @click="create"
          >
            <i :class="creating ? 'fa fa-spinner fa-spin' : 'fa fa-plus'" class="me-1"></i>
            新增會勘紀錄
          </button>
        </div>
      </CardHeader>
      <CardBody>
        <div v-if="loading" class="text-center py-5 text-muted">
          <i class="fa fa-spinner fa-spin fa-2x"></i>
        </div>
        <div v-else-if="!records.length" class="empty-state">
          <i class="fa fa-clipboard-check fa-3x mb-3"></i>
          <div>目前沒有各項會勘紀錄</div>
          <div class="small mt-2">請新增本次會勘紀錄。</div>
        </div>
        <div v-else class="row g-3">
          <div v-for="record in records" :key="record.id" class="col-12 col-xl-6">
            <article class="version-card h-100">
              <div class="d-flex gap-3">
                <div class="version-icon"><i class="fa fa-location-dot"></i></div>
                <div class="flex-fill min-w-0">
                  <h5 class="text-truncate mb-2">{{ record.title }}</h5>
                  <div class="small text-muted mb-1">
                    會勘日期：{{ record.inspectionData.inspectionDate || '尚未填寫' }}
                  </div>
                  <div class="small text-muted">
                    地點：{{ record.inspectionData.location || '尚未填寫' }}
                  </div>
                  <div class="small text-muted mt-1">
                    更新時間：{{ formatDateTime(record.updatedAt) }}
                  </div>
                </div>
              </div>
              <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                <button class="win-btn win-btn--sm win-btn-danger" @click="remove(record)">
                  <i class="fa fa-trash me-1"></i>刪除
                </button>
                <button class="win-btn win-btn--sm win-btn-accent" @click="open(record.id)">
                  <i class="fa fa-pen-to-square me-1"></i>編輯
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
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  createSiteInspection,
  deleteSiteInspection,
  listSiteInspections,
  type SiteInspectionData,
  type SiteInspectionRecord,
} from '@/api/siteInspectionRecord'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const fixedFormCode = computed(() => String(route.meta.fixedFormCode ?? 'C04'))
const pageTitle = computed(() => `${fixedFormCode.value.replace(/^([CG])0/, '$1-')} 各項會勘紀錄`)
const breadcrumbs = computed(() => [
  { text: fixedFormCode.value.startsWith('G') ? '營造 G 類表單' : '監造 C 類表單', href: 'javascript:;' },
  { text: pageTitle.value, active: true as const },
])
const records = ref<SiteInspectionRecord[]>([])
const loading = ref(false)
const creating = ref(false)

function emptyData(): SiteInspectionData {
  const project = workspaceStore.currentProject
  return {
    hostAgency: '',
    projectName: project?.name ?? '',
    inspectionSubject: '',
    inspectionDate: new Date().toISOString().slice(0, 10),
    inspectionPeriod: '上午',
    inspectionTime: '',
    location: '',
    chairperson: '',
    recorder: '',
    handlingReason: '',
    suggestionSummary: '',
    inspectionOpinions: '',
    inspectionConclusion: '',
    attendeeRows: [],
  }
}

async function load() {
  if (!constructionId.value) return
  loading.value = true
  try {
    records.value = await listSiteInspections(constructionId.value)
  } catch (error) {
    console.error('[SiteInspection] load failed', error)
    toastService.error('載入各項會勘紀錄失敗')
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!constructionId.value || creating.value) return
  creating.value = true
  try {
    const inspectionData = emptyData()
    const record = await createSiteInspection(constructionId.value, {
      title: `${pageTitle.value} ${inspectionData.inspectionDate}`,
      inspectionData,
    })
    open(record.id)
  } catch (error) {
    console.error('[SiteInspection] create failed', error)
    toastService.error('新增各項會勘紀錄失敗')
  } finally {
    creating.value = false
  }
}

function open(recordId: number) {
  void router.push(`${route.path}/records/${recordId}`)
}

async function remove(record: SiteInspectionRecord) {
  if (!window.confirm(`確定刪除「${record.title}」、照片及送審紀錄？`)) return
  try {
    await deleteSiteInspection(constructionId.value, record.id)
    await load()
  } catch (error) {
    console.error('[SiteInspection] delete failed', error)
    toastService.error('刪除各項會勘紀錄失敗')
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
.inspection-list-page {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1000px 520px at 10% 0%, rgba(var(--bs-primary-rgb), 0.08), transparent 62%),
    rgba(15, 23, 42, 0.1);
}
.inspection-list-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.9));
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}
.inspection-list-card :deep(.card-header),
.inspection-list-card :deep(.card-body) { background: transparent; }
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
  background: linear-gradient(135deg, #8a6116, #d8a33d);
}
.empty-state { padding: 4rem 1rem; text-align: center; color: var(--bs-secondary-color); }
.min-w-0 { min-width: 0; }
</style>
