<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { companyApi } from '@/api/company'
import { userApi, type User } from '@/api/user'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import AuthorizationModal from '@/components/admin/AuthorizationModal.vue'
import { getCurrentInstance } from 'vue'

const props = defineProps<{
  companyId: string
}>()

const emit = defineEmits(['back'])

const { proxy } = getCurrentInstance() as any
const toast = {
  success: (msg: string) => proxy?.$toast?.success(msg),
  error: (msg: string) => proxy?.$toast?.error(msg)
}

// 狀態管理
const isLoading = ref(false)
const members = ref<any[]>([])
const showAuthModal = ref(false)
const showInviteModal = ref(false)
const selectedUserForAuth = ref<any>(null)

// 邀請相關
const inviteKeyword = ref('')
const inviteResults = ref<User[]>([])
const inviteRole = ref('MEMBER')
const isSearching = ref(false)

// 公司權限選項（公司層級只有權限，沒有職位）
const companyRoleOptions = [
  { value: 'OWNER', label: '公司擁有者 (OWNER)' },
  { value: 'ADMIN', label: '公司管理員 (ADMIN)' },
  { value: 'MEMBER', label: '公司成員 (MEMBER)' }
]

// 初始化
onMounted(() => {
  fetchMembers()
})

const fetchMembers = async () => {
  if (!props.companyId) return
  isLoading.value = true
  try {
    members.value = await companyApi.getMembers(props.companyId)
  } catch (error) {
    console.error('Fetch members failed:', error)
    toast.error('無法載入成員列表')
  } finally {
    isLoading.value = false
  }
}

// 開啟權限管理
const openAuthModal = (member: any) => {
  selectedUserForAuth.value = member
  showAuthModal.value = true
}

// 移除成員
const handleRemoveMember = async (member: any) => {
  // 優先使用新欄位檢查職位
  const jobTitle = member.jobTitle || member.role
  if (jobTitle === 'OWNER') {
    toast.error('無法移除公司擁有者 (OWNER)')
    return
  }
  if (!confirm(`確定要將「${member.username || member.name}」從公司中移除嗎？此操作無法復原。`)) {
    return
  }
  try {
    const userId = member.userId || member.id 
    await companyApi.removeMember(props.companyId, userId)
    toast.success('成員已成功移除')
    await fetchMembers()
  } catch (error: any) {
    console.error('移除失敗:', error)
    toast.error(error.response?.data?.message || '移除失敗')
  }
}

// --- 邀請相關 ---
const openInviteModal = () => {
  inviteKeyword.value = ''
  inviteResults.value = []
  inviteRole.value = 'MEMBER'
  showInviteModal.value = true
}

const handleSearchUsers = async () => {
  const keyword = inviteKeyword.value.trim()
  if (!keyword) return

  isSearching.value = true
  inviteResults.value = []
  
  try {
    // 雖然 API 可能支援模糊搜尋，但此處強制要求精確匹配 (Exact Match)
    // 只有當輸入的關鍵字完全等於 Email 或 Username 時才顯示結果
    const results = await userApi.search(keyword)
    
    inviteResults.value = results.filter(u => 
      u.email.toLowerCase() === keyword.toLowerCase() || 
      u.username === keyword
    )

  } catch (error) {
    console.error('Search failed:', error)
    toast.error('搜尋失敗')
  } finally {
    isSearching.value = false
  }
}

const handleInviteUser = async (user: User) => {
  try {
    await companyApi.inviteMember({
      userId: user.userId,
      companyId: props.companyId,
      role: inviteRole.value
    })
    toast.success(`已邀請 ${user.username}`)
    // 清空搜尋與結果，讓介面回到初始狀態，方便下一次操作
    inviteKeyword.value = ''
    inviteResults.value = []
    
    await fetchMembers()
  } catch (error: any) {
    console.error('Invite failed:', error)
    toast.error(error.response?.data?.message || '邀請失敗')
  }
}
</script>

