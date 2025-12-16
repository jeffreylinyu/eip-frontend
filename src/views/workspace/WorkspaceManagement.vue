<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { useWorkspaceStore, type Workspace, type WorkspaceProject } from '@/stores/workspace'
import { formatAmount } from '@/utils/format'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import WorkspaceManagementTab from '@/components/workspace/WorkspaceManagementTab.vue'
import ProjectManagementTab from '@/components/workspace/ProjectManagementTab.vue'
import WorkspaceFormModal from '@/components/workspace/WorkspaceFormModal.vue'
import ProjectFormModal from '@/components/workspace/ProjectFormModal.vue'
import WorkspaceCompanyManagement from '@/components/workspace/WorkspaceCompanyManagement.vue'

const workspaceStore = useWorkspaceStore()

// 獲取當前實例以訪問 $toast
const { proxy } = getCurrentInstance() as any

// 狀態
const expandedWorkspaces = ref<Set<string>>(new Set())
const isLoading = ref(false)
const switchingWorkspace = ref(false)
const switchingWorkspaceId = ref<string | null>(null)

// 編輯模態框狀態
const showWorkspaceModal = ref(false)
const showProjectModal = ref(false)
const editingWorkspace = ref<Workspace | null>(null)
const editingProject = ref<WorkspaceProject | null>(null)

// 公司管理狀態
const showCompanyManagement = ref(false)
const managingWorkspace = ref<Workspace | null>(null)

// 計算屬性 - 使用真實資料
const workspacesWithProjects = computed(() => {
  return workspaceStore.workspaces.map(workspace => {
    // 從本地狀態獲取該工作空間的工程案
    const projects = workspaceStore.workspaceProjects.filter(p => p.workspaceId === workspace.id)
    
    // 計算項目統計
    const activeProjectCount = projects.filter(p => p.status === 'IN_PROGRESS').length
    const completedProjectCount = projects.filter(p => p.status === 'COMPLETED').length
    
    return {
      ...workspace,
      projects,
      projectCount: projects.length,
      activeProjectCount,
      completedProjectCount
    }
  })
})

// 方法
const toggleWorkspace = async (workspaceId: string) => {
  // 如果點擊的是已選中的工作空間，則不做任何操作（單選模式）
  if (expandedWorkspaces.value.has(workspaceId)) {
    return
  }
  
  // 立即更新 UI 狀態
  expandedWorkspaces.value.clear()
  expandedWorkspaces.value.add(workspaceId)
  
  // 檢查是否已經有該工作空間的工程案資料
  const workspace = workspacesWithProjects.value.find(ws => ws.id === workspaceId)
  if (workspace && workspace.projects && workspace.projects.length > 0) {
    // 如果已經有資料，不需要重新載入
    return
  }
  
  // 設置載入狀態（只在需要載入時）
  switchingWorkspace.value = true
  switchingWorkspaceId.value = workspaceId
  
  // 在背景載入工程案
  try {
    await workspaceStore.getProjectsByWorkspace(workspaceId)
  } catch (error) {
  } finally {
    // 載入完成後清除載入狀態
    switchingWorkspace.value = false
    switchingWorkspaceId.value = null
  }
}

const isWorkspaceExpanded = (workspaceId: string) => {
  return expandedWorkspaces.value.has(workspaceId)
}

// 權限檢查
const canManageWorkspace = (workspace: any) => {
  return workspace.role === 'OWNER' || workspace.role === 'ADMIN'
}

const canEditProject = (workspace: any) => {
  return workspace.role !== 'VIEWER'
}

// 工作空間操作
const addWorkspace = () => {
  editingWorkspace.value = null
  showWorkspaceModal.value = true
}

const editWorkspace = (workspace: any, event: Event) => {
  event.stopPropagation()
  editingWorkspace.value = { ...workspace }
  showWorkspaceModal.value = true
}

const closeWorkspaceModal = () => {
  showWorkspaceModal.value = false
  editingWorkspace.value = null
}

