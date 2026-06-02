import http from '@/api/http'

/** 目前工程案資料建構設定（僅供顯示，不含 API Key） */
export interface AiConfigDto {
  documentAi: {
    projectId: string
    location: string
    processorName: string
    fullProcessorName: string
    configured: boolean
  }
  gemini: {
    model: string
    apiKeySet: boolean
  }
}

export async function getAiConfig(): Promise<AiConfigDto | null> {
  const data = await http.get<AiConfigDto | { code: number; message: string; data?: AiConfigDto }>(
    '/management/admin/ai/config'
  )
  if (data && typeof data === 'object' && 'gemini' in data && !('code' in data)) {
    return data as unknown as AiConfigDto
  }
  if (data && typeof data === 'object' && 'code' in data && (data as { code: number }).code === 200 && (data as { data?: AiConfigDto }).data) {
    return (data as { data: AiConfigDto }).data
  }
  return null
}

/** OCR 測試：上傳檔案，使用後端設定的 Processor，回傳 rawText */
export async function ocrTest(
  file: File,
  options?: { nativePdfParsing?: boolean }
): Promise<{ rawText: string } | null> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('nativePdfParsing', String(!!options?.nativePdfParsing))
  // http 攔截器在 200 時會回傳 data 內容（{ rawText }），所以此處拿到的多半已是 { rawText }
  const data = await http.post<{ rawText: string } | { code: number; message: string; data?: { rawText: string } }>(
    '/management/admin/ai/ocr-test',
    formData
  )
  if (data && typeof data === 'object' && 'rawText' in data && typeof (data as { rawText: string }).rawText === 'string') {
    return data as { rawText: string }
  }
  if (data && typeof data === 'object' && 'code' in data && (data as { code: number }).code === 200 && (data as { data?: { rawText: string } }).data?.rawText) {
    return (data as { data: { rawText: string } }).data
  }
  return null
}

export interface LlmTestRequest {
  prompt: string
  userInput: string
}

export interface LlmTestOutputDto {
  summary: string
  keywords: string[]
}

/** LLM 測試：傳入 prompt + userInput，回傳結構化輸出。http 攔截器在 200 時會回傳 data 內容（{ summary, keywords }），故得到即為 LlmTestOutputDto。 */
export async function llmTest(body: LlmTestRequest): Promise<LlmTestOutputDto | null> {
  const data = await http.post<LlmTestOutputDto | { code: number; message: string; data?: LlmTestOutputDto }>(
    '/management/admin/ai/llm-test',
    body
  )
  if (data && typeof data === 'object' && 'summary' in data && Array.isArray((data as unknown as LlmTestOutputDto).keywords)) {
    return data as unknown as LlmTestOutputDto
  }
  if (data && typeof data === 'object' && 'code' in data && (data as { code: number }).code === 200 && (data as { data?: LlmTestOutputDto }).data) {
    return (data as { data: LlmTestOutputDto }).data
  }
  return null
}

export interface ChatMessageDto {
  role: string
  content: string
}

export interface AssistantAskRequest {
  message: string
  systemPrompt?: string
  /** 目前選取的工程案 ID，供後端查「本工程」資料 */
  constructionId?: string
  /** 本輪使用者原始問題（供導覽按鈕判斷；不含對話紀錄包裝） */
  userQuestion?: string
}

export interface AiNavigationHintDto {
  target: string
  label: string
  query?: Record<string, string> | null
}

export interface AssistantAskResponse {
  content: string
  navigationHints?: AiNavigationHintDto[]
}

function parseAssistantAskPayload(data: unknown): AssistantAskResponse | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>
  const payload =
    'content' in root && typeof root.content === 'string'
      ? root
      : root.code === 200 && root.data && typeof root.data === 'object'
        ? (root.data as Record<string, unknown>)
        : null
  if (!payload || typeof payload.content !== 'string') return null
  const hintsRaw = payload.navigationHints
  const navigationHints = Array.isArray(hintsRaw)
    ? hintsRaw
        .filter((h): h is Record<string, unknown> => !!h && typeof h === 'object')
        .map((h) => ({
          target: String(h.target ?? ''),
          label: String(h.label ?? ''),
          query:
            h.query && typeof h.query === 'object' && !Array.isArray(h.query)
              ? Object.fromEntries(
                  Object.entries(h.query as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
                )
              : undefined,
        }))
        .filter((h) => h.target.length > 0)
    : undefined
  return { content: payload.content, navigationHints }
}

/** 智慧 AI 對話框：單輪提問，後端以 Function Calling 查工程資料後回覆。 */
export async function assistantAsk(body: AssistantAskRequest): Promise<AssistantAskResponse | null> {
  const data = await http.post<unknown>('/management/ai/assistant/ask', body, { timeout: 120000 })

  const parsed = parseAssistantAskPayload(data)
  if (parsed) return parsed
  if (data && typeof data === 'object' && 'code' in data && (data as { code: number }).code !== 200) {
    throw new Error((data as { message?: string }).message || 'AI 助理暫時無法回覆')
  }
  return null
}

/** 聊天式對話：傳入對話歷史，回傳助理的純文字回覆。http 攔截器在 200 時回傳 data，故得到可能是 { content } 或完整 body。 */
export async function chat(messages: ChatMessageDto[]): Promise<{ content: string } | null> {
  const data = await http.post<{ content: string } | { code: number; message: string; data?: { content: string } }>(
    '/management/admin/ai/chat',
    { messages }
  )
  if (data && typeof data === 'object' && 'content' in data && typeof (data as { content: string }).content === 'string') {
    return data as { content: string }
  }
  if (data && typeof data === 'object' && 'code' in data && (data as { code: number }).code === 200 && (data as { data?: { content: string } }).data) {
    return (data as { data: { content: string } }).data
  }
  return null
}
