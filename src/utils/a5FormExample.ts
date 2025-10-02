import { type A5FormParams, type A7FormParams } from '@/api/forms'

// A-5 表單範例資料
export const A5_FORM_EXAMPLE: A5FormParams = {
  constructionId: "CTq3CMSVeDUuBYCEM2KRkjl40DSjTnPf",
  title: "afive file",
  supervisoryName: "王小明",
  supervisoryFactory: "台北市信義區XX路XX號",
  contractDate: "2024-06-15T09:00:00",
  startDate: "2024-07-01T08:30:00",
  finishDate: "2025-12-31T17:00:00",
  workedDay: "45",
  disbursementAdvancePayment: "1500000",
  estimateAmount: "3000000",
  adjustPriceIndex: "102",
  deductAmount: "50000",
  retention: "100000",
  deductionAdvancePayment: "200000",
  comment: "this is test file 4",
  deductedColumnReason: "just want to right lol",
  explainActualAmount: "eight iiiilll"
}

// 空白的 A-5 表單參數（除了 constructionId 和 title，其他都為空字串）
export const A5_FORM_EMPTY = (constructionId: string, title: string): A5FormParams => ({
  constructionId,
  title,
  supervisoryName: '',
  supervisoryFactory: '',
  contractDate: '',
  startDate: '',
  finishDate: '',
  workedDay: '',
  disbursementAdvancePayment: '',
  estimateAmount: '',
  adjustPriceIndex: '',
  deductAmount: '',
  retention: '',
  deductionAdvancePayment: '',
  comment: '',
  deductedColumnReason: '',
  explainActualAmount: ''
})

// 從表單資料生成 A-5 參數
export const generateA5Params = (formData: Record<string, any>, constructionId?: string): A5FormParams => {
  return {
    constructionId: constructionId || formData.constructionId || '',
    title: formData.title || 'A-5 施工計畫書',
    supervisoryName: formData.supervisoryName || '',
    supervisoryFactory: formData.supervisoryFactory || '',
    contractDate: formData.contractDate || '',
    startDate: formData.startDate || '',
    finishDate: formData.endDate || formData.finishDate || '',
    workedDay: formData.workedDay || formData.constructionPeriod || '',
    disbursementAdvancePayment: formData.disbursementAdvancePayment || '',
    estimateAmount: formData.estimateAmount || '',
    adjustPriceIndex: formData.adjustPriceIndex || '',
    deductAmount: formData.deductAmount || '',
    retention: formData.retention || '',
    deductionAdvancePayment: formData.deductionAdvancePayment || '',
    comment: formData.comment || '',
    deductedColumnReason: formData.deductedColumnReason || '',
    explainActualAmount: formData.explainActualAmount || ''
  }
}

// 驗證 A-5 參數
export const validateA5Params = (params: A5FormParams): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!params.constructionId) {
    errors.push('工程編號為必填項目')
  }
  
  if (!params.title) {
    errors.push('表單標題為必填項目')
  }
  
  // 可選的數值驗證
  if (params.workedDay && (isNaN(Number(params.workedDay)) || Number(params.workedDay) < 1)) {
    errors.push('工作天數必須為正整數')
  }
  
  if (params.adjustPriceIndex && (isNaN(Number(params.adjustPriceIndex)) || Number(params.adjustPriceIndex) < 0)) {
    errors.push('物價調整指數必須為非負數')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// A-7 表單範例資料
export const A7_FORM_EXAMPLE = {
  constructionId: "CTq3CMSVeDUuBYCEM2KRkjl40DSjTnPf"
}

// 生成 A-7 參數
export const generateA7Params = (constructionId?: string): A7FormParams => {
  return {
    title: 'A-7 表單',
    constructionId: constructionId || 'CTq3CMSVeDUuBYCEM2KRkjl40DSjTnPf',
    companyId: 'COMP001'
  }
}

// 驗證 A-7 參數
export const validateA7Params = (params: A7FormParams): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!params.constructionId) {
    errors.push('工程編號為必填項目')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
