<template>
  <div class="form-p2-quality-plan-page">
    <PageHeader title="P-2 整體品質計劃" icon="fa fa-file-lines" :breadcrumbs="breadcrumbs">
      <template v-if="hasCurrentProject && isContractor" #extra>
        <DesignChangeVersionSwitcher
          :model-value="selectedDesignChangeId"
          :construction-id="currentProject?.id"
          source-type="CONTRACTOR"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!isContractor" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      「P-2 整體品質計劃」僅供營造端維護。
    </div>

    <Card v-else class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <!-- 先做截圖中這段工具列 UI（版型與 P-1 一致） -->
        <div class="b2-content-toolbar">
          <div class="p1-toolbar-left">
            <label class="p1-refdate-label" for="p2-data-reference-date">
              資料依據日
              <span
                class="p1-info-icon"
                data-tooltip="此日期用於匯出時的人員統計與內容判斷;預設會帶入目前版本的起始日。"
                tabindex="0"
                aria-label="資料依據日說明"
              >
                <i class="fa fa-circle-info"></i>
              </span>
            </label>
            <RepublicDatePicker
              id="p2-data-reference-date"
              v-model="dataReferenceDate"
              class="p1-refdate-picker"
              placeholder="請選擇資料依據日"
              value-format="YYYY-MM-DD"
              auto-apply
            />
          </div>

          <div class="p1-toolbar-right">
            <div v-if="selectedDesignChangeId != null" class="btn-group">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="自前一個變更設計版本複製 P-2 內容到目前版本"
              >
                <i class="fa fa-copy me-1"></i>
                複製前一個版本
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li>
                  <button type="button" class="dropdown-item text-danger" @click="copyFromPrevious">
                    覆寫目前版本（P-2）
                  </button>
                </li>
              </ul>
            </div>

            <button type="button" class="btn b2-export-btn" :disabled="isExporting" @click="exportWord">
              <i class="fa fa-file-word"></i>
              {{ isExporting ? '匯出中…' : '匯出 Word' }}
            </button>
          </div>
        </div>

        <div v-if="isTextLoading" class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入文字內容中…
        </div>
        <div v-else class="text-panels text-panels--ai-wrap">
          <div v-if="isAiGenerating" class="text-panels__ai-overlay" aria-live="polite">
            <div class="text-panels__ai-overlay-inner">
              <i class="fa fa-spinner fa-spin fa-2x mb-2 text-primary"></i>
              <div class="fw-semibold">AI 生成中…</div>
              <div class="small text-muted mt-1">產生內容後會自動儲存至目前版本</div>
            </div>
          </div>

          <div class="row g-3 align-items-stretch">
            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-ruler-combined me-2 text-warning"></i>
                    工程規模概述
                  </div>
                  <div class="text-panel__toolbar">
                    <button
                      v-if="isSuperAdmin"
                      type="button"
                      class="btn-ai-generate"
                      :disabled="isAiGenerating || !currentProject?.id"
                      @click="generateScaleOverviewByAi"
                    >
                      <i
                        class="fa me-2"
                        :class="aiLoading.scaleOverview ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'"
                      ></i>
                      {{ aiLoading.scaleOverview ? '生成中…' : '依標單 AI 生成' }}
                    </button>
                  </div>
                </div>
                <div class="text-panel__body">
                  <textarea
                    v-model="p2QualityScaleOverview"
                    class="form-control text-panel__textarea"
                    rows="7"
                    placeholder="請輸入工程規模概述（P-2 獨立欄位）"
                    @input="scheduleAutoSave"
                  />
                </div>
              </div>
            </div>

            <!-- 稽核計畫執行表（橫縱互換：月份往下長，利於匯出時動態往下擴展） -->
            <div class="col-12 d-flex">
              <div class="text-panel flex-fill mb-0 w-100">
                <div class="text-panel__header">
                  <div class="text-panel__label">
                    <i class="fa fa-clipboard-check me-2 text-info"></i>
                    稽核計畫執行表
                  </div>
                  <div class="text-panel__toolbar">
                    <div class="cm-audit-range small text-muted">
                      <div class="cm-audit-range__title">目前區間（依此自動產生年月）</div>
                      <div class="cm-audit-range__row">
                        <span class="cm-audit-range__k">開工日期</span>
                        <span class="cm-audit-range__v">{{ auditStartLabel }}</span>
                      </div>
                      <div class="cm-audit-range__row">
                        <span class="cm-audit-range__k">預計完工日期</span>
                        <span class="cm-audit-range__v">{{ auditEndLabel }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="text-panel__body">
                  <div v-if="auditMonthRows.length === 0" class="text-muted small py-2">
                    尚無工程起迄日可計算月份範圍。
                  </div>
                  <div v-else class="table-responsive">
                    <div class="cm-audit-legend small mb-2">
                      點一下切換是否「預定」：顯示 ◎
                    </div>
                    <table class="table table-bordered align-middle cm-audit-table mb-0">
                      <thead>
                        <tr>
                          <th rowspan="2" class="text-center" style="width: 92px;">年度</th>
                          <th rowspan="2" class="text-center" style="width: 76px;">月份</th>
                          <th colspan="2" class="text-center">工地品質人員／內部品質稽核</th>
                          <th rowspan="2" class="text-center">不定期稽核<br>（執行）</th>
                        </tr>
                        <tr>
                          <th class="text-center">預定</th>
                          <th class="text-center">執行</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in auditMonthRows" :key="row.key">
                          <td
                            v-if="row.showYear"
                            class="text-center"
                            :rowspan="row.yearRowSpan"
                          >
                            {{ row.rocYear }}
                          </td>
                          <td class="text-center">{{ row.month }}</td>
                          <td class="text-center">
                            <button
                              type="button"
                              class="btn btn-sm cm-audit-mark"
                              :class="{ 'cm-audit-mark--on': row.internalPlanned === 'PLANNED' }"
                              @click="toggleAuditPlanned(row.key, 'internalPlanned')"
                            >
                              {{ row.internalPlanned === 'PLANNED' ? '◎' : '' }}
                            </button>
                          </td>
                          <td class="text-center">
                            <button
                              type="button"
                              class="btn btn-sm cm-audit-mark"
                              :class="{ 'cm-audit-mark--on': row.internalExecuted === 'PLANNED' }"
                              @click="toggleAuditPlanned(row.key, 'internalExecuted')"
                            >
                              {{ row.internalExecuted === 'PLANNED' ? '◎' : '' }}
                            </button>
                          </td>
                          <td class="text-center">
                            <button
                              type="button"
                              class="btn btn-sm cm-audit-mark"
                              :class="{ 'cm-audit-mark--on': row.adhocExecuted === 'PLANNED' }"
                              @click="toggleAuditPlanned(row.key, 'adhocExecuted')"
                            >
                              {{ row.adhocExecuted === 'PLANNED' ? '◎' : '' }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- 工程相關人員附件：證書／勞保證明（可自訂子主題、多張圖片） -->
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
                              type="text"
                              class="form-control form-control-sm cm-attach-subtopic__title-input"
                              v-model="t.title"
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
                              <a
                                v-if="img.signedUrl"
                                class="cm-attach-img__link"
                                :href="img.signedUrl"
                                target="_blank"
                                rel="noopener"
                                title="開新視窗預覽"
                              >
                                <img class="cm-attach-img__thumb" :src="img.signedUrl" alt="附件圖片" />
                              </a>
                              <div v-else class="cm-attach-img__placeholder text-muted small">
                                <span v-if="personnelPreviewLoading.has(img.objectName)">載入中…</span>
                                <span v-else-if="personnelPreviewFailed.has(img.objectName)">無法預覽</span>
                                <span v-else>載入中…</span>
                              </div>
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
                              type="text"
                              class="form-control form-control-sm cm-attach-subtopic__title-input"
                              v-model="t.title"
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
                              <a
                                v-if="img.signedUrl"
                                class="cm-attach-img__link"
                                :href="img.signedUrl"
                                target="_blank"
                                rel="noopener"
                                title="開新視窗預覽"
                              >
                                <img class="cm-attach-img__thumb" :src="img.signedUrl" alt="附件圖片" />
                              </a>
                              <div v-else class="cm-attach-img__placeholder text-muted small">
                                <span v-if="personnelPreviewLoading.has(img.objectName)">載入中…</span>
                                <span v-else-if="personnelPreviewFailed.has(img.objectName)">無法預覽</span>
                                <span v-else>載入中…</span>
                              </div>
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
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- 隱藏：P-2 匯出前補上傳施工要領流程圖 PNG -->
    <div class="p2-flow-export-host" aria-hidden="true">
      <FlowGraphSyncfusionView ref="flowExportRef" :flow-json="flowExportJson" :height="'520px'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { debounce } from 'lodash'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useExportLoading } from '@/composables/useExportLoading'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import FlowGraphSyncfusionView from '@/components/diagram/FlowGraphSyncfusionView.vue'
import { formPApi, downloadBlobAsFile, type ExportConstructionReportRequest } from '@/api/forms'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
import {
  calculateEndDate,
  deleteP2PersonnelAttachmentImage,
  downloadP2PersonnelAttachmentBlob,
  getConstructionDetail,
  getP1TextAiGenerate,
  getP2PersonnelAttachmentSignedUrl,
  type P2PersonnelAttachmentMainTopic,
  uploadP2PersonnelAttachmentImage,
  updateConstruction
} from '@/api/construction'
import {
  getSubdivisionWorkItemGuide,
  listSubdivisionWorkItems,
  uploadSubdivisionWorkItemGuideFlowImage
} from '@/api/subdivisionWorkItems'

const workspaceStore = useWorkspaceStore()
const { isContractor, isSuperAdmin } = useViewPerspective()
const { runWithExportLoading } = useExportLoading()

const currentProject = computed(() => workspaceStore.currentProject)
const hasCurrentProject = computed(() => !!currentProject.value?.id)

const selectedDesignChangeId = ref<number | null>(null)
const dataReferenceDate = ref('')
const isExporting = ref(false)
const isEnsuringFlowImages = ref(false)

const isTextLoading = ref(false)
const isAiGenerating = ref(false)
const aiLoading = ref({ scaleOverview: false })

const p2QualityScaleOverview = ref('')
const p2AuditPlanJson = ref('')
const p2PersonnelAttachmentsJson = ref('')

type P2AttachmentImage = { objectName: string; signedUrl?: string | null; fileName?: string | null; contentType?: string | null; fileSize?: number | null }
type P2AttachmentSubTopic = { id: string; title: string; images: P2AttachmentImage[] }
type P2PersonnelAttachments = { certificate: P2AttachmentSubTopic[]; laborInsurance: P2AttachmentSubTopic[] }

/** 預設子項目（穩定 id，供上傳路徑與 DB JSON 對應） */
const PERSONNEL_DEFAULT_CERT_IDS = {
  SITE_DIRECTOR: 'p2_personnel_cert_site_director',
  QUALITY: 'p2_personnel_cert_quality',
  LABOR_SAFETY: 'p2_personnel_cert_labor_safety',
} as const
const PERSONNEL_DEFAULT_LABOR_ID = 'p2_personnel_labor_insurance_doc'

const PERSONNEL_DEFAULT_CERTIFICATE_TITLES: Record<string, string> = {
  [PERSONNEL_DEFAULT_CERT_IDS.SITE_DIRECTOR]: '工地主任證書',
  [PERSONNEL_DEFAULT_CERT_IDS.QUALITY]: '品管人員證書',
  [PERSONNEL_DEFAULT_CERT_IDS.LABOR_SAFETY]: '勞安人員證書',
}
const PERSONNEL_DEFAULT_LABOR_TITLE = '勞保證書'

function defaultPersonnelStructure(): P2PersonnelAttachments {
  return {
    certificate: [
      { id: PERSONNEL_DEFAULT_CERT_IDS.SITE_DIRECTOR, title: PERSONNEL_DEFAULT_CERTIFICATE_TITLES[PERSONNEL_DEFAULT_CERT_IDS.SITE_DIRECTOR], images: [] },
      { id: PERSONNEL_DEFAULT_CERT_IDS.QUALITY, title: PERSONNEL_DEFAULT_CERTIFICATE_TITLES[PERSONNEL_DEFAULT_CERT_IDS.QUALITY], images: [] },
      { id: PERSONNEL_DEFAULT_CERT_IDS.LABOR_SAFETY, title: PERSONNEL_DEFAULT_CERTIFICATE_TITLES[PERSONNEL_DEFAULT_CERT_IDS.LABOR_SAFETY], images: [] },
    ],
    laborInsurance: [{ id: PERSONNEL_DEFAULT_LABOR_ID, title: PERSONNEL_DEFAULT_LABOR_TITLE, images: [] }],
  }
}

function mergePersonnelWithDefaults(parsed: P2PersonnelAttachments): P2PersonnelAttachments {
  const defs = defaultPersonnelStructure()

  function mergeSide(side: 'certificate' | 'laborInsurance', defaults: P2AttachmentSubTopic[]): P2AttachmentSubTopic[] {
    const incoming = [...parsed[side]]
    const result: P2AttachmentSubTopic[] = []

    for (const d of defaults) {
      const byId = incoming.find(t => t.id === d.id)
      const byTitle =
        !byId && d.title
          ? incoming.find(t => String(t.title || '').trim() === d.title)
          : undefined
      const pick = byId || byTitle
      if (pick) {
        const title = String(pick.title || '').trim() || d.title
        result.push({
          id: d.id,
          title,
          images: pick.images.map(i => ({ ...i })),
        })
        // remove consumed from pool (avoid duplicate merge)
        const idx = incoming.indexOf(pick)
        if (idx >= 0) incoming.splice(idx, 1)
      }
      // 未出現在舊 JSON 的預設列不強制補上（表示使用者已刪除，或從非空舊資料遷移）
    }

    // 保留使用者自訂的額外子項目（舊資料相容）
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

const personnelAttachments = ref<P2PersonnelAttachments>({ certificate: [], laborInsurance: [] })
let personnelBlobUrls: string[] = []
const personnelPreviewLoading = ref<Set<string>>(new Set())
const personnelPreviewFailed = ref<Set<string>>(new Set())

function revokePersonnelBlobUrls() {
  for (const url of personnelBlobUrls) {
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }
  personnelBlobUrls = []
}

async function ensurePersonnelImagePreview(objectName: string, target: P2AttachmentImage) {
  const cid = currentProject.value?.id
  const on = String(objectName || '').trim()
  if (!cid || !on) return
  if (target.signedUrl) return

  personnelPreviewFailed.value.delete(on)
  personnelPreviewLoading.value.add(on)
  personnelPreviewLoading.value = new Set(personnelPreviewLoading.value)
  try {
    try {
      const { signedUrl } = await getP2PersonnelAttachmentSignedUrl(cid, on)
      if (signedUrl) {
        target.signedUrl = signedUrl
        return
      }
    } catch { /* ignore */ }

    const blob = await downloadP2PersonnelAttachmentBlob(cid, on)
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

function newId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID()
  } catch { /* ignore */ }
  return `t_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function parsePersonnelAttachmentsJson(raw: string): P2PersonnelAttachments {
  const s = String(raw || '').trim()
  if (!s) return defaultPersonnelStructure()
  try {
    const parsed = JSON.parse(s)
    const cert = Array.isArray(parsed?.certificate) ? parsed.certificate : []
    const labor = Array.isArray(parsed?.laborInsurance) ? parsed.laborInsurance : []
    const normTopic = (t: any): P2AttachmentSubTopic => ({
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
        : []
    })
    return {
      certificate: cert.map(normTopic),
      laborInsurance: labor.map(normTopic)
    }
  } catch {
    return defaultPersonnelStructure()
  }
}

function syncPersonnelAttachmentsJson() {
  const payload: P2PersonnelAttachments = {
    certificate: personnelAttachments.value.certificate.map(t => ({
      id: t.id,
      title: t.title,
      images: t.images.map(i => ({
        objectName: i.objectName,
        // signedUrl 為短效，不寫入 DB；但允許前端暫存於狀態
        fileName: i.fileName ?? null,
        contentType: i.contentType ?? null,
        fileSize: i.fileSize ?? null,
      }))
    })),
    laborInsurance: personnelAttachments.value.laborInsurance.map(t => ({
      id: t.id,
      title: t.title,
      images: t.images.map(i => ({
        objectName: i.objectName,
        fileName: i.fileName ?? null,
        contentType: i.contentType ?? null,
        fileSize: i.fileSize ?? null,
      }))
    })),
  }
  p2PersonnelAttachmentsJson.value = JSON.stringify(payload)
  scheduleAutoSave()
}

const debouncedPersonnelAttachmentsSync = debounce(() => {
  syncPersonnelAttachmentsJson()
}, 500)

function addPersonnelSubTopic(main: P2PersonnelAttachmentMainTopic) {
  const row: P2AttachmentSubTopic = { id: newId(), title: '', images: [] }
  if (main === 'CERTIFICATE') {
    personnelAttachments.value.certificate = [...personnelAttachments.value.certificate, row]
  } else {
    personnelAttachments.value.laborInsurance = [...personnelAttachments.value.laborInsurance, row]
  }
  syncPersonnelAttachmentsJson()
}

async function removePersonnelSubTopic(main: P2PersonnelAttachmentMainTopic, subTopicId: string) {
  const cid = currentProject.value?.id
  if (!cid) return
  const list = main === 'CERTIFICATE' ? personnelAttachments.value.certificate : personnelAttachments.value.laborInsurance
  const row = list.find(t => t.id === subTopicId)
  if (!row) return
  const ok = window.confirm('確定刪除此子項目？已上傳的圖片也會從伺服器移除。')
  if (!ok) return

  for (const img of row.images) {
    try {
      await deleteP2PersonnelAttachmentImage(cid, img.objectName)
    } catch {
      /* ignore */
    }
  }
  const next = list.filter(t => t.id !== subTopicId)
  if (main === 'CERTIFICATE') personnelAttachments.value.certificate = next
  else personnelAttachments.value.laborInsurance = next
  syncPersonnelAttachmentsJson()
  void ensurePersonnelAttachmentSignedUrls()
}

async function onPersonnelFilesPicked(main: P2PersonnelAttachmentMainTopic, subTopicId: string, ev: Event) {
  const cid = currentProject.value?.id
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
      const uploaded = await uploadP2PersonnelAttachmentImage(cid, selectedDesignChangeId.value, main, subTopicId, f)
      const img: P2AttachmentImage = {
        objectName: uploaded.objectName,
        signedUrl: uploaded.signedUrl ?? null,
        fileName: uploaded.fileName ?? f.name,
        contentType: uploaded.contentType ?? f.type,
        fileSize: uploaded.fileSize ?? f.size,
      }
      const t = list[idx]
      t.images = [...t.images, img]
      void ensurePersonnelImagePreview(img.objectName, img)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? '上傳失敗'
      window.alert(msg)
      break
    }
  }

  // 觸發 reactive 更新
  if (main === 'CERTIFICATE') personnelAttachments.value.certificate = [...list]
  else personnelAttachments.value.laborInsurance = [...list]
  syncPersonnelAttachmentsJson()
}

async function removePersonnelImage(main: P2PersonnelAttachmentMainTopic, subTopicId: string, objectName: string) {
  const cid = currentProject.value?.id
  if (!cid) return
  const list = main === 'CERTIFICATE' ? personnelAttachments.value.certificate : personnelAttachments.value.laborInsurance
  const idx = list.findIndex(t => t.id === subTopicId)
  if (idx < 0) return

  list[idx].images = list[idx].images.filter(i => i.objectName !== objectName)
  if (main === 'CERTIFICATE') personnelAttachments.value.certificate = [...list]
  else personnelAttachments.value.laborInsurance = [...list]
  syncPersonnelAttachmentsJson()

  // 刪檔不阻塞 UI
  void deleteP2PersonnelAttachmentImage(cid, objectName).catch(() => {})
}

async function ensurePersonnelAttachmentSignedUrls() {
  const cid = currentProject.value?.id
  if (!cid) return
  const allTopics = [...personnelAttachments.value.certificate, ...personnelAttachments.value.laborInsurance]
  const need: P2AttachmentImage[] = []
  for (const t of allTopics) {
    for (const img of t.images) {
      if (!img.signedUrl && img.objectName) need.push(img)
    }
  }
  // 先嘗試 signedUrl；失敗就改走帶 JWT 的 download 端點拉 blob 預覽（避免一直卡「載入中」）
  revokePersonnelBlobUrls()
  for (const img of need.slice(0, 80)) {
    void ensurePersonnelImagePreview(img.objectName, img)
  }
}

type AuditMarkState = '' | 'PLANNED' | 'DONE' | 'CLOSED'
type AuditMarkKey = 'internalPlanned' | 'internalExecuted' | 'adhocExecuted'
type AuditPlanRow = { key: string; internalPlanned?: AuditMarkState | boolean; internalExecuted?: AuditMarkState | boolean; adhocExecuted?: AuditMarkState | boolean }
const auditPlanByMonth = ref<Record<string, AuditPlanRow>>({})
const constructionStartIso = ref<string>('')
const constructionEndIso = ref<string>('')

function formatRocDate(isoYmd: string): string {
  const s = String(isoYmd || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return '—'
  const y = Number(m[1])
  const roc = y - 1911
  return `民國${roc}.${m[2]}.${m[3]}`
}

const auditStartLabel = computed(() => (constructionStartIso.value ? formatRocDate(constructionStartIso.value) : '—'))
const auditEndLabel = computed(() => (constructionEndIso.value ? formatRocDate(constructionEndIso.value) : '—'))

function toIsoDateOnly(input: any): string {
  const s = String(input ?? '').trim()
  if (!s) return ''
  // getConstructionDetail 回傳可能為 ISO datetime；只取 YYYY-MM-DD
  return s.length >= 10 ? s.slice(0, 10) : s
}

function parseYmd(s: string): Date | null {
  const t = String(s || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  const d = new Date(`${t}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function monthKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getTime())
  x.setMonth(x.getMonth() + n)
  return x
}

function buildMonthKeysInclusive(start: Date, end: Date): string[] {
  const s = new Date(start.getFullYear(), start.getMonth(), 1)
  const e = new Date(end.getFullYear(), end.getMonth(), 1)
  const keys: string[] = []
  let cur = s
  let guard = 0
  while (cur <= e && guard < 240) {
    keys.push(monthKey(cur))
    cur = addMonths(cur, 1)
    guard++
  }
  return keys
}

function rocYearFromAdYear(adYear: number): number {
  return adYear - 1911
}

function rebuildAuditPlanFromJson() {
  try {
    const raw = String(p2AuditPlanJson.value || '').trim()
    if (!raw) {
      auditPlanByMonth.value = {}
      return
    }
    const parsed = JSON.parse(raw)
    const norm = (v: any): AuditMarkState => {
      if (v === true) return 'DONE'
      if (v === false || v == null) return ''
      const s = String(v).trim().toUpperCase()
      if (s === 'PLANNED' || s === 'DONE' || s === 'CLOSED') return s as AuditMarkState
      return ''
    }
    if (Array.isArray(parsed)) {
      const map: Record<string, AuditPlanRow> = {}
      for (const it of parsed) {
        const key = String(it?.key || it?.monthKey || '').trim()
        if (!key) continue
        map[key] = {
          key,
          internalPlanned: norm(it.internalPlanned),
          internalExecuted: norm(it.internalExecuted),
          adhocExecuted: norm(it.adhocExecuted)
        }
      }
      auditPlanByMonth.value = map
      return
    }
    if (parsed && typeof parsed === 'object') {
      const map: Record<string, AuditPlanRow> = {}
      for (const [k, v] of Object.entries(parsed as any)) {
        const key = String((v as any)?.key || k).trim()
        if (!key) continue
        map[key] = {
          key,
          internalPlanned: norm((v as any).internalPlanned),
          internalExecuted: norm((v as any).internalExecuted),
          adhocExecuted: norm((v as any).adhocExecuted)
        }
      }
      auditPlanByMonth.value = map
      return
    }
    auditPlanByMonth.value = {}
  } catch {
    auditPlanByMonth.value = {}
  }
}

function syncAuditPlanJsonFromMap() {
  const rows = Object.values(auditPlanByMonth.value || {})
    .filter(r => r && r.key)
    .sort((a, b) => a.key.localeCompare(b.key))
  p2AuditPlanJson.value = JSON.stringify(rows)
}

const auditMonthRows = computed(() => {
  const s = parseYmd(constructionStartIso.value)
  const e = parseYmd(constructionEndIso.value)
  if (!s || !e) return []
  const keys = buildMonthKeysInclusive(s, e)
  const base = keys.map((k) => {
    const [yStr, mStr] = k.split('-')
    const y = Number(yStr)
    const m = Number(mStr)
    const saved = auditPlanByMonth.value[k] || { key: k }
    return {
      key: k,
      adYear: y,
      rocYear: rocYearFromAdYear(y),
      month: m,
      internalPlanned: (saved.internalPlanned as any) as AuditMarkState,
      internalExecuted: (saved.internalExecuted as any) as AuditMarkState,
      adhocExecuted: (saved.adhocExecuted as any) as AuditMarkState
    }
  })

  // 合併相同年度：第一列顯示年度並設定 rowspan，其餘列隱藏年度欄
  const counts: Record<number, number> = {}
  for (const r of base) counts[r.adYear] = (counts[r.adYear] || 0) + 1
  const seen = new Set<number>()
  return base.map((r) => {
    const first = !seen.has(r.adYear)
    if (first) seen.add(r.adYear)
    return {
      ...r,
      showYear: first,
      yearRowSpan: first ? (counts[r.adYear] || 1) : 0
    }
  })
})

function setAuditMark(monthKey: string, field: AuditMarkKey, value: AuditMarkState) {
  const next: AuditMarkState = value === 'PLANNED' || value === 'DONE' || value === 'CLOSED' ? value : ''
  const cur = auditPlanByMonth.value[monthKey] || { key: monthKey }
  auditPlanByMonth.value = { ...auditPlanByMonth.value, [monthKey]: { ...cur, [field]: next } }
  syncAuditPlanJsonFromMap()
  scheduleAutoSave()
}

function toggleAuditPlanned(monthKey: string, field: AuditMarkKey) {
  const cur = auditPlanByMonth.value[monthKey] || { key: monthKey }
  const isOn = String((cur as any)[field] || '').toUpperCase() === 'PLANNED'
  const next: AuditPlanRow = {
    key: monthKey,
    internalPlanned: (field === 'internalPlanned' ? (isOn ? '' : 'PLANNED') : (cur as any).internalPlanned) as any,
    internalExecuted: (field === 'internalExecuted' ? (isOn ? '' : 'PLANNED') : (cur as any).internalExecuted) as any,
    adhocExecuted: (field === 'adhocExecuted' ? (isOn ? '' : 'PLANNED') : (cur as any).adhocExecuted) as any,
  }
  auditPlanByMonth.value = { ...auditPlanByMonth.value, [monthKey]: next }
  syncAuditPlanJsonFromMap()
  scheduleAutoSave()
}

// P-2 匯出前：補齊「施工要領流程圖 PNG」上傳（避免匯出落回後端 renderer）
const flowExportRef = ref<InstanceType<typeof FlowGraphSyncfusionView> | null>(null)
const flowExportJson = ref<string>('')

async function ensureSubdivisionGuideFlowImagesUploaded() {
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value) return
  if (isEnsuringFlowImages.value) return
  isEnsuringFlowImages.value = true
  try {
    const subs = await listSubdivisionWorkItems(cid, selectedDesignChangeId.value)
    for (const sub of subs) {
      const guide = await getSubdivisionWorkItemGuide(sub.id, {
        constructionId: cid,
        designChangeId: selectedDesignChangeId.value
      })
      const flowJson = String(guide.flowGraphJson || '').trim()
      const hasObj = String(guide.flowGraphImageObjectName || '').trim().length > 0
      if (!flowJson || hasObj) continue

      flowExportJson.value = flowJson
      await nextTick()
      const ok = await flowExportRef.value?.waitUntilReady?.(4000)
      if (!ok) continue
      const blob = await flowExportRef.value?.exportPngBlob?.()
      if (!blob || blob.size <= 0) continue

      const file = new File([blob], `subdivision-guide-flow-${sub.id}.png`, { type: 'image/png' })
      await uploadSubdivisionWorkItemGuideFlowImage(sub.id, {
        constructionId: cid,
        designChangeId: selectedDesignChangeId.value,
        file
      })
    }
  } finally {
    isEnsuringFlowImages.value = false
  }
}

const breadcrumbs = [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: 'P類(計劃書)表單', href: 'javascript:;' },
  { text: 'P-2 整體品質計劃', active: true },
]

async function onVersionChange(versionId: number | null) {
  selectedDesignChangeId.value = versionId
  if (!dataReferenceDate.value) {
    dataReferenceDate.value = new Date().toISOString().slice(0, 10)
  }
  revokePersonnelBlobUrls()
  await loadTexts()
}

function copyFromPrevious() {
  window.alert('尚未實作：後續會依 P-1 行為加入「複製前一個版本」的 API 串接。')
}

async function loadTexts() {
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value) return

  isTextLoading.value = true
  try {
    const detail = await getConstructionDetail(cid, undefined, 'CONTRACTOR', selectedDesignChangeId.value)
    p2QualityScaleOverview.value = detail.p2QualityScaleOverview ?? ''
    p2AuditPlanJson.value = detail.p2AuditPlanJson ?? ''
    p2PersonnelAttachmentsJson.value = (detail as any).p2PersonnelAttachmentsJson ?? ''
    const parsed = parsePersonnelAttachmentsJson(p2PersonnelAttachmentsJson.value)
    personnelAttachments.value = mergePersonnelWithDefaults(parsed)
    syncPersonnelAttachmentsJson()
    rebuildAuditPlanFromJson()
    void ensurePersonnelAttachmentSignedUrls()

    constructionStartIso.value = toIsoDateOnly(detail.constructionStartDate)
    // 後端 contractor.constructionEndDate 會隨版本重算；若缺失則用試算補齊
    const endIso = toIsoDateOnly((detail as any).constructionEndDate)
    if (constructionStartIso.value && endIso) {
      constructionEndIso.value = endIso
    } else if (constructionStartIso.value && (detail as any).workDay) {
      const resp = await calculateEndDate(
        cid,
        constructionStartIso.value,
        Number((detail as any).workDay || 0),
        (detail as any).durationType as any,
        'CONTRACTOR'
      )
      constructionEndIso.value = toIsoDateOnly(resp.completionDate)
    }
    if (!dataReferenceDate.value) {
      dataReferenceDate.value = new Date().toISOString().slice(0, 10)
    }
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '載入失敗'
    window.alert(msg)
  } finally {
    isTextLoading.value = false
  }
}

