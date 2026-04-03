<template>
  <div class="form-p1-overall-plan-page">
    <PageHeader title="P-1 整體施工計畫" icon="fa fa-file-lines" :breadcrumbs="breadcrumbs">
      <template v-if="hasCurrentProject && isContractor" #extra>
        <DesignChangeVersionSwitcher
          :model-value="selectedDesignChangeId"
          :construction-id="currentProject?.id"
          source-type="CONTRACTOR"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!isContractor" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      「P-1 整體施工計畫」僅供營造端維護。
    </div>

    <Card v-else class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div class="b2-content-toolbar">
          <div class="p1-toolbar-left">
            <label class="p1-refdate-label" for="p1-data-reference-date">
              資料依據日
              <span
                class="p1-info-icon"
                data-tooltip="此日期用於匯出時的人員統計與內容判斷;預設會帶入目前版本的起始日。"
                tabindex="0"
                aria-label="資料依據日說明"
              >
                <i class="fa fa-circle-info"></i>
              </span>
            </label>
            <RepublicDatePicker
              id="p1-data-reference-date"
              v-model="dataReferenceDate"
              class="p1-refdate-picker"
              placeholder="請選擇資料依據日"
              value-format="YYYY-MM-DD"
              auto-apply
            />
          </div>
          <div class="p1-toolbar-right">
            <div v-if="selectedDesignChangeId != null" class="btn-group">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="自前一個變更設計版本複製 P-1 內容到目前版本"
              >
                <i class="fa fa-copy me-1"></i>
                複製前一個版本
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li>
                  <button type="button" class="dropdown-item text-danger" @click="copyFromPrevious">
                    覆寫目前版本（P-1）
                  </button>
                </li>
              </ul>
            </div>
            <button type="button" class="btn b2-export-btn" :disabled="isExporting" @click="exportWord">
              <i class="fa fa-file-word"></i>
              {{ isExporting ? '匯出中…' : '匯出 Word' }}
            </button>
          </div>
        </div>

        <div v-if="isTextLoading" class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入文字內容中…
        </div>
        <div v-else class="text-panels text-panels--ai-wrap">
          <div v-if="isAiGenerating" class="text-panels__ai-overlay" aria-live="polite">
            <div class="text-panels__ai-overlay-inner">
              <i class="fa fa-spinner fa-spin fa-2x mb-2 text-primary"></i>
              <div class="fw-semibold">AI 生成中…</div>
              <div class="small text-muted mt-1">產生內容後會自動儲存至目前版本</div>
            </div>
          </div>
          <div class="text-panel mb-3">
            <div class="text-panel__header">
              <div class="text-panel__label">
                <i class="fa fa-ruler-combined me-2 text-warning"></i>
                工程規模概述
              </div>
              <div class="text-panel__toolbar">
                <button
                  type="button"
                  class="btn-ai-generate"
                  :disabled="isAiGenerating || !currentProject?.id"
                  @click="generateByAi"
                >
                  <i class="fa me-2" :class="isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                  {{ isAiGenerating ? '生成中…' : '依標單 AI 生成' }}
                </button>
              </div>
            </div>
            <div class="text-panel__body">
              <textarea
                v-model="p1ConstructionScaleOverview"
                class="form-control text-panel__textarea"
                rows="7"
                placeholder="請輸入工程規模概述（P-1 獨立欄位）"
              />
            </div>
          </div>

          <div class="section-card">
            <div class="section-card__header">
              <i class="fa fa-mountain-city me-2 text-info"></i>
              工地研判
            </div>
            <div class="section-card__body">
              <div class="site-judgement-grid site-judgement-grid--2">
                <div class="text-panel">
                  <div class="text-panel__header">
                    <div class="text-panel__label">地質概況</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-ai-generate" :disabled="isAiGenerating || !currentProject?.id" @click="generateSiteJudgementByAi('GEOLOGY_OVERVIEW')">
                        <i class="fa me-2" :class="aiLoading.geology ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                        {{ aiLoading.geology ? '生成中…' : '依工程地址 AI 生成' }}
                      </button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <textarea v-model="p1GeologyOverview" class="form-control text-panel__textarea" rows="4" placeholder="請輸入地質概況" />
                  </div>
                </div>

                <div class="text-panel">
                  <div class="text-panel__header">
                    <div class="text-panel__label">氣象及水文</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-ai-generate" :disabled="isAiGenerating || !currentProject?.id" @click="generateSiteJudgementByAi('METEOROLOGY_HYDROLOGY')">
                        <i class="fa me-2" :class="aiLoading.meteo ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                        {{ aiLoading.meteo ? '生成中…' : '依工程地址 AI 生成' }}
                      </button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <textarea v-model="p1MeteorologyHydrology" class="form-control text-panel__textarea" rows="4" placeholder="請輸入氣象及水文" />
                  </div>
                </div>
              </div>

              <div class="site-judgement-grid site-judgement-grid--3">
                <div class="text-panel">
                  <div class="text-panel__header">
                    <div class="text-panel__label">工址現況調查</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-default-fill" @click="applyDefaultText('siteCurrent')">帶入預設</button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <textarea v-model="p1SiteCurrentConditionSurvey" class="form-control text-panel__textarea" rows="4" placeholder="請輸入工址現況調查" />
                  </div>
                </div>

                <div class="text-panel">
                  <div class="text-panel__header">
                    <div class="text-panel__label">地下埋設物調查</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-default-fill" @click="applyDefaultText('underground')">帶入預設</button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <textarea v-model="p1UndergroundUtilitiesSurvey" class="form-control text-panel__textarea" rows="4" placeholder="請輸入地下埋設物調查" />
                  </div>
                </div>

                <div class="text-panel">
                  <div class="text-panel__header">
                    <div class="text-panel__label">鄰房調查</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-default-fill" @click="applyDefaultText('neighbor')">帶入預設</button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <textarea v-model="p1NeighboringBuildingSurvey" class="form-control text-panel__textarea" rows="4" placeholder="請輸入鄰房調查" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="section-card">
            <div class="section-card__header">
              <i class="fa fa-truck-monster me-2 text-warning"></i>
              勞動力及物料市場調查
            </div>
            <div class="section-card__body">
              <div class="text-panel">
                <div class="text-panel__header">
                  <div class="text-panel__label">人力資源預定進場時間表</div>
                  <div class="text-panel__toolbar table-toolbar-inline">
                    <button type="button" class="btn-default-fill" @click="addManpowerRow">新增一列</button>
                  </div>
                </div>
                <div v-if="manpowerDefaultHint" class="small text-info mb-2">
                  <i class="fa fa-circle-info me-1"></i>{{ manpowerDefaultHint }}
                </div>
                <div class="table-scroll-wrap">
                  <table class="table align-middle p1-resource-table mb-0">
                    <thead>
                      <tr>
                        <th style="width: 80px">編號</th>
                        <th>資源名稱</th>
                        <th style="width: 140px">群組</th>
                        <th style="width: 180px">最大可用量</th>
                        <th style="width: 180px">起</th>
                        <th style="width: 180px">迄</th>
                        <th style="width: 80px"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in p1ManpowerEntrySchedule" :key="`mp-${idx}`">
                        <td>{{ idx + 1 }}</td>
                        <td><input v-model="row.resourceName" type="text" class="form-control form-control-sm" @input="scheduleAutoSave" /></td>
                        <td><input v-model="row.groupName" type="text" class="form-control form-control-sm" @input="scheduleAutoSave" /></td>
                        <td><input v-model="row.maxAvailable" type="text" class="form-control form-control-sm" @input="scheduleAutoSave" /></td>
                        <td>
                          <RepublicDatePicker v-model="row.startDate" input-class="form-control form-control-sm p1-date-input" @update:model-value="scheduleAutoSave" />
                        </td>
                        <td>
                          <RepublicDatePicker v-model="row.endDate" input-class="form-control form-control-sm p1-date-input" @update:model-value="scheduleAutoSave" />
                        </td>
                        <td><button type="button" class="btn btn-sm btn-outline-danger" @click="removeManpowerRow(idx)"><i class="fa fa-trash"></i></button></td>
                      </tr>
                      <tr v-if="p1ManpowerEntrySchedule.length === 0">
                        <td colspan="7" class="text-center text-muted py-3">尚無資料，請新增或使用 AI 生成。</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="resource-layout">
                <div>
                  <div class="text-panel">
                    <div class="text-panel__header">
                      <div class="text-panel__label">施工機械設備資源</div>
                      <div class="text-panel__toolbar table-toolbar-inline">
                        <button type="button" class="btn-ai-generate" :disabled="isAiGenerating || !currentProject?.id" @click="generateMechanicalResourceNamesByAi">
                          <i class="fa me-2" :class="isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                          {{ isAiGenerating ? '生成中…' : '依標單 AI 生成資源名稱' }}
                        </button>
                        <button type="button" class="btn-default-fill" @click="addMechanicalResourceRow">新增一列</button>
                      </div>
                    </div>
                    <div class="table-scroll-wrap">
                      <table class="table align-middle p1-resource-table mb-0">
                        <thead>
                          <tr>
                            <th style="width: 80px">編號</th>
                            <th>資源名稱</th>
                            <th style="width: 180px">最大可用量</th>
                            <th style="width: 180px">起</th>
                            <th style="width: 180px">迄</th>
                            <th style="width: 80px"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(row, idx) in p1MechanicalResources" :key="`mr-${idx}`">
                            <td>{{ idx + 1 }}</td>
                            <td><input v-model="row.resourceName" type="text" class="form-control form-control-sm" @input="scheduleAutoSave" /></td>
                            <td><input v-model="row.maxAvailable" type="text" class="form-control form-control-sm" @input="scheduleAutoSave" /></td>
                            <td>
                              <RepublicDatePicker
                                v-model="row.startDate"
                                input-class="form-control form-control-sm p1-date-input"
                                @update:model-value="scheduleAutoSave"
                              />
                            </td>
                            <td>
                              <RepublicDatePicker
                                v-model="row.endDate"
                                input-class="form-control form-control-sm p1-date-input"
                                @update:model-value="scheduleAutoSave"
                              />
                            </td>
                            <td><button type="button" class="btn btn-sm btn-outline-danger" @click="removeMechanicalResourceRow(idx)"><i class="fa fa-trash"></i></button></td>
                          </tr>
                          <tr v-if="p1MechanicalResources.length === 0">
                            <td colspan="6" class="text-center text-muted py-3">尚無資料，請新增或使用 AI 生成。</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div class="text-panel">
                  <div class="text-panel__header">
                    <div class="text-panel__label">物料市場調查</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-ai-generate" :disabled="isAiGenerating || !currentProject?.id" @click="generateMaterialMarketSurveyByAi">
                        <i class="fa me-2" :class="isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                        {{ isAiGenerating ? '生成中…' : '依標單 AI 生成' }}
                      </button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <textarea
                      v-model="p1MaterialMarketSurvey"
                      class="form-control text-panel__textarea"
                      rows="10"
                      placeholder="請輸入物料市場調查"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useExportLoading } from '@/composables/useExportLoading'
