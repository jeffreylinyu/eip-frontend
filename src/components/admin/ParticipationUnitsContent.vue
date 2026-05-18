<template>
  <div class="participation-units-content">
    <!-- 公司角色區塊 -->
    <div class="company-roles-container mb-4">
        <!-- 營造單位與監造單位並排 -->
            <div class="row mb-4">
              <!-- 營造單位區塊 -->
              <div class="col-lg-4 col-md-6 mb-4 mb-lg-0">
                <div class="role-section d-flex flex-column">
                  <div class="d-flex align-items-center justify-content-between mb-3">
                    <div class="d-flex align-items-center">
                      <div class="role-icon-wrapper me-3">
                        <i class="fa fa-hard-hat"></i>
                      </div>
                      <div>
                        <h5 class="mb-0 fw-bold">營造單位</h5>
                        <span class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px">唯一</span>
                      </div>
                    </div>
                    <button 
                      v-if="canInviteCompany && !participatingUnits.contractorCompany"
                      class="btn btn-sm btn-primary"
                      @click="openAddCompanyModal('MAIN_CONTRACTOR')"
                    >
                      <i class="fa fa-plus me-1"></i>加入
                    </button>
                  </div>
            
            <div class="flex-grow-1 d-flex flex-column">
              <div v-if="participatingUnits.contractorCompany" class="custom-company-card main-contractor">
                <div class="card-content p-3">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0 fw-bold fs-4 text-primary">{{ participatingUnits.contractorCompany.companyName }}</h6>
                    <div class="dropdown ms-2" v-if="canInviteCompany">
                      <button class="btn btn-icon btn-sm btn-light text-muted" type="button" data-bs-toggle="dropdown">
                        <i class="fa fa-ellipsis-v"></i>
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                          <a class="dropdown-item text-danger" href="javascript:;" @click="removeCompany(participatingUnits.contractorCompany!)">
                            <i class="fa fa-trash-alt me-2"></i>移除
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="d-flex align-items-center flex-wrap gap-2 mb-3">
                    <span 
                      class="badge border px-2 py-1 rounded fs-6"
                      :class="`border-${getCompanyTypeColor(participatingUnits.contractorCompany.companyType)} text-${getCompanyTypeColor(participatingUnits.contractorCompany.companyType)}`"
                    >
                      {{ getCompanyTypeLabel(participatingUnits.contractorCompany.companyType) }}
                    </span>
                    <span 
                      v-if="participatingUnits.contractorCompany.contractorLevel"
                      class="badge border px-2 py-1 rounded fs-6"
                      :class="`border-${getContractorLevelColor(participatingUnits.contractorCompany.contractorLevel)} text-${getContractorLevelColor(participatingUnits.contractorCompany.contractorLevel)}`"
                    >
                      {{ getContractorLevelLabel(participatingUnits.contractorCompany.contractorLevel) }}
                    </span>
                  </div>

                  <div class="row g-2 mt-auto">
                    <div class="col-6">
                      <div class="d-flex align-items-center text-muted">
                        <i class="fa fa-id-card me-2 opacity-50 fs-5"></i>
                        <span class="fs-6">{{ participatingUnits.contractorCompany.companyUnifiedNumber }}</span>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="d-flex align-items-center justify-content-end text-muted">
                        <i class="fa fa-calendar me-2 opacity-50 fs-5"></i>
                        <span class="fs-6">{{ new Date(participatingUnits.contractorCompany.joinedAt!).toLocaleDateString() }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div 
                v-else 
                class="empty-state custom-company-card border-dashed p-3 d-flex align-items-center justify-content-center"
              >
                <div class="d-flex flex-column align-items-center">
                  <i class="fa fa-hard-hat mb-2 fs-3 text-muted opacity-50"></i>
                  <h6 class="text-muted mb-1">尚未設定營造單位</h6>
                  <button 
                    v-if="canInviteCompany"
                    class="btn btn-sm btn-theme mt-2"
                    @click="openAddCompanyModal('MAIN_CONTRACTOR')"
                  >
                    <i class="fa fa-plus me-1"></i>加入營造單位
                  </button>
                  <p v-else class="text-muted mb-0 small">如需添加，請聯繫客服</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 監造單位區塊 -->
        <div class="col-lg-4 col-md-6 mb-4 mb-lg-0">
          <div class="role-section d-flex flex-column">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="d-flex align-items-center">
                <div class="role-icon-wrapper me-3 supervisor">
                  <i class="fa fa-eye"></i>
                </div>
                <div>
                  <h5 class="mb-0 fw-bold">監造單位</h5>
                  <span class="badge border border-info text-info px-2 pt-5px pb-5px rounded fs-12px">唯一</span>
                </div>
              </div>
              <button 
                v-if="canInviteCompany && !participatingUnits.supervisoryCompany"
                class="btn btn-sm btn-info"
                @click="openAddCompanyModal('SUPERVISOR')"
              >
                <i class="fa fa-plus me-1"></i>加入
              </button>
            </div>
            
            <div class="flex-grow-1 d-flex flex-column">
              <div v-if="participatingUnits.supervisoryCompany" class="custom-company-card supervisor">
                <div class="card-content p-3">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0 fw-bold fs-4 text-info">{{ participatingUnits.supervisoryCompany.companyName }}</h6>
                    <div class="dropdown ms-2" v-if="canInviteCompany">
                      <button class="btn btn-icon btn-sm btn-light text-muted" type="button" data-bs-toggle="dropdown">
                        <i class="fa fa-ellipsis-v"></i>
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                          <a class="dropdown-item text-danger" href="javascript:;" @click="removeCompany(participatingUnits.supervisoryCompany!)">
                            <i class="fa fa-trash-alt me-2"></i>移除
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div class="d-flex align-items-center flex-wrap gap-2 mb-3">
                    <span 
                      class="badge border px-2 py-1 rounded fs-6"
                      :class="`border-${getCompanyTypeColor(participatingUnits.supervisoryCompany.companyType)} text-${getCompanyTypeColor(participatingUnits.supervisoryCompany.companyType)}`"
                    >
                      {{ getCompanyTypeLabel(participatingUnits.supervisoryCompany.companyType) }}
                    </span>
                  </div>

                  <div class="row g-2 mt-auto">
                    <div class="col-6">
                      <div class="d-flex align-items-center text-muted">
                        <i class="fa fa-id-card me-2 opacity-50 fs-5"></i>
                        <span class="fs-6">{{ participatingUnits.supervisoryCompany.companyUnifiedNumber }}</span>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="d-flex align-items-center justify-content-end text-muted">
                        <i class="fa fa-calendar me-2 opacity-50 fs-5"></i>
                        <span class="fs-6">{{ new Date(participatingUnits.supervisoryCompany.joinedAt!).toLocaleDateString() }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div 
                v-else 
                class="empty-state custom-company-card border-dashed p-3 d-flex align-items-center justify-content-center"
              >
                <div class="d-flex flex-column align-items-center">
                  <i class="fa fa-eye mb-2 fs-3 text-muted opacity-50"></i>
                  <h6 class="text-muted mb-1">尚未設定監造單位</h6>
                  <button 
                    v-if="canInviteCompany"
                    class="btn btn-sm btn-theme mt-2"
                    @click="openAddCompanyModal('SUPERVISOR')"
                  >
                    <i class="fa fa-plus me-1"></i>加入監造單位
                  </button>
                  <p v-else class="text-muted mb-0 small">如需添加，請聯繫客服</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第三方公司區塊 -->
      <div class="role-section">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div class="d-flex align-items-center">
            <div class="role-icon-wrapper me-3 third-party">
              <i class="fa fa-users"></i>
            </div>
            <div>
              <h5 class="mb-0 fw-bold">第三方公司</h5>
              <span class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px">可多個</span>
            </div>
          </div>
          <button 
            v-if="canInviteCompany"
            class="btn btn-sm btn-success"
            @click="openAddCompanyModal('THIRD_PARTY')"
          >
            <i class="fa fa-plus me-1"></i>加入公司
          </button>
        </div>
        
        <div v-if="participatingUnits.otherCompanies.length > 0" class="third-party-grid">
          <div 
            v-for="company in participatingUnits.otherCompanies" 
            :key="company.companyId"
            class="custom-company-card third-party"
          >
            <div class="card-content p-3">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h6 class="mb-0 fw-bold fs-5 text-success">{{ company.companyName }}</h6>
                <div class="dropdown ms-2" v-if="canInviteCompany">
                  <button class="btn btn-icon btn-sm btn-light text-muted" type="button" data-bs-toggle="dropdown">
                    <i class="fa fa-ellipsis-v"></i>
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                      <a class="dropdown-item text-danger" href="javascript:;" @click="removeCompany(company)">
                        <i class="fa fa-trash-alt me-2"></i>移除
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="d-flex align-items-center flex-wrap gap-2 mb-3">
                <span 
                  class="badge border px-2 py-1 rounded fs-6"
                  :class="`border-${getCompanyTypeColor(company.companyType)} text-${getCompanyTypeColor(company.companyType)}`"
                >
                  {{ getCompanyTypeLabel(company.companyType) }}
                </span>
              </div>

              <div class="row g-2 mt-auto">
                <div class="col-6">
                  <div class="d-flex align-items-center text-muted">
                    <i class="fa fa-id-card me-2 opacity-50 fs-5"></i>
                    <span class="fs-6">{{ company.companyUnifiedNumber }}</span>
                  </div>
                </div>
                <div class="col-6">
                  <div class="d-flex align-items-center justify-content-end text-muted">
                    <i class="fa fa-calendar me-2 opacity-50 fs-5"></i>
                    <span class="fs-6">{{ new Date(company.joinedAt!).toLocaleDateString() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-state custom-company-card border-dashed p-3 d-flex align-items-center justify-content-center">
          <div class="d-flex flex-column align-items-center">
            <i class="fa fa-users mb-2 fs-3 text-muted opacity-50"></i>
            <h6 class="text-muted mb-1">尚未設定第三方公司</h6>
            <button 
              v-if="canInviteCompany"
              class="btn btn-sm btn-theme mt-2"
              @click="openAddCompanyModal('THIRD_PARTY')"
            >
              <i class="fa fa-plus me-1"></i>加入第三方公司
            </button>
            <p v-else class="text-muted mb-0 small">如需添加，請聯繫客服</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 加入公司模態框 -->
    <Modal v-model:show="showAddCompanyModal" title="加入公司到工作空間" size="lg">
      <template #footer>
        <div class="d-flex flex-column align-items-stretch w-100 gap-2">
          <div v-if="addCompanyError" class="alert alert-danger py-2 mb-0 small" role="alert">
            {{ addCompanyError }}
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" @click="closeAddCompanyModal">取消</button>
            <button
              type="button"
              class="btn btn-theme"
              @click="addCompany"
              :disabled="!selectedCompany || !addCompanyForm.role || isAddingCompany"
            >
              <span v-if="isAddingCompany" class="spinner-border spinner-border-sm me-1"></span>
              加入公司
            </button>
          </div>
        </div>
      </template>

      <form @submit.prevent="addCompany">
        <div class="mb-3">
          <label class="form-label">搜尋公司 <span class="text-danger">*</span></label>
          <div class="input-group">
            <input 
              v-model="addCompanyForm.searchKeyword"
              type="text" 
              class="form-control"
              :class="{ 'is-invalid': searchError }"
              placeholder="請輸入公司名稱或統一編號"
              @input="searchError = ''; searchedCompanies = []"
              @keyup.enter="searchCompanies"
              required
            >
            <button 
              type="button"
              class="btn btn-outline-primary"
              @click="searchCompanies"
              :disabled="isSearchingCompany || !addCompanyForm.searchKeyword.trim()"
            >
              <span v-if="isSearchingCompany" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="fa fa-search me-1"></i>
              搜尋
            </button>
          </div>
          <div v-if="searchError" class="invalid-feedback d-block">
            {{ searchError }}
          </div>
          <div class="form-text">
            可輸入公司名稱或統一編號進行搜尋
          </div>
        </div>

        <!-- 搜尋結果列表 -->
        <div v-if="searchedCompanies.length > 0" class="mb-3">
          <label class="form-label">搜尋結果</label>
          <div class="company-search-results" style="max-height: 300px; overflow-y: auto;">
            <button
              v-for="company in searchedCompanies"
              :key="company.companyId"
              type="button"
              class="company-result-item"
              :class="{ 'selected': addCompanyForm.companyId === company.companyId }"
              @click="selectCompany(company)"
            >
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="fw-bold">{{ company.companyName }}</div>
                  <small class="text-muted">統一編號：{{ company.companyUnifiedNumber }}</small>
                </div>
                <span class="badge bg-success">{{ getCompanyTypeLabel(company.companyType) }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 已選擇的公司信息 -->
        <div v-if="selectedCompany" class="mb-3">
          <label class="form-label">已選擇的公司</label>
          <div class="selected-company-card">
            <div class="d-flex align-items-center p-3">
              <div class="flex-grow-1">
                <div class="fw-600">{{ selectedCompany.companyName }}</div>
                <div class="small text-muted">統一編號：{{ selectedCompany.companyUnifiedNumber }}</div>
              </div>
              <span class="badge bg-success">{{ getCompanyTypeLabel(selectedCompany.companyType) }}</span>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">公司角色 <span class="text-danger">*</span></label>
          <select v-model="addCompanyForm.role" class="form-select" required :disabled="!!addCompanyForm.role">
            <option value="" disabled>請選擇角色</option>
            <option 
              v-for="option in availableRoles" 
              :key="option.value" 
              :value="option.value"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { workspaceApi, type ParticipatingUnitsResponse, type WorkspaceCompany } from '@/api/workspace'
import { COMPANY_TYPE_OPTIONS, CONTRACTOR_LEVEL_OPTIONS } from '@/api/company'
import { getCurrentInstance } from 'vue'
import Modal from '@/components/bootstrap/Modal.vue'

const props = defineProps<{
  workspaceId: string
  isAdminMode?: boolean // 管理員模式，允許所有操作
}>()

const { proxy } = getCurrentInstance() as any
const workspaceStore = useWorkspaceStore()

// 狀態
const isLoading = ref(false)
const showAddCompanyModal = ref(false)
const participatingUnits = ref<ParticipatingUnitsResponse>({
  supervisoryCompany: null,
  contractorCompany: null,
  otherCompanies: []
})

// 加入公司表單
const addCompanyForm = ref({
  searchKeyword: '',
  companyId: '',
  role: '' as 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY' | ''
})

// 搜尋到的公司列表
const searchedCompanies = ref<{
  companyId: string
  companyName: string
  companyUnifiedNumber: string
  companyType: 'CONTRACTOR' | 'SUPERVISION' | 'CONSULTING' | 'OTHER'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'SPECIAL'
}[]>([])

// 已選擇的公司
const selectedCompany = ref<{
  companyId: string
  companyName: string
  companyUnifiedNumber: string
  companyType: 'CONTRACTOR' | 'SUPERVISION' | 'CONSULTING' | 'OTHER'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'SPECIAL'
} | null>(null)

// 搜尋狀態
const isSearchingCompany = ref(false)
const searchError = ref('')
const addCompanyError = ref('')
const isAddingCompany = ref(false)

// 權限檢查（管理員模式下允許所有操作）
const canInviteCompany = computed(() => {
  return props.isAdminMode || (workspaceStore.currentWorkspace?.role === 'OWNER' || workspaceStore.currentWorkspace?.role === 'ADMIN')
})

// 可用的邀請角色
const availableRoles = computed(() => {
  const roles: { value: 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY', label: string, disabled: boolean }[] = [
    { 
      value: 'MAIN_CONTRACTOR', 
      label: '主要承包商', 
      disabled: !props.isAdminMode && !!participatingUnits.value.contractorCompany
    },
    { 
      value: 'SUPERVISOR', 
      label: '監造單位', 
      disabled: !props.isAdminMode && !!participatingUnits.value.supervisoryCompany
    },
    { 
      value: 'THIRD_PARTY', 
      label: '第三方公司', 
      disabled: false // 第三方公司可以邀請多間
    }
  ]
  return roles
})

// 載入參與單位資料
const loadData = async () => {
  if (!props.workspaceId) return
  
  isLoading.value = true
  try {
    const response = await workspaceApi.getParticipatingUnits(props.workspaceId)
    participatingUnits.value = response
  } catch (error) {
    console.error('載入參與單位失敗:', error)
    proxy?.$toast?.error('載入參與單位資料失敗')
  } finally {
    isLoading.value = false
  }
}

// 移除公司
const removeCompany = async (company: WorkspaceCompany) => {
  if (!props.workspaceId || !company.companyId) return
  
  const confirmMessage = `確定要移除「${company.companyName}」嗎？\n注意：此操作將移除該公司及其所有成員的工作空間關聯。`
  
  if (!confirm(confirmMessage)) return
  
  try {
    await workspaceApi.removeCompanyFromWorkspace(props.workspaceId, company.companyId)
    proxy?.$toast?.success('公司已成功移除')
    await loadData()
  } catch (error: any) {
    console.error('移除公司失敗:', error)
    proxy?.$toast?.error(error.response?.data?.message || '移除公司失敗')
  }
}

// 打開加入公司模態框
const openAddCompanyModal = (role?: 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY') => {
  addCompanyForm.value = {
    searchKeyword: '',
    companyId: '',
    role: role || ''
  }
  searchedCompanies.value = []
  selectedCompany.value = null
  searchError.value = ''
  addCompanyError.value = ''
  showAddCompanyModal.value = true
}

// 關閉加入公司模態框
const closeAddCompanyModal = () => {
  showAddCompanyModal.value = false
  addCompanyForm.value = {
    searchKeyword: '',
    companyId: '',
    role: ''
  }
  searchedCompanies.value = []
  selectedCompany.value = null
  searchError.value = ''
  addCompanyError.value = ''
}

// 獲取已存在於工作空間的公司 ID 列表
const getExistingCompanyIds = (): string[] => {
  const existingIds: string[] = []
  
  // 檢查營造公司
  if (participatingUnits.value.contractorCompany?.companyId) {
    existingIds.push(participatingUnits.value.contractorCompany.companyId)
  }
  
  // 檢查監造公司
  if (participatingUnits.value.supervisoryCompany?.companyId) {
    existingIds.push(participatingUnits.value.supervisoryCompany.companyId)
  }
  
  // 檢查第三方公司
  participatingUnits.value.otherCompanies.forEach(company => {
    if (company.companyId) {
      existingIds.push(company.companyId)
    }
  })
  
  return existingIds
}

// 搜尋公司（支援公司名稱和統一編號）
const searchCompanies = async () => {
  const keyword = addCompanyForm.value.searchKeyword.trim()
  
  if (!keyword) {
    searchError.value = '請輸入公司名稱或統一編號'
    searchedCompanies.value = []
    return
  }

  if (!props.workspaceId) {
    searchError.value = '缺少工作空間 ID'
    return
  }

  isSearchingCompany.value = true
  searchError.value = ''
  
  try {
    // 確保參與單位資料已載入
    if (!participatingUnits.value.contractorCompany && 
        !participatingUnits.value.supervisoryCompany && 
        participatingUnits.value.otherCompanies.length === 0) {
      // 如果參與單位資料為空，先載入一次
      await loadData()
    }
    
    // 使用 searchAvailableCompanies API，支援公司名稱和統一編號搜尋
    // 後端已經會過濾掉已存在於工作空間的公司，但為了確保，前端也做一次過濾
    const companies = await workspaceApi.searchAvailableCompanies(props.workspaceId, keyword)
    
    if (companies && companies.length > 0) {
      // 再次過濾掉已經在工作空間中的公司（雙重保險）
      const existingCompanyIds = getExistingCompanyIds()
      const filteredCompanies = companies.filter(
        company => !existingCompanyIds.includes(company.companyId)
      )
      
      if (filteredCompanies.length > 0) {
        searchedCompanies.value = filteredCompanies
        searchError.value = ''
      } else {
        searchedCompanies.value = []
        searchError.value = '所有符合條件的公司都已經在此工作空間中'
      }
    } else {
      searchedCompanies.value = []
      searchError.value = '找不到符合條件的公司，請確認搜尋關鍵字是否正確'
    }
  } catch (error: any) {
    console.error('Failed to search companies:', error)
    searchError.value = error.response?.data?.message || '搜尋公司時發生錯誤，請稍後再試'
    searchedCompanies.value = []
  } finally {
    isSearchingCompany.value = false
  }
}

// 選擇公司
const selectCompany = (company: {
  companyId: string
  companyName: string
  companyUnifiedNumber: string
  companyType: 'CONTRACTOR' | 'SUPERVISION' | 'CONSULTING' | 'OTHER'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'SPECIAL'
}) => {
  selectedCompany.value = company
  addCompanyForm.value.companyId = company.companyId
}

// 加入公司（管理員直接加入，不需要邀請）
const addCompany = async () => {
  if (!props.workspaceId || !addCompanyForm.value.companyId || !addCompanyForm.value.role) {
    return
  }

  isAddingCompany.value = true
  addCompanyError.value = ''
  try {
    // 轉換角色為公司類型
    let companyType: 'CONTRACTOR' | 'SUPERVISION' | 'OTHER' = 'OTHER'
    switch (addCompanyForm.value.role) {
      case 'MAIN_CONTRACTOR':
        companyType = 'CONTRACTOR'
        break
      case 'SUPERVISOR':
        companyType = 'SUPERVISION'
        break
      case 'THIRD_PARTY':
        companyType = 'OTHER'
        break
    }

    // 管理員模式下直接加入公司（後端會自動處理為 ACTIVE 狀態）
    await workspaceStore.inviteCompanyToWorkspace(props.workspaceId, {
      companyId: addCompanyForm.value.companyId,
      role: addCompanyForm.value.role,
      companyType: companyType,
      message: '' // 管理員直接加入，不需要訊息
    })
    
    proxy?.$toast?.success('公司已成功加入工作空間')
    closeAddCompanyModal()
    await loadData() // 重新載入數據
  } catch (error: any) {
    console.error('Failed to add company:', error)
    const msg = error.response?.data?.message || error.message || '加入公司失敗'
    addCompanyError.value = msg
    proxy?.$toast?.error(msg)
  } finally {
    isAddingCompany.value = false
  }
}


// Helper 函數
const getCompanyTypeLabel = (type: string) => {
  return COMPANY_TYPE_OPTIONS.find(option => option.value === type)?.label || type
}

const getCompanyTypeColor = (type: string) => {
  return COMPANY_TYPE_OPTIONS.find(option => option.value === type)?.color || 'secondary'
}

const getContractorLevelLabel = (level?: string) => {
  if (!level) return ''
  return CONTRACTOR_LEVEL_OPTIONS.find(option => option.value === level)?.label || level
}

const getContractorLevelColor = (level?: string) => {
  if (!level) return 'secondary'
  return CONTRACTOR_LEVEL_OPTIONS.find(option => option.value === level)?.color || 'secondary'
}

// 監聽 workspaceId 變化
watch(() => props.workspaceId, (newId) => {
  if (newId) {
    loadData()
  }
}, { immediate: true })

// 初始化
onMounted(() => {
  if (props.workspaceId) {
    loadData()
  }
})
</script>

<style scoped>
/* 複用 ParticipationUnits 的樣式 */
.participation-units-content {
  padding: 0;
}

.company-roles-container {
  max-width: 100%;
}

.role-section {
  border-radius: 1rem;
  padding: 1.5rem;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  transition: all 0.3s ease;
  min-height: 300px;
}

.role-section:hover {
  background: var(--bs-body-bg);
  border-color: var(--bs-border-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.role-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bs-primary) 0%, rgba(var(--bs-primary-rgb), 0.8) 100%);
  color: white;
  font-size: 1.2rem;
  box-shadow: 0 4px 12px rgba(var(--bs-primary-rgb), 0.3);
}

.role-icon-wrapper.supervisor {
  background: linear-gradient(135deg, var(--bs-info) 0%, rgba(var(--bs-info-rgb), 0.8) 100%);
  box-shadow: 0 4px 12px rgba(var(--bs-info-rgb), 0.3);
}

.role-icon-wrapper.third-party {
  background: linear-gradient(135deg, var(--bs-success) 0%, rgba(var(--bs-success-rgb), 0.8) 100%);
  box-shadow: 0 4px 12px rgba(var(--bs-success-rgb), 0.3);
}

.custom-company-card {
  background: var(--bs-body-bg);
  border-radius: 12px;
  border: 1px solid var(--bs-border-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.custom-company-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.custom-company-card.main-contractor {
  border-left: 4px solid var(--bs-primary);
}

.custom-company-card.supervisor {
  border-left: 4px solid var(--bs-info);
}

.custom-company-card.third-party {
  border-left: 4px solid var(--bs-success);
}

.empty-state {
  min-height: 200px;
  border: 2px dashed var(--bs-border-color);
  border-radius: 8px;
  background: rgba(var(--bs-theme-rgb), 0.02);
}

.third-party-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

/* 搜尋結果列表樣式 */
.company-search-results {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  background: var(--bs-body-bg);
}

.company-result-item {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-bottom: 1px solid var(--bs-border-color);
  background: var(--bs-body-bg);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.company-result-item:last-child {
  border-bottom: none;
}

.company-result-item:hover {
  background: var(--bs-secondary-bg);
}

.company-result-item.selected {
  background: var(--bs-primary-bg-subtle);
  border-left: 3px solid var(--bs-primary);
  font-weight: 600;
}

.company-result-item.selected:hover {
  background: var(--bs-primary-bg-subtle);
}

/* 已選擇的公司卡片樣式 */
.selected-company-card {
  border: 2px solid var(--bs-success);
  border-radius: 0.375rem;
  background: var(--bs-success-bg-subtle);
  transition: all 0.2s ease;
}

/* 確保 ellipsis 按鈕在黑暗模式下正確顯示 */
.btn-icon {
  background-color: var(--bs-secondary-bg) !important;
  color: var(--bs-body-color) !important;
  border-color: var(--bs-border-color) !important;
}

.btn-icon:hover {
  background-color: var(--bs-danger-bg-subtle) !important;
  color: var(--bs-danger) !important;
}
</style>
