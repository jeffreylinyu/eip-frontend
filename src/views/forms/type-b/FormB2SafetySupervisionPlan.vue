<template>
  <div class="form-b2-safety-supervision-plan-page">
    <PageHeader
      :title="b2PageTitle"
      icon="fa fa-clipboard-check"
      :breadcrumbs="b2PageBreadcrumbs"
    >
      <template v-if="hasCurrentProject" #extra>
        <DesignChangeVersionSwitcher
          :model-value="selectedDesignChangeId"
          :construction-id="currentProject?.id"
          source-type="SUPERVISORY"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <Card v-if="hasCurrentProject" class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div class="b2-content-toolbar">
          <div class="b2-toolbar-left">
            <label class="b2-refdate-label" for="b2-data-reference-date">
              資料依據日
              <span
                class="b2-refdate-help"
                data-tooltip="此日期用於匯出時的人員統計與內容判斷;預設會帶入目前版本的起始日。"
                aria-label="資料依據日說明"
                tabindex="0"
              >
                <i class="fa fa-circle-info"></i>
              </span>
            </label>
            <RepublicDatePicker
              id="b2-data-reference-date"
              v-model="dataReferenceDate"
              class="b2-refdate-picker"
              placeholder="請選擇資料依據日"
              value-format="YYYY-MM-DD"
              auto-apply
            />
          </div>
          <div class="b2-toolbar-right">
          <div v-if="selectedDesignChangeId != null" class="btn-group">
            <button
              type="button"
              class="btn btn-sm btn-outline-primary dropdown-toggle"
              :disabled="isCopying"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="自前一個變更設計版本複製 B-2 內容與圖片到目前版本（覆寫）"
            >
              <i class="fa me-1" :class="isCopying ? 'fa-spinner fa-spin' : 'fa-copy'"></i>
              {{ isCopying ? '複製中...' : '複製前一個版本' }}
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <button
                  type="button"
                  class="dropdown-item text-danger"
                  :disabled="isCopying"
                  @click="copyFromPrevious"
                >
                  覆寫目前版本（B-2）
                </button>
              </li>
            </ul>
          </div>
          <button
            v-if="isSuperAdmin"
            type="button"
            class="btn-ai-generate b2-batch-ai-btn"
            :disabled="isB2AiGenerating || !currentProject?.id"
            title="依目前版本標單由 AI 一次生成上方所有文字欄位（地理人文、工程地點、規模概述、預算）"
            @click="generateAllB2TextByAi"
          >
            <i class="fa me-2" :class="isB2AiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
            <span>{{ isB2AiGenerating ? '生成中…' : '一鍵 AI 生成' }}</span>
          </button>
          <button
            type="button"
            class="btn b2-export-btn"
            :disabled="isExporting || !currentProject?.id"
            title="匯出安全衛生監督查核計畫（Word）"
            @click="exportB2SafetyPlan"
          >
            <i class="fa fa-file-word"></i>
            <span>匯出 Word</span>
          </button>
          </div>
        </div>
        <div v-if="textLoadError" class="alert alert-danger py-2 mb-0">
          {{ textLoadError }}
        </div>

        <div v-else-if="isTextLoading" class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入文字內容中…
        </div>

        <div v-else class="text-panels text-panels--ai-wrap">
          <div v-if="isB2AiGenerating" class="text-panels__ai-overlay" aria-live="polite">
            <div class="text-panels__ai-overlay-inner">
              <i class="fa fa-spinner fa-spin fa-2x mb-2 text-primary"></i>
              <div class="fw-semibold">AI 生成中…</div>
              <div class="small text-muted mt-1">產生內容後會自動儲存至目前版本</div>
            </div>
          </div>
          <div class="text-panel">
            <div class="text-panel__header">
              <div class="text-panel__label">
                <i class="fa fa-globe-asia me-2 text-info"></i>
                地理人文環境概述
              </div>
              <div class="text-panel__toolbar">
                <button
                  v-if="isSuperAdmin"
                  type="button"
                  class="btn-ai-generate"
                  :disabled="aiLoading.geo || !currentProject?.id"
                  @click="generateB2TextByAi('GEO_HUMAN_ENVIRONMENT_OVERVIEW')"
                  title="依目前版本標單由 AI 產出地理人文環境概述（用於 B-2 安全衛生監督查核計畫）"
                >
                  <i class="fa me-2" :class="aiLoading.geo ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                  {{ aiLoading.geo ? '生成中…' : '依標單 AI 生成' }}
                </button>
              </div>
            </div>
            <div class="text-panel__body">
              <textarea
                v-model="b2GeoHumanEnvironmentOverview"
                class="form-control text-panel__textarea"
                rows="5"
                placeholder="請輸入地理、人文、環境等概述（依版本）"
              />
            </div>
          </div>

          <div class="text-panel">
            <div class="text-panel__header">
              <div class="text-panel__label">
                <i class="fa fa-map-location-dot me-2 text-primary"></i>
                工程地點及客觀環境
              </div>
              <div class="text-panel__toolbar">
                <button
                  v-if="isSuperAdmin"
                  type="button"
                  class="btn-ai-generate"
                  :disabled="aiLoading.env || !currentProject?.id"
                  @click="generateB2TextByAi('LOCATION_OBJECTIVE_ENVIRONMENT')"
                  title="依目前版本標單由 AI 產出工程地點及客觀環境（用於 B-2 安全衛生監督查核計畫）"
                >
                  <i class="fa me-2" :class="aiLoading.env ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                  {{ aiLoading.env ? '生成中…' : '依標單 AI 生成' }}
                </button>
              </div>
            </div>
            <div class="text-panel__body">
              <textarea
                v-model="b2LocationObjectiveEnvironment"
                class="form-control text-panel__textarea"
                rows="5"
                placeholder="請輸入工程地點、交通、鄰近設施、施工限制等（依版本）"
              />
            </div>
          </div>

          <div class="text-panel">
            <div class="text-panel__header">
              <div class="text-panel__label">
                <i class="fa fa-ruler-combined me-2 text-warning"></i>
                工程規模概述
              </div>
              <div class="text-panel__toolbar">
                <button
                  v-if="isSuperAdmin"
                  type="button"
                  class="btn-ai-generate"
                  :disabled="aiLoading.scale || !currentProject?.id"
                  @click="generateB2TextByAi('CONSTRUCTION_SCALE_OVERVIEW')"
                  title="依目前版本標單由 AI 產出工程規模概述（用於 B-2 安全衛生監督查核計畫）"
                >
                  <i class="fa me-2" :class="aiLoading.scale ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                  {{ aiLoading.scale ? '生成中…' : '依標單 AI 生成' }}
                </button>
              </div>
            </div>
            <div class="text-panel__body">
              <textarea
                v-model="b2ConstructionScaleOverview"
                class="form-control text-panel__textarea"
                rows="6"
                placeholder="請輸入工程規模、主要工項與範圍（依版本；B-2 獨立欄位）"
              />
            </div>
          </div>

          <div class="text-panel">
            <div class="text-panel__header">
              <div class="text-panel__label">
                <i class="fa fa-coins me-2 text-success"></i>
                工程預算
              </div>
              <div class="text-panel__toolbar">
                <button
                  v-if="isSuperAdmin"
                  type="button"
                  class="btn-ai-generate"
                  :disabled="aiLoading.budget || !currentProject?.id"
                  @click="generateB2TextByAi('CONSTRUCTION_BUDGET_TEXT')"
                  title="依目前版本標單由 AI 產出工程預算（用於 B-2 安全衛生監督查核計畫；固定格式）"
                >
                  <i class="fa me-2" :class="aiLoading.budget ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                  {{ aiLoading.budget ? '生成中…' : '依標單 AI 生成' }}
                </button>
              </div>
            </div>
            <div class="text-panel__body">
              <textarea
                v-model="b2ConstructionBudgetText"
                class="form-control text-panel__textarea text-panel__textarea--mono"
                rows="6"
                placeholder="本工程預算發包工程費約○○億元，其他費用約為○○億元。工程經費總計約○○億元。&#10;其他費用內容為：空氣污染防制費、二級品管委外試驗費、工程管理費、物價指數調整費、既有管線遷移及修護費等項目。"
              />
            </div>
          </div>
        </div>

        <div class="mt-3">
          <B2EmergencyOrgChart ref="orgChartRef" v-model="b2EmergencyOrgChart" />
        </div>

        <div v-if="loadError" class="alert alert-danger py-2 mb-0">
          {{ loadError }}
        </div>

        <div v-else-if="isLoading" class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入中…
        </div>

        <div v-else class="sections">
          <div v-for="section in sections" :key="section.type" class="section-card">
            <button
              type="button"
              class="section-card__header"
              @click="toggleSection(section.type)"
              :aria-expanded="expandedByType[section.type] ? 'true' : 'false'"
            >
              <div class="section-card__header-left">
                <div class="section-icon" :class="section.iconBg">
                  <i class="fa" :class="section.icon"></i>
                </div>
                <div class="section-title-wrap">
                  <div class="section-title">{{ section.title }}</div>
                </div>
              </div>
              <div class="section-card__header-right">
                <span class="count-badge" :class="section.countBadgeClass">
                  {{ section.list.value.length }}
                </span>
                <i class="fa chevron" :class="expandedByType[section.type] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              </div>
            </button>

            <div v-show="expandedByType[section.type]" class="section-card__body">
              <div class="section-surface">
                <div class="section-toolbar">
                  <div class="section-toolbar__left">
                    <div class="pending-pill" v-if="pendingByType[section.type].length">
                      <i class="fa fa-paperclip me-2"></i>
                      已選取 {{ pendingByType[section.type].length }} 張，按「上傳」送出
                    </div>
                    <div class="text-muted small" v-else>
                      請先選取圖片，再點擊上傳。
                    </div>
                  </div>
                  <div class="section-toolbar__right">
                    <label class="file-pick">
                      <input
                        class="file-pick__input"
                        type="file"
                        accept="image/png,image/jpeg"
                        multiple
                        :disabled="isUploading"
                        @change="(e) => onPickFiles(e, section.type)"
                      />
                      <span
                        class="btn btn-sm btn-outline-light file-pick__btn"
                        :class="{ disabled: isUploading }"
                      >
                        <i class="fa fa-folder-open me-1"></i>選取圖片
                      </span>
                    </label>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary loc-upload-btn"
                      :disabled="isUploading || pendingByType[section.type].length === 0"
                      @click="uploadPending(section.type)"
                      title="上傳選取的圖片"
                    >
                      <i class="fa me-1" :class="isUploading ? 'fa-spinner fa-spin' : 'fa-upload'"></i>
                      {{ isUploading ? '上傳中…' : '上傳圖片' }}
                    </button>
                  </div>
                </div>

                <div v-if="section.list.value.length === 0" class="empty-state">
                  <div class="empty-state__icon">
                    <i class="fa fa-image"></i>
                  </div>
                  <div class="empty-state__text">尚未上傳{{ section.title }}。</div>
                </div>

                <div v-else class="row g-3 mt-2">
                  <div v-for="img in section.list.value" :key="img.id" class="col-12 col-sm-6 col-lg-4">
                    <div class="loc-card">
                      <ConstructionLocationMapThumb
                        v-if="currentProject?.id"
                        :img="img"
                        :construction-id="currentProject.id"
                        :design-change-id="selectedDesignChangeId"
                        :type="section.type"
                        link-class="loc-thumb"
                        empty-class="loc-thumb loc-thumb--empty"
                        show-b2-overlay
                      />

                      <div class="loc-meta">
                        <div class="loc-name" :title="img.fileName">{{ img.fileName }}</div>
                        <div class="loc-actions">
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            :disabled="deletingId === img.id"
                            @click="removeImage(section.type, img.id)"
                            title="刪除"
                          >
                            <i class="fa" :class="deletingId === img.id ? 'fa-spinner fa-spin' : 'fa-trash'"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 工程項目標單「安全衛生設施」：置於頁面最下方；可收合 + 樹狀表 -->
        <B2PccesSafetyFacilitySection
          v-if="hasCurrentProject && currentProject"
          :construction-id="currentProject.id"
          :design-change-id="selectedDesignChangeId"
          class="mt-3"
        />
      </CardBody>
    </Card>

    <div v-else class="alert alert-danger">
      請先選擇工程案。
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, nextTick } from 'vue'
import { useViewPerspective } from '@/composables/useViewPerspective'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import ConstructionLocationMapThumb from '@/components/common/ConstructionLocationMapThumb.vue'
import B2EmergencyOrgChart from '@/components/forms/B2EmergencyOrgChart.vue'
import B2PccesSafetyFacilitySection from '@/components/forms/B2PccesSafetyFacilitySection.vue'
import { useExportLoading } from '@/composables/useExportLoading'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  getConstructionDetail,
  updateConstruction,
  getB2TextsAiGenerate,
  uploadB2EmergencyOrgChartImage,
  copyB2FromPreviousVersion,
  type B2TextAiField
} from '@/api/construction'
import { getDesignChangeList } from '@/api/designChange'
import {
  listConstructionLocationMaps,
  uploadConstructionLocationMaps,
  deleteConstructionLocationMap,
  type ConstructionLocationMapImageInfo
} from '@/api/constructionLocationMaps'
import { formBApi, downloadBlobAsFile, type ExportConstructionReportRequest } from '@/api/forms'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
const workspaceStore = useWorkspaceStore()
const { isSuperAdmin } = useViewPerspective()
const { runWithExportLoading } = useExportLoading()

