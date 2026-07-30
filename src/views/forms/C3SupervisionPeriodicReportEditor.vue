<template>
  <div class="c3-editor-page">
    <PageHeader
      title="C-2 施工月報"
      icon="fa fa-calendar-days"
      :breadcrumbs="[
        { text: '監造 C 類表單', href: 'javascript:;' },
        { text: 'C-2 施工月報', href: '/forms/c2-supervision-periodic-report' },
        { text: form.title || '報表編輯', active: true },
      ]"
    />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案件
    </div>
    <div v-else-if="loading" class="c3-loading">
      <i class="fa fa-spinner fa-spin fa-2x"></i>
    </div>

    <template v-else>
      <Card class="mb-3 report-card report-card--full c3-shell">
        <CardBody>
          <div class="b2-content-toolbar c3-toolbar">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <button type="button" class="win-btn win-btn--sm" @click="goBack">
                <i class="fa fa-arrow-left me-1"></i>返回列表
              </button>
              <strong><i class="fa fa-calendar-check me-2 text-warning"></i>監造工作報表</strong>
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
              <label class="form-label">版本名稱</label>
              <input v-model="form.title" class="form-control" maxlength="255" />
            </div>
            <div class="col-12 col-lg-4">
              <label class="form-label">報告期間</label>
              <input v-model="form.reportData.reportPeriod" class="form-control" placeholder="例如：民國113年5月1日至5月15日" />
            </div>
          </div>
        </CardBody>
      </Card>

      <nav class="c3-section-nav mb-3">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          class="c3-section-tab"
          :class="{ active: activeSection === section.key }"
          @click="activeSection = section.key"
        >
          <i :class="section.icon"></i>{{ section.label }}
        </button>
      </nav>

      <section v-show="activeSection === 'basic'" class="c3-section-stack">
        <SectionCard title="封面與工程概要" icon="fa fa-building">
          <div class="row g-3">
            <FieldInput v-model="form.reportData.hostAgency" label="主辦機關" class="col-12 col-lg-6" />
            <FieldInput v-model="form.reportData.projectName" label="工程名稱" class="col-12 col-lg-6" />
            <FieldInput v-model="form.reportData.serviceName" label="監造技術服務名稱" class="col-12 col-lg-6" />
            <FieldInput v-model="form.reportData.reportTitle" label="報表標題" class="col-12 col-lg-3" />
            <FieldInput v-model="form.reportData.issueDate" label="製表日期" type="date" class="col-12 col-lg-3" />
            <FieldInput v-model="form.reportData.supervisionUnit" label="監造單位" class="col-12 col-lg-6" />
            <FieldInput v-model="form.reportData.responsiblePerson" label="負責人" class="col-12 col-lg-6" />
            <FieldInput v-model="form.reportData.designUnit" label="設計單位" class="col-12 col-lg-4" />
            <FieldInput v-model="form.reportData.contractorUnit" label="施工單位" class="col-12 col-lg-4" />
            <FieldInput v-model="form.reportData.projectScope" label="工程範圍" class="col-12 col-lg-4" />
            <FieldInput v-model="form.reportData.constructionPeriod" label="施工期程" class="col-12" />
          </div>
        </SectionCard>

        <SectionCard title="工程紀要" icon="fa fa-list-check">
          <div class="table-responsive">
            <table class="table c3-table align-middle">
              <thead><tr><th class="index-col">#</th><th>分類</th><th>工程紀要</th><th class="action-col"></th></tr></thead>
              <tbody>
                <tr v-for="(row, index) in form.reportData.c3SummaryRows" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td><input v-model="row.category" class="form-control" placeholder="例如：基樁工程" /></td>
                  <td><textarea v-model="row.description" class="form-control" rows="2"></textarea></td>
                  <td><RemoveButton @click="form.reportData.c3SummaryRows.splice(index, 1)" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <AddButton label="新增工程紀要" @click="form.reportData.c3SummaryRows.push({ category: '', description: '' })" />
        </SectionCard>
      </section>

      <section v-show="activeSection === 'quality'" class="c3-section-stack">
        <SectionCard title="工程進度" icon="fa fa-chart-line">
          <div class="row g-3">
            <FieldInput v-model="form.reportData.plannedProgress" label="本期預定進度（％）" class="col-12 col-md-6" />
            <FieldInput v-model="form.reportData.actualProgress" label="本期實際進度（％）" class="col-12 col-md-6" />
            <FieldTextarea v-model="form.reportData.delayReason" label="落後原因" class="col-12 col-lg-6" />
            <FieldTextarea v-model="form.reportData.recoveryPlan" label="落後處理方案" class="col-12 col-lg-6" />
            <FieldTextarea v-model="form.reportData.monthlyAchievements" label="本期完成成果" class="col-12" />
          </div>
        </SectionCard>

        <InspectionTable
          v-model="form.reportData.c3ConstructionInspectionRows"
          title="施工查驗紀要"
          add-label="新增施工查驗"
        />
        <InspectionTable
          v-model="form.reportData.c3MaterialInspectionRows"
          title="材料抽驗狀況紀要"
          add-label="新增材料抽驗"
        />
      </section>

      <section v-show="activeSection === 'staff'" class="c3-section-stack">
        <SectionCard title="監造人員工作時數" icon="fa fa-user-clock">
          <div class="table-responsive">
            <table class="table c3-table align-middle">
              <thead>
                <tr><th class="index-col">#</th><th>本案職務</th><th>姓名</th><th>工作時數</th><th>備註</th><th class="action-col"></th></tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in form.reportData.c3StaffRows" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td><input v-model="row.role" class="form-control" /></td>
                  <td><input v-model="row.name" class="form-control" /></td>
                  <td><input v-model="row.hours" class="form-control" inputmode="decimal" /></td>
                  <td><input v-model="row.note" class="form-control" /></td>
                  <td><RemoveButton @click="form.reportData.c3StaffRows.splice(index, 1)" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <AddButton
            label="新增監造人員"
            @click="form.reportData.c3StaffRows.push({ role: '', name: '', hours: '', note: '' })"
          />
        </SectionCard>
      </section>

      <section v-show="activeSection === 'documents'" class="c3-section-stack">
        <DocumentTable
          v-model="form.reportData.c3OutgoingDocumentRows"
          title="文件控制表－發文"
          unit-label="受文單位"
          add-label="新增發文"
        />
        <DocumentTable
          v-model="form.reportData.c3IncomingDocumentRows"
          title="文件控制表－收文"
          unit-label="發文單位"
          add-label="新增收文"
        />
      </section>

      <section v-show="activeSection === 'risks'" class="c3-section-stack">
        <SectionCard title="異常狀況及因應對策" icon="fa fa-triangle-exclamation">
          <div class="table-responsive">
            <table class="table c3-table align-middle">
              <thead><tr><th class="index-col">#</th><th>日期</th><th>處理情形說明</th><th>備註</th><th class="action-col"></th></tr></thead>
              <tbody>
                <tr v-for="(row, index) in form.reportData.c3RiskRows" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td><input v-model="row.eventDate" class="form-control" /></td>
                  <td><textarea v-model="row.description" class="form-control" rows="2"></textarea></td>
                  <td><input v-model="row.note" class="form-control" /></td>
                  <td><RemoveButton @click="form.reportData.c3RiskRows.splice(index, 1)" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <AddButton
            label="新增異常狀況"
            @click="form.reportData.c3RiskRows.push({ eventDate: '', description: '', note: '' })"
          />
        </SectionCard>
      </section>
    </template>

    <PlanSubmissionPModal
      v-model:show="showSubmissionModal"
      :construction-id="constructionId"
      plan-type="C02"
      plan-label="C-2 施工月報"
      :context-record-id="recordId"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import FormExportWordButton from '@/components/common/FormExportWordButton.vue'
