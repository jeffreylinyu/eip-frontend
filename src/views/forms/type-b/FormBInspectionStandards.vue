<template>
  <div class="form-b-inspection-standards-page h-100">
    <!-- 頂部資訊區 -->
    <div class="d-flex flex-column gap-3 mb-3">
      <!-- 導覽列與麵包屑 -->
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-outline-secondary" @click="goBack">
            <i class="fa fa-arrow-left me-1"></i> 返回清單
        </button>
        <nav aria-label="breadcrumb" class="flex-grow-1">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item text-muted">施工項目維護</li>
            <li class="breadcrumb-item text-muted">{{ currentItem?.name || '載入中...' }}</li>
            <li class="breadcrumb-item active" aria-current="page">抽查標準維護</li>
          </ol>
        </nav>
      </div>

      <!-- 工項資訊摘要 & 標準來源搜尋 -->
      <div class="card bg-dark text-white border-0 shadow-sm">
        <div class="card-body py-3">
          <div v-if="loadingItem" class="d-flex align-items-center gap-2">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <span>載入工項資訊中...</span>
          </div>
          <div v-else>
            <!-- 當前工項資訊 -->
            <div class="mb-3">
               <div class="d-flex align-items-center gap-2 mb-2">
                   <h4 class="m-0 fw-bold">{{ currentItem?.name || '載入中...' }}</h4>
                   <span v-if="currentItem?.isActive !== undefined" class="badge" :class="currentItem?.isActive ? 'bg-success' : 'bg-secondary'">
                       {{ currentItem?.isActive ? '啟用' : '停用' }}
                   </span>
               </div>
               
               <div class="text-white-50 small">
                  <div class="row g-2">
                      <div class="col-auto">
                          <i class="fa fa-code-branch me-1"></i>版本: v{{ currentItem?.version || 1 }}
                      </div>
                      <div class="col-auto border-start border-white-50 ps-2" v-if="currentItem?.copiedFromPccesCode">
                          <i class="fa fa-file-import me-1"></i>來源 PCCES: {{ currentItem?.copiedFromPccesCode }}
                      </div>
                      <div class="col-auto border-start border-white-50 ps-2" v-if="currentItem?.effectiveStartDate">
                          <i class="fa fa-calendar-alt me-1"></i>效期: {{ currentItem?.effectiveStartDate }} ~ {{ currentItem?.effectiveEndDate || '無期限' }}
                      </div>
                  </div>
                  <div class="mt-2" v-if="currentItem?.description">
                      <i class="fa fa-info-circle me-1"></i>{{ currentItem?.description }}
                  </div>
               </div>
            </div>

            <hr class="border-secondary opacity-50 my-3">

            <!-- 搜尋區塊 -->
            <div class="row gx-3 align-items-center">
               <div class="col-auto">
                   <span class="text-white-50"><i class="fa fa-link me-1"></i> 套用標準來源：</span>
               </div>
               <div class="col flex-grow-1">
                   <PccesAutocomplete 
                      v-model="searchCatalogId" 
                      placeholder="輸入關鍵字搜尋 PCCES 來源項目..." 
                      @select="onSearchResultSelect"
                   />
               </div>
               <div class="col-auto" v-if="selectedSearchResult">
                  <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-success">已預選</span>
                      <button class="btn btn-sm btn-success" @click="confirmApplyStandard">
                          <i class="fa fa-download me-1"></i> 確認套用
                      </button>
                      <button class="btn btn-sm btn-outline-light" @click="clearSearch" title="清除選擇">
                          <i class="fa fa-times"></i>
                      </button>
                  </div>
               </div>
            </div>
            
            <!-- 選項預覽 (Optional: 如果需要更詳細資訊) -->
            <div v-if="selectedSearchResult" class="mt-2 small text-success">
               <i class="fa fa-check me-1"></i> 
               已選擇來源：<strong>{{ selectedSearchResult.code }} {{ selectedSearchResult.name }}</strong>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- 主要內容區 (自定義 Table) -->
    <div class="card border-0 shadow-sm bg-body" style="min-height: 500px;">
      <div class="card-body">
        
        <div v-if="!itemData || !itemData.phases || Object.keys(itemData.phases).length === 0" class="text-center py-5 text-muted">
           <i class="fa fa-clipboard-list fa-3x mb-3"></i>
           <p>目前尚無抽查標準資料</p>
           <div class="text-muted small">請在上方搜尋並套用 PCCES 標準</div>
        </div>

        <div v-else>
          <div v-for="(phase, phaseKey) in itemData.phases" :key="phaseKey" class="mb-5">
             <h5 class="text-primary border-bottom pb-2 mb-3">
               <i class="fa fa-layer-group me-2"></i>{{ phaseKey }}
             </h5>
             
             <!-- 模仿 FormBInspection 的 Table 結構 -->
             <div class="table-responsive">
                <table class="table table-bordered table-hover align-middle">
                   <thead>
                      <tr>
                        <th style="width: 150px;">管理項目</th>
                        <th style="width: 100px;">施工檢查點</th>
                        <th style="width: 250px;">抽查標準</th>
                        <th style="width: 120px;">抽查時機</th>
                        <th style="width: 150px;">抽查頻率</th>
                        <th style="width: 200px;">抽查方法</th>
                        <th>其他資訊</th>
                      </tr>
                   </thead>
                   <tbody>
                      <template v-if="phase.管理項目 && phase.管理項目.length > 0">
                         <template v-for="(mgmtItem, mgmtIndex) in phase.管理項目" :key="mgmtIndex">
                             <template v-if="mgmtItem.子項 && mgmtItem.子項.length > 0">
                                 <tr v-for="(subItem, subIndex) in mgmtItem.子項" :key="subIndex">
                                     <!-- 管理項目 (RowSpan) -->
                                     <!-- 管理項目 (RowSpan) -->
                                     <td v-if="subIndex === 0" :rowspan="mgmtItem.子項.length" 
                                         class="fw-bold cursor-pointer position-relative hover-highlight"
                                         @click="editMgmtItem(String(phaseKey), mgmtIndex)"
                                         title="點擊編輯管理項目">
                                         {{ mgmtItem.名稱 || mgmtItem.name }}
                                     </td>
                                     
                                     <!-- 子項內容 -->
                                     <td @click="editField(String(phaseKey), mgmtIndex, subIndex, '施工檢查點')" class="cursor-pointer hover-highlight" title="點擊編輯">
                                        {{ subItem.施工檢查點 || '-' }}
                                     </td>
                                     <td @click="editField(String(phaseKey), mgmtIndex, subIndex, '抽查標準')" class="cursor-pointer hover-highlight" title="點擊編輯">
                                        {{ subItem.抽查標準 || '-' }}
                                     </td>
                                     <td @click="editField(String(phaseKey), mgmtIndex, subIndex, '抽查時機')" class="cursor-pointer hover-highlight" title="點擊編輯">
                                        {{ subItem.抽查時機 || '-' }}
                                     </td>
                                     <td @click="editField(String(phaseKey), mgmtIndex, subIndex, '抽查頻率')" class="cursor-pointer hover-highlight" title="點擊編輯">
                                        {{ subItem.抽查頻率 || '-' }}
                                     </td>
                                     <td @click="editField(String(phaseKey), mgmtIndex, subIndex, '抽查方法')" class="cursor-pointer hover-highlight" title="點擊編輯">
                                        {{ subItem.抽查方法 || '-' }}
                                     </td>
                                     <!-- 其他資訊合併顯示 -->
                                     <td class="small text-muted cursor-pointer hover-highlight" @click="editField(String(phaseKey), mgmtIndex, subIndex, '其他資訊')" title="點擊編輯">
                                        <div v-if="subItem.不符合之處理方式"><strong>不符合:</strong> {{ subItem.不符合之處理方式 }}</div>
                                        <div v-if="subItem.管理紀錄"><strong>紀錄:</strong> {{ subItem.管理紀錄 }}</div>
                                        <div v-if="subItem.備註"><strong>備註:</strong> {{ subItem.備註 }}</div>
                                     </td>
                                 </tr>
                             </template>
                             <!-- 無子項的情況 -->
                             <tr v-else>
                                 <td class="fw-bold cursor-pointer hover-highlight" 
                                     @click="editMgmtItem(String(phaseKey), mgmtIndex)"
                                     title="點擊編輯管理項目">
                                     {{ mgmtItem.名稱 || mgmtItem.name }}
                                 </td>
                                 <td colspan="6" class="text-center text-muted">暫無檢查項目</td>
                             </tr>
                         </template>
                      </template>
                      <tr v-else>
                         <td colspan="7" class="text-center text-muted p-3">
                            此階段暫無管理項目 
                            <button class="btn btn-sm btn-outline-primary ms-2" @click="addMgmtItem(String(phaseKey))">
                                <i class="fa fa-plus me-1"></i>新增管理項目
                            </button>
                         </td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 編輯欄位 Modal (通用) -->
    <Modal
      :show="showEditModal"
      :title="editModalTitle"
      icon="fa fa-edit"
      size="lg"
      @update:show="showEditModal = $event"
      confirmText="保存"
      cancelText="取消"
      @confirm="saveEdit"
    >
      <template #body>
          <div v-if="editingField === '其他資訊'">
             <div class="mb-3">
                <label class="form-label">不符合之處理方式</label>
                <textarea class="form-control" rows="2" v-model="editValue.failure"></textarea>
             </div>
             <div class="mb-3">
                <label class="form-label">管理紀錄</label>
                <textarea class="form-control" rows="2" v-model="editValue.record"></textarea>
             </div>
             <div class="mb-3">
                <label class="form-label">備註</label>
                <textarea class="form-control" rows="2" v-model="editValue.note"></textarea>
             </div>
          </div>
          <div v-else>
             <label class="form-label">{{ editingField }}</label>
             <textarea class="form-control" rows="5" v-model="editValue.current"></textarea>
          </div>
      </template>
    </Modal>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { 
    getConstructionMajorItemById, 
    getStandardByPccesCode, 
    type ConstructionMajorItem, 
    type ConstructionStandard 
} from '@/api/pcces'
import Modal from '@/components/bootstrap/Modal.vue'
import PccesAutocomplete from '@/components/common/PccesAutocomplete.vue'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const itemId = route.params.id as string

