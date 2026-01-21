<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { useCompanyStore, type Company } from '@/stores/company'
import { COMPANY_TYPE_OPTIONS, CONTRACTOR_LEVEL_OPTIONS, COMPANY_STATUS_OPTIONS, type CreateCompanyRequest } from '@/api/company'
import CompanyFormModal from './CompanyFormModal.vue'

const instance = getCurrentInstance()
const proxy = instance?.proxy as any
const companyStore = useCompanyStore()

// 事件定義
const emit = defineEmits<{
  'manage-members': [companyId: string]
  'manage-site-personnel': [companyId: string, companyName: string]
}>()

// 狀態
const showCompanyForm = ref(false)
const editingCompany = ref<Company | null>(null)
const searchQuery = ref('')
const selectedType = ref('')
const selectedStatus = ref('')
const showDropdown = ref<string | null>(null)
const hoveredCard = ref<string | null>(null)
const hoverTimeout = ref<number | null>(null)

// 計算屬性
const filteredCompanies = computed(() => {
  let filtered = companyStore.companiesWithUserInfo

  // 搜索過濾
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(company =>
      company.companyName.toLowerCase().includes(query) ||
      company.companyCode.includes(query) ||
      company.companyType.toLowerCase().includes(query)
    )
  }

  // 類型過濾
  if (selectedType.value) {
    filtered = filtered.filter(company => company.companyType === selectedType.value)
  }

  // 狀態過濾
  if (selectedStatus.value) {
    filtered = filtered.filter(company => company.status === selectedStatus.value)
  }

  return filtered
})

const getTypeLabel = (type: string) => {
  const option = COMPANY_TYPE_OPTIONS.find(opt => opt.value === type)
  return option ? option.label : type
}

const getTypeColor = (type: string) => {
  const option = COMPANY_TYPE_OPTIONS.find(opt => opt.value === type)
  return option ? option.color : 'secondary'
}

const getStatusLabel = (status: string) => {
  const option = COMPANY_STATUS_OPTIONS.find(opt => opt.value === status)
  return option ? option.label : status
}

const getStatusColor = (status: string) => {
  const option = COMPANY_STATUS_OPTIONS.find(opt => opt.value === status)
  return option ? option.color : 'secondary'
}

const getContractorLevelLabel = (level: string) => {
  const option = CONTRACTOR_LEVEL_OPTIONS.find(opt => opt.value === level)
  return option ? option.label : level
}

// 方法
const openCompanyForm = (company?: Company) => {
  editingCompany.value = company || null
  showCompanyForm.value = true
}

const closeCompanyForm = () => {
  showCompanyForm.value = false
  editingCompany.value = null
}

const handleCompanyFormSubmit = async (data: CreateCompanyRequest) => {
  try {
    if (editingCompany.value) {
      // 更新公司
      const result = await companyStore.updateCompany(editingCompany.value.companyId, data)
      if (result) {
        proxy.$toast.success('公司更新成功！')
        closeCompanyForm()
      } else {
        proxy.$toast.error('公司更新失敗，請重試！')
      }
    } else {
      // 建立新公司
      const result = await companyStore.createCompany(data)
      if (result) {
        proxy.$toast.success('公司建立成功！')
        closeCompanyForm()
      } else {
        proxy.$toast.error('公司建立失敗，請重試！')
      }
    }
  } catch (error) {
    console.error('Company form submit error:', error)
    proxy.$toast.error('操作失敗，請重試！')
  }
}

const handleDeleteCompany = async (company: Company) => {
  const confirmed = window.confirm(`確定要刪除公司「${company.companyName}」嗎？此操作無法撤銷。`)
  if (!confirmed) return

  try {
    const success = await companyStore.deleteCompany(company.companyId)
    if (success) {
      proxy.$toast.success('公司刪除成功！')
    } else {
      proxy.$toast.error('公司刪除失敗，請重試！')
    }
  } catch (error) {
    console.error('Delete company error:', error)
    proxy.$toast.error('刪除失敗，請重試！')
  }
}

const handleManageMembers = (company: Company) => {
  emit('manage-members', company.companyId)
}

const handleManageSitePersonnel = (company: Company) => {
  emit('manage-site-personnel', company.companyId, company.companyName)
}

const toggleDropdown = (companyId: string) => {
  showDropdown.value = showDropdown.value === companyId ? null : companyId
}

const closeDropdown = () => {
  showDropdown.value = null
}

const handleCardMouseEnter = (companyId: string) => {
  hoveredCard.value = companyId
  
  // 清除之前的延遲
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
  
  // 延遲關閉下拉選單，給用戶時間移動到下拉選單
  hoverTimeout.value = setTimeout(() => {
    if (showDropdown.value && showDropdown.value !== companyId) {
      showDropdown.value = null
    }
  }, 100) as unknown as number
}

const handleCardMouseLeave = () => {
  hoveredCard.value = null
  
  // 清除延遲
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedType.value = ''
  selectedStatus.value = ''
}

// 生命週期
onMounted(() => {
  companyStore.initCompanies()
})
</script>

