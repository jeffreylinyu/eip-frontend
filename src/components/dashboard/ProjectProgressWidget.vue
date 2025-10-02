<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'

const workspaceStore = useWorkspaceStore()

// Props
const props = defineProps<{
  projectId?: string
  showDetails?: boolean
}>()

// 狀態
const selectedTimeRange = ref('7d') // 7d, 30d, 90d
const isLoading = ref(false)

// 計算屬性
const currentProject = computed(() => {
  if (props.projectId) {
    return workspaceStore.workspaceProjects.find(p => p.id === props.projectId)
  }
  return workspaceStore.currentProject
})

const progressData = computed(() => {
  if (!currentProject.value) return null
  
  const project = currentProject.value
  const totalBudget = parseFloat(project.budget) || 0
  const usedBudget = totalBudget * (project.progress / 100)
  
  return {
    name: project.name,
    totalBudget,
    usedBudget,
    remainingBudget: totalBudget - usedBudget,
    progress: project.progress,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    location: project.location
  }
})

const progressStatus = computed(() => {
  if (!progressData.value) return null
  
  const { progress } = progressData.value
  const today = new Date()
  const startDate = new Date(progressData.value.startDate)
  const endDate = new Date(progressData.value.endDate)
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const passedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const expectedProgress = Math.max(0, Math.min(100, (passedDays / totalDays) * 100))
  
  const variance = progress - expectedProgress
  
  return {
    expectedProgress: Math.round(expectedProgress),
    actualProgress: progress,
    variance: Math.round(variance),
    status: variance > 5 ? 'ahead' : variance < -5 ? 'behind' : 'ontrack'
  }
})

const getStatusColor = (status: string) => {
  const colors = {
    ahead: 'success',
    ontrack: 'info',
    behind: 'danger'
  }
  return colors[status] || 'secondary'
}

const getStatusText = (status: string) => {
  const texts = {
    ahead: '超前',
    ontrack: '正常',
    behind: '落後'
  }
  return texts[status] || '未知'
}

const getStatusIcon = (status: string) => {
  const icons = {
    ahead: 'fa-arrow-up',
    ontrack: 'fa-check',
    behind: 'fa-arrow-down'
  }
  return icons[status] || 'fa-question'
}

