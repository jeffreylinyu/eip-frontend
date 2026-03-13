<template>
  <div class="document-center-detail-page doc-center-dark">
    <!-- 頂部工具列 -->
    <div class="doc-toolbar">
      <div class="doc-toolbar-inner">
        <button type="button" class="doc-toolbar-btn doc-toolbar-btn-back" @click="goList">
          <i class="fa fa-arrow-left me-1"></i>返回列表
        </button>
        <span class="doc-toolbar-divider"></span>
        <button type="button" class="doc-toolbar-btn">
          <i class="fa fa-file me-1"></i>開啓新檔 <i class="fa fa-chevron-down ms-1 small"></i>
        </button>
        <button type="button" class="doc-toolbar-btn">開啟舊檔</button>
        <button type="button" class="doc-toolbar-btn">另存</button>
        <button type="button" class="doc-toolbar-btn">預視</button>
        <button type="button" class="doc-toolbar-btn">列印</button>
        <button type="button" class="doc-toolbar-btn">
          匯出入 <i class="fa fa-chevron-down ms-1 small"></i>
        </button>
        <span class="doc-toolbar-divider"></span>
        <button type="button" class="doc-toolbar-btn">受文清單</button>
        <button type="button" class="doc-toolbar-btn">發文清單</button>
        <span class="doc-toolbar-divider"></span>
        <button type="button" class="doc-toolbar-btn" @click="goList">關檔</button>
      </div>
    </div>

    <div v-if="!hasCurrentProject" class="alert alert-warning doc-center-alert mb-2">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案。
    </div>

    <div class="doc-layout">
      <div class="doc-main">
        <!-- 擬辦內容 -->
        <div class="doc-section doc-section-compact">
          <div class="doc-section-title">擬辦內容</div>
          <div class="doc-form-grid doc-form-grid-compact">
            <div class="doc-form-row">
              <label>發文機關</label>
              <div
                class="doc-input doc-input-readonly"
                role="button"
                tabindex="0"
                @click="openIssuingModal"
                @keydown.enter.prevent="openIssuingModal"
              >
                {{ form.issuingOrg || '請點擊選擇' }}
              </div>
            </div>
            <div class="doc-form-row">
              <label>聯絡方式</label>
              <input v-model="form.contact" type="text" class="doc-input" placeholder="承辦人一般民眾" />
            </div>
            <div class="doc-form-row">
              <label>地址</label>
              <input v-model="form.address" type="text" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>速別</label>
              <select v-model="form.urgency" class="doc-input doc-select">
                <option value="NORMAL">普通件</option>
                <option value="URGENT">速件</option>
                <option value="MOST_URGENT">最速件</option>
              </select>
            </div>
            <div class="doc-form-row">
              <label>密等及解密條件或保密期限</label>
              <div
                class="doc-input doc-input-readonly"
                role="button"
                tabindex="0"
                @click="openSecurityModal"
                @keydown.enter.prevent="openSecurityModal"
              >
                {{ securityLevelDisplay || '請點擊選擇' }}
              </div>
            </div>
            <div class="doc-form-row">
              <label>發文日期</label>
              <input v-model="form.issueDate" type="date" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>發文字號</label>
              <div
                class="doc-input doc-input-readonly"
                role="button"
                tabindex="0"
                @click="openIssuingModal"
                @keydown.enter.prevent="openIssuingModal"
              >
                {{ form.docNumber || '請點擊選擇' }}
              </div>
            </div>
            <div class="doc-form-row">
              <label>附件檔名</label>
              <input v-model="form.attachmentNames" type="text" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>附件</label>
              <input v-model="form.attachments" type="text" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>管理整合資訊</label>
              <input v-model="form.managementInfo" type="text" class="doc-input" placeholder="一般民眾" />
            </div>
            <div class="doc-form-row">
              <label>檔號及保存年限</label>
              <input v-model="form.fileNumber" type="text" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>擬辦方式</label>
              <input v-model="form.draftMethod" type="text" class="doc-input" />
            </div>
          </div>
        </div>

        <!-- 內頁編輯：先隱藏，改為僅上傳；程式碼保留供日後啟用 -->
        <template v-if="showInlineEditor">
          <div class="doc-editor-toolbar">
            <button type="button" class="doc-editor-btn" title="剪下"><i class="fa fa-cut"></i></button>
            <button type="button" class="doc-editor-btn" title="複製"><i class="fa fa-copy"></i></button>
            <button type="button" class="doc-editor-btn" title="貼上"><i class="fa fa-paste"></i></button>
            <span class="doc-editor-divider"></span>
            <button type="button" class="doc-editor-btn" title="復原"><i class="fa fa-undo"></i></button>
            <button type="button" class="doc-editor-btn" title="重做"><i class="fa fa-redo"></i></button>
            <span class="doc-editor-divider"></span>
            <button type="button" class="doc-editor-btn" title="靠左"><i class="fa fa-align-left"></i></button>
            <button type="button" class="doc-editor-btn" title="置中"><i class="fa fa-align-center"></i></button>
            <button type="button" class="doc-editor-btn" title="靠右"><i class="fa fa-align-right"></i></button>
            <button type="button" class="doc-editor-btn" title="分散對齊"><i class="fa fa-align-justify"></i></button>
            <span class="doc-editor-divider"></span>
            <button type="button" class="doc-editor-btn" title="字型大小"><i class="fa fa-text-height"></i></button>
            <button type="button" class="doc-editor-btn" title="縮放"><i class="fa fa-search-plus"></i></button>
            <button type="button" class="doc-editor-btn" title="全螢幕"><i class="fa fa-expand"></i></button>
          </div>
          <div class="doc-editor-area">
            <div class="doc-editor-content">
              <p class="doc-field-label">主旨：</p>
              <input v-model="form.subject" type="text" class="doc-input doc-input-block mb-2" placeholder="請輸入主旨" />
              <p class="doc-field-label mt-3">說明：</p>
              <div class="doc-editor-body">
                <p class="mb-1">一、</p>
                <p class="mb-1">二、</p>
                <p class="mb-1">三、</p>
                <p class="doc-editor-placeholder small">（編輯功能將於下一階段提供，此區塊為公文內文編輯區）</p>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="doc-editor-area doc-upload-placeholder">
          <div class="doc-editor-content">
            <p class="doc-upload-hint mb-0">
              <i class="fa fa-upload me-2"></i>公文改由使用者上傳，請使用上方工具列或附件欄位上傳檔案。
            </p>
          </div>
        </div>

        <!-- 底部欄位 -->
        <div class="doc-section doc-section-footer">
          <div class="doc-footer-grid">
            <div class="doc-form-row">
              <label>正本</label>
              <input v-model="form.originalCopy" type="text" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>副本</label>
              <input v-model="form.duplicateCopy" type="text" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>抄本</label>
              <input v-model="form.copy" type="text" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>署名</label>
              <input v-model="form.signature" type="text" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>會辦單位</label>
              <input v-model="form.consultingUnits" type="text" class="doc-input" />
            </div>
            <div class="doc-form-row">
              <label>決行層級</label>
              <input v-model="form.decisionLevel" type="text" class="doc-input" />
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：公文資訊視窗 -->
      <aside class="doc-sidebar">
        <div class="doc-sidebar-header">
          <span>【公文資訊視窗】</span>
          <button type="button" class="doc-sidebar-toggle" title="展開/收合"><i class="fa fa-chevron-right"></i></button>
        </div>
        <div class="doc-sidebar-body">
          <div class="doc-sidebar-tree">
            <div class="doc-tree-item doc-tree-folder">
              <i class="fa fa-folder-open me-2"></i>文件引導
            </div>
            <div class="doc-tree-children">
              <div class="doc-tree-item doc-tree-node">
                <i class="fa fa-file-lines me-2"></i>公文資料（可點選新增）
              </div>
              <div class="doc-tree-item doc-tree-folder">
                <i class="fa fa-folder me-2"></i>參考資料
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- 密等及解密條件或保密期限 選擇視窗 -->
    <Modal
      v-model:show="showSecurityModal"
      title="密等及解密條件或保密期限"
      size="lg"
      modal-id="doc-security-modal"
      cancel-text="取消"
      confirm-text="確定"
      confirm-icon="fa fa-check"
      :hide-confirm-button="false"
      :hide-cancel-button="false"
      modal-class="doc-security-modal"
      @confirm="confirmSecurityModal"
    >
      <template #header>
        <span>密等及解密條件或保密期限</span>
      </template>
      <template #body>
        <div class="doc-security-modal-body">
          <div class="doc-security-row">
            <label>密等</label>
            <select v-model="modalSecurityLevel" class="doc-security-select">
              <option value="">請選擇</option>
              <option v-for="opt in securityLevelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="doc-security-row">
            <label>解密條件或保密期限</label>
            <select v-model="modalDeclassification" class="doc-security-select">
              <option value="">請選擇</option>
              <option v-for="opt in declassificationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div v-if="modalDeclassification === '本件至某年某月某日解密'" class="doc-security-row">
            <label>解密日期</label>
            <div class="doc-security-date-wrap">
              <RepublicDatePicker
                v-model="modalDeclassificationDate"
                input-class="doc-security-date-input"
                :use-republic-year="true"
                :disable-holidays="false"
              />
            </div>
          </div>
          <p class="doc-security-warning">
            公文密等為密以上,不可進行電子交換。
          </p>
          <p v-if="modalSecurityError" class="doc-security-error">
            <i class="fa fa-exclamation-circle me-1"></i>{{ modalSecurityError }}
          </p>
        </div>
      </template>
    </Modal>

    <!-- 發文機關資訊 視窗 -->
    <Modal
      v-model:show="showIssuingModal"
      title="發文機關資訊"
      size="xl"
      modal-id="doc-issuing-modal"
      cancel-text="取消"
      confirm-text="確定"
      confirm-icon="fa fa-check"
      :hide-confirm-button="false"
      :hide-cancel-button="false"
      modal-class="doc-issuing-modal"
      @confirm="confirmIssuingModal"
    >
      <template #header>
        <span>發文機關資訊</span>
      </template>
      <template #body>
        <div class="doc-issuing-modal-body">
          <div class="doc-issuing-table-wrap">
            <table class="doc-issuing-table">
              <thead>
                <tr>
                  <th>全銜</th>
                  <th>字</th>
                  <th>年度</th>
                  <th>文號</th>
                  <th>支號</th>
                  <th>署名</th>
                  <th>位移</th>
                  <th>刪除</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, idx) in issuingList"
                  :key="item.id"
                  :class="{ 'doc-issuing-row-selected': selectedIssuingIndex === idx }"
                  @click="selectedIssuingIndex = idx"
                >
                  <td>{{ item.fullTitle }}</td>
                  <td>{{ item.char }}</td>
                  <td>{{ item.year }}</td>
                  <td>{{ item.docNum }}</td>
                  <td>{{ item.branchNum }}</td>
                  <td>{{ item.signatory }}</td>
                  <td>
                    <button type="button" class="doc-issuing-btn" title="上移" @click.stop="moveIssuing(idx, -1)">
                      <i class="fa fa-chevron-up"></i>
                    </button>
                    <button type="button" class="doc-issuing-btn" title="下移" @click.stop="moveIssuing(idx, 1)">
                      <i class="fa fa-chevron-down"></i>
                    </button>
                  </td>
                  <td>
                    <button type="button" class="doc-issuing-btn doc-issuing-btn-del" @click.stop="deleteIssuing(idx)">刪除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="doc-issuing-form">
            <div class="doc-security-row">
              <label>發文機關</label>
              <input v-model="editingIssuing.fullTitle" type="text" class="doc-security-select doc-issuing-input" />
            </div>
            <div class="doc-security-row">
              <label>字</label>
              <input v-model="editingIssuing.char" type="text" class="doc-security-select doc-issuing-input" />
            </div>
            <div class="doc-security-row">
              <label>年度</label>
              <input v-model="editingIssuing.year" type="text" class="doc-security-select doc-issuing-input" />
            </div>
            <div class="doc-security-row">
              <label>文號</label>
              <input v-model="editingIssuing.docNum" type="text" class="doc-security-select doc-issuing-input" />
            </div>
            <div class="doc-security-row">
              <label>支號</label>
              <input v-model="editingIssuing.branchNum" type="text" class="doc-security-select doc-issuing-input" />
            </div>
            <div class="doc-security-row">
              <label>稿署名</label>
              <div class="doc-issuing-input-with-btn">
                <input v-model="editingIssuing.draftSignatory" type="text" class="doc-security-select doc-issuing-input" />
                <button type="button" class="doc-issuing-btn doc-issuing-btn-adv">進階</button>
              </div>
            </div>
            <div class="doc-security-row">
              <label>署名</label>
              <div class="doc-issuing-input-with-btn">
                <input v-model="editingIssuing.signatory" type="text" class="doc-security-select doc-issuing-input" />
                <button type="button" class="doc-issuing-btn doc-issuing-btn-adv">進階</button>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <button type="button" class="btn btn-theme me-2" @click="confirmIssuingModal">
          <i class="fa fa-check me-1"></i>確定
        </button>
        <button type="button" class="btn btn-outline-secondary me-2" @click="showIssuingModal = false">
          <i class="fa fa-times me-1"></i>取消
        </button>
        <button type="button" class="btn btn-outline-secondary" @click="addNewIssuing">
          <i class="fa fa-plus me-1"></i>新增一筆
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()

