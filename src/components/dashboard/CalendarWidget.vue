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
  createOrUpdateCalendarEvent,
  type CalendarEvent as ApiCalendarEvent,
  type CreateOrUpdateCalendarEventRequest
} from '@/api/construction'
import { useRouter } from 'vue-router'
import Modal from '@/components/bootstrap/Modal.vue'

const workspaceStore = useWorkspaceStore()
const router = useRouter()

// 狀態
const currentDate = ref(new Date())
const selectedDate = ref<Date | null>(new Date())
const events = ref([])
const isLoading = ref(false)
const showEventDetails = ref(false)
const selectedEvent = ref(null)
const showYearMonthPicker = ref(false)
const dailyReport = ref<DailyReportDetailResponse | null>(null)
const isLoadingDailyReport = ref(false)
const calendarEvents = ref<ApiCalendarEvent[]>([]) // 從後端獲取的行事曆事件
const isLoadingCalendarEvents = ref(false)

// 編輯假日/工作日相關狀態
const showEditHolidayModal = ref(false)
const isSubmittingHoliday = ref(false)
const editHolidayForm = ref<CreateOrUpdateCalendarEventRequest>({
  date: '',
  isHoliday: false,
  note: ''
})

// 事件類型定義
interface CalendarEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'deadline' | 'meeting' | 'inspection' | 'milestone' | 'maintenance'
  priority: 'high' | 'medium' | 'low'
  projectId?: string
  projectName?: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  attendees?: string[]
  location?: string
}

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
      holidayTitle: holidayInfo.title,
      events: []
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
      holidayTitle: holidayInfo.title,
      events: getEventsForDate(date)
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
      holidayTitle: holidayInfo.title,
      events: []
    })
  }
  
  return days
})

