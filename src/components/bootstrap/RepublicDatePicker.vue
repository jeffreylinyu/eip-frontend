<template>
  <div class="republic-date-picker">
    <VueDatePicker
      v-model="internalDate"
      :disabled="disabled"
      :class="inputClass"
      :state="showError ? false : null"
      locale="zh-TW"
      :format="formatDisplayDate"
      :preview-format="formatDisplayDate"
      :enable-time-picker="false"
      auto-apply
      :clearable="true"
      placeholder="請選擇日期"
      :year-range="yearRange"
      :week-start="1"
      teleport="body"
      @update:model-value="handleDateUpdate"
      @blur="handleBlur"
      @focus="handleFocus"
    >
      <!-- 自訂年份選擇器的每個選項 - 根據 useRepublicYear 決定顯示格式 -->
      <template #year="{ value }" v-if="useRepublicYear">
        民國{{ toRepublicYear(value) }}
      </template>
      
      <!-- 自訂年份選擇器覆蓋層 - 根據 useRepublicYear 決定顯示格式 -->
      <template #year-overlay-value="{ text }" v-if="useRepublicYear">
        民國{{ toRepublicYear(parseInt(text)) }}
      </template>
      
      <!-- 自訂星期標題 - 移除「週」字 -->
      <template #calendar-header="{ index, day }">
        {{ getWeekDayName(index) }}
      </template>
      
      <!-- 自訂輸入框圖示 -->
      <template #input-icon>
        <i class="fa fa-calendar-alt"></i>
      </template>
    </VueDatePicker>
    
    <!-- 錯誤訊息 -->
    <div v-if="showError && errorMessage" class="invalid-feedback d-block">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { toRepublicYear } from '@/utils/format'

interface Props {
  modelValue?: string
  inputClass?: string
  disabled?: boolean
  showError?: boolean
  errorMessage?: string
  minDate?: string | Date
  maxDate?: string | Date
  useRepublicYear?: boolean // 新增：是否使用民國年
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  inputClass: 'form-control',
  disabled: false,
  showError: false,
  errorMessage: '',
  minDate: undefined,
  maxDate: undefined,
  useRepublicYear: true // 預設使用民國年
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
  'focus': []
}>()

// 內部日期值 (Date 對象)
const internalDate = ref<Date | null>(null)

// 年份範圍 (西元年，用於內部計算)
const yearRange = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 20, currentYear + 50] // 前後各20年
})

// 格式化顯示日期 - 根據 useRepublicYear 決定格式
const formatDisplayDate = (date: Date): string => {
  if (!date) return ''
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  if (props.useRepublicYear) {
    const republicYear = toRepublicYear(year)
    return `民國${republicYear}年${month}月${day}日`
  } else {
    return `${year}年${month}月${day}日`
  }
}

// 處理日期更新
const handleDateUpdate = (date: Date | null) => {
  if (date) {
    // 轉換為 YYYY-MM-DD 格式
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    emit('update:modelValue', dateString)
  } else {
    emit('update:modelValue', '')
  }
}

// 處理失焦事件
const handleBlur = () => {
  emit('blur')
}

// 處理聚焦事件
const handleFocus = () => {
  emit('focus')
}

// 自訂星期名稱 - 移除「週」字
const getWeekDayName = (index: number): string => {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日']
  return weekDays[index] || ''
}

// 監聽 modelValue 變化，轉換為 Date 對象
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    try {
      internalDate.value = new Date(newValue)
    } catch {
      internalDate.value = null
    }
  } else {
    internalDate.value = null
  }
}, { immediate: true })
</script>

<style scoped>
.republic-date-picker {
  position: relative;
  max-width: 240px; /* 設定最大寬度 */
}

