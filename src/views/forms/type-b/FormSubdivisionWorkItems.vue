<template>
  <div class="form-subdivision-work-items-page a4-dark">
    <PageHeader
      title="分項工程維護"
      icon="fa fa-list-ol"
      :breadcrumbs="breadcrumbs"
    >
      <template v-if="isContractor && hasCurrentProject" #extra>
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
      「分項工程維護」僅供營造端使用；目前視角無法編輯此清單。
    </div>

    <Card v-else class="mb-3 report-card report-card--full">
      <CardBody class="report-card__body">
        <div
          class="construction-toolbar-row d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 w-100"
        >
          <div
            class="construction-intro-box d-flex align-items-center gap-2 flex-grow-1 min-w-0"
            title="名稱將用於施工要領、品質管理、施工檢驗、自主檢查表等表單；資料依變更設計版本分開維護，可複製前一版或匯入監造匯出之加密分項檔（含自主檢查標準明細）。"
          >
            <i class="fa fa-info-circle construction-intro-icon flex-shrink-0" aria-hidden="true"></i>
            <span class="construction-intro-pill flex-shrink-0">說明</span>
            <span class="construction-intro-line small min-w-0">
              依版本維護<strong class="construction-kw">分項工程</strong>與<strong class="construction-kw">自主檢查標準表</strong>（施工／安衛於標準頁內切換；由監造匯入或複製前一版帶入）；名稱用於各表單之
              <strong class="construction-hl">名稱＋後綴</strong>。
            </span>
          </div>
          <div class="d-flex flex-wrap gap-2 align-items-center justify-content-end flex-shrink-0">
            <input
              ref="importSubdivisionFileInput"
              type="file"
              accept=".cmx,application/json,.json,text/plain"
              class="d-none"
              @change="onSubdivisionImportFileChange"
            />
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              :disabled="saving || loading || isCopying || isImportingSubdivision || isCopyingFromSupervisory"
              title="自監造對應版本複製施工項目與自主檢查標準明細至目前營造版本"
              @click="openSupervisoryCopyModal"
            >
              <i class="fa fa-copy me-1"></i>
              複製監造
            </button>
            <div v-if="selectedDesignChangeId != null" class="btn-group">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary dropdown-toggle"
                :disabled="!canCopyPrevious || saving || loading || isCopying || isImportingSubdivision"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="自前一個變更設計版本複製分項工程（含施工與安全衛生自主檢查標準明細）"
              >
                <i class="fa me-1" :class="isCopying ? 'fa-spinner fa-spin' : 'fa-copy'"></i>
                {{ isCopying ? '複製中...' : '複製前一個版本' }}
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li>
                  <button
                    type="button"
                    class="dropdown-item"
                    :disabled="isCopying"
                    @click="copyFromPrevious(false)"
                  >
                    合併到目前版本（保留既有項目）
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    class="dropdown-item text-danger"
                    :disabled="isCopying"
                    @click="copyFromPrevious(true)"
                  >
                    覆寫目前版本（先清空再複製）
                  </button>
                </li>
              </ul>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="saving || loading || isCopying || isImportingSubdivision"
              title="匯入監造「施工項目」匯出之分項對照檔（加密；僅可匯入相同工程案匯出的檔案；含標準明細時一併寫入），將覆寫目前版本既有分項"
              @click="triggerSubdivisionImport"
            >
              <i v-if="isImportingSubdivision" class="fa fa-spinner fa-spin me-1"></i>
              <i v-else class="fa fa-file-import me-1"></i>
              匯入監造分項檔
            </button>
            <button
              type="button"
              class="btn btn-sm btn-success"
              :disabled="saving || loading || isCopying || isImportingSubdivision"
              @click="createItem"
            >
              <i class="fa fa-plus me-1"></i>
              新增分項工程
            </button>
          </div>
        </div>

        <div v-if="loadError" class="alert alert-danger mb-0">
          <i class="fa fa-exclamation-circle me-2"></i>{{ loadError }}
        </div>

        <div v-else class="table-responsive">
          <table class="table a4-table mb-0 align-middle" :class="{ 'opacity-75': isReorderingSub }">
            <thead>
              <tr>
                <th
                  class="text-center text-muted text-nowrap align-middle row-drag-th"
                  style="width: 1%"
                  title="按住左側圖示拖曳可調整順序"
                >
                  順序
                </th>
                <th>分項工程名稱</th>
                <th>備註</th>
                <th class="text-center text-nowrap align-middle" style="width: 1%">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" class="text-center py-5 text-muted">載入中...</td>
              </tr>
              <template v-else-if="localItems.length > 0">
                <tr
                  v-for="(item, index) in localItems"
                  :key="item.id"
                  class="a4-table__data-row"
                  :class="{ 'a4-table__row--drag-over': subDropOverIndex === index }"
                  @dragover.prevent="onSubDragOver(index)"
                  @drop.prevent="onSubDrop(index)"
                >
                  <td
                    class="text-center align-middle row-drag-handle text-muted"
                    draggable="true"
                    title="拖曳排序"
                    @dragstart="onSubDragStart($event, index)"
                    @dragend="onSubDragEnd"
                  >
                    <i class="fa fa-grip-vertical" aria-hidden="true"></i>
                  </td>
                  <td class="fw-bold">
                    {{ item.name }}
                    <div class="small fw-normal mt-1 d-flex flex-wrap align-items-center gap-1 gap-sm-2">
                      <button
                        type="button"
                        class="standards-status-hit"
                        title="開啟自主檢查標準表（頁內以分頁切換施工／安衛）"
                        @click="goToSubdivisionStandards(item)"
                      >
                        <span class="text-muted">自主檢查標準表</span>
                        <span
                          :class="[
                            'standards-pill',
                            ((item.constructionStandards?.length ?? 0) + (item.safetyStandards?.length ?? 0)) > 0
                              ? 'standards-pill--filled'
                              : 'standards-pill--empty'
                          ]"
                        >
                          <template
                            v-if="
                              ((item.constructionStandards?.length ?? 0) + (item.safetyStandards?.length ?? 0)) > 0
                            "
                          >
                            施工 {{ item.constructionStandards?.length ?? 0 }} 筆 · 安衛
                            {{ item.safetyStandards?.length ?? 0 }} 筆
                          </template>
                          <template v-else>無資料</template>
                        </span>
                      </button>
                      <button
                        v-if="isContractor"
                        type="button"
                        class="standards-status-hit"
                        title="開啟施工要領維護"
                        @click="goToSubdivisionGuide(item)"
                      >
                        <span class="text-muted">施工要領</span>
                        <span
                          :class="[
                            'standards-pill',
                            (item.guideStepCount ?? 0) > 0 ? 'standards-pill--filled' : 'standards-pill--empty'
                          ]"
                        >
                          <template v-if="(item.guideStepCount ?? 0) > 0">{{ item.guideStepCount ?? 0 }} 筆</template>
                          <template v-else>無資料</template>
                        </span>
                      </button>
                    </div>
                  </td>
                  <td>{{ item.remark || '—' }}</td>
                  <td class="text-center text-nowrap align-middle">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary me-2"
                      @click="goToSubdivisionStandards(item)"
                    >
                      <i class="fa fa-clipboard-list me-1"></i>自主檢查標準表
                    </button>
                    <button
                      v-if="isContractor"
                      type="button"
                      class="btn btn-sm btn-outline-primary me-2"
                      @click="goToSubdivisionGuide(item)"
                    >
                      <i class="fa fa-list-check me-1"></i>施工要領
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary me-2" @click="editItem(item)">
                      <i class="fa fa-pen me-1"></i>編輯
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      :disabled="deletingId === item.id"
                      @click="removeItem(item)"
                    >
                      <i v-if="deletingId === item.id" class="fa fa-spinner fa-spin me-1"></i>
                      <i v-else class="fa fa-trash me-1"></i>刪除
                    </button>
                  </td>
                </tr>
              </template>
              <tr v-else>
                <td colspan="4" class="text-center py-5 text-muted">暫無資料</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>

    <!-- 新增／編輯（比照施工項目 Bootstrap Modal） -->
    <div class="modal fade" id="subdivisionItemModal" tabindex="-1" ref="itemModalElement">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditMode ? '編輯分項工程' : '新增分項工程' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent>
              <div class="mb-3">
                <label class="form-label">名稱 <span class="text-danger">*</span></label>
                <input v-model="formData.name" type="text" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label">備註</label>
                <textarea v-model="formData.remark" class="form-control" rows="3" placeholder="選填"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" :disabled="saving" @click="saveItem">
              <i v-if="saving" class="fa fa-spinner fa-spin me-1"></i>儲存
            </button>
          </div>
        </div>
      </div>
    </div>

    <Modal
      :show="showSupervisoryCopyModal"
      title=""
      icon=""
      size="lg"
      modal-id="subdivision-supervisory-copy"
      :hide-confirm-button="true"
      :hide-cancel-button="true"
      @update:show="showSupervisoryCopyModal = $event"
    >
      <template #header>
        <span class="fw-bold">複製監造施工項目</span>
      </template>
      <p class="text-muted small mb-2">
        依版次序位對應監造版本，複製施工項目名稱與施工／安衛自主檢查標準明細至目前營造分項工程（不含施工要領）。
      </p>
      <div
        class="alert py-2 px-3 mb-3 small"
        :class="supervisoryCopyPreview.supervisoryVersionAvailable ? 'alert-light border' : 'alert-warning'"
        role="status"
      >
        <div class="fw-semibold mb-1">複製版本對照</div>
        <div>
          <span class="text-muted">營造目前版本：</span>
          <span class="fw-semibold">{{ supervisoryCopyVersionBanner.contractor }}</span>
        </div>
        <div class="mt-1">
          <span class="text-muted">複製來源（監造）：</span>
          <span
            class="fw-semibold"
            :class="{ 'text-warning': !supervisoryCopyPreview.supervisoryVersionAvailable }"
          >
            {{ supervisoryCopyVersionBanner.supervisory }}
          </span>
        </div>
      </div>
      <div v-if="supervisoryCopyPreviewLoading" class="text-center py-4 text-muted">
        <i class="fa fa-spinner fa-spin me-2"></i>載入中…
      </div>
      <div v-else class="list-group list-group-flush border rounded">
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>施工項目（分項）</span>
          <span class="fw-semibold">{{ supervisoryCopyPreview.itemCount }} 筆</span>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>施工自主檢查標準明細</span>
          <span class="fw-semibold">{{ supervisoryCopyPreview.constructionStandardCount }} 筆</span>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span>安衛自主檢查標準明細</span>
          <span class="fw-semibold">{{ supervisoryCopyPreview.safetyStandardCount }} 筆</span>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="showSupervisoryCopyModal = false">
          關閉
        </button>
        <div class="btn-group">
          <button
            type="button"
            class="btn btn-primary dropdown-toggle"
            :disabled="
              isCopyingFromSupervisory ||
              !supervisoryCopyPreview.supervisoryVersionAvailable ||
              supervisoryCopyPreview.itemCount === 0
            "
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i v-if="isCopyingFromSupervisory" class="fa fa-spinner fa-spin me-1"></i>
            <i v-else class="fa fa-copy me-1"></i>
            {{ isCopyingFromSupervisory ? '複製中…' : '複製至營造' }}
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <button type="button" class="dropdown-item" @click="copyFromSupervisory(false)">
                合併到目前版本（保留既有項目）
              </button>
            </li>
            <li>
              <button type="button" class="dropdown-item text-danger" @click="copyFromSupervisory(true)">
                覆寫目前版本（先清空再複製）
              </button>
            </li>
          </ul>
        </div>
      </template>
    </Modal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDesignChangeList, type DesignChangeItem } from '@/api/designChange'
