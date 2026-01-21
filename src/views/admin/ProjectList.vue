<script setup lang="ts">
import { ref, onMounted, provide, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { getAllConstructions, deleteConstruction, getConstructionDetail, type Construction } from '@/api/construction'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import { Sort, Resize, Filter, Page, GridComponent, ColumnsDirective, ColumnDirective, Toolbar } from '@syncfusion/ej2-vue-grids'

const router = useRouter()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

// 權限檢查
const hasAdminPermission = computed(() => {
  const user = authStore.user
  if (!user) return false
  return user.role === 'SUPER_ADMIN'
})

// Grid 相關
const grid = ref<GridComponent | null>(null)
const gridData = ref<Construction[]>([])
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
    const data = await getAllConstructions()
    gridData.value = data || []
  } catch (error) {
    console.error('載入工程案列表失敗:', error)
  } finally {
    isLoading.value = false
  }
}

// 跳轉到建立頁面
const navigateToCreate = () => {
  router.push('/admin/create-project')
}

// 跳轉到設定單位頁面
const handleManageCompanies = (data: Construction) => {
  if (!data.constructionId) {
    alert('無法設定單位：缺少工程編號')
    return
  }
  router.push(`/admin/projects/${data.constructionId}/companies`)
}

// 進入專案
const handleEnter = async (data: Construction) => {
    let targetWorkspaceId = data.workspaceId;
    let targetConstructionId = data.constructionId;

    if (!targetConstructionId) {
        console.error('無法進入專案：缺少 constructionId')
        return
    }

    // 如果列表資料缺少 workspaceId，嘗試從詳情 API 獲取
    if (!targetWorkspaceId) {
        try {
            const detail = await getConstructionDetail(targetConstructionId);
            if (detail && detail.workspaceId) {
                targetWorkspaceId = detail.workspaceId;
            }
        } catch (error) {
            console.error('嘗試獲取專案詳情失敗:', error);
        }
    }

    if (!targetWorkspaceId) {
        console.error('無法進入專案：缺少 workspaceId (API 未回傳且無法從詳情獲取)');
        alert('無法進入專案：系統無法識別該專案所屬的工作空間。');
        return;
    }
    
    
    try {
        // 切換工作空間
        // 檢查工作空間是否存在於 Store 列表中（SUPER_ADMIN 可能會看到非自己參與的工作空間）
        let ws = workspaceStore.workspaces.find(w => w.id === targetWorkspaceId);
        
        if (!ws) {
            // 如果本地列表沒有，嘗試從 API 獲取詳情
            try {
                // 注意：這裡假設 getWorkspaceDetail 已在 workspaceStore 中公開並且 API 允許 SUPER_ADMIN 查詢
                ws = await workspaceStore.getWorkspaceDetail(targetWorkspaceId);
                if (ws) {
                    workspaceStore.setCurrentWorkspace(ws);
                }
            } catch (err) {
                console.error(`無法獲取工作空間詳情 (${targetWorkspaceId}):`, err);
                // 如果無法獲取詳情，可能導致後續 API 調用失敗，但仍嘗試繼續
            }
        } else {
            workspaceStore.switchWorkspace(targetWorkspaceId);
        }
        
        // 確保載入該工作空間的專案列表 (這也是為了讓 switchProject 能找到專案)
        // 注意：這會更新 workspaceStore.workspaceProjects
        await workspaceStore.getProjectsByWorkspace(targetWorkspaceId)
        
        // 切換專案
        await workspaceStore.switchProject(targetConstructionId)
        
        // 導向至專案儀表板或基本資料
        router.push('/basic/basic-data')
    } catch (e) {
        console.error('切換專案失敗:', e)
        alert('切換專案失敗，請稍後再試。')
    }
}

// 刪除專案
const handleDelete = async (data: Construction) => {
    if (!confirm(`確定要刪除工程案「${data.constructionName}」嗎？此動作無法復原。`)) {
        return
    }
    
    try {
        await deleteConstruction(data.constructionId)
        // 重新載入列表
        await loadData()
    } catch (error) {
        console.error('刪除失敗', error)
        alert('刪除失敗，請稍後再試')
    }
}


// 初始化
onMounted(() => {
  if (hasAdminPermission.value) {
    loadData()
  } else {
    // 若無權限導回首頁或顯示錯誤 (視需求)
    router.push('/')
  }
})

// 格式化函數
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(value);
}
</script>

<template>
  <div class="project-list-page p-4">
    <PageHeader
      title="所有工程案列表"
      icon="fa fa-clipboard-list"
      :breadcrumbs="[
        { text: '工程管理', href: 'javascript:;' },
        { text: '所有工程案', active: true }
      ]"
    />

        <div class="mb-3 d-flex justify-content-between align-items-center">
            <h5 class="m-0">工程案清單</h5>
            <button class="btn btn-theme" @click="navigateToCreate">
                <i class="fa fa-plus-circle me-1"></i> 建立新工程案
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
                    <e-column headerText="操作" width="240" textAlign="Center" :template="'actionTemplate'"></e-column>
                    <e-column field="contractId" headerText="工程編號" width="150" textAlign="Left"></e-column>
                    <e-column field="constructionName" headerText="工程名稱" width="250" textAlign="Left"></e-column>
                    <e-column field="constructionLocation" headerText="工程地點" width="200" textAlign="Left"></e-column>
                    <e-column field="constructionType" headerText="工程類型" width="120" textAlign="Center"></e-column>
                    <e-column field="constructionBudget" headerText="預算金額" width="150" textAlign="Right" :format="'C0'"></e-column> 
                    <e-column field="leadOrganization" headerText="主辦機關" width="150" textAlign="Left"></e-column>
                    <e-column field="contractorCompanyName" headerText="營造公司" width="180" textAlign="Left"></e-column>
                    <e-column field="supervisoryCompanyName" headerText="監造公司" width="180" textAlign="Left"></e-column>
                    <e-column field="constructionStartDate" headerText="開工日期" width="120" textAlign="Center" type="date" format="yMd"></e-column>
                    <e-column field="constructionEndDate" headerText="預計完工" width="120" textAlign="Center" type="date" format="yMd"></e-column>
                </e-columns>

                <template v-slot:actionTemplate="{ data }">
                    <div class="d-flex justify-content-center gap-2">
                        <button class="btn btn-sm btn-outline-primary" @click="handleEnter(data)" title="進入工程案">
                            <i class="fa fa-sign-in me-1"></i>進入
                        </button>
                        <button class="btn btn-sm btn-outline-info" @click="handleManageCompanies(data)" title="設定相關單位公司">
                            <i class="fa fa-building me-1"></i>設定單位
                        </button>
                        <button class="btn btn-sm btn-outline-danger" @click="handleDelete(data)" title="刪除工程案">
                            <i class="fa fa-trash me-1"></i>刪除
                        </button>
                    </div>
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
