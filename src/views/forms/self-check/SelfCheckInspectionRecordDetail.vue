<template>
  <div class="self-check-record-detail-page a4-dark">
    <PageHeader :title="pageTitle" icon="fa fa-clipboard-check" :breadcrumbs="breadcrumbs" />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先於左側選擇工程案。
    </div>

    <div v-else-if="loading" class="text-center py-5 text-muted">
      <i class="fa fa-spinner fa-spin me-2"></i>載入中…
    </div>

    <div v-else-if="loadError" class="alert alert-danger">{{ loadError }}</div>

    <template v-else-if="record">
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="goBack">
          <i class="fa fa-arrow-left me-1"></i>返回紀錄列表
        </button>
        <span class="badge bg-secondary">{{ recordKindLabel }}</span>
        <div class="flex-grow-1"></div>
        <span v-if="saving" class="text-muted small">
          <i class="fa fa-spinner fa-spin me-1"></i>儲存中…
        </span>
        <FormExportWordButton :loading="exporting" @click="onExport" />
      </div>

      <Card class="mb-3 report-card">
        <CardBody class="report-card__body" data-bs-theme="dark">
          <h5 class="fw-bold mb-3">紀錄資訊</h5>
          <div class="row g-3 record-info-fields">
            <div class="col-12">
              <label class="form-label small text-muted mb-1">分項工程名稱</label>
              <input
                v-model="form.subdivisionProjectName"
                type="text"
                class="form-control form-control-sm record-field-control"
                placeholder="分項工程名稱"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label small text-muted mb-1">{{ inspectionNoun }}位置</label>
              <input
                v-model="form.inspectionLocation"
                type="text"
                class="form-control form-control-sm record-field-control"
                :placeholder="`${inspectionNoun}位置`"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label small text-muted mb-1">{{ inspectionNoun }}日期</label>
              <RepublicDatePicker
                v-model="form.inspectionDate"
                input-class="form-control form-control-sm record-field-control record-date-input"
                :use-republic-year="true"
              />
            </div>
            <div class="col-12">
              <label class="form-label small text-muted mb-1">{{ inspectionNoun }}時機</label>
              <div class="d-flex flex-wrap gap-3">
                <label
                  v-for="opt in inspectionTimingOptions"
                  :key="opt.value"
                  class="form-check form-check-inline mb-0"
                >
                  <input
                    v-model="form.inspectionTimings"
                    class="form-check-input"
                    type="checkbox"
                    :value="opt.value"
                  />
                  <span class="form-check-label">{{ opt.label }}</span>
                </label>
              </div>
            </div>
            <div class="col-12">
              <label class="form-label small text-muted mb-1">施工流程</label>
              <div class="d-flex flex-wrap gap-3">
                <label
                  v-for="opt in constructionProcessOptions"
                  :key="opt.value"
                  class="form-check form-check-inline mb-0"
                >
                  <input
                    v-model="form.constructionProcesses"
                    class="form-check-input"
                    type="checkbox"
                    :value="opt.value"
                  />
                  <span class="form-check-label">{{ opt.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card class="report-card report-card--full">
        <CardBody class="report-card__body" data-bs-theme="dark">
          <SelfCheckInspectionItemsTable
            :title="itemsTableTitle"
            :description="itemsTableDescription"
            :empty-text="itemsTableEmptyText"
            :items="form.items"
            :inspection-label="inspectionNoun"
            @change="scheduleAutoSave"
          />
        </CardBody>
      </Card>

      <Card class="report-card report-card--full mt-3">
        <CardBody class="report-card__body" data-bs-theme="dark">
          <SelfCheckInspectionSignPanel
            v-if="recordId"
            :construction-id="constructionId"
            :record-id="recordId"
            :owner-type="ownerType"
            :record="record"
            @signed="onSigned"
          />
        </CardBody>
      </Card>

      <Card v-if="recordId" class="report-card report-card--full mt-3">
        <CardBody class="report-card__body" data-bs-theme="dark">
          <SelfCheckInspectionPhotosPanel
            :construction-id="constructionId"
            :record-id="recordId"
            :owner-type="ownerType"
            :record-items="form.items"
            :default-date="form.inspectionDate"
            :default-location="form.inspectionLocation"
          />
        </CardBody>
      </Card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import FormExportWordButton from '@/components/common/FormExportWordButton.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  selfCheckInspectionApi,
  type SelfCheckConstructionProcess,
  type SelfCheckInspectionRecord,
  type SelfCheckInspectionTiming,
  type SelfCheckOwnerType
} from '@/api/selfCheckInspection'
import { documentClassificationApi } from '@/api/documentClassification'
import { contractorDocumentClassificationApi } from '@/api/contractorDocumentClassification'
import SelfCheckInspectionItemsTable, {
  type SelfCheckFormItem
} from '@/components/self-check/SelfCheckInspectionItemsTable.vue'
import SelfCheckInspectionPhotosPanel from '@/components/self-check/SelfCheckInspectionPhotosPanel.vue'
import SelfCheckInspectionSignPanel from '@/components/self-check/SelfCheckInspectionSignPanel.vue'

const props = defineProps<{
  ownerType: SelfCheckOwnerType
  category: string
  sourceCategory?: string
  listPath?: string
}>()

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const instance = getCurrentInstance()
const proxy = instance?.proxy as { $toast?: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void } } | undefined

