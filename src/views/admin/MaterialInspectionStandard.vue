<template>
  <div class="material-standard-page">
    <PageHeader
      title="材料抽查標準表"
      icon="fa fa-cubes"
      :breadcrumbs="[
        { text: '系統維護', href: 'javascript:;' },
        { text: '材料抽查標準表', active: true }
      ]"
    />

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
              <div class="col-md-3">
                <label class="form-label small text-muted">關鍵字</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">
                    <i class="fa fa-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    v-model="searchKeyword"
                    placeholder="材料名稱..."
                    @keyup.enter="handleSearch"
                  />
                </div>
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
              <div class="col-md-5 d-flex gap-2 justify-content-end">
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
                <button 
                  class="btn btn-success btn-sm" 
                  type="button" 
                  @click="openImportModal" 
                  :disabled="isLoading"
                >
                  <i class="fa fa-file-import me-1"></i>資料夾匯入
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

      <!-- 列表 - 使用 Syncfusion Grid -->
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
              <i class="fa fa-cubes me-2"></i>材料抽查標準表
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
                field="itemNo"
                headerText="排序"
                width="80"
                textAlign="Center"
              ></e-column>
              <e-column
                field="pccesCode"
                headerText="PCCES 代碼"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="itemName"
                headerText="材料名稱"
                width="200"
                textAlign="Left"
              ></e-column>
              <e-column
                field="checkStandard"
                headerText="抽查標準"
                width="250"
                textAlign="Left"
              ></e-column>
              <e-column
                field="checkMethod"
                headerText="抽查方法"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="applyFirstLevel"
                headerText="一級辦理時機"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="feqCheckFirstLevel"
                headerText="一級試驗頻率"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="checkRatioSecondLevel"
                headerText="二級抽驗比例(%)"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="failureHandle"
                headerText="不合格處理"
                width="200"
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

    <!-- 匯入 Modal -->
    <Modal
      :show="showImportModal"
      title="匯入材料標準"
      icon="fa fa-file-import"
      size="lg"
      @update:show="showImportModal = $event"
      :hideConfirmButton="true"
      cancelText="取消"
    >
      <template #body>
        <!-- 檔案上傳模式 -->
        <div class="mb-3">
          <label class="form-label fw-semibold">
            資料來源機關 <span class="text-danger">*</span>
          </label>
          <input
            type="text"
            class="form-control"
            v-model="importDataSource"
            placeholder="例如：交通部公路總局、經濟部水利署"
          />
          <div class="form-text">
            請輸入資料來源機關名稱，所有匯入的記錄都會標記此來源。
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label fw-semibold">
            選擇 JSON 檔案 <span class="text-danger">*</span>
          </label>
          <input
            type="file"
            class="form-control"
            accept=".json"
            multiple
            @change="handleFileSelect"
            ref="fileInput"
          />
          <div class="form-text">
            可選擇多個 JSON 檔案進行批次匯入。
          </div>
        </div>

        <div v-if="selectedFiles.length > 0" class="mb-3">
          <label class="form-label fw-semibold">已選擇的檔案</label>
          <ul class="list-group" style="max-height: 200px; overflow-y: auto;">
            <li
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="list-group-item d-flex justify-content-between align-items-center py-2"
            >
              <small>{{ file.name }}</small>
              <span class="badge bg-secondary rounded-pill" style="font-size: 0.7em;">
                {{ (file.size / 1024).toFixed(1) }} KB
              </span>
            </li>
          </ul>
        </div>

        <div class="alert alert-info d-flex align-items-start gap-2 mt-3">
          <i class="fa fa-info-circle mt-1"></i>
          <div>
            <div class="fw-semibold">注意事項</div>
            <ul class="mb-0 ps-3">
              <li>只接受 JSON 格式檔案（.json 副檔名）</li>
              <li>系統會根據 JSON 中的 item_name 自動查找對應的 PCCES 編碼</li>
              <li>如果找不到對應的工項，該工項會被跳過（不會報錯）</li>
              <li>可以一次上傳多個檔案進行批次匯入</li>
              <li><strong>覆蓋邏輯：</strong>重複匯入相同 item_name 時，會覆蓋所有配對到的 pccesCode 舊資料</li>
              <li>確保每個 pccesCode 的資料都是最新匯入的版本</li>
            </ul>
          </div>
        </div>

        <div v-if="importResult !== null" class="alert alert-success d-flex align-items-start gap-2">
          <i class="fa fa-check-circle mt-1"></i>
          <div>
            <div class="fw-semibold">匯入成功</div>
            {{ importResult }}
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger d-flex align-items-start gap-2">
          <i class="fa fa-exclamation-triangle mt-1"></i>
          <div>
            <div class="fw-semibold">匯入失敗</div>
            <div class="mb-1">{{ errorMessage }}</div>
          </div>
        </div>
      </template>
      <template #footer>
        <button
          class="btn btn-outline-secondary"
          @click="closeImportModal"
          :disabled="isImporting"
        >
          取消
        </button>
        <button
          class="btn btn-primary"
          @click="startImport"
          :disabled="isImportDisabled"
        >
          <span v-if="isImporting" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="fa fa-upload me-2"></i>
          {{ isImporting ? '匯入中...' : '開始匯入' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick, provide } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { materialStandardApi, type PccesMaterialStandard } from '@/api/materialStandard'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import { GridComponent as EjsGrid, ColumnsDirective as EColumns, ColumnDirective as EColumn, Sort, Resize, Filter, Page } from '@syncfusion/ej2-vue-grids'
import type { GridComponent } from '@syncfusion/ej2-vue-grids'
import { L10n } from '@syncfusion/ej2-base'
import { getCurrentInstance } from 'vue'

const { proxy } = getCurrentInstance() as any
const authStore = useAuthStore()

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

// 權限檢查
const hasAdminPermission = computed(() => {
  const user = authStore.user
  if (!user) return false
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
})

// Grid 相關
const grid = ref<GridComponent | null>(null)
const gridData = ref<PccesMaterialStandard[]>([])
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

// 匯入相關
const showImportModal = ref(false)
const importDataSource = ref('')
const selectedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const importResult = ref<string | null>(null)
const errorMessage = ref('')

// 匯入按鈕禁用狀態
const isImportDisabled = computed(() => {
  return isImporting.value || !importDataSource.value.trim() || selectedFiles.value.length === 0
})

// 切換全螢幕
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 載入資料
const loadData = async (useSearchParams: boolean = false) => {
  if (!hasAdminPermission.value) return

  isLoading.value = true
  try {
    const params: any = {
      page: 0,
      size: 1000, 
    }
    
    // 如果有搜尋條件，加入參數
    const keywordParts = [];
    if (useSearchParams) {
      if (searchPccesCode.value.trim()) {
        keywordParts.push(searchPccesCode.value.trim());
      }
      if (searchKeyword.value.trim()) {
        keywordParts.push(searchKeyword.value.trim());
      }
      
      if (keywordParts.length > 0) {
        params.keyword = keywordParts.join(' ');
      }
    }

    const response = await materialStandardApi.searchStandards(params)
    // Add safety check for response
    if (response && response.content) {
      gridData.value = response.content
      
      // 如果有搜尋條件，顯示結果提示
      if (useSearchParams && keywordParts.length > 0) {
        const resultCount = gridData.value.length
        proxy?.$toast?.info(`找到 ${resultCount} 筆符合條件的資料`)
      }
    } else {
      gridData.value = []
    }
  } catch (error: any) {
    console.error('載入資料失敗:', error)
    if (error.status !== 404) {
       proxy?.$toast?.error(error.response?.data?.message || '載入資料失敗')
    }
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
  loadData(false)
}

// 匯入相關
const openImportModal = () => {
  importDataSource.value = ''
  selectedFiles.value = []
  importResult.value = null
  errorMessage.value = ''
  
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  
  showImportModal.value = true
}

const closeImportModal = () => {
  showImportModal.value = false
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFiles.value = Array.from(target.files)
    errorMessage.value = ''
  }
}

const startImport = async () => {
  importResult.value = null
  errorMessage.value = ''

  try {
    isImporting.value = true
    
    // 檔案上傳模式
    const result = await materialStandardApi.importFiles(
      selectedFiles.value,
      importDataSource.value.trim()
    )
    // 結果是數字 (匯入筆數)
    importResult.value = `匯入完成，共 ${result} 筆資料`
    
    proxy?.$toast?.success('資料匯入完成')
    
    // 匯入成功後重新載入列表
    await loadData(false)
  } catch (err: any) {
    const status = err?.response?.status
    const backendMsg = err?.response?.data?.message
    if (status === 403) {
      errorMessage.value = backendMsg || '權限不足或密鑰錯誤'
    } else {
      errorMessage.value = backendMsg || err?.message || '匯入失敗，請稍後重試'
    }
    proxy?.$toast?.error(errorMessage.value)
  } finally {
    isImporting.value = false
  }
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
      // 可以在這裡處理大小重算等邏輯
    })
  }
})
</script>

<style scoped>
.material-standard-page {
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
  .material-standard-page {
    padding: 0.5rem;
  }
  
  .grid-wrapper {
    height: 400px;
  }
}
</style>
