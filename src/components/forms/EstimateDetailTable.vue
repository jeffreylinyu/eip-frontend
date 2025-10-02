<template>
  <div class="estimate-detail-table">
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="fa fa-calculator me-2"></i>
          估驗詳細表
        </h5>
      </div>
      <div class="card-body">
        <!-- 輸入參數區域 -->
        <div class="row mb-4">
          <div class="col-md-6">
            <label class="form-label">契約金額（A10）</label>
            <div class="input-group">
              <input 
                v-model="contractAmountDisplay" 
                type="text" 
                class="form-control"
                placeholder="請輸入契約金額"
                @input="updateContractAmount"
                @keypress="validateNumberInput"
              >
              <span class="input-group-text">元</span>
            </div>
          </div>
          <div class="col-md-6">
            <label class="form-label">本次估驗計價款（C1）</label>
            <div class="input-group">
              <input 
                v-model="currentEstimateAmountDisplay" 
                type="text" 
                class="form-control"
                placeholder="請輸入本次估驗金額"
                @input="updateCurrentEstimateAmount"
                @keypress="validateNumberInput"
              >
              <span class="input-group-text">元</span>
            </div>
          </div>
        </div>

        <div class="row mb-4">
          <div class="col-md-4">
            <label class="form-label">前期累計金額</label>
            <div class="input-group">
              <input 
                v-model="previousCumulativeAmountDisplay" 
                type="text" 
                class="form-control"
                placeholder="0"
                @input="updatePreviousCumulativeAmount"
                @keypress="validateNumberInput"
              >
              <span class="input-group-text">元</span>
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label">物價指數調整款（D）</label>
            <div class="input-group">
              <input 
                v-model="priceIndexAdjustmentDisplay" 
                type="text" 
                class="form-control"
                placeholder="0"
                @input="updatePriceIndexAdjustment"
                @keypress="validateNumberInput"
              >
              <span class="input-group-text">元</span>
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label">扣款（E）</label>
            <div class="input-group">
              <input 
                v-model="deductionsDisplay" 
                type="text" 
                class="form-control"
                placeholder="0"
                @input="updateDeductions"
                @keypress="validateNumberInput"
              >
              <span class="input-group-text">元</span>
            </div>
          </div>
        </div>

        <div class="row mb-4">
          <div class="col-md-4">
            <label class="form-label">保留款比例</label>
            <div class="input-group">
              <input 
                v-model.number="retentionRatePercent" 
                type="number" 
                class="form-control"
                placeholder="5"
                @input="updateRetentionRate"
              >
              <span class="input-group-text">%</span>
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label">扣回預付款（G）</label>
            <div class="input-group">
              <input 
                v-model="advancePaymentDeductionDisplay" 
                type="text" 
                class="form-control"
                placeholder="0"
                @input="updateAdvancePaymentDeduction"
                @keypress="validateNumberInput"
              >
              <span class="input-group-text">元</span>
            </div>
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <button 
              @click="loadExample" 
              class="btn btn-outline-secondary w-100"
            >
              <i class="fa fa-lightbulb me-1"></i>
              載入範例
            </button>
          </div>
        </div>

        <!-- 計算結果表格 -->
        <div class="table-responsive">
          <table class="table table-bordered table-hover">
            <thead class="table-light">
              <tr>
                <th width="30%">項目</th>
                <th width="25%">代號</th>
                <th width="25%">計算公式</th>
                <th width="20%">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>契約金額</strong></td>
                <td>A10</td>
                <td>工程契約總金額</td>
                <td class="text-end">{{ formatAmount(result.contractAmount) }}</td>
              </tr>
              <tr>
                <td><strong>本次估驗計價款</strong></td>
                <td>C1</td>
                <td>本次請款金額</td>
                <td class="text-end">{{ formatAmount(result.currentEstimateAmount) }}</td>
              </tr>
              <tr>
                <td><strong>累計估驗計價款</strong></td>
                <td>C2</td>
                <td>本次估驗計價款（C1）</td>
                <td class="text-end">{{ formatAmount(result.cumulativeEstimateAmount) }}</td>
              </tr>
              <tr>
                <td><strong>截至本次累計</strong></td>
                <td>C3</td>
                <td>累計估驗計價款（C2）</td>
                <td class="text-end">{{ formatAmount(result.totalCumulativeAmount) }}</td>
              </tr>
              <tr>
                <td><strong>物價指數調整款</strong></td>
                <td>D</td>
                <td>物價調整金額</td>
                <td class="text-end">{{ formatAmount(result.priceIndexAdjustment) }}</td>
              </tr>
              <tr>
                <td><strong>扣款</strong></td>
                <td>E</td>
                <td>罰款或扣減金額</td>
                <td class="text-end">{{ formatAmount(result.deductions) }}</td>
              </tr>
              <tr>
                <td><strong>保留款</strong></td>
                <td>F</td>
                <td>本次估驗計價款（C1） × {{ (retentionRatePercent) }}%</td>
                <td class="text-end">{{ formatAmount(result.retentionAmount) }}</td>
              </tr>
              <tr>
                <td><strong>扣回預付款</strong></td>
                <td>G</td>
                <td>預付款扣回金額</td>
                <td class="text-end">{{ formatAmount(result.advancePaymentDeduction) }}</td>
              </tr>
              <tr class="table-success">
                <td><strong>應付金額</strong></td>
                <td>H1</td>
                <td>C1 + D - E - F - G</td>
                <td class="text-end"><strong>{{ formatAmount(result.payableAmount) }}</strong></td>
              </tr>
              <tr class="table-info">
                <td><strong>完成百分比</strong></td>
                <td>B1</td>
                <td>C2 ÷ A10 × 100%</td>
                <td class="text-end"><strong>{{ formatPercentage(result.completionPercentage) }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 驗證錯誤訊息 -->
        <div v-if="validation.errors.length > 0" class="alert alert-danger mt-3">
          <h6><i class="fa fa-exclamation-triangle me-2"></i>輸入驗證錯誤：</h6>
          <ul class="mb-0">
            <li v-for="error in validation.errors" :key="error">{{ error }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { 
  calculateEstimateDetails, 
  formatEstimateAmount, 
  formatEstimatePercentage,
  validateEstimateParams,
  getExampleCalculation,
  type EstimateCalculationParams,
  type EstimateCalculationResult
} from '@/utils/estimateCalculation'

// 計算參數
const params = reactive<EstimateCalculationParams>({
  contractAmount: 10000000, // 1,000 萬元
  currentEstimateAmount: 1000000, // 100 萬元
  previousCumulativeAmount: 0,
  priceIndexAdjustment: 0,
  deductions: 0,
  retentionRate: 0.05, // 5%
  advancePaymentDeduction: 0
})

// 計算結果
const result = ref<EstimateCalculationResult>({} as EstimateCalculationResult)

// 驗證結果
const validation = ref({ isValid: true, errors: [] as string[] })

// 顯示用的格式化值
const contractAmountDisplay = ref('10,000,000')
const currentEstimateAmountDisplay = ref('1,000,000')
const previousCumulativeAmountDisplay = ref('0')
const priceIndexAdjustmentDisplay = ref('0')
const deductionsDisplay = ref('0')
const advancePaymentDeductionDisplay = ref('0')

// 保留款百分比（用於顯示）
const retentionRatePercent = computed({
  get: () => (params.retentionRate || 0) * 100,
  set: (value: number) => {
    params.retentionRate = value / 100
  }
})

// 格式化金額
const formatAmount = (amount: number): string => {
  return formatEstimateAmount(amount)
}

// 格式化百分比
const formatPercentage = (percentage: number): string => {
  return formatEstimatePercentage(percentage, 2)
}

// 將字串轉換為數字（移除逗號）
const parseNumberFromDisplay = (displayValue: string): number => {
  const cleanValue = displayValue.replace(/,/g, '')
  const num = parseFloat(cleanValue)
  return isNaN(num) ? 0 : num
}

// 將數字轉換為顯示格式（加入逗號）
const formatNumberForDisplay = (value: number): string => {
  return formatEstimateAmount(value)
}

// 驗證輸入是否為數字
const validateNumberInput = (event: KeyboardEvent) => {
  const char = String.fromCharCode(event.which)
  if (!/[0-9]/.test(char) && char !== ',') {
    event.preventDefault()
  }
}

// 更新契約金額
const updateContractAmount = () => {
  params.contractAmount = parseNumberFromDisplay(contractAmountDisplay.value)
  recalculate()
}

// 更新本次估驗計價款
const updateCurrentEstimateAmount = () => {
  params.currentEstimateAmount = parseNumberFromDisplay(currentEstimateAmountDisplay.value)
  recalculate()
}

// 更新前期累計金額
const updatePreviousCumulativeAmount = () => {
  params.previousCumulativeAmount = parseNumberFromDisplay(previousCumulativeAmountDisplay.value)
  recalculate()
}

// 更新物價指數調整款
const updatePriceIndexAdjustment = () => {
  params.priceIndexAdjustment = parseNumberFromDisplay(priceIndexAdjustmentDisplay.value)
  recalculate()
}

// 更新扣款
const updateDeductions = () => {
  params.deductions = parseNumberFromDisplay(deductionsDisplay.value)
  recalculate()
}

// 更新扣回預付款
const updateAdvancePaymentDeduction = () => {
  params.advancePaymentDeduction = parseNumberFromDisplay(advancePaymentDeductionDisplay.value)
  recalculate()
}

// 更新保留款比例
const updateRetentionRate = () => {
  recalculate()
}

// 重新計算
const recalculate = () => {
  validation.value = validateEstimateParams(params)
  if (validation.value.isValid) {
    result.value = calculateEstimateDetails(params)
  }
}

// 載入範例
const loadExample = () => {
  const example = getExampleCalculation()
  params.contractAmount = example.contractAmount
  params.currentEstimateAmount = example.currentEstimateAmount
  params.previousCumulativeAmount = 0
  params.priceIndexAdjustment = 0
  params.deductions = 0
  params.retentionRate = 0.05
  params.advancePaymentDeduction = 0
  
  // 更新顯示值
  contractAmountDisplay.value = formatNumberForDisplay(params.contractAmount)
  currentEstimateAmountDisplay.value = formatNumberForDisplay(params.currentEstimateAmount)
  previousCumulativeAmountDisplay.value = formatNumberForDisplay(params.previousCumulativeAmount)
  priceIndexAdjustmentDisplay.value = formatNumberForDisplay(params.priceIndexAdjustment)
  deductionsDisplay.value = formatNumberForDisplay(params.deductions)
  advancePaymentDeductionDisplay.value = formatNumberForDisplay(params.advancePaymentDeduction)
  
  recalculate()
}

// 初始化
onMounted(() => {
  recalculate()
})
</script>

<style scoped>
.estimate-detail-table .table th {
  background-color: var(--bs-light);
  font-weight: 600;
}

.estimate-detail-table .table-success td {
  background-color: rgba(var(--bs-success-rgb), 0.1);
  font-weight: 600;
}

.estimate-detail-table .table-info td {
  background-color: rgba(var(--bs-info-rgb), 0.1);
  font-weight: 600;
}

.estimate-detail-table .form-label {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.estimate-detail-table .input-group-text {
  background-color: var(--bs-light);
  border-color: var(--bs-border-color);
}

/* 隱藏數字輸入框的上下箭頭 */
.estimate-detail-table input[type="text"] {
  -moz-appearance: textfield;
}

.estimate-detail-table input[type="text"]::-webkit-outer-spin-button,
.estimate-detail-table input[type="text"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* 確保輸入框樣式一致 */
.estimate-detail-table .form-control {
  text-align: right;
  font-family: 'Courier New', monospace;
  font-weight: 500;
}
</style>
