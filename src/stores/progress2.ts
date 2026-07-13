// src/stores/progress2.ts
// 施工進度2：進度編排資料，依「視角（監造/營造）+ 工程案」分開儲存。
// 持久化走後端 API（/management/construction/progress2/plan，與手機版共用同一份資料）；
// localStorage 僅作離線快取（API 失敗時的後備顯示）。
// 項目來源：監造 = 施工項目（construction-major-items）；營造 = 分項工程（subdivision-work-items）。
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { storage, StorageKeys } from '@/utils/storage'
import { getProgress2Plan, saveProgress2Plan, toProgress2OwnerType } from '@/api/progress2'

/** 進度項目（來源為施工大項，也可人工新增） */
export interface Progress2Task {
  /** 前端產生的唯一識別碼 */
  id: string
  /** 對應來源項目 id（監造：施工項目；營造：分項工程）；人工新增項目為 null */
  majorItemId: string | null
  name: string
  /** YYYY-MM-DD；尚未編排時為 null */
  startDate: string | null
  /** YYYY-MM-DD；尚未編排時為 null */
  endDate: string | null
  /** 實際進度 0-100 */
  progress: number
  /** 權重（%），S 曲線加權用；全部為 0 時以工期天數當權重 */
  costRatio: number
}

export interface Progress2Plan {
  tasks: Progress2Task[]
  updatedAt: string
}

type PlanMap = Record<string, Progress2Plan>

