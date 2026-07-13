<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import {
  memberBindingApi,
  type UserConstructionMemberBinding,
  type ConstructionParticipantScope
} from '@/api/memberBinding'
import { userConstructionApi } from '@/api/userConstruction'
import { companyApi } from '@/api/company'
import type { SitePersonnel } from '@/api/sitePersonnel'
import {
  getOccupationDisplayLabel,
  getOccupationOptions,
  type OccupationOption
} from '@/api/sitePersonnelOccupations'
import { usePermission } from '@/composables/usePermission'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'

export interface AccountOption {
  userId: string
  label: string
  email?: string
}

export interface PersonnelOption {
  memberDbId: number
  memberId: string
  fullName: string
  occupation?: string
  occupationCategory?: string
  status: string
  label: string
}

const props = defineProps<{
  constructionId: string
  companyId: string
  participantScope: ConstructionParticipantScope
  /** 已指派至此工程案的工地人員 */
  personnel: SitePersonnel[]
  /** 建立綁定時預選的帳號 userId */
  defaultUserId?: string
}>()

const { hasPermission } = usePermission()
const canManage = computed(() => hasPermission('construction_member:manage'))

const bindings = ref<UserConstructionMemberBinding[]>([])
const accountOptions = ref<AccountOption[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const formNotice = ref<{ type: 'info' | 'warning'; message: string } | null>(null)
const showCreateModal = ref(false)

const formUserId = ref('')
const formMemberDbId = ref('')
const formEffectiveFrom = ref('')
const formEffectiveTo = ref('')

const occupationOptions = computed<OccupationOption[]>(() =>
  getOccupationOptions(props.participantScope === 'SUPERVISORY' ? 'SUPERVISION' : 'CONTRACTOR')
)

const personnelOptions = computed<PersonnelOption[]>(() => {
  return props.personnel
    .filter((p) => p.status === 'Y')
    .map((p) => {
      const dbId = Number(p.id)
      if (!Number.isFinite(dbId)) return null
      const occ = p.occupation || p.position || ''
      return {
        memberDbId: dbId,
        memberId: p.memberId,
        fullName: p.fullName,
        occupation: occ,
        occupationCategory: p.occupationCategory,
        status: p.status,
        label: `${p.fullName} · ${getOccupationDisplayLabel(occ, p.occupationCategory, occupationOptions.value)}`
      }
    })
    .filter((x): x is PersonnelOption => x != null)
})

const scopedBindings = computed(() =>
  bindings.value.filter((b) => b.participantScope === props.participantScope)
)

function findExistingBinding(
  userId: string,
  memberDbId: number
): UserConstructionMemberBinding | undefined {
  return scopedBindings.value.find((b) => {
    if (b.userId !== userId) return false
    if (props.participantScope === 'SUPERVISORY') return b.supervisoryMemberId === memberDbId
    return b.constructionMemberId === memberDbId
  })
}

const selectedExistingBinding = computed(() => {
  if (!formUserId.value || !formMemberDbId.value) return null
  const memberDbId = Number(formMemberDbId.value)
  if (!Number.isFinite(memberDbId)) return null
  return findExistingBinding(formUserId.value, memberDbId) ?? null
})

const availablePersonnelOptions = computed<PersonnelOption[]>(() => {
  if (!formUserId.value) return personnelOptions.value
  return personnelOptions.value.filter((p) => {
    const existing = findExistingBinding(formUserId.value, p.memberDbId)
    return !existing?.enabled
  })
})

const availableAccountOptions = computed(() => {
  if (!formMemberDbId.value) return accountOptions.value
  const memberDbId = Number(formMemberDbId.value)
  if (!Number.isFinite(memberDbId)) return accountOptions.value
  return accountOptions.value.filter((u) => {
    const existing = findExistingBinding(u.userId, memberDbId)
    return !existing?.enabled
  })
})

const submitButtonLabel = computed(() => {
  if (isSaving.value) return '處理中…'
  if (selectedExistingBinding.value && !selectedExistingBinding.value.enabled) return '重新啟用綁定'
  return '建立綁定'
})

const canSubmitCreate = computed(() => {
  if (isSaving.value || !formUserId.value || !formMemberDbId.value) return false
  if (selectedExistingBinding.value?.enabled) return false
  return true
})

const bindingsByMemberKey = computed(() => {
  const map = new Map<string, UserConstructionMemberBinding[]>()
  for (const b of scopedBindings.value) {
    const key =
      props.participantScope === 'SUPERVISORY'
        ? `s:${b.supervisoryMemberId}`
        : `c:${b.constructionMemberId}`
    const list = map.get(key) ?? []
    list.push(b)
    map.set(key, list)
  }
  return map
})

function memberBindingKey(memberDbId: number): string {
  return props.participantScope === 'SUPERVISORY' ? `s:${memberDbId}` : `c:${memberDbId}`
}

function bindingsForPersonnel(memberDbId: number): UserConstructionMemberBinding[] {
  return bindingsByMemberKey.value.get(memberBindingKey(memberDbId)) ?? []
}

function formatOccupation(occupation?: string | null, category?: string | null): string {
  if (!occupation) return '—'
  return getOccupationDisplayLabel(occupation, category ?? undefined, occupationOptions.value)
}

function accountPrimaryLabel(binding: UserConstructionMemberBinding): string {
  return binding.userDisplayName || binding.userEmail || '—'
}

function accountSecondaryLabel(binding: UserConstructionMemberBinding): string | null {
  if (binding.userDisplayName && binding.userEmail) return binding.userEmail
  return null
}

const resetForm = () => {
  formUserId.value = props.defaultUserId ?? ''
  formMemberDbId.value = ''
  formEffectiveFrom.value = ''
  formEffectiveTo.value = ''
  formNotice.value = null
}

const updateFormNotice = () => {
  formNotice.value = null
  const existing = selectedExistingBinding.value
  if (!existing) return
  if (existing.enabled) {
    formNotice.value = {
      type: 'info',
      message: '此帳號與工地人員已有啟用中的綁定，無需重複建立。'
    }
    return
  }
  formNotice.value = {
    type: 'warning',
    message: '此帳號與工地人員曾有綁定但已停用，可重新啟用。'
  }
}

const loadAccounts = async () => {
  if (!props.constructionId || !props.companyId) return
  try {
    const [projectMembers, companyMembers] = await Promise.all([
      userConstructionApi.getMembers(props.constructionId, props.participantScope),
      companyApi.getMembers(props.companyId)
    ])
    const companyMap = new Map<string, any>()
    for (const m of companyMembers) {
      const uid = (m.userId || m.id || '').toString()
      if (uid) companyMap.set(uid, m)
    }
    const users = new Map<string, AccountOption>()
    for (const pm of projectMembers) {
      const cm = companyMap.get(pm.userId)
      const name = cm?.username || cm?.name || cm?.email || pm.userId
      const email = cm?.email
      users.set(pm.userId, {
        userId: pm.userId,
        label: email ? `${name} (${email})` : name,
        email
      })
    }
    accountOptions.value = Array.from(users.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'zh-Hant')
    )
  } catch (e) {
    console.warn('[MemberBinding] 載入帳號清單失敗', e)
    accountOptions.value = []
  }
}

