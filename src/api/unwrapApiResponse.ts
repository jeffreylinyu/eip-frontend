export interface ApiEnvelope<T> {
  code: number
  message?: string
  data: T
}

export function unwrapApiResponse<T>(payload: ApiEnvelope<T> | T): T | ApiEnvelope<T> {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'code' in payload &&
    (payload as { code?: unknown }).code === 200 &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload
}
