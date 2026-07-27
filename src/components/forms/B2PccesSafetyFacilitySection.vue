<template>
  <div class="section-card b2-pcces-safety-section">
    <button
      type="button"
      class="section-card__header"
      @click="expanded = !expanded"
      :aria-expanded="expanded ? 'true' : 'false'"
    >
      <div class="section-card__header-left">
        <div class="section-icon section-icon--warning">
          <i class="fa fa-hard-hat"></i>
        </div>
        <div class="section-title-wrap">
          <div class="section-title">安全衛生設施標示（工程項目標單）</div>
          <div class="section-subtitle">
            與目前變更設計版本一致；勾選項目將列入專門列表供匯出使用
          </div>
        </div>
      </div>
      <div class="section-card__header-right">
        <span v-if="!loading && !loadError" class="count-badge count-badge--muted">
          {{ itemCount }} 筆
        </span>
        <i class="fa chevron" :class="expanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </div>
    </button>

    <div v-show="expanded" class="section-card__body">
      <div class="section-surface b2-pcces-safety-surface">
        <div class="b2-pcces-hints mb-2">
          <div class="alert alert-info py-1 px-2 small mb-1 mb-md-2">
            <i class="fa fa-info-circle me-2"></i>
            <strong>說明：</strong>請在「工程項目標單」將屬於安全衛生設施的工項勾選為「安全衛生設施」。
            已勾選的項目會被<strong>分類到專門列表</strong>，後續 Word 匯出時可獨立呈現此類工項。
          </div>
          <div class="alert alert-secondary py-1 px-2 small mb-0">
            <i class="fa fa-list-ul me-2"></i>
            下方以與標單頁相同的樹狀表呈現（不顯示單價、金額）；可在此勾選，或點「開啟工程項目標單」前往完整編輯。
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="loading || !constructionId"
            @click="loadItems"
          >
            <i class="fa fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
            <span class="ms-1">重新整理</span>
          </button>
          <button type="button" class="btn btn-sm btn-outline-light" @click="goToProjectItemDatabase">
            <i class="fa fa-external-link-alt me-1"></i>開啟工程項目標單
          </button>
        </div>

        <div v-if="loading" class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入標單中…
        </div>
        <div v-else-if="loadError" class="alert alert-warning py-2 small">
          {{ loadError }}
        </div>
        <div v-else-if="itemCount === 0" class="text-warning small py-2">
          <i class="fa fa-exclamation-circle me-2"></i>
          目前版本尚無工程項目標單資料，請先至「工程項目標單」匯入 PCCES。
        </div>
        <div v-else class="b2-pcces-tree-wrap">
          <ejs-treegrid
            ref="treegrid"
            :dataSource="treeGridData"
            :allowPaging="false"
            :allowSorting="true"
            :allowFiltering="true"
            :allowResizing="true"
            :allowReordering="false"
            :allowSelection="false"
            :treeColumnIndex="2"
            :childMapping="'children'"
            :rowHeight="30"
            height="360"
            locale="zh"
            :enableHover="true"
          >
            <e-columns>
              <e-column
                field="itemNo"
                headerText="項次"
                width="110"
                textAlign="Left"
                :sortComparer="itemNoSortComparer"
                :template="'itemNoTemplate'"
              />
              <e-column field="code" headerText="工項代碼" width="130" textAlign="Left" :template="'codeTemplate'" />
              <e-column field="name" headerText="工項名稱" width="260" textAlign="Left" :template="'nameTemplate'" />
              <e-column field="unit" headerText="單位" width="80" textAlign="Center" :template="'unitTemplate'" />
              <e-column
                field="isSafetyHealthFacility"
                headerText="安全衛生設施"
                width="120"
                textAlign="Center"
                :template="'safetyHealthTemplate'"
              />
              <e-column field="quantity" headerText="總量" width="100" textAlign="Right" :template="'quantityTemplate'" />
            </e-columns>

            <template v-slot:itemNoTemplate="{ data }">
              <span>{{ data.itemNo }}</span>
            </template>
            <template v-slot:codeTemplate="{ data }">
              <span>{{ data.code }}</span>
            </template>
            <template v-slot:nameTemplate="{ data }">
              <div class="b2-pcces-name-cell">
                <i v-if="data.type" :class="getTypeIcon(data.type)" :title="getTypeLabel(data.type)"></i>
                <span class="b2-pcces-name-text">{{ data.name }}</span>
              </div>
            </template>
            <template v-slot:unitTemplate="{ data }">
              <span>{{ data.unit }}</span>
            </template>
            <template v-slot:safetyHealthTemplate="{ data }">
              <div class="d-flex align-items-center justify-content-center px-1" @click.stop>
                <!-- 父層：三態用 :checked + :indeterminate，並依 safetyUiVersion 強制重繪（列資料非響應式） -->
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
                <!-- 葉節點：單筆寫入 -->
                <template v-else>
                  <input
                    :key="`pcces-safety-leaf-${safetyUiVersion}-${data.id}`"
                    type="checkbox"
                    class="form-check-input m-0"
                    :checked="isSafetyChecked(data)"
                    :disabled="savingSafetyId === data.id || savingSafetyBatch"
                    title="勾選後此工項將列入安全衛生設施專門列表"
                    @change="onSafetyHealthChange(data, $event)"
                  />
                </template>
              </div>
            </template>
            <template v-slot:quantityTemplate="{ data }">
              <span>{{ formatNumber(data.quantity) }}</span>
            </template>
          </ejs-treegrid>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide } from 'vue'
