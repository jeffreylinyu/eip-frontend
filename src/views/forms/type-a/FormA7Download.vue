<template>
  <div class="form-commencement-page a4-dark">
    <PageHeader
      :title="pageTitle"
      icon="fa fa-file-alt"
      :breadcrumbs="pageBreadcrumbs"
    />

    <Card>
      <CardBody>
        <!-- O-4 勞安人員配置標準提示（依目前版本勞安配置高亮） -->
        <div v-if="isContractorRoute && constructionId" class="o4-staffing-hint mb-3">
          <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div class="small fw-semibold text-muted">
              <i class="fa fa-shield-alt me-1 text-warning"></i>
              營造業勞安人員配置標準（依據職業安全衛生管理辦法）
            </div>
            <div v-if="isLoadingLaborSafetyMembers" class="loading-inline text-muted small">
              <span class="spinner-border spinner-border-sm loading-inline-spinner" role="status" aria-hidden="true"></span>
              <span class="loading-inline-text">讀取配置中...</span>
            </div>
          </div>

          <div class="o4-staffing-grid mt-1">
            <div
              v-for="t in LABOR_SAFETY_STAFFING_TIERS"
              :key="t.key"
              class="o4-staffing-row"
              :class="{
                active: (staffingHighlights.byTier[t.key]?.length || 0) > 0,
                'o4-staffing-row--no-version': !hasDesignChanges
              }"
            >
              <div class="o4-staffing-range">{{ t.range }}</div>
              <div class="o4-staffing-req">{{ t.requirement }}</div>
              <div v-if="hasDesignChanges" class="o4-staffing-tags">
                <span
                  v-for="tag in (staffingHighlights.byTier[t.key] || [])"
                  :key="tag.idKey"
                  class="badge rounded-pill bg-warning text-dark o4-staffing-badge"
                  :title="tag.fullLabel"
                >{{ tag.shortLabel }}</span>
              </div>
            </div>
          </div>

          <div v-if="hasDesignChanges && staffingHighlights.unknown.length > 0" class="o4-staffing-unknown text-muted small mt-1">
            無法判斷：
            <span
              v-for="tag in staffingHighlights.unknown"
              :key="tag.idKey"
              class="badge rounded-pill bg-secondary ms-1 o4-staffing-badge"
              :title="tag.fullLabel"
            >{{ tag.shortLabel }}</span>
          </div>
        </div>

        <div v-if="!constructionId" class="alert alert-warning mb-0">
          <i class="fa fa-exclamation-triangle me-2"></i>
          請先選擇工程案。
        </div>

        <template v-else>
          <div v-if="isLoading" class="text-center py-4">
            <span class="spinner-border spinner-border-sm me-2"></span>載入中...
          </div>

          <div v-else class="commencement-report-content">
            <!-- 同一列：O-4 為勞動檢查機構全銜 + 新增記錄；A-7 僅新增記錄 -->
            <div class="d-flex justify-content-between align-items-center gap-3 mb-3 flex-wrap">
              <div
                v-if="isContractorRoute"
                class="d-flex align-items-center gap-2 flex-wrap"
              >
                <h6 class="mb-0">
                  <i class="fa fa-industry me-1"></i>
                  勞動檢查機構全銜
                </h6>
                <input
                  v-model="laborInspectionAgencyFullName"
                  type="text"
                  class="form-control form-control-sm"
                  style="max-width: 420px;"
                  placeholder="例如：勞動部職業安全衛生署北區職業安全衛生中心"
                />
                <span
                  v-if="isSavingLaborSettings"
                  class="text-muted small"
                >
                  <i class="fa fa-spinner fa-spin me-1" />自動儲存中...
                </span>
              </div>
              <button
                type="button"
                class="btn btn-sm btn-primary"
                :class="{ 'ms-auto': !isContractorRoute }"
                :disabled="isCreating"
                @click="addReport"
              >
                <i v-if="isCreating" class="fa fa-spinner fa-spin me-1"></i>
                <i v-else class="fa fa-plus me-1"></i>
                新增記錄
              </button>
            </div>

            <div
              v-if="laborReports.length === 0"
              class="text-center py-4 text-muted border rounded"
            >
              <i class="fa fa-inbox fa-2x mb-2 d-block"></i>
              尚無記錄，請點「新增記錄」
            </div>

            <div v-else ref="commencementTableWrapperRef" class="table-responsive mb-0">
              <!-- 監造 A-7：沿用原本開竣停工報告樣式（僅狀態/日期/公文/附件），不顯示職安細部欄位 -->
              <table
                v-if="!isContractorRoute"
                class="table a4-table mb-0"
              >
                <thead>
                  <tr>
                    <th style="width: 160px;">{{ designChangeList.length > 0 ? '狀態／使用資料版本' : '狀態' }}</th>
                    <th style="min-width: 160px;">關聯公文</th>
                    <th style="width: 160px;" class="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in laborReports" :key="r.id">
                    <td class="align-middle">
                      <select
                        class="form-select form-select-sm"
                        :value="r.status || 'DRAFT'"
                        @change="onLaborStatusChangeSupervisory(r, ($event.target as HTMLSelectElement).value)"
                      >
                        <option value="DRAFT">草稿</option>
                        <option value="PENDING">待審核</option>
                        <option value="APPROVED">已核准</option>
                        <option value="REJECTED">已退回</option>
                      </select>
                      <select
                        v-if="versionOptions.length > 1"
                        class="form-select form-select-sm mt-1"
                        :value="r.designChangeId ?? ''"
                        @change="onLaborVersionChange(r, ($event.target as HTMLSelectElement).value, 'SUPERVISORY')"
                      >
                        <option v-for="opt in versionOptions" :key="String(opt.id)" :value="opt.id ?? ''">
                          {{ opt.label }}
                        </option>
                      </select>
                    </td>
                    <td class="align-middle">
                      <div v-if="linkedDocByReportId[r.id]" class="d-flex align-items-center gap-1">
                        <span
                          class="small commencement-doc-link text-truncate"
                          style="max-width: 12rem; cursor: pointer;"
                          :title="linkedDocByReportId[r.id]"
                          @click="openLinkedDocPreviewForLaborReport(r, 'SUPERVISORY')"
                        >
                          {{ linkedDocByReportId[r.id] }}
                        </span>
                        <button
                          class="btn btn-sm btn-outline-danger p-0 px-1"
                          style="font-size: 0.7rem; line-height: 1.2; flex-shrink: 0;"
                          title="取消關聯"
                          @click="clearLinkedDocForLaborReport(r, 'SUPERVISORY')"
                        >
                          <i class="fa fa-times"></i>
                        </button>
                      </div>
                      <button
                        v-else
                        class="btn btn-sm btn-outline-info"
                        @click="openDocPickerForLaborReport(r, 'SUPERVISORY')"
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
                            :class="{ disabled: isUploadingLaborReport[r.id] }"
                            style="cursor: pointer;"
                            @click="!isUploadingLaborReport[r.id] && (handleLaborReportUploadClick(r, 'SUPERVISORY'), close())"
                          >
                            <i v-if="isUploadingLaborReport[r.id]" class="fa fa-spinner fa-spin"></i>
                            <i v-else class="fa fa-upload"></i>
                            <span>上傳檔案</span>
                          </div>
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            style="cursor: pointer;"
                            @click="openLaborReportAttachmentPanel(r, 'SUPERVISORY'); close()"
                          >
                            <i class="fa fa-file-pdf"></i>
                            <span>相關文件</span>
                            <span
                              v-if="attachmentCountByReportId[r.id]"
                              class="badge rounded-pill bg-danger ms-1"
                              style="font-size: 0.65rem;"
                            >{{ attachmentCountByReportId[r.id] }}</span>
                          </div>
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            style="cursor: pointer;"
                            @click="openDocPickerForLaborReport(r, 'SUPERVISORY'); close()"
                          >
                            <i class="fa fa-file-lines"></i>
                            <span>關聯公文</span>
                          </div>
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                            style="cursor: pointer;"
                            @click="deleteLaborReportRowSupervisory(r); close()"
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

              <!-- 營造 O-4：在列表中直接編輯職安欄位 -->
              <div v-else>
                <table
                  class="table a4-table mb-0"
                >
                <thead>
                  <tr>
                    <th :style="{ width: versionOptions.length > 1 ? '220px' : '160px' }">{{ versionOptions.length > 1 ? '狀態／資料依據日' : designChangeList.length > 0 ? '狀態／使用資料版本' : '狀態' }}</th>
                    <th style="min-width: 180px;">總機構 / 事業單位</th>
                    <th style="min-width: 160px;">事業單位分類號碼</th>
                    <th style="min-width: 140px;">行業標準分類號碼</th>
                    <th style="min-width: 120px;">勞工人數</th>
                    <th style="min-width: 120px;">承攬人勞工人數</th>
                    <th style="width: 140px;">職安管理單位等級</th>
                    <th style="width: 120px;">績效經認可</th>
                    <th style="min-width: 160px;">關聯公文</th>
                    <th style="width: 80px;" class="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="r in laborReports"
                    :key="r.id"
                  >
                    <td class="align-middle">
                      <select
                        class="form-select form-select-sm"
                        :value="r.status || 'DRAFT'"
                        @change="onLaborStatusChange(r, ($event.target as HTMLSelectElement).value)"
                      >
                        <option value="DRAFT">草稿</option>
                        <option value="PENDING">待審核</option>
                        <option value="APPROVED">已核准</option>
                        <option value="REJECTED">已退回</option>
                      </select>
                      <RepublicDatePicker
                        v-if="versionOptions.length > 1"
                        :model-value="r.dataReferenceDate ?? ''"
                        input-class="form-control form-control-sm mt-1"
                        :use-republic-year="true"
                        :hide-icon="true"
                        @update:model-value="(val: string) => onLaborDataReferenceDateChange(r, val || null, 'CONTRACTOR')"
                      />
                      <div
                        v-if="versionOptions.length > 1 && r.dataReferenceDate && effectiveVersionByReportId[r.id]"
                        class="small text-secondary mt-1"
                      >
                        適用版本：{{ effectiveVersionByReportId[r.id].versionLabel }}
                        <span v-if="effectiveVersionByReportId[r.id].versionRange" class="opacity-75">（{{ effectiveVersionByReportId[r.id].versionRange }}）</span>
                      </div>
                    </td>
                    <td class="align-middle">
                      <select
                        class="form-select form-select-sm"
                        :value="r.organizationName || ''"
                        @change="onLaborReportFieldChange(r, { organizationName: ($event.target as HTMLSelectElement).value || null })"
                      >
                        <option value="">請選擇</option>
                        <option value="總機構">總機構</option>
                        <option value="事業單位">事業單位</option>
                      </select>
                    </td>
                    <td class="align-middle">
                      <input
                        v-model="r.businessUnitCode"
                        type="text"
                        maxlength="10"
                        class="form-control form-control-sm"
                        placeholder="10 碼"
                        @change="onLaborReportFieldChange(r, { businessUnitCode: (r.businessUnitCode || '').slice(0, 10) })"
                      />
                    </td>
                    <td class="align-middle">
                      <input
                        v-model="r.industryStandardCode"
                        type="text"
                        maxlength="4"
                        class="form-control form-control-sm"
                        placeholder="4 碼"
                        @change="onLaborReportFieldChange(r, { industryStandardCode: (r.industryStandardCode || '').slice(0, 4) })"
                      />
                    </td>
                    <td class="align-middle">
                      <div class="d-flex flex-column gap-1 labor-count-cell">
                        <div class="d-flex align-items-center gap-1">
                          <span class="small text-nowrap" style="width: 2.2em;">男:</span>
                          <input
                            v-model.number="r.totalMaleWorkers"
                            type="number"
                            min="0"
                            class="form-control form-control-sm"
                            style="max-width: 70px;"
                            @change="onLaborReportFieldChange(r, { totalMaleWorkers: toNonNegativeInt(r.totalMaleWorkers) })"
                          />
                        </div>
                        <div class="d-flex align-items-center gap-1">
                          <span class="small text-nowrap" style="width: 2.2em;">女:</span>
                          <input
                            v-model.number="r.totalFemaleWorkers"
                            type="number"
                            min="0"
                            class="form-control form-control-sm"
                            style="max-width: 70px;"
                            @change="onLaborReportFieldChange(r, { totalFemaleWorkers: toNonNegativeInt(r.totalFemaleWorkers) })"
                          />
                        </div>
                        <div class="d-flex align-items-center gap-1">
                          <span class="small text-muted text-nowrap" style="width: 2.2em;">合計:</span>
                          <span class="small text-muted">{{ laborTotalCount(r) }} 人</span>
                        </div>
                      </div>
                    </td>
                    <td class="align-middle">
                      <div class="d-flex flex-column gap-1 labor-count-cell">
                        <div class="d-flex align-items-center gap-1">
                          <span class="small text-nowrap" style="width: 2.2em;">男:</span>
                          <input
                            v-model.number="r.contractorMaleWorkers"
                            type="number"
                            min="0"
                            class="form-control form-control-sm"
                            style="max-width: 70px;"
                            @change="onLaborReportFieldChange(r, { contractorMaleWorkers: toNonNegativeInt(r.contractorMaleWorkers) })"
                          />
                        </div>
                        <div class="d-flex align-items-center gap-1">
                          <span class="small text-nowrap" style="width: 2.2em;">女:</span>
                          <input
                            v-model.number="r.contractorFemaleWorkers"
                            type="number"
                            min="0"
                            class="form-control form-control-sm"
                            style="max-width: 70px;"
                            @change="onLaborReportFieldChange(r, { contractorFemaleWorkers: toNonNegativeInt(r.contractorFemaleWorkers) })"
                          />
                        </div>
                        <div class="d-flex align-items-center gap-1">
                          <span class="small text-muted text-nowrap" style="width: 2.2em;">合計:</span>
                          <span class="small text-muted">{{ contractorTotalCount(r) }} 人</span>
                        </div>
                      </div>
                    </td>
                    <td class="align-middle">
                      <select
                        class="form-select form-select-sm"
                        :value="r.safetyUnitLevel || ''"
                        @change="onLaborReportFieldChange(r, { safetyUnitLevel: ($event.target as HTMLSelectElement).value || null })"
                      >
                        <option value="">未設定</option>
                        <option value="FIRST_LEVEL_DEDICATED">一級專責</option>
                        <option value="FIRST_LEVEL_NON_DEDICATED">一級非專責</option>
                        <option value="NON_FIRST_LEVEL">非一級</option>
                      </select>
                    </td>
                    <td class="align-middle text-center">
                      <input
                        v-model="r.performanceRecognized"
                        type="checkbox"
                        class="form-check-input"
                        @change="onLaborReportFieldChange(r, { performanceRecognized: !!r.performanceRecognized })"
                      />
                    </td>
                    <td class="align-middle">
                      <div v-if="linkedDocByReportId[r.id]" class="d-flex align-items-center gap-1">
                        <span
                          class="small commencement-doc-link text-truncate"
                          style="max-width: 12rem; cursor: pointer;"
                          :title="linkedDocByReportId[r.id]"
                          @click="openLinkedDocPreviewForLaborReport(r, 'CONTRACTOR')"
                        >
                          {{ linkedDocByReportId[r.id] }}
                        </span>
                        <button
                          class="btn btn-sm btn-outline-danger p-0 px-1"
                          style="font-size: 0.7rem; line-height: 1.2; flex-shrink: 0;"
                          title="取消關聯"
                          @click="clearLinkedDocForLaborReport(r, 'CONTRACTOR')"
                        >
                          <i class="fa fa-times"></i>
                        </button>
                      </div>
                      <button
                        v-else
                        class="btn btn-sm btn-outline-info"
                        @click="openDocPickerForLaborReport(r, 'CONTRACTOR')"
                      >
                        <i class="fa fa-file-lines me-1"></i>選擇公文
                      </button>
                    </td>
                    <td class="align-middle text-center">
                      <FormTableOperationMenu
                        :record="r"
                        :record-id="String(r.id)"
                        theme-class="a4-dark"
                        :table-wrapper-ref="commencementTableWrapperRef"
                      >
                        <template #default="{ close }">
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            :class="{ disabled: isUploadingLaborReport[r.id] }"
                            style="cursor: pointer;"
                            @click="!isUploadingLaborReport[r.id] && (handleLaborReportUploadClick(r, 'CONTRACTOR'), close())"
                          >
                            <i v-if="isUploadingLaborReport[r.id]" class="fa fa-spinner fa-spin"></i>
                            <i v-else class="fa fa-upload"></i>
                            <span>上傳檔案</span>
                          </div>
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            style="cursor: pointer;"
                            @click="openLaborReportAttachmentPanel(r, 'CONTRACTOR'); close()"
                          >
                            <i class="fa fa-file-pdf"></i>
                            <span>相關文件</span>
                            <span
                              v-if="attachmentCountByReportId[r.id]"
                              class="badge rounded-pill bg-danger ms-1"
                              style="font-size: 0.65rem;"
                            >{{ attachmentCountByReportId[r.id] }}</span>
                          </div>
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            style="cursor: pointer;"
                            @click="openDocPickerForLaborReport(r, 'CONTRACTOR'); close()"
                          >
                            <i class="fa fa-file-lines"></i>
                            <span>關聯公文</span>
                          </div>
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            :class="{ disabled: isExportingLaborWord }"
                            style="cursor: pointer;"
                            @click="!isExportingLaborWord && (handleExportLaborReportWord(r), close())"
                          >
                            <i v-if="exportingLaborReportId === r.id" class="fa fa-spinner fa-spin"></i>
                            <i v-else class="fa fa-file-word"></i>
                            <span>匯出表單</span>
                          </div>
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                            style="cursor: pointer;"
                            @click="deleteLaborReportRow(r); close()"
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
            </div>

            <!-- 自動儲存狀態提示 -->
            <div
              v-if="(!isContractorRoute && currentTypeReports.length > 0) || (isContractorRoute && laborReports.length > 0)"
              class="d-flex justify-content-end align-items-center mt-3 gap-2"
            >
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

    <!-- 相關文件 Modal（共用組件：開竣停工 / 職安共用，依 currentLaborReportForModal 切換資料） -->
    <RelatedDocumentsModal
      :show="showAttachmentModal"
      title="相關文件"
      :loading="isLoadingAttachments"
      :linked-docs="currentModalLinkedDocs"
      :attachments="currentModalAttachments"
      :uploading="isUploadingInModal"
      :downloading-all="isDownloadingAll"
      :upload-accept="currentLaborReportForModal ? '' : '.pdf,application/pdf'"
      modal-class="a4-date-modal-dark"
      @update:show="(v: boolean) => { if (!v) { showAttachmentModal = false; currentLaborReportForModal = null } }"
      @upload="onRelatedModalUpload"
      @download-all="onRelatedModalDownloadAll"
      @unlink-doc="onRelatedModalUnlinkDoc"
      @preview-doc="onRelatedModalPreviewDoc"
      @download-doc="onRelatedModalDownloadDoc"
      @preview-att="onRelatedModalPreviewAtt"
      @download-att="onRelatedModalDownloadAtt"
      @delete-att="onRelatedModalDeleteAtt"
    >
      <template #extra>
        <!-- 營造端 O-4：工程案勞安證照 -->
        <div v-if="currentLaborReportForModal?.source === 'CONTRACTOR' && laborModalLicenseFiles.length > 0" class="mb-4">
          <h6 class="fw-bold small mb-2"><i class="fa fa-id-card me-1 text-success"></i>工程案勞安證照</h6>
          <div class="list-group">
            <div
              v-for="lic in laborModalLicenseFiles"
              :key="lic.memberId"
              class="list-group-item d-flex justify-content-between align-items-center"
              style="background: var(--a4-card-bg, #1e293b); border-color: var(--a4-border, #334155);"
            >
              <div class="text-truncate">
                <div class="small fw-semibold">{{ lic.fullName || '未填姓名' }}</div>
                <div class="text-muted" style="font-size: 0.7rem;">
                  {{ [lic.occupationCategory, lic.licenseNumber].filter(Boolean).join(' · ') || '—' }}
                </div>
              </div>
              <div class="d-flex gap-1 flex-shrink-0">
                <button
                  class="btn btn-sm btn-outline-info"
                  title="預覽證照"
                  @click="handleLaborPreviewLicense(lic)"
                >
                  <i class="fa fa-eye"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-primary"
                  title="下載證照"
                  @click="handleLaborDownloadLicense(lic)"
                >
                  <i class="fa fa-download"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </RelatedDocumentsModal>

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
import DocumentPicker from '@/components/document/DocumentPicker.vue'
import RelatedDocumentsModal from '@/components/related-documents/RelatedDocumentsModal.vue'
import FormTableOperationMenu from '@/components/forms/FormTableOperationMenu.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import {
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
import {
  getLaborSafetyReportList,
  createLaborSafetyReport,
  deleteLaborSafetyReport,
  updateLaborSafetyReportStatus,
  updateLaborSafetyReportFields,
  linkLaborSafetyReportDocument,
  getLaborSafetyReportLinkedDocuments,
  unlinkLaborSafetyReportDocument,
  uploadLaborSafetyReportAttachment,
  getLaborSafetyReportAttachments,
  getLaborSafetyMembers,
  getLaborSafetyReportLaborLicenseFiles,
  deleteLaborSafetyReportAttachment,
  previewLaborSafetyReportAttachment,
  downloadLaborSafetyReportAttachment,
  downloadAllLaborSafetyReportAttachments,
  exportLaborSafetyReportWord,
  type LaborSafetyReportItem,
  type LaborSafetyReportAttachment,
  type LaborSafetyMemberInfo,
  type LaborLicenseFileInfo
} from '@/api/laborSafetyReport'
import { sitePersonnelApi } from '@/api/sitePersonnel'
import { getDocumentCenterList, type DocumentCenterListItem } from '@/api/documentCenter'
import { formA3Api, downloadBlobAsFile, handleApiError } from '@/api/forms'
import { useExportLoading } from '@/composables/useExportLoading'
import { getLaborSafetySettings, updateLaborSafetySettings, type LaborSafetySettings } from '@/api/construction'
import { getDesignChangeList, getEffectiveVersionForDate, type DesignChangeItem } from '@/api/designChange'
import { getDesignChangeIntervalISO } from '@/utils/designChangeIntervals'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { runWithExportLoading } = useExportLoading()
const isContractorRoute = computed(() => (route.path || '').includes('/forms/o4-labour-safety'))
/** 監造(A-7)=SUPERVISORY / 營造(O-4)=CONTRACTOR，職安報備書共用此頁面 */
const commencementReportSource = computed(() => (isContractorRoute.value ? 'CONTRACTOR' : 'SUPERVISORY'))