const docId = computed(() => route.params.id as string)
const isNew = computed(() => docId.value === 'new' || !docId.value)
const hasCurrentProject = computed(() => !!workspaceStore.currentProject)

/** 是否顯示內頁編輯區（false = 改為僅上傳，程式碼保留） */
const showInlineEditor = false

const form = ref({
  issuingOrg: '一般民眾',
  contact: '承辦人一般民眾',
  address: '',
  urgency: 'NORMAL',
  securityLevel: '',
  declassificationCondition: '',
  declassificationDate: '',
  issueDate: '',
  docNumber: '',
  attachmentNames: '',
  attachments: '',
  managementInfo: '一般民眾',
  fileNumber: '',
  draftMethod: '',
  subject: '',
  originalCopy: '',
  duplicateCopy: '',
  copy: '',
  signature: '',
  consultingUnits: '',
  decisionLevel: ''
})

const securityLevelOptions = [
  { value: '密', label: '密' },
  { value: '機密', label: '機密' },
  { value: '極機密', label: '極機密' },
  { value: '絕對機密', label: '絕對機密' }
]

const declassificationOptions = [
  { value: '本件至某年某月某日解密', label: '本件至某年某月某日解密' },
  { value: '本件於公布時解密', label: '本件於公布時解密' },
  { value: '其他', label: '其他' }
]

