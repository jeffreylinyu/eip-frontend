<template>
  <div class="coordination-editor-page">
    <PageHeader :title="pageTitle" icon="fa fa-people-arrows" :breadcrumbs="breadcrumbs" />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程專案
    </div>
    <div v-else-if="loading" class="editor-loading">
      <i class="fa fa-spinner fa-spin fa-2x"></i>
    </div>

    <template v-else>
      <Card class="mb-3 coordination-shell">
        <CardBody>
          <div class="editor-toolbar">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <button type="button" class="win-btn win-btn--sm" @click="goBack">
                <i class="fa fa-arrow-left me-1"></i>返回列表
              </button>
              <strong><i class="fa fa-handshake me-2 text-warning"></i>{{ perspectiveLabel }}作業表單</strong>
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <button type="button" class="win-btn" @click="showSubmissionModal = true">
                <i class="fa fa-clipboard-list me-1"></i>送審紀錄
              </button>
              <button type="button" class="win-btn win-btn-accent" :disabled="saving" @click="save">
                <i :class="saving ? 'fa fa-spinner fa-spin' : 'fa fa-floppy-disk'" class="me-1"></i>
                {{ saving ? '儲存中' : '儲存' }}
              </button>
              <FormExportWordButton :loading="exporting" @click="exportWord" />
            </div>
          </div>
          <div class="row g-3 mt-1">
            <div class="col-12 col-lg-8">
              <label class="form-label">紀錄名稱</label>
              <input v-model="form.title" class="form-control" maxlength="255" />
            </div>
            <div class="col-12 col-lg-4">
              <label class="form-label">會議日期</label>
              <input v-model="form.meetingData.meetingDate" type="date" class="form-control" />
            </div>
          </div>
        </CardBody>
      </Card>

      <nav class="section-nav mb-3">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          class="section-tab"
          :class="{ active: activeSection === section.key }"
          @click="activeSection = section.key"
        >
          <i :class="section.icon"></i>{{ section.label }}
        </button>
      </nav>

      <section v-show="activeSection === 'basic'" class="section-stack">
        <article class="section-card">
          <header><i class="fa fa-building me-2 text-warning"></i>會議基本資料</header>
          <div class="section-body">
            <div class="row g-3">
              <div class="col-12"><label class="form-label">工程名稱</label><input v-model="form.meetingData.projectName" class="form-control" /></div>
              <div class="col-12 col-lg-6"><label class="form-label">會議標題</label><input v-model="form.meetingData.meetingTitle" class="form-control" /></div>
              <div class="col-12 col-lg-3"><label class="form-label">期別／次數</label><input v-model="form.meetingData.meetingPeriod" class="form-control" placeholder="例如：8月份、第3次" /></div>
              <div class="col-12 col-lg-3"><label class="form-label">會議時間</label><input v-model="form.meetingData.meetingTime" class="form-control" placeholder="例如：上午10時整" /></div>
              <div class="col-12 col-lg-6"><label class="form-label">地點</label><input v-model="form.meetingData.location" class="form-control" /></div>
              <div class="col-12 col-lg-3"><label class="form-label">主席</label><input v-model="form.meetingData.chairperson" class="form-control" /></div>
              <div class="col-12 col-lg-3"><label class="form-label">紀錄</label><input v-model="form.meetingData.recorder" class="form-control" /></div>
              <div class="col-12 col-lg-4"><label class="form-label">主辦機關</label><input v-model="form.meetingData.hostAgency" class="form-control" /></div>
              <div class="col-12 col-lg-4"><label class="form-label">監造單位</label><input v-model="form.meetingData.supervisionUnit" class="form-control" /></div>
              <div class="col-12 col-lg-4"><label class="form-label">施工單位</label><input v-model="form.meetingData.contractorUnit" class="form-control" /></div>
            </div>
          </div>
        </article>

        <EditableTable
          title="出席人員"
          :headers="['單位', '姓名', '職稱']"
          :fields="['unit', 'name', 'title']"
          :rows="form.meetingData.attendeeRows"
          @add="form.meetingData.attendeeRows.push({ unit: '', name: '', title: '' })"
          @remove="form.meetingData.attendeeRows.splice($event, 1)"
        />
      </section>

      <section v-show="activeSection === 'progress'" class="section-stack">
        <article class="section-card">
          <header><i class="fa fa-chart-line me-2 text-warning"></i>報告事項與工程進度</header>
          <div class="section-body">
            <div class="row g-3">
              <div class="col-12 col-md-4"><label class="form-label">本期預定完成進度（%）</label><input v-model="form.meetingData.plannedPeriodProgress" class="form-control" /></div>
              <div class="col-12 col-md-4"><label class="form-label">預定完成總進度（%）</label><input v-model="form.meetingData.plannedTotalProgress" class="form-control" /></div>
              <div class="col-12 col-md-4"><label class="form-label">實際完成總進度（%）</label><input v-model="form.meetingData.actualTotalProgress" class="form-control" /></div>
              <div class="col-12 col-md-4"><label class="form-label">進度狀態</label><select v-model="form.meetingData.progressStatus" class="form-select"><option value="">請選擇</option><option>超前</option><option>落後</option><option>符合</option></select></div>
              <div class="col-12 col-md-4"><label class="form-label">進度差異（%）</label><input v-model="form.meetingData.progressVariance" class="form-control" /></div>
              <div class="col-12"><label class="form-label">進度說明</label><textarea v-model="form.meetingData.progressExplanation" class="form-control" rows="4"></textarea></div>
              <div class="col-12"><label class="form-label">現場工進</label><textarea v-model="form.meetingData.currentWork" class="form-control" rows="4"></textarea></div>
              <div class="col-12"><label class="form-label">現場工程施作進度補充</label><textarea v-model="form.meetingData.constructionProgressNote" class="form-control" rows="4"></textarea></div>
            </div>
          </div>
        </article>

        <EditableTable
          title="作業區域施工進度"
          :headers="['位置', '天花板', '空調設備', '進場日期', '完工日期']"
          :fields="['location', 'ceilingStatus', 'hvacStatus', 'startDate', 'completionDate']"
          :rows="form.meetingData.workAreaRows"
          @add="form.meetingData.workAreaRows.push({ location: '', ceilingStatus: '', hvacStatus: '', startDate: '', completionDate: '' })"
          @remove="form.meetingData.workAreaRows.splice($event, 1)"
        />

        <EditableTable
          title="現場實際施作數量說明"
          :headers="['區域', '說明']"
          :fields="['area', 'description']"
          :rows="form.meetingData.quantityRows"
          :textarea-fields="['description']"
          @add="form.meetingData.quantityRows.push({ area: '', description: '' })"
          @remove="form.meetingData.quantityRows.splice($event, 1)"
        />
      </section>

      <section v-show="activeSection === 'control'" class="section-stack">
        <EditableTable
          title="履約管理階段各項文件管控"
          :headers="['管控事項名稱', '提送日期', '備註']"
          :fields="['itemName', 'submissionDate', 'note']"
          :rows="form.meetingData.documentControlRows"
          @add="form.meetingData.documentControlRows.push({ itemName: '', submissionDate: '', note: '' })"
          @remove="form.meetingData.documentControlRows.splice($event, 1)"
        />
        <article class="section-card">
          <header><i class="fa fa-boxes-stacked me-2 text-warning"></i>其他管控事項</header>
          <div class="section-body row g-3">
            <div class="col-12"><label class="form-label">履約文件管控補充</label><textarea v-model="form.meetingData.contractControlNote" class="form-control" rows="4"></textarea></div>
            <div class="col-12"><label class="form-label">設備／材料型錄送審文件管制</label><textarea v-model="form.meetingData.materialEquipmentControl" class="form-control" rows="5"></textarea></div>
            <div class="col-12 col-lg-6"><label class="form-label">下期預定進度</label><textarea v-model="form.meetingData.nextPeriodPlan" class="form-control" rows="5"></textarea></div>
            <div class="col-12 col-lg-6"><label class="form-label">重點監造事項</label><textarea v-model="form.meetingData.keySupervisionItems" class="form-control" rows="5"></textarea></div>
          </div>
        </article>
      </section>

      <section v-show="activeSection === 'followup'" class="section-stack">
        <EditableTable
          title="歷次會議列管事項"
          :headers="['案號', '案由', '辦理情形', '結案與否']"
          :fields="['caseNo', 'subject', 'handlingStatus', 'closedLabel']"
          :rows="form.meetingData.previousMeetingRows"
          :textarea-fields="['subject', 'handlingStatus']"
          @add="form.meetingData.previousMeetingRows.push({ caseNo: '', subject: '', handlingStatus: '', closedLabel: '' })"
          @remove="form.meetingData.previousMeetingRows.splice($event, 1)"
        />
        <article class="section-card">
          <header><i class="fa fa-bullhorn me-2 text-warning"></i>宣導與待辦</header>
          <div class="section-body row g-3">
            <div class="col-12 col-lg-6"><label class="form-label">宣導事項</label><textarea v-model="form.meetingData.announcements" class="form-control" rows="7"></textarea></div>
            <div class="col-12 col-lg-6"><label class="form-label">待辦事項</label><textarea v-model="form.meetingData.pendingItems" class="form-control" rows="7"></textarea></div>
          </div>
        </article>
        <EditableTable
          title="會議結論"
          :headers="['結論內容']"
          :fields="['content']"
          :rows="form.meetingData.conclusionRows"
          :textarea-fields="['content']"
          @add="form.meetingData.conclusionRows.push({ content: '' })"
          @remove="form.meetingData.conclusionRows.splice($event, 1)"
        />
        <article class="section-card">
          <header><i class="fa fa-clock me-2 text-warning"></i>散會</header>
          <div class="section-body">
            <label class="form-label">散會時間</label>
            <input v-model="form.meetingData.adjournmentTime" class="form-control" placeholder="例如：上午12時整" />
          </div>
        </article>
      </section>
    </template>

    <PlanSubmissionPModal
      v-model:show="showSubmissionModal"
      :construction-id="constructionId"
      :plan-type="fixedFormCode"
      :plan-label="pageTitle"
      :context-record-id="recordId"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import FormExportWordButton from '@/components/common/FormExportWordButton.vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import PlanSubmissionPModal from '@/components/forms/PlanSubmissionPModal.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  exportCoordinationMeeting,
  getCoordinationMeeting,
  updateCoordinationMeeting,
  type CoordinationMeetingData,
} from '@/api/coordinationMeetingRecord'

