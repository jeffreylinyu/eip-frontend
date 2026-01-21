<template>
  <div class="site-personnel-project">
    <!-- 頁面標題 -->
    <PageHeader
      title="專案工地人員管理"
      icon="fa fa-users"
      :breadcrumbs="[
        { text: '基本資料管理', href: 'javascript:;' },
        { text: '工地人員管理', active: true }
      ]"
    />

    <!-- 錯誤提示 -->
    <div v-if="!currentProject" class="alert alert-danger">
      請先選擇工程專案
    </div>

    <div v-else>
      <!-- 人員配置建議 -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="alert alert-info" role="alert">
            <div class="d-flex align-items-center mb-2">
              <i class="fa fa-info-circle me-2"></i>
              <strong>人員配置建議</strong>
              <span class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-2">
                目前專案金額：{{ formatAmount(getCurrentProjectBudget()) }}
              </span>
            </div>
            <!-- (保持原有配置建議 UI) -->
            <div class="row">
              <div class="col-md-6">
                <ul class="mb-0">
                  <li :class="{ 'current-level': isCurrentLevel('A5') }">
                     <strong>500萬以下：</strong>建議配置 1 名品管人員、1 名乙級勞安人員
                  </li>
                  <li :class="{ 'current-level': isCurrentLevel('A4') }">
                     <strong>500萬～1000萬：</strong>建議配置 1 名品管人員、1 名乙級勞安人員
                  </li>
                   <li :class="{ 'current-level': isCurrentLevel('A3') }">
                     <strong>1000萬～3000萬：</strong>建議配置 1 名品管人員、1 名甲級勞安人員
                  </li>
                </ul>
              </div>
              <div class="col-md-6">
                <ul class="mb-0">
                  <li :class="{ 'current-level': isCurrentLevel('A2') }">
                     <strong>3000萬～1億元：</strong>建議配置 2 名品管人員、1 名甲級與 1 名乙級勞安人員
                  </li>
                   <li :class="{ 'current-level': isCurrentLevel('A1') }">
                     <strong>1億元以上：</strong>建議配置 3 名以上品管人員、至少 2 名甲級勞安人員
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 缺少人員提醒 -->
      <div v-if="getMissingPersonnel().length > 0" class="row mb-4">
        <div class="col-12">
          <div class="alert alert-warning" role="alert">
            <div class="d-flex align-items-center mb-2">
              <i class="fa fa-exclamation-triangle me-2"></i>
              <strong>缺少必要人員</strong>
            </div>
            <p class="mb-2">根據{{ getCurrentProjectLevel() }}的配置建議，目前缺少以下人員：</p>
            <ul class="mb-0">
              <li v-for="missing in getMissingPersonnel()" :key="missing.role">
                <strong>{{ missing.roleName }}：</strong>
                需要 {{ missing.required }} 名，目前 {{ missing.current }} 名
                <span class="badge border border-warning text-warning px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-2">
                  缺少 {{ missing.missing }} 名
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 主要內容區域 -->
      <div class="row">
        <div class="col-12">
          <card>
            <card-header>
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="mb-0">
                    <i class="fa fa-users me-2"></i>
                    專案人員配置
                  </h5>
                </div>
                <button
                  type="button"
                  class="btn btn-theme"
                  @click="openAssignModal"
                >
                  <i class="fa fa-user-plus me-2"></i>指派人員
                </button>
              </div>
            </card-header>
            <card-body>
              <!-- 人員統計 -->
              <div class="row mb-3">
                <div class="col-12">
                  <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-4">
                      <span class="text-muted">總計：</span>
                      <span class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ assignedPersonnel.length }} 人</span>
                      <span class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByRole('QUALITY_CONTROL') }} 品管</span>
                      <span class="badge border border-danger text-danger px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByRole('SAFETY_OFFICER') }} 勞安</span>
                      <span class="badge border border-info text-info px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByRole('PROFESSIONAL_ENGINEER') }} 技師</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 空狀態 -->
              <div v-if="assignedPersonnel.length === 0" class="text-center py-5">
                <i class="fa fa-users text-muted fa-3x mb-3"></i>
                <h5 class="text-muted">尚未指派任何人員</h5>
                <p class="text-muted">請點擊「指派人員」按鈕從公司人員中選擇</p>
                <button 
                  type="button" 
                  class="btn btn-outline-theme"
                  @click="openAssignModal"
                >
                  <i class="fa fa-plus me-2"></i>指派人員
                </button>
              </div>

              <!-- 已指派人員列表 -->
              <div v-else>
                <div v-for="role in personnelRoles" :key="role.key" class="mb-4">
                  <div class="row mb-3">
                    <div class="col-12">
                      <div class="d-flex align-items-center">
                        <div class="widget-icon rounded me-3" :class="`bg-${role.color}`">
                          <i class="fa" :class="role.icon" style="color: white"></i>
                        </div>
                        <div>
                          <h6 class="mb-0">{{ role.name }}</h6>
                          <p class="text-muted mb-0 small">{{ role.description }}</p>
                        </div>
                        <div class="ms-auto">
                          <span class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">
                            {{ getAssignedPersonnelByRole(role.key).length }} 人
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="row">
                    <div
                      v-for="person in getAssignedPersonnelByRole(role.key)" 
                      :key="person.memberId"
                      class="col-lg-3 col-md-4 col-sm-6 mb-3"
                    >
                      <card class="person-card h-100">
                        <card-body class="p-3">
                          <div class="person-info" style="cursor: pointer;" @click="viewPerson(person)">
                            <!-- 第一行：姓名和狀態 -->
                            <div class="d-flex align-items-center justify-content-between mb-1">
                              <h6 class="person-name mb-0">{{ person.fullName }}</h6>
                              <span :class="getStatusBadgeClass(person.status)">
                                {{ getStatusText(person.status) }}
                              </span>
                            </div>
                            
                            <!-- 第二行：證照號碼 -->
                            <div class="mb-1">
                              <span v-if="person.licenseNumber" class="text-muted small">
                                <i class="fa fa-certificate me-1"></i>{{ person.licenseNumber }}
                              </span>
                            </div>

                            <!-- 第三行：身分證號碼 -->
                            <div class="mb-1">
                              <span class="text-muted small">
                                <i class="fa fa-id-card me-1"></i>{{ person.identityNumber }}
                              </span>
                            </div>

                            <!-- 第四行：電話和操作按鈕 -->
                            <div class="d-flex align-items-center justify-content-between">
                              <span v-if="person.phone" class="text-muted small">
                                <i class="fa fa-phone me-1"></i>{{ person.phone }}
                              </span>
                              <div class="person-actions d-flex gap-1" @click.stop>
                                <button
                                  type="button"
                                  class="btn btn-sm btn-outline-danger"
                                  @click="removePersonnel(person)"
                                  title="移除指派"
                                >
                                  <i class="fa fa-times"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </card-body>
                      </card>
                    </div>

                    <!-- 指派按鈕 (總是顯示在最後) -->
                    <div 
                      class="col-lg-3 col-md-4 col-sm-6 mb-3"
                    >
                      <div class="empty-state-small clickable-empty" @click="openAssignModal">
                        <div class="empty-icon-small mb-2">
                          <i class="fa fa-plus"></i>
                        </div>
                        <h6 class="text-muted mb-1 fs-14px">新增{{ role.name }}</h6>
                        <p class="text-muted small mb-0 fs-10px text-center">點擊指派</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </card-body>
          </card>
        </div>
      </div>
      
      <!-- 指派人員 Modal -->
      <Modal
        :show="showAssignModal"
        title="指派工地人員"
        icon="fa fa-user-plus"
        size="lg"
        @hide="showAssignModal = false"
        @confirm="handleAssignSubmit"
        :is-loading="isLoading"
        confirm-text="確認指派"
      >
        <template #body>
           <div class="mb-3">
             <input type="text" class="form-control" placeholder="搜索人員..." v-model="assignSearchQuery">
           </div>
           <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
             <table class="table table-hover">
               <thead>
                 <tr>
                   <th width="40"></th>
                   <th>姓名</th>
                   <th>職位</th>
                   <th>狀態</th>
                   <th>目前專案</th>
                 </tr>
               </thead>
               <tbody>
                  <tr v-if="filteredAvailablePersonnel.length === 0">
                    <td colspan="5" class="text-center text-muted">
                      <span v-if="availablePersonnel.length === 0">沒有可指派的人員</span>
                      <span v-else>搜尋無結果</span>
                    </td>
                  </tr>
                  <tr v-for="person in filteredAvailablePersonnel" :key="person.memberId">
                    <td>
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" :value="person.memberId" v-model="selectedPersonnelIds">
                      </div>
                    </td>
                    <td>{{ person.fullName }}</td>
                    <td>{{ getRoleText(person.occupation || person.position || '') }}</td>
                    <td>
                       <span :class="getStatusBadgeClass(person.status, true)">
                          {{ getStatusText(person.status) }}
                       </span>
                    </td>
                    <td>
                      <span v-if="person.constructionId" class="badge bg-secondary">其他專案</span>
                      <span v-else class="badge bg-success">閒置中</span>
                    </td>
                  </tr>
               </tbody>
             </table>
           </div>
        </template>
      </Modal>

