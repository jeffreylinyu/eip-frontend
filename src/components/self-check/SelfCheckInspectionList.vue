<template>
  <div class="self-check-list">
    <div class="inspection-hero">
      <div>
        <div class="inspection-hero__eyebrow">
          <i class="fa fa-shield-halved me-2"></i>
          {{ aggregate ? aggregateOverviewLabel : '施工品質紀錄' }}
        </div>
        <h2 class="inspection-hero__title">{{ tabLabel }}</h2>
        <p class="inspection-hero__description">
          {{
            aggregate
              ? aggregateDescription
              : `${inspectionNoun}項目會在建立紀錄時保留快照，後續標準調整不影響既有紀錄。`
          }}
        </p>
      </div>
      <div class="inspection-hero__metric">
        <strong>{{ filteredRecords.length }}</strong>
        <span>筆紀錄</span>
      </div>
    </div>

    <div class="inspection-toolbar">
      <div class="inspection-tabs" role="tablist" :aria-label="`${inspectionNoun}類型`">
        <button
          type="button"
          class="inspection-tab"
          :class="{ active: activeTab === 'CONSTRUCTION' }"
          @click="switchTab('CONSTRUCTION')"
        >
          <i class="fa fa-helmet-safety"></i>
          {{ constructionTabLabel }}
        </button>
        <button
          type="button"
          class="inspection-tab"
          :class="{ active: activeTab === 'SAFETY' }"
          @click="switchTab('SAFETY')"
        >
          <i class="fa fa-shield-heart"></i>
          {{ safetyTabLabel }}
        </button>
      </div>

      <div class="inspection-actions">
        <select
          v-if="aggregate"
          v-model="filterClassificationId"
          class="form-select form-select-sm inspection-select"
          aria-label="篩選施工項目"
        >
          <option value="">全部施工項目</option>
          <option v-for="option in classificationOptions" :key="option.id" :value="String(option.id)">
            {{ option.label }}
          </option>
        </select>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="creating || !canCreate"
          @click="requestCreate"
        >
          <i v-if="creating" class="fa fa-spinner fa-spin me-1"></i>
          <i v-else class="fa fa-plus me-1"></i>
          新增{{ tabLabel }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="inspection-state">
      <i class="fa fa-spinner fa-spin"></i>
      <span>載入紀錄中…</span>
    </div>

    <div v-else-if="filteredRecords.length === 0" class="inspection-state inspection-state--empty">
      <i class="fa fa-folder-open"></i>
      <strong>目前沒有{{ tabLabel }}紀錄</strong>
      <span>{{ aggregate ? '可先選擇施工項目後建立第一筆紀錄。' : `按「新增${tabLabel}」開始填寫。` }}</span>
    </div>

    <div v-else class="inspection-table-wrap">
      <table class="table align-middle mb-0 inspection-table">
        <thead>
          <tr>
            <th class="inspection-table__index">#</th>
            <th>{{ inspectionNoun }}日期</th>
            <th v-if="aggregate">施工項目</th>
            <th>分項工程名稱</th>
            <th class="text-center">項目數</th>
            <th>{{ inspectionNoun }}位置</th>
            <th class="text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(record, index) in filteredRecords"
            :key="record.id"
            class="inspection-row"
            @click="openRecord(record.id)"
          >
            <td class="text-muted">{{ index + 1 }}</td>
            <td class="text-nowrap">{{ formatDate(record.inspectionDate) }}</td>
            <td v-if="aggregate">
              <span class="inspection-project-tag">
                {{ classificationLabel(record.documentClassificationId) }}
              </span>
            </td>
            <td>
              <span class="fw-semibold">
                {{ record.subdivisionProjectName || record.title || '未命名紀錄' }}
              </span>
            </td>
            <td class="text-center">
              <span class="badge rounded-pill text-bg-secondary">{{ record.itemCount ?? 0 }}</span>
            </td>
            <td>{{ record.inspectionLocation || '—' }}</td>
            <td class="text-center" @click.stop>
              <div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-outline-primary" title="編輯" @click="openRecord(record.id)">
                  <i class="fa fa-pen-to-square"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  title="匯出 Word"
                  :disabled="exportingId === record.id"
                  @click="exportRecord(record)"
                >
                  <i
                    class="fa"
                    :class="exportingId === record.id ? 'fa-spinner fa-spin' : 'fa-file-word'"
                  ></i>
                </button>
                <button
                  type="button"
                  class="btn btn-outline-danger"
                  title="刪除"
                  @click="removeRecord(record)"
                >
                  <i class="fa fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal
      :show="showCreateModal"
      title="選擇施工項目"
      icon="fa fa-list-check"
      modal-id="self-check-create-record"
      :is-loading="creating"
      @update:show="showCreateModal = $event"
      @confirm="createRecord"
    >
      <label class="form-label">施工項目</label>
      <select v-model="createClassificationId" class="form-select">
        <option value="" disabled>請選擇施工項目</option>
        <option v-for="option in classificationOptions" :key="option.id" :value="String(option.id)">
          {{ option.label }}
        </option>
      </select>
      <p class="small text-muted mt-2 mb-0">
        新紀錄會使用此施工項目目前維護的{{ tabLabel }}標準建立快照。
      </p>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/bootstrap/Modal.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { formatRepublicDateFromIso } from '@/utils/format'
import {
  selfCheckInspectionApi,
  type SelfCheckInspectionRecord,
  type SelfCheckOwnerType,
  type SelfCheckStandardKind
} from '@/api/selfCheckInspection'

export interface SelfCheckClassificationOption {
  id: number
  label: string
}

const props = withDefaults(defineProps<{
  constructionId: string
  documentClassificationId?: number
  classificationOptions?: SelfCheckClassificationOption[]
  ownerType: SelfCheckOwnerType
  basePath: string
  defaultStandardKind?: SelfCheckStandardKind
  aggregate?: boolean
  initialDocumentClassificationId?: number
}>(), {
  documentClassificationId: undefined,
  classificationOptions: () => [],
  defaultStandardKind: 'CONSTRUCTION',
  aggregate: false,
  initialDocumentClassificationId: undefined
})

const router = useRouter()
const loading = ref(false)
const creating = ref(false)
const exportingId = ref<number | null>(null)
const activeTab = ref<SelfCheckStandardKind>(props.defaultStandardKind)
const records = ref<SelfCheckInspectionRecord[]>([])
const filterClassificationId = ref(
  props.initialDocumentClassificationId ? String(props.initialDocumentClassificationId) : ''
)
const createClassificationId = ref('')
const showCreateModal = ref(false)

const isContractor = computed(() => props.ownerType === 'CONTRACTOR')
const inspectionNoun = computed(() => isContractor.value ? '自主檢查' : '抽查')
const constructionTabLabel = computed(() => isContractor.value ? '施工自主檢查' : '施工抽查')
const safetyTabLabel = computed(() => isContractor.value ? '安全衛生自主檢查' : '安全衛生抽查')
const tabLabel = computed(() =>
  activeTab.value === 'CONSTRUCTION' ? constructionTabLabel.value : safetyTabLabel.value
)
const aggregateOverviewLabel = computed(() =>
  isContractor.value ? '全工程自主檢查總覽' : '全工程抽查總覽'
)
const aggregateDescription = computed(() =>
  isContractor.value
    ? '集中管理所有施工項目的自主檢查紀錄，資料與自主檢查分類同步。'
    : '集中管理所有施工項目的抽查紀錄，資料與原自主檢查分類同步。'
)
const canCreate = computed(() =>
  props.aggregate ? props.classificationOptions.length > 0 : !!props.documentClassificationId
)
const filteredRecords = computed(() => {
  if (!props.aggregate || !filterClassificationId.value) return records.value
  const id = Number(filterClassificationId.value)
  return records.value.filter((record) => record.documentClassificationId === id)
})
const classificationLabelMap = computed(
  () => new Map(props.classificationOptions.map((option) => [option.id, option.label]))
)

function formatDate(iso: string): string {
  return formatRepublicDateFromIso(iso)
}

function classificationLabel(id: number): string {
  return classificationLabelMap.value.get(id) ?? `施工項目 #${id}`
}

function switchTab(tab: SelfCheckStandardKind) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  void loadRecords()
}

