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
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <div v-if="loadingItem" class="d-flex align-items-center gap-2 py-3">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span class="text-muted">載入工項資訊中...</span>
          </div>
          <div v-else>
            <!-- 上半部：資訊呈現 -->
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
                <div>
                    <h4 class="fw-bold mb-1 d-flex align-items-center gap-2">
                        {{ currentItem?.name || '載入中...' }}
                        <span v-if="currentItem?.isActive !== undefined" class="badge rounded-pill fs-6" 
                              :class="currentItem?.isActive ? 'bg-success-subtle text-success border border-success' : 'bg-secondary-subtle text-secondary border border-secondary'">
                            {{ currentItem?.isActive ? '啟用' : '停用' }}
                        </span>
                    </h4>
                    <div class="text-muted small mb-2">{{ currentItem?.description || '無描述' }}</div>
                    
                    <div class="d-flex flex-wrap gap-3 text-secondary small">
                        <span><i class="fa fa-code-branch me-1"></i>版本: v{{ currentItem?.version || 1 }}</span>
                        <span class="border-start ps-3"><i class="fa fa-calendar-alt me-1"></i>效期: {{ currentItem?.effectiveStartDate || '未設定' }} ~ {{ currentItem?.effectiveEndDate || '無期限' }}</span>
                        <span v-if="currentItem?.copiedFromPccesCode" class="border-start ps-3 text-primary">
                            <i class="fa fa-file-import me-1"></i>來源 PCCES: {{ currentItem?.copiedFromPccesCode }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- 分隔線 -->
            <hr class="my-3 border-light-subtle">

            <!-- 下半部：標準搜尋工具列 -->
            <div class="d-flex align-items-center gap-2 mt-3">
                <div class="flex-shrink-0 fw-bold text-secondary">
                    <i class="fa fa-search me-1"></i>套用 PCCES 標準來源：
                </div>
                <div class="flex-grow-1">
                    <PccesAutocomplete 
                       v-model="searchCatalogId" 
                       placeholder="輸入代碼或名稱搜尋..." 
                       @select="onSearchResultSelect"
                    />
                </div>
                
                <div v-if="selectedSearchResult" class="d-flex align-items-center gap-2 ms-2">
                    <span class="text-success small fw-bold">
                        <i class="fa fa-check-circle me-1"></i>{{ selectedSearchResult.code }} {{ selectedSearchResult.name }}
                    </span>
                    <button class="btn btn-sm btn-primary" @click="confirmApplyStandard">
                        <i class="fa fa-download me-1"></i>確認套用
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" @click="clearSearch" title="取消">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
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
                                     <td v-if="subIndex === 0" :rowspan="mgmtItem.子項.length" 
                                         class="fw-bold position-relative cursor-pointer hover-highlight"
                                         @click="editMgmtItem(String(phaseKey), mgmtIndex)"
                                         title="點擊編輯管理項目名稱">
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
                                  <td class="fw-bold">
                                      {{ mgmtItem.名稱 || mgmtItem.name }}
                                  </td>
                                 <td colspan="6" class="text-center text-muted">暫無檢查項目</td>
                             </tr>
                         </template>
                      </template>
                       <tr v-else>
                          <td colspan="7" class="text-center text-muted p-3">
                             此階段暫無管理項目 
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
          <div v-else-if="editingField === '施工檢查點'">
              <label class="form-label">{{ editingField }}</label>
              <select class="form-select" v-model="editValue.current">
                  <option value="">(無)</option>
                  <option value="★">★</option>
                  <option value="※">※</option>
                  <option value="★※">★※</option>
              </select>
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
    getConstructionMajorItemStandards,
    copyStandardFromPcces,
    updateConstructionMajorItemStandard,
    type ConstructionMajorItem, 
    type ConstructionMajorItemStandardResponse
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
        // 1. 取得基本資訊
        const item = await getConstructionMajorItemById(itemId)
        if (item) {
            currentItem.value = item
        }
        // 2. 取得標準明細
        const standards = await getConstructionMajorItemStandards(itemId)
        applyStandard(standards)
    } catch (e) {
        console.error('Load data failed', e)
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

    if(!confirm('確定要套用此標準嗎？這將覆蓋目前的標準明細。')) return

    try {
        loadingItem.value = true
        // 呼叫 Copy API
        await copyStandardFromPcces(itemId, selectedSearchResult.value.code)
        
        // 重新載入
        const standards = await getConstructionMajorItemStandards(itemId)
        applyStandard(standards)
        
        // 清除搜尋
        clearSearch()
        alert('標準套用成功')
    } catch (e) {
        console.error('Copy standard failed:', e)
        alert('套用標準失敗，請稍後再試')
    } finally {
        loadingItem.value = false
    }
}