<!-- 詳細資料 Modal -->
      <Modal
        :show="showDetailModal"
        title="人員詳細資料"
        icon="fa fa-user-circle"
        @hide="showDetailModal = false"
      >
        <template #body>
           <div v-if="selectedPerson">
             <div class="d-flex align-items-center mb-4">
               <div class="rounded-circle bg-secondary bg-opacity-25 d-flex align-items-center justify-content-center me-3" style="width: 64px; height: 64px;">
                 <i class="fa fa-user fa-2x text-white-50"></i>
               </div>
               <div>
                 <h4 class="mb-1">{{ selectedPerson.fullName }}</h4>
                 <span :class="getStatusBadgeClass(selectedPerson.status)">
                   {{ getStatusText(selectedPerson.status) }}
                 </span>
               </div>
             </div>
             
             <div class="row g-3">
               <div class="col-md-6">
                 <label class="form-label text-muted small">職位</label>
                 <div class="fw-bold">{{ getRoleText(selectedPerson.occupation || selectedPerson.position || '') }}</div>
               </div>
               <div class="col-md-6">
                 <label class="form-label text-muted small">性別</label>
                 <div class="fw-bold">{{ selectedPerson.sex === 'M' ? '男' : '女' }}</div>
               </div>
               <div class="col-md-6">
                 <label class="form-label text-muted small">聯絡電話</label>
                 <div class="fw-bold">{{ selectedPerson.phone }}</div>
               </div>
               <div class="col-md-6">
                 <label class="form-label text-muted small">電子信箱</label>
                 <div class="fw-bold">{{ selectedPerson.email }}</div>
               </div>
               <div class="col-md-6">
                 <label class="form-label text-muted small">身分證號</label>
                 <div class="fw-bold">{{ selectedPerson.identityNumber }}</div>
               </div>
               <div class="col-md-6">
                 <label class="form-label text-muted small">證照號碼</label>
                 <div class="d-flex align-items-center gap-2">
                   <div class="fw-bold">{{ selectedPerson.licenseNumber || '-' }}</div>
                   <button 
                      v-if="selectedPerson.hasPhoto"
                      class="btn btn-xs btn-outline-info"
                      @click="viewLicense(selectedPerson.memberId)"
                      title="查看證照"
                   >
                     <i class="fa fa-file-alt me-1"></i>查看證照
                   </button>
                 </div>
               </div>
               <div class="col-md-6">
                 <label class="form-label text-muted small">證照到期日</label>
                 <div class="fw-bold">{{ selectedPerson.licenseExpiryDate || '-' }}</div>
               </div>
               <div class="col-md-6">
                 <label class="form-label text-muted small">到職日</label>
                 <div class="fw-bold">{{ selectedPerson.workStartDate || '-' }}</div>
               </div>
                <div class="col-12" v-if="selectedPerson.comments">
                 <label class="form-label text-muted small">備註</label>
                 <div class="p-3 bg-secondary bg-opacity-10 rounded border border-secondary border-opacity-25">{{ selectedPerson.comments }}</div>
               </div>
             </div>
           </div>
        </template>
        <template #footer>
           <button type="button" class="btn btn-secondary" @click="showDetailModal = false">關閉</button>
        </template>
      </Modal>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { sitePersonnelApi, type SitePersonnel } from '@/api/sitePersonnel'
