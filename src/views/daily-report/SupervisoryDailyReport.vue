<template>
  <div class="supervisory-report-page">
    <PageHeader
      title="公共工程監造報表"
      icon="fa fa-clipboard-check"
      :breadcrumbs="[
        { text: '監造報表管理', href: 'javascript:;' },
        { text: '公共工程監造報表', active: true }
      ]"
    />

    <Card class="report-card mb-3">
      <CardBody class="p-3 p-lg-4">
        <div class="toolbar">
          <div class="toolbar-fields">
            <div class="date-field">
              <label class="form-label">
                <i class="fa fa-calendar-alt text-theme me-2"></i>填報日期
              </label>
              <div class="d-flex align-items-center gap-2">
                <RepublicDatePicker
                  v-model="form.reportDate"
                  :disabled="isLoading"
                  :use-republic-year="true"
                  :construction-id="constructionId"
                />
                <span class="weekday-badge">{{ weekdayText }}</span>
              </div>
            </div>
            <div class="weather-fields">
              <div class="weather-field">
                <label class="form-label">上午天氣</label>
                <select v-model="form.weatherMorning" class="form-select weather-select">
                  <option value="">請選擇</option>
                  <option v-for="option in weatherOptions" :key="`am-${option}`" :value="option">
                    {{ option }}
                  </option>
                </select>
              </div>
              <div class="weather-field">
                <label class="form-label">下午天氣</label>
                <select v-model="form.weatherAfternoon" class="form-select weather-select">
                  <option value="">請選擇</option>
                  <option v-for="option in weatherOptions" :key="`pm-${option}`" :value="option">
                    {{ option }}
                  </option>
                </select>
              </div>
              <button
                type="button"
                class="btn weather-import-btn"
                title="依工程地址與設定測站帶入當日天氣"
                :disabled="isLoading || isImportingWeather || !constructionId || !form.reportDate"
                @click="importWeatherFromStation"
              >
                <i
                  class="fa me-2"
                  :class="isImportingWeather ? 'fa-spinner fa-spin' : 'fa-cloud-sun'"
                ></i>
                {{ isImportingWeather ? '帶入中…' : '帶入測站天氣' }}
              </button>
            </div>
          </div>
          <div class="toolbar-actions">
            <button
              type="button"
              class="btn btn-outline-theme"
              :disabled="isLoading || isSaving || !constructionId"
              @click="save(false)"
            >
              <i class="fa me-2" :class="isSaving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
              {{ isSaving ? '儲存中…' : '儲存' }}
            </button>
            <button
              type="button"
              class="btn b2-export-btn"
              :disabled="isLoading || isSaving || isExporting || !constructionId"
              @click="exportWord"
            >
              <i class="fa me-2" :class="isExporting ? 'fa-spinner fa-spin' : 'fa-file-word'"></i>
              {{ isExporting ? '匯出中…' : '匯出 Word' }}
            </button>
          </div>
        </div>
      </CardBody>
    </Card>

    <div v-if="!constructionId" class="alert alert-warning">
      請先選擇工程案，再填寫監造報表。
    </div>

    <div :class="{ 'report-loading': isLoading }">
      <Card class="report-card mb-3">
        <CardHeader class="report-card__header">
          <i class="fa fa-file-signature report-card__icon"></i>
          <span>表報與工程基本資料</span>
        </CardHeader>
        <CardBody class="report-card__body">
          <div class="row g-3">
            <div class="col-12 col-lg-4">
              <label class="form-label">表報編號</label>
              <input v-model.trim="form.reportNumber" class="form-control" type="text" />
            </div>
            <div class="col-12 col-lg-8">
              <label class="form-label">工程名稱</label>
              <input v-model.trim="form.projectName" class="form-control" type="text" />
            </div>
            <div class="col-6 col-lg-3">
              <label class="form-label">契約工期（天）</label>
              <input v-model.number="form.contractDurationDays" class="form-control" type="number" min="0" />
            </div>
            <div class="col-6 col-lg-3">
              <label class="form-label">開工日期</label>
              <RepublicDatePicker v-model="form.startDate" :use-republic-year="true" />
            </div>
            <div class="col-6 col-lg-3">
              <label class="form-label">預定完工日期</label>
              <RepublicDatePicker v-model="form.scheduledCompletionDate" :use-republic-year="true" />
            </div>
            <div class="col-6 col-lg-3">
              <label class="form-label">實際完工日期</label>
              <RepublicDatePicker v-model="form.actualCompletionDate" :use-republic-year="true" />
            </div>
            <div class="col-6 col-lg-3">
              <label class="form-label">契約變更次數</label>
              <input v-model.number="form.contractChangeCount" class="form-control" type="number" min="0" />
            </div>
            <div class="col-6 col-lg-3">
              <label class="form-label">工期展延天數</label>
              <input v-model.number="form.extensionDays" class="form-control" type="number" min="0" />
            </div>
            <div class="col-12 col-lg-3">
              <label class="form-label">原契約金額</label>
              <div class="input-group">
                <span class="input-group-text">$</span>
                <input v-model.number="form.originalContractAmount" class="form-control" type="number" min="0" step="0.01" />
              </div>
            </div>
            <div class="col-12 col-lg-3">
              <label class="form-label">變更後契約金額</label>
              <div class="input-group">
                <span class="input-group-text">$</span>
                <input v-model.number="form.revisedContractAmount" class="form-control" type="number" min="0" step="0.01" />
              </div>
            </div>
            <div class="col-6 col-lg-3">
              <label class="form-label">預定進度（%）</label>
              <input v-model.number="form.plannedProgress" class="form-control" type="number" min="0" max="100" step="0.001" />
            </div>
            <div class="col-6 col-lg-3">
              <label class="form-label">實際進度（%）</label>
              <input v-model.number="form.actualProgress" class="form-control" type="number" min="0" max="100" step="0.001" />
            </div>
          </div>
        </CardBody>
      </Card>

      <ReportSection
        number="一"
        title="工程進行情況"
        hint="含約定之重要施工項目及數量"
        icon="fa fa-tasks"
      >
        <textarea
          v-model="form.workProgressDescription"
          class="form-control report-textarea"
          rows="7"
          placeholder="請填寫本日工程進行情況、重要施工項目及數量"
        ></textarea>
      </ReportSection>

      <ReportSection
        number="二"
        title="監督依照設計圖說及核定施工圖說施工"
        hint="含約定之檢驗停留點及施工抽查等情形"
        icon="fa fa-drafting-compass"
      >
        <textarea
          v-model="form.designDrawingSupervision"
          class="form-control report-textarea"
          rows="7"
          placeholder="請填寫圖說施工監督、檢驗停留點與施工抽查情形"
        ></textarea>
      </ReportSection>

      <ReportSection
        number="三"
        title="查核材料規格及品質"
        hint="含約定之檢驗停留點、材料設備管制及檢（試）驗等抽驗情形"
        icon="fa fa-vials"
      >
        <textarea
          v-model="form.materialQualityInspection"
          class="form-control report-textarea"
          rows="7"
          placeholder="請填寫材料設備管制、檢驗停留點與抽驗情形"
        ></textarea>
      </ReportSection>

      <ReportSection
        number="四"
        title="督導工地職業安全衛生事項"
        icon="fa fa-hard-hat"
      >
        <div class="safety-check mb-4">
          <div class="form-label mb-2">（一）施工廠商施工前檢查事項辦理情形</div>
          <div class="btn-group check-status-group" role="group">
            <input
              id="pre-check-completed"
              v-model="form.preConstructionCheckStatus"
              class="btn-check"
              type="radio"
              value="COMPLETED"
            />
            <label class="btn btn-outline-success" for="pre-check-completed">
              <i class="fa fa-check-circle me-2"></i>完成
            </label>
            <input
              id="pre-check-incomplete"
              v-model="form.preConstructionCheckStatus"
              class="btn-check"
              type="radio"
              value="INCOMPLETE"
            />
            <label class="btn btn-outline-danger" for="pre-check-incomplete">
              <i class="fa fa-exclamation-circle me-2"></i>未完成
            </label>
          </div>
        </div>
        <label class="form-label">（二）其他工地安全衛生督導事項</label>
        <textarea
          v-model="form.otherSafetySupervision"
          class="form-control report-textarea"
          rows="6"
          placeholder="請填寫其他安全衛生督導事項"
        ></textarea>
      </ReportSection>

      <ReportSection
        number="五"
        title="其他約定監造事項"
        hint="含重要事項紀錄、主辦機關指示及通知廠商辦理事項等"
        icon="fa fa-clipboard-list"
      >
        <textarea
          v-model="form.otherContractSupervision"
          class="form-control report-textarea"
          rows="7"
          placeholder="請填寫重要事項、主辦機關指示及通知廠商辦理事項"
        ></textarea>
      </ReportSection>

      <Card class="report-card mb-3">
        <CardHeader class="report-card__header">
          <i class="fa fa-stamp report-card__icon"></i>
          <span>監造單位簽章</span>
        </CardHeader>
        <CardBody class="report-card__body">
          <textarea
            v-model="form.supervisoryUnitStamp"
            class="form-control"
            rows="3"
            placeholder="請填寫監造單位簽章文字或備註"
          ></textarea>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, watch, type PropType } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { getCalendarWeatherForDate } from '@/api/construction'
