<template>
  <div class="form-a5-export-page a5-dark">
    <PageHeader
      :title="pageTitle"
      icon="fa fa-file-alt"
      :breadcrumbs="pageBreadcrumbs"
    />

    <Card>
      <CardBody>
        <!-- 匯出說明 -->
        <div class="alert alert-info mb-4">
          <h5 class="alert-heading">
            <i class="fa fa-info-circle me-2"></i>匯出說明
          </h5>
          <p class="mb-0">
            維護各期估驗計價資料後，點擊操作欄的 <i class="fa fa-file-word"></i> 按鈕即可匯出該期估驗請款計價單{{ isContractorRoute ? '（O-3）' : '（A-5）' }}。
            「應付金額」欄位由系統自動計算，無須手動填寫。
          </p>
        </div>

        <!-- 視角切換 Tab（僅監造帳號 A-5 顯示） -->
        <div v-if="isSupervisoryUser && !isContractorRoute" class="mb-4">
          <ul class="nav nav-tabs a5-tabs">
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
            <li class="nav-item">
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

        <!-- 估驗詳細表 -->
        <div class="mb-4">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h5 class="mb-0">
              <i class="fa fa-table me-2"></i>估驗詳細表
            </h5>
            <div class="d-flex gap-2">
              <button
                class="btn btn-sm btn-outline-secondary"
                type="button"
                :disabled="isLoading || !hasCurrentProject"
                @click="loadEstimateDetails"
              >
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                <i v-else class="fa fa-sync me-1"></i>重新載入
              </button>
              <button
                v-if="!isViewingOther"
                class="btn btn-sm btn-outline-theme"
                type="button"
                :disabled="!hasCurrentProject"
                @click="addEstimateRecord"
              >
                <i class="fa fa-plus me-1"></i>新增記錄
              </button>
            </div>
          </div>

          <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
            <i class="fa fa-exclamation-triangle me-2"></i>
            請先選擇工程案，才能顯示估驗紀錄。
          </div>

          <div v-else-if="isLoading" class="text-center py-4">
            <div class="spinner-border text-primary me-2" role="status">
              <span class="visually-hidden">載入中...</span>
            </div>
            <span>載入估驗記錄中...</span>
          </div>

          <div v-else-if="estimateDetails.length === 0" class="text-center py-4 text-muted">
            <i class="fa fa-inbox fa-2x mb-2 d-block"></i>
            <div>尚無估驗記錄</div>
            <small>點擊「新增記錄」開始建立估驗資料</small>
          </div>

          <div v-else ref="a5TableWrapperRef" class="table-responsive">
            <div class="a5-approved-hint mb-2">
              <i class="fa fa-info-circle me-1"></i>累計金額僅計算狀態為「已核准」之記錄
            </div>
            <table class="table a5-table mb-0">
              <thead>
                <tr>
                  <th style="width: 70px;" class="text-center">拖移排序</th>
                  <th :style="{ width: hasDesignChangeVersions ? '150px' : '110px' }">{{ hasDesignChangeVersions ? '狀態／使用資料版本' : '狀態' }}</th>
                  <th style="width: 130px;">估驗計價款</th>
                  <th style="width: 130px;">物價指數調整款</th>
                  <th style="width: 110px;">扣款</th>
                  <th style="width: 110px;">
                    保留款
                    <span
                      class="a5-retention-info-wrapper"
                      @mouseenter="showRetentionTooltip = true"
                      @mouseleave="showRetentionTooltip = false"
                    >
                      <i class="fa fa-info-circle ms-1 text-muted a5-retention-info" aria-hidden="true"></i>
                      <Transition name="a5-tooltip">
                        <div v-show="showRetentionTooltip" class="a5-retention-tooltip-popup" role="tooltip">
                          <div class="a5-retention-tooltip-inner">
                            {{ retentionColumnTooltip }}
                          </div>
                        </div>
                      </Transition>
                    </span>
                  </th>
                  <th style="width: 130px;">扣回預付款</th>
                  <th style="width: 120px;">應付金額</th>
                  <th style="width: 240px;">估驗期間</th>
                  <th style="width: 80px;" class="text-center">說明</th>
                  <th style="width: 140px;">關聯公文</th>
                  <th v-if="!isViewingOther" style="width: 100px;" class="text-center">操作</th>
                </tr>
              </thead>
              <draggable
                v-model="estimateDetails"
                tag="tbody"
                item-key="id"
                handle=".drag-handle"
                :disabled="isViewingOther"
                @end="onDragEnd"
              >
                <template #item="{ element: record, index }">
                <tr>
                  <!-- 拖移排序 + 序次 -->
                  <td class="text-center align-middle drag-handle" :class="{ 'pe-none': isViewingOther }" title="拖拉排序">
                    <div class="d-inline-flex align-items-center gap-1" :style="!isViewingOther ? 'cursor: grab;' : ''">
                      <i v-if="!isViewingOther" class="fa fa-grip-vertical text-muted" style="opacity: 0.45; font-size: 0.7rem;"></i>
                      <span class="a5-seq-num">{{ index + 1 }}</span>
                    </div>
                  </td>
                  <!-- 狀態（有變更設計時顯示使用資料版本） -->
                  <td class="align-middle">
                    <select
                      class="form-select form-select-sm"
                      :value="record.status || EstimateStatus.DRAFT"
                      :disabled="isViewingOther"
                      @change="record.status = ($event.target as HTMLSelectElement).value"
                    >
                      <option :value="EstimateStatus.DRAFT">草稿</option>
                      <option :value="EstimateStatus.PENDING">待審核</option>
                      <option :value="EstimateStatus.APPROVED">已核准</option>
                      <option :value="EstimateStatus.REJECTED">已退回</option>
                    </select>
                    <div v-if="hasDesignChangeVersions && record.versionLabel" class="small text-muted mt-1">
                      <div>{{ record.versionLabel }}</div>
                      <div v-if="record.versionRange">{{ record.versionRange }}</div>
                    </div>
                  </td>
                  <!-- 估驗計價款 -->
                  <td class="a5-amount-cell">
                    <input
                      type="text"
                      inputmode="numeric"
                      class="form-control form-control-sm a5-no-spinner text-end"
                      :value="formatAmountDisplay(record.estimateAmount)"
                      placeholder="0"
                      :readonly="isViewingOther"
                      @input="record.estimateAmount = parseAmountInput(($event.target as HTMLInputElement).value)"
                    />
                  </td>
                  <!-- 物價指數調整款 -->
                  <td class="a5-amount-cell">
                    <input
                      type="text"
                      inputmode="numeric"
                      class="form-control form-control-sm a5-no-spinner text-end"
                      :value="formatAmountDisplay(record.adjustPriceIndex)"
                      placeholder="0"
                      :readonly="isViewingOther"
                      @input="record.adjustPriceIndex = parseAmountInput(($event.target as HTMLInputElement).value)"
                    />
                  </td>
                  <!-- 扣款 -->
                  <td class="a5-amount-cell">
                    <input
                      type="text"
                      inputmode="numeric"
                      class="form-control form-control-sm a5-no-spinner text-end"
                      :value="formatAmountDisplay(record.deductAmount)"
                      placeholder="0"
                      :readonly="isViewingOther"
                      @input="record.deductAmount = parseAmountInput(($event.target as HTMLInputElement).value)"
                    />
                  </td>
                  <!-- 保留款（由後端依工程/監造核心資料比例計算，儲存後更新；顯示本筆適用幾%） -->
                  <td class="a5-amount-cell">
                    <input
                      type="text"
                      class="form-control form-control-sm bg-light text-end"
                      :value="displayRetention(record)"
                      readonly
                      placeholder="儲存後由系統計算"
                      style="cursor: not-allowed;"
                    />
                    <div v-if="getRetentionPercentForRecord(record) != null" class="small text-muted mt-1">
                      {{ formatRetentionRatePercent(getRetentionPercentForRecord(record)!) }}
                    </div>
                  </td>
                  <!-- 扣回預付款 -->
                  <td class="align-middle a5-amount-cell">
                    <input
                      type="text"
                      inputmode="numeric"
                      class="form-control form-control-sm a5-no-spinner text-end"
                      :value="formatAmountDisplay(record.deductionAdvancePayment)"
                      placeholder="0"
                      :readonly="isViewingOther"
                      @input="record.deductionAdvancePayment = parseAmountInput(($event.target as HTMLInputElement).value)"
                    />
                  </td>
                  <!-- 應付金額 (自動計算) -->
                  <td class="a5-amount-cell">
                    <input
                      type="text"
                      class="form-control form-control-sm bg-light text-end"
                      :value="calcAmountPayable(record)"
                      readonly
                      placeholder="自動計算"
                      style="cursor: not-allowed;"
                    />
                  </td>
                  <!-- 估驗期間：起 / 訖（各一列，標籤與日期同列，無 icon、加寬） -->
                  <td class="align-middle">
                    <div class="d-flex flex-column gap-1 a5-period-cell">
                      <div class="d-flex align-items-center gap-1">
                        <span class="small text-muted text-nowrap">起：</span>
                        <RepublicDatePicker
                          :modelValue="record.estimatePeriodStart ?? ''"
                          :useRepublicYear="true"
                          :hideIcon="true"
                          inputClass="form-control form-control-sm a5-period-date-input"
                          :disabled="isViewingOther"
                          @update:modelValue="(v: string) => record.estimatePeriodStart = v"
                        />
                      </div>
                      <div class="d-flex align-items-center gap-1">
                        <span class="small text-muted text-nowrap">訖：</span>
                        <RepublicDatePicker
                          :modelValue="record.estimatePeriodEnd ?? ''"
                          :useRepublicYear="true"
                          :hideIcon="true"
                          inputClass="form-control form-control-sm a5-period-date-input"
                          :disabled="isViewingOther"
                          @update:modelValue="(v: string) => record.estimatePeriodEnd = v"
                        />
                      </div>
                    </div>
                  </td>
                  <!-- 說明：開啟 Modal -->
                  <td class="align-middle text-center">
                    <button
                      v-if="!isViewingOther"
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      title="開啟說明欄位"
                      @click="openExplanationModal(record)"
                    >
                      <i class="fa fa-comment-dots"></i>
                    </button>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <!-- 關聯公文（與 A-4 一致：僅已儲存紀錄可關聯） -->
                  <td class="align-middle">
                    <div v-if="getLinkedDocNumber(record)" class="d-flex align-items-center gap-1">
                      <span
                        class="small a5-linked-doc-link"
                        style="word-break: break-all;"
                        title="點擊預覽公文"
                        @click="openLinkedDocPreview(record)"
                      >
                        {{ getLinkedDocNumber(record) }}
                      </span>
                      <button v-if="!isViewingOther" class="btn btn-sm btn-outline-danger p-0 px-1" style="font-size: 0.7rem; line-height: 1.2;" title="取消關聯" @click="clearLinkedDoc(record)">
                        <i class="fa fa-times"></i>
                      </button>
                    </div>
                    <button
                      v-else-if="!isViewingOther && canLinkDocument(record)"
                      class="btn btn-sm btn-outline-info w-100"
                      @click="openDocPicker(record)"
                    >
                      <i class="fa fa-file-lines me-1"></i>選擇公文
                    </button>
                    <span v-else class="small text-muted">—</span>
                  </td>
                  <!-- 操作（共用下拉選單組件） -->
                  <td v-if="!isViewingOther" class="text-center align-middle">
                    <FormTableOperationMenu
                      :record="record"
                      :record-id="getRecordId(record)"
                      theme-class="a5-dark"
                      :table-wrapper-ref="a5TableWrapperRef"
                    >
                      <template #default="{ close }">
                        <div
                          class="dropdown-item d-flex align-items-center gap-2 py-2"
                          :class="{ disabled: isUploading[getRecordId(record)] }"
                          style="cursor: pointer;"
                          @click="handleUploadClick(record), close()"
                        >
                          <i v-if="isUploading[getRecordId(record)]" class="fa fa-spinner fa-spin"></i>
                          <i v-else class="fa fa-upload"></i>
                          <span>上傳檔案</span>
                        </div>
                        <div
                          class="dropdown-item d-flex align-items-center gap-2 py-2"
                          style="cursor: pointer;"
                          @click="openAttachmentPanel(record); close()"
                        >
                          <i class="fa fa-file-pdf"></i>
                          <span>相關文件</span>
                          <span
                            v-if="attachmentCounts[getRecordId(record)]"
                            class="badge rounded-pill bg-danger ms-1"
                            style="font-size: 0.65rem;"
                          >{{ attachmentCounts[getRecordId(record)] }}</span>
                        </div>
                        <div
                          v-if="!isEngineeringTab"
                          class="dropdown-item d-flex align-items-center gap-2 py-2"
                          :class="{ disabled: isExporting || !record?.id || (record?.id && String(record.id).startsWith('est_')) }"
                          style="cursor: pointer;"
                          @click="record?.id && !String(record.id).startsWith('est_') && !isExporting && (handleExportForRecord(record), close())"
                        >
                          <i class="fa fa-file-word"></i>
                          <span>匯出此期估驗單</span>
                        </div>
                        <hr class="dropdown-divider">
                        <div
                          class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                          style="cursor: pointer;"
                          @click="removeEstimateRecord(record); close()"
                        >
                          <i class="fa fa-trash"></i>
                          <span>刪除</span>
                        </div>
                      </template>
                    </FormTableOperationMenu>
                  </td>
                </tr>
                </template>
              </draggable>
              <tfoot v-if="estimateDetails.length > 0">
                <tr class="a5-cumulative-row">
                  <td class="text-center align-middle fw-bold a5-cumulative-cell" colspan="2">累計</td>
                  <td class="align-middle text-end fw-semibold a5-cumulative-cell">{{ formatAmountDisplay(cumulative.estimateAmount) }}</td>
                  <td class="align-middle text-end fw-semibold a5-cumulative-cell">{{ formatAmountDisplay(cumulative.adjustPriceIndex) }}</td>
                  <td class="align-middle text-end fw-semibold a5-cumulative-cell">{{ formatAmountDisplay(cumulative.deductAmount) }}</td>
                  <td class="align-middle text-end fw-semibold a5-cumulative-cell">{{ formatAmountDisplay(cumulative.retention) }}</td>
                  <td class="align-middle text-end fw-semibold a5-cumulative-cell">{{ formatAmountDisplay(cumulative.deductionAdvancePayment) }}</td>
                  <td class="align-middle text-end fw-semibold a5-cumulative-cell">{{ formatAmountDisplay(cumulative.amountPayable) }}</td>
                  <td :colspan="isViewingOther ? 2 : 3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- 自動儲存狀態提示 -->
          <div v-if="estimateDetails.length > 0 && !isViewingOther" class="d-flex justify-content-end align-items-center mt-3 gap-2">
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
              @click="saveAllRecords(false)"
            >
              <span v-if="isSaving" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              <i v-else class="fa fa-save me-1"></i>
              立即儲存
            </button>
          </div>
        </div>

        <!-- 匯出狀態提示 -->
        <div v-if="exportMessage" class="a5-export-compact d-flex flex-wrap align-items-center gap-2 py-2">
          <span :class="['small', exportMessage.type === 'success' ? 'text-success' : 'text-danger']">
            <i :class="[exportMessage.type === 'success' ? 'fa fa-check-circle' : 'fa fa-exclamation-circle', 'me-1']"></i>
            {{ exportMessage.text }}
          </span>
        </div>
      </CardBody>
    </Card>

    <!-- 說明欄位 Modal（共用組件） -->
    <Modal
      :show="showExplanationModal && !!explanationRecord"
      title="欄位說明"
      modal-id="a5-explanation-modal"
      hideConfirmButton
      cancelText="關閉"
      @update:show="(v: boolean) => { if (!v) closeExplanationModal() }"
    >
      <div v-if="explanationRecord" class="a5-explanation-modal-body">
        <div class="mb-3">
          <label class="form-label small fw-semibold">本次「扣款」欄位內容說明：</label>
          <textarea
            class="form-control"
            rows="3"
            v-model="explanationRecord.deductedReason"
            placeholder="選填"
          ></textarea>
        </div>
        <div>
          <label class="form-label small fw-semibold">本次估驗自「應付金額」扣抵「違約金」之情形，及扣抵後之「實付金額」說明：</label>
          <textarea
            class="form-control"
            rows="3"
            v-model="explanationRecord.explainExtendReason"
            placeholder="選填"
          ></textarea>
        </div>
      </div>
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
      modal-class="a5-dark"
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

    <!-- PDF 預覽 Modal（關聯公文 / 附件預覽） -->
    <Modal
      :show="showPreviewModal"
      :title="'預覽 - ' + previewFileName"
      icon="fa fa-eye"
      size="xl"
      modalClass="a5-dark"
      :hideFooter="true"
      @update:show="(v: boolean) => { if (!v) { showPreviewModal = false; previewUrl = '' } }"
    >
      <template #body>
        <div v-if="isLoadingPreview" class="text-center py-5">
          <i class="fa fa-spinner fa-spin me-1"></i>載入中...
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

    <!-- 公文選擇器（估驗關聯公文，與 A-4 一致） -->
    <DocumentPicker
      :show="showDocPicker"
      title="選擇公文（發文字號）"
      :constructionId="constructionId"
      :darkMode="true"
      :showNameInput="false"
      @update:show="(v: boolean) => { if (!v) showDocPicker = false }"
      @select="onDocumentPicked"
    />

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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RelatedDocumentsModal from '@/components/related-documents/RelatedDocumentsModal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import draggable from 'vuedraggable'
import { formA5Api, downloadBlobAsFile } from '@/api/forms'
import { useExportLoading } from '@/composables/useExportLoading'
import {
  estimateApi,
  EstimateStatus,
  type EstimateRecord,
  type EstimateCumulative,
  getEstimateLinkedDocuments,
  linkEstimateDocument,
  unlinkEstimateDocument,
  uploadEstimateAttachment,
  getEstimateAttachments,
  deleteEstimateAttachment,
  previewEstimateAttachment,
  downloadEstimateAttachment,
  downloadAllEstimateAttachments,
  type EstimateAttachment
} from '@/api/estimate'
import { supervisionCompanyProfileApi } from '@/api/supervisionCompanyProfile'
import DocumentPicker from '@/components/document/DocumentPicker.vue'
import FormTableOperationMenu from '@/components/forms/FormTableOperationMenu.vue'
import { getDocumentCenterList, type DocumentCenterListItem } from '@/api/documentCenter'
import { getDesignChangeList, type DesignChangeItem } from '@/api/designChange'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { isSupervisory } = useViewPerspective()
const isSupervisoryUser = computed(() => isSupervisory.value)

