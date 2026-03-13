import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ExportTask {
  id: string
  label: string
  /** 呼叫後可中途取消該匯出請求 */
  abort?: () => void
}

export const useExportLoadingStore = defineStore('exportLoading', () => {
  const tasks = ref<ExportTask[]>([])

  const hasTasks = computed(() => tasks.value.length > 0)
  const taskList = computed(() => [...tasks.value])

  function addTask(id: string, label: string, abort?: () => void) {
    if (tasks.value.some((t) => t.id === id)) return
    tasks.value.push({ id, label, abort })
  }

  function removeTask(id: string) {
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  /** 取消該任務（會觸發請求 abort 並從列表移除） */
  function cancelTask(id: string) {
    const task = tasks.value.find((t) => t.id === id)
    if (task?.abort) task.abort()
    removeTask(id)
  }

  return {
    tasks,
    hasTasks,
    taskList,
    addTask,
    removeTask,
    cancelTask
  }
})
