<template>
  <div class="project-item-database-page">
    <PageHeader
      title="工程項目標單"
      icon="fa fa-database"
      :breadcrumbs="[
        { text: '基本資料管理', href: 'javascript:;' },
        { text: '工程項目標單', active: true }
      ]"
      :actions="headerActions"
    >
      <template #extra>
        <DesignChangeVersionSwitcher
          v-if="constructionId"
          :construction-id="constructionId"
          v-model="selectedDesignChangeId"
          :source-type="designChangeSourceType"
        />
      </template>
    </PageHeader>

    <div
      v-if="!isFullscreen"
      class="pcces-toolbar-row d-flex flex-wrap align-items-center gap-2 gap-md-3"
      :class="{ 'pcces-toolbar-row--standalone': isLoading }"
    >
      <div
        class="pcces-segment-tabs pcces-segment-tabs--lg flex-shrink-0"
        role="tablist"
        aria-label="標單檢視"
      >
        <button
          type="button"
          role="tab"
          class="pcces-segment-tab"
          :class="{ 'pcces-segment-tab--active': pccesViewTab === 'detail' }"
          :aria-selected="pccesViewTab === 'detail'"
          @click="pccesViewTab = 'detail'"
        >
          標單明細
        </button>
        <button
          type="button"
          role="tab"
          class="pcces-segment-tab"
          :class="{ 'pcces-segment-tab--active': pccesViewTab === 'breakdown' }"
          :aria-selected="pccesViewTab === 'breakdown'"
          @click="pccesViewTab = 'breakdown'"
        >
          單價分析
        </button>
        <button
          type="button"
          role="tab"
          class="pcces-segment-tab"
          :class="{ 'pcces-segment-tab--active': pccesViewTab === 'resource' }"
          :aria-selected="pccesViewTab === 'resource'"
          @click="pccesViewTab = 'resource'"
        >
          資源統計
        </button>
        <button
          type="button"
          role="tab"
          class="pcces-segment-tab"
          :class="{ 'pcces-segment-tab--active': pccesViewTab === 'materialInspection' }"
          :aria-selected="pccesViewTab === 'materialInspection'"
          @click="pccesViewTab = 'materialInspection'"
        >
          材料與試驗
        </button>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2 ms-auto">
        <div
          v-if="selectedDesignChangeId != null"
          class="form-check form-switch m-0 d-flex align-items-center gap-2 flex-shrink-0"
        >
          <input
            class="form-check-input"
            type="checkbox"
            id="pccesDiffToggle"
            v-model="diffEnabled"
            :disabled="isLoading || isCopying"
          />
          <label
            class="form-check-label user-select-none mb-0 text-nowrap pcces-diff-toggle-label"
            for="pccesDiffToggle"
            title="開啟後，與上一版不同的欄位以紅色標示"
          >
            顯示與前版差異
          </label>
        </div>
        <button
          class="btn btn-outline-secondary btn-sm"
          type="button"
          @click="toggleFullscreen"
          title="全螢幕"
        >
          <i class="fa fa-expand me-1"></i>全螢幕
        </button>
        <button
          class="btn btn-outline-warning btn-sm"
          type="button"
          @click="copyDebugInfo"
          :disabled="isLoading"
          title="複製目前頁面的標單/組樹摘要，貼給 AI 排查"
        >
          <i class="fa fa-clipboard me-1"></i>複製除錯資訊
        </button>
        <button
          v-if="selectedDesignChangeId != null"
          class="btn btn-outline-info btn-sm"
          type="button"
          @click="handleCopyPrevious"
          :disabled="!canCopyPrevious || isLoading || isCopying"
          title="將前一個版本的工項複製到目前版本（會覆蓋目前版本既有工項）"
        >
          <i class="fa fa-copy me-1"></i>複製前一個版本
        </button>
        <button
          class="btn btn-success btn-sm"
          type="button"
          @click="openImportModal"
          :disabled="isLoading"
        >
          <i class="fa fa-file-import me-1"></i>匯入 PCCES
        </button>
      </div>
    </div>

    <!-- 載入中提示 -->
    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">載入中...</span>
      </div>
      <p class="mt-2 text-muted">載入中...</p>
    </div>

    <!-- 工項列表 - 使用 Syncfusion TreeGrid -->
    <div
      v-else
      class="treegrid-wrapper"
      :class="{
        'treegrid-fullscreen': isFullscreen,
        'pcces-treegrid-below-toolbar': !isFullscreen
      }"
    >
      <!-- 全螢幕模式下的工具列固定在最上方 -->
      <div
        v-if="isFullscreen"
        class="fullscreen-toolbar d-flex flex-wrap align-items-center gap-2 px-3 py-2 border-bottom"
      >
        <div class="fw-semibold flex-shrink-0 me-1">
          <i class="fa fa-database me-2"></i>工程項目標單
        </div>
        <div
          class="pcces-segment-tabs pcces-segment-tabs--lg flex-shrink-0"
          role="tablist"
          aria-label="標單檢視"
        >
          <button
            type="button"
            role="tab"
            class="pcces-segment-tab"
            :class="{ 'pcces-segment-tab--active': pccesViewTab === 'detail' }"
            :aria-selected="pccesViewTab === 'detail'"
            @click="pccesViewTab = 'detail'"
          >
            標單明細
          </button>
          <button
            type="button"
            role="tab"
            class="pcces-segment-tab"
            :class="{ 'pcces-segment-tab--active': pccesViewTab === 'breakdown' }"
            :aria-selected="pccesViewTab === 'breakdown'"
            @click="pccesViewTab = 'breakdown'"
          >
            單價分析
          </button>
          <button
            type="button"
            role="tab"
            class="pcces-segment-tab"
            :class="{ 'pcces-segment-tab--active': pccesViewTab === 'resource' }"
            :aria-selected="pccesViewTab === 'resource'"
            @click="pccesViewTab = 'resource'"
          >
            資源統計
          </button>
          <button
            type="button"
            role="tab"
            class="pcces-segment-tab"
            :class="{ 'pcces-segment-tab--active': pccesViewTab === 'materialInspection' }"
            :aria-selected="pccesViewTab === 'materialInspection'"
            @click="pccesViewTab = 'materialInspection'"
          >
            材料與試驗
          </button>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2 flex-shrink-0">
          <div
            v-if="selectedDesignChangeId != null"
            class="form-check form-switch m-0 d-flex align-items-center gap-2 flex-shrink-0"
          >
            <input
              class="form-check-input"
              type="checkbox"
              id="pccesDiffToggleFullscreen"
              v-model="diffEnabled"
              :disabled="isLoading || isCopying"
            />
            <label
              class="form-check-label user-select-none mb-0 text-nowrap pcces-diff-toggle-label"
              for="pccesDiffToggleFullscreen"
              title="開啟後，與上一版不同的欄位以紅色標示"
            >
              顯示與前版差異
            </label>
          </div>
          <button
            class="btn btn-outline-secondary btn-sm"
            type="button"
            @click="toggleFullscreen"
            title="退出全螢幕"
          >
            <i class="fa fa-compress me-1"></i>退出全螢幕
          </button>
          <button
            class="btn btn-outline-warning btn-sm"
            type="button"
            @click="copyDebugInfo"
            :disabled="isLoading"
            title="複製目前頁面的標單/組樹摘要，貼給 AI 排查"
          >
            <i class="fa fa-clipboard me-1"></i>複製除錯資訊
          </button>
          <button
            v-if="selectedDesignChangeId != null"
            class="btn btn-outline-info btn-sm"
            type="button"
            @click="handleCopyPrevious"
            :disabled="!canCopyPrevious || isLoading || isCopying"
            title="將前一個版本的工項複製到目前版本（會覆蓋目前版本既有工項）"
          >
            <i class="fa fa-copy me-1"></i>複製前一個版本
          </button>
          <button
            class="btn btn-success btn-sm"
            type="button"
            @click="openImportModal"
            :disabled="isLoading"
          >
            <i class="fa fa-file-import me-1"></i>匯入 PCCES
          </button>
        </div>
      </div>

      <div class="treegrid-body">
        <div v-if="pccesViewTab === 'materialInspection'" class="material-inspection-container">
          <MaterialInspectionPanel
            v-if="constructionId"
            :construction-id="constructionId"
            :design-change-id="selectedDesignChangeId"
            :materials="modalMaterials"
            :test-items="modalTestItems"
            :active="pccesViewTab === 'materialInspection'"
          />
        </div>

        <ejs-treegrid
          v-else-if="pccesViewTab === 'detail'"
          ref="treegrid"
          :dataSource="treeGridData"
          :allowPaging="false"
          :allowSorting="false"
          :allowFiltering="true"
          :filterSettings="treeGridFilterSettings"
          :actionBegin="onTreeGridActionBegin"
          :allowResizing="true"
          :allowReordering="false"
          :allowSelection="false"
          :treeColumnIndex="2"
          :childMapping="'children'"
          :height="'100%'"
          locale="zh"
          :enableHover="true"
        >
          <e-columns>
            <e-column
              field="itemNo"
              headerText="項次"
              width="120"
              textAlign="Left"
              :template="'itemNoTemplate'"
              :filter="containsFilter"
            ></e-column>
            <e-column
              field="code"
              headerText="工項代碼"
              width="150"
              textAlign="Left"
              :template="'codeTemplate'"
              :filter="containsFilter"
            ></e-column>
            <e-column
              field="name"
              headerText="工項名稱"
              width="300"
              textAlign="Left"
              :template="'nameTemplate'"
              :filter="containsFilter"
            ></e-column>
            <e-column
              field="unit"
              headerText="單位"
              width="100"
              textAlign="Center"
              :template="'unitTemplate'"
            ></e-column>
            <e-column
              field="isSafetyHealthFacility"
              headerText="安全衛生設施"
              width="120"
              textAlign="Center"
              :template="'safetyHealthTemplate'"
            ></e-column>
            <e-column
              field="isTestItem"
              headerText="試驗項"
              width="100"
              textAlign="Center"
              :template="'testItemTemplate'"
            ></e-column>
            <e-column
              field="quantity"
              headerText="總量"
              width="120"
              textAlign="Right"
              :template="'quantityTemplate'"
            ></e-column>
            <e-column
              field="price"
              headerText="單價"
              width="150"
              textAlign="Right"
              :template="'priceTemplate'"
            ></e-column>
            <e-column
              field="amount"
              headerText="金額"
              width="150"
              textAlign="Right"
              :template="'amountTemplate'"
            ></e-column>
          </e-columns>

          <template v-slot:itemNoTemplate="{ data }">
            <span :class="getCellClass(data, 'itemNo')">{{ data.itemNo }}</span>
          </template>

          <template v-slot:codeTemplate="{ data }">
            <span :class="getCellClass(data, 'code')">{{ data.code }}</span>
          </template>

          <!-- 工項名稱模板（包含類型圖示） -->
          <template v-slot:nameTemplate="{ data }">
            <div class="d-flex align-items-center gap-2" style="line-height: 1.5;">
              <i v-if="data.type" :class="getTypeIcon(data.type)" :title="getTypeLabel(data.type)"></i>
              <span :class="getCellClass(data, 'name')">{{ data.name }}</span>
            </div>
          </template>

          <template v-slot:unitTemplate="{ data }">
            <span :class="getCellClass(data, 'unit')">{{ data.unit }}</span>
          </template>

          <template v-slot:safetyHealthTemplate="{ data }">
            <div class="d-flex align-items-center justify-content-center px-1" @click.stop>
              <template v-if="isSafetyTreeParentNode(data)">
                <input
                  :key="`pcces-safety-parent-${safetyUiVersion}-${data.id}`"
                  type="checkbox"
                  class="form-check-input m-0"
                  :checked="getParentSafetyGroupState(data) === 'all'"
                  :indeterminate="getParentSafetyGroupState(data) === 'some'"
                  :disabled="savingSafetyBatch"
                  :class="{ 'opacity-50': savingSafetyBatch }"
                  title="群組：點擊將底下所有工項一併勾選或取消（僅葉節點會寫入資料庫）"
                  @click.stop.prevent="onParentSafetyHealthChange(data, $event)"
                />
              </template>
              <template v-else>
                <input
                  :key="`pcces-safety-leaf-${safetyUiVersion}-${data.id}`"
                  type="checkbox"
                  class="form-check-input m-0"
                  :checked="isSafetyChecked(data)"
                  :disabled="savingSafetyId === data.id || savingSafetyBatch"
                  title="勾選表示此工項為安全衛生設施（非匯入檔欄位）"
                  @change="onSafetyHealthChange(data, $event)"
                />
              </template>
            </div>
          </template>

          <template v-slot:testItemTemplate="{ data }">
            <div class="d-flex align-items-center justify-content-center px-1" @click.stop>
              <template v-if="isTestItemTreeParentNode(data)">
                <input
                  :key="`pcces-test-parent-${testItemUiVersion}-${data.id}`"
                  type="checkbox"
                  class="form-check-input m-0"
                  :checked="getParentTestItemGroupState(data) === 'all'"
                  :indeterminate="getParentTestItemGroupState(data) === 'some'"
                  :disabled="savingTestItemBatch"
                  :class="{ 'opacity-50': savingTestItemBatch }"
                  title="群組：點擊將底下所有工項一併勾選或取消（僅葉節點會寫入資料庫）"
                  @click.stop.prevent="onParentTestItemChange(data, $event)"
                />
              </template>
              <template v-else>
                <input
                  :key="`pcces-test-leaf-${testItemUiVersion}-${data.id}`"
                  type="checkbox"
                  class="form-check-input m-0"
                  :checked="isTestItemChecked(data)"
                  :disabled="savingTestItemId === data.id || savingTestItemBatch"
                  title="勾選表示此工項為試驗項（非匯入檔欄位）"
                  @change="onTestItemChange(data, $event)"
                />
              </template>
            </div>
          </template>

          <!-- 總量模板 -->
          <template v-slot:quantityTemplate="{ data }">
            <span :class="getCellClass(data, 'quantity')">{{ formatNumber(data.quantity) }}</span>
          </template>

          <!-- 單價模板 -->
          <template v-slot:priceTemplate="{ data }">
            <span :class="getCellClass(data, 'price')">{{ formatPrice(data.price) }}</span>
          </template>

          <!-- 金額模板 -->
          <template v-slot:amountTemplate="{ data }">
            <span :class="getCellClass(data, 'amount')">{{ formatPrice(data.amount) }}</span>
          </template>
        </ejs-treegrid>

        <ejs-treegrid
          v-else-if="pccesViewTab === 'breakdown'"
          ref="breakdownTreegrid"
          :dataSource="breakdownTreeGridData"
          :allowPaging="false"
          :allowSorting="false"
          :allowFiltering="true"
          :filterSettings="treeGridFilterSettings"
          :actionBegin="onTreeGridActionBegin"
          :allowResizing="true"
          :allowReordering="false"
          :allowSelection="false"
          :treeColumnIndex="3"
          :childMapping="'children'"
          :height="'100%'"
          locale="zh"
          :enableHover="true"
        >
          <e-columns>
            <e-column field="refItemNo" headerText="對應項次" width="120" textAlign="Left" />
            <e-column field="itemCode" headerText="編碼" width="140" textAlign="Left" />
            <e-column
              field="name"
              headerText="名稱"
              width="300"
              textAlign="Left"
              :template="'bdNameTemplate'"
            />
            <e-column field="unit" headerText="單位" width="80" textAlign="Center" />
            <e-column
              field="quantity"
              headerText="數量"
              width="100"
              textAlign="Right"
              :template="'bdQtyTemplate'"
            />
            <e-column
              field="price"
              headerText="單價"
              width="110"
              textAlign="Right"
              :template="'bdPriceTemplate'"
            />
            <e-column
              field="amount"
              headerText="複價"
              width="110"
              textAlign="Right"
              :template="'bdAmtTemplate'"
            />
          </e-columns>
          <template v-slot:bdNameTemplate="{ data }">
            <div class="d-flex align-items-center gap-2" style="line-height: 1.5;">
              <i v-if="data.type" :class="getTypeIcon(data.type)" :title="getTypeLabel(data.type)"></i>
              <span>{{ data.name }}</span>
            </div>
          </template>
          <template v-slot:bdQtyTemplate="{ data }">
            <span>{{ formatNumber(data.quantity) }}</span>
          </template>
          <template v-slot:bdPriceTemplate="{ data }">
            <span>{{ formatPrice(data.price) }}</span>
          </template>
          <template v-slot:bdAmtTemplate="{ data }">
            <span>{{ formatPrice(data.amount) }}</span>
          </template>
        </ejs-treegrid>

        <ejs-treegrid
          v-else-if="pccesViewTab === 'resource'"
          ref="resourceTreegrid"
          :dataSource="resourceRows"
          :allowPaging="false"
          :allowSorting="false"
          :allowFiltering="true"
          :filterSettings="treeGridFilterSettings"
          :actionBegin="onTreeGridActionBegin"
          :allowResizing="true"
          :allowReordering="false"
          :allowSelection="false"
          :treeColumnIndex="2"
          :childMapping="'children'"
          :height="'100%'"
          locale="zh"
          :enableHover="true"
        >
          <e-columns>
            <e-column field="orderNumber" headerText="#" width="72" textAlign="Right" />
            <e-column field="itemCode" headerText="編碼" width="160" textAlign="Left" :filter="containsFilter" />
            <e-column
              field="name"
              headerText="名稱"
              width="420"
              textAlign="Left"
              :filter="containsFilter"
              :template="'resourceNameTemplate'"
            />
            <e-column field="unitType" headerText="單位" width="80" textAlign="Center" />
            <e-column field="quantity" headerText="數量" width="120" textAlign="Right" />
            <e-column field="price" headerText="單價" width="120" textAlign="Right" />
            <e-column field="amount" headerText="金額" width="130" textAlign="Right" />
          </e-columns>
          <template v-slot:resourceNameTemplate="{ data }">
            <div class="d-flex align-items-center gap-2" style="line-height: 1.5;">
              <i
                v-if="getResourceType(data)"
                :class="getTypeIcon(getResourceType(data))"
                :title="getTypeLabel(getResourceType(data))"
              ></i>
              <span>{{ data.name }}</span>
            </div>
          </template>
        </ejs-treegrid>
      </div>
    </div>

    <!-- 匯入 Modal -->
    <Modal
      :show="showImportModal"
      title="匯入 PCCES XML 檔案"
      icon="fa fa-file-import"
      size="lg"
      @update:show="showImportModal = $event"
      :hideConfirmButton="true"
      cancelText="取消"
    >
      <template #body>
        <div class="mb-3">
          <label class="form-label fw-semibold">選擇或拖放檔案</label>
          <input
            type="file"
            class="form-control d-none"
            accept=".xml,text/xml,application/xml"
            @change="handleFileSelect"
            ref="fileInput"
          />
          <div
            class="pcces-import-dropzone border rounded-3 p-4 text-center user-select-none"
            :class="{
              'pcces-import-dropzone--active': importDragDepth > 0,
              'pcces-import-dropzone--has-file': !!selectedFile
            }"
            role="button"
            tabindex="0"
            @click="triggerFileInput"
            @keydown.enter.prevent="triggerFileInput"
            @keydown.space.prevent="triggerFileInput"
            @dragenter.prevent="onImportDragEnter"
            @dragleave.prevent="onImportDragLeave"
            @dragover.prevent="onImportDragOver"
            @drop.prevent="onImportDrop"
          >
            <template v-if="selectedFile">
              <i class="fa fa-check-circle pcces-import-file-check d-block mb-2" aria-hidden="true"></i>
              <span class="pcces-import-ready-badge">已選擇檔案</span>
              <div class="pcces-import-filename text-break mt-2 mb-1">
                <i class="fa fa-file-code me-2" aria-hidden="true"></i>{{ selectedFile.name }}
              </div>
              <div class="pcces-import-filemeta">{{ formatImportFileSize(selectedFile.size) }}</div>
              <p class="pcces-import-replace-hint mb-0 mt-3 small">點此區域或拖放其他檔案可更換</p>
            </template>
            <template v-else>
              <i class="fa fa-cloud-upload-alt fa-2x mb-2 d-block text-secondary"></i>
              <p class="mb-1 fw-medium">
                將 XML 檔拖放到此處，或按一下選擇檔案
              </p>
              <p class="mb-0 small text-muted">僅支援 .xml（PCCES 預算書／標單）</p>
            </template>
          </div>
          <small class="text-muted d-block mt-2">請選擇符合 PCCES 標準格式的 XML 檔案</small>
        </div>
        <p class="text-muted small mb-2">
          匯入目標：<strong>{{ selectedDesignChangeId == null ? '原契約' : '變更設計' }}</strong>（與上方目前選中的版本一致）
        </p>
        <div class="mb-3">
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="importOverwrite"
              v-model="importOverwrite"
            />
            <label class="form-check-label" for="importOverwrite">
              覆寫該版本既有標單明細與單價分析（勾選時會先刪除該版本現有資料再匯入）
            </label>
          </div>
        </div>
        <div v-if="importError" class="alert alert-danger">
          <i class="fa fa-exclamation-circle me-2"></i>{{ importError }}
        </div>
      </template>
      <template #footer>
        <button
          class="btn btn-outline-secondary"
          @click="showImportModal = false"
          :disabled="isImporting"
        >
          取消
        </button>
        <button
          class="btn btn-primary"
          @click="handleImport"
          :disabled="!selectedFile || isImporting"
        >
          <span v-if="isImporting" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="fa fa-upload me-2"></i>
          {{ isImporting ? '匯入中...' : '開始匯入' }}
        </button>
      </template>
    </Modal>

  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import MaterialInspectionPanel from '@/components/project/MaterialInspectionPanel.vue'
