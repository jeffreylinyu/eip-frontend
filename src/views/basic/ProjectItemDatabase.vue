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
          v-if="pccesViewTab === 'detail'"
          class="btn btn-outline-success btn-sm"
          type="button"
          @click="startAddDetailRoot"
          :disabled="isLoading || editingRowId != null || isAddingDetail"
          title="在根層級新增工項"
        >
          <i class="fa fa-plus me-1"></i>新增工項
        </button>
        <button
          v-else-if="pccesViewTab === 'breakdown'"
          class="btn btn-outline-success btn-sm"
          type="button"
          @click="startAddBdRoot"
          :disabled="isLoading || bdEditingRowId != null || isAddingBd"
          title="在根層級新增單價分析列"
        >
          <i class="fa fa-plus me-1"></i>新增列
        </button>
        <button
          v-else-if="pccesViewTab === 'resource'"
          class="btn btn-outline-success btn-sm"
          type="button"
          @click="startAddResRow(null)"
          :disabled="isLoading || resEditingRowId != null || isAddingRes"
          title="新增資源統計列"
        >
          <i class="fa fa-plus me-1"></i>新增列
        </button>
        <div class="btn-group btn-group-sm">
          <button
            class="btn btn-success"
            type="button"
            @click="openImportModal"
            :disabled="isLoading"
          >
            <i class="fa fa-file-import me-1"></i>匯入 PCCES
          </button>
          <button
            class="btn btn-success dropdown-toggle dropdown-toggle-split"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            :disabled="isLoading"
          >
            <span class="visually-hidden">更多匯入選項</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <a class="dropdown-item small text-muted" style="cursor:pointer" @click="openExcelImportModal">
                <i class="fa fa-file-excel me-2"></i>Excel 匯入（AI 解析）
                <div class="text-muted" style="font-size:0.75rem">無 PCCES XML 時的替代方案</div>
              </a>
            </li>
          </ul>
        </div>
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
            v-if="selectedDesignChangeId != null"
            class="btn btn-outline-info btn-sm"
            type="button"
            @click="handleCopyPrevious"
            :disabled="!canCopyPrevious || isLoading || isCopying"
            title="將前一個版本的工項複製到目前版本（會覆蓋目前版本既有工項）"
          >
            <i class="fa fa-copy me-1"></i>複製前一個版本
          </button>
          <div class="btn-group btn-group-sm">
            <button
              class="btn btn-success"
              type="button"
              @click="openImportModal"
              :disabled="isLoading"
            >
              <i class="fa fa-file-import me-1"></i>匯入 PCCES
            </button>
            <button
              class="btn btn-success dropdown-toggle dropdown-toggle-split"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              :disabled="isLoading"
            >
              <span class="visually-hidden">更多匯入選項</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <a class="dropdown-item small text-muted" style="cursor:pointer" @click="openExcelImportModal">
                  <i class="fa fa-file-excel me-2"></i>Excel 匯入（AI 解析）
                  <div class="text-muted" style="font-size:0.75rem">無 PCCES XML 時的替代方案</div>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="treegrid-body">
        <div v-if="pccesViewTab === 'materialInspection'" class="material-inspection-container">
          <MaterialInspectionPanel
            v-if="constructionId"
            ref="materialPanelRef"
            :construction-id="constructionId"
            :design-change-id="selectedDesignChangeId"
            :materials="modalMaterials"
            :breakdown-items="breakdownItems"
            :active="pccesViewTab === 'materialInspection'"
          />
        </div>

        <ejs-treegrid
          v-else-if="pccesViewTab === 'detail'"
          ref="treegrid"
          :dataSource="treeGridData"
          :dataBound="onDetailGridDataBound"
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
            <e-column
              field="type"
              headerText="類型"
              width="110"
              textAlign="Left"
              :template="'typeTemplate'"
              :allowFiltering="false"
            ></e-column>
            <e-column
              field="__actions"
              headerText="操作"
              width="250"
              textAlign="Center"
              :template="'actionsTemplate'"
              :allowFiltering="false"
              :allowSorting="false"
            ></e-column>
          </e-columns>

          <template v-slot:itemNoTemplate="{ data }">
            <span :class="getCellClass(data, 'itemNo')">{{ data.itemNo }}</span>
          </template>

          <template v-slot:codeTemplate="{ data }">
            <template v-if="data.isNew && addDetailBuffer">
              <input type="text" class="form-control form-control-sm" v-model="addDetailBuffer.pccesCode"
                placeholder="PCCES 料碼" style="min-width:110px" @click.stop />
            </template>
            <template v-else-if="editingRowId === String(data.id) && editBuffer">
              <input type="text" class="form-control form-control-sm" v-model="editBuffer.pccesCode"
                placeholder="PCCES 料碼" style="min-width:110px" @click.stop />
            </template>
            <span v-else :class="getCellClass(data, 'code')">{{ data.code }}</span>
          </template>

          <!-- 工項名稱模板（包含類型圖示 / 編輯輸入框） -->
          <template v-slot:nameTemplate="{ data }">
            <template v-if="data.isNew && addDetailBuffer">
              <input type="text" class="form-control form-control-sm" v-model="addDetailBuffer.name"
                placeholder="工項名稱*" style="min-width:200px" @click.stop />
            </template>
            <template v-else-if="editingRowId === String(data.id) && editBuffer">
              <input type="text" class="form-control form-control-sm" v-model="editBuffer.name"
                placeholder="工項名稱" style="min-width:200px" @click.stop />
            </template>
            <div v-else class="d-flex align-items-center gap-2" style="line-height: 1.5;">
              <i v-if="data.type" :class="getTypeIcon(data.type)" :title="getTypeLabel(data.type)"></i>
              <span :class="getCellClass(data, 'name')">{{ data.name }}</span>
            </div>
          </template>

          <template v-slot:unitTemplate="{ data }">
            <template v-if="editingRowId === String(data.id) && editBuffer">
              <input
                type="text"
                class="form-control form-control-sm text-center"
                v-model="editBuffer.unitType"
                placeholder="單位"
                style="min-width:60px;max-width:80px"
                @click.stop
              />
            </template>
            <span v-else :class="getCellClass(data, 'unit')">{{ data.unit }}</span>
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

          <!-- 總量模板 -->
          <template v-slot:quantityTemplate="{ data }">
            <template v-if="data.isNew && addDetailBuffer">
              <input type="number" class="form-control form-control-sm text-end" v-model="addDetailBuffer.quantity"
                step="any" style="min-width:80px" @click.stop />
            </template>
            <template v-else-if="editingRowId === String(data.id) && editBuffer">
              <input type="number" class="form-control form-control-sm text-end" v-model="editBuffer.quantity"
                step="any" style="min-width:80px" @click.stop />
            </template>
            <span v-else :class="getCellClass(data, 'quantity')">{{ formatNumber(data.quantity) }}</span>
          </template>

          <!-- 單價模板 -->
          <template v-slot:priceTemplate="{ data }">
            <template v-if="data.isNew && addDetailBuffer">
              <input type="number" class="form-control form-control-sm text-end" v-model="addDetailBuffer.price"
                step="any" style="min-width:100px" @click.stop />
            </template>
            <template v-else-if="editingRowId === String(data.id) && editBuffer">
              <input type="number" class="form-control form-control-sm text-end" v-model="editBuffer.price"
                step="any" style="min-width:100px" @click.stop />
            </template>
            <span v-else :class="getCellClass(data, 'price')">{{ formatPrice(data.price) }}</span>
          </template>

          <!-- 金額模板（編輯模式下顯示即時計算值，不可輸入） -->
          <template v-slot:amountTemplate="{ data }">
            <template v-if="data.isNew && addDetailBuffer">
              <span class="text-muted fst-italic" style="font-size:0.85rem">
                {{ formatPrice(String((Number(addDetailBuffer.quantity) || 0) * (parseFloat(String(addDetailBuffer.price)) || 0))) }}
              </span>
            </template>
            <template v-else-if="editingRowId === String(data.id) && editBuffer">
              <span class="text-muted fst-italic" style="font-size:0.85rem">
                {{ formatPrice(String((Number(editBuffer.quantity) || 0) * (parseFloat(String(editBuffer.price)) || 0))) }}
              </span>
            </template>
            <span v-else :class="getCellClass(data, 'amount')">{{ formatPrice(data.amount) }}</span>
          </template>

          <!-- 類型模板 -->
          <template v-slot:typeTemplate="{ data }">
            <template v-if="data.isNew && addDetailBuffer">
              <select class="form-select form-select-sm" v-model="addDetailBuffer.type"
                style="min-width:90px" @click.stop>
                <option v-for="opt in typeOptions" :key="String(opt.value)" :value="opt.value">
                  {{ opt.emoji }} {{ opt.label }}
                </option>
              </select>
            </template>
            <template v-else-if="editingRowId === String(data.id) && editBuffer">
              <select class="form-select form-select-sm" v-model="editBuffer.type"
                style="min-width:90px" @click.stop>
                <option v-for="opt in typeOptions" :key="String(opt.value)" :value="opt.value">
                  {{ opt.emoji }} {{ opt.label }}
                </option>
              </select>
            </template>
            <span v-else class="d-flex align-items-center gap-1" style="white-space:nowrap">
              <i v-if="data.type" :class="getTypeIcon(data.type)"></i>
              <span>{{ data.type ? getTypeLabel(data.type) : '' }}</span>
            </span>
          </template>

          <!-- 操作模板 -->
          <template v-slot:actionsTemplate="{ data }">
            <div class="act-row" @click.stop>
              <!-- 新增列：儲存 / 取消 -->
              <template v-if="data.isNew">
                <button class="act-btn act-btn--save" :disabled="isSavingAddDetail"
                  @click.stop="saveAddDetail()" title="儲存新增">
                  <span v-if="isSavingAddDetail" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="fa fa-check me-1"></i>儲存
                </button>
                <button class="act-btn act-btn--cancel" :disabled="isSavingAddDetail"
                  @click.stop="cancelAddDetail()">取消</button>
              </template>
              <!-- 編輯列：儲存 / 取消 -->
              <template v-else-if="editingRowId === String(data.id)">
                <button class="act-btn act-btn--save" :disabled="isSavingEdit"
                  @click.stop="saveEdit(data)" title="儲存">
                  <span v-if="isSavingEdit" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="fa fa-check me-1"></i>儲存
                </button>
                <button class="act-btn act-btn--cancel" :disabled="isSavingEdit"
                  @click.stop="cancelEdit()">取消</button>
              </template>
              <!-- 一般列：hover 才顯示 -->
              <template v-else>
                <span class="row-hover-btns act-group">
                  <button class="act-btn act-btn--edit"
                    :disabled="editingRowId != null || isSavingEdit"
                    @click.stop="startEdit(data)" title="編輯">
                    <i class="fa fa-pencil-alt"></i>
                  </button>
                  <button class="act-btn act-btn--del"
                    :disabled="editingRowId != null || isSavingEdit"
                    @click.stop="deleteItem(data)" title="刪除">
                    <i class="fa fa-trash"></i>
                  </button>
                  <span class="act-divider"></span>
                  <button class="act-btn act-btn--move"
                    :disabled="editingRowId != null || isAddingDetail"
                    @click.stop="moveDetailRow(data, 'up')" title="上移">
                    <i class="fa fa-arrow-up"></i>
                  </button>
                  <button class="act-btn act-btn--move"
                    :disabled="editingRowId != null || isAddingDetail"
                    @click.stop="moveDetailRow(data, 'down')" title="下移">
                    <i class="fa fa-arrow-down"></i>
                  </button>
                  <span class="act-divider"></span>
                  <button class="act-btn act-btn--add"
                    :disabled="editingRowId != null || isAddingDetail"
                    @click.stop="startAddDetailSibling(data)" title="新增同層工項">＋同層</button>
                  <button class="act-btn act-btn--add"
                    :disabled="editingRowId != null || isAddingDetail"
                    @click.stop="startAddDetailChild(data)" title="新增子工項">⤷子項</button>
                </span>
              </template>
            </div>
          </template>
        </ejs-treegrid>

        <ejs-treegrid
          v-else-if="pccesViewTab === 'breakdown'"
          ref="breakdownTreegrid"
          :dataSource="breakdownTreeGridData"
          :dataBound="onBreakdownGridDataBound"
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
            <e-column field="refItemNo" headerText="對應項次" width="120" textAlign="Left" />
            <e-column
              field="itemCode"
              headerText="料碼"
              width="140"
              textAlign="Left"
              :template="'bdItemCodeTemplate'"
            />
            <e-column
              field="name"
              headerText="名稱"
              width="260"
              textAlign="Left"
              :template="'bdNameTemplate'"
            />
            <e-column
              field="unit"
              headerText="單位"
              width="80"
              textAlign="Center"
              :template="'bdUnitTemplate'"
            />
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
            <e-column
              field="type"
              headerText="類型"
              width="110"
              textAlign="Left"
              :template="'bdTypeTemplate'"
              :allowFiltering="false"
            />
            <e-column
              field="__bd_actions"
              headerText="操作"
              width="210"
              textAlign="Center"
              :template="'bdActionsTemplate'"
              :allowFiltering="false"
              :allowSorting="false"
            />
          </e-columns>

          <template v-slot:bdItemCodeTemplate="{ data }">
            <template v-if="data.isNew && addBdBuffer">
              <input type="text" class="form-control form-control-sm" v-model="addBdBuffer.itemCode"
                placeholder="料碼" style="min-width:100px" @click.stop />
            </template>
            <template v-else-if="bdEditingRowId === String(data.id) && bdEditBuffer">
              <input
                type="text"
                class="form-control form-control-sm"
                v-model="bdEditBuffer.itemCode"
                placeholder="料碼"
                style="min-width:100px"
                @click.stop
              />
            </template>
            <span v-else>{{ data.itemCode }}</span>
          </template>

          <template v-slot:bdNameTemplate="{ data }">
            <template v-if="data.isNew && addBdBuffer">
              <input type="text" class="form-control form-control-sm" v-model="addBdBuffer.name"
                placeholder="名稱*" style="min-width:180px" @click.stop />
            </template>
            <template v-else-if="bdEditingRowId === String(data.id) && bdEditBuffer">
              <input type="text" class="form-control form-control-sm" v-model="bdEditBuffer.name"
                placeholder="名稱" style="min-width:180px" @click.stop />
            </template>
            <div v-else class="d-flex align-items-center gap-2" style="line-height: 1.5;">
              <i v-if="data.type" :class="getTypeIcon(data.type)" :title="getTypeLabel(data.type)"></i>
              <span>{{ data.name }}</span>
            </div>
          </template>

          <template v-slot:bdUnitTemplate="{ data }">
            <template v-if="data.isNew && addBdBuffer">
              <input type="text" class="form-control form-control-sm text-center" v-model="addBdBuffer.unitType"
                placeholder="單位" style="min-width:50px;max-width:70px" @click.stop />
            </template>
            <template v-else-if="bdEditingRowId === String(data.id) && bdEditBuffer">
              <input type="text" class="form-control form-control-sm text-center" v-model="bdEditBuffer.unitType"
                placeholder="單位" style="min-width:50px;max-width:70px" @click.stop />
            </template>
            <span v-else>{{ data.unit }}</span>
          </template>

          <template v-slot:bdQtyTemplate="{ data }">
            <template v-if="data.isNew && addBdBuffer">
              <input type="number" class="form-control form-control-sm text-end" v-model="addBdBuffer.quantity"
                step="any" style="min-width:70px" @click.stop />
            </template>
            <template v-else-if="bdEditingRowId === String(data.id) && bdEditBuffer">
              <input type="number" class="form-control form-control-sm text-end" v-model="bdEditBuffer.quantity"
                step="any" style="min-width:70px" @click.stop />
            </template>
            <span v-else>{{ formatNumber(data.quantity) }}</span>
          </template>

          <template v-slot:bdPriceTemplate="{ data }">
            <template v-if="data.isNew && addBdBuffer">
              <input type="number" class="form-control form-control-sm text-end" v-model="addBdBuffer.price"
                step="any" style="min-width:80px" @click.stop />
            </template>
            <template v-else-if="bdEditingRowId === String(data.id) && bdEditBuffer">
              <input type="number" class="form-control form-control-sm text-end" v-model="bdEditBuffer.price"
                step="any" style="min-width:80px" @click.stop />
            </template>
            <span v-else>{{ formatPrice(data.price) }}</span>
          </template>

          <template v-slot:bdAmtTemplate="{ data }">
            <template v-if="data.isNew && addBdBuffer">
              <span class="text-muted fst-italic" style="font-size:0.85rem">
                {{ formatPrice(String((Number(addBdBuffer.quantity) || 0) * (parseFloat(String(addBdBuffer.price)) || 0))) }}
              </span>
            </template>
            <template v-else-if="bdEditingRowId === String(data.id) && bdEditBuffer">
              <span class="text-muted fst-italic" style="font-size:0.85rem">
                {{ formatPrice(String((Number(bdEditBuffer.quantity) || 0) * (parseFloat(String(bdEditBuffer.price)) || 0))) }}
              </span>
            </template>
            <span v-else>{{ formatPrice(data.amount) }}</span>
          </template>

          <template v-slot:bdTypeTemplate="{ data }">
            <template v-if="data.isNew && addBdBuffer">
              <select class="form-select form-select-sm" v-model="addBdBuffer.type"
                style="min-width:90px" @click.stop>
                <option v-for="opt in typeOptions" :key="String(opt.value)" :value="opt.value">
                  {{ opt.emoji }} {{ opt.label }}
                </option>
              </select>
            </template>
            <template v-else-if="bdEditingRowId === String(data.id) && bdEditBuffer">
              <select class="form-select form-select-sm" v-model="bdEditBuffer.type"
                style="min-width:90px" @click.stop>
                <option v-for="opt in typeOptions" :key="String(opt.value)" :value="opt.value">
                  {{ opt.emoji }} {{ opt.label }}
                </option>
              </select>
            </template>
            <span v-else class="d-flex align-items-center gap-1" style="white-space:nowrap">
              <i v-if="data.type" :class="getTypeIcon(data.type)"></i>
              <span>{{ data.type ? getTypeLabel(data.type) : '' }}</span>
            </span>
          </template>

          <template v-slot:bdActionsTemplate="{ data }">
            <div class="act-row" @click.stop>
              <!-- 新增列 -->
              <template v-if="data.isNew">
                <button class="act-btn act-btn--save" :disabled="isSavingAddBd"
                  @click.stop="saveAddBd()" title="儲存新增">
                  <span v-if="isSavingAddBd" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="fa fa-check me-1"></i>儲存
                </button>
                <button class="act-btn act-btn--cancel" :disabled="isSavingAddBd"
                  @click.stop="cancelAddBd()">取消</button>
              </template>
              <!-- 編輯列 -->
              <template v-else-if="bdEditingRowId === String(data.id)">
                <button class="act-btn act-btn--save" :disabled="bdIsSavingEdit"
                  @click.stop="saveBdEdit(data)" title="儲存">
                  <span v-if="bdIsSavingEdit" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="fa fa-check me-1"></i>儲存
                </button>
                <button class="act-btn act-btn--cancel" :disabled="bdIsSavingEdit"
                  @click.stop="cancelBdEdit()">取消</button>
              </template>
              <!-- 一般列 -->
              <template v-else>
                <span class="row-hover-btns act-group">
                  <button class="act-btn act-btn--edit"
                    :disabled="bdEditingRowId != null || bdIsSavingEdit || isAddingBd"
                    @click.stop="startBdEdit(data)" title="編輯">
                    <i class="fa fa-pencil-alt"></i>
                  </button>
                  <button class="act-btn act-btn--del"
                    :disabled="bdEditingRowId != null || bdIsSavingEdit || isAddingBd"
                    @click.stop="deleteBdRow(data)" title="刪除">
                    <i class="fa fa-trash"></i>
                  </button>
                  <span class="act-divider"></span>
                  <button class="act-btn act-btn--move"
                    :disabled="bdEditingRowId != null || isAddingBd"
                    @click.stop="moveBdRow(data, 'up')" title="上移">
                    <i class="fa fa-arrow-up"></i>
                  </button>
                  <button class="act-btn act-btn--move"
                    :disabled="bdEditingRowId != null || isAddingBd"
                    @click.stop="moveBdRow(data, 'down')" title="下移">
                    <i class="fa fa-arrow-down"></i>
                  </button>
                  <span class="act-divider"></span>
                  <button class="act-btn act-btn--add"
                    :disabled="bdEditingRowId != null || isAddingBd"
                    @click.stop="startAddBdSibling(data)" title="新增同層">＋同層</button>
                  <button class="act-btn act-btn--add"
                    :disabled="bdEditingRowId != null || isAddingBd"
                    @click.stop="startAddBdChild(data)" title="新增子列">⤷子列</button>
                </span>
              </template>
            </div>
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
            <e-column field="itemCode" headerText="編碼" width="160" textAlign="Left"
              :filter="containsFilter" :template="'resItemCodeTemplate'" />
            <e-column field="name" headerText="名稱" width="380" textAlign="Left"
              :filter="containsFilter" :template="'resourceNameTemplate'" />
            <e-column field="unitType" headerText="單位" width="80" textAlign="Center"
              :template="'resUnitTemplate'" />
            <e-column field="quantity" headerText="數量" width="120" textAlign="Right"
              :template="'resQtyTemplate'" />
            <e-column field="price" headerText="單價" width="120" textAlign="Right"
              :template="'resPriceTemplate'" />
            <e-column field="amount" headerText="金額" width="130" textAlign="Right"
              :template="'resAmtTemplate'" />
            <e-column field="__res_actions" headerText="操作" width="200" textAlign="Center"
              :template="'resActionsTemplate'" :allowFiltering="false" :allowSorting="false" />
          </e-columns>

          <template v-slot:resItemCodeTemplate="{ data }">
            <template v-if="data.isNew && addResBuffer">
              <input type="text" class="form-control form-control-sm"
                v-model="addResBuffer.itemCode"
                placeholder="編碼" style="min-width:120px" @click.stop />
            </template>
            <template v-else-if="resEditingRowId === String(data.id) && resEditBuffer">
              <input type="text" class="form-control form-control-sm"
                v-model="resEditBuffer.itemCode"
                placeholder="編碼" style="min-width:120px" @click.stop />
            </template>
            <span v-else>{{ data.itemCode }}</span>
          </template>

          <template v-slot:resourceNameTemplate="{ data }">
            <template v-if="data.isNew && addResBuffer">
              <input type="text" class="form-control form-control-sm"
                v-model="addResBuffer.name"
                placeholder="名稱*" style="min-width:200px" @click.stop />
            </template>
            <template v-else-if="resEditingRowId === String(data.id) && resEditBuffer">
              <input type="text" class="form-control form-control-sm"
                v-model="resEditBuffer.name"
                placeholder="名稱*" style="min-width:200px" @click.stop />
            </template>
            <div v-else class="d-flex align-items-center gap-2" style="line-height: 1.5;">
              <i v-if="getResourceType(data)" :class="getTypeIcon(getResourceType(data))"
                :title="getTypeLabel(getResourceType(data))"></i>
              <span>{{ data.name }}</span>
            </div>
          </template>

          <template v-slot:resUnitTemplate="{ data }">
            <template v-if="data.isNew && addResBuffer">
              <input type="text" class="form-control form-control-sm text-center"
                v-model="addResBuffer.unitType"
                placeholder="單位" style="min-width:50px;max-width:70px" @click.stop />
            </template>
            <template v-else-if="resEditingRowId === String(data.id) && resEditBuffer">
              <input type="text" class="form-control form-control-sm text-center"
                v-model="resEditBuffer.unitType"
                placeholder="單位" style="min-width:50px;max-width:70px" @click.stop />
            </template>
            <span v-else>{{ data.unitType }}</span>
          </template>

          <template v-slot:resQtyTemplate="{ data }">
            <template v-if="data.isNew && addResBuffer">
              <input type="number" class="form-control form-control-sm text-end"
                v-model="addResBuffer.quantity"
                step="any" style="min-width:80px" @click.stop />
            </template>
            <template v-else-if="resEditingRowId === String(data.id) && resEditBuffer">
              <input type="number" class="form-control form-control-sm text-end"
                v-model="resEditBuffer.quantity"
                step="any" style="min-width:80px" @click.stop />
            </template>
            <span v-else>{{ formatNumber(data.quantity) }}</span>
          </template>

          <template v-slot:resPriceTemplate="{ data }">
            <template v-if="data.isNew && addResBuffer">
              <input type="number" class="form-control form-control-sm text-end"
                v-model="addResBuffer.price"
                step="any" style="min-width:90px" @click.stop />
            </template>
            <template v-else-if="resEditingRowId === String(data.id) && resEditBuffer">
              <input type="number" class="form-control form-control-sm text-end"
                v-model="resEditBuffer.price"
                step="any" style="min-width:90px" @click.stop />
            </template>
            <span v-else>{{ formatPrice(data.price) }}</span>
          </template>

          <template v-slot:resAmtTemplate="{ data }">
            <template v-if="data.isNew && addResBuffer">
              <span class="text-muted fst-italic" style="font-size:0.85rem">
                {{ formatPrice(String((Number(addResBuffer.quantity) || 0) * (parseFloat(String(addResBuffer.price)) || 0))) }}
              </span>
            </template>
            <template v-else-if="resEditingRowId === String(data.id) && resEditBuffer">
              <span class="text-muted fst-italic" style="font-size:0.85rem">
                {{ formatPrice(String((Number(resEditBuffer.quantity) || 0) * (parseFloat(String(resEditBuffer.price)) || 0))) }}
              </span>
            </template>
            <span v-else>{{ formatPrice(data.amount) }}</span>
          </template>

          <template v-slot:resActionsTemplate="{ data }">
            <div class="act-row" @click.stop>
              <template v-if="data.isNew">
                <button class="act-btn act-btn--save" :disabled="isSavingAddRes"
                  @click.stop="saveAddRes()" title="儲存">
                  <span v-if="isSavingAddRes" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="fa fa-check me-1"></i>儲存
                </button>
                <button class="act-btn act-btn--cancel" :disabled="isSavingAddRes"
                  @click.stop="cancelAddRes()">取消</button>
              </template>
              <template v-else-if="resEditingRowId === String(data.id)">
                <button class="act-btn act-btn--save" :disabled="resIsSavingEdit"
                  @click.stop="saveResEdit(data)" title="儲存">
                  <span v-if="resIsSavingEdit" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="fa fa-check me-1"></i>儲存
                </button>
                <button class="act-btn act-btn--cancel" :disabled="resIsSavingEdit"
                  @click.stop="cancelResEdit()">取消</button>
              </template>
              <template v-else>
                <span class="row-hover-btns act-group">
                  <button class="act-btn act-btn--edit"
                    :disabled="resEditingRowId != null || resIsSavingEdit || isAddingRes"
                    @click.stop="startResEdit(data)" title="編輯">
                    <i class="fa fa-pencil-alt"></i>
                  </button>
                  <button class="act-btn act-btn--del"
                    :disabled="resEditingRowId != null || resIsSavingEdit || isAddingRes"
                    @click.stop="deleteResRow(data)" title="刪除">
                    <i class="fa fa-trash"></i>
                  </button>
                  <span class="act-divider"></span>
                  <button class="act-btn act-btn--move"
                    :disabled="resEditingRowId != null || isAddingRes"
                    @click.stop="moveResRow(data, 'up')" title="上移">
                    <i class="fa fa-arrow-up"></i>
                  </button>
                  <button class="act-btn act-btn--move"
                    :disabled="resEditingRowId != null || isAddingRes"
                    @click.stop="moveResRow(data, 'down')" title="下移">
                    <i class="fa fa-arrow-down"></i>
                  </button>
                  <span class="act-divider"></span>
                  <button class="act-btn act-btn--add"
                    :disabled="resEditingRowId != null || isAddingRes"
                    @click.stop="startAddResRow(data)" title="插入此列之後">＋插入</button>
                </span>
              </template>
            </div>
          </template>
        </ejs-treegrid>
      </div>
    </div>

    <!-- Excel 匯入 Modal（AI 解析，無 PCCES XML 時的替代方案） -->
    <Modal
      :show="showExcelImportModal"
      title="匯入 Excel 標單（AI 解析）"
      icon="fa fa-file-excel"
      size="lg"
      @update:show="showExcelImportModal = $event"
      :hideConfirmButton="true"
      cancelText="取消"
    >
      <template #body>
        <div class="alert alert-info d-flex gap-2 py-2 mb-3">
          <i class="fa fa-info-circle mt-1 flex-shrink-0"></i>
          <div class="small">
            此功能適用於<strong>沒有 PCCES XML 格式</strong>的標單，由 AI 自動識別欄位與層級結構後存入。
            匯入後請確認工項資料是否正確，並視需要補填 PCCES 料碼。
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold">選擇 Excel 檔案（.xlsx / .xls）</label>
          <input
            type="file"
            class="form-control d-none"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            @change="handleExcelFileSelect"
            ref="excelFileInput"
          />
          <div
            class="pcces-import-dropzone border rounded-3 p-4 text-center user-select-none"
            :class="{
              'pcces-import-dropzone--active': excelImportDragDepth > 0,
              'pcces-import-dropzone--has-file': !!selectedExcelFile
            }"
            role="button"
            tabindex="0"
            @click="triggerExcelFileInput"
            @keydown.enter.prevent="triggerExcelFileInput"
            @keydown.space.prevent="triggerExcelFileInput"
            @dragenter.prevent="excelImportDragDepth++"
            @dragleave.prevent="excelImportDragDepth--"
            @dragover.prevent
            @drop.prevent="onExcelImportDrop"
          >
            <template v-if="selectedExcelFile">
              <i class="fa fa-check-circle pcces-import-file-check d-block mb-2" aria-hidden="true"></i>
              <span class="pcces-import-ready-badge">已選擇檔案</span>
              <div class="pcces-import-filename text-break mt-2 mb-1">
                <i class="fa fa-file-excel me-2" aria-hidden="true"></i>{{ selectedExcelFile.name }}
              </div>
              <div class="pcces-import-filemeta">{{ formatImportFileSize(selectedExcelFile.size) }}</div>
              <p class="pcces-import-replace-hint mb-0 mt-3 small">點此區域或拖放其他檔案可更換</p>
            </template>
            <template v-else>
              <i class="fa fa-file-excel fa-2x mb-2 d-block text-secondary"></i>
              <p class="mb-1 fw-medium">將 Excel 檔拖放到此處，或按一下選擇檔案</p>
              <p class="mb-0 small text-muted">支援 .xlsx / .xls 格式</p>
            </template>
          </div>
        </div>
        <p class="text-muted small mb-2">
          匯入目標：<strong>{{ selectedDesignChangeId == null ? '原契約' : '變更設計' }}</strong>（與上方目前選中的版本一致）
        </p>
        <div class="mb-3">
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="excelImportOverwrite"
              v-model="excelImportOverwrite"
            />
            <label class="form-check-label" for="excelImportOverwrite">
              覆寫該版本既有標單明細（勾選時會先刪除該版本現有資料再匯入）
            </label>
          </div>
        </div>
        <div v-if="excelImportError" class="alert alert-danger">
          <i class="fa fa-exclamation-circle me-2"></i>{{ excelImportError }}
        </div>
      </template>
      <template #footer>
        <button
          class="btn btn-outline-secondary"
          @click="showExcelImportModal = false"
          :disabled="isExcelImporting"
        >
          取消
        </button>
        <button
          class="btn btn-success"
          @click="handleExcelImport"
          :disabled="!selectedExcelFile || isExcelImporting"
        >
          <span v-if="isExcelImporting" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="fa fa-robot me-2"></i>
          {{ isExcelImporting ? 'AI 解析中，請稍候...' : 'AI 解析並匯入' }}
        </button>
      </template>
    </Modal>

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
import { ref, computed, watch, onMounted, onUnmounted, onActivated, nextTick, provide } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  importPccesFile,
  importPccesExcelFile,
  getConstructionPccesCodes,
  getConstructionPccesCostBreakdown,
  getConstructionPccesResources,
  copyPccesFromTo,
  updatePccesCodeRow,
  deletePccesCodeRow,
  updatePccesCostBreakdownRow,
  type UpdatePccesCodeRowRequest,
  type UpdatePccesCostBreakdownRequest,
  type ConstructionPccesCode,
  type ConstructionPccesCostBreakdown,
  type ConstructionPccesResource,
  type ImportPccesRequest,
  type CreatePccesCodeRequest,
  type CreatePccesCostBreakdownRequest,
  type CreatePccesResourceRequest,
  type UpdatePccesResourceRequest,
  PccesItemType,
  createPccesCodeRow,
  movePccesCodeRow,
  createPccesCostBreakdownRow,
  movePccesCostBreakdownRow,
  deletePccesCostBreakdownRow,
  createPccesResourceRow,
  updatePccesResourceRow,
  deletePccesResourceRow,
  movePccesResourceRow
} from '@/api/pcces'
import { usePccesSafetyHealthTreeGrid } from '@/composables/usePccesSafetyHealthTreeGrid'
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
      if (field === 'isSafetyHealthFacility') {
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

  // 3) DetailList：從標單明細（後端已回傳）提 M% 或 type=MATERIAL 的項目
  for (const it of items.value) {
    const code = String(it.code ?? '').trim()
    const isMCode = code.toUpperCase().startsWith('M')
    const isTypeMaterial = it.type === PccesItemType.MATERIAL

    if (isMCode) {
      // code 以 M 開頭：走 upsert（支援優先序去重）
      upsert(
        code,
        {
          name: String(it.name ?? '').trim() || code,
          unit: it.unit ?? null
        },
        'DETAIL'
      )
    } else if (isTypeMaterial) {
      // 類型設定為「材料」但 code 非 M 開頭（或無 code）：以 code 或 id 作 key，直接納入
      const key = code || `ITEM_${it.id}`
      if (!out.has(key)) {
        out.set(key, {
          code: key,
          name: String(it.name ?? '').trim() || key,
          unit: it.unit ?? null,
          refItemNo: null,
          source: 'DETAIL'
        })
      }
    }
  }

  // 2) Breakdown：從單價分析提 M% 或 type=MATERIAL 的項目
  for (const b of breakdownItems.value) {
    const code = String(b.itemCode ?? '').trim()
    const isMCode = code.toUpperCase().startsWith('M')
    const isTypeMaterial = b.type === PccesItemType.MATERIAL

    if (isMCode) {
      // 料碼以 M 開頭：走 upsert 優先序去重
      upsert(
        code,
        {
          name: String(b.name ?? '').trim() || code,
          unit: b.unitType ?? null,
          refItemNo: b.refItemNo ?? null
        },
        'BREAKDOWN'
      )
    } else if (isTypeMaterial) {
      // 類型設為「材料」但料碼非 M 開頭（或無料碼）：以 BD_{id} 作 key，直接納入
      const key = code || `BD_${b.id}`
      if (!out.has(key)) {
        out.set(key, {
          code: key,
          name: String(b.name ?? '').trim() || key,
          unit: b.unitType ?? null,
          refItemNo: b.refItemNo ?? null,
          source: 'BREAKDOWN'
        })
      }
    }
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

/** MaterialInspectionPanel 的 ref，用於外部呼叫 refresh() */
const materialPanelRef = ref<InstanceType<typeof MaterialInspectionPanel> | null>(null)

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
const resourceRows = ref<any[]>([])

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

// 匯入相關（XML）
const showImportModal = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const importOverwrite = ref(true)
const isImporting = ref(false)
const importError = ref('')
/** 拖放進入巢狀計數，避免子元素造成 dragleave 閃爍 */
const importDragDepth = ref(0)

// Excel 匯入相關（AI 解析）
const showExcelImportModal = ref(false)
const selectedExcelFile = ref<File | null>(null)
const excelFileInput = ref<HTMLInputElement | null>(null)
const excelImportOverwrite = ref(true)
const isExcelImporting = ref(false)
const excelImportError = ref('')
const excelImportDragDepth = ref(0)

// 切換全螢幕
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
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
  isSafetyHealthFacility: code.isSafetyHealthFacility === true
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

// ===== Excel 匯入（AI 解析）=====

const openExcelImportModal = () => {
  if (!constructionId.value) {
    alert('請先選擇工程項目')
    return
  }
  excelImportError.value = ''
  selectedExcelFile.value = null
  excelImportOverwrite.value = true
  excelImportDragDepth.value = 0
  if (excelFileInput.value) excelFileInput.value.value = ''
  showExcelImportModal.value = true
}

function isAcceptableExcelFile(file: File): boolean {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return true
  const t = (file.type || '').toLowerCase()
  return (
    t === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    t === 'application/vnd.ms-excel'
  )
}

function assignExcelFile(file: File | null) {
  if (!file) { selectedExcelFile.value = null; return }
  if (!isAcceptableExcelFile(file)) {
    excelImportError.value = '請選擇副檔名為 .xlsx 或 .xls 的 Excel 檔案'
    selectedExcelFile.value = null
    return
  }
  selectedExcelFile.value = file
  excelImportError.value = ''
}

function triggerExcelFileInput() {
  if (isExcelImporting.value) return
  excelFileInput.value?.click()
}

function handleExcelFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files?.length) assignExcelFile(target.files[0])
}

