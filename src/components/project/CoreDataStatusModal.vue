<template>
  <Modal
    :show="show"
    @update:show="emit('update:show', $event)"
    modal-id="core-data-status-modal"
    title="核心資料填寫狀況"
    icon="fa fa-clipboard-check"
    size="xxl"
    :hide-footer="true"
  >
    <template #body>
      <div class="core-data-status-modal">
        <!-- 401 時不觸發全域跳轉，改在 Modal 內提示 -->
        <div v-if="authExpired" class="alert alert-warning text-center py-4">
          <p class="mb-3"><i class="fa fa-exclamation-triangle me-2"></i>登入已過期，請重新登入後再檢視核心資料填寫狀況。</p>
          <button type="button" class="btn btn-primary" @click="goToLoginAndClose">前往登入</button>
        </div>
        <template v-else-if="needLogin">
          <div class="alert alert-secondary text-center py-4">
            <i class="fa fa-info-circle me-2"></i>請先登入以檢視核心資料填寫狀況。
          </div>
        </template>
        <template v-else>
        <div class="alert alert-info mb-3">
          <i class="fa fa-info-circle me-2"></i>
          這些頁面維護的是系統中的核心資料，會被匯出報表、表單與多個功能重複使用，建議先填寫完整再進行後續作業。
        </div>

        <div class="mb-4">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <h5 class="mb-0">
              <i class="fa fa-clipboard-check me-2"></i>目前資料填寫狀況
            </h5>
            <DesignChangeVersionSwitcher
              v-if="hasCurrentProject"
              :model-value="selectedDesignChangeId"
              @update:model-value="onVersionChange"
            />
          </div>

          <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
            <i class="fa fa-exclamation-triangle me-2"></i>
            請先選擇工程案，才能顯示目前資料填寫狀況。
          </div>

          <div v-else class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div class="text-muted small">
                  完成度：<strong>{{ passedCount }}</strong>/{{ totalRequired }}
                  <span v-if="showDocClassificationCard && docClassificationCount !== null" class="ms-2">
                    ・文件分類：<strong>{{ docClassificationCount }}</strong> 項
                  </span>
                </div>
                <div>
                  <span
                    class="badge"
                    :class="allPassed ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'"
                  >
                    <i :class="allPassed ? 'fa fa-check-circle me-1' : 'fa fa-exclamation-circle me-1'"></i>
                    {{ allPassed ? '核心資料已填寫完成' : '尚有核心資料未完成' }}
                  </span>
                </div>
              </div>

              <div class="progress mt-2" style="height: 10px;">
                <div
                  class="progress-bar"
                  role="progressbar"
                  :style="{ width: progressPercent + '%' }"
                  :class="progressPercent === 100 ? 'bg-success' : 'bg-primary'"
                  :aria-valuenow="progressPercent"
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>

              <div v-if="statusError" class="alert alert-danger mt-3 mb-0">
                <i class="fa fa-exclamation-circle me-2"></i>{{ statusError }}
              </div>
              <div v-else-if="!status && !statusLoading" class="alert alert-secondary mt-3 mb-0">
                <i class="fa fa-info-circle me-2"></i>尚未取得檢核結果。
              </div>
            </div>
          </div>
        </div>

        <div class="mb-0">
          <div class="row g-3">
            <!-- 基本資料 -->
            <div class="col-md-4">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-primary text-white">
                        <i class="fa fa-building"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <div class="d-flex align-items-center justify-content-between gap-2">
                        <h6 class="mb-2 fw-bold">基本資料</h6>
                        <span class="badge" :class="getCheckBadgeClass(checkBasicData?.passed)">
                          <i :class="getCheckBadgeIcon(checkBasicData?.passed) + ' me-1'"></i>
                          {{ getCheckBadgeText(checkBasicData?.passed) }}
                        </span>
                      </div>
                      <p class="small text-muted mb-2">
                        工程名稱、工程地點、主辦機關、監造公司、營造公司、設計公司、契約工期等
                      </p>
                      <div v-if="checkBasicData && !checkBasicData.passed && (checkBasicData.details?.length || 0) > 0" class="small text-danger mb-2">
                        <div class="fw-bold mb-1">缺漏：</div>
                        <ul class="mb-0 ps-3">
                          <li v-for="(d, idx) in (checkBasicData.details || []).slice(0, 3)" :key="idx">{{ d }}</li>
                        </ul>
                        <div v-if="(checkBasicData.details || []).length > 3" class="text-muted mt-1">…還有 {{ (checkBasicData.details || []).length - 3 }} 項</div>
                      </div>
                      <RouterLink 
                        to="/basic/basic-data" 
                        class="btn btn-sm btn-outline-primary"
                        @click="closeAfterNavigate"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </RouterLink>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 施工項目維護（監造顯示，營造不顯示） -->
            <div v-if="!isContractor" class="col-md-4">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-success text-white">
                        <i class="fa fa-tools"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <div class="d-flex align-items-center justify-content-between gap-2">
                        <h6 class="mb-2 fw-bold">施工項目維護</h6>
                        <span class="badge" :class="getCheckBadgeClass(checkMajorItems?.passed)">
                          <i :class="getCheckBadgeIcon(checkMajorItems?.passed) + ' me-1'"></i>
                          {{ getCheckBadgeText(checkMajorItems?.passed) }}
                        </span>
                      </div>
                      <p class="small text-muted mb-2">
                        施工大項列表及其抽查標準明細
                      </p>
                      <div v-if="checkMajorItems && !checkMajorItems.passed && (checkMajorItems.details?.length || 0) > 0" class="small text-danger mb-2">
                        <div class="fw-bold mb-1">缺漏：</div>
                        <ul class="mb-0 ps-3">
                          <li v-for="(d, idx) in (checkMajorItems.details || []).slice(0, 3)" :key="idx">{{ d }}</li>
                        </ul>
                        <div v-if="(checkMajorItems.details || []).length > 3" class="text-muted mt-1">…還有 {{ (checkMajorItems.details || []).length - 3 }} 項</div>
                      </div>
                      <RouterLink 
                        to="/forms/b-construction-maintenance" 
                        class="btn btn-sm btn-outline-success"
                        @click="closeAfterNavigate"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </RouterLink>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 工地人員 -->
            <div class="col-md-4">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-warning text-white">
                        <i class="fa fa-users"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <div class="d-flex align-items-center justify-content-between gap-2">
                        <h6 class="mb-2 fw-bold">工地人員</h6>
                        <span class="badge" :class="getCheckBadgeClass(sitePersonnelVersionPassed)">
                          <i :class="getCheckBadgeIcon(sitePersonnelVersionPassed) + ' me-1'"></i>
                          {{ getCheckBadgeText(sitePersonnelVersionPassed) }}
                        </span>
                      </div>
                      <p class="small text-muted mb-2">
                        負責人、工地負責人、專任工程人員、品管人員、勞安人員、行政人員、現場工程師／現場施工人員數量統計
                      </p>
                      <div v-if="sitePersonnelVersionError" class="small text-danger mb-2">
                        <i class="fa fa-exclamation-circle me-1"></i>{{ sitePersonnelVersionError }}
                      </div>
                      <div v-else-if="sitePersonnelSelectedResult && sitePersonnelSelectedResult.missingRoles.length > 0" class="small text-danger mb-2">
                        <div class="fw-bold mb-1">缺漏（依版本區間）：</div>
                        <ul class="mb-0 ps-3">
                          <li v-for="g in sitePersonnelSelectedResult.gaps" :key="g.role">
                            <strong>{{ g.roleName }}</strong>：
                            <span v-for="(p, i) in g.periods.slice(0, 2)" :key="i">
                              {{ formatRepublicDate(p.start) }}～{{ formatRepublicDate(p.end) }}<span v-if="i < Math.min(g.periods.length, 2) - 1">、</span>
                            </span>
                            <span v-if="g.periods.length > 2" class="text-muted">…等</span>
                          </li>
                        </ul>
                      </div>
                      <RouterLink 
                        to="/basic/site-personnel" 
                        class="btn btn-sm btn-outline-warning"
                        @click="closeAfterNavigate"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </RouterLink>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 工程項目標單 -->
            <div class="col-md-4">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-info text-white">
                        <i class="fa fa-database"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <div class="d-flex align-items-center justify-content-between gap-2">
                        <h6 class="mb-2 fw-bold">工程項目標單</h6>
                        <span class="badge" :class="getCheckBadgeClass(checkProjectItemDatabase?.passed)">
                          <i :class="getCheckBadgeIcon(checkProjectItemDatabase?.passed) + ' me-1'"></i>
                          {{ getCheckBadgeText(checkProjectItemDatabase?.passed) }}
                        </span>
                      </div>
                      <p class="small text-muted mb-2">
                        PCCES 工項資料
                      </p>
                      <div v-if="checkProjectItemDatabase && !checkProjectItemDatabase.passed && (checkProjectItemDatabase.details?.length || 0) > 0" class="small text-danger mb-2">
                        <div class="fw-bold mb-1">缺漏：</div>
                        <ul class="mb-0 ps-3">
                          <li v-for="(d, idx) in (checkProjectItemDatabase.details || []).slice(0, 3)" :key="idx">{{ d }}</li>
                        </ul>
                        <div v-if="(checkProjectItemDatabase.details || []).length > 3" class="text-muted mt-1">…還有 {{ (checkProjectItemDatabase.details || []).length - 3 }} 項</div>
                      </div>
                      <RouterLink 
                        to="/basic/project-item-database" 
                        class="btn btn-sm btn-outline-info"
                        @click="closeAfterNavigate"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </RouterLink>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 標單材料設定（監造顯示，營造不顯示） -->
            <div v-if="!isContractor" class="col-md-4">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-danger text-white">
                        <i class="fa fa-box"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <div class="d-flex align-items-center justify-content-between gap-2">
                        <h6 class="mb-2 fw-bold">標單材料設定</h6>
                        <span class="badge" :class="getCheckBadgeClass(checkTenderMaterialQualityControl?.passed)">
                          <i :class="getCheckBadgeIcon(checkTenderMaterialQualityControl?.passed) + ' me-1'"></i>
                          {{ getCheckBadgeText(checkTenderMaterialQualityControl?.passed) }}
                        </span>
                      </div>
                      <p class="small text-muted mb-2">
                        材料詳細設定及材料抽查標準
                      </p>
                      <div v-if="checkTenderMaterialQualityControl && !checkTenderMaterialQualityControl.passed && (checkTenderMaterialQualityControl.details?.length || 0) > 0" class="small text-danger mb-2">
                        <div class="fw-bold mb-1">缺漏：</div>
                        <ul class="mb-0 ps-3">
                          <li v-for="(d, idx) in (checkTenderMaterialQualityControl.details || []).slice(0, 3)" :key="idx">{{ d }}</li>
                        </ul>
                        <div v-if="(checkTenderMaterialQualityControl.details || []).length > 3" class="text-muted mt-1">…還有 {{ (checkTenderMaterialQualityControl.details || []).length - 3 }} 項</div>
                      </div>
                      <RouterLink 
                        to="/forms/tender-material-settings" 
                        class="btn btn-sm btn-outline-danger"
                        @click="closeAfterNavigate"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </RouterLink>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 文件檔案分類表（僅業主/PCM/共用顯示，監造與營造皆不顯示） -->
            <div v-if="showDocClassificationCard" class="col-md-4">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-secondary text-white">
                        <i class="fa fa-folder"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <div class="d-flex align-items-center justify-content-between gap-2">
                        <h6 class="mb-2 fw-bold">文件檔案分類表</h6>
                        <span class="badge" :class="getDocBadgeClass">
                          <i :class="getDocBadgeIcon + ' me-1'"></i>
                          {{ getDocBadgeText }}
                        </span>
                      </div>
                      <p class="small text-muted mb-2">
                        文件分類項目
                      </p>
                      <div v-if="docClassificationCount !== null" class="small text-muted mb-2">
                        目前共有 <strong>{{ docClassificationCount }}</strong> 項
                      </div>
                      <RouterLink 
                        to="/forms/document-classification" 
                        class="btn btn-sm btn-outline-secondary"
                        @click="closeAfterNavigate"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </RouterLink>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
        </template>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import { storage, StorageKeys } from '@/utils/storage'