const loadingItem = ref(false)
const currentItem = ref<ConstructionMajorItem | null>(null)

// 資料結構 (Hierarchical)
const itemData = ref<any>({ phases: {} }) 

const searchCatalogId = ref('')
const selectedSearchResult = ref<any>(null)

// 編輯 Modal
const showEditModal = ref(false)
const editModalTitle = ref('')
const editingField = ref('')
// 指向當前編輯的位置
const editTarget = ref<{phase: string, mgmtIdx: number, subIdx: number} | null>(null)
const editValue = ref<any>({})

const loadData = async () => {
    loadingItem.value = true
    try {
        const item = await getConstructionMajorItemById(itemId)
        if (item) {
            currentItem.value = item
            // 如果 API 回傳有 standards (明細), 可以在這裡初始化 itemData
            // 根據 API 文件， GET /construction-major-items/{id} 會回傳 standards 陣列
            // 我們可以嘗試直接將 standards 轉換為 UI 需要的 hierarchy
            if (item.standards && item.standards.length > 0) {
                 // Reuse applyStandard logic or similar mapping
                 // API standards structure: { stepOrder, itemName, workProcess, manageProject, ... }
                 // We need to pass this to applyStandard logic
                 // applyStandard expects ConstructionStandard[], let's map it if field names differ or pass directly if match
                 // Based on API MD, field names in 'standards' array match mostly (checkStandard, etc).
                 // However, 'standards' in API response is mixed snake/camel depending on viewing entity vs json.
                 // Let's assume response JSON keys are camelCase as per typical Spring/Jackson.
                 applyStandard(item.standards)
            }
        }
    } catch (e) {
        console.error('List item failed', e)
        // 保持空或者是錯誤提示
    } finally {
        loadingItem.value = false
    }
}