// O-3 營造路由 vs A-5 監造路由
const isContractorRoute = computed(() => (route.path || '').includes('/forms/o3-estimate'))
const pageTitle = computed(() =>
  isContractorRoute.value ? 'O-3 估驗請款計價表' : 'A-5 估驗請款計價單'
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

// 工程端 / 監造端 Tab（僅監造帳號 A-5 使用）
const activeTab = ref<'SUPERVISORY' | 'SUPERVISION_COMPANY'>('SUPERVISORY')
const currentOwnerType = computed(() => activeTab.value)
const switchTab = async (tab: 'SUPERVISORY' | 'SUPERVISION_COMPANY') => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  if (tab === 'SUPERVISION_COMPANY') {
    await loadSupervisionCompanyRetention()
  } else {
    supervisionCompanyRetainedRatio.value = null
  }
  loadEstimateDetails()
}

// 呼叫 API 時使用的 ownerType：營造路由用 CONTRACTOR，監造 A-5 用 currentOwnerType
const requestOwnerType = computed(() => {
  if (isContractorRoute.value) return 'CONTRACTOR'
  return currentOwnerType.value
})

// 與 A-4 一致：有變更設計且非監造公司視角時顯示「使用資料版本」欄位（需 effectiveDate/effectiveEndDate 供動態算 %）
const designChangeList = ref<DesignChangeItem[]>([])
const hasDesignChangeVersions = computed(() =>
  designChangeList.value.length > 0 && activeTab.value !== 'SUPERVISION_COMPANY'
)

