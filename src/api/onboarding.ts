import http from './http'

export interface SupervisoryOnboardingCheckResult {
  passed: boolean
  summary: string
  details: string[]
}

export interface SupervisoryOnboardingStatus {
  constructionId: string
  completed: boolean
  completedAt: string | null
  completedBy: string | null
  checks: {
    basicData: SupervisoryOnboardingCheckResult
    sitePersonnel: SupervisoryOnboardingCheckResult
    majorItems: SupervisoryOnboardingCheckResult
    projectItemDatabase: SupervisoryOnboardingCheckResult
    tenderMaterialQualityControl: SupervisoryOnboardingCheckResult
  }
}

/** 可傳給 http 的額外設定（例如 skipAuthRedirectOn401 供 Modal 使用） */
export type OnboardingRequestConfig = { skipAuthRedirectOn401?: boolean }

export const onboardingApi = {
  getStatus: async (
    constructionId: string,
    designChangeId?: number | null,
    config?: OnboardingRequestConfig,
    ownerType?: string
  ): Promise<SupervisoryOnboardingStatus> => {
    const params: Record<string, string> = {}
    if (designChangeId !== undefined && designChangeId !== null) params.designChangeId = String(designChangeId)
    if (ownerType) params.ownerType = ownerType
    return await http.get(`/management/constructions/${constructionId}/onboarding/status`, { params, ...config })
  },
  complete: async (constructionId: string): Promise<SupervisoryOnboardingStatus> => {
    return await http.post(`/management/constructions/${constructionId}/onboarding/complete`)
  }
}

