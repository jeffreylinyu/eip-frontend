<template>
  <div class="form-a4-export-page a4-dark">
    <PageHeader
      :title="pageTitle"
      icon="fa fa-file-alt"
      :breadcrumbs="pageBreadcrumbs"
    />

    <Card>
      <CardBody>
        <!-- 操作說明 -->
        <div class="alert alert-info mb-4">
          <h5 class="alert-heading">
            <i class="fa fa-info-circle me-2"></i>操作說明
          </h5>
          <p class="mb-0">
            操作欄：<i class="fa fa-upload"></i> 上傳檔案、<i class="fa fa-file-pdf"></i> 查看相關文件、
            <i class="fa fa-file-word"></i> 匯出該次展延申請總表{{ isContractorRoute ? '（O-2）' : '（A-4）' }}<span v-if="isEngineeringTab">（監造帳號工程端不提供匯出）</span>。
            表格中的「歷次展延核定情形」會自動帶入該筆之前所有已核准的展延紀錄。
          </p>
        </div>

        <!-- 視角切換 Tab -->
        <div class="mb-4">
          <ul class="nav nav-tabs a4-tabs">
            <li class="nav-item">
              <a
                class="nav-link"
                :class="{ active: activeTab === 'SUPERVISORY' }"
                href="javascript:;"
                @click="switchTab('SUPERVISORY')"
              >
                <i class="fa fa-hard-hat me-1"></i>工程端
              </a>
            </li>
            <li v-if="isSupervisoryUser" class="nav-item">
              <a
                class="nav-link"
                :class="{ active: activeTab === 'SUPERVISION_COMPANY' }"
                href="javascript:;"
                @click="switchTab('SUPERVISION_COMPANY')"
              >
                <i class="fa fa-building me-1"></i>監造端
              </a>
            </li>
          </ul>
        </div>

        <!-- 歷次展延核定情形 -->
        <div class="mb-4">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h5 class="mb-0">
              <i class="fa fa-history me-2"></i>歷次展延核定情形
            </h5>
            <div class="d-flex gap-2">
              <button
                class="btn btn-sm btn-outline-secondary"
                type="button"
                :disabled="isLoadingExtensionHistory || !hasCurrentProject"
                @click="loadExtensionHistory"
              >
                <span v-if="isLoadingExtensionHistory" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                <i v-else class="fa fa-sync me-1"></i>重新載入
              </button>
              <button
                v-if="!isViewingOther"
                class="btn btn-sm btn-outline-theme"
                type="button"
                :disabled="!hasCurrentProject"
                @click="addExtensionRecord"
              >
                <i class="fa fa-plus me-1"></i>新增記錄
              </button>
            </div>
          </div>

          <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
            <i class="fa fa-exclamation-triangle me-2"></i>
            請先選擇工程案，才能顯示展延紀錄。
          </div>

          <div v-else-if="isLoadingExtensionHistory" class="text-center py-4">
            <div class="spinner-border text-primary me-2" role="status">
              <span class="visually-hidden">載入中...</span>
            </div>
            <span>載入展延記錄中...</span>
          </div>

          <div v-else-if="extensionHistory.length === 0" class="text-center py-4 text-muted">
            <i class="fa fa-inbox fa-2x mb-2 d-block"></i>
            <div>尚無展延記錄</div>
            <small>點擊「新增記錄」開始建立展延資料</small>
          </div>

          <div v-else class="table-responsive">
            <table class="table a4-table mb-0">
              <thead>
                <tr>
                  <th style="width: 70px;" class="text-center">拖移排序</th>
                  <th style="width: 150px;">{{ hasDesignChangeVersions ? '狀態／使用資料版本' : '狀態' }}</th>
                  <th style="width: 140px;">展延天數</th>
                  <th style="min-width: 140px;">展延因素概要</th>
                  <th style="width: 180px;">發文字號</th>
                  <th style="width: 200px;">展延後完工日期</th>
                  <th v-if="!isViewingOther" style="width: 140px;" class="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(record, index) in extensionHistory" :key="record.extensionId ?? `row-${index}`">
                    <!-- 序次（依後端最小日期自動排序，不可手動拖曳） -->
                    <td class="text-center align-middle">
                      <span class="a4-seq-num">{{ index + 1 }}</span>
                    </td>
                    <!-- 狀態（有變更設計時顯示使用資料版本） -->
                    <td class="align-middle">
                      <div class="d-flex flex-column gap-1">
                        <select
                          class="form-select form-select-sm"
                          :value="record.status || ExtensionStatus.DRAFT"
                          :disabled="isViewingOther"
                          @change="onStatusChange(record, ($event.target as HTMLSelectElement).value as ExtensionStatus)"
                        >
                          <option :value="ExtensionStatus.DRAFT">草稿</option>
                          <option :value="ExtensionStatus.PENDING">待審核</option>
                          <option :value="ExtensionStatus.APPROVED">已核准</option>
                          <option :value="ExtensionStatus.REJECTED">已退回</option>
                        </select>
                        <div v-if="hasDesignChangeVersions && record.versionLabel" class="small text-muted">
                          <div>{{ record.versionLabel }}</div>
                          <div v-if="record.versionRange">{{ record.versionRange }}</div>
                        </div>
                      </div>
                    </td>
                    <!-- 免計日期 -->
                    <td class="align-middle">
                      <div
                        class="a4-dates-cell"
                        :class="{ 'a4-dates-clickable': !isViewingOther }"
                        @click="!isViewingOther && openDateModal(record)"
                      >
                        <template v-if="record.specificDates && record.specificDates.length > 0">
                          <div class="d-flex flex-wrap gap-1">
                            <span
                              v-for="(date, idx) in record.specificDates.slice(0, 4)"
                              :key="idx"
                              class="badge border border-info text-info px-2 py-1 rounded fs-11px"
                            >
                              {{ formatISOToRepublicDate(date) }}
                            </span>
                            <span v-if="record.specificDates.length > 4" class="badge border border-secondary text-secondary px-2 py-1 rounded fs-11px">
                              +{{ record.specificDates.length - 4 }}
                            </span>
                          </div>
                          <small class="text-muted mt-1 d-block">共 {{ record.specificDates.length }} 天</small>
                        </template>
                        <template v-else>
                          <span class="text-muted small">
                            <i v-if="!isViewingOther" class="fa fa-calendar-plus me-1"></i>
                            {{ isViewingOther ? '未選取' : '點擊編輯' }}
                          </span>
                        </template>
                      </div>
                    </td>
                    <!-- 展延因素概要 -->
                    <td>
                      <textarea
                        class="form-control form-control-sm"
                        rows="2"
                        v-model="record.extendContent"
                        :readonly="isViewingOther"
                        @input="updateExtensionRecord(record.extensionId, 'extendContent', ($event.target as HTMLTextAreaElement).value)"
                        placeholder="請輸入展延因素概要"
                      ></textarea>
                      <button
                        v-if="!isViewingOther"
                        class="btn btn-sm a4-btn-copy-subject mt-1"
                        type="button"
                        @click="applyDocSubject(record)"
                        title="帶入關聯公文主旨"
                      >
                        <i class="fa fa-file-import me-1"></i>同公文主旨
                      </button>
                    </td>
                    <!-- 發文字號 -->
                    <td class="align-middle">
                      <div v-if="record.linkedDocumentNumber" class="d-flex align-items-center gap-1">
                        <span
                          class="small a4-linked-doc-link"
                          style="word-break: break-all;"
                          title="點擊預覽公文"
                          @click="openLinkedDocPreview(record)"
                        >
                          {{ record.linkedDocumentNumber }}
                        </span>
                        <button v-if="!isViewingOther" class="btn btn-sm btn-outline-danger p-0 px-1" style="font-size: 0.7rem; line-height: 1.2;" title="取消關聯" @click="clearLinkedDoc(record)">
                          <i class="fa fa-times"></i>
                        </button>
                      </div>
                      <button
                        v-else-if="!isViewingOther"
                        class="btn btn-sm btn-outline-info w-100"
                        @click="openDocPicker(record)"
                      >
                        <i class="fa fa-file-lines me-1"></i>選擇公文
                      </button>
                      <span v-else class="small text-muted">—</span>
                    </td>
                    <!-- 展延後完工日期（民國年月日，依工程基本資料之開工日與工期計算） -->
                    <td class="align-middle">
                      <input
                        type="text"
                        class="form-control form-control-sm bg-light"
                        :value="record.calculatedEndDateAfterExtension ? formatISOToRepublicDate(record.calculatedEndDateAfterExtension) : ''"
                        readonly
                        :placeholder="record.calculatedEndDateAfterExtension ? '系統計算' : '需先填寫工程基本資料之開工日與工期'"
                        style="cursor: not-allowed;"
                        :title="record.calculatedEndDateAfterExtension ? '' : '請至工程基本資料填寫開工日與工期後，重新整理或儲存即可重算'"
                      />
                    </td>
                    <!-- 操作（共用下拉選單組件） -->
                    <td v-if="!isViewingOther" class="text-center align-middle">
                      <FormTableOperationMenu
                        :record="record"
                        :record-id="record.extensionId"
                        theme-class="a4-dark"
                      >
                        <template #default="{ close }">
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            :class="{ disabled: isUploading[record.extensionId] }"
                            style="cursor: pointer;"
                            @click="!isUploading[record.extensionId] && (handleUploadClick(record), close())"
                          >
                            <i v-if="isUploading[record.extensionId]" class="fa fa-spinner fa-spin"></i>
                            <i v-else class="fa fa-upload"></i>
                            <span>上傳檔案</span>
                          </div>
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            style="cursor: pointer;"
                            @click="openAttachmentPanel(record.extensionId), close()"
                          >
                            <i class="fa fa-file-pdf"></i>
                            <span>相關文件</span>
                            <span
                              v-if="attachmentCounts[record.extensionId]"
                              class="badge rounded-pill bg-danger ms-1"
                              style="font-size: 0.65rem;"
                            >{{ attachmentCounts[record.extensionId] }}</span>
                          </div>
                          <div
                            v-if="!isEngineeringTab"
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            :class="{ disabled: isExporting }"
                            style="cursor: pointer;"
                            @click="!isExporting && (handleExportForExtension(record.extensionId), close())"
                          >
                            <i class="fa fa-file-word"></i>
                            <span>匯出此次展延表</span>
                          </div>
                          <hr class="dropdown-divider">
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                            style="cursor: pointer;"
                            @click="removeExtensionRecord(record.extensionId), close()"
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
          <div v-if="extensionHistory.length > 0 && !isViewingOther" class="d-flex justify-content-end align-items-center mt-3 gap-2">
            <span v-if="isAutoSaving" class="text-muted small">
              <i class="fa fa-spinner fa-spin me-1"></i>自動儲存中...
            </span>
            <span v-else-if="!hasUnsavedChanges && !isSaving" class="text-success small">
              <i class="fa fa-check me-1"></i>已儲存
            </span>
            <span v-else-if="hasUnsavedChanges" class="text-warning small">
              <i class="fa fa-circle me-1" style="font-size: 0.5rem; vertical-align: middle;"></i>未儲存的變更
            </span>
            <button
              class="btn btn-sm btn-outline-theme"
              type="button"
              :disabled="isSaving || !hasUnsavedChanges"
              @click="saveAllExtensionRecords(false)"
            >
              <span v-if="isSaving" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              <i v-else class="fa fa-save me-1"></i>
              立即儲存
            </button>
          </div>
        </div>

        <!-- 匯出狀態提示 -->
        <div v-if="exportMessage" class="a4-export-compact d-flex flex-wrap align-items-center gap-2 py-2">
          <span :class="['small', exportMessage.type === 'success' ? 'text-success' : 'text-danger']">
            <i :class="[exportMessage.type === 'success' ? 'fa fa-check-circle' : 'fa fa-exclamation-circle', 'me-1']"></i>
            {{ exportMessage.text }}
          </span>
        </div>
      </CardBody>
    </Card>

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

    <!-- 免計日期編輯 Modal -->
    <Modal
      :show="showDateModal"
      title="編輯免計日期"
      icon="fa fa-calendar-days"
      size="lg"
      modalClass="a4-date-modal-dark"
      :hideFooter="true"
      @update:show="(v: boolean) => { if (!v) closeDateModal() }"
    >
      <template #body>
        <div v-if="dateModalRecord" class="a4-date-editor">
          <!-- 新增方式切換 -->
          <div class="mb-3">
            <div class="d-flex gap-2 mb-3">
              <button
                class="btn btn-sm"
                :class="dateAddMode === 'range' ? 'btn-primary' : 'btn-outline-secondary'"
                @click="dateAddMode = 'range'"
              >
                <i class="fa fa-arrows-left-right me-1"></i>日期區間
              </button>
              <button
                class="btn btn-sm"
                :class="dateAddMode === 'single' ? 'btn-primary' : 'btn-outline-secondary'"
                @click="dateAddMode = 'single'"
              >
                <i class="fa fa-calendar-day me-1"></i>個別選取
              </button>
            </div>

            <!-- 日期區間模式 -->
            <div v-if="dateAddMode === 'range'" class="a4-date-range-row">
              <div class="d-flex align-items-end gap-2 flex-wrap">
                <div>
                  <label class="form-label small mb-1">起始日期</label>
                  <RepublicDatePicker
                    :modelValue="rangeStart"
                    :useRepublicYear="true"
                    inputClass="form-control form-control-sm"
                    @update:modelValue="(v: string) => rangeStart = v"
                  />
                </div>
                <span class="text-muted pb-1">～</span>
                <div>
                  <label class="form-label small mb-1">結束日期</label>
                  <RepublicDatePicker
                    :modelValue="rangeEnd"
                    :useRepublicYear="true"
                    inputClass="form-control form-control-sm"
                    @update:modelValue="(v: string) => rangeEnd = v"
                  />
                </div>
                <button type="button" class="btn btn-sm btn-primary" :disabled="!rangeStart || !rangeEnd" @click="addDateRange">
                  <i class="fa fa-plus me-1"></i>加入
                </button>
              </div>
            </div>

            <!-- 個別選取模式 -->
            <div v-if="dateAddMode === 'single'">
              <div class="d-flex align-items-end gap-2">
                <div>
                  <label class="form-label small mb-1">選擇日期</label>
                  <RepublicDatePicker
                    :modelValue="singleDate"
                    :useRepublicYear="true"
                    inputClass="form-control form-control-sm"
                    @update:modelValue="(v: string) => singleDate = v"
                  />
                </div>
                <button type="button" class="btn btn-sm btn-primary" :disabled="!singleDate" @click="addSingleDate">
                  <i class="fa fa-plus me-1"></i>加入
                </button>
              </div>
            </div>
          </div>

          <!-- 已選日期列表 -->
          <div class="a4-date-list">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-bold small">已選取日期（共 {{ dateModalDates.length }} 天）</span>
              <button
                v-if="dateModalDates.length > 0"
                class="btn btn-sm btn-outline-danger"
                @click="dateModalDates = []"
              >
                <i class="fa fa-trash me-1"></i>全部清除
              </button>
            </div>
            <div v-if="dateModalDates.length === 0" class="text-muted small text-center py-3">
              <i class="fa fa-calendar-xmark fa-lg mb-2 d-block"></i>
              尚未選取任何日期
            </div>
            <div v-else class="a4-date-tags">
              <span
                v-for="(date, idx) in dateModalDates"
                :key="idx"
                class="badge border border-info text-info px-2 py-1 rounded d-inline-flex align-items-center gap-1 me-1 mb-1"
              >
                {{ formatISOToRepublicDate(date) }}
                <button
                  type="button"
                  class="btn-close btn-close-sm"
                  style="font-size: 0.55rem;"
                  @click="dateModalDates.splice(idx, 1)"
                  aria-label="移除"
                ></button>
              </span>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="d-flex justify-content-end gap-2 mt-3 pt-3" style="border-top: 1px solid var(--a4-border);">
            <button class="btn btn-sm btn-outline-secondary" @click="closeDateModal">取消</button>
            <button class="btn btn-sm btn-primary" @click="saveDateModal">
              <i class="fa fa-check me-1"></i>確認（{{ dateModalDates.length }} 天）
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- 相關文件 Modal（共用組件） -->
    <RelatedDocumentsModal
      :show="showAttachmentModal"
      title="相關文件"
      :loading="isLoadingAttachments"
      :linked-docs="currentLinkedDocuments"
      :attachments="currentAttachments"
      :uploading="isUploadingInModal"
      :downloading-all="isDownloadingAll"
      upload-accept=".pdf,application/pdf"
      modal-class="a4-date-modal-dark"
      @update:show="(v: boolean) => { if (!v) showAttachmentModal = false }"
      @upload="handleModalUpload"
      @download-all="handleDownloadAll"
      @unlink-doc="handleUnlinkDocInModal"
      @preview-doc="handlePreviewDocument"
      @download-doc="handleDownloadDocument"
      @preview-att="handlePreviewAttachment"
      @download-att="handleDownloadAttachment"
      @delete-att="handleDeleteAttachment"
    />

    <!-- PDF 預覽 Modal -->
    <Modal
      :show="showPreviewModal"
      :title="'預覽 - ' + previewFileName"
      icon="fa fa-eye"
      size="xl"
      modalClass="a4-date-modal-dark"
      :hideFooter="true"
      @update:show="(v: boolean) => { if (!v) { showPreviewModal = false; previewUrl = '' } }"
    >
      <template #body>
        <div v-if="isLoadingPreview" class="text-center py-5">
          <i class="fa fa-spinner fa-spin fa-2x mb-2 d-block"></i>
          <span>載入預覽中...</span>
        </div>
        <div v-else-if="!previewUrl" class="text-center py-5 text-muted">
          <i class="fa fa-exclamation-circle fa-2x mb-2 d-block"></i>
          <span>無法產生預覽連結</span>
        </div>
        <iframe
          v-else
          :src="previewUrl"
          style="width: 100%; height: 75vh; border: none; border-radius: 6px;"
        ></iframe>
      </template>
    </Modal>

    <!-- 共用隱藏 input：操作選單內「上傳檔案」觸發 -->
    <input
      ref="operationMenuFileInputRef"
      type="file"
      accept=".pdf,application/pdf"
      multiple
      class="d-none"
      @change="onOperationMenuFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import DocumentPicker from '@/components/document/DocumentPicker.vue'
