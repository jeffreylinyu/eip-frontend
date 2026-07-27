<template>
  <div class="pcces-catalog-page">
    <PageHeader
      title="PCCES 總項目"
      icon="fa fa-database"
      :breadcrumbs="[
        { text: '系統維護', href: 'javascript:;' },
        { text: 'PCCES 總項目', active: true }
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
                    v-model="searchCode"
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
                    placeholder="中/英文名稱..."
                    @keyup.enter="handleSearch"
                  />
                </div>
              </div>

              <!-- 類型篩選 -->
              <div class="col-md-2">
                <label class="form-label small text-muted">類型</label>
                <select class="form-select form-select-sm" v-model="searchType">
                  <option value="">全部</option>
                  <option value="MATERIAL">材料</option>
                  <option value="LABOUR">人工</option>
                  <option value="EQUIPMENT">機具</option>
                  <option value="MISC">雜項</option>
                  <option value="WORK_ITEM">工項</option>
                </select>
              </div>

              <!-- 來源檔名搜尋 -->
              <div class="col-md-2">
                <label class="form-label small text-muted">來源檔名</label>
                <select class="form-select form-select-sm" v-model="searchSourceFile">
                  <option value="">全部</option>
                  <option
                    v-for="file in sourceFileList"
                    :key="file"
                    :value="file"
                  >
                    {{ file }}
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
              <div class="col-md-2 d-flex gap-2">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  @click="resetSearch"
                  :disabled="isLoading"
                  title="清除搜尋條件"
                >
                  <i class="fa fa-times"></i>
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
                  <i class="fa fa-file-import"></i>
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
              <i class="fa fa-database me-2"></i>PCCES 總項目
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
                <i class="fa fa-file-import me-1"></i>匯入 PCCES
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
                    v-model="searchCode"
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
                <label class="form-label small text-muted mb-1">類型</label>
                <select class="form-select form-select-sm" v-model="searchType">
                  <option value="">全部</option>
                  <option value="MATERIAL">材料</option>
                  <option value="LABOUR">人工</option>
                  <option value="EQUIPMENT">機具</option>
                  <option value="MISC">雜項</option>
                  <option value="WORK_ITEM">工項</option>
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label small text-muted mb-1">來源檔名</label>
                <select class="form-select form-select-sm" v-model="searchSourceFile">
                  <option value="">全部</option>
                  <option
                    v-for="file in sourceFileList"
                    :key="file"
                    :value="file"
                  >
                    {{ file }}
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
            locale="zh-TW"
            :enableHover="true"
            :filterSettings="filterSettings"
          >
            <e-columns>
              <e-column
                field="pccesCode"
                headerText="PCCES 代碼"
                width="150"
                textAlign="Left"
              ></e-column>
              <e-column
                field="cname"
                headerText="中文名稱"
                width="300"
                textAlign="Left"
              ></e-column>
              <e-column
                field="unitName"
                headerText="單位"
                width="100"
                textAlign="Center"
              ></e-column>
              <e-column
                field="type"
                headerText="類型"
                width="120"
                textAlign="Center"
                :template="'typeTemplate'"
              ></e-column>
              <e-column
                field="sourceFile"
                headerText="來源檔名"
                width="200"
                textAlign="Left"
              ></e-column>
              <e-column
                field="isActive"
                headerText="狀態"
                width="100"
                textAlign="Center"
                :template="'statusTemplate'"
              ></e-column>
            </e-columns>

            <!-- 類型模板 -->
            <template v-slot:typeTemplate="{ data }">
              <span :class="getTypeBadgeClass(data.type)">
                {{ getTypeText(data.type) }}
              </span>
            </template>

            <!-- 狀態模板 -->
            <template v-slot:statusTemplate="{ data }">
              <span
                v-if="data.isActive !== undefined"
                :class="data.isActive ? 'badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center' : 'badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center'"
              >
                {{ data.isActive ? '啟用' : '停用' }}
              </span>
              <span v-else>-</span>
            </template>
          </ejs-grid>
        </div>
      </div>
    </div>

    <!-- 匯入 Modal -->
    <Modal
      :show="showImportModal"
      title="匯入 PCCES 總項目"
      icon="fa fa-file-import"
      size="lg"
      @update:show="showImportModal = $event"
      :hideConfirmButton="true"
      cancelText="取消"
    >
      <template #body>
        <div class="mb-3">
          <label class="form-label fw-semibold">
            資料夾絕對路徑 <span class="text-danger">*</span>
          </label>
          <input
            type="text"
            class="form-control"
            v-model="directoryPath"
            placeholder="例如：C:/code/construction_manager_backend/PCCES總項目_XML格式"
          />
          <div class="form-text">
            將會呼叫 <code>POST /management/standard/pcces-catalog/import</code>，需系統管理員權限。
          </div>
        </div>

        <div class="d-flex align-items-center gap-2 mb-3">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            @click="fillExamplePath"
            :disabled="isImporting"
          >
            填入範例路徑
          </button>
        </div>

        <div class="alert alert-info d-flex align-items-start gap-2">
          <i class="fa fa-info-circle mt-1"></i>
          <div>
            <div class="fw-semibold">注意事項</div>
            <ul class="mb-0 ps-3">
              <li>來源檔名儲存時不含副檔名。</li>
              <li>同名來源檔重匯會先刪除舊資料再寫入。</li>
              <li>既有材料標準與施工程序資料會保留。</li>
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
            <ul class="mb-0 ps-3">
              <li>路徑不存在：請確認伺服器上的資料夾絕對路徑。</li>
              <li>權限不足：請確認已登入且具有系統管理員權限。</li>
              <li>伺服器錯誤：稍後重試，或聯繫後端查看日誌。</li>
            </ul>
          </div>
        </div>
      </template>
      <template #footer>
        <button
          class="btn btn-outline-secondary"
          @click="showImportModal = false"
          :disabled="isImporting"
        >
          取消
        </button>
        <button
          class="btn btn-primary"
          @click="startImport"
          :disabled="!directoryPath.trim() || isImporting"
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
import { masterDataApi, type PccesItemCatalog } from '@/api/masterData'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import {
  GridComponent as EjsGrid,
  ColumnsDirective as EColumns,
  ColumnDirective as EColumn,
  Sort,
  Resize,
  Filter,
  Page
} from '@syncfusion/ej2-vue-grids'
import type { GridComponent } from '@syncfusion/ej2-vue-grids'
import { getCurrentInstance } from 'vue'

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
const gridData = ref<PccesItemCatalog[]>([])
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
const searchCode = ref('')
const searchKeyword = ref('')
const searchType = ref<'MATERIAL' | 'LABOUR' | 'EQUIPMENT' | 'MISC' | 'WORK_ITEM' | ''>('')
const searchSourceFile = ref('')