const pageTitle = computed(() =>
  isContractorRoute.value ? 'O-4 職業安全衛生業務主管報備書' : 'A-7 職業安全衛生業務主管報備書'
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
const activeReportType = ref<ReportType>('COMMENCEMENT')
const isLoading = ref(false)
const isCreating = ref(false)
const docCacheMap = ref<Map<number, DocumentCenterListItem>>(new Map())
const selectedReport = ref<CommencementReportItem | null>(null)
const reportForDocPicker = ref<CommencementReportItem | null>(null)
const laborReportForDocPicker = ref<LaborSafetyReportItem | null>(null)
const laborReportDocSource = ref<'SUPERVISORY' | 'CONTRACTOR'>('SUPERVISORY')
const linkedDocByReportId = ref<Record<number, string>>({})
const attachmentCountByReportId = ref<Record<number, number>>({})
const linkedRefIdByReportId = ref<Record<number, number>>({})

// 營造端 O-4 職安報備書列表（使用 labor_safety_report）
const laborReports = ref<LaborSafetyReportItem[]>([])

// O-4 勞安配置提示：工程案勞安人員（依版本高亮）
const laborSafetyMembers = ref<LaborSafetyMemberInfo[]>([])
const isLoadingLaborSafetyMembers = ref(false)

// 職安報備書：版本由使用者選擇（不依日期推算）
const designChangeList = ref<DesignChangeItem[]>([])
// O-4 資料依據日 → 適用版本（由後端共用邏輯回傳）
const effectiveVersionByReportId = ref<Record<number, { versionLabel: string; versionRange: string }>>({})

type StaffingTierKey = 'LT30' | '30_99' | '100_PLUS' | '300_PLUS' | '500_PLUS'
const LABOR_SAFETY_STAFFING_TIERS: { key: StaffingTierKey; range: string; requirement: string }[] = [
  { key: 'LT30', range: '未滿 30 人', requirement: '配置丙種職業安全衛生業務主管 1 人。' },
  { key: '30_99', range: '30 人以上未滿 100 人', requirement: '配置乙種職業安全衛生業務主管 1 人。' },
  { key: '100_PLUS', range: '100 人以上', requirement: '配置甲種職業安全衛生業務主管 1 人。' },
  { key: '300_PLUS', range: '300 人以上', requirement: '至少應置專職職業安全衛生管理員 1 人。' },
  { key: '500_PLUS', range: '500 人以上', requirement: '依規模增置管理員/管理師。' }
]

// 依目前專案勞安配置（occupationCategory）判斷最高級距：丁級視同丙級（<30）
const LABOR_SAFETY_CATEGORY_RANK: Record<string, number> = {
  '丁級職業營造業安全衛生業務主管': 1,
  '丙級職業營造業安全衛生業務主管': 1,
  '乙級職業營造業安全衛生業務主管': 2,
  '甲級職業營造業安全衛生業務主管': 3,
  '乙級職業營造業安全衛生管理員': 4,
  '乙級職業營造業安全衛生管理員(專職)': 4,
  '乙級職業營造業安全衛生管理員（專職）': 4,
  '甲級職業安全管理師': 5,
  '甲級職業衛生管理師': 5
}

function normalizeLaborSafetyCategory(v: string | null | undefined): string {
  return (v || '').trim()
}

function getLaborSafetyRank(category: string | null | undefined): number {
  const key = normalizeLaborSafetyCategory(category)
  return LABOR_SAFETY_CATEGORY_RANK[key] ?? 0
}

function tierKeyFromRank(rank: number): StaffingTierKey {
  if (rank <= 1) return 'LT30'
  if (rank === 2) return '30_99'
  if (rank === 3) return '100_PLUS'
  if (rank === 4) return '300_PLUS'
  return '500_PLUS'
}

function formatToRepublicDate(isoDate: string): string {
  if (!isoDate?.trim()) return ''
  const dateOnly = isoDate.trim().split('T')[0]
  const [y, m, d] = dateOnly.split('-').map(Number)
  if (!y || !m || !d) return dateOnly
  const rocYear = y - 1911
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${rocYear}.${mm}.${dd}`
}

const versionOptions = computed(() => {
  const options: { id: number | null; label: string; displayName: string }[] = [{ id: null, label: '原契約', displayName: '原契約' }]
  const list = designChangeList.value
  for (let i = 0; i < list.length; i++) {
    const d = list[i]
    const displayName = (d.versionName?.trim() || `變更設計${i + 1}`)
    const interval = getDesignChangeIntervalISO({ item: d, index: i, designChangeList: list, projectEndDate: '' })
    const range = interval.start
      ? `${formatToRepublicDate(interval.start)} ～ ${interval.openEnded ? '迄今' : interval.end ? formatToRepublicDate(interval.end) : '－'}`
      : ''
    options.push({ id: d.id, label: `${displayName}${range ? `（${range}）` : ''}`, displayName })
  }
  return options
})

/** 有變更設計時才顯示版本標籤（僅原契約則不顯示） */
const hasDesignChanges = computed(() => designChangeList.value.length > 0)

const staffingHighlights = computed(() => {
  const byTier: Record<string, { idKey: string; shortLabel: string; fullLabel: string }[]> = {}
  LABOR_SAFETY_STAFFING_TIERS.forEach((t) => (byTier[t.key] = []))
  const unknown: { idKey: string; shortLabel: string; fullLabel: string }[] = []

  // 工地人員已不區分版本，全部人員視為一組
  const members = laborSafetyMembers.value
  const tag = { idKey: 'null', shortLabel: '工地人員', fullLabel: '工地人員' }
  if (members.length === 0) {
    unknown.push(tag)
  } else {
    const maxRank = members.reduce((max, m) => Math.max(max, getLaborSafetyRank(m.occupationCategory)), 0)
    if (maxRank <= 0) {
      unknown.push(tag)
    } else {
      const tier = tierKeyFromRank(maxRank)
      byTier[tier].push(tag)
    }
  }

  return { byTier, unknown }
})

async function loadLaborSafetyMembersForHint() {
  if (!constructionId.value || !isContractorRoute.value) {
    laborSafetyMembers.value = []
    return
  }
  isLoadingLaborSafetyMembers.value = true
  try {
    laborSafetyMembers.value = await getLaborSafetyMembers(constructionId.value, 'CONTRACTOR')
  } catch (e) {
    console.error(e)
    laborSafetyMembers.value = []
  } finally {
    isLoadingLaborSafetyMembers.value = false
  }
}

async function loadDesignChangeListForLabor() {
  if (!constructionId.value) {
    designChangeList.value = []
    return
  }
  // 依路由決定視角：O-4=CONTRACTOR、A-7=SUPERVISORY
  const sourceType = isContractorRoute.value ? 'CONTRACTOR' : 'SUPERVISORY'
  try {
    const list = await getDesignChangeList(constructionId.value, sourceType)
    designChangeList.value = Array.isArray(list) ? list : []
  } catch {
    designChangeList.value = []
  }
}

const currentTypeReports = computed(() => reportList.value)
const currentReport = computed(() => selectedReport.value)
/** 依目前 tab 顯示的日期欄位標題：開工日期 / 竣工日期 / 停工日期 */
const reportDateColumnLabel = computed(() => ({
  COMMENCEMENT: '開工日期',
  COMPLETION: '竣工日期',
  SUSPENSION: '停工日期'
}[activeReportType.value]))

const showDocPicker = ref(false)
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

// 勞動檢查機構全銜（僅 O-4 營造端可編輯）
const laborInspectionAgencyFullName = ref<string>('')
const isSavingLaborSettings = ref(false)
const laborSettingsLoaded = ref(false)
const laborSettingsInitialized = ref(false)

// 職安報備：上傳檔案 / 相關文件（與 A-4 一致）
const isUploadingLaborReport = ref<Record<number, boolean>>({})
const laborReportUploadReportId = ref<number | null>(null)
const laborReportUploadSource = ref<'SUPERVISORY' | 'CONTRACTOR'>('SUPERVISORY')
const currentLaborReportForModal = ref<{ id: number; source: 'SUPERVISORY' | 'CONTRACTOR' } | null>(null)
const laborModalLinkedDocs = ref<DocumentCenterListItem[]>([])
const laborModalLinkedRefs = ref<{ referenceId: number; documentId: number }[]>([])
const laborModalAttachments = ref<LaborSafetyReportAttachment[]>([])
const laborModalLicenseFiles = ref<LaborLicenseFileInfo[]>([])
const isExportingLaborWord = ref(false)
const exportingLaborReportId = ref<number | null>(null)

async function loadReportList() {
  if (!constructionId.value) return
  isLoading.value = true
  try {
    reportList.value = await getCommencementReportList(constructionId.value, activeReportType.value, commencementReportSource.value)
    const dates: Record<number, string> = {}
    reportList.value.forEach((r) => { dates[r.id] = r.actualReportDate ?? '' })
    actualReportDateByReportId.value = dates
    try {
      const docList = await getDocumentCenterList(constructionId.value)
      const map = new Map<number, DocumentCenterListItem>()
      docList.forEach(d => map.set(d.id, d))
      docCacheMap.value = map
    } catch {}
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
        } catch {}
        try {
          const atts = await getCommencementReportAttachments(r.id, commencementReportSource.value)
          counts[r.id] = atts.length
        } catch {
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

function openDocPickerForLaborReport(r: LaborSafetyReportItem, source: 'SUPERVISORY' | 'CONTRACTOR') {
  laborReportForDocPicker.value = r
  laborReportDocSource.value = source
  showDocPicker.value = true
}

async function addReport() {
  if (!constructionId.value || isCreating.value) return
  isCreating.value = true
  try {
    const source: 'SUPERVISORY' | 'CONTRACTOR' = isContractorRoute.value ? 'CONTRACTOR' : 'SUPERVISORY'
    // 建立一筆新的職安報備紀錄（依路由決定監造/營造）
    await createLaborSafetyReport(constructionId.value, source)
    await loadLaborReportList(source)
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
      const blob = await formA3Api.downloadReport(
        constructionId.value!,
        actualReportDate,
        REPORT_TYPE_CATEGORY_LABELS[activeReportType.value],
        isContractorRoute.value ? 'CONTRACTOR' : 'SUPERVISORY',
        undefined,
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

function openLinkedDocPreviewForLaborReport(r: LaborSafetyReportItem, source: 'SUPERVISORY' | 'CONTRACTOR') {
  getLaborSafetyReportLinkedDocuments(r.id, source).then(refs => {
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
    const { [r.id]: removedLabel, ...rest } = linkedDocByReportId.value
    if (removedLabel !== undefined) {
      linkedDocByReportId.value = rest
    }
    const { [r.id]: removedRefId, ...restRef } = linkedRefIdByReportId.value
    if (removedRefId !== undefined) {
      linkedRefIdByReportId.value = restRef
    }
  } catch (e) {
    console.error(e)
  }
}

async function clearLinkedDocForLaborReport(r: LaborSafetyReportItem, source: 'SUPERVISORY' | 'CONTRACTOR') {
  const refId = linkedRefIdByReportId.value[r.id]
  if (refId == null) return
  try {
    await unlinkLaborSafetyReportDocument(r.id, refId)
    const { [r.id]: removedLabel, ...rest } = linkedDocByReportId.value
    if (removedLabel !== undefined) {
      linkedDocByReportId.value = rest
    }
    const { [r.id]: removedRefId, ...restRef } = linkedRefIdByReportId.value
    if (removedRefId !== undefined) {
      linkedRefIdByReportId.value = restRef
    }
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

function handleLaborReportUploadClick(r: LaborSafetyReportItem, source: 'SUPERVISORY' | 'CONTRACTOR') {
  laborReportUploadReportId.value = r.id
  laborReportUploadSource.value = source
  operationMenuFileInputRef.value?.click()
}

async function onLaborReportFileUpload(e: Event, reportId: number, source: 'SUPERVISORY' | 'CONTRACTOR') {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  isUploadingLaborReport.value = { ...isUploadingLaborReport.value, [reportId]: true }
  try {
    for (const file of Array.from(files)) {
      await uploadLaborSafetyReportAttachment(reportId, file, source)
    }
    const [atts, licenses] = await Promise.all([
      getLaborSafetyReportAttachments(reportId, source),
      source === 'CONTRACTOR' ? getLaborSafetyReportLaborLicenseFiles(reportId, source) : Promise.resolve([] as LaborLicenseFileInfo[])
    ])
    const linkedCount = linkedDocByReportId.value[reportId] ? 1 : 0
    attachmentCountByReportId.value = { ...attachmentCountByReportId.value, [reportId]: atts.length + linkedCount + (licenses?.length ?? 0) }
  } catch (err) {
    console.error('上傳職安報備附件失敗', err)
  } finally {
    isUploadingLaborReport.value = { ...isUploadingLaborReport.value, [reportId]: false }
    laborReportUploadReportId.value = null
    input.value = ''
  }
}

function onOperationMenuFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const laborId = laborReportUploadReportId.value
  if (laborId != null) {
    onLaborReportFileUpload(e, laborId, laborReportUploadSource.value)
    return
  }
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
  // Commencement 報告的關聯（暫時保留以防他處調用）
  if (reportForDocPicker.value) {
    const report = reportForDocPicker.value
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
    return
  }

  // 職安報備書的關聯
  const laborReport = laborReportForDocPicker.value
  if (!laborReport) {
    showDocPicker.value = false
    return
  }
  const src = laborReportDocSource.value
  linkLaborSafetyReportDocument(laborReport.id, payload.document.id, src).then(async () => {
    const docLabel = payload.document.documentNumber || payload.document.subject || ''
    linkedDocByReportId.value = { ...linkedDocByReportId.value, [laborReport.id]: docLabel }
    const refs = await getLaborSafetyReportLinkedDocuments(laborReport.id, src)
    if (refs.length > 0) {
      linkedRefIdByReportId.value = { ...linkedRefIdByReportId.value, [laborReport.id]: refs[0].referenceId }
    }
  }).catch(() => {}).finally(() => {
    laborReportForDocPicker.value = null
    showDocPicker.value = false
  })
}

// 相關文件 Modal（開竣停工 / 職安共用，依 currentLaborReportForModal 切換）
const showAttachmentModal = ref(false)
const modalLinkedDocs = ref<DocumentCenterListItem[]>([])
const modalLinkedRefs = ref<{ referenceId: number; documentId: number }[]>([])
const modalAttachments = ref<CommencementReportAttachment[]>([])

const currentModalLinkedDocs = computed(() =>
  currentLaborReportForModal.value ? laborModalLinkedDocs.value : modalLinkedDocs.value
)
const currentModalAttachments = computed(() =>
  currentLaborReportForModal.value ? laborModalAttachments.value : modalAttachments.value
)
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

async function handleCommencementModalUpload(files: FileList) {
  if (!files?.length || !currentReport.value) return
  const reportId = currentReport.value.id
  isUploadingInModal.value = true
  try {
    for (const file of Array.from(files)) {
      await uploadCommencementReportAttachment(reportId, file, commencementReportSource.value)
    }
    modalAttachments.value = await getCommencementReportAttachments(reportId, commencementReportSource.value)
    attachmentCountByReportId.value = { ...attachmentCountByReportId.value, [reportId]: modalAttachments.value.length + modalLinkedDocs.value.length }
  } finally {
    isUploadingInModal.value = false
  }
}

function onRelatedModalUpload(files: FileList) {
  if (currentLaborReportForModal.value) handleLaborModalUpload(files)
  else handleCommencementModalUpload(files)
}

function onRelatedModalDownloadAll() {
  if (currentLaborReportForModal.value) handleLaborDownloadAll()
  else downloadAllAttachments()
}

function onRelatedModalUnlinkDoc(doc: DocumentCenterListItem) {
  if (currentLaborReportForModal.value) handleUnlinkDocInLaborModal(doc)
  else handleUnlinkDocInModal(doc)
}

function onRelatedModalPreviewDoc(doc: DocumentCenterListItem) {
  if (currentLaborReportForModal.value) handleLaborPreviewDoc(doc)
  else handlePreviewDoc(doc)
}

function onRelatedModalDownloadDoc(doc: DocumentCenterListItem) {
  if (currentLaborReportForModal.value) handleLaborDownloadDoc(doc)
  else handleDownloadDoc(doc)
}

function onRelatedModalPreviewAtt(att: { id: number; fileName: string; fileSize: number }) {
  if (currentLaborReportForModal.value) handleLaborPreviewAtt(att as any)
  else handlePreviewAtt(att as CommencementReportAttachment)
}

function onRelatedModalDownloadAtt(att: { id: number; fileName: string; fileSize: number }) {
  if (currentLaborReportForModal.value) handleLaborDownloadAtt(att as any)
  else handleDownloadAtt(att as CommencementReportAttachment)
}

function onRelatedModalDeleteAtt(att: { id: number; fileName: string; fileSize: number }) {
  if (currentLaborReportForModal.value) handleLaborDeleteAtt(att as any)
  else handleDeleteAtt(att as CommencementReportAttachment)
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
      const rest = { ...linkedDocByReportId.value }
      delete rest[currentReport.value.id]
      linkedDocByReportId.value = rest
      const restRef = { ...linkedRefIdByReportId.value }
      delete restRef[currentReport.value.id]
      linkedRefIdByReportId.value = restRef
    }
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

let laborAutoSaveTimer: ReturnType<typeof setTimeout> | null = null

function toNonNegativeInt(value?: number | null): number | null {
  if (value == null || isNaN(value as number)) return null
  return Math.max(0, Math.floor(value))
}

function laborTotalCount(r: LaborSafetyReportItem): number {
  return (r.totalMaleWorkers ?? 0) + (r.totalFemaleWorkers ?? 0)
}

function contractorTotalCount(r: LaborSafetyReportItem): number {
  return (r.contractorMaleWorkers ?? 0) + (r.contractorFemaleWorkers ?? 0)
}

async function loadLaborReportList(source: 'SUPERVISORY' | 'CONTRACTOR' = 'CONTRACTOR') {
  if (!constructionId.value) return
  try {
    await loadDesignChangeListForLabor()
    if (source === 'CONTRACTOR') {
      await loadLaborSafetyMembersForHint()
    } else {
      laborSafetyMembers.value = []
    }
    laborReports.value = await getLaborSafetyReportList(constructionId.value, source)
    // 參考 A-4：建立公文快取並為每筆紀錄載入關聯公文，重新整理後仍會顯示
    try {
      const docList = await getDocumentCenterList(constructionId.value)
      const map = new Map<number, DocumentCenterListItem>()
      docList.forEach(d => map.set(d.id, d))
      docCacheMap.value = map
    } catch { /* ignore */ }
    const linked: Record<number, string> = {}
    const refIds: Record<number, number> = {}
    const counts: Record<number, number> = {}
    await Promise.all(
      laborReports.value.map(async (r) => {
        try {
          const [refs, atts, licenses] = await Promise.all([
            getLaborSafetyReportLinkedDocuments(r.id, source),
            getLaborSafetyReportAttachments(r.id, source),
            source === 'CONTRACTOR' ? getLaborSafetyReportLaborLicenseFiles(r.id, source) : Promise.resolve([] as LaborLicenseFileInfo[])
          ])
          if (refs.length > 0) {
            const doc = docCacheMap.value.get(refs[0].documentId)
            linked[r.id] = doc?.documentNumber ?? refs[0].targetName ?? refs[0].displayTitle ?? ''
            refIds[r.id] = refs[0].referenceId
          }
          counts[r.id] = atts.length + (refs.length > 0 ? 1 : 0) + (licenses?.length ?? 0)
        } catch { /* ignore */ }
      })
    )
    linkedDocByReportId.value = linked
    linkedRefIdByReportId.value = refIds
    attachmentCountByReportId.value = counts
    if (source === 'CONTRACTOR') {
      laborReports.value.filter((x) => x.dataReferenceDate).forEach((x) => fetchEffectiveVersionForLaborReport(x))
    }
  } catch (e) {
    console.error('載入職安報備列表失敗', e)
  }
}

async function onLaborVersionChange(r: LaborSafetyReportItem, raw: string, source: 'SUPERVISORY' | 'CONTRACTOR') {
  const nextId = raw === '' ? null : Number(raw)
  try {
    const updated = await updateLaborSafetyReportFields(r.id, { designChangeId: nextId }, source)
    const idx = laborReports.value.findIndex(x => x.id === r.id)
    if (idx !== -1) laborReports.value[idx] = { ...laborReports.value[idx], ...updated }
  } catch (e) {
    console.error('更新職安報備使用資料版本失敗', e)
  }
}

async function fetchEffectiveVersionForLaborReport(r: LaborSafetyReportItem) {
  const cid = constructionId.value
  if (!cid || !r.dataReferenceDate) return
  try {
    const v = await getEffectiveVersionForDate(cid, r.dataReferenceDate, 'CONTRACTOR')
    if (v) {
      effectiveVersionByReportId.value = {
        ...effectiveVersionByReportId.value,
        [r.id]: { versionLabel: v.versionLabel, versionRange: v.versionRange }
      }
    }
  } catch { /* ignore */ }
}

async function onLaborDataReferenceDateChange(r: LaborSafetyReportItem, value: string | null, source: 'SUPERVISORY' | 'CONTRACTOR') {
  try {
    const updated = await updateLaborSafetyReportFields(r.id, { dataReferenceDate: value || undefined }, source)
    const idx = laborReports.value.findIndex(x => x.id === r.id)
    if (idx !== -1) laborReports.value[idx] = { ...laborReports.value[idx], ...updated }
    if (value) {
      await fetchEffectiveVersionForLaborReport({ ...r, dataReferenceDate: value })
    } else {
      const next = { ...effectiveVersionByReportId.value }
      delete next[r.id]
      effectiveVersionByReportId.value = next
    }
  } catch (e) {
    console.error('更新職安報備資料依據日失敗', e)
  }
}

async function onLaborReportFieldChange(
  r: LaborSafetyReportItem,
  payload: {
    organizationName?: string | null
    totalMaleWorkers?: number | null
    totalFemaleWorkers?: number | null
    contractorMaleWorkers?: number | null
    contractorFemaleWorkers?: number | null
    safetyUnitLevel?: string | null
    performanceRecognized?: boolean | null
    businessUnitCode?: string | null
    industryStandardCode?: string | null
  }
) {
  try {
    const updated = await updateLaborSafetyReportFields(r.id, payload, 'CONTRACTOR')
    // 同步回本地 state
    const idx = laborReports.value.findIndex(x => x.id === r.id)
    if (idx !== -1) {
      laborReports.value[idx] = { ...laborReports.value[idx], ...updated }
    }
  } catch (e) {
    console.error('更新職安報備欄位失敗', e)
  }
}

async function onLaborStatusChange(r: LaborSafetyReportItem, status: string) {
  try {
    await updateLaborSafetyReportStatus(r.id, status, 'CONTRACTOR')
    r.status = status
  } catch (e) {
    console.error('更新職安報備狀態失敗', e)
  }
}

async function onLaborStatusChangeSupervisory(r: LaborSafetyReportItem, status: string) {
  try {
    await updateLaborSafetyReportStatus(r.id, status, 'SUPERVISORY')
    r.status = status
  } catch (e) {
    console.error('更新職安報備狀態失敗', e)
  }
}

async function deleteLaborReportRow(r: LaborSafetyReportItem) {
  if (!confirm('確定要刪除此筆職安報備紀錄？')) return
  try {
    await deleteLaborSafetyReport(r.id, 'CONTRACTOR')
    laborReports.value = laborReports.value.filter(x => x.id !== r.id)
  } catch (e) {
    console.error('刪除職安報備紀錄失敗', e)
  }
}

async function deleteLaborReportRowSupervisory(r: LaborSafetyReportItem) {
  if (!confirm('確定要刪除此筆職安報備紀錄？')) return
  try {
    await deleteLaborSafetyReport(r.id, 'SUPERVISORY')
    laborReports.value = laborReports.value.filter(x => x.id !== r.id)
  } catch (e) {
    console.error('刪除職安報備紀錄失敗', e)
  }
}

// 職安報備「相關文件」Modal（與 A-4 一致）；營造端 O-4 另載入工程案勞安證照清單
async function openLaborReportAttachmentPanel(r: LaborSafetyReportItem, source: 'SUPERVISORY' | 'CONTRACTOR') {
  currentLaborReportForModal.value = { id: r.id, source }
  showAttachmentModal.value = true
  isLoadingAttachments.value = true
  laborModalLinkedDocs.value = []
  laborModalLinkedRefs.value = []
  laborModalAttachments.value = []
  laborModalLicenseFiles.value = []
  try {
    const [refs, atts, licenses] = await Promise.all([
      getLaborSafetyReportLinkedDocuments(r.id, source),
      getLaborSafetyReportAttachments(r.id, source),
      source === 'CONTRACTOR' ? getLaborSafetyReportLaborLicenseFiles(r.id, source) : Promise.resolve([] as LaborLicenseFileInfo[])
    ])
    laborModalAttachments.value = atts
    laborModalLicenseFiles.value = licenses
    laborModalLinkedRefs.value = refs.map(ref => ({ referenceId: ref.referenceId, documentId: ref.documentId }))
    if (refs.length > 0 && docCacheMap.value.size > 0) {
      laborModalLinkedDocs.value = refs.map(ref => docCacheMap.value.get(ref.documentId)).filter(Boolean) as DocumentCenterListItem[]
    }
  } catch (err) {
    console.error('載入職安報備相關文件失敗', err)
  } finally {
    isLoadingAttachments.value = false
  }
}

function handleLaborPreviewDoc(doc: DocumentCenterListItem) {
  if (!doc.fileUrl) return
  previewFileName.value = doc.documentNumber || doc.fileName
  previewUrl.value = doc.fileUrl
  showPreviewModal.value = true
}

function handleLaborDownloadDoc(doc: DocumentCenterListItem) {
  if (!doc.fileUrl) return
  const link = document.createElement('a')
  link.href = doc.fileUrl
  link.download = doc.fileName || `${doc.documentNumber}.pdf`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function handleUnlinkDocInLaborModal(doc: DocumentCenterListItem) {
  const labor = currentLaborReportForModal.value
  if (!labor?.id) return
  const ref = laborModalLinkedRefs.value.find(r => r.documentId === doc.id)
  if (!ref || !confirm('確定要取消關聯此公文？')) return
  try {
    await unlinkLaborSafetyReportDocument(labor.id, ref.referenceId)
    const refs = await getLaborSafetyReportLinkedDocuments(labor.id, labor.source)
    laborModalLinkedRefs.value = refs.map(r => ({ referenceId: r.referenceId, documentId: r.documentId }))
    if (refs.length > 0 && docCacheMap.value.size > 0) {
      laborModalLinkedDocs.value = refs.map(r => docCacheMap.value.get(r.documentId)).filter(Boolean) as DocumentCenterListItem[]
    } else {
      laborModalLinkedDocs.value = []
      const rest = { ...linkedDocByReportId.value }
      delete rest[labor.id]
      linkedDocByReportId.value = rest
      const restRef = { ...linkedRefIdByReportId.value }
      delete restRef[labor.id]
      linkedRefIdByReportId.value = restRef
    }
  } catch (e) {
    console.error('取消關聯失敗:', e)
  }
}

async function handleLaborModalUpload(files: FileList) {
  const cur = currentLaborReportForModal.value
  if (!files?.length || !cur) return
  isUploadingInModal.value = true
  try {
    for (const file of Array.from(files)) {
      await uploadLaborSafetyReportAttachment(cur.id, file, cur.source)
    }
    laborModalAttachments.value = await getLaborSafetyReportAttachments(cur.id, cur.source)
    const linkedCount = laborModalLinkedDocs.value.length > 0 ? 1 : 0
    const licenseCount = cur.source === 'CONTRACTOR' ? laborModalLicenseFiles.value.length : 0
    attachmentCountByReportId.value = { ...attachmentCountByReportId.value, [cur.id]: laborModalAttachments.value.length + linkedCount + licenseCount }
  } catch (err) {
    console.error('上傳職安報備附件失敗', err)
  } finally {
    isUploadingInModal.value = false
  }
}

/** 僅 PDF 與圖片支援預覽 */
function canPreviewLaborAtt(att: LaborSafetyReportAttachment): boolean {
  const ct = (att.contentType ?? '').toLowerCase()
  if (ct === 'application/pdf') return true
  if (ct.startsWith('image/')) return true
  const ext = (att.fileName ?? '').split('.').pop()?.toLowerCase()
  return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext ?? '')
}

async function handleLaborPreviewAtt(att: LaborSafetyReportAttachment) {
  const cur = currentLaborReportForModal.value
  if (!cur) return
  try {
    const result = await previewLaborSafetyReportAttachment(cur.id, att.id, cur.source)
    previewFileName.value = result.fileName
    previewUrl.value = result.url
    showPreviewModal.value = true
  } catch (err) {
    console.error('預覽附件失敗', err)
  }
}

async function handleLaborDownloadAtt(att: LaborSafetyReportAttachment) {
  const cur = currentLaborReportForModal.value
  if (!cur) return
  try {
    await downloadLaborSafetyReportAttachment(cur.id, att.id, att.fileName, cur.source)
  } catch (err) {
    console.error('下載附件失敗', err)
  }
}

async function handleLaborPreviewLicense(lic: LaborLicenseFileInfo) {
  try {
    const blob = await sitePersonnelApi.downloadPhoto(lic.memberId)
    const url = URL.createObjectURL(blob)
    previewFileName.value = `證照_${lic.fullName || lic.memberId}`
    previewUrl.value = url
    showPreviewModal.value = true
  } catch (err) {
    console.error('預覽勞安證照失敗', err)
  }
}

async function handleLaborDownloadLicense(lic: LaborLicenseFileInfo) {
  try {
    const blob = await sitePersonnelApi.downloadPhoto(lic.memberId)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const namePart = [lic.fullName || '未填姓名', lic.licenseNumber].filter(Boolean).join('_')
link.download = `勞安證照_${namePart}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('下載勞安證照失敗', err)
  }
}