import FormTableOperationMenu from '@/components/forms/FormTableOperationMenu.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RelatedDocumentsModal from '@/components/related-documents/RelatedDocumentsModal.vue'
import { formA4Api, downloadBlobAsFile, handleApiError } from '@/api/forms'
import { useExportLoading } from '@/composables/useExportLoading'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
import {
  getExtensionList, createExtension, updateExtension, deleteExtension,
  linkExtensionDocument, unlinkExtensionDocument, getExtensionLinkedDocuments,
  uploadExtensionAttachment, getExtensionAttachments, deleteExtensionAttachment,
  previewExtensionAttachment, downloadExtensionAttachment, downloadAllExtensionAttachments,
  type ExtensionRecord, type ExtensionLinkedDocument, type ExtensionAttachment, ExtensionStatus, ExtensionType
} from '@/api/extension'
import { getDocumentCenterList, type DocumentCenterListItem } from '@/api/documentCenter'
import { getDesignChangeList } from '@/api/designChange'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { viewType, isSupervisory } = useViewPerspective()

const hasCurrentProject = computed(() => !!workspaceStore.currentProject?.id)
const currentProjectName = computed(() => workspaceStore.currentProject?.name || '未選擇工程案')
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')

// ── 視角 & Tab ──
const isSupervisoryUser = computed(() => isSupervisory.value)

