<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWorkspaceStore, type WorkspaceProject } from '@/stores/workspace'
import Modal from '@/components/bootstrap/Modal.vue'
import ProjectForm from '@/components/project/ProjectForm.vue'
import { createConstruction, updateConstruction, transformProjectFormToConstructionRequest } from '@/api/construction'
import { useValidation } from '@/composables/useValidation'
import { projectFormValidationRules } from '@/utils/projectValidationRules'

// Props
const props = defineProps<{
  show: boolean
  project?: WorkspaceProject | null
}>()

// Emits
const emit = defineEmits<{
  'update:show': [value: boolean]
  hide: []
  submit: [data: any]
}>()

const workspaceStore = useWorkspaceStore()

// 表單數據 - 使用 ProjectForm 組件的格式
const formData = ref({
  // 工程基本資料
  project_name: '',
  contract_number: '',
  project_location: '',
  host_agency: '',
  supervision_unit: '',
  contractor_name: '',
  construction_period: '',
  duration_type: 'WORKING_DAYS', // 工期計算模式
  project_amount: '',
  original_contract_amount: '',
  current_contract_amount: '',
  // 工程類別/屬性
  project_category: '',
  // 工期起訖日期
  sign_date: '',
  start_date: '',
  completion_date: '',
  construction_confirm_date: '',
  // 工程專案編號
  construction_project_id: '',
  // 付款方式
  payment_method: '',
  advance_payment_ratio: '',
  retention_ratio: '',
  // 驗收方式
  inspection_methods: [],
  segmented_acceptance: false,
  partial_acceptance: false,
  completion_acceptance: false,
  // 保險相關資訊
  insurance_policy_number: '',
  insurance_company: '',
  insurance_start_date: '',
  insurance_end_date: '',
  insurance_type: '',
  // 簽核層級
  signLevel: [],
  // 工作空間關聯
  workspaceId: ''
})

// 狀態
const isSubmitting = ref(false)

// 獲取 ProjectForm 組件的引用
const projectFormRef = ref(null)

// 不在這裡創建驗證系統，讓 ProjectForm 內部處理

// 計算屬性
const isEditMode = computed(() => !!props.project)
const modalTitle = computed(() => isEditMode.value ? '編輯工程案' : '新增工程案')
const submitButtonText = computed(() => isEditMode.value ? '更新' : '創建')

const statusOptions = [
  { value: 'PLANNING', label: '規劃中', color: 'info' },
  { value: 'IN_PROGRESS', label: '進行中', color: 'success' },
  { value: 'COMPLETED', label: '已完成', color: 'primary' },
  { value: 'SUSPENDED', label: '暫停', color: 'warning' }
]

// 測試資料
const testData = {
  // 完整資料測試
  complete: {
    project_name: "新北市蘆洲區社區公園改善計畫",
    contract_number: "CONTRACT-2024-001",
    project_location: "新北市蘆洲區中正路1號",
    host_agency: "新北市政府工務局",
    supervision_unit: "中興工程顧問股份有限公司",
    contractor_name: "中華工程股份有限公司",
    construction_period: "180天",
    project_amount: "7500000",
    original_contract_amount: "7000000",
    current_contract_amount: "7500000",
    project_category: "土木工程",
    sign_date: "2024-05-01",
    start_date: "2024-06-01",
    completion_date: "2024-12-01",
    construction_confirm_date: "2024-05-15",
    construction_project_id: "CPID-001",
    payment_method: "分期付款",
    advance_payment_ratio: "30",
    retention_ratio: "5",
    inspection_methods: ["分段驗收", "竣工驗收"],
    segmented_acceptance: true,
    partial_acceptance: false,
    completion_acceptance: true,
    insurance_policy_number: "INS-2024-001",
    insurance_company: "華南產物保險",
    insurance_start_date: "2024-06-01",
    insurance_end_date: "2025-06-01",
    insurance_type: "工程險",
    signLevel: [
      { level: 1, title: "總監" },
      { level: 2, title: "副總監" },
      { level: 3, title: "監造工程師" }
    ]
  },
  // 部分資料測試（有錯誤）
  partial: {
    project_name: "台北市信義區道路改善工程",
    contract_number: "CONTRACT-2024-002",
    project_location: "台北市信義區信義路五段",
    host_agency: "台北市政府工務局",
    supervision_unit: "",
    contractor_name: "",
    construction_period: "120天",
    project_amount: "5000000",
    original_contract_amount: "5000000",
    current_contract_amount: "5000000",
    project_category: "道路工程",
    sign_date: "2024-06-15",
    start_date: "2024-07-01",
    completion_date: "2024-11-01",
    construction_confirm_date: "",
    construction_project_id: "",
    payment_method: "工程款支付",
    advance_payment_ratio: "25",
    retention_ratio: "3",
    inspection_methods: ["竣工驗收"],
    segmented_acceptance: false,
    partial_acceptance: false,
    completion_acceptance: true,
    insurance_policy_number: "",
    insurance_company: "富邦產物保險",
    insurance_start_date: "2024-07-01",
    insurance_end_date: "2025-07-01",
    insurance_type: "雇主責任險",
    signLevel: [
      { level: 1, title: "部長" },
      { level: 2, title: "次長" }
    ]
  },
  // 空資料測試（全部錯誤）
  empty: {
    project_name: "",
    contract_number: "",
    project_location: "",
    host_agency: "",
    supervision_unit: "",
    contractor_name: "",
    construction_period: "",
    project_amount: "",
    project_grade: "",
    original_contract_amount: "",
    current_contract_amount: "",
    project_category: "",
    funding_source: "",
    sign_date: "",
    start_date: "",
    completion_date: "",
    construction_confirm_date: "",
    construction_project_id: "",
    payment_method: "",
    advance_payment_ratio: "",
    retention_ratio: "",
    inspection_methods: [],
    segmented_acceptance: false,
    partial_acceptance: false,
    completion_acceptance: false,
    insurance_policy_number: "",
    insurance_company: "",
    insurance_start_date: "",
    insurance_end_date: "",
    insurance_type: "",
    signLevel: []
  }
}

