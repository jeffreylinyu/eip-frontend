<template>
  <div class="materials-section">
    <PageHeader
      v-if="!isFullscreen"
      title="材料進場與使用"
      icon="fa fa-boxes"
      :breadcrumbs="[
        { text: dailyLogManageLabel, href: 'javascript:;' },
        { text: '材料進場與使用', active: true },
      ]"
    />
    <div style="background-color: #0f172a" :class="{ 'fullscreen-mode': isFullscreen }">
      <Card ref="cardRef" class="materials-card" :class="{ 'fullscreen-card': isFullscreen }">
        <CardHeader>
          <div class="d-flex justify-content-between align-items-center">
            <h5 class="mb-0">材料進場紀錄表</h5>
             <div class="d-flex gap-2">
               <button
                 class="btn btn-sm btn-outline-primary"
                 type="button"
                 @click="addDateRow"
               >
                 <i class="fa fa-plus me-1"></i>新增日期
               </button>
               <button
                 class="btn btn-sm btn-outline-theme"
                 type="button"
                 @click="saveData"
                 :disabled="isLoading"
               >
                 <i class="fa fa-save me-1"></i>儲存
               </button>
               <button
                 class="btn btn-sm btn-outline-secondary"
                 type="button"
                 @click="showMaterialModal = true"
                 title="選擇要顯示的材料欄位"
               >
                 <i class="fa fa-list-check me-1"></i>選擇欄位
               </button>
               <button
                 class="btn btn-sm btn-outline-info"
                 type="button"
                 @click="toggleFullscreen"
                 :title="isFullscreen ? '退出全螢幕' : '全螢幕'"
               >
                 <i :class="isFullscreen ? 'fa fa-compress' : 'fa fa-expand'" class="me-1"></i>
                 {{ isFullscreen ? '退出全螢幕' : '全螢幕' }}
               </button>
             </div>
          </div>
        </CardHeader>
        <CardBody class="p-0">
          <div class="ag-grid-wrapper" data-ag-theme-mode="dark">
          <ag-grid-vue
            class="ag-theme-alpine materials-grid"
            theme="legacy"
            :columnDefs="columnDefs"
            :rowData="rowData"
            :pinnedBottomRowData="pinnedBottomRowData"
            :defaultColDef="defaultColDef"
            :pinnedLeftColumns="['date']"
            :rowSelection="{ mode: 'singleRow', enableClickSelection: false }"
            :enableCellChangeFlash="true"
            :animateRows="true"
            :rowHeight="40"
            :headerHeight="40"
            :getRowId="getRowId"
            :suppressSizeToFit="true"
            @cellValueChanged="onCellValueChanged"
            @gridReady="onGridReady"
          />
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- 材料欄位選擇 Modal -->
    <Modal
      v-model:show="showMaterialModal"
      title="選擇要顯示的材料欄位"
      icon="fa fa-list-check"
      size="lg"
      modal-id="materialSelectionModal"
      confirm-text="確認"
      cancel-text="取消"
      @confirm="applyMaterialSelection"
      @hide="handleMaterialModalHide"
    >
      <template #body>
        <div class="material-selection-modal">
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label mb-0 fw-bold">材料清單</label>
              <div class="d-flex gap-2">
                <button
                  class="btn btn-sm btn-outline-primary"
                  type="button"
                  @click="selectAllMaterials"
                >
                  <i class="fa fa-check-double me-1"></i>全選
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  type="button"
                  @click="deselectAllMaterials"
                >
                  <i class="fa fa-times me-1"></i>全不選
                </button>
              </div>
            </div>
            <!-- 搜尋框 -->
            <div class="mb-3">
              <div class="input-group">
                <span class="input-group-text">
                  <i class="fa fa-search"></i>
                </span>
                <input
                  type="text"
                  class="form-control"
                  placeholder="搜尋材料名稱..."
                  v-model="materialSearchQuery"
                />
                <button
                  v-if="materialSearchQuery"
                  class="btn btn-outline-secondary"
                  type="button"
                  @click="materialSearchQuery = ''"
                  title="清除搜尋"
                >
                  <i class="fa fa-times"></i>
                </button>
              </div>
            </div>
            <div class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
              <div
                v-for="material in filteredMaterials"
                :key="material.id"
                class="form-check mb-2"
              >
                <input
                  class="form-check-input"
                  type="checkbox"
                  :id="'material-' + material.id"
                  :value="material.id"
                  v-model="selectedMaterials"
                />
                <label
                  class="form-check-label"
                  :for="'material-' + material.id"
                >
                  {{ material.name }}
                </label>
              </div>
              <div v-if="filteredMaterials.length === 0" class="text-center text-muted py-3">
                <i class="fa fa-search fa-2x mb-2"></i>
                <p class="mb-0">找不到符合「{{ materialSearchQuery }}」的材料</p>
              </div>
            </div>
            <div class="mt-2 text-muted small">
              <i class="fa fa-info-circle me-1"></i>
              已選擇 {{ selectedMaterials.length }} / {{ materials.length }} 個材料欄位
              <span v-if="materialSearchQuery">
                （顯示 {{ filteredMaterials.length }} 個符合搜尋結果）
              </span>
            </div>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import type {
  ColDef,
  GridReadyEvent,
  CellValueChangedEvent,
} from "ag-grid-community";
import PageHeader from "@/components/bootstrap/PageHeader.vue";
import { useDailyReportLabels } from "@/composables/useDailyReportLabels";