function onExcelImportDrop(e: DragEvent) {
  excelImportDragDepth.value = 0
  const files = e.dataTransfer?.files
  if (!files?.length) return
  assignExcelFile(files[0])
}

const handleExcelImport = async () => {
  if (!selectedExcelFile.value || !constructionId.value) {
    excelImportError.value = '請選擇檔案'
    return
  }
  isExcelImporting.value = true
  excelImportError.value = ''
  try {
    const result = await importPccesExcelFile({
      excelFile: selectedExcelFile.value,
      constructionId: constructionId.value,
      designChangeId: selectedDesignChangeId.value,
      overwrite: excelImportOverwrite.value
    })
    const targetLabel = result.designChangeId == null ? '原契約' : '變更設計'
    const bdMsg = result.totalCostBreakdown > 0 ? `\n單價分析：${result.totalCostBreakdown} 列` : ''
    const testMsg = (result.totalTestItems ?? 0) > 0 ? `\n試驗項（已同步至材料與試驗）：${result.totalTestItems} 筆` : ''
    const resMsg = result.totalResources > 0 ? `\n資源統計：${result.totalResources} 列` : ''
    alert(`Excel 標單匯入成功！\n匯入目標：${targetLabel}\n匯入工項：${result.totalCodes} 筆${bdMsg}${testMsg}${resMsg}\n\nPCCES 料碼欄位為空，請視需要手動補填。`)
    showExcelImportModal.value = false
    await loadItems()
  } catch (error: any) {
    console.error('[ExcelImport] 失敗:', error)
    excelImportError.value = error.message || 'AI 解析或匯入失敗，請確認 Excel 內容為工程標單格式後再試'
  } finally {
    isExcelImporting.value = false
  }
}