const activeTab = ref<string>('SUPERVISORY')

// 當前查詢用的 ownerType
const currentOwnerType = computed(() => activeTab.value)
// 匯出 API 使用的 ownerType：營造路由用 CONTRACTOR，監造 A-4 用 currentOwnerType
const requestOwnerType = computed(() => (isContractorRoute.value ? 'CONTRACTOR' : currentOwnerType.value))

// 監造端查看監造資料時為可編輯，查看工程端資料也可編輯；非監造帳號固定工程端
const isViewingOther = computed(() => false)

// 是否為工程端（監造帳號 + SUPERVISORY tab）
const isEngineeringTab = computed(() => isSupervisoryUser.value && activeTab.value === 'SUPERVISORY')

// 當前工程是否有變更設計（有則表頭為「狀態／使用資料版本」且每筆都顯示版本與區間）
// 監造公司視角沒有變更設計邏輯，僅工程端／營造端才顯示版本
const designChangeList = ref<{ id: number }[]>([])
const hasDesignChangeVersions = computed(() =>
  designChangeList.value.length > 0 && activeTab.value !== 'SUPERVISION_COMPANY'
)

const switchTab = (tab: string) => {
  activeTab.value = tab
  loadExtensionHistory()
}

// ── PDF 附件管理 ──
const isUploading = ref<Record<string, boolean>>({})
const attachmentCounts = ref<Record<string, number>>({})
const showAttachmentModal = ref(false)
const currentAttachmentExtensionId = ref('')
const currentAttachments = ref<ExtensionAttachment[]>([])
const isLoadingAttachments = ref(false)
const isUploadingInModal = ref(false)
const operationMenuFileInputRef = ref<HTMLInputElement | null>(null)
const operationMenuUploadExtensionId = ref('')