const { dailyLogManageLabel } = useDailyReportLabels();
import Card from "@/components/bootstrap/Card.vue";
import CardHeader from "@/components/bootstrap/CardHeader.vue";
import CardBody from "@/components/bootstrap/CardBody.vue";

// 註冊 AG Grid 模組
ModuleRegistry.registerModules([AllCommunityModule]);

interface Material {
  id: string;
  name: string;
}

interface RowData {
  id: string;
  type: "initial" | "date" | "total";
  date: string | null;
  [key: string]: any;
}

// 材料列表（根據圖片中的材料）
const materials = ref<Material[]>([
  { id: "rebar-sd420w", name: "鋼筋 SD420W" },
  { id: "rebar-sd280", name: "鋼筋 SD280" },
  { id: "rebar-sd280w", name: "鋼筋 SD280W" },
  { id: "concrete-105", name: "105kg/cm² 預拌混凝土" },
  { id: "concrete-140", name: "140kg/cm² 預拌混凝土" },
  { id: "concrete-210", name: "210kg/cm² 預拌混凝土" },
  { id: "concrete-245", name: "245kg/cm² 預拌混凝土" },
  { id: "concrete-280", name: "280kg/cm² 預拌混凝土" },
  { id: "concrete-350", name: "350kg/cm² 預拌混凝土" },
  { id: "concrete-420", name: "420kg/cm² 預拌混凝土" },
  { id: "concrete-420-water", name: "420kg/cm² 預拌混凝土 (水中)" },
  { id: "ready-mix-stone", name: "預拌車碎石" },
  { id: "tile-exterior", name: "外牆磁磚" },
  { id: "tile-interior", name: "室內牆磁磚" },
  { id: "tile-floor", name: "地坪磁磚" },
  { id: "mortar-md120", name: "打底砂漿 MD120" },
  { id: "mortar-mf130", name: "粉光砂漿 MF130" },
  { id: "soil-md110", name: "土膏 MD110" },
  { id: "mortar-md160", name: "崁縫砂漿 MD160" },
  { id: "adhesive-ew350", name: "磁磚黏著劑 EW350" },
  { id: "adhesive-ew330", name: "磁磚黏著劑 EW330" },
  { id: "cement", name: "水泥" },
  { id: "sand-plastering", name: "粉刷用砂" },
  { id: "sandbag", name: "砂包" },
  { id: "red-brick", name: "紅磚" },
]);

// 行資料
const rowData = ref<RowData[]>([]);

// Grid API
const gridApi = ref<any>(null);

// 載入狀態
const isLoading = ref(false);

// 生成唯一 ID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 獲取行 ID
const getRowId = (params: { data: RowData }) => {
  return params.data.id;
};

