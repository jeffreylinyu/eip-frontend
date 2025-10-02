<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { type FormConfig, type FormField, type FormSection, validateFormData } from '@/config/formFields'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'

// Props
interface Props {
  formConfig: FormConfig
  initialData?: Record<string, any>
  readonly?: boolean
  showSectionNumbers?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialData: () => ({}),
  readonly: false,
  showSectionNumbers: true
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  'validate': [errors: Record<string, string>]
  'section-toggle': [sectionId: string, expanded: boolean]
}>()

// 狀態管理
const formData = ref<Record<string, any>>({})
const errors = ref<Record<string, string>>({})
const expandedSections = ref<Set<string>>(new Set())
const isDirty = ref(false)

// 計算屬性
const isValid = computed(() => {
  return Object.keys(errors.value).length === 0
})

const requiredFieldCount = computed(() => {
  return props.formConfig.sections.reduce((count, section) => {
    return count + section.fields.filter(field => field.required).length
  }, 0)
})

const completedFieldCount = computed(() => {
  return props.formConfig.sections.reduce((count, section) => {
    return count + section.fields.filter(field => {
      const value = formData.value[field.name]
      return field.required && value && value !== '' && (!Array.isArray(value) || value.length > 0)
    }).length
  }, 0)
})

const completionPercentage = computed(() => {
  if (requiredFieldCount.value === 0) return 100
  return Math.round((completedFieldCount.value / requiredFieldCount.value) * 100)
})

// 方法
const initializeFormData = () => {
  const initialData: Record<string, any> = { ...props.initialData }
  
  props.formConfig.sections.forEach(section => {
    section.fields.forEach(field => {
      if (!(field.name in initialData)) {
        switch (field.type) {
          case 'checkbox':
            initialData[field.name] = field.defaultValue || []
            break
          case 'number':
            initialData[field.name] = field.defaultValue || field.validation?.min || 0
            break
          case 'date':
            initialData[field.name] = field.defaultValue || ''
            break
          default:
            initialData[field.name] = field.defaultValue || ''
        }
      }
    })
    
    // 預設展開狀態
    if (section.defaultExpanded !== false) {
      expandedSections.value.add(section.id)
    }
  })
  
  formData.value = initialData
}

const validateField = (field: FormField, value: any): string | null => {
  // 必填驗證
  if (field.required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
    return `${field.label}為必填項目`
  }
  
  // 如果有值才進行進一步驗證
  if (value && field.validation) {
    const validation = field.validation
    
    // 字串長度驗證
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return `${field.label}至少需要${validation.minLength}個字符`
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `${field.label}不能超過${validation.maxLength}個字符`
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        return `${field.label}格式不正確`
      }
    }
    
    // 數值驗證
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `${field.label}不能小於${validation.min}`
      }
      if (validation.max !== undefined && value > validation.max) {
        return `${field.label}不能大於${validation.max}`
      }
    }
    
    // 自訂驗證
    if (validation.custom) {
      const customError = validation.custom(value)
      if (customError) {
        return customError
      }
    }
  }
  
  return null
}

const validateAllFields = () => {
  const newErrors: Record<string, string> = {}
  
  props.formConfig.sections.forEach(section => {
    section.fields.forEach(field => {
      // 檢查條件顯示
      if (field.showWhen && !field.showWhen(formData.value)) {
        return
      }
      
      const error = validateField(field, formData.value[field.name])
      if (error) {
        newErrors[field.name] = error
      }
    })
  })
  
  errors.value = newErrors
  emit('validate', newErrors)
  return Object.keys(newErrors).length === 0
}

const updateFieldValue = (fieldName: string, value: any) => {
  formData.value[fieldName] = value
  isDirty.value = true
  
  // 即時驗證該欄位
  const field = getAllFields().find(f => f.name === fieldName)
  if (field) {
    const error = validateField(field, value)
    if (error) {
      errors.value[fieldName] = error
    } else {
      delete errors.value[fieldName]
    }
  }
  
  // 發送更新事件
  emit('update:modelValue', { ...formData.value })
}

