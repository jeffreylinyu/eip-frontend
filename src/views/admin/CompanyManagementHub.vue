<script setup lang="ts">
import { ref, reactive, onMounted, computed, provide } from 'vue'
import { companyApi, type Company, type CreateCompanyRequest } from '@/api/company'
import { userApi, type User } from '@/api/user'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import CompanyFormModal from '@/components/company/CompanyFormModal.vue'
import CompanyMemberManagement from '@/components/company/CompanyMemberManagement.vue'
import SitePersonnelManagement from '@/components/company/SitePersonnelManagement.vue'
import AuthorizationModal from '@/components/admin/AuthorizationModal.vue'
import { Sort, Resize, Filter, Page, GridComponent, Toolbar } from '@syncfusion/ej2-vue-grids'
import { getCurrentInstance } from 'vue'

provide('grid', [Sort, Resize, Filter, Page, Toolbar])

const companyGrid = ref<GridComponent | null>(null)
const memberGrid = ref<GridComponent | null>(null)

const pageSettings = ref({
  pageSize: 20,
  pageSizes: [10, 20, 50, 100],
  pageCount: 5
})

const formatCompanyType = (type: string | undefined) => {
  if (type === 'CONTRACTOR') return '營造廠商'
  if (type === 'SUPERVISION') return '監造單位'
  if (type === 'THIRD_PARTY') return '第三方'
  return type || '-'
}

const companyTypeBadgeClass = (type: string | undefined) => {
  if (type === 'CONTRACTOR') return 'badge bg-primary'
  if (type === 'SUPERVISION') return 'badge bg-info'
  if (type === 'THIRD_PARTY') return 'badge bg-success'
  return 'badge bg-secondary'
}

const { proxy } = getCurrentInstance() as any
const toast = {
  success: (msg: string) => proxy?.$toast?.success(msg),
  error: (msg: string) => proxy?.$toast?.error(msg)
}

// 狀態管理
const viewMode = ref<'LIST' | 'DETAIL' | 'MEMBERS' | 'SITE_PERSONNEL'>('LIST')
const isLoading = ref(false)
const companies = ref<Company[]>([])
const selectedCompany = ref<Company | null>(null)
const companyMembers = ref<any[]>([])

// Member edit modal
const showEditMemberModal = ref(false)
const editingMember = ref<any>(null)
const editingMemberRole = ref('MEMBER')

// Modals
const showCompanyModal = ref(false)
const showEditCompanyModal = ref(false)
const showAuthModal = ref(false)
const showUserModal = ref(false)
const selectedUserForAuth = ref<any>(null)
const editModalCompany = ref<Company | null>(null)

// 公司詳情中地址欄位標籤：一律顯示公司地址
const selectedCompanyAddressLabel = computed(() => '公司地址')

// 公司權限選項（公司層級只有權限，沒有職位）
const companyRoleOptions = [
  { value: 'OWNER', label: '公司擁有者 (OWNER)' },
  { value: 'ADMIN', label: '公司管理員 (ADMIN)' },
  { value: 'MEMBER', label: '公司成員 (MEMBER)' }
]

// 用戶表單數據
const userForm = reactive({
  username: '',
  email: '',
  password: '',
  role: 'USER',
  companyRole: 'MEMBER'
})

// 初始化
onMounted(() => {
  fetchCompanies()
})

const fetchCompanies = async () => {
  isLoading.value = true
  try {
    companies.value = await companyApi.adminGetAll()
  } catch (error) {
    console.error('Fetch companies failed:', error)
    toast.error('無法載入公司列表')
  } finally {
    isLoading.value = false
  }
}

const handleSelectCompany = async (company: Company) => {
  selectedCompany.value = company
  viewMode.value = 'DETAIL'
  await fetchMembers(company.companyId)
}

const fetchMembers = async (companyId: string) => {
  isLoading.value = true
  try {
    companyMembers.value = await companyApi.getMembers(companyId)
  } catch (error) {
    console.error('Fetch members failed:', error)
    toast.error('無法載入成員列表')
  } finally {
    isLoading.value = false
  }
}

// 公司建立
const handleCreateCompany = async (data: any) => {
  try {
    await companyApi.create(data)
    toast.success('公司建立成功')
    showCompanyModal.value = false
    fetchCompanies()
  } catch (error: any) {
    toast.error(error.message || '建立失敗')
  }
}

