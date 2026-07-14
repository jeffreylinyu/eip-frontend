<template>
  <div class="form-p2-quality-plan-page">
    <PageHeader :title="pageTitle" icon="fa fa-file-lines" :breadcrumbs="breadcrumbs">
      <template v-if="hasCurrentProject && isContractor" #extra>
        <DesignChangeVersionSwitcher
          :model-value="designChangeIdFromRoute"
          :construction-id="currentProject?.id"
          source-type="CONTRACTOR"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <PlanSubmissionPModal
      v-if="dynamicPlanType"
      v-model:show="showSubmissionModal"
      :plan-type="dynamicPlanType"
      :plan-label="pageTitle"
    />

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!isContractor" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      「{{ pageTitle }}」僅供營造端維護。
    </div>

    <Card v-else-if="loading" class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入中…
        </div>
      </CardBody>
    </Card>

    <Card v-else-if="!targetRow" class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div class="alert alert-info mb-0">
          <i class="fa fa-info-circle me-2"></i>找不到對應的 P 類分類項目，請回到「文件檔案分類表」確認設定。
        </div>
      </CardBody>
    </Card>

    <!-- 預設 P 類（含職安）：P-3 專用頁上線前之過渡 -->
    <Card v-else-if="targetRow.isDefault" class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div class="b2-content-toolbar">
          <div class="p1-toolbar-left">
            <label class="p1-refdate-label" for="p-dynamic-data-reference-date-default">
              資料依據日
              <span
                class="p1-info-icon"
                data-tooltip="此日期用於後續匯出與內容判斷；預設為今日。"
                tabindex="0"
                aria-label="資料依據日說明"
              >
                <i class="fa fa-circle-info"></i>
              </span>
            </label>
            <RepublicDatePicker
              id="p-dynamic-data-reference-date-default"
              v-model="dataReferenceDate"
              class="p1-refdate-picker"
              placeholder="請選擇資料依據日"
              value-format="YYYY-MM-DD"
              auto-apply
            />
          </div>
          <div class="p1-toolbar-right" aria-hidden="true" />
        </div>

        <div class="text-panels text-panels--ai-wrap">
          <div class="row g-3 align-items-stretch">
            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-file-lines me-2 text-warning"></i>
                    {{ targetRow.documentName }}
                  </div>
                </div>
                <div class="text-panel__body">
                  <p class="text-muted mb-0 small">
                    此為預設 P 類項目之過渡頁（版型與 P-2 一致）。後續將提供與 P-1、P-2
                    相同架構之專用頁面。
                  </p>
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-chart-line me-2 text-warning"></i>
                    預定作業進度圖
                  </div>
                  <span class="p1img-count-badge p1img-count-badge--warning">{{ scheduledProgressImages.length }}</span>
                </div>
                <div class="text-panel__body">
                  <div class="p1img-section-toolbar">
                    <div>
                      <div class="p1img-pending-pill" v-if="pendingScheduledProgressFiles.length">
                        已選取 {{ pendingScheduledProgressFiles.length }} 張，按「上傳」送出
                      </div>
                      <div class="text-muted small" v-else>請先選取圖片，再點擊上傳。</div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      <label class="p1img-file-pick">
                        <input
                          class="p1img-file-pick__input"
                          type="file"
                          accept="image/png,image/jpeg"
                          multiple
                          :disabled="scheduledProgressChartUploading"
                          @change="onPickScheduledProgressFiles"
                        />
                        <span
                          class="btn btn-sm btn-outline-light p1img-file-pick__btn"
                          :class="{ disabled: scheduledProgressChartUploading }"
                        >
                          <i class="fa fa-folder-open me-1"></i>選取圖片
                        </span>
                      </label>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        :disabled="scheduledProgressChartUploading || pendingScheduledProgressFiles.length === 0"
                        @click="uploadPendingScheduledProgress"
                      >
                        <i
                          class="fa me-1"
                          :class="scheduledProgressChartUploading ? 'fa-spinner fa-spin' : 'fa-upload'"
                        ></i>
                        {{ scheduledProgressChartUploading ? '上傳中…' : '上傳圖片' }}
                      </button>
                    </div>
                  </div>
                  <div v-if="scheduledProgressImages.length === 0" class="p1img-empty-state">
                    尚未上傳預定作業進度圖。
                  </div>
                  <div v-else class="row g-3 mt-2">
                    <div
                      v-for="img in scheduledProgressImages"
                      :key="img.id"
                      class="col-12 col-sm-6 col-lg-4"
                    >
                      <div class="p1img-loc-card">
                        <ConstructionLocationMapThumb
                          v-if="currentProject?.id && docId != null"
                          :img="img"
                          :construction-id="currentProject.id"
                          :design-change-id="designChangeIdFromRoute"
                          :document-classification-id="docId"
                          :type="P_DYNAMIC_SCHEDULED_PROGRESS_TYPE"
                          link-class="p1img-loc-thumb"
                          empty-class="p1img-loc-thumb p1img-loc-thumb--empty"
                        />
                        <div class="p1img-loc-meta">
                          <div class="p1img-loc-name" :title="img.fileName">{{ img.fileName }}</div>
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            :disabled="deletingScheduledImageId === img.id"
                            @click="removeScheduledProgressImage(img.id)"
                          >
                            <i
                              class="fa"
                              :class="deletingScheduledImageId === img.id ? 'fa-spinner fa-spin' : 'fa-trash'"
                            ></i>
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
      </CardBody>
    </Card>

    <!-- 營造自訂 P 類：工程規模概述存於分類表列 -->
    <Card v-else class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div class="b2-content-toolbar">
          <div class="p1-toolbar-left">
            <label class="p1-refdate-label" for="p-dynamic-data-reference-date-custom">
              資料依據日
              <span
                class="p1-info-icon"
                data-tooltip="此日期用於後續匯出與內容判斷；預設為今日。"
                tabindex="0"
                aria-label="資料依據日說明"
              >
                <i class="fa fa-circle-info"></i>
              </span>
            </label>
            <RepublicDatePicker
              id="p-dynamic-data-reference-date-custom"
              v-model="dataReferenceDate"
              class="p1-refdate-picker"
              placeholder="請選擇資料依據日"
              value-format="YYYY-MM-DD"
              auto-apply
            />
          </div>
          <div class="p1-toolbar-right">
            <button
              v-if="isSuperAdmin"
              type="button"
              class="btn-ai-generate p-dynamic-batch-ai-btn"
              :disabled="isAiGenerating || isExporting || !currentProject?.id || docId == null || !targetRow || targetRow.isDefault"
              title="一次工程案資料建構本頁所有可生成欄位（分兩階段：先產出主要工序，再依工序生成施工要領、抽查標準、機具/材料、安衛、環保）"
              @click="generateAllPDynamicByAi"
            >
              <i class="fa me-2" :class="isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
              <span>{{ batchAiButtonLabel }}</span>
            </button>
            <button
              v-if="dynamicPlanType"
              type="button"
              class="win-btn"
              @click="showSubmissionModal = true"
            >
              <i class="fa fa-clipboard-list"></i>送審紀錄
            </button>
            <button type="button" class="btn b2-export-btn" :disabled="isExporting" @click="exportWord">
              <i class="fa fa-file-word"></i>
              {{ isExporting ? '匯出中…' : '匯出 Word' }}
            </button>
          </div>
        </div>

        <div class="text-panels text-panels--ai-wrap">
          <div class="row g-3 align-items-stretch">
            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
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
                      :disabled="isAiGenerating || !currentProject?.id"
                      @click="generateScaleOverviewByAi"
                    >
                      <i
                        class="fa me-2"
                        :class="aiLoadingScale ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                      ></i>
                      {{ aiLoadingScale ? '生成中…' : '依標單工程案資料建構' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <textarea
                    v-model="scaleOverviewDraft"
                    class="form-control text-panel__textarea"
                    rows="7"
                    placeholder="請輸入工程規模概述（自訂 P 類項目）"
                    @input="debouncedSaveCustomFields"
                  />
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-chart-line me-2 text-warning"></i>
                    預定作業進度圖
                  </div>
                  <span class="p1img-count-badge p1img-count-badge--warning">{{ scheduledProgressImages.length }}</span>
                </div>
                <div class="text-panel__body">
                  <div class="p1img-section-toolbar">
                    <div>
                      <div class="p1img-pending-pill" v-if="pendingScheduledProgressFiles.length">
                        已選取 {{ pendingScheduledProgressFiles.length }} 張，按「上傳」送出
                      </div>
                      <div class="text-muted small" v-else>請先選取圖片，再點擊上傳。</div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      <label class="p1img-file-pick">
                        <input
                          class="p1img-file-pick__input"
                          type="file"
                          accept="image/png,image/jpeg"
                          multiple
                          :disabled="scheduledProgressChartUploading"
                          @change="onPickScheduledProgressFiles"
                        />
                        <span
                          class="btn btn-sm btn-outline-light p1img-file-pick__btn"
                          :class="{ disabled: scheduledProgressChartUploading }"
                        >
                          <i class="fa fa-folder-open me-1"></i>選取圖片
                        </span>
                      </label>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary"
                        :disabled="scheduledProgressChartUploading || pendingScheduledProgressFiles.length === 0"
                        @click="uploadPendingScheduledProgress"
                      >
                        <i
                          class="fa me-1"
                          :class="scheduledProgressChartUploading ? 'fa-spinner fa-spin' : 'fa-upload'"
                        ></i>
                        {{ scheduledProgressChartUploading ? '上傳中…' : '上傳圖片' }}
                      </button>
                    </div>
                  </div>
                  <div v-if="scheduledProgressImages.length === 0" class="p1img-empty-state">
                    尚未上傳預定作業進度圖。
                  </div>
                  <div v-else class="row g-3 mt-2">
                    <div
                      v-for="img in scheduledProgressImages"
                      :key="img.id"
                      class="col-12 col-sm-6 col-lg-4"
                    >
                      <div class="p1img-loc-card">
                        <ConstructionLocationMapThumb
                          v-if="currentProject?.id && docId != null"
                          :img="img"
                          :construction-id="currentProject.id"
                          :design-change-id="designChangeIdFromRoute"
                          :document-classification-id="docId"
                          :type="P_DYNAMIC_SCHEDULED_PROGRESS_TYPE"
                          link-class="p1img-loc-thumb"
                          empty-class="p1img-loc-thumb p1img-loc-thumb--empty"
                        />
                        <div class="p1img-loc-meta">
                          <div class="p1img-loc-name" :title="img.fileName">{{ img.fileName }}</div>
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            :disabled="deletingScheduledImageId === img.id"
                            @click="removeScheduledProgressImage(img.id)"
                          >
                            <i
                              class="fa"
                              :class="deletingScheduledImageId === img.id ? 'fa-spinner fa-spin' : 'fa-trash'"
                            ></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-layer-group me-2 text-warning"></i>
                    施工方法與步驟
                  </div>
                  <div class="text-panel__toolbar">
                    <button
                      type="button"
                      class="btn btn-sm inspection-standards-flowchart-btn guide-flowchart-btn flex-shrink-0 me-2"
                      title="預覽施工流程圖（與監造施工項目相同蛇形圖，依主要工序順序）"
                      :disabled="!hasStagePlanFlowProcesses || stagePlanFlowChartLoading"
                      @click="openStagePlanFlowChartModal"
                    >
                      <i class="fa fa-sitemap me-2" aria-hidden="true"></i>
                      施工流程圖
                    </button>
                    <button v-if="isSuperAdmin" type="button" class="btn-ai-generate" :disabled="aiLoadingStagePlan || !currentProject?.id" @click="generateConstructionStagePlanByAi">
                      <i class="fa me-2" :class="aiLoadingStagePlan ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                      {{ aiLoadingStagePlan ? '生成中…' : '工程案資料建構完整結構' }}
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-light ms-2" @click="addStagePlanStage">
                      <i class="fa fa-plus me-1"></i>新增階段
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-light ms-1"
                      :disabled="constructionStagePlanRows.length === 0"
                      title="展開全部施工階段（含上方「施工方法與步驟」表格，以及下方「施工要領」各階段區塊）"
                      @click="expandAllStagePlanStages"
                    >
                      全部展開
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-light ms-1"
                      :disabled="constructionStagePlanRows.length === 0"
                      title="收合全部施工階段（含上方表格與下方施工要領各階段）"
                      @click="collapseAllStagePlanStages"
                    >
                      全部收合
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <div v-if="constructionStagePlanRows.length === 0" class="text-muted small py-3">
                    尚無資料，可手動新增階段/工序，或使用工程案資料建構一鍵建構。
                  </div>
                  <div class="stage-plan-accordion">
                    <div v-for="(stage, stageIdx) in constructionStagePlanRows" :key="stage.id" class="stage-plan-accordion__item">
                      <div
                        class="stage-plan-accordion__header"
                        :class="{ 'is-collapsed': !isStageExpanded(stage.id) }"
                        @click="onStageAccordionHeaderClick($event, stage.id)"
                      >
                        <button
                          type="button"
                          class="stage-plan-accordion__toggle btn btn-link p-0 text-decoration-none"
                          :aria-expanded="isStageExpanded(stage.id)"
                          aria-label="收合或展開此施工階段"
                          @click.stop="toggleStageExpanded(stage.id)"
                        >
                          <i class="fa fa-fw" :class="isStageExpanded(stage.id) ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                        </button>
                        <div class="stage-plan-accordion__title">
                          <span class="stage-plan-accordion__label">施工階段</span>
                          <button
                            type="button"
                            class="stage-plan-accordion__title-btn"
                            @click.stop="openStagePlanEditModal(stageIdx, null, 'stageName')"
                          >
                            {{ stage.name || `階段${stageIdx + 1}` }}
                          </button>
                        </div>
                        <div class="stage-plan-accordion__actions">
                          <button type="button" class="btn btn-sm btn-outline-light" @click.stop="addStageProcess(stageIdx)">
                            <i class="fa fa-plus me-1"></i>新增工序
                          </button>
                          <button type="button" class="btn btn-sm btn-outline-danger" @click.stop="removeStagePlanStage(stageIdx)">
                            <i class="fa fa-trash"></i>
                          </button>
                        </div>
                      </div>

                      <div v-show="isStageExpanded(stage.id)" class="stage-plan-accordion__body">
                        <div class="table-responsive">
                          <table class="table table-sm table-bordered stage-plan-table align-middle mb-0">
                            <thead>
                              <tr>
                                <th>主要工序</th>
                                <th>介面銜接處理方式</th>
                                <th>工序順序安排處理方式</th>
                                <th>勞工安全衛生事項</th>
                                <th>環境保護措施</th>
                                <th>其他施工管理重點</th>
                                <th class="text-center">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-if="stage.processes.length === 0">
                                <td colspan="7" class="text-center text-muted py-3">此階段尚無工序，請點擊上方「新增工序」。</td>
                              </tr>
                              <tr v-for="(proc, procIdx) in stage.processes" :key="proc.id">
                                <td class="stage-plan-cell stage-plan-cell--clickable" @click="openStagePlanEditModal(stageIdx, procIdx, 'processName')">
                                  {{ proc.name || `工序${procIdx + 1}` }}
                                </td>
                                <td>
                                  <div class="stage-plan-cell stage-plan-cell--clickable" @click="openStagePlanEditModal(stageIdx, procIdx, 'interfaceHandling')">
                                    {{ proc.interfaceHandling || '-' }}
                                  </div>
                                </td>
                                <td>
                                  <div class="stage-plan-cell stage-plan-cell--clickable" @click="openStagePlanEditModal(stageIdx, procIdx, 'sequenceArrangement')">
                                    {{ proc.sequenceArrangement || '-' }}
                                  </div>
                                </td>
                                <td>
                                  <div class="stage-plan-cell stage-plan-cell--clickable" @click="openStagePlanEditModal(stageIdx, procIdx, 'safetyHealth')">
                                    {{ proc.safetyHealth || '-' }}
                                  </div>
                                </td>
                                <td>
                                  <div class="stage-plan-cell stage-plan-cell--clickable" @click="openStagePlanEditModal(stageIdx, procIdx, 'environmentProtection')">
                                    {{ proc.environmentProtection || '-' }}
                                  </div>
                                </td>
                                <td>
                                  <div class="stage-plan-cell stage-plan-cell--clickable" @click="openStagePlanEditModal(stageIdx, procIdx, 'otherManagement')">
                                    {{ proc.otherManagement || '-' }}
                                  </div>
                                </td>
                                <td class="text-center">
                                  <button type="button" class="btn btn-sm btn-outline-danger" @click="removeStageProcess(stageIdx, procIdx)">
                                    <i class="fa fa-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 施工要領：統一置於上表之後，不穿插於各階段摺疊內 -->
                  <div
                    v-if="hasStagePlanProcessesForEssentials"
                    class="stage-plan-essentials-unified mt-3 pt-3 border-top border-secondary border-opacity-25"
                  >
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                      <div class="stage-plan-essentials__title text-warning-emphasis small fw-semibold mb-0">
                        <i class="fa fa-clipboard-list me-2" aria-hidden="true"></i>
                        主要工序之施工要領
                      </div>
                      <button
                        v-if="isSuperAdmin"
                        type="button"
                        class="btn-ai-generate"
                        :disabled="aiLoadingStageEssentials || !currentProject?.id"
                        @click="generateConstructionEssentialsByAi"
                      >
                        <i class="fa me-2" :class="aiLoadingStageEssentials ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                        {{ aiLoadingStageEssentials ? '生成中…' : '依目前工序工程案資料建構施工要領' }}
                      </button>
                    </div>
                    <p class="text-muted small mb-2">
                      此處每一項皆對應上方「施工方法與步驟」區塊中<span class="hint-strong">同一筆主要工序</span>；請在上方維護工序名稱與順序，修改後此處顯示的工序名稱會一併更新。
                    </p>
                    <div
                      v-if="hasStagePlanProcessesForEssentials && !hasExpandedStageEssentialsWithProcesses"
                      class="alert alert-secondary py-2 px-3 small mb-3 mb-md-2"
                      role="status"
                    >
                      <i class="fa fa-circle-info me-2" aria-hidden="true"></i>
                      目前「施工要領」內所有施工階段皆為收合，請點階段列展開，或使用工具列「全部展開」。
                    </div>
                    <div class="stage-plan-accordion">
                      <template v-for="(stage, stageIdx) in constructionStagePlanRows" :key="`${stage.id}-ess-unified`">
                        <div v-if="stage.processes.length > 0" class="stage-plan-accordion__item">
                          <div
                            class="stage-plan-accordion__header"
                            :class="{ 'is-collapsed': !isStageEssentialsExpanded(stage.id) }"
                            @click="onStageEssentialsHeaderClick($event, stage.id)"
                          >
                            <button
                              type="button"
                              class="stage-plan-accordion__toggle btn btn-link p-0 text-decoration-none"
                              :aria-expanded="isStageEssentialsExpanded(stage.id)"
                              aria-label="收合或展開此階段之施工要領"
                              @click.stop="toggleStageEssentialsExpanded(stage.id)"
                            >
                              <i
                                class="fa fa-fw"
                                :class="isStageEssentialsExpanded(stage.id) ? 'fa-chevron-down' : 'fa-chevron-right'"
                              ></i>
                            </button>
                            <div class="stage-plan-accordion__title">
                              <span class="stage-plan-accordion__label">施工階段</span>
                              <span class="stage-plan-essentials-stage-name">{{
                                stage.name || `階段${stageIdx + 1}`
                              }}</span>
                            </div>
                            <div class="stage-plan-accordion__actions" aria-hidden="true"></div>
                          </div>
                          <div v-show="isStageEssentialsExpanded(stage.id)" class="stage-plan-accordion__body">
                            <div
                              v-for="(proc, procIdx) in stage.processes"
                              :key="`${proc.id}-essentials-unified`"
                              class="stage-plan-essentials__block mb-3"
                            >
                              <label class="form-label small mb-1 d-flex flex-wrap align-items-baseline gap-2">
                                <span class="text-nowrap text-muted">工序 {{ procIdx + 1 }}</span>
                                <span class="text-break fw-semibold">{{ proc.name || `工序${procIdx + 1}` }}</span>
                              </label>
                              <textarea
                                v-model="proc.constructionEssentials"
                                class="form-control form-control-sm stage-plan-essentials__textarea"
                                rows="4"
                                placeholder="請描述本工序之施工要領（方法、檢查重點、注意事項等）…"
                                @input="debouncedSaveCustomFields"
                              />
                            </div>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="hasStagePlanProcessesForEssentials" class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-clipboard-check me-2 text-warning"></i>
                    施工抽查標準
                  </div>
                </div>
                <div class="text-panel__body">
                  <p class="text-muted small mb-2">
                    <span class="fw-semibold">施工階段</span>與<span class="fw-semibold">主要工序</span>與上方「施工方法與步驟」一致，請於上方調整工序；本區僅維護各工序下之管理項目與抽查明細。
                  </p>
                  <InspectionStandardsPhasesTable
                    class="mb-0"
                    :phases="pInspectionItemData.phases"
                    :interactive="true"
                    :lock-flow-structure="true"
                    :show-ai-generate-button="true"
                    :ai-generating="aiLoadingPInspectionStandards"
                    ai-generate-button-label="依本計畫書工程案資料建構"
                    ai-generate-button-title="依本計畫書名稱與目前施工方法與步驟，由工程案資料建構產出施工抽查標準明細並覆寫現有內容"
                    :show-hierarchy-search="false"
                    second-level-header-label="主要工序"
                    :hide-add-mgmt-item="true"
                    :hide-remove-row-button="true"
                    :empty-text="pInspectionEmptyText"
                    :persistence-key="pInspectionCollapsePersistenceKey"
                    @edit-field="onPInspectionEditField"
                    @ai-generate-from-db="generatePInspectionStandardsByAi"
                  />
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-truck-pickup me-2 text-warning"></i>
                    第四章 機具與材料
                  </div>
                  <div class="text-panel__toolbar">
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="aiLoadingChapter4 || !currentProject?.id"
                      @click="generateChapter4ByAi"
                    >
                      <i class="fa me-2" :class="aiLoadingChapter4 ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                      {{ aiLoadingChapter4 ? '生成中…' : '依本計畫書工程案資料建構兩表' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <div class="text-panel__header chapter4-subheader">
                    <div class="text-panel__label text-panel__label--sub">
                      <i class="fa fa-screwdriver-wrench me-2 text-warning"></i>
                      施工機具
                    </div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn btn-sm btn-outline-light" @click="addChapter4EquipmentRow">
                        <i class="fa fa-plus me-1"></i>新增機具列
                      </button>
                    </div>
                  </div>
                  <div class="table-responsive mb-4">
                    <table class="table table-sm table-bordered custom-duty-table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>機具名稱</th>
                          <th>機具用途</th>
                          <th>運送方式</th>
                          <th class="text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="chapter4EquipmentRows.length === 0">
                          <td colspan="4" class="text-center text-muted py-3">尚無資料，請新增或使用上方工程案資料建構。</td>
                        </tr>
                        <tr v-for="(row, idx) in chapter4EquipmentRows" :key="row.id || `eq-${idx}`">
                          <td><input v-model="row.equipmentName" class="form-control form-control-sm" @input="debouncedSaveCustomFields" /></td>
                          <td><input v-model="row.purpose" class="form-control form-control-sm" @input="debouncedSaveCustomFields" /></td>
                          <td><input v-model="row.transportMethod" class="form-control form-control-sm" @input="debouncedSaveCustomFields" /></td>
                          <td class="text-center">
                            <button type="button" class="btn btn-sm btn-outline-danger" @click="removeChapter4EquipmentRow(idx)">
                              <i class="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="text-panel__header chapter4-subheader">
                    <div class="text-panel__label text-panel__label--sub">
                      <i class="fa fa-boxes-stacked me-2 text-warning"></i>
                      使用材料
                    </div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn btn-sm btn-outline-light" @click="addChapter4MaterialRow">
                        <i class="fa fa-plus me-1"></i>新增材料列
                      </button>
                    </div>
                  </div>
                  <div class="table-responsive chapter4-mat-table-wrap">
                    <table class="table table-sm table-bordered custom-duty-table align-middle mb-0 chapter4-mat-table">
                      <colgroup>
                        <col class="chapter4-mat-col chapter4-mat-col--itemno" />
                        <col class="chapter4-mat-col chapter4-mat-col--namespec" />
                        <col class="chapter4-mat-col chapter4-mat-col--unit" />
                        <col class="chapter4-mat-col chapter4-mat-col--qty" />
                        <col class="chapter4-mat-col chapter4-mat-col--storage" />
                        <col class="chapter4-mat-col chapter4-mat-col--remark" />
                        <col class="chapter4-mat-col chapter4-mat-col--actions" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th scope="col">項次</th>
                          <th scope="col">品名及規格</th>
                          <th scope="col">單位</th>
                          <th scope="col">數量</th>
                          <th scope="col">儲放位置</th>
                          <th scope="col">備註</th>
                          <th scope="col" class="text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="chapter4MaterialRows.length === 0">
                          <td colspan="7" class="text-center text-muted py-3">尚無資料，請新增或使用上方工程案資料建構。</td>
                        </tr>
                        <tr v-for="(row, idx) in chapter4MaterialRows" :key="row.id || `mat-${idx}`">
                          <td class="chapter4-mat-cell chapter4-mat-cell--itemno-display text-center text-muted small">
                            {{ idx + 1 }}
                          </td>
                          <td class="chapter4-mat-cell">
                            <textarea
                              v-model="row.nameSpec"
                              class="form-control form-control-sm custom-duty-multiline chapter4-mat-namespec"
                              rows="2"
                              @input="debouncedSaveCustomFields"
                            />
                          </td>
                          <td class="chapter4-mat-cell">
                            <input v-model="row.unit" class="form-control form-control-sm" @input="debouncedSaveCustomFields" />
                          </td>
                          <td class="chapter4-mat-cell">
                            <input
                              v-model="row.quantity"
                              class="form-control form-control-sm"
                              placeholder="自行填寫"
                              @input="debouncedSaveCustomFields"
                            />
                          </td>
                          <td class="chapter4-mat-cell">
                            <input v-model="row.storageLocation" class="form-control form-control-sm" @input="debouncedSaveCustomFields" />
                          </td>
                          <td class="chapter4-mat-cell">
                            <input v-model="row.remark" class="form-control form-control-sm" @input="debouncedSaveCustomFields" />
                          </td>
                          <td class="text-center chapter4-mat-cell chapter4-mat-cell--actions">
                            <button type="button" class="btn btn-sm btn-outline-danger" @click="removeChapter4MaterialRow(idx)">
                              <i class="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-users-gear me-2 text-warning"></i>
                    人員職掌說明
                  </div>
                  <div class="text-panel__toolbar">
                    <button type="button" class="btn btn-sm btn-outline-info" @click="prefillPersonnelDutiesFromSitePersonnel">
                      <i class="fa fa-rotate me-1"></i>帶入工地人員
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-light ms-2" @click="addPersonnelDutyRow">
                      <i class="fa fa-plus me-1"></i>新增列
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <div class="table-responsive">
                    <table class="table table-sm table-bordered custom-duty-table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>姓名</th>
                          <th>職稱</th>
                          <th>工作內容</th>
                          <th>聯絡電話</th>
                          <th>備註</th>
                          <th class="text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="personnelDutyRows.length === 0">
                          <td colspan="6" class="text-center text-muted py-3">尚未設定，請新增或帶入工地人員。</td>
                        </tr>
                        <tr v-for="(row, idx) in personnelDutyRows" :key="`duty-${idx}`">
                          <td><input v-model="row.name" class="form-control form-control-sm" @input="debouncedSaveCustomFields" /></td>
                          <td>
                            <textarea
                              v-model="row.title"
                              class="form-control form-control-sm custom-duty-multiline"
                              rows="2"
                              placeholder="可輸入較長職稱"
                              @input="debouncedSaveCustomFields"
                            />
                          </td>
                          <td>
                            <textarea
                              v-model="row.workContent"
                              class="form-control form-control-sm custom-duty-multiline"
                              rows="2"
                              placeholder="可輸入較長工作內容"
                              @input="debouncedSaveCustomFields"
                            />
                          </td>
                          <td><input v-model="row.phone" class="form-control form-control-sm" @input="debouncedSaveCustomFields" /></td>
                          <td><input v-model="row.remark" class="form-control form-control-sm" @input="debouncedSaveCustomFields" /></td>
                          <td class="text-center">
                            <button type="button" class="btn btn-sm btn-outline-danger" @click="removePersonnelDutyRow(idx)">
                              <i class="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-sitemap me-2 text-warning"></i>
                    分項工程組織表
                  </div>
                  <div class="text-panel__toolbar">
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="aiLoadingSubdivisionOrg || !currentProject?.id"
                      @click="generateSubdivisionOrgByAi"
                    >
                      <i class="fa me-2" :class="aiLoadingSubdivisionOrg ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                      {{ aiLoadingSubdivisionOrg ? '生成中…' : '依標單工程案資料建構' }}
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-light ms-2" @click="addSubdivisionOrgRow">
                      <i class="fa fa-plus me-1"></i>新增列
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <div class="table-responsive">
                    <table class="table table-sm table-bordered custom-duty-table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>組織名稱</th>
                          <th>工作內容</th>
                          <th>是否常駐</th>
                          <th>備註</th>
                          <th class="text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="subdivisionOrgRows.length === 0">
                          <td colspan="5" class="text-center text-muted py-3">尚無資料，請新增或使用工程案資料建構。</td>
                        </tr>
                        <tr v-for="(row, idx) in subdivisionOrgRows" :key="`org-${idx}`">
                          <td>
                            <textarea
                              v-model="row.groupName"
                              class="form-control form-control-sm custom-duty-multiline"
                              rows="2"
                              @input="debouncedSaveCustomFields"
                            />
                          </td>
                          <td>
                            <textarea
                              v-model="row.workContent"
                              class="form-control form-control-sm custom-duty-multiline"
                              rows="2"
                              @input="debouncedSaveCustomFields"
                            />
                          </td>
                          <td><input v-model="row.isSResident" class="form-control form-control-sm" @input="debouncedSaveCustomFields" /></td>
                          <td><input v-model="row.remark" class="form-control form-control-sm" @input="debouncedSaveCustomFields" /></td>
                          <td class="text-center">
                            <button type="button" class="btn btn-sm btn-outline-danger" @click="removeSubdivisionOrgRow(idx)">
                              <i class="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-diagram-project me-2 text-warning"></i>
                    施工人員組織圖
                  </div>
                </div>
                <div class="text-panel__body p1-flow-chart-body">
                  <div v-if="organizationChartJson" class="organization-chart-preview">
                    <P1ConstructionProcessFlowSyncfusionView
                      ref="organizationChartPreviewRef"
                      :flow-json="organizationChartJson"
                      display-mode="organization"
                    />
                  </div>
                  <div v-else class="text-muted small py-3 text-center">
                    請先維護上方分項工程組織表，組織圖會依其內容自動產生。
                  </div>
                  <p class="small text-muted mb-0 mt-2">
                    此圖會依據「分項工程組織表」內容自動更新，不需另外設定。
                  </p>
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-shield-alt me-2 text-warning"></i>
                    安全衛生執行要點
                  </div>
                  <div class="text-panel__toolbar">
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="aiLoadingSafetyHealthExecution || !currentProject?.id || docId == null"
                      @click="generateSafetyHealthExecutionByAi"
                    >
                      <i
                        class="fa me-2"
                        :class="aiLoadingSafetyHealthExecution ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                      ></i>
                      {{ aiLoadingSafetyHealthExecution ? '生成中…' : '依計畫與工序工程案資料建構' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <textarea
                    v-model="safetyHealthExecutionDraft"
                    class="form-control text-panel__textarea text-panel__textarea--long text-panel__textarea--pre-wrap"
                    rows="14"
                    placeholder="請輸入安全衛生執行要點，或使用工程案資料建構（含換行與縮排）"
                    @input="debouncedSaveCustomFields"
                  />
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-leaf me-2 text-warning"></i>
                    環境保護注意事項
                  </div>
                  <div class="text-panel__toolbar">
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="aiLoadingEnvironmentProtectionNotes || !currentProject?.id || docId == null"
                      @click="generateEnvironmentProtectionNotesByAi"
                    >
                      <i
                        class="fa me-2"
                        :class="aiLoadingEnvironmentProtectionNotes ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                      ></i>
                      {{ aiLoadingEnvironmentProtectionNotes ? '生成中…' : '依計畫與工序工程案資料建構' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <textarea
                    v-model="environmentProtectionDraft"
                    class="form-control text-panel__textarea text-panel__textarea--long text-panel__textarea--pre-wrap"
                    rows="14"
                    placeholder="請輸入環境保護注意事項，或使用工程案資料建構（含換行與縮排）"
                    @input="debouncedSaveCustomFields"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>

    <Modal
      :show="showStagePlanEditModal"
      :title="stagePlanEditModalTitle"
      icon="fa fa-pen-to-square"
      size="lg"
      @update:show="showStagePlanEditModal = $event"
      confirmText="保存"
      cancelText="取消"
      @confirm="confirmStagePlanEditModal"
    >
      <template #body>
        <div class="mb-0">
          <label class="form-label">{{ stagePlanEditFieldLabel }}</label>
          <textarea
            v-model="stagePlanEditModalValue"
            class="form-control"
            rows="8"
            :placeholder="`請輸入${stagePlanEditFieldLabel}`"
          />
        </div>
      </template>
    </Modal>

    <Modal
      :show="showPInspectionEditModal"
      :title="pInspectionEditModalTitle"
      icon="fa fa-edit"
      size="lg"
      @update:show="showPInspectionEditModal = $event"
      confirmText="保存"
      cancelText="取消"
      @confirm="confirmPInspectionEditModal"
    >
      <template #body>
        <div v-if="pInspectionEditingField === '不合格之處理'">
          <label class="form-label">不合格之處理</label>
          <textarea v-model="pInspectionEditValue.current" class="form-control" rows="5"></textarea>
        </div>
        <div v-else-if="pInspectionEditingField === '施工檢查點'">
          <label class="form-label">{{ pInspectionEditingField }}</label>
          <select v-model="pInspectionEditValue.current" class="form-select">
            <option value="">(無)</option>
            <option value="★">★</option>
            <option value="※">※</option>
            <option value="★※">★※</option>
          </select>
        </div>
        <div v-else>
          <label class="form-label">{{ pInspectionEditingField }}</label>
          <textarea v-model="pInspectionEditValue.current" class="form-control" rows="5"></textarea>
        </div>
      </template>
    </Modal>

    <Modal
      :show="showStagePlanFlowChartModal"
      title="施工流程圖"
      icon="fa fa-sitemap"
      size="xl"
      modal-class="guide-flow-modal"
      :hide-footer="true"
      :hide-confirm-button="true"
      :elevate-z-index="true"
      @update:show="onStagePlanFlowChartModalShow"
    >
      <template #body>
        <p class="text-muted small mb-3 mb-md-2">
          與監造「施工項目」抽查標準內之施工流程圖相同演算法（蛇形四欄、起迄「施工準備」「完成」）；節點僅依
          <span class="fw-semibold">主要工序</span>順序（依階段與工序的排序欄位），不含施工階段名稱。請先儲存本頁後再預覽。
        </p>
        <div v-if="stagePlanFlowChartLoading" class="text-center py-5 text-muted">
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          載入流程圖中…
        </div>
        <div
          v-else-if="stagePlanFlowChartObjectUrl"
          class="text-center bg-white rounded p-2 inspection-standards-flowchart-img-wrap"
        >
          <img
            :src="stagePlanFlowChartObjectUrl"
            alt="施工流程圖"
            class="img-fluid inspection-standards-flowchart-img"
          />
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { debounce } from 'lodash'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import PlanSubmissionPModal from '@/components/forms/PlanSubmissionPModal.vue'
import ConstructionLocationMapThumb from '@/components/common/ConstructionLocationMapThumb.vue'
import P1ConstructionProcessFlowSyncfusionView from '@/components/p1/P1ConstructionProcessFlowSyncfusionView.vue'
import InspectionStandardsPhasesTable from '@/components/inspection/InspectionStandardsPhasesTable.vue'
import {
  P_DYNAMIC_SCHEDULED_PROGRESS_TYPE,
  deleteConstructionLocationMap,
  listConstructionLocationMaps,
  uploadConstructionLocationMaps,
  type ConstructionLocationMapImageInfo
} from '@/api/constructionLocationMaps'
import { contractorDocumentClassificationApi, type ContractorDocumentClassification } from '@/api/contractorDocumentClassification'
import {
  getP1TextAiGenerate,
  getP1ManpowerFromSubdivisionsAiGenerate,
  getPDynamicChapter4EquipmentMaterialsAiGenerate,
  postPDynamicSafetyHealthExecutionPointsAiGenerate,
  postPDynamicEnvironmentProtectionNotesAiGenerate,
  getPDynamicConstructionStagePlanAiGenerate,
  postPDynamicConstructionStagePlanEssentialsAiGenerate,
  postPDynamicConstructionInspectionStandardsAiGenerate
} from '@/api/construction'
import { sitePersonnelApi } from '@/api/sitePersonnel'
import { getOccupationDisplayLabel, getOccupationOptions } from '@/api/sitePersonnelOccupations'
import { formPApi, downloadBlobAsFile, type ExportConstructionReportRequest } from '@/api/forms'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
import { useExportLoading } from '@/composables/useExportLoading'
import { useWorkspaceStore } from '@/stores/workspace'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { buildMergedInspectionPhasesForTab } from '@/utils/buildInspectionPhasesFromLines'
import {
  parsePInspectionConstructionLinesJson,
  reconcilePInspectionConstructionLines,
  serializePInspectionConstructionLinesJson,
  getInspectionRowByMgmtSub,
  type PDynamicInspectionConstructionLine
} from '@/utils/pDynamicInspectionStandardsSync'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const companyStore = useCompanyStore()
const authStore = useAuthStore()
const { isContractor, isSuperAdmin } = useViewPerspective()
const { runWithExportLoading } = useExportLoading()

const currentProject = computed(() => workspaceStore.currentProject)
const hasCurrentProject = computed(() => !!currentProject.value?.id)
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')

const loading = ref(false)
const targetRow = ref<ContractorDocumentClassification | null>(null)
const dataReferenceDate = ref('')
const scaleOverviewDraft = ref('')
const safetyHealthExecutionDraft = ref('')
const environmentProtectionDraft = ref('')
type PersonnelDutyRow = { name: string; title: string; workContent: string; phone: string; remark: string }
const personnelDutyRows = ref<PersonnelDutyRow[]>([])
type SubdivisionOrgRow = { groupName: string; workContent: string; isSResident: string; remark: string }
const subdivisionOrgRows = ref<SubdivisionOrgRow[]>([])
type StageProcessRow = {
  id: string
  name: string
  order: number
  interfaceHandling: string
  sequenceArrangement: string
  safetyHealth: string
  environmentProtection: string
  otherManagement: string
  /** 本主要工序之施工要領 */
  constructionEssentials: string
}
type StagePlanRow = { id: string; name: string; order: number; processes: StageProcessRow[] }
const constructionStagePlanRows = ref<StagePlanRow[]>([])
type Chapter4EquipmentRow = { id: string; equipmentName: string; purpose: string; transportMethod: string }
type Chapter4MaterialRow = {
  id: string
  /** 項次由列序自動產生，不儲存於列資料 */
  nameSpec: string
  unit: string
  quantity: string
  storageLocation: string
  remark: string
}
const chapter4EquipmentRows = ref<Chapter4EquipmentRow[]>([])
const chapter4MaterialRows = ref<Chapter4MaterialRow[]>([])
/** 與「施工方法與步驟」同步之施工抽查標準平面列（存於 customPConstructionInspectionStandardsJson） */
const pInspectionConstructionLines = ref<PDynamicInspectionConstructionLine[]>([])
const stageExpandState = ref<Record<string, boolean>>({})
/** 「主要工序之施工要領」區塊內，各施工階段是否展開（與上方表格表頭收合分開） */
const stageEssentialsExpandState = ref<Record<string, boolean>>({})
type StagePlanEditableField =
  | 'stageName'
  | 'processName'
  | 'interfaceHandling'
  | 'sequenceArrangement'
  | 'safetyHealth'
  | 'environmentProtection'
  | 'otherManagement'
const showStagePlanEditModal = ref(false)
const stagePlanEditModalTitle = ref('編輯')
const stagePlanEditFieldLabel = ref('內容')
const stagePlanEditModalValue = ref('')
const stagePlanEditTarget = ref<{ stageIndex: number; processIndex: number | null; field: StagePlanEditableField } | null>(null)
const organizationChartPreviewRef = ref<{ exportPngBlob?: () => Promise<Blob | null> } | null>(null)
const isAiGenerating = ref(false)
/** 一鍵工程案資料建構的階段（用於按鈕文字顯示「階段 X/2」進度） */
const batchAiPhase = ref<'idle' | 'stage1' | 'stage2'>('idle')
const aiLoadingScale = ref(false)
const aiLoadingSubdivisionOrg = ref(false)
const aiLoadingStagePlan = ref(false)
const aiLoadingStageEssentials = ref(false)
const aiLoadingPInspectionStandards = ref(false)
const showStagePlanFlowChartModal = ref(false)
const stagePlanFlowChartObjectUrl = ref('')
const stagePlanFlowChartLoading = ref(false)
const aiLoadingChapter4 = ref(false)
const aiLoadingSafetyHealthExecution = ref(false)
const aiLoadingEnvironmentProtectionNotes = ref(false)
const scheduledProgressImages = ref<ConstructionLocationMapImageInfo[]>([])
const pendingScheduledProgressFiles = ref<File[]>([])
const scheduledProgressChartUploading = ref(false)
const deletingScheduledImageId = ref<number | null>(null)
const isExporting = ref(false)
const isPrefillingPersonnelRows = ref(false)

const docId = computed(() => {
  const raw = route.query.docId
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = Number(s)
  return Number.isFinite(n) ? n : null
})

const designChangeIdFromRoute = computed(() => {
  const raw = route.query.designChangeId
  if (raw == null || raw === '') return null
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = Number(s)
  return Number.isFinite(n) ? n : null
})

const pageTitle = computed(() => targetRow.value?.documentName || 'P類動態表單')

/** 送審紀錄：由分類表項次推導計劃書類型（例如 itemNumber "04" → P4）；預設列或無法解析時不顯示按鈕 */
const showSubmissionModal = ref(false)
const dynamicPlanType = computed(() => {
  const row = targetRow.value
  if (!row || row.isDefault) return ''
  const n = parseInt(String(row.itemNumber ?? '').trim(), 10)
  if (!Number.isFinite(n) || n <= 0 || n > 99) return ''
  return `P${n}`
})

/** 一鍵工程案資料建構按鈕的顯示文字（依目前批次階段顯示進度） */
const batchAiButtonLabel = computed(() => {
  if (batchAiPhase.value === 'stage1') return '生成中… 階段 1/2（基礎結構）'
  if (batchAiPhase.value === 'stage2') return '生成中… 階段 2/2（依工序內容）'
  if (isAiGenerating.value) return '生成中…'
  return '一鍵工程案資料建構'
})

/** 至少一筆「主要工序」有名称，才允許開啟流程圖（比照施工要領頁） */
const hasStagePlanFlowProcesses = computed(() =>
  constructionStagePlanRows.value.some((stage) =>
    (stage.processes || []).some((p) => String(p.name || '').trim().length > 0)
  )
)

/** 至少一個階段有工序列，才顯示「施工要領」統一編輯區（與上方「施工方法與步驟」分開） */
const hasStagePlanProcessesForEssentials = computed(() =>
  constructionStagePlanRows.value.some((stage) => (stage.processes || []).length > 0)
)

/** 「施工要領」區內至少有一個已展開且含工序的階段 */
const hasExpandedStageEssentialsWithProcesses = computed(() => {
  const state = stageEssentialsExpandState.value
  return constructionStagePlanRows.value.some(
    (stage) => (state[stage.id] ?? true) && (stage.processes || []).length > 0
  )
})

const pInspectionItemData = computed(() =>
  buildMergedInspectionPhasesForTab(pInspectionConstructionLines.value, [], 'construction')
)

const pInspectionCollapsePersistenceKey = computed(() => {
  const cid = constructionId.value
  const did = docId.value
  const d = designChangeIdFromRoute.value
  if (!cid || did == null) return ''
  return `${cid}:p-dynamic-inspection:${did}:${d === null ? 'null' : String(d)}`
})

const pInspectionEmptyText = computed(
  () => '尚無明細；請先於上方「施工方法與步驟」建立主要工序，再於各工序下新增管理項目與檢查點。'
)

/** 載入分類列時略過一次與施工計畫同步之 reconcile，避免與手動初始化重複觸發存檔 */
const skipPInspectionPlanSyncOnce = ref(false)

const stagePlanStructureSignature = computed(() =>
  JSON.stringify(
    constructionStagePlanRows.value.map((s) => ({
      id: s.id,
      n: (s.name || '').trim(),
      p: (s.processes || []).map((pr) => ({
        id: pr.id,
        n: (pr.name || '').trim()
      }))
    }))
  )
)

const showPInspectionEditModal = ref(false)
const pInspectionEditModalTitle = ref('')
const pInspectionEditingField = ref('')
const pInspectionEditTarget = ref<{
  rowId: number
  phaseKey: string
  flowIdx: number
  mgmtIdx: number
  subIdx: number
} | null>(null)
const pInspectionEditValue = ref<{ current?: string }>({})

watch(showPInspectionEditModal, (v) => {
  if (!v) {
    pInspectionEditTarget.value = null
    pInspectionEditValue.value = {}
  }
})

function revokeStagePlanFlowChartUrl() {
  if (stagePlanFlowChartObjectUrl.value) {
    URL.revokeObjectURL(stagePlanFlowChartObjectUrl.value)
    stagePlanFlowChartObjectUrl.value = ''
  }
}

function closeStagePlanFlowChartModal() {
  showStagePlanFlowChartModal.value = false
  revokeStagePlanFlowChartUrl()
}

function onStagePlanFlowChartModalShow(v: boolean) {
  if (!v) closeStagePlanFlowChartModal()
}

async function openStagePlanFlowChartModal() {
  if (!constructionId.value || docId.value == null || !hasStagePlanFlowProcesses.value) return
  stagePlanFlowChartLoading.value = true
  revokeStagePlanFlowChartUrl()
  showStagePlanFlowChartModal.value = true
  try {
    const blob = await contractorDocumentClassificationApi.fetchConstructionStagePlanFlowChartPng(
      constructionId.value,
      docId.value,
      designChangeIdFromRoute.value
    )
    stagePlanFlowChartObjectUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    console.error(e)
    window.alert('無法載入施工流程圖，請確認已儲存主要工序後再試')
    closeStagePlanFlowChartModal()
  } finally {
    stagePlanFlowChartLoading.value = false
  }
}

const breadcrumbs = computed(() => [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: 'P類(計劃書)表單', href: 'javascript:;' },
  { text: pageTitle.value, active: true }
])

function onVersionChange(versionId: number | null) {
  const q: Record<string, string> = {}
  for (const [k, v] of Object.entries(route.query)) {
    if (k === 'designChangeId') continue
    if (v == null) continue
    q[k] = Array.isArray(v) ? String(v[0]) : String(v)
  }
  if (docId.value != null) q.docId = String(docId.value)
  if (versionId != null) q.designChangeId = String(versionId)
  void router.replace({ path: route.path, query: q })
}

async function loadRow() {
  if (!constructionId.value || docId.value == null) {
    targetRow.value = null
    return
  }
  loading.value = true
  try {
    const allRows = await contractorDocumentClassificationApi.getAll(
      constructionId.value,
      designChangeIdFromRoute.value
    )
    targetRow.value = allRows.find((row) => row.id === docId.value && row.category === 'P') ?? null
  } catch (error) {
    console.error(error)
    targetRow.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => targetRow.value,
  async (row) => {
    if (row && !row.isDefault) {
      scaleOverviewDraft.value = row.customPScaleOverview ?? ''
      safetyHealthExecutionDraft.value = row.customPSafetyHealthExecutionPoints ?? ''
      environmentProtectionDraft.value = row.customPEnvironmentProtectionNotes ?? ''
      personnelDutyRows.value = parsePersonnelDutiesJson(row.customPPersonnelDutiesJson)
      subdivisionOrgRows.value = parseSubdivisionOrgJson(row.customPSubdivisionOrganizationJson)
      skipPInspectionPlanSyncOnce.value = true
      constructionStagePlanRows.value = parseConstructionStagePlanJson(row.customPConstructionStagePlanJson)
      pInspectionConstructionLines.value = reconcilePInspectionConstructionLines(
        constructionStagePlanRows.value,
        parsePInspectionConstructionLinesJson(row.customPConstructionInspectionStandardsJson)
      )
      void nextTick(() => {
        skipPInspectionPlanSyncOnce.value = false
      })
      const ch4 = parseChapter4EquipmentMaterialsJson(row.customPChapter4EquipmentMaterialsJson)
      chapter4EquipmentRows.value = ch4.equipmentRows
      chapter4MaterialRows.value = ch4.materialRows
      if (personnelDutyRows.value.length === 0) {
        await prefillPersonnelDutiesFromSitePersonnel()
      }
    } else {
      scaleOverviewDraft.value = ''
      safetyHealthExecutionDraft.value = ''
      environmentProtectionDraft.value = ''
      personnelDutyRows.value = []
      subdivisionOrgRows.value = []
      constructionStagePlanRows.value = []
      pInspectionConstructionLines.value = []
      chapter4EquipmentRows.value = []
      chapter4MaterialRows.value = []
    }
    pendingScheduledProgressFiles.value = []
    if (row && constructionId.value && docId.value != null) {
      await loadScheduledProgressImages()
    } else {
      scheduledProgressImages.value = []
    }
  },
  { immediate: true }
)

watch(
  () => constructionStagePlanRows.value.map((s) => s.id),
  (ids) => {
    const nextExpand: Record<string, boolean> = {}
    const nextEss: Record<string, boolean> = {}
    for (const id of ids) {
      nextExpand[id] = stageExpandState.value[id] ?? true
      nextEss[id] = stageEssentialsExpandState.value[id] ?? true
    }
    stageExpandState.value = nextExpand
    stageEssentialsExpandState.value = nextEss
  },
  { immediate: true }
)

watch(stagePlanStructureSignature, () => {
  const row = targetRow.value
  if (!row || row.isDefault) return
  if (skipPInspectionPlanSyncOnce.value) return
  pInspectionConstructionLines.value = reconcilePInspectionConstructionLines(
    constructionStagePlanRows.value,
    pInspectionConstructionLines.value
  )
  debouncedSaveCustomFields()
})

function isStageExpanded(stageId: string): boolean {
  return stageExpandState.value[stageId] ?? true
}

function toggleStageExpanded(stageId: string) {
  stageExpandState.value[stageId] = !isStageExpanded(stageId)
}

function isStageEssentialsExpanded(stageId: string): boolean {
  return stageEssentialsExpandState.value[stageId] ?? true
}

function toggleStageEssentialsExpanded(stageId: string) {
  stageEssentialsExpandState.value[stageId] = !isStageEssentialsExpanded(stageId)
}

function onStageEssentialsHeaderClick(ev: MouseEvent, stageId: string) {
  const t = ev.target as HTMLElement | null
  if (!t?.closest) return
  if (t.closest('button')) return
  toggleStageEssentialsExpanded(stageId)
}

function onStageAccordionHeaderClick(ev: MouseEvent, stageId: string) {
  const t = ev.target as HTMLElement | null
  if (!t?.closest) return
  if (t.closest('button')) return
  toggleStageExpanded(stageId)
}

function expandAllStagePlanStages() {
  const next: Record<string, boolean> = { ...stageExpandState.value }
  const nextEss: Record<string, boolean> = { ...stageEssentialsExpandState.value }
  for (const s of constructionStagePlanRows.value) {
    next[s.id] = true
    nextEss[s.id] = true
  }
  stageExpandState.value = next
  stageEssentialsExpandState.value = nextEss
}

function collapseAllStagePlanStages() {
  const next: Record<string, boolean> = { ...stageExpandState.value }
  const nextEss: Record<string, boolean> = { ...stageEssentialsExpandState.value }
  for (const s of constructionStagePlanRows.value) {
    next[s.id] = false
    nextEss[s.id] = false
  }
  stageExpandState.value = next
  stageEssentialsExpandState.value = nextEss
}

function pInspectionLineKeyForFieldName(
  fieldName: string
):
  | 'manageProject'
  | 'checkPoint'
  | 'checkStandard'
  | 'checkTiming'
  | 'checkFeq'
  | 'checkMethod'
  | 'failureHandle'
  | null {
  switch (fieldName) {
    case '管理項目':
      return 'manageProject'
    case '施工檢查點':
      return 'checkPoint'
    case '抽查標準':
      return 'checkStandard'
    case '抽查時機':
      return 'checkTiming'
    case '抽查頻率':
      return 'checkFeq'
    case '抽查方法':
      return 'checkMethod'
    case '不合格之處理':
      return 'failureHandle'
    default:
      return null
  }
}

/** 表格列（抽查頻率欄為 checkFrequency）→ 讀取用屬性名 */
function pInspectionDisplayKeyForFieldName(fieldName: string): string | null {
  const k = pInspectionLineKeyForFieldName(fieldName)
  if (!k) return null
  return k === 'checkFeq' ? 'checkFrequency' : k
}

function onPInspectionEditField(
  phaseKey: string,
  flowIdx: number,
  mgmtIdx: number,
  subIdx: number,
  fieldName: string
) {
  const subItem = getInspectionRowByMgmtSub(
    pInspectionItemData.value.phases,
    phaseKey,
    flowIdx,
    mgmtIdx,
    subIdx
  )
  if (!subItem) {
    window.alert('無法編輯：找不到對應的明細列')
    return
  }
  const rid = subItem.id
  if (rid == null || !Number.isFinite(Number(rid))) {
    window.alert('無法編輯：明細列缺少編號')
    return
  }
  pInspectionEditingField.value = fieldName
  pInspectionEditModalTitle.value = `編輯 ${fieldName}`
  pInspectionEditTarget.value = {
    rowId: Number(rid),
    phaseKey,
    flowIdx,
    mgmtIdx,
    subIdx
  }
  const dk = pInspectionDisplayKeyForFieldName(fieldName)
  if (!dk) return
  const cur = (subItem as unknown as Record<string, unknown>)[dk]
  pInspectionEditValue.value = { current: cur == null ? '' : String(cur) }
  showPInspectionEditModal.value = true
}

async function confirmPInspectionEditModal() {
  const t = pInspectionEditTarget.value
  if (!t) return
  const key = pInspectionLineKeyForFieldName(pInspectionEditingField.value)
  if (!key) {
    showPInspectionEditModal.value = false
    return
  }
  const v = (pInspectionEditValue.value.current ?? '').trim()
  const line = pInspectionConstructionLines.value.find((l) => l.id === t.rowId)
  if (!line) {
    showPInspectionEditModal.value = false
    return
  }
  switch (key) {
    case 'manageProject':
      line.manageProject = v
      break
    case 'checkPoint':
      line.checkPoint = v
      break
    case 'checkStandard':
      line.checkStandard = v
      break
    case 'checkTiming':
      line.checkTiming = v
      break
    case 'checkFeq':
      line.checkFeq = v
      break
    case 'checkMethod':
      line.checkMethod = v
      break
    case 'failureHandle':
      line.failureHandle = v
      break
  }
  showPInspectionEditModal.value = false
  await saveCustomFields()
}

function stagePlanFieldLabel(field: StagePlanEditableField): string {
  switch (field) {
    case 'stageName':
      return '施工階段'
    case 'processName':
      return '主要工序'
    case 'interfaceHandling':
      return '介面銜接處理方式'
    case 'sequenceArrangement':
      return '工序順序安排處理方式'
    case 'safetyHealth':
      return '勞工安全衛生事項'
    case 'environmentProtection':
      return '環境保護措施'
    case 'otherManagement':
      return '其他施工管理重點'
    default:
      return '內容'
  }
}

function openStagePlanEditModal(
  stageIndex: number,
  processIndex: number | null,
  field: StagePlanEditableField
) {
  const stage = constructionStagePlanRows.value[stageIndex]
  if (!stage) return
  const process = processIndex == null ? null : stage.processes[processIndex]
  if (processIndex != null && !process) return

  let value = ''
  switch (field) {
    case 'stageName':
      value = stage.name ?? ''
      break
    case 'processName':
      value = process?.name ?? ''
      break
    case 'interfaceHandling':
      value = process?.interfaceHandling ?? ''
      break
    case 'sequenceArrangement':
      value = process?.sequenceArrangement ?? ''
      break
    case 'safetyHealth':
      value = process?.safetyHealth ?? ''
      break
    case 'environmentProtection':
      value = process?.environmentProtection ?? ''
      break
    case 'otherManagement':
      value = process?.otherManagement ?? ''
      break
  }
  stagePlanEditTarget.value = { stageIndex, processIndex, field }
  stagePlanEditFieldLabel.value = stagePlanFieldLabel(field)
  stagePlanEditModalTitle.value = `編輯${stagePlanEditFieldLabel.value}`
  stagePlanEditModalValue.value = value
  showStagePlanEditModal.value = true
}

async function confirmStagePlanEditModal() {
  const target = stagePlanEditTarget.value
  if (!target) return
  const stage = constructionStagePlanRows.value[target.stageIndex]
  if (!stage) return
  const process = target.processIndex == null ? null : stage.processes[target.processIndex]
  const value = stagePlanEditModalValue.value

  switch (target.field) {
    case 'stageName':
      stage.name = value
      break
    case 'processName':
      if (process) process.name = value
      break
    case 'interfaceHandling':
      if (process) process.interfaceHandling = value
      break
    case 'sequenceArrangement':
      if (process) process.sequenceArrangement = value
      break
    case 'safetyHealth':
      if (process) process.safetyHealth = value
      break
    case 'environmentProtection':
      if (process) process.environmentProtection = value
      break
    case 'otherManagement':
      if (process) process.otherManagement = value
      break
  }
  showStagePlanEditModal.value = false
  await saveCustomFields()
}

function parsePersonnelDutiesJson(raw: string | null | undefined): PersonnelDutyRow[] {
  const source = raw?.trim()
  if (!source) return []
  try {
    const parsed = JSON.parse(source)
    if (!Array.isArray(parsed)) return []
    return parsed.map((it: any) => ({
      name: String(it?.name ?? ''),
      title: String(it?.title ?? ''),
      workContent: String(it?.workContent ?? ''),
      phone: String(it?.phone ?? ''),
      remark: String(it?.remark ?? '')
    }))
  } catch {
    return []
  }
}

function serializePersonnelDutiesJson(rows: PersonnelDutyRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      name: r.name.trim(),
      title: r.title.trim(),
      workContent: r.workContent.trim(),
      phone: r.phone.trim(),
      remark: r.remark.trim()
    }))
  )
}

function parseSubdivisionOrgJson(raw: string | null | undefined): SubdivisionOrgRow[] {
  const source = raw?.trim()
  if (!source) return []
  try {
    const parsed = JSON.parse(source)
    if (!Array.isArray(parsed)) return []
    return parsed.map((it: any) => ({
      groupName: String(it?.groupName ?? ''),
      workContent: String(it?.workContent ?? ''),
      isSResident: String(it?.isSResident ?? ''),
      remark: String(it?.remark ?? '')
    }))
  } catch {
    return []
  }
}

function serializeSubdivisionOrgJson(rows: SubdivisionOrgRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      groupName: r.groupName.trim(),
      workContent: r.workContent.trim(),
      isSResident: r.isSResident.trim(),
      remark: r.remark.trim()
    }))
  )
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function parseConstructionStagePlanJson(raw: string | null | undefined): StagePlanRow[] {
  const source = raw?.trim()
  if (!source) return []
  try {
    const parsed = JSON.parse(source)
    const stages = Array.isArray(parsed?.stages) ? parsed.stages : []
    return stages.map((s: any, stageIdx: number) => ({
      id: String(s?.id || uid('stage')),
      name: String(s?.name || '').trim() || `階段${stageIdx + 1}`,
      order: Number.isFinite(Number(s?.order)) ? Number(s.order) : stageIdx + 1,
      processes: (Array.isArray(s?.processes) ? s.processes : []).map((p: any, procIdx: number) => ({
        id: String(p?.id || uid('proc')),
        name: String(p?.name || '').trim() || `工序${procIdx + 1}`,
        order: Number.isFinite(Number(p?.order)) ? Number(p.order) : procIdx + 1,
        interfaceHandling: String(p?.interfaceHandling || ''),
        sequenceArrangement: String(p?.sequenceArrangement || ''),
        safetyHealth: String(p?.safetyHealth || ''),
        environmentProtection: String(p?.environmentProtection || ''),
        otherManagement: String(p?.otherManagement || ''),
        constructionEssentials: String(p?.constructionEssentials || '')
      }))
    }))
  } catch {
    return []
  }
}