const toggleSection = (sectionId: string) => {
  if (expandedSections.value.has(sectionId)) {
    expandedSections.value.delete(sectionId)
  } else {
    expandedSections.value.add(sectionId)
  }
  
  emit('section-toggle', sectionId, expandedSections.value.has(sectionId))
}

const getAllFields = (): FormField[] => {
  return props.formConfig.sections.reduce((fields: FormField[], section) => {
    return fields.concat(section.fields)
  }, [])
}

const isFieldVisible = (field: FormField): boolean => {
  return !field.showWhen || field.showWhen(formData.value)
}

const getSectionProgress = (section: FormSection): number => {
  const requiredFields = section.fields.filter(field => field.required && isFieldVisible(field))
  if (requiredFields.length === 0) return 100
  
  const completedFields = requiredFields.filter(field => {
    const value = formData.value[field.name]
    return value && value !== '' && (!Array.isArray(value) || value.length > 0)
  })
  
  return Math.round((completedFields.length / requiredFields.length) * 100)
}

// 監聽器
watch(() => props.initialData, (newData) => {
  formData.value = { ...formData.value, ...newData }
}, { deep: true })

watch(formData, () => {
  validateAllFields()
}, { deep: true })

// 生命週期
onMounted(() => {
  initializeFormData()
  validateAllFields()
})

// 對外暴露方法
defineExpose({
  validate: validateAllFields,
  getFormData: () => formData.value,
  reset: initializeFormData,
  setFieldValue: updateFieldValue,
  isDirty: () => isDirty.value,
  isValid: () => isValid.value
})
</script>