import { ref, computed, watch, onMounted, onActivated, nextTick, provide } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  importPccesFile,
  getConstructionPccesCodes,
  getConstructionPccesCostBreakdown,
  getConstructionPccesResources,
  copyPccesFromTo,
  type ConstructionPccesCode,
  type ConstructionPccesCostBreakdown,
  type ConstructionPccesResource,
  type ImportPccesRequest,
  PccesItemType
} from '@/api/pcces'
import { usePccesSafetyHealthTreeGrid } from '@/composables/usePccesSafetyHealthTreeGrid'
import { usePccesTestItemTreeGrid } from '@/composables/usePccesTestItemTreeGrid'
import { getDesignChangeList } from '@/api/designChange'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { Sort, Resize, Filter } from '@syncfusion/ej2-vue-treegrid'
import type { TreeGridComponent } from '@syncfusion/ej2-vue-treegrid'

const treeGridFilterSettings = { type: 'FilterBar', mode: 'Immediate', immediateModeDelay: 200 }
const containsFilter = { operator: 'contains' }

function onTreeGridActionBegin(e: any) {
  // Syncfusion FilterBar 預設常以 startsWith 過濾；
  // 但不是所有欄位都適合字串 contains（例如布林/數值欄位）
  if (e?.requestType === 'filtering' && Array.isArray(e.columns)) {
    for (const col of e.columns) {
      if (!col) continue
      const field = String(col.field ?? '')

      // 布林欄位：不要用 contains
      if (field === 'isSafetyHealthFacility' || field === 'isTestItem') {
        col.operator = 'equal'
        continue
      }

      // 數值/金額欄位：不要強制 contains（避免把數字當字串）
      if (field === 'quantity' || field === 'price' || field === 'amount' || field === 'orderNumber') {
        col.operator = col.operator || 'equal'
        continue
      }

      // 其他文字欄位：用 contains 取代預設 startsWith
      col.operator = 'contains'
    }
  }
}

