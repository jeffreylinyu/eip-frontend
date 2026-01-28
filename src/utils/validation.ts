/**
 * 共用表單驗證系統
 * 提供統一的驗證規則和錯誤訊息
 */

// 驗證結果介面
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// 驗證規則介面
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => ValidationResult;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
  number?: boolean;
  positiveNumber?: boolean;
  integer?: boolean;
  date?: boolean;
  dateRange?: {
    startDate?: string;
    endDate?: string;
    startField?: string;
    endField?: string;
  };
}

// 欄位驗證規則集合
export interface FieldValidationRules {
  [fieldName: string]: ValidationRule;
}

// 驗證錯誤集合
export interface ValidationErrors {
  [fieldName: string]: string;
}

/**
 * 基本驗證函數
 */
export class ValidationUtils {
  /**
   * 必填欄位驗證
   */
  static required(value: any): ValidationResult {
    if (value === null || value === undefined) {
      return { isValid: false, message: '此欄位為必填' };
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      return { isValid: false, message: '此欄位為必填' };
    }
    
    if (Array.isArray(value) && value.length === 0) {
      return { isValid: false, message: '此欄位為必填' };
    }
    
    return { isValid: true };
  }

  /**
   * 最小長度驗證
   */
  static minLength(value: string, minLength: number): ValidationResult {
    if (!value) return { isValid: true }; // 如果沒有值，跳過長度檢查
    
    if (value.length < minLength) {
      return { isValid: false, message: `最少需要 ${minLength} 個字符` };
    }
    
    return { isValid: true };
  }

  /**
   * 最大長度驗證
   */
  static maxLength(value: string, maxLength: number): ValidationResult {
    if (!value) return { isValid: true };
    
    if (value.length > maxLength) {
      return { isValid: false, message: `不能超過 ${maxLength} 個字符` };
    }
    
    return { isValid: true };
  }

  /**
   * 最小值驗證
   */
  static min(value: number | string, min: number): ValidationResult {
    if (value === null || value === undefined || value === '') return { isValid: true };
    
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < min) {
      return { isValid: false, message: `值不能小於 ${min}` };
    }
    
    return { isValid: true };
  }

  /**
   * 最大值驗證
   */
  static max(value: number | string, max: number): ValidationResult {
    if (value === null || value === undefined || value === '') return { isValid: true };
    
    const numValue = Number(value);
    if (isNaN(numValue) || numValue > max) {
      return { isValid: false, message: `值不能大於 ${max}` };
    }
    
    return { isValid: true };
  }

  /**
   * 正則表達式驗證
   */
  static pattern(value: string, pattern: RegExp): ValidationResult {
    if (!value) return { isValid: true };
    
    if (!pattern.test(value)) {
      return { isValid: false, message: '格式不正確' };
    }
    
    return { isValid: true };
  }

  /**
   * 電子郵件驗證
   */
  static email(value: string): ValidationResult {
    if (!value) return { isValid: true };
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return { isValid: false, message: '請輸入有效的電子郵件地址' };
    }
    
    return { isValid: true };
  }

  /**
   * 電話號碼驗證
   */
  static phone(value: string): ValidationResult {
    if (!value) return { isValid: true };
    
    const phonePattern = /^(\+886|0)?[0-9]{8,10}$/;
    if (!phonePattern.test(value.replace(/[\s-]/g, ''))) {
      return { isValid: false, message: '請輸入有效的電話號碼' };
    }
    
    return { isValid: true };
  }

  /**
   * URL 驗證
   */
  static url(value: string): ValidationResult {
    if (!value) return { isValid: true };
    
    try {
      new URL(value);
      return { isValid: true };
    } catch {
      return { isValid: false, message: '請輸入有效的網址' };
    }
  }

  /**
   * 數字驗證
   */
  static number(value: any): ValidationResult {
    if (value === null || value === undefined || value === '') return { isValid: true };
    
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return { isValid: false, message: '請輸入有效的數字' };
    }
    
    return { isValid: true };
  }

  /**
   * 正數驗證
   */
  static positiveNumber(value: any): ValidationResult {
    if (value === null || value === undefined || value === '') return { isValid: true };
    
    const numValue = Number(value);
    // 如果值為 0，視為未填寫，跳過驗證
    if (numValue === 0) return { isValid: true };
    
    if (isNaN(numValue) || numValue <= 0) {
      return { isValid: false, message: '請輸入大於 0 的數字' };
    }
    
    return { isValid: true };
  }

  /**
   * 整數驗證
   */
  static integer(value: any): ValidationResult {
    if (value === null || value === undefined || value === '') return { isValid: true };
    
    const numValue = Number(value);
    if (isNaN(numValue) || !Number.isInteger(numValue)) {
      return { isValid: false, message: '請輸入整數' };
    }
    
    return { isValid: true };
  }

  /**
   * 日期驗證
   */
  static date(value: string): ValidationResult {
    if (!value) return { isValid: true };
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { isValid: false, message: '請輸入有效的日期' };
    }
    
    return { isValid: true };
  }

  /**
   * 日期範圍驗證
   */
  static dateRange(startDate: string, endDate: string): ValidationResult {
    if (!startDate || !endDate) return { isValid: true };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, message: '請輸入有效的日期' };
    }
    
    if (start >= end) {
      return { isValid: false, message: '結束日期必須晚於開始日期' };
    }
    
    return { isValid: true };
  }
}

