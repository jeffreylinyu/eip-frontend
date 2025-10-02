<template>
  <div class="daily-report-overview">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">工程日報表</h4>
        <p class="text-muted mb-0">{{ formatDate(reportDate) }}</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="copyFromYesterday"
          :disabled="isLoading"
        >
          <i class="fa fa-copy me-1"></i>從昨天帶入
        </button>
        <button 
          class="btn btn-primary"
          @click="saveDraft"
          :disabled="isLoading"
        >
          <i class="fa fa-save me-1"></i>儲存草稿
        </button>
        <button 
          class="btn btn-success"
          @click="submitReport"
          :disabled="isLoading || !canSubmit"
        >
          <i class="fa fa-paper-plane me-1"></i>送出審核
        </button>
      </div>
    </div>

    <!-- 狀態指示器 -->
    <div class="mb-4">
      <div class="d-flex align-items-center">
        <span class="badge me-2" :class="statusBadgeClass">{{ statusText }}</span>
        <span class="text-muted fs-sm">{{ statusDescription }}</span>
      </div>
    </div>

    <!-- 基本資訊卡片 -->
    <div class="row mb-4">
      <div class="col-lg-8">
        <Card>
          <CardHeader>
            <h6 class="mb-0">
              <i class="fa fa-info-circle me-2"></i>工程基本資訊
            </h6>
          </CardHeader>
          <CardBody>
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">工程名稱</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="report.basicInfo.projectName"
                  placeholder="請輸入工程名稱"
                />
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">契約工期</label>
                <div class="input-group">
                  <input
                    type="number"
                    class="form-control"
                    v-model="report.basicInfo.contractPeriod"
                    min="0"
                  />
                  <span class="input-group-text">天</span>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label">累計工期</label>
                <div class="input-group">
                  <input
                    type="number"
                    class="form-control"
                    v-model="report.basicInfo.cumulativePeriod"
                    min="0"
                  />
                  <span class="input-group-text">天</span>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label">本日工期</label>
                <div class="input-group">
                  <input
                    type="number"
                    class="form-control"
                    v-model="report.basicInfo.todayPeriod"
                    min="0"
                  />
                  <span class="input-group-text">天</span>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label">本日出工數</label>
                <div class="input-group">
                  <input
                    type="number"
                    class="form-control"
                    v-model="report.basicInfo.todayLaborCount"
                    min="0"
                  />
                  <span class="input-group-text">人</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      <!-- 天氣資訊 -->
      <div class="col-lg-4">
        <Card>
          <CardHeader>
            <h6 class="mb-0">
              <i class="fa fa-cloud me-2"></i>天氣資訊
            </h6>
          </CardHeader>
          <CardBody>
            <div class="mb-3">
              <label class="form-label">上午天氣</label>
              <select class="form-select" v-model="report.weather.morning">
                <option value="">請選擇天氣</option>
                <option v-for="weather in weatherOptions" :key="weather" :value="weather">
                  {{ weather }}
                </option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">下午天氣</label>
              <select class="form-select" v-model="report.weather.afternoon">
                <option value="">請選擇天氣</option>
                <option v-for="weather in weatherOptions" :key="weather" :value="weather">
                  {{ weather }}
                </option>
              </select>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 匯總統計 -->
    <div class="row mb-4">
      <div class="col-md-3">
        <Card class="bg-primary text-white">
          <CardBody class="text-center">
            <h3 class="mb-1">{{ totalMaterials }}</h3>
            <p class="mb-0">材料種類</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-success text-white">
          <CardBody class="text-center">
            <h3 class="mb-1">{{ totalLabor }}</h3>
            <p class="mb-0">出工人數</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-warning text-white">
          <CardBody class="text-center">
            <h3 class="mb-1">{{ totalEquipment }}</h3>
            <p class="mb-0">機具數量</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-info text-white">
          <CardBody class="text-center">
            <h3 class="mb-1">{{ totalConstructionTasks }}</h3>
            <p class="mb-0">施工項目</p>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 快速導航 -->
    <div class="row">
      <div class="col-12">
        <Card>
          <CardHeader>
            <h6 class="mb-0">
              <i class="fa fa-list me-2"></i>快速導航
            </h6>
          </CardHeader>
          <CardBody>
            <div class="row">
              <div class="col-md-2 mb-3" v-for="section in sections" :key="section.id">
                <button 
                  class="btn btn-outline-theme w-100"
                  @click="navigateToSection(section.id)"
                >
                  <i :class="section.icon + ' me-2'"></i>
                  {{ section.name }}
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 錯誤訊息 -->
    <div v-if="errors.length > 0" class="alert alert-danger mt-4">
      <h6>請修正以下錯誤：</h6>
      <ul class="mb-0">
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { DailyReport } from '@/types/dailyReport'
import { WEATHER_OPTIONS } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const report = ref<DailyReport>({
  projectId: '',
  reportDate: new Date().toISOString().split('T')[0],
  status: 'DRAFT',
  basicInfo: {
    projectName: '',
    contractPeriod: 0,
    cumulativePeriod: 0,
    todayPeriod: 0,
    todayLaborCount: 0,
    todayEquipmentCount: 0,
    todayMaterialInbound: 0
  },
  weather: {
    morning: '',
    afternoon: ''
  },
  materials: [],
  laborRecords: [],
  equipmentRecords: [],
  incomingRecords: [],
  materialInspections: [],
  safetyRecords: [],
  constructionRecords: [],
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
})