import { useRouter } from 'vue-router'
import { getConstructionPccesCodes, type ConstructionPccesCode, PccesItemType } from '@/api/pcces'
import { usePccesSafetyHealthTreeGrid } from '@/composables/usePccesSafetyHealthTreeGrid'
import { useViewPerspective } from '@/composables/useViewPerspective'
import {
  TreeGridComponent as EjsTreegrid,
  ColumnsDirective as EColumns,
  ColumnDirective as EColumn,
  Sort,
  Resize,
  Filter
} from '@syncfusion/ej2-vue-treegrid'
import type { TreeGridComponent } from '@syncfusion/ej2-vue-treegrid'

const props = defineProps<{
  constructionId: string
  designChangeId: number | null
}>()

interface ProjectItem {
  id: string
  code: string
  name: string
  unit: string
  quantity: number
  price: string
  amount: string
  itemNo: string | null
  parentId: number | null
  type: string | null
  isSafetyHealthFacility: boolean
}

const router = useRouter()
const { viewType } = useViewPerspective()

const expanded = ref(true)
const loading = ref(false)
const loadError = ref('')
const items = ref<ProjectItem[]>([])
const treeGridData = ref<any[]>([])
const treegrid = ref<TreeGridComponent | null>(null)

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
  getConstructionId: () => props.constructionId,
  getDesignChangeId: () => props.designChangeId
})

const itemCount = computed(() => items.value.length)

const chineseNumbers: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  壹: 1,
  貳: 2,
  參: 3,
  肆: 4,
  伍: 5,
  陸: 6,
  柒: 7,
  捌: 8,
  玖: 9,
  拾: 10,
  百: 100,
  佰: 100,
  千: 1000,
  仟: 1000
}