<template>
  <div class="form-parameter-manager">
    <!-- 表單資訊頭部 -->
    <Card class="mb-4">
      <CardHeader>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h5 class="mb-1">
              <i class="fa fa-file-alt me-2"></i>
              {{ formConfig.name }} ({{ formConfig.id }})
            </h5>
            <p class="text-muted mb-0 small">{{ formConfig.description }}</p>
          </div>
          <div class="text-end">
            <div class="small text-muted mb-1">完成度</div>
            <div class="d-flex align-items-center">
              <div class="progress me-2" style="width: 80px; height: 8px;">
                <div 
                  class="progress-bar" 
                  :class="{
                    'bg-danger': completionPercentage < 30,
                    'bg-warning': completionPercentage >= 30 && completionPercentage < 70,
                    'bg-success': completionPercentage >= 70
                  }"
                  :style="{ width: completionPercentage + '%' }"
                ></div>
              </div>
              <span class="small fw-bold">{{ completionPercentage }}%</span>
            </div>
            <div class="small text-muted">
              {{ completedFieldCount }}/{{ requiredFieldCount }} 必填項目
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>

    <!-- 表單區段 -->
    <div class="form-sections">
      <Card 
        v-for="(section, sectionIndex) in formConfig.sections" 
        :key="section.id"
        class="mb-3"
      >
        <CardHeader 
          class="cursor-pointer" 
          @click="toggleSection(section.id)"
          v-if="section.collapsible !== false"
        >
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <span v-if="showSectionNumbers" class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-2">
                {{ sectionIndex + 1 }}
              </span>
              <div>
                <h6 class="mb-1">{{ section.title }}</h6>
                <p v-if="section.description" class="text-muted small mb-0">{{ section.description }}</p>
              </div>
            </div>
            <div class="d-flex align-items-center">
              <!-- 區段進度 -->
              <div class="me-3 text-end">
                <div class="small text-muted">進度</div>
                <div class="small fw-bold">{{ getSectionProgress(section) }}%</div>
              </div>
              <!-- 展開/收合圖示 -->
              <i 
                class="fa" 
                :class="{
                  'fa-chevron-up': expandedSections.has(section.id),
                  'fa-chevron-down': !expandedSections.has(section.id)
                }"
              ></i>
            </div>
          </div>
        </CardHeader>
        
        <CardBody v-show="expandedSections.has(section.id)">
          <div class="row">
            <div 
              v-for="field in section.fields" 
              :key="field.id"
              :class="{
                'col-12': field.type === 'textarea',
                'col-lg-6': field.type !== 'textarea',
                'd-none': !isFieldVisible(field)
              }"
              class="mb-3"
            >
              <!-- 文字輸入框 -->
              <div v-if="field.type === 'text'" class="form-group">
                <label :for="field.id" class="form-label">
                  {{ field.label }}
                  <span v-if="field.required" class="text-danger">*</span>
                </label>
                <input 
                  :id="field.id"
                  type="text" 
                  class="form-control"
                  :class="{ 'is-invalid': errors[field.name] }"
                  :value="formData[field.name]"
                  @input="updateFieldValue(field.name, ($event.target as HTMLInputElement).value)"
                  :placeholder="field.placeholder"
                  :readonly="readonly"
                />
                <div v-if="errors[field.name]" class="invalid-feedback">
                  {{ errors[field.name] }}
                </div>
                <div v-if="field.description" class="form-text">
                  {{ field.description }}
                </div>
              </div>

              <!-- 文字區域 -->
              <div v-else-if="field.type === 'textarea'" class="form-group">
                <label :for="field.id" class="form-label">
                  {{ field.label }}
                  <span v-if="field.required" class="text-danger">*</span>
                </label>
                <textarea 
                  :id="field.id"
                  class="form-control"
                  :class="{ 'is-invalid': errors[field.name] }"
                  :value="formData[field.name]"
                  @input="updateFieldValue(field.name, ($event.target as HTMLTextAreaElement).value)"
                  :placeholder="field.placeholder"
                  :readonly="readonly"
                  rows="4"
                ></textarea>
                <div v-if="errors[field.name]" class="invalid-feedback">
                  {{ errors[field.name] }}
                </div>
                <div v-if="field.description" class="form-text">
                  {{ field.description }}
                </div>
              </div>

              <!-- 數字輸入框 -->
              <div v-else-if="field.type === 'number'" class="form-group">
                <label :for="field.id" class="form-label">
                  {{ field.label }}
                  <span v-if="field.required" class="text-danger">*</span>
                </label>
                <input 
                  :id="field.id"
                  type="number" 
                  class="form-control"
                  :class="{ 'is-invalid': errors[field.name] }"
                  :value="formData[field.name]"
                  @input="updateFieldValue(field.name, parseInt(($event.target as HTMLInputElement).value) || 0)"
                  :placeholder="field.placeholder"
                  :readonly="readonly"
                  :min="field.validation?.min"
                  :max="field.validation?.max"
                />
                <div v-if="errors[field.name]" class="invalid-feedback">
                  {{ errors[field.name] }}
                </div>
                <div v-if="field.description" class="form-text">
                  {{ field.description }}
                </div>
              </div>

              <!-- 日期選擇器 -->
              <div v-else-if="field.type === 'date'" class="form-group">
                <label :for="field.id" class="form-label">
                  {{ field.label }}
                  <span v-if="field.required" class="text-danger">*</span>
                </label>
                <input 
                  :id="field.id"
                  type="date" 
                  class="form-control"
                  :class="{ 'is-invalid': errors[field.name] }"
                  :value="formData[field.name]"
                  @input="updateFieldValue(field.name, ($event.target as HTMLInputElement).value)"
                  :readonly="readonly"
                />
                <div v-if="errors[field.name]" class="invalid-feedback">
                  {{ errors[field.name] }}
                </div>
                <div v-if="field.description" class="form-text">
                  {{ field.description }}
                </div>
              </div>

              <!-- 下拉選單 -->
              <div v-else-if="field.type === 'select'" class="form-group">
                <label :for="field.id" class="form-label">
                  {{ field.label }}
                  <span v-if="field.required" class="text-danger">*</span>
                </label>
                <select 
                  :id="field.id"
                  class="form-select"
                  :class="{ 'is-invalid': errors[field.name] }"
                  :value="formData[field.name]"
                  @change="updateFieldValue(field.name, ($event.target as HTMLSelectElement).value)"
                  :disabled="readonly"
                >
                  <option value="">請選擇...</option>
                  <option 
                    v-for="option in field.options" 
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <div v-if="errors[field.name]" class="invalid-feedback">
                  {{ errors[field.name] }}
                </div>
                <div v-if="field.description" class="form-text">
                  {{ field.description }}
                </div>
              </div>

              <!-- 核取方塊 -->
              <div v-else-if="field.type === 'checkbox'" class="form-group">
                <label class="form-label">
                  {{ field.label }}
                  <span v-if="field.required" class="text-danger">*</span>
                </label>
                <div class="form-check-group">
                  <div 
                    v-for="option in field.options" 
                    :key="option.value"
                    class="form-check"
                  >
                    <input 
                      :id="`${field.id}_${option.value}`"
                      type="checkbox" 
                      class="form-check-input"
                      :value="option.value"
                      :checked="(formData[field.name] || []).includes(option.value)"
                      @change="(e) => {
                        const checked = (e.target as HTMLInputElement).checked
                        const currentValues = formData[field.name] || []
                        let newValues
                        if (checked) {
                          newValues = [...currentValues, option.value]
                        } else {
                          newValues = currentValues.filter((v: string) => v !== option.value)
                        }
                        updateFieldValue(field.name, newValues)
                      }"
                      :disabled="readonly"
                    />
                    <label :for="`${field.id}_${option.value}`" class="form-check-label">
                      {{ option.label }}
                    </label>
                  </div>
                </div>
                <div v-if="errors[field.name]" class="invalid-feedback d-block">
                  {{ errors[field.name] }}
                </div>
                <div v-if="field.description" class="form-text">
                  {{ field.description }}
                </div>
              </div>

              <!-- 單選按鈕 -->
              <div v-else-if="field.type === 'radio'" class="form-group">
                <label class="form-label">
                  {{ field.label }}
                  <span v-if="field.required" class="text-danger">*</span>
                </label>
                <div class="form-check-group">
                  <div 
                    v-for="option in field.options" 
                    :key="option.value"
                    class="form-check"
                  >
                    <input 
                      :id="`${field.id}_${option.value}`"
                      type="radio" 
                      class="form-check-input"
                      :name="field.name"
                      :value="option.value"
                      :checked="formData[field.name] === option.value"
                      @change="updateFieldValue(field.name, option.value)"
                      :disabled="readonly"
                    />
                    <label :for="`${field.id}_${option.value}`" class="form-check-label">
                      {{ option.label }}
                    </label>
                  </div>
                </div>
                <div v-if="errors[field.name]" class="invalid-feedback d-block">
                  {{ errors[field.name] }}
                </div>
                <div v-if="field.description" class="form-text">
                  {{ field.description }}
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- 驗證摘要 -->
    <Card v-if="!isValid && Object.keys(errors).length > 0" class="border-danger">
      <CardBody>
        <h6 class="text-danger mb-3">
          <i class="fa fa-exclamation-triangle me-2"></i>
          發現 {{ Object.keys(errors).length }} 個驗證錯誤
        </h6>
        <ul class="list-unstyled mb-0">
          <li v-for="(error, fieldName) in errors" :key="fieldName" class="text-danger small mb-1">
            <i class="fa fa-times me-1"></i>
            {{ error }}
          </li>
        </ul>
      </CardBody>
    </Card>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.form-parameter-manager .progress {
  border-radius: 10px;
}

.form-check-group {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  padding: 0.75rem;
  background-color: var(--bs-light);
}

.form-check-group.is-invalid {
  border-color: var(--bs-danger);
}

.form-check {
  margin-bottom: 0.5rem;
}

.form-check:last-child {
  margin-bottom: 0;
}

.section-progress {
  width: 60px;
  height: 6px;
}

@media (max-width: 768px) {
  .form-parameter-manager .col-lg-6 {
    margin-bottom: 1rem;
  }
}
</style>