// 載入測試資料的函數
const loadTestData = (type: 'complete' | 'partial' | 'empty') => {
  // console.log(`📋 載入工程案測試資料: ${type}`)
  
  // 載入測試資料
  formData.value = { 
    ...testData[type],
    workspaceId: workspaceStore.currentWorkspace?.id || workspaceStore.workspaces[0]?.id || ''
  }
  
  // 顯示成功訊息
  const message = type === 'complete' ? '完整測試資料' : 
                 type === 'partial' ? '部分測試資料' : '空測試資料'
  alert(`已載入${message}！`)
}

// 方法
const hideModal = () => {
  emit('update:show', false)
  emit('hide')
}

const resetForm = () => {
  formData.value = {
    // 工程基本資料
    project_name: '',
    contract_number: '',
    project_location: '',
    host_agency: '',
    supervision_unit: '',
    contractor_name: '',
    construction_period: '',
    project_amount: '',
    original_contract_amount: '',
    current_contract_amount: '',
    // 工程類別/屬性
    project_category: '',
    // 工期起訖日期
    sign_date: '',
    start_date: '',
    completion_date: '',
    construction_confirm_date: '',
    // 工程專案編號
    construction_project_id: '',
    // 付款方式
    payment_method: '',
    advance_payment_ratio: '',
    retention_ratio: '',
    // 驗收方式
    inspection_methods: [],
    segmented_acceptance: false,
    partial_acceptance: false,
    completion_acceptance: false,
    // 保險相關資訊
    insurance_policy_number: '',
    insurance_company: '',
    insurance_start_date: '',
    insurance_end_date: '',
    insurance_type: '',
    // 簽核層級
    signLevel: [],
    // 工作空間關聯 - 使用當前工作空間
    workspaceId: workspaceStore.currentWorkspace?.id || workspaceStore.workspaces[0]?.id || ''
  }
  // 清除驗證錯誤由 ProjectForm 內部處理
}

