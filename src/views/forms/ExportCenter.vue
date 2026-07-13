<script setup lang="ts">
/**
 * 匯出中心（Export Center）
 *
 * 設計目標
 * - 與專案其它「表單生成與管理」頁面樣式一致：`PageHeader` + 麵包屑 + `Card / CardBody` 黑底主題。
 * - 「分類 & 細項」**依目前視角自動切換**：
 *     監造：A 類（hardcode）+ B / C / D / H / I / L（依文件檔案分類表，最新一版設計變更）。
 *     營造：O 類（hardcode）+ P 類（hardcode P-1~P-3 + 動態 P-4+）+ B / E / G / R / T / Q（依文件檔案分類表）。
 *   分類表頁面 dispatch refresh event 後立刻 reload，避免使用者覺得「剛新增的項目沒同步過來」。
 * - **快速功能**（Tab：快速匯出）：常用一鍵組合，例如「整份 B 類」、「整份 P 類計畫書」、「重做上次匯出」。
 * - **自定義匯出**：每分類一張 collapsible 卡片；卡片 header 有「全選此類 / 已選 X/N」摘要與展開鈕；
 *   避免一張畫面把全部勾選清單一次傾倒給使用者。
 * - **Sticky 底部操作欄**：永遠看得到「已選 X 筆 / 預覽 / 匯出」，使用者不必拉回頂端就能執行。
 * - **匯出設定**預設折起，按需展開避免視覺壓力。
 *
 * 後端尚未實作真正的「批次匯出」API，此頁第一階段保留 mock 進度條 + 假歷史，等 API 完成再接。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { documentClassificationApi, type DocumentClassification } from '@/api/documentClassification'
import {
  contractorDocumentClassificationApi,
  type ContractorDocumentClassification,
} from '@/api/contractorDocumentClassification'
import { getDesignChangeList } from '@/api/designChange'
import { useAppContractorSidebarMenuStore } from '@/stores/app-contractor-sidebar-menu'

// =========================
// 型別
// =========================
type ViewSide = 'supervisory' | 'contractor'
type FormItem = {
  id: string             // 用於去重 / 勾選；hardcode 用 letter+seq，分類表用 dc-{rawId}
  category: string       // 例如 'B'、'P'
  itemNumber: string     // 顯示用序號，例如 '1'、'12'
  documentName: string   // 文件名稱
  source: 'hardcoded' | 'doc-class'  // 來源
  url?: string           // 對應 sidebar URL（可選，方便預覽連結）
  /**
   * 此表單在目前工程案/版本內是否「有資料可匯出」。
   * - true：可勾選並匯出。
   * - false：無資料 → checkbox disabled、整 row 灰階。
   *
   * 目前判斷方式（過渡）：用前端白名單 + 動態書架類視為無資料，因為後端尚未提供
   * documentShelfApi 紀錄列表。未來若加上「readiness API」一次查回每個表單在當前
   * 工程案/版本內的資料存在性，就把這個欄位的計算改成讀 API 結果即可，UI 不必再變。
   */
  hasData: boolean
}
type CategoryGroup = {
  code: string           // 'A' / 'B' / ...
  label: string          // 顯示名稱，例如 'A類 - 工程文件'
  items: FormItem[]
}

// =========================
// 有資料表單判斷（過渡白名單）
// =========================
/**
 * 「是否有資料可匯出」的判斷邏輯，目前以**前端白名單**做近似：
 *  - 列在 `FORMS_WITH_DATA_URLS` 或符合 `FORMS_WITH_DATA_URL_PATTERNS` 的固定頁
 *    視為「有資料」（這些頁面在工程案開通後幾乎都會被填入內容）。
 *  - 其餘（動態分類書架類、公文列表等）視為「無資料」。
 *
 * 未來若後端提供 readiness API（一次查回每個表單在 cid/designChangeId 範圍內
 * 是否有可匯出紀錄），就把 `hasFormData(url)` 改成讀 API 結果即可，UI 不必改。
 *
 * 多筆紀錄型表單（A-5 估驗、書架式…）匯出契約：批次匯出 API 帶 `latestOnly=true`，
 * 後端只回傳該表單**最新一筆**紀錄。
 */
const FORMS_WITH_DATA_URLS = new Set<string>([
  // 監造 A 類
  '/forms/a1-contract',
  '/forms/a2-budget',
  '/forms/a3-commencement',
  '/forms/a4-download',
  '/forms/a5-download',
  '/forms/a6-insurance',
  '/forms/a7-download',
  // 監造 B-1 / B-2
  '/forms/export-supervision-plan',
  '/forms/b2-safety-supervision-plan',
  // 營造 O 類
  '/forms/o1-commencement',
  '/forms/o1-extension',
  '/forms/o3-estimate',
  '/forms/o4-labour-safety',
  '/forms/o6-insurance',
  // 營造 P-1 / P-2 / P-3
  '/forms/p1-overall-construction-plan',
  '/forms/p2-quality-plan',
  '/forms/p3-occupational-safety-health-plan',
])
const FORMS_WITH_DATA_URL_PATTERNS: RegExp[] = [
  // 營造 P-4+ 動態計畫書
  /^\/forms\/p-plan-dynamic(\?.*)?$/,
]
function hasFormData(url: string | undefined): boolean {
  if (!url) return false
  if (FORMS_WITH_DATA_URLS.has(url)) return true
  const pathOnly = url.split('?')[0]
  if (FORMS_WITH_DATA_URLS.has(pathOnly)) return true
  return FORMS_WITH_DATA_URL_PATTERNS.some(re => re.test(url))
}