import { Modal as BsModal } from 'bootstrap'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import {
  listSubdivisionWorkItems,
  createSubdivisionWorkItem,
  updateSubdivisionWorkItem,
  deleteSubdivisionWorkItem,
  reorderSubdivisionWorkItems,
  copySubdivisionFromPrevious,
  importSubdivisionFromSupervisoryExport,
  getSupervisorySubdivisionPreview,
  copySubdivisionFromSupervisory,
  type SupervisorySubdivisionPreviewResponse,
  type SubdivisionWorkItem,
  type SubdivisionWorkItemStandardLine,
  type SupervisorySubdivisionExportPayload
} from '@/api/subdivisionWorkItems'

const workspaceStore = useWorkspaceStore()
const route = useRoute()
const router = useRouter()
const { isContractor } = useViewPerspective()

const breadcrumbs = [
  { text: '表單生成與管理', href: 'javascript:;' },
  { text: 'P類(計劃書)表單', href: 'javascript:;' },
  { text: '分項工程維護', active: true }
]

const hasCurrentProject = computed(() => !!workspaceStore.currentProject?.id)
const currentProject = computed(() => workspaceStore.currentProject)

const selectedDesignChangeId = ref<number | null>(null)

const designChangeList = ref<DesignChangeItem[]>([])