// ===== 逐行編輯（Row-level Edit）=====

interface RowEditBuffer {
  pccesCode: string
  name: string
  unitType: string
  quantity: number | string
  price: string
  type: string | null
}

/** 目前正在編輯的 row id（string，與 data.id 比對） */
const editingRowId = ref<string | null>(null)
const editBuffer = ref<RowEditBuffer | null>(null)
const isSavingEdit = ref(false)

/** 類型選項（供下拉選單用） */
const typeOptions: { value: string | null; emoji: string; label: string }[] = [
  { value: null,                      emoji: '—',  label: '不分類' },
  { value: PccesItemType.MAIN_ITEM,   emoji: '📁', label: '大項' },
  { value: PccesItemType.WORK_ITEM,   emoji: '🔨', label: '工項' },
  { value: PccesItemType.LABOUR,      emoji: '👷', label: '人工' },
  { value: PccesItemType.EQUIPMENT,   emoji: '⚙️', label: '機具' },
  { value: PccesItemType.MATERIAL,    emoji: '🧱', label: '材料' },
  { value: PccesItemType.MISC,        emoji: '🗂️', label: '雜項' },
  { value: PccesItemType.TEST_ITEM,   emoji: '🔬', label: '試驗項' }
]

function startEdit(data: any) {
  if (editingRowId.value != null) return // 另一列正在編輯中
  editingRowId.value = String(data.id)
  editBuffer.value = {
    pccesCode: data.code ?? '',
    name: data.name ?? '',
    unitType: data.unit ?? '',
    quantity: data.quantity ?? 0,
    price: data.price ?? '0',
    type: data.type ?? null
  }
}

