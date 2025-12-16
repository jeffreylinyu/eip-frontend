<template>
  <div 
    class="version-selector-component"
    @click="showModal = true"
    role="button"
    tabindex="0"
  >
    <div class="version-display">
      <div class="d-flex align-items-center justify-content-between">
        <div class="flex-grow-1">
          <div class="version-display-name">
            {{ currentVersion?.name || '未選擇版本' }}
          </div>
          <small class="text-muted d-block">
            <i class="fa fa-calendar-check me-1"></i>開工：{{ formatStartDate }}
          </small>
        </div>
        <i class="fa fa-edit text-muted ms-2"></i>
      </div>
    </div>
  </div>

  <!-- 版本選擇與編輯視窗 -->
  <Modal
    v-model:show="showModal"
    title="版本管理"
    :backdrop="false"
    size="lg"
  >
    <template #body>
      <div class="version-management-modal">
        <!-- 版本列表 -->
        <div class="version-list">
          <div 
            v-for="version in scheduleStore.versions" 
            :key="version.id"
            class="version-card"
            :class="{ active: version.id === scheduleStore.currentVersionId }"
          >
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center mb-1">
                  <div class="version-name">{{ version.name }}</div>
                  <span 
                    v-if="version.id === scheduleStore.currentVersionId" 
                    class="badge border border-success text-success px-2 py-1 rounded fs-10px ms-2"
                  >
                    使用中
                  </span>
                </div>
                <small class="text-muted d-block">
                  <i class="fa fa-calendar-check me-1"></i>開工：{{ formatDateForModal(getVersionDatesForVersion(version).startDate) }}
                </small>
                <small class="text-muted d-block">
                  <i class="fa fa-tasks me-1"></i>{{ version.taskCount }} 項任務
                </small>
              </div>
              <div class="d-flex gap-2">
                <button 
                  v-if="version.id !== scheduleStore.currentVersionId"
                  class="btn btn-sm btn-success"
                  @click="handleSelectVersion(version.id)"
                  title="設為使用版本"
                >
                  <i class="fa fa-check me-1"></i>使用
                </button>
                <button 
                  class="btn btn-sm btn-outline-info"
                  @click="handleDuplicateVersion(version)"
                  title="複製版本"
                >
                  <i class="fa fa-copy"></i>
                </button>
                <button 
                  class="btn btn-sm btn-outline-secondary"
                  @click="handleEditVersion(version)"
                  title="編輯版本"
                >
                  <i class="fa fa-edit"></i>
                </button>
                <button 
                  class="btn btn-sm btn-outline-danger"
                  @click="handleDeleteVersion(version)"
                  title="刪除版本"
                >
                  <i class="fa fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <button class="btn btn-outline-primary" @click="openCreate">新增版本</button>
      <button class="btn btn-secondary" @click="showModal = false">關閉</button>
    </template>
  </Modal>

  <!-- 版本編輯對話框 -->
  <Modal
    v-model:show="showEditDialog"
    title="編輯版本"
    :backdrop="false"
  >
    <template #body>
      <div class="mb-3">
        <label class="form-label">版本名稱 <span class="text-danger">*</span></label>
        <input 
          type="text" 
          class="form-control" 
          v-model="editForm.name"
          placeholder="例如：初版、修訂版 1"
        >
      </div>
      
      <div class="mb-3">
        <label class="form-label">開工日期</label>
        <RepublicDatePicker
          v-model="editForm.startDate"
          :use-republic-year="true"
        />
      </div>
      
      <div class="mb-3">
        <label class="form-label">說明</label>
        <textarea 
          class="form-control" 
          rows="2"
          v-model="editForm.description"
          placeholder="描述此版本的特點"
        ></textarea>
      </div>
    </template>

    <template #footer>
      <button class="btn btn-secondary" @click="showEditDialog = false">取消</button>
      <button 
        class="btn btn-primary" 
        @click="handleSaveEdit"
        :disabled="!editForm.name"
      >
        儲存
      </button>
    </template>
  </Modal>

  <!-- 建立版本對話框 -->
  <Modal
    v-model:show="showCreateDialog"
    title="建立新版本"
    :backdrop="true"
    icon="fa fa-folder-plus"
  >
    <template #body>
      <div class="mb-3">
        <label class="form-label">版本名稱<span class="text-danger">*</span></label>
        <input v-model="createForm.name" type="text" class="form-control" placeholder="請輸入版本名稱" required />
      </div>
      <div class="form-check">
        <input id="vs-withSample" class="form-check-input" type="checkbox" v-model="createForm.withSample" />
        <label class="form-check-label" for="vs-withSample">同時建立測試資料</label>
      </div>
    </template>
    <template #footer>
      <button class="btn btn-secondary" @click="showCreateDialog = false">取消</button>
      <button class="btn btn-primary" @click="handleCreate" :disabled="!createForm.name">建立</button>
    </template>
  </Modal>

  <!-- 刪除確認對話框 -->
  <Modal
    v-model:show="showDeleteConfirm"
    title="確認刪除版本"
    :backdrop="true"
    icon="fa fa-exclamation-triangle"
  >
    <template #body>
      <div v-if="deletingVersion">
        <p class="mb-3">確定要刪除版本「<strong>{{ deletingVersion.name }}</strong>」嗎？</p>
        <div class="alert alert-warning mb-0">
          <i class="fa fa-warning me-2"></i>
          此操作無法復原，版本內的所有任務資料都將被刪除。
          <template v-if="deletingVersion.id === scheduleStore.currentVersionId">
            <br><strong class="mt-2 d-block">注意：此版本為目前使用中的版本，刪除後將自動切換到其他版本。</strong>
          </template>
        </div>
      </div>
    </template>
    <template #footer>
      <button class="btn btn-secondary" @click="showDeleteConfirm = false; deletingVersion = null">取消</button>
      <button class="btn btn-danger" @click="confirmDelete">確認刪除</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useScheduleStore, type ScheduleVersion } from '@/stores/schedule'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import { genUid } from '@/utils/schedule/tree'

