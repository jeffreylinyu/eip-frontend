<template>
  <div class="form-commencement-page a4-dark">
    <PageHeader
      :title="pageTitle"
      icon="fa fa-file-alt"
      :breadcrumbs="pageBreadcrumbs"
    />

    <Card>
      <CardBody>
        <div class="alert alert-info mb-4">
          <h5 class="alert-heading">
            <i class="fa fa-info-circle me-2"></i>說明
          </h5>
          <p class="mb-0">
            開、竣、停工報告：用於申報工程開工、竣工及停工情形，可選擇報告類型後關聯公文與上傳多個附件。
            {{ isContractorRoute ? '（營造端 O-1）' : '（監造端 A-3）' }}
          </p>
        </div>

        <div v-if="!constructionId" class="alert alert-warning mb-0">
          <i class="fa fa-exclamation-triangle me-2"></i>
          請先選擇工程案。
        </div>

        <template v-else>
          <!-- 報告類型 Tab -->
          <ul class="nav nav-tabs a4-tabs mb-4">
            <li class="nav-item" v-for="rt in reportTypes" :key="rt">
              <a
                class="nav-link"
                :class="{ active: activeReportType === rt }"
                href="javascript:;"
                @click="activeReportType = rt"
              >
                {{ REPORT_TYPE_LABELS[rt] }}
              </a>
            </li>
          </ul>

          <div v-if="isLoading" class="text-center py-4">
            <span class="spinner-border spinner-border-sm me-2"></span>載入中...
          </div>

          <div v-else class="commencement-report-content">
            <!-- 該類型紀錄列表 -->
            <div class="d-flex justify-content-end align-items-center gap-2 mb-3">
              <button
                type="button"
                class="btn btn-sm btn-primary"
                :disabled="isCreating"
                @click="addReport"
              >
                <i v-if="isCreating" class="fa fa-spinner fa-spin me-1"></i>
                <i v-else class="fa fa-plus me-1"></i>
                新增記錄
              </button>
            </div>

            <div v-if="currentTypeReports.length === 0" class="text-center py-4 text-muted border rounded">
              <i class="fa fa-inbox fa-2x mb-2 d-block"></i>
              尚無記錄，請點「新增記錄」
            </div>

            <div v-else ref="commencementTableWrapperRef" class="table-responsive mb-0">
              <table class="table a4-table mb-0">
                <thead>
                  <tr>
                    <th style="width: 4rem;">序號</th>
                    <th style="width: 120px;">狀態</th>
                    <th style="width: 200px;">{{ reportDateColumnLabel }}</th>
                    <th v-if="isContractorRoute && designChangeList.length > 0" style="width: 200px;" class="text-nowrap">
                      <span class="d-inline-flex align-items-center gap-1">
                        使用資料版本
                        <span
                          ref="versionColumnTooltipTriggerRef"
                          class="d-inline-block"
                          @mouseenter="onVersionColumnTooltipEnter"
                          @mouseleave="showVersionColumnTooltip = false"
                        >
                          <i class="fa fa-info-circle text-info" style="cursor: help; font-size: 0.9rem;"></i>
                        </span>
                      </span>
                    </th>
                    <th style="min-width: 140px;">關聯公文</th>
                    <th style="width: 200px;" class="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, idx) in currentTypeReports" :key="r.id">
                    <td class="align-middle text-center">{{ idx + 1 }}</td>
                    <td class="align-middle">
                      <select
                        class="form-select form-select-sm"
                        :value="r.status ?? 'DRAFT'"
                        @change="onStatusChange(r, ($event.target as HTMLSelectElement).value)"
                      >
                        <option value="DRAFT">草稿</option>
                        <option value="PENDING">待審核</option>
                        <option value="APPROVED">已核准</option>
                        <option value="REJECTED">已退回</option>
                      </select>
                    </td>
                    <td class="align-middle">
                      <div class="d-flex flex-column gap-1">
                        <RepublicDatePicker
                          :model-value="actualReportDateByReportId[r.id] ?? ''"
                          :use-republic-year="true"
                          :hide-icon="true"
                          input-class="form-control form-control-sm"
                          @update:model-value="(v: string) => setActualReportDate(r.id, v)"
                        />
                        <button
                          v-if="activeReportType === 'COMMENCEMENT'"
                          type="button"
                          class="btn btn-sm btn-outline-secondary align-self-start"
                          style="font-size: 0.75rem;"
                          title="帶入工程核心資料的開工日期"
                          @click="fillReportDateFromCoreData(r.id)"
                        >
                          <i class="fa fa-link me-1"></i>同核心資料設定
                        </button>
                      </div>
                    </td>
                    <td v-if="isContractorRoute && designChangeList.length > 0" class="align-middle small">
                      <div class="d-flex flex-column lh-sm">
                        <span>{{ getVersionLabelForReport(r) }}</span>
                        <span class="text-muted">{{ getVersionRangeForReport(r) }}</span>
                      </div>
                    </td>
                    <td class="align-middle">
                      <div v-if="linkedDocByReportId[r.id]" class="d-flex align-items-center gap-1">
                        <span
                          class="small commencement-doc-link text-truncate"
                          style="max-width: 12rem; cursor: pointer;"
                          :title="linkedDocByReportId[r.id]"
                          @click="openLinkedDocPreviewForReport(r)"
                        >
                          {{ linkedDocByReportId[r.id] }}
                        </span>
                        <button
                          class="btn btn-sm btn-outline-danger p-0 px-1"
                          style="font-size: 0.7rem; line-height: 1.2; flex-shrink: 0;"
                          title="取消關聯"
                          @click="clearLinkedDocForReport(r)"
                        >
                          <i class="fa fa-times"></i>
                        </button>
                      </div>
                      <button
                        v-else
                        class="btn btn-sm btn-outline-info"
                        @click="openDocPickerForReport(r)"
                      >
                        <i class="fa fa-file-lines me-1"></i>選擇公文
                      </button>
                    </td>
                    <td class="text-center align-middle">
                      <FormTableOperationMenu
                        :record="r"
                        :record-id="String(r.id)"
                        theme-class="a4-dark"
                        :table-wrapper-ref="commencementTableWrapperRef"
                      >
                        <template #default="{ close }">
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            :class="{ disabled: isUploading && uploadReportId === r.id }"
                            style="cursor: pointer;"
                            @click="!isUploading && (handleUploadClick(r), close())"
                          >
                            <i v-if="isUploading && uploadReportId === r.id" class="fa fa-spinner fa-spin"></i>
                            <i v-else class="fa fa-upload"></i>
                            <span>上傳檔案</span>
                          </div>
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            style="cursor: pointer;"
                            @click="openAttachmentModalForReport(r); close()"
                          >
                            <i class="fa fa-file-pdf"></i>
                            <span>相關文件</span>
                            <span
                              v-if="(attachmentCountByReportId[r.id] ?? 0) > 0"
                              class="badge rounded-pill bg-danger ms-1"
                              style="font-size: 0.65rem;"
                            >{{ attachmentCountByReportId[r.id] }}</span>
                          </div>
                          <div
                            v-if="isContractorRoute"
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            :class="{ disabled: isExporting }"
                            style="cursor: pointer;"
                            @click="!isExporting && (exportReportForRow(r), close())"
                          >
                            <i v-if="isExporting && exportingReportId === r.id" class="fa fa-spinner fa-spin"></i>
                            <i v-else class="fa fa-file-word"></i>
                            <span>匯出此筆表單</span>
                          </div>
                          <hr class="dropdown-divider">
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                            style="cursor: pointer;"
                            @click="deleteReportRow(r); close()"
                          >
                            <i class="fa fa-trash"></i>
                            <span>刪除</span>
                          </div>
                        </template>
                      </FormTableOperationMenu>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 自動儲存狀態提示 -->
            <div v-if="currentTypeReports.length > 0" class="d-flex justify-content-end align-items-center mt-3 gap-2">
              <span v-if="isSavingDate" class="text-muted small">
                <i class="fa fa-spinner fa-spin me-1"></i>自動儲存中...
              </span>
              <span v-else class="text-success small">
                <i class="fa fa-check me-1"></i>已儲存
              </span>
            </div>

          </div>
        </template>
      </CardBody>
    </Card>

    <!-- 共用隱藏 input：操作選單內「上傳檔案」觸發 -->
    <input
      ref="operationMenuFileInputRef"
      type="file"
      accept=".pdf,application/pdf"
      multiple
      class="d-none"
      @change="onOperationMenuFileChange"
    />

    <!-- 公文選擇器 -->
    <DocumentPicker
      :show="showDocPicker"
      title="選擇公文（發文字號）"
      :constructionId="constructionId"
      :darkMode="true"
      :showNameInput="false"
      @update:show="(v: boolean) => { if (!v) showDocPicker = false }"
      @select="onDocumentPicked"
    />

    <!-- 相關文件 Modal（共用組件） -->
    <RelatedDocumentsModal
      :show="showAttachmentModal"
      title="相關文件"
      :loading="isLoadingAttachments"
      :linked-docs="modalLinkedDocs"
      :attachments="modalAttachments"
      :uploading="isUploadingInModal"
      :downloading-all="isDownloadingAll"
      upload-accept=".pdf,application/pdf"
      modal-class="a4-date-modal-dark"
      @update:show="(v: boolean) => { if (!v) showAttachmentModal = false }"
      @upload="handleModalUpload"
      @download-all="downloadAllAttachments"
      @unlink-doc="handleUnlinkDocInModal"
      @preview-doc="handlePreviewDoc"
      @download-doc="handleDownloadDoc"
      @preview-att="handlePreviewAtt"
      @download-att="handleDownloadAtt"
      @delete-att="handleDeleteAtt"
    />

    <!-- PDF 預覽 Modal -->
    <Modal
      :show="showPreviewModal"
      :title="'預覽 - ' + previewFileName"
      icon="fa fa-eye"
      size="xl"
      :hideFooter="true"
      modalClass="a4-date-modal-dark"
      @update:show="(v: boolean) => { if (!v) { showPreviewModal = false; previewUrl = '' } }"
    >
      <template #body>
        <div v-if="!previewUrl" class="text-center py-5 text-muted">無法預覽</div>
        <iframe v-else :src="previewUrl" style="width: 100%; height: 75vh; border: none; border-radius: 6px;"></iframe>
      </template>
    </Modal>

    <!-- 使用資料版本說明：掛到 body 避免被表格容器裁切，依目前標籤說明該類型使用哪個版本 -->
    <Teleport to="body">
      <Transition name="commencement-tooltip">
        <div
          v-show="showVersionColumnTooltip"
          class="commencement-version-tooltip"
          role="tooltip"
          :style="versionTooltipStyle"
          v-html="versionColumnTooltipHtml"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RelatedDocumentsModal from '@/components/related-documents/RelatedDocumentsModal.vue'
