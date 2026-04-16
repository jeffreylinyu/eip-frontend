<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import SitePersonnelManagement from '@/components/company/SitePersonnelManagement.vue'

const route = useRoute()
const companyStore = useCompanyStore()
const authStore = useAuthStore()

// 狀態
const isLoading = ref(false)
const selectedCompanyId = ref<string | null>(null)

const lockedCompanyId = computed(() => {
  const q = route.query.companyId
  if (typeof q === 'string' && q.trim()) return q.trim()
  return null
})
const isCompanyLocked = computed(() => !!lockedCompanyId.value)

// 計算屬性
// 優先使用選中的公司，否則使用用戶的第一個公司
const currentCompany = computed(() => {
  // 若 URL 帶 companyId 鎖定：即使公司清單尚未載到，也不可回退到其他公司
  if (lockedCompanyId.value) {
    const company = companyStore.getCompanyById(lockedCompanyId.value)
    if (company) {
      return {
        id: company.companyId,
        name: company.companyName,
        companyType: (company.companyType === 'SUPERVISION' || company.companyType === 'CONTRACTOR' ? company.companyType : 'CONTRACTOR') as 'SUPERVISION' | 'CONTRACTOR'
      }
    }
    // fallback：至少用鎖定的 ID 讓後續 API 查詢正確公司
    return {
      id: lockedCompanyId.value,
      name: lockedCompanyId.value,
      companyType: 'SUPERVISION' as 'SUPERVISION' | 'CONTRACTOR'
    }
  }

  // 如果已選擇公司，使用選中的公司
  if (selectedCompanyId.value) {
    const company = companyStore.getCompanyById(selectedCompanyId.value)
    if (company) {
      return {
        id: company.companyId,
        name: company.companyName,
        companyType: (company.companyType === 'SUPERVISION' || company.companyType === 'CONTRACTOR' ? company.companyType : 'CONTRACTOR') as 'SUPERVISION' | 'CONTRACTOR'
      }
    }
  }

  // 否則使用用戶的第一個公司（從公司列表獲取）
  const firstCompany = companyStore.activeCompanies[0]
  if (firstCompany) {
    return {
      id: firstCompany.companyId,
      name: firstCompany.companyName,
      companyType: (firstCompany.companyType === 'SUPERVISION' || firstCompany.companyType === 'CONTRACTOR' ? firstCompany.companyType : 'CONTRACTOR') as 'SUPERVISION' | 'CONTRACTOR'
    }
  }

  // 如果都沒有，嘗試從 authStore 獲取
  if (authStore.user?.companyId) {
    const company = companyStore.getCompanyById(authStore.user.companyId)
    if (company) {
      return {
        id: company.companyId,
        name: company.companyName,
        companyType: (company.companyType === 'SUPERVISION' || company.companyType === 'CONTRACTOR' ? company.companyType : 'CONTRACTOR') as 'SUPERVISION' | 'CONTRACTOR'
      }
    }
  }

  return null
})

const pageHeaderTitle = computed(() => {
  if (!currentCompany.value) return '工地人員管理'
  return `工地人員管理（${currentCompany.value.name}）`
})

// 用戶所屬的公司列表（用於選擇）
const userCompanies = computed(() => {
  return companyStore.activeCompanies
})

// 方法
const refreshData = async () => {
  isLoading.value = true
  try {
    await companyStore.initCompanies()
  } catch (error) {
    console.error('Failed to refresh data:', error)
  } finally {
    isLoading.value = false
  }
}

const backToCompanyManagement = () => {
  // 返回公司管理頁面
  window.history.back()
}

// 選擇公司
const selectCompany = (companyId: string) => {
  selectedCompanyId.value = companyId
}

