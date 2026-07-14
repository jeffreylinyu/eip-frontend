<template>
  <div class="form-p3-safety-health-plan-page">
    <PageHeader
      title="P-3 職業安全衛生管理計畫"
      icon="fa fa-helmet-safety"
      :breadcrumbs="breadcrumbs"
    >
      <template v-if="hasCurrentProject && isContractor" #extra>
        <DesignChangeVersionSwitcher
          :model-value="selectedDesignChangeId"
          :construction-id="currentProject?.id"
          source-type="CONTRACTOR"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <PlanSubmissionPModal
      v-model:show="showSubmissionModal"
      plan-type="P3"
      plan-label="P-3 職業安全衛生管理計畫"
    />

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!isContractor" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      「P-3 職業安全衛生管理計畫」僅供營造端維護。
    </div>

    <Card v-else class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div class="b2-content-toolbar">
          <div class="p1-toolbar-left">
            <label class="p1-refdate-label" for="p3-data-reference-date">
              資料依據日
              <span
                class="p1-info-icon"
                data-tooltip="此日期用於匯出時的人員統計與內容判斷;預設會帶入今日。"
                tabindex="0"
                aria-label="資料依據日說明"
              >
                <i class="fa fa-circle-info"></i>
              </span>
            </label>
            <RepublicDatePicker
              id="p3-data-reference-date"
              v-model="dataReferenceDate"
              class="p1-refdate-picker"
              placeholder="請選擇資料依據日"
              value-format="YYYY-MM-DD"
              auto-apply
            />
          </div>

          <div class="p1-toolbar-right">
            <span class="p3-autosave-indicator" :class="`p3-autosave-indicator--${autoSaveStatus}`">
              <template v-if="autoSaveStatus === 'saving'">
                <i class="fa fa-spinner fa-spin me-1"></i>自動儲存中…
              </template>
              <template v-else-if="autoSaveStatus === 'saved'">
                <i class="fa fa-check-circle me-1"></i>已自動儲存
              </template>
              <template v-else-if="autoSaveStatus === 'error'">
                <i class="fa fa-triangle-exclamation me-1"></i>儲存失敗
              </template>
              <template v-else-if="autoSaveStatus === 'pending'">
                <i class="fa fa-clock me-1"></i>修改後將自動儲存…
              </template>
            </span>
            <button type="button" class="win-btn" @click="showSubmissionModal = true">
              <i class="fa fa-clipboard-list"></i>送審紀錄
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
                        :class="aiLoading.scaleOverview ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                      ></i>
                      {{ aiLoading.scaleOverview ? '生成中…' : '依標單工程案資料建構' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <textarea
                    v-model="p3SafetyHealthScaleOverview"
                    class="form-control text-panel__textarea"
                    rows="10"
                    placeholder="請輸入工程規模概述（P-3 職業安全衛生管理計畫獨立欄位）"
                    @input="scheduleAutoSave"
                  />
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-image me-2 text-info"></i>
                    施工平面圖
                  </div>
                  <div class="text-panel__toolbar">
                    <FileUpload
                      ref="layoutFileUploadRef"
                      v-model="layoutPickBuffer"
                      layout="toolbar"
                      variant="dark"
                      accept="image/*"
                      multiple
                      :show-upload-button="false"
                      :show-file-list="false"
                      :disabled="!currentProject?.id"
                      :uploading="isLayoutImageUploading"
                      pick-button-text="上傳圖片（可多張）"
                      hide-hint
                      class="p3-file-upload-toolbar"
                      @change="onLayoutPickBufferChange"
                    />
                  </div>
                </div>
                <div class="text-panel__body">
                  <div v-if="constructionLayoutImages.length === 0" class="text-muted small py-2">
                    尚未上傳施工平面圖。可一次選取多張圖片，匯出時會依此區塊順序逐張插入 Word。
                  </div>
                  <div v-else class="cm-attach-images">
                    <div v-for="img in constructionLayoutImages" :key="img.objectName" class="cm-attach-img">
                      <a
                        class="cm-attach-img__link"
                        href="#"
                        rel="noopener"
                        title="開新視窗預覽"
                        @click.prevent="openLayoutImage(img)"
                      >
                        <img
                          v-if="img.signedUrl"
                          class="cm-attach-img__thumb"
                          :src="img.signedUrl"
                          alt="施工平面圖"
                        />
                        <div v-else class="cm-attach-img__placeholder text-muted small">
                          <span v-if="layoutImagePreviewLoading.has(img.objectName)">載入中…</span>
                          <span v-else-if="layoutImagePreviewFailed.has(img.objectName)">無法預覽</span>
                          <span v-else>載入中…</span>
                        </div>
                      </a>
                      <button
                        type="button"
                        class="btn btn-sm btn-danger cm-attach-img__remove"
                        title="刪除圖片"
                        @click="removeLayoutImage(img.objectName)"
                      >
                        <i class="fa fa-xmark"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-sitemap me-2 text-success"></i>
                    安全衛生組織架構圖
                  </div>
                </div>
                <div class="text-panel__body org-chart-body">
                  <div class="org-chart-form">
                    <div class="row g-2">
                      <div class="col-md-4">
                        <label class="form-label small text-light mb-1">公司名稱</label>
                        <input
                          v-model="orgChartData.companyName"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請輸入公司名稱（已自動帶入工程案的營造公司）"
                        />
                      </div>
                      <div class="col-md-4">
                        <label class="form-label small text-light mb-1">公司負責人</label>
                        <input
                          v-model="orgChartData.ownerName"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請輸入公司負責人（已自動帶入工地人員中職稱為負責人者）"
                        />
                      </div>
                      <div class="col-md-4">
                        <label class="form-label small text-light mb-1">公司框右側註釋</label>
                        <input
                          v-model="orgChartData.ownerNote"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請輸入註釋文字"
                        />
                      </div>

                      <div class="col-md-4">
                        <label class="form-label small text-light mb-1">工地主任</label>
                        <input
                          v-model="orgChartData.siteDirectorName"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請輸入工地主任姓名（已自動帶入工地人員中職稱為工地主任者）"
                        />
                      </div>
                      <div class="col-md-4">
                        <label class="form-label small text-light mb-1">工地主任右側註釋</label>
                        <input
                          v-model="orgChartData.siteDirectorNote"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請輸入註釋文字"
                        />
                      </div>
                      <div class="col-md-4">
                        <label class="form-label small text-light mb-1">
                          品管人員
                          <span v-if="qualityPersonnelOptions.length" class="text-muted ms-1">
                            （可從工地人員選擇，亦可自行輸入）
                          </span>
                        </label>
                        <PersonnelComboInput
                          v-model="orgChartData.qualityStaffName"
                          :options="qualityPersonnelOptions"
                          placeholder="請輸入品管人員姓名"
                          aria-label="品管人員"
                          empty-hint="（尚無公共工程品質管理人員，請自行輸入）"
                        />
                      </div>

                      <div class="col-md-4">
                        <label class="form-label small text-light mb-1">緊急救援小組負責人</label>
                        <input
                          v-model="orgChartData.emergencyTeamLeaderName"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請輸入緊急救援小組負責人姓名"
                        />
                      </div>
                      <div class="col-md-4">
                        <label class="form-label small text-light mb-1">
                          安衛管理組組長（勞安）
                          <span v-if="safetyPersonnelOptions.length" class="text-muted ms-1">
                            （可從工地人員選擇，亦可自行輸入）
                          </span>
                        </label>
                        <PersonnelComboInput
                          v-model="orgChartData.safetyTeamLeaderName"
                          :options="safetyPersonnelOptions"
                          placeholder="請輸入安衛管理組組長／勞安人員姓名"
                          aria-label="安衛管理組組長"
                          empty-hint="（尚無勞安人員，請自行輸入）"
                        />
                      </div>

                      <div class="col-md-6">
                        <label class="form-label small text-light mb-1">工務組負責人/工程師</label>
                        <input
                          v-model="orgChartData.workTeamLeaderName"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請輸入工務組負責人/工程師姓名"
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small text-light mb-1">行政組負責人</label>
                        <input
                          v-model="orgChartData.adminTeamLeaderName"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請輸入行政組負責人姓名"
                        />
                      </div>

                      <div class="col-md-12">
                        <label class="form-label small text-light mb-1">緊急救援小組左下註釋</label>
                        <textarea
                          v-model="orgChartData.emergencyTeamNote"
                          class="form-control form-control-sm"
                          rows="2"
                          placeholder="請輸入註釋文字"
                        />
                      </div>

                      <div class="col-md-6">
                        <label class="form-label small text-light mb-1">安衛管理組右側標題</label>
                        <input
                          v-model="orgChartData.safetyTeamNote"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請輸入右側標題文字"
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small text-light mb-1">安衛管理組右側列點（每行一項）</label>
                        <textarea
                          v-model="safetyTeamItemsText"
                          class="form-control form-control-sm"
                          rows="3"
                          placeholder="每行一項工作項目"
                        />
                      </div>

                      <div class="col-md-12">
                        <label class="form-label small text-light mb-1">行政組右側註釋</label>
                        <textarea
                          v-model="orgChartData.adminTeamNote"
                          class="form-control form-control-sm"
                          rows="2"
                          placeholder="請輸入註釋文字"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="org-chart-preview mt-3">
                    <button
                      type="button"
                      class="org-chart-preview__toggle"
                      :aria-expanded="isOrgChartPreviewExpanded ? 'true' : 'false'"
                      :aria-label="isOrgChartPreviewExpanded ? '收合即時預覽' : '展開即時預覽'"
                      @click="toggleOrgChartPreview"
                    >
                      <span class="org-chart-preview__title">
                        <i class="fa fa-eye me-2"></i>即時預覽
                      </span>
                      <i
                        class="fa org-chart-preview__chevron"
                        :class="isOrgChartPreviewExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
                      ></i>
                    </button>
                    <!-- 注意：收合時用 v-show 隱藏即可；不能用 v-if 卸載 SVG，
                         否則匯出時 orgChartSvgRef.getSvgElement() 會抓不到 DOM。 -->
                    <div v-show="isOrgChartPreviewExpanded" class="org-chart-preview__canvas">
                      <P3SafetyHealthOrgChartSvg ref="orgChartSvgRef" :data="orgChartData" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 職業安全衛生管理人員與證照（單筆 + 多張證照圖片） -->
            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-id-badge me-2 text-warning"></i>
                    職業安全衛生管理人員與證照
                  </div>
                </div>
                <div class="text-panel__body org-chart-body">
                  <div class="org-chart-form">
                    <div class="row g-2">
                      <div class="col-md-6">
                        <label class="form-label small text-light mb-1">
                          姓名
                          <span class="text-muted ms-1">（同步自上方「安衛管理組組長（勞安）」）</span>
                        </label>
                        <input
                          :value="orgChartData.safetyTeamLeaderName"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="請至上方「安衛管理組組長（勞安）」填寫姓名"
                          disabled
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small text-light mb-1">學歷</label>
                        <input
                          v-model="personnelCredential.education"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="例：XXX專科 / XXX大學XX系"
                        />
                      </div>

                      <div class="col-md-8">
                        <label class="form-label small text-light mb-1">相關證照</label>
                        <input
                          v-model="personnelCredential.relatedCredential"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="例：營造業甲種職業安全衛生業務主管"
                        />
                      </div>
                      <div class="col-md-4">
                        <label class="form-label small text-light mb-1">證書字號</label>
                        <input
                          v-model="personnelCredential.credentialNumber"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="例：XXXSXXXXXXXXXX"
                        />
                      </div>
                    </div>

                    <!-- 主要經歷（動態列） -->
                    <div class="cred-experiences mt-3">
                      <div class="cred-experiences__title small text-muted mb-1">
                        <i class="fa fa-briefcase me-1"></i>主要經歷
                      </div>
                      <div class="cred-experiences__table">
                        <div class="cred-experiences__head row g-0 small text-muted">
                          <div class="col-3">期間</div>
                          <div class="col-5">公司名稱</div>
                          <div class="col-3">職稱</div>
                          <div class="col-1 text-end">&nbsp;</div>
                        </div>
                        <div
                          v-for="(exp, idx) in personnelCredential.experiences"
                          :key="idx"
                          class="cred-experiences__row row g-1"
                        >
                          <div class="col-3">
                            <input
                              v-model="exp.period"
                              type="text"
                              class="form-control form-control-sm"
                              placeholder="例：111.01～111.12 或 112.03～迄今"
                            />
                          </div>
                          <div class="col-5">
                            <input
                              v-model="exp.companyName"
                              type="text"
                              class="form-control form-control-sm"
                              placeholder="例：XXX營造工程有限公司"
                            />
                          </div>
                          <div class="col-3">
                            <input
                              v-model="exp.jobTitle"
                              type="text"
                              class="form-control form-control-sm"
                              placeholder="例：勞安衛生管理人員"
                            />
                          </div>
                          <div class="col-1 d-flex align-items-center justify-content-end">
                            <button
                              type="button"
                              class="btn btn-sm btn-outline-danger"
                              title="刪除這列"
                              @click="removeExperienceRow(idx)"
                            >
                              <i class="fa fa-xmark"></i>
                            </button>
                          </div>
                        </div>
                        <div v-if="personnelCredential.experiences.length === 0" class="text-muted small py-1">
                          尚無經歷資料。
                        </div>
                      </div>
                      <div class="mt-2">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-primary"
                          @click="addExperienceRow"
                        >
                          <i class="fa fa-plus me-1"></i>新增一列經歷
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- 證照圖片（多張） -->
                  <div class="cred-images mt-3">
                    <div class="cred-images__title d-flex align-items-center justify-content-between small text-muted mb-1">
                      <span>
                        <i class="fa fa-image me-1"></i>證照圖片
                      </span>
                      <FileUpload
                        ref="credentialFileUploadRef"
                        v-model="credentialPickBuffer"
                        layout="toolbar"
                        variant="dark"
                        accept="image/*"
                        multiple
                        :show-upload-button="false"
                        :show-file-list="false"
                        :disabled="!currentProject?.id"
                        :uploading="isCredentialImageUploading"
                        pick-button-text="上傳證照圖片（可多張）"
                        hide-hint
                        class="p3-file-upload-toolbar"
                        @change="onCredentialPickBufferChange"
                      />
                    </div>
                    <div v-if="personnelCredentialImages.length === 0" class="text-muted small py-2">
                      尚未上傳證照圖片。可一次選取多張，匯出時會依此順序逐張插入 Word。
                    </div>
                    <div v-else class="cm-attach-images">
                      <div
                        v-for="img in personnelCredentialImages"
                        :key="img.objectName"
                        class="cm-attach-img"
                      >
                        <a
                          class="cm-attach-img__link"
                          href="#"
                          rel="noopener"
                          title="開新視窗預覽"
                          @click.prevent="openCredentialImage(img)"
                        >
                          <img
                            v-if="img.signedUrl"
                            class="cm-attach-img__thumb"
                            :src="img.signedUrl"
                            alt="證照圖片"
                          />
                          <div v-else class="cm-attach-img__placeholder text-muted small">
                            <span v-if="credentialImagePreviewLoading.has(img.objectName)">載入中…</span>
                            <span v-else-if="credentialImagePreviewFailed.has(img.objectName)">無法預覽</span>
                            <span v-else>載入中…</span>
                          </div>
                        </a>
                        <button
                          type="button"
                          class="btn btn-sm btn-danger cm-attach-img__remove"
                          title="刪除圖片"
                          @click="removeCredentialImage(img.objectName)"
                        >
                          <i class="fa fa-xmark"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 協力廠商組織關係圖（左側公司／工程名直書 + 中央材料供應商分類 + 右側其他協力廠商等） -->
            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-sitemap me-2 text-info"></i>
                    協力廠商組織關係圖
                  </div>
                  <div class="text-panel__toolbar">
                    <span v-if="isSubOrgChartUploading" class="text-muted small me-2">
                      <i class="fa fa-spinner fa-spin me-1"></i>圖片同步中…
                    </span>
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="isAiGenerating || !currentProject?.id"
                      @click="generateSupplierCategoriesByAi"
                    >
                      <i
                        class="fa me-2"
                        :class="aiLoading.subSuppliers ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                      ></i>
                      {{ aiLoading.subSuppliers ? '生成中…' : '依標單工程案資料建構材料分類' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body org-chart-body">
                  <div class="org-chart-form">
                    <div class="row g-2">
                      <div class="col-md-6">
                        <label class="form-label small text-light mb-1">
                          工程名稱
                          <span class="text-muted ms-1">（自動帶入；可手動修改）</span>
                        </label>
                        <input
                          v-model="subOrgChartData.constructionName"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="例：XXX工程"
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small text-light mb-1">
                          公司名稱
                          <span class="text-muted ms-1">（自動帶入；可手動修改）</span>
                        </label>
                        <input
                          v-model="subOrgChartData.companyName"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="例：XXX營造有限公司"
                        />
                      </div>
                      <div class="col-md-12">
                        <label class="form-label small text-light mb-1">右側框文字（直書）</label>
                        <input
                          v-model="subOrgChartData.otherSubcontractorTitle"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="例：其他協力廠商等"
                        />
                      </div>
                    </div>

                    <!-- 材料供應商分類（動態列） -->
                    <div class="cred-experiences mt-3">
                      <div class="cred-experiences__title small text-muted mb-1 d-flex align-items-center justify-content-between">
                        <span><i class="fa fa-boxes-stacked me-1"></i>材料供應商分類</span>
                        <button type="button" class="btn btn-sm btn-outline-primary" @click="addSupplierRow">
                          <i class="fa fa-plus me-1"></i>新增一列
                        </button>
                      </div>
                      <div class="cred-experiences__table">
                        <div
                          v-for="(_label, idx) in subOrgChartData.materialSuppliers"
                          :key="idx"
                          class="cred-experiences__row row g-1"
                        >
                          <div class="col-11">
                            <input
                              v-model="subOrgChartData.materialSuppliers[idx]"
                              type="text"
                              class="form-control form-control-sm"
                              :placeholder="`例：XXX工程材料供應商`"
                            />
                          </div>
                          <div class="col-1 d-flex align-items-center justify-content-end">
                            <button
                              type="button"
                              class="btn btn-sm btn-outline-danger"
                              title="刪除這列"
                              @click="removeSupplierRow(idx)"
                            >
                              <i class="fa fa-xmark"></i>
                            </button>
                          </div>
                        </div>
                        <div v-if="subOrgChartData.materialSuppliers.length === 0" class="text-muted small py-1">
                          尚無材料供應商分類，請點上方「新增一列」。
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="org-chart-preview mt-3">
                    <button
                      type="button"
                      class="org-chart-preview__toggle"
                      :aria-expanded="isSubOrgChartPreviewExpanded ? 'true' : 'false'"
                      :aria-label="isSubOrgChartPreviewExpanded ? '收合即時預覽' : '展開即時預覽'"
                      @click="toggleSubOrgChartPreview"
                    >
                      <span class="org-chart-preview__title">
                        <i class="fa fa-eye me-2"></i>即時預覽
                      </span>
                      <i
                        class="fa org-chart-preview__chevron"
                        :class="isSubOrgChartPreviewExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
                      ></i>
                    </button>
                    <!-- 注意：收合時用 v-show 隱藏即可，不能用 v-if 卸載 SVG，否則匯出時抓不到 DOM。 -->
                    <div v-show="isSubOrgChartPreviewExpanded" class="org-chart-preview__canvas">
                      <P3SubcontractorOrgChartSvg ref="subOrgChartSvgRef" :data="subOrgChartData" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 緊急應變、保全聯絡體制 -->
            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-phone-volume me-2 text-danger"></i>
                    緊急應變、保全聯絡體制
                  </div>
                  <div class="text-panel__toolbar">
                    <span v-if="isEmergencyContactUploading" class="text-muted small me-2">
                      <i class="fa fa-spinner fa-spin me-1"></i>圖片同步中…
                    </span>
                  </div>
                </div>
                <div class="text-panel__body org-chart-body">
                  <!-- 緊急聯絡方式表（在體制圖欄位與預覽之上） -->
                  <div class="cred-experiences emergency-contact-list">
                    <div class="cred-experiences__title small text-muted mb-1 d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <span><i class="fa fa-table me-1"></i>緊急聯絡方式表</span>
                      <div class="d-flex flex-wrap gap-1">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-secondary"
                          title="新增一列（空白類別）"
                          @click="addEmergencyContactListRow()"
                        >
                          <i class="fa fa-plus me-1"></i>新增一列
                        </button>
                      </div>
                    </div>
                    <p class="small text-muted mb-2">
                      類別可從建議選項選擇或自行輸入；同一類別可新增多筆。
                    </p>
                    <datalist id="p3-emergency-contact-category-options">
                      <option
                        v-for="opt in P3_EMERGENCY_CONTACT_CATEGORY_OPTIONS"
                        :key="opt"
                        :value="opt"
                      />
                    </datalist>
                    <div class="cred-experiences__table">
                      <div class="cred-experiences__head row g-0 small text-muted emergency-contact-list__head">
                        <div class="col-2">類別</div>
                        <div class="col-4">單位名稱</div>
                        <div class="col-2">電話</div>
                        <div class="col-3">備註</div>
                        <div class="col-1 text-end">&nbsp;</div>
                      </div>
                      <div
                        v-for="(row, idx) in emergencyContactList.rows"
                        :key="row.id"
                        class="cred-experiences__row row g-1"
                      >
                        <div class="col-2">
                          <input
                            v-model="row.category"
                            type="text"
                            class="form-control form-control-sm"
                            list="p3-emergency-contact-category-options"
                            placeholder="選擇或輸入類別"
                          />
                        </div>
                        <div class="col-4">
                          <input
                            v-model="row.unitName"
                            type="text"
                            class="form-control form-control-sm"
                            placeholder="單位名稱"
                          />
                        </div>
                        <div class="col-2">
                          <input
                            v-model="row.phone"
                            type="text"
                            class="form-control form-control-sm"
                            placeholder="電話"
                          />
                        </div>
                        <div class="col-3">
                          <input
                            v-model="row.remark"
                            type="text"
                            class="form-control form-control-sm"
                            placeholder="備註"
                          />
                        </div>
                        <div class="col-1 d-flex align-items-center justify-content-end">
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            title="刪除這列"
                            @click="removeEmergencyContactListRow(idx)"
                          >
                            <i class="fa fa-xmark"></i>
                          </button>
                        </div>
                      </div>
                      <div v-if="emergencyContactList.rows.length === 0" class="text-muted small py-1">
                        尚無資料，請按「新增一列」或下方快速新增類別。
                      </div>
                    </div>
                    <div class="mt-2 d-flex flex-wrap gap-1">
                      <button
                        v-for="cat in P3_EMERGENCY_CONTACT_CATEGORY_OPTIONS"
                        :key="'quick-' + cat"
                        type="button"
                        class="btn btn-sm btn-outline-light"
                        @click="addEmergencyContactListRow(cat)"
                      >
                        + {{ cat }}
                      </button>
                    </div>
                  </div>

                  <hr class="border-secondary my-3" />

                  <p class="small text-muted mb-2">
                    左側編號對應圖上框框；匯出 Word 時編號不會出現在圖片中。
                  </p>
                  <div class="org-chart-form">
                    <div
                      v-for="box in P3_EMERGENCY_CONTACT_EDITOR_BOXES"
                      :key="box.id"
                      class="p3-emergency-editor-box mb-3"
                    >
                      <div class="p3-emergency-editor-box__layout">
                        <div
                          class="p3-emergency-editor-box__marker-col"
                          :class="{ 'p3-emergency-editor-box__marker-col--single': box.fieldKeys.length === 1 }"
                          :title="box.title"
                        >
                          <span class="p3-editor-marker-badge" aria-hidden="true">{{ box.marker }}</span>
                        </div>
                        <div class="p3-emergency-editor-box__fields flex-grow-1">
                          <div class="row g-2">
                            <div
                              v-for="fieldKey in box.fieldKeys"
                              :key="fieldKey"
                              :class="box.fieldKeys.length > 2 ? 'col-md-4' : 'col-md-6'"
                            >
                              <label class="form-label small text-light mb-1">
                                {{ P3_EMERGENCY_CONTACT_FIELD_LABELS[fieldKey] }}
                              </label>
                              <input
                                v-model="emergencyContactData[fieldKey]"
                                type="text"
                                class="form-control form-control-sm"
                                :placeholder="emergencyContactFieldPlaceholder(fieldKey)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="org-chart-preview mt-3">
                    <button
                      type="button"
                      class="org-chart-preview__toggle"
                      :aria-expanded="isEmergencyContactPreviewExpanded ? 'true' : 'false'"
                      @click="toggleEmergencyContactPreview"
                    >
                      <span class="org-chart-preview__title">
                        <i class="fa fa-eye me-2"></i>即時預覽
                      </span>
                      <i
                        class="fa org-chart-preview__chevron"
                        :class="isEmergencyContactPreviewExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
                      ></i>
                    </button>
                    <div v-show="isEmergencyContactPreviewExpanded" class="org-chart-preview__canvas">
                      <P3EmergencyResponseContactSvg
                        ref="emergencyContactSvgRef"
                        :data="emergencyContactData"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 防颱聯絡體制 -->
            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-wind me-2 text-info"></i>
                    防颱聯絡體制
                  </div>
                  <div class="text-panel__toolbar">
                    <span v-if="isTyphoonPreventionContactUploading" class="text-muted small me-2">
                      <i class="fa fa-spinner fa-spin me-1"></i>圖片同步中…
                    </span>
                  </div>
                </div>
                <div class="text-panel__body org-chart-body">
                  <p class="small text-muted mb-2">
                    左側編號對應圖上框框；匯出 Word 時編號不會出現在圖片中。
                  </p>
                  <div class="org-chart-form">
                    <div
                      v-for="box in P3_TYPHOON_PREVENTION_CONTACT_EDITOR_BOXES"
                      :key="box.id"
                      class="p3-emergency-editor-box mb-3"
                    >
                      <div class="p3-emergency-editor-box__layout">
                        <div
                          class="p3-emergency-editor-box__marker-col p3-emergency-editor-box__marker-col--single"
                          :title="box.title"
                        >
                          <span class="p3-editor-marker-badge" aria-hidden="true">{{ box.marker }}</span>
                        </div>
                        <div class="p3-emergency-editor-box__fields flex-grow-1">
                          <div class="row g-2">
                            <div
                              v-for="fieldKey in box.fieldKeys"
                              :key="fieldKey"
                              class="col-12"
                            >
                              <input
                                v-model="typhoonPreventionContactData[fieldKey]"
                                type="text"
                                class="form-control form-control-sm"
                                :aria-label="`${box.marker} ${box.title}`"
                                :placeholder="typhoonPreventionContactFieldPlaceholder(fieldKey)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="org-chart-preview mt-3">
                    <button
                      type="button"
                      class="org-chart-preview__toggle"
                      :aria-expanded="isTyphoonPreventionContactPreviewExpanded ? 'true' : 'false'"
                      @click="toggleTyphoonPreventionContactPreview"
                    >
                      <span class="org-chart-preview__title">
                        <i class="fa fa-eye me-2"></i>即時預覽
                      </span>
                      <i
                        class="fa org-chart-preview__chevron"
                        :class="isTyphoonPreventionContactPreviewExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
                      ></i>
                    </button>
                    <div v-show="isTyphoonPreventionContactPreviewExpanded" class="org-chart-preview__canvas">
                      <P3TyphoonPreventionContactSvg
                        ref="typhoonPreventionContactSvgRef"
                        :data="typhoonPreventionContactData"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 工程相關人員附件（與 P-2 同款） -->
            <P3PersonnelAttachmentsPanel
              v-model:attachments-json="p3PersonnelAttachmentsJson"
              :construction-id="currentProject?.id"
              :design-change-id="selectedDesignChangeId"
              @dirty="scheduleAutoSave"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { debounce } from 'lodash'
import { useWorkspaceStore } from '@/stores/workspace'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useExportLoading } from '@/composables/useExportLoading'
import { sitePersonnelApi } from '@/api/sitePersonnel'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import PlanSubmissionPModal from '@/components/forms/PlanSubmissionPModal.vue'
import FileUpload from '@/components/common/FileUpload.vue'
import { formPApi, downloadBlobAsFile, type ExportConstructionReportRequest } from '@/api/forms'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
import { openFilePreviewOrDownload } from '@/utils/openFilePreview'
import {
  deleteP3ConstructionLayoutImage,
  deleteP3SafetyHealthPersonnelCredentialImage,
  downloadP3ConstructionLayoutImageBlob,
  downloadP3SafetyHealthPersonnelCredentialImageBlob,
  getConstructionDetail,
  getP1TextAiGenerate,
  getP3ConstructionLayoutImageSignedUrl,
  getP3SafetyHealthPersonnelCredentialImageSignedUrl,
  type P3ConstructionLayoutImageInfo,
  type P3SafetyHealthPersonnelCredentialImageInfo,
  updateConstruction,
  uploadP3ConstructionLayoutImage,
  uploadP3SafetyHealthOrgChartImage,
  uploadP3SafetyHealthPersonnelCredentialImage,
  uploadP3SubcontractorOrgChartImage,
  uploadP3EmergencyResponseContactImage,
  uploadP3TyphoonPreventionContactImage,
  generateP3SubcontractorCategoriesByAi
} from '@/api/construction'
import P3SafetyHealthOrgChartSvg, {
  DEFAULT_P3_ORG_CHART_DATA,
  normalizeP3OrgChartData,
  type P3OrgChartData
} from './components/P3SafetyHealthOrgChartSvg.vue'
import P3SubcontractorOrgChartSvg, {
  DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA,
  normalizeP3SubcontractorOrgChartData,
  type P3SubcontractorOrgChartData
} from './components/P3SubcontractorOrgChartSvg.vue'
import P3EmergencyResponseContactSvg, {
  DEFAULT_P3_EMERGENCY_RESPONSE_CONTACT_DATA,
  normalizeP3EmergencyResponseContactData,
  type P3EmergencyResponseContactData
} from './components/P3EmergencyResponseContactSvg.vue'
import {
  DEFAULT_P3_EMERGENCY_CONTACT_LIST,
  P3_EMERGENCY_CONTACT_CATEGORY_OPTIONS,
  createEmptyEmergencyContactListRow,
  normalizeP3EmergencyContactList,
  type P3EmergencyContactListData
} from './components/P3EmergencyContactList.ts'
import {
  P3_EMERGENCY_CONTACT_EDITOR_BOXES,
  P3_EMERGENCY_CONTACT_FIELD_LABELS,
  stripEditorOnlyFromSvg,
  type P3EmergencyContactFieldKey
} from './components/P3EmergencyResponseContactMarkers'
import P3TyphoonPreventionContactSvg, {
  DEFAULT_P3_TYPHOON_PREVENTION_CONTACT_DATA,
  normalizeP3TyphoonPreventionContactData,
  type P3TyphoonPreventionContactData
} from './components/P3TyphoonPreventionContactSvg.vue'
import P3PersonnelAttachmentsPanel from './components/P3PersonnelAttachmentsPanel.vue'
import {
  P3_TYPHOON_PREVENTION_CONTACT_EDITOR_BOXES,
  type P3TyphoonPreventionContactFieldKey,
} from './components/P3TyphoonPreventionContactMarkers'
import PersonnelComboInput from './components/PersonnelComboInput.vue'

const workspaceStore = useWorkspaceStore()
const companyStore = useCompanyStore()
const authStore = useAuthStore()
const { isContractor, isSuperAdmin } = useViewPerspective()
const { runWithExportLoading } = useExportLoading()

/**
 * 取得目前營造端視角的 companyId（與 FormPDynamicPlan 同一套規則）。
 * - 優先用登入者所屬公司（且為 CONTRACTOR）
 * - 退而求其次用 activeCompanies 中第一個 CONTRACTOR
 * - 最後 fallback 至 currentWorkspace.companyId / activeCompanies[0]
 */
function getCurrentContractorCompanyId(): string | null {
  const desiredType = 'CONTRACTOR'
  const authCompanyId = authStore.user?.companyId?.trim()
  if (authCompanyId) {
    const c = companyStore.getCompanyById(authCompanyId) as any
    if (c && c.companyType === desiredType) return authCompanyId
  }
  const match = (companyStore.activeCompanies as any[]).find((c: any) => c.companyType === desiredType)
  if (match?.companyId) return match.companyId
  const wsCompanyId = workspaceStore.currentWorkspace?.companyId?.trim()
  if (wsCompanyId) return wsCompanyId
  return (companyStore.activeCompanies as any[])[0]?.companyId ?? null
}

const currentProject = computed(() => workspaceStore.currentProject)
const hasCurrentProject = computed(() => !!currentProject.value?.id)

/** 送審紀錄 Modal */
const showSubmissionModal = ref(false)

const selectedDesignChangeId = ref<number | null>(null)
const dataReferenceDate = ref('')

const isTextLoading = ref(false)
const isExporting = ref(false)
const isAiGenerating = ref(false)
const aiLoading = ref({ scaleOverview: false, subSuppliers: false })

const p3SafetyHealthScaleOverview = ref('')

/**
 * 施工平面圖（多張）。
 *
 * - 列表 JSON 由前端組裝後 `updateConstruction` 一次回寫到 `p3ConstructionLayoutImagesJson`，
 *   保持與 P-2 工程相關人員附件相同的設計（短效 signedUrl 不寫入 DB）。
 * - 預覽優先使用上傳當下回傳的 signedUrl；過期或缺失時改打 `getP3ConstructionLayoutImageSignedUrl`，
 *   仍失敗時退回 `downloadP3ConstructionLayoutImageBlob` 取得 blob 顯示。
 */
const constructionLayoutImages = ref<P3ConstructionLayoutImageInfo[]>([])
const layoutImagePreviewLoading = ref<Set<string>>(new Set())
const layoutImagePreviewFailed = ref<Set<string>>(new Set())
const isLayoutImageUploading = ref(false)
const layoutPickBuffer = ref<File[]>([])
const layoutFileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null)
let layoutImageBlobUrls: string[] = []

function revokeLayoutImageBlobUrls() {
  for (const url of layoutImageBlobUrls) {
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }
  layoutImageBlobUrls = []
}

function parseConstructionLayoutImagesJson(raw: string): P3ConstructionLayoutImageInfo[] {
  const s = String(raw || '').trim()
  if (!s) return []
  try {
    const parsed = JSON.parse(s)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((i: any) => ({
        objectName: String(i?.objectName || '').trim(),
        signedUrl: typeof i?.signedUrl === 'string' ? i.signedUrl : null,
        fileName: typeof i?.fileName === 'string' ? i.fileName : null,
        contentType: typeof i?.contentType === 'string' ? i.contentType : null,
        fileSize: typeof i?.fileSize === 'number' ? i.fileSize : null,
      }))
      .filter((i: P3ConstructionLayoutImageInfo) => !!i.objectName)
  } catch {
    return []
  }
}

function syncConstructionLayoutImagesJson(): string {
  // signedUrl 為短效，不寫入 DB；仍允許前端暫存於狀態
  const payload = constructionLayoutImages.value.map((i) => ({
    objectName: i.objectName,
    fileName: i.fileName ?? null,
    contentType: i.contentType ?? null,
    fileSize: i.fileSize ?? null,
  }))
  return JSON.stringify(payload)
}

async function ensureLayoutImagePreview(target: P3ConstructionLayoutImageInfo) {
  const cid = currentProject.value?.id
  const on = String(target.objectName || '').trim()
  if (!cid || !on) return
  if (target.signedUrl) return

  layoutImagePreviewFailed.value.delete(on)
  layoutImagePreviewLoading.value.add(on)
  layoutImagePreviewLoading.value = new Set(layoutImagePreviewLoading.value)
  try {
    try {
      const { signedUrl } = await getP3ConstructionLayoutImageSignedUrl(cid, on)
      if (signedUrl) {
        target.signedUrl = signedUrl
        return
      }
    } catch { /* ignore；改走 download blob */ }

    const blob = await downloadP3ConstructionLayoutImageBlob(cid, on)
    if (blob instanceof Blob && blob.size > 0) {
      const url = URL.createObjectURL(blob)
      layoutImageBlobUrls.push(url)
      target.signedUrl = url
      return
    }

    layoutImagePreviewFailed.value.add(on)
    layoutImagePreviewFailed.value = new Set(layoutImagePreviewFailed.value)
  } catch {
    layoutImagePreviewFailed.value.add(on)
    layoutImagePreviewFailed.value = new Set(layoutImagePreviewFailed.value)
  } finally {
    layoutImagePreviewLoading.value.delete(on)
    layoutImagePreviewLoading.value = new Set(layoutImagePreviewLoading.value)
  }
}

async function ensureAllLayoutImagePreviews() {
  revokeLayoutImageBlobUrls()
  for (const img of constructionLayoutImages.value.filter((i) => !i.signedUrl).slice(0, 80)) {
    void ensureLayoutImagePreview(img)
  }
}

async function openLayoutImage(img: P3ConstructionLayoutImageInfo) {
  const cid = currentProject.value?.id
  const on = img.objectName?.trim()
  if (!cid || !on) return
  await openFilePreviewOrDownload({
    url: img.signedUrl,
    fileName: img.fileName || on,
    contentType: img.contentType,
    fetchBlob: () => downloadP3ConstructionLayoutImageBlob(cid, on),
  })
}

async function openCredentialImage(img: P3SafetyHealthPersonnelCredentialImageInfo) {
  const cid = currentProject.value?.id
  const on = img.objectName?.trim()
  if (!cid || !on) return
  await openFilePreviewOrDownload({
    url: img.signedUrl,
    fileName: img.fileName || on,
    contentType: img.contentType,
    fetchBlob: () => downloadP3SafetyHealthPersonnelCredentialImageBlob(cid, on),
  })
}

/**
 * 安全衛生組織架構圖（結構化欄位 → 即時 SVG 預覽 → 匯出前自動轉 PNG 上傳）。
 *
 * - JSON 欄位即時寫入 `p3SafetyHealthOrgChartJson`（與其他 P-3 欄位共用 debounce 自動儲存）。
 * - PNG（SVG → Canvas → toBlob）寫入 `p3SafetyHealthOrgChartImageObjectName`，
 *   後端 upload 端點在成功時會自動覆蓋舊圖並寫回 DB；前端不需另外 PUT。
 * - exportWord 開頭會先 `ensureOrgChartUploaded()`，避免使用者剛改完欄位就匯出時抓到舊 PNG。
 */
const orgChartData = ref<P3OrgChartData>({
  ...DEFAULT_P3_ORG_CHART_DATA,
  safetyTeamItems: [...DEFAULT_P3_ORG_CHART_DATA.safetyTeamItems]
})
const orgChartSvgRef = ref<InstanceType<typeof P3SafetyHealthOrgChartSvg> | null>(null)
const isOrgChartUploading = ref(false)
const safetyTeamItemsText = ref(orgChartData.value.safetyTeamItems.join('\n'))

/**
 * 協力廠商組織關係圖（結構化欄位 → 即時 SVG 預覽 → 匯出前自動轉 PNG 上傳）。
 *
 * 與安全衛生組織架構圖採同一套 pattern：
 * - JSON 欄位即時寫入 `p3SubcontractorOrgChartJson`
 * - PNG 寫入 `p3SubcontractorOrgChartImageObjectName`
 * - exportWord 前 `ensureSubOrgChartUploaded()` 確保最新 PNG 已上傳
 */
const subOrgChartData = ref<P3SubcontractorOrgChartData>({
  ...DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA,
  materialSuppliers: [...DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA.materialSuppliers]
})
const subOrgChartSvgRef = ref<InstanceType<typeof P3SubcontractorOrgChartSvg> | null>(null)
const isSubOrgChartUploading = ref(false)
const isSubOrgChartPreviewExpanded = ref(true)
function toggleSubOrgChartPreview() {
  isSubOrgChartPreviewExpanded.value = !isSubOrgChartPreviewExpanded.value
}
function addSupplierRow() {
  subOrgChartData.value = {
    ...subOrgChartData.value,
    materialSuppliers: [...subOrgChartData.value.materialSuppliers, ''],
  }
}
function removeSupplierRow(idx: number) {
  if (idx < 0 || idx >= subOrgChartData.value.materialSuppliers.length) return
  const next = subOrgChartData.value.materialSuppliers.slice()
  next.splice(idx, 1)
  subOrgChartData.value = { ...subOrgChartData.value, materialSuppliers: next }
}

/**
 * 緊急應變、保全聯絡體制（結構化欄位 → SVG 預覽 → 匯出前 PNG 上傳）。
 * 紅字欄位預設 XX；`p3EmergencyResponseContactJson` / `p3EmergencyResponseContactImageObjectName`。
 */
const emergencyContactData = ref<P3EmergencyResponseContactData>({
  ...DEFAULT_P3_EMERGENCY_RESPONSE_CONTACT_DATA
})
/** 緊急聯絡方式表（類別／單位名稱／電話／備註）→ `p3EmergencyContactListJson` */
const emergencyContactList = ref<P3EmergencyContactListData>({
  ...DEFAULT_P3_EMERGENCY_CONTACT_LIST,
  rows: []
})
function addEmergencyContactListRow(category = '') {
  emergencyContactList.value = {
    ...emergencyContactList.value,
    rows: [...emergencyContactList.value.rows, createEmptyEmergencyContactListRow(category)]
  }
}
function removeEmergencyContactListRow(idx: number) {
  if (idx < 0 || idx >= emergencyContactList.value.rows.length) return
  const next = emergencyContactList.value.rows.slice()
  next.splice(idx, 1)
  emergencyContactList.value = { ...emergencyContactList.value, rows: next }
}
const emergencyContactSvgRef = ref<InstanceType<typeof P3EmergencyResponseContactSvg> | null>(null)
const isEmergencyContactUploading = ref(false)
const isEmergencyContactPreviewExpanded = ref(true)
function toggleEmergencyContactPreview() {
  isEmergencyContactPreviewExpanded.value = !isEmergencyContactPreviewExpanded.value
}

const typhoonPreventionContactData = ref<P3TyphoonPreventionContactData>({
  ...DEFAULT_P3_TYPHOON_PREVENTION_CONTACT_DATA,
})
const typhoonPreventionContactSvgRef = ref<InstanceType<typeof P3TyphoonPreventionContactSvg> | null>(null)
const isTyphoonPreventionContactUploading = ref(false)
const isTyphoonPreventionContactPreviewExpanded = ref(true)
const p3PersonnelAttachmentsJson = ref('')
function toggleTyphoonPreventionContactPreview() {
  isTyphoonPreventionContactPreviewExpanded.value = !isTyphoonPreventionContactPreviewExpanded.value
}

function typhoonPreventionContactFieldPlaceholder(key: P3TyphoonPreventionContactFieldKey): string {
  return DEFAULT_P3_TYPHOON_PREVENTION_CONTACT_DATA[key]
}

const EMERGENCY_CONTACT_FIELD_PLACEHOLDERS: Partial<Record<P3EmergencyContactFieldKey, string>> = {
  siteDirectorName: '預設 XX；可自組織架構圖帶入',
  hospitalName: '預設 XX醫院',
  hospitalPhone: '預設 0X-XXXXXXX',
  architectOffice: '預設 XX建築師事務所',
  architectName: '預設 XX',
  architectPhone: '預設 0X-XXXXXXX',
  contractorCompanyName: '自動帶入營造公司；可修改',
  technicianName: '預設 XX',
  technicianPhone: '預設 0X-XXXXXXX',
  laborInspectionOffice: '預設 XX勞動檢查所',
  laborInspectionPhone: '預設 02-XXXXXXXX',
}

function emergencyContactFieldPlaceholder(key: P3EmergencyContactFieldKey): string {
  return EMERGENCY_CONTACT_FIELD_PLACEHOLDERS[key] ?? ''
}

/**
 * 即時預覽圖收合狀態。
 *
 * 注意：**收合時必須保留 SVG 元件 mounted**（用 v-show 控制顯示），
 * 否則匯出時 `orgChartSvgRef.getSvgElement()` 會抓不到 DOM、無法將 SVG 轉成 PNG。
 * 因此只是視覺上隱藏 canvas 區塊，SVG 仍然在背景持續被 props 驅動更新。
 */
const isOrgChartPreviewExpanded = ref(true)
function toggleOrgChartPreview() {
  isOrgChartPreviewExpanded.value = !isOrgChartPreviewExpanded.value
}

/**
 * 「職業安全衛生管理人員與證照」結構化欄位（單一筆）。
 *
 * - 姓名沿用 `orgChartData.safetyTeamLeaderName`，因此本物件**不包含 fullName**。
 * - 經歷為動態列；每列為 { period, companyName, jobTitle }。
 *
 * 寫入：與其他欄位共用 debounce auto-save，整個 JSON 一次回寫到
 * `p3SafetyHealthPersonnelCredentialJson`。
 */
interface P3PersonnelCredentialExperience {
  period: string
  companyName: string
  jobTitle: string
}
interface P3PersonnelCredentialData {
  education: string
  relatedCredential: string
  credentialNumber: string
  experiences: P3PersonnelCredentialExperience[]
}
const DEFAULT_P3_PERSONNEL_CREDENTIAL: P3PersonnelCredentialData = {
  education: '',
  relatedCredential: '',
  credentialNumber: '',
  experiences: []
}
function normalizeP3PersonnelCredential(input: any): P3PersonnelCredentialData {
  const d = input && typeof input === 'object' ? input : {}
  const expArr = Array.isArray(d.experiences) ? d.experiences : []
  return {
    education: typeof d.education === 'string' ? d.education : '',
    relatedCredential: typeof d.relatedCredential === 'string' ? d.relatedCredential : '',
    credentialNumber: typeof d.credentialNumber === 'string' ? d.credentialNumber : '',
    experiences: expArr.map((e: any) => ({
      period: typeof e?.period === 'string' ? e.period : '',
      companyName: typeof e?.companyName === 'string' ? e.companyName : '',
      jobTitle: typeof e?.jobTitle === 'string' ? e.jobTitle : ''
    }))
  }
}
const personnelCredential = ref<P3PersonnelCredentialData>({
  ...DEFAULT_P3_PERSONNEL_CREDENTIAL,
  experiences: []
})
function addExperienceRow() {
  personnelCredential.value = {
    ...personnelCredential.value,
    experiences: [
      ...personnelCredential.value.experiences,
      { period: '', companyName: '', jobTitle: '' }
    ]
  }
}
function removeExperienceRow(idx: number) {
  if (idx < 0 || idx >= personnelCredential.value.experiences.length) return
  const next = personnelCredential.value.experiences.slice()
  next.splice(idx, 1)
  personnelCredential.value = { ...personnelCredential.value, experiences: next }
}

/**
 * 證照圖片清單（多張）— 與「施工平面圖」相同 pattern：
 * - 上傳成功後把 metadata 推入此 ref
 * - 整個 JSON 由 saveTexts 統一寫回 `p3SafetyHealthPersonnelCredentialImagesJson`
 * - 預覽 signedUrl 不寫入 DB；切換版本時重新撤銷 blob URL 並重新拉一次
 */
const personnelCredentialImages = ref<P3SafetyHealthPersonnelCredentialImageInfo[]>([])
const credentialImagePreviewLoading = ref<Set<string>>(new Set())
const credentialImagePreviewFailed = ref<Set<string>>(new Set())
const isCredentialImageUploading = ref(false)
const credentialPickBuffer = ref<File[]>([])
const credentialFileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null)
let credentialImageBlobUrls: string[] = []

function revokeCredentialImageBlobUrls() {
  for (const url of credentialImageBlobUrls) {
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }
  credentialImageBlobUrls = []
}

function parsePersonnelCredentialImagesJson(raw: string): P3SafetyHealthPersonnelCredentialImageInfo[] {
  const s = String(raw || '').trim()
  if (!s) return []
  try {
    const arr = JSON.parse(s)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((i: any) => typeof i?.objectName === 'string' && i.objectName.trim())
      .map((i: any) => ({
        objectName: String(i.objectName).trim(),
        fileName: typeof i.fileName === 'string' ? i.fileName : null,
        contentType: typeof i.contentType === 'string' ? i.contentType : null,
        fileSize: typeof i.fileSize === 'number' ? i.fileSize : null,
      }))
  } catch {
    return []
  }
}

async function ensureCredentialImagePreview(target: P3SafetyHealthPersonnelCredentialImageInfo) {
  const cid = currentProject.value?.id
  const on = String(target.objectName || '').trim()
  if (!cid || !on || target.signedUrl) return
  credentialImagePreviewLoading.value = new Set([...credentialImagePreviewLoading.value, on])
  try {
    let nextUrl = ''
    try {
      const r = await getP3SafetyHealthPersonnelCredentialImageSignedUrl(cid, on)
      nextUrl = String(r.signedUrl || '').trim()
    } catch {
      /* fallthrough to blob */
    }
    if (!nextUrl) {
      const blob = await downloadP3SafetyHealthPersonnelCredentialImageBlob(cid, on)
      const url = URL.createObjectURL(blob)
      credentialImageBlobUrls.push(url)
      nextUrl = url
    }
    personnelCredentialImages.value = personnelCredentialImages.value.map((it) =>
      it.objectName === on ? { ...it, signedUrl: nextUrl } : it
    )
    credentialImagePreviewFailed.value = new Set(
      [...credentialImagePreviewFailed.value].filter((k) => k !== on)
    )
  } catch {
    credentialImagePreviewFailed.value = new Set([...credentialImagePreviewFailed.value, on])
  } finally {
    credentialImagePreviewLoading.value = new Set(
      [...credentialImagePreviewLoading.value].filter((k) => k !== on)
    )
  }
}

async function ensureAllCredentialImagePreviews() {
  revokeCredentialImageBlobUrls()
  for (const img of personnelCredentialImages.value.filter((i) => !i.signedUrl).slice(0, 80)) {
    void ensureCredentialImagePreview(img)
  }
}

async function onCredentialPickBufferChange(files: File[]) {
  if (files.length === 0) return
  await uploadCredentialImages(files)
  credentialPickBuffer.value = []
  credentialFileUploadRef.value?.clear()
}

async function uploadCredentialImages(files: File[]) {
  const cid = currentProject.value?.id
  if (!cid || files.length === 0) return

  isCredentialImageUploading.value = true
  try {
    for (const f of files) {
      try {
        const meta = await uploadP3SafetyHealthPersonnelCredentialImage(cid, selectedDesignChangeId.value, f)
        const img: P3SafetyHealthPersonnelCredentialImageInfo = {
          objectName: meta.objectName,
          signedUrl: meta.signedUrl ?? null,
          fileName: meta.fileName ?? f.name,
          contentType: meta.contentType ?? f.type,
          fileSize: meta.fileSize ?? f.size,
        }
        personnelCredentialImages.value = [...personnelCredentialImages.value, img]
        if (!img.signedUrl) void ensureCredentialImagePreview(img)
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? '上傳失敗'
        window.alert(msg)
      }
    }
    try {
      await saveTextsWithStatus()
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
      window.alert(msg)
    }
  } finally {
    isCredentialImageUploading.value = false
  }
}

async function removeCredentialImage(objectName: string) {
  const cid = currentProject.value?.id
  if (!cid || !objectName) return
  if (!window.confirm('確定刪除這張證照圖片？')) return
  try {
    await deleteP3SafetyHealthPersonnelCredentialImage(cid, objectName)
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '刪除失敗'
    window.alert(msg)
    return
  }
  personnelCredentialImages.value = personnelCredentialImages.value.filter(
    (i) => i.objectName !== objectName
  )
  try {
    await saveTextsWithStatus()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
    window.alert(msg)
  }
}
let orgChartImageObjectName = ''
let orgChartPendingPromise: Promise<void> | null = null

/**
 * 「品管人員」下拉建議名單：來自工地人員職稱 `QUALITY`（公共工程品質管理人員）。
 * 用於 datalist 提供自動完成；input 仍可自由輸入。
 */
const qualityPersonnelOptions = ref<string[]>([])

/**
 * 「安衛管理組組長／勞安」下拉建議名單：來自工地人員職稱 `LABOUR_SAFETY`（勞安人員）。
 * 用於 datalist 提供自動完成；input 仍可自由輸入。
 */
const safetyPersonnelOptions = ref<string[]>([])

/** 同步切換版本／載入時，重置兩組下拉建議名單。 */
function resetOrgChartPersonnelOptions() {
  qualityPersonnelOptions.value = []
  safetyPersonnelOptions.value = []
}

/** 將 SVG DOM 序列化後轉成 PNG Blob（白底；scale 2x 提高印刷清晰度）。 */
async function svgToPngBlob(svgEl: SVGSVGElement, w: number, h: number, scale = 2): Promise<Blob> {
  const xml = new XMLSerializer().serializeToString(svgEl)
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('SVG 載入失敗'))
      im.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('無法建立 Canvas 2D 環境')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 轉檔失敗'))), 'image/png', 0.95)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 立即將目前 SVG 上傳成 PNG（單張覆蓋；後端會把舊圖刪除）。 */
async function syncOrgChartImageNow(): Promise<void> {
  const cid = currentProject.value?.id
  if (!cid) return
  const svgEl = orgChartSvgRef.value?.getSvgElement()
  const vb = orgChartSvgRef.value?.getViewBox()
  if (!svgEl || !vb) {
    // eslint-disable-next-line no-console
    console.warn('[P3] 組織架構圖 SVG 尚未掛載，跳過上傳')
    return
  }

  isOrgChartUploading.value = true
  try {
    const blob = await svgToPngBlob(svgEl, vb.w, vb.h, 2)
    const file = new File([blob], `p3-org-chart-${Date.now()}.png`, { type: 'image/png' })
    const uploaded = await uploadP3SafetyHealthOrgChartImage(cid, selectedDesignChangeId.value, file)
    orgChartImageObjectName = uploaded.objectName
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '組織架構圖上傳失敗'
    // eslint-disable-next-line no-console
    console.error('[P3] 安全衛生組織架構圖上傳失敗：', e)
    window.alert(msg)
    throw e
  } finally {
    isOrgChartUploading.value = false
  }
}

const debouncedOrgChartUpload = debounce(() => {
  orgChartPendingPromise = syncOrgChartImageNow()
    .catch(() => { /* 已彈窗提示，吞掉避免 unhandled rejection */ })
    .finally(() => {
      orgChartPendingPromise = null
    })
}, 1500)

/**
 * 匯出前確保最新 PNG 已上傳。
 * 為了避免 debounce 還沒 fire、或 server 上仍是舊圖的情況導致匯出抓不到圖，
 * 這裡採取「先 flush 任何 pending，最後一律強制再 sync 一次」最穩妥的策略。
 */
async function ensureOrgChartUploaded(): Promise<void> {
  try { debouncedOrgChartUpload.flush() } catch { /* ignore */ }
  if (orgChartPendingPromise) {
    try { await orgChartPendingPromise } catch { /* ignore */ }
  }
  try {
    await syncOrgChartImageNow()
  } catch {
    /* syncOrgChartImageNow 已彈窗 + 寫 console.error，吞掉避免阻擋整個匯出流程 */
  }
}

let subOrgChartImageObjectName = ''
let subOrgChartPendingPromise: Promise<void> | null = null

/** 協力廠商組織關係圖：立即將目前 SVG 上傳成 PNG（單張覆蓋）。 */
async function syncSubOrgChartImageNow(): Promise<void> {
  const cid = currentProject.value?.id
  if (!cid) return
  const svgEl = subOrgChartSvgRef.value?.getSvgElement()
  const vb = subOrgChartSvgRef.value?.getViewBox()
  if (!svgEl || !vb) {
    // eslint-disable-next-line no-console
    console.warn('[P3] 協力廠商組織關係圖 SVG 尚未掛載，跳過上傳')
    return
  }

  isSubOrgChartUploading.value = true
  try {
    const blob = await svgToPngBlob(svgEl, vb.w, vb.h, 2)
    const file = new File([blob], `p3-sub-org-chart-${Date.now()}.png`, { type: 'image/png' })
    const uploaded = await uploadP3SubcontractorOrgChartImage(cid, selectedDesignChangeId.value, file)
    subOrgChartImageObjectName = uploaded.objectName
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '協力廠商組織關係圖上傳失敗'
    // eslint-disable-next-line no-console
    console.error('[P3] 協力廠商組織關係圖上傳失敗：', e)
    window.alert(msg)
    throw e
  } finally {
    isSubOrgChartUploading.value = false
  }
}

const debouncedSubOrgChartUpload = debounce(() => {
  subOrgChartPendingPromise = syncSubOrgChartImageNow()
    .catch(() => { /* 已彈窗提示，吞掉避免 unhandled rejection */ })
    .finally(() => {
      subOrgChartPendingPromise = null
    })
}, 1500)

/** 匯出前確保協力廠商組織關係圖最新 PNG 已上傳（同安衛組織圖一律強制 re-sync）。 */
async function ensureSubOrgChartUploaded(): Promise<void> {
  try { debouncedSubOrgChartUpload.flush() } catch { /* ignore */ }
  if (subOrgChartPendingPromise) {
    try { await subOrgChartPendingPromise } catch { /* ignore */ }
  }
  try {
    await syncSubOrgChartImageNow()
  } catch {
    /* 已彈窗 + 寫 console.error，吞掉避免阻擋整個匯出流程 */
  }
}

let emergencyContactImageObjectName = ''
let emergencyContactPendingPromise: Promise<void> | null = null

async function syncEmergencyContactImageNow(): Promise<void> {
  const cid = currentProject.value?.id
  if (!cid) return
  const svgEl = emergencyContactSvgRef.value?.getSvgElement()
  const vb = emergencyContactSvgRef.value?.getViewBox()
  if (!svgEl || !vb) {
    console.warn('[P3] 緊急應變聯絡體制 SVG 尚未掛載，跳過上傳')
    return
  }

  isEmergencyContactUploading.value = true
  try {
    const exportSvg = stripEditorOnlyFromSvg(svgEl)
    const blob = await svgToPngBlob(exportSvg, vb.w, vb.h, 2)
    const file = new File([blob], `p3-emergency-contact-${Date.now()}.png`, { type: 'image/png' })
    const uploaded = await uploadP3EmergencyResponseContactImage(cid, selectedDesignChangeId.value, file)
    emergencyContactImageObjectName = uploaded.objectName
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '緊急應變聯絡體制圖上傳失敗'
    console.error('[P3] 緊急應變聯絡體制圖上傳失敗：', e)
    window.alert(msg)
    throw e
  } finally {
    isEmergencyContactUploading.value = false
  }
}

const debouncedEmergencyContactUpload = debounce(() => {
  emergencyContactPendingPromise = syncEmergencyContactImageNow()
    .catch(() => { /* 已彈窗 */ })
    .finally(() => {
      emergencyContactPendingPromise = null
    })
}, 1500)

async function ensureEmergencyContactUploaded(): Promise<void> {
  try { debouncedEmergencyContactUpload.flush() } catch { /* ignore */ }
  if (emergencyContactPendingPromise) {
    try { await emergencyContactPendingPromise } catch { /* ignore */ }
  }
  try {
    await syncEmergencyContactImageNow()
  } catch {
    /* 已彈窗 */
  }
}

let typhoonPreventionContactImageObjectName = ''
let typhoonPreventionContactPendingPromise: Promise<void> | null = null

async function syncTyphoonPreventionContactImageNow(): Promise<void> {
  const cid = currentProject.value?.id
  if (!cid) return
  const svgEl = typhoonPreventionContactSvgRef.value?.getSvgElement()
  const vb = typhoonPreventionContactSvgRef.value?.getViewBox()
  if (!svgEl || !vb) {
    console.warn('[P3] 防颱聯絡體制 SVG 尚未掛載，跳過上傳')
    return
  }

  isTyphoonPreventionContactUploading.value = true
  try {
    const exportSvg = stripEditorOnlyFromSvg(svgEl)
    const blob = await svgToPngBlob(exportSvg, vb.w, vb.h, 2)
    const file = new File([blob], `p3-typhoon-prevention-contact-${Date.now()}.png`, { type: 'image/png' })
    const uploaded = await uploadP3TyphoonPreventionContactImage(cid, selectedDesignChangeId.value, file)
    typhoonPreventionContactImageObjectName = uploaded.objectName
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '防颱聯絡體制圖上傳失敗'
    console.error('[P3] 防颱聯絡體制圖上傳失敗：', e)
    window.alert(msg)
    throw e
  } finally {
    isTyphoonPreventionContactUploading.value = false
  }
}

const debouncedTyphoonPreventionContactUpload = debounce(() => {
  typhoonPreventionContactPendingPromise = syncTyphoonPreventionContactImageNow()
    .catch(() => { /* 已彈窗 */ })
    .finally(() => {
      typhoonPreventionContactPendingPromise = null
    })
}, 1500)

async function ensureTyphoonPreventionContactUploaded(): Promise<void> {
  try { debouncedTyphoonPreventionContactUpload.flush() } catch { /* ignore */ }
  if (typhoonPreventionContactPendingPromise) {
    try { await typhoonPreventionContactPendingPromise } catch { /* ignore */ }
  }
  try {
    await syncTyphoonPreventionContactImageNow()
  } catch {
    /* 已彈窗 */
  }
}

function prefillTyphoonPreventionContactIfEmpty() {
  const cur = typhoonPreventionContactData.value
  const emergency = emergencyContactData.value
  if ((!cur.hospitalName?.trim() || cur.hospitalName === 'XX醫院') && emergency.hospitalName?.trim()) {
    typhoonPreventionContactData.value = { ...cur, hospitalName: emergency.hospitalName }
  }
  if ((!cur.architectOffice?.trim() || cur.architectOffice === 'XX建築師事務所') && emergency.architectOffice?.trim()) {
    typhoonPreventionContactData.value = {
      ...typhoonPreventionContactData.value,
      architectOffice: emergency.architectOffice,
    }
  }
  if (!typhoonPreventionContactData.value.contractorCompanyName?.trim()) {
    const cn =
      emergency.contractorCompanyName?.trim() ||
      orgChartData.value.companyName?.trim()
    if (cn) {
      typhoonPreventionContactData.value = {
        ...typhoonPreventionContactData.value,
        contractorCompanyName: cn,
      }
    }
  }
}

function prefillEmergencyContactIfEmpty() {
  const cur = emergencyContactData.value
  const site = orgChartData.value.siteDirectorName?.trim()
  if ((!cur.siteDirectorName?.trim() || cur.siteDirectorName === 'XX') && site && site !== 'XX') {
    emergencyContactData.value = { ...cur, siteDirectorName: site }
  }
  if (!emergencyContactData.value.contractorCompanyName?.trim()) {
    const cn = orgChartData.value.companyName?.trim()
    if (cn) {
      emergencyContactData.value = { ...emergencyContactData.value, contractorCompanyName: cn }
    }
  }
}

/**
 * 從工程案／工地人員資料自動帶入「公司名稱」「公司負責人」「工地主任」，
 * 並建立「品管人員」「勞安人員」兩組下拉建議名單（datalist）。
 *
 * - 公司名稱／公司負責人／工地主任：**只在使用者尚未填寫時才帶入**，不覆蓋已填值。
 * - 品管／勞安下拉建議名單：**無論欄位是否已填，皆會更新**，
 *   讓 input 旁的 datalist 永遠提供當前專案最新的工地人員選項。
 *
 * 取值優先順序（皆找不到時保留空字串）：
 * - 公司名稱：`workspaceStore.mainContractor.companyName`（與「參與單位管理」頁同來源；最可靠）→
 *            `detail.contractorCompanyName` →
 *            `currentProject.contractorCompanyName` →
 *            `companyStore.getCompanyById(getCurrentContractorCompanyId()).companyName`
 * - 公司負責人：工地人員列表中 `occupation === 'OWNER'` 的第一位姓名
 * - 工地主任：工地人員列表中 `occupation === 'CONSTRUCTION_MANAGER'` 且
 *            `occupationCategory === '工地主任'` 的第一位姓名（找不到子項時退回 CONSTRUCTION_MANAGER 第一位）
 * - 品管 datalist：`occupation === 'QUALITY'` 全部姓名（已去重）
 * - 勞安 datalist：`occupation === 'LABOUR_SAFETY'` 全部姓名（已去重）
 *
 * 註：人員職稱皆共用一次 sitePersonnel API 結果，避免重複請求。
 */
/**
 * 只在欄位仍為空時自動帶入公司名稱／公司負責人／工地主任。
 *
 * 為避免「prefill 期間使用者修改其他欄位、卻被 prefill 結束時的快照覆寫」的競態條件，
 * 這個函式刻意不採用「拷貝→修改→整個取代」的模式，而是每一個自動帶入欄位都：
 *   1. 直接以 `orgChartData.value` 當下狀態為基準；
 *   2. 寫入前再次確認該欄位仍為空（避免覆寫使用者於 await 期間的修改）；
 *   3. 用 `{ ...orgChartData.value, [key]: val }` 的方式只更新該欄位，其餘欄位保留最新值。
 */
async function prefillCompanyAndOwnerIfEmpty(detail?: any) {
  const project = currentProject.value as any

  // 1. 公司名稱
  if (!orgChartData.value.companyName?.trim()) {
    let cn = String((workspaceStore as any).mainContractor?.companyName || '').trim()
    if (!cn) {
      const wsId = workspaceStore.currentWorkspace?.id
      if (wsId) {
        try {
          await (workspaceStore as any).fetchParticipatingUnits(wsId)
          cn = String((workspaceStore as any).mainContractor?.companyName || '').trim()
        } catch {
          /* ignore */
        }
      }
    }
    if (!cn) cn = String(detail?.contractorCompanyName || '').trim()
    if (!cn) cn = String(project?.contractorCompanyName || '').trim()
    if (!cn) {
      const cid = getCurrentContractorCompanyId()
      if (cid) {
        const c = companyStore.getCompanyById(cid) as any
        cn = String(c?.companyName || '').trim()
      }
    }
    if (cn && !orgChartData.value.companyName?.trim()) {
      orgChartData.value = { ...orgChartData.value, companyName: cn }
    }
  }

  // 1b. 協力廠商組織關係圖：左側「公司名稱／工程名稱」自動帶入
  // 與 1. 同來源；只在欄位仍為空時帶入，避免覆寫使用者修改。
  if (!subOrgChartData.value.companyName?.trim()) {
    const cnForSub =
      String((workspaceStore as any).mainContractor?.companyName || '').trim() ||
      String(detail?.contractorCompanyName || '').trim() ||
      String(project?.contractorCompanyName || '').trim() ||
      orgChartData.value.companyName?.trim() || ''
    if (cnForSub && !subOrgChartData.value.companyName?.trim()) {
      subOrgChartData.value = { ...subOrgChartData.value, companyName: cnForSub }
    }
  }
  if (!subOrgChartData.value.constructionName?.trim()) {
    const constructionName =
      String(detail?.constructionName || '').trim() ||
      String(project?.constructionName || project?.name || '').trim()
    if (constructionName && !subOrgChartData.value.constructionName?.trim()) {
      subOrgChartData.value = { ...subOrgChartData.value, constructionName }
    }
  }

  // 2. 工地人員 API：無論欄位是否已填都拉一次，因為下拉名單一定要建立。
  const companyId = getCurrentContractorCompanyId()
  if (companyId) {
    try {
      const list = await sitePersonnelApi.getList(companyId, { effectiveViewType: 'CONTRACTOR' })
      const arr = list as any[]

      // 公司負責人
      if (!orgChartData.value.ownerName?.trim()) {
        const owner = arr.find((p: any) => String(p?.occupation || '').toUpperCase() === 'OWNER')
        const name = String(owner?.fullName || owner?.name || '').trim()
        if (name && !orgChartData.value.ownerName?.trim()) {
          orgChartData.value = { ...orgChartData.value, ownerName: name }
        }
      }

      // 工地主任
      if (!orgChartData.value.siteDirectorName?.trim()) {
        const managers = arr.filter(
          (p: any) => String(p?.occupation || '').toUpperCase() === 'CONSTRUCTION_MANAGER'
        )
        const director =
          managers.find((p: any) => String(p?.occupationCategory || '').trim() === '工地主任') ?? managers[0]
        const name = String(director?.fullName || director?.name || '').trim()
        if (name && !orgChartData.value.siteDirectorName?.trim()) {
          orgChartData.value = { ...orgChartData.value, siteDirectorName: name }
        }
      }

      const collectNames = (occupation: string): string[] => {
        const names = arr
          .filter((p: any) => String(p?.occupation || '').toUpperCase() === occupation)
          .map((p: any) => String(p?.fullName || p?.name || '').trim())
          .filter((s: string) => s.length > 0)
        return Array.from(new Set(names))
      }
      qualityPersonnelOptions.value = collectNames('QUALITY')
      safetyPersonnelOptions.value = collectNames('LABOUR_SAFETY')
    } catch {
      /* 拉不到工地人員清單就略過自動帶入；不清空既有 datalist 名單。 */
    }
  }

  prefillEmergencyContactIfEmpty()
}

const breadcrumbs = [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: 'P類(計劃書)表單', href: 'javascript:;' },
  { text: 'P-3 職業安全衛生管理計畫', active: true },
]

