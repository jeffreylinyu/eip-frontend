import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { storage } from '@/utils/storage'

export interface SavedUserSignature {
  id: string
  name: string
  imageData: string
  updatedAt: string
}

const STORAGE_KEY_PREFIX = 'user-signature:'

interface LegacySavedSignature {
  imageData: string
  updatedAt: string
}

function migrateLegacySignature(raw: LegacySavedSignature): SavedUserSignature {
  return {
    id: 'legacy',
    name: '簽名檔',
    imageData: raw.imageData,
    updatedAt: raw.updatedAt
  }
}

function readSignatures(storageKey: string | null): SavedUserSignature[] {
  if (!storageKey) return []
  const raw = storage.get<unknown>(storageKey)
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.filter((item): item is SavedUserSignature => {
      const row = item as SavedUserSignature
      return Boolean(row?.id && row?.imageData)
    })
  }
  if (typeof raw === 'object' && raw && 'imageData' in raw) {
    return [migrateLegacySignature(raw as LegacySavedSignature)]
  }
  return []
}

/** 讀取目前使用者的個人簽名檔（localStorage，與 UserSignature 頁面共用） */
export function useUserSignatures() {
  const authStore = useAuthStore()

  const storageKey = computed(() => {
    const userId = authStore.user?.userId || authStore.user?.id
    return userId ? `${STORAGE_KEY_PREFIX}${userId}` : null
  })

  const signatures = computed(() => readSignatures(storageKey.value))

  const defaultSignature = computed(() => {
    const rows = [...signatures.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    return rows[0] ?? null
  })

  const defaultSignatureImage = computed(() => defaultSignature.value?.imageData ?? '')

  return {
    signatures,
    defaultSignature,
    defaultSignatureImage
  }
}
