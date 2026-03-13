<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth' // Import auth store
import { useValidation } from '@/composables/useValidation'
import { projectFormValidationRules } from '@/utils/projectValidationRules'
import { formatNumber, toRepublicYear } from '@/utils/format'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import { validateForm, isFormValid } from '@/utils/validation'
import { calculateEndDate } from '@/api/construction'

/** 變更設計版本時僅可編輯的 12 個欄位（與後端一致） */
const VERSION_EDITABLE_FIELD_KEYS = new Set([
  'project_location', 'construction_period', 'project_amount',
  'payment_method', 'advance_payment_ratio', 'retention_ratio',
  'insurance_policy_number', 'insurance_company', 'insurance_type',
  'insurance_start_date', 'insurance_end_date'
])

// Props
const props = defineProps<{
  modelValue?: any
  isSubmitting?: boolean
  showSubmitButton?: boolean
  submitButtonText?: string
  showResetButton?: boolean
  mode?: 'create' | 'edit' | 'readonly'
  /** 為 true 時僅上述 12 欄可編輯，其餘唯讀（用於變更設計版本 Tab） */
  versionFieldsOnly?: boolean
}>()

// 默認值
const defaultProps = {
  modelValue: {},
  isSubmitting: false,
  showSubmitButton: true,
  submitButtonText: "保存",
  showResetButton: true,
  mode: 'create' as const
}

// 應用默認值
const propValues = computed(() => {
  const values = {
    ...defaultProps,
    ...props
  }
  return values
})

// Router
const router = useRouter()

// Workspace Store（用於獲取當前工程編號）
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore() // Init auth store

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: any]
  'submit': [data: any]
  'reset': []
}>()

  // 表單數據
const formData = ref({
  // 工程基本資料
  project_name: "",
  contract_number: "",
  project_location: "",
  host_agency: "",
  // 新增：公司名稱顯示欄位
  supervisory_company_name: "",
  contractor_company_name: "",
  design_company: "", // 設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
  construction_period: "",
  duration_type: "WORKING_DAYS", // 工期計算模式：CALENDAR_DAYS（日曆天）或 WORKING_DAYS（工作天）
  project_amount: "",
  // 契約金額相關
  current_contract_amount: "",
  // 工程類別/屬性
  project_category: "",
  // 工期起訖日期
  start_date: "",
  completion_date: "",
  sign_date: "",
  // 付款方式
  payment_method: "",
  advance_payment_ratio: "",
  retention_ratio: "",
  // 驗收方式
  inspection_methods: [],
  // 保險相關資訊
  insurance_policy_number: "",
  insurance_company: "",
  insurance_start_date: "",
  insurance_end_date: "",
  insurance_type: "",
  // 簽核層級
  signLevel: [],
  // 變更紀錄
  contract_changes: [],
})

// 整合驗證系統
const validation = useValidation(formData, projectFormValidationRules, {
  validateOnInput: false,
  validateOnBlur: true,
  validateOnChange: false,
  debounceMs: 300
})

// 防止循環更新的標誌
let isUpdatingFromParent = false
let lastEmittedValue: any = null

// 模式判斷
const isCreateMode = computed(() => propValues.value.mode === 'create')
const isEditMode = computed(() => propValues.value.mode === 'edit')
const isReadonlyMode = computed(() => {
  return propValues.value.mode === 'readonly'
})

// 檢查是否為系統管理員（只有 SUPER_ADMIN 可以編輯共用欄位）
const isSuperAdmin = computed(() => {
  const userRole = authStore.user?.systemRole || authStore.user?.role
  return userRole === 'SUPER_ADMIN'
})

// 共用欄位（工程名稱和契約編號）是否只讀：只有 SUPER_ADMIN 可以編輯
const isSharedFieldsReadonly = computed(() => {
  return isReadonlyMode.value || !isSuperAdmin.value
})

// 變更設計版本模式：僅 12 欄可編輯，其餘改為資訊呈現（不用 input）
const isVersionFieldsOnly = computed(() => propValues.value.versionFieldsOnly === true)
const isFieldReadonly = (fieldKey: string) =>
  isReadonlyMode.value || (isVersionFieldsOnly.value && !VERSION_EDITABLE_FIELD_KEYS.has(fieldKey))
/** 非原契約時，非 12 欄改為純資訊顯示（不渲染 input） */
const showFieldAsInfo = (fieldKey: string) =>
  isVersionFieldsOnly.value && !VERSION_EDITABLE_FIELD_KEYS.has(fieldKey)
/** 資訊顯示用：取得欄位顯示文字 */
const getInfoDisplayValue = (fieldKey: string) => {
  const v = formData.value[fieldKey]
  if (v === undefined || v === null || v === '') return '－'
  if (fieldKey === 'signLevel' && Array.isArray(v)) {
    const titles = v.map((i: any) => i?.title).filter(Boolean)
    return titles.length ? titles.join('、') : '－'
  }
  if (fieldKey === 'completion_date') return formattedCompletionDate.value || '－'
  if (Array.isArray(v)) return v.length ? v.join('、') : '－'
  return String(v)
}

// Modal 狀態
const showChangeModal = ref(false)

// 完工日期計算相關
const calculatedEndDate = ref<string>('')
const isCalculatingEndDate = ref(false)

// 累計停工天數（SPECIFIC_DATES 核准的免計日期數量）
const totalStopDays = computed(() => {
  return props.modelValue?.totalStopDays 
    || workspaceStore.currentProject?.totalStopDays 
    || 0
})

