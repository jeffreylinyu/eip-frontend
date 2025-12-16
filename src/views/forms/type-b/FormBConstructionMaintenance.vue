<template>
  <div class="form-b-construction-maintenance-page">
    <PageHeader
      title="施工項目維護"
      icon="fa fa-tools"
      :breadcrumbs="[
        { text: '文件與表單管理', href: 'javascript:;' },
        { text: 'B類表單', href: 'javascript:;' },
        { text: '施工項目維護', active: true }
      ]"
    />

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
            <div>
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
                         <th class="text-center" style="width: 100px;">版本</th>
                         <th class="text-center" style="width: 120px;">生效日期</th>
                         <th class="text-center" style="width: 100px;">狀態</th>
                         <th class="text-center" style="width: 150px;">操作</th>
                     </tr>
                 </thead>
                 <tbody>
                     <tr v-if="loading">
                         <td colspan="6" class="text-center py-5 text-muted">包含載入中...</td>
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
                             <td class="text-center">v{{ item.version || 1 }}</td>
                             <td class="text-center">{{ item.effectiveStartDate || '-' }}</td>
                             <td class="text-center">
                                 <span class="badge" :class="item.isActive ? 'bg-success' : 'bg-secondary'">
                                     {{ item.isActive ? '啟用' : '停用' }}
                                 </span>
                             </td>
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
                         <td colspan="6" class="text-center py-5 text-muted">
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
                    <h5 class="modal-title">{{ isEditMode ? '編輯施工大項' : '新增施工大項' }}</h5>
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
                        <div class="mb-3" v-if="!isEditMode">
                            <label class="form-label">來源 PCCES 編碼 (選填)</label>
                            <input type="text" class="form-control" v-model="formData.sourcePccesCode" placeholder="例如: CM01">
                            <div class="form-text">若填寫，將自動複製該編碼的標準明細</div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">版本</label>
                                <input type="number" class="form-control" v-model="formData.version">
                            </div>
                            <div class="col-md-6 mb-3 align-self-end">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="isActiveSwitch" v-model="formData.isActive">
                                    <label class="form-check-label" for="isActiveSwitch">啟用狀態</label>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">生效開始日期</label>
                                <input type="date" class="form-control" v-model="formData.effectiveStartDate">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label">生效結束日期</label>
                                <input type="date" class="form-control" v-model="formData.effectiveEndDate">
                            </div>
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
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Modal } from 'bootstrap'
import { 
    getConstructionMajorItems, 
    deleteConstructionMajorItem,
    createConstructionMajorItem,
    updateConstructionMajorItem,
    type ConstructionMajorItem,
    type ConstructionMajorItemRequest
} from '@/api/pcces'

const router = useRouter()
const items = ref<ConstructionMajorItem[]>([])
const loading = ref(false)
const keyword = ref('')
const currentPage = ref(0)
const totalPages = ref(0)
const pageSize = ref(20)

// Modal related
const itemModalElement = ref<HTMLElement | null>(null)
let bsModal: Modal | null = null
const isEditMode = ref(false)
const formData = reactive<ConstructionMajorItemRequest & { id?: string }>({
    name: '',
    description: '',
    isActive: true,
    version: 1,
    effectiveStartDate: '',
    effectiveEndDate: '',
    sourcePccesCode: ''
})

const loadItems = async () => {
  loading.value = true
  try {
    const response = await getConstructionMajorItems({
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
    formData.isActive = true
    formData.version = 1
    formData.effectiveStartDate = ''
    formData.effectiveEndDate = ''
    formData.sourcePccesCode = ''
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
    formData.isActive = item.isActive
    formData.version = item.version
    formData.effectiveStartDate = item.effectiveStartDate
    formData.effectiveEndDate = item.effectiveEndDate
    // sourcePccesCode is not typically editable after copy, or just let it be empty
    bsModal?.show()
}

const saveItem = async () => {
    if (!formData.name) {
        alert('請輸入施工項目名稱')
        return
    }

    try {
        if (isEditMode.value && formData.id) {
            await updateConstructionMajorItem(formData.id, formData)
            alert('更新成功')
        } else {
            await createConstructionMajorItem(formData)
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
    if (confirm(`確定刪除施工項目 "${item.name}" 及其所有標準明細？此動作無法復原。`)) {
        try {
            await deleteConstructionMajorItem(item.id)
            alert('刪除成功')
            loadItems()
        } catch (e) {
            console.error(e)
            alert('刪除失敗')
        }
    }
}

onMounted(() => {
  loadItems()
  if (itemModalElement.value) {
      bsModal = new Modal(itemModalElement.value)
  }
})
</script>

<style scoped>
.form-b-construction-maintenance-page {
  padding: 1rem;
}
</style>



