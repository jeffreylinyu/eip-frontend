<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import SitePersonnelManagement from '@/components/company/SitePersonnelManagement.vue'

const companyStore = useCompanyStore()
const authStore = useAuthStore()

// 狀態
const isLoading = ref(false)
const selectedCompanyId = ref<string | null>(null)

// 計算屬性
// 優先使用選中的公司，否則使用用戶的第一個公司
const currentCompany = computed(() => {
  // 如果已選擇公司，使用選中的公司
  if (selectedCompanyId.value) {
    const company = companyStore.getCompanyById(selectedCompanyId.value)
    if (company) {
      return {
        id: company.companyId,
        name: company.companyName
      }
    }
  }
  
  // 否則使用用戶的第一個公司（從公司列表獲取）
  const firstCompany = companyStore.activeCompanies[0]
  if (firstCompany) {
    return {
      id: firstCompany.companyId,
      name: firstCompany.companyName
    }
  }
  
  // 如果都沒有，嘗試從 authStore 獲取
  if (authStore.user?.companyId) {
    const company = companyStore.getCompanyById(authStore.user.companyId)
    if (company) {
      return {
        id: company.companyId,
        name: company.companyName
      }
    }
  }
  
  return null
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
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        
        <!-- 頁面標題 -->
        <PageHeader
          title="工地人員管理"
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

        <!-- 公司選擇器（如果用戶屬於多個公司） -->
        <div v-if="userCompanies.length > 1" class="mb-3">
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
    </div>
  </div>
</template>

