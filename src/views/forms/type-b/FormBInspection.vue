<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'

// B類表單 - 施工抽查標準表相關數據
const formInfo = {
  code: 'B類',
  name: '施工抽查標準表',
  description: '施工抽查標準表用於記錄工程現場施工品質抽查的標準與結果。',
  category: 'B類表單',
  version: 'v1.0',
  lastUpdate: '2024-01-15'
}

// 狀態管理
const isLoading = ref(false)
const jsonData = ref<Record<string, any>>({})
const currentFile = ref('1~500.json')
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const expandedItems = ref<Set<string>>(new Set())
const showEditModal = ref(false)
const editingItem = ref<any>(null)
const showDeleteConfirm = ref(false)
const deletingItemKey = ref<string | null>(null)

// 子項編輯 Modal 狀態
const showSubItemModal = ref(false)
const editingSubItem = ref<{
  itemKey: string
  phaseKey: string
  mgmtIndex: number
  subIndex: number
  field: string
  itemNumber: number
  itemName: string
  phaseName: string
  mgmtItemName: string
  fieldLabel: string
} | null>(null)
const editingFieldValue = ref('')
const editingOtherInfo = ref({
  不符合之處理方式: '',
  管理紀錄: '',
  備註: ''
})
const hoveredCell = ref<{
  itemKey: string
  phaseKey: string
  mgmtIndex: number
  subIndex: number
  field: string
} | null>(null)

// 可用的文件列表
const fileList = [
  { name: '1~500.json', label: '項目 1-500' },
  { name: '501~1000.json', label: '項目 501-1000' },
  { name: '1001~1500.json', label: '項目 1001-1500' },
  { name: '1501~ALL.json', label: '項目 1501-全部' }
]

// 計算屬性
const itemsList = computed(() => {
  return Object.keys(jsonData.value).map(key => ({
    key,
    ...jsonData.value[key]
  }))
})

const filteredItems = computed(() => {
  if (!searchKeyword.value.trim()) {
    return itemsList.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return itemsList.value.filter(item => {
    const itemName = item.item_name?.toLowerCase() || ''
    const itemNumber = String(item.item_number || '').toLowerCase()
    return itemName.includes(keyword) || itemNumber.includes(keyword)
  })
})

const totalPages = computed(() => {
  return Math.ceil(filteredItems.value.length / pageSize.value)
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredItems.value.slice(start, end)
})

// 方法
const loadJsonFile = async (fileName: string) => {
  try {
    isLoading.value = true
    currentFile.value = fileName
    
    // 使用 import.meta.env.BASE_URL 來動態獲取 base 路徑
    // 這樣在開發環境和生產環境都能正確載入
    let baseUrl = import.meta.env.BASE_URL || '/'
    // 確保 baseUrl 以 / 結尾
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/'
    }
    // 移除開頭的 /，因為 baseUrl 已經包含了
    const filePath = `${baseUrl}交通部公路總局/${fileName}`
    
    console.log('嘗試載入文件路徑:', filePath)
    
    const response = await fetch(filePath)
    
    if (!response.ok) {
      // 如果文件不存在，嘗試其他可能的路徑
      const altPaths = [
        `${baseUrl}assets/data/交通部公路總局/${fileName}`,
        `/交通部公路總局/${fileName}`,
        `./交通部公路總局/${fileName}`,
        `交通部公路總局/${fileName}`
      ]
      
      console.log('嘗試其他路徑:', altPaths)
      
      let loaded = false
      for (const altPath of altPaths) {
        try {
          console.log('嘗試載入:', altPath)
          const altResponse = await fetch(altPath)
          if (altResponse.ok) {
            const data = await altResponse.json()
            jsonData.value = data
            loaded = true
            console.log(`成功從 ${altPath} 載入文件`)
            break
          }
        } catch (e) {
          console.warn(`路徑 ${altPath} 載入失敗:`, e)
          continue
        }
      }
      
      if (!loaded) {
        throw new Error(`無法載入文件: ${fileName}。\n嘗試的路徑：\n${[filePath, ...altPaths].join('\n')}\n\n請確保文件位於 public/交通部公路總局/ 目錄下。`)
      }
    } else {
      const data = await response.json()
      jsonData.value = data
      console.log(`成功載入 ${filePath}`)
    }
    
    currentPage.value = 1
    expandedItems.value.clear()
    searchKeyword.value = ''
    
    console.log(`成功載入 ${fileName}，共 ${Object.keys(jsonData.value).length} 個項目`)
  } catch (error) {
    console.error('載入 JSON 文件失敗:', error)
    const errorMsg = error instanceof Error ? error.message : '未知錯誤'
    alert(`載入文件失敗: ${errorMsg}\n\n請檢查：\n1. 文件是否在 public/交通部公路總局/ 目錄下\n2. 文件名稱是否正確\n3. 查看瀏覽器控制台獲取詳細錯誤信息`)
    jsonData.value = {}
  } finally {
    isLoading.value = false
  }
}

