<template>
  <div class="daily-report-overview">
    <PageHeader
      :title="dailyLogLabel"
      icon="fa fa-clipboard-list"
      :breadcrumbs="[
        { text: dailyLogManageLabel, href: 'javascript:;' },
        { text: dailyLogLabel, active: true }
      ]"
    />

    <!-- 電腦版 -->
    <div class="d-none d-md-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 action-bar-desktop">
      <div class="d-flex flex-wrap align-items-center gap-3">
        <div class="date-selector">
          <div class="d-flex align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-calendar-alt text-primary"></i>
              <label class="form-label mb-0 fw-bold fs-5 text-primary">填表日期</label>
      </div>
            <div class="d-flex align-items-center gap-2">
              <RepublicDatePicker
                v-model="report.reportDate"
                :disabled="isLoading"
                :use-republic-year="true"
                :disable-holidays="true"
                :construction-id="constructionId"
              />
              <span class="weekday-badge">{{ weekdayText }}</span>
            </div>
          </div>
        </div>
        <div class="weather-selector">
          <div class="d-flex align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-cloud-sun text-primary"></i>
              <label class="form-label mb-0 fw-bold fs-5 text-primary">天氣</label>
            </div>
            <div class="d-flex align-items-center gap-2">
              <select class="form-select form-select-sm" style="width: auto; min-width: 100px;" v-model="report.weather.morning">
                <option value="">請選擇</option>
                <option
                  v-for="weather in weatherOptions"
                  :key="'morning-' + weather"
                  :value="weather"
                >
                  {{ weather }}
                </option>
              </select>
              <span class="small text-muted">上午</span>
              <select class="form-select form-select-sm" style="width: auto; min-width: 100px;" v-model="report.weather.afternoon">
                <option value="">請選擇</option>
                <option
                  v-for="weather in weatherOptions"
                  :key="'afternoon-' + weather"
                  :value="weather"
                >
                  {{ weather }}
                </option>
              </select>
              <span class="small text-muted">下午</span>
              <button
                class="btn btn-sm btn-outline-primary"
                type="button"
                :disabled="isLoading"
                @click="importWeatherFromCalendar"
              >
                <i class="fa fa-calendar-day me-1"></i>
                從行事曆帶入
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <div class="btn-group">
        <button 
          class="btn btn-outline-primary"
            type="button"
            @click="copyFromDate(selectedCopyDate)"
            :disabled="isLoading || !selectedCopyDate"
          >
            <i class="fa fa-copy me-1"></i>
            <span v-if="selectedCopyDate">{{ formatCopyDateDisplay(selectedCopyDate) }}</span>
            <span v-else>從指定日期帶入</span>
          </button>
          <button
            type="button"
            class="btn btn-outline-primary dropdown-toggle dropdown-toggle-split"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          :disabled="isLoading"
        >
            <span class="visually-hidden">切換下拉選單</span>
        </button>
          <ul class="dropdown-menu copy-date-dropdown">
            <li>
              <a class="dropdown-item" href="javascript:;" @click="selectCopyDate('yesterday')">
                <i class="fa fa-calendar-day me-2"></i>昨天
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="javascript:;" @click="selectCopyDate('dayBeforeYesterday')">
                <i class="fa fa-calendar-day me-2"></i>前天
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="javascript:;" @click="selectCopyDate('lastWeek')">
                <i class="fa fa-calendar-week me-2"></i>上週同一天
              </a>
            </li>
            <li><hr class="dropdown-divider" /></li>
            <li>
              <div class="px-3 py-2">
                <label class="form-label small mb-1">自訂日期</label>
                <RepublicDatePicker
                  v-model="customCopyDate"
                  :use-republic-year="true"
                  :disable-holidays="true"
                  :construction-id="constructionId"
                  @update:model-value="selectCopyDate('custom')"
                />
              </div>
            </li>
          </ul>
        </div>
        <button
          class="btn btn-outline-warning"
          type="button"
          :disabled="isLoading || !constructionId"
          @click="showQuantityOverrunModal = true"
        >
          <i class="fa fa-exclamation-triangle me-1"></i>超出數量總表
        </button>
        <button 
          class="btn btn-outline-danger"
          type="button"
          @click="clearForm"
          :disabled="isLoading"
        >
          <i class="fa fa-eraser me-1"></i>清空
        </button>
        <button
          class="btn btn-outline-theme"
          type="button"
          :title="saveButtonTitle"
          @click="saveDraft"
          :disabled="isLoading || autoSaveStatus === 'saving'"
        >
          <i class="fa me-1" :class="saveButtonIconClass"></i>{{ saveButtonLabel }}
        </button>
        <div class="btn-group daily-report-export-group" role="group" aria-label="匯出 Word">
          <button
            type="button"
            class="btn b2-export-btn"
            :disabled="isLoading || isExporting || !report.reportDate"
            @click="exportWord"
          >
            <i class="fa" :class="isExporting ? 'fa-spinner fa-spin' : 'fa-file-word'"></i>
            {{ isExporting ? '匯出中…' : '匯出 Word' }}
          </button>
          <button
            type="button"
            class="btn b2-export-btn b2-export-btn--settings"
            title="匯出設定"
            :disabled="isLoading || isExporting"
            @click="showExportSettingsModal = true"
          >
            <i class="fa fa-cog"></i>
            <span class="visually-hidden">匯出設定</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 手機版 -->
    <div class="d-md-none mb-3 mobile-action-bar">
      <Card class="mb-3 report-card">
        <CardBody class="p-3">
          <div class="mb-3">
            <label class="form-label fw-bold mb-2 d-flex align-items-center gap-2">
              <i class="fa fa-calendar-alt text-primary"></i>
              填表日期
            </label>
            <div class="d-flex align-items-center gap-2">
              <div class="flex-fill">
                <RepublicDatePicker
                  v-model="report.reportDate"
                  :disabled="isLoading"
                  :use-republic-year="true"
                  :disable-holidays="true"
                  :construction-id="constructionId"
                />
              </div>
              <span class="weekday-badge flex-shrink-0">{{ weekdayText }}</span>
            </div>
          </div>
          <div>
            <label class="form-label fw-bold mb-2 d-flex align-items-center gap-2">
              <i class="fa fa-cloud-sun text-primary"></i>
              天氣
            </label>
            <div class="d-flex flex-column gap-2 mb-2">
              <div>
                <label class="form-label small mb-1">上午</label>
                <select class="form-select form-select-sm" v-model="report.weather.morning">
                  <option value="">請選擇</option>
                  <option
                    v-for="weather in weatherOptions"
                    :key="'morning-' + weather"
                    :value="weather"
                  >
                    {{ weather }}
                  </option>
                </select>
              </div>
              <div>
                <label class="form-label small mb-1">下午</label>
                <select class="form-select form-select-sm" v-model="report.weather.afternoon">
                  <option value="">請選擇</option>
                  <option
                    v-for="weather in weatherOptions"
                    :key="'afternoon-' + weather"
                    :value="weather"
                  >
                    {{ weather }}
                  </option>
                </select>
              </div>
            </div>
            <button
              class="btn btn-sm btn-outline-primary w-100"
              type="button"
              :disabled="isLoading"
              @click="importWeatherFromCalendar"
            >
              <i class="fa fa-calendar-day me-1"></i>
              從行事曆帶入
            </button>
          </div>
        </CardBody>
      </Card>
      <div class="d-flex flex-column gap-2">
        <div class="btn-group w-100">
          <button
            class="btn btn-outline-primary"
            type="button"
            @click="copyFromDate(selectedCopyDate)"
            :disabled="isLoading || !selectedCopyDate"
          >
            <i class="fa fa-copy me-1"></i>
            <span v-if="selectedCopyDate">{{ formatCopyDateDisplay(selectedCopyDate) }}</span>
            <span v-else>從指定日期帶入</span>
          </button>
          <button
            type="button"
            class="btn btn-outline-primary dropdown-toggle dropdown-toggle-split"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            :disabled="isLoading"
          >
            <span class="visually-hidden">切換下拉選單</span>
          </button>
          <ul class="dropdown-menu copy-date-dropdown">
            <li>
              <a class="dropdown-item" href="javascript:;" @click="selectCopyDate('yesterday')">
                <i class="fa fa-calendar-day me-2"></i>昨天
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="javascript:;" @click="selectCopyDate('dayBeforeYesterday')">
                <i class="fa fa-calendar-day me-2"></i>前天
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="javascript:;" @click="selectCopyDate('lastWeek')">
                <i class="fa fa-calendar-week me-2"></i>上週同一天
              </a>
            </li>
            <li><hr class="dropdown-divider" /></li>
            <li>
              <div class="px-3 py-2">
                <label class="form-label small mb-1">自訂日期</label>
                <RepublicDatePicker
                  v-model="customCopyDate"
                  :use-republic-year="true"
                  :disable-holidays="true"
                  :construction-id="constructionId"
                  @update:model-value="selectCopyDate('custom')"
                />
              </div>
            </li>
          </ul>
        </div>
        <button
          class="btn btn-outline-warning w-100 mb-2"
          type="button"
          :disabled="isLoading || !constructionId"
          @click="showQuantityOverrunModal = true"
        >
          <i class="fa fa-exclamation-triangle me-1"></i>超出契約數量總表
        </button>
        <div class="d-flex gap-2">
          <button
            class="btn btn-outline-danger flex-fill"
            type="button"
            @click="clearForm"
            :disabled="isLoading"
          >
            <i class="fa fa-eraser me-1"></i>清空
          </button>
          <button
            class="btn btn-outline-theme flex-fill"
            type="button"
            :title="saveButtonTitle"
            @click="saveDraft"
            :disabled="isLoading || autoSaveStatus === 'saving'"
          >
            <i class="fa me-1" :class="saveButtonIconClass"></i>{{ saveButtonLabel }}
          </button>
        </div>
        <div class="btn-group daily-report-export-group w-100" role="group" aria-label="匯出 Word">
          <button
            type="button"
            class="btn b2-export-btn flex-fill"
            :disabled="isLoading || isExporting || !report.reportDate"
            @click="exportWord"
          >
            <i class="fa" :class="isExporting ? 'fa-spinner fa-spin' : 'fa-file-word'"></i>
            {{ isExporting ? '匯出中…' : '匯出 Word' }}
          </button>
          <button
            type="button"
            class="btn b2-export-btn b2-export-btn--settings"
            title="匯出設定"
            :disabled="isLoading || isExporting"
            @click="showExportSettingsModal = true"
          >
            <i class="fa fa-cog"></i>
            <span class="visually-hidden">匯出設定</span>
          </button>
        </div>
      </div>
    </div>

    <div class="report-grid">
      <!-- 工期資訊 -->
      <Card class="report-card report-card--full">
        <CardBody class="report-card__body">
          <div class="row g-4">
            <div class="col-md-6 col-lg-3">
              <label class="form-label small fw-semibold mb-1">核定工期</label>
              <div class="input-group input-group-sm">
                <input
                  type="number"
                  class="form-control text-end"
                  min="0"
                  v-model.number="report.basicInfo.contractPeriod"
                />
                <span class="input-group-text">天</span>
              </div>
            </div>
            <div class="col-md-6 col-lg-3">
              <label class="form-label small fw-semibold mb-1">累計工期</label>
              <div class="input-group input-group-sm">
                  <input
                    type="number"
                  class="form-control text-end"
                    min="0"
                  v-model.number="report.basicInfo.cumulativePeriod"
                  />
                  <span class="input-group-text">天</span>
                </div>
              </div>
            <div class="col-md-6 col-lg-3">
              <label class="form-label small fw-semibold mb-1">剩餘工期</label>
              <div class="input-group input-group-sm">
                  <input
                    type="number"
                  class="form-control text-end"
                    min="0"
                  v-model.number="report.basicInfo.remainingPeriod"
                  />
                  <span class="input-group-text">天</span>
                </div>
              </div>
            <div class="col-md-6 col-lg-3">
              <label class="form-label small fw-semibold mb-1">工期展延天數</label>
              <div class="input-group input-group-sm">
                  <input
                    type="number"
                  class="form-control text-end"
                    min="0"
                  v-model.number="report.basicInfo.extensionDays"
                  />
                  <span class="input-group-text">天</span>
                </div>
              </div>
            <div class="col-md-6 col-lg-3">
              <label class="form-label small fw-semibold mb-1">開工日期</label>
              <RepublicDatePicker
                v-model="report.basicInfo.startDate"
                :use-republic-year="true"
                class="w-100"
              />
            </div>
            <div class="col-md-6 col-lg-3">
              <label class="form-label small fw-semibold mb-1">完工日期</label>
              <RepublicDatePicker
                v-model="report.basicInfo.endDate"
                :use-republic-year="true"
                class="w-100"
              />
            </div>
            <div class="col-md-6 col-lg-3">
              <label class="form-label small fw-semibold mb-1">預定進度</label>
              <div class="input-group input-group-sm">
                  <input
                    type="number"
                  class="form-control text-end"
                    min="0"
                  max="100"
                  step="0.01"
                  v-model.number="report.basicInfo.plannedProgress"
                />
                <span class="input-group-text">%</span>
              </div>
            </div>
            <div class="col-md-6 col-lg-3">
              <label class="form-label small fw-semibold mb-1">實際進度</label>
              <div class="input-group input-group-sm">
                <input
                  type="number"
                  class="form-control text-end"
                  min="0"
                  max="100"
                  step="0.01"
                  v-model.number="report.basicInfo.actualProgress"
                  />
                <span class="input-group-text">%</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('execution')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-clipboard-list report-card__icon text-primary"></i>
              <span class="report-card__title">
                一、依施工計畫書執行修繕施工概況（含約定之重要施工項目及完成數量等）
              </span>
              <span
                v-if="executionOverrunCount > 0"
                class="badge bg-danger-subtle text-danger border border-danger-subtle quantity-overrun-badge"
                title="點擊捲動至第一筆超出項目"
                @click.stop="scrollToFirstExecutionOverrun"
              >
                <i class="fa fa-exclamation-triangle me-1"></i>{{ executionOverrunCount }} 項超出
              </span>
            </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('execution') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </div>
          </CardHeader>
        <CardBody v-show="expandedSections.has('execution')" class="report-card__body">
          <div v-if="isLoading" class="text-center text-muted py-4">
            載入施工項目中…
          </div>
          <div v-else-if="isExecutionSummaryEmpty" class="text-center text-muted py-4">
            目前無可帶入的標單項目（請確認工程標單已匯入）
          </div>
          <DailyReportExecutionTreeGrid
            v-else
            :items="report.executionSummary"
            @quantity-change="onExecutionQuantityChange"
          />
        </CardBody>
        </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('material')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-boxes report-card__icon text-primary"></i>
              <span class="report-card__title">
                二、工程材料管理概況（含約定之重要材料使用狀況及數量等）
              </span>
              <span
                v-if="materialOverrunCount > 0"
                class="badge bg-danger-subtle text-danger border border-danger-subtle quantity-overrun-badge"
                title="點擊捲動至第一筆超出項目"
                @click.stop="scrollToFirstMaterialOverrun"
              >
                <i class="fa fa-exclamation-triangle me-1"></i>{{ materialOverrunCount }} 項超出
              </span>
      </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('material') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
    </div>
        </CardHeader>
        <CardBody v-show="expandedSections.has('material')" class="report-card__body">
          <div class="table-responsive">
            <table class="table table-bordered align-middle report-table">
              <thead class="table-dark">
                <tr>
                  <th class="text-center">材料名稱</th>
                  <th class="text-center">單位</th>
                  <th class="text-center">契約數量</th>
                  <th class="text-center">本日使用數量</th>
                  <th class="text-center">累計使用數量</th>
                  <th class="text-center">備註</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="material in report.materialUsageSummary" 
                  :key="material.id" 
                  :class="{ 
                    'row-expanded': expandedRows.has(`material-${material.id}`),
                    'row-unfilled': !material.id || (!material.todayUsage && !material.remark),
                    'row-overrun-quantity': getMaterialOverrun(material)
                  }"
                >
                  <td data-label="材料名稱" class="row-header" @click="toggleRow(`material-${material.id}`)">
                    <div class="d-flex align-items-center justify-content-between">
                      <div class="d-flex align-items-center gap-2 min-w-0">
                        <span class="text-truncate">{{ material.materialName }}</span>
                        <i
                          v-if="getMaterialOverrun(material)"
                          class="fa fa-exclamation-triangle text-warning flex-shrink-0 quantity-overrun-icon"
                          :title="formatMaterialOverrunTooltip(material)"
                        ></i>
                      </div>
                      <i 
                        class="fa d-md-none ms-2 flex-shrink-0" 
                        :class="expandedRows.has(`material-${material.id}`) ? 'fa-chevron-up' : 'fa-chevron-down'"
                      ></i>
                    </div>
                  </td>
                  <td class="text-center mobile-collapsible" data-label="單位">
                    <span>{{ material.unit }}</span>
                  </td>
                  <td class="mobile-collapsible" data-label="契約數量">
                    <span class="text-end d-block" :class="{ 'text-muted': !material.contractQuantity }">
                      {{ material.contractQuantity ? formatNumber(material.contractQuantity) : '—' }}
                    </span>
                  </td>
                  <td class="mobile-collapsible" data-label="本日使用數量">
                    <input
                      type="number"
                      class="form-control form-control-sm text-end"
                      min="0"
                      step="0.01"
                      :value="material.todayUsage ?? ''"
                      @input="updateMaterialUsageNumber(material, 'todayUsage', $event)"
                    />
                  </td>
                  <td class="mobile-collapsible" data-label="累計使用數量">
                    <input
                      type="number"
                      class="form-control form-control-sm text-end"
                      :class="{ 'quantity-overrun-input': getMaterialOverrun(material) }"
                      min="0"
                      step="0.01"
                      :value="material.cumulativeUsage ?? ''"
                      @input="updateMaterialUsageNumber(material, 'cumulativeUsage', $event)"
                    />
                    <div
                      v-if="getMaterialOverrun(material)"
                      class="small text-danger text-end mt-1"
                    >
                      超出 {{ formatNumber(getMaterialOverrun(material)!.overrunQuantity) }}
                    </div>
                  </td>
                  <td class="mobile-collapsible" data-label="備註">
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="material.remark"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('labor')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-users-cog report-card__icon text-primary"></i>
              <span class="report-card__title">
                三、工地人員及機具管理（含約定之出工人數及機具使用情形及數量）
              </span>
            </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('labor') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </div>
        </CardHeader>
        <CardBody v-show="expandedSections.has('labor')" class="report-card__body">
          <div class="table-responsive">
            <table class="table table-bordered align-middle report-table">
              <thead class="table-dark">
                <tr>
                  <th class="text-center">工別</th>
                  <th class="text-center">本日人數</th>
                  <th class="text-center">累計人數</th>
                  <th class="text-center">機具名稱</th>
                  <th class="text-center">本日使用數量</th>
                  <th class="text-center">累計使用數量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="labor in report.laborEquipmentSummary" :key="labor.id" :class="{ 'row-expanded': expandedRows.has(`labor-${labor.id}`) }">
                  <td data-label="工別" class="row-header" @click="toggleRow(`labor-${labor.id}`)">
                    <div class="d-flex align-items-center justify-content-between">
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        v-model="labor.laborType"
                        @click.stop
                        placeholder="請輸入工別"
                      />
                      <i 
                        class="fa d-md-none ms-2 flex-shrink-0" 
                        :class="expandedRows.has(`labor-${labor.id}`) ? 'fa-chevron-up' : 'fa-chevron-down'"
                      ></i>
                    </div>
                  </td>
                  <td class="mobile-collapsible" data-label="本日人數">
                    <input
                      type="number"
                      class="form-control form-control-sm text-end"
                      min="0"
                      step="1"
                      :value="labor.todayLaborCount ?? ''"
                      @input="updateLaborEquipmentNumber(labor, 'todayLaborCount', $event)"
                    />
                  </td>
                  <td class="mobile-collapsible" data-label="累計人數">
                    <input
                      type="number"
                      class="form-control form-control-sm text-end"
                      min="0"
                      step="1"
                      :value="labor.cumulativeLaborCount ?? ''"
                      @input="updateLaborEquipmentNumber(labor, 'cumulativeLaborCount', $event)"
                    />
                  </td>
                  <td class="mobile-collapsible" data-label="機具名稱">
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="labor.equipmentName"
                    />
                  </td>
                  <td class="mobile-collapsible" data-label="本日使用數量">
                    <input
                      type="number"
                      class="form-control form-control-sm text-end"
                      min="0"
                      step="0.01"
                      :value="labor.todayEquipmentUsage ?? ''"
                      @input="updateLaborEquipmentNumber(labor, 'todayEquipmentUsage', $event)"
                    />
                  </td>
                  <td class="mobile-collapsible" data-label="累計使用數量">
                    <input
                      type="number"
                      class="form-control form-control-sm text-end"
                      min="0"
                      step="0.01"
                      :value="labor.cumulativeEquipmentUsage ?? ''"
                      @input="updateLaborEquipmentNumber(labor, 'cumulativeEquipmentUsage', $event)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-content-end">
            <button class="btn btn-sm btn-outline-primary" type="button" @click="addLaborEquipmentRow">
              <i class="fa fa-plus me-1"></i>新增列
            </button>
          </div>
          </CardBody>
        </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('siteCheck')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-clipboard-check report-card__icon text-primary"></i>
              <span class="report-card__title">四、本日施工項目是否有須依「營造業專業工程特定施工項目應置之技術士種類、比率或人數標準表」規定應設置技術士之專業工程</span>
      </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('siteCheck') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </div>
        </CardHeader>
        <CardBody v-show="expandedSections.has('siteCheck')" class="report-card__body">
          <div class="mb-3">
            <label class="form-label fw-semibold mb-3">
              本日施工項目是否有須依「營造業專業工程特定施工項目應置之技術士種類、比率或人數標準表」規定應設置技術士之專業工程
            </label>
            <div class="d-flex align-items-center gap-3 flex-wrap">
              <div class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="radio"
                  id="hasRequiredTechnicianYes"
                  value="YES"
                  v-model="report.siteCheck.hasRequiredTechnician"
                />
                <label class="form-check-label" for="hasRequiredTechnicianYes">有</label>
              </div>
              <div class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="radio"
                  id="hasRequiredTechnicianNo"
                  value="NO"
                  v-model="report.siteCheck.hasRequiredTechnician"
                />
                <label class="form-check-label" for="hasRequiredTechnicianNo">無</label>
              </div>
            </div>
            <div class="mt-2 text-muted small">
              <i class="fa fa-info-circle me-1"></i>
              此項如勾選"有"，則應填寫後附「公共工程施工日誌之技術士簽章表」
            </div>
          </div>
          </CardBody>
        </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('safety')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-hard-hat report-card__icon text-primary"></i>
              <span class="report-card__title">五、工地職業安全衛生事項之督導、公共環境與安全之維護及其他工地行政事務</span>
      </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('safety') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </div>
        </CardHeader>
        <CardBody v-show="expandedSections.has('safety')" class="report-card__body">
          <div class="mb-4">
            <h6 class="fw-semibold mb-3">(一)施工前檢查事項:</h6>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label fw-semibold">1. 實施勤前教育(含工地預防災變及危害告知)</label>
                <div class="d-flex align-items-center gap-3 flex-wrap">
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="radio"
                      id="preConstructionEducationYes"
                      value="YES"
                      v-model="report.safetyChecklist.preConstructionEducation"
                    />
                    <label class="form-check-label" for="preConstructionEducationYes">有</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="radio"
                      id="preConstructionEducationNo"
                      value="NO"
                      v-model="report.safetyChecklist.preConstructionEducation"
                    />
                    <label class="form-check-label" for="preConstructionEducationNo">無</label>
                  </div>
                </div>
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold">2. 確認新進勞工是否提報勞工保險(或其他商業保險)資料及安全衛生教育訓練紀錄</label>
                <div class="d-flex align-items-center gap-3 flex-wrap">
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="radio"
                      id="newWorkerInsuranceYes"
                      value="YES"
                      v-model="report.safetyChecklist.newWorkerInsurance"
                    />
                    <label class="form-check-label" for="newWorkerInsuranceYes">有</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="radio"
                      id="newWorkerInsuranceNo"
                      value="NO"
                      v-model="report.safetyChecklist.newWorkerInsurance"
                    />
                    <label class="form-check-label" for="newWorkerInsuranceNo">無</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="radio"
                      id="newWorkerInsuranceNoNew"
                      value="NO_NEW_WORKER"
                      v-model="report.safetyChecklist.newWorkerInsurance"
                    />
                    <label class="form-check-label" for="newWorkerInsuranceNoNew">無新進勞工</label>
                  </div>
                </div>
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold">3. 檢查勞工個人防護具</label>
                <div class="d-flex align-items-center gap-3 flex-wrap">
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="radio"
                      id="personalProtectionEquipmentYes"
                      value="YES"
                      v-model="report.safetyChecklist.personalProtectionEquipment"
                    />
                    <label class="form-check-label" for="personalProtectionEquipmentYes">有</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input
                      class="form-check-input"
                      type="radio"
                      id="personalProtectionEquipmentNo"
                      value="NO"
                      v-model="report.safetyChecklist.personalProtectionEquipment"
                    />
                    <label class="form-check-label" for="personalProtectionEquipmentNo">無</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-3">
            <h6 class="fw-semibold mb-3">(二)其他事項:</h6>
            <textarea
              class="form-control"
              rows="3"
              v-model="report.safetyChecklist.otherNotes"
              placeholder="請填寫其他工地行政事務"
            ></textarea>
          </div>
          </CardBody>
        </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('qualityInspection')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-clipboard-check report-card__icon text-primary"></i>
              <span class="report-card__title">六、施工取樣試驗紀錄</span>
      </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('qualityInspection') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </div>
        </CardHeader>
        <CardBody v-show="expandedSections.has('qualityInspection')" class="report-card__body">
          <textarea
            class="form-control"
            rows="3"
            v-model="report.qualityInspectionRecord"
            placeholder="請填寫施工工務檢驗紀錄"
          ></textarea>
          </CardBody>
        </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('subcontractor')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-handshake report-card__icon text-primary"></i>
              <span class="report-card__title">七、通知協力廠商辦理事項</span>
      </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('subcontractor') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
    </div>
        </CardHeader>
        <CardBody v-show="expandedSections.has('subcontractor')" class="report-card__body">
          <textarea
            class="form-control"
            rows="3"
            v-model="report.subcontractorNotice"
            placeholder="請填寫需通知協力廠商辦理之事項"
          ></textarea>
        </CardBody>
      </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('important')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-exclamation-circle report-card__icon text-primary"></i>
              <span class="report-card__title">八、重要事項記錄</span>
            </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('important') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </div>
          </CardHeader>
        <CardBody v-show="expandedSections.has('important')" class="report-card__body">
          <textarea
            class="form-control"
            rows="3"
            v-model="report.importantRecord"
            placeholder="請填寫今日重要事項"
          ></textarea>
        </CardBody>
      </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('technicianSignature')"
                >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-clipboard-list report-card__icon text-primary"></i>
              <span class="report-card__title">九、公共工程施工日誌之技術士簽章表</span>
              </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('technicianSignature') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </div>
        </CardHeader>
        <CardBody v-show="expandedSections.has('technicianSignature')" class="report-card__body">
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold">專業工程項目</label>
              <input
                type="text"
                class="form-control"
                v-model="report.technicianSignatureProject"
                placeholder="請輸入專業工程項目"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">應置技術士人數</label>
              <input
                type="number"
                class="form-control text-end"
                min="0"
                v-model.number="report.technicianSignatureRequiredCount"
                placeholder="0"
              />
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-bordered align-middle report-table">
              <thead class="table-dark">
                <tr>
                  <th class="text-center" style="width: 15%;">技術士種類</th>
                  <th class="text-center" style="width: 10%;">人數</th>
                  <th class="text-center" style="width: 20%;">技術士姓名</th>
                  <th class="text-center" style="width: 20%;">技術士證書字號</th>
                  <th class="text-center" style="width: 20%;">技術士簽名或蓋章</th>
                  <th class="text-center" style="width: 15%;">備註</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(record, recordIndex) in report.technicianSignatureRecords" :key="record.id">
                  <template v-if="record.technicians.length > 0">
                    <template v-for="(technician, techIndex) in record.technicians" :key="technician.id">
                      <tr>
                        <td v-if="techIndex === 0" :rowspan="record.technicians.length" class="text-center align-middle">
                          <input
                            type="text"
                            class="form-control form-control-sm text-center"
                            v-model="record.technicianType"
                            placeholder="A/B/C"
                          />
                        </td>
                        <td v-if="techIndex === 0" :rowspan="record.technicians.length" class="text-center align-middle">
                          <input
                            type="number"
                            class="form-control form-control-sm text-end"
                            min="0"
                            :value="record.count ?? ''"
                            @input="updateTechnicianCount(record, $event)"
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            class="form-control form-control-sm"
                            v-model="technician.name"
                            placeholder="請輸入技術士姓名"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            class="form-control form-control-sm"
                            v-model="technician.certificateNumber"
                            placeholder="請輸入證書字號"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            class="form-control form-control-sm"
                            v-model="technician.signature"
                            placeholder="請輸入簽名或蓋章"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            class="form-control form-control-sm"
                            v-model="technician.remark"
                            placeholder="備註"
                          />
                        </td>
                      </tr>
                    </template>
                  </template>
                  <tr v-else>
                    <td class="text-center align-middle">
                      <input
                        type="text"
                        class="form-control form-control-sm text-center"
                        v-model="record.technicianType"
                        placeholder="A/B/C"
                      />
                    </td>
                    <td class="text-center align-middle">
                      <input
                        type="number"
                        class="form-control form-control-sm text-end"
                        min="0"
                        :value="record.count ?? ''"
                        @input="updateTechnicianCount(record, $event)"
                        placeholder="0"
                      />
                    </td>
                    <td colspan="4" class="text-center text-muted">
                      <small>請輸入人數以顯示技術士欄位</small>
                    </td>
                  </tr>
                </template>
                <tr v-if="report.technicianSignatureRecords.length === 0">
                  <td colspan="6" class="text-center text-muted py-4">
                    <small>尚未新增技術士種類，請點擊「新增技術士種類」按鈕</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-content-end mt-3">
            <button class="btn btn-sm btn-outline-primary" type="button" @click="addTechnicianSignatureRecord">
              <i class="fa fa-plus me-1"></i>新增技術士種類
            </button>
            </div>
          </CardBody>
        </Card>

      <Card class="report-card report-card--full">
        <CardHeader 
          class="report-card__header cursor-pointer" 
          @click="toggleSection('safetyInspection')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-clipboard-list report-card__icon text-primary"></i>
              <span class="report-card__title">十、工地職業安全衛生施工前檢查紀錄表</span>
      </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('safetyInspection') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </div>
        </CardHeader>
        <CardBody v-show="expandedSections.has('safetyInspection')" class="report-card__body">
          <div class="table-responsive">
            <table class="table table-bordered align-middle report-table">
              <thead class="table-dark">
                <tr>
                  <th class="text-center" style="width: 40%;">檢查項目</th>
                  <th class="text-center" colspan="2" style="width: 20%;">檢查結果</th>
                  <th class="text-center" style="width: 40%;">缺失及改善情形</th>
                </tr>
                <tr>
                  <th></th>
                  <th class="text-center">合格</th>
                  <th class="text-center">不合格</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(record, index) in report.safetyInspectionRecords" :key="record.id" :class="{ 'row-expanded': expandedRows.has(`safety-${record.id}`) }">
                  <td data-label="檢查項目" class="row-header" @click="toggleRow(`safety-${record.id}`)">
                    <div class="d-flex align-items-center justify-content-between">
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        v-model="record.inspectionItem"
                        placeholder="請輸入檢查項目"
                        @click.stop
                      />
                      <i 
                        class="fa d-md-none ms-2 flex-shrink-0" 
                        :class="expandedRows.has(`safety-${record.id}`) ? 'fa-chevron-up' : 'fa-chevron-down'"
                      ></i>
                    </div>
                  </td>
                  <td class="text-center mobile-collapsible" data-label="檢查結果 - 合格">
                    <input
                      class="form-check-input"
                      type="radio"
                      :name="'safety-result-' + record.id"
                      value="PASS"
                      v-model="record.result"
                    />
                  </td>
                  <td class="text-center mobile-collapsible" data-label="檢查結果 - 不合格">
                    <input
                      class="form-check-input"
                      type="radio"
                      :name="'safety-result-' + record.id"
                      value="FAIL"
                      v-model="record.result"
                    />
                  </td>
                  <td class="mobile-collapsible" data-label="缺失及改善情形">
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="record.deficiencies"
                      placeholder="請填寫缺失及改善情形"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-content-end mt-3">
            <button class="btn btn-sm btn-outline-primary" type="button" @click="addSafetyInspectionRecord">
              <i class="fa fa-plus me-1"></i>新增檢查項目
            </button>
          </div>
        </CardBody>
      </Card>
    </div>

    <Modal
      v-model:show="showExportSettingsModal"
      title="匯出設定"
      icon="fa fa-cog"
      size="lg"
      modal-id="dailyReportExportSettingsModal"
      cancel-text="取消"
      confirm-text="儲存設定"
      confirm-icon="fa fa-save"
      :is-loading="isSavingExportSettings"
      loading-text="儲存中…"
      @confirm="saveExportSettings"
      @hide="resetExportSettingsDraft"
    >
      <template #body>
        <div v-if="isLoadingExportSettings" class="text-center text-muted py-4">
          <i class="fa fa-spinner fa-spin me-2"></i>載入設定中…
        </div>
        <div v-else class="export-settings-modal">
          <p class="text-muted small mb-3">
            選擇匯出 Word 時，表一要帶入的資料列。設定會儲存至您的帳號，跨裝置共用。
          </p>
          <fieldset class="border rounded p-3 mb-0">
            <legend class="float-none w-auto px-2 fs-6 fw-semibold mb-2">
              一、依施工計畫書執行修繕施工概況（含約定之重要施工項目及完成數量等）
            </legend>
            <div class="form-check mb-2">
              <input
                id="export-pref-item-rows"
                v-model="exportSettingsDraft.executionExportMode"
                class="form-check-input"
                type="radio"
                value="ITEM_ROWS"
              />
              <label class="form-check-label" for="export-pref-item-rows">
                項目列（工項／試驗項明細）
              </label>
              <div class="form-text ms-4">
                僅輸出可填寫的工項與試驗項，扁平列出（不含大項分組列）。
              </div>
            </div>
            <div class="form-check mb-2">
              <input
                id="export-pref-header-rows"
                v-model="exportSettingsDraft.executionExportMode"
                class="form-check-input"
                type="radio"
                value="HEADER_ROWS"
              />
              <label class="form-check-label" for="export-pref-header-rows">
                標題列（大項彙總列）
              </label>
              <div class="form-text ms-4">
                僅輸出倒數第二層大項，以及契約／本日／累計金額彙總。未納入大項子樹的工項／試驗項會直接列於主表。
              </div>
            </div>
            <div
              v-if="exportSettingsDraft.executionExportMode === 'HEADER_ROWS'"
              class="form-check ms-4 mt-2"
            >
              <input
                id="export-pref-attach-details"
                v-model="exportSettingsDraft.executionAttachItemDetails"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label" for="export-pref-attach-details">
                附件（明細另附於文件末尾）
              </label>
              <div class="form-text ms-4">
                倒數第二層大項備註顯示「如附件一」；其子樹工項／試驗項附於文件末尾。其餘工項／試驗項直接列於主表。
              </div>
            </div>
          </fieldset>
          <div v-if="exportSettingsError" class="alert alert-warning py-2 mt-3 mb-0 small">
            {{ exportSettingsError }}
          </div>
        </div>
      </template>
    </Modal>

    <DailyReportQuantityOverrunModal
      v-model:show="showQuantityOverrunModal"
      :construction-id="constructionId"
      :owner-type="dailyReportOwnerTypeParam"
      @open-report-date="openOverrunReportDate"
    />

    <div v-if="errors.length > 0" class="alert alert-danger">
      <h6 class="mb-2">請修正以下錯誤：</h6>
      <ul class="mb-0 ps-3">
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, getCurrentInstance, onBeforeUnmount, onMounted, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { debounce } from 'lodash'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  getDailyReport,
  saveDailyReport,
  exportDailyReportToWord,
  convertToSaveRequest,
  convertFromDetailResponse
} from '@/api/dailyReport'
import {
  DEFAULT_DAILY_REPORT_EXPORT_PREFERENCES,
  getDailyReportExportPreferences,
  saveDailyReportExportPreferences,
  type DailyReportExportPreferences
} from '@/api/userPreference'
import { getCalendarWeatherForDate } from '@/api/construction'
import {
  normalizeCalendarDateKey,
  resolveCalendarDisplayWeather,
} from '@/utils/calendarWeather'
import { useExportLoading } from '@/composables/useExportLoading'
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective'
import { useDailyReportLabels } from '@/composables/useDailyReportLabels'
import type {
  DailyReport,
  ExecutionSummaryItem,
  LaborEquipmentSummaryItem,
  MaterialUsageSummaryItem
} from '@/types/dailyReport'
import { WEATHER_OPTIONS } from '@/types/dailyReport'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DailyReportExecutionTreeGrid from '@/components/daily-report/DailyReportExecutionTreeGrid.vue'
import DailyReportQuantityOverrunModal from '@/components/daily-report/DailyReportQuantityOverrunModal.vue'
import {
  countExecutionOverruns,
  countMaterialOverruns,
  formatOverrunTooltip,
  getMaterialItemOverrun,
  type QuantityOverrunInfo
} from '@/utils/dailyReportQuantityOverrun'

