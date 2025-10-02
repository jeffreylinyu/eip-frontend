<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useWorkspaceStore, type WorkspaceProject } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import ProjectForm from '@/components/project/ProjectForm.vue'
import toastService from '@/components/bootstrap/ToastService.js'

const workspaceStore = useWorkspaceStore()

// 狀態
const showProjectForm = ref(false)
const editingProject = ref<WorkspaceProject | null>(null)
const projectFormData = ref({
  // 工程基本資料
  project_name: '',
  contract_number: '',
  project_location: '',
  host_agency: '',
  supervision_unit: '',
  contractor_name: '',
  construction_period: '',
  project_amount: '',
  current_contract_amount: '',
  // 工程類別/屬性
  project_category: '',
  // 工期起訖日期
  sign_date: '',
  start_date: '',
  completion_date: '',
  construction_confirm_date: '',
  // 工程專案編號
  construction_project_id: '',
  // 付款方式
  payment_method: '',
  advance_payment_ratio: '',
  retention_ratio: '',
  // 驗收方式
  inspection_methods: [],
  segmented_acceptance: false,
  partial_acceptance: false,
  completion_acceptance: false,
  // 保險相關資訊
  insurance_policy_number: '',
  insurance_company: '',
  insurance_start_date: '',
  insurance_end_date: '',
  insurance_type: '',
  // 簽核層級
  signLevel: []
})
const searchQuery = ref('')
const filterWorkspace = ref<string>('all')
const filterStatus = ref<string>('all')
const isLoading = ref(false)
const openDropdownId = ref<string | null>(null)

// 計算屬性
const filteredProjects = computed(() => {
  let projects = workspaceStore.workspaceProjects

  // 工作空間過濾
  if (filterWorkspace.value !== 'all') {
    projects = projects.filter(proj => proj.workspaceId === filterWorkspace.value)
  }

  // 狀態過濾
  if (filterStatus.value !== 'all') {
    projects = projects.filter(proj => proj.status === filterStatus.value)
  }

  // 搜索過濾
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    projects = projects.filter(proj =>
      proj.name.toLowerCase().includes(query) ||
      proj.location.toLowerCase().includes(query) ||
      proj.managerName.toLowerCase().includes(query)
    )
  }

  return projects
})

const workspaceOptions = computed(() => {
  const allOption = { value: 'all', label: '全部工作空間', count: workspaceStore.workspaceProjects.length }
  const workspaceOptions = workspaceStore.workspaces.map(ws => ({
    value: ws.id,
    label: ws.name,
    count: workspaceStore.workspaceProjects.filter(proj => proj.workspaceId === ws.id).length
  }))
  return [allOption, ...workspaceOptions]
})

const statusOptions = [
  { value: 'all', label: '全部狀態', count: workspaceStore.workspaceProjects.length },
  { value: 'PLANNING', label: '規劃中', count: workspaceStore.workspaceProjects.filter(p => p.status === 'PLANNING').length },
  { value: 'IN_PROGRESS', label: '進行中', count: workspaceStore.workspaceProjects.filter(p => p.status === 'IN_PROGRESS').length },
  { value: 'COMPLETED', label: '已完成', count: workspaceStore.workspaceProjects.filter(p => p.status === 'COMPLETED').length },
  { value: 'SUSPENDED', label: '暫停', count: workspaceStore.workspaceProjects.filter(p => p.status === 'SUSPENDED').length }
]

// 方法
const openAddProject = () => {
  editingProject.value = null
  // 重置表單數據
  projectFormData.value = {
    // 工程基本資料
    project_name: '',
    contract_number: '',
    project_location: '',
    host_agency: '',
    supervision_unit: '',
    contractor_name: '',
    construction_period: '',
    project_amount: '',
    current_contract_amount: '',
    // 工程類別/屬性
    project_category: '',
    // 工期起訖日期
    sign_date: '',
    start_date: '',
    completion_date: '',
    construction_confirm_date: '',
    // 工程專案編號
    construction_project_id: '',
    // 付款方式
    payment_method: '',
    advance_payment_ratio: '',
    retention_ratio: '',
    // 驗收方式
    inspection_methods: [],
    segmented_acceptance: false,
    partial_acceptance: false,
    completion_acceptance: false,
    // 保險相關資訊
    insurance_policy_number: '',
    insurance_company: '',
    insurance_start_date: '',
    insurance_end_date: '',
    insurance_type: '',
    // 簽核層級
    signLevel: []
  }
  showProjectForm.value = true
}