import { formPApi, downloadBlobAsFile, type ExportConstructionReportRequest } from '@/api/forms'
import { getDesignChangeList } from '@/api/designChange'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
import { getConstructionDetail, getP1TextAiGenerate, getP1SiteJudgementAiGenerate, getP1MechanicalResourcesAiGenerate, getP1MaterialMarketSurveyAiGenerate, getP1ManpowerDefaultMaxAvailable, updateConstruction, type P1SiteJudgementAiField } from '@/api/construction'

const workspaceStore = useWorkspaceStore()
const { isContractor } = useViewPerspective()
const { runWithExportLoading } = useExportLoading()
const currentProject = computed(() => workspaceStore.currentProject)
const hasCurrentProject = computed(() => !!currentProject.value?.id)
const selectedDesignChangeId = ref<number | null>(null)
const designChangeList = ref<{ id: number; effectiveDate: string }[]>([])
const dataReferenceDate = ref('')
const p1ConstructionScaleOverview = ref('')
const p1GeologyOverview = ref('')
const p1SiteCurrentConditionSurvey = ref('')
const p1UndergroundUtilitiesSurvey = ref('')
const p1MeteorologyHydrology = ref('')
const p1NeighboringBuildingSurvey = ref('')
type MechanicalResourceRow = { resourceName: string; maxAvailable: string; startDate: string; endDate: string }
const p1MechanicalResources = ref<MechanicalResourceRow[]>([])
type ManpowerScheduleRow = { resourceName: string; groupName: string; maxAvailable: string; startDate: string; endDate: string }
const p1ManpowerEntrySchedule = ref<ManpowerScheduleRow[]>([])
const p1MaterialMarketSurvey = ref('')
const manpowerDefaultHint = ref('')
const isTextLoading = ref(false)
const isAiGenerating = ref(false)
const isExporting = ref(false)
const aiLoading = ref({ geology: false, meteo: false })
let autosaveTimer: number | null = null
let skipAutoSave = false