import { formatAmount } from '@/utils/format'
import Modal from '@/components/bootstrap/Modal.vue'

const router = useRouter()
const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

// 狀態
const isLoading = ref(false)
const showAssignModal = ref(false)
const showDetailModal = ref(false)
const selectedPerson = ref<SitePersonnel | null>(null)
const allPersonnel = ref<SitePersonnel[]>([])
const selectedPersonnelIds = ref<string[]>([])
const assignSearchQuery = ref('')

const viewPerson = (person: SitePersonnel) => {
  selectedPerson.value = person
  showDetailModal.value = true
}

// 當前專案
const currentProject = computed(() => projectStore.currentProject)

// 已指派的人員 (過濾 constructionId 符合當前專案 ID)
const assignedPersonnel = computed(() => {
  if (!currentProject.value) return []
  return allPersonnel.value.filter(p => p.constructionId === currentProject.value?.constructionId)
})

// 可指派的人員 (顯示所有本公司的人員，排除已指派給當前專案的人員)
const availablePersonnel = computed(() => {
  // 如果沒有當前專案，顯示所有本公司人員
  if (!currentProject.value) {
    return allPersonnel.value
  }
  // 排除已指派給當前專案的人員，但顯示所有其他本公司人員（包括已指派給其他專案的，可以重新指派）
  return allPersonnel.value.filter(p => {
    // 如果人員沒有 constructionId 或 constructionId 不等於當前專案 ID，則可指派
    return !p.constructionId || p.constructionId !== currentProject.value?.constructionId
  })
})