const showSecurityModal = ref(false)
const modalSecurityLevel = ref('')
const modalDeclassification = ref('')
const modalDeclassificationDate = ref('')
const modalSecurityError = ref('')

/** 發文機關資訊一筆 */
interface IssuingEntry {
  id: number
  fullTitle: string
  char: string
  year: string
  docNum: string
  branchNum: string
  draftSignatory: string
  signatory: string
}

function createEmptyIssuingEntry(): IssuingEntry {
  return {
    id: Date.now(),
    fullTitle: '',
    char: '',
    year: '',
    docNum: '',
    branchNum: '',
    draftSignatory: '',
    signatory: ''
  }
}

const showIssuingModal = ref(false)
const issuingList = ref<IssuingEntry[]>([
  { id: 1, fullTitle: '一般民眾3', char: '偉域', year: '115', docNum: '0203001', branchNum: '1', draftSignatory: 'AAAAAA', signatory: 'AaA' },
  { id: 2, fullTitle: '一般民眾2', char: '工開', year: '113', docNum: '001', branchNum: '1', draftSignatory: '', signatory: '' },
  { id: 3, fullTitle: '一般民眾1', char: '工開', year: '113', docNum: '002', branchNum: '1', draftSignatory: '', signatory: '' }
])
const selectedIssuingIndex = ref(0)
const editingIssuing = computed(() => issuingList.value[selectedIssuingIndex.value] ?? createEmptyIssuingEntry())