async function handleLaborDeleteAtt(att: LaborSafetyReportAttachment) {
  const cur = currentLaborReportForModal.value
  if (!cur || !confirm(`確定要刪除「${att.fileName}」？`)) return
  try {
    await deleteLaborSafetyReportAttachment(cur.id, att.id, cur.source)
    laborModalAttachments.value = laborModalAttachments.value.filter(a => a.id !== att.id)
    const linkedCount = laborModalLinkedDocs.value.length > 0 ? 1 : 0
    const licenseCount = cur.source === 'CONTRACTOR' ? laborModalLicenseFiles.value.length : 0
    attachmentCountByReportId.value = { ...attachmentCountByReportId.value, [cur.id]: laborModalAttachments.value.length + linkedCount + licenseCount }
  } catch (err) {
    console.error('刪除附件失敗', err)
  }
}

async function handleLaborDownloadAll() {
  const cur = currentLaborReportForModal.value
  if (!cur) return
  isDownloadingAll.value = true
  try {
    await downloadAllLaborSafetyReportAttachments(cur.id, cur.source)
  } catch (err) {
    console.error('下載全部失敗', err)
  } finally {
    isDownloadingAll.value = false
  }
}

async function handleExportLaborReportWord(r: LaborSafetyReportItem) {
  if (!constructionId.value || isExportingLaborWord.value) return
  isExportingLaborWord.value = true
  exportingLaborReportId.value = r.id
  try {
    await runWithExportLoading(`o4-word-${r.id}`, 'O-4 職安報備書', async (signal) => {
      const blob = await exportLaborSafetyReportWord(r.id, constructionId.value!, 'CONTRACTOR', { signal })
      downloadBlobAsFile(blob, `職業安全衛生業務主管報備書_O4_${r.id}.docx`)
    })
  } catch (err) {
    if ((err as any)?.name === 'AbortError' || (err as any)?.code === 'ERR_CANCELED') return
    console.error('匯出職安報備書失敗', err)
  } finally {
    isExportingLaborWord.value = false
    exportingLaborReportId.value = null
  }
}