const applyStandard = (list: ConstructionMajorItemStandardResponse[]) => {
    if (!list || list.length === 0) {
        itemData.value = { phases: {} } 
        return
    }

    // Group by workProcess (Phase) -> manageProject (Management Item)
    const phases: Record<string, any> = {}

    list.forEach(item => {
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
            id: item.id, // Important for updates
            施工檢查點: item.checkPoint || '', 
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

const saveEdit = async () => {
    if (!editTarget.value) return 
    const { phase, mgmtIdx, subIdx } = editTarget.value
    
    // 批次修改管理項目名稱
    if (editingField.value === '管理項目') {
        const mgmtItem = itemData.value.phases[phase].管理項目[mgmtIdx]
        const newVal = editValue.value.current
        
        if (!newVal || !mgmtItem.子項 || mgmtItem.子項.length === 0) return

        try {
            loadingItem.value = true
            // 同步更新該群組下所有子項的 manageProject
            const promises = mgmtItem.子項.map((sub: any) => {
                if (!sub.id) return Promise.resolve()
                return updateConstructionMajorItemStandard(itemId, sub.id, { manageProject: newVal })
            })
            
            await Promise.all(promises)
            
            // 更新本地資料
            mgmtItem.名稱 = newVal
            showEditModal.value = false
            alert('管理項目名稱更新成功')
        } catch(e) {
            console.error(e)
            alert('更新失敗，部分項目可能未同步')
        } finally {
            loadingItem.value = false
        }
        return
    }

    const subItem = itemData.value.phases[phase].管理項目[mgmtIdx].子項[subIdx]
    
    if (!subItem.id) {
        alert('無法編輯：缺少 ID')
        return
    }

    const payload: Partial<ConstructionMajorItemStandardResponse> = {}

    if (editingField.value === '其他資訊') {
        payload.failureHandle = editValue.value.failure
        payload.manageRecord = editValue.value.record
        payload.remark = editValue.value.note
    } else {
        // Mapping UI fields to API fields
        switch(editingField.value) {
            case '施工檢查點': payload.checkPoint = editValue.value.current; break;
            case '抽查標準': payload.checkStandard = editValue.value.current; break;
            case '抽查時機': payload.checkTiming = editValue.value.current; break;
            case '抽查頻率': payload.checkFeq = editValue.value.current; break;
            case '抽查方法': payload.checkMethod = editValue.value.current; break;
        }
    }

    try {
        await updateConstructionMajorItemStandard(itemId, subItem.id, payload)
        
        // Update local state
        if (editingField.value === '其他資訊') {
            subItem.不符合之處理方式 = payload.failureHandle
            subItem.管理紀錄 = payload.manageRecord
            subItem.備註 = payload.remark
        } else {
            subItem[editingField.value] = editValue.value.current
        }
        
        showEditModal.value = false
    } catch(e) {
        console.error(e)
        alert('儲存失敗')
    }
}

// 管理項目編輯 (Not fully supported by single item PATCH if it implies batch update)
const editMgmtItem = (phaseKey: string, mgmtIdx: number) => {
    editingField.value = '管理項目'
    editModalTitle.value = '編輯管理項目名稱'
    // subIdx -1 indicates management item group
    editTarget.value = { phase: phaseKey, mgmtIdx, subIdx: -1 }
    
    const mgmtItem = itemData.value.phases[phaseKey].管理項目[mgmtIdx]
    editValue.value = { current: mgmtItem.名稱 || mgmtItem.name }
    
    showEditModal.value = true
}

// Add/Delete functions removed as per API capabilities (Overwrite/Edit only)
const addMgmtItem = (phaseKey: string) => {}

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