import PlanSubmissionPModal from '@/components/forms/PlanSubmissionPModal.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  exportC3Report,
  getC3Report,
  updateC3Report,
  type C3DocumentRow,
  type C3InspectionRow,
  type C3ReportData,
} from '@/api/c3SupervisionPeriodicReport'

const emptyData = (): C3ReportData => ({
  hostAgency: '',
  projectName: '',
  serviceName: '',
  reportTitle: '施工月報',
  reportPeriod: '',
  issueDate: '',
  supervisionUnit: '',
  responsiblePerson: '',
  designUnit: '',
  contractorUnit: '',
  projectScope: '',
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
})

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const recordId = computed(() => Number(route.params.recordId))
const form = reactive({ title: '', reportData: emptyData() })
const loading = ref(true)
const saving = ref(false)
const exporting = ref(false)
const showSubmissionModal = ref(false)
const activeSection = ref<'basic' | 'quality' | 'staff' | 'documents' | 'risks'>('basic')
const sections = [
  { key: 'basic', label: '工程概要', icon: 'fa fa-building' },
  { key: 'quality', label: '進度與品管', icon: 'fa fa-chart-line' },
  { key: 'staff', label: '人員時數', icon: 'fa fa-user-clock' },
  { key: 'documents', label: '往來文件', icon: 'fa fa-envelope-open-text' },
  { key: 'risks', label: '異常對策', icon: 'fa fa-triangle-exclamation' },
] as const