import DocumentPicker from '@/components/document/DocumentPicker.vue'
import FormTableOperationMenu from '@/components/forms/FormTableOperationMenu.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import {
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_CATEGORY_LABELS,
  type ReportType,
  type CommencementReportItem,
  type CommencementReportAttachment,
  getCommencementReportList,
  createCommencementReport,
  deleteCommencementReport,
  updateCommencementReportStatus,
  updateCommencementReportActualDate,
  linkCommencementReportDocument,
  getCommencementReportLinkedDocuments,
  unlinkCommencementReportDocument,
  uploadCommencementReportAttachment,
  getCommencementReportAttachments,
  deleteCommencementReportAttachment,
  previewCommencementReportAttachment,
  downloadCommencementReportAttachment,
  downloadAllCommencementReportAttachments
} from '@/api/commencementReport'
import { getDocumentCenterList, type DocumentCenterListItem } from '@/api/documentCenter'
import { getDesignChangeList, type DesignChangeItem } from '@/api/designChange'
import { getOriginalContractIntervalISO, getDesignChangeIntervalISO } from '@/utils/designChangeIntervals'
import { formA3Api, downloadBlobAsFile, handleApiError } from '@/api/forms'
import { useExportLoading } from '@/composables/useExportLoading'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { runWithExportLoading } = useExportLoading()
const isContractorRoute = computed(() => (route.path || '').includes('/forms/o1-commencement'))
/** 監造(A-3)=SUPERVISORY / 營造(O-1)=CONTRACTOR，API 依此讀寫不同資料表 */
const commencementReportSource = computed(() => (isContractorRoute.value ? 'CONTRACTOR' : 'SUPERVISORY'))

