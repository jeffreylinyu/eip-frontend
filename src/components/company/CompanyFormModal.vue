<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@/stores/company'
import { COMPANY_TYPE_OPTIONS, CONTRACTOR_LEVEL_OPTIONS, COMPANY_STATUS_OPTIONS } from '@/api/company'
import Modal from '@/components/bootstrap/Modal.vue'

// Props
const props = defineProps<{
  show: boolean
  company?: Company | null
}>()

// Emits
const emit = defineEmits<{
  'update:show': [value: boolean]
  hide: []
  submit: [data: CreateCompanyRequest | UpdateCompanyRequest]
}>()

// 表單數據
const formData = ref<CreateCompanyRequest>({
  companyName: '',
  companyUnifiedNumber: '',
  companyType: 'THIRD_PARTY',
  contractorLevel: 'CLASS_A' // 預設營造等級
})

// 狀態
const isSubmitting = ref(false)
const errors = ref<Record<string, string>>({})

// 計算屬性
const isEditMode = computed(() => !!props.company)
const modalTitle = computed(() => isEditMode.value ? '編輯公司' : '新增公司')
const submitButtonText = computed(() => isEditMode.value ? '更新' : '創建')

// 方法
const hideModal = () => {
  emit('update:show', false)
  emit('hide')
}

const resetForm = () => {
  formData.value = {
    companyName: '',
    companyUnifiedNumber: '',
    companyType: 'THIRD_PARTY',
    contractorLevel: 'CLASS_A' // 預設營造等級
  }
  errors.value = {}
  // console.log('🔄 表單重置完成:', formData.value) // 調試用
}

// 監聽company變化，填充表單
watch(() => props.company, (newCompany) => {
  if (newCompany) {
    // console.log('編輯公司資料:', newCompany) // 調試用
    // console.log('營造等級:', newCompany.contractorLevel) // 調試用
    formData.value = {
      companyName: newCompany.companyName,
      companyUnifiedNumber: newCompany.companyCode, // 將 companyCode 對應到 companyUnifiedNumber
      companyType: newCompany.companyType,
      contractorLevel: newCompany.contractorLevel || 'CLASS_A' // 確保有預設值
    }
    // console.log('表單資料:', formData.value) // 調試用
  } else {
    resetForm()
  }
}, { immediate: true })

// 監聽show變化，當關閉表單時清空資料
watch(() => props.show, (newShow) => {
  if (!newShow) {
    // 表單關閉時清空資料
    resetForm()
  } else {
    // 表單開啟時清空錯誤
    errors.value = {}
  }
})



