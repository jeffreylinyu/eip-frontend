<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { userApi } from '@/api/user'
import { companyApi } from '@/api/company'
import { getAllConstructions, getConstructionsByCompany, type Construction } from '@/api/construction'
import { userConstructionApi, ConstructionPermissionEnum, ConstructionRoleEnum } from '@/api/userConstruction'
import Card from '@/components/bootstrap/Card.vue'

const props = defineProps<{
  modelValue: boolean
  user: any // User object
  companyId?: string
}>()

const emit = defineEmits(['update:modelValue', 'change'])

const isLoading = ref(false)
const joinedProjects = ref<any[]>([])
const allProjects = ref<Construction[]>([])
const selectedProjectId = ref('')
const selectedRole = ref(ConstructionRoleEnum.SITE_WORKER) // 預設角色
const selectedPermission = ref(ConstructionPermissionEnum.VIEWER) // 預設權限

// 角色選項 (職位/職稱)
const roleOptions = [
  { value: ConstructionRoleEnum.LABOUR_SAFETY, label: '勞安' },
  { value: ConstructionRoleEnum.QUALITY, label: '品管' },
  { value: ConstructionRoleEnum.TECHNICIAN, label: '技師' },
  { value: ConstructionRoleEnum.ARCHITECT, label: '建築師' },
  { value: ConstructionRoleEnum.CONSTRUCTION_MANAGER, label: '工地負責人' },
  { value: ConstructionRoleEnum.ADMIN_STAFF, label: '行政人員' },
  { value: ConstructionRoleEnum.SITE_WORKER, label: '現場人員' },
  { value: ConstructionRoleEnum.OWNER, label: '負責人' },
  { value: ConstructionRoleEnum.ADMIN, label: '公司管理員' }
]

// 權限選項 (操作權限)
const permissionOptions = [
  { value: ConstructionPermissionEnum.ADMIN, label: '工程案管理員', class: 'badge bg-danger' },
  { value: ConstructionPermissionEnum.MEMBER, label: '成員', class: 'badge bg-primary' },
  { value: ConstructionPermissionEnum.VIEWER, label: '檢視者', class: 'badge bg-secondary' }
]

const getRoleLabel = (role: string) => {
  return roleOptions.find(r => r.value === role)?.label || role
}

const getPermissionLabel = (permission: string) => {
  return permissionOptions.find(p => p.value === permission)?.label || permission || '檢視者'
}

const getPermissionClass = (permission: string) => {
  const p = permission || 'VIEWER'
  return permissionOptions.find(opt => opt.value === p)?.class || 'badge bg-secondary'
}

// 載入資料
const loadData = async () => {
  if (!props.user?.userId) return
  
  isLoading.value = true
  try {
    // 取得所有可用工程案
    let all: Construction[] = []
    if (props.companyId) {
      all = await getConstructionsByCompany(props.companyId)
    } else {
      all = await getAllConstructions()
    }
    allProjects.value = all || []

    // 取得使用者已加入的工程案 (包含權限資訊)
    // 改用 userConstructionApi 獲取最準確的權限資料
    const userConstructions = await userConstructionApi.getUserConstructions(props.user.userId)
    
    // 將 flat structure 轉換為前端需要的格式，並映射工程案名稱
    joinedProjects.value = userConstructions.map(uc => {
        const project = all.find(p => p.constructionId === uc.constructionId)
        return {
            ...uc,
            constructionName: project?.constructionName || uc.constructionId,
            role: uc.jobTitle || uc.role, // 優先使用新欄位
            permission: uc.constructionPermission || uc.permission // 優先使用新欄位
        }
    })
    

  } catch (error) {
    console.error('Failed to load authorization data:', error)
  } finally {
    isLoading.value = false
  }
}

// 可供選擇的專案 (排除已加入的)
const availableProjects = computed(() => {
  if (!allProjects.value.length) return []
  const joinedIds = new Set(joinedProjects.value.map(p => p.constructionId))
  return allProjects.value.filter(p => !joinedIds.has(p.constructionId))
})