// 單價分析 TreeGrid 的「材料」欄位已移除，材料維護改由「材料與試驗」面板統一處理

interface ProjectItem {
  id: string
  code: string
  name: string
  unit: string
  quantity: number
  price: string
  amount: string
  itemNo: string | null
  /** 後端原始匯入順序（同層 itemNo 重複時以此排序） */
  orderNumber: number
  parentId: number | null
  type: string | null
  /** 是否為安全衛生設施（使用者勾選，預設否） */
  isSafetyHealthFacility: boolean
  /** 是否為試驗項（使用者勾選，預設否） */
  isTestItem: boolean
}

/** 單價分析（CostBreakdownList）列，供 TreeGrid */
interface BreakdownProjectItem {
  id: string
  parentId: number | null
  orderNumber: number
  refItemNo: string
  itemCode: string
  name: string
  unit: string
  quantity: number
  price: string
  amount: string
  itemKind: string
  percent: string
  labourRatio: string
  equipmentRatio: string
  materialRatio: string
  miscellaneaRatio: string
  type: string | null
  /** 是否為材料（由「材料與試驗」面板統一維護，單價分析頁籤不再顯示/編輯） */
  isMaterial: boolean
}

const workspaceStore = useWorkspaceStore()
const { isContractor, isSupervisory } = useViewPerspective()