function handleUploadClick(record: ExtensionRecord) {
  operationMenuUploadExtensionId.value = record.extensionId
  nextTick(() => operationMenuFileInputRef.value?.click())
}

function onOperationMenuFileChange(e: Event) {
  const extId = operationMenuUploadExtensionId.value
  if (extId) handleFileUpload(e, extId)
  operationMenuUploadExtensionId.value = ''
  ;(e.target as HTMLInputElement).value = ''
}

async function loadAttachmentCounts() {
  for (const record of extensionHistory.value) {
    if (!record.extensionId || record.extensionId.startsWith('ext_')) continue
    try {
      const [atts, refs] = await Promise.all([
        getExtensionAttachments(record.extensionId),
        getExtensionLinkedDocuments(record.extensionId).catch(() => [])
      ])
      attachmentCounts.value[record.extensionId] = atts.length + refs.length
    } catch (_) {
      attachmentCounts.value[record.extensionId] = 0
    }
  }
}

async function handleFileUpload(event: Event, extensionId: string) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  if (!extensionId || extensionId.startsWith('ext_')) {
    exportMessage.value = { type: 'danger', text: '請先儲存記錄後再上傳附件' }
    input.value = ''
    return
  }

  isUploading.value[extensionId] = true
  try {
    for (const file of Array.from(files)) {
      await uploadExtensionAttachment(extensionId, file)
    }
    const atts = await getExtensionAttachments(extensionId)
    attachmentCounts.value[extensionId] = atts.length
    exportMessage.value = { type: 'success', text: `已上傳 ${files.length} 個檔案` }
  } catch (err) {
    console.error('上傳附件失敗:', err)
    exportMessage.value = { type: 'danger', text: '上傳附件失敗' }
  } finally {
    isUploading.value[extensionId] = false
    input.value = ''
  }
}

const currentLinkedDocuments = ref<DocumentCenterListItem[]>([])
const currentLinkedRefs = ref<{ referenceId: number; documentId: number }[]>([])

async function openAttachmentPanel(extensionId: string) {
  currentAttachmentExtensionId.value = extensionId
  showAttachmentModal.value = true
  isLoadingAttachments.value = true
  currentLinkedDocuments.value = []
  currentLinkedRefs.value = []
  currentAttachments.value = []
  try {
    const [atts, refs] = await Promise.all([
      getExtensionAttachments(extensionId),
      getExtensionLinkedDocuments(extensionId).catch(() => [] as ExtensionLinkedDocument[])
    ])
    currentAttachments.value = atts
    currentLinkedRefs.value = refs.map(r => ({ referenceId: r.referenceId, documentId: r.documentId }))

    if (refs.length > 0 && docCacheMap.value.size > 0) {
      const docs: DocumentCenterListItem[] = []
      for (const ref of refs) {
        const doc = docCacheMap.value.get(ref.documentId)
        if (doc) docs.push(doc)
      }
      currentLinkedDocuments.value = docs
    }
  } catch (err) {
    console.error('載入文件失敗:', err)
    currentAttachments.value = []
  } finally {
    isLoadingAttachments.value = false
  }
}

function handlePreviewDocument(doc: DocumentCenterListItem) {
  if (!doc.fileUrl) return
  previewFileName.value = doc.documentNumber || doc.fileName
  previewUrl.value = doc.fileUrl
  showPreviewModal.value = true
}

function handleDownloadDocument(doc: DocumentCenterListItem) {
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
  const extensionId = currentAttachmentExtensionId.value
  if (!extensionId) return
  const ref = currentLinkedRefs.value.find(r => r.documentId === doc.id)
  if (!ref || !confirm('確定要取消關聯此公文？')) return
  try {
    await unlinkExtensionDocument(extensionId, ref.referenceId)
    const refs = await getExtensionLinkedDocuments(extensionId).catch(() => [] as ExtensionLinkedDocument[])
    currentLinkedRefs.value = refs.map(r => ({ referenceId: r.referenceId, documentId: r.documentId }))
    if (refs.length > 0 && docCacheMap.value.size > 0) {
      currentLinkedDocuments.value = refs.map(r => docCacheMap.value.get(r.documentId)).filter(Boolean) as DocumentCenterListItem[]
    } else {
      currentLinkedDocuments.value = []
    }
    const record = extensionHistory.value.find((r: any) => r.extensionId === extensionId)
    if (record) {
      ;(record as any).linkedReferenceId = null
      ;(record as any).linkedDocumentId = null
      ;(record as any).linkedDocumentNumber = ''
      ;(record as any).linkedDocumentSubject = ''
      record.verifyNumber = ''
    }
    attachmentCounts.value[extensionId] = currentAttachments.value.length + currentLinkedDocuments.value.length
  } catch (e) {
    console.error('取消關聯失敗:', e)
  }
}

async function handleModalUpload(files: FileList) {
  if (!files?.length) return
  const extId = currentAttachmentExtensionId.value
  if (!extId) return
  isUploadingInModal.value = true
  try {
    for (const file of Array.from(files)) {
      await uploadExtensionAttachment(extId, file)
    }
    currentAttachments.value = await getExtensionAttachments(extId)
    attachmentCounts.value[extId] = currentAttachments.value.length + currentLinkedDocuments.value.length
  } catch (err) {
    console.error('上傳附件失敗:', err)
  } finally {
    isUploadingInModal.value = false
  }
}

async function handleDownloadAttachment(att: ExtensionAttachment) {
  try {
    await downloadExtensionAttachment(currentAttachmentExtensionId.value, att.id, att.fileName)
  } catch (err) {
    console.error('下載附件失敗:', err)
    exportMessage.value = { type: 'danger', text: '下載附件失敗' }
  }
}

const isDownloadingAll = ref(false)

async function handleDownloadAll() {
  isDownloadingAll.value = true
  try {
    await downloadAllExtensionAttachments(currentAttachmentExtensionId.value)
  } catch (err) {
    console.error('下載全部失敗:', err)
    exportMessage.value = { type: 'danger', text: '下載全部失敗' }
  } finally {
    isDownloadingAll.value = false
  }
}

async function handleDeleteAttachment(att: ExtensionAttachment) {
  if (!confirm(`確定要刪除「${att.fileName}」？`)) return
  try {
    await deleteExtensionAttachment(currentAttachmentExtensionId.value, att.id)
    currentAttachments.value = currentAttachments.value.filter(a => a.id !== att.id)
    attachmentCounts.value[currentAttachmentExtensionId.value] = currentAttachments.value.length
  } catch (err) {
    console.error('刪除附件失敗:', err)
  }
}

// ── PDF 預覽 ──
const showPreviewModal = ref(false)
const previewUrl = ref('')
const previewFileName = ref('')
const isLoadingPreview = ref(false)