const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const itemId = computed(() => {
  const v = route.params.itemId
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isFinite(n) && n > 0 ? n : null
})
const recordId = computed(() => {
  const v = route.params.recordId
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isFinite(n) && n > 0 ? n : null
})

const loading = ref(true)
const saving = ref(false)
const exporting = ref(false)
const loadError = ref('')
const isHydrating = ref(false)
const record = ref<SelfCheckInspectionRecord | null>(null)
const docTitle = ref('自主檢查表')

const AUTO_SAVE_DELAY_MS = 600
let saveTimer: ReturnType<typeof setTimeout> | null = null
let lastSavedSnapshot = ''

const form = reactive({
  inspectionDate: '',
  subdivisionProjectName: '',
  inspectionLocation: '',
  inspectionTimings: [] as SelfCheckInspectionTiming[],
  constructionProcesses: [] as SelfCheckConstructionProcess[],
  items: [] as SelfCheckFormItem[]
})

const isContractor = computed(() => props.ownerType === 'CONTRACTOR')
const inspectionNoun = computed(() => isContractor.value ? '自主檢查' : '抽查')

const inspectionTimingOptions = computed<Array<{ value: SelfCheckInspectionTiming; label: string }>>(() => [
  { value: 'INSPECTION_STOP', label: '檢驗停留點★' },
  { value: 'SAFETY_INSPECTION', label: '安衛查驗點※' },
  { value: 'IRREGULAR', label: isContractor.value ? '不定期自主檢查' : '不定期抽查' }
])

const constructionProcessOptions: Array<{ value: SelfCheckConstructionProcess; label: string }> = [
  { value: 'BEFORE', label: '施工前' },
  { value: 'DURING', label: '施工中檢查' },
  { value: 'AFTER', label: '施工完成檢查' }
]

const recordKindLabel = computed(() =>
  record.value?.standardKind === 'SAFETY'
    ? `安全衛生${inspectionNoun.value}`
    : `施工${inspectionNoun.value}`
)

const itemsTableTitle = computed(() =>
  record.value?.standardKind === 'SAFETY'
    ? `安全衛生${inspectionNoun.value}項目`
    : `施工${inspectionNoun.value}項目`
)

const itemsTableDescription = computed(() =>
  record.value?.standardKind === 'SAFETY'
    ? `建立紀錄時自「安全衛生${inspectionNoun.value}標準」快照；請填寫實際${inspectionNoun.value}情形與結果，可按「複製${inspectionNoun.value}標準」帶入；關閉「匯出」開關的項目將灰階顯示且不納入 Word 匯出。`
    : `建立紀錄時自「施工${inspectionNoun.value}標準」快照；請填寫實際${inspectionNoun.value}情形與結果，可按「複製${inspectionNoun.value}標準」帶入；關閉「匯出」開關的項目將灰階顯示且不納入 Word 匯出。`
)

