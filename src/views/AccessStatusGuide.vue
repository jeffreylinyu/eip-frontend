<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { companyApi } from '@/api/company'

const router = useRouter()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

const isLoading = ref(true)

/** 隸屬公司列表（可多筆，與 companyIds 對應） */
const affiliatedCompanies = ref<{ id: string; name: string }[]>([])

const status = computed(() => {
  if (!authStore.user?.companyId) {
    return 'NO_COMPANY'
  }
  if (workspaceStore.workspaces.length === 0 && workspaceStore.joinedProjectsCount === 0) {
    return 'NO_PROJECT'
  }
  return 'NORMAL'
})

const loadCompanyInfo = async () => {
  if (status.value !== 'NO_PROJECT') {
    isLoading.value = false
    return
  }
  const uid = authStore.user?.userId
  if (!uid) {
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    await authStore.fetchCurrentUser(uid)
    const u = authStore.user
    if (!u) {
      affiliatedCompanies.value = []
      return
    }
    const ids =
      u.companyIds && u.companyIds.length > 0
        ? [...u.companyIds]
        : u.companyId
          ? [u.companyId]
          : []

    const names = u.companyNames

    if (ids.length === 0) {
      affiliatedCompanies.value = []
      return
    }

    if (names && names.length === ids.length) {
      affiliatedCompanies.value = ids.map((id, i) => ({
        id,
        name: (names[i] && String(names[i]).trim()) || id
      }))
    } else {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const detail = await companyApi.getDetail(id)
            return { id, name: detail.companyName?.trim() || id }
          } catch {
            return { id, name: id }
          }
        })
      )
      affiliatedCompanies.value = results
    }
  } catch (err) {
    console.error('Failed to load company info:', err)
    affiliatedCompanies.value = []
  } finally {
    isLoading.value = false
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/page/login')
}

onMounted(async () => {
  await workspaceStore.initWorkspaces(true)

  if (status.value === 'NORMAL') {
    router.push('/')
    return
  }

  await loadCompanyInfo()
})

watch(status, (newStatus) => {
  if (newStatus === 'NORMAL') {
    router.push('/')
  }
})
</script>

<template>
  <div class="access-guide-container d-flex align-items-center justify-content-center min-vh-100">
    <div class="card shadow-lg border-0 bg-dark text-white" style="max-width: 560px; width: 100%;">
      <div class="card-body p-5 text-center">
        
        <div v-if="status === 'NO_COMPANY'">
          <div class="mb-4 text-warning">
            <i class="fa fa-building-o fa-4x"></i>
          </div>
          <h3 class="card-title fw-bold mb-3">帳號啟動成功，待關聯單位</h3>
          <p class="card-text text-white-50 mb-4">
            您的帳號目前尚未歸屬任何公司，請聯繫貴公司的管理員。<br>
          </p>
        </div>

        <div v-if="status === 'NO_PROJECT'">
          <div class="mb-4 text-info">
            <i class="fa fa-check-circle fa-4x"></i>
          </div>
          <h3 class="card-title fw-bold mb-3">身分已確認，待工程案授權</h3>
          
          <div class="alert alert-dark-soft mb-4 p-3 rounded text-start" role="alert">
            <div class="small text-uppercase text-secondary fw-bold mb-2 text-center">
              您目前隸屬於下列公司
              <span v-if="affiliatedCompanies.length > 1" class="text-white-50">（共 {{ affiliatedCompanies.length }} 間）</span>
            </div>
            <div class="text-center">
              <span v-if="isLoading" class="spinner-border spinner-border-sm text-info" role="status" aria-hidden="true"></span>
              <ul v-else-if="affiliatedCompanies.length" class="list-unstyled mb-0">
                <li
                  v-for="c in affiliatedCompanies"
                  :key="c.id"
                  class="fw-bold text-info py-2 px-2 rounded mb-1"
                  style="background: rgba(255,255,255,0.04);"
                >
                  {{ c.name }}
                </li>
              </ul>
              <h5 v-else class="mb-0 fw-bold text-info">您的所屬公司</h5>
            </div>
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
  background-color: #212529;
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