// 日期欄位定義
const dateColumnDef: ColDef = {
  field: "date",
  headerName: "日期",
  width: 180,
  pinned: "left",
  cellStyle: (params: any) => {
    const style: any = {
      textAlign: "left"
    };
    // 檢查是否是固定的底部行
    if (params.node?.rowPinned === "bottom") {
      style.fontWeight = "bold";
      style.backgroundColor = "var(--ag-header-background-color)";
    }
    return style;
  },
  cellRenderer: (params: any) => {
    // 檢查是否是固定的底部行
    if (params.node?.rowPinned === "bottom") {
      return '<span style="font-weight: bold;">合計</span>';
    }
    // 對於日期類型，顯示日期值
    if (params.data?.type === "date" && params.data?.date) {
      return params.data.date;
    }
    return null;
  },
  cellEditor: "agTextCellEditor",
  editable: (params: any) => {
    return params.data?.type === "date";
  },
  valueGetter: (params: any) => {
    // 檢查是否是固定的底部行
    if (params.node?.rowPinned === "bottom") {
      return null; // 合計行不顯示日期
    }
    // 普通行的日期
    return params.data?.date || null;
  },
  valueSetter: (params: any) => {
    if (params.data?.type === "date") {
      params.data.date = params.newValue;
      return true;
    }
    return false;
  },
};

// 材料欄位定義
const createMaterialColumnDef = (material: Material, isVisible: boolean = true): ColDef => {
  return {
    field: material.id,
    headerName: material.name,
    width: 180,
    hide: !isVisible, // 根據選擇狀態控制顯示/隱藏
    editable: (params: any) => {
      return params.data?.type === "date";
    },
    cellStyle: (params: any) => {
      const style: any = {
        'text-align': 'right', // 使用連字符格式，符合 AG Grid 官方文檔
        'justify-content': 'flex-end', // 因為 cell 使用 flex，需要同時設置 justify-content
      };
      // 檢查是否是固定的底部行
      if (params.node?.rowPinned === "bottom") {
        style.fontWeight = "bold";
        style.backgroundColor = "var(--ag-header-background-color)";
      }
      return style;
    },
    cellEditor: "agNumberCellEditor",
    cellEditorParams: {
      min: 0,
      precision: 2,
      step: 0.01,
    },
    valueFormatter: (params: any) => {
      if (
        params.value === null ||
        params.value === undefined ||
        params.value === ""
      ) {
        return "";
      }
      return parseFloat(params.value).toFixed(2);
    },
    valueGetter: (params: any) => {
      // 如果是固定的底部行（合計行），直接從 params.data 獲取
      if (params.node?.rowPinned === "bottom") {
        // 固定行的數據應該已經通過 setPinnedBottomRowData 設置
        return params.data?.[material.id] ?? 0;
      }
      // 普通行的數據
      return params.data?.[material.id] ?? null;
    },
    valueSetter: (params: any) => {
      if (params.data.type === "date") {
        const newValue =
          params.newValue === "" || params.newValue === null
            ? null
            : parseFloat(params.newValue);
        params.data[material.id] = newValue;
        // 更新後需要重新計算合計
        setTimeout(() => {
          updateTotalRow();
        }, 0);
        return true;
      }
      return false;
    },
  };
};

// 計算總計
const calculateTotal = (materialId: string): number => {
  let total = 0;

  // 加上所有日期的值
  rowData.value
    .filter((row) => row.type === "date")
    .forEach((row) => {
      if (row[materialId] !== null && row[materialId] !== undefined) {
        total += parseFloat(row[materialId]) || 0;
      }
    });

  return total;
};

// 更新合計行
const updateTotalRow = () => {
  // 直接更新 pinnedBottomRowData，Vue 會自動同步
  updatePinnedBottomRowData();
};

// 已選擇的材料 ID 列表（預設全部選中）
const selectedMaterials = ref<string[]>(materials.value.map((m) => m.id));

// 欄位定義
const columnDefs = computed<ColDef[]>(() => {
  return [
    dateColumnDef,
    ...materials.value.map((material) =>
      createMaterialColumnDef(material, selectedMaterials.value.includes(material.id))
    ),
  ];
});

// 預設欄位定義
const defaultColDef: ColDef = {
  resizable: true,
  sortable: false,
  filter: false,
  suppressSizeToFit: true, // 禁止自動調整列寬以適應容器
};

// 固定底部行數據（使用 ref 以便 Vue 響應式更新）
const pinnedBottomRowData = ref<RowData[]>([]);

