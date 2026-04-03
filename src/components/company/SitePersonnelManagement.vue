<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { sitePersonnelApi, type SitePersonnel, STATUS_OPTIONS, type CreateSitePersonnelRequest } from '@/api/sitePersonnel'
import { getOccupationOptions, getOccupationDisplayLabel, LEGACY_OCCUPATION_MAP, sortPersonnelByOccupation, type OccupationOption } from '@/api/sitePersonnelOccupations'
import { getConstructionsByCompany, type Construction } from '@/api/construction'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'

// Props（companyType 用於區分監造/營造職稱選項，未傳則預設營造）
const props = withDefaults(
  defineProps<{
    companyId: string
    companyName: string
    companyType?: 'CONTRACTOR' | 'SUPERVISION'
  }>(),
  { companyType: 'CONTRACTOR' }
)

const instance = getCurrentInstance()
const proxy = instance?.proxy as any

// 狀態
const personnel = ref<SitePersonnel[]>([])
const isLoading = ref(false)
const showPersonnelForm = ref(false)
const editingPersonnel = ref<SitePersonnel | null>(null)
const searchQuery = ref('')
const selectedPosition = ref('')
const selectedStatus = ref('')
const selectedPhotoFile = ref<File | null>(null)
const selectedSex = ref<'M' | 'F'>('M')
const selectedProjectId = ref<string>('')

// 表單資料
const formData = ref<CreateSitePersonnelRequest>({
  fullName: '',
  email: '',
  phone: '',
  identityNumber: '',
  occupation: 'QUALITY',
  occupationCategory: '',
  licenseNumber: '',
  licenseExpiryDate: '',
  companyId: props.companyId,
  workStartDate: new Date().toISOString().split('T')[0],
  sex: 'M',
  status: 'Y',
  comments: '',
  isDedicated: false
})

// 依公司類型取得職稱選項（監造無工地負責人）
const occupationOptions = computed<OccupationOption[]>(() =>
  getOccupationOptions(props.companyType)
)

// 當前所選職稱若有類別，顯示類別下拉選單
const currentOccupationCategories = computed(() => {
  const opt = occupationOptions.value.find(o => o.value === formData.value.occupation)
  return opt?.categories ?? []
})

// 計算屬性
const filteredPersonnel = computed(() => {
  let filtered = personnel.value

  // 搜索過濾
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(person =>
      person.fullName.toLowerCase().includes(query) ||
      person.email.toLowerCase().includes(query) ||
      person.phone.includes(query) ||
      (person.identityNumber && person.identityNumber.includes(query))
    )
  }

  // 職稱過濾
  if (selectedPosition.value) {
    filtered = filtered.filter(person => {
      const pos = person.occupation || person.position
      return pos === selectedPosition.value || LEGACY_OCCUPATION_MAP[pos!] === selectedPosition.value
    })
  }

  // 狀態過濾
  if (selectedStatus.value) {
    filtered = filtered.filter(person => person.status === selectedStatus.value)
  }

  return filtered
})

/** 列表依職位大小排序（與 /basic/site-personnel 共用邏輯） */
const sortedPersonnel = computed(() => sortPersonnelByOccupation(filteredPersonnel.value))

const personnelByPosition = computed(() => {
  const result: Record<string, number> = {}
  occupationOptions.value.forEach(option => {
    result[option.value] = personnel.value.filter(p => {
      const pos = p.occupation || p.position
      return (pos === option.value || LEGACY_OCCUPATION_MAP[pos!] === option.value) && p.status === 'Y'
    }).length
  })
  return result
})

const personnelByStatus = computed(() => {
  const result: Record<string, number> = {}
  STATUS_OPTIONS.forEach(option => {
    result[option.value] = personnel.value.filter(p => p.status === option.value).length
  })
  return result
})