const b2PageTitle = 'B-2 安全衛生監督查核計畫'

const b2PageBreadcrumbs = [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: 'B類表單', href: 'javascript:;' },
  { text: 'B-2 安全衛生監督查核計畫', active: true }
]

const hasCurrentProject = computed(() => !!workspaceStore.currentProject?.id)
const currentProject = computed(() => workspaceStore.currentProject)

const selectedDesignChangeId = ref<number | null>(null)
const dataReferenceDate = ref('')
const designChangeList = ref<{ id: number; effectiveDate: string }[]>([])
const isCopying = ref(false)
type ImageType = 'LOCATION_MAP' | 'SCOPE_DIAGRAM' | 'SECTION_DIAGRAM'

const isTextLoading = ref(false)
const textLoadError = ref('')
const isSavingTexts = ref(false)
const b2GeoHumanEnvironmentOverview = ref('')
const b2LocationObjectiveEnvironment = ref('')
const b2ConstructionScaleOverview = ref('')
const b2ConstructionBudgetText = ref('')
const b2EmergencyOrgChart = ref<any | null>(null)
const orgChartRef = ref<any | null>(null)
const lastLoadedB2Texts = ref({
  b2GeoHumanEnvironmentOverview: '',
  b2LocationObjectiveEnvironment: '',
  b2ConstructionScaleOverview: '',
  b2ConstructionBudgetText: '',
  b2EmergencyOrgChartJson: ''
})

