<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useWorkspaceStore, type Workspace } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import WorkspaceFormModal from '@/components/workspace/WorkspaceFormModal.vue'
import toastService from '@/components/bootstrap/ToastService.js'

const workspaceStore = useWorkspaceStore()

// 狀態
const showWorkspaceForm = ref(false)
const editingWorkspace = ref<Workspace | null>(null)
const searchQuery = ref('')
const filterRole = ref<string>('all')
const isLoading = ref(false)
const openDropdownId = ref<string | null>(null)

// 計算屬性
const filteredWorkspaces = computed(() => {
  // 使用帶用戶信息的工作空間列表
  let workspaces = workspaceStore.workspacesWithUserInfo

  // 角色過濾
  if (filterRole.value !== 'all') {
    workspaces = workspaces.filter(ws => ws.role === filterRole.value)
  }

  // 搜索過濾
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    workspaces = workspaces.filter(ws =>
      ws.name.toLowerCase().includes(query) ||
      ws.description.toLowerCase().includes(query) ||
      ws.ownerDisplayName.toLowerCase().includes(query) // 使用 ownerDisplayName 進行搜索
    )
  }

  return workspaces
})

const roleOptions = [
  { value: 'all', label: '全部角色', count: workspaceStore.workspaces.length },
  { value: 'OWNER', label: '擁有者', count: workspaceStore.workspaces.filter(ws => ws.role === 'OWNER').length },
  { value: 'ADMIN', label: '管理員', count: workspaceStore.workspaces.filter(ws => ws.role === 'ADMIN').length },
  { value: 'MEMBER', label: '成員', count: workspaceStore.workspaces.filter(ws => ws.role === 'MEMBER').length },
  { value: 'VIEWER', label: '檢視者', count: workspaceStore.workspaces.filter(ws => ws.role === 'VIEWER').length }
]

// 方法
const openAddWorkspace = () => {
  editingWorkspace.value = null
  showWorkspaceForm.value = true
}

const openEditWorkspace = (workspace: Workspace) => {
  editingWorkspace.value = workspace
  showWorkspaceForm.value = true
}

const closeWorkspaceForm = () => {
  showWorkspaceForm.value = false
  editingWorkspace.value = null
}

const confirmDeleteWorkspace = (workspace: Workspace) => {
  if (workspace.role !== 'OWNER' && workspace.role !== 'ADMIN') {
    toastService.error('您沒有權限刪除此工作空間')
    return
  }

  if (confirm(`確定要刪除工作空間 "${workspace.name}" 嗎？\n這個操作將無法復原。`)) {
    deleteWorkspace(workspace)
  }
}

const deleteWorkspace = async (workspace: Workspace) => {
  isLoading.value = true
  try {
    // 使用真實API刪除工作空間
    await workspaceStore.removeWorkspace(workspace.id)
    toastService.success('工作空間刪除成功')
  } catch (error) {
    console.error('Delete workspace error:', error)
    toastService.error('刪除工作空間失敗')
  } finally {
    isLoading.value = false
  }
}



const toggleDropdown = (workspaceId: string) => {
  openDropdownId.value = openDropdownId.value === workspaceId ? null : workspaceId
}

const closeDropdown = () => {
  openDropdownId.value = null
}

const getRoleColor = (role: string) => {
  const colors = {
    'OWNER': 'border-danger text-danger',
    'ADMIN': 'border-warning text-warning',
    'MEMBER': 'border-primary text-primary',
    'VIEWER': 'border-secondary text-secondary'
  }
  return colors[role] || 'border-secondary text-secondary'
}

const getRoleText = (role: string) => {
  const texts = {
    'OWNER': '擁有者',
    'ADMIN': '管理員',
    'MEMBER': '成員',
    'VIEWER': '檢視者'
  }
  return texts[role] || role
}

const canEditWorkspace = (workspace: Workspace) => {
  return workspace.role === 'OWNER' || workspace.role === 'ADMIN'
}

const canDeleteWorkspace = (workspace: Workspace) => {
  return workspace.role === 'OWNER' || workspace.role === 'ADMIN'
}

