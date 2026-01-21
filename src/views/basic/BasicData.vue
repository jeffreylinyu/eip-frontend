<script setup lang="ts">
import { ref, reactive, computed, watch, watchEffect, onMounted, onBeforeUnmount, nextTick, getCurrentInstance } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { storage } from '@/utils/storage'
import { updateConstruction, transformProjectFormToConstructionRequest } from '@/api/construction'
import { useAuthStore } from '@/stores/auth' // Import auth store
import tagsInput from '@/components/plugins/TagsInput.vue'
import quillEditor from '@/components/plugins/QuillEditor.vue'
import ProjectForm from '@/components/project/ProjectForm.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import VerificationLogList from '@/components/common/VerificationLogList.vue' // Import


// 獲取當前實例以訪問 $toast
const { proxy } = getCurrentInstance() as any

// 使用 workspace store
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore() // Init auth store

// 表單數據
const formData = ref({
  // 工程基本資料
  project_name: "",
  contract_number: "",
  project_location: "",
  project_scale_overview: "", // 新增：工程規模概述
  host_agency: "",
  supervision_unit: "",
  contractor_name: "",
  // 新增：公司名稱顯示欄位
  supervisory_company_name: "",
  contractor_company_name: "",
  design_company: "", // 設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
  construction_period: "",
  duration_type: "WORKING_DAYS", // 工期計算模式
  project_amount: "",
  current_contract_amount: "",
  // 工程類別/屬性
  project_category: "",
  // 工期起訖日期
  sign_date: "",
  start_date: "",
  completion_date: "",
  construction_confirm_date: "",
  // 工程專案編號
  construction_project_id: "",
  // 付款方式
  payment_method: "",
  advance_payment_ratio: "",
  retention_ratio: "",
  // 驗收方式
  inspection_methods: [],
  segmented_acceptance: false,
  partial_acceptance: false,
  completion_acceptance: false,
  // 保險相關資訊
  insurance_policy_number: "",
  insurance_company: "",
  insurance_start_date: "",
  insurance_end_date: "",
  insurance_type: "",
  // 簽核層級
  signLevel: [],
  // 樂觀鎖版本
  version: 0,
})

// 審核紀錄 (從專案資料中讀取)
// 這裡先定義結構，後續 mapProjectDataToForm 會填充
const verificationLogs = ref([])

// 鎖定欄位狀態
const lockedFields = ref<Record<string, boolean>>({})

      // 原始數據副本，用於比較是否有變更
const originalFormData = ref({})
      // 保存狀態
const isSaving = ref(false)
const hasUnsavedChanges = ref(false)
const isUpdatingFormData = ref(false)
const isAutoSaving = ref(false)
const autoSaveTimer = ref<number | null>(null)
      // 標籤相關
const tag = ref('')
const tags = ref([{
      	text: '土木工程'
      }, {
      	text: '建築工程'
}])
const tagGrade = ref('')
const tagsGrade = ref([{
      	text: '甲等'
      }, {
      	text: '乙等'
}])
const tagOrg = ref('')
const tagsOrg = ref([{
      	text: '交通部'
}])
const tagContractor = ref('')
const tagsContractor = ref([])
const tagsAutocomplete = ref([{ text: '道路工程'}, { text: '橋梁工程'}, { text: '隧道工程'}])

// ProjectForm 組件引用
const projectFormRef = ref(null)



// 監聽器
// 手動檢測變化的方法
const checkForChanges = () => {
  if (isUpdatingFormData.value) {
    return
  }
  
  const newState = JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
  if (hasUnsavedChanges.value !== newState) {
    hasUnsavedChanges.value = newState
  }
}