const load = async () => {
  if (!props.constructionId || !canManage.value) return
  isLoading.value = true
  error.value = null
  try {
    bindings.value = await memberBindingApi.listBindings(props.constructionId)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '載入綁定失敗'
  } finally {
    isLoading.value = false
  }
}

const reloadAll = async () => {
  await Promise.all([load(), loadAccounts()])
}

const openCreate = (prefillMemberDbId?: number) => {
  resetForm()
  if (prefillMemberDbId != null) {
    formMemberDbId.value = String(prefillMemberDbId)
  }
  showCreateModal.value = true
  updateFormNotice()
}

const createBinding = async () => {
  if (!formUserId.value) {
    formNotice.value = { type: 'warning', message: '請選擇系統帳號' }
    return
  }
  if (!formMemberDbId.value) {
    formNotice.value = { type: 'warning', message: '請選擇工地人員' }
    return
  }
  const memberDbId = Number(formMemberDbId.value)
  if (!Number.isFinite(memberDbId)) {
    formNotice.value = { type: 'warning', message: '工地人員 ID 無效' }
    return
  }

  const existing = findExistingBinding(formUserId.value, memberDbId)
  if (existing?.enabled) {
    formNotice.value = {
      type: 'info',
      message: '此帳號與工地人員已有啟用中的綁定，請至下方列表查看。'
    }
    return
  }
  if (existing && !existing.enabled) {
    const memberName =
      personnelOptions.value.find((p) => p.memberDbId === memberDbId)?.fullName ?? '此工地人員'
    const accountName =
      accountOptions.value.find((u) => u.userId === formUserId.value)?.label ?? '此帳號'
    if (
      !confirm(
        `${accountName} 與 ${memberName} 曾有綁定但已停用。\n\n是否重新啟用此綁定？`
      )
    ) {
      return
    }
  }

  isSaving.value = true
  formNotice.value = null
  error.value = null
  try {
    await memberBindingApi.createBinding({
      userId: formUserId.value,
      constructionId: props.constructionId,
      participantScope: props.participantScope,
      constructionMemberId:
        props.participantScope === 'CONTRACTOR' ? memberDbId : undefined,
      supervisoryMemberId:
        props.participantScope === 'SUPERVISORY' ? memberDbId : undefined,
      enabled: true,
      effectiveFrom: formEffectiveFrom.value || null,
      effectiveTo: formEffectiveTo.value || null
    })
    showCreateModal.value = false
    resetForm()
    await load()
  } catch (e: unknown) {
    formNotice.value = {
      type: 'warning',
      message: e instanceof Error ? e.message : '建立綁定失敗'
    }
  } finally {
    isSaving.value = false
  }
}