async function saveTexts() {
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value) return
  await updateConstruction(
    cid,
    {
      // updateConstruction payload 會自己帶 constructionId；這裡僅送變更欄位
      p2QualityScaleOverview: p2QualityScaleOverview.value,
      p2AuditPlanJson: p2AuditPlanJson.value,
      p2PersonnelAttachmentsJson: p2PersonnelAttachmentsJson.value,
    } as any,
    selectedDesignChangeId.value
  )
}

const debouncedAutoSave = debounce(async () => {
  try {
    await saveTexts()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '儲存失敗'
    window.alert(msg)
  }
}, 800)

function scheduleAutoSave() {
  debouncedAutoSave()
}

async function generateScaleOverviewByAi() {
  const cid = currentProject.value?.id
  if (!cid) return
  isAiGenerating.value = true
  aiLoading.value.scaleOverview = true
  try {
    const { text } = await getP1TextAiGenerate(cid, selectedDesignChangeId.value)
    p2QualityScaleOverview.value = text ?? ''
    await saveTexts()
  } catch (e: any) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? 'AI 生成失敗'
    window.alert(msg)
  } finally {
    aiLoading.value.scaleOverview = false
    isAiGenerating.value = false
  }
}

async function exportWord() {
  const cid = currentProject.value?.id
  if (!cid) {
    window.alert('請先選擇工程案')
    return
  }
  const reportData: ExportConstructionReportRequest['valueMap']['reportData'] = {
    constructionId: cid,
    designChangeId: selectedDesignChangeId.value
  }
  if (dataReferenceDate.value) {
    reportData.dataReferenceDate = dataReferenceDate.value
  }
  const request: ExportConstructionReportRequest = { valueMap: { reportData } }
  isExporting.value = true
  try {
    // 若使用者只在「匯出頁」操作，仍需先補齊各分項的流程圖 PNG 上傳，避免匯出落回 fallback-renderer
    await ensureSubdivisionGuideFlowImagesUploaded()

    const taskId = `p2-export-${cid}-${Date.now()}`
    const res = await runWithExportLoading(taskId, 'P-2 整體品質計劃', (signal) =>
      formPApi.exportP2QualityPlan(request, { signal })
    )
    const fileName = extractFileNameFromResponse(res) || `P-2_整體品質計劃_${Date.now()}.docx`
    downloadBlobAsFile(res.data, fileName)
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? e?.message ?? '匯出失敗'
    window.alert(msg)
  } finally {
    isExporting.value = false
  }
}