// 公司編輯（管理員）
const handleEditCompany = async (data: CreateCompanyRequest) => {
  const targetId = editModalCompany.value?.companyId
  if (!targetId) return
  try {
    await companyApi.adminUpdate({
      companyId: targetId,
      companyName: data.companyName,
      companyUnifiedNumber: data.companyUnifiedNumber,
      companyType: data.companyType,
      contractorLevel: data.contractorLevel,
      address: data.address,
      phone: data.phone
    })
    toast.success('公司資料已更新')
    showEditCompanyModal.value = false
    editModalCompany.value = null
    await fetchCompanies()
    if (selectedCompany.value?.companyId === targetId) {
      const updated = companies.value.find(c => c.companyId === targetId)
      if (updated) selectedCompany.value = updated
    }
  } catch (error: any) {
    toast.error(error.message || '更新失敗')
  }
}

// 從列表開啟編輯公司 modal
const openEditCompanyFromList = (company: Company) => {
  editModalCompany.value = company
  showEditCompanyModal.value = true
}

// 從詳情頁開啟編輯公司 modal
const openEditCompanyFromDetail = () => {
  editModalCompany.value = selectedCompany.value
  showEditCompanyModal.value = true
}

// 工地人員管理
const handleSitePersonnel = (company: Company) => {
  selectedCompany.value = company
  viewMode.value = 'SITE_PERSONNEL'
}

// 人員管理（獨立頁）
const handleMembersView = (company: Company) => {
  selectedCompany.value = company
  viewMode.value = 'MEMBERS'
}

// 用戶建立
const handleCreateUser = async () => {
  if (!selectedCompany.value || !userForm.email || !userForm.username) return
  
  try {
    await userApi.create({
      ...userForm,
      companyId: selectedCompany.value.companyId
    })
    toast.success('帳號建立成功')
    showUserModal.value = false
    // 重置表單
    userForm.username = ''
    userForm.email = ''
    userForm.password = ''
    userForm.role = 'USER'
    // 重新載入成員
    fetchMembers(selectedCompany.value.companyId)
  } catch (error: any) {
    console.error(error)
    toast.error(error.response?.data?.message || '帳號建立失敗')
  }
}

// 開啟權限管理
const openAuthModal = (user: any) => {
  selectedUserForAuth.value = user
  showAuthModal.value = true
}

const openEditMemberModal = (member: any) => {
  editingMember.value = member
  editingMemberRole.value = String(member?.role || 'MEMBER')
  showEditMemberModal.value = true
}

const handleUpdateMemberPermission = async () => {
  if (!selectedCompany.value?.companyId || !editingMember.value) return
  const targetUserId = editingMember.value.userId || editingMember.value.id
  if (!targetUserId) return
  try {
    await companyApi.updateMemberPermission(selectedCompany.value.companyId, targetUserId, editingMemberRole.value)
    toast.success('成員權限已更新')
    showEditMemberModal.value = false
    editingMember.value = null
    await fetchMembers(selectedCompany.value.companyId)
  } catch (error: any) {
    console.error('Update member permission failed:', error)
    toast.error(error.response?.data?.message || '更新失敗')
  }
}

// 移除成員
const handleRemoveMember = async (member: any) => {
  if (!selectedCompany.value) return
  
  if (member.role === 'OWNER') {
    toast.error('無法移除公司擁有者 (OWNER)')
    return
  }

  if (!confirm(`確定要將「${member.username || member.name}」從公司中移除嗎？此操作無法復原。`)) {
    return
  }

  try {
    const userId = member.userId || member.id 
    await companyApi.removeMember(selectedCompany.value.companyId, userId)
    
    toast.success('成員已成功移除')
    await fetchMembers(selectedCompany.value.companyId)
  } catch (error: any) {
    console.error('移除失敗:', error)
    toast.error(error.response?.data?.message || '移除失敗')
  }
}

// 邀請相關狀態
const showInviteModal = ref(false)
const inviteKeyword = ref('')
const inviteResults = ref<User[]>([])
const inviteRole = ref('MEMBER')
const isSearching = ref(false)

// 開啟邀請視窗
const openInviteModal = () => {
  inviteKeyword.value = ''
  inviteResults.value = []
  inviteRole.value = 'MEMBER'
  showInviteModal.value = true
}

// 搜尋用戶
const handleSearchUsers = async () => {
  if (!inviteKeyword.value.trim()) return
  
  isSearching.value = true
  try {
    inviteResults.value = await userApi.search(inviteKeyword.value)
  } catch (error) {
    console.error('Search failed:', error)
    toast.error('搜尋失敗')
  } finally {
    isSearching.value = false
  }
}

