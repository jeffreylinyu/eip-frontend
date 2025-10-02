<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { sitePersonnelApi, type SitePersonnel, POSITION_OPTIONS, STATUS_OPTIONS, type CreateSitePersonnelRequest, type CreateConstructionMemberRequest } from '@/api/sitePersonnel'
import { useWorkspaceStore } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'

// Props
const props = defineProps<{
  companyId: string
  companyName: string
}>()

const instance = getCurrentInstance()
const proxy = instance?.proxy as any
const workspaceStore = useWorkspaceStore()

// 狀態
const personnel = ref<SitePersonnel[]>([])
const isLoading = ref(false)
const showPersonnelForm = ref(false)
const editingPersonnel = ref<SitePersonnel | null>(null)
const searchQuery = ref('')
const selectedPosition = ref('')
const selectedStatus = ref('')
const selectedProject = ref('')
const selectedPhotoFile = ref<File | null>(null)
const selectedSex = ref<'M' | 'F'>('M')

// 表單資料
const formData = ref<CreateSitePersonnelRequest>({
  name: '',
  email: '',
  phone: '',
  idNumber: '',
  position: 'QUALITY_CONTROL',
  specialization: '',
  licenseNumber: '',
  licenseExpiryDate: '',
  licenseFile: '',
  companyId: props.companyId,
  projectId: '',
  hireDate: new Date().toISOString().split('T')[0],
  notes: '',
  status: 'ACTIVE'
})

// 計算屬性
const filteredPersonnel = computed(() => {
  let filtered = personnel.value

  // 搜索過濾
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(person =>
      person.name.toLowerCase().includes(query) ||
      person.email.toLowerCase().includes(query) ||
      person.phone.includes(query) ||
      person.idNumber.includes(query)
    )
  }

  // 職位過濾
  if (selectedPosition.value) {
    filtered = filtered.filter(person => person.position === selectedPosition.value)
  }

  // 狀態過濾
  if (selectedStatus.value) {
    filtered = filtered.filter(person => person.status === selectedStatus.value)
  }

  // 項目過濾
  if (selectedProject.value) {
    filtered = filtered.filter(person => person.projectId === selectedProject.value)
  }

  return filtered
})

// 假項目資料
const mockProjects = [
  {
    id: 'proj-001',
    name: '台北市信義區辦公大樓新建工程',
    status: 'ACTIVE'
  },
  {
    id: 'proj-002', 
    name: '新北市板橋區住宅建案',
    status: 'ACTIVE'
  },
  {
    id: 'proj-003',
    name: '桃園市龜山區工業園區工程',
    status: 'ACTIVE'
  }
]

const availableProjects = computed(() => {
  // 使用假項目資料
  return mockProjects
})

