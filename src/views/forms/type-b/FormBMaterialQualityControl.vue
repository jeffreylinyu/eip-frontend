<template>
  <div class="form-b-material-quality-control-page a4-dark h-100">
    <div class="d-flex align-items-center gap-3 mb-3">
      <button type="button" class="btn btn-outline-secondary" @click="goBack">
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

    <Card class="mb-3 report-card report-card--full position-relative" style="min-height: 500px">
      <CardBody class="report-card__body" data-bs-theme="dark">
        <div v-if="loading" class="d-flex align-items-center justify-content-center gap-2 py-5 text-muted">
          <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
          <span>載入資訊中...</span>
        </div>

        <template v-else>
          <div
            v-if="aiGenerating"
            class="material-qc-loading-overlay d-flex flex-column align-items-center justify-content-center gap-2"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
            <div class="text-muted small">AI 生成中，約 1~3 分鐘，請耐心等待…</div>
            <div class="text-warning-emphasis small">請勿關閉頁面</div>
          </div>

          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
            <div class="flex-grow-1 min-w-0">
              <h4 class="fw-bold mb-1">品質抽驗管控表</h4>
              <div v-if="materialInfo" class="text-muted small mb-0 text-truncate" :title="materialInfo.name">
                <span class="me-2">項次 {{ materialInfo.itemNo || '-' }}</span>
                <span class="me-2">材料編碼 {{ pccesCode }}</span>
                <span class="me-2">
                  {{ materialInfo.name
                  }}{{
                    materialInfo.unit
                      ? ` / ${materialInfo.quantity} ${materialInfo.unit}`
                      : materialInfo.quantity
                        ? ` / ${materialInfo.quantity}`
                        : ''
                  }}
                </span>
              </div>
              <div v-else class="text-muted small mb-0">無法載入本筆材料（請確認單價分析已勾選材料）</div>
            </div>
          </div>

          <div v-if="!standards || standards.length === 0" class="text-center py-5 text-muted">
            <i class="fa fa-clipboard-list fa-3x mb-3" aria-hidden="true"></i>
            <p class="mb-1">目前尚無管控表資料</p>
            <div class="small">可點「新增一筆」手動維護，或用「依 AI 生成並覆寫」建立明細</div>
            <div class="d-flex justify-content-center gap-2 mt-3">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary hierarchy-toolbar-btn"
                :disabled="aiGenerating || !materialInfo"
                @click="onAddRow"
              >
                <i class="fa fa-plus me-1" aria-hidden="true"></i>新增一筆
              </button>
              <button
                v-if="isSuperAdmin"
                type="button"
                class="btn-ai-generate btn-ai-generate--toolbar"
                :disabled="aiGenerating || !materialInfo"
                @click="onAiGenerateOverwrite"
              >
                <i class="fa fa-wand-magic-sparkles me-1 d-none d-sm-inline" aria-hidden="true"></i>
                <span
                  v-if="aiGenerating"
                  class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                依 AI 生成並覆寫
              </button>
            </div>
          </div>

          <div v-else class="table-responsive">
           <table class="table table-bordered table-hover align-middle material-qc-table">
               <thead>
                   <tr>
                      <th :colspan="10" class="material-qc-thead-actions-cell">
                        <div class="d-flex align-items-center justify-content-between gap-3">
                          <div class="material-qc-thead-hint small min-w-0">
                            <i class="fa fa-circle-info me-1" aria-hidden="true"></i>
                            <span class="text-truncate d-inline-block align-bottom">
                              以 AI 依工程名稱與本筆單價分析材料產出；每次會覆寫本版既有明細（全刪全建）。
                            </span>
                          </div>
                          <div class="d-flex align-items-center justify-content-end gap-2 flex-shrink-0">
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary hierarchy-toolbar-btn"
                            :disabled="aiGenerating || !materialInfo"
                            @click="onAddRow"
                            title="新增一筆明細"
                          >
                            <i class="fa fa-plus me-1" aria-hidden="true"></i>新增一筆
                          </button>
                          <button
                            v-if="isSuperAdmin"
                            type="button"
                            class="btn-ai-generate btn-ai-generate--toolbar"
                            :disabled="aiGenerating || !materialInfo"
                            @click="onAiGenerateOverwrite"
                            title="依資料庫內容由 AI 產出並覆寫"
                          >
                            <i class="fa fa-wand-magic-sparkles me-1 d-none d-sm-inline" aria-hidden="true"></i>
                            <span
                              v-if="aiGenerating"
                              class="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            />
                            依 AI 生成並覆寫
                          </button>
                          </div>
                        </div>
                      </th>
                   </tr>
                   <tr>
                       <th class="text-center" style="width: 60px;">項次</th>
                       <th style="min-width: 250px;">抽查標準</th>
                       <th style="min-width: 180px;">抽查方法</th>
                       <th style="width: 110px;">辦理時機</th>
                       <th style="width: 110px;">試驗頻率</th>
                       <th style="min-width: 120px;">抽驗比例</th>
                       <th style="min-width: 200px;">不合格處理</th>
                       <th style="width: 80px;" class="text-center">顯示</th>
                       <th style="width: 70px;" class="text-center">操作</th>
                   </tr>
               </thead>
               <tbody>
                   <tr v-for="item in standards" 
                       :key="item.id || item.itemNo"
                       :class="{ 'row-inactive': !item.isActive }"
                   >
                       <td class="text-center fw-bold">{{ item.itemNo }}</td>
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
                       <td class="text-center">
                         <button
                           type="button"
                           class="btn btn-sm btn-outline-danger material-qc-delete-btn"
                           title="刪除"
                           :disabled="aiGenerating"
                           @click="onDeleteRow(item)"
                         >
                           <i class="fa fa-trash" aria-hidden="true"></i>
                         </button>
                       </td>
                   </tr>
               </tbody>
           </table>
        </div>
        </template>
      </CardBody>
    </Card>

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
import { ref, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { 
    tenderMaterialApi, 
    type ConstructionMaterialStandardResponse,
    type ConstructionMaterialStandardUpdateRequest,
    type MaterialItem
} from '@/api/tenderMaterial'
import { useWorkspaceStore } from '@/stores/workspace'
import Modal from '@/components/bootstrap/Modal.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import toastService from '@/components/bootstrap/ToastService.js'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const { isSuperAdmin } = useViewPerspective()

const pccesCode = route.params.pccesCode as string
const constructionId = computed(() => workspaceStore.currentProject?.id || '')
const designChangeId = computed<number | null>(() => {
  const q = route.query.designChangeId
  if (q == null || q === '') return null
  const n = Number(q)
  return Number.isNaN(n) ? null : n
})

const loading = ref(false)
const aiGenerating = ref(false)
const standards = ref<ConstructionMaterialStandardResponse[]>([])
const materialInfo = ref<MaterialItem | null>(null)

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
    if (!pccesCode || !constructionId.value) return

    loading.value = true
    try {
        const [standardsData, materialsData] = await Promise.all([
            tenderMaterialApi.getMaterialStandards(pccesCode, constructionId.value, designChangeId.value),
            tenderMaterialApi.getMaterialList(constructionId.value, designChangeId.value)
        ])
        standards.value = standardsData
        const matchedMaterial = materialsData.find(m => m.pccesCode === pccesCode)
        materialInfo.value = matchedMaterial || null
    } catch (e) {
        console.error('Load data failed', e)
        toastService.error('載入資料失敗')
    } finally {
        loading.value = false
    }
}