// 邀請用戶
const handleInviteUser = async (user: User) => {
  if (!selectedCompany.value) return
  
  try {
    await companyApi.inviteMember({
      userId: user.userId,
      companyId: selectedCompany.value.companyId,
      role: inviteRole.value
    })
    
    toast.success(`已邀請 ${user.username}`)
    // 從搜尋結果中移除 (或標記為已邀請)
    inviteResults.value = inviteResults.value.filter(u => u.userId !== user.userId)
    // 重新載入成員列表
    await fetchMembers(selectedCompany.value.companyId)
  } catch (error: any) {
    console.error('Invite failed:', error)
    toast.error(error.response?.data?.message || '邀請失敗')
  }
}

// 返回列表
const backToList = () => {
  viewMode.value = 'LIST'
  selectedCompany.value = null
  companyMembers.value = []
}

const pageTitle = computed(() => {
  if (viewMode.value === 'LIST') return '公司與用戶管理中心'
  if (viewMode.value === 'MEMBERS') return `${selectedCompany.value?.companyName || '公司'} - 人員管理`
  if (viewMode.value === 'SITE_PERSONNEL') return `${selectedCompany.value?.companyName || '公司'} - 工地人員管理`
  return `${selectedCompany.value?.companyName || '公司'} - 人員管理`
})

const headerActions = computed(() => {
  if (viewMode.value === 'LIST') {
    return [{ text: '新增公司', icon: 'fa fa-plus', variant: 'btn-theme', click: () => { showCompanyModal.value = true } }]
  }
  return [{ text: '返回列表', icon: 'fa fa-arrow-left', variant: 'btn-secondary', click: backToList }]
})
</script>

