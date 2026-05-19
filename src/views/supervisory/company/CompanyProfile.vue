<script setup lang="ts">
import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import { supervisionCompanyProfileApi, type SupervisionCompanyProfileData } from '@/api/supervisionCompanyProfile'
import { formatAmountColloquialChinese, formatNumber, toRepublicYear } from '@/utils/format'

const { proxy } = getCurrentInstance() as any
const workspaceStore = useWorkspaceStore()

const hasCurrentProject = computed(() => !!workspaceStore.currentProject?.id)
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const workspaceId = computed(() => workspaceStore.currentWorkspace?.id ?? '')

const isLoading = ref(false)
const isSaving = ref(false)
const isAutoSaving = ref(false)
const hasUnsavedChanges = ref(false)
const hasLoaded = ref(false)
const isUpdatingFormData = ref(false)
const isInitialLoadSettled = ref(false)
const isSavingInProgress = ref(false)

const calculatedEndDate = ref<string>('')
const isCalculatingEndDate = ref(false)

const formData = ref<SupervisionCompanyProfileData>({
  constructionName: '',
  contractNumber: '',
  constructionLocation: '',
  constructionType: '',
  signDate: '',
  constructionStartDate: '',
  constructionEndDate: '',
  workDay: null,
  durationType: 'WORKING_DAYS',
  supervisoryBudget: '',
  payMethod: '',
  prePayRatio: null,
  retainedRatio: null,
  signLevel: [{ level: 1, title: '' }]
})
const originalFormData = ref<SupervisionCompanyProfileData>({})

const loadProfile = async () => {
  if (!constructionId.value) return

  isLoading.value = true
  isInitialLoadSettled.value = false
  try {
    const data = await supervisionCompanyProfileApi.getProfile(constructionId.value, workspaceId.value || undefined)
    isUpdatingFormData.value = true

    const signLevelData = data.signLevel
      ? (typeof data.signLevel === 'string' ? JSON.parse(data.signLevel) : data.signLevel)
      : [{ level: 1, title: '' }]

    formData.value = {
      ...data,
      constructionId: constructionId.value,
      signDate: data.signDate?.split('T')[0] || '',
      constructionStartDate: data.constructionStartDate?.split('T')[0] || '',
      constructionEndDate: data.constructionEndDate?.split('T')[0] || '',
      signLevel: signLevelData.length > 0 ? signLevelData : [{ level: 1, title: '' }]
    }

    if (formData.value.constructionEndDate) {
      calculatedEndDate.value = formData.value.constructionEndDate
    }

    originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    hasUnsavedChanges.value = false
    hasLoaded.value = true
  } catch (error) {
    console.error('載入監造公司資料失敗:', error)
    formData.value = { constructionId: constructionId.value }
    originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    hasLoaded.value = true
  } finally {
    isLoading.value = false
    isUpdatingFormData.value = false
    setTimeout(() => {
      isInitialLoadSettled.value = true
    }, 1000)
  }
}

const calculateCompletionDate = async () => {
  const startDate = formData.value.constructionStartDate
  const period = formData.value.workDay
  const cId = constructionId.value

  if (!startDate || !period || period <= 0 || !cId) return

  isCalculatingEndDate.value = true
  try {
    const { calculateEndDate } = await import('@/api/construction')
    const durationType = (formData.value.durationType as 'CALENDAR_DAYS' | 'WORKING_DAYS') || 'WORKING_DAYS'
    const result = await calculateEndDate(cId, startDate, period, durationType, 'SUPERVISION_COMPANY')
    const returnedDate = result?.completionDate || (result as any)?.endDate
    if (returnedDate) {
      const endDate = returnedDate.split('T')[0]
      calculatedEndDate.value = endDate
      formData.value.constructionEndDate = endDate
    }
  } catch (error) {
    console.error('計算完工日期失敗:', error)
  } finally {
    isCalculatingEndDate.value = false
  }
}

watch(
  () => [formData.value.constructionStartDate, formData.value.workDay, formData.value.durationType],
  () => {
    if (isInitialLoadSettled.value) {
      calculateCompletionDate()
    }
  },
  { immediate: false }
)

const formatCompletionDateToRepublic = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    const year = date.getFullYear()
    const republicYear = toRepublicYear(year)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `民國${republicYear}年${month}月${day}日`
  } catch {
    return dateString
  }
}

const formattedCompletionDate = computed(() => {
  const dateValue = calculatedEndDate.value || formData.value.constructionEndDate
  return formatCompletionDateToRepublic(dateValue)
})