const saveWorkspace = async (workspaceData: any) => {
  try {
    if (editingWorkspace.value) {
      // 更新工作空間
      await workspaceStore.updateWorkspace(editingWorkspace.value.id, workspaceData)
    } else {
      // 新增工作空間
      await workspaceStore.addWorkspace(workspaceData)
    }
    closeWorkspaceModal()
    // 重新載入資料
    await refreshData()
  } catch (error) {
    console.error('保存工作空間失敗:', error)
    alert('保存工作空間失敗，請稍後再試')
  }
}

const deleteWorkspace = async (workspace: any, event: Event) => {
  event.stopPropagation()
  const confirmed = window.confirm(`確定要刪除工作空間「${workspace.name}」嗎？此操作無法撤銷。`)
  if (confirmed) {
    try {
      await workspaceStore.removeWorkspace(workspace.id)
      // 重新載入資料
      await refreshData()
    } catch (error) {
      console.error('刪除工作空間失敗:', error)
      alert('刪除工作空間失敗，請稍後再試')
    }
  }
}

// 項目操作
const editProject = (project: any, event: Event) => {
  event.stopPropagation()
  editingProject.value = { ...project }
  showProjectModal.value = true
}

const closeProjectModal = () => {
  showProjectModal.value = false
  editingProject.value = null
}

const saveProject = async (projectData: any) => {
  try {
    if (editingProject.value) {
      // 更新項目
      workspaceStore.updateProject(editingProject.value.id, projectData)
    } else {
      // 新增工程案
      workspaceStore.addProject(projectData)
    }
    closeProjectModal()
    // 重新載入資料
    await refreshData()
  } catch (error) {
    console.error('保存項目失敗:', error)
    alert('保存項目失敗，請稍後再試')
  }
}

const deleteProject = async (project: any, event: Event) => {
  event.stopPropagation()
  const confirmed = window.confirm(`確定要刪除工程案「${project.name}」嗎？此操作無法撤銷。`)
  if (confirmed) {
    try {
      workspaceStore.removeProject(project.id)
      // 重新載入資料
      await refreshData()
    } catch (error) {
      console.error('刪除工程案失敗:', error)
      alert('刪除工程案失敗，請稍後再試')
    }
  }
}

const setCurrentProject = (project: any, event: Event) => {
  event.stopPropagation()
  try {
    workspaceStore.setCurrentProject(project)
    proxy.$toast.success(`已切換至工程案：${project.name}`)
  } catch (error) {
    console.error('設定目前項目失敗:', error)
    proxy.$toast.error('切換工程案失敗')
  }
}

const addProject = (workspace: any, event: Event) => {
  event.stopPropagation()
  // 設定新增工程案模式，並設定工作空間 ID
  editingProject.value = null
  showProjectModal.value = true
}

// 公司管理方法
const manageWorkspaceCompanies = (workspace: any, event: Event) => {
  event.stopPropagation()
  managingWorkspace.value = workspace
  showCompanyManagement.value = true
}

const backToWorkspaceList = () => {
  showCompanyManagement.value = false
  managingWorkspace.value = null
}

const refreshData = async () => {
  isLoading.value = true
  try {
    // 清除緩存，強制重新載入
    workspaceStore.clearAllCache()
    workspaceStore.isInitialized = false
    await workspaceStore.initWorkspaces()
    
    // 如果有當前選取的工作空間，重新載入其專案
    if (workspaceStore.currentWorkspace) {
      const currentWorkspaceId = workspaceStore.currentWorkspace.id
      expandedWorkspaces.value.clear()
      expandedWorkspaces.value.add(currentWorkspaceId)
      await workspaceStore.getProjectsByWorkspace(currentWorkspaceId)
    }
  } catch (error) {
    console.error('Failed to refresh data:', error)
  } finally {
    isLoading.value = false
  }
}

// 項目狀態輔助函數
const getProjectStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    'PLANNING': 'info',
    'IN_PROGRESS': 'success',
    'COMPLETED': 'primary',
    'SUSPENDED': 'warning'
  }
  return statusMap[status] || 'secondary'
}

const getProjectStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    'PLANNING': '規劃中',
    'IN_PROGRESS': '進行中',
    'COMPLETED': '已完成',
    'SUSPENDED': '暫停'
  }
  return statusMap[status] || status
}