const personnelByPosition = computed(() => {
  const result: Record<string, number> = {}
  POSITION_OPTIONS.forEach(option => {
    result[option.value] = personnel.value.filter(p => p.position === option.value && p.status === 'ACTIVE').length
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
const getPositionOption = (position: string) => {
  return POSITION_OPTIONS.find(opt => opt.value === position) || POSITION_OPTIONS[POSITION_OPTIONS.length - 1]
}

const getStatusOption = (status: string) => {
  return STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[0]
}

const getProjectName = (projectId: string | undefined) => {
  if (!projectId) return '未分配'
  const project = availableProjects.value.find(p => p.id === projectId)
  return project ? project.name : '未知項目'
}

// 假資料
const mockPersonnelData: SitePersonnel[] = [
  {
    id: '1',
    personnelId: 'SP001',
    name: '張志明',
    email: 'zhang.zhiming@example.com',
    phone: '0912-345-678',
    idNumber: 'A123456789',
    position: 'QUALITY_CONTROL',
    specialization: '',
    licenseNumber: 'QC-2024-001',
    licenseExpiryDate: '2025-06-15',
    licenseFile: '/uploads/licenses/qc-001.pdf',
    companyId: props.companyId,
    projectId: 'proj-001',
    projectName: '台北市信義區辦公大樓新建工程',
    status: 'ACTIVE',
    hireDate: '2024-01-15',
    leaveDate: '',
    notes: '資深品管人員，有10年經驗',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z'
  },
  {
    id: '2',
    personnelId: 'SP002',
    name: '李美玲',
    email: 'li.meiling@example.com',
    phone: '0923-456-789',
    idNumber: 'B987654321',
    position: 'SAFETY_OFFICER',
    specialization: '',
    licenseNumber: 'SO-2024-002',
    licenseExpiryDate: '2025-03-20',
    licenseFile: '/uploads/licenses/so-002.pdf',
    companyId: props.companyId,
    projectId: 'proj-002',
    projectName: '新北市板橋區住宅建案',
    status: 'ACTIVE',
    hireDate: '2024-02-01',
    leaveDate: '',
    notes: '勞安專員，具備多項安全證照',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-01T09:00:00Z'
  },
  {
    id: '3',
    personnelId: 'SP003',
    name: '王建國',
    email: 'wang.jianguo@example.com',
    phone: '0934-567-890',
    idNumber: 'C456789123',
    position: 'PROFESSIONAL_ENGINEER',
    specialization: '',
    licenseNumber: 'PE-2024-003',
    licenseExpiryDate: '2025-12-31',
    licenseFile: '/uploads/licenses/pe-003.pdf',
    companyId: props.companyId,
    projectId: 'proj-001',
    projectName: '台北市信義區辦公大樓新建工程',
    status: 'ACTIVE',
    hireDate: '2024-01-20',
    leaveDate: '',
    notes: '結構技師，專精於高層建築設計',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z'
  },
  {
    id: '4',
    personnelId: 'SP004',
    name: '陳雅婷',
    email: 'chen.yating@example.com',
    phone: '0945-678-901',
    idNumber: 'D789123456',
    position: 'QUALITY_CONTROL',
    specialization: '',
    licenseNumber: 'QC-2024-004',
    licenseExpiryDate: '2024-11-30',
    licenseFile: '',
    companyId: props.companyId,
    projectId: 'proj-003',
    projectName: '桃園市龜山區工業園區工程',
    status: 'ON_LEAVE',
    hireDate: '2024-03-01',
    leaveDate: '',
    notes: '品管人員，目前請假中',
    createdAt: '2024-03-01T11:00:00Z',
    updatedAt: '2024-03-01T11:00:00Z'
  },
  {
    id: '5',
    personnelId: 'SP005',
    name: '劉志豪',
    email: 'liu.zhihao@example.com',
    phone: '0956-789-012',
    idNumber: 'E321654987',
    position: 'PROFESSIONAL_ENGINEER',
    specialization: '',
    licenseNumber: 'PE-2024-005',
    licenseExpiryDate: '2025-08-15',
    licenseFile: '/uploads/licenses/pe-005.pdf',
    companyId: props.companyId,
    projectId: 'proj-002',
    projectName: '新北市板橋區住宅建案',
    status: 'ACTIVE',
    hireDate: '2024-02-15',
    leaveDate: '',
    notes: '機電技師，專精於智慧建築系統',
    createdAt: '2024-02-15T12:00:00Z',
    updatedAt: '2024-02-15T12:00:00Z'
  },
  {
    id: '6',
    personnelId: 'SP006',
    name: '黃淑芬',
    email: 'huang.shufen@example.com',
    phone: '0967-890-123',
    idNumber: 'F654321987',
    position: 'SAFETY_OFFICER',
    specialization: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    licenseFile: '',
    companyId: props.companyId,
    projectId: '',
    projectName: '',
    status: 'TERMINATED',
    hireDate: '2024-01-10',
    leaveDate: '2024-04-15',
    notes: '已離職',
    createdAt: '2024-01-10T13:00:00Z',
    updatedAt: '2024-04-15T13:00:00Z'
  },
  {
    id: '7',
    personnelId: 'SP007',
    name: '林俊傑',
    email: 'lin.junjie@example.com',
    phone: '0978-901-234',
    idNumber: 'G987654321',
    position: 'PROFESSIONAL_ENGINEER',
    specialization: '',
    licenseNumber: 'PE-2024-007',
    licenseExpiryDate: '2025-05-20',
    licenseFile: '/uploads/licenses/pe-007.pdf',
    companyId: props.companyId,
    projectId: 'proj-003',
    projectName: '桃園市龜山區工業園區工程',
    status: 'ACTIVE',
    hireDate: '2024-03-15',
    leaveDate: '',
    notes: '土木技師，專精於基礎工程',
    createdAt: '2024-03-15T14:00:00Z',
    updatedAt: '2024-03-15T14:00:00Z'
  },
  {
    id: '8',
    personnelId: 'SP008',
    name: '吳佳玲',
    email: 'wu.jialing@example.com',
    phone: '0989-012-345',
    idNumber: 'H123789456',
    position: 'QUALITY_CONTROL',
    specialization: '',
    licenseNumber: 'QC-2024-008',
    licenseExpiryDate: '2025-09-10',
    licenseFile: '/uploads/licenses/qc-008.pdf',
    companyId: props.companyId,
    projectId: 'proj-001',
    projectName: '台北市信義區辦公大樓新建工程',
    status: 'ON_LEAVE',
    hireDate: '2024-02-20',
    leaveDate: '',
    notes: '品管人員，目前休假中',
    createdAt: '2024-02-20T15:00:00Z',
    updatedAt: '2024-02-20T15:00:00Z'
  }
]

// 方法
const loadPersonnel = async () => {
  isLoading.value = true
  try {
    // 使用假資料
    personnel.value = mockPersonnelData
    // console.log('載入假資料:', personnel.value.length, '筆工地人員資料')
  } catch (error) {
    console.error('載入工地人員失敗:', error)
    proxy.$toast.error('載入工地人員失敗！')
    personnel.value = []
  } finally {
    isLoading.value = false
  }
}

const openPersonnelForm = (person?: SitePersonnel) => {
  if (person) {
    editingPersonnel.value = person
    formData.value = {
      name: person.name,
      email: person.email,
      phone: person.phone,
      idNumber: person.idNumber,
      position: person.position,
      specialization: person.specialization || '',
      licenseNumber: person.licenseNumber || '',
      licenseExpiryDate: person.licenseExpiryDate || '',
      licenseFile: person.licenseFile || '',
      companyId: person.companyId,
      projectId: person.projectId || '',
      hireDate: person.hireDate,
      notes: person.notes || '',
      status: person.status
    }
  } else {
    editingPersonnel.value = null
          formData.value = {
        name: '',
        email: '',
        phone: '',
        idNumber: '',
        position: 'QUALITY_CONTROL',
        specialization: '',
        licenseNumber: '',
        licenseExpiryDate: '',
        licenseFile: '',
        companyId: props.companyId,
        projectId: '',
        hireDate: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'ACTIVE'
      }
  }
  selectedSex.value = 'M'
  showPersonnelForm.value = true
}

const closePersonnelForm = () => {
  showPersonnelForm.value = false
  editingPersonnel.value = null
  selectedPhotoFile.value = null
  selectedSex.value = 'M'
}

const handlePersonnelFormSubmit = async () => {
  try {
    if (editingPersonnel.value) {
      // 更新工地人員
      await sitePersonnelApi.update({
        personnelId: editingPersonnel.value.personnelId,
        ...formData.value
      })
      proxy.$toast.success('工地人員更新成功！')
    } else {
      // 建立工地人員（使用新的 API）
      if (selectedPhotoFile.value) {
        // 如果有證照檔案，使用 createWithPhoto API
        const memberData: CreateConstructionMemberRequest = {
          memberId: `M${Date.now()}`, // 生成臨時 ID
          fullName: formData.value.name,
          companyId: formData.value.companyId,
          workStartDate: formData.value.hireDate + 'T09:00:00',
          occupation: formData.value.position,
          licenseNumber: formData.value.licenseNumber || '',
          sex: selectedSex.value,
          email: formData.value.email,
          phone: formData.value.phone,
          licenseExpiryDate: formData.value.licenseExpiryDate ? formData.value.licenseExpiryDate + 'T17:00:00' : '',
          comments: formData.value.notes || '',
          constructionId: formData.value.projectId || '', // 使用 projectId 作為 constructionId
          identityNumber: formData.value.idNumber
        }
        
        await sitePersonnelApi.createWithPhoto(memberData, selectedPhotoFile.value)
        proxy.$toast.success('工地人員建立成功！（含證照檔案）')
      } else {
        // 沒有證照檔案，使用原本的 API
        await sitePersonnelApi.create(formData.value)
        proxy.$toast.success('工地人員建立成功！')
      }
    }
    
    closePersonnelForm()
    await loadPersonnel()
  } catch (error) {
    console.error('操作失敗:', error)
    proxy.$toast.error('操作失敗，請重試！')
  }
}

const handleDeletePersonnel = async (person: SitePersonnel) => {
  const confirmed = window.confirm(`確定要刪除工地人員「${person.name}」嗎？此操作無法撤銷。`)
  if (!confirmed) return

  try {
    await sitePersonnelApi.delete(person.personnelId)
    proxy.$toast.success('工地人員刪除成功！')
    await loadPersonnel()
  } catch (error) {
    console.error('刪除失敗:', error)
    proxy.$toast.error('刪除失敗，請重試！')
  }
}



const clearFilters = () => {
  searchQuery.value = ''
  selectedPosition.value = ''
  selectedStatus.value = ''
  selectedProject.value = ''
}

const downloadLicense = (filePath: string) => {
  // 這裡可以實現證照檔案下載邏輯
  // console.log('下載證照檔案:', filePath)
  // 實際實現時可能需要調用 API 或直接下載
  window.open(filePath, '_blank')
}



const handlePhotoFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    // console.log('選擇的證照檔案:', file.name, file.size, file.type)
    selectedPhotoFile.value = file
  }
}

// 載入測試資料
const loadTestData = () => {
  const today = new Date()
  const y = today.getFullYear()
  const m = (today.getMonth() + 1).toString().padStart(2, '0')
  const d = today.getDate().toString().padStart(2, '0')

  formData.value = {
    name: '王大明',
    email: 'wang.daming@example.com',
    phone: '0912-345-678',
    idNumber: 'A123456789',
    position: 'QUALITY_CONTROL',
    specialization: '',
    licenseNumber: 'QC-TEST-001',
    licenseExpiryDate: `${y + 2}-${m}-${d}`,
    licenseFile: 'test-license.pdf',
    companyId: props.companyId,
    projectId: availableProjects.value[0]?.id || '',
    hireDate: `${y}-${m}-${d}`,
    notes: '測試資料，自動帶入',
    status: 'ACTIVE'
  }

  selectedSex.value = 'M'

  // 建立一個測試用 PDF File 物件（僅供上傳 API 使用）
  const blob = new Blob(['%PDF-1.4\n% 測試用 PDF 檔案'], { type: 'application/pdf' })
  const testFile = new File([blob], 'test-license.pdf', { type: 'application/pdf' })
  selectedPhotoFile.value = testFile

  try {
    proxy?.$toast?.info?.('已載入測試資料（含測試用 PDF）')
  } catch (e) {
    // console.log('已載入測試資料（含測試用 PDF）')
  }
}

// 生命週期
onMounted(() => {
  loadPersonnel()
  workspaceStore.initWorkspaces()
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
                <span class="badge border border-success text-success">{{ personnelByPosition.QUALITY_CONTROL }} 品管</span>
                <span class="badge border border-info text-info">{{ personnelByPosition.SAFETY_OFFICER }} 勞安</span>
                <span class="badge border border-warning text-warning">{{ personnelByPosition.PROFESSIONAL_ENGINEER }} 技師</span>
                <span class="text-muted ms-3">狀態：</span>
                <span class="badge border border-success text-success">{{ personnelByStatus.ACTIVE }} 在職</span>
                <span class="badge border border-info text-info">{{ personnelByStatus.ON_LEAVE }} 休假</span>
                <span class="badge border border-danger text-danger">{{ personnelByStatus.TERMINATED }} 離職</span>
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

          <!-- 項目過濾 -->
          <div class="col-md-3">
            <select class="form-select" v-model="selectedProject">
              <option value="">所有項目</option>
              <option value="unassigned">未分配</option>
              <option v-for="project in availableProjects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <!-- 新增工地人員 -->
          <div class="col-md-2">
            <button 
              class="btn btn-theme w-100"
              @click="openPersonnelForm()"
            >
              <i class="fa fa-plus me-2"></i>
              新增工地人員
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
              {{ searchQuery || selectedPosition || selectedStatus || selectedProject ? '沒有符合條件的工地人員' : '還沒有新增任何工地人員' }}
            </p>
            <button 
              v-if="!searchQuery && !selectedPosition && !selectedStatus && !selectedProject"
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
                    <th>聯絡資訊</th>
                    <th>分配項目</th>
                    <th>狀態</th>
                    <th>證照</th>
                    <th>僱用日期</th>
                    <th width="120">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="person in filteredPersonnel" :key="person.id">
                    <td class="px-4">
                      <div>
                        <div class="fw-bold">{{ person.name }}</div>
                        <small class="text-muted">{{ person.idNumber }}</small>
                      </div>
                    </td>
                    <td class="px-4">
                      <span 
                        class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                        :class="`border-${getPositionOption(person.position).color} text-${getPositionOption(person.position).color}`"
                      >
                        <i :class="`fa ${getPositionOption(person.position).icon} me-1`"></i>
                        {{ getPositionOption(person.position).label }}
                      </span>
                    </td>
                    <td class="px-4">
                      <div class="small">
                        <div><i class="fa fa-envelope me-1"></i>{{ person.email }}</div>
                        <div><i class="fa fa-phone me-1"></i>{{ person.phone }}</div>
                      </div>
                    </td>
                    <td class="px-4">
                      <span>{{ getProjectName(person.projectId) }}</span>
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
                          <i class="fa fa-calendar me-1"></i>{{ person.licenseExpiryDate }}
                        </div>
                        <div v-if="person.licenseFile" class="mb-1">
                          <a href="#" class="text-decoration-none" @click.prevent="downloadLicense(person.licenseFile)">
                            <i class="fa fa-download me-1"></i>下載證照
                          </a>
                        </div>
                        <div v-if="!person.licenseNumber && !person.licenseExpiryDate && !person.licenseFile" class="text-muted">
                          <i class="fa fa-minus me-1"></i>無證照
                        </div>
                      </div>
                    </td>
                    <td class="px-4">
                      <div class="small">
                        <div>{{ person.hireDate }}</div>
                        <div v-if="person.leaveDate" class="text-muted">
                          離職: {{ person.leaveDate }}
                        </div>
                      </div>
                    </td>
                    <td class="px-4">
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
    >
      <template #body>
        <form @submit.prevent="handlePersonnelFormSubmit">
          <div class="d-flex justify-content-end mb-3">
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="loadTestData">
              <i class="fa fa-magic me-1"></i>
              載入測試資料
            </button>
          </div>
          <div class="row g-3">

            
            <div class="col-md-6">
              <label class="form-label">姓名 *</label>
              <input
                type="text"
                class="form-control"
                v-model="formData.name"
                required
              />
            </div>
            
            <div class="col-md-6">
              <label class="form-label">身分證號 *</label>
              <input
                type="text"
                class="form-control"
                v-model="formData.idNumber"
                maxlength="10"
                required
              />
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
              <label class="form-label">職位 *</label>
              <select class="form-select" v-model="formData.position" required>
                <option v-for="position in POSITION_OPTIONS" :key="position.value" :value="position.value">
                  {{ position.label }}
                </option>
              </select>
            </div>
            
            <div class="col-md-6">
              <label class="form-label">狀態 *</label>
              <select class="form-select" v-model="formData.status" required>
                <option v-for="status in STATUS_OPTIONS" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </div>
            
            <div class="col-md-6">
              <label class="form-label">性別 *</label>
              <select class="form-select" v-model="selectedSex" required>
                <option value="M">男</option>
                <option value="F">女</option>
              </select>
            </div>


            
            <div class="col-md-6">
              <label class="form-label">證照號碼</label>
              <input
                type="text"
                class="form-control"
                v-model="formData.licenseNumber"
                placeholder="請輸入證照號碼"
              />
            </div>
            
            <div class="col-md-6">
              <label class="form-label">證照到期日</label>
              <input
                type="date"
                class="form-control"
                v-model="formData.licenseExpiryDate"
              />
            </div>
            
            <div class="col-md-6">
              <label class="form-label">證照檔案</label>
              <input
                type="file"
                class="form-control"
                @change="handlePhotoFileUpload"
                accept=".pdf"
              />
              <div class="form-text">只支援 PDF 格式</div>
              <div v-if="selectedPhotoFile" class="mt-2">
                <small class="text-success">
                  <i class="fa fa-check me-1"></i>
                  已選擇：{{ selectedPhotoFile.name }}
                </small>
              </div>
            </div>


            
            <div class="col-md-6">
              <label class="form-label">分配項目</label>
              <select class="form-select" v-model="formData.projectId">
                <option value="">請選擇項目（可不選）</option>
                <option v-for="project in availableProjects" :key="project.id" :value="project.id">
                  {{ project.name }}
                </option>
              </select>
              <div class="form-text">一個工地人員只能分配到一個項目</div>
            </div>
            
            <div class="col-md-6">
              <label class="form-label">僱用日期 *</label>
              <input
                type="date"
                class="form-control"
                v-model="formData.hireDate"
                required
              />
            </div>
            
            <div class="col-12">
              <label class="form-label">備註</label>
              <textarea
                class="form-control"
                v-model="formData.notes"
                rows="3"
                placeholder="其他備註資訊..."
              ></textarea>
            </div>
          </div>
        </form>
      </template>
    </Modal>


  </div>
</template>

<style scoped>
.site-personnel-management {
  padding: 0;
}
</style>