/** 遠端載入套用中，避免觸發自動儲存 */
let skipTextAutoSave = false
let textAutoSaveTimer: ReturnType<typeof window.setTimeout> | null = null
/** 停止輸入後延遲寫入，不打斷連續打字、不搶 focus */
const TEXT_AUTOSAVE_MS = 1500

/** 用 reactive 直接改欄位，避免 ref 替換整個 object 時部分環境下按鈕 loading 不刷新 */
const aiLoading = reactive({ geo: false, env: false, scale: false, budget: false })
/** 整段流程（含後續自動儲存）顯示遮罩，避免只依按鈕 spinner 不明顯 */
const isB2AiGenerating = ref(false)

const locationMapImages = ref<ConstructionLocationMapImageInfo[]>([])
const scopeDiagramImages = ref<ConstructionLocationMapImageInfo[]>([])
const sectionDiagramImages = ref<ConstructionLocationMapImageInfo[]>([])
const isLoading = ref(false)
const loadError = ref('')

const pendingByType = ref<Record<ImageType, File[]>>({
  LOCATION_MAP: [],
  SCOPE_DIAGRAM: [],
  SECTION_DIAGRAM: []
})
const expandedByType = ref<Record<ImageType, boolean>>({
  LOCATION_MAP: true,
  SCOPE_DIAGRAM: true,
  SECTION_DIAGRAM: true
})
const isUploading = ref(false)
const deletingId = ref<number | null>(null)
const isExporting = ref(false)

