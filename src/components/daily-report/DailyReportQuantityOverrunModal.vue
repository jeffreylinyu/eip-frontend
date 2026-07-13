<template>
  <Modal
    v-model:show="visible"
    title="超出契約數量總表"
    icon="fa fa-exclamation-triangle text-warning"
    size="xl"
    hide-confirm-button
    cancel-text="關閉"
    @hide="handleClose"
  >
    <div class="quantity-overrun-modal">
      <p class="text-muted small mb-3">
        截至 <strong>{{ asOfDateDisplay }}</strong>，以下項目累計數量已超過契約數量。
      </p>

      <div v-if="isLoading" class="text-center py-5 text-muted">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
        載入中…
      </div>

      <div v-else-if="loadError" class="alert alert-danger mb-0">
        {{ loadError }}
      </div>

      <div v-else-if="items.length === 0" class="text-center py-5 text-muted">
        <i class="fa fa-check-circle fa-2x text-success mb-3 d-block"></i>
        目前沒有超出契約數量的項目。
      </div>

      <div v-else class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0 quantity-overrun-table">
          <thead class="table-dark">
            <tr>
              <th>類型</th>
              <th>項次</th>
              <th>名稱</th>
              <th class="text-center">單位</th>
              <th class="text-end">契約數量</th>
              <th class="text-end">累計數量</th>
              <th class="text-end">超出數量</th>
              <th class="text-center">首次超出日期</th>
              <th class="text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items" :key="`${item.category}-${item.logicalId ?? index}`">
              <td>{{ categoryLabel(item.category) }}</td>
              <td>{{ item.itemNo || '—' }}</td>
              <td>{{ item.name }}</td>
              <td class="text-center">{{ item.unit || '—' }}</td>
              <td class="text-end">{{ formatNumber(item.contractQuantity) }}</td>
              <td class="text-end text-danger fw-semibold">{{ formatNumber(item.cumulativeQuantity) }}</td>
              <td class="text-end text-danger">+{{ formatNumber(item.overrunQuantity) }}</td>
              <td class="text-center">{{ formatDate(item.firstExceededDate) }}</td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="handleOpenReport(item.firstExceededDate)"
                >
                  查看日誌
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/components/bootstrap/Modal.vue'
import {
  getQuantityOverrunSummary,
  type DailyReportQuantityOverrunItem
} from '@/api/dailyReport'

const props = defineProps<{
  show: boolean
  constructionId: string
  ownerType?: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'open-report-date': [date: string]
}>()

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
})

const isLoading = ref(false)
const loadError = ref('')
const asOfDate = ref('')
const items = ref<DailyReportQuantityOverrunItem[]>([])

const asOfDateDisplay = computed(() => {
  if (!asOfDate.value) return '今天'
  return formatDate(asOfDate.value)
})

const categoryLabel = (category: DailyReportQuantityOverrunItem['category']) =>
  category === 'EXECUTION_ITEM' ? '施工項目' : '工程材料'

const formatNumber = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

const formatDate = (value: string): string => {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${year}/${month}/${day}`
}

const loadSummary = async () => {
  if (!props.constructionId) {
    loadError.value = '缺少工程資訊，無法載入總表'
    return
  }

  isLoading.value = true
  loadError.value = ''
  try {
    const summary = await getQuantityOverrunSummary(props.constructionId, {
      ownerType: props.ownerType
    })
    asOfDate.value = summary.asOfDate
    items.value = summary.items
  } catch (error) {
    console.error('載入超出數量總表失敗:', error)
    loadError.value = '載入超出數量總表失敗，請稍後再試'
    items.value = []
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.show,
  (open) => {
    if (open) loadSummary()
  }
)

const handleClose = () => {
  visible.value = false
}

const handleOpenReport = (date: string) => {
  emit('open-report-date', date)
  visible.value = false
}
</script>

<style scoped>
.quantity-overrun-table th,
.quantity-overrun-table td {
  white-space: nowrap;
}

.quantity-overrun-table td:nth-child(3) {
  white-space: normal;
  min-width: 160px;
}
</style>
