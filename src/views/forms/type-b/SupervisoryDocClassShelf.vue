<template>
  <div class="supervisory-doc-class-shelf-page a4-dark">
    <PageHeader
      :title="pageTitle"
      icon="fa fa-file-lines"
      :breadcrumbs="breadcrumbs"
    />

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!isSupervisory" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      此頁僅供監造端使用。
    </div>

    <div v-else-if="!supportedCategory" class="alert alert-danger mb-0">
      <i class="fa fa-circle-exclamation me-2"></i>
      不支援的分類：「{{ categoryParam }}」。目前僅支援 B / C / D / H / I / L 類。
    </div>

    <div v-else-if="isLoading" class="text-center py-4 text-muted">
      <i class="fa fa-spinner fa-spin me-2"></i>載入中…
    </div>

    <div v-else-if="!targetItem" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      找不到對應的 {{ supportedCategory }} 類項目（id={{ itemIdParam || '—' }}），可能已被刪除或變更。請回到「文件檔案分類表」確認。
    </div>

    <Card v-else-if="supportedCategory === 'D'">
      <CardBody>
        <SelfCheckInspectionList
          :construction-id="currentProject?.id ?? ''"
          :document-classification-id="targetItem.id"
          owner-type="SUPERVISORY"
          :base-path="`/supervisory/forms/doc-class/D/${targetItem.id}`"
        />
      </CardBody>
    </Card>

    <DocumentShelf
      v-else
      shelf-type="DYNAMIC"
      owner-type="SUPERVISORY"
      :classification-key="classificationKey"
      :title="pageTitle"
      :description="`${supportedCategory} 類書架：可建立多筆紀錄，每筆可關聯一個公文並上傳多個附件。`"
      :category-label="`${supportedCategory}類表單`"
      hide-page-header
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 監造端「文件檔案分類表 — 各類動態項目」共用書架頁殼。
 *
 * - URL：`/supervisory/forms/doc-class/:category/:itemId`，category ∈ B/C/D/H/I/L。
 * - 非 D 類項目使用共用 DocumentShelf，依「分類＋項目 ID＋視角」隔離紀錄。
 * - D 類維持施工抽查專用頁面。
 * - sidebar 入口由 `useAppSidebarMenuStore` 依分類表動態列出。
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { documentClassificationApi, type DocumentClassification } from '@/api/documentClassification'
import { getDesignChangeList } from '@/api/designChange'
import SelfCheckInspectionList from '@/components/self-check/SelfCheckInspectionList.vue'
import DocumentShelf from '@/views/forms/DocumentShelf.vue'

const SUPPORTED_CATEGORIES = ['B', 'C', 'D', 'H', 'I', 'L'] as const
type SupportedCategory = typeof SUPPORTED_CATEGORIES[number]

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { isSupervisory } = useViewPerspective()

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
const allItemsInCategory = ref<DocumentClassification[]>([])

const targetItem = computed(() => {
  const id = targetItemId.value
  if (id == null) return null
  return allItemsInCategory.value.find(i => i.id === id) ?? null
})

const classificationKey = computed(() =>
  supportedCategory.value && targetItemId.value
    ? `${supportedCategory.value}:${targetItemId.value}`
    : '',
)

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
  const t = targetItem.value
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
  if (!cid || !isSupervisory.value || !cat) {
    allItemsInCategory.value = []
    return
  }
  isLoading.value = true
  try {
    // 與 sidebar 一致：抓「最新一版」變更設計的分類表，否則 sidebar 顯示得到、頁面卻反查不到。
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
    const items = await documentClassificationApi.getAll(cid, designChangeId, { skipAuthRedirectOn401: true })
    allItemsInCategory.value = items.filter(i => i.category === cat)
  } catch {
    allItemsInCategory.value = []
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [currentProject.value?.id ?? '', isSupervisory.value, supportedCategory.value, targetItemId.value],
  () => { void loadCategoryItems() },
  { immediate: true }
)
</script>

<style scoped>
.supervisory-doc-class-shelf-page {
  padding: 1rem;
}
</style>
