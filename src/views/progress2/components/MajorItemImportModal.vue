<template>
  <Modal
    :show="show"
    :title="`從${sourceLabel}匯入項目`"
    icon="fa fa-file-import"
    size="lg"
    :confirm-text="`匯入所選項目（${selectedIds.size}）`"
    confirm-icon="fa fa-check"
    :is-loading="loading"
    @update:show="$emit('update:show', $event)"
    @confirm="handleConfirm"
  >
    <template #body>
      <div v-if="loading" class="text-center py-4">
        <span class="spinner-border spinner-border-sm me-2"></span>載入{{ sourceLabel }}中...
      </div>
      <div v-else-if="loadError" class="alert alert-danger mb-0">
        {{ loadError }}
      </div>
      <div v-else-if="!items.length" class="alert alert-info mb-0">
        此工程案尚無{{ sourceLabel }}資料，請先於「{{ sourceLabel }}」功能建立，或改用「新增項目」人工建立。
      </div>
      <template v-else>
        <div class="d-flex align-items-center mb-2 gap-2">
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="selectAll">全選</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="selectedIds.clear()">全不選</button>
          <span class="text-muted small ms-auto">已匯入過的項目不會重複匯入</span>
        </div>
        <div class="list-group import-list">
          <label
            v-for="item in items"
            :key="item.id"
            class="list-group-item d-flex align-items-center gap-2"
            :class="{ 'opacity-50': importedIdSet.has(item.id) }"
          >
            <input
              class="form-check-input flex-shrink-0 m-0"
              type="checkbox"
              :disabled="importedIdSet.has(item.id)"
              :checked="selectedIds.has(item.id)"
              @change="toggle(item.id)"
            />
            <span class="flex-fill">{{ item.name }}</span>
            <span v-if="importedIdSet.has(item.id)" class="badge text-bg-secondary">已匯入</span>
          </label>
        </div>
      </template>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from '@/components/bootstrap/Modal.vue'
import { getConstructionMajorItems } from '@/api/pcces'
import { listSubdivisionWorkItems } from '@/api/subdivisionWorkItems'

interface SourceItem {
  id: string
  name: string
}

interface Props {
  show: boolean
  constructionId: string
  /** 項目來源：監造 = 施工項目（construction-major-items）；營造 = 分項工程（subdivision-work-items） */
  sourceType: 'supervisory' | 'contractor'
  /** 已匯入的來源項目 id 清單（避免重複匯入） */
  importedIds: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  import: [items: SourceItem[]]
}>()

const sourceLabel = computed(() => (props.sourceType === 'contractor' ? '分項工程' : '施工項目'))

const loading = ref(false)
const loadError = ref('')
const items = ref<SourceItem[]>([])
const selectedIds = reactive(new Set<string>())

const importedIdSet = computed(() => new Set(props.importedIds))

const fetchSourceItems = async (): Promise<SourceItem[]> => {
  if (props.sourceType === 'contractor') {
    const list = await listSubdivisionWorkItems(props.constructionId)
    return [...list]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item) => ({ id: String(item.id), name: item.name }))
  }
  const res = await getConstructionMajorItems(props.constructionId, { isActive: true, page: 0, size: 200 })
  const list = Array.isArray(res?.content) ? res.content : []
  return [...list]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => ({ id: String(item.id), name: item.name }))
}

const loadItems = async () => {
  if (!props.constructionId) return
  loading.value = true
  loadError.value = ''
  try {
    items.value = await fetchSourceItems()
    selectedIds.clear()
    items.value.forEach((item) => {
      if (!importedIdSet.value.has(item.id)) selectedIds.add(item.id)
    })
  } catch (error) {
    console.error(`載入${sourceLabel.value}失敗:`, error)
    loadError.value = `載入${sourceLabel.value}失敗，請稍後再試`
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  (show) => {
    if (show) void loadItems()
  }
)

const toggle = (id: string) => {
  if (selectedIds.has(id)) selectedIds.delete(id)
  else selectedIds.add(id)
}

const selectAll = () => {
  items.value.forEach((item) => {
    if (!importedIdSet.value.has(item.id)) selectedIds.add(item.id)
  })
}

const handleConfirm = () => {
  const selected = items.value.filter((item) => selectedIds.has(item.id))
  emit('import', selected)
  emit('update:show', false)
}
</script>

<style scoped>
.import-list {
  max-height: 420px;
  overflow: auto;
}

.list-group-item {
  cursor: pointer;
}
</style>