const isLoading = ref(false)
const errors = ref<string[]>([])

// 計算屬性
const reportDate = computed(() => report.value.reportDate)
const weatherOptions = computed(() => WEATHER_OPTIONS)

const statusBadgeClass = computed(() => {
  const statusMap = {
    DRAFT: 'bg-secondary',
    SUBMITTED: 'bg-primary',
    REVIEWED: 'bg-warning',
    APPROVED: 'bg-success',
    REJECTED: 'bg-danger'
  }
  return statusMap[report.value.status] || 'bg-secondary'
})

const statusText = computed(() => {
  const statusMap = {
    DRAFT: '草稿',
    SUBMITTED: '已送出',
    REVIEWED: '審核中',
    APPROVED: '已核准',
    REJECTED: '已退回'
  }
  return statusMap[report.value.status] || '草稿'
})

const statusDescription = computed(() => {
  const descriptions = {
    DRAFT: '您可以編輯和儲存草稿',
    SUBMITTED: '等待審核人員審核',
    REVIEWED: '正在進行審核流程',
    APPROVED: '日報表已核准完成',
    REJECTED: '日報表被退回，請修正後重新送出'
  }
  return descriptions[report.value.status] || '您可以編輯和儲存草稿'
})

const canSubmit = computed(() => {
  return report.value.basicInfo.projectName && 
         report.value.weather.morning && 
         report.value.weather.afternoon
})

const totalMaterials = computed(() => report.value.materials.length)
const totalLabor = computed(() => report.value.laborRecords.length)
const totalEquipment = computed(() => report.value.equipmentRecords.length)
const totalConstructionTasks = computed(() => report.value.constructionRecords.length)

// 快速導航區塊
const sections = [
  { id: 'materials', name: '材料進場', icon: 'fa fa-truck' },
  { id: 'labor', name: '出工紀錄', icon: 'fa fa-users' },
  { id: 'equipment', name: '機具出工', icon: 'fa fa-cogs' },
  { id: 'incoming', name: '進場紀錄', icon: 'fa fa-truck' },
  { id: 'inspection', name: '材料檢驗', icon: 'fa fa-search' },
  { id: 'safety', name: '安全衛生', icon: 'fa fa-shield-alt' },
  { id: 'construction', name: '施工記錄', icon: 'fa fa-hammer' },
  { id: 'notes', name: '重要記事', icon: 'fa fa-sticky-note' },
  { id: 'tomorrow', name: '明日進度', icon: 'fa fa-calendar' },
  { id: 'preparer', name: '製表人', icon: 'fa fa-user' }
]

// 方法
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

const copyFromYesterday = async () => {
  isLoading.value = true
  try {
    // TODO: 實作從昨天複製資料的 API
    // console.log('從昨天複製資料')
  } catch (error) {
    console.error('複製失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const saveDraft = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存草稿的 API
    // console.log('儲存草稿:', report.value)
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const submitReport = async () => {
  isLoading.value = true
  try {
    // TODO: 實作送出審核的 API
    // console.log('送出審核:', report.value)
  } catch (error) {
    console.error('送出失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const navigateToSection = (sectionId: string) => {
  const routeMap: Record<string, string> = {
    materials: '/daily-report/materials',
    labor: '/daily-report/labor',
    equipment: '/daily-report/equipment',
    incoming: '/daily-report/incoming',
    inspection: '/daily-report/inspection',
    safety: '/daily-report/safety',
    construction: '/daily-report/construction',
    notes: '/daily-report/notes',
    tomorrow: '/daily-report/tomorrow',
    preparer: '/daily-report/preparer'
  }
  
  const route = routeMap[sectionId]
  if (route) {
    router.push(route)
  }
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的日報表資料
  // console.log('載入日報表資料')
})
</script>

<style scoped>
.daily-report-overview {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}

.btn-outline-theme {
  border-color: var(--bs-primary);
  color: var(--bs-primary);
}

.btn-outline-theme:hover {
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
  color: white;
}
</style>