const breadcrumbs = [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: 'P類(計劃書)表單', href: 'javascript:;' },
  { text: 'P-1 整體施工計畫', active: true }
]

async function onVersionChange(versionId: number | null) {
  selectedDesignChangeId.value = versionId
  dataReferenceDate.value = resolveVersionStartDate(versionId)
  await loadP1Text()
}

function copyFromPrevious() {
  window.alert('P-1 複製前一版本：後續將接 API。')
}

async function exportWord() {
  const cid = currentProject.value?.id
  if (!cid) {
    window.alert('請先選擇工程案')
    return
  }
  const reportData: ExportConstructionReportRequest['valueMap']['reportData'] = {
    constructionId: cid,
    designChangeId: selectedDesignChangeId.value
  }
  if (dataReferenceDate.value) {
    reportData.dataReferenceDate = dataReferenceDate.value
  }
  const request: ExportConstructionReportRequest = { valueMap: { reportData } }
  isExporting.value = true
  try {
    const taskId = `p1-export-${cid}-${Date.now()}`
    const res = await runWithExportLoading(taskId, 'P-1 整體施工計畫', (signal) =>
      formPApi.exportP1OverallConstructionPlan(request, { signal })
    )
    const fileName = extractFileNameFromResponse(res) || `P-1_整體施工計畫_${Date.now()}.docx`
    downloadBlobAsFile(res.data, fileName)
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '匯出失敗'
    window.alert(msg)
  } finally {
    isExporting.value = false
  }
}

