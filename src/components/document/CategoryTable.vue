<template>
  <div class="report-card mb-3" :class="{ 'category-table--dark-inputs': darkInputs }">
    <div class="report-card__header cursor-pointer user-select-none" role="button" @click="toggleCollapse">
      <div class="d-flex align-items-start flex-grow-1 min-w-0 me-2">
        <i
          class="bi me-2 mt-1 flex-shrink-0 transition-transform text-primary"
          :class="isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'"
        ></i>
        <div class="min-w-0 flex-grow-1">
          <div class="d-flex align-items-center flex-wrap gap-2">
            <h5 class="mb-0 fw-bold">{{ title }}</h5>
            <span v-if="localItems.length > 0" class="badge bg-secondary rounded-pill">
              {{ localItems.length }}
            </span>
          </div>
          <p v-if="headerNote" class="mb-0 mt-1 small text-info">
            <i class="bi bi-eye me-1"></i>{{ headerNote }}
          </p>
        </div>
      </div>

      <!-- 標頭按鈕區 -->
      <div class="d-flex flex-wrap align-items-center justify-content-end gap-2 flex-shrink-0" @click.stop>
        <button
          v-if="isDynamic"
          class="btn btn-sm btn-outline-warning"
          @click="emit('sync')"
          title="重新同步施工大項"
        >
          <i class="bi bi-arrow-repeat me-1"></i> 同步施工大項
        </button>
        <button
          v-if="importSubdivisions"
          type="button"
          class="btn btn-sm btn-outline-info"
          title="依目前版本分項工程批次新增 E 類自主檢查表"
          @click="emit('importSubdivisions')"
        >
          <i class="bi bi-box-arrow-in-down me-1"></i> 帶入分項
        </button>
        <slot name="headerActions" />
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
              <th v-if="showScheduleColumn" style="min-width: 160px">規定提送日程</th>
              <th style="width: 100px">保存年限</th>
              <template v-if="planScheduleExtras">
                <th style="min-width: 160px">預定施工日期</th>
                <th style="min-width: 160px">預定計畫書提送日期</th>
                <th style="min-width: 140px">備註</th>
              </template>
              <th v-if="showApplySidebarColumn" style="width: 130px">側邊欄套用</th>
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
                
                <!-- 文件名稱 (編輯模式 / 非預設內聯 / 顯示) -->
                <td @click.stop>
                  <div v-if="editingId === item.id">
                    <template v-if="isDocumentNameLocked(item)">
                      <div class="small text-muted py-1 px-1">
                        {{ item.documentName }}
                      </div>
                    </template>
                    <input
                      v-else
                      type="text"
                      class="form-control form-control-sm"
                      v-model="editForm.documentName"
                      placeholder="請輸入文件名稱"
                      ref="nameInput"
                      @keyup.enter="saveEdit(item)"
                      @keyup.esc="cancelEdit"
                    />
                  </div>
                  <template v-else-if="inlineEditNonDefault && !item.isDefault">
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="item.documentName"
                      placeholder="文件名稱"
                      @blur="scheduleFlushInlineRow(item)"
                    />
                  </template>
                  <div
                    v-else
                    @click="!isDocumentNameLocked(item) && startEdit(item)"
                    class="cursor-pointer"
                    :class="{ 'text-muted': isDocumentNameLocked(item) }"
                  >
                    {{ item.documentName }}
                  </div>
                </td>

                <!-- 規定提送日程 -->
                <td v-if="showScheduleColumn" @click.stop>
                  <div v-if="editingId === item.id">
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="editForm.requiredSubmissionSchedule"
                      placeholder="例：訂約後30日內"
                      @keyup.enter="saveEdit(item)"
                    />
                  </div>
                  <template v-else-if="inlineEditNonDefault && !item.isDefault">
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="item.requiredSubmissionSchedule"
                      placeholder="規定提送日程"
                      @blur="scheduleFlushInlineRow(item)"
                    />
                  </template>
                  <div v-else @click="startEdit(item)" class="cursor-pointer small">
                    {{ item.requiredSubmissionSchedule || defaultScheduleText }}
                  </div>
                </td>

                <!-- 保存年限 -->
                <td @click.stop>
                  <div v-if="editingId === item.id">
                    <div v-if="allowNullRetention" class="d-flex flex-column gap-1">
                      <label class="small mb-0 d-flex align-items-center gap-1">
                        <input type="checkbox" v-model="editForm.retentionPermanent" />
                        永久保存
                      </label>
                      <input
                        v-if="!editForm.retentionPermanent"
                        type="number"
                        class="form-control form-control-sm"
                        v-model.number="editForm.retentionYears"
                        @keyup.enter="saveEdit(item)"
                      />
                    </div>
                    <input
                      v-else
                      type="number"
                      class="form-control form-control-sm"
                      v-model.number="editForm.retentionYears"
                      @keyup.enter="saveEdit(item)"
                    />
                  </div>
                  <template v-else-if="inlineEditNonDefault && !item.isDefault">
                    <div v-if="allowNullRetention" class="d-flex flex-column gap-1">
                      <label class="small mb-0 d-flex align-items-center gap-1">
                        <input
                          type="checkbox"
                          :checked="item.retentionYears == null"
                          @change="onInlineRetentionPermanentChange(item, $event)"
                        />
                        永久保存
                      </label>
                      <input
                        v-if="item.retentionYears != null"
                        type="number"
                        class="form-control form-control-sm"
                        v-model.number="item.retentionYears"
                        min="0"
                        @blur="scheduleFlushInlineRow(item)"
                      />
                    </div>
                    <input
                      v-else
                      type="number"
                      class="form-control form-control-sm"
                      v-model.number="item.retentionYears"
                      min="0"
                      @blur="scheduleFlushInlineRow(item)"
                    />
                  </template>
                  <div v-else @click="startEdit(item)" class="cursor-pointer">
                    {{ displayRetention(item) }}
                  </div>
                </td>

                <slot v-if="planScheduleExtras" name="planScheduleExtras" :item="item" />
                <td v-if="showApplySidebarColumn" class="text-center" @click.stop>
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="item.applyToSidebar !== false"
                    @change="onApplyToSidebarChange(item, $event)"
                  />
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
                    <button
                      v-if="item.isDefault || !inlineEditNonDefault"
                      class="btn btn-outline-primary"
                      @click="startEdit(item)"
                      title="編輯"
                    >
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
              <td :colspan="tableColSpan" class="text-center text-muted py-3">
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
              <td v-if="showScheduleColumn">
                <input
                  type="text"
                  class="form-control form-control-sm"
                  v-model="addForm.requiredSubmissionSchedule"
                  placeholder="規定提送日程"
                  @keyup.enter="confirmAdd"
                >
              </td>
              <td>
                <div v-if="allowNullRetention" class="d-flex flex-column gap-1">
                  <label class="small mb-0 d-flex align-items-center gap-1">
                    <input type="checkbox" v-model="addForm.retentionPermanent" />
                    永久保存
                  </label>
                  <input
                    v-if="!addForm.retentionPermanent"
                    type="number"
                    class="form-control form-control-sm"
                    v-model.number="addForm.retentionYears"
                    placeholder="年限"
                    @keyup.enter="confirmAdd"
                  >
                </div>
                <input
                  v-else
                  type="number"
                  class="form-control form-control-sm"
                  v-model.number="addForm.retentionYears"
                  placeholder="年限"
                  @keyup.enter="confirmAdd"
                >
              </td>
              <template v-if="planScheduleExtras">
                <td></td>
                <td></td>
                <td></td>
              </template>
              <td v-if="showApplySidebarColumn"></td>
              <td>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-success" @click="confirmAdd">儲存</button>
                  <button class="btn btn-secondary" @click="cancelAdd">取消</button>
                </div>
              </td>
            </tr>
            <tr v-else>
              <td :colspan="tableColSpan">
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
import { ref, watch, nextTick, computed, onUnmounted } from 'vue'
import draggable from 'vuedraggable'
import type { DocumentClassification } from '@/api/documentClassification'