// 生命週期
onMounted(async () => {
  // 初始化公司數據
  await companyStore.initCompanies()
  
  // 若從公司管理點進來（帶 companyId），鎖定顯示該公司資料，不提供切換
  if (lockedCompanyId.value) {
    selectedCompanyId.value = lockedCompanyId.value
    // 有些情境公司列表尚未含該 companyId（或尚未載到），補抓一次詳情避免回退到第一間公司
    if (!companyStore.getCompanyById(lockedCompanyId.value)) {
      try {
        await companyStore.getCompanyDetail(lockedCompanyId.value)
      } catch (e) {
        console.warn('無法載入鎖定公司詳情:', lockedCompanyId.value, e)
      }
    }
    return
  }

  // 如果用戶只有一個公司，自動選擇
  if (userCompanies.value.length === 1) {
    selectedCompanyId.value = userCompanies.value[0].companyId
  } else if (authStore.user?.companyId) {
    // 如果有預設公司，使用預設公司
    selectedCompanyId.value = authStore.user.companyId
  }
  
  // 檢查用戶是否有權限訪問工地人員管理
  if (!currentCompany.value) {
    console.warn('用戶沒有公司信息，無法訪問工地人員管理')
  }
})

watch(
  () => lockedCompanyId.value,
  (id) => {
    if (id) selectedCompanyId.value = id
  }
)
</script>

<template>
  <div class="company-site-personnel-page">
    <!-- 頁面標題 -->
    <PageHeader
      :title="pageHeaderTitle"
      icon="fa fa-hard-hat"
      :breadcrumbs="[
        { text: '公司管理', href: 'javascript:;' },
        { text: '工地人員管理', active: true }
      ]"
      :actions="[
        {
          text: '返回',
          icon: 'fa fa-arrow-left',
          variant: 'btn-outline-secondary',
          click: backToCompanyManagement
        },
        {
          text: '重新載入',
          icon: 'fa fa-refresh',
          variant: 'btn-outline-theme',
          click: refreshData,
          disabled: isLoading,
          loading: isLoading
        }
      ]"
    />

    <!-- 公司選擇器：僅在未鎖定公司時顯示 -->
    <div v-if="userCompanies.length > 1 && !isCompanyLocked" class="mb-3">
      <label class="form-label">選擇公司</label>
      <select 
        class="form-select" 
        :value="selectedCompanyId || ''"
        @change="selectCompany(($event.target as HTMLSelectElement).value)"
      >
        <option value="">請選擇公司</option>
        <option 
          v-for="company in userCompanies" 
          :key="company.companyId"
          :value="company.companyId"
        >
          {{ company.companyName }}
        </option>
      </select>
    </div>

    <!-- 工地人員管理組件 -->
    <div v-if="currentCompany">
      <SitePersonnelManagement 
        :company-id="currentCompany.id"
        :company-name="currentCompany.name"
        :company-type="currentCompany.companyType"
      />
    </div>
    
    <!-- 沒有公司資訊時的提示 -->
    <div v-else class="text-center py-5">
      <i class="fa fa-exclamation-triangle fa-3x text-warning mb-3"></i>
      <h5 class="text-muted">無法載入公司資訊</h5>
      <p class="text-muted mb-3">您目前沒有可用的公司，請聯繫管理員或返回公司管理頁面</p>
      <button 
        class="btn btn-theme"
        @click="backToCompanyManagement"
      >
        <i class="fa fa-arrow-left me-2"></i>
        返回公司管理
      </button>
    </div>
  </div>
</template>

<style scoped>
.company-site-personnel-page {
  padding: 1rem;
}

/* 內層卡片採用暗色卡片風格 */
:deep(.card) {
  background: #1f2933;
  border-color: #374151;
  color: #e4e6eb;
}

:deep(.card-header) {
  background: #111827;
  border-bottom-color: #374151;
}

:deep(.form-label),
:deep(th) {
  color: #9ca3af;
}

/* A 系列表格風格（與 A7 類似，略為簡化） */
.a4-table {
  border: 2px solid #374151;
  border-collapse: collapse;
  width: 100%;
  color: #e4e6eb;
}

.a4-table thead th {
  background: #111827;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.65rem 0.5rem;
  border: 1.5px solid #374151;
  color: #9ca3af;
}

.a4-table tbody td {
  border: 1.5px solid #374151;
  padding: 0.6rem 0.5rem;
  vertical-align: middle;
  background: #1f2933;
  color: #e4e6eb;
}

.a4-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.06);
}
</style>

