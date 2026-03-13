<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { createConstruction, type CreateConstructionRequest } from '@/api/construction'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import CompanySearchSelect from '@/components/common/CompanySearchSelect.vue'
import CompanyFormModal from '@/components/company/CompanyFormModal.vue'
import { companyApi } from '@/api/company'
import { getCurrentInstance } from 'vue'

const router = useRouter()
const authStore = useAuthStore()
const { proxy } = getCurrentInstance() as any
const toast = {
  success: (msg: string) => proxy?.$toast?.success(msg),
  error: (msg: string) => proxy?.$toast?.error(msg),
  warning: (msg: string) => proxy?.$toast?.warning(msg)
}

// 步驟控制
const currentStep = ref(1) // 1: 基本資料, 2: 單位指派
const totalSteps = 2

// 表單數據
const formData = reactive<Partial<CreateConstructionRequest>>({
  // Step 1: Master Data
  contractId: '', 
  constructionName: '',
  constructionLocation: '',
  constructionBudget: 0,
  workDay: 0,
  durationType: 'WORKING_DAYS', // 預設工作天
  
  // Step 2: Organization
  contractorCompanyId: '',
  supervisionCompanyId: '',
  
  // hidden fields / defaults
  workspaceId: '', // 將在提交時自動生成或指定 (後端處理)
  companyId: '', // 此欄位為了相容 API，通常填入營造廠 ID
  
  // Defaults
  segmentedAcceptance: false,
  partialAcceptance: false,
  completionAcceptance: true,
  payMethod: '分期付款',
})

const isSubmitting = ref(false)

// 公司建立 Modal 相關
const showCompanyModal = ref(false)
const companyModalData = ref<any>(null) // 使用 any 允許傳入部分資料以預填類型

const handleCreateCompany = (type: string) => {
  // 預填公司類型
  companyModalData.value = {
    companyName: '',
    companyUnifiedNumber: '',
    companyType: type,
    contractorLevel: 'CLASS_A',
    // 虛擬 ID 避免錯誤 (CompanyFormModal 可能需要 ID 來判斷是否為編輯模式，但這裡我們希望它是"帶有預設值的新增模式")
    // 查看 CompanyFormModal 邏輯： if (newCompany) -> 編輯模式。
    // 這有問題。如果傳入物件，它會變成編輯模式（標題變"編輯"）。
    // 我們需要的是"新增但有預設值"。
    // 解決方案：傳入 null，讓 Modal 預設為新增，但這樣無法預設類型。
    // 替代方案：修改 CompanyFormModal 支援 defaultType，或者我們先不預設（讓用戶自己選）。
    // 為了 UX，最好能預設。
    // 暫時傳入 null，讓用戶自己選類型，或者...
    // 既然 CompanyFormModal.vue 是我們可控的，我們可以修改它。
    // 但現在我不想改太多 component。
    // 讓我檢查 CompanyFormModal.vue 是否有判斷 ID。
    // 它只判斷 `!!props.company` 來決定是編輯模式。
    // 所以如果傳入物件，標題會是「編輯公司」。這有點怪，除此之外功能可能正常。
    // 提交時它會 emit 'submit'，這沒問題。
    // 讓我傳入 null，以避免混淆，讓使用者自己在 Modal 中選擇類型 (雖然有點不便) => 不，使用者從"營造廠"點進來，預期就是建營造廠。
    // 讓我快速修正 CompanyFormModal.vue 支援 defaultType 嗎？ No, let's keep it simple first.
    // I will pass null for now to avoid specific "Edit" logic, OR accept "Edit" title for now? No "Edit" title implies updating existing.
    // WORKAROUND: Don't pass company prop. Just manually set the internal formData of the modal? No, can't access ref easily.
    // DECISION: Pass null `company` to Modal. But wait, `handleCompanySubmit` needs to know which field to update (Contractor or Supervision).
    // So I need a state `creatingTarget: 'CONTRACTOR' | 'SUPERVISION'`.
  }
}

const creatingTarget = ref<'CONTRACTOR' | 'SUPERVISION' | null>(null)

const handleCreateCompanyAndSetTarget = (type: 'CONTRACTOR' | 'SUPERVISION') => {
  creatingTarget.value = type
  // Reset modal data (ensure it's creation mode)
  companyModalData.value = null 
  showCompanyModal.value = true
}

const handleCompanySubmit = async (data: any) => {
  try {
    // 呼叫 API 建立公司
    const newCompany = await companyApi.create(data)
    toast.success(`${newCompany.companyName} 建立成功`)
    showCompanyModal.value = false
    
    // 自動選取新建立的公司
    if (creatingTarget.value === 'CONTRACTOR') {
       formData.contractorCompanyId = newCompany.companyId
    } else if (creatingTarget.value === 'SUPERVISION') {
       formData.supervisionCompanyId = newCompany.companyId
    }
  } catch (error: any) {
    console.error('Create company failed:', error)
    toast.error(error.response?.data?.message || '建立公司失敗')
  }
}