const route = useRoute()
const { proxy } = getCurrentInstance() as { proxy: { $toast?: { success?: (m: string) => void; error?: (m: string) => void } } }
const workspaceStore = useWorkspaceStore()
const { runWithExportLoading } = useExportLoading()
const { viewType } = useViewPerspective()
const { dailyLogLabel, dailyLogManageLabel } = useDailyReportLabels()

const dailyReportOwnerTypeParam = computed(() => {
  const v = viewType.value
  if (v === ViewType.SUPERVISORY) return 'SUPERVISORY'
  if (v === ViewType.CONTRACTOR) return 'CONTRACTOR'
  return undefined
})

const isExecutionSummaryEmpty = computed(() => report.value.executionSummary.length === 0)

/** 觸發超出項數即時重算（子元件直接 mutate 陣列元素時需手動 bump） */
const quantityOverrunTick = ref(0)

const onExecutionQuantityChange = () => {
  quantityOverrunTick.value++
}

const executionOverrunCount = computed(() => {
  quantityOverrunTick.value
  return countExecutionOverruns(report.value.executionSummary)
})

const materialOverrunCount = computed(() => {
  quantityOverrunTick.value
  return countMaterialOverruns(report.value.materialUsageSummary)
})

const getMaterialOverrun = (material: MaterialUsageSummaryItem): QuantityOverrunInfo | null =>
  getMaterialItemOverrun(material)