<template>
  <div class="company-member-management">
    <Card class="h-100 shadow-sm">
      <CardHeader class="d-flex justify-content-between align-items-center py-3">
        <div class="d-flex align-items-center">
            <span class="fw-bold fs-5">
              <i class="fa fa-users me-2 text-primary"></i>所屬人員列表
            </span>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-primary" @click="openInviteModal">
            <i class="fa fa-search-plus me-1"></i> 邀請現有成員
          </button>
        </div>
      </CardHeader>
      <CardBody class="p-0">
        <div class="table-responsive">
          <table class="table align-middle mb-0 table-hover">
            <thead class="table-light">
              <tr>
                <th class="ps-4">姓名</th>
                <th>Email</th>
                <th>角色</th>
                <th class="text-end pe-4">權限管理</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in members" :key="member.id || member.userId">
                <td class="ps-4 fw-bold">{{ member.username || member.name }}</td>
                <td>{{ member.email }}</td>
                <td>
                  <span class="badge bg-light text-dark border">{{ member.role || 'MEMBER' }}</span>
                </td>
                <td class="text-end pe-4">
                  <button class="btn btn-icon btn-light text-muted me-2" @click="openAuthModal(member)" title="管理權限">
                    <i class="fa fa-key"></i>
                  </button>
                  <button class="btn btn-icon btn-light text-muted" @click="handleRemoveMember(member)" v-if="member.role !== 'OWNER'" title="移除成員">
                    <i class="fa fa-trash"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!members.length && !isLoading">
                <td colspan="4" class="text-center py-5 text-muted">
                  <i class="fa fa-inbox fa-2x mb-3 opacity-50"></i><br>
                  尚無成員資料，請邀請成員加入。
                </td>
              </tr>
              <tr v-if="isLoading">
                <td colspan="4" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>

    <!-- Modal: Authorization (Existing) -->
    <AuthorizationModal
      v-model="showAuthModal"
      :user="selectedUserForAuth"
      :company-id="companyId"
    />

    <!-- Modal: Invite User (Shared Component) -->
    <Modal
      v-model:show="showInviteModal"
      title="邀請現有成員"
      size="lg"
      cancelText="關閉"
      :hideConfirmButton="true"
    >
      <!-- 搜尋區 -->
      <div class="input-group mb-3">
        <input type="text" class="form-control" placeholder="請輸入完整 Email 或帳號..." 
          v-model="inviteKeyword" @keyup.enter="handleSearchUsers">
        <button class="btn btn-primary" type="button" @click="handleSearchUsers" :disabled="isSearching">
          <i class="fa fa-search me-1"></i> 搜尋
        </button>
      </div>

      <!-- 共用角色設定 -->
      <div class="mb-3 d-flex align-items-center">
          <label class="me-2 text-nowrap">預設指派角色:</label>
          <select class="form-select form-select-sm" style="width: auto;" v-model="inviteRole">
            <option v-for="opt in companyRoleOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
      </div>

      <!-- 搜尋結果列表 -->
      <div class="list-group" v-if="inviteResults.length > 0">
        <div class="list-group-item d-flex justify-content-between align-items-center" v-for="user in inviteResults" :key="user.userId">
          <div>
              <div class="fw-bold">{{ user.username }} <span class="badge bg-secondary ms-2">{{ user.role }}</span></div>
              <div class="text-muted small">{{ user.email }}</div>
              <div class="text-info small" v-if="user.companyIds && user.companyIds.length > 0">
                <i class="fa fa-info-circle me-1"></i>已加入其他公司
              </div>
          </div>
          <button class="btn btn-sm btn-outline-primary" @click="handleInviteUser(user)">
            邀請加入
          </button>
        </div>
      </div>
      
      <div v-else-if="inviteKeyword && !isSearching" class="text-center py-4 text-muted">
          請輸入完整資訊以搜尋使用者。
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
</style>