const isCopying = ref(false)
const isImportingSubdivision = ref(false)
const isCopyingFromSupervisory = ref(false)
const showSupervisoryCopyModal = ref(false)
const supervisoryCopyPreviewLoading = ref(false)
const supervisoryCopyPreview = ref<SupervisorySubdivisionPreviewResponse>({
  itemCount: 0,
  constructionStandardCount: 0,
  safetyStandardCount: 0,
  supervisoryVersionAvailable: false
})

const supervisoryCopyVersionBanner = computed(() => {
  const contractor =
    supervisoryCopyPreview.value.contractorVersionLabel ??
    (selectedDesignChangeId.value == null ? '原契約' : '目前版本')
  const supervisory = supervisoryCopyPreview.value.supervisoryVersionAvailable
    ? (supervisoryCopyPreview.value.resolvedSupervisoryVersionLabel ?? '—')
    : '監造無此版本'
  return { contractor, supervisory }
})
const importSubdivisionFileInput = ref<HTMLInputElement | null>(null)

/** 與監造「施工項目」一致：統一進入抽查標準表，頁內以 Tab 切換施工／安衛 */
function goToSubdivisionStandards(item: SubdivisionWorkItem, tab?: 'construction' | 'safety') {
  router.push({
    path: `/forms/subdivision-work-items/${item.id}/standards`,
    query: {
      ...(selectedDesignChangeId.value != null
        ? { designChangeId: String(selectedDesignChangeId.value) }
        : {}),
      ...(tab === 'safety' ? { tab: 'safety' } : {})
    }
  })
}

