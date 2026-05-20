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
            <button
              v-if="isSuperAdmin"
              type="button"
              class="btn-ai-generate p1-batch-ai-btn"
              :disabled="isAiGenerating || isExporting || !currentProject?.id"
              title="依目前版本標單／分項／工程地點，由工程案資料建構一次生成本頁所有可生成的文字與表格欄位"
              @click="generateAllByAi"
            >
              <i class="fa me-2" :class="isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
              <span>{{ isAiGenerating ? '生成中…' : '一鍵工程案資料建構' }}</span>
            </button>
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
              <div class="fw-semibold">工程案資料建構中…</div>
              <div class="small text-muted mt-1">產生內容後會自動儲存至目前版本</div>
            </div>
          </div>
          <div class="row g-3 mb-3 align-items-stretch">
            <div class="col-12 col-lg-6 d-flex">
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
                      @click="generateByAi"
                    >
                      <i
                        class="fa me-2"
                        :class="aiLoading.scaleOverview ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                      ></i>
                      {{ aiLoading.scaleOverview ? '生成中…' : '依標單工程案資料建構' }}
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
            </div>
            <div class="col-12 col-lg-6 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-compass me-2 text-warning"></i>
                    施工執行方向
                  </div>
                  <div class="text-panel__toolbar">
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="isAiGenerating || !currentProject?.id"
                      @click="generateConstructionExecutionDirectionByAi"
                    >
                      <i
                        class="fa me-2"
                        :class="aiLoading.executionDirection ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                      ></i>
                      {{ aiLoading.executionDirection ? '生成中…' : '依標單工程案資料建構' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <textarea
                    v-model="p1ConstructionExecutionDirection"
                    class="form-control text-panel__textarea"
                    rows="7"
                    placeholder="請輸入施工執行方向（P-1 獨立欄位）"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="section-card">
            <div class="section-card__header">
              <i class="fa fa-diagram-project me-2 text-success"></i>
              施工流程
            </div>
            <div class="section-card__body">
              <div class="text-panel mb-3">
                <div class="text-panel__header">
                  <div class="text-panel__label">施工流程概述</div>
                  <div class="text-panel__toolbar">
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="isAiGenerating || !currentProject?.id"
                      @click="generateConstructionProcessOverviewByAi"
                    >
                      <i class="fa me-2" :class="aiLoading.processOverview ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'" />
                      {{ aiLoading.processOverview ? '生成中…' : '依標單與分項工程案資料建構' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <textarea
                    v-model="p1ConstructionProcessOverview"
                    class="form-control text-panel__textarea"
                    rows="6"
                    placeholder="請輸入施工流程概述，或使用工程案資料建構"
                    @input="scheduleAutoSave"
                  />
                </div>
              </div>

              <div class="text-panel">
                <div class="text-panel__header">
                  <div class="text-panel__label">施工流程圖</div>
                  <div class="text-panel__toolbar">
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="isAiGenerating || !currentProject?.id"
                      @click="generateConstructionProcessFlowByAi"
                    >
                      <i class="fa me-2" :class="aiLoading.processFlow ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'" />
                      {{ aiLoading.processFlow ? '生成中…' : '依標單與分項工程案資料建構流程圖' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body p1-flow-chart-body">
                  <P1ConstructionProcessFlowEditor ref="p1FlowEditorRef" v-model="p1ConstructionProcessFlowJson" />
                  <p class="small text-muted mb-0 mt-2">
                    左側為預覽，右側可維護節點與連線；亦可使用上方工程案資料建構後再調整。
                  </p>
                </div>
              </div>
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
                      <button v-if="isSuperAdmin" type="button" class="btn-ai-generate" :disabled="isAiGenerating || !currentProject?.id" @click="generateSiteJudgementByAi('GEOLOGY_OVERVIEW')">
                        <i class="fa me-2" :class="aiLoading.geology ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                        {{ aiLoading.geology ? '生成中…' : '依工程地址工程案資料建構' }}
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
                      <button v-if="isSuperAdmin" type="button" class="btn-ai-generate" :disabled="isAiGenerating || !currentProject?.id" @click="generateSiteJudgementByAi('METEOROLOGY_HYDROLOGY')">
                        <i class="fa me-2" :class="aiLoading.meteo ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                        {{ aiLoading.meteo ? '生成中…' : '依工程地址工程案資料建構' }}
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
                      <button type="button" class="btn-default-fill" @click="applyDefaultText('siteCurrent')">帶入預設值</button>
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
                      <button type="button" class="btn-default-fill" @click="applyDefaultText('underground')">帶入預設值</button>
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
                      <button type="button" class="btn-default-fill" @click="applyDefaultText('neighbor')">帶入預設值</button>
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
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="isAiGenerating || !currentProject?.id"
                      @click="fillManpowerFromSubdivisionsByAi"
                    >
                      <i class="fa me-2" :class="isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                      {{ isAiGenerating ? '生成中…' : '帶入分項並工程案資料建構填群組' }}
                    </button>
                    <button type="button" class="btn-default-fill" @click="addManpowerRow">新增一列</button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-info"
                      :disabled="!currentProject?.id"
                      title="預覽 P-1 人力結構圖（匯出用 PNG）"
                      @click="openManpowerStructurePreviewModal"
                    >
                      <i class="fa fa-image me-1"></i>人力結構圖預覽
                    </button>
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
                        <td>
                          <input
                            v-if="!row.isPreset"
                            v-model="row.resourceName"
                            type="text"
                            class="form-control form-control-sm"
                            @input="scheduleAutoSave"
                          />
                          <input v-else v-model="row.resourceName" type="text" class="form-control form-control-sm" disabled readonly />
                        </td>
                        <td>
                          <input
                            v-if="!row.isPreset"
                            v-model="row.groupName"
                            type="text"
                            class="form-control form-control-sm"
                            @input="scheduleAutoSave"
                          />
                          <input v-else v-model="row.groupName" type="text" class="form-control form-control-sm" disabled readonly />
                        </td>
                        <td><input v-model="row.maxAvailable" type="text" class="form-control form-control-sm" @input="scheduleAutoSave" /></td>
                        <td>
                          <RepublicDatePicker v-model="row.startDate" input-class="form-control form-control-sm p1-date-input" @update:model-value="scheduleAutoSave" />
                        </td>
                        <td>
                          <RepublicDatePicker v-model="row.endDate" input-class="form-control form-control-sm p1-date-input" @update:model-value="scheduleAutoSave" />
                        </td>
                        <td>
                          <button
                            v-if="!row.isPreset"
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            @click="removeManpowerRow(idx)"
                          >
                            <i class="fa fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                      <tr v-if="p1ManpowerEntrySchedule.length === 0">
                        <td colspan="7" class="text-center text-muted py-3">尚無資料，請新增或使用工程案資料建構帶入分項。</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <Modal
                :show="showManpowerStructurePreviewModal"
                title=""
                icon=""
                size="lg"
                modal-id="p1-manpower-structure-preview"
                :hide-footer="true"
                :hide-confirm-button="true"
                :hide-cancel-button="true"
                @update:show="(v: boolean) => { if (!v) closeManpowerStructurePreviewModal() }"
              >
                <template #header>
                  <span class="fw-bold">人力結構圖預覽</span>
                </template>
                <div v-if="manpowerStructurePreviewLoading" class="text-center py-5 text-muted">
                  <i class="fa fa-spinner fa-spin me-2"></i>產生預覽中…
                </div>
                <div v-else class="p-2">
                  <div class="p1-manpower-structure-preview-wrap bg-white rounded p-2">
                    <img
                      v-if="manpowerStructurePreviewUrl"
                      :src="manpowerStructurePreviewUrl"
                      alt="P-1 人力結構圖預覽"
                      class="p1-manpower-structure-preview-img"
                    />
                    <div v-else class="text-center text-muted py-5">無法預覽</div>
                  </div>
                  <div class="small text-muted mt-2 mb-0">
                    下半部直書群組取自「人力資源預定進場時間表」之非預設列群組名稱。
                  </div>
                </div>
              </Modal>

              <Modal
                :show="showP1SupervisoryModal"
                title=""
                icon=""
                size="xl"
                modal-id="p1-contractor-supervisory-b-preview"
                :hide-confirm-button="true"
                :hide-cancel-button="true"
                @update:show="showP1SupervisoryModal = $event"
              >
                <template #header>
                  <div
                    class="d-flex w-100 flex-wrap align-items-center justify-content-between gap-2 pe-1 contractor-supervisory-modal-title"
                  >
                    <span class="fw-bold">監造填寫預覽</span>
                    <div v-if="currentProject?.id" class="d-flex align-items-center gap-2" @click.stop>
                      <DesignChangeVersionSwitcher
                        :model-value="modalP1SupervisoryDesignChangeId"
                        :construction-id="currentProject.id"
                        source-type="SUPERVISORY"
                        @update:model-value="onP1ModalSupervisoryVersionChange"
                      />
                    </div>
                  </div>
                </template>
                <p class="text-muted small mb-3">
                  以下為監造端<strong>自訂</strong> B 類項目（不含預設列）。複製至營造「P類-計畫書」時將<strong>刪除該類別自訂列</strong>並以上表重建（P 類預設列不變）。
                </p>
                <div v-if="p1SupervisoryPreviewLoading" class="text-center py-4 text-muted">
                  <i class="fa fa-spinner fa-spin me-2"></i>載入中…
                </div>
                <div v-else class="supervisory-preview-report-card">
                  <div class="supervisory-preview-report-card__body">
                    <div class="table-responsive">
                      <table class="table table-hover align-middle mb-0">
                        <thead>
                          <tr>
                            <th style="width: 50px">#</th>
                            <th style="width: 80px">編號</th>
                            <th>文件名稱</th>
                            <th style="min-width: 160px">規定提送日程</th>
                            <th style="width: 100px">保存年限</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-if="p1SupervisoryPreviewRows.length === 0">
                            <td colspan="5" class="text-center text-muted py-4">此版本尚無自訂 B 類項目</td>
                          </tr>
                          <tr v-for="(row, idx) in p1SupervisoryPreviewRows" :key="idx">
                            <td class="text-center text-muted">{{ idx + 1 }}</td>
                            <td>{{ row.itemNumber }}</td>
                            <td>{{ row.documentName }}</td>
                            <td class="small">{{ row.requiredSubmissionSchedule || '—' }}</td>
                            <td>{{ row.retentionYears == null ? '—' : `${row.retentionYears} 年` }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <template #footer>
                  <button type="button" class="btn btn-outline-secondary" @click="showP1SupervisoryModal = false">關閉</button>
                  <button
                    type="button"
                    class="btn btn-primary"
                    :disabled="isP1CopyingSupervisoryToP || !currentProject?.id"
                    @click="copyP1SupervisoryBToP"
                  >
                    <i v-if="isP1CopyingSupervisoryToP" class="fa fa-spinner fa-spin me-1"></i>
                    <i v-else class="fa fa-copy me-1"></i>
                    {{ isP1CopyingSupervisoryToP ? '複製中…' : '複製到營造 P 類（目前版本）' }}
                  </button>
                </template>
              </Modal>

              <div class="text-panel mb-3 p1-p-classification-block">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-file-lines me-2 text-info"></i>
                    文件檔案分類表 — P類-計畫書
                  </div>
                </div>

                <div v-if="isTextLoading" class="text-muted small py-2 mb-2">
                  <i class="fa fa-spinner fa-spin me-2"></i>載入 P 類分類資料中…
                </div>
                <CategoryTable
                  v-else-if="hasCurrentProject && isContractor"
                  category="P"
                  title="P類-計畫書"
                  :items="pClassificationItems"
                  :allow-null-retention="true"
                  :schedule-column-categories="['P']"
                  plan-schedule-extras
                  inline-edit-non-default
                  dark-inputs
                  @add="handlePClassificationAdd"
                  @update="handlePClassificationUpdate"
                  @delete="handlePClassificationDelete"
                  @reorder="handlePClassificationReorder"
                >
                  <template #headerActions>
                    <router-link
                      :to="contractorDocumentClassificationRoute"
                      class="btn btn-sm btn-link text-decoration-none"
                    >
                      <i class="fa fa-folder-open me-1"></i>
                      前往文件檔案分類表
                    </router-link>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      title="預覽監造 B 類自訂項目與規定提送日程，並可複製至本類別"
                      @click="openP1SupervisoryModal"
                    >
                      <i class="fa fa-eye me-1"></i>
                      監造填寫預覽
                    </button>
                  </template>
                  <template #planScheduleExtras="{ item }">
                    <template v-if="item.isDefault">
                      <td class="text-muted small text-center align-middle">—</td>
                      <td class="text-muted small text-center align-middle">—</td>
                      <td class="text-muted small text-center align-middle">—</td>
                    </template>
                    <template v-else>
                      <td class="p1-plan-sched-cell align-middle">
                        <RepublicDatePicker
                          v-if="p1CustomPlanRowFor(item.id)"
                          v-model="p1CustomPlanRowFor(item.id)!.plannedConstructionDate"
                          input-class="form-control form-control-sm p1-date-input"
                          placeholder="請選擇"
                          value-format="YYYY-MM-DD"
                          auto-apply
                          @update:model-value="scheduleAutoSave"
                        />
                      </td>
                      <td class="p1-plan-sched-cell align-middle">
                        <RepublicDatePicker
                          v-if="p1CustomPlanRowFor(item.id)"
                          v-model="p1CustomPlanRowFor(item.id)!.plannedSubmissionDate"
                          input-class="form-control form-control-sm p1-date-input"
                          placeholder="請選擇"
                          value-format="YYYY-MM-DD"
                          auto-apply
                          @update:model-value="scheduleAutoSave"
                        />
                      </td>
                      <td class="p1-plan-sched-cell align-middle">
                        <input
                          v-if="p1CustomPlanRowFor(item.id)"
                          v-model="p1CustomPlanRowFor(item.id)!.remark"
                          type="text"
                          class="form-control form-control-sm p1-plan-sched-remark"
                          @input="scheduleAutoSave"
                        />
                      </td>
                    </template>
                  </template>
                </CategoryTable>
              </div>

              <div v-if="hasCurrentProject && isContractor" class="mt-3">
                <P1EmergencyContactFigures ref="p1ContactFiguresRef" v-model="p1EmergencyContactBundle" />
              </div>

              <div class="resource-layout">
                <div>
                  <div class="text-panel">
                    <div class="text-panel__header">
                      <div class="text-panel__label">施工機械設備資源預定進場時間表</div>
                      <div class="text-panel__toolbar table-toolbar-inline">
                        <button v-if="isSuperAdmin" type="button" class="btn-ai-generate" :disabled="isAiGenerating || !currentProject?.id" @click="generateMechanicalResourceNamesByAi">
                          <i class="fa me-2" :class="isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                          {{ isAiGenerating ? '生成中…' : '依標單工程案資料建構資源名稱' }}
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
                            <td colspan="6" class="text-center text-muted py-3">尚無資料，請新增或使用工程案資料建構。</td>
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
                      <button v-if="isSuperAdmin" type="button" class="btn-ai-generate" :disabled="isAiGenerating || !currentProject?.id" @click="generateMaterialMarketSurveyByAi">
                        <i class="fa me-2" :class="isAiGenerating ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                        {{ isAiGenerating ? '生成中…' : '依標單工程案資料建構' }}
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

                <div class="text-panel mt-3">
                  <div class="text-panel__body">
                    <div class="row g-3">
                      <div class="col-12">
                        <label class="form-label">施工前協調會議</label>
                        <textarea
                          v-model="p1PreConstructionCoordinationMeeting"
                          class="form-control"
                          rows="3"
                          placeholder="本工程施工前協調會議於XXX年X月XX日下午二時於XXX會議室召開。"
                          @input="scheduleAutoSave"
                        />
                      </div>
                      <div class="col-12">
                        <label class="form-label">定期會議</label>
                        <textarea
                          v-model="p1RegularMeetingFrequency"
                          class="form-control"
                          rows="2"
                          placeholder="每2週召開一次。"
                          @input="scheduleAutoSave"
                        />
                      </div>
                      <div class="col-12">
                        <label class="form-label">進度異常管理方式(落後%數)</label>
                        <div class="input-group" style="max-width: 260px">
                          <span class="input-group-text">落後門檻(%)</span>
                          <input
                            v-model.number="p1ProgressDelayThresholdPercent"
                            type="number"
                            min="0"
                            class="form-control"
                            @input="scheduleAutoSave"
                          />
                        </div>
                      </div>
                      <div class="col-12">
                        <label class="form-label">職業安全衛生教育訓練人數</label>
                        <div class="input-group" style="max-width: 280px">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            class="form-control"
                            placeholder="請輸入人數"
                            :value="String(p1SafetyHealthTrainingHeadcount)"
                            @input="onP1SafetyTrainingHeadcountInput"
                          />
                          <span class="input-group-text">人</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="text-panel mt-3">
                  <div class="text-panel__header">
                    <div class="text-panel__label">交通維持及安全管制</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-default-fill btn-default-fill--sm" @click="applyTrafficDefaults">
                        帶入預設值
                      </button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <div class="row g-3">
                      <div class="col-12">
                        <label class="form-label">說明</label>
                        <textarea
                          v-model="p1TrafficMaintenanceSafetyControl"
                          class="form-control text-panel__textarea"
                          rows="5"
                          @input="scheduleAutoSave"
                        />
                      </div>
                      <div class="col-12">
                        <label class="form-label">車輛進出路線</label>
                        <textarea
                          v-model="p1VehicleAccessRoutes"
                          class="form-control text-panel__textarea"
                          rows="5"
                          @input="scheduleAutoSave"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="text-panel mt-3">
                  <div class="text-panel__header">
                    <div class="text-panel__label">施工臨時設施計畫</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-default-fill btn-default-fill--sm" @click="applyTempFacilitiesDefaults">
                        帶入預設值
                      </button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <div class="row g-3">
                      <div class="col-12">
                        <label class="form-label">壹、臨時用電設備</label>
                        <textarea v-model="p1TempPowerEquipment" class="form-control" rows="2" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">貳、給排水設備</label>
                        <textarea v-model="p1TempWaterDrainageEquipment" class="form-control" rows="2" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">參、電訊設備</label>
                        <textarea v-model="p1TempTelecomEquipment" class="form-control" rows="2" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">肆、臨時房舍</label>
                        <textarea v-model="p1TempHousing" class="form-control" rows="3" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">伍、材料堆置場及加工區</label>
                        <textarea v-model="p1TempMaterialStorageProcessingArea" class="form-control" rows="2" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">陸、修護場</label>
                        <textarea v-model="p1TempRepairYard" class="form-control" rows="2" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">柒、拌合場(含水泥混凝土及瀝青混凝土拌合場)</label>
                        <textarea v-model="p1TempMixingPlant" class="form-control" rows="2" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">捌、材料實驗室</label>
                        <textarea v-model="p1TempMaterialLab" class="form-control" rows="2" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">玖、施工道</label>
                        <textarea v-model="p1TempConstructionRoad" class="form-control" rows="2" @input="scheduleAutoSave" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="text-panel mt-3">
                  <div class="text-panel__header">
                    <div class="text-panel__label">竣工文件提送項目</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-default-fill btn-default-fill--sm" @click="applyCompletionDocDefaults">
                        帶入預設值
                      </button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <div class="table-scroll-wrap p1-completion-doc-table-wrap">
                      <table class="table align-middle p1-resource-table mb-0">
                        <thead>
                          <tr>
                            <th style="width: 4rem">項次</th>
                            <th>提送內容</th>
                            <th style="width: 5.5rem"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(_line, idx) in p1CompletionDocumentItems" :key="'completion-doc-' + idx">
                            <td class="text-center text-secondary">{{ idx + 1 }}</td>
                            <td>
                              <textarea
                                v-model="p1CompletionDocumentItems[idx]"
                                class="form-control form-control-sm"
                                rows="2"
                                @input="scheduleAutoSave"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                class="btn btn-sm btn-outline-danger"
                                :disabled="p1CompletionDocumentItems.length <= 1"
                                @click="removeP1CompletionDocumentRow(idx)"
                              >
                                刪除
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-primary mt-2" @click="addP1CompletionDocumentRow">
                      <i class="fa fa-plus me-1"></i>新增列
                    </button>
                  </div>
                </div>

                <div class="text-panel mt-3">
                  <div class="text-panel__header">
                    <div class="text-panel__label">施工測量</div>
                    <div class="text-panel__toolbar">
                      <button type="button" class="btn-default-fill btn-default-fill--sm" @click="applySurveyDefaults">
                        帶入預設值
                      </button>
                    </div>
                  </div>
                  <div class="text-panel__body">
                    <div class="row g-3">
                      <div class="col-12">
                        <label class="form-label">壹、測量儀器</label>
                        <textarea v-model="p1SurveyInstruments" class="form-control text-panel__textarea p1-survey-textarea" rows="4" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">貳、控制測量</label>
                        <textarea v-model="p1ControlSurvey" class="form-control text-panel__textarea p1-survey-textarea" rows="5" @input="scheduleAutoSave" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">參、控制測量精度要求</label>
                        <textarea
                          v-model="p1ControlSurveyAccuracyRequirements"
                          class="form-control text-panel__textarea p1-survey-textarea"
                          rows="4"
                          @input="scheduleAutoSave"
                        />
                      </div>
                      <div class="col-12">
                        <label class="form-label">肆、施工測量</label>
                        <textarea v-model="p1ConstructionSurveyWork" class="form-control text-panel__textarea p1-survey-textarea" rows="6" @input="scheduleAutoSave" />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="text-panel mt-3">
                  <div class="text-panel__header">
                    <div class="text-panel__label">施工區域排水系統（含原有水路維持）</div>
                  </div>
                  <div class="text-panel__body">
                    <div class="text-panel mt-0">
                      <div class="text-panel__header">
                        <div class="text-panel__label">壹、工地周圍現有灌排水系統</div>
                        <div class="text-panel__toolbar">
                          <button
                            v-if="isSuperAdmin"
                            type="button"
                            class="btn-ai-generate"
                            :disabled="isAiGenerating || !currentProject?.id"
                            @click="generateDrainageAreaByAi('SURROUNDING_SYSTEM')"
                          >
                            <i
                              class="fa me-2"
                              :class="aiLoading.drainageSurrounding ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                            ></i>
                            {{ aiLoading.drainageSurrounding ? '生成中…' : '依工程與標單工程案資料建構' }}
                          </button>
                        </div>
                      </div>
                      <div class="text-panel__body">
                        <textarea
                          v-model="p1SurroundingDrainageSystem"
                          class="form-control text-panel__textarea"
                          rows="5"
                          placeholder="請輸入工地周圍現有灌排水系統說明"
                          @input="scheduleAutoSave"
                        />
                      </div>
                    </div>
                    <div class="text-panel mt-3">
                      <div class="text-panel__header">
                        <div class="text-panel__label">貳、施工中擋水及抽水措施</div>
                        <div class="text-panel__toolbar">
                          <button
                            v-if="isSuperAdmin"
                            type="button"
                            class="btn-ai-generate"
                            :disabled="isAiGenerating || !currentProject?.id"
                            @click="generateDrainageAreaByAi('DEWATERING_MEASURES')"
                          >
                            <i
                              class="fa me-2"
                              :class="aiLoading.drainageDewatering ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                            ></i>
                            {{ aiLoading.drainageDewatering ? '生成中…' : '依工程與標單工程案資料建構' }}
                          </button>
                        </div>
                      </div>
                      <div class="text-panel__body">
                        <textarea
                          v-model="p1ConstructionDewateringMeasures"
                          class="form-control text-panel__textarea"
                          rows="5"
                          placeholder="請輸入施工中擋水及抽水措施說明"
                          @input="scheduleAutoSave"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="section-card">
            <div class="section-card__header">
              <i class="fa fa-images me-2 text-warning"></i>
              圖片編輯區
            </div>
            <div class="section-card__body">
              <div class="p1img-sections">
                <div v-for="section in imageSections" :key="section.type" class="p1img-section-card">
                  <button
                    type="button"
                    class="p1img-section-card__header"
                    @click="toggleImageSection(section.type)"
                    :aria-expanded="expandedImageByType[section.type] ? 'true' : 'false'"
                  >
                    <div class="p1img-section-card__header-left">
                      <div class="p1img-section-icon" :class="section.iconBg">
                        <i class="fa" :class="section.icon"></i>
                      </div>
                      <div>
                        <div class="p1img-section-title">{{ section.title }}</div>
                      </div>
                    </div>
                    <div>
                      <span class="p1img-count-badge" :class="section.countBadgeClass">
                        {{ section.list.value.length }}
                      </span>
                    </div>
                  </button>

                  <div v-show="expandedImageByType[section.type]" class="p1img-section-card__body">
                    <div class="p1img-section-toolbar">
                      <div>
                        <div class="p1img-pending-pill" v-if="pendingImageByType[section.type].length">
                          已選取 {{ pendingImageByType[section.type].length }} 張，按「上傳」送出
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
                            :disabled="isImageUploading"
                            @change="(e) => onPickImageFiles(e, section.type)"
                          />
                          <span
                            class="btn btn-sm btn-outline-light p1img-file-pick__btn"
                            :class="{ disabled: isImageUploading }"
                          >
                            <i class="fa fa-folder-open me-1"></i>選取圖片
                          </span>
                        </label>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-primary"
                          :disabled="isImageUploading || pendingImageByType[section.type].length === 0"
                          @click="uploadPendingImages(section.type)"
                        >
                          <i class="fa me-1" :class="isImageUploading ? 'fa-spinner fa-spin' : 'fa-upload'"></i>
                          {{ isImageUploading ? '上傳中…' : '上傳圖片' }}
                        </button>
                      </div>
                    </div>

                    <div v-if="section.list.value.length === 0" class="p1img-empty-state">
                      尚未上傳{{ section.title }}。
                    </div>

                    <div v-else class="row g-3 mt-2">
                      <div v-for="img in section.list.value" :key="img.id" class="col-12 col-sm-6 col-lg-4">
                        <div class="p1img-loc-card">
                          <ConstructionLocationMapThumb
                            v-if="currentProject?.id"
                            :img="img"
                            :construction-id="currentProject.id"
                            :design-change-id="selectedDesignChangeId"
                            :type="section.type"
                            link-class="p1img-loc-thumb"
                            empty-class="p1img-loc-thumb p1img-loc-thumb--empty"
                          />
                          <div class="p1img-loc-meta">
                            <div class="p1img-loc-name" :title="img.fileName">{{ img.fileName }}</div>
                            <button
                              type="button"
                              class="btn btn-sm btn-outline-danger"
                              :disabled="deletingImageId === img.id"
                              @click="removeImage(section.type, img.id)"
                            >
                              <i class="fa" :class="deletingImageId === img.id ? 'fa-spinner fa-spin' : 'fa-trash'"></i>
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
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  P1_CONSTRUCTION_SURVEY_DEFAULT,
  P1_SURVEY_INSTRUMENTS_DEFAULT,
  P1_CONTROL_SURVEY_DEFAULT,
  P1_CONTROL_SURVEY_ACCURACY_REQUIREMENTS_DEFAULT,
  P1_CONSTRUCTION_SURVEY_WORK_DEFAULT
} from './p1ConstructionSurveyDefault'
import {
  P1_SAFETY_HEALTH_TRAINING_HEADCOUNT_DEFAULT,
  P1_TRAFFIC_MAINTENANCE_SAFETY_CONTROL_DEFAULT,
  P1_VEHICLE_ACCESS_ROUTES_DEFAULT,
  P1_COMPLETION_DOCUMENT_ITEMS_DEFAULT,
  encodeP1CompletionDocumentItems,
  decodeP1CompletionDocumentItems
} from './p1PlanExtraDefaults'
import {
  P1_SURROUNDING_DRAINAGE_SYSTEM_DEFAULT,
  P1_CONSTRUCTION_DEWATERING_MEASURES_DEFAULT
} from './p1DrainageAreaDefaults'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import CategoryTable from '@/components/document/CategoryTable.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import ConstructionLocationMapThumb from '@/components/common/ConstructionLocationMapThumb.vue'
import P1ConstructionProcessFlowEditor from '@/components/p1/P1ConstructionProcessFlowEditor.vue'
import P1EmergencyContactFigures from '@/components/forms/P1EmergencyContactFigures.vue'
import {
  defaultP1EmergencyContactBundle,
  parseP1EmergencyContactBundle,
  stringifyP1EmergencyContactBundle,
  type P1EmergencyContactBundle
} from '@/components/forms/p1EmergencyContactFigureDefs'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useExportLoading } from '@/composables/useExportLoading'
import { formPApi, downloadBlobAsFile, type ExportConstructionReportRequest } from '@/api/forms'
import { getDesignChangeList } from '@/api/designChange'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
import {
  listConstructionLocationMaps,
  uploadConstructionLocationMaps,
  deleteConstructionLocationMap,
  type ConstructionLocationMapImageInfo
} from '@/api/constructionLocationMaps'
import type { DocumentClassification } from '@/api/documentClassification'
import {
  contractorDocumentClassificationApi,
  type ContractorDocumentClassification,
  type SupervisoryBNonDefaultRow
} from '@/api/contractorDocumentClassification'
import { requestContractorPMenuSidebarRefresh } from '@/utils/contractorPMenuSidebar'
import {
  getConstructionDetail,
  getP1TextAiGenerate,
  getP1ConstructionExecutionDirectionAiGenerate,
  getP1SiteJudgementAiGenerate,
  getP1MechanicalResourcesAiGenerate,
  getP1MaterialMarketSurveyAiGenerate,
  getP1DrainageAreaAiGenerate,
  getP1ManpowerDefaultMaxAvailable,
  getP1ManpowerFromSubdivisionsAiGenerate,
  fetchP1ManpowerStructureImagePng,
  getP1ConstructionProcessOverviewAiGenerate,
  getP1ConstructionProcessFlowAiGenerate,
  updateConstruction,
  uploadP1EmergencyContactFigureImage,
  uploadP1ConstructionProcessFlowImage,
  type P1SiteJudgementAiField,
  type P1DrainageAreaAiField
} from '@/api/construction'

const workspaceStore = useWorkspaceStore()
const { isContractor, isSuperAdmin } = useViewPerspective()
const { runWithExportLoading } = useExportLoading()
const currentProject = computed(() => workspaceStore.currentProject)
const hasCurrentProject = computed(() => !!currentProject.value?.id)
const selectedDesignChangeId = ref<number | null>(null)
/** 與目前 P-1 版本一致，開啟營造端文件檔案分類表 */
const contractorDocumentClassificationRoute = computed(() => {
  const q: Record<string, string> = {}
  if (selectedDesignChangeId.value != null) {
    q.designChangeId = String(selectedDesignChangeId.value)
  }
  return { path: '/forms/contractor-document-classification', query: q }
})
const designChangeList = ref<{ id: number; effectiveDate: string }[]>([])
const dataReferenceDate = ref('')
const p1ConstructionScaleOverview = ref('')
const p1ConstructionExecutionDirection = ref('')
const p1ConstructionProcessOverview = ref('')
const p1ConstructionProcessFlowJson = ref('')
const p1GeologyOverview = ref('')
const p1SiteCurrentConditionSurvey = ref('')
const p1UndergroundUtilitiesSurvey = ref('')
const p1MeteorologyHydrology = ref('')
const p1NeighboringBuildingSurvey = ref('')
type MechanicalResourceRow = { resourceName: string; maxAvailable: string; startDate: string; endDate: string }
const p1MechanicalResources = ref<MechanicalResourceRow[]>([])
type ManpowerScheduleRow = {
  resourceName: string
  groupName: string
  maxAvailable: string
  startDate: string
  endDate: string
  /** 四筆系統預設列：不可刪除，資源名稱／群組不可改 */
  isPreset?: boolean
}
const p1ManpowerEntrySchedule = ref<ManpowerScheduleRow[]>([])
type P1CustomPPlanRow = {
  documentClassificationId: number
  sequence: number
  planName: string
  plannedConstructionDate: string
  plannedSubmissionDate: string
  remark: string
}
const p1CustomPPlanRows = ref<P1CustomPPlanRow[]>([])
/** 與文件檔案分類表頁相同之 P 類列（供 CategoryTable） */
const pClassificationItems = ref<DocumentClassification[]>([])

function p1CustomPlanRowFor(itemId: number): P1CustomPPlanRow | undefined {
  return p1CustomPPlanRows.value.find((r) => r.documentClassificationId === itemId)
}

const showP1SupervisoryModal = ref(false)
const modalP1SupervisoryDesignChangeId = ref<number | null>(null)
const p1SupervisoryPreviewRows = ref<SupervisoryBNonDefaultRow[]>([])
const p1SupervisoryPreviewLoading = ref(false)
const isP1CopyingSupervisoryToP = ref(false)
const p1EmergencyContactBundle = ref<P1EmergencyContactBundle>(defaultP1EmergencyContactBundle())
const p1ContactFiguresRef = ref<{
  exportFig102PngBlob?: () => Promise<Blob>
  exportFig103PngBlob?: () => Promise<Blob>
  exportFig103TablePngBlob?: () => Promise<Blob>
} | null>(null)
const p1FlowEditorRef = ref<{ exportFlowPreviewPngBlob?: () => Promise<Blob | null> } | null>(null)
const p1MaterialMarketSurvey = ref('')
const p1ProgressDelayThresholdPercent = ref<number>(10)
const p1PreConstructionCoordinationMeeting = ref('')
const p1RegularMeetingFrequency = ref('')
const p1SafetyHealthTrainingHeadcount = ref<number | null>(P1_SAFETY_HEALTH_TRAINING_HEADCOUNT_DEFAULT)
const p1TrafficMaintenanceSafetyControl = ref(P1_TRAFFIC_MAINTENANCE_SAFETY_CONTROL_DEFAULT)
const p1VehicleAccessRoutes = ref(P1_VEHICLE_ACCESS_ROUTES_DEFAULT)
const p1CompletionDocumentItems = ref<string[]>([...decodeP1CompletionDocumentItems(undefined)])
const p1TempPowerEquipment = ref('')
const p1TempWaterDrainageEquipment = ref('')
const p1TempTelecomEquipment = ref('')
const p1TempHousing = ref('')
const p1TempMaterialStorageProcessingArea = ref('')
const p1TempRepairYard = ref('')
const p1TempMixingPlant = ref('')
const p1TempMaterialLab = ref('')
const p1TempConstructionRoad = ref('')
const p1ConstructionSurvey = ref(P1_CONSTRUCTION_SURVEY_DEFAULT)
const p1SurveyInstruments = ref(P1_SURVEY_INSTRUMENTS_DEFAULT)
const p1ControlSurvey = ref(P1_CONTROL_SURVEY_DEFAULT)
const p1ControlSurveyAccuracyRequirements = ref(P1_CONTROL_SURVEY_ACCURACY_REQUIREMENTS_DEFAULT)
const p1ConstructionSurveyWork = ref(P1_CONSTRUCTION_SURVEY_WORK_DEFAULT)
const p1SurroundingDrainageSystem = ref(P1_SURROUNDING_DRAINAGE_SYSTEM_DEFAULT)
const p1ConstructionDewateringMeasures = ref(P1_CONSTRUCTION_DEWATERING_MEASURES_DEFAULT)
type P1ImageType =
  | 'P1_SITE_LOCATION_MAP'
  | 'P1_MAIN_STANDARD_DRAWINGS'
  | 'P1_SCHEDULED_PROJECT_PROGRESS'
const siteLocationMapImages = ref<ConstructionLocationMapImageInfo[]>([])
const mainStandardDrawingsImages = ref<ConstructionLocationMapImageInfo[]>([])
const scheduledProjectProgressImages = ref<ConstructionLocationMapImageInfo[]>([])
const pendingImageByType = ref<Record<P1ImageType, File[]>>({
  P1_SITE_LOCATION_MAP: [],
  P1_MAIN_STANDARD_DRAWINGS: [],
  P1_SCHEDULED_PROJECT_PROGRESS: []
})
const expandedImageByType = ref<Record<P1ImageType, boolean>>({
  P1_SITE_LOCATION_MAP: true,
  P1_MAIN_STANDARD_DRAWINGS: true,
  P1_SCHEDULED_PROJECT_PROGRESS: true
})
const isImageUploading = ref(false)
const deletingImageId = ref<number | null>(null)
const manpowerDefaultHint = ref('')
const isTextLoading = ref(false)
const isAiGenerating = ref(false)
const isExporting = ref(false)

// 人力結構圖預覽（PNG）
const showManpowerStructurePreviewModal = ref(false)
const manpowerStructurePreviewUrl = ref<string>('')
const manpowerStructurePreviewLoading = ref(false)

function closeManpowerStructurePreviewModal() {
  showManpowerStructurePreviewModal.value = false
  if (manpowerStructurePreviewUrl.value) {
    URL.revokeObjectURL(manpowerStructurePreviewUrl.value)
    manpowerStructurePreviewUrl.value = ''
  }
}

async function openManpowerStructurePreviewModal() {
  const cid = currentProject.value?.id
  if (!cid) return
  showManpowerStructurePreviewModal.value = true
  manpowerStructurePreviewLoading.value = true
  try {
    if (manpowerStructurePreviewUrl.value) {
      URL.revokeObjectURL(manpowerStructurePreviewUrl.value)
      manpowerStructurePreviewUrl.value = ''
    }
    const blob = await fetchP1ManpowerStructureImagePng(cid, selectedDesignChangeId.value)
    manpowerStructurePreviewUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    console.error(e)
    window.alert('無法產生預覽圖，請稍後再試')
    closeManpowerStructurePreviewModal()
  } finally {
    manpowerStructurePreviewLoading.value = false
  }
}
const aiLoading = ref({
  geology: false,
  meteo: false,
  scaleOverview: false,
  executionDirection: false,
  processOverview: false,
  processFlow: false,
  drainageSurrounding: false,
  drainageDewatering: false
})
let autosaveTimer: number | null = null
let skipAutoSave = false
const isSavingTexts = ref(false)
let pendingSave = false
let pendingUploadImages = false

function splitLegacyConstructionSurvey(raw: string | null | undefined): {
  instruments: string
  controlSurvey: string
  accuracy: string
  work: string
} {
  const s = String(raw ?? '').trim()
  if (!s) {
    return {
      instruments: P1_SURVEY_INSTRUMENTS_DEFAULT,
      controlSurvey: P1_CONTROL_SURVEY_DEFAULT,
      accuracy: P1_CONTROL_SURVEY_ACCURACY_REQUIREMENTS_DEFAULT,
      work: P1_CONSTRUCTION_SURVEY_WORK_DEFAULT
    }
  }

  const norm = s.replace(/\r\n/g, '\n')
  const parts = [
    { key: 'instruments', title: '壹、測量儀器' },
    { key: 'controlSurvey', title: '貳、控制測量' },
    { key: 'accuracy', title: '參、控制測量精度要求' },
    { key: 'work', title: '肆、施工測量' }
  ] as const

  const idx = parts.map((p) => norm.indexOf(p.title))
  if (idx.every((n) => n < 0)) {
    // 無標題：保留在「肆、施工測量」
    return { instruments: '', controlSurvey: '', accuracy: '', work: norm }
  }

  const out: Record<string, string> = { instruments: '', controlSurvey: '', accuracy: '', work: '' }
  for (let i = 0; i < parts.length; i++) {
    const start = idx[i]
    if (start < 0) continue
    const endCandidates = idx.slice(i + 1).filter((n) => n >= 0)
    const end = endCandidates.length ? Math.min(...endCandidates) : norm.length
    const chunk = norm.slice(start + parts[i].title.length, end).trim()
    out[parts[i].key] = chunk
  }

  return {
    instruments: out.instruments || P1_SURVEY_INSTRUMENTS_DEFAULT,
    controlSurvey: out.controlSurvey || P1_CONTROL_SURVEY_DEFAULT,
    accuracy: out.accuracy || P1_CONTROL_SURVEY_ACCURACY_REQUIREMENTS_DEFAULT,
    work: out.work || P1_CONSTRUCTION_SURVEY_WORK_DEFAULT
  }
}

function applySurveyDefaults() {
  p1SurveyInstruments.value = P1_SURVEY_INSTRUMENTS_DEFAULT
  p1ControlSurvey.value = P1_CONTROL_SURVEY_DEFAULT
  p1ControlSurveyAccuracyRequirements.value = P1_CONTROL_SURVEY_ACCURACY_REQUIREMENTS_DEFAULT
  p1ConstructionSurveyWork.value = P1_CONSTRUCTION_SURVEY_WORK_DEFAULT
  scheduleAutoSave()
}

function applyTrafficDefaults() {
  p1TrafficMaintenanceSafetyControl.value = P1_TRAFFIC_MAINTENANCE_SAFETY_CONTROL_DEFAULT
  p1VehicleAccessRoutes.value = P1_VEHICLE_ACCESS_ROUTES_DEFAULT
  scheduleAutoSave()
}

function applyTempFacilitiesDefaults() {
  const defaults = getDefaultTemporaryFacilitiesText()
  p1TempPowerEquipment.value = defaults.power
  p1TempWaterDrainageEquipment.value = defaults.water
  p1TempTelecomEquipment.value = defaults.telecom
  p1TempHousing.value = defaults.housing
  p1TempMaterialStorageProcessingArea.value = defaults.storage
  p1TempRepairYard.value = defaults.repair
  p1TempMixingPlant.value = defaults.mixing
  p1TempMaterialLab.value = defaults.lab
  p1TempConstructionRoad.value = defaults.road
  scheduleAutoSave()
}

function applyCompletionDocDefaults() {
  p1CompletionDocumentItems.value = [...P1_COMPLETION_DOCUMENT_ITEMS_DEFAULT]
  scheduleAutoSave()
}

const breadcrumbs = [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: 'P類(計劃書)表單', href: 'javascript:;' },
  { text: 'P-1 整體施工計畫', active: true }
]

function toPClassificationTableRow(row: ContractorDocumentClassification): DocumentClassification {
  return {
    id: row.id,
    constructionId: row.constructionId,
    designChangeId: row.designChangeId,
    category: row.category,
    categoryDisplayName: row.categoryDisplayName,
    itemNumber: row.itemNumber,
    documentName: row.documentName,
    retentionYears: row.retentionYears,
    requiredSubmissionSchedule: row.requiredSubmissionSchedule ?? undefined,
    isDefault: row.isDefault,
    isLocked: row.isLocked,
    constructionMajorItemId: undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy
  }
}

function currentP1CustomPPlanScheduleJson(): string {
  return JSON.stringify(
    p1CustomPPlanRows.value.map((r) => ({
      documentClassificationId: r.documentClassificationId,
      plannedConstructionDate: r.plannedConstructionDate || '',
      plannedSubmissionDate: r.plannedSubmissionDate || '',
      remark: r.remark ?? ''
    }))
  )
}

function openP1SupervisoryModal() {
  showP1SupervisoryModal.value = true
  modalP1SupervisoryDesignChangeId.value = null
  void loadP1SupervisoryPreview()
}

async function onP1ModalSupervisoryVersionChange(versionId: number | null) {
  modalP1SupervisoryDesignChangeId.value = versionId
  await loadP1SupervisoryPreview()
}

async function loadP1SupervisoryPreview() {
  const cid = currentProject.value?.id
  if (!cid) return
  p1SupervisoryPreviewLoading.value = true
  try {
    p1SupervisoryPreviewRows.value = await contractorDocumentClassificationApi.getSupervisoryBCustomPreview(
      cid,
      modalP1SupervisoryDesignChangeId.value
    )
  } catch (e) {
    console.error(e)
    p1SupervisoryPreviewRows.value = []
    window.alert('無法載入監造 B 類資料')
  } finally {
    p1SupervisoryPreviewLoading.value = false
  }
}

async function copyP1SupervisoryBToP() {
  const cid = currentProject.value?.id
  if (!cid) return
  if (
    !window.confirm(
      '確定將「目前選取之監造版本」的自訂 B 類複製到「營造目前版本」的 P 類？\n將刪除營造 P 類所有自訂列並重建，P 類預設列不變。'
    )
  ) {
    return
  }
  isP1CopyingSupervisoryToP.value = true
  try {
    await contractorDocumentClassificationApi.copySupervisoryBToContractorP(cid, {
      supervisoryDesignChangeId: modalP1SupervisoryDesignChangeId.value,
      contractorDesignChangeId: selectedDesignChangeId.value
    })
    await rebuildP1CustomPPlanRows(currentP1CustomPPlanScheduleJson())
    requestContractorPMenuSidebarRefresh()
    window.alert('已複製到營造 P 類')
    showP1SupervisoryModal.value = false
  } catch (e: any) {
    console.error(e)
    const msg = e?.response?.data?.message ?? e?.message ?? '複製失敗'
    window.alert(msg)
  } finally {
    isP1CopyingSupervisoryToP.value = false
  }
}

async function handlePClassificationAdd(data: {
  documentName: string
  retentionYears: number | null
  requiredSubmissionSchedule?: string
}) {
  const cid = currentProject.value?.id
  if (!cid) return
  try {
    await contractorDocumentClassificationApi.create(cid, selectedDesignChangeId.value, {
      category: 'P',
      documentName: data.documentName,
      retentionYears: data.retentionYears,
      requiredSubmissionSchedule: data.requiredSubmissionSchedule ?? ''
    })
    await rebuildP1CustomPPlanRows(currentP1CustomPPlanScheduleJson())
    requestContractorPMenuSidebarRefresh()
  } catch (error) {
    console.error(error)
    window.alert('新增失敗')
  }
}

async function handlePClassificationUpdate(
  id: number,
  data: {
    documentName: string
    retentionYears?: number | null
    retentionPermanent?: boolean
    requiredSubmissionSchedule?: string
  }
) {
  const cid = currentProject.value?.id
  if (!cid) return
  try {
    await contractorDocumentClassificationApi.update(cid, id, selectedDesignChangeId.value, {
      documentName: data.documentName,
      retentionYears: data.retentionPermanent ? undefined : data.retentionYears,
      retentionPermanent: data.retentionPermanent === true ? true : undefined,
      ...(data.requiredSubmissionSchedule !== undefined
        ? { requiredSubmissionSchedule: data.requiredSubmissionSchedule ?? '' }
        : {})
    })
    await rebuildP1CustomPPlanRows(currentP1CustomPPlanScheduleJson())
    requestContractorPMenuSidebarRefresh()
  } catch (error) {
    console.error(error)
    window.alert('更新失敗')
  }
}

async function handlePClassificationDelete(id: number) {
  const cid = currentProject.value?.id
  if (!cid) return
  try {
    await contractorDocumentClassificationApi.delete(cid, id, selectedDesignChangeId.value)
    await rebuildP1CustomPPlanRows(currentP1CustomPPlanScheduleJson())
    requestContractorPMenuSidebarRefresh()
  } catch (error) {
    console.error(error)
    window.alert('刪除失敗')
  }
}

async function handlePClassificationReorder(items: DocumentClassification[]) {
  const cid = currentProject.value?.id
  if (!cid || items.length === 0) return
  try {
    const batchItems = items.map((item) => ({
      id: item.id,
      itemNumber: item.itemNumber,
      documentName: item.documentName,
      retentionYears: item.retentionYears,
      ...(item.category === 'P' ? { requiredSubmissionSchedule: item.requiredSubmissionSchedule ?? '' } : {})
    }))
    await contractorDocumentClassificationApi.batchUpdate(cid, selectedDesignChangeId.value, batchItems)
    await rebuildP1CustomPPlanRows(currentP1CustomPPlanScheduleJson())
    requestContractorPMenuSidebarRefresh()
  } catch (error) {
    console.error(error)
    window.alert('排序儲存失敗')
    await rebuildP1CustomPPlanRows(currentP1CustomPPlanScheduleJson())
  }
}

async function onVersionChange(versionId: number | null) {
  selectedDesignChangeId.value = versionId
  dataReferenceDate.value = resolveVersionStartDate(versionId)
  await loadP1Text()
  await loadP1Images()
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
  if (autosaveTimer != null) {
    window.clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
  try {
    await saveP1Texts({ uploadImages: true })
  } catch {
    /* saveP1Texts 已 alert；匯出仍繼續 */
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

const imageSections = computed(() => [
  {
    type: 'P1_SITE_LOCATION_MAP' as const,
    title: '工址位置圖',
    icon: 'fa-map-location-dot',
    iconBg: 'p1img-section-icon--primary',
    countBadgeClass: 'p1img-count-badge--primary',
    list: siteLocationMapImages
  },
  {
    type: 'P1_MAIN_STANDARD_DRAWINGS' as const,
    title: '主要工程標準斷面、平立面圖',
    icon: 'fa-ruler-combined',
    iconBg: 'p1img-section-icon--warning',
    countBadgeClass: 'p1img-count-badge--warning',
    list: mainStandardDrawingsImages
  },
  {
    type: 'P1_SCHEDULED_PROJECT_PROGRESS' as const,
    title: '工程預定進度表',
    icon: 'fa-calendar-alt',
    iconBg: 'p1img-section-icon--info',
    countBadgeClass: 'p1img-count-badge--info',
    list: scheduledProjectProgressImages
  }
])

function toggleImageSection(type: P1ImageType) {
  expandedImageByType.value = { ...expandedImageByType.value, [type]: !expandedImageByType.value[type] }
}

function onPickImageFiles(e: Event, type: P1ImageType) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (files.length === 0) return
  pendingImageByType.value = { ...pendingImageByType.value, [type]: files }
}

async function loadP1Images() {
  const cid = currentProject.value?.id
  if (!cid) {
    siteLocationMapImages.value = []
    mainStandardDrawingsImages.value = []
    scheduledProjectProgressImages.value = []
    return
  }
  const [siteMaps, drawings, progress] = await Promise.all([
    listConstructionLocationMaps(cid, 'P1_SITE_LOCATION_MAP', selectedDesignChangeId.value),
    listConstructionLocationMaps(cid, 'P1_MAIN_STANDARD_DRAWINGS', selectedDesignChangeId.value),
    listConstructionLocationMaps(cid, 'P1_SCHEDULED_PROJECT_PROGRESS', selectedDesignChangeId.value)
  ])
  siteLocationMapImages.value = siteMaps
  mainStandardDrawingsImages.value = drawings
  scheduledProjectProgressImages.value = progress
}

async function uploadPendingImages(type: P1ImageType) {
  const cid = currentProject.value?.id
  if (!cid) return
  const pending = pendingImageByType.value[type]
  if (!pending || pending.length === 0) return
  isImageUploading.value = true
  try {
    await uploadConstructionLocationMaps(cid, pending, type, selectedDesignChangeId.value)
    pendingImageByType.value = { ...pendingImageByType.value, [type]: [] }
    await loadP1Images()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '上傳失敗'
    window.alert(msg)
  } finally {
    isImageUploading.value = false
  }
}

async function removeImage(type: P1ImageType, id: number) {
  const cid = currentProject.value?.id
  if (!cid) return
  deletingImageId.value = id
  try {
    await deleteConstructionLocationMap(cid, id, type, selectedDesignChangeId.value)
    await loadP1Images()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '刪除失敗'
    window.alert(msg)
  } finally {
    deletingImageId.value = null
  }
}

function getDefaultTemporaryFacilitiesText() {
  return {
    power: '本工程施工中所用施工機具除本身有引擎發動設備外，皆以另備發電機供給方式為之。',
    water: '購買礦泉水方式供給生活用水。另本公司自有灑水車供工程用水。（混凝土拌合用水除外）。',
    telecom: '工地間之聯絡以行動電話或無線對講機等。',
    housing:
      '本工程租用民宅，住址為XXX做為工地工務所。另工區內則擺放一個二十呎貨櫃充工地臨時辦公室及倉庫。',
    storage: '將以施工便道上4.5-8m寬、長50m當臨時材料堆置場及加工區之範圍暫置。',
    repair: '本工程無修護場。',
    mixing: '本工程水泥混凝土由XXX處理。',
    lab: '本工程材料試驗由XXX執行。',
    road: '本工程施工道路為XXX，施工時並不會占用道路。'
  }
}

function parseP1CustomPPlanSaved(
  json: string | null | undefined
): Map<number, { plannedConstructionDate: string; plannedSubmissionDate: string; remark: string }> {
  const m = new Map<number, { plannedConstructionDate: string; plannedSubmissionDate: string; remark: string }>()
  if (!json || !String(json).trim()) return m
  try {
    const arr = JSON.parse(json) as Array<{
      documentClassificationId?: number
      plannedConstructionDate?: string
      plannedSubmissionDate?: string
      remark?: string
    }>
    if (!Array.isArray(arr)) return m
    for (const r of arr) {
      if (r && typeof r.documentClassificationId === 'number') {
        m.set(r.documentClassificationId, {
          plannedConstructionDate: r.plannedConstructionDate ?? '',
          plannedSubmissionDate: r.plannedSubmissionDate ?? '',
          remark: r.remark ?? ''
        })
      }
    }
  } catch {
    /* ignore */
  }
  return m
}

async function rebuildP1CustomPPlanRows(savedJson: string | null | undefined) {
  const cid = currentProject.value?.id
  if (!cid) {
    p1CustomPPlanRows.value = []
    pClassificationItems.value = []
    return
  }
  try {
    const list = await contractorDocumentClassificationApi.getAll(cid, selectedDesignChangeId.value)
    const pSorted = list
      .filter((i) => i.category === 'P')
      .sort((a, b) => String(a.itemNumber).localeCompare(String(b.itemNumber), undefined, { numeric: true }))
    pClassificationItems.value = pSorted.map(toPClassificationTableRow)
    const custom = list
      .filter((i) => i.category === 'P' && !i.isDefault)
      .sort((a, b) => {
        const na = parseInt(a.itemNumber, 10)
        const nb = parseInt(b.itemNumber, 10)
        if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
        return String(a.itemNumber).localeCompare(String(b.itemNumber), undefined, { numeric: true })
      })
    const byId = parseP1CustomPPlanSaved(savedJson)
    p1CustomPPlanRows.value = custom.map((item, idx) => {
      const s = byId.get(item.id) ?? {
        plannedConstructionDate: '',
        plannedSubmissionDate: '',
        remark: ''
      }
      return {
        documentClassificationId: item.id,
        sequence: idx + 1,
        planName: item.documentName,
        plannedConstructionDate: s.plannedConstructionDate,
        plannedSubmissionDate: s.plannedSubmissionDate,
        remark: s.remark
      }
    })
  } catch {
    p1CustomPPlanRows.value = []
    pClassificationItems.value = []
  }
}

async function loadP1Text() {
  const cid = currentProject.value?.id
  const wid = currentProject.value?.workspaceId
  if (!cid || !wid) {
    p1ConstructionScaleOverview.value = ''
    p1ConstructionExecutionDirection.value = ''
    p1ConstructionProcessOverview.value = ''
    p1ConstructionProcessFlowJson.value = ''
    p1GeologyOverview.value = ''
    p1SiteCurrentConditionSurvey.value = ''
    p1UndergroundUtilitiesSurvey.value = ''
    p1MeteorologyHydrology.value = ''
    p1NeighboringBuildingSurvey.value = ''
    p1MechanicalResources.value = []
    p1ManpowerEntrySchedule.value = []
    p1CustomPPlanRows.value = []
    pClassificationItems.value = []
    p1MaterialMarketSurvey.value = ''
    p1ProgressDelayThresholdPercent.value = 10
    p1PreConstructionCoordinationMeeting.value = ''
    p1RegularMeetingFrequency.value = ''
    p1SafetyHealthTrainingHeadcount.value = P1_SAFETY_HEALTH_TRAINING_HEADCOUNT_DEFAULT
    p1TrafficMaintenanceSafetyControl.value = P1_TRAFFIC_MAINTENANCE_SAFETY_CONTROL_DEFAULT
    p1VehicleAccessRoutes.value = P1_VEHICLE_ACCESS_ROUTES_DEFAULT
    p1CompletionDocumentItems.value = [...decodeP1CompletionDocumentItems(undefined)]
    const defaults = getDefaultTemporaryFacilitiesText()
    p1TempPowerEquipment.value = defaults.power
    p1TempWaterDrainageEquipment.value = defaults.water
    p1TempTelecomEquipment.value = defaults.telecom
    p1TempHousing.value = defaults.housing
    p1TempMaterialStorageProcessingArea.value = defaults.storage
    p1TempRepairYard.value = defaults.repair
    p1TempMixingPlant.value = defaults.mixing
    p1TempMaterialLab.value = defaults.lab
    p1TempConstructionRoad.value = defaults.road
    p1ConstructionSurvey.value = P1_CONSTRUCTION_SURVEY_DEFAULT
    p1SurveyInstruments.value = P1_SURVEY_INSTRUMENTS_DEFAULT
    p1ControlSurvey.value = P1_CONTROL_SURVEY_DEFAULT
    p1ControlSurveyAccuracyRequirements.value = P1_CONTROL_SURVEY_ACCURACY_REQUIREMENTS_DEFAULT
    p1ConstructionSurveyWork.value = P1_CONSTRUCTION_SURVEY_WORK_DEFAULT
    p1SurroundingDrainageSystem.value = P1_SURROUNDING_DRAINAGE_SYSTEM_DEFAULT
    p1ConstructionDewateringMeasures.value = P1_CONSTRUCTION_DEWATERING_MEASURES_DEFAULT
    p1EmergencyContactBundle.value = defaultP1EmergencyContactBundle()
    return
  }
  isTextLoading.value = true
  try {
    const data = await getConstructionDetail(cid, wid, 'CONTRACTOR', selectedDesignChangeId.value)
    skipAutoSave = true
    p1ConstructionScaleOverview.value = data.p1ConstructionScaleOverview ?? ''
    p1ConstructionExecutionDirection.value = data.p1ConstructionExecutionDirection ?? ''
    p1ConstructionProcessOverview.value = data.p1ConstructionProcessOverview ?? ''
    p1ConstructionProcessFlowJson.value = data.p1ConstructionProcessFlowJson ?? ''
    p1GeologyOverview.value = data.p1GeologyOverview ?? ''
    p1SiteCurrentConditionSurvey.value = data.p1SiteCurrentConditionSurvey ?? ''
    p1UndergroundUtilitiesSurvey.value = data.p1UndergroundUtilitiesSurvey ?? ''
    p1MeteorologyHydrology.value = data.p1MeteorologyHydrology ?? ''
    p1NeighboringBuildingSurvey.value = data.p1NeighboringBuildingSurvey ?? ''
    p1MechanicalResources.value = parseMechanicalResources(data.p1MechanicalResourcesJson)
    const manpowerRows = parseManpowerEntrySchedule(data.p1ManpowerEntryScheduleJson)
    p1ManpowerEntrySchedule.value = normalizeManpowerEntrySchedule(manpowerRows)
    await loadManpowerDefaultHintByReferenceDate()
    p1MaterialMarketSurvey.value = data.p1MaterialMarketSurvey ?? ''
    const parsedThreshold = Number(data.p1ProgressDelayThresholdPercent ?? 10)
    p1ProgressDelayThresholdPercent.value = Number.isFinite(parsedThreshold) ? parsedThreshold : 10
    p1PreConstructionCoordinationMeeting.value = data.p1PreConstructionCoordinationMeeting ?? ''
    p1RegularMeetingFrequency.value = data.p1RegularMeetingFrequency ?? ''
    const rawHc = data.p1SafetyHealthTrainingHeadcount
    p1SafetyHealthTrainingHeadcount.value =
      rawHc !== undefined && rawHc !== null && Number.isFinite(Number(rawHc))
        ? Number(rawHc)
        : P1_SAFETY_HEALTH_TRAINING_HEADCOUNT_DEFAULT
    p1TrafficMaintenanceSafetyControl.value =
      data.p1TrafficMaintenanceSafetyControl ?? P1_TRAFFIC_MAINTENANCE_SAFETY_CONTROL_DEFAULT
    p1VehicleAccessRoutes.value = data.p1VehicleAccessRoutes ?? P1_VEHICLE_ACCESS_ROUTES_DEFAULT
    p1CompletionDocumentItems.value = decodeP1CompletionDocumentItems(data.p1CompletionDocumentSubmissionItems)
    const defaults = getDefaultTemporaryFacilitiesText()
    p1TempPowerEquipment.value = data.p1TempPowerEquipment ?? defaults.power
    p1TempWaterDrainageEquipment.value = data.p1TempWaterDrainageEquipment ?? defaults.water
    p1TempTelecomEquipment.value = data.p1TempTelecomEquipment ?? defaults.telecom
    p1TempHousing.value = data.p1TempHousing ?? defaults.housing
    p1TempMaterialStorageProcessingArea.value = data.p1TempMaterialStorageProcessingArea ?? defaults.storage
    p1TempRepairYard.value = data.p1TempRepairYard ?? defaults.repair
    p1TempMixingPlant.value = data.p1TempMixingPlant ?? defaults.mixing
    p1TempMaterialLab.value = data.p1TempMaterialLab ?? defaults.lab
    p1TempConstructionRoad.value = data.p1TempConstructionRoad ?? defaults.road
    p1ConstructionSurvey.value = data.p1ConstructionSurvey ?? P1_CONSTRUCTION_SURVEY_DEFAULT
    {
      const hasAnyNewField =
        data.p1SurveyInstruments !== undefined ||
        data.p1ControlSurvey !== undefined ||
        data.p1ControlSurveyAccuracyRequirements !== undefined ||
        data.p1ConstructionSurveyWork !== undefined
      const legacy = splitLegacyConstructionSurvey(data.p1ConstructionSurvey)
      // 只在「第一次」(後端欄位為 null/undefined) 才帶入預設/舊欄位切段
      p1SurveyInstruments.value =
        (data.p1SurveyInstruments ?? (hasAnyNewField ? '' : legacy.instruments)) as string
      p1ControlSurvey.value = (data.p1ControlSurvey ?? (hasAnyNewField ? '' : legacy.controlSurvey)) as string
      p1ControlSurveyAccuracyRequirements.value =
        (data.p1ControlSurveyAccuracyRequirements ?? (hasAnyNewField ? '' : legacy.accuracy)) as string
      p1ConstructionSurveyWork.value =
        (data.p1ConstructionSurveyWork ?? (hasAnyNewField ? '' : legacy.work)) as string
    }
    p1SurroundingDrainageSystem.value =
      data.p1SurroundingDrainageSystem ?? P1_SURROUNDING_DRAINAGE_SYSTEM_DEFAULT
    p1ConstructionDewateringMeasures.value =
      data.p1ConstructionDewateringMeasures ?? P1_CONSTRUCTION_DEWATERING_MEASURES_DEFAULT
    await rebuildP1CustomPPlanRows(data.p1CustomPPlanScheduleJson)
    p1EmergencyContactBundle.value = parseP1EmergencyContactBundle(data.p1EmergencyContactTableJson ?? '')
    skipAutoSave = false
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '載入失敗'
    window.alert(msg)
  } finally {
    skipAutoSave = false
    isTextLoading.value = false
  }
}

async function saveP1Texts(opts?: { uploadImages?: boolean }) {
  if (isSavingTexts.value) {
    pendingSave = true
    if (opts?.uploadImages) pendingUploadImages = true
    return
  }
  const cid = currentProject.value?.id
  if (!cid) return
  isSavingTexts.value = true
  try {
    await updateConstruction(
      cid,
      {
        p1ConstructionScaleOverview: p1ConstructionScaleOverview.value,
        p1ConstructionExecutionDirection: p1ConstructionExecutionDirection.value,
        p1ConstructionProcessOverview: p1ConstructionProcessOverview.value,
        p1ConstructionProcessFlowJson: p1ConstructionProcessFlowJson.value,
        p1GeologyOverview: p1GeologyOverview.value,
        p1SiteCurrentConditionSurvey: p1SiteCurrentConditionSurvey.value,
        p1UndergroundUtilitiesSurvey: p1UndergroundUtilitiesSurvey.value,
        p1MeteorologyHydrology: p1MeteorologyHydrology.value,
        p1NeighboringBuildingSurvey: p1NeighboringBuildingSurvey.value,
        p1MechanicalResourcesJson: JSON.stringify(p1MechanicalResources.value),
        p1ManpowerEntryScheduleJson: JSON.stringify(p1ManpowerEntrySchedule.value),
        p1CustomPPlanScheduleJson: JSON.stringify(
          p1CustomPPlanRows.value.map((r) => ({
            documentClassificationId: r.documentClassificationId,
            plannedConstructionDate: r.plannedConstructionDate || '',
            plannedSubmissionDate: r.plannedSubmissionDate || '',
            remark: r.remark ?? ''
          }))
        ),
        p1MaterialMarketSurvey: p1MaterialMarketSurvey.value,
        p1ProgressDelayThresholdPercent: Number.isFinite(p1ProgressDelayThresholdPercent.value)
          ? p1ProgressDelayThresholdPercent.value
          : 10,
        p1PreConstructionCoordinationMeeting: p1PreConstructionCoordinationMeeting.value,
        p1RegularMeetingFrequency: p1RegularMeetingFrequency.value,
        p1SafetyHealthTrainingHeadcount: p1SafetyHealthTrainingHeadcount.value,
        p1TrafficMaintenanceSafetyControl: p1TrafficMaintenanceSafetyControl.value,
        p1VehicleAccessRoutes: p1VehicleAccessRoutes.value,
        p1CompletionDocumentSubmissionItems: encodeP1CompletionDocumentItems(p1CompletionDocumentItems.value),
        p1TempPowerEquipment: p1TempPowerEquipment.value,
        p1TempWaterDrainageEquipment: p1TempWaterDrainageEquipment.value,
        p1TempTelecomEquipment: p1TempTelecomEquipment.value,
        p1TempHousing: p1TempHousing.value,
        p1TempMaterialStorageProcessingArea: p1TempMaterialStorageProcessingArea.value,
        p1TempRepairYard: p1TempRepairYard.value,
        p1TempMixingPlant: p1TempMixingPlant.value,
        p1TempMaterialLab: p1TempMaterialLab.value,
        p1TempConstructionRoad: p1TempConstructionRoad.value,
        p1ConstructionSurvey: p1ConstructionSurvey.value,
      p1SurveyInstruments: p1SurveyInstruments.value,
      p1ControlSurvey: p1ControlSurvey.value,
      p1ControlSurveyAccuracyRequirements: p1ControlSurveyAccuracyRequirements.value,
      p1ConstructionSurveyWork: p1ConstructionSurveyWork.value,
        p1SurroundingDrainageSystem: p1SurroundingDrainageSystem.value,
        p1ConstructionDewateringMeasures: p1ConstructionDewateringMeasures.value,
        p1EmergencyContactTableJson: stringifyP1EmergencyContactBundle(p1EmergencyContactBundle.value)
      } as any,
      selectedDesignChangeId.value
    )

    // 圖片上傳（html2canvas 截圖）成本高且會造成畫面抖動：僅在匯出前等「明確需要」時執行
    if (opts?.uploadImages) {
      try {
        const b102: Blob | undefined = await p1ContactFiguresRef.value?.exportFig102PngBlob?.()
        if (b102) await uploadP1EmergencyContactFigureImage(cid, 102, b102, selectedDesignChangeId.value)
        const b103: Blob | undefined = await p1ContactFiguresRef.value?.exportFig103PngBlob?.()
        if (b103) await uploadP1EmergencyContactFigureImage(cid, 103, b103, selectedDesignChangeId.value)
        const b103t: Blob | undefined = await p1ContactFiguresRef.value?.exportFig103TablePngBlob?.()
        if (b103t) await uploadP1EmergencyContactFigureImage(cid, 104, b103t, selectedDesignChangeId.value)
        const bFlow: Blob | null | undefined = await p1FlowEditorRef.value?.exportFlowPreviewPngBlob?.()
        if (bFlow) await uploadP1ConstructionProcessFlowImage(cid, bFlow, selectedDesignChangeId.value)
      } catch (e: any) {
        console.warn('upload P-1 emergency contact figure / process flow images failed', e)
      }
    }
  } finally {
    isSavingTexts.value = false
    if (pendingSave) {
      const nextUpload = pendingUploadImages
      pendingSave = false
      pendingUploadImages = false
      void saveP1Texts({ uploadImages: nextUpload })
    }
  }
}

function addP1CompletionDocumentRow() {
  p1CompletionDocumentItems.value.push('')
  scheduleAutoSave()
}

function removeP1CompletionDocumentRow(idx: number) {
  if (p1CompletionDocumentItems.value.length <= 1) return
  p1CompletionDocumentItems.value.splice(idx, 1)
  scheduleAutoSave()
}

function onP1SafetyTrainingHeadcountInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim()
  if (raw === '') {
    // 使用者清空：維持空值，不自動帶入預設
    p1SafetyHealthTrainingHeadcount.value = null
  } else {
    const n = parseInt(raw, 10)
    p1SafetyHealthTrainingHeadcount.value =
      Number.isFinite(n) && n >= 0 ? n : null
  }
  scheduleAutoSave()
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
  }, 1500)
}

async function generateConstructionProcessOverviewByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  aiLoading.value.processOverview = true
  try {
    const res = await getP1ConstructionProcessOverviewAiGenerate(cid, selectedDesignChangeId.value)
    const text = res?.text?.trim() ?? ''
    if (!text) {
      window.alert('目前版本無標單或分項資料，或 工程案資料建構未產出內容。請先維護標單／分項工程。')
      return
    }
    p1ConstructionProcessOverview.value = text
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    aiLoading.value.processOverview = false
    isAiGenerating.value = false
  }
}

async function generateConstructionProcessFlowByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  aiLoading.value.processFlow = true
  try {
    const res = await getP1ConstructionProcessFlowAiGenerate(cid, selectedDesignChangeId.value)
    const flowJson = res?.flowJson?.trim() ?? ''
    if (!flowJson) {
      window.alert('目前版本無標單或分項資料，或 工程案資料建構未產出內容。請先維護標單／分項工程。')
      return
    }
    p1ConstructionProcessFlowJson.value = flowJson
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    aiLoading.value.processFlow = false
    isAiGenerating.value = false
  }
}

async function generateByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  aiLoading.value.scaleOverview = true
  try {
    const res = await getP1TextAiGenerate(cid, selectedDesignChangeId.value)
    const text = res?.text?.trim() ?? ''
    if (!text) {
      window.alert('目前版本無標單資料，或 工程案資料建構未產出內容。請先匯入標單或手動填寫。')
      return
    }
    p1ConstructionScaleOverview.value = text
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    aiLoading.value.scaleOverview = false
    isAiGenerating.value = false
  }
}

async function generateConstructionExecutionDirectionByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  aiLoading.value.executionDirection = true
  try {
    const res = await getP1ConstructionExecutionDirectionAiGenerate(cid, selectedDesignChangeId.value)
    const text = res?.text?.trim() ?? ''
    if (!text) {
      window.alert('目前版本無標單資料，或 工程案資料建構未產出內容。請先匯入標單或手動填寫。')
      return
    }
    p1ConstructionExecutionDirection.value = text
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    aiLoading.value.executionDirection = false
    isAiGenerating.value = false
  }
}

async function generateDrainageAreaByAi(field: P1DrainageAreaAiField) {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  if (field === 'SURROUNDING_SYSTEM') aiLoading.value.drainageSurrounding = true
  if (field === 'DEWATERING_MEASURES') aiLoading.value.drainageDewatering = true
  try {
    const res = await getP1DrainageAreaAiGenerate(cid, field, selectedDesignChangeId.value)
    const text = res?.text?.trim() ?? ''
    if (!text) {
      window.alert('請先確認工程地點，或匯入標單／分項工程資料後再試。')
      return
    }
    if (field === 'SURROUNDING_SYSTEM') p1SurroundingDrainageSystem.value = text
    if (field === 'DEWATERING_MEASURES') p1ConstructionDewateringMeasures.value = text
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    aiLoading.value.drainageSurrounding = false
    aiLoading.value.drainageDewatering = false
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
      window.alert('工程地址為空，或 工程案資料建構未產出內容。請先確認工程地點。')
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
      endDate: (it?.endDate ?? '').toString(),
      isPreset: it?.isPreset === true
    }))
  } catch {
    return []
  }
}

