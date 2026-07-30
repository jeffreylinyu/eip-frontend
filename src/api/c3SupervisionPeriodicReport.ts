import http from '@/api/http'

export interface C3SummaryRow {
  category: string
  description: string
}

export interface C3InspectionRow {
  inspectionDate: string
  inspectionItem: string
}

export interface C3StaffRow {
  role: string
  name: string
  hours: string
  note: string
}

export interface C3DocumentRow {
  unit: string
  documentDate: string
  documentNo: string
  subject: string
}

export interface C3RiskRow {
  eventDate: string
  description: string
  note: string
}

export interface C3ReportData {
  hostAgency: string
  projectName: string
  serviceName: string
  reportTitle: string
  reportPeriod: string
  issueDate: string
  supervisionUnit: string
  responsiblePerson: string
  designUnit: string
  contractorUnit: string
  projectScope: string
  constructionPeriod: string
  plannedProgress: string
  actualProgress: string
  delayReason: string
  recoveryPlan: string
  monthlyAchievements: string
  c3SummaryRows: C3SummaryRow[]
  c3ConstructionInspectionRows: C3InspectionRow[]
  c3MaterialInspectionRows: C3InspectionRow[]
  c3StaffRows: C3StaffRow[]
  c3OutgoingDocumentRows: C3DocumentRow[]
  c3IncomingDocumentRows: C3DocumentRow[]
  c3RiskRows: C3RiskRow[]
}

export interface C3SupervisionPeriodicReport {
  id: number
  constructionId: string
  title: string
  reportData: C3ReportData
  createdAt: string
  updatedAt: string
}

export type C3ReportPayload = Pick<C3SupervisionPeriodicReport, 'title' | 'reportData'>

const base = '/management/construction/c2-supervision-periodic-reports'

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as { data: T }).data
  return raw as T
}

export async function listC3Reports(
  constructionId: string,
): Promise<C3SupervisionPeriodicReport[]> {
  return unwrap<C3SupervisionPeriodicReport[]>(
    await http.get(base, { params: { constructionId } }),
  ) ?? []
}

export async function getC3Report(
  constructionId: string,
  recordId: number,
): Promise<C3SupervisionPeriodicReport> {
  return unwrap<C3SupervisionPeriodicReport>(
    await http.get(`${base}/${recordId}`, { params: { constructionId } }),
  )
}

export async function createC3Report(
  constructionId: string,
  payload: C3ReportPayload,
): Promise<C3SupervisionPeriodicReport> {
  return unwrap<C3SupervisionPeriodicReport>(
    await http.post(base, payload, { params: { constructionId } }),
  )
}

export async function updateC3Report(
  constructionId: string,
  recordId: number,
  payload: C3ReportPayload,
): Promise<C3SupervisionPeriodicReport> {
  return unwrap<C3SupervisionPeriodicReport>(
    await http.put(`${base}/${recordId}`, payload, { params: { constructionId } }),
  )
}

export async function deleteC3Report(
  constructionId: string,
  recordId: number,
): Promise<void> {
  await http.delete(`${base}/${recordId}`, { params: { constructionId } })
}

export async function exportC3Report(
  constructionId: string,
  recordId: number,
): Promise<Blob> {
  return await http.get(`${base}/${recordId}/export`, {
    params: { constructionId },
    responseType: 'blob',
  }) as unknown as Blob
}