const pageTitle = computed(() =>
  isContractorRoute.value ? 'O-1 開、竣、停工報告' : 'A-3 開、竣、停工報告'
)
const pageBreadcrumbs = computed(() => {
  const last = { text: pageTitle.value, active: true as const }
  if (isContractorRoute.value) {
    return [
      { text: '表單匯出', href: 'javascript:;' },
      { text: 'O類表單', href: 'javascript:;' },
      last
    ]
  }
  return [
    { text: '表單匯出', href: 'javascript:;' },
    { text: 'A類表單', href: 'javascript:;' },
    last
  ]
})

const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const reportList = ref<CommencementReportItem[]>([])
const reportTypes = REPORT_TYPES
const activeReportType = ref<ReportType>('COMMENCEMENT')
const isLoading = ref(false)
const isCreating = ref(false)
const docCacheMap = ref<Map<number, DocumentCenterListItem>>(new Map())
const selectedReport = ref<CommencementReportItem | null>(null)
const reportForDocPicker = ref<CommencementReportItem | null>(null)
const linkedDocByReportId = ref<Record<number, string>>({})
const attachmentCountByReportId = ref<Record<number, number>>({})
const linkedRefIdByReportId = ref<Record<number, number>>({})

const currentTypeReports = computed(() => reportList.value)
const currentReport = computed(() => selectedReport.value)
/** 依目前 tab 顯示的日期欄位標題：開工日期 / 竣工日期 / 停工日期 */
const reportDateColumnLabel = computed(() => ({
  COMMENCEMENT: '開工日期',
  COMPLETION: '竣工日期',
  SUSPENSION: '停工日期'
}[activeReportType.value]))

const showDocPicker = ref(false)
const showVersionColumnTooltip = ref(false)
const versionColumnTooltipTriggerRef = ref<HTMLElement | null>(null)
const versionTooltipRect = ref({ left: 0, top: 0 })
const versionTooltipStyle = computed(() => ({
  left: `${versionTooltipRect.value.left}px`,
  top: `${versionTooltipRect.value.top - 8}px`,
  transform: 'translate(-50%, -100%)'
}))
function onVersionColumnTooltipEnter() {
  const el = versionColumnTooltipTriggerRef.value
  if (el) {
    const r = el.getBoundingClientRect()
    versionTooltipRect.value = { left: r.left + r.width / 2, top: r.top }
  }
  showVersionColumnTooltip.value = true
}