const emptyData = (): CoordinationMeetingData => ({
  projectName: '', meetingTitle: '施工協調會議紀錄', meetingPeriod: '', meetingDate: '',
  meetingTime: '', location: '', chairperson: '', recorder: '', hostAgency: '',
  contractorUnit: '', supervisionUnit: '', plannedPeriodProgress: '', plannedTotalProgress: '',
  actualTotalProgress: '', progressStatus: '', progressVariance: '', progressExplanation: '',
  currentWork: '', contractControlNote: '', materialEquipmentControl: '',
  constructionProgressNote: '', nextPeriodPlan: '', keySupervisionItems: '', announcements: '',
  pendingItems: '', adjournmentTime: '', attendeeRows: [], documentControlRows: [],
  workAreaRows: [], quantityRows: [], previousMeetingRows: [], conclusionRows: [],
})

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const recordId = computed(() => Number(route.params.recordId))
const fixedFormCode = computed(() => String(route.meta.fixedFormCode ?? 'C03'))
const pageTitle = computed(() => `${fixedFormCode.value.replace(/^([CG])0/, '$1-')} 施工協調會紀錄`)
const perspectiveLabel = computed(() => fixedFormCode.value.startsWith('G') ? '營造' : '監造')
const listPath = computed(() =>
  fixedFormCode.value.startsWith('G')
    ? '/forms/g3-construction-coordination-meeting'
    : '/forms/c3-construction-coordination-meeting',
)
const breadcrumbs = computed(() => [
  { text: perspectiveLabel.value === '營造' ? '營造 G 類表單' : '監造 C 類表單', href: 'javascript:;' },
  { text: pageTitle.value, href: listPath.value },
  { text: form.title || '會議紀錄編輯', active: true as const },
])
const sections = [
  { key: 'basic', label: '基本資料', icon: 'fa fa-building' },
  { key: 'progress', label: '進度事項', icon: 'fa fa-chart-line' },
  { key: 'control', label: '文件管控', icon: 'fa fa-list-check' },
  { key: 'followup', label: '列管與結論', icon: 'fa fa-clipboard-check' },
] as const
const activeSection = ref<(typeof sections)[number]['key']>('basic')
const form = reactive({ title: '', meetingData: emptyData() })
const loading = ref(true)
const saving = ref(false)
const exporting = ref(false)
const showSubmissionModal = ref(false)

