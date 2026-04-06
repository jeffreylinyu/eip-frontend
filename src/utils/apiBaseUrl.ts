import { storage, StorageKeys } from '@/utils/storage'

/**
 * 與 `api/http.ts` 一致：生產環境固定 VITE_API_URL；開發可覆寫 CUSTOM_API_BASE_URL。
 */
export function getApiBaseURL(): string {
  if (!import.meta.env.PROD) {
    const customUrl = storage.get<string>(StorageKeys.CUSTOM_API_BASE_URL)
    if (customUrl?.trim()) {
      return customUrl.trim()
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8080'
}
