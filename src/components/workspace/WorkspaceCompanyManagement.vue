<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useWorkspaceStore, type Workspace } from '@/stores/workspace'
import { useCompanyStore } from '@/stores/company'
import { COMPANY_TYPE_OPTIONS, CONTRACTOR_LEVEL_OPTIONS } from '@/api/company'
import { workspaceApi } from '@/api/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'

interface Props {
  workspace: Workspace | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  back: []
}>()

const workspaceStore = useWorkspaceStore()
const companyStore = useCompanyStore()

// 狀態
const isLoading = ref(false)
const activeTab = ref<'companies' | 'invites' | 'removal-requests'>('companies')
const showInviteModal = ref(false)
const showRemovalModal = ref(false)
const showRemovalRequestModal = ref(false)

// 邀請公司表單
const inviteForm = ref({
  companyCode: '', // 使用系統內部的公司代碼/ID
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

// 搜索
const searchQuery = ref('')
const companyTypeFilter = ref('')

// 當前選中的公司用於移除
const selectedCompanyForRemoval = ref<any>(null)

// 計算屬性
const filteredCompanies = computed(() => {
  let companies = workspaceStore.workspaceCompanies
  
  if (searchQuery.value) {
    companies = companies.filter(company => 
      company.companyName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      company.companyUnifiedNumber.includes(searchQuery.value)
    )
  }
  
  if (companyTypeFilter.value) {
    companies = companies.filter(company => company.companyType === companyTypeFilter.value)
  }
  
  return companies
})

// 基於當前工作空間的權限檢查
const canInviteCompany = computed(() => {
  return props.workspace?.role === 'OWNER' || props.workspace?.role === 'ADMIN'
})

const canInviteContractor = computed(() => {
  const contractors = workspaceStore.workspaceCompanies.filter(
    company => company.role === 'MAIN_CONTRACTOR' && company.status === 'ACTIVE'
  )
  return canInviteCompany.value && contractors.length === 0
})

const canInviteSupervisor = computed(() => {
  const supervisors = workspaceStore.workspaceCompanies.filter(
    company => company.role === 'SUPERVISOR' && company.status === 'ACTIVE'
  )
  return canInviteCompany.value && supervisors.length === 0
})

const canInviteThirdParty = computed(() => {
  return canInviteCompany.value // 第三方公司可以邀請多間
})

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
  ]
  return roles
})

