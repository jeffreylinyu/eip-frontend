<template>
  <div class="daily-report-overview">
    <PageHeader
      title="施工日誌"
      icon="fa fa-clipboard-list"
      :breadcrumbs="[
        { text: '施工日誌管理', href: 'javascript:;' },
        { text: '施工日誌', active: true }
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
              >
                <i class="fa fa-cloud-download me-1"></i>
                從氣象局帶入
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
          @click="saveDraft"
          :disabled="isLoading"
        >
          <i class="fa fa-save me-1"></i>儲存
        </button>
        <div class="btn-group">
        <button 
            type="button"
            class="btn btn-outline-success dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            :disabled="isLoading || isExporting || !report.reportDate"
        >
            <i class="fa fa-file-word me-1"></i>
            <span v-if="!isExporting">匯出 Word</span>
            <span v-else>
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              匯出中...
            </span>
        </button>
          <ul class="dropdown-menu">
            <li>
              <a class="dropdown-item" href="javascript:;" @click="exportWord('construction')">
                <i class="fa fa-building me-2"></i>營造版本
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="javascript:;" @click="exportWord('supervision')">
                <i class="fa fa-clipboard-check me-2"></i>監造版本
              </a>
            </li>
          </ul>
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
            >
              <i class="fa fa-cloud-download me-1"></i>
              從氣象局帶入
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
            @click="saveDraft"
            :disabled="isLoading"
          >
            <i class="fa fa-save me-1"></i>儲存
          </button>
        </div>
        <div class="btn-group w-100">
          <button
            type="button"
            class="btn btn-outline-success dropdown-toggle w-100"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            :disabled="isLoading || isExporting || !report.reportDate"
          >
            <i class="fa fa-file-word me-1"></i>
            <span v-if="!isExporting">匯出 Word</span>
            <span v-else>
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              匯出中...
            </span>
          </button>
          <ul class="dropdown-menu w-100">
            <li>
              <a class="dropdown-item" href="javascript:;" @click="exportWord('construction')">
                <i class="fa fa-building me-2"></i>營造版本
              </a>
            </li>
            <li>
              <a class="dropdown-item" href="javascript:;" @click="exportWord('supervision')">
                <i class="fa fa-clipboard-check me-2"></i>監造版本
              </a>
            </li>
          </ul>
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
            </div>
            <i 
              class="fa text-primary" 
              :class="expandedSections.has('execution') ? 'fa-chevron-up' : 'fa-chevron-down'"
            ></i>
          </div>
          </CardHeader>
        <CardBody v-show="expandedSections.has('execution')" class="report-card__body">
          <div class="table-responsive">
            <table class="table table-bordered align-middle report-table">
              <thead class="table-dark">
                <tr>
                  <th class="text-center">施工項目</th>
                  <th class="text-center">單位</th>
                  <th class="text-center">契約數量</th>
                  <th class="text-center">本日完成數量</th>
                  <th class="text-center">累計完成數量</th>
                  <th class="text-center">備註</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="item in report.executionSummary" 
                  :key="item.id" 
                  :class="{ 
                    'row-expanded': expandedRows.has(`execution-${item.id}`),
                    'row-unfilled': !item.id || (!item.todayQuantity && !item.remark)
                  }"
                >
                  <td data-label="施工項目" class="row-header" @click="toggleRow(`execution-${item.id}`)">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>{{ item.item }}</span>
                      <i 
                        class="fa d-md-none ms-2" 
                        :class="expandedRows.has(`execution-${item.id}`) ? 'fa-chevron-up' : 'fa-chevron-down'"
                      ></i>
            </div>
                  </td>
                  <td class="text-center mobile-collapsible" data-label="單位">
                    <span>{{ item.unit }}</span>
                  </td>
                  <td class="mobile-collapsible" data-label="契約數量">
                    <span class="text-end d-block" :class="{ 'text-muted': !item.contractQuantity }">
                      {{ item.contractQuantity ? formatNumber(item.contractQuantity) : '—' }}
                    </span>
                  </td>
                  <td class="mobile-collapsible" data-label="本日完成數量">
                    <input
                      type="number"
                      class="form-control form-control-sm text-end"
                      min="0"
                      step="0.01"
                      :value="item.todayQuantity ?? ''"
                      @input="updateExecutionNumber(item, 'todayQuantity', $event)"
                    />
                  </td>
                  <td class="mobile-collapsible" data-label="累計完成數量">
                    <input
                      type="number"
                      class="form-control form-control-sm text-end"
                      min="0"
                      step="0.01"
                      :value="item.cumulativeQuantity ?? ''"
                      @input="updateExecutionNumber(item, 'cumulativeQuantity', $event)"
                    />
                  </td>
                  <td class="mobile-collapsible" data-label="備註">
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="item.remark"
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
          @click="toggleSection('material')"
        >
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="d-flex align-items-center gap-2">
              <i class="fa fa-boxes report-card__icon text-primary"></i>
              <span class="report-card__title">
                二、工程材料管理概況（含約定之重要材料使用狀況及數量等）
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
                    'row-unfilled': !material.id || (!material.todayUsage && !material.remark)
                  }"
                >
                  <td data-label="材料名稱" class="row-header" @click="toggleRow(`material-${material.id}`)">
                    <div class="d-flex align-items-center justify-content-between">
                      <span>{{ material.materialName }}</span>
                      <i 
                        class="fa d-md-none ms-2" 
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
                      min="0"
                      step="0.01"
                      :value="material.cumulativeUsage ?? ''"
                      @input="updateMaterialUsageNumber(material, 'cumulativeUsage', $event)"
                    />
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

    <div v-if="errors.length > 0" class="alert alert-danger">
      <h6 class="mb-2">請修正以下錯誤：</h6>
      <ul class="mb-0 ps-3">
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { 
  getDailyReport, 
  saveDailyReport, 
  exportDailyReportToWord, 
  convertToSaveRequest,
  convertFromDetailResponse,
  type DailyReportExportVersion 
} from '@/api/dailyReport'
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