/** 將 YYYY-MM-DD 轉成「民國Y年M月D日」 */
function formatDeclassificationDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return dateStr
  const republicYear = y - 1911
  return `${republicYear}年${m}月${d}日`
}

const securityLevelDisplay = computed(() => {
  const level = form.value.securityLevel
  const cond = form.value.declassificationCondition
  const date = form.value.declassificationDate
  if (!level && !cond) return ''
  let condText = cond
  if (cond === '本件至某年某月某日解密' && date) {
    const dateFormatted = formatDeclassificationDate(date)
    condText = dateFormatted ? `本件至${dateFormatted}解密` : cond
  }
  if (!level) return condText ? `(${condText})` : ''
  if (!condText) return level
  return `${level}(${condText})`
})

function openSecurityModal() {
  modalSecurityLevel.value = form.value.securityLevel
  modalDeclassification.value = form.value.declassificationCondition
  modalDeclassificationDate.value = form.value.declassificationDate || ''
  modalSecurityError.value = ''
  showSecurityModal.value = true
}

function confirmSecurityModal() {
  modalSecurityError.value = ''
  const level = modalSecurityLevel.value
  const cond = modalDeclassification.value
  const date = modalDeclassificationDate.value
  if (level && !cond) {
    modalSecurityError.value = '已選擇密等時，解密條件或保密期限必須輸入。'
    return
  }
  if (cond === '本件至某年某月某日解密' && !date) {
    modalSecurityError.value = '選擇「本件至某年某月某日解密」時，請選擇解密日期。'
    return
  }
  form.value.securityLevel = level
  form.value.declassificationCondition = cond
  form.value.declassificationDate = cond === '本件至某年某月某日解密' ? date : ''
  showSecurityModal.value = false
}