// 方法
const loadData = async () => {
  if (!props.workspace) return
  
  isLoading.value = true
  try {
    await Promise.all([
      workspaceStore.loadWorkspaceCompanies(props.workspace.id),
      workspaceStore.searchAvailableCompanies(props.workspace.id)
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

const searchCompanies = async () => {
  if (!props.workspace) return
  await workspaceStore.searchAvailableCompanies(props.workspace.id, searchQuery.value, companyTypeFilter.value)
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
  if (!props.workspace || !inviteForm.value.companyId || !inviteForm.value.role) {
    return
  }

  try {
    // 檢查邀請規則
    if (inviteForm.value.role === 'MAIN_CONTRACTOR' && !canInviteContractor.value) {
      throw new Error('工作空間已有主要承包商，無法再邀請')
    }
    if (inviteForm.value.role === 'SUPERVISOR' && !canInviteSupervisor.value) {
      throw new Error('工作空間已有監造單位，無法再邀請')
    }
    if (!canInviteCompany.value) {
      throw new Error('您沒有邀請公司的權限')
    }

    await workspaceStore.inviteCompanyToWorkspace(props.workspace.id, {
      companyId: inviteForm.value.companyId,
      role: inviteForm.value.role,
      message: inviteForm.value.message
    })
    
    closeInviteModal()
    await loadData()
  } catch (error) {
    console.error('Failed to invite company:', error)
    alert(error instanceof Error ? error.message : '邀請失敗')
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
  if (!props.workspace || !removalForm.value.companyId || !removalForm.value.reason) {
    return
  }

  try {
    await workspaceStore.requestRemoveCompany(props.workspace.id, removalForm.value)
    closeRemovalModal()
    await loadData()
  } catch (error) {
    console.error('Failed to request removal:', error)
    alert('請求移除失敗')
  }
}

const respondToInvite = async (workspaceId: string, action: 'ACCEPT' | 'REJECT') => {
  try {
    await workspaceStore.respondToCompanyInvite(workspaceId, action)
    await loadData()
  } catch (error) {
    console.error('Failed to respond to invite:', error)
    alert('回應邀請失敗')
  }
}

const respondToRemovalRequest = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
  if (!props.workspace) return

  try {
    await workspaceStore.respondToRemovalRequest(props.workspace.id, requestId, action)
    await loadData()
  } catch (error) {
    console.error('Failed to respond to removal request:', error)
    alert('回應移除請求失敗')
  }
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
    'THIRD_PARTY': '第三方公司'
  }
  return roleMap[role] || role
}

const getRoleColor = (role: string) => {
  const colorMap: Record<string, string> = {
    'MAIN_CONTRACTOR': 'primary',
    'SUPERVISOR': 'info',
    'THIRD_PARTY': 'success'
  }
  return colorMap[role] || 'secondary'
}

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    'ACTIVE': '已加入',
    'PENDING': '待回應',
    'REJECTED': '已拒絕'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    'ACTIVE': 'success',
    'PENDING': 'warning',
    'REJECTED': 'danger'
  }
  return colorMap[status] || 'secondary'
}

// 監聽工作空間變化
watch(() => props.workspace, (newWorkspace) => {
  if (newWorkspace) {
    loadData()
  }
}, { immediate: true })

// 生命週期
onMounted(() => {
  if (props.workspace) {
    loadData()
  }
})
</script>

<template>
  <div class="workspace-company-management">
    <!-- 標題列 -->
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h5 class="mb-1">
          <i class="fa fa-building me-2"></i>
          {{ workspace?.name }} - 公司管理
        </h5>
        <p class="text-muted mb-0">管理工作空間中的公司成員</p>
      </div>
      <div class="d-flex align-items-center">
        <button 
          class="btn btn-outline-secondary me-2" 
          @click="emit('back')"
        >
          <i class="fa fa-arrow-left me-1"></i>
          返回
        </button>
        <!-- 測試用：總是顯示邀請按鈕 -->
        <button 
          class="btn btn-theme"
          @click="openInviteModal()"
        >
          <i class="fa fa-plus me-1"></i>
          邀請公司
        </button>
        
        <!-- 原有的條件按鈕（暫時註解） -->
        <!--
        <button 
          v-if="canInviteCompany"
          class="btn btn-theme"
          @click="openInviteModal"
        >
          <i class="fa fa-plus me-1"></i>
          邀請公司
        </button>
        -->
      </div>
    </div>

    <!-- 公司角色區塊 -->
    <div class="company-roles-container mb-4">
      <!-- 營造單位與監造單位並排 -->
      <div class="row mb-4">
        <!-- 營造單位區塊 -->
        <div class="col-md-6">
          <div class="role-section h-100 d-flex flex-column">
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
                v-if="!workspaceStore.mainContractor && canInviteCompany"
                class="btn btn-primary btn-sm shadow-sm"
                @click="openInviteModal('MAIN_CONTRACTOR')"
              >
                <i class="fa fa-plus me-1"></i>
                邀請營造單位
              </button>
            </div>
            
            <div class="flex-grow-1 d-flex flex-column">
              <Card v-if="workspaceStore.mainContractor" class="company-card shadow-sm flex-grow-1">
                <CardBody class="py-4 h-100 d-flex flex-column">
                  <div class="d-flex align-items-center flex-grow-1">
                    <div class="company-avatar me-3">
                      <i class="fa fa-building"></i>
                    </div>
                    <div class="flex-grow-1">
                      <h6 class="mb-1 fw-bold text-primary">{{ workspaceStore.mainContractor.companyName }}</h6>
                      <p class="text-muted small mb-2">
                        <i class="fa fa-id-card me-1"></i>
                        {{ workspaceStore.mainContractor.companyUnifiedNumber }}
                      </p>
                      <div class="d-flex align-items-center gap-2">
                        <span 
                          class="badge border px-2 pt-5px pb-5px rounded fs-12px"
                          :class="`border-${getCompanyTypeColor(workspaceStore.mainContractor.companyType)} text-${getCompanyTypeColor(workspaceStore.mainContractor.companyType)}`"
                        >
                          {{ getCompanyTypeLabel(workspaceStore.mainContractor.companyType) }}
                        </span>
                        <span 
                          v-if="workspaceStore.mainContractor.contractorLevel"
                          class="badge border px-2 pt-5px pb-5px rounded fs-12px"
                          :class="`border-${getContractorLevelColor(workspaceStore.mainContractor.contractorLevel)} text-${getContractorLevelColor(workspaceStore.mainContractor.contractorLevel)}`"
                        >
                          {{ getContractorLevelLabel(workspaceStore.mainContractor.contractorLevel) }}
                        </span>
                      </div>
                    </div>
                    <div class="text-end">
                      <div class="text-muted small mb-2">
                        <i class="fa fa-calendar me-1"></i>
                        {{ new Date(workspaceStore.mainContractor.joinedAt).toLocaleDateString() }}
                      </div>
                      <button 
                        v-if="canInviteCompany"
                        class="btn btn-sm btn-outline-danger"
                        @click="openRemovalModal(workspaceStore.mainContractor)"
                        title="請求移除"
                      >
                        <i class="fa fa-times"></i>
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
              
              <div v-else class="empty-state flex-grow-1 d-flex flex-column justify-content-center">
                <div class="empty-icon">
                  <i class="fa fa-hard-hat"></i>
                </div>
                <h6 class="text-muted">尚未邀請營造單位</h6>
                <p class="text-muted small">邀請營造單位來管理工程案</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 監造單位區塊 -->
        <div class="col-md-6">
          <div class="role-section h-100 d-flex flex-column">
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
                v-if="!workspaceStore.supervisor && canInviteCompany"
                class="btn btn-info btn-sm shadow-sm"
                @click="openInviteModal('SUPERVISOR')"
              >
                <i class="fa fa-plus me-1"></i>
                邀請監造單位
              </button>
            </div>
            
            <div class="flex-grow-1 d-flex flex-column">
              <Card v-if="workspaceStore.supervisor" class="company-card shadow-sm flex-grow-1">
                <CardBody class="py-4 h-100 d-flex flex-column">
                  <div class="d-flex align-items-center flex-grow-1">
                    <div class="company-avatar me-3 supervisor">
                      <i class="fa fa-clipboard-check"></i>
                    </div>
                    <div class="flex-grow-1">
                      <h6 class="mb-1 fw-bold text-info">{{ workspaceStore.supervisor.companyName }}</h6>
                      <p class="text-muted small mb-2">
                        <i class="fa fa-id-card me-1"></i>
                        {{ workspaceStore.supervisor.companyUnifiedNumber }}
                      </p>
                      <div class="d-flex align-items-center gap-2">
                        <span 
                          class="badge border px-2 pt-5px pb-5px rounded fs-12px"
                          :class="`border-${getCompanyTypeColor(workspaceStore.supervisor.companyType)} text-${getCompanyTypeColor(workspaceStore.supervisor.companyType)}`"
                        >
                          {{ getCompanyTypeLabel(workspaceStore.supervisor.companyType) }}
                        </span>
                      </div>
                    </div>
                    <div class="text-end">
                      <div class="text-muted small mb-2">
                        <i class="fa fa-calendar me-1"></i>
                        {{ new Date(workspaceStore.supervisor.joinedAt).toLocaleDateString() }}
                      </div>
                      <button 
                        v-if="canInviteCompany"
                        class="btn btn-sm btn-outline-danger"
                        @click="openRemovalModal(workspaceStore.supervisor)"
                        title="請求移除"
                      >
                        <i class="fa fa-times"></i>
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
              
              <div v-else class="empty-state flex-grow-1 d-flex flex-column justify-content-center">
                <div class="empty-icon supervisor">
                  <i class="fa fa-eye"></i>
                </div>
                <h6 class="text-muted">尚未邀請監造單位</h6>
                <p class="text-muted small">邀請監造單位來監督工程品質</p>
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
            class="btn btn-success btn-sm shadow-sm"
            @click="openInviteModal('THIRD_PARTY')"
          >
            <i class="fa fa-plus me-1"></i>
            邀請第三方公司
          </button>
        </div>
        
        <div v-if="workspaceStore.thirdPartyCompanies.length > 0" class="third-party-grid">
          <Card 
            v-for="company in workspaceStore.thirdPartyCompanies" 
            :key="company.companyId"
            class="company-card border-success shadow-sm"
          >
            <CardBody class="py-3">
              <div class="d-flex align-items-center">
                <div class="company-avatar me-3 third-party">
                  <i class="fa fa-handshake"></i>
                </div>
                <div class="flex-grow-1">
                  <h6 class="mb-1 fw-bold text-success">{{ company.companyName }}</h6>
                  <p class="text-muted small mb-2">
                    <i class="fa fa-id-card me-1"></i>
                    {{ company.companyUnifiedNumber }}
                  </p>
                  <div class="d-flex align-items-center gap-2">
                    <span 
                      class="badge border px-2 pt-5px pb-5px rounded fs-12px"
                      :class="`border-${getCompanyTypeColor(company.companyType)} text-${getCompanyTypeColor(company.companyType)}`"
                    >
                      {{ getCompanyTypeLabel(company.companyType) }}
                    </span>
                  </div>
                </div>
                <div class="text-end">
                  <div class="text-muted small mb-2">
                    <i class="fa fa-calendar me-1"></i>
                    {{ new Date(company.joinedAt).toLocaleDateString() }}
                  </div>
                  <button 
                    v-if="canInviteCompany"
                    class="btn btn-sm btn-outline-danger"
                    @click="openRemovalModal(company)"
                    title="請求移除"
                  >
                    <i class="fa fa-times"></i>
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
        
        <div v-else class="empty-state">
          <div class="empty-icon third-party">
            <i class="fa fa-users"></i>
          </div>
          <h6 class="text-muted">尚未邀請第三方公司</h6>
          <p class="text-muted small">邀請第三方公司來協助工程案</p>
        </div>
      </div>
    </div>

    <!-- 待處理邀請和移除請求 -->
    <div class="pending-actions-container mb-4">
      <div class="row">
        <div class="col-md-6">
          <Card class="h-100">
            <CardHeader>
              <div class="d-flex align-items-center justify-content-between">
                <h6 class="mb-0">
                  <i class="fa fa-envelope me-2"></i>
                  待處理邀請
                </h6>
                <span 
                  v-if="workspaceStore.pendingInvites.length > 0"
                  class="badge bg-warning rounded-pill"
                >
                  {{ workspaceStore.pendingInvites.length }}
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <div v-if="workspaceStore.pendingInvites.length === 0" class="text-center py-3">
                <i class="fa fa-envelope fa-2x text-muted mb-2"></i>
                <p class="text-muted mb-0 small">暫無待處理邀請</p>
              </div>
              <div v-else>
                <div 
                  v-for="invite in workspaceStore.pendingInvites" 
                  :key="invite.companyId"
                  class="d-flex align-items-center justify-content-between py-2 border-bottom"
                >
                  <div>
                    <div class="fw-600 small">{{ invite.companyName }}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">{{ getRoleLabel(invite.role) }}</div>
                  </div>
                  <div class="d-flex gap-1">
                    <button 
                      class="btn btn-sm btn-success"
                      @click="respondToInvite(workspace!.id, 'ACCEPT')"
                      title="接受"
                    >
                      <i class="fa fa-check"></i>
                    </button>
                    <button 
                      class="btn btn-sm btn-danger"
                      @click="respondToInvite(workspace!.id, 'REJECT')"
                      title="拒絕"
                    >
                      <i class="fa fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
        
        <div class="col-md-6">
          <Card class="h-100">
            <CardHeader>
              <div class="d-flex align-items-center justify-content-between">
                <h6 class="mb-0">
                  <i class="fa fa-times-circle me-2"></i>
                  移除請求
                </h6>
                <span 
                  v-if="workspaceStore.pendingRemovalRequests.length > 0"
                  class="badge bg-danger rounded-pill"
                >
                  {{ workspaceStore.pendingRemovalRequests.length }}
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <div v-if="workspaceStore.pendingRemovalRequests.length === 0" class="text-center py-3">
                <i class="fa fa-times-circle fa-2x text-muted mb-2"></i>
                <p class="text-muted mb-0 small">暫無移除請求</p>
              </div>
              <div v-else>
                <div 
                  v-for="request in workspaceStore.pendingRemovalRequests" 
                  :key="request.id"
                  class="d-flex align-items-center justify-content-between py-2 border-bottom"
                >
                  <div>
                    <div class="fw-600 small">{{ request.companyName }}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">{{ request.reason }}</div>
                  </div>
                  <div class="d-flex gap-1">
                    <button 
                      class="btn btn-sm btn-success"
                      @click="respondToRemovalRequest(request.id, 'APPROVE')"
                      title="同意"
                    >
                      <i class="fa fa-check"></i>
                    </button>
                    <button 
                      class="btn btn-sm btn-danger"
                      @click="respondToRemovalRequest(request.id, 'REJECT')"
                      title="拒絕"
                    >
                      <i class="fa fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
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
                  <div class="text-muted small">
                    公司代碼：{{ inviteForm.companyCode }}
                  </div>
                  <div class="text-muted small">
                    統一編號：{{ searchedCompany.companyUnifiedNumber }}
                  </div>
                </div>
                <div>
                  <span 
                    class="badge border px-2 pt-5px pb-5px rounded fs-12px"
                    :class="`border-${getCompanyTypeColor(searchedCompany.companyType)} text-${getCompanyTypeColor(searchedCompany.companyType)}`"
                  >
                    {{ getCompanyTypeLabel(searchedCompany.companyType) }}
                  </span>
                  <span 
                    v-if="searchedCompany.contractorLevel"
                    class="badge border px-2 pt-5px pb-5px rounded fs-12px ms-1"
                    :class="`border-${getContractorLevelColor(searchedCompany.contractorLevel)} text-${getContractorLevelColor(searchedCompany.contractorLevel)}`"
                  >
                    {{ getContractorLevelLabel(searchedCompany.contractorLevel) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">公司角色 <span class="text-danger">*</span></label>
          <select 
            v-model="inviteForm.role" 
            class="form-select" 
            required
          >
            <option value="">請選擇角色</option>
            <option 
              v-for="role in availableRoles" 
              :key="role.value"
              :value="role.value"
              :disabled="role.disabled"
            >
              {{ role.label }}
              <span v-if="role.disabled"> (已有此角色公司)</span>
            </option>
          </select>
          <div class="form-text">
            <ul class="mb-0 small text-muted">
              <li>主要承包商：每個工作空間只能有一間</li>
              <li>監造單位：每個工作空間只能有一間</li>
              <li>第三方公司：可以邀請多間</li>
            </ul>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">邀請訊息</label>
          <textarea 
            v-model="inviteForm.message"
            class="form-control" 
            rows="3"
            placeholder="輸入邀請訊息（選填）"
          ></textarea>
        </div>

        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" @click="closeInviteModal">
            取消
          </button>
          <button 
            type="submit" 
            class="btn btn-theme"
            :disabled="!searchedCompany || !inviteForm.role"
          >
            <i class="fa fa-paper-plane me-1"></i>
            發送邀請
          </button>
        </div>
      </form>
    </Modal>

    <!-- 移除公司模態框 -->
    <Modal v-model:show="showRemovalModal" title="請求移除公司" size="lg">
      <form @submit.prevent="requestRemoval">
        <div class="alert alert-warning">
          <i class="fa fa-exclamation-triangle me-2"></i>
          您正在請求移除公司「{{ selectedCompanyForRemoval?.companyName }}」
        </div>

        <div class="mb-3">
          <label class="form-label">移除原因 <span class="text-danger">*</span></label>
          <textarea 
            v-model="removalForm.reason"
            class="form-control" 
            rows="3"
            placeholder="請詳細說明移除原因"
            required
          ></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label">處理方式 <span class="text-danger">*</span></label>
          <div class="form-check">
            <input 
              id="mutual-agreement"
              v-model="removalForm.requestType" 
              class="form-check-input" 
              type="radio" 
              value="MUTUAL_AGREEMENT"
            >
            <label class="form-check-label" for="mutual-agreement">
              雙方協議
              <div class="form-text">需要對方公司同意才能完成移除</div>
            </label>
          </div>
          <div class="form-check">
            <input 
              id="customer-service"
              v-model="removalForm.requestType" 
              class="form-check-input" 
              type="radio" 
              value="CUSTOMER_SERVICE"
            >
            <label class="form-check-label" for="customer-service">
              客服處理
              <div class="form-text">由客服團隊介入處理移除請求</div>
            </label>
          </div>
        </div>

        <div v-if="removalForm.requestType === 'CUSTOMER_SERVICE'" class="mb-3">
          <label class="form-label">客服備註</label>
          <textarea 
            v-model="removalForm.customerServiceNote"
            class="form-control" 
            rows="2"
            placeholder="提供給客服的額外說明"
          ></textarea>
        </div>

        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" @click="closeRemovalModal">
            取消
          </button>
          <button 
            type="submit" 
            class="btn btn-danger"
            :disabled="!removalForm.reason"
          >
            <i class="fa fa-paper-plane me-1"></i>
            提交移除請求
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>

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
  transform: translateY(-2px);
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


/* 公司卡片樣式 */
.company-card {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.company-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}

/* 公司頭像樣式 */
.company-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bs-primary) 0%, rgba(var(--bs-primary-rgb), 0.8) 100%);
  color: white;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.3);
}