// 提交授權
const handleGrant = async () => {
  if (!selectedProjectId.value || !props.user?.userId) return
  
  isLoading.value = true
  try {
    await userConstructionApi.invite({
      userId: props.user.userId,
      constructionId: selectedProjectId.value,
      role: selectedRole.value,
      permission: selectedPermission.value
    })
    
    // 重新載入列表
    await loadData()
    
    // 清空選擇
    selectedProjectId.value = ''
    selectedRole.value = ConstructionRoleEnum.SITE_WORKER
    selectedPermission.value = ConstructionPermissionEnum.VIEWER
    
    emit('change')
  } catch (error) {
    console.error('Grant access failed:', error)
    alert('授權失敗，請稍後再試')
  } finally {
    isLoading.value = false
  }
}

const handleRemove = async (project: any) => {
    if (!confirm(`確定要移除該使用者的 ${project.constructionName} 權限嗎？`)) return

    isLoading.value = true
    try {
        await userConstructionApi.remove(props.user.userId, project.constructionId)
        await loadData()
        emit('change')
    } catch (error) {
        console.error('Remove access failed:', error)
        alert('移除失敗，請稍後再試')
    } finally {
        isLoading.value = false
    }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    loadData()
    selectedProjectId.value = ''
  }
})

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <div v-if="modelValue" class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1">
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="fa fa-user-shield text-theme me-2"></i>
            管理專案權限 - {{ user?.username || user?.email }}
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        
        <div class="modal-body">
          <!-- 新精授權區塊 -->
          <Card class="mb-4 bg-dark text-white">
            <div class="card-body">
              <h6 class="card-title fw-bold mb-3 text-white">新增權限</h6>
              <div class="row g-2 align-items-end">
                <div class="col-md-5">
                  <label class="form-label small text-white-50">選擇專案</label>
                  <select class="form-select" v-model="selectedProjectId" :disabled="isLoading">
                    <option value="">請選擇專案...</option>
                    <option v-for="p in availableProjects" :key="p.constructionId" :value="p.constructionId">
                      {{ p.constructionName }} ({{ p.constructionId }})
                    </option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label small text-white-50">職稱 (Role)</label>
                  <select class="form-select" v-model="selectedRole" :disabled="isLoading">
                    <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="form-label small text-white-50">權限 (Permission)</label>
                  <select class="form-select" v-model="selectedPermission" :disabled="isLoading">
                    <option v-for="opt in permissionOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div class="col-md-2">
                  <button class="btn btn-primary w-100" @click="handleGrant" 
                    :disabled="!selectedProjectId || isLoading">
                    <i class="fa fa-plus me-1"></i> 加入
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <!-- 已授權列表 -->
          <h6 class="fw-bold mb-3 border-bottom pb-2">已加入的專案</h6>
          
          <div v-if="isLoading && !joinedProjects.length" class="text-center py-4">
            <div class="spinner-border text-secondary" role="status"></div>
          </div>
          
          <div v-else-if="!joinedProjects.length" class="text-center py-4 text-muted border rounded">
            <i class="fa fa-folder-open fs-1 opacity-25 mb-2"></i>
            <p class="mb-0">此帳號尚未加入任何專案</p>
          </div>
          
          <div v-else class="table-responsive border rounded">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>專案名稱</th>
                  <th>專案編號</th>
                  <th>職稱 (Role)</th>
                  <th>權限 (Permission)</th>
                  <th class="text-end">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in joinedProjects" :key="p.id">
                  <td class="fw-bold">{{ p.constructionName }}</td>
                  <td>{{ p.constructionId }}</td>
                  <td>
                    <span class="badge bg-light text-dark border">{{ getRoleLabel(p.role) }}</span>
                  </td>
                  <td>
                    <span :class="getPermissionClass(p.permission)">{{ getPermissionLabel(p.permission) }}</span>
                  </td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" @click="handleRemove(p)" :disabled="isLoading">
                      <i class="fa fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">關閉</button>
        </div>
      </div>
    </div>
  </div>
</template>