async function fetchDesignChangeList() {
  const cid = currentProject.value?.id
  if (!cid) {
    designChangeList.value = []
    dataReferenceDate.value = new Date().toISOString().slice(0, 10)
    return
  }
  try {
    const list = await getDesignChangeList(cid, 'CONTRACTOR')
    designChangeList.value = [...list].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    )
  } catch {
    designChangeList.value = []
  } finally {
    dataReferenceDate.value = resolveVersionStartDate(selectedDesignChangeId.value)
  }
}

function resolveVersionStartDate(designChangeId: number | null): string {
  if (designChangeId == null) return new Date().toISOString().slice(0, 10)
  const target = designChangeList.value.find((d) => d.id === designChangeId)
  return target?.effectiveDate?.split('T')[0] || new Date().toISOString().slice(0, 10)
}

async function loadP1Text() {
  const cid = currentProject.value?.id
  const wid = currentProject.value?.workspaceId
  if (!cid || !wid) {
    p1ConstructionScaleOverview.value = ''
    p1GeologyOverview.value = ''
    p1SiteCurrentConditionSurvey.value = ''
    p1UndergroundUtilitiesSurvey.value = ''
    p1MeteorologyHydrology.value = ''
    p1NeighboringBuildingSurvey.value = ''
    p1MechanicalResources.value = []
    p1ManpowerEntrySchedule.value = []
    p1MaterialMarketSurvey.value = ''
    return
  }
  isTextLoading.value = true
  try {
    const data = await getConstructionDetail(cid, wid, 'CONTRACTOR', selectedDesignChangeId.value)
    skipAutoSave = true
    p1ConstructionScaleOverview.value = data.p1ConstructionScaleOverview ?? ''
    p1GeologyOverview.value = data.p1GeologyOverview ?? ''
    p1SiteCurrentConditionSurvey.value = data.p1SiteCurrentConditionSurvey ?? ''
    p1UndergroundUtilitiesSurvey.value = data.p1UndergroundUtilitiesSurvey ?? ''
    p1MeteorologyHydrology.value = data.p1MeteorologyHydrology ?? ''
    p1NeighboringBuildingSurvey.value = data.p1NeighboringBuildingSurvey ?? ''
    p1MechanicalResources.value = parseMechanicalResources(data.p1MechanicalResourcesJson)
    const manpowerRows = parseManpowerEntrySchedule(data.p1ManpowerEntryScheduleJson)
    p1ManpowerEntrySchedule.value = manpowerRows.length > 0 ? manpowerRows : getDefaultManpowerEntrySchedule()
    await loadManpowerDefaultHintByReferenceDate()
    p1MaterialMarketSurvey.value = data.p1MaterialMarketSurvey ?? ''
    skipAutoSave = false
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '載入失敗'
    window.alert(msg)
  } finally {
    skipAutoSave = false
    isTextLoading.value = false
  }
}

