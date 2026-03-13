<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import { toRepublicYear } from '@/utils/format'
import { getDailyReport, type DailyReportDetailResponse } from '@/api/dailyReport'
import { 
  getCalendarEvents, 
  getCalendarSettings,
  updateCalendarSettings,
  getCalendarDocuments,
  getCalendarExtensionDates,
  type CalendarEvent as ApiCalendarEvent,
  type CalendarDocument,
  type CalendarExtensionDate,
  type CalendarSettings
} from '@/api/construction'
import { useRouter } from 'vue-router'
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective'

const workspaceStore = useWorkspaceStore()
const router = useRouter()
const { isSupervisory, viewType } = useViewPerspective()
const isSupervisoryUser = computed(() => isSupervisory.value)

const calendarOwnerType = ref<string>('SUPERVISORY')
/** 營造使用者無 Tab，依視角用 CONTRACTOR；監造使用者依所選 Tab（工程端/監造公司） */
const effectiveCalendarOwnerType = computed(() =>
  isSupervisoryUser.value ? calendarOwnerType.value : (viewType.value as string)
)

// 狀態
const currentDate = ref(new Date())
const selectedDate = ref<Date | null>(new Date())
const showYearMonthPicker = ref(false)
const dailyReport = ref<DailyReportDetailResponse | null>(null)
const isLoadingDailyReport = ref(false)
const calendarEvents = ref<ApiCalendarEvent[]>([]) // 從後端獲取的行事曆事件
const isLoadingCalendarEvents = ref(false)
const calendarDocuments = ref<CalendarDocument[]>([]) // 從後端獲取的公文發文日期資訊

// 政府假日自動套用相關狀態
const govHolidayEnabled = ref(true)
const isTogglingGovHoliday = ref(false)
const showGovHolidayInfo = ref(false)

// 展延免計日期資料
const extensionDates = ref<CalendarExtensionDate[]>([])

// 計算屬性
const currentMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const republicYear = toRepublicYear(year)
  const month = currentDate.value.toLocaleDateString('zh-TW', { 
    month: 'long' 
  })
  return `民國${republicYear}年${month}`
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  // 獲取當月第一天和最後一天
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // 獲取當月第一天是星期幾（0=星期日）
  const firstDayWeek = firstDay.getDay()
  
  // 生成日曆天數
  const days = []
  
  // 添加上個月的天數（填充空白）
  for (let i = firstDayWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    const holidayInfo = getHolidayInfo(date)
    days.push({
      date: date.getDate(),
      fullDate: new Date(date),
      isCurrentMonth: false,
      isToday: false,
      isHoliday: holidayInfo.isHoliday,
      holidayTitle: holidayInfo.title
    })
  }
  
  // 添加當月的天數
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    const holidayInfo = getHolidayInfo(date)
    
    days.push({
      date: day,
      fullDate: date,
      isCurrentMonth: true,
      isToday,
      isHoliday: holidayInfo.isHoliday,
      holidayTitle: holidayInfo.title
    })
  }
  
  // 計算實際需要的週數（動態計算，不固定週數，可能是4、5或6週）
  const totalDays = days.length
  const weeksNeeded = Math.ceil(totalDays / 7)
  const targetDays = weeksNeeded * 7
  const remainingDays = targetDays - totalDays
  
  // 添加下個月的天數（填充空白）
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day)
    const holidayInfo = getHolidayInfo(date)
    days.push({
      date: day,
      fullDate: date,
      isCurrentMonth: false,
      isToday: false,
      isHoliday: holidayInfo.isHoliday,
      holidayTitle: holidayInfo.title
    })
  }
  
  return days
})

// 選中日期的資訊
const selectedDateInfo = computed(() => {
  if (!selectedDate.value) return null
  
  const date = selectedDate.value
  const year = date.getFullYear()
  const republicYear = toRepublicYear(year)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dayOfWeek = date.getDay()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const holidayInfo = getHolidayInfo(date)
  
  return {
    date: date,
    dateString: `民國${republicYear}年${month}月${day}日`,
    weekDay: weekDays[dayOfWeek],
    isHoliday: holidayInfo.isHoliday,
    holidayTitle: holidayInfo.title
  }
})

// 格式化日期為 YYYY-MM-DD（使用本地時間，避免時區問題）
const formatDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 根據日期從後端事件中獲取假日資訊
const getHolidayInfo = (date: Date): { isHoliday: boolean; title: string | null } => {
  const dateStr = formatDateString(date)
  const event = calendarEvents.value.find(e => e.date === dateStr)
  if (event) {
    // 過濾掉"週六"和"週日"的 title
    let title = event.title || null
    if (title === '週六' || title === '週日') {
      title = null
    }
    return {
      isHoliday: event.isHoliday,
      title: title
    }
  }
  // 如果後端沒有提供該日期的資訊，預設使用週六週日判斷（作為後備）
  const dayOfWeek = date.getDay()
  return {
    isHoliday: dayOfWeek === 0 || dayOfWeek === 6,
    title: null
  }
}

// 取得某日期的公文數量（用於日曆格子內提示）
const getDocumentCountForDate = (date: Date): number => {
  const dateStr = formatDateString(date)
  return calendarDocuments.value.filter(d => d.issueDate === dateStr).length
}

// 取得選中日期的公文列表
const selectedDateDocuments = computed(() => {
  if (!selectedDate.value) return []
  const dateStr = formatDateString(selectedDate.value)
  return calendarDocuments.value.filter(d => d.issueDate === dateStr)
})

// 取得選中日期的展延免計日列表
const selectedDateExtensions = computed(() => {
  if (!selectedDate.value) return []
  const dateStr = formatDateString(selectedDate.value)
  return extensionDates.value.filter(d => d.date === dateStr)
})