const sourceDesignChangeIdForCopy = computed(() => {
  const current = selectedDesignChangeId.value
  if (current == null) return null
  const list = designChangeList.value
  const idx = list.findIndex((d) => d.id === current)
  if (idx <= 0) return null
  return list[idx - 1]?.id ?? null
})

function getListRef(type: ImageType) {
  if (type === 'LOCATION_MAP') return locationMapImages
  if (type === 'SCOPE_DIAGRAM') return scopeDiagramImages
  return sectionDiagramImages
}

const sections = computed(() => [
  {
    type: 'LOCATION_MAP' as const,
    title: '工程位置圖',
    icon: 'fa-map-marked-alt',
    iconBg: 'section-icon--primary',
    countBadgeClass: 'count-badge--primary',
    list: locationMapImages
  },
  {
    type: 'SCOPE_DIAGRAM' as const,
    title: '工程範圍示意圖',
    icon: 'fa-draw-polygon',
    iconBg: 'section-icon--info',
    countBadgeClass: 'count-badge--info',
    list: scopeDiagramImages
  },
  {
    type: 'SECTION_DIAGRAM' as const,
    title: '工程斷面示意圖',
    icon: 'fa-layer-group',
    iconBg: 'section-icon--warning',
    countBadgeClass: 'count-badge--warning',
    list: sectionDiagramImages
  }
])

function toggleSection(type: ImageType) {
  expandedByType.value = { ...expandedByType.value, [type]: !expandedByType.value[type] }
}

const hasTextChanges = computed(() => {
  const currentOrgJson = stringifyOrgChart(b2EmergencyOrgChart.value)
  return (
    b2GeoHumanEnvironmentOverview.value !== lastLoadedB2Texts.value.b2GeoHumanEnvironmentOverview ||
    b2LocationObjectiveEnvironment.value !== lastLoadedB2Texts.value.b2LocationObjectiveEnvironment ||
    b2ConstructionScaleOverview.value !== lastLoadedB2Texts.value.b2ConstructionScaleOverview ||
    b2ConstructionBudgetText.value !== lastLoadedB2Texts.value.b2ConstructionBudgetText ||
    currentOrgJson !== lastLoadedB2Texts.value.b2EmergencyOrgChartJson
  )
})

function stringifyOrgChart(v: any | null): string {
  if (v == null) return ''
  try {
    return JSON.stringify(v)
  } catch {
    return ''
  }
}

async function loadB2Texts() {
  cancelTextAutoSave()
  const cid = currentProject.value?.id
  const wid = currentProject.value?.workspaceId
  if (!cid || !wid) {
    skipTextAutoSave = true
    b2GeoHumanEnvironmentOverview.value = ''
    b2LocationObjectiveEnvironment.value = ''
    b2ConstructionScaleOverview.value = ''
    b2ConstructionBudgetText.value = ''
    b2EmergencyOrgChart.value = null
    lastLoadedB2Texts.value = {
      b2GeoHumanEnvironmentOverview: '',
      b2LocationObjectiveEnvironment: '',
      b2ConstructionScaleOverview: '',
      b2ConstructionBudgetText: '',
      b2EmergencyOrgChartJson: ''
    }
    await nextTick()
    skipTextAutoSave = false
    return
  }

  isTextLoading.value = true
  textLoadError.value = ''
  try {
    const data = await getConstructionDetail(
      cid,
      wid,
      'SUPERVISORY',
      selectedDesignChangeId.value
    )
    skipTextAutoSave = true
    b2GeoHumanEnvironmentOverview.value = data.b2GeoHumanEnvironmentOverview ?? ''
    b2LocationObjectiveEnvironment.value = data.b2LocationObjectiveEnvironment ?? ''
    b2ConstructionScaleOverview.value = data.b2ConstructionScaleOverview ?? ''
    b2ConstructionBudgetText.value = data.b2ConstructionBudgetText ?? ''
    const orgJson = data.b2EmergencyOrgChartJson ?? ''
    b2EmergencyOrgChart.value = orgJson ? JSON.parse(orgJson) : null
    lastLoadedB2Texts.value = {
      b2GeoHumanEnvironmentOverview: b2GeoHumanEnvironmentOverview.value,
      b2LocationObjectiveEnvironment: b2LocationObjectiveEnvironment.value,
      b2ConstructionScaleOverview: b2ConstructionScaleOverview.value,
      b2ConstructionBudgetText: b2ConstructionBudgetText.value,
      b2EmergencyOrgChartJson: orgJson || ''
    }
    await nextTick()
    skipTextAutoSave = false
  } catch (e: any) {
    textLoadError.value = e?.response?.data?.message ?? e?.message ?? '載入文字內容失敗'
    skipTextAutoSave = true
    b2GeoHumanEnvironmentOverview.value = ''
    b2LocationObjectiveEnvironment.value = ''
    b2ConstructionScaleOverview.value = ''
    b2ConstructionBudgetText.value = ''
    b2EmergencyOrgChart.value = null
    lastLoadedB2Texts.value = {
      b2GeoHumanEnvironmentOverview: '',
      b2LocationObjectiveEnvironment: '',
      b2ConstructionScaleOverview: '',
      b2ConstructionBudgetText: '',
      b2EmergencyOrgChartJson: ''
    }
    await nextTick()
    skipTextAutoSave = false
  } finally {
    isTextLoading.value = false
  }
}