/** 使用資料版本欄 i 圖示說明：先解釋何謂使用資料，再依目前標籤說明該類型使用哪個版本 */
const versionColumnTooltipHtml = computed(() => {
  const typeLabel = REPORT_TYPE_LABELS[activeReportType.value]
  const whatIs = '<p class="commencement-version-tooltip__intro">匯出報告時，表單上會帶入的<strong>監造/營造單位、工地人員、契約金額</strong>等，是從某一個變更設計版本讀取的，該版本即為「使用資料」。</p>'
  let rule = ''
  if (activeReportType.value === 'COMMENCEMENT') {
    rule = '<p class="mb-0">目前「開工」：使用 <strong>原契約</strong> 的資料。</p>'
  } else if (activeReportType.value === 'COMPLETION') {
    rule = '<p class="mb-0">目前「竣工」：使用 <strong>最後一版</strong> 變更設計的資料。</p>'
  } else {
    rule = '<p class="mb-0">目前「停工」：依申報的<strong>停工日期</strong>落在哪個版本區間即用該版本；未填則使用 <strong>原契約</strong>。</p>'
  }
  return `<div class="commencement-version-tooltip__inner">${whatIs}<div class="commencement-version-tooltip__title">${typeLabel}的判斷方式</div>${rule}</div>`
})

const isUploading = ref(false)
const isExporting = ref(false)
const exportingReportId = ref<number | null>(null)
const exportMessage = ref<{ type: 'success' | 'danger'; text: string }>({ type: 'success', text: '' })
/** 每筆紀錄的申報日期（開工/竣工/停工），格式 YYYY-MM-DD，匯出時帶入 {{actualStartDate}} */
const actualReportDateByReportId = ref<Record<number, string>>({})
const commencementTableWrapperRef = ref<HTMLElement | null>(null)
const isSavingDate = ref(false)
const autoSaveDateTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const pendingSaveReportIds = ref<Set<number>>(new Set())
const operationMenuFileInputRef = ref<HTMLInputElement | null>(null)
const uploadReportId = ref<number | null>(null)
/** 變更設計列表（依生效日升序），用於匯出時判斷版本：開工＝原契約、竣工＝最後一版、停工＝依申報日期區間 */
const designChangeList = ref<{ id: number; effectiveDate: string; effectiveEndDate?: string }[]>([])

async function loadReportList() {
  if (!constructionId.value) return
  isLoading.value = true
  try {
    reportList.value = await getCommencementReportList(constructionId.value, activeReportType.value, commencementReportSource.value)
    const dates: Record<number, string> = {}
    reportList.value.forEach((r) => { dates[r.id] = r.actualReportDate ?? '' })
    actualReportDateByReportId.value = dates
    try {
      const list = await getDesignChangeList(constructionId.value)
      designChangeList.value = [...list].sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
    } catch (_) {
      designChangeList.value = []
    }
    try {
      const docList = await getDocumentCenterList(constructionId.value)
      const map = new Map<number, DocumentCenterListItem>()
      docList.forEach(d => map.set(d.id, d))
      docCacheMap.value = map
    } catch (_) {}
    const linked: Record<number, string> = {}
    const refIds: Record<number, number> = {}
    const counts: Record<number, number> = {}
    await Promise.all(
      reportList.value.map(async (r) => {
        try {
          const refs = await getCommencementReportLinkedDocuments(r.id, commencementReportSource.value)
          if (refs.length > 0) {
            const doc = docCacheMap.value.get(refs[0].documentId)
            linked[r.id] = doc?.documentNumber ?? refs[0].targetName ?? refs[0].displayTitle ?? ''
            refIds[r.id] = refs[0].referenceId
          }
        } catch (_) {}
        try {
          const atts = await getCommencementReportAttachments(r.id, commencementReportSource.value)
          counts[r.id] = atts.length
        } catch (_) {
          counts[r.id] = 0
        }
      })
    )
    linkedDocByReportId.value = linked
    linkedRefIdByReportId.value = refIds
    attachmentCountByReportId.value = counts
    selectedReport.value = reportList.value[0] ?? null
  } finally {
    isLoading.value = false
  }
}

async function onStatusChange(r: CommencementReportItem, status: string) {
  try {
    await updateCommencementReportStatus(r.id, status, commencementReportSource.value)
    r.status = status
  } catch (e) {
    console.error(e)
  }
}

function openDocPickerForReport(r: CommencementReportItem) {
  reportForDocPicker.value = r
  showDocPicker.value = true
}

async function addReport() {
  if (!constructionId.value || isCreating.value) return
  isCreating.value = true
  try {
    await createCommencementReport(constructionId.value, activeReportType.value, commencementReportSource.value)
    await loadReportList()
  } finally {
    isCreating.value = false
  }
}

function setActualReportDate(reportId: number, value: string) {
  actualReportDateByReportId.value = { ...actualReportDateByReportId.value, [reportId]: value }
  pendingSaveReportIds.value.add(reportId)
  if (autoSaveDateTimer.value) clearTimeout(autoSaveDateTimer.value)
  autoSaveDateTimer.value = setTimeout(() => flushActualDateSave(), 500)
}