// 載入行事曆事件
const loadCalendarEvents = async () => {
  if (!workspaceStore.currentProject?.id) {
    calendarEvents.value = []
    return
  }
  
  isLoadingCalendarEvents.value = true
  try {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    
    // 計算當月的第一天和最後一天
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 為了確保涵蓋所有可見的日期（包括上個月和下個月的部分日期），
    // 我們載入整個月的資料，以及前後各一週
    const startDate = new Date(year, month, 1)
    startDate.setDate(startDate.getDate() - 7) // 往前7天
    
    const endDate = new Date(year, month + 1, 0)
    endDate.setDate(endDate.getDate() + 7) // 往後7天
    
    const startDateStr = formatDateString(startDate)
    const endDateStr = formatDateString(endDate)
    
    const events = await getCalendarEvents(
      workspaceStore.currentProject.id,
      startDateStr,
      endDateStr,
      effectiveCalendarOwnerType.value
    )
    calendarEvents.value = events
  } catch (error) {
    console.error('載入行事曆事件失敗:', error)
    calendarEvents.value = []
  } finally {
    isLoadingCalendarEvents.value = false
  }
}

// 載入行事曆公文資訊
const loadCalendarDocuments = async () => {
  if (!workspaceStore.currentProject?.id) {
    calendarDocuments.value = []
    return
  }
  
  try {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    
    const startDate = new Date(year, month, 1)
    startDate.setDate(startDate.getDate() - 7)
    
    const endDate = new Date(year, month + 1, 0)
    endDate.setDate(endDate.getDate() + 7)
    
    const startDateStr = formatDateString(startDate)
    const endDateStr = formatDateString(endDate)
    
    const docs = await getCalendarDocuments(
      workspaceStore.currentProject.id,
      startDateStr,
      endDateStr
    )
    calendarDocuments.value = docs
  } catch (error) {
    console.error('載入行事曆公文資訊失敗:', error)
    calendarDocuments.value = []
  }
}

// 載入行事曆展延免計日期
const loadExtensionDates = async () => {
  if (!workspaceStore.currentProject?.id) {
    extensionDates.value = []
    return
  }
  
  try {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    
    const startDate = new Date(year, month, 1)
    startDate.setDate(startDate.getDate() - 7)
    
    const endDate = new Date(year, month + 1, 0)
    endDate.setDate(endDate.getDate() + 7)
    
    const startDateStr = formatDateString(startDate)
    const endDateStr = formatDateString(endDate)
    
    const dates = await getCalendarExtensionDates(
      workspaceStore.currentProject.id,
      startDateStr,
      endDateStr,
      effectiveCalendarOwnerType.value
    )
    extensionDates.value = dates
  } catch (error) {
    console.error('載入展延免計日期失敗:', error)
    extensionDates.value = []
  }
}

const loadCalendarSettings = async () => {
  if (!workspaceStore.currentProject?.id) {
    govHolidayEnabled.value = false
    return
  }
  
  try {
    const settings = await getCalendarSettings(workspaceStore.currentProject.id, effectiveCalendarOwnerType.value)
    govHolidayEnabled.value = settings.govHolidayEnabled
  } catch (error) {
    console.error('載入行事曆設定失敗:', error)
    govHolidayEnabled.value = false
  }
}

const toggleGovHoliday = async () => {
  if (!workspaceStore.currentProject?.id) {
    alert('請先選擇工程案')
    return
  }
  
  isTogglingGovHoliday.value = true
  const newValue = !govHolidayEnabled.value
  try {
    await updateCalendarSettings(workspaceStore.currentProject.id, {
      govHolidayEnabled: newValue
    }, effectiveCalendarOwnerType.value)
    govHolidayEnabled.value = newValue
    await loadCalendarEvents()
  } catch (error: any) {
    console.error('切換政府假日設定失敗:', error)
    alert(`設定失敗：${error?.response?.data?.message || error?.message || '未知錯誤'}`)
  } finally {
    isTogglingGovHoliday.value = false
  }
}

const switchCalendarOwnerType = (type: string) => {
  calendarOwnerType.value = type
  loadCalendarEvents()
  loadCalendarSettings()
  loadExtensionDates()
}

// 載入選中日期的施工日誌
const loadDailyReport = async () => {
  if (!selectedDate.value || !workspaceStore.currentProject) {
    dailyReport.value = null
    return
  }
  
  isLoadingDailyReport.value = true
  try {
    const dateStr = formatDateString(selectedDate.value) // YYYY-MM-DD（本地時間）
    const constructionId = workspaceStore.currentProject.id
    const report = await getDailyReport(constructionId, dateStr)
    dailyReport.value = report
  } catch (error: any) {
    // 如果沒有施工日誌（404），設為 null
    if (error?.response?.status === 404) {
      dailyReport.value = null
    } else {
      console.error('載入施工日誌失敗:', error)
      dailyReport.value = null
    }
  } finally {
    isLoadingDailyReport.value = false
  }
}

// 監聽選中日期變化，自動載入施工日誌
watch([selectedDate, () => workspaceStore.currentProject], () => {
  loadDailyReport()
}, { immediate: true })

// 監聽當前月份和工程案變化，自動載入行事曆事件、公文資訊、展延免計日
watch([currentDate, () => workspaceStore.currentProject], () => {
  loadCalendarEvents()
  loadCalendarDocuments()
  loadExtensionDates()
}, { immediate: true })

// 監聽工程案變化，載入行事曆設定
watch(() => workspaceStore.currentProject, () => {
  loadCalendarSettings()
}, { immediate: true })


// 跳轉到施工日誌頁面
const goToDailyReport = () => {
  if (!selectedDate.value || !workspaceStore.currentProject) {
    // 如果沒有選中日期，提示用戶
    alert('請先在日曆中選擇日期')
    return
  }
  
  const dateStr = formatDateString(selectedDate.value) // 使用本地時間格式化
  router.push({
    path: '/daily-report/overview',
    query: {
      constructionId: workspaceStore.currentProject.id,
      reportDate: dateStr
    }
  })
}

// 方法
const previousMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  )
}

const nextMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  )
}

// 年份和月份選擇相關
const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonthIndex = computed(() => currentDate.value.getMonth())
const republicYear = computed(() => toRepublicYear(currentYear.value))

// 生成年份列表（民國年，前後各10年）
const yearOptions = computed(() => {
  const years = []
  const current = currentYear.value
  for (let i = current - 10; i <= current + 10; i++) {
    years.push({
      western: i,
      republic: toRepublicYear(i)
    })
  }
  return years
})