// 來源檔名列表
const sourceFileList = ref<string[]>([])

// 匯入相關
const showImportModal = ref(false)
const directoryPath = ref('')
const isImporting = ref(false)
const importResult = ref<number | null>(null)
const errorMessage = ref('')

const examplePaths = [
  'C:/code/construction_manager_backend/PCCES總項目_XML格式',
  '/opt/data/PCCES_XML'
]

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
      if (searchCode.value.trim()) {
        countParams.code = searchCode.value.trim()
      }
      if (searchKeyword.value.trim()) {
        countParams.keyword = searchKeyword.value.trim()
      }
      if (searchType.value) {
        countParams.type = searchType.value
      }
      if (searchSourceFile.value.trim()) {
        countParams.sourceFile = searchSourceFile.value.trim()
      }
    }

    // 先取得總筆數
    const countResponse = await masterDataApi.searchPccesCatalog(countParams)
    const totalElements = countResponse.totalElements || 0

    // 如果沒有資料，直接返回
    if (totalElements === 0) {
      gridData.value = []
      sourceFileList.value = []
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
      if (searchCode.value.trim()) {
        params.code = searchCode.value.trim()
      }
      if (searchKeyword.value.trim()) {
        params.keyword = searchKeyword.value.trim()
      }
      if (searchType.value) {
        params.type = searchType.value
      }
      if (searchSourceFile.value.trim()) {
        params.sourceFile = searchSourceFile.value.trim()
      }
    }

    const response = await masterDataApi.searchPccesCatalog(params)
    gridData.value = response.content || []
    
    // 更新來源檔名列表（從所有資料中提取唯一的來源檔名）
    if (!useSearchParams) {
      // 只在載入全部資料時更新來源檔名列表
      const uniqueSourceFiles = new Set<string>()
      gridData.value.forEach(item => {
        if (item.sourceFile && item.sourceFile.trim()) {
          uniqueSourceFiles.add(item.sourceFile.trim())
        }
      })
      sourceFileList.value = Array.from(uniqueSourceFiles).sort()
    }
    
    // 如果有搜尋條件，顯示結果提示
    if (useSearchParams && (searchCode.value || searchKeyword.value || searchType.value || searchSourceFile.value)) {
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
  searchCode.value = ''
  searchKeyword.value = ''
  searchType.value = ''
  searchSourceFile.value = ''
  loadData(false)
}