// 各版本「目前」保留款比例（%），重拉列表時一併更新，日期或基本資料改動後會跟著改
const retentionRatesByVersion = ref<Map<number | null, number>>(new Map())

// 與 A-4 一致：檢視他人時不顯示操作、不可編輯（預留，目前固定 false）
const isViewingOther = computed(() => false)
// 工程端 Tab：監造帳號在工程端時不顯示匯出按鈕
const isEngineeringTab = computed(() => isSupervisoryUser.value && activeTab.value === 'SUPERVISORY')

const hasCurrentProject = computed(() => !!workspaceStore.currentProject?.id)
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')

// 保留款欄位 i 圖示 hover 是否顯示說明
const showRetentionTooltip = ref(false)

// 監造端 Tab 時使用監造核心資料的保留款比例（%），未載入前為 null
const supervisionCompanyRetainedRatio = ref<number | null>(null)
const loadSupervisionCompanyRetention = async () => {
  if (!constructionId.value) {
    supervisionCompanyRetainedRatio.value = null
    return
  }
  try {
    const workspaceId = workspaceStore.currentWorkspace?.id
    const profile = await supervisionCompanyProfileApi.getProfile(constructionId.value, workspaceId)
    const pct = profile.retainedRatio != null ? Number(profile.retainedRatio) : null
    supervisionCompanyRetainedRatio.value = Number.isFinite(pct) ? pct : null
  } catch {
    supervisionCompanyRetainedRatio.value = null
  }
}