import {
  normalizeCalendarDateKey,
  resolveCalendarDisplayWeather,
} from '@/utils/calendarWeather'
import { WEATHER_OPTIONS } from '@/types/dailyReport'
import {
  exportSupervisoryPublicWorksReport,
  getSupervisoryPublicWorksReport,
  saveSupervisoryPublicWorksReport,
  type SupervisoryPublicWorksReport,
} from '@/api/supervisoryDailyReport'

const ReportSection = defineComponent({
  name: 'ReportSection',
  props: {
    number: { type: String, required: true },
    title: { type: String, required: true },
    hint: { type: String, default: '' },
    icon: { type: String as PropType<string>, default: 'fa fa-clipboard' },
  },
  setup(props, { slots }) {
    return () => h(Card, { class: 'report-card mb-3' }, {
      default: () => [
        h(CardHeader, { class: 'report-card__header' }, {
          default: () => [
            h('i', { class: `${props.icon} report-card__icon` }),
            h('div', [
              h('span', `${props.number}、${props.title}`),
              props.hint ? h('small', { class: 'section-hint' }, props.hint) : null,
            ]),
          ],
        }),
        h(CardBody, { class: 'report-card__body' }, {
          default: () => slots.default?.(),
        }),
      ],
    })
  },
})

const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id || '')
const weatherOptions = computed(() =>
  Array.from(new Set([
    ...WEATHER_OPTIONS,
    form.value.weatherMorning || '',
    form.value.weatherAfternoon || '',
  ])).filter(Boolean)
)
const isLoading = ref(false)
const isSaving = ref(false)
const isExporting = ref(false)
const isImportingWeather = ref(false)
let loadSequence = 0

