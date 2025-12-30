<template>
  <div class="form-b-material-quality-control-page h-100">
    <!-- 頂部資訊區 -->
    <div class="d-flex flex-column gap-3 mb-3">
      <!-- 導覽列與麵包屑 -->
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-outline-secondary" @click="goBack">
            <i class="fa fa-arrow-left me-1"></i> 返回清單
        </button>
        <nav aria-label="breadcrumb" class="flex-grow-1">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item text-muted">標單材料設定</li>
            <li class="breadcrumb-item text-muted">{{ pccesCode }}</li>
            <li class="breadcrumb-item active" aria-current="page">品質抽驗管控表維護</li>
          </ol>
        </nav>
      </div>

      <!-- 資訊摘要 & 標準來源搜尋 -->
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <div v-if="loading" class="d-flex align-items-center gap-2 py-3">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span class="text-muted">載入資訊中...</span>
          </div>
          <div v-else>
            <!-- 上半部：資訊呈現 -->
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
                <div>
                    <h4 class="fw-bold mb-1 d-flex align-items-center gap-2">
                        {{ pccesCode }}
                        <span class="badge bg-secondary-subtle text-secondary border border-secondary fs-6">
                            Version: {{ currentVersionId || '未指定' }}
                        </span>
                    </h4>
                    <div class="text-muted small">
                        請搜尋 PCCES 標準來源並套用，以建立品質抽驗管控表。
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

    <!-- 主要內容區 (Table) -->
    <div class="card border-0 shadow-sm bg-body" style="min-height: 500px;">
      <div class="card-body">
        
        <div v-if="!standards || standards.length === 0" class="text-center py-5 text-muted">
           <i class="fa fa-clipboard-list fa-3x mb-3"></i>
           <p>目前尚無管控表資料</p>
           <div class="text-muted small">請在上方搜尋並套用 PCCES 標準</div>
        </div>

        <div v-else class="table-responsive">
           <table class="table table-bordered table-hover align-middle">
               <thead>
                   <tr>
                       <th class="text-center" style="width: 60px;">項次</th>
                       <th style="min-width: 150px;">材料名稱</th>
                       <th style="min-width: 250px;">抽查標準</th>
                       <th style="min-width: 180px;">抽查方法</th>
                       <th style="width: 110px;">辦理時機</th>
                       <th style="width: 110px;">試驗頻率</th>
                       <th style="min-width: 120px;">抽驗比例</th>
                       <th style="min-width: 200px;">不合格處理</th>
                       <th style="width: 80px;" class="text-center">顯示</th>
                   </tr>
               </thead>
               <tbody>
                   <tr v-for="item in standards" 
                       :key="item.id || item.itemNo"
                       :class="{ 'row-inactive bg-light': !item.isActive }"
                   >
                       <td class="text-center fw-bold">{{ item.itemNo }}</td>
                       <td class="cursor-pointer hover-highlight" @click="editField(item, 'itemName', '材料名稱')">
                           {{ item.itemName || '-' }}
                       </td>
                       <td class="cursor-pointer hover-highlight" @click="editField(item, 'checkStandard', '抽查標準')">
                           <div class="text-pre-wrap">{{ item.checkStandard || '-' }}</div>
                       </td>
                       <td class="cursor-pointer hover-highlight" @click="editField(item, 'checkMethod', '抽查方法')">
                           {{ item.checkMethod || '-' }}
                       </td>
                       <td class="cursor-pointer hover-highlight" @click="editField(item, 'applyFirstLevel', '辦理時機')">
                           {{ item.applyFirstLevel || '-' }}
                       </td>
                       <td class="cursor-pointer hover-highlight" @click="editField(item, 'feqCheckFirstLevel', '試驗頻率')">
                           {{ item.feqCheckFirstLevel || '-' }}
                       </td>
                       <td class="cursor-pointer hover-highlight" @click="editField(item, 'checkRatioSecondLevel', '抽驗比例')">
                           {{ item.checkRatioSecondLevel || '-' }}
                       </td>
                       <td class="cursor-pointer hover-highlight" @click="editField(item, 'failureHandle', '不合格處理')">
                           <div class="text-pre-wrap">{{ item.failureHandle || '-' }}</div>
                       </td>
                       <td class="text-center">
                           <div class="form-check form-switch d-flex justify-content-center">
                               <input 
                                   class="form-check-input" 
                                   type="checkbox" 
                                   :checked="item.isActive"
                                   @change="toggleActive(item)"
                               >
                           </div>
                       </td>
                   </tr>
               </tbody>
           </table>
        </div>

      </div>
    </div>

    <!-- 編輯 Modal -->
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
          <div class="mb-3">
             <label class="form-label">{{ editingLabel }}</label>
             <textarea 
               class="form-control" 
               rows="5" 
               v-model="editValue"
               ref="editInputRef" 
             ></textarea>
          </div>
      </template>
    </Modal>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
    tenderMaterialApi, 
    type ConstructionMaterialStandardResponse,
    type ConstructionMaterialStandardUpdateRequest 
} from '@/api/tenderMaterial'
import Modal from '@/components/bootstrap/Modal.vue'
import PccesAutocomplete from '@/components/common/PccesAutocomplete.vue'
import toastService from '@/components/bootstrap/ToastService.js'