// 更新固定底部行數據
const updatePinnedBottomRowData = () => {
  // 創建合計行數據，確保包含所有必要的字段
  const totalRow: RowData = {
    id: "total",
    type: "total",
    date: null,
  };
  
  // 為每個材料計算總計
  materials.value.forEach((material) => {
    totalRow[material.id] = calculateTotal(material.id);
  });
  
  // 更新 pinnedBottomRowData，Vue 會自動同步到 AG Grid
  pinnedBottomRowData.value = [totalRow];
};

// 初始化資料
const initializeData = () => {
  // 初始化空的 rowData（只有日期行）
  rowData.value = [];
  
  // 初始化固定底部行數據
  updatePinnedBottomRowData();
};

// Grid 準備就緒
const onGridReady = (params: GridReadyEvent) => {
  gridApi.value = params.api;
  initializeData();
  
  
  // 自動載入測試資料
  setTimeout(() => {
    generateTestData();
  }, 200);
};

// 儲存格值變更
const onCellValueChanged = (params: CellValueChangedEvent) => {
  if (params.data.type === "date") {
    // 更新合計行（會自動更新 pinnedBottomRowData）
    updateTotalRow();
  }
};

// 新增日期行
const addDateRow = () => {
  const today = new Date();
  const dateString = today.toISOString().split("T")[0];

  const newRow: RowData = {
    id: generateId(),
    type: "date",
    date: dateString,
  };

  materials.value.forEach((material) => {
    newRow[material.id] = null;
  });

  rowData.value.push(newRow);
  // 新增行後，更新合計行
  updateTotalRow();
  
  // 聚焦到新行的日期欄位
  if (gridApi.value) {
    setTimeout(() => {
      const newRowIndex = rowData.value.length - 1;
      gridApi.value.setFocusedCell(newRowIndex, "date");
      gridApi.value.startEditingCell({
        rowIndex: newRowIndex,
        colKey: "date",
      });
    }, 100);
  }
};

// 生成測試資料（從2025年1月1日到今天）
const generateTestData = () => {
  const startDate = new Date("2025-01-01T00:00:00");
  const today = new Date();
  today.setHours(23, 59, 59, 999); // 設置為今天的結束時間
  const testRows: RowData[] = [];

  // 遍歷從2025年1月1日到今天的每一天
  const currentDate = new Date(startDate);
  let dayCount = 0;
  
  while (currentDate <= today) {
    const dateString = currentDate.toISOString().split("T")[0];
    
    const newRow: RowData = {
      id: generateId(),
      type: "date",
      date: dateString,
    };

    // 為每個材料生成隨機測試數據（0-100之間的隨機數，保留2位小數）
    materials.value.forEach((material) => {
      // 生成0-100之間的隨機數，保留2位小數
      newRow[material.id] = parseFloat((Math.random() * 100).toFixed(2));
    });

    testRows.push(newRow);
    dayCount++;
    
    // 移動到下一天
    currentDate.setDate(currentDate.getDate() + 1);
  }


  // 更新 rowData（只有測試資料，不含合計行，因為合計行固定在底部）
  rowData.value = [...testRows];

  // 更新合計行
  updateTotalRow();

  // 刷新表格 - 使用 nextTick 確保 Vue 響應式更新完成
  if (gridApi.value) {
    setTimeout(() => {
      // 強制刷新整個表格
      gridApi.value.setGridOption('rowData', rowData.value);
      // 刷新所有單元格
      gridApi.value.refreshCells({ force: true });
    }, 200);
  }
};

// 儲存資料
const saveData = async () => {
  isLoading.value = true;
  try {
    // TODO: 實作儲存 API
    const dataToSave = {
      initialValues: rowData.value.find((row) => row.type === "initial"),
      dateRows: rowData.value.filter((row) => row.type === "date"),
    };


    // 模擬 API 呼叫
    await new Promise((resolve) => setTimeout(resolve, 500));

    alert("資料已儲存");
  } catch (error) {
    console.error("儲存失敗:", error);
    alert("儲存失敗，請稍後再試");
  } finally {
    isLoading.value = false;
  }
};