function goToSubdivisionGuide(item: SubdivisionWorkItem) {
  router.push({
    path: `/forms/subdivision-work-items/${item.id}/guide`,
    query: {
      ...(selectedDesignChangeId.value != null
        ? { designChangeId: String(selectedDesignChangeId.value) }
        : {}),
    }
  })
}

/** 與標準明細頁互相用網址列還原版本 */
watch(
  () => route.query.designChangeId,
  () => {
    const q = route.query.designChangeId
    if (q === undefined || q === null || q === '') {
      selectedDesignChangeId.value = null
      return
    }
    const n = Number(Array.isArray(q) ? q[0] : q)
    selectedDesignChangeId.value = Number.isFinite(n) ? n : null
  },
  { immediate: true }
)

function onVersionChange(v: number | null) {
  selectedDesignChangeId.value = v
}

const canCopyPrevious = computed(() => selectedDesignChangeId.value != null)

const sourceDesignChangeIdForCopy = computed((): number | null => {
  const current = selectedDesignChangeId.value
  if (current == null) return null
  const list = designChangeList.value
  const idx = list.findIndex((d) => d.id === current)
  if (idx <= 0) return null
  return list[idx - 1]?.id ?? null
})

async function fetchDesignChangeList() {
  const cid = currentProject.value?.id?.trim()
  if (!cid || !isContractor.value) {
    designChangeList.value = []
    return
  }
  try {
    const list = await getDesignChangeList(cid, 'CONTRACTOR')
    designChangeList.value = [...list].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    )
  } catch {
    designChangeList.value = []
  }
}

function parseStdRow(raw: unknown): SubdivisionWorkItemStandardLine | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined
  const str = (v: unknown): string | undefined =>
    v === null || v === undefined ? undefined : String(v)
  const so = o.stepOrder
  let stepOrder: number | undefined
  if (typeof so === 'number' && Number.isFinite(so)) stepOrder = so
  else if (typeof so === 'string' && so.trim() !== '') {
    const n = parseInt(so, 10)
    if (!Number.isNaN(n)) stepOrder = n
  }
  return {
    id: num(o.id),
    stepOrder,
    itemName: str(o.itemName),
    workProcess: str(o.workProcess),
    workProcessDetail: str(o.workProcessDetail),
    manageProject: str(o.manageProject),
    checkPoint: str(o.checkPoint),
    checkStandard: str(o.checkStandard),
    checkTiming: str(o.checkTiming),
    checkMethod: str(o.checkMethod),
    checkFeq: str(o.checkFeq),
    failureHandle: str(o.failureHandle),
    manageRecord: str(o.manageRecord),
    remark: str(o.remark),
    isActive: typeof o.isActive === 'boolean' ? o.isActive : undefined
  }
}

