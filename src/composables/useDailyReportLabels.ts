import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useRoute } from 'vue-router'
import { useViewPerspective } from '@/composables/useViewPerspective'

export function dailyLogLabelForContractor(isContractor: boolean): string {
  return isContractor ? '施工日誌' : '監造日誌'
}

export function dailyLogManageLabelForContractor(isContractor: boolean): string {
  return isContractor ? '施工日誌管理' : '監造日誌管理'
}

/**
 * 監造端顯示「監造日誌」、營造端顯示「施工日誌」；共用同一組 daily-report 頁面。
 * @param ownerTypeOverride 行事曆等場景可傳 SUPERVISORY | CONTRACTOR 覆寫路由推斷
 */
export function useDailyReportLabels(
  ownerTypeOverride?: MaybeRefOrGetter<'SUPERVISORY' | 'CONTRACTOR' | undefined>
) {
  const route = useRoute()
  const { isContractor } = useViewPerspective()

  const isContractorView = computed(() => {
    const ot = toValue(ownerTypeOverride)
    if (ot === 'CONTRACTOR') return true
    if (ot === 'SUPERVISORY') return false
    if (route.path.startsWith('/contractor')) return true
    if (route.path.startsWith('/supervisory')) return false
    return isContractor.value
  })

  const dailyLogLabel = computed(() => dailyLogLabelForContractor(isContractorView.value))
  const dailyLogManageLabel = computed(() => dailyLogManageLabelForContractor(isContractorView.value))

  return { dailyLogLabel, dailyLogManageLabel, isContractorView }
}