// 顯示「指派/任職紀錄」小窗
const showAssignmentDetailModal = ref(false)
const assignmentDetailTitle = ref('')
const assignmentDetailList = ref<{ constructionId: string; workStartDate?: string | null; workEndDate?: string | null; isActive?: boolean }[]>([])

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

const openAssignmentDetail = (person: SitePersonnel) => {
  const list = person.assignments || []
  if (!list.length) return
  assignmentDetailTitle.value = `${person.fullName} 的任職紀錄`
  assignmentDetailList.value = list.map(a => ({
    constructionId: a.constructionId,
    workStartDate: a.workStartDate ?? null,
    workEndDate: a.workEndDate ?? null,
    isActive: a.isActive ?? false
  }))
  showAssignmentDetailModal.value = true
}

const closeAssignmentDetail = () => {
  showAssignmentDetailModal.value = false
  assignmentDetailList.value = []
  assignmentDetailTitle.value = ''
}

const getPositionOption = (position: string | undefined) => {
  if (!position) return { label: '未設定', color: 'secondary', icon: 'fa-user' }
  const mapped = LEGACY_OCCUPATION_MAP[position] || position
  const option = occupationOptions.value.find(opt => opt.value === mapped)
  return option || { label: position, color: 'secondary', icon: 'fa-user' }
}

/** 取得人員職稱顯示文字（含類別） */
const getPersonOccupationLabel = (person: SitePersonnel) =>
  getOccupationDisplayLabel(
    person.occupation || person.position,
    person.occupationCategory,
    occupationOptions.value
  )

const getPersonDisplayOccupation = (person: SitePersonnel) => {
  return getOccupationDisplayLabel(
    person.occupation || person.position,
    person.occupationCategory,
    occupationOptions.value
  )
}

const getStatusOption = (status: string) => {
  return STATUS_OPTIONS.find(opt => opt.value === status) || { label: status, color: 'secondary', icon: 'fa-question' }
}

const getProjectName = (constructionId: string | undefined) => {
  if (!constructionId) return '-'
  const project = projects.value.find(p => 
    p.constructionId === constructionId || 
    p.constructionProjectId === constructionId
  )
  return project ? project.constructionName : '未知專案'
}

// 判斷當前使用者是否與列表中人員同公司 (Isolation Check)
const canManageMember = (personCompanyId: string) => {
  // 比對當前公司的 companyId
  return props.companyId === personCompanyId
}

// 方法
const loadPersonnel = async () => {
  isLoading.value = true
  try {
    personnel.value = await sitePersonnelApi.getList(props.companyId)
  } catch (error) {
    console.error('載入工地人員失敗:', error)
    if (proxy && proxy.$toast) {
      proxy.$toast.error('載入工地人員失敗！')
    }
  } finally {
    isLoading.value = false
  }
}

// 只載入該公司相關的工程案
const projects = ref<Construction[]>([])

const loadProjects = async () => {
  try {
    projects.value = await getConstructionsByCompany(props.companyId)
  } catch (error) {
    console.error('載入公司工程案失敗:', error)
    projects.value = []
  }
}

const openPersonnelForm = (person?: SitePersonnel) => {
  // 避免沿用前一次選擇的檔案
  selectedPhotoFile.value = null
  if (person) {
    editingPersonnel.value = person
    selectedSex.value = person.sex
    selectedProjectId.value = person.constructionId || person.projectId || ''
    const occ = person.occupation || person.position || 'QUALITY'
    const mappedOcc = LEGACY_OCCUPATION_MAP[occ] || occ
    const opt = occupationOptions.value.find(o => o.value === mappedOcc)
    formData.value = {
      fullName: person.fullName,
      email: person.email,
      phone: person.phone,
      identityNumber: person.identityNumber || '',
      occupation: mappedOcc,
      occupationCategory: person.occupationCategory ?? '',
      licenseNumber: person.licenseNumber || '',
      licenseExpiryDate: person.licenseExpiryDate ? person.licenseExpiryDate.split('T')[0] : '',
      companyId: person.companyId,
      workStartDate: person.workStartDate ? person.workStartDate.split('T')[0] : '',
      status: person.status,
      comments: person.comments || '',
      sex: person.sex,
      isDedicated: person.isDedicated ?? false
    }
  } else {
    editingPersonnel.value = null
    selectedSex.value = 'M'
    selectedProjectId.value = ''
    formData.value = {
      fullName: '',
      email: '',
      phone: '',
      identityNumber: '',
      occupation: 'QUALITY',
      occupationCategory: '',
      licenseNumber: '',
      licenseExpiryDate: '',
      companyId: props.companyId,
      workStartDate: new Date().toISOString().split('T')[0],
      sex: 'M',
      status: 'Y',
      comments: '',
      isDedicated: false
    }
  }
  showPersonnelForm.value = true
}