async function onVersionChange(versionId: number | null) {
  // 切換版本前，先把尚未送出的自動儲存與組織架構圖 PNG 立即送出，避免修改遺失
  await flushPendingSavesBeforeSwitch()
  selectedDesignChangeId.value = versionId
  if (!dataReferenceDate.value) {
    dataReferenceDate.value = new Date().toISOString().slice(0, 10)
  }
  revokeLayoutImageBlobUrls()
  revokeCredentialImageBlobUrls()
  orgChartImageObjectName = ''
  subOrgChartImageObjectName = ''
  emergencyContactImageObjectName = ''
  typhoonPreventionContactImageObjectName = ''
  resetOrgChartPersonnelOptions()
  debouncedOrgChartUpload.cancel()
  debouncedSubOrgChartUpload.cancel()
  debouncedEmergencyContactUpload.cancel()
  debouncedTyphoonPreventionContactUpload.cancel()
  await loadTexts()
}

/**
 * 在切換版本／切換專案／離開頁面前呼叫，立刻把 debounce 中的待存資料送出。
 * 注意：lodash debounce.flush() 會同步觸發內部 callback；callback 內為 async，
 * 我們透過 polling autoSaveStatus 讓呼叫端可以等待真正完成才執行下一步。
 */
async function flushPendingSavesBeforeSwitch() {
  try {
    debouncedAutoSave.flush()
    debouncedOrgChartUpload.flush()
    debouncedSubOrgChartUpload.flush()
    debouncedEmergencyContactUpload.flush()
    debouncedTyphoonPreventionContactUpload.flush()
    if (orgChartPendingPromise) {
      await orgChartPendingPromise
    }
    if (subOrgChartPendingPromise) {
      await subOrgChartPendingPromise
    }
    if (emergencyContactPendingPromise) {
      await emergencyContactPendingPromise
    }
    if (typhoonPreventionContactPendingPromise) {
      await typhoonPreventionContactPendingPromise
    }
    if (autoSaveStatus.value === 'saving') {
      const start = Date.now()
      while (autoSaveStatus.value === 'saving' && Date.now() - start < 5000) {
        await new Promise((r) => setTimeout(r, 50))
      }
    }
  } catch {
    /* 失敗時不阻擋切換 */
  }
}

