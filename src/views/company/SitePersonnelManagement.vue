<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { useWorkspaceStore } from '@/stores/workspace'
import SitePersonnelManagement from '@/components/company/SitePersonnelManagement.vue'

const companyStore = useCompanyStore()
const workspaceStore = useWorkspaceStore()

// 狀態
const isLoading = ref(false)

// 計算屬性
const currentCompany = computed(() => {
  // 從當前工作空間獲取公司信息，確保安全性
  const workspace = workspaceStore.currentWorkspace
  if (!workspace?.companyId) {
    return null
  }
  
  return {
    id: workspace.companyId,
    name: workspace.companyName || workspace.name || '當前公司'
  }
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

// 生命週期
onMounted(async () => {
  // 初始化公司數據
  await companyStore.initCompanies()
  
  // 檢查用戶是否有權限訪問工地人員管理
  if (!currentCompany.value) {
    console.warn('用戶沒有當前工作空間或公司信息，無法訪問工地人員管理')
    // 可以考慮重定向到工作空間選擇頁面
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
          <p class="text-muted mb-3">請先選擇工作空間或返回公司管理頁面</p>
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

