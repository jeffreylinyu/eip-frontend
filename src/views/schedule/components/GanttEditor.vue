<template>
  <div class="gantt-editor-wrapper flex-fill d-flex flex-column overflow-hidden">
    <!-- 工具列 -->
    <div class="d-flex justify-content-between align-items-center p-3 border-bottom">
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-primary" @click="handleAdd">
          <i class="fa fa-plus me-1"></i>新增
        </button>
        <button class="btn btn-sm btn-info" @click="handleEdit">
          <i class="fa fa-edit me-1"></i>編輯
        </button>
        <button class="btn btn-sm btn-success" @click="handleOfficialEdit">
          <i class="fa fa-link me-1"></i>編輯依賴關係
        </button>
        <button class="btn btn-sm btn-danger" @click="handleDelete">
          <i class="fa fa-trash me-1"></i>刪除
        </button>

        <div class="vr"></div>

        <button class="btn btn-sm btn-outline-info" @click="handleExpandAll">
          <i class="fa fa-angle-double-down me-1"></i>全部展開
        </button>
        <button class="btn btn-sm btn-outline-info" @click="handleCollapseAll">
          <i class="fa fa-angle-double-up me-1"></i>全部收合
        </button>

        <div class="vr"></div>

        <button class="btn btn-sm btn-outline-secondary" @click="handleZoomIn">
          <i class="fa fa-search-plus me-1"></i>放大
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="handleZoomOut">
          <i class="fa fa-search-minus me-1"></i>縮小
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="handleZoomToFit">
          <i class="fa fa-expand-arrows-alt me-1"></i>最適縮放
        </button>

        <div class="vr"></div>

        <!-- 匯出按鈕（這是這次加的） -->
        <button class="btn btn-sm btn-outline-secondary" @click="handleExportPdf">
          <i class="fa fa-file-pdf me-1"></i>{{ pdfFontLoading ? '載入字型中…' : '匯出 PDF' }}
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="handleExportExcel">
          <i class="fa fa-file-excel me-1"></i>匯出 Excel
        </button>
      </div>

      <div class="d-flex gap-2 align-items-center">
        <div class="vr"></div>

        <!-- 時間尺度切換按鈕 -->
        <div class="btn-group" role="group">
          <button
            v-for="scale in timeScales"
            :key="scale.value"
            type="button"
            class="btn btn-sm"
            :class="currentScale === scale.value ? 'btn-primary' : 'btn-outline-primary'"
            @click="changeTimeScale(scale.value)"
          >
            <i :class="scale.icon" class="me-1"></i>
            {{ scale.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 甘特圖 -->
    <div class="gantt-wrapper flex-fill">
      <ejs-gantt
        ref="gantt"
        :key="ganttKey"
        :dataSource="ganttData"
        :taskFields="taskFields"
        :height="'100%'"
        :toolbar="[]"
        :editSettings="editSettings"
        :selectionSettings="selectionSettings"
        :allowRowDragAndDrop="true"
        :treeColumnIndex="1"
        :splitterSettings="splitterSettings"
        :timelineSettings="timelineSettings"
        :zoomingLevels="zoomingLevels"
        :highlightWeekends="false"
        :includeWeekend="true"
        :workWeek="workWeek"
        :enableCriticalPath="true"
        :editDialogFields="editDialogFields"
        :addDialogFields="addDialogFields"
        :autoCalculateDateScheduling="true"
        :allowParentDependency="false"
        :allowPdfExport="true"
        :allowExcelExport="true"
        :queryCellInfo="onQueryCellInfo"
        @actionComplete="onActionComplete"
        @actionBegin="onActionBegin"
        @taskbarEditing="onTaskbarEditing"
        @dataBound="onDataBound"
        :beforePdfExport="onBeforePdfExport"
        :pdfQueryCellInfo="onPdfQueryCellInfo"
        :pdfColumnHeaderQueryCellInfo="onPdfHeader"
        :pdfQueryTimelineCellInfo="onPdfTimeline"
        :pdfQueryTaskbarInfo="onPdfTaskbar"
        :pdfExportComplete="onPdfExportComplete"
        locale="zh"
      >
        <e-columns>
          <!-- 穩定主鍵（隱藏） - 供內部 TreeGrid 編輯使用 -->
          <e-column
            field="Uid"
            headerText="Uid"
            width="80"
            :isPrimaryKey="true"
            :visible="false"
          ></e-column>
          <e-column
            field="TaskID"
            headerText="任務ID"
            textAlign="Center"
            width="70"
          ></e-column>
          <e-column
            field="TaskName"
            headerText="任務名稱"
            textAlign="Left"
            width="200"
          ></e-column>
          <e-column
            field="StartDate"
            headerText="開始日期"
            textAlign="Center"
            width="130"
            :template="'dateTpl'"
          ></e-column>
          <e-column
            field="EndDate"
            headerText="結束日期"
            textAlign="Center"
            width="130"
            :template="'endDateTpl'"
          ></e-column>
          <e-column
            field="Duration"
            headerText="工期"
            textAlign="Center"
            width="80"
            :template="'durationTpl'"
          ></e-column>
          <e-column
            field="Predecessor"
            headerText="前置任務"
            textAlign="Left"
            width="120"
            :template="'predecessorTpl'"
          ></e-column>
        </e-columns>

        <!-- 日期欄位模板 -->
        <template v-slot:dateTpl="{ data }">
          <span>{{ formatDateForDisplay(data.StartDate) }}</span>
        </template>

        <!-- 結束日期欄位模板 -->
        <template v-slot:endDateTpl="{ data }">
          <span>{{ formatDateForDisplay(data.EndDate) }}</span>
        </template>

        <!-- 工期欄位模板 -->
        <template v-slot:durationTpl="{ data }">
          <span>{{ data.Duration ? `${data.Duration} 天` : '' }}</span>
        </template>

        <!-- 前置任務欄位模板 -->
        <template v-slot:predecessorTpl="{ data }">
          <span>{{ formatPredecessorDisplay(data.Predecessor) }}</span>
        </template>
      </ejs-gantt>
    </div>

    <!-- 自訂任務編輯對話框 -->
    <Modal
      v-model:show="showTaskDialog"
      :title="dialogTitle"
      :icon="dialogMode === 'add' ? 'fa fa-plus' : 'fa fa-edit'"
      :backdrop="false"
      @confirm="handleTaskSave"
    >
      <template #body>
        <form @submit.prevent="handleTaskSave">
          <div class="row g-3">
            <!-- 任務名稱 -->
            <div class="col-12">
              <label class="form-label">項目名稱 <span class="text-danger">*</span></label>
              <input
                v-model="taskForm.TaskName"
                type="text"
                class="form-control"
                placeholder="請輸入項目名稱"
                required
              />
            </div>

            <!-- 開始日期（父項禁用） -->
            <div
              class="col-md-6"
              :class="{ 'disabled-field': taskForm.isParentTask && dialogMode === 'edit' }"
            >
              <label class="form-label">開始日期</label>
              <RepublicDatePicker
                v-model="taskForm.StartDate"
                :use-republic-year="true"
                :max-date="taskForm.EndDate"
                :disabled="taskForm.isParentTask && dialogMode === 'edit'"
                @update:model-value="() => calculateDates('date')"
              />
            </div>

            <!-- 結束日期（父項禁用） -->
            <div
              class="col-md-6"
              :class="{ 'disabled-field': taskForm.isParentTask && dialogMode === 'edit' }"
            >
              <label class="form-label">結束日期</label>
              <RepublicDatePicker
                v-model="taskForm.EndDate"
                :use-republic-year="true"
                :min-date="taskForm.StartDate"
                :disabled="taskForm.isParentTask && dialogMode === 'edit'"
                @update:model-value="() => calculateDates('date')"
              />
            </div>

            <!-- 工期（父項禁用） -->
            <div
              class="col-md-6"
              :class="{ 'disabled-field': taskForm.isParentTask && dialogMode === 'edit' }"
            >
              <label class="form-label">工期（天）</label>
              <input
                v-model.number="taskForm.Duration"
                type="number"
                class="form-control"
                placeholder="請輸入工期"
                min="1"
                :disabled="taskForm.isParentTask && dialogMode === 'edit'"
                @input="() => calculateDates('duration')"
              />
            </div>

            <!-- 依賴關係（UI隱藏） -->
            <div
              v-if="false"
              class="col-12"
              :class="{ 'disabled-field': taskForm.isParentTask && dialogMode === 'edit' }"
            >
              <label class="form-label">前置任務</label>
              <input
                v-model="taskForm.Predecessor"
                type="text"
                class="form-control"
                placeholder="例如：1 FS, 2 SS+2"
                :readonly="true"
              />
              <div class="form-text">
                格式：任務ID 依賴類型[+延遲天數]，多個用逗號分隔<br />
                依賴類型：FS(完成-開始)、SS(開始-開始)、FF(完成-完成)、SF(開始-完成)
              </div>
            </div>

            <!-- 父項任務提示 -->
            <div
              v-if="taskForm.isParentTask && dialogMode === 'edit'"
              class="col-12"
            >
              <div class="alert alert-info mb-0">
                <i class="fa fa-info-circle me-2"></i>
                父項任務只能編輯名稱，其他欄位會根據子任務自動計算
              </div>
            </div>

            <!-- 新增位置提示（僅在新增時顯示） -->
            <div
              v-if="dialogMode === 'add' && selectedParentName"
              class="col-12"
            >
              <div class="alert alert-warning mb-0">
                <i class="fa fa-info-circle me-2"></i>
                將新增為「<strong>{{ selectedParentName }}</strong>」的子項目
                <button
                  type="button"
                  class="btn btn-sm btn-link float-end"
                  @click="taskForm.ParentID = null"
                >
                  改為頂層項目
                </button>
              </div>
            </div>
          </div>
        </form>
      </template>
    </Modal>
    <!-- 自訂「編輯依賴關係」對話框（仿官方） -->
    <Modal
      v-model:show="showDepDialog"
      title="編輯依賴關係"
      icon="fa fa-link"
      :backdrop="false"
      @confirm="handleDepSave"
    >
      <template #body>
        <div class="dep-grid">
          <div class="dep-grid-header d-flex align-items-center mb-2">
            <strong class="me-auto">依賴列表</strong>
            <button type="button" class="btn btn-sm btn-outline-primary" @click="handleDepAddRow">
              <i class="fa fa-plus me-1"></i>新增
            </button>
          </div>
          <div class="table-responsive dep-table-wrapper">
            <table class="table table-dark table-sm align-middle mb-0 dep-table">
              <thead>
                <tr>
                  <th style="width: 80px;">ID</th>
                  <th>任務名稱</th>
                  <th style="width: 140px;">類型</th>
                  <th style="width: 110px;">延遲</th>
                  <th style="width: 50px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in depRows" :key="row._id">
                  <td>
                    <select v-model="row.taskId" class="form-select form-select-sm">
                      <option value="">-- 選擇 --</option>
                      <option
                        v-for="opt in depTaskOptions"
                        :key="opt.taskId"
                        :value="opt.taskId"
                        :disabled="opt.taskId === editingDepTargetTaskId"
                      >
                        {{ opt.taskId }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <select v-model="row.taskId" class="form-select form-select-sm">
                      <option value="">-- 選擇任務 --</option>
                      <option
                        v-for="opt in depTaskOptions"
                        :key="opt.taskId + '-name'"
                        :value="opt.taskId"
                        :disabled="opt.taskId === editingDepTargetTaskId"
                      >
                        {{ opt.taskId }}　{{ opt.taskName }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <select v-model="row.type" class="form-select form-select-sm">
                      <option value="FS">Finish-Start</option>
                      <option value="SS">Start-Start</option>
                      <option value="FF">Finish-Finish</option>
                      <option value="SF">Start-Finish</option>
                    </select>
                  </td>
                  <td>
                    <div class="input-group input-group-sm">
                      <input
                        v-model.number="row.lag"
                        type="number"
                        min="0"
                        class="form-control"
                        style="min-width: 50px;"
                      />
                      <span class="input-group-text">days</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger" @click="handleDepRemoveRow(idx)">
                      <i class="fa fa-times"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!depRows.length">
                  <td colspan="5" class="text-center text-muted py-3">目前沒有依賴，點「新增」加入</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { provide, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { buildTreeFromFlat, ensureUidsInTree, getUidFromRecord, genUid } from '@/utils/schedule/tree'
import { computeDisplayIdsFromFlat, applyDisplayIdsToStore, rewritePredecessorByIdMap } from '@/utils/schedule/id'
import { updateParentAggregates } from '@/utils/schedule/aggregate'
import { useScheduleStore } from '@/stores/schedule'
import {
  GanttComponent as EjsGantt,
  ColumnsDirective as EColumns,
  ColumnDirective as EColumn,
} from '@syncfusion/ej2-vue-gantt'
import {
  Edit,
  Selection,
  Toolbar,
  RowDD,
  DayMarkers,
  CriticalPath,
  PdfExport,
  ExcelExport,
} from '@syncfusion/ej2-gantt'
import { L10n, setCulture } from '@syncfusion/ej2-base'
import {
  PdfTrueTypeFont,
  PdfStringFormat,
  PdfTextAlignment,
  PdfVerticalAlignment,
} from '@syncfusion/ej2-pdf-export'
import lxgWWenKaiTCHref from '@/assets/fonts/LXGWWenKaiTC-Regular.ttf?url'
import { toRepublicYear } from '@/utils/format'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'

// 設定文化
setCulture('zh')

// ✅ 注入 Gantt 服務（這裡加上 PdfExport / ExcelExport）
provide('gantt', [
  Edit,
  Selection,
  Toolbar,
  RowDD,
  DayMarkers,
  CriticalPath,
  PdfExport,
  ExcelExport,
])

// Props
interface Props {
  versionId?: number | null
}

const props = defineProps<Props>()

// Store
const scheduleStore = useScheduleStore()
const gantt = ref<any>(null)

// PDF 中文字型相關狀態
const pdfFontRef = ref<any>(null)
const pdfFontLoading = ref(false)
const pdfFontError = ref<string | null>(null)
const isPdfExporting = ref(false)
const pdfCenterNoWrap = new PdfStringFormat(PdfTextAlignment.Center, PdfVerticalAlignment.Middle)
;(pdfCenterNoWrap as any).wordWrap = 0

// 甘特圖重新渲染的 key
const ganttKey = ref(0)

// 防止重複處理 refresh 事件的標記
let isProcessingRefresh = false

// 拖拽處理標記
let isDragDropPending = false

// MutationObserver 用於監聽時間軸的 DOM 變化
let timelineObserver: MutationObserver | null = null
let timelineHeaderRootObserver: MutationObserver | null = null

// 多幀保險轉換：避免 Syncfusion 在我們之後又覆寫 header
const scheduleRocConversionBurst = (runs: number = 6, intervalMs: number = 50) => {
  let count = 0
  const tick = () => {
    requestAnimationFrame(() => convertToROCYear())
    count++
    if (count < runs) setTimeout(tick, intervalMs)
  }
  tick()
}

// ArrayBuffer -> base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode.apply(null, Array.from(sub) as number[])
  }
  return btoa(binary)
}

// 載入中文字型（匯出前先載好，不要在匯出事件裡 fetch）
const loadPdfChineseFont = async () => {
  if (pdfFontRef.value) return pdfFontRef.value

  pdfFontLoading.value = true

  try {
    const res = await fetch(lxgWWenKaiTCHref)
    if (!res.ok) throw new Error('無法讀取字型檔')

    const buf = await res.arrayBuffer()
    const b64 = arrayBufferToBase64(buf)
    const font = new PdfTrueTypeFont(b64, 10)
    pdfFontRef.value = font

    pdfFontLoading.value = false
    return font
  } catch (err) {
    pdfFontLoading.value = false
    console.error('載入中文字型失敗:', err)
    return null
  }
}

// 清洗特殊字符（避免掉回標準字型時爆錯）
const safeText = (v: string) => {
  if (typeof v !== 'string') return v

  let out = v
    // 1. 換掉容易出現在中文 UI 的特殊 … — –
    .replace(/…/g, '...')
    .replace(/[“”]/g, '"')
    .replace(/[‘']/g, "'")
    .replace(/—|–/g, '-')
    // 2. 全形空白 → 半形
    .replace(/\u3000/g, ' ')
    // 3. emoji / surrogate pair
    .replace(/[\uD800-\uDFFF]/g, '')
    // 4. 私用區 (FontAwesome 很愛用這段)
    .replace(/[\uE000-\uF8FF]/g, '')
    // 5. 真的還看不懂的控制字元
    .replace(/[\u200B-\u200F]/g, '')

  return out
}

// 綁定時間軸容器的 MutationObserver（容器可能被替換，需重綁）
const bindTimelineObserver = () => {
  try {
    const container = document.querySelector('.e-timeline-header-container')
    if (!container) return
    if (timelineObserver) {
      timelineObserver.disconnect()
      timelineObserver = null
    }
    timelineObserver = new MutationObserver((mutations) => {
      let needsConversion = false
      mutations.forEach((m) => {
        if (m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)) needsConversion = true
        if (m.type === 'characterData') needsConversion = true
      })
      if (needsConversion) scheduleRocConversionBurst(4, 40)
    })
    timelineObserver.observe(container, { childList: true, subtree: true, characterData: true })
  } catch {}
}

// 監聽容器本身的替換，一旦出現新的 header 容器就重綁並轉換
const ensureHeaderRootObserver = () => {
  try {
    if (timelineHeaderRootObserver) return
    timelineHeaderRootObserver = new MutationObserver(() => {
      const container = document.querySelector('.e-timeline-header-container')
      if (container) {
        bindTimelineObserver()
        scheduleRocConversionBurst(6, 40)
      }
    })
    timelineHeaderRootObserver.observe(document.body, { childList: true, subtree: true })
  } catch {}
}

// 將對話框中顯示的 UID 文字替換為階層 TaskID（僅影響顯示，不影響底層值）
const buildUidToTaskIdMap = () => {
  const map = new Map<string, string>()
  try {
    const gi = (gantt.value as any)?.ej2Instances
    if (!gi || !Array.isArray(gi.flatData)) return map
    gi.flatData.forEach((row: any) => {
      const uid = String(getUidFromRecord(row) || '')
      if (!uid) return
      const taskId = row.TaskID != null ? String(row.TaskID) : ''
      if (taskId) map.set(uid, taskId)
    })
  } catch {}
  return map
}
const replaceUidWithTaskIdInDialog = (root?: Element | Document) => {
  try {
    const container = (root as Element) || document
    const map = buildUidToTaskIdMap()
    if (map.size === 0) return

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    const texts: Text[] = []
    let node: any
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.length > 0) texts.push(node as Text)
    }
    texts.forEach((t) => {
      let content = t.nodeValue || ''
      map.forEach((taskId, uid) => {
        if (content!.includes(uid)) content = content!.split(uid).join(taskId)
      })
      if (content !== t.nodeValue) t.nodeValue = content
    })

    const inputs = (container as Element).querySelectorAll?.('input, textarea') || []
    inputs.forEach((el: any) => {
      if (typeof el.value === 'string' && el.value) {
        let v = el.value
        map.forEach((taskId, uid) => {
          if (v.includes(uid)) v = v.split(uid).join(taskId)
        })
        if (v !== el.value) el.value = v
      }
      if (typeof el.placeholder === 'string' && el.placeholder) {
        let p = el.placeholder
        map.forEach((taskId, uid) => {
          if (p.includes(uid)) p = p.split(uid).join(taskId)
        })
        if (p !== el.placeholder) el.placeholder = p
      }
    })
  } catch (e) {
    console.warn('替換對話框 UID 顯示失敗：', e)
  }
}

// 對外通知：甘特圖已同步資料
const notifyScheduleUpdated = () => {
  try {
    window.dispatchEvent(new CustomEvent('scheduleUpdated'))
  } catch {}
}

const normalizeGanttPredecessors = (gi: any) => {
  if (!gi || !Array.isArray(gi.flatData)) return

  gi.flatData.forEach((row: any) => {
    const gp = row?.ganttProperties
    if (gp) {
      if (gp.predecessor == null) gp.predecessor = []
      if (gp.predecessorsName == null) gp.predecessorsName = ''
    }

    if (row.Predecessor == null) {
      row.Predecessor = ''
      if (row.taskData) row.taskData.Predecessor = ''
    }
  })
}

// 當前版本
const currentVersion = computed(() => {
  if (props.versionId) {
    return scheduleStore.versions.find((v) => v.id === props.versionId)
  }
  return scheduleStore.currentVersion
})

// 生成階層式任務ID
const generateHierarchicalTaskId = (tasks: any[]): void => {
  const generateIds = (taskList: any[], parentId: string = '') => {
    taskList.forEach((task, index) => {
      const currentId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`
      task.TaskID = currentId

      if (task.subtasks && task.subtasks.length > 0) {
        generateIds(task.subtasks, currentId)
      }
    })
  }

  generateIds(tasks)
}

// 計算父項任務的工期（根據子項目統計）
const calculateParentDuration = (task: any): number => {
  if (!task.subtasks || task.subtasks.length === 0) {
    return task.Duration || 0
  }

  let totalDuration = 0
  task.subtasks.forEach((subtask: any) => {
    totalDuration += calculateParentDuration(subtask)
  })

  return totalDuration
}

// 更新父項任務的工期
const updateParentDurations = (tasks: any[]): void => {
  tasks.forEach((task) => {
    if (task.subtasks && task.subtasks.length > 0) {
      task.Duration = calculateParentDuration(task)
      updateParentDurations(task.subtasks)
    }
  })
}

// 甘特圖數據 - 從 store 轉換格式（以 Uid 為主鍵）
const ganttData = computed(() => {
  try {
    if (!currentVersion.value?.tasks) return []

    ensureUidsInTree(currentVersion.value.tasks)
    updateParentDurations(currentVersion.value.tasks)

    const taskIdToUid: Record<string, string> = {}
    const uidToTaskId: Record<string, string> = {}
    const buildMap = (tasks: any[]) => {
      tasks.forEach((t) => {
        if (t.TaskID != null && t.Uid) {
          taskIdToUid[String(t.TaskID)] = String(t.Uid)
          uidToTaskId[String(t.Uid)] = String(t.TaskID)
        }
        if (t.subtasks && t.subtasks.length > 0) buildMap(t.subtasks)
      })
    }
    buildMap(currentVersion.value.tasks)

    const convertTask = (task: any): any => {
      if (!task || typeof task !== 'object') {
        console.warn('無效的任務數據:', task)
        return null
      }

      let cleanedPredecessor = ''
      if (task.Predecessor) {
        // 先去重並避免自指（以 TaskID 格式）
        const dedup = normalizePredecessors(task.Predecessor, {}, { taskId: String(task.TaskID || '') })
        // 再將 TaskID 轉成 Syncfusion 吃的 UID 格式
        const deps = dedup.split(',').map((d) => d.trim()).filter(Boolean)
        const mapped: string[] = []
        deps.forEach((d) => {
          const match = d.match(/^(\d+(?:\.\d+)*)\s+(FS|SS|FF|SF)(?:\+(\d+))?$/i)
          if (!match) return
          const depTaskId = match[1]
          const type = match[2]
          const offset = match[3]
          if (depTaskId === String(task.TaskID)) return
          const targetUid = taskIdToUid[depTaskId]
          if (!targetUid) return
          mapped.push(`${targetUid} ${type}${offset ? `+${offset}` : ''}`)
        })
        cleanedPredecessor = mapped.join(', ')
      }

      const converted: any = {
        Uid: String(task.Uid || ''),
        TaskID: String(task.TaskID || ''),
        TaskName: String(task.TaskName || ''),
        StartDate: task.StartDate ? new Date(task.StartDate) : null,
        EndDate: task.EndDate ? new Date(task.EndDate) : null,
        Duration: Number(task.Duration || 0),
        Progress: Number(task.Progress || 0),
        Predecessor: cleanedPredecessor,
      }

      if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        converted.subtasks = task.subtasks
          .map((subtask: any) => convertTask(subtask))
          .filter(Boolean)
      } else {
        converted.subtasks = []
      }

      return converted
    }

    const convertedTasks = currentVersion.value.tasks
      .map((task) => convertTask(task))
      .filter(Boolean)

    return convertedTasks
  } catch (error) {
    console.error('甘特圖數據轉換錯誤:', error)
    return []
  }
})

// 任務欄位映射
const taskFields = {
  id: 'Uid',
  name: 'TaskName',
  startDate: 'StartDate',
  endDate: 'EndDate',
  duration: 'Duration',
  dependency: 'Predecessor',
  child: 'subtasks',
}

// 工作週設定（包含所有天數，工地不休假）
const workWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// 監聽數據變化，只在版本切換時強制甘特圖重新渲染
watch(
  () => currentVersion.value?.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      ganttKey.value++
    }
  },
)

// 標記是否正在同步，避免無限循環
const isSyncing = ref(false)

// 只在版本切換時手動更新甘特圖數據
watch(
  () => currentVersion.value?.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      const ganttInstance = (gantt.value as any)?.ej2Instances
      if (
        ganttInstance &&
        ganttData.value &&
        !(
          ganttInstance.isEdit ||
          ganttInstance.isDrag ||
          ganttInstance.isResize ||
          ganttInstance.isLoading ||
          ganttInstance.isRefreshing ||
          ganttInstance.isRendering
        )
      ) {
        ganttInstance.dataSource = ganttData.value
        ganttInstance.refresh()
      }
    }
  },
)

// 編輯設定
const editSettings = {
  allowAdding: true,
  allowEditing: true,
  allowDeleting: true,
  allowTaskbarEditing: true,
  showDeleteConfirmDialog: true,
  mode: 'Dialog',
}

// 編輯對話框欄位設定
const editDialogFields = [
  { type: 'General', headerText: '一般' },
  { type: 'Dependency', headerText: '依賴關係' },
]

// 新增對話框欄位設定
const addDialogFields = [
  { type: 'General', headerText: '一般' },
  { type: 'Dependency', headerText: '依賴關係' },
]

// 選擇設定
const selectionSettings = {
  mode: 'Row',
  type: 'Single',
}

// 關鍵路徑固定關閉
const enableCriticalPath = ref(false)

// 任務編輯對話框
const showTaskDialog = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingTaskId = ref<number | null>(null)

const taskForm = ref({
  Uid: '',
  TaskID: 0,
  TaskName: '',
  StartDate: '',
  EndDate: '',
  Duration: 1,
  ParentID: null as number | null,
  Predecessor: '',
  isParentTask: false,
})

const showDepDialog = ref(false)
const editingDepTargetTaskId = ref<string>('')
const depRows = ref<Array<{ _id: string; taskId: string; type: 'FS' | 'SS' | 'FF' | 'SF'; lag: number }>>([])

// 選中的父項目名稱
const selectedParentName = computed(() => {
  if (!taskForm.value.ParentID) return null

  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return null

  const parentRecord = ganttInstance.flatData?.find((item: any) => item.TaskID === taskForm.value.ParentID)
  return parentRecord?.TaskName || null
})

const depTaskOptions = computed(() => {
  const gi = (gantt.value as any)?.ej2Instances
  if (!gi?.flatData) return [] as Array<{ taskId: string; taskName: string }>
  return gi.flatData.map((r: any) => ({
    taskId: String(r.TaskID ?? ''),
    taskName: String(r.TaskName ?? ''),
  }))
})

// 對話框標題
const dialogTitle = computed(() => {
  return dialogMode.value === 'add' ? '新增排程項目' : '編輯排程項目'
})

// 分隔器設定
const splitterSettings = computed(() => ({
  position: '40%',
  columnIndex: 2,
}))

// 當前時間尺度
const currentScale = ref('week')

// 時間尺度選項
const timeScales = [
  { value: 'day', label: '日', icon: 'fa fa-calendar-day' },
  { value: 'week', label: '週', icon: 'fa fa-calendar-week' },
  { value: 'month', label: '月', icon: 'fa fa-calendar-alt' },
  { value: 'quarter', label: '季', icon: 'fa fa-calendar' },
  { value: 'year', label: '年', icon: 'fa fa-calendar' },
]

// 時間軸設定
const timelineSettings = ref({
  topTier: { unit: 'Month', format: 'yyyy年M月', count: 1 },
  bottomTier: { unit: 'Week', format: 'M/d', count: 1 },
  timelineUnitSize: 60,
  weekStartDay: 0,
})

// 自定義縮放級別
const zoomingLevels = [
  {
    topTier: { unit: 'Year', format: 'yyyy年', count: 1 },
    bottomTier: { unit: 'Month', format: 'M月', count: 6 },
    timelineUnitSize: 55,
    level: 0,
  },
  {
    topTier: { unit: 'Year', format: 'yyyy年', count: 1 },
    bottomTier: { unit: 'Month', format: 'M月', count: 3 },
    timelineUnitSize: 55,
    level: 1,
  },
  {
    topTier: { unit: 'Year', format: 'yyyy年', count: 1 },
    bottomTier: { unit: 'Month', format: 'M月', count: 1 },
    timelineUnitSize: 55,
    level: 2,
  },
  {
    topTier: { unit: 'Month', format: 'yyyy年M月', count: 1 },
    bottomTier: { unit: 'Week', format: 'M/d', count: 1 },
    timelineUnitSize: 60,
    level: 3,
  },
  {
    topTier: { unit: 'Week', format: 'yyyy年M月d日', count: 1 },
    bottomTier: { unit: 'Day', format: 'd', count: 1 },
    timelineUnitSize: 35,
    level: 4,
  },
]

// 縮放級別映射
const levelToScaleMap: { [key: number]: string } = {
  0: 'year',
  1: 'quarter',
  2: 'month',
  3: 'week',
  4: 'day',
}

const scaleToLevelMap: { [key: string]: number } = {
  year: 0,
  quarter: 1,
  month: 2,
  week: 3,
  day: 4,
}

// 格式化日期為民國年格式
const formatDateForDisplay = (date: Date | string | null | undefined): string => {
  try {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const rocYear = toRepublicYear(d.getFullYear())
    const month = d.getMonth() + 1
    const day = d.getDate()

    return `${rocYear}/${month}/${day}`
  } catch (error) {
    console.error('Date format error:', error)
    return ''
  }
}

// 顯示模式：用 ID 或 NAME 顯示前置任務（保留備用，目前不使用）
const predecessorDisplayMode = ref<'id' | 'name'>('id')

const buildUidLabelMap = () => {
  const map = new Map<string, { id: string; name: string }>()
  const gi = (gantt.value as any)?.ej2Instances
  if (!gi || !Array.isArray(gi.flatData)) return map

  gi.flatData.forEach((row: any) => {
    const uid = String(getUidFromRecord(row) || '')
    if (!uid) return
    map.set(uid, {
      id: row.TaskID != null ? String(row.TaskID) : '',
      name: row.TaskName || '',
    })
  })

  return map
}

const buildTaskIdToUidMap = () => {
  const map = new Map<string, string>()
  const gi = (gantt.value as any)?.ej2Instances
  if (!gi || !Array.isArray(gi.flatData)) return map

  gi.flatData.forEach((row: any) => {
    const uid = String(getUidFromRecord(row) || '')
    const taskId = row.TaskID != null ? String(row.TaskID) : ''
    if (!uid || !taskId) return
    if (!map.has(taskId)) {
      map.set(taskId, uid)
    }
  })

  return map
}

const convertTaskIdPredecessorToUid = (
  text: string,
  taskIdToUidMap: Map<string, string>,
): { ganttText: string; predArray: Array<{ from: string; type: string; offset: number }> } => {
  const seen = new Set<string>()
  const ganttParts: string[] = []
  const predArray: Array<{ from: string; type: string; offset: number }> = []

  if (!text) {
    return { ganttText: '', predArray }
  }

  const segments = text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  segments.forEach((segment) => {
    const match = segment.match(/^(\d+(?:\.\d+)*)\s+(FS|SS|FF|SF)(?:([+-]\d+))?$/i)
    if (!match) return

    const taskId = match[1]
    const type = match[2].toUpperCase()
    const lagRaw = match[3] || ''
    const uid = taskIdToUidMap.get(taskId)
    if (!uid) return

    const offset = lagRaw ? parseInt(lagRaw, 10) || 0 : 0
    const key = `${uid}|${type}|${offset}`
    if (seen.has(key)) return
    seen.add(key)

    const lagText = offset ? `${offset > 0 ? '+' : ''}${offset}` : ''

    ganttParts.push(`${uid} ${type}${lagText}`)
    predArray.push({ from: uid, type, offset })
  })

  return {
    ganttText: ganttParts.join(', '),
    predArray,
  }
}

const buildPredecessorTextFromArray = (
  list: Array<{ from: string; type?: string; offset?: number }> | undefined,
  uidLabelMap?: Map<string, { id: string; name: string }>,
): string => {
  if (!list || !Array.isArray(list) || list.length === 0) {
    return ''
  }
  const map = uidLabelMap || buildUidLabelMap()
  const seen = new Set<string>()
  const parts: string[] = []
  list.forEach((p) => {
    const fromUid = String(p.from || '')
    if (!fromUid) return
    const info = map.get(fromUid)
    const id = info?.id || fromUid
    const name = info?.name || ''
    const type = (p.type || 'FS').toUpperCase()
    const offsetNum = Number(p.offset || 0)
    const key = `${id}|${type}|${offsetNum}`
    if (seen.has(key)) return
    seen.add(key)
    const offsetText = offsetNum ? `+${offsetNum}天` : ''
    const label = `${id} ${name}`.trim()
    parts.push(`${label} ${type}${offsetText}`.trim())
  })
  return parts.join(', ')
}

const buildTaskIdPredecessorText = (
  list: Array<{ from: string; type?: string; offset?: number }> | undefined,
  uidLabelMap?: Map<string, { id: string; name: string }>,
): string => {
  if (!list || !Array.isArray(list) || list.length === 0) {
    return ''
  }
  const map = uidLabelMap || buildUidLabelMap()
  const seen = new Set<string>()
  const parts: string[] = []
  list.forEach((p) => {
    const fromUid = String(p.from || '')
    if (!fromUid) return
    const info = map.get(fromUid)
    const id = info?.id || fromUid
    if (!id) return
    const type = (p.type || 'FS').toUpperCase()
    const offsetNum = Number(p.offset || 0)
    const key = `${id}|${type}|${offsetNum}`
    if (seen.has(key)) return
    seen.add(key)
    let offsetText = ''
    if (offsetNum) {
      offsetText = `${offsetNum > 0 ? '+' : ''}${offsetNum}`
    }
    parts.push(`${id} ${type}${offsetText}`.trim())
  })
  return parts.join(', ')
}

const convertPredecessorUidToTaskIdText = (text: string): string => {
  if (!text) return ''
  try {
    const map = buildUidLabelMap()
    const cleaned = String(text).replace(/\s*天|\s*days?/gi, '')
    const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean)
    const out: string[] = []
    for (const p of parts) {
      const m = p.match(/^([^\s,]+)\s*(FS|SS|FF|SF)?\s*([+-]?\d+)?$/i)
      if (!m) {
        out.push(p)
        continue
      }
      const uidOrId = m[1]
      const type = (m[2] || 'FS').toUpperCase()
      const off = m[3] ? (m[3].startsWith('+') || m[3].startsWith('-') ? m[3] : `+${m[3]}`) : ''
      const info = map.get(uidOrId)
      const id = info ? info.id : uidOrId
      out.push(`${id} ${type}${off}`.trim())
    }
    return out.join(', ')
  } catch {
    return text
  }
}

const formatPredecessorBase = (text: string): string => {
  if (!text) return ''
  const removedUnit = text.replace(/\s*days?/gi, '')
  const normalized = removedUnit.replace(/([+-])\s*([\d\s]+)(?=\b|$)/g, (_m, sign: string, digits: string) => {
    const n = digits.replace(/\s+/g, '')
    if (!n) return sign
    return `${sign}${n}天`
  })
  return normalized
}

const formatPredecessorDisplay = (
  predecessor: string | Array<{ from: string; type?: string; offset?: number }> | null | undefined,
): string => {
  if (Array.isArray(predecessor)) {
    return buildPredecessorTextFromArray(predecessor)
  }
  if (!predecessor) return ''

  const map = buildUidLabelMap()
  const parts = predecessor
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  const out: string[] = []

  for (const part of parts) {
    const m = part.match(/^([^\s]+)\s*(FS|SS|FF|SF)?\s*([+-]\d+)?$/i)
    if (!m) {
      out.push(part)
      continue
    }

    const uid = m[1]
    const type = (m[2] || 'FS').toUpperCase()
    const offset = m[3] ? `${m[3]}天` : ''

    const info = map.get(uid)

    if (!info) {
      out.push(`${uid} ${type}${offset}`.trim())
      continue
    }

    const label = `${info.id} ${info.name}`.trim()
    out.push(`${label} ${type}${offset}`.trim())
  }

  return out.join(', ')
}

const onQueryCellInfo = (args: any) => {
  if (args?.column?.field !== 'Predecessor') return

  const display = formatPredecessorDisplay(args.data?.Predecessor || '')
  if (args.cell) {
    args.cell.textContent = display
  }
}

const calculateDates = (source: 'date' | 'duration' = 'date') => {
  const startDate = taskForm.value.StartDate
  const endDate = taskForm.value.EndDate
  const duration = taskForm.value.Duration

  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      alert('開始時間不能超過結束時間，請重新選擇')
      if (source === 'date') {
        const startTime = new Date(taskForm.value.StartDate).getTime()
        const endTime = new Date(taskForm.value.EndDate).getTime()
        if (startTime > endTime) {
          taskForm.value.StartDate = ''
        } else {
          taskForm.value.EndDate = ''
        }
      }
      return
    }
  }

  if (source === 'date' && startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const timeDiff = end.getTime() - start.getTime()
    const calculatedDuration = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1
    if (calculatedDuration > 0 && calculatedDuration !== taskForm.value.Duration) {
      taskForm.value.Duration = calculatedDuration
    }
    return
  }

  if (source === 'duration' && startDate && duration && duration > 0) {
    const start = new Date(startDate)
    const calculatedEnd = new Date(start)
    calculatedEnd.setDate(start.getDate() + duration - 1)
    const endDateStr = calculatedEnd.toISOString().split('T')[0]
    if (endDateStr !== taskForm.value.EndDate) {
      taskForm.value.EndDate = endDateStr
    }
  }
}

const convertToROCYear = () => {
  const headers = document.querySelectorAll(
    '.e-timeline-top-header-cell, .e-timeline-header-container .e-header-cell-label, .e-timeline-bottom-header-cell',
  )

  headers.forEach((header: any) => {
    try {
      let text = (header.textContent || header.innerText || '').trim()
      if (!text) return
      if (text.includes('民國')) return

      const yearRegex = /(^|[^\d])(\d{4})(?!\d)/
      const m = text.match(yearRegex)
      if (!m) return

      const westernYear = parseInt(m[2], 10)
      if (isNaN(westernYear)) return
      const rocYear = toRepublicYear(westernYear)

      let newText = text
      if (/\d{4}年/.test(text)) {
        newText = text.replace(/\d{4}年/, `民國${rocYear}年`)
      } else if (/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(text)) {
        newText = text.replace(/(\d{4})(?!\d)/, `民國${rocYear}年`)
      } else {
        newText = text.replace(/(\d{4})(?!\d)/, `民國${rocYear}年`)
      }

      header.textContent = newText
      header.setAttribute('data-roc-converted', 'true')
    } catch {}
  })
}

const resetTimelineHeaders = () => {
  try {
    const headers = document.querySelectorAll('.e-timeline-top-header-cell')
    headers.forEach((h: any) => h.removeAttribute('data-roc-converted'))
  } catch {}
}

// 切換時間尺度
const changeTimeScale = (scale: string) => {
  currentScale.value = scale

  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return

  const zoomLevel = scaleToLevelMap[scale] ?? 3

  if (ganttInstance.zoomIn) {
    while (ganttInstance.currentZoomingLevel.level !== zoomLevel) {
      if (ganttInstance.currentZoomingLevel.level < zoomLevel) {
        ganttInstance.zoomIn()
      } else {
        ganttInstance.zoomOut()
      }
    }
  }
}

// 自訂工具列事件
const handleAdd = () => {
  dialogMode.value = 'add'

  const ganttInstance = (gantt.value as any)?.ej2Instances

  let parentId = null
  if (ganttInstance && ganttInstance.selectedRowIndex !== -1) {
    const selectedRecord = ganttInstance.currentViewData?.[ganttInstance.selectedRowIndex]
    if (selectedRecord && !selectedRecord.parentItem) {
      parentId = selectedRecord.TaskID
    }
  }

  taskForm.value = {
    Uid: '',
    TaskID: 0,
    TaskName: '',
    StartDate: '',
    EndDate: '',
    Duration: 1,
    ParentID: parentId,
    Predecessor: '',
    isParentTask: false,
  }
  showTaskDialog.value = true
}

const handleEdit = () => {
  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return

  const selectedIndex = ganttInstance.selectedRowIndex
  if (selectedIndex === -1) {
    alert('請先選擇要編輯的任務')
    return
  }

  const selected = ganttInstance.currentViewData[selectedIndex]
  if (!selected) {
    alert('無法取得選中的任務資料')
    return
  }

  const isParentTask = selected.hasChildRecords || false

  dialogMode.value = 'edit'
  editingTaskId.value = selected.TaskID

  taskForm.value = {
    Uid: getUidFromRecord(selected),
    TaskID: selected.TaskID,
    TaskName: selected.TaskName || '',
    StartDate: selected.StartDate ? new Date(selected.StartDate).toISOString().split('T')[0] : '',
    EndDate: selected.EndDate ? new Date(selected.EndDate).toISOString().split('T')[0] : '',
    Duration: selected.Duration || 1,
    ParentID: null,
    Predecessor: convertPredecessorUidToTaskIdText(selected.Predecessor || ''),
    isParentTask,
  }

  showTaskDialog.value = true
}

// 動態隱藏 Tab 標題欄並修改對話框標題和翻譯
const hideTabHeaders = () => {
  const translations = {
    Predecessor: '前置任務',
    'Dependency Type': '依賴類型',
    Type: '類型',
    Offset: '延遲',
    Lag: '延遲',
    Add: '新增',
    Remove: '移除',
    OK: '確定',
    Cancel: '取消',
    Save: '儲存',
    Close: '關閉',
    'Select Predecessor': '選擇前置任務',
    'Add Predecessor': '新增前置任務',
    'Remove Predecessor': '移除前置任務',
    Dependency: '依賴關係',
    'Edit Task': '編輯任務',
    'Add Task': '新增任務',
    'No records to display': '無記錄可顯示',
    'No Records': '無記錄',
    'No Data': '無資料',
  }

  const translateText = (element: HTMLElement) => {
    if (element.textContent) {
      const originalText = element.textContent.trim()
      if (translations[originalText as keyof typeof translations]) {
        element.textContent = translations[originalText as keyof typeof translations]
      }
    }
  }

  const translateAllText = (container: Element) => {
    const buttons = container.querySelectorAll('button, .e-btn')
    buttons.forEach((button) => translateText(button as HTMLElement))

    const labels = container.querySelectorAll('label, .e-label')
    labels.forEach((label) => translateText(label as HTMLElement))

    const options = container.querySelectorAll('option')
    options.forEach((option) => translateText(option as HTMLElement))

    const titles = container.querySelectorAll('.e-dlg-header, .e-tab-header, .e-header')
    titles.forEach((title) => translateText(title as HTMLElement))

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
    let node
    while ((node = walker.nextNode())) {
      if (node.textContent) {
        const originalText = node.textContent.trim()
        if (translations[originalText as keyof typeof translations]) {
          node.textContent = translations[originalText as keyof typeof translations]
        }
      }
    }
  }

  const tabHeaders = document.querySelectorAll('.e-tab-header')
  tabHeaders.forEach((header) => {
    if (header instanceof HTMLElement) {
      header.style.display = 'none'
    }
  })

  const specificTabHeaders = document.querySelectorAll('.e-tab-header.e-control.e-toolbar.e-lib.e-keyboard')
  specificTabHeaders.forEach((header) => {
    if (header instanceof HTMLElement) {
      header.style.display = 'none'
    }
  })

  const dialogTitles = document.querySelectorAll('.e-dialog .e-dlg-header-content .e-dlg-header')
  dialogTitles.forEach((title) => {
    if (title instanceof HTMLElement) {
      title.textContent = '編輯依賴關係'
    }
  })

  const dialogs = document.querySelectorAll('.e-dialog')
  dialogs.forEach((dialog) => {
    translateAllText(dialog)
  })

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element

          const tabHeaders = element.querySelectorAll('.e-tab-header')
          tabHeaders.forEach((header) => {
            if (header instanceof HTMLElement) {
              header.style.display = 'none'
            }
          })

          if (element.classList.contains('e-tab-header')) {
            ;(element as HTMLElement).style.display = 'none'
          }

          const dialogTitles = element.querySelectorAll('.e-dialog .e-dlg-header-content .e-dlg-header')
          dialogTitles.forEach((title) => {
            if (title instanceof HTMLElement) {
              title.textContent = '編輯依賴關係'
            }
          })

          if (element.classList.contains('e-dlg-header')) {
            ;(element as HTMLElement).textContent = '編輯依賴關係'
          }

          if (element.classList.contains('e-dialog')) {
            translateAllText(element)
          }

          const dialogs = element.querySelectorAll('.e-dialog')
          dialogs.forEach((dialog) => {
            translateAllText(dialog)
          })
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  setTimeout(() => {
    observer.disconnect()
  }, 5000)
}

// 開啟官方依賴關係編輯視窗
const handleOfficialEdit = () => {
  const gi = (gantt.value as any)?.ej2Instances
  if (!gi) {
    alert('甘特圖尚未初始化')
    return
  }

  const idx = gi.selectedRowIndex
  if (idx == null || idx === -1) {
    alert('請先選擇要編輯依賴的任務')
    return
  }

  const row = gi.currentViewData[idx]
  if (!row) {
    alert('無法取得選中的任務資料')
    return
  }

  if (row.hasChildRecords) {
    alert('父項任務的依賴關係由子項任務推算，無法手動編輯')
    return
  }

  editingDepTargetTaskId.value = String(row.TaskID ?? '')

  const rows: Array<{ _id: string; taskId: string; type: 'FS' | 'SS' | 'FF' | 'SF'; lag: number }> = []

  const rawFromCell = (row.Predecessor || '').trim()

  if (rawFromCell) {
    const displayText = convertPredecessorUidToTaskIdText(rawFromCell)
    displayText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((part) => {
        const m = part.match(/^(\S+)\s+(FS|SS|FF|SF)(?:\+(\d+))?$/i)
        if (!m) return
        rows.push({
          _id: genUid(),
          taskId: m[1],
          type: m[2].toUpperCase() as 'FS' | 'SS' | 'FF' | 'SF',
          lag: m[3] ? Number(m[3]) : 0,
        })
      })
  } else {
    rows.length = 0
  }

  depRows.value = rows
  showDepDialog.value = true
}

const handleDepAddRow = () => {
  depRows.value.push({
    _id: genUid(),
    taskId: '',
    type: 'FS',
    lag: 0,
  })
}

const handleDepRemoveRow = (idx: number) => {
  depRows.value.splice(idx, 1)
}

const handleDepSave = () => {
  const gi = (gantt.value as any)?.ej2Instances
  if (!gi) {
    showDepDialog.value = false
    return
  }

  const idx = gi.selectedRowIndex
  if (idx == null || idx === -1) {
    showDepDialog.value = false
    return
  }

  const row = gi.currentViewData[idx]
  if (!row) {
    showDepDialog.value = false
    return
  }

  if (!row.taskData) {
    row.taskData = { ...row }
  }

  const taskIdToUid = new Map<string, string>()
  gi.flatData?.forEach((r: any) => {
    const tid = String(r.TaskID ?? '')
    const uid = String(r.Uid || r.ganttProperties?.rowUniqueID || '')
    if (tid && uid) taskIdToUid.set(tid, uid)
  })

  const applyAndRefresh = (predecessor: string) => {
    row.Predecessor = predecessor
    row.taskData.Predecessor = predecessor

    if (gi.connectorLineEditModule?.updatePredecessor) {
      gi.connectorLineEditModule.updatePredecessor(row, predecessor)
    }

    gi.updateRecordByID(row)
    normalizeGanttPredecessors(gi)

    try {
      syncToStore()
      scheduleStore.saveToLocalStorage()
    } catch (error) {
      console.warn('同步依賴資料到 store 失敗', error)
    }

    showDepDialog.value = false
  }

  if (!depRows.value.length) {
    if (row.ganttProperties) {
      row.ganttProperties.predecessor = []
      row.ganttProperties.predecessorsName = ''
    }
    ;(row.taskData as any).taskIdPredecessorText = ''
    applyAndRefresh('')
    return
  }

  const ganttParts: string[] = []
  const storeParts: string[] = []
  const seen = new Set<string>()

  depRows.value.forEach((r) => {
    if (!r.taskId) return
    if (r.taskId === editingDepTargetTaskId.value) return

    const fromUid = taskIdToUid.get(r.taskId)
    if (!fromUid) return

    const key = `${fromUid}|${r.type}|${r.lag || 0}`
    if (seen.has(key)) return
    seen.add(key)

    const lagText = r.lag && r.lag > 0 ? `+${r.lag}` : ''

    ganttParts.push(`${fromUid} ${r.type}${lagText}`)
    storeParts.push(`${r.taskId} ${r.type}${lagText}`)

  })

  const ganttPredecessor = ganttParts.join(', ')
  const storePredecessor = storeParts.join(', ')

  ;(row.taskData as any).taskIdPredecessorText = storePredecessor

  applyAndRefresh(ganttPredecessor)
}

const handleDelete = () => {
  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return

  const selectedIndex = ganttInstance.selectedRowIndex
  if (selectedIndex === -1) {
    alert('請先選擇要刪除的任務')
    return
  }

  const selected = ganttInstance.currentViewData[selectedIndex]
  if (!selected) {
    alert('無法取得選中的任務資料')
    return
  }

  const uid = getUidFromRecord(selected)
  ganttInstance.deleteRecord(uid || selected.TaskID)
}

const handleExpandAll = () => {
  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return
  ganttInstance.expandAll()
}

const handleCollapseAll = () => {
  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return
  ganttInstance.collapseAll()
}

const handleZoomIn = () => {
  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return
  ganttInstance.zoomIn()
}

const handleZoomOut = () => {
  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return
  ganttInstance.zoomOut()
}

const handleZoomToFit = () => {
  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return
  ganttInstance.fitToProject()
}

// 取得目前 Gantt instance
const getGantt = () => (gantt.value as any)?.ej2Instances

const scheduleSyncAfterDependencyChange = (retries = 8, delay = 160) => {
  const gi = getGantt()
  if (!gi) return

  if (
    gi.isEdit ||
    gi.isDrag ||
    gi.isResize ||
    gi.isLoading ||
    gi.isRefreshing ||
    gi.isRendering
  ) {
    if (retries > 0) {
      setTimeout(() => scheduleSyncAfterDependencyChange(retries - 1, delay), delay)
    }
    return
  }

  try {
    normalizeGanttPredecessors(gi)
    syncToStore()
    scheduleStore.saveToLocalStorage()
  } catch (error) {
    console.error('同步依賴關係到 store 時發生錯誤:', error)
  }
}

// 把 ganttProperties.predecessor 轉成「TaskID TYPE(+offset)」字串，並去重/避免自指
const normalizePredecessors = (
  raw: any[] | string | null | undefined,
  uidToTaskId: Record<string, string>,
  self: { uid?: string; taskId?: string } = {},
): string => {
  if (!raw) return ''

  const selfTaskId = self.taskId ? String(self.taskId) : ''
  const seen = new Set<string>()
  const out: string[] = []

  if (Array.isArray(raw)) {
    for (const p of raw) {
      const fromUid = String(p?.from ?? '')
      const taskId = uidToTaskId[fromUid]
      if (!taskId) continue
      if (selfTaskId && taskId === selfTaskId) continue
      const type = String(p?.type || 'FS').toUpperCase()
      const offset = Number(p?.offset || 0)
      const key = `${taskId}|${type}|${offset}`
      if (seen.has(key)) continue
      seen.add(key)
      const offText = offset ? `+${offset}` : ''
      out.push(`${taskId} ${type}${offText}`.trim())
    }
    return out.join(', ')
  }

  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const part of parts) {
    const m = part.match(/^(\d+(?:\.\d+)*)\s+(FS|SS|FF|SF)(?:\+(\d+))?$/i)
    if (!m) continue
    const taskId = m[1]
    if (selfTaskId && taskId === selfTaskId) continue
    const type = m[2].toUpperCase()
    const offset = Number(m[3] || 0)
    const key = `${taskId}|${type}|${offset}`
    if (seen.has(key)) continue
    seen.add(key)
    const offText = offset ? `+${offset}` : ''
    out.push(`${taskId} ${type}${offText}`.trim())
  }
  return out.join(', ')
}

// 先做一個 uid→taskId 的 map，之後所有匯出都會用到
const buildUidToTaskId = () => {
  const gi = getGantt()
  const map = new Map<string, string>()
  if (!gi?.flatData) return map
  gi.flatData.forEach((row: any) => {
    const uid = String(row.Uid || row.uid || '')
    const taskId = row.TaskID != null ? String(row.TaskID) : ''
    if (uid && taskId) map.set(uid, taskId)
  })
  return map
}

// 民國年格式
const formatROC = (d: Date | string | null) => {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  const roc = toRepublicYear(date.getFullYear())
  const m = date.getMonth() + 1
  const day = date.getDate()
  return `${roc}/${m}/${day}`
}

// 民國年斜線格式（用於 PDF 匯出）
const formatROCSlash = (date: Date | string | null | undefined): string => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const roc = toRepublicYear(d.getFullYear())
  const m = d.getMonth() + 1
  const day = d.getDate()
  // 民國年/月/日
  return `民國${roc}/${m}/${day}`
}

// ✅ 匯出前先把所有任務的前置任務統一去重、轉成你要的顯示字串
const normalizeAllPredecessorsForPdf = () => {
  const gi = (gantt.value as any)?.ej2Instances
  if (!gi?.flatData) return

  const uidMap = new Map<string, { id: string; name: string }>()
  gi.flatData.forEach((r: any) => {
    const uid = String(r.ganttProperties?.rowUniqueID ?? r.Uid ?? r.uid ?? '')
    const id = r.TaskID != null ? String(r.TaskID) : ''
    const name = r.TaskName || ''
    if (uid) uidMap.set(uid, { id, name })
  })

  gi.flatData.forEach((r: any) => {
    const gp = r.ganttProperties
    const rawPreds = Array.isArray(gp?.predecessor) ? gp.predecessor : []
    const seen = new Set<string>()
    const displayParts: string[] = []

    rawPreds.forEach((p: any) => {
      const fromUid = String(p.from || '')
      const info = uidMap.get(fromUid)
      const id = info?.id || fromUid
      const name = info?.name || ''
      const type = (p.type || 'FS').toUpperCase()
      const offsetNum = Number(p.offset || 0)
      const key = `${id}|${type}|${offsetNum}`
      if (seen.has(key)) return
      seen.add(key)

      const offsetText = offsetNum ? `+${offsetNum}天` : ''
      displayParts.push(`${id} ${name} ${type}${offsetText}`.trim())

    })

    const finalText = safeText(displayParts.join(', '))
    r.Predecessor = finalText
    if (r.taskData) r.taskData.Predecessor = finalText
  })
}

// 0. 匯出前統一塞你想要的 page 設定（同步版，不要在這裡 await）
const onBeforePdfExport = (args: any) => {
  if (!args.pdfExportProperties) args.pdfExportProperties = {}

  if (pdfFontRef.value) {
    args.pdfExportProperties.document = { font: pdfFontRef.value }
    args.pdfExportProperties.theme = {
      header: { font: pdfFontRef.value },
      record: { font: pdfFontRef.value },
      caption: { font: pdfFontRef.value },
    }
    args.pdfExportProperties.ganttStyle = {
      font: pdfFontRef.value,
      columnHeader: { font: pdfFontRef.value },
      taskbar: { font: pdfFontRef.value },
    }
  }
}

// 1. 把「欄位裡的西元 → 民國、UID → TaskID」搬去 pdfQueryCellInfo
const onPdfQueryCellInfo = (args: any) => {
  // 通用：字型
  if (pdfFontRef.value && args.style) {
    args.style.font = pdfFontRef.value
  }

  if (args.style) {
    args.style.stringFormat = pdfCenterNoWrap
  }

  // 只處理「前置任務」這欄
  if (args.column?.field === 'Predecessor') {
    const display = formatPredecessorDisplay(args.data?.Predecessor || '')
      .replace(/ /g, '\u00A0')
      .replace(/, /g, '，')
    args.value = safeText(display)
    return
  }

  // 其他欄位照原本邏輯
  if (args.column?.field === 'StartDate') {
    const d = args.data?.ganttProperties?.startDate || args.data?.StartDate || args.value
    args.value = d ? safeText(formatROC(d)) : ''
    return
  }
  if (args.column?.field === 'EndDate') {
    const d = args.data?.ganttProperties?.endDate || args.data?.EndDate || args.value
    args.value = d ? safeText(formatROC(d)) : ''
    return
  }
  if (args.column?.field === 'Duration') {
    const raw = args.data?.ganttProperties?.duration ?? args.data?.Duration ?? args.value
    const n = typeof raw === 'number' ? raw : parseInt(String(raw || 0), 10)
    args.value = Number.isFinite(n) && n > 0 ? `${n} 天` : ''
    return
  }
  if (typeof args.value === 'string' && args.value) {
    args.value = safeText(args.value)
  }
}

// 2. 把「時間軸的西元 → 民國」搬去 pdfQueryTimelineCellInfo
const onPdfTimeline = (args: any) => {
  // 確保有字型，避免中文變框框
  if (pdfFontRef.value && args.style) {
    args.style.font = pdfFontRef.value
  }

  const rawDate = args.date ? new Date(args.date) : null
  let text = ''

  if (rawDate && !isNaN(rawDate.getTime())) {
    const roc = rawDate.getFullYear() - 1911
    const m = rawDate.getMonth() + 1
    const d = rawDate.getDate()

    if (args.cellType === 'TopTier') {
      text = `民國${roc}年${m}月`
    } else {
      text = `民國${roc}年${m}月${d}日`
    }
  } else {
    const src =
      (args.timelineCell && args.timelineCell.value) ||
      args.value ||
      ''
    text = src
      .replace(/(\d{4})年/g, (_, y: string) => `民國${Number(y) - 1911}年`)
      .replace(
        /(\d{4})-(\d{1,2})-(\d{1,2})/,
        (_m, y: string, mm: string, dd: string) =>
          `民國${Number(y) - 1911}年${Number(mm)}月${Number(dd)}日`,
      )
  }

  text = safeText(text)
  args.value = text
  if (args.timelineCell) {
    args.timelineCell.value = text
  }
}

// 3. 把標題「任務名稱 / 開始日期 …」也漢化到 PDF
const onPdfHeader = (args: any) => {
  // 確保使用中文字型
  if (pdfFontRef.value && args.style) {
    args.style.font = pdfFontRef.value
    args.style.stringFormat = pdfCenterNoWrap
  }

  const map: Record<string, string> = {
    Uid: 'Uid',
    TaskID: '任務ID',
    TaskName: '任務名稱',
    StartDate: '開始日期',
    EndDate: '結束日期',
    Duration: '工期',
    Predecessor: '前置任務',
  }
  if (map[args.column.field]) {
    const v = map[args.column.field]
    args.column.headerText = v
    args.value = safeText(v)
  } else if (typeof args.value === 'string') {
    args.value = safeText(args.value)
  }
}

// 4. 任務條資訊
const onPdfTaskbar = (args: any) => {
  // 確保使用中文字型
  if (pdfFontRef.value && args.style) {
    args.style.font = pdfFontRef.value
  }

  // 右邊甘特圖的條上面，顯示 TaskID + 任務名稱
  const uidToTaskId = buildUidToTaskId()
  const id = uidToTaskId.get(String(args.data?.Uid || '')) || args.data?.TaskID
  if (args.taskbar && id) {
    const name = safeText(args.data?.TaskName || '')
    args.taskbar.taskName = safeText(`${id} ${name}`)
  }
}

// 匯出 PDF（不修改資料，全部交給匯出事件處理）
const handleExportPdf = async () => {
  const gi = (gantt.value as any)?.ej2Instances
  if (!gi) {
    alert('甘特圖尚未初始化，無法匯出')
    return
  }

  // 只做「字型一定有」這件事
  const chineseFont = await loadPdfChineseFont()
  if (!chineseFont) {
    alert('字型載入失敗，無法匯出 PDF')
    return
  }

  if (!gi.currentViewData || !gi.currentViewData.length) {
    alert('目前沒有任務資料，無法匯出')
    return
  }

  isPdfExporting.value = true

  const exportProps: any = {
    fileName: `工程排程-${new Date().toISOString().slice(0, 10)}.pdf`,
    pageOrientation: 'Landscape',
    pageSize: 'A2',
    showPredecessorLines: true,
    gridWidth: '55%',
    chartWidth: '45%',
    fitToWidthSettings: {
      isFitToWidth: false,
    },
    document: { font: chineseFont },
    theme: {
      header: { font: chineseFont },
      record: { font: chineseFont },
      caption: { font: chineseFont },
    },
    ganttStyle: {
      font: chineseFont,
      columnHeader: { font: chineseFont },
      taskbar: { font: chineseFont },
    },
  }

  gi.pdfExport(exportProps, false, null, true)
}

// 匯出完成後真的存檔
const onPdfExportComplete = (args: any) => {
  isPdfExporting.value = false
  // 新版會給 promise
  if (args?.promise) {
    args.promise
      .then((e: any) => {
        if (!e?.blobData) return

        const url = URL.createObjectURL(e.blobData)
        const a = document.createElement('a')
        a.href = url
        a.download = args.fileName || 'gantt.pdf'
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((err: any) => {
        console.error('PDF 匯出失敗：', err)
        alert('PDF 匯出失敗，請看 console')
      })
    return
  }

  //（保留舊寫法，萬一之後你不用 blob 模式還是能跑）
  if (args?.blobData) {
    const url = URL.createObjectURL(args.blobData)
    const a = document.createElement('a')
    a.href = url
    a.download = args.fileName || 'gantt.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }
}

// 匯出 Excel
const handleExportExcel = () => {
  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) {
    alert('甘特圖尚未初始化，無法匯出')
    return
  }
  // Excel 同理，要 allowExcelExport，加上 ExcelExport 模組 :contentReference[oaicite:2]{index=2}
  ganttInstance.excelExport({
    fileName: `工程排程-${new Date().toISOString().slice(0, 10)}.xlsx`,
  })
}

// 儲存資料
const saveData = () => {
  try {
    syncToStore()
    scheduleStore.saveToLocalStorage()
    notifyScheduleUpdated()

    const toast = document.createElement('div')
    toast.className = 'toast-notification'
    toast.innerHTML = `
      <div class="alert alert-success alert-dismissible fade show" role="alert">
        <i class="fa fa-check-circle me-2"></i>
        已手動同步並儲存（大部分操作已自動儲存）
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 300px;
    `
    document.body.appendChild(toast)

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 3000)
  } catch (error) {
    console.error('儲存資料失敗:', error)
    alert('儲存資料失敗，請檢查瀏覽器設定')
  }
}

// 生成新任務的階層 ID
const generateNewTaskId = (parentId: number | null): string => {
  if (!currentVersion.value) return '1'

  if (parentId) {
    const parentTask = findTaskById(currentVersion.value.tasks, parentId)
    if (parentTask) {
      const siblingCount = parentTask.subtasks ? parentTask.subtasks.length : 0
      return `${parentId}.${siblingCount + 1}`
    }
  } else {
    const topLevelCount = currentVersion.value.tasks ? currentVersion.value.tasks.length : 0
    return `${topLevelCount + 1}`
  }

  return '1'
}

const findTaskById = (tasks: any[], taskId: string | number): any => {
  for (const task of tasks) {
    if (String(task.TaskID) === String(taskId)) {
      return task
    }
    if (task.subtasks && task.subtasks.length > 0) {
      const found = findTaskById(task.subtasks, taskId)
      if (found) return found
    }
  }
  return null
}

// 驗證依賴
const validatePredecessor = (predecessor: string, taskId: string | number): boolean => {
  if (!predecessor || predecessor.trim() === '') return true

  const dependencies = predecessor.split(',').map((dep) => dep.trim())

  for (const dep of dependencies) {
    const match = dep.match(/^(\d+(?:\.\d+)*)\s+(FS|SS|FF|SF)(?:\+(\d+))?$/i)
    if (!match) {
      alert(`依賴關係格式錯誤：「${dep}」\n正確格式：任務ID 依賴類型[+延遲天數]\n例如：1 FS, 2 SS+2`)
      return false
    }

    const [, depTaskId] = match

    if (depTaskId === String(taskId)) {
      alert(`任務不能依賴自己：「${dep}」`)
      return false
    }

    const ganttInstance = (gantt.value as any)?.ej2Instances
    if (ganttInstance) {
      const exists = ganttInstance.flatData.some((task: any) => String(task.TaskID) === depTaskId)
      if (!exists) {
        alert(`依賴的任務不存在：「${depTaskId}」`)
        return false
      }
    }
  }

  return true
}

const sanitizePredecessor = (predecessor: string, taskId: string | number): string => {
  if (!predecessor || predecessor.trim() === '') return ''

  const dependencies = predecessor.split(',').map((dep) => dep.trim())
  const validDependencies: string[] = []

  for (const dep of dependencies) {
    const match = dep.match(/^(\d+(?:\.\d+)*)\s+(FS|SS|FF|SF)(?:\+(\d+))?$/i)
    if (!match) continue

    const [, depTaskId] = match

    if (depTaskId === String(taskId)) continue

    const ganttInstance = (gantt.value as any)?.ej2Instances
    if (ganttInstance) {
      const exists = ganttInstance.flatData.some((task: any) => String(task.TaskID) === depTaskId)
      if (!exists) continue
    }

    validDependencies.push(dep)
  }

  return validDependencies.join(', ')
}

// 儲存任務
const handleTaskSave = () => {
  if (!taskForm.value.TaskName) {
    alert('請填寫任務名稱')
    return
  }

  const cleanedPredecessor = sanitizePredecessor(taskForm.value.Predecessor, taskForm.value.TaskID)
  if (cleanedPredecessor !== taskForm.value.Predecessor) {
    taskForm.value.Predecessor = cleanedPredecessor
  }

  if (!validatePredecessor(taskForm.value.Predecessor, taskForm.value.TaskID)) {
    return
  }

  if (taskForm.value.isParentTask && dialogMode.value === 'edit') {
    const ganttInstance = (gantt.value as any)?.ej2Instances
    if (!ganttInstance) return

    const record = ganttInstance.flatData.find(
      (r: any) => String(getUidFromRecord(r)) === String(taskForm.value.Uid),
    )
    if (record) {
      record.TaskName = taskForm.value.TaskName
      ganttInstance.updateRecordByID(record)

      const prevSync = isSyncing.value
      isSyncing.value = true
      try {
        updateTaskInStore({
          Uid: getUidFromRecord(record),
          TaskID: taskForm.value.TaskID,
          TaskName: taskForm.value.TaskName,
        })

        scheduleStore.saveToLocalStorage()
        notifyScheduleUpdated()
      } finally {
        nextTick(() => {
          isSyncing.value = prevSync
        })
      }

      showTaskDialog.value = false
      return
    }
  }

  let startDate: Date | null = null
  let endDate: Date | null = null
  let duration = 0

  if (taskForm.value.StartDate) {
    startDate = new Date(taskForm.value.StartDate)
  }

  if (taskForm.value.EndDate) {
    endDate = new Date(taskForm.value.EndDate)
  }

  if (taskForm.value.Duration && taskForm.value.Duration > 0) {
    duration = taskForm.value.Duration
  }

  let taskId: string | number = taskForm.value.TaskID
  if (dialogMode.value === 'add') {
    taskId = generateNewTaskId(taskForm.value.ParentID)
  }

  const storeTaskData: any = {
    Uid: dialogMode.value === 'add' ? genUid() : taskForm.value.Uid || '',
    TaskID: taskId,
    TaskName: taskForm.value.TaskName,
    StartDate: startDate,
    EndDate: endDate,
    Duration: duration,
    Progress: 0,
    Predecessor: taskForm.value.Predecessor || '',
    CostRatio: 0,
    ActualAmount: 0,
    subtasks: [],
  }

  const ganttInstance = (gantt.value as any)?.ej2Instances
  if (!ganttInstance) return

  const taskIdToUidMap = buildTaskIdToUidMap()
  const currentUid = String(storeTaskData.Uid || '')
  const currentTaskIdStr = storeTaskData.TaskID != null ? String(storeTaskData.TaskID) : ''
  if (currentUid && currentTaskIdStr && !taskIdToUidMap.has(currentTaskIdStr)) {
    taskIdToUidMap.set(currentTaskIdStr, currentUid)
  }

  const { ganttText: ganttPredecessor } = convertTaskIdPredecessorToUid(
    storeTaskData.Predecessor || '',
    taskIdToUidMap,
  )
  const taskIdPredecessorText = storeTaskData.Predecessor || ''

  if (dialogMode.value === 'add') {
    const ganttRecord: any = {
      ...storeTaskData,
      Predecessor: ganttPredecessor,
      subtasks: [],
    }

    ganttRecord.taskData = {
      ...(ganttRecord.taskData || {}),
      Predecessor: ganttPredecessor,
    }
    ;(ganttRecord.taskData as any).taskIdPredecessorText = taskIdPredecessorText

    if (taskForm.value.ParentID) {
      ganttRecord.parentID = taskForm.value.ParentID
      ganttInstance.addRecord(ganttRecord, 'Child')
    } else {
      ganttInstance.addRecord(ganttRecord, 'Top')
    }
  } else {
    const record = ganttInstance.flatData.find(
      (r: any) => String(getUidFromRecord(r)) === String(storeTaskData.Uid || taskForm.value.Uid),
    )
    if (record) {
      record.TaskName = storeTaskData.TaskName
      record.StartDate = storeTaskData.StartDate
      record.EndDate = storeTaskData.EndDate
      record.Duration = storeTaskData.Duration
      record.Predecessor = ganttPredecessor

      if (!record.taskData) record.taskData = {}
      record.taskData.TaskName = storeTaskData.TaskName
      record.taskData.StartDate = storeTaskData.StartDate
      record.taskData.EndDate = storeTaskData.EndDate
      record.taskData.Duration = storeTaskData.Duration
      record.taskData.Predecessor = ganttPredecessor
      ;(record.taskData as any).taskIdPredecessorText = taskIdPredecessorText

      ganttInstance.updateRecordByID(record)
    }
  }

  const prevSync = isSyncing.value
  isSyncing.value = true
  try {
    updateTaskInStore(storeTaskData)
    updateParentDurations(currentVersion.value.tasks)
    scheduleStore.saveToLocalStorage()
    notifyScheduleUpdated()
  } finally {
    nextTick(() => {
      isSyncing.value = prevSync
    })
  }

  showTaskDialog.value = false
}

const updateTaskInStore = (taskData: any) => {
  if (!currentVersion.value) return

  if (dialogMode.value === 'add') {
    addTaskToStore(taskData)
  } else {
    updateExistingTaskInStore(taskData)
  }
}

const addTaskToStore = (taskData: any) => {
  if (!currentVersion.value) return

  if (taskForm.value.ParentID) {
    const parentTask = findTaskById(currentVersion.value.tasks, taskForm.value.ParentID)
    if (parentTask) {
      if (!parentTask.subtasks) {
        parentTask.subtasks = []
      }
      parentTask.subtasks.push(taskData)
    }
  } else {
    if (!currentVersion.value.tasks) {
      currentVersion.value.tasks = []
    }
    currentVersion.value.tasks.push(taskData)
  }

  scheduleStore.updateVersion(currentVersion.value.id, {
    tasks: currentVersion.value.tasks,
    taskCount: calculateTaskCount(currentVersion.value.tasks),
  })
  notifyScheduleUpdated()
}

const updateExistingTaskInStore = (taskData: any) => {
  if (!currentVersion.value) return

  const updateTaskInArray = (tasks: any[]): boolean => {
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].TaskID === taskData.TaskID) {
        if (taskData.Uid) {
          tasks[i].Uid = taskData.Uid
        }
        if (Object.prototype.hasOwnProperty.call(taskData, 'TaskName')) {
          tasks[i].TaskName = taskData.TaskName
        }
        if (Object.prototype.hasOwnProperty.call(taskData, 'StartDate')) {
          tasks[i].StartDate = taskData.StartDate
        }
        if (Object.prototype.hasOwnProperty.call(taskData, 'EndDate')) {
          tasks[i].EndDate = taskData.EndDate
        }
        if (Object.prototype.hasOwnProperty.call(taskData, 'Duration')) {
          tasks[i].Duration = taskData.Duration
        }
        if (Object.prototype.hasOwnProperty.call(taskData, 'Predecessor')) {
          tasks[i].Predecessor = taskData.Predecessor
        }
        return true
      }

      if (tasks[i].subtasks && tasks[i].subtasks.length > 0) {
        if (updateTaskInArray(tasks[i].subtasks)) {
          return true
        }
      }
    }
    return false
  }

  if (updateTaskInArray(currentVersion.value.tasks)) {
    scheduleStore.updateVersion(currentVersion.value.id, {
      tasks: currentVersion.value.tasks,
      taskCount: calculateTaskCount(currentVersion.value.tasks),
    })
    notifyScheduleUpdated()
  } else {
    syncToStore()
  }
}

const calculateTaskCount = (tasks: any[]): number => {
  let count = 0
  const countTasks = (taskList: any[]) => {
    taskList.forEach((task) => {
      count++
      if (task.subtasks && task.subtasks.length > 0) {
        countTasks(task.subtasks)
      }
    })
  }
  countTasks(tasks)
  return count
}

const syncToStore = () => {
  isSyncing.value = true

  try {
    const ganttInstance = (gantt.value as any)?.ej2Instances
    if (!ganttInstance || !currentVersion.value) {
      isSyncing.value = false
      return
    }

    if (ganttInstance.isEdit || ganttInstance.isDrag || ganttInstance.isResize || ganttInstance.isLoading) {
      isSyncing.value = false
      return
    }

    if (ganttInstance.isRefreshing || ganttInstance.isRendering) {
      isSyncing.value = false
      return
    }

    if (!ganttInstance.currentViewData || !Array.isArray(ganttInstance.currentViewData)) {
      isSyncing.value = false
      return
    }

    const validTasks = ganttInstance.currentViewData.filter((task: any) => task && task.TaskID && task.TaskName)

    if (validTasks.length === 0) {
      isSyncing.value = false
      return
    }

    const convertToTreeFormat = (ganttTask: any): any => {
      if (!ganttTask || typeof ganttTask !== 'object') {
        console.warn('無效的任務數據:', ganttTask)
        return null
      }

      const gp = ganttTask.ganttProperties
      const predecessorString =
        buildTaskIdPredecessorText(
          Array.isArray(gp?.predecessor) ? gp.predecessor : undefined,
        ) ||
        convertPredecessorUidToTaskIdText(
          String(ganttTask.Predecessor || gp?.predecessorsName || '').trim(),
        )

      const task: any = {
        Uid: ganttTask.Uid || '',
        TaskID: ganttTask.TaskID || '',
        TaskName: ganttTask.TaskName || '',
        StartDate: ganttTask.StartDate || null,
        EndDate: ganttTask.EndDate || null,
        Duration: ganttTask.Duration || 0,
        Progress: ganttTask.Progress || 0,
        Predecessor: predecessorString,
        CostRatio: 0,
        ActualAmount: 0,
      }

      const childTasks = ganttTask.childRecords || []

      if (Array.isArray(childTasks) && childTasks.length > 0) {
        task.subtasks = childTasks
          .map((child: any) => convertToTreeFormat(child))
          .filter(Boolean)
      } else {
        task.subtasks = []
      }

      return task
    }

    const topLevelTasks = ganttInstance.currentViewData.filter(
      (task: any) => task && task.parentItem === null && task.TaskID && task.TaskName,
    )

    if (topLevelTasks.length === 0) {
      isSyncing.value = false
      return
    }

    const convertedTasks = topLevelTasks.map((task: any) => convertToTreeFormat(task)).filter(Boolean)

    scheduleStore.updateVersion(currentVersion.value.id, {
      tasks: convertedTasks,
    })
  } catch (error) {
    console.error('同步甘特圖數據到 store 時發生錯誤:', error)
  } finally {
    setTimeout(() => {
      isSyncing.value = false
    }, 100)
  }
}

// Taskbar 編輯事件
const onTaskbarEditing = (args: any) => {
  if (args.data && args.data.hasChildRecords) {
    args.cancel = true
    if (
      args.taskBarEditAction === 'LeftResizing' ||
      args.taskBarEditAction === 'RightResizing' ||
      args.taskBarEditAction === 'ProgressResizing' ||
      args.taskBarEditAction === 'ChildDrag' ||
      args.taskBarEditAction === 'ParentDrag' ||
      args.taskBarEditAction === 'MilestoneDrag'
    ) {
      if (!args.previousData) {
        alert('父項任務的日期和工期會根據子任務自動計算，無法手動拖動')
      }
    }
  }
}

// 操作開始事件
const onActionBegin = (args: any) => {
  if (args.data && args.data.hasChildRecords) {
    if (args.requestType === 'dependencyChange') {
      args.cancel = true
      alert('父項任務的依賴關係會根據子任務自動計算，無法手動編輯')
      return
    }

    if (args.requestType === 'beforeDependencyEditDialogOpen') {
      args.cancel = true
      alert('父項任務的依賴關係會根據子任務自動計算，無法手動編輯')
      return
    }
  }

  if (args.requestType === 'dependencyChange') {
    // log
  }
}

// 操作完成事件
const onActionComplete = (args: any) => {
  try {
    const ganttInstance = (gantt.value as any)?.ej2Instances
    if (ganttInstance) normalizeGanttPredecessors(ganttInstance)
    if (!ganttInstance) return

    if (args.requestType === 'AfterZoomIn' || args.requestType === 'AfterZoomOut') {
      const currentLevel = ganttInstance.currentZoomingLevel?.level
      if (currentLevel !== undefined && levelToScaleMap[currentLevel]) {
        currentScale.value = levelToScaleMap[currentLevel]
      }
    }

    if (args.requestType === 'openEditDialog') {
      setTimeout(() => {
        hideTabHeaders()
        try {
          const dialogs = document.querySelectorAll('.e-dialog')
          dialogs.forEach((d) => replaceUidWithTaskIdInDialog(d))
        } catch {}
      }, 100)
    }

    if (
      args.requestType === 'dependencyChange' ||
      (args.requestType === 'save' &&
        (args.action === 'DrawConnectorLine' || args.action === 'DeleteConnectorLine'))
    ) {
      scheduleSyncAfterDependencyChange()
    }

    if (args.requestType === 'delete') {
      setTimeout(() => {
        try {
          const gi = (gantt.value as any)?.ej2Instances
          if (gi && !gi.isEdit && !gi.isDrag && !gi.isResize) {
            syncToStore()
            scheduleStore.saveToLocalStorage()
          }
        } catch (error) {
          console.error('刪除操作儲存錯誤:', error)
        }
      }, 200)
    }

    if (args.requestType === 'add') {
      setTimeout(() => {
        try {
          const gi = (gantt.value as any)?.ej2Instances
          if (gi && !gi.isEdit && !gi.isDrag && !gi.isResize) {
            syncToStore()
            scheduleStore.saveToLocalStorage()
          }
        } catch (error) {
          console.error('新增操作儲存錯誤:', error)
        }
      }, 200)
    }

    if (args.requestType === 'taskbarEdited' || args.requestType === 'progressChanged') {
      setTimeout(() => {
        try {
          const gi = (gantt.value as any)?.ej2Instances
          if (gi && !gi.isEdit && !gi.isDrag && !gi.isResize) {
            syncToStore()
            scheduleStore.saveToLocalStorage()
          }
        } catch (error) {
          console.error('任務拖曳儲存錯誤:', error)
        }
      }, 300)
    }

    if (
      args.requestType === 'rowDragAndDrop' ||
      args.requestType === 'reorder' ||
      args.requestType === 'dragAndDrop' ||
      args.requestType === 'rowDrop' ||
      args.requestType === 'beforeRowDrop' ||
      args.requestType === 'afterRowDrop'
    ) {
      setTimeout(() => {
        try {
          const gi = (gantt.value as any)?.ej2Instances
          if (gi && !gi.isEdit && !gi.isDrag && !gi.isResize) {
            syncToStore()
            scheduleStore.saveToLocalStorage()
          }
        } catch (error) {
          console.error('任務移動儲存錯誤:', error)
        }
      }, 300)
    }

    if (args.requestType === 'refresh') {
      if (showTaskDialog.value) {
        return
      }
      setTimeout(() => {
        processGanttDragDropData()
      }, 300)

      setTimeout(() => {
        bindTimelineObserver()
        scheduleRocConversionBurst(6, 40)
        try {
          const dialogs = document.querySelectorAll('.e-dialog')
          dialogs.forEach((d) => replaceUidWithTaskIdInDialog(d))
        } catch {}
      }, 350)
    }
  } catch (error) {
    console.error('甘特圖操作完成事件處理錯誤:', error)
  }
}

// 數據綁定完成事件
const onDataBound = () => {
  try {
    const gi = (gantt.value as any)?.ej2Instances
    if (gi) normalizeGanttPredecessors(gi)
    bindTimelineObserver()
    scheduleRocConversionBurst(6, 40)
  } catch {}
}

// 拖拽後處理
const processGanttDragDropData = () => {
  try {
    if (isProcessingRefresh) {
      return
    }

    isProcessingRefresh = true

    const ganttInstance = (gantt.value as any)?.ej2Instances
    if (ganttInstance && !ganttInstance.isEdit && !ganttInstance.isDrag && !ganttInstance.isResize) {
      if (!currentVersion.value) return

      const flatData = ganttInstance.flatData || ganttInstance.currentViewData
      const getUid = (rec: any): string => {
        return String(
          (rec && (rec.Uid || rec.uid)) ||
            rec?.taskData?.Uid ||
            rec?.data?.Uid ||
            rec?.rowData?.Uid ||
            '',
        )
      }
      const convertFromGantt = (g: any): any => {
        const uid = getUid(g)
        const node: any = {
          Uid: uid,
          TaskID: g.TaskID || '',
          TaskName: g.TaskName || '',
          StartDate: g.StartDate || null,
          EndDate: g.EndDate || null,
          Duration: g.Duration || 0,
          Progress: g.Progress || 0,
          Predecessor: '',
          CostRatio: g.CostRatio || 0,
          ActualAmount: g.ActualAmount || 0,
          subtasks: [],
        }

        node.Predecessor = convertPredecessorUidToTaskIdText(String(g.Predecessor || '').trim())

        const children = g.childRecords || []
        if (Array.isArray(children) && children.length > 0) {
          node.subtasks = children.map((c: any) => convertFromGantt(c)).filter(Boolean)
        }
        return node
      }
      const topLevel = (ganttInstance.currentViewData || []).filter(
        (t: any) => t && t.parentItem === null,
      )
      const tasks = topLevel.map((t: any) => convertFromGantt(t)).filter(Boolean)
      ensureUidsInTree(tasks)
      const oldIdByUid = new Map<string, string>()
      const collectOld = (nodes: any[]) => {
        nodes.forEach((n) => {
          if (n.Uid) oldIdByUid.set(String(n.Uid), String(n.TaskID))
          if (n.subtasks && n.subtasks.length > 0) collectOld(n.subtasks)
        })
      }
      collectOld(tasks)
      const newIdByUid = computeDisplayIdsFromFlat(flatData)
      currentVersion.value.tasks = tasks
      applyDisplayIdsToStore(currentVersion.value.tasks, newIdByUid)
      const idMap: Record<string, string> = {}
      newIdByUid.forEach((newId: string, uid: string) => {
        const oldId = oldIdByUid.get(uid)
        if (oldId) idMap[oldId] = newId
      })
      rewritePredecessorByIdMap(currentVersion.value.tasks, idMap)
      updateParentAggregates(currentVersion.value.tasks)
      scheduleStore.updateVersion(currentVersion.value.id, { tasks: currentVersion.value.tasks })
      scheduleStore.saveToLocalStorage()

      try {
        const aggregateByUid = new Map<string, any>()
        const collectAgg = (nodes: any[]) => {
          nodes.forEach((n) => {
            const uid = String(n.Uid || '')
            if (uid) {
              aggregateByUid.set(uid, {
                TaskID: n.TaskID,
                StartDate: n.StartDate || null,
                EndDate: n.EndDate || null,
                Duration: n.Duration || 0,
                CostRatio: n.CostRatio || 0,
                ActualAmount: n.ActualAmount || 0,
              })
            }
            if (n.subtasks && n.subtasks.length > 0) collectAgg(n.subtasks)
          })
        }
        collectAgg(currentVersion.value.tasks)

        ganttInstance.flatData.forEach((row: any) => {
          const uid = getUidFromRecord(row)
          const agg = aggregateByUid.get(uid)
          if (agg) {
            if (row.TaskID !== agg.TaskID) {
              row.TaskID = agg.TaskID
              if (row.taskData) row.taskData.TaskID = agg.TaskID
            }
            row.StartDate = agg.StartDate
            row.EndDate = agg.EndDate
            row.Duration = agg.Duration
          }
        })
        ganttInstance.refresh()
      } catch (e) {
        console.warn('就地更新甘特圖顯示失敗，但不影響資料：', e)
      }
    }
  } catch (error) {
    console.error('甘特圖拖拽數據保存錯誤:', error)
  } finally {
    setTimeout(() => {
      isProcessingRefresh = false
    }, 500)
  }
}

watch(
  () => ganttData.value,
  (val) => {
    const applyData = (instance: any | undefined | null) => {
      if (!instance) return
      // 避免在編輯/拖曳/刷新過程中強制重綁導致 Syncfusion 內部狀態錯亂
      if (
        instance.isEdit ||
        instance.isDrag ||
        instance.isResize ||
        instance.isLoading ||
        instance.isRefreshing ||
        instance.isRendering
      ) {
        return
      }
      if (isSyncing.value || isPdfExporting.value) return
      // 若資料中存在缺少主鍵的紀錄，跳過本次重綁
      if (!Array.isArray(val) || val.some((r: any) => !r || !r.Uid)) return

      instance.dataSource = val
      instance.refresh()
    }

    const gi = (gantt.value as any)?.ej2Instances
    if (gi) {
      applyData(gi)
    } else {
      nextTick(() => {
        applyData((gantt.value as any)?.ej2Instances)
      })
    }
  },
  { deep: true },
)

// 監聽版本變化
watch(
  () => props.versionId,
  (newId) => {
    // ...
  },
)

onMounted(() => {
  // 直接先載，避免第一次按「匯出 PDF」就爆
  loadPdfChineseFont().catch(console.error)

  nextTick(() => {
    const gi = (gantt.value as any)?.ej2Instances
    if (gi) {
      gi.dataSource = Array.isArray(ganttData.value) ? ganttData.value : []
      gi.refresh()
    }
  })

  setTimeout(() => {
    ensureHeaderRootObserver()
    bindTimelineObserver()
    scheduleRocConversionBurst(6, 40)
  }, 300)

  L10n.load({
    'zh-TW': {
      gantt: {
        id: 'ID',
        name: '任務名稱',
        startDate: '開始日期',
        endDate: '結束日期',
        duration: '工期',
        progress: '進度',
        dependency: '相依性',
        notes: '備註',
        addDialogTitle: '新增任務',
        editDialogTitle: '編輯任務',
        saveButton: '儲存',
        add: '新增',
        edit: '編輯',
        update: '更新',
        delete: '刪除',
        cancel: '取消',
        search: '搜尋',
        task: '任務',
        tasks: '任務',
        zoomIn: '放大',
        zoomOut: '縮小',
        zoomToFit: '最適縮放',
        expandAll: '全部展開',
        collapseAll: '全部收合',
        nextTimeSpan: '下一時段',
        prevTimeSpan: '上一時段',
        confirmDelete: '確定要刪除此任務嗎？',
        generalTab: '基本資訊',
        dependencyTab: '依賴關係',
        resourcesTab: '資源分配',
        notesTab: '備註',
        predecessor: '前置任務',
        dependencyType: '依賴類型',
        type: '類型',
        offset: '延遲',
        lag: '延遲',
        resourceName: '資源名稱',
        resourceUnits: '資源單位',
        addPredecessor: '新增前置任務',
        removePredecessor: '移除前置任務',
        addResource: '新增資源',
        removeResource: '移除資源',
        ok: '確定',
        close: '關閉',
        yes: '是',
        no: '否',
        requiredField: '此欄位為必填',
        invalidDate: '無效的日期',
        invalidDuration: '無效的工期',
        invalidProgress: '進度必須在 0-100 之間',
        circularDependency: '檢測到循環依賴',
        invalidPredecessor: '無效的前置任務',
        noRecordsToDisplay: '無記錄可顯示',
        noRecords: '無記錄',
        noData: '無資料',
      },
    },
  })

  setCulture('zh-TW')
})

onUnmounted(() => {
  if (timelineObserver) {
    timelineObserver.disconnect()
    timelineObserver = null
  }
  if (timelineHeaderRootObserver) {
    timelineHeaderRootObserver.disconnect()
    timelineHeaderRootObserver = null
  }
})
</script>

<style scoped>
.gantt-editor-wrapper {
  position: relative;
}

.gantt-wrapper {
  min-height: 0;
  overflow: hidden;
}

.vr {
  opacity: 0.3;
}
</style>

<style>
.e-gantt {
  background: transparent !important;
}

.e-gantt .e-gridcontent,
.e-gantt .e-gridheader,
.e-gantt .e-table,
.e-gantt .e-content,
.e-gantt .e-headercontent {
  background: transparent !important;
}

.e-gantt .e-gantt-chart,
.e-gantt .e-chart-scroll-container,
.e-gantt .e-timeline-header-container,
.e-gantt .e-chart-root-container {
  background: transparent !important;
}

.e-gantt .e-toolbar,
.e-gantt .e-toolbar-items {
  background: transparent !important;
}

.e-gantt .e-row,
.e-gantt .e-altrow {
  background: transparent !important;
}

.dep-table-wrapper {
  max-height: 260px;
  overflow-y: auto;
}

.dep-table th,
.dep-table td {
  vertical-align: middle;
}

.e-gantt .e-headercell,
.e-gantt .e-rowdragheader,
.e-gantt .e-headercelldiv {
  background: transparent !important;
}

.e-gantt .e-split-bar {
  background: rgba(255, 255, 255, 0.1) !important;
}

.e-gantt .e-timeline-top-header-cell,
.e-gantt .e-timeline-header-container .e-header-cell-label {
  text-align: center !important;
  justify-content: center !important;
  display: flex !important;
  align-items: center !important;
}

.e-gantt .e-gantt-chart .e-critical-path {
  background-color: #dc3545 !important;
}

.e-gantt .e-critical-path-connector {
  stroke: #dc3545 !important;
  stroke-width: 2px !important;
}

.e-gantt .e-critical-row td {
  background-color: rgba(220, 53, 69, 0.1) !important;
  border-left: 3px solid #dc3545 !important;
}

/* 隱藏 Syncfusion Gantt 編輯對話框的 Tab 標題欄 */
:deep(.e-tab-header.e-control.e-toolbar.e-lib.e-keyboard) {
  display: none !important;
}

:deep(.e-tab-header) {
  display: none !important;
}
</style>

<style>
.e-gantt .e-critical-row td {
  background-color: rgba(220, 53, 69, 0.1) !important;
  border-left: 3px solid #dc3545 !important;
}

::deep(.e-tab-header.e-control.e-toolbar.e-lib.e-keyboard) {
  display: none !important;
}

::deep(.e-tab-header) {
  display: none !important;
}

.disabled-field {
  cursor: not-allowed;
}
.disabled-field .form-control[disabled] {
  background-color: #e9ecef !important;
  color: #6c757d !important;
  cursor: not-allowed !important;
}
.disabled-field {
  opacity: 0.65;
}
.disabled-field :is(.e-input, .e-input-group, .e-control-wrapper) {
  pointer-events: none !important;
}
::deep(.disabled-field input),
::deep(.disabled-field .e-input),
::deep(.disabled-field .e-input-group) {
  background-color: #e9ecef !important;
  color: #6c757d !important;
  cursor: not-allowed !important;
}
</style>