function parseStdList(rawList: unknown): SubdivisionWorkItemStandardLine[] {
  if (!Array.isArray(rawList)) return []
  const mapped = rawList.map(parseStdRow)
  return mapped.filter((x): x is SubdivisionWorkItemStandardLine => x !== null)
}

function isEncryptedSubdivisionPayload(parsed: unknown): parsed is SupervisorySubdivisionExportPayload {
  if (!parsed || typeof parsed !== 'object') return false
  const root = parsed as Record<string, unknown>
  return (
    typeof root.kind === 'string' &&
    typeof root.constructionId === 'string' &&
    typeof root.iv === 'string' &&
    typeof root.ciphertext === 'string'
  )
}

function extractSubdivisionImportItems(parsed: unknown): {
  sortOrder?: number
  name: string
  supervisoryMajorItemId?: string
  constructionStandards: SubdivisionWorkItemStandardLine[]
  safetyStandards: SubdivisionWorkItemStandardLine[]
}[] {
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON 格式錯誤')
  const root = parsed as Record<string, unknown>
  const rawItems = root.items
  if (!Array.isArray(rawItems)) {
    throw new Error('檔案格式錯誤：缺少 items 陣列（請使用監造「施工項目」頁匯出之 JSON）')
  }
  const out: {
    sortOrder?: number
    name: string
    supervisoryMajorItemId?: string
    constructionStandards: SubdivisionWorkItemStandardLine[]
    safetyStandards: SubdivisionWorkItemStandardLine[]
  }[] = []
  for (const row of rawItems) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const name = String(r.name ?? '').trim()
    if (!name) continue
    const so = r.sortOrder
    const midRaw = r.supervisoryMajorItemId
    const supervisoryMajorItemId =
      typeof midRaw === 'string' && midRaw.trim() !== '' ? midRaw.trim() : undefined
    out.push({
      sortOrder: typeof so === 'number' && Number.isFinite(so) ? so : undefined,
      name,
      supervisoryMajorItemId,
      constructionStandards: parseStdList(r.constructionStandards),
      safetyStandards: parseStdList(r.safetyStandards)
    })
  }
  return out
}

function triggerSubdivisionImport() {
  if (
    !window.confirm(
      '匯入將覆寫「目前選中版本」既有分項工程與其自主檢查標準明細（備註清空）。\n僅可匯入相同工程案匯出的檔案。確定嗎？'
    )
  ) {
    return
  }
  importSubdivisionFileInput.value?.click()
}

async function onSubdivisionImportFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const cid = currentProject.value?.id?.trim()
  if (!cid) return
  isImportingSubdivision.value = true
  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as unknown
    let importedCount = 0
    if (isEncryptedSubdivisionPayload(parsed)) {
      const res = await importSubdivisionFromSupervisoryExport({
        constructionId: cid,
        designChangeId: selectedDesignChangeId.value,
        encryptedPayload: parsed
      })
      importedCount = res.importedCount
    } else {
      const items = extractSubdivisionImportItems(parsed)
      if (items.length === 0) {
        window.alert('檔案中沒有有效分項名稱')
        return
      }
      const res = await importSubdivisionFromSupervisoryExport({
        constructionId: cid,
        designChangeId: selectedDesignChangeId.value,
        items
      })
      importedCount = res.importedCount
    }
    window.alert(`已匯入 ${importedCount} 筆分項工程。`)
    await loadList()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    window.alert(err?.response?.data?.message ?? err?.message ?? '匯入失敗')
  } finally {
    isImportingSubdivision.value = false
  }
}

function openSupervisoryCopyModal() {
  showSupervisoryCopyModal.value = true
  void loadSupervisoryCopyPreview()
}

