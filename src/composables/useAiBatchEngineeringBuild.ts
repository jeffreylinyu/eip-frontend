import { ref, computed, watch, onUnmounted } from 'vue'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  startSupervisoryAiBatchGenerate,
  startContractorAiBatchGenerate,
  getAiBatchProgress,
  type AiBatchProgressResponse
} from '@/api/aiBatchGenerate'

export const ENGINEERING_PHASES = [
  {
    label: '正在解析工程資料…',
    subs: ['工項識別中', 'XML 結構分析中', '工程類型判定中']
  },
  {
    label: '正在建立工程架構…',
    subs: ['施工流程建立', '文件關聯分析', '分項架構配置']
  },
  {
    label: '正在導入三級品管制度…',
    subs: ['查驗流程配置', '品質管理標準建立', '自主檢查邏輯分析']
  },
  {
    label: '正在分析材料試驗需求…',
    subs: ['試驗頻率比對', '工項需求檢查', '契約內容分析']
  },
  {
    label: '正在建立工程文件…',
    subs: ['施工計畫生成', '分項內容整理', '文件格式配置']
  },
  {
    label: '正在進行工程邏輯校對…',
    subs: ['文件一致性檢查', '工程流程驗證', '查核風險分析']
  }
] as const

/**
 * 全案 AI 批次生成（工程案資料建構）：啟動後端 job 並輪詢進度，搭配工程引擎動畫 Modal。
 */
export function useAiBatchEngineeringBuild() {
  const { isSupervisory } = useViewPerspective()
  const workspaceStore = useWorkspaceStore()
  const currentProject = computed(() => workspaceStore.currentProject)

  const aiBatchModalOpen = ref(false)
  const aiBatchProgress = ref<AiBatchProgressResponse | null>(null)
  const aiBatchError = ref<string | null>(null)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  const displayedPercent = ref(0)
  const phaseIndex = ref(0)
  const visibleSubs = ref(0)
  const coreStates = ref<boolean[]>(Array(24).fill(false))

  let percentTimer: ReturnType<typeof setInterval> | null = null
  let subTimer: ReturnType<typeof setInterval> | null = null
  let coreTimer: ReturnType<typeof setInterval> | null = null

  function stopAllTimers() {
    if (percentTimer) {
      clearInterval(percentTimer)
      percentTimer = null
    }
    if (subTimer) {
      clearInterval(subTimer)
      subTimer = null
    }
    if (coreTimer) {
      clearInterval(coreTimer)
      coreTimer = null
    }
  }

  function clearPollTimer() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function smoothPercent(target: number) {
    if (percentTimer) clearInterval(percentTimer)
    const start = displayedPercent.value
    const diff = target - start
    let step = 0
    const steps = 45
    percentTimer = setInterval(() => {
      step++
      displayedPercent.value = Math.round(start + diff * (step / steps))
      if (step >= steps) {
        clearInterval(percentTimer!)
        percentTimer = null
        displayedPercent.value = target
      }
    }, 16)
  }

  function startCoreAnimation() {
    if (coreTimer) clearInterval(coreTimer)
    coreTimer = setInterval(() => {
      coreStates.value = coreStates.value.map((active) =>
        active ? Math.random() > 0.18 : Math.random() > 0.52
      )
    }, 320)
  }

  function startSubBullets() {
    visibleSubs.value = 0
    if (subTimer) clearInterval(subTimer)
    subTimer = setInterval(() => {
      if (visibleSubs.value < 3) visibleSubs.value++
      else {
        clearInterval(subTimer!)
        subTimer = null
      }
    }, 550)
  }

  watch(aiBatchModalOpen, (open) => {
    if (open) {
      displayedPercent.value = 0
      phaseIndex.value = 0
      visibleSubs.value = 0
      coreStates.value = Array(24).fill(false)
      startCoreAnimation()
      startSubBullets()
    } else {
      stopAllTimers()
    }
  })

  watch(aiBatchProgress, (progress) => {
    if (!progress) return
    const pct =
      progress.totalSteps > 0
        ? Math.round((progress.currentStep / progress.totalSteps) * 100)
        : progress.status === 'DONE'
          ? 100
          : 0
    smoothPercent(pct)
    const newIdx = Math.min(
      Math.floor(
        (progress.currentStep / Math.max(progress.totalSteps, 1)) * ENGINEERING_PHASES.length
      ),
      ENGINEERING_PHASES.length - 1
    )
    if (newIdx !== phaseIndex.value) {
      phaseIndex.value = newIdx
      startSubBullets()
    }
  })

  async function startAiBatchGenerate() {
    const constructionId = currentProject.value?.id
    if (!constructionId) {
      alert('請先於左側選擇工程案')
      return
    }
    aiBatchModalOpen.value = true
    aiBatchError.value = null
    aiBatchProgress.value = null

    try {
      const { jobId } = isSupervisory.value
        ? await startSupervisoryAiBatchGenerate(constructionId)
        : await startContractorAiBatchGenerate(constructionId)

      clearPollTimer()
      pollTimer = setInterval(async () => {
        try {
          const progress = await getAiBatchProgress(constructionId, jobId)
          aiBatchProgress.value = progress
          if (progress.status === 'DONE' || progress.status === 'FAILED') {
            clearPollTimer()
            if (progress.status === 'FAILED') {
              aiBatchError.value = progress.errorMessage || '生成失敗，請稍後再試'
            }
          }
        } catch {
          /* 忽略輪詢錯誤，繼續嘗試 */
        }
      }, 5000)
    } catch (e: unknown) {
      const err = e as { message?: string }
      aiBatchError.value = err?.message || '啟動失敗，請稍後再試'
    }
  }

  function closeAiBatchModal() {
    aiBatchModalOpen.value = false
    clearPollTimer()
  }

  onUnmounted(() => {
    clearPollTimer()
    stopAllTimers()
  })

  return {
    currentProject,
    aiBatchModalOpen,
    aiBatchProgress,
    aiBatchError,
    displayedPercent,
    phaseIndex,
    visibleSubs,
    coreStates,
    startAiBatchGenerate,
    closeAiBatchModal
  }
}