/** 與版本切換器一致：監造／營造各自變更設計列表 */
const designChangeSourceType = computed<'SUPERVISORY' | 'CONTRACTOR' | undefined>(() =>
  isSupervisory.value ? 'SUPERVISORY' : isContractor.value ? 'CONTRACTOR' : undefined
)

const constructionId = computed(() => workspaceStore.currentProject?.id || '')

const items = ref<ProjectItem[]>([])
const breakdownItems = ref<BreakdownProjectItem[]>([])
const pccesParentIdSet = computed(() => {
  const set = new Set<string>()
  for (const it of items.value) {
    if (it.parentId != null) set.add(String(it.parentId))
  }
  return set
})

function isPccesLeafItem(it: ProjectItem): boolean {
  return !pccesParentIdSet.value.has(String(it.id))
}

type MaterialSource = 'RESOURCE' | 'BREAKDOWN' | 'DETAIL'

const modalMaterials = computed(() => {
  // 依你討論的新材料提取方式：
  // 1) ResourceList（資源統計）M%
  // 2) CostBreakdownList（單價分析）M%
  // 3) DetailList（詳細價目表/標單明細）M%
  // 去重：同編碼只保留一筆，優先序 Resource > Breakdown > Detail
  const out = new Map<
    string,
    {
      code: string
      name: string
      unit?: string | null
      refItemNo?: string | null
      source: MaterialSource
    }
  >()

  // helper：寫入 map（遵守優先序）
  function upsert(code: string, row: { name: string; unit?: string | null; refItemNo?: string | null }, source: MaterialSource) {
    const key = code.trim()
    if (!key || !key.toUpperCase().startsWith('M')) return
    const rank = source === 'RESOURCE' ? 3 : source === 'BREAKDOWN' ? 2 : 1
    const prev = out.get(key)
    const prevRank = prev ? (prev.source === 'RESOURCE' ? 3 : prev.source === 'BREAKDOWN' ? 2 : 1) : 0
    if (!prev || rank > prevRank) {
      out.set(key, {
        code: key,
        name: row.name,
        unit: row.unit ?? null,
        refItemNo: row.refItemNo ?? null,
        source
      })
      return
    }
    // 同 rank：保留原本（先到先得）
  }

  // 3) DetailList：從標單明細（後端已回傳）提 M%
  for (const it of items.value) {
    const code = String(it.code ?? '').trim()
    if (!code.toUpperCase().startsWith('M')) continue
    upsert(
      code,
      {
        name: String(it.name ?? '').trim() || code,
        unit: it.unit ?? null
      },
      'DETAIL'
    )
  }

  // 2) Breakdown：從單價分析提 M%（顯示用；關聯 id 盡量對應到葉節點）
  for (const b of breakdownItems.value) {
    const code = String(b.itemCode ?? '').trim()
    if (!code.toUpperCase().startsWith('M')) continue
    upsert(
      code,
      {
        name: String(b.name ?? '').trim() || code,
        unit: b.unit ?? null,
        refItemNo: b.refItemNo ?? null
      },
      'BREAKDOWN'
    )
  }

  // 1) Resource：從資源統計提 M%
  for (const r of resourceRows.value) {
    const code = String((r as any).itemCode ?? '').trim()
    if (!code.toUpperCase().startsWith('M')) continue
    upsert(
      code,
      {
        name: String((r as any).name ?? '').trim() || code,
        unit: (r as any).unitType ?? null
      },
      'RESOURCE'
    )
  }

  // 產出給 MaterialInspectionPanel：以 itemCode 當 key
  return Array.from(out.values())
    .map((x) => ({
      id: 0,
      refItemNo: x.refItemNo ?? null,
      itemCode: x.code,
      name: x.name,
      unit: x.unit ?? null,
      source: x.source
    }))
    .sort((a, b) => String(a.itemCode || '').localeCompare(String(b.itemCode || '')))
})

const modalTestItems = computed(() => {
  return items.value
    .filter((i) => i.isTestItem === true && isPccesLeafItem(i))
    .map((i) => ({
      id: parseInt(String(i.id), 10),
      itemNo: i.itemNo ?? null,
      pccesCode: i.code ?? null,
      name: i.name
    }))
    .filter((t) => Number.isFinite(t.id))
})
/** 標單明細 / 單價分析 分頁 */
const pccesViewTab = ref<'detail' | 'breakdown' | 'resource' | 'materialInspection'>('detail')
/** 目前選中的變更設計版本：null = 原契約 */
const selectedDesignChangeId = ref<number | null>(null)
const isLoading = ref(false)
/** 變更設計列表（依生效日升序），用於計算「前一個版本」 */
const designChangeList = ref<{ id: number; effectiveDate: string }[]>([])
const isCopying = ref(false)
const diffEnabled = ref(false)

const headerActions = computed(() => [])

/** 當前版本是否有「前一個版本」可複製（選中變更設計時才顯示複製按鈕） */
const canCopyPrevious = computed(() => selectedDesignChangeId.value != null)

/** 複製時使用的來源版本：null = 原契約，數字 = 該變更設計 ID */
const sourceDesignChangeIdForCopy = computed(() => {
  const current = selectedDesignChangeId.value
  if (current == null) return null
  const list = designChangeList.value
  const idx = list.findIndex((d) => d.id === current)
  if (idx <= 0) return null
  return list[idx - 1]?.id ?? null
})

/** 差異比對用「上一個版本」：第一個變更設計的上一版為原契約（null） */
const previousDesignChangeIdForDiff = computed(() => {
  const current = selectedDesignChangeId.value
  if (current == null) return null
  const list = designChangeList.value
  const idx = list.findIndex((d) => d.id === current)
  if (idx <= 0) return null
  return list[idx - 1]?.id ?? null
})

function normalizeText(v: any): string {
  return (v ?? '').toString().trim()
}

function normalizeNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function sameNumber(a: any, b: any): boolean {
  const na = normalizeNumber(a)
  const nb = normalizeNumber(b)
  if (na == null && nb == null) return true
  if (na == null || nb == null) return false
  return Math.abs(na - nb) < 1e-9
}

function clearDiffFlags(list: ProjectItem[]) {
  for (const it of list) {
    ;(it as any).diffAll = false
    ;(it as any).diff = {}
  }
}

function groupByPccesCode(list: ProjectItem[]): Map<string, ProjectItem[]> {
  const map = new Map<string, ProjectItem[]>()
  for (const it of list) {
    const key = (it.code || '').trim()
    if (!key) continue
    const arr = map.get(key)
    if (arr) arr.push(it)
    else map.set(key, [it])
  }
  return map
}