function serializeConstructionStagePlanJson(rows: StagePlanRow[]): string {
  return JSON.stringify({
    stages: rows.map((s, stageIdx) => ({
      id: s.id || uid('stage'),
      name: s.name.trim(),
      order: stageIdx + 1,
      processes: s.processes.map((p, procIdx) => ({
        id: p.id || uid('proc'),
        name: p.name.trim(),
        order: procIdx + 1,
        interfaceHandling: p.interfaceHandling.trim(),
        sequenceArrangement: p.sequenceArrangement.trim(),
        safetyHealth: p.safetyHealth.trim(),
        environmentProtection: p.environmentProtection.trim(),
        otherManagement: p.otherManagement.trim(),
        constructionEssentials: p.constructionEssentials.trim()
      }))
    }))
  })
}

function parseChapter4EquipmentMaterialsJson(raw: string | null | undefined): {
  equipmentRows: Chapter4EquipmentRow[]
  materialRows: Chapter4MaterialRow[]
} {
  const source = raw?.trim()
  if (!source) return { equipmentRows: [], materialRows: [] }
  try {
    const parsed = JSON.parse(source)
    const equipmentArr = Array.isArray(parsed?.equipmentRows) ? parsed.equipmentRows : []
    const materialArr = Array.isArray(parsed?.materialRows) ? parsed.materialRows : []
    return {
      equipmentRows: equipmentArr.map((it: any, i: number) => ({
        id: String(it?.id || '').trim() || uid(`eq-${i}`),
        equipmentName: String(it?.equipmentName ?? ''),
        purpose: String(it?.purpose ?? ''),
        transportMethod: String(it?.transportMethod ?? '')
      })),
      materialRows: materialArr.map((it: any, i: number) => ({
        id: String(it?.id || '').trim() || uid(`mat-${i}`),
        nameSpec: String(it?.nameSpec ?? ''),
        unit: String(it?.unit ?? ''),
        quantity: String(it?.quantity ?? ''),
        storageLocation: String(it?.storageLocation ?? ''),
        remark: String(it?.remark ?? '')
      }))
    }
  } catch {
    return { equipmentRows: [], materialRows: [] }
  }
}

