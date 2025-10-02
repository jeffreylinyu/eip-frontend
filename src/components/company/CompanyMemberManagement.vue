<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'

interface CompanyMember {
  id: string
  userId: string
  userName: string
  userEmail: string
  userPhone?: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  invitedBy?: string
  companyId: string
  companyName: string
}

const props = defineProps<{
  companyId: string
}>()

const companyStore = useCompanyStore()

// 狀態
const isLoading = ref(false)
const searchQuery = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const showInviteModal = ref(false)
const showEditModal = ref(false)
const editingMember = ref<CompanyMember | null>(null)

// 邀請表單
const inviteForm = ref({
  email: '',
  role: 'MEMBER' as CompanyMember['role'],
  message: ''
})

// 假資料 - 實際應該從 API 獲取
const members = ref<CompanyMember[]>([
  {
    id: 'member-001',
    userId: 'user-001',
    userName: '王小明',
    userEmail: 'wang@example.com',
    userPhone: '0912-345-678',
    role: 'OWNER',
    joinedAt: '2024-01-15T08:00:00Z',
    status: 'ACTIVE',
    companyId: 'comp-001',
    companyName: '台灣建設股份有限公司'
  },
  {
    id: 'member-002',
    userId: 'user-002',
    userName: '李小華',
    userEmail: 'lee@example.com',
    userPhone: '0923-456-789',
    role: 'ADMIN',
    joinedAt: '2024-02-01T09:30:00Z',
    status: 'ACTIVE',
    invitedBy: 'user-001',
    companyId: 'comp-001',
    companyName: '台灣建設股份有限公司'
  },
  {
    id: 'member-003',
    userId: 'user-003',
    userName: '張工程師',
    userEmail: 'zhang@example.com',
    role: 'MEMBER',
    joinedAt: '2024-02-15T14:20:00Z',
    status: 'ACTIVE',
    invitedBy: 'user-001',
    companyId: 'comp-001',
    companyName: '台灣建設股份有限公司'
  },
  {
    id: 'member-004',
    userId: 'user-004',
    userName: '陳助理',
    userEmail: 'chen@example.com',
    role: 'VIEWER',
    joinedAt: '2024-03-01T10:15:00Z',
    status: 'PENDING',
    invitedBy: 'user-002',
    companyId: 'comp-001',
    companyName: '台灣建設股份有限公司'
  }
])

// 計算屬性
const filteredMembers = computed(() => {
  let filtered = members.value

  // 搜索過濾
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(member =>
      member.userName.toLowerCase().includes(query) ||
      member.userEmail.toLowerCase().includes(query) ||
      (member.userPhone && member.userPhone.includes(query))
    )
  }

  // 角色過濾
  if (selectedRole.value) {
    filtered = filtered.filter(member => member.role === selectedRole.value)
  }

  // 狀態過濾
  if (selectedStatus.value) {
    filtered = filtered.filter(member => member.status === selectedStatus.value)
  }

  return filtered
})

const memberStats = computed(() => {
  const total = members.value.length
  const active = members.value.filter(m => m.status === 'ACTIVE').length
  const pending = members.value.filter(m => m.status === 'PENDING').length
  const inactive = members.value.filter(m => m.status === 'INACTIVE').length
  const byRole = {
    OWNER: members.value.filter(m => m.role === 'OWNER').length,
    ADMIN: members.value.filter(m => m.role === 'ADMIN').length,
    MEMBER: members.value.filter(m => m.role === 'MEMBER').length,
    VIEWER: members.value.filter(m => m.role === 'VIEWER').length
  }
  return { total, active, pending, inactive, byRole }
})

// 方法
const getRoleLabel = (role: string) => {
  const roleMap: Record<string, string> = {
    'OWNER': '擁有者',
    'ADMIN': '管理員',
    'MEMBER': '成員',
    'VIEWER': '檢視者'
  }
  return roleMap[role] || role
}

const getRoleColor = (role: string) => {
  const colorMap: Record<string, string> = {
    'OWNER': 'danger',
    'ADMIN': 'warning',
    'MEMBER': 'primary',
    'VIEWER': 'secondary'
  }
  return colorMap[role] || 'secondary'
}

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    'ACTIVE': '已加入',
    'INACTIVE': '已停用',
    'PENDING': '待確認'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    'ACTIVE': 'success',
    'INACTIVE': 'secondary',
    'PENDING': 'warning'
  }
  return colorMap[status] || 'secondary'
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const canEditMember = (member: CompanyMember) => {
  // 只有擁有者和管理員可以編輯成員
  // 擁有者不能被編輯（除了自己）
  return member.role !== 'OWNER'
}

const canRemoveMember = (member: CompanyMember) => {
  // 只有擁有者和管理員可以移除成員
  // 擁有者不能被移除
  return member.role !== 'OWNER'
}

// 邀請成員
const openInviteModal = () => {
  inviteForm.value = {
    email: '',
    role: 'MEMBER',
    message: ''
  }
  showInviteModal.value = true
}

