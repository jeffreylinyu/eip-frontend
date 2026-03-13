<template>
  <div class="design-change-page a4-dark">
    <PageHeader
      title="變更設計"
      icon="fa fa-journal-whills"
      :breadcrumbs="pageBreadcrumbs"
      :actions="[
        {
          text: '啟用變更設計',
          icon: 'fa fa-flag-checkered',
          variant: 'btn-primary',
          disabled: !hasCurrentProject,
          click: openCreate
        }
      ]"
    />

    <Card>
      <CardBody>
        <div class="alert alert-info mb-4">
          <h5 class="alert-heading">
            <i class="fa fa-info-circle me-2"></i>說明
          </h5>
          <p class="mb-0">
            本功能用於紀錄工程案之<strong>變更設計</strong>啟用時點。一旦啟用變更設計，系統將自所選<strong>生效日</strong>起區分資料版本，
            後續基本資料、標單與人員等設定皆可依時間區段區分版本，以利表單與匯出時正確對應當時之資料。
          </p>
        </div>

        <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
          <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案。
        </div>

        <template v-else>
          <div v-if="loading" class="text-center py-4">
            <span class="spinner-border spinner-border-sm me-2"></span>載入中...
          </div>

          <div v-else class="design-change-content">
            <div class="table-responsive mb-0">
              <table class="table a4-table mb-0">
                <thead>
                  <tr>
                    <th style="width: 70px;">版次</th>
                    <th style="min-width: 120px;">版本名稱</th>
                    <th style="width: 250px;">生效日</th>
                    <th class="design-change-th-reason">原因／事由</th>
                    <th style="min-width: 180px;">關聯公文</th>
                    <th style="width: 140px;" class="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- 固定顯示：原契約版本（不可編輯、不可刪除） -->
                  <tr class="design-change-row-original">
                    <td class="align-middle text-muted">－</td>
                    <td class="align-middle">
                      <span class="design-change-original-label">原契約</span>
                    </td>
                    <td class="align-middle design-change-td-date">
                      <span class="design-change-original-interval">{{ originalContractInterval }}</span>
                    </td>
                    <td class="align-middle design-change-td-reason text-muted">－</td>
                    <td class="align-middle design-change-td-docs text-muted">－</td>
                    <td class="align-middle text-center text-muted">－</td>
                  </tr>
                  <tr v-for="(item, idx) in list" :key="item.id">
                    <td class="align-middle">{{ item.sortOrder }}</td>
                    <td class="align-middle">
                      <input
                        v-model="item.versionName"
                        type="text"
                        class="form-control form-control-sm a4-input design-change-version-name"
                        placeholder="例：變更設計1"
                        maxlength="100"
                        @input="scheduleSave(item)"
                      />
                    </td>
                    <td class="align-middle design-change-td-date">
                      <RepublicDatePicker
                        :key="`${item.id}-${effectiveDatePickerKeyById[item.id] || 0}`"
                        :model-value="item.effectiveDate"
                        input-class="form-control form-control-sm a4-input design-change-inline-date"
                        :use-republic-year="true"
                        :hide-icon="false"
                        @update:model-value="(v: string) => onInlineEffectiveDateChange(item, idx, v)"
                      />
                      <div class="design-change-interval-below">
                        {{ getEffectiveInterval(item, idx) }}
                      </div>
                    </td>
                    <td class="align-middle design-change-td-reason">
                      <textarea
                        v-model="item.reason"
                        class="form-control form-control-sm a4-input design-change-inline-reason"
                        rows="2"
                        placeholder="例：業主指示、圖說修正"
                        @input="scheduleSave(item)"
                      />
                    </td>
                    <td class="align-middle design-change-td-docs">
                      <div class="linked-docs-cell">
                        <ul v-if="(item.documentIds || []).length" class="linked-docs-list">
                          <li
                            v-for="docId in item.documentIds"
                            :key="docId"
                            class="linked-doc-item"
                          >
                            <span
                              class="linked-doc-label linked-doc-preview"
                              :title="'點擊預覽：' + getDocLabel(docId)"
                              @click="previewLinkedDoc(docId)"
                            >{{ getDocLabel(docId) }}</span>
                            <button type="button" class="linked-doc-remove" title="移除" @click.stop="removeLinkedDocForRow(item, docId)">
                              <i class="fa fa-times"></i>
                            </button>
                          </li>
                        </ul>
                        <button type="button" class="btn btn-sm btn-outline-info linked-docs-add" @click="openDocPickerForRow(item)">
                          <i class="fa fa-file-lines me-1"></i>加入公文
                        </button>
                      </div>
                    </td>
                    <td class="align-middle text-center">
                      <span v-if="savingStatus[item.id]" class="text-muted small me-2">
                        <i class="fa fa-spinner fa-spin me-1"></i>儲存中...
                      </span>
                      <button type="button" class="btn btn-sm btn-outline-danger" @click="confirmDelete(item)" title="刪除">
                        <i class="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="list.length === 0" class="text-center py-4 text-muted border border-top-0 rounded-bottom">
              <span class="small">尚無變更設計紀錄，請點擊「啟用變更設計」建立第一筆紀錄</span>
            </div>
          </div>
        </template>
      </CardBody>
    </Card>

    <!-- 啟用變更設計 Modal（僅新增） -->
    <Modal
      :show="showFormModal"
      title="啟用變更設計"
      size="lg"
      modal-class="a4-dark design-change-modal-dark"
      @update:show="(v) => { if (!v) closeFormModal() }"
    >
      <template #body>
        <div class="mb-3">
          <label class="form-label">版本名稱</label>
          <input
            v-model="form.versionName"
            type="text"
            class="form-control form-control-sm a4-input"
            placeholder="選填，預設為變更設計1、變更設計2…"
            maxlength="100"
          />
        </div>
        <div class="mb-3">
          <label class="form-label">生效日 <span class="text-danger">*</span></label>
          <RepublicDatePicker
            v-model="form.effectiveDate"
            input-class="form-control form-control-sm a4-input"
            :use-republic-year="true"
            :hide-icon="false"
          />
        </div>
        <div class="mb-3">
          <label class="form-label">原因／事由</label>
          <textarea v-model="form.reason" class="form-control form-control-sm a4-input" rows="3" placeholder="例：業主指示、圖說修正、追加減帳"></textarea>
        </div>
        <div class="mb-3">
          <label class="form-label">關聯公文</label>
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <span
              v-for="docId in form.documentIds"
              :key="docId"
              class="badge a4-badge d-inline-flex align-items-center gap-1"
            >
              {{ linkedDocLabelByDocId[docId] || `公文 #${docId}` }}
              <button type="button" class="btn btn-link btn-sm p-0 text-white opacity-75" style="font-size: 0.85em;" @click="removeLinkedDoc(docId)">
                <i class="fa fa-times"></i>
              </button>
            </span>
            <button type="button" class="btn btn-sm btn-outline-secondary a4-btn-outline" @click="openDocPicker">
              <i class="fa fa-plus me-1"></i>加入公文
            </button>
          </div>
        </div>
        <div v-if="formError" class="alert alert-danger mb-0">{{ formError }}</div>
      </template>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="closeFormModal">取消</button>
        <button type="button" class="btn btn-primary" :disabled="saving" @click="submitForm">
          <i v-if="saving" class="fa fa-spinner fa-spin me-1"></i>
          確認啟用
        </button>
      </template>
    </Modal>

    <DocumentPicker
      :show="showDocPicker"
      title="選擇公文"
      :construction-id="constructionId"
      :show-name-input="false"
      :hide-select-tab="false"
      @update:show="(v: boolean) => { showDocPicker = v; if (!v) documentPickerTargetId = null }"
      @select="onDocPicked"
    />

    <!-- 公文預覽 Modal（與 A-1 書架一致） -->
    <Modal
      :show="showPreviewModal"
      :title="'預覽 - ' + previewFileName"
      size="lg"
      modal-class="a4-dark design-change-modal-dark"
      @update:show="(v: boolean) => { if (!v) { showPreviewModal = false; previewUrl = '' } }"
    >
      <template #body>
        <div v-if="!previewUrl" class="text-center py-5 text-muted">無法預覽</div>
        <iframe v-else :src="previewUrl" class="design-change-preview-iframe" style="width: 100%; height: 75vh; border: none; border-radius: 6px;"></iframe>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { debounce } from 'lodash'