export const genProgress2Id = (): string =>
  (globalThis as any).crypto?.randomUUID
    ? (globalThis as any).crypto.randomUUID()
    : `p2_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

const normalizeTask = (raw: any): Progress2Task => ({
  id: typeof raw?.id === 'string' && raw.id ? raw.id : genProgress2Id(),
  majorItemId: raw?.majorItemId != null ? String(raw.majorItemId) : null,
  name: String(raw?.name ?? ''),
  startDate: typeof raw?.startDate === 'string' && raw.startDate ? raw.startDate : null,
  endDate: typeof raw?.endDate === 'string' && raw.endDate ? raw.endDate : null,
  progress: Number.isFinite(Number(raw?.progress)) ? Math.min(100, Math.max(0, Number(raw.progress))) : 0,
  costRatio: Number.isFinite(Number(raw?.costRatio)) ? Math.max(0, Number(raw.costRatio)) : 0
})

const loadPlans = (): PlanMap => {
  try {
    const stored = storage.get<PlanMap>(StorageKeys.PROGRESS2_DATA)
    if (stored && typeof stored === 'object') {
      const result: PlanMap = {}
      Object.entries(stored).forEach(([cid, plan]) => {
        result[cid] = {
          tasks: Array.isArray((plan as Progress2Plan)?.tasks)
            ? (plan as Progress2Plan).tasks.map(normalizeTask)
            : [],
          updatedAt: (plan as Progress2Plan)?.updatedAt || new Date().toISOString()
        }
      })
      return result
    }
  } catch (error) {
    console.error('載入施工進度2資料失敗:', error)
  }
  return {}
}

export const useProgress2Store = defineStore('progress2', () => {
  const plans = ref<PlanMap>(loadPlans())
  const currentConstructionId = ref<string>('')
  /** 監造與營造各自維護一份資料 */
  const currentViewType = ref<string>('SUPERVISORY')
  /** 從後端載入中 */
  const loading = ref(false)

  /** 已從後端載入過的鍵（避免同一情境重複打 API） */
  const loadedKeys = new Set<string>()
  let loadSeq = 0
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  /** localStorage 離線快取（API 失敗時的後備顯示） */
  const persistLocalCache = () => {
    try {
      storage.set(StorageKeys.PROGRESS2_DATA, plans.value)
    } catch (error) {
      console.error('儲存施工進度2快取失敗:', error)
    }
  }

  /** 從後端載入目前情境的任務清單（成功後覆寫本機快取） */
  const loadFromServer = async () => {
    const cid = currentConstructionId.value
    const key = currentPlanKey.value
    if (!cid || !key) return
    const ownerType = toProgress2OwnerType(currentViewType.value)
    const seq = ++loadSeq
    loading.value = true
    try {
      const rawTasks = await getProgress2Plan(cid, ownerType)
      if (seq !== loadSeq) return
      if (rawTasks.length === 0) {
        // 後端尚無資料：若本機有先前（localStorage 時期）的編排，
        // 自動採用並上傳，讓手機端也能看到同一份資料。
        // 相容更早期未分視角的鍵（純 constructionId）。
        const legacy =
          (plans.value[key]?.tasks.length ? plans.value[key] : null) ??
          (plans.value[cid]?.tasks.length ? plans.value[cid] : null)
        if (legacy) {
          plans.value[key] = {
            tasks: legacy.tasks.map(normalizeTask),
            updatedAt: new Date().toISOString()
          }
          loadedKeys.add(key)
          persistLocalCache()
          scheduleServerSave()
          return
        }
      }
      plans.value[key] = {
        tasks: rawTasks.map(normalizeTask),
        updatedAt: new Date().toISOString()
      }
      loadedKeys.add(key)
      persistLocalCache()
    } catch (error) {
      // 後端不可用時保留本機快取內容
      console.error('載入施工進度2失敗（改用本機快取）:', error)
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  /** debounce 後寫回後端（快取先行，確保畫面即時） */
  const scheduleServerSave = () => {
    const cid = currentConstructionId.value
    const key = currentPlanKey.value
    if (!cid || !key) return
    const ownerType = toProgress2OwnerType(currentViewType.value)
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      const tasks = plans.value[key]?.tasks ?? []
      saveProgress2Plan(cid, ownerType, tasks).catch((error) => {
        console.error('儲存施工進度2至後端失敗:', error)
      })
    }, 600)
  }

  const setContext = (constructionId: string, viewType: string) => {
    currentConstructionId.value = constructionId || ''
    currentViewType.value = viewType || 'SUPERVISORY'
    const key = currentPlanKey.value
    if (key && !loadedKeys.has(key)) {
      void loadFromServer()
    }
  }

  /** 儲存鍵：視角 + 工程案 */
  const currentPlanKey = computed(() => {
    if (!currentConstructionId.value) return ''
    return `${currentViewType.value}:${currentConstructionId.value}`
  })

  const ensurePlan = (planKey: string): Progress2Plan => {
    if (!plans.value[planKey]) {
      plans.value[planKey] = { tasks: [], updatedAt: new Date().toISOString() }
    }
    return plans.value[planKey]
  }

  const currentPlan = computed<Progress2Plan | null>(() => {
    if (!currentPlanKey.value) return null
    return plans.value[currentPlanKey.value] || null
  })

  const tasks = computed<Progress2Task[]>(() => currentPlan.value?.tasks || [])

  const touch = () => {
    const key = currentPlanKey.value
    if (!key) return
    ensurePlan(key).updatedAt = new Date().toISOString()
    persistLocalCache()
    scheduleServerSave()
  }

  /** 覆寫整份任務清單（AI 編排套用、批次匯入等） */
  const setTasks = (nextTasks: Progress2Task[]) => {
    const key = currentPlanKey.value
    if (!key) return
    ensurePlan(key).tasks = nextTasks.map(normalizeTask)
    touch()
  }

  const addTask = (partial?: Partial<Progress2Task>): Progress2Task => {
    const key = currentPlanKey.value
    const task = normalizeTask({ ...partial, id: genProgress2Id() })
    if (!task.name) task.name = `新項目 ${(currentPlan.value?.tasks.length || 0) + 1}`
    if (key) {
      ensurePlan(key).tasks.push(task)
      touch()
    }
    return task
  }

  const updateTask = (id: string, patch: Partial<Progress2Task>) => {
    const plan = currentPlan.value
    if (!plan) return
    const idx = plan.tasks.findIndex((t) => t.id === id)
    if (idx < 0) return
    const merged = normalizeTask({ ...plan.tasks[idx], ...patch, id })
    plan.tasks.splice(idx, 1, merged)
    touch()
  }

  const removeTask = (id: string) => {
    const plan = currentPlan.value
    if (!plan) return
    const idx = plan.tasks.findIndex((t) => t.id === id)
    if (idx < 0) return
    plan.tasks.splice(idx, 1)
    touch()
  }

  /** 上移 / 下移一個位置 */
  const moveTask = (id: string, direction: -1 | 1) => {
    const plan = currentPlan.value
    if (!plan) return
    const idx = plan.tasks.findIndex((t) => t.id === id)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= plan.tasks.length) return
    const [task] = plan.tasks.splice(idx, 1)
    plan.tasks.splice(target, 0, task)
    touch()
  }

  const clearTasks = () => {
    const key = currentPlanKey.value
    if (!key) return
    ensurePlan(key).tasks = []
    touch()
  }

  /** 匯入來源項目（施工項目/分項工程）為進度項目；已存在（majorItemId 相同）者略過 */
  const importMajorItems = (items: { id: string; name: string }[]): number => {
    const key = currentPlanKey.value
    if (!key) return 0
    const plan = ensurePlan(key)
    const existing = new Set(plan.tasks.map((t) => t.majorItemId).filter(Boolean))
    let added = 0
    items.forEach((item) => {
      if (existing.has(String(item.id))) return
      plan.tasks.push(
        normalizeTask({
          id: genProgress2Id(),
          majorItemId: String(item.id),
          name: item.name
        })
      )
      added++
    })
    if (added > 0) touch()
    return added
  }

  return {
    plans,
    currentConstructionId,
    currentViewType,
    currentPlan,
    tasks,
    loading,
    loadFromServer,
    setContext,
    setTasks,
    addTask,
    updateTask,
    removeTask,
    moveTask,
    clearTasks,
    importMajorItems
  }
})