// 手動載入工程案資料的方法
const loadProjectData = async (project: any, forceRefresh: boolean = false) => {
  if (!project) {
    return
  }
  
  // console.log('🔄 手動載入工程案資料:', project, 'forceRefresh:', forceRefresh)
  
  // 如果需要強制刷新或資料不存在，重新載入 API 資料
  const existingProject = workspaceStore.workspaceProjects.find(p => p.id === project.id)
  if (forceRefresh || !existingProject) {
    // 強制重新載入最新的工程案資料
    await loadCurrentProjectData()
  } else {
    // 如果資料已存在且不需要強制刷新，直接映射
    mapProjectDataToForm(existingProject)
  }
  
  // 更新原始數據
  originalFormData.value = JSON.parse(JSON.stringify(formData.value))
  hasUnsavedChanges.value = false
}

// 監聽當前工程案變化 - 使用更安全的方式
watch(() => workspaceStore.currentProject, async (newProject, oldProject) => {
  if (newProject && newProject.id !== oldProject?.id) {
    // console.log('🔄 檢測到工程案變更，重新載入資料:', newProject)
    await loadProjectData(newProject, true) // 工程案變更時也強制刷新
  }
}, { immediate: false })


// 監聽表單數據變化，觸發自動儲存
watch(
  formData,
  (newVal) => {
    if (isUpdatingFormData.value) return
    
    // 檢查是否有實質變更
    const hasChange = JSON.stringify(newVal) !== JSON.stringify(originalFormData.value)
    
    if (hasChange) {
      hasUnsavedChanges.value = true
      debouncedAutoSave()
    } else {
      hasUnsavedChanges.value = false
    }
  },
  { deep: true }
)

// 方法定義
// 載入當前工程案資料
const loadCurrentProjectData = async () => {
  // console.log('🔄 開始載入當前工程案資料...')
  
  if (!workspaceStore.currentProject) {
    // console.log('⚠️ 沒有選中的工程案')
    return
  }
  
  const currentProject = workspaceStore.currentProject
  // console.log('📋 當前工程案:', currentProject)
  
  try {
    // 重新載入最新的工程案資料（包含詳細資訊）
    // console.log('🔄 重新載入工程案資料...')
    const updatedProject = await workspaceStore.fetchProjectDetail(currentProject.id, currentProject.workspaceId)
    
    if (updatedProject) {
      // console.log('✅ 工程案資料已更新，映射到表單:', updatedProject)
      mapProjectDataToForm(updatedProject)
    } else {
      // console.log('⚠️ 找不到更新後的工程案，使用現有資料')
      mapProjectDataToForm(currentProject)
    }
  } catch (error: any) {
    console.error('❌ 載入工程案資料失敗:', error)
    
    // 如果是 SUPER_ADMIN 且遇到 401/403 權限問題 (因為 API 限制非成員存取詳情)
    // 但我們已經有列表傳來的基本資料，則使用現有資料並隱藏錯誤提示
    const isSuperAdmin = authStore.user?.role === 'SUPER_ADMIN';
    const isAuthError = error.response?.status === 401 || error.response?.status === 403;
    
    if (isSuperAdmin && isAuthError && currentProject) {
        console.warn('⚠️ 管理員權限受限，使用現有緩存資料顯示表單');
        mapProjectDataToForm(currentProject);
        // 不顯示錯誤 Toast，避免干擾使用者
        return;
    }

    // 如果 API 載入失敗，至少映射現有資料
    // console.log('🔄 使用現有工程案資料...')
    mapProjectDataToForm(currentProject)
    proxy.$toast.error('載入工程案資料失敗')
  }
}