import { useWorkspaceStore } from '@/stores/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DocumentPicker from '@/components/document/DocumentPicker.vue'
import { getOriginalContractIntervalISO, getDesignChangeIntervalISO } from '@/utils/designChangeIntervals'
import { getDocumentCenterList, type DocumentCenterListItem } from '@/api/documentCenter'
import {
  getDesignChangeList,
  createDesignChange,
  updateDesignChange,
  deleteDesignChange,
  type DesignChangeItem,
  type DesignChangeRequest
} from '@/api/designChange'

const workspaceStore = useWorkspaceStore()
const hasCurrentProject = computed(() => !!workspaceStore.currentProject)
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
/** 目前專案完工日期（YYYY-MM-DD），用於生效區間迄日；與最後一版應用區間迄日同步，完工日期變動時會一併更新 */
const projectEndDate = computed(() => workspaceStore.currentProject?.endDate ?? '')
const projectSignDate = computed(() => workspaceStore.currentProject?.signDate ?? '')

const pageBreadcrumbs = [
  { text: '基本資料維護', href: '#' },
  { text: '變更設計', active: true as const }
]

const list = ref<DesignChangeItem[]>([])
const loading = ref(false)
const showFormModal = ref(false)
const saving = ref(false)
const formError = ref('')
const showDocPicker = ref(false)
const documentPickerTargetId = ref<number | null>(null)
const docCacheMap = ref<Map<number, DocumentCenterListItem>>(new Map())
const linkedDocLabelByDocId = ref<Record<number, string>>({})
const savingStatus = ref<Record<number, string>>({})
const debouncedSaveMap = new Map<number, ReturnType<typeof debounce>>()
const effectiveDatePickerKeyById = ref<Record<number, number>>({})
const showPreviewModal = ref(false)
const previewUrl = ref('')
const previewFileName = ref('')

