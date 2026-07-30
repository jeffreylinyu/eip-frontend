<template>
  <div class="inspection-editor-page">
    <PageHeader :title="pageTitle" icon="fa fa-clipboard-check" :breadcrumbs="breadcrumbs" />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先選擇工程專案
    </div>
    <div v-else-if="loading" class="editor-loading">
      <i class="fa fa-spinner fa-spin fa-2x"></i>
    </div>

    <template v-else>
      <Card class="mb-3 inspection-shell">
        <CardBody>
          <div class="editor-toolbar">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <button type="button" class="win-btn win-btn--sm" @click="goBack">
                <i class="fa fa-arrow-left me-1"></i>返回列表
              </button>
              <strong><i class="fa fa-location-dot me-2 text-warning"></i>{{ perspectiveLabel }}作業表單</strong>
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <button type="button" class="win-btn" @click="showSubmissionModal = true">
                <i class="fa fa-clipboard-list me-1"></i>送審紀錄
              </button>
              <button type="button" class="win-btn win-btn-accent" :disabled="saving" @click="save">
                <i :class="saving ? 'fa fa-spinner fa-spin' : 'fa fa-floppy-disk'" class="me-1"></i>
                {{ saving ? '儲存中' : '儲存' }}
              </button>
              <FormExportWordButton :loading="exporting" @click="exportWord" />
            </div>
          </div>
          <div class="row g-3 mt-1">
            <div class="col-12 col-lg-8">
              <label class="form-label">紀錄名稱</label>
              <input v-model="form.title" class="form-control" maxlength="255" />
            </div>
            <div class="col-12 col-lg-4">
              <label class="form-label">會勘日期</label>
              <input v-model="form.inspectionData.inspectionDate" type="date" class="form-control" />
            </div>
          </div>
        </CardBody>
      </Card>

      <nav class="section-nav mb-3">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          class="section-tab"
          :class="{ active: activeSection === section.key }"
          @click="activeSection = section.key"
        >
          <i :class="section.icon"></i>{{ section.label }}
        </button>
      </nav>

      <section v-show="activeSection === 'basic'" class="section-stack">
        <article class="section-card">
          <header><i class="fa fa-building me-2 text-warning"></i>會勘基本資料</header>
          <div class="section-body">
            <div class="row g-3">
              <div class="col-12 col-lg-6">
                <label class="form-label">主辦機關</label>
                <input v-model="form.inspectionData.hostAgency" class="form-control" />
              </div>
              <div class="col-12 col-lg-6">
                <label class="form-label">工程名稱</label>
                <input v-model="form.inspectionData.projectName" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label">會勘事由</label>
                <textarea v-model="form.inspectionData.inspectionSubject" rows="2" class="form-control"></textarea>
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">會勘日期</label>
                <input v-model="form.inspectionData.inspectionDate" type="date" class="form-control" />
              </div>
              <div class="col-6 col-md-2">
                <label class="form-label">時段</label>
                <select v-model="form.inspectionData.inspectionPeriod" class="form-select">
                  <option>上午</option>
                  <option>下午</option>
                </select>
              </div>
              <div class="col-6 col-md-2">
                <label class="form-label">時間</label>
                <input v-model="form.inspectionData.inspectionTime" type="time" class="form-control" />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">會勘地點</label>
                <input v-model="form.inspectionData.location" class="form-control" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">主持</label>
                <input v-model="form.inspectionData.chairperson" class="form-control" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">紀錄</label>
                <input v-model="form.inspectionData.recorder" class="form-control" />
              </div>
            </div>
          </div>
        </article>
      </section>

      <section v-show="activeSection === 'attendees'" class="section-stack">
        <article class="section-card">
          <header><i class="fa fa-users me-2 text-warning"></i>會勘人員</header>
          <div class="section-body">
            <div class="table-responsive">
              <table class="table inspection-table align-middle">
                <thead>
                  <tr><th class="index-col">#</th><th>單位名稱</th><th>職稱</th><th>簽名／姓名</th><th>聯絡電話</th><th class="action-col"></th></tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in form.inspectionData.attendeeRows" :key="index">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td><input v-model="row.unitName" class="form-control" /></td>
                    <td><input v-model="row.jobTitle" class="form-control" /></td>
                    <td><input v-model="row.signerName" class="form-control" /></td>
                    <td><input v-model="row.contactPhone" class="form-control" /></td>
                    <td>
                      <button class="btn btn-sm btn-outline-danger" title="刪除" @click="removeAttendee(index)">
                        <i class="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button type="button" class="win-btn win-btn--sm" @click="addAttendee">
              <i class="fa fa-plus me-1"></i>新增會勘人員
            </button>
          </div>
        </article>
      </section>

      <section v-show="activeSection === 'content'" class="section-stack">
        <article
          v-for="field in contentFields"
          :key="field.key"
          class="section-card"
        >
          <header><i :class="field.icon" class="me-2 text-warning"></i>{{ field.label }}</header>
          <div class="section-body">
            <textarea
              v-model="form.inspectionData[field.key]"
              rows="7"
              class="form-control"
              :placeholder="`請輸入${field.label}`"
            ></textarea>
          </div>
        </article>
      </section>

      <section v-show="activeSection === 'photos'" class="section-stack">
        <article class="section-card">
          <header><i class="fa fa-camera me-2 text-warning"></i>會勘照片</header>
          <div class="section-body">
            <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-3">
              <div class="small text-muted">最多 2 張，匯出時依順序放入 Word 照片頁，並同步到檔案總管。</div>
              <button
                type="button"
                class="win-btn win-btn--sm win-btn-accent"
                :disabled="uploading || photos.length >= 2"
                @click="photoInput?.click()"
              >
                <i :class="uploading ? 'fa fa-spinner fa-spin' : 'fa fa-upload'" class="me-1"></i>
                上傳照片
              </button>
              <input
                ref="photoInput"
                type="file"
                class="d-none"
                accept="image/*"
                multiple
                @change="onPhotoFiles"
              />
            </div>
            <div v-if="!photos.length" class="photo-empty">
              <i class="fa fa-images fa-2x mb-2"></i>
              <div>尚未上傳會勘照片</div>
            </div>
            <div v-else class="row g-3">
              <div v-for="(photo, index) in photos" :key="photo.id" class="col-12 col-xl-6">
                <article class="photo-card">
                  <a v-if="photo.downloadUrl" :href="photo.downloadUrl" target="_blank" rel="noopener">
                    <img :src="photo.downloadUrl" :alt="photo.fileName" />
                  </a>
                  <div class="photo-meta">
                    <strong>會勘照片 {{ index + 1 }}</strong>
                    <span class="small text-muted text-truncate">{{ photo.fileName }}</span>
                  </div>
                  <label class="form-label mt-3">拍攝時間</label>
                  <input v-model="photo.capturedAt" type="datetime-local" class="form-control" />
                  <label class="form-label mt-3">照片說明</label>
                  <textarea v-model="photo.caption" rows="2" class="form-control"></textarea>
                  <div class="d-flex justify-content-end mt-3">
                    <button class="win-btn win-btn--sm win-btn-danger" @click="removePhoto(photo)">
                      <i class="fa fa-trash me-1"></i>刪除照片
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </article>
      </section>
    </template>

    <PlanSubmissionPModal
      v-model:show="showSubmissionModal"
      :construction-id="constructionId"
      :plan-type="fixedFormCode"
      :plan-label="pageTitle"
      :context-record-id="recordId"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import FormExportWordButton from '@/components/common/FormExportWordButton.vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import PlanSubmissionPModal from '@/components/forms/PlanSubmissionPModal.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  deleteSiteInspectionPhoto,
  exportSiteInspection,
  getSiteInspection,
  listSiteInspectionPhotos,
  updateSiteInspection,
  updateSiteInspectionPhoto,
  uploadSiteInspectionPhotos,
  type SiteInspectionData,
  type SiteInspectionPhoto,
} from '@/api/siteInspectionRecord'