const formatMaterialOverrunTooltip = (material: MaterialUsageSummaryItem): string => {
  const overrun = getMaterialOverrun(material)
  if (!overrun) return ''
  return formatOverrunTooltip(overrun, material.unit)
}

const scrollToFirstExecutionOverrun = async () => {
  if (!expandedSections.value.has('execution')) {
    expandedSections.value.add('execution')
  }
  await nextTick()
  document.querySelector('.execution-tree-overrun-row')?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  })
}

const scrollToFirstMaterialOverrun = async () => {
  if (!expandedSections.value.has('material')) {
    expandedSections.value.add('material')
  }
  await nextTick()
  document.querySelector('.row-overrun-quantity')?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  })
}

const openOverrunReportDate = async (date: string) => {
  if (!date) return
  report.value.reportDate = date
  await loadReportByDate(date)
}

// 取得當前工程 ID (優先從 URL 參數取得，否則從 Store 取得)
const constructionId = computed(() => (route.query.constructionId as string) || workspaceStore.currentProject?.id || '')

// 從 URL 參數取得日期，如果沒有則使用今天
const initialReportDate = computed(() => {
  const queryDate = route.query.reportDate as string
  if (queryDate) {
    return queryDate
  }
  return new Date().toISOString().split('T')[0]
})