const openEditProject = (project: WorkspaceProject) => {
  editingProject.value = project
  // 將 WorkspaceProject 數據轉換為 ProjectForm 格式
  projectFormData.value = {
    // 工程基本資料
    project_name: project.name || '',
    contract_number: project.contractNumber || '',
    project_location: project.location || '',
    host_agency: project.hostAgency || '',
    supervision_unit: project.supervisionUnit || '',
    contractor_name: project.managerName || '',
    construction_period: project.constructionPeriod || '',
    project_amount: project.budget || '',
    current_contract_amount: project.currentContractAmount || '',
    // 工程類別/屬性
    project_category: project.projectCategory || '',
    // 工期起訖日期
    sign_date: project.signDate ? project.signDate.split('T')[0] : '',
    start_date: project.startDate ? project.startDate.split('T')[0] : '',
    completion_date: project.endDate ? project.endDate.split('T')[0] : '',
    construction_confirm_date: project.constructionConfirmDate ? project.constructionConfirmDate.split('T')[0] : '',
    // 工程專案編號
    construction_project_id: project.constructionProjectId || '',
    // 付款方式
    payment_method: project.paymentMethod || '',
    advance_payment_ratio: project.advancePaymentRatio || '',
    retention_ratio: project.retentionRatio || '',
    // 驗收方式
    inspection_methods: project.inspectionMethods || [],
    segmented_acceptance: project.segmentedAcceptance || false,
    partial_acceptance: project.partialAcceptance || false,
    completion_acceptance: project.completionAcceptance || false,
    // 保險相關資訊
    insurance_policy_number: project.insurancePolicyNumber || '',
    insurance_company: project.insuranceCompany || '',
    insurance_start_date: project.insuranceStartDate ? project.insuranceStartDate.split('T')[0] : '',
    insurance_end_date: project.insuranceEndDate ? project.insuranceEndDate.split('T')[0] : '',
    insurance_type: project.insuranceType || '',
    // 簽核層級
    signLevel: project.signLevel || []
  }
  showProjectForm.value = true
}

const closeProjectForm = () => {
  showProjectForm.value = false
  editingProject.value = null
}

const confirmDeleteProject = (project: WorkspaceProject) => {
  const workspace = workspaceStore.workspaces.find(ws => ws.id === project.workspaceId)
  if (!workspace || (workspace.role !== 'OWNER' && workspace.role !== 'ADMIN')) {
    toastService.error('您沒有權限刪除此工程項目')
    return
  }

  if (confirm(`確定要刪除工程項目 "${project.name}" 嗎？\n這個操作將無法復原。`)) {
    deleteProject(project)
  }
}

const deleteProject = async (project: WorkspaceProject) => {
  isLoading.value = true
  try {
    // 模擬API調用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 使用store方法移除
    workspaceStore.removeProject(project.id)
    toastService.success('工程項目刪除成功')
  } catch (error) {
    console.error('Delete project error:', error)
    toastService.error('刪除工程項目失敗')
  } finally {
    isLoading.value = false
  }
}



const toggleDropdown = (projectId: string) => {
  openDropdownId.value = openDropdownId.value === projectId ? null : projectId
}

const closeDropdown = () => {
  openDropdownId.value = null
}

const getStatusColor = (status: string) => {
  const colors = {
    'PLANNING': 'border-info text-info',
    'IN_PROGRESS': 'border-success text-success',
    'COMPLETED': 'border-primary text-primary',
    'SUSPENDED': 'border-danger text-danger'
  }
  return colors[status] || 'border-secondary text-secondary'
}

const getStatusText = (status: string) => {
  const texts = {
    'PLANNING': '規劃中',
    'IN_PROGRESS': '進行中',
    'COMPLETED': '已完成',
    'SUSPENDED': '暫停'
  }
  return texts[status] || status
}

const getWorkspaceName = (workspaceId: string) => {
  const workspace = workspaceStore.workspaces.find(ws => ws.id === workspaceId)
  return workspace?.name || '未知工作空間'
}

const canEditProject = (project: WorkspaceProject) => {
  const workspace = workspaceStore.workspaces.find(ws => ws.id === project.workspaceId)
  return workspace && (workspace.role === 'OWNER' || workspace.role === 'ADMIN' || workspace.role === 'MEMBER')
}

const canDeleteProject = (project: WorkspaceProject) => {
  const workspace = workspaceStore.workspaces.find(ws => ws.id === project.workspaceId)
  return workspace && (workspace.role === 'OWNER' || workspace.role === 'ADMIN')
}