onMounted(async () => {
  if (!dataReferenceDate.value) {
    dataReferenceDate.value = new Date().toISOString().slice(0, 10)
  }
  await loadTexts()
})

watch(
  () => currentProject.value?.id,
  async () => {
    selectedDesignChangeId.value = null
    revokePersonnelBlobUrls()
    await loadTexts()
  }
)

onUnmounted(() => {
  debouncedAutoSave.cancel()
  revokePersonnelBlobUrls()
})
</script>

<style scoped>
/* 版型/邊距/卡片樣式：完全對齊 P-1（目前先複製必要子集合） */
.form-p2-quality-plan-page {
  padding: 1rem;
  background: radial-gradient(1200px 600px at 12% 0%, rgba(var(--bs-primary-rgb), 0.06), transparent 60%),
    radial-gradient(900px 500px at 88% 10%, rgba(255, 255, 255, 0.03), transparent 55%),
    rgba(15, 23, 42, 0.10);
}

.report-card {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}
.report-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(700px 220px at 20% 0%, rgba(var(--bs-primary-rgb), 0.12), transparent 55%);
  opacity: 0.9;
  pointer-events: none;
}
.report-card--full {
  width: 100%;
}
.report-card :deep(.card-body) {
  background: transparent;
}
.report-card__body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.b2-content-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-top: -0.1rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}
.p1-toolbar-left {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 330px;
}
.p1-toolbar-right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}
.p1-refdate-label {
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.p1-refdate-picker {
  min-width: 190px;
  max-width: 240px;
}

.cm-audit-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  /* 固定暗黑表頭（避免被 Bootstrap table 變數蓋回白底） */
  background: #2d3748 !important;
  color: #e4e6eb !important;
}

