<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import apexchart from '@/components/plugins/Apexcharts.vue'
import chartjs from '@/components/plugins/Chartjs.vue'

import CalendarWidget from '@/components/dashboard/CalendarWidget.vue'
import { useAppVariableStore } from '@/stores/app-variable'

const appVariable = useAppVariableStore()

// 狀態
const isLoading = ref(false)
const currentTime = ref(new Date())
const refreshTimer = ref<number | null>(null)

// 當前專案儀表板數據
const dashboardData = ref({
  // 專案基本資訊
  projectInfo: null,
  // 工程進度
  constructionProgress: 0,
  budgetProgress: 0,
  scheduleProgress: 0,
  // 預算資訊
  totalBudget: 0,
  usedBudget: 0,
  remainingBudget: 0,
  // 工程階段
  currentPhase: '',
  totalPhases: 0,
  completedPhases: 0,
  // 人員統計
  totalWorkers: 0,
  onSiteWorkers: 0,
  // 材料設備
  materialDelivered: 0,
  equipmentStatus: 0,
  // 品質安全
  qualityScore: 0,
  safetyIncidents: 0,
  safetyDays: 0,
  // 近期活動
  recentActivities: [],
  // 專案警示
  alerts: []
})

// 計算屬性 - 移除專案依賴，直接使用假資料

const projectProgressPercentage = computed(() => {
  return dashboardData.value.constructionProgress || 0
})

const budgetUtilizationRate = computed(() => {
  return dashboardData.value.budgetProgress || 0
})

const scheduleStatus = computed(() => {
  const construction = dashboardData.value.constructionProgress
  const schedule = dashboardData.value.scheduleProgress
  const variance = construction - schedule
  
  if (variance > 5) return { status: 'ahead', text: '超前', color: 'success' }
  if (variance < -5) return { status: 'behind', text: '落後', color: 'danger' }
  return { status: 'ontrack', text: '正常', color: 'info' }
})

const phaseProgress = computed(() => {
  if (!dashboardData.value.totalPhases || dashboardData.value.totalPhases === 0) return 0
  return Math.round((dashboardData.value.completedPhases / dashboardData.value.totalPhases) * 100)
})

// 工程進度趨勢圖表（ApexCharts）
const projectProgressChart = computed(() => {
  const currentProgress = dashboardData.value?.constructionProgress || 0
  const budgetProgress = dashboardData.value?.budgetProgress || 0
  const scheduleProgress = dashboardData.value?.scheduleProgress || 0
  
  return {
    height: 350,
    series: [{
      name: '工程進度',
      data: [
        Math.max(0, currentProgress - 30),
        Math.max(0, currentProgress - 25),
        Math.max(0, currentProgress - 20),
        Math.max(0, currentProgress - 15),
        Math.max(0, currentProgress - 10),
        Math.max(0, currentProgress - 5),
        currentProgress
      ]
    }, {
      name: '預算使用',
      data: [
        Math.max(0, budgetProgress - 25),
        Math.max(0, budgetProgress - 20),
        Math.max(0, budgetProgress - 15),
        Math.max(0, budgetProgress - 12),
        Math.max(0, budgetProgress - 8),
        Math.max(0, budgetProgress - 4),
        budgetProgress
      ]
    }, {
      name: '計畫進度',
      data: [
        Math.max(0, scheduleProgress - 30),
        Math.max(0, scheduleProgress - 25),
        Math.max(0, scheduleProgress - 20),
        Math.max(0, scheduleProgress - 15),
        Math.max(0, scheduleProgress - 10),
        Math.max(0, scheduleProgress - 5),
        scheduleProgress
      ]
    }],
    options: {
      chart: {
        type: 'line',
        toolbar: { show: false },
        sparkline: { enabled: false }
      },
      title: {
        text: '工程進度追蹤',
        align: 'left'
      },
      colors: [
        appVariable.color?.primary || '#007bff',
        appVariable.color?.warning || '#ffc107',
        appVariable.color?.success || '#28a745'
      ],
      dataLabels: { enabled: false },
      stroke: { 
        curve: 'smooth', 
        width: [3, 3, 2],
        dashArray: [0, 0, 5] // 計畫進度使用虛線
      },
      xaxis: {
        categories: ['第1週', '第2週', '第3週', '第4週', '第5週', '第6週', '第7週']
      },
      yaxis: {
        min: 0,
        max: 100,
        labels: {
          formatter: function (value) {
            return Math.round(value) + '%'
          }
        }
      },
      legend: {
        position: 'top'
      },
      tooltip: {
        y: {
          formatter: function (value) {
            return Math.round(value) + '%'
          }
        }
      }
    }
  }
})

