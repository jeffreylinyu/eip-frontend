<script setup lang="ts">
import { ref, reactive, computed, watch, watchEffect, onMounted, onBeforeUnmount, nextTick, getCurrentInstance } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { storage } from '@/utils/storage'
import { updateConstruction, transformProjectFormToConstructionRequest } from '@/api/construction'
import { useAuthStore } from '@/stores/auth' // Import auth store
import { useViewPerspective } from '@/composables/useViewPerspective'
import { throttle } from 'lodash'
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
const route = useRoute()
const { viewType, initViewType } = useViewPerspective()

// 檢查是否為空狀態（當前視角沒有資料）
const isEmptyState = ref(false)

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

// 檢查用戶是否為專案管理員或成員（可以編輯）
const isProjectAdmin = computed(() => {
  const currentProject = workspaceStore.currentProject
  if (!currentProject) {
    return false
  }
  
  // SUPER_ADMIN 系統管理員視為專案管理員
  const userRole = authStore.user?.systemRole || authStore.user?.role
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  if (isSuperAdmin) {
    return true
  }
  
  // 檢查 permission 欄位（優先使用）
  const permission = currentProject.permission
  
  // ADMIN 和 MEMBER 都可以編輯，只有 VIEWER 是只讀
  if (permission === 'ADMIN' || permission === 'MEMBER') {
    return true
  }
  
  // 如果沒有 permission 欄位，不應該預設為 true
  // 應該根據用戶角色判斷，或者預設為 false（更安全）
  if (!permission) {
    return false
  }
  
  return false
})

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
  
  // 確保已載入參與單位資料（用於自動帶入監造與營造公司名稱）
  if (project.workspaceId) {
    await workspaceStore.fetchParticipatingUnits(project.workspaceId)
  }
  
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
  if (!workspaceStore.currentProject) {
    return
  }
  
  const currentProject = workspaceStore.currentProject
  
  try {
    // 確保已載入參與單位資料（用於自動帶入監造與營造公司名稱）
    if (currentProject.workspaceId) {
      await workspaceStore.fetchParticipatingUnits(currentProject.workspaceId)
    }
    
    // 重新載入最新的工程案資料（包含詳細資訊）
    // 根據當前視角傳遞 viewType 參數（系統管理員可以手動切換視角）
    const currentViewType = viewType.value
    const viewTypeParam = (currentViewType === 'SUPERVISORY' || currentViewType === 'CONTRACTOR') ? currentViewType : undefined
    
    const updatedProject = await workspaceStore.fetchProjectDetail(currentProject.id, currentProject.workspaceId, viewTypeParam)
    
    if (updatedProject) {
      mapProjectDataToForm(updatedProject)
      isEmptyState.value = false
    } else {
      mapProjectDataToForm(currentProject)
      isEmptyState.value = false
    }
  } catch (error: any) {
    // 檢查錯誤類型
    const errorStatus = error?.response?.status
    const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || ''
    const errorCode = error?.response?.data?.code
    
    // 如果是 404、401 或視角權限錯誤，顯示空狀態
    if (errorStatus === 404 || errorStatus === 401 || 
        errorCode === 401 || 
        errorMessage.includes('僅供') || 
        errorMessage.includes('視角') || 
        errorMessage.includes('監造') || 
        errorMessage.includes('營造') ||
        errorMessage.includes('不存在')) {
      console.warn('⚠️ 當前視角沒有此工程案的資料:', { errorStatus, errorMessage, errorCode })
      // 清空表單，顯示空狀態
      clearFormData()
      isEmptyState.value = true
      // 不顯示 toast，因為這是正常情況（營造視角可能沒有資料）
      return
    }
    
    console.error('❌ 載入工程案資料失敗:', error)
    isEmptyState.value = false
    
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
    mapProjectDataToForm(currentProject)
    proxy.$toast.error('載入工程案資料失敗')
  }
}