async function loadTexts() {
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value) return

  isTextLoading.value = true
  try {
    const detail = await getConstructionDetail(cid, undefined, 'CONTRACTOR', selectedDesignChangeId.value)
    p3SafetyHealthScaleOverview.value = (detail as any).p3SafetyHealthScaleOverview ?? ''
    constructionLayoutImages.value = parseConstructionLayoutImagesJson(
      (detail as any).p3ConstructionLayoutImagesJson ?? ''
    )
    void ensureAllLayoutImagePreviews()

    const orgRaw = (detail as any).p3SafetyHealthOrgChartJson
    if (typeof orgRaw === 'string' && orgRaw.trim()) {
      try {
        orgChartData.value = normalizeP3OrgChartData(JSON.parse(orgRaw))
      } catch {
        orgChartData.value = {
          ...DEFAULT_P3_ORG_CHART_DATA,
          safetyTeamItems: [...DEFAULT_P3_ORG_CHART_DATA.safetyTeamItems]
        }
      }
    } else {
      orgChartData.value = {
        ...DEFAULT_P3_ORG_CHART_DATA,
        safetyTeamItems: [...DEFAULT_P3_ORG_CHART_DATA.safetyTeamItems]
      }
    }
    safetyTeamItemsText.value = orgChartData.value.safetyTeamItems.join('\n')
    const oldObject = (detail as any).p3SafetyHealthOrgChartImageObjectName
    orgChartImageObjectName = typeof oldObject === 'string' ? oldObject : ''

    // 職業安全衛生管理人員與證照（單筆 JSON）+ 證照圖片（多張）
    const credRaw = (detail as any).p3SafetyHealthPersonnelCredentialJson
    if (typeof credRaw === 'string' && credRaw.trim()) {
      try {
        personnelCredential.value = normalizeP3PersonnelCredential(JSON.parse(credRaw))
      } catch {
        personnelCredential.value = { ...DEFAULT_P3_PERSONNEL_CREDENTIAL, experiences: [] }
      }
    } else {
      personnelCredential.value = { ...DEFAULT_P3_PERSONNEL_CREDENTIAL, experiences: [] }
    }
    personnelCredentialImages.value = parsePersonnelCredentialImagesJson(
      (detail as any).p3SafetyHealthPersonnelCredentialImagesJson ?? ''
    )
    void ensureAllCredentialImagePreviews()

    // 協力廠商組織關係圖
    const subOrgRaw = (detail as any).p3SubcontractorOrgChartJson
    if (typeof subOrgRaw === 'string' && subOrgRaw.trim()) {
      try {
        subOrgChartData.value = normalizeP3SubcontractorOrgChartData(JSON.parse(subOrgRaw))
      } catch {
        subOrgChartData.value = {
          ...DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA,
          materialSuppliers: [...DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA.materialSuppliers]
        }
      }
    } else {
      subOrgChartData.value = {
        ...DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA,
        materialSuppliers: [...DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA.materialSuppliers]
      }
    }
    const oldSubOrgObject = (detail as any).p3SubcontractorOrgChartImageObjectName
    subOrgChartImageObjectName = typeof oldSubOrgObject === 'string' ? oldSubOrgObject : ''

    const emergencyListRaw = (detail as any).p3EmergencyContactListJson
    if (typeof emergencyListRaw === 'string' && emergencyListRaw.trim()) {
      try {
        emergencyContactList.value = normalizeP3EmergencyContactList(JSON.parse(emergencyListRaw))
      } catch {
        emergencyContactList.value = { ...DEFAULT_P3_EMERGENCY_CONTACT_LIST, rows: [] }
      }
    } else {
      emergencyContactList.value = { ...DEFAULT_P3_EMERGENCY_CONTACT_LIST, rows: [] }
    }

    const emergencyRaw = (detail as any).p3EmergencyResponseContactJson
    if (typeof emergencyRaw === 'string' && emergencyRaw.trim()) {
      try {
        emergencyContactData.value = normalizeP3EmergencyResponseContactData(JSON.parse(emergencyRaw))
      } catch {
        emergencyContactData.value = { ...DEFAULT_P3_EMERGENCY_RESPONSE_CONTACT_DATA }
      }
    } else {
      emergencyContactData.value = { ...DEFAULT_P3_EMERGENCY_RESPONSE_CONTACT_DATA }
    }
    const oldEmergencyObject = (detail as any).p3EmergencyResponseContactImageObjectName
    emergencyContactImageObjectName = typeof oldEmergencyObject === 'string' ? oldEmergencyObject : ''

    const typhoonRaw = (detail as any).p3TyphoonPreventionContactJson
    if (typeof typhoonRaw === 'string' && typhoonRaw.trim()) {
      try {
        typhoonPreventionContactData.value = normalizeP3TyphoonPreventionContactData(JSON.parse(typhoonRaw))
      } catch {
        typhoonPreventionContactData.value = { ...DEFAULT_P3_TYPHOON_PREVENTION_CONTACT_DATA }
      }
    } else {
      typhoonPreventionContactData.value = { ...DEFAULT_P3_TYPHOON_PREVENTION_CONTACT_DATA }
    }
    const oldTyphoonObject = (detail as any).p3TyphoonPreventionContactImageObjectName
    typhoonPreventionContactImageObjectName = typeof oldTyphoonObject === 'string' ? oldTyphoonObject : ''

    p3PersonnelAttachmentsJson.value = (detail as any).p3PersonnelAttachmentsJson ?? ''

    if (!dataReferenceDate.value) {
      dataReferenceDate.value = new Date().toISOString().slice(0, 10)
    }

    // 自動帶入公司名稱／公司負責人／工地主任（僅在欄位為空時，避免覆寫使用者已填值）
    void prefillCompanyAndOwnerIfEmpty(detail)
    prefillEmergencyContactIfEmpty()
    prefillTyphoonPreventionContactIfEmpty()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '載入失敗'
    window.alert(msg)
  } finally {
    isTextLoading.value = false
  }
}