const load = async () => {
  if (!constructionId.value || !recordId.value) return
  loading.value = true
  try {
    const record = await getC3Report(constructionId.value, recordId.value)
    form.title = record.title
    form.reportData = { ...emptyData(), ...record.reportData }
  } catch (error) {
    console.error('[C3] load failed', error)
    toastService.error('載入 C-2 報表失敗')
  } finally {
    loading.value = false
  }
}

const save = async (): Promise<boolean> => {
  if (!constructionId.value || !recordId.value || saving.value) return false
  saving.value = true
  try {
    const saved = await updateC3Report(constructionId.value, recordId.value, {
      title: form.title,
      reportData: form.reportData,
    })
    form.title = saved.title
    toastService.success('C-2 報表已儲存')
    return true
  } catch (error) {
    console.error('[C3] save failed', error)
    toastService.error('儲存 C-2 報表失敗')
    return false
  } finally {
    saving.value = false
  }
}

const exportWord = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    if (!(await save())) return
    const blob = await exportC3Report(constructionId.value, recordId.value)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${form.title.replace(/[\\/:*?"<>|]+/g, '_') || 'C-2_Supervision_Monthly_Report'}.docx`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('[C3] export failed', error)
    toastService.error('匯出 C-2 Word 失敗')
  } finally {
    exporting.value = false
  }
}

const goBack = () => router.push('/forms/c2-supervision-periodic-report')

const SectionCard = defineComponent({
  props: { title: { type: String, required: true }, icon: { type: String, required: true } },
  setup(props, { slots }) {
    return () => h('article', { class: 'c3-section-card' }, [
      h('header', { class: 'c3-section-card__header' }, [
        h('i', { class: `${props.icon} me-2 text-warning` }),
        props.title,
      ]),
      h('div', { class: 'c3-section-card__body' }, slots.default?.()),
    ])
  },
})

const FieldInput = defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, required: true },
    type: { type: String, default: 'text' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, attrs }) {
    return () => h('div', attrs, [
      h('label', { class: 'form-label' }, props.label),
      h('input', {
        class: 'form-control',
        type: props.type,
        value: props.modelValue,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
      }),
    ])
  },
})

const FieldTextarea = defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, attrs }) {
    return () => h('div', attrs, [
      h('label', { class: 'form-label' }, props.label),
      h('textarea', {
        class: 'form-control',
        rows: 4,
        value: props.modelValue,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
      }),
    ])
  },
})

const AddButton = defineComponent({
  props: { label: { type: String, required: true } },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      type: 'button',
      class: 'win-btn win-btn--sm',
      onClick: () => emit('click'),
    }, [h('i', { class: 'fa fa-plus me-1' }), props.label])
  },
})

const RemoveButton = defineComponent({
  emits: ['click'],
  setup(_, { emit }) {
    return () => h('button', {
      type: 'button',
      class: 'btn btn-sm btn-outline-danger',
      title: '刪除',
      onClick: () => emit('click'),
    }, [h('i', { class: 'fa fa-trash' })])
  },
})

