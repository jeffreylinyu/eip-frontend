import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { onboardingApi, type SupervisoryOnboardingStatus } from '@/api/onboarding'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective'

/** 與 store 內快取鍵一致；SetupOverview 等僅監造開通流程需固定讀 SUPERVISORY 鍵 */
export function onboardingCacheKey(constructionId: string, ownerType?: string) {
  const ot =
    ownerType === ViewType.CONTRACTOR || ownerType === 'CONTRACTOR'
      ? 'CONTRACTOR'
      : ownerType === ViewType.SUPERVISORY || ownerType === 'SUPERVISORY'
        ? 'SUPERVISORY'
        : 'AUTO'
  return `${constructionId}#${ot}`
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const workspaceStore = useWorkspaceStore()
  const { isSupervisory, viewType } = useViewPerspective()

  const statusByConstructionId = ref<Record<string, SupervisoryOnboardingStatus | undefined>>({})
  const isLoading = ref(false)
  const lastFetchedAt = ref<Record<string, number | undefined>>({})
  const inFlight = ref<Record<string, Promise<SupervisoryOnboardingStatus> | undefined>>({})

  const currentConstructionId = computed(() => workspaceStore.currentProject?.id || '')
  const currentCacheKey = computed(() => {
    const id = currentConstructionId.value
    if (!id) return ''
    const v = viewType.value
    if (v === ViewType.CONTRACTOR) return onboardingCacheKey(id, 'CONTRACTOR')
    if (v === ViewType.SUPERVISORY) return onboardingCacheKey(id, 'SUPERVISORY')
    return onboardingCacheKey(id)
  })
  const currentStatus = computed(() => {
    const k = currentCacheKey.value
    return k ? statusByConstructionId.value[k] : undefined
  })
  const isCompleted = computed(() => !!currentStatus.value?.completed)

  const shouldUseOnboardingFlow = computed(() => {
    // 只針對監造視角
    if (!isSupervisory.value) return false
    // 必須有選擇工程
    if (!currentConstructionId.value) return false
    return true
  })

  const fetchStatus = async (
    constructionId: string,
    force = false,
    ownerType?: string
  ): Promise<SupervisoryOnboardingStatus> => {
    if (!constructionId) {
      throw new Error('constructionId is required')
    }

    const apiOwnerType =
      ownerType === 'CONTRACTOR'
        ? 'CONTRACTOR'
        : ownerType === 'SUPERVISORY'
          ? 'SUPERVISORY'
          : undefined
    const key = onboardingCacheKey(constructionId, apiOwnerType)

    // 去抖：避免 guard 與頁面同時打重複 API
    const existingInFlight = inFlight.value[key]
    if (existingInFlight) return existingInFlight

    // 快取 30 秒
    const last = lastFetchedAt.value[key] || 0
    if (!force && statusByConstructionId.value[key] && Date.now() - last < 30_000) {
      return statusByConstructionId.value[key]!
    }

    isLoading.value = true
    const p = onboardingApi
      .getStatus(constructionId, undefined, undefined, apiOwnerType)
      .then((res) => {
        statusByConstructionId.value[key] = res
        lastFetchedAt.value[key] = Date.now()
        return res
      })
      .finally(() => {
        isLoading.value = false
        inFlight.value[key] = undefined
      })

    inFlight.value[key] = p
    return p
  }

  const complete = async (constructionId: string): Promise<SupervisoryOnboardingStatus> => {
    if (!constructionId) throw new Error('constructionId is required')
    const key = onboardingCacheKey(constructionId, 'SUPERVISORY')
    isLoading.value = true
    try {
      const res = await onboardingApi.complete(constructionId)
      statusByConstructionId.value[key] = res
      lastFetchedAt.value[key] = Date.now()
      return res
    } finally {
      isLoading.value = false
    }
  }

  return {
    // state
    statusByConstructionId,
    isLoading,
    // getters
    currentConstructionId,
    currentStatus,
    isCompleted,
    shouldUseOnboardingFlow,
    // actions
    fetchStatus,
    complete
  }
})
