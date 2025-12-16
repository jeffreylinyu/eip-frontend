<template>
  <div class="page-wrapper d-flex flex-column">
    <!-- 頁面標題與版本選擇器 -->
    <div class="d-flex justify-content-between align-items-start">
      <PageHeader
        title="工程排程器"
        icon="fa fa-folder-open"
        :breadcrumbs="[
          { text: '工程排程管理', href: 'javascript:;' },
          { text: '工程排程器', active: true },
        ]"
      />
      <div class="d-flex align-items-center gap-2">
        <VersionSelector ref="versionSelectorRef" />
      </div>
    </div>

    <!-- 項目編輯區域 -->
    <div class="content-area flex-fill">
      <div v-if="!currentVersion" class="empty-state-wrapper d-flex flex-column align-items-center justify-content-center h-100">
        <div class="empty-state-content text-center">
          <i class="fa fa-folder-open fa-4x mb-4 text-muted"></i>
          <h4 class="mb-3">尚未選擇版本</h4>
          <p class="text-muted mb-4">請先選擇現有版本或建立新版本以開始使用</p>
          <div class="d-flex gap-3 justify-content-center">
            <button 
              class="btn btn-primary btn-lg"
              @click="openVersionSelector"
            >
              <i class="fa fa-list me-2"></i>選擇版本
            </button>
            <button 
              class="btn btn-outline-primary btn-lg"
              @click="openCreateVersion"
            >
              <i class="fa fa-plus me-2"></i>建立新版本
            </button>
          </div>
        </div>
      </div>

      <div v-else class="h-100 d-flex flex-column">
        <!-- Tab 切換 -->
        <ul class="nav nav-tabs mb-0">
          <!-- 編輯模式 -->
          <li class="nav-item">
            <a
              class="nav-link"
              :class="{ active: activeTab === 'tree' }"
              @click="switchTab('tree')"
              href="javascript:;"
            >
              <i class="fa fa-sitemap me-2"></i>編輯工項與階層
            </a>
          </li>
          <li class="nav-item">
            <a
              class="nav-link"
              :class="{ active: activeTab === 'gantt' }"
              @click="switchTab('gantt')"
              href="javascript:;"
            >
              <i class="fa fa-chart-line me-2"></i>編輯排程與要徑(甘特圖)
            </a>
          </li>

          <!-- 分隔線 -->
          <li class="nav-item tab-divider">
            <span class="nav-divider"></span>
          </li>

          <!-- 檢視模式 -->
          <li class="nav-item">
            <a
              class="nav-link"
              :class="{ active: activeTab === 'cpm' }"
              @click="switchTab('cpm')"
              href="javascript:;"
            >
              <i class="fa fa-project-diagram me-2"></i>CPM 要徑圖
            </a>
          </li>
          <li class="nav-item">
            <a
              class="nav-link"
              :class="{ active: activeTab === 'curve' }"
              @click="switchTab('curve')"
              href="javascript:;"
            >
              <i class="fa fa-chart-area me-2"></i>曲線圖
            </a>
          </li>
        </ul>

        <!-- TreeGrid 容器 -->
        <div
          v-if="activeTab === 'tree'"
          class="flex-fill border border-top-0 rounded-bottom d-flex flex-column overflow-hidden"
        >
          <!-- 工具列 -->
          <div
            class="d-flex justify-content-between align-items-center p-3 border-bottom"
          >
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-primary" @click="handleAdd">
                <i class="fa fa-plus me-1"></i>新增
              </button>
              <button class="btn btn-sm btn-info" @click="handleEdit">
                <i class="fa fa-edit me-1"></i>編輯
              </button>
              <button class="btn btn-sm btn-danger" @click="handleDelete">
                <i class="fa fa-trash me-1"></i>刪除
              </button>
              <div class="vr"></div>
              <button
                class="btn btn-sm btn-outline-info"
                @click="handleExpandAll"
              >
                <i class="fa fa-angle-double-down me-1"></i>全部展開
              </button>
              <button
                class="btn btn-sm btn-outline-info"
                @click="handleCollapseAll"
              >
                <i class="fa fa-angle-double-up me-1"></i>全部收合
              </button>
              <div class="vr"></div>
              <button
                class="btn btn-sm btn-outline-warning"
                style="display: none"
              >
                <i class="fa fa-arrow-right me-1"></i>降階為子項目
              </button>
              <button
                class="btn btn-sm btn-outline-warning"
                style="display: none"
              >
                <i class="fa fa-arrow-left me-1"></i>升階為上層項目
              </button>
            </div>
            <div class="d-flex gap-2 align-items-center">
              <div class="input-group input-group-sm" style="width: 250px">
                <input
                  type="text"
                  v-model="searchText"
                  placeholder="搜尋項目..."
                  class="form-control"
                  @input="handleSearch"
                />
                <button class="btn btn-outline-secondary" type="button">
                  <i class="fa fa-search"></i>
                </button>
              </div>
              
            </div>
          </div>

          <!-- TreeGrid -->
          <div class="treegrid-wrapper flex-fill">
            <ejs-treegrid
              ref="treegrid"
              :dataSource="treeGridData"
              :allowPaging="false"
              :allowSorting="true"
              :allowFiltering="false"
              :allowResizing="true"
              :allowReordering="true"
              :allowRowDragAndDrop="true"
              :allowSelection="true"
              :selectionSettings="selectionSettings"
              :editSettings="editSettings"
              :contextMenuItems="contextMenuItems"
              :treeColumnIndex="1"
              :childMapping="'subtasks'"
              :height="'100%'"
              locale="zh"
              @actionComplete="onActionComplete"
              @actionBegin="onActionBegin"
              @recordDoubleClick="onRecordDoubleClick"
              @dataBound="onDataBound"
            >
              <e-columns>
                <!-- 穩定主鍵（隱藏） -->
                <e-column
                  field="Uid"
                  headerText="Uid"
                  width="80"
                  :isPrimaryKey="true"
                  :visible="false"
                ></e-column>
                <e-column
                  field="TaskID"
                  headerText="ID"
                  width="80"
                  :isPrimaryKey="false"
                  :visible="true"
                ></e-column>
                <e-column
                  field="TaskName"
                  headerText="項目名稱"
                  width="200"
                  :editType="'stringedit'"
                  :template="'taskNameTemplate'"
                ></e-column>
                <e-column
                  field="Duration"
                  headerText="工期(天)"
                  width="100"
                  :editType="'numericedit'"
                ></e-column>
                <e-column
                  field="StartDate"
                  headerText="開始日期"
                  width="120"
                  :editType="'datepickeredit'"
                  :template="'startDateTemplate'"
                ></e-column>
                <e-column
                  field="EndDate"
                  headerText="結束日期"
                  width="120"
                  :editType="'datepickeredit'"
                  :template="'endDateTemplate'"
                ></e-column>
                <e-column
                  field="CostRatio"
                  headerText="費用佔比(%)"
                  width="120"
                  :editType="'numericedit'"
                ></e-column>
                <e-column
                  field="ActualAmount"
                  headerText="實際金額(NT$)"
                  width="150"
                  :editType="'numericedit'"
                  format="N0"
                ></e-column>
              </e-columns>

              <!-- 項目名稱模板（加上層級顏色） -->
              <template v-slot:taskNameTemplate="{ data }">
                <span :class="getTaskLevelClass(data)">{{ data.TaskName }}</span>
              </template>

              <!-- 開始日期模板 -->
              <template v-slot:startDateTemplate="{ data }">
                <span>{{ formatDateForGrid(data.StartDate) }}</span>
              </template>

              <!-- 結束日期模板 -->
              <template v-slot:endDateTemplate="{ data }">
                <span>{{ formatDateForGrid(data.EndDate) }}</span>
              </template>
            </ejs-treegrid>
          </div>

          
        </div>

        <!-- 甘特圖容器 -->
        <GanttEditor
          v-if="activeTab === 'gantt' && currentVersion"
          :version-id="currentVersion.id"
          class="flex-fill border border-top-0 rounded-bottom"
        />

        <!-- CPM 要徑圖容器 -->
        <CpmChart
          v-if="activeTab === 'cpm' && currentVersion"
          :version-id="currentVersion.id"
          class="flex-fill border border-top-0 rounded-bottom"
        />

        <!-- 曲線圖容器 -->
        <CurveChart
          v-if="activeTab === 'curve' && currentVersion"
          :version-id="currentVersion.id"
          class="flex-fill border border-top-0 rounded-bottom"
        />
      </div>
    </div>

    <!-- 任務編輯對話框 -->
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
              <label class="form-label"
                >項目名稱 <span class="text-danger">*</span></label
              >
              <input
                v-model="taskForm.TaskName"
                type="text"
                class="form-control"
                placeholder="請輸入項目名稱"
                required
              />
            </div>

            <!-- 開始日期（僅編輯時可調整；父項目禁用） -->
            <div v-if="dialogMode === 'edit'" class="col-md-6" :class="{'disabled-field': taskForm.isParentTask && dialogMode === 'edit'}">
              <label class="form-label">開始日期</label>
              <RepublicDatePicker
                v-model="taskForm.StartDate"
                :use-republic-year="true"
                :disabled="taskForm.isParentTask && dialogMode === 'edit'"
              />
            </div>

            <!-- 結束日期（僅編輯時可調整；父項目禁用） -->
            <div v-if="dialogMode === 'edit'" class="col-md-6" :class="{'disabled-field': taskForm.isParentTask && dialogMode === 'edit'}">
              <label class="form-label">結束日期</label>
              <RepublicDatePicker
                v-model="taskForm.EndDate"
                :use-republic-year="true"
                :disabled="taskForm.isParentTask && dialogMode === 'edit'"
              />
            </div>

            <!-- 工期（僅編輯時可調整；父項目禁用） -->
            <div v-if="dialogMode === 'edit'" class="col-md-6" :class="{'disabled-field': taskForm.isParentTask && dialogMode === 'edit'}">
              <label class="form-label">工期（天）</label>
              <input
                v-model.number="taskForm.Duration"
                type="number"
                class="form-control"
                placeholder="請輸入工期"
                min="1"
                :disabled="taskForm.isParentTask && dialogMode === 'edit'"
              />
            </div>

            <!-- 費用佔比（僅編輯時可調整；父項目禁用） -->
            <div v-if="dialogMode === 'edit'" class="col-md-6" :class="{'disabled-field': taskForm.isParentTask && dialogMode === 'edit'}">
              <label class="form-label">費用佔比（%）</label>
              <input
                v-model.number="taskForm.CostRatio"
                type="number"
                class="form-control"
                placeholder="請輸入費用佔比（%）"
                min="0"
                step="0.01"
                :disabled="taskForm.isParentTask && dialogMode === 'edit'"
              />
            </div>

            <!-- 實際金額（僅編輯時可調整；父項目禁用） -->
            <div v-if="dialogMode === 'edit'" class="col-md-6" :class="{'disabled-field': taskForm.isParentTask && dialogMode === 'edit'}">
              <label class="form-label">實際金額（NT$）</label>
              <input
                v-model.number="taskForm.ActualAmount"
                type="number"
                class="form-control"
                placeholder="請輸入實際金額（NT$）"
                min="0"
                step="1"
                :disabled="taskForm.isParentTask && dialogMode === 'edit'"
              />
            </div>

            <!-- 父項任務提示 -->
            <div v-if="taskForm.isParentTask && dialogMode === 'edit'" class="col-12">
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
                將新增為「<strong>{{ selectedParentName }}</strong
                >」的子項目
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

    

    
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useScheduleStore, type ScheduleVersion } from "@/stores/schedule";
import Modal from "@/components/bootstrap/Modal.vue";
import PageHeader from "@/components/bootstrap/PageHeader.vue";
import VersionSelector from "@/components/schedule/VersionSelector.vue";
import RepublicDatePicker from "@/components/bootstrap/RepublicDatePicker.vue";
import GanttEditor from "./components/GanttEditor.vue";
import CpmChart from "./components/CpmChart.vue";
import CurveChart from "./components/CurveChart.vue";