const defaultScheduleText = '訂約後30日內'

const props = withDefaults(
  defineProps<{
    category: string
    title: string
    items: DocumentClassification[]
    isDynamic?: boolean // 是否為 D 類 (無法手動新增/刪除，只能同步)
    /** 保存年限可為 null（永久），用於營造端文件分類 */
    allowNullRetention?: boolean
    /** E 類：帶入分項工程 */
    importSubdivisions?: boolean
    /** 顯示「規定提送日程」欄的大項代碼，例如監造 ['B']、營造 P 類 ['P'] */
    scheduleColumnCategories?: string[]
    /** 標題下方提示（例如監造 B 類：營造端可預覽） */
    headerNote?: string
    /** P-1：在「保存年限」與「操作」之間插入預定施工／提送／備註（需父層提供 #planScheduleExtras） */
    planScheduleExtras?: boolean
    /** 非預設列：文件名稱／提送日程／年限改為欄內直接編輯（不需按編輯鈕） */
    inlineEditNonDefault?: boolean
    /** 表內輸入框深色樣式（與 P-1 頁一致） */
    darkInputs?: boolean
    /** 鎖定預設列「文件名稱」不可編輯 */
    lockDefaultDocumentName?: boolean
    /** 顯示「套用到側邊欄」欄位（營造端 P 類） */
    showApplySidebarColumn?: boolean
  }>(),
  {
    allowNullRetention: false,
    importSubdivisions: false,
    scheduleColumnCategories: () => ['B'],
    planScheduleExtras: false,
    inlineEditNonDefault: false,
    darkInputs: false,
    lockDefaultDocumentName: false,
    showApplySidebarColumn: false
  }
)

