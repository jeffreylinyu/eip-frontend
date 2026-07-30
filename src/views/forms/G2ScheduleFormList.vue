<template>
  <div class="g2-list-page">
    <PageHeader
      title="G-2 施工網狀圖"
      icon="fa fa-chart-gantt"
      :breadcrumbs="[
        { text: '營造 G 類表單', href: 'javascript:;' },
        { text: 'G-2 施工網狀圖', active: true },
      ]"
    />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案。
    </div>

    <Card v-else class="report-card report-card--full g2-list-card">
      <CardHeader class="d-flex align-items-center justify-content-between">
        <div>
          <h5 class="mb-1">送審版本</h5>
          <p class="mb-0 small text-muted">版本由「施工進度」頁面的儲存到送審文件建立。</p>
        </div>
        <button class="win-btn win-btn--sm" :disabled="loading" @click="load">
          <i class="fa fa-rotate me-1"></i>重新整理
        </button>
      </CardHeader>
      <CardBody>
        <div v-if="loading" class="text-center py-5">
          <i class="fa fa-spinner fa-spin fa-2x text-muted"></i>
        </div>
        <div v-else-if="!records.length" class="text-center py-5 text-muted">
          <i class="fa fa-chart-gantt fa-3x mb-3"></i>
          <div>尚無 G-2 送審版本</div>
          <div class="small mt-2">請至施工進度頁面建立第一份快照。</div>
        </div>
        <div v-else class="row g-3">
          <div v-for="record in records" :key="record.id" class="col-12 col-xl-6">
            <div class="version-card h-100">
              <div class="d-flex gap-3">
                <div class="version-icon"><i class="fa fa-chart-gantt"></i></div>
                <div class="flex-fill min-w-0">
                  <h5 class="text-truncate mb-2">{{ record.title }}</h5>
                  <div class="small text-muted mb-1">共 {{ record.tasks.length }} 個進度項目</div>
                  <div class="small text-muted">建立時間：{{ formatDateTime(record.createdAt) }}</div>
                  <div class="small text-muted">最後修改：{{ formatDateTime(record.updatedAt) }}</div>
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
            </div>
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
  deleteG2ScheduleForm,
  listG2ScheduleForms,
  type G2ScheduleForm,
} from '@/api/g2ScheduleForm'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const records = ref<G2ScheduleForm[]>([])
const loading = ref(false)

const load = async () => {
  if (!constructionId.value) {
    records.value = []
    return
  }
  loading.value = true
  try {
    records.value = await listG2ScheduleForms(constructionId.value)
  } catch (error) {
    console.error('[G2] 載入列表失敗', error)
    toastService.error('載入 G-2 送審版本失敗')
  } finally {
    loading.value = false
  }
}

const open = (id: number) => router.push(`/forms/g2-construction-network-diagram/records/${id}`)

const remove = async (record: G2ScheduleForm) => {
  if (!window.confirm(`確定刪除「${record.title}」及其送審紀錄？`)) return
  try {
    await deleteG2ScheduleForm(constructionId.value, record.id)
    toastService.success('G-2 版本已刪除')
    await load()
  } catch (error) {
    console.error('[G2] 刪除失敗', error)
    toastService.error('刪除失敗')
  }
}

const formatDateTime = (value: string) =>
  value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '－'

watch(constructionId, load)
onMounted(async () => {
  if (!workspaceStore.currentWorkspace) await workspaceStore.initWorkspaces()
  await load()
})
</script>

<style scoped>
.g2-list-page {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1200px 600px at 12% 0%, rgba(var(--bs-primary-rgb), 0.06), transparent 60%),
    radial-gradient(900px 500px at 88% 10%, rgba(255, 255, 255, 0.03), transparent 55%),
    rgba(15, 23, 42, 0.1);
}
.version-card {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.65rem;
  padding: 1.1rem;
  background-color: #2d3136;
}
.g2-list-card {
  background-color: #0f172a;
  background-image: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}
.g2-list-card :deep(.card-header),
.g2-list-card :deep(.card-body) {
  background: transparent;
}
.g2-list-card :deep(.card-header) {
  border-bottom-color: rgba(255, 255, 255, 0.09);
}
.version-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  display: grid;
  place-items: center;
  border-radius: 0.65rem;
  color: #fff;
  background: linear-gradient(135deg, #16784b, #3da66f);
}
.min-w-0 { min-width: 0; }
</style>
