<template>
  <div class="form-b-construction-maintenance-page a4-dark">
    <PageHeader
      title="施工項目"
      icon="fa fa-tools"
      :breadcrumbs="[
        { text: '文件與表單管理', href: 'javascript:;' },
        { text: 'B類表單', href: 'javascript:;' },
        { text: '施工項目', active: true }
      ]"
    >
      <template v-if="constructionId" #extra>
        <DesignChangeVersionSwitcher
          :construction-id="constructionId"
          source-type="SUPERVISORY"
          :model-value="selectedDesignChangeId"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <Card v-else class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div
          class="construction-toolbar-row d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 w-100"
        >
          <div
            class="construction-intro-box d-flex align-items-center gap-2 flex-grow-1 min-w-0"
            title="施工大項可連結施工抽查與安全衛生抽查標準；資料依變更設計版本分開維護。"
          >
            <i class="fa fa-info-circle construction-intro-icon flex-shrink-0" aria-hidden="true"></i>
            <span class="construction-intro-pill flex-shrink-0">說明</span>
            <span class="construction-intro-line small min-w-0">
              依版本維護<strong class="construction-kw">施工大項</strong>與<strong class="construction-kw">施工／安全衛生抽查標準</strong>；可 AI 依標單建議、複製前一版或匯出加密分項檔供營造<strong class="construction-hl">分項工程維護</strong>匯入。
            </span>
          </div>
          <div class="d-flex flex-wrap gap-2 align-items-center justify-content-end flex-shrink-0">
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
            <div v-if="selectedDesignChangeId != null" class="btn-group">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary dropdown-toggle"
                :disabled="isCopying"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="自前一個變更設計版本複製施工大項（含施工與安全衛生抽查標準）"
              >
                <i class="fa me-1" :class="isCopying ? 'fa-spinner fa-spin' : 'fa-copy'"></i>
                {{ isCopying ? '複製中...' : '複製前一個版本' }}
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li>
                  <button
                    type="button"
                    class="dropdown-item"
                    :disabled="isCopying"
                    @click="copyFromPrevious(false)"
                  >
                    合併到目前版本（保留既有項目）
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    class="dropdown-item text-danger"
                    :disabled="isCopying"
                    @click="copyFromPrevious(true)"
                  >
                    覆寫目前版本（先清空再複製）
                  </button>
                </li>
              </ul>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="isExportingSubdivision || !constructionId"
              title="匯出目前版本施工項目（名稱、順序與施工／安全衛生抽查標準明細）加密檔，供營造端「分項工程」匯入（僅同工程案可用）"
              @click="handleExportSubdivisionJson"
            >
              <i class="fa me-1" :class="isExportingSubdivision ? 'fa-spinner fa-spin' : 'fa-file-export'"></i>
              {{ isExportingSubdivision ? '匯出中…' : '匯出營造分項對照檔' }}
            </button>
            <button type="button" class="btn btn-sm btn-success" @click="createItem">
              <i class="fa fa-plus me-1"></i>新增施工大項
            </button>
          </div>
        </div>

        <!-- Data Table -->
        <div class="table-responsive">
          <table class="table a4-table mb-0 align-middle" :class="{ 'opacity-75': isReorderingMajor }">
          <thead>
            <tr>
              <th
                class="text-center text-muted text-nowrap align-middle row-drag-th"
                style="width: 1%"
                title="按住左側圖示拖曳可調整順序"
              >
                順序
              </th>
              <th>施工項目名稱</th>
              <th>描述</th>
              <th class="text-center text-nowrap align-middle" style="width: 1%">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="text-center py-5 text-muted">載入中...</td>
            </tr>
            <template v-else-if="items.length > 0">
              <tr
                v-for="(item, index) in items"
                :key="item.id"
                class="a4-table__data-row"
                :class="{ 'a4-table__row--drag-over': majorDropOverIndex === index }"
                @dragover.prevent="onMajorDragOver(index)"
                @drop.prevent="onMajorDrop(index)"
              >
                <td
                  class="text-center align-middle row-drag-handle text-muted"
                  draggable="true"
                  title="拖曳排序"
                  @dragstart="onMajorDragStart($event, index)"
                  @dragend="onMajorDragEnd"
                >
                  <i class="fa fa-grip-vertical" aria-hidden="true"></i>
                </td>
                             <td class="fw-bold">
                                 {{ item.name }}
                                 <div class="small fw-normal mt-1 d-flex flex-wrap align-items-center gap-1 gap-sm-2">
                                     <button
                                         type="button"
                                         class="standards-status-hit"
                                         title="開啟抽查標準表（頁內以分頁切換施工／安衛）"
                                         @click="goToStandards(item)"
                                     >
                                         <span class="text-muted">抽查標準表</span>
                                         <span
                                             :class="[
                                               'standards-pill',
                                               ((item.standards?.length ?? 0) + (item.safetyStandards?.length ?? 0)) > 0
                                                 ? 'standards-pill--filled'
                                                 : 'standards-pill--empty',
                                             ]"
                                         >
                                             <template
                                               v-if="
                                                 ((item.standards?.length ?? 0) + (item.safetyStandards?.length ?? 0)) > 0
                                               "
                                             >
                                                 施工 {{ item.standards?.length ?? 0 }} · 安衛
                                                 {{ item.safetyStandards?.length ?? 0 }}
                                             </template>
                                             <template v-else>無資料</template>
                                         </span>
                                     </button>
                                 </div>
                             </td>
                             <td>{{ item.description || '-' }}</td>
                             <td class="text-center text-nowrap align-middle">
                                 <button class="btn btn-sm btn-outline-primary me-2" @click="goToStandards(item)">
                                     <i class="fa fa-clipboard-list me-1"></i>抽查標準表
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
              <td colspan="4" class="text-center py-5 text-muted">暫無資料</td>
            </tr>
          </tbody>
          </table>
        </div>
        <p v-if="majorListTruncated" class="small text-warning mt-2 mb-0">
          目前版本超過 {{ MAJOR_LIST_PAGE_SIZE }} 筆，僅顯示前 {{ MAJOR_LIST_PAGE_SIZE }} 筆；若需調整更後面的項目請聯絡管理員擴充。
        </p>
      </CardBody>
    </Card>

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
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'
import { ref, onMounted, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { Modal } from 'bootstrap'
import {
  getConstructionMajorItems,
  getConstructionMajorItemById,
  deleteConstructionMajorItem,
  createConstructionMajorItem,
  getConstructionMajorItemAiSuggest,
  copyConstructionMajorItemsFromPrevious,
  updateConstructionMajorItem,
  reorderConstructionMajorItems,
  type ConstructionMajorItem,
  type MajorItemSuggestionItem
} from '@/api/pcces'
import { getDesignChangeList } from '@/api/designChange'
import { exportSupervisorySubdivisionJson } from '@/api/subdivisionWorkItems'

const router = useRouter()
const workspaceStore = useWorkspaceStore()

// 獲取當前工程 ID
const constructionId = computed(() => workspaceStore.currentProject?.id || '')
// 變更設計版本：null = 原契約，數字 = 該變更設計 ID
const selectedDesignChangeId = ref<number | null>(null)
const items = ref<ConstructionMajorItem[]>([])
const loading = ref(false)
const isCopying = ref(false)
const isExportingSubdivision = ref(false)
/** 清單一次載入筆數上限（需完整載入才能拖曳排序） */
const MAJOR_LIST_PAGE_SIZE = 1000
const majorListTruncated = ref(false)
const isReorderingMajor = ref(false)
const majorDropOverIndex = ref<number | null>(null)
const majorDragFromIndex = ref<number | null>(null)
/** 變更設計列表（依生效日升序），用於計算「前一個版本」 */
const designChangeList = ref<{ id: number; effectiveDate: string }[]>([])

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
    const list = await getDesignChangeList(cid, 'SUPERVISORY')
    designChangeList.value = [...list].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    )
  } catch {
    designChangeList.value = []
  }
}