async function saveP1Texts() {
  const cid = currentProject.value?.id
  if (!cid) return
  await updateConstruction(
    cid,
    {
      p1ConstructionScaleOverview: p1ConstructionScaleOverview.value,
      p1GeologyOverview: p1GeologyOverview.value,
      p1SiteCurrentConditionSurvey: p1SiteCurrentConditionSurvey.value,
      p1UndergroundUtilitiesSurvey: p1UndergroundUtilitiesSurvey.value,
      p1MeteorologyHydrology: p1MeteorologyHydrology.value,
      p1NeighboringBuildingSurvey: p1NeighboringBuildingSurvey.value,
      p1MechanicalResourcesJson: JSON.stringify(p1MechanicalResources.value),
      p1ManpowerEntryScheduleJson: JSON.stringify(p1ManpowerEntrySchedule.value),
      p1MaterialMarketSurvey: p1MaterialMarketSurvey.value
    } as any,
    selectedDesignChangeId.value
  )
}

function scheduleAutoSave() {
  if (skipAutoSave || isTextLoading.value || isAiGenerating.value) return
  if (autosaveTimer != null) window.clearTimeout(autosaveTimer)
  autosaveTimer = window.setTimeout(() => {
    autosaveTimer = null
    void saveP1Texts().catch((e: any) => {
      const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
      window.alert(msg)
    })
  }, 900)
}

async function generateByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  try {
    const res = await getP1TextAiGenerate(cid, selectedDesignChangeId.value)
    const text = res?.text?.trim() ?? ''
    if (!text) {
      window.alert('目前版本無標單資料，或 AI 未產出內容。請先匯入標單或手動填寫。')
      return
    }
    p1ConstructionScaleOverview.value = text
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    isAiGenerating.value = false
  }
}

async function generateSiteJudgementByAi(field: P1SiteJudgementAiField) {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  if (field === 'GEOLOGY_OVERVIEW') aiLoading.value.geology = true
  if (field === 'METEOROLOGY_HYDROLOGY') aiLoading.value.meteo = true
  try {
    const res = await getP1SiteJudgementAiGenerate(cid, field, selectedDesignChangeId.value)
    const text = res?.text?.trim() ?? ''
    if (!text) {
      window.alert('工程地址為空，或 AI 未產出內容。請先確認工程地點。')
      return
    }
    if (field === 'GEOLOGY_OVERVIEW') p1GeologyOverview.value = text
    if (field === 'METEOROLOGY_HYDROLOGY') p1MeteorologyHydrology.value = text
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    aiLoading.value.geology = false
    aiLoading.value.meteo = false
    isAiGenerating.value = false
  }
}