import Modal from '@/components/bootstrap/Modal.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import { documentClassificationApi } from '@/api/documentClassification'
import { getPlanSubmissions } from '@/api/planSubmission'
import { onboardingApi, type SupervisoryOnboardingStatus } from '@/api/onboarding'
import { getDesignChangeList, getContractAmountsByVersion, type VersionContractAmount, type DesignChangeItem } from '@/api/designChange'
import { sitePersonnelApi, type SitePersonnel } from '@/api/sitePersonnel'
import { computeVersionPersonnelConfig, type PersonWithAssignments } from '@/composables/useVersionPersonnelConfig'
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const { viewType, isSupervisory, isContractor } = useViewPerspective()

/** 請求時帶此 config，401 時由 Modal 處理、不觸發全域登出跳轉；並可帶入剛讀取的 token 避免漏帶 */
function getAuthRequestConfig() {
  const token = storage.get<string>(StorageKeys.AUTH_TOKEN)
  return {
    skipAuthRedirectOn401: true as const,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {})
  }
}

const authExpired = ref(false)
const needLogin = ref(false)

const hasCurrentProject = computed(() => !!workspaceStore.currentProject?.id)
const selectedDesignChangeId = ref<number | null>(null)

// B-1 工地人員（依版本區間）檢核：與「專案工地人員管理」完全一致
const designChangeListForIntervals = ref<DesignChangeItem[]>([])
const versionAmounts = ref<VersionContractAmount[]>([])
const companyPersonnel = ref<SitePersonnel[]>([])
const sitePersonnelVersionError = ref<string | null>(null)