async function loadSupervisoryCopyPreview() {
  const cid = currentProject.value?.id?.trim()
  if (!cid) return
  supervisoryCopyPreviewLoading.value = true
  try {
    supervisoryCopyPreview.value = await getSupervisorySubdivisionPreview(
      cid,
      selectedDesignChangeId.value
    )
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    window.alert(err?.response?.data?.message ?? err?.message ?? '無法載入監造資料筆數')
    supervisoryCopyPreview.value = {
      itemCount: 0,
      constructionStandardCount: 0,
      safetyStandardCount: 0,
      supervisoryVersionAvailable: false
    }
  } finally {
    supervisoryCopyPreviewLoading.value = false
  }
}

async function copyFromSupervisory(overwrite: boolean) {
  const cid = currentProject.value?.id?.trim()
  if (!cid) return
  if (!supervisoryCopyPreview.value.supervisoryVersionAvailable) {
    window.alert('監造無對應版本，無法複製')
    return
  }
  if (supervisoryCopyPreview.value.itemCount === 0) {
    window.alert('監造此版本尚無施工項目可複製')
    return
  }
  if (overwrite) {
    if (
      !window.confirm(
        '「覆寫」將先刪除目前版本全部分項工程與其施工／安全衛生自主檢查標準，再自監造複製。\n\n此動作無法復原，確定嗎？'
      )
    ) {
      return
    }
  } else {
    if (
      !window.confirm(
        '將監造對應版本的施工項目（含施工與安全衛生自主檢查標準明細）複製到目前版本末尾；若目前版本已有項目則一併保留。\n\n確定嗎？'
      )
    ) {
      return
    }
  }
  isCopyingFromSupervisory.value = true
  try {
    const { copiedCount } = await copySubdivisionFromSupervisory(cid, selectedDesignChangeId.value, {
      overwrite
    })
    showSupervisoryCopyModal.value = false
    window.alert(
      overwrite
        ? `已覆寫並複製 ${copiedCount} 筆分項工程（含自主檢查標準明細）`
        : `已複製 ${copiedCount} 筆分項工程（合併至目前版本）`
    )
    await loadList()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    window.alert(err?.response?.data?.message ?? err?.message ?? '複製失敗')
  } finally {
    isCopyingFromSupervisory.value = false
  }
}

async function copyFromPrevious(overwrite: boolean) {
  const cid = currentProject.value?.id
  const target = selectedDesignChangeId.value
  if (!cid || target == null) return
  if (overwrite) {
    if (
      !window.confirm(
        '「覆寫」將先刪除目前版本全部分項工程與其施工／安全衛生自主檢查標準，再依前一個版本完整複製。\n\n此動作無法復原，確定嗎？'
      )
    ) {
      return
    }
  } else {
    if (
      !window.confirm(
        '將前一個版本的分項工程（含施工與安全衛生自主檢查標準）複製到目前版本末尾；若目前版本已有項目則會一併保留、不覆寫。\n\n確定嗎？'
      )
    ) {
      return
    }
  }
  isCopying.value = true
  try {
    const source = sourceDesignChangeIdForCopy.value ?? undefined
    const { copiedCount } = await copySubdivisionFromPrevious(cid, target, source, { overwrite })
    if (overwrite && copiedCount === 0) {
      window.alert('覆寫完成：來源版本無分項資料，目前版本已清空。')
    } else {
      window.alert(
        overwrite
          ? `已覆寫並複製 ${copiedCount} 筆分項工程`
          : `已複製 ${copiedCount} 筆分項工程（合併至目前版本）`
      )
    }
    await loadList()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    window.alert(err?.response?.data?.message ?? err?.message ?? '複製失敗')
  } finally {
    isCopying.value = false
  }
}

const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const deletingId = ref<number | null>(null)

const localItems = ref<SubdivisionWorkItem[]>([])
const isReorderingSub = ref(false)
const subDropOverIndex = ref<number | null>(null)
const subDragFromIndex = ref<number | null>(null)

function onSubDragStart(e: DragEvent, index: number) {
  subDragFromIndex.value = index
  e.dataTransfer?.setData('text/plain', String(index))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onSubDragOver(index: number) {
  subDropOverIndex.value = index
}

function onSubDragEnd() {
  subDropOverIndex.value = null
  subDragFromIndex.value = null
}

async function onSubDrop(toIndex: number) {
  subDropOverIndex.value = null
  const from = subDragFromIndex.value
  subDragFromIndex.value = null
  if (from == null || from === toIndex) return
  const list = localItems.value.slice()
  const [removed] = list.splice(from, 1)
  list.splice(toIndex, 0, removed)
  localItems.value = list
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value) return
  isReorderingSub.value = true
  try {
    await reorderSubdivisionWorkItems({
      constructionId: cid,
      designChangeId: selectedDesignChangeId.value,
      orderedIds: list.map((i) => i.id)
    })
  } catch (e) {
    console.error(e)
    window.alert('排序儲存失敗')
    await loadList()
  } finally {
    isReorderingSub.value = false
  }
}

