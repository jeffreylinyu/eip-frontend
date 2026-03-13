<template>
  <div class="republic-date-picker" :class="{ 'is-disabled': disabled }" ref="containerRef">
    <VueDatePicker
      v-model="internalDate"
      :disabled="disabled"
      :class="[inputClass, { 'hide-icon': hideIcon }]"
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
      :disabled-dates="checkIsHoliday"
      :day-class="getDayClass"
      @update-month-year="handleMonthYearChange"
      @open="handleOpen"
      @update:model-value="handleDateUpdate"
      @blur="handleBlur"
      @focus="handleFocus"
    >
      <!-- 自訂年份選擇器的每個選項 -->
      <template #year="{ value }" v-if="useRepublicYear">
        民國{{ toRepublicYear(value) }}
      </template>
      
      <!-- 自訂年份選擇器覆蓋層 -->
      <template #year-overlay-value="{ text }" v-if="useRepublicYear">
        民國{{ toRepublicYear(parseInt(text)) }}
      </template>
      
      <!-- 自訂星期標題 -->
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
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { toRepublicYear } from '@/utils/format'
import { getCalendarEvents, type CalendarEvent } from '@/api/construction' 

interface Props {
  modelValue?: string
  inputClass?: string
  disabled?: boolean
  showError?: boolean
  errorMessage?: string
  minDate?: string | Date
  maxDate?: string | Date
  useRepublicYear?: boolean
  id?: string                      // 新增：input 元素的 id 屬性
  
  // --- 新增 Props ---
  disableHolidays?: boolean        // 是否啟用假日禁用功能
  constructionId?: number | string // 若有傳入，則查詢該工程專屬假日；若無則查通用
  hideIcon?: boolean              // 是否隱藏輸入框圖示
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  inputClass: 'form-control',
  disabled: false,
  showError: false,
  errorMessage: '',
  minDate: undefined,
  maxDate: undefined,
  useRepublicYear: true,
  id: undefined,
  
  // --- 新增預設值 ---
  disableHolidays: false,
  constructionId: undefined,
  hideIcon: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
  'focus': []
}>()

// 內部日期值 (Date 對象)
const internalDate = ref<Date | null>(null)

// 容器引用（用於設置 input 元素的 id）
const containerRef = ref<HTMLElement | null>(null)

// --- 新增：假日處理邏輯 Start ---
const holidaySet = ref(new Set<string>())   // 儲存 "YYYY-MM-DD" 字串
const loadedYears = ref(new Set<number>())  // 儲存已載入的年份 (快取用)
const isLoading = ref(false)

// 輔助：將 Date 轉為 YYYY-MM-DD (處理時區問題)
const formatDateKey = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 核心：判斷某天是否禁用 (VueDatePicker 會對每一天呼叫此函式)
const checkIsHoliday = (date: Date): boolean => {
  if (!props.disableHolidays) return false
  const dateStr = formatDateKey(date)
  return holidaySet.value.has(dateStr)
}

// 樣式：給假日加上特殊 class (即便禁用了，也可以讓它顯示紅字)
const getDayClass = (date: Date) => {
  if (!props.disableHolidays) return ''
  const dateStr = formatDateKey(date)
  return holidaySet.value.has(dateStr) ? 'is-holiday-cell' : ''
}

// API：撈取特定年份的假日資料
const fetchHolidaysForYear = async (year: number) => {
  if (!props.disableHolidays) return
  
  // 快取檢查：如果該年份已經抓過，就不再發 API
  if (loadedYears.value.has(year)) return

  // 如果沒有 constructionId，無法載入專案特定的假日，直接返回
  if (!props.constructionId) {
    console.warn('[RepublicDatePicker] 無法載入假日：缺少 constructionId')
    return
  }

  try {
    isLoading.value = true
    const start = `${year}-01-01`
    const end = `${year}-12-31`
    
    // 調用實際的 API
    const events: CalendarEvent[] = await getCalendarEvents(
      String(props.constructionId),
      start,
      end
    )

    // 將資料 "追加" 到 Set 中 (保留其他年份的資料)
    // 只添加 isHoliday 為 true 的日期
    events.forEach((event: CalendarEvent) => {
      if (event.isHoliday) {
        holidaySet.value.add(event.date)
      }
    })
    
    // 標記該年份已完成載入
    loadedYears.value.add(year)
    
  } catch (e) {
    console.error(`[RepublicDatePicker] 載入 ${year} 年假日資料失敗:`, e)
    // 載入失敗時不標記為已載入，以便下次重試
  } finally {
    isLoading.value = false
  }
}

// 初始化邏輯
const initHolidays = () => {
  if (!props.disableHolidays) return

  const currentYear = new Date().getFullYear()
  
  // 優先載入 modelValue 所在的年份 (若有值)
  let targetYear = currentYear
  if (props.modelValue) {
    targetYear = new Date(props.modelValue).getFullYear()
  }

  // 預載策略：目標年份 + 明年
  fetchHolidaysForYear(targetYear)
  fetchHolidaysForYear(targetYear + 1)
  
  // 如果目標年份不是今年，順便把今年也載入
  if (targetYear !== currentYear) {
    fetchHolidaysForYear(currentYear)
  }
}

// 事件：當用戶切換月曆的年月時
const handleMonthYearChange = (instance: { instance: number, month: number, year: number }) => {
  fetchHolidaysForYear(instance.year)
}

// 事件：當打開選單時，確保當前年份資料已載入
const handleOpen = () => {
  if (internalDate.value) {
    fetchHolidaysForYear(internalDate.value.getFullYear())
  } else {
    fetchHolidaysForYear(new Date().getFullYear())
  }
}