function getDefaultManpowerEntrySchedule(): ManpowerScheduleRow[] {
  return [
    { resourceName: '工地主任', groupName: '人力', maxAvailable: '', startDate: '', endDate: '', isPreset: true },
    { resourceName: '品管工程師', groupName: '人力', maxAvailable: '', startDate: '', endDate: '', isPreset: true },
    { resourceName: '職業安全衛生管理人員', groupName: '人力', maxAvailable: '', startDate: '', endDate: '', isPreset: true },
    { resourceName: '現場工程師', groupName: '人力', maxAvailable: '', startDate: '', endDate: '', isPreset: true }
  ]
}

function normalizeManpowerEntrySchedule(rows: ManpowerScheduleRow[]): ManpowerScheduleRow[] {
  const presetOrder = getDefaultManpowerEntrySchedule()
  const presetNames = new Set(presetOrder.map((r) => r.resourceName))

  if (rows.length === 0) return presetOrder

  const filledPreset = new Map<string, ManpowerScheduleRow>()
  const extras: ManpowerScheduleRow[] = []

  for (const r of rows) {
    const name = r.resourceName.trim()
    const isExplicitPreset = r.isPreset === true
    const nameIsPresetSlot = presetNames.has(name)

    if (isExplicitPreset && nameIsPresetSlot) {
      const tmpl = presetOrder.find((p) => p.resourceName === name)!
      filledPreset.set(name, {
        resourceName: tmpl.resourceName,
        groupName: ((r.groupName || tmpl.groupName) ?? '').toString(),
        maxAvailable: (r.maxAvailable ?? '').toString(),
        startDate: (r.startDate ?? '').toString(),
        endDate: (r.endDate ?? '').toString(),
        isPreset: true
      })
      continue
    }
    if (!isExplicitPreset && nameIsPresetSlot && !filledPreset.has(name)) {
      const tmpl = presetOrder.find((p) => p.resourceName === name)!
      filledPreset.set(name, {
        resourceName: tmpl.resourceName,
        groupName: ((r.groupName || tmpl.groupName) ?? '').toString(),
        maxAvailable: (r.maxAvailable ?? '').toString(),
        startDate: (r.startDate ?? '').toString(),
        endDate: (r.endDate ?? '').toString(),
        isPreset: true
      })
      continue
    }
    extras.push({
      resourceName: r.resourceName,
      groupName: (r.groupName ?? '').toString(),
      maxAvailable: (r.maxAvailable ?? '').toString(),
      startDate: (r.startDate ?? '').toString(),
      endDate: (r.endDate ?? '').toString(),
      isPreset: false
    })
  }

  const presetsOut = presetOrder.map((tmpl) => {
    const merged = filledPreset.get(tmpl.resourceName)
    if (merged) return merged
    return { ...tmpl, isPreset: true }
  })

  return [...presetsOut, ...extras]
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
    endDate: '',
    isPreset: false
  })
  scheduleAutoSave()
}

