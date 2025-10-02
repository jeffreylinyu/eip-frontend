<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { useCompanyStore, type Company } from '@/stores/company'
import { COMPANY_TYPE_OPTIONS, CONTRACTOR_LEVEL_OPTIONS, COMPANY_STATUS_OPTIONS, type CreateCompanyRequest } from '@/api/company'
import CompanyFormModal from './CompanyFormModal.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

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
    
    <!-- 頂部工具列 -->
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
      
      <!-- 搜索和過濾 -->
      <div class="d-flex flex-column flex-md-row gap-3 flex-grow-1">
        <!-- 搜索框 -->
        <div class="flex-grow-1" style="max-width: 400px;">
          <div class="input-group">
            <span class="input-group-text">
              <i class="fa fa-search"></i>
            </span>
            <input
              type="text"
              class="form-control"
              placeholder="搜索公司名稱、統編、聯絡人或信箱..."
              v-model="searchQuery"
            />
            <button 
              v-if="searchQuery"
              class="btn btn-outline-secondary"
              type="button"
              @click="searchQuery = ''"
            >
              <i class="fa fa-times"></i>
            </button>
          </div>
        </div>
        
        <!-- 類型過濾 -->
        <div style="min-width: 150px;">
          <select class="form-select" v-model="selectedType">
            <option value="">所有類型</option>
            <option 
              v-for="option in COMPANY_TYPE_OPTIONS" 
              :key="option.value" 
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
        
        <!-- 狀態過濾 -->
        <div style="min-width: 120px;">
          <select class="form-select" v-model="selectedStatus">
            <option value="">所有狀態</option>
            <option 
              v-for="option in COMPANY_STATUS_OPTIONS" 
              :key="option.value" 
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
        
        <!-- 清除過濾器 -->
        <button 
          v-if="searchQuery || selectedType || selectedStatus"
          class="btn btn-outline-secondary"
          @click="clearFilters"
        >
          <i class="fa fa-eraser me-1"></i>
          清除
        </button>
      </div>
      
      <!-- 新增按鈕 -->
      <button 
        class="btn btn-theme"
        @click="openCompanyForm()"
      >
        <i class="fa fa-plus me-2"></i>
        新增公司
      </button>
    </div>

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
    <div v-else class="row g-3">
      <div 
        v-for="company in filteredCompanies" 
        :key="company.companyId"
        class="col-xl-4 col-lg-6 col-md-6"
      >
        <Card 
          class="h-100"
          :class="{ 
            'dropdown-open': showDropdown === company.companyId,
            'card-hover': hoveredCard === company.companyId && showDropdown !== company.companyId
          }"
          @mouseenter="handleCardMouseEnter(company.companyId)"
          @mouseleave="handleCardMouseLeave"
        >
          <CardBody>
            
            <!-- 公司標題和操作 -->
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div class="flex-grow-1">
                <h6 class="card-title mb-1 text-truncate" :title="company.companyName">
                  {{ company.companyName }}
                </h6>
                <div class="text-muted small">
                  統編：{{ company.companyCode }}
                </div>
              </div>
              
              <!-- 操作下拉選單 -->
              <div class="dropdown">
                <button
                  class="btn btn-sm btn-outline-secondary dropdown-toggle"
                  type="button"
                  @click.stop="toggleDropdown(company.companyId)"
                >
                  <i class="fa fa-cog"></i>
                </button>
                <ul 
                  v-show="showDropdown === company.companyId"
                  class="dropdown-menu dropdown-menu-end show"
                  @click.stop
                  @mouseenter.stop
                  @mouseleave.stop
                >
                  <li>
                    <button 
                      class="dropdown-item"
                      @click="openCompanyForm(company); closeDropdown()"
                    >
                      <i class="fa fa-edit me-2"></i>
                      編輯公司
                    </button>
                  </li>
                  <li>
                    <button 
                      class="dropdown-item"
                      @click="handleManageMembers(company); closeDropdown()"
                    >
                      <i class="fa fa-users me-2"></i>
                      管理成員
                    </button>
                  </li>
                  <li>
                    <button 
                      class="dropdown-item"
                      @click="handleManageSitePersonnel(company); closeDropdown()"
                    >
                      <i class="fa fa-hard-hat me-2"></i>
                      工地人員管理
                    </button>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                    <button 
                      class="dropdown-item text-danger"
                      @click="handleDeleteCompany(company); closeDropdown()"
                    >
                      <i class="fa fa-trash me-2"></i>
                      刪除公司
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <!-- 公司資訊 -->
            <div class="company-info">
              
              <!-- 類型和狀態 -->
              <div class="d-flex gap-2 mb-2">
                <span 
                  class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                  :class="`border-${getTypeColor(company.companyType)} text-${getTypeColor(company.companyType)}`"
                >
                  {{ getTypeLabel(company.companyType) }}
                </span>
                <span 
                  class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                  :class="`border-${getStatusColor(company.status)} text-${getStatusColor(company.status)}`"
                >
                  {{ getStatusLabel(company.status) }}
                </span>
              </div>
              
              <!-- 營造等級（僅當公司類型為營造廠商時顯示） -->
              <div v-if="company.companyType === 'CONTRACTOR' && company.contractorLevel" class="text-muted small mb-2 d-flex align-items-center">
                <i class="fa fa-star me-1" style="width: 16px; text-align: center;"></i>
                營造等級：{{ getContractorLevelLabel(company.contractorLevel) }}
              </div>
              
              <!-- 用戶角色和加入時間 -->
              <div class="text-muted small">
                <div class="mb-2 d-flex align-items-center">
                  <i class="fa fa-user-tag me-1" style="width: 16px; text-align: center;"></i>
                  用戶角色：{{ company.userRole === 'OWNER' ? '擁有者' :
                           company.userRole === 'ADMIN' ? '管理員' :
                           company.userRole === 'MEMBER' ? '成員' :
                           company.userRole === 'VIEWER' ? '檢視者' : company.userRole }}
                </div>
                <div class="d-flex align-items-center">
                  <i class="fa fa-calendar me-1" style="width: 16px; text-align: center;"></i>
                  加入時間：{{ new Date(company.joinedAt || company.createdAt).toLocaleDateString() }}
                </div>
              </div>
            </div>

          </CardBody>
        </Card>
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
  padding: 1.5rem;
}

.card-hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}

.dropdown-open {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: var(--bs-theme);
  z-index: 10000;
}

.company-info {
  font-size: 0.9rem;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

.dropdown-menu {
  min-width: 160px;
}

.dropdown-item {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.dropdown-item:hover {
  background-color: var(--bs-secondary-bg);
}

.text-truncate {
  max-width: 100%;
}

.badge {
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .company-management-tab {
    padding: 1rem;
  }
  
  .d-flex.gap-3 {
    gap: 1rem !important;
  }
  
  .company-info {
    font-size: 0.85rem;
  }
}
</style>