async function applyDiffFromPreviousVersion() {
  clearDiffFlags(items.value)
  if (!diffEnabled.value) {
    updateTreeGridData()
    return
  }
  const cid = constructionId.value
  const current = selectedDesignChangeId.value
  if (!cid || current == null) {
    updateTreeGridData()
    return
  }

  const prevId = previousDesignChangeIdForDiff.value
  const prevCodes = await getConstructionPccesCodes(cid, prevId)
  const prevItems = prevCodes.map(convertToProjectItem)
  const prevMap = groupByPccesCode(prevItems)

  for (const it of items.value) {
    const code = (it.code || '').trim()
    if (!code) continue
    const candidates = prevMap.get(code)
    const prev = candidates && candidates.length > 0 ? candidates.shift()! : null
    if (!prev) {
      ;(it as any).diffAll = true
      ;(it as any).diff = {
        itemNo: true,
        code: true,
        name: true,
        unit: true,
        safetyHealth: true,
        testItem: true,
        quantity: true,
        price: true,
        amount: true
      }
      continue
    }
    const diff: Record<string, boolean> = {}
    if (normalizeText(it.name) !== normalizeText(prev.name)) diff.name = true
    if (normalizeText(it.unit) !== normalizeText(prev.unit)) diff.unit = true
    if (!sameNumber(it.quantity, prev.quantity)) diff.quantity = true
    if (!sameNumber(it.price, prev.price)) diff.price = true
    if (!sameNumber(it.amount, prev.amount)) diff.amount = true
    if (!!it.isSafetyHealthFacility !== !!prev.isSafetyHealthFacility) diff.safetyHealth = true
    if (!!it.isTestItem !== !!prev.isTestItem) diff.testItem = true
    ;(it as any).diffAll = false
    ;(it as any).diff = diff
  }

  updateTreeGridData()
}

function getCellClass(row: any, field: string): string | undefined {
  if (!diffEnabled.value) return undefined
  if (row?.diffAll) return 'pcces-diff-added'
  if (row?.diff && row.diff[field]) return 'pcces-diff-changed'
  return undefined
}

// TreeGrid 相關
const treegrid = ref<TreeGridComponent | null>(null)
const breakdownTreegrid = ref<TreeGridComponent | null>(null)
const resourceTreegrid = ref<TreeGridComponent | null>(null)
const treeGridData = ref<any[]>([])
const breakdownTreeGridData = ref<any[]>([])
const resourceRows = ref<ConstructionPccesResource[]>([])

function refreshVisibleGrid() {
  const tab = pccesViewTab.value
  const pick = tab === 'detail' ? treegrid.value : tab === 'breakdown' ? breakdownTreegrid.value : resourceTreegrid.value
  const ej = (pick as any)?.ej2Instances as any
  if (!ej) return
  try {
    // v-show 切換時 TreeGrid 常不會重算高度/捲動區，強制刷新
    ej.refresh?.()
    ej.refreshColumns?.()
    ej.dataBind?.()
  } catch {
    // ignore
  }
}

watch(
  () => pccesViewTab.value,
  async () => {
    await nextTick()
    // 再等一個 frame，確保容器尺寸已穩定
    requestAnimationFrame(() => refreshVisibleGrid())
  }
)

function numToDisplay(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  const s = String(v).trim()
  return s
}

function getResourceType(row: any): PccesItemType | null {
  const code = String(row?.itemCode ?? '').trim()
  if (!code) return null
  const c0 = code[0]?.toUpperCase()
  if (c0 === 'M') return PccesItemType.MATERIAL
  if (c0 === 'L') return PccesItemType.LABOUR
  if (c0 === 'E') return PccesItemType.EQUIPMENT
  if (c0 === 'W') return PccesItemType.MISC
  return PccesItemType.WORK_ITEM
}

// 全螢幕狀態
const isFullscreen = ref(false)

// 提供 TreeGrid 服務（移除 Page 因為不需要分頁）
provide('treegrid', [Sort, Resize, Filter])

const {
  savingSafetyId,
  savingSafetyBatch,
  safetyUiVersion,
  getParentSafetyGroupState,
  onParentSafetyHealthChange,
  onSafetyHealthChange,
  isSafetyTreeParentNode,
  isSafetyChecked
} = usePccesSafetyHealthTreeGrid({
  items,
  treeGridData,
  getConstructionId: () => constructionId.value,
  getDesignChangeId: () => selectedDesignChangeId.value,
  alert: (msg) => alert(msg)
})

const {
  savingTestItemId,
  savingTestItemBatch,
  testItemUiVersion,
  getParentTestItemGroupState,
  onParentTestItemChange,
  onTestItemChange,
  isTestItemTreeParentNode,
  isTestItemChecked
} = usePccesTestItemTreeGrid({
  items,
  treeGridData,
  getConstructionId: () => constructionId.value,
  getDesignChangeId: () => selectedDesignChangeId.value,
  alert: (msg) => alert(msg)
})

// 匯入相關
const showImportModal = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const importOverwrite = ref(true)
const isImporting = ref(false)
const importError = ref('')
/** 拖放進入巢狀計數，避免子元素造成 dragleave 閃爍 */
const importDragDepth = ref(0)

// 切換全螢幕
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

function safeJson(obj: any): string {
  try {
    return JSON.stringify(obj)
  } catch {
    return '[unserializable]'
  }
}

function maxDepth(nodes: any[] | undefined): number {
  if (!Array.isArray(nodes) || nodes.length === 0) return 0
  const walk = (n: any, d: number): number => {
    const ch = Array.isArray(n?.children) ? n.children : []
    if (!ch.length) return d
    return Math.max(...ch.map((c: any) => walk(c, d + 1)))
  }
  return Math.max(...nodes.map((n) => walk(n, 1)))
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // ignore
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    ta.style.top = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

async function copyDebugInfo() {
  const cid = constructionId.value || '(no constructionId)'
  const ver = selectedDesignChangeId.value == null ? '原契約' : `變更設計(${selectedDesignChangeId.value})`
  const tab = pccesViewTab.value

  const flat = items.value || []
  const flatIds = new Set(flat.map((x) => String(x.id)))
  const orphan = flat
    .filter((x) => x.parentId != null && !flatIds.has(String(x.parentId)))
    .slice(0, 50)
    .map((x) => ({
      id: x.id,
      parentId: x.parentId,
      itemNo: x.itemNo,
      name: x.name,
      code: x.code,
      type: x.type
    }))

  const tree = treeGridData.value || []
  const bdFlat = (breakdownItems.value || []) as any[]
  const bdTree = breakdownTreeGridData.value || []
  const bdIds = new Set(bdFlat.map((x) => String(x.id)))
  const bdOrphan = bdFlat
    .filter((x) => x.parentId != null && !bdIds.has(String(x.parentId)))
    .slice(0, 50)
    .map((x) => ({
      id: x.id,
      parentId: x.parentId,
      refItemNo: x.refItemNo,
      itemCode: x.itemCode,
      name: x.name,
      itemKind: x.itemKind
    }))

  const sampleFlat = flat.slice(0, 30).map((x) => ({
    id: x.id,
    parentId: x.parentId,
    itemNo: x.itemNo,
    name: x.name,
    code: x.code,
    type: x.type
  }))

  const sampleRoots = (tree || []).slice(0, 15).map((x: any) => ({
    id: x.id,
    itemNo: x.itemNo,
    name: x.name,
    childrenCount: Array.isArray(x.children) ? x.children.length : 0
  }))

  const payload = {
    page: '/basic/project-item-database',
    at: new Date().toISOString(),
    constructionId: cid,
    version: ver,
    viewTab: tab,
    detail: {
      flatCount: flat.length,
      rootCount: Array.isArray(tree) ? tree.length : 0,
      maxDepth: maxDepth(tree as any),
      orphanCount: flat.filter((x) => x.parentId != null && !flatIds.has(String(x.parentId))).length,
      orphanPreview: orphan,
      sampleFlat,
      sampleRoots
    },
    breakdown: {
      flatCount: bdFlat.length,
      rootCount: Array.isArray(bdTree) ? bdTree.length : 0,
      maxDepth: maxDepth(bdTree as any),
      orphanCount: bdFlat.filter((x) => x.parentId != null && !bdIds.has(String(x.parentId))).length,
      orphanPreview: bdOrphan
    }
  }

  const text = safeJson(payload)
  const ok = await copyTextToClipboard(text)
  alert(ok ? '已複製除錯資訊到剪貼簿，請直接貼到對話中。' : '複製失敗，請開啟 Console 取得資料。')
}

// 中文數字對照表
const chineseNumbers: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '壹': 1, '貳': 2, '參': 3, '肆': 4, '伍': 5,
  '陸': 6, '柒': 7, '捌': 8, '玖': 9, '拾': 10,
  '百': 100, '佰': 100, '千': 1000, '仟': 1000
}