const EditableTable = defineComponent({
  props: {
    title: { type: String, required: true },
    headers: { type: Array as () => string[], required: true },
    fields: { type: Array as () => string[], required: true },
    rows: { type: Array as () => Record<string, string>[], required: true },
    textareaFields: { type: Array as () => string[], default: () => [] },
  },
  emits: ['add', 'remove'],
  setup(props, { emit }) {
    return () => h('article', { class: 'section-card' }, [
      h('header', [h('i', { class: 'fa fa-table-list me-2 text-warning' }), props.title]),
      h('div', { class: 'section-body' }, [
        h('div', { class: 'table-responsive' }, [
          h('table', { class: 'table meeting-table align-middle' }, [
            h('thead', [h('tr', [
              h('th', { class: 'index-col' }, '#'),
              ...props.headers.map((header) => h('th', header)),
              h('th', { class: 'action-col' }),
            ])]),
            h('tbody', props.rows.map((row, index) => h('tr', { key: index }, [
              h('td', String(index + 1)),
              ...props.fields.map((field) => h('td', [
                props.textareaFields.includes(field)
                  ? h('textarea', { class: 'form-control', rows: 2, value: row[field], onInput: (event: Event) => { row[field] = (event.target as HTMLTextAreaElement).value } })
                  : h('input', { class: 'form-control', value: row[field], onInput: (event: Event) => { row[field] = (event.target as HTMLInputElement).value } }),
              ])),
              h('td', [h('button', { type: 'button', class: 'btn btn-sm btn-outline-danger', title: '刪除', onClick: () => emit('remove', index) }, [h('i', { class: 'fa fa-trash' })])]),
            ]))),
          ]),
        ]),
        h('button', { type: 'button', class: 'win-btn win-btn--sm', onClick: () => emit('add') }, [
          h('i', { class: 'fa fa-plus me-1' }), `新增${props.title}`,
        ]),
      ]),
    ])
  },
})