import {
  TreeGridComponent,
  ColumnsDirective,
  ColumnDirective,
} from "@syncfusion/ej2-vue-treegrid";
import {
  Edit,
  Toolbar,
  ContextMenu,
  Filter,
  Sort,
  Resize,
  Reorder,
  RowDD,
  Selection,
} from "@syncfusion/ej2-vue-treegrid";
import { provide } from "vue";
import { buildTreeFromFlat, ensureUidsInTree, genUid, getUidFromRecord } from '@/utils/schedule/tree'
import { computeDisplayIdsFromFlat, applyDisplayIdsToStore, applyDisplayIdsToGridFlat, rewritePredecessorByIdMap } from '@/utils/schedule/id'
import { L10n, setCulture } from "@syncfusion/ej2-base";

// 設定簡體中文文化（Syncfusion 內建支援）- 必須在組件初始化前設定
setCulture("zh");

// 設定 TreeGrid 的中文翻譯 - 必須在組件初始化前載入
L10n.load({
  zh: {
    treegrid: {
      EmptyRecord: "無資料",
      ExpandAll: "全部展開",
      CollapseAll: "全部收合",
      Print: "列印",
      Pdfexport: "匯出 PDF",
      Excelexport: "匯出 Excel",
      Csvexport: "匯出 CSV",
      Search: "搜尋",
      Edit: "編輯",
      Delete: "刪除",
      Update: "更新",
      Cancel: "取消",
      Save: "儲存",
      Editoperations: "編輯操作",
      BatchSaveConfirm: "您確定要儲存變更嗎？",
      BatchSaveLostChanges: "尚未儲存的變更將會遺失。您確定要繼續嗎？",
      ConfirmDelete: "您確定要刪除該記錄嗎？",
      CancelEdit: "您確定要取消變更嗎？",
      SelectAll: "全選",
      Above: "上方",
      Below: "下方",
      AddRow: "新增行",
      DeleteRow: "刪除行",
      EditRecord: "編輯",
      DeleteRecord: "刪除",
      Expanded: "已展開",
      Collapsed: "已收合",
      FilterButton: "篩選",
      ClearButton: "清除",
      StartsWith: "開頭是",
      EndsWith: "結尾是",
      Contains: "包含",
      Equal: "等於",
      NotEqual: "不等於",
      LessThan: "小於",
      LessThanOrEqual: "小於或等於",
      GreaterThan: "大於",
      GreaterThanOrEqual: "大於或等於",
      EnterValue: "請輸入值",
      FilterMenu: "篩選",
      Clear: "清除",
      Between: "介於",
      CustomFilter: "自訂篩選",
      CustomFilterPlaceHolder: "請輸入值",
      CustomFilterDatePlaceHolder: "選擇日期",
      AND: "且",
      OR: "或",
      ShowRowsWhere: "顯示符合條件的行",
      // 右鍵選單相關
      AutoFit: "自動調整欄寬",
      AutoFitAll: "自動調整所有欄寬",
      SortAscending: "升冪排序",
      SortDescending: "降冪排序",
      FirstPage: "第一頁",
      PrevPage: "上一頁",
      LastPage: "最後一頁",
      NextPage: "下一頁",
    },
    grid: {
      EmptyRecord: "無資料",
      GroupDropArea: "將欄位標題拖曳到此處以進行分組",
      UnGroup: "取消分組",
      Item: "項目",
      Items: "項目",
      Edit: "編輯",
      Delete: "刪除",
      Save: "儲存",
      Cancel: "取消",
      Update: "更新",
      SelectAll: "全選",
      Search: "搜尋",
      Columnchooser: "選擇欄位",
      FilterButton: "篩選",
      ClearButton: "清除",
      StartsWith: "開頭是",
      EndsWith: "結尾是",
      Contains: "包含",
      Equal: "等於",
      NotEqual: "不等於",
      LessThan: "小於",
      LessThanOrEqual: "小於或等於",
      GreaterThan: "大於",
      GreaterThanOrEqual: "大於或等於",
      EnterValue: "請輸入值",
      AutoFit: "自動調整欄寬",
      AutoFitAll: "自動調整所有欄寬",
      SortAscending: "升冪排序",
      SortDescending: "降冪排序",
      Pdfexport: "匯出 PDF",
      Excelexport: "匯出 Excel",
      Csvexport: "匯出 CSV",
      Print: "列印",
      FirstPage: "第一頁",
      PrevPage: "上一頁",
      LastPage: "最後一頁",
      NextPage: "下一頁",
      ConfirmDelete: "您確定要刪除該記錄嗎？",
    },
  },
});