async function saveTexts() {
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value) return
  await updateConstruction(
    cid,
    {
      // 僅送 P-3 欄位；後端只更新有帶值的欄位
      p3SafetyHealthScaleOverview: p3SafetyHealthScaleOverview.value,
      p3ConstructionLayoutImagesJson: syncConstructionLayoutImagesJson(),
      p3SafetyHealthOrgChartJson: JSON.stringify(orgChartData.value),
      p3SafetyHealthPersonnelCredentialJson: JSON.stringify(personnelCredential.value),
      p3SafetyHealthPersonnelCredentialImagesJson: syncPersonnelCredentialImagesJson(),
      p3SubcontractorOrgChartJson: JSON.stringify(subOrgChartData.value),
      p3EmergencyResponseContactJson: JSON.stringify(emergencyContactData.value),
      p3EmergencyContactListJson: JSON.stringify(emergencyContactList.value),
      p3TyphoonPreventionContactJson: JSON.stringify(typhoonPreventionContactData.value),
      p3PersonnelAttachmentsJson: p3PersonnelAttachmentsJson.value,
    } as any,
    selectedDesignChangeId.value
  )
}

/** 將 personnelCredentialImages 轉成 JSON（不含 signedUrl，避免短效 URL 寫入 DB）。 */
function syncPersonnelCredentialImagesJson(): string {
  const arr = personnelCredentialImages.value.map((i) => ({
    objectName: i.objectName,
    fileName: i.fileName ?? null,
    contentType: i.contentType ?? null,
    fileSize: i.fileSize ?? null,
  }))
  return JSON.stringify(arr)
}

