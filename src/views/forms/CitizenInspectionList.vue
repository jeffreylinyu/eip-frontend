<template>
  <div class="citizen-inspection-list-page a4-dark">
    <PageHeader :title="pageTitle" icon="fa fa-people-group" :breadcrumbs="breadcrumbs" />

    <div v-if="!currentProject?.id" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程案。
    </div>

    <Card v-else>
      <CardBody>
        <div class="alert alert-info mb-4">
          <h5 class="alert-heading">
            <i class="fa fa-people-group me-2"></i>全民督工案件
          </h5>
          <p class="mb-0 small">每一筆案件分開維護表單、送審紀錄及 Word 匯出。</p>
        </div>

        <div class="d-flex justify-content-between align-items-center gap-3 mb-3 flex-wrap">
          <div class="text-muted small">共 {{ records.length }} 筆案件</div>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            :disabled="creating"
            @click="createRecord"
          >
            <i :class="creating ? 'fa fa-spinner fa-spin' : 'fa fa-plus'" class="me-1"></i>
            新增全民督工案件
          </button>
        </div>

        <div v-if="loading" class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入中…
        </div>
        <div v-else-if="records.length === 0" class="text-center py-4 text-muted border rounded">
          <i class="fa fa-inbox fa-2x mb-2 d-block"></i>
          尚無全民督工案件
          <div class="small mt-1">請按右上方按鈕新增第一筆案件。</div>
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0 a4-table">
            <thead>
              <tr>
                <th style="width: 56px">#</th>
                <th style="min-width: 120px">填報日期</th>
                <th style="min-width: 160px">填報人</th>
                <th style="min-width: 220px">工程名稱</th>
                <th style="min-width: 220px">督工事項</th>
                <th style="width: 150px" class="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(record, index) in records"
                :key="record.id ?? index"
                class="cursor-pointer"
                @click="record.id && openRecord(record.id)"
              >
                <td>{{ index + 1 }}</td>
                <td>{{ record.reportDate ? formatRepublicDateFromIso(record.reportDate) : '—' }}</td>
                <td>{{ record.reporterName || '—' }}</td>
                <td class="fw-semibold">{{ record.projectName || currentProject.name || '—' }}</td>
                <td>{{ record.inspectionSubject || '—' }}</td>
                <td class="text-center" @click.stop>
                  <div class="btn-group btn-group-sm">
                    <button
                      type="button"
                      class="btn btn-outline-primary"
                      title="編輯"
                      @click="record.id && openRecord(record.id)"
                    >
                      <i class="fa fa-pen-to-square"></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      title="匯出 Word"
                      :disabled="exportingId === record.id"
                      @click="record.id && exportRecord(record)"
                    >
                      <i
                        class="fa"
                        :class="exportingId === record.id ? 'fa-spinner fa-spin' : 'fa-file-word'"
                      ></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-danger"
                      title="刪除"
                      @click="record.id && removeRecord(record)"
                    >
                      <i class="fa fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  createCitizenInspectionForm,
  deleteCitizenInspectionForm,
  exportCitizenInspectionForm,
  exportCitizenInspectionBundle,
  listCitizenInspectionForms,
  type CitizenInspectionForm,
} from '@/api/citizenInspection'
import { downloadBlobAsFile } from '@/api/forms'
import { formatRepublicDateFromIso } from '@/utils/format'
import toastService from '@/components/bootstrap/ToastService.js'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const currentProject = computed(() => workspaceStore.currentProject)
const fixedFormCode = computed(() => String(route.meta.fixedFormCode ?? 'C01'))
const category = computed(() => fixedFormCode.value.startsWith('G') ? 'G' : 'C')
const pageTitle = computed(() => `${category.value}-1 全民督工案件`)
const breadcrumbs = computed(() => [
  { text: '表單管理', href: 'javascript:;' },
  { text: `${category.value}類表單`, href: 'javascript:;' },
  { text: pageTitle.value, active: true as const },
])

const records = ref<CitizenInspectionForm[]>([])
const loading = ref(false)
const creating = ref(false)
const exportingId = ref<number | null>(null)

function emptyRecord(): CitizenInspectionForm {
  const project = currentProject.value
  return {
    id: null,
    reportDate: new Date().toISOString().slice(0, 10),
    reporterName: null,
    contactPhone: null,
    reportingUnit: null,
    projectName: project?.name ?? null,
    contractorName: project?.contractorCompanyName || project?.contractorName || null,
    projectLocation: project?.location || null,
    inspectionSubject: null,
    problemDescription: null,
    affectedScope: null,
    correctiveActions: null,
    hasPhoto: false,
    hasSupportingDocument: false,
  }
}

async function loadRecords() {
  const constructionId = currentProject.value?.id
  if (!constructionId) {
    records.value = []
    return
  }
  loading.value = true
  try {
    records.value = await listCitizenInspectionForms(constructionId)
  } catch {
    records.value = []
    toastService.error('全民督工案件載入失敗')
  } finally {
    loading.value = false
  }
}

async function createRecord() {
  const constructionId = currentProject.value?.id
  if (!constructionId) return
  creating.value = true
  try {
    const created = await createCitizenInspectionForm(constructionId, emptyRecord())
    if (created.id) openRecord(created.id)
  } catch {
    toastService.error('新增全民督工案件失敗')
  } finally {
    creating.value = false
  }
}

function openRecord(recordId: number) {
  void router.push(`${route.path}/records/${recordId}`)
}

async function exportRecord(record: CitizenInspectionForm) {
  const constructionId = currentProject.value?.id
  if (!constructionId || !record.id) return
  exportingId.value = record.id
  try {
    const hasAttachments = record.hasPhoto || record.hasSupportingDocument
    const includeAttachments = hasAttachments && window.confirm(
      '此案件有附件。\n按「確定」下載 Word 與全部附件 ZIP；按「取消」僅下載 Word。',
    )
    const blob = includeAttachments
      ? await exportCitizenInspectionBundle(constructionId, record.id)
      : await exportCitizenInspectionForm(constructionId, record.id)
    downloadBlobAsFile(
      blob,
      includeAttachments
        ? `${category.value}-1_全民督工案件檢查表_含附件.zip`
        : `${category.value}-1_全民督工案件檢查表.docx`,
    )
  } catch {
    toastService.error('Word 匯出失敗')
  } finally {
    exportingId.value = null
  }
}

async function removeRecord(record: CitizenInspectionForm) {
  const constructionId = currentProject.value?.id
  if (!constructionId || !record.id) return
  const label = record.inspectionSubject || record.reporterName || `第 ${record.id} 筆案件`
  if (!window.confirm(`確定刪除「${label}」？`)) return
  try {
    await deleteCitizenInspectionForm(constructionId, record.id)
    await loadRecords()
  } catch {
    toastService.error('刪除全民督工案件失敗')
  }
}

watch(
  () => currentProject.value?.id,
  () => { void loadRecords() },
  { immediate: true },
)
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