async function loadRecords() {
  if (!props.constructionId || (!props.aggregate && !props.documentClassificationId)) {
    records.value = []
    return
  }
  loading.value = true
  try {
    records.value = props.aggregate
      ? await selfCheckInspectionApi.listAll(props.constructionId, props.ownerType, activeTab.value)
      : await selfCheckInspectionApi.list(
          props.constructionId,
          props.documentClassificationId!,
          props.ownerType,
          activeTab.value
        )
  } catch (error) {
    console.error(error)
    records.value = []
    toastService.error(`載入${inspectionNoun.value}紀錄失敗`)
  } finally {
    loading.value = false
  }
}

function requestCreate() {
  if (!props.aggregate) {
    void createRecord()
    return
  }
  createClassificationId.value =
    filterClassificationId.value ||
    (props.classificationOptions.length === 1 ? String(props.classificationOptions[0].id) : '')
  showCreateModal.value = true
}

async function createRecord() {
  if (creating.value) return
  const documentClassificationId = props.aggregate
    ? Number(createClassificationId.value)
    : props.documentClassificationId
  if (!props.constructionId || !documentClassificationId) {
    toastService.error('請先選擇施工項目')
    return
  }
  creating.value = true
  try {
    const created = await selfCheckInspectionApi.create(props.constructionId, props.ownerType, {
      documentClassificationId,
      standardKind: activeTab.value,
      inspectionDate: new Date().toISOString().slice(0, 10)
    })
    showCreateModal.value = false
    openRecord(created.id)
  } catch (error: unknown) {
    console.error(error)
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      (error as Error)?.message ??
      '建立紀錄失敗'
    toastService.error(message)
  } finally {
    creating.value = false
  }
}

