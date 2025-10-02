/**
 * 估驗詳細表計算工具
 * 用於工程估驗請款的各項計算
 */

export interface EstimateCalculationParams {
  contractAmount: number // A10: 契約金額
  currentEstimateAmount: number // C1: 本次估驗計價款
  previousCumulativeAmount?: number // 前期累計金額
  priceIndexAdjustment?: number // D: 物價指數調整款
  deductions?: number // E: 扣款
  retentionRate?: number // 保留款比例 (預設 5%)
  advancePaymentDeduction?: number // G: 扣回預付款
}

export interface EstimateCalculationResult {
  // 基本資訊
  contractAmount: number // A10: 契約金額
  currentEstimateAmount: number // C1: 本次估驗計價款
  
  // 計算結果
  cumulativeEstimateAmount: number // C2: 累計估驗計價款
  totalCumulativeAmount: number // C3: 截至本次累計
  priceIndexAdjustment: number // D: 物價指數調整款
  deductions: number // E: 扣款
  retentionAmount: number // F: 保留款
  advancePaymentDeduction: number // G: 扣回預付款
  payableAmount: number // H1: 應付金額
  completionPercentage: number // B1: 完成百分比
}

/**
 * 計算估驗詳細表各項金額
 * @param params 計算參數
 * @returns 計算結果
 */
export function calculateEstimateDetails(params: EstimateCalculationParams): EstimateCalculationResult {
  const {
    contractAmount,
    currentEstimateAmount,
    previousCumulativeAmount = 0,
    priceIndexAdjustment = 0,
    deductions = 0,
    retentionRate = 0.05, // 預設 5%
    advancePaymentDeduction = 0
  } = params

  // 1. 契約金額（A10）
  const contractAmountResult = contractAmount

  // 2. 本次估驗計價款（C1）
  const currentEstimateAmountResult = currentEstimateAmount

  // 3. 累計估驗計價款（C2）
  const cumulativeEstimateAmount = currentEstimateAmount + previousCumulativeAmount

  // 4. 截至本次累計（C3）
  const totalCumulativeAmount = cumulativeEstimateAmount

  // 5. 物價指數調整款（D）
  const priceIndexAdjustmentResult = priceIndexAdjustment

  // 6. 扣款（E）
  const deductionsResult = deductions

  // 7. 保留款（F）
  const retentionAmount = currentEstimateAmount * retentionRate

  // 8. 扣回預付款（G）
  const advancePaymentDeductionResult = advancePaymentDeduction

  // 9. 應付金額（H1）
  const payableAmount = 
    currentEstimateAmount + 
    priceIndexAdjustmentResult - 
    deductionsResult - 
    retentionAmount - 
    advancePaymentDeductionResult

  // 10. 完成百分比（B1）
  const completionPercentage = contractAmount > 0 
    ? (cumulativeEstimateAmount / contractAmount) * 100 
    : 0

  return {
    contractAmount: contractAmountResult,
    currentEstimateAmount: currentEstimateAmountResult,
    cumulativeEstimateAmount,
    totalCumulativeAmount,
    priceIndexAdjustment: priceIndexAdjustmentResult,
    deductions: deductionsResult,
    retentionAmount,
    advancePaymentDeduction: advancePaymentDeductionResult,
    payableAmount,
    completionPercentage
  }
}

/**
 * 格式化金額顯示（加入千分位逗號）
 * @param amount 金額
 * @returns 格式化後的金額字串
 */
export function formatEstimateAmount(amount: number): string {
  return new Intl.NumberFormat('zh-TW').format(amount)
}

/**
 * 格式化百分比顯示
 * @param percentage 百分比數值
 * @param decimals 小數位數（預設 2 位）
 * @returns 格式化後的百分比字串
 */
export function formatEstimatePercentage(percentage: number, decimals: number = 2): string {
  return `${percentage.toFixed(decimals)}%`
}

/**
 * 驗證估驗計算參數
 * @param params 計算參數
 * @returns 驗證結果
 */
export function validateEstimateParams(params: EstimateCalculationParams): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (params.contractAmount <= 0) {
    errors.push('契約金額必須大於 0')
  }

  if (params.currentEstimateAmount <= 0) {
    errors.push('本次估驗計價款必須大於 0')
  }

  if (params.currentEstimateAmount > params.contractAmount) {
    errors.push('本次估驗計價款不能超過契約金額')
  }

  if (params.previousCumulativeAmount && params.previousCumulativeAmount < 0) {
    errors.push('前期累計金額不能為負數')
  }

  if (params.retentionRate && (params.retentionRate < 0 || params.retentionRate > 1)) {
    errors.push('保留款比例必須在 0-100% 之間')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 計算範例：第一次估驗，請款金額 100 萬元，總工程金額 1,000 萬元
 */
export function getExampleCalculation(): EstimateCalculationResult {
  return calculateEstimateDetails({
    contractAmount: 10000000, // 1,000 萬元
    currentEstimateAmount: 1000000, // 100 萬元
    retentionRate: 0.05 // 5%
  })
}