function removeManpowerRow(index: number) {
  if (p1ManpowerEntrySchedule.value[index]?.isPreset === true) return
  p1ManpowerEntrySchedule.value.splice(index, 1)
  scheduleAutoSave()
}

async function fillManpowerFromSubdivisionsByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  try {
    const res = await getP1ManpowerFromSubdivisionsAiGenerate(cid, selectedDesignChangeId.value)
    const rows = res?.rows ?? []
    if (rows.length === 0) {
      window.alert('目前版本尚無分項工程資料，請先維護分項工程。')
      return
    }
    const existingNames = new Set(
      p1ManpowerEntrySchedule.value.map((r) => r.resourceName.trim()).filter((n) => n.length > 0)
    )
    const toAdd: ManpowerScheduleRow[] = []
    for (const r of rows) {
      const name = (r.resourceName ?? '').toString().trim()
      if (!name || existingNames.has(name)) continue
      existingNames.add(name)
      toAdd.push({
        resourceName: name,
        groupName: (r.groupName ?? '').toString(),
        maxAvailable: '',
        startDate: '',
        endDate: '',
        isPreset: false
      })
    }
    if (toAdd.length === 0) {
      window.alert('表中已包含所有分項對應之資源名稱，未新增列（既有資料未變更）。')
      return
    }
    p1ManpowerEntrySchedule.value.push(...toAdd)
    await saveP1Texts()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗，請稍後再試。'
    window.alert(msg)
  } finally {
    isAiGenerating.value = false
  }
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
      window.alert('目前版本無標單資料，或 工程案資料建構未產出內容。')
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
      window.alert('目前版本無標單資料，或 工程案資料建構未產出內容。')
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

