<script setup lang="ts">
import { ref, onMounted, computed, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import constructionApi from '@/api/construction'
import { ConstructionPermissionEnum, ConstructionRoleEnum } from '@/api/userConstruction'
import PageHeader from '@/components/bootstrap/PageHeader.vue'

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()
const { proxy } = getCurrentInstance() as any

const isLoading = ref(false)
const projects = ref<any[]>([])

// 角色顯示 Helper
const getRoleLabel = (role: string) => {
  const roleMap: Record<string, string> = {
    [ConstructionRoleEnum.LABOUR_SAFETY]: '勞安',
    [ConstructionRoleEnum.QUALITY]: '品管',
    [ConstructionRoleEnum.TECHNICIAN]: '技師',
    [ConstructionRoleEnum.ARCHITECT]: '建築師',
    [ConstructionRoleEnum.CONSTRUCTION_MANAGER]: '工地負責人',
    [ConstructionRoleEnum.ADMIN_STAFF]: '行政人員',
    [ConstructionRoleEnum.SITE_WORKER]: '現場人員',
    [ConstructionRoleEnum.OWNER]: '負責人',
    [ConstructionRoleEnum.ADMIN]: '公司管理員'
  }
  return roleMap[role] || role || '現場人員'
}

// 權限顯示 Helper
const getPermissionLabel = (permission: string) => {
  const permissionMap: Record<string, string> = {
    [ConstructionPermissionEnum.ADMIN]: '工程案管理員',
    [ConstructionPermissionEnum.MEMBER]: '成員', 
    [ConstructionPermissionEnum.VIEWER]: '檢視者'
  }
  return permissionMap[permission] || '檢視者'
}

const getPermissionClass = (permission: string) => {
   const permissionMap: Record<string, string> = {
    [ConstructionPermissionEnum.ADMIN]: 'badge bg-danger',
    [ConstructionPermissionEnum.MEMBER]: 'badge bg-primary',
    [ConstructionPermissionEnum.VIEWER]: 'badge bg-secondary'
  }
  return permissionMap[permission] || 'badge bg-secondary'
}

// 獲取項目狀態標籤
const getProjectStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    'PLANNING': '規劃中',
    'IN_PROGRESS': '進行中',
    'COMPLETED': '已完成',
    'SUSPENDED': '暫停'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    'PLANNING': 'info',
    'IN_PROGRESS': 'success',
    'COMPLETED': 'primary',
    'SUSPENDED': 'warning'
  }
  return statusMap[status] || 'secondary'
}

const loadProjects = async () => {
    if (!authStore.user?.userId) return
    
    isLoading.value = true
    try {
        // 1. 取得使用者加入的專案列表 (可能只有部分資訊)
        const simpleProjects = await userApi.getJoinedProjects(authStore.user.userId)
        
        if (!Array.isArray(simpleProjects)) {
            projects.value = []
            return
        }

        // 2. 取得每個專案的完整詳情 (包含廠商資訊)
        const detailPromises = simpleProjects.map(async (p: any) => {
            try {
                // 修正：從 logs 觀察到 API 回傳的是 projectId，而非 constructionId
                const constructionId = p.constructionId || p.projectId
                
                if (!constructionId) {
                    return p
                }
                
                const detail = await constructionApi.getConstructionDetail(constructionId)
                
                // 確保原有屬性存在，並覆蓋詳情
                // 統一 ID 欄位，確保 click event 不會出錯
                return { ...p, ...detail, id: constructionId } 
            } catch (err) {
                console.warn(`Failed to fetch detail for project ${p.projectId || p.id}:`, err)
                return p // 失敗時回傳原始資料
            }
        })

        projects.value = await Promise.all(detailPromises)
        
    } catch (error) {
        console.error('Failed to load projects:', error)
        proxy.$toast.error('無法載入工程案列表')
    } finally {
        isLoading.value = false
    }
}

const enterProject = async (project: any) => {
    try {
        // 先切換工作空間 (如果需要)
        if (project.workspaceId !== workspaceStore.currentWorkspace?.id) {
             const workspace = workspaceStore.workspaces.find(w => w.id === project.workspaceId)
             if (workspace) {
                 workspaceStore.setCurrentWorkspace(workspace)
             }
        }
        
        // 確保 project 符合 WorkspaceProject 介面 (補上 name 屬性)
        // Store 和 Header 依賴 'name' 屬性來顯示
        const normalizedProject = {
            ...project,
            name: project.constructionName || project.name || '',
            location: project.constructionLocation || project.location || '',
            workspaceId: project.workspaceId
        }
        
        // 進入專案（會自動選擇工作空間）
        await workspaceStore.setCurrentProject(normalizedProject)
        
        // 顯示成功訊息
        proxy.$toast.success(`已進入專案：${normalizedProject.name}`)
        
        // 導向首頁
        // 使用 catch 忽略導航錯誤 (例如被守衛攔截重導向，這是預期行為)
        await router.push('/').catch(err => {
            console.log('Navigation redirected or cancelled:', err)
        })
        
    } catch (error) {
        console.error('Failed to enter project:', error)
        proxy.$toast.error('進入專案失敗')
    }
}