// 統計計算屬性
const totalWorkspaces = computed(() => workspacesWithProjects.value.length)
const ownedWorkspaces = computed(() => workspacesWithProjects.value.filter(ws => ws.role === 'OWNER').length)
const managedWorkspaces = computed(() => workspacesWithProjects.value.filter(ws => ws.role === 'ADMIN').length)

const totalProjects = computed(() => {
  return workspacesWithProjects.value.reduce((total, workspace) => {
    return total + (workspace.projects?.length || 0)
  }, 0)
})

const activeProjects = computed(() => {
  return workspacesWithProjects.value.reduce((total, workspace) => {
    return total + (workspace.projects?.filter(p => p.status === 'IN_PROGRESS').length || 0)
  }, 0)
})

const completedProjects = computed(() => {
  return workspacesWithProjects.value.reduce((total, workspace) => {
    return total + (workspace.projects?.filter(p => p.status === 'COMPLETED').length || 0)
  }, 0)
})

// 生命週期
onMounted(async () => {
  // 載入工作空間列表
  await workspaceStore.initWorkspaces()
  
  // 檢查是否有當前選取的工作空間，如果有則展開並載入其專案
  if (workspaceStore.currentWorkspace) {
    const currentWorkspaceId = workspaceStore.currentWorkspace.id
    expandedWorkspaces.value.clear()
    expandedWorkspaces.value.add(currentWorkspaceId)
    
    // 載入當前工作空間的專案
    try {
      await workspaceStore.getProjectsByWorkspace(currentWorkspaceId)
    } catch (error) {
      console.error('載入工作空間專案失敗:', error)
    }
  }
})
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        
        <!-- 頁面標題 -->
        <div class="mb-3">
          <PageHeader
            title="工作空間管理"
            icon="fa fa-sitemap"
            :breadcrumbs="[
              { text: '工作空間管理', active: true }
            ]"
            :actions="[]"
          />
        </div>

        <!-- 載入狀態 -->
        <div v-if="workspaceStore.isLoading" class="text-center py-4">
          <div class="spinner-border text-theme" role="status">
            <span class="visually-hidden">載入中...</span>
          </div>
          <div class="mt-2 text-muted">載入工作空間資料中...</div>
        </div>

        <!-- 空狀態 -->
        <div v-else-if="workspacesWithProjects.length === 0" class="text-center py-5">
          <div class="mb-3">
            <i class="fa fa-building fa-3x text-muted"></i>
          </div>
          <h5 class="text-muted mb-2">尚未建立任何工作空間</h5>
          <p class="text-muted mb-3">開始建立您的第一個工作空間</p>
          <button class="btn btn-theme" @click="addWorkspace">
            <i class="fa fa-plus me-2"></i>
            新增工作空間
          </button>
        </div>



        <!-- 公司管理界面 -->
        <div v-if="showCompanyManagement">
          <WorkspaceCompanyManagement 
            :workspace="managingWorkspace"
            @back="backToWorkspaceList"
          />
        </div>

        <!-- 左右分欄式階層管理 -->
        <div v-else-if="!workspaceStore.isLoading && workspacesWithProjects.length > 0" class="workspace-split-layout">
          <!-- 共同的標題行 -->
          <div class="workspace-common-header">
            <div class="row g-0">
              <div class="col-md-4">
                <div class="workspace-list-header">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-0">
                        <i class="fa fa-sitemap me-2"></i>
                        工作空間列表
                      </h6>
                    </div>
                    <button 
                      class="btn btn-theme"
                      @click="addWorkspace"
                      title="新增工作空間"
                    >
                      <i class="fa fa-plus me-1"></i>
                      新增工作空間
                    </button>
                  </div>
                </div>
              </div>
              <div class="col-md-8">
                <div class="workspace-projects-header" v-if="expandedWorkspaces.size > 0">
                  <div class="workspace-projects-title">
                    <h5 class="mb-0">
                      <i class="fa fa-folder-open me-2"></i>
                      {{ workspacesWithProjects.find(ws => isWorkspaceExpanded(ws.id))?.name }}
                    </h5>
                  </div>
                  
                  <div class="workspace-projects-actions">
                    <button 
                      v-if="canEditProject(workspacesWithProjects.find(ws => isWorkspaceExpanded(ws.id)))"
                      class="btn btn-theme me-2"
                      @click="addProject(workspacesWithProjects.find(ws => isWorkspaceExpanded(ws.id)), $event)"
                    >
                      <i class="fa fa-plus me-1"></i>
                      新增項目
                    </button>
                    
                    <button 
                      class="btn btn-warning d-flex align-items-center"
                      @click="manageWorkspaceCompanies(workspacesWithProjects.find(ws => isWorkspaceExpanded(ws.id)), $event)"
                      title="管理公司成員與權限"
                    >
                      <i class="fa fa-building me-1"></i>
                      公司管理
                      <i class="fa fa-star ms-1" style="font-size: 0.7rem;"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="row g-0 h-100">
            <!-- 左側：工作空間列表 -->
            <div class="col-md-4 workspace-sidebar">
              <div class="workspace-list-container">
                <div class="workspace-list-scroll">
                  <div 
                    v-for="workspace in workspacesWithProjects" 
                    :key="workspace.id"
                    class="workspace-item-compact"
                    :class="{ 
                      'active': isWorkspaceExpanded(workspace.id),
                      'loading': switchingWorkspaceId === workspace.id
                    }"
                    @click="toggleWorkspace(workspace.id)"
                  >
                    <div class="workspace-item-content">
                      <!-- 載入狀態覆蓋層 -->
                      <div v-if="switchingWorkspaceId === workspace.id" class="workspace-loading-overlay">
                        <div class="workspace-loading-content">
                          <div class="spinner-border spinner-border-sm text-theme me-2" role="status">
                            <span class="visually-hidden">載入中...</span>
                          </div>
                          <span class="loading-text">載入工程案中...</span>
                        </div>
                      </div>
                      
                      <div class="workspace-item-header">
                        <h6 class="workspace-name-compact">{{ workspace.name }}</h6>
                        <div class="workspace-item-actions" v-if="canManageWorkspace(workspace)" @click.stop>
                          <button 
                            class="btn btn-sm btn-outline-warning me-1"
                            @click="manageWorkspaceCompanies(workspace, $event)"
                            title="管理公司成員與權限"
                            :disabled="switchingWorkspace"
                          >
                            <i class="fa fa-building"></i>
                          </button>
                          <button 
                            class="btn btn-sm btn-outline-primary me-1"
                            @click="editWorkspace(workspace, $event)"
                            title="編輯工作空間"
                            :disabled="switchingWorkspace"
                          >
                            <i class="fa fa-edit"></i>
                          </button>
                          <button 
                            class="btn btn-sm btn-outline-danger"
                            @click="deleteWorkspace(workspace, $event)"
                            title="刪除工作空間"
                            :disabled="switchingWorkspace"
                          >
                            <i class="fa fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      
                      <p class="workspace-description-compact text-muted mb-2">
                        {{ workspace.description }}
                      </p>
                      
                      <div class="workspace-stats">
                        <span class="stat-item">
                          <i class="fa fa-project-diagram text-primary"></i>
                          {{ workspace.projectCount }}
                        </span>
                        <span class="stat-item">
                          <i class="fa fa-play text-success"></i>
                          {{ workspace.activeProjectCount }}
                        </span>
                        <span class="stat-item">
                          <i class="fa fa-check text-info"></i>
                          {{ workspace.completedProjectCount }}
                        </span>
                      </div>
                      
                      <div class="workspace-role">
                        <span class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">
                          <i class="fa fa-crown me-1"></i>
                          {{ workspace.role }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 右側：項目詳情 -->
            <div class="col-md-8 project-detail-panel">
              <div class="project-detail-container">
                <!-- 載入狀態 -->
                <div v-if="switchingWorkspace" class="workspace-switching-loading">
                  <div class="switching-loading-content">
                    <div class="spinner-border text-theme mb-3" role="status">
                      <span class="visually-hidden">載入中...</span>
                    </div>
                    <h6 class="text-muted mb-2">正在載入工作空間項目</h6>
                    <p class="text-muted">請稍候...</p>
                  </div>
                </div>
                
                <!-- 選中的工作空間項目 -->
                <div v-else-if="expandedWorkspaces.size > 0" class="project-detail-content">
                  <div 
                    v-for="workspace in workspacesWithProjects.filter(ws => isWorkspaceExpanded(ws.id))" 
                    :key="workspace.id"
                    class="workspace-projects-section"
                  >
                    
                    <!-- 項目網格 -->
                    <div v-if="workspace.projects.length > 0" class="project-grid-full">
                      <div 
                        v-for="project in workspace.projects" 
                        :key="project.id"
                        class="project-card-full"
                        :class="{ 'current-project': workspaceStore.currentProject?.id === project.id }"
                        @click="setCurrentProject(project, $event)"
                      >
                        <div class="project-card-header-full">
                          <div class="project-title-section">
                            <h6 class="project-title-full">{{ project.name }}</h6>
                            <div class="project-location-full">
                              <i class="fa fa-map-marker-alt text-danger"></i>
                              <span>{{ project.location }}</span>
                            </div>
                          </div>
                          
                          <div class="project-actions-full" v-if="canEditProject(workspace)">
                            <!-- 編輯按鈕 -->
                            <div class="right-actions">
                              <button 
                                class="btn btn-sm btn-outline-primary me-1"
                                @click="editProject(project, $event)"
                                title="編輯工程案"
                              >
                                <i class="fa fa-edit me-1"></i>
                                編輯
                              </button>
                              <button 
                                class="btn btn-sm btn-outline-danger"
                                @click="deleteProject(project, $event)"
                                title="刪除工程案"
                              >
                                <i class="fa fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div class="project-status-full d-flex align-items-center gap-2">
                          <span :class="`status-badge-full status-${project.status.toLowerCase()}`">
                            {{ getProjectStatusLabel(project.status) }}
                          </span>
                          <!-- 目前項目標籤 -->
                          <span v-if="workspaceStore.currentProject?.id === project.id" class="current-project-badge">
                            <span class="badge border border-theme text-theme px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">
                              <i class="fa fa-check me-1"></i>
                              目前項目
                            </span>
                          </span>
                        </div>
                        
                        <div class="project-info-full">
                          <div class="info-item-full">
                            <i class="fa fa-dollar-sign text-success"></i>
                            <span class="info-label-full">預算</span>
                            <span class="info-value-full">{{ formatAmount(project.budget) }}</span>
                          </div>
                          <div class="info-item-full">
                            <i class="fa fa-calendar text-primary"></i>
                            <span class="info-label-full">工期</span>
                            <span class="info-value-full">{{ project.startDate }} - {{ project.endDate }}</span>
                          </div>
                        </div>
                        
                        <div class="project-progress-full">
                          <div class="progress-header-full">
                            <span class="progress-label-full">進度</span>
                            <span class="progress-percentage-full">{{ project.progress }}%</span>
                          </div>
                          <div class="progress-bar-full">
                            <div 
                              class="progress-fill-full"
                              :style="{ width: project.progress + '%' }"
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- 空狀態 -->
                    <div v-else class="project-empty-state">
                      <div class="empty-state-content">
                        <i class="fa fa-project-diagram fa-3x text-muted mb-3"></i>
                        <h6 class="text-muted mb-2">此工作空間尚未建立任何工程案</h6>
                        <p class="text-muted mb-3">開始建立您的第一個工程案</p>
                        <button 
                          v-if="canEditProject(workspace)"
                          class="btn btn-theme"
                          @click="addProject(workspace, $event)"
                        >
                          <i class="fa fa-plus me-1"></i>
                          建立第一個項目
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 未選擇工作空間的狀態 -->
                <div v-else class="workspace-select-prompt">
                  <div class="select-prompt-content">
                    <i class="fa fa-mouse-pointer fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted mb-2">選擇工作空間</h5>
                    <p class="text-muted">點擊左側的工作空間來查看其工程案</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- 工作空間編輯模態框 -->
  <WorkspaceFormModal
    v-model:show="showWorkspaceModal"
    :workspace="editingWorkspace"
    @hide="closeWorkspaceModal"
    @submit="saveWorkspace"
  />

  <!-- 項目編輯模態框 -->
  <ProjectFormModal
    v-model:show="showProjectModal"
    :project="editingProject"
    @hide="closeProjectModal"
    @submit="saveProject"
  />
</template>

<style scoped>
.page-header-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0;
}

