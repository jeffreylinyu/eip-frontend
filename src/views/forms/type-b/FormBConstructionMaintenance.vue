<template>
  <div class="form-b-construction-maintenance-page">
    <PageHeader
      title="施工項目"
      icon="fa fa-tools"
      :breadcrumbs="[
        { text: '文件與表單管理', href: 'javascript:;' },
        { text: 'B類表單', href: 'javascript:;' },
        { text: '施工項目', active: true }
      ]"
    >
      <template #extra>
        <DesignChangeVersionSwitcher
          :model-value="selectedDesignChangeId"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <div class="card border-0 shadow-sm bg-body">
      <div class="card-body">
         <!-- Search and Toolbar -->
         <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="d-flex gap-2">
                <input 
                    type="text" 
                    class="form-control" 
                    placeholder="搜尋名稱..." 
                    v-model="keyword"
                    @keyup.enter="loadItems"
                >
                <button class="btn btn-primary" @click="loadItems">
                    <i class="fa fa-search"></i>
                </button>
            </div>
            <div class="d-flex gap-2">
                 <button
                    type="button"
                    class="btn-ai-generate"
                    :disabled="aiSuggestLoading || !constructionId"
                    @click="openAiSuggest"
                    title="依目前版本標單由 AI 產出施工大項建議，確認後僅併入新增、不覆蓋既有項目"
                 >
                    <i class="fa me-2" :class="aiSuggestLoading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"></i>
                    {{ aiSuggestLoading ? '生成中...' : '依標單 AI 生成' }}
                 </button>
                 <button
                    v-if="selectedDesignChangeId != null"
                    type="button"
                    class="btn btn-outline-primary"
                    :disabled="isCopying"
                    @click="copyFromPrevious"
                    title="將前一個版本的施工大項（含抽查標準）複製到目前版本，既有項目會保留"
                 >
                    <i class="fa me-1" :class="isCopying ? 'fa-spinner fa-spin' : 'fa-copy'"></i>
                    {{ isCopying ? '複製中...' : '複製前一個版本' }}
                 </button>
                 <button class="btn btn-success" @click="createItem">
                    <i class="fa fa-plus me-1"></i>新增施工大項
                 </button>
            </div>
         </div>

         <!-- Data Table -->
         <div class="table-responsive">
             <table class="table table-hover align-middle">
                 <thead>
                     <tr>
                         <th>施工項目名稱</th>
                         <th>描述</th>
                         <th class="text-center" style="width: 150px;">操作</th>
                     </tr>
                 </thead>
                 <tbody>
                     <tr v-if="loading">
                         <td colspan="3" class="text-center py-5 text-muted">載入中...</td>
                     </tr>
                     <template v-else-if="items.length > 0">
                         <tr v-for="item in items" :key="item.id">
                             <td class="fw-bold">
                                 {{ item.name }}
                                 <div v-if="item.copiedFromPccesCode" class="small text-muted">
                                     來源: {{ item.copiedFromPccesCode }}
                                 </div>
                             </td>
                             <td>{{ item.description || '-' }}</td>
                             <td class="text-center text-nowrap">
                                 <button class="btn btn-sm btn-outline-primary me-2" @click="goToStandards(item)">
                                     <i class="fa fa-list-check me-1"></i>施工抽查標準
                                 </button>
                                 <button class="btn btn-sm btn-outline-secondary me-2" @click="editItem(item)">
                                     <i class="fa fa-pen me-1"></i>編輯
                                 </button>
                                 <button class="btn btn-sm btn-outline-danger" @click="handleDelete(item)">
                                     <i class="fa fa-trash me-1"></i>刪除
                                 </button>
                             </td>
                         </tr>
                     </template>
                     <tr v-else>
                         <td colspan="3" class="text-center py-5 text-muted">
                             暫無資料
                         </td>
                     </tr>
                 </tbody>
             </table>
         </div>

         <!-- Pagination (Basic) -->
         <div v-if="totalPages > 1" class="d-flex justify-content-center mt-3">
             <nav>
                 <ul class="pagination">
                     <li class="page-item" :class="{ disabled: currentPage === 0 }">
                         <button class="page-link" @click="changePage(currentPage - 1)">上一頁</button>
                     </li>
                     <li class="page-item disabled">
                         <span class="page-link">第 {{ currentPage + 1 }} 頁 / 共 {{ totalPages }} 頁</span>
                     </li>
                     <li class="page-item" :class="{ disabled: currentPage === totalPages - 1 }">
                         <button class="page-link" @click="changePage(currentPage + 1)">下一頁</button>
                     </li>
                 </ul>
             </nav>
         </div>

      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div class="modal fade" id="itemModal" tabindex="-1" ref="itemModalElement">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{{ isEditMode ? '編輯施工項目' : '新增施工項目' }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form @submit.prevent>
                        <div class="mb-3">
                            <label class="form-label required">名稱 <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="formData.name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">描述</label>
                            <textarea class="form-control" v-model="formData.description" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" @click="saveItem">儲存</button>
                </div>
            </div>
        </div>
    </div>

    <!-- 共用全畫面 Loading -->
    <LoadingOverlay :show="aiSuggestLoading" text="AI 生成中..." />

    <!-- AI 確認說明 Modal：先告知即將做什麼，用戶確認後再執行 -->
    <div class="modal fade" id="aiConfirmModal" tabindex="-1" ref="aiConfirmModalElement">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">依標單 AI 生成施工項目</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-0">
              即將依<strong>目前版本</strong>的標單由 AI 產出施工項目建議。完成後您可勾選要新增的項目，確認後僅會<strong>併入新增</strong>，不會覆蓋既有施工項目。
            </p>
            <p class="mb-0 mt-2 text-muted small">是否繼續？</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" @click="confirmThenFetchAiSuggest">
              <i class="fa fa-wand-magic-sparkles me-1"></i>確認並生成
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI 建議 Modal：顯示建議清單，勾選後併入新增 -->
    <div class="modal fade" id="aiSuggestModal" tabindex="-1" ref="aiSuggestModalElement">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">依標單 AI 生成施工項目</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p v-if="aiSuggestError" class="text-danger mb-2">{{ aiSuggestError }}</p>
                    <p v-else-if="aiSuggestions.length === 0 && !aiSuggestLoading" class="text-muted mb-2">
                        目前版本無標單資料，或 AI 未產出建議。請先匯入標單或改用手動新增。
                    </p>
                    <div v-else class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th style="width: 40px;">
                                        <input type="checkbox" v-model="aiSelectAll" @change="toggleAiSelectAll" title="全選" />
                                    </th>
                                    <th>名稱</th>
                                    <th>描述</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(row, idx) in aiSuggestions" :key="idx">
                                    <td>
                                        <input type="checkbox" v-model="row.selected" />
                                    </td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="row.name" /></td>
                                    <td><input type="text" class="form-control form-control-sm" v-model="row.description" placeholder="選填" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" :disabled="aiSuggestSaving || selectedAiCount === 0" @click="confirmAiSuggestCreate">
                        <i class="fa me-1" :class="aiSuggestSaving ? 'fa-spinner fa-spin' : 'fa-check'"></i>
                        {{ aiSuggestSaving ? '新增中...' : `確認新增 (${selectedAiCount})` }}
                    </button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'
import { ref, onMounted, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { Modal } from 'bootstrap'
import { 
    getConstructionMajorItems, 
    deleteConstructionMajorItem,
    createConstructionMajorItem,
    getConstructionMajorItemAiSuggest,
    copyConstructionMajorItemsFromPrevious,
    updateConstructionMajorItem,
    type ConstructionMajorItem,
    type MajorItemSuggestionItem
} from '@/api/pcces'
import { getDesignChangeList } from '@/api/designChange'

const router = useRouter()
const workspaceStore = useWorkspaceStore()

// 獲取當前工程 ID
const constructionId = computed(() => workspaceStore.currentProject?.id || '')
// 變更設計版本：null = 原契約，數字 = 該變更設計 ID
const selectedDesignChangeId = ref<number | null>(null)
const items = ref<ConstructionMajorItem[]>([])
const loading = ref(false)
const isCopying = ref(false)
/** 變更設計列表（依生效日升序），用於計算「前一個版本」 */
const designChangeList = ref<{ id: number; effectiveDate: string }[]>([])
const keyword = ref('')
const currentPage = ref(0)
const totalPages = ref(0)
const pageSize = ref(20)

// Modal related
const itemModalElement = ref<HTMLElement | null>(null)
let bsModal: Modal | null = null
const isEditMode = ref(false)
const formData = reactive<{ id?: string; name: string; description?: string }>({
    name: '',
    description: ''
})

/** 複製時使用的來源版本：null = 原契約，數字 = 該變更設計 ID */
const sourceDesignChangeIdForCopy = computed(() => {
  const current = selectedDesignChangeId.value
  if (current == null) return null
  const list = designChangeList.value
  const idx = list.findIndex((d) => d.id === current)
  if (idx <= 0) return null
  return list[idx - 1]?.id ?? null
})

// 依標單 AI 生成
const aiConfirmModalElement = ref<HTMLElement | null>(null)
let bsAiConfirmModal: Modal | null = null
const aiSuggestModalElement = ref<HTMLElement | null>(null)
let bsAiSuggestModal: Modal | null = null
const aiSuggestLoading = ref(false)
const aiSuggestSaving = ref(false)
const aiSuggestError = ref('')
interface AiSuggestRow extends MajorItemSuggestionItem { selected: boolean }
const aiSuggestions = ref<AiSuggestRow[]>([])
const aiSelectAll = ref(false)
const selectedAiCount = computed(() => aiSuggestions.value.filter((r) => r.selected).length)
function toggleAiSelectAll() {
  aiSuggestions.value.forEach((r) => { r.selected = aiSelectAll.value })
}
/** 點擊「依標單 AI 生成」→ 先開說明 Modal，由用戶確認後再執行 */
function openAiSuggest() {
  if (!constructionId.value) return
  aiSuggestError.value = ''
  bsAiConfirmModal?.show()
}
/** 用戶確認後：關閉說明 Modal、顯示 loading、呼叫 API、再開建議清單 Modal */
async function confirmThenFetchAiSuggest() {
  if (!constructionId.value) return
  bsAiConfirmModal?.hide()
  aiSuggestError.value = ''
  aiSuggestions.value = []
  aiSelectAll.value = false
  aiSuggestLoading.value = true
  try {
    const res = await getConstructionMajorItemAiSuggest(constructionId.value, selectedDesignChangeId.value)
    aiSuggestions.value = (res.suggestions || []).map((s) => ({
      name: s.name || '',
      description: s.description || '',
      selected: true
    }))
    bsAiSuggestModal?.show()
  } catch (e) {
    console.error(e)
    aiSuggestError.value = '生成失敗，請稍後再試或手動新增。'
    bsAiSuggestModal?.show()
  } finally {
    aiSuggestLoading.value = false
  }
}
async function confirmAiSuggestCreate() {
  if (!constructionId.value || aiSuggestSaving.value) return
  const toCreate = aiSuggestions.value.filter((r) => r.selected && (r.name || '').trim())
  if (toCreate.length === 0) return
  aiSuggestSaving.value = true
  try {
    for (const row of toCreate) {
      await createConstructionMajorItem(constructionId.value, {
        name: row.name.trim(),
        description: row.description?.trim() || undefined,
        designChangeId: selectedDesignChangeId.value ?? undefined
      })
    }
    bsAiSuggestModal?.hide()
    loadItems()
    alert(`已新增 ${toCreate.length} 筆施工大項`)
  } catch (e) {
    console.error(e)
    alert('部分或全部新增失敗，請檢查後再試')
  } finally {
    aiSuggestSaving.value = false
  }
}

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

const loadItems = async () => {
  if (!constructionId.value) {
    alert('請先選擇工程案')
    return
  }
  
  loading.value = true
  try {
    const response = await getConstructionMajorItems(constructionId.value, {
        designChangeId: selectedDesignChangeId.value,
        keyword: keyword.value,
        page: currentPage.value,
        size: pageSize.value
    })
    items.value = response.content
    totalPages.value = response.totalPages
    if (response.totalPages > 0 && currentPage.value >= response.totalPages) {
        currentPage.value = 0
        loadItems()
    }
  } catch (e) {
    console.error(e)
    alert('載入資料失敗')
  } finally {
    loading.value = false
  }
}

const changePage = (page: number) => {
    if (page < 0 || page >= totalPages.value) return
    currentPage.value = page
    loadItems()
}

const resetForm = () => {
    formData.id = undefined
    formData.name = ''
    formData.description = ''
}

const createItem = () => {
    resetForm()
    isEditMode.value = false
    bsModal?.show()
}

const editItem = (item: ConstructionMajorItem) => {
    resetForm()
    isEditMode.value = true
    formData.id = item.id
    formData.name = item.name
    formData.description = item.description
    // sourcePccesCode is not typically editable after copy, or just let it be empty
    bsModal?.show()
}

const saveItem = async () => {
    if (!constructionId.value) {
        alert('請先選擇工程案')
        return
    }
    
    if (!formData.name) {
        alert('請輸入施工項目名稱')
        return
    }

    try {
        if (isEditMode.value && formData.id) {
            await updateConstructionMajorItem(constructionId.value, formData.id, {
              name: formData.name,
              description: formData.description
            })
            alert('更新成功')
        } else {
            await createConstructionMajorItem(constructionId.value, {
                name: formData.name,
                description: formData.description,
                designChangeId: selectedDesignChangeId.value
            })
            alert('新增成功')
        }
        bsModal?.hide()
        loadItems()
    } catch (e) {
        console.error(e)
        alert('儲存失敗')
    }
}

const goToStandards = (item: ConstructionMajorItem) => {
  router.push(`/forms/b-construction-maintenance/${item.id}/standards`)
}

const handleDelete = async (item: ConstructionMajorItem) => {
    if (!constructionId.value) {
        alert('請先選擇工程案')
        return
    }
    
    if (confirm(`確定刪除施工項目 "${item.name}" 及其所有標準明細？此動作無法復原。`)) {
        try {
            await deleteConstructionMajorItem(constructionId.value, item.id)
            alert('刪除成功')
            loadItems()
        } catch (e) {
            console.error(e)
            alert('刪除失敗')
        }
    }
}

function onVersionChange(designChangeId: number | null) {
  selectedDesignChangeId.value = designChangeId
  currentPage.value = 0
  loadItems()
}

async function copyFromPrevious() {
  if (!constructionId.value || selectedDesignChangeId.value == null) return
  if (!confirm('確定要將前一個版本的施工大項（含抽查標準）複製到目前版本嗎？若目前版本已有項目則會一併保留。')) return
  isCopying.value = true
  try {
    const source = sourceDesignChangeIdForCopy.value ?? undefined
    const res = await copyConstructionMajorItemsFromPrevious(
      constructionId.value,
      source,
      selectedDesignChangeId.value
    )
    alert(`已複製 ${res.copiedCount} 筆施工大項`)
    loadItems()
  } catch (e) {
    console.error(e)
    alert('複製失敗，請稍後再試')
  } finally {
    isCopying.value = false
  }
}

watch(constructionId, async () => {
  selectedDesignChangeId.value = null
  currentPage.value = 0
  designChangeList.value = []
  if (constructionId.value) await fetchDesignChangeList()
  loadItems()
})

onMounted(async () => {
  if (constructionId.value) await fetchDesignChangeList()
  loadItems()
  if (itemModalElement.value) bsModal = new Modal(itemModalElement.value)
  if (aiConfirmModalElement.value) bsAiConfirmModal = new Modal(aiConfirmModalElement.value)
  if (aiSuggestModalElement.value) bsAiSuggestModal = new Modal(aiSuggestModalElement.value)
})
</script>

<style scoped>
.form-b-construction-maintenance-page {
  padding: 1rem;
}
</style>