const closePersonnelForm = () => {
  showPersonnelForm.value = false
  editingPersonnel.value = null
  selectedPhotoFile.value = null
  selectedSex.value = 'M'
}

const handlePersonnelFormSubmit = async () => {
  isLoading.value = true
  try {
    // 確保 sex 正確
    formData.value.sex = selectedSex.value
    
    // 處理日期格式，確保是 YYYY-MM-DDTHH:mm:ss
    const formatDateWithTime = (dateStr: string) => {
      if (!dateStr) return ''
      // 如果已經包含 T，則不處理 (避免重複添加)
      if (dateStr.includes('T')) return dateStr
      return `${dateStr}T00:00:00`
    }

    const formattedLicenseExpiryDate = formatDateWithTime(formData.value.licenseExpiryDate)
    const formattedWorkStartDate = formatDateWithTime(formData.value.workStartDate)

    if (editingPersonnel.value) {
      const updateData = {
        memberId: editingPersonnel.value.memberId,
        companyId: formData.value.companyId,
        fullName: formData.value.fullName,
        phone: formData.value.phone,
        email: formData.value.email,
        sex: formData.value.sex,
        occupation: formData.value.occupation,
        occupationCategory: formData.value.occupationCategory || undefined,
        identityNumber: formData.value.identityNumber,
        licenseNumber: formData.value.licenseNumber,
        licenseExpiryDate: formattedLicenseExpiryDate,
        workStartDate: formattedWorkStartDate,
        status: formData.value.status,
        comments: formData.value.comments,
        isDedicated: formData.value.isDedicated
      }

      // 更新工地人員（若有選檔則一併更新證照檔案）
      if (selectedPhotoFile.value) {
        await sitePersonnelApi.updateWithPhoto(updateData, selectedPhotoFile.value)
      } else {
        await sitePersonnelApi.update(updateData)
      }
      
      // 檢查是否需要更新指派
      const originalProjectId = editingPersonnel.value.constructionId || editingPersonnel.value.projectId || ''
      if (selectedProjectId.value !== originalProjectId) {
         if (selectedProjectId.value) {
            // 指派新專案
            await sitePersonnelApi.assignProject({
              memberIdList: [editingPersonnel.value.memberId],
              constructionId: selectedProjectId.value,
              assignmentStartDate: formData.value.workStartDate?.split('T')[0] || new Date().toISOString().split('T')[0],
              companyId: props.companyId
            })
            if (proxy && proxy.$toast) proxy.$toast.success('專案指派已更新')
         } else if (originalProjectId) {
            // 移除專案指派
            await sitePersonnelApi.removeProject({
              memberIdList: [editingPersonnel.value.memberId]
            })
            if (proxy && proxy.$toast) proxy.$toast.success('專案指派已移除')
         }
      }
      
      if (proxy && proxy.$toast) proxy.$toast.success('工地人員更新成功！')
    } else {
      // 建立工地人員
      const requestData = {
        ...formData.value,
        licenseExpiryDate: formattedLicenseExpiryDate,
        workStartDate: formattedWorkStartDate
      }

      let newMember: any
      if (selectedPhotoFile.value) {
        newMember = await sitePersonnelApi.createWithPhoto(requestData, selectedPhotoFile.value)
        if (proxy && proxy.$toast) proxy.$toast.success('工地人員建立成功！（含證照檔案）')
      } else {
        newMember = await sitePersonnelApi.create(requestData)
        if (proxy && proxy.$toast) proxy.$toast.success('工地人員建立成功！')
      }

      // 新增後指派專案（一律使用 API 回傳的 memberId）
      if (selectedProjectId.value && newMember?.memberId) {
        await sitePersonnelApi.assignProject({
          memberIdList: [newMember.memberId],
          constructionId: selectedProjectId.value,
          assignmentStartDate: formData.value.workStartDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          companyId: props.companyId
        })
        if (proxy && proxy.$toast) proxy.$toast.success('已指派至所選專案')
      } else if (selectedProjectId.value && !newMember?.memberId) {
        if (proxy && proxy.$toast) proxy.$toast.warning('人員建立成功，但無法自動指派專案。請手動指派。')
      }
    }
    
    closePersonnelForm()
    await loadPersonnel()
  } catch (error: any) {
    console.error('操作失敗:', error)
    const errorMessage = error.response?.data?.message || error.message || '操作失敗，請重試！'
    if (proxy && proxy.$toast) proxy.$toast.error(errorMessage)
  } finally {
    isLoading.value = false
  }
}