<template>
  <div class="company-management-hub app-page">
    <PageHeader
      :title="pageTitle"
      icon="fa fa-building"
      :breadcrumbs="[
        { text: '系統管理', href: '#' },
        { text: '公司與用戶管理中心', active: true }
      ]"
      :actions="headerActions"
    />

    <!-- VIEW: Company List -->
    <div v-if="viewMode === 'LIST'" class="grid-wrapper">
      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      <ejs-grid
        v-else
        ref="companyGrid"
        :dataSource="companies"
        :allowPaging="true"
        :pageSettings="pageSettings"
        :allowSorting="true"
        :allowFiltering="true"
        :allowResizing="true"
        :height="'100%'"
        locale="zh-TW"
      >
        <e-columns>
          <e-column field="companyName" headerText="公司名稱" width="220" textAlign="Left" :template="'companyNameTemplate'"></e-column>
          <e-column field="companyType" headerText="類型" width="120" textAlign="Center" :template="'companyTypeTemplate'"></e-column>
          <e-column field="companyCode" headerText="統編" width="140" textAlign="Left"></e-column>
          <e-column field="memberCount" headerText="成員數" width="100" textAlign="Center" :template="'memberCountTemplate'"></e-column>
          <e-column headerText="操作" width="320" textAlign="Center" :template="'companyActionsTemplate'"></e-column>
        </e-columns>

        <template v-slot:companyNameTemplate="{ data }">
          <span class="fw-bold text-theme cursor-pointer" @click="handleSelectCompany(data)">{{ data.companyName }}</span>
        </template>

        <template v-slot:companyTypeTemplate="{ data }">
          <span :class="companyTypeBadgeClass(data.companyType)">{{ formatCompanyType(data.companyType) }}</span>
        </template>

        <template v-slot:memberCountTemplate="{ data }">
          <span class="badge bg-secondary rounded-pill">{{ data.memberCount || 0 }}</span>
        </template>

        <template v-slot:companyActionsTemplate="{ data }">
          <button type="button" class="btn btn-sm btn-outline-secondary me-1" title="編輯公司" @click.stop="openEditCompanyFromList(data)">
            <i class="fa fa-pen me-1"></i>編輯公司
          </button>
          <button type="button" class="btn btn-sm btn-outline-theme me-1" title="人員管理" @click.stop="handleSelectCompany(data)">
            <i class="fa fa-users me-1"></i>人員管理
          </button>
          <button type="button" class="btn btn-sm btn-outline-warning" title="工地人員" @click.stop="handleSitePersonnel(data)">
            <i class="fa fa-hard-hat me-1"></i>工地人員
          </button>
        </template>
      </ejs-grid>
    </div>

    <!-- VIEW: Members (Admin 獨立人員管理) -->
    <div v-else-if="viewMode === 'MEMBERS' && selectedCompany">
      <CompanyMemberManagement :company-id="selectedCompany.companyId" />
    </div>

    <!-- VIEW: Site Personnel (工地人員管理) -->
    <div v-else-if="viewMode === 'SITE_PERSONNEL' && selectedCompany">
      <SitePersonnelManagement
        :company-id="selectedCompany.companyId"
        :company-name="selectedCompany.companyName"
        :company-type="(selectedCompany.companyType === 'SUPERVISION' || selectedCompany.companyType === 'CONTRACTOR' ? selectedCompany.companyType : 'CONTRACTOR')"
      />
    </div>

    <!-- VIEW: Company Detail & Members -->
    <div v-else-if="viewMode === 'DETAIL'">
      <div class="row">
        <!-- Company Info -->
        <div class="col-md-4 mb-3">
          <Card class="h-100">
            <CardHeader class="fw-bold">公司資訊</CardHeader>
            <CardBody>
              <h3 class="mb-3">{{ selectedCompany?.companyName }}</h3>
              <div class="mb-2">
                <span class="text-muted d-block small">統一編號</span>
                <span class="fw-bold fs-5">{{ selectedCompany?.companyCode }}</span>
              </div>
              <div class="mb-2">
                <span class="text-muted d-block small">類型</span>
                <span>{{ selectedCompany?.companyType === 'CONTRACTOR' ? '營造廠商' : selectedCompany?.companyType === 'SUPERVISION' ? '監造單位' : '第三方' }}</span>
              </div>
              <div class="mb-2">
                <span class="text-muted d-block small">{{ selectedCompanyAddressLabel }}</span>
                <span class="fw-bold">{{ selectedCompany?.address || '未填寫' }}</span>
              </div>
              <div class="mb-2">
                <span class="text-muted d-block small">公司電話</span>
                <span class="fw-bold">{{ selectedCompany?.phone || '未填寫' }}</span>
              </div>
              <hr>
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span class="text-muted small">ID: {{ selectedCompany?.companyId }}</span>
                <button type="button" class="btn btn-sm btn-outline-theme" @click="openEditCompanyFromDetail">
                  <i class="fa fa-pen me-1"></i>編輯公司
                </button>
              </div>
            </CardBody>
          </Card>
        </div>

        <!-- Member Management -->
        <div class="col-md-8 mb-3">
          <Card class="h-100">
            <CardHeader class="d-flex justify-content-between align-items-center border-bottom">
              <span class="fw-bold">
                <i class="fa fa-users me-2 text-primary"></i>所屬人員列表
              </span>
              <div>
                <button class="btn btn-sm btn-outline-primary me-2" @click="openInviteModal">
                  <i class="fa fa-search-plus me-1"></i> 邀請現有成員
                </button>
                <button class="btn btn-sm btn-outline-success" @click="showUserModal = true">
                  <i class="fa fa-user-plus me-1"></i> 新增帳號
                </button>
              </div>
            </CardHeader>
            <CardBody class="p-0">
              <div class="grid-wrapper grid-wrapper--compact">
                <div v-if="isLoading" class="text-center py-5">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                </div>
                <ejs-grid
                  v-else
                  ref="memberGrid"
                  :dataSource="companyMembers"
                  :allowPaging="true"
                  :pageSettings="pageSettings"
                  :allowSorting="true"
                  :allowFiltering="true"
                  :allowResizing="true"
                  :height="'100%'"
                  locale="zh-TW"
                >
                  <e-columns>
                    <e-column field="username" headerText="姓名" width="160" textAlign="Left" :template="'memberNameTemplate'"></e-column>
                    <e-column field="email" headerText="Email" width="220" textAlign="Left"></e-column>
                    <e-column field="role" headerText="角色" width="120" textAlign="Center" :template="'memberRoleTemplate'"></e-column>
                    <e-column headerText="權限管理" width="320" textAlign="Center" :template="'memberActionsTemplate'"></e-column>
                  </e-columns>

                  <template v-slot:memberNameTemplate="{ data }">
                    <span class="fw-bold">{{ data.username || data.name || '-' }}</span>
                  </template>

                  <template v-slot:memberRoleTemplate="{ data }">
                    <span class="badge bg-secondary border border-secondary">{{ data.role || 'MEMBER' }}</span>
                  </template>

                  <template v-slot:memberActionsTemplate="{ data }">
                    <button type="button" class="btn btn-sm btn-primary me-2" @click.stop="openAuthModal(data)">
                      <i class="fa fa-key me-1"></i> 管理專案權限
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary me-2" @click.stop="openEditMemberModal(data)">
                      <i class="fa fa-pen me-1"></i> 編輯
                    </button>
                    <button
                      v-if="data.role !== 'OWNER'"
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      @click.stop="handleRemoveMember(data)"
                    >
                      <i class="fa fa-trash"></i>
                    </button>
                  </template>
                </ejs-grid>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>

    <!-- Modal: Create Company -->
    <CompanyFormModal 
      v-model:show="showCompanyModal" 
      :company="null"
      @submit="handleCreateCompany"
    />

    <!-- Modal: Edit Company -->
    <CompanyFormModal
      v-model:show="showEditCompanyModal"
      :company="editModalCompany"
      @submit="handleEditCompany"
    />

    <!-- Modal: Authorization -->
    <AuthorizationModal
      v-model="showAuthModal"
      :user="selectedUserForAuth"
      :company-id="selectedCompany?.companyId"
    />

    <!-- Modal: Edit Member Permission -->
    <div v-if="showEditMemberModal" class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">編輯成員資料</h5>
            <button type="button" class="btn-close" @click="showEditMemberModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-2">
              <div class="text-muted small">成員</div>
              <div class="fw-bold">{{ editingMember?.username || editingMember?.name || '-' }}</div>
              <div class="text-muted small">{{ editingMember?.email || '-' }}</div>
            </div>
            <div class="mb-3">
              <label class="form-label">公司權限</label>
              <select class="form-select" v-model="editingMemberRole">
                <option v-for="opt in companyRoleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <div class="text-muted small mt-2">
                注意：若為最後一位 OWNER，系統將不允許降級。
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="showEditMemberModal = false">取消</button>
            <button type="button" class="btn btn-primary" @click="handleUpdateMemberPermission">儲存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Create User (Simple Inline) -->
    <div v-if="showUserModal" class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">新增公司帳號</h5>
            <button type="button" class="btn-close" @click="showUserModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleCreateUser">
              <div class="mb-3">
                <label class="form-label">姓名 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" v-model="userForm.username" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Email (帳號) <span class="text-danger">*</span></label>
                <input type="email" class="form-control" v-model="userForm.email" required>
              </div>
              <div class="mb-3">
                <label class="form-label">密碼 (選填)</label>
                <input type="password" class="form-control" v-model="userForm.password" placeholder="若留空則由系統生成">
              </div>

              <div class="mb-3">
                <label class="form-label">公司權限</label>
                <select class="form-select" v-model="userForm.companyRole">
                  <option v-for="opt in companyRoleOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <small class="form-text text-muted">注意：職位（如勞安、工地負責人等）需在工程案層級設定</small>
              </div>
              <div class="d-flex justify-content-end mt-4">
                <button type="button" class="btn btn-secondary me-2" @click="showUserModal = false">取消</button>
                <button type="submit" class="btn btn-primary">建立帳號</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Invite User -->
    <div v-if="showInviteModal" class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">邀請現有成員</h5>
            <button type="button" class="btn-close" @click="showInviteModal = false"></button>
          </div>
          <div class="modal-body">
            <!-- 搜尋區 -->
            <div class="input-group mb-3">
              <input type="text" class="form-control" placeholder="輸入姓名或 Email 搜尋..." 
                v-model="inviteKeyword" @keyup.enter="handleSearchUsers">
              <button class="btn btn-primary" type="button" @click="handleSearchUsers" :disabled="isSearching">
                <i class="fa fa-search me-1"></i> 搜尋
              </button>
            </div>

            <!-- 共用權限設定 (簡化操作) -->
            <div class="mb-3 d-flex align-items-center">
               <label class="me-2 text-nowrap">預設指派權限:</label>
               <select class="form-select form-select-sm" style="width: auto;" v-model="inviteRole">
                  <option v-for="opt in companyRoleOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
               </select>
            </div>
            <small class="form-text text-muted d-block mb-3">注意：職位（如勞安、工地負責人等）需在工程案層級設定</small>

            <!-- 搜尋結果列表 -->
            <div class="list-group" v-if="inviteResults.length > 0">
              <div class="list-group-item d-flex justify-content-between align-items-center" v-for="user in inviteResults" :key="user.userId">
                <div>
                   <div class="fw-bold">{{ user.username }} ({{ user.role }})</div>
                   <div class="text-muted small">{{ user.email }}</div>
                   <div class="text-info small" v-if="user.companyIds && user.companyIds.length > 0">
                      已加入其他公司
                   </div>
                </div>
                <button class="btn btn-sm btn-outline-theme" @click="handleInviteUser(user)">
                  邀請加入
                </button>
              </div>
            </div>
            
            <div v-else-if="inviteKeyword && !isSearching" class="text-center py-4 text-muted">
               查無相關用戶，請嘗試其他關鍵字。
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.grid-wrapper {
  height: 600px;
}

.grid-wrapper--compact {
  height: 480px;
}
</style>
