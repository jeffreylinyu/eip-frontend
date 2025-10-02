<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Workspace } from '@/stores/workspace'
import { useCompanyStore } from '@/stores/company'
import Modal from '@/components/bootstrap/Modal.vue'

// Props
const props = defineProps<{
  show: boolean
  workspace?: Workspace | null
}>()

// Emits
const emit = defineEmits<{
  'update:show': [value: boolean]
  hide: []
  submit: [data: any]
}>()

// 表單數據
const formData = ref({
  name: '',
  description: '',
  companyId: ''
})

// Store
const companyStore = useCompanyStore()

// 狀態
const isSubmitting = ref(false)
const errors = ref<Record<string, string>>({})

// 計算屬性
const isEditMode = computed(() => !!props.workspace)
const modalTitle = computed(() => isEditMode.value ? '編輯工作空間' : '新增工作空間')
const submitButtonText = computed(() => isEditMode.value ? '更新' : '創建')

// 可用的公司列表 (只顯示啟用狀態的公司)
const availableCompanies = computed(() => {
  return companyStore.activeCompanies
})

// 方法
const hideModal = () => {
  emit('update:show', false)
  emit('hide')
}

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    companyId: availableCompanies.value[0]?.companyId || ''
  }
  errors.value = {}
}

// 監聽workspace變化，填充表單
watch(() => props.workspace, (newWorkspace) => {
  if (newWorkspace) {
    formData.value = {
      name: newWorkspace.name,
      description: newWorkspace.description,
      companyId: (newWorkspace as any).companyId || ''
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// 監聽show變化，重置錯誤並設置默認公司
watch(() => props.show, (newShow) => {
  // console.log('WorkspaceFormModal show changed:', newShow)
  if (newShow) {
    errors.value = {}
    // 如果沒有選擇公司且有可用公司，設置第一個作為默認值
    if (!formData.value.companyId && availableCompanies.value.length > 0) {
      formData.value.companyId = availableCompanies.value[0].companyId
    }
  }
})

const validateForm = () => {
  errors.value = {}
  
  if (!formData.value.name.trim()) {
    errors.value.name = '工作空間名稱不能為空'
  } else if (formData.value.name.trim().length < 2) {
    errors.value.name = '工作空間名稱至少需要2個字符'
  } else if (formData.value.name.trim().length > 50) {
    errors.value.name = '工作空間名稱不能超過50個字符'
  }

  if (!formData.value.companyId.trim()) {
    errors.value.companyId = '請選擇一個公司'
  }

  if (formData.value.description.trim().length > 200) {
    errors.value.description = '工作空間描述不能超過200個字符'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) {
    // console.log('⚠️ 表單驗證失敗')
    return
  }

  isSubmitting.value = true
  // console.log('📋 工作空間表單提交中...')
  
  try {
    const submitData = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      companyId: formData.value.companyId.trim()
    }
    
    // console.log('📤 提交的表單資料:', submitData)
    // console.log('🏢 選擇的公司 ID:', submitData.companyId)
    
    emit('submit', submitData)
  } catch (error) {
    console.error('❌ 表單提交錯誤:', error)
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

// 生命週期
onMounted(() => {
  // 初始化公司數據
  companyStore.initCompanies()
})
</script>

<template>
  <Modal
    :show="props.show"
    :title="modalTitle"
    icon="fa fa-building"
    size="lg"
    modal-id="workspaceFormModal"
    :confirm-text="submitButtonText"
    confirm-icon="fa fa-save"
    :is-loading="isSubmitting"
    loading-text="處理中..."
    @hide="hideModal"
    @confirm="handleConfirm"
  >
    <template #body>
      <form @submit.prevent="handleSubmit">
        
        <!-- 公司選擇 -->
        <div class="mb-3">
          <label for="companyId" class="form-label">
            所屬公司 <span class="text-danger">*</span>
          </label>
          <select 
            id="companyId"
            class="form-select"
            :class="{ 'is-invalid': errors.companyId }"
            v-model="formData.companyId"
            @change="clearError('companyId')"
            :disabled="isSubmitting"
          >
            <option value="">請選擇公司</option>
            <option 
              v-for="company in availableCompanies" 
              :key="company.companyId" 
              :value="company.companyId"
            >
              {{ company.companyName }} ({{ company.companyCode }})
            </option>
          </select>
          <div v-if="errors.companyId" class="invalid-feedback">
            {{ errors.companyId }}
          </div>
          <div v-if="availableCompanies.length === 0" class="form-text text-warning">
            <i class="fa fa-exclamation-triangle me-1"></i>
            目前沒有可用的公司，請先建立公司
          </div>
        </div>

        <!-- 工作空間名稱 -->
        <div class="mb-3">
          <label for="workspaceName" class="form-label">
            工作空間名稱 <span class="text-danger">*</span>
          </label>
          <input 
            id="workspaceName"
            type="text" 
            class="form-control"
            :class="{ 'is-invalid': errors.name }"
            v-model="formData.name"
            @input="clearError('name')"
            placeholder="請輸入工作空間名稱"
            maxlength="50"
            :disabled="isSubmitting"
          />
          <div v-if="errors.name" class="invalid-feedback">
            {{ errors.name }}
          </div>
          <div class="form-text">
            {{ formData.name.length }}/50 字符
          </div>
        </div>

        <!-- 工作空間描述 -->
        <div class="mb-3">
          <label for="workspaceDescription" class="form-label">工作空間描述</label>
          <textarea 
            id="workspaceDescription"
            class="form-control"
            :class="{ 'is-invalid': errors.description }"
            v-model="formData.description"
            @input="clearError('description')"
            placeholder="請輸入工作空間描述（選填）"
            rows="3"
            maxlength="200"
            :disabled="isSubmitting"
          ></textarea>
          <div v-if="errors.description" class="invalid-feedback">
            {{ errors.description }}
          </div>
          <div class="form-text">
            {{ formData.description.length }}/200 字符
          </div>
        </div>



        <!-- 錯誤提示 -->
        <div v-if="Object.keys(errors).length > 0" class="alert alert-danger">
          <i class="fa fa-exclamation-triangle me-2"></i>
          請修正以下錯誤：
          <ul class="mb-0 mt-2">
            <li v-for="(error, field) in errors" :key="field">{{ error }}</li>
          </ul>
        </div>
      </form>
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

.form-control:focus {
  border-color: var(--bs-theme);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-theme-rgb), 0.25);
}

.form-control.is-invalid:focus {
  border-color: var(--bs-danger);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-danger-rgb), 0.25);
}
</style> 