const itemsTableEmptyText = computed(() =>
  record.value?.standardKind === 'SAFETY'
    ? `尚無安全衛生${inspectionNoun.value}項目（請先於施工項目／分項工程維護安衛${inspectionNoun.value}標準）`
    : `尚無施工${inspectionNoun.value}項目（請先於施工項目／分項工程維護施工${inspectionNoun.value}標準）`
)

const listBasePath = computed(() => {
  if (props.listPath) {
    const raw = Array.isArray(route.query.classificationId)
      ? route.query.classificationId[0]
      : route.query.classificationId
    return raw
      ? `${props.listPath}?classificationId=${encodeURIComponent(String(raw))}`
      : props.listPath
  }
  const prefix = props.ownerType === 'SUPERVISORY' ? '/supervisory' : '/contractor'
  return `${prefix}/forms/doc-class/${props.category}/${itemId.value}`
})

const pageTitle = computed(
  () => form.subdivisionProjectName || record.value?.subdivisionProjectName || record.value?.title || docTitle.value
)

const breadcrumbs = computed(() => [
  { text: '表單生成與管理', href: 'javascript:;' },
  {
    text: `${props.category}類表單`,
    href: 'javascript:;'
  },
  {
    text: docTitle.value,
    href: listBasePath.value
  },
  { text: `${recordKindLabel.value}明細`, active: true as const }
])

function goBack() {
  void (async () => {
    await flushAutoSave()
    void router.push(listBasePath.value)
  })()
}

function applyRecord(r: SelfCheckInspectionRecord) {
  isHydrating.value = true
  record.value = r
  form.inspectionDate = r.inspectionDate?.slice(0, 10) ?? ''
  form.subdivisionProjectName = r.subdivisionProjectName ?? r.title ?? ''
  form.inspectionLocation = r.inspectionLocation ?? ''
  form.inspectionTimings = [...(r.inspectionTimings ?? [])]
  form.constructionProcesses = [...(r.constructionProcesses ?? [])]
  form.items = (r.items ?? []).map((it) => ({
    id: it.id,
    workProcess: it.workProcess,
    workProcessDetail: it.workProcessDetail,
    manageProject: it.manageProject,
    checkPoint: it.checkPoint,
    checkStandard: it.checkStandard,
    actualSituation: it.actualSituation?.trim() ?? '',
    inspectionResult: it.inspectionResult?.trim() || '合格',
    exportEnabled: it.exportEnabled !== false
  }))
  lastSavedSnapshot = buildFormSnapshot()
  void nextTick(() => {
    isHydrating.value = false
  })
}

function onSigned(updated: SelfCheckInspectionRecord) {
  record.value = updated
  proxy?.$toast?.success?.('簽署成功')
}

function buildFormSnapshot(): string {
  return JSON.stringify({
    inspectionDate: form.inspectionDate,
    subdivisionProjectName: form.subdivisionProjectName,
    inspectionLocation: form.inspectionLocation,
    inspectionTimings: [...form.inspectionTimings].sort(),
    constructionProcesses: [...form.constructionProcesses].sort(),
    items: form.items.map((it) => ({
      id: it.id,
      actualSituation: it.actualSituation,
      inspectionResult: it.inspectionResult,
      exportEnabled: it.exportEnabled
    }))
  })
}

function clearSaveTimer() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
}

function scheduleAutoSave() {
  if (isHydrating.value || loading.value) return
  clearSaveTimer()
  saveTimer = setTimeout(() => {
    saveTimer = null
    void persistRecord()
  }, AUTO_SAVE_DELAY_MS)
}

async function flushAutoSave(): Promise<void> {
  clearSaveTimer()
  await persistRecord()
}

