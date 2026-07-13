import http from './http'
import type { Progress2Task } from '@/stores/progress2'

/**
 * 施工進度2 進度編排 API。
 * 後端以「工程案 + 視角（ownerType）」各存一份，監造/營造各自維護。
 */

/** 非營造一律以監造視角存取（與後端 resolveScmViewForConstructionApis 對齊） */
export function toProgress2OwnerType(viewType: string | null | undefined): 'SUPERVISORY' | 'CONTRACTOR' {
  return String(viewType).toUpperCase() === 'CONTRACTOR' ? 'CONTRACTOR' : 'SUPERVISORY'
}

interface PlanPayload {
  ownerType?: string
  tasks?: unknown
  updatedAt?: string | null
}

function unwrapPlan(raw: unknown): PlanPayload {
  if (!raw || typeof raw !== 'object') return {}
  const obj = raw as Record<string, unknown>
  if ('tasks' in obj) return obj as PlanPayload
  if (obj.code != null && obj.code !== 200) {
    throw new Error(String(obj.message || '載入施工進度失敗'))
  }
  if (obj.data && typeof obj.data === 'object') return obj.data as PlanPayload
  return {}
}

/** 取得任務清單（尚無資料回傳空陣列）。回傳原始物件陣列，由 store 正規化。 */
export async function getProgress2Plan(
  constructionId: string,
  ownerType: 'SUPERVISORY' | 'CONTRACTOR'
): Promise<Partial<Progress2Task>[]> {
  const raw = await http.get<unknown>('/management/construction/progress2/plan', {
    params: { constructionId, ownerType }
  })
  const payload = unwrapPlan(raw)
  return Array.isArray(payload.tasks) ? (payload.tasks as Partial<Progress2Task>[]) : []
}

/** 覆寫任務清單。 */
export async function saveProgress2Plan(
  constructionId: string,
  ownerType: 'SUPERVISORY' | 'CONTRACTOR',
  tasks: Progress2Task[]
): Promise<void> {
  const raw = await http.put<unknown>('/management/construction/progress2/plan', {
    constructionId,
    ownerType,
    tasks
  })
  if (raw && typeof raw === 'object' && 'code' in raw) {
    const r = raw as { code?: number; message?: string }
    if (r.code != null && r.code !== 200) {
      throw new Error(r.message || '儲存施工進度失敗')
    }
  }
}
