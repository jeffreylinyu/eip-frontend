import http from './http'

/** GET /management/me/permissions 的回應（http 攔截器已拆出 data） */
export interface MePermissions {
  systemRole: string | null
  viewType: string | null
  allowedViewTypes: string[]
  workspacePermission: string | null
  companyPermissions: { companyId: string; permission: string | null }[]
  constructionMemberships: {
    constructionId: string
    participantScope: string
    jobTitle: string | null
    constructionPermission: string | null
  }[]
  /** 有效權限集，resource:action 代碼，如 daily_report:write */
  permissions: string[]
}

/**
 * 取得目前登入者的權限資訊。
 * workspaceId / constructionId 省略時，後端使用使用者目前選擇的工作空間／工程案。
 */
export function getMyPermissions(params?: {
  workspaceId?: string
  constructionId?: string
}): Promise<MePermissions> {
  return http.get('/management/me/permissions', { params })
}
