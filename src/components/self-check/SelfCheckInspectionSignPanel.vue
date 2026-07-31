<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  selfCheckInspectionApi,
  type SelfCheckInspectionRecord,
  type SelfCheckOwnerType,
  type SelfCheckSignRole
} from '@/api/selfCheckInspection'
import {
  getSelfCheckInspectionSignPreferences,
  saveSelfCheckInspectionSignPreferences,
  type SelfCheckInspectionSignPreferences,
  DEFAULT_SELF_CHECK_INSPECTION_SIGN_PREFERENCES
} from '@/api/userPreference'
import { useSignableIdentities } from '@/composables/useSignableIdentities'
import { useUserSignatures } from '@/composables/useUserSignatures'
import {
  filterInspectorIdentities,
  resolveInspectorOccupation,
  resolveInspectorRoleLabel
} from '@/composables/useSelfCheckInspectorRole'
import { usePermission } from '@/composables/usePermission'
import SignAsIdentityModal from '@/components/common/SignAsIdentityModal.vue'
import Modal from '@/components/bootstrap/Modal.vue'

const props = defineProps<{
  constructionId: string
  recordId: number
  ownerType: SelfCheckOwnerType
  record: SelfCheckInspectionRecord
}>()

const emit = defineEmits<{
  signed: [record: SelfCheckInspectionRecord]
}>()

const { hasPermission } = usePermission()
const canSignInspector = computed(() => hasPermission('form:write'))
const canSignReviewer = computed(() => hasPermission('form:approve'))
const canManageSettings = computed(() => canSignInspector.value || canSignReviewer.value)

const inspectorRoleLabel = computed(() => resolveInspectorRoleLabel(props.ownerType))
const signing = ref(false)
const signError = ref<string | null>(null)

const showIdentityModal = ref(false)
const pendingSignRole = ref<SelfCheckSignRole | null>(null)

const showSettingsModal = ref(false)
const isLoadingSettings = ref(false)
const isSavingSettings = ref(false)
const settingsError = ref('')
const signPreferences = ref<SelfCheckInspectionSignPreferences>({
  ...DEFAULT_SELF_CHECK_INSPECTION_SIGN_PREFERENCES
})

const {
  identities,
  load: loadIdentities
} = useSignableIdentities(() => props.constructionId)

const { defaultSignatureImage } = useUserSignatures()

const inspectorOccupationFilter = computed(() => resolveInspectorOccupation(props.ownerType))

const identityModalOccupationFilter = computed(() =>
  pendingSignRole.value === 'INSPECTOR' ? inspectorOccupationFilter.value : null
)

const identityModalLabel = computed(() => {
  if (pendingSignRole.value === 'REVIEWER') return '複核人簽名前請選擇您要以哪位工地人員的身份簽署。'
  return `${inspectorRoleLabel.value}簽名前請選擇您要以哪位工地人員的身份簽署。`
})

function signaturePreview(src?: string | null): string {
  const value = src?.trim()
  return value || ''
}

async function loadSettings() {
  if (!canManageSettings.value) return
  isLoadingSettings.value = true
  settingsError.value = ''
  try {
    signPreferences.value = await getSelfCheckInspectionSignPreferences()
  } catch {
    signPreferences.value = { ...DEFAULT_SELF_CHECK_INSPECTION_SIGN_PREFERENCES }
    settingsError.value = '載入設定失敗，已套用預設值。'
  } finally {
    isLoadingSettings.value = false
  }
}

async function saveSettings() {
  isSavingSettings.value = true
  settingsError.value = ''
  try {
    signPreferences.value = await saveSelfCheckInspectionSignPreferences(signPreferences.value)
    showSettingsModal.value = false
  } catch (e: unknown) {
    settingsError.value = e instanceof Error ? e.message : '儲存設定失敗'
  } finally {
    isSavingSettings.value = false
  }
}

async function performSign(signRole: SelfCheckSignRole, bindingId: number, signatureImage: string) {
  signing.value = true
  signError.value = null
  try {
    const updated = await selfCheckInspectionApi.sign(
      props.constructionId,
      props.recordId,
      props.ownerType,
      {
        bindingId,
        signRole,
        signatureImage
      }
    )
    emit('signed', updated)
  } catch (e: unknown) {
    signError.value = e instanceof Error ? e.message : '簽署失敗'
  } finally {
    signing.value = false
  }
}

async function tryAutoFillInspectorSign(): Promise<boolean> {
  if (!signPreferences.value.autoFillInspectorOnSign) return false
  const signatureImage = defaultSignatureImage.value.trim()
  if (!signatureImage) return false

  await loadIdentities(true)
  const matches = filterInspectorIdentities(identities.value, props.ownerType)
  if (matches.length !== 1) return false

  await performSign('INSPECTOR', matches[0].bindingId, signatureImage)
  return true
}

async function startInspectorSign() {
  pendingSignRole.value = 'INSPECTOR'
  signError.value = null
  if (await tryAutoFillInspectorSign()) return

  await loadIdentities(true)
  const matches = filterInspectorIdentities(identities.value, props.ownerType)
  if (matches.length === 1 && defaultSignatureImage.value.trim()) {
    await performSign('INSPECTOR', matches[0].bindingId, defaultSignatureImage.value)
    return
  }
  if (matches.length === 0) {
    signError.value =
      identities.value.length === 0
        ? `尚無可簽名的${inspectorRoleLabel.value}綁定，請先於工地人員頁設定帳號綁定。`
        : `尚無符合「${inspectorRoleLabel.value}」職稱的綁定身份，請先完成帳號綁定。`
    return
  }
  showIdentityModal.value = true
}