const filteredAvailablePersonnel = computed(() => {
  if (!assignSearchQuery.value) return availablePersonnel.value
  const q = assignSearchQuery.value.toLowerCase()
  return availablePersonnel.value.filter(p => 
    p.fullName.toLowerCase().includes(q) || 
    (p.occupation && p.occupation.toLowerCase().includes(q))
  )
})

// 職務定義
const personnelRoles = [
  {
    key: 'QUALITY',
    name: '品管人員',
    icon: 'fa-medal',
    color: 'warning',
    description: '負責工程品質管控與檢測作業'
  },
  {
    key: 'LABOUR_SAFETY', 
    name: '勞安人員',
    icon: 'fa-shield-alt',
    color: 'danger',
    description: '負責工地安全檢查與事故預防'
  },
  {
    key: 'TECHNICIAN',
    name: '專業技師',
    icon: 'fa-user-tie', 
    color: 'info',
    description: '負責專業技術指導與監督'
  },
  {
    key: 'ADMIN_STAFF',
    name: '行政人員',
    icon: 'fa-user',
    color: 'success',
    description: '負責工地行政文書作業'
  },
  {
    key: 'SITE_WORKER',
    name: '現場人員',
    icon: 'fa-user-nurse',
    color: 'secondary',
    description: '負責現場施工與雜項作業'
  }
]

// 獲取當前用戶的公司 ID
const getCurrentCompanyId = (): string | null => {
  // 優先使用 authStore 中的 companyId
  if (authStore.user?.companyId) {
    return authStore.user.companyId
  }
  
  // 如果沒有，嘗試從 companyStore 獲取第一個公司
  if (companyStore.activeCompanies.length > 0) {
    return companyStore.activeCompanies[0].companyId
  }
  
  // 最後嘗試使用 workspace 的 companyId（作為備用）
  if (workspaceStore.currentWorkspace?.companyId) {
    return workspaceStore.currentWorkspace.companyId
  }
  
  return null
}

// 方法
const loadData = async () => {
   // 只獲取本公司的人員
   const companyId = getCurrentCompanyId()
   if (!companyId) {
     console.warn('無法獲取公司 ID，無法載入人員')
     return
   }
   
   isLoading.value = true
   try {
     console.log('載入人員，公司 ID:', companyId)
     allPersonnel.value = await sitePersonnelApi.getList(companyId)
     console.log('載入完成，人員數量:', allPersonnel.value.length)
   } catch (error) {
     console.error('載入人員失敗', error)
   } finally {
     isLoading.value = false
   }
}

const openAssignModal = async () => {
  selectedPersonnelIds.value = []
  assignSearchQuery.value = ''
  
  // 確保數據已載入
  if (allPersonnel.value.length === 0) {
    await loadData()
  }
  
  console.log('打開指派 modal，可用人員數量:', availablePersonnel.value.length, '總人員數量:', allPersonnel.value.length)
  console.log('當前專案 ID:', currentProject.value?.constructionId)
  console.log('所有人員:', allPersonnel.value)
  
  showAssignModal.value = true
}

