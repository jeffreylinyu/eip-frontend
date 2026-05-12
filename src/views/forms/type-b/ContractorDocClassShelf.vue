<template>
  <div class="contractor-doc-class-shelf-page a4-dark">
    <PageHeader
      :title="pageTitle"
      icon="fa fa-file-lines"
      :breadcrumbs="breadcrumbs"
    />

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!isContractor" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      此頁僅供營造端使用。
    </div>

    <div v-else-if="!supportedCategory" class="alert alert-danger mb-0">
      <i class="fa fa-circle-exclamation me-2"></i>
      不支援的分類：「{{ categoryParam }}」。目前僅支援 B / E / G / R / T / Q 類。
    </div>

    <div v-else-if="isLoading" class="text-center py-4 text-muted">
      <i class="fa fa-spinner fa-spin me-2"></i>載入中…
    </div>

    <div v-else-if="!targetItem" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      找不到對應的 {{ supportedCategory }} 類項目（id={{ itemIdParam || '—' }}），可能已被刪除或變更。請回到「文件檔案分類表」確認。
    </div>

    <Card v-else>
      <CardBody>
        <div class="alert alert-info mb-4">
          <h5 class="alert-heading">
            <i class="fa fa-info-circle me-2"></i>說明
          </h5>
          <p class="mb-0">
            {{ supportedCategory }} 類書架：可建立多筆紀錄，每筆可關聯一個公文並上傳多個附件。
          </p>
        </div>

        <div class="d-flex justify-content-between align-items-center gap-3 mb-3 flex-wrap">
          <div></div>
          <button type="button" class="btn btn-sm btn-primary" disabled>
            <i class="fa fa-plus me-1"></i>
            新增紀錄
          </button>
        </div>

        <div class="text-center py-4 text-muted border rounded">
          <i class="fa fa-inbox fa-2x mb-2 d-block"></i>
          尚無紀錄
          <div class="small mt-1">點擊「新增紀錄」開始建立</div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
/**
 * 營造端「文件檔案分類表 — 各類動態項目」共用書架頁殼。
 *
 * - URL：`/contractor/forms/doc-class/:category/:itemId`，category ∈ B/E/G/R/T/Q。
 * - 與監造端 `SupervisoryDocClassShelf.vue` 採完全相同設計：
 *   PageHeader 殼 + A-1 工程契約風格表格（DocumentShelf.vue）；
 *   後端尚未支援動態分類項目的 documentShelfApi，第一階段僅做 UI 殼：
 *     - 「新增紀錄」按鈕 disabled
 *     - 空狀態提示「尚無紀錄」
 * - sidebar 入口由 `useAppContractorSidebarMenuStore` 依分類表動態列出。
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import {
  contractorDocumentClassificationApi,
  type ContractorDocumentClassification,
} from '@/api/contractorDocumentClassification'
import { getDesignChangeList } from '@/api/designChange'

const SUPPORTED_CATEGORIES = ['B', 'E', 'G', 'R', 'T', 'Q'] as const
type SupportedCategory = typeof SUPPORTED_CATEGORIES[number]

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { isContractor } = useViewPerspective()

const currentProject = computed(() => workspaceStore.currentProject)
const hasCurrentProject = computed(() => !!currentProject.value?.id)

const categoryParam = computed(() => {
  const v = route.params.category
  const s = (Array.isArray(v) ? v[0] : v) ?? ''
  return String(s).toUpperCase()
})
const supportedCategory = computed<SupportedCategory | null>(() => {
  return (SUPPORTED_CATEGORIES as readonly string[]).includes(categoryParam.value)
    ? (categoryParam.value as SupportedCategory)
    : null
})

const itemIdParam = computed(() => {
  const v = route.params.itemId
  return Array.isArray(v) ? v[0] : v
})
const targetItemId = computed<number | null>(() => {
  const n = Number(itemIdParam.value)
  return Number.isFinite(n) && n > 0 ? n : null
})

const isLoading = ref(false)
const allItemsInCategory = ref<ContractorDocumentClassification[]>([])

const targetItem = computed(() => {
  const id = targetItemId.value
  if (id == null) return null
  return allItemsInCategory.value.find(i => i.id === id) ?? null
})

/** 將分類表 itemNumber（"01", "02", "03"…）轉成顯示用編號，如 "03" → 3 */
function parseItemNumberDigit(itemNumber: string | null | undefined): string {
  const raw = String(itemNumber ?? '').trim()
  if (!raw) return ''
  const m = raw.match(/^0*(\d+)/)
  return m ? m[1] : raw
}

const pageTitle = computed(() => {
  const t = targetItem.value
  const cat = supportedCategory.value
  if (!cat) return '文件分類書架'
  if (!t) return `${cat} 類書架`
  const seq = parseItemNumberDigit(t.itemNumber)
  return seq ? `${cat}-${seq} ${t.documentName}`.trim() : `${cat} ${t.documentName}`.trim()
})

const breadcrumbs = computed(() => {
  const cat = supportedCategory.value
  return [
    { text: '表單生成與管理', href: 'javascript:;' },
    { text: cat ? `${cat}類表單` : '文件分類書架', href: 'javascript:;' },
    { text: pageTitle.value, active: true as const },
  ]
})

async function loadCategoryItems() {
  const cid = currentProject.value?.id
  const cat = supportedCategory.value
  if (!cid || !isContractor.value || !cat) {
    allItemsInCategory.value = []
    return
  }
  isLoading.value = true
  try {
    // 與 sidebar 一致：抓「最新一版」變更設計的分類表，避免 sidebar 可見、頁面反查不到。
    let designChangeId: number | null = null
    try {
      const versions = await getDesignChangeList(cid, undefined, { skipAuthRedirectOn401: true }, false)
      const latest = versions.reduce<{ id: number; sortOrder: number } | null>((acc, cur) => {
        if (!acc || cur.sortOrder > acc.sortOrder) return { id: cur.id, sortOrder: cur.sortOrder }
        return acc
      }, null)
      designChangeId = latest?.id ?? null
    } catch {
      designChangeId = null
    }
    const items = await contractorDocumentClassificationApi.getAll(
      cid,
      designChangeId,
      { skipAuthRedirectOn401: true } as any,
    )
    allItemsInCategory.value = items.filter(i => i.category === cat)
  } catch {
    allItemsInCategory.value = []
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [currentProject.value?.id ?? '', isContractor.value, supportedCategory.value, targetItemId.value],
  () => { void loadCategoryItems() },
  { immediate: true }
)
</script>

<style scoped>
.contractor-doc-class-shelf-page {
  padding: 1rem;
}
</style>
