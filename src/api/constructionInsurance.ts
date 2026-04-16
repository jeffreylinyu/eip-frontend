import http from './http'

export type ConstructionInsuranceScope = 'PROJECT' | 'SUPERVISION_COMPANY_IN_PROJECT'

export interface ConstructionInsurance {
  id: number
  constructionId: string
  scope: ConstructionInsuranceScope
  policyNo: string | null
  insuranceCompanyName: string | null
  insuranceType: string | null
  startDate: string | null
  endDate: string | null
  note: string | null
  sortOrder: number | null
  createdAt: string | null
  updatedAt: string | null
}

export interface UpsertConstructionInsuranceRequest {
  scope: ConstructionInsuranceScope
  policyNo?: string | null
  insuranceCompanyName?: string | null
  insuranceType?: string | null
  startDate?: string | null
  endDate?: string | null
  note?: string | null
  sortOrder?: number | null
}

export interface ConstructionInsuranceFile {
  id: number
  constructionId: string
  scope: ConstructionInsuranceScope
  insuranceId: number
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  objectName: string
  signedUrl: string | null
  uploadedBy: string | null
  uploadedAt: string | null
}

export const constructionInsuranceApi = {
  async list(constructionId: string, scope: ConstructionInsuranceScope): Promise<ConstructionInsurance[]> {
    const res = await http.get(`/management/constructions/${constructionId}/insurances`, { params: { scope } })
    return res as unknown as ConstructionInsurance[]
  },
  async create(constructionId: string, req: UpsertConstructionInsuranceRequest): Promise<ConstructionInsurance> {
    const res = await http.post(`/management/constructions/${constructionId}/insurances`, req)
    return res as unknown as ConstructionInsurance
  },
  async update(constructionId: string, insuranceId: number, req: UpsertConstructionInsuranceRequest): Promise<ConstructionInsurance> {
    const res = await http.put(`/management/constructions/${constructionId}/insurances/${insuranceId}`, req)
    return res as unknown as ConstructionInsurance
  },
  async remove(constructionId: string, insuranceId: number): Promise<{ deleted: boolean }> {
    const res = await http.delete(`/management/constructions/${constructionId}/insurances/${insuranceId}`)
    return res as unknown as { deleted: boolean }
  },

  async listFiles(constructionId: string, scope: ConstructionInsuranceScope, insuranceId: number): Promise<ConstructionInsuranceFile[]> {
    const res = await http.get(`/management/constructions/${constructionId}/insurance-documents/files`, { params: { scope, insuranceId } })
    return res as unknown as ConstructionInsuranceFile[]
  },
  async uploadFile(
    constructionId: string,
    scope: ConstructionInsuranceScope,
    file: File,
    insuranceId: number
  ): Promise<ConstructionInsuranceFile> {
    const form = new FormData()
    form.append('file', file)
    form.append('scope', scope)
    form.append('insuranceId', String(insuranceId))
    const res = await http.post(`/management/constructions/${constructionId}/insurance-documents/files`, form)
    return res as unknown as ConstructionInsuranceFile
  },
  async removeFile(constructionId: string, fileId: number): Promise<{ deleted: boolean }> {
    const res = await http.delete(`/management/constructions/${constructionId}/insurance-documents/files/${fileId}`)
    return res as unknown as { deleted: boolean }
  },
}

