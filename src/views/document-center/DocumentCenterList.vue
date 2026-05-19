<template>
  <div class="document-center-list-page doc-center-dark">
    <PageHeader
      title="公文中心"
      icon="fa fa-folder-open"
      :breadcrumbs="[
        { text: '公文中心', href: '#' },
        { text: '公文列表', active: true }
      ]"
      :actions="[
        {
          text: '上傳公文',
          icon: 'fa fa-upload',
          variant: 'btn-primary',
          disabled: !hasCurrentProject,
          click: openUpload
        }
      ]"
    />

    <template v-if="hasCurrentProject">
      <div class="doc-center-block doc-center-block-bar mb-3">
        <div class="doc-center-block-body doc-center-bar-inner">
          <div class="doc-center-filters">
            <div class="doc-center-filter-item doc-center-filter-item-wide">
              <div class="doc-center-filter-label">關鍵字</div>
              <input v-model="filterKeyword" type="text" class="doc-center-input" placeholder="搜尋：主旨 / 發文者 / 受文者 / 檔名" />
            </div>

            <div class="doc-center-filter-item doc-center-combo-wrap">
              <div class="doc-center-filter-label">發文者</div>
              <div class="doc-center-combo">
                <input
                  v-model="filterSender"
                  type="text"
                  class="doc-center-input doc-center-combo-input"
                  placeholder="例：XX營造"
                  @focus="openSenderMenu"
                  @blur="closeSenderMenu"
                />
                <span class="doc-center-combo-arrow" @mousedown.prevent="toggleSenderMenu">
                  <i class="fa fa-chevron-down"></i>
                </span>
                <div v-show="senderMenuOpen" class="doc-center-combo-menu" ref="senderMenuRef">
                  <div
                    v-for="opt in filteredSenderOptions"
                    :key="opt"
                    class="doc-center-combo-item"
                    @mousedown.prevent="selectSender(opt)"
                  >
                    {{ opt }}
                  </div>
                  <div v-if="filteredSenderOptions.length === 0" class="doc-center-combo-item doc-center-combo-empty">
                    無符合選項，可自行輸入
                  </div>
                </div>
              </div>
            </div>

            <div class="doc-center-filter-item doc-center-combo-wrap">
              <div class="doc-center-filter-label">受文者</div>
              <div class="doc-center-combo">
                <input
                  v-model="filterRecipient"
                  type="text"
                  class="doc-center-input doc-center-combo-input"
                  placeholder="例：技師事務所"
                  @focus="openRecipientMenu"
                  @blur="closeRecipientMenu"
                />
                <span class="doc-center-combo-arrow" @mousedown.prevent="toggleRecipientMenu">
                  <i class="fa fa-chevron-down"></i>
                </span>
                <div v-show="recipientMenuOpen" class="doc-center-combo-menu" ref="recipientMenuRef">
                  <div
                    v-for="opt in filteredRecipientOptions"
                    :key="opt"
                    class="doc-center-combo-item"
                    @mousedown.prevent="selectRecipient(opt)"
                  >
                    {{ opt }}
                  </div>
                  <div v-if="filteredRecipientOptions.length === 0" class="doc-center-combo-item doc-center-combo-empty">
                    無符合選項，可自行輸入
                  </div>
                </div>
              </div>
            </div>

            <div class="doc-center-filter-item">
              <div class="doc-center-filter-label">類別</div>
              <span v-if="isCategoryLocked" class="doc-center-category-display" :title="'由 A-8～A-11 進入，類別已鎖定'">
                {{ categoryLabel(filterCategory) }}
              </span>
              <select
                v-else
                v-model="filterCategory"
                class="doc-center-input doc-center-select"
              >
                <option value="">全部</option>
                <option v-for="opt in DOCUMENT_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="doc-center-filter-item doc-center-filter-item-date">
              <div class="doc-center-filter-label">發文日期</div>
              <div class="doc-center-date-range">
                <RepublicDatePicker
                  v-model="filterIssueDateFrom"
                  inputClass="doc-center-input"
                  :useRepublicYear="true"
                  :hideIcon="true"
                />
                <span class="doc-center-date-sep">～</span>
                <RepublicDatePicker
                  v-model="filterIssueDateTo"
                  inputClass="doc-center-input"
                  :useRepublicYear="true"
                  :hideIcon="true"
                />
              </div>
            </div>
          </div>
          <div class="doc-center-bar-actions">
            <button type="button" class="doc-center-btn doc-center-btn-secondary" @click="clearFilters">清除條件</button>
            <button type="button" class="doc-center-btn doc-center-btn-secondary" @click="loadList">
              <i class="fa fa-sync me-1"></i>重新載入
            </button>
          </div>
        </div>
      </div>

      <div class="doc-center-block">
        <div class="doc-center-block-body doc-center-list-inner">
          <div v-if="listLoading" class="doc-center-empty">
            <i class="fa fa-spinner fa-spin fa-2x mb-3"></i>
            <p class="mb-0">載入中…</p>
          </div>
          <div v-else-if="filteredList.length === 0" class="doc-center-empty">
            <i class="fa fa-cloud-upload-alt fa-3x mb-3 opacity-50"></i>
            <p class="mb-0">尚無上傳公文，請點擊「上傳公文」上傳檔案（支援 PDF 與圖片，將以系統辨識內容，並自動填入欄位）。</p>
          </div>
          <div v-else class="doc-center-table-wrap">
            <table class="doc-center-table">
              <thead>
                <tr>
                  <th>主旨</th>
                  <th class="text-nowrap" style="width: 10rem;">類別</th>
                  <th class="text-nowrap" style="width: 12rem;">發文字號</th>
                  <th class="text-nowrap" style="width: 10rem;">發文者</th>
                  <th class="text-nowrap" style="width: 10rem;">受文者</th>
                  <th class="text-nowrap" style="width: 8rem;">發文日期</th>
                  <th class="text-nowrap text-center" style="width: 8rem;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredList"
                  :key="item.id"
                  class="doc-center-row doc-center-row-clickable"
                  role="button"
                  tabindex="0"
                  @click="openDetail(item)"
                  @keydown.enter.prevent="openDetail(item)"
                >
                  <td>
                    <span class="doc-center-text doc-center-subject" :title="item.subject || ''">
                      {{ subjectPreview(item.subject) || '－' }}
                    </span>
                    <div v-if="item.usages && item.usages.length > 0" class="doc-center-usage-inline" @click.stop="showUsagesPopover(item)">
                      <i class="fa fa-link me-1"></i>{{ item.usages[0].displayTitle }}
                      <span v-if="item.usages.length > 1" class="doc-center-usage-more">+{{ item.usages.length - 1 }}</span>
                    </div>
                  </td>
                  <td class="doc-center-muted small">{{ categoryLabel(item.documentCategory) }}</td>
                  <td class="doc-center-muted small" style="word-break: break-all;">{{ item.documentNumber || '－' }}</td>
                  <td class="text-nowrap doc-center-muted small">{{ item.sender || '－' }}</td>
                  <td class="text-nowrap doc-center-muted small">{{ item.recipient || '－' }}</td>
                  <td class="text-nowrap doc-center-muted small">{{ item.issueDate ? displayIssueDateRoc(item.issueDate) : '－' }}</td>
                  <td class="doc-center-td-actions">
                    <div class="doc-center-actions-row">
                      <span
                        class="doc-center-action-btn"
                        title="預覽"
                        @click.stop="openListPreviewInNewTab(item)"
                      >
                        <i class="fa fa-eye"></i>
                        <span>預覽</span>
                      </span>
                      <a
                        v-if="item.fileUrl"
                        :href="item.fileUrl"
                        target="_blank"
                        rel="noopener"
                        class="doc-center-action-btn"
                        title="下載原檔"
                        @click.stop
                      >
                        <i :class="item.fileType === 'pdf' ? 'fa fa-file-pdf' : ['png','jpg','jpeg','webp','gif'].includes(item.fileType) ? 'fa fa-file-image' : 'fa fa-file-lines'"></i>
                        <span>原檔</span>
                      </a>
                      <span
                        class="doc-center-action-btn"
                        title="檢視詳細"
                        @click.stop="openDetail(item)"
                      >
                        <i class="fa fa-pencil"></i>
                        <span>詳細</span>
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- 公文詳細 Modal（使用共用元件） -->
    <Modal
      :show="showDetailModal && !!detailItem"
      :title="detailItem?.fileName || '公文詳細'"
      icon="fa fa-file-lines"
      size="lg"
      modalClass="doc-center-modal-skin doc-center-dark"
      :draggable="true"
      :resizable="true"
      @update:show="(v) => { if (!v) closeDetailModal() }"
    >
      <template #body>
        <div v-if="detailItem">
          <!-- 公文欄位（可編輯）放在上面 -->
          <div class="doc-center-detail-section">
            <div class="doc-center-detail-caption">公文欄位</div>
            <div class="doc-center-form-grid">
              <div class="doc-center-form-row">
                <label class="doc-center-form-label">發文者</label>
                <input v-model="detailForm.sender" type="text" class="doc-center-input" placeholder="發文者" />
              </div>
              <div class="doc-center-form-row">
                <label class="doc-center-form-label">受文者</label>
                <input v-model="detailForm.recipient" type="text" class="doc-center-input" placeholder="受文者" />
              </div>
              <div class="doc-center-form-row doc-center-form-row-full">
                <label class="doc-center-form-label">主旨</label>
                <textarea v-model="detailForm.subject" class="doc-center-input" rows="3" placeholder="主旨"></textarea>
              </div>
              <div class="doc-center-form-row">
                <label class="doc-center-form-label">發文日期</label>
                <RepublicDatePicker
                  v-model="detailForm.issueDate"
                  inputClass="doc-center-input"
                  :useRepublicYear="true"
                  :hideIcon="true"
                />
              </div>
              <div class="doc-center-form-row">
                <label class="doc-center-form-label">發文字號</label>
                <input v-model="detailForm.documentNumber" type="text" class="doc-center-input" placeholder="發文字號" />
              </div>
              <div class="doc-center-form-row">
                <label class="doc-center-form-label">類別</label>
                <select v-model="detailForm.documentCategory" class="doc-center-input doc-center-select">
                  <option value="">—</option>
                  <option v-for="opt in DOCUMENT_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="doc-center-form-row doc-center-form-row-full">
                <label class="doc-center-form-label">正本</label>
                <textarea v-model="detailForm.originalCopy" class="doc-center-input" rows="2" placeholder="正本"></textarea>
              </div>
              <div class="doc-center-form-row doc-center-form-row-full">
                <label class="doc-center-form-label">副本</label>
                <textarea v-model="detailForm.carbonCopy" class="doc-center-input" rows="2" placeholder="副本"></textarea>
              </div>
            </div>
            <div v-if="detailError" class="doc-center-error mt-2">{{ detailError }}</div>
          </div>
          <!-- 檔案資訊（唯讀）放在下面 -->
          <div class="doc-center-detail-section">
            <div class="doc-center-detail-caption">檔案資訊</div>
            <div class="doc-center-detail-grid">
              <div class="doc-center-detail-row">
                <div class="doc-center-detail-label">檔案名稱</div>
                <div class="doc-center-detail-value doc-center-detail-multiline">
                  {{ detailItem.fileName || '－' }}
                  <button
                    type="button"
                    class="doc-center-file-link ms-2 btn btn-link btn-sm p-0 align-baseline"
                    @click.stop="openDetailPreviewInNewTab"
                  >
                    <i class="fa fa-external-link-alt me-1"></i>開啟原檔
                  </button>
                </div>
              </div>
              <div class="doc-center-detail-row">
                <div class="doc-center-detail-label">檔案類型</div>
                <div class="doc-center-detail-value">{{ detailItem.fileExt || '－' }}</div>
              </div>
              <div class="doc-center-detail-row">
                <div class="doc-center-detail-label">檔案大小</div>
                <div class="doc-center-detail-value">{{ detailItem.fileSize }}</div>
              </div>
              <div class="doc-center-detail-row">
                <div class="doc-center-detail-label">上傳時間</div>
                <div class="doc-center-detail-value">{{ detailItem.uploadedAt }}</div>
              </div>
              <div class="doc-center-detail-row">
                <div class="doc-center-detail-label">上傳者</div>
                <div class="doc-center-detail-value">{{ detailItem.uploader || '－' }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <button
          type="button"
          class="btn btn-outline-danger btn-sm me-auto"
          :disabled="detailDeleting"
          @click="doDeleteDocument"
        >
          <i class="fa fa-trash me-1"></i>刪除公文
        </button>
        <button
          type="button"
          class="btn btn-outline-info"
          :disabled="detailPreviewLoading || !detailItem"
          title="在新分頁預覽原檔（本機無 Signed URL 時改以登入權限下載）"
          @click="openDetailPreviewInNewTab"
        >
          <i v-if="detailPreviewLoading" class="fa fa-spinner fa-spin me-1"></i>
          <i v-else class="fa fa-eye me-1"></i>預覽
        </button>
        <button type="button" class="btn btn-outline-secondary" @click="closeDetailModal">關閉</button>
        <button type="button" class="btn btn-primary" :disabled="detailSaving" @click="doUpdateDetail">
          <i v-if="detailSaving" class="fa fa-spinner fa-spin me-1"></i>
          儲存變更
        </button>
      </template>
    </Modal>

    <!-- 匯入公文（使用共用 DocumentPicker，僅顯示上傳 Tab） -->
    <DocumentPicker
      :show="showImportModal"
      title="匯入公文"
      :constructionId="constructionId"
      :darkMode="true"
      :showNameInput="false"
      :hideSelectTab="true"
      @update:show="(v: boolean) => { showImportModal = v }"
      @select="onImportDocumentSaved"
    />

    <!-- 使用位置列表 Modal -->
    <Modal
      :show="showUsagesModal && !!usagesPopoverItem"
      title="使用位置"
      :hideConfirmButton="true"
      cancelText="關閉"
      @update:show="(v: boolean) => { if (!v) closeUsagesModal() }"
    >
      <template #body>
        <div v-if="usagesPopoverItem" class="list-group list-group-flush">
          <div
            v-for="usage in usagesPopoverItem.usages"
            :key="usage.referenceId"
            class="list-group-item doc-center-usage-modal-item"
          >
            <i class="fa fa-link me-2 text-info"></i>{{ usage.displayTitle }}
          </div>
        </div>
      </template>
    </Modal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DocumentPicker from '@/components/document/DocumentPicker.vue'
import {
  getDocumentCenterList,
  getDocumentFileUrl,
  openDocumentInNewTab,
  updateDocument,
  deleteDocument,
  DOCUMENT_CATEGORY_OPTIONS,
  type DocumentCenterListItem,
  type OfficialDocumentExtractDto
} from '@/api/documentCenter'

const workspaceStore = useWorkspaceStore()
const route = useRoute()

const hasCurrentProject = computed(() => !!workspaceStore.currentProject)
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')

const filterKeyword = ref('')
const filterSender = ref('')
const filterRecipient = ref('')
const filterCategory = ref('')
const filterIssueDateFrom = ref('') // YYYY-MM-DD
const filterIssueDateTo = ref('')   // YYYY-MM-DD

function categoryLabel(value: string | undefined): string {
  if (!value) return '－'
  const opt = DOCUMENT_CATEGORY_OPTIONS.find(o => o.value === value)
  return opt ? opt.label : value
}
const documentList = ref<DocumentCenterListItem[]>([])
const listLoading = ref(false)

const senderOptions = computed(() => {
  const set = new Set<string>()
  for (const d of documentList.value) {
    const v = (d.sender || '').trim()
    if (v) set.add(v)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'))
})

const recipientOptions = computed(() => {
  const set = new Set<string>()
  for (const d of documentList.value) {
    const v = (d.recipient || '').trim()
    if (v) set.add(v)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'))
})

// 自訂下拉選單（發文者 / 受文者）
const senderMenuOpen = ref(false)
const recipientMenuOpen = ref(false)
const senderMenuRef = ref<HTMLElement | null>(null)
const recipientMenuRef = ref<HTMLElement | null>(null)

const filteredSenderOptions = computed(() => {
  const q = filterSender.value.trim().toLowerCase()
  const opts = senderOptions.value
  if (!q) return opts
  return opts.filter((s) => s.toLowerCase().includes(q))
})

const filteredRecipientOptions = computed(() => {
  const q = filterRecipient.value.trim().toLowerCase()
  const opts = recipientOptions.value
  if (!q) return opts
  return opts.filter((r) => r.toLowerCase().includes(q))
})

function openSenderMenu() {
  senderMenuOpen.value = true
}

function openRecipientMenu() {
  recipientMenuOpen.value = true
}

function toggleSenderMenu() {
  senderMenuOpen.value = !senderMenuOpen.value
}

function toggleRecipientMenu() {
  recipientMenuOpen.value = !recipientMenuOpen.value
}

function closeSenderMenu() {
  setTimeout(() => { senderMenuOpen.value = false }, 150)
}

function closeRecipientMenu() {
  setTimeout(() => { recipientMenuOpen.value = false }, 150)
}

function selectSender(opt: string) {
  filterSender.value = opt
  senderMenuOpen.value = false
}

function selectRecipient(opt: string) {
  filterRecipient.value = opt
  recipientMenuOpen.value = false
}

const filteredList = computed(() => {
  const list = documentList.value
  const kw = filterKeyword.value.trim().toLowerCase()
  const sender = filterSender.value.trim().toLowerCase()
  const recipient = filterRecipient.value.trim().toLowerCase()
  const from = filterIssueDateFrom.value.trim()
  const to = filterIssueDateTo.value.trim()
  const category = filterCategory.value.trim()

  return list.filter((d) => {
    const hay = `${d.subject || ''} ${d.sender || ''} ${d.recipient || ''} ${d.fileName || ''}`.toLowerCase()
    if (kw && !hay.includes(kw)) return false
    if (category && (d.documentCategory || '') !== category) return false
    if (sender && !(d.sender || '').toLowerCase().includes(sender)) return false
    if (recipient && !(d.recipient || '').toLowerCase().includes(recipient)) return false
    if (from || to) {
      const normalized = normalizeIssueDate(d.issueDate || '')
      if (from && normalized && normalized < from) return false
      if (to && normalized && normalized > to) return false
    }
    return true
  })
})

function clearFilters() {
  filterKeyword.value = ''
  filterSender.value = ''
  filterRecipient.value = ''
  filterIssueDateFrom.value = ''
  filterIssueDateTo.value = ''
  if (isCategoryLocked.value) {
    const q = route.query.category as string
    if (q && validCategorySet.has(q)) filterCategory.value = q
  } else {
    filterCategory.value = ''
  }
}

async function loadList() {
  const cid = constructionId.value
  if (!cid) return
  listLoading.value = true
  try {
    documentList.value = await getDocumentCenterList(cid)
  } catch {
    documentList.value = []
  } finally {
    listLoading.value = false
  }
}

watch(hasCurrentProject, (ok) => { if (ok) loadList() }, { immediate: true })

// 從網址 query 帶入類別篩選（例：側邊欄 A-8～A-11 點擊進入）
const validCategorySet = new Set<string>(DOCUMENT_CATEGORY_OPTIONS.map(o => o.value))
/** 由 A-8～A-11 進入（網址帶 category）時鎖定類別篩選，不可再改 */
const isCategoryLocked = computed(() => {
  const q = route.query.category as string | undefined
  return !!(q && validCategorySet.has(q))
})
watch(
  () => route.query.category as string | undefined,
  (category) => {
    if (category && validCategorySet.has(category)) {
      filterCategory.value = category
    }
  },
  { immediate: true }
)

// 詳細 Modal（可編輯公文欄位）
const showDetailModal = ref(false)
const detailItem = ref<DocumentCenterListItem | null>(null)
const detailForm = ref<OfficialDocumentExtractDto>({
  sender: '',
  recipient: '',
  subject: '',
  issueDate: '',
  documentNumber: '',
  originalCopy: '',
  carbonCopy: '',
  documentCategory: ''
})
const detailSaving = ref(false)
const detailError = ref('')
const detailPreviewUrl = ref('')
const detailPreviewLoading = ref(false)

// ── 使用位置相關 ──
const usagesPopoverItem = ref<DocumentCenterListItem | null>(null)
const showUsagesModal = ref(false)

function showUsagesPopover(item: DocumentCenterListItem) {
  usagesPopoverItem.value = item
  showUsagesModal.value = true
}

function closeUsagesModal() {
  showUsagesModal.value = false
  usagesPopoverItem.value = null
}

// ── 文件預覽（新分頁；Signed URL 失敗時改 JWT 下載，與 B-2 工程位置圖相同）──
async function openListPreviewInNewTab(item: DocumentCenterListItem) {
  const cid = constructionId.value
  if (!cid) return
  try {
    const url = await openDocumentInNewTab(cid, item)
    if (url && !item.fileUrl && url.startsWith('http')) {
      item.fileUrl = url
    }
  } catch (e: unknown) {
    const err = e as { message?: string }
    alert(err?.message ?? '無法預覽檔案')
  }
}

async function openDetailPreviewInNewTab() {
  const cid = constructionId.value
  const item = detailItem.value
  if (!cid || !item) return
  detailPreviewLoading.value = true
  detailError.value = ''
  try {
    const url = await openDocumentInNewTab(cid, item)
    detailError.value = ''
    if (url?.startsWith('http')) {
      detailPreviewUrl.value = url
      detailItem.value = { ...item, fileUrl: url }
    }
  } catch (e: unknown) {
    const err = e as { message?: string }
    detailError.value = err?.message ?? '無法預覽檔案'
  } finally {
    detailPreviewLoading.value = false
  }
}

async function refreshDetailPreviewUrl(item: DocumentCenterListItem) {
  detailPreviewUrl.value = (item.fileUrl || '').trim()
  const cid = constructionId.value
  if (!cid || !item.id) return
  if (detailPreviewUrl.value) return
  detailPreviewLoading.value = true
  try {
    const url = await getDocumentFileUrl(cid, item.id)
    if (url) {
      detailPreviewUrl.value = url
      if (detailItem.value?.id === item.id) {
        detailItem.value = { ...detailItem.value, fileUrl: url }
      }
    }
  } catch {
    // 無 Signed URL 時仍可按預覽，改走 JWT download
  } finally {
    detailPreviewLoading.value = false
  }
}

function openDetail(item: DocumentCenterListItem) {
  detailItem.value = item
  detailForm.value = {
    sender: item.sender || '',
    recipient: item.recipient || '',
    subject: item.subject || '',
    issueDate: normalizeIssueDate(item.issueDate || ''),
    documentNumber: item.documentNumber || '',
    originalCopy: item.originalCopy || '',
    carbonCopy: item.carbonCopy || '',
    documentCategory: item.documentCategory || ''
  }
  detailError.value = ''
  detailPreviewUrl.value = (item.fileUrl || '').trim()
  showDetailModal.value = true
  void refreshDetailPreviewUrl(item)
}

function closeDetailModal() {
  showDetailModal.value = false
  detailItem.value = null
  detailError.value = ''
  detailPreviewUrl.value = ''
  detailPreviewLoading.value = false
}

async function doUpdateDetail() {
  const cid = constructionId.value
  const item = detailItem.value
  if (!cid || !item) return
  detailError.value = ''
  detailSaving.value = true
  try {
    const result = await updateDocument(cid, item.id, detailForm.value)
    if (result) {
      // 更新 local list item
      Object.assign(item, {
        sender: result.sender,
        recipient: result.recipient,
        subject: result.subject,
        issueDate: result.issueDate,
        documentNumber: result.documentNumber,
        originalCopy: result.originalCopy,
        carbonCopy: result.carbonCopy,
        documentCategory: result.documentCategory
      })
      closeDetailModal()
    } else {
      detailError.value = '更新失敗'
    }
  } catch (e: any) {
    detailError.value = e?.response?.data?.message ?? e?.message ?? '更新失敗'
  } finally {
    detailSaving.value = false
  }
}

const detailDeleting = ref(false)

async function doDeleteDocument() {
  const cid = constructionId.value
  const item = detailItem.value
  if (!cid || !item) return
  if (!confirm(`確定刪除「${item.subject || item.fileName || '此公文'}」？\n（檔案與所有關聯紀錄都會被刪除，此操作無法復原）`)) return
  detailDeleting.value = true
  try {
    const ok = await deleteDocument(cid, item.id)
    if (ok) {
      closeDetailModal()
      await loadList()
    } else {
      detailError.value = '刪除失敗'
    }
  } catch (e: any) {
    detailError.value = e?.response?.data?.message ?? e?.message ?? '刪除失敗'
  } finally {
    detailDeleting.value = false
  }
}

// 匯入 Modal（使用共用 DocumentPicker）
const showImportModal = ref(false)

function displayIssueDateRoc(input: string): string {
  const s = (input || '').trim()
  if (!s) return ''
  if (s.includes('民國')) return s
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return s
  const y = parseInt(m[1], 10)
  const roc = y - 1911
  return `民國${roc}年${m[2]}月${m[3]}日`
}

async function onImportDocumentSaved() {
  showImportModal.value = false
  await loadList()
}

function normalizeIssueDate(input: string): string {
  const s = (input || '').trim()
  if (!s) return ''
  let m = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/)
  if (m) {
    return `${m[1]}-${String(parseInt(m[2], 10)).padStart(2, '0')}-${String(parseInt(m[3], 10)).padStart(2, '0')}`
  }
  m = s.match(/^(?:中華民國)?\s*(?:民國)?\s*(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日$/)
  if (m) {
    const y = String(parseInt(m[1], 10) + 1911)
    return `${y}-${String(parseInt(m[2], 10)).padStart(2, '0')}-${String(parseInt(m[3], 10)).padStart(2, '0')}`
  }
  m = s.match(/^(\d{2,3})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/)
  if (m) {
    const y = String(parseInt(m[1], 10) + 1911)
    return `${y}-${String(parseInt(m[2], 10)).padStart(2, '0')}-${String(parseInt(m[3], 10)).padStart(2, '0')}`
  }
  return s
}

function subjectPreview(input: string, head: number = 22, tail: number = 18): string {
  const s = (input || '').trim()
  if (!s) return ''
  if (s.length <= head + tail + 3) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

function openUpload() {
  if (!hasCurrentProject.value) return
  showImportModal.value = true
}
</script>

<style scoped>
.document-center-list-page {
  padding: 1rem;
}

.doc-center-dark {
  --doc-bg: #1a1d21;
  --doc-card: #25282c;
  --doc-border: #3a3d42;
  --doc-text: #e4e6eb;
  --doc-muted: #b0b3b8;
  --doc-toolbar: #2d3748;
  --doc-input-bg: #2d3139;
  --doc-input-border: #3a3d42;
  --doc-hover: rgba(255, 255, 255, 0.06);
}

/* 篩選列的日期選擇器也要套同色系（VueDatePicker input class 由 RepublicDatePicker 帶入） */
:deep(.doc-center-block-bar .republic-date-picker .dp__main.hide-icon .dp__input),
:deep(.doc-center-block-bar .republic-date-picker .dp__input) {
  /* vue-datepicker 會帶自己的主題色，這裡用 !important 保證一致 */
  background: var(--doc-input-bg) !important;
  border: 1px solid var(--doc-input-border) !important;
  color: rgba(228, 230, 235, 0.95) !important;
  /* 與其它篩選欄位（.doc-center-input）相同盒模型，由 padding 撐高，避免可視框被壓扁 */
  padding: 0.35rem 0.5rem !important;
  font-size: 0.875rem !important;
  line-height: 1.25 !important;
  border-radius: 4px;
  width: 100%;
  height: auto !important;
  text-align: left !important;
}

/* 元件預設把 .dp__main 鎖在 35px，且 hide-icon 再加上下內距，會讓可視輸入框比
   關鍵字／下拉等欄位扁。篩選列改由 .dp__input 自身 padding 撐高，使各欄位等高。 */
:deep(.doc-center-block-bar .republic-date-picker .dp__main),
:deep(.doc-center-block-bar .republic-date-picker .dp__main.hide-icon) {
  height: auto !important;
  min-height: 0 !important;
  padding: 0 !important;
  display: block !important;
}

:deep(.doc-center-block-bar .republic-date-picker .dp__input_wrap) {
  height: auto !important;
  display: block !important;
}

:deep(.doc-center-block-bar .republic-date-picker .dp__input_wrap),
:deep(.doc-center-block-bar .republic-date-picker .dp__main) {
  background: transparent;
}

:deep(.doc-center-block-bar .republic-date-picker .dp__input_wrap) {
  border-radius: 4px;
}

:deep(.doc-center-block-bar .republic-date-picker .dp__input::placeholder) {
  color: rgba(176, 179, 184, 0.75) !important;
}

:deep(.doc-center-block-bar .republic-date-picker .dp__input:focus) {
  border-color: rgba(59, 130, 246, 0.75) !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
}

.doc-center-block {
  background: var(--doc-card);
  border-radius: 8px;
  overflow: hidden;
}

/* 篩選列不裁切下拉選單 */
.doc-center-block-bar.doc-center-block {
  overflow: visible;
}

.doc-center-block-body {
  color: var(--doc-text);
}

.doc-center-block-bar .doc-center-bar-inner {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  overflow: visible;
}

.doc-center-bar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
}

.doc-center-filters {
  display: grid;
  /* 關鍵字吃滿剩餘空間，其餘欄位固定寬度 */
  grid-template-columns: minmax(240px, 1fr) 200px 200px 140px minmax(420px, 1.15fr);
  gap: 0.6rem 0.75rem;
  align-items: end;
  width: 100%;
}

.doc-center-filters .doc-center-input {
  width: 100%;
}

@media (max-width: 1100px) {
  .doc-center-block-bar .doc-center-bar-inner {
    grid-template-columns: 1fr;
    align-items: start;
  }
  .doc-center-filters {
    grid-template-columns: 1fr 1fr;
  }
  .doc-center-filter-item-date {
    grid-column: 1 / -1;
    min-width: 0;
  }
}

.doc-center-filter-item {
  min-width: 0;
}

.doc-center-filter-item-wide {
  grid-column: span 1;
}

.doc-center-filter-label {
  font-size: 12px;
  color: rgba(228, 230, 235, 0.92);
  font-weight: 600;
  margin-bottom: 6px;
}

/* 自訂下拉選單（發文者 / 受文者）— 選單樣式 */
.doc-center-combo-wrap {
  position: relative;
  overflow: visible;
}

.doc-center-combo {
  position: relative;
  display: flex;
  align-items: center;
}

.doc-center-combo-input {
  flex: 1;
  min-width: 0;
  padding-right: 2rem;
}

.doc-center-combo-arrow {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--doc-muted);
  pointer-events: auto;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.doc-center-combo-arrow:hover {
  color: var(--doc-text);
  background: var(--doc-hover);
}

.doc-center-combo-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 4px;
  max-height: 220px;
  overflow-y: auto;
  background: var(--doc-card);
  border: 1px solid var(--doc-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  z-index: 100;
  padding: 4px 0;
}

.doc-center-combo-item {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--doc-text);
  cursor: pointer;
  transition: background 0.1s;
}

.doc-center-combo-item:hover {
  background: var(--doc-hover);
}

.doc-center-combo-item.doc-center-combo-empty {
  color: var(--doc-muted);
  cursor: default;
  font-size: 0.8rem;
}

.doc-center-combo-item.doc-center-combo-empty:hover {
  background: transparent;
}

.doc-center-filter-item-date {
  min-width: 420px;
}

.doc-center-date-range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  width: 100%;
}

/* 篩選列內讓日期選擇器撐滿欄位（元件預設 max-width: 240px 會導致過窄） */
.doc-center-date-range :deep(.republic-date-picker) {
  width: 100%;
  max-width: none;
}

.doc-center-date-range :deep(.dp__main) {
  width: 100%;
}

.doc-center-date-sep {
  color: rgba(228, 230, 235, 0.65);
  font-size: 12px;
  line-height: 1;
  padding: 0 2px;
}

/* 讓篩選列整體更清楚（字更白、placeholder 更淡） */
.doc-center-block-bar .doc-center-input {
  color: rgba(228, 230, 235, 0.95);
}

.doc-center-block-bar .doc-center-input::placeholder {
  color: rgba(176, 179, 184, 0.75);
}

.doc-center-block-bar .doc-center-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.75);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.doc-center-list-inner {
  padding: 0;
}

