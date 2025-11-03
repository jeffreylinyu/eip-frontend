<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useValidation } from '@/composables/useValidation'
import { projectFormValidationRules } from '@/utils/projectValidationRules'
import { formatNumber } from '@/utils/format'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import Modal from '@/components/bootstrap/Modal.vue'

// Props
const props = defineProps<{
  modelValue?: any
  isSubmitting?: boolean
  showSubmitButton?: boolean
  submitButtonText?: string
  showResetButton?: boolean
  mode?: 'create' | 'edit' | 'readonly' // 新增：組件使用模式
}>()

// 默認值
const defaultProps = {
  modelValue: {},
  isSubmitting: false,
  showSubmitButton: true,
  submitButtonText: "保存",
  showResetButton: true,
  mode: 'create' as const,
}

// 應用默認值
const propValues = computed(() => ({
  ...defaultProps,
  ...props
}))

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
  construction_period: "",
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
const isReadonlyMode = computed(() => propValues.value.mode === 'readonly')

// Modal 狀態
const showChangeModal = ref(false)

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
  console.log('新增變更紀錄')
}

// 查看變更紀錄詳情
const viewContractChange = (change: any) => {
  console.log('查看變更紀錄:', change)
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
const handleSubmit = async () => {
  // console.log('🔍 開始表單驗證...')
  // console.log('📊 ProjectForm 當前數據:', formData.value)
  
  // 先進行完整驗證
  const isValid = validation.validateAll()

  if (isValid) {
    // console.log('✅ 表單驗證通過，提交數據')
    emit('submit', formData.value)
  } else {
    // console.log('❌ 表單驗證失敗，顯示錯誤訊息')
    // console.log('🚨 錯誤詳情:', validation.errors.value)
    
    // 強制更新組件以顯示錯誤
    await nextTick()
    
    // 錯誤會自動顯示在表單中，不需要 alert
    const errorCount = Object.keys(validation.errors.value).length
    // console.log(`📝 共有 ${errorCount} 個驗證錯誤需要修正`)
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
    project_name: '工程名稱',
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
        <!-- 第一列：工程名稱，契約編號，工程類別/工程屬性 -->
        <div class="row g-3 mb-3">
          <div class="col-lg-4 col-md-6 col-12">
            <label class="form-label" for="project_name"
              >工程名稱 <span class="text-danger">*</span></label
            >
            <input
              id="project_name"
              type="text"
              :class="getFieldClass('project_name')"
              v-model="formData.project_name"
              name="project_name"
              placeholder="請輸入工程名稱"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              @input="handleFieldInput('project_name')"
              @blur="handleFieldBlur('project_name')"
            />
            <div 
              v-if="validation.hasError('project_name')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('project_name') }}
            </div>
          </div>
          <div class="col-lg-4 col-md-6 col-12">
            <label class="form-label" for="contract_number"
              >契約編號 <span class="text-danger">*</span></label
            >
            <input
              id="contract_number"
              type="text"
              :class="getFieldClass('contract_number')"
              v-model="formData.contract_number"
              name="contract_number"
              placeholder="請輸入契約編號"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              @input="handleFieldInput('contract_number')"
              @blur="handleFieldBlur('contract_number')"
            />
            <div 
              v-if="validation.hasError('contract_number')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('contract_number') }}
            </div>
          </div>
          <div class="col-lg-4 col-md-12 col-12">
            <label class="form-label"
              >工程類別/工程屬性 <span class="text-danger">*</span></label
            >
            <select
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
            <div 
              v-if="validation.hasError('project_category')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('project_category') }}
            </div>
          </div>
        </div>
        
        <!-- 第二列：工程地點 -->
        <div class="row g-3 mb-3">
          <div class="col-12">
            <label class="form-label"
              >工程地點 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              :class="getFieldClass('project_location')"
              v-model="formData.project_location"
              name="project_location"
              placeholder="請輸入工程地點"
              :disabled="propValues.isSubmitting || isReadonlyMode"
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
        
        <!-- 第三列：訂約日期，開工日期，完工日期，工期（天） -->
        <div class="row g-3 mb-3">
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label" for="sign_date"
              >訂約日期 <span class="text-danger">*</span></label
            >
            <RepublicDatePicker
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
            <label class="form-label" for="start_date"
              >開工日期 <span class="text-danger">*</span></label
            >
            <RepublicDatePicker
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
            <label class="form-label" for="completion_date"
              >完工日期 <span class="text-danger">*</span></label
            >
            <RepublicDatePicker
              id="completion_date"
              aria-label="完工日期"
              v-model="formData.completion_date"
              :input-class="getFieldClass('completion_date')"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              :show-error="validation.hasError('completion_date')"
              :error-message="validation.getFieldError('completion_date')"
              :use-republic-year="true"
              @update:model-value="handleFieldInput('completion_date')"
              @blur="handleFieldBlur('completion_date')"
            />
          </div>
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label">工期（天）</label>
            <input
              type="number"
              class="form-control"
              v-model="formData.construction_period"
              name="construction_period"
              placeholder="請輸入工期"
            />
          </div>
        </div>

        <!-- 參與單位資訊 -->
        <h6 class="fw-bold text-theme mb-3 mt-4">
          <i class="fa fa-users me-2"></i>參與單位資訊
        </h6>
        <div class="row g-3 mb-3">
          <div class="col-lg-6 col-md-12 col-sm-12">
            <label class="form-label"
              >主辦機關 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              :class="getFieldClass('host_agency')"
              v-model="formData.host_agency"
              name="host_agency"
              placeholder="請輸入主辦機關"
              :disabled="propValues.isSubmitting || isReadonlyMode"
              @input="handleFieldInput('host_agency')"
              @blur="handleFieldBlur('host_agency')"
            />
            <div 
              v-if="validation.hasError('host_agency')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('host_agency') }}
            </div>
          </div>
        </div>

        
        <!-- 契約金額管理 -->
        <h6 class="fw-bold text-theme mb-3 mt-4">
          <i class="fa fa-money-bill me-2"></i>契約金額管理
        </h6>
        
        <!-- 目前契約金額 -->
        <div class="row g-3 mb-3">
          <div class="col-lg-6 col-md-12 col-sm-12">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label mb-0" for="current_contract_amount">目前契約金額 <span class="text-danger">*</span></label>
              <button 
                v-if="isEditMode && formData.current_contract_amount && !isReadonlyMode"
                type="button" 
                class="btn btn-outline-primary btn-sm"
                @click="showChangeHistoryModal"
                :disabled="propValues.isSubmitting"
              >
                <i class="fa fa-history me-1"></i>
                變更紀錄
              </button>
            </div>
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
            <div 
              v-if="validation.hasError('current_contract_amount')" 
              class="invalid-feedback"
            >
              {{ validation.getFieldError('current_contract_amount') }}
            </div>
            <small class="text-muted">請輸入目前契約金額</small>
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
                :disabled="propValues.isSubmitting || isReadonlyMode"
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
                :disabled="propValues.isSubmitting || isReadonlyMode"
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
          <div class="mt-2">
            <div class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="checkbox"
                value="分段驗收"
                v-model="formData.inspection_methods"
                id="inspection1"
              />
              <label class="form-check-label" for="inspection1">
                分段驗收
              </label>
            </div>
            <div class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="checkbox"
                value="部分驗收"
                v-model="formData.inspection_methods"
                id="inspection2"
              />
              <label class="form-check-label" for="inspection2">
                部分驗收
              </label>
            </div>
            <div class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="checkbox"
                value="竣工驗收"
                v-model="formData.inspection_methods"
                id="inspection3"
              />
              <label class="form-check-label" for="inspection3">
                竣工驗收
              </label>
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
              >保險單編號 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              :class="getFieldClass('insurance_policy_number')"
              v-model="formData.insurance_policy_number"
              name="insurance_policy_number"
              placeholder="請輸入保險單編號"
              :disabled="propValues.isSubmitting || isReadonlyMode"
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
            />
          </div>
          <div class="col-lg-4 col-md-12 col-sm-12">
            <label class="form-label"
              >保險類型 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              :class="getFieldClass('insurance_type')"
              v-model="formData.insurance_type"
              name="insurance_type"
              list="insurance_type_options"
              placeholder="請選擇或輸入保險類型"
              :disabled="propValues.isSubmitting || isReadonlyMode"
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
              >保險有效期限（起） <span class="text-danger">*</span></label
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
              >保險有效期限（訖） <span class="text-danger">*</span></label
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
            <p class="text-muted mb-3">設定工程項目的簽核層級，按層級順序進行審核。<strong>層級數字越小代表職位越高</strong>，例如：1-局長、2-副局長、3-技正、4-課長、5-承辦、6-協辦。</p>
            
            <div class="sign-level-list">
              <div class="row g-3 mb-3">
                <div 
                  v-for="(item, index) in formData.signLevel" 
                  :key="index"
                  class="col-md-4"
                >
                  <div class="sign-level-item d-flex align-items-center p-2 border rounded">
                    <div class="sign-level-number me-2">
                      <span class="badge bg-primary fs-6">{{ item.level }}</span>
                    </div>
                    <div class="sign-level-content flex-grow-1">
                      <input 
                        type="text" 
                        class="form-control form-control-sm" 
                        v-model="item.title"
                        :placeholder="`第${item.level}層級職稱`"
                        :disabled="propValues.isSubmitting || isReadonlyMode"
                      >
                    </div>
                    <div class="sign-level-actions ms-2" v-if="!isReadonlyMode">
                      <button 
                        type="button" 
                        class="btn btn-sm btn-outline-danger"
                        @click="removeSignLevel(index)"
                        :disabled="formData.signLevel.length <= 1 || propValues.isSubmitting"
                        title="刪除層級"
                      >
                        <i class="fa fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="text-center" v-if="!isReadonlyMode">
                <button 
                  type="button" 
                  class="btn btn-outline-theme btn-sm"
                  @click="addSignLevel"
                  :disabled="propValues.isSubmitting || isReadonlyMode"
                >
                  <i class="fa fa-plus me-1"></i>
                  新增簽核層級
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
        @click="handleSubmit"
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

</style>