const loadItems = async () => {
  if (!constructionId.value) {
    items.value = []
    majorListTruncated.value = false
    return
  }

  loading.value = true
  try {
    const response = await getConstructionMajorItems(constructionId.value, {
      designChangeId: selectedDesignChangeId.value,
      page: 0,
      size: MAJOR_LIST_PAGE_SIZE
    })
    majorListTruncated.value =
      !response.last && response.totalElements > response.content.length
    const enriched = await Promise.all(
      response.content.map(async (item) => {
        const hasEmbeddedStandards =
          Array.isArray(item.standards) || Array.isArray(item.safetyStandards)
        if (hasEmbeddedStandards) return item
        try {
          const detail = await getConstructionMajorItemById(constructionId.value, item.id)
          return {
            ...item,
            standards: detail.standards ?? [],
            safetyStandards: detail.safetyStandards ?? []
          }
        } catch {
          return item
        }
      })
    )
    items.value = enriched
  } catch (e) {
    console.error(e)
    alert('載入資料失敗')
  } finally {
    loading.value = false
  }
}

function onMajorDragStart(e: DragEvent, index: number) {
  majorDragFromIndex.value = index
  e.dataTransfer?.setData('text/plain', String(index))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onMajorDragOver(index: number) {
  majorDropOverIndex.value = index
}

function onMajorDragEnd() {
  majorDropOverIndex.value = null
  majorDragFromIndex.value = null
}

async function onMajorDrop(toIndex: number) {
  majorDropOverIndex.value = null
  const from = majorDragFromIndex.value
  majorDragFromIndex.value = null
  if (from == null || from === toIndex) return
  const list = items.value.slice()
  const [removed] = list.splice(from, 1)
  list.splice(toIndex, 0, removed)
  items.value = list
  if (!constructionId.value) return
  isReorderingMajor.value = true
  try {
    await reorderConstructionMajorItems({
      constructionId: constructionId.value,
      designChangeId: selectedDesignChangeId.value,
      orderedIds: list.map((i) => i.id)
    })
  } catch (err) {
    console.error(err)
    alert('排序儲存失敗')
    loadItems()
  } finally {
    isReorderingMajor.value = false
  }
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
    
    if (confirm(`確定刪除施工項目 "${item.name}" 及其施工抽查與安全衛生標準明細？此動作無法復原。`)) {
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
  loadItems()
}

async function handleExportSubdivisionJson() {
  const cid = constructionId.value
  if (!cid) {
    alert('請先選擇工程案')
    return
  }
  isExportingSubdivision.value = true
  try {
    const payload = await exportSupervisorySubdivisionJson(cid, selectedDesignChangeId.value)
    const text = JSON.stringify(payload)
    const blob = new Blob([text], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ver =
      selectedDesignChangeId.value == null ? '原契約' : `變更設計_${selectedDesignChangeId.value}`
    const safeCid = cid.replace(/[^\w\-.]+/g, '_')
    a.download = `分項對照_施工項目_${safeCid}_${ver}.cmx`
    a.click()
    URL.revokeObjectURL(url)
    alert('匯出完成：此檔案僅可匯入相同工程案。')
  } catch (e: unknown) {
    console.error(e)
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    alert('匯出失敗：' + (err?.response?.data?.message ?? err?.message ?? '未知錯誤'))
  } finally {
    isExportingSubdivision.value = false
  }
}

async function copyFromPrevious(overwrite: boolean) {
  if (!constructionId.value || selectedDesignChangeId.value == null) return
  if (overwrite) {
    if (
      !confirm(
        '「覆寫」將先刪除目前版本全部施工項目與其施工／安全衛生抽查標準，再依前一個版本完整複製。\n\n此動作無法復原，確定嗎？'
      )
    ) {
      return
    }
  } else {
    if (
      !confirm(
        '將前一個版本的施工大項（含施工與安全衛生抽查標準）複製到目前版本；若目前版本已有項目則會一併保留、不覆寫。\n\n確定嗎？'
      )
    ) {
      return
    }
  }
  isCopying.value = true
  try {
    const source = sourceDesignChangeIdForCopy.value ?? undefined
    const res = await copyConstructionMajorItemsFromPrevious(
      constructionId.value,
      source,
      selectedDesignChangeId.value,
      { overwrite }
    )
    if (overwrite && res.copiedCount === 0) {
      alert('覆寫完成：來源版本無施工大項資料，目前版本已清空。')
    } else {
      alert(
        overwrite
          ? `已覆寫並複製 ${res.copiedCount} 筆施工大項`
          : `已複製 ${res.copiedCount} 筆施工大項（合併至目前版本）`
      )
    }
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
/* 與分項工程維護（FormSubdivisionWorkItems）暗色主題一致 */
.a4-dark {
  --a4-bg: #1a1d21;
  --a4-card: #25282c;
  --a4-border: #4a4d54;
  --a4-text: #e4e6eb;
  --a4-muted: #b0b3b8;
  --a4-thead: #2d3748;
  --a4-hover: rgba(255, 255, 255, 0.06);
  --a4-input-bg: #2d3139;
  --a4-input-border: #3a3d42;
  --a4-accent: #60a5fa;
}

.form-b-construction-maintenance-page {
  padding: 1rem;
  color: var(--a4-text);
}

:deep(.card.report-card) {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}
:deep(.card.report-card::before) {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(700px 220px at 20% 0%, rgba(var(--bs-primary-rgb), 0.12), transparent 55%);
  opacity: 0.9;
  pointer-events: none;
}
.report-card--full {
  width: 100%;
}
:deep(.card.report-card .card-body.report-card__body) {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent;
  color: var(--a4-text);
}

:deep(.alert-warning) {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
}

.construction-intro-box {
  padding: 0.35rem 0.65rem 0.35rem 0.5rem;
  border-radius: 0.45rem;
  border: 1px solid rgba(94, 234, 212, 0.22);
  border-left: 3px solid #5eead4;
  background: linear-gradient(
    95deg,
    rgba(94, 234, 212, 0.1) 0%,
    rgba(15, 23, 42, 0.35) 48%,
    rgba(37, 40, 44, 0.5) 100%
  );
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2) inset;
}
.construction-intro-icon {
  color: #5eead4;
  font-size: 0.95rem;
  opacity: 0.95;
}
.construction-intro-pill {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  line-height: 1.2;
  color: #ecfdf5;
  background: rgba(94, 234, 212, 0.2);
  border: 1px solid rgba(94, 234, 212, 0.45);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15) inset;
}
.construction-intro-line {
  color: rgba(228, 230, 235, 0.9);
  line-height: 1.35;
}
.construction-kw {
  color: #7dd3fc;
  font-weight: 700;
}
.construction-hl {
  color: #fde68a;
  font-weight: 700;
}

.construction-toolbar-row .construction-intro-box {
  /* 與右側按鈕同列時略縮內距，避免過高 */
  padding-top: 0.28rem;
  padding-bottom: 0.28rem;
}

.a4-table {
  border: 2px solid var(--a4-border);
  border-collapse: collapse;
  width: 100%;
  color: var(--a4-text);
}

.a4-table thead th {
  background: var(--a4-thead);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.65rem 0.5rem;
  border: 1.5px solid var(--a4-border);
  color: var(--a4-muted);
}

.a4-table tbody td {
  border: 1.5px solid var(--a4-border);
  padding: 0.6rem 0.5rem;
  vertical-align: middle;
  background: var(--a4-card);
  color: var(--a4-text);
}

.a4-table tbody tr:hover td {
  background: var(--a4-hover);
}

.a4-table :deep(.text-muted) {
  color: var(--a4-muted) !important;
}

.a4-table :deep(.btn-sm) {
  font-size: 0.8rem;
}

/* 填寫狀況整組可點進維護頁，外觀維持像文字、只做極淡互動 */
.standards-status-hit {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0;
  padding: 0.1rem 0.15rem;
  border: none;
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}
.standards-status-hit:hover .standards-pill {
  filter: brightness(1.06);
}
.standards-status-hit:hover .text-muted {
  color: rgba(196, 200, 206, 0.95) !important;
}
.standards-status-hit:focus-visible {
  outline: 1px solid rgba(96, 165, 250, 0.45);
  outline-offset: 1px;
}

/* 抽查標準狀態：柔和配色（取代高對比 text-bg-*） */
.standards-pill {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.3;
  padding: 0.12rem 0.48rem;
  border-radius: 999px;
  border: 1px solid transparent;
  vertical-align: middle;
}
.standards-pill--filled {
  color: rgba(165, 214, 189, 0.95);
  background: rgba(45, 115, 82, 0.22);
  border-color: rgba(74, 155, 110, 0.28);
}
.standards-pill--empty {
  color: rgba(160, 164, 170, 0.92);
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.07);
}

.construction-pagination :deep(.page-link) {
  background: var(--a4-card);
  border-color: var(--a4-border);
  color: var(--a4-text);
}
.construction-pagination :deep(.page-item.disabled .page-link) {
  background: rgba(0, 0, 0, 0.2);
  color: var(--a4-muted);
  border-color: var(--a4-border);
}
.construction-pagination :deep(.page-item:not(.disabled) .page-link:hover) {
  background: var(--a4-hover);
  color: var(--a4-accent);
}

.row-drag-th {
  font-size: 0.75rem;
  font-weight: 600;
}
.row-drag-handle {
  cursor: grab;
  user-select: none;
  touch-action: none;
  vertical-align: middle !important;
}
.row-drag-handle:active {
  cursor: grabbing;
}
.a4-table__row--drag-over td {
  box-shadow: inset 0 0 0 2px rgba(96, 165, 250, 0.4);
}
</style>