const fileInput = ref<HTMLInputElement | null>(null);
const searchText = ref("");
const versionSelectorRef = ref<InstanceType<typeof VersionSelector> | null>(null);

const scheduleStore = useScheduleStore();

// 開啟版本選擇器
const openVersionSelector = () => {
  if (versionSelectorRef.value && typeof versionSelectorRef.value.openModal === 'function') {
    versionSelectorRef.value.openModal();
  }
};

// 開啟建立版本對話框
const openCreateVersion = () => {
  if (versionSelectorRef.value && typeof versionSelectorRef.value.openCreate === 'function') {
    versionSelectorRef.value.openCreate();
  }
};

// 版本建立功能已移至 VersionSelector 組件

// Tab 切換狀態
const activeTab = ref<"tree" | "gantt" | "cpm" | "curve">("tree");

// 安全的 Tab 切換函數
const switchTab = (tab: "tree" | "gantt" | "cpm" | "curve") => {
  try {
    activeTab.value = tab;
  } catch (error) {
    console.error('Tab 切換錯誤:', error);
    // 如果切換失敗，回到預設的 tree tab
    activeTab.value = "tree";
  }
};

// Gantt -> Tree 同步：
const onScheduleUpdated = () => {
  try {
    // 當其他頁籤（甘特）更新資料時，刷新 TreeGrid 顯示
    if (currentVersion.value?.tasks) {
      // 重新生成階層式ID，確保顯示一致
      generateHierarchicalTaskId(currentVersion.value.tasks);
    }
    updateTreeGridData();
  } catch (e) {
    console.warn('接收 scheduleUpdated 時刷新 TreeGrid 失敗', e)
  }
}

onMounted(() => {
  window.addEventListener('scheduleUpdated', onScheduleUpdated)
})

onUnmounted(() => {
  window.removeEventListener('scheduleUpdated', onScheduleUpdated)
})

// 切回 Tree tab 時也刷新一次，確保與甘特一致
watch(activeTab, (tab) => {
  if (tab === 'tree') {
    onScheduleUpdated()
  }
})

// ✅ 根據官方文檔：使用 provide 注入服務（添加 RowDD 支援拖拉、Selection 支援選擇）
provide("treegrid", [
  Edit,
  Toolbar,
  ContextMenu,
  Filter,
  Sort,
  Resize,
  Reorder,
  RowDD,
  Selection,
]);

// 版本管理對話框已移除，改由 VersionSelector 組件處理

// 任務編輯對話框（已移除，改用 TreeGrid 內聯編輯）

// TreeGrid 引用
const treegrid = ref<TreeGridComponent | null>(null);

// TreeGrid 數據源
const treeGridData = ref<any[]>([]);

// 防止重複處理 refresh 事件的標記
let isProcessingRefresh = false;

// 拖拽處理標記
let isDragDropPending = false;

// TreeGrid 編輯設定
const editSettings = ref({
  allowEditing: true,
  allowAdding: true,
  allowDeleting: true,
  mode: "Row",
  newRowPosition: "Below",
});

// TreeGrid 選擇設定
const selectionSettings = ref({
  mode: "Row",
  type: "Single",
});

// TreeGrid 工具列設定（使用插槽自訂，不需要此設定）

// TreeGrid 右鍵選單
const contextMenuItems = ref([
  "AutoFit",
  "AutoFitAll",
  "SortAscending",
  "SortDescending",
  "Edit",
  "Delete",
  "Save",
  "Cancel",
]);

// 任務類型下拉選單編輯器
const taskTypeEdit = ref({
  params: {
    dataSource: [
      { text: "父項目（工程階段）", value: "parent" },
      { text: "子項目（材料/工序）", value: "child" },
    ],
    fields: { text: "text", value: "value" },
  },
});

// 當前版本
const currentVersion = computed(() => scheduleStore.currentVersion);

// 當前版本的任務列表
const currentTasks = computed(() => {
  return currentVersion.value?.tasks || [];
});

// 計算版本的開工日期和完工日期
const getVersionDates = (version: ScheduleVersion) => {
  // 優先使用用戶設定的開工日期
  let startDate: Date | null = version.startDate
    ? new Date(version.startDate)
    : null;
  let endDate: Date | null = null;

  // 如果沒有工項，直接返回
  if (!version.tasks || version.tasks.length === 0) {
    return { startDate, endDate };
  }

  let minStartDate: Date | null = null;
  let maxEndDate: Date | null = null;

  // 遞迴收集所有任務的日期（包括子任務）
  const collectDates = (tasks: any[]) => {
    tasks.forEach((task) => {
      if (task.StartDate) {
        const taskStartDate = new Date(task.StartDate);
        if (!minStartDate || taskStartDate < minStartDate) {
          minStartDate = taskStartDate;
        }
      }

      if (task.EndDate) {
        const taskEndDate = new Date(task.EndDate);
        if (!maxEndDate || taskEndDate > maxEndDate) {
          maxEndDate = taskEndDate;
        }
      }

      // 處理子任務
      if (task.subtasks && task.subtasks.length > 0) {
        collectDates(task.subtasks);
      }
    });
  };

  collectDates(version.tasks);

  // 如果沒有用戶設定的開工日期，使用計算得出的
  if (!startDate) {
    startDate = minStartDate;
  }

  // 完工日期始終使用計算得出的（所有工項中最晚的結束日期）
  endDate = maxEndDate;

  return {
    startDate,
    endDate,
  };
};