/**
 * 一鍵工程案資料建構（P-1）
 *
 * 設計目標
 * - 並行呼叫頁面上所有可由 工程案資料建構的欄位 / 表格，最後一次性 saveP1Texts，
 *   避免 11 個個別函式各自 PUT 造成的 race condition 與多餘的網路往返。
 * - 整段流程由 isAiGenerating 維持 true，使用者看到一個完整的 工程案資料建構中遮罩；
 *   個別欄位的 aiLoading.* 也同步點亮，讓視覺進度與既有按鈕一致。
 * - 任一項目失敗只影響該項目，其餘成功項目仍會被套用並儲存；
 *   失敗清單於結束時以單一 alert 呈現，避免反覆彈窗打斷使用者。
 *
 * 涵蓋項目（與既有單欄按鈕一一對應）
 * 1. 工程規模概述 / 2. 施工執行方向 / 3. 施工流程概述 / 4. 施工流程圖
 * 5. 地質概述 / 6. 氣候水文概述
 * 7. 周邊排水系統 / 8. 工區排水措施
 * 9. 人力資源預定進場時間表（依分項補列，已存在的不重複）
 * 10. 施工機械設備資源（依標單覆蓋整張表）
 * 11. 物料市場調查
 */
async function generateAllByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  if (isAiGenerating.value) return
  const dcid = selectedDesignChangeId.value

  if (autosaveTimer != null) {
    window.clearTimeout(autosaveTimer)
    autosaveTimer = null
  }

  isAiGenerating.value = true
  aiLoading.value.scaleOverview = true
  aiLoading.value.executionDirection = true
  aiLoading.value.processOverview = true
  aiLoading.value.processFlow = true
  aiLoading.value.geology = true
  aiLoading.value.meteo = true
  aiLoading.value.drainageSurrounding = true
  aiLoading.value.drainageDewatering = true

  type AiLoadingKey = keyof typeof aiLoading.value
  type BatchResult = { ok: boolean; reason?: string }
  type BatchSpec = {
    label: string
    loadingKey?: AiLoadingKey
    run: () => Promise<BatchResult>
  }

  const specs: BatchSpec[] = [
    {
      label: '工程規模概述',
      loadingKey: 'scaleOverview',
      run: async () => {
        const res = await getP1TextAiGenerate(cid, dcid)
        const t = res?.text?.trim() ?? ''
        if (!t) return { ok: false, reason: '無內容（請先匯入標單或手動填寫）' }
        p1ConstructionScaleOverview.value = t
        return { ok: true }
      },
    },
    {
      label: '施工執行方向',
      loadingKey: 'executionDirection',
      run: async () => {
        const res = await getP1ConstructionExecutionDirectionAiGenerate(cid, dcid)
        const t = res?.text?.trim() ?? ''
        if (!t) return { ok: false, reason: '無內容（請先匯入標單或手動填寫）' }
        p1ConstructionExecutionDirection.value = t
        return { ok: true }
      },
    },
    {
      label: '施工流程概述',
      loadingKey: 'processOverview',
      run: async () => {
        const res = await getP1ConstructionProcessOverviewAiGenerate(cid, dcid)
        const t = res?.text?.trim() ?? ''
        if (!t) return { ok: false, reason: '無內容（請先維護標單／分項工程）' }
        p1ConstructionProcessOverview.value = t
        return { ok: true }
      },
    },
    {
      label: '施工流程圖',
      loadingKey: 'processFlow',
      run: async () => {
        const res = await getP1ConstructionProcessFlowAiGenerate(cid, dcid)
        const flow = res?.flowJson?.trim() ?? ''
        if (!flow) return { ok: false, reason: '無內容（請先維護標單／分項工程）' }
        p1ConstructionProcessFlowJson.value = flow
        return { ok: true }
      },
    },
    {
      label: '地質概述',
      loadingKey: 'geology',
      run: async () => {
        const res = await getP1SiteJudgementAiGenerate(cid, 'GEOLOGY_OVERVIEW', dcid)
        const t = res?.text?.trim() ?? ''
        if (!t) return { ok: false, reason: '工程地址為空或 工程案資料建構未產出內容' }
        p1GeologyOverview.value = t
        return { ok: true }
      },
    },
    {
      label: '氣候水文概述',
      loadingKey: 'meteo',
      run: async () => {
        const res = await getP1SiteJudgementAiGenerate(cid, 'METEOROLOGY_HYDROLOGY', dcid)
        const t = res?.text?.trim() ?? ''
        if (!t) return { ok: false, reason: '工程地址為空或 工程案資料建構未產出內容' }
        p1MeteorologyHydrology.value = t
        return { ok: true }
      },
    },
    {
      label: '周邊排水系統',
      loadingKey: 'drainageSurrounding',
      run: async () => {
        const res = await getP1DrainageAreaAiGenerate(cid, 'SURROUNDING_SYSTEM', dcid)
        const t = res?.text?.trim() ?? ''
        if (!t) return { ok: false, reason: '請確認工程地點與標單／分項資料' }
        p1SurroundingDrainageSystem.value = t
        return { ok: true }
      },
    },
    {
      label: '工區排水措施',
      loadingKey: 'drainageDewatering',
      run: async () => {
        const res = await getP1DrainageAreaAiGenerate(cid, 'DEWATERING_MEASURES', dcid)
        const t = res?.text?.trim() ?? ''
        if (!t) return { ok: false, reason: '請確認工程地點與標單／分項資料' }
        p1ConstructionDewateringMeasures.value = t
        return { ok: true }
      },
    },
    {
      label: '人力資源預定進場時間表',
      run: async () => {
        const res = await getP1ManpowerFromSubdivisionsAiGenerate(cid, dcid)
        const rows = res?.rows ?? []
        if (rows.length === 0) return { ok: false, reason: '尚無分項工程資料' }
        const existingNames = new Set(
          p1ManpowerEntrySchedule.value
            .map((r) => r.resourceName.trim())
            .filter((n) => n.length > 0),
        )
        const toAdd: ManpowerScheduleRow[] = []
        for (const r of rows) {
          const name = (r.resourceName ?? '').toString().trim()
          if (!name || existingNames.has(name)) continue
          existingNames.add(name)
          toAdd.push({
            resourceName: name,
            groupName: (r.groupName ?? '').toString(),
            maxAvailable: '',
            startDate: '',
            endDate: '',
            isPreset: false,
          })
        }
        if (toAdd.length === 0) {
          return { ok: false, reason: '既有資料已包含全部分項，未新增列' }
        }
        p1ManpowerEntrySchedule.value.push(...toAdd)
        return { ok: true }
      },
    },
    {
      label: '施工機械設備資源',
      run: async () => {
        const res = await getP1MechanicalResourcesAiGenerate(cid, dcid)
        const names = (res?.names || [])
          .map((v) => (v ?? '').toString().trim())
          .filter((v) => v.length > 0)
        if (names.length === 0) return { ok: false, reason: '無內容（請先匯入標單）' }
        p1MechanicalResources.value = names.map((name) => ({
          resourceName: name,
          maxAvailable: '',
          startDate: '',
          endDate: '',
        }))
        return { ok: true }
      },
    },
    {
      label: '物料市場調查',
      run: async () => {
        const res = await getP1MaterialMarketSurveyAiGenerate(cid, dcid)
        const t = res?.text?.trim() ?? ''
        if (!t) return { ok: false, reason: '無內容（請先匯入標單）' }
        p1MaterialMarketSurvey.value = t
        return { ok: true }
      },
    },
  ]

  const failed: string[] = []
  let hadAny = false

  try {
    const results = await Promise.allSettled(specs.map((s) => s.run()))
    results.forEach((r, idx) => {
      const spec = specs[idx]
      if (spec.loadingKey) aiLoading.value[spec.loadingKey] = false
      if (r.status === 'fulfilled') {
        const value: BatchResult = r.value
        if (value.ok) {
          hadAny = true
        } else {
          failed.push(`${spec.label}（${value.reason ?? '未產出內容'}）`)
        }
      } else {
        const e: any = r.reason
        const msg =
          e?.response?.data?.error || e?.response?.data?.detail || e?.message || '生成失敗'
        failed.push(`${spec.label}（${msg}）`)
      }
    })

    if (hadAny) {
      await saveP1Texts()
    }

    if (failed.length > 0 && typeof window.alert === 'function') {
      window.alert(
        '部分項目未生成（其餘已成功生成並儲存）：\n- '
          + failed.join('\n- ')
          + '\n\n可單獨重試失敗項目，或先補齊標單／分項工程／工程地點等資料後再執行一鍵工程案資料建構。',
      )
    }
  } catch (e: any) {
    const msg =
      e?.response?.data?.error
      || e?.response?.data?.detail
      || e?.message
      || '一鍵工程案資料建構過程發生錯誤'
    if (typeof window.alert === 'function') window.alert(msg)
  } finally {
    aiLoading.value.scaleOverview = false
    aiLoading.value.executionDirection = false
    aiLoading.value.processOverview = false
    aiLoading.value.processFlow = false
    aiLoading.value.geology = false
    aiLoading.value.meteo = false
    aiLoading.value.drainageSurrounding = false
    aiLoading.value.drainageDewatering = false
    isAiGenerating.value = false
  }
}