const upcomingEvents = computed(() => {
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  return events.value
    .filter(event => {
      const eventDate = new Date(event.date)
      return eventDate >= today && eventDate <= nextWeek && event.status === 'upcoming'
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)
})

const todayEvents = computed(() => {
  const today = new Date().toDateString()
  return events.value.filter(event => 
    new Date(event.date).toDateString() === today
  )
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
    holidayTitle: holidayInfo.title,
    events: getEventsForDate(date)
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
      endDateStr
    )
    calendarEvents.value = events
  } catch (error) {
    console.error('載入行事曆事件失敗:', error)
    calendarEvents.value = []
  } finally {
    isLoadingCalendarEvents.value = false
  }
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

// 監聽當前月份和工程案變化，自動載入行事曆事件
watch([currentDate, () => workspaceStore.currentProject], () => {
  loadCalendarEvents()
}, { immediate: true })

// 打開編輯假日/工作日 Modal
const openEditHolidayModal = () => {
  if (!selectedDate.value || !workspaceStore.currentProject) {
    alert('請先選擇日期和工程案')
    return
  }
  
  const dateStr = formatDateString(selectedDate.value)
  const existingEvent = calendarEvents.value.find(e => e.date === dateStr)
  
  editHolidayForm.value = {
    date: dateStr,
    isHoliday: existingEvent ? existingEvent.isHoliday : (selectedDateInfo.value?.isHoliday || false),
    note: existingEvent && existingEvent.isCustom ? existingEvent.title : ''
  }
  
  showEditHolidayModal.value = true
}

// 關閉編輯假日/工作日 Modal
const closeEditHolidayModal = () => {
  showEditHolidayModal.value = false
  editHolidayForm.value = {
    date: '',
    isHoliday: false,
    note: ''
  }
}

// 提交編輯假日/工作日
const submitEditHoliday = async () => {
  if (!workspaceStore.currentProject?.id) {
    alert('請先選擇工程案')
    return
  }
  
  if (!editHolidayForm.value.date) {
    alert('請選擇日期')
    return
  }
  
  isSubmittingHoliday.value = true
  try {
    await createOrUpdateCalendarEvent(
      workspaceStore.currentProject.id,
      editHolidayForm.value
    )
    
    // 重新載入行事曆事件
    await loadCalendarEvents()
    
    // 關閉 Modal
    closeEditHolidayModal()
    
    alert('設定成功')
  } catch (error: any) {
    console.error('設定假日/工作日失敗:', error)
    alert(`設定失敗：${error?.response?.data?.message || error?.message || '未知錯誤'}`)
  } finally {
    isSubmittingHoliday.value = false
  }
}

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
const getEventsForDate = (date: Date) => {
  const dateString = date.toDateString()
  return events.value.filter(event => 
    new Date(event.date).toDateString() === dateString
  )
}

const getEventTypeColor = (type: string) => {
  const colors = {
    deadline: 'danger',
    meeting: 'primary',
    inspection: 'warning',
    milestone: 'success',
    maintenance: 'info'
  }
  return colors[type] || 'secondary'
}

const getEventTypeIcon = (type: string) => {
  const icons = {
    deadline: 'fa-flag',
    meeting: 'fa-users',
    inspection: 'fa-search',
    milestone: 'fa-trophy',
    maintenance: 'fa-tools'
  }
  return icons[type] || 'fa-calendar'
}

const getEventTypeText = (type: string) => {
  const texts = {
    deadline: '截止日期',
    meeting: '會議',
    inspection: '檢查',
    milestone: '里程碑',
    maintenance: '維護'
  }
  return texts[type] || '事件'
}

const getPriorityColor = (priority: string) => {
  const colors = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return colors[priority] || 'secondary'
}

const formatTime = (timeString: string) => {
  return timeString.slice(0, 5) // HH:MM
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const republicYear = toRepublicYear(year)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `民國${republicYear}年${month}月${day}日`
}

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

const showEventDetail = (event: CalendarEvent) => {
  selectedEvent.value = event
  showEventDetails.value = true
}

const closeEventDetails = () => {
  showEventDetails.value = false
  selectedEvent.value = null
}

const loadEvents = async () => {
  isLoading.value = true
  try {
    // 模擬載入事件數據
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const today = new Date()
    events.value = [
      {
        id: 'event-001',
        title: '工程進度會議',
        description: '討論台北市內湖區新辦公大樓興建工程本月進度',
        date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        time: '09:00',
        type: 'meeting',
        priority: 'high',
        projectId: 'proj-001',
        projectName: '台北市內湖區新辦公大樓興建工程',
        status: 'upcoming',
        attendees: ['張工程師', '李主任', '王承包商'],
        location: '會議室A'
      },
      {
        id: 'event-002',
        title: '安全檢查',
        description: '桃園機場第三航廈工程定期安全檢查',
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        time: '14:00',
        type: 'inspection',
        priority: 'high',
        projectId: 'proj-003',
        projectName: '桃園機場第三航廈工程',
        status: 'upcoming',
        location: '工地現場'
      },
      {
        id: 'event-003',
        title: '預算審核截止',
        description: '新北市社會住宅建設案第二季預算審核截止日',
        date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        time: '17:00',
        type: 'deadline',
        priority: 'high',
        projectId: 'proj-002',
        projectName: '新北市社會住宅建設案',
        status: 'upcoming'
      },
      {
        id: 'event-004',
        title: '里程碑達成',
        description: '高雄輕軌延伸線工程第一階段完工',
        date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        time: '10:00',
        type: 'milestone',
        priority: 'medium',
        projectId: 'proj-004',
        projectName: '高雄輕軌延伸線工程',
        status: 'upcoming'
      },
      {
        id: 'event-005',
        title: '設備維護',
        description: '台中捷運綠線延伸段機械設備例行維護',
        date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        time: '08:00',
        type: 'maintenance',
        priority: 'low',
        projectId: 'proj-005',
        projectName: '台中捷運綠線延伸段',
        status: 'upcoming'
      },
      {
        id: 'event-006',
        title: '今日會議',
        description: '每日站立會議',
        date: today.toISOString(),
        time: '09:00',
        type: 'meeting',
        priority: 'medium',
        status: 'upcoming',
        location: '會議室B'
      }
    ]
  } catch (error) {
    console.error('載入事件失敗:', error)
  } finally {
    isLoading.value = false
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
  loadEvents()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="calendar-widget">
    <div class="row g-4">
      <!-- 日曆主體 -->
      <div class="col-lg-8">
        <Card>
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
                  class="col text-center py-2 fw-semibold border-bottom"
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
                    'has-events': calendarDays[weekIndex * 7 + dayIndex - 1]?.events?.length > 0,
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
                      <div 
                        v-for="event in calendarDays[weekIndex * 7 + dayIndex - 1]?.events?.slice(0, 2)" 
                        :key="event.id"
                        :class="`event-dot bg-${getEventTypeColor(event.type)}`"
                        :title="event.title"
                        @click.stop="showEventDetail(event)"
                      ></div>
                      <span 
                        v-if="calendarDays[weekIndex * 7 + dayIndex - 1]?.events?.length > 2"
                        class="more-events"
                      >
                        +{{ calendarDays[weekIndex * 7 + dayIndex - 1].events.length - 2 }}
                      </span>
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
                <!-- 編輯假日/工作日按鈕 -->
                <div class="mt-3">
                  <button 
                    class="btn btn-sm btn-outline-primary w-100"
                    @click="openEditHolidayModal"
                  >
                    <i class="fa fa-edit me-2"></i>
                    編輯假日/工作日設定
                  </button>
                </div>
              </div>
              
              <!-- 該日期的事件 -->
              <div class="selected-date-events">
                <h6 class="mb-3">
                  <i class="fa fa-list me-2"></i>
                  事件列表
                  <span v-if="selectedDateInfo.events.length > 0" class="badge border border-primary text-primary ms-2">
                    {{ selectedDateInfo.events.length }}
                  </span>
                </h6>
                
                <div v-if="selectedDateInfo.events.length === 0" class="text-center py-3 text-muted">
                  <i class="fa fa-calendar-times fa-2x mb-2"></i>
                  <p class="mb-0 small">當日沒有安排事件</p>
                </div>
                
                <div v-else class="event-list">
                  <div 
                    v-for="event in selectedDateInfo.events" 
                :key="event.id"
                    class="event-item d-flex align-items-start mb-3 p-3 rounded border-start border-3"
                :class="`border-${getEventTypeColor(event.type)}`"
                @click="showEventDetail(event)"
              >
                    <div :class="`event-icon text-${getEventTypeColor(event.type)} me-3`">
                      <i :class="`fa ${getEventTypeIcon(event.type)} fa-lg`"></i>
                </div>
                <div class="flex-grow-1">
                      <h6 class="mb-2">{{ event.title }}</h6>
                      <p class="text-muted small mb-2">{{ event.description }}</p>
                      <div class="d-flex flex-wrap gap-2 mb-2">
                  <small class="text-muted">
                    <i class="fa fa-clock me-1"></i>
                    {{ formatTime(event.time) }}
                        </small>
                        <span v-if="event.location" class="text-muted">
                          <i class="fa fa-map-marker-alt me-1"></i>
                          {{ event.location }}
                    </span>
                      </div>
                      <div class="d-flex flex-wrap gap-2">
                        <span :class="`badge border border-${getEventTypeColor(event.type)} text-${getEventTypeColor(event.type)}`">
                          {{ getEventTypeText(event.type) }}
                        </span>
                        <span :class="`badge border border-${getPriorityColor(event.priority)} text-${getPriorityColor(event.priority)}`">
                          {{ event.priority === 'high' ? '高優先級' : event.priority === 'medium' ? '中優先級' : '低優先級' }}
                        </span>
                      </div>
                      <div v-if="event.projectName" class="mt-2">
                        <small class="text-muted">
                          <i class="fa fa-project-diagram me-1"></i>
                          {{ event.projectName }}
                  </small>
                      </div>
                      <div v-if="event.attendees && event.attendees.length > 0" class="mt-2">
                        <small class="text-muted">
                          <i class="fa fa-users me-1"></i>
                          {{ event.attendees.join('、') }}
                        </small>
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
    
    <!-- 編輯假日/工作日 Modal -->
    <Modal
      :show="showEditHolidayModal"
      title="編輯假日/工作日設定"
      icon="fa fa-calendar-edit"
      size="sm"
      modal-id="editHolidayModal"
      confirm-text="儲存"
      confirm-icon="fa fa-save"
      :is-loading="isSubmittingHoliday"
      loading-text="處理中..."
      @hide="closeEditHolidayModal"
      @confirm="submitEditHoliday"
    >
      <template #body>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label">
              日期 <span class="text-danger">*</span>
            </label>
            <input
              type="date"
              class="form-control"
              v-model="editHolidayForm.date"
              required
              disabled
            />
            <small class="form-text text-muted">
              選中的日期：{{ selectedDateInfo?.dateString }}
            </small>
          </div>
          
          <div class="col-12">
            <label class="form-label">
              類型 <span class="text-danger">*</span>
            </label>
            <div class="btn-group w-100" role="group">
              <input
                type="radio"
                class="btn-check"
                id="holiday-true"
                :value="true"
                v-model="editHolidayForm.isHoliday"
              />
              <label class="btn btn-outline-danger" for="holiday-true">
                <i class="fa fa-umbrella-beach me-2"></i>
                假日
              </label>
              
              <input
                type="radio"
                class="btn-check"
                id="holiday-false"
                :value="false"
                v-model="editHolidayForm.isHoliday"
              />
              <label class="btn btn-outline-primary" for="holiday-false">
                <i class="fa fa-briefcase me-2"></i>
                上班日
              </label>
            </div>
          </div>
          
          <div class="col-12">
            <label class="form-label">
              備註說明
            </label>
            <input
              type="text"
              class="form-control"
              v-model="editHolidayForm.note"
              placeholder="例如：補班日、公司尾牙等"
              maxlength="50"
            />
            <small class="form-text text-muted">
              選填，用於說明此設定的原因或用途
            </small>
          </div>
        </div>
      </template>
    </Modal>
    
    <!-- 事件詳情模態框 -->
    <div v-if="showEventDetails && selectedEvent" class="modal fade show d-block" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i :class="`fa ${getEventTypeIcon(selectedEvent.type)} me-2`"></i>
              {{ selectedEvent.title }}
            </h5>
            <button type="button" class="btn-close" @click="closeEventDetails"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-12">
                <p class="text-muted">{{ selectedEvent.description }}</p>
              </div>
              <div class="col-md-6">
                <strong>日期時間：</strong>
                <br>
                {{ formatDate(selectedEvent.date) }}
                {{ formatTime(selectedEvent.time) }}
              </div>
              <div class="col-md-6">
                <strong>類型：</strong>
                <br>
                <span :class="`badge border border-${getEventTypeColor(selectedEvent.type)} text-${getEventTypeColor(selectedEvent.type)}`">
                  {{ getEventTypeText(selectedEvent.type) }}
                </span>
              </div>
              <div v-if="selectedEvent.location" class="col-md-6">
                <strong>地點：</strong>
                <br>
                {{ selectedEvent.location }}
              </div>
              <div class="col-md-6">
                <strong>優先級：</strong>
                <br>
                <span :class="`badge border border-${getPriorityColor(selectedEvent.priority)} text-${getPriorityColor(selectedEvent.priority)}`">
                  {{ selectedEvent.priority === 'high' ? '高' : selectedEvent.priority === 'medium' ? '中' : '低' }}
                </span>
              </div>
              <div v-if="selectedEvent.projectName" class="col-12">
                <strong>相關專案：</strong>
                <br>
                <i class="fa fa-project-diagram me-1"></i>
                {{ selectedEvent.projectName }}
              </div>
              <div v-if="selectedEvent.attendees && selectedEvent.attendees.length > 0" class="col-12">
                <strong>參與者：</strong>
                <br>
                <span v-for="(attendee, index) in selectedEvent.attendees" :key="attendee">
                  {{ attendee }}<span v-if="index < selectedEvent.attendees.length - 1">、</span>
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeEventDetails">關閉</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-day {
  height: 80px;
  border: 1px solid var(--bs-border-color);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.calendar-day:hover {
  background-color: rgba(59, 130, 246, 0.1) !important;
  border-color: #3b82f6 !important;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
  z-index: 1;
}

.calendar-day:hover .day-number {
  color: #3b82f6;
  font-weight: 700;
  transform: scale(1.1);
}

.calendar-day.today {
  background-color: rgba(var(--bs-primary-rgb), 0.1);
  border-color: var(--bs-primary);
}

.calendar-day.other-month {
  color: #6c757d;
  background-color: rgba(108, 117, 125, 0.1);
}

.calendar-day.has-events {
  background-color: rgba(var(--bs-info-rgb), 0.05);
}

.calendar-day.holiday {
  background-color: rgba(220, 53, 69, 0.1) !important;
  color: #dc3545;
}

.calendar-day.holiday .day-number {
  color: #dc3545;
  font-weight: 700;
}

.calendar-day.holiday.other-month {
  background-color: rgba(220, 53, 69, 0.05) !important;
  color: #dc3545;
  opacity: 0.6;
}

.calendar-day.holiday.today {
  background-color: rgba(220, 53, 69, 0.2) !important;
  border-color: #dc3545;
}

.calendar-day.holiday:hover {
  background-color: rgba(220, 53, 69, 0.2) !important;
  border-color: #dc3545 !important;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
}

.calendar-day.holiday:hover .day-number {
  color: #dc3545;
  transform: scale(1.1);
}

.calendar-day.other-month:hover {
  background-color: rgba(59, 130, 246, 0.08) !important;
  opacity: 0.8;
}

.calendar-day.today:hover {
  background-color: rgba(59, 130, 246, 0.25) !important;
  border-color: #2563eb !important;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.calendar-day.selected:hover {
  background-color: rgba(59, 130, 246, 0.3) !important;
  border-color: #2563eb !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  transform: scale(1.02);
}

.calendar-day.selected.holiday:hover {
  background-color: rgba(220, 53, 69, 0.3) !important;
  border-color: #c82333 !important;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.3);
}

/* 選中日期樣式 */
.calendar-day.selected {
  background-color: rgba(59, 130, 246, 0.2) !important;
  border: 2px solid #3b82f6 !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.calendar-day.selected .day-number {
  color: #3b82f6;
  font-weight: 700;
  font-size: 1rem;
}

.calendar-day.selected.holiday {
  background-color: rgba(220, 53, 69, 0.25) !important;
  border-color: #dc3545 !important;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
}

.calendar-day.selected.holiday .day-number {
  color: #dc3545;
}

/* 選中日期資訊樣式 */
.selected-date-info {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--bs-border-color);
}

.event-list .event-item {
  cursor: pointer;
  transition: all 0.2s;
}

.event-list .event-item:hover {
  background-color: rgba(59, 130, 246, 0.05);
  transform: translateX(2px);
}

/* 星期標題中的假日樣式 */
.text-holiday {
  color: #dc3545 !important;
  font-weight: 700;
}

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
  transition: all 0.3s ease;
  display: inline-block;
}

.day-events {
  display: flex;
  gap: 2px;
  align-items: center;
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  cursor: pointer;
}

.more-events {
  font-size: 0.7rem;
  color: var(--bs-secondary);
  margin-left: 2px;
}

/* 節日名稱樣式（日曆格子中） */
.holiday-title {
  font-size: 0.65rem;
  color: #f59e0b;
  font-weight: 600;
  text-align: center;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

/* 節日名稱樣式（右側面板） */
.holiday-title-display {
  padding: 0.5rem;
  background-color: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
}

.event-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.event-item:hover {
  background-color: var(--bs-light) !important;
}

.today-events .event-item {
  border-left-width: 3px !important;
}

.upcoming-events .event-item {
  border: 1px solid transparent;
}

.upcoming-events .event-item:hover {
  border-color: var(--bs-border-color);
}

.modal.show {
  display: block !important;
}

/* 年份月份選擇器樣式 */
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
  background-color: rgba(0, 0, 0, 0.5);
}

.year-month-picker {
  position: relative;
  background-color: #1e293b;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  min-width: 400px;
  max-width: 90vw;
  max-height: 70vh;
  overflow-y: auto;
}

/* 月份選擇器按鈕樣式 */
.month-selector-btn {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.month-selector-btn:hover {
  background-color: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.month-selector-btn h6 {
  color: #3b82f6;
  font-weight: 600;
}

.month-selector-btn:hover h6 {
  color: #2563eb;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #475569;
  background-color: #1e293b;
  border-radius: 0.375rem 0.375rem 0 0;
}

.picker-header h6 {
  color: #e2e8f0;
  margin: 0;
}

.picker-content {
  padding: 1rem;
}

.picker-section {
  margin-bottom: 1.5rem;
}

.picker-section:last-child {
  margin-bottom: 0;
}

.picker-section-title {
  color: #cbd5e1;
  font-size: 0.875rem;
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
  background-color: #0f172a;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.year-btn:hover,
.month-btn:hover {
  background-color: #334155;
  border-color: #64748b;
  color: #fff;
}

.year-btn.active,
.month-btn.active {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
  font-weight: 600;
}

.cursor-pointer {
  cursor: pointer;
}

@media (max-width: 768px) {
  .calendar-day {
    height: 60px;
  }
  
  .calendar-day-content {
    padding: 0.25rem;
  }
  
  .day-number {
    font-size: 0.8rem;
  }
  
  .event-dot {
    width: 4px;
    height: 4px;
  }
  
  .calendar-nav h6 {
    font-size: 0.9rem;
  }
  
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
