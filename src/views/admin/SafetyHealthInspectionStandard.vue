<template>
  <div class="safety-health-inspection-standard-page">
    <PageHeader
      title="安全衛生抽查標準表"
      icon="fa fa-hard-hat"
      :breadcrumbs="[
        { text: '系統維護', href: 'javascript:;' },
        { text: '安全衛生抽查標準表', active: true }
      ]"
    />

    <div v-if="hasAdminPermission" class="alert alert-secondary py-2 mb-3 small" role="note">
      <i class="fa fa-info-circle me-1"></i>
      此主檔與「施工抽查標準表」<strong>分開維護</strong>，欄位與用途對齊但資料各自維護。
    </div>

    <!-- 權限檢查提示 -->
    <div v-if="!hasAdminPermission" class="alert alert-warning" role="alert">
      <i class="fa fa-exclamation-triangle me-2"></i>
      您沒有權限訪問此頁面。此功能僅限系統管理員使用。
    </div>

    <!-- 主要內容 -->
    <div v-else>
      <!-- 搜尋工具列與操作按鈕 -->
      <div v-if="!isFullscreen" class="mb-3">
        <Card>
          <CardBody>
            <div class="row g-3 align-items-end">
              <!-- PCCES 代碼搜尋 -->
              <div class="col-md-2">
                <label class="form-label small text-muted">PCCES 代碼</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">
                    <i class="fa fa-barcode"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    v-model="searchPccesCode"
                    placeholder="輸入代碼..."
                    @keyup.enter="handleSearch"
                  />
                </div>
              </div>

              <!-- 關鍵字搜尋 -->
              <div class="col-md-2">
                <label class="form-label small text-muted">關鍵字</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">
                    <i class="fa fa-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    v-model="searchKeyword"
                    placeholder="工項名稱..."
                    @keyup.enter="handleSearch"
                  />
                </div>
              </div>

              <!-- 資料來源篩選 -->
              <div class="col-md-2">
                <label class="form-label small text-muted">資料來源</label>
                <select class="form-select form-select-sm" v-model="searchDataSource">
                  <option value="">全部</option>
                  <option
                    v-for="source in dataSourceList"
                    :key="source"
                    :value="source"
                  >
                    {{ source }}
                  </option>
                </select>
              </div>

              <!-- 搜尋按鈕 -->
              <div class="col-md-2">
                <button
                  type="button"
                  class="btn btn-primary btn-sm w-100"
                  @click="handleSearch"
                  :disabled="isLoading"
                >
                  <i class="fa fa-search me-1"></i>搜尋
                </button>
              </div>

              <!-- 清除與操作按鈕 -->
              <div class="col-md-4 d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  @click="resetSearch"
                  :disabled="isLoading"
                  title="清除搜尋條件"
                >
                  <i class="fa fa-times me-1"></i>清除
                </button>
                <button
                  class="btn btn-outline-info btn-sm"
                  type="button"
                  @click="toggleFullscreen"
                  :title="isFullscreen ? '退出全螢幕' : '全螢幕'"
                >
                  <i :class="isFullscreen ? 'fa fa-compress' : 'fa fa-expand'"></i>
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <!-- 載入中提示 -->
      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">載入中...</span>
        </div>
        <p class="mt-2 text-muted">載入中...</p>
      </div>

      <!-- 列表 - 使用 Syncfusion TreeGrid -->
      <div
        v-else
        class="grid-wrapper"
        :class="{ 'grid-fullscreen': isFullscreen }"
      >
        <!-- 全螢幕模式下的工具列固定在最上方 -->
        <div
          v-if="isFullscreen"
          class="fullscreen-toolbar"
        >
          <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <div class="fw-semibold">
              <i class="fa fa-hard-hat me-2"></i>安全衛生抽查標準表
            </div>
            <div class="d-flex gap-2">
              <button
                class="btn btn-outline-info btn-sm"
                type="button"
                @click="toggleFullscreen"
                title="退出全螢幕"
              >
                <i class="fa fa-compress me-1"></i>退出全螢幕
              </button>
            </div>
          </div>
          
          <!-- 全螢幕模式下的搜尋工具列 -->
          <div class="px-3 py-2 border-bottom">
            <div class="row g-2 align-items-end">
              <div class="col-md-2">
                <label class="form-label small text-muted mb-1">PCCES 代碼</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">
                    <i class="fa fa-barcode"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    v-model="searchPccesCode"
                    placeholder="輸入代碼..."
                    @keyup.enter="handleSearch"
                  />
                </div>
              </div>
              <div class="col-md-2">
                <label class="form-label small text-muted mb-1">關鍵字</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">
                    <i class="fa fa-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    v-model="searchKeyword"
                    placeholder="關鍵字..."
                    @keyup.enter="handleSearch"
                  />
                </div>
              </div>
              <div class="col-md-2">
                <label class="form-label small text-muted mb-1">資料來源</label>
                <select class="form-select form-select-sm" v-model="searchDataSource">
                  <option value="">全部</option>
                  <option
                    v-for="source in dataSourceList"
                    :key="source"
                    :value="source"
                  >
                    {{ source }}
                  </option>
                </select>
              </div>
              <div class="col-md-2">
                <button
                  type="button"
                  class="btn btn-primary btn-sm w-100"
                  @click="handleSearch"
                  :disabled="isLoading"
                >
                  <i class="fa fa-search me-1"></i>搜尋
                </button>
              </div>
              <div class="col-md-2">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm w-100"
                  @click="resetSearch"
                  :disabled="isLoading"
                  title="清除搜尋條件"
                >
                  <i class="fa fa-times me-1"></i>清除
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-body">
          <ejs-grid
            ref="grid"
            :dataSource="gridData"
            :allowPaging="true"
            :pageSettings="pageSettings"
            :allowSorting="true"
            :allowFiltering="true"
            :allowResizing="true"
            :allowReordering="false"
            :allowSelection="false"
            :height="'100%'"
            locale="zh"
            :enableHover="true"
            :filterSettings="filterSettings"
          >
            <e-columns>
              <e-column
                field="id"
                headerText="ID"
                width="80"
                textAlign="Center"
                :visible="false"
              ></e-column>
              <e-column
                field="pccesCode"
                headerText="PCCES 代碼"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="stepOrder"
                headerText="步驟順序"
                width="100"
                textAlign="Center"
              ></e-column>
              <e-column
                field="itemName"
                headerText="工項名稱"
                width="200"
                textAlign="Left"
              ></e-column>
              <e-column
                field="dataSource"
                headerText="資料來源"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="workProcess"
                headerText="施工階段"
                width="130"
                textAlign="Left"
              ></e-column>
              <e-column
                field="workProcessDetail"
                headerText="施工流程（施工項目）"
                width="160"
                textAlign="Left"
              ></e-column>
              <e-column
                field="manageProject"
                headerText="管理項目"
                width="120"
                textAlign="Left"
              ></e-column>
              <e-column
                field="checkPoint"
                headerText="檢查點"
                width="100"
                textAlign="Center"
              ></e-column>
              <e-column
                field="checkStandard"
                headerText="抽查標準"
                width="200"
                textAlign="Left"
              ></e-column>
              <e-column
                field="checkTiming"
                headerText="抽查時機"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="checkMethod"
                headerText="抽查方法"
                width="120"
                textAlign="Left"
              ></e-column>
              <e-column
                field="checkFeq"
                headerText="抽查頻率"
                width="120"
                textAlign="Left"
              ></e-column>
              <e-column
                field="failureHandle"
                headerText="不符合處理"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="manageRecord"
                headerText="管理紀錄"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="remark"
                headerText="備註"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="isActive"
                headerText="啟用"
                width="100"
                textAlign="Center"
                displayAsCheckBox="true"
              ></e-column>
            </e-columns>
          </ejs-grid>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick, provide } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { masterDataApi, type PccesWorkProcessStandard } from '@/api/masterData'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import { GridComponent as EjsGrid, ColumnsDirective as EColumns, ColumnDirective as EColumn, Sort, Resize, Filter, Page } from '@syncfusion/ej2-vue-grids'