watch(
  [() => currentProject.value?.id, () => currentProject.value?.workspaceId, selectedDesignChangeId],
  () => {
    if (!hasCurrentProject.value || !isContractor.value) {
      p1ConstructionScaleOverview.value = ''
      p1ConstructionExecutionDirection.value = ''
      p1ConstructionProcessOverview.value = ''
      p1ConstructionProcessFlowJson.value = ''
      siteLocationMapImages.value = []
      mainStandardDrawingsImages.value = []
      scheduledProjectProgressImages.value = []
      pendingImageByType.value = {
        P1_SITE_LOCATION_MAP: [],
        P1_MAIN_STANDARD_DRAWINGS: [],
        P1_SCHEDULED_PROJECT_PROGRESS: []
      }
      manpowerDefaultHint.value = ''
      pClassificationItems.value = []
      return
    }
    void loadP1Text()
    void loadP1Images()
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
    p1ConstructionExecutionDirection,
    p1ConstructionProcessOverview,
    p1ConstructionProcessFlowJson,
    p1GeologyOverview,
    p1SiteCurrentConditionSurvey,
    p1UndergroundUtilitiesSurvey,
    p1MeteorologyHydrology,
    p1NeighboringBuildingSurvey,
    p1MechanicalResources,
    p1ManpowerEntrySchedule,
    p1MaterialMarketSurvey,
    p1ProgressDelayThresholdPercent,
    p1PreConstructionCoordinationMeeting,
    p1RegularMeetingFrequency,
    p1SafetyHealthTrainingHeadcount,
    p1VehicleAccessRoutes,
    p1CompletionDocumentItems,
    p1TempPowerEquipment,
    p1TempWaterDrainageEquipment,
    p1TempTelecomEquipment,
    p1TempHousing,
    p1TempMaterialStorageProcessingArea,
    p1TempRepairYard,
    p1TempMixingPlant,
    p1TempMaterialLab,
    p1TempConstructionRoad,
    p1ConstructionSurvey,
    p1SurveyInstruments,
    p1ControlSurvey,
    p1ControlSurveyAccuracyRequirements,
    p1ConstructionSurveyWork,
    p1SurroundingDrainageSystem,
    p1ConstructionDewateringMeasures,
    p1EmergencyContactBundle
  ],
  () => {
    scheduleAutoSave()
  },
  { deep: true }
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
.p1-survey-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  tab-size: 2;
}
.btn-default-fill--sm {
  white-space: nowrap;
  padding: 0.25rem 0.55rem;
  font-size: 0.85rem;
  line-height: 1.2;
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
.p1-batch-ai-btn {
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
.p1-resource-table input.form-control,
.p1-resource-table textarea.form-control {
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
}
.p1-completion-doc-table-wrap {
  max-height: none;
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
.p1img-sections { display: grid; gap: 0.9rem; }
.p1img-section-card {
  border-radius: 0.8rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(2, 6, 23, 0.22);
}
.p1img-section-card__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  border: 0;
  color: inherit;
  background: rgba(15, 23, 42, 0.58);
  cursor: pointer;
}
.p1img-section-card__header-left { display: flex; align-items: center; gap: 0.75rem; }
.p1img-section-icon {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.65rem;
  display: grid;
  place-items: center;
  color: white;
}
.p1img-section-icon--primary { background: linear-gradient(135deg, rgba(var(--bs-primary-rgb), 0.9), rgba(var(--bs-primary-rgb), 0.5)); }
.p1img-section-icon--warning { background: linear-gradient(135deg, rgba(var(--bs-warning-rgb), 0.9), rgba(var(--bs-warning-rgb), 0.5)); }
.p1img-section-icon--info { background: linear-gradient(135deg, rgba(var(--bs-info-rgb), 0.9), rgba(var(--bs-info-rgb), 0.5)); }
.p1img-section-title { font-weight: 700; color: rgba(226, 232, 240, 0.94); }
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
.p1img-count-badge--primary { border-color: rgba(var(--bs-primary-rgb), 0.35); }
.p1img-count-badge--warning { border-color: rgba(var(--bs-warning-rgb), 0.35); }
.p1img-count-badge--info { border-color: rgba(var(--bs-info-rgb), 0.35); }
.p1img-section-card__body { padding: 0.85rem; }
.p1img-section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.7rem;
}
.p1img-pending-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.62rem;
  border-radius: 999px;
  border: 1px solid rgba(var(--bs-primary-rgb), 0.28);
  background: rgba(var(--bs-primary-rgb), 0.12);
}
.p1img-file-pick { position: relative; }
.p1img-file-pick__input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.p1img-file-pick__btn.disabled { opacity: 0.55; pointer-events: none; }
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
/* 固定預覽區高度，圖片等比例縮放置中（不裁切） */
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

