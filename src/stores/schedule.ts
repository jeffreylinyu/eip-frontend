// src/stores/schedule.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ScheduleVersion {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
  taskCount: number
  tasks?: any[]
  startDate?: string
  endDate?: string

  // CPM 佈局（以任務 TaskID 為鍵，儲存節點位置與尺寸）
  cpmLayout?: Record<string, { x: number; y: number; w: number; h: number }>

  // CPM 視角（縮放與卷軸偏移）
  cpmViewport?: { zoom: number; x: number; y: number }

  // CPM 連線路徑（自動產的/你手動調整過的 segments）
  cpmConnectors?: Record<string, any>

  // ✅ 新增：手動拉的連線（只要是「我自己拉」的都可以塞這裡）
  cpmManualConnectors?: Record<string, any>

  // ✅ 新增：連線樣式（只改某一條線的顏色/粗細）
  cpmConnectorStyles?: Record<string, { strokeColor?: string; strokeWidth?: number }>

  // ✅ 新增：被刪掉的連線 id 清單
  cpmDeletedConnectors?: string[]

  // ✅ 新增：整個 Diagram 的 JSON（ej.saveDiagram() 回來的那包）
  cpmDiagramJson?: string
}

// localStorage 鍵名
const STORAGE_KEY = 'eip-schedule-versions'
const CURRENT_VERSION_KEY = 'eip-schedule-current-version'