const itemModalElement = ref<HTMLElement | null>(null)
let itemBsModal: BsModal | null = null
const isEditMode = ref(false)
const formData = reactive<{ id?: number; name: string; remark: string }>({
  name: '',
  remark: ''
})

function resetForm() {
  formData.id = undefined
  formData.name = ''
  formData.remark = ''
}

function createItem() {
  resetForm()
  isEditMode.value = false
  itemBsModal?.show()
}

function editItem(item: SubdivisionWorkItem) {
  resetForm()
  isEditMode.value = true
  formData.id = item.id
  formData.name = item.name
  formData.remark = item.remark ?? ''
  itemBsModal?.show()
}

async function saveItem() {
  const cid = currentProject.value?.id
  if (!cid) {
    window.alert('請先選擇工程案')
    return
  }
  const name = formData.name.trim()
  if (!name) {
    window.alert('請輸入分項工程名稱')
    return
  }
  saving.value = true
  try {
    if (isEditMode.value && formData.id != null) {
      await updateSubdivisionWorkItem(formData.id, {
        constructionId: cid,
        designChangeId: selectedDesignChangeId.value,
        name,
        remark: formData.remark.trim() || null
      })
      window.alert('更新成功')
    } else {
      await createSubdivisionWorkItem({
        constructionId: cid,
        designChangeId: selectedDesignChangeId.value,
        name,
        remark: formData.remark.trim() || null
      })
      window.alert('新增成功')
    }
    itemBsModal?.hide()
    await loadList()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    window.alert(err?.response?.data?.message ?? err?.message ?? '儲存失敗')
  } finally {
    saving.value = false
  }
}