const emptyData = (): SiteInspectionData => ({
  hostAgency: '',
  projectName: '',
  inspectionSubject: '',
  inspectionDate: '',
  inspectionPeriod: '上午',
  inspectionTime: '',
  location: '',
  chairperson: '',
  recorder: '',
  handlingReason: '',
  suggestionSummary: '',
  inspectionOpinions: '',
  inspectionConclusion: '',
  attendeeRows: [],
})

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const recordId = computed(() => Number(route.params.recordId))
const fixedFormCode = computed(() => String(route.meta.fixedFormCode ?? 'C04'))
const pageTitle = computed(() => `${fixedFormCode.value.replace(/^([CG])0/, '$1-')} 各項會勘紀錄`)
const perspectiveLabel = computed(() => fixedFormCode.value.startsWith('G') ? '營造' : '監造')
const listPath = computed(() =>
  fixedFormCode.value.startsWith('G')
    ? '/forms/g4-site-inspection-record'
    : '/forms/c4-site-inspection-record',
)
const breadcrumbs = computed(() => [
  { text: perspectiveLabel.value === '營造' ? '營造 G 類表單' : '監造 C 類表單', href: 'javascript:;' },
  { text: pageTitle.value, href: listPath.value },
  { text: form.title || '會勘紀錄編輯', active: true as const },
])
const sections = [
  { key: 'basic', label: '基本資料', icon: 'fa fa-building' },
  { key: 'attendees', label: '會勘人員', icon: 'fa fa-users' },
  { key: 'content', label: '原因與結論', icon: 'fa fa-clipboard-list' },
  { key: 'photos', label: '會勘照片', icon: 'fa fa-camera' },
] as const
const contentFields = [
  { key: 'handlingReason', label: '辦理會勘原因', icon: 'fa fa-circle-question' },
  { key: 'suggestionSummary', label: '建議內容概述', icon: 'fa fa-lightbulb' },
  { key: 'inspectionOpinions', label: '會勘意見', icon: 'fa fa-comments' },
  { key: 'inspectionConclusion', label: '會勘結論', icon: 'fa fa-circle-check' },
] as const
const activeSection = ref<(typeof sections)[number]['key']>('basic')
const form = reactive({ title: '', inspectionData: emptyData() })
const photos = ref<SiteInspectionPhoto[]>([])
const photoInput = ref<HTMLInputElement | null>(null)
const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const exporting = ref(false)
const showSubmissionModal = ref(false)