const formattedSupervisoryBudget = computed({
  get: () => {
    const value = formData.value.supervisoryBudget
    if (!value || value === '') return ''
    const numericValue = value.toString().replace(/[^\d]/g, '')
    if (!numericValue) return ''
    return formatNumber(numericValue)
  },
  set: (value: string) => {
    formData.value.supervisoryBudget = value.replace(/[^\d]/g, '')
  }
})

const supervisoryBudgetColloquialText = computed(() =>
  formatAmountColloquialChinese(formData.value.supervisoryBudget)
)

watch(formData, async () => {
  if (isUpdatingFormData.value || !isInitialLoadSettled.value) return
  const changed = JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
  if (changed !== hasUnsavedChanges.value) {
    hasUnsavedChanges.value = changed
  }
  if (changed && !isSavingInProgress.value) {
    isSavingInProgress.value = true
    isAutoSaving.value = true
    try {
      await doSave(true)
    } finally {
      isAutoSaving.value = false
      isSavingInProgress.value = false
    }
  }
}, { deep: true })

watch(() => workspaceStore.currentProject?.id, (newId, oldId) => {
  if (newId && newId !== oldId) loadProfile()
})

const doSave = async (silent: boolean = false) => {
  if (!constructionId.value) return

  if (!silent) isSaving.value = true

  try {
    const payload: SupervisionCompanyProfileData = { ...formData.value, constructionId: constructionId.value }
    await supervisionCompanyProfileApi.saveProfile(payload, workspaceId.value || undefined)

    isUpdatingFormData.value = true
    originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    hasUnsavedChanges.value = false
    isUpdatingFormData.value = false

    if (!silent) {
      proxy.$toast.success('監造公司資料儲存成功')
    }
  } catch (error) {
    console.error('儲存失敗:', error)
    if (!silent) proxy.$toast.error('儲存失敗，請重試')
  } finally {
    if (!silent) isSaving.value = false
  }
}

const addSignLevel = () => {
  if (!formData.value.signLevel) formData.value.signLevel = []
  const nextLevel = formData.value.signLevel.length > 0
    ? Math.max(...formData.value.signLevel.map((s: any) => s.level)) + 1
    : 1
  formData.value.signLevel.push({ level: nextLevel, title: '' })
}

const removeSignLevel = (index: number) => {
  if (!formData.value.signLevel || formData.value.signLevel.length <= 1) return
  formData.value.signLevel.splice(index, 1)
  formData.value.signLevel.forEach((item: any, i: number) => {
    item.level = i + 1
  })
}

const saveForm = () => doSave(false)

const resetForm = () => {
  if (!hasUnsavedChanges.value) return
  const confirmed = window.confirm('確定要重置表單嗎？未儲存的變更將會遺失。')
  if (!confirmed) return
  isUpdatingFormData.value = true
  formData.value = JSON.parse(JSON.stringify(originalFormData.value))
  hasUnsavedChanges.value = false
  isUpdatingFormData.value = false
  proxy.$toast.info('表單已重置')
}

onMounted(async () => {
  if (hasCurrentProject.value) await loadProfile()
})
</script>