/** 單筆發文字號格式：偉域字第11502030011號 */
function buildDocNumber(entry: IssuingEntry): string {
  if (!entry.char && !entry.year && !entry.docNum) return ''
  const numPart = [entry.year, entry.docNum, entry.branchNum].filter(Boolean).join('')
  return entry.char ? `${entry.char}字第${numPart}號` : `字第${numPart}號`
}

function openIssuingModal() {
  if (issuingList.value.length === 0) addNewIssuing()
  showIssuingModal.value = true
}

function confirmIssuingModal() {
  const list = issuingList.value.filter(e => e.fullTitle || e.char || e.year || e.docNum)
  if (list.length > 0) {
    form.value.issuingOrg = list.map(e => e.fullTitle).filter(Boolean).join('、')
    form.value.docNumber = list.map(e => buildDocNumber(e)).filter(Boolean).join('、')
    form.value.signature = list.map(e => e.signatory).filter(Boolean).join('、')
  }
  showIssuingModal.value = false
}

function addNewIssuing() {
  const newEntry = createEmptyIssuingEntry()
  issuingList.value.push(newEntry)
  selectedIssuingIndex.value = issuingList.value.length - 1
}

function moveIssuing(idx: number, delta: number) {
  const newIdx = idx + delta
  if (newIdx < 0 || newIdx >= issuingList.value.length) return
  const list = issuingList.value
  ;[list[idx], list[newIdx]] = [list[newIdx], list[idx]]
  selectedIssuingIndex.value = newIdx
}

function deleteIssuing(idx: number) {
  issuingList.value.splice(idx, 1)
  if (selectedIssuingIndex.value >= issuingList.value.length) selectedIssuingIndex.value = Math.max(0, issuingList.value.length - 1)
  else if (selectedIssuingIndex.value > idx) selectedIssuingIndex.value--
}

function goList() {
  router.push('/document-center')
}

onMounted(() => {
  if (!isNew.value && docId.value) {
    form.value.subject = '工程開工通知'
    form.value.docNumber = '工開-113-001'
    form.value.issueDate = '2024-01-15'
  }
})
</script>