const goBack = () => router.back()

const onSearchResultSelect = (item: any) => {
    selectedSearchResult.value = item
}

const clearSearch = () => {
    searchCatalogId.value = ''
    selectedSearchResult.value = null
}

const confirmApplyStandard = async () => {
    if (!selectedSearchResult.value) return

    try {
        loadingItem.value = true
        console.log('Fetching standard for code:', selectedSearchResult.value.code)
        // 使用 API 取得標準
        const standardData = await getStandardByPccesCode(selectedSearchResult.value.code)
        console.log('API Response Standard Data:', standardData)
        
        applyStandard(standardData)
    } catch (e) {
        console.error('Failed to load standard:', e)
        alert('取得標準失敗，請稍後再試')
    } finally {
        loadingItem.value = false
    }
}

const applyStandard = (response: ConstructionStandard[] | any) => {
    
    // 1. Extract the array from the response
    let rawList: any[] = []
    if (Array.isArray(response)) {
        rawList = response
    } else if (response && Array.isArray(response.data)) {
        rawList = response.data
    } else if (response && typeof response === 'object') {
        // Fallback: try to see if it's the phases object directly (legacy/mock support)
         if (response.phases) {
             itemData.value = JSON.parse(JSON.stringify(response))
             return
         }
    }

    if (rawList.length === 0) {
        console.warn('No standard items found')
        // 保留原本的邏輯，或者是顯示空狀態
        itemData.value = { phases: {} } 
        return
    }

    // 2. Group by workProcess (Phase) -> manageProject (Management Item)
    const phases: Record<string, any> = {}

    rawList.forEach(item => {
        const phaseName = item.workProcess || '未分類階段'
        const mgmtName = item.manageProject || '未命名項目'

        // Init Phase
        if (!phases[phaseName]) {
            phases[phaseName] = {
                施工流程: phaseName,
                管理項目: []
            }
        }

        // Find or Init Management Item
        let mgmtItem = phases[phaseName].管理項目.find((m: any) => m.名稱 === mgmtName)
        if (!mgmtItem) {
            mgmtItem = {
                名稱: mgmtName,
                子項: []
            }
            phases[phaseName].管理項目.push(mgmtItem)
        }

        // Map Fields to Sub Item
        const subItem = {
            施工檢查點: item.checkPoint || '', // JSON spec doesn't show this, keep empty or map if exists
            抽查標準: item.checkStandard || '',
            抽查時機: item.checkTiming || '',
            抽查頻率: item.checkFeq || '',
            抽查方法: item.checkMethod || '',
            不符合之處理方式: item.failureHandle || '',
            管理紀錄: item.manageRecord || '',
            備註: item.remark || ''
        }
        
        mgmtItem.子項.push(subItem)
    })

    // 3. Update State
    itemData.value = { phases }
}