import type { GridComponent } from '@syncfusion/ej2-vue-grids'
import { L10n } from '@syncfusion/ej2-base'
import { getCurrentInstance } from 'vue'

L10n.load({
  'zh': {
    'grid': {
      'EmptyRecord': '無資料',
      'GroupDropArea': '拖曳欄位標題至此以進行分組',
      'UnGroup': '點擊取消分組',
      'EmptyDataSourceError': 'DataSource 必須在初始載入時不為空，因為已產生欄位',
      'Item': '項',
      'Items': '項',
      'FirstPage': '第一頁',
      'LastPage': '最後一頁',
      'NextPage': '下一頁',
      'PreviousPage': '上一頁',
      'SelectAll': '全選',
      'SortAscending': '升序',
      'SortDescending': '降序',
      'EditRecord': '編輯',
      'DeleteRecord': '刪除',
      'Save': '儲存',
      'Cancel': '取消',
      'Search': '搜尋',
      'ClearButton': '清除',
      'FilterButton': '篩選',
      'Matchs': '無符合資料',
      'FilterbarTitle': '篩選列單元格',
      'Print': '列印',
      'Pdfexport': 'PDF 匯出',
      'Excelexport': 'Excel 匯出',
      'Wordexport': 'Word 匯出',
      'Csvexport': 'CSV 匯出',
    },
    'pager': {
      'currentPageInfo': '{0} / {1} 頁',
      'totalItemsInfo': '({0} 個項目)',
      'firstPageTooltip': '第一頁',
      'lastPageTooltip': '最後一頁',
      'nextPageTooltip': '下一頁',
      'previousPageTooltip': '上一頁',
      'nextPagerTooltip': '下一頁',
      'previousPagerTooltip': '上一頁',
      'pagerDropDown': '每頁筆數',
      'pagerAllDropDown': '全部',
      'All': '全部'
    }
  }
})