const route = useRoute()
const workspaceStore = useWorkspaceStore()

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
  executionSummary: [
    {
      id: '1',
      code: '0311010100',
      item: '基礎開挖，一般開挖',
      unit: 'M3',
      contractQuantity: 500,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '2',
      code: '0312010100',
      item: '基礎混凝土，210kg/cm²',
      unit: 'M3',
      contractQuantity: 120,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '3',
      code: '0313010100',
      item: '基礎鋼筋，D13',
      unit: '噸',
      contractQuantity: 15,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '4',
      code: '0314010100',
      item: '基礎模板，一般模板',
      unit: 'M2',
      contractQuantity: 200,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '5',
      code: '0321010100',
      item: '結構混凝土，210kg/cm²',
      unit: 'M3',
      contractQuantity: 800,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '6',
      code: '0322010100',
      item: '結構鋼筋，D13',
      unit: '噸',
      contractQuantity: 85,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '7',
      code: '0322010200',
      item: '結構鋼筋，D16',
      unit: '噸',
      contractQuantity: 120,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '8',
      code: '0322010300',
      item: '結構鋼筋，D19',
      unit: '噸',
      contractQuantity: 95,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '9',
      code: '0323010100',
      item: '結構模板，一般模板',
      unit: 'M2',
      contractQuantity: 2500,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '10',
      code: '0331010100',
      item: '磚牆，1B磚牆',
      unit: 'M2',
      contractQuantity: 600,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '11',
      code: '0341010100',
      item: '粉刷，水泥粉刷',
      unit: 'M2',
      contractQuantity: 1800,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '12',
      code: '0342010100',
      item: '磁磚，外牆磁磚',
      unit: 'M2',
      contractQuantity: 450,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '13',
      code: '0342010200',
      item: '磁磚，地坪磁磚',
      unit: 'M2',
      contractQuantity: 800,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '14',
      code: '0351010100',
      item: '防水，PU防水',
      unit: 'M2',
      contractQuantity: 300,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '15',
      code: '0361010100',
      item: '門窗，鋁窗',
      unit: '樘',
      contractQuantity: 45,
      todayQuantity: null,
      cumulativeQuantity: null,
      remark: ''
    },
    {
      id: '16',
      code: '0371010100',
      item: '水電，給排水配管',
      unit: 'M',
      contractQuantity: 500,
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

const updateExecutionNumber = (
  item: ExecutionSummaryItem,
  key: 'todayQuantity' | 'cumulativeQuantity',
  event: Event
) => {
  const target = event.target as HTMLInputElement | null
  const value = target?.value ?? ''
  item[key] = value === '' ? null : Number(value)
}

const updateMaterialUsageNumber = (
  item: MaterialUsageSummaryItem,
  key: 'todayUsage' | 'cumulativeUsage',
  event: Event
) => {
  const target = event.target as HTMLInputElement | null
  const value = target?.value ?? ''
  item[key] = value === '' ? null : Number(value)
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
    console.log('從日期帶入:', date)
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

const saveDraft = async () => {
  if (!constructionId.value) {
    alert('找不到工程 ID，無法儲存')
    return
  }

  if (!report.value.reportDate) {
    alert('請先選擇填表日期')
    return
  }

  isLoading.value = true
  try {
    // 將前端格式轉換為 API 請求格式（只包含今日數據）
    const saveRequest = convertToSaveRequest(report.value)
    
    // 呼叫 API 儲存（全量更新）
    const response = await saveDailyReport(
      constructionId.value,
      report.value.reportDate,
      saveRequest
    )
    
    // 將 API 回應轉換回前端格式（包含累計值）
    report.value = convertFromDetailResponse(response, report.value)
    
    console.log('✅ 日報表儲存成功', response)
    alert('儲存成功')
  } catch (error) {
    console.error('儲存失敗:', error)
    alert('儲存失敗，請檢查網路或稍後再試')
  } finally {
    isLoading.value = false
  }
}

// 匯出 Word 文檔
const exportWord = async (version: DailyReportExportVersion) => {
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
    await exportDailyReportToWord(constructionId.value, report.value.reportDate, version)
    console.log(`✅ 日報表匯出成功 (${version === 'construction' ? '營造' : '監造'}版)`)
  } catch (error) {
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
  
  isLoading.value = true
  try {
    console.log(`📥 載入日報表: constructionId=${constructionId.value}, date=${date}`)
    const response = await getDailyReport(constructionId.value, date)
    
    if (response) {
      // 將 API 回應轉換為前端格式（包含累計值）
      report.value = convertFromDetailResponse(response, report.value)
      console.log('✅ 日報表載入成功', response)
    } else {
      console.log('ℹ️ 該日期無日報表資料')
    }
  } catch (error: any) {
    // 404 表示該日期沒有資料，這是正常情況
    if (error?.response?.status === 404) {
      console.log('ℹ️ 該日期無日報表資料（404）')
    } else {
      console.error('載入日報表失敗:', error)
      // errors.value.push(`載入 ${date} 的日報表失敗`) // 暫時不顯示錯誤訊息，避免干擾
    }
  } finally {
    isLoading.value = false
  }
}

// 監聽日期變化，自動載入該日期的資料
watch(
  () => report.value.reportDate,
  (newDate, oldDate) => {
    // 避免初始化時觸發
    if (oldDate && newDate !== oldDate) {
      loadReportByDate(newDate)
    }
  }
)

// 監聽路由參數變化，當從日曆跳轉過來時自動選中日期
watch(
  () => route.query.reportDate,
  (newDate) => {
    if (newDate && typeof newDate === 'string' && newDate !== report.value.reportDate) {
      report.value.reportDate = newDate
      loadReportByDate(newDate)
  }
  },
  { immediate: true }
)

// 生命週期
onMounted(() => {
  // 優先使用 URL 參數中的日期
  const dateFromQuery = route.query.reportDate as string
  if (dateFromQuery) {
    report.value.reportDate = dateFromQuery
    loadReportByDate(dateFromQuery)
  } else {
    // 載入當前日期的日報表資料
    loadReportByDate(report.value.reportDate)
  }
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


.report-table td input.form-control,
.report-table td textarea.form-control {
  min-width: 100px;
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
