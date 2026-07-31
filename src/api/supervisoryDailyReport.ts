import http from '@/api/http'
import { downloadBlob } from '@/utils/blobDownload'
import { downloadBlobAsFile } from '@/api/forms'

export type PreConstructionCheckStatus = 'COMPLETED' | 'INCOMPLETE' | null

export interface SupervisoryPublicWorksReport {
  id?: number | null
  constructionId?: string | null
  reportDate: string
  weatherMorning: string | null
  weatherAfternoon: string | null
  reportNumber: string | null
  projectName: string | null
  contractDurationDays: number | null
  startDate: string | null
  scheduledCompletionDate: string | null
  actualCompletionDate: string | null
  contractChangeCount: number | null
  extensionDays: number | null
  originalContractAmount: number | null
  revisedContractAmount: number | null
  plannedProgress: number | null
  actualProgress: number | null
  workProgressDescription: string | null
  designDrawingSupervision: string | null
  materialQualityInspection: string | null
  preConstructionCheckStatus: PreConstructionCheckStatus
  otherSafetySupervision: string | null
  otherContractSupervision: string | null
  supervisoryUnitStamp: string | null
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  createdAt?: string | null
  updatedAt?: string | null
}

const basePath = (constructionId: string) =>
  `/management/constructions/${encodeURIComponent(constructionId)}/supervisory-public-works-reports`

export async function getSupervisoryPublicWorksReport(
  constructionId: string,
  reportDate: string
): Promise<SupervisoryPublicWorksReport> {
  return http.get(`${basePath(constructionId)}/${reportDate}`)
}

export async function saveSupervisoryPublicWorksReport(
  constructionId: string,
  report: SupervisoryPublicWorksReport
): Promise<SupervisoryPublicWorksReport> {
  return http.put(`${basePath(constructionId)}/${report.reportDate}`, report)
}

export async function exportSupervisoryPublicWorksReport(
  constructionId: string,
  reportDate: string
): Promise<void> {
  const response = await downloadBlob({
    url: `${basePath(constructionId)}/${reportDate}/export`,
    method: 'GET',
    includeContentType: false,
  })
  downloadBlobAsFile(
    response.data,
    `Public_Works_Supervision_Report_${reportDate}.docx`
  )
}