const disableBinding = async (bindingId: number) => {
  if (!confirm('確定要停用此帳號與工地人員的綁定？停用後該帳號將無法以此身份簽名。')) return
  try {
    await memberBindingApi.disableBinding(bindingId)
    await load()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '停用失敗'
  }
}

const enableBinding = async (bindingId: number) => {
  try {
    await memberBindingApi.enableBinding(bindingId)
    await load()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '啟用失敗'
  }
}

watch(
  () => [formUserId.value, formMemberDbId.value] as const,
  () => {
    if (formMemberDbId.value && formUserId.value) {
      const memberDbId = Number(formMemberDbId.value)
      const personnelStillAvailable = availablePersonnelOptions.value.some(
        (p) => p.memberDbId === memberDbId
      )
      const accountStillAvailable = availableAccountOptions.value.some(
        (u) => u.userId === formUserId.value
      )
      if (!personnelStillAvailable || !accountStillAvailable) {
        if (!personnelStillAvailable) formMemberDbId.value = ''
        if (!accountStillAvailable) formUserId.value = ''
      }
    }
    updateFormNotice()
  }
)

watch(
  () => [props.constructionId, props.companyId, props.participantScope, canManage.value] as const,
  () => {
    if (canManage.value) reloadAll()
  },
  { immediate: true }
)

onMounted(() => {
  if (canManage.value) reloadAll()
})

defineExpose({ openCreate, reloadAll, bindingsForPersonnel })
</script>