const { proxy } = getCurrentInstance() as any
const authStore = useAuthStore()

// 權限檢查
const hasAdminPermission = computed(() => {
  const user = authStore.user
  if (!user) return false
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
})

// Grid 相關
const grid = ref<GridComponent | null>(null)
const gridData = ref<PccesWorkProcessStandard[]>([])
const isLoading = ref(false)

// 全螢幕狀態
const isFullscreen = ref(false)

// 提供 Grid 服務
provide('grid', [Sort, Resize, Filter, Page])

// 分頁設定
const pageSettings = ref({
  pageSize: 20,
  pageSizes: [10, 20, 50, 100],
  pageCount: 5
})

// 篩選設定
const filterSettings = ref({
  type: 'Menu'
})

// 搜尋條件
const searchPccesCode = ref('')
const searchKeyword = ref('')
const searchDataSource = ref('')

// 資料來源列表
const dataSourceList = ref<string[]>([])

// 切換全螢幕
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 載入資料
const loadData = async (useSearchParams: boolean = false) => {
  if (!hasAdminPermission.value) return

  isLoading.value = true
  try {
    // 先取得總筆數
    const countParams: any = {
      page: 0,
      size: 1,
    }
    
    // 如果有搜尋條件，加入參數
    if (useSearchParams) {
      if (searchPccesCode.value.trim()) {
        countParams.pccesCode = searchPccesCode.value.trim()
      }
      if (searchKeyword.value.trim()) {
        countParams.keyword = searchKeyword.value.trim()
      }
      if (searchDataSource.value.trim()) {
        countParams.dataSource = searchDataSource.value.trim()
      }
    }

    // 先取得總筆數
    const countResponse = await masterDataApi.searchSafetyHealthWorkProcesses(countParams)
    const totalElements = countResponse.totalElements || 0

    // 如果沒有資料，直接返回
    if (totalElements === 0) {
      gridData.value = []
      isLoading.value = false
      return
    }

    // 使用總筆數作為 size，一次取得全部資料
    const params: any = {
      page: 0,
      size: totalElements, // 使用總筆數，取得全部資料
    }

    // 如果有搜尋條件，加入參數
    if (useSearchParams) {
      if (searchPccesCode.value.trim()) {
        params.pccesCode = searchPccesCode.value.trim()
      }
      if (searchKeyword.value.trim()) {
        params.keyword = searchKeyword.value.trim()
      }
      if (searchDataSource.value.trim()) {
        params.dataSource = searchDataSource.value.trim()
      }
    }

    const response = await masterDataApi.searchSafetyHealthWorkProcesses(params)
    gridData.value = response.content || []
    
    // 更新資料來源列表（從所有資料中提取唯一的資料來源）
    if (!useSearchParams) {
      // 只在載入全部資料時更新資料來源列表
      const uniqueDataSources = new Set<string>()
      gridData.value.forEach(item => {
        if (item.dataSource && item.dataSource.trim()) {
          uniqueDataSources.add(item.dataSource.trim())
        }
      })
      dataSourceList.value = Array.from(uniqueDataSources).sort()
    }
    
    // 如果有搜尋條件，顯示結果提示
    if (useSearchParams && (searchPccesCode.value || searchKeyword.value || searchDataSource.value)) {
      const resultCount = gridData.value.length
      proxy?.$toast?.info(`找到 ${resultCount} 筆符合條件的資料`)
    }
  } catch (error: any) {
    console.error('載入資料失敗:', error)
    proxy?.$toast?.error(error.response?.data?.message || '載入資料失敗')
    gridData.value = []
  } finally {
    isLoading.value = false
  }
}

