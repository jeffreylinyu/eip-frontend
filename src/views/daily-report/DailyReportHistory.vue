<template>
  <div class="daily-report-history">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">日報表歷史記錄</h4>
        <p class="text-muted mb-0">瀏覽和管理歷史日報表</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="createNewReport"
        >
          <i class="fa fa-plus me-1"></i>新增日報表
        </button>
        <button 
          class="btn btn-outline-success"
          @click="exportSelected"
          :disabled="selectedReports.length === 0"
        >
          <i class="fa fa-download me-1"></i>匯出選取
        </button>
      </div>
    </div>

    <!-- 搜尋和篩選 -->
    <Card class="mb-4">
      <CardBody>
        <div class="row">
          <div class="col-md-3 mb-3">
            <label class="form-label">工程名稱</label>
            <input
              type="text"
              class="form-control"
              v-model="filters.projectName"
              placeholder="搜尋工程名稱"
            />
          </div>
          <div class="col-md-2 mb-3">
            <label class="form-label">開始日期</label>
            <input
              type="date"
              class="form-control"
              v-model="filters.startDate"
            />
          </div>
          <div class="col-md-2 mb-3">
            <label class="form-label">結束日期</label>
            <input
              type="date"
              class="form-control"
              v-model="filters.endDate"
            />
          </div>
          <div class="col-md-2 mb-3">
            <label class="form-label">狀態</label>
            <select class="form-select" v-model="filters.status">
              <option value="">全部狀態</option>
              <option value="DRAFT">草稿</option>
              <option value="SUBMITTED">已送出</option>
              <option value="REVIEWED">審核中</option>
              <option value="APPROVED">已核准</option>
              <option value="REJECTED">已退回</option>
            </select>
          </div>
          <div class="col-md-3 mb-3 d-flex align-items-end">
            <div class="d-flex gap-2 w-100">
              <button 
                class="btn btn-primary flex-fill"
                @click="searchReports"
                :disabled="isLoading"
              >
                <i class="fa fa-search me-1"></i>搜尋
              </button>
              <button 
                class="btn btn-outline-secondary"
                @click="clearFilters"
              >
                <i class="fa fa-times me-1"></i>清除
              </button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- 日報表列表 -->
    <Card>
      <CardHeader>
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="fa fa-list me-2"></i>日報表列表
          </h6>
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted fs-sm">共 {{ totalReports }} 筆記錄</span>
            <div class="form-check">
              <input 
                class="form-check-input" 
                type="checkbox" 
                id="selectAll"
                v-model="selectAll"
                @change="toggleSelectAll"
              />
              <label class="form-check-label fs-sm" for="selectAll">
                全選
              </label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div class="table-responsive">
          <table class="table table-hover">
            <thead class="table-light">
              <tr>
                <th style="width: 40px">
                  <input 
                    type="checkbox" 
                    class="form-check-input"
                    v-model="selectAll"
                    @change="toggleSelectAll"
                  />
                </th>
                <th>工程名稱</th>
                <th>日期</th>
                <th>狀態</th>
                <th>材料種類</th>
                <th>出工人數</th>
                <th>機具數量</th>
                <th>製表人</th>
                <th>建立時間</th>
                <th style="width: 120px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="report in reports" :key="report.id">
                <td>
                  <input 
                    type="checkbox" 
                    class="form-check-input"
                    :value="report.id"
                    v-model="selectedReports"
                  />
                </td>
                <td>
                  <div class="fw-bold">{{ report.basicInfo.projectName }}</div>
                  <small class="text-muted">{{ report.projectId }}</small>
                </td>
                <td>{{ formatDate(report.reportDate) }}</td>
                <td>
                  <span class="badge" :class="getStatusBadgeClass(report.status)">
                    {{ getStatusText(report.status) }}
                  </span>
                </td>
                <td>
                  <span class="badge bg-primary">{{ report.materials.length }}</span>
                </td>
                <td>
                  <span class="badge bg-success">
                    {{ getTotalLabor(report) }}
                  </span>
                </td>
                <td>
                  <span class="badge bg-warning">
                    {{ getTotalEquipment(report) }}
                  </span>
                </td>
                <td>{{ report.preparer.reportingDepartment || '-' }}</td>
                <td>{{ formatDateTime(report.createdAt) }}</td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button 
                      class="btn btn-outline-primary"
                      @click="viewReport(report.id!)"
                      title="檢視"
                    >
                      <i class="fa fa-eye"></i>
                    </button>
                    <button 
                      class="btn btn-outline-secondary"
                      @click="editReport(report.id!)"
                      title="編輯"
                      v-if="report.status === 'DRAFT'"
                    >
                      <i class="fa fa-edit"></i>
                    </button>
                    <button 
                      class="btn btn-outline-success"
                      @click="exportReport(report.id!)"
                      title="匯出"
                    >
                      <i class="fa fa-download"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="reports.length === 0">
                <td colspan="10" class="text-center text-muted py-4">
                  <i class="fa fa-inbox fa-2x mb-2"></i>
                  <p class="mb-0">沒有找到符合條件的日報表</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>

    <!-- 分頁 -->
    <div class="d-flex justify-content-between align-items-center mt-4">
      <div class="d-flex align-items-center gap-2">
        <span class="text-muted">每頁顯示</span>
        <select class="form-select form-select-sm" style="width: auto;" v-model="pageSize">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <span class="text-muted">筆記錄</span>
      </div>
      
      <nav>
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="changePage(currentPage - 1)">
              <i class="fa fa-chevron-left"></i>
            </button>
          </li>
          <li 
            v-for="page in visiblePages" 
            :key="page"
            class="page-item"
            :class="{ active: page === currentPage }"
          >
            <button class="page-link" @click="changePage(page)">{{ page }}</button>
          </li>
          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="changePage(currentPage + 1)">
              <i class="fa fa-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <!-- 載入中遮罩 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">載入中...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDailyReportStore } from '@/stores/dailyReport'