// =========================
// 視角與工程案
// =========================
const workspaceStore = useWorkspaceStore()
const { isContractor } = useViewPerspective()
const contractorSidebarStore = useAppContractorSidebarMenuStore()
/**
 * 用 computed 包一層繞過 `storeToRefs(store as any)` 的型別問題。
 * Pinia store 是 reactive，`(store as any).dynamicPMenuItems` 已經是解開後的陣列，
 * 直接讀就會建立 reactive 依賴，sidebar P 類載入完成時這個 computed 會跟著更新。
 */
const contractorDynamicPMenuItems = computed<Array<{ text?: string; url?: string }>>(
  () => ((contractorSidebarStore as any).dynamicPMenuItems ?? []) as Array<{ text?: string; url?: string }>,
)

const side = computed<ViewSide>(() => (isContractor.value ? 'contractor' : 'supervisory'))
const currentProject = computed(() => workspaceStore.currentProject)
const hasProject = computed(() => !!currentProject.value?.id)

// =========================
// Tab 狀態
// =========================
type TabId = 'custom' | 'history'
const activeTab = ref<TabId>('custom')

// =========================
// hardcoded 列表（與 sidebar 內容一致；分類表來源以外的固定頁面）
// =========================
const SUPERVISORY_A_ITEMS: Array<{ seq: number; name: string; url: string }> = [
  { seq: 1, name: '工程契約', url: '/forms/a1-contract' },
  { seq: 2, name: '施工預算書', url: '/forms/a2-budget' },
  { seq: 3, name: '開、竣、停工報告', url: '/forms/a3-commencement' },
  { seq: 4, name: '工期展延申請總表', url: '/forms/a4-download' },
  { seq: 5, name: '估驗請款計價單', url: '/forms/a5-download' },
  { seq: 6, name: '工程保險', url: '/forms/a6-insurance' },
  { seq: 7, name: '職安報備書', url: '/forms/a7-download' },
  { seq: 8, name: '[收文] 業主來文', url: '/document-center?category=RECEIVE_OWNER' },
  { seq: 9, name: '[收文] 廠商來文', url: '/document-center?category=RECEIVE_CONTRACTOR' },
  { seq: 10, name: '[收文] 其他來文', url: '/document-center?category=RECEIVE_OTHER' },
  { seq: 11, name: '[發文]', url: '/document-center?category=SEND' },
]
const SUPERVISORY_B_HARDCODED: Array<{ seq: number; name: string; url: string }> = [
  { seq: 1, name: '監造計劃書', url: '/forms/export-supervision-plan' },
  { seq: 2, name: '安全衛生監督', url: '/forms/b2-safety-supervision-plan' },
]
const CONTRACTOR_O_ITEMS: Array<{ seq: number; name: string; url: string }> = [
  { seq: 1, name: '開、竣、停工報告', url: '/forms/o1-commencement' },
  { seq: 2, name: '工期展延申請總表', url: '/forms/o1-extension' },
  { seq: 3, name: '估驗請款計價表', url: '/forms/o3-estimate' },
  { seq: 4, name: '職安報備書', url: '/forms/o4-labour-safety' },
  { seq: 6, name: '營造工程保險', url: '/forms/o6-insurance' },
]

// =========================
// 分類表資料
// =========================
const SUPERVISORY_DOC_CATEGORIES = ['B', 'C', 'D', 'H', 'I', 'L'] as const
const CONTRACTOR_DOC_CATEGORIES = ['B', 'E', 'G', 'R', 'T', 'Q'] as const

const supervisoryRows = ref<DocumentClassification[]>([])
const contractorRows = ref<ContractorDocumentClassification[]>([])
const isLoading = ref(false)
const latestDesignChangeId = ref<number | null>(null)
let loadAbortFlag = 0

/** "01"/"03a" → "1"/"3"；非數字保留原值 */
function parseSeq(itemNumber: string | null | undefined): string {
  const raw = String(itemNumber ?? '').trim()
  if (!raw) return ''
  const m = raw.match(/^0*(\d+)/)
  return m ? m[1] : raw
}

async function fetchLatestDesignChangeId(constructionId: string): Promise<number | null> {
  try {
    const versions = await getDesignChangeList(constructionId, undefined, { skipAuthRedirectOn401: true }, false)
    const latest = versions.reduce<{ id: number; sortOrder: number } | null>((acc, cur) => {
      if (!acc || cur.sortOrder > acc.sortOrder) return { id: cur.id, sortOrder: cur.sortOrder }
      return acc
    }, null)
    return latest?.id ?? null
  } catch {
    return null
  }
}