const showScheduleColumn = computed(() => props.scheduleColumnCategories.includes(props.category))
const showApplySidebarColumn = computed(() => props.showApplySidebarColumn)
const isDocumentNameLocked = (item: DocumentClassification) =>
  props.lockDefaultDocumentName && item.isDefault

function displayRetention(item: DocumentClassification): string {
  if (props.allowNullRetention && item.retentionYears == null) return '永久'
  if (item.retentionYears == null) return '—'
  return `${item.retentionYears} 年`
}
const tableColSpan = computed(() => {
  let n = showScheduleColumn.value ? 6 : 5
  if (props.planScheduleExtras) n += 3
  if (showApplySidebarColumn.value) n += 1
  return n
})

const emit = defineEmits<{
  (e: 'add', data: { documentName: string, retentionYears: number | null, requiredSubmissionSchedule?: string }): void
  (e: 'update', id: number, data: {
    documentName: string
    retentionYears?: number | null
    retentionPermanent?: boolean
    requiredSubmissionSchedule?: string
  }): void
  (e: 'delete', id: number): void
  (e: 'sync'): void
  (e: 'reorder', items: DocumentClassification[]): void
  (e: 'importSubdivisions'): void
  (e: 'toggleApplySidebar', id: number, applyToSidebar: boolean): void
}>()

// 本地項目列表 (用於顯示與拖拉)
const localItems = ref<DocumentClassification[]>([])
const isCollapsed = ref(false)

const inlineRowFlushTimers = new Map<number, ReturnType<typeof setTimeout>>()

function cancelInlineFlushTimer(id: number) {
  const t = inlineRowFlushTimers.get(id)
  if (t != null) {
    clearTimeout(t)
    inlineRowFlushTimers.delete(id)
  }
}

function scheduleFlushInlineRow(item: DocumentClassification) {
  if (!props.inlineEditNonDefault || item.isDefault) return
  const id = item.id
  cancelInlineFlushTimer(id)
  inlineRowFlushTimers.set(
    id,
    window.setTimeout(() => {
      inlineRowFlushTimers.delete(id)
      flushInlineRow(item)
    }, 350)
  )
}

function flushInlineRow(item: DocumentClassification) {
  if (!props.inlineEditNonDefault || item.isDefault || props.isDynamic) return
  if (!item.documentName?.trim()) {
    alert('請輸入文件名稱')
    return
  }
  const base = {
    documentName: item.documentName.trim(),
    ...(showScheduleColumn.value
      ? {
          requiredSubmissionSchedule:
            (typeof item.requiredSubmissionSchedule === 'string'
              ? item.requiredSubmissionSchedule.trim()
              : '') || defaultScheduleText
        }
      : {})
  }
  if (props.allowNullRetention) {
    const perm = item.retentionYears == null
    emit('update', item.id, {
      ...base,
      ...(perm ? { retentionPermanent: true as const } : { retentionYears: item.retentionYears })
    })
  } else {
    emit('update', item.id, {
      ...base,
      retentionYears: item.retentionYears as number
    })
  }
}