async function load() {
  if (!constructionId.value || !recordId.value) return
  loading.value = true
  try {
    const record = await getCoordinationMeeting(constructionId.value, recordId.value)
    form.title = record.title
    form.meetingData = { ...emptyData(), ...record.meetingData }
  } catch (error) {
    console.error('[CoordinationMeeting] load failed', error)
    toastService.error('載入施工協調會紀錄失敗')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<boolean> {
  if (!constructionId.value || !recordId.value || saving.value) return false
  saving.value = true
  try {
    const saved = await updateCoordinationMeeting(constructionId.value, recordId.value, {
      title: form.title,
      meetingData: form.meetingData,
    })
    form.title = saved.title
    toastService.success('施工協調會紀錄已儲存')
    return true
  } catch (error) {
    console.error('[CoordinationMeeting] save failed', error)
    toastService.error('儲存施工協調會紀錄失敗')
    return false
  } finally {
    saving.value = false
  }
}

async function exportWord() {
  if (exporting.value) return
  exporting.value = true
  try {
    if (!(await save())) return
    const blob = await exportCoordinationMeeting(constructionId.value, recordId.value)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${form.title.replace(/[\\/:*?"<>|]+/g, '_') || 'Coordination_Meeting_Record'}.docx`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('[CoordinationMeeting] export failed', error)
    toastService.error('匯出 Word 失敗')
  } finally {
    exporting.value = false
  }
}

function goBack() {
  void router.push(listPath.value)
}

onMounted(async () => {
  if (!workspaceStore.currentWorkspace) await workspaceStore.initWorkspaces()
  await load()
})
</script>

<style scoped>
.coordination-editor-page {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1100px 560px at 12% 0%, rgba(var(--bs-primary-rgb), 0.07), transparent 62%),
    rgba(15, 23, 42, 0.1);
}
.editor-loading { display: grid; min-height: 360px; place-items: center; color: var(--bs-secondary-color); }
.coordination-shell,
.coordination-editor-page :deep(.section-card) {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.9));
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.2);
}
.coordination-shell :deep(.card-body) { background: transparent; }
.editor-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.section-nav {
  display: flex;
  gap: 0.5rem;
  padding: 0.55rem;
  overflow-x: auto;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.65rem;
  background: #111827;
}
.section-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.9rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  background: transparent;
}
.section-tab:hover,
.section-tab.active { color: #fff; border-color: rgba(var(--bs-primary-rgb), 0.45); background: rgba(var(--bs-primary-rgb), 0.18); }
.section-stack { display: grid; gap: 1rem; }
.coordination-editor-page :deep(.section-card) { overflow: hidden; border-radius: 0.65rem; }
.coordination-editor-page :deep(.section-card > header) {
  padding: 0.85rem 1rem;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(15, 23, 42, 0.62);
}
.coordination-editor-page :deep(.section-body) { padding: 1.25rem; }
.coordination-editor-page :deep(.meeting-table) {
  min-width: 840px;
  margin-bottom: 0.8rem;
  color: var(--bs-body-color);
  --bs-table-bg: transparent;
  --bs-table-border-color: rgba(255, 255, 255, 0.1);
}
.coordination-editor-page :deep(.meeting-table thead th) { color: #cbd5e1; background: rgba(2, 6, 23, 0.55); }
.coordination-editor-page :deep(.meeting-table .form-control) {
  color: #f8fafc;
  background: rgba(2, 6, 23, 0.68);
  border-color: rgba(255, 255, 255, 0.14);
}
.coordination-editor-page :deep(.index-col) { width: 54px; text-align: center; }
.coordination-editor-page :deep(.action-col) { width: 54px; }
@media (max-width: 767px) {
  .coordination-editor-page { padding: 0.65rem; }
  .coordination-editor-page :deep(.section-body) { padding: 1rem; }
}
</style>