async function loadDocClassRows() {
  const cid = currentProject.value?.id
  if (!cid) {
    supervisoryRows.value = []
    contractorRows.value = []
    return
  }
  isLoading.value = true
  const myToken = ++loadAbortFlag
  try {
    const designChangeId = await fetchLatestDesignChangeId(cid)
    if (myToken !== loadAbortFlag) return
    latestDesignChangeId.value = designChangeId

    if (side.value === 'supervisory') {
      const items = await documentClassificationApi.getAll(cid, designChangeId, { skipAuthRedirectOn401: true })
      if (myToken !== loadAbortFlag) return
      supervisoryRows.value = items.filter(i =>
        (SUPERVISORY_DOC_CATEGORIES as readonly string[]).includes(i.category),
      )
      contractorRows.value = []
    } else {
      const items = await contractorDocumentClassificationApi.getAll(
        cid,
        designChangeId,
        { skipAuthRedirectOn401: true } as any,
      )
      if (myToken !== loadAbortFlag) return
      // 同時保留 P 類（給「動態 P-4+」用）與 6 大類。
      contractorRows.value = items.filter(i =>
        (CONTRACTOR_DOC_CATEGORIES as readonly string[]).includes(i.category) || i.category === 'P',
      )
      supervisoryRows.value = []
    }
  } catch {
    if (myToken === loadAbortFlag) {
      supervisoryRows.value = []
      contractorRows.value = []
    }
  } finally {
    if (myToken === loadAbortFlag) isLoading.value = false
  }
}

// 視角 / 工程案切換 → reload
watch(
  () => [side.value, currentProject.value?.id ?? ''],
  () => { void loadDocClassRows() },
  { immediate: true },
)

// 監聽 sidebar 同步事件，分類表編輯後即時 reload
function onDocClassRefresh() { void loadDocClassRows() }
onMounted(() => {
  window.addEventListener('supervisory-sidebar-doc-class-refresh', onDocClassRefresh)
  window.addEventListener('contractor-sidebar-doc-class-refresh', onDocClassRefresh)
  window.addEventListener('contractor-sidebar-p-menu-refresh', onDocClassRefresh)
})
onBeforeUnmount(() => {
  window.removeEventListener('supervisory-sidebar-doc-class-refresh', onDocClassRefresh)
  window.removeEventListener('contractor-sidebar-doc-class-refresh', onDocClassRefresh)
  window.removeEventListener('contractor-sidebar-p-menu-refresh', onDocClassRefresh)
})

// =========================
// 組裝分類分組
// =========================
const SUPERVISORY_LABELS: Record<string, string> = {
  A: 'A類 - 監造工程文件',
  B: 'B類 - 計畫與監督',
  C: 'C類',
  D: 'D類 - 自主檢查',
  H: 'H類',
  I: 'I類',
  L: 'L類',
}
const CONTRACTOR_LABELS: Record<string, string> = {
  O: 'O類 - 工程文件',
  P: 'P類 - 計畫書',
  B: 'B類 - 估驗',
  E: 'E類 - 自主檢查',
  G: 'G類 - 進度報告',
  R: 'R類 - 會議紀錄',
  T: 'T類 - 試驗報告',
  Q: 'Q類 - 品質缺失改善',
}

/** 共用：補上 `hasData` 欄位（依目前白名單判斷） */
function toFormItem(raw: Omit<FormItem, 'hasData'>): FormItem {
  return { ...raw, hasData: hasFormData(raw.url) }
}

function buildSupervisoryGroups(): CategoryGroup[] {
  const groups: CategoryGroup[] = []
  // A 類：hardcode 11 個
  groups.push({
    code: 'A',
    label: SUPERVISORY_LABELS.A,
    items: SUPERVISORY_A_ITEMS.map(x => toFormItem({
      id: `A-${x.seq}`,
      category: 'A',
      itemNumber: String(x.seq),
      documentName: x.name,
      source: 'hardcoded',
      url: x.url,
    })),
  })

  // B 類：hardcode B-1 / B-2 名稱動態帶分類表（找不到回退預設名），其後 + 分類表動態
  const bRows = supervisoryRows.value.filter(i => i.category === 'B')
  const bItems: FormItem[] = []
  for (const fixed of SUPERVISORY_B_HARDCODED) {
    const num = String(fixed.seq).padStart(2, '0')
    const row = bRows.find(r => (r.itemNumber || '') === num)
    bItems.push(toFormItem({
      id: `B-${fixed.seq}`,
      category: 'B',
      itemNumber: String(fixed.seq),
      documentName: row?.documentName || fixed.name,
      source: 'hardcoded',
      url: fixed.url,
    }))
  }
  // 動態：B 類其他項目（skip 01 / 02 不重複）
  bRows
    .filter(r => r.itemNumber !== '01' && r.itemNumber !== '02')
    .sort((a, b) => (a.itemNumber || '').localeCompare(b.itemNumber || ''))
    .forEach(r => {
      bItems.push(toFormItem({
        id: `dc-${r.id}`,
        category: 'B',
        itemNumber: parseSeq(r.itemNumber),
        documentName: r.documentName,
        source: 'doc-class',
        url: `/supervisory/forms/doc-class/B/${r.id}`,
      }))
    })
  groups.push({ code: 'B', label: SUPERVISORY_LABELS.B, items: bItems })

  // C / D / H / I / L：純動態分類表
  for (const cat of ['C', 'D', 'H', 'I', 'L'] as const) {
    const rows = supervisoryRows.value
      .filter(i => i.category === cat)
      .sort((a, b) => (a.itemNumber || '').localeCompare(b.itemNumber || ''))
    groups.push({
      code: cat,
      label: SUPERVISORY_LABELS[cat],
      items: rows.map(r => toFormItem({
        id: `dc-${r.id}`,
        category: cat,
        itemNumber: parseSeq(r.itemNumber),
        documentName: r.documentName,
        source: 'doc-class',
        url: `/supervisory/forms/doc-class/${cat}/${r.id}`,
      })),
    })
  }
  return groups
}

