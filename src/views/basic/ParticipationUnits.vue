<template>
  <div class="participation-units-page">
    <!-- 頁面標題 -->
    <PageHeader
      title="參與單位管理"
      icon="bi bi-people"
      :breadcrumbs="[
        { text: '基本資料管理', href: 'javascript:;' },
        { text: '參與單位管理', active: true }
      ]"
    />

    <div class="row">
      <div class="col-xl-12">
        
        <!-- 載入狀態 -->
        <div v-if="isLoading" class="text-center py-5">
          <div class="spinner-border text-theme" role="status">
            <span class="visually-hidden">載入中...</span>
          </div>
          <div class="mt-2 text-muted">載入參與單位資料中...</div>
        </div>

        <!-- 沒有工作空間時的提示 -->
        <div v-else-if="!workspaceStore.currentWorkspace" class="text-center py-5">
          <i class="fa fa-exclamation-triangle fa-3x text-warning mb-3"></i>
          <h5 class="text-muted">無法載入參與單位資料</h5>
          <p class="text-muted mb-3">請先選擇工作空間</p>
          <button 
            class="btn btn-theme"
            @click="loadData"
          >
            <i class="fa fa-refresh me-2"></i>
            重新載入
          </button>
        </div>

        <div v-else class="workspace-company-management">
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
                  </div>
                  
                  <div class="flex-grow-1 d-flex flex-column">
                    <div v-if="workspaceStore.mainContractor" class="custom-company-card main-contractor">
                      <div class="card-content p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                          <h6 class="mb-0 fw-bold fs-4 text-primary">{{ workspaceStore.mainContractor.companyName }}</h6>
                          <div class="dropdown ms-2" v-if="showCompanyDropdown(workspaceStore.mainContractor)">
                            <button class="btn btn-icon btn-sm btn-light text-muted" type="button" data-bs-toggle="dropdown">
                              <i class="fa fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                              <template v-if="canEditCompany(workspaceStore.mainContractor?.companyId)">
                                <li>
                                  <a class="dropdown-item" href="javascript:;" @click="openEditCompanyModal(workspaceStore.mainContractor)">
                                    <i class="fa fa-pen me-2"></i>編輯公司
                                  </a>
                                </li>
                                <li>
                                  <a class="dropdown-item" href="javascript:;" @click="goToCompanyMembers(workspaceStore.mainContractor!.companyId!)">
                                    <i class="fa fa-users me-2"></i>人員管理
                                  </a>
                                </li>
                                <li>
                                  <a class="dropdown-item" href="javascript:;" @click="goToSitePersonnel(workspaceStore.mainContractor!.companyId!)">
                                    <i class="fa fa-hard-hat me-2"></i>工地人員
                                  </a>
                                </li>
                                <li v-if="canInviteCompany"><hr class="dropdown-divider"></li>
                              </template>
                              <template v-if="canInviteCompany">
                                <li>
                                  <a class="dropdown-item text-danger" href="javascript:;" @click="changeCompanyRole(workspaceStore.mainContractor, 'OTHER')">
                                    <i class="fa fa-arrow-down me-2"></i>降級為第三方公司
                                  </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                  <a class="dropdown-item text-danger" href="javascript:;" @click="openRemovalModal(workspaceStore.mainContractor)">
                                    <i class="fa fa-trash-alt me-2"></i>請求移除
                                  </a>
                                </li>
                              </template>
                            </ul>
                          </div>
                        </div>
                        
                        <div class="d-flex align-items-center flex-wrap gap-2 mb-3">
                           <span 
                            class="badge border px-2 py-1 rounded fs-6"
                            :class="`border-${getCompanyTypeColor(workspaceStore.mainContractor.companyType)} text-${getCompanyTypeColor(workspaceStore.mainContractor.companyType)}`"
                          >
                            {{ getCompanyTypeLabel(workspaceStore.mainContractor.companyType) }}
                          </span>
                          <span 
                            v-if="workspaceStore.mainContractor.contractorLevel"
                            class="badge border px-2 py-1 rounded fs-6"
                            :class="`border-${getContractorLevelColor(workspaceStore.mainContractor.contractorLevel)} text-${getContractorLevelColor(workspaceStore.mainContractor.contractorLevel)}`"
                          >
                            {{ getContractorLevelLabel(workspaceStore.mainContractor.contractorLevel) }}
                          </span>
                        </div>

                        <div class="row g-2 mt-auto">
                          <div class="col-6">
                            <div class="d-flex align-items-center text-muted">
                              <i class="fa fa-id-card me-2 opacity-50 fs-5"></i>
                              <span class="fs-6">{{ workspaceStore.mainContractor.companyUnifiedNumber }}</span>
                            </div>
                          </div>
                          <div class="col-6">
                            <div class="d-flex align-items-center justify-content-end text-muted">
                              <i class="fa fa-calendar me-2 opacity-50 fs-5"></i>
                              <span class="fs-6">{{ new Date(workspaceStore.mainContractor.joinedAt).toLocaleDateString() }}</span>
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
                        <i class="fa fa-headset mb-2 fs-3 text-muted opacity-50"></i>
                        <h6 class="text-muted mb-1">尚未設定營造單位</h6>
                        <p class="text-muted mb-0 small">如需添加，請聯繫客服</p>
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
                  </div>
                  
                  <div class="flex-grow-1 d-flex flex-column">
                    <div v-if="workspaceStore.supervisor" class="custom-company-card supervisor">
                      <div class="card-content p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                          <h6 class="mb-0 fw-bold fs-4 text-info">{{ workspaceStore.supervisor.companyName }}</h6>
                          <div class="dropdown ms-2" v-if="showCompanyDropdown(workspaceStore.supervisor)">
                            <button class="btn btn-icon btn-sm btn-light text-muted" type="button" data-bs-toggle="dropdown">
                              <i class="fa fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                              <template v-if="canEditCompany(workspaceStore.supervisor?.companyId)">
                                <li>
                                  <a class="dropdown-item" href="javascript:;" @click="openEditCompanyModal(workspaceStore.supervisor)">
                                    <i class="fa fa-pen me-2"></i>編輯公司
                                  </a>
                                </li>
                                <li>
                                  <a class="dropdown-item" href="javascript:;" @click="goToCompanyMembers(workspaceStore.supervisor!.companyId!)">
                                    <i class="fa fa-users me-2"></i>人員管理
                                  </a>
                                </li>
                                <li>
                                  <a class="dropdown-item" href="javascript:;" @click="goToSitePersonnel(workspaceStore.supervisor!.companyId!)">
                                    <i class="fa fa-hard-hat me-2"></i>工地人員
                                  </a>
                                </li>
                                <li v-if="canInviteCompany"><hr class="dropdown-divider"></li>
                              </template>
                              <template v-if="canInviteCompany">
                                <li>
                                  <a class="dropdown-item text-danger" href="javascript:;" @click="changeCompanyRole(workspaceStore.supervisor, 'OTHER')">
                                    <i class="fa fa-arrow-down me-2"></i>降級為第三方公司
                                  </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                  <a class="dropdown-item text-danger" href="javascript:;" @click="openRemovalModal(workspaceStore.supervisor)">
                                    <i class="fa fa-trash-alt me-2"></i>請求移除
                                  </a>
                                </li>
                              </template>
                            </ul>
                          </div>
                        </div>

                        <div class="d-flex align-items-center flex-wrap gap-2 mb-3">
                           <span 
                              class="badge border px-2 py-1 rounded fs-6"
                              :class="`border-${getCompanyTypeColor(workspaceStore.supervisor.companyType)} text-${getCompanyTypeColor(workspaceStore.supervisor.companyType)}`"
                            >
                              {{ getCompanyTypeLabel(workspaceStore.supervisor.companyType) }}
                            </span>
                        </div>

                        <div class="row g-2 mt-auto">
                          <div class="col-6">
                            <div class="d-flex align-items-center text-muted">
                              <i class="fa fa-id-card me-2 opacity-50 fs-5"></i>
                              <span class="fs-6">{{ workspaceStore.supervisor.companyUnifiedNumber }}</span>
                            </div>
                          </div>
                          <div class="col-6">
                            <div class="d-flex align-items-center justify-content-end text-muted">
                              <i class="fa fa-calendar me-2 opacity-50 fs-5"></i>
                              <span class="fs-6">{{ new Date(workspaceStore.supervisor.joinedAt).toLocaleDateString() }}</span>
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
                        <i class="fa fa-headset mb-2 fs-3 text-muted opacity-50"></i>
                        <h6 class="text-muted mb-1">尚未設定監造單位</h6>
                        <p class="text-muted mb-0 small">如需添加，請聯繫客服</p>
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
              </div>
              
              <div v-if="workspaceStore.thirdPartyCompanies.length > 0" class="third-party-grid">
                <div 
                  v-for="company in workspaceStore.thirdPartyCompanies" 
                  :key="company.companyId"
                  class="custom-company-card third-party"
                >
                  <div class="card-content p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                      <h6 class="mb-0 fw-bold fs-5 text-success">{{ company.companyName }}</h6>
                      <div class="dropdown ms-2" v-if="showCompanyDropdown(company)">
                        <button class="btn btn-icon btn-sm btn-light text-muted" type="button" data-bs-toggle="dropdown">
                          <i class="fa fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                          <template v-if="canEditCompany(company.companyId)">
                            <li>
                              <a class="dropdown-item" href="javascript:;" @click="openEditCompanyModal(company)">
                                <i class="fa fa-pen me-2"></i>編輯公司
                              </a>
                            </li>
                            <li>
                              <a class="dropdown-item" href="javascript:;" @click="goToCompanyMembers(company.companyId!)">
                                <i class="fa fa-users me-2"></i>人員管理
                              </a>
                            </li>
                            <li>
                              <a class="dropdown-item" href="javascript:;" @click="goToSitePersonnel(company.companyId!)">
                                <i class="fa fa-hard-hat me-2"></i>工地人員
                              </a>
                            </li>
                            <li v-if="canInviteCompany"><hr class="dropdown-divider"></li>
                          </template>
                          <template v-if="canInviteCompany">
                            <li>
                              <a class="dropdown-item" href="javascript:;" @click="changeCompanyRole(company, 'CONTRACTOR')">
                                <i class="fa fa-hard-hat me-2 text-primary"></i>設為主要承包商
                              </a>
                            </li>
                            <li>
                              <a class="dropdown-item" href="javascript:;" @click="changeCompanyRole(company, 'SUPERVISION')">
                                <i class="fa fa-eye me-2 text-info"></i>設為監造單位
                              </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                              <a class="dropdown-item text-danger" href="javascript:;" @click="openRemovalModal(company)">
                                <i class="fa fa-trash-alt me-2"></i>請求移除
                              </a>
                            </li>
                          </template>
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
                          <span class="fs-6">{{ new Date(company.joinedAt).toLocaleDateString() }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-else class="empty-state custom-company-card border-dashed p-3 d-flex align-items-center justify-content-center">
                <div class="d-flex flex-column align-items-center">
                  <i class="fa fa-headset mb-2 fs-3 text-muted opacity-50"></i>
                  <h6 class="text-muted mb-1">尚未設定第三方公司</h6>
                  <p class="text-muted mb-0 small">如需添加，請聯繫客服</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 待處理邀請和移除請求 -->

        </div>
      </div>
    </div>

    <!-- 邀請公司模態框 -->
    <Modal v-model:show="showInviteModal" title="邀請公司加入工作空間" size="lg">
      <form @submit.prevent="inviteCompany">
        <div class="mb-3">
          <label class="form-label">公司代碼 <span class="text-danger">*</span></label>
          <div class="input-group">
            <input 
              v-model="inviteForm.companyCode"
              type="text" 
              class="form-control"
              :class="{ 'is-invalid': searchError }"
              placeholder="請輸入公司代碼"
              @input="searchError = ''; searchedCompany = null"
              required
            >
            <button 
              type="button"
              class="btn btn-outline-primary"
              @click="searchCompanyByCode"
              :disabled="isSearchingCompany || !inviteForm.companyCode.trim()"
            >
              <span v-if="isSearchingCompany" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="fa fa-search me-1"></i>
              搜索
            </button>
          </div>
          <div v-if="searchError" class="invalid-feedback d-block">
            {{ searchError }}
          </div>
          <div class="form-text">
            請輸入要邀請公司在系統中的唯一代碼
          </div>
        </div>

        <!-- 搜索到的公司信息 -->
        <div v-if="searchedCompany" class="mb-3">
          <label class="form-label">公司信息</label>
          <div class="card border-success">
            <div class="card-body py-2">
              <div class="d-flex align-items-center">
                <div class="flex-grow-1">
                  <div class="fw-600">{{ searchedCompany.companyName }}</div>
                  <div class="small text-muted">{{ searchedCompany.companyUnifiedNumber }}</div>
                </div>
                <span class="badge bg-success">{{ getCompanyTypeLabel(searchedCompany.companyType) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">邀請角色 <span class="text-danger">*</span></label>
          <select v-model="inviteForm.role" class="form-select" required :disabled="!!inviteForm.role">
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

        <div class="mb-3">
          <label class="form-label">邀請訊息</label>
          <textarea 
            v-model="inviteForm.message" 
            class="form-control" 
            rows="3" 
            placeholder="請輸入想傳達給對方的訊息..."
          ></textarea>
        </div>

        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" @click="closeInviteModal">取消</button>
          <button type="submit" class="btn btn-theme" :disabled="!searchedCompany || !inviteForm.role">發送邀請</button>
        </div>
      </form>
    </Modal>

    <!-- 移除請求模態框 -->
    <Modal v-model:show="showRemovalModal" title="請求移除公司" size="lg">
      <form @submit.prevent="requestRemoval">
        <div class="alert alert-warning">
          <i class="fa fa-exclamation-triangle me-2"></i>
          您確定要請求移除此公司嗎？這可能會影響相關的工程案運作。
        </div>

        <div class="mb-3" v-if="selectedCompanyForRemoval">
          <label class="form-label">欲移除的公司</label>
          <input type="text" class="form-control" :value="selectedCompanyForRemoval.companyName" disabled>
        </div>

        <div class="mb-3">
          <label class="form-label">移除原因 <span class="text-danger">*</span></label>
          <select v-model="removalForm.reason" class="form-select" required>
            <option value="" disabled>請選擇原因</option>
            <option value="合作結束">合作結束</option>
            <option value="合約終止">合約終止</option>
            <option value="資訊錯誤">資訊錯誤</option>
            <option value="其他">其他</option>
          </select>
        </div>

        <!-- 請求類型選擇 (隱藏，默認為協議移除) -->
        
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" @click="closeRemovalModal">取消</button>
          <button type="submit" class="btn btn-danger">發送移除請求</button>
        </div>
      </form>
    </Modal>

    <!-- 編輯公司模態框 -->
    <CompanyFormModal
      v-model:show="showEditCompanyModal"
      :company="editingCompany"
      @hide="closeEditCompanyModal"
      @submit="handleCompanyFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useCompanyStore, type Company } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { COMPANY_TYPE_OPTIONS, CONTRACTOR_LEVEL_OPTIONS, type CreateCompanyRequest } from '@/api/company'
import { workspaceApi, type WorkspaceCompany } from '@/api/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import CompanyFormModal from '@/components/company/CompanyFormModal.vue'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const companyStore = useCompanyStore()
const authStore = useAuthStore()
const { proxy } = getCurrentInstance() as any

// 狀態
const isLoading = ref(false)
const showInviteModal = ref(false)
const showRemovalModal = ref(false)
const showEditCompanyModal = ref(false)
const editingCompany = ref<Company | null>(null)

// 邀請公司表單
const   inviteForm = ref({
    companyCode: '',
    companyId: '',
    role: '' as 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY' | '',
    message: ''
  })

// 搜索到的公司信息
const searchedCompany = ref<{
  companyId: string
  companyName: string
  companyUnifiedNumber: string
  companyType: 'CONTRACTOR' | 'SUPERVISION' | 'CONSULTING' | 'OTHER'
  contractorLevel?: 'CLASS_A' | 'CLASS_B' | 'CLASS_C' | 'SPECIAL'
} | null>(null)

// 搜索狀態
const isSearchingCompany = ref(false)
const searchError = ref('')

// 移除公司表單
const removalForm = ref({
  companyId: '',
  reason: '',
  requestType: 'MUTUAL_AGREEMENT' as 'MUTUAL_AGREEMENT' | 'CUSTOMER_SERVICE',
  customerServiceNote: ''
})

// 當前選中的公司用於移除
const selectedCompanyForRemoval = ref<any>(null)

// 基於當前工作空間的權限檢查
const canInviteCompany = computed(() => {
  return workspaceStore.currentWorkspace?.role === 'OWNER' || workspaceStore.currentWorkspace?.role === 'ADMIN'
})

const canInviteContractor = computed(() => {
  return workspaceStore.canInviteContractor
})

const canInviteSupervisor = computed(() => {
  return workspaceStore.canInviteSupervisor
})

// 注意：設計單位已移除，改為工程案層級的基本資料

const canInviteThirdParty = computed(() => {
  return canInviteCompany.value // 第三方公司可以邀請多間
})

const canEditCompany = (companyId?: string): boolean => {
  if (!companyId) return false
  const company = companyStore.getCompanyById(companyId) as Company | undefined
  if (!company) return false
  const role = company.companyPermission || company.userRole
  return role === 'OWNER' || role === 'ADMIN'
}

const showCompanyDropdown = (company: WorkspaceCompany | null | undefined): boolean => {
  if (!company) return false
  return canInviteCompany.value || canEditCompany(company.companyId)
}

const availableRoles = computed(() => {
  const roles: { value: 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY', label: string, disabled: boolean }[] = [
    { 
      value: 'MAIN_CONTRACTOR', 
      label: '主要承包商', 
      disabled: !canInviteContractor.value 
    },
    { 
      value: 'SUPERVISOR', 
      label: '監造單位', 
      disabled: !canInviteSupervisor.value 
    },
    { 
      value: 'THIRD_PARTY', 
      label: '第三方公司', 
      disabled: !canInviteThirdParty.value 
    }
    // 注意：設計單位已移除，改為工程案層級的基本資料
  ]
  // 如果已經選擇了邀請角色，則不過濾
  if (inviteForm.value.role) {
    return roles
  }
  return roles
})

// 方法
const loadData = async () => {
  if (!workspaceStore.currentWorkspace) return
  
  isLoading.value = true
  try {
    await Promise.all([
      workspaceStore.fetchParticipatingUnits(workspaceStore.currentWorkspace.id),
      workspaceStore.searchAvailableCompanies(workspaceStore.currentWorkspace.id),
      companyStore.companies.length === 0 ? companyStore.initCompanies() : Promise.resolve()
    ])
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    isLoading.value = false
  }
}

const openInviteModal = (role?: 'MAIN_CONTRACTOR' | 'SUPERVISOR' | 'THIRD_PARTY') => {
  inviteForm.value = {
    companyCode: '',
    companyId: '',
    role: role || '',
    message: ''
  }
  searchedCompany.value = null
  searchError.value = ''
  showInviteModal.value = true
}

const closeInviteModal = () => {
  showInviteModal.value = false
  inviteForm.value = {
    companyCode: '',
    companyId: '',
    role: '',
    message: ''
  }
  searchedCompany.value = null
  searchError.value = ''
}

// 根據公司代碼搜索公司
const searchCompanyByCode = async () => {
  const companyCode = inviteForm.value.companyCode.trim()
  
  if (!companyCode) {
    searchError.value = '請輸入公司代碼'
    searchedCompany.value = null
    return
  }

  isSearchingCompany.value = true
  searchError.value = ''
  
  try {
    // 使用新的API直接搜索公司代碼
    const foundCompany = await workspaceApi.searchCompanyByCode(companyCode)
    
    if (foundCompany) {
      searchedCompany.value = foundCompany
      inviteForm.value.companyId = foundCompany.companyId
      searchError.value = ''
    } else {
      searchedCompany.value = null
      searchError.value = '找不到此公司代碼，請確認代碼是否正確'
    }
  } catch (error) {
    console.error('Failed to search company:', error)
    searchError.value = '搜索公司時發生錯誤，請稍後再試'
    searchedCompany.value = null
  } finally {
    isSearchingCompany.value = false
  }
}

const inviteCompany = async () => {
  if (!workspaceStore.currentWorkspace || !inviteForm.value.companyId || !inviteForm.value.role) {
    return
  }

  try {
    // 轉換角色為公司類型
    // 注意：DESIGN 類型已移除，設計公司改為工程案層級的基本資料
    let companyType: 'CONTRACTOR' | 'SUPERVISION' | 'OTHER' = 'OTHER'
    switch (inviteForm.value.role) {
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

    if (!canInviteCompany.value) {
      throw new Error('您沒有邀請公司的權限')
    }

    await workspaceStore.inviteCompanyToWorkspace(workspaceStore.currentWorkspace.id, {
      companyId: inviteForm.value.companyId,
      role: inviteForm.value.role,
      companyType: companyType, // 傳遞轉換後的 companyType
      message: inviteForm.value.message
    })
    
    closeInviteModal()
    await loadData() // 重新載入數據以獲取最新狀態
  } catch (error) {
    console.error('Failed to invite company:', error)
    alert(error instanceof Error ? error.message : '邀請失敗')
  }
}

// 變更公司角色（類型）
// 注意：DESIGN 類型已移除，設計公司改為工程案層級的基本資料
const changeCompanyRole = async (company: any, newType: 'CONTRACTOR' | 'SUPERVISION' | 'OTHER') => {
  if (!workspaceStore.currentWorkspace) return

  // 確認對話框
  // 注意：DESIGN 類型已移除，設計公司改為工程案層級的基本資料
  let confirmMessage = ''
  if (newType === 'CONTRACTOR') {
    confirmMessage = `確定要將「${company.companyName}」設為主要承包商嗎？\n注意：如果已有主要承包商，原承包商將被降級為第三方公司。`
  } else if (newType === 'SUPERVISION') {
    confirmMessage = `確定要將「${company.companyName}」設為監造單位嗎？\n注意：如果已有監造單位，原單位將被降級為第三方公司。`
  } else if (newType === 'OTHER') {
    confirmMessage = `確定要將「${company.companyName}」降級為第三方公司嗎？`
  }

  if (!confirm(confirmMessage)) return

  isLoading.value = true
  try {
    await workspaceStore.updateCompanyType(
      workspaceStore.currentWorkspace.id, 
      company.companyId, 
      newType
    )
    await loadData() // 重新載入以反映變更
  } catch (error) {
    console.error('Failed to update company type:', error)
    alert('更新公司類型失敗')
  } finally {
    isLoading.value = false
  }
}

const openRemovalModal = (company: any) => {
  selectedCompanyForRemoval.value = company
  removalForm.value = {
    companyId: company.companyId,
    reason: '',
    requestType: 'MUTUAL_AGREEMENT',
    customerServiceNote: ''
  }
  showRemovalModal.value = true
}

const closeRemovalModal = () => {
  showRemovalModal.value = false
  selectedCompanyForRemoval.value = null
  removalForm.value = {
    companyId: '',
    reason: '',
    requestType: 'MUTUAL_AGREEMENT',
    customerServiceNote: ''
  }
}

const requestRemoval = async () => {
  if (!workspaceStore.currentWorkspace || !removalForm.value.companyId || !removalForm.value.reason) {
    return
  }

  try {
    await workspaceStore.requestRemoveCompany(workspaceStore.currentWorkspace.id, removalForm.value)
    closeRemovalModal()
    await loadData()
  } catch (error) {
    console.error('Failed to request removal:', error)
    alert('請求移除失敗')
  }
}

const openEditCompanyModal = async (company: WorkspaceCompany) => {
  if (!company.companyId) return
  try {
    const detail = await companyStore.getCompanyDetail(company.companyId)
    if (!detail) {
      proxy?.$toast?.error('無法載入公司資料')
      return
    }
    editingCompany.value = detail
    showEditCompanyModal.value = true
  } catch (error) {
    console.error('Failed to load company detail:', error)
    proxy?.$toast?.error('載入公司資料失敗')
  }
}

const closeEditCompanyModal = () => {
  showEditCompanyModal.value = false
  editingCompany.value = null
}

const handleCompanyFormSubmit = async (data: CreateCompanyRequest) => {
  if (!editingCompany.value) return
  try {
    const result = await companyStore.updateCompany(editingCompany.value.companyId, data)
    if (result) {
      proxy?.$toast?.success('公司更新成功！')
      closeEditCompanyModal()
      await loadData()
    } else {
      proxy?.$toast?.error('公司更新失敗，請重試！')
    }
  } catch (error) {
    console.error('Company form submit error:', error)
    proxy?.$toast?.error('操作失敗，請重試！')
  }
}

const goToCompanyMembers = (companyId: string) => {
  router.push({
    path: '/company/management',
    query: { tab: 'members', companyId }
  })
}

const goToSitePersonnel = (companyId: string) => {
  router.push({
    path: '/company/site-personnel',
    query: { companyId }
  })
}



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

const getRoleLabel = (role: string) => {
  const roleMap: Record<string, string> = {
    'MAIN_CONTRACTOR': '主要承包商',
    'SUPERVISOR': '監造單位',
    'DESIGNER': '設計單位',
    'THIRD_PARTY': '第三方公司'
  }
  return roleMap[role] || role
}

// 監聽工作空間變化
watch(() => workspaceStore.currentWorkspace, (newWorkspace) => {
  if (newWorkspace) {
    loadData()
  }
}, { immediate: true })

// 生命週期
onMounted(async () => {
  // 確保工作空間已初始化
  if (!workspaceStore.isInitialized) {
    await workspaceStore.initWorkspaces()
  }

  // 如果沒有當前工作空間，嘗試設置
  if (!workspaceStore.currentWorkspace) {
    // 優先從後端記錄的工作空間 ID 獲取
    if (authStore.user?.currentWorkspaceId) {
      let ws = workspaceStore.workspaces.find(w => w.id === authStore.user?.currentWorkspaceId)
      if (!ws && authStore.user?.currentWorkspaceId) {
        // 如果工作空間不在列表中，創建最小對象
        const minimalWorkspace = {
          id: authStore.user.currentWorkspaceId,
          name: `工作空間 ${authStore.user.currentWorkspaceId.slice(0, 8)}`,
          description: '',
          companyId: '',
          companyName: '',
          ownerId: '',
          ownerName: '',
          memberCount: 0,
          projectCount: 0,
          createdAt: '',
          isOwner: false,
          role: 'MEMBER' as const
        }
        workspaceStore.workspaces.push(minimalWorkspace)
        ws = minimalWorkspace
      }
      if (ws) {
        workspaceStore.currentWorkspace = ws
      }
    }
    
    // 如果還是沒有，從當前專案獲取工作空間
    if (!workspaceStore.currentWorkspace && workspaceStore.currentProject?.workspaceId) {
      const ws = workspaceStore.workspaces.find(w => w.id === workspaceStore.currentProject?.workspaceId)
      if (ws) {
        workspaceStore.currentWorkspace = ws
      }
    }
    
    // 如果還是沒有，選擇第一個工作空間
    if (!workspaceStore.currentWorkspace && workspaceStore.workspaces.length > 0) {
      workspaceStore.currentWorkspace = workspaceStore.workspaces[0]
    }
  }

  // 如果有當前工作空間，載入資料
  if (workspaceStore.currentWorkspace) {
    loadData()
  } else {
    // 如果沒有工作空間，顯示提示
    console.warn('沒有可用的工作空間，無法載入參與單位資料')
  }
})
</script>

<style scoped>
.workspace-company-management {
  max-width: 100%;
}

.nav-tabs .nav-link {
  border: none;
  color: var(--bs-body-color);
  background: transparent;
}

.nav-tabs .nav-link.active {
  background: var(--bs-theme);
  color: white;
  border-radius: 0.375rem 0.375rem 0 0;
}

.nav-tabs .nav-link:hover:not(.active) {
  background: rgba(var(--bs-theme-rgb), 0.1);
}

.table th {
  background: var(--bs-light);
  font-weight: 600;
  border-bottom: 2px solid var(--bs-border-color);
}

.badge {
  font-size: 0.75rem;
}

.input-group {
  flex-shrink: 0;
}

/* 公司角色區塊樣式 */
.company-roles-container {
  max-width: 100%;
}

.role-section {
  border-radius: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(var(--bs-theme-rgb), 0.03) 0%, rgba(var(--bs-theme-rgb), 0.01) 100%);
  border: 1px solid rgba(var(--bs-theme-rgb), 0.1);
  transition: all 0.3s ease;
}

.role-section:hover {
  background: linear-gradient(135deg, rgba(var(--bs-theme-rgb), 0.05) 0%, rgba(var(--bs-theme-rgb), 0.02) 100%);
  border-color: rgba(var(--bs-theme-rgb), 0.2);
  box-shadow: 0 4px 20px rgba(var(--bs-theme-rgb), 0.1);
}

.role-section h5 {
  font-weight: 700;
  color: var(--bs-body-color);
}

/* 角色圖標樣式 */
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

.role-icon-wrapper.designer {
  background: linear-gradient(135deg, var(--bs-indigo) 0%, rgba(102, 16, 242, 0.8) 100%);
  box-shadow: 0 4px 12px rgba(102, 16, 242, 0.3);
}


/* 公司卡片樣式 */

/* Custom Company Card */
.custom-company-card {
  background: var(--bs-body-bg);
  border-radius: 12px;
  border: 1px solid var(--bs-border-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  position: relative;
  /* overflow: hidden; - Removed to allow dropdowns to show */
  transition: all 0.2s ease;
  min-height: 160px; /* Ensure consistent height for populated and empty states */
}

.custom-company-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.custom-company-card.main-contractor::before { background-color: var(--bs-primary); }
.custom-company-card.supervisor::before { background-color: var(--bs-info); }
.custom-company-card.designer::before { background-color: var(--bs-indigo); }
.custom-company-card.third-party::before { background-color: var(--bs-success); }

.card-content {
  position: relative;
  z-index: 1;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
  background-color: var(--bs-secondary-bg) !important;
  color: var(--bs-body-color) !important;
  border-color: var(--bs-border-color) !important;
}

.btn-icon:hover {
  background-color: var(--bs-danger-bg-subtle) !important;
  color: var(--bs-danger) !important;
}

/* 公司頭像樣式 - 已移除 */


/* 空狀態樣式 */
.empty-state {
  text-align: center;
  /* padding: 2rem 1.5rem; - Removed to use padding utilities */
  border: 2px dashed rgba(var(--bs-theme-rgb), 0.2);
  border-radius: 12px;
  background: rgba(var(--bs-theme-rgb), 0.02);
  transition: all 0.2s ease;
}

.empty-state.hover-effect:hover {
  background: rgba(var(--bs-theme-rgb), 0.05);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
}

.cursor-pointer {
  cursor: pointer;
}

/* Removed unused empty-icon styles */

.third-party-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}



.border-dashed {
  border-style: dashed !important;
  border-color: var(--bs-border-color) !important;
}

@media (max-width: 768px) {
  .third-party-grid {
    grid-template-columns: 1fr;
  }
  

  
  /* 營造與監造在小螢幕上改為垂直排列 */
  .company-roles-container .row {
    flex-direction: column;
  }
  
  .company-roles-container .col-md-6 {
    margin-bottom: 1rem;
  }
}
</style>