<style scoped>
.doc-center-dark {
  --doc-bg: #1a1d21;
  --doc-card: #25282c;
  --doc-border: #3a3d42;
  --doc-text: #e4e6eb;
  --doc-toolbar-bg: #2d3748;
  --doc-toolbar-border: #3a3d42;
  --doc-input-bg: #2d3139;
  --doc-input-border: #3a3d42;
  --doc-hover: rgba(255, 255, 255, 0.06);
}

.document-center-detail-page {
  padding-bottom: 1rem;
}

.doc-toolbar-btn-back {
  font-weight: 500;
  color: #93c5fd;
}

.doc-toolbar-btn-back:hover {
  color: #bfdbfe;
}

.doc-toolbar {
  background: var(--doc-toolbar-bg);
  border-bottom: 1px solid var(--doc-toolbar-border);
  padding: 0.35rem 0.5rem;
  margin: 0 -1rem 0 -1rem;
  padding-left: calc(1rem + 0.5rem);
  padding-right: calc(1rem + 0.5rem);
}

.doc-toolbar-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}

.doc-toolbar-btn {
  background: transparent;
  border: none;
  color: var(--doc-text);
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  border-radius: 4px;
  cursor: pointer;
}

.doc-toolbar-btn:hover {
  background: var(--doc-hover);
}

.doc-toolbar-divider {
  width: 1px;
  height: 1.2rem;
  background: var(--doc-border);
  margin: 0 0.25rem;
}

.doc-layout {
  display: flex;
  gap: 0;
  margin-top: 0.75rem;
}

.doc-main {
  flex: 1;
  min-width: 0;
}

.doc-section {
  background: var(--doc-card);
  border: 1px solid var(--doc-border);
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.doc-section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--doc-text);
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid var(--doc-border);
}

.doc-section-compact .doc-form-grid-compact {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.35rem 1rem;
  padding: 0.5rem 0.75rem;
}

.doc-form-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.doc-form-row label {
  flex: 0 0 auto;
  min-width: 11rem;
  color: var(--doc-text);
  margin: 0;
}

.doc-input {
  flex: 1;
  min-width: 0;
  background: var(--doc-input-bg);
  border: 1px solid var(--doc-input-border);
  color: var(--doc-text);
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  border-radius: 4px;
}

.doc-select {
  cursor: pointer;
}

.doc-input-readonly {
  cursor: pointer;
}

.doc-input-block {
  width: 100%;
}

.doc-editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem;
  padding: 0.35rem 0.5rem;
  background: var(--doc-card);
  border: 1px solid var(--doc-border);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.doc-editor-btn {
  background: transparent;
  border: none;
  color: var(--doc-text);
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.doc-editor-btn:hover {
  background: var(--doc-hover);
  color: var(--doc-text);
}

.doc-editor-divider {
  width: 1px;
  height: 1rem;
  background: var(--doc-border);
  margin: 0 0.15rem;
}

.doc-editor-area {
  background: var(--doc-card);
  border: 1px solid var(--doc-border);
  border-radius: 6px;
  margin-bottom: 0.75rem;
  min-height: 220px;
}

.doc-editor-content {
  padding: 0.75rem 1rem;
}

.doc-field-label {
  font-size: 0.9rem;
  color: var(--doc-text);
  margin-bottom: 0.25rem;
}

.doc-editor-body {
  min-height: 120px;
  padding: 0.5rem 0;
  color: var(--doc-text);
}

.doc-editor-placeholder {
  margin-top: 0.5rem;
  color: var(--doc-text);
}

.doc-upload-placeholder .doc-upload-hint {
  color: var(--doc-text);
  font-size: 0.9rem;
}

.doc-section-footer .doc-footer-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.35rem 1rem;
  padding: 0.5rem 0.75rem;
}

.doc-sidebar {
  flex: 0 0 220px;
  background: var(--doc-card);
  border: 1px solid var(--doc-border);
  border-radius: 6px;
  margin-left: 0.75rem;
  overflow: hidden;
}

.doc-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  color: var(--doc-text);
  border-bottom: 1px solid var(--doc-border);
}