/**
 * 檢查值是否為空（用於判斷是否跳過非必填驗證）
 */
function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
}

/**
 * 執行單個欄位驗證
 */
export function validateField(value: any, rule: ValidationRule): ValidationResult {
  // 必填驗證
  if (rule.required) {
    const result = ValidationUtils.required(value);
    if (!result.isValid) return result;
  }

  // 如果沒有值且不是必填，跳過其他驗證
  if (isEmptyValue(value) && !rule.required) {
    return { isValid: true };
  }

  // 字符串長度驗證
  if (rule.minLength !== undefined) {
    const result = ValidationUtils.minLength(value, rule.minLength);
    if (!result.isValid) return result;
  }

  if (rule.maxLength !== undefined) {
    const result = ValidationUtils.maxLength(value, rule.maxLength);
    if (!result.isValid) return result;
  }

  // 數值範圍驗證
  // 如果值為 0 且欄位不是必填，視為未填寫，跳過最小值驗證
  if (rule.min !== undefined) {
    const numValue = Number(value);
    if (numValue === 0 && !rule.required) {
      // 值為 0 且非必填，視為未填寫，跳過最小值驗證
    } else {
      const result = ValidationUtils.min(value, rule.min);
      if (!result.isValid) return result;
    }
  }

  if (rule.max !== undefined) {
    const result = ValidationUtils.max(value, rule.max);
    if (!result.isValid) return result;
  }

  // 正則表達式驗證
  if (rule.pattern) {
    const result = ValidationUtils.pattern(value, rule.pattern);
    if (!result.isValid) return result;
  }

  // 特殊類型驗證
  if (rule.email) {
    const result = ValidationUtils.email(value);
    if (!result.isValid) return result;
  }

  if (rule.phone) {
    const result = ValidationUtils.phone(value);
    if (!result.isValid) return result;
  }

  if (rule.url) {
    const result = ValidationUtils.url(value);
    if (!result.isValid) return result;
  }

  if (rule.number) {
    const result = ValidationUtils.number(value);
    if (!result.isValid) return result;
  }

  if (rule.positiveNumber) {
    const result = ValidationUtils.positiveNumber(value);
    if (!result.isValid) return result;
  }

  if (rule.integer) {
    const result = ValidationUtils.integer(value);
    if (!result.isValid) return result;
  }

  if (rule.date) {
    const result = ValidationUtils.date(value);
    if (!result.isValid) return result;
  }

  // 自定義驗證
  if (rule.custom) {
    const result = rule.custom(value);
    if (!result.isValid) return result;
  }

  return { isValid: true };
}

/**
 * 執行表單驗證
 */
export function validateForm(formData: any, rules: FieldValidationRules): ValidationErrors {
  const errors: ValidationErrors = {};

  // 驗證各個欄位
  Object.keys(rules).forEach(fieldName => {
    const value = formData[fieldName];
    const rule = rules[fieldName];
    
    const result = validateField(value, rule);
    if (!result.isValid) {
      errors[fieldName] = result.message || '驗證失敗';
    }
  });

  // 處理日期範圍驗證
  Object.keys(rules).forEach(fieldName => {
    const rule = rules[fieldName];
    if (rule.dateRange) {
      const { startField, endField } = rule.dateRange;
      if (startField && endField) {
        const startDate = formData[startField];
        const endDate = formData[endField];
        const result = ValidationUtils.dateRange(startDate, endDate);
        if (!result.isValid) {
          errors[endField] = result.message || '日期範圍無效';
        }
      }
    }
  });

  return errors;
}

/**
 * 檢查表單是否有效
 */
export function isFormValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