// 將工程案資料映射到表單 - 使用與 BasicData 相同的邏輯
const mapProjectDataToForm = (project: any) => {
  
  try {
    // 映射基本資料 - 使用 WorkspaceProject 介面的欄位名稱
    formData.value.project_name = project.name || ''
    formData.value.contract_number = project.contractNumber || ''
    formData.value.project_location = project.location || ''
    formData.value.host_agency = project.hostAgency || ''
    formData.value.supervision_unit = project.supervisionUnit || ''
    formData.value.contractor_name = project.contractorName || ''
    formData.value.construction_period = project.constructionPeriod || project.workDay || ''
    formData.value.duration_type = project.durationType || 'WORKING_DAYS' // 工期計算模式
    formData.value.project_amount = project.budget || ''
    formData.value.original_contract_amount = project.originalContractAmount || ''
    formData.value.current_contract_amount = project.currentContractAmount || ''
    
    // 映射工程類別
    formData.value.project_category = project.projectCategory || ''
    
    // 映射工期日期 - 轉換 ISO 格式為 YYYY-MM-DD 格式
    formData.value.sign_date = project.signDate ? project.signDate.split('T')[0] : ''
    formData.value.start_date = project.startDate ? project.startDate.split('T')[0] : ''
    formData.value.completion_date = project.endDate ? project.endDate.split('T')[0] : ''
    formData.value.construction_confirm_date = project.constructionConfirmDate ? project.constructionConfirmDate.split('T')[0] : ''
    
    // 映射工程專案編號
    formData.value.construction_project_id = project.constructionProjectId || ''
    
    // 映射付款方式
    formData.value.payment_method = project.paymentMethod || ''
    formData.value.advance_payment_ratio = project.advancePaymentRatio || ''
    formData.value.retention_ratio = project.retentionRatio || ''
    
    // 映射驗收方式
    formData.value.inspection_methods = project.inspectionMethods || []
    formData.value.segmented_acceptance = project.segmentedAcceptance || false
    formData.value.partial_acceptance = project.partialAcceptance || false
    formData.value.completion_acceptance = project.completionAcceptance || false
    
    // 映射保險資訊 - 轉換日期格式
    formData.value.insurance_policy_number = project.insurancePolicyNumber || ''
    formData.value.insurance_company = project.insuranceCompany || ''
    formData.value.insurance_start_date = project.insuranceStartDate ? project.insuranceStartDate.split('T')[0] : ''
    formData.value.insurance_end_date = project.insuranceEndDate ? project.insuranceEndDate.split('T')[0] : ''
    formData.value.insurance_type = project.insuranceType || ''
    
    // 映射簽核層級
    formData.value.signLevel = project.signLevel || []
    
    // 工作空間關聯
    formData.value.workspaceId = project.workspaceId || ''
    
    // console.log('✅ 表單資料映射完成:', formData.value)
  } catch (error) {
    console.error('❌ 映射工程案資料失敗:', error)
  }
}

// 載入當前工程案資料 - 使用與 BasicData 相同的邏輯
const loadCurrentProjectData = async (project: any) => {
  if (!project) {
    // console.log('⚠️ 沒有工程案資料')
    return
  }
  
  // console.log('📋 當前工程案:', project)
  
  try {
    // 檢查是否已經有工程案資料，避免不必要的 API 調用
    const existingProject = workspaceStore.workspaceProjects.find(p => p.id === project.id)
    if (existingProject) {
      // 如果資料已存在，直接映射
      mapProjectDataToForm(existingProject)
      return
    }
    
    // 重新載入最新的工程案資料
    // console.log('🔄 重新載入工程案資料...')
    await workspaceStore.getProjectsByWorkspace(project.workspaceId)
    
    // 重新獲取更新後的工程案
    const updatedProject = workspaceStore.workspaceProjects.find(p => p.id === project.id)
    if (updatedProject) {
      // console.log('✅ 工程案資料已更新，映射到表單:', updatedProject)
      mapProjectDataToForm(updatedProject)
    } else {
      // console.log('⚠️ 找不到更新後的工程案，使用現有資料')
      mapProjectDataToForm(project)
    }
  } catch (error) {
    console.error('❌ 載入工程案資料失敗:', error)
    // 如果 API 載入失敗，至少映射現有資料
    // console.log('🔄 使用現有工程案資料...')
    mapProjectDataToForm(project)
  }
}

// 監聽project變化，填充表單
watch(() => props.project, async (newProject, oldProject) => {
  // 防止無限遞歸：如果新舊項目相同，跳過處理
  if (newProject && oldProject && newProject.id === oldProject.id) {
    return
  }
  
  if (newProject && newProject.id) {
    // 編輯模式：載入最新的工程案資料並映射到表單
    try {
      await loadCurrentProjectData(newProject)
    } catch (error) {
      console.error('載入工程案資料失敗:', error)
    }
  } else if (newProject && !newProject.id) {
    // 新增模式：使用傳入的 workspaceId
    formData.value = {
      ...formData.value,
      workspaceId: newProject.workspaceId || ''
    }
    // console.log('🆕 新增模式，使用工作空間 ID:', newProject.workspaceId)
  } else {
    resetForm()
  }
}, { immediate: false })

// 監聽show變化，重置錯誤
watch(() => props.show, (newShow) => {
  if (newShow) {
    // 顯示目前模式
    const mode = isEditMode.value ? 'edit' : 'create'
    console.log(`🔧 工程案編輯器開啟 - 模式: ${mode}`)
    // 清除驗證錯誤由 ProjectForm 內部處理
  } else {
    // 表單關閉時也清空資料和錯誤
    resetForm()
  }
})

