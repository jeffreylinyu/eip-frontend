import http from '@/api/http'

export interface CoordinationAttendeeRow {
  unit: string
  name: string
  title: string
}

export interface CoordinationDocumentRow {
  itemName: string
  submissionDate: string
  note: string
}

export interface CoordinationWorkAreaRow {
  location: string
  ceilingStatus: string
  hvacStatus: string
  startDate: string
  completionDate: string
}

export interface CoordinationQuantityRow {
  area: string
  description: string
}

export interface CoordinationPreviousMeetingRow {
  caseNo: string
  subject: string
  handlingStatus: string
  closedLabel: string
}

export interface CoordinationConclusionRow {
  content: string
}

export interface CoordinationMeetingData {
  projectName: string
  meetingTitle: string
  meetingPeriod: string
  meetingDate: string
  meetingTime: string
  location: string
  chairperson: string
  recorder: string
  hostAgency: string
  contractorUnit: string
  supervisionUnit: string
  plannedPeriodProgress: string
  plannedTotalProgress: string
  actualTotalProgress: string
  progressStatus: string
  progressVariance: string
  progressExplanation: string
  currentWork: string
  contractControlNote: string
  materialEquipmentControl: string
  constructionProgressNote: string
  nextPeriodPlan: string
  keySupervisionItems: string
  announcements: string
  pendingItems: string
  adjournmentTime: string
  attendeeRows: CoordinationAttendeeRow[]
  documentControlRows: CoordinationDocumentRow[]
  workAreaRows: CoordinationWorkAreaRow[]
  quantityRows: CoordinationQuantityRow[]
  previousMeetingRows: CoordinationPreviousMeetingRow[]
  conclusionRows: CoordinationConclusionRow[]
}

export interface CoordinationMeetingRecord {
  id: number
  constructionId: string
  ownerType: 'SUPERVISORY' | 'CONTRACTOR'
  title: string
  meetingData: CoordinationMeetingData
  createdAt: string
  updatedAt: string
}

export interface CoordinationMeetingPayload {
  title: string
  meetingData: CoordinationMeetingData
}

function base(constructionId: string) {
  return `/management/constructions/${encodeURIComponent(constructionId)}/coordination-meeting-records`
}

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: T }).data
  return raw as T
}

export async function listCoordinationMeetings(
  constructionId: string,
): Promise<CoordinationMeetingRecord[]> {
  return unwrap<CoordinationMeetingRecord[]>(await http.get(base(constructionId))) ?? []
}

export async function getCoordinationMeeting(
  constructionId: string,
  recordId: number,
): Promise<CoordinationMeetingRecord> {
  return unwrap<CoordinationMeetingRecord>(
    await http.get(`${base(constructionId)}/${recordId}`),
  )
}

export async function createCoordinationMeeting(
  constructionId: string,
  payload: CoordinationMeetingPayload,
): Promise<CoordinationMeetingRecord> {
  return unwrap<CoordinationMeetingRecord>(await http.post(base(constructionId), payload))
}

export async function updateCoordinationMeeting(
  constructionId: string,
  recordId: number,
  payload: CoordinationMeetingPayload,
): Promise<CoordinationMeetingRecord> {
  return unwrap<CoordinationMeetingRecord>(
    await http.put(`${base(constructionId)}/${recordId}`, payload),
  )
}

export async function deleteCoordinationMeeting(
  constructionId: string,
  recordId: number,
): Promise<void> {
  await http.delete(`${base(constructionId)}/${recordId}`)
}

export async function exportCoordinationMeeting(
  constructionId: string,
  recordId: number,
): Promise<Blob> {
  return await http.get(`${base(constructionId)}/${recordId}/export`, {
    responseType: 'blob',
  }) as unknown as Blob
}