// 類型相關
const getTypeText = (type?: string) => {
  const typeMap: Record<string, string> = {
    MATERIAL: '材料',
    LABOUR: '人工',
    EQUIPMENT: '機具',
    MISC: '雜項',
    WORK_ITEM: '工項',
  }
  return type ? typeMap[type] || type : '-'
}

const getTypeBadgeClass = (type?: string) => {
  const classMap: Record<string, string> = {
    MATERIAL: 'badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center',
    LABOUR: 'badge border border-info text-info px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center',
    EQUIPMENT: 'badge border border-warning text-warning px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center',
    MISC: 'badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center',
    WORK_ITEM: 'badge border border-danger text-danger px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center',
  }
  return type ? classMap[type] || 'badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center' : 'badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center'
}

// 匯入相關
const openImportModal = () => {
  directoryPath.value = ''
  importResult.value = null
  errorMessage.value = ''
  showImportModal.value = true
}

const fillExamplePath = () => {
  if (examplePaths.length > 0) {
    directoryPath.value = examplePaths[0]
  }
}

const startImport = async () => {
  importResult.value = null
  errorMessage.value = ''

  const path = directoryPath.value.trim()
  if (!path) {
    errorMessage.value = '請填入資料夾絕對路徑'
    return
  }

  try {
    isImporting.value = true
    const result = await masterDataApi.importPccesCatalog(path)
    importResult.value = typeof result === 'number' ? result : (result as any)?.count ?? 0
    proxy?.$toast?.success(`匯入成功，筆數：${importResult.value}`)
    
    // 匯入成功後重新載入列表
    await loadData()
    
    // 關閉 Modal
    showImportModal.value = false
  } catch (err: any) {
    const status = err?.response?.status
    const backendMsg = err?.response?.data?.message
    if (status === 404) {
      errorMessage.value = backendMsg || '路徑不存在，請確認伺服器上的資料夾路徑'
    } else if (status === 403) {
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

// 當組件重新激活時（從其他畫面切回來），確保 Grid 樣式正確
onActivated(() => {
  if (grid.value) {
    nextTick(() => {
      if (isFullscreen.value) {
        // 如果處於全螢幕模式，確保樣式正確應用
      }
    })
  }
})
</script>

<style scoped>
.pcces-catalog-page {
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
  .pcces-catalog-page {
    padding: 0.5rem;
  }
  
  .treegrid-wrapper {
    height: 400px;
  }
}
</style>
