<script setup lang="ts">
import { ref, onMounted, provide, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { userApi, type User } from '@/api/user'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import { Sort, Resize, Filter, Page, GridComponent, ColumnsDirective, ColumnDirective, Toolbar } from '@syncfusion/ej2-vue-grids'

const router = useRouter()
const authStore = useAuthStore()

// 權限檢查
const hasAdminPermission = computed(() => {
  const user = authStore.user
  if (!user) return false
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
})

// Grid 相關
const grid = ref<GridComponent | null>(null)
const gridData = ref<User[]>([])
const isLoading = ref(false)

// 提供 Grid 服務
provide('grid', [Sort, Resize, Filter, Page, Toolbar])

// 分頁設定
const pageSettings = ref({
  pageSize: 20,
  pageSizes: [10, 20, 50, 100],
  pageCount: 5
})

// 載入資料
const loadData = async () => {
  if (!hasAdminPermission.value) return

  isLoading.value = true
  try {
    const data = await userApi.getAll()
    gridData.value = data || []
  } catch (error) {
    console.error('載入用戶列表失敗:', error)
    alert('載入用戶列表失敗，請稍後再試')
  } finally {
    isLoading.value = false
  }
}

// 格式化日期
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return dateString
  }
}

// 格式化角色
const formatRole = (role: string | undefined) => {
  if (!role) return '-'
  const roleMap: Record<string, string> = {
    'SUPER_ADMIN': '系統管理員',
    'ADMIN': '管理員',
    'USER': '一般用戶'
  }
  return roleMap[role] || role
}

// 格式化公司列表（顯示公司名稱）
const formatCompanies = (user: User) => {
  if (user.companyNames && user.companyNames.length > 0) {
    return user.companyNames.join('、')
  }
  if (user.companyIds && user.companyIds.length > 0) {
    // 如果沒有公司名稱，則顯示公司ID（作為後備）
    return user.companyIds.length === 1 ? user.companyIds[0] : `${user.companyIds.length} 家公司`
  }
  return '-'
}

// 初始化
onMounted(() => {
  if (hasAdminPermission.value) {
    loadData()
  } else {
    router.push('/')
  }
})
</script>

<template>
  <div class="user-management-page p-4">
    <PageHeader
      title="用戶管理"
      icon="fa fa-users"
      :breadcrumbs="[
        { text: '公司與用戶管理', href: 'javascript:;' },
        { text: '用戶管理', active: true }
      ]"
    />

    <div class="mb-3 d-flex justify-content-between align-items-center">
      <h5 class="m-0">用戶清單</h5>
      <button class="btn btn-theme" @click="loadData">
        <i class="fa fa-refresh me-1"></i> 重新載入
      </button>
    </div>

    <div class="grid-wrapper">
      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      
      <ejs-grid
        v-else
        ref="grid"
        :dataSource="gridData"
        :allowPaging="true"
        :pageSettings="pageSettings"
        :allowSorting="true"
        :allowFiltering="true"
        :allowResizing="true"
        :height="'100%'"
        locale="zh-TW"
      >
        <e-columns>
          <e-column field="userId" headerText="用戶ID" width="150" textAlign="Left"></e-column>
          <e-column field="username" headerText="用戶名稱" width="180" textAlign="Left"></e-column>
          <e-column field="email" headerText="電子郵件" width="220" textAlign="Left"></e-column>
          <e-column field="role" headerText="系統角色" width="120" textAlign="Center" :template="'roleTemplate'"></e-column>
          <e-column field="companyIds" headerText="所屬公司" width="150" textAlign="Left" :template="'companyTemplate'"></e-column>
          <e-column field="verify" headerText="驗證狀態" width="100" textAlign="Center" :template="'verifyTemplate'"></e-column>
          <e-column field="isPaidUser" headerText="付費用戶" width="100" textAlign="Center" :template="'paidUserTemplate'"></e-column>
          <e-column field="createdAt" headerText="建立時間" width="150" textAlign="Center" :template="'createdAtTemplate'"></e-column>
          <e-column field="updatedAt" headerText="更新時間" width="150" textAlign="Center" :template="'updatedAtTemplate'"></e-column>
        </e-columns>

        <template v-slot:roleTemplate="{ data }">
          <span>{{ formatRole(data.systemRole || data.role) }}</span>
        </template>

        <template v-slot:companyTemplate="{ data }">
          <span>{{ formatCompanies(data) }}</span>
        </template>

        <template v-slot:verifyTemplate="{ data }">
          <span :class="data.verify ? 'text-success' : 'text-warning'">
            {{ data.verify ? '已驗證' : '未驗證' }}
          </span>
        </template>

        <template v-slot:paidUserTemplate="{ data }">
          <span>{{ data.isPaidUser === 'Y' ? '是' : '否' }}</span>
        </template>

        <template v-slot:createdAtTemplate="{ data }">
          <span>{{ formatDate(data.createdAt) }}</span>
        </template>

        <template v-slot:updatedAtTemplate="{ data }">
          <span>{{ formatDate(data.updatedAt) }}</span>
        </template>
      </ejs-grid>
    </div>
  </div>
</template>

<style scoped>
.grid-wrapper {
  height: 600px;
}
</style>