function cancelEdit() {
  editingRowId.value = null
  editBuffer.value = null
}

async function saveEdit(data: any) {
  if (!editBuffer.value || editingRowId.value !== String(data.id)) return
  isSavingEdit.value = true
  try {
    const quantity = Number(editBuffer.value.quantity) || 0
    const price = parseFloat(String(editBuffer.value.price)) || 0
    const amount = (quantity * price).toFixed(2)
    const body: UpdatePccesCodeRowRequest = {
      pccesCode: editBuffer.value.pccesCode.trim() || null,
      name: editBuffer.value.name.trim(),
      unitType: editBuffer.value.unitType.trim(),
      quantity,
      price,
      amount,
      type: editBuffer.value.type || null
    }
    await updatePccesCodeRow(constructionId.value, parseInt(String(data.id), 10), body)
    editingRowId.value = null
    editBuffer.value = null
    withScrollPreserved('detail')
    await loadItems()
  } catch (e: any) {
    alert('儲存失敗：' + (e.message || '未知錯誤'))
  } finally {
    isSavingEdit.value = false
  }
}

async function deleteItem(data: any) {
  const hasChildren = Array.isArray(data.children) && data.children.length > 0
  const confirmMsg = hasChildren
    ? `此操作將刪除「${data.name}」及其底下所有子工項，確定繼續？`
    : `確定刪除工項「${data.name}」？`
  if (!confirm(confirmMsg)) return
  isSavingEdit.value = true
  try {
    await deletePccesCodeRow(constructionId.value, parseInt(String(data.id), 10))
    if (editingRowId.value === String(data.id)) {
      editingRowId.value = null
      editBuffer.value = null
    }
    withScrollPreserved('detail')
    await loadItems()
  } catch (e: any) {
    alert('刪除失敗：' + (e.message || '未知錯誤'))
  } finally {
    isSavingEdit.value = false
  }
}