const handleDeletePersonnel = async (person: SitePersonnel) => {
  const confirmed = window.confirm(`確定要刪除工地人員「${person.fullName}」嗎？此操作無法撤銷。`)
  if (!confirmed) return

  isLoading.value = true
  try {
    await sitePersonnelApi.delete(person.memberId)
    if (proxy && proxy.$toast) proxy.$toast.success('工地人員刪除成功！')
    await loadPersonnel()
  } catch (error: any) {
    console.error('刪除失敗:', error)
    const errorMessage = error.response?.data?.message || error.message || '刪除失敗，請重試！'
    if (proxy && proxy.$toast) proxy.$toast.error(errorMessage)
  } finally {
    isLoading.value = false
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedPosition.value = ''
  selectedStatus.value = ''
}

// 預覽：用「新分頁」開啟，確保瀏覽器原生工具列存在（下載/列印/縮放等）
const previewLicenseInNewTab = async (person: SitePersonnel) => {
  // 先同步開新分頁，避免 async fetch 後被瀏覽器擋彈窗
  const newTab = window.open('', '_blank')
  try {
    isLoading.value = true
    const blob = await sitePersonnelApi.downloadPhoto(person.memberId)
    
    // 檢查 blob 大小，如果太小可能是空的或錯誤
    if (blob.size < 100) {
      if (proxy && proxy.$toast) proxy.$toast.warning('該人員似乎沒有上傳證照檔案')
      return
    }

    const url = window.URL.createObjectURL(blob)
    if (newTab) {
      newTab.location.href = url
      newTab.focus()
    } else {
      window.open(url, '_blank')
    }
  } catch (error) {
    console.error('下載證照失敗:', error)
    if (proxy && proxy.$toast) proxy.$toast.error('無法下載證照，可能未上傳')
    if (newTab) newTab.close()
  } finally {
    isLoading.value = false
  }
}

const handlePhotoFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    selectedPhotoFile.value = file
  }
}

// 監聽職稱變化，清空不適用的類別
const handleOccupationChange = () => {
  const option = occupationOptions.value.find(o => o.value === formData.value.occupation)
  if (option) {
    if (!option.categories?.length) formData.value.occupationCategory = ''
    else if (formData.value.occupationCategory && !option.categories.some(c => c.value === formData.value.occupationCategory)) {
      formData.value.occupationCategory = ''
    }
  }
}

