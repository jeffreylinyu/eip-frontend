import { ref, computed } from 'vue'
import { memberBindingApi, type SignableMemberIdentity } from '@/api/memberBinding'

/**
 * 方案 C：載入當前使用者在工程案可選的簽名身份，簽名前須明確選擇 bindingId。
 */
export function useSignableIdentities(constructionId: () => string | undefined) {
  const identities = ref<SignableMemberIdentity[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const selectedBindingId = ref<number | null>(null)

  const selectedIdentity = computed(() =>
    identities.value.find((i) => i.bindingId === selectedBindingId.value) ?? null
  )

  const hasMultipleIdentities = computed(() => identities.value.length > 1)

  const load = async (force = false) => {
    const cid = constructionId()
    if (!cid) {
      identities.value = []
      selectedBindingId.value = null
      return
    }
    if (!force && identities.value.length > 0) return
    isLoading.value = true
    error.value = null
    try {
      const rows = await memberBindingApi.listSignableIdentities(cid)
      identities.value = rows
      if (rows.length === 1) {
        selectedBindingId.value = rows[0].bindingId
      } else if (!rows.some((r) => r.bindingId === selectedBindingId.value)) {
        selectedBindingId.value = null
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '載入簽名身份失敗'
      identities.value = []
      selectedBindingId.value = null
    } finally {
      isLoading.value = false
    }
  }

  const selectBinding = (bindingId: number) => {
    selectedBindingId.value = bindingId
  }

  const formatIdentityLabel = (identity: SignableMemberIdentity): string => {
    const parts = [identity.fullName]
    if (identity.occupationCategory) {
      parts.push(identity.occupationCategory)
    } else if (identity.occupation) {
      parts.push(identity.occupation)
    }
    const scope = identity.participantScope === 'CONTRACTOR' ? '營造' : '監造'
    parts.push(`(${scope})`)
    return parts.join(' · ')
  }

  return {
    identities,
    isLoading,
    error,
    selectedBindingId,
    selectedIdentity,
    hasMultipleIdentities,
    load,
    selectBinding,
    formatIdentityLabel
  }
}
