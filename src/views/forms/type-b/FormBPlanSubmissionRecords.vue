<template>
  <div :class="[embedded ? 'psr-embedded' : 'form-b-plan-submission-page', 'psr-dark']">
    <PageHeader
      v-if="!embedded"
      title="監造計畫送審紀錄"
      icon="fa fa-clipboard-list"
      :breadcrumbs="[
        { text: '表單生成與管理', href: 'javascript:;' },
        { text: 'B類表單', href: 'javascript:;' },
        { text: '監造計畫送審紀錄', active: true }
      ]"
    />

    <div v-if="!hasCurrentProject" :class="['psr-alert-warn', embedded ? '' : 'mx-3']">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案
    </div>

    <template v-else>
      <div :class="['psr-block', embedded ? '' : 'mx-3']">
        <div class="psr-block-body p-0">
          <!-- 載入中 -->
          <div v-if="loading" class="text-center py-5">
            <i class="fa fa-spinner fa-spin fa-2x mb-3 psr-muted"></i>
            <p class="psr-muted mb-0">載入中…</p>
          </div>

          <template v-else>
            <!-- 送審紀錄表格 -->
            <div ref="tableWrapperRef" class="table-responsive">
              <table class="psr-table">
                <thead>
                  <tr>
                    <th class="psr-th-num">送審次數、日期及文號</th>
                    <th class="psr-th-version">使用資料版本</th>
                    <th class="psr-th-doc">監造單位審查結果</th>
                    <th class="psr-th-doc">工程分局審查結果</th>
                    <th class="psr-th-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in records" :key="record.id" class="psr-row">
                    <!-- 送審次數 -->
                    <td class="psr-cell psr-cell-num">
                      <div class="psr-num-title">第 {{ record.submissionNumber }} 次</div>
                    </td>

                    <!-- 使用資料版本 -->
                    <td class="psr-cell psr-cell-version" @click.stop>
                      <select
                        v-if="versionOptions.length > 0"
                        class="form-select form-select-sm psr-version-select"
                        :value="record.designChangeId ?? ''"
                        :disabled="isSavingVersionByRecord[record.id]"
                        @change="onVersionChange(record, ($event.target as HTMLSelectElement).value)"
                      >
                        <option v-for="opt in versionOptions" :key="String(opt.id ?? '')" :value="opt.id ?? ''">
                          {{ opt.label }}
                        </option>
                      </select>
                      <span v-else class="psr-muted small">－</span>
                    </td>

                    <!-- 監造單位審查結果 -->
                    <td
                      class="psr-cell psr-cell-doc"
                      @click="record.supervisionDocument ? openDocDetail(record, record.supervisionDocument) : onDocCellClick(record, 'SUPERVISION')"
                    >
                      <template v-if="record.supervisionDocument">
                        <div class="psr-doc-linked">
                          <div class="psr-doc-name">{{ getDocCacheField(record.supervisionDocument.documentId, 'documentNumber') || record.supervisionDocument.target.name }}</div>
                          <div class="psr-doc-date" v-if="getDocCacheField(record.supervisionDocument.documentId, 'issueDate')">
                            {{ getDocCacheField(record.supervisionDocument.documentId, 'issueDate') }}
                          </div>
                          <button
                            class="btn btn-sm psr-doc-unlink"
                            @click.stop="doUnlink(record, record.supervisionDocument!)"
                            title="取消關聯"
                          >
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </template>
                      <template v-else>
                        <div class="psr-doc-empty">
                          <i class="fa fa-plus-circle me-1"></i>點擊選擇或新增公文
                        </div>
                      </template>
                    </td>

                    <!-- 工程分局審查結果 -->
                    <td
                      class="psr-cell psr-cell-doc"
                      @click="record.governmentDocument ? openDocDetail(record, record.governmentDocument) : onDocCellClick(record, 'GOVERNMENT')"
                    >
                      <template v-if="record.governmentDocument">
                        <div class="psr-doc-linked">
                          <div class="psr-doc-name">{{ getDocCacheField(record.governmentDocument.documentId, 'documentNumber') || record.governmentDocument.target.name }}</div>
                          <div class="psr-doc-date" v-if="getDocCacheField(record.governmentDocument.documentId, 'issueDate')">
                            {{ getDocCacheField(record.governmentDocument.documentId, 'issueDate') }}
                          </div>
                          <button
                            class="btn btn-sm psr-doc-unlink"
                            @click.stop="doUnlink(record, record.governmentDocument!)"
                            title="取消關聯"
                          >
                            <i class="fa fa-times"></i>
                          </button>
                        </div>
                      </template>
                      <template v-else>
                        <div class="psr-doc-empty">
                          <i class="fa fa-plus-circle me-1"></i>點擊選擇或新增公文
                        </div>
                      </template>
                    </td>

                    <!-- 操作 -->
                    <td class="psr-cell psr-cell-actions" @click.stop>
                      <FormTableOperationMenu
                        :record="record"
                        :record-id="String(record.id)"
                        theme-class="psr-dark"
                        :table-wrapper-ref="tableWrapperRef"
                      >
                        <template #default="{ close }">
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2"
                            :class="{ disabled: isExportingByRecord[record.id] }"
                            style="cursor: pointer;"
                            @click="!isExportingByRecord[record.id] && (exportBOneForRecord(record), close())"
                          >
                            <i v-if="isExportingByRecord[record.id]" class="fa fa-spinner fa-spin"></i>
                            <i v-else class="fa fa-file-word"></i>
                            <span>匯出監造計劃書（B-1）</span>
                          </div>
                          <hr class="dropdown-divider">
                          <div
                            class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                            style="cursor: pointer;"
                            @click="confirmDelete(record); close()"
                          >
                            <i class="fa fa-trash"></i>
                            <span>刪除本次送審</span>
                          </div>
                        </template>
                      </FormTableOperationMenu>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 新增次數按鈕 -->
            <div class="psr-add-row" @click="doQuickAdd">
              <i class="fa fa-plus me-2"></i>新增第 {{ nextNumber }} 次送審
            </div>
          </template>
        </div>
      </div>

      <!-- 核定公文區塊 -->
      <div :class="['psr-block', embedded ? '' : 'mx-3', 'mt-3']">
        <div class="psr-block-body p-3">
          <div class="d-flex align-items-center gap-3">
            <div class="psr-approval-label">
              <div class="psr-approval-header">
                <i class="fa fa-stamp me-2"></i>核定日期文號
              </div>
              <div class="psr-approval-desc">公部門核定監造計畫之公文</div>
            </div>
            <div class="psr-approval-cell" @click="approvalDocument ? undefined : openApprovalDocPicker()">
            <template v-if="approvalDocument">
              <div class="psr-doc-linked">
                <div class="psr-doc-name">{{ getDocCacheField(approvalDocument.documentId, 'documentNumber') || approvalDocNumber || approvalDocument.target.name }}</div>
                <div class="psr-doc-date" v-if="getDocCacheField(approvalDocument.documentId, 'issueDate')">
                  {{ getDocCacheField(approvalDocument.documentId, 'issueDate') }}
                </div>
                <button
                  class="btn btn-sm psr-doc-unlink"
                  @click.stop="unlinkApprovalDoc"
                  title="取消關聯"
                >
                  <i class="fa fa-times"></i>
                </button>
              </div>
            </template>
            <template v-else>
              <div class="psr-doc-empty">
                <i class="fa fa-plus-circle me-1"></i>點擊選擇或新增核定公文
              </div>
            </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 核定公文選擇器 -->
      <DocumentPicker
        :show="showApprovalDocPicker"
        title="核定公文 — 選擇或新增公文"
        :constructionId="constructionId"
        :darkMode="true"
        :showNameInput="true"
        @update:show="(v: boolean) => { if (!v) showApprovalDocPicker = false }"
        @select="onApprovalDocPicked"
      />
    </template>

    <!-- 選擇公文 / 新增公文（共用組件） -->
    <DocumentPicker
      :show="showLinkModal"
      :title="`${linkRole === 'SUPERVISION' ? '監造單位' : '工程分局'}審查結果 — 選擇或新增公文`"
      :constructionId="constructionId"
      :darkMode="true"
      :showNameInput="true"
      @update:show="(v: boolean) => { if (!v) closeLinkModal() }"
      @select="onDocumentPicked"
    />

    <!-- 公文詳細 Modal -->
    <Modal
      :show="showDocDetailModal && !!docDetailItem"
      :title="docDetailItem?.fileName || '公文詳細'"
      icon="fa fa-file-lines"
      size="lg"
      modalClass="psr-modal-dark"
      :draggable="true"
      :resizable="true"
      @update:show="(v: boolean) => { if (!v) closeDocDetail() }"
    >
      <template #body>
        <div v-if="docDetailItem">
          <!-- 關聯資訊 -->
          <div class="psr-detail-section">
            <div class="psr-detail-caption">關聯資訊</div>
            <div class="psr-detail-grid">
              <div class="psr-detail-row">
                <div class="psr-detail-label">送審紀錄</div>
                <div class="psr-detail-value">第 {{ docDetailRecord?.submissionNumber }} 次送審</div>
              </div>
              <div class="psr-detail-row">
                <div class="psr-detail-label">公文角色</div>
                <div class="psr-detail-value">{{ docDetailRef?.target.role === 'SUPERVISION' ? '監造單位' : '工程分局' }}</div>
              </div>
            </div>
          </div>

          <!-- 公文欄位（可編輯） -->
          <div class="psr-detail-section">
            <div class="psr-detail-caption">公文欄位</div>
            <div class="psr-detail-form-grid">
              <div class="psr-detail-form-row">
                <label class="psr-detail-form-label">發文者</label>
                <input v-model="docDetailForm.sender" type="text" class="psr-detail-input" placeholder="發文者" />
              </div>
              <div class="psr-detail-form-row">
                <label class="psr-detail-form-label">受文者</label>
                <input v-model="docDetailForm.recipient" type="text" class="psr-detail-input" placeholder="受文者" />
              </div>
              <div class="psr-detail-form-row psr-detail-form-row-full">
                <label class="psr-detail-form-label">主旨</label>
                <textarea v-model="docDetailForm.subject" class="psr-detail-input" rows="3" placeholder="主旨"></textarea>
              </div>
              <div class="psr-detail-form-row">
                <label class="psr-detail-form-label">發文日期</label>
                <input v-model="docDetailForm.issueDate" type="text" class="psr-detail-input" placeholder="YYYY-MM-DD" />
              </div>
              <div class="psr-detail-form-row">
                <label class="psr-detail-form-label">發文字號</label>
                <input v-model="docDetailForm.documentNumber" type="text" class="psr-detail-input" placeholder="發文字號" />
              </div>
              <div class="psr-detail-form-row psr-detail-form-row-full">
                <label class="psr-detail-form-label">正本</label>
                <textarea v-model="docDetailForm.originalCopy" class="psr-detail-input" rows="2" placeholder="正本"></textarea>
              </div>
              <div class="psr-detail-form-row psr-detail-form-row-full">
                <label class="psr-detail-form-label">副本</label>
                <textarea v-model="docDetailForm.carbonCopy" class="psr-detail-input" rows="2" placeholder="副本"></textarea>
              </div>
            </div>
            <div v-if="docDetailError" class="psr-detail-error mt-2">{{ docDetailError }}</div>
          </div>

          <!-- 檔案資訊（唯讀） -->
          <div class="psr-detail-section">
            <div class="psr-detail-caption">檔案資訊</div>
            <div class="psr-detail-grid">
              <div class="psr-detail-row">
                <div class="psr-detail-label">檔案名稱</div>
                <div class="psr-detail-value psr-detail-multiline">
                  {{ docDetailItem.fileName || '－' }}
                  <a
                    v-if="docDetailItem.fileUrl"
                    :href="docDetailItem.fileUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="psr-file-link ms-2"
                    @click.stop
                  >
                    <i class="fa fa-external-link-alt me-1"></i>瀏覽原檔
                  </a>
                </div>
              </div>
              <div class="psr-detail-row">
                <div class="psr-detail-label">檔案類型</div>
                <div class="psr-detail-value">{{ docDetailItem.fileExt || '－' }}</div>
              </div>
              <div class="psr-detail-row">
                <div class="psr-detail-label">檔案大小</div>
                <div class="psr-detail-value">{{ docDetailItem.fileSize }}</div>
              </div>
              <div class="psr-detail-row">
                <div class="psr-detail-label">上傳時間</div>
                <div class="psr-detail-value">{{ docDetailItem.uploadedAt }}</div>
              </div>
              <div class="psr-detail-row">
                <div class="psr-detail-label">上傳者</div>
                <div class="psr-detail-value">{{ docDetailItem.uploader || '－' }}</div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-4 psr-muted">
          <i class="fa fa-spinner fa-spin me-1"></i>載入中…
        </div>
      </template>
      <template #footer>
        <button
          type="button"
          class="btn btn-outline-danger btn-sm me-auto"
          @click="doUnlinkFromDetail"
        >
          <i class="fa fa-unlink me-1"></i>取消關聯
        </button>
        <button type="button" class="btn btn-outline-secondary" @click="closeDocDetail">關閉</button>
        <button type="button" class="btn btn-primary" :disabled="docDetailSaving" @click="doSaveDocDetail">
          <i v-if="docDetailSaving" class="fa fa-spinner fa-spin me-1"></i>
          儲存變更
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import DocumentPicker from '@/components/document/DocumentPicker.vue'
import FormTableOperationMenu from '@/components/forms/FormTableOperationMenu.vue'
import {
  getPlanSubmissions,
  createPlanSubmission,
  linkDocument,
  unlinkDocument,
  deletePlanSubmission,
  updatePlanSubmissionDesignChangeId,
  type PlanSubmissionRecord,
  type DocumentReferenceDto
} from '@/api/planSubmission'
import { getDesignChangeList, type DesignChangeItem } from '@/api/designChange'
import { getDesignChangeIntervalISO } from '@/utils/designChangeIntervals'
import { formBApi, downloadBlobAsFile } from '@/api/forms'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
import { useExportLoading } from '@/composables/useExportLoading'
import {
  getDocumentCenterList,
  updateDocument,
  type DocumentCenterListItem,
  type OfficialDocumentExtractDto
} from '@/api/documentCenter'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false
})
const embedded = computed(() => !!props.embedded)

