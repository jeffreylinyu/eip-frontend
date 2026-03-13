<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { getDesignChangeList, type DesignChangeItem } from '@/api/designChange'
import { getOriginalContractIntervalISO, getDesignChangeIntervalISO } from '@/utils/designChangeIntervals'

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    /** 工程案 ID，不傳則使用當前工作空間選中的工程案 */
    constructionId?: string
  }>(),
  { constructionId: undefined }
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const workspaceStore = useWorkspaceStore()

const designChangeList = ref<DesignChangeItem[]>([])

const effectiveConstructionId = computed(() => {
  const cid = props.constructionId?.trim()
  if (cid) return cid
  return workspaceStore.currentProject?.id?.trim() ?? ''
})

async function fetchDesignChangeList() {
  const cid = effectiveConstructionId.value
  if (!cid) {
    designChangeList.value = []
    return
  }
  try {
    designChangeList.value = await getDesignChangeList(cid)
  } catch {
    designChangeList.value = []
  }
}

watch(
  effectiveConstructionId,
  (cid) => {
    if (cid) fetchDesignChangeList()
    else designChangeList.value = []
  },
  { immediate: true }
)

function formatToRepublicDate(isoDate: string): string {
  if (!isoDate?.trim()) return ''
  const dateOnly = isoDate.trim().split('T')[0]
  const [y, m, d] = dateOnly.split('-').map(Number)
  if (!y || !m || !d) return dateOnly || isoDate
  const rocYear = y - 1911
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${rocYear}.${mm}.${dd}`
}

function getOriginalContractRange(): string {
  const interval = getOriginalContractIntervalISO({
    signDate: workspaceStore.currentProject?.signDate,
    designChangeList: designChangeList.value,
    projectEndDate: workspaceStore.currentProject?.endDate
  })
  if (!interval.start) return ''
  const startStr = formatToRepublicDate(interval.start)
  if (interval.openEnded) return `${startStr} ～ 迄今`
  return `${startStr} ～ ${interval.end ? formatToRepublicDate(interval.end) : ''}`
}

function getVersionRange(item: { effectiveDate: string; effectiveEndDate?: string; id?: number }, index: number): string {
  const interval = getDesignChangeIntervalISO({
    item: item as unknown as DesignChangeItem,
    index,
    designChangeList: designChangeList.value,
    projectEndDate: workspaceStore.currentProject?.endDate
  })
  if (!interval.start) return ''
  const startStr = formatToRepublicDate(interval.start)
  if (interval.openEnded) return `${startStr} ～ 迄今`
  return `${startStr} ～ ${interval.end ? formatToRepublicDate(interval.end) : ''}`
}

const versionTabs = computed(() => {
  const tabs: { id: number | null; label: string; range: string }[] = [
    { id: null, label: '原契約', range: getOriginalContractRange() }
  ]
  const list = designChangeList.value
  for (let i = 0; i < list.length; i++) {
    const d = list[i]
    const label = d.versionName?.trim() || `變更設計${i + 1}`
    tabs.push({
      id: d.id,
      label,
      range: getVersionRange(d, i)
    })
  }
  return tabs
})

// 預設選擇最後一個版本（僅在初次有變更設計時套用一次），須放在 versionTabs 定義之後
const hasAppliedInitialDefault = ref(false)
watch(
  effectiveConstructionId,
  () => { hasAppliedInitialDefault.value = false },
  { immediate: true }
)
watch(
  () => [designChangeList.value.length, props.modelValue] as const,
  () => {
    const tabs = versionTabs.value
    if (tabs.length <= 1) return
    const lastTab = tabs[tabs.length - 1]
    const currentInTabs = tabs.some((t) => t.id === props.modelValue)
    // 若目前值不在清單內（例如過期 id），改為最後一版
    if (!currentInTabs) {
      emit('update:modelValue', lastTab.id)
      return
    }
    // 僅在「尚未套用過初始預設」且目前為 null 時，預設選最後一版（避免覆寫使用者已選的「原契約」）
    if (!hasAppliedInitialDefault.value && props.modelValue === null) {
      emit('update:modelValue', lastTab.id)
      hasAppliedInitialDefault.value = true
    }
  },
  { immediate: true }
)

function selectTab(id: number | null) {
  emit('update:modelValue', id)
}
</script>

<template>
  <!-- 僅在有變更設計時顯示（只有原契約時不顯示選擇器） -->
  <div v-if="versionTabs.length > 1" class="design-change-version-switcher">
    <div class="version-switcher-tabs">
      <button
        v-for="tab in versionTabs"
        :key="tab.id ?? 'default'"
        type="button"
        class="version-tab"
        :class="{ active: modelValue === tab.id }"
        @click="selectTab(tab.id)"
      >
        <span class="version-tab-label">{{ tab.label }}</span>
        <span v-if="tab.range" class="version-tab-range">{{ tab.range }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.design-change-version-switcher {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.version-switcher-tabs {
  display: inline-flex;
  background: transparent;
  border-radius: 10px;
  padding: 2px;
}
.version-tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--bs-body-color);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
  min-width: 4.5rem;
}
.version-tab:hover {
  background: rgba(var(--bs-theme-rgb), 0.08);
  color: var(--bs-theme);
}
.version-tab.active {
  background: rgba(var(--bs-theme-rgb), 0.12);
  color: var(--bs-theme);
  border-color: rgba(var(--bs-theme-rgb), 0.35);
  box-shadow: none;
}
.version-tab-range {
  font-size: 0.7rem;
  opacity: 0.85;
  font-weight: 400;
  white-space: nowrap;
}
.version-tab.active .version-tab-range {
  opacity: 0.9;
}
</style>
