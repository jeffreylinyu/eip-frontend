<template>
  <div class="self-check-inspection-list">
    <div class="alert alert-info mb-4">
      <h5 class="alert-heading">
        <i class="fa fa-clipboard-check me-2"></i>自主檢查表
      </h5>
      <p class="mb-0 small">
        請先選擇「施工抽查」或「安全衛生抽查」分頁，再建立對應類型的抽查紀錄；每筆紀錄僅含一種抽查標準快照。
      </p>
    </div>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeTab === 'CONSTRUCTION' }"
          @click="switchTab('CONSTRUCTION')"
        >
          施工抽查
        </button>
      </li>
      <li class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeTab === 'SAFETY' }"
          @click="switchTab('SAFETY')"
        >
          安全衛生抽查
        </button>
      </li>
    </ul>

    <div class="d-flex justify-content-between align-items-center gap-3 mb-3 flex-wrap">
      <div class="text-muted small">
        共 {{ records.length }} 筆{{ tabLabel }}紀錄
      </div>
      <button
        type="button"
        class="btn btn-sm btn-primary"
        :disabled="creating || !constructionId || !documentClassificationId"
        @click="createRecord"
      >
        <i v-if="creating" class="fa fa-spinner fa-spin me-1"></i>
        <i v-else class="fa fa-plus me-1"></i>
        新增{{ tabLabel }}紀錄
      </button>
    </div>

    <div v-if="loading" class="text-center py-4 text-muted">
      <i class="fa fa-spinner fa-spin me-2"></i>載入中…
    </div>

    <div v-else-if="records.length === 0" class="text-center py-4 text-muted border rounded">
      <i class="fa fa-inbox fa-2x mb-2 d-block"></i>
      尚無{{ tabLabel }}紀錄
      <div class="small mt-1">點擊「新增{{ tabLabel }}紀錄」開始建立</div>
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0 a4-table">
        <thead>
          <tr>
            <th style="width: 56px">#</th>
            <th style="min-width: 120px">抽查日期</th>
            <th style="min-width: 200px">分項工程名稱</th>
            <th style="width: 90px" class="text-center">檢查項</th>
            <th style="min-width: 120px">抽查位置</th>
            <th style="width: 140px" class="text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, idx) in records"
            :key="r.id"
            class="cursor-pointer"
            @click="openRecord(r.id)"
          >
            <td>{{ idx + 1 }}</td>
            <td>{{ formatDate(r.inspectionDate) }}</td>
            <td>
              <span class="fw-semibold">{{ r.subdivisionProjectName || r.title || '（未命名）' }}</span>
            </td>
            <td class="text-center">
              <span class="badge bg-secondary">{{ r.itemCount ?? 0 }}</span>
            </td>
            <td class="text-truncate" style="max-width: 10rem">
              {{ r.inspectionLocation || '—' }}
            </td>
            <td class="text-center" @click.stop>
              <div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-outline-primary" title="填寫明細" @click="openRecord(r.id)">
                  <i class="fa fa-pen-to-square"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  title="匯出 Word"
                  :disabled="exportingId === r.id"
                  @click="exportRecord(r)"
                >
                  <i class="fa" :class="exportingId === r.id ? 'fa-spinner fa-spin' : 'fa-file-word'"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-outline-danger"
                  title="刪除"
                  @click="removeRecord(r)"
                >
                  <i class="fa fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import toastService from '@/components/bootstrap/ToastService.js'
import { formatRepublicDateFromIso } from '@/utils/format'
import {
  selfCheckInspectionApi,
  type SelfCheckInspectionRecord,
  type SelfCheckOwnerType,
  type SelfCheckStandardKind
} from '@/api/selfCheckInspection'

const props = defineProps<{
  constructionId: string
  documentClassificationId: number
  ownerType: SelfCheckOwnerType
  /** 列表頁路由前綴，如 /supervisory/forms/doc-class/D/12 */
  basePath: string
}>()

const router = useRouter()
const loading = ref(false)
const creating = ref(false)
const exportingId = ref<number | null>(null)
const activeTab = ref<SelfCheckStandardKind>('CONSTRUCTION')
const records = ref<SelfCheckInspectionRecord[]>([])

const tabLabel = computed(() => (activeTab.value === 'CONSTRUCTION' ? '施工抽查' : '安全衛生抽查'))

function formatDate(iso: string): string {
  return formatRepublicDateFromIso(iso)
}

function switchTab(tab: SelfCheckStandardKind) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  void loadRecords()
}

async function loadRecords() {
  if (!props.constructionId || !props.documentClassificationId) {
    records.value = []
    return
  }
  loading.value = true
  try {
    records.value = await selfCheckInspectionApi.list(
      props.constructionId,
      props.documentClassificationId,
      props.ownerType,
      activeTab.value
    )
  } catch (e) {
    console.error(e)
    records.value = []
  } finally {
    loading.value = false
  }
}

async function createRecord() {
  if (!props.constructionId) return
  creating.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)
    const created = await selfCheckInspectionApi.create(props.constructionId, props.ownerType, {
      documentClassificationId: props.documentClassificationId,
      standardKind: activeTab.value,
      inspectionDate: today
    })
    await loadRecords()
    openRecord(created.id)
  } catch (e: unknown) {
    console.error(e)
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      (e as Error)?.message ??
      '建立失敗'
    alert(msg)
  } finally {
    creating.value = false
  }
}

function openRecord(recordId: number) {
  void router.push(`${props.basePath}/records/${recordId}`)
}

async function exportRecord(r: SelfCheckInspectionRecord) {
  if (!props.constructionId || exportingId.value != null) return
  exportingId.value = r.id
  try {
    await selfCheckInspectionApi.export(props.constructionId, r.id, props.ownerType)
    toastService.success('已匯出')
  } catch (e: unknown) {
    console.error(e)
    const msg = (e as Error)?.message ?? '匯出失敗'
    toastService.error(msg.includes('樣板') ? msg : '匯出失敗')
  } finally {
    exportingId.value = null
  }
}

async function removeRecord(r: SelfCheckInspectionRecord) {
  if (!confirm(`確定刪除「${r.subdivisionProjectName || r.title || formatDate(r.inspectionDate)}」？`)) return
  try {
    await selfCheckInspectionApi.delete(props.constructionId, r.id, props.ownerType)
    await loadRecords()
  } catch (e) {
    console.error(e)
    alert('刪除失敗')
  }
}

watch(
  () => [props.constructionId, props.documentClassificationId, props.ownerType] as const,
  () => { void loadRecords() },
  { immediate: true }
)

defineExpose({ reload: loadRecords })
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.nav-tabs .nav-link {
  cursor: pointer;
}
</style>