const localDate = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

const emptyForm = (reportDate = localDate()): SupervisoryPublicWorksReport => ({
  reportDate,
  weatherMorning: '',
  weatherAfternoon: '',
  reportNumber: '',
  projectName: '',
  contractDurationDays: null,
  startDate: null,
  scheduledCompletionDate: null,
  actualCompletionDate: null,
  contractChangeCount: null,
  extensionDays: null,
  originalContractAmount: null,
  revisedContractAmount: null,
  plannedProgress: null,
  actualProgress: null,
  workProgressDescription: '',
  designDrawingSupervision: '',
  materialQualityInspection: '',
  preConstructionCheckStatus: null,
  otherSafetySupervision: '',
  otherContractSupervision: '',
  supervisoryUnitStamp: '',
  status: 'DRAFT',
})

const form = ref<SupervisoryPublicWorksReport>(emptyForm())

const weekdayText = computed(() => {
  if (!form.value.reportDate) return ''
  const date = new Date(`${form.value.reportDate}T00:00:00`)
  return `星期${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`
})

function applyProjectDefaults(target: SupervisoryPublicWorksReport) {
  const project = workspaceStore.currentProject
  if (!project) return
  target.projectName ||= project.name || ''
  target.startDate ||= project.startDate || null
  target.scheduledCompletionDate ||= project.endDate || null
  target.contractDurationDays ??= project.workDay ?? null
  target.extensionDays ??= project.totalExtensionDays ?? null
  target.plannedProgress ??= project.progress ?? null
  const amount = Number(project.currentContractAmount || project.budget)
  if (target.revisedContractAmount == null && Number.isFinite(amount)) {
    target.revisedContractAmount = amount
  }
}