const chineseToNumber = (str: string): number | null => {
  if (!str) return null
  const num = parseInt(str, 10)
  if (!isNaN(num)) return num
  let result = 0
  let temp = 0
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    const value = chineseNumbers[char]
    if (value === undefined) {
      const numPart = parseInt(str.substring(i), 10)
      if (!isNaN(numPart)) return temp + numPart
      return null
    }
    if (value < 10) temp = value
    else if (value === 10) {
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

const parseItemNo = (itemNo: string | null): number[] => {
  if (!itemNo) return [0]
  const parts = itemNo.split('.')
  return parts.map((part) => {
    const num = parseInt(part, 10)
    if (!isNaN(num)) return num
    const chineseNum = chineseToNumber(part)
    if (chineseNum !== null) return chineseNum
    return part.charCodeAt(0)
  })
}

const itemNoSortComparer = (x: any, y: any): number => {
  const itemNoX = x.itemNo || ''
  const itemNoY = y.itemNo || ''
  if (!itemNoX && !itemNoY) return 0
  if (!itemNoX) return 1
  if (!itemNoY) return -1
  const partsX = parseItemNo(itemNoX)
  const partsY = parseItemNo(itemNoY)
  const maxLength = Math.max(partsX.length, partsY.length)
  for (let i = 0; i < maxLength; i++) {
    const partX = partsX[i] ?? 0
    const partY = partsY[i] ?? 0
    if (partX < partY) return -1
    if (partX > partY) return 1
  }
  return 0
}

function buildTreeData(flat: ProjectItem[]): any[] {
  const childrenMap = new Map<string, ProjectItem[]>()
  const rootItems: ProjectItem[] = []
  flat.forEach((item) => {
    if (!item.parentId) rootItems.push(item)
    else {
      const pid = item.parentId.toString()
      if (!childrenMap.has(pid)) childrenMap.set(pid, [])
      childrenMap.get(pid)!.push(item)
    }
  })
  const buildNode = (item: ProjectItem): any => {
    const node: any = {
      id: item.id,
      itemNo: item.itemNo || '',
      code: item.code || '',
      name: item.name || '',
      unit: item.unit || '',
      quantity: item.quantity,
      isSafetyHealthFacility: item.isSafetyHealthFacility === true,
      type: item.type
    }
    if (childrenMap.has(item.id)) {
      const children = childrenMap.get(item.id)!
      children.sort((a, b) => {
        if (a.itemNo && b.itemNo) return itemNoSortComparer(a, b)
        return a.id.localeCompare(b.id)
      })
      node.children = children.map((c) => buildNode(c))
    }
    return node
  }
  rootItems.sort((a, b) => {
    if (a.itemNo && b.itemNo) return itemNoSortComparer(a, b)
    return a.id.localeCompare(b.id)
  })
  return rootItems.map((r) => buildNode(r))
}

function updateTreeGridData() {
  treeGridData.value = buildTreeData(items.value)
}

const convertToProjectItem = (code: ConstructionPccesCode): ProjectItem => ({
  id: code.id.toString(),
  code: code.pccesCode || '',
  name: code.name,
  unit: code.unitType,
  quantity: code.quantity,
  price: code.price,
  amount: code.amount,
  itemNo: code.itemNo,
  parentId: code.parentId,
  type: code.type,
  isSafetyHealthFacility: code.isSafetyHealthFacility === true
})

function formatNumber(value: number | string): string {
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? '—' : num.toLocaleString('zh-TW')
  }
  return value.toLocaleString('zh-TW')
}

function getTypeIcon(type: string | null): string {
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

function getTypeLabel(type: string | null): string {
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

async function loadItems() {
  if (!props.constructionId) {
    items.value = []
    treeGridData.value = []
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const data = await getConstructionPccesCodes(props.constructionId, props.designChangeId)
    items.value = data.map(convertToProjectItem)
    updateTreeGridData()
  } catch (e: any) {
    items.value = []
    treeGridData.value = []
    loadError.value = e?.response?.data?.message ?? e?.message ?? '載入標單失敗'
  } finally {
    loading.value = false
  }
}

function goToProjectItemDatabase() {
  const vt = viewType.value?.toLowerCase()
  if (vt === 'contractor' || vt === 'supervisory') {
    return router.push(`/${vt}/basic/project-item-database`)
  }
  router.push('/basic/project-item-database')
}

watch(
  () => [props.constructionId, props.designChangeId] as const,
  () => {
    void loadItems()
  },
  { immediate: true }
)
</script>

<style scoped>
/* 與 B-2 工程圖片區塊 section-card 一致 */
.section-card {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.85rem;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.085), rgba(0, 0, 0, 0.16));
  box-shadow: 0 22px 56px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.34) inset;
}

.section-card__header {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(0, 0, 0, 0.05));
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  text-align: left;
  color: inherit;
}

.section-card__header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon--warning {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.section-title-wrap {
  min-width: 0;
}

.section-title {
  font-weight: 700;
  font-size: 1rem;
}

.section-subtitle {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 0.15rem;
}

.section-card__header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.count-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.count-badge--muted {
  background: rgba(15, 23, 42, 0.5);
  color: rgba(255, 255, 255, 0.85);
}

.chevron {
  opacity: 0.85;
}

.section-card__body {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.section-surface {
  padding: 1rem 1.1rem 1.15rem;
}

.b2-pcces-tree-wrap {
  border: 1px solid #475569;
  border-radius: 0.375rem;
  overflow: hidden;
  min-height: 200px;
  background-color: #0f172a;
}

:deep(.e-treegrid) {
  background-color: #0f172a !important;
}

:deep(.e-treegrid .e-gridcontent),
:deep(.e-treegrid .e-gridheader),
:deep(.e-treegrid .e-content),
:deep(.e-treegrid .e-headercontent) {
  background-color: #0f172a !important;
}

:deep(.e-treegrid .e-row),
:deep(.e-treegrid .e-altrow) {
  background-color: transparent !important;
}

:deep(.e-treegrid .e-headercell),
:deep(.e-treegrid .e-rowcell) {
  background-color: transparent !important;
  border-color: #475569 !important;
  color: rgba(255, 255, 255, 0.92);
  padding-top: 2px !important;
  padding-bottom: 2px !important;
  font-size: 0.8125rem;
  line-height: 1.25;
}

:deep(.e-treegrid .e-headercell) {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

/* 展開／收合圖示與工項名稱同一列（與工程項目標單頁一致） */
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
  line-height: 1.25;
  white-space: nowrap;
  flex-wrap: nowrap;
  min-width: 0;
}

.b2-pcces-name-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  line-height: 1.2;
  min-width: 0;
  width: 100%;
}

.b2-pcces-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.e-treegrid .e-rowcell .form-check-input) {
  width: 0.95rem;
  height: 0.95rem;
  margin: 0;
}

.alert-info {
  background: rgba(13, 110, 253, 0.12);
  border-color: rgba(13, 110, 253, 0.35);
  color: rgba(255, 255, 255, 0.92);
}

.alert-secondary {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}
</style>