async function flushActualDateSave() {
  autoSaveDateTimer.value = null
  const ids = Array.from(pendingSaveReportIds.value)
  pendingSaveReportIds.value = new Set()
  if (ids.length === 0) return
  isSavingDate.value = true
  try {
    for (const reportId of ids) {
      const value = actualReportDateByReportId.value[reportId] ?? ''
      await updateCommencementReportActualDate(reportId, value, commencementReportSource.value)
    }
  } catch (e) {
    console.error(e)
  } finally {
    isSavingDate.value = false
  }
}

/** 僅開工日期：從核心資料帶入開工日期 */
function fillReportDateFromCoreData(reportId: number) {
  const startDate = workspaceStore.currentProject?.startDate
  if (!startDate) return
  const ymd = startDate.includes('T') ? startDate.split('T')[0] : startDate
  setActualReportDate(reportId, ymd)
}

/**
 * 匯出時要抓取的版本：開工＝原契約、竣工＝最後一版、停工＝依申報日期落在哪個版本區間（未填日期預設原契約）
 */
function getDesignChangeIdForExport(actualReportDate?: string): number | null {
  const list = designChangeList.value
  if (activeReportType.value === 'COMMENCEMENT') return null
  if (activeReportType.value === 'COMPLETION') {
    return list.length ? list[list.length - 1].id : null
  }
  // SUSPENSION: 依停工日期判斷版本區間；未填則原契約
  if (!actualReportDate || !actualReportDate.trim()) return null
  const stopTime = new Date(actualReportDate).getTime()
  if (isNaN(stopTime)) return null
  // 找到最後一個 effectiveDate <= 停工日 的版本
  let lastMatch: number | null = null
  for (const ch of list) {
    const d = new Date(ch.effectiveDate).getTime()
    if (!isNaN(d) && d <= stopTime) lastMatch = ch.id
  }
  return lastMatch
}