.doc-sidebar-toggle {
  background: none;
  border: none;
  color: var(--doc-text);
  cursor: pointer;
  padding: 0.2rem;
}

.doc-sidebar-body {
  padding: 0.5rem;
}

.doc-sidebar-tree {
  font-size: 0.85rem;
}

.doc-tree-item {
  padding: 0.3rem 0.5rem;
  color: var(--doc-text);
  cursor: pointer;
  border-radius: 4px;
}

.doc-tree-item:hover {
  background: var(--doc-hover);
}

.doc-tree-folder {
  color: var(--doc-text);
}

.doc-tree-children {
  padding-left: 1rem;
  margin-top: 0.2rem;
}

.doc-tree-node {
  color: var(--doc-text);
}

.doc-center-alert {
  background: rgba(255, 193, 7, 0.12);
  border: 1px solid rgba(255, 193, 7, 0.35);
  color: #1a1d21;
}

/* 密等及解密條件視窗 */
.doc-security-modal :deep(.modal-content) {
  background: var(--doc-card);
  border: 1px solid var(--doc-border);
}

.doc-security-modal :deep(.modal-header) {
  background: var(--doc-toolbar-bg);
  color: var(--doc-text);
  border-bottom: 1px solid var(--doc-border);
}

.doc-security-modal :deep(.modal-body) {
  background: var(--doc-card);
  color: var(--doc-text);
}

.doc-security-modal :deep(.modal-footer) {
  background: var(--doc-toolbar-bg);
  border-top: 1px solid var(--doc-border);
  padding: 0.5rem 1rem;
}

.doc-security-modal :deep(.modal-footer .btn-outline-secondary) {
  color: var(--doc-text);
  border-color: var(--doc-border);
  background: transparent;
}

.doc-security-modal :deep(.modal-footer .btn-outline-secondary:hover) {
  background: var(--doc-hover);
  border-color: var(--doc-text);
  color: var(--doc-text);
}

.doc-security-modal :deep(.modal-footer .btn-theme) {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.doc-security-modal :deep(.btn-close) {
  filter: invert(1);
  opacity: 0.8;
}

.doc-security-modal-body {
  padding: 0.5rem 0;
}

.doc-security-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--doc-input-bg);
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--doc-border);
}

.doc-security-row label {
  flex: 0 0 auto;
  min-width: 10rem;
  color: var(--doc-text);
  font-size: 0.875rem;
  margin: 0;
}

.doc-security-select {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid var(--doc-input-border);
  color: #1a1d21;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  border-radius: 4px;
  cursor: pointer;
}

.doc-security-select option {
  color: #1a1d21;
  background: #fff;
}

.doc-security-date-wrap {
  flex: 1;
  min-width: 0;
}

.doc-security-date-wrap :deep(.republic-date-picker) {
  width: 100%;
}

.doc-security-date-wrap :deep(.dp__input_wrap),
.doc-security-date-wrap :deep(.dp__input) {
  background: var(--doc-input-bg) !important;
  border-color: var(--doc-input-border) !important;
  color: var(--doc-text) !important;
}

.doc-security-date-wrap :deep(.dp__input_icon) {
  color: var(--doc-text);
}

.doc-security-warning {
  color: #ea8600;
  font-size: 0.875rem;
  margin: 0.75rem 0 0;
  padding: 0.25rem 0;
}

.doc-security-error {
  color: #fca5a5;
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
  padding: 0.35rem 0.5rem;
  background: rgba(220, 53, 69, 0.25);
  border: 1px solid rgba(248, 113, 113, 0.5);
  border-radius: 4px;
}

/* 發文機關資訊視窗 */
.doc-issuing-modal-body .doc-security-row {
  background: var(--doc-input-bg);
  border: 1px solid var(--doc-border);
}

.doc-issuing-modal-body .doc-security-row label {
  color: var(--doc-text);
}

.doc-issuing-modal-body .doc-security-select,
.doc-issuing-modal-body .doc-issuing-input {
  background: var(--doc-input-bg) !important;
  border: 1px solid var(--doc-input-border) !important;
  color: var(--doc-text) !important;
}

