import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { onboardingApi, type SupervisoryOnboardingStatus } from '@/api/onboarding'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'

export const useOnboardingStore = defineStore('onboarding', () => {
  const workspaceStore = useWorkspaceStore()
  const { isSupervisory } = useViewPerspective()

  const statusByConstructionId = ref<Record<string, SupervisoryOnboardingStatus | undefined>>({})
  const isLoading = ref(false)
  const lastFetchedAt = ref<Record<string, number | undefined>>({})
  const inFlight = ref<Record<string, Promise<SupervisoryOnboardingStatus> | undefined>>({})

  const currentConstructionId = computed(() => workspaceStore.currentProject?.id || '')
  const currentStatus = computed(() => {
    const id = currentConstructionId.value
    return id ? statusByConstructionId.value[id] : undefined
  })
  const isCompleted = computed(() => !!currentStatus.value?.completed)

  const shouldUseOnboardingFlow = computed(() => {
    // 只針對監造視角
    if (!isSupervisory.value) return false
    // 必須有選擇工程
    if (!currentConstructionId.value) return false
    return true
  })

  const fetchStatus = async (constructionId: string, force = false): Promise<SupervisoryOnboardingStatus> => {
    if (!constructionId) {
      throw new Error('constructionId is required')
    }

    // 去抖：避免 guard 與頁面同時打重複 API
    const existingInFlight = inFlight.value[constructionId]
    if (existingInFlight) return existingInFlight

    // 快取 30 秒
    const last = lastFetchedAt.value[constructionId] || 0
    if (!force && statusByConstructionId.value[constructionId] && Date.now() - last < 30_000) {
      return statusByConstructionId.value[constructionId]!
    }

    isLoading.value = true
    const p = onboardingApi
      .getStatus(constructionId)
      .then((res) => {
        statusByConstructionId.value[constructionId] = res
        lastFetchedAt.value[constructionId] = Date.now()
        return res
      })
      .finally(() => {
        isLoading.value = false
        inFlight.value[constructionId] = undefined
      })

    inFlight.value[constructionId] = p
    return p
  }

  const complete = async (constructionId: string): Promise<SupervisoryOnboardingStatus> => {
    if (!constructionId) throw new Error('constructionId is required')
    isLoading.value = true
    try {
      const res = await onboardingApi.complete(constructionId)
      statusByConstructionId.value[constructionId] = res
      lastFetchedAt.value[constructionId] = Date.now()
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

