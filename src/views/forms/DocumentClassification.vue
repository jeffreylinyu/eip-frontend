<template>
  <div class="container-fluid px-4 py-4" data-bs-theme="dark">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold text-primary">
        <i class="bi bi-folder2-open me-2"></i>文件檔案分類表
      </h2>
      <div>
        <button class="btn btn-outline-danger" @click="confirmResetAll">
          <i class="bi bi-arrow-counterclockwise"></i> 恢復全部預設值
        </button>
      </div>
    </div>



    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted">載入中...</p>
    </div>

    <!-- Content -->
    <div v-else>
      <CategoryTable
        v-for="cat in categories"
        :key="cat.code"
        :category="cat.code"
        :title="cat.name"
        :items="groupedItems[cat.code] || []"
        :is-dynamic="cat.code === 'D'"
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
import { useProjectStore } from '@/stores/project'
import { documentClassificationApi, type DocumentClassification } from '@/api/documentClassification'
import CategoryTable from '@/components/document/CategoryTable.vue'

// 定義 7 大分類
const categories = [
  { code: 'A', name: 'A類' },
  { code: 'B', name: 'B類' },
  { code: 'C', name: 'C類' },
  { code: 'D', name: 'D類 (動態)' }, // 特殊處理
  { code: 'H', name: 'H類' },
  { code: 'I', name: 'I類' },
  { code: 'L', name: 'L類' }
]

const instance = getCurrentInstance()
const proxy = instance?.proxy as any

const workspaceStore = useWorkspaceStore()
const projectStore = useProjectStore()

const loading = ref(false)
const allItems = ref<DocumentClassification[]>([])

// 取得當前工程 ID
const currentConstructionId = computed(() => projectStore.currentProject?.constructionId)

// 將項目分組
const groupedItems = computed(() => {
  const groups: Record<string, DocumentClassification[]> = {}
  categories.forEach(c => groups[c.code] = [])
  
  allItems.value.forEach(item => {
    if (groups[item.category]) {
      groups[item.category].push(item)
    }
  })
  
  // 每個分組內按 itemNumber 排序
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => a.itemNumber.localeCompare(b.itemNumber))
  })
  
  return groups
})

// --- API 操作 ---

const loadData = async () => {
  if (!currentConstructionId.value) return
  
  loading.value = true
  try {
    allItems.value = await documentClassificationApi.getAll(currentConstructionId.value)
  } catch (error) {
    console.error('載入失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('無法載入分類表')
  } finally {
    loading.value = false
  }
}

const handleAdd = async (category: string, data: { documentName: string, retentionYears: number }) => {
  if (!currentConstructionId.value) return
  
  try {
    await documentClassificationApi.create(currentConstructionId.value, {
      category,
      ...data
    })
    if (proxy?.$toast) proxy.$toast.success('新增成功')
    await loadData()
  } catch (error) {
    console.error('新增失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('新增失敗')
  }
}

const handleUpdate = async (category: string, id: number, data: { documentName: string, retentionYears: number }) => {
  if (!currentConstructionId.value) return
  
  try {
    await documentClassificationApi.update(currentConstructionId.value, id, data)
    if (proxy?.$toast) proxy.$toast.success('更新成功')
    await loadData()
  } catch (error) {
    console.error('更新失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('更新失敗')
  }
}

const handleDelete = async (id: number) => {
  if (!currentConstructionId.value) return
  
  try {
    await documentClassificationApi.delete(currentConstructionId.value, id)
    if (proxy?.$toast) proxy.$toast.success('刪除成功')
    await loadData()
  } catch (error) {
    console.error('刪除失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('刪除失敗')
  }
}

const handleSyncD = async () => {
  if (!currentConstructionId.value) return
  
  if (!confirm('確定要根據施工大項重新同步 D 類別嗎？目前的 D 類自訂內容將會被重置。')) return

  try {
    await documentClassificationApi.syncCategoryD(currentConstructionId.value)
    if (proxy?.$toast) proxy.$toast.success('D 類別同步完成')
    await loadData()
  } catch (error) {
    console.error('同步失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('同步失敗')
  }
}

const confirmResetAll = async () => {
  if (!currentConstructionId.value) return
  
  if (!confirm('警告：確定要恢復所有分類為預設值嗎？\n此操作將刪除所有您自訂的項目！')) return

  try {
    await documentClassificationApi.resetAll(currentConstructionId.value)
    if (proxy?.$toast) proxy.$toast.success('已恢復預設值')
    await loadData()
  } catch (error) {
    console.error('恢復失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('恢復失敗')
  }
}

const handleReorder = async (items: DocumentClassification[]) => {
  if (!currentConstructionId.value || items.length === 0) return

  try {
    const batchItems = items.map(item => ({
      id: item.id,
      itemNumber: item.itemNumber, // 前端已計算好的新編號
      documentName: item.documentName,
      retentionYears: item.retentionYears
    }))

    await documentClassificationApi.batchUpdate(currentConstructionId.value, {
      items: batchItems
    })

    if (proxy?.$toast) proxy.$toast.success('順序已儲存')
    // 批次更新回傳的是新列表，可以直接用來更新，但目前 loadData 統一重抓保險
    // await loadData() 
  } catch (error) {
    console.error('排序儲存失敗:', error)
    if (proxy?.$toast) proxy.$toast.error('排序儲存失敗')
    await loadData() // 失敗時還原
  }
}

// --- 監聽與初始化 ---

watch(currentConstructionId, (newId) => {
  if (newId) {
    loadData()
  } else {
    allItems.value = []
  }
})

onMounted(async () => {
  // 確保 WorkspaceStore 與 ProjectStore 初始化
  if (!workspaceStore.currentWorkspace) {
    await workspaceStore.initWorkspaces()
  }
  if (!projectStore.currentProject) {
    await projectStore.initProjects()
  }
  
  if (currentConstructionId.value) {
    loadData()
  } else {
    // 若初始化後仍無專案，可能需要提示使用者選擇專案
    console.warn('DocumentClassification: No project selected')
  }
})

</script>