async function onLayoutPickBufferChange(files: File[]) {
  if (files.length === 0) return
  await uploadLayoutImages(files)
  layoutPickBuffer.value = []
  layoutFileUploadRef.value?.clear()
}

async function uploadLayoutImages(files: File[]) {
  const cid = currentProject.value?.id
  if (!cid || files.length === 0) return

  isLayoutImageUploading.value = true
  try {
    for (const f of files) {
      try {
        const uploaded = await uploadP3ConstructionLayoutImage(cid, selectedDesignChangeId.value, f)
        const img: P3ConstructionLayoutImageInfo = {
          objectName: uploaded.objectName,
          signedUrl: uploaded.signedUrl ?? null,
          fileName: uploaded.fileName ?? f.name,
          contentType: uploaded.contentType ?? f.type,
          fileSize: uploaded.fileSize ?? f.size,
        }
        constructionLayoutImages.value = [...constructionLayoutImages.value, img]
        if (!img.signedUrl) void ensureLayoutImagePreview(img)
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? '上傳失敗'
        window.alert(msg)
        break
      }
    }
    try {
      await saveTextsWithStatus()
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
      window.alert(msg)
    }
  } finally {
    isLayoutImageUploading.value = false
  }
}

async function removeLayoutImage(objectName: string) {
  const cid = currentProject.value?.id
  if (!cid || !objectName) return
  if (!window.confirm('確定刪除此施工平面圖？')) return

  constructionLayoutImages.value = constructionLayoutImages.value.filter((i) => i.objectName !== objectName)
  try {
    await saveTextsWithStatus()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
    window.alert(msg)
    return
  }
  void deleteP3ConstructionLayoutImage(cid, objectName).catch(() => {/* 不阻塞 UI */})
}