// 格式化日期顯示（民國年月日）
const formatDateShort = (date: Date | null) => {
  if (!date) return "-";
  const year = date.getFullYear();
  const rocYear = year - 1911; // 轉換為民國年
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${rocYear}/${month}/${day}`;
};

// 格式化 TreeGrid 中的日期顯示（民國年/月/日）
const formatDateForGrid = (date: Date | string | null) => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const year = d.getFullYear();
  const rocYear = year - 1911;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${rocYear}/${month}/${day}`;
};

// 根據層級返回不同的 CSS 類別
const getTaskLevelClass = (data: any) => {
  // 使用 TreeGrid 的層級資訊
  const level =
    data.level !== undefined
      ? data.level
      : data.subtasks && data.subtasks.length > 0
        ? 0
        : 1;
  return `task-level-${level}`;
};

// 父任務列表（用於下拉選單）
const parentTasks = computed(() => {
  return currentTasks.value.filter((task: any) => !task.parentItem);
});

// 計算任務總數（包括子任務）
const calculateTaskCount = (tasks: any[]): number => {
  let count = 0;
  const countTasks = (taskList: any[]) => {
    taskList.forEach(task => {
      count++;
      if (task.subtasks && task.subtasks.length > 0) {
        countTasks(task.subtasks);
      }
    });
  };
  countTasks(tasks);
  return count;
};

// 生成階層式任務ID
const generateHierarchicalTaskId = (tasks: any[]): void => {
  const generateIds = (taskList: any[], parentId: string = '') => {
    taskList.forEach((task, index) => {
      const currentId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;
      task.TaskID = currentId;
      
      if (task.subtasks && task.subtasks.length > 0) {
        generateIds(task.subtasks, currentId);
      }
    });
  };
  
  generateIds(tasks);
};

// 計算父項的工期與起訖：以所有子項最早開始與最晚結束的天數跨度為準
const updateParentDurations = (tasks: any[]): void => {
  const dayMs = 24 * 60 * 60 * 1000
  const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const process = (task: any) => {
    if (!task.subtasks || task.subtasks.length === 0) return

    // 先遞迴子項，確保子項日期就緒
    task.subtasks.forEach((st: any) => process(st))

    let minStart: Date | null = null
    let maxEnd: Date | null = null

    for (const st of task.subtasks) {
      const s = st.StartDate ? new Date(st.StartDate) : null
      const e = st.EndDate ? new Date(st.EndDate) : null
      if (s && (!minStart || s < minStart)) minStart = s
      if (e && (!maxEnd || e > maxEnd)) maxEnd = e
    }

    task.StartDate = minStart || null
    task.EndDate = maxEnd || null

    if (minStart && maxEnd) {
      const s0 = normalize(minStart)
      const e0 = normalize(maxEnd)
      const days = Math.floor((e0.getTime() - s0.getTime()) / dayMs)
      task.Duration = days >= 0 ? days + 1 : 0
    } else {
      task.Duration = 0
    }
  }

  tasks.forEach((t) => process(t))
};

// 更新 TreeGrid 數據
const updateTreeGridData = () => {
  try {
    if (!currentVersion.value?.tasks) {
      treeGridData.value = [];
      return;
    }

    // 先更新父項聚合欄位（避免顯示不一致）
    updateParentDurations(currentVersion.value.tasks);

    // 轉換數據格式以符合 TreeGrid 要求
    treeGridData.value = currentVersion.value.tasks.map((task: any) => ({
      ...task,
      TaskType: task.subtasks && task.subtasks.length > 0 ? "parent" : "child",
      subtasks: task.subtasks || [],
    }));
  } catch (error) {
    console.error('更新 TreeGrid 數據時發生錯誤:', error);
    treeGridData.value = [];
  }
};

// 監聽版本變化，更新 TreeGrid 數據
watch(
  () => scheduleStore.currentVersionId,
  () => {
    try {
      // 重新生成階層式ID
      if (currentVersion.value?.tasks) {
        generateHierarchicalTaskId(currentVersion.value.tasks);
      }
      updateTreeGridData();
    } catch (error) {
      console.error('版本切換時發生錯誤:', error);
    }
  },
  { immediate: true }
);

// TreeGrid 事件處理
const onActionComplete = (args: any) => {
  // 調試：記錄所有事件類型
  console.log('TreeGrid 操作完成事件:', args.requestType, args)
  
  if (args.requestType === "save") {
    // 保存操作完成後更新 store
    if (currentVersion.value) {
      currentVersion.value.tasks = treeGridData.value.map((task: any) => {
        const { TaskType, ...rest } = task;
        return rest;
      });
      
      // 更新父項任務的工期
      updateParentDurations(currentVersion.value.tasks);
      
      scheduleStore.updateVersion(
        currentVersion.value.id,
        currentVersion.value
      );
    }
  }
  
  // 處理拖拽移動/重新排序事件
  if (args.requestType === "rowDragAndDrop" || args.requestType === "reorder" || 
      args.requestType === "dragAndDrop" || args.requestType === "rowDrop") {
    console.log('檢測到 TreeGrid 任務移動/重新排序，將去抖後保存')
    // 去抖：短延遲後僅觸發一次處理
    if ((processDragDropData as any)._timer) {
      clearTimeout((processDragDropData as any)._timer)
    }
    ;(processDragDropData as any)._timer = setTimeout(() => {
      processDragDropData()
      ;(processDragDropData as any)._timer = null
    }, 150)
  }
  
  // 處理刷新事件（拖拽操作完成的通知）
  // 將 refresh 視為拖拽完成的信號（某些情況僅會觸發 refresh）
  if (args.requestType === "refresh") {
    console.log('檢測到 TreeGrid refresh，視為拖拽完成信號（去抖觸發保存）')
    if ((processDragDropData as any)._timer) {
      clearTimeout((processDragDropData as any)._timer)
    }
    ;(processDragDropData as any)._timer = setTimeout(() => {
      processDragDropData()
      ;(processDragDropData as any)._timer = null
    }, 200)
  }
  
  // 捕獲所有可能導致數據變更的事件（通用處理）
  const handledEvents = [
    'save', 'rowDragAndDrop', 'reorder', 'dragAndDrop', 
    'rowDrop', 'beforeRowDrop', 'afterRowDrop', 'refresh'
  ]
  
  const skipEvents = [
    'actionBegin', 'actionComplete', 'load', 'created',
    'dataBound', 'rowSelecting', 'rowSelected', 'beginEdit',
    'collapse', 'expand', 'collapsed', 'expanded'
  ]
  
  if (!handledEvents.includes(args.requestType) && !skipEvents.includes(args.requestType)) {
    console.log('⚠️ TreeGrid 檢測到未處理的事件類型，嘗試自動儲存:', args.requestType)
    
    if (currentVersion.value) {
      currentVersion.value.tasks = treeGridData.value.map((task: any) => {
        const { TaskType, ...rest } = task;
        return rest;
      });
      
      // 更新父項任務的工期
      updateParentDurations(currentVersion.value.tasks);
      
      scheduleStore.updateVersion(
        currentVersion.value.id,
        currentVersion.value
      );
      
      // 儲存到 localStorage
      scheduleStore.saveToLocalStorage();
      
      console.log('✅ TreeGrid 未處理事件已自動儲存:', args.requestType)
    }
  }
};