const onWorkspaceFormSubmit = async (workspaceData: any) => {
  isLoading.value = true
  try {
    if (editingWorkspace.value) {
      // 編輯工作空間 - 使用真實API
      await workspaceStore.updateWorkspace(editingWorkspace.value.id, {
        name: workspaceData.name,
        description: workspaceData.description
      })
      toastService.success('工作空間更新成功')
    } else {
      // 新增工作空間 - 使用真實API
      await workspaceStore.addWorkspace({
        name: workspaceData.name,
        description: workspaceData.description,
        companyId: workspaceData.companyId || ''
      })
      toastService.success('工作空間創建成功')
    }
    closeWorkspaceForm()
  } catch (error) {
    console.error('Workspace form submit error:', error)
    toastService.error(editingWorkspace.value ? '更新工作空間失敗' : '創建工作空間失敗')
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
  if (workspaceStore.workspaces.length === 0) {
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
      <div class="d-flex flex-column flex-sm-row gap-3 flex-grow-1">
        <!-- 搜索 -->
        <div class="input-group" style="max-width: 300px;">
          <span class="input-group-text">
            <i class="fa fa-search"></i>
          </span>
          <input 
            type="text" 
            class="form-control" 
            placeholder="搜索工作空間..."
            v-model="searchQuery"
          />
        </div>
        
        <!-- 角色過濾 -->
        <select class="form-select" style="max-width: 200px;" v-model="filterRole">
          <option v-for="option in roleOptions" :key="option.value" :value="option.value">
            {{ option.label }} ({{ option.count }})
          </option>
        </select>
      </div>
      
      <!-- 新增按鈕 -->
      <button 
        class="btn btn-theme" 
        @click="openAddWorkspace"
        :disabled="isLoading"
      >
        <i class="fa fa-plus me-2"></i>
        新增工作空間
      </button>
    </div>

    <!-- 結果統計 -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <span class="text-muted">
        顯示 {{ filteredWorkspaces.length }} 個工作空間，共 {{ workspaceStore.workspaces.length }} 個
      </span>
    </div>

    <!-- 工作空間列表 -->
    <div class="row g-4" v-if="!isLoading">
      <div class="col-xl-4 col-lg-6" v-for="workspace in filteredWorkspaces" :key="workspace.id">
        <card 
          class="workspace-management-card h-100"
          :class="{ 
            'owned-workspace': workspace.role === 'OWNER'
          }"
        >
          <card-header class="pb-3">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <h6 class="fw-bold mb-1">{{ workspace.name }}</h6>
                <p class="text-muted small mb-2">{{ workspace.description }}</p>
                <span :class="`badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ${getRoleColor(workspace.role)}`">
                  {{ getRoleText(workspace.role) }}
                </span>
              </div>
              
              <!-- 操作按鈕 -->
              <div class="dropdown position-relative">
                <button 
                  class="btn btn-link text-muted p-1" 
                  @click="toggleDropdown(workspace.id)"
                >
                  <i class="fa fa-ellipsis-v"></i>
                </button>
                <ul 
                  v-show="openDropdownId === workspace.id"
                  class="dropdown-menu dropdown-menu-end show position-absolute"
                  style="z-index: 1000; background-color: var(--bs-body-bg); border: 1px solid var(--bs-border-color); box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);"
                  @mouseenter.stop @mouseleave.stop
                >

                  <li v-if="canEditWorkspace(workspace)">
                    <button class="dropdown-item" @click="openEditWorkspace(workspace); closeDropdown()" @mouseenter.stop @mouseleave.stop>
                      <i class="fa fa-edit me-2"></i>
                      編輯
                    </button>
                  </li>
                  <li v-if="canDeleteWorkspace(workspace)">
                    <hr class="dropdown-divider">
                  </li>
                  <li v-if="canDeleteWorkspace(workspace)">
                    <button 
                      class="dropdown-item text-danger" 
                      @click="confirmDeleteWorkspace(workspace); closeDropdown()"
                      @mouseenter.stop @mouseleave.stop
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
            <div class="row g-3">
              <div class="col-6">
                <div class="d-flex align-items-center">
                  <i class="fa fa-user text-muted me-2 fs-14px"></i>
                  <span class="small">{{ workspace.ownerDisplayName }}</span>
                </div>
              </div>
              <div class="col-6">
                <div class="d-flex align-items-center">
                  <i class="fa fa-users text-muted me-2 fs-14px"></i>
                  <span class="small">{{ workspace.memberCount }} 成員</span>
                </div>
              </div>
              <div class="col-6">
                <div class="d-flex align-items-center">
                  <i class="fa fa-project-diagram text-muted me-2 fs-14px"></i>
                  <span class="small">{{ workspace.projectCount }} 項目</span>
                </div>
              </div>
              <div class="col-6">
                <div class="d-flex align-items-center">
                  <i class="fa fa-calendar text-muted me-2 fs-14px"></i>
                  <span class="small">{{ workspace.createdAt }}</span>
                </div>
              </div>
            </div>
            
            <!-- 快捷操作 -->
            <div v-if="canEditWorkspace(workspace)" class="mt-3 pt-3 border-top d-flex gap-2">
              <button 
                class="btn btn-sm btn-outline-theme flex-grow-1"
                @click="openEditWorkspace(workspace)"
              >
                <i class="fa fa-edit me-1"></i>
                編輯工作空間
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
    <div v-if="!isLoading && filteredWorkspaces.length === 0" class="text-center py-5">
      <i class="fa fa-search fa-3x text-muted mb-3"></i>
      <h5 class="text-muted">找不到相關工作空間</h5>
      <p class="text-muted">請嘗試調整搜索條件或創建新的工作空間</p>
      <button class="btn btn-outline-theme" @click="openAddWorkspace">
        <i class="fa fa-plus me-2"></i>
        創建工作空間
      </button>
    </div>
  </div>

  <!-- 工作空間表單Modal -->
  <WorkspaceFormModal
    v-model:show="showWorkspaceForm"
    :workspace="editingWorkspace"
    @hide="closeWorkspaceForm"
    @submit="onWorkspaceFormSubmit"
  />
</template>

<style scoped>
.workspace-management-card {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.workspace-management-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
  z-index: 5000;
}





.fs-14px {
  font-size: 14px;
}

/* 確保 ellipsis 按鈕在黑暗模式下正確顯示 */
.btn-link.text-muted {
  color: var(--bs-body-color) !important;
}

.btn-link.text-muted:hover {
  color: var(--bs-primary) !important;
}

@media (max-width: 768px) {
  .workspace-management-card {
    margin-bottom: 1rem;
  }
  
  .d-flex.gap-3 {
    flex-direction: column;
  }
}
</style> 