.cm-audit-table td,
.cm-audit-table th {
  vertical-align: middle;
}

.cm-audit-table tbody td,
.cm-audit-table tbody th {
  padding-top: 0.25rem !important;
  padding-bottom: 0.25rem !important;
}

.cm-audit-table {
  /* 固定暗黑表格底色 */
  background: #111827;
  color: #e5e7eb;
}

.cm-audit-table.table > :not(caption) > * > * {
  background-color: #111827 !important;
  color: #e5e7eb !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}

.cm-audit-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.06) !important;
}

.cm-audit-legend {
  color: rgba(255, 255, 255, 0.75);
}

.cm-audit-mark {
  width: 64px;
  height: 28px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  font-size: 1rem;
  line-height: 1;
}
.cm-audit-mark:hover {
  background: rgba(255, 255, 255, 0.10);
}
.cm-audit-mark--on {
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  background: rgba(var(--bs-primary-rgb), 0.18);
}
.cm-audit-mark:focus {
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
}

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
.cm-attach-img__link {
  display: block;
  width: 100%;
  height: 100%;
}
.cm-attach-img__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cm-attach-img__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cm-attach-img__remove {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  line-height: 1;
}

.cm-audit-range {
  display: grid;
  gap: 0.2rem;
  text-align: right;
  min-width: 280px;
}
.cm-audit-range__title {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 0.02em;
}
.cm-audit-range__row {
  display: inline-flex;
  justify-content: flex-end;
  gap: 0.35rem;
  white-space: nowrap;
}
.cm-audit-range__k {
  color: rgba(255, 255, 255, 0.62);
}
.cm-audit-range__v {
  color: rgba(255, 255, 255, 0.88);
  font-variant-numeric: tabular-nums;
}
.p1-refdate-picker :deep(.dp__input) {
  height: 34px;
  border-radius: 0.5rem;
}
.p1-info-icon {
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.85rem;
  cursor: help;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  position: relative;
}
.p1-info-icon::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  top: calc(100% + 8px);
  transform: translateX(-50%);
  min-width: 280px;
  max-width: 380px;
  padding: 0.45rem 0.6rem;
  border-radius: 0.45rem;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.94);
  font-size: 0.76rem;
  line-height: 1.35;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  opacity: 0;
  pointer-events: none;
  z-index: 30;
  transition: opacity 0.15s ease;
  white-space: normal;
}
.p1-info-icon::before {
  content: '';
  position: absolute;
  left: 50%;
  top: calc(100% + 2px);
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(255, 255, 255, 0.18);
  opacity: 0;
  pointer-events: none;
  z-index: 30;
}
.p1-info-icon:hover::after,
.p1-info-icon:hover::before,
.p1-info-icon:focus-visible::after,
.p1-info-icon:focus-visible::before {
  opacity: 1;
}
.b2-export-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1.2rem;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #fff !important;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(
    145deg,
    rgba(var(--bs-primary-rgb), 0.58) 0%,
    rgba(var(--bs-primary-rgb), 0.32) 42%,
    rgba(15, 23, 42, 0.45) 100%
  );
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease,
    filter 0.16s ease;
}
.b2-export-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.38);
  filter: brightness(1.05);
  box-shadow:
    0 8px 24px rgba(var(--bs-primary-rgb), 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.b2-export-btn:active:not(:disabled) {
  transform: translateY(0);
  filter: brightness(0.98);
}
.b2-export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

/* 隱藏匯出用流程圖：放到畫面外，但保留尺寸以便 Syncfusion 正常算 layout */
.p2-flow-export-host {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 1100px;
  height: 760px;
  opacity: 0;
  pointer-events: none;
}

/* 文字區塊：完全對齊 P-1 */
.text-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0.9rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.20);
}
.text-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}
.text-panel__label {
  display: flex;
  align-items: center;
  font-weight: 700;
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
  color: rgba(255, 255, 255, 0.90);
}
.text-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  margin: 0;
}
.text-panel__toolbar .btn-ai-generate {
  padding: 0.45rem 1.05rem;
  font-size: 0.92rem;
}
.text-panel__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.text-panel__textarea {
  flex: 1 1 auto;
  min-height: 10rem;
  width: 100%;
  resize: vertical;
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
}
.text-panel__textarea:focus {
  background: rgba(0, 0, 0, 0.20);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
  color: rgba(255, 255, 255, 0.92);
}
.text-panel__textarea::placeholder {
  color: rgba(255, 255, 255, 0.45);
}
.text-panels {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.text-panels__ai-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(1px);
  border-radius: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.text-panels__ai-overlay-inner {
  text-align: center;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.80);
  border: 1px solid rgba(255, 255, 255, 0.16);
}
</style>