function serializeChapter4EquipmentMaterialsJson(
  equipment: Chapter4EquipmentRow[],
  materials: Chapter4MaterialRow[]
): string {
  return JSON.stringify({
    equipmentRows: equipment.map((r) => ({
      id: r.id.trim() || uid('eq'),
      equipmentName: r.equipmentName.trim(),
      purpose: r.purpose.trim(),
      transportMethod: r.transportMethod.trim()
    })),
    materialRows: materials.map((r, i) => ({
      id: r.id.trim() || uid('mat'),
      itemNo: String(i + 1),
      nameSpec: r.nameSpec.trim(),
      unit: r.unit.trim(),
      quantity: r.quantity.trim(),
      storageLocation: r.storageLocation.trim(),
      remark: r.remark.trim()
    }))
  })
}

function defaultWorkContentByTitle(title: string): string {
  const t = title.trim()
  if (!t) return ''
  if (t.includes('工地主任')) return '綜理工地一切事宜及工安環保業務'
  if (t.includes('施工組長')) return '施工計畫書編訂及工程執行監督'
  if (t.includes('主任') || t.includes('副主任')) return '執行工程進度及品質督導'
  if (t.includes('技師')) return '執行安全衛生督導及工安環保業務'
  if (t.includes('品管')) return '工程品質掌控及材料檢試驗'
  if (
    t.includes('勞安') ||
    t.includes('職安') ||
    t.includes('安全衛生') ||
    t.includes('安全管理') ||
    t.includes('衛生管理')
  ) return '執行工地安全衛生管理及查核'
  if (t.includes('負責人')) return '綜理工地一切事宜及工安環保業務'

  const patterns: Array<{ keys: string[]; text: string }> = [
    { keys: ['測量', '放樣'], text: `負責${t}之測量放樣、控制點檢核與成果紀錄提報` },
    { keys: ['土方', '開挖', '回填'], text: `負責${t}之開挖回填規劃、土方調度與施工品質管控` },
    { keys: ['模板', '支撐'], text: `負責${t}之模板支撐配置、組拆作業管理與檢查作業` },
    { keys: ['鋼筋'], text: `負責${t}之加工綁紮安排、材料進場查驗與自主檢查` },
    { keys: ['混凝土', '灌漿'], text: `負責${t}之澆置計畫安排、試體取樣送驗與養護管理` },
    { keys: ['機電', '電氣', '管線'], text: `負責${t}之機電管線整合、界面協調與安裝品質查核` },
    { keys: ['排水', '污水', '給水'], text: `負責${t}之管線佈設、坡度檢核與通水測試安排` },
    { keys: ['道路', '瀝青', '鋪面'], text: `負責${t}之鋪面施工安排、平整度檢核與養護管理` },
    { keys: ['景觀', '植栽'], text: `負責${t}之工項排程、材料苗木查驗與現場品質維護` },
    { keys: ['品管', '品質'], text: `負責${t}之品質文件管理、查驗程序執行與缺失追蹤改善` },
    { keys: ['勞安', '職安', '安全衛生'], text: `負責${t}之危害辨識、巡檢教育訓練與缺失改善追蹤` }
  ]

  for (const p of patterns) {
    if (p.keys.some((k) => t.includes(k))) return p.text
  }

  // 匹配不到時才用通用句型，避免每列完全一致。
  return `負責${t}之施工協調、進度管控、品質查核與職安管理`
}