.doc-center-empty {
  text-align: center;
  color: var(--doc-muted);
  padding: 2.5rem 1rem;
}

.doc-center-table-wrap {
  overflow-x: auto;
}

.doc-center-alert {
  background: rgba(255, 193, 7, 0.12);
  border: 1px solid rgba(255, 193, 7, 0.35);
  color: #1a1d21;
}

.doc-center-muted { color: var(--doc-muted); }
.doc-center-text { color: var(--doc-text); }
.doc-center-fw { font-weight: 600; }

.doc-center-select,
.doc-center-input {
  background: var(--doc-input-bg);
  border: 1px solid var(--doc-input-border);
  color: var(--doc-text);
  padding: 0.35rem 0.5rem;
  font-size: 0.875rem;
  border-radius: 4px;
}

.doc-center-category-display {
  display: inline-block;
  padding: 0.35rem 0.5rem;
  font-size: 0.875rem;
  color: var(--doc-text);
  min-height: 1.5rem;
  line-height: 1.25;
}

.doc-center-btn {
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
}

.doc-center-btn-secondary {
  background: var(--doc-input-bg);
  border-color: var(--doc-input-border);
  color: var(--doc-muted);
}

.doc-center-btn-secondary:hover {
  background: var(--doc-hover);
  border-color: var(--doc-border);
  color: var(--doc-text);
}