/* P 類分類表內嵌日期／備註欄（與下方資源表深色輸入一致） */
.p1-p-classification-block :deep(.p1-plan-sched-remark),
.p1-p-classification-block :deep(.p1-plan-sched-cell .form-control:not(.dp__input)) {
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
}
.p1-p-classification-block :deep(.p1-plan-sched-cell .p1-date-input),
.p1-p-classification-block :deep(.p1-plan-sched-cell .p1-date-input input) {
  background: rgba(0, 0, 0, 0.18) !important;
  border-color: rgba(255, 255, 255, 0.18) !important;
  color: rgba(255, 255, 255, 0.92) !important;
}
.p1-p-classification-block :deep(.p1-plan-sched-cell .p1-date-input .dp__input) {
  text-align: left !important;
  padding-left: 2rem !important;
  padding-right: 0.75rem !important;
}
.p1-p-classification-block :deep(.p1-plan-sched-cell .p1-date-input .dp__input_icon) {
  left: 0.6rem !important;
  right: auto !important;
  z-index: 0 !important;
}

.supervisory-preview-report-card {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  color: var(--bs-body-color);
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.375rem;
  overflow: hidden;
}

.supervisory-preview-report-card__body {
  padding: 0;
}

.contractor-supervisory-modal-title {
  font-size: 1.1rem;
  line-height: 1.3;
}

/* 人力結構圖預覽：限制高度避免 modal-body 出現捲軸 */
.p1-manpower-structure-preview-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  max-height: min(48vh, calc(100vh - 12rem));
  overflow: hidden;
}
.p1-manpower-structure-preview-img {
  display: block;
  max-width: 100%;
  max-height: min(48vh, calc(100vh - 12rem));
  width: auto;
  height: auto;
  object-fit: contain;
}
</style>