// 從 localStorage 載入資料
const loadFromStorage = (): ScheduleVersion[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const ensureUid = (obj: any) => {
        if (!obj) return
        if (!obj.Uid) {
          obj.Uid =
            (globalThis as any).crypto && (globalThis as any).crypto.randomUUID
              ? (globalThis as any).crypto.randomUUID()
              : `uid_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
        }
      }
      const mapTask = (task: any): any => {
        const t: any = {
          Uid: task.Uid || '',
          TaskID: task.TaskID || '',
          TaskName: task.TaskName || '',
          StartDate: task.StartDate ? new Date(task.StartDate) : null,
          EndDate: task.EndDate ? new Date(task.EndDate) : null,
          Duration: task.Duration || 0,
          Progress: task.Progress || 0,
          Predecessor: task.Predecessor || '',
          CostRatio: task.CostRatio || 0,
          ActualAmount: task.ActualAmount || 0,
          subtasks: (task.subtasks || []).map((sub: any) => mapTask(sub))
        }
        ensureUid(t)
        return t
      }
      return parsed.map((version: any) => ({
        ...version,
        tasks: (version.tasks || []).map((task: any) => mapTask(task)),
        // 舊資料可能沒有這幾個欄位，這裡補一個預設，避免你在 component 取值時是 undefined
        cpmManualConnectors: version.cpmManualConnectors || {},
        cpmConnectorStyles: version.cpmConnectorStyles || {},
        cpmDeletedConnectors: version.cpmDeletedConnectors || [],
      }))
    }
  } catch (error) {
    console.error('載入排程資料失敗:', error)
  }
  return []
}

// 儲存到 localStorage
const saveToStorage = (versions: ScheduleVersion[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions))
    console.log('排程資料已儲存到 localStorage')
  } catch (error) {
    console.error('儲存排程資料失敗:', error)
  }
}

// 載入當前版本 ID
const loadCurrentVersionId = (): number => {
  try {
    const stored = localStorage.getItem(CURRENT_VERSION_KEY)
    return stored ? parseInt(stored) : 1
  } catch (error) {
    console.error('載入當前版本 ID 失敗:', error)
    return 1
  }
}

// 儲存當前版本 ID
const saveCurrentVersionId = (id: number) => {
  try {
    localStorage.setItem(CURRENT_VERSION_KEY, id.toString())
  } catch (error) {
    console.error('儲存當前版本 ID 失敗:', error)
  }
}

export const useScheduleStore = defineStore('schedule', () => {
  const loadedVersions = loadFromStorage()
  const versions = ref<ScheduleVersion[]>(loadedVersions.length > 0 ? loadedVersions : [])

  // 幫全部任務補 Uid
  const ensureUidsForAll = () => {
    const gen = () =>
      (globalThis as any).crypto && (globalThis as any).crypto.randomUUID
        ? (globalThis as any).crypto.randomUUID()
        : `uid_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    const walk = (tasks: any[]) => {
      if (!Array.isArray(tasks)) return
      tasks.forEach(t => {
        if (!t.Uid) t.Uid = gen()
        if (t.subtasks && t.subtasks.length > 0) walk(t.subtasks)
      })
    }
    versions.value.forEach(v => walk(v.tasks || []))
  }
  ensureUidsForAll()

  const currentVersionId = ref<number | null>(loadCurrentVersionId())

  const currentVersion = computed(() => {
    if (!currentVersionId.value) return null
    return versions.value.find(v => v.id === currentVersionId.value) || null
  })

  const sortedVersions = computed(() => {
    return [...versions.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  })

  const getVersionById = (id: number) => {
    return versions.value.find(v => v.id === id)
  }

  const addVersion = (version: Omit<ScheduleVersion, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newVersion: ScheduleVersion = {
      ...version,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // 確保四個 CPM 欄位有預設
      cpmManualConnectors: {},
      cpmConnectorStyles: {},
      cpmDeletedConnectors: [],
    }
    versions.value.push(newVersion)
    saveToStorage(versions.value)
    return newVersion
  }

  const updateVersion = (id: number, updates: Partial<ScheduleVersion>) => {
    const index = versions.value.findIndex(v => v.id === id)
    if (index > -1) {
      const old = versions.value[index]
      // 把 CPM 的新欄位也合併進來
      versions.value[index] = {
        ...old,
        ...updates,
        cpmManualConnectors: {
          ...(old.cpmManualConnectors || {}),
          ...(updates.cpmManualConnectors || {}),
        },
        cpmConnectorStyles: {
          ...(old.cpmConnectorStyles || {}),
          ...(updates.cpmConnectorStyles || {}),
        },
        cpmDeletedConnectors: updates.cpmDeletedConnectors
          ? [...updates.cpmDeletedConnectors]
          : (old.cpmDeletedConnectors || []),
        updatedAt: new Date().toISOString(),
      }
      saveToStorage(versions.value)
      return versions.value[index]
    }
    return null
  }

  // ✅ 這是你元件在用的那個：一口氣存節點、視角、線、手動線、線的樣式
  const saveCpmLayout = (
    id: number,
    payload: {
      cpmLayout?: Record<string, { x: number; y: number; w: number; h: number }>
      cpmViewport?: { zoom: number; x: number; y: number }
      cpmConnectors?: Record<string, any>
      cpmManualConnectors?: Record<string, any>
      cpmConnectorStyles?: Record<string, { strokeColor?: string; strokeWidth?: number }>
      cpmDeletedConnectors?: string[]
      cpmDiagramJson?: string
    },
  ) => {
    const v = versions.value.find(v => v.id === id)
    if (!v) return null

    if (payload.cpmLayout !== undefined) v.cpmLayout = payload.cpmLayout
    if (payload.cpmViewport !== undefined) v.cpmViewport = payload.cpmViewport
    if (payload.cpmConnectors !== undefined) v.cpmConnectors = payload.cpmConnectors
    if (payload.cpmManualConnectors !== undefined)
      v.cpmManualConnectors = payload.cpmManualConnectors
    if (payload.cpmConnectorStyles !== undefined)
      v.cpmConnectorStyles = payload.cpmConnectorStyles
    if (payload.cpmDeletedConnectors !== undefined)
      v.cpmDeletedConnectors = payload.cpmDeletedConnectors
    if (payload.cpmDiagramJson !== undefined) v.cpmDiagramJson = payload.cpmDiagramJson

    v.updatedAt = new Date().toISOString()
    saveToStorage(versions.value)
    return v
  }

  const deleteVersion = (id: number) => {
    const index = versions.value.findIndex(v => v.id === id)
    if (index > -1) {
      versions.value.splice(index, 1)
      if (currentVersionId.value === id) {
        currentVersionId.value = versions.value[0]?.id || null
        saveCurrentVersionId(currentVersionId.value || 1)
      }
      saveToStorage(versions.value)
      return true
    }
    return false
  }

  const setCurrentVersion = (id: number) => {
    currentVersionId.value = id
    saveCurrentVersionId(id)
  }

  const duplicateVersion = (id: number) => {
    const original = getVersionById(id)
    if (original) {
      const duplicated = addVersion({
        name: `${original.name} (副本)`,
        description: original.description,
        taskCount: original.taskCount,
        tasks: original.tasks ? JSON.parse(JSON.stringify(original.tasks)) : [],
        // 把 CPM 也複製一份，這樣複本打開就有畫面
        cpmLayout: original.cpmLayout ? JSON.parse(JSON.stringify(original.cpmLayout)) : {},
        cpmViewport: original.cpmViewport ? { ...original.cpmViewport } : undefined,
        cpmConnectors: original.cpmConnectors
          ? JSON.parse(JSON.stringify(original.cpmConnectors))
          : {},
        cpmManualConnectors: original.cpmManualConnectors
          ? JSON.parse(JSON.stringify(original.cpmManualConnectors))
          : {},
        cpmConnectorStyles: original.cpmConnectorStyles
          ? JSON.parse(JSON.stringify(original.cpmConnectorStyles))
          : {},
        cpmDeletedConnectors: original.cpmDeletedConnectors
          ? [...original.cpmDeletedConnectors]
          : [],
        cpmDiagramJson: original.cpmDiagramJson || undefined,
      })
      return duplicated
    }
    return null
  }

  // 手動儲存
  const saveToLocalStorage = () => {
    saveToStorage(versions.value)
    saveCurrentVersionId(currentVersionId.value || 1)
    console.log('手動儲存完成')
  }

  return {
    versions,
    currentVersionId,
    currentVersion,
    sortedVersions,
    getVersionById,
    addVersion,
    updateVersion,
    deleteVersion,
    duplicateVersion,
    setCurrentVersion,
    saveToLocalStorage,
    saveCpmLayout,
  }
})
