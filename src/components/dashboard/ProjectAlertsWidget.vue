<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'

const workspaceStore = useWorkspaceStore()

// 狀態
const alerts = ref([])
const isLoading = ref(false)
const selectedSeverity = ref('all') // all, high, medium, low

// 警示類型定義
interface ProjectAlert {
  id: string
  type: 'budget' | 'schedule' | 'quality' | 'safety' | 'resource'
  severity: 'high' | 'medium' | 'low'
  title: string
  message: string
  projectId: string
  projectName: string
  createdAt: string
  status: 'active' | 'resolved' | 'dismissed'
  actionRequired: boolean
}

// 計算屬性
const filteredAlerts = computed(() => {
  let filtered = alerts.value
  
  if (selectedSeverity.value !== 'all') {
    filtered = filtered.filter(alert => alert.severity === selectedSeverity.value)
  }
  
  return filtered.filter(alert => alert.status === 'active')
})

const alertCounts = computed(() => {
  const counts = { high: 0, medium: 0, low: 0, total: 0 }
  alerts.value.forEach(alert => {
    if (alert.status === 'active') {
      counts[alert.severity]++
      counts.total++
    }
  })
  return counts
})

const criticalAlerts = computed(() => {
  return alerts.value.filter(alert => 
    alert.status === 'active' && 
    alert.severity === 'high' && 
    alert.actionRequired
  )
})

// 方法
const getAlertIcon = (type: string) => {
  const icons = {
    budget: 'fa-dollar-sign',
    schedule: 'fa-clock',
    quality: 'fa-check-circle',
    safety: 'fa-hard-hat',
    resource: 'fa-users'
  }
  return icons[type] || 'fa-exclamation-triangle'
}

const getAlertColor = (severity: string) => {
  const colors = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return colors[severity] || 'secondary'
}

const getSeverityText = (severity: string) => {
  const texts = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return texts[severity] || '未知'
}

const getTypeText = (type: string) => {
  const texts = {
    budget: '預算',
    schedule: '進度',
    quality: '品質',
    safety: '安全',
    resource: '資源'
  }
  return texts[type] || '其他'
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分鐘前`
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}小時前`
  } else {
    return `${Math.floor(diffInMinutes / 1440)}天前`
  }
}

const dismissAlert = (alertId: string) => {
  const alert = alerts.value.find(a => a.id === alertId)
  if (alert) {
    alert.status = 'dismissed'
  }
}

const resolveAlert = (alertId: string) => {
  const alert = alerts.value.find(a => a.id === alertId)
  if (alert) {
    alert.status = 'resolved'
  }
}

