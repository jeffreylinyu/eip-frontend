/**
 * 工程案表單驗證規則
 * 定義所有工程案相關表單的驗證規則
 */

import type { FieldValidationRules } from './validation'

/**
 * 工程案基本資訊驗證規則
 */
export const projectFormValidationRules: FieldValidationRules = {
  // 工程基本資訊
  project_name: {
    minLength: 2,
    maxLength: 100,
  },
  
  contract_number: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[A-Z0-9\-_]+$/,
  },
  
  project_location: {
    minLength: 5,
    maxLength: 200,
  },
  
  host_agency: {
    minLength: 2,
    maxLength: 100,
  },
  
  /* 舊欄位已棄用
  supervision_unit: {
    minLength: 2,
    maxLength: 100,
  },
  */
  
  /* 舊欄位已棄用
  contractor_name: {
    minLength: 2,
    maxLength: 100,
  },
  */
  
  construction_period: {
    integer: true,
    min: 1,
    max: 3650, // 最多10年
  },
  
  project_amount: {
    positiveNumber: true,
    min: 1000, // 最少1千元
  },
  
  current_contract_amount: {
    positiveNumber: true,
    min: 1000, // 最少1千元
  },
  
  // 工程類別/屬性
  project_category: {
    // 選填
  },
  
  // 工期起訖日期
  sign_date: {
    date: true,
  },
  
  start_date: {
    date: true,
    dateRange: {
      startField: 'sign_date',
      endField: 'start_date',
    },
  },
  
  completion_date: {
    // 完工日期已改為只讀，由系統自動計算，不再需要驗證
    // date: true,
    // dateRange: {
    //   startField: 'start_date',
    //   endField: 'completion_date',
    // },
  },
  
  // 付款方式
  payment_method: {
    // 選填
  },
  
  advance_payment_ratio: {
    number: true,
    min: 0,
    max: 100,
  },
  
  retention_ratio: {
    number: true,
    min: 0,
    max: 100,
  },
  
  // 保險相關資訊
  insurance_policy_number: {
    minLength: 5,
    maxLength: 50,
  },
  
  insurance_company: {
    minLength: 2,
    maxLength: 100,
  },
  
  insurance_start_date: {
    date: true,
  },
  
  insurance_end_date: {
    date: true,
    dateRange: {
      startField: 'insurance_start_date',
      endField: 'insurance_end_date',
    },
  },
  
  insurance_type: {
    // 選填
  },
}

/**
 * 工作空間項目驗證規則（簡化版）
 */
export const workspaceProjectValidationRules: FieldValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  
  workspaceId: {
    required: true,
  },
  
  location: {
    required: true,
    minLength: 5,
    maxLength: 100,
  },
  
  budget: {
    required: true,
    positiveNumber: true,
    min: 1000,
  },
  
  managerName: {
    required: true,
    minLength: 2,
    maxLength: 20,
  },
  
  startDate: {
    date: true,
  },
  
  endDate: {
    date: true,
    dateRange: {
      startField: 'startDate',
      endField: 'endDate',
    },
  },
  
  description: {
    maxLength: 500,
  },
  
  progress: {
    number: true,
    min: 0,
    max: 100,
  },
}

/**
 * 公司表單驗證規則
 */
export const companyFormValidationRules: FieldValidationRules = {
  companyName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  
  companyUnifiedNumber: {
    required: true,
    pattern: /^\d{8}$/,
  },
  
  companyType: {
    required: true,
  },
  
  contractorLevel: {
    required: true,
  },
}

/**
 * 工作空間表單驗證規則
 */
export const workspaceFormValidationRules: FieldValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  
  description: {
    required: true,
    minLength: 5,
    maxLength: 200,
  },
  
  companyId: {
    required: true,
  },
}

/**
 * 用戶登入驗證規則
 */
export const loginValidationRules: FieldValidationRules = {
  email: {
    required: true,
    email: true,
  },
  
  password: {
    required: true,
    minLength: 6,
    maxLength: 50,
  },
}

/**
 * 用戶註冊驗證規則
 */
export const registerValidationRules: FieldValidationRules = {
  username: {
    required: true,
    minLength: 2,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_]+$/,
  },
  
  email: {
    required: true,
    email: true,
  },
  
  password: {
    required: true,
    minLength: 8,
    maxLength: 50,
    custom: (value: string) => {
      // 密碼強度驗證：至少包含一個數字和一個字母
      const hasNumber = /\d/.test(value)
      const hasLetter = /[a-zA-Z]/.test(value)
      
      if (!hasNumber || !hasLetter) {
        return {
          isValid: false,
          message: '密碼必須包含至少一個數字和一個字母'
        }
      }
      
      return { isValid: true }
    },
  },
  
  confirmPassword: {
    required: true,
    custom: (value: string, formData?: any) => {
      if (formData && value !== formData.password) {
        return {
          isValid: false,
          message: '確認密碼與密碼不一致'
        }
      }
      return { isValid: true }
    },
  },
  
  phone: {
    phone: true,
  },
}

/**
 * 自定義驗證規則範例
 */
export const customValidationExamples = {
  // 台灣統一編號驗證
  taiwanBusinessNumber: {
    pattern: /^\d{8}$/,
    custom: (value: string) => {
      if (!value || value.length !== 8) {
        return { isValid: false, message: '統一編號必須為8位數字' }
      }
      
      // 統一編號檢核邏輯
      const digits = value.split('').map(Number)
      const weights = [1, 2, 1, 2, 1, 2, 4, 1]
      let sum = 0
      
      for (let i = 0; i < 8; i++) {
        let product = digits[i] * weights[i]
        sum += Math.floor(product / 10) + (product % 10)
      }
      
      if (sum % 10 !== 0) {
        return { isValid: false, message: '統一編號格式不正確' }
      }
      
      return { isValid: true }
    },
  },
  
  // 專案代碼驗證
  projectCode: {
    pattern: /^[A-Z]{2}\d{4}$/,
    custom: (value: string) => {
      if (!value.match(/^[A-Z]{2}\d{4}$/)) {
        return {
          isValid: false,
          message: '專案代碼格式：兩個大寫字母+四位數字（例：AB1234）'
        }
      }
      return { isValid: true }
    },
  },
}

export default {
  projectFormValidationRules,
  workspaceProjectValidationRules,
  companyFormValidationRules,
  workspaceFormValidationRules,
  loginValidationRules,
  registerValidationRules,
  customValidationExamples,
}