function buildContractorGroups(): CategoryGroup[] {
  const groups: CategoryGroup[] = []
  // O 類：hardcode
  groups.push({
    code: 'O',
    label: CONTRACTOR_LABELS.O,
    items: CONTRACTOR_O_ITEMS.map(x => toFormItem({
      id: `O-${x.seq}`,
      category: 'O',
      itemNumber: String(x.seq),
      documentName: x.name,
      source: 'hardcoded',
      url: x.url,
    })),
  })

  // P 類：以 sidebar store `dynamicPMenuItems` 為唯一真實來源，
  // 確保「P-1 ~ P-3 + 動態 P-4+」順序、URL、名稱與 sidebar 完全一致。
  const pItems: FormItem[] = (contractorDynamicPMenuItems.value as Array<{ text?: string; url?: string }> | undefined ?? [])
    .map((m, idx) => {
      const text = String(m?.text ?? '').trim()
      const url = String(m?.url ?? '')
      const match = text.match(/^P-(\d+)\s+(.+)$/)
      const seq = match ? match[1] : String(idx + 1)
      const name = match ? match[2] : text
      // P 類所有項目（hardcode P-1~P-3 + 動態 P-4+）來源都是「分類表 + 對應計畫書頁」。
      // 目前白名單將其全部視為有資料；之後接 readiness API 後會以實際資料為準。
      return {
        id: `P-${seq}-${url || idx}`,
        category: 'P',
        itemNumber: seq,
        documentName: name,
        source: 'doc-class' as const,
        url,
        hasData: hasFormData(url),
      }
    })
  groups.push({ code: 'P', label: CONTRACTOR_LABELS.P, items: pItems })

  // B / E / G / R / T / Q：分類表動態
  for (const cat of CONTRACTOR_DOC_CATEGORIES) {
    const rows = contractorRows.value
      .filter(i => i.category === cat)
      .sort((a, b) => (a.itemNumber || '').localeCompare(b.itemNumber || ''))
    groups.push({
      code: cat,
      label: CONTRACTOR_LABELS[cat],
      items: rows.map(r => toFormItem({
        id: `dc-${r.id}`,
        category: cat,
        itemNumber: parseSeq(r.itemNumber),
        documentName: r.documentName,
        source: 'doc-class',
        url: `/contractor/forms/doc-class/${cat}/${r.id}`,
      })),
    })
  }
  return groups
}

const categoryGroups = computed<CategoryGroup[]>(() => {
  return side.value === 'contractor' ? buildContractorGroups() : buildSupervisoryGroups()
})

const docClassMaintainUrl = computed(() =>
  side.value === 'contractor' ? '/forms/contractor-document-classification' : '/forms/document-classification',
)

// 搜尋
const searchKeyword = ref('')
const filteredGroups = computed<CategoryGroup[]>(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return categoryGroups.value
  return categoryGroups.value
    .map(g => ({
      ...g,
      items: g.items.filter(i =>
        i.documentName.toLowerCase().includes(kw)
        || `${i.category}-${i.itemNumber}`.toLowerCase().includes(kw),
      ),
    }))
    .filter(g => g.items.length > 0)
})

// 折疊狀態（預設全部展開）
const collapsedCategories = reactive<Record<string, boolean>>({})
function toggleCategory(code: string) {
  collapsedCategories[code] = !collapsedCategories[code]
}
function expandAll() {
  for (const g of categoryGroups.value) collapsedCategories[g.code] = false
}
function collapseAll() {
  for (const g of categoryGroups.value) collapsedCategories[g.code] = true
}

// =========================
// 勾選邏輯
// =========================
const selectedIds = ref<Set<string>>(new Set())
function isSelected(id: string) { return selectedIds.value.has(id) }
function setItem(item: FormItem, value: boolean) {
  if (!item.hasData) return
  const next = new Set(selectedIds.value)
  if (value) next.add(item.id)
  else next.delete(item.id)
  selectedIds.value = next
}
/** 群組內有資料的項目（沒資料的不計入全選 / 計數，避免 indeterminate 永遠卡住） */
function availableInGroup(group: CategoryGroup): FormItem[] {
  return group.items.filter(i => i.hasData)
}
function selectAllInGroup(group: CategoryGroup) {
  const next = new Set(selectedIds.value)
  for (const i of availableInGroup(group)) next.add(i.id)
  selectedIds.value = next
}
function clearGroup(group: CategoryGroup) {
  const next = new Set(selectedIds.value)
  for (const i of group.items) next.delete(i.id)
  selectedIds.value = next
}
function clearAllSelections() { selectedIds.value = new Set() }
function selectedCountInGroup(group: CategoryGroup) {
  let c = 0
  for (const i of group.items) if (selectedIds.value.has(i.id)) c++
  return c
}
function isGroupAllSelected(group: CategoryGroup) {
  const list = availableInGroup(group)
  return list.length > 0 && list.every(i => selectedIds.value.has(i.id))
}
function isGroupPartial(group: CategoryGroup) {
  const list = availableInGroup(group)
  const n = list.filter(i => selectedIds.value.has(i.id)).length
  return n > 0 && n < list.length
}

const selectedItems = computed<FormItem[]>(() => {
  const all: FormItem[] = []
  for (const g of categoryGroups.value) for (const i of g.items) all.push(i)
  const set = selectedIds.value
  return all.filter(i => set.has(i.id))
})
const selectedCount = computed(() => selectedItems.value.length)