// 計算完工日期（呼叫後端 API）
const calculateCompletionDate = async () => {
  const startDate = formData.value.start_date
  const period = parseInt(formData.value.construction_period)
  const constructionId = workspaceStore.currentProject?.id
  
  if (!startDate || !period || period <= 0 || !constructionId) {
    return
  }
  
  isCalculatingEndDate.value = true
  try {
    const { calculateEndDate } = await import('@/api/construction')
    const durationType = formData.value.duration_type as 'CALENDAR_DAYS' | 'WORKING_DAYS' | undefined
    // 使用原工期（免計日已由後端 HolidayService 處理）
    const result = await calculateEndDate(constructionId, startDate, period, durationType)
    const returnedDate = result?.completionDate || (result as any)?.endDate
    if (returnedDate) {
      const endDate = returnedDate.split('T')[0]
      calculatedEndDate.value = endDate
      formData.value.completion_date = endDate
    }
  } catch (error) {
    console.error('計算完工日期失敗:', error)
  } finally {
    isCalculatingEndDate.value = false
  }
}

// 監聽開工日期、工期和計算模式的變化，自動計算完工日期
watch(
  () => [formData.value.start_date, formData.value.construction_period, formData.value.duration_type],
  () => {
    if (isCreateMode.value || isEditMode.value) {
      calculateCompletionDate()
    }
  },
  { immediate: false }
)

// 監聽 modelValue 變化時，如果有完工日期，顯示它
watch(
  () => props.modelValue?.completion_date,
  (newVal) => {
    if (newVal && (isEditMode.value || isReadonlyMode.value)) {
      calculatedEndDate.value = newVal
      formData.value.completion_date = newVal
    }
  },
  { immediate: true }
)

// 格式化完工日期為民國年月日
const formatCompletionDateToRepublic = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    const year = date.getFullYear()
    const republicYear = toRepublicYear(year)
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    return `民國${republicYear}年${month}月${day}日`
  } catch (error) {
    return dateString
  }
}

// 計算屬性：格式化後的完工日期
const formattedCompletionDate = computed(() => {
  const dateValue = calculatedEndDate.value || formData.value.completion_date
  return formatCompletionDateToRepublic(dateValue)
})


// 變更紀錄假資料
const mockContractChanges = ref([
  {
    id: '1',
    changeDate: '2024-01-15',
    changeReason: '材料價格上漲',
    originalAmount: 10000000,
    changeAmount: 500000,
    newAmount: 10500000,
    operator: '張經理'
  },
  {
    id: '2', 
    changeDate: '2024-02-20',
    changeReason: '設計變更',
    originalAmount: 10500000,
    changeAmount: -200000,
    newAmount: 10300000,
    operator: '李副總'
  }
])

// 顯示變更紀錄 Modal
const showChangeHistoryModal = () => {
  showChangeModal.value = true
}

// 關閉變更紀錄 Modal
const closeChangeModal = () => {
  showChangeModal.value = false
}

// 新增變更紀錄
const addContractChange = () => {
  // 這裡可以打開新增變更紀錄的 modal
}

// 查看變更紀錄詳情
const viewContractChange = (change: any) => {
  // 查看變更紀錄詳情
}

// 新增：處理公司編輯跳轉（目前僅為佔位符）
const handleEditCompany = (type: string) => {
  // TODO: 實作跳轉至編輯公司畫面的邏輯
}

// 使用監造公司作為設計公司
const useSupervisoryCompanyAsDesign = () => {
  if (formData.value.supervisory_company_name) {
    formData.value.design_company = formData.value.supervisory_company_name
  }
}

// 格式化工程金額顯示（帶千分位逗點）
const formattedProjectAmount = computed({
  get: () => {
    const value = formData.value.project_amount
    if (!value || value === '') return ''

    const numericValue = value.toString().replace(/[^\d]/g, '')
    if (!numericValue) return ''

    return formatNumber(numericValue)
  },
  set: (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '')
    formData.value.project_amount = numericValue
  }
})

// 處理工程金額輸入
const handleProjectAmountInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  const numericValue = value.replace(/[^\d]/g, '')
  formData.value.project_amount = numericValue
  validation.clearFieldError('project_amount')
}

// 格式化契約金額顯示（帶千分位逗點）
const formattedContractAmount = computed({
  get: () => {
    const value = formData.value.current_contract_amount
    if (!value || value === '') return ''
    
    // 移除所有非數字字符
    const numericValue = value.toString().replace(/[^\d]/g, '')
    if (!numericValue) return ''
    
    // 使用專案的 formatNumber 函數
    return formatNumber(numericValue)
  },
  set: (value: string) => {
    // 移除所有非數字字符，只保留數字
    const numericValue = value.replace(/[^\d]/g, '')
    formData.value.current_contract_amount = numericValue
  }
})

// 處理契約金額輸入
const handleContractAmountInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // 移除所有非數字字符
  const numericValue = value.replace(/[^\d]/g, '')
  
  // 更新表單數據
  formData.value.current_contract_amount = numericValue
  
  // 清除驗證錯誤
  validation.clearFieldError('current_contract_amount')
}


// 監聽 modelValue 變化
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      // 檢查是否與上次發送的值相同，避免循環
      const isSameValue = JSON.stringify(newVal) === JSON.stringify(lastEmittedValue)
      if (!isSameValue) {
        isUpdatingFromParent = true
        formData.value = { ...formData.value, ...newVal }
        nextTick(() => {
          isUpdatingFromParent = false
        })
      }
    }
  },
  { deep: true, immediate: true }
)

// 監聽 formData 變化，通知父組件
watch(
  formData,
  (newVal) => {
    if (!isUpdatingFromParent) {
      lastEmittedValue = JSON.parse(JSON.stringify(newVal))
      emit('update:modelValue', newVal)
    }
  },
  { deep: true }
)

// 簽核層級管理方法
const addSignLevel = () => {
  const newLevel = formData.value.signLevel.length + 1
  formData.value.signLevel.push({
    level: newLevel,
    title: ""
  })
}