const onAiGenerateOverwrite = async () => {
    if (!constructionId.value || !materialInfo.value || aiGenerating.value) return
    const ok = window.confirm(
        '將以 AI 依工程名稱與本筆單價分析材料資訊產出並覆寫「品質抽驗管控表」明細（全刪全建）。\n\n是否繼續？'
    )
    if (!ok) return
    aiGenerating.value = true
    try {
        standards.value = await tenderMaterialApi.aiGenerateOverwriteMaterialStandards(
            pccesCode,
            constructionId.value,
            designChangeId.value
        )
        toastService.success('AI 生成完成')
    } catch (e: unknown) {
        console.error('AI generate material standards failed:', e)
        const err = e as {
            response?: { data?: { error?: string; message?: string; detail?: string } }
            message?: string
        }
        toastService.error(
            err?.response?.data?.error ??
                err?.response?.data?.message ??
                err?.message ??
                'AI 生成失敗，請稍後再試'
        )
    } finally {
        aiGenerating.value = false
    }
}

const onAddRow = async () => {
    if (!constructionId.value || !materialInfo.value || aiGenerating.value) return
    try {
        const created = await tenderMaterialApi.createMaterialStandard(
            pccesCode,
            constructionId.value,
            designChangeId.value
        )
        standards.value = [...standards.value, created].sort((a, b) => (a.itemNo ?? 0) - (b.itemNo ?? 0))
        toastService.success('已新增一筆')
    } catch (e: unknown) {
        console.error('Create material standard failed:', e)
        toastService.error('新增失敗')
    }
}