// 清空表單資料（用於顯示空狀態）
const clearFormData = () => {
  isUpdatingFormData.value = true
  try {
    // 重置所有表單欄位為空值
    formData.value = {
      project_name: "",
      contract_number: "",
      project_location: "",
      project_scale_overview: "",
      host_agency: "",
      supervision_unit: "",
      contractor_name: "",
      supervisory_company_name: "",
      contractor_company_name: "",
      design_company: "",
      construction_period: "",
      duration_type: "WORKING_DAYS",
      project_amount: "",
      current_contract_amount: "",
      project_category: "",
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
      signLevel: [],
      version: 0,
    }
    originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    hasUnsavedChanges.value = false
    isEmptyState.value = false
  } finally {
    isUpdatingFormData.value = false
  }
}

// 監聽視角變化，重新載入資料
watch(() => route.path, async (newPath, oldPath) => {
  // 如果路徑包含視角前綴且路徑確實改變了，重新載入資料
  if ((newPath.includes('/supervisory/') || newPath.includes('/contractor/')) && newPath !== oldPath) {
    // 檢查是否為視角切換（路徑前綴改變）
    const isViewTypeChange = 
      (oldPath?.startsWith('/supervisory/') && newPath.startsWith('/contractor/')) ||
      (oldPath?.startsWith('/contractor/') && newPath.startsWith('/supervisory/'))
    
    if (isViewTypeChange) {
      // 視角切換時，不需要重新初始化視角（已經在 ViewTypeSwitcher 中手動設定了）
      // 直接重新載入工程案資料
      if (workspaceStore.currentProject) {
        await loadCurrentProjectData()
      }
    } else if (workspaceStore.currentWorkspace?.id) {
      // 其他情況（如首次載入），才需要初始化視角
      await initViewType(workspaceStore.currentWorkspace.id)
      if (workspaceStore.currentProject) {
        await loadCurrentProjectData()
      }
    }
  }
}, { immediate: false })

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
      // 新增：映射公司名稱（如果工程案中沒有，則從工作空間設定自動帶入）
      supervisory_company_name: project.supervisoryCompanyName || workspaceStore.participatingUnits.supervisoryCompany?.companyName || '',
      contractor_company_name: project.contractorCompanyName || workspaceStore.participatingUnits.contractorCompany?.companyName || '',
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
            // 重置自動儲存狀態
            isAutoSaving.value = false
        }
    }, 3000)
}

    // 保存表單
const saveForm = async () => {
  // 通過 ProjectForm 組件引用觸發驗證和提交
  if (projectFormRef.value) {
    // 直接調用 ProjectForm 的 handleSubmit 方法，讓它處理驗證
    await (projectFormRef.value as any).handleSubmit()
  } else {
    console.error('❌ 無法找到 ProjectForm 組件引用')
    proxy.$toast.error('表單組件未正確載入，請重新整理頁面')
  }
}
    
// Throttled success toast for auto-save (max once every 3 seconds)
const showAutoSaveSuccessToast = throttle(() => {
  proxy.$toast.success('自動儲存成功')
}, 3000, { trailing: false })

// 處理 ProjectForm 的提交事件
const handleProjectFormSubmit = async (data: any) => {
  const isAuto = isAutoSaving.value // 保存當前是否為自動儲存狀態
  
  // 自動儲存時不設置 isSaving，避免觸發 UI 更新導致焦點丟失
  if (!isAuto) {
    isSaving.value = true
  }
  
  try {
    // 調用API保存數據，傳入自動儲存標記
    await submitFormData(data, isAuto)
    
    // 自動儲存時：更新狀態但不重新渲染表單，避免焦點丟失
    // 手動儲存時：更新原始數據和狀態
    if (!isAuto) {
      // 手動儲存時，正常更新
      originalFormData.value = JSON.parse(JSON.stringify(formData.value))
      hasUnsavedChanges.value = false
      proxy.$toast.success('工程資料保存成功！')
    } else {
      // 自動儲存成功後：更新狀態（但不重新渲染表單）並顯示提示
      // 使用 isUpdatingFormData 標誌防止觸發 watch 監聽器
      isUpdatingFormData.value = true
      try {
        originalFormData.value = JSON.parse(JSON.stringify(formData.value))
        hasUnsavedChanges.value = false
      } finally {
        isUpdatingFormData.value = false
      }
      // 顯示自動儲存成功提示（使用 throttle 限制頻率）
      showAutoSaveSuccessToast()
    }
    
  } catch (error) {
    console.error('保存失敗:', error)
    // 自動儲存失敗時不顯示錯誤提示，以免打斷用戶，僅在控制台記錄
    if (!isAuto) {
        proxy.$toast.error('保存失敗，請重試！')
    }
  } finally {
    if (!isAuto) {
      isSaving.value = false
    }
  }
}

    // 提交表單數據（使用真實 API）