const loadAlerts = async () => {
  isLoading.value = true
  try {
    // 模擬載入警示數據
    await new Promise(resolve => setTimeout(resolve, 500))
    
    alerts.value = [
      {
        id: 'alert-001',
        type: 'budget',
        severity: 'high',
        title: '預算超支警告',
        message: '台北市內湖區新辦公大樓興建工程預算使用率已達95%，請注意控制成本',
        projectId: 'proj-001',
        projectName: '台北市內湖區新辦公大樓興建工程',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小時前
        status: 'active',
        actionRequired: true
      },
      {
        id: 'alert-002',
        type: 'schedule',
        severity: 'medium',
        title: '進度落後提醒',
        message: '新北市社會住宅建設案進度落後預期3天，建議檢查施工進度',
        projectId: 'proj-002',
        projectName: '新北市社會住宅建設案',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4小時前
        status: 'active',
        actionRequired: true
      },
      {
        id: 'alert-003',
        type: 'safety',
        severity: 'high',
        title: '安全檢查到期',
        message: '桃園機場第三航廈工程安全檢查即將到期，請安排相關檢查作業',
        projectId: 'proj-003',
        projectName: '桃園機場第三航廈工程',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1天前
        status: 'active',
        actionRequired: true
      },
      {
        id: 'alert-004',
        type: 'resource',
        severity: 'low',
        title: '人力配置建議',
        message: '高雄輕軌延伸線工程建議增加2名技術人員以提升效率',
        projectId: 'proj-004',
        projectName: '高雄輕軌延伸線工程',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天前
        status: 'active',
        actionRequired: false
      },
      {
        id: 'alert-005',
        type: 'quality',
        severity: 'medium',
        title: '品質檢驗異常',
        message: '台中捷運綠線延伸段混凝土強度檢測未達標準，需重新檢查',
        projectId: 'proj-005',
        projectName: '台中捷運綠線延伸段',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6小時前
        status: 'active',
        actionRequired: true
      }
    ]
  } catch (error) {
    console.error('載入警示失敗:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadAlerts()
})
</script>

<template>
  <Card class="project-alerts-widget">
    <CardHeader>
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="fa fa-exclamation-triangle me-2"></i>
          專案警示
          <span v-if="alertCounts.total > 0" class="badge bg-danger ms-2">
            {{ alertCounts.total }}
          </span>
        </h5>
        <button class="btn btn-sm btn-outline-secondary" @click="loadAlerts" :disabled="isLoading">
          <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="fa fa-refresh me-1"></i>
          重新載入
        </button>
      </div>
    </CardHeader>
    
    <CardBody>
      <!-- 警示統計 -->
      <div class="alert-summary mb-4">
        <div class="row g-2">
          <div class="col-3">
            <button 
              :class="`btn btn-sm w-100 ${selectedSeverity === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`"
              @click="selectedSeverity = 'all'"
            >
              全部 <span class="badge bg-white text-primary ms-1">{{ alertCounts.total }}</span>
            </button>
          </div>
          <div class="col-3">
            <button 
              :class="`btn btn-sm w-100 ${selectedSeverity === 'high' ? 'btn-danger' : 'btn-outline-danger'}`"
              @click="selectedSeverity = 'high'"
            >
              高 <span class="badge bg-white text-danger ms-1">{{ alertCounts.high }}</span>
            </button>
          </div>
          <div class="col-3">
            <button 
              :class="`btn btn-sm w-100 ${selectedSeverity === 'medium' ? 'btn-warning' : 'btn-outline-warning'}`"
              @click="selectedSeverity = 'medium'"
            >
              中 <span class="badge bg-white text-warning ms-1">{{ alertCounts.medium }}</span>
            </button>
          </div>
          <div class="col-3">
            <button 
              :class="`btn btn-sm w-100 ${selectedSeverity === 'low' ? 'btn-info' : 'btn-outline-info'}`"
              @click="selectedSeverity = 'low'"
            >
              低 <span class="badge bg-white text-info ms-1">{{ alertCounts.low }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 載入狀態 -->
      <div v-if="isLoading" class="text-center py-4">
        <div class="spinner-border text-theme mb-2"></div>
        <p class="text-muted mb-0">載入警示中...</p>
      </div>

      <!-- 無警示狀態 -->
      <div v-else-if="filteredAlerts.length === 0" class="text-center py-4">
        <i class="fa fa-check-circle fa-3x text-success mb-3"></i>
        <h6 class="text-muted mb-2">沒有警示</h6>
        <p class="text-muted small mb-0">
          {{ selectedSeverity === 'all' ? '目前沒有任何警示' : `沒有${getSeverityText(selectedSeverity)}等級的警示` }}
        </p>
      </div>

      <!-- 警示列表 -->
      <div v-else class="alerts-list">
        <div 
          v-for="alert in filteredAlerts" 
          :key="alert.id"
          :class="`alert alert-${getAlertColor(alert.severity)} alert-dismissible d-flex align-items-start`"
        >
          <!-- 警示圖示 -->
          <div class="alert-icon me-3">
            <i :class="`fa ${getAlertIcon(alert.type)} fa-lg`"></i>
          </div>
          
          <!-- 警示內容 -->
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="alert-heading mb-1">
                {{ alert.title }}
                <span v-if="alert.actionRequired" class="badge bg-warning text-dark ms-2">
                  <i class="fa fa-exclamation me-1"></i>需處理
                </span>
              </h6>
              <div class="alert-meta text-end">
                <span :class="`badge bg-${getAlertColor(alert.severity)} mb-1`">
                  {{ getSeverityText(alert.severity) }}
                </span>
                <br>
                <small class="text-muted">{{ getTypeText(alert.type) }}</small>
              </div>
            </div>
            
            <p class="mb-2">{{ alert.message }}</p>
            
            <div class="alert-footer d-flex justify-content-between align-items-center">
              <div class="alert-project">
                <small class="text-muted">
                  <i class="fa fa-project-diagram me-1"></i>
                  {{ alert.projectName }}
                </small>
                <br>
                <small class="text-muted">
                  <i class="fa fa-clock me-1"></i>
                  {{ formatTimeAgo(alert.createdAt) }}
                </small>
              </div>
              
              <div class="alert-actions">
                <button 
                  class="btn btn-sm btn-success me-1"
                  @click="resolveAlert(alert.id)"
                  title="標記為已解決"
                >
                  <i class="fa fa-check"></i>
                </button>
                <button 
                  class="btn btn-sm btn-secondary"
                  @click="dismissAlert(alert.id)"
                  title="忽略此警示"
                >
                  <i class="fa fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 關鍵警示摘要 -->
      <div v-if="criticalAlerts.length > 0" class="critical-alerts mt-4 pt-4 border-top">
        <h6 class="text-danger mb-3">
          <i class="fa fa-exclamation-triangle me-2"></i>
          需立即處理 ({{ criticalAlerts.length }})
        </h6>
        <div class="list-group list-group-flush">
          <div 
            v-for="alert in criticalAlerts.slice(0, 3)" 
            :key="`critical-${alert.id}`"
            class="list-group-item list-group-item-action border-start border-danger border-3"
          >
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-1">{{ alert.title }}</h6>
                <small class="text-muted">{{ alert.projectName }}</small>
              </div>
              <small class="text-danger fw-bold">{{ formatTimeAgo(alert.createdAt) }}</small>
            </div>
          </div>
        </div>
        
        <div v-if="criticalAlerts.length > 3" class="text-center mt-2">
          <small class="text-muted">還有 {{ criticalAlerts.length - 3 }} 個關鍵警示...</small>
        </div>
      </div>
    </CardBody>
  </Card>
</template>

<style scoped>
.project-alerts-widget {
  height: 100%;
}

.alert-icon {
  min-width: 24px;
  text-align: center;
}

.alert-heading {
  font-size: 1rem;
  font-weight: 600;
}

.alert-footer {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0,0,0,0.1);
}

.alert-actions .btn {
  padding: 0.25rem 0.5rem;
}

.alerts-list .alert {
  margin-bottom: 1rem;
  border-left: 4px solid;
}

.alerts-list .alert:last-child {
  margin-bottom: 0;
}

.alert-summary .btn {
  font-size: 0.8rem;
}

.critical-alerts .list-group-item {
  padding: 0.75rem 1rem;
  background: rgba(var(--bs-danger-rgb), 0.05);
}

.critical-alerts .list-group-item:hover {
  background: rgba(var(--bs-danger-rgb), 0.1);
}

@media (max-width: 768px) {
  .alert-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .alert-actions {
    align-self: flex-end;
  }
  
  .alert-summary .row {
    gap: 0.5rem;
  }
  
  .alert-summary .col-3 {
    flex: 0 0 calc(50% - 0.25rem);
  }
}
</style>