function normalizeDutyTitle(p: any): string {
  const occupation = String(p?.occupation || p?.position || '').trim()
  const occupationCategory = String(p?.occupationCategory || '').trim()
  if (!occupation && !occupationCategory) return ''
  const options = getOccupationOptions('CONTRACTOR')
  const label = getOccupationDisplayLabel(occupation, occupationCategory, options)
  if (label && label !== '未設定') return label
  return occupationCategory || occupation
}

function getCurrentCompanyId(): string | null {
  const desiredType = isContractor.value ? 'CONTRACTOR' : 'SUPERVISION'
  const authCompanyId = authStore.user?.companyId?.trim()
  if (authCompanyId) {
    const c = companyStore.getCompanyById(authCompanyId) as any
    if (c && c.companyType === desiredType) return authCompanyId
  }
  const match = companyStore.activeCompanies.find((c: any) => c.companyType === desiredType)
  if (match?.companyId) return match.companyId
  const wsCompanyId = workspaceStore.currentWorkspace?.companyId?.trim()
  if (wsCompanyId) return wsCompanyId
  return companyStore.activeCompanies[0]?.companyId ?? null
}

function toDutyRowFromSitePersonnel(p: any): PersonnelDutyRow {
  const title = normalizeDutyTitle(p)
  return {
    name: String(p?.fullName || p?.name || '').trim(),
    title,
    workContent: defaultWorkContentByTitle(title),
    phone: String(p?.phone || '').trim(),
    remark: ''
  }
}