const removeSignLevel = (index: number) => {
  if (formData.value.signLevel.length > 1) {
    formData.value.signLevel.splice(index, 1)
    // 重新調整層級編號
    formData.value.signLevel.forEach((item, idx) => {
      item.level = idx + 1
    })
  }
}

// 方法
/** @returns 靜默模式時回傳 { submitted, errors? }，供父層判斷是否通過驗證 */
const handleSubmit = async (silent: boolean = false): Promise<{ submitted: boolean; errors?: Record<string, string> } | void> => {
  if (silent) {
    // 靜默模式：只檢查驗證結果，不更新 UI
    const errors = validateForm(formData.value, projectFormValidationRules)
    const isValid = isFormValid(errors)
    if (isValid) {
      emit('submit', formData.value)
      return { submitted: true }
    }
    return { submitted: false, errors }
  }

  // 先進行完整驗證
  const isValid = validation.validateAll()

  if (isValid) {
    emit('submit', formData.value)
  } else {
    // 強制更新組件以顯示錯誤
    await nextTick()
  }
}

const handleReset = () => {
  // 清空表單數據
  Object.keys(formData.value).forEach(key => {
    if (Array.isArray(formData.value[key])) {
      formData.value[key] = []
    } else {
      formData.value[key] = ""
    }
  })
  
  // 清除驗證錯誤
  validation.clearErrors()
  
  emit('reset')
}

// 輔助函數：獲取欄位樣式類別
const getFieldClass = (fieldName: string): string => {
  const baseClass = 'form-control'
  const selectClass = 'form-select'
  
  // 檢查是否為選擇框
  const isSelect = ['project_grade', 'project_category', 'funding_source', 'payment_method'].includes(fieldName)
  
  const hasError = validation.hasError(fieldName)
  const errorClass = hasError ? 'is-invalid' : ''
  
  return `${isSelect ? selectClass : baseClass} ${errorClass}`.trim()
}

// 輔助函數：處理欄位輸入事件
const handleFieldInput = (fieldName: string) => {
  validation.clearFieldError(fieldName)
}

// 輔助函數：處理欄位失焦事件
const handleFieldBlur = (fieldName: string) => {
  validation.validateSingleField(fieldName)
}

// 輔助函數：獲取欄位顯示名稱
const getFieldDisplayName = (fieldName: string): string => {
  const fieldNameMap: { [key: string]: string } = {
    project_name: '工程契約名稱',
    contract_number: '契約編號',
    project_location: '工程地點',
    host_agency: '主辦機關',
    construction_period: '工期天數',
    project_amount: '工程金額',
    current_contract_amount: '目前契約金額',
    project_grade: '工程等級分類',
    project_category: '工程類別',
    funding_source: '經費來源',
    sign_date: '訂約日期',
    start_date: '開工日期',
    completion_date: '完工日期',
    payment_method: '付款方式',
    advance_payment_ratio: '預付款比例',
    retention_ratio: '保留款比例',
    inspection_methods: '驗收方式',
    insurance_policy_number: '保險單編號',
    insurance_company: '保險公司名稱',
    insurance_start_date: '保險開始日期',
    insurance_end_date: '保險結束日期',
    insurance_type: '保險類型'
  }
  
  return fieldNameMap[fieldName] || fieldName
}


// 處理欄位獲得焦點事件
const handleFieldFocus = (fieldName: string) => {
  // 欄位獲得焦點處理
}

// 暴露方法讓父組件可以調用
defineExpose({
  handleSubmit,
  handleReset,
  validation
})
</script>