// =========================
// 匯出設定 / 進度（mock）
// =========================
const showExportSettings = ref(false)
const exportSettings = reactive({
  format: 'xlsx' as 'xlsx' | 'pdf' | 'docx' | 'csv',
  includeCharts: true,
  includeImages: true,
  includeComments: false,
  compress: false,
  passwordProtect: false,
  password: '',
  fileName: '',
  templateStyle: 'standard' as 'standard' | 'professional' | 'minimal',
})
const isExporting = ref(false)
const exportProgress = ref(0)

type HistoryEntry = {
  id: number
  fileName: string
  type: '自定義匯出'
  scenario: string
  createTime: string
  fileSize: string
  status: 'completed' | 'processing' | 'failed'
  downloadUrl: string
  selectedIds?: string[]
}
const exportHistory = ref<HistoryEntry[]>([])

function defaultFileName(): string {
  const dateStr = new Date().toISOString().split('T')[0]
  return `表單匯出_${dateStr}`
}

/**
 * 觸發匯出（目前仍為 mock；待後端批次匯出 API 完成後實作）。
 *
 * 後端契約（pending）：
 *   POST /api/management/constructions/{cid}/forms/batch-export
 *   payload: {
 *     designChangeId: number | null,
 *     items: Array<{ url: string, category: string, itemNumber: string }>,
 *     // 多筆紀錄型表單（A-5 估驗、書架式頁面…）僅匯出**最新一筆**紀錄。
 *     // 單筆型表單忽略此參數。
 *     latestOnly: true,
 *     options: { format, includeCharts, includeImages, includeComments, compress, password }
 *   }
 *   回應：檔案下載（zip 或單檔）。
 *
 * 為什麼是 latestOnly？
 *   匯出中心定位為「一站式整批匯出」，使用者預期是當下「最新狀態」的快照；
 *   若要挑指定一筆／日期區間，請到該表單頁面內單獨匯出。
 */
async function startExport() {
  if (selectedCount.value === 0) {
    toastService.warning('請先勾選要匯出的表單')
    return
  }
  const fileName = exportSettings.fileName?.trim() || defaultFileName()
  isExporting.value = true
  exportProgress.value = 0
  try {
    const progressTimer = setInterval(() => {
      exportProgress.value += Math.random() * 15
      if (exportProgress.value >= 100) {
        exportProgress.value = 100
        clearInterval(progressTimer)
      }
    }, 200)
    await new Promise(resolve => setTimeout(resolve, 1800))
    const newEntry: HistoryEntry = {
      id: Date.now(),
      fileName: `${fileName}.${exportSettings.format}`,
      type: '自定義匯出',
      scenario: selectedItems.value
        .slice(0, 3)
        .map(i => `${i.category}-${i.itemNumber}`)
        .join(', ')
        + (selectedItems.value.length > 3 ? ` +${selectedItems.value.length - 3} 項` : ''),
          createTime: new Date().toLocaleString('zh-TW'),
      fileSize: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
          status: 'completed',
      downloadUrl: '#',
      selectedIds: Array.from(selectedIds.value),
    }
    exportHistory.value = [newEntry, ...exportHistory.value]
    toastService.success(`匯出完成：${newEntry.fileName}`)
  } catch (err) {
    console.warn('匯出失敗', err)
    toastService.error('匯出失敗，請重試')
      } finally {
    isExporting.value = false
    exportProgress.value = 0
  }
}

function previewExport() {
  if (selectedCount.value === 0) {
    toastService.warning('請先勾選要匯出的表單')
    return
  }
  showPreview.value = true
}

function downloadHistoryFile(item: HistoryEntry) {
  toastService.info(`開始下載：${item.fileName}（mock）`)
}
function deleteHistoryItem(item: HistoryEntry) {
  exportHistory.value = exportHistory.value.filter(h => h.id !== item.id)
  toastService.success('歷史紀錄已刪除')
}
function reuseHistorySelection(item: HistoryEntry) {
  if (!item.selectedIds || item.selectedIds.length === 0) {
    toastService.info('此紀錄沒有可帶回的細項清單')
    return
  }
  selectedIds.value = new Set(item.selectedIds)
  activeTab.value = 'custom'
  toastService.success(`已套用 ${item.selectedIds.length} 個項目`)
}

// =========================
// 預覽 Modal
// =========================
const showPreview = ref(false)
function closePreview() { showPreview.value = false }
function confirmPreviewExport() {
  showPreview.value = false
  void startExport()
}

// =========================
// 麵包屑
// =========================
const breadcrumbs = computed(() => [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: '匯出中心', active: true as const },
])
</script>