async function persistRecord() {
  const cid = constructionId.value
  const rid = recordId.value
  if (!cid || !rid || isHydrating.value || loading.value) return
  if (buildFormSnapshot() === lastSavedSnapshot) return

  saving.value = true
  try {
    const updated = await selfCheckInspectionApi.update(cid, rid, props.ownerType, {
      inspectionDate: form.inspectionDate || null,
      subdivisionProjectName: form.subdivisionProjectName || null,
      inspectionLocation: form.inspectionLocation || null,
      inspectionTimings: form.inspectionTimings,
      constructionProcesses: form.constructionProcesses,
      items: form.items.map((it) => ({
        id: it.id,
        actualSituation: it.actualSituation || null,
        inspectionResult: it.inspectionResult || '合格',
        exportEnabled: it.exportEnabled
      }))
    })
    record.value = updated
    lastSavedSnapshot = buildFormSnapshot()
  } catch (e) {
    console.error(e)
    proxy?.$toast?.error('儲存失敗')
  } finally {
    saving.value = false
  }
}

async function loadDocTitle() {
  const cid = constructionId.value
  const id = itemId.value ?? record.value?.documentClassificationId
  if (!cid || !id) return
  try {
    if (props.ownerType === 'SUPERVISORY') {
      const items = await documentClassificationApi.getAll(cid, null, { skipAuthRedirectOn401: true })
      const row = items.find((i) => i.id === id)
      if (row) docTitle.value = row.documentName
    } else {
      const items = await contractorDocumentClassificationApi.getAll(cid, null)
      const row = items.find((i) => i.id === id)
      if (row) docTitle.value = row.documentName
    }
  } catch {
    /* ignore */
  }
}

async function loadRecord() {
  const cid = constructionId.value
  const rid = recordId.value
  if (!cid || !rid) {
    loadError.value = '參數不完整'
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = ''
  clearSaveTimer()
  try {
    const r = await selfCheckInspectionApi.get(cid, rid, props.ownerType)
    applyRecord(r)
  } catch (e: unknown) {
    console.error(e)
    loadError.value =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '載入失敗'
  } finally {
    loading.value = false
  }
}

async function onExport() {
  const cid = constructionId.value
  const rid = recordId.value
  if (!cid || !rid) return
  exporting.value = true
  try {
    await flushAutoSave()
    await selfCheckInspectionApi.export(cid, rid, props.ownerType)
    proxy?.$toast?.success('已匯出')
  } catch (e: unknown) {
    console.error(e)
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      (e as Error)?.message ??
      '匯出失敗'
    proxy?.$toast?.error(msg.includes('樣板') ? msg : '匯出失敗')
  } finally {
    exporting.value = false
  }
}

watch([constructionId, recordId], () => { void loadRecord() }, { immediate: true })

watch(
  () => record.value?.documentClassificationId,
  () => { void loadDocTitle() }
)

watch(
  () => ({
    inspectionDate: form.inspectionDate,
    subdivisionProjectName: form.subdivisionProjectName,
    inspectionLocation: form.inspectionLocation,
    inspectionTimings: form.inspectionTimings,
    constructionProcesses: form.constructionProcesses,
    items: form.items
  }),
  () => scheduleAutoSave(),
  { deep: true }
)

onMounted(() => { void loadDocTitle() })
onUnmounted(() => clearSaveTimer())
</script>

<style scoped>
.self-check-record-detail-page {
  padding: 1rem;
}

/* 與 RepublicDatePicker（35px）等高 */
.record-info-fields :deep(.record-field-control.form-control) {
  min-height: 35px;
  height: 35px;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  line-height: 1.25;
}

.record-info-fields :deep(.republic-date-picker .dp__main) {
  height: 35px !important;
  min-height: 35px !important;
}

.record-info-fields :deep(.record-date-input .dp__input) {
  text-align: left !important;
  padding-left: 2rem !important;
  padding-right: 0.75rem !important;
}
</style>