async function prefillPersonnelDutiesFromSitePersonnel() {
  const cid = constructionId.value
  const row = targetRow.value
  if (!cid || !row || row.isDefault || isPrefillingPersonnelRows.value) return
  const companyId = getCurrentCompanyId()
  if (!companyId) return

  isPrefillingPersonnelRows.value = true
  try {
    const list = await sitePersonnelApi.getList(companyId, { effectiveViewType: 'CONTRACTOR' })
    const today = new Date().toISOString().slice(0, 10)
    const projectPersonnel = list.filter((p: any) => {
      const assignments = Array.isArray(p?.assignments) ? p.assignments : []
      return assignments.some((a: any) => {
        if (a?.constructionId !== cid) return false
        const startOk = !a?.workStartDate || a.workStartDate <= today
        const endOk = !a?.workEndDate || a.workEndDate >= today
        return startOk && endOk
      }) || p?.constructionId === cid
    })
    if (projectPersonnel.length === 0) return
    personnelDutyRows.value = projectPersonnel.map(toDutyRowFromSitePersonnel)
    await saveCustomFields()
  } catch (e) {
    console.error(e)
  } finally {
    isPrefillingPersonnelRows.value = false
  }
}

async function saveCustomFields() {
  const row = targetRow.value
  const cid = constructionId.value
  if (!row || row.isDefault || !cid) return
  try {
    const updated = await contractorDocumentClassificationApi.update(cid, row.id, designChangeIdFromRoute.value, {
      customPScaleOverview: scaleOverviewDraft.value,
      customPSafetyHealthExecutionPoints: safetyHealthExecutionDraft.value,
      customPEnvironmentProtectionNotes: environmentProtectionDraft.value,
      customPOrganizationChartJson: organizationChartJson.value,
      customPPersonnelDutiesJson: serializePersonnelDutiesJson(personnelDutyRows.value),
      customPSubdivisionOrganizationJson: serializeSubdivisionOrgJson(subdivisionOrgRows.value),
      customPConstructionStagePlanJson: serializeConstructionStagePlanJson(constructionStagePlanRows.value),
      customPChapter4EquipmentMaterialsJson: serializeChapter4EquipmentMaterialsJson(
        chapter4EquipmentRows.value,
        chapter4MaterialRows.value
      ),
      customPConstructionInspectionStandardsJson: serializePInspectionConstructionLinesJson(
        pInspectionConstructionLines.value
      )
    })
    if (targetRow.value) {
      Object.assign(targetRow.value, updated)
    }
  } catch (e) {
    console.error(e)
  }
}