// 方法
const changeTimeRange = (range: string) => {
  selectedTimeRange.value = range
  // 這裡可以重新載入數據
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`
}

onMounted(() => {
  // 組件載入時的初始化
})
</script>

<template>
  <Card v-if="progressData" class="project-progress-widget">
    <CardHeader>
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="fa fa-chart-line me-2"></i>
          專案進度監控
        </h5>
        <div class="btn-group btn-group-sm">
          <button 
            v-for="range in [
              { value: '7d', label: '7天' },
              { value: '30d', label: '30天' },
              { value: '90d', label: '90天' }
            ]"
            :key="range.value"
            :class="`btn ${selectedTimeRange === range.value ? 'btn-theme' : 'btn-outline-secondary'}`"
            @click="changeTimeRange(range.value)"
          >
            {{ range.label }}
          </button>
        </div>
      </div>
    </CardHeader>
    
    <CardBody>
      <!-- 專案基本資訊 -->
      <div class="project-info mb-4">
        <h6 class="text-truncate mb-2" :title="progressData.name">
          {{ progressData.name }}
        </h6>
        <div class="row g-2 text-muted small">
          <div class="col-md-6">
            <i class="fa fa-map-marker-alt me-1"></i>
            {{ progressData.location }}
          </div>
          <div class="col-md-6">
            <i class="fa fa-calendar me-1"></i>
            {{ progressData.startDate }} ~ {{ progressData.endDate }}
          </div>
        </div>
      </div>

      <!-- 進度狀態指示器 -->
      <div v-if="progressStatus" class="progress-status mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-semibold">進度狀態</span>
          <span 
            :class="`badge bg-${getStatusColor(progressStatus.status)} d-flex align-items-center`"
          >
            <i :class="`fa ${getStatusIcon(progressStatus.status)} me-1`"></i>
            {{ getStatusText(progressStatus.status) }}
          </span>
        </div>
        
        <div class="progress-comparison">
          <div class="row g-3">
            <div class="col-4">
              <div class="text-center">
                <div class="h4 mb-1 text-info">{{ progressStatus.expectedProgress }}%</div>
                <small class="text-muted">預期進度</small>
              </div>
            </div>
            <div class="col-4">
              <div class="text-center">
                <div class="h4 mb-1 text-primary">{{ progressStatus.actualProgress }}%</div>
                <small class="text-muted">實際進度</small>
              </div>
            </div>
            <div class="col-4">
              <div class="text-center">
                <div 
                  :class="`h4 mb-1 text-${getStatusColor(progressStatus.status)}`"
                >
                  {{ progressStatus.variance > 0 ? '+' : '' }}{{ progressStatus.variance }}%
                </div>
                <small class="text-muted">差異</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 進度條 -->
      <div class="progress-bar-section mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-semibold">完成進度</span>
          <span class="text-primary fw-bold">{{ progressData.progress }}%</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div 
            class="progress-bar bg-primary"
            :style="{ width: progressData.progress + '%' }"
          ></div>
        </div>
        <div v-if="progressStatus" class="progress-indicators mt-1">
          <div 
            class="expected-progress-indicator"
            :style="{ left: progressStatus.expectedProgress + '%' }"
            :title="`預期進度: ${progressStatus.expectedProgress}%`"
          ></div>
        </div>
      </div>

      <!-- 預算使用情況 -->
      <div class="budget-section">
        <h6 class="fw-semibold mb-3">預算使用情況</h6>
        <div class="row g-3">
          <div class="col-md-4">
            <div class="budget-item">
              <div class="budget-amount text-primary">
                {{ formatCurrency(progressData.totalBudget) }}
              </div>
              <small class="text-muted">總預算</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="budget-item">
              <div class="budget-amount text-warning">
                {{ formatCurrency(progressData.usedBudget) }}
              </div>
              <small class="text-muted">已使用</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="budget-item">
              <div class="budget-amount text-success">
                {{ formatCurrency(progressData.remainingBudget) }}
              </div>
              <small class="text-muted">剩餘</small>
            </div>
          </div>
        </div>
        
        <!-- 預算使用率進度條 -->
        <div class="budget-progress mt-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="small text-muted">預算使用率</span>
            <span class="small fw-bold">{{ formatPercentage(progressData.progress) }}</span>
          </div>
          <div class="progress" style="height: 6px;">
            <div 
              :class="`progress-bar ${progressData.progress > 90 ? 'bg-danger' : progressData.progress > 75 ? 'bg-warning' : 'bg-success'}`"
              :style="{ width: progressData.progress + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 詳細資訊展開 -->
      <div v-if="showDetails" class="details-section mt-4 pt-4 border-top">
        <div class="row g-3 text-sm">
          <div class="col-md-6">
            <strong>合約編號：</strong>N/A
          </div>
          <div class="col-md-6">
            <strong>主辦機關：</strong>N/A
          </div>
          <div class="col-md-6">
            <strong>工程等級：</strong>N/A
          </div>
          <div class="col-md-6">
            <strong>工程類別：</strong>N/A
          </div>
        </div>
      </div>
    </CardBody>
  </Card>
  
  <!-- 沒有專案時的提示 -->
  <Card v-else class="project-progress-widget">
    <CardBody class="text-center py-5">
      <i class="fa fa-project-diagram fa-3x text-muted mb-3"></i>
      <h5 class="text-muted mb-2">未選擇專案</h5>
      <p class="text-muted mb-0">請先選擇一個專案來查看進度資訊</p>
    </CardBody>
  </Card>
</template>

<style scoped>
.project-progress-widget {
  height: 100%;
}

.budget-item {
  text-align: center;
  padding: 1rem;
  background: var(--bs-light);
  border-radius: 0.5rem;
}

.budget-amount {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.progress-indicators {
  position: relative;
  height: 4px;
}

.expected-progress-indicator {
  position: absolute;
  top: -2px;
  width: 2px;
  height: 8px;
  background-color: var(--bs-danger);
  border-radius: 1px;
  transform: translateX(-50%);
}

.expected-progress-indicator::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -2px;
  width: 6px;
  height: 6px;
  background-color: var(--bs-danger);
  border-radius: 50%;
}

.progress-comparison {
  background: var(--bs-light);
  border-radius: 0.5rem;
  padding: 1rem;
}

.text-sm {
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .budget-item {
    margin-bottom: 1rem;
  }
  
  .progress-comparison .col-4 {
    margin-bottom: 1rem;
  }
}
</style>