/** 監造：每個版本固定 負責人、工地負責人、專任工程人員、品管、勞安 各 1 */
const SUPERVISORY_FIXED_REQUIRED = {
  OWNER: 1,
  CONSTRUCTION_MANAGER: 1,
  TECHNICIAN: 1,
  QUALITY: 1,
  LABOUR_SAFETY: 1
} as const

const sitePersonnelConfig = computed(() => {
  const cid = workspaceStore.currentProject?.id
  if (!cid || versionAmounts.value.length === 0) return { dataComplete: false as const, versions: [] }
  return computeVersionPersonnelConfig({
    versionAmounts: versionAmounts.value,
    designChangeList: designChangeListForIntervals.value,
    assignedPersonnel: companyPersonnel.value as unknown as PersonWithAssignments[],
    constructionId: cid,
    projectStartDate: workspaceStore.currentProject?.signDate ?? null,
    projectEndDate: workspaceStore.currentProject?.endDate ?? null,
    fixedRequired: SUPERVISORY_FIXED_REQUIRED
  })
})

const sitePersonnelSelectedResult = computed(() => {
  const id = selectedDesignChangeId.value
  const list = sitePersonnelConfig.value.versions
  return list.find(v => v.versionId === id) ?? null
})

const sitePersonnelVersionPassed = computed(() => {
  if (sitePersonnelVersionError.value) return false
  const res = sitePersonnelSelectedResult.value
  if (!res) return undefined
  return res.missingRoles.length === 0
})