onMounted(() => {
    loadProjects()
})
</script>

<template>
  <div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <PageHeader
                title="我的工程案"
                icon="fa fa-project-diagram"
                :breadcrumbs="[{ text: '我的工程案', active: true }]"
            />
            
            <div v-if="isLoading" class="text-center py-5">
                <div class="spinner-border text-theme" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            
            <div v-else-if="projects.length === 0" class="text-center py-5">
                <div class="mb-3">
                    <i class="fa fa-folder-open fa-3x text-muted"></i>
                </div>
                <h5 class="text-muted">您尚未加入任何工程案</h5>
            </div>
            
            <div v-else class="project-grid">
                <div 
                    v-for="project in projects" 
                    :key="project.id" 
                    class="project-card"
                    :class="{ 'active': workspaceStore.currentProject?.id === project.id }"
                    @click="enterProject(project)"
                >
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h5 class="card-title mb-0 fw-bold text-truncate" :title="project.constructionName || project.name">
                                {{ project.constructionName || project.name }}
                            </h5>
                            <span class="badge rounded-pill" :class="`bg-${getStatusColor(project.status)}`">
                                {{ getProjectStatusLabel(project.status) }}
                            </span>
                        </div>
                        
                        <div class="project-info mb-3">
                            <div class="d-flex align-items-center mb-2 text-gray-400">
                                <i class="fa fa-map-marker-alt me-2 text-danger"></i>
                                <small>{{ project.constructionLocation || project.location || '未設定地點' }}</small>
                            </div>
                        </div>

                        <!-- 顯示使用者的角色與權限 -->
                        <div class="user-role-section mb-3 d-flex gap-2">
                            <span class="badge bg-light text-dark border" title="職稱">
                                <i class="fa fa-id-badge me-1 text-muted"></i>
                                {{ getRoleLabel(project.role) }}
                            </span>
                            <span :class="getPermissionClass(project.permission)" title="操作權限">
                                <i class="fa fa-user-shield me-1"></i>
                                {{ getPermissionLabel(project.permission) }}
                            </span>
                        </div>
                        
                        <div class="companies-section p-3 rounded">
                             <div class="mb-2">
                                <small class="text-gray-500 d-block mb-1">營造廠商</small>
                                <div class="d-flex align-items-center">
                                    <i class="fa fa-hard-hat me-2 text-warning"></i>
                                    <span class="fw-medium text-white">{{ project.contractorCompanyName || '-' }}</span>
                                </div>
                             </div>
                             <div>
                                <small class="text-gray-500 d-block mb-1">監造單位</small>
                                <div class="d-flex align-items-center">
                                    <i class="fa fa-clipboard-check me-2 text-success"></i>
                                    <span class="fw-medium text-white">{{ project.supervisoryCompanyName || '-' }}</span>
                                </div>
                             </div>
                        </div>
                        
                        <div class="mt-3 text-end">
                            <span v-if="workspaceStore.currentProject?.id === project.id" class="text-theme fw-bold">
                                <i class="fa fa-check-circle me-1"></i> 目前選擇
                            </span>
                            <span v-else class="text-gray-500 small">點擊進入</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
    padding-bottom: 2rem;
}

.project-card {
    background: #1e1e1e;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
    cursor: pointer;
    border: 1px solid #333;
    position: relative;
    overflow: hidden;
}

.project-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 30px rgba(0,0,0,0.5);
    border-color: var(--bs-theme);
}

.project-card.active {
    border: 2px solid var(--bs-theme);
    background: linear-gradient(to bottom right, #1e1e1e, rgba(var(--bs-theme-rgb), 0.1));
}

.project-card.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--bs-theme);
}

.companies-section {
    background-color: #2c2c2c;
    border: 1px solid #444;
}

.card-title {
    font-size: 1.1rem;
    color: #ffffff;
}

.text-truncate {
    max-width: 70%;
}

.text-gray-400 {
    color: #ced4da !important;
}

.text-gray-500 {
    color: #adb5bd !important;
}

.card-body {
    padding: 1.25rem;
}
</style>