/**
 * 自動儲存狀態：
 * - idle:    無事；
 * - pending: 已收到使用者輸入，正在等待 debounce 觸發；
 * - saving:  正在送出儲存請求；
 * - saved:   儲存成功（短暫顯示 1.5 秒後切回 idle）；
 * - error:   儲存失敗。
 */
const autoSaveStatus = ref<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')
let savedFlashTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 包裝 saveTexts，使其同時更新自動儲存狀態指示器。
 * 適用於非 debounce 觸發的立即儲存（如圖片上傳/刪除後、工程案資料建構後）。
 */
async function saveTextsWithStatus() {
  if (savedFlashTimer) {
    clearTimeout(savedFlashTimer)
    savedFlashTimer = null
  }
  autoSaveStatus.value = 'saving'
  try {
    await saveTexts()
    autoSaveStatus.value = 'saved'
    savedFlashTimer = setTimeout(() => {
      if (autoSaveStatus.value === 'saved') autoSaveStatus.value = 'idle'
    }, 1500)
  } catch (e: any) {
    autoSaveStatus.value = 'error'
    throw e
  }
}

async function performAutoSave() {
  try {
    await saveTextsWithStatus()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
    window.alert(msg)
  }
}

const debouncedAutoSave = debounce(performAutoSave, 800)