<template>
  <div class="export-center-page">
  <PageHeader
    title="匯出中心"
    icon="fa fa-download"
      :breadcrumbs="breadcrumbs"
    />

    <!-- 主卡片：自定義匯出 + 匯出歷史 -->
    <Card>
      <CardHeader>
        <ul class="nav nav-tabs card-header-tabs">
          <li class="nav-item">
              <button 
                type="button"
                class="nav-link" 
                :class="{ active: activeTab === 'custom' }"
              @click="activeTab = 'custom'"
            >
              <i class="bi bi-sliders me-1"></i>自定義匯出
              <span
                v-if="selectedCount > 0"
                class="badge bg-theme text-bg-theme ms-1"
              >{{ selectedCount }}</span>
              </button>
            </li>
          <li class="nav-item">
              <button 
              type="button"
                class="nav-link" 
                :class="{ active: activeTab === 'history' }"
              @click="activeTab = 'history'"
            >
              <i class="bi bi-clock-history me-1"></i>匯出歷史
              <span
                v-if="exportHistory.length > 0"
                class="badge border border-secondary text-secondary ms-1"
              >{{ exportHistory.length }}</span>
              </button>
            </li>
                     </ul>
      </CardHeader>

      <CardBody>
        <!-- 工程案/視角守 -->
        <div v-if="!hasProject" class="alert alert-warning mb-0">
          <i class="fa fa-exclamation-triangle me-2"></i>請先於左側選擇工程案，再進行匯出。
            </div>

        <template v-else>
          <!-- ============ Tab: 自定義匯出 ============ -->
          <div v-if="activeTab === 'custom'">
            <div class="row g-2 mb-3 align-items-end">
              <div class="col-md-6">
                <label class="form-label small text-muted mb-1">搜尋表單</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text"><i class="bi bi-search"></i></span>
                  <input 
                    type="text" 
                    class="form-control" 
                    v-model="searchKeyword"
                    placeholder="輸入表單編號或名稱（例：B-1、品質）"
                  />
                  <button 
                    v-if="searchKeyword"
                    type="button" 
                    class="btn btn-outline-secondary"
                    @click="searchKeyword = ''"
                  ><i class="bi bi-x-lg"></i></button>
                </div>
              </div>
              <div class="col-md-auto ms-auto d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="expandAll">
                  <i class="bi bi-arrows-expand me-1"></i>全部展開
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="collapseAll">
                  <i class="bi bi-arrows-collapse me-1"></i>全部折起
                  </button>
                  <button 
                    type="button" 
                  class="btn btn-sm btn-outline-secondary"
                  :disabled="selectedCount === 0"
                  @click="clearAllSelections"
                  >
                  <i class="bi bi-eraser me-1"></i>清除全部 ({{ selectedCount }})
                  </button>
                </div>
              </div>

            <div v-if="isLoading" class="text-center text-muted py-3">
              <i class="fa fa-spinner fa-spin me-1"></i>載入中…
            </div>

            <template v-else>
              <div v-if="filteredGroups.length === 0" class="text-center text-muted py-4">
                <i class="bi bi-search fs-3 d-block mb-2"></i>
                <div>找不到符合的表單</div>
                <div class="small">請調整搜尋關鍵字</div>
              </div>

              <div
                v-for="group in filteredGroups"
                :key="group.code"
                class="category-block mb-3"
              >
                <!-- 群組 header -->
                <div
                  class="category-header"
                  :class="{ collapsed: collapsedCategories[group.code] }"
                >
                  <div class="form-check m-0 flex-grow-1 d-flex align-items-center gap-2">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :id="`grp-${group.code}`"
                      :checked="isGroupAllSelected(group)"
                      :indeterminate="isGroupPartial(group)"
                      :disabled="availableInGroup(group).length === 0"
                      :title="availableInGroup(group).length === 0 ? '此分類目前沒有資料可匯出' : ''"
                      @change="(e: any) => (e.target.checked ? selectAllInGroup(group) : clearGroup(group))"
                    />
                    <label :for="`grp-${group.code}`" class="form-check-label fw-semibold mb-0">
                      {{ group.label }}
                    </label>
                    <span class="badge border border-secondary text-secondary ms-1">
                      {{ selectedCountInGroup(group) }}/{{ availableInGroup(group).length }}
                    </span>
                </div>
                <button 
                  type="button" 
                    class="btn btn-sm btn-link text-muted p-0"
                    @click="toggleCategory(group.code)"
                >
                    <i :class="collapsedCategories[group.code] ? 'bi bi-chevron-down' : 'bi bi-chevron-up'"></i>
                </button>
            </div>

                <!-- 群組 body -->
                <transition name="fade">
                  <div v-show="!collapsedCategories[group.code]" class="category-body">
                    <div v-if="group.items.length === 0" class="empty-cell">
                      <i class="bi bi-inbox me-1"></i>
                      尚無項目，
                      <a :href="`#${docClassMaintainUrl}`">前往「文件檔案分類表」維護</a>
                    </div>
                    <div v-else class="items-grid">
                      <label
                        v-for="item in group.items"
                        :key="item.id"
                        class="item-row form-check m-0"
                  :class="{ 
                          'item-selected': isSelected(item.id),
                          'item-disabled': !item.hasData,
                        }"
                        :title="!item.hasData ? '此表單目前無資料' : ''"
                      >
                        <input
                          class="form-check-input"
                          type="checkbox"
                          :checked="isSelected(item.id)"
                          :disabled="!item.hasData"
                          @change="(e: any) => setItem(item, e.target.checked)"
                        />
                        <span class="item-code">{{ item.category }}-{{ item.itemNumber }}</span>
                        <span class="item-name">{{ item.documentName }}</span>
                      </label>
                        </div>
                      </div>
                </transition>
                    </div>
            </template>
            </div>

          <!-- ============ Tab: 匯出歷史 ============ -->
          <div v-else-if="activeTab === 'history'">
            <div class="table-responsive">
              <table class="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>檔案名稱</th>
                    <th>類型</th>
                    <th>內容</th>
                    <th>建立時間</th>
                    <th>大小</th>
                    <th>狀態</th>
                    <th class="text-end">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in exportHistory" :key="item.id">
                    <td>
                      <i class="bi bi-file-earmark-arrow-down me-2 text-muted"></i>
                        <strong>{{ item.fileName }}</strong>
                    </td>
                    <td><span class="badge border border-secondary text-secondary">{{ item.type }}</span></td>
                    <td class="text-muted small">{{ item.scenario }}</td>
                    <td class="small">{{ item.createTime }}</td>
                    <td class="small">{{ item.fileSize }}</td>
                    <td>
                      <span class="badge border border-success text-success">
                        {{ item.status === 'completed' ? '已完成' : item.status }}
                      </span>
                    </td>
                    <td class="text-end">
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-theme me-1"
                          @click="downloadHistoryFile(item)"
                      ><i class="bi bi-download"></i></button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary me-1"
                        :disabled="!item.selectedIds || item.selectedIds.length === 0"
                        @click="reuseHistorySelection(item)"
                        title="把此次選擇帶回自定義匯出"
                      ><i class="bi bi-arrow-repeat"></i></button>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-danger"
                          @click="deleteHistoryItem(item)"
                      ><i class="bi bi-trash"></i></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="exportHistory.length === 0" class="text-center text-muted py-4">
              <i class="bi bi-clock-history fs-3 d-block mb-2"></i>
              <div>尚無匯出紀錄</div>
              <div class="small">完成一次匯出後會出現在這裡</div>
            </div>
                     </div>
        </template>
      </CardBody>
    </Card>

    <!-- 匯出設定（折疊式） -->
    <Card v-if="hasProject && activeTab !== 'history'" class="mt-3">
      <CardHeader>
        <button
          type="button"
          class="btn btn-link p-0 d-flex align-items-center w-100 text-decoration-none"
          @click="showExportSettings = !showExportSettings"
        >
          <i class="bi bi-gear me-2"></i>
          <span class="fw-semibold">匯出設定</span>
          <span class="small text-muted ms-2">
            {{ exportSettings.format.toUpperCase() }}
            <template v-if="exportSettings.passwordProtect">・密碼保護</template>
            <template v-if="exportSettings.compress">・壓縮</template>
          </span>
          <i
            class="ms-auto"
            :class="showExportSettings ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"
          ></i>
        </button>
      </CardHeader>
      <CardBody v-if="showExportSettings">
        <div class="row g-3">
            <div class="col-lg-4">
            <h6 class="mb-3"><i class="bi bi-file-earmark-text me-1"></i>基本</h6>
            <div class="mb-2">
              <label class="form-label small">匯出格式</label>
              <select class="form-select form-select-sm" v-model="exportSettings.format">
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="pdf">PDF (.pdf)</option>
                <option value="docx">Word (.docx)</option>
                <option value="csv">CSV (.csv)</option>
                </select>
              </div>
            <div class="mb-2">
              <label class="form-label small">檔案名稱</label>
                <input 
                  type="text" 
                class="form-control form-control-sm"
                  v-model="exportSettings.fileName"
                :placeholder="defaultFileName()"
              />
              </div>
            <div class="mb-0">
              <label class="form-label small">樣板風格</label>
              <select class="form-select form-select-sm" v-model="exportSettings.templateStyle">
                <option value="standard">標準</option>
                <option value="professional">專業</option>
                <option value="minimal">簡約</option>
                </select>
              </div>
            </div>

            <div class="col-lg-4">
            <h6 class="mb-3"><i class="bi bi-stars me-1"></i>進階</h6>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="ec-charts" v-model="exportSettings.includeCharts" />
              <label class="form-check-label" for="ec-charts">包含圖表</label>
              </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="ec-images" v-model="exportSettings.includeImages" />
              <label class="form-check-label" for="ec-images">包含圖片</label>
              </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="ec-comments" v-model="exportSettings.includeComments" />
              <label class="form-check-label" for="ec-comments">包含註解</label>
              </div>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="ec-compress" v-model="exportSettings.compress" />
              <label class="form-check-label" for="ec-compress">壓縮檔案</label>
              </div>
            </div>

            <div class="col-lg-4">
            <h6 class="mb-3"><i class="bi bi-shield-lock me-1"></i>安全</h6>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="ec-pwd" v-model="exportSettings.passwordProtect" />
              <label class="form-check-label" for="ec-pwd">密碼保護</label>
              </div>
            <div v-if="exportSettings.passwordProtect">
                <input 
                  type="password" 
                class="form-control form-control-sm"
                  v-model="exportSettings.password"
                placeholder="檔案開啟密碼"
              />
              </div>
            </div>
          </div>
      </CardBody>
    </Card>

    <!-- 右下角浮動操作按鈕（只有預覽 + 匯出） -->
    <div
      v-if="hasProject && activeTab !== 'history'"
      class="export-action-bar"
      :title="selectedCount === 0 ? '請先勾選表單' : ''"
    >
      <div class="export-action-inner">
              <button 
                type="button" 
                class="btn btn-outline-theme"
          :disabled="selectedCount === 0 || isExporting"
                @click="previewExport"
              >
          <i class="bi bi-eye me-1"></i>預覽
              </button>
              <button 
                type="button" 
                class="btn btn-theme"
          :disabled="selectedCount === 0 || isExporting"
                @click="startExport"
        >
          <i
            class="me-1"
            :class="isExporting ? 'fa fa-spinner fa-spin' : 'bi bi-download'"
          ></i>
          {{ isExporting ? '匯出中…' : `匯出${selectedCount > 0 ? ` (${selectedCount})` : ''}` }}
              </button>
            </div>
      <div
        v-if="isExporting"
        class="export-action-progress progress"
        style="height: 4px;"
      >
        <div
          class="progress-bar progress-bar-striped progress-bar-animated bg-theme"
                :style="{ width: exportProgress + '%' }"
              ></div>
    </div>
  </div>

    <!-- 預覽 Modal -->
    <div
      class="modal fade"
      :class="{ show: showPreview }"
      :style="{ display: showPreview ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
              <i class="bi bi-eye me-2"></i>匯出預覽
          </h5>
            <button type="button" class="btn-close" @click="closePreview"></button>
        </div>
          <div class="modal-body">
          <div class="alert alert-info" role="alert">
              <i class="bi bi-info-circle me-2"></i>
              共 <strong>{{ selectedCount }}</strong> 個表單將被打包為
              <strong>{{ (exportSettings.fileName?.trim() || defaultFileName()) + '.' + exportSettings.format }}</strong>
          </div>
            <div
              v-for="group in categoryGroups.filter(g => selectedCountInGroup(g) > 0)"
              :key="`prev-${group.code}`"
              class="mb-3"
            >
              <div class="fw-semibold mb-2">
                {{ group.label }}
                <span class="badge border border-secondary text-secondary ms-1">
                  {{ selectedCountInGroup(group) }}
              </span>
            </div>
              <ul class="list-unstyled mb-0 ps-2">
                <li
                  v-for="item in group.items.filter(i => isSelected(i.id))"
                  :key="`prev-i-${item.id}`"
                  class="small text-muted"
                >
                  <i class="bi bi-file-earmark-text me-1"></i>
                  {{ item.category }}-{{ item.itemNumber }} {{ item.documentName }}
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closePreview">關閉</button>
            <button type="button" class="btn btn-theme" @click="confirmPreviewExport">
              <i class="bi bi-download me-1"></i>確認匯出
          </button>
        </div>
      </div>
    </div>
  </div>
    <div v-if="showPreview" class="modal-backdrop fade show" @click="closePreview"></div>
  </div>