const form = ref<DesignChangeRequest>({
  constructionId: '',
  effectiveDate: '',
  reason: '',
  documentIds: []
})

function resetForm() {
  form.value = {
    constructionId: constructionId.value,
    effectiveDate: '',
    versionName: '',
    reason: '',
    documentIds: []
  }
  formError.value = ''
  linkedDocLabelByDocId.value = {}
}

function openCreate() {
  resetForm()
  form.value.constructionId = constructionId.value
  showFormModal.value = true
}

function closeFormModal() {
  showFormModal.value = false
  formError.value = ''
}

/** 原契約適用區間：簽約日 ～ 第一筆變更設計生效日前一日（若無變更設計則 ～ 迄今） */
const originalContractInterval = computed(() => {
  const interval = getOriginalContractIntervalISO({
    signDate: projectSignDate.value,
    designChangeList: list.value,
    projectEndDate: projectEndDate.value
  })
  if (!interval.start) return '－'
  const startStr = formatToRepublicDate(interval.start)
  if (interval.openEnded) return `${startStr} ～ 迄今`
  const endStr = interval.end ? formatToRepublicDate(interval.end) : '－'
  return `${startStr} ～ ${endStr}`
})

function getDocLabel(docId: number): string {
  const doc = docCacheMap.value.get(docId)
  return doc?.documentNumber || doc?.subject || doc?.fileName || `#${docId}`
}

/** YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss 轉民國表示：114.08.09 */
function formatToRepublicDate(isoDate: string): string {
  if (!isoDate?.trim()) return ''
  const dateOnly = isoDate.trim().split('T')[0]
  const [y, m, d] = dateOnly.split('-').map(Number)
  if (!y || !m || !d) return dateOnly || isoDate
  const rocYear = y - 1911
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${rocYear}.${mm}.${dd}`
}

function toDateOnly(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).trim().split('T')[0]
}

function getEffectiveDateValidationError(
  proposed: string,
  ctx: { mode: 'create' | 'inline'; rowIndex?: number; rowId?: number }
): string {
  const sign = toDateOnly(projectSignDate.value?.trim())
  if (!sign) return '請先填寫訂約日期後再設定變更設計生效日'
  const d = toDateOnly(proposed)
  if (!d) return '請填寫生效日'
  if (d <= sign) return '生效日必須晚於訂約日期（不可與原契約同日）'

  const end = toDateOnly(projectEndDate.value?.trim())
  if (end && d > end) return '生效日不可晚於專案完工日'

  // 不可與其他版本重複
  const others = list.value.filter(r => r.id !== ctx.rowId).map(r => toDateOnly(r.effectiveDate?.trim()))
  if (others.includes(d)) return '生效日不可與其他版本重複'

  if (ctx.mode === 'create') {
    const max = others.filter(Boolean).sort().reverse()[0] || ''
    if (max && d <= max) return '新增的生效日需晚於目前最後一版的生效日'
    return ''
  }

  // inline：維持目前列表順序（需介於前後兩筆之間）
  const idx = ctx.rowIndex ?? -1
  const prev = idx > 0 ? toDateOnly(list.value[idx - 1]?.effectiveDate?.trim()) : ''
  const next = idx >= 0 && idx + 1 < list.value.length ? toDateOnly(list.value[idx + 1]?.effectiveDate?.trim()) : ''
  if (prev && d <= prev) return '生效日需晚於上一版的生效日'
  if (next && d >= next) return '生效日需早於下一版的生效日'
  return ''
}

function bumpEffectiveDatePickerKey(id: number) {
  effectiveDatePickerKeyById.value = {
    ...effectiveDatePickerKeyById.value,
    [id]: (effectiveDatePickerKeyById.value[id] ?? 0) + 1
  }
}

function onInlineEffectiveDateChange(item: DesignChangeItem, idx: number, v: string) {
  const err = getEffectiveDateValidationError(v, { mode: 'inline', rowIndex: idx, rowId: item.id })
  if (err) {
    alert(err)
    // 強制重建日期元件，讓 input 回復顯示原值
    bumpEffectiveDatePickerKey(item.id)
    return
  }
  item.effectiveDate = v
  scheduleSave(item)
}

/** 依後端區間顯示應用區間（民國格式）；若有 effectiveEndDate 則用後端值，否則 fallback 依下一筆／專案完工日計算 */
function getEffectiveInterval(item: DesignChangeItem, index: number): string {
  const interval = getDesignChangeIntervalISO({
    item,
    index,
    designChangeList: list.value,
    projectEndDate: projectEndDate.value
  })
  if (!interval.start) return '－'
  const startStr = formatToRepublicDate(interval.start)
  if (interval.openEnded) return `${startStr} ～ 迄今`
  const endStr = interval.end ? formatToRepublicDate(interval.end) : '－'
  return `${startStr} ～ ${endStr}`
}

function previewLinkedDoc(docId: number) {
  const doc = docCacheMap.value.get(docId)
  if (!doc?.fileUrl) return
  previewFileName.value = doc.documentNumber || doc.fileName || ''
  previewUrl.value = doc.fileUrl
  showPreviewModal.value = true
}

async function saveRow(item: DesignChangeItem) {
  const cid = constructionId.value
  if (!cid) return
  if (!item.effectiveDate?.trim()) return
  const original = { ...item }
  savingStatus.value[item.id] = 'saving'
  try {
    const payload: DesignChangeRequest = {
      constructionId: cid,
      effectiveDate: item.effectiveDate,
      versionName: item.versionName?.trim() ?? '',
      reason: item.reason ?? '',
      documentIds: item.documentIds ?? []
    }
    const updated = await updateDesignChange(cid, item.id, payload)
    if (updated) {
      const idx = list.value.findIndex(r => r.id === item.id)
      if (idx >= 0) list.value[idx] = updated
    }
  } catch (e: any) {
    // 若後端驗證失敗（例如生效日與上一筆相同），需提示並回復欄位，避免看似「沒擋」
    const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
    alert(msg)
    // 回復本列（僅回復使用者可能剛改的欄位）
    item.effectiveDate = original.effectiveDate
    item.versionName = original.versionName
    item.reason = original.reason
    bumpEffectiveDatePickerKey(item.id)
  } finally {
    delete savingStatus.value[item.id]
  }
}

function scheduleSave(item: DesignChangeItem) {
  if (!debouncedSaveMap.has(item.id)) {
    debouncedSaveMap.set(item.id, debounce((it: DesignChangeItem) => saveRow(it), 800))
  }
  savingStatus.value[item.id] = 'saving'
  debouncedSaveMap.get(item.id)!(item)
}

function openDocPickerForRow(item: DesignChangeItem) {
  documentPickerTargetId.value = item.id
  showDocPicker.value = true
}

function removeLinkedDocForRow(item: DesignChangeItem, docId: number) {
  if (!item.documentIds) return
  item.documentIds = item.documentIds.filter(id => id !== docId)
  scheduleSave(item)
}

function removeLinkedDoc(docId: number) {
  form.value.documentIds = (form.value.documentIds || []).filter(id => id !== docId)
  const next = { ...linkedDocLabelByDocId.value }
  delete next[docId]
  linkedDocLabelByDocId.value = next
}

function openDocPicker() {
  showDocPicker.value = true
}

function onDocPicked(payload: { document: DocumentCenterListItem; documentName: string }) {
  const doc = payload.document
  const id = doc.id
  docCacheMap.value.set(id, doc)
  const targetId = documentPickerTargetId.value
  if (targetId != null) {
    const item = list.value.find(r => r.id === targetId)
    if (item) {
      if (!item.documentIds) item.documentIds = []
      if (!item.documentIds.includes(id)) {
        item.documentIds = [...item.documentIds, id]
        scheduleSave(item)
      }
    }
    documentPickerTargetId.value = null
    showDocPicker.value = false
    return
  }
  if (!form.value.documentIds?.includes(id)) {
    form.value.documentIds = [...(form.value.documentIds || []), id]
    linkedDocLabelByDocId.value = {
      ...linkedDocLabelByDocId.value,
      [id]: doc.documentNumber || doc.subject || doc.fileName || `公文 #${id}`
    }
  }
  showDocPicker.value = false
}

