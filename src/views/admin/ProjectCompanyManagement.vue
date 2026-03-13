<template>
  <div class="project-company-management-page">
    <!-- 頁面標題 -->
    <PageHeader
      title="工程案相關單位管理"
      icon="fa fa-building"
      :breadcrumbs="[
        { text: '工程管理', href: '/admin/projects' },
        { text: '所有工程案', href: '/admin/projects' },
        { text: constructionName || '工程案單位管理', active: true }
      ]"
    />

    <div class="row">
      <div class="col-xl-12">
        
        <!-- 載入狀態 -->
        <div v-if="isLoading" class="text-center py-5">
          <div class="spinner-border text-theme" role="status">
            <span class="visually-hidden">載入中...</span>
          </div>
          <div class="mt-2 text-muted">載入工程案單位資料中...</div>
        </div>

        <!-- 錯誤狀態 -->
        <div v-else-if="error" class="text-center py-5">
          <i class="fa fa-exclamation-triangle fa-3x text-danger mb-3"></i>
          <h5 class="text-danger">載入失敗</h5>
          <p class="text-muted mb-3">{{ error }}</p>
          <button 
            class="btn btn-theme"
            @click="loadData"
          >
            <i class="fa fa-refresh me-2"></i>
            重新載入
          </button>
          <button 
            class="btn btn-outline-secondary ms-2"
            @click="goBack"
          >
            <i class="fa fa-arrow-left me-2"></i>
            返回列表
          </button>
        </div>

        <!-- 工程案資訊卡片 -->
        <div v-else-if="constructionInfo" class="mb-4">
          <Card>
            <CardHeader>
              <h5 class="mb-0">
                <i class="fa fa-info-circle me-2"></i>
                工程案資訊
              </h5>
            </CardHeader>
            <CardBody>
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-2">
                    <strong>工程名稱：</strong>{{ constructionInfo.constructionName }}
                  </div>
                  <div class="mb-2">
                    <strong>工程編號：</strong>{{ constructionInfo.constructionId }}
                  </div>
                  <div class="mb-2">
                    <strong>工程地點：</strong>{{ constructionInfo.constructionLocation || '未設定' }}
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-2">
                    <strong>工作空間 ID：</strong><code>{{ workspaceId || '未找到' }}</code>
                  </div>
                  <div class="mb-2">
                    <strong>營造公司：</strong>{{ constructionInfo.contractorCompanyName || '未設定' }}
                  </div>
                  <div class="mb-2">
                    <strong>監造公司：</strong>{{ constructionInfo.supervisoryCompanyName || '未設定' }}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <!-- 參與單位管理（複用 ParticipationUnits 的邏輯） -->
        <div v-if="workspaceId && !isLoading && !error" class="workspace-company-management">
          <!-- 這裡可以嵌入 ParticipationUnits 組件，或者複製其邏輯 -->
          <!-- 為了簡化，我們直接使用 workspaceStore 的方法 -->
          <ParticipationUnitsContent 
            :workspace-id="workspaceId"
            :is-admin-mode="true"
          />
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getConstructionDetail, type Construction } from '@/api/construction'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import ParticipationUnitsContent from '@/components/admin/ParticipationUnitsContent.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 權限檢查
const hasAdminPermission = computed(() => {
  const user = authStore.user
  if (!user) return false
  return user.role === 'SUPER_ADMIN'
})

// 狀態
const isLoading = ref(false)
const error = ref<string | null>(null)
const constructionId = computed(() => route.params.constructionId as string)
const constructionInfo = ref<Construction | null>(null)
const workspaceId = ref<string | null>(null)
const constructionName = computed(() => constructionInfo.value?.constructionName || '')

// 載入工程案資料
const loadData = async () => {
  if (!hasAdminPermission.value) {
    error.value = '您沒有權限訪問此頁面'
    return
  }

  if (!constructionId.value) {
    error.value = '缺少工程案編號'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    // 嘗試獲取工程案詳情（不傳 workspaceId，讓後端自動從 master_construction 獲取）
    const data = await getConstructionDetail(constructionId.value)
    constructionInfo.value = data
    
    // 如果返回的資料中有 workspaceId，直接使用
    if (data.workspaceId) {
      workspaceId.value = data.workspaceId
    } else {
      // 如果沒有 workspaceId，嘗試從 getAllConstructions 中查找
      console.warn('⚠️ 工程案詳情中沒有 workspaceId，嘗試從工程案列表中查找...')
      
      try {
        const { getAllConstructions } = await import('@/api/construction')
        const allConstructions = await getAllConstructions()
        const foundConstruction = allConstructions.find(c => c.constructionId === constructionId.value)
        if (foundConstruction?.workspaceId) {
          workspaceId.value = foundConstruction.workspaceId
          // 更新 constructionInfo 的 workspaceId
          if (constructionInfo.value) {
            constructionInfo.value.workspaceId = foundConstruction.workspaceId
          }
        } else {
          error.value = '無法找到工程案所屬的工作空間。請確認工程案是否存在於 master_construction 表中。'
        }
      } catch (fallbackErr: any) {
        console.error('從工程案列表獲取 workspaceId 失敗:', fallbackErr)
        error.value = '無法找到工程案所屬的工作空間。請確認工程案是否存在。'
      }
    }
  } catch (err: any) {
    console.error('載入工程案資料失敗:', err)
    error.value = err.response?.data?.message || err.message || '載入工程案資料失敗'
  } finally {
    isLoading.value = false
  }
}

// 返回列表
const goBack = () => {
  router.push('/admin/projects')
}

// 初始化
onMounted(() => {
  if (!hasAdminPermission.value) {
    router.push('/admin/projects')
    return
  }
  loadData()
})
</script>

<style scoped>
.project-company-management-page {
  padding: 1.5rem;
}

code {
  background-color: var(--bs-secondary-bg);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--bs-body-color);
}
</style>