// Watch：當 constructionId 改變時 (切換專案)，清空快取重抓
watch(() => props.constructionId, () => {
  holidaySet.value.clear()
  loadedYears.value.clear()
  initHolidays()
})

// 設置 input 元素的 id
const setInputId = () => {
  if (props.id && containerRef.value) {
    nextTick(() => {
      const inputElement = containerRef.value?.querySelector('.dp__input') as HTMLInputElement
      if (inputElement) {
        inputElement.id = props.id!
      }
    })
  }
}

// Lifecycle
onMounted(() => {
  initHolidays()
  setInputId()
})

// 監聽 id 變化
watch(() => props.id, () => {
  setInputId()
})
// --- 新增：假日處理邏輯 End ---


// 年份範圍 (西元年，用於內部計算)
const yearRange = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 20, currentYear + 50] // 前後各20年
})

// 格式化顯示日期
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
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    
    emit('update:modelValue', dateString)
  } else {
    emit('update:modelValue', '')
  }
}

const handleBlur = () => emit('blur')
const handleFocus = () => emit('focus')

const getWeekDayName = (index: number): string => {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日']
  return weekDays[index] || ''
}

// 監聽 modelValue 變化
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

/* 手機版樣式 */
@media (max-width: 767.98px) {
  .republic-date-picker {
    max-width: 100% !important;
    width: 100% !important;
  }
  
  .republic-date-picker :deep(.dp__input_wrap) {
    padding-left: 0.75rem !important;
    padding-right: 0 !important;
    justify-content: flex-start !important;
  }
  
  .republic-date-picker :deep(.dp__input) {
    text-align: left !important;
    padding-left: 0 !important;
    padding-right: 40px !important;
  }
  
  .republic-date-picker :deep(.hide-icon .dp__input) {
    padding-right: 12px !important; /* Reset padding when icon is hidden */
  }

  .republic-date-picker :deep(.dp__input_icon) {
    right: 12px !important;
  }
}

/* CSS 變數覆蓋 */
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
  position: relative !important;
}

.republic-date-picker :deep(.dp__input_wrap) {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
}

.republic-date-picker :deep(.dp__input) {
  color: var(--bs-body-color) !important;
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  height: 100% !important;
  text-align: center !important;
  flex: 1 !important;
  min-width: 0 !important;
  padding-right: 40px !important; /* 為圖示預留空間 */
  padding-left: 0 !important;
}

.republic-date-picker :deep(.hide-icon .dp__input) {
  padding-right: 0 !important; /* Reset padding when icon is hidden */
  padding-left: 10px !important;
  text-align: left !important;
}

.republic-date-picker :deep(.hide-icon .dp__input_icon) {
  display: none !important;
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
  position: absolute !important;
  right: 12px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  pointer-events: none !important;
  z-index: 1 !important;
  flex-shrink: 0 !important;
  width: auto !important;
  height: auto !important;
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
.dp__menu {
  background-color: var(--bs-body-bg) !important;
  border-color: var(--bs-border-color) !important;
  color: var(--bs-body-color) !important;
  z-index: 9999 !important;
}

.dp__calendar_item, .dp__cell_inner, .dp__month_year_row, 
.dp__month_year_select, .dp--year-select, .dp__calendar_header, 
.dp__calendar_header_item, .dp__month_year_wrap, .dp__overlay_cell,
.dp__overlay {
  color: var(--bs-body-color) !important;
}

.dp__cell_inner:hover, .dp__inner_nav:hover, 
.dp__overlay_cell:hover {
  background-color: rgba(var(--bs-theme-rgb), 0.1) !important;
  color: var(--bs-theme) !important;
}

.dp__active_date, .dp__overlay_cell_active, .dp__action_select, 
.dp__action_select:hover {
  background-color: var(--bs-theme) !important;
  color: var(--bs-white) !important;
}

.dp__today {
  border-color: var(--bs-theme) !important;
  color: var(--bs-theme) !important;
}

/* 修正：選到「今天」時，避免綠底綠字（.dp__today 覆蓋了 active 的白字） */
.dp__active_date.dp__today {
  color: var(--bs-white) !important;
}

.dp__overlay {
  background-color: var(--bs-body-bg) !important;
}

.dp__inner_nav {
  color: var(--bs-secondary) !important;
}

.dp__action_button {
  color: var(--bs-body-color) !important;
  border-color: var(--bs-border-color) !important;
}

.dp__action_button:hover {
  border-color: var(--bs-theme) !important;
}

/* --- 新增：假日紅字樣式 --- */
/* 注意：.is-holiday-cell 是透過 :day-class 注入的 
   VueDatePicker 會自動在這些 class 後面加上 .dp__cell_disabled (如果被 disable 的話)
*/

/* 1. 基本假日樣式 (紅字) */
.is-holiday-cell {
  color: var(--bs-danger) !important;
  font-weight: bold;
}

/* 2. 當假日被禁用時的樣式 (紅字 + 淺紅背景 + 禁止游標) */
.dp__cell_disabled.is-holiday-cell {
  background-color: rgba(var(--bs-danger-rgb), 0.1) !important;
  color: var(--bs-danger) !important;
  opacity: 0.8 !important; /* 讓文字清楚一點 */
  text-decoration: none !important;
  cursor: not-allowed !important;
}

/* 3. 確保禁用狀態下的 Hover 不會變色 */
.dp__cell_disabled.is-holiday-cell:hover {
  background-color: rgba(var(--bs-danger-rgb), 0.1) !important;
  color: var(--bs-danger) !important;
}
</style>