async function load() {
  if (!constructionId.value || !recordId.value) return
  loading.value = true
  try {
    const [record, loadedPhotos] = await Promise.all([
      getSiteInspection(constructionId.value, recordId.value),
      listSiteInspectionPhotos(constructionId.value, recordId.value),
    ])
    form.title = record.title
    form.inspectionData = { ...emptyData(), ...record.inspectionData }
    photos.value = loadedPhotos
  } catch (error) {
    console.error('[SiteInspection] load failed', error)
    toastService.error('載入各項會勘紀錄失敗')
  } finally {
    loading.value = false
  }
}

function addAttendee() {
  form.inspectionData.attendeeRows.push({
    unitName: '',
    jobTitle: '',
    signerName: '',
    contactPhone: '',
  })
}

function removeAttendee(index: number) {
  form.inspectionData.attendeeRows.splice(index, 1)
}

async function save(): Promise<boolean> {
  if (!constructionId.value || !recordId.value || saving.value) return false
  saving.value = true
  try {
    const saved = await updateSiteInspection(constructionId.value, recordId.value, {
      title: form.title,
      inspectionData: form.inspectionData,
    })
    await Promise.all(
      photos.value.map((photo, index) =>
        updateSiteInspectionPhoto(constructionId.value, recordId.value, photo.id, {
          capturedAt: photo.capturedAt,
          caption: photo.caption,
          displayOrder: index,
        }),
      ),
    )
    form.title = saved.title
    toastService.success('各項會勘紀錄已儲存')
    return true
  } catch (error) {
    console.error('[SiteInspection] save failed', error)
    toastService.error('儲存各項會勘紀錄失敗')
    return false
  } finally {
    saving.value = false
  }
}