// 將中文數字轉換為阿拉伯數字
const chineseToNumber = (str: string): number | null => {
  if (!str) return null
  
  // 如果是純阿拉伯數字，直接轉換
  const num = parseInt(str, 10)
  if (!isNaN(num)) return num
  
  // 處理中文數字
  let result = 0
  let temp = 0
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    const value = chineseNumbers[char]
    
    if (value === undefined) {
      // 如果遇到不認識的字符，嘗試解析為阿拉伯數字
      const numPart = parseInt(str.substring(i), 10)
      if (!isNaN(numPart)) {
        return temp + numPart
      }
      return null
    }
    
    if (value < 10) {
      temp = value
    } else if (value === 10) {
      // 處理「十」的特殊情況
      if (temp === 0) temp = 1
      result += temp * 10
      temp = 0
    } else if (value >= 100) {
      if (temp === 0) temp = 1
      result += temp * value
      temp = 0
    }
  }
  
  return result + temp
}

// 將 itemNo 轉換為可比較的數組
const parseItemNo = (itemNo: string | null): number[] => {
  if (!itemNo) return [0]
  
  const parts = itemNo.split('.')
  return parts.map(part => {
    const raw = (part || '').trim()
    // 常見格式："(一)"、"（一）"、"[一]" 之類，把外層括號去掉再解析
    const normalized = raw
      .replace(/^[\(\（\[\{【「『]+/, '')
      .replace(/[\)\）\]\}】」』]+$/, '')
      .trim()
    const token = normalized || raw

    // 先嘗試解析為阿拉伯數字
    const num = parseInt(token, 10)
    if (!isNaN(num)) return num
    
    // 嘗試解析中文數字
    const chineseNum = chineseToNumber(token)
    if (chineseNum !== null) return chineseNum
    
    // 如果都無法解析，使用字串的 Unicode 編碼作為後備
    return token.charCodeAt(0)
  })
}

// itemNo 自訂排序比較函數
const itemNoSortComparer = (x: any, y: any): number => {
  const itemNoX = x.itemNo || ''
  const itemNoY = y.itemNo || ''
  
  if (!itemNoX && !itemNoY) return 0
  if (!itemNoX) return 1
  if (!itemNoY) return -1
  
  const partsX = parseItemNo(itemNoX)
  const partsY = parseItemNo(itemNoY)
  
  // 比較每一層級
  const maxLength = Math.max(partsX.length, partsY.length)
  
  for (let i = 0; i < maxLength; i++) {
    const partX = partsX[i] ?? 0
    const partY = partsY[i] ?? 0
    
    if (partX < partY) return -1
    if (partX > partY) return 1
  }
  
  return 0
}

// 計算階層深度
const getLevel = (itemNo: string | null): number => {
  if (!itemNo) return 0
  return (itemNo.match(/\./g) || []).length
}

// 取得父項目 itemNo
const getParent = (itemNo: string | null): string | null => {
  if (!itemNo) return null
  const parts = itemNo.split('.')
  return parts.length > 1 ? parts.slice(0, -1).join('.') : null
}

// 將平鋪資料轉換為階層式結構（使用 parentId）
const buildTreeData = (items: ProjectItem[]): any[] => {
  // 建立 id 到項目的映射
  const itemMap = new Map<string, ProjectItem>()
  items.forEach(item => {
    itemMap.set(item.id, item)
  })

  // 建立父子關係映射（使用 parentId）
  const childrenMap = new Map<string, ProjectItem[]>()
  const rootItems: ProjectItem[] = []

  items.forEach(item => {
    if (!item.parentId) {
      // 沒有 parentId 的項目作為根項目
      rootItems.push(item)
    } else {
      // 有父項目的項目
      const parentId = item.parentId.toString()
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, [])
      }
      childrenMap.get(parentId)!.push(item)
    }
  })

  // 遞迴建立階層結構
  const buildNode = (item: ProjectItem): any => {
    const node: any = {
      id: item.id,
      itemNo: item.itemNo || '',
      code: item.code || '',
      name: item.name || '',
      unit: item.unit || '',
      orderNumber: item.orderNumber ?? 0,
      isSafetyHealthFacility: item.isSafetyHealthFacility === true,
      isTestItem: item.isTestItem === true,
      quantity: item.quantity,
      price: item.price,
      amount: item.amount,
      type: item.type,
      diffAll: (item as any).diffAll === true,
      diff: (item as any).diff || {}
    }

    // 如果有子項目，遞迴建立
    const itemId = item.id
    if (childrenMap.has(itemId)) {
      const children = childrenMap.get(itemId)!
      // 按照 orderNumber 或 itemNo 排序
      children.sort((a, b) => {
        const ao = a.orderNumber ?? 0
        const bo = b.orderNumber ?? 0
        if (ao > 0 || bo > 0) return ao - bo
        if (a.itemNo && b.itemNo) return itemNoSortComparer(a, b)
        return a.id.localeCompare(b.id)
      })
      node.children = children.map(child => buildNode(child))
    }

    return node
  }

  // 對根項目使用自訂排序
  rootItems.sort((a, b) => {
    const ao = a.orderNumber ?? 0
    const bo = b.orderNumber ?? 0
    if (ao > 0 || bo > 0) return ao - bo
    if (a.itemNo && b.itemNo) return itemNoSortComparer(a, b)
    return a.id.localeCompare(b.id)
  })

  return rootItems.map(item => buildNode(item))
}

// 將後端資料轉換為前端格式
const convertToProjectItem = (code: ConstructionPccesCode): ProjectItem => ({
  id: code.id.toString(),
  code: code.pccesCode || '',
  name: code.name,
  unit: code.unitType,
  quantity: code.quantity,
  price: code.price,
  amount: code.amount,
  itemNo: code.itemNo,
  orderNumber: typeof (code as any).orderNumber === 'number' ? ((code as any).orderNumber as number) : parseInt((code as any).orderNumber) || 0,
  parentId: code.parentId,
  type: code.type,
  isSafetyHealthFacility: code.isSafetyHealthFacility === true,
  isTestItem: code.isTestItem === true
})

const convertToBreakdownProjectItem = (r: ConstructionPccesCostBreakdown): BreakdownProjectItem => ({
  id: String(r.id),
  parentId: r.parentId,
  orderNumber: r.orderNumber ?? 0,
  refItemNo: r.refItemNo ?? '',
  itemCode: r.itemCode ?? '',
  name: r.name,
  unit: r.unitType ?? '',
  quantity: r.quantity,
  price: numToDisplay(r.price),
  amount: numToDisplay(r.amount),
  itemKind: r.itemKind ?? '',
  percent: numToDisplay(r.percent),
  labourRatio: numToDisplay(r.labourRatio),
  equipmentRatio: numToDisplay(r.equipmentRatio),
  materialRatio: numToDisplay(r.materialRatio),
  miscellaneaRatio: numToDisplay(r.miscellaneaRatio),
  type: r.type,
  isMaterial: r.isMaterial === true
})

