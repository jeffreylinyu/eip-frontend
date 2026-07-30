<template>
  <div class="self-check-overview-page a4-dark">
    <PageHeader
      :title="`${category}類 施工安全衛生抽查`"
      icon="fa fa-shield-halved"
      :breadcrumbs="breadcrumbs"
    />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="loadingOptions" class="text-center py-5 text-muted">
      <i class="fa fa-spinner fa-spin me-2"></i>載入施工項目中…
    </div>

    <Card v-else class="overview-card">
      <CardBody class="overview-card__body" data-bs-theme="dark">
        <SelfCheckInspectionList
          :construction-id="constructionId"
          :classification-options="classificationOptions"
          :owner-type="ownerType"
          :base-path="basePath"
          :initial-document-classification-id="initialDocumentClassificationId"
          default-standard-kind="SAFETY"
          aggregate
        />
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
import SelfCheckInspectionList, {
  type SelfCheckClassificationOption
} from '@/components/self-check/SelfCheckInspectionList.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { getDesignChangeList } from '@/api/designChange'
import { documentClassificationApi } from '@/api/documentClassification'
import { contractorDocumentClassificationApi } from '@/api/contractorDocumentClassification'
import type { SelfCheckOwnerType } from '@/api/selfCheckInspection'

const props = defineProps<{
  ownerType: SelfCheckOwnerType
  category: 'L' | 'S'
}>()

const workspaceStore = useWorkspaceStore()
const route = useRoute()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const loadingOptions = ref(false)
const classificationOptions = ref<SelfCheckClassificationOption[]>([])
const initialDocumentClassificationId = computed<number | undefined>(() => {
  const raw = Array.isArray(route.query.classificationId)
    ? route.query.classificationId[0]
    : route.query.classificationId
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : undefined
})

const basePath = computed(() =>
  props.ownerType === 'SUPERVISORY'
    ? '/supervisory/forms/doc-class/L/safety-inspections'
    : '/contractor/forms/doc-class/S/safety-inspections'
)

const breadcrumbs = computed(() => [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: `${props.category}類表單`, href: 'javascript:;' },
  { text: '施工安全衛生抽查', active: true as const }
])

function parseSequence(itemNumber: string | null | undefined): string {
  const raw = String(itemNumber ?? '').trim()
  const match = raw.match(/^0*(\d+)/)
  return match ? match[1] : raw
}

async function resolveLatestDesignChangeId(constructionIdValue: string): Promise<number | null> {
  try {
    const versions = await getDesignChangeList(
      constructionIdValue,
      undefined,
      { skipAuthRedirectOn401: true },
      false
    )
    return versions.reduce<{ id: number; sortOrder: number } | null>((latest, current) => {
      if (!latest || current.sortOrder > latest.sortOrder) {
        return { id: current.id, sortOrder: current.sortOrder }
      }
      return latest
    }, null)?.id ?? null
  } catch {
    return null
  }
}

async function loadClassificationOptions() {
  const cid = constructionId.value
  if (!cid) {
    classificationOptions.value = []
    return
  }
  loadingOptions.value = true
  try {
    const designChangeId = await resolveLatestDesignChangeId(cid)
    if (props.ownerType === 'SUPERVISORY') {
      const rows = await documentClassificationApi.getAll(
        cid,
        designChangeId,
        { skipAuthRedirectOn401: true }
      )
      classificationOptions.value = rows
        .filter((row) => row.category === 'D')
        .map((row) => ({
          id: row.id,
          label: `D-${parseSequence(row.itemNumber)} ${row.documentName}`.trim()
        }))
    } else {
      const rows = await contractorDocumentClassificationApi.getAll(
        cid,
        designChangeId,
        { skipAuthRedirectOn401: true } as any
      )
      classificationOptions.value = rows
        .filter((row) => row.category === 'E')
        .map((row) => ({
          id: row.id,
          label: `E-${parseSequence(row.itemNumber)} ${row.documentName}`.trim()
        }))
    }
  } catch (error) {
    console.error(error)
    classificationOptions.value = []
  } finally {
    loadingOptions.value = false
  }
}

watch(
  () => [constructionId.value, props.ownerType] as const,
  () => { void loadClassificationOptions() },
  { immediate: true }
)
</script>

<style scoped>
.self-check-overview-page {
  padding: 1rem;
}

.overview-card {
  overflow: hidden;
  border-color: rgba(var(--bs-primary-rgb), 0.24);
  background: rgba(10, 18, 30, 0.94);
}

.overview-card__body {
  padding: 1rem;
}

@media (min-width: 992px) {
  .overview-card__body {
    padding: 1.35rem;
  }
}
</style>