function onInlineRetentionPermanentChange(item: DocumentClassification, e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (checked) {
    item.retentionYears = null
  } else if (item.retentionYears == null) {
    item.retentionYears = 15
  }
  cancelInlineFlushTimer(item.id)
  flushInlineRow(item)
}

function onApplyToSidebarChange(item: DocumentClassification, e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  item.applyToSidebar = checked
  emit('toggleApplySidebar', item.id, checked)
}

// 同步 props 到 localItems
watch(
  () => props.items,
  (newItems) => {
    inlineRowFlushTimers.forEach((t) => clearTimeout(t))
    inlineRowFlushTimers.clear()
    localItems.value = newItems.map((row) => ({
      ...row,
      requiredSubmissionSchedule:
        row.requiredSubmissionSchedule === null || row.requiredSubmissionSchedule === undefined
          ? ''
          : row.requiredSubmissionSchedule
    }))
  },
  { immediate: true }
)

onUnmounted(() => {
  inlineRowFlushTimers.forEach((t) => clearTimeout(t))
  inlineRowFlushTimers.clear()
})

// --- 展開/收合 ---
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// --- 新增邏輯 ---
const isAdding = ref(false)
const addForm = ref({
  documentName: '',
  retentionYears: 15 as number | null,
  retentionPermanent: false,
  requiredSubmissionSchedule: defaultScheduleText
})
const addInput = ref<HTMLInputElement | null>(null)

const startAdd = async () => {
  isAdding.value = true
  addForm.value = {
    documentName: '',
    retentionYears: 15,
    retentionPermanent: false,
    requiredSubmissionSchedule: defaultScheduleText
  }
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
  const retentionYears =
    props.allowNullRetention && addForm.value.retentionPermanent ? null : addForm.value.retentionYears
  emit('add', {
    documentName: addForm.value.documentName,
    retentionYears,
    ...(showScheduleColumn.value
      ? { requiredSubmissionSchedule: addForm.value.requiredSubmissionSchedule?.trim() || defaultScheduleText }
      : {})
  })
  isAdding.value = false
}

// --- 編輯邏輯 ---
const editingId = ref<number | null>(null)
const editForm = ref({
  documentName: '',
  retentionYears: 15 as number | null,
  retentionPermanent: false,
  requiredSubmissionSchedule: defaultScheduleText
})
const nameInput = ref<HTMLInputElement | null>(null)

const startEdit = async (item: DocumentClassification) => {
  if (props.inlineEditNonDefault && !item.isDefault) return

  editingId.value = item.id
  const isPerm = props.allowNullRetention && item.retentionYears == null
  editForm.value = {
    documentName: item.documentName,
    retentionYears: isPerm ? 15 : (item.retentionYears ?? 15),
    retentionPermanent: isPerm,
    requiredSubmissionSchedule: item.requiredSubmissionSchedule?.trim() || defaultScheduleText
  }
  await nextTick()
  const input = document.querySelector(`input[value="${item.documentName}"]`) as HTMLInputElement
  if (input) input.focus()
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = (item: DocumentClassification) => {
  if (!isDocumentNameLocked(item) && !editForm.value.documentName.trim()) {
    alert('請輸入文件名稱')
    return
  }
  const base = {
    documentName: isDocumentNameLocked(item) ? item.documentName : editForm.value.documentName,
    ...(showScheduleColumn.value
      ? { requiredSubmissionSchedule: editForm.value.requiredSubmissionSchedule?.trim() ?? '' }
      : {})
  }
  if (props.allowNullRetention) {
    emit('update', item.id, {
      ...base,
      ...(editForm.value.retentionPermanent
        ? { retentionPermanent: true as const }
        : { retentionYears: editForm.value.retentionYears })
    })
  } else {
    emit('update', item.id, {
      ...base,
      retentionYears: editForm.value.retentionYears as number
    })
  }
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

.category-table--dark-inputs :deep(.form-control) {
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
}
.category-table--dark-inputs :deep(.form-control::placeholder) {
  color: rgba(255, 255, 255, 0.45);
}
.category-table--dark-inputs :deep(label.small) {
  color: rgba(226, 232, 240, 0.88);
}
.category-table--dark-inputs .draggable-row.table-active {
  background-color: rgba(255, 255, 255, 0.06) !important;
}
</style>