const inviteMember = async () => {
  isLoading.value = true
  try {
    // console.log('邀請成員:', inviteForm.value)
    // TODO: 調用邀請 API
    
    // 模擬邀請成功
    const newMember: CompanyMember = {
      id: `member-${Date.now()}`,
      userId: `user-${Date.now()}`,
      userName: inviteForm.value.email.split('@')[0],
      userEmail: inviteForm.value.email,
      role: inviteForm.value.role,
      joinedAt: new Date().toISOString(),
      status: 'PENDING',
      invitedBy: 'current-user',
      companyId: props.companyId,
      companyName: '當前公司'
    }
    
    members.value.push(newMember)
    showInviteModal.value = false
  } catch (error) {
    console.error('邀請成員失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 編輯成員
const editMember = (member: CompanyMember) => {
  editingMember.value = { ...member }
  showEditModal.value = true
}

const updateMember = async () => {
  if (!editingMember.value) return
  
  isLoading.value = true
  try {
    // console.log('更新成員:', editingMember.value)
    // TODO: 調用更新 API
    
    // 模擬更新成功
    const index = members.value.findIndex(m => m.id === editingMember.value!.id)
    if (index !== -1) {
      members.value[index] = { ...editingMember.value }
    }
    
    showEditModal.value = false
    editingMember.value = null
  } catch (error) {
    console.error('更新成員失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 移除成員
const removeMember = async (member: CompanyMember) => {
  const confirmed = window.confirm(`確定要移除成員「${member.userName}」嗎？`)
  if (!confirmed) return
  
  isLoading.value = true
  try {
    // console.log('移除成員:', member.id)
    // TODO: 調用移除 API
    
    // 模擬移除成功
    members.value = members.value.filter(m => m.id !== member.id)
  } catch (error) {
    console.error('移除成員失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 重新發送邀請
const resendInvitation = async (member: CompanyMember) => {
  isLoading.value = true
  try {
    // console.log('重新發送邀請:', member.id)
    // TODO: 調用重新發送邀請 API
  } catch (error) {
    console.error('重新發送邀請失敗:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  // 載入成員資料
  // console.log('載入公司成員:', props.companyId)
})
</script>

<template>
  <div class="company-member-management">


    <!-- 操作區域 -->
    <Card class="mb-4">
      <CardBody>
        <!-- 統計摘要 -->
        <div class="row mb-3">
          <div class="col-12">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-4">
                <span class="text-muted">總計：</span>
                <span class="badge border border-primary text-primary">{{ members.length }} 人</span>
                <span class="badge border border-success text-success">{{ memberStats.byRole.OWNER }} 擁有者</span>
                <span class="badge border border-info text-info">{{ memberStats.byRole.ADMIN }} 管理員</span>
                <span class="badge border border-warning text-warning">{{ memberStats.byRole.MEMBER }} 成員</span>
                <span class="badge border border-secondary text-secondary">{{ memberStats.byRole.VIEWER }} 檢視者</span>
                <span class="text-muted ms-3">狀態：</span>
                <span class="badge border border-success text-success">{{ memberStats.active }} 已加入</span>
                <span class="badge border border-warning text-warning">{{ memberStats.pending }} 待確認</span>
                <span class="badge border border-danger text-danger">{{ memberStats.inactive }} 已停用</span>
              </div>
              <small class="text-muted">顯示 {{ filteredMembers.length }} / {{ members.length }} 人</small>
            </div>
          </div>
        </div>

        <div class="row g-3">
          <!-- 搜索框 -->
          <div class="col-md-6">
            <div class="input-group">
              <span class="input-group-text">
                <i class="fa fa-search"></i>
              </span>
              <input 
                type="text" 
                class="form-control" 
                placeholder="搜索成員姓名、信箱或電話..."
                v-model="searchQuery"
              />
            </div>
          </div>

          <!-- 角色過濾 -->
          <div class="col-md-2">
            <select class="form-select" v-model="selectedRole">
              <option value="">所有角色</option>
              <option value="OWNER">擁有者</option>
              <option value="ADMIN">管理員</option>
              <option value="MEMBER">成員</option>
              <option value="VIEWER">檢視者</option>
            </select>
          </div>

          <!-- 狀態過濾 -->
          <div class="col-md-2">
            <select class="form-select" v-model="selectedStatus">
              <option value="">所有狀態</option>
              <option value="ACTIVE">已加入</option>
              <option value="PENDING">待確認</option>
              <option value="INACTIVE">已停用</option>
            </select>
          </div>

          <!-- 邀請成員 -->
          <div class="col-md-2">
            <button 
              class="btn btn-theme w-100"
              @click="openInviteModal"
            >
              <i class="fa fa-plus me-2"></i>
              邀請成員
            </button>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- 成員列表 -->
    <Card>
      <CardBody class="p-0">
        <div v-if="filteredMembers.length === 0" class="text-center py-5">
          <i class="fa fa-users fa-3x text-muted mb-3"></i>
          <h5 class="text-muted">沒有找到成員</h5>
          <p class="text-muted">請嘗試調整搜索條件或邀請新成員</p>
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="">
              <tr>
                <th class="px-4 py-3">成員資訊</th>
                <th class="px-4 py-3">角色</th>
                <th class="px-4 py-3">狀態</th>
                <th class="px-4 py-3">加入時間</th>
                <th class="px-4 py-3">邀請者</th>
                <th class="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in filteredMembers" :key="member.id">
                <td class="px-4 py-3">
                  <div class="d-flex align-items-center">
                    <div class="avatar-circle me-3">
                      {{ member.userName.charAt(0) }}
                    </div>
                    <div>
                      <div class="fw-bold">{{ member.userName }}</div>
                      <div class="text-muted small">{{ member.userEmail }}</div>
                      <div v-if="member.userPhone" class="text-muted small">
                        <i class="fa fa-phone me-1"></i>
                        {{ member.userPhone }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span 
                    class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                    :class="`border-${getRoleColor(member.role)} text-${getRoleColor(member.role)}`"
                  >
                    <i class="fa fa-crown me-1" v-if="member.role === 'OWNER'"></i>
                    <i class="fa fa-user-shield me-1" v-else-if="member.role === 'ADMIN'"></i>
                    <i class="fa fa-user me-1" v-else-if="member.role === 'MEMBER'"></i>
                    <i class="fa fa-eye me-1" v-else></i>
                    {{ getRoleLabel(member.role) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span 
                    class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                    :class="`border-${getStatusColor(member.status)} text-${getStatusColor(member.status)}`"
                  >
                    {{ getStatusLabel(member.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-muted small">
                  {{ formatDate(member.joinedAt) }}
                </td>
                <td class="px-4 py-3 text-muted small">
                  {{ member.invitedBy ? '已邀請' : '-' }}
                </td>
                <td class="px-4 py-3">
                  <div class="d-flex justify-content-center gap-1">
                    <button 
                      v-if="canEditMember(member)"
                      class="btn btn-sm btn-outline-theme"
                      @click="editMember(member)"
                      title="編輯成員"
                    >
                      <i class="fa fa-edit"></i>
                    </button>
                    <button 
                      v-if="member.status === 'PENDING'"
                      class="btn btn-sm btn-outline-warning"
                      @click="resendInvitation(member)"
                      title="重新發送邀請"
                    >
                      <i class="fa fa-paper-plane"></i>
                    </button>
                    <button 
                      v-if="canRemoveMember(member)"
                      class="btn btn-sm btn-outline-danger"
                      @click="removeMember(member)"
                      title="移除成員"
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

    <!-- 邀請成員模態框 -->
    <Modal
      v-model:show="showInviteModal"
      title="邀請新成員"
      @submit="inviteMember"
      :isLoading="isLoading"
    >
      <form @submit.prevent="inviteMember">
        <div class="mb-3">
          <label class="form-label">電子信箱 *</label>
          <input 
            type="email" 
            class="form-control" 
            v-model="inviteForm.email"
            placeholder="請輸入要邀請的電子信箱"
            required
          />
        </div>
        <div class="mb-3">
          <label class="form-label">角色 *</label>
          <select class="form-select" v-model="inviteForm.role" required>
            <option value="MEMBER">成員</option>
            <option value="ADMIN">管理員</option>
            <option value="VIEWER">檢視者</option>
          </select>
          <div class="form-text">
            <small class="text-muted">
              • <strong>管理員</strong>：可以管理公司資料和成員<br>
              • <strong>成員</strong>：可以參與專案和查看公司資料<br>
              • <strong>檢視者</strong>：只能查看被授權的內容
            </small>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">邀請訊息</label>
          <textarea 
            class="form-control" 
            rows="3"
            v-model="inviteForm.message"
            placeholder="可以在邀請信中加入自訂訊息..."
          ></textarea>
        </div>
      </form>
    </Modal>

    <!-- 編輯成員模態框 -->
    <Modal
      v-model:show="showEditModal"
      title="編輯成員"
      @submit="updateMember"
      :isLoading="isLoading"
      v-if="editingMember"
    >
      <form @submit.prevent="updateMember">
        <div class="mb-3">
          <label class="form-label">成員姓名</label>
          <input 
            type="text" 
            class="form-control" 
            v-model="editingMember.userName"
            readonly
          />
        </div>
        <div class="mb-3">
          <label class="form-label">電子信箱</label>
          <input 
            type="email" 
            class="form-control" 
            v-model="editingMember.userEmail"
            readonly
          />
        </div>
        <div class="mb-3">
          <label class="form-label">角色 *</label>
          <select class="form-select" v-model="editingMember.role" required>
            <option value="ADMIN">管理員</option>
            <option value="MEMBER">成員</option>
            <option value="VIEWER">檢視者</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">狀態 *</label>
          <select class="form-select" v-model="editingMember.status" required>
            <option value="ACTIVE">已加入</option>
            <option value="INACTIVE">已停用</option>
            <option value="PENDING">待確認</option>
          </select>
        </div>
      </form>
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
  font-size: 1.1rem;
}

.table th {
  font-weight: 600;
  color: var(--bs-body-color);
  border-bottom: 2px solid var(--bs-border-color);
}

.table td {
  vertical-align: middle;
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

</style>