function applyDefaultText(field: 'siteCurrent' | 'underground' | 'neighbor') {
  if (field === 'siteCurrent') p1SiteCurrentConditionSurvey.value = '工區目前無其他地上物。'
  if (field === 'underground') p1UndergroundUtilitiesSurvey.value = '工區目前無其他地下埋設物。'
  if (field === 'neighbor') p1NeighboringBuildingSurvey.value = '工區附近未設有房舍，施工過程將不會造成影響。'
  scheduleAutoSave()
}

function parseMechanicalResources(raw: string | null | undefined): MechanicalResourceRow[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map((it: any) => ({
      resourceName: (it?.resourceName ?? '').toString(),
      maxAvailable: (it?.maxAvailable ?? '').toString(),
      startDate: (it?.startDate ?? '').toString(),
      endDate: (it?.endDate ?? '').toString()
    }))
  } catch {
    return []
  }
}

function parseManpowerEntrySchedule(raw: string | null | undefined): ManpowerScheduleRow[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map((it: any) => ({
      resourceName: (it?.resourceName ?? '').toString(),
      groupName: (it?.groupName ?? '').toString(),
      maxAvailable: (it?.maxAvailable ?? '').toString(),
      startDate: (it?.startDate ?? '').toString(),
      endDate: (it?.endDate ?? '').toString()
    }))
  } catch {
    return []
  }
}

function getDefaultManpowerEntrySchedule(): ManpowerScheduleRow[] {
  return [
    { resourceName: '工地主任', groupName: '人力', maxAvailable: '', startDate: '', endDate: '' },
    { resourceName: '品管工程師', groupName: '人力', maxAvailable: '', startDate: '', endDate: '' },
    { resourceName: '職業安全衛生管理人員', groupName: '人力', maxAvailable: '', startDate: '', endDate: '' },
    { resourceName: '現場工程師', groupName: '人力', maxAvailable: '', startDate: '', endDate: '' }
  ]
}

function buildManpowerHint(counts: {
  siteManagerCount: number
  qualityEngineerCount: number
  labourSafetyCount: number
  siteEngineerCount: number
}): string {
  return `依資料依據日(${dataReferenceDate.value})計算建議人數：工地主任 ${counts.siteManagerCount ?? 0}、品管工程師 ${counts.qualityEngineerCount ?? 0}、職安人員 ${counts.labourSafetyCount ?? 0}、現場工程師 ${counts.siteEngineerCount ?? 0}。`
}

async function loadManpowerDefaultHintByReferenceDate() {
  const cid = currentProject.value?.id
  if (!cid || !dataReferenceDate.value) {
    manpowerDefaultHint.value = ''
    return
  }
  try {
    const counts = await getP1ManpowerDefaultMaxAvailable(cid, dataReferenceDate.value)
    manpowerDefaultHint.value = buildManpowerHint(counts)
  } catch (e: any) {
    manpowerDefaultHint.value = ''
    const msg = e?.response?.data?.message ?? e?.message
    if (msg) console.warn('[P1] 無法取得人力建議值:', msg)
  }
}

function addManpowerRow() {
  p1ManpowerEntrySchedule.value.push({
    resourceName: '',
    groupName: '',
    maxAvailable: '',
    startDate: '',
    endDate: ''
  })
  scheduleAutoSave()
}

function removeManpowerRow(index: number) {
  p1ManpowerEntrySchedule.value.splice(index, 1)
  scheduleAutoSave()
}

function addMechanicalResourceRow() {
  p1MechanicalResources.value.push({ resourceName: '', maxAvailable: '', startDate: '', endDate: '' })
  scheduleAutoSave()
}

function removeMechanicalResourceRow(index: number) {
  p1MechanicalResources.value.splice(index, 1)
  scheduleAutoSave()
}

async function generateMechanicalResourceNamesByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  try {
    const res = await getP1MechanicalResourcesAiGenerate(cid, selectedDesignChangeId.value)
    const names = (res?.names || []).map((v) => (v ?? '').toString().trim()).filter((v) => v.length > 0)
    if (names.length === 0) {
      window.alert('目前版本無標單資料，或 AI 未產出內容。')
      return
    }
    p1MechanicalResources.value = names.map((name) => ({
      resourceName: name,
      maxAvailable: '',
      startDate: '',
      endDate: ''
    }))
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    isAiGenerating.value = false
  }
}

async function generateMaterialMarketSurveyByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  try {
    const res = await getP1MaterialMarketSurveyAiGenerate(cid, selectedDesignChangeId.value)
    const text = res?.text?.trim() ?? ''
    if (!text) {
      window.alert('目前版本無標單資料，或 AI 未產出內容。')
      return
    }
    p1MaterialMarketSurvey.value = text
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    isAiGenerating.value = false
  }
}

watch(
  [() => currentProject.value?.id, () => currentProject.value?.workspaceId, selectedDesignChangeId],
  () => {
    if (!hasCurrentProject.value || !isContractor.value) {
      p1ConstructionScaleOverview.value = ''
      manpowerDefaultHint.value = ''
      return
    }
    void loadP1Text()
  },
  { immediate: true }
)

watch(
  dataReferenceDate,
  async (newVal, oldVal) => {
    if (!newVal || newVal === oldVal) return
    await loadManpowerDefaultHintByReferenceDate()
  }
)

watch(
  () => currentProject.value?.id,
  async () => {
    await fetchDesignChangeList()
  },
  { immediate: true }
)

watch(
  [
    p1ConstructionScaleOverview,
    p1GeologyOverview,
    p1SiteCurrentConditionSurvey,
    p1UndergroundUtilitiesSurvey,
    p1MeteorologyHydrology,
    p1NeighboringBuildingSurvey,
    p1MechanicalResources,
    p1ManpowerEntrySchedule,
    p1MaterialMarketSurvey
  ],
  () => {
    scheduleAutoSave()
  }
)
</script>