/* 覆蓋 VueDatePicker 的 CSS 變數以符合專案主題 */
.republic-date-picker {
  --dp-border-color: var(--bs-border-color);
  --dp-border-color-hover: var(--bs-theme);
  --dp-border-color-focus: var(--bs-theme);
  --dp-background-color: var(--bs-body-bg);
  --dp-text-color: var(--bs-body-color);
  --dp-primary-color: var(--bs-theme);
  --dp-primary-text-color: var(--bs-white);
  --dp-hover-color: rgba(var(--bs-theme-rgb), 0.1);
  --dp-hover-text-color: var(--bs-theme);
  --dp-icon-color: var(--bs-secondary);
  --dp-danger-color: var(--bs-danger);
  --dp-border-radius: 0.375rem;
  --dp-input-padding: 0.375rem 0.75rem;
  --dp-input-icon-padding: 0.25rem;
  --dp-font-size: 1rem;
  --dp-menu-border-color: var(--bs-border-color);
  --dp-menu-min-width: 280px;
  --dp-secondary-color: var(--bs-secondary);
  --dp-disabled-color: var(--bs-secondary-bg);
  --dp-disabled-color-text: var(--bs-secondary);
}

/* 確保顏色正確顯示的樣式覆蓋 - 輸入框部分 */
.republic-date-picker :deep(.dp__main) {
  height: 35px !important;
  min-height: 35px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.republic-date-picker :deep(.dp__input_wrap) {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.republic-date-picker :deep(.dp__input) {
  color: var(--bs-body-color) !important;
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  height: 100% !important;
  text-align: center !important;
}

.republic-date-picker :deep(.dp__input:hover) {
  border: none !important;
  box-shadow: none !important;
}

.republic-date-picker :deep(.dp__input:focus) {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

/* 輸入框圖示 */
.republic-date-picker :deep(.dp__input_icon) {
  color: var(--bs-secondary) !important;
}

.republic-date-picker :deep(.dp--clear-btn) {
  color: var(--bs-secondary) !important;
}

.republic-date-picker :deep(.dp--clear-btn:hover) {
  color: var(--bs-danger) !important;
}
</style>

<style>
/* 全局樣式 - 用於 teleported 到 body 的下拉選單 */
/* 下拉選單容器 */
.dp__menu {
  background-color: var(--bs-body-bg) !important;
  border-color: var(--bs-border-color) !important;
  color: var(--bs-body-color) !important;
  z-index: 9999 !important; /* 確保在 Modal 之上 */
}

/* 日曆項目 */
.dp__calendar_item {
  color: var(--bs-body-color) !important;
}

.dp__cell_inner {
  color: var(--bs-body-color) !important;
}

.dp__cell_inner:hover {
  background-color: rgba(var(--bs-theme-rgb), 0.1) !important;
  color: var(--bs-theme) !important;
}

.dp__active_date {
  background-color: var(--bs-theme) !important;
  color: var(--bs-white) !important;
}

.dp__today {
  border-color: var(--bs-theme) !important;
  color: var(--bs-theme) !important;
}

/* 年份/月份選擇覆蓋層 */
.dp__overlay {
  background-color: var(--bs-body-bg) !important;
  color: var(--bs-body-color) !important;
}

.dp__overlay_cell {
  color: var(--bs-body-color) !important;
}

.dp__overlay_cell:hover {
  background-color: rgba(var(--bs-theme-rgb), 0.1) !important;
  color: var(--bs-theme) !important;
}

.dp__overlay_cell_active {
  background-color: var(--bs-theme) !important;
  color: var(--bs-white) !important;
}

/* 年份、月份、星期幾的文字顏色 */
.dp__month_year_row {
  color: var(--bs-body-color) !important;
}

.dp__month_year_select {
  color: var(--bs-body-color) !important;
}

.dp--year-select {
  color: var(--bs-body-color) !important;
}

.dp__calendar_header {
  color: var(--bs-body-color) !important;
}

.dp__calendar_header_item {
  color: var(--bs-body-color) !important;
}

.dp__month_year_wrap {
  color: var(--bs-body-color) !important;
}

/* 導航按鈕 */
.dp__inner_nav {
  color: var(--bs-secondary) !important;
}

.dp__inner_nav:hover {
  background-color: rgba(var(--bs-theme-rgb), 0.1) !important;
  color: var(--bs-theme) !important;
}

/* 操作按鈕 */
.dp__action_button {
  color: var(--bs-body-color) !important;
  border-color: var(--bs-border-color) !important;
}

.dp__action_button:hover {
  border-color: var(--bs-theme) !important;
}

.dp__action_select {
  background-color: var(--bs-theme) !important;
  color: var(--bs-white) !important;
}

.dp__action_select:hover {
  background-color: var(--bs-theme) !important;
}
</style>