const handleAssignSubmit = async () => {
  if (selectedPersonnelIds.value.length === 0) return
  if (!currentProject.value) return

  isLoading.value = true
  try {
    await sitePersonnelApi.assignProject({
      memberIdList: selectedPersonnelIds.value,
      constructionId: currentProject.value.constructionId
    })
    showAssignModal.value = false
    await loadData()
  } catch (error) {
    console.error('指派失敗', error)
    alert('指派失敗')
  } finally {
    isLoading.value = false
  }
}

const removePersonnel = async (person: SitePersonnel) => {
   const confirmed = window.confirm(`確定要移除「${person.fullName}」的專案指派嗎？`)
   if (!confirmed) return

   isLoading.value = true
   try {
     await sitePersonnelApi.removeProject({
       memberIdList: [person.memberId]
     })
     
     // 重新載入數據
     await loadData()
   } catch (error) {
     console.error('移除指派失敗', error)
     alert('移除指派失敗')
   } finally {
     isLoading.value = false
   }
}

const viewLicense = async (memberId: string) => {
  if (!memberId) return
  isLoading.value = true
  try {
    const blob = await sitePersonnelApi.downloadPhoto(memberId)
    if (blob && blob.size > 0) {
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } else {
      alert('無檔案或下載失敗')
    }
  } catch (error) {
    console.error('下載證照失敗', error)
    alert('下載證照失敗或無此檔案')
  } finally {
    isLoading.value = false
  }
}

// 輔助函數
const getPersonnelCountByRole = (role: string): number => {
  return assignedPersonnel.value.filter(p => (p.occupation === role || p.position === role)).length
}

const getAssignedPersonnelByRole = (role: string) => {
  return assignedPersonnel.value.filter(p => (p.occupation === role || p.position === role))
}

const getRoleText = (position: string): string => {
  const roleMap: { [key: string]: string } = {
    'QUALITY': '品管人員',
    'QUALITY_CONTROL': '品管人員', // 兼容舊數據
    'LABOUR_SAFETY': '勞安人員',
    'SAFETY_OFFICER': '勞安人員', // 兼容舊數據
    'TECHNICIAN': '專業技師',
    'PROFESSIONAL_ENGINEER': '專業技師', // 兼容舊數據
    'CONSTRUCTION_MANAGER': '工地負責人',
    'ARCHITECT': '建築師',
    'OWNER': '負責人',
    'ADMIN': '公司管理員',
    'ADMIN_STAFF': '行政人員',
    'SITE_WORKER': '現場人員'
  }
  return roleMap[position] || position
}

const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'Y': '在職',
    'N': '離職',
    'ARCHIVED': '封存'
  }
  return statusMap[status] || status
}

const getStatusBadgeClass = (status: string, small: boolean = false): string => {
  const baseClass = small 
    ? 'badge border px-1 py-0 fs-10px' 
    : 'badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center'
  
  const colorMap: { [key: string]: string } = {
    'Y': 'border-success text-success',
    'N': 'border-danger text-danger',
    'ARCHIVED': 'border-secondary text-secondary'
  }
  
  return `${baseClass} ${colorMap[status] || 'border-secondary text-secondary'}`
}

const getCurrentProjectBudget = (): number => {
  return currentProject.value?.currentContractAmount || currentProject.value?.constructionBudget || 0
}

const getCurrentProjectLevel = (): string => {
  const projectBudget = getCurrentProjectBudget()
  if (projectBudget < 5000000) return 'A5 (500萬以下)'
  if (projectBudget < 10000000) return 'A4 (500萬～1000萬)'
  if (projectBudget < 30000000) return 'A3 (1000萬～3000萬)'
  if (projectBudget < 100000000) return 'A2 (3000萬～1億元)'
  return 'A1 (1億元以上)'
}

const isCurrentLevel = (level: string): boolean => {
  return getCurrentProjectLevel().startsWith(level)
}