const workspaceStore = useWorkspaceStore()
const hasCurrentProject = computed(() => !!workspaceStore.currentProject?.id)
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')

// ===========================
// 列表
// ===========================
const records = ref<PlanSubmissionRecord[]>([])
const loading = ref(false)
const nextNumber = computed(() => records.value.length + 1)
const tableWrapperRef = ref<HTMLElement | null>(null)
const isExportingByRecord = ref<Record<number, boolean>>({})
const { runWithExportLoading } = useExportLoading()

// 使用資料版本（變更設計）選項
const designChangeList = ref<DesignChangeItem[]>([])
const isSavingVersionByRecord = ref<Record<number, boolean>>({})

function formatToRepublicDate(isoDate: string): string {
  if (!isoDate?.trim()) return ''
  const dateOnly = isoDate.trim().split('T')[0]
  const [y, m, d] = dateOnly.split('-').map(Number)
  if (!y || !m || !d) return dateOnly
  const rocYear = y - 1911
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${rocYear}.${mm}.${dd}`
}

const versionOptions = computed(() => {
  const options: { id: number | null; label: string }[] = [{ id: null, label: '原契約' }]
  const list = designChangeList.value
  for (let i = 0; i < list.length; i++) {
    const d = list[i]
    const displayName = d.versionName?.trim() || `變更設計${i + 1}`
    const interval = getDesignChangeIntervalISO({ item: d, index: i, designChangeList: list, projectEndDate: '' })
    const range = interval.start
      ? `${formatToRepublicDate(interval.start)} ～ ${interval.openEnded ? '迄今' : interval.end ? formatToRepublicDate(interval.end) : '－'}`
      : ''
    options.push({ id: d.id, label: `${displayName}${range ? `（${range}）` : ''}` })
  }
  return options
})

async function loadDesignChangeList() {
  const cid = constructionId.value
  if (!cid) {
    designChangeList.value = []
    return
  }
  try {
    const list = await getDesignChangeList(cid, 'SUPERVISORY')
    designChangeList.value = Array.isArray(list) ? list : []
  } catch {
    designChangeList.value = []
  }
}

async function onVersionChange(record: PlanSubmissionRecord, raw: string) {
  const nextId = raw === '' ? null : Number(raw)
  if (nextId !== null && Number.isNaN(nextId)) return
  const cid = constructionId.value
  if (!cid) return
  isSavingVersionByRecord.value[record.id] = true
  try {
    const updated = await updatePlanSubmissionDesignChangeId(cid, record.id, nextId)
    if (updated) {
      const idx = records.value.findIndex(r => r.id === record.id)
      if (idx !== -1) records.value[idx] = { ...records.value[idx], ...updated }
    }
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? '更新版本失敗')
  } finally {
    isSavingVersionByRecord.value[record.id] = false
  }
}

async function loadRecords() {
  const cid = constructionId.value
  if (!cid) return
  loading.value = true
  try {
    const [list] = await Promise.all([getPlanSubmissions(cid), loadDesignChangeList()])
    records.value = list
    refreshDocCache()
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
}

watch(hasCurrentProject, async (ok) => {
  if (ok) {
    await loadRecords()
    await loadApprovalDoc()
  }
}, { immediate: true })

async function exportBOneForRecord(record: PlanSubmissionRecord) {
  const cid = constructionId.value
  if (!cid) return

  const taskId = `b1-record-${record.id}`
  isExportingByRecord.value[record.id] = true
  try {
    await runWithExportLoading(taskId, 'B-1 監造計劃書', async (signal) => {
      const request = {
        itemNumber: 0,
        valueMap: {
          reportData: {
            constructionId: cid.trim(),
            planSubmissionRecordId: record.id
          }
        }
      }
      const response = await formBApi.exportSupervisoryPlan(request, { signal })
      const fallbackName = `監造計劃書_B-1_第${record.submissionNumber}次送審_${Date.now()}.docx`
      const fileName = extractFileNameFromResponse(response) || fallbackName
      downloadBlobAsFile(response.data, fileName)
    })
  } catch (e: any) {
    if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') return
    alert(e?.response?.data?.message ?? e?.message ?? '匯出失敗')
  } finally {
    isExportingByRecord.value[record.id] = false
  }
}

// ===========================
// 快速新增（點表格下方按鈕）
// ===========================
async function doQuickAdd() {
  const cid = constructionId.value
  if (!cid) return
  try {
    await createPlanSubmission(cid, {})
    await loadRecords()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? '新增失敗')
  }
}

// ===========================
// 核定公文
// ===========================
const approvalDocument = ref<DocumentReferenceDto | null>(null)
const approvalDocNumber = ref('')
const approvalDocIssueDate = ref('')
const showApprovalDocPicker = ref(false)

async function loadApprovalDoc() {
  const cid = constructionId.value
  if (!cid) return
  try {
    const { getPlanSubmissionApproval } = await import('@/api/planSubmission')
    const result = await getPlanSubmissionApproval(cid)
    if (result.documentRef) {
      approvalDocument.value = result.documentRef
      approvalDocNumber.value = result.docNumber || ''
      approvalDocIssueDate.value = result.issueDate || ''
    } else {
      approvalDocument.value = null
      approvalDocNumber.value = ''
      approvalDocIssueDate.value = ''
    }
  } catch { /* ignore */ }
}

function openApprovalDocPicker() {
  showApprovalDocPicker.value = true
}

async function onApprovalDocPicked(payload: { document: DocumentCenterListItem; documentName: string }) {
  const cid = constructionId.value
  if (!cid) return
  try {
    const { linkApprovalDocument } = await import('@/api/planSubmission')
    await linkApprovalDocument(cid, payload.document.id, payload.documentName || payload.document.subject || '')
    showApprovalDocPicker.value = false
    await loadApprovalDoc()
    await refreshDocCache()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? '關聯失敗')
  }
}

async function unlinkApprovalDoc() {
  if (!approvalDocument.value || !confirm('確定取消核定公文的關聯？')) return
  const cid = constructionId.value
  if (!cid) return
  try {
    const { unlinkApprovalDocument } = await import('@/api/planSubmission')
    await unlinkApprovalDocument(cid, approvalDocument.value.id)
    approvalDocument.value = null
    approvalDocNumber.value = ''
    approvalDocIssueDate.value = ''
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? '取消關聯失敗')
  }
}

// ===========================
// 刪除
// ===========================
async function confirmDelete(record: PlanSubmissionRecord) {
  if (!confirm(`確定刪除「第 ${record.submissionNumber} 次送審」？\n（公文本身不會被刪除，僅刪除關聯）`)) return
  try {
    await deletePlanSubmission(constructionId.value, record.id)
    await loadRecords()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? '刪除失敗')
  }
}

// ===========================
// 選擇/新增公文（使用共用 DocumentPicker）
// ===========================
const showLinkModal = ref(false)
const linkRecordId = ref<number>(0)
const linkRole = ref<string>('SUPERVISION')

function onDocCellClick(record: PlanSubmissionRecord, role: string) {
  // 如果已有公文就不開 modal（使用者要先取消關聯）
  const hasDoc = role === 'SUPERVISION' ? record.supervisionDocument : record.governmentDocument
  if (hasDoc) return

  linkRecordId.value = record.id
  linkRole.value = role
  showLinkModal.value = true
}

function closeLinkModal() {
  showLinkModal.value = false
}

/** DocumentPicker 選取後的回調：關聯公文到送審紀錄 */
async function onDocumentPicked(payload: { document: DocumentCenterListItem; documentName: string }) {
  try {
    await linkDocument(constructionId.value, linkRecordId.value, {
      documentId: payload.document.id,
      role: linkRole.value,
      documentName: payload.documentName || payload.document.subject || payload.document.fileName || ''
    })
    closeLinkModal()
    await loadRecords()
    await refreshDocCache()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? '關聯失敗')
  }
}

async function doUnlink(record: PlanSubmissionRecord, docRef: DocumentReferenceDto) {
  if (!confirm('確定取消此公文的關聯？')) return
  try {
    await unlinkDocument(constructionId.value, record.id, docRef.id)
    await loadRecords()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? '取消關聯失敗')
  }
}

// ===========================
// 公文快取（用於表格顯示日期等）
// ===========================
const docCache = ref<Map<number, DocumentCenterListItem>>(new Map())

function getDocCacheField(docId: number, field: keyof DocumentCenterListItem): string {
  const item = docCache.value.get(docId)
  if (!item) return ''
  return String(item[field] || '')
}

/** 載入所有已關聯公文的快取資料 */
async function refreshDocCache() {
  const cid = constructionId.value
  if (!cid) return
  try {
    const list = await getDocumentCenterList(cid)
    const map = new Map<number, DocumentCenterListItem>()
    for (const item of list) map.set(item.id, item)
    docCache.value = map
  } catch { /* ignore */ }
}

// ===========================
// 公文詳細 Modal
// ===========================
const showDocDetailModal = ref(false)
const docDetailRecord = ref<PlanSubmissionRecord | null>(null)
const docDetailRef = ref<DocumentReferenceDto | null>(null)
const docDetailItem = ref<DocumentCenterListItem | null>(null)
const docDetailForm = ref<OfficialDocumentExtractDto>({
  sender: '', recipient: '', subject: '', issueDate: '', documentNumber: '', originalCopy: '', carbonCopy: ''
})
const docDetailSaving = ref(false)
const docDetailError = ref('')

function openDocDetail(record: PlanSubmissionRecord, docRef: DocumentReferenceDto) {
  docDetailRecord.value = record
  docDetailRef.value = docRef
  docDetailError.value = ''
  showDocDetailModal.value = true

  // 從快取取得公文完整資料
  const cached = docCache.value.get(docRef.documentId)
  if (cached) {
    docDetailItem.value = cached
    docDetailForm.value = {
      sender: cached.sender || '',
      recipient: cached.recipient || '',
      subject: cached.subject || '',
      issueDate: cached.issueDate || '',
      documentNumber: cached.documentNumber || '',
      originalCopy: cached.originalCopy || '',
      carbonCopy: cached.carbonCopy || ''
    }
  } else {
    docDetailItem.value = null
    // 重新載入
    loadDocDetailItem(docRef.documentId)
  }
}

async function loadDocDetailItem(documentId: number) {
  const cid = constructionId.value
  if (!cid) return
  try {
    const list = await getDocumentCenterList(cid)
    for (const item of list) {
      docCache.value.set(item.id, item)
      if (item.id === documentId) {
        docDetailItem.value = item
        docDetailForm.value = {
          sender: item.sender || '',
          recipient: item.recipient || '',
          subject: item.subject || '',
          issueDate: item.issueDate || '',
          documentNumber: item.documentNumber || '',
          originalCopy: item.originalCopy || '',
          carbonCopy: item.carbonCopy || ''
        }
      }
    }
  } catch { /* ignore */ }
}

function closeDocDetail() {
  showDocDetailModal.value = false
  docDetailRecord.value = null
  docDetailRef.value = null
  docDetailItem.value = null
  docDetailError.value = ''
}

async function doSaveDocDetail() {
  const cid = constructionId.value
  const item = docDetailItem.value
  if (!cid || !item) return
  docDetailError.value = ''
  docDetailSaving.value = true
  try {
    const result = await updateDocument(cid, item.id, docDetailForm.value)
    if (result) {
      // 更新快取
      Object.assign(item, {
        sender: result.sender,
        recipient: result.recipient,
        subject: result.subject,
        issueDate: result.issueDate,
        documentNumber: result.documentNumber,
        originalCopy: result.originalCopy,
        carbonCopy: result.carbonCopy
      })
      docCache.value.set(item.id, item)
      closeDocDetail()
    } else {
      docDetailError.value = '更新失敗'
    }
  } catch (e: any) {
    docDetailError.value = e?.response?.data?.message ?? e?.message ?? '更新失敗'
  } finally {
    docDetailSaving.value = false
  }
}

async function doUnlinkFromDetail() {
  const record = docDetailRecord.value
  const docRef = docDetailRef.value
  if (!record || !docRef) return
  if (!confirm('確定取消此公文的關聯？')) return
  try {
    await unlinkDocument(constructionId.value, record.id, docRef.id)
    closeDocDetail()
    await loadRecords()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? e?.message ?? '取消關聯失敗')
  }
}

// ===========================
// 狀態顯示
// ===========================
onMounted(async () => {
  if (hasCurrentProject.value) {
    await loadRecords()
    await refreshDocCache()
    await loadApprovalDoc()
  }
})

</script>

<style scoped>
/* ===== 暗色主題變數 ===== */
.psr-dark {
  --psr-bg: #1a1d21;
  --psr-card: #25282c;
  --psr-border: #4a4d54;
  --psr-text: #e4e6eb;
  --psr-muted: #b0b3b8;
  --psr-thead: #2d3748;
  --psr-hover: rgba(255, 255, 255, 0.06);
  --psr-accent: #60a5fa;
  --psr-accent-dim: rgba(96, 165, 250, 0.12);
  --psr-danger: #f87171;
  --psr-input-bg: #2d3139;
  --psr-input-border: #3a3d42;
  /* 對齊 A 表單的操作下拉（FormTableOperationMenu 使用 --a5-* 變數） */
  --a5-card: var(--psr-card);
  --a5-border: var(--psr-border);
  --a5-text: var(--psr-text);
  --a5-hover: var(--psr-hover);
}

.form-b-plan-submission-page {
  padding: 1rem;
  color: var(--psr-text);
}

.psr-embedded {
  padding: 0;
  color: var(--psr-text);
}

.psr-muted { color: var(--psr-muted); }

.psr-alert-warn {
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  color: #fbbf24;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

/* ===== 區塊 ===== */
.psr-block {
  background: var(--psr-card);
  border: 1px solid var(--psr-border);
  border-radius: 8px;
  overflow: hidden;
}

.psr-block-body {
  color: var(--psr-text);
}

/* ===== 送審紀錄表格 ===== */
.psr-table {
  width: 100%;
  border-collapse: collapse;
}

.psr-table {
  border: 2px solid var(--psr-border);
}

.psr-table thead th {
  background: var(--psr-thead);
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
  padding: 0.75rem;
  border: 1.5px solid var(--psr-border);
  color: var(--psr-muted);
}

.psr-th-num { width: 140px; }
.psr-th-version { width: 180px; }
.psr-th-actions { width: 96px; text-align: center; }

.psr-cell {
  border: 1.5px solid var(--psr-border);
  padding: 0.75rem;
  vertical-align: middle;
  min-height: 100px;
}

/* 送審次數儲存格 */
.psr-cell-num {
  text-align: center;
}

.psr-num-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--psr-text);
}

/* 公文儲存格 */
.psr-cell-doc {
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.psr-cell-doc:hover {
  background: var(--psr-hover);
}

/* 已關聯公文 */
.psr-doc-linked {
  position: relative;
  padding-right: 2.5rem;
}

.psr-doc-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--psr-accent);
  margin-bottom: 0.25rem;
}

.psr-doc-meta {
  font-size: 0.8rem;
  color: var(--psr-muted);
  line-height: 1.4;
}

.psr-doc-unlink {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.2rem 0.4rem;
  font-size: 0.75rem;
  color: var(--psr-danger);
  border: 1px solid rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.1);
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s;
}

.psr-cell-doc:hover .psr-doc-unlink,
.psr-approval-cell:hover .psr-doc-unlink {
  opacity: 1;
}

.psr-doc-unlink:hover {
  color: #fff;
  background: var(--psr-danger);
  border-color: var(--psr-danger);
  opacity: 1;
}

/* 空白儲存格 */
.psr-doc-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  color: var(--psr-muted);
  font-size: 0.85rem;
  border: 2px dashed var(--psr-border);
  border-radius: 6px;
  transition: all 0.15s;
  padding: 1rem; 
}

.psr-cell-doc:hover .psr-doc-empty {
  color: var(--psr-accent);
  border-color: var(--psr-accent);
  background: var(--psr-accent-dim);
}

/* 使用資料版本欄 */
.psr-cell-version {
  vertical-align: middle;
}

.psr-version-select {
  /* 不用 background 縮寫，避免把 form-select 的下拉箭頭背景圖覆蓋掉 */
  background-color: var(--psr-input-bg, #2d3139);
  border: 1px solid var(--psr-input-border, #3a3d42);
  color: var(--psr-text, #e4e6eb);
  font-size: 0.85rem;
  min-width: 100%;
}

.psr-version-select:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.psr-version-select option {
  background-color: var(--psr-input-bg, #2d3139);
  color: var(--psr-text, #e4e6eb);
}

.psr-version-select:focus {
  border-color: var(--psr-accent, #60a5fa);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

/* 操作欄 */
.psr-cell-actions {
  text-align: center;
  vertical-align: middle;
}

.psr-cell-actions .btn-outline-danger {
  color: var(--psr-muted);
  border-color: transparent;
}

.psr-cell-actions .btn-outline-danger:hover {
  color: var(--psr-danger);
  border-color: var(--psr-danger);
  background: rgba(248, 113, 113, 0.1);
}

/* 新增次數按鈕列 */
.psr-add-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem;
  font-size: 0.9rem;
  color: var(--psr-accent);
  cursor: pointer;
  border-top: 2px dashed var(--psr-border);
  transition: background 0.15s, color 0.15s;
}

.psr-add-row:hover {
  background: var(--psr-accent-dim);
  color: #93c5fd;
}

/* ===== Modal 暗色主題 ===== */
:deep(.psr-modal-dark .modal-content) {
  background: var(--psr-card, #25282c);
  border: 1px solid var(--psr-border, #3a3d42);
  color: var(--psr-text, #e4e6eb);
}

:deep(.psr-modal-dark .modal-header) {
  border-bottom-color: var(--psr-border, #3a3d42);
  color: var(--psr-text, #e4e6eb);
}

:deep(.psr-modal-dark .modal-footer) {
  border-top-color: var(--psr-border, #3a3d42);
}

:deep(.psr-modal-dark .modal-title) {
  color: var(--psr-text, #e4e6eb);
}

:deep(.psr-modal-dark .btn-close) {
  filter: invert(1);
}

:deep(.psr-modal-dark .form-control),
:deep(.psr-modal-dark .form-select) {
  background: var(--psr-input-bg, #2d3139);
  border-color: var(--psr-input-border, #3a3d42);
  color: var(--psr-text, #e4e6eb);
}

:deep(.psr-modal-dark .form-control:focus),
:deep(.psr-modal-dark .form-select:focus) {
  border-color: var(--psr-accent, #60a5fa);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15);
}

:deep(.psr-modal-dark .form-control::placeholder) {
  color: rgba(176, 179, 184, 0.6);
}

:deep(.psr-modal-dark .form-label) {
  color: var(--psr-muted, #b0b3b8);
}

:deep(.psr-modal-dark .nav-tabs) {
  border-bottom-color: var(--psr-border, #3a3d42);
}

:deep(.psr-modal-dark .nav-tabs .nav-link) {
  color: var(--psr-muted, #b0b3b8);
  border: none;
  padding: 0.5rem 1rem;
}

:deep(.psr-modal-dark .nav-tabs .nav-link.active) {
  color: var(--psr-accent, #60a5fa);
  background: transparent;
  border-bottom: 2px solid var(--psr-accent, #60a5fa);
}

:deep(.psr-modal-dark .nav-tabs .nav-link:hover:not(.active)) {
  color: var(--psr-text, #e4e6eb);
  border-color: transparent;
}

:deep(.psr-modal-dark .list-group-item) {
  background: var(--psr-input-bg, #2d3139);
  border-color: var(--psr-border, #3a3d42);
  color: var(--psr-text, #e4e6eb);
}

:deep(.psr-modal-dark .list-group-item:hover),
:deep(.psr-modal-dark .list-group-item-action:hover) {
  background: var(--psr-hover, rgba(255, 255, 255, 0.06));
}

:deep(.psr-modal-dark .list-group-item.active) {
  background: var(--psr-accent-dim, rgba(96, 165, 250, 0.12));
  border-color: var(--psr-accent, #60a5fa);
  color: var(--psr-accent, #60a5fa);
}

:deep(.psr-modal-dark .list-group-item.active .text-muted) {
  color: var(--psr-muted, #b0b3b8) !important;
}

:deep(.psr-modal-dark .alert-danger) {
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.3);
  color: #fca5a5;
}

:deep(.psr-modal-dark .text-muted) {
  color: var(--psr-muted, #b0b3b8) !important;
}

:deep(.psr-modal-dark .text-primary) {
  color: var(--psr-accent, #60a5fa) !important;
}

:deep(.psr-modal-dark .btn-outline-secondary) {
  color: var(--psr-muted, #b0b3b8);
  border-color: var(--psr-border, #3a3d42);
}

:deep(.psr-modal-dark .btn-outline-secondary:hover) {
  color: var(--psr-text, #e4e6eb);
  background: var(--psr-hover, rgba(255, 255, 255, 0.06));
  border-color: var(--psr-muted, #b0b3b8);
}

:deep(.psr-modal-dark .btn-primary) {
  background: var(--psr-accent, #60a5fa);
  border-color: var(--psr-accent, #60a5fa);
  color: #1a1d21;
}

:deep(.psr-modal-dark .btn-primary:hover) {
  background: #93c5fd;
  border-color: #93c5fd;
}

:deep(.psr-modal-dark .btn-primary:disabled) {
  background: rgba(96, 165, 250, 0.4);
  border-color: transparent;
  color: rgba(26, 29, 33, 0.5);
}

:deep(.psr-modal-dark .form-control-sm) {
  background: var(--psr-input-bg, #2d3139);
  border-color: var(--psr-input-border, #3a3d42);
  color: var(--psr-text, #e4e6eb);
}

:deep(.psr-modal-dark .form-control-sm:focus) {
  border-color: var(--psr-accent, #60a5fa);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15);
}

:deep(.psr-modal-dark .fw-bold) {
  color: var(--psr-text, #e4e6eb);
}

/* ===== PageHeader 暗色適配 ===== */
:deep(.page-header) {
  background: transparent !important;
}

:deep(.page-header h1),
:deep(.page-header .page-header-title) {
  color: var(--psr-text, #e4e6eb);
}

:deep(.breadcrumb-item),
:deep(.breadcrumb-item a) {
  color: var(--psr-muted, #b0b3b8);
}

:deep(.breadcrumb-item.active) {
  color: var(--psr-text, #e4e6eb);
}


/* ===== 核定公文區塊 ===== */
.psr-approval-header {
  font-size: 1rem;
  font-weight: 600;
  color: var(--psr-text);
}

.psr-approval-desc {
  font-size: 0.8rem;
  color: var(--psr-muted);
  margin-top: 0.25rem;
}

.psr-approval-label {
  flex-shrink: 0;
  min-width: 180px;
}

.psr-approval-cell {
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  max-width: 350px;
}

.psr-approval-cell:hover .psr-doc-empty {
  color: var(--psr-accent);
  border-color: var(--psr-accent);
  background: var(--psr-accent-dim);
}

.psr-approval-cell:hover .psr-doc-unlink {
  opacity: 1;
}

/* ===== 表格公文日期 ===== */
.psr-doc-date {
  font-size: 0.8rem;
  color: var(--psr-muted);
  margin-top: 0.15rem;
}

/* ===== 公文詳細 Modal 內容 ===== */
.psr-detail-section {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
}

.psr-detail-caption {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--psr-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.psr-detail-grid {
  border: 1px solid var(--psr-border);
  border-radius: 8px;
  overflow: hidden;
}

.psr-detail-row {
  display: grid;
  grid-template-columns: 7rem 1fr;
  align-items: start;
  padding: 0.5rem 0.75rem;
}

.psr-detail-row + .psr-detail-row {
  border-top: 1px solid var(--psr-border);
}

.psr-detail-label {
  color: var(--psr-muted);
  font-weight: 600;
  font-size: 0.85rem;
}

.psr-detail-value {
  color: var(--psr-text);
  font-size: 0.9rem;
}

.psr-detail-multiline {
  white-space: pre-wrap;
}

.psr-file-link {
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  color: var(--psr-accent);
  text-decoration: none;
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--psr-accent);
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
  vertical-align: middle;
}

.psr-file-link:hover {
  background: var(--psr-accent-dim);
  color: #93c5fd;
}

/* 可編輯表單 */
.psr-detail-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.psr-detail-form-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.psr-detail-form-row-full {
  grid-column: 1 / -1;
}

.psr-detail-form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--psr-muted);
}

.psr-detail-input {
  background: var(--psr-input-bg);
  border: 1px solid var(--psr-input-border);
  border-radius: 6px;
  color: var(--psr-text);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  width: 100%;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.psr-detail-input:focus {
  outline: none;
  border-color: var(--psr-accent);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15);
}

.psr-detail-input::placeholder {
  color: rgba(176, 179, 184, 0.5);
}

textarea.psr-detail-input {
  resize: vertical;
}

.psr-detail-error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #fca5a5;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

/* 取消關聯按鈕 in modal footer */
:deep(.psr-modal-dark .btn-outline-danger) {
  color: var(--psr-danger, #f87171);
  border-color: rgba(248, 113, 113, 0.3);
}

:deep(.psr-modal-dark .btn-outline-danger:hover) {
  background: rgba(248, 113, 113, 0.1);
  border-color: var(--psr-danger, #f87171);
  color: #fca5a5;
}
</style>