async function saveB2Texts() {
  const cid = currentProject.value?.id
  if (!cid || !hasTextChanges.value) return
  if (isSavingTexts.value) return
  isSavingTexts.value = true
  try {
    await updateConstruction(
      cid,
      {
        b2GeoHumanEnvironmentOverview: b2GeoHumanEnvironmentOverview.value,
        b2LocationObjectiveEnvironment: b2LocationObjectiveEnvironment.value,
        b2ConstructionScaleOverview: b2ConstructionScaleOverview.value,
        b2ConstructionBudgetText: b2ConstructionBudgetText.value,
        b2EmergencyOrgChartJson: stringifyOrgChart(b2EmergencyOrgChart.value)
      } as any,
      selectedDesignChangeId.value
    )

    // 同步上傳「組織圖圖片」供 Word 匯出插圖用（方案A）
    try {
      const blob: Blob | undefined = await orgChartRef.value?.exportOrgChartPngBlob?.()
      if (blob) {
        await uploadB2EmergencyOrgChartImage(cid, blob, selectedDesignChangeId.value)
      }
    } catch (e: any) {
      // 不阻斷文字儲存；圖片上傳失敗只提示
      console.warn('upload org chart image failed', e)
    }

    lastLoadedB2Texts.value = {
      b2GeoHumanEnvironmentOverview: b2GeoHumanEnvironmentOverview.value,
      b2LocationObjectiveEnvironment: b2LocationObjectiveEnvironment.value,
      b2ConstructionScaleOverview: b2ConstructionScaleOverview.value,
      b2ConstructionBudgetText: b2ConstructionBudgetText.value,
      b2EmergencyOrgChartJson: stringifyOrgChart(b2EmergencyOrgChart.value)
    }
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
    window.alert(msg)
  } finally {
    isSavingTexts.value = false
    // 儲存過程中若使用者又改動，再排程一次
    if (hasTextChanges.value) {
      scheduleTextAutoSave()
    }
  }
}

function cancelTextAutoSave() {
  if (textAutoSaveTimer != null) {
    clearTimeout(textAutoSaveTimer)
    textAutoSaveTimer = null
  }
}

function scheduleTextAutoSave() {
  if (skipTextAutoSave) return
  if (isTextLoading.value) return
  if (isB2AiGenerating.value) return
  if (!hasCurrentProject.value) return
  cancelTextAutoSave()
  textAutoSaveTimer = window.setTimeout(() => {
    textAutoSaveTimer = null
    void maybeAutoSaveB2Texts()
  }, TEXT_AUTOSAVE_MS)
}

async function maybeAutoSaveB2Texts() {
  if (isSavingTexts.value) return
  if (!hasTextChanges.value) return
  await saveB2Texts()
}

async function flushPendingTextSave() {
  cancelTextAutoSave()
  let wait = 0
  const maxWaitTicks = 100 // 100 * 50ms = 5s
  while (isSavingTexts.value && wait < maxWaitTicks) {
    await new Promise((r) => setTimeout(r, 50))
    wait++
  }
  // 若前一筆儲存超時仍未結束，避免匯出流程被無限卡住
  if (isSavingTexts.value) return
  if (!hasTextChanges.value) return
  const cid = currentProject.value?.id
  if (!cid) return
  await saveB2Texts()
}

async function onVersionChange(v: number | null) {
  await flushPendingTextSave()
  selectedDesignChangeId.value = v
  dataReferenceDate.value = resolveVersionStartDate(v)
}

async function fetchDesignChangeList() {
  const cid = currentProject.value?.id
  if (!cid) {
    designChangeList.value = []
    return
  }
  try {
    const list = await getDesignChangeList(cid, 'SUPERVISORY')
    designChangeList.value = [...list].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    )
  } catch {
    designChangeList.value = []
  }
  dataReferenceDate.value = resolveVersionStartDate(selectedDesignChangeId.value)
}

function resolveVersionStartDate(designChangeId: number | null): string {
  if (designChangeId == null) return new Date().toISOString().slice(0, 10)
  const target = designChangeList.value.find((d) => d.id === designChangeId)
  return target?.effectiveDate?.split('T')[0] || new Date().toISOString().slice(0, 10)
}

async function copyFromPrevious() {
  const cid = currentProject.value?.id
  const target = selectedDesignChangeId.value
  if (!cid || target == null) return
  if (
    !window.confirm(
      '將前一個版本的 B-2 內容覆寫到目前版本（含四欄文字、緊急應變組織圖與三類圖片）。\n\n此動作無法復原，確定嗎？'
    )
  ) {
    return
  }
  isCopying.value = true
  try {
    const source = sourceDesignChangeIdForCopy.value
    await copyB2FromPreviousVersion(cid, source, target)
    await Promise.all([
      loadB2Texts(),
      loadImages('LOCATION_MAP'),
      loadImages('SCOPE_DIAGRAM'),
      loadImages('SECTION_DIAGRAM')
    ])
    window.alert('已完成 B-2 複製（覆寫目前版本）')
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '複製失敗'
    window.alert(msg)
  } finally {
    isCopying.value = false
  }
}