const statusLoading = ref(false)
const statusError = ref<string | null>(null)
const docClassificationCount = ref<number | null>(null)
const submissionCount = ref<number | null>(null)

const statusData = ref<SupervisoryOnboardingStatus | null>(null)
const status = computed(() => statusData.value)
const checkBasicData = computed(() => status.value?.checks?.basicData)
const checkMajorItems = computed(() => status.value?.checks?.majorItems)
const checkProjectItemDatabase = computed(() => status.value?.checks?.projectItemDatabase)
const checkTenderMaterialQualityControl = computed(() => status.value?.checks?.tenderMaterialQualityControl)

function formatRepublicDate(v?: string | null): string {
  if (!v) return ''
  const iso = v.split('T')[0]
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear() - 1911
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}年${mm}月${dd}日`
}

/** 依視角：營造只檢核 3 項，監造/其他 5 項（不包含文件檔案分類表） */
const totalRequired = computed(() => (isContractor.value ? 3 : 5))

const passedCount = computed(() => {
  const s = status.value
  if (!s?.checks) return 0
  if (isContractor.value) {
    return [
      !!s.checks.basicData?.passed,
      !!s.checks.sitePersonnel?.passed,
      !!s.checks.projectItemDatabase?.passed
    ].filter(Boolean).length
  }
  return [
    !!s.checks.basicData?.passed,
    !!s.checks.sitePersonnel?.passed,
    !!s.checks.majorItems?.passed,
    !!s.checks.projectItemDatabase?.passed,
    !!s.checks.tenderMaterialQualityControl?.passed
  ].filter(Boolean).length
})
const progressPercent = computed(() => Math.round((passedCount.value / totalRequired.value) * 100))
const allPassed = computed(() => passedCount.value === totalRequired.value)

/** 僅業主/PCM/共用顯示文件檔案分類表（監造、營造皆不顯示） */
const showDocClassificationCard = computed(() => !isSupervisory.value && !isContractor.value)

const getCheckBadgeClass = (passed?: boolean) => {
  if (statusLoading.value && passed === undefined) return 'bg-secondary-subtle text-secondary border border-secondary-subtle'
  if (passed === true) return 'bg-success-subtle text-success border border-success-subtle'
  if (passed === false) return 'bg-danger-subtle text-danger border border-danger-subtle'
  return 'bg-secondary-subtle text-secondary border border-secondary-subtle'
}
const getCheckBadgeIcon = (passed?: boolean) => {
  if (statusLoading.value && passed === undefined) return 'fa fa-spinner fa-spin'
  if (passed === true) return 'fa fa-check-circle'
  if (passed === false) return 'fa fa-exclamation-circle'
  return 'fa fa-minus-circle'
}
const getCheckBadgeText = (passed?: boolean) => {
  if (statusLoading.value && passed === undefined) return '檢查中'
  if (passed === true) return '已完成'
  if (passed === false) return '未完成'
  return '未檢查'
}

const getDocBadgeClass = computed(() => {
  if (statusLoading.value && docClassificationCount.value === null) return 'bg-secondary-subtle text-secondary border border-secondary-subtle'
  if (docClassificationCount.value === null) return 'bg-secondary-subtle text-secondary border border-secondary-subtle'
  if (docClassificationCount.value > 0) return 'bg-success-subtle text-success border border-success-subtle'
  return 'bg-danger-subtle text-danger border border-danger-subtle'
})
const getDocBadgeIcon = computed(() => {
  if (statusLoading.value && docClassificationCount.value === null) return 'fa fa-spinner fa-spin'
  if (docClassificationCount.value === null) return 'fa fa-minus-circle'
  if (docClassificationCount.value > 0) return 'fa fa-check-circle'
  return 'fa fa-exclamation-circle'
})
const getDocBadgeText = computed(() => {
  if (statusLoading.value && docClassificationCount.value === null) return '檢查中'
  if (docClassificationCount.value === null) return '未檢查'
  if (docClassificationCount.value > 0) return '已設定'
  return '未設定'
})

const refreshStatus = async () => {
  const constructionId = workspaceStore.currentProject?.id
  statusError.value = null
  docClassificationCount.value = null
  submissionCount.value = null
  authExpired.value = false
  if (!constructionId) return

  // 開啟時立即讀取 token 並帶入每次請求，避免攔截器與非同步時序導致漏帶
  const token = storage.get<string>(StorageKeys.AUTH_TOKEN)
  if (!token) {
    needLogin.value = true
    return
  }
  const authConfig = getAuthRequestConfig()

  try {
    statusLoading.value = true
    statusData.value = await onboardingApi.getStatus(constructionId, selectedDesignChangeId.value, authConfig)
  } catch (e: any) {
    if (e?.response?.status === 401) {
      authExpired.value = true
      return
    }
    console.error('取得開通檢核狀態失敗', e)
    statusError.value = e?.response?.data?.message || e?.message || '取得檢核狀態失敗'
  } finally {
    statusLoading.value = false
  }

  // 工地人員檢核所需資料（版本區間 + 任職紀錄）
  sitePersonnelVersionError.value = null
  try {
    const companyId = authStore.user?.companyId
    if (!companyId) {
      sitePersonnelVersionError.value = '缺少公司資訊，無法檢核工地人員'
    } else {
      const sourceType = viewType.value ?? ViewType.SUPERVISORY
      const [dcList, amounts, personnel] = await Promise.all([
        getDesignChangeList(constructionId, sourceType, authConfig),
        getContractAmountsByVersion(constructionId, sourceType, authConfig),
        sitePersonnelApi.getList(companyId, authConfig)
      ])
      designChangeListForIntervals.value = dcList
      versionAmounts.value = amounts
      companyPersonnel.value = personnel
    }
  } catch (e: any) {
    if (e?.response?.status === 401) {
      authExpired.value = true
      return
    }
    console.warn('載入工地人員檢核資料失敗', e)
    sitePersonnelVersionError.value = '資料不完整無法提供'
  }

  if (showDocClassificationCard.value) {
    try {
      const items = await documentClassificationApi.getAll(constructionId, authConfig)
      docClassificationCount.value = Array.isArray(items) ? items.length : 0
    } catch (e: any) {
      if (e?.response?.status === 401) {
        authExpired.value = true
        return
      }
      console.warn('取得文件分類統計失敗', e)
      docClassificationCount.value = null
    }
  }

  // 送審紀錄（不影響核心完成度）
  try {
    const records = await getPlanSubmissions(constructionId, authConfig)
    submissionCount.value = Array.isArray(records) ? records.length : 0
  } catch (e: any) {
    if (e?.response?.status === 401) {
      authExpired.value = true
      return
    }
    console.warn('取得送審紀錄統計失敗', e)
    submissionCount.value = null
  }
}

const goToLoginAndClose = () => {
  emit('update:show', false)
  router.push('/page/login').catch(() => {})
}

const onVersionChange = async (id: number | null) => {
  selectedDesignChangeId.value = id
  await refreshStatus()
}

const closeAfterNavigate = () => {
  emit('update:show', false)
}

onMounted(async () => {
  if (!props.show) return
  const hasToken = !!storage.get<string>(StorageKeys.AUTH_TOKEN)
  if (!hasToken) {
    needLogin.value = true
    return
  }
  needLogin.value = false
  if (hasCurrentProject.value) {
    await refreshStatus()
  }
})

watch(
  () => workspaceStore.currentProject?.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId && props.show) {
      await refreshStatus()
    }
  }
)

watch(
  () => props.show,
  async (val) => {
    if (!val) {
      authExpired.value = false
      needLogin.value = false
      return
    }
    const hasToken = !!storage.get<string>(StorageKeys.AUTH_TOKEN)
    if (!hasToken) {
      needLogin.value = true
      return
    }
    needLogin.value = false
    if (hasCurrentProject.value) {
      await refreshStatus()
    }
  }
)
</script>

<style scoped>
.core-data-status-modal {
  padding: 0.5rem 0.25rem;
}

.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}
</style>