// 快速填入表單範例值 (僅填入表單)
const loadTestData = () => {
  formData.value.fullName = '測試人員'
  formData.value.identityNumber = 'A123456789'
  formData.value.email = `test${Date.now()}@example.com`
  formData.value.phone = '0912345678'
  selectedSex.value = 'M'
  formData.value.occupation = 'QUALITY'
  handleOccupationChange() // 清空不適用類別
  formData.value.comments = ''
}

// 生命週期
onMounted(async () => {
  loadPersonnel()
  loadProjects()
})
</script>

<template>
  <div class="site-personnel-management">
    <!-- 搜索和過濾 -->
    <Card class="mb-4">
      <CardBody>
        <!-- 統計摘要 -->
        <div class="row mb-3">
          <div class="col-12">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-4">
                <span class="text-muted">總計：</span>
                <span class="badge border border-primary text-primary">{{ personnel.length }} 人</span>
                <span class="badge border border-success text-success">{{ personnelByPosition.QUALITY || 0 }} 品管</span>
                <span class="badge border border-info text-info">{{ personnelByPosition.LABOUR_SAFETY || 0 }} 勞安</span>
                <span class="badge border border-warning text-warning">{{ personnelByPosition.TECHNICIAN || 0 }} 技師</span>
                <span class="text-muted ms-3">狀態：</span>
                <span class="badge border border-success text-success">{{ personnelByStatus.Y || 0 }} 在職</span>
                <span class="badge border border-danger text-danger">{{ personnelByStatus.N || 0 }} 離職</span>
              </div>
              <small class="text-muted">顯示 {{ filteredPersonnel.length }} / {{ personnel.length }} 人</small>
            </div>
          </div>
        </div>

        <div class="row g-3">
          <!-- 搜索框 -->
          <div class="col-md-3">
            <div class="input-group">
              <span class="input-group-text">
                <i class="fa fa-search"></i>
              </span>
              <input
                type="text"
                class="form-control"
                placeholder="搜索姓名、信箱、電話、身分證..."
                v-model="searchQuery"
              />
              <button 
                v-if="searchQuery"
                class="btn btn-outline-secondary"
                type="button"
                @click="searchQuery = ''"
              >
                <i class="fa fa-times"></i>
              </button>
            </div>
          </div>

          <!-- 職稱過濾 -->
          <div class="col-md-2">
            <select class="form-select" v-model="selectedPosition">
              <option value="">所有職稱</option>
              <option v-for="position in occupationOptions" :key="position.value" :value="position.value">
                {{ position.label }}
              </option>
            </select>
          </div>

          <!-- 狀態過濾 -->
          <div class="col-md-2">
            <select class="form-select" v-model="selectedStatus">
              <option value="">所有狀態</option>
              <option v-for="status in STATUS_OPTIONS" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>
          </div>

          <!-- 新增工地人員 -->
          <div class="col-md-2 ms-auto">
            <button 
              class="btn btn-theme w-100"
              @click="openPersonnelForm()"
            >
              <i class="fa fa-plus me-2"></i>
              新增人員
            </button>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- 工地人員列表 -->
    <div class="row">
      <div v-if="isLoading" class="col-12">
        <Card>
          <CardBody class="text-center py-4">
            <i class="fa fa-spinner fa-spin fa-2x text-muted mb-3"></i>
            <p class="text-muted mb-0">載入中...</p>
          </CardBody>
        </Card>
      </div>

      <div v-else-if="filteredPersonnel.length === 0" class="col-12">
        <Card>
          <CardBody class="text-center py-4">
            <i class="fa fa-users fa-3x text-muted mb-3"></i>
            <h5 class="text-muted">暫無工地人員</h5>
            <p class="text-muted mb-3">
              {{ searchQuery || selectedPosition || selectedStatus ? '沒有符合條件的工地人員' : '還沒有新增任何工地人員' }}
            </p>
            <button 
              v-if="!searchQuery && !selectedPosition && !selectedStatus"
              class="btn btn-theme"
              @click="openPersonnelForm()"
            >
              <i class="fa fa-plus me-2"></i>
              新增第一個工地人員
            </button>
          </CardBody>
        </Card>
      </div>

      <div v-else class="col-12">
        <Card>
          <CardBody class="p-0">
            <div class="table-responsive">
              <table class="table a4-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>職稱</th>
                    <th>所屬專案</th>
                    <th>聯絡資訊</th>
                    <th>狀態</th>
                    <th>證照</th>
                    <th>到職日期</th>
                    <th width="120">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="person in sortedPersonnel" :key="person.id">
                    <td class="px-4">
                      <div>
                        <div class="fw-bold">{{ person.fullName || '未填寫' }}</div>
                        <small class="text-muted">{{ person.identityNumber || '未填寫' }}</small>
                      </div>
                    </td>
                    <td class="px-4">
                      <span 
                        class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                        :class="`border-${getPositionOption(person.occupation || person.position).color} text-${getPositionOption(person.occupation || person.position).color}`"
                        :title="getPersonOccupationLabel(person)"
                      >
                        <i :class="`fa ${getPositionOption(person.occupation || person.position).icon} me-1`"></i>
                        {{ getPersonOccupationLabel(person) }}
                      </span>
                    </td>
                    <td class="px-4">
                      <div class="d-flex flex-column gap-1">
                        <div
                          v-if="(person.assignments || []).some(a => a.isActive)"
                          class="badge bg-light text-dark border align-self-start"
                        >
                          <i class="fa fa-hard-hat me-1 text-primary"></i>
                          {{ getProjectName(((person.assignments || []).find(a => a.isActive)?.constructionId) || person.constructionId || person.projectId) }}
                        </div>
                        <span
                          v-if="person.assignments && person.assignments.length > 0"
                          class="text-primary small text-decoration-underline align-self-start"
                          style="cursor: pointer;"
                          role="button"
                          @click="openAssignmentDetail(person)"
                        >
                          任職紀錄
                        </span>
                        <span v-if="!person.assignments || person.assignments.length === 0" class="text-muted small">未指派</span>
                      </div>
                    </td>
                    <td class="px-4">
                      <div class="small">
                        <div><i class="fa fa-envelope me-1"></i>{{ person.email || '未填寫' }}</div>
                        <div><i class="fa fa-phone me-1"></i>{{ person.phone || '未填寫' }}</div>
                      </div>
                    </td>
                    <td class="px-4">
                      <span 
                        class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                        :class="`border-${getStatusOption(person.status).color} text-${getStatusOption(person.status).color}`"
                      >
                        <i :class="`fa ${getStatusOption(person.status).icon} me-1`"></i>
                        {{ getStatusOption(person.status).label }}
                      </span>
                    </td>
                    <td class="px-4">
                      <div class="small">
                        <template v-if="person.licenseNumber || person.licenseExpiryDate || person.hasPhoto">
                          <div v-if="person.licenseNumber" class="mb-1">
                            <i class="fa fa-id-card me-1"></i>
                            <span>{{ person.licenseNumber }}</span>
                          </div>
                          <div v-if="person.licenseExpiryDate" class="text-muted mb-1">
                            <i class="fa fa-calendar me-1"></i>{{ formatRepublicDate(person.licenseExpiryDate) }}
                          </div>
                          <div v-if="person.hasPhoto" class="mb-1">
                            <i class="fa fa-file-alt me-1"></i>
                            <span
                              class="text-decoration-underline text-primary"
                              role="button"
                              @click="previewLicenseInNewTab(person)"
                              title="預覽證照"
                            >預覽證照</span>
                          </div>
                        </template>
                        <span v-else class="text-muted">未填寫</span>
                      </div>
                    </td>
                    <td class="px-4">
                      <div class="small">
                        <div>{{ formatRepublicDate(person.workStartDate) || '未填寫' }}</div>
                      </div>
                    </td>
                    <td class="px-4">
                        <div v-if="!canManageMember(person.companyId)" class="text-muted small">
                          <i class="fa fa-lock me-1"></i>無權限
                        </div>
                        <div v-else>
                        <button 
                          class="btn btn-sm btn-outline-primary me-1"
                          @click="openPersonnelForm(person)"
                          title="編輯"
                        >
                          <i class="fa fa-edit"></i>
                        </button>
                        <button 
                          class="btn btn-sm btn-outline-danger"
                          @click="handleDeletePersonnel(person)"
                          title="刪除"
                        >
                          <i class="fa fa-trash"></i>
                        </button>
                        </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 工地人員表單 Modal -->
    <Modal
      :show="showPersonnelForm"
      :title="editingPersonnel ? '編輯工地人員' : '新增工地人員'"
      icon="fa fa-user"
      size="lg"
      modal-id="personnelFormModal"
      :confirm-text="editingPersonnel ? '更新' : '新增'"
      confirm-icon="fa fa-save"
      @hide="closePersonnelForm"
      @confirm="handlePersonnelFormSubmit"
      :is-loading="isLoading"
    >
      <template #body>
        <form @submit.prevent="handlePersonnelFormSubmit">
          <div class="d-flex justify-content-end mb-3">
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="loadTestData">
              <i class="fa fa-magic me-1"></i>
              快速填入
            </button>
          </div>
          <div class="row g-3">
             <div class="col-12" v-if="!editingPersonnel">
               <div class="alert alert-info py-2 d-flex align-items-center">
                 <i class="fa fa-building me-2"></i>
                 <span>將新增至公司 ID: <strong>{{ props.companyId }}</strong> ({{ props.companyName }})</span>
               </div>
             </div>

            <div class="col-md-6">
              <label class="form-label">姓名 <span class="text-danger">*</span></label>
              <input
                type="text"
                class="form-control"
                v-model="formData.fullName"
                required
              />
            </div>
            
            <div class="col-md-6">
              <label class="form-label">身分證號 <span class="text-danger">*</span></label>
              <input
                type="text"
                class="form-control"
                v-model="formData.identityNumber"
                maxlength="10"
                required
              />
            </div>
            
             <div class="col-md-6">
              <label class="form-label">性別 <span class="text-danger">*</span></label>
               <select class="form-select" v-model="selectedSex">
                <option value="M">男</option>
                <option value="F">女</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label">職稱</label>
              <select class="form-select" v-model="formData.occupation" @change="handleOccupationChange">
                <option v-for="pos in occupationOptions" :key="pos.value" :value="pos.value">
                  {{ pos.label }}
                </option>
              </select>
            </div>
            <div v-if="currentOccupationCategories.length > 0" class="col-md-6">
              <label class="form-label">類別</label>
              <select class="form-select" v-model="formData.occupationCategory">
                <option value="">請選擇類別</option>
                <option v-for="cat in currentOccupationCategories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label">指派專案</label>
               <select class="form-select" v-model="selectedProjectId">
                <option value="">未指派</option>
                <option v-for="proj in projects" :key="proj.constructionId" :value="proj.constructionId">
                  {{ proj.constructionName }}
                </option>
              </select>
            </div>

            <div class="col-md-6 d-flex align-items-end pb-2">
              <div class="form-check">
                <input
                  id="formIsDedicated"
                  type="checkbox"
                  class="form-check-input"
                  v-model="formData.isDedicated"
                />
                <label class="form-check-label" for="formIsDedicated">是否專職</label>
              </div>
            </div>
            
            <div class="col-md-6">
              <label class="form-label">電子信箱 <span class="text-danger">*</span></label>
              <input
                type="email"
                class="form-control"
                v-model="formData.email"
                required
              />
            </div>
            
            <div class="col-md-6">
              <label class="form-label">聯絡電話 <span class="text-danger">*</span></label>
              <input
                type="tel"
                class="form-control"
                v-model="formData.phone"
                required
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">證照號碼</label>
              <input
                type="text"
                class="form-control"
                v-model="formData.licenseNumber"
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">證照到期日</label>
              <RepublicDatePicker
                v-model="formData.licenseExpiryDate"
                :use-republic-year="true"
              />
            </div>

             <div class="col-md-6">
              <label class="form-label">到職日期</label>
              <RepublicDatePicker
                v-model="formData.workStartDate"
                :use-republic-year="true"
              />
            </div>

            <div class="col-md-6">
              <label class="form-label">{{ editingPersonnel ? '更新證照檔案 (PDF/圖片)' : '上傳證照檔案 (PDF/圖片)' }}</label>

              <div v-if="editingPersonnel?.hasPhoto" class="mb-2 small d-flex align-items-center gap-2 flex-wrap">
                <span class="text-muted">
                  <i class="fa fa-file-alt me-1"></i>已上傳
                </span>
                <span v-if="editingPersonnel.licenseNumber" class="text-muted">
                  <i class="fa fa-id-card me-1"></i>{{ editingPersonnel.licenseNumber }}
                </span>
                <span
                  class="text-decoration-underline text-primary"
                  role="button"
                  @click="previewLicenseInNewTab(editingPersonnel as any)"
                  title="預覽證照"
                >預覽證照</span>
              </div>

              <input
                type="file"
                class="form-control"
                accept=".pdf,.jpg,.jpeg,.png"
                @change="handlePhotoFileUpload"
              />
              <div class="form-text d-flex align-items-center justify-content-between">
                <span v-if="selectedPhotoFile">已選擇：{{ selectedPhotoFile.name }}</span>
                <span v-else class="text-muted">未選擇檔案</span>
                <button
                  v-if="selectedPhotoFile"
                  type="button"
                  class="btn btn-link btn-sm p-0"
                  @click="selectedPhotoFile = null"
                >
                  清除
                </button>
              </div>
            </div>

            <div class="col-md-12">
               <label class="form-label">備註</label>
               <textarea class="form-control" rows="3" v-model="formData.comments"></textarea>
            </div>

            <div class="col-md-6">
              <label class="form-label">狀態</label>
              <select class="form-select" v-model="formData.status">
                <option v-for="st in STATUS_OPTIONS" :key="st.value" :value="st.value">
                  {{ st.label }}
                </option>
              </select>
            </div>
          </div>
        </form>
      </template>
    </Modal>

    <!-- 指派工程／任職紀錄 Modal -->
    <Modal
      v-model:show="showAssignmentDetailModal"
      :title="assignmentDetailTitle || '任職紀錄'"
      icon="fa fa-hard-hat"
      size="lg"
      modal-id="assignmentDetailModal"
      confirm-text="關閉"
      confirm-icon="fa fa-times"
      @confirm="closeAssignmentDetail"
      @hide="closeAssignmentDetail"
    >
      <template #body>
        <div v-if="assignmentDetailList.length">
          <ul class="list-group">
            <li
              v-for="(item, idx) in assignmentDetailList"
              :key="idx"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                <div class="fw-bold">
                  <i class="fa fa-hard-hat me-1 text-primary"></i>
                  {{ getProjectName(item.constructionId) }}
                </div>
                <div class="text-muted small">
                  到職：{{ formatRepublicDate(item.workStartDate) || '未填' }}
                  <span class="mx-1">/</span>
                  離職：{{ formatRepublicDate(item.workEndDate) || (item.isActive ? '在職中' : '未填') }}
                </div>
              </div>
              <span class="badge bg-light text-secondary">
                {{ item.constructionId }}
              </span>
            </li>
          </ul>
        </div>
        <div v-else class="text-muted small">目前沒有任何指派紀錄。</div>
      </template>
    </Modal>

  </div>
</template>

<style scoped>
.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bs-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
</style>
