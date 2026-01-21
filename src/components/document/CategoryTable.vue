<template>
  <div class="report-card mb-3">
    <div class="report-card__header cursor-pointer user-select-none" role="button" @click="toggleCollapse">
      <div class="d-flex align-items-center">
        <!-- 展開/收合圖示 -->
        <i 
          class="bi me-2 transition-transform text-primary" 
          :class="isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'"
        ></i>
        
        <h5 class="mb-0 fw-bold">{{ title }}</h5>
        
        <!-- D 類特殊標記 -->
        <span v-if="localItems.length > 0" class="badge bg-secondary ms-3 rounded-pill">
          {{ localItems.length }}
        </span>
      </div>
      
      <!-- 標頭按鈕區 -->
      <div class="d-flex gap-2" @click.stop>
        <!-- D 類同步按鈕 -->
        <button 
          v-if="isDynamic" 
          class="btn btn-sm btn-outline-warning" 
          @click="emit('sync')"
          title="重新同步施工大項"
        >
          <i class="bi bi-arrow-repeat me-1"></i> 同步施工大項
        </button>
      </div>
    </div>
    
    <div v-show="!isCollapsed" class="report-card__body">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th style="width: 50px">#</th>
              <th style="width: 80px">編號</th>
              <th>文件名稱</th>
              <th style="width: 100px">保存年限</th>
              <th style="width: 150px">操作</th>
            </tr>
          </thead>
          <draggable 
            v-if="localItems.length > 0"
            v-model="localItems" 
            tag="tbody" 
            item-key="id"
            handle=".drag-handle"
            @end="onDragEnd"
          >
            <template #item="{ element: item, index }">
              <tr 
                class="draggable-row"
                :class="{ 'table-active': dragIndex === index }"
              >
                <!-- 拖拉手把 -->
                <td class="text-center text-muted drag-handle cursor-move" title="拖拉排序">
                  <i class="bi bi-grip-vertical"></i>
                </td>
                
                <!-- 編號 -->
                <td>{{ item.itemNumber }}</td>
                
                <!-- 文件名稱 (編輯模式/顯示模式) -->
                <td>
                  <div v-if="editingId === item.id">
                    <input 
                      type="text" 
                      class="form-control form-control-sm" 
                      v-model="editForm.documentName" 
                      placeholder="請輸入文件名稱"
                      ref="nameInput"
                      @keyup.enter="saveEdit(item)"
                      @keyup.esc="cancelEdit"
                    >
                  </div>
                  <div v-else @click="startEdit(item)" class="cursor-pointer">
                    {{ item.documentName }}
                  </div>
                </td>
                
                <!-- 保存年限 -->
                <td>
                  <div v-if="editingId === item.id">
                    <input 
                      type="number" 
                      class="form-control form-control-sm" 
                      v-model.number="editForm.retentionYears"
                       @keyup.enter="saveEdit(item)"
                    >
                  </div>
                  <div v-else @click="startEdit(item)" class="cursor-pointer">
                    {{ item.retentionYears }} 年
                  </div>
                </td>
                
                <!-- 操作按鈕 -->
                <td>
                  <div v-if="editingId === item.id" class="btn-group btn-group-sm">
                    <button class="btn btn-success" @click="saveEdit(item)">
                      <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn btn-secondary" @click="cancelEdit">
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                  <div v-else class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" @click="startEdit(item)" title="編輯">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button 
                      v-if="!item.isDefault" 
                      class="btn btn-outline-danger" 
                      @click="deleteItem(item)" 
                      title="刪除"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </draggable>
          
          <!-- 無資料顯示 (vuedraggable 不處理空狀態，所以另外寫) -->
          <tbody v-else>
            <tr>
              <td colspan="5" class="text-center text-muted py-3">
                尚無分類項目
              </td>
            </tr>
          </tbody>
          
          <!-- 表尾新增區 -->
          <tfoot>
            <tr v-if="isAdding" class="add-row">
              <td></td>
              <td><span class="badge bg-warning text-dark">New</span></td>
              <td>
                <input 
                  type="text" 
                  class="form-control form-control-sm" 
                  v-model="addForm.documentName" 
                  placeholder="輸入新文件名稱"
                  ref="addInput"
                  @keyup.enter="confirmAdd"
                  @keyup.esc="cancelAdd"
                >
              </td>
              <td>
                <input 
                  type="number" 
                  class="form-control form-control-sm" 
                  v-model.number="addForm.retentionYears" 
                  placeholder="年限"
                  @keyup.enter="confirmAdd"
                >
              </td>
              <td>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-success" @click="confirmAdd">儲存</button>
                  <button class="btn btn-secondary" @click="cancelAdd">取消</button>
                </div>
              </td>
            </tr>
            <tr v-else>
              <td colspan="5">
                <button class="btn btn-sm btn-link text-decoration-none" @click="startAdd">
                  <i class="bi bi-plus-lg"></i> 新增項目
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import draggable from 'vuedraggable'
import type { DocumentClassification } from '@/api/documentClassification'

