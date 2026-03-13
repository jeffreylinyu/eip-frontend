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
        />
      </template>
    </PageHeader>

    <div
      v-if="!isFullscreen"
      class="mb-3"
    >
      <div class="d-flex flex-wrap align-items-center gap-2">
        <div
          v-if="selectedDesignChangeId != null"
          class="form-check form-switch m-0 d-flex align-items-center gap-2"
        >
          <input
            class="form-check-input"
            type="checkbox"
            id="pccesDiffToggle"
            v-model="diffEnabled"
            :disabled="isLoading || isCopying"
          />
          <label class="form-check-label user-select-none" for="pccesDiffToggle">
            <span class="pcces-diff-redword">紅字</span>代表與前一個版本的差異
          </label>
        </div>
        <div class="d-flex flex-wrap justify-content-end align-items-center gap-2 ms-auto">
        <button
          class="btn btn-outline-secondary btn-sm"
          type="button"
          @click="toggleFullscreen"
          :title="isFullscreen ? '退出全螢幕' : '全螢幕'"
        >
          <i :class="isFullscreen ? 'fa fa-compress me-1' : 'fa fa-expand me-1'"></i>
          {{ isFullscreen ? '退出全螢幕' : '全螢幕' }}
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
      :class="{ 'treegrid-fullscreen': isFullscreen }"
    >
      <!-- 全螢幕模式下的工具列固定在最上方 -->
      <div
        v-if="isFullscreen"
        class="fullscreen-toolbar d-flex justify-content-between align-items-center px-3 py-2 border-bottom"
      >
        <div class="fw-semibold">
          <i class="fa fa-database me-2"></i>工程項目標單
        </div>
        <div class="d-flex gap-2 align-items-center">
          <div
            v-if="selectedDesignChangeId != null"
            class="form-check form-switch m-0 d-flex align-items-center gap-2 me-2"
          >
            <input
              class="form-check-input"
              type="checkbox"
              id="pccesDiffToggleFullscreen"
              v-model="diffEnabled"
              :disabled="isLoading || isCopying"
            />
            <label class="form-check-label user-select-none" for="pccesDiffToggleFullscreen">
              <span class="pcces-diff-redword">紅字</span>代表與上版本的差異
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
              :sortComparer="itemNoSortComparer"
              :template="'itemNoTemplate'"
            ></e-column>
            <e-column
              field="code"
              headerText="工項代碼"
              width="150"
              textAlign="Left"
              :template="'codeTemplate'"
            ></e-column>
            <e-column
              field="name"
              headerText="工項名稱"
              width="300"
              textAlign="Left"
              :template="'nameTemplate'"
            ></e-column>
            <e-column
              field="unit"
              headerText="單位"
              width="100"
              textAlign="Center"
              :template="'unitTemplate'"
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
          <label class="form-label fw-semibold">選擇檔案</label>
          <input
            type="file"
            class="form-control"
            accept=".xml"
            @change="handleFileSelect"
            ref="fileInput"
          />
          <small class="text-muted">請選擇符合 PCCES 標準格式的 XML 檔案</small>
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
              覆寫該版本既有工項（勾選時會先刪除該版本現有標單再匯入）
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
import { ref, computed, watch, onMounted, onActivated, nextTick, provide } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  importPccesFile,
  getConstructionPccesCodes,
  copyPccesFromTo,
  type ConstructionPccesCode,
  type ImportPccesRequest,
  PccesItemType
} from '@/api/pcces'
import { getDesignChangeList } from '@/api/designChange'
import { Sort, Resize, Filter } from '@syncfusion/ej2-vue-treegrid'
import type { TreeGridComponent } from '@syncfusion/ej2-vue-treegrid'

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
}

const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id || '')

const items = ref<ProjectItem[]>([])
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
      ;(it as any).diff = { itemNo: true, code: true, name: true, unit: true, quantity: true, price: true, amount: true }
      continue
    }
    const diff: Record<string, boolean> = {}
    if (normalizeText(it.name) !== normalizeText(prev.name)) diff.name = true
    if (normalizeText(it.unit) !== normalizeText(prev.unit)) diff.unit = true
    if (!sameNumber(it.quantity, prev.quantity)) diff.quantity = true
    if (!sameNumber(it.price, prev.price)) diff.price = true
    if (!sameNumber(it.amount, prev.amount)) diff.amount = true
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
const treeGridData = ref<any[]>([])

// 全螢幕狀態
const isFullscreen = ref(false)

// 提供 TreeGrid 服務（移除 Page 因為不需要分頁）
provide('treegrid', [Sort, Resize, Filter])

// 匯入相關
const showImportModal = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const importOverwrite = ref(false)
const isImporting = ref(false)
const importError = ref('')

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
    // 先嘗試解析為阿拉伯數字
    const num = parseInt(part, 10)
    if (!isNaN(num)) return num
    
    // 嘗試解析中文數字
    const chineseNum = chineseToNumber(part)
    if (chineseNum !== null) return chineseNum
    
    // 如果都無法解析，使用字串的 Unicode 編碼作為後備
    return part.charCodeAt(0)
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
        // 如果有 itemNo，使用自訂排序
        if (a.itemNo && b.itemNo) {
          return itemNoSortComparer(a, b)
        }
        // 否則按照 id 排序
        return a.id.localeCompare(b.id)
      })
      node.children = children.map(child => buildNode(child))
    }

    return node
  }

  // 對根項目使用自訂排序
  rootItems.sort((a, b) => {
    // 如果有 itemNo，使用自訂排序
    if (a.itemNo && b.itemNo) {
      return itemNoSortComparer(a, b)
    }
    // 否則按照 id 排序
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
  parentId: code.parentId,
  type: code.type
})

// 載入變更設計列表（依生效日升序）
const fetchDesignChangeList = async () => {
  const cid = constructionId.value
  if (!cid) {
    designChangeList.value = []
    return
  }
  try {
    const list = await getDesignChangeList(cid)
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
    return
  }
  isLoading.value = true
  try {
    const data = await getConstructionPccesCodes(constructionId.value, selectedDesignChangeId.value)
    items.value = data.map(convertToProjectItem)
    updateTreeGridData()
    await applyDiffFromPreviousVersion()
  } catch (error: any) {
    console.error('載入工項列表失敗:', error)
    if (error.response?.status !== 404) {
      alert('載入工項列表失敗：' + (error.message || '未知錯誤'))
    }
    items.value = []
    treeGridData.value = []
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
  importOverwrite.value = false
  if (fileInput.value) fileInput.value.value = ''
  showImportModal.value = true
}

// 處理檔案選擇
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
    importError.value = ''
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
    alert(`匯入成功！\n匯入目標：${targetLabel}\n工項總數：${result.totalCodes}`)
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
  overflow: hidden;
  height: 600px;
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
  background-color: #0f172a; /* 確保內容區域也是深色背景 */
}

/* 確保 TreeGrid 本身使用深色背景 */
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
</style>