const buildBreakdownTreeData = (flat: BreakdownProjectItem[]): any[] => {
  const childrenMap = new Map<string, BreakdownProjectItem[]>()
  const rootItems: BreakdownProjectItem[] = []
  for (const item of flat) {
    if (item.parentId == null) rootItems.push(item)
    else {
      const pk = item.parentId.toString()
      if (!childrenMap.has(pk)) childrenMap.set(pk, [])
      childrenMap.get(pk)!.push(item)
    }
  }
  const buildNode = (item: BreakdownProjectItem): any => {
    const node: any = {
      id: item.id,
      refItemNo: item.refItemNo,
      itemCode: item.itemCode,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      amount: item.amount,
      itemKind: item.itemKind,
      percent: item.percent,
      labourRatio: item.labourRatio,
      equipmentRatio: item.equipmentRatio,
      materialRatio: item.materialRatio,
      miscellaneaRatio: item.miscellaneaRatio,
      type: item.type,
      isMaterial: item.isMaterial
    }
    const ch = childrenMap.get(item.id)
    if (ch?.length) {
      ch.sort((a, b) => a.orderNumber - b.orderNumber)
      node.children = ch.map(buildNode)
    }
    return node
  }
  rootItems.sort((a, b) => a.orderNumber - b.orderNumber)
  return rootItems.map(buildNode)
}

function isBreakdownLeafRow(data: any): boolean {
  const ch = data?.children
  return !Array.isArray(ch) || ch.length === 0
}

// 單價分析頁籤不再顯示/編輯「材料」欄位；材料標示由「材料與試驗」面板統一維護

// 載入變更設計列表（依生效日升序）
const fetchDesignChangeList = async () => {
  const cid = constructionId.value
  if (!cid) {
    designChangeList.value = []
    return
  }
  try {
    const st = designChangeSourceType.value
    const list = st ? await getDesignChangeList(cid, st) : await getDesignChangeList(cid)
    designChangeList.value = [...list].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    )
  } catch {
    designChangeList.value = []
  }
}

// 載入工項列表（依目前選中的變更設計版本）
const loadItems = async () => {
  if (!constructionId.value) {
    items.value = []
    treeGridData.value = []
    breakdownItems.value = []
    breakdownTreeGridData.value = []
    resourceRows.value = []
    return
  }
  isLoading.value = true
  try {
    const [data, bdRows, resRows] = await Promise.all([
      getConstructionPccesCodes(constructionId.value, selectedDesignChangeId.value),
      getConstructionPccesCostBreakdown(constructionId.value, selectedDesignChangeId.value),
      getConstructionPccesResources(constructionId.value, selectedDesignChangeId.value)
    ])
    items.value = data.map(convertToProjectItem)
    breakdownItems.value = bdRows.map(convertToBreakdownProjectItem)
    resourceRows.value = resRows
    updateTreeGridData()
    breakdownTreeGridData.value = buildBreakdownTreeData(breakdownItems.value)
    await applyDiffFromPreviousVersion()
  } catch (error: any) {
    console.error('載入工項列表失敗:', error)
    if (error.response?.status !== 404) {
      alert('載入工項列表失敗：' + (error.message || '未知錯誤'))
    }
    items.value = []
    treeGridData.value = []
    breakdownItems.value = []
    breakdownTreeGridData.value = []
    resourceRows.value = []
  } finally {
    isLoading.value = false
  }
}

// 開啟匯入 Modal
const openImportModal = () => {
  if (!constructionId.value) {
    alert('請先選擇工程項目')
    return
  }
  importError.value = ''
  selectedFile.value = null
  importOverwrite.value = true
  importDragDepth.value = 0
  if (fileInput.value) fileInput.value.value = ''
  showImportModal.value = true
}

function isAcceptablePccesXmlFile(file: File): boolean {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.xml')) return true
  const t = (file.type || '').toLowerCase()
  return t === 'text/xml' || t === 'application/xml' || t === 'application/xhtml+xml'
}

function assignImportFile(file: File | null) {
  if (!file) {
    selectedFile.value = null
    return
  }
  if (!isAcceptablePccesXmlFile(file)) {
    importError.value = '請選擇副檔名為 .xml 的檔案'
    selectedFile.value = null
    return
  }
  selectedFile.value = file
  importError.value = ''
}

function triggerFileInput() {
  if (isImporting.value) return
  fileInput.value?.click()
}

function formatImportFileSize(bytes: number): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function onImportDragEnter(e: DragEvent) {
  if (e.dataTransfer?.types?.includes('Files')) {
    importDragDepth.value += 1
  }
}

function onImportDragLeave() {
  importDragDepth.value = Math.max(0, importDragDepth.value - 1)
}

function onImportDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onImportDrop(e: DragEvent) {
  importDragDepth.value = 0
  const files = e.dataTransfer?.files
  if (!files?.length) return
  assignImportFile(files[0])
}

// 處理檔案選擇
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    assignImportFile(target.files[0])
  }
}

// 複製前一個版本
const handleCopyPrevious = async () => {
  const cid = constructionId.value
  const target = selectedDesignChangeId.value
  if (!cid || target == null) return
  isCopying.value = true
  try {
    const source = sourceDesignChangeIdForCopy.value ?? undefined
    const { count } = await copyPccesFromTo(cid, source, target)
    alert(`已從前一個版本複製 ${count} 筆工項至目前版本。`)
    await loadItems()
  } catch (error: any) {
    console.error('複製失敗:', error)
    alert('複製失敗：' + (error.message || '未知錯誤'))
  } finally {
    isCopying.value = false
  }
}

// 處理匯入
const handleImport = async () => {
  if (!selectedFile.value || !constructionId.value) {
    importError.value = '請選擇檔案'
    return
  }
  isImporting.value = true
  importError.value = ''
  try {
    const request: ImportPccesRequest = {
      pccesFile: selectedFile.value,
      constructionId: constructionId.value,
      designChangeId: selectedDesignChangeId.value,
      overwrite: importOverwrite.value
    }
    const result = await importPccesFile(request)
    const targetLabel = result.designChangeId == null ? '原契約' : '變更設計'
    const bd = result.totalCostBreakdown ?? 0
    alert(`匯入成功！\n匯入目標：${targetLabel}\n標單明細工項：${result.totalCodes}\n單價分析列：${bd}`)
    showImportModal.value = false
    await loadItems()
  } catch (error: any) {
    console.error('匯入失敗:', error)
    importError.value = error.message || '匯入失敗，請檢查檔案格式或稍後再試'
  } finally {
    isImporting.value = false
  }
}

// 格式化數字
const formatNumber = (value: number | string): string => {
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? '—' : num.toLocaleString('zh-TW')
  }
  return value.toLocaleString('zh-TW')
}