<template>
  <div class="project-form">
        <!-- 工程基本資訊 -->
        <h6 class="fw-bold text-theme mb-3">
          <i class="fa fa-info-circle me-2"></i>工程基本資訊
        </h6>
        <!-- 第一列：工程契約名稱，契約編號，工程類別/工程屬性 -->
        <div class="row g-3 mb-3">
          <div class="col-lg-4 col-md-6 col-12">
            <label class="form-label" for="project_name">工程契約名稱</label>
            <div v-if="showFieldAsInfo('project_name')" class="form-info-value">{{ getInfoDisplayValue('project_name') }}</div>
            <template v-else>
              <input
                id="project_name"
                type="text"
                :class="getFieldClass('project_name')"
                v-model="formData.project_name"
                name="project_name"
                placeholder="請輸入工程契約名稱"
                :readonly="isSharedFieldsReadonly"
                :disabled="propValues.isSubmitting"
                @focus="handleFieldFocus('project_name')"
                @input="handleFieldInput('project_name')"
                @blur="handleFieldBlur('project_name')"
              />
              <div v-if="validation.hasError('project_name')" class="invalid-feedback">{{ validation.getFieldError('project_name') }}</div>
            </template>
          </div>
          <div class="col-lg-4 col-md-6 col-12">
            <label class="form-label" for="contract_number">契約編號</label>
            <div v-if="showFieldAsInfo('contract_number')" class="form-info-value">{{ getInfoDisplayValue('contract_number') }}</div>
            <template v-else>
              <input
                id="contract_number"
                type="text"
                :class="getFieldClass('contract_number')"
                v-model="formData.contract_number"
                name="contract_number"
                placeholder="請輸入契約編號"
                :readonly="isSharedFieldsReadonly"
                :disabled="propValues.isSubmitting"
                @input="handleFieldInput('contract_number')"
                @blur="handleFieldBlur('contract_number')"
              />
              <div v-if="validation.hasError('contract_number')" class="invalid-feedback">{{ validation.getFieldError('contract_number') }}</div>
            </template>
          </div>
          <div class="col-lg-4 col-md-12 col-12">
            <label class="form-label">工程類別/工程屬性</label>
            <div v-if="showFieldAsInfo('project_category')" class="form-info-value">{{ getInfoDisplayValue('project_category') }}</div>
            <select
              v-else
              :class="getFieldClass('project_category')"
              v-model="formData.project_category"
              name="project_category"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              @change="handleFieldInput('project_category')"
              @blur="handleFieldBlur('project_category')"
            >
              <option value="">-- 請選擇工程類別 --</option>
              <option value="建築工程">建築工程</option>
              <option value="土木工程">土木工程</option>
              <option value="水利工程">水利工程</option>
              <option value="機電工程">機電工程</option>
            </select>
            <div v-if="!showFieldAsInfo('project_category') && validation.hasError('project_category')" class="invalid-feedback">{{ validation.getFieldError('project_category') }}</div>
          </div>
        </div>
        
        <!-- 第二列：工程地點 -->
        <div class="row g-3 mb-3">
          <div class="col-12">
            <label class="form-label"
              >工程地點</label
            >
            <input
              type="text"
              :class="getFieldClass('project_location')"
              v-model="formData.project_location"
              name="project_location"
              placeholder="請輸入工程地點"
              :readonly="isFieldReadonly('project_location')"
              :disabled="propValues.isSubmitting"
              @input="handleFieldInput('project_location')"
              @blur="handleFieldBlur('project_location')"
            />
            <div 
              v-if="validation.hasError('project_location')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('project_location') }}
            </div>
          </div>
        </div>
        
        <!-- 第三列：訂約日期，開工日期，工期（天），完工日期 -->
        <div class="row g-3 mb-3">
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label" for="sign_date">訂約日期</label>
            <div v-if="showFieldAsInfo('sign_date')" class="form-info-value">{{ getInfoDisplayValue('sign_date') }}</div>
            <RepublicDatePicker
              v-else
              id="sign_date"
              aria-label="訂約日期"
              v-model="formData.sign_date"
              :input-class="getFieldClass('sign_date')"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              :show-error="validation.hasError('sign_date')"
              :error-message="validation.getFieldError('sign_date')"
              :use-republic-year="true"
              @update:model-value="handleFieldInput('sign_date')"
              @blur="handleFieldBlur('sign_date')"
            />
          </div>
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label" for="start_date">開工日期</label>
            <div v-if="showFieldAsInfo('start_date')" class="form-info-value">{{ getInfoDisplayValue('start_date') }}</div>
            <RepublicDatePicker
              v-else
              id="start_date"
              aria-label="開工日期"
              v-model="formData.start_date"
              :input-class="getFieldClass('start_date')"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              :show-error="validation.hasError('start_date')"
              :error-message="validation.getFieldError('start_date')"
              :use-republic-year="true"
              @update:model-value="handleFieldInput('start_date')"
              @blur="handleFieldBlur('start_date')"
            />
          </div>
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label">契約工期（天）</label>
            <input
              type="number"
              class="form-control"
              v-model="formData.construction_period"
              name="construction_period"
              placeholder="請輸入工期"
              :disabled="propValues.isSubmitting"
              :readonly="isFieldReadonly('construction_period')"
            />
          </div>
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label">
              工期計算模式
              <i class="fa fa-info-circle text-muted ms-1" 
                 title="日曆天：以自然日曆計算，包含週六、週日及國定假日&#10;工作天：僅計算實際可施工的日子，排除週末和假日"
                 style="font-size: 0.875rem; cursor: help;"></i>
            </label>
            <div v-if="showFieldAsInfo('duration_type')" class="form-info-value">{{ formData.duration_type === 'CALENDAR_DAYS' ? '日曆天' : '工作天' }}</div>
            <template v-else>
              <select
                class="form-select"
                v-model="formData.duration_type"
                :disabled="propValues.isSubmitting || isReadonlyMode"
              >
                <option value="WORKING_DAYS">工作天</option>
                <option value="CALENDAR_DAYS">日曆天</option>
              </select>
              <small class="form-text text-muted d-block mt-1">
                <span v-if="formData.duration_type === 'WORKING_DAYS'"><i class="fa fa-info-circle me-1"></i>僅計算實際可施工的日子，排除週末和假日</span>
                <span v-else><i class="fa fa-info-circle me-1"></i>以自然日曆計算，包含週六、週日及國定假日</span>
              </small>
            </template>
          </div>
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label" for="completion_date">
              完工日期
              <i class="fa fa-info-circle text-muted ms-1" title="根據開工日期、總工期及行事曆設定自動計算" style="font-size: 0.875rem;"></i>
            </label>
            <div v-if="showFieldAsInfo('completion_date')" class="form-info-value">{{ getInfoDisplayValue('completion_date') }}</div>
            <template v-else>
              <div class="input-group">
                <input
                  type="text"
                  class="form-control"
                  id="completion_date"
                  :value="formattedCompletionDate"
                  readonly
                  placeholder="自動計算"
                  style="background-color: var(--bs-secondary-bg); cursor: not-allowed;"
                />
                <span v-if="isCalculatingEndDate" class="input-group-text"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span></span>
                <span v-else-if="formattedCompletionDate" class="input-group-text"><i class="fa fa-calendar-check text-success"></i></span>
              </div>
              <small class="form-text text-muted d-block mt-1">
                <div v-if="formData.duration_type === 'WORKING_DAYS'">
                  <router-link to="/calendar" class="text-decoration-none" style="color: #5bc0de;" title="前往行事曆查看假日設定">
                    <i class="fa fa-calendar me-1"></i>假日定義依行事曆設定
                    <i class="fa fa-external-link-alt ms-1" style="font-size: 0.7rem;"></i>
                  </router-link>
                </div>
                <div v-if="totalStopDays > 0" :class="{ 'mt-1': formData.duration_type === 'WORKING_DAYS' }">
                  <span style="color: #f5b849;"><i class="fa fa-pause-circle me-1"></i>含累計停工天數：{{ totalStopDays }} 天</span>
                </div>
              </small>
            </template>
          </div>
        </div>
        
        <!-- 參與單位資訊 -->
        <h6 class="fw-bold text-theme mb-3 mt-4">
          <i class="fa fa-users me-2"></i>參與單位資訊
        </h6>
        <div class="row g-3 mb-3">
          <div class="col-lg-6 col-md-12 col-sm-12">
            <label class="form-label">主辦機關</label>
            <div v-if="showFieldAsInfo('host_agency')" class="form-info-value">{{ getInfoDisplayValue('host_agency') }}</div>
            <template v-else>
              <input
                type="text"
                :class="getFieldClass('host_agency')"
                v-model="formData.host_agency"
                name="host_agency"
                placeholder="請輸入主辦機關"
                :disabled="propValues.isSubmitting"
                :readonly="isFieldReadonly('host_agency')"
                @input="handleFieldInput('host_agency')"
                @blur="handleFieldBlur('host_agency')"
              />
              <div v-if="validation.hasError('host_agency')" class="invalid-feedback">{{ validation.getFieldError('host_agency') }}</div>
            </template>
          </div>

          <!-- 監造公司 -->
          <div class="col-lg-6 col-md-12 col-sm-12">
            <label class="form-label">監造公司</label>
            <div v-if="showFieldAsInfo('supervisory_company_name')" class="form-info-value">{{ getInfoDisplayValue('supervisory_company_name') }}</div>
            <div v-else class="input-group">
              <input
                type="text"
                class="form-control"
                v-model="formData.supervisory_company_name"
                disabled
                placeholder="由工作空間設定自動帶入"
              />
              <button class="btn btn-outline-primary" type="button" @click="handleEditCompany('SUPERVISION')" :disabled="propValues.isSubmitting || isReadonlyMode">
                <i class="fa fa-edit me-1"></i>編輯公司
              </button>
            </div>
          </div>

          <!-- 營造公司 -->
          <div class="col-lg-6 col-md-12 col-sm-12">
            <label class="form-label">營造公司</label>
            <div v-if="showFieldAsInfo('contractor_company_name')" class="form-info-value">{{ getInfoDisplayValue('contractor_company_name') }}</div>
            <div v-else class="input-group">
              <input
                type="text"
                class="form-control"
                v-model="formData.contractor_company_name"
                disabled
                placeholder="由工作空間設定自動帶入"
              />
              <button class="btn btn-outline-primary" type="button" @click="handleEditCompany('CONTRACTOR')" :disabled="propValues.isSubmitting || isReadonlyMode">
                <i class="fa fa-edit me-1"></i>編輯公司
              </button>
            </div>
          </div>

          <!-- 設計公司 -->
          <div class="col-lg-6 col-md-12 col-sm-12">
            <label class="form-label">設計公司</label>
            <div v-if="showFieldAsInfo('design_company')" class="form-info-value">{{ getInfoDisplayValue('design_company') }}</div>
            <template v-else>
              <div class="input-group">
                <input
                  type="text"
                  class="form-control"
                  v-model="formData.design_company"
                  :disabled="propValues.isSubmitting"
                  :readonly="isFieldReadonly('design_company')"
                  placeholder="請輸入設計公司名稱或選擇監造公司"
                />
                <button class="btn btn-outline-secondary" type="button" @click="useSupervisoryCompanyAsDesign" :disabled="propValues.isSubmitting || !formData.supervisory_company_name || isReadonlyMode" title="使用監造公司作為設計公司">
                  <i class="fa fa-copy me-1"></i>同監造公司
                </button>
              </div>
              <div class="form-text">可手動輸入設計公司名稱，或點擊「同監造公司」按鈕自動填入監造公司名稱</div>
            </template>
          </div>

        </div>

        
        <!-- 契約金額管理 -->
        <h6 class="fw-bold text-theme mb-3 mt-4">
          <i class="fa fa-money-bill me-2"></i>契約金額管理
        </h6>
        
        <!-- 工程金額 -->
        <div class="row g-3 mb-3">
          <div class="col-lg-6 col-md-12 col-sm-12">
            <label class="form-label mb-2" for="project_amount">工程金額</label>
            <div class="input-group">
              <span class="input-group-text">NT$</span>
              <input
                id="project_amount"
                type="text"
                :class="getFieldClass('project_amount')"
                v-model="formattedProjectAmount"
                name="project_amount"
                placeholder="請輸入工程金額"
                :disabled="propValues.isSubmitting || isReadonlyMode"
                @input="handleProjectAmountInput"
                @blur="handleFieldBlur('project_amount')"
              />
            </div>
            <div
              v-if="validation.hasError('project_amount')"
              class="invalid-feedback"
            >
              {{ validation.getFieldError('project_amount') }}
            </div>
            <small class="text-muted">請輸入工程金額</small>
          </div>
        </div>

        <!-- 目前契約金額 -->
        <div class="row g-3 mb-3">
          <div class="col-lg-6 col-md-12 col-sm-12">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label mb-0" for="current_contract_amount">目前契約金額</label>
              <button
                v-if="!showFieldAsInfo('current_contract_amount') && isEditMode && formData.current_contract_amount && !isReadonlyMode"
                type="button"
                class="btn btn-outline-primary btn-sm"
                @click="showChangeHistoryModal"
                :disabled="propValues.isSubmitting"
              >
                <i class="fa fa-history me-1"></i>變更紀錄
              </button>
            </div>
            <div v-if="showFieldAsInfo('current_contract_amount')" class="form-info-value">{{ formattedContractAmount ? `NT$ ${formattedContractAmount}` : '－' }}</div>
            <template v-else>
              <div class="input-group">
                <span class="input-group-text">NT$</span>
                <input
                  id="current_contract_amount"
                  type="text"
                  :class="getFieldClass('current_contract_amount')"
                  v-model="formattedContractAmount"
                  name="current_contract_amount"
                  placeholder="請輸入目前契約金額"
                  :disabled="propValues.isSubmitting || !isCreateMode"
                  @input="handleContractAmountInput"
                  @blur="handleFieldBlur('current_contract_amount')"
                />
              </div>
              <div v-if="validation.hasError('current_contract_amount')" class="invalid-feedback">{{ validation.getFieldError('current_contract_amount') }}</div>
              <small class="text-muted">請輸入目前契約金額</small>
            </template>
          </div>
        </div>
        
        <!-- 付款方式 -->
        <div class="row g-3 mb-3">
          <div class="col-lg-4 col-md-6 col-sm-12">
            <label class="form-label" for="payment_method">付款方式</label>
            <select
              id="payment_method"
              class="form-select"
              v-model="formData.payment_method"
              name="payment_method"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              @change="handleFieldInput('payment_method')"
              @blur="handleFieldBlur('payment_method')"
            >
              <option value="">-- 請選擇 --</option>
              <option value="按月計價">按月計價</option>
              <option value="按完工百分比">按完工百分比</option>
              <option value="分期付款">分期付款</option>
              <option value="完工後一次付款">完工後一次付款</option>
            </select>
          </div>
          <div class="col-lg-4 col-md-6 col-sm-12">
            <label class="form-label" for="advance_payment_ratio">預付款比例（%）</label>
            <div class="input-group">
              <input
                id="advance_payment_ratio"
                type="number"
                :class="getFieldClass('advance_payment_ratio')"
                v-model="formData.advance_payment_ratio"
                name="advance_payment_ratio"
                placeholder="例：10"
                min="0"
                max="100"
                :disabled="propValues.isSubmitting"
              :readonly="isFieldReadonly('advance_payment_ratio')"
                @input="handleFieldInput('advance_payment_ratio')"
                @blur="handleFieldBlur('advance_payment_ratio')"
              />
              <span class="input-group-text">%</span>
            </div>
            <div 
              v-if="validation.hasError('advance_payment_ratio')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('advance_payment_ratio') }}
            </div>
          </div>
          <div class="col-lg-4 col-md-12 col-sm-12">
            <label class="form-label" for="retention_ratio">保留款比例（%）</label>
            <div class="input-group">
              <input
                id="retention_ratio"
                type="number"
                :class="getFieldClass('retention_ratio')"
                v-model="formData.retention_ratio"
                name="retention_ratio"
                placeholder="例：5"
                min="0"
                max="100"
                :disabled="propValues.isSubmitting"
              :readonly="isFieldReadonly('retention_ratio')"
                @input="handleFieldInput('retention_ratio')"
                @blur="handleFieldBlur('retention_ratio')"
              />
              <span class="input-group-text">%</span>
            </div>
            <div 
              v-if="validation.hasError('retention_ratio')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('retention_ratio') }}
            </div>
          </div>
        </div>

        <!-- 驗收管理 -->
        <h6 class="fw-bold text-theme mb-3 mt-4">
          <i class="fa fa-check-circle me-2"></i>驗收管理
        </h6>
        <div class="mb-3">
          <label class="form-label">驗收方式/驗收階段（可複選）</label>
          <div v-if="showFieldAsInfo('inspection_methods')" class="form-info-value">{{ getInfoDisplayValue('inspection_methods') }}</div>
          <div v-else class="mt-2">
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" value="分段驗收" v-model="formData.inspection_methods" id="inspection1" :disabled="propValues.isSubmitting || isReadonlyMode" />
              <label class="form-check-label" for="inspection1">分段驗收</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" value="部分驗收" v-model="formData.inspection_methods" id="inspection2" :disabled="propValues.isSubmitting || isReadonlyMode" />
              <label class="form-check-label" for="inspection2">部分驗收</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" value="竣工驗收" v-model="formData.inspection_methods" id="inspection3" :disabled="propValues.isSubmitting || isReadonlyMode" />
              <label class="form-check-label" for="inspection3">竣工驗收</label>
            </div>
          </div>
        </div>

        <!-- 保險相關資訊 -->
        <h6 class="fw-bold text-theme mb-3 mt-4">
          <i class="fa fa-shield-alt me-2"></i>保險相關資訊
        </h6>
        <div class="row g-3 mb-3">
          <div class="col-lg-4 col-md-6 col-sm-12">
            <label class="form-label"
              >保險單編號</label
            >
            <input
              type="text"
              :class="getFieldClass('insurance_policy_number')"
              v-model="formData.insurance_policy_number"
              name="insurance_policy_number"
              placeholder="請輸入保險單編號"
              :disabled="propValues.isSubmitting"
              :readonly="isFieldReadonly('insurance_policy_number')"
              @input="handleFieldInput('insurance_policy_number')"
              @blur="handleFieldBlur('insurance_policy_number')"
            />
            <div 
              v-if="validation.hasError('insurance_policy_number')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('insurance_policy_number') }}
            </div>
          </div>
          <div class="col-lg-4 col-md-6 col-sm-12">
            <label class="form-label">保險公司名稱</label>
            <input
              type="text"
              class="form-control"
              v-model="formData.insurance_company"
              name="insurance_company"
              placeholder="請輸入保險公司名稱"
              :readonly="isFieldReadonly('insurance_company')"
              :disabled="propValues.isSubmitting"
              @input="handleFieldInput('insurance_company')"
              @blur="handleFieldBlur('insurance_company')"
            />
          </div>
          <div class="col-lg-4 col-md-12 col-sm-12">
            <label class="form-label"
              >保險類型</label
            >
            <input
              type="text"
              :class="getFieldClass('insurance_type')"
              v-model="formData.insurance_type"
              name="insurance_type"
              list="insurance_type_options"
              placeholder="請選擇或輸入保險類型"
              :disabled="propValues.isSubmitting"
              :readonly="isFieldReadonly('insurance_type')"
              @input="handleFieldInput('insurance_type')"
              @blur="handleFieldBlur('insurance_type')"
            />
            <datalist id="insurance_type_options">
              <option value="工程險">工程險</option>
              <option value="雇主責任險">雇主責任險</option>
              <option value="第三人責任險">第三人責任險</option>
              <option value="專業責任險">專業責任險</option>
              <option value="產品責任險">產品責任險</option>
              <option value="綜合保險">綜合保險</option>
              <option value="工程綜合保險">工程綜合保險</option>
              <option value="營造工程綜合保險">營造工程綜合保險</option>
              <option value="安裝工程綜合保險">安裝工程綜合保險</option>
            </datalist>
            <div 
              v-if="validation.hasError('insurance_type')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('insurance_type') }}
            </div>
          </div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-lg-6 col-md-6 col-sm-12">
            <label class="form-label"
              >保險有效期限（起）</label
            >
            <RepublicDatePicker
              v-model="formData.insurance_start_date"
              :input-class="getFieldClass('insurance_start_date')"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              :show-error="validation.hasError('insurance_start_date')"
              :error-message="validation.getFieldError('insurance_start_date')"
              :use-republic-year="true"
              @update:model-value="handleFieldInput('insurance_start_date')"
              @blur="handleFieldBlur('insurance_start_date')"
            />
          </div>
          <div class="col-lg-6 col-md-6 col-sm-12">
            <label class="form-label"
              >保險有效期限（訖）</label
            >
            <RepublicDatePicker
              v-model="formData.insurance_end_date"
              :input-class="getFieldClass('insurance_end_date')"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              :show-error="validation.hasError('insurance_end_date')"
              :error-message="validation.getFieldError('insurance_end_date')"
              :use-republic-year="true"
              @update:model-value="handleFieldInput('insurance_end_date')"
              @blur="handleFieldBlur('insurance_end_date')"
            />
          </div>
        </div>

        <!-- 簽核層級設定 -->
        <h6 class="fw-bold text-theme mb-3 mt-4">
          <i class="fa fa-signature me-2"></i>簽核層級設定
        </h6>
        <div class="row mb-3">
          <div class="col-12">
            <p v-if="!showFieldAsInfo('signLevel')" class="text-muted mb-3">設定工程案的簽核層級，按層級順序進行審核。<strong>層級數字越小代表職位越高</strong>，例如：1-局長、2-副局長、3-技正、4-課長、5-承辦、6-協辦。</p>
            <div v-if="showFieldAsInfo('signLevel')" class="form-info-value">{{ getInfoDisplayValue('signLevel') }}</div>
            <div v-else class="sign-level-list">
              <div class="row g-3 mb-3">
                <div v-for="(item, index) in formData.signLevel" :key="index" class="col-md-4">
                  <div class="sign-level-item d-flex align-items-center p-2 border rounded">
                    <div class="sign-level-number me-2">
                      <span class="badge bg-primary fs-6">{{ item.level }}</span>
                    </div>
                    <div class="sign-level-content flex-grow-1">
                      <input type="text" class="form-control form-control-sm" v-model="item.title" :placeholder="`第${item.level}層級職稱`" :disabled="propValues.isSubmitting" :readonly="isFieldReadonly('signLevel')" />
                    </div>
                    <div class="sign-level-actions ms-2" v-if="!isReadonlyMode">
                      <button type="button" class="btn btn-sm btn-outline-danger" @click="removeSignLevel(index)" :disabled="formData.signLevel.length <= 1 || propValues.isSubmitting" title="刪除層級">
                        <i class="fa fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="text-center" v-if="!isReadonlyMode">
                <button type="button" class="btn btn-outline-theme btn-sm" @click="addSignLevel" :disabled="propValues.isSubmitting">
                  <i class="fa fa-plus me-1"></i>新增簽核層級
                </button>
              </div>
            </div>
          </div>
        </div>

    <!-- 驗證錯誤總覽 -->
    <div 
      v-if="Object.keys(validation.errors.value).length > 0" 
      class="alert alert-danger mt-4"
    >
      <h6 class="alert-heading">
        <i class="fa fa-exclamation-triangle me-2"></i>
        表單驗證錯誤
      </h6>
      <p class="mb-2">請修正以下錯誤：</p>
      <ul class="mb-0">
        <li 
          v-for="(error, field) in validation.errors.value" 
          :key="field"
          class="mb-1"
        >
          <strong>{{ getFieldDisplayName(String(field)) }}：</strong>{{ error }}
        </li>
      </ul>
    </div>

    <!-- 操作按鈕 -->
    <div
      v-if="(propValues.showSubmitButton || propValues.showResetButton) && !isReadonlyMode"
      class="d-flex justify-content-end mt-4"
    >
      <button
        v-if="propValues.showResetButton"
        type="button"
        class="btn btn-outline-secondary me-2"
        @click="handleReset"
        :disabled="propValues.isSubmitting || validation.isValidating.value"
      >
        <i class="fa fa-undo me-1"></i>
        重置
      </button>
      <button
        v-if="propValues.showSubmitButton"
        type="button"
        class="btn btn-theme"
        @click="handleSubmit(false)"
        :disabled="propValues.isSubmitting || validation.isValidating.value"
      >
        <i
          class="fa me-1"
          :class="{
            'fa-spin fa-spinner': propValues.isSubmitting || validation.isValidating.value,
            'fa-save': !propValues.isSubmitting && !validation.isValidating.value,
          }"
        ></i>
        {{ 
          propValues.isSubmitting || validation.isValidating.value 
            ? "處理中..." 
            : propValues.submitButtonText 
        }}
      </button>
    </div>

    <!-- 變更紀錄 Modal -->
    <Modal
      v-model:show="showChangeModal"
      title="契約金額變更紀錄"
      icon="fa fa-history"
      size="xl"
      modal-id="contract-change-modal"
      :hide-confirm-button="true"
      cancel-text="關閉"
    >
      <!-- 變更紀錄表格 -->
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>變更日期</th>
              <th>變更原因</th>
              <th>變更前金額</th>
              <th>變更金額</th>
              <th>變更後金額</th>
              <th>操作人</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="change in mockContractChanges" :key="change.id">
              <td>{{ change.changeDate }}</td>
              <td>{{ change.changeReason }}</td>
              <td>NT$ {{ Number(change.originalAmount).toLocaleString() }}</td>
              <td>
                <span :class="change.changeAmount > 0 ? 'text-success' : 'text-danger'">
                  {{ change.changeAmount > 0 ? '+' : '' }}NT$ {{ Number(change.changeAmount).toLocaleString() }}
                </span>
              </td>
              <td>NT$ {{ Number(change.newAmount).toLocaleString() }}</td>
              <td>{{ change.operator }}</td>
            </tr>
            <tr v-if="mockContractChanges.length === 0">
              <td colspan="6" class="text-center text-muted py-4">
                尚無變更紀錄
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 自定義 Footer -->
      <template #footer>
        <button 
          v-if="!isReadonlyMode"
          type="button" 
          class="btn btn-outline-primary"
          @click="addContractChange"
        >
          <i class="fa fa-plus me-1"></i>
          新增變更紀錄
        </button>
        <button 
          type="button" 
          class="btn btn-secondary" 
          @click="closeChangeModal"
        >
          關閉
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
/* 變更設計版本時，非可編輯欄位以「類 input」資訊方式呈現，維持版面整齊 */
.form-info-value {
  display: block;
  width: 100%;
  min-height: 2.35rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.9375rem;
  color: var(--bs-body-color);
  line-height: 1.5;
  background-color: var(--bs-secondary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
}

/* 簽核層級設定樣式 */
.sign-level-item {
  background-color: var(--bs-body-bg);
  border-color: var(--bs-border-color) !important;
  transition: all 0.2s ease;
  min-height: 2.5rem;
}

.sign-level-item:hover {
  border-color: var(--bs-theme) !important;
  box-shadow: 0 2px 4px rgba(var(--bs-theme-rgb), 0.1);
}

.sign-level-number .badge {
  min-width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.sign-level-content .form-control {
  border: none;
  background: transparent;
  box-shadow: none;
  font-size: 0.875rem;
}

.sign-level-content .form-control:focus {
  border: 1px solid var(--bs-theme);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-theme-rgb), 0.25);
}