.doc-issuing-modal-body {
  padding: 0.5rem 0;
}

.doc-issuing-table-wrap {
  overflow-x: auto;
  margin-bottom: 1rem;
  border: 1px solid var(--doc-border);
  border-radius: 4px;
}

.doc-issuing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.doc-issuing-table th,
.doc-issuing-table td {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--doc-border);
  color: var(--doc-text);
  text-align: left;
}

.doc-issuing-table th {
  background: var(--doc-toolbar-bg);
  color: var(--doc-text);
}

.doc-issuing-table tbody tr {
  cursor: pointer;
}

.doc-issuing-table tbody tr:hover {
  background: var(--doc-hover);
}

.doc-issuing-row-selected {
  background: rgba(99, 102, 241, 0.2) !important;
}

.doc-issuing-table .doc-issuing-btn {
  padding: 0.2rem 0.4rem;
  margin: 0 0.1rem;
  font-size: 0.75rem;
  background: var(--doc-input-bg);
  border: 1px solid var(--doc-input-border);
  color: var(--doc-text);
  border-radius: 4px;
  cursor: pointer;
}

.doc-issuing-table .doc-issuing-btn:hover {
  background: var(--doc-hover);
}

.doc-issuing-btn-del {
  color: #fca5a5;
}

.doc-issuing-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.35rem 1rem;
}

.doc-issuing-form .doc-security-row {
  margin-bottom: 0;
}

.doc-issuing-input-with-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.doc-issuing-input-with-btn .doc-issuing-input {
  flex: 1;
  min-width: 0;
}

.doc-issuing-btn-adv {
  flex-shrink: 0;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background: var(--doc-input-bg);
  border: 1px solid var(--doc-input-border);
  color: var(--doc-text);
  border-radius: 4px;
  cursor: pointer;
}

.doc-issuing-btn-adv:hover {
  background: var(--doc-hover);
}

.doc-issuing-modal :deep(.modal-content) {
  background: var(--doc-card);
  border: 1px solid var(--doc-border);
}

.doc-issuing-modal :deep(.modal-header) {
  background: var(--doc-toolbar-bg);
  color: var(--doc-text);
  border-bottom: 1px solid var(--doc-border);
}

.doc-issuing-modal :deep(.modal-body) {
  background: var(--doc-card);
  color: var(--doc-text);
}

.doc-issuing-modal :deep(.modal-footer) {
  background: var(--doc-toolbar-bg);
  border-top: 1px solid var(--doc-border);
  padding: 0.5rem 1rem;
}

.doc-issuing-modal :deep(.modal-footer .btn-outline-secondary) {
  color: var(--doc-text);
  border-color: var(--doc-border);
  background: transparent;
}

.doc-issuing-modal :deep(.modal-footer .btn-outline-secondary:hover) {
  background: var(--doc-hover);
  border-color: var(--doc-text);
  color: var(--doc-text);
}

.doc-issuing-modal :deep(.modal-footer .btn-theme) {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.doc-issuing-modal :deep(.btn-close) {
  filter: invert(1);
  opacity: 0.8;
}

@media (max-width: 992px) {
  .doc-sidebar {
    flex: 0 0 180px;
    margin-left: 0.5rem;
  }
}

@media (max-width: 768px) {
  .doc-layout {
    flex-direction: column;
  }

  .doc-sidebar {
    flex: none;
    width: 100%;
    margin-left: 0;
    margin-top: 0.5rem;
  }

  .doc-section-compact .doc-form-grid-compact,
  .doc-section-footer .doc-footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<!-- Modal 變數：未 scoped，因 Modal Teleport 到 body、root 為別組件，scoped 選不到 -->
<style>
.doc-security-modal,
.doc-issuing-modal {
  --doc-card: #25282c;
  --doc-border: #3a3d42;
  --doc-text: #e4e6eb;
  --doc-toolbar-bg: #2d3748;
  --doc-input-bg: #2d3139;
  --doc-input-border: #3a3d42;
  --doc-hover: rgba(255, 255, 255, 0.06);
}
</style>