// 數據綁定完成事件處理（保留作為備用）
const onDataBound = () => {
  console.log('TreeGrid 數據綁定和渲染已完成')
  // 暫時不使用 dataBound 事件，因為觸發時序不穩定
}

// 處理拖拽數據的函數（保存並校正ID）
const processDragDropData = () => {
  try {
    // 防止重複處理
    if (isProcessingRefresh) {
      console.log('正在處理拖拽數據，跳過重複處理')
      return
    }
    
    console.log('開始保存拖拽後的數據（並校正ID）')
    
    // 設置處理標記
    isProcessingRefresh = true
    
    // 從 TreeGrid 實例中獲取最新的數據源
    const treeGridInstance = (treegrid.value as any)?.ej2Instances
    if (!treeGridInstance || !currentVersion.value) {
      console.warn('TreeGrid 實例或當前版本不存在')
      return
    }
    
    // 獲取 TreeGrid 的當前數據（已經包含拖拽後的最新結構）
    const flatData = treeGridInstance.flatData || treeGridInstance.getCurrentViewRecords()
    
    console.log('從 TreeGrid 獲取的扁平數據:', flatData)
    
    // 以工具函式建樹
    const convertedTasks = buildTreeFromFlat(flatData)
    console.log('轉換後的樹狀結構:', convertedTasks)
    // 先更新到 currentVersion（結構）
    currentVersion.value.tasks = convertedTasks;
    // 為缺少 Uid 的節點補齊 Uid
    ensureUidsInTree(currentVersion.value.tasks)

    // 依照當前 TreeGrid 的顯示層級，直接從 flatData 生成「Uid -> 新 TaskID」映射
    const newIdByUid = computeDisplayIdsFromFlat(flatData)

    // 建立 舊ID -> 新ID 對照（用 Uid 對齊）
    const oldIdByUid = new Map<string, string>()
    const collectOld = (nodes: any[]) => {
      nodes.forEach(n => {
        if (n.Uid != null) oldIdByUid.set(String(n.Uid), String(n.TaskID))
        if (n.subtasks && n.subtasks.length > 0) collectOld(n.subtasks)
      })
    }
    collectOld(currentVersion.value.tasks)

    const idMap: Record<string, string> = {}
    newIdByUid.forEach((newId: string, uid: string) => {
      const oldId = oldIdByUid.get(uid)
      if (oldId) idMap[oldId] = newId
    })

    // 將新 TaskID 套用到 store（依 Uid）
    applyDisplayIdsToStore(currentVersion.value.tasks, newIdByUid)

    // 依賴 Predecessor 同步至新 ID
    rewritePredecessorByIdMap(currentVersion.value.tasks, idMap)
    console.log('ID校正完成並已同步依賴關係')
    
    // 更新父項聚合欄位（Start/End/Duration/Cost/Amount）
    console.log('開始更新父項聚合欄位...')
    updateParentDurations(currentVersion.value.tasks)
    console.log('父項聚合欄位更新完成')
    
    // 更新 store 並保存到 localStorage
    console.log('保存數據到 store 和 localStorage...')
    scheduleStore.updateVersion(
      currentVersion.value.id,
      currentVersion.value
    );
    scheduleStore.saveToLocalStorage();
    console.log('✅ 數據已保存到 localStorage')
    
    // 就地更新 TreeGrid flatData 的父項聚合欄位與 TaskID 顯示
    try {
      const gridCmp = (treegrid.value as any)
      const grid = gridCmp?.ej2Instances || gridCmp
      if (grid && Array.isArray(grid.flatData)) {
        // 建立 Uid -> 聚合欄位 對照
        const aggregateByUid = new Map<string, any>()
        const collect = (nodes: any[]) => {
          nodes.forEach(n => {
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
            if (n.subtasks && n.subtasks.length > 0) collect(n.subtasks)
          })
        }
        collect(currentVersion.value.tasks)

        // 套用到 flatData（不重綁 dataSource）
        grid.flatData.forEach((row: any) => {
          const uid = getUidFromRecord(row)
          const agg = aggregateByUid.get(uid)
          if (agg) {
            // 顯示用 ID
            if (row.TaskID !== agg.TaskID) {
              row.TaskID = agg.TaskID
              if (row.taskData) row.taskData.TaskID = agg.TaskID
            }
            // 聚合欄位
            row.StartDate = agg.StartDate
            row.EndDate = agg.EndDate
            row.Duration = agg.Duration
            row.CostRatio = agg.CostRatio
            row.ActualAmount = agg.ActualAmount
            if (row.taskData) {
              row.taskData.StartDate = agg.StartDate
              row.taskData.EndDate = agg.EndDate
              row.taskData.Duration = agg.Duration
              row.taskData.CostRatio = agg.CostRatio
              row.taskData.ActualAmount = agg.ActualAmount
            }
          }
        })
        if (grid.refresh) grid.refresh()
      }
    } catch (e) {
      console.warn('就地更新聚合欄位失敗，但不影響資料：', e)
    }
    
    console.log('✅ 拖拽數據保存完成（已校正ID，已就地更新顯示）')
    
  } catch (error) {
    console.error('拖拽數據保存錯誤:', error)
  } finally {
    // 延遲重置標記
    setTimeout(() => {
      isProcessingRefresh = false
      console.log('拖拽處理標記已重置')
    }, 500)
  }
}

const onActionBegin = (args: any) => {
  console.log("onActionBegin:", args.requestType, args);

  // 如果是右鍵選單觸發的編輯，打開 Modal
  if (args.requestType === "beginEdit") {
    args.cancel = true;

    // 檢查是否有選中的記錄
    if (treegrid.value) {
      const selectedRecords = treegrid.value.getSelectedRecords();
      if (selectedRecords.length > 0) {
        const selected = selectedRecords[0] as any;
        
        // 檢查是否為父項任務（有子任務）
        const isParentTask = selected.subtasks && selected.subtasks.length > 0;

        dialogMode.value = "edit";
        editingTaskId.value = selected.TaskID;

        taskForm.value = {
          TaskID: selected.TaskID,
          TaskName: selected.TaskName || "",
          StartDate: selected.StartDate
            ? new Date(selected.StartDate).toISOString().split("T")[0]
            : "",
        EndDate: selected.EndDate
          ? new Date(selected.EndDate).toISOString().split("T")[0]
          : "",
        Duration: selected.Duration || 1,
        CostRatio: selected.CostRatio || 0,
        ActualAmount: selected.ActualAmount || 0,
          ParentID: null,
          isParentTask: isParentTask // 標記是否為父項任務
        };

        showTaskDialog.value = true;
      }
    }
    return;
  }

  // 阻止內聯保存
  if (args.requestType === "save") {
    args.cancel = true;
    return;
  }

  if (args.requestType === "add") {
    // 新增行時設定預設值
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    args.data = {
      TaskID: Date.now(),
      TaskName: "",
      StartDate: today,
      EndDate: tomorrow,
      Duration: 1,
      CostRatio: 0,
      ActualAmount: 0,
      TaskType: "parent",
      subtasks: [],
    };
  }
};