// 工程階段分佈圖表（Chart.js）
const phaseDistributionChart = computed(() => {
  const completedPhases = dashboardData.value?.completedPhases || 0
  const totalPhases = dashboardData.value?.totalPhases || 6
  const remainingPhases = Math.max(0, totalPhases - completedPhases - 1)
  
  return {
    type: 'doughnut',
    data: {
      labels: ['已完成階段', '進行中階段', '未開始階段'],
      datasets: [{
        data: [
          completedPhases,
          1, // 當前階段
          remainingPhases
        ],
        backgroundColor: [
          appVariable.color?.success || '#28a745',
          appVariable.color?.warning || '#ffc107',
          appVariable.color?.gray300 || '#dee2e6'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        },
        title: {
          display: true,
          text: '工程階段進度'
        }
      }
    }
  }
})

// 資源使用狀況圖表（ApexCharts）
const resourceUsageChart = computed(() => {
  const onSiteWorkers = dashboardData.value?.onSiteWorkers || 0
  const totalWorkers = dashboardData.value?.totalWorkers || 0
  const materialDelivered = dashboardData.value?.materialDelivered || 0
  const equipmentStatus = dashboardData.value?.equipmentStatus || 0
  
  return {
    height: 300,
    series: [{
      name: '使用中',
      data: [onSiteWorkers, materialDelivered, equipmentStatus]
    }, {
      name: '未使用/待命',
      data: [
        Math.max(0, totalWorkers - onSiteWorkers),
        Math.max(0, 100 - materialDelivered),
        Math.max(0, 100 - equipmentStatus)
      ]
    }],
    options: {
      chart: {
        type: 'bar',
        stacked: true,
        toolbar: { show: false },
        background: 'transparent'
      },
            colors: [
        appVariable.color?.primary || '#007bff',
        appVariable.color?.gray300 || '#dee2e6'
      ],
      theme: {
        mode: 'dark'
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%'
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          colors: ['#ffffff', '#ffffff']
        }
      },
      xaxis: {
        categories: ['人力配置', '材料到貨', '設備運作'],
        max: Math.max(100, totalWorkers),
        labels: {
          style: {
            colors: '#ffffff'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#ffffff'
          },
          formatter: function (value, index) {
            const labels = ['人力配置', '材料到貨', '設備運作']
            return labels[index] || value
          }
        }
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: function (value, { seriesIndex, dataPointIndex }) {
            if (dataPointIndex === 0) { // 人力
              return value + ' 人'
            }
            return value + '%'
          }
        }
      },
      legend: {
        position: 'top',
        labels: {
          colors: '#ffffff'
        }
      }
    }
  }
})

