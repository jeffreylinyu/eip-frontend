import { computed } from 'vue'
import { usePermissionStore } from '@/stores/permission'

/**
 * 權限判斷 composable。
 *
 * 元件內用法：
 * ```ts
 * const { hasPermission } = usePermission()
 * const canEditDailyReport = computed(() => hasPermission('daily_report:write'))
 * ```
 * 路由層用法：在 route meta 加 `requiredPermission: 'daily_report:write'`，
 * 由 router guard 統一檢查。
 */
export function usePermission() {
  const store = usePermissionStore()

  return {
    /** 是否具備權限（resource:action 代碼） */
    hasPermission: (permission: string) => store.hasPermission(permission),
    /** 具備任一權限即可 */
    hasAnyPermission: (permissions: string[]) => store.hasAnyPermission(permissions),
    isSystemAdmin: computed(() => store.isSystemAdmin),
    jobTitles: computed(() => store.jobTitles),
    isLoaded: computed(() => store.isLoaded)
  }
}