// 編輯功能
const editField = (phaseKey: string, mgmtIdx: number, subIdx: number, fieldName: string) => {
    editingField.value = fieldName
    editModalTitle.value = `編輯 ${fieldName}`
    editTarget.value = { phase: phaseKey, mgmtIdx, subIdx }
    
    const subItem = itemData.value.phases[phaseKey].管理項目[mgmtIdx].子項[subIdx]
    
    if (fieldName === '其他資訊') {
        editValue.value = {
            failure: subItem.不符合之處理方式 || '',
            record: subItem.管理紀錄 || '',
            note: subItem.備註 || ''
        }
    } else {
        editValue.value = { current: subItem[fieldName] || '' }
    }
    
    showEditModal.value = true
}

const saveEdit = () => {
    if (!editTarget.value) return 
    const { phase, mgmtIdx, subIdx } = editTarget.value
    const subItem = itemData.value.phases[phase].管理項目[mgmtIdx].子項[subIdx]
    
    if (editingField.value === '其他資訊') {
        subItem.不符合之處理方式 = editValue.value.failure
        subItem.管理紀錄 = editValue.value.record
        subItem.備註 = editValue.value.note
    } else {
        subItem[editingField.value] = editValue.value.current
    }
    showEditModal.value = false
}

const deleteSubItem = (phaseKey: string, mgmtIdx: number, subIdx: number) => {
    if(confirm('確定刪除此檢查項目？')) {
        const mgmtItem = itemData.value.phases[phaseKey].管理項目[mgmtIdx]
        mgmtItem.子項.splice(subIdx, 1)
    }
}

const addSubItem = (phaseKey: string, mgmtIdx: number) => {
    const mgmtItem = itemData.value.phases[phaseKey].管理項目[mgmtIdx]
    if (!mgmtItem.子項) mgmtItem.子項 = []
    mgmtItem.子項.push({
        "施工檢查點": "",
        "抽查標準": "新檢查項目",
        "抽查時機": "",
        "抽查頻率": "",
        "抽查方法": "",
    })
}

// 管理項目編輯
const editMgmtItem = (phaseKey: string, mgmtIdx: number) => {
    const mgmtItem = itemData.value.phases[phaseKey].管理項目[mgmtIdx]
    const newName = prompt('請輸入管理項目名稱', mgmtItem.名稱 || mgmtItem.name)
    if (newName) mgmtItem.名稱 = newName
}

const addMgmtItem = (phaseKey: string) => {
    const name = prompt('新管理項目名稱')
    if (name) {
        if (!itemData.value.phases[phaseKey].管理項目) itemData.value.phases[phaseKey].管理項目 = []
        itemData.value.phases[phaseKey].管理項目.push({
            名稱: name,
            子項: []
        })
    }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.form-b-inspection-standards-page {
  padding: 1rem;
}

.cursor-pointer {
    cursor: pointer;
}

.table-hover tbody tr:hover td {
    background-color: rgba(var(--bs-primary-rgb), 0.05);
}

.hover-highlight:hover {
    background-color: rgba(var(--bs-primary-rgb), 0.1) !important;
    text-decoration: underline;
    color: var(--bs-primary) !important;
}
</style>
