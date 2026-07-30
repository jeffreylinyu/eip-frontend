<template>
  <div class="fixed-document-form-entry a4-dark">
    <PageHeader
      :title="pageTitle"
      icon="fa fa-file-lines"
      :breadcrumbs="breadcrumbs"
    />

    <div v-if="!currentProject?.id" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!hasCorrectPerspective" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      此頁僅供{{ spec?.ownerType === 'SUPERVISORY' ? '監造' : '營造' }}端使用。
    </div>

    <Card v-else>
      <CardBody>
        <div class="fixed-document-form-entry__empty">
          <i class="fa fa-file-circle-plus" aria-hidden="true"></i>
          <h5 class="mb-1">{{ pageTitle }}</h5>
          <p class="mb-0 text-muted">此表單入口已建立，目前尚未設定樣板內容。</p>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { getDesignChangeList } from '@/api/designChange'
import { documentClassificationApi } from '@/api/documentClassification'
import { contractorDocumentClassificationApi } from '@/api/contractorDocumentClassification'
import { FIXED_DOCUMENT_FORMS } from '@/config/fixedDocumentForms'

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { isSupervisory, isContractor } = useViewPerspective()

const fixedFormCode = computed(() => String(route.meta.fixedFormCode ?? ''))
const spec = computed(() => FIXED_DOCUMENT_FORMS.find((item) => item.code === fixedFormCode.value))
const currentProject = computed(() => workspaceStore.currentProject)
const documentName = ref('')

const hasCorrectPerspective = computed(() => {
  if (spec.value?.ownerType === 'SUPERVISORY') return isSupervisory.value
  if (spec.value?.ownerType === 'CONTRACTOR') return isContractor.value
  return false
})

const displayNumber = computed(() => Number(spec.value?.itemNumber ?? 0))
const pageTitle = computed(() => {
  const current = spec.value
  if (!current) return '固定表單'
  return `${current.category}-${displayNumber.value} ${documentName.value || current.fallbackName}`
})

const breadcrumbs = computed(() => [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: `${spec.value?.category ?? ''}類表單`, href: 'javascript:;' },
  { text: pageTitle.value, active: true as const },
])

async function loadDocumentName() {
  documentName.value = ''
  const cid = currentProject.value?.id
  const current = spec.value
  if (!cid || !current || !hasCorrectPerspective.value) return

  let designChangeId: number | null = null
  try {
    const versions = await getDesignChangeList(cid, undefined, { skipAuthRedirectOn401: true }, false)
    const latest = versions.reduce<{ id: number; sortOrder: number } | null>((acc, item) => {
      if (!acc || item.sortOrder > acc.sortOrder) return { id: item.id, sortOrder: item.sortOrder }
      return acc
    }, null)
    designChangeId = latest?.id ?? null
  } catch {
    designChangeId = null
  }

  try {
    const rows = current.ownerType === 'SUPERVISORY'
      ? await documentClassificationApi.getAll(cid, designChangeId, { skipAuthRedirectOn401: true })
      : await contractorDocumentClassificationApi.getAll(
          cid,
          designChangeId,
          { skipAuthRedirectOn401: true } as any,
        )
    const row = rows.find((item) =>
      item.fixedFormCode === current.code ||
      (item.category === current.category && item.itemNumber === current.itemNumber)
    )
    documentName.value = row?.documentName?.trim() ?? ''
  } catch {
    documentName.value = ''
  }
}

watch(
  () => [currentProject.value?.id ?? '', fixedFormCode.value, hasCorrectPerspective.value],
  () => { void loadDocumentName() },
  { immediate: true },
)
</script>

<style scoped>
.fixed-document-form-entry {
  padding: 1rem;
}

.fixed-document-form-entry__empty {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 4rem 1rem;
  text-align: center;
}

.fixed-document-form-entry__empty > i {
  color: var(--bs-primary);
  font-size: 2.5rem;
}
</style>
