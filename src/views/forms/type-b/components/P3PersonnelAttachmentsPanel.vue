<template>
  <div class="col-12 d-flex">
    <div class="text-panel flex-fill mb-0 w-100">
      <div class="text-panel__header">
        <div class="text-panel__label">
          <i class="fa fa-id-card me-2 text-primary"></i>
          工程相關人員附件
        </div>
        <div class="text-panel__toolbar small text-muted">
          初次載入會帶入預設子項目；可自行新增、刪除、修改子標題，各項可上傳多張圖片
        </div>
      </div>
      <div class="text-panel__body">
        <div class="row g-3">
          <div class="col-12 col-xl-6">
            <div class="cm-attach-topic">
              <div class="cm-attach-topic__head">
                <div class="cm-attach-topic__title">工程相關人員證書</div>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="addPersonnelSubTopic('CERTIFICATE')"
                >
                  <i class="fa fa-plus me-1"></i>新增子項目
                </button>
              </div>

              <div v-for="t in personnelAttachments.certificate" :key="t.id" class="cm-attach-subtopic">
                <div class="cm-attach-subtopic__row">
                  <input
                    v-model="t.title"
                    type="text"
                    class="form-control form-control-sm cm-attach-subtopic__title-input"
                    placeholder="子標題"
                    @input="debouncedPersonnelAttachmentsSync"
                    @blur="syncPersonnelAttachmentsJson"
                  />
                  <div class="cm-attach-subtopic__actions">
                    <label class="btn btn-sm btn-outline-secondary mb-0">
                      <i class="fa fa-image me-1"></i>上傳圖片
                      <input
                        type="file"
                        class="d-none"
                        accept="image/*"
                        multiple
                        @change="onPersonnelFilesPicked('CERTIFICATE', t.id, $event)"
                      />
                    </label>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      title="刪除此子項目"
                      @click="removePersonnelSubTopic('CERTIFICATE', t.id)"
                    >
                      <i class="fa fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div v-if="t.images.length > 0" class="cm-attach-images">
                  <div v-for="img in t.images" :key="img.objectName" class="cm-attach-img">
                    <CmAttachImageThumb
                      :img="img"
                      :loading="personnelPreviewLoading.has(img.objectName)"
                      :failed="personnelPreviewFailed.has(img.objectName)"
                      :fetch-blob="() => fetchP3PersonnelImageBlob(img)"
                      :ensure-preview="() => ensurePersonnelImagePreview(img.objectName, img)"
                    />
                    <button
                      type="button"
                      class="btn btn-sm btn-danger cm-attach-img__remove"
                      title="刪除圖片"
                      @click="removePersonnelImage('CERTIFICATE', t.id, img.objectName)"
                    >
                      <i class="fa fa-xmark"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-xl-6">
            <div class="cm-attach-topic">
              <div class="cm-attach-topic__head">
                <div class="cm-attach-topic__title">工程相關人員勞保證明</div>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="addPersonnelSubTopic('LABOR_INSURANCE')"
                >
                  <i class="fa fa-plus me-1"></i>新增子項目
                </button>
              </div>

              <div v-for="t in personnelAttachments.laborInsurance" :key="t.id" class="cm-attach-subtopic">
                <div class="cm-attach-subtopic__row">
                  <input
                    v-model="t.title"
                    type="text"
                    class="form-control form-control-sm cm-attach-subtopic__title-input"
                    placeholder="子標題"
                    @input="debouncedPersonnelAttachmentsSync"
                    @blur="syncPersonnelAttachmentsJson"
                  />
                  <div class="cm-attach-subtopic__actions">
                    <label class="btn btn-sm btn-outline-secondary mb-0">
                      <i class="fa fa-image me-1"></i>上傳圖片
                      <input
                        type="file"
                        class="d-none"
                        accept="image/*"
                        multiple
                        @change="onPersonnelFilesPicked('LABOR_INSURANCE', t.id, $event)"
                      />
                    </label>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      title="刪除此子項目"
                      @click="removePersonnelSubTopic('LABOR_INSURANCE', t.id)"
                    >
                      <i class="fa fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div v-if="t.images.length > 0" class="cm-attach-images">
                  <div v-for="img in t.images" :key="img.objectName" class="cm-attach-img">
                    <CmAttachImageThumb
                      :img="img"
                      :loading="personnelPreviewLoading.has(img.objectName)"
                      :failed="personnelPreviewFailed.has(img.objectName)"
                      :fetch-blob="() => fetchP3PersonnelImageBlob(img)"
                      :ensure-preview="() => ensurePersonnelImagePreview(img.objectName, img)"
                    />
                    <button
                      type="button"
                      class="btn btn-sm btn-danger cm-attach-img__remove"
                      title="刪除圖片"
                      @click="removePersonnelImage('LABOR_INSURANCE', t.id, img.objectName)"
                    >
                      <i class="fa fa-xmark"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { debounce } from 'lodash'