async function loadList() {
  const cid = currentProject.value?.id
  if (!cid || !isContractor.value) {
    localItems.value = []
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const rows = await listSubdivisionWorkItems(cid, selectedDesignChangeId.value)
    localItems.value = [...rows]
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    loadError.value = err?.response?.data?.message ?? err?.message ?? '載入失敗'
    localItems.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () =>
    [workspaceStore.currentProject?.id ?? '', selectedDesignChangeId.value, isContractor.value] as const,
  () => {
    loadList()
  },
  { immediate: true }
)

watch(
  () => [workspaceStore.currentProject?.id ?? '', isContractor.value] as const,
  () => {
    fetchDesignChangeList()
  },
  { immediate: true }
)

async function removeItem(item: SubdivisionWorkItem) {
  if (
    !window.confirm(
      `確定刪除「${item.name}」及其施工自主檢查與安全衛生自主檢查標準明細？此動作無法復原。`
    )
  ) {
    return
  }
  const cid = currentProject.value?.id
  if (!cid) return
  deletingId.value = item.id
  try {
    await deleteSubdivisionWorkItem(item.id, cid, selectedDesignChangeId.value)
    await loadList()
    window.alert('刪除成功')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    window.alert(err?.response?.data?.message ?? err?.message ?? '刪除失敗')
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  if (itemModalElement.value) {
    itemBsModal = new BsModal(itemModalElement.value)
  }
})
</script>

<style scoped>
/* 暗色主題與監造「施工項目」頁一致 */
.a4-dark {
  --a4-bg: #1a1d21;
  --a4-card: #25282c;
  --a4-border: #4a4d54;
  --a4-text: #e4e6eb;
  --a4-muted: #b0b3b8;
  --a4-thead: #2d3748;
  --a4-hover: rgba(255, 255, 255, 0.06);
  --a4-input-bg: #2d3139;
  --a4-input-border: #3a3d42;
  --a4-accent: #60a5fa;
}

.form-subdivision-work-items-page {
  padding: 1rem;
  color: var(--a4-text);
}

:deep(.card.report-card) {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}
:deep(.card.report-card::before) {
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
:deep(.card.report-card .card-body.report-card__body) {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent;
  color: var(--a4-text);
}

:deep(.alert-info) {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.25);
  color: #93c5fd;
}

:deep(.alert-warning) {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
}

:deep(.alert-danger) {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
  color: #fecaca;
}

.a4-table {
  border: 2px solid var(--a4-border);
  border-collapse: collapse;
  width: 100%;
  color: var(--a4-text);
}

.a4-table thead th {
  background: var(--a4-thead);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.65rem 0.5rem;
  border: 1.5px solid var(--a4-border);
  color: var(--a4-muted);
}

.a4-table tbody td {
  border: 1.5px solid var(--a4-border);
  padding: 0.6rem 0.5rem;
  vertical-align: middle;
  background: var(--a4-card);
  color: var(--a4-text);
}

.a4-table tbody tr:hover td {
  background: var(--a4-hover);
}

.a4-table :deep(.text-muted) {
  color: var(--a4-muted) !important;
}

.a4-table :deep(.btn-sm) {
  font-size: 0.8rem;
}

/* 填寫狀況整組可點進維護頁，外觀維持像文字、只做極淡互動 */
.standards-status-hit {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0;
  padding: 0.1rem 0.15rem;
  border: none;
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}
.standards-status-hit:hover .standards-pill {
  filter: brightness(1.06);
}
.standards-status-hit:hover .text-muted {
  color: rgba(196, 200, 206, 0.95) !important;
}
.standards-status-hit:focus-visible {
  outline: 1px solid rgba(96, 165, 250, 0.45);
  outline-offset: 1px;
}

/* 抽查標準狀態：柔和配色（取代高對比 text-bg-*） */
.standards-pill {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.3;
  padding: 0.12rem 0.48rem;
  border-radius: 999px;
  border: 1px solid transparent;
  vertical-align: middle;
}
.standards-pill--filled {
  color: rgba(165, 214, 189, 0.95);
  background: rgba(45, 115, 82, 0.22);
  border-color: rgba(74, 155, 110, 0.28);
}
.standards-pill--empty {
  color: rgba(160, 164, 170, 0.92);
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.07);
}

.construction-toolbar-row .construction-intro-box {
  padding-top: 0.28rem;
  padding-bottom: 0.28rem;
}

.construction-intro-box {
  padding: 0.35rem 0.65rem 0.35rem 0.5rem;
  border-radius: 0.45rem;
  border: 1px solid rgba(94, 234, 212, 0.22);
  border-left: 3px solid #5eead4;
  background: linear-gradient(
    95deg,
    rgba(94, 234, 212, 0.1) 0%,
    rgba(15, 23, 42, 0.35) 48%,
    rgba(37, 40, 44, 0.5) 100%
  );
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2) inset;
}
.construction-intro-icon {
  color: #5eead4;
  font-size: 0.95rem;
  opacity: 0.95;
}
.construction-intro-pill {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  line-height: 1.2;
  color: #ecfdf5;
  background: rgba(94, 234, 212, 0.2);
  border: 1px solid rgba(94, 234, 212, 0.45);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15) inset;
}
.construction-intro-line {
  color: rgba(228, 230, 235, 0.9);
  line-height: 1.35;
}
.construction-kw {
  color: #7dd3fc;
  font-weight: 700;
}
.construction-hl {
  color: #fde68a;
  font-weight: 700;
}

.construction-pagination :deep(.page-link) {
  background: var(--a4-card);
  border-color: var(--a4-border);
  color: var(--a4-text);
}
.construction-pagination :deep(.page-item.disabled .page-link) {
  background: rgba(0, 0, 0, 0.2);
  color: var(--a4-muted);
  border-color: var(--a4-border);
}
.construction-pagination :deep(.page-item:not(.disabled) .page-link:hover) {
  background: var(--a4-hover);
  color: var(--a4-accent);
}

.row-drag-th {
  font-size: 0.75rem;
  font-weight: 600;
}
.row-drag-handle {
  cursor: grab;
  user-select: none;
  touch-action: none;
  vertical-align: middle !important;
}
.row-drag-handle:active {
  cursor: grabbing;
}
.a4-table__row--drag-over td {
  box-shadow: inset 0 0 0 2px rgba(96, 165, 250, 0.4);
}
</style>