const onDeleteRow = async (item: ConstructionMaterialStandardResponse) => {
    if (!item.id || !constructionId.value) return
    if (aiGenerating.value) return
    const ok = window.confirm(`確定要刪除第 ${item.itemNo ?? '-'} 筆嗎？此動作無法復原。`)
    if (!ok) return
    try {
        await tenderMaterialApi.deleteMaterialStandard(item.id, pccesCode, constructionId.value, designChangeId.value)
        standards.value = standards.value.filter(x => x.id !== item.id)
        toastService.success('已刪除')
    } catch (e: unknown) {
        console.error('Delete material standard failed:', e)
        toastService.error('刪除失敗')
    }
}

const toggleActive = async (item: ConstructionMaterialStandardResponse) => {
    if (!item.id || !constructionId.value) return
    const newStatus = !item.isActive
    const oldStatus = item.isActive
    item.isActive = newStatus
    try {
        await tenderMaterialApi.updateMaterialStandard(item.id, pccesCode, constructionId.value, designChangeId.value, { isActive: newStatus })
    } catch (e) {
        console.error('Toggle active failed:', e)
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
    if (!currentEditingItem.value?.id || !currentEditingField.value || !constructionId.value) return

    const itemId = currentEditingItem.value.id
    const field = currentEditingField.value
    const val = editValue.value

    const request: ConstructionMaterialStandardUpdateRequest = {}
    // @ts-ignore: Dynamic assignment
    request[field] = val

    try {
        const updatedItem = await tenderMaterialApi.updateMaterialStandard(itemId, pccesCode, constructionId.value, designChangeId.value, request)
        
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

watch(
  () => [constructionId.value, designChangeId.value, pccesCode] as const,
  () => {
    loadData()
  },
  { immediate: true }
)
</script>

<style scoped>
/* 與 FormBInspectionStandards / 施工項目清單報表卡片一致 */
.a4-dark {
  --a4-bg: #1a1d21;
  --a4-card: #25282c;
  --a4-border: #4a4d54;
  --a4-text: #e4e6eb;
  --a4-muted: #b0b3b8;
  --a4-thead: #2d3748;
  --a4-hover: rgba(255, 255, 255, 0.06);
  --a4-accent: #60a5fa;
}

.form-b-material-quality-control-page {
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

:deep(.breadcrumb-item),
:deep(.breadcrumb-item + .breadcrumb-item::before) {
  color: var(--a4-muted);
}

:deep(.breadcrumb-item.active) {
  color: var(--a4-text);
}

:deep(.btn-outline-secondary) {
  --bs-btn-color: var(--a4-muted);
  --bs-btn-border-color: var(--a4-border);
  --bs-btn-hover-bg: rgba(255, 255, 255, 0.08);
  --bs-btn-hover-border-color: var(--a4-border);
  --bs-btn-hover-color: var(--a4-text);
}

.material-qc-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--bs-body-bg) 65%, transparent);
  backdrop-filter: blur(2px);
}

.material-qc-hint {
  color: #93c5fd;
}

.material-qc-hint strong {
  color: #bfdbfe;
}

.material-qc-table-actions {
  min-height: 2rem;
}

.hierarchy-toolbar-btn {
  min-width: 5.25rem;
  font-weight: 500;
  border-radius: 0.375rem;
}

.material-qc-thead-actions-cell {
  background: var(--a4-thead);
  border-color: var(--a4-border);
  padding: 0.5rem 0.75rem;
}

.material-qc-thead-hint {
  color: #93c5fd;
}

.material-qc-thead-hint > span {
  max-width: min(52rem, 100%);
}

.cursor-pointer {
  cursor: pointer;
}

.text-pre-wrap {
  white-space: pre-wrap;
}

.hover-highlight:hover {
  background-color: var(--a4-hover) !important;
  color: var(--a4-accent);
  text-decoration: underline;
}

.row-inactive td:not(:last-child) {
  opacity: 0.5;
  color: var(--a4-muted);
}

:deep(.material-qc-table) {
  --bs-table-bg: transparent;
  --bs-table-color: var(--a4-text);
  --bs-table-border-color: var(--a4-border);
  color: var(--a4-text);
}

:deep(.material-qc-table thead th) {
  background: var(--a4-thead);
  color: var(--a4-muted);
  border-color: var(--a4-border);
  font-weight: 600;
  font-size: 0.875rem;
}

:deep(.material-qc-table td) {
  border-color: var(--a4-border);
  vertical-align: middle;
}

:deep(.material-qc-table tbody tr:hover td) {
  background-color: var(--a4-hover);
}

:deep(.material-qc-delete-btn) {
  --bs-btn-border-color: color-mix(in srgb, var(--a4-border) 70%, #ef4444 30%);
}
</style>