// 方法
const loadDashboardData = async () => {
  isLoading.value = true
  try {
    // 使用假資料，不依賴專案選擇
    dashboardData.value = {
      // 專案基本資訊
      projectInfo: {
        name: '台北市內湖區新辦公大樓興建工程',
        location: '台北市內湖區行善路123號',
        contractor: '大同營造股份有限公司',
        startDate: '2024-01-15',
        endDate: '2025-12-31',
        budget: 50000000
      },
      // 工程進度
      constructionProgress: 72,
      budgetProgress: 68,
      scheduleProgress: 75,
      // 預算資訊
      totalBudget: 50000000,
      usedBudget: 34000000,
      remainingBudget: 16000000,
      // 工程階段
      currentPhase: '結構工程',
      totalPhases: 6,
      completedPhases: 3,
      // 人員統計
      totalWorkers: 45,
      onSiteWorkers: 38,
      // 材料設備
      materialDelivered: 85,
      equipmentStatus: 92,
      // 品質安全
      qualityScore: 94,
      safetyIncidents: 0,
      safetyDays: 127,
      // 近期活動
      recentActivities: [
        { time: '10分鐘前', action: '混凝土澆置完成', area: '3樓樓板', type: 'success' },
        { time: '1小時前', action: '鋼筋檢驗通過', area: '4樓結構', type: 'success' },
        { time: '3小時前', action: '材料進場', area: '工地現場', type: 'info' },
        { time: '今天上午', action: '安全巡檢完成', area: '全工地', type: 'info' },
        { time: '昨天', action: '進度會議', area: '會議室', type: 'warning' }
      ],
      // 工地提醒（非跨專案警示）
      alerts: [
        { 
          type: 'warning', 
          message: '本週雨天較多，需注意戶外作業安全', 
          time: '2小時前',
          category: 'weather'
        },
        { 
          type: 'info', 
          message: '下週材料供應商將送達預製構件', 
          time: '4小時前',
          category: 'material'
        },
        { 
          type: 'success', 
          message: '第3階段結構工程已完成驗收', 
          time: '1天前',
          category: 'milestone'
        }
      ]
    }
  } catch (error) {
    console.error('載入儀表板數據失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const updateCurrentTime = () => {
  currentTime.value = new Date()
}

const getStatusColor = (status: string) => {
  const colors = {
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'info'
  }
  return colors[status] || 'secondary'
}

const getAlertIcon = (category: string) => {
  const icons = {
    weather: 'fa-cloud-rain',
    material: 'fa-truck',
    safety: 'fa-hard-hat',
    quality: 'fa-check-circle',
    schedule: 'fa-clock',
    budget: 'fa-dollar-sign'
  }
  return icons[category] || 'fa-exclamation-triangle'
}

const getCategoryText = (category: string) => {
  const texts = {
    weather: '天候',
    material: '材料',
    safety: '安全',
    quality: '品質',
    schedule: '進度',
    budget: '預算'
  }
  return texts[category] || '其他'
}

// 生命週期
onMounted(async () => {
  await loadDashboardData()
  
  // 設定時間更新定時器
  refreshTimer.value = setInterval(updateCurrentTime, 60000) as unknown as number // 每分鐘更新一次
})

onBeforeUnmount(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
  }
})
</script>