/* 左右分欄式階層管理樣式 */
.workspace-split-layout {
  margin-top: 1rem;
  height: calc(100vh - 200px);
  min-height: 600px;
}

.workspace-common-header {
  border-bottom: 2px solid var(--bs-border-color);
  background: transparent;
}

.workspace-common-header .col-md-4 {
  border-right: 2px solid var(--bs-border-color);
}

.workspace-sidebar {
  background: transparent;
  border-right: 2px solid var(--bs-border-color);
  border-radius: 0.75rem 0 0 0.75rem;
  height: 100%;
  overflow: hidden;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.workspace-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workspace-list-header {
  padding: 1.5rem 1rem 1rem 1rem;
  background: transparent;
}

.workspace-list-header h6 {
  color: var(--bs-body-color);
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.workspace-list-header h6 i {
  color: var(--bs-body-color);
  font-size: 1rem;
}

.workspace-list-header small {
  color: var(--bs-secondary-color);
  font-weight: 500;
  font-size: 0.85rem;
}

.workspace-list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1rem 1rem 0.75rem;
  background: transparent;
}

.workspace-item-compact {
  background: transparent;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.workspace-item-compact:hover {
  border-color: rgba(var(--bs-theme-rgb), 0.3);
  box-shadow: 0 2px 8px rgba(var(--bs-theme-rgb), 0.1);
}

.workspace-item-compact.active {
  border-color: var(--bs-theme);
  box-shadow: 0 4px 12px rgba(var(--bs-theme-rgb), 0.15);
  background: rgba(var(--bs-theme-rgb), 0.02);
}

.workspace-item-compact.loading {
  border-color: var(--bs-theme);
  background: rgba(var(--bs-theme-rgb), 0.05);
  position: relative;
  overflow: hidden;
}

.workspace-item-compact.loading::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(var(--bs-theme-rgb), 0.1), transparent);
  animation: loading-shimmer 1.5s infinite;
}