// 步驟 1 驗證
const isStep1Valid = computed(() => {
  return !!(
    formData.contractId &&
    formData.constructionName &&
    formData.constructionLocation &&
    formData.constructionBudget !== undefined
  )
})

// 步驟 2 驗證
const isStep2Valid = computed(() => {
  // 必須至少選擇營造廠 (作為主要負責單位)
  return !!formData.contractorCompanyId
})

// 下一步
const nextStep = () => {
  if (currentStep.value === 1 && isStep1Valid.value) {
    currentStep.value = 2
  } else {
    toast.warning('請填寫所有必填欄位')
  }
}

// 上一步
const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 提交表單
const handleSubmit = async () => {
  if (isSubmitting.value) return
  
  if (!formData.contractorCompanyId) {
    toast.error('請指派營造廠商')
    return
  }
  
  isSubmitting.value = true
  
  try {
    // 準備 Payload
    // companyId 填入 營造廠 ID (作為主要擁有者/Main Contractor)
    // 準備 Payload
    // companyId 填入 營造廠 ID (作為主要擁有者/Main Contractor)
    const payload: CreateConstructionRequest = {
      workspaceId: '', // 留空，由後端處理
      companyId: formData.contractorCompanyId!,
      contractorCompanyId: formData.contractorCompanyId,
      supervisionCompanyId: formData.supervisionCompanyId,
      contractId: formData.contractId!,
      constructionName: formData.constructionName!,
      constructionLocation: formData.constructionLocation!,
      leadOrganization: '',
      constructionBudget: formData.constructionBudget || 0,
      currentContractAmount: formData.constructionBudget || 0,
      signDate: '',
      constructionStartDate: '',
      constructionConfirmDate: '',
      constructionProjectId: formData.contractId!,
      payMethod: formData.payMethod || '分期付款',
      insuranceId: '',
      insuranceCompanyName: '',
      insuranceStartDate: '',
      insuranceEndDate: '',
      insuranceType: '',
      segmentedAcceptance: formData.segmentedAcceptance || false,
      partialAcceptance: formData.partialAcceptance || false,
      completionAcceptance: formData.completionAcceptance || true,
      prePayRatio: 0,
      retainedRatio: 0,
      constructionType: '',
      signLevel: [],
      workDay: formData.workDay || 0,
      durationType: formData.durationType
    }
    
    // 呼叫 API
    await createConstruction(payload)
    
    toast.success('工程案與工作空間建立成功！')
    
    // 導向到專案列表或 Basic Data
    // Admin 應該回到列表查看新專案，或提示去分配帳號
    // 根據需求：導向該專案的成員管理頁面 (目前假設先回列表，因為成員管理 URL 需要 project ID)
    router.push('/admin/projects')
    
  } catch (error: any) {
    console.error('Create error:', error)
    const msg = error.response?.data?.message || '建立失敗'
    toast.error(msg)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="create-project-page app-page">
    <PageHeader
      title="建立新工程案"
      icon="fa fa-hard-hat"
      :breadcrumbs="[
        { text: '系統管理', href: '#' },
        { text: '建立新工程案', active: true }
      ]"
    />
    <div class="row justify-content-center">
      <div class="col-lg-8">
        
        <!-- 步驟指示器 -->
        <div class="steps-container mb-4 d-flex justify-content-between position-relative">
           <div class="progress position-absolute" style="height: 2px; z-index: 0; background-color: rgba(255,255,255,0.1); top: 20px; left: 50px; right: 50px;">
              <div class="progress-bar bg-theme" :style="{ width: currentStep === 1 ? '50%' : '100%' }"></div>
           </div>
           
           <div class="step-item text-center position-relative px-2" style="z-index: 1;">
              <div 
                class="step-circle rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 fw-bold"
                :class="currentStep >= 1 ? 'bg-theme text-white shadow-lg' : 'bg-secondary text-white-50 border border-secondary'"
                style="width: 40px; height: 40px;"
              >1</div>
              <small class="fw-bold" :class="currentStep >= 1 ? 'text-theme' : 'text-muted'">工程基本資料</small>
           </div>
           
           <div class="step-item text-center position-relative px-2" style="z-index: 1;">
              <div 
                class="step-circle rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2 fw-bold"
                :class="currentStep >= 2 ? 'bg-theme text-white shadow-lg' : 'bg-secondary text-white-50 border border-secondary'"
                style="width: 40px; height: 40px;"
              >2</div>
              <small class="fw-bold" :class="currentStep >= 2 ? 'text-theme' : 'text-muted'">指派參與單位</small>
           </div>
        </div>

        <Card>
          <CardHeader class="fw-bold fs-5 d-flex align-items-center border-bottom border-dark">
            <i class="fa fa-hard-hat me-2 text-theme"></i>
            {{ currentStep === 1 ? '建立新工程案 - 基本資料' : '指派參與單位' }}
          </CardHeader>
          
          <CardBody>
            <form @submit.prevent>
              
              <!-- Step 1: Master Data -->
              <div v-show="currentStep === 1" class="step-content">
                <div class="alert alert-info bg-opacity-10 border-info border-start border-4 d-flex align-items-center mb-4 text-info">
                  <i class="fa fa-info-circle fs-4 me-3"></i>
                  <div>
                    <strong>說明：</strong> 此處填寫的資料為工程案的主檔資料 (Master Data)。<br>
                    送出後，關鍵欄位 (如工程編號、名稱) 將被鎖定，僅 Super Admin 可修改。
                  </div>
                </div>

                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">工程編號 <span class="text-danger">*</span></label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="formData.contractId" 
                      placeholder="例：113-A-001" 
                      required
                    />
                  </div>
                  
                  <div class="col-md-6">
                    <label class="form-label">工程名稱 <span class="text-danger">*</span></label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="formData.constructionName" 
                      placeholder="請輸入完整工程名稱" 
                      required
                    />
                  </div>
                  
                  <div class="col-12">
                     <label class="form-label">工程地點 <span class="text-danger">*</span></label>
                     <input 
                       type="text" 
                       class="form-control" 
                       v-model="formData.constructionLocation" 
                       placeholder="工程實施地點" 
                       required
                     />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label">工程預算 (元)</label>
                    <div class="input-group">
                      <span class="input-group-text">$</span>
                      <input 
                        type="number" 
                        class="form-control" 
                        v-model="formData.constructionBudget" 
                        min="0"
                      />
                    </div>
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">契約工期</label>
                    <input 
                      type="number" 
                      class="form-control" 
                      v-model="formData.workDay" 
                      min="0"
                    />
                  </div>
                  
                  <div class="col-md-3">
                    <label class="form-label">工期計算</label>
                    <select class="form-select" v-model="formData.durationType">
                      <option value="WORKING_DAYS">工作天</option>
                      <option value="CALENDAR_DAYS">日曆天</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Step 2: Organization Assignment -->
              <div v-show="currentStep === 2" class="step-content">
                <div class="alert alert-warning bg-opacity-10 border-warning border-start border-4 d-flex align-items-center mb-4 text-warning">
                  <i class="fa fa-users fs-4 me-3"></i>
                  <div>
                    <strong>指派邏輯：</strong> 請指定本案的「營造廠商」與「監造單位」。<br>
                    系統將自動為此工程案建立新的工作空間，並將選定的公司加入其中。
                  </div>
                </div>

                <div class="mb-4">
                  <h6 class="fw-bold border-bottom pb-2 mb-3 text-primary">營造廠商 (Contractor)</h6>
                  <CompanySearchSelect
                    v-model="formData.contractorCompanyId"
                    label="選擇營造廠商"
                    type="CONTRACTOR"
                    :required="true"
                    :use-admin-api="true"
                    placeholder="搜尋營造廠商名稱或統編..."
                    @create="handleCreateCompanyAndSetTarget('CONTRACTOR')"
                  />
                  <div class="form-text text-muted mt-2">
                    <i class="fa fa-info-circle me-1"></i>
                    若找不到公司，可點擊下拉選單中的「新增公司」按鈕直接建立。
                  </div>
                </div>

                <div class="mb-4">
                  <h6 class="fw-bold border-bottom pb-2 mb-3 text-info">監造單位 (Supervision)</h6>
                  <CompanySearchSelect
                    v-model="formData.supervisionCompanyId"
                    label="選擇監造單位"
                    type="SUPERVISION"
                    :use-admin-api="true"
                    placeholder="搜尋監造單位名稱或統編..."
                    @create="handleCreateCompanyAndSetTarget('SUPERVISION')"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="d-flex justify-content-between mt-5 pt-3 border-top">
                <button 
                  v-if="currentStep > 1" 
                  type="button" 
                  class="btn btn-outline-secondary px-4" 
                  @click="prevStep"
                >
                  <i class="fa fa-arrow-left me-2"></i>上一步
                </button>
                <button 
                  v-else 
                  type="button" 
                  class="btn btn-secondary px-4" 
                  @click="router.back()"
                >
                  取消
                </button>

                <button 
                  v-if="currentStep < totalSteps" 
                  type="button" 
                  class="btn btn-theme px-4" 
                  @click="nextStep"
                >
                  下一步<i class="fa fa-arrow-right ms-2"></i>
                </button>
                <button 
                  v-else 
                  type="button" 
                  class="btn btn-success px-4" 
                  @click="handleSubmit"
                  :disabled="isSubmitting || !isStep2Valid"
                >
                  <i v-if="isSubmitting" class="fa fa-spinner fa-spin me-2"></i>
                  確認建案
                </button>
              </div>

            </form>
          </CardBody>
        </Card>

        <!-- Company Creation Modal -->
        <CompanyFormModal
            v-model:show="showCompanyModal"
            :company="companyModalData"
            @submit="handleCompanySubmit"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-theme { color: var(--bs-theme); }
.bg-theme { background-color: var(--bs-theme); }
.step-circle { transition: all 0.3s ease; }
</style>