.doc-center-btn-primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.doc-center-btn-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.doc-center-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.doc-center-btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.doc-center-table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}

.doc-center-table thead tr {
  background: var(--doc-toolbar);
  color: var(--doc-muted);
  font-size: 0.85rem;
}

.doc-center-table thead th {
  border: none;
  border-bottom: 2px solid var(--doc-border);
  font-weight: 500;
  padding: 0.6rem 0.75rem;
  text-align: left;
  vertical-align: middle;
}

.doc-center-table tbody td {
  border: none;
  border-bottom: 1px solid var(--doc-border);
  color: var(--doc-text);
  padding: 0.75rem 0.75rem;
  vertical-align: middle;
}

.doc-center-table tbody tr:last-child td {
  border-bottom: none;
}

.doc-center-row:hover {
  background: var(--doc-hover);
}

.doc-center-row-clickable {
  cursor: pointer;
  transition: background 0.15s;
}


.doc-center-subject {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-center-detail-section {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--doc-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.doc-center-detail-caption {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--doc-muted);
  margin-bottom: 0.6rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--doc-border);
}

.doc-center-detail-grid {
  border: 1px solid var(--doc-border);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.12);
}

.doc-center-detail-row {
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: 0.75rem;
  padding: 0.55rem 0.75rem;
  align-items: start;
}