// 保留款比例（% → 小數，如 5 → 0.05）。監造端由監造核心資料取得，其餘由工程核心資料取得，未設定時預設 5%
const retentionRate = computed(() => {
  const useSupervisionCompany =
    isSupervisoryUser.value && !isContractorRoute.value && activeTab.value === 'SUPERVISION_COMPANY'
  if (useSupervisionCompany && supervisionCompanyRetainedRatio.value != null) {
    const num = supervisionCompanyRetainedRatio.value
    return (Number.isFinite(num) ? num : 5) / 100
  }
  const pct = workspaceStore.currentProject?.retentionRatio
  const num = pct ? parseFloat(String(pct)) : 5
  return (Number.isFinite(num) ? num : 5) / 100
})

// 保留款 i 圖示提示：標明保留款比例% 的來源與計算方式
const retentionColumnTooltip = computed(() => {
  let source = '工程核心資料'
  if (isSupervisoryUser.value && activeTab.value === 'SUPERVISION_COMPANY') {
    source = '監造核心資料'
  }
  // 營造路由與工程端 Tab 皆為工程核心資料
  return `保留款比例% 來源：${source}\n\n計算方式：保留款 = (估驗計價款 C + 物價指數調整款 D - 扣款 E) × 保留款比例%`
})

// ── 估驗記錄 ──
const estimateDetails = ref<EstimateRecord[]>([])
const originalEstimateDetails = ref<EstimateRecord[]>([])
const isLoading = ref(false)
const isSaving = ref(false)

// ── 自動儲存 ──
const isAutoSaving = ref(false)
const hasUnsavedChanges = ref(false)
const autoSaveTimer = ref<number | null>(null)
const isInitialLoadSettled = ref(false)

// ── 說明 Modal ──
const showExplanationModal = ref(false)
const explanationRecord = ref<EstimateRecord | null>(null)

// ── 關聯公文（與 A-4 一致） ──
const showDocPicker = ref(false)
const currentDocPickerRecord = ref<EstimateRecord | null>(null)
const docCacheMap = ref<Map<number, DocumentCenterListItem>>(new Map())

// 操作選單：共用組件用；上傳檔案時需知道當前列
const operationMenuFileInputRef = ref<HTMLInputElement | null>(null)
const operationMenuRecord = ref<EstimateRecord | null>(null)
const a5TableWrapperRef = ref<HTMLElement | null>(null)

function handleUploadClick(record: EstimateRecord) {
  if (isUploading.value[getRecordId(record)]) return
  operationMenuRecord.value = record
  operationMenuFileInputRef.value?.click()
}

function onOperationMenuFileChange(e: Event) {
  const record = operationMenuRecord.value
  if (record) {
    handleFileUpload(e, record)
  }
  operationMenuRecord.value = null
  ;(e.target as HTMLInputElement).value = ''
}

function canLinkDocument(record: EstimateRecord): boolean {
  const id = record.id ?? record.estimateId
  return !!id && !String(id).startsWith('est_')
}

function getLinkedDocNumber(record: EstimateRecord): string {
  return (record as any).linkedDocumentNumber ?? ''
}

/** 點擊關聯公文文號時開啟預覽 */
function openLinkedDocPreview(record: EstimateRecord) {
  const docId = (record as any).linkedDocumentId
  if (docId == null) return
  const doc = docCacheMap.value.get(docId)
  if (doc?.fileUrl) handlePreviewDocument(doc)
}

async function openDocPicker(record: EstimateRecord) {
  if (!canLinkDocument(record)) return
  currentDocPickerRecord.value = record
  showDocPicker.value = true
}

async function onDocumentPicked(payload: { document: DocumentCenterListItem }) {
  const record = currentDocPickerRecord.value
  if (!record) return
  const estimateId = record.id ?? record.estimateId
  if (!estimateId || String(estimateId).startsWith('est_')) return
  const idx = estimateDetails.value.findIndex(r => (r.id ?? r.estimateId) === estimateId)
  const sequence = idx >= 0 ? idx + 1 : 1
  try {
    await linkEstimateDocument(estimateId, payload.document.id, sequence)
    const refs = await getEstimateLinkedDocuments(estimateId)
    const ref = refs[0]
    ;(record as any).linkedDocumentId = payload.document.id
    ;(record as any).linkedReferenceId = ref?.referenceId ?? null
    ;(record as any).linkedDocumentNumber = payload.document.documentNumber || payload.document.subject || ''
    ;(record as any).linkedDocumentSubject = payload.document.subject || ''
  } catch (e) {
    console.error('關聯公文失敗:', e)
  } finally {
    showDocPicker.value = false
    currentDocPickerRecord.value = null
  }
}

async function clearLinkedDoc(record: EstimateRecord) {
  const refId = (record as any).linkedReferenceId
  const estimateId = record.id ?? record.estimateId
  if (!estimateId || !refId) return
  try {
    await unlinkEstimateDocument(estimateId, refId)
    ;(record as any).linkedDocumentNumber = ''
    ;(record as any).linkedDocumentId = null
    ;(record as any).linkedReferenceId = null
    ;(record as any).linkedDocumentSubject = ''
  } catch (e) {
    console.error('取消關聯失敗:', e)
  }
}

function getRecordId(record: EstimateRecord): string {
  return String(record.id ?? record.estimateId ?? '')
}

// ── 上傳檔案 / 相關文件（與 A-4 一致） ──
const isUploading = ref<Record<string, boolean>>({})
const attachmentCounts = ref<Record<string, number>>({})
const showAttachmentModal = ref(false)
const currentAttachmentRecord = ref<EstimateRecord | null>(null)
const currentLinkedDocuments = ref<DocumentCenterListItem[]>([])
const currentLinkedRefs = ref<{ referenceId: number; documentId: number }[]>([])
const currentAttachments = ref<EstimateAttachment[]>([])
const isLoadingAttachments = ref(false)
const isUploadingInModal = ref(false)
const isDownloadingAll = ref(false)

async function loadAttachmentCounts() {
  for (const record of estimateDetails.value) {
    const eid = getRecordId(record)
    if (!eid || eid.startsWith('est_')) {
      attachmentCounts.value[eid] = 0
      continue
    }
    try {
      const [atts, refs] = await Promise.all([
        getEstimateAttachments(eid),
        getEstimateLinkedDocuments(eid).catch(() => [])
      ])
      attachmentCounts.value[eid] = atts.length + refs.length
    } catch {
      attachmentCounts.value[eid] = 0
    }
  }
}

