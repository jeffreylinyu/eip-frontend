<script setup lang="ts">
import { computed, watch } from 'vue'
import { useSignableIdentities } from '@/composables/useSignableIdentities'
import Modal from '@/components/bootstrap/Modal.vue'

const show = defineModel<boolean>('show', { default: false })

const props = defineProps<{
  constructionId: string
  signRoleLabel?: string
  /** 僅顯示符合此 occupation 代碼的綁定身份（如 QUALITY、SITE_ENGINEER） */
  occupationFilter?: string | null
}>()

const emit = defineEmits<{
  confirm: [bindingId: number]
}>()

const {
  identities,
  isLoading,
  error,
  selectedBindingId,
  hasMultipleIdentities,
  load,
  selectBinding,
  formatIdentityLabel
} = useSignableIdentities(() => props.constructionId)

const filteredIdentities = computed(() => {
  const filter = props.occupationFilter?.trim().toUpperCase()
  if (!filter) return identities.value
  return identities.value.filter((identity) => identity.occupation?.toUpperCase() === filter)
})

const canConfirm = computed(() => selectedBindingId.value != null)

watch(show, (open) => {
  if (open && props.constructionId) {
    load(true)
  }
})

watch(filteredIdentities, (rows) => {
  if (rows.length === 1) {
    selectedBindingId.value = rows[0].bindingId
  } else if (!rows.some((r) => r.bindingId === selectedBindingId.value)) {
    selectedBindingId.value = null
  }
})

const close = () => {
  show.value = false
}

const onConfirm = () => {
  if (selectedBindingId.value == null) return
  emit('confirm', selectedBindingId.value)
  close()
}
</script>

<template>
  <Modal
    v-model:show="show"
    title="選擇簽名身份"
    :hide-confirm-button="true"
    :hide-cancel-button="true"
  >
    <template #body>
      <p class="text-muted small mb-3">
        {{ signRoleLabel || '簽名前請選擇您要以哪位工地人員的身份簽署。' }}
      </p>

      <div v-if="isLoading" class="text-center py-4 text-muted">載入中…</div>

      <div v-else-if="error" class="alert alert-warning mb-0">{{ error }}</div>

      <div v-else-if="filteredIdentities.length === 0" class="alert alert-info mb-0">
        您在此工程案尚無可簽名的身份綁定，請聯繫管理員設定。
      </div>

      <div v-else class="list-group">
        <button
          v-for="identity in filteredIdentities"
          :key="identity.bindingId"
          type="button"
          class="list-group-item list-group-item-action d-flex align-items-center gap-2"
          :class="{ active: selectedBindingId === identity.bindingId }"
          @click="selectBinding(identity.bindingId)"
        >
          <i class="fa fa-user-circle text-muted" />
          <span>{{ formatIdentityLabel(identity) }}</span>
        </button>
      </div>

      <p v-if="hasMultipleIdentities && filteredIdentities.length > 0" class="text-muted small mt-3 mb-0">
        您的帳號綁定了多位工地人員，請明確選擇簽名身份。
      </p>
    </template>

    <template #footer>
      <button type="button" class="btn btn-outline-secondary" @click="close">取消</button>
      <button type="button" class="btn btn-primary" :disabled="!canConfirm" @click="onConfirm">
        確認身份
      </button>
    </template>
  </Modal>
</template>