@keyframes loading-shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.workspace-item-content {
  padding: 1rem;
  position: relative;
}

.workspace-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--bs-body-bg-rgb), 0.8);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 0.5rem;
}

.workspace-loading-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--bs-theme);
  font-size: 0.85rem;
  font-weight: 500;
}

.loading-text {
  white-space: nowrap;
}

.workspace-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.workspace-name-compact {
  font-size: 1rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0;
  flex: 1;
}

.workspace-item-actions {
  display: flex;
  gap: 0.25rem;
}

.workspace-description-compact {
  font-size: 0.8rem;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.workspace-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.workspace-role {
  display: flex;
  justify-content: flex-start;
}

/* 右側項目詳情面板 */
.project-detail-panel {
  background: transparent;
  border-radius: 0 0.75rem 0.75rem 0;
  height: 100%;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}

.project-detail-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.project-detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2rem 2rem 1rem;
  background: transparent;
  border-radius: 0 0 0.75rem 0;
}

.workspace-switching-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.switching-loading-content {
  text-align: center;
  max-width: 300px;
}

.switching-loading-content .spinner-border {
  width: 2rem;
  height: 2rem;
}

.workspace-projects-section {
  margin-bottom: 2rem;
}

.workspace-projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1rem 1rem 1rem;
  background: transparent;
}