async function importWeatherFromStation() {
  if (!constructionId.value || !form.value.reportDate) {
    toastService.warning('請先選擇工程案與填報日期')
    return
  }

  isImportingWeather.value = true
  try {
    const dateKey = normalizeCalendarDateKey(form.value.reportDate)
    const data = await getCalendarWeatherForDate(
      constructionId.value,
      dateKey,
      'SUPERVISORY'
    )
    const resolved = resolveCalendarDisplayWeather(data)
    if (!resolved.morning && !resolved.afternoon) {
      toastService.warning(
        '該日尚無天氣紀錄，請確認工程地址與氣象站設定，或先在行事曆中建立天氣資料'
      )
      return
    }

    if (resolved.morning) form.value.weatherMorning = resolved.morning
    if (resolved.afternoon) form.value.weatherAfternoon = resolved.afternoon

    const hasUserWeather = resolved.morningFromUser || resolved.afternoonFromUser
    toastService.success(
      hasUserWeather
        ? '已帶入行事曆天氣紀錄'
        : `已帶入${data?.cwaStationName ? `「${data.cwaStationName}」` : '設定測站'}天氣`
    )
  } catch (error) {
    console.error('帶入測站天氣失敗:', error)
    toastService.error('帶入測站天氣失敗，請確認工程地址與測站設定')
  } finally {
    isImportingWeather.value = false
  }
}

async function loadReport(date: string) {
  const sequence = ++loadSequence
  if (!constructionId.value || !date) {
    form.value = emptyForm(date || localDate())
    return
  }
  isLoading.value = true
  try {
    const data = await getSupervisoryPublicWorksReport(constructionId.value, date)
    if (sequence !== loadSequence) return
    form.value = { ...emptyForm(date), ...data, reportDate: date }
  } catch (error: any) {
    if (sequence !== loadSequence) return
    if (error?.response?.status === 404) {
      const next = emptyForm(date)
      applyProjectDefaults(next)
      form.value = next
    } else {
      console.error('載入公共工程監造報表失敗:', error)
      toastService.error('載入監造報表失敗')
    }
  } finally {
    if (sequence === loadSequence) isLoading.value = false
  }
}

async function save(silent: boolean): Promise<boolean> {
  if (!constructionId.value || !form.value.reportDate) {
    if (!silent) toastService.warning('請先選擇工程案與填報日期')
    return false
  }
  isSaving.value = true
  try {
    form.value = await saveSupervisoryPublicWorksReport(constructionId.value, form.value)
    if (!silent) toastService.success('公共工程監造報表已儲存')
    return true
  } catch (error) {
    console.error('儲存公共工程監造報表失敗:', error)
    toastService.error('監造報表儲存失敗')
    return false
  } finally {
    isSaving.value = false
  }
}

async function exportWord() {
  if (!constructionId.value || !form.value.reportDate) {
    toastService.warning('請先選擇工程案與填報日期')
    return
  }
  isExporting.value = true
  try {
    if (!(await save(true))) return
    await exportSupervisoryPublicWorksReport(constructionId.value, form.value.reportDate)
  } catch (error) {
    console.error('匯出公共工程監造報表失敗:', error)
    toastService.error('匯出失敗，請確認 Word 樣板已放入指定資料夾')
  } finally {
    isExporting.value = false
  }
}

watch(
  () => form.value.reportDate,
  (date, previous) => {
    if (date && date !== previous) loadReport(date)
  }
)

watch(constructionId, () => loadReport(form.value.reportDate))

onMounted(() => loadReport(form.value.reportDate))
</script>

<style scoped>
.supervisory-report-page {
  padding-bottom: 2rem;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
}

.toolbar-fields,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.toolbar-fields {
  flex: 1;
  min-width: 0;
}

.toolbar-actions {
  flex: 0 0 auto;
  padding-left: 1.25rem;
  border-left: 1px solid rgba(var(--bs-theme-rgb), 0.2);
}

.date-field {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 270px;
  min-height: 70px;
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(var(--bs-theme-rgb), 0.18);
  border-radius: 0.65rem;
  background: linear-gradient(
    135deg,
    rgba(var(--bs-theme-rgb), 0.06),
    rgba(var(--bs-body-bg-rgb), 0.52)
  );
}

.date-field .form-label {
  margin-bottom: 0.4rem;
  font-size: 0.82rem;
}

.weather-fields {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-height: 70px;
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(var(--bs-theme-rgb), 0.28);
  border-radius: 0.65rem;
  background: linear-gradient(
    135deg,
    rgba(var(--bs-theme-rgb), 0.1),
    rgba(var(--bs-body-bg-rgb), 0.58)
  );
}

.weather-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 190px;
}