async function generateB2TextByAi(field: B2TextAiField) {
  const cid = currentProject.value?.id
  if (!cid) return

  cancelTextAutoSave()

  const setLoading = (v: boolean) => {
    if (field === 'GEO_HUMAN_ENVIRONMENT_OVERVIEW') aiLoading.geo = v
    else if (field === 'LOCATION_OBJECTIVE_ENVIRONMENT') aiLoading.env = v
    else if (field === 'CONSTRUCTION_SCALE_OVERVIEW') aiLoading.scale = v
    else aiLoading.budget = v
  }

  isB2AiGenerating.value = true
  setLoading(true)
  try {
    const res = await getB2TextsAiGenerate(cid, field, selectedDesignChangeId.value)
    const text = res?.text?.trim() ?? ''
    if (!text) {
      if (typeof (window as any).alert === 'function')
        (window as any).alert('目前版本無標單資料，或 AI 未產出內容。請先匯入標單或手動填寫。')
      return
    }
    if (field === 'GEO_HUMAN_ENVIRONMENT_OVERVIEW') b2GeoHumanEnvironmentOverview.value = text
    else if (field === 'LOCATION_OBJECTIVE_ENVIRONMENT') b2LocationObjectiveEnvironment.value = text
    else if (field === 'CONSTRUCTION_SCALE_OVERVIEW') b2ConstructionScaleOverview.value = text
    else b2ConstructionBudgetText.value = text

    // 生成成功後自動儲存至目前版本
    await saveB2Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試或手動填寫。'
    if (typeof (window as any).alert === 'function') (window as any).alert(msg)
  } finally {
    setLoading(false)
    isB2AiGenerating.value = false
  }
}

/**
 * 一鍵 AI 生成：**並行**對頁面上 4 個 AI 欄位呼叫生成 API。
 *
 * 為何用並行 (Promise.allSettled)：
 * - 4 個欄位互不相依，不需要互等。
 * - 比起 sequential 4 次來回（4 × RTT + 4 × LLM latency），改成 max(4 × LLM latency)
 *   實際大幅縮短整體等待時間。
 *
 * 為何用 allSettled 而不是 all：
 * - 任何一個欄位失敗都不應該打斷其他欄位的成功結果。
 * - 已成功生成的欄位仍然會寫入 ref 並一次性儲存；失敗的欄位列在最後彈窗給使用者，
 *   可以單獨重新生成。
 *
 * 為何只 saveB2Texts 一次：
 * - sequential 版本每欄都呼叫一次 saveB2Texts → 4 次寫入後端。
 * - 並行版本所有 ref 都寫好後統一儲存一次，網路成本降低且避免並發寫入競態。
 */
async function generateAllB2TextByAi() {
  if (!currentProject.value?.id) return
  if (isB2AiGenerating.value) return
  const cid = currentProject.value.id

  // 中斷自動儲存，避免邊生成邊存
  cancelTextAutoSave()
  isB2AiGenerating.value = true
  aiLoading.geo = true
  aiLoading.env = true
  aiLoading.scale = true
  aiLoading.budget = true

  type FieldSpec = {
    field: B2TextAiField
    apply: (text: string) => void
    loadingKey: 'geo' | 'env' | 'scale' | 'budget'
    label: string
  }
  const fields: FieldSpec[] = [
    { field: 'GEO_HUMAN_ENVIRONMENT_OVERVIEW', apply: t => (b2GeoHumanEnvironmentOverview.value = t), loadingKey: 'geo', label: '地理人文環境概述' },
    { field: 'LOCATION_OBJECTIVE_ENVIRONMENT', apply: t => (b2LocationObjectiveEnvironment.value = t), loadingKey: 'env', label: '工程地點及客觀環境' },
    { field: 'CONSTRUCTION_SCALE_OVERVIEW', apply: t => (b2ConstructionScaleOverview.value = t), loadingKey: 'scale', label: '工程規模概述' },
    { field: 'CONSTRUCTION_BUDGET_TEXT', apply: t => (b2ConstructionBudgetText.value = t), loadingKey: 'budget', label: '工程預算' },
  ]
  const failed: string[] = []
  let hadAny = false

  try {
    const results = await Promise.allSettled(
      fields.map(f => getB2TextsAiGenerate(cid, f.field, selectedDesignChangeId.value)),
    )
    results.forEach((r, idx) => {
      const spec = fields[idx]
      // 每欄位結束就把個別 loading 關掉，讓使用者可以看到漸進進度
      aiLoading[spec.loadingKey] = false
      if (r.status === 'fulfilled') {
        const text = r.value?.text?.trim() ?? ''
        if (text) {
          spec.apply(text)
          hadAny = true
        } else {
          failed.push(`${spec.label}（無內容；可能是版本沒標單）`)
        }
      } else {
        const e: any = r.reason
        const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗'
        failed.push(`${spec.label}（${msg}）`)
      }
    })
    if (hadAny) {
      await saveB2Texts()
    }
    if (failed.length > 0 && typeof (window as any).alert === 'function') {
      ;(window as any).alert(
        '部分欄位未生成（其餘已成功生成並儲存）：\n- '
        + failed.join('\n- ')
        + '\n\n可單獨重試失敗欄位，或檢查版本標單後再執行一鍵 AI 生成。',
      )
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '一鍵生成過程發生錯誤'
    if (typeof (window as any).alert === 'function') (window as any).alert(msg)
  } finally {
    aiLoading.geo = false
    aiLoading.env = false
    aiLoading.scale = false
    aiLoading.budget = false
    isB2AiGenerating.value = false
  }
}

async function loadImages(type: ImageType) {
  const cid = currentProject.value?.id
  if (!cid) {
    getListRef(type).value = []
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const list = await listConstructionLocationMaps(cid, type, selectedDesignChangeId.value)
    getListRef(type).value = (list || [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0))
  } catch (e: any) {
    loadError.value = e?.response?.data?.message ?? e?.message ?? '載入失敗'
    getListRef(type).value = []
  } finally {
    isLoading.value = false
  }
}

function onPickFiles(evt: Event, type: ImageType) {
  const input = evt.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length === 0) return

  pendingByType.value = { ...pendingByType.value, [type]: files }
}