async function handlePreviewAttachment(att: ExtensionAttachment) {
  isLoadingPreview.value = true
  showPreviewModal.value = true
  previewFileName.value = att.fileName
  try {
    const result = await previewExtensionAttachment(currentAttachmentExtensionId.value, att.id)
    previewUrl.value = result.url
  } catch (err) {
    console.error('取得預覽連結失敗:', err)
    previewUrl.value = ''
  } finally {
    isLoadingPreview.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 頁面標題與麵包屑（根據身份動態決定）
const isContractorRoute = computed(() => route.path.includes('/forms/o1'))

const pageTitle = computed(() => {
  if (isContractorRoute.value) {
    return 'O-2 工期展延申請總表'
  }
  return 'A-4 工期展延申請總表'
})

const pageBreadcrumbs = computed(() => {
  if (isContractorRoute.value) {
    return [
      { text: '表單匯出', href: 'javascript:;' },
      { text: 'O類表單', href: 'javascript:;' },
      { text: 'O-2 工期展延申請總表', active: true }
    ]
  }
  return [
    { text: '表單匯出', href: 'javascript:;' },
    { text: 'A類表單', href: 'javascript:;' },
    { text: 'A-4 工期展延申請總表', active: true }
  ]
})

// ── 公文選擇 ──
const showDocPicker = ref(false)
const pickerTargetRecord = ref<ExtensionRecord | null>(null)

function openDocPicker(record: ExtensionRecord) {
  pickerTargetRecord.value = record
  showDocPicker.value = true
}

async function onDocumentPicked(payload: { document: DocumentCenterListItem; documentName: string }) {
  const record = pickerTargetRecord.value
  if (!record) return

  const isNew = !record.extensionId || record.extensionId.startsWith('ext_')

  // 先更新前端狀態
  record.verifyNumber = payload.document.documentNumber || ''
  ;(record as any).linkedDocumentNumber = payload.document.documentNumber || payload.document.subject || ''
  ;(record as any).linkedDocumentId = payload.document.id
  ;(record as any).linkedDocumentSubject = payload.document.subject || ''

  // 如果記錄已存在於後端，立即建立關聯
  if (!isNew) {
    try {
      const sequence = extensionHistory.value.findIndex(r => r.extensionId === record.extensionId) + 1
      await linkExtensionDocument(record.extensionId, payload.document.id, sequence)
      // 重新取得關聯以取得 referenceId
      const refs = await getExtensionLinkedDocuments(record.extensionId)
      if (refs.length > 0) {
        ;(record as any).linkedReferenceId = refs[0].referenceId
      }
    } catch (e) {
      console.error('建立公文關聯失敗:', e)
    }
  }

  showDocPicker.value = false
  pickerTargetRecord.value = null
}

async function clearLinkedDoc(record: ExtensionRecord) {
  const refId = (record as any).linkedReferenceId
  const isNew = !record.extensionId || record.extensionId.startsWith('ext_')

  // 如果有 referenceId 且記錄不是暫存，先向後端取消關聯
  if (refId && !isNew) {
    try {
      await unlinkExtensionDocument(record.extensionId, refId)
    } catch (e) {
      console.error('取消公文關聯失敗:', e)
    }
  }

  record.verifyNumber = ''
  ;(record as any).linkedDocumentNumber = ''
  ;(record as any).linkedDocumentId = null
  ;(record as any).linkedReferenceId = null
  ;(record as any).linkedDocumentSubject = ''
}

/** 點擊關聯公文文號時開啟預覽 */
function openLinkedDocPreview(record: ExtensionRecord) {
  const docId = (record as any).linkedDocumentId
  if (docId == null) return
  const doc = docCacheMap.value.get(docId)
  if (doc?.fileUrl) handlePreviewDocument(doc)
}

// ── 同公文主旨 ──
function applyDocSubject(record: ExtensionRecord) {
  // 優先用已關聯公文的主旨
  let subject = (record as any).linkedDocumentSubject as string | undefined

  // 如果沒有直接關聯，嘗試用 verifyNumber（發文字號）從公文快取反查
  if (!subject && record.verifyNumber && docCacheMap.value.size > 0) {
    for (const doc of docCacheMap.value.values()) {
      if (doc.documentNumber === record.verifyNumber) {
        subject = doc.subject
        break
      }
    }
  }

  if (subject) {
    record.extendContent = subject
  } else if (!record.verifyNumber && !(record as any).linkedDocumentId) {
    alert('請先選擇關聯公文')
    } else {
    alert('找不到該公文的主旨資訊，請確認公文內容是否已填寫主旨')
  }
}

// ── 展延紀錄 ──
const extensionHistory = ref<ExtensionRecord[]>([])
const originalExtensionHistory = ref<ExtensionRecord[]>([])
const isLoadingExtensionHistory = ref(false)
const isSaving = ref(false)

// ── 自動儲存 ──
const isAutoSaving = ref(false)
const hasUnsavedChanges = ref(false)
const autoSaveTimer = ref<number | null>(null)
const isInitialLoadSettled = ref(false)

// ── 公文快取（用於反查主旨等欄位） ──
const docCacheMap = ref<Map<number, DocumentCenterListItem>>(new Map())

// ── 匯出 ──
const isExporting = ref(false)
const exportMessage = ref<{ type: 'success' | 'danger'; text: string } | null>(null)
const { runWithExportLoading } = useExportLoading()

// ── Toast（簡易版，用 alert 代替） ──
const showToast = (title: string, _message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  // 可替換為共用 Toast 組件
  if (type === 'error' || type === 'warning') {
    console.warn(`[${title}]`, _message)
  }
}

// ── 日期格式工具 ──
const formatDateToISO = (dateValue: string | Date): string => {
  if (!dateValue) return new Date().toISOString()
  if (typeof dateValue === 'string') {
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) return `${dateValue}T00:00:00`
    if (dateValue.includes('T')) return new Date(dateValue).toISOString()
    }
      return new Date(dateValue).toISOString()
  }
  
const formatISOToDateTimeLocal = (isoString: string): string => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatISOToDate = (isoString: string): string => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 展延後完工日期／免計日期：114年01月15日 */
const formatISOToRepublicDate = (isoString: string): string => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const y = date.getFullYear()
  const rocYear = y - 1911
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${rocYear}年${month}月${day}日`
}

/** 為展延紀錄列表填入關聯公文欄位（getExtensionList 不回傳，需另外查 getExtensionLinkedDocuments） */
async function fillLinkedDocumentInfo(records: ExtensionRecord[]) {
  const docMap = docCacheMap.value
  for (const record of records) {
    if (!record.extensionId || record.extensionId.startsWith('ext_')) continue
    try {
      const refs = await getExtensionLinkedDocuments(record.extensionId)
      if (refs.length > 0) {
        const ref = refs[0]
        ;(record as any).linkedDocumentId = ref.documentId
        ;(record as any).linkedReferenceId = ref.referenceId
        ;(record as any).linkedDocumentNumber = record.verifyNumber || ref.targetName || ref.displayTitle || ''
        const cachedDoc = docMap.get(ref.documentId)
        ;(record as any).linkedDocumentSubject = cachedDoc?.subject || ''
      } else {
        ;(record as any).linkedDocumentNumber = record.verifyNumber || ''
        const matchedDoc = record.verifyNumber
          ? [...docMap.values()].find(d => d.documentNumber === record.verifyNumber)
          : undefined
        ;(record as any).linkedDocumentSubject = matchedDoc?.subject || ''
      }
    } catch (_) {
      ;(record as any).linkedDocumentNumber = record.verifyNumber || ''
      ;(record as any).linkedDocumentSubject = ''
    }
  }
}

// ── 載入展延紀錄 ──
const loadExtensionHistory = async () => {
  const constructionId = workspaceStore.currentProject?.id || ''
  if (!constructionId) {
    extensionHistory.value = []
    designChangeList.value = []
    return
  }
  try {
    isLoadingExtensionHistory.value = true
    const response = await getExtensionList({ constructionId, ownerType: requestOwnerType.value })
    if (response.success && response.data) {
      const records = (response.data || []).map(record => ({
        ...record,
        extendDate: record.extendDate ? formatISOToDateTimeLocal(record.extendDate) : '',
        completionDateAfterExtension: record.completionDateAfterExtension
          ? formatISOToDate(record.completionDateAfterExtension)
          : (record.extendDate ? formatISOToDate(record.extendDate) : ''),
        verifyNumber: record.verifyNumber || '',
        linkedDocumentNumber: '',
        linkedDocumentId: null,
        linkedReferenceId: null,
        status: record.status || ExtensionStatus.DRAFT,
        extensionType: ExtensionType.SPECIFIC_DATES,
        specificDates: record.specificDates || []
      } as any))

      // 建立公文快取（用於取得 subject 等欄位）
      try {
        const docList = await getDocumentCenterList(constructionId)
        const map = new Map<number, DocumentCenterListItem>()
        for (const doc of docList) map.set(doc.id, doc)
        docCacheMap.value = map
      } catch (_) { /* ignore */ }

      await fillLinkedDocumentInfo(records)

      extensionHistory.value = records
      originalExtensionHistory.value = JSON.parse(JSON.stringify(records))

      // 載入變更設計列表以判斷是否顯示「使用資料版本」欄位與內容
      try {
        const list = await getDesignChangeList(constructionId)
        designChangeList.value = Array.isArray(list) ? list : []
      } catch (_) {
        designChangeList.value = []
      }
      } else {
      extensionHistory.value = []
      originalExtensionHistory.value = []
      designChangeList.value = []
    }
    // 重置自動儲存狀態
    hasUnsavedChanges.value = false
    isInitialLoadSettled.value = false
    // 等待資料同步穩定後啟用自動儲存偵測
    setTimeout(() => {
      originalExtensionHistory.value = JSON.parse(JSON.stringify(extensionHistory.value))
      hasUnsavedChanges.value = false
      isInitialLoadSettled.value = true
    }, 1500)

    // 載入各筆附件數量（監造端／營造工程端／監造工程端皆顯示）
    loadAttachmentCounts()
    } catch (error) {
    console.error('載入展延列表失敗:', error)
    extensionHistory.value = []
    designChangeList.value = []
  } finally {
    isLoadingExtensionHistory.value = false
  }
}

// ── 新增展延紀錄 ──
const addExtensionRecord = () => {
  const constructionId = workspaceStore.currentProject?.id || ''
  const newExtensionId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  extensionHistory.value.push({
    extensionId: newExtensionId,
    constructionId,
    verifyNumber: '',
    extendReason: '',
    extendContent: '',
    extendDate: new Date().toISOString(),
    extendDay: 0,
    approvalDocumentNumber: '',
    completionDateAfterExtension: '',
    isApproved: false,
    status: ExtensionStatus.DRAFT,
    extensionType: ExtensionType.SPECIFIC_DATES,
    specificDates: []
  })
}

// ── 刪除展延紀錄 ──
const removeExtensionRecord = async (extensionId: string) => {
  // 尚未存入後端的暫存紀錄直接移除
  if (extensionId.startsWith('ext_')) {
    extensionHistory.value = extensionHistory.value.filter(r => r.extensionId !== extensionId)
    return
  }
  try {
    await deleteExtension(extensionId)
    // 重新載入以取得後端重算結果
    if (workspaceStore.currentProject) {
        await workspaceStore.getProjectsByWorkspace(workspaceStore.currentProject.workspaceId)
      const updated = workspaceStore.workspaceProjects.find(p => p.id === workspaceStore.currentProject?.id)
      if (updated) workspaceStore.setCurrentProject(updated, false)
    }
    await loadExtensionHistory()
    } catch (error) {
    console.error('刪除展延記錄失敗:', error)
  }
}

// ── 更新單筆欄位 ──
const updateExtensionRecord = (extensionId: string, field: string, value: any) => {
  const record = extensionHistory.value.find(r => r.extensionId === extensionId)
  if (!record) return
  ;(record as any)[field] = value

  if (field === 'specificDates') {
    record.extendDay = Array.isArray(value) ? value.length : 0
  }
}

/** 狀態變更：先更新本地，已儲存紀錄立即送後端並重取列表，避免被其他 refetch 覆蓋而「復原」 */
async function onStatusChange(record: ExtensionRecord, newStatus: ExtensionStatus) {
  updateExtensionRecord(record.extensionId, 'status', newStatus)
  // 同步快照，避免 deep watch 觸發 debouncedAutoSave 造成重複打 update + list
  originalExtensionHistory.value = JSON.parse(JSON.stringify(extensionHistory.value))
  const constructionId = workspaceStore.currentProject?.id
  const isNewRecord = !record.extensionId || record.extensionId.startsWith('ext_')
  if (!constructionId || isNewRecord) return
  try {
    const uniqueDates = [...new Set((record.specificDates || []).map(toDateOnly).filter(Boolean))].sort()
    await updateExtension({
      extensionId: record.extensionId,
      verifyNumber: record.verifyNumber || '',
      extendContent: record.extendContent,
      status: newStatus,
      extensionType: ExtensionType.SPECIFIC_DATES,
      specificDates: uniqueDates,
      extendDay: uniqueDates.length || record.extendDay || 0
    })
    const freshResp = await getExtensionList({ constructionId, ownerType: requestOwnerType.value })
    if (freshResp.success && freshResp.data && freshResp.data.length > 0) {
      isInitialLoadSettled.value = false
      extensionHistory.value = freshResp.data
      await fillLinkedDocumentInfo(extensionHistory.value)
      originalExtensionHistory.value = JSON.parse(JSON.stringify(extensionHistory.value))
      setTimeout(() => { isInitialLoadSettled.value = true }, 300)
    }
  } catch (e) {
    console.error('狀態儲存失敗:', e)
    showToast('儲存失敗', '狀態無法寫入，請稍後再試', 'error')
  }
}

// ── 免計日期 Modal ──
const showDateModal = ref(false)
const dateModalRecord = ref<ExtensionRecord | null>(null)
const dateModalDates = ref<string[]>([])
const dateAddMode = ref<'range' | 'single'>('range')
const rangeStart = ref('')
const rangeEnd = ref('')
const singleDate = ref('')

/** 統一為 YYYY-MM-DD，避免後端回傳 "2025-02-18"、前端 "2025-02-18T00:00:00" 被當成兩筆 */
function toDateOnly(s: string): string {
  return s ? s.slice(0, 10) : ''
}

function openDateModal(record: ExtensionRecord) {
  dateModalRecord.value = record
  const normalized = (record.specificDates || []).map(toDateOnly).filter(Boolean)
  dateModalDates.value = [...new Set(normalized)].sort()
  dateAddMode.value = 'range'
  rangeStart.value = ''
  rangeEnd.value = ''
  singleDate.value = ''
  showDateModal.value = true
}

function closeDateModal() {
  showDateModal.value = false
  dateModalRecord.value = null
}

/** 區間加入：產生 start ~ end 的所有日期 */
function addDateRange() {
  if (!rangeStart.value || !rangeEnd.value) return
  const start = new Date(rangeStart.value)
  const end = new Date(rangeEnd.value)
  if (start > end) return // 起始 > 結束：無效

  const cursor = new Date(start)
  const next: string[] = [...dateModalDates.value]
  while (cursor <= end) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    next.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  dateModalDates.value = [...new Set(next)].sort()
  rangeStart.value = ''
  rangeEnd.value = ''
}

/** 個別加入（使用 YYYY-MM-DD，並去重避免同日多筆） */
function addSingleDate() {
  const raw = (singleDate.value || '').trim()
  if (!raw) return
  const dateOnly = toDateOnly(raw)
  if (!dateOnly) return
  // 根本原因：避免重複觸發（如未設 type="button" 或雙擊）導致同一天被加入兩次
  if (dateModalDates.value.includes(dateOnly)) {
    singleDate.value = ''
    return
  }
  dateModalDates.value = [...new Set([...dateModalDates.value, dateOnly])].sort()
  singleDate.value = ''
}

/** 確認儲存：立即寫入本筆免計日期並觸發後端重算，取得新順序後重排列表 */
async function saveDateModal() {
  const record = dateModalRecord.value
  if (!record) return
  const unique = [...new Set(dateModalDates.value)].sort()
  record.specificDates = unique
  record.extendDay = record.specificDates.length
  // 同步快照，避免 deep watch 觸發 debouncedAutoSave 造成重複打 update + list（導致重複日期等）
  originalExtensionHistory.value = JSON.parse(JSON.stringify(extensionHistory.value))
  closeDateModal()

  const constructionId = workspaceStore.currentProject?.id
  const isNewRecord = !record.extensionId || record.extensionId.startsWith('ext_')
  if (!constructionId || isNewRecord) return

  try {
    await updateExtension({
      extensionId: record.extensionId,
      verifyNumber: record.verifyNumber || '',
      extendContent: record.extendContent,
      status: record.status,
      extensionType: ExtensionType.SPECIFIC_DATES,
      specificDates: record.specificDates || [],
      extendDay: record.specificDates?.length ?? record.extendDay
    })
    const freshResp = await getExtensionList({ constructionId, ownerType: requestOwnerType.value })
    if (freshResp.success && freshResp.data && freshResp.data.length > 0) {
      isInitialLoadSettled.value = false
      extensionHistory.value = freshResp.data
      await fillLinkedDocumentInfo(extensionHistory.value)
      originalExtensionHistory.value = JSON.parse(JSON.stringify(extensionHistory.value))
      setTimeout(() => { isInitialLoadSettled.value = true }, 300)
    }
  } catch (e) {
    console.error('免計日期儲存失敗:', e)
    showToast('儲存失敗', '免計日期無法寫入，請稍後再試', 'error')
  }
}

// ── 變更偵測 ──
const hasRecordChanged = (current: ExtensionRecord, original: ExtensionRecord): boolean => {
  if (!original) return true
  return (
    current.verifyNumber !== original.verifyNumber ||
    current.extendContent !== original.extendContent ||
    current.completionDateAfterExtension !== original.completionDateAfterExtension ||
    current.extendDay !== original.extendDay ||
    current.status !== original.status ||
    current.extensionType !== original.extensionType ||
    JSON.stringify(current.specificDates || []) !== JSON.stringify(original.specificDates || [])
  )
}

// ── 批次保存 ──
const saveAllExtensionRecords = async (silent: boolean = false) => {
  const constructionId = workspaceStore.currentProject?.id || ''
  if (!constructionId) return

  if (!silent) {
    isSaving.value = true
  }
  let successCount = 0
  let errorCount = 0

  for (const record of extensionHistory.value) {
    try {
      const isNew = !record.extensionId || record.extensionId.startsWith('ext_')

      if (isNew) {
        const uniqueDates = [...new Set((record.specificDates || []).map(toDateOnly).filter(Boolean))].sort()
        const req: any = {
          constructionId,
          verifyNumber: record.verifyNumber || '',
          extendReason: record.extendReason || '',
          extendContent: record.extendContent,
          status: record.status || ExtensionStatus.DRAFT,
          extensionType: ExtensionType.SPECIFIC_DATES,
          specificDates: uniqueDates,
          extendDay: uniqueDates.length || record.extendDay || 0,
          ownerType: requestOwnerType.value
        }
        const response = await createExtension(req)
        if (response.data?.extensionId) {
          record.extensionId = response.data.extensionId
          // 新建紀錄有選公文 → 建立關聯
          const docId = (record as any).linkedDocumentId
          if (docId) {
            try {
              const idx = extensionHistory.value.indexOf(record)
              await linkExtensionDocument(record.extensionId, docId, idx + 1)
            } catch (e) {
              console.error('新建紀錄關聯公文失敗:', e)
            }
          }
        }
        successCount++
      } else {
        const orig = originalExtensionHistory.value.find(o => o.extensionId === record.extensionId)
        if (hasRecordChanged(record, orig!)) {
          const uniqueDates = [...new Set((record.specificDates || []).map(toDateOnly).filter(Boolean))].sort()
          const req: any = {
            extensionId: record.extensionId,
            verifyNumber: record.verifyNumber || '',
            extendContent: record.extendContent
          }
          if (record.status) req.status = record.status
          req.extensionType = ExtensionType.SPECIFIC_DATES
          req.specificDates = uniqueDates
          req.extendDay = uniqueDates.length || record.extendDay || 0
          await updateExtension(req)
          successCount++
        }
      }
  } catch (error) {
      console.error('保存展延記錄失敗:', error)
      errorCount++
      if (!silent) {
        showToast('儲存失敗', '部分紀錄保存失敗', 'error')
      }
    }
  }

  if (!silent) {
    isSaving.value = false
  }

  if (successCount > 0) {
    // 重新取得列表：後端會依「最小日期」重算並回傳新順序，直接替換以反映排序與完工日
    try {
      const constructionId2 = workspaceStore.currentProject?.id || ''
      if (constructionId2) {
        const freshResp = await getExtensionList({ constructionId: constructionId2, ownerType: requestOwnerType.value })
        if (freshResp.success && freshResp.data && freshResp.data.length > 0) {
          extensionHistory.value = freshResp.data
          await fillLinkedDocumentInfo(extensionHistory.value)
        }
      }
    } catch (_) { /* 忽略 */ }

    // 更新原始資料快照（避免重複觸發 watch）
    isInitialLoadSettled.value = false
    originalExtensionHistory.value = JSON.parse(JSON.stringify(extensionHistory.value))
    hasUnsavedChanges.value = false
    setTimeout(() => {
      isInitialLoadSettled.value = true
    }, 500)

    // 手動儲存時額外更新專案資料
    if (!silent && workspaceStore.currentProject) {
      try {
        await workspaceStore.getProjectsByWorkspace(workspaceStore.currentProject.workspaceId)
        const updated = workspaceStore.workspaceProjects.find(p => p.id === workspaceStore.currentProject?.id)
        if (updated) {
          workspaceStore.setCurrentProject(updated, false)
        }
      } catch (_) { /* 忽略 */ }
    }
  }
}

// ── 匯出 ──
const handleExportForExtension = async (extensionId: string) => {
  const constructionId = workspaceStore.currentProject?.id
  if (!constructionId) {
    exportMessage.value = { type: 'danger', text: '請先選擇工程案' }
    return
  }
  if (!extensionId) {
    exportMessage.value = { type: 'danger', text: '請指定要匯出的展延紀錄' }
    return
  }

  exportMessage.value = null
  isExporting.value = true

  try {
    await runWithExportLoading(`a4-${extensionId}`, 'A-4 工期展延申請總表', async (signal) => {
      const blob = await formA4Api.downloadReport(
        { constructionId, extensionId, ownerType: requestOwnerType.value },
        { signal }
      )
      const prefix = isContractorRoute.value ? 'O-2' : 'A-4'
      const fileName = `${prefix}_工期展延申請總表_${Date.now()}.docx`
      downloadBlobAsFile(blob, fileName)
      exportMessage.value = { type: 'success', text: '匯出成功，檔案已下載。' }
    })
  } catch (error) {
    if ((error as any)?.name === 'AbortError' || (error as any)?.code === 'ERR_CANCELED') return
    console.error('匯出失敗:', error)
    exportMessage.value = {
      type: 'danger',
      text: (error as Error).message || '匯出失敗，請稍後再試。'
    }
  } finally {
    isExporting.value = false
  }
}

// 兼容舊呼叫（如果需要）
const handleExport = () => {
  exportMessage.value = { type: 'danger', text: '請點擊表格中各筆展延紀錄的匯出按鈕來匯出。' }
}

// ── 自動儲存 ──
const AUTO_SAVE_DELAY_MS = 800

const runAutoSave = async () => {
  if (isViewingOther.value) return
  isAutoSaving.value = true
  try {
    await saveAllExtensionRecords(true)
  } finally {
    isAutoSaving.value = false
  }
}

// 監聽展延紀錄變化：延遲 800ms 後才儲存，避免打一半字就送出導致只存到一半
watch(
  extensionHistory,
  () => {
    if (!isInitialLoadSettled.value || isViewingOther.value) return
    const hasChange = JSON.stringify(extensionHistory.value) !== JSON.stringify(originalExtensionHistory.value)
    if (hasChange) {
      hasUnsavedChanges.value = true
      if (autoSaveTimer.value) clearTimeout(autoSaveTimer.value)
      autoSaveTimer.value = window.setTimeout(() => {
        autoSaveTimer.value = null
        runAutoSave()
      }, AUTO_SAVE_DELAY_MS)
    } else {
      hasUnsavedChanges.value = false
    }
  },
  { deep: true }
)

// ── 生命週期 ──
onMounted(() => {
  activeTab.value = 'SUPERVISORY'
  if (hasCurrentProject.value) loadExtensionHistory()
})

watch(
  () => workspaceStore.currentProject?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) loadExtensionHistory()
  }
)

onBeforeUnmount(() => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
})
</script>

<style scoped>
/* ===== 暗色主題變數 ===== */
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

.form-a4-export-page {
  padding: 1rem;
  color: var(--a4-text);
}

/* 匯出區塊精簡樣式 */
.a4-export-compact {
  border-top: 1px solid var(--a4-border);
  margin-top: 0.5rem;
}

/* ===== Card 暗色 ===== */
:deep(.card) {
  background: var(--a4-card);
  border-color: var(--a4-border);
  color: var(--a4-text);
}

:deep(.card-header) {
  border-bottom-color: var(--a4-border);
}

/* ===== Alert 暗色 ===== */
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

:deep(.alert-success) {
  background: rgba(52, 211, 153, 0.1);
  border-color: rgba(52, 211, 153, 0.25);
  color: #6ee7b7;
}

:deep(.alert-danger) {
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.25);
  color: #fca5a5;
}

/* ===== 拖拉排序 ===== */
.drag-handle {
  cursor: grab !important;
  user-select: none;
}
.drag-handle:active {
  cursor: grabbing !important;
}
.a4-seq-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(150, 150, 150, 0.15);
  color: rgba(180, 180, 180, 0.85);
}
.sortable-ghost {
  opacity: 0.4;
  background: rgba(96, 165, 250, 0.15) !important;
}
.sortable-drag {
  background: var(--a4-card) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* ===== 同公文主旨按鈕 ===== */
.a4-btn-copy-subject {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  color: var(--a4-accent, #60a5fa);
  border: 1px solid rgba(96, 165, 250, 0.3);
  background: transparent;
  border-radius: 4px;
  transition: all 0.15s;
}
.a4-btn-copy-subject:hover {
  background: rgba(96, 165, 250, 0.12);
  color: #93c5fd;
  border-color: rgba(96, 165, 250, 0.5);
}

/* 關聯公文文號：可點擊預覽 */
.a4-linked-doc-link {
  cursor: pointer;
  color: var(--a4-accent, #60a5fa);
}
.a4-linked-doc-link:hover {
  text-decoration: underline;
}

/* ===== 表格暗色 ===== */
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
  text-align: center;
  padding: 0.65rem 0.5rem;
  border: 1.5px solid var(--a4-border);
  color: var(--a4-muted);
  white-space: nowrap;
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

/* ===== 表單元件暗色 ===== */
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

.a4-table :deep(.form-control.bg-light) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--a4-muted);
}

.a4-table :deep(.form-check-label) {
  color: var(--a4-text);
}

.a4-table :deep(.form-label) {
  color: var(--a4-muted);
}

/* 下拉選單暗色箭頭 */
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

/* ===== Tab 暗色 ===== */
.a4-tabs {
  border-bottom-color: var(--a4-border);
}

.a4-tabs .nav-link {
  color: var(--a4-muted);
  border-color: transparent;
  background: transparent;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
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

/* ===== 免計日期格子（可點擊） ===== */
.a4-dates-cell {
  min-width: 130px;
  min-height: 36px;
  padding: 0.25rem;
  border-radius: 6px;
  transition: background 0.15s;
}
.a4-dates-clickable {
  cursor: pointer;
}
.a4-dates-clickable:hover {
  background: rgba(96, 165, 250, 0.08);
}

/* ===== 免計日期 Modal 內部 ===== */
.a4-date-editor .form-label {
  color: var(--a4-muted, #b0b3b8);
}
.a4-date-tags {
  max-height: 220px;
  overflow-y: auto;
  padding: 0.5rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--a4-border, #3a3d42);
}
/* 編輯免計日期視窗：日期編輯器加寬 */
.a4-date-editor .a4-date-range-row .republic-date-picker,
.a4-date-editor .republic-date-picker {
  min-width: 220px;
  max-width: 260px !important;
}
.a4-date-editor .form-control {
  min-width: 220px;
}
</style>

<style>
/* Modal 暗黑（Teleport 到 body，需非 scoped） */
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
.a4-date-modal-dark .btn-outline-secondary {
  color: #b0b3b8;
  border-color: #3a3d42;
}
.a4-date-modal-dark .btn-outline-secondary:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #e4e6eb;
}
.a4-date-modal-dark .btn-outline-danger {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.4);
}
.a4-date-modal-dark .btn-outline-danger:hover {
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
}
</style>
