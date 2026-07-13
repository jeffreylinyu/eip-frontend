<template>
  <div class="container-fluid px-4 py-4" data-bs-theme="dark">
    <PageHeader
      title="文件檔案分類表"
      icon="fa fa-folder-open"
      :breadcrumbs="[
        { text: '表單', href: 'javascript:;' },
        { text: '文件檔案分類表', active: true }
      ]"
    >
      <template v-if="hasCurrentProject && isSupervisory" #extra>
        <DesignChangeVersionSwitcher
          :model-value="selectedDesignChangeId"
          :construction-id="currentProject?.id"
          source-type="SUPERVISORY"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <div
      v-if="hasCurrentProject && isSupervisory"
      class="d-flex flex-wrap align-items-center justify-content-end gap-2 mb-4"
    >
      <div v-if="selectedDesignChangeId != null" class="btn-group">
        <button
          type="button"
          class="btn btn-sm btn-outline-primary dropdown-toggle"
          :disabled="isCopying"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          title="自上一變更設計版本複製文件分類表至目前版本（覆寫）"
        >
          <i class="fa me-1" :class="isCopying ? 'fa-spinner fa-spin' : 'fa-copy'"></i>
          {{ isCopying ? '複製中…' : '複製前一版本' }}
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <button
              type="button"
              class="dropdown-item text-danger"
              :disabled="isCopying"
              @click="copyFromPrevious"
            >
              覆寫目前版本
            </button>
          </li>
        </ul>
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger" @click="confirmResetVersion">
        <i class="fa fa-undo me-1"></i>
        恢復此版本預設值
      </button>
    </div>

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!isSupervisory" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      此頁僅供監造端使用。
    </div>

    <div v-else-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted">載入中...</p>
    </div>

    <div v-else>
      <CategoryTable
        v-for="cat in categories"
        :key="cat.code"
        :category="cat.code"
        :title="cat.name"
        :items="groupedItems[cat.code] || []"
        :is-dynamic="cat.code === 'D'"
        :sync-label="cat.code === 'D' ? '同步施工大項' : undefined"
        :sync-title="
          cat.code === 'D'
            ? '依目前版本施工大項重新同步 D 類（{施工大項名稱}自主檢查表；覆寫既有項目）'
            : undefined
        "
        :header-note="
          cat.code === 'B'
            ? '營造端可於「P類-計畫書」查看並複製您在此填寫的自訂項目與「規定提送日程」（不含預設列）。'
            : undefined
        "
        @add="(data) => handleAdd(cat.code, data)"
        @update="(id, data) => handleUpdate(cat.code, id, data)"
        @delete="(id) => handleDelete(id)"
        @sync="handleSyncD"
        @reorder="handleReorder"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, getCurrentInstance, watch } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { documentClassificationApi, type DocumentClassification } from '@/api/documentClassification'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import CategoryTable from '@/components/document/CategoryTable.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import { requestSupervisoryDocClassSidebarRefresh } from '@/utils/supervisoryBPlanSidebar'

const categories = [
  { code: 'A', name: 'A類' },
  { code: 'B', name: 'B類' },
  { code: 'C', name: 'C類' },
  { code: 'D', name: 'D類 (動態/自主檢查)' },
  { code: 'H', name: 'H類' },
  { code: 'I', name: 'I類' },
  { code: 'L', name: 'L類' }
]

const workspaceStore = useWorkspaceStore()
const { isSupervisory } = useViewPerspective()
const instance = getCurrentInstance()
const proxy = instance?.proxy as any

const currentProject = computed(() => workspaceStore.currentProject)
const hasCurrentProject = computed(() => !!currentProject.value?.id)
const constructionId = computed(() => currentProject.value?.id ?? '')

const loading = ref(false)
const isCopying = ref(false)
const allItems = ref<DocumentClassification[]>([])
const selectedDesignChangeId = ref<number | null>(null)

const groupedItems = computed(() => {
  const groups: Record<string, DocumentClassification[]> = {}
  categories.forEach((c) => {
    groups[c.code] = []
  })
  allItems.value.forEach((item) => {
    if (groups[item.category]) {
      groups[item.category].push(item)
    }
  })
  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) => a.itemNumber.localeCompare(b.itemNumber))
  })
  return groups
})