const route = useRoute()
const router = useRouter()

const pccesCode = route.params.pccesCode as string
// 從 query 取得 versionId (TenderMaterialSettings 應該要傳)
const currentVersionId = computed(() => {
    return route.query.versionId as string || ''
})

const loading = ref(false)
const standards = ref<ConstructionMaterialStandardResponse[]>([])

// Search & Apply
const searchCatalogId = ref('')
const selectedSearchResult = ref<any>(null)

// Edit Modal
const showEditModal = ref(false)
const editModalTitle = ref('')
const editingLabel = ref('')
const editValue = ref('')
const currentEditingItem = ref<ConstructionMaterialStandardResponse | null>(null)
const currentEditingField = ref<keyof ConstructionMaterialStandardUpdateRequest | ''>('')
const editInputRef = ref<HTMLTextAreaElement | null>(null)

const goBack = () => router.back()

const loadData = async () => {
    if (!pccesCode || !currentVersionId.value) {
        // 若缺少參數，可能還沒準備好或路由有誤
        return
    }

    loading.value = true
    try {
        standards.value = await tenderMaterialApi.getMaterialStandards(pccesCode, currentVersionId.value)
    } catch (e) {
        console.error('Load standards failed', e)
        toastService.error('載入標準資料失敗')
    } finally {
        loading.value = false
    }
}

// Search Logic
const onSearchResultSelect = (item: any) => {
    selectedSearchResult.value = item
}

const clearSearch = () => {
    searchCatalogId.value = ''
    selectedSearchResult.value = null
}

const confirmApplyStandard = async () => {
    if (!selectedSearchResult.value) return
    if (!currentVersionId.value) {
        toastService.warning('缺少合約版本資訊，無法套用')
        return
    }

    if(!confirm('確定要套用此標準嗎？這將覆蓋目前的標準明細。')) return

    try {
        loading.value = true
        const sourceCode = selectedSearchResult.value.code
        standards.value = await tenderMaterialApi.copyMaterialStandards(pccesCode, currentVersionId.value, sourceCode)
        
        clearSearch()
        toastService.success('標準套用成功')
    } catch (e) {
        console.error('Copy standard failed:', e)
        toastService.error('套用標準失敗，請稍後再試')
    } finally {
        loading.value = false
    }
}

// Toggle Active
const toggleActive = async (item: ConstructionMaterialStandardResponse) => {
    if (!item.id || !currentVersionId.value) return

    const newStatus = !item.isActive
    // Optimistic UI update
    const oldStatus = item.isActive
    item.isActive = newStatus

    try {
        await tenderMaterialApi.updateMaterialStandard(item.id, pccesCode, currentVersionId.value, {
            isActive: newStatus
        })
        // toastService.success(newStatus ? '已顯示' : '已隱藏')
    } catch (e) {
        console.error('Toggle active failed:', e)
        // Revert on failure
        item.isActive = oldStatus
        toastService.error('更新狀態失敗')
    }
}

// Edit Logic
const editField = (item: ConstructionMaterialStandardResponse, field: keyof ConstructionMaterialStandardUpdateRequest, label: string) => {
    if (!item.id) return // Should have ID if loaded from DB
    
    currentEditingItem.value = item
    currentEditingField.value = field
    editingLabel.value = label
    editModalTitle.value = `編輯 ${label}`
    editValue.value = String(item[field as keyof ConstructionMaterialStandardResponse] || '')
    
    showEditModal.value = true
    
    // Focus textarea
    nextTick(() => {
        editInputRef.value?.focus()
    })
}

const saveEdit = async () => {
    if (!currentEditingItem.value?.id || !currentEditingField.value || !currentVersionId.value) return

    const itemId = currentEditingItem.value.id
    const field = currentEditingField.value
    const val = editValue.value

    const request: ConstructionMaterialStandardUpdateRequest = {}
    // @ts-ignore: Dynamic assignment
    request[field] = val

    try {
        const updatedItem = await tenderMaterialApi.updateMaterialStandard(itemId, pccesCode, currentVersionId.value, request)
        
        // Update local list
        const idx = standards.value.findIndex(x => x.id === itemId)
        if (idx !== -1) {
            standards.value[idx] = updatedItem
        }
        
        showEditModal.value = false
        toastService.success('更新成功')
    } catch (e) {
        console.error('Update failed:', e)
        toastService.error('儲存失敗')
    }
}

onMounted(() => {
  if (!currentVersionId.value) {
      toastService.warning('警告：未指定合約版本，請返回列表重新進入')
  }
  loadData()
})
</script>

<style scoped>
.form-b-material-quality-control-page {
  padding: 1rem;
}

.cursor-pointer {
    cursor: pointer;
}

.text-pre-wrap {
    white-space: pre-wrap;
}

.hover-highlight:hover {
    background-color: rgba(var(--bs-primary-rgb), 0.1) !important;
    color: var(--bs-primary);
    text-decoration: underline;
}

/* 讓非最後一欄 (Switch) 的內容變半透明 */
.row-inactive td:not(:last-child) {
    opacity: 0.5;
    color: #6c757d; /* Muted text */
}
</style>