<template>
  <PageHeader
    title="監造公司基本資料"
    icon="bi bi-building"
    :breadcrumbs="[
      { text: '監造核心資料', href: 'javascript:;' },
      { text: '公司基本資料', active: true }
    ]"
  />

  <div class="row gx-4">
    <div class="col-lg-12">
      <!-- 未選擇工程案 -->
      <Card v-if="!hasCurrentProject" class="mb-4">
        <CardBody>
          <div class="text-center py-5 text-muted">
            <i class="bi bi-building fa-3x mb-3 d-block"></i>
            <h5>請先選擇工程案</h5>
            <p>選擇工程案後，即可維護該案的監造公司基本資料。</p>
          </div>
        </CardBody>
      </Card>

      <!-- 載入中 -->
      <Card v-else-if="isLoading" class="mb-4">
        <CardBody>
          <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">載入中...</span>
            </div>
            <p class="text-muted">載入監造公司資料中...</p>
          </div>
        </CardBody>
      </Card>

      <!-- 表單內容 -->
      <div v-else class="project-form">
        <!-- 工程基本資訊 -->
        <h6 class="fw-bold text-theme mb-3">
          <i class="fa fa-info-circle me-2"></i>工程基本資訊
        </h6>
        <div class="row g-3 mb-3">
          <div class="col-lg-4 col-md-6 col-12">
            <label class="form-label">工程契約名稱</label>
            <input
              type="text"
              class="form-control"
              v-model="formData.constructionName"
              placeholder="請輸入工程契約名稱"
              :disabled="isSaving"
            />
          </div>
          <div class="col-lg-4 col-md-6 col-12">
            <label class="form-label">契約編號</label>
            <input
              type="text"
              class="form-control"
              v-model="formData.contractNumber"
              placeholder="請輸入契約編號"
              :disabled="isSaving"
            />
          </div>
          <div class="col-lg-4 col-md-12 col-12">
            <label class="form-label">工程類別/工程屬性</label>
            <select
              class="form-select"
              v-model="formData.constructionType"
              :disabled="isSaving"
            >
              <option value="">-- 請選擇工程類別 --</option>
              <option value="建築工程">建築工程</option>
              <option value="土木工程">土木工程</option>
              <option value="水利工程">水利工程</option>
              <option value="機電工程">機電工程</option>
            </select>
          </div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-12">
            <label class="form-label">工程地點</label>
            <input
              type="text"
              class="form-control"
              v-model="formData.constructionLocation"
              placeholder="請輸入工程地點"
              :disabled="isSaving"
            />
          </div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label">訂約日期</label>
            <RepublicDatePicker
              v-model="formData.signDate"
              input-class="form-control"
              :disabled="isSaving"
              :use-republic-year="true"
            />
          </div>
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label">開工日期</label>
            <RepublicDatePicker
              v-model="formData.constructionStartDate"
              input-class="form-control"
              :disabled="isSaving"
              :use-republic-year="true"
            />
          </div>
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label">契約工期（天）</label>
            <input type="number" class="form-control" v-model.number="formData.workDay" placeholder="請輸入工期" :disabled="isSaving" />
          </div>
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label">
              工期計算模式
              <i class="fa fa-info-circle text-muted ms-1"
                 title="日曆天：以自然日曆計算，包含週六、週日及國定假日&#10;工作天：僅計算實際可施工的日子，排除週末和假日"
                 style="font-size: 0.875rem; cursor: help;"></i>
            </label>
            <select class="form-select" v-model="formData.durationType" :disabled="isSaving">
              <option value="WORKING_DAYS">工作天</option>
              <option value="CALENDAR_DAYS">日曆天</option>
            </select>
            <small class="form-text text-muted d-block mt-1">
              <span v-if="formData.durationType === 'WORKING_DAYS'">
                <i class="fa fa-info-circle me-1"></i>
                僅計算實際可施工的日子，排除週末和假日
              </span>
              <span v-else>
                <i class="fa fa-info-circle me-1"></i>
                以自然日曆計算，包含週六、週日及國定假日
              </span>
            </small>
          </div>
          <div class="col-lg-3 col-md-6 col-sm-12" style="max-width: 250px;">
            <label class="form-label">
              完工日期
              <i class="fa fa-info-circle text-muted ms-1"
                 title="根據開工日期、總工期及行事曆設定自動計算"
                 style="font-size: 0.875rem;"></i>
            </label>
            <div class="input-group">
              <input
                type="text"
                class="form-control"
                :value="formattedCompletionDate"
                readonly
                placeholder="自動計算"
                style="background-color: var(--bs-secondary-bg); cursor: not-allowed;"
              />
              <span v-if="isCalculatingEndDate" class="input-group-text">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              </span>
              <span v-else-if="formattedCompletionDate" class="input-group-text">
                <i class="fa fa-calendar-check text-success"></i>
              </span>
            </div>
            <small class="form-text text-muted d-block mt-1">
              <div v-if="formData.durationType === 'WORKING_DAYS'">
                <router-link to="/calendar" class="text-decoration-none" style="color: #5bc0de;" title="前往行事曆查看假日設定">
                  <i class="fa fa-calendar me-1"></i>假日定義依行事曆設定
                  <i class="fa fa-external-link-alt ms-1" style="font-size: 0.7rem;"></i>
                </router-link>
              </div>
              <div v-if="formData.totalStopDays && formData.totalStopDays > 0" :class="{ 'mt-1': formData.durationType === 'WORKING_DAYS' }">
                <span style="color: #f5b849;">
                  <i class="fa fa-pause-circle me-1"></i>含累計停工天數：{{ formData.totalStopDays }} 天
                </span>
              </div>
            </small>
          </div>
        </div>

        
        <!-- 契約金額管理 -->
        <h6 class="fw-bold text-theme mb-3 mt-4">
          <i class="fa fa-money-bill me-2"></i>契約金額管理
        </h6>
        <div class="row g-3 mb-3">
          <div class="col-lg-6 col-md-12 col-sm-12">
            <label class="form-label mb-2">監造費用</label>
            <div class="input-group">
              <span class="input-group-text">NT$</span>
              <input
                type="text"
                class="form-control"
                v-model="formattedSupervisoryBudget"
                placeholder="請輸入監造費用"
                :disabled="isSaving"
              />
              <span
                v-if="supervisoryBudgetColloquialText"
                class="input-group-text text-muted"
                title="中文金額"
              >
                {{ supervisoryBudgetColloquialText }}
              </span>
            </div>
          </div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-lg-4 col-md-6 col-sm-12">
            <label class="form-label">付款方式</label>
            <select class="form-select" v-model="formData.payMethod" :disabled="isSaving">
              <option value="">-- 請選擇 --</option>
              <option value="按月計價">按月計價</option>
              <option value="按完工百分比">按完工百分比</option>
              <option value="分期付款">分期付款</option>
              <option value="完工後一次付款">完工後一次付款</option>
            </select>
          </div>
          <div class="col-lg-4 col-md-6 col-sm-12">
            <label class="form-label">預付款比例（%）</label>
            <div class="input-group">
              <input type="number" class="form-control" v-model.number="formData.prePayRatio" placeholder="例：10" min="0" max="100" :disabled="isSaving" />
              <span class="input-group-text">%</span>
            </div>
          </div>
          <div class="col-lg-4 col-md-12 col-sm-12">
            <label class="form-label">保留款比例（%）</label>
            <div class="input-group">
              <input type="number" class="form-control" v-model.number="formData.retainedRatio" placeholder="例：5" min="0" max="100" :disabled="isSaving" />
              <span class="input-group-text">%</span>
            </div>
          </div>
        </div>

        <!-- 保險已改為「工程案保險」獨立頁（多筆＋附件/檔案夾），公司資料頁不再維護 -->

        <!-- 簽核層級設定 -->
        <h6 class="fw-bold text-theme mb-3 mt-4">
          <i class="fa fa-signature me-2"></i>簽核層級設定
        </h6>
        <div class="row mb-3">
          <div class="col-12">
            <p class="text-muted mb-3">設定工程案的簽核層級，按層級順序進行審核。<strong>層級數字越小代表職位越高</strong>，例如：1-局長、2-副局長、3-技正、4-課長、5-承辦、6-協辦。</p>
            
            <div class="sign-level-list">
              <div class="row g-3 mb-3">
                <div 
                  v-for="(item, index) in formData.signLevel" 
                  :key="index"
                  class="col-md-4"
                >
                  <div class="sign-level-item d-flex align-items-center p-2 border rounded">
                    <div class="sign-level-number me-2">
                      <span class="badge bg-primary fs-6">{{ item.level }}</span>
                    </div>
                    <div class="sign-level-content flex-grow-1">
                      <input 
                        type="text" 
                        class="form-control form-control-sm" 
                        v-model="item.title"
                        :placeholder="`第${item.level}層級職稱`"
                        :disabled="isSaving"
                      >
                    </div>
                    <div class="sign-level-actions ms-2">
                      <button 
                        type="button" 
                        class="btn btn-sm btn-outline-danger"
                        @click="removeSignLevel(index)"
                        :disabled="formData.signLevel.length <= 1 || isSaving"
                        title="刪除層級"
                      >
                        <i class="fa fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="text-center">
                <button 
                  type="button" 
                  class="btn btn-outline-theme btn-sm"
                  @click="addSignLevel"
                  :disabled="isSaving"
                >
                  <i class="fa fa-plus me-1"></i>
                  新增簽核層級
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="d-flex justify-content-end gap-2 align-items-center mt-4">
          <span v-if="isAutoSaving" class="text-muted small me-2">
            <i class="fa fa-spinner fa-spin me-1"></i>自動儲存中...
          </span>
          <span v-else-if="!hasUnsavedChanges && !isSaving && hasLoaded" class="text-success small me-2">
            <i class="fa fa-check me-1"></i>已儲存
          </span>
          <button type="button" class="btn btn-outline-secondary" @click="resetForm" :disabled="isSaving">
            <i class="fa fa-undo me-1"></i>重置
          </button>
          <button type="button" class="btn btn-theme" @click="saveForm" :disabled="isSaving">
            <i class="fa me-1" :class="{ 'fa-spin fa-spinner': isSaving, 'fa-save': !isSaving }"></i>
            {{ isSaving ? '處理中...' : '保存' }}
          </button>
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
</style>