/** 民國日期顯示：YYYY-MM-DD → 114.01.15 */
function formatToRepublicDate(isoDate: string): string {
  if (!isoDate?.trim()) return ''
  const dateOnly = isoDate.trim().split('T')[0]
  const [y, m, d] = dateOnly.split('-').map(Number)
  if (!y || !m || !d) return dateOnly || isoDate
  const rocYear = y - 1911
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${rocYear}.${mm}.${dd}`
}

/** 營造端 O-1：此筆報告目前使用的資料版本顯示（與切換版本組件一致：原契約 / 變更設計1、變更設計2…） */
function getVersionLabelForReport(r: CommencementReportItem): string {
  const actualReportDate = actualReportDateByReportId.value[r.id]
  const id = getDesignChangeIdForExport(actualReportDate)
  if (id == null) return '原契約'
  const list = designChangeList.value
  const idx = list.findIndex((ch) => ch.id === id)
  if (idx < 0) return '原契約'
  return `變更設計${idx + 1}`
}

/** 營造端 O-1：此筆報告使用版本的區間（民國格式） */
function getVersionRangeForReport(r: CommencementReportItem): string {
  const actualReportDate = actualReportDateByReportId.value[r.id]
  const id = getDesignChangeIdForExport(actualReportDate)
  const list = designChangeList.value
  if (id == null) {
    const interval = getOriginalContractIntervalISO({
      signDate: workspaceStore.currentProject?.signDate,
      designChangeList: list as unknown as DesignChangeItem[],
      projectEndDate: workspaceStore.currentProject?.endDate
    })
    if (!interval.start) return '－'
    const startStr = formatToRepublicDate(interval.start)
    if (interval.openEnded) return `${startStr} ～ 迄今`
    return `${startStr} ～ ${interval.end ? formatToRepublicDate(interval.end) : '－'}`
  }
  const idx = list.findIndex((ch) => ch.id === id)
  if (idx < 0) return '－'
  const item = list[idx]
  const interval = getDesignChangeIntervalISO({
    item: item as unknown as DesignChangeItem,
    index: idx,
    designChangeList: list as unknown as DesignChangeItem[],
    projectEndDate: workspaceStore.currentProject?.endDate
  })
  if (!interval.start) return '－'
  const startStr = formatToRepublicDate(interval.start)
  if (interval.openEnded) return `${startStr} ～ 迄今`
  return `${startStr} ～ ${interval.end ? formatToRepublicDate(interval.end) : '－'}`
}

async function exportReport() {
  if (!constructionId.value || isExporting.value) return
  const first = currentTypeReports.value[0]
  const actualReportDate = first ? actualReportDateByReportId.value[first.id] : undefined
  await doExport(actualReportDate)
}

async function exportReportForRow(r: CommencementReportItem) {
  if (!constructionId.value || isExporting.value) return
  const actualReportDate = actualReportDateByReportId.value[r.id]
  exportingReportId.value = r.id
  await doExport(actualReportDate)
  exportingReportId.value = null
}

async function doExport(actualReportDate?: string) {
  if (!constructionId.value) return
  exportMessage.value = { type: 'success', text: '' }
  isExporting.value = true
  try {
    await runWithExportLoading('a3-report', 'A-3 開竣停工報告', async (signal) => {
      const designChangeId = getDesignChangeIdForExport(actualReportDate)
      const blob = await formA3Api.downloadReport(
        constructionId.value!,
        actualReportDate,
        REPORT_TYPE_CATEGORY_LABELS[activeReportType.value],
        isContractorRoute.value ? 'CONTRACTOR' : 'SUPERVISORY',
        designChangeId ?? undefined,
        { signal }
      )
      const exportFileName = `${REPORT_TYPE_LABELS[activeReportType.value]}.docx`
      downloadBlobAsFile(blob, exportFileName)
      exportMessage.value = { type: 'success', text: '匯出成功，檔案已下載。' }
    })
  } catch (error) {
    if ((error as any)?.name === 'AbortError' || (error as any)?.code === 'ERR_CANCELED') return
    console.error('匯出失敗:', error)
    exportMessage.value = {
      type: 'danger',
      text: handleApiError(error) || '匯出失敗，請稍後再試。'
    }
  } finally {
    isExporting.value = false
  }
}

async function deleteReportRow(r: CommencementReportItem) {
  if (!confirm(`確定要刪除此筆「${REPORT_TYPE_LABELS[r.reportType]}」記錄？將會一併刪除關聯公文與附件。`)) return
  try {
    await deleteCommencementReport(r.id, commencementReportSource.value)
    if (selectedReport.value?.id === r.id) selectedReport.value = null
    await loadReportList()
  } catch (e) {
    console.error(e)
  }
}

function openLinkedDocPreviewForReport(r: CommencementReportItem) {
  getCommencementReportLinkedDocuments(r.id, commencementReportSource.value).then(refs => {
    if (refs.length === 0) return
    const doc = docCacheMap.value.get(refs[0].documentId)
    if (doc?.fileUrl) {
      previewFileName.value = doc.documentNumber || doc.fileName
      previewUrl.value = doc.fileUrl
      showPreviewModal.value = true
    }
  })
}

async function clearLinkedDocForReport(r: CommencementReportItem) {
  const refId = linkedRefIdByReportId.value[r.id]
  if (refId == null) return
  try {
    await unlinkCommencementReportDocument(r.id, refId)
    const { [r.id]: _, ...rest } = linkedDocByReportId.value
    linkedDocByReportId.value = rest
    const { [r.id]: __, ...restRef } = linkedRefIdByReportId.value
    linkedRefIdByReportId.value = restRef
  } catch (e) {
    console.error(e)
  }
}

function openAttachmentModalForReport(r: CommencementReportItem) {
  selectedReport.value = r
  openAttachmentModal()
}

async function onFileSelectForReport(e: Event, r: CommencementReportItem) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  isUploading.value = true
  uploadReportId.value = r.id
  try {
    for (const file of Array.from(files)) {
      await uploadCommencementReportAttachment(r.id, file, commencementReportSource.value)
    }
    const atts = await getCommencementReportAttachments(r.id, commencementReportSource.value)
    attachmentCountByReportId.value = { ...attachmentCountByReportId.value, [r.id]: atts.length }
  } finally {
    isUploading.value = false
    uploadReportId.value = null
    input.value = ''
  }
}

function handleUploadClick(r: CommencementReportItem) {
  uploadReportId.value = r.id
  operationMenuFileInputRef.value?.click()
}

function onOperationMenuFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const reportId = uploadReportId.value
  if (reportId == null) return
  const r = reportList.value.find(x => x.id === reportId)
  if (r) onFileSelectForReport(e, r)
  input.value = ''
}

watch(activeReportType, () => {
  if (constructionId.value) loadReportList()
})

function onDocumentPicked(payload: { document: DocumentCenterListItem }) {
  const report = reportForDocPicker.value
  if (!report) {
    showDocPicker.value = false
    return
  }
  const label = REPORT_TYPE_LABELS[report.reportType]
  linkCommencementReportDocument(report.id, payload.document.id, label, commencementReportSource.value).then(async () => {
    const docLabel = payload.document.documentNumber || payload.document.subject || ''
    linkedDocByReportId.value = { ...linkedDocByReportId.value, [report.id]: docLabel }
    const refs = await getCommencementReportLinkedDocuments(report.id, commencementReportSource.value)
    if (refs.length > 0) {
      linkedRefIdByReportId.value = { ...linkedRefIdByReportId.value, [report.id]: refs[0].referenceId }
    }
  }).catch(() => {}).finally(() => {
    reportForDocPicker.value = null
    showDocPicker.value = false
  })
}

// 相關文件 Modal
const showAttachmentModal = ref(false)
const modalLinkedDocs = ref<DocumentCenterListItem[]>([])
const modalLinkedRefs = ref<{ referenceId: number; documentId: number }[]>([])
const modalAttachments = ref<CommencementReportAttachment[]>([])
const isLoadingAttachments = ref(false)
const isUploadingInModal = ref(false)
const isDownloadingAll = ref(false)

async function openAttachmentModal() {
  if (!currentReport.value) return
  showAttachmentModal.value = true
  isLoadingAttachments.value = true
  modalLinkedDocs.value = []
  modalLinkedRefs.value = []
  modalAttachments.value = []
  try {
    const refs = await getCommencementReportLinkedDocuments(currentReport.value.id, commencementReportSource.value)
    const atts = await getCommencementReportAttachments(currentReport.value.id, commencementReportSource.value)
    modalAttachments.value = atts
    modalLinkedRefs.value = refs.map(r => ({ referenceId: r.referenceId, documentId: r.documentId }))
    if (refs.length > 0 && docCacheMap.value.size > 0) {
      modalLinkedDocs.value = refs.map(r => docCacheMap.value.get(r.documentId)).filter(Boolean) as DocumentCenterListItem[]
    }
  } finally {
    isLoadingAttachments.value = false
  }
}

async function handleModalUpload(files: FileList) {
  if (!files?.length || !currentReport.value) return
  isUploadingInModal.value = true
  try {
    const reportId = currentReport.value!.id
    for (const file of Array.from(files)) {
      await uploadCommencementReportAttachment(reportId, file, commencementReportSource.value)
    }
    modalAttachments.value = await getCommencementReportAttachments(reportId, commencementReportSource.value)
    attachmentCountByReportId.value = { ...attachmentCountByReportId.value, [reportId]: modalAttachments.value.length }
  } finally {
    isUploadingInModal.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function handlePreviewDoc(doc: DocumentCenterListItem) {
  if (!doc.fileUrl) return
  previewFileName.value = doc.documentNumber || doc.fileName
  previewUrl.value = doc.fileUrl
  showPreviewModal.value = true
}

function handleDownloadDoc(doc: DocumentCenterListItem) {
  if (!doc.fileUrl) return
  const link = document.createElement('a')
  link.href = doc.fileUrl
  link.download = doc.fileName || `${doc.documentNumber}.pdf`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function handleUnlinkDocInModal(doc: DocumentCenterListItem) {
  if (!currentReport.value?.id) return
  const ref = modalLinkedRefs.value.find(r => r.documentId === doc.id)
  if (!ref || !confirm('確定要取消關聯此公文？')) return
  try {
    await unlinkCommencementReportDocument(currentReport.value.id, ref.referenceId)
    const refs = await getCommencementReportLinkedDocuments(currentReport.value.id, commencementReportSource.value)
    modalLinkedRefs.value = refs.map(r => ({ referenceId: r.referenceId, documentId: r.documentId }))
    if (refs.length > 0 && docCacheMap.value.size > 0) {
      modalLinkedDocs.value = refs.map(r => docCacheMap.value.get(r.documentId)).filter(Boolean) as DocumentCenterListItem[]
    } else {
      modalLinkedDocs.value = []
      const { [currentReport.value.id]: _, ...rest } = linkedDocByReportId.value
      linkedDocByReportId.value = rest
    }
    attachmentCountByReportId.value = { ...attachmentCountByReportId.value, [currentReport.value.id]: modalAttachments.value.length + modalLinkedDocs.value.length }
  } catch (e) {
    console.error('取消關聯失敗:', e)
  }
}

async function handlePreviewAtt(att: CommencementReportAttachment) {
  if (!currentReport.value) return
  const result = await previewCommencementReportAttachment(currentReport.value.id, att.id, commencementReportSource.value)
  previewFileName.value = result.fileName
  previewUrl.value = result.url
  showPreviewModal.value = true
}

async function handleDownloadAtt(att: CommencementReportAttachment) {
  if (!currentReport.value) return
  await downloadCommencementReportAttachment(currentReport.value.id, att.id, att.fileName, commencementReportSource.value)
}

async function handleDeleteAtt(att: CommencementReportAttachment) {
  if (!currentReport.value || !confirm(`確定要刪除「${att.fileName}」？`)) return
  const reportId = currentReport.value.id
  await deleteCommencementReportAttachment(reportId, att.id, commencementReportSource.value)
  modalAttachments.value = modalAttachments.value.filter(a => a.id !== att.id)
  attachmentCountByReportId.value = { ...attachmentCountByReportId.value, [reportId]: modalAttachments.value.length }
}

async function downloadAllAttachments() {
  if (!currentReport.value) return
  isDownloadingAll.value = true
  try {
    await downloadAllCommencementReportAttachments(currentReport.value.id, commencementReportSource.value)
  } finally {
    isDownloadingAll.value = false
  }
}

const showPreviewModal = ref(false)
const previewUrl = ref('')
const previewFileName = ref('')

onMounted(() => {
  if (constructionId.value) loadReportList()
})
watch(constructionId, (id) => {
  if (id) loadReportList()
  else {
    reportList.value = []
    selectedReport.value = null
    linkedDocByReportId.value = {}
    attachmentCountByReportId.value = {}
    actualReportDateByReportId.value = {}
  }
})

onBeforeUnmount(() => {
  if (autoSaveDateTimer.value) {
    clearTimeout(autoSaveDateTimer.value)
    autoSaveDateTimer.value = null
  }
  if (pendingSaveReportIds.value.size > 0) {
    flushActualDateSave()
  }
})
</script>

<style scoped>
/* 暗色主題（與 A-4 一致） */
.a4-dark {
  --a4-bg: #1a1d21;
  --a4-card: #25282c;
  --a4-border: #4a4d54;
  --a4-text: #e4e6eb;
  --a4-muted: #b0b3b8;
  --a4-thead: #2d3748;
  --a4-hover: rgba(255, 255, 255, 0.06);
  --a4-input-bg: #2d3139;
  --a4-input-border: #3a3d42;
  --a4-accent: #60a5fa;
}

.form-commencement-page {
  padding: 1rem;
  color: var(--a4-text);
}

:deep(.card) {
  background: var(--a4-card);
  border-color: var(--a4-border);
  color: var(--a4-text);
}

:deep(.alert-info) {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.25);
  color: #93c5fd;
}

:deep(.alert-warning) {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
}

.a4-tabs {
  border-bottom-color: var(--a4-border);
}

.a4-tabs .nav-link {
  color: var(--a4-muted);
  border-color: transparent;
  background: transparent;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
}

.a4-tabs .nav-link:hover {
  color: var(--a4-text);
  border-color: var(--a4-border) var(--a4-border) transparent;
  background: var(--a4-hover);
}

.a4-tabs .nav-link.active {
  color: var(--a4-accent);
  background: var(--a4-card);
  border-color: var(--a4-border) var(--a4-border) var(--a4-card);
  font-weight: 600;
}

.a4-table {
  border: 2px solid var(--a4-border);
  border-collapse: collapse;
  width: 100%;
  color: var(--a4-text);
}

.a4-table thead th {
  background: var(--a4-thead);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.65rem 0.5rem;
  border: 1.5px solid var(--a4-border);
  color: var(--a4-muted);
}

.a4-table tbody td {
  border: 1.5px solid var(--a4-border);
  padding: 0.6rem 0.5rem;
  vertical-align: middle;
  background: var(--a4-card);
  color: var(--a4-text);
}

.a4-table tbody tr:hover td {
  background: var(--a4-hover);
}

/* 表單元件暗色（與 A-4 一致） */
.a4-table :deep(.form-control),
.a4-table :deep(.form-select),
.a4-table :deep(textarea.form-control) {
  background: var(--a4-input-bg);
  border-color: var(--a4-input-border);
  color: var(--a4-text);
}

.a4-table :deep(.form-control:focus),
.a4-table :deep(.form-select:focus),
.a4-table :deep(textarea.form-control:focus) {
  background: var(--a4-input-bg);
  border-color: var(--a4-accent);
  color: var(--a4-text);
  box-shadow: 0 0 0 0.15rem rgba(96, 165, 250, 0.25);
}

/* 下拉選單暗色箭頭（與 A-4 一致） */
.a4-table :deep(.form-select) {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23b0b3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 12px;
}

.a4-table :deep(.form-select option) {
  background: var(--a4-card, #25282c);
  color: var(--a4-text, #e4e6eb);
}

.commencement-doc-link {
  cursor: pointer;
  color: var(--a4-accent, #60a5fa);
}

.commencement-doc-link:hover {
  text-decoration: underline;
}

/* 使用資料版本欄的 i 說明 tooltip（Teleport 到 body，以 fixed 定位避免被裁切） */
.commencement-version-tooltip {
  position: fixed;
  z-index: 1060;
  max-width: 320px;
  padding: 0.5rem 0.65rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #e4e6eb;
  background: #1e2125;
  border: 1px solid var(--a4-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  white-space: normal;
  pointer-events: none;
}
.commencement-version-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -6px;
  border: 6px solid transparent;
  border-top-color: var(--a4-border);
}
.commencement-version-tooltip__inner {
  text-align: left;
}
.commencement-version-tooltip__intro {
  margin-bottom: 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  color: #e4e6eb;
}
.commencement-version-tooltip__title {
  font-weight: 600;
  margin-bottom: 0.35rem;
  color: #fff;
}
.commencement-version-tooltip p {
  margin: 0;
  color: #e4e6eb;
}
.commencement-tooltip-enter-active,
.commencement-tooltip-leave-active {
  transition: opacity 0.15s ease;
}
.commencement-tooltip-enter-from,
.commencement-tooltip-leave-to {
  opacity: 0;
}
</style>

<style>
/* Modal 暗色（Teleport 到 body，需非 scoped） */
.a4-date-modal-dark .modal-content {
  background: #1e2125;
  border-color: #3a3d42;
  color: #e4e6eb;
}
.a4-date-modal-dark .modal-header {
  border-bottom-color: #3a3d42;
  color: #e4e6eb;
}
.a4-date-modal-dark .modal-body {
  color: #e4e6eb;
}
.a4-date-modal-dark .list-group-item {
  background: rgba(255, 255, 255, 0.04);
  border-color: #3a3d42;
  color: #e4e6eb;
}
</style>