const handleSubmit = async (projectFormData: any) => {
  // console.log('📋 工程案表單提交中...')
  // console.log('📤 表單資料:', projectFormData)
  
  isSubmitting.value = true
  try {
    // 優先使用傳入的 project.workspaceId，如果沒有則使用當前工作空間的 ID
    const currentWorkspaceId = props.project?.workspaceId || workspaceStore.currentWorkspace?.id || workspaceStore.workspaces[0]?.id
    
    if (!currentWorkspaceId) {
      throw new Error('無法獲取工作空間 ID')
    }
    
    // 取得公司 ID（從當前工作空間）
    const currentWorkspace = workspaceStore.workspaces.find(ws => ws.id === currentWorkspaceId) || workspaceStore.currentWorkspace
    const companyId = currentWorkspace?.companyId
    
    if (!companyId) {
      throw new Error('無法獲取公司 ID，請確保工作空間包含公司資訊')
    }
    
    // console.log('🏗️ 使用工作空間 ID:', currentWorkspaceId)
    // console.log('🏢 使用公司 ID:', companyId)
    
    // 轉換為API請求格式
    const constructionRequest = transformProjectFormToConstructionRequest(projectFormData, currentWorkspaceId, companyId)
    // console.log('🔄 轉換後的 API 請求:', constructionRequest)
    
    let response: any
    let submitData: any
    
    if (props.project?.id) {
      // 編輯模式：調用更新工程案API
      response = await updateConstruction(props.project.id, constructionRequest)
      // console.log('✅ 工程案更新成功:', response)
      
      // 清除該工作空間的工程案緩存，強制重新載入
      const cacheKey = `eip-workspace-projects-${currentWorkspaceId}`
      localStorage.removeItem(cacheKey)
      
      // 重新查詢最新的工程案資料
      await workspaceStore.getProjectsByWorkspace(currentWorkspaceId)
      
      // 獲取更新後的工程案資料
      const updatedProject = workspaceStore.workspaceProjects.find(p => p.id === props.project.id)
      if (updatedProject) {
        // 使用從 API 獲取的最新資料
        submitData = updatedProject
        
        // 更新當前選中的工程案（不觸發重新載入）
        workspaceStore.setCurrentProject(updatedProject, false)
      } else {
        // 如果找不到更新後的資料，使用原有邏輯
        submitData = {
          ...props.project,
          name: projectFormData.project_name,
          location: projectFormData.project_location,
          budget: projectFormData.project_amount,
          startDate: projectFormData.start_date,
          endDate: projectFormData.completion_date,
          managerName: projectFormData.contractor_name,
          description: `${projectFormData.project_category} - ${projectFormData.funding_source}`,
          // 額外的工程案詳細資訊
          contractNumber: projectFormData.contract_number,
          hostAgency: projectFormData.host_agency,
          supervisionUnit: projectFormData.supervision_unit,
          constructionPeriod: projectFormData.construction_period,
          projectGrade: projectFormData.project_grade,
          projectCategory: projectFormData.project_category,
          fundingSource: projectFormData.funding_source,
          paymentMethod: projectFormData.payment_method,
          advancePaymentRatio: projectFormData.advance_payment_ratio,
          retentionRatio: projectFormData.retention_ratio,
          inspectionMethods: projectFormData.inspection_methods,
          insurancePolicyNumber: projectFormData.insurance_policy_number,
          insuranceCompany: projectFormData.insurance_company,
          insuranceStartDate: projectFormData.insurance_start_date,
          insuranceEndDate: projectFormData.insurance_end_date,
          insuranceType: projectFormData.insurance_type,
          signLevel: projectFormData.signLevel
        }
      }
    } else {
      // 創建模式：調用創建工程案API
      response = await createConstruction(constructionRequest)
      // console.log('✅ 工程案創建成功:', response)
      
      // 轉換為 WorkspaceProject 格式，用於本地狀態更新
      submitData = {
        id: response.constructionId,
        name: projectFormData.project_name,
        workspaceId: currentWorkspaceId,
        location: projectFormData.project_location,
        budget: projectFormData.project_amount,
        status: 'PLANNING' as const,
        startDate: projectFormData.start_date,
        endDate: projectFormData.completion_date,
        managerName: projectFormData.contractor_name,
        description: `${projectFormData.project_category} - ${projectFormData.funding_source}`,
        progress: 0,
        // 額外的工程案詳細資訊
        contractNumber: projectFormData.contract_number,
        hostAgency: projectFormData.host_agency,
        supervisionUnit: projectFormData.supervision_unit,
        constructionPeriod: projectFormData.construction_period,
        projectGrade: projectFormData.project_grade,
        projectCategory: projectFormData.project_category,
        fundingSource: projectFormData.funding_source,
        paymentMethod: projectFormData.payment_method,
        advancePaymentRatio: projectFormData.advance_payment_ratio,
        retentionRatio: projectFormData.retention_ratio,
        inspectionMethods: projectFormData.inspection_methods,
        insurancePolicyNumber: projectFormData.insurance_policy_number,
        insuranceCompany: projectFormData.insurance_company,
        insuranceStartDate: projectFormData.insurance_start_date,
        insuranceEndDate: projectFormData.insurance_end_date,
        insuranceType: projectFormData.insurance_type,
        signLevel: projectFormData.signLevel
      }
    }
    
    // console.log('🔄 轉換後的本地狀態資料:', submitData)
    emit('submit', submitData)
    
    // 關閉模態框
    hideModal()
    
  } catch (error: any) {
    console.error('❌ 工程案操作失敗:', error)
    // 這裡可以添加錯誤提示
    const action = props.project?.id ? '更新' : '創建'
    alert(`工程案${action}失敗：${error.message || '未知錯誤'}`)
  } finally {
    isSubmitting.value = false
  }
}