async function loadData() {
  const cid = constructionId.value
  if (!cid) return
  loading.value = true
  try {
    allItems.value = await documentClassificationApi.getAll(cid, selectedDesignChangeId.value)
  } catch (error) {
    console.error('載入失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('無法載入分類表')
  } finally {
    loading.value = false
  }
}

async function onVersionChange(versionId: number | null) {
  selectedDesignChangeId.value = versionId
  await loadData()
}

async function copyFromPrevious() {
  const cid = constructionId.value
  const tid = selectedDesignChangeId.value
  if (!cid || tid == null) return
  if (!confirm('確定以「上一變更設計版本」覆寫目前版本的文件分類表？此操作無法復原。')) return
  isCopying.value = true
  try {
    await documentClassificationApi.copyFromPrevious(cid, tid)
    if (proxy?.$toast) proxy.$toast.success('已複製並覆寫')
    await loadData()
    // 整版覆寫會影響全部類別；通知 sidebar 重整
    requestSupervisoryDocClassSidebarRefresh()
  } catch (e) {
    console.error(e)
    if (proxy?.$toast) proxy.$toast.error('複製失敗')
  } finally {
    isCopying.value = false
  }
}

async function handleAdd(
  category: string,
  data: { documentName: string; retentionYears: number | null; requiredSubmissionSchedule?: string }
) {
  const cid = constructionId.value
  if (!cid) return
  try {
    const created = await documentClassificationApi.create(cid, selectedDesignChangeId.value, {
      category,
      documentName: data.documentName,
      retentionYears: data.retentionYears ?? 15,
      ...(category === 'B' && data.requiredSubmissionSchedule != null
        ? { requiredSubmissionSchedule: data.requiredSubmissionSchedule }
        : {})
    })
    allItems.value = [...allItems.value, created]
    requestSupervisoryDocClassSidebarRefresh()
    if (proxy?.$toast) proxy.$toast.success('新增成功')
  } catch (error) {
    console.error('新增失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('新增失敗')
  }
}

async function handleUpdate(
  category: string,
  id: number,
  data: {
    documentName: string
    retentionYears?: number | null
    retentionPermanent?: boolean
    requiredSubmissionSchedule?: string
  }
) {
  const cid = constructionId.value
  if (!cid) return
  try {
    const updated = await documentClassificationApi.update(cid, id, selectedDesignChangeId.value, {
      documentName: data.documentName,
      ...(data.retentionYears !== undefined ? { retentionYears: data.retentionYears as number } : {}),
      ...(category === 'B' ? { requiredSubmissionSchedule: data.requiredSubmissionSchedule ?? '' } : {})
    })
    allItems.value = allItems.value.map((item) => (item.id === id ? updated : item))
    requestSupervisoryDocClassSidebarRefresh()
    if (proxy?.$toast) proxy.$toast.success('更新成功')
  } catch (error) {
    console.error('更新失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('更新失敗')
  }
}

async function handleDelete(id: number) {
  const cid = constructionId.value
  if (!cid) return
  try {
    await documentClassificationApi.delete(cid, id, selectedDesignChangeId.value)
    allItems.value = allItems.value.filter((item) => item.id !== id)
    requestSupervisoryDocClassSidebarRefresh()
    if (proxy?.$toast) proxy.$toast.success('刪除成功')
  } catch (error) {
    console.error('刪除失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('刪除失敗')
  }
}

async function handleSyncD() {
  const cid = constructionId.value
  if (!cid) return
  if (!confirm('確定要根據施工大項重新同步 D 類別嗎？將以「{施工大項名稱}自主檢查表」覆寫目前 D 類自訂內容。')) return
  try {
    await documentClassificationApi.syncCategoryD(cid, selectedDesignChangeId.value)
    if (proxy?.$toast) proxy.$toast.success('D 類別同步完成')
    await loadData()
    // D 類項目大幅變動，通知 sidebar 重整
    requestSupervisoryDocClassSidebarRefresh()
  } catch (error) {
    console.error('同步失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('同步失敗')
  }
}

async function confirmResetVersion() {
  const cid = constructionId.value
  if (!cid) return
  const ver =
    selectedDesignChangeId.value == null ? '原契約' : `變更設計（ID ${selectedDesignChangeId.value}）`
  if (!confirm(`警告：確定將「${ver}」的文件分類表恢復為預設值？自訂項目將一併刪除。`)) return
  try {
    allItems.value = await documentClassificationApi.resetAll(cid, selectedDesignChangeId.value)
    // 預設值還原會大幅改動全部類別分類表（自訂列被清除），一律通知 sidebar 重整
    requestSupervisoryDocClassSidebarRefresh()
    if (proxy?.$toast) proxy.$toast.success('已恢復預設值')
  } catch (error) {
    console.error('恢復失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('恢復失敗')
  }
}

async function handleReorder(items: DocumentClassification[]) {
  const cid = constructionId.value
  if (!cid || items.length === 0) return
  try {
    const batchItems = items.map((item) => ({
      id: item.id,
      itemNumber: item.itemNumber,
      documentName: item.documentName,
      retentionYears: item.retentionYears,
      ...(item.category === 'B' ? { requiredSubmissionSchedule: item.requiredSubmissionSchedule ?? '' } : {})
    }))
    await documentClassificationApi.batchUpdate(cid, selectedDesignChangeId.value, { items: batchItems })
    await loadData()
    // batch 可能改動任何分類的 itemNumber 排序，一律通知 sidebar 重整
    requestSupervisoryDocClassSidebarRefresh()
    if (proxy?.$toast) proxy.$toast.success('順序已儲存')
  } catch (error) {
    console.error('排序儲存失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('排序儲存失敗')
    await loadData()
  }
}

watch(constructionId, (cid) => {
  if (cid) void loadData()
  else {
    allItems.value = []
  }
})

onMounted(async () => {
  if (!workspaceStore.currentWorkspace) {
    await workspaceStore.initWorkspaces()
  }
  if (constructionId.value) {
    await loadData()
  }
})
</script>