const scheduleStore = useScheduleStore()

// Modal 顯示狀態
const showModal = ref(false)
const showEditDialog = ref(false)
const showCreateDialog = ref(false)
const showDeleteConfirm = ref(false)
const deletingVersion = ref<ScheduleVersion | null>(null)

// 編輯表單
const editForm = ref({
  id: 0,
  name: '',
  description: '',
  startDate: ''
})
const createForm = ref({
  name: '',
  withSample: false
})

const currentVersion = computed(() => scheduleStore.currentVersion)

// 計算指定版本的開工日期和完工日期
const getVersionDatesForVersion = (version: ScheduleVersion) => {
  // 優先使用用戶設定的開工日期
  let startDate: Date | null = version.startDate ? new Date(version.startDate) : null
  let endDate: Date | null = null
  
  // 如果沒有工項，直接返回
  if (!version.tasks || version.tasks.length === 0) {
    return { startDate, endDate }
  }
  
  let minStartDate: Date | null = null
  let maxEndDate: Date | null = null
  
  // 遞迴收集所有任務的日期（包括子任務）
  const collectDates = (tasks: any[]) => {
    tasks.forEach(task => {
      if (task.StartDate) {
        const taskStartDate = new Date(task.StartDate)
        if (!minStartDate || taskStartDate < minStartDate) {
          minStartDate = taskStartDate
        }
      }
      
      if (task.EndDate) {
        const taskEndDate = new Date(task.EndDate)
        if (!maxEndDate || taskEndDate > maxEndDate) {
          maxEndDate = taskEndDate
        }
      }
      
      // 處理子任務
      if (task.subtasks && task.subtasks.length > 0) {
        collectDates(task.subtasks)
      }
    })
  }
  
  collectDates(version.tasks)
  
  // 如果沒有用戶設定的開工日期，使用計算得出的
  if (!startDate) {
    startDate = minStartDate
  }
  
  // 完工日期始終使用計算得出的（所有工項中最晚的結束日期）
  endDate = maxEndDate
  
  return {
    startDate,
    endDate
  }
}

// 計算當前版本的開工日期和完工日期
const getVersionDates = () => {
  if (!currentVersion.value) {
    return { startDate: null, endDate: null }
  }
  return getVersionDatesForVersion(currentVersion.value)
}