// ===== 單價分析逐行編輯（Breakdown Row-level Edit）=====

interface BdRowEditBuffer {
  itemCode: string
  name: string
  unitType: string
  quantity: number | string
  price: string
  type: string | null
}

const bdEditingRowId = ref<string | null>(null)
const bdEditBuffer = ref<BdRowEditBuffer | null>(null)
const bdIsSavingEdit = ref(false)

function startBdEdit(data: any) {
  if (bdEditingRowId.value != null) return
  bdEditingRowId.value = String(data.id)
  bdEditBuffer.value = {
    itemCode: data.itemCode ?? '',
    name: data.name ?? '',
    unitType: data.unit ?? '',
    quantity: data.quantity ?? 0,
    price: data.price ?? '0',
    type: data.type ?? null
  }
}

function cancelBdEdit() {
  bdEditingRowId.value = null
  bdEditBuffer.value = null
}

async function saveBdEdit(data: any) {
  if (!bdEditBuffer.value || bdEditingRowId.value !== String(data.id)) return
  bdIsSavingEdit.value = true
  try {
    const quantity = Number(bdEditBuffer.value.quantity) || 0
    const price = parseFloat(String(bdEditBuffer.value.price)) || 0
    const amount = (quantity * price).toFixed(2)
    const body: UpdatePccesCostBreakdownRequest = {
      name: bdEditBuffer.value.name.trim(),
      itemCode: bdEditBuffer.value.itemCode.trim() || null,
      unitType: bdEditBuffer.value.unitType.trim(),
      quantity,
      price,
      amount,
      type: bdEditBuffer.value.type || null
    }
    await updatePccesCostBreakdownRow(constructionId.value, parseInt(String(data.id), 10), body)
    bdEditingRowId.value = null
    bdEditBuffer.value = null
    withScrollPreserved('breakdown')
    await loadItems()
  } catch (e: any) {
    alert('儲存失敗：' + (e.message || '未知錯誤'))
  } finally {
    bdIsSavingEdit.value = false
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
    [PccesItemType.WORK_ITEM]: 'fa fa-hammer text-danger',
    [PccesItemType.TEST_ITEM]: 'fa fa-flask text-purple'
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
    [PccesItemType.WORK_ITEM]: '工項',
    [PccesItemType.TEST_ITEM]: '試驗項'
  }
  
  return labelMap[type] || ''
}