// 載入資料
const loadData = async () => {
  isLoading.value = true;
  try {
    // TODO: 實作載入 API
    // 模擬 API 呼叫
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 這裡可以從 API 載入資料並填充到 rowData
  } catch (error) {
    console.error("載入失敗:", error);
  } finally {
    isLoading.value = false;
  }
};

// 全螢幕相關
const isFullscreen = ref(false);
const cardRef = ref<InstanceType<typeof Card> | null>(null);

// 切換全螢幕
const toggleFullscreen = () => {
  if (!cardRef.value) return;
  
  const cardElement = cardRef.value.$el as HTMLElement;
  if (!cardElement) return;
  
  if (!isFullscreen.value) {
    // 進入全螢幕
    if (cardElement.requestFullscreen) {
      cardElement.requestFullscreen().then(() => {
        isFullscreen.value = true;
      }).catch((err) => {
        console.error('無法進入全螢幕:', err);
        // 如果 Fullscreen API 不可用，使用 CSS 類
        isFullscreen.value = true;
      });
    } else {
      // 使用 CSS 類作為後備方案
      isFullscreen.value = true;
    }
  } else {
    // 退出全螢幕
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        isFullscreen.value = false;
      }).catch((err) => {
        console.error('無法退出全螢幕:', err);
        isFullscreen.value = false;
      });
    } else {
      isFullscreen.value = false;
    }
  }
};

// 材料選擇 Modal
const showMaterialModal = ref(false);
const materialSearchQuery = ref('');

// 過濾後的材料列表
const filteredMaterials = computed(() => {
  if (!materialSearchQuery.value.trim()) {
    return materials.value;
  }
  const query = materialSearchQuery.value.toLowerCase().trim();
  return materials.value.filter((material) =>
    material.name.toLowerCase().includes(query)
  );
});

// 監聽全螢幕狀態變化
const handleFullscreenChange = () => {
  if (!document.fullscreenElement) {
    isFullscreen.value = false;
  }
};

// 材料選擇相關函數
const selectAllMaterials = () => {
  // 如果正在搜尋，只選擇符合搜尋結果的材料
  if (materialSearchQuery.value.trim()) {
    selectedMaterials.value = [
      ...new Set([...selectedMaterials.value, ...filteredMaterials.value.map((m) => m.id)])
    ];
  } else {
    selectedMaterials.value = materials.value.map((m) => m.id);
  }
};

const deselectAllMaterials = () => {
  // 如果正在搜尋，只取消選擇符合搜尋結果的材料
  if (materialSearchQuery.value.trim()) {
    const filteredIds = filteredMaterials.value.map((m) => m.id);
    selectedMaterials.value = selectedMaterials.value.filter(
      (id) => !filteredIds.includes(id)
    );
  } else {
    selectedMaterials.value = [];
  }
};

const applyMaterialSelection = () => {
  // 確保至少選擇一個材料
  if (selectedMaterials.value.length === 0) {
    alert('請至少選擇一個材料欄位');
    return;
  }
  
  // 關閉 modal 並清除搜尋
  handleMaterialModalHide();
  
  // columnDefs 會自動更新（因為是 computed）
  // 但需要通知 AG Grid 刷新欄位
  if (gridApi.value) {
    setTimeout(() => {
      gridApi.value.setColumnDefs(columnDefs.value);
    }, 0);
  }
};

const handleMaterialModalHide = () => {
  showMaterialModal.value = false;
  // 清除搜尋查詢
  materialSearchQuery.value = '';
};

onMounted(() => {
  loadData();
  // 監聽全螢幕狀態變化
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
});

onUnmounted(() => {
  // 移除監聽器
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
});
</script>

<style scoped>
.materials-section {
  padding-bottom: 2rem;
}

/* 全螢幕模式 */
.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background-color: #0f172a;
  padding: 1rem;
  overflow: auto;
}