<template>
  <div class="dashboard-container">
    <div class="dashboard-content">
        
        <!-- 儀表板內容 -->
        <div>
          
          <!-- 專案關鍵指標卡片 -->
          <div class="row g-4 mb-4">
            <div class="col-xl-3 col-md-6">
              <Card>
                <CardBody>
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="text-muted mb-0 text-uppercase">工程進度</h6>
                    <i class="fa fa-tasks text-muted"></i>
                  </div>
                  <h2 class="mb-2">72%</h2>
                  <div class="d-flex align-items-center">
                    <i class="fa fa-arrow-up text-success me-1"></i>
                    <span class="small text-success">5.2% 比上週</span>
                  </div>
                  <div class="progress mt-3" style="height: 4px;">
                    <div class="progress-bar bg-primary" style="width: 72%"></div>
                  </div>
                </CardBody>
              </Card>
            </div>
            
            <div class="col-xl-3 col-md-6">
              <Card>
                <CardBody>
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="text-muted mb-0 text-uppercase">現場人員</h6>
                    <i class="fa fa-users text-muted"></i>
                  </div>
                  <h2 class="mb-2">38/45</h2>
                  <div class="d-flex align-items-center">
                    <i class="fa fa-arrow-up text-success me-1"></i>
                    <span class="small text-success">84% 出勤率</span>
                  </div>
                  <div class="progress mt-3" style="height: 4px;">
                    <div class="progress-bar bg-success" style="width: 84%"></div>
                  </div>
                </CardBody>
              </Card>
            </div>
            
            <div class="col-xl-3 col-md-6">
              <Card>
                <CardBody>
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="text-muted mb-0 text-uppercase">預算使用</h6>
                    <i class="fa fa-dollar-sign text-muted"></i>
                  </div>
                  <h2 class="mb-2">68%</h2>
                  <div class="d-flex align-items-center">
                    <i class="fa fa-minus text-warning me-1"></i>
                    <span class="small text-warning">按計畫執行</span>
                  </div>
                  <div class="progress mt-3" style="height: 4px;">
                    <div class="progress-bar bg-warning" style="width: 68%"></div>
                  </div>
                </CardBody>
              </Card>
            </div>
            
            <div class="col-xl-3 col-md-6">
              <Card>
                <CardBody>
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="text-muted mb-0 text-uppercase">安全天數</h6>
                    <i class="fa fa-shield-alt text-muted"></i>
                  </div>
                  <h2 class="mb-2">127</h2>
                  <div class="d-flex align-items-center">
                    <i class="fa fa-check text-success me-1"></i>
                    <span class="small text-success">無事故記錄</span>
                  </div>
                  <div class="progress mt-3" style="height: 4px;">
                    <div class="progress-bar bg-info" style="width: 95%"></div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          <!-- 圖表區域 -->
          <div class="row g-4 mb-4">
            <!-- 專案進度趨勢 -->
            <div class="col-xl-8">
              <Card>
                <CardHeader>
                  <h5 class="mb-0">
                    <i class="fa fa-chart-line me-2"></i>
                    工程進度追蹤
                  </h5>
                </CardHeader>
                <CardBody>
                  <apexchart 
                    v-if="projectProgressChart"
                    :height="projectProgressChart.height" 
                    :options="projectProgressChart.options" 
                    :series="projectProgressChart.series"
                  />
                </CardBody>
              </Card>
            </div>
            
            <!-- 專案狀態分佈 -->
            <div class="col-xl-4">
              <Card>
                <CardHeader>
                  <h5 class="mb-0">
                    <i class="fa fa-chart-pie me-2"></i>
                    專案狀態分佈
                  </h5>
                </CardHeader>
                <CardBody>
                  <div v-if="phaseDistributionChart" style="height: 300px;">
                    <chartjs 
                      :type="phaseDistributionChart.type" 
                      :data="phaseDistributionChart.data"
                      :options="phaseDistributionChart.options"
                    />
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          <!-- 資源使用和預算分析 -->
          <div class="row g-4 mb-4">
            <!-- 資源使用狀況 -->
            <div class="col-xl-6">
              <Card>
                <CardHeader>
                  <h5 class="mb-0">
                    <i class="fa fa-cogs me-2"></i>
                    資源使用狀況
                  </h5>
                </CardHeader>
                <CardBody>
                  <apexchart 
                    v-if="resourceUsageChart"
                    :height="resourceUsageChart.height" 
                    :options="resourceUsageChart.options" 
                    :series="resourceUsageChart.series"
                  />
                  <div class="mt-3">
                    <div class="row text-center">
                      <div class="col-4">
                        <h6 class="text-muted mb-1">人力</h6>
                        <h5 class="text-primary mb-0">{{ dashboardData.onSiteWorkers }}/{{ dashboardData.totalWorkers }}</h5>
                      </div>
                      <div class="col-4">
                        <h6 class="text-muted mb-1">材料</h6>
                        <h5 class="text-warning mb-0">{{ dashboardData.materialDelivered }}%</h5>
                      </div>
                      <div class="col-4">
                        <h6 class="text-muted mb-1">設備</h6>
                        <h5 class="text-success mb-0">{{ dashboardData.equipmentStatus }}%</h5>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
            
            <!-- 工地提醒與今日任務 -->
            <div class="col-xl-6">
              <Card>
                <CardHeader>
                  <h5 class="mb-0">
                    <i class="fa fa-bell me-2"></i>
                    工地提醒
                  </h5>
                </CardHeader>
                <CardBody>
                  <div class="notifications-list">
                    <div 
                      v-for="(alert, index) in dashboardData.alerts" 
                      :key="index"
                      :class="`alert alert-${alert.type} d-flex align-items-start mb-3`"
                    >
                      <i :class="`fa ${getAlertIcon(alert.category)} me-2 mt-1`"></i>
                      <div class="flex-grow-1">
                        <div class="fw-semibold mb-1">{{ alert.message }}</div>
                        <small class="text-muted">
                          <i class="fa fa-clock me-1"></i>{{ alert.time }}
                        </small>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 今日工作重點 -->
                  <div class="mt-4 pt-3 border-top">
                    <h6 class="text-muted mb-3">
                      <i class="fa fa-clipboard-list me-2"></i>
                      今日工作重點
                    </h6>
                    <div class="work-items">
                      <div class="d-flex align-items-center mb-2">
                        <span class="badge border border-success text-success rounded-pill me-2" style="width: 8px; height: 8px; padding: 0;"></span>
                        <span class="small">混凝土澆置 - 3樓樓板</span>
                      </div>
                      <div class="d-flex align-items-center mb-2">
                        <span class="badge border border-warning text-warning rounded-pill me-2" style="width: 8px; height: 8px; padding: 0;"></span>
                        <span class="small">鋼筋檢驗 - 4樓結構</span>
                      </div>
                      <div class="d-flex align-items-center mb-2">
                        <span class="badge border border-secondary text-secondary rounded-pill me-2" style="width: 8px; height: 8px; padding: 0;"></span>
                        <span class="small">安全巡檢 - 全工地</span>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          <!-- 工程預算管理 -->
          <div class="row g-4 mb-4">
            <!-- 預算概況 -->
            <div class="col-xl-4">
              <Card>
                <CardHeader>
                  <h5 class="mb-0">
                    <i class="fa fa-money-bill-wave me-2"></i>
                    工程預算概況
                  </h5>
                </CardHeader>
                <CardBody>
                  <div class="budget-overview">
                    <!-- 總預算 -->
                    <div class="budget-item mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-muted">總工程預算</span>
                        <i class="fa fa-wallet text-primary"></i>
                      </div>
                      <h3 class="text-primary mb-0">NT$ 50,000,000</h3>
                      <small class="text-muted">原始契約金額</small>
                    </div>
                    
                    <!-- 已使用預算 -->
                    <div class="budget-item mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-muted">已使用預算</span>
                        <i class="fa fa-chart-line text-warning"></i>
                      </div>
                      <h3 class="text-warning mb-0">NT$ 34,000,000</h3>
                      <div class="progress mt-2" style="height: 6px;">
                        <div class="progress-bar bg-warning" style="width: 68%"></div>
                      </div>
                      <small class="text-muted">使用率: 68%</small>
                    </div>
                    
                    <!-- 剩餘預算 -->
                    <div class="budget-item mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-muted">剩餘預算</span>
                        <i class="fa fa-piggy-bank text-success"></i>
                      </div>
                      <h3 class="text-success mb-0">NT$ 16,000,000</h3>
                      <div class="progress mt-2" style="height: 6px;">
                        <div class="progress-bar bg-success" style="width: 32%"></div>
                      </div>
                      <small class="text-muted">剩餘率: 32%</small>
                    </div>
                    
                    <!-- 預算狀態 -->
                    <div class="budget-status p-3 bg-light rounded">
                      <div class="d-flex align-items-center">
                        <i class="fa fa-check-circle text-success me-2"></i>
                        <span class="fw-semibold">預算執行狀況良好</span>
                      </div>
                      <small class="text-muted mt-1 d-block">目前進度符合預算規劃</small>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
            
            <!-- 預算變更紀錄 -->
            <div class="col-xl-8">
              <Card>
                <CardHeader>
                  <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                      <i class="fa fa-history me-2"></i>
                      預算變更紀錄
                    </h5>
                    <button class="btn btn-outline-primary btn-sm">
                      <i class="fa fa-plus me-1"></i>
                      新增變更
                    </button>
                  </div>
                </CardHeader>
                <CardBody>
                  <div class="budget-changes">
                    <div class="table-responsive">
                      <table class="table table-hover">
                        <thead class="table-light">
                          <tr>
                            <th>變更日期</th>
                            <th>變更原因</th>
                            <th>變更前金額</th>
                            <th>變更金額</th>
                            <th>變更後金額</th>
                            <th>操作人</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>2024-08-15</td>
                            <td>材料價格上漲調整</td>
                            <td>NT$ 45,000,000</td>
                            <td>
                              <span class="text-success">+NT$ 5,000,000</span>
                            </td>
                            <td>NT$ 50,000,000</td>
                            <td>張工程師</td>
                          </tr>
                          <tr>
                            <td>2024-06-20</td>
                            <td>設計變更追加工程</td>
                            <td>NT$ 42,000,000</td>
                            <td>
                              <span class="text-success">+NT$ 3,000,000</span>
                            </td>
                            <td>NT$ 45,000,000</td>
                            <td>李技師</td>
                          </tr>
                          <tr>
                            <td>2024-04-10</td>
                            <td>原物料成本降低</td>
                            <td>NT$ 45,000,000</td>
                            <td>
                              <span class="text-danger">-NT$ 3,000,000</span>
                            </td>
                            <td>NT$ 42,000,000</td>
                            <td>王主任</td>
                          </tr>
                          <tr>
                            <td>2024-02-28</td>
                            <td>原始契約金額</td>
                            <td>-</td>
                            <td>
                              <span class="text-primary">NT$ 45,000,000</span>
                            </td>
                            <td>NT$ 45,000,000</td>
                            <td>系統</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <!-- 預算變更統計 -->
                    <div class="row mt-4 pt-3 border-top">
                      <div class="col-md-3 text-center">
                        <div class="fw-bold text-success">+NT$ 8,000,000</div>
                        <small class="text-muted">總增加金額</small>
                      </div>
                      <div class="col-md-3 text-center">
                        <div class="fw-bold text-danger">-NT$ 3,000,000</div>
                        <small class="text-muted">總減少金額</small>
                      </div>
                      <div class="col-md-3 text-center">
                        <div class="fw-bold text-primary">3</div>
                        <small class="text-muted">變更次數</small>
                      </div>
                      <div class="col-md-3 text-center">
                        <div class="fw-bold text-warning">11.1%</div>
                        <small class="text-muted">變更幅度</small>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          <!-- 專案詳細資訊 -->
          <div class="row g-4 mb-4">
            <!-- 工程階段進度 -->
            <div class="col-xl-6">
              <Card>
                <CardHeader>
                  <h5 class="mb-0">
                    <i class="fa fa-tasks me-2"></i>
                    工程階段進度
                  </h5>
                </CardHeader>
                <CardBody>
                  <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <span class="fw-semibold">當前階段：結構工程</span>
                      <span class="badge border border-primary text-primary">第 3/6 階段</span>
                    </div>
                    <div class="progress mb-3" style="height: 8px;">
                      <div class="progress-bar bg-primary" style="width: 50%"></div>
                    </div>
                  </div>
                  
                  <div class="stages-list">
                    <div class="stage-item d-flex align-items-center mb-3">
                      <i class="fa fa-check-circle text-success me-3"></i>
                      <div class="flex-grow-1">
                        <div class="fw-semibold">基礎工程</div>
                        <small class="text-muted">已完成 - 2024/03/15</small>
                      </div>
                    </div>
                    <div class="stage-item d-flex align-items-center mb-3">
                      <i class="fa fa-check-circle text-success me-3"></i>
                      <div class="flex-grow-1">
                        <div class="fw-semibold">地下室工程</div>
                        <small class="text-muted">已完成 - 2024/05/20</small>
                      </div>
                    </div>
                    <div class="stage-item d-flex align-items-center mb-3">
                      <i class="fa fa-clock text-warning me-3"></i>
                      <div class="flex-grow-1">
                        <div class="fw-semibold">結構工程</div>
                        <small class="text-muted">進行中 - 預計 2024/09/30</small>
                      </div>
                    </div>
                    <div class="stage-item d-flex align-items-center mb-3">
                      <i class="fa fa-circle text-muted me-3"></i>
                      <div class="flex-grow-1">
                        <div class="fw-semibold text-muted">機電工程</div>
                        <small class="text-muted">待開始</small>
                      </div>
                    </div>
                    <div class="stage-item d-flex align-items-center mb-3">
                      <i class="fa fa-circle text-muted me-3"></i>
                      <div class="flex-grow-1">
                        <div class="fw-semibold text-muted">裝修工程</div>
                        <small class="text-muted">待開始</small>
                      </div>
                    </div>
                    <div class="stage-item d-flex align-items-center">
                      <i class="fa fa-circle text-muted me-3"></i>
                      <div class="flex-grow-1">
                        <div class="fw-semibold text-muted">驗收交付</div>
                        <small class="text-muted">待開始</small>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
            
            <!-- 材料與設備狀況 -->
            <div class="col-xl-6">
              <Card>
                <CardHeader>
                  <h5 class="mb-0">
                    <i class="fa fa-truck me-2"></i>
                    材料與設備狀況
                  </h5>
                </CardHeader>
                <CardBody>
                  <div class="material-list">
                    <div class="material-item d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
                      <div class="d-flex align-items-center">
                        <i class="fa fa-cube text-primary me-3"></i>
                        <div>
                          <div class="fw-semibold">混凝土</div>
                          <small class="text-muted">C30 結構用</small>
                        </div>
                      </div>
                      <div class="text-end">
                        <span class="badge border border-success text-success">充足</span>
                        <div class="small text-muted">庫存: 850m³</div>
                      </div>
                    </div>
                    
                    <div class="material-item d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
                      <div class="d-flex align-items-center">
                        <i class="fa fa-weight-hanging text-secondary me-3"></i>
                        <div>
                          <div class="fw-semibold">鋼筋</div>
                          <small class="text-muted">#4 & #6</small>
                        </div>
                      </div>
                      <div class="text-end">
                        <span class="badge border border-warning text-warning">補貨中</span>
                        <div class="small text-muted">庫存: 12噸</div>
                      </div>
                    </div>
                    
                    <div class="material-item d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
                      <div class="d-flex align-items-center">
                        <i class="fa fa-tools text-warning me-3"></i>
                        <div>
                          <div class="fw-semibold">塔式起重機</div>
                          <small class="text-muted">主吊裝設備</small>
                        </div>
                      </div>
                      <div class="text-end">
                        <span class="badge border border-success text-success">正常</span>
                        <div class="small text-muted">運行時數: 1,250h</div>
                      </div>
                    </div>
                    
                    <div class="material-item d-flex justify-content-between align-items-center p-3 border rounded">
                      <div class="d-flex align-items-center">
                        <i class="fa fa-hard-hat text-info me-3"></i>
                        <div>
                          <div class="fw-semibold">安全設備</div>
                          <small class="text-muted">防護網、安全帶等</small>
                        </div>
                      </div>
                      <div class="text-end">
                        <span class="badge border border-success text-success">完備</span>
                        <div class="small text-muted">檢查: 合格</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mt-4 pt-3 border-top">
                    <div class="row text-center">
                      <div class="col-4">
                        <div class="fw-bold text-success">85%</div>
                        <small class="text-muted">材料到貨率</small>
                      </div>
                      <div class="col-4">
                        <div class="fw-bold text-primary">92%</div>
                        <small class="text-muted">設備可用率</small>
                      </div>
                      <div class="col-4">
                        <div class="fw-bold text-warning">3</div>
                        <small class="text-muted">待補貨項目</small>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          <!-- 行事曆和重要事件 -->
          <div class="row g-4">
            <div class="col-12">
              <CalendarWidget />
            </div>
          </div>

        </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: transparent;
  padding: 0;
  margin: 0;
}