async function uploadPending(type: ImageType) {
  const cid = currentProject.value?.id
  if (!cid) return
  const pending = pendingByType.value[type] || []
  if (pending.length === 0) return
  isUploading.value = true
  try {
    await uploadConstructionLocationMaps(cid, pending, type, selectedDesignChangeId.value)
    pendingByType.value = { ...pendingByType.value, [type]: [] }
    await loadImages(type)
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '上傳失敗'
    window.alert(msg)
  } finally {
    isUploading.value = false
  }
}

async function removeImage(type: ImageType, id: number) {
  const cid = currentProject.value?.id
  if (!cid) return
  if (!window.confirm('確定要刪除這張工程位置圖？')) return
  deletingId.value = id
  try {
    await deleteConstructionLocationMap(cid, id, type, selectedDesignChangeId.value)
    await loadImages(type)
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '刪除失敗'
    window.alert(msg)
  } finally {
    deletingId.value = null
  }
}

async function exportB2SafetyPlan() {
  const cid = currentProject.value?.id
  if (!cid) {
    window.alert('請先選擇工程案')
    return
  }
  isExporting.value = true
  try {
    const taskId = `b2-export-${cid}-${Date.now()}`
    const res = await runWithExportLoading(
      taskId,
      'B-2 安全衛生監督查核計畫',
      async (signal) => {
        // 點擊後即顯示匯出任務，整段前置流程都納入同一個 loading 任務
        await flushPendingTextSave()

        // 匯出前強制重產並上傳「組織圖圖片」，避免用到舊的 objectName
        try {
          const blob: Blob | undefined = await orgChartRef.value?.exportOrgChartPngBlob?.()
          if (blob) {
            await uploadB2EmergencyOrgChartImage(cid, blob, selectedDesignChangeId.value)
          }
        } catch (e: any) {
          console.warn('upload org chart image before export failed', e)
        }
        const reportData: ExportConstructionReportRequest['valueMap']['reportData'] = {
          constructionId: cid,
          designChangeId: selectedDesignChangeId.value
        }
        if (dataReferenceDate.value) {
          reportData.dataReferenceDate = dataReferenceDate.value
        }
        const request: ExportConstructionReportRequest = { valueMap: { reportData } }
        return formBApi.exportSafetySupervisionCheckPlan(request, { signal })
      }
    )
    const fileName =
      extractFileNameFromResponse(res) ||
      `安全衛生監督查核計畫_B-2_${Date.now()}.docx`
    downloadBlobAsFile(res.data, fileName)
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '匯出失敗'
    window.alert(msg)
  } finally {
    isExporting.value = false
  }
}

watch(
  [hasCurrentProject, selectedDesignChangeId],
  () => {
    if (hasCurrentProject.value) {
      loadB2Texts()
      loadImages('LOCATION_MAP')
      loadImages('SCOPE_DIAGRAM')
      loadImages('SECTION_DIAGRAM')
    } else {
      loadB2Texts()
      locationMapImages.value = []
      scopeDiagramImages.value = []
      sectionDiagramImages.value = []
    }
  },
  { immediate: true }
)

watch(
  () => currentProject.value?.id,
  async () => {
    selectedDesignChangeId.value = null
    await fetchDesignChangeList()
  },
  { immediate: true }
)

// 四欄文字 + 組織圖：停止輸入後延遲自動儲存（不綁 blur，避免搶 focus、不干擾連續輸入）
watch(
  [
    b2GeoHumanEnvironmentOverview,
    b2LocationObjectiveEnvironment,
    b2ConstructionScaleOverview,
    b2ConstructionBudgetText,
    b2EmergencyOrgChart
  ],
  () => {
    scheduleTextAutoSave()
  },
  { deep: true }
)
</script>

<style scoped>
.form-b2-safety-supervision-plan-page {
  padding: 1rem;
  /* 讓背景與區塊有層次 */
  background: radial-gradient(1200px 600px at 12% 0%, rgba(var(--bs-primary-rgb), 0.06), transparent 60%),
    radial-gradient(900px 500px at 88% 10%, rgba(255, 255, 255, 0.03), transparent 55%),
    rgba(15, 23, 42, 0.10);
}

/* 參考 B-1 卡片樣式（report-card） */
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

/* 內容區頂部：匯出置右 */
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

.b2-toolbar-left {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  min-width: 320px;
}