<template>
  <Card v-if="canManage" class="member-binding-manager">
    <CardHeader class="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div>
        <h5 class="mb-0">
          <i class="fa fa-link me-2 text-primary" />
          帳號 ↔ 工地人員綁定
        </h5>
        <small class="text-muted d-block">
          工程案內的工地人員職稱與實際登入帳號建立綁定關係。
        </small>
      </div>
      <button type="button" class="btn btn-sm btn-primary" @click="openCreate()">
        <i class="fa fa-plus me-1" />
        新增綁定
      </button>
    </CardHeader>
    <CardBody>
      <div v-if="error" class="alert alert-warning py-2 mb-3">{{ error }}</div>

      <div v-if="isLoading" class="text-muted py-3 text-center">載入中…</div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle site-personnel-dark-table">
          <thead>
            <tr>
              <th>系統帳號</th>
              <th>工地人員</th>
              <th>職稱</th>
              <th>有效期間</th>
              <th>狀態</th>
              <th class="text-end">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="scopedBindings.length === 0">
              <td colspan="6" class="text-center text-muted py-4">
                尚無綁定。請為需要簽名或代理操作的帳號，指定對應的工地人員身份。
              </td>
            </tr>
            <tr v-for="b in scopedBindings" :key="b.id">
              <td>
                <div class="fw-semibold">{{ accountPrimaryLabel(b) }}</div>
                <small v-if="accountSecondaryLabel(b)" class="text-muted">{{ accountSecondaryLabel(b) }}</small>
              </td>
              <td>{{ b.memberFullName || '—' }}</td>
              <td class="small text-muted">
                {{ formatOccupation(b.memberOccupation, b.memberOccupationCategory) }}
              </td>
              <td class="small text-muted">
                <template v-if="b.effectiveFrom || b.effectiveTo">
                  {{ b.effectiveFrom || '—' }} ~ {{ b.effectiveTo || '—' }}
                </template>
                <template v-else>不限</template>
              </td>
              <td>
                <span :class="b.enabled ? 'badge bg-success' : 'badge bg-secondary'">
                  {{ b.enabled ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="text-end">
                <button
                  v-if="b.enabled"
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  @click="disableBinding(b.id)"
                >
                  停用
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-sm btn-outline-success"
                  @click="enableBinding(b.id)"
                >
                  啟用
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CardBody>
  </Card>

  <Modal
    v-model:show="showCreateModal"
    title="新增帳號綁定"
    icon="fa fa-link"
    size="lg"
    :hide-confirm-button="true"
    :hide-cancel-button="true"
  >
    <template #body>
      <p class="text-muted small mb-0">
        工程案內的工地人員職稱與實際登入帳號建立綁定關係。
      </p>

      <div
        v-if="formNotice"
        :class="formNotice.type === 'info' ? 'alert alert-info py-2' : 'alert alert-warning py-2'"
      >
        {{ formNotice.message }}
      </div>

      <div class="mb-3">
        <label class="form-label">系統帳號 <span class="text-danger">*</span></label>
        <select v-model="formUserId" class="form-select">
          <option value="">請選擇帳號</option>
          <option v-for="u in availableAccountOptions" :key="u.userId" :value="u.userId">
            {{ u.label }}
          </option>
        </select>
        <div v-if="accountOptions.length === 0" class="form-text text-warning">
          此工程案尚無已授權的系統帳號，請先於「工程案成員授權」邀請使用者加入。
        </div>
        <div
          v-else-if="formMemberDbId && availableAccountOptions.length === 0"
          class="form-text text-muted"
        >
          此工地人員已與所有可用帳號建立綁定。
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label">工地人員 <span class="text-danger">*</span></label>
        <select v-model="formMemberDbId" class="form-select">
          <option value="">請選擇人員</option>
          <option
            v-for="p in availablePersonnelOptions"
            :key="p.memberDbId"
            :value="String(p.memberDbId)"
          >
            {{ p.label }}
          </option>
        </select>
        <div v-if="personnelOptions.length === 0" class="form-text text-warning">
          請先將工地人員指派至此工程案（在職狀態）後再建立綁定。
        </div>
        <div
          v-else-if="formUserId && availablePersonnelOptions.length === 0"
          class="form-text text-muted"
        >
          此帳號已與所有可綁定的工地人員建立關聯。
        </div>
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">生效日（選填）</label>
          <input v-model="formEffectiveFrom" type="date" class="form-control" />
        </div>
        <div class="col-md-6">
          <label class="form-label">失效日（選填）</label>
          <input v-model="formEffectiveTo" type="date" class="form-control" />
        </div>
      </div>
    </template>
    <template #footer>
      <button type="button" class="btn btn-outline-secondary" @click="showCreateModal = false">取消</button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!canSubmitCreate"
        @click="createBinding"
      >
        {{ submitButtonLabel }}
      </button>
    </template>
  </Modal>
</template>

