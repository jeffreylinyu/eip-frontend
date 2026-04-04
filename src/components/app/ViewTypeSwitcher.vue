<template>
  <div
    v-if="showSwitcher"
    class="view-type-switcher perspective-toggle-wrap"
    role="group"
    aria-label="監造與營造視角"
  >
    <div class="perspective-toggle header-chrome-pill-surface">
      <button
        v-for="option in availableOptions"
        :key="option.type"
        type="button"
        class="perspective-toggle__btn"
        :class="{
          'is-active': isRouteActiveForView(option.type),
          'is-supervisory': option.type === ViewType.SUPERVISORY,
          'is-contractor': option.type === ViewType.CONTRACTOR
        }"
        :aria-pressed="isRouteActiveForView(option.type)"
        @click.prevent="switchView(option.type)"
      >
        <i :class="option.icon" class="perspective-toggle__icon" aria-hidden="true"></i>
        <span class="perspective-toggle__label">{{ option.label }}</span>
      </button>
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
const { initViewType, setViewType, allowedViewTypes, canUseViewType } = useViewPerspective()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()

const isInitializing = ref(false)

const isSuperAdmin = computed(() => {
  const user = authStore.user
  if (!user) return false
  const systemRole = user.systemRole || user.role
  return systemRole === 'SUPER_ADMIN' || systemRole === 'ADMIN'
})

const baseSupervisoryContractorOptions = [
  {
    type: ViewType.SUPERVISORY,
    label: '監造',
    icon: 'bi bi-clipboard-check'
  },
  {
    type: ViewType.CONTRACTOR,
    label: '營造',
    // Bootstrap Icons 無 hard-hat，與工程案卡片一致使用 Font Awesome
    icon: 'fa fa-hard-hat'
  }
]

const availableOptions = computed(() => {
  const allowed = allowedViewTypes.value
  if (isSuperAdmin.value) {
    return baseSupervisoryContractorOptions
  }
  if (!allowed.length) {
    return []
  }
  return baseSupervisoryContractorOptions.filter((o) => allowed.includes(o.type))
})

/** 僅在已選工作空間、且同時具監造與營造視角時顯示（單側不佔 header 空間） */
const showSwitcher = computed(() => {
  if (route.path.startsWith('/admin')) return false
  if (!workspaceStore.currentWorkspace) return false
  return availableOptions.value.length >= 2
})

const isRouteActiveForView = (t: ViewType) => {
  if (t === ViewType.CONTRACTOR) return route.path.startsWith('/contractor/')
  if (t === ViewType.SUPERVISORY) return route.path.startsWith('/supervisory/')
  return false
}

/** 僅命中萬用路由（PageError）時視為該路徑在另一視角未定義 */
function resolvesToNotFound(path: string): boolean {
  const resolved = router.resolve(path)
  const last = resolved.matched[resolved.matched.length - 1]
  if (!last) return true
  return Boolean(last.meta?.isNotFoundFallback)
}

const switchView = async (targetType: ViewType) => {
  if (!isSuperAdmin.value && !canUseViewType(targetType)) {
    return
  }

  if (isRouteActiveForView(targetType)) {
    return
  }

  setViewType(targetType)

  if (targetType === ViewType.SHARED) {
    return
  }

  const prefix = targetType.toLowerCase()
  let suffix = route.path.replace(/^\/(supervisory|contractor|shared)/, '')
  if (suffix === '') suffix = '/'
  if (!suffix.startsWith('/')) suffix = `/${suffix}`

  let newPath = suffix === '/' ? `/${prefix}/` : `/${prefix}${suffix}`

  if (resolvesToNotFound(newPath)) {
    newPath = `/${prefix}/`
  }

  try {
    await router.push(newPath)
  } catch {
    await router.push(`/${prefix}/`)
  }
}

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

watch(
  () => workspaceStore.currentWorkspace?.id,
  async (newWorkspaceId, oldWorkspaceId) => {
    if (newWorkspaceId && newWorkspaceId !== oldWorkspaceId) {
      await initializeViewType(newWorkspaceId)
    }
  },
  { immediate: false }
)

onMounted(async () => {
  if (workspaceStore.currentWorkspace?.id) {
    await initializeViewType(workspaceStore.currentWorkspace.id)
  }
})
</script>

<style scoped>
.perspective-toggle-wrap {
  margin-right: 0.5rem;
}

/* 與 header 圓鈕（36px）同高，避免膠囊特別突出 */
.perspective-toggle {
  display: inline-flex;
  align-items: stretch;
  box-sizing: border-box;
  height: 36px;
  padding: 2px;
  gap: 2px;
}

.perspective-toggle__btn {
  border: none;
  margin: 0;
  background: transparent;
  color: rgba(var(--bs-app-header-link-color-rgb), 0.55);
  padding: 0 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 0;
  transition:
    background 0.22s ease,
    color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.15s ease;
}

.perspective-toggle__btn:hover:not(.is-active) {
  color: rgba(var(--bs-app-header-link-color-rgb), 0.92);
  background: rgba(var(--bs-app-header-link-color-rgb), 0.1);
}

.perspective-toggle__btn:active {
  transform: scale(0.98);
}

.perspective-toggle__icon {
  font-size: 0.875rem;
  opacity: 0.85;
  line-height: 1;
}

.perspective-toggle__label {
  white-space: nowrap;
}

/* 監造：藍系 */
.perspective-toggle__btn.is-supervisory.is-active {
  color: #fff;
  background: linear-gradient(145deg, rgba(13, 110, 253, 0.55), rgba(13, 110, 253, 0.22));
  box-shadow:
    0 0 0 1px rgba(13, 110, 253, 0.45),
    0 4px 14px rgba(13, 110, 253, 0.28);
}

.perspective-toggle__btn.is-supervisory.is-active .perspective-toggle__icon {
  color: #9ec5fe;
}

/* 營造：琥珀／工地色 */
.perspective-toggle__btn.is-contractor.is-active {
  color: #fff;
  background: linear-gradient(145deg, rgba(253, 186, 64, 0.5), rgba(234, 134, 6, 0.2));
  box-shadow:
    0 0 0 1px rgba(253, 186, 64, 0.5),
    0 4px 14px rgba(234, 134, 6, 0.22);
}

.perspective-toggle__btn.is-contractor.is-active .perspective-toggle__icon {
  color: #ffe08a;
}

/* 未選中時圖示色提示 */
.perspective-toggle__btn.is-supervisory:not(.is-active) .perspective-toggle__icon {
  color: rgba(158, 197, 254, 0.55);
}

.perspective-toggle__btn.is-contractor:not(.is-active) .perspective-toggle__icon {
  color: rgba(255, 224, 138, 0.45);
}

[data-bs-theme='light'] .perspective-toggle__btn.is-supervisory.is-active {
  background: linear-gradient(145deg, #0d6efd, #3d8bfd);
  box-shadow: 0 2px 10px rgba(13, 110, 253, 0.35);
}

[data-bs-theme='light'] .perspective-toggle__btn.is-contractor.is-active {
  background: linear-gradient(145deg, #e5890a, #f4b23d);
  box-shadow: 0 2px 10px rgba(229, 137, 10, 0.35);
}
</style>