// 響應式資料
const report = ref<DailyReport>({
  projectId: '',
  reportDate: initialReportDate.value,
  status: 'DRAFT',
  basicInfo: {
    projectName: '',
    contractorName: '',
    contractPeriod: 0,
    cumulativePeriod: 0,
    remainingPeriod: 0,
    extensionDays: 0,
    startDate: '',
    endDate: '',
    plannedProgress: 0,
    actualProgress: 0
  },
  weather: {
    morning: '',
    afternoon: ''
  },
  executionSummary: [] as ExecutionSummaryItem[],
  materialUsageSummary: [
    {
      id: '1',
      materialName: '210kg/cm²混凝土',
      unit: 'M3',
      contractQuantity: 800,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '2',
      materialName: '245kg/cm²混凝土',
      unit: 'M3',
      contractQuantity: 200,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '3',
      materialName: '300kg/cm²混凝土',
      unit: 'M3',
      contractQuantity: 150,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '4',
      materialName: '鋼筋',
      unit: '噸',
      contractQuantity: 300,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '5',
      materialName: '水泥',
      unit: '包',
      contractQuantity: 5000,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '6',
      materialName: '砂',
      unit: 'M3',
      contractQuantity: 400,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '7',
      materialName: '碎石',
      unit: 'M3',
      contractQuantity: 600,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '8',
      materialName: '紅磚',
      unit: '塊',
      contractQuantity: 50000,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '9',
      materialName: '二分石',
      unit: 'M3',
      contractQuantity: 300,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '10',
      materialName: 'MD120',
      unit: 'M2',
      contractQuantity: 1200,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '11',
      materialName: 'MD110',
      unit: 'M2',
      contractQuantity: 800,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    },
    {
      id: '12',
      materialName: 'MD100',
      unit: 'M2',
      contractQuantity: 600,
      todayUsage: null,
      cumulativeUsage: null,
      remark: ''
    }
  ],
  laborEquipmentSummary: [
    {
      id: '1',
      laborType: '',
      todayLaborCount: null,
      cumulativeLaborCount: null,
      equipmentName: '',
      todayEquipmentUsage: null,
      cumulativeEquipmentUsage: null
    }
  ],
  materials: [],
  laborRecords: [],
  equipmentRecords: [],
  incomingRecords: [],
  materialInspections: [],
  safetyRecords: [],
  constructionRecords: [],
    siteCheck: {
      hasRequiredTechnician: ''
    },
    safetyChecklist: {
      preConstructionEducation: '',
      newWorkerInsurance: '',
      personalProtectionEquipment: '',
      otherNotes: ''
    },
    qualityInspectionRecord: '',
    subcontractorNotice: '',
    importantRecord: '',
  importantNotes: [],
    technicianSignatureProject: '',
    technicianSignatureRequiredCount: null,
    technicianSignatureRecords: [],
    safetyInspectionRecords: [],
  tomorrowPlans: [],
  preparer: {
    reportingDepartment: '',
    supervisingDepartment: '',
    reviewer: '',
    associateManager: '',
    manager: '',
    siteManager: '',
    generalManager: ''
  }
})