const onRecordDoubleClick = (args: any) => {
  // 取消預設的內聯編輯行為
  args.cancel = true;

  // 雙擊行時打開編輯 Modal
  const selected = args.rowData;
  
  // 檢查是否為父項任務（有子任務）
  const isParentTask = selected.subtasks && selected.subtasks.length > 0;

  dialogMode.value = "edit";
  editingTaskId.value = selected.TaskID;

  taskForm.value = {
    TaskID: selected.TaskID,
    TaskName: selected.TaskName || "",
    StartDate: selected.StartDate
      ? new Date(selected.StartDate).toISOString().split("T")[0]
      : "",
    EndDate: selected.EndDate
      ? new Date(selected.EndDate).toISOString().split("T")[0]
      : "",
    Duration: selected.Duration || 1,
    CostRatio: selected.CostRatio || 0,
    ActualAmount: selected.ActualAmount || 0,
    ParentID: null,
    isParentTask: isParentTask // 標記是否為父項任務
  };

  showTaskDialog.value = true;
};

// 任務編輯對話框
const showTaskDialog = ref(false);
const dialogMode = ref<"add" | "edit">("add");
const editingTaskId = ref<number | null>(null);

const taskForm = ref({
  TaskID: 0,
  TaskName: "",
  StartDate: "",
  EndDate: "",
  Duration: 1,
  CostRatio: 0,
  ActualAmount: 0,
  ParentID: null as number | null,
  isParentTask: false // 標記是否為父項任務
});

// 選中的父項目名稱
const selectedParentName = computed(() => {
  if (!taskForm.value.ParentID) return null;

  // 從 TreeGrid 的 flatData 中查找
  if (treegrid.value) {
    const grid = treegrid.value as any;
    const parentRecord = grid.flatData?.find(
      (item: any) => item.TaskID === taskForm.value.ParentID
    );
    return parentRecord?.TaskName || null;
  }
  return null;
});

// 對話框標題
const dialogTitle = computed(() => {
  return dialogMode.value === "add" ? "新增排程項目" : "編輯排程項目";
});

// 自訂工具列事件處理（使用插槽）
const handleAdd = () => {
  dialogMode.value = "add";

  // 如果有選中項目，預設新增為其子項目
  let parentId = null;
  if (treegrid.value) {
    const selectedRecords = treegrid.value.getSelectedRecords();
    if (selectedRecords.length > 0) {
      const selected = selectedRecords[0] as any;
      parentId = selected.TaskID;
    }
  }

  taskForm.value = {
    TaskID: 0,
    TaskName: "",
    StartDate: "",
    EndDate: "",
    Duration: 1,
    CostRatio: 0,
    ActualAmount: 0,
    ParentID: parentId,
    isParentTask: false // 新增任務不是父項任務
  };
  showTaskDialog.value = true;
};

const handleEdit = () => {
  if (treegrid.value) {
    const selectedRecords = treegrid.value.getSelectedRecords();
    if (selectedRecords.length > 0) {
      const selected = selectedRecords[0] as any;
      
      // 檢查是否為父項任務（有子任務）
      const isParentTask = selected.subtasks && selected.subtasks.length > 0;

      dialogMode.value = "edit";
      editingTaskId.value = selected.TaskID;

      taskForm.value = {
        TaskID: selected.TaskID,
        TaskName: selected.TaskName || "",
        StartDate: selected.StartDate
          ? new Date(selected.StartDate).toISOString().split("T")[0]
          : "",
        EndDate: selected.EndDate
          ? new Date(selected.EndDate).toISOString().split("T")[0]
          : "",
        Duration: selected.Duration || 1,
        CostRatio: selected.CostRatio || 0,
        ActualAmount: selected.ActualAmount || 0,
        ParentID: null,
        isParentTask: isParentTask // 標記是否為父項任務
      };

      showTaskDialog.value = true;
    } else {
      alert("請先選擇要編輯的項目");
    }
  }
};

const handleDelete = () => {
  if (treegrid.value) {
    const selectedRecords = treegrid.value.getSelectedRecords();
    if (selectedRecords.length > 0) {
      if (confirm("確定要刪除選中的項目嗎？")) {
        const selected = selectedRecords[0] as any;
        
        // 從 store 中刪除任務
        if (currentVersion.value) {
          const deleteTask = (tasks: any[]): boolean => {
            for (let i = 0; i < tasks.length; i++) {
              if (tasks[i].TaskID === selected.TaskID) {
                tasks.splice(i, 1);
                return true;
              }
              if (tasks[i].subtasks && deleteTask(tasks[i].subtasks)) {
                return true;
              }
            }
            return false;
          };
          
          if (deleteTask(currentVersion.value.tasks || [])) {
            // 重新生成階層式ID
            generateHierarchicalTaskId(currentVersion.value.tasks);
            
            // 更新父項任務的工期
            updateParentDurations(currentVersion.value.tasks);
            
            // 更新 store
            scheduleStore.updateVersion(currentVersion.value.id, {
              tasks: currentVersion.value.tasks,
              taskCount: calculateTaskCount(currentVersion.value.tasks)
            });
            
            // 更新 TreeGrid 資料
            updateTreeGridData();
          }
        }
      }
    } else {
      alert("請先選擇要刪除的項目");
    }
  }
};

const handleSave = () => {
  if (treegrid.value) {
    treegrid.value.endEdit();
  }
};

const handleCancel = () => {
  if (treegrid.value) {
    treegrid.value.closeEdit();
  }
};

const handleSearch = () => {
  if (treegrid.value) {
    treegrid.value.search(searchText.value);
  }
};

const handleRefresh = () => {
  updateTreeGridData();
};