// 執行搜尋
const handleSearch = () => {
  loadData(true)
}

// 重置搜尋
const resetSearch = () => {
  searchPccesCode.value = ''
  searchKeyword.value = ''
  searchDataSource.value = ''
  loadData(false)
}

// 生命週期
onMounted(() => {
  if (hasAdminPermission.value) {
    loadData()
  }
})

// 當組件重新激活時（從其他畫面切回來），確保 Grid 樣式正確
onActivated(() => {
  if (grid.value) {
    nextTick(() => {
      if (isFullscreen.value) {
        // 如果是全螢幕模式，重新計算高度
        const gridElement = (grid.value as any).$el
        if (gridElement) {
          const windowHeight = window.innerHeight
          const topOffset = gridElement.getBoundingClientRect().top
          gridElement.style.height = `${windowHeight - topOffset}px`
        }
      }
      (grid.value as any).refresh()
    })
  }
})
</script>

<style scoped>
.safety-health-inspection-standard-page {
  padding: 1rem;
}

.grid-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  overflow: hidden;
  height: 600px;
  background-color: #0f172a; /* 使用深色背景，與專案主題一致 */
}

.grid-fullscreen {
  position: fixed;
  inset: 0.5rem;
  z-index: 1050;
  border-radius: 0;
  height: auto;
  background-color: #0f172a;
}

.grid-body {
  flex: 1;
  min-height: 0;
  background-color: #0f172a; /* 確保內容區域也是深色背景 */
}

/* 確保 Grid 本身使用深色背景 */
:deep(.e-grid) {
  background-color: #0f172a !important;
}

:deep(.e-grid .e-gridcontent),
:deep(.e-grid .e-gridheader),
:deep(.e-grid .e-content),
:deep(.e-grid .e-headercontent) {
  background-color: #0f172a !important;
}

:deep(.e-grid .e-row),
:deep(.e-grid .e-altrow) {
  background-color: transparent !important;
}

:deep(.e-grid .e-headercell),
:deep(.e-grid .e-rowcell) {
  background-color: transparent !important;
  border-color: #475569 !important;
}

.fullscreen-toolbar {
  background-color: #0f172a;
  color: #fff;
}

.form-text code {
  background: rgba(var(--bs-dark-rgb), 0.05);
  padding: 2px 4px;
  border-radius: 4px;
}

@media (max-width: 575.98px) {
  .safety-health-inspection-standard-page {
    padding: 0.5rem;
  }
  
  .treegrid-wrapper {
    height: 400px;
  }
}
</style>
