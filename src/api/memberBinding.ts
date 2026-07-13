import http from './http'

export type ConstructionParticipantScope = 'SUPERVISORY' | 'CONTRACTOR'

export type SignRole = 'INSPECTOR' | 'REVIEWER'

export interface UserConstructionMemberBinding {
  id: number
  userId: string
  userDisplayName?: string | null
  userEmail?: string | null
  constructionId: string
  participantScope: ConstructionParticipantScope
  constructionMemberId?: number | null
  supervisoryMemberId?: number | null
  bindingType: string
  enabled: boolean
  effectiveFrom?: string | null
  effectiveTo?: string | null
  memberFullName?: string | null
  memberOccupation?: string | null
  memberOccupationCategory?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** 當前使用者可選擇的簽名身份（方案 C） */
export interface SignableMemberIdentity {
  bindingId: number
  participantScope: ConstructionParticipantScope
  constructionMemberId?: number | null
  supervisoryMemberId?: number | null
  fullName: string
  occupation?: string | null
  occupationCategory?: string | null
  bindingType: string
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

export interface CreateMemberBindingRequest {
  userId: string
  constructionId: string
  participantScope: ConstructionParticipantScope
  constructionMemberId?: number
  supervisoryMemberId?: number
  bindingType?: string
  enabled?: boolean
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

export interface UpdateMemberBindingRequest {
  enabled?: boolean
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

export interface ConstructionMemberSignRequest {
  bindingId: number
  signRole: SignRole
  signatureImage: string
}

const BASE = '/management/constructionMemberBinding'

export const memberBindingApi = {
  listBindings(constructionId: string): Promise<UserConstructionMemberBinding[]> {
    return http.get(BASE, { params: { constructionId } })
  },

  listSignableIdentities(constructionId: string): Promise<SignableMemberIdentity[]> {
    return http.get(`${BASE}/signable-identities`, {
      params: { constructionId }
    })
  },

  createBinding(data: CreateMemberBindingRequest): Promise<UserConstructionMemberBinding> {
    return http.post(BASE, data)
  },

  updateBinding(bindingId: number, data: UpdateMemberBindingRequest): Promise<UserConstructionMemberBinding> {
    return http.patch(`${BASE}/${bindingId}`, data)
  },

  disableBinding(bindingId: number): Promise<UserConstructionMemberBinding> {
    return http.post(`${BASE}/${bindingId}/disable`)
  },

  enableBinding(bindingId: number): Promise<UserConstructionMemberBinding> {
    return http.post(`${BASE}/${bindingId}/enable`)
  }
}