const debouncedSaveCustomFields = debounce(async () => {
  await saveCustomFields()
}, 600)

function addPersonnelDutyRow() {
  personnelDutyRows.value.push({ name: '', title: '', workContent: '', phone: '', remark: '' })
  debouncedSaveCustomFields()
}

function removePersonnelDutyRow(index: number) {
  personnelDutyRows.value.splice(index, 1)
  debouncedSaveCustomFields()
}

function addSubdivisionOrgRow() {
  subdivisionOrgRows.value.push({ groupName: '', workContent: '', isSResident: '', remark: '' })
  debouncedSaveCustomFields()
}

function removeSubdivisionOrgRow(index: number) {
  subdivisionOrgRows.value.splice(index, 1)
  debouncedSaveCustomFields()
}

function addStagePlanStage() {
  constructionStagePlanRows.value.push({
    id: uid('stage'),
    name: `新階段${constructionStagePlanRows.value.length + 1}`,
    order: constructionStagePlanRows.value.length + 1,
    processes: []
  })
  debouncedSaveCustomFields()
}

function removeStagePlanStage(stageIndex: number) {
  constructionStagePlanRows.value.splice(stageIndex, 1)
  debouncedSaveCustomFields()
}

function addStageProcess(stageIndex: number) {
  const stage = constructionStagePlanRows.value[stageIndex]
  if (!stage) return
  stage.processes.push({
    id: uid('proc'),
    name: `工序${stage.processes.length + 1}`,
    order: stage.processes.length + 1,
    interfaceHandling: '',
    sequenceArrangement: '',
    safetyHealth: '',
    environmentProtection: '',
    otherManagement: '',
    constructionEssentials: ''
  })
  debouncedSaveCustomFields()
}

function removeStageProcess(stageIndex: number, processIndex: number) {
  const stage = constructionStagePlanRows.value[stageIndex]
  if (!stage) return
  stage.processes.splice(processIndex, 1)
  debouncedSaveCustomFields()
}

function addChapter4EquipmentRow() {
  chapter4EquipmentRows.value.push({
    id: uid('eq'),
    equipmentName: '',
    purpose: '',
    transportMethod: ''
  })
  debouncedSaveCustomFields()
}

function removeChapter4EquipmentRow(index: number) {
  chapter4EquipmentRows.value.splice(index, 1)
  debouncedSaveCustomFields()
}

function addChapter4MaterialRow() {
  chapter4MaterialRows.value.push({
    id: uid('mat'),
    nameSpec: '',
    unit: '',
    quantity: '',
    storageLocation: '',
    remark: ''
  })
  debouncedSaveCustomFields()
}

function removeChapter4MaterialRow(index: number) {
  chapter4MaterialRows.value.splice(index, 1)
  debouncedSaveCustomFields()
}

async function loadScheduledProgressImages() {
  const cid = constructionId.value
  const did = docId.value
  scheduledProgressImages.value = []
  if (!cid || did == null) return
  try {
    scheduledProgressImages.value = await listConstructionLocationMaps(
      cid,
      P_DYNAMIC_SCHEDULED_PROGRESS_TYPE,
      designChangeIdFromRoute.value,
      did
    )
  } catch (e) {
    console.warn('load scheduled progress images', e)
  }
}

function onPickScheduledProgressFiles(ev: Event) {
  const input = ev.target as HTMLInputElement
  const list = input.files ? Array.from(input.files) : []
  input.value = ''
  const okTypes = ['image/png', 'image/jpeg', 'image/jpg']
  const filtered = list.filter((f) => okTypes.includes(f.type))
  if (filtered.length < list.length) {
    window.alert('僅支援 PNG、JPEG 圖檔')
  }
  if (filtered.length === 0) return
  pendingScheduledProgressFiles.value = [...pendingScheduledProgressFiles.value, ...filtered]
}

async function uploadPendingScheduledProgress() {
  const cid = constructionId.value
  const did = docId.value
  const pending = pendingScheduledProgressFiles.value
  if (!cid || did == null || pending.length === 0) return
  scheduledProgressChartUploading.value = true
  try {
    await uploadConstructionLocationMaps(
      cid,
      pending,
      P_DYNAMIC_SCHEDULED_PROGRESS_TYPE,
      designChangeIdFromRoute.value,
      did
    )
    pendingScheduledProgressFiles.value = []
    await loadScheduledProgressImages()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '上傳失敗'
    window.alert(msg)
  } finally {
    scheduledProgressChartUploading.value = false
  }
}

async function removeScheduledProgressImage(imageId: number) {
  const cid = constructionId.value
  const did = docId.value
  if (!cid || did == null) return
  if (!window.confirm('確定刪除此張預定作業進度圖？')) return
  deletingScheduledImageId.value = imageId
  try {
    await deleteConstructionLocationMap(
      cid,
      imageId,
      P_DYNAMIC_SCHEDULED_PROGRESS_TYPE,
      designChangeIdFromRoute.value,
      did
    )
    await loadScheduledProgressImages()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '刪除失敗'
    window.alert(msg)
  } finally {
    deletingScheduledImageId.value = null
  }
}

async function generateChapter4ByAi() {
  const cid = constructionId.value
  const did = docId.value
  if (!cid || did == null) return
  const prevQty = chapter4MaterialRows.value.map((r) => String(r.quantity ?? '').trim())
  aiLoadingChapter4.value = true
  try {
    const res = await getPDynamicChapter4EquipmentMaterialsAiGenerate(cid, did, designChangeIdFromRoute.value)
    const parsed = parseChapter4EquipmentMaterialsJson(res?.chapter4Json)
    chapter4EquipmentRows.value = parsed.equipmentRows
    chapter4MaterialRows.value = parsed.materialRows.map((row, i) => ({
      ...row,
      quantity: prevQty[i] ?? ''
    }))
    await saveCustomFields()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoadingChapter4.value = false
  }
}

async function generateSafetyHealthExecutionByAi() {
  const cid = constructionId.value
  const did = docId.value
  if (!cid || did == null) return
  aiLoadingSafetyHealthExecution.value = true
  try {
    const planJson = serializeConstructionStagePlanJson(constructionStagePlanRows.value)
    const res = await postPDynamicSafetyHealthExecutionPointsAiGenerate(
      cid,
      did,
      designChangeIdFromRoute.value,
      planJson
    )
    safetyHealthExecutionDraft.value = res?.text ?? ''
    debouncedSaveCustomFields.cancel()
    await saveCustomFields()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoadingSafetyHealthExecution.value = false
  }
}

async function generateEnvironmentProtectionNotesByAi() {
  const cid = constructionId.value
  const did = docId.value
  if (!cid || did == null) return
  aiLoadingEnvironmentProtectionNotes.value = true
  try {
    const planJson = serializeConstructionStagePlanJson(constructionStagePlanRows.value)
    const res = await postPDynamicEnvironmentProtectionNotesAiGenerate(
      cid,
      did,
      designChangeIdFromRoute.value,
      planJson
    )
    environmentProtectionDraft.value = res?.text ?? ''
    debouncedSaveCustomFields.cancel()
    await saveCustomFields()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoadingEnvironmentProtectionNotes.value = false
  }
}

async function generateConstructionStagePlanByAi() {
  const cid = constructionId.value
  const did = docId.value
  if (!cid || did == null) return
  aiLoadingStagePlan.value = true
  try {
    const res = await getPDynamicConstructionStagePlanAiGenerate(
      cid,
      did,
      designChangeIdFromRoute.value
    )
    const rows = parseConstructionStagePlanJson(res?.planJson)
    constructionStagePlanRows.value = rows
    await saveCustomFields()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoadingStagePlan.value = false
  }
}

async function generateConstructionEssentialsByAi() {
  const cid = constructionId.value
  const did = docId.value
  if (!cid || did == null || !hasStagePlanProcessesForEssentials.value) return
  aiLoadingStageEssentials.value = true
  try {
    const planJson = serializeConstructionStagePlanJson(constructionStagePlanRows.value)
    const res = await postPDynamicConstructionStagePlanEssentialsAiGenerate(
      cid,
      did,
      designChangeIdFromRoute.value,
      planJson
    )
    const updates = Array.isArray(res?.updates) ? res.updates : []
    for (const u of updates as { stageId?: string; processId?: string; constructionEssentials?: string }[]) {
      const sid = String(u?.stageId || '').trim()
      const pid = String(u?.processId || '').trim()
      const ess = String(u?.constructionEssentials || '').trim()
      if (!sid || !pid) continue
      const stage = constructionStagePlanRows.value.find((s) => s.id === sid)
      const proc = stage?.processes.find((p) => p.id === pid)
      if (proc) proc.constructionEssentials = ess
    }
    await saveCustomFields()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoadingStageEssentials.value = false
  }
}

async function generatePInspectionStandardsByAi() {
  const cid = constructionId.value
  const did = docId.value
  if (!cid || did == null || !hasStagePlanProcessesForEssentials.value) return
  if (
    !window.confirm(
      '將依本計畫書與目前「施工方法與步驟」由工程案資料建構產出並覆寫「施工抽查標準」明細，確定執行？'
    )
  ) {
    return
  }
  aiLoadingPInspectionStandards.value = true
  try {
    const planJson = serializeConstructionStagePlanJson(constructionStagePlanRows.value)
    const res = await postPDynamicConstructionInspectionStandardsAiGenerate(
      cid,
      did,
      designChangeIdFromRoute.value,
      planJson
    )
    const rawLines = Array.isArray(res?.lines) ? res.lines : []
    const parsed = parsePInspectionConstructionLinesJson(JSON.stringify(rawLines))
    pInspectionConstructionLines.value = reconcilePInspectionConstructionLines(
      constructionStagePlanRows.value,
      parsed
    )
    await saveCustomFields()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoadingPInspectionStandards.value = false
  }
}

async function generateSubdivisionOrgByAi() {
  const cid = constructionId.value
  if (!cid) return
  aiLoadingSubdivisionOrg.value = true
  try {
    const res = await getP1ManpowerFromSubdivisionsAiGenerate(cid, designChangeIdFromRoute.value)
    const rows = Array.isArray(res?.rows) ? res.rows : []
    subdivisionOrgRows.value = rows.map((r) => {
      const groupName = String(r?.groupName || r?.resourceName || '').trim()
      return {
        groupName,
        // 不在前端套模板，直接使用 建構回傳欄位；若 API 尚未提供則保持空字串。
        workContent: String((r as any)?.workContent || '').trim(),
        isSResident: String((r as any)?.isSResident || '').trim(),
        remark: String((r as any)?.remark || '').trim()
      }
    })
    await saveCustomFields()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoadingSubdivisionOrg.value = false
  }
}

type OrgChartGraphNode = { id: string; label: string; kind: 'process' | 'start' }
type OrgChartGraphEdge = { from: string; to: string; label?: string }

function getCurrentCompanyName(): string {
  const cid = getCurrentCompanyId()
  const company = cid ? (companyStore.getCompanyById(cid) as any) : null
  return String(company?.companyName || company?.name || '').trim()
}