const toggleExpand = (itemKey: string) => {
  if (expandedItems.value.has(itemKey)) {
    expandedItems.value.delete(itemKey)
  } else {
    expandedItems.value.add(itemKey)
  }
}

const openEditModal = (item: any) => {
  editingItem.value = JSON.parse(JSON.stringify({
    key: item.key,
    item_number: item.item_number,
    item_name: item.item_name,
    phases: item.phases || {}
  }))
  showEditModal.value = true
}

const openAddModal = () => {
  const maxItemNumber = Math.max(...itemsList.value.map(i => i.item_number || 0), 0)
  editingItem.value = {
    item_number: maxItemNumber + 1,
    item_name: '',
    phases: {}
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingItem.value = null
}

const saveItem = () => {
  if (!editingItem.value) return
  
  // 驗證必填欄位
  if (!editingItem.value.item_number) {
    alert('請輸入項目編號')
    return
  }
  
  if (!editingItem.value.item_name || !editingItem.value.item_name.trim()) {
    alert('請輸入項目名稱')
    return
  }
  
  const itemKey = `item_${editingItem.value.item_number}`
  const isNew = !editingItem.value.key || !jsonData.value[editingItem.value.key]
  
  // 如果是編輯現有項目且編號改變，需要刪除舊的 key
  if (editingItem.value.key && editingItem.value.key !== itemKey) {
    delete jsonData.value[editingItem.value.key]
  }
  
  // 如果是編輯現有項目，保留原有的 phases 資料
  const existingPhases = jsonData.value[itemKey]?.phases || editingItem.value.phases || {}
  
  jsonData.value[itemKey] = {
    item_number: editingItem.value.item_number,
    item_name: editingItem.value.item_name.trim(),
    phases: existingPhases
  }
  
  closeEditModal()
  alert(isNew ? '新增成功' : '更新成功')
}

const confirmDelete = (itemKey: string) => {
  deletingItemKey.value = itemKey
  showDeleteConfirm.value = true
}

const deleteItem = () => {
  if (deletingItemKey.value && jsonData.value[deletingItemKey.value]) {
    delete jsonData.value[deletingItemKey.value]
    showDeleteConfirm.value = false
    deletingItemKey.value = null
    alert('刪除成功')
  }
}

const exportJson = () => {
  const dataStr = JSON.stringify(jsonData.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = currentFile.value
  link.click()
  URL.revokeObjectURL(url)
  alert('匯出成功')
}

const getPhaseName = (phaseKey: string) => {
  return phaseKey
}

const getManagementItemName = (item: any) => {
  return item.名稱 || item.name || '未命名'
}

// 欄位標籤映射
const fieldLabels: Record<string, string> = {
  '施工檢查點': '施工檢查點',
  '抽查標準': '抽查標準',
  '抽查時機': '抽查時機',
  '抽查頻率': '抽查頻率',
  '抽查方法': '抽查方法',
  '不符合之處理方式': '不符合之處理方式',
  '管理紀錄': '管理紀錄',
  '備註': '備註'
}

// 子項編輯方法
const openSubItemEdit = (itemKey: string, phaseKey: string, mgmtIndex: number, subIndex: number, field: string) => {
  const item = jsonData.value[itemKey]
  if (!item || !item.phases || !item.phases[phaseKey]) return
  
  const phase = item.phases[phaseKey]
  if (!phase.管理項目 || !phase.管理項目[mgmtIndex]) return
  
  const mgmtItem = phase.管理項目[mgmtIndex]
  if (!mgmtItem.子項 || !mgmtItem.子項[subIndex]) return
  
  const subItem = mgmtItem.子項[subIndex]
  
  editingSubItem.value = {
    itemKey,
    phaseKey,
    mgmtIndex,
    subIndex,
    field,
    itemNumber: item.item_number,
    itemName: item.item_name,
    phaseName: phaseKey,
    mgmtItemName: getManagementItemName(mgmtItem),
    fieldLabel: field === '其他資訊' ? '其他資訊' : (fieldLabels[field] || field)
  }
  
  // 如果是編輯「其他資訊」，載入三個欄位的值
  if (field === '其他資訊') {
    editingOtherInfo.value = {
      不符合之處理方式: subItem.不符合之處理方式 || '',
      管理紀錄: subItem.管理紀錄 || '',
      備註: subItem.備註 || ''
    }
  } else {
    // 載入當前欄位的值
    editingFieldValue.value = subItem[field] || ''
  }
  
  showSubItemModal.value = true
}

const closeSubItemModal = () => {
  showSubItemModal.value = false
  editingSubItem.value = null
  editingFieldValue.value = ''
  editingOtherInfo.value = {
    不符合之處理方式: '',
    管理紀錄: '',
    備註: ''
  }
}

const saveSubItem = () => {
  if (!editingSubItem.value) return
  
  const { itemKey, phaseKey, mgmtIndex, subIndex, field } = editingSubItem.value
  const item = jsonData.value[itemKey]
  
  if (item && item.phases && item.phases[phaseKey]) {
    const phase = item.phases[phaseKey]
    if (phase.管理項目 && phase.管理項目[mgmtIndex]) {
      const mgmtItem = phase.管理項目[mgmtIndex]
      if (mgmtItem.子項 && mgmtItem.子項[subIndex]) {
        // 如果是編輯「其他資訊」，同時更新三個欄位
        if (field === '其他資訊') {
          mgmtItem.子項[subIndex].不符合之處理方式 = editingOtherInfo.value.不符合之處理方式
          mgmtItem.子項[subIndex].管理紀錄 = editingOtherInfo.value.管理紀錄
          mgmtItem.子項[subIndex].備註 = editingOtherInfo.value.備註
        } else {
          // 只更新當前欄位
          mgmtItem.子項[subIndex][field] = editingFieldValue.value
        }
        closeSubItemModal()
        alert('保存成功')
      }
    }
  }
}

const getFieldPlaceholder = (field: string) => {
  const placeholders: Record<string, string> = {
    '施工檢查點': '例如：★、★※',
    '抽查標準': '請輸入抽查標準',
    '抽查時機': '例如：材料進場時',
    '抽查頻率': '例如：每批次材料進場時抽查一次',
    '抽查方法': '請輸入抽查方法',
    '不符合之處理方式': '請輸入不符合時的處理方式',
    '管理紀錄': '請輸入管理紀錄',
    '備註': '請輸入備註'
  }
  return placeholders[field] || '請輸入內容'
}

// 生命週期
onMounted(() => {
  // 預設載入第一個文件
  loadJsonFile('1~500.json')
})
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        <!-- 頁面標題 -->
        <PageHeader
          :title="`${formInfo.code} - ${formInfo.name}`"
          icon="fa fa-file-alt"
          :breadcrumbs="[
            { text: '表單生成與管理', href: 'javascript:;' },
            { text: 'B類表單', href: 'javascript:;' },
            { text: `${formInfo.code} ${formInfo.name}`, active: true }
          ]"
        />

        <!-- 工具欄 -->
        <Card class="mb-4">
          <CardBody>
            <div class="row align-items-center">
              <div class="col-md-3 mb-3 mb-md-0">
                <label class="form-label">選擇資料檔案</label>
                <select 
                  class="form-select" 
                  v-model="currentFile"
                  @change="loadJsonFile(currentFile)"
                  :disabled="isLoading"
                >
                  <option v-for="file in fileList" :key="file.name" :value="file.name">
                    {{ file.label }}
                  </option>
                </select>
              </div>
              <div class="col-md-4 mb-3 mb-md-0">
                <label class="form-label">搜尋項目</label>
                <div class="input-group">
                  <span class="input-group-text">
                    <i class="fa fa-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    v-model="searchKeyword"
                    placeholder="搜尋項目編號或名稱..."
                  />
                </div>
              </div>
              <div class="col-md-5 text-md-end">
                <button 
                  class="btn btn-theme me-2"
                  @click="openAddModal"
                  :disabled="isLoading"
                >
                  <i class="fa fa-plus me-1"></i>
                  新增項目
                </button>
                <button 
                  class="btn btn-outline-theme"
                  @click="exportJson"
                  :disabled="isLoading || Object.keys(jsonData).length === 0"
                >
                  <i class="fa fa-download me-1"></i>
                  匯出 JSON
                </button>
              </div>
            </div>
          </CardBody>
        </Card>

        <!-- 資料表格 -->
        <Card>
          <CardHeader>
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <i class="fa fa-list me-2"></i>
                <span>項目列表</span>
                <span class="badge bg-theme ms-2">
                  共 {{ filteredItems.length }} 項
                </span>
              </div>
              <div v-if="isLoading" class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">載入中...</span>
              </div>
            </div>
          </CardHeader>
          <CardBody class="p-0">
            <div v-if="isLoading" class="text-center py-5">
              <div class="spinner-border text-theme" role="status">
                <span class="visually-hidden">載入中...</span>
              </div>
              <p class="mt-3 text-muted">正在載入資料...</p>
            </div>

            <div v-else-if="paginatedItems.length === 0" class="text-center py-5">
              <i class="fa fa-inbox fa-3x text-muted mb-3"></i>
              <p class="text-muted">沒有找到任何項目</p>
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width: 80px;">編號</th>
                    <th>項目名稱</th>
                    <th style="width: 150px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="item in paginatedItems" :key="item.key">
                    <tr>
                      <td>{{ item.item_number }}</td>
                      <td>
                        <div class="d-flex align-items-center">
                          <button
                            class="btn btn-sm btn-link p-0 me-2 text-theme"
                            @click="toggleExpand(item.key)"
                          >
                            <i 
                              class="fa"
                              :class="expandedItems.has(item.key) ? 'fa-chevron-down' : 'fa-chevron-right'"
                            ></i>
                          </button>
                          <span>{{ item.item_name }}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          class="btn btn-sm btn-outline-primary me-1"
                          @click="openEditModal(item)"
                          title="編輯"
                        >
                          <i class="fa fa-edit"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-outline-danger"
                          @click="confirmDelete(item.key)"
                          title="刪除"
                        >
                          <i class="fa fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                    <!-- 展開的詳細資訊 -->
                    <tr v-if="expandedItems.has(item.key)" class="detail-row">
                      <td colspan="3" class="p-0">
                        <div class="p-4">
                          <h6 class="mb-3">施工階段與管理項目</h6>
                          <div v-if="!item.phases || Object.keys(item.phases).length === 0" class="text-center py-3 text-muted">
                            暫無階段資料
                          </div>
                          <div v-else class="table-responsive">
                            <table 
                              v-for="(phase, phaseKey) in item.phases" 
                              :key="phaseKey"
                              class="table table-sm table-bordered detail-table mb-4"
                            >
                              <thead class="table-secondary">
                                <tr>
                                  <th colspan="8" class="text-primary">
                                    <i class="fa fa-cog me-1"></i>
                                    {{ phaseKey }}
                                  </th>
                                </tr>
                                <tr>
                                  <th style="width: 80px;">施工階段</th>
                                  <th style="width: 100px;">管理項目</th>
                                  <th style="width: 100px;">施工檢查點</th>
                                  <th style="width: 200px;">抽查標準</th>
                                  <th style="width: 120px;">抽查時機</th>
                                  <th style="width: 120px;">抽查頻率</th>
                                  <th style="width: 150px;">抽查方法</th>
                                  <th style="width: auto;">其他資訊</th>
                                </tr>
                              </thead>
                              <tbody>
                                <template v-if="phase.管理項目 && phase.管理項目.length > 0">
                                  <template v-for="(mgmtItem, mgmtIndex) in phase.管理項目" :key="mgmtIndex">
                                    <template v-if="mgmtItem.子項 && mgmtItem.子項.length > 0">
                                      <tr 
                                        v-for="(subItem, subIndex) in mgmtItem.子項" 
                                        :key="subIndex"
                                        :class="{ 'detail-sub-row': subIndex === 0 }"
                                      >
                                        <td v-if="subIndex === 0" :rowspan="mgmtItem.子項.length" class="align-middle text-center">
                                          {{ phaseKey }}
                                        </td>
                                        <td v-if="subIndex === 0" :rowspan="mgmtItem.子項.length" class="align-middle">
                                          <strong>{{ getManagementItemName(mgmtItem) }}</strong>
                                        </td>
                                        <td 
                                          class="detail-value editable-cell"
                                          @mouseenter="hoveredCell = { itemKey: String(item.key), phaseKey: String(phaseKey), mgmtIndex: Number(mgmtIndex), subIndex: Number(subIndex), field: '施工檢查點' }"
                                          @mouseleave="hoveredCell = null"
                                          @click.stop="openSubItemEdit(String(item.key), String(phaseKey), Number(mgmtIndex), Number(subIndex), '施工檢查點')"
                                        >
                                          <div class="d-flex align-items-center justify-content-between">
                                            <span class="fw-bold">{{ subItem.施工檢查點 || '-' }}</span>
                                            <i 
                                              v-if="hoveredCell && hoveredCell.itemKey === String(item.key) && hoveredCell.phaseKey === String(phaseKey) && Number(hoveredCell.mgmtIndex) === Number(mgmtIndex) && Number(hoveredCell.subIndex) === Number(subIndex) && hoveredCell.field === '施工檢查點'"
                                              class="fa fa-edit text-muted ms-2"
                                            ></i>
                                          </div>
                                        </td>
                                        <td 
                                          class="detail-value editable-cell"
                                          @mouseenter="hoveredCell = { itemKey: String(item.key), phaseKey: String(phaseKey), mgmtIndex: Number(mgmtIndex), subIndex: Number(subIndex), field: '抽查標準' }"
                                          @mouseleave="hoveredCell = null"
                                          @click.stop="openSubItemEdit(String(item.key), String(phaseKey), Number(mgmtIndex), Number(subIndex), '抽查標準')"
                                        >
                                          <div class="d-flex align-items-center justify-content-between">
                                            <span>{{ subItem.抽查標準 || '-' }}</span>
                                            <i 
                                              v-if="hoveredCell && hoveredCell.itemKey === String(item.key) && hoveredCell.phaseKey === String(phaseKey) && Number(hoveredCell.mgmtIndex) === Number(mgmtIndex) && Number(hoveredCell.subIndex) === Number(subIndex) && hoveredCell.field === '抽查標準'"
                                              class="fa fa-edit text-muted ms-2"
                                            ></i>
                                          </div>
                                        </td>
                                        <td 
                                          class="detail-value editable-cell"
                                          @mouseenter="hoveredCell = { itemKey: String(item.key), phaseKey: String(phaseKey), mgmtIndex: Number(mgmtIndex), subIndex: Number(subIndex), field: '抽查時機' }"
                                          @mouseleave="hoveredCell = null"
                                          @click.stop="openSubItemEdit(String(item.key), String(phaseKey), Number(mgmtIndex), Number(subIndex), '抽查時機')"
                                        >
                                          <div class="d-flex align-items-center justify-content-between">
                                            <span>{{ subItem.抽查時機 || '-' }}</span>
                                            <i 
                                              v-if="hoveredCell && hoveredCell.itemKey === String(item.key) && hoveredCell.phaseKey === String(phaseKey) && Number(hoveredCell.mgmtIndex) === Number(mgmtIndex) && Number(hoveredCell.subIndex) === Number(subIndex) && hoveredCell.field === '抽查時機'"
                                              class="fa fa-edit text-muted ms-2"
                                            ></i>
                                          </div>
                                        </td>
                                        <td 
                                          class="detail-value editable-cell"
                                          @mouseenter="hoveredCell = { itemKey: String(item.key), phaseKey: String(phaseKey), mgmtIndex: Number(mgmtIndex), subIndex: Number(subIndex), field: '抽查頻率' }"
                                          @mouseleave="hoveredCell = null"
                                          @click.stop="openSubItemEdit(String(item.key), String(phaseKey), Number(mgmtIndex), Number(subIndex), '抽查頻率')"
                                        >
                                          <div class="d-flex align-items-center justify-content-between">
                                            <span>{{ subItem.抽查頻率 || '-' }}</span>
                                            <i 
                                              v-if="hoveredCell && hoveredCell.itemKey === String(item.key) && hoveredCell.phaseKey === String(phaseKey) && Number(hoveredCell.mgmtIndex) === Number(mgmtIndex) && Number(hoveredCell.subIndex) === Number(subIndex) && hoveredCell.field === '抽查頻率'"
                                              class="fa fa-edit text-muted ms-2"
                                            ></i>
                                          </div>
                                        </td>
                                        <td 
                                          class="detail-value editable-cell"
                                          @mouseenter="hoveredCell = { itemKey: String(item.key), phaseKey: String(phaseKey), mgmtIndex: Number(mgmtIndex), subIndex: Number(subIndex), field: '抽查方法' }"
                                          @mouseleave="hoveredCell = null"
                                          @click.stop="openSubItemEdit(String(item.key), String(phaseKey), Number(mgmtIndex), Number(subIndex), '抽查方法')"
                                        >
                                          <div class="d-flex align-items-center justify-content-between">
                                            <span>{{ subItem.抽查方法 || '-' }}</span>
                                            <i 
                                              v-if="hoveredCell && hoveredCell.itemKey === String(item.key) && hoveredCell.phaseKey === String(phaseKey) && Number(hoveredCell.mgmtIndex) === Number(mgmtIndex) && Number(hoveredCell.subIndex) === Number(subIndex) && hoveredCell.field === '抽查方法'"
                                              class="fa fa-edit text-muted ms-2"
                                            ></i>
                                          </div>
                                        </td>
                                        <td 
                                          class="detail-value small editable-cell"
                                          @mouseenter="hoveredCell = { itemKey: String(item.key), phaseKey: String(phaseKey), mgmtIndex: Number(mgmtIndex), subIndex: Number(subIndex), field: '其他資訊' }"
                                          @mouseleave="hoveredCell = null"
                                          @click.stop="openSubItemEdit(String(item.key), String(phaseKey), Number(mgmtIndex), Number(subIndex), '其他資訊')"
                                        >
                                          <div class="d-flex align-items-center justify-content-between">
                                            <div>
                                              <div v-if="subItem.不符合之處理方式" class="mb-1">
                                                <strong>不符合處理：</strong>{{ subItem.不符合之處理方式 }}
                                              </div>
                                              <div v-if="subItem.管理紀錄" class="mb-1">
                                                <strong>管理紀錄：</strong>{{ subItem.管理紀錄 }}
                                              </div>
                                              <div v-if="subItem.備註" class="text-muted">
                                                <strong>備註：</strong>{{ subItem.備註 }}
                                              </div>
                                              <div v-if="!subItem.不符合之處理方式 && !subItem.管理紀錄 && !subItem.備註" class="text-muted">
                                                -
                                              </div>
                                            </div>
                                            <i 
                                              v-if="hoveredCell && hoveredCell.itemKey === String(item.key) && hoveredCell.phaseKey === String(phaseKey) && Number(hoveredCell.mgmtIndex) === Number(mgmtIndex) && Number(hoveredCell.subIndex) === Number(subIndex) && hoveredCell.field === '其他資訊'"
                                              class="fa fa-edit text-muted ms-2"
                                            ></i>
                                          </div>
                                        </td>
                                      </tr>
                                    </template>
                                    <tr v-else>
                                      <td>{{ phaseKey }}</td>
                                      <td>
                                        <strong>{{ getManagementItemName(mgmtItem) }}</strong>
                                      </td>
                                      <td colspan="6" class="text-center text-muted">暫無子項資料</td>
                                    </tr>
                                  </template>
                                </template>
                                <tr v-else>
                                  <td>{{ phaseKey }}</td>
                                  <td colspan="7" class="text-center text-muted">暫無管理項目</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <!-- 分頁 -->
            <div v-if="totalPages > 1" class="d-flex justify-content-between align-items-center p-3 border-top">
              <div class="text-muted">
                顯示第 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredItems.length) }} 項，共 {{ filteredItems.length }} 項
              </div>
              <nav>
                <ul class="pagination mb-0">
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <button class="page-link" @click="currentPage = 1" :disabled="currentPage === 1">
                      <i class="fa fa-angle-double-left"></i>
                    </button>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <button class="page-link" @click="currentPage--" :disabled="currentPage === 1">
                      <i class="fa fa-angle-left"></i>
                    </button>
                  </li>
                  <li class="page-item" v-for="page in totalPages" :key="page" :class="{ active: currentPage === page }">
                    <button class="page-link" @click="currentPage = page">
                      {{ page }}
                    </button>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <button class="page-link" @click="currentPage++" :disabled="currentPage === totalPages">
                      <i class="fa fa-angle-right"></i>
                    </button>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <button class="page-link" @click="currentPage = totalPages" :disabled="currentPage === totalPages">
                      <i class="fa fa-angle-double-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 編輯/新增 Modal -->
    <Modal
      v-model:show="showEditModal"
      :title="editingItem && editingItem.item_number ? '編輯項目' : '新增項目'"
      icon="fa fa-edit"
      size="xl"
      modal-id="edit-item-modal"
      confirm-text="保存"
      cancel-text="取消"
      @confirm="saveItem"
      @hide="closeEditModal"
    >
      <template #body>
        <div v-if="editingItem" class="row">
          <div class="col-md-6 mb-3">
            <label class="form-label">項目編號 <span class="text-danger">*</span></label>
              <input
              type="number"
              class="form-control"
              v-model.number="editingItem.item_number"
              :readonly="editingItem.key && jsonData[editingItem.key]"
            />
          </div>
          <div class="col-md-12 mb-3">
            <label class="form-label">項目名稱 <span class="text-danger">*</span></label>
            <input
              type="text"
              class="form-control"
              v-model="editingItem.item_name"
              placeholder="請輸入項目名稱"
            />
          </div>
          <div class="col-md-12">
            <label class="form-label">施工階段資料</label>
            <div class="alert alert-info">
              <i class="fa fa-info-circle me-2"></i>
              施工階段資料結構較為複雜，建議在匯出的 JSON 檔案中手動編輯後再匯入。
            </div>
          </div>
        </div>
      </template>
    </Modal>

    <!-- 編輯子項 Modal -->
    <Modal
      v-model:show="showSubItemModal"
      :title="editingSubItem ? `編輯${editingSubItem.fieldLabel}` : '編輯欄位'"
      icon="fa fa-edit"
      :backdrop="false"
      size="lg"
      modal-id="edit-subitem-modal"
      confirm-text="保存"
      cancel-text="取消"
      @confirm="saveSubItem"
      @hide="closeSubItemModal"
    >
      <template #body>
        <div v-if="editingSubItem">
          <!-- 其他資訊：三個欄位一起編輯 -->
          <template v-if="editingSubItem.field === '其他資訊'">
            <div class="mb-3">
              <label class="form-label">不符合之處理方式</label>
              <textarea
                class="form-control"
                v-model="editingOtherInfo.不符合之處理方式"
                rows="2"
                placeholder="請輸入不符合時的處理方式"
              ></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label">管理紀錄</label>
              <textarea
                class="form-control"
                v-model="editingOtherInfo.管理紀錄"
                rows="2"
                placeholder="請輸入管理紀錄"
              ></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label">備註</label>
              <textarea
                class="form-control"
                v-model="editingOtherInfo.備註"
                rows="2"
                placeholder="請輸入備註"
              ></textarea>
            </div>
          </template>
          <!-- 單一欄位編輯表單 -->
          <template v-else>
            <div class="mb-3">
              <label class="form-label">
                <i class="fa fa-star text-danger me-1" v-if="['施工檢查點', '抽查標準', '抽查時機'].includes(editingSubItem.field)"></i>
                {{ editingSubItem.fieldLabel }}
              </label>
              <input
                v-if="['施工檢查點', '抽查時機', '抽查頻率'].includes(editingSubItem.field)"
                type="text"
                class="form-control"
                v-model="editingFieldValue"
                :placeholder="getFieldPlaceholder(editingSubItem.field)"
              />
              <textarea
                v-else
                class="form-control"
                v-model="editingFieldValue"
                :rows="editingSubItem.field === '抽查標準' ? 5 : 3"
                :placeholder="getFieldPlaceholder(editingSubItem.field)"
              ></textarea>
            </div>
          </template>
        </div>
      </template>
    </Modal>

    <!-- 刪除確認 Modal -->
    <Modal
      v-model:show="showDeleteConfirm"
      title="確認刪除"
      icon="fa fa-exclamation-triangle"
      modal-id="delete-confirm-modal"
      confirm-text="確定刪除"
      cancel-text="取消"
      confirm-variant="danger"
      @confirm="deleteItem"
      @hide="showDeleteConfirm = false"
    >
      <template #body>
        <p>確定要刪除此項目嗎？此操作無法復原。</p>
        <p v-if="deletingItemKey && jsonData[deletingItemKey]" class="text-muted">
          項目編號：{{ jsonData[deletingItemKey].item_number }}<br>
          項目名稱：{{ jsonData[deletingItemKey].item_name }}
        </p>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page-header {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

@media (max-width: 768px) {
  .page-header {
    font-size: 1.5rem;
  }
}

.table th {
  font-weight: 600;
  background-color: var(--bs-light);
  color: var(--bs-body-color);
  border-color: var(--bs-border-color);
}

.table td {
  vertical-align: middle;
}

/* 展開詳情行 - 適配黑暗模式 */
.detail-row {
  background-color: var(--bs-secondary-bg) !important;
}

.detail-row td {
  color: var(--bs-body-color) !important;
}

.detail-row h6 {
  color: var(--bs-body-color) !important;
}

/* 詳情表格樣式 */
.detail-table {
  margin-bottom: 1.5rem;
  background-color: var(--bs-body-bg);
}

.detail-table thead th {
  background-color: var(--bs-secondary-bg) !important;
  color: var(--bs-body-color) !important;
  border-color: var(--bs-border-color) !important;
  font-weight: 600;
}

.detail-table tbody td {
  color: var(--bs-body-color) !important;
  border-color: var(--bs-border-color) !important;
  vertical-align: top;
}

.detail-table tbody tr:hover {
  background-color: var(--bs-secondary-bg);
}

.detail-sub-row {
  border-top: 2px solid var(--bs-border-color);
}

.detail-value {
  color: var(--bs-body-color) !important;
}

/* 可編輯單元格樣式 */
.editable-cell {
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.editable-cell:hover {
  background-color: var(--bs-secondary-bg) !important;
}

.editable-field {
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.editable-field:hover {
  background-color: var(--bs-secondary-bg) !important;
}

/* 黑暗模式特定樣式 */
[data-bs-theme="dark"] .detail-row {
  background-color: var(--bs-body-tertiary-bg) !important;
}

[data-bs-theme="dark"] .detail-row td {
  color: var(--bs-body-emphasis-color) !important;
}

[data-bs-theme="dark"] .detail-row h6 {
  color: var(--bs-body-emphasis-color) !important;
}

[data-bs-theme="dark"] .detail-table {
  background-color: var(--bs-body-bg);
}

[data-bs-theme="dark"] .detail-table thead th {
  background-color: var(--bs-secondary-bg) !important;
  color: var(--bs-body-emphasis-color) !important;
  border-color: var(--bs-border-color) !important;
}

[data-bs-theme="dark"] .detail-table tbody td {
  color: var(--bs-body-emphasis-color) !important;
  border-color: var(--bs-border-color) !important;
  background-color: var(--bs-body-bg);
}

[data-bs-theme="dark"] .detail-table tbody tr:hover {
  background-color: var(--bs-secondary-bg);
}

[data-bs-theme="dark"] .detail-value {
  color: var(--bs-body-emphasis-color) !important;
}

[data-bs-theme="dark"] .detail-sub-row {
  border-top-color: var(--bs-border-color);
}

/* 暗色模式：主表格表頭 */
[data-bs-theme="dark"] .table th {
  background-color: var(--bs-secondary-bg) !important;
  color: #ffffff !important;
  border-color: var(--bs-border-color) !important;
}

[data-bs-theme="dark"] .table thead.table-light th {
  background-color: var(--bs-secondary-bg) !important;
  color: #ffffff !important;
}

/* 暗色模式：詳情表格表頭 */
[data-bs-theme="dark"] .table thead.table-secondary th {
  background-color: var(--bs-tertiary-bg) !important;
  color: #ffffff !important;
  border-color: var(--bs-border-color) !important;
}
</style>
