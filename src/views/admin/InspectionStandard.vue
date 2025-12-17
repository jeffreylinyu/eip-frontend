<template>
  <div class="inspection-standard-page">
    <PageHeader
      title="施工抽查標準表"
      icon="fa fa-clipboard-check"
      :breadcrumbs="[
        { text: '系統維護', href: 'javascript:;' },
        { text: '施工抽查標準表', active: true }
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
                <button 
                  class="btn btn-success btn-sm" 
                  type="button" 
                  @click="openImportModal" 
                  :disabled="isLoading"
                >
                  <i class="fa fa-file-import me-1"></i>匯入
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
        class="treegrid-wrapper"
        :class="{ 'treegrid-fullscreen': isFullscreen }"
      >
        <!-- 全螢幕模式下的工具列固定在最上方 -->
        <div
          v-if="isFullscreen"
          class="fullscreen-toolbar"
        >
          <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <div class="fw-semibold">
              <i class="fa fa-clipboard-check me-2"></i>施工抽查標準表
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
              <button 
                class="btn btn-success btn-sm" 
                type="button" 
                @click="openImportModal" 
                :disabled="isLoading"
              >
                <i class="fa fa-file-import me-1"></i>匯入
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

        <div class="treegrid-body">
          <ejs-treegrid
            ref="treegrid"
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
                headerText="施工流程"
                width="120"
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
          </ejs-treegrid>
        </div>
      </div>
    </div>

    <!-- 匯入 Modal -->
    <Modal
      :show="showImportModal"
      title="匯入施工抽查標準"
      icon="fa fa-file-import"
      size="lg"
      @update:show="showImportModal = $event"
      :hideConfirmButton="true"
      cancelText="取消"
    >
      <template #body>
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
            可選擇多個 JSON 檔案進行批次匯入。檔案格式請參考 API 文檔。
          </div>
        </div>

        <div v-if="selectedFiles.length > 0" class="mb-3">
          <label class="form-label fw-semibold">已選擇的檔案</label>
          <ul class="list-group">
            <li
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <span>{{ file.name }}</span>
              <span class="badge bg-secondary rounded-pill">{{ formatFileSize(file.size) }}</span>
            </li>
          </ul>
        </div>

        <div class="alert alert-info d-flex align-items-start gap-2">
          <i class="fa fa-info-circle mt-1"></i>
          <div>
            <div class="fw-semibold">注意事項</div>
            <ul class="mb-0 ps-3">
              <li>只接受 JSON 格式檔案（.json 副檔名）</li>
              <li>系統會根據 JSON 中的 item_name 自動查找對應的 PCCES 編碼</li>
              <li>如果找不到對應的工項，該工項會被跳過（不會報錯）</li>
              <li>可以一次上傳多個檔案進行批次匯入</li>
            </ul>
          </div>
        </div>

        <div v-if="importResult !== null" class="alert alert-success d-flex align-items-start gap-2">
          <i class="fa fa-check-circle mt-1"></i>
          <div>
            <div class="fw-semibold">匯入成功</div>
            成功匯入 {{ importResult }} 筆資料。
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
          :disabled="!importDataSource.trim() || selectedFiles.length === 0 || isImporting"
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
import { masterDataApi, type PccesWorkProcessStandard } from '@/api/masterData'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import { Sort, Resize, Filter, Page } from '@syncfusion/ej2-vue-treegrid'
import type { TreeGridComponent } from '@syncfusion/ej2-vue-treegrid'
import { getCurrentInstance } from 'vue'

const { proxy } = getCurrentInstance() as any
const authStore = useAuthStore()

// 權限檢查
const hasAdminPermission = computed(() => {
  const user = authStore.user
  if (!user) return false
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
})

// TreeGrid 相關
const treegrid = ref<TreeGridComponent | null>(null)
const gridData = ref<PccesWorkProcessStandard[]>([])
const isLoading = ref(false)

// 全螢幕狀態
const isFullscreen = ref(false)

// 提供 TreeGrid 服務
provide('treegrid', [Sort, Resize, Filter, Page])

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

// 匯入相關
const showImportModal = ref(false)
const importDataSource = ref('')
const selectedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const importResult = ref<number | null>(null)
const errorMessage = ref('')

// 切換全螢幕
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 格式化檔案大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
    const countResponse = await masterDataApi.searchWorkProcesses(countParams)
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

    const response = await masterDataApi.searchWorkProcesses(params)
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

  const dataSource = importDataSource.value.trim()
  if (!dataSource) {
    errorMessage.value = '請填入資料來源機關'
    return
  }

  if (selectedFiles.value.length === 0) {
    errorMessage.value = '請選擇至少一個 JSON 檔案'
    return
  }

  try {
    isImporting.value = true
    const result = await masterDataApi.importWorkProcessStandards(selectedFiles.value, dataSource)
    importResult.value = typeof result === 'number' ? result : 0
    proxy?.$toast?.success(`匯入成功，筆數：${importResult.value}`)
    
    // 匯入成功後重新載入列表
    await loadData(false)
    
    // 關閉 Modal
    showImportModal.value = false
  } catch (err: any) {
    const status = err?.response?.status
    const backendMsg = err?.response?.data?.message
    if (status === 403) {
      errorMessage.value = backendMsg || '權限不足，請確認已登入且具有系統管理員權限'
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

// 當組件重新激活時（從其他畫面切回來），確保 TreeGrid 樣式正確
onActivated(() => {
  if (treegrid.value) {
    nextTick(() => {
      if (isFullscreen.value) {
        // 如果處於全螢幕模式，確保樣式正確應用
      }
    })
  }
})
</script>

<style scoped>
.inspection-standard-page {
  padding: 1rem;
}

.treegrid-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  overflow: hidden;
  height: 600px;
  background-color: #0f172a; /* 使用深色背景，與專案主題一致 */
}

.treegrid-fullscreen {
  position: fixed;
  inset: 0.5rem;
  z-index: 1050;
  border-radius: 0;
  height: auto;
  background-color: #0f172a;
}

.treegrid-body {
  flex: 1;
  min-height: 0;
  background-color: #0f172a; /* 確保內容區域也是深色背景 */
}

/* 確保 TreeGrid 本身使用深色背景 */
:deep(.e-treegrid) {
  background-color: #0f172a !important;
}

:deep(.e-treegrid .e-gridcontent),
:deep(.e-treegrid .e-gridheader),
:deep(.e-treegrid .e-content),
:deep(.e-treegrid .e-headercontent) {
  background-color: #0f172a !important;
}

:deep(.e-treegrid .e-row),
:deep(.e-treegrid .e-altrow) {
  background-color: transparent !important;
}

:deep(.e-treegrid .e-headercell),
:deep(.e-treegrid .e-rowcell) {
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
  .inspection-standard-page {
    padding: 0.5rem;
  }
  
  .treegrid-wrapper {
    height: 400px;
  }
}
</style>