const submitFormData = async (data?: any, isAutoSave: boolean = false) => {
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
  
  // 自動儲存時：完全不更新任何狀態，只調用 API 保存資料
  // 手動儲存時：更新 workspace store 和表單資料
  if (!isAutoSave) {
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
        totalExtensionDays: updatedConstruction.totalExtensionDays || 0, // 累計展延天數
        permission: updatedConstruction.permission || currentProject.permission // 保留權限資訊
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
  }
  // 自動儲存時：什麼都不做，保持當前編輯狀態
  
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
  // 等待工作空間初始化完成
  if (!workspaceStore.isInitialized) {
    await workspaceStore.initWorkspaces()
  }
  
  // 初始化視角
  if (workspaceStore.currentWorkspace?.id) {
    await initViewType(workspaceStore.currentWorkspace.id)
  }
  
  // 手動載入工程案資料（強制刷新，查詢最新資料）
  if (workspaceStore.currentProject) {
    await loadProjectData(workspaceStore.currentProject, true) // 傳入 true 強制刷新
  }
  
  // 添加瀏覽器離開頁面提示
  window.addEventListener('beforeunload', beforeUnloadHandler)
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

			<!-- 空狀態提示 -->
			<Card v-if="isEmptyState" class="mb-4">
				<CardBody>
					<div class="text-center py-5">
						<i class="fa fa-inbox fa-3x text-muted mb-3"></i>
						<h5 class="text-muted mb-3">當前視角沒有此工程案的資料</h5>
						<p class="text-muted mb-4">
							<span v-if="viewType === 'CONTRACTOR'">
								營造視角目前沒有此工程案的資料。<br>
								此工程案可能尚未建立營造視角的資料，或您沒有權限查看。
							</span>
							<span v-else-if="viewType === 'SUPERVISORY'">
								監造視角目前沒有此工程案的資料。<br>
								此工程案可能尚未建立監造視角的資料，或您沒有權限查看。
							</span>
							<span v-else>
								當前視角目前沒有此工程案的資料。
							</span>
						</p>
						<p class="text-muted small">
							<i class="fa fa-info-circle me-1"></i>
							請聯繫系統管理員或切換到其他視角查看。
						</p>
					</div>
				</CardBody>
			</Card>
			
			<!-- 工程基本資料 -->
			<ProjectForm 
				v-else
				ref="projectFormRef"
				class="mb-4"
				v-model="formData"
				:mode="isProjectAdmin ? 'edit' : 'readonly'"
				:is-submitting="isSaving"
				:show-submit-button="false"
				:show-reset-button="false"
				@submit="handleProjectFormSubmit"
			/>




			<!-- 操作按鈕（僅專案管理員可見） -->
			<div v-if="isProjectAdmin" class="d-flex justify-content-end gap-2 align-items-center">
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
			
			<!-- 非管理員提示 -->
			<div v-else class="d-flex justify-content-end">
				<div class="alert alert-info mb-0" role="alert">
					<i class="fa fa-info-circle me-2"></i>
					<span>您目前是檢視者權限，無法編輯工程案資料。如需修改，請聯繫專案管理員。</span>
				</div>
			</div>
			
			<!-- 非管理員提示 -->
			<div v-else class="d-flex justify-content-end">
				<div class="alert alert-info mb-0" role="alert">
					<i class="fa fa-info-circle me-2"></i>
					<span>您目前是檢視者權限，無法編輯工程案資料。如需修改，請聯繫專案管理員。</span>
				</div>
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