.workspace-projects-title h5 {
  color: var(--bs-body-color);
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.workspace-projects-title h5 i {
  color: var(--bs-body-color);
  font-size: 1rem;
}

.workspace-projects-title p {
  color: var(--bs-secondary-color);
  font-weight: 500;
  font-size: 0.85rem;
}

.workspace-projects-actions {
  display: flex;
  gap: 0.5rem;
}

.project-grid-full {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.project-card-full {
  background: transparent;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.project-card-full.current-project {
  border-color: var(--bs-theme);
  background: rgba(var(--bs-theme-rgb), 0.05);
  box-shadow: 0 4px 12px rgba(var(--bs-theme-rgb), 0.15);
}

.project-card-full:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}

.project-card-header-full {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.project-title-section {
  flex: 1;
  min-width: 0;
}

.project-title-full {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.project-location-full {
  display: flex;
  align-items: center;
  color: var(--bs-text-muted);
  font-size: 0.85rem;
  gap: 0.375rem;
}

.project-actions-full {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-project-badge {
  display: flex;
  align-items: center;
}

.project-status-full {
  margin-bottom: 1rem;
}

.status-badge-full {
  padding: 0.375rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid;
}

.status-planning {
  background: rgba(var(--bs-info-rgb), 0.1);
  color: var(--bs-info);
  border-color: var(--bs-info);
}

.status-in_progress {
  background: rgba(var(--bs-success-rgb), 0.1);
  color: var(--bs-success);
  border-color: var(--bs-success);
}

.status-completed {
  background: rgba(var(--bs-primary-rgb), 0.1);
  color: var(--bs-primary);
  border-color: var(--bs-primary);
}

.status-suspended {
  background: rgba(var(--bs-warning-rgb), 0.1);
  color: var(--bs-warning);
  border-color: var(--bs-warning);
}

.project-info-full {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item-full {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(var(--bs-theme-rgb), 0.02);
  border: 1px solid rgba(var(--bs-theme-rgb), 0.1);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.info-item-full:hover {
  background: rgba(var(--bs-theme-rgb), 0.05);
  border-color: rgba(var(--bs-theme-rgb), 0.2);
}

.info-item-full i {
  font-size: 1rem;
  width: 1.25rem;
  text-align: center;
}

.info-label-full {
  font-size: 0.75rem;
  color: var(--bs-text-muted);
  font-weight: 500;
  margin-right: 0.5rem;
}

.info-value-full {
  font-size: 0.85rem;
  color: var(--bs-body-color);
  font-weight: 600;
  flex: 1;
}

.project-progress-full {
  margin-top: auto;
}

.progress-header-full {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-label-full {
  font-size: 0.8rem;
  color: var(--bs-text-muted);
  font-weight: 500;
}

.progress-percentage-full {
  font-size: 0.8rem;
  color: var(--bs-body-color);
  font-weight: 600;
}

.progress-bar-full {
  height: 0.5rem;
  background: rgba(var(--bs-theme-rgb), 0.1);
  border-radius: 0.25rem;
  overflow: hidden;
}

.progress-fill-full {
  height: 100%;
  background: var(--bs-theme);
  border-radius: 0.25rem;
  transition: width 0.3s ease;
}

/* 空狀態和提示 */
.project-empty-state,
.workspace-select-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.empty-state-content,
.select-prompt-content {
  text-align: center;
  max-width: 300px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .workspace-split-layout {
    height: auto;
    min-height: auto;
  }
  
  .workspace-sidebar {
    height: auto;
    border-right: none;
    border-bottom: 2px solid var(--bs-border-color);
    border-radius: 0.75rem 0.75rem 0 0;
  }
  
  .project-detail-panel {
    border-radius: 0 0 0.75rem 0.75rem;
  }
  
  .workspace-list-scroll {
    max-height: 300px;
  }
  
  .project-detail-panel {
    height: auto;
  }
  
  .project-detail-content {
    padding: 1rem;
  }
  
  .project-grid-full {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .workspace-projects-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .workspace-projects-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  
  .workspace-stats {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .workspace-item-actions {
    opacity: 1;
  }
  
  .project-actions-full {
    opacity: 1;
  }
}

@media (max-width: 576px) {
  .workspace-item-content {
    padding: 0.75rem;
  }
  
  .project-card-full {
    padding: 1rem;
  }
  
  .workspace-list-header {
    padding: 0.75rem;
  }
}
</style>