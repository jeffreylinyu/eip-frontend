/**
 * Vue 組合式函數 - 表單驗證
 * 提供響應式的表單驗證功能
 */

import { ref, computed, watch, type Ref } from 'vue'
import { 
  validateForm, 
  validateField, 
  isFormValid,
  type FieldValidationRules, 
  type ValidationErrors,
  type ValidationRule 
} from '@/utils/validation'

export interface UseValidationOptions {
  // 是否在輸入時即時驗證
  validateOnInput?: boolean
  // 是否在失焦時驗證
  validateOnBlur?: boolean
  // 是否在表單變更時自動驗證
  validateOnChange?: boolean
  // 延遲驗證時間（毫秒）
  debounceMs?: number
}

export interface UseValidationReturn {
  // 驗證錯誤
  errors: Ref<ValidationErrors>
  // 表單是否有效
  isValid: Ref<boolean>
  // 是否正在驗證
  isValidating: Ref<boolean>
  // 驗證整個表單
  validateAll: () => boolean
  // 驗證單個欄位
  validateSingleField: (fieldName: string) => boolean
  // 清除錯誤
  clearErrors: (fieldNames?: string[]) => void
  // 清除單個欄位錯誤
  clearFieldError: (fieldName: string) => void
  // 設置自定義錯誤
  setError: (fieldName: string, message: string) => void
  // 設置多個錯誤
  setErrors: (newErrors: ValidationErrors) => void
  // 獲取欄位錯誤狀態
  hasError: (fieldName: string) => boolean
  // 獲取欄位錯誤訊息
  getFieldError: (fieldName: string) => string | undefined
}

/**
 * 表單驗證組合式函數
 */
export function useValidation(
  formData: Ref<any>,
  validationRules: FieldValidationRules,
  options: UseValidationOptions = {}
): UseValidationReturn {
  
  const {
    validateOnInput = false,
    validateOnBlur = false,
    validateOnChange = true,
    debounceMs = 300
  } = options

  // 狀態
  const errors = ref<ValidationErrors>({})
  const isValidating = ref(false)
  let debounceTimer: number | null = null

  // 計算屬性
  const isValid = computed(() => isFormValid(errors.value))

  /**
   * 執行表單驗證
   */
  const validateAll = (): boolean => {
    isValidating.value = true
    
    try {
      const newErrors = validateForm(formData.value, validationRules)
      errors.value = newErrors
      
      const valid = isFormValid(newErrors)
      
      return valid
    } finally {
      isValidating.value = false
    }
  }

  /**
   * 驗證單個欄位
   */
  const validateSingleField = (fieldName: string): boolean => {
    
    const rule = validationRules[fieldName]
    if (!rule) {
      console.warn(`⚠️ 找不到欄位 ${fieldName} 的驗證規則`)
      return true
    }

    isValidating.value = true
    
    try {
      const value = formData.value[fieldName]
      const result = validateField(value, rule)
      
      if (result.isValid) {
        // 清除該欄位的錯誤
        const { [fieldName]: removed, ...rest } = errors.value
        errors.value = rest
      } else {
        // 設置錯誤
        errors.value = {
          ...errors.value,
          [fieldName]: result.message || '驗證失敗'
        }
      }
      
      return result.isValid
    } finally {
      isValidating.value = false
    }
  }

  /**
   * 延遲驗證
   */
  const debouncedValidate = (fieldName?: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    debounceTimer = setTimeout(() => {
      if (fieldName) {
        validateSingleField(fieldName)
      } else {
        validateAll()
      }
    }, debounceMs)
  }

  /**
   * 清除錯誤
   */
  const clearErrors = (fieldNames?: string[]) => {
    if (fieldNames) {
      const newErrors = { ...errors.value }
      fieldNames.forEach(fieldName => {
        delete newErrors[fieldName]
      })
      errors.value = newErrors
    } else {
      errors.value = {}
    }
  }

  /**
   * 清除單個欄位錯誤
   */
  const clearFieldError = (fieldName: string) => {
    const { [fieldName]: removed, ...rest } = errors.value
    errors.value = rest
  }

  /**
   * 設置自定義錯誤
   */
  const setError = (fieldName: string, message: string) => {
    errors.value = {
      ...errors.value,
      [fieldName]: message
    }
  }

  /**
   * 設置多個錯誤
   */
  const setErrors = (newErrors: ValidationErrors) => {
    errors.value = {
      ...errors.value,
      ...newErrors
    }
  }

  /**
   * 檢查欄位是否有錯誤
   */
  const hasError = (fieldName: string): boolean => {
    return fieldName in errors.value
  }

  /**
   * 獲取欄位錯誤訊息
   */
  const getFieldError = (fieldName: string): string | undefined => {
    return errors.value[fieldName]
  }

  // 監聽表單變更
  if (validateOnChange) {
    watch(
      formData,
      () => {
        if (debounceMs > 0) {
          debouncedValidate()
        } else {
          validateAll()
        }
      },
      { deep: true }
    )
  }

  return {
    errors,
    isValid,
    isValidating,
    validateAll,
    validateSingleField,
    clearErrors,
    clearFieldError,
    setError,
    setErrors,
    hasError,
    getFieldError
  }
}

/**
 * 創建欄位驗證輔助函數
 */
export function createFieldValidator(
  formData: Ref<any>,
  validationRules: FieldValidationRules,
  validation: UseValidationReturn
) {
  return {
    /**
     * 獲取欄位驗證屬性
     */
    getFieldProps: (fieldName: string) => ({
      'class': validation.hasError(fieldName) ? 'is-invalid' : '',
      onInput: () => {
        validation.clearFieldError(fieldName)
      },
      onBlur: () => {
        validation.validateSingleField(fieldName)
      }
    }),

    /**
     * 獲取錯誤訊息元素屬性
     */
    getErrorProps: (fieldName: string) => ({
      'class': 'invalid-feedback',
      style: {
        display: validation.hasError(fieldName) ? 'block' : 'none'
      }
    })
  }
}
