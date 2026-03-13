import http from './http'

export interface AdminConstructionSpecialSettings {
  constructionId: string
  supervisoryOnboardingCompleted: boolean
  supervisoryOnboardingCompletedAt: string | null
  supervisoryOnboardingCompletedBy: string | null
}

export const adminConstructionApi = {
  getSpecialSettings: async (constructionId: string): Promise<AdminConstructionSpecialSettings> => {
    const data = await http.get(`/management/admin/construction/${constructionId}/special-settings`)
    return data as unknown as AdminConstructionSpecialSettings
  },

  updateSpecialSettings: async (
    constructionId: string,
    payload: { supervisoryOnboardingCompleted: boolean }
  ): Promise<AdminConstructionSpecialSettings> => {
    const data = await http.patch(`/management/admin/construction/${constructionId}/special-settings`, payload)
    return data as unknown as AdminConstructionSpecialSettings
  }
}