// 將工程案資料映射到表單
const mapProjectDataToForm = (project: any) => {
  // 設置更新標誌，防止觸發 watch 監聽器
  isUpdatingFormData.value = true
  
  try {
    
    // 一次性替換整個 formData，避免多次觸發 watchEffect
    formData.value = {
      // 工程基本資料
      project_name: project.name || '',
      contract_number: project.contractNumber || '',
      project_location: project.location || '',
      project_scale_overview: project.constructionScaleOverview || '', // 新增
      host_agency: project.hostAgency || '',
      supervision_unit: project.supervisionUnit || '',
      contractor_name: project.contractorName || '',
      // 新增：映射公司名稱
      supervisory_company_name: project.supervisoryCompanyName || '',
      contractor_company_name: project.contractorCompanyName || '',
      design_company: project.designCompany || '',
      construction_period: project.constructionPeriod || project.workDay || '',
      duration_type: project.durationType || 'WORKING_DAYS', // 工期計算模式
      project_amount: project.budget || '',
      current_contract_amount: project.currentContractAmount || project.budget || '',
      // 工程類別/屬性
      project_category: project.projectCategory || '',
      // 工期起訖日期
      sign_date: project.signDate ? project.signDate.split('T')[0] : '',
      start_date: project.startDate ? project.startDate.split('T')[0] : '',
      completion_date: project.endDate ? project.endDate.split('T')[0] : '',
      construction_confirm_date: project.constructionConfirmDate ? project.constructionConfirmDate.split('T')[0] : '',
      // 工程專案編號
      construction_project_id: project.constructionProjectId || '',
      // 付款方式
      payment_method: project.paymentMethod || '',
      advance_payment_ratio: project.advancePaymentRatio || '',
      retention_ratio: project.retentionRatio || '',
      // 驗收方式
      inspection_methods: project.inspectionMethods || [],
      segmented_acceptance: project.segmentedAcceptance || false,
      partial_acceptance: project.partialAcceptance || false,
      completion_acceptance: project.completionAcceptance || false,
      // 保險相關資訊
      insurance_policy_number: project.insurancePolicyNumber || '',
      insurance_company: project.insuranceCompany || '',
      insurance_start_date: project.insuranceStartDate ? project.insuranceStartDate.split('T')[0] : '',
      insurance_end_date: project.insuranceEndDate ? project.insuranceEndDate.split('T')[0] : '',
      insurance_type: project.insuranceType || '',
      // 簽核層級
      signLevel: project.signLevel || [],
      // 映射版本號 (若無則預設 0)
      version: project.version || 0
    }
    
    // 映射審核紀錄 (假設 API 回傳結構中有 verificationLogs)
    // 若後端尚未實作，可暂時給空陣列或 Fake Data
    verificationLogs.value = project.verificationLogs || [] 

    // 設定鎖定欄位
    // 只有非 SUPER_ADMIN 才需要套用鎖定 (雖然前端防護，後端也會檢核)
    // 但為了 UI 一致性，這裡直接存下來，由 ProjectForm 決定是否顯示鎖定 (或在此過濾)
    lockedFields.value = project.fixedFields || {}
    
    // console.log('✅ 表單資料映射完成:', formData.value)
  } finally {
    // 重置更新標誌
    isUpdatingFormData.value = false
  }
}

// checkForChanges 方法已內聯到 watchEffect 中
    
    // 瀏覽器離開頁面處理
const beforeUnloadHandler = (event) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
    event.returnValue = '您有未保存的變更，確定要離開嗎？'
    return '您有未保存的變更，確定要離開嗎？'
  }
}
const debouncedAutoSave = () => {
    if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value)
    }
    
    // 3秒後自動儲存
    autoSaveTimer.value = window.setTimeout(async () => {
        if (!hasUnsavedChanges.value) return
        
        // 進入自動儲存狀態
        isAutoSaving.value = true
        try {
             if (projectFormRef.value) {
                 // 使用靜默模式提交
                 await (projectFormRef.value as any).handleSubmit(true)
             }
        } finally {
            isAutoSaving.value = false
        }
    }, 3000)
}

    // 保存表單
const saveForm = async () => {
  // console.log('🚀 開始保存表單...')
  // console.log('📊 BasicData formData:', formData.value)
  
  // 通過 ProjectForm 組件引用觸發驗證和提交
  if (projectFormRef.value) {
    // console.log('📋 觸發 ProjectForm 的提交方法...')
    // console.log('🔍 ProjectForm 驗證狀態:', (projectFormRef.value as any).validation?.errors?.value)
    // 直接調用 ProjectForm 的 handleSubmit 方法，讓它處理驗證
    await (projectFormRef.value as any).handleSubmit()
  } else {
    console.error('❌ 無法找到 ProjectForm 組件引用')
    proxy.$toast.error('表單組件未正確載入，請重新整理頁面')
  }
}
    