function scheduleAutoSave() {
  if (autoSaveStatus.value !== 'saving') {
    autoSaveStatus.value = 'pending'
  }
  debouncedAutoSave()
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
    // 匯出前先把最新的安全衛生組織架構圖 PNG 同步到伺服器，避免新版本 / 剛改完欄位時匯出空白
    await ensureOrgChartUploaded()
    // 同樣：匯出前確保協力廠商組織關係圖最新 PNG 已上傳
    await ensureSubOrgChartUploaded()
    await ensureEmergencyContactUploaded()
    await ensureTyphoonPreventionContactUploaded()

    const taskId = `p3-export-${cid}-${Date.now()}`
    const res = await runWithExportLoading(taskId, 'P-3 職業安全衛生管理計畫', (signal) =>
      formPApi.exportP3OccupationalSafetyHealthPlan(request, { signal })
    )
    const fileName = extractFileNameFromResponse(res) || `P-3_職業安全衛生管理計畫_${Date.now()}.docx`
    downloadBlobAsFile(res.data, fileName)
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '匯出失敗'
    window.alert(msg)
  } finally {
    isExporting.value = false
  }
}

async function generateScaleOverviewByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  aiLoading.value.scaleOverview = true
  try {
    // 沿用 P-1 / P-2「工程規模概述」AI 端點：以契約／標單彙整為輸入，輸出概述文字
    const { text } = await getP1TextAiGenerate(cid, selectedDesignChangeId.value)
    p3SafetyHealthScaleOverview.value = text ?? ''
    await saveTextsWithStatus()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoading.value.scaleOverview = false
    isAiGenerating.value = false
  }
}