const getMissingPersonnel = () => {
  const projectBudget = getCurrentProjectBudget()
  const missing: any[] = []
  
  let requiredPersonnel: { [key: string]: number } = {}
  
  // 更新為新的 key: QUALITY, LABOUR_SAFETY, TECHNICIAN
  if (projectBudget < 5000000) {
    requiredPersonnel = { 'QUALITY': 1, 'LABOUR_SAFETY': 1, 'TECHNICIAN': 0 }
  } else if (projectBudget < 10000000) {
    requiredPersonnel = { 'QUALITY': 1, 'LABOUR_SAFETY': 1, 'TECHNICIAN': 0 }
  } else if (projectBudget < 30000000) {
    requiredPersonnel = { 'QUALITY': 1, 'LABOUR_SAFETY': 1, 'TECHNICIAN': 1 }
  } else if (projectBudget < 100000000) {
    requiredPersonnel = { 'QUALITY': 2, 'LABOUR_SAFETY': 1, 'TECHNICIAN': 1 } // 注意：大於3000萬通常需要甲級勞安，這裡簡化為數量
  } else {
    requiredPersonnel = { 'QUALITY': 3, 'LABOUR_SAFETY': 2, 'TECHNICIAN': 2 }
  }
  
  personnelRoles.forEach(role => {
    const required = requiredPersonnel[role.key] || 0
    // 這裡需要同時檢查新舊 key，以防舊數據未遷移
    const current = assignedPersonnel.value.filter(p => 
      (p.occupation === role.key || p.position === role.key) ||
      (role.key === 'QUALITY' && (p.occupation === 'QUALITY_CONTROL' || p.position === 'QUALITY_CONTROL')) ||
      (role.key === 'LABOUR_SAFETY' && (p.occupation === 'SAFETY_OFFICER' || p.position === 'SAFETY_OFFICER')) ||
      (role.key === 'TECHNICIAN' && (p.occupation === 'PROFESSIONAL_ENGINEER' || p.position === 'PROFESSIONAL_ENGINEER'))
    ).length
    
    const missingCount = Math.max(0, required - current)
    
    if (missingCount > 0) {
      missing.push({
        role: role.key,
        roleName: role.name,
        required,
        current,
        missing: missingCount
      })
    }
  })
  
  return missing
}

onMounted(async () => {
  // 確保工作空間和專案已初始化
  if (!workspaceStore.currentWorkspace) {
    await workspaceStore.initWorkspaces()
  }
  if (!projectStore.currentProject) {
     await projectStore.initProjects()
  }
  
  // 確保公司數據已初始化
  if (companyStore.activeCompanies.length === 0) {
    await companyStore.initCompanies()
  }
  
  loadData()
})
</script>

<style scoped>
.person-card {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.person-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}

.person-name {
  font-weight: 600;
  color: var(--bs-theme);
  font-size: 0.95rem;
}

.person-actions .btn {
  padding: 0.25rem 0.5rem;
}

.empty-icon-small {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bs-primary) 0%, rgba(var(--bs-primary-rgb), 0.8) 100%);
  color: white;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.3);
}

.empty-state-small {
  height: 100%;
  padding: 1rem;
  border: 2px dashed rgba(var(--bs-theme-rgb), 0.3);
  border-radius: 8px;
  background: rgba(var(--bs-theme-rgb), 0.02);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  transition: all 0.2s ease;
}

.empty-state-small:hover {
  border-color: rgba(var(--bs-theme-rgb), 0.5);
  background: rgba(var(--bs-theme-rgb), 0.05);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
}

.current-level {
  background-color: rgba(var(--bs-success-rgb), 0.1) !important;
  border-left: 4px solid var(--bs-success) !important;
  padding-left: 0.5rem !important;
  margin-left: -0.5rem !important;
  border-radius: 0 4px 4px 0;
}

.clickable-empty {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable-empty:hover {
  border-color: rgba(var(--bs-theme-rgb), 0.6) !important;
  background: rgba(var(--bs-theme-rgb), 0.08) !important;
  transform: translateY(-3px) !important;
  box-shadow: 0 6px 20px rgba(var(--bs-theme-rgb), 0.2) !important;
}

.clickable-empty:hover .empty-icon-small {
  background: linear-gradient(135deg, var(--bs-theme) 0%, rgba(var(--bs-theme-rgb), 0.8) 100%) !important;
  box-shadow: 0 4px 12px rgba(var(--bs-theme-rgb), 0.4) !important;
}

.widget-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.fs-10px {
  font-size: 10px !important;
}

.fs-12px {
  font-size: 12px !important;
}

.fs-14px {
  font-size: 14px !important;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .person-card {
    margin-bottom: 1rem;
  }
  
  .widget-icon {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }
}
</style>