// 更新 TreeGrid 資料（不再額外過濾，僅依照原始 items，搜尋改由 TreeGrid 內建篩選處理）
const updateTreeGridData = () => {
  treeGridData.value = buildTreeData(items.value)
}

// ── 新增 / 排序 邏輯 ──────────────────────────────────────────────────────────

const NEW_ROW_ID = '__NEW__'

/** 插入臨時節點到樹中（after=false 則作為 asChild），觸發 Syncfusion 重繪 */
function insertTempNode(
  dataRef: typeof treeGridData | typeof breakdownTreeGridData,
  afterId: string | null,
  asChild: boolean,
  tempNode: any
) {
  const arr = dataRef.value

  const insertInto = (nodes: any[]): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (String(nodes[i].id) === afterId) {
        if (asChild) {
          if (!nodes[i].children) nodes[i].children = []
          nodes[i].children.unshift(tempNode)
        } else {
          nodes.splice(i + 1, 0, tempNode)
        }
        return true
      }
      if (nodes[i].children?.length && insertInto(nodes[i].children)) return true
    }
    return false
  }

  if (afterId === null) {
    // 根層級末尾
    arr.push(tempNode)
  } else {
    insertInto(arr)
  }
  // 建立新陣列參考以觸發 Syncfusion rebind
  dataRef.value = [...arr]
}

/** 從樹中移除臨時節點 */
function removeTempNode(dataRef: typeof treeGridData | typeof breakdownTreeGridData) {
  const remove = (nodes: any[]): boolean => {
    const idx = nodes.findIndex(n => n.id === NEW_ROW_ID)
    if (idx !== -1) { nodes.splice(idx, 1); return true }
    for (const n of nodes) {
      if (n.children?.length && remove(n.children)) return true
    }
    return false
  }
  remove(dataRef.value)
  dataRef.value = [...dataRef.value]
}

// ── 標單明細：新增列 ────────────────────────────────────────────────────────

interface AddDetailBuffer { pccesCode: string; name: string; unitType: string; quantity: number; price: number; type: string | null }
const isAddingDetail = ref(false)
const addDetailBuffer = ref<AddDetailBuffer | null>(null)
const isSavingAddDetail = ref(false)
let _addDetailParentId: number | null = null
let _addDetailAfterId: number | null = null

function _startAddDetail(afterData: any | null, asChild: boolean) {
  if (isAddingDetail.value || editingRowId.value) return
  _addDetailParentId = asChild
    ? (afterData ? parseInt(String(afterData.id)) : null)
    : (afterData ? (afterData.parentId ?? null) : null)
  _addDetailAfterId = (afterData && !asChild) ? parseInt(String(afterData.id)) : null
  addDetailBuffer.value = { pccesCode: '', name: '', unitType: '', quantity: 0, price: 0, type: null }
  isAddingDetail.value = true
  const tempNode = {
    id: NEW_ROW_ID, isNew: true,
    itemNo: '', code: '', name: '（新增中）', unit: '', quantity: 0, price: '0', amount: '0',
    type: null, orderNumber: 0, isSafetyHealthFacility: false, diffAll: false, diff: {}
  }
  insertTempNode(treeGridData, afterData ? String(afterData.id) : null, asChild, tempNode)
}

function startAddDetailRoot() { _startAddDetail(null, false) }
function startAddDetailSibling(data: any) { _startAddDetail(data, false) }
function startAddDetailChild(data: any) { _startAddDetail(data, true) }

function cancelAddDetail() {
  removeTempNode(treeGridData)
  isAddingDetail.value = false
  addDetailBuffer.value = null
}

async function saveAddDetail() {
  if (!addDetailBuffer.value || !constructionId.value) return
  isSavingAddDetail.value = true
  try {
    const qty = Number(addDetailBuffer.value.quantity) || 0
    const price = parseFloat(String(addDetailBuffer.value.price)) || 0
    const body: CreatePccesCodeRequest = {
      pccesCode: addDetailBuffer.value.pccesCode.trim() || null,
      name: addDetailBuffer.value.name.trim() || '(未命名)',
      unitType: addDetailBuffer.value.unitType.trim(),
      quantity: qty,
      price,
      amount: qty * price,
      type: addDetailBuffer.value.type || null,
      parentId: _addDetailParentId,
      insertAfterId: _addDetailAfterId
    }
    await createPccesCodeRow(constructionId.value, selectedDesignChangeId.value, body)
    removeTempNode(treeGridData)
    isAddingDetail.value = false
    addDetailBuffer.value = null
    await loadItems()
  } catch (e: any) {
    alert('新增失敗：' + (e.message || '未知錯誤'))
  } finally {
    isSavingAddDetail.value = false
  }
}