async function startReviewerSign() {
  pendingSignRole.value = 'REVIEWER'
  signError.value = null
  await loadIdentities(true)
  if (identities.value.length === 0) {
    signError.value = '尚無可簽名的身份綁定，請先於工地人員頁設定帳號綁定。'
    return
  }
  const signatureImage = defaultSignatureImage.value.trim()
  if (identities.value.length === 1 && signatureImage) {
    await performSign('REVIEWER', identities.value[0].bindingId, signatureImage)
    return
  }
  showIdentityModal.value = true
}

async function onIdentityConfirmed(bindingId: number) {
  const signRole = pendingSignRole.value
  if (!signRole) return
  const signatureImage = defaultSignatureImage.value.trim()
  if (!signatureImage) {
    signError.value = '請先至「個人簽名檔」建立並儲存簽名，再進行簽署。'
    return
  }
  await performSign(signRole, bindingId, signatureImage)
}

function openSettings() {
  showSettingsModal.value = true
  void loadSettings()
}

watch(
  () => props.constructionId,
  () => {
    if (canManageSettings.value) void loadSettings()
  },
  { immediate: true }
)
</script>

<template>
  <div class="self-check-sign-panel">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <h5 class="fw-bold mb-0">簽名</h5>
      <button
        v-if="canManageSettings"
        type="button"
        class="btn btn-sm btn-outline-secondary"
        title="簽名設定"
        @click="openSettings"
      >
        <i class="fa fa-cog me-1" />
        簽名設定
      </button>
    </div>

    <div v-if="signError" class="alert alert-warning py-2 mb-3">{{ signError }}</div>

    <div class="row g-3">
      <div class="col-md-6">
        <div class="border rounded p-3 h-100 sign-role-card">
          <div class="small text-muted mb-1">檢查人（{{ inspectorRoleLabel }}）</div>
          <div class="fw-semibold mb-2">{{ record.inspectorName || '尚未簽署' }}</div>
          <div class="signature-preview mb-3">
            <img
              v-if="signaturePreview(record.inspectorSignature)"
              :src="signaturePreview(record.inspectorSignature)"
              alt="檢查人簽名"
            />
            <span v-else class="text-muted small">尚無簽名圖</span>
          </div>
          <button
            v-if="canSignInspector"
            type="button"
            class="btn btn-sm btn-primary"
            :disabled="signing"
            @click="startInspectorSign"
          >
            {{ signing ? '簽署中…' : `以${inspectorRoleLabel}身份簽署` }}
          </button>
        </div>
      </div>

      <div class="col-md-6">
        <div class="border rounded p-3 h-100 sign-role-card">
          <div class="small text-muted mb-1">複核人</div>
          <div class="fw-semibold mb-2">{{ record.reviewerName || '尚未簽署' }}</div>
          <div class="signature-preview mb-3">
            <img
              v-if="signaturePreview(record.reviewerSignature)"
              :src="signaturePreview(record.reviewerSignature)"
              alt="複核人簽名"
            />
            <span v-else class="text-muted small">尚無簽名圖</span>
          </div>
          <button
            v-if="canSignReviewer"
            type="button"
            class="btn btn-sm btn-outline-primary"
            :disabled="signing"
            @click="startReviewerSign"
          >
            {{ signing ? '簽署中…' : '複核簽署' }}
          </button>
        </div>
      </div>
    </div>

    <SignAsIdentityModal
      v-model:show="showIdentityModal"
      :construction-id="constructionId"
      :sign-role-label="identityModalLabel"
      :occupation-filter="identityModalOccupationFilter"
      @confirm="onIdentityConfirmed"
    />

    <Modal
      v-model:show="showSettingsModal"
      :title="props.ownerType === 'CONTRACTOR' ? '施工自主檢查簽名設定' : '施工抽查簽名設定'"
      icon="fa fa-cog"
      :hide-confirm-button="true"
      :hide-cancel-button="true"
    >
      <template #body>
        <p class="text-muted small">
          監造側檢查人對應品管人員，營造側檢查人對應現場工程師。簽署時會使用您在「個人簽名檔」中最近儲存的簽名圖。
        </p>

        <div v-if="isLoadingSettings" class="text-muted small py-2">載入中…</div>
        <div v-else class="form-check form-switch">
          <input
            id="auto-fill-inspector-sign"
            v-model="signPreferences.autoFillInspectorOnSign"
            class="form-check-input"
            type="checkbox"
            role="switch"
          />
          <label class="form-check-label" for="auto-fill-inspector-sign">
            簽署檢查人時自動帶入綁定的{{ inspectorRoleLabel }}身份與個人簽名檔
          </label>
        </div>

        <div v-if="settingsError" class="alert alert-warning py-2 mt-3 mb-0 small">
          {{ settingsError }}
        </div>
      </template>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="showSettingsModal = false">
          取消
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="isSavingSettings || isLoadingSettings"
          @click="saveSettings"
        >
          {{ isSavingSettings ? '儲存中…' : '儲存設定' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.sign-role-card {
  background: rgba(15, 23, 42, 0.35);
  border-color: rgba(148, 163, 184, 0.25) !important;
}

.signature-preview {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.375rem;
}

.signature-preview img {
  max-height: 64px;
  max-width: 100%;
  object-fit: contain;
}
</style>