function openRecord(recordId: number) {
  void router.push({
    path: `${props.basePath}/records/${recordId}`,
    query:
      props.aggregate && filterClassificationId.value
        ? { classificationId: filterClassificationId.value }
        : undefined
  })
}

async function exportRecord(record: SelfCheckInspectionRecord) {
  if (!props.constructionId || exportingId.value != null) return
  exportingId.value = record.id
  try {
    await selfCheckInspectionApi.export(props.constructionId, record.id, props.ownerType)
    toastService.success('已匯出')
  } catch (error: unknown) {
    console.error(error)
    const message = (error as Error)?.message ?? '匯出失敗'
    toastService.error(message.includes('樣板') ? message : '匯出失敗')
  } finally {
    exportingId.value = null
  }
}

async function removeRecord(record: SelfCheckInspectionRecord) {
  const name = record.subdivisionProjectName || record.title || formatDate(record.inspectionDate)
  if (!confirm(`確定要刪除「${name}」？`)) return
  try {
    await selfCheckInspectionApi.delete(props.constructionId, record.id, props.ownerType)
    await loadRecords()
  } catch (error) {
    console.error(error)
    toastService.error('刪除失敗')
  }
}

watch(
  () => [
    props.constructionId,
    props.documentClassificationId,
    props.ownerType,
    props.aggregate
  ] as const,
  () => { void loadRecords() },
  { immediate: true }
)

watch(
  () => props.defaultStandardKind,
  (kind) => {
    if (activeTab.value === kind) return
    activeTab.value = kind
    void loadRecords()
  }
)

watch(
  () => props.initialDocumentClassificationId,
  (id) => {
    filterClassificationId.value = id ? String(id) : ''
  }
)

defineExpose({ reload: loadRecords })
</script>

<style scoped>
.self-check-list {
  color: var(--bs-body-color);
}

.inspection-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.4rem 1.5rem;
  border: 1px solid rgba(var(--bs-primary-rgb), 0.34);
  border-radius: 0.85rem;
  background:
    radial-gradient(circle at 88% 0%, rgba(var(--bs-primary-rgb), 0.2), transparent 34%),
    linear-gradient(135deg, rgba(18, 31, 49, 0.98), rgba(12, 22, 36, 0.98));
}

.inspection-hero__eyebrow {
  color: var(--bs-info);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.inspection-hero__title {
  margin: 0.35rem 0;
  font-size: clamp(1.4rem, 2vw, 2rem);
  font-weight: 800;
}

.inspection-hero__description {
  margin: 0;
  color: var(--bs-secondary-color);
}

.inspection-hero__metric {
  min-width: 92px;
  text-align: center;
}

.inspection-hero__metric strong,
.inspection-hero__metric span {
  display: block;
}

.inspection-hero__metric strong {
  color: var(--bs-info);
  font-size: 2rem;
  line-height: 1;
}

.inspection-hero__metric span {
  margin-top: 0.35rem;
  color: var(--bs-secondary-color);
  font-size: 0.8rem;
}

.inspection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 1rem 0;
}

.inspection-tabs {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.65rem;
  background: rgba(8, 16, 28, 0.72);
}

.inspection-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.52rem 0.85rem;
  border: 0;
  border-radius: 0.45rem;
  color: var(--bs-secondary-color);
  background: transparent;
  font-weight: 700;
}

.inspection-tab.active {
  color: #fff;
  background: var(--bs-primary);
  box-shadow: 0 0.35rem 1rem rgba(var(--bs-primary-rgb), 0.25);
}

.inspection-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.inspection-select {
  min-width: 230px;
}

.inspection-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.75rem;
  background: rgba(10, 19, 32, 0.84);
}

.inspection-table {
  min-width: 850px;
}

.inspection-table th {
  padding: 0.8rem 0.9rem;
  border-bottom-color: var(--bs-border-color);
  color: var(--bs-secondary-color);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.inspection-table td {
  padding: 0.85rem 0.9rem;
}

.inspection-table__index {
  width: 54px;
}

.inspection-row {
  cursor: pointer;
}

.inspection-row:hover td {
  background: rgba(var(--bs-primary-rgb), 0.08);
}

.inspection-project-tag {
  display: inline-block;
  max-width: 260px;
  overflow: hidden;
  padding: 0.25rem 0.55rem;
  border: 1px solid rgba(var(--bs-info-rgb), 0.3);
  border-radius: 999px;
  color: var(--bs-info);
  background: rgba(var(--bs-info-rgb), 0.09);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspection-state {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  min-height: 180px;
  border: 1px dashed var(--bs-border-color);
  border-radius: 0.75rem;
  color: var(--bs-secondary-color);
  background: rgba(10, 19, 32, 0.52);
}

.inspection-state > i {
  font-size: 1.75rem;
  color: var(--bs-info);
}

@media (max-width: 767.98px) {
  .inspection-hero,
  .inspection-toolbar,
  .inspection-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .inspection-hero__metric {
    text-align: left;
  }

  .inspection-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .inspection-tab {
    justify-content: center;
  }

  .inspection-select {
    min-width: 0;
  }
}
</style>
