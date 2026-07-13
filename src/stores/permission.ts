import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMyPermissions, type MePermissions } from '@/api/me'

/**
 * 權限 store — 前端權限判斷的唯一資料來源。
 *
 * 登入後或切換工作空間／工程案時呼叫 load() 一次並快取；
 * hasPermission() 以後端回傳的權限集判斷（後端目前對所有職位回傳全部權限，
 * 日後在後端 JobTitlePermissionPolicy 收緊時，前端不需要改任何程式）。
 *
 * 注意：尚未載入或載入失敗時 hasPermission() 回傳 true（fail-open）。
 * 這是上線前的過渡設計，正式啟用職位權限後應改為 fail-closed。
 */
export const usePermissionStore = defineStore('permission', () => {
  const me = ref<MePermissions | null>(null)
  const isLoading = ref(false)
  /** 已載入的上下文，用來偵測工作空間／工程案切換後需要重載 */
  const loadedKey = ref<string | null>(null)
  /** in-flight 請求；並發呼叫共用同一個 promise，避免重複打 API */
  let loadPromise: Promise<void> | null = null

  const permissionSet = computed(() => new Set(me.value?.permissions ?? []))
  const isLoaded = computed(() => me.value !== null)
  const systemRole = computed(() => me.value?.systemRole ?? null)
  const isSystemAdmin = computed(
    () => systemRole.value === 'SUPER_ADMIN' || systemRole.value === 'ADMIN'
  )
  const jobTitles = computed(() =>
    (me.value?.constructionMemberships ?? [])
      .map((m) => m.jobTitle)
      .filter((t): t is string => !!t)
  )

  const contextKey = (workspaceId?: string, constructionId?: string) =>
    `${workspaceId ?? ''}|${constructionId ?? ''}`

  /**
   * 載入權限資訊；同一上下文已載入時不重打（force 可強制重載）。
   */
  const load = (options?: {
    workspaceId?: string
    constructionId?: string
    force?: boolean
  }): Promise<void> => {
    const key = contextKey(options?.workspaceId, options?.constructionId)
    if (!options?.force && loadedKey.value === key && me.value) return Promise.resolve()
    if (loadPromise) return loadPromise
    isLoading.value = true
    loadPromise = getMyPermissions({
      workspaceId: options?.workspaceId,
      constructionId: options?.constructionId
    })
      .then((data) => {
        me.value = data
        loadedKey.value = key
      })
      .catch((e) => {
        console.warn('[Permission] 載入權限失敗（暫以放行處理）:', e)
      })
      .finally(() => {
        isLoading.value = false
        loadPromise = null
      })
    return loadPromise
  }

  /**
   * 是否具備權限（resource:action 代碼）。
   * 未載入／載入失敗時放行（過渡期 fail-open，見 store 註解）。
   */
  const hasPermission = (permission: string): boolean => {
    if (!me.value) return true
    if (isSystemAdmin.value) return true
    return permissionSet.value.has(permission)
  }

  /** 具備任一權限即可（anyOf 語義） */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (permissions.length === 0) return true
    return permissions.some((p) => hasPermission(p))
  }

  const clear = () => {
    me.value = null
    loadedKey.value = null
  }

  return {
    me,
    isLoading,
    isLoaded,
    systemRole,
    isSystemAdmin,
    jobTitles,
    load,
    hasPermission,
    hasAnyPermission,
    clear
  }
})