import CmAttachImageThumb from '@/components/common/CmAttachImageThumb.vue'
import {
  deleteP3PersonnelAttachmentImage,
  downloadP3PersonnelAttachmentBlob,
  getP3PersonnelAttachmentSignedUrl,
  type P3PersonnelAttachmentMainTopic,
  uploadP3PersonnelAttachmentImage,
} from '@/api/construction'

type P3AttachmentImage = {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}
type P3AttachmentSubTopic = { id: string; title: string; images: P3AttachmentImage[] }
type P3PersonnelAttachments = { certificate: P3AttachmentSubTopic[]; laborInsurance: P3AttachmentSubTopic[] }

const props = defineProps<{
  attachmentsJson: string
  constructionId?: string
  designChangeId?: number | null
}>()

const emit = defineEmits<{
  'update:attachmentsJson': [value: string]
  dirty: []
}>()

const PERSONNEL_DEFAULT_CERT_IDS = {
  SITE_DIRECTOR: 'p3_personnel_cert_site_director',
  QUALITY: 'p3_personnel_cert_quality',
  LABOR_SAFETY: 'p3_personnel_cert_labor_safety',
} as const
const PERSONNEL_DEFAULT_LABOR_ID = 'p3_personnel_labor_insurance_doc'

const PERSONNEL_DEFAULT_CERTIFICATE_TITLES: Record<string, string> = {
  [PERSONNEL_DEFAULT_CERT_IDS.SITE_DIRECTOR]: '工地主任證書',
  [PERSONNEL_DEFAULT_CERT_IDS.QUALITY]: '品管人員證書',
  [PERSONNEL_DEFAULT_CERT_IDS.LABOR_SAFETY]: '勞安人員證書',
}
const PERSONNEL_DEFAULT_LABOR_TITLE = '勞保證書'

function defaultPersonnelStructure(): P3PersonnelAttachments {
  return {
    certificate: [
      { id: PERSONNEL_DEFAULT_CERT_IDS.SITE_DIRECTOR, title: PERSONNEL_DEFAULT_CERTIFICATE_TITLES[PERSONNEL_DEFAULT_CERT_IDS.SITE_DIRECTOR], images: [] },
      { id: PERSONNEL_DEFAULT_CERT_IDS.QUALITY, title: PERSONNEL_DEFAULT_CERTIFICATE_TITLES[PERSONNEL_DEFAULT_CERT_IDS.QUALITY], images: [] },
      { id: PERSONNEL_DEFAULT_CERT_IDS.LABOR_SAFETY, title: PERSONNEL_DEFAULT_CERTIFICATE_TITLES[PERSONNEL_DEFAULT_CERT_IDS.LABOR_SAFETY], images: [] },
    ],
    laborInsurance: [{ id: PERSONNEL_DEFAULT_LABOR_ID, title: PERSONNEL_DEFAULT_LABOR_TITLE, images: [] }],
  }
}

function mergePersonnelWithDefaults(parsed: P3PersonnelAttachments): P3PersonnelAttachments {
  const defs = defaultPersonnelStructure()

  function mergeSide(side: 'certificate' | 'laborInsurance', defaults: P3AttachmentSubTopic[]): P3AttachmentSubTopic[] {
    const incoming = [...parsed[side]]
    const result: P3AttachmentSubTopic[] = []

    for (const d of defaults) {
      const byId = incoming.find(t => t.id === d.id)
      const byTitle =
        !byId && d.title
          ? incoming.find(t => String(t.title || '').trim() === d.title)
          : undefined
      const pick = byId || byTitle
      if (pick) {
        result.push({
          id: d.id,
          title: String(pick.title || '').trim() || d.title,
          images: pick.images.map(i => ({ ...i })),
        })
        const idx = incoming.indexOf(pick)
        if (idx >= 0) incoming.splice(idx, 1)
      }
    }

    for (const extra of incoming) {
      if (result.some(r => r.id === extra.id)) continue
      result.push(extra)
    }
    return result
  }

  return {
    certificate: mergeSide('certificate', defs.certificate),
    laborInsurance: mergeSide('laborInsurance', defs.laborInsurance),
  }
}

const personnelAttachments = ref<P3PersonnelAttachments>({ certificate: [], laborInsurance: [] })
let personnelBlobUrls: string[] = []
const personnelPreviewLoading = ref<Set<string>>(new Set())
const personnelPreviewFailed = ref<Set<string>>(new Set())

function revokePersonnelBlobUrls() {
  for (const url of personnelBlobUrls) {
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }
  personnelBlobUrls = []
}