const InspectionTable = defineComponent({
  props: {
    modelValue: { type: Array as () => C3InspectionRow[], required: true },
    title: { type: String, required: true },
    addLabel: { type: String, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const update = (index: number, key: keyof C3InspectionRow, value: string) => {
      const rows = props.modelValue.map((row, i) => i === index ? { ...row, [key]: value } : row)
      emit('update:modelValue', rows)
    }
    const remove = (index: number) =>
      emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
    const add = () =>
      emit('update:modelValue', [...props.modelValue, { inspectionDate: '', inspectionItem: '' }])
    return () => h(SectionCard, { title: props.title, icon: 'fa fa-clipboard-check' }, {
      default: () => [
        h('div', { class: 'table-responsive' }, [
          h('table', { class: 'table c3-table align-middle' }, [
            h('thead', [h('tr', [
              h('th', { class: 'index-col' }, '#'),
              h('th', '抽查日期'),
              h('th', '查驗項目'),
              h('th', { class: 'action-col' }),
            ])]),
            h('tbody', props.modelValue.map((row, index) => h('tr', { key: index }, [
              h('td', String(index + 1)),
              h('td', [h('input', {
                class: 'form-control',
                value: row.inspectionDate,
                onInput: (e: Event) => update(index, 'inspectionDate', (e.target as HTMLInputElement).value),
              })]),
              h('td', [h('input', {
                class: 'form-control',
                value: row.inspectionItem,
                onInput: (e: Event) => update(index, 'inspectionItem', (e.target as HTMLInputElement).value),
              })]),
              h('td', [h(RemoveButton, { onClick: () => remove(index) })]),
            ]))),
          ]),
        ]),
        h(AddButton, { label: props.addLabel, onClick: add }),
      ],
    })
  },
})

const DocumentTable = defineComponent({
  props: {
    modelValue: { type: Array as () => C3DocumentRow[], required: true },
    title: { type: String, required: true },
    unitLabel: { type: String, required: true },
    addLabel: { type: String, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const update = (index: number, key: keyof C3DocumentRow, value: string) => {
      emit('update:modelValue', props.modelValue.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ))
    }
    const remove = (index: number) =>
      emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
    const add = () => emit('update:modelValue', [
      ...props.modelValue,
      { unit: '', documentDate: '', documentNo: '', subject: '' },
    ])
    return () => h(SectionCard, { title: props.title, icon: 'fa fa-envelope-open-text' }, {
      default: () => [
        h('div', { class: 'table-responsive' }, [
          h('table', { class: 'table c3-table c3-document-table align-middle' }, [
            h('thead', [h('tr', [
              h('th', { class: 'index-col' }, '#'),
              h('th', props.unitLabel),
              h('th', '日期'),
              h('th', '文號'),
              h('th', '主旨內容'),
              h('th', { class: 'action-col' }),
            ])]),
            h('tbody', props.modelValue.map((row, index) => h('tr', { key: index }, [
              h('td', String(index + 1)),
              ...(['unit', 'documentDate', 'documentNo'] as const).map((key) =>
                h('td', [h('input', {
                  class: 'form-control',
                  value: row[key],
                  onInput: (e: Event) => update(index, key, (e.target as HTMLInputElement).value),
                })]),
              ),
              h('td', [h('textarea', {
                class: 'form-control',
                rows: 2,
                value: row.subject,
                onInput: (e: Event) => update(index, 'subject', (e.target as HTMLTextAreaElement).value),
              })]),
              h('td', [h(RemoveButton, { onClick: () => remove(index) })]),
            ]))),
          ]),
        ]),
        h(AddButton, { label: props.addLabel, onClick: add }),
      ],
    })
  },
})

onMounted(async () => {
  if (!workspaceStore.currentWorkspace) await workspaceStore.initWorkspaces()
  await load()
})
</script>

<style scoped>
.c3-editor-page {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1100px 560px at 12% 0%, rgba(var(--bs-primary-rgb), 0.07), transparent 62%),
    rgba(15, 23, 42, 0.1);
}
.c3-loading {
  display: grid;
  min-height: 360px;
  place-items: center;
  color: var(--bs-secondary-color);
}
.c3-shell,
.c3-editor-page :deep(.c3-section-card) {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.9));
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.2);
}
.c3-shell :deep(.card-body) { background: transparent; }
.c3-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.c3-section-nav {
  display: flex;
  gap: 0.5rem;
  padding: 0.55rem;
  overflow-x: auto;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.65rem;
  background: #111827;
}
.c3-section-tab {
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
.c3-section-tab:hover,
.c3-section-tab.active {
  color: #fff;
  border-color: rgba(var(--bs-primary-rgb), 0.45);
  background: rgba(var(--bs-primary-rgb), 0.18);
}
.c3-section-stack { display: grid; gap: 1rem; }
.c3-editor-page :deep(.c3-section-card) { overflow: hidden; border-radius: 0.65rem; }
.c3-editor-page :deep(.c3-section-card__header) {
  padding: 0.85rem 1rem;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(15, 23, 42, 0.62);
}
.c3-editor-page :deep(.c3-section-card__body) { padding: 1.25rem; }
.c3-editor-page :deep(.c3-table) {
  min-width: 720px;
  margin-bottom: 0.8rem;
  color: var(--bs-body-color);
  --bs-table-bg: transparent;
  --bs-table-border-color: rgba(255, 255, 255, 0.1);
}
.c3-editor-page :deep(.c3-document-table) { min-width: 1100px; }
.c3-editor-page :deep(.c3-table thead th) {
  color: #cbd5e1;
  font-size: 0.82rem;
  background: rgba(2, 6, 23, 0.55);
}
.c3-editor-page :deep(.c3-table .form-control) {
  color: #f8fafc;
  background: rgba(2, 6, 23, 0.68);
  border-color: rgba(255, 255, 255, 0.14);
}
.c3-editor-page :deep(.index-col) { width: 54px; text-align: center; }
.c3-editor-page :deep(.action-col) { width: 54px; }
@media (max-width: 767px) {
  .c3-editor-page { padding: 0.65rem; }
  .c3-editor-page :deep(.c3-section-card__body) { padding: 1rem; }
}
</style>