.fullscreen-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.fullscreen-card :deep(.card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fullscreen-card .ag-grid-wrapper {
  flex: 1;
  height: 100% !important;
  min-height: unset !important;
}

.ag-grid-wrapper {
  height: calc(100vh - 300px);
  min-height: 500px;
  width: 100%;
  overflow: auto; /* 確保可以滾動 */
}

.materials-grid {
  height: 100%;
  width: 100%;
}

/* 自訂 AG Grid 樣式 - 黑暗模式 */
.ag-grid-wrapper :deep(.ag-theme-alpine) {
  --ag-font-family: var(--bs-font-sans-serif);
  --ag-font-size: 0.875rem;
  /* 黑暗模式顏色 */
  --ag-background-color: #0f172a !important;
  --ag-foreground-color: #e2e8f0 !important;
  --ag-header-background-color: #1e293b !important;
  --ag-header-foreground-color: #e2e8f0 !important;
  --ag-odd-row-background-color: #0f172a !important;
  --ag-even-row-background-color: #1e293b !important;
  --ag-row-hover-color: #334155 !important;
  --ag-selected-row-background-color: rgba(59, 130, 246, 0.2) !important;
  --ag-border-color: #475569 !important;
  --ag-secondary-foreground-color: #cbd5e1 !important;
  --ag-disabled-foreground-color: #64748b !important;
  --ag-input-disabled-background-color: #1e293b !important;
  --ag-input-disabled-border-color: #334155 !important;
  --ag-range-selection-background-color: rgba(59, 130, 246, 0.2) !important;
  --ag-range-selection-border-color: #3b82f6 !important;
  --ag-chip-background-color: #1e293b !important;
  --ag-parameter-panel-background-color: #1e293b !important;
}

/* 覆蓋 AG Grid 的實際樣式 */
.ag-grid-wrapper :deep(.ag-theme-alpine .ag-root-wrapper) {
  background-color: #0f172a !important;
  color: #e2e8f0 !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-header) {
  background-color: #1e293b !important;
  color: #e2e8f0 !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-header-cell) {
  background-color: #1e293b !important;
  color: #e2e8f0 !important;
  border-color: #475569 !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-row) {
  background-color: #0f172a !important;
  color: #e2e8f0 !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-row-odd) {
  background-color: #0f172a !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-row-even) {
  background-color: #1e293b !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-row:hover) {
  background-color: #334155 !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-cell) {
  color: #e2e8f0 !important;
  border-color: #475569 !important;
}

/* 固定底部行（合計行）樣式 */
.ag-grid-wrapper :deep(.ag-theme-alpine .ag-pinned-bottom-cols-container) {
  border-top: 2px solid #475569 !important;
  background-color: #1e293b !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-row-pinned) {
  background-color: #1e293b !important;
  font-weight: bold !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-row-pinned .ag-cell) {
  background-color: #1e293b !important;
  font-weight: bold !important;
  justify-content: flex-end !important;
  text-align: right !important;
}

.ag-grid-wrapper :deep(.ag-theme-alpine .ag-row-pinned .ag-cell:first-child) {
  justify-content: flex-start !important;
  text-align: left !important;
}

:deep(.ag-theme-alpine .ag-cell) {
  padding: 0.5rem;
  display: flex;
  align-items: center;
}

/* 數字欄位右對齊 - 覆蓋 flex 的對齊方式 */
/* 所有非日期欄位的 cell 都右對齊 */
:deep(.ag-theme-alpine .ag-cell:not([col-id="date"])) {
  justify-content: flex-end !important;
  text-align: right !important;
}

:deep(.ag-theme-alpine .ag-header-cell) {
  font-weight: 600;
  text-align: center;
}

:deep(.ag-theme-alpine .ag-pinned-left-cols-container) {
  border-right: 2px solid var(--ag-border-color);
}

:deep(.ag-theme-alpine .ag-cell-inline-editing) {
  padding: 0;
}

:deep(.ag-theme-alpine .ag-cell-inline-editing input) {
  width: 100%;
  height: 100%;
  border: 1px solid var(--ag-accent-color);
  outline: none;
  padding: 0.5rem;
  font-size: 0.875rem;
}

/* 手機版優化 */
@media (max-width: 767.98px) {
  .ag-grid-wrapper {
    height: calc(100vh - 250px);
    min-height: 400px;
  }

  :deep(.ag-theme-alpine .ag-cell) {
    padding: 0.375rem;
    font-size: 0.8125rem;
  }

  :deep(.ag-theme-alpine .ag-header-cell) {
    font-size: 0.8125rem;
    padding: 0.375rem;
  }
}
</style>