async function submitForm() {
  const cid = constructionId.value
  if (!cid) return
  if (!form.value.effectiveDate?.trim()) {
    formError.value = '請填寫生效日'
    return
  }
  const err = getEffectiveDateValidationError(form.value.effectiveDate, { mode: 'create' })
  if (err) {
    formError.value = err
    return
  }
  formError.value = ''
  saving.value = true
  try {
    const payload: DesignChangeRequest = {
      constructionId: cid,
      effectiveDate: form.value.effectiveDate,
      versionName: form.value.versionName?.trim() || undefined,
      reason: form.value.reason || undefined,
      documentIds: form.value.documentIds
    }
    const created = await createDesignChange(cid, payload)
    if (created) {
      list.value = await getDesignChangeList(cid)
      const docList = await getDocumentCenterList(cid)
      docList.forEach(d => docCacheMap.value.set(d.id, d))
      closeFormModal()
    } else {
      formError.value = '新增失敗'
    }
  } catch (e: any) {
    formError.value = e?.response?.data?.message ?? e?.message ?? '操作失敗'
  } finally {
    saving.value = false
  }
}

async function loadList() {
  const cid = constructionId.value
  if (!cid) return
  loading.value = true
  try {
    const [designList, docList] = await Promise.all([
      getDesignChangeList(cid),
      getDocumentCenterList(cid)
    ])
    list.value = designList
    const map = new Map<number, DocumentCenterListItem>()
    docList.forEach(d => map.set(d.id, d))
    docCacheMap.value = map
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function confirmDelete(item: DesignChangeItem) {
  if (!confirm(`確定要刪除本筆變更設計紀錄嗎？\n版次：${item.sortOrder}，生效日：${item.effectiveDate}`)) return
  const cid = constructionId.value
  if (!cid) return
  deleteDesignChange(cid, item.id).then(() => loadList()).catch(() => {})
}

watch(hasCurrentProject, (ok) => { if (ok) loadList() }, { immediate: true })
</script>

<style scoped>
/* 與 A 表單系列一致之暗色主題 */
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

.design-change-page {
  padding: 1rem;
  color: var(--a4-text);
}

:deep(.card) {
  background: var(--a4-card);
  border-color: var(--a4-border);
  color: var(--a4-text);
}

:deep(.alert-info) {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.25);
  color: #93c5fd;
}

:deep(.alert-warning) {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
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

/* 原契約列：唯讀、不可編輯刪除 */
.design-change-row-original td {
  background: rgba(255, 255, 255, 0.03);
}
.design-change-row-original:hover td {
  background: rgba(255, 255, 255, 0.05);
}
.design-change-original-label {
  font-weight: 600;
  color: var(--a4-muted);
}
.design-change-original-interval {
  font-size: 0.85rem;
  color: var(--a4-accent);
}

.text-break {
  word-break: break-word;
}

.design-change-version-name {
  min-width: 8rem;
  max-width: 100%;
}

/* 生效日欄：足夠寬度給日期選擇器 */
.design-change-td-date {
  min-width: 250px;
}

.design-change-inline-date {
  min-width: 13rem;
  width: 100%;
}

.design-change-interval-below {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--a4-accent);
  white-space: nowrap;
}

/* 原因／事由欄：較大寬度 */
.design-change-th-reason {
  min-width: 280px;
}

.design-change-td-reason {
  min-width: 280px;
}

.design-change-inline-reason {
  min-width: 100%;
  width: 100%;
  resize: vertical;
}

/* 關聯公文欄：清單式設計 */
.design-change-td-docs {
  min-width: 180px;
  vertical-align: top !important;
}

.linked-docs-cell {
  padding: 0.35rem 0;
  min-height: 2.5rem;
}

.linked-docs-list {
  list-style: none;
  margin: 0 0 0.5rem 0;
  padding: 0;
}

.linked-doc-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
  background: var(--a4-input-bg);
  border: 1px solid var(--a4-input-border);
  border-radius: 4px;
  font-size: 0.85rem;
}

