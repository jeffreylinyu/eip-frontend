<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'

const workspaceStore = useWorkspaceStore()

// 狀態
const currentDate = ref(new Date())
const selectedDate = ref(new Date())
const events = ref([])
const isLoading = ref(false)
const showEventDetails = ref(false)
const selectedEvent = ref(null)

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
  return currentDate.value.toLocaleDateString('zh-TW', { 
    year: 'numeric', 
    month: 'long' 
  })
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
    days.push({
      date: date.getDate(),
      fullDate: new Date(date),
      isCurrentMonth: false,
      isToday: false,
      events: []
    })
  }
  
  // 添加當月的天數
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    days.push({
      date: day,
      fullDate: date,
      isCurrentMonth: true,
      isToday,
      events: getEventsForDate(date)
    })
  }
  
  // 添加下個月的天數（填充空白）
  const remainingDays = 42 - days.length // 6週 * 7天
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day)
    days.push({
      date: day,
      fullDate: date,
      isCurrentMonth: false,
      isToday: false,
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
  return new Date(dateString).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric'
  })
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

const selectDate = (day: any) => {
  if (day.isCurrentMonth) {
    selectedDate.value = day.fullDate
    if (day.events.length > 0) {
      selectedEvent.value = day.events[0]
      showEventDetails.value = true
    }
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

onMounted(() => {
  loadEvents()
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
              <div class="calendar-nav d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-outline-secondary" @click="previousMonth">
                  <i class="fa fa-chevron-left"></i>
                </button>
                <h6 class="mb-0 mx-3">{{ currentMonth }}</h6>
                <button class="btn btn-sm btn-outline-secondary" @click="nextMonth">
                  <i class="fa fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </CardHeader>
          
          <CardBody class="p-0">
            <!-- 星期標題 -->
            <div class="calendar-header">
              <div class="row g-0">
                <div v-for="day in ['日', '一', '二', '三', '四', '五', '六']" 
                     :key="day" 
                     class="col text-center py-2 fw-semibold text-muted border-bottom">
                  {{ day }}
                </div>
              </div>
            </div>
            
            <!-- 日曆天數 -->
            <div class="calendar-body">
              <div v-for="(week, weekIndex) in Array(6)" :key="weekIndex" class="row g-0">
                <div 
                  v-for="dayIndex in 7" 
                  :key="dayIndex"
                  class="col calendar-day"
                  :class="{
                    'other-month': !calendarDays[weekIndex * 7 + dayIndex - 1]?.isCurrentMonth,
                    'today': calendarDays[weekIndex * 7 + dayIndex - 1]?.isToday,
                    'has-events': calendarDays[weekIndex * 7 + dayIndex - 1]?.events?.length > 0
                  }"
                  @click="selectDate(calendarDays[weekIndex * 7 + dayIndex - 1])"
                >
                  <div class="calendar-day-content">
                    <span class="day-number">
                      {{ calendarDays[weekIndex * 7 + dayIndex - 1]?.date }}
                    </span>
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
        <!-- 今日事件 -->
        <Card class="mb-4">
          <CardHeader>
            <h6 class="mb-0">
              <i class="fa fa-clock me-2"></i>
              今日事件
              <span v-if="todayEvents.length > 0" class="badge border border-primary text-primary ms-2">
                {{ todayEvents.length }}
              </span>
            </h6>
          </CardHeader>
          <CardBody>
            <div v-if="todayEvents.length === 0" class="text-center py-3 text-muted">
              <i class="fa fa-calendar-check fa-2x mb-2"></i>
              <p class="mb-0 small">今日沒有安排事件</p>
            </div>
            <div v-else class="today-events">
              <div 
                v-for="event in todayEvents" 
                :key="event.id"
                class="event-item d-flex align-items-center mb-3 p-2 rounded border-start border-3"
                :class="`border-${getEventTypeColor(event.type)}`"
                @click="showEventDetail(event)"
              >
                <div :class="`event-icon text-${getEventTypeColor(event.type)} me-2`">
                  <i :class="`fa ${getEventTypeIcon(event.type)}`"></i>
                </div>
                <div class="flex-grow-1">
                  <h6 class="mb-1 small">{{ event.title }}</h6>
                  <small class="text-muted">
                    <i class="fa fa-clock me-1"></i>
                    {{ formatTime(event.time) }}
                    <span v-if="event.location">
                      | <i class="fa fa-map-marker-alt me-1"></i>{{ event.location }}
                    </span>
                  </small>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <!-- 即將到來的事件 -->
        <Card>
          <CardHeader>
            <h6 class="mb-0">
              <i class="fa fa-calendar-plus me-2"></i>
              即將到來
            </h6>
          </CardHeader>
          <CardBody>
            <div v-if="isLoading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-theme mb-2"></div>
              <p class="text-muted small mb-0">載入中...</p>
            </div>
            <div v-else-if="upcomingEvents.length === 0" class="text-center py-3 text-muted">
              <i class="fa fa-calendar fa-2x mb-2"></i>
              <p class="mb-0 small">未來一週沒有安排事件</p>
            </div>
            <div v-else class="upcoming-events">
              <div 
                v-for="event in upcomingEvents" 
                :key="event.id"
                class="event-item d-flex justify-content-between align-items-start mb-3 p-2 rounded"
                :class="`bg-${getEventTypeColor(event.type)}-subtle`"
                @click="showEventDetail(event)"
              >
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center mb-1">
                    <i :class="`fa ${getEventTypeIcon(event.type)} text-${getEventTypeColor(event.type)} me-2`"></i>
                    <h6 class="mb-0 small">{{ event.title }}</h6>
                  </div>
                  <small class="text-muted">
                    {{ formatDate(event.date) }} {{ formatTime(event.time) }}
                  </small>
                  <div v-if="event.projectName" class="mt-1">
                    <small class="text-muted">
                      <i class="fa fa-project-diagram me-1"></i>
                      {{ event.projectName }}
                    </small>
                  </div>
                </div>
                <span :class="`badge border border-${getPriorityColor(event.priority)} text-${getPriorityColor(event.priority)} rounded-pill`">
                  {{ event.priority === 'high' ? '高' : event.priority === 'medium' ? '中' : '低' }}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
    
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
                {{ new Date(selectedEvent.date).toLocaleDateString('zh-TW') }}
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
  transition: background-color 0.2s;
}

.calendar-day:hover {
  background-color: var(--bs-light);
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
}
</style>