async function onPhotoFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = Array.from(input.files ?? []).slice(0, Math.max(0, 2 - photos.value.length))
  input.value = ''
  if (!selected.length || uploading.value) return
  uploading.value = true
  try {
    photos.value = await uploadSiteInspectionPhotos(
      constructionId.value,
      recordId.value,
      selected,
    )
    toastService.success('會勘照片已上傳並同步至檔案總管')
  } catch (error) {
    console.error('[SiteInspection] photo upload failed', error)
    toastService.error('上傳會勘照片失敗')
  } finally {
    uploading.value = false
  }
}

async function removePhoto(photo: SiteInspectionPhoto) {
  if (!window.confirm(`確定刪除「${photo.fileName}」？`)) return
  try {
    await deleteSiteInspectionPhoto(constructionId.value, recordId.value, photo.id)
    photos.value = photos.value.filter((item) => item.id !== photo.id)
  } catch (error) {
    console.error('[SiteInspection] photo delete failed', error)
    toastService.error('刪除會勘照片失敗')
  }
}

async function exportWord() {
  if (exporting.value) return
  exporting.value = true
  try {
    if (!(await save())) return
    const blob = await exportSiteInspection(constructionId.value, recordId.value)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${form.title.replace(/[\\/:*?"<>|]+/g, '_') || 'Site_Inspection_Record'}.docx`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('[SiteInspection] export failed', error)
    toastService.error('匯出 Word 失敗')
  } finally {
    exporting.value = false
  }
}

function goBack() {
  void router.push(listPath.value)
}

onMounted(async () => {
  if (!workspaceStore.currentWorkspace) await workspaceStore.initWorkspaces()
  await load()
})
</script>

<style scoped>
.inspection-editor-page {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1100px 560px at 12% 0%, rgba(var(--bs-primary-rgb), 0.07), transparent 62%),
    rgba(15, 23, 42, 0.1);
}
.editor-loading { display: grid; min-height: 360px; place-items: center; color: var(--bs-secondary-color); }
.inspection-shell,
.section-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.9));
  border: 1px solid var(--bs-border-color-translucent);
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.2);
}
.inspection-shell :deep(.card-body) { background: transparent; }
.editor-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.section-nav {
  display: flex;
  gap: 0.5rem;
  padding: 0.55rem;
  overflow-x: auto;
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.65rem;
  background: #111827;
}
.section-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.9rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  background: transparent;
}
.section-tab:hover,
.section-tab.active { color: #fff; border-color: rgba(var(--bs-primary-rgb), 0.45); background: rgba(var(--bs-primary-rgb), 0.18); }
.section-stack { display: grid; gap: 1rem; }
.section-card { overflow: hidden; border-radius: 0.65rem; }
.section-card > header {
  padding: 0.85rem 1rem;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(15, 23, 42, 0.62);
}
.section-body { padding: 1.25rem; }
.inspection-table {
  min-width: 880px;
  margin-bottom: 0.8rem;
  color: var(--bs-body-color);
  --bs-table-bg: transparent;
  --bs-table-border-color: rgba(255, 255, 255, 0.1);
}
.inspection-table thead th { color: #cbd5e1; background: rgba(2, 6, 23, 0.55); }
.inspection-table .form-control {
  color: #f8fafc;
  background: rgba(2, 6, 23, 0.68);
  border-color: rgba(255, 255, 255, 0.14);
}
.index-col { width: 54px; text-align: center; }
.action-col { width: 54px; }
.photo-card {
  height: 100%;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 0.65rem;
  background: rgba(2, 6, 23, 0.45);
}
.photo-card img {
  width: 100%;
  height: 280px;
  object-fit: contain;
  border-radius: 0.45rem;
  background: #0b1220;
}
.photo-meta { display: flex; justify-content: space-between; gap: 1rem; margin-top: 0.8rem; }
.photo-empty {
  padding: 3rem 1rem;
  color: var(--bs-secondary-color);
  text-align: center;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: 0.65rem;
}
@media (max-width: 767px) {
  .inspection-editor-page { padding: 0.65rem; }
  .section-body { padding: 1rem; }
  .photo-card img { height: 220px; }
}
</style>
