/**
 * API Base URL：依部署設定固定使用 VITE_API_URL。
 */
export function getApiBaseURL(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:8080'
}