const handleConfirm = async () => {
  // console.log('🔍 Modal 確認按鈕點擊，觸發 ProjectForm 的提交方法...')
  
  // 直接調用 ProjectForm 的提交方法，讓它處理驗證和顯示錯誤
  if (projectFormRef.value) {
    (projectFormRef.value as any).handleSubmit()
  } else {
    console.error('❌ 無法找到 ProjectForm 組件引用')
  }
}



</script>

<template>
  <Modal
    :show="props.show"
    :title="modalTitle"
    icon="fa fa-project-diagram"
    size="xxl"
    modal-id="projectFormModal"
    :confirm-text="submitButtonText"
    confirm-icon="fa fa-save"
    :is-loading="isSubmitting"
    loading-text="處理中..."
    @hide="hideModal"
    @confirm="handleConfirm"
  >
    <template #header>
      <div class="d-flex align-items-center justify-content-between w-100">
        <div>
          <h5 class="modal-title">
            <i class="fa fa-project-diagram me-2"></i>
            {{ modalTitle }}
          </h5>
        </div>
        <!-- 測試資料按鈕組 -->
        <div class="btn-group" role="group">
          <button 
            type="button" 
            class="btn btn-outline-success btn-sm"
            @click="loadTestData('complete')"
            title="載入完整測試資料"
          >
            <i class="fa fa-check-circle me-1"></i>
            完整資料
          </button>
          <button 
            type="button" 
            class="btn btn-outline-warning btn-sm"
            @click="loadTestData('partial')"
            title="載入部分測試資料（有錯誤）"
          >
            <i class="fa fa-exclamation-triangle me-1"></i>
            部分資料
          </button>
          <button 
            type="button" 
            class="btn btn-outline-danger btn-sm"
            @click="loadTestData('empty')"
            title="載入空測試資料（全部錯誤）"
          >
            <i class="fa fa-times-circle me-1"></i>
            空資料
          </button>
        </div>
      </div>
    </template>
    <template #body>
      <!-- 使用完整的工程案表單 -->
      <ProjectForm
        ref="projectFormRef"
        v-model="formData"
        :mode="isEditMode ? 'edit' : 'create'"
        :is-submitting="isSubmitting"
        :show-submit-button="false"
        :show-reset-button="false"
        @submit="handleSubmit"
        @reset="resetForm"
      />
    </template>
  </Modal>
</template>

<style scoped>
.form-text {
  font-size: 0.875rem;
  color: var(--bs-secondary);
}

.alert ul {
  padding-left: 1.2rem;
}

.alert li {
  margin-bottom: 0.25rem;
}

.form-control:focus,
.form-select:focus {
  border-color: var(--bs-theme);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-theme-rgb), 0.25);
}

.form-control.is-invalid:focus,
.form-select.is-invalid:focus {
  border-color: var(--bs-danger);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-danger-rgb), 0.25);
}

.progress {
  background-color: rgba(var(--bs-theme-rgb), 0.1);
}
</style> 