const props = defineProps<{
  category: string
  title: string
  items: DocumentClassification[]
  isDynamic?: boolean // 是否為 D 類 (無法手動新增/刪除，只能同步)
}>()

const emit = defineEmits<{
  (e: 'add', data: { documentName: string, retentionYears: number }): void
  (e: 'update', id: number, data: { documentName: string, retentionYears: number }): void
  (e: 'delete', id: number): void
  (e: 'sync'): void
  (e: 'reorder', items: DocumentClassification[]): void
}>()

// 本地項目列表 (用於顯示與拖拉)
const localItems = ref<DocumentClassification[]>([])
const isCollapsed = ref(false)


// 同步 props 到 localItems
watch(() => props.items, (newItems) => {
  localItems.value = [...newItems]
}, { immediate: true })

// --- 展開/收合 ---
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// --- 新增邏輯 ---
const isAdding = ref(false)
const addForm = ref({
  documentName: '',
  retentionYears: 15
})
const addInput = ref<HTMLInputElement | null>(null)

const startAdd = async () => {
  isAdding.value = true
  addForm.value = { documentName: '', retentionYears: 15 }
  await nextTick()
  addInput.value?.focus()
}

const cancelAdd = () => {
  isAdding.value = false
}

const confirmAdd = () => {
  if (!addForm.value.documentName.trim()) {
    alert('請輸入文件名稱')
    return
  }
  emit('add', { ...addForm.value })
  isAdding.value = false
}

// --- 編輯邏輯 ---
const editingId = ref<number | null>(null)
const editForm = ref({
  documentName: '',
  retentionYears: 15
})
const nameInput = ref<HTMLInputElement | null>(null)

const startEdit = async (item: DocumentClassification) => {
  // if (props.isDynamic) return // D 類暫時不允許編輯
  
  editingId.value = item.id
  editForm.value = {
    documentName: item.documentName,
    retentionYears: item.retentionYears
  }
  await nextTick()
  const input = document.querySelector(`input[value="${item.documentName}"]`) as HTMLInputElement
  if (input) input.focus()
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = (item: DocumentClassification) => {
  if (!editForm.value.documentName.trim()) {
    alert('請輸入文件名稱')
    return
  }
  emit('update', item.id, { ...editForm.value })
  editingId.value = null
}

// --- 刪除邏輯 ---
const deleteItem = (item: DocumentClassification) => {
  if (confirm(`確定刪除「${item.documentName}」嗎？`)) {
    emit('delete', item.id)
  }
}

// --- 拖拉排序邏輯 (Vue.Draggable) ---
const dragIndex = ref<number | null>(null)

const onDragEnd = () => {
  recalculateItemNumbers()
  emit('reorder', localItems.value)
  dragIndex.value = null
}

const recalculateItemNumbers = () => {
  localItems.value.forEach((item, index) => {
    item.itemNumber = (index + 1).toString().padStart(2, '0')
  })
}
</script>

<style scoped>
.report-card {
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  color: var(--bs-body-color);
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.375rem;
}

.report-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--bs-border-color-translucent);
  background: linear-gradient(
    135deg,
    rgba(var(--bs-primary-rgb), 0.08) 0%,
    rgba(var(--bs-primary-rgb), 0.03) 60%,
    transparent 100%
  );
  border-radius: 0.375rem 0.375rem 0 0;
}

.report-card__body {
  padding: 0;
}

.cursor-pointer {
  cursor: pointer;
}
.cursor-move {
  cursor: move;
}
.draggable-row.table-active {
  opacity: 0.5;
  background-color: #f8f9fa;
}

.add-row {
  background-color: rgba(255, 193, 7, 0.1) !important;
}
.add-row:hover {
  background-color: rgba(255, 193, 7, 0.15) !important;
}
</style>