function newId(): string {
  try {
    const g: any = globalThis as any
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID()
  } catch { /* ignore */ }
  return `t_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function parsePersonnelAttachmentsJson(raw: string): P3PersonnelAttachments {
  const s = String(raw || '').trim()
  if (!s) return defaultPersonnelStructure()
  try {
    const parsed = JSON.parse(s)
    const cert = Array.isArray(parsed?.certificate) ? parsed.certificate : []
    const labor = Array.isArray(parsed?.laborInsurance) ? parsed.laborInsurance : []
    const normTopic = (t: any): P3AttachmentSubTopic => ({
      id: String(t?.id || newId()),
      title: String(t?.title || ''),
      images: Array.isArray(t?.images)
        ? t.images.map((i: any) => ({
          objectName: String(i?.objectName || ''),
          signedUrl: typeof i?.signedUrl === 'string' ? i.signedUrl : null,
          fileName: typeof i?.fileName === 'string' ? i.fileName : null,
          contentType: typeof i?.contentType === 'string' ? i.contentType : null,
          fileSize: typeof i?.fileSize === 'number' ? i.fileSize : null,
        })).filter((i: any) => i.objectName)
        : [],
    })
    return {
      certificate: cert.map(normTopic),
      laborInsurance: labor.map(normTopic),
    }
  } catch {
    return defaultPersonnelStructure()
  }
}

function loadFromJson(raw: string) {
  revokePersonnelBlobUrls()
  personnelPreviewLoading.value = new Set()
  personnelPreviewFailed.value = new Set()
  const parsed = parsePersonnelAttachmentsJson(raw)
  personnelAttachments.value = mergePersonnelWithDefaults(parsed)
  syncPersonnelAttachmentsJson(false)
  void ensurePersonnelAttachmentSignedUrls()
}

function syncPersonnelAttachmentsJson(emitDirty = true) {
  const payload: P3PersonnelAttachments = {
    certificate: personnelAttachments.value.certificate.map(t => ({
      id: t.id,
      title: t.title,
      images: t.images.map(i => ({
        objectName: i.objectName,
        fileName: i.fileName ?? null,
        contentType: i.contentType ?? null,
        fileSize: i.fileSize ?? null,
      })),
    })),
    laborInsurance: personnelAttachments.value.laborInsurance.map(t => ({
      id: t.id,
      title: t.title,
      images: t.images.map(i => ({
        objectName: i.objectName,
        fileName: i.fileName ?? null,
        contentType: i.contentType ?? null,
        fileSize: i.fileSize ?? null,
      })),
    })),
  }
  emit('update:attachmentsJson', JSON.stringify(payload))
  if (emitDirty) emit('dirty')
}

const debouncedPersonnelAttachmentsSync = debounce(() => {
  syncPersonnelAttachmentsJson()
}, 500)

function fetchP3PersonnelImageBlob(img: P3AttachmentImage): Promise<Blob> {
  const cid = props.constructionId
  const on = String(img.objectName || '').trim()
  if (!cid || !on) return Promise.reject(new Error('缺少工程案或檔案識別'))
  return downloadP3PersonnelAttachmentBlob(cid, on)
}

async function ensurePersonnelImagePreview(objectName: string, target: P3AttachmentImage) {
  const cid = props.constructionId
  const on = String(objectName || '').trim()
  if (!cid || !on) return
  if (target.signedUrl) return

  personnelPreviewFailed.value.delete(on)
  personnelPreviewLoading.value.add(on)
  personnelPreviewLoading.value = new Set(personnelPreviewLoading.value)
  try {
    try {
      const { signedUrl } = await getP3PersonnelAttachmentSignedUrl(cid, on)
      if (signedUrl) {
        target.signedUrl = signedUrl
        return
      }
    } catch { /* ignore */ }

    const blob = await downloadP3PersonnelAttachmentBlob(cid, on)
    if (blob instanceof Blob && blob.size > 0) {
      const url = URL.createObjectURL(blob)
      personnelBlobUrls.push(url)
      target.signedUrl = url
      return
    }

    personnelPreviewFailed.value.add(on)
    personnelPreviewFailed.value = new Set(personnelPreviewFailed.value)
  } catch {
    personnelPreviewFailed.value.add(on)
    personnelPreviewFailed.value = new Set(personnelPreviewFailed.value)
  } finally {
    personnelPreviewLoading.value.delete(on)
    personnelPreviewLoading.value = new Set(personnelPreviewLoading.value)
  }
}

function addPersonnelSubTopic(main: P3PersonnelAttachmentMainTopic) {
  const row: P3AttachmentSubTopic = { id: newId(), title: '', images: [] }
  if (main === 'CERTIFICATE') {
    personnelAttachments.value.certificate = [...personnelAttachments.value.certificate, row]
  } else {
    personnelAttachments.value.laborInsurance = [...personnelAttachments.value.laborInsurance, row]
  }
  syncPersonnelAttachmentsJson()
}

async function removePersonnelSubTopic(main: P3PersonnelAttachmentMainTopic, subTopicId: string) {
  const cid = props.constructionId
  if (!cid) return
  const list = main === 'CERTIFICATE' ? personnelAttachments.value.certificate : personnelAttachments.value.laborInsurance
  const row = list.find(t => t.id === subTopicId)
  if (!row) return
  const ok = window.confirm('確定刪除此子項目？已上傳的圖片也會從伺服器移除。')
  if (!ok) return

  for (const img of row.images) {
    try {
      await deleteP3PersonnelAttachmentImage(cid, img.objectName)
    } catch { /* ignore */ }
  }
  const next = list.filter(t => t.id !== subTopicId)
  if (main === 'CERTIFICATE') personnelAttachments.value.certificate = next
  else personnelAttachments.value.laborInsurance = next
  syncPersonnelAttachmentsJson()
  void ensurePersonnelAttachmentSignedUrls()
}

async function onPersonnelFilesPicked(main: P3PersonnelAttachmentMainTopic, subTopicId: string, ev: Event) {
  const cid = props.constructionId
  if (!cid) return
  const input = ev.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  if (files.length === 0) return

  const list = main === 'CERTIFICATE' ? personnelAttachments.value.certificate : personnelAttachments.value.laborInsurance
  const idx = list.findIndex(t => t.id === subTopicId)
  if (idx < 0) return

  for (const f of files) {
    try {
      const uploaded = await uploadP3PersonnelAttachmentImage(cid, props.designChangeId, main, subTopicId, f)
      const img: P3AttachmentImage = {
        objectName: uploaded.objectName,
        signedUrl: uploaded.signedUrl ?? null,
        fileName: uploaded.fileName ?? f.name,
        contentType: uploaded.contentType ?? f.type,
        fileSize: uploaded.fileSize ?? f.size,
      }
      list[idx].images = [...list[idx].images, img]
      void ensurePersonnelImagePreview(img.objectName, img)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? '上傳失敗'
      window.alert(msg)
      break
    }
  }

  if (main === 'CERTIFICATE') personnelAttachments.value.certificate = [...list]
  else personnelAttachments.value.laborInsurance = [...list]
  syncPersonnelAttachmentsJson()
}

async function removePersonnelImage(main: P3PersonnelAttachmentMainTopic, subTopicId: string, objectName: string) {
  const cid = props.constructionId
  if (!cid) return
  const list = main === 'CERTIFICATE' ? personnelAttachments.value.certificate : personnelAttachments.value.laborInsurance
  const idx = list.findIndex(t => t.id === subTopicId)
  if (idx < 0) return

  list[idx].images = list[idx].images.filter(i => i.objectName !== objectName)
  if (main === 'CERTIFICATE') personnelAttachments.value.certificate = [...list]
  else personnelAttachments.value.laborInsurance = [...list]
  syncPersonnelAttachmentsJson()
  void deleteP3PersonnelAttachmentImage(cid, objectName).catch(() => {})
}

async function ensurePersonnelAttachmentSignedUrls() {
  const cid = props.constructionId
  if (!cid) return
  const allTopics = [...personnelAttachments.value.certificate, ...personnelAttachments.value.laborInsurance]
  const need: P3AttachmentImage[] = []
  for (const t of allTopics) {
    for (const img of t.images) {
      if (!img.signedUrl && img.objectName) need.push(img)
    }
  }
  revokePersonnelBlobUrls()
  for (const img of need.slice(0, 80)) {
    void ensurePersonnelImagePreview(img.objectName, img)
  }
}

watch(
  () => props.attachmentsJson,
  (raw, prev) => {
    if (raw === prev && personnelAttachments.value.certificate.length > 0) return
    loadFromJson(raw)
  },
  { immediate: true },
)

watch(
  () => props.constructionId,
  () => {
    revokePersonnelBlobUrls()
    void ensurePersonnelAttachmentSignedUrls()
  },
)

onUnmounted(() => {
  revokePersonnelBlobUrls()
  debouncedPersonnelAttachmentsSync.cancel()
})
</script>

<style scoped>
.cm-attach-topic {
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 10px;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
}
.cm-attach-topic__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.cm-attach-topic__title {
  font-weight: 700;
}
.cm-attach-subtopic {
  border-top: 1px dashed rgba(255, 255, 255, 0.16);
  padding-top: 0.75rem;
  margin-top: 0.75rem;
}
.cm-attach-subtopic__row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
}
.cm-attach-subtopic__title-input {
  flex: 1 1 auto;
  min-width: 0;
}
.cm-attach-subtopic__actions {
  display: flex;
  gap: 0.5rem;
  flex: 0 0 auto;
}
.cm-attach-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.cm-attach-img {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.12);
  aspect-ratio: 4 / 3;
}
.cm-attach-img__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  line-height: 1;
}
</style>
