<script setup lang="ts">
import { ref, reactive, computed, watch, watchEffect, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { storage } from '@/utils/storage'
import { updateConstruction, transformProjectFormToConstructionRequest } from '@/api/construction'
import { useAuthStore } from '@/stores/auth'
import { useViewPerspective } from '@/composables/useViewPerspective'
import tagsInput from '@/components/plugins/TagsInput.vue'
import quillEditor from '@/components/plugins/QuillEditor.vue'
import ProjectForm from '@/components/project/ProjectForm.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import VerificationLogList from '@/components/common/VerificationLogList.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import {
  contractorBasicDataApi,
  type SupervisoryBasicDataPreviewField
} from '@/api/contractorBasicData'
import {
  formatBasicPreviewFieldDisplay,
  formatProjectFormDateDisplay,
  formatNumber,
  formatAmountColloquialChinese,
  PROJECT_FORM_DATE_FIELD_KEYS
} from '@/utils/format'


// 獲取當前實例以訪問 $toast
const { proxy } = getCurrentInstance() as any

// 使用 workspace store
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore() // Init auth store
const route = useRoute()
const { viewType, initViewType } = useViewPerspective()

const isContractorView = computed(() => viewType.value === 'CONTRACTOR')
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')

// 檢查是否為空狀態（當前視角沒有資料）
const isEmptyState = ref(false)

// 變更設計版本：null = 預設版，數字 = 該變更設計 ID
const selectedDesignChangeId = ref<number | null>(null)

const showSupervisoryBasicModal = ref(false)
const supervisoryBasicPreviewRows = ref<SupervisoryBasicDataPreviewField[]>([])
const supervisoryBasicPreviewLoading = ref(false)
const isCopyingSupervisoryBasic = ref(false)
const supervisoryVersionAvailable = ref(true)
const contractorVersionLabel = ref<string | null>(null)
const resolvedSupervisoryVersionLabel = ref<string | null>(null)

const supervisoryBasicPreviewHint = computed(() =>
  selectedDesignChangeId.value != null
    ? '版次對應規則：原契約↔原契約、第一次↔第一次…。僅顯示變更設計可編輯欄位；複製將一律覆寫營造目前版本（含空值）。'
    : '版次對應規則：原契約↔原契約。複製將覆寫營造預設版欄位（不含工程名稱／契約編號、保險及雙方專用欄位）。'
)

const supervisorySourceVersionLabel = computed(() => {
  if (!supervisoryVersionAvailable.value) return '監造無此版本'
  return resolvedSupervisoryVersionLabel.value?.trim() || '—'
})

const supervisoryVersionCopyBanner = computed(() => ({
  contractor: contractorVersionLabel.value?.trim() || '原契約',
  supervisory: supervisorySourceVersionLabel.value
}))

const copySupervisoryBasicConfirmText = computed(() => {
  const c = supervisoryVersionCopyBanner.value.contractor
  const s = supervisoryVersionCopyBanner.value.supervisory
  return selectedDesignChangeId.value != null
    ? `確定將監造「${s}」的基本資料（版本欄位）複製到營造「${c}」？\n將一律覆寫對應欄位，此操作無法復原。`
    : `確定將監造「${s}」的基本資料複製到營造「${c}」？\n將一律覆寫對應欄位，此操作無法復原。`
})

const copySupervisoryBasicButtonText = computed(() => {
  const c = supervisoryVersionCopyBanner.value.contractor
  const s = supervisorySourceVersionLabel.value
  return `複製：監造「${s}」→ 營造「${c}」`
})

// 表單數據
const formData = ref({
  // 工程基本資料
  project_name: "",
  contract_number: "",
  project_location: "",
  host_agency: "",
  // 新增：公司名稱顯示欄位
  supervisory_company_name: "",
  contractor_company_name: "",
  design_company: "", // 設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
  construction_period: "",
  duration_type: "WORKING_DAYS", // 工期計算模式
  current_contract_amount: "",
  // 工程類別/屬性
  project_category: "",
  // 工期起訖日期
  sign_date: "",
  start_date: "",
  completion_date: "",
  construction_confirm_date: "",
  // 工程專案編號
  construction_project_id: "",
  // 付款方式
  payment_method: "",
  advance_payment_ratio: "",
  retention_ratio: "",
  // 驗收方式
  inspection_methods: [],
  segmented_acceptance: false,
  partial_acceptance: false,
  completion_acceptance: false,
  // 保險已拆分為獨立頁面（多筆 + 附件/檔案夾）
  // 簽核層級
  signLevel: [],
  // 樂觀鎖版本
  version: 0,
})

// 審核紀錄 (從專案資料中讀取)
// 這裡先定義結構，後續 mapProjectDataToForm 會填充
const verificationLogs = ref([])

// 鎖定欄位狀態

// 檢查用戶是否為專案管理員或成員（可以編輯）
const isProjectAdmin = computed(() => {
  const currentProject = workspaceStore.currentProject
  if (!currentProject) {
    return false
  }
  
  // SUPER_ADMIN 系統管理員視為專案管理員
  const userRole = authStore.user?.systemRole || authStore.user?.role
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  if (isSuperAdmin) {
    return true
  }
  
  // 檢查 permission 欄位（優先使用）
  const permission = currentProject.permission
  
  // ADMIN 和 MEMBER 都可以編輯，只有 VIEWER 是只讀
  if (permission === 'ADMIN' || permission === 'MEMBER') {
    return true
  }
  
  // 如果沒有 permission 欄位，不應該預設為 true
  // 應該根據用戶角色判斷，或者預設為 false（更安全）
  if (!permission) {
    return false
  }
  
  return false
})

      // 原始數據副本，用於比較是否有變更
const originalFormData = ref({})
      // 保存狀態
const isSaving = ref(false)
const hasUnsavedChanges = ref(false)
const isUpdatingFormData = ref(false)
// 版本切換或初次載入時的資料套用階段
const isVersionSwitching = ref(false)
      // 標籤相關
const tag = ref('')
const tags = ref([{
      	text: '土木工程'
      }, {
      	text: '建築工程'
}])
const tagGrade = ref('')
const tagsGrade = ref([{
      	text: '甲等'
      }, {
      	text: '乙等'
}])
const tagOrg = ref('')
const tagsOrg = ref([{
      	text: '交通部'
}])
const tagContractor = ref('')
const tagsContractor = ref([])
const tagsAutocomplete = ref([{ text: '道路工程'}, { text: '橋梁工程'}, { text: '隧道工程'}])

// ProjectForm 組件引用
const projectFormRef = ref(null)

/** 基本資料欄位顯示名稱 */
const BASIC_DATA_FIELD_LABELS: Record<string, string> = {
  project_name: '工程契約名稱',
  contract_number: '契約編號',
  project_location: '工程地點',
  host_agency: '主辦機關',
  supervisory_company_name: '監造公司',
  contractor_company_name: '營造公司',
  design_company: '設計公司',
  construction_period: '契約工期（天）',
  duration_type: '工期計算模式',
  current_contract_amount: '契約金額',
  project_category: '工程類別/工程屬性',
  sign_date: '訂約日期',
  start_date: '開工日期',
  completion_date: '完工日期',
  construction_confirm_date: '施工確認日期',
  construction_project_id: '工程專案編號',
  payment_method: '付款方式',
  advance_payment_ratio: '預付款比例（%）',
  retention_ratio: '保留款比例（%）',
  inspection_methods: '驗收方式',
  segmented_acceptance: '分段驗收',
  partial_acceptance: '部分驗收',
  completion_acceptance: '竣工驗收',
  signLevel: '簽核層級',
}

/** 異動後可能影響其他資料計算的欄位 */
const CALCULATION_IMPACT_FIELD_KEYS = new Set([
  'construction_period',
  'duration_type',
  'sign_date',
  'start_date',
  'completion_date',
  'construction_confirm_date',
  'current_contract_amount',
  'payment_method',
  'advance_payment_ratio',
  'retention_ratio',
])

interface BasicDataFormChange {
  key: string
  label: string
  oldDisplay: string
  newDisplay: string
  affectsCalculation: boolean
}

const showSaveConfirmModal = ref(false)
const saveConfirmChanges = ref<BasicDataFormChange[]>([])

type PendingLeaveAction =
  | { type: 'route'; next: (valid?: boolean) => void }
  | { type: 'version'; designChangeId: number | null }

const showLeaveConfirmModal = ref(false)
const leaveConfirmChanges = ref<BasicDataFormChange[]>([])
const pendingLeaveAction = ref<PendingLeaveAction | null>(null)
/** 使用者已確認離開不儲存，略過後續離開守衛 */
const skipUnsavedLeaveGuard = ref(false)

const saveConfirmHasCalculationImpact = computed(() =>
  saveConfirmChanges.value.some(c => c.affectsCalculation)
)

const leaveConfirmHasCalculationImpact = computed(() =>
  leaveConfirmChanges.value.some(c => c.affectsCalculation)
)

function hasPendingUnsavedEdits(): boolean {
  if (!isProjectAdmin.value || isEmptyState.value) return false
  if (isUpdatingFormData.value || isVersionSwitching.value) return false
  return hasUnsavedChanges.value
}

function executePendingLeaveAction(action: PendingLeaveAction) {
  if (action.type === 'route') {
    skipUnsavedLeaveGuard.value = true
    action.next()
    return
  }
  void performVersionTabSwitch(action.designChangeId)
}

/** 若有未儲存變更則開啟離開確認 Modal；回傳 true 表示已直接放行 */
function tryLeaveWithConfirm(action: PendingLeaveAction): boolean {
  const changes = computeFormChanges()
  if (changes.length === 0) {
    hasUnsavedChanges.value = false
    executePendingLeaveAction(action)
    return true
  }
  leaveConfirmChanges.value = changes
  pendingLeaveAction.value = action
  showLeaveConfirmModal.value = true
  return false
}

const confirmLeaveWithoutSave = () => {
  showLeaveConfirmModal.value = false
  const action = pendingLeaveAction.value
  pendingLeaveAction.value = null
  if (action) {
    executePendingLeaveAction(action)
  }
}

const cancelLeaveConfirm = () => {
  showLeaveConfirmModal.value = false
  pendingLeaveAction.value = null
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (skipUnsavedLeaveGuard.value) return
  if (!hasPendingUnsavedEdits()) return
  if (computeFormChanges().length === 0) return
  e.preventDefault()
  e.returnValue = ''
}

/** 不納入異動比對的欄位（非表單可編輯或內部狀態） */
const BASIC_DATA_EXCLUDED_CHANGE_KEYS = new Set(['version', 'contractor_name'])

function normalizeFormValueForCompare(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'function') return ''
  if (Array.isArray(value)) return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function formatFormFieldDisplay(key: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '－'
  if (typeof value === 'function') return '－'

  if (PROJECT_FORM_DATE_FIELD_KEYS.has(key)) {
    return formatProjectFormDateDisplay(String(value))
  }
  if (key === 'duration_type') {
    if (value === 'CALENDAR_DAYS') return '日曆天'
    if (value === 'WORKING_DAYS') return '工作天'
    return String(value)
  }
  if (key === 'current_contract_amount') {
    const num = formatNumber(String(value))
    const colloquial = formatAmountColloquialChinese(value as string | number)
    return colloquial ? `${num}（${colloquial}）` : num
  }
  if (key === 'signLevel' && Array.isArray(value)) {
    const titles = value.map((i: { title?: string }) => i?.title).filter(Boolean)
    return titles.length ? titles.join('、') : '－'
  }
  if (key === 'inspection_methods' && Array.isArray(value)) {
    return value.length ? value.join('、') : '－'
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }
  if (Array.isArray(value)) {
    return value.length ? JSON.stringify(value) : '－'
  }
  return String(value)
}

function computeFormChanges(): BasicDataFormChange[] {
  const changes: BasicDataFormChange[] = []
  const original = originalFormData.value as Record<string, unknown>
  const current = formData.value as Record<string, unknown>
  const skipKeys = BASIC_DATA_EXCLUDED_CHANGE_KEYS

  for (const key of Object.keys(current)) {
    if (skipKeys.has(key)) continue
    const oldVal = original[key]
    const newVal = current[key]
    if (normalizeFormValueForCompare(oldVal) === normalizeFormValueForCompare(newVal)) continue
    changes.push({
      key,
      label: BASIC_DATA_FIELD_LABELS[key] || key,
      oldDisplay: formatFormFieldDisplay(key, oldVal),
      newDisplay: formatFormFieldDisplay(key, newVal),
      affectsCalculation: CALCULATION_IMPACT_FIELD_KEYS.has(key),
    })
  }
  return changes
}



// 監聽器
// 手動檢測變化的方法
const checkForChanges = () => {
  if (isUpdatingFormData.value) {
    return
  }
  
  const newState = JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
  if (hasUnsavedChanges.value !== newState) {
    hasUnsavedChanges.value = newState
  }
}

// 手動載入工程案資料的方法
const loadProjectData = async (project: any, forceRefresh: boolean = false) => {
  if (!project?.id) {
    return
  }

  selectedDesignChangeId.value = null

  if (project.workspaceId) {
    await workspaceStore.fetchParticipatingUnits(project.workspaceId)
  }

  const existingProject = workspaceStore.workspaceProjects.find(p => p.id === project.id)
  if (forceRefresh || !existingProject) {
    await loadCurrentProjectData(null)
  } else {
    mapProjectDataToForm(existingProject)
  }

  originalFormData.value = JSON.parse(JSON.stringify(formData.value))
  hasUnsavedChanges.value = false
}

// 切換變更設計版本 Tab
async function performVersionTabSwitch(designChangeId: number | null) {
  selectedDesignChangeId.value = designChangeId
  if (workspaceStore.currentProject) {
    isUpdatingFormData.value = true
    isVersionSwitching.value = true
    try {
      await loadCurrentProjectData(designChangeId)
      originalFormData.value = JSON.parse(JSON.stringify(formData.value))
      hasUnsavedChanges.value = false
    } finally {
      isUpdatingFormData.value = false
      isVersionSwitching.value = false
    }
  }
  if (showSupervisoryBasicModal.value) {
    void loadSupervisoryBasicPreview()
  }
}

const selectVersionTab = async (designChangeId: number | null) => {
  if (selectedDesignChangeId.value === designChangeId) return
  if (hasPendingUnsavedEdits()) {
    if (!tryLeaveWithConfirm({ type: 'version', designChangeId })) return
    return
  }
  await performVersionTabSwitch(designChangeId)
}

// 監聽當前工程案變化 - 使用更安全的方式
watch(() => workspaceStore.currentProject, async (newProject, oldProject) => {
  if (newProject && newProject.id !== oldProject?.id) {
    await loadProjectData(newProject, true) // 工程案變更時也強制刷新
  }
}, { immediate: false })


// 監聽表單數據變化，更新未儲存狀態
watch(
  formData,
  () => {
    if (isUpdatingFormData.value) return
    if (isVersionSwitching.value) return

    hasUnsavedChanges.value =
      JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
  },
  { deep: true }
)

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

onBeforeRouteLeave((_to, _from, next) => {
  if (skipUnsavedLeaveGuard.value) {
    next()
    return
  }
  if (!hasPendingUnsavedEdits()) {
    next()
    return
  }
  if (tryLeaveWithConfirm({ type: 'route', next })) {
    return
  }
  next(false)
})

function openSupervisoryBasicModal() {
  showSupervisoryBasicModal.value = true
  void loadSupervisoryBasicPreview()
}

async function loadSupervisoryBasicPreview() {
  const cid = constructionId.value
  if (!cid) return
  supervisoryBasicPreviewLoading.value = true
  try {
    const result = await contractorBasicDataApi.getSupervisoryPreview(
      cid,
      selectedDesignChangeId.value
    )
    supervisoryBasicPreviewRows.value = result.fields
    supervisoryVersionAvailable.value = result.supervisoryVersionAvailable !== false
    contractorVersionLabel.value = result.contractorVersionLabel ?? null
    resolvedSupervisoryVersionLabel.value = result.resolvedSupervisoryVersionLabel ?? null
  } catch (e) {
    console.error(e)
    supervisoryBasicPreviewRows.value = []
    supervisoryVersionAvailable.value = false
    contractorVersionLabel.value = null
    resolvedSupervisoryVersionLabel.value = null
    proxy.$toast?.error?.('無法載入監造基本資料')
  } finally {
    supervisoryBasicPreviewLoading.value = false
  }
}

function normalizeBasicPreviewDisplay(value: string): string {
  const t = (value ?? '').trim()
  return t === '—' ? '' : t
}

function isSupervisoryBasicPreviewDiff(row: SupervisoryBasicDataPreviewField): boolean {
  if (row.supervisoryDisplay === '監造無此版本' || !supervisoryVersionAvailable.value) return false
  const sup = formatBasicPreviewFieldDisplay(row.key, row.supervisoryDisplay)
  const con = formatBasicPreviewFieldDisplay(row.key, row.contractorDisplay)
  return normalizeBasicPreviewDisplay(sup) !== normalizeBasicPreviewDisplay(con)
}

async function copySupervisoryBasicToContractor() {
  const cid = constructionId.value
  if (!cid) return
  if (!window.confirm(copySupervisoryBasicConfirmText.value)) return
  isCopyingSupervisoryBasic.value = true
  try {
    await contractorBasicDataApi.copyFromSupervisory(cid, {
      contractorDesignChangeId: selectedDesignChangeId.value
    })
    showSupervisoryBasicModal.value = false
    proxy.$toast?.success?.('已複製監造基本資料')
    isUpdatingFormData.value = true
    try {
      await loadCurrentProjectData(selectedDesignChangeId.value)
      originalFormData.value = JSON.parse(JSON.stringify(formData.value))
      hasUnsavedChanges.value = false
    } finally {
      isUpdatingFormData.value = false
    }
  } catch (e: any) {
    console.error(e)
    const msg = e?.response?.data?.message ?? e?.message ?? '複製失敗'
    proxy.$toast?.error?.(msg)
  } finally {
    isCopyingSupervisoryBasic.value = false
  }
}

// 方法定義
// 載入當前工程案資料（可指定變更設計版本；null = 預設版）
const loadCurrentProjectData = async (designChangeId?: number | null) => {
  const currentProject = workspaceStore.currentProject
  if (!currentProject?.id?.trim()) {
    return
  }

  try {
    if (currentProject.workspaceId) {
      await workspaceStore.fetchParticipatingUnits(currentProject.workspaceId)
    }

  const currentViewType = viewType.value
  const viewTypeParam = (currentViewType === 'SUPERVISORY' || currentViewType === 'CONTRACTOR') ? currentViewType : undefined

  const updatedProject = await workspaceStore.fetchProjectDetail(
    currentProject.id,
    currentProject.workspaceId,
    viewTypeParam,
    designChangeId ?? selectedDesignChangeId.value
  )
    
    if (updatedProject) {
      mapProjectDataToForm(updatedProject)
      isEmptyState.value = false
    } else {
      mapProjectDataToForm(currentProject)
      isEmptyState.value = false
    }
  } catch (error: any) {
    const errorStatus = error?.response?.status
    const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || ''
    const errorCode = error?.response?.data?.code

    // 若為「該版本不存在」，切回預設版並重新載入
    if (errorMessage.includes('版本=') && errorMessage.includes('不存在')) {
      selectedDesignChangeId.value = null
      try {
        const fallback = await workspaceStore.fetchProjectDetail(
          currentProject.id,
          currentProject.workspaceId,
          (viewType.value === 'SUPERVISORY' || viewType.value === 'CONTRACTOR') ? viewType.value : undefined,
          null
        )
        if (fallback) {
          mapProjectDataToForm(fallback)
          isEmptyState.value = false
          proxy.$toast.warning('該版本資料不存在，已切回預設版')
        }
      } catch {
        proxy.$toast.error('載入預設版失敗')
      }
      return
    }
    
    // 如果是 404、401 或視角權限錯誤，顯示空狀態
    if (errorStatus === 404 || errorStatus === 401 || 
        errorCode === 401 || 
        errorMessage.includes('僅供') || 
        errorMessage.includes('視角') || 
        errorMessage.includes('監造') || 
        errorMessage.includes('營造') ||
        errorMessage.includes('不存在')) {
      console.warn('⚠️ 當前視角沒有此工程案的資料:', { errorStatus, errorMessage, errorCode })
      clearFormData()
      isEmptyState.value = true
      return
    }
    
    console.error('❌ 載入工程案資料失敗:', error)
    isEmptyState.value = false
    
    // 如果是 SUPER_ADMIN 且遇到 401/403 權限問題 (因為 API 限制非成員存取詳情)
    // 但我們已經有列表傳來的基本資料，則使用現有資料並隱藏錯誤提示
    const isSuperAdmin = authStore.user?.role === 'SUPER_ADMIN';
    const isAuthError = error.response?.status === 401 || error.response?.status === 403;
    
    if (isSuperAdmin && isAuthError && currentProject) {
        console.warn('⚠️ 管理員權限受限，使用現有緩存資料顯示表單');
        mapProjectDataToForm(currentProject);
        // 不顯示錯誤 Toast，避免干擾使用者
        return;
    }

    // 如果 API 載入失敗，至少映射現有資料
    mapProjectDataToForm(currentProject)
    proxy.$toast.error('載入工程案資料失敗')
  }
}

// 清空表單資料（用於顯示空狀態）
const clearFormData = () => {
  isUpdatingFormData.value = true
  try {
    // 重置所有表單欄位為空值
    formData.value = {
      project_name: "",
      contract_number: "",
      project_location: "",
      host_agency: "",
      supervisory_company_name: "",
      contractor_company_name: "",
      design_company: "",
      construction_period: "",
      duration_type: "WORKING_DAYS",
      current_contract_amount: "",
      project_category: "",
      sign_date: "",
      start_date: "",
      completion_date: "",
      construction_confirm_date: "",
      construction_project_id: "",
      payment_method: "",
      advance_payment_ratio: "",
      retention_ratio: "",
      inspection_methods: [],
      segmented_acceptance: false,
      partial_acceptance: false,
      completion_acceptance: false,
      // 保險已拆分為獨立頁面（多筆 + 附件/檔案夾）
      signLevel: [],
      version: 0,
    }
    originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    hasUnsavedChanges.value = false
    isEmptyState.value = false
  } finally {
    isUpdatingFormData.value = false
  }
}

// 監聽視角變化，重新載入資料
watch(() => route.path, async (newPath, oldPath) => {
  // 如果路徑包含視角前綴且路徑確實改變了，重新載入資料
  if ((newPath.includes('/supervisory/') || newPath.includes('/contractor/')) && newPath !== oldPath) {
    // 檢查是否為視角切換（路徑前綴改變）
    const isViewTypeChange = 
      (oldPath?.startsWith('/supervisory/') && newPath.startsWith('/contractor/')) ||
      (oldPath?.startsWith('/contractor/') && newPath.startsWith('/supervisory/'))
    
    if (isViewTypeChange) {
      // 視角切換時，不需要重新初始化視角（已經在 ViewTypeSwitcher 中手動設定了）
      // 直接重新載入工程案資料
      if (workspaceStore.currentProject) {
        await loadCurrentProjectData()
      }
    } else if (workspaceStore.currentProject) {
      // 同視角下子頁切換（如 /contractor/ → /contractor/basic/basic-data）：勿再 initViewType，避免覆寫營造視角
      await loadCurrentProjectData()
    }
  }
}, { immediate: false })

// 將工程案資料映射到表單
const mapProjectDataToForm = (project: any) => {
  // 設置更新標誌，防止觸發 watch 監聽器
  isUpdatingFormData.value = true
  
  try {
    
    // 一次性替換整個 formData，避免多次觸發 watchEffect
    formData.value = {
      // 工程基本資料
      project_name: project.name || '',
      contract_number: project.contractNumber || '',
      project_location: project.location || '',
      host_agency: project.hostAgency || '',
      // 新增：映射公司名稱（如果工程案中沒有，則從工作空間設定自動帶入）
      supervisory_company_name: project.supervisoryCompanyName || workspaceStore.participatingUnits.supervisoryCompany?.companyName || '',
      contractor_company_name: project.contractorCompanyName || workspaceStore.participatingUnits.contractorCompany?.companyName || '',
      design_company: project.designCompany || '',
      construction_period: project.constructionPeriod || project.workDay || '',
      duration_type: project.durationType || 'WORKING_DAYS', // 工期計算模式
      current_contract_amount: project.currentContractAmount || project.budget || '',
      // 工程類別/屬性
      project_category: project.projectCategory || '',
      // 工期起訖日期
      sign_date: project.signDate ? project.signDate.split('T')[0] : '',
      start_date: project.startDate ? project.startDate.split('T')[0] : '',
      completion_date: project.endDate ? project.endDate.split('T')[0] : '',
      construction_confirm_date: project.constructionConfirmDate ? project.constructionConfirmDate.split('T')[0] : '',
      // 工程專案編號
      construction_project_id: project.constructionProjectId || '',
      // 付款方式
      payment_method: project.paymentMethod || '',
      advance_payment_ratio: project.advancePaymentRatio || '',
      retention_ratio: project.retentionRatio || '',
      // 驗收方式
      inspection_methods: project.inspectionMethods || [],
      segmented_acceptance: project.segmentedAcceptance || false,
      partial_acceptance: project.partialAcceptance || false,
      completion_acceptance: project.completionAcceptance || false,
      // 保險已拆分為獨立頁面（多筆 + 附件/檔案夾）
      // 簽核層級
      signLevel: project.signLevel || [],
      // 映射版本號 (若無則預設 0)
      version: project.version || 0
    }
    
    // 映射審核紀錄 (假設 API 回傳結構中有 verificationLogs)
    // 若後端尚未實作，可暂時給空陣列或 Fake Data
    verificationLogs.value = project.verificationLogs || [] 

  } finally {
    // 重置更新標誌
    isUpdatingFormData.value = false
  }
}

// checkForChanges 方法已內聯到 watchEffect 中
    
    // 瀏覽器離開頁面處理
 

    // 保存表單：先驗證，再以 Modal 顯示變更內容供確認
const saveForm = async () => {
  if (!projectFormRef.value) {
    console.error('❌ 無法找到 ProjectForm 組件引用')
    proxy.$toast.error('表單組件未正確載入，請重新整理頁面')
    return
  }

  const formValidation = (projectFormRef.value as { validation: { validateAll: () => boolean } }).validation
  const isValid = formValidation.validateAll()
  if (!isValid) {
    await nextTick()
    return
  }

  const changes = computeFormChanges()
  if (changes.length === 0) {
    proxy.$toast.info('沒有需要保存的變更')
    return
  }

  saveConfirmChanges.value = changes
  showSaveConfirmModal.value = true
}

const cancelSaveConfirm = () => {
  showSaveConfirmModal.value = false
}

const confirmSaveForm = async () => {
  showSaveConfirmModal.value = false
  await handleProjectFormSubmit(JSON.parse(JSON.stringify(formData.value)))
}
    
// 處理 ProjectForm 的提交事件
const handleProjectFormSubmit = async (data: any) => {
  isSaving.value = true

  try {
    await submitFormData(data)
    originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    hasUnsavedChanges.value = false
    proxy.$toast.success('工程資料保存成功！')
  } catch (error) {
    console.error('保存失敗:', error)
    proxy.$toast.error('保存失敗，請重試！')
  } finally {
    isSaving.value = false
  }
}

    // 提交表單數據（使用真實 API）
const submitFormData = async (data?: any) => {
  const currentProject = workspaceStore.currentProject
  if (!currentProject) {
    throw new Error('沒有選擇工程案')
  }
  
  const currentWorkspace = workspaceStore.currentWorkspace
  if (!currentWorkspace) {
    throw new Error('沒有選擇工作空間')
  }
  
  // 使用表單數據或傳入的數據
  const formDataToSubmit = data || formData.value
  
  // 取得公司 ID（更新工程案時後端可不需要 companyId；若有則帶入）
  // 優先用 workspace 上的 companyId，若缺失則用登入者 companyId 作為備援
  const companyId =
    (currentWorkspace.companyId && currentWorkspace.companyId.trim().length > 0
      ? currentWorkspace.companyId.trim()
      : (authStore.user?.companyId ? String(authStore.user.companyId).trim() : '')) || undefined
  
  // 轉換為API請求格式
  const constructionRequest = transformProjectFormToConstructionRequest(formDataToSubmit, currentWorkspace.id, companyId)
  
  // 確保 Payload 包含 version
  // 如果是 formDataToSubmit 有 version 則使用，否則使用原始 version
  if ('version' in formDataToSubmit) {
    (constructionRequest as any).version = formDataToSubmit.version
  }

  // 調用更新工程案API（帶版本時後端僅更新 12 欄）
  const response = await updateConstruction(
    currentProject.id,
    constructionRequest,
    selectedDesignChangeId.value
  )
  
  // 檢查後端回傳的資料結構
  // 後端可能直接回傳完整的 Construction 物件，或包在 construction 欄位中，或只回傳 CreateConstructionResponse
  let updatedConstruction: any = null
  
  // 方式 1：後端直接回傳完整的 Construction 物件（包含 constructionId, constructionName 等欄位）
  if (response && (response as any).constructionId) {
    updatedConstruction = response
  }
  // 方式 2：後端回傳的資料包在 construction 欄位中
  else if (response && (response as any).construction) {
    updatedConstruction = (response as any).construction
  }

  // 同步 master 樂觀鎖版本，避免連續 PATCH 仍帶舊版號觸發 409
  const versionFromApi =
    typeof (updatedConstruction as any)?.version === 'number'
      ? (updatedConstruction as any).version
      : typeof (response as any)?.version === 'number'
        ? (response as any).version
        : undefined
  if (versionFromApi !== undefined) {
    isUpdatingFormData.value = true
    try {
      formData.value.version = versionFromApi
    } finally {
      isUpdatingFormData.value = false
    }
  }
  
  // 同步樂觀鎖 version；儲存後更新 workspace store 和表單資料
  if (updatedConstruction) {
      // 後端有回傳完整的工程案資料，直接使用
      
      // 將 Construction 格式轉換為 WorkspaceProject 格式
      const updatedProject: any = {
        id: updatedConstruction.constructionId || currentProject.id,
        name: updatedConstruction.constructionName || '',
        workspaceId: currentWorkspace.id,
        location: updatedConstruction.constructionLocation || '',
        budget: updatedConstruction.constructionBudget?.toString() || '',
        status: 'IN_PROGRESS' as const,
        signDate: updatedConstruction.signDate || '',
        startDate: updatedConstruction.constructionStartDate || '',
        endDate: updatedConstruction.constructionEndDate || '',
        progress: 0,
        managerName: updatedConstruction.leadOrganization || '',
        description: `${updatedConstruction.constructionType || ''} - ${updatedConstruction.budgetFrom || ''}`,
        contractNumber: updatedConstruction.contractId || '',
        hostAgency: updatedConstruction.leadOrganization || '',
        constructionPeriod: updatedConstruction.workDay?.toString() || '',
        currentContractAmount: updatedConstruction.currentContractAmount?.toString() || updatedConstruction.constructionBudget?.toString() || '',
        projectCategory: updatedConstruction.constructionType || '',
        paymentMethod: updatedConstruction.payMethod || '',
        advancePaymentRatio: updatedConstruction.prePayRatio?.toString() || '',
        retentionRatio: updatedConstruction.retainedRatio?.toString() || '',
        inspectionMethods: [
          updatedConstruction.segmentedAcceptance ? '分段驗收' : '',
          updatedConstruction.partialAcceptance ? '部分驗收' : '',
          updatedConstruction.completionAcceptance ? '竣工驗收' : ''
        ].filter(Boolean),
        constructionConfirmDate: updatedConstruction.constructionConfirmDate || '',
        constructionProjectId: updatedConstruction.constructionProjectId || '',
        supervisoryCompanyName: updatedConstruction.supervisoryCompanyName || null,
        contractorCompanyName: updatedConstruction.contractorCompanyName || null,
        designCompany: updatedConstruction.designCompany || null, // 設計公司（工程案層級的基本資料）
        segmentedAcceptance: updatedConstruction.segmentedAcceptance || false,
        partialAcceptance: updatedConstruction.partialAcceptance || false,
        completionAcceptance: updatedConstruction.completionAcceptance || false,
        signLevel: updatedConstruction.signLevel || [],
        workDay: updatedConstruction.workDay || 0,
        durationType: updatedConstruction.durationType || 'WORKING_DAYS',
        totalExtensionDays: updatedConstruction.totalExtensionDays || 0, // 累計展延天數
        totalStopDays: updatedConstruction.totalStopDays || 0, // 累計停工天數
        permission: updatedConstruction.permission || currentProject.permission, // 保留權限資訊
        version:
          typeof updatedConstruction.version === 'number'
            ? updatedConstruction.version
            : currentProject.version
      }
      
      // 更新 workspace store 中的工程案
      workspaceStore.updateProject(currentProject.id, updatedProject)
      
      // 更新當前選中的工程案（會自動選擇工作空間）
      await workspaceStore.setCurrentProject(updatedProject, false)
      
      // 手動更新表單資料
      mapProjectDataToForm(updatedProject)
    } else {
      // 後端沒有回傳完整的工程案資料，重新查詢列表
      // 清除該工作空間的工程案緩存，強制重新載入
      const cacheKey = `eip-workspace-projects-${currentWorkspace.id}`
      storage.remove(cacheKey)
      
      // 重新查詢最新的工程案資料
      await workspaceStore.getProjectsByWorkspace(currentWorkspace.id)
      
      // 獲取更新後的工程案資料
      const updatedProject = workspaceStore.workspaceProjects.find(p => p.id === currentProject.id)
      if (updatedProject) {
        // 更新 workspace store 中的工程案
        workspaceStore.updateProject(currentProject.id, updatedProject)

        // 更新當前選中的工程案（會自動選擇工作空間）
        await workspaceStore.setCurrentProject(updatedProject, false)
        
        // 手動更新表單資料
        mapProjectDataToForm(updatedProject)
      }
    }

  return response
}
    
    // 重置表單
const resetForm = async () => {
  if (hasUnsavedChanges.value) {
    const answer = window.confirm('確定要重置表單嗎？所有未保存的變更將會丟失。')
    if (!answer) {
      return
    }
  }

  isUpdatingFormData.value = true
  try {
    formData.value = JSON.parse(JSON.stringify(originalFormData.value))
    hasUnsavedChanges.value = false
    // 由 v-model 同步至 ProjectForm；勿呼叫 handleReset（會清空子表單並覆寫父層資料）
    if (projectFormRef.value) {
      (projectFormRef.value as { validation?: { clearErrors: () => void } }).validation?.clearErrors()
    }
  } finally {
    await nextTick()
    isUpdatingFormData.value = false
  }

  proxy.$toast.info('表單已重置')
}





// 生命週期
onMounted(async () => {
  // 等待工作空間初始化完成
  if (!workspaceStore.isInitialized) {
    await workspaceStore.initWorkspaces()
  }
  
  // 初始化視角
  if (workspaceStore.currentWorkspace?.id) {
    await initViewType(workspaceStore.currentWorkspace.id)
  }
  
  // 手動載入工程案資料（強制刷新，查詢最新資料）
  if (workspaceStore.currentProject) {
    await loadProjectData(workspaceStore.currentProject, true) // 傳入 true 強制刷新
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
})

 
</script>

<template>
	<PageHeader
		title="基本資料維護"
		icon="fa fa-edit"
		:breadcrumbs="[
			{ text: '表單生成與管理', href: 'javascript:;' },
			{ text: '基本資料維護', active: true }
		]"
	>
		<template #extra>
			<div v-if="!isEmptyState" class="d-flex flex-wrap align-items-center gap-2">
				<template v-if="isProjectAdmin">
					<span v-if="hasUnsavedChanges && !isSaving" class="text-warning small">
						<i class="fa fa-exclamation-circle me-1"></i>有未儲存變更
					</span>
					<span v-else-if="!hasUnsavedChanges && !isSaving" class="text-success small">
						<i class="fa fa-check me-1"></i>已儲存
					</span>
					<button
						type="button"
						class="btn btn-sm btn-outline-secondary"
						@click="resetForm"
						:disabled="isSaving"
					>
						<i class="fa fa-undo me-1"></i>
						重置
					</button>
					<button
						type="button"
						class="btn btn-sm btn-theme"
						@click="saveForm"
						:disabled="isSaving"
					>
						<i
							class="fa me-1"
							:class="{
								'fa-spin fa-spinner': isSaving,
								'fa-save': !isSaving,
							}"
						></i>
						{{ isSaving ? '處理中...' : '保存' }}
					</button>
				</template>
				<button
					v-if="isContractorView && isProjectAdmin"
					type="button"
					class="btn btn-sm btn-outline-primary"
					title="預覽監造基本資料並複製至營造"
					@click="openSupervisoryBasicModal"
				>
					<i class="fa fa-eye me-1"></i>
					監造填寫預覽
				</button>
				<DesignChangeVersionSwitcher
					:model-value="selectedDesignChangeId"
					:construction-id="constructionId || undefined"
					:source-type="isContractorView ? 'CONTRACTOR' : 'SUPERVISORY'"
					@update:model-value="selectVersionTab"
				/>
			</div>
		</template>
	</PageHeader>

	<Modal
		v-if="isContractorView"
		:show="showSupervisoryBasicModal"
		title=""
		icon=""
		size="xl"
		modal-id="contractor-basic-data-supervisory-preview"
		:hide-confirm-button="true"
		:hide-cancel-button="true"
		@update:show="showSupervisoryBasicModal = $event"
	>
		<template #header>
			<span class="fw-bold">監造填寫預覽</span>
		</template>
		<p class="text-muted small mb-2">{{ supervisoryBasicPreviewHint }}</p>
		<div
			class="alert py-2 px-3 mb-3 small mb-0"
			:class="supervisoryVersionAvailable ? 'alert-light border' : 'alert-warning'"
			role="status"
		>
			<div class="fw-semibold mb-1">複製版本對照</div>
			<div>
				<span class="text-muted">營造目前版本：</span>
				<span class="fw-semibold">{{ supervisoryVersionCopyBanner.contractor }}</span>
			</div>
			<div class="mt-1">
				<span class="text-muted">複製來源（監造）：</span>
				<span class="fw-semibold" :class="{ 'text-warning': !supervisoryVersionAvailable }">
					{{ supervisoryVersionCopyBanner.supervisory }}
				</span>
			</div>
		</div>
		<p class="text-muted small mb-2">
			<span class="d-block"><span class="text-danger fw-semibold">紅字</span>表示監造值與營造目前值不一致。</span>
		</p>
		<div v-if="supervisoryBasicPreviewLoading" class="text-center py-4 text-muted">
			<i class="fa fa-spinner fa-spin me-2"></i>載入中…
		</div>
		<div v-else class="supervisory-preview-report-card">
			<div class="supervisory-preview-report-card__body">
				<div class="table-responsive">
					<table class="table table-hover align-middle mb-0">
						<thead>
							<tr>
								<th style="width: 50px">#</th>
								<th style="min-width: 140px">欄位</th>
								<th>監造值</th>
								<th>營造目前值</th>
							</tr>
						</thead>
						<tbody>
							<tr v-if="supervisoryBasicPreviewRows.length === 0">
								<td colspan="4" class="text-center text-muted py-4">尚無可顯示欄位</td>
							</tr>
							<tr
								v-for="(row, idx) in supervisoryBasicPreviewRows"
								:key="row.key"
								:class="{ 'basic-preview-row--diff': isSupervisoryBasicPreviewDiff(row) }"
							>
								<td class="text-center text-muted">{{ idx + 1 }}</td>
								<td>
									{{ row.label }}
									<div v-if="row.displayHint" class="text-muted fw-normal mt-1" style="font-size: 0.75rem">
										{{ row.displayHint }}
									</div>
								</td>
								<td
									class="small"
									:class="isSupervisoryBasicPreviewDiff(row) ? 'text-danger fw-semibold' : ''"
								>
									{{ formatBasicPreviewFieldDisplay(row.key, row.supervisoryDisplay) }}
								</td>
								<td
									class="small"
									:class="
										isSupervisoryBasicPreviewDiff(row)
											? 'text-danger fw-semibold'
											: 'text-muted'
									"
								>
									{{ formatBasicPreviewFieldDisplay(row.key, row.contractorDisplay) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
		<template #footer>
			<button type="button" class="btn btn-outline-secondary" @click="showSupervisoryBasicModal = false">
				關閉
			</button>
			<button
				type="button"
				class="btn btn-primary"
				:disabled="isCopyingSupervisoryBasic || !constructionId || !isProjectAdmin || !supervisoryVersionAvailable"
				@click="copySupervisoryBasicToContractor"
			>
				<i v-if="isCopyingSupervisoryBasic" class="fa fa-spinner fa-spin me-1"></i>
				<i v-else class="fa fa-copy me-1"></i>
				{{ isCopyingSupervisoryBasic ? '複製中…' : copySupervisoryBasicButtonText }}
			</button>
		</template>
	</Modal>

	<Modal
		:show="showSaveConfirmModal"
		title="確認保存基本資料"
		icon="fa fa-save"
		size="lg"
		modal-id="basic-data-save-confirm"
		confirm-text="確認儲存"
		confirm-icon="fa fa-check"
		cancel-text="取消"
		:is-loading="isSaving"
		loading-text="儲存中..."
		@update:show="showSaveConfirmModal = $event"
		@confirm="confirmSaveForm"
		@hide="cancelSaveConfirm"
	>
		<p class="text-muted small mb-3">
			請確認以下變更內容。確認後才會寫入資料庫。
		</p>
		<div
			v-if="saveConfirmHasCalculationImpact"
			class="alert alert-warning py-2 px-3 small mb-3"
			role="alert"
		>
			<div class="fw-semibold mb-1">
				<i class="fa fa-exclamation-triangle me-1"></i>注意：部分異動會影響其他資料
			</div>
			<div>
				標示「影響計算」的欄位異動，可能會連動重算完工日期、變更設計版本區間、展延紀錄、人員配置級距、估驗金額及表單匯出內容，請再次確認無誤後再儲存。
			</div>
		</div>
		<div class="table-responsive">
			<table class="table table-sm table-hover align-middle mb-0">
				<thead>
					<tr>
						<th style="width: 50px">#</th>
						<th style="min-width: 140px">欄位</th>
						<th>原值</th>
						<th>新值</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(row, idx) in saveConfirmChanges" :key="row.key">
						<td class="text-center text-muted">{{ idx + 1 }}</td>
						<td>
							{{ row.label }}
							<span
								v-if="row.affectsCalculation"
								class="badge bg-warning text-dark ms-1"
								title="此欄位異動可能影響其他資料計算"
							>影響計算</span>
						</td>
						<td class="text-muted small">{{ row.oldDisplay }}</td>
						<td class="small fw-semibold text-theme">{{ row.newDisplay }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</Modal>

	<Modal
		:show="showLeaveConfirmModal"
		title="尚未儲存的變更"
		icon="fa fa-exclamation-triangle"
		size="lg"
		modal-id="basic-data-leave-confirm"
		confirm-text="離開不儲存"
		confirm-icon="fa fa-sign-out-alt"
		confirm-button-class="btn btn-warning"
		cancel-text="留在此頁"
		:backdrop="'static'"
		:keyboard="false"
		@update:show="showLeaveConfirmModal = $event"
		@confirm="confirmLeaveWithoutSave"
		@hide="cancelLeaveConfirm"
	>
		<p class="text-muted small mb-3">
			您有尚未儲存的修改。若現在離開，以下變更將會遺失。是否仍要離開？
		</p>
		<div
			v-if="leaveConfirmHasCalculationImpact"
			class="alert alert-warning py-2 px-3 small mb-3"
			role="alert"
		>
			<div class="fw-semibold mb-1">
				<i class="fa fa-exclamation-triangle me-1"></i>注意：未儲存的異動含會影響計算的欄位
			</div>
			<div>
				若離開而不儲存，這些欄位將維持修改前的值；相關報表與計算仍依已儲存資料為準。
			</div>
		</div>
		<div class="table-responsive">
			<table class="table table-sm table-hover align-middle mb-0">
				<thead>
					<tr>
						<th style="width: 50px">#</th>
						<th style="min-width: 140px">欄位</th>
						<th>原值</th>
						<th>未儲存的新值</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(row, idx) in leaveConfirmChanges" :key="row.key">
						<td class="text-center text-muted">{{ idx + 1 }}</td>
						<td>
							{{ row.label }}
							<span
								v-if="row.affectsCalculation"
								class="badge bg-warning text-dark ms-1"
								title="此欄位異動可能影響其他資料計算"
							>影響計算</span>
						</td>
						<td class="text-muted small">{{ row.oldDisplay }}</td>
						<td class="small fw-semibold text-danger">{{ row.newDisplay }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</Modal>

	<div class="row gx-4">
		<div class="col-lg-12">
			<!-- 審核紀錄顯示區塊 -->
			<Card class="mb-4" v-if="verificationLogs.length > 0">
				<CardBody>
					<VerificationLogList :logs="verificationLogs" />
				</CardBody>
			</Card>

			<!-- 空狀態提示 -->
			<Card v-if="isEmptyState" class="mb-4">
				<CardBody>
					<div class="text-center py-5">
						<i class="fa fa-inbox fa-3x text-muted mb-3"></i>
						<h5 class="text-muted mb-3">當前視角沒有此工程案的資料</h5>
						<p class="text-muted mb-4">
							<span v-if="viewType === 'CONTRACTOR'">
								營造視角目前沒有此工程案的資料。<br>
								此工程案可能尚未建立營造視角的資料，或您沒有權限查看。
							</span>
							<span v-else-if="viewType === 'SUPERVISORY'">
								監造視角目前沒有此工程案的資料。<br>
								此工程案可能尚未建立監造視角的資料，或您沒有權限查看。
							</span>
							<span v-else>
								當前視角目前沒有此工程案的資料。
							</span>
						</p>
						<p class="text-muted small">
							<i class="fa fa-info-circle me-1"></i>
							請聯繫系統管理員或切換到其他視角查看。
						</p>
					</div>
				</CardBody>
			</Card>

			<!-- 工程基本資料 -->
			<ProjectForm
				v-if="!isEmptyState"
				ref="projectFormRef"
				class="mb-4"
				v-model="formData"
				:mode="isProjectAdmin ? 'edit' : 'readonly'"
				:is-submitting="isSaving"
				:show-submit-button="false"
				:show-reset-button="false"
				:version-fields-only="selectedDesignChangeId != null"
				@submit="handleProjectFormSubmit"
			/>




			<!-- 操作按鈕（僅專案管理員可見，且有資料時顯示） -->
			<div v-if="!isEmptyState && isProjectAdmin" class="d-flex justify-content-end gap-2 align-items-center">
                <span v-if="hasUnsavedChanges && !isSaving" class="text-warning small me-2">
                    <i class="fa fa-exclamation-circle me-1"></i>有未儲存變更
                </span>
                <span v-else-if="!hasUnsavedChanges && !isSaving" class="text-success small me-2">
                    <i class="fa fa-check me-1"></i>已儲存
                </span>
				<button
					type="button"
					class="btn btn-outline-secondary"
					@click="resetForm"
					:disabled="isSaving"
				>
					<i class="fa fa-undo me-1"></i>
					重置
				</button>
				<button
					type="button"
					class="btn btn-theme"
					@click="saveForm"
					:disabled="isSaving"
				>
					<i
						class="fa me-1"
						:class="{
							'fa-spin fa-spinner': isSaving,
							'fa-save': !isSaving,
						}"
					></i>
					{{ isSaving ? '處理中...' : '保存' }}
				</button>
			</div>
			
			<!-- 非管理員提示 -->
			<div v-if="!isEmptyState && !isProjectAdmin" class="d-flex justify-content-end">
				<div class="alert alert-info mb-0" role="alert">
					<i class="fa fa-info-circle me-2"></i>
					<span>您目前是檢視者權限，無法編輯工程案資料。如需修改，請聯繫專案管理員。</span>
				</div>
			</div>

		</div>
	</div>
</template>

<style scoped>
.form-control:focus,
.form-select:focus {
  border-color: var(--bs-theme);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-theme-rgb), 0.25);
}

.supervisory-preview-report-card {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  color: var(--bs-body-color);
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.375rem;
  overflow: hidden;
}

.supervisory-preview-report-card__body {
  padding: 0;
}

.contractor-supervisory-modal-title {
  font-size: 1.1rem;
  line-height: 1.3;
}

.basic-preview-row--diff {
  background-color: rgba(220, 53, 69, 0.08);
}
</style>