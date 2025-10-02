<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCompanyStore } from '@/stores/company'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CompanyManagementTab from '@/components/company/CompanyManagementTab.vue'
import CompanyMemberManagement from '@/components/company/CompanyMemberManagement.vue'
import SitePersonnelManagement from '@/components/company/SitePersonnelManagement.vue'

const router = useRouter()

const companyStore = useCompanyStore()

// 狀態
const isLoading = ref(false)
const activeTab = ref('companies')
const selectedCompanyId = ref('')
const selectedCompanyName = ref('')



// 計算屬性
const selectedCompany = computed(() => {
  if (!selectedCompanyId.value) return null
  return companyStore.companies.find(c => c.id === selectedCompanyId.value)
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

const switchTab = (tab: string, companyId?: string) => {
  activeTab.value = tab
  if (companyId) {
    selectedCompanyId.value = companyId
  }
}

const switchToSitePersonnelTab = (companyId: string, companyName: string) => {
  // 跳轉到獨立的工地人員管理頁面
  // 使用 router 跳轉，不依賴 URL 參數傳遞公司信息
  router.push('/company/site-personnel')
}

const backToCompanyList = () => {
  activeTab.value = 'companies'
  selectedCompanyId.value = ''
  selectedCompanyName.value = ''
}

// 生命週期
onMounted(() => {
  companyStore.initCompanies()
})
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        
        <!-- 頁面標題 -->
        <PageHeader
          :title="activeTab === 'companies' ? '公司管理' : 
                  activeTab === 'members' ? `${selectedCompany?.companyName || '公司'} - 成員管理` : 
                  `${selectedCompanyName || '公司'} - 工地人員管理`"
          icon="fa fa-building"
          :breadcrumbs="[
            { text: '公司管理', active: true }
          ]"
          :actions="[
            ...(activeTab === 'members' || activeTab === 'site-personnel' ? [{
              text: '返回公司列表',
              icon: 'fa fa-arrow-left',
              variant: 'btn-outline-secondary',
              click: backToCompanyList
            }] : []),
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



        <!-- 公司列表 -->
        <div v-if="activeTab === 'companies'">
          <Card>
            <CardHeader>
              <div class="d-flex align-items-center">
                <i class="fa fa-building me-2"></i>
                <h5 class="mb-0">公司列表</h5>
              </div>
            </CardHeader>
            <CardBody class="p-0">
              <CompanyManagementTab 
                @manage-members="switchTab('members', $event)" 
                @manage-site-personnel="switchToSitePersonnelTab"
              />
            </CardBody>
          </Card>
        </div>

        <!-- 成員管理 -->
        <div v-else-if="activeTab === 'members' && selectedCompanyId">
          <CompanyMemberManagement :company-id="selectedCompanyId" />
        </div>

        <!-- 工地人員管理 -->
        <div v-else-if="activeTab === 'site-personnel' && selectedCompanyId">
          <SitePersonnelManagement 
            :company-id="selectedCompanyId" 
            :company-name="selectedCompanyName"
          />
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0;
}



@media (max-width: 768px) {
  .page-header-title {
    font-size: 1.5rem;
  }
}
</style>