<template>
  <div class="company-management-tab">
    
    <!-- 頂部工具列 (Removed) -->

    <!-- 載入狀態 -->
    <div v-if="companyStore.isLoading" class="text-center py-4">
      <div class="spinner-border text-theme" role="status">
        <span class="visually-hidden">載入中...</span>
      </div>
      <div class="mt-2 text-muted">載入公司資料中...</div>
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="companyStore.error" class="alert alert-danger">
      <i class="fa fa-exclamation-triangle me-2"></i>
      {{ companyStore.error }}
      <button 
        class="btn btn-sm btn-outline-danger ms-2"
        @click="companyStore.initCompanies()"
      >
        重試
      </button>
    </div>

    <!-- 空狀態 -->
    <div v-else-if="filteredCompanies.length === 0" class="text-center py-5">
      <div class="mb-3">
        <i class="fa fa-building fa-3x text-muted"></i>
      </div>
      <h5 class="text-muted mb-2">
        {{ companyStore.companies.length === 0 ? '尚未建立任何公司' : '找不到符合條件的公司' }}
      </h5>
      <p class="text-muted mb-3">
        {{ companyStore.companies.length === 0 ? '開始建立您的第一個公司' : '請調整搜索條件或新增公司' }}
      </p>
      <button 
        class="btn btn-theme"
        @click="openCompanyForm()"
      >
        <i class="fa fa-plus me-2"></i>
        新增公司
      </button>
    </div>

    <!-- 公司列表 -->
    <div v-else class="project-grid">
      <div 
        v-for="company in filteredCompanies" 
        :key="company.companyId"
        class="project-card"
        @mouseenter="handleCardMouseEnter(company.companyId)"
        @mouseleave="handleCardMouseLeave"
      >
        <div class="card-body">
            <!-- Header: Title and Status -->
            <div class="d-flex justify-content-between align-items-start mb-3">
                <h5 class="card-title mb-0 fw-bold text-truncate flex-grow-1 me-2" :title="company.companyName">
                    {{ company.companyName }}
                </h5>
                <span 
                  class="badge rounded-pill"
                  :class="`bg-${getStatusColor(company.status)}`"
                >
                  {{ getStatusLabel(company.status) }}
                </span>
            </div>

            <!-- Tax ID Info -->
            <div class="project-info mb-3">
                <div class="d-flex align-items-center mb-2 text-gray-400">
                    <i class="fa fa-university me-2 text-theme"></i>
                    <small>統編：{{ company.companyCode }}</small>
                </div>
                <div class="d-flex align-items-center mb-2 text-gray-400">
                    <i class="fa fa-calendar me-2 text-muted"></i>
                    <small>加入：{{ new Date(company.joinedAt || company.createdAt).toLocaleDateString() }}</small>
                </div>
            </div>

            <!-- Role Badge -->
            <div class="user-role-section mb-3 d-flex gap-2">
                 <span 
                  class="badge border px-2 pt-1 pb-1 rounded d-inline-flex align-items-center"
                   :class="`border-${getTypeColor(company.companyType)} text-${getTypeColor(company.companyType)}`"
                >
                  {{ getTypeLabel(company.companyType) }}
                </span>
                
                <span class="badge bg-light text-dark border" title="角色">
                    <i class="fa fa-user-tag me-1 text-muted"></i>
                    {{ company.userRole === 'OWNER' ? '擁有者' :
                       company.userRole === 'ADMIN' ? '管理員' :
                       company.userRole === 'MEMBER' ? '成員' :
                       company.userRole === 'VIEWER' ? '檢視者' : company.userRole }}
                </span>
            </div>
            
            <!-- Actions Section -->
            <div class="companies-section p-2 rounded d-flex justify-content-end gap-2 align-items-center">
                 <button 
                   class="btn btn-sm btn-outline-light"
                   @click="handleManageMembers(company)"
                 >
                   <i class="fa fa-users me-1"></i> 人員管理
                 </button>

                 <button 
                   class="btn btn-sm btn-outline-light"
                   @click="handleManageSitePersonnel(company)"
                 >
                   <i class="fa fa-hard-hat me-1"></i> 工地人員
                 </button>
            </div>
        </div>
      </div>
    </div>

    <!-- 公司表單模態框 -->
    <CompanyFormModal
      v-model:show="showCompanyForm"
      :company="editingCompany"
      @hide="closeCompanyForm"
      @submit="handleCompanyFormSubmit"
    />

  </div>
</template>

<style scoped>
.company-management-tab {
  padding: 0;
}

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
    cursor: default;
    border: 1px solid #333;
    position: relative;
    /* overflow: hidden; Removed to allow dropdowns */
}



.project-card .card-body {
    padding: 1.25rem;
    color: #fff;
}

.card-title {
    font-size: 1.1rem;
    color: #ffffff;
    font-weight: 600;
}

.companies-section {
    background-color: #2c2c2c;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
}

.dropdown-menu {
  min-width: 160px;
}

.dropdown-item {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: var(--bs-light); 
}

.text-gray-400 {
    color: #ced4da !important;
}

.text-truncate {
    max-width: 100%;
}

@media (max-width: 768px) {
  .company-management-tab {
    padding: 1rem;
  }
}
</style>