.linked-doc-item:last-child {
  margin-bottom: 0;
}

.linked-doc-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--a4-text);
}

.linked-doc-preview {
  cursor: pointer;
}

.linked-doc-preview:hover {
  color: var(--a4-accent);
  text-decoration: underline;
}

.linked-doc-remove {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--a4-muted);
  border-radius: 3px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.linked-doc-remove:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
}

.linked-docs-add {
  border-style: dashed;
  border-color: var(--a4-border);
  color: var(--a4-muted);
}

.linked-docs-add:hover {
  border-color: var(--a4-accent);
  color: var(--a4-accent);
  background: rgba(96, 165, 250, 0.08);
}
</style>

<style>
/* Modal 暗色（Teleport 到 body，需非 scoped） */
.design-change-modal-dark.modal-content,
.a4-dark.design-change-modal-dark .modal-content {
  background: #25282c;
  border-color: #4a4d54;
  color: #e4e6eb;
}
.design-change-modal-dark .modal-header,
.a4-dark.design-change-modal-dark .modal-header {
  border-bottom-color: #4a4d54;
  color: #e4e6eb;
}
.design-change-modal-dark .modal-body,
.a4-dark.design-change-modal-dark .modal-body {
  color: #e4e6eb;
}
.design-change-modal-dark .form-label,
.design-change-modal-dark .form-control.a4-input {
  color: #e4e6eb;
}
.design-change-modal-dark .form-control.a4-input {
  background: #2d3139;
  border-color: #3a3d42;
}
.design-change-modal-dark .form-control.a4-input:focus {
  border-color: rgba(96, 165, 250, 0.6);
  box-shadow: 0 0 0 0.2rem rgba(96, 165, 250, 0.15);
}
.design-change-modal-dark .badge.a4-badge {
  background: #4a4d54;
  color: #e4e6eb;
}
.design-change-modal-dark .btn-outline-secondary.a4-btn-outline {
  border-color: #4a4d54;
  color: #b0b3b8;
}
.design-change-modal-dark .btn-outline-secondary.a4-btn-outline:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: #4a4d54;
  color: #e4e6eb;
}
</style>