// 格式化價格
const formatPrice = (value: string): string => {
  if (!value) return ''
  const num = parseFloat(value)
  return isNaN(num) ? value : num.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 根據類型取得圖示
const getTypeIcon = (type: string | null): string => {
  if (!type) return ''
  
  const iconMap: Record<string, string> = {
    [PccesItemType.MAIN_ITEM]: 'fa fa-folder text-primary',
    [PccesItemType.LABOUR]: 'fa fa-users text-info',
    [PccesItemType.EQUIPMENT]: 'fa fa-cog text-warning',
    [PccesItemType.MATERIAL]: 'fa fa-cube text-success',
    [PccesItemType.MISC]: 'fa fa-archive text-secondary',
    [PccesItemType.WORK_ITEM]: 'fa fa-hammer text-danger'
  }
  
  return iconMap[type] || ''
}

// 根據類型取得標籤
const getTypeLabel = (type: string | null): string => {
  if (!type) return ''
  
  const labelMap: Record<string, string> = {
    [PccesItemType.MAIN_ITEM]: '大項',
    [PccesItemType.LABOUR]: '人工',
    [PccesItemType.EQUIPMENT]: '機具',
    [PccesItemType.MATERIAL]: '材料',
    [PccesItemType.MISC]: '雜項',
    [PccesItemType.WORK_ITEM]: '工項'
  }
  
  return labelMap[type] || ''
}

// 更新 TreeGrid 資料（不再額外過濾，僅依照原始 items，搜尋改由 TreeGrid 內建篩選處理）
const updateTreeGridData = () => {
  treeGridData.value = buildTreeData(items.value)
}

// 監聽工程項目變化
watch(constructionId, async (newId) => {
  if (newId) {
    await fetchDesignChangeList()
    await loadItems()
  } else {
    items.value = []
    treeGridData.value = []
    breakdownItems.value = []
    breakdownTreeGridData.value = []
    designChangeList.value = []
    selectedDesignChangeId.value = null
  }
})

watch(selectedDesignChangeId, () => {
  if (constructionId.value) loadItems()
})

watch(diffEnabled, async () => {
  try {
    await applyDiffFromPreviousVersion()
  } catch (e) {
    console.error('套用版本差異失敗:', e)
  }
})

watch(designChangeSourceType, () => {
  if (constructionId.value) fetchDesignChangeList()
})

watch(showImportModal, (open) => {
  if (!open) importDragDepth.value = 0
})

// 初始化（需先載入變更設計列表，複製前一版才能正確算出來源版本）
onMounted(async () => {
  if (constructionId.value) {
    await fetchDesignChangeList()
    await loadItems()
  }
})

// 當組件重新激活時（從其他畫面切回來），確保 TreeGrid 樣式正確
onActivated(() => {
  // 強制重新渲染 TreeGrid（如果需要）
  if (treegrid.value) {
    // 觸發 TreeGrid 重新計算樣式
    nextTick(() => {
      // 確保全螢幕狀態正確
      if (isFullscreen.value) {
        // 如果處於全螢幕模式，確保樣式正確應用
      }
    })
  }
})
</script>

<style scoped>
.project-item-database-page {
  padding: 1rem;
}

/* 工具列：分頁與操作同一列，底邊與表格外框銜接 */
.pcces-toolbar-row {
  padding: 0.5rem 0.75rem;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid #475569;
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
  margin-bottom: 0;
}
.pcces-toolbar-row--standalone {
  border-bottom: 1px solid #475569;
  border-radius: 0.375rem;
}
.treegrid-wrapper.pcces-treegrid-below-toolbar:not(.treegrid-fullscreen) {
  margin-top: 0;
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

/* 分頁略放大（固定寬度占比，不拉滿整列） */
.pcces-segment-tabs--lg .pcces-segment-tab {
  min-width: 7.25rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.9rem;
}

/* 分段式分頁基底 */
.pcces-segment-tabs {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid #64748b;
  border-radius: 0.375rem;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.65);
}
.pcces-segment-tab {
  position: relative;
  border: none;
  margin: 0;
  background: transparent;
  color: #cbd5e1;
  padding: 0.35rem 1rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  line-height: 1.35;
  border-right: 1px solid #64748b;
  transition: color 0.12s ease, background 0.12s ease;
}
.pcces-segment-tab:last-child {
  border-right: none;
}
.pcces-segment-tab:hover {
  color: #f8fafc;
  background: rgba(51, 65, 85, 0.55);
}
.pcces-segment-tab:focus-visible {
  outline: 2px solid #94a3b8;
  outline-offset: 2px;
  z-index: 1;
}
.pcces-segment-tab--active {
  color: #f8fafc !important;
  background: rgba(71, 85, 105, 0.75) !important;
  box-shadow: inset 0 -2px 0 #94a3b8;
}
.pcces-diff-toggle-label {
  color: #e2e8f0;
  font-size: 0.8125rem;
  font-weight: 500;
}

/* 紅字色：適合深色背景 (#0f172a) 顯示 */
.pcces-diff-redword {
  color: #f87171;
  font-weight: 700;
}

.pcces-diff-changed {
  color: #f87171;
  font-weight: 600;
}

.pcces-diff-added {
  color: #f87171;
  font-weight: 700;
}

.treegrid-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  /* 避免 TreeGrid 捲動到底部時內容被外層裁切 */
  overflow: visible;
  height: calc(100vh - 180px);
  min-height: 520px;
  background-color: #0f172a; /* 使用深色背景，與專案主題一致 */
}

.treegrid-fullscreen {
  position: fixed;
  inset: 0.5rem;
  z-index: 1050;
  border-radius: 0;
  height: auto;
  background-color: #0f172a;
}

.treegrid-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-color: #0f172a; /* 確保內容區域也是深色背景 */
}

.material-inspection-container {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  box-sizing: border-box;
}

.material-inspection-container > * {
  flex: 1;
  min-height: 0;
}

/* 確保 TreeGrid 本身使用深色背景 */
:deep(.e-treegrid) {
  background-color: #0f172a !important;
  height: 100% !important;
}

:deep(.e-treegrid .e-gridcontent),
:deep(.e-treegrid .e-gridheader),
:deep(.e-treegrid .e-content),
:deep(.e-treegrid .e-headercontent) {
  background-color: #0f172a !important;
}

/* 讓列內容區固定在容器內捲動，避免到底部被裁切/閃爍 */
:deep(.e-treegrid .e-gridcontent) {
  overflow-y: auto !important;
}

:deep(.e-treegrid .e-row),
:deep(.e-treegrid .e-altrow) {
  background-color: transparent !important;
}

:deep(.e-treegrid .e-headercell),
:deep(.e-treegrid .e-rowcell) {
  background-color: transparent !important;
  border-color: #475569 !important;
}

/* 確保 TreeGrid 展開圖示與文字在同一行 */
:deep(.e-treegrid .e-treecolumn-container) {
  display: flex !important;
  align-items: center !important;
  white-space: nowrap !important;
  flex-wrap: nowrap !important;
}

:deep(.e-treegrid .e-treegridexpand) {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  flex-shrink: 0;
}

:deep(.e-treegrid .e-treegridcell) {
  display: flex;
  align-items: center;
  vertical-align: middle;
}

:deep(.e-treegrid .e-treegridcell-content) {
  display: flex;
  align-items: center;
  line-height: 1.5;
  white-space: nowrap;
  flex-wrap: nowrap;
}

.fullscreen-toolbar {
  background-color: #0f172a;
  color: #fff;
}


@media (max-width: 575.98px) {
  .project-item-database-page {
    padding: 0.5rem;
  }
  
  .treegrid-wrapper {
    height: 400px;
  }
}

.pcces-import-dropzone {
  cursor: pointer;
  background-color: rgba(15, 23, 42, 0.35);
  border-color: #64748b !important;
  border-style: dashed !important;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}
.pcces-import-dropzone:hover {
  border-color: #94a3b8 !important;
  background-color: rgba(30, 41, 59, 0.45);
}
.pcces-import-dropzone--active {
  border-color: #38bdf8 !important;
  background-color: rgba(14, 165, 233, 0.12);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.35);
}
.pcces-import-dropzone--has-file:not(.pcces-import-dropzone--active) {
  border-style: solid !important;
  border-width: 2px !important;
  border-color: #22c55e !important;
  background: linear-gradient(
    165deg,
    rgba(34, 197, 94, 0.22) 0%,
    rgba(15, 23, 42, 0.92) 55%
  );
  box-shadow:
    0 0 0 1px rgba(34, 197, 94, 0.45),
    0 8px 24px rgba(34, 197, 94, 0.12);
}
.pcces-import-dropzone--has-file:not(.pcces-import-dropzone--active):hover {
  border-color: #4ade80 !important;
  box-shadow:
    0 0 0 1px rgba(74, 222, 128, 0.55),
    0 10px 28px rgba(34, 197, 94, 0.18);
}
.pcces-import-file-check {
  font-size: 2.75rem;
  color: #4ade80;
  line-height: 1;
  filter: drop-shadow(0 0 10px rgba(74, 222, 128, 0.45));
}
.pcces-import-ready-badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #052e16;
  background: linear-gradient(180deg, #86efac 0%, #4ade80 100%);
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.35);
}
.pcces-import-filename {
  font-size: 1.15rem;
  font-weight: 700;
  color: #ecfdf5;
  line-height: 1.35;
  word-break: break-word;
}
.pcces-import-filemeta {
  font-size: 0.9rem;
  color: #a7f3d0;
  font-weight: 600;
}
.pcces-import-replace-hint {
  color: #94a3b8;
}
</style>