.doc-center-detail-row + .doc-center-detail-row {
  border-top: 1px solid var(--doc-border);
}

.doc-center-detail-label {
  color: var(--doc-muted);
  font-weight: 600;
  font-size: 0.85rem;
  line-height: 1.35;
}

.doc-center-detail-value {
  color: var(--doc-text);
  font-size: 0.9rem;
  line-height: 1.5;
  word-break: break-word;
}

.doc-center-file-link {
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  color: var(--doc-accent, #60a5fa);
  text-decoration: none;
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--doc-accent, #60a5fa);
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
  vertical-align: middle;
}

.doc-center-file-link:hover {
  background: rgba(96, 165, 250, 0.12);
  color: #93c5fd;
}

/* 使用位置（顯示在主旨下方） */
.doc-center-usage-inline {
  display: flex;
  align-items: center;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  margin-top: 0.3rem;
  text-overflow: ellipsis;
  margin-top: 0.25rem;
  color: #93c5fd;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  transition: background 0.15s;
}
.doc-center-usage-inline:hover {
  background: rgba(96, 165, 250, 0.12);
}
.doc-center-usage-more {
  display: inline-block;
  margin-left: 0.3rem;
  padding: 0 0.35rem;
  font-size: 0.7rem;
  line-height: 1.5;
  background: rgba(96, 165, 250, 0.18);
  color: #93c5fd;
  border-radius: 0.75rem;
  flex-shrink: 0;
}
.doc-center-usage-modal-item {
  background: var(--psr-card, #1e293b) !important;
  color: var(--psr-text, #e2e8f0) !important;
  border-color: var(--psr-border, #334155) !important;
  font-size: 0.9rem;
}

/* 操作欄 */
.doc-center-td-actions {
  padding: 0 !important;
}
.doc-center-actions-row {
  display: flex;
  align-items: stretch;
  height: 100%;
  min-height: 2.4rem;
}
.doc-center-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1 1 0;
  min-width: 0;
  padding: 0 0.5rem;
  font-size: 0.78rem;
  color: #93c5fd;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  border-right: 1px solid var(--doc-border, #333);
}
.doc-center-action-btn:last-child {
  border-right: none;
}
.doc-center-action-btn:hover {
  background: rgba(96, 165, 250, 0.2);
  color: #bfdbfe;
}
.doc-center-action-btn i {
  font-size: 0.85rem;
}

.doc-center-detail-multiline {
  white-space: pre-wrap;
}

/* 公文欄位編輯表單 */
.doc-center-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.doc-center-form-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.doc-center-form-row-full {
  grid-column: 1 / -1;
}

.doc-center-form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--doc-muted);
}

.doc-center-form-grid .doc-center-input {
  width: 100%;
}

.doc-center-form-grid textarea.doc-center-input {
  resize: vertical;
  min-height: 2.5rem;
}

.doc-center-error {
  color: #f87171;
  font-size: 0.85rem;
  padding: 0.5rem;
  background: rgba(248, 113, 113, 0.1);
  border-radius: 4px;
}

.doc-center-modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.doc-center-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--doc-border);
}