.company-avatar.supervisor {
  background: linear-gradient(135deg, var(--bs-info) 0%, rgba(var(--bs-info-rgb), 0.8) 100%);
  box-shadow: 0 2px 8px rgba(var(--bs-info-rgb), 0.3);
}

.company-avatar.third-party {
  background: linear-gradient(135deg, var(--bs-success) 0%, rgba(var(--bs-success-rgb), 0.8) 100%);
  box-shadow: 0 2px 8px rgba(var(--bs-success-rgb), 0.3);
}

/* 空狀態樣式 */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  border: 2px dashed rgba(var(--bs-theme-rgb), 0.2);
  border-radius: 12px;
  background: rgba(var(--bs-theme-rgb), 0.02);
  transition: all 0.2s ease;
}

.empty-state:hover {
  background: rgba(var(--bs-theme-rgb), 0.05);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  background: linear-gradient(135deg, var(--bs-primary) 0%, rgba(var(--bs-primary-rgb), 0.8) 100%);
  color: white;
  font-size: 1.5rem;
  box-shadow: 0 4px 16px rgba(var(--bs-primary-rgb), 0.3);
}

.empty-icon.supervisor {
  background: linear-gradient(135deg, var(--bs-info) 0%, rgba(var(--bs-info-rgb), 0.8) 100%);
  box-shadow: 0 4px 16px rgba(var(--bs-info-rgb), 0.3);
}

.empty-icon.third-party {
  background: linear-gradient(135deg, var(--bs-success) 0%, rgba(var(--bs-success-rgb), 0.8) 100%);
  box-shadow: 0 4px 16px rgba(var(--bs-success-rgb), 0.3);
}

.third-party-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.pending-actions-container .card {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.pending-actions-container .card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}

.border-dashed {
  border-style: dashed !important;
  border-color: var(--bs-border-color) !important;
}

@media (max-width: 768px) {
  .third-party-grid {
    grid-template-columns: 1fr;
  }
  
  .pending-actions-container .row {
    flex-direction: column;
  }
  
  .pending-actions-container .col-md-6 {
    margin-bottom: 1rem;
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