.weather-field .form-label {
  margin: 0;
  color: var(--bs-secondary-color);
  font-size: 0.82rem;
  white-space: nowrap;
}

.weather-field .weather-select {
  min-width: 120px;
}

.weather-import-btn {
  min-height: 38px;
  padding-inline: 0.8rem;
  white-space: nowrap;
  color: var(--bs-theme);
  border: 1px solid rgba(var(--bs-theme-rgb), 0.5);
  background: rgba(var(--bs-theme-rgb), 0.1);
}

.weather-import-btn:hover:not(:disabled) {
  color: #fff;
  border-color: var(--bs-theme);
  background: var(--bs-theme);
  box-shadow: 0 6px 18px rgba(var(--bs-theme-rgb), 0.2);
}

.weather-import-btn:disabled {
  color: var(--bs-secondary-color);
  border-color: var(--bs-border-color);
  background: rgba(var(--bs-secondary-rgb), 0.08);
}

.form-label {
  color: var(--bs-body-color);
  font-weight: 600;
}

.weekday-badge {
  min-width: 4.5rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(var(--bs-theme-rgb), 0.35);
  border-radius: 0.4rem;
  color: var(--bs-theme);
  text-align: center;
  background: rgba(var(--bs-theme-rgb), 0.08);
}

@media (max-width: 1199.98px) {
  .toolbar {
    align-items: flex-end;
  }

  .toolbar-actions {
    padding-left: 0;
    border-left: 0;
  }
}

.report-card {
  overflow: visible;
  background: rgba(var(--bs-body-bg-rgb), 0.92);
  border-color: rgba(var(--bs-theme-rgb), 0.25);
}

.report-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.85rem 1.25rem;
  color: var(--bs-body-color);
  font-size: 1rem;
  font-weight: 700;
  background: rgba(var(--bs-theme-rgb), 0.08);
  border-bottom-color: rgba(var(--bs-theme-rgb), 0.2);
}

.report-card__icon {
  color: var(--bs-theme);
  font-size: 1.05rem;
}

.report-card__body {
  padding: 1.25rem;
}

.section-hint {
  display: block;
  margin-top: 0.15rem;
  color: var(--bs-secondary-color);
  font-size: 0.78rem;
  font-weight: 400;
}

.report-textarea {
  min-height: 9rem;
  line-height: 1.7;
  resize: vertical;
}

.form-control,
.form-select,
.input-group-text {
  background-color: var(--bs-body-bg);
  border-color: var(--bs-border-color);
  color: var(--bs-body-color);
}

.form-select.weather-select {
  min-width: 132px;
  color-scheme: dark light;
  cursor: pointer;
}

.form-select.weather-select:not([multiple]) option {
  color: var(--bs-body-color) !important;
  background-color: var(--bs-body-bg) !important;
}

:global(html[data-bs-theme='dark']) .form-select.weather-select {
  color-scheme: dark;
  --bs-form-select-bg-img: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='rgba(228,230,235,0.95)' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-image: var(--bs-form-select-bg-img);
}

:global(html[data-bs-theme='dark']) .form-select.weather-select:not([multiple]) option {
  color: #e8edf5 !important;
  background-color: #172033 !important;
}

.form-control:focus,
.form-select:focus {
  background-color: var(--bs-body-bg);
  color: var(--bs-body-color);
  border-color: var(--bs-theme);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-theme-rgb), 0.16);
}

.report-loading {
  opacity: 0.58;
  pointer-events: none;
}

.b2-export-btn {
  color: #fff;
  background: linear-gradient(135deg, #315a88, #193657);
  border: 1px solid #5d81aa;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.b2-export-btn:hover:not(:disabled) {
  color: #fff;
  background: linear-gradient(135deg, #3e6d9f, #244a73);
  border-color: #78a2cf;
}

.b2-export-btn:disabled {
  opacity: 0.55;
}

@media (max-width: 767.98px) {
  .toolbar,
  .toolbar-fields,
  .toolbar-actions {
    width: 100%;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-fields > div,
  .date-field {
    width: 100%;
  }

  .weather-fields {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-actions {
    justify-content: stretch;
  }

  .weather-field,
  .weather-import-btn {
    width: 100%;
  }

  .weather-field .weather-select {
    flex: 1;
  }

  .toolbar-actions .btn {
    flex: 1;
  }

  .report-card__body {
    padding: 1rem;
  }
}
</style>