// 格式化日期（民國年月日）
const formatDate = (date: Date | null) => {
  if (!date) return '-'
  const year = date.getFullYear()
  const rocYear = year - 1911
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${rocYear}/${month}/${day}`
}

// Modal 中使用的日期格式化
const formatDateForModal = (date: Date | null) => {
  return formatDate(date)
}

const formatStartDate = computed(() => {
  const dates = getVersionDates()
  return formatDate(dates.startDate)
})

// 選擇版本
const handleSelectVersion = (id: number) => {
  scheduleStore.setCurrentVersion(id)
}

// 編輯版本
const handleEditVersion = (version: ScheduleVersion) => {
  // 如果版本有設定開工日期，使用該日期；否則使用計算得出的日期
  let startDate = ''
  if (version.startDate) {
    startDate = version.startDate
  } else {
    const dates = getVersionDatesForVersion(version)
    if (dates.startDate) {
      startDate = dates.startDate.toISOString().split('T')[0]
    }
  }
  
  editForm.value = {
    id: version.id,
    name: version.name,
    description: version.description || '',
    startDate: startDate
  }
  
  showEditDialog.value = true
}

// 儲存編輯
const handleSaveEdit = () => {
  if (!editForm.value.name) return
  
  const versionData: any = {
    name: editForm.value.name,
    description: editForm.value.description,
  }
  
  // 如果有設定開工日期，加入到資料中
  if (editForm.value.startDate) {
    versionData.startDate = editForm.value.startDate
  }
  
  scheduleStore.updateVersion(editForm.value.id, versionData)
  showEditDialog.value = false
}

// 開啟建立版本
const openCreate = () => {
  createForm.value = { name: '', withSample: false }
  showCreateDialog.value = true
}

// 建立符合規則的簡單測試資料
const createSampleTasks = (): any[] => {
  const dayMs = 24 * 60 * 60 * 1000
  const make = (id: string, name: string, start: string, dur: number, pred = '') => {
    const s = new Date(start)
    const e = new Date(s.getTime() + (dur - 1) * dayMs)
    return { Uid: genUid(), TaskID: id, TaskName: name, StartDate: s, EndDate: e, Duration: dur, Progress: 0, Predecessor: pred, CostRatio: 0, ActualAmount: 0, subtasks: [] }
  }
  const a1 = make('1.1', '臨設搭建', '2025-10-01', 3)
  const a2 = make('1.2', '材料進場', '2025-10-04', 2)
  const A = { Uid: genUid(), TaskID: '1', TaskName: '動員準備', StartDate: a1.StartDate, EndDate: a2.EndDate, Duration: 5, Progress: 0, Predecessor: '', CostRatio: 0, ActualAmount: 0, subtasks: [a1, a2] }
  const b1 = make('2.1', '基礎開挖', '2025-10-07', 5)
  const b2 = make('2.2', '基礎鋼筋', '2025-10-13', 4, '2.1 FS')
  const B = { Uid: genUid(), TaskID: '2', TaskName: '基礎工程', StartDate: b1.StartDate, EndDate: b2.EndDate, Duration: 9, Progress: 0, Predecessor: '', CostRatio: 0, ActualAmount: 0, subtasks: [b1, b2] }
  const c1 = make('3.1', '回填夯實', '2025-10-18', 3, '2.2 FF')
  const C = { Uid: genUid(), TaskID: '3', TaskName: '回填作業', StartDate: c1.StartDate, EndDate: c1.EndDate, Duration: 3, Progress: 0, Predecessor: '', CostRatio: 0, ActualAmount: 0, subtasks: [c1] }
  return [A, B, C]
}

const handleCreate = () => {
  const name = createForm.value.name?.trim() || '新版本'
  const tasks = createForm.value.withSample ? createSampleTasks() : []
  const taskCount = (() => {
    let c = 0; const walk = (ts: any[]) => ts.forEach(t => { c++; if (t.subtasks?.length) walk(t.subtasks) })
    walk(tasks); return c
  })()
  const v = scheduleStore.addVersion({ name, description: '', taskCount, tasks })
  if (v) scheduleStore.setCurrentVersion(v.id)
  showCreateDialog.value = false
  showModal.value = false
}

// 複製版本
const handleDuplicateVersion = (version: ScheduleVersion) => {
  const duplicated = scheduleStore.duplicateVersion(version.id)
  if (duplicated) {
    scheduleStore.setCurrentVersion(duplicated.id)
    showModal.value = false
  }
}

// 刪除版本（顯示確認對話框）
const handleDeleteVersion = (version: ScheduleVersion) => {
  // 如果只有一個版本，不允許刪除
  if (scheduleStore.versions.length <= 1) {
    alert('至少需要保留一個版本，無法刪除')
    return
  }
  deletingVersion.value = version
  showDeleteConfirm.value = true
}

// 確認刪除
const confirmDelete = () => {
  if (!deletingVersion.value) return
  
  const versionId = deletingVersion.value.id
  const isCurrentVersion = versionId === scheduleStore.currentVersionId
  
  const success = scheduleStore.deleteVersion(versionId)
  if (success) {
    // 如果刪除的是當前版本，會自動切換到第一個版本
    if (isCurrentVersion && scheduleStore.versions.length > 0) {
      scheduleStore.setCurrentVersion(scheduleStore.versions[0].id)
    }
  }
  
  deletingVersion.value = null
  showDeleteConfirm.value = false
}

// 暴露方法供父組件調用
defineExpose({
  openModal: () => { showModal.value = true },
  openCreate: () => { openCreate() }
})
</script>

<style scoped>
.version-selector-component {
  min-width: 200px;
  cursor: pointer;
  user-select: none;
}

.version-selector-component:hover .version-display {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.version-display {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 10px 12px;
  transition: all 0.2s;
}

.version-display-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 6px;
}

.version-display small {
  font-size: 13px;
  line-height: 1.4;
}

.version-display .fa-edit {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.version-selector-component:hover .fa-edit {
  opacity: 1;
}

/* Modal 內容樣式 */
.version-management-modal {
  overflow-y: auto;
}

.version-card {
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s;
}

.version-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.version-card.active {
  background: rgba(13, 110, 253, 0.15);
  border-color: rgba(13, 110, 253, 0.3);
}

.version-card .version-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 8px;
}

/* 捲軸美化 */
.version-list::-webkit-scrollbar,
.version-management-modal::-webkit-scrollbar {
  width: 6px;
}

.version-list::-webkit-scrollbar-track,
.version-management-modal::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.version-list::-webkit-scrollbar-thumb,
.version-management-modal::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.version-list::-webkit-scrollbar-thumb:hover,
.version-management-modal::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>