<style scoped>
.form-p1-overall-plan-page {
  padding: 1rem;
  background: radial-gradient(1200px 600px at 12% 0%, rgba(var(--bs-primary-rgb), 0.06), transparent 60%),
    radial-gradient(900px 500px at 88% 10%, rgba(255, 255, 255, 0.03), transparent 55%),
    rgba(15, 23, 42, 0.10);
}
.report-card {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}
.report-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(700px 220px at 20% 0%, rgba(var(--bs-primary-rgb), 0.12), transparent 55%);
  opacity: 0.9;
  pointer-events: none;
}
.report-card--full {
  width: 100%;
}
.report-card :deep(.card-body) {
  background: transparent;
}
.report-card__body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.b2-content-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-top: -0.1rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}
.p1-toolbar-left {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 330px;
}
.p1-toolbar-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}
.p1-refdate-label {
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.p1-refdate-picker {
  min-width: 190px;
  max-width: 240px;
}
.p1-refdate-picker :deep(.dp__input) {
  height: 34px;
  border-radius: 0.5rem;
}
.p1-info-icon {
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.85rem;
  cursor: help;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  position: relative;
}
.p1-info-icon::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  top: calc(100% + 8px);
  transform: translateX(-50%);
  min-width: 280px;
  max-width: 380px;
  padding: 0.45rem 0.6rem;
  border-radius: 0.45rem;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.94);
  font-size: 0.76rem;
  line-height: 1.35;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  opacity: 0;
  pointer-events: none;
  z-index: 30;
  transition: opacity 0.15s ease;
  white-space: normal;
}
.p1-info-icon::before {
  content: '';
  position: absolute;
  left: 50%;
  top: calc(100% + 2px);
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(255, 255, 255, 0.18);
  opacity: 0;
  pointer-events: none;
  z-index: 30;
}
.p1-info-icon:hover::after,
.p1-info-icon:hover::before,
.p1-info-icon:focus-visible::after,
.p1-info-icon:focus-visible::before {
  opacity: 1;
}
.b2-export-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1.2rem;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #fff !important;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(
    145deg,
    rgba(var(--bs-primary-rgb), 0.58) 0%,
    rgba(var(--bs-primary-rgb), 0.32) 42%,
    rgba(15, 23, 42, 0.45) 100%
  );
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease,
    filter 0.16s ease;
}
.b2-export-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.38);
  filter: brightness(1.05);
  box-shadow:
    0 8px 24px rgba(var(--bs-primary-rgb), 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.b2-export-btn:active:not(:disabled) {
  transform: translateY(0);
  filter: brightness(0.98);
}
.b2-export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}
.text-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0.9rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.20);
}
.text-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}
.text-panel__label {
  display: flex;
  align-items: center;
  font-weight: 700;
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
  color: rgba(255, 255, 255, 0.90);
}
.text-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  margin: 0;
}
.text-panel__toolbar .btn-ai-generate {
  padding: 0.45rem 1.05rem;
  font-size: 0.92rem;
}
.text-panel__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.text-panel__textarea {
  flex: 1 1 auto;
  min-height: 10rem;
  width: 100%;
  resize: vertical;
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
}
.text-panel__textarea:focus {
  background: rgba(0, 0, 0, 0.20);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
  color: rgba(255, 255, 255, 0.92);
}
.text-panel__textarea::placeholder {
  color: rgba(255, 255, 255, 0.45);
}
.text-panels {
  position: relative;
}
.text-panels__ai-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(1px);
  border-radius: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.text-panels__ai-overlay-inner {
  text-align: center;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.80);
  border: 1px solid rgba(255, 255, 255, 0.16);
}
.section-card {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.20);
  border-radius: 0.85rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(0, 0, 0, 0.15));
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.25);
}
.section-card__header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}
.section-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem;
}
.site-judgement-grid {
  display: grid;
  gap: 0.75rem;
}
.site-judgement-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.site-judgement-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (max-width: 1200px) {
  .site-judgement-grid--3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .site-judgement-grid--2,
  .site-judgement-grid--3 {
    grid-template-columns: 1fr;
  }
}
.btn-default-fill {
  padding: 0.45rem 1.05rem;
  font-size: 0.92rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.92);
  background: rgba(30, 41, 59, 0.65);
}
.btn-default-fill:hover {
  background: rgba(51, 65, 85, 0.85);
}
.table-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}
.table-toolbar-inline {
  gap: 0.5rem;
}
.subsection-title {
  font-weight: 700;
  color: rgba(226, 232, 240, 0.95);
  margin-bottom: 0.5rem;
}
.resource-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.85rem;
}
@media (max-width: 1200px) {
  .resource-layout {
    grid-template-columns: 1fr;
  }
}
.table-scroll-wrap {
  max-height: 420px;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.65rem;
  background: rgba(2, 6, 23, 0.45);
}
.p1-resource-table {
  margin: 0;
  color: rgba(241, 245, 249, 0.95);
}
.p1-resource-table thead th {
  position: sticky;
  top: 0;
  z-index: 12;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(226, 232, 240, 0.92);
}
.p1-resource-table tbody td {
  background: rgba(15, 23, 42, 0.45);
  border-color: rgba(255, 255, 255, 0.10);
}
.p1-resource-table input.form-control {
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
}
:deep(.p1-date-input),
:deep(.p1-date-input input) {
  background: rgba(0, 0, 0, 0.18) !important;
  border-color: rgba(255, 255, 255, 0.18) !important;
  color: rgba(255, 255, 255, 0.92) !important;
}
:deep(.p1-date-input .dp__input) {
  text-align: left !important;
  padding-left: 2rem !important;
  padding-right: 0.75rem !important;
}
:deep(.p1-date-input .dp__input_icon) {
  left: 0.6rem !important;
  right: auto !important;
  z-index: 0 !important;
}
</style>
