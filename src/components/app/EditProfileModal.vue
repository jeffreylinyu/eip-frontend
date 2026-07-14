<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Modal from '@/components/bootstrap/Modal.vue'
import { authApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { storage, StorageKeys } from '@/utils/storage'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const authStore = useAuthStore()

const username = ref('')
const isSaving = ref(false)
const errorMessage = ref('')

// 開啟時帶入目前名稱
watch(
  () => props.show,
  (show) => {
    if (show) {
      username.value = authStore.user?.username || ''
      errorMessage.value = ''
    }
  }
)

const trimmedUsername = computed(() => username.value.trim())
const canSave = computed(() => trimmedUsername.value.length > 0 && !isSaving.value)

const handleClose = () => {
  if (isSaving.value) return
  emit('update:show', false)
}

const handleSave = async () => {
  if (!canSave.value) return
  errorMessage.value = ''
  isSaving.value = true
  try {
    await authApi.updateProfile({ username: trimmedUsername.value })
    // 重新取得使用者資訊並同步 localStorage，讓 Header 名稱即時更新
    await authStore.fetchCurrentUser()
    if (authStore.user) {
      storage.set(StorageKeys.AUTH_USER, authStore.user)
    }
    emit('update:show', false)
  } catch (error: any) {
    console.error('更新個人資料失敗:', error)
    errorMessage.value = error?.response?.data?.message || '更新失敗，請稍後再試'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Modal
    :show="show"
    @update:show="emit('update:show', $event)"
    modal-id="edit-profile-modal"
    title="個人資料"
    icon="bi bi-person-circle"
    size="sm"
    :is-loading="isSaving"
    confirm-text="儲存"
    loading-text="儲存中..."
    @confirm="handleSave"
  >
    <template #body>
      <form @submit.prevent="handleSave">
        <div class="mb-3">
          <label for="edit-profile-username" class="form-label">顯示名稱</label>
          <input
            id="edit-profile-username"
            v-model="username"
            type="text"
            class="form-control"
            maxlength="50"
            placeholder="請輸入顯示名稱"
            :disabled="isSaving"
          />
          <div class="form-text">此名稱會顯示於畫面上方的使用者選單。</div>
        </div>
        <div v-if="authStore.user?.email" class="mb-0">
          <label class="form-label">Email</label>
          <input type="text" class="form-control" :value="authStore.user.email" disabled />
        </div>
        <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0 py-2">
          <i class="fa fa-exclamation-circle me-2"></i>{{ errorMessage }}
        </div>
      </form>
    </template>
  </Modal>
</template>