.doc-center-modal-title {
  font-weight: 600;
  color: var(--doc-text);
}

.doc-center-modal-close {
  background: none;
  border: none;
  color: var(--doc-muted);
  cursor: pointer;
  padding: 0.25rem;
}

.doc-center-modal-close:hover {
  color: var(--doc-text);
}

.doc-center-modal-body {
  padding: 1rem;
}

.doc-center-modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.doc-center-label {
  display: block;
  font-size: 0.8rem;
  color: var(--doc-muted);
  margin-bottom: 0.25rem;
}

.doc-center-form-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  align-items: start;
}

.doc-center-form-grid .doc-center-label {
  grid-column: 1;
}

.doc-center-form-grid .doc-center-input {
  grid-column: 2;
}

.doc-center-textarea {
  min-height: 60px;
  resize: vertical;
}

.doc-center-details {
  border: 1px solid var(--doc-border);
  border-radius: 6px;
  padding: 0.5rem;
}

.doc-center-details summary {
  cursor: pointer;
}

.doc-center-pre {
  margin: 0.5rem 0 0;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 180px;
  overflow: auto;
  color: var(--doc-text);
}

.doc-center-err {
  color: #f87171;
  font-size: 0.875rem;
}
</style>

<!-- Modal 會 Teleport 到 body，需用非 scoped 才能套用 -->
<style>
.doc-center-modal-skin .modal-content {
  background: #25282c;
  border: 1px solid #3a3d42;
  color: #e4e6eb;
}