function collectOrgSubdivisionNames(rows: SubdivisionOrgRow[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of rows) {
    const name = String(row.groupName || '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    result.push(name)
  }
  return result
}

function buildOrganizationChartJson(rows: SubdivisionOrgRow[]): string {
  const companyName = getCurrentCompanyName() || '承攬廠商'
  const groupNames = collectOrgSubdivisionNames(rows)
  const nodes: OrgChartGraphNode[] = [
    { id: 'company', label: companyName, kind: 'start' },
    { id: 'advisor', label: '專任工程人員', kind: 'process' },
    { id: 'manager', label: '工地主任', kind: 'process' },
    { id: 'safety', label: '安衛管理員', kind: 'process' },
    { id: 'engineer', label: '施工組長', kind: 'process' },
    { id: 'quality', label: '品管人員', kind: 'process' }
  ]
  const edges: OrgChartGraphEdge[] = [
    { from: 'company', to: 'advisor' },
    { from: 'company', to: 'manager' },
    { from: 'manager', to: 'safety' },
    { from: 'manager', to: 'engineer' },
    { from: 'manager', to: 'quality' }
  ]
  groupNames.forEach((groupName, index) => {
    const id = `group_${index + 1}`
    nodes.push({ id, label: groupName, kind: 'process' })
    edges.push({ from: 'engineer', to: id })
  })
  return JSON.stringify({ type: 'graph', nodes, edges })
}
const organizationChartJson = computed(() => {
  const rows = subdivisionOrgRows.value.filter((row) => String(row.groupName || '').trim())
  if (rows.length === 0) return ''
  return buildOrganizationChartJson(rows)
})

async function exportWord() {
  const cid = constructionId.value
  const row = targetRow.value
  const did = docId.value
  if (!cid) {
    window.alert('請先選擇工程案')
    return
  }
  if (row == null || row.isDefault || did == null) {
    window.alert('僅自訂 P 類分類項目可匯出此表')
    return
  }
  let chartImageObjectName = ''
  try {
    if (organizationChartJson.value.trim()) {
      const chartBlob = await organizationChartPreviewRef.value?.exportPngBlob?.()
      if (chartBlob) {
        const uploaded = await contractorDocumentClassificationApi.uploadOrganizationChartImage(
          cid,
          did,
          designChangeIdFromRoute.value,
          chartBlob
        )
        chartImageObjectName = String(uploaded?.objectName || '').trim()
        if (chartImageObjectName && targetRow.value) {
          targetRow.value.customPOrganizationChartImageObjectName = chartImageObjectName
        }
      }
    }
  } catch (e) {
    console.warn('upload custom P organization chart image failed', e)
  }
  if (!chartImageObjectName) {
    chartImageObjectName = organizationChartJson.value.trim()
      ? String(targetRow.value?.customPOrganizationChartImageObjectName || '').trim()
      : ''
  }

  const reportData: ExportConstructionReportRequest['valueMap']['reportData'] = {
    constructionId: cid,
    designChangeId: designChangeIdFromRoute.value,
    documentClassificationId: did,
    // 與本頁「工程規模概述」一致（含尚未 debounce 存檔之內容）
    customPScaleOverview: scaleOverviewDraft.value,
    customPSafetyHealthExecutionPoints: safetyHealthExecutionDraft.value,
    customPEnvironmentProtectionNotes: environmentProtectionDraft.value,
    customPOrganizationChartJson: organizationChartJson.value,
    customPOrganizationChartImageObjectName: chartImageObjectName,
    customPPersonnelDutiesJson: serializePersonnelDutiesJson(personnelDutyRows.value),
    customPSubdivisionOrganizationJson: serializeSubdivisionOrgJson(subdivisionOrgRows.value),
    customPConstructionStagePlanJson: serializeConstructionStagePlanJson(constructionStagePlanRows.value),
    customPConstructionInspectionStandardsJson: serializePInspectionConstructionLinesJson(
      pInspectionConstructionLines.value
    ),
    customPChapter4EquipmentMaterialsJson: serializeChapter4EquipmentMaterialsJson(
      chapter4EquipmentRows.value,
      chapter4MaterialRows.value
    )
  }
  if (dataReferenceDate.value) {
    reportData.dataReferenceDate = dataReferenceDate.value
  }
  const request: ExportConstructionReportRequest = { valueMap: { reportData } }
  isExporting.value = true
  try {
    const taskId = `p-dynamic-export-${cid}-${did}-${Date.now()}`
    const res = await runWithExportLoading(taskId, row.documentName || 'P類自訂計畫', (signal) =>
      formPApi.exportPDynamicCustomPlan(request, { signal })
    )
    const safeName = (row.documentName || 'P類自訂計畫').replace(/[\\/:*?"<>|]/g, '_')
    const fileName = extractFileNameFromResponse(res) || `${safeName}_${Date.now()}.docx`
    downloadBlobAsFile(res.data, fileName)
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '匯出失敗'
    window.alert(msg)
  } finally {
    isExporting.value = false
  }
}

async function generateScaleOverviewByAi() {
  const cid = constructionId.value
  if (!cid) return
  isAiGenerating.value = true
  aiLoadingScale.value = true
  try {
    const { text } = await getP1TextAiGenerate(cid, designChangeIdFromRoute.value)
    scaleOverviewDraft.value = text ?? ''
    debouncedSaveCustomFields.cancel()
    const row = targetRow.value
    if (row && !row.isDefault) {
      const updated = await contractorDocumentClassificationApi.update(cid, row.id, designChangeIdFromRoute.value, {
        customPScaleOverview: scaleOverviewDraft.value,
        customPSafetyHealthExecutionPoints: safetyHealthExecutionDraft.value,
        customPEnvironmentProtectionNotes: environmentProtectionDraft.value,
        customPOrganizationChartJson: organizationChartJson.value,
        customPPersonnelDutiesJson: serializePersonnelDutiesJson(personnelDutyRows.value),
        customPSubdivisionOrganizationJson: serializeSubdivisionOrgJson(subdivisionOrgRows.value),
        customPConstructionStagePlanJson: serializeConstructionStagePlanJson(constructionStagePlanRows.value),
        customPChapter4EquipmentMaterialsJson: serializeChapter4EquipmentMaterialsJson(
          chapter4EquipmentRows.value,
          chapter4MaterialRows.value
        )
      })
      if (targetRow.value) {
        Object.assign(targetRow.value, updated)
      }
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoadingScale.value = false
    isAiGenerating.value = false
  }
}

/**
 * 一鍵工程案資料建構（P 類動態頁）
 *
 * 設計目標
 * - P 類動態頁面的多數欄位都依賴「主要工序（施工方法與步驟）」，因此必須分兩階段：
 *   階段 1 先產生主要工序結構（與其他結構性資料），階段 2 再依工序內容生成下游欄位。
 * - 階段內並行（互不依賴），階段之間串行；
 *   全部完成後一次 `saveCustomFields()` 落地，避免多次 PUT 整份 record 造成 race condition。
 * - 整段流程由 `isAiGenerating` 維持 true，個別欄位的 `aiLoading.*` 同步點亮，
 *   使既有單欄按鈕在批次過程中保持 disabled 並顯示 spinner，視覺與單獨生成一致。
 *
 * 階段 1（基礎結構，並行）
 *   1. 工程規模概述（依標單）
 *   2. 分項施工組織（依分項工程）
 *   3. 主要工序結構（依標單／分項 → 直接覆寫整份 stagePlan）
 *
 * 階段 2（依工序內容，並行；若階段 1 後仍無有效主要工序則整體略過）
 *   4. 主要工序之施工要領（依目前 stagePlan）
 *   5. 施工抽查標準（依目前 stagePlan；批次模式略過原本的 confirm）
 *   6. 機具設備與材料兩表（依標單）
 *   7. 安衛執行要點（依目前 stagePlan）
 *   8. 環保注意事項（依目前 stagePlan）
 */
async function generateAllPDynamicByAi() {
  const cid = constructionId.value
  const did = docId.value
  if (!cid || did == null) return
  const row = targetRow.value
  if (!row || row.isDefault) return
  if (isAiGenerating.value) return

  if (
    !window.confirm(
      '一鍵工程案資料建構將分兩階段執行：\n\n'
        + '【階段 1】基礎結構（並行）\n'
        + '  1. 工程規模概述\n'
        + '  2. 分項施工組織\n'
        + '  3. 主要工序結構（施工方法與步驟）\n\n'
        + '【階段 2】依工序內容生成（並行；需階段 1 已產出主要工序）\n'
        + '  4. 主要工序之施工要領\n'
        + '  5. 施工抽查標準（將覆寫既有明細）\n'
        + '  6. 機具設備與材料兩表\n'
        + '  7. 安衛執行要點\n'
        + '  8. 環保注意事項\n\n'
        + '本次將覆寫上述欄位內容，確定執行？',
    )
  ) {
    return
  }

  debouncedSaveCustomFields.cancel()
  isAiGenerating.value = true
  batchAiPhase.value = 'stage1'

  type BatchResult = { ok: boolean; reason?: string }
  type BatchTask = {
    label: string
    setLoading: (v: boolean) => void
    run: () => Promise<BatchResult>
  }

  const failed: string[] = []
  let hadAny = false

  async function runStage(tasks: BatchTask[]): Promise<void> {
    tasks.forEach((t) => t.setLoading(true))
    const results = await Promise.allSettled(
      tasks.map((t) => t.run().finally(() => t.setLoading(false))),
    )
    results.forEach((r, idx) => {
      const t = tasks[idx]
      if (r.status === 'fulfilled') {
        const value: BatchResult = r.value
        if (value.ok) {
          hadAny = true
        } else {
          failed.push(`${t.label}（${value.reason ?? '未產出內容'}）`)
        }
      } else {
        const e: any = r.reason
        const msg =
          e?.response?.data?.error
          ?? e?.response?.data?.message
          ?? e?.response?.data?.detail
          ?? e?.message
          ?? '生成失敗'
        failed.push(`${t.label}（${msg}）`)
      }
    })
  }

  try {
    const stage1: BatchTask[] = [
      {
        label: '工程規模概述',
        setLoading: (v) => (aiLoadingScale.value = v),
        run: async () => {
          const { text } = await getP1TextAiGenerate(cid, designChangeIdFromRoute.value)
          const t = (text ?? '').trim()
          if (!t) return { ok: false, reason: '無內容（請先匯入標單）' }
          scaleOverviewDraft.value = t
          return { ok: true }
        },
      },
      {
        label: '分項施工組織',
        setLoading: (v) => (aiLoadingSubdivisionOrg.value = v),
        run: async () => {
          const res = await getP1ManpowerFromSubdivisionsAiGenerate(cid, designChangeIdFromRoute.value)
          const rows = Array.isArray(res?.rows) ? res.rows : []
          if (rows.length === 0) return { ok: false, reason: '尚無分項工程資料' }
          subdivisionOrgRows.value = rows.map((r) => ({
            groupName: String(r?.groupName || r?.resourceName || '').trim(),
            workContent: String((r as any)?.workContent || '').trim(),
            isSResident: String((r as any)?.isSResident || '').trim(),
            remark: String((r as any)?.remark || '').trim(),
          }))
          return { ok: true }
        },
      },
      {
        label: '主要工序結構',
        setLoading: (v) => (aiLoadingStagePlan.value = v),
        run: async () => {
          const res = await getPDynamicConstructionStagePlanAiGenerate(
            cid,
            did,
            designChangeIdFromRoute.value,
          )
          const rowsP = parseConstructionStagePlanJson(res?.planJson)
          if (rowsP.length === 0) return { ok: false, reason: '工程案資料建構未產出工序內容' }
          constructionStagePlanRows.value = rowsP
          return { ok: true }
        },
      },
    ]

    await runStage(stage1)

    if (!hasStagePlanProcessesForEssentials.value) {
      failed.push('階段 2 已略過（階段 1 後仍無有效主要工序，依工序的欄位無法生成）')
    } else {
      batchAiPhase.value = 'stage2'
      // 在階段 2 開始前固定一份 planJson 快照，避免並行任務間互相干擾；
      // 「施工要領」會修改 rows 內部欄位，但本快照已序列化，後端輸入不受影響。
      const planJson = serializeConstructionStagePlanJson(constructionStagePlanRows.value)

      const stage2: BatchTask[] = [
        {
          label: '主要工序之施工要領',
          setLoading: (v) => (aiLoadingStageEssentials.value = v),
          run: async () => {
            const res = await postPDynamicConstructionStagePlanEssentialsAiGenerate(
              cid,
              did,
              designChangeIdFromRoute.value,
              planJson,
            )
            const updates = Array.isArray(res?.updates) ? res.updates : []
            if (updates.length === 0) return { ok: false, reason: '工程案資料建構未產出更新' }
            let applied = 0
            for (const u of updates as {
              stageId?: string
              processId?: string
              constructionEssentials?: string
            }[]) {
              const sid = String(u?.stageId || '').trim()
              const pid = String(u?.processId || '').trim()
              const ess = String(u?.constructionEssentials || '').trim()
              if (!sid || !pid) continue
              const stage = constructionStagePlanRows.value.find((s) => s.id === sid)
              const proc = stage?.processes.find((p) => p.id === pid)
              if (proc) {
                proc.constructionEssentials = ess
                applied += 1
              }
            }
            if (applied === 0) return { ok: false, reason: '建構回傳結果無法對應到目前工序' }
            return { ok: true }
          },
        },
        {
          label: '施工抽查標準',
          setLoading: (v) => (aiLoadingPInspectionStandards.value = v),
          run: async () => {
            const res = await postPDynamicConstructionInspectionStandardsAiGenerate(
              cid,
              did,
              designChangeIdFromRoute.value,
              planJson,
            )
            const rawLines = Array.isArray(res?.lines) ? res.lines : []
            const parsed = parsePInspectionConstructionLinesJson(JSON.stringify(rawLines))
            const reconciled = reconcilePInspectionConstructionLines(
              constructionStagePlanRows.value,
              parsed,
            )
            pInspectionConstructionLines.value = reconciled
            return { ok: true }
          },
        },
        {
          label: '機具設備與材料兩表',
          setLoading: (v) => (aiLoadingChapter4.value = v),
          run: async () => {
            const prevQty = chapter4MaterialRows.value.map((r) => String(r.quantity ?? '').trim())
            const res = await getPDynamicChapter4EquipmentMaterialsAiGenerate(
              cid,
              did,
              designChangeIdFromRoute.value,
            )
            const parsed = parseChapter4EquipmentMaterialsJson(res?.chapter4Json)
            chapter4EquipmentRows.value = parsed.equipmentRows
            chapter4MaterialRows.value = parsed.materialRows.map((rw, i) => ({
              ...rw,
              quantity: prevQty[i] ?? '',
            }))
            return { ok: true }
          },
        },
        {
          label: '安衛執行要點',
          setLoading: (v) => (aiLoadingSafetyHealthExecution.value = v),
          run: async () => {
            const res = await postPDynamicSafetyHealthExecutionPointsAiGenerate(
              cid,
              did,
              designChangeIdFromRoute.value,
              planJson,
            )
            const t = (res?.text ?? '').trim()
            if (!t) return { ok: false, reason: '工程案資料建構未產出內容' }
            safetyHealthExecutionDraft.value = t
            return { ok: true }
          },
        },
        {
          label: '環保注意事項',
          setLoading: (v) => (aiLoadingEnvironmentProtectionNotes.value = v),
          run: async () => {
            const res = await postPDynamicEnvironmentProtectionNotesAiGenerate(
              cid,
              did,
              designChangeIdFromRoute.value,
              planJson,
            )
            const t = (res?.text ?? '').trim()
            if (!t) return { ok: false, reason: '工程案資料建構未產出內容' }
            environmentProtectionDraft.value = t
            return { ok: true }
          },
        },
      ]

      await runStage(stage2)
    }

    if (hadAny) {
      await saveCustomFields()
    }

    if (failed.length > 0 && typeof window.alert === 'function') {
      window.alert(
        '一鍵工程案資料建構已完成，下列項目未生成或被略過（其他項目已成功生成並儲存）：\n- '
          + failed.join('\n- ')
          + '\n\n可單獨重試失敗項目，或先補齊標單／分項工程／工序資料後再執行一鍵工程案資料建構。',
      )
    }
  } catch (e: any) {
    const msg =
      e?.response?.data?.error
      ?? e?.response?.data?.message
      ?? e?.message
      ?? '一鍵工程案資料建構過程發生錯誤'
    if (typeof window.alert === 'function') window.alert(msg)
  } finally {
    aiLoadingScale.value = false
    aiLoadingSubdivisionOrg.value = false
    aiLoadingStagePlan.value = false
    aiLoadingStageEssentials.value = false
    aiLoadingPInspectionStandards.value = false
    aiLoadingChapter4.value = false
    aiLoadingSafetyHealthExecution.value = false
    aiLoadingEnvironmentProtectionNotes.value = false
    batchAiPhase.value = 'idle'
    isAiGenerating.value = false
  }
}

watch([constructionId, docId, designChangeIdFromRoute], () => {
  void loadRow()
}, { immediate: true })

onMounted(() => {
  if (!dataReferenceDate.value) {
    dataReferenceDate.value = new Date().toISOString().slice(0, 10)
  }
})

onBeforeUnmount(() => {
  revokeStagePlanFlowChartUrl()
})

onUnmounted(() => {
  debouncedSaveCustomFields.cancel()
})
</script>

<style scoped>
/* 與 FormP2QualityPlan.vue 相同版型（report-card／工具列／text-panel） */
.form-p2-quality-plan-page {
  padding: 1rem;
  background: radial-gradient(1200px 600px at 12% 0%, rgba(var(--bs-primary-rgb), 0.06), transparent 60%),
    radial-gradient(900px 500px at 88% 10%, rgba(255, 255, 255, 0.03), transparent 55%),
    rgba(15, 23, 42, 0.1);
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

/** 一鍵工程案資料建構（toolbar 內）：尺寸與字級對齊「匯出 Word」按鈕 */
.p-dynamic-batch-ai-btn {
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

.text-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0.9rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
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
  color: rgba(255, 255, 255, 0.9);
}
.text-panel__label--sub {
  font-size: 0.95rem;
  font-weight: 600;
  opacity: 0.92;
}
.text-panel__body .chapter4-subheader {
  margin-top: 0.15rem;
  margin-bottom: 0.55rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.text-panel__body .chapter4-subheader .text-panel__toolbar .btn {
  white-space: nowrap;
}
/* 與 FormP1OverallConstructionPlan「圖片編輯區」工址位置圖區塊一致 */
.p1img-section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-bottom: 0.35rem;
}
.p1img-pending-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.62rem;
  border-radius: 999px;
  border: 1px solid rgba(var(--bs-primary-rgb), 0.28);
  background: rgba(var(--bs-primary-rgb), 0.12);
}
.p1img-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: rgba(226, 232, 240, 0.9);
}
.p1img-count-badge--warning {
  border-color: rgba(var(--bs-warning-rgb), 0.35);
}
.p1img-file-pick {
  position: relative;
}
.p1img-file-pick__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.p1img-file-pick__btn.disabled {
  opacity: 0.55;
  pointer-events: none;
}
.p1img-empty-state {
  margin-top: 0.75rem;
  padding: 1.4rem;
  text-align: center;
  color: rgba(226, 232, 240, 0.75);
  border: 1px dashed rgba(148, 163, 184, 0.25);
  border-radius: 0.75rem;
}
.p1img-loc-card {
  border-radius: 0.8rem;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.58);
}
.p1img-loc-thumb {
  display: block;
  width: 100%;
  height: 200px;
  background: rgba(2, 6, 23, 0.3);
  position: relative;
  overflow: hidden;
}
.p1img-loc-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
}
.p1img-loc-thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
.p1img-loc-meta {
  padding: 0.58rem 0.68rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}
.p1img-loc-name {
  color: rgba(226, 232, 240, 0.9);
  font-size: 0.86rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.text-panel__textarea--long {
  min-height: 18rem;
}
.text-panel__textarea--pre-wrap {
  white-space: pre-wrap;
  tab-size: 4;
}
.text-panel__textarea:focus {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
  color: rgba(255, 255, 255, 0.92);
}
.text-panel__textarea::placeholder {
  color: rgba(255, 255, 255, 0.45);
}
.text-panels {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.custom-duty-table {
  --bs-table-bg: rgba(255, 255, 255, 0.02);
  --bs-table-color: rgba(255, 255, 255, 0.9);
  --bs-table-border-color: rgba(255, 255, 255, 0.16);
  table-layout: fixed;
}
.custom-duty-table th {
  font-size: 0.82rem;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.05);
}
/* 使用材料表使用 chapter4-mat-col，勿套用下列通用欄寬 */
.custom-duty-table:not(.chapter4-mat-table) th:nth-child(1),
.custom-duty-table:not(.chapter4-mat-table) td:nth-child(1) {
  width: 14%;
}
.custom-duty-table:not(.chapter4-mat-table) th:nth-child(2),
.custom-duty-table:not(.chapter4-mat-table) td:nth-child(2) {
  width: 22%;
}
.custom-duty-table:not(.chapter4-mat-table) th:nth-child(3),
.custom-duty-table:not(.chapter4-mat-table) td:nth-child(3) {
  width: 28%;
}
.custom-duty-table:not(.chapter4-mat-table) th:nth-child(4),
.custom-duty-table:not(.chapter4-mat-table) td:nth-child(4) {
  width: 16%;
}
.custom-duty-table:not(.chapter4-mat-table) th:nth-child(5),
.custom-duty-table:not(.chapter4-mat-table) td:nth-child(5) {
  width: 14%;
}
.custom-duty-table:not(.chapter4-mat-table) th:nth-child(6),
.custom-duty-table:not(.chapter4-mat-table) td:nth-child(6) {
  width: 6%;
}
.chapter4-mat-table-wrap {
  min-width: 0;
}
.chapter4-mat-table {
  width: 100%;
  table-layout: fixed;
}
.chapter4-mat-col--itemno {
  width: 4%;
}
.chapter4-mat-col--namespec {
  width: 36%;
}
.chapter4-mat-col--unit {
  width: 6.5%;
}
.chapter4-mat-col--qty {
  width: 7.5%;
}
.chapter4-mat-col--storage {
  width: 21%;
}
.chapter4-mat-col--remark {
  width: 20%;
}
.chapter4-mat-col--actions {
  width: 5%;
}
.chapter4-mat-cell {
  min-width: 0;
  vertical-align: middle;
}
.chapter4-mat-cell :deep(.form-control) {
  width: 100%;
  min-width: 0;
}
.chapter4-mat-namespec {
  min-height: 3.4rem;
}
.chapter4-mat-cell--actions {
  white-space: nowrap;
}
.chapter4-mat-cell--itemno-display {
  padding-top: 0.55rem;
  padding-bottom: 0.55rem;
  font-variant-numeric: tabular-nums;
}
.custom-duty-table td {
  vertical-align: top;
}
.custom-duty-table :deep(.form-control) {
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
}
.custom-duty-table :deep(.form-control.custom-duty-multiline) {
  min-height: 3.4rem;
  line-height: 1.3;
  resize: vertical;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.stage-plan-accordion {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.stage-plan-accordion__item {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.75rem;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
}
.stage-plan-accordion__header {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.65rem 0.7rem;
  background: rgba(255, 255, 255, 0.03);
}
.stage-plan-accordion__header.is-collapsed {
  border-bottom: none;
}
.stage-plan-accordion__toggle {
  color: rgba(255, 255, 255, 0.9);
}
.stage-plan-accordion__title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}
.stage-plan-accordion__label {
  font-size: 0.76rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.72);
}
.stage-plan-accordion__title-btn {
  border: 1px dashed rgba(255, 255, 255, 0.24);
  background: rgba(0, 0, 0, 0.12);
  color: rgba(255, 255, 255, 0.92);
  border-radius: 0.45rem;
  padding: 0.3rem 0.5rem;
  text-align: left;
  width: min(520px, 100%);
}
.stage-plan-accordion__title-btn:hover {
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  background: rgba(var(--bs-primary-rgb), 0.12);
}
.stage-plan-accordion__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.stage-plan-accordion__body {
  padding: 0.65rem 0.7rem 0.75rem;
}
.stage-plan-table {
  --bs-table-bg: rgba(255, 255, 255, 0.02);
  --bs-table-color: rgba(255, 255, 255, 0.9);
  --bs-table-border-color: rgba(255, 255, 255, 0.16);
  table-layout: fixed;
}
.stage-plan-table th {
  font-size: 0.8rem;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}
.stage-plan-table td {
  vertical-align: top;
}
.stage-plan-table th:nth-child(1),
.stage-plan-table td:nth-child(1) {
  width: 13%;
}
.stage-plan-table th:nth-child(2),
.stage-plan-table td:nth-child(2),
.stage-plan-table th:nth-child(3),
.stage-plan-table td:nth-child(3),
.stage-plan-table th:nth-child(4),
.stage-plan-table td:nth-child(4),
.stage-plan-table th:nth-child(5),
.stage-plan-table td:nth-child(5),
.stage-plan-table th:nth-child(6),
.stage-plan-table td:nth-child(6) {
  width: 15%;
}
.stage-plan-table th:nth-child(7),
.stage-plan-table td:nth-child(7) {
  width: 6.5%;
}
.stage-plan-cell {
  min-height: 2.4rem;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.stage-plan-cell--clickable {
  cursor: pointer;
  border-radius: 0.35rem;
  padding: 0.15rem 0.3rem;
  transition: color 0.15s ease;
}
.stage-plan-cell--clickable:hover {
  text-decoration: underline;
  text-decoration-color: rgba(var(--bs-primary-rgb), 0.9);
  text-underline-offset: 2px;
  color: rgba(255, 255, 255, 0.98);
}

.stage-plan-essentials-unified {
  border-radius: 0.5rem;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

.stage-plan-essentials-unified .hint-strong {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

/* 施工要領區：階段名稱僅顯示（與上方 stage-plan-accordion__title-btn 視覺一致，不在此編輯階段名） */
.stage-plan-essentials-stage-name {
  display: inline-block;
  max-width: min(520px, 100%);
  border: 1px dashed rgba(255, 255, 255, 0.24);
  background: rgba(0, 0, 0, 0.12);
  color: rgba(255, 255, 255, 0.92);
  border-radius: 0.45rem;
  padding: 0.3rem 0.5rem;
  text-align: left;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.stage-plan-essentials__title {
  letter-spacing: 0.02em;
}

.stage-plan-essentials__textarea {
  min-height: 5.5rem;
  resize: vertical;
}

.stage-plan-accordion__body .stage-plan-essentials__block:last-child {
  margin-bottom: 0 !important;
}

/* 施工流程圖：比照 FormSubdivisionWorkItemGuideView（分項施工要領／抽查標準流程圖） */
.inspection-standards-shared-hint .hint-strong {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}
.inspection-standards-shared-hint .hint-sep {
  margin: 0 0.4rem;
  opacity: 0.6;
}
.inspection-standards-flowchart-btn {
  white-space: nowrap;
  border-radius: 0.55rem;
}
.inspection-standards-flowchart-img-wrap {
  max-height: 72vh;
  overflow: auto;
}

.inspection-standards-flowchart-img {
  max-width: 100%;
  height: auto;
  vertical-align: middle;
}
.guide-flowchart-btn {
  border-radius: 999px;
  padding: 0.4rem 0.75rem;
  border: 1px solid color-mix(in srgb, rgb(96, 165, 250) 55%, rgba(148, 163, 184, 0.35));
  color: rgba(255, 255, 255, 0.92);
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.18), rgba(34, 211, 238, 0.1));
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}
.guide-flowchart-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.26), rgba(34, 211, 238, 0.16));
}
.guide-flowchart-btn:active:not(:disabled) {
  transform: translateY(0);
}
.guide-flowchart-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
:deep(.guide-flow-modal .modal-dialog) {
  max-width: 960px;
}
:deep(.guide-flow-modal .modal-content) {
  max-height: 90vh;
}
:deep(.guide-flow-modal .modal-body) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