const validateForm = () => {
  errors.value = {}
  
  // 公司名稱驗證（必填）
  if (!formData.value.companyName.trim()) {
    errors.value.companyName = '公司名稱不能為空'
  } else if (formData.value.companyName.trim().length < 2) {
    errors.value.companyName = '公司名稱至少需要2個字符'
  } else if (formData.value.companyName.trim().length > 100) {
    errors.value.companyName = '公司名稱不能超過100個字符'
  }

  // 統一編號驗證（必填）
  if (!formData.value.companyUnifiedNumber.trim()) {
    errors.value.companyUnifiedNumber = '統一編號不能為空'
  } else if (!/^\d{8}$/.test(formData.value.companyUnifiedNumber.trim())) {
    errors.value.companyUnifiedNumber = '統一編號必須為8位數字'
  }

  // 公司類型驗證（必填）
  if (!formData.value.companyType) {
    errors.value.companyType = '請選擇公司類型'
  }

  // 營造等級驗證（僅當公司類型為營造廠商時必填）
  if (formData.value.companyType === 'CONTRACTOR' && !formData.value.contractorLevel) {
    errors.value.contractorLevel = '請選擇營造等級'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    // 建立和更新都使用相同的欄位
    const submitData: CreateCompanyRequest = {
      companyName: formData.value.companyName.trim(),
      companyUnifiedNumber: formData.value.companyUnifiedNumber.trim(),
      companyType: formData.value.companyType,
      contractorLevel: formData.value.contractorLevel
    }
    
    // console.log('📤 提交的公司資料:', submitData) // 調試用
    emit('submit', submitData)
  } catch (error) {
    console.error('Submit error:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleConfirm = () => {
  handleSubmit()
}

const clearError = (field: string) => {
  if (errors.value[field]) {
    delete errors.value[field]
  }
}
</script>

<template>
  <Modal
    v-model:show="props.show"
    :title="modalTitle"
    icon="fa fa-building"
    size="lg"
    modal-id="companyFormModal"
    :confirm-text="submitButtonText"
    confirm-icon="fa fa-save"
    :is-loading="isSubmitting"
    loading-text="處理中..."
    @hide="hideModal"
    @confirm="handleConfirm"
  >
    <template #body>
      <form @submit.prevent="handleSubmit">
        
        <!-- 公司名稱 -->
        <div class="mb-3">
          <label for="companyName" class="form-label">
            公司名稱 <span class="text-danger">*</span>
          </label>
          <input 
            id="companyName"
            type="text" 
            class="form-control"
            :class="{ 'is-invalid': errors.companyName }"
            v-model="formData.companyName"
            @input="clearError('companyName')"
            placeholder="請輸入公司名稱"
            maxlength="100"
            :disabled="isSubmitting"
          />
          <div v-if="errors.companyName" class="invalid-feedback">
            {{ errors.companyName }}
          </div>
          <div class="form-text">
            {{ formData.companyName.length }}/100 字符
          </div>
        </div>

        <!-- 統一編號 -->
        <div class="mb-3">
          <label for="companyCode" class="form-label">
            統一編號 <span class="text-danger">*</span>
          </label>
          <input 
            id="companyCode"
            type="text" 
            class="form-control"
            :class="{ 'is-invalid': errors.companyUnifiedNumber }"
            v-model="formData.companyUnifiedNumber"
            @input="clearError('companyUnifiedNumber')"
            placeholder="請輸入8位數統一編號"
            maxlength="8"
            :disabled="isSubmitting"
          />
          <div v-if="errors.companyUnifiedNumber" class="invalid-feedback">
            {{ errors.companyUnifiedNumber }}
          </div>
          <div class="form-text">
            請輸入8位數字的統一編號
          </div>
        </div>

        <!-- 公司類型 -->
        <div class="mb-3">
          <label for="companyType" class="form-label">
            公司類型 <span class="text-danger">*</span>
          </label>
          <select 
            id="companyType"
            class="form-select"
            :class="{ 'is-invalid': errors.companyType }"
            v-model="formData.companyType"
            @change="clearError('companyType')"
            :disabled="isSubmitting"
          >
            <option 
              v-for="option in COMPANY_TYPE_OPTIONS" 
              :key="option.value" 
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <div v-if="errors.companyType" class="invalid-feedback">
            {{ errors.companyType }}
          </div>
        </div>

        <!-- 營造等級（僅當公司類型為營造廠商時顯示） -->
        <div v-if="formData.companyType === 'CONTRACTOR'" class="mb-3">
          <label for="contractorLevel" class="form-label">
            營造等級 <span class="text-danger">*</span>
          </label>
          <select 
            id="contractorLevel"
            class="form-select"
            :class="{ 'is-invalid': errors.contractorLevel }"
            v-model="formData.contractorLevel"
            @change="clearError('contractorLevel')"
            :disabled="isSubmitting"
          >
            <option 
              v-for="option in CONTRACTOR_LEVEL_OPTIONS" 
              :key="option.value" 
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <div v-if="errors.contractorLevel" class="invalid-feedback">
            {{ errors.contractorLevel }}
          </div>
        </div>





        <!-- 錯誤提示 -->
        <div v-if="Object.keys(errors).length > 0" class="alert alert-danger">
          請修正以上錯誤後再提交
        </div>

      </form>
    </template>
  </Modal>
</template>

<style scoped>
.form-label {
  font-weight: 600;
  color: var(--bs-body-color);
}

.form-text {
  font-size: 0.85rem;
  color: var(--bs-secondary);
}

.invalid-feedback {
  font-size: 0.875rem;
}

.alert {
  margin-top: 1rem;
  margin-bottom: 0;
}
</style>