</template>

<style scoped>
.export-center-page {
  /* 預留底部空間避免內容被右下角浮動按鈕擋住 */
  padding-bottom: 80px;
}

/* 分類群組 */
.category-block {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
}
.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.category-header.collapsed {
  border-bottom-color: transparent;
}
.category-body {
  padding: 8px 12px 12px;
}
.items-grid {
  display: grid;
  /* 用 min(100%, 280px) 確保視窗很窄時欄寬不會超過容器 */
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 6px;
  min-width: 0;
}
/**
 * .item-row 同時帶 Bootstrap `.form-check`，會自動套上：
 *   .form-check       { padding-left: 1.5em; }
 *   .form-check-input { margin-left: -1.5em; }   // 把 checkbox 推到 padding 區內
 * 我們的 row 是自訂 flex layout，這個負 margin 反而會把 checkbox 推到 row 容器外左側
 * （加上我們自己給的 padding: 8px 10px 不足以容納 -1.5em ≈ -24px），導致勾選框被切。
 * 因此覆寫：取消負 margin、移除預留的 padding-left，讓 checkbox 變成普通 flex 子項。
 */
.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px !important;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.12s ease, border-color 0.12s ease;
  min-width: 0;
}
.item-row:hover {
  background: rgba(255, 255, 255, 0.04);
}
.item-row.item-selected {
  background: rgba(var(--bs-theme-rgb), 0.08);
  border-color: rgba(var(--bs-theme-rgb), 0.4);
}
/* 不可匯出：灰階 + 禁用游標；hover 不再變底色 */
.item-row.item-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.item-row.item-disabled:hover {
  background: transparent;
}
.item-row.item-disabled .item-code,
.item-row.item-disabled .item-name {
  color: var(--bs-secondary-color);
}
.item-row .form-check-input {
  flex-shrink: 0;
  margin: 0 !important;
  float: none;
}
.item-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.item-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.875rem;
  /* 名稱太長時省略，不撐破 row */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-cell {
  padding: 12px;
  font-size: 0.875rem;
  color: var(--bs-secondary-color);
}
.empty-cell a {
  text-decoration: underline;
}

/**
 * 右下角浮動操作按鈕。
 * - 用 position: fixed + 高 z-index，避免被 sidebar / header sticky / page wrapper 的 overflow 攔截。
 * - 之前用 position: sticky 時，部分 layout 容器（含 transform / overflow:auto）會破壞 sticky 機制，
 *   造成「按鈕看得到但 click 事件被上層元素吃掉」的點擊穿透問題。
 */
.export-action-bar {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1030;
  pointer-events: none; /* 容器本身穿透；只有 inner / 進度條 接受點擊 */
}
.export-action-inner {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1a1f33;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6);
}
.export-action-progress {
  pointer-events: auto;
  margin-top: 6px;
  border-radius: 4px;
  overflow: hidden;
}

/* 折疊動畫 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Modal backdrop（與 Bootstrap 對齊） */
.modal { background-color: rgba(0,0,0,0.5); }
</style>