import type { DailyReport } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()
const dailyReportStore = useDailyReportStore()

// 響應式資料
const reports = ref<DailyReport[]>([])
const selectedReports = ref<string[]>([])
const isLoading = ref(false)
const totalReports = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const filters = ref({
  projectName: '',
  startDate: '',
  endDate: '',
  status: ''
})

// 計算屬性
const selectAll = computed({
  get: () => selectedReports.value.length === reports.value.length && reports.value.length > 0,
  set: (value: boolean) => {
    if (value) {
      selectedReports.value = reports.value.map(report => report.id!).filter(Boolean)
    } else {
      selectedReports.value = []
    }
  }
})

const totalPages = computed(() => Math.ceil(totalReports.value / pageSize.value))

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// 方法
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW')
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-TW')
}

const getStatusBadgeClass = (status: string) => {
  const statusMap = {
    DRAFT: 'bg-secondary',
    SUBMITTED: 'bg-primary',
    REVIEWED: 'bg-warning',
    APPROVED: 'bg-success',
    REJECTED: 'bg-danger'
  }
  return statusMap[status as keyof typeof statusMap] || 'bg-secondary'
}

const getStatusText = (status: string) => {
  const statusMap = {
    DRAFT: '草稿',
    SUBMITTED: '已送出',
    REVIEWED: '審核中',
    APPROVED: '已核准',
    REJECTED: '已退回'
  }
  return statusMap[status as keyof typeof statusMap] || '未知'
}

const getTotalLabor = (report: DailyReport) => {
  return report.laborRecords.reduce((sum, record) => 
    sum + (record.morning || 0) + (record.afternoon || 0) + (record.night || 0), 0
  )
}

const getTotalEquipment = (report: DailyReport) => {
  return report.equipmentRecords.reduce((sum, record) => 
    sum + (record.todayUsage || 0), 0
  )
}

const searchReports = async () => {
  isLoading.value = true
  try {
    // TODO: 實作搜尋日報表的 API
    // console.log('搜尋日報表:', filters.value)
    
    // 模擬 API 回應
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 這裡應該要呼叫 API 搜尋資料
    // const result = await dailyReportApi.searchReports(filters.value, currentPage.value, pageSize.value)
    // reports.value = result.data
    // totalReports.value = result.total
    
  } catch (error) {
    console.error('搜尋失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const clearFilters = () => {
  filters.value = {
    projectName: '',
    startDate: '',
    endDate: '',
    status: ''
  }
  currentPage.value = 1
  searchReports()
}

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedReports.value = reports.value.map(report => report.id!).filter(Boolean)
  } else {
    selectedReports.value = []
  }
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    searchReports()
  }
}

const createNewReport = () => {
  router.push('/daily-report')
}

const viewReport = (reportId: string) => {
  router.push(`/daily-report/view/${reportId}`)
}

const editReport = (reportId: string) => {
  router.push(`/daily-report/edit/${reportId}`)
}

const exportReport = async (reportId: string) => {
  try {
    await dailyReportStore.exportToExcel(reportId)
  } catch (error) {
    console.error('匯出失敗:', error)
  }
}

const exportSelected = async () => {
  if (selectedReports.value.length === 0) return
  
  try {
    // TODO: 實作批次匯出的 API
    // console.log('批次匯出:', selectedReports.value)
    
    // 這裡應該要呼叫 API 批次匯出
    // await dailyReportApi.exportMultiple(selectedReports.value)
    
  } catch (error) {
    console.error('批次匯出失敗:', error)
  }
}

// 生命週期
onMounted(() => {
  searchReports()
})
</script>

<style scoped>
.daily-report-history {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}

.fs-sm {
  font-size: 0.875rem;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.table th {
  font-weight: 600;
  background-color: #f8f9fa;
}

.table td {
  vertical-align: middle;
}

.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.pagination-sm .page-link {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
</style>