.dashboard-content {
  padding: 2rem;
  max-width: none;
}

.page-header {
  font-size: 1.75rem;
  font-weight: 600;
}

.project-info {
  font-size: 0.9rem;
}

/* 預算管理樣式 */
.budget-overview .budget-item {
  padding: 1rem;
  border-radius: 8px;
  background: rgba(0, 123, 255, 0.05);
  border-left: 4px solid var(--bs-primary);
}

.budget-overview .budget-item:nth-child(2) {
  background: rgba(255, 193, 7, 0.05);
  border-left-color: var(--bs-warning);
}

.budget-overview .budget-item:nth-child(3) {
  background: rgba(40, 167, 69, 0.05);
  border-left-color: var(--bs-success);
}

.budget-status {
  border: 1px solid rgba(40, 167, 69, 0.2);
  background: rgba(40, 167, 69, 0.05) !important;
}

.budget-changes .table th {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--bs-gray-700);
  border-bottom: 2px solid var(--bs-gray-200);
}

.budget-changes .table td {
  vertical-align: middle;
  font-size: 0.875rem;
}

.budget-changes .table tbody tr:hover {
  background-color: rgba(0, 123, 255, 0.05);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .dashboard-content {
    padding: 1rem;
  }
  
  .page-header {
    font-size: 1.5rem;
  }
  
  .d-flex.justify-content-between {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 1rem;
  }
  
  .budget-overview .budget-item {
    padding: 0.75rem;
  }
  
  .budget-changes .table-responsive {
    font-size: 0.8rem;
  }
}
</style>
