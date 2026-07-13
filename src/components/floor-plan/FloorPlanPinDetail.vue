<template>
  <div class="fp-pin-detail">
    <div class="mb-2">
      <label class="form-label fp-pin-detail__label">圖釘標題</label>
      <input
        v-model="form.title"
        type="text"
        class="form-control form-control-sm"
        placeholder="例如：1F 機房"
      />
    </div>

    <div class="mb-2">
      <label class="form-label fp-pin-detail__label">備註</label>
      <textarea
        v-model="form.note"
        class="form-control form-control-sm"
        rows="2"
        placeholder="補充說明（選填）"
      ></textarea>
    </div>

    <div class="mb-2">
      <label class="form-label fp-pin-detail__label d-flex justify-content-between align-items-center">
        <span>{{ itemLabel }}檢查表</span>
        <span class="badge bg-secondary">{{ form.linkedItemIds.length }} 項</span>
      </label>

      <div v-if="linkableItems.length === 0" class="text-muted small py-2">
        尚無可連結的{{ itemLabel }}，請先於對應功能建立。
      </div>

      <div v-else class="fp-pin-detail__items">
        <div
          v-for="item in linkableItems"
          :key="item.id"
          class="fp-pin-detail__item"
        >
          <div class="form-check mb-0 flex-grow-1 min-w-0">
            <input
              :id="`fp-item-${pin.id}-${item.id}`"
              v-model="form.linkedItemIds"
              class="form-check-input"
              type="checkbox"
              :value="item.id"
            />
            <label class="form-check-label" :for="`fp-item-${pin.id}-${item.id}`">
              {{ item.name }}
            </label>
          </div>
          <button
            v-if="form.linkedItemIds.includes(item.id)"
            type="button"
            class="btn btn-sm btn-link p-0 fp-pin-detail__open"
            title="開啟自主檢查表紀錄列表"
            @click="openSelfCheckInspection(item)"
          >
            <i class="fa fa-clipboard-check me-1"></i>檢查表
          </button>
        </div>
      </div>
      <div v-if="linkableItems.length > 0" class="text-muted fp-pin-detail__hint">
        <i class="fa fa-circle-info me-1"></i>勾選項目以連結；按「檢查表」開啟自主檢查表紀錄列表。
      </div>
    </div>

    <div class="d-flex gap-2 mt-3">
      <button
        type="button"
        class="btn btn-sm btn-primary flex-fill"
        :disabled="saving"
        @click="onSave"
      >
        <i class="fa fa-save me-1"></i>{{ saving ? '儲存中…' : '儲存' }}
      </button>
      <button type="button" class="btn btn-sm btn-outline-danger" :disabled="saving" @click="$emit('delete')">
        <i class="fa fa-trash"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { FloorPlanPin, LinkableItem } from '@/api/floorPlans'
import { useViewPerspective } from '@/composables/useViewPerspective'
import toastService from '@/components/bootstrap/ToastService.js'

const props = defineProps<{
  pin: FloorPlanPin
  linkableItems: LinkableItem[]
  saving?: boolean
  /** 當前變更設計版本（null = 原契約），開啟抽查標準表時帶入 */
  designChangeId?: number | null
}>()

const emit = defineEmits<{
  (e: 'save', payload: { title: string; note: string; linkedItemIds: string[] }): void
  (e: 'delete'): void
}>()

const router = useRouter()
const { isContractor } = useViewPerspective()

const itemLabel = computed(() =>
  props.linkableItems[0]?.type === 'MAJOR_ITEM' ? '施工項目' : '分項工程'
)

/** 開啟 D/E 類自主檢查表書架（抽查紀錄列表） */
function openSelfCheckInspection(item: LinkableItem) {
  const docClassId = item.documentClassificationId
  if (!docClassId) {
    toastService.warning('尚無對應的自主檢查表文件分類項目，請先於文件分類表同步')
    return
  }
  const path = isContractor.value
    ? `/contractor/forms/doc-class/E/${docClassId}`
    : `/supervisory/forms/doc-class/D/${docClassId}`
  void router.push({ path })
}

const form = reactive({
  title: '',
  note: '',
  linkedItemIds: [] as string[]
})

function syncFromPin() {
  form.title = props.pin.title ?? ''
  form.note = props.pin.note ?? ''
  form.linkedItemIds = (props.pin.links ?? []).map((l) => l.linkedItemId)
}

watch(() => props.pin.id, syncFromPin, { immediate: true })

function onSave() {
  emit('save', {
    title: form.title.trim(),
    note: form.note.trim(),
    linkedItemIds: [...form.linkedItemIds]
  })
}
</script>

<style scoped>
.fp-pin-detail__label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  opacity: 0.85;
}
.fp-pin-detail__items {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 8px 10px;
}
.fp-pin-detail__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}
.fp-pin-detail__item .form-check-label {
  font-size: 13px;
}
.fp-pin-detail__open {
  flex: 0 0 auto;
  font-size: 12px;
  white-space: nowrap;
  text-decoration: none;
}
.fp-pin-detail__hint {
  font-size: 11px;
  margin-top: 6px;
  line-height: 1.4;
}
.min-w-0 {
  min-width: 0;
}
</style>