/* 變更紀錄摘要樣式 */
.change-summary {
  background: rgba(0, 123, 255, 0.05) !important;
  border: 1px solid rgba(0, 123, 255, 0.1);
}

/* 鎖定欄位（只讀）樣式 */
input[readonly],
textarea[readonly] {
  background-color: var(--bs-secondary-bg) !important;
  cursor: not-allowed !important;
  opacity: 0.8;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

input[readonly]:focus,
textarea[readonly]:focus {
  border-color: var(--bs-border-color) !important;
  box-shadow: none !important;
  outline: none !important;
}

/* 確保 readonly 屬性生效，阻止編輯 */
input[readonly],
textarea[readonly],
select[readonly] {
  /* 不使用 pointer-events: none，因為會影響其他功能 */
  /* pointer-events: none; */
  cursor: not-allowed !important;
}

/* 阻止 readonly 欄位的所有輸入操作 */
input[readonly]:focus,
textarea[readonly]:focus,
select[readonly]:focus {
  border-color: var(--bs-border-color) !important;
  box-shadow: none !important;
  outline: none !important;
  cursor: not-allowed !important;
}

/* Disabled 狀態樣式（與 readonly 一致的灰階與禁止樣式） */
input:disabled,
textarea:disabled,
select:disabled {
  background-color: var(--bs-secondary-bg) !important;
  cursor: not-allowed !important;
  opacity: 0.8 !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  border-color: var(--bs-border-color) !important;
  color: var(--bs-secondary-color) !important;
}

input:disabled:focus,
textarea:disabled:focus,
select:disabled:focus {
  border-color: var(--bs-border-color) !important;
  box-shadow: none !important;
  outline: none !important;
  cursor: not-allowed !important;
}

/* Checkbox disabled 樣式 */
input[type="checkbox"]:disabled {
  cursor: not-allowed !important;
  opacity: 0.6 !important;
}

input[type="checkbox"]:disabled + label {
  cursor: not-allowed !important;
  opacity: 0.8 !important;
  color: var(--bs-secondary-color) !important;
}

/* DatePicker disabled 樣式（透過深度選擇器） */
/* 當 RepublicDatePicker 被 disabled 時，會添加 is-disabled class */
:deep(.republic-date-picker.is-disabled .dp__main),
:deep(.republic-date-picker.is-disabled .dp__input_wrap) {
  background-color: var(--bs-secondary-bg) !important;
  cursor: not-allowed !important;
  opacity: 0.8 !important;
}

:deep(.republic-date-picker.is-disabled .dp__input) {
  background-color: transparent !important;
  cursor: not-allowed !important;
  opacity: 1 !important;
  color: var(--bs-secondary-color) !important;
}

:deep(.republic-date-picker.is-disabled .dp__input_icon) {
  opacity: 0.6 !important;
  color: var(--bs-secondary-color) !important;
}

</style>
