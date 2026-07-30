import http from '@/api/http'

export type AiBatchJobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

export interface AiBatchJobResponse {
  jobId: string
}

export interface AiBatchProgressResponse {
  jobId: string
  status: AiBatchJobStatus
  currentStep: number
  totalSteps: number
  stepLabel: string
  errorMessage?: string | null
  failedItems?: string[]
}

export interface PlanGenerationOption {
  key: string
  label: string
  hasExistingData: boolean
}

export async function startSupervisoryAiBatchGenerate(
  constructionId: string,
  designChangeId: number | null
): Promise<AiBatchJobResponse> {
  const data = await http.post<AiBatchJobResponse>(
    `/management/construction/${encodeURIComponent(constructionId)}/ai-batch-generate/supervisory`,
    { designChangeId, versionSelected: true }
  )
  return data as unknown as AiBatchJobResponse
}

export async function startContractorAiBatchGenerate(
  constructionId: string,
  designChangeId: number | null
): Promise<AiBatchJobResponse> {
  const data = await http.post<AiBatchJobResponse>(
    `/management/construction/${encodeURIComponent(constructionId)}/ai-batch-generate/contractor`,
    { designChangeId, versionSelected: true }
  )
  return data as unknown as AiBatchJobResponse
}

export async function getAiBatchProgress(
  constructionId: string,
  jobId: string
): Promise<AiBatchProgressResponse> {
  const data = await http.get<AiBatchProgressResponse>(
    `/management/construction/${encodeURIComponent(constructionId)}/ai-batch-generate/status/${encodeURIComponent(jobId)}`
  )
  return data as unknown as AiBatchProgressResponse
}

export async function getPlanGenerationOptions(
  constructionId: string,
  perspective: 'SUPERVISORY' | 'CONTRACTOR',
  designChangeId: number | null
): Promise<PlanGenerationOption[]> {
  const data = await http.get<PlanGenerationOption[]>(
    `/management/construction/${encodeURIComponent(constructionId)}/plan-batch-generate/options/${perspective.toLowerCase()}`,
    { params: { designChangeId } }
  )
  return data as unknown as PlanGenerationOption[]
}

async function startPlanBatchGenerate(
  constructionId: string,
  perspective: 'supervisory' | 'contractor',
  designChangeId: number | null,
  planKeys: string[]
): Promise<AiBatchJobResponse> {
  const data = await http.post<AiBatchJobResponse>(
    `/management/construction/${encodeURIComponent(constructionId)}/plan-batch-generate/${perspective}`,
    { designChangeId, versionSelected: true, planKeys }
  )
  return data as unknown as AiBatchJobResponse
}

export function startSupervisoryPlanBatchGenerate(
  constructionId: string,
  designChangeId: number | null,
  planKeys: string[]
) {
  return startPlanBatchGenerate(constructionId, 'supervisory', designChangeId, planKeys)
}

export function startContractorPlanBatchGenerate(
  constructionId: string,
  designChangeId: number | null,
  planKeys: string[]
) {
  return startPlanBatchGenerate(constructionId, 'contractor', designChangeId, planKeys)
}