async function loadLaborSafetySettings() {
  if (!constructionId.value || !isContractorRoute.value) {
    laborSettingsLoaded.value = true
    laborSettingsInitialized.value = true
    return
  }
  laborSettingsLoaded.value = false
  try {
    const data: LaborSafetySettings = await getLaborSafetySettings(constructionId.value)
    laborInspectionAgencyFullName.value = data.laborInspectionAgencyFullName || ''
  } catch (e) {
    console.error('載入職安設定失敗', e)
  } finally {
    laborSettingsLoaded.value = true
    laborSettingsInitialized.value = true
  }
}

async function saveLaborSafetySettings() {
  if (!constructionId.value || !isContractorRoute.value) return
  isSavingLaborSettings.value = true
  try {
    await updateLaborSafetySettings({
      constructionId: constructionId.value,
      laborInspectionAgencyFullName: laborInspectionAgencyFullName.value.trim() || null
    })
  } catch (e) {
    console.error('更新職安設定失敗', e)
  } finally {
    isSavingLaborSettings.value = false
  }
}

watch(laborInspectionAgencyFullName, () => {
  if (!laborSettingsInitialized.value) return
  if (!constructionId.value || !isContractorRoute.value) return
  if (laborAutoSaveTimer) {
    clearTimeout(laborAutoSaveTimer)
  }
  laborAutoSaveTimer = setTimeout(() => {
    saveLaborSafetySettings()
  }, 600)
})