async function moveDetailRow(data: any, direction: 'up' | 'down') {
  if (!constructionId.value || data.id === NEW_ROW_ID) return
  try {
    await movePccesCodeRow(constructionId.value, parseInt(String(data.id)), direction)
    await loadItems()
  } catch (e: any) {
    alert('排序失敗：' + (e.message || '未知錯誤'))
  }
}

// ── 單價分析：新增列 ────────────────────────────────────────────────────────

interface AddBdBuffer { itemCode: string; name: string; unitType: string; quantity: number; price: number; type: string | null }
const isAddingBd = ref(false)
const addBdBuffer = ref<AddBdBuffer | null>(null)
const isSavingAddBd = ref(false)
let _addBdParentId: number | null = null
let _addBdAfterId: number | null = null

function _startAddBd(afterData: any | null, asChild: boolean) {
  if (isAddingBd.value || bdEditingRowId.value) return
  _addBdParentId = asChild
    ? (afterData ? parseInt(String(afterData.id)) : null)
    : (afterData ? (afterData.parentId ?? null) : null)
  _addBdAfterId = (afterData && !asChild) ? parseInt(String(afterData.id)) : null
  addBdBuffer.value = { itemCode: '', name: '', unitType: '', quantity: 0, price: 0, type: null }
  isAddingBd.value = true
  const tempNode = {
    id: NEW_ROW_ID, isNew: true,
    refItemNo: '', itemCode: '', name: '（新增中）', unit: '', quantity: 0, price: '0', amount: '0',
    type: null, itemKind: '', percent: '', labourRatio: '', equipmentRatio: '', materialRatio: '', miscellaneaRatio: '', isMaterial: false
  }
  insertTempNode(breakdownTreeGridData, afterData ? String(afterData.id) : null, asChild, tempNode)
}

function startAddBdRoot() { _startAddBd(null, false) }
function startAddBdSibling(data: any) { _startAddBd(data, false) }
function startAddBdChild(data: any) { _startAddBd(data, true) }

function cancelAddBd() {
  removeTempNode(breakdownTreeGridData)
  isAddingBd.value = false
  addBdBuffer.value = null
}

async function saveAddBd() {
  if (!addBdBuffer.value || !constructionId.value) return
  isSavingAddBd.value = true
  try {
    const qty = Number(addBdBuffer.value.quantity) || 0
    const price = parseFloat(String(addBdBuffer.value.price)) || 0
    const body: CreatePccesCostBreakdownRequest = {
      name: addBdBuffer.value.name.trim() || '(未命名)',
      itemCode: addBdBuffer.value.itemCode.trim() || null,
      unitType: addBdBuffer.value.unitType.trim(),
      quantity: qty,
      price,
      amount: qty * price,
      type: addBdBuffer.value.type || null,
      refItemNo: null,
      parentId: _addBdParentId,
      insertAfterId: _addBdAfterId
    }
    await createPccesCostBreakdownRow(constructionId.value, selectedDesignChangeId.value, body)
    removeTempNode(breakdownTreeGridData)
    isAddingBd.value = false
    addBdBuffer.value = null
    await loadItems()
  } catch (e: any) {
    alert('新增失敗：' + (e.message || '未知錯誤'))
  } finally {
    isSavingAddBd.value = false
  }
}

async function moveBdRow(data: any, direction: 'up' | 'down') {
  if (!constructionId.value || data.id === NEW_ROW_ID) return
  try {
    await movePccesCostBreakdownRow(constructionId.value, parseInt(String(data.id)), direction)
    await loadItems()
  } catch (e: any) {
    alert('排序失敗：' + (e.message || '未知錯誤'))
  }
}

async function deleteBdRow(data: any) {
  if (!constructionId.value || data.id === NEW_ROW_ID) return
  if (!confirm(`確定刪除「${data.name || data.itemCode || '此列'}」？\n（含其所有子項）`)) return
  try {
    await deletePccesCostBreakdownRow(constructionId.value, parseInt(String(data.id)))
    await loadItems()
  } catch (e: any) {
    alert('刪除失敗：' + (e.message || '未知錯誤'))
  }
}

// ── 資源統計：新增 / 編輯 / 刪除 / 排序 ────────────────────────────────────

interface ResEditBuffer { itemCode: string; name: string; unitType: string; quantity: number; price: number }
const resEditingRowId = ref<string | null>(null)
const resEditBuffer = ref<ResEditBuffer | null>(null)
const resIsSavingEdit = ref(false)
const isAddingRes = ref(false)
const addResBuffer = ref<ResEditBuffer | null>(null)
const isSavingAddRes = ref(false)
let _addResAfterId: number | null = null

function startResEdit(data: any) {
  if (resEditingRowId.value != null) return
  resEditingRowId.value = String(data.id)
  resEditBuffer.value = {
    itemCode: data.itemCode ?? '',
    name: data.name ?? '',
    unitType: data.unitType ?? '',
    quantity: data.quantity ?? 0,
    price: parseFloat(String(data.price)) || 0
  }
}
function cancelResEdit() { resEditingRowId.value = null; resEditBuffer.value = null }

async function saveResEdit(data: any) {
  if (!resEditBuffer.value || !constructionId.value) return
  resIsSavingEdit.value = true
  try {
    const qty = Number(resEditBuffer.value.quantity) || 0
    const price = parseFloat(String(resEditBuffer.value.price)) || 0
    const body: UpdatePccesResourceRequest = {
      itemCode: resEditBuffer.value.itemCode.trim() || null,
      name: resEditBuffer.value.name.trim() || '(未命名)',
      unitType: resEditBuffer.value.unitType.trim(),
      quantity: qty, price, amount: qty * price
    }
    await updatePccesResourceRow(constructionId.value, parseInt(String(data.id)), body)
    resEditingRowId.value = null; resEditBuffer.value = null
    await loadItems()
  } catch (e: any) {
    alert('儲存失敗：' + (e.message || '未知錯誤'))
  } finally { resIsSavingEdit.value = false }
}

async function deleteResRow(data: any) {
  if (!confirm(`確定刪除「${data.name}」？`)) return
  resIsSavingEdit.value = true
  try {
    await deletePccesResourceRow(constructionId.value, parseInt(String(data.id)))
    await loadItems()
  } catch (e: any) {
    alert('刪除失敗：' + (e.message || '未知錯誤'))
  } finally { resIsSavingEdit.value = false }
}

function startAddResRow(afterData: any | null) {
  if (isAddingRes.value || resEditingRowId.value) return
  _addResAfterId = afterData ? parseInt(String(afterData.id)) : null
  addResBuffer.value = { itemCode: '', name: '', unitType: '', quantity: 0, price: 0 }
  isAddingRes.value = true
  const tempNode = {
    id: NEW_ROW_ID, isNew: true,
    orderNumber: null, itemCode: '', name: '（新增中）', unitType: '', quantity: 0, price: '0', amount: '0'
  }
  if (afterData) {
    const idx = resourceRows.value.findIndex(r => String((r as any).id) === String(afterData.id))
    resourceRows.value = [
      ...resourceRows.value.slice(0, idx + 1),
      tempNode as any,
      ...resourceRows.value.slice(idx + 1)
    ]
  } else {
    resourceRows.value = [...resourceRows.value, tempNode as any]
  }
}

function cancelAddRes() {
  resourceRows.value = resourceRows.value.filter((r: any) => r.id !== NEW_ROW_ID)
  isAddingRes.value = false; addResBuffer.value = null
}

async function saveAddRes() {
  if (!addResBuffer.value || !constructionId.value) return
  isSavingAddRes.value = true
  try {
    const qty = Number(addResBuffer.value.quantity) || 0
    const price = parseFloat(String(addResBuffer.value.price)) || 0
    const body: CreatePccesResourceRequest = {
      itemCode: addResBuffer.value.itemCode.trim() || null,
      name: addResBuffer.value.name.trim() || '(未命名)',
      unitType: addResBuffer.value.unitType.trim(),
      quantity: qty, price, amount: qty * price,
      insertAfterId: _addResAfterId
    }
    await createPccesResourceRow(constructionId.value, selectedDesignChangeId.value, body)
    cancelAddRes()
    await loadItems()
  } catch (e: any) {
    alert('新增失敗：' + (e.message || '未知錯誤'))
  } finally { isSavingAddRes.value = false }
}

