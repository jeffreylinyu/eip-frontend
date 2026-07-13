import type { SelfCheckOwnerType } from '@/api/selfCheckInspection'
import type { SignableMemberIdentity } from '@/api/memberBinding'

export function resolveInspectorRoleLabel(ownerType: SelfCheckOwnerType): string {
  return ownerType === 'SUPERVISORY' ? '品管人員' : '現場工程師'
}

export function resolveInspectorOccupation(ownerType: SelfCheckOwnerType): string {
  return ownerType === 'SUPERVISORY' ? 'QUALITY' : 'SITE_ENGINEER'
}

export function filterInspectorIdentities(
  identities: SignableMemberIdentity[],
  ownerType: SelfCheckOwnerType
): SignableMemberIdentity[] {
  const requiredOccupation = resolveInspectorOccupation(ownerType)
  return identities.filter((identity) => identity.occupation?.toUpperCase() === requiredOccupation)
}