onMounted(() => {
  if (constructionId.value) {
    loadLaborSafetySettings()
    const source: 'SUPERVISORY' | 'CONTRACTOR' = isContractorRoute.value ? 'CONTRACTOR' : 'SUPERVISORY'
    loadLaborReportList(source)
  }
})
watch(constructionId, (id) => {
  if (id) {
    loadLaborSafetySettings()
    const source: 'SUPERVISORY' | 'CONTRACTOR' = isContractorRoute.value ? 'CONTRACTOR' : 'SUPERVISORY'
    loadLaborReportList(source)
  } else {
    reportList.value = []
    selectedReport.value = null
    linkedDocByReportId.value = {}
    attachmentCountByReportId.value = {}
    actualReportDateByReportId.value = {}
    laborReports.value = []
  }
})

onBeforeUnmount(() => {
  if (autoSaveDateTimer.value) {
    clearTimeout(autoSaveDateTimer.value)
    autoSaveDateTimer.value = null
  }
  if (laborAutoSaveTimer) {
    clearTimeout(laborAutoSaveTimer)
    laborAutoSaveTimer = null
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

/* O-4 勞安配置提示：緊湊版面、限制寬度 */
.o4-staffing-hint {
  width: fit-content;
  min-width: 560px;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--a4-card-bg, #1e293b);
  border: 1px solid var(--a4-border, #334155);
}
.o4-staffing-grid {
  display: grid;
  gap: 0.25rem;
}
.o4-staffing-row {
  display: grid;
  grid-template-columns: 150px 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
}
.o4-staffing-row.o4-staffing-row--no-version {
  grid-template-columns: 150px 1fr;
}
.o4-staffing-row.active {
  background: rgba(255, 193, 7, 0.1);
  outline: 1px solid rgba(255, 193, 7, 0.25);
}
.o4-staffing-range {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--a4-text, #e4e6eb);
  white-space: nowrap;
}
.o4-staffing-req {
  font-size: 0.78rem;
  color: rgba(226, 232, 240, 0.8);
}
.o4-staffing-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: flex-end;
}
.o4-staffing-badge {
  font-size: 0.65rem;
  padding: 0.25em 0.5em;
}
.o4-staffing-unknown {
  line-height: 1.2;
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
