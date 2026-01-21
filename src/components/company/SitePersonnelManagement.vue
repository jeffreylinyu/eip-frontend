<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { sitePersonnelApi, type SitePersonnel, POSITION_OPTIONS, STATUS_OPTIONS, type CreateSitePersonnelRequest } from '@/api/sitePersonnel'
import { getConstructionsByCompany, type Construction } from '@/api/construction'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'

// Props
const props = defineProps<{
  companyId: string
  companyName: string
}>()

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
  licenseNumber: '',
  licenseExpiryDate: '',
  companyId: props.companyId,
  workStartDate: new Date().toISOString().split('T')[0],
  sex: 'M',
  status: 'Y',
  comments: '',
  departmentCode: 'QT' // Default for QUALITY
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

  // 職位過濾
  if (selectedPosition.value) {
    filtered = filtered.filter(person => {
      const pos = person.occupation || person.position
      return pos === selectedPosition.value || LEGACY_ROLE_MAP[pos!] === selectedPosition.value
    })
  }

  // 狀態過濾
  if (selectedStatus.value) {
    filtered = filtered.filter(person => person.status === selectedStatus.value)
  }

  return filtered
})

const personnelByPosition = computed(() => {
  const result: Record<string, number> = {}
  POSITION_OPTIONS.forEach(option => {
    result[option.value] = personnel.value.filter(p => {
       const pos = p.occupation || p.position
       // 檢查直接匹配或舊代碼映射匹配
       return (pos === option.value || LEGACY_ROLE_MAP[pos!] === option.value) && p.status === 'Y'
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

// 工具函數
// 舊職位代碼兼容映射
const LEGACY_ROLE_MAP: Record<string, string> = {
  'QUALITY_CONTROL': 'QUALITY',
  'SAFETY_OFFICER': 'LABOUR_SAFETY',
  'PROFESSIONAL_ENGINEER': 'TECHNICIAN'
}

const getPositionOption = (position: string | undefined) => {
  if (!position) return { label: '未設定', color: 'secondary', icon: 'fa-user' }
  
  // 先嘗試直接對應
  let option = POSITION_OPTIONS.find(opt => opt.value === position)
  
  // 若找不到，嘗試映射舊代碼
  if (!option && LEGACY_ROLE_MAP[position]) {
    option = POSITION_OPTIONS.find(opt => opt.value === LEGACY_ROLE_MAP[position])
  }
  
  return option || { label: position, color: 'secondary', icon: 'fa-user' }
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
  if (person) {
    editingPersonnel.value = person
    selectedSex.value = person.sex
    selectedProjectId.value = person.constructionId || person.projectId || ''
    formData.value = {
      fullName: person.fullName,
      email: person.email,
      phone: person.phone,
      identityNumber: person.identityNumber || '',
      occupation: person.occupation || person.position || 'QUALITY',
      licenseNumber: person.licenseNumber || '',
      licenseExpiryDate: person.licenseExpiryDate ? person.licenseExpiryDate.split('T')[0] : '', // 處理日期格式
      companyId: person.companyId,
      workStartDate: person.workStartDate ? person.workStartDate.split('T')[0] : '',
      status: person.status,
      comments: person.comments || '',
      sex: person.sex,
      departmentCode: person.departmentCode || POSITION_OPTIONS.find(opt => opt.value === (person.occupation || person.position))?.departmentCode || ''
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
      licenseNumber: '',
      licenseExpiryDate: '',
      companyId: props.companyId,
      workStartDate: new Date().toISOString().split('T')[0],
      sex: 'M',
      status: 'Y',
      comments: '',
      departmentCode: 'QT'
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
      // 更新工地人員
      await sitePersonnelApi.update({
        memberId: editingPersonnel.value.memberId,
        fullName: formData.value.fullName,
        phone: formData.value.phone,
        email: formData.value.email,
        sex: formData.value.sex,
        occupation: formData.value.occupation,
        identityNumber: formData.value.identityNumber,
        licenseNumber: formData.value.licenseNumber,
        licenseExpiryDate: formattedLicenseExpiryDate,
        workStartDate: formattedWorkStartDate,
        status: formData.value.status,
        comments: formData.value.comments
      })
      
      // 檢查是否需要更新指派
      const originalProjectId = editingPersonnel.value.constructionId || editingPersonnel.value.projectId || ''
      if (selectedProjectId.value !== originalProjectId) {
         if (selectedProjectId.value) {
            // 指派新專案
            await sitePersonnelApi.assignProject({
              memberIdList: [editingPersonnel.value.memberId],
              constructionId: selectedProjectId.value
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
        // 使用 createWithPhoto API
        newMember = await sitePersonnelApi.createWithPhoto(requestData, selectedPhotoFile.value)
        if (proxy && proxy.$toast) proxy.$toast.success('工地人員建立成功！（含證照檔案）')
      } else {
        newMember = await sitePersonnelApi.create(requestData)
        if (proxy && proxy.$toast) proxy.$toast.success('工地人員建立成功！')
      }
      
      
      // 如果沒有取得 memberId (可能是 createWithPhoto 回傳格式問題)，嘗試搜尋該人員
      if (!newMember?.memberId && formData.value.fullName) {
        try {
          // 稍微延遲一下確保後端已寫入
          await new Promise(resolve => setTimeout(resolve, 500))
          const searchResults = await sitePersonnelApi.search(props.companyId, formData.value.fullName)
          // 根據電話或 Email 進一步確認
          const found = searchResults.find(p => 
            p.fullName === formData.value.fullName && 
            (p.phone === formData.value.phone || p.email === formData.value.email)
          )
          if (found) {
            newMember = found
          }
        } catch (e) {
          console.warn('Fallback search failed:', e)
        }
      }

      // 新增後指派專案
      if (selectedProjectId.value && newMember && newMember.memberId) {
         await sitePersonnelApi.assignProject({
           memberIdList: [newMember.memberId],
           constructionId: selectedProjectId.value
         })
         if (proxy && proxy.$toast) proxy.$toast.success('已指派至所選專案')
      } else if (selectedProjectId.value) {
         if (proxy && proxy.$toast) proxy.$toast.warning('人員建立成功，但無法自動指派專案 (找不到人員ID)。請手動指派。')
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

const downloadLicense = async (person: SitePersonnel) => {
  try {
    isLoading.value = true
    const blob = await sitePersonnelApi.downloadPhoto(person.memberId)
    
    // 檢查 blob 大小，如果太小可能是空的或錯誤
    if (blob.size < 100) {
      if (proxy && proxy.$toast) proxy.$toast.warning('該人員似乎沒有上傳證照檔案')
      return
    }

    // 建立下載連結
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
    
    // 清理資源 (延遲一下確保開啟成功)
    setTimeout(() => window.URL.revokeObjectURL(url), 10000)
  } catch (error) {
    console.error('下載證照失敗:', error)
    if (proxy && proxy.$toast) proxy.$toast.error('無法下載證照，可能未上傳')
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

// 監聽職位變化，自動設置部門代碼
const handleOccupationChange = () => {
  const option = POSITION_OPTIONS.find(opt => opt.value === formData.value.occupation)
  if (option) {
    formData.value.departmentCode = option.departmentCode
  }
}

// 載入測試資料 (僅填入表單)
const loadTestData = () => {
  formData.value.fullName = '測試人員'
  formData.value.identityNumber = 'A123456789'
  formData.value.email = `test${Date.now()}@example.com`
  formData.value.phone = '0912345678'
  selectedSex.value = 'M'
  formData.value.occupation = 'QUALITY'
  handleOccupationChange() // 更新部門代碼
  formData.value.comments = '自動填入的測試資料'
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

          <!-- 職位過濾 -->
          <div class="col-md-2">
            <select class="form-select" v-model="selectedPosition">
              <option value="">所有職位</option>
              <option v-for="position in POSITION_OPTIONS" :key="position.value" :value="position.value">
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
              <table class="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>職位</th>
                    <th>所屬專案</th>
                    <th>聯絡資訊</th>
                    <th>狀態</th>
                    <th>證照</th>
                    <th>到職日期</th>
                    <th width="120">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="person in filteredPersonnel" :key="person.id">
                    <td class="px-4">
                      <div>
                        <div class="fw-bold">{{ person.fullName }}</div>
                        <small class="text-muted">{{ person.identityNumber }}</small>
                      </div>
                    </td>
                    <td class="px-4">
                      <span 
                        class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                        :class="`border-${getPositionOption(person.occupation || person.position).color} text-${getPositionOption(person.occupation || person.position).color}`"
                      >
                        <i :class="`fa ${getPositionOption(person.occupation || person.position).icon} me-1`"></i>
                        {{ getPositionOption(person.occupation || person.position).label }}
                      </span>
                    </td>
                    <td class="px-4">
                      <div v-if="person.constructionId || person.projectId" class="badge bg-light text-dark border">
                        <i class="fa fa-hard-hat me-1 text-primary"></i>
                        {{ getProjectName(person.constructionId || person.projectId) }}
                      </div>
                      <span v-else class="text-muted small">-</span>
                    </td>
                    <td class="px-4">
                      <div class="small">
                        <div><i class="fa fa-envelope me-1"></i>{{ person.email }}</div>
                        <div><i class="fa fa-phone me-1"></i>{{ person.phone }}</div>
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
                        <div v-if="person.licenseNumber" class="mb-1">
                          <i class="fa fa-id-card me-1"></i>{{ person.licenseNumber }}
                        </div>
                        <div v-if="person.licenseExpiryDate" class="text-muted mb-1">
                          <i class="fa fa-calendar me-1"></i>{{ person.licenseExpiryDate.split('T')[0] }}
                        </div>
                        <button 
                          v-if="person.hasPhoto"
                          class="btn btn-xs btn-outline-info"
                          @click="downloadLicense(person)"
                          title="查看證照"
                        >
                           <i class="fa fa-file-alt me-1"></i>查看證照
                        </button>
                      </div>
                    </td>
                    <td class="px-4">
                      <div class="small">
                        <div>{{ person.workStartDate ? person.workStartDate.split('T')[0] : '-' }}</div>
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
              填入測試資料
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
              <label class="form-label">姓名 *</label>
              <input
                type="text"
                class="form-control"
                v-model="formData.fullName"
                required
              />
            </div>
            
            <div class="col-md-6">
              <label class="form-label">身分證號 *</label>
              <input
                type="text"
                class="form-control"
                v-model="formData.identityNumber"
                maxlength="10"
                required
              />
            </div>
            
             <div class="col-md-6">
              <label class="form-label">性別 *</label>
               <select class="form-select" v-model="selectedSex">
                <option value="M">男</option>
                <option value="F">女</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label">職位</label>
               <select class="form-select" v-model="formData.occupation" @change="handleOccupationChange">
                <option v-for="pos in POSITION_OPTIONS" :key="pos.value" :value="pos.value">
                  {{ pos.label }}
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
            
            <div class="col-md-6">
              <label class="form-label">電子信箱 *</label>
              <input
                type="email"
                class="form-control"
                v-model="formData.email"
                required
              />
            </div>
            
            <div class="col-md-6">
              <label class="form-label">聯絡電話 *</label>
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

            <div class="col-md-6" v-if="!editingPersonnel">
               <label class="form-label">上傳證照 (PDF/圖片)</label>
               <input 
                 type="file" 
                 class="form-control" 
                 accept=".pdf,.jpg,.jpeg,.png"
                 @change="handlePhotoFileUpload"
               />
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
