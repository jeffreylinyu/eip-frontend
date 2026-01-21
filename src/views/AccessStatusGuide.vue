<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { companyApi } from '@/api/company'

const router = useRouter()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

// 狀態定義
const isLoading = ref(true)
const companyName = ref('')
const error = ref('')

// 計算用戶當前狀態
const status = computed(() => {
  // 場景 A: 無公司
  if (!authStore.user?.companyId) {
    return 'NO_COMPANY'
  }
  
  // 場景 B: 有公司但無專案 (檢查 workspaceStore)
  // 注意: 這裡假設 workspaceStore 已經嘗試載入過列表
  if (workspaceStore.workspaces.length === 0 && workspaceStore.joinedProjectsCount === 0) {
    return 'NO_PROJECT'
  }
  
  return 'NORMAL' // 理論上不應該來到這頁面
})

// 載入公司資訊
const loadCompanyInfo = async () => {
  if (status.value === 'NO_PROJECT' && authStore.user?.companyId) {
    try {
      isLoading.value = true
      // 如果 store 裡面沒有公司詳細資料，嘗試呼叫 API
      const detail = await companyApi.getDetail(authStore.user.companyId)
      companyName.value = detail.companyName
    } catch (err) {
      console.error('Failed to load company info:', err)
      companyName.value = '您的所屬公司'
    } finally {
      isLoading.value = false
    }
  } else {
    isLoading.value = false
  }
}

// 登出
const handleLogout = async () => {
  await authStore.logout()
  router.push('/page/login')
}

// 跳轉到個人設定 (可能包含接受邀請等功能)
const goToProfile = () => {
  router.push('/user/profile')
}

onMounted(async () => {
  // 強制重新載入工作空間列表以確保權限正確
  await workspaceStore.initWorkspaces(true)

  // 如果發現狀態是正常的，直接導回首頁
  if (status.value === 'NORMAL') {
     router.push('/')
     return
  }
  
  await loadCompanyInfo()
})

// 監聽狀態變化，如果突然變正常了 (例如接受了邀請)，導回首頁
watch(status, (newStatus) => {
  if (newStatus === 'NORMAL') {
    router.push('/')
  }
})
</script>

<template>
  <div class="access-guide-container d-flex align-items-center justify-content-center min-vh-100">
    <div class="card shadow-lg border-0 bg-dark text-white" style="max-width: 520px; width: 100%;">
      <div class="card-body p-5 text-center">
        
        <!-- 場景 A: 無公司 -->
        <div v-if="status === 'NO_COMPANY'">
          <div class="mb-4 text-warning">
            <i class="fa fa-building-o fa-4x"></i>
          </div>
          <h3 class="card-title fw-bold mb-3">帳號啟動成功，待關聯單位</h3>
          <p class="card-text text-white-50 mb-4">
            您的帳號目前尚未歸屬任何公司，請聯繫貴公司的管理員。<br>
          </p>
        </div>

        <!-- 場景 B: 有公司無專案 -->
        <div v-if="status === 'NO_PROJECT'">
          <div class="mb-4 text-info">
            <i class="fa fa-check-circle fa-4x"></i>
          </div>
          <h3 class="card-title fw-bold mb-3">身分已確認，待工程案授權</h3>
          
          <div class="alert alert-dark-soft mb-4 p-3 rounded" role="alert">
            <div class="small text-uppercase text-secondary fw-bold mb-1">您目前隸屬於</div>
            <h5 class="mb-0 fw-bold text-info">
              <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span v-else>{{ companyName }}</span>
            </h5>
          </div>

          <p class="card-text text-white-50 mb-4">
            您已成功登入公司系統，但目前尚未被指派參與任何工程專案。<br>
            <span class="text-danger">*</span> 請聯繫您的<strong>專案經理</strong>或<strong>公司管理員</strong>為您開啟專案權限。
          </p>
        </div>

        <hr class="my-4 border-secondary">
        
        <div class="d-flex justify-content-center">
          <button class="btn btn-link text-white-50 text-decoration-none btn-sm" @click="handleLogout">
            <i class="fa fa-sign-out me-1"></i>登出系統
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>

.card {
  background-color: #212529; /* Dark card background */
  box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
}

.alert-dark-soft {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.text-white-50 {
  color: rgba(255, 255, 255, 0.6) !important;
}
</style>