const isLoading = ref(false)
const isExporting = ref(false)
const showExportSettingsModal = ref(false)
const showQuantityOverrunModal = ref(false)
const isLoadingExportSettings = ref(false)
const isSavingExportSettings = ref(false)
const exportSettingsError = ref('')
const exportSettingsDraft = ref<DailyReportExportPreferences>({
  ...DEFAULT_DAILY_REPORT_EXPORT_PREFERENCES
})

function resetExportSettingsDraft() {
  exportSettingsError.value = ''
}

async function loadExportSettings() {
  isLoadingExportSettings.value = true
  exportSettingsError.value = ''
  try {
    exportSettingsDraft.value = await getDailyReportExportPreferences()
  } catch (error) {
    console.error('載入匯出設定失敗:', error)
    exportSettingsDraft.value = { ...DEFAULT_DAILY_REPORT_EXPORT_PREFERENCES }
    exportSettingsError.value = '載入設定失敗，已套用預設值。'
  } finally {
    isLoadingExportSettings.value = false
  }
}

async function saveExportSettings() {
  if (exportSettingsDraft.value.executionExportMode === 'ITEM_ROWS') {
    exportSettingsDraft.value.executionAttachItemDetails = false
  }
  isSavingExportSettings.value = true
  exportSettingsError.value = ''
  try {
    exportSettingsDraft.value = await saveDailyReportExportPreferences(exportSettingsDraft.value)
    proxy?.$toast?.success?.('匯出設定已儲存')
    showExportSettingsModal.value = false
  } catch (error: unknown) {
    const message =
      (error as { message?: string })?.message ??
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      '儲存失敗，請稍後再試'
    exportSettingsError.value = message
  } finally {
    isSavingExportSettings.value = false
  }
}
const isHydrating = ref(false)
const isSwitchingDate = ref(false)
const autoSaveStatus = ref<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')

const saveButtonLabel = computed(() =>
  autoSaveStatus.value === 'saving' ? '儲存中…' : '立即儲存'
)

const saveButtonIconClass = computed(() =>
  autoSaveStatus.value === 'saving' ? 'fa-spinner fa-spin' : 'fa-save'
)

const saveButtonTitle = computed(() => {
  if (autoSaveStatus.value === 'saving') return '正在自動儲存'
  if (autoSaveStatus.value === 'pending') return '修改後將自動儲存'
  return '略過等待，立即儲存'
})
/** 上次成功儲存（或載入）時的請求快照，用於避免儲存回寫觸發無限自動儲存 */
let lastPersistedSnapshot = ''

function getSaveSnapshot(forDate?: string): string {
  try {
    const reportForSave = forDate
      ? { ...report.value, reportDate: forDate }
      : report.value
    return JSON.stringify(convertToSaveRequest(reportForSave))
  } catch {
    return ''
  }
}

function createLoadMergeBase(date: string): DailyReport {
  return {
    ...report.value,
    reportDate: date,
    executionSummary: [],
    materialUsageSummary: [],
    laborEquipmentSummary: []
  }
}

async function applyHydratedReport(nextReport: DailyReport) {
  isHydrating.value = true
  report.value = nextReport
  await nextTick()
  lastPersistedSnapshot = getSaveSnapshot()
  isHydrating.value = false
}
const errors = ref<string[]>([])
const selectedCopyDate = ref<string>('')
const customCopyDate = ref<string>('')

// 可摺疊區塊狀態（預設全部展開）
const expandedSections = ref<Set<string>>(new Set([
  'execution', 
  'material', 
  'labor', 
  'siteCheck', 
  'safety', 
  'qualityInspection', 
  'subcontractor', 
  'important',
  'technicianSignature',
  'safetyInspection'
]))

// 表格行展開狀態（手機版用）
const expandedRows = ref<Set<string>>(new Set())

// 切換區塊展開/摺疊
const toggleSection = (sectionId: string) => {
  if (expandedSections.value.has(sectionId)) {
    expandedSections.value.delete(sectionId)
  } else {
    expandedSections.value.add(sectionId)
  }
}

// 切換表格行展開/摺疊（手機版用）
const toggleRow = (rowId: string) => {
  if (expandedRows.value.has(rowId)) {
    expandedRows.value.delete(rowId)
  } else {
    expandedRows.value.add(rowId)
  }
}

