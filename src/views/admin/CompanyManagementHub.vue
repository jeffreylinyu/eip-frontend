<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { companyApi, companyDataTransform, type Company, type CreateCompanyRequest } from '@/api/company'
import { userApi, type User } from '@/api/user'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CompanyFormModal from '@/components/company/CompanyFormModal.vue'
import AuthorizationModal from '@/components/admin/AuthorizationModal.vue'
import { getCurrentInstance } from 'vue'

const { proxy } = getCurrentInstance() as any
const toast = {
  success: (msg: string) => proxy?.$toast?.success(msg),
  error: (msg: string) => proxy?.$toast?.error(msg)
}

// 狀態管理
const viewMode = ref<'LIST' | 'DETAIL'>('LIST')
const isLoading = ref(false)
const companies = ref<Company[]>([])
const selectedCompany = ref<Company | null>(null)
const companyMembers = ref<any[]>([])

// Modals
const showCompanyModal = ref(false)
const showAuthModal = ref(false)
const showUserModal = ref(false)
const selectedUserForAuth = ref<any>(null)

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
</script>

<template>
  <div class="company-management-hub container-fluid">
    <!-- Breadcrumb & Header -->
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h1 class="page-header mb-1">
          <i class="fa fa-building text-theme me-2"></i>公司與用戶管理6中心
        </h1>
        <small class="text-muted">由大到小管理：公司 ➔ 人員 ➔ 專案授權</small>
      </div>
      
      <div v-if="viewMode === 'LIST'">
        <button class="btn btn-theme" @click="showCompanyModal = true">
          <i class="fa fa-plus me-1"></i> 新增公司
        </button>
      </div>
      <div v-else>
        <button class="btn btn-secondary" @click="backToList">
          <i class="fa fa-arrow-left me-1"></i> 返回列表
        </button>
      </div>
    </div>

    <!-- VIEW: Company List -->
    <Card v-if="viewMode === 'LIST'">
      <CardHeader class="fw-bold fs-6">所有註冊公司 ({{ companies.length }})</CardHeader>
            <CardBody class="p-0">
              <div class="table-responsive">
                <table class="table table-hover table-striped align-middle mb-0">
                  <thead>
                    <tr>
                      <th class="ps-4">公司名稱</th>
                      <th>類型</th>
                      <th>統編</th>
                      <th>成員數</th>
                      <th class="text-end pe-4">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="company in companies" :key="company.companyId" class="cursor-pointer" @click="handleSelectCompany(company)">
                      <td class="ps-4 fw-bold text-theme">{{ company.companyName }}</td>
                      <td>
                        <span class="badge" 
                          :class="{
                            'bg-primary': company.companyType === 'CONTRACTOR',
                            'bg-info': company.companyType === 'SUPERVISION',
                            'bg-success': company.companyType === 'THIRD_PARTY'
                          }"
                        >
                          {{ company.companyType === 'CONTRACTOR' ? '營造廠商' : 
                             company.companyType === 'SUPERVISION' ? '監造單位' : '第三方' }}
                        </span>
                      </td>
                      <td>{{ company.companyCode }}</td>
                      <td>
                        <span class="badge bg-secondary rounded-pill">{{ company.memberCount || 0 }}</span>
                      </td>
                      <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-theme" @click.stop="handleSelectCompany(company)">
                          管理人員
                        </button>
                      </td>
                    </tr>
                    <tr v-if="!companies.length && !isLoading">
                      <td colspan="5" class="text-center py-5 text-muted">目前沒有公司資料</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

    <!-- VIEW: Company Detail & Members -->
    <div v-else>
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
                <span>{{ selectedCompany?.companyType }}</span>
              </div>
              <hr>
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted small">ID: {{ selectedCompany?.companyId }}</span>
                <!-- 未來可加入編輯功能 -->
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
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th class="ps-4">姓名</th>
                      <th>Email</th>
                      <th>角色</th>
                      <th class="text-end pe-4">權限管理</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="member in companyMembers" :key="member.id || member.userId">
                      <td class="ps-4 fw-bold">{{ member.username || member.name }}</td>
                      <td>{{ member.email }}</td>
                      <td>
                        <span class="badge bg-secondary border border-secondary">{{ member.role || 'MEMBER' }}</span>
                      </td>
                      <td class="text-end pe-4">
                        <button class="btn btn-sm btn-primary me-2" @click="openAuthModal(member)">
                          <i class="fa fa-key me-1"></i> 管理專案權限
                        </button>
                        <button class="btn btn-sm btn-outline-danger" @click="handleRemoveMember(member)" v-if="member.role !== 'OWNER'">
                          <i class="fa fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                    <tr v-if="!companyMembers.length">
                      <td colspan="4" class="text-center py-5 text-muted">
                        尚無成員資料，請點擊上方按鈕新增。
                      </td>
                    </tr>
                  </tbody>
                </table>
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

    <!-- Modal: Authorization -->
    <AuthorizationModal
      v-model="showAuthModal"
      :user="selectedUserForAuth"
      :company-id="selectedCompany?.companyId"
    />

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
.cursor-pointer { cursor: pointer; }
.page-header { font-size: 1.5rem; font-weight: 700; color: var(--bs-body-color); }
</style>