async function moveResRow(data: any, direction: 'up' | 'down') {
  if (!constructionId.value || data.id === NEW_ROW_ID) return
  try {
    await movePccesResourceRow(constructionId.value, parseInt(String(data.id)), direction)
    await loadItems()
  } catch (e: any) {
    alert('排序失敗：' + (e.message || '未知錯誤'))
  }
}

// ── 就地更新樹節點（避免整個 dataSource 替換導致滾輪重置）─────────────────
/**
 * 遞迴在樹狀陣列中找到 id 相符的節點並就地 patch 其屬性。
 * 直接 mutate 節點物件，不替換陣列參考，Syncfusion 不會全量重繪。
 */
function updateNodeInTree(nodes: any[], id: string, fields: Record<string, any>): boolean {
  for (const node of nodes) {
    if (String(node.id) === id) {
      Object.assign(node, fields)
      return true
    }
    if (node.children?.length && updateNodeInTree(node.children, id, fields)) return true
  }
  return false
}

// ── 滾輪位置保留機制（供刪除等仍需 loadItems 的操作）──────────────────────
// Syncfusion TreeGrid 在 dataBound 事件後才完成渲染，此時才能安全還原 scrollTop。
// 在呼叫 loadItems() 前把目前 scrollTop 存入 pendingXxxScroll，
// dataBound handler 讀到後還原並清除，確保只生效一次。
// 注意：元素取得須使用 Vue 元件的 $el（而非不存在的 .element 屬性）。

let pendingDetailScroll: number | null = null
let pendingBreakdownScroll: number | null = null

function getGridContentEl(gridRef: any): HTMLElement | null {
  // Syncfusion Vue 元件的根 DOM 元素透過 $el 取得，再往下找捲動容器
  return (gridRef?.$el ?? gridRef?.ej2Instances?.element)?.querySelector('.e-content') as HTMLElement | null
}

function onDetailGridDataBound() {
  if (pendingDetailScroll === null) return
  const scroll = pendingDetailScroll
  pendingDetailScroll = null
  // dataBound 後 Syncfusion 可能還有少量 layout 計算，
  // 用 nextTick + setTimeout(0) 雙層緩衝確保在所有後續操作完成後才還原
  nextTick(() => setTimeout(() => {
    const el = getGridContentEl(treegrid.value)
    if (el) el.scrollTop = scroll
  }, 0))
}

function onBreakdownGridDataBound() {
  if (pendingBreakdownScroll === null) return
  const scroll = pendingBreakdownScroll
  pendingBreakdownScroll = null
  nextTick(() => setTimeout(() => {
    const el = getGridContentEl(breakdownTreegrid.value)
    if (el) el.scrollTop = scroll
  }, 0))
}

/**
 * 在 loadItems() 前記下目前的 scrollTop，讓 dataBound handler 在 Syncfusion
 * 完成渲染後自動還原，避免滾輪被重置到頂部。
 */
function withScrollPreserved(
  target: 'detail' | 'breakdown'
): void {
  if (target === 'detail') {
    const el = getGridContentEl(treegrid.value)
    pendingDetailScroll = el?.scrollTop ?? null
  } else {
    const el = getGridContentEl(breakdownTreegrid.value)
    pendingBreakdownScroll = el?.scrollTop ?? null
  }
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
// 注入 TreeGrid row hover 全域樣式（CSS 方式無法穿透 Syncfusion + scoped 雙重邊界）
const HOVER_STYLE_ID = 'pcces-treegrid-row-hover'
function injectRowHoverStyle() {
  if (document.getElementById(HOVER_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = HOVER_STYLE_ID
  el.textContent = [
    '.e-grid.e-gridhover .e-row tr:not(.e-disable-gridhover):not(.e-editedrow):not(.e-detailrow):hover .e-rowcell:not(.e-cellselectionbackground):not(.e-active):not(.e-updatedtd):not(.e-indentcell),',
    '.e-grid.e-gridhover:not(.e-rowdrag) .e-row:not(.e-disable-gridhover):not(.e-editedrow):not(.e-detailrow):hover .e-rowcell:not(.e-cellselectionbackground):not(.e-active):not(.e-updatedtd):not(.e-indentcell) {',
    '  background-color: #1e3a5c !important;',
    '}'
  ].join('\n')
  document.head.appendChild(el)
}

onMounted(async () => {
  injectRowHoverStyle()
  if (constructionId.value) {
    await fetchDesignChangeList()
    await loadItems()
  }
})

onUnmounted(() => {
  document.getElementById(HOVER_STYLE_ID)?.remove()
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
  /* 填滿 .app-content 的可用高度，內部用 flex column 分配空間 */
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1rem;
  box-sizing: border-box;
}

/* 極小按鈕（操作欄用） */
.btn-xs {
  padding: 0.1rem 0.4rem;
  font-size: 0.75rem;
  line-height: 1.4;
  border-radius: 0.2rem;
}

/* 工具列：分頁與操作同一列，底邊與表格外框銜接 */
.pcces-toolbar-row {
  flex-shrink: 0;  /* 固定高度，不參與 flex 伸縮 */
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

/* 試驗項類型圖示色（紫色） */
.text-purple {
  color: #a855f7;
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
  /* flex: 1 + min-height: 0 讓此區塊填滿頁面剩餘高度 */
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  overflow: visible;
  background-color: #0f172a;
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
    min-height: 400px;  /* 手機版給個底限，但仍用 flex: 1 填滿 */
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

/* ── 操作欄位容器 ── */
.act-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.act-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* 預設隱藏，row hover 時顯示 */
.row-hover-btns {
  opacity: 0;
  transition: opacity 0.15s;
}
.e-row:hover .row-hover-btns,
.e-row.e-altrow:hover .row-hover-btns,
.e-row.e-focus .row-hover-btns {
  opacity: 1;
}

/* 細分隔線 */
.act-divider {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: #cbd5e1;
  margin: 0 2px;
  flex-shrink: 0;
}

/* ── 按鈕基底（暗色主題） ── */
.act-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 7px;
  border: none;
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.act-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 編輯 — 藍 */
.act-btn--edit {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
}
.act-btn--edit:not(:disabled):hover {
  background: rgba(96, 165, 250, 0.28);
  color: #93c5fd;
}

/* 刪除 — 紅 */
.act-btn--del {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}
.act-btn--del:not(:disabled):hover {
  background: rgba(248, 113, 113, 0.28);
  color: #fca5a5;
}

/* 移動 — 灰 */
.act-btn--move {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}
.act-btn--move:not(:disabled):hover {
  background: rgba(148, 163, 184, 0.24);
  color: #cbd5e1;
}

/* 新增 — 綠 */
.act-btn--add {
  background: rgba(74, 222, 128, 0.13);
  color: #4ade80;
}
.act-btn--add:not(:disabled):hover {
  background: rgba(74, 222, 128, 0.25);
  color: #86efac;
}

/* 儲存 — 實心綠 */
.act-btn--save {
  background: #16a34a;
  color: #fff;
  padding: 0 10px;
  font-weight: 600;
}
.act-btn--save:not(:disabled):hover { background: #15803d; }

/* 取消 — 實心深灰 */
.act-btn--cancel {
  background: rgba(148, 163, 184, 0.18);
  color: #94a3b8;
  padding: 0 10px;
  font-weight: 500;
}
.act-btn--cancel:not(:disabled):hover {
  background: rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
}

</style>

<!-- 全域 CSS：覆蓋 Syncfusion TreeGrid row hover（JS 注入為主，此為備用） -->
<style>
.e-grid.e-gridhover .e-row tr:not(.e-disable-gridhover):not(.e-editedrow):not(.e-detailrow):hover .e-rowcell:not(.e-cellselectionbackground):not(.e-active):not(.e-updatedtd):not(.e-indentcell),
.e-grid.e-gridhover:not(.e-rowdrag) .e-row:not(.e-disable-gridhover):not(.e-editedrow):not(.e-detailrow):hover .e-rowcell:not(.e-cellselectionbackground):not(.e-active):not(.e-updatedtd):not(.e-indentcell) {
  background-color: #1e3a5c !important;
}
</style>
