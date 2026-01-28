<template>
  <div class="view-type-switcher" v-if="showSwitcher">
    <!-- 管理員：顯示可切換的下拉選單 -->
    <div v-if="showAsDropdown" class="dropdown">
      <button 
        class="btn btn-sm dropdown-toggle d-flex align-items-center view-type-btn"
        :class="getButtonClass()"
        type="button"
        :id="dropdownId"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <i :class="currentIcon" class="me-1"></i>
        <span>{{ currentLabel }}</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end" :aria-labelledby="dropdownId">
        <li v-for="option in availableOptions" :key="option.type">
          <a 
            class="dropdown-item d-flex align-items-center"
            :class="{ 'active': option.type === (route.path.startsWith('/contractor/') ? ViewType.CONTRACTOR : route.path.startsWith('/supervisory/') ? ViewType.SUPERVISORY : viewType) }"
            href="#"
            @click.prevent="switchView(option.type)"
          >
            <i :class="option.icon" class="me-2"></i>
            <span>{{ option.label }}</span>
            <i v-if="option.type === viewType" class="bi bi-check ms-auto"></i>
          </a>
        </li>
      </ul>
    </div>
    
    <!-- 非管理員：只顯示當前視角標籤（不可切換） -->
    <div v-else class="view-type-badge">
      <span class="badge" :class="getBadgeClass()">
        <i :class="currentIcon" class="me-1"></i>
        {{ currentLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const { viewType, initViewType, getViewTypeLabel, setViewType } = useViewPerspective()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()

const dropdownId = `viewTypeSwitcher-${Math.random().toString(36).substr(2, 9)}`
const isInitializing = ref(false) // 防止重複初始化

// 檢查是否為系統管理員
const isSuperAdmin = computed(() => {
  const user = authStore.user
  if (!user) return false
  const systemRole = user.systemRole || user.role
  return systemRole === 'SUPER_ADMIN' || systemRole === 'ADMIN'
})

// 可用的視角選項（只有管理員可以看到切換選項）
const availableOptions = computed(() => {
  // 如果不是管理員，不顯示切換選項
  if (!isSuperAdmin.value) {
    return []
  }
  
  const options = [
    {
      type: ViewType.SUPERVISORY,
      label: '監造',
      icon: 'bi bi-eye-fill text-primary'
    },
    {
      type: ViewType.CONTRACTOR,
      label: '營造',
      icon: 'bi bi-eye-fill text-success'
    }
  ]
  
  return options
})

// 當前視角標籤（根據路由或 viewType 判斷）
const currentLabel = computed(() => {
  // 優先根據路由路徑判斷（因為路由是單一來源）
  if (route.path.startsWith('/contractor/')) {
    return '營造'
  } else if (route.path.startsWith('/supervisory/')) {
    return '監造'
  } else if (route.path.startsWith('/shared/')) {
    return '共用'
  }
  
  // 如果路由沒有視角前綴，使用 viewType computed
  return getViewTypeLabel(viewType.value)
})

// 當前視角圖標（根據路由或 viewType 判斷）
const currentIcon = computed(() => {
  // 優先根據路由路徑判斷
  if (route.path.startsWith('/contractor/')) {
    return 'bi bi-eye-fill text-success'
  } else if (route.path.startsWith('/supervisory/')) {
    return 'bi bi-eye-fill text-primary'
  } else if (route.path.startsWith('/shared/')) {
    return 'bi bi-eye text-muted'
  }
  
  // 如果路由沒有視角前綴，使用 viewType computed
  switch (viewType.value) {
    case ViewType.SUPERVISORY:
      return 'bi bi-eye-fill text-primary'
    case ViewType.CONTRACTOR:
      return 'bi bi-eye-fill text-success'
    case ViewType.OWNER:
      return 'bi bi-eye-fill text-info'
    case ViewType.PCM:
      return 'bi bi-eye-fill text-warning'
    default:
      return 'bi bi-eye text-muted'
  }
})

// 是否顯示切換器
// 1. 只有在有工作空間時顯示
// 2. 不在管理員頁面顯示
// 3. 只有管理員才顯示切換下拉選單（非管理員只顯示當前視角標籤）
const showSwitcher = computed(() => {
  if (route.path.startsWith('/admin')) return false
  if (!workspaceStore.currentWorkspace) return false
  return true
})

// 是否顯示為下拉選單（只有管理員才顯示切換功能）
const showAsDropdown = computed(() => {
  return isSuperAdmin.value && availableOptions.value.length > 0
})

// 切換視角（只有管理員可以切換）
const switchView = async (targetType: ViewType) => {
  // 權限檢查：只有管理員可以切換
  if (!isSuperAdmin.value) {
    return
  }
  
  if (targetType === viewType.value) {
    return
  }
  
  // 手動設定視角（對於系統管理員，不需要從後端獲取）
  setViewType(targetType)
  
  const currentPath = route.path
  let newPath = currentPath
  
  // 移除現有的視角前綴
  newPath = newPath.replace(/^\/(supervisory|contractor|shared)/, '')
  
  // 添加新的視角前綴（如果不是 SHARED）
  if (targetType !== ViewType.SHARED) {
    const prefix = targetType.toLowerCase()
    // 如果路徑是根路徑，直接添加前綴
    if (newPath === '/') {
      newPath = `/${prefix}/`
    } else {
      newPath = `/${prefix}${newPath}`
    }
  }
  
  // 導航到新路徑（這會觸發路由守衛和組件的 watch）
  await router.push(newPath)
}

// 獲取按鈕樣式類別（根據路由或 viewType 判斷）
const getButtonClass = (): string => {
  // 優先根據路由路徑判斷
  if (route.path.startsWith('/contractor/')) {
    return 'btn-outline-success'
  } else if (route.path.startsWith('/supervisory/')) {
    return 'btn-outline-primary'
  } else if (route.path.startsWith('/shared/')) {
    return 'btn-outline-secondary'
  }
  
  // 如果路由沒有視角前綴，使用 viewType computed
  switch (viewType.value) {
    case ViewType.SUPERVISORY:
      return 'btn-outline-primary'
    case ViewType.CONTRACTOR:
      return 'btn-outline-success'
    case ViewType.OWNER:
      return 'btn-outline-info'
    case ViewType.PCM:
      return 'btn-outline-warning'
    default:
      return 'btn-outline-secondary'
  }
}

// 獲取 Badge 樣式類別（根據路由或 viewType 判斷，使用線條樣式）
const getBadgeClass = (): string => {
  // 優先根據路由路徑判斷
  if (route.path.startsWith('/contractor/')) {
    return 'border border-success text-success'
  } else if (route.path.startsWith('/supervisory/')) {
    return 'border border-primary text-primary'
  } else if (route.path.startsWith('/shared/')) {
    return 'border border-secondary text-secondary'
  }
  
  // 如果路由沒有視角前綴，使用 viewType computed
  switch (viewType.value) {
    case ViewType.SUPERVISORY:
      return 'border border-primary text-primary'
    case ViewType.CONTRACTOR:
      return 'border border-success text-success'
    case ViewType.OWNER:
      return 'border border-info text-info'
    case ViewType.PCM:
      return 'border border-warning text-warning'
    default:
      return 'border border-secondary text-secondary'
  }
}

// 初始化視角的函數（可重複使用）
const initializeViewType = async (workspaceId: string) => {
  if (isInitializing.value) {
    return
  }
  
  if (!workspaceId) {
    return
  }
  
  isInitializing.value = true
  try {
    await initViewType(workspaceId)
  } catch (error) {
    // 靜默處理錯誤
  } finally {
    isInitializing.value = false
  }
}

// 監聽工作空間變化，當工作空間載入完成後自動初始化視角
watch(
  () => workspaceStore.currentWorkspace?.id,
  async (newWorkspaceId, oldWorkspaceId) => {
    // 只有當工作空間 ID 變化且不為空時才初始化
    if (newWorkspaceId && newWorkspaceId !== oldWorkspaceId) {
      await initializeViewType(newWorkspaceId)
    }
  },
  { immediate: false } // 不在初始化時立即執行，由 onMounted 處理
)

onMounted(async () => {
  // 如果工作空間已經存在，立即初始化視角
  if (workspaceStore.currentWorkspace?.id) {
    await initializeViewType(workspaceStore.currentWorkspace.id)
  }
})
</script>

<style scoped>
.view-type-switcher {
  margin-right: 0.5rem;
}

.view-type-btn {
  min-width: auto;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-width: 1px;
}

.dropdown-menu {
  min-width: auto;
  width: auto;
}

.dropdown-item {
  white-space: nowrap;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.dropdown-item.active {
  background-color: var(--bs-theme);
  color: white;
}

.dropdown-item.active i {
  color: white;
}

.view-type-badge {
  display: flex;
  align-items: center;
}

.view-type-badge .badge {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  background-color: transparent;
  border-width: 1px;
  border-style: solid;
}

/* 確保圖標在深色模式下可見 */
.view-type-switcher i.bi-eye-fill.text-primary {
  color: var(--bs-primary) !important;
}

.view-type-switcher i.bi-eye-fill.text-success {
  color: var(--bs-success) !important;
}

.view-type-switcher i.bi-eye-fill.text-info {
  color: var(--bs-info) !important;
}

.view-type-switcher i.bi-eye-fill.text-warning {
  color: var(--bs-warning) !important;
}

/* 在深色模式下，確保圖標顏色足夠明顯 */
[data-bs-theme="dark"] .view-type-switcher i.bi-eye-fill.text-primary {
  color: #0d6efd !important;
}

[data-bs-theme="dark"] .view-type-switcher i.bi-eye-fill.text-success {
  color: #198754 !important;
}

[data-bs-theme="dark"] .view-type-switcher i.bi-eye-fill.text-info {
  color: #0dcaf0 !important;
}

[data-bs-theme="dark"] .view-type-switcher i.bi-eye-fill.text-warning {
  color: #ffc107 !important;
}
</style>