async function handleFileUpload(e: Event, record: EstimateRecord) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  const estimateId = getRecordId(record)
  if (!estimateId || estimateId.startsWith('est_')) return
  isUploading.value[estimateId] = true
  try {
    for (const file of Array.from(files)) {
      await uploadEstimateAttachment(estimateId, file)
    }
    const atts = await getEstimateAttachments(estimateId)
    const refs = await getEstimateLinkedDocuments(estimateId).catch(() => [])
    attachmentCounts.value[estimateId] = atts.length + refs.length
  } catch (err) {
    console.error('上傳附件失敗:', err)
  } finally {
    isUploading.value[estimateId] = false
    input.value = ''
  }
}

async function openAttachmentPanel(record: EstimateRecord) {
  const estimateId = getRecordId(record)
  if (!estimateId || estimateId.startsWith('est_')) return
  currentAttachmentRecord.value = record
  showAttachmentModal.value = true
  isLoadingAttachments.value = true
  currentLinkedDocuments.value = []
  currentLinkedRefs.value = []
  currentAttachments.value = []
  try {
    const [atts, refs] = await Promise.all([
      getEstimateAttachments(estimateId),
      getEstimateLinkedDocuments(estimateId).catch(() => [])
    ])
    currentAttachments.value = atts
    currentLinkedRefs.value = refs.map((r: { referenceId: number; documentId: number }) => ({ referenceId: r.referenceId, documentId: r.documentId }))
    if (refs.length > 0 && docCacheMap.value.size > 0) {
      const docs: DocumentCenterListItem[] = []
      for (const ref of refs) {
        const doc = docCacheMap.value.get(ref.documentId)
        if (doc) docs.push(doc)
      }
      currentLinkedDocuments.value = docs
    }
  } catch (err) {
    console.error('載入相關文件失敗:', err)
  } finally {
    isLoadingAttachments.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function handleModalUpload(files: FileList) {
  if (!files?.length) return
  const record = currentAttachmentRecord.value
  const estimateId = record ? getRecordId(record) : ''
  if (!estimateId) return
  isUploadingInModal.value = true
  try {
    for (const file of Array.from(files)) {
      await uploadEstimateAttachment(estimateId, file)
    }
    currentAttachments.value = await getEstimateAttachments(estimateId)
    attachmentCounts.value[estimateId] = currentAttachments.value.length + currentLinkedDocuments.value.length
  } catch (err) {
    console.error('上傳附件失敗:', err)
  } finally {
    isUploadingInModal.value = false
  }
}

async function handleDownloadAttachment(att: EstimateAttachment) {
  const record = currentAttachmentRecord.value
  const estimateId = record ? getRecordId(record) : ''
  if (!estimateId) return
  try {
    await downloadEstimateAttachment(estimateId, att.id, att.fileName)
  } catch (err) {
    console.error('下載附件失敗:', err)
  }
}

async function handleDeleteAttachment(att: EstimateAttachment) {
  const record = currentAttachmentRecord.value
  const estimateId = record ? getRecordId(record) : ''
  if (!estimateId || !confirm(`確定要刪除「${att.fileName}」？`)) return
  try {
    await deleteEstimateAttachment(estimateId, att.id)
    currentAttachments.value = currentAttachments.value.filter(a => a.id !== att.id)
    attachmentCounts.value[estimateId] = currentAttachments.value.length + currentLinkedDocuments.value.length
  } catch (err) {
    console.error('刪除附件失敗:', err)
  }
}

async function handleDownloadAll() {
  const record = currentAttachmentRecord.value
  const estimateId = record ? getRecordId(record) : ''
  if (!estimateId) return
  isDownloadingAll.value = true
  try {
    await downloadAllEstimateAttachments(estimateId)
  } catch (err) {
    console.error('下載全部失敗:', err)
  } finally {
    isDownloadingAll.value = false
  }
}

// PDF 預覽（關聯公文用 doc.fileUrl，附件用預覽 API）
const showPreviewModal = ref(false)
const previewUrl = ref('')
const previewFileName = ref('')
const isLoadingPreview = ref(false)

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
  const record = currentAttachmentRecord.value
  const estimateId = record ? getRecordId(record) : ''
  if (!estimateId) return
  const ref = currentLinkedRefs.value.find(r => r.documentId === doc.id)
  if (!ref || !confirm('確定要取消關聯此公文？')) return
  try {
    await unlinkEstimateDocument(estimateId, ref.referenceId)
    const refs = await getEstimateLinkedDocuments(estimateId).catch(() => [])
    currentLinkedRefs.value = refs.map((r: { referenceId: number; documentId: number }) => ({ referenceId: r.referenceId, documentId: r.documentId }))
    if (refs.length > 0 && docCacheMap.value.size > 0) {
      currentLinkedDocuments.value = refs.map((r: { documentId: number }) => docCacheMap.value.get(r.documentId)).filter(Boolean) as DocumentCenterListItem[]
    } else {
      currentLinkedDocuments.value = []
    }
    if (record) {
      ;(record as any).linkedDocumentNumber = ''
      ;(record as any).linkedDocumentId = null
      ;(record as any).linkedReferenceId = null
      ;(record as any).linkedDocumentSubject = ''
    }
    attachmentCounts.value[estimateId] = currentAttachments.value.length + currentLinkedDocuments.value.length
  } catch (e) {
    console.error('取消關聯失敗:', e)
  }
}

async function handlePreviewAttachment(att: EstimateAttachment) {
  const record = currentAttachmentRecord.value
  const estimateId = record ? getRecordId(record) : ''
  if (!estimateId) return
  showPreviewModal.value = true
  previewFileName.value = att.fileName
  isLoadingPreview.value = true
  previewUrl.value = ''
  try {
    const result = await previewEstimateAttachment(estimateId, att.id)
    previewUrl.value = result.url
  } catch (err) {
    console.error('取得預覽連結失敗:', err)
  } finally {
    isLoadingPreview.value = false
  }
}

const openExplanationModal = (record: EstimateRecord) => {
  explanationRecord.value = record
  showExplanationModal.value = true
}

const closeExplanationModal = () => {
  showExplanationModal.value = false
  explanationRecord.value = null
}

// ── 匯出 ──
const isExporting = ref(false)
const exportMessage = ref<{ type: 'success' | 'danger'; text: string } | null>(null)
const { runWithExportLoading } = useExportLoading()

/** 金額顯示加千分位逗號（整數） */
function formatAmountDisplay(val: number | null | undefined): string {
  if (val == null || val === undefined || Number.isNaN(Number(val))) return ''
  const n = Math.round(Number(val))
  return n.toLocaleString('en-US')
}

/** 從含逗號的輸入解析為數字 */
function parseAmountInput(raw: string): number {
  const s = String(raw ?? '').replace(/,/g, '').trim()
  if (s === '') return 0
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? 0 : n
}

// 保留款與應付金額一律使用後端回傳值（後端依工程/監造核心資料比例統一計算）
const displayRetention = (record: EstimateRecord): string => {
  const v = record.retention
  if (v == null || v === undefined) return ''
  return formatAmountDisplay(Math.round(Number(v)))
}

/** 顯示本筆保留款適用比例（例：適用 5%） */
const formatRetentionRatePercent = (pct: number): string => {
  const n = Number(pct)
  if (!Number.isFinite(n)) return ''
  return Number.isInteger(n) ? `適用 ${n}%` : `適用 ${n.toFixed(1)}%`
}

/** 依畫面上估驗期間訖日解析適用版本（與後端區間邏輯一致：從最後一版往前找） */
function getDesignChangeIdForDate(dateStr: string | null | undefined): number | null {
  if (!dateStr || !dateStr.trim()) return null
  const list = designChangeList.value
  if (!list.length) return null
  const date = new Date(dateStr.trim() + 'T12:00:00')
  if (Number.isNaN(date.getTime())) return null
  for (let i = list.length - 1; i >= 0; i--) {
    const item = list[i]
    const start = new Date(item.effectiveDate + 'T00:00:00')
    if (Number.isNaN(start.getTime())) continue
    if (date.getTime() < start.getTime()) continue
    if (item.effectiveEndDate?.trim()) {
      const end = new Date(item.effectiveEndDate.trim() + 'T23:59:59')
      if (!Number.isNaN(end.getTime()) && date.getTime() > end.getTime()) continue
    }
    return item.id ?? null
  }
  return null
}

/** 依畫面上訖日＋目前各版本比例動態取得本筆適用的 %（改日期或基本資料後會跟著變） */
function getRetentionPercentForRecord(record: EstimateRecord): number | undefined {
  const designChangeId = getDesignChangeIdForDate(record.estimatePeriodEnd ?? '')
  const map = retentionRatesByVersion.value
  if (map.has(designChangeId)) return map.get(designChangeId)
  return map.get(null) ?? undefined
}

// ── 計算應付金額（使用後端回傳的保留款，與匯出一致） ──
const calcAmountPayable = (record: EstimateRecord): string => {
  const val = (record.estimateAmount || 0) +
    (record.adjustPriceIndex || 0) -
    (record.deductAmount || 0) -
    (Number(record.retention) || 0) -
    (record.deductionAdvancePayment || 0)
  return formatAmountDisplay(Math.round(val))
}

// ── 截至本次累計（由後端計算，僅含已核准記錄） ──
const cumulativeRaw = ref<EstimateCumulative>({
  estimateAmount: 0, adjustPriceIndex: 0, deductAmount: 0,
  retention: 0, deductionAdvancePayment: 0, amountPayable: 0
})

const cumulative = computed(() => cumulativeRaw.value)

// ── 載入估驗記錄 ──
/** @param background 若為 true 則不顯示全頁 loading，用於儲存後靜默重整，列表不閃爍 */
const loadEstimateDetails = async (background: boolean = false) => {
  if (!constructionId.value) {
    estimateDetails.value = []
    return
  }

  try {
    if (!background) isLoading.value = true
    if (requestOwnerType.value !== 'SUPERVISION_COMPANY') {
      try {
        const list = await getDesignChangeList(constructionId.value, requestOwnerType.value)
        designChangeList.value = Array.isArray(list) ? list : []
      } catch (_) {
        designChangeList.value = []
      }
    } else {
      designChangeList.value = []
    }

    try {
      const rates = await estimateApi.getRetentionRatesByVersion(constructionId.value, requestOwnerType.value)
      const map = new Map<number | null, number>()
      for (const r of rates) {
        map.set(r.designChangeId ?? null, r.retentionRatePercent)
      }
      retentionRatesByVersion.value = map
    } catch (_) {
      retentionRatesByVersion.value = new Map()
    }

    const response = await estimateApi.getEstimateList({
      constructionId: constructionId.value,
      ownerType: requestOwnerType.value
    })

    cumulativeRaw.value = response.cumulative

    if (response.records && response.records.length > 0) {
      const records = response.records.map((record: any) => ({
            ...record,
        id: record.estimateId || record.id,
        amountPayable:
          (record.estimateAmount || 0) +
          (record.adjustPriceIndex || 0) -
          (record.deductAmount || 0) -
          (record.retention || 0) -
          (record.deductionAdvancePayment || 0),
        linkedDocumentNumber: '',
        linkedDocumentId: null,
        linkedReferenceId: null,
        linkedDocumentSubject: ''
      }))
      estimateDetails.value = records

      // 公文快取（用於關聯公文主旨等）
      try {
        const docList = await getDocumentCenterList(constructionId.value)
        const map = new Map<number, DocumentCenterListItem>()
        for (const doc of docList) map.set(doc.id, doc)
        docCacheMap.value = map
      } catch (_) { /* ignore */ }
      const docMap = docCacheMap.value

      // 已儲存紀錄：從後端取得公文關聯
      for (const record of records) {
        const id = record.id ?? record.estimateId
        if (id && !String(id).startsWith('est_')) {
          try {
            const refs = await getEstimateLinkedDocuments(id)
            if (refs.length > 0) {
              const ref = refs[0]
              const cached = docMap.get(ref.documentId)
              record.linkedDocumentId = ref.documentId
              record.linkedReferenceId = ref.referenceId
              record.linkedDocumentNumber = cached?.documentNumber ?? ref.targetName ?? ref.displayTitle ?? ''
              record.linkedDocumentSubject = cached?.subject ?? ''
            }
          } catch (_) {
            // ignore
          }
        }
      }
    } else {
      estimateDetails.value = []
    }
    
    loadAttachmentCounts()
    originalEstimateDetails.value = JSON.parse(JSON.stringify(estimateDetails.value))
    hasUnsavedChanges.value = false
    isInitialLoadSettled.value = false
    setTimeout(() => {
      originalEstimateDetails.value = JSON.parse(JSON.stringify(estimateDetails.value))
      hasUnsavedChanges.value = false
      isInitialLoadSettled.value = true
    }, 1000)
  } catch (error) {
    console.error('載入估驗記錄列表失敗:', error)
    estimateDetails.value = []
  } finally {
    isLoading.value = false
  }
}

// ── 新增記錄 ──
const addEstimateRecord = () => {
  if (!constructionId.value) return

  const newId = `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  estimateDetails.value.push({
    id: newId,
    constructionId: constructionId.value,
      estimateAmount: 0,
      adjustPriceIndex: 0,
      deductAmount: 0,
      retention: 0,
      deductionAdvancePayment: 0,
      deductedReason: '',
    explainExtendReason: '',
    estimatePeriodStart: '',
    estimatePeriodEnd: '',
    status: EstimateStatus.DRAFT
  })
}

// ── 刪除記錄 ──
const removeEstimateRecord = async (record: EstimateRecord) => {
  if (!record.id) return

  if (record.id.startsWith('est_')) {
    estimateDetails.value = estimateDetails.value.filter(r => r.id !== record.id)
    return
  }

  try {
    await estimateApi.deleteEstimate(record.id)
    estimateDetails.value = estimateDetails.value.filter(r => r.id !== record.id)
    originalEstimateDetails.value = JSON.parse(JSON.stringify(estimateDetails.value))
  } catch (error) {
    console.error('刪除估驗記錄失敗:', error)
  }
}

// ── 變更偵測（保留款由後端計算，僅比對可編輯欄位） ──
const hasRecordChanged = (current: EstimateRecord, original: EstimateRecord | undefined): boolean => {
  if (!original) return true
  return (
    current.estimateAmount !== original.estimateAmount ||
    current.adjustPriceIndex !== original.adjustPriceIndex ||
    current.deductAmount !== original.deductAmount ||
    current.deductionAdvancePayment !== original.deductionAdvancePayment ||
    current.deductedReason !== original.deductedReason ||
    current.explainExtendReason !== original.explainExtendReason ||
    current.estimatePeriodStart !== original.estimatePeriodStart ||
    current.estimatePeriodEnd !== original.estimatePeriodEnd ||
    current.status !== original.status
  )
}

// ── 批次保存 ──
const isSavingInProgress = ref(false)

const saveAllRecords = async (silent: boolean = false) => {
  if (!constructionId.value) return
  if (isSavingInProgress.value) return
  isSavingInProgress.value = true

  if (!silent) {
    isSaving.value = true
  }

  // 暫停 watcher 避免保存過程中 id 變更觸發重複儲存
  isInitialLoadSettled.value = false
  let successCount = 0

  for (const record of estimateDetails.value) {
    try {
      const isNew = !record.id || record.id.startsWith('est_')

      if (isNew) {
        const result = await estimateApi.createEstimate({
          constructionId: constructionId.value,
          ownerType: requestOwnerType.value,
          estimateAmount: record.estimateAmount,
          adjustPriceIndex: record.adjustPriceIndex,
          deductAmount: record.deductAmount,
          deductionAdvancePayment: record.deductionAdvancePayment,
          deductedReason: record.deductedReason || '',
          explainExtendReason: record.explainExtendReason || '',
          estimatePeriodStart: record.estimatePeriodStart || '',
          estimatePeriodEnd: record.estimatePeriodEnd || '',
          status: record.status || EstimateStatus.DRAFT
        })
        if (result?.estimateId) {
          record.id = result.estimateId
        }
        successCount++
    } else {
        const orig = originalEstimateDetails.value.find(o => o.id === record.id)
        if (hasRecordChanged(record, orig)) {
          await estimateApi.updateEstimate({
            estimateId: record.id!,
            estimateAmount: record.estimateAmount,
            adjustPriceIndex: record.adjustPriceIndex,
            deductAmount: record.deductAmount,
            deductionAdvancePayment: record.deductionAdvancePayment,
            deductedReason: record.deductedReason || '',
            explainExtendReason: record.explainExtendReason || '',
            estimatePeriodStart: record.estimatePeriodStart || '',
            estimatePeriodEnd: record.estimatePeriodEnd || '',
            status: record.status || EstimateStatus.DRAFT
          })
          successCount++
        }
      }
  } catch (error) {
      console.error('保存估驗記錄失敗:', error)
    }
  }

  if (!silent) {
    isSaving.value = false
  }

  hasUnsavedChanges.value = false
  isSavingInProgress.value = false

  // 儲存後背景重整列表（不觸發全頁 loading，列表不閃爍），取得後端計算的保留款與累計值
  try {
    await loadEstimateDetails(true)
  } catch { /* 不影響主流程 */ }
  originalEstimateDetails.value = JSON.parse(JSON.stringify(estimateDetails.value))

  setTimeout(() => {
    isInitialLoadSettled.value = true
  }, 500)
}

// ── 匯出 ──
const handleExportForRecord = async (record: EstimateRecord) => {
  if (!constructionId.value) {
    exportMessage.value = { type: 'danger', text: '請先選擇工程案' }
          return
        }
  if (!record.id || record.id.startsWith('est_')) {
    exportMessage.value = { type: 'danger', text: '請先儲存此筆記錄後再匯出' }
    return
  }

  exportMessage.value = null
  isExporting.value = true

  try {
    await runWithExportLoading(`a5-${record.id}`, 'A-5 估驗請款計價單', async (signal) => {
      const blob = await formA5Api.downloadReport(constructionId.value, record.id, {
        ownerType: requestOwnerType.value,
        signal
      })
      const fileName = `估驗請款計價單_第${estimateDetails.value.indexOf(record) + 1}期_${Date.now()}.docx`
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

// ── 拖拉排序完成 ──
const onDragEnd = async () => {
  const orderedIds = estimateDetails.value
    .map(r => r.id)
    .filter((id): id is string => !!id && !id.startsWith('est_'))

  if (orderedIds.length === 0 || !constructionId.value) return

  try {
    await estimateApi.reorderEstimates(constructionId.value, orderedIds, requestOwnerType.value)
    originalEstimateDetails.value = JSON.parse(JSON.stringify(estimateDetails.value))
  } catch (error) {
    console.error('排序儲存失敗:', error)
  }
}

// ── 自動儲存 ──
const debouncedAutoSave = () => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  autoSaveTimer.value = window.setTimeout(async () => {
    if (!hasUnsavedChanges.value) return
    isAutoSaving.value = true
    try {
      await saveAllRecords(true)
  } finally {
      isAutoSaving.value = false
    }
  }, 3000)
}

watch(
  estimateDetails,
  () => {
    if (!isInitialLoadSettled.value) return
    const hasChange = JSON.stringify(estimateDetails.value) !== JSON.stringify(originalEstimateDetails.value)
    if (hasChange) {
      hasUnsavedChanges.value = true
      debouncedAutoSave()
    } else {
      hasUnsavedChanges.value = false
    }
  },
  { deep: true }
)

// ── 生命週期 ──
onMounted(() => {
  if (hasCurrentProject.value) loadEstimateDetails()
})

watch(
  () => workspaceStore.currentProject?.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      if (activeTab.value === 'SUPERVISION_COMPANY') await loadSupervisionCompanyRetention()
  loadEstimateDetails()
    }
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
.a5-dark {
  --a5-bg: #1a1d21;
  --a5-card: #25282c;
  --a5-border: #4a4d54;
  --a5-text: #e4e6eb;
  --a5-muted: #b0b3b8;
  --a5-thead: #2d3748;
  --a5-hover: rgba(255, 255, 255, 0.06);
  --a5-input-bg: #2d3139;
  --a5-input-border: #3a3d42;
  --a5-accent: #60a5fa;
}

.form-a5-export-page {
  padding: 1rem;
  color: var(--a5-text);
}

.a5-export-compact {
  border-top: 1px solid var(--a5-border);
  margin-top: 0.5rem;
}

.a5-tabs {
  border-bottom-color: var(--a5-border);
}
.a5-tabs .nav-link {
  color: var(--a5-muted);
  border-color: transparent;
  background: transparent;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
}
.a5-tabs .nav-link:hover {
  color: var(--a5-text);
  border-color: var(--a5-border) var(--a5-border) transparent;
  background: var(--a5-hover);
}
.a5-tabs .nav-link.active {
  color: var(--a5-accent);
  background: var(--a5-card);
  border-color: var(--a5-border) var(--a5-border) var(--a5-card);
  font-weight: 600;
}

.a5-retention-info-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;
}
.a5-retention-info {
  opacity: 0.85;
  font-size: 0.9em;
}
.a5-retention-info-wrapper:hover .a5-retention-info {
  opacity: 1;
  color: var(--a5-accent) !important;
}
.a5-retention-tooltip-popup {
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%) translateY(6px);
  z-index: 1060;
  min-width: 240px;
  max-width: 320px;
  padding: 0.5rem 0.75rem;
  background: var(--a5-card);
  border: 1px solid var(--a5-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.a5-retention-tooltip-inner {
  white-space: pre-line;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--a5-text);
}
.a5-tooltip-enter-active,
.a5-tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.a5-tooltip-enter-from,
.a5-tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(2px);
}

/* ===== Card 暗色 ===== */
:deep(.card) {
  background: var(--a5-card);
  border-color: var(--a5-border);
  color: var(--a5-text);
}

:deep(.card-header) {
  border-bottom-color: var(--a5-border);
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

/* ===== 序次圓圈 ===== */
.a5-seq-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(150, 150, 150, 0.15);
  color: rgba(180, 180, 180, 0.85);
}

/* ===== 表格暗色 ===== */
.a5-table {
  border: 2px solid var(--a5-border);
  border-collapse: collapse;
  width: 100%;
  color: var(--a5-text);
}

.a5-table thead th {
  background: var(--a5-thead);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  padding: 0.65rem 0.5rem;
  border: 1.5px solid var(--a5-border);
  color: var(--a5-muted);
  white-space: nowrap;
}

.a5-table tbody td {
  border: 1.5px solid var(--a5-border);
  padding: 0.6rem 0.5rem;
  vertical-align: middle;
  background: var(--a5-card);
  color: var(--a5-text);
}

.a5-table tbody tr:hover td {
  background: var(--a5-hover);
}

/* 金額欄位頂部對齊，保留款有「適用 %」時與其他欄位 input 仍對齊（覆蓋 Bootstrap align-middle） */
.a5-table tbody td.a5-amount-cell {
  vertical-align: top !important;
}

/* ===== 表單元件暗色 ===== */
.a5-table :deep(.form-control),
.a5-table :deep(.form-select),
.a5-table :deep(textarea.form-control) {
  background: var(--a5-input-bg);
  border-color: var(--a5-input-border);
  color: var(--a5-text);
}

.a5-table :deep(.form-control:focus),
.a5-table :deep(.form-select:focus),
.a5-table :deep(textarea.form-control:focus) {
  background: var(--a5-input-bg);
  border-color: var(--a5-accent);
  color: var(--a5-text);
  box-shadow: 0 0 0 0.15rem rgba(96, 165, 250, 0.25);
}

.a5-table :deep(.form-control.bg-light) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--a5-muted);
}

/* 下拉選單暗色箭頭 */
.a5-table :deep(.form-select) {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23b0b3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 16px 12px;
}

.a5-table :deep(.form-select option) {
  background: var(--a5-card, #25282c);
  color: var(--a5-text, #e4e6eb);
}

/* ===== 拖拉排序 ===== */
.drag-handle {
  cursor: grab !important;
  user-select: none;
}
.drag-handle:active {
  cursor: grabbing !important;
}
.sortable-ghost td {
  opacity: 0.4;
  background: rgba(96, 165, 250, 0.15) !important;
}
.sortable-drag {
  background: var(--a5-card) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* ===== 提示文字 ===== */
.a5-approved-hint {
  font-size: 0.8rem;
  color: var(--a5-accent);
  opacity: 0.85;
  padding: 0.35rem 0.6rem;
  background: rgba(96, 165, 250, 0.08);
  border-left: 3px solid var(--a5-accent);
  border-radius: 0 4px 4px 0;
}

/* ===== 累計列：藍色僅到應付金額欄 ===== */
.a5-cumulative-row td.a5-cumulative-cell {
  background: var(--a5-thead) !important;
  border-top: 2px solid var(--a5-accent);
  color: var(--a5-accent);
  font-size: 0.85rem;
  padding: 0.55rem 0.5rem;
}
.a5-cumulative-row td:not(.a5-cumulative-cell) {
  background: var(--a5-card) !important;
  border-top: 2px solid var(--a5-border);
}

/* ===== 金額 input 隱藏上下鈕 ===== */
.a5-table :deep(input[type="number"].a5-no-spinner)::-webkit-outer-spin-button,
.a5-table :deep(input[type="number"].a5-no-spinner)::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.a5-table :deep(input[type="number"].a5-no-spinner) {
  -moz-appearance: textfield;
}

/* ===== 操作下拉選單（暗色） ===== */
.a5-dropdown-menu {
  background: var(--a5-card);
  border: 1px solid var(--a5-border);
}
.a5-dropdown-menu .dropdown-item {
  color: var(--a5-text);
}
.a5-dropdown-menu .dropdown-item:hover {
  background: var(--a5-hover);
  color: var(--a5-text);
}
.a5-dropdown-menu .dropdown-divider {
  border-color: var(--a5-border);
}

/* 操作選單 Teleport：背層 + 選單固定於按鈕旁、不透明 */
.a5-operation-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1059;
  background: transparent;
}
.a5-operation-menu-backdrop .a5-operation-menu-fixed {
  position: fixed !important;
  right: auto !important; /* 避免 Bootstrap dropdown-menu-end 干擾 */
  min-width: 11rem;
  /* 確保在 body 下仍有暗色主題（變數由父層 .a5-dark 提供） */
  background: var(--a5-card, #25282c) !important;
  border: 1px solid var(--a5-border, #4a4d54) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
.a5-operation-menu-backdrop .a5-operation-menu-fixed .dropdown-item {
  color: var(--a5-text, #e4e6eb);
}
.a5-operation-menu-backdrop .a5-operation-menu-fixed .dropdown-item:hover {
  background: var(--a5-hover, rgba(255, 255, 255, 0.06));
  color: var(--a5-text, #e4e6eb);
}
.a5-operation-menu-backdrop .a5-operation-menu-fixed .dropdown-divider {
  border-color: var(--a5-border, #4a4d54);
}

/* 關聯公文文號：可點擊預覽 */
.a5-linked-doc-link {
  cursor: pointer;
  color: var(--a5-accent);
}
.a5-linked-doc-link:hover {
  text-decoration: underline;
}

/* ===== 估驗期間日期選擇框：加寬、無 icon 由組件 hideIcon 設定 ===== */
.a5-period-cell :deep(.a5-period-date-input),
.a5-period-cell :deep(.dp__input) {
  min-width: 132px;
}
</style>