// 處理 ProjectForm 的提交事件
const handleProjectFormSubmit = async (data: any) => {
  // console.log('📤 接收到 ProjectForm 提交的數據:', data)
  const isAuto = isAutoSaving.value // 保存當前是否為自動儲存狀態
  isSaving.value = true
  
  try {
    // 調用API保存數據
    await submitFormData(data)
    
    // 保存成功後更新原始數據
    originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    hasUnsavedChanges.value = false
    
    // 只有在手動保存時顯示成功提示
    if (!isAuto) {
        proxy.$toast.success('工程資料保存成功！')
    }
    
  } catch (error) {
    console.error('保存失敗:', error)
    // 自動儲存失敗時不顯示錯誤提示，以免打斷用戶，僅在控制台記錄
    if (!isAuto) {
        proxy.$toast.error('保存失敗，請重試！')
    }
  } finally {
    isSaving.value = false
  }
}

    // 提交表單數據（使用真實 API）
const submitFormData = async (data?: any) => {
  const currentProject = workspaceStore.currentProject
  if (!currentProject) {
    throw new Error('沒有選擇工程案')
  }
  
  const currentWorkspace = workspaceStore.currentWorkspace
  if (!currentWorkspace) {
    throw new Error('沒有選擇工作空間')
  }
  
  // 使用表單數據或傳入的數據
  const formDataToSubmit = data || formData.value
  
  // 取得公司 ID（從當前工作空間）
  const companyId = currentWorkspace.companyId
  if (!companyId) {
    throw new Error('無法獲取公司 ID，請確保工作空間包含公司資訊')
  }
  
  // 轉換為API請求格式
  const constructionRequest = transformProjectFormToConstructionRequest(formDataToSubmit, currentWorkspace.id, companyId)
  
  // 確保 Payload 包含 version
  // 如果是 formDataToSubmit 有 version 則使用，否則使用原始 version
  if ('version' in formDataToSubmit) {
    (constructionRequest as any).version = formDataToSubmit.version
  }

  // 調用更新工程案API
  const response = await updateConstruction(currentProject.id, constructionRequest)
  
  // 檢查後端回傳的資料結構
  // 後端可能直接回傳完整的 Construction 物件，或包在 construction 欄位中，或只回傳 CreateConstructionResponse
  let updatedConstruction: any = null
  
  // 方式 1：後端直接回傳完整的 Construction 物件（包含 constructionId, constructionName 等欄位）
  if (response && (response as any).constructionId) {
    updatedConstruction = response
  }
  // 方式 2：後端回傳的資料包在 construction 欄位中
  else if (response && (response as any).construction) {
    updatedConstruction = (response as any).construction
  }
  
  // 如果 API 回傳了完整的工程案資料，直接使用回傳的資料
  if (updatedConstruction) {
    // 後端有回傳完整的工程案資料，直接使用
    
    // 將 Construction 格式轉換為 WorkspaceProject 格式
    const updatedProject: any = {
      id: updatedConstruction.constructionId || currentProject.id,
      name: updatedConstruction.constructionName || '',
      workspaceId: currentWorkspace.id,
      location: updatedConstruction.constructionLocation || '',
      constructionScaleOverview: updatedConstruction.constructionScaleOverview || null, // 新增
      budget: updatedConstruction.constructionBudget?.toString() || '',
      status: 'IN_PROGRESS' as const,
      signDate: updatedConstruction.signDate || '',
      startDate: updatedConstruction.constructionStartDate || '',
      endDate: updatedConstruction.constructionEndDate || '',
      progress: 0,
      managerName: updatedConstruction.leadOrganization || '',
      description: `${updatedConstruction.constructionType || ''} - ${updatedConstruction.budgetFrom || ''}`,
      contractNumber: updatedConstruction.contractId || '',
      hostAgency: updatedConstruction.leadOrganization || '',
      constructionPeriod: updatedConstruction.workDay?.toString() || '',
      currentContractAmount: updatedConstruction.currentContractAmount?.toString() || updatedConstruction.constructionBudget?.toString() || '',
      projectCategory: updatedConstruction.constructionType || '',
      paymentMethod: updatedConstruction.payMethod || '',
      advancePaymentRatio: updatedConstruction.prePayRatio?.toString() || '',
      retentionRatio: updatedConstruction.retainedRatio?.toString() || '',
      inspectionMethods: [
        updatedConstruction.segmentedAcceptance ? '分段驗收' : '',
        updatedConstruction.partialAcceptance ? '部分驗收' : '',
        updatedConstruction.completionAcceptance ? '竣工驗收' : ''
      ].filter(Boolean),
      insurancePolicyNumber: updatedConstruction.insuranceId || '',
      insuranceCompany: updatedConstruction.insuranceCompanyName || '',
      insuranceStartDate: updatedConstruction.insuranceStartDate || '',
      insuranceEndDate: updatedConstruction.insuranceEndDate || '',
      insuranceType: updatedConstruction.insuranceType || '',
      constructionConfirmDate: updatedConstruction.constructionConfirmDate || '',
      constructionProjectId: updatedConstruction.constructionProjectId || '',
      supervisoryCompanyName: updatedConstruction.supervisoryCompanyName || null,
      contractorCompanyName: updatedConstruction.contractorCompanyName || null,
      designCompany: updatedConstruction.designCompany || null, // 設計公司（工程案層級的基本資料）
      segmentedAcceptance: updatedConstruction.segmentedAcceptance || false,
      partialAcceptance: updatedConstruction.partialAcceptance || false,
      completionAcceptance: updatedConstruction.completionAcceptance || false,
      signLevel: updatedConstruction.signLevel || [],
      workDay: updatedConstruction.workDay || 0,
      durationType: updatedConstruction.durationType || 'WORKING_DAYS',
      totalExtensionDays: updatedConstruction.totalExtensionDays || 0 // 累計展延天數
    }
    
    // 更新 workspace store 中的工程案
    workspaceStore.updateProject(currentProject.id, updatedProject)
    
    // 更新當前選中的工程案（會自動選擇工作空間）
    await workspaceStore.setCurrentProject(updatedProject, false)
    
    // 手動更新表單資料
    mapProjectDataToForm(updatedProject)
  } else {
    // 後端沒有回傳完整的工程案資料，重新查詢列表
  // 清除該工作空間的工程案緩存，強制重新載入
  const cacheKey = `eip-workspace-projects-${currentWorkspace.id}`
  storage.remove(cacheKey)
  
  // 重新查詢最新的工程案資料
  await workspaceStore.getProjectsByWorkspace(currentWorkspace.id)
  
  // 獲取更新後的工程案資料
  const updatedProject = workspaceStore.workspaceProjects.find(p => p.id === currentProject.id)
  if (updatedProject) {
    // 更新 workspace store 中的工程案
    workspaceStore.updateProject(currentProject.id, updatedProject)

    // 更新當前選中的工程案（會自動選擇工作空間）
    await workspaceStore.setCurrentProject(updatedProject, false)
    
    // 手動更新表單資料
    mapProjectDataToForm(updatedProject)
    }
  }
  
  return response
}
    
    // 重置表單
