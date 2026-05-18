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
}

export async function startSupervisoryAiBatchGenerate(
  constructionId: string
): Promise<AiBatchJobResponse> {
  const data = await http.post<AiBatchJobResponse>(
    `/management/construction/${encodeURIComponent(constructionId)}/ai-batch-generate/supervisory`,
    {}
  )
  return data as unknown as AiBatchJobResponse
}

export async function startContractorAiBatchGenerate(
  constructionId: string
): Promise<AiBatchJobResponse> {
  const data = await http.post<AiBatchJobResponse>(
    `/management/construction/${encodeURIComponent(constructionId)}/ai-batch-generate/contractor`,
    {}
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