// 計算屬性
const weatherOptions = computed(() => WEATHER_OPTIONS)

const importWeatherFromCalendar = async () => {
  if (!constructionId.value || !report.value.reportDate) {
    proxy.$toast?.error?.('請先選擇填表日期')
    return
  }
  if (!dailyReportOwnerTypeParam.value) {
    proxy.$toast?.error?.('目前視角無法帶入行事曆天氣')
    return
  }
  try {
    const dateKey = normalizeCalendarDateKey(report.value.reportDate)
    const data = await getCalendarWeatherForDate(
      constructionId.value,
      dateKey,
      dailyReportOwnerTypeParam.value
    )
    const resolved = resolveCalendarDisplayWeather(data)
    if (!resolved.morning && !resolved.afternoon) {
      proxy.$toast?.warning?.('該日尚無天氣資料，請確認已設定氣象站且系統已開始紀錄，或於行事曆手動編輯天氣')
      return
    }
    if (resolved.morning) report.value.weather.morning = resolved.morning
    if (resolved.afternoon) report.value.weather.afternoon = resolved.afternoon
    const usedCwaFallback = !resolved.morningFromUser && !resolved.afternoonFromUser
    proxy.$toast?.success?.(usedCwaFallback ? '已從行事曆帶入氣象局天氣' : '已從行事曆帶入天氣')
  } catch (error) {
    console.error('從行事曆帶入天氣失敗:', error)
    proxy.$toast?.error?.('從行事曆帶入天氣失敗')
  }
}

const reportDateDisplay = computed(() => formatDate(report.value.reportDate))

const weekdayText = computed(() => {
  if (!report.value.reportDate) return ''
  const parsed = new Date(report.value.reportDate)
  if (Number.isNaN(parsed.getTime())) return ''
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[parsed.getDay()]
})