.b2-toolbar-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.b2-refdate-label {
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.b2-refdate-help {
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.85rem;
  cursor: help;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  background: transparent;
  border: 0;
  padding: 0;
  line-height: 1;
  position: relative;
}

.b2-refdate-help::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  top: calc(100% + 8px);
  transform: translateX(-50%);
  min-width: 260px;
  max-width: 360px;
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

.b2-refdate-help::before {
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

.b2-refdate-help:hover::after,
.b2-refdate-help:hover::before,
.b2-refdate-help:focus-visible::after,
.b2-refdate-help:focus-visible::before {
  opacity: 1;
}

.b2-refdate-picker {
  min-width: 190px;
  max-width: 240px;
}

.b2-refdate-picker :deep(.dp__input) {
  height: 34px;
  border-radius: 0.5rem;
}

/** 一鍵 AI 生成（toolbar 內）：尺寸與字級對齊「匯出 Word」按鈕 */
.b2-batch-ai-btn {
  padding: 0.5rem 1.2rem;
  font-size: 0.9375rem;
  white-space: nowrap;
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

.text-panels {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: stretch;
}
.text-panels--ai-wrap {
  position: relative;
}
.text-panels__ai-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.85rem;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(2px);
  pointer-events: auto;
}
.text-panels__ai-overlay-inner {
  text-align: center;
  color: rgba(255, 255, 255, 0.92);
  padding: 1rem;
}
@media (min-width: 992px) {
  .text-panels {
    grid-template-columns: 1fr 1fr;
  }
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
.text-panel__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
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
.text-panel__textarea {
  flex: 1 1 auto;
  min-height: 10rem;
  width: 100%;
  resize: vertical;
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
}
.text-panel__textarea--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre-wrap;
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

.sections {
  display: flex;
  flex-direction: column;
  gap: 1.35rem; /* 卡片彼此更分離 */
}
.section-card {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.85rem;
  overflow: hidden;
  /* 讓每個設定組與背景更有區隔 */
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.085), rgba(0, 0, 0, 0.16));
  box-shadow:
    0 22px 56px rgba(0, 0, 0, 0.40),
    0 0 0 1px rgba(0, 0, 0, 0.34) inset;
}
.section-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  /* 外層淡淡的光框，讓卡片邊界更清楚 */
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.07),
    0 0 0 6px rgba(0, 0, 0, 0.10);
}
.section-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  /* 一層淡淡的描邊高光，拉開卡片與卡片的層次 */
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 0 0 1px rgba(255, 255, 255, 0.09) inset;
}
.section-card__header {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(0, 0, 0, 0.05));
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.section-card__header:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.07));
}
.section-card__header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}
.section-title-wrap {
  min-width: 0;
}
.section-title {
  font-weight: 700;
}
.section-card__header-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 0 0 auto;
}
.chevron {
  color: rgba(255, 255, 255, 0.65);
}
.section-card__body {
  position: relative;
  padding: 0.95rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  /* 內容區直接成為卡片的一部分，與 header 融合 */
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.10), rgba(0, 0, 0, 0.20));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 12px 28px rgba(0, 0, 0, 0.18) inset;
}
.section-card__body::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* 讓 body 與外部背景更有「內凹」分界 */
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 -1px 0 rgba(0, 0, 0, 0.35) inset;
  opacity: 0.9;
}
.section-surface {
  /* 不再像「卡片裡的卡片」：只保留內距，視覺融入整個可收合區塊 */
  padding: 0.75rem;
  border-radius: 0.65rem;
  border: none;
  background: transparent;
  box-shadow: none;
}

.section-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
}
.section-icon--primary { background: rgba(var(--bs-primary-rgb), 0.18); color: rgba(255, 255, 255, 0.9); }
.section-icon--info { background: rgba(var(--bs-info-rgb), 0.16); color: rgba(255, 255, 255, 0.9); }
.section-icon--warning { background: rgba(var(--bs-warning-rgb), 0.14); color: rgba(255, 255, 255, 0.9); }

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
}
.count-badge--primary { box-shadow: 0 0 0 1px rgba(var(--bs-primary-rgb), 0.25) inset; }
.count-badge--info { box-shadow: 0 0 0 1px rgba(var(--bs-info-rgb), 0.25) inset; }
.count-badge--warning { box-shadow: 0 0 0 1px rgba(var(--bs-warning-rgb), 0.25) inset; }

.section-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 0.75rem 0.85rem;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  border-radius: 0.75rem;
  background: rgba(0, 0, 0, 0.12);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
}
.pending-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
}
.file-pick__input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.file-pick {
  position: relative;
}
.file-pick__btn.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.empty-state {
  margin-top: 0.85rem;
  padding: 1.25rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.empty-state__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
}
.empty-state__text {
  color: rgba(255, 255, 255, 0.7);
}

.loc-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.5rem;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.loc-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
}
/* 固定預覽區高度，圖片等比例縮放置中（不裁切） */
.loc-thumb {
  display: block;
  width: 100%;
  height: 200px;
  background: rgba(0, 0, 0, 0.12);
  position: relative;
  overflow: hidden;
}
.loc-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
}
.loc-thumb__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.55));
  opacity: 0;
  transition: opacity 0.18s ease;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 0.6rem;
}
.loc-thumb:hover .loc-thumb__overlay {
  opacity: 1;
}
.loc-thumb__hint {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.25);
}
.loc-thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
.loc-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
}
.loc-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.loc-actions {
  flex: 0 0 auto;
}

.loc-upload-btn {
  min-width: 140px;
}
</style>