const resetForm = () => {
  if (hasUnsavedChanges.value) {
    const answer = window.confirm('確定要重置表單嗎？所有未保存的變更將會丟失。')
        if (!answer) {
      return
    }
  }
  
  // 重置 formData
  formData.value = JSON.parse(JSON.stringify(originalFormData.value))
  hasUnsavedChanges.value = false
  
  // 通過 ProjectForm 組件引用重置表單
  if (projectFormRef.value) {
    (projectFormRef.value as any).handleReset()
  }
  
  proxy.$toast.info('表單已重置')
}





// 生命週期
onMounted(async () => {
  console.log('🚀 BasicData: 頁面載入...')
  console.log('🔧 工程案編輯器開啟 - 模式: edit')
  
  // 等待工作空間初始化完成
  if (!workspaceStore.isInitialized) {
    console.log('🔄 BasicData: 工作空間未初始化，開始初始化...')
    await workspaceStore.initWorkspaces()
    console.log('✅ BasicData: 工作空間初始化完成')
  } else {
    console.log('✅ BasicData: 工作空間已初始化')
  }
  
  // 手動載入工程案資料（強制刷新，查詢最新資料）
  if (workspaceStore.currentProject) {
    console.log('🔄 BasicData: 開始載入工程案資料（強制刷新）...')
    await loadProjectData(workspaceStore.currentProject, true) // 傳入 true 強制刷新
  } else {
    console.log('⚠️ BasicData: 沒有當前工程案')
  }
  
  // 添加瀏覽器離開頁面提示
  window.addEventListener('beforeunload', beforeUnloadHandler)
  console.log('✅ BasicData: 頁面載入完成')
})