// 方法
const formatDate = (date: string) => {
  if (!date) {
    return ''
  }
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  return parsed.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

// 格式化工期日期顯示（年月日格式）
const formatPeriodDate = (date: string) => {
  if (!date) {
    return ''
  }
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year} 年 ${month} 月 ${day} 日`
}

const addLaborEquipmentRow = () => {
  const nextId = (report.value.laborEquipmentSummary.length + 1).toString()
  report.value.laborEquipmentSummary.push({
    id: nextId,
    laborType: '',
    todayLaborCount: null,
    cumulativeLaborCount: null,
    equipmentName: '',
    todayEquipmentUsage: null,
    cumulativeEquipmentUsage: null
  })
}

const updateTechnicianCount = (record: any, event: Event) => {
  const target = event.target as HTMLInputElement | null
  const value = target?.value ?? ''
  const count = value === '' ? 0 : Number(value)
  
  record.count = count === 0 ? null : count
  
  // 根據人數調整技術士數量
  const currentCount = record.technicians.length
  if (count > currentCount) {
    // 增加技術士
    for (let i = currentCount; i < count; i++) {
      record.technicians.push({
        id: `${record.id}-${i + 1}`,
        name: '',
        certificateNumber: '',
        signature: '',
        remark: ''
      })
    }
  } else if (count < currentCount) {
    // 減少技術士
    record.technicians = record.technicians.slice(0, count)
  }
}

const addTechnicianSignatureRecord = () => {
  const nextId = Date.now().toString()
  const technicianTypes = ['A', 'B', 'C']
  const currentTypes = report.value.technicianSignatureRecords.map(r => r.technicianType)
  let newType = technicianTypes.find(t => !currentTypes.includes(t)) || String.fromCharCode(65 + report.value.technicianSignatureRecords.length)
  
  report.value.technicianSignatureRecords.push({
    id: nextId,
    technicianType: newType,
    count: null,
    technicians: []
  })
}

const addSafetyInspectionRecord = () => {
  const nextId = Date.now().toString()
  report.value.safetyInspectionRecords.push({
    id: nextId,
    inspectionItem: '',
    result: '',
    deficiencies: ''
  })
}

const updateMaterialUsageNumber = (
  item: MaterialUsageSummaryItem,
  key: 'todayUsage' | 'cumulativeUsage',
  event: Event
) => {
  const target = event.target as HTMLInputElement | null
  const value = target?.value ?? ''
  item[key] = value === '' ? null : Number(value)
  quantityOverrunTick.value++
}

const updateLaborEquipmentNumber = (
  item: LaborEquipmentSummaryItem,
  key:
    | 'todayLaborCount'
    | 'cumulativeLaborCount'
    | 'todayEquipmentUsage'
    | 'cumulativeEquipmentUsage',
  event: Event
) => {
  const target = event.target as HTMLInputElement | null
  const value = target?.value ?? ''
  item[key] = value === '' ? null : Number(value)
}

// 格式化數字顯示
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

// 格式化帶入日期顯示
const formatCopyDateDisplay = (date: string) => {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `從 ${month}/${day} 帶入`
}

// 選擇要帶入的日期
const selectCopyDate = (type: string) => {
  const today = new Date()
  let date: Date

  switch (type) {
    case 'yesterday':
      date = new Date(today)
      date.setDate(date.getDate() - 1)
      break
    case 'dayBeforeYesterday':
      date = new Date(today)
      date.setDate(date.getDate() - 2)
      break
    case 'lastWeek':
      date = new Date(today)
      date.setDate(date.getDate() - 7)
      break
    case 'custom':
      if (customCopyDate.value) {
        selectedCopyDate.value = customCopyDate.value
      }
      return
    default:
      return
  }

  selectedCopyDate.value = date.toISOString().split('T')[0]
}

// 從指定日期帶入資料
const copyFromDate = async (date: string) => {
  if (!date) return

  isLoading.value = true
  try {
    // TODO: 實作從指定日期複製資料的 API
    // const response = await fetch(`/api/daily-reports?date=${date}`)
    // const data = await response.json()
    // 將資料填入 report.value
  } catch (error) {
    console.error('複製失敗:', error)
    errors.value.push(`從 ${date} 帶入資料失敗`)
  } finally {
    isLoading.value = false
  }
}

// 清空表單
const clearForm = () => {
  if (!confirm('確定要清空所有資料嗎？此操作無法復原。')) {
    return
  }

  debouncedAutoSave.cancel()
  autoSaveStatus.value = 'idle'
  lastPersistedSnapshot = ''

  // 重置為初始狀態
  report.value = {
    projectId: '',
    reportDate: new Date().toISOString().split('T')[0],
    status: 'DRAFT',
    basicInfo: {
      projectName: '',
      contractorName: '',
      contractPeriod: 0,
      cumulativePeriod: 0,
      remainingPeriod: 0,
      extensionDays: 0,
      startDate: '',
      endDate: '',
      plannedProgress: 0,
      actualProgress: 0
    },
    weather: {
      morning: '',
      afternoon: ''
    },
    executionSummary: [
      {
        id: '1',
        code: '0066300004',
        item: '營繕工程綜合保險費',
        unit: '式',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '2',
        code: '0131010004',
        item: '施工管理及協調，契約管理系統',
        unit: '式',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '3',
        code: '0131020004',
        item: '施工管理及協調，計畫管理及協調雜項',
        unit: '式',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '4',
        code: '0133030004',
        item: '資料送審，施工製造圖',
        unit: '式',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '5',
        code: '0133040004',
        item: '資料送審，工作圖',
        unit: '式',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '6',
        code: '0133080004',
        item: '資料送審，雜項資料',
        unit: '式',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '7',
        code: '0134010004',
        item: '施工查核，試驗保養及資料費',
        unit: '式',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '8',
        code: '0134020001',
        item: '施工查核，現場管理人員費',
        unit: '人月',
        contractQuantity: 12,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '9',
        code: '0135010001',
        item: '施工前測量工程成本',
        unit: '工項',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '10',
        code: '0135020001',
        item: '施工前安全衛生設施架設',
        unit: '工項',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '11',
        code: '0211010100',
        item: '場地整理，清除雜草',
        unit: 'M2',
        contractQuantity: 500,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '12',
        code: '0211010200',
        item: '場地整理，清除雜物',
        unit: 'M2',
        contractQuantity: 300,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '13',
        code: '0211020100',
        item: '臨時設施，道路鋪設',
        unit: 'M',
        contractQuantity: 120,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '14',
        code: '0211030100',
        item: '臨時設施，臨時排水溝',
        unit: 'M',
        contractQuantity: 150,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '15',
        code: '0211040100',
        item: '臨時設施，臨時電力設置',
        unit: '式',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      },
      {
        id: '16',
        code: '0211050100',
        item: '臨時設施，臨時供水設置',
        unit: '式',
        contractQuantity: 1,
        todayQuantity: null,
        cumulativeQuantity: null,
        remark: ''
      }
    ],
    materialUsageSummary: [
      {
        id: '1',
        materialName: '210kg/cm²混凝土',
        unit: 'M3',
        contractQuantity: 800,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '2',
        materialName: '245kg/cm²混凝土',
        unit: 'M3',
        contractQuantity: 200,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '3',
        materialName: '300kg/cm²混凝土',
        unit: 'M3',
        contractQuantity: 150,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '4',
        materialName: '鋼筋',
        unit: '噸',
        contractQuantity: 300,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '5',
        materialName: '水泥',
        unit: '包',
        contractQuantity: 5000,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '6',
        materialName: '砂',
        unit: 'M3',
        contractQuantity: 400,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '7',
        materialName: '碎石',
        unit: 'M3',
        contractQuantity: 600,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '8',
        materialName: '紅磚',
        unit: '塊',
        contractQuantity: 50000,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '9',
        materialName: '二分石',
        unit: 'M3',
        contractQuantity: 300,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '10',
        materialName: 'MD120',
        unit: 'M2',
        contractQuantity: 1200,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '11',
        materialName: 'MD110',
        unit: 'M2',
        contractQuantity: 800,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      },
      {
        id: '12',
        materialName: 'MD100',
        unit: 'M2',
        contractQuantity: 600,
        todayUsage: null,
        cumulativeUsage: null,
        remark: ''
      }
    ],
    laborEquipmentSummary: [
      {
        id: '1',
        laborType: '',
        todayLaborCount: null,
        cumulativeLaborCount: null,
        equipmentName: '',
        todayEquipmentUsage: null,
        cumulativeEquipmentUsage: null
      }
    ],
    materials: [],
    laborRecords: [],
    equipmentRecords: [],
    incomingRecords: [],
    materialInspections: [],
    safetyRecords: [],
    constructionRecords: [],
    siteCheck: {
      hasRequiredTechnician: ''
    },
    safetyChecklist: {
      preConstructionEducation: '',
      newWorkerInsurance: '',
      personalProtectionEquipment: '',
      otherNotes: ''
    },
    qualityInspectionRecord: '',
    subcontractorNotice: '',
    importantRecord: '',
    technicianSignatureProject: '',
    technicianSignatureRequiredCount: null,
    technicianSignatureRecords: [],
    safetyInspectionRecords: [],
    importantNotes: [],
    tomorrowPlans: [],
    preparer: {
      reportingDepartment: '',
      supervisingDepartment: '',
      reviewer: '',
      associateManager: '',
      manager: '',
      siteManager: '',
      generalManager: ''
    }
  }
  
  errors.value = []
  selectedCopyDate.value = ''
  customCopyDate.value = ''
}

async function persistDailyReport(showSuccessAlert = false, targetDate?: string) {
  if (!constructionId.value) {
    if (showSuccessAlert) alert('找不到工程 ID，無法儲存')
    throw new Error('missing constructionId')
  }
  const saveDate = targetDate ?? report.value.reportDate
  if (!saveDate) {
    if (showSuccessAlert) alert('請先選擇填表日期')
    throw new Error('missing reportDate')
  }

  autoSaveStatus.value = 'saving'

  try {
    const saveRequest = convertToSaveRequest({ ...report.value, reportDate: saveDate })
    const response = await saveDailyReport(
      constructionId.value,
      saveDate,
      saveRequest,
      dailyReportOwnerTypeParam.value
    )

    if (saveDate === report.value.reportDate) {
      await applyHydratedReport(convertFromDetailResponse(response, report.value))
    }

    autoSaveStatus.value = 'idle'
    if (showSuccessAlert) {
      alert('儲存成功')
    } else {
      proxy?.$toast?.success?.('已自動儲存')
    }
  } catch (error) {
    autoSaveStatus.value = 'error'
    console.error('儲存失敗:', error)
    if (showSuccessAlert) {
      alert('儲存失敗，請檢查網路或稍後再試')
    } else {
      proxy?.$toast?.error?.('自動儲存失敗')
    }
    throw error
  }
}

async function performAutoSave() {
  if (getSaveSnapshot() === lastPersistedSnapshot) {
    if (autoSaveStatus.value === 'pending') autoSaveStatus.value = 'idle'
    return
  }
  try {
    await persistDailyReport(false)
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    const msg = err?.response?.data?.message ?? err?.message ?? '自動儲存失敗'
    console.error(msg)
  }
}

const debouncedAutoSave = debounce(performAutoSave, 800)

function scheduleAutoSave() {
  if (isHydrating.value || isLoading.value || isSwitchingDate.value) return
  if (!constructionId.value || !report.value.reportDate) return

  const snapshot = getSaveSnapshot()
  if (snapshot === lastPersistedSnapshot) {
    if (autoSaveStatus.value === 'pending') autoSaveStatus.value = 'idle'
    return
  }

  if (autoSaveStatus.value !== 'saving') {
    autoSaveStatus.value = 'pending'
  }
  debouncedAutoSave()
}

async function flushPendingAutoSave() {
  try {
    debouncedAutoSave.flush()
    if (autoSaveStatus.value === 'saving') {
      const start = Date.now()
      while (autoSaveStatus.value === 'saving' && Date.now() - start < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
  } catch {
    /* 失敗時不阻擋切換 */
  }
}

const saveDraft = async () => {
  debouncedAutoSave.cancel()
  await persistDailyReport(true)
}

// 匯出 Word 文檔（樣板已統一，依目前視角帶 ownerType；type 固定使用 construction）
const exportWord = async () => {
  if (!constructionId.value) {
    alert('找不到工程 ID，無法匯出')
    return
  }

  if (!report.value.reportDate) {
    alert('請先選擇填表日期')
    return
  }

  isExporting.value = true
  try {
    await flushPendingAutoSave()
    await runWithExportLoading('daily-report-word', '工程日報表 Word', async (signal) => {
      await exportDailyReportToWord(constructionId.value, report.value.reportDate!, 'construction', {
        signal,
        ownerType: dailyReportOwnerTypeParam.value
      })
    })
  } catch (error) {
    if ((error as any)?.name === 'AbortError' || (error as any)?.code === 'ERR_CANCELED') return
    console.error('匯出失敗:', error)
    alert('匯出失敗，請檢查網路或稍後再試')
  } finally {
    isExporting.value = false
  }
}

// 載入指定日期的日報表資料
const loadReportByDate = async (date: string) => {
  if (!date) return
  if (!constructionId.value) {
    console.warn('⚠️ 無法載入日報表：缺少 constructionId')
    return
  }
  debouncedAutoSave.cancel()
  autoSaveStatus.value = 'idle'
  isLoading.value = true
  try {
    const response = await getDailyReport(constructionId.value, date, dailyReportOwnerTypeParam.value)
    await applyHydratedReport(
      convertFromDetailResponse(response, createLoadMergeBase(date))
    )
  } catch (error: any) {
    isHydrating.value = true
    report.value.executionSummary = []
    await nextTick()
    lastPersistedSnapshot = getSaveSnapshot()
    isHydrating.value = false
    if (error?.response?.status !== 404) {
      console.error('載入日報表失敗:', error)
    }
  } finally {
    isLoading.value = false
  }
}

watch(
  () => report.value,
  () => {
    scheduleAutoSave()
  },
  { deep: true }
)

// 監聽日期變化：先將未儲存資料寫回「舊日期」，再載入新日期（避免寫錯日報）
watch(
  () => report.value.reportDate,
  async (newDate, oldDate) => {
    if (!oldDate || newDate === oldDate) return

    isSwitchingDate.value = true
    debouncedAutoSave.cancel()
    autoSaveStatus.value = 'idle'

    try {
      const oldDateSnapshot = getSaveSnapshot(oldDate)
      if (oldDateSnapshot !== lastPersistedSnapshot) {
        try {
          await persistDailyReport(false, oldDate)
        } catch (error) {
          console.error('切換日期前儲存舊日報失敗:', error)
        }
      }
      await loadReportByDate(newDate)
    } finally {
      isSwitchingDate.value = false
    }
  }
)

// 監聽路由參數變化，當從日曆跳轉過來時自動選中日期
watch(
  () => route.query.reportDate,
  (newDate) => {
    if (newDate && typeof newDate === 'string' && newDate !== report.value.reportDate) {
      report.value.reportDate = newDate
    }
  }
)

watch(viewType, async () => {
  await flushPendingAutoSave()
  if (report.value.reportDate) {
    await loadReportByDate(report.value.reportDate)
  }
})

onBeforeRouteLeave(async () => {
  await flushPendingAutoSave()
})

onBeforeUnmount(() => {
  debouncedAutoSave.cancel()
})

const initDailyReportPage = async () => {
  const dateFromQuery = route.query.reportDate as string
  if (dateFromQuery) {
    report.value.reportDate = dateFromQuery
    await loadReportByDate(dateFromQuery)
  } else {
    await loadReportByDate(report.value.reportDate)
  }
}

// 生命週期
watch(showExportSettingsModal, (visible) => {
  if (visible) {
    void loadExportSettings()
  }
})

onMounted(() => {
  void initDailyReportPage()
})
</script>

<style scoped>
.daily-report-overview {
  padding: 1rem;
}

@media (max-width: 575.98px) {
  .daily-report-overview {
    padding: 0.5rem;
  }
}

.action-bar {
  gap: 1rem;
}

.daily-report-export-group {
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
.daily-report-export-group:hover:not(:has(.b2-export-btn:disabled)) {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.38);
  filter: brightness(1.05);
  box-shadow:
    0 8px 24px rgba(var(--bs-primary-rgb), 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.daily-report-export-group:active:not(:has(.b2-export-btn:disabled)) {
  transform: translateY(0);
  filter: brightness(0.98);
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
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transition:
    background-color 0.16s ease,
    opacity 0.16s ease;
}
.b2-export-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}
.b2-export-btn:active:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}
.b2-export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.daily-report-export-group .b2-export-btn:first-child {
  border-top-left-radius: 999px;
  border-bottom-left-radius: 999px;
}
.daily-report-export-group .b2-export-btn:last-child {
  border-top-right-radius: 999px;
  border-bottom-right-radius: 999px;
  border-left: 1px solid rgba(255, 255, 255, 0.18);
  padding-left: 0.75rem;
  padding-right: 0.85rem;
}
.daily-report-export-group .b2-export-btn--settings {
  min-width: 2.75rem;
}

.date-selector {
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(var(--bs-primary-rgb), 0.08) 0%, rgba(var(--bs-primary-rgb), 0.03) 100%);
  border-left: 3px solid var(--bs-primary);
  border-radius: 0.375rem;
}

.weather-selector {
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(var(--bs-primary-rgb), 0.08) 0%, rgba(var(--bs-primary-rgb), 0.03) 100%);
  border-left: 3px solid var(--bs-primary);
  border-radius: 0.375rem;
}

.date-selector label {
  letter-spacing: 0.5px;
}

.date-selector .fa-calendar-alt {
  font-size: 1.25rem;
}

.date-selector :deep(.republic-date-picker) {
  min-width: 225px;
  max-width: 320px;
}

@media (max-width: 767.98px) {
  .date-selector :deep(.republic-date-picker) {
    min-width: 180px;
    max-width: 100%;
    width: 100%;
  }
  
  .weather-selector .form-select {
    min-width: 100px;
    flex: 1;
  }
  
  .weather-selector .btn {
    width: 100%;
    margin-top: 0.5rem;
  }
}

.weekday-badge {
  color: var(--bs-secondary);
  font-weight: 500;
  font-size: 0.875rem;
  white-space: nowrap;
}

.copy-date-dropdown {
  min-width: 250px;
}

.copy-date-dropdown .republic-date-picker {
  width: 100%;
}

.report-grid {
  display: grid;
  gap: 1.5rem;
}

@media (max-width: 767.98px) {
  .report-grid {
    gap: 1rem;
  }
}

.report-card {
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  color: var(--bs-body-color);
}

.report-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--bs-border-color-translucent);
  background: linear-gradient(
    135deg,
    rgba(var(--bs-primary-rgb), 0.08) 0%,
    rgba(var(--bs-primary-rgb), 0.03) 60%,
    transparent 100%
  );
}

.cursor-pointer {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cursor-pointer:hover {
  background: linear-gradient(
    135deg,
    rgba(var(--bs-primary-rgb), 0.12) 0%,
    rgba(var(--bs-primary-rgb), 0.06) 60%,
    transparent 100%
  );
}

.report-card__icon {
  font-size: 1.125rem;
}

.report-card__title {
  font-weight: 600;
  font-size: 1rem;
}

.report-card__body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.report-card--full {
  grid-column: 1 / -1;
}

.metric-grid {
  display: grid;
  gap: 1rem;
}

.metric-item {
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.9rem;
  padding: 1rem 1.1rem;
  background: var(--bs-secondary-bg);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
}

.metric-label {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 0.35rem;
  color: var(--bs-secondary-color);
}

.metric-input .input-group-text {
  font-weight: 600;
}

.report-table th,
.report-table td {
  vertical-align: middle;
  white-space: nowrap;
}

.report-table thead.table-dark th {
  background-color: #1e293b;
  color: #f1f5f9;
  border-color: #334155;
  font-weight: 600;
}

/* 施工項目表格：黑暗模式（桌面） */
.report-table {
  --report-table-border: #334155;
  --report-table-row-bg: rgba(15, 23, 42, 0.45);
  --report-table-row-hover: rgba(51, 65, 85, 0.55);
  --report-table-row-unfilled: rgba(15, 23, 42, 0.25);
  --report-table-input-bg: #2d3139;
  --report-table-input-border: #4a4d54;
  --report-table-text: #e2e8f0;
  --report-table-muted: #94a3b8;
}

.report-table tbody td {
  color: var(--report-table-text);
  border-color: var(--report-table-border);
  background-color: var(--report-table-row-bg);
}

.report-table tbody tr:hover td {
  background-color: var(--report-table-row-hover);
}

.report-table tbody tr.row-unfilled td {
  background-color: var(--report-table-row-unfilled);
}

.report-table tbody tr.row-overrun-quantity td {
  background-color: rgba(220, 53, 69, 0.12);
}

.report-table tbody tr.row-overrun-quantity:hover td {
  background-color: rgba(220, 53, 69, 0.18);
}

.quantity-overrun-badge {
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.quantity-overrun-icon {
  cursor: help;
  font-size: 0.85rem;
}

.quantity-overrun-input {
  border-color: var(--bs-danger) !important;
  color: var(--bs-danger);
  font-weight: 600;
}

.report-table td input.form-control,
.report-table td textarea.form-control {
  min-width: 100px;
  background-color: var(--report-table-input-bg);
  border-color: var(--report-table-input-border);
  color: #f1f5f9;
}

.report-table td input.form-control::placeholder {
  color: var(--report-table-muted);
}

.report-table td input.form-control:focus,
.report-table td textarea.form-control:focus {
  background-color: #343a45;
  border-color: #60a5fa;
  color: #f8fafc;
  box-shadow: 0 0 0 0.2rem rgba(96, 165, 250, 0.2);
}

.report-table .text-muted {
  color: var(--report-table-muted) !important;
}


.report-table td:last-child input.form-control {
  min-width: 140px;
}

/* 電腦版：確保所有欄位正常顯示 */
@media (min-width: 768px) {
  .report-table td.mobile-collapsible {
    display: table-cell !important;
  }
  
  .report-table td.row-header {
    cursor: default;
    padding: 0.5rem !important;
    margin: 0;
    border-bottom: none;
    background-color: transparent;
    border-radius: 0;
  }
  
  .report-table td.row-header > div {
    display: flex;
    align-items: center;
  }
  
  .report-table td.row-header input {
    flex: 1;
  }
}

@media (max-width: 767.98px) {
  .report-table th,
  .report-table td {
    white-space: normal;
  }

  .report-table thead {
    display: none;
  }

  .report-table tbody th {
    display: none;
  }

  .report-table tbody tr {
    display: block;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    padding: 0;
    margin-bottom: 1rem;
    background-color: rgba(255, 255, 255, 0.05); /* Transparent dark background */
    overflow: hidden;
  }

  .report-table tbody tr:not(.row-expanded) {
    padding-bottom: 0;
  }

  /* 未填寫項目的視覺區分 */
  .report-table tbody tr.row-unfilled {
    background-color: rgba(255, 255, 255, 0.02);
  }

  .report-table tbody tr.row-unfilled:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }

  .report-table tbody td {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 0.5rem 0;
    border: none;
    color: var(--bs-white); /* Ensure text is white */
  }

  .report-table tbody td.row-header {
    cursor: pointer;
    padding: 0.75rem;
    margin: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    user-select: none;
    color: var(--bs-white);
  }

  .report-table tbody tr.row-expanded td.row-header {
    border-radius: 0.5rem 0.5rem 0 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .report-table tbody td.row-header:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }

  .report-table tbody td.row-header::before {
    display: none;
  }

  .report-table tbody td.row-header input {
    flex: 1;
    margin-right: 0.5rem;
    background-color: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .report-table tbody td.mobile-collapsible {
    display: none;
    padding: 0.5rem 0.75rem;
  }

  /* Flex row layout for equal height cells */
  .report-table tbody tr.row-expanded {
    display: flex;
    flex-wrap: wrap;
    padding: 0 0 0.75rem 0;
  }

  /* Force header to take full width */
  .report-table tbody tr.row-expanded td.row-header {
    width: 100%;
    margin-bottom: 0.5rem; /* Add spacing between header and content */
  }

  .report-table tbody tr.row-expanded td.mobile-collapsible {
    display: flex;
    flex-direction: column; /* Ensure label stays above content */
    width: 100%; /* Default to full width */
    align-items: flex-start; /* Force left alignment */
  }

  /* Compact layout for Unit and Contract Quantity */
  .report-table tbody tr.row-expanded td[data-label="單位"],
  .report-table tbody tr.row-expanded td[data-label="契約數量"] {
    width: 50%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .report-table tbody tr.row-expanded td[data-label="單位"] {
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Unify Alignment: Force left alignment for inner content */
  .report-table tbody tr.row-expanded td[data-label="契約數量"] .text-end {
    text-align: left !important;
    width: 100%;
  }

  .report-table tbody td.mobile-collapsible::before {
    content: attr(data-label);
    font-weight: 600;
    margin-bottom: 0.35rem;
    text-align: left;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
  }

  .report-table tbody td.mobile-collapsible.text-center {
    justify-content: space-between;
    align-items: flex-start !important; /* Override center alignment */
  }

  .report-table tbody td.mobile-collapsible.text-center::before {
    margin-bottom: 0.35rem; /* Match other cells */
    margin-right: 0;
  }

  .report-table tbody td input.form-control,
  .report-table tbody td textarea.form-control {
    min-width: 0;
    width: 100%;
    font-size: 16px; /* 防止 iOS 自動縮放 */
    background-color: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .report-table tbody td:last-child input.form-control {
    min-width: 0;
    width: 100%;
  }

  .mobile-action-bar .form-select {
    font-size: 16px; /* 防止 iOS 自動縮放 */
  }

  .mobile-action-bar .btn {
    min-height: 44px; /* 確保觸控區域足夠大 */
  }

  .mobile-action-bar :deep(.republic-date-picker) {
    width: 100%;
    max-width: 100%;
  }
  
  .mobile-action-bar .flex-fill {
    min-width: 0;
  }

  .report-card__body {
    padding: 1rem;
  }

  .report-card__header {
    padding: 0.75rem 1rem;
  }

  .report-card__title {
    font-size: 0.9rem;
  }
}

[data-bs-theme='light'] .report-table {
  --report-table-border: var(--bs-border-color);
  --report-table-row-bg: var(--bs-body-bg);
  --report-table-row-hover: rgba(var(--bs-primary-rgb), 0.04);
  --report-table-row-unfilled: var(--bs-secondary-bg);
  --report-table-input-bg: var(--bs-body-bg);
  --report-table-input-border: var(--bs-border-color);
  --report-table-text: var(--bs-body-color);
  --report-table-muted: var(--bs-secondary-color);
}

@media (min-width: 768px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .report-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

</style>