/**
 * 依工程主要施工項目（標單明細）工程案資料建構產生「材料供應商分類」清單。
 *
 * - 結果整批覆蓋 `subOrgChartData.materialSuppliers`（不會合併既有清單）。
 * - 若使用者已自行填寫過分類，先彈出確認再覆蓋，避免誤刪。
 * - 回傳空陣列時不覆蓋並提示。
 */
async function generateSupplierCategoriesByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  if (
    subOrgChartData.value.materialSuppliers.some((s) => (s ?? '').trim().length > 0) &&
    !window.confirm('已有材料供應商分類，工程案資料建構會整批覆蓋目前清單，確定要繼續嗎？')
  ) {
    return
  }
  isAiGenerating.value = true
  aiLoading.value.subSuppliers = true
  try {
    const { categories } = await generateP3SubcontractorCategoriesByAi(cid, selectedDesignChangeId.value)
    if (!Array.isArray(categories) || categories.length === 0) {
      window.alert('工程案資料建構沒有產生任何分類，請手動新增或稍後再試。')
      return
    }
    subOrgChartData.value = {
      ...subOrgChartData.value,
      materialSuppliers: categories.map((s) => String(s).trim()).filter((s) => s.length > 0),
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '工程案資料建構失敗'
    window.alert(msg)
  } finally {
    aiLoading.value.subSuppliers = false
    isAiGenerating.value = false
  }
}

onMounted(async () => {
  if (!dataReferenceDate.value) {
    dataReferenceDate.value = new Date().toISOString().slice(0, 10)
  }
  await loadTexts()
})

watch(
  () => currentProject.value?.id,
  async (newId, oldId) => {
    // 從一個工程切到另一個工程時，先把舊工程的 pending 自動儲存送出
    if (oldId && newId !== oldId) {
      await flushPendingSavesBeforeSwitch()
    }
    selectedDesignChangeId.value = null
    revokeLayoutImageBlobUrls()
    revokeCredentialImageBlobUrls()
    orgChartImageObjectName = ''
    subOrgChartImageObjectName = ''
    emergencyContactImageObjectName = ''
    typhoonPreventionContactImageObjectName = ''
    debouncedOrgChartUpload.cancel()
    debouncedSubOrgChartUpload.cancel()
    debouncedEmergencyContactUpload.cancel()
    debouncedTyphoonPreventionContactUpload.cancel()
    await loadTexts()
  }
)

/**
 * 監聽組織架構圖結構化資料：欄位變動時除了寫入 JSON 自動儲存外，
 * 也排程把 SVG 轉 PNG 上傳，讓使用者按下匯出時不必再等。
 */
watch(orgChartData, () => {
  scheduleAutoSave()
  debouncedOrgChartUpload()
}, { deep: true })

/** 協力廠商組織關係圖：與 orgChartData 同 pattern */
watch(subOrgChartData, () => {
  scheduleAutoSave()
  debouncedSubOrgChartUpload()
}, { deep: true })

watch(emergencyContactData, () => {
  scheduleAutoSave()
  debouncedEmergencyContactUpload()
}, { deep: true })

watch(emergencyContactList, () => {
  scheduleAutoSave()
}, { deep: true })

watch(typhoonPreventionContactData, () => {
  scheduleAutoSave()
  debouncedTyphoonPreventionContactUpload()
}, { deep: true })

/** 安衛管理組右側列點：以多行文字編輯，再切回陣列同步到 orgChartData */
watch(safetyTeamItemsText, (val) => {
  const items = String(val || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  orgChartData.value = { ...orgChartData.value, safetyTeamItems: items }
})

/** 職業安全衛生管理人員與證照：欄位變動時觸發 debounce auto-save */
watch(personnelCredential, () => {
  scheduleAutoSave()
}, { deep: true })

onUnmounted(() => {
  // 離開頁面前先 flush，避免使用者剛改完資料就切走時 pending 的自動儲存被丟棄。
  // flush 是同步的，但內部 saveTexts 為 async；無法 await，仍以 fire-and-forget 方式送出。
  try { debouncedAutoSave.flush() } catch { /* ignore */ }
  try { debouncedOrgChartUpload.flush() } catch { /* ignore */ }
  try { debouncedSubOrgChartUpload.flush() } catch { /* ignore */ }
  try { debouncedEmergencyContactUpload.flush() } catch { /* ignore */ }
  try { debouncedTyphoonPreventionContactUpload.flush() } catch { /* ignore */ }
  if (savedFlashTimer) {
    clearTimeout(savedFlashTimer)
    savedFlashTimer = null
  }
  revokeLayoutImageBlobUrls()
  revokeCredentialImageBlobUrls()
})
</script>

<style scoped>
/* 版型完全對齊 P-1 / P-2（複製 P-2 必要子集合） */
.form-p3-safety-health-plan-page {
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
  gap: 0.75rem;
}
.p3-autosave-indicator {
  display: inline-flex;
  align-items: center;
  font-size: 0.8125rem;
  line-height: 1;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
  min-height: 26px;
}
.p3-autosave-indicator--idle {
  visibility: hidden;
}
.p3-autosave-indicator--pending {
  color: #ffd479;
  background: rgba(255, 212, 121, 0.08);
  border-color: rgba(255, 212, 121, 0.25);
}
.p3-autosave-indicator--saving {
  color: #6cc6ff;
  background: rgba(108, 198, 255, 0.1);
  border-color: rgba(108, 198, 255, 0.3);
}
.p3-autosave-indicator--saved {
  color: #5dd39e;
  background: rgba(93, 211, 158, 0.12);
  border-color: rgba(93, 211, 158, 0.3);
}
.p3-autosave-indicator--error {
  color: #ff7d7d;
  background: rgba(255, 125, 125, 0.12);
  border-color: rgba(255, 125, 125, 0.35);
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

.p3-file-upload-toolbar :deep(.file-upload__toolbar) {
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 0;
}

.p3-file-upload-toolbar :deep(.file-upload__toolbar-text) {
  display: none;
}

.cred-images .p3-file-upload-toolbar :deep(.file-upload__toolbar) {
  justify-content: flex-end;
}
.text-panel__toolbar .btn-ai-generate {
  padding: 0.45rem 1.05rem;
  font-size: 0.92rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(
    145deg,
    rgba(var(--bs-primary-rgb), 0.58) 0%,
    rgba(var(--bs-primary-rgb), 0.32) 42%,
    rgba(15, 23, 42, 0.45) 100%
  );
  color: #fff;
  font-weight: 600;
}
.text-panel__toolbar .btn-ai-generate:hover:not(:disabled) {
  filter: brightness(1.05);
}
.text-panel__toolbar .btn-ai-generate:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.text-panel__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.text-panel__textarea {
  flex: 1 1 auto;
  min-height: 12rem;
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

/* 施工平面圖縮圖列表（與 P-2 工程相關人員附件同款樣式） */
.cm-attach-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.6rem;
  margin-top: 0.25rem;
}
.cm-attach-img {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.12);
  aspect-ratio: 4 / 3;
}
.cm-attach-img__link {
  display: block;
  width: 100%;
  height: 100%;
}
.cm-attach-img__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cm-attach-img__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cm-attach-img__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  line-height: 1;
}

/* 安全衛生組織架構圖 — 結構化欄位 + SVG 即時預覽 */
.org-chart-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.org-chart-form .form-label {
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 0.25rem;
}
.org-chart-form .form-control,
.org-chart-form textarea.form-control {
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
}
.org-chart-form .form-control::placeholder {
  color: rgba(255, 255, 255, 0.42);
}
.org-chart-form .form-control:focus,
.org-chart-form textarea.form-control:focus {
  background: rgba(0, 0, 0, 0.22);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
  color: rgba(255, 255, 255, 0.92);
}
.org-chart-form .form-check-input {
  background-color: rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
}
.org-chart-form .form-check-input:checked {
  background-color: rgba(var(--bs-primary-rgb), 0.85);
  border-color: rgba(var(--bs-primary-rgb), 0.95);
}
.org-chart-preview__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.4rem 0.75rem;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
  margin-bottom: 0.5rem;
}
.org-chart-preview__toggle:hover,
.org-chart-preview__toggle:focus-visible {
  background: rgba(0, 0, 0, 0.26);
  border-color: rgba(255, 255, 255, 0.24);
  color: rgba(255, 255, 255, 0.92);
  outline: none;
}
.org-chart-preview__title {
  display: inline-flex;
  align-items: center;
}
.org-chart-preview__chevron {
  font-size: 0.8rem;
  opacity: 0.85;
}
.org-chart-preview__canvas {
  background: #fff;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.5rem;
  padding: 0.5rem;
  overflow: auto;
}
/* 職業安全衛生管理人員與證照（經歷動態列） */
.cred-experiences__title,
.cred-images__title {
  color: rgba(255, 255, 255, 0.78);
}
.cred-experiences__head {
  padding: 0.25rem 0.25rem 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 0.4rem;
  color: rgba(255, 255, 255, 0.62);
}
.cred-experiences__head > div {
  padding: 0 0.25rem;
}
.cred-experiences__row {
  margin-bottom: 0.35rem;
}
.emergency-contact-list__head > div {
  padding-right: 0.25rem;
}
/* 與體制圖 SVG 標記同款：藍底白字圓圈（表單略小） */
.p3-editor-marker-badge {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 20px;
  min-height: 20px;
  padding: 0;
  border-radius: 50%;
  background-color: #2563eb;
  border: 1.2px solid #fff;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
  font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif;
  user-select: none;
}
.p3-emergency-editor-box {
  padding: 0.65rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.35rem;
  background: rgba(0, 0, 0, 0.15);
}
.p3-emergency-editor-box__layout {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}
.p3-emergency-editor-box__marker-col {
  padding-top: 1.15rem;
  flex-shrink: 0;
  width: 20px;
}
.p3-emergency-editor-box__marker-col--single {
  padding-top: 0.15rem;
  align-self: center;
}
.cred-experiences__row > div {
  padding: 0 0.25rem;
}
.cred-experiences input.form-control {
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
}
.cred-experiences input.form-control:focus {
  background: rgba(0, 0, 0, 0.22);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
  color: rgba(255, 255, 255, 0.92);
}
.cred-experiences input.form-control::placeholder {
  color: rgba(255, 255, 255, 0.42);
}

.org-chart-preview__canvas svg {
  display: block;
  width: 100%;
  height: auto;
  max-width: 1100px;
  margin: 0 auto;
}
</style>