const onProjectFormSubmit = async (formData: any) => {
  isLoading.value = true
  try {
    // 將 ProjectForm 的數據轉換為 WorkspaceProject 格式
    const projectData = {
      name: formData.project_name,
      workspaceId: workspaceStore.currentWorkspace?.id || workspaceStore.workspaces[0]?.id || '',
      location: formData.project_location,
      budget: formData.project_amount,
      status: 'PLANNING' as const,
      startDate: '',
      endDate: '',
      managerName: formData.contractor_name, // 使用承包商名稱作為負責人
      description: `契約編號：${formData.contract_number}\n主辦機關：${formData.host_agency}\n監造單位：${formData.supervision_unit}\n承包商：${formData.contractor_name}\n工程等級：${formData.project_grade}\n工期：${formData.construction_period}天`,
      progress: 0
    }

    if (editingProject.value) {
      // 編輯工程項目
      workspaceStore.updateProject(editingProject.value.id, projectData)
      toastService.success('工程項目更新成功')
    } else {
      // 新增工程項目
      const newProject: WorkspaceProject = {
        id: `proj-${Date.now()}`,
        ...projectData
      }
      workspaceStore.addProject(newProject)
      toastService.success('工程項目創建成功')
    }
    closeProjectForm()
  } catch (error) {
    console.error('Project form submit error:', error)
    toastService.error(editingProject.value ? '更新工程項目失敗' : '創建工程項目失敗')
  } finally {
    isLoading.value = false
  }
}

// 全局點擊監聽器 - 關閉dropdown
const handleGlobalClick = (event: Event) => {
  const target = event.target as Element
  if (!target.closest('.dropdown')) {
    closeDropdown()
  }
}

// 生命週期
onMounted(() => {
  if (workspaceStore.workspaceProjects.length === 0) {
    workspaceStore.initWorkspaces()
  }
  document.addEventListener('click', handleGlobalClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick)
})
</script>