onBeforeUnmount(() => {
  // 清除事件監聽器
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})

onBeforeRouteLeave((to, from, next) => {
  // Vue Router 路由離開守卫
  if (hasUnsavedChanges.value) {
    const answer = window.confirm('您有未保存的變更，確定要離開嗎？')
    if (answer) {
      next()
    } else {
      next(false)
    }
  } else {
    next()
  }
})
</script>

<template>
	<PageHeader
		title="基本資料維護"
		icon="fa fa-edit"
		:breadcrumbs="[
			{ text: '表單生成與管理', href: 'javascript:;' },
			{ text: '基本資料維護', active: true }
		]"
	/>
	
	
	<div class="row gx-4">
		<div class="col-lg-12">
            <!-- 審核紀錄顯示區塊 -->
            <Card class="mb-4" v-if="verificationLogs.length > 0">
                <CardBody>
                    <VerificationLogList :logs="verificationLogs" />
                </CardBody>
            </Card>

			<!-- 工程基本資料 -->
			<ProjectForm 
				ref="projectFormRef"
				class="mb-4"
				v-model="formData"
				:mode="'edit'"
				:is-submitting="isSaving"
				:show-submit-button="false"
				:show-reset-button="false"
				:locked-fields="lockedFields"
				@submit="handleProjectFormSubmit"
			/>




			<!-- 操作按鈕 -->
			<div class="d-flex justify-content-end gap-2 align-items-center">
                <span v-if="isAutoSaving" class="text-muted small me-2">
                    <i class="fa fa-spinner fa-spin me-1"></i>自動儲存中...
                </span>
                <span v-else-if="!hasUnsavedChanges && !isSaving" class="text-success small me-2">
                    <i class="fa fa-check me-1"></i>已儲存
                </span>
				<button
					type="button"
					class="btn btn-outline-secondary"
					@click="resetForm"
					:disabled="isSaving"
				>
					<i class="fa fa-undo me-1"></i>
					重置
				</button>
				<button
					type="button"
					class="btn btn-theme"
					@click="saveForm"
					:disabled="isSaving"
				>
					<i
						class="fa me-1"
						:class="{
							'fa-spin fa-spinner': isSaving,
							'fa-save': !isSaving,
						}"
					></i>
					{{ isSaving ? '處理中...' : '保存' }}
				</button>
			</div>
			


			<!-- 未保存變更提示 -->
			<div v-if="hasUnsavedChanges" class="alert alert-warning mt-3" role="alert">
				<i class="fa fa-exclamation-triangle me-2"></i>
				您有未保存的變更
			</div>
		</div>
	</div>
</template>

<style scoped>
.form-control:focus,
.form-select:focus {
  border-color: var(--bs-theme);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-theme-rgb), 0.25);
}

</style>