.doc-center-modal-skin .modal-header,
.doc-center-modal-skin .modal-footer {
  border-color: #3a3d42;
}

.doc-center-modal-skin .btn-close {
  filter: invert(1) grayscale(1);
  opacity: 0.7;
}

.doc-center-modal-skin .btn-close:hover {
  opacity: 0.95;
}

/* 讓輸入框/textarea 的邊框樣式在 Modal 內也一致 */
.doc-center-modal-skin .doc-center-input {
  background: #2d3139;
  border: 1px solid #3a3d42;
  color: #e4e6eb;
}

.doc-center-modal-skin .doc-center-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.doc-center-modal-skin .republic-date-picker .dp__input {
  background: #2d3139;
  border: 1px solid #3a3d42;
  color: rgba(228, 230, 235, 0.95);
}

.doc-center-modal-skin .republic-date-picker .dp__input_wrap,
.doc-center-modal-skin .republic-date-picker .dp__main {
  background: transparent;
}

.doc-center-modal-skin .republic-date-picker .dp__input_wrap {
  border-radius: 4px;
}

.doc-center-modal-skin .republic-date-picker .dp__input:focus {
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.doc-center-modal-skin .doc-center-pre {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid #3a3d42;
}

.doc-center-modal-skin .btn-outline-danger {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}

.doc-center-modal-skin .btn-outline-danger:hover {
  background: rgba(248, 113, 113, 0.1);
  border-color: #f87171;
  color: #fca5a5;
}

.doc-center-modal-skin .btn-outline-danger:disabled {
  opacity: 0.4;
}
</style>