<template>
  <div class="p-4">
    <!-- 操作欄 -->
    <div class="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
      <div class="d-flex flex-column flex-md-row gap-3 flex-grow-1">
        <!-- 搜索 -->
        <div class="input-group" style="max-width: 300px;">
          <span class="input-group-text">
            <i class="fa fa-search"></i>
          </span>
          <input 
            type="text" 
            class="form-control" 
            placeholder="搜索項目..."
            v-model="searchQuery"
          />
        </div>
        
        <!-- 工作空間過濾 -->
        <select class="form-select" style="max-width: 200px;" v-model="filterWorkspace">
          <option v-for="option in workspaceOptions" :key="option.value" :value="option.value">
            {{ option.label }} ({{ option.count }})
          </option>
        </select>

        <!-- 狀態過濾 -->
        <select class="form-select" style="max-width: 160px;" v-model="filterStatus">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }} ({{ option.count }})
          </option>
        </select>
      </div>
      
      <!-- 新增按鈕 -->
      <button 
        class="btn btn-theme" 
        @click="openAddProject"
        :disabled="isLoading"
      >
        <i class="fa fa-plus me-2"></i>
        新增工程項目
      </button>
    </div>

    <!-- 結果統計 -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <span class="text-muted">
        顯示 {{ filteredProjects.length }} 個項目，共 {{ workspaceStore.workspaceProjects.length }} 個
      </span>
    </div>

    <!-- 項目列表 -->
    <div class="row g-4" v-if="!isLoading">
      <div class="col-xl-6 col-lg-12" v-for="project in filteredProjects" :key="project.id">
        <card 
          class="project-management-card h-100"
        >
          <card-header class="pb-3">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <h6 class="fw-bold mb-1">{{ project.name }}</h6>
                <p class="text-muted small mb-2">
                  <i class="fa fa-map-marker-alt me-1"></i>
                  {{ project.location }}
                </p>
                <div class="d-flex gap-2 align-items-center">
                  <span :class="`badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ${getStatusColor(project.status)}`">
                    {{ getStatusText(project.status) }}
                  </span>
                  <span class="badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">
                    {{ getWorkspaceName(project.workspaceId) }}
                  </span>
                </div>
              </div>
              
                             <!-- 操作按鈕 -->
               <div class="dropdown position-relative">
                 <button 
                   class="btn btn-link text-muted p-1" 
                   @click="toggleDropdown(project.id)"
                 >
                   <i class="fa fa-ellipsis-v"></i>
                 </button>
                 <ul 
                   v-show="openDropdownId === project.id"
                   class="dropdown-menu dropdown-menu-end show position-absolute"
                   style="z-index: 1000;"
                 >
                   
                   <li v-if="canEditProject(project)">
                     <button class="dropdown-item" @click="openEditProject(project); closeDropdown()">
                       <i class="fa fa-edit me-2"></i>
                       編輯
                     </button>
                   </li>
                   <li v-if="canDeleteProject(project)">
                     <hr class="dropdown-divider">
                   </li>
                   <li v-if="canDeleteProject(project)">
                     <button 
                       class="dropdown-item text-danger" 
                       @click="confirmDeleteProject(project); closeDropdown()"
                     >
                       <i class="fa fa-trash me-2"></i>
                       刪除
                     </button>
                   </li>
                 </ul>
               </div>
            </div>
          </card-header>
          
          <card-body>
            <div class="row g-2 mb-3">
              <div class="col-6">
                <div class="d-flex align-items-center">
                  <i class="fa fa-dollar-sign text-muted me-2 fs-14px"></i>
                  <span class="small">{{ project.budget }}</span>
                </div>
              </div>
              <div class="col-6">
                <div class="d-flex align-items-center">
                  <i class="fa fa-user-tie text-muted me-2 fs-14px"></i>
                  <span class="small">{{ project.managerName }}</span>
                </div>
              </div>
              <div class="col-12">
                <div class="d-flex align-items-center">
                  <i class="fa fa-calendar-range text-muted me-2 fs-14px"></i>
                  <span class="small">{{ project.startDate }} ~ {{ project.endDate }}</span>
                </div>
              </div>
            </div>

            <!-- 進度條 -->
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="small text-muted">進度</span>
                <span class="small fw-bold">{{ project.progress }}%</span>
              </div>
              <div class="progress" style="height: 6px;">
                <div 
                  class="progress-bar bg-theme"
                  :style="{ width: project.progress + '%' }"
                ></div>
              </div>
            </div>

            <!-- 項目描述 -->
            <div class="mb-3">
              <p class="small text-muted mb-0">{{ project.description }}</p>
            </div>
            
            <!-- 快捷操作 -->
            <div v-if="canEditProject(project)" class="pt-3 border-top d-flex gap-2">
              <button 
                class="btn btn-sm btn-outline-theme flex-grow-1"
                @click="openEditProject(project)"
              >
                <i class="fa fa-edit me-1"></i>
                編輯工程項目
              </button>
            </div>
          </card-body>
        </card>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-theme" role="status">
        <span class="visually-hidden">載入中...</span>
      </div>
      <div class="mt-3 text-muted">處理中...</div>
    </div>

    <!-- 無結果 -->
    <div v-if="!isLoading && filteredProjects.length === 0" class="text-center py-5">
      <i class="fa fa-search fa-3x text-muted mb-3"></i>
      <h5 class="text-muted">找不到相關工程項目</h5>
      <p class="text-muted">請嘗試調整搜索條件或創建新的工程項目</p>
      <button class="btn btn-outline-theme" @click="openAddProject">
        <i class="fa fa-plus me-2"></i>
        創建工程項目
      </button>
    </div>
  </div>

  <!-- 項目表單Modal -->
  <Modal
    v-model:show="showProjectForm"
    :title="editingProject ? '編輯工程項目' : '新增工程項目'"
    icon="fa fa-project-diagram"
    size="xl"
    modal-id="projectFormModal"
    :confirm-text="editingProject ? '更新' : '創建'"
    confirm-icon="fa fa-save"
    :is-loading="isLoading"
    loading-text="處理中..."
    @hide="closeProjectForm"
    @confirm="() => onProjectFormSubmit(projectFormData)"
  >
    <template #body>
      <ProjectForm 
        v-model="projectFormData"
        :mode="editingProject ? 'edit' : 'create'"
        :is-submitting="isLoading"
        :show-submit-button="false"
        :show-reset-button="false"
        @submit="onProjectFormSubmit"
        @reset="closeProjectForm"
      />
    </template>
  </Modal>
</template>

<style scoped>
.project-management-card {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.project-management-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}



.progress {
  background-color: rgba(var(--bs-theme-rgb), 0.1);
}

.fs-14px {
  font-size: 14px;
}

@media (max-width: 768px) {
  .project-management-card {
    margin-bottom: 1rem;
  }
  
  .d-flex.gap-3 {
    flex-direction: column;
  }
}
</style> 