// 儲存資料
const saveData = () => {
  try {
    // 先同步 TreeGrid 資料到 store
    if (currentVersion.value) {
      currentVersion.value.tasks = treeGridData.value.map((task: any) => {
        const { TaskType, ...rest } = task;
        return rest;
      });
      scheduleStore.updateVersion(
        currentVersion.value.id,
        currentVersion.value
      );
    }
    
    // 然後儲存到 localStorage
    scheduleStore.saveToLocalStorage();
    
    // 顯示成功訊息
    const toast = document.createElement('div')
    toast.className = 'toast-notification'
    toast.innerHTML = `
      <div class="alert alert-success alert-dismissible fade show" role="alert">
        <i class="fa fa-check-circle me-2"></i>
        排程資料已成功儲存到本地儲存空間
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
    
    // 3秒後自動移除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 3000)
  } catch (error) {
    console.error('儲存資料失敗:', error)
    alert('儲存資料失敗，請檢查瀏覽器設定')
  }
};

const handleExpandAll = () => {
  if (treegrid.value) {
    (treegrid.value as any).expandAll();
  }
};

const handleCollapseAll = () => {
  if (treegrid.value) {
    (treegrid.value as any).collapseAll();
  }
};

const handleIndent = () => {
  if (treegrid.value) {
    const selectedRecords = treegrid.value.getSelectedRecords();
    if (selectedRecords.length > 0) {
      (treegrid.value as any).indent();
    } else {
      alert("請先選擇要降階為子項目的項目");
    }
  }
};

const handleOutdent = () => {
  if (treegrid.value) {
    const selectedRecords = treegrid.value.getSelectedRecords();
    if (selectedRecords.length > 0) {
      (treegrid.value as any).outdent();
    } else {
      alert("請先選擇要升階為上層項目的項目");
    }
  }
};

// 儲存任務
const handleTaskSave = () => {
  if (!taskForm.value.TaskName) {
    alert("請填寫項目名稱");
    return;
  }

  // 如果是父項任務且為編輯模式，只允許編輯名稱
  if (taskForm.value.isParentTask && dialogMode.value === 'edit') {
    if (currentVersion.value) {
      const updateTaskName = (tasks: any[]): boolean => {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].TaskID === taskForm.value.TaskID) {
            tasks[i].TaskName = taskForm.value.TaskName;
            return true;
          }
          if (tasks[i].subtasks && updateTaskName(tasks[i].subtasks)) {
            return true;
          }
        }
        return false;
      };
      
      if (updateTaskName(currentVersion.value.tasks || [])) {
        // 更新 store
        scheduleStore.updateVersion(currentVersion.value.id, {
          tasks: currentVersion.value.tasks
        });
        
        // 更新 TreeGrid 資料
        updateTreeGridData();
        
        showTaskDialog.value = false;
        console.log('父項任務名稱已更新:', taskForm.value.TaskName);
        return;
      }
    }
  }

  // 處理開始日期和結束日期（新增僅需名稱；編輯才依表單計算）
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  if (dialogMode.value === 'edit') {
    const sdStr = taskForm.value.StartDate
    const edStr = taskForm.value.EndDate
    const dur = taskForm.value.Duration
    if (sdStr) startDate = new Date(sdStr)
    if (edStr) endDate = new Date(edStr)
    // 若同時提供起訖，重算工期；否則若有起日+工期，推算訖日
    if (startDate && endDate) {
      const dayMs = 24 * 60 * 60 * 1000
      const s0 = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
      const e0 = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
      const days = Math.floor((e0.getTime() - s0.getTime()) / dayMs)
      taskForm.value.Duration = days >= 0 ? days + 1 : 0
    } else if (startDate && dur && dur > 0) {
      const calc = new Date(startDate)
      calc.setDate(calc.getDate() + dur - 1)
      endDate = calc
    }
  }

  const taskData: any = {
    Uid: genUid(),
    TaskID: taskForm.value.TaskID || 'temp', // 暫時使用 temp，稍後重新生成ID
    TaskName: taskForm.value.TaskName,
    StartDate: dialogMode.value === 'add' ? null : startDate,
    EndDate: dialogMode.value === 'add' ? null : endDate,
    Duration: dialogMode.value === 'add' ? 0 : (taskForm.value.Duration || 0),
    Progress: 0, // 預設進度為 0
    Predecessor: '', // 預設空字串，可在表格中編輯
    CostRatio: dialogMode.value === 'add' ? 0 : (taskForm.value.CostRatio || 0),
    ActualAmount: dialogMode.value === 'add' ? 0 : (taskForm.value.ActualAmount || 0),
    subtasks: [],
  };

  if (dialogMode.value === "add") {
    // 新增任務 - 直接更新 store 和 TreeGrid 資料
    if (currentVersion.value) {
      if (taskForm.value.ParentID) {
        // 新增為子項目
        const addToParent = (tasks: any[]): boolean => {
          for (const task of tasks) {
            if (task.TaskID === taskForm.value.ParentID) {
              if (!task.subtasks) task.subtasks = [];
              task.subtasks.push(taskData);
              return true;
            }
            if (task.subtasks && addToParent(task.subtasks)) {
              return true;
            }
          }
          return false;
        };
        addToParent(currentVersion.value.tasks || []);
      } else {
        // 新增為頂層項目
        if (!currentVersion.value.tasks) {
          currentVersion.value.tasks = [];
        }
        currentVersion.value.tasks.push(taskData);
      }
      
      // 重新生成階層式ID
      generateHierarchicalTaskId(currentVersion.value.tasks);
      
      // 更新父項任務的工期
      updateParentDurations(currentVersion.value.tasks);
      
      // 更新 store
      scheduleStore.updateVersion(currentVersion.value.id, {
        tasks: currentVersion.value.tasks,
        taskCount: calculateTaskCount(currentVersion.value.tasks)
      });
      
      // 更新 TreeGrid 資料
      updateTreeGridData();
    }
  } else {
    // 編輯任務 - 更新 store 和 TreeGrid 資料
    if (currentVersion.value) {
      const updateTask = (tasks: any[]): boolean => {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].TaskID === taskData.TaskID) {
            tasks[i] = { ...tasks[i], ...taskData };
            return true;
          }
          if (tasks[i].subtasks && updateTask(tasks[i].subtasks)) {
            return true;
          }
        }
        return false;
      };
      
      if (updateTask(currentVersion.value.tasks || [])) {
        // 重新生成階層式ID
        generateHierarchicalTaskId(currentVersion.value.tasks);
        
        // 更新父項任務的工期
        updateParentDurations(currentVersion.value.tasks);
        
        // 更新 store
        scheduleStore.updateVersion(currentVersion.value.id, {
          tasks: currentVersion.value.tasks,
          taskCount: calculateTaskCount(currentVersion.value.tasks)
        });
        
        // 更新 TreeGrid 資料
        updateTreeGridData();
      }
    }
  }

  showTaskDialog.value = false;
};

// 版本操作相關的 Modal 和函數已移除
// 版本管理功能現在透過右上角的 VersionSelector 組件處理

// 任務操作
const addTask = () => {
  if (treegrid.value) {
    treegrid.value.addRecord();
  }
};

// 組件已在 main.ts 中全局註冊

// 檔案匯入功能保持不變

// 檔案匯入
const importFromFile = () => {
  fileInput.value?.click();
};

// 匯入功能（工具列用）
const handleImport = () => {
  importFromFile();
};

// 匯出功能
const handleExport = () => {
  if (treegrid.value) {
    // 可以匯出為 Excel、PDF、CSV 等格式
    const exportOptions = {
      fileName: `排程版本_${currentVersion.value?.name || "未命名"}_${new Date().toISOString().split("T")[0]}`,
      type: "Excel", // 或 'Pdf', 'Csv'
    };

    // 使用 TreeGrid 的匯出功能
    treegrid.value.excelExport(exportOptions);
  }
};

const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !currentVersion.value) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const data = JSON.parse(content);

      // 假設匯入的是任務陣列
      if (Array.isArray(data) && currentVersion.value) {
        currentVersion.value.tasks = data;
        const totalTasks = data.reduce(
          (sum: number, t: any) => sum + 1 + (t.subtasks?.length || 0),
          0
        );
        scheduleStore.updateVersion(currentVersion.value.id, {
          taskCount: totalTasks,
          tasks: data,
        });
        alert("匯入成功！");
        updateTreeGridData();
      } else {
        alert("檔案格式錯誤");
      }
    } catch (error) {
      alert("匯入失敗：" + error);
    }
  };
  reader.readAsText(file);

  // 清空 input
  target.value = "";
};

// 初始化：更新 TreeGrid 數據
updateTreeGridData();
</script>

<style scoped>
/* 頁面包裝器 */
.page-wrapper {
  height: 100%;
  min-height: 0;
}

/* 內容區域 */
.content-area {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 空狀態樣式 */
.empty-state-wrapper {
  min-height: 400px;
  padding: 3rem;
}

.empty-state-content {
  max-width: 500px;
}

.empty-state-content h4 {
  color: var(--bs-body-color);
  font-weight: 600;
}

.empty-state-content .fa-folder-open {
  opacity: 0.4;
}

/* Tab 樣式 */
.nav-tabs {
  background: transparent;
}

.nav-tabs .nav-link {
  color: var(--bs-body-color);
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.75rem 1.5rem;
  transition: all 0.2s;
  opacity: 0.6;
}

.nav-tabs .nav-link:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.05);
}

.nav-tabs .nav-link.active {
  color: var(--bs-theme);
  background: transparent;
  border-bottom-color: var(--bs-theme);
  opacity: 1;
  font-weight: 600;
}

/* Tab 分隔線 */
.tab-divider {
  display: flex;
  align-items: center;
  padding: 0 1rem;
}

.nav-divider {
  display: block;
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
}

/* TreeGrid 包裝器 */
.treegrid-wrapper {
  min-height: 0;
  overflow: hidden;
}

/* TreeGrid 組件樣式 */
.e-treegrid {
  border: none !important;
  border-radius: 0 0 8px 8px;
  background: transparent !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 所有內容區域透明 */
.e-treegrid .e-gridcontent,
.e-treegrid .e-gridheader,
.e-treegrid .e-table,
.e-treegrid .e-content,
.e-treegrid .e-headercontent {
  background: transparent !important;
}

/* TreeGrid 內容區域填滿 */
.e-treegrid .e-content {
  flex: 1 !important;
  min-height: 0 !important;
  overflow: auto !important;
}

.e-treegrid .e-gridcontent {
  height: 100% !important;
}

/* 表格行透明 */
.e-treegrid .e-row,
.e-treegrid .e-altrow {
  background: transparent !important;
}

/* 表格標題和儲存格透明 */
.e-treegrid .e-headercell,
.e-treegrid .e-rowcell,
.e-treegrid .e-headercelldiv {
  background: transparent !important;
}

/* 工具列透明（如果有的話） */
.e-treegrid .e-toolbar,
.e-treegrid .e-toolbar-items {
  background: transparent !important;
}

/* Bootstrap vr 分隔線樣式調整 */
.vr {
  opacity: 0.3;
}
</style>

<style>
/* TreeGrid 透明背景（全局樣式，參考 Gantt） */
.e-treegrid {
  background: transparent !important;
}

.e-treegrid .e-gridcontent,
.e-treegrid .e-gridheader,
.e-treegrid .e-table,
.e-treegrid .e-content,
.e-treegrid .e-headercontent {
  background: transparent !important;
}

.e-treegrid .e-row,
.e-treegrid .e-altrow {
  background: transparent !important;
}

.e-treegrid .e-headercell,
.e-treegrid .e-rowcell,
.e-treegrid .e-headercelldiv {
  background: transparent !important;
}

/* 拖拉圖示欄位透明 */
.e-treegrid .e-rowdragheader,
.e-treegrid .e-icons.e-rowdragheader {
  background: transparent !important;
}

/* 選中行樣式 */
.e-treegrid .e-selectionbackground,
.e-treegrid .e-active,
.e-treegrid tr.e-row[aria-selected="true"],
.e-treegrid tr.e-row[aria-selected="true"] td {
  background: rgba(13, 110, 253, 0.2) !important;
  color: inherit !important;
}

.e-treegrid tr.e-row[aria-selected="true"]:hover,
.e-treegrid tr.e-row[aria-selected="true"]:hover td {
  background: rgba(13, 110, 253, 0.3) !important;
}

/* 任務層級顏色區分 - 支援多層級（暗黑模式優化） */

/* 第 0 層（最上層）- 金黃色 */
.e-treegrid tr.e-row:has(.task-level-0) {
  border-left: 3px solid #ffc107;
}

.e-treegrid tr.e-row:has(.task-level-0) td {
  color: #ffc107 !important;
  font-weight: 600;
}

/* 第 1 層 - 亮藍色 */
.e-treegrid tr.e-row:has(.task-level-1) {
  border-left: 3px solid #74c0fc;
}

.e-treegrid tr.e-row:has(.task-level-1) td {
  color: #74c0fc !important;
  font-weight: 500;
}

/* 第 2 層 - 翠綠色 */
.e-treegrid tr.e-row:has(.task-level-2) {
  border-left: 3px solid #51cf66;
}

.e-treegrid tr.e-row:has(.task-level-2) td {
  color: #51cf66 !important;
  font-weight: 400;
}

/* 第 3 層 - 粉橘色 */
.e-treegrid tr.e-row:has(.task-level-3) {
  border-left: 3px solid #ff8787;
}

.e-treegrid tr.e-row:has(.task-level-3) td {
  color: #ff8787 !important;
  font-weight: 400;
}

/* 第 4 層 - 紫羅蘭色 */
.e-treegrid tr.e-row:has(.task-level-4) {
  border-left: 3px solid #cc5de8;
}

.e-treegrid tr.e-row:has(.task-level-4) td {
  color: #cc5de8 !important;
  font-weight: 400;
}

/* 第 5 層及以上 - 青綠色 */
.e-treegrid tr.e-row:has(.task-level-5) {
  border-left: 3px solid #20c997;
}

.e-treegrid tr.e-row:has(.task-level-5) td {
  color: #20c997 !important;
  font-weight: 400;
}

/* 對話框內父項目禁用欄位的視覺效果 */
.disabled-field { cursor: not-allowed; }
.disabled-field .form-control[disabled] {
  background-color: #e9ecef !important;
  color: #6c757d !important;
  cursor: not-allowed !important;
}
/* RepublicDatePicker（Syncfusion/自訂）可能包裝了內部輸入，增加灰階與停用互動 */
.disabled-field { opacity: 0.65; }
.disabled-field :is(.e-input, .e-input-group, .e-control-wrapper) {
  pointer-events: none !important;
}
/* 深度選擇器，保險處理第三方組件輸入框 */
::deep(.disabled-field input),
::deep(.disabled-field .e-input),
::deep(.disabled-field .e-input-group) {
  background-color: #e9ecef !important;
  color: #6c757d !important;
  cursor: not-allowed !important;
}
</style>