// 月份列表
const monthOptions = [
  { value: 0, label: '一月' },
  { value: 1, label: '二月' },
  { value: 2, label: '三月' },
  { value: 3, label: '四月' },
  { value: 4, label: '五月' },
  { value: 5, label: '六月' },
  { value: 6, label: '七月' },
  { value: 7, label: '八月' },
  { value: 8, label: '九月' },
  { value: 9, label: '十月' },
  { value: 10, label: '十一月' },
  { value: 11, label: '十二月' }
]

const toggleYearMonthPicker = () => {
  showYearMonthPicker.value = !showYearMonthPicker.value
}

const selectYear = (year: number) => {
  currentDate.value = new Date(year, currentMonthIndex.value, 1)
  showYearMonthPicker.value = false
}

const selectMonth = (month: number) => {
  currentDate.value = new Date(currentYear.value, month, 1)
  showYearMonthPicker.value = false
}

const goToToday = () => {
  const today = new Date()
  currentDate.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = today
  showYearMonthPicker.value = false
}

const selectDate = (day: any) => {
  if (day && day.fullDate) {
    selectedDate.value = day.fullDate
    // 不再自動打開事件詳情，只選中日期
  }
}

// 點擊外部關閉選擇器
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (showYearMonthPicker.value && !target.closest('.calendar-nav')) {
    showYearMonthPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="calendar-widget">
    <!-- 視角切換 Tab（外層） -->
    <div v-if="isSupervisoryUser" class="calendar-owner-tabs mb-3">
      <ul class="nav nav-tabs cal-tabs mb-0">
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: calendarOwnerType === 'SUPERVISORY' }"
            href="javascript:;"
            @click="switchCalendarOwnerType('SUPERVISORY')"
          >
            <i class="fa fa-hard-hat me-1"></i>工程端
          </a>
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: calendarOwnerType === 'SUPERVISION_COMPANY' }"
            href="javascript:;"
            @click="switchCalendarOwnerType('SUPERVISION_COMPANY')"
          >
            <i class="fa fa-building me-1"></i>監造公司
          </a>
        </li>
      </ul>
    </div>

    <div class="row g-4">
      <!-- 日曆主體 -->
      <div class="col-lg-8 calendar-col">
        <Card class="calendar-card">
          <CardHeader>
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="fa fa-calendar-alt me-2"></i>
                行事曆
              </h5>
              <div class="calendar-nav d-flex align-items-center gap-2 position-relative">
                <button class="btn btn-sm btn-outline-secondary" @click="previousMonth">
                  <i class="fa fa-chevron-left"></i>
                </button>
                <div 
                  class="month-selector-btn d-flex align-items-center gap-1"
                  @click="toggleYearMonthPicker"
                >
                  <h6 class="mb-0 mx-2">
                    {{ currentMonth }}
                  </h6>
                  <i class="fa fa-chevron-down text-muted" style="font-size: 0.75rem;"></i>
                </div>
                <button class="btn btn-sm btn-outline-secondary" @click="nextMonth">
                  <i class="fa fa-chevron-right"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary ms-2" @click="goToToday">
                  <i class="fa fa-calendar-day me-1"></i>
                  今天
                </button>
                
                <!-- 政府假日自動套用 Toggle -->
                <div class="gov-holiday-toggle ms-3 d-flex align-items-center gap-2">
                  <div class="form-check form-switch mb-0">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="govHolidaySwitch"
                      :checked="govHolidayEnabled"
                      :disabled="isTogglingGovHoliday || !workspaceStore.currentProject"
                      @change="toggleGovHoliday"
                    />
                    <label 
                      class="form-check-label small" 
                      for="govHolidaySwitch"
                      :class="{ 'text-muted': !workspaceStore.currentProject }"
                    >
                      國定假日自動套用
                    </label>
                  </div>
                  <button 
                    class="gov-holiday-info-btn"
                    type="button"
                    @click="showGovHolidayInfo = true"
                  >
                    <i class="fa fa-question-circle me-1"></i>說明
                  </button>
                  <span v-if="isTogglingGovHoliday" class="spinner-border spinner-border-sm ms-1"></span>
                </div>
                
                <!-- 年份月份選擇器 -->
                <Teleport to="body">
                  <div v-if="showYearMonthPicker" class="year-month-picker-overlay" @click.self="showYearMonthPicker = false">
                    <div class="year-month-picker" @click.stop>
                      <div class="picker-header">
                        <h6 class="mb-0">選擇年份月份</h6>
                        <button class="btn-close btn-close-white" @click="showYearMonthPicker = false"></button>
                      </div>
                      
                      <div class="picker-content">
                        <!-- 年份選擇 -->
                        <div class="picker-section">
                          <div class="picker-section-title">年份</div>
                          <div class="year-grid">
                            <button
                              v-for="year in yearOptions"
                              :key="year.western"
                              class="year-btn"
                              :class="{ active: year.western === currentYear }"
                              @click="selectYear(year.western)"
                            >
                              民國{{ year.republic }}年
                            </button>
                          </div>
                        </div>
                        
                        <!-- 月份選擇 -->
                        <div class="picker-section">
                          <div class="picker-section-title">月份</div>
                          <div class="month-grid">
                            <button
                              v-for="month in monthOptions"
                              :key="month.value"
                              class="month-btn"
                              :class="{ active: month.value === currentMonthIndex }"
                              @click="selectMonth(month.value)"
                            >
                              {{ month.label }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Teleport>
              </div>
            </div>
          </CardHeader>
          
          <CardBody class="p-0">
            <!-- 星期標題 -->
            <div class="calendar-header">
              <div class="row g-0">
                <div 
                  v-for="(day, index) in ['日', '一', '二', '三', '四', '五', '六']" 
                     :key="day" 
                  class="col text-center py-2 fw-semibold"
                  :class="{
                    'text-holiday': index === 0 || index === 6,
                    'text-muted': index !== 0 && index !== 6
                  }"
                >
                  {{ day }}
                </div>
              </div>
            </div>
            
            <!-- 日曆天數 -->
            <div class="calendar-body">
              <div v-for="(week, weekIndex) in Array(Math.ceil(calendarDays.length / 7))" :key="weekIndex" class="row g-0">
                <div 
                  v-for="dayIndex in 7" 
                  :key="dayIndex"
                  class="col calendar-day"
                  :class="{
                    'other-month': !calendarDays[weekIndex * 7 + dayIndex - 1]?.isCurrentMonth,
                    'today': calendarDays[weekIndex * 7 + dayIndex - 1]?.isToday,
                    'holiday': calendarDays[weekIndex * 7 + dayIndex - 1]?.isHoliday,
                    'selected': calendarDays[weekIndex * 7 + dayIndex - 1]?.fullDate && selectedDate && calendarDays[weekIndex * 7 + dayIndex - 1].fullDate.toDateString() === selectedDate.toDateString()
                  }"
                  @click="selectDate(calendarDays[weekIndex * 7 + dayIndex - 1])"
                >
                  <div class="calendar-day-content">
                    <span class="day-number">
                      {{ calendarDays[weekIndex * 7 + dayIndex - 1]?.date }}
                    </span>
                    <!-- 顯示節日名稱（排除週六、週日） -->
                    <div 
                      v-if="calendarDays[weekIndex * 7 + dayIndex - 1]?.holidayTitle"
                      class="holiday-title"
                    >
                      {{ calendarDays[weekIndex * 7 + dayIndex - 1].holidayTitle }}
                    </div>
                    <div class="day-events">
                      <!-- 公文指示標記 -->
                      <div 
                        v-if="calendarDays[weekIndex * 7 + dayIndex - 1]?.fullDate && getDocumentCountForDate(calendarDays[weekIndex * 7 + dayIndex - 1].fullDate) > 0"
                        class="doc-indicator"
                        :title="`${getDocumentCountForDate(calendarDays[weekIndex * 7 + dayIndex - 1].fullDate)} 件公文`"
                      >
                        <i class="fa fa-envelope"></i>
                        <span v-if="getDocumentCountForDate(calendarDays[weekIndex * 7 + dayIndex - 1].fullDate) > 1" class="doc-count">
                          {{ getDocumentCountForDate(calendarDays[weekIndex * 7 + dayIndex - 1].fullDate) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      <!-- 側邊欄 -->
      <div class="col-lg-4">
        <!-- 選中日期資訊 -->
        <Card class="mb-4">
          <CardHeader>
            <h6 class="mb-0">
              <i class="fa fa-calendar-check me-2"></i>
              選中日期
            </h6>
          </CardHeader>
          <CardBody>
            <div v-if="!selectedDateInfo" class="text-center py-3 text-muted">
              <i class="fa fa-mouse-pointer fa-2x mb-2"></i>
              <p class="mb-0 small">請點擊日曆選擇日期</p>
            </div>
            <div v-else>
              <!-- 日期資訊 -->
              <div class="selected-date-info mb-3">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <h5 class="mb-0">
                    {{ selectedDateInfo.dateString }}
                  </h5>
                  <span 
                    v-if="selectedDateInfo.isHoliday"
                    class="badge border border-danger text-danger"
                  >
                    假日
                  </span>
                  <span 
                    v-else
                    class="badge border border-secondary text-secondary"
                  >
                    {{ selectedDateInfo.weekDay }}
                  </span>
                </div>
                <div class="text-muted small">
                  <i class="fa fa-calendar me-1"></i>
                  星期{{ selectedDateInfo.weekDay }}
                  <span v-if="selectedDateInfo.isHoliday" class="text-danger ms-2">
                    <i class="fa fa-umbrella-beach me-1"></i>
                    <span v-if="selectedDateInfo.holidayTitle">{{ selectedDateInfo.holidayTitle }}</span>
                    <span v-else>週末/假日</span>
                  </span>
                  <span v-else-if="selectedDateInfo.holidayTitle" class="text-warning ms-2">
                    <i class="fa fa-briefcase me-1"></i>
                    {{ selectedDateInfo.holidayTitle }}
                  </span>
                </div>
              </div>
              
              <!-- 該日期的展延免計日資訊 -->
              <div class="selected-date-extensions mb-3" v-if="selectedDateExtensions.length > 0">
                <h6 class="mb-3">
                  <i class="fa fa-clock me-2 text-warning"></i>
                  工期展延免計日
                </h6>
                <div class="ext-list">
                  <div 
                    v-for="ext in selectedDateExtensions" 
                    :key="ext.extensionId + ext.date"
                    class="ext-item d-flex align-items-start mb-2 p-2 rounded"
                    role="button"
                    title="點擊前往工期展延頁面"
                    @click="router.push('/forms/a4-download')"
                  >
                    <div class="ext-icon text-warning me-3 mt-1">
                      <i class="fa fa-calendar-minus"></i>
                    </div>
                    <div class="flex-grow-1 min-width-0">
                      <div class="fw-semibold small">
                        第 {{ ext.extensionOrder }} 次展延
                        <i class="fa fa-external-link-alt ms-1" style="font-size: 0.65rem; opacity: 0.6;"></i>
                      </div>
                      <div v-if="ext.description" class="text-muted smaller">
                        <i class="fa fa-tag me-1"></i>{{ ext.description }}
                      </div>
                      <div v-if="ext.extensionReason" class="text-muted smaller text-truncate" :title="ext.extensionReason">
                        <i class="fa fa-info-circle me-1"></i>{{ ext.extensionReason }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 該日期的公文資訊 -->
              <div class="selected-date-documents mb-3" v-if="selectedDateDocuments.length > 0">
                <h6 class="mb-3">
                  <i class="fa fa-envelope me-2"></i>
                  公文發文
                  <span class="badge border border-info text-info ms-2">
                    {{ selectedDateDocuments.length }}
                  </span>
                </h6>
                <div class="doc-list">
                  <div 
                    v-for="doc in selectedDateDocuments" 
                    :key="doc.id"
                    class="doc-item d-flex align-items-start mb-2 p-2 rounded"
                  >
                    <div class="doc-icon text-info me-3 mt-1">
                      <i class="fa fa-file-alt"></i>
                    </div>
                    <div class="flex-grow-1 min-width-0">
                      <div class="fw-semibold small text-truncate" :title="doc.subject || '（無主旨）'">
                        {{ doc.subject || '（無主旨）' }}
                      </div>
                      <div class="text-muted smaller">
                        <span v-if="doc.documentNumber" class="me-2">
                          <i class="fa fa-hashtag me-1"></i>{{ doc.documentNumber }}
                        </span>
                        <span v-if="doc.sender">
                          <i class="fa fa-user me-1"></i>{{ doc.sender }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </CardBody>
        </Card>
        
        <!-- 施工日誌聯動 -->
        <Card>
          <CardHeader>
            <div class="d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
                <i class="fa fa-clipboard-list me-2"></i>
                施工日誌
            </h6>
              <button 
                v-if="dailyReport && selectedDateInfo"
                class="btn btn-sm btn-outline-primary"
                @click="goToDailyReport"
              >
                <i class="fa fa-external-link-alt me-1"></i>
                查看詳情
              </button>
            </div>
          </CardHeader>
          <CardBody>
            <div v-if="!workspaceStore.currentProject" class="text-center py-3 text-muted">
              <i class="fa fa-exclamation-triangle fa-2x mb-2"></i>
              <p class="mb-0 small">請先選擇工程案</p>
            </div>
            <div v-else-if="!selectedDateInfo" class="text-center py-3 text-muted">
              <i class="fa fa-mouse-pointer fa-2x mb-2"></i>
              <p class="mb-0 small">請點擊日曆選擇日期</p>
            </div>
            <div v-else-if="isLoadingDailyReport" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary mb-2"></div>
              <p class="text-muted small mb-0">載入中...</p>
            </div>
            <div v-else-if="!dailyReport" class="text-center py-3 text-muted">
              <i class="fa fa-file-alt fa-2x mb-2"></i>
              <p class="mb-0 small">該日期尚未建立施工日誌</p>
              <button 
                class="btn btn-sm btn-primary mt-3"
                @click="goToDailyReport"
              >
                <i class="fa fa-plus me-1"></i>
                建立施工日誌
              </button>
            </div>
            <div v-else class="daily-report-info">
              <!-- 施工日誌狀態 -->
              <div class="mb-3">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span class="text-muted small">狀態</span>
                  <span 
                    :class="`badge border ${
                      (dailyReport.status as string) === 'APPROVED' ? 'border-success text-success' :
                      (dailyReport.status as string) === 'SUBMITTED' ? 'border-primary text-primary' :
                      (dailyReport.status as string) === 'REVIEWED' ? 'border-info text-info' :
                      (dailyReport.status as string) === 'REJECTED' ? 'border-danger text-danger' :
                      'border-secondary text-secondary'
                    }`"
                  >
                    {{
                      (dailyReport.status as string) === 'DRAFT' ? '草稿' :
                      (dailyReport.status as string) === 'SUBMITTED' ? '已提交' :
                      (dailyReport.status as string) === 'REVIEWED' ? '已審核' :
                      (dailyReport.status as string) === 'APPROVED' ? '已核准' :
                      (dailyReport.status as string) === 'REJECTED' ? '已駁回' :
                      dailyReport.status
                    }}
                  </span>
                  </div>
                  </div>
              
              <!-- 天氣資訊 -->
              <div v-if="dailyReport.weatherMorning || dailyReport.weatherAfternoon" class="mb-3">
                <div class="text-muted small mb-2">天氣</div>
                <div class="d-flex gap-2">
                  <span v-if="dailyReport.weatherMorning" class="badge border border-info text-info">
                    上午：{{ dailyReport.weatherMorning }}
                  </span>
                  <span v-if="dailyReport.weatherAfternoon" class="badge border border-info text-info">
                    下午：{{ dailyReport.weatherAfternoon }}
                  </span>
                </div>
              </div>
              
              <!-- 施工項目統計 -->
              <div v-if="dailyReport.constructionItems && dailyReport.constructionItems.length > 0" class="mb-3">
                <div class="text-muted small mb-2">施工項目</div>
                <div class="d-flex align-items-center gap-2">
                  <span class="badge border border-primary text-primary">
                    {{ dailyReport.constructionItems.length }} 項
                  </span>
                  <span class="text-muted small">
                    已填寫 {{ dailyReport.constructionItems.filter(item => (Number(item.todayQty) || 0) > 0 || item.note).length }} 項
                </span>
                </div>
              </div>
              
              <!-- 材料使用統計 -->
              <div v-if="dailyReport.materials && dailyReport.materials.length > 0" class="mb-3">
                <div class="text-muted small mb-2">材料使用</div>
                <div class="d-flex align-items-center gap-2">
                  <span class="badge border border-warning text-warning">
                    {{ dailyReport.materials.length }} 項
                  </span>
                  <span class="text-muted small">
                    已填寫 {{ dailyReport.materials.filter(item => (Number(item.todayQty) || 0) > 0 || item.note).length }} 項
                  </span>
                </div>
              </div>
              
              <!-- 人員機具統計 -->
              <div v-if="dailyReport.resources && dailyReport.resources.length > 0" class="mb-3">
                <div class="text-muted small mb-2">人員機具</div>
                <div class="d-flex align-items-center gap-2">
                  <span class="badge border border-success text-success">
                    {{ dailyReport.resources.length }} 項
                  </span>
                </div>
              </div>
              
              <!-- 操作按鈕 -->
              <div class="mt-3 pt-3 border-top">
                <button 
                  class="btn btn-primary w-100"
                  @click="goToDailyReport"
                >
                  <i class="fa fa-edit me-2"></i>
                  編輯施工日誌
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
    
    
    <!-- 國定假日自動套用 說明 Modal -->
    <div v-if="showGovHolidayInfo" class="modal fade show d-block" style="background: rgba(0,0,0,0.6);" @click.self="showGovHolidayInfo = false">
      <div class="modal-dialog modal-dialog-centered" style="max-width: 560px;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fa fa-info-circle me-2"></i>
              國定假日自動套用
            </h5>
            <button type="button" class="btn-close btn-close-white" @click="showGovHolidayInfo = false"></button>
          </div>
          <div class="modal-body">
            <div class="gov-info-section mb-3">
              <h6 class="gov-info-title">
                <i class="fa fa-question-circle me-2"></i>這是什麼？
              </h6>
              <p class="mb-0">
                啟用後，系統會自動套用<strong>行政院人事行政總處</strong>公布的國定假日與補班日資料，取代內建的假日演算法。
                資料涵蓋所有國定假日（如春節、端午節、中秋節等）以及政府指定的<strong>彈性放假與補行上班</strong>日。
              </p>
            </div>
            
            <div class="gov-info-section mb-3">
              <h6 class="gov-info-title">
                <i class="fa fa-cogs me-2"></i>會影響什麼？
              </h6>
              <ul class="gov-info-list mb-0">
                <li>行事曆上的<strong>假日/工作日標記</strong>將以政府公布資料為準</li>
                <li><strong>完工日期計算</strong>會依據政府假日自動調整（工作天模式）</li>
                <li>政府指定的<strong>補行上班日</strong>（如週六補班）會被標記為工作日</li>
                <li>施工日誌中的工作日判定也會受到影響</li>
              </ul>
            </div>
            
            <div class="gov-info-section mb-3">
              <h6 class="gov-info-title">
                <i class="fa fa-layer-group me-2"></i>優先順序
              </h6>
              <div class="priority-list">
                <div class="priority-item">
                  <span class="priority-badge priority-highest">最高</span>
                  <span>您的<strong>自訂設定</strong>（手動設定的假日/工作日）</span>
                </div>
                <div class="priority-item">
                  <span class="priority-badge priority-high">次高</span>
                  <span><strong>政府公布資料</strong>（啟用此功能後生效）</span>
                </div>
                <div class="priority-item">
                  <span class="priority-badge priority-normal">預設</span>
                  <span>內建演算法（農曆節日、週末等）</span>
                </div>
              </div>
            </div>
            
            <div class="gov-info-section">
              <h6 class="gov-info-title">
                <i class="fa fa-exclamation-triangle me-2 text-warning"></i>注意事項
              </h6>
              <ul class="gov-info-list mb-0">
                <li>監造與營造端可各自獨立決定是否啟用</li>
                <li>資料來源為政府每年公布的行事曆，系統每日自動更新</li>
                <li>尚未公布的年度將使用內建演算法作為備援</li>
                <li>您的自訂設定永遠具有最高優先權，不會被覆蓋</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showGovHolidayInfo = false">
              了解
            </button>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
/* ===== 暗色主題變數 ===== */
.calendar-widget {
  --cal-bg: #1a1d21;
  --cal-card: #25282c;
  --cal-card-header: #2a2d32;
  --cal-border: #3a3d44;
  --cal-border-light: #2f3238;
  --cal-text: #e4e6eb;
  --cal-muted: #9ca3af;
  --cal-hover: rgba(96, 165, 250, 0.08);
  --cal-accent: #60a5fa;
  --cal-accent-hover: #93bbfc;
  --cal-holiday: #f87171;
  --cal-holiday-bg: rgba(248, 113, 113, 0.1);
  --cal-today-bg: rgba(96, 165, 250, 0.12);
  --cal-selected-bg: rgba(96, 165, 250, 0.2);
  --cal-other-month: #4b5563;
  --cal-other-month-bg: rgba(75, 85, 99, 0.08);
  color: var(--cal-text);
}

/* ===== 日曆佔滿剩餘空間 ===== */
.calendar-widget > .row.g-4 {
  align-items: flex-start;
}

/* ===== Card 暗色覆寫 ===== */
:deep(.card) {
  background: var(--cal-card);
  border: 1px solid var(--cal-border) !important;
  color: var(--cal-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* 隱藏 HUD 框架的裝飾性邊框和角落箭頭 */
:deep(.card)::before,
:deep(.card)::after {
  display: none !important;
}

:deep(.card-arrow) {
  display: none !important;
}

:deep(.card-header) {
  background: var(--cal-card-header);
  border-bottom: 1px solid var(--cal-border) !important;
  color: var(--cal-text);
}

:deep(.card-body) {
  color: var(--cal-text);
}

:deep(.text-muted) {
  color: var(--cal-muted) !important;
}

/* ===== 視角切換 Tab（外層） ===== */
.calendar-owner-tabs {
  border-bottom: 1px solid var(--cal-border);
}

.cal-tabs {
  border-bottom: none;
}

.cal-tabs .nav-link {
  color: var(--cal-muted);
  border: 1px solid transparent;
  border-bottom: none;
  padding: 0.5rem 1.25rem;
  font-size: 0.9rem;
  transition: all 0.2s;
  cursor: pointer;
  background: transparent;
  border-radius: 0.375rem 0.375rem 0 0;
}

.cal-tabs .nav-link:hover {
  color: var(--cal-text);
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--cal-border) var(--cal-border) transparent;
}

.cal-tabs .nav-link.active {
  color: var(--cal-accent);
  background: var(--cal-card);
  border-color: var(--cal-border) var(--cal-border) var(--cal-card);
  font-weight: 600;
}

/* ===== 日曆表頭（星期標題） ===== */
.calendar-header .row {
  border-top: 1px solid var(--cal-border);
  border-left: 1px solid var(--cal-border);
}

.calendar-header .col {
  background: var(--cal-card-header);
  color: var(--cal-muted);
  border-right: 1px solid var(--cal-border);
  border-bottom: 1px solid var(--cal-border);
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}

/* ===== 日曆格子 ===== */
.calendar-body {
  border-left: 1px solid var(--cal-border);
}

.calendar-day {
  min-height: 100px;
  border-right: 1px solid var(--cal-border);
  border-bottom: 1px solid var(--cal-border);
  border-top: none;
  border-left: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: var(--cal-card);
}

.calendar-day:hover {
  background-color: var(--cal-hover) !important;
  z-index: 1;
  box-shadow: inset 0 0 0 1px var(--cal-accent), 0 0 12px rgba(96, 165, 250, 0.15);
}

.calendar-day:hover .day-number {
  color: var(--cal-accent);
  font-weight: 700;
}

/* 今天 */
.calendar-day.today {
  background-color: var(--cal-today-bg);
  box-shadow: inset 0 0 0 1px var(--cal-accent);
}

.calendar-day.today .day-number {
  color: var(--cal-accent);
  font-weight: 700;
}

/* 非當月 */
.calendar-day.other-month {
  background-color: var(--cal-other-month-bg);
}

.calendar-day.other-month .day-number {
  color: var(--cal-other-month);
}

/* 假日 */
.calendar-day.holiday {
  background-color: var(--cal-holiday-bg) !important;
}

.calendar-day.holiday .day-number {
  color: var(--cal-holiday);
  font-weight: 700;
}

.calendar-day.holiday.other-month {
  background-color: rgba(248, 113, 113, 0.05) !important;
  opacity: 0.6;
}

.calendar-day.holiday.today {
  background-color: rgba(248, 113, 113, 0.18) !important;
  box-shadow: inset 0 0 0 1px var(--cal-holiday);
}

.calendar-day.holiday:hover {
  background-color: rgba(248, 113, 113, 0.18) !important;
  box-shadow: inset 0 0 0 1px var(--cal-holiday), 0 0 12px rgba(248, 113, 113, 0.2);
}

.calendar-day.holiday:hover .day-number {
  color: var(--cal-holiday);
}

/* 選中日期 */
.calendar-day.selected {
  background-color: var(--cal-selected-bg) !important;
  box-shadow: inset 0 0 0 2px var(--cal-accent);
  z-index: 1;
}

.calendar-day.selected .day-number {
  color: var(--cal-accent);
  font-weight: 700;
  font-size: 1rem;
}

.calendar-day.selected.holiday {
  background-color: rgba(248, 113, 113, 0.22) !important;
  box-shadow: inset 0 0 0 2px var(--cal-holiday);
}

.calendar-day.selected.holiday .day-number {
  color: var(--cal-holiday);
}

/* ===== 格子內容 ===== */
.calendar-day-content {
  padding: 0.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.day-number {
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: inline-block;
  color: var(--cal-text);
}

.day-events {
  display: flex;
  gap: 2px;
  align-items: center;
}


/* 節日名稱（格子內） */
.holiday-title {
  font-size: 0.65rem;
  color: #fbbf24;
  font-weight: 600;
  text-align: center;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

/* 公文指示標記（日曆格子內） */
.doc-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.6rem;
  color: #60a5fa;
  cursor: default;
}

.doc-indicator i {
  font-size: 0.55rem;
}

.doc-indicator .doc-count {
  font-size: 0.55rem;
  font-weight: 700;
  line-height: 1;
}

/* 星期標題中的假日樣式 */
.text-holiday {
  color: var(--cal-holiday) !important;
  font-weight: 700;
}

/* ===== 右側面板 ===== */
.selected-date-info {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--cal-border);
}

.selected-date-info h5 {
  color: var(--cal-text);
}


/* 選中日期展延免計日列表 */
.selected-date-extensions {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--cal-border);
}

.selected-date-extensions h6 {
  color: var(--cal-text);
}

.ext-list .ext-item {
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.15);
  transition: all 0.2s;
  cursor: pointer;
}

.ext-list .ext-item:hover {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.3);
}

.ext-list .ext-item .fw-semibold {
  color: var(--cal-text);
}

.ext-list .ext-item .smaller {
  font-size: 0.75rem;
}

/* 選中日期公文列表 */
.selected-date-documents {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--cal-border);
}

.selected-date-documents h6 {
  color: var(--cal-text);
}

.doc-list .doc-item {
  background: rgba(96, 165, 250, 0.06);
  border: 1px solid rgba(96, 165, 250, 0.15);
  transition: all 0.2s;
}

.doc-list .doc-item:hover {
  background: rgba(96, 165, 250, 0.12);
  border-color: rgba(96, 165, 250, 0.3);
}

.doc-list .doc-item .fw-semibold {
  color: var(--cal-text);
}

.doc-list .doc-item .smaller {
  font-size: 0.75rem;
}

.min-width-0 {
  min-width: 0;
}

/* 施工日誌區塊 */
.daily-report-info .border-top {
  border-color: var(--cal-border) !important;
}

/* ===== 按鈕暗色 ===== */
:deep(.btn-outline-secondary) {
  color: var(--cal-muted);
  border-color: var(--cal-border);
}

:deep(.btn-outline-secondary:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--cal-text);
  border-color: #6b7280;
}

:deep(.btn-outline-primary) {
  color: var(--cal-accent);
  border-color: var(--cal-accent);
}

:deep(.btn-outline-primary:hover) {
  background: rgba(96, 165, 250, 0.15);
  color: #93bbfc;
  border-color: #93bbfc;
}

:deep(.btn-primary) {
  background: var(--cal-accent);
  border-color: var(--cal-accent);
  color: #0f172a;
}

:deep(.btn-primary:hover) {
  background: #93bbfc;
  border-color: #93bbfc;
}

/* ===== Badge 暗色 ===== */
:deep(.badge) {
  font-weight: 500;
}

/* ===== 表單元素暗色 ===== */
:deep(.form-control) {
  background: #2d3139;
  border-color: var(--cal-border);
  color: var(--cal-text);
}

:deep(.form-control:focus) {
  background: #2d3139;
  border-color: var(--cal-accent);
  color: var(--cal-text);
  box-shadow: 0 0 0 0.2rem rgba(96, 165, 250, 0.15);
}

:deep(.form-control:disabled) {
  background: #22252a;
  color: var(--cal-muted);
}

:deep(.form-label) {
  color: var(--cal-text);
}

:deep(.form-text) {
  color: var(--cal-muted) !important;
}

/* ===== 按鈕群組（假日/工作日切換） ===== */
:deep(.btn-check:checked + .btn-outline-danger) {
  background: rgba(248, 113, 113, 0.2);
  color: #fca5a5;
  border-color: #f87171;
}

:deep(.btn-check:checked + .btn-outline-primary) {
  background: rgba(96, 165, 250, 0.2);
  color: #93c5fd;
  border-color: #60a5fa;
}

:deep(.btn-outline-danger) {
  color: #fca5a5;
  border-color: #6b3a3a;
}

:deep(.btn-outline-danger:hover) {
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
  border-color: #f87171;
}

/* ===== 月份選擇器按鈕 ===== */
.month-selector-btn {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.month-selector-btn:hover {
  background-color: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.3);
}

.month-selector-btn h6 {
  color: var(--cal-accent);
  font-weight: 600;
}

.month-selector-btn:hover h6 {
  color: var(--cal-accent-hover);
}

/* 年份月份選擇器樣式已移至非 scoped style 區塊（因 Teleport to body） */

/* ===== Modal 暗色 ===== */
:deep(.modal-content) {
  background: var(--cal-card);
  border-color: var(--cal-border);
  color: var(--cal-text);
}

:deep(.modal-header) {
  border-bottom-color: var(--cal-border);
  background: var(--cal-card-header);
}

:deep(.modal-header .modal-title) {
  color: var(--cal-text);
}

:deep(.modal-header .btn-close) {
  filter: invert(1) grayscale(100%) brightness(200%);
}

:deep(.modal-body) {
  color: var(--cal-text);
}

:deep(.modal-footer) {
  border-top-color: var(--cal-border);
  background: var(--cal-card-header);
}

:deep(.modal-footer .btn-secondary) {
  background: #3a3d44;
  border-color: #4a4d54;
  color: var(--cal-text);
}

/* 事件詳情 modal（直接寫在 template 的） */
.modal-content {
  background: var(--cal-card) !important;
  border-color: var(--cal-border) !important;
  color: var(--cal-text) !important;
}

.modal-header {
  border-bottom-color: var(--cal-border) !important;
  background: var(--cal-card-header) !important;
}

.modal-footer {
  border-top-color: var(--cal-border) !important;
  background: var(--cal-card-header) !important;
}

/* ===== Spinner ===== */
:deep(.spinner-border) {
  color: var(--cal-accent) !important;
}

/* Scrollbar 樣式已移至非 scoped style 區塊 */

/* ===== 國定假日說明 Modal ===== */
.gov-info-section {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.5rem;
  border: 1px solid var(--cal-border);
}

.gov-info-title {
  color: var(--cal-accent);
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.gov-info-list {
  padding-left: 1.25rem;
  color: var(--cal-text);
  font-size: 0.875rem;
  line-height: 1.75;
}

.gov-info-list li {
  margin-bottom: 0.25rem;
}

.priority-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.priority-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.priority-badge {
  display: inline-block;
  min-width: 48px;
  text-align: center;
  padding: 0.15rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.priority-highest {
  background: rgba(248, 113, 113, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.priority-high {
  background: rgba(96, 165, 250, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(96, 165, 250, 0.4);
}

.priority-normal {
  background: rgba(156, 163, 175, 0.2);
  color: #d1d5db;
  border: 1px solid rgba(156, 163, 175, 0.4);
}

/* ===== 政府假日 Toggle ===== */
.gov-holiday-toggle {
  border-left: 1px solid var(--cal-border);
  padding-left: 0.75rem;
}

.gov-holiday-toggle .form-check-input {
  background-color: #3a3d44;
  border-color: #5a5d64;
  cursor: pointer;
}

.gov-holiday-toggle .form-check-input:checked {
  background-color: var(--cal-accent);
  border-color: var(--cal-accent);
}

.gov-holiday-toggle .form-check-input:focus {
  box-shadow: 0 0 0 0.2rem rgba(96, 165, 250, 0.15);
  border-color: var(--cal-accent);
}

.gov-holiday-toggle .form-check-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gov-holiday-toggle .form-check-label {
  color: var(--cal-text);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.gov-holiday-info-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--cal-accent);
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.gov-holiday-info-btn:hover {
  background: rgba(96, 165, 250, 0.2);
  border-color: var(--cal-accent);
  color: #93c5fd;
}

/* ===== 響應式 ===== */
@media (max-width: 768px) {
  .calendar-day {
    min-height: 50px;
  }

  .calendar-day-content {
    padding: 0.25rem;
  }

  .day-number {
    font-size: 0.8rem;
  }

  .doc-indicator {
    font-size: 0.5rem;
  }

  .doc-indicator i {
    font-size: 0.45rem;
  }

  .calendar-nav h6 {
    font-size: 0.9rem;
  }

  .gov-holiday-toggle .form-check-label {
    font-size: 0.75rem;
  }
}
</style>

<!-- 非 scoped 樣式：給 Teleport 到 body 的年份月份選擇器使用 -->
<style>
/* ===== 年份月份選擇器 Overlay ===== */
.year-month-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1050;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  background-color: rgba(0, 0, 0, 0.6);
}

.year-month-picker {
  position: relative;
  background-color: #1e2530;
  border: 1px solid #3a4050;
  border-radius: 0.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  min-width: 400px;
  max-width: 90vw;
  max-height: 70vh;
  overflow-y: auto;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #3a4050;
  background-color: #232a35;
  border-radius: 0.5rem 0.5rem 0 0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.picker-header h6 {
  color: #e2e8f0;
  margin: 0;
}

.picker-content {
  padding: 1.25rem;
}

.picker-section {
  margin-bottom: 1.5rem;
}

.picker-section:last-child {
  margin-bottom: 0;
}

.picker-section-title {
  color: #9ca3af;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.year-btn,
.month-btn {
  padding: 0.5rem 0.75rem;
  background-color: #161b24;
  border: 1px solid #3a4050;
  border-radius: 0.375rem;
  color: #cbd5e1;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.year-btn:hover,
.month-btn:hover {
  background-color: #2a3342;
  border-color: #4a5568;
  color: #fff;
}

.year-btn.active,
.month-btn.active {
  background-color: #60a5fa !important;
  border-color: #60a5fa !important;
  color: #0f172a !important;
  font-weight: 600;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3);
}

/* ===== Scrollbar ===== */
.year-month-picker::-webkit-scrollbar {
  width: 6px;
}

.year-month-picker::-webkit-scrollbar-track {
  background: #1e2530;
}

.year-month-picker::-webkit-scrollbar-thumb {
  background: #3a4050;
  border-radius: 3px;
}

.year-month-picker::-webkit-scrollbar-thumb:hover {
  background: #4a5568;
}

/* ===== 響應式 ===== */
@media (max-width: 768px) {
  .year-month-picker {
    min-width: 90%;
    max-width: 90vw;
  }

  .year-grid,
  .month-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .year-month-picker-overlay {
    padding-top: 5vh;
  }
}
</style>
