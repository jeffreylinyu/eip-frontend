<template>
  <div class="container-fluid px-4 py-4" data-bs-theme="dark">
    <PageHeader
      title="文件檔案分類表"
      icon="fa fa-folder-open"
      :breadcrumbs="[
        { text: '表單', href: 'javascript:;' },
        { text: '文件檔案分類表', active: true }
      ]"
    >
      <template v-if="hasCurrentProject && isContractor" #extra>
        <DesignChangeVersionSwitcher
          :model-value="selectedDesignChangeId"
          :construction-id="currentProject?.id"
          source-type="CONTRACTOR"
          @update:model-value="onVersionChange"
        />
      </template>
    </PageHeader>

    <div
      v-if="hasCurrentProject && isContractor"
      class="d-flex flex-wrap align-items-center justify-content-end gap-2 mb-4"
    >
      <div v-if="selectedDesignChangeId != null" class="btn-group">
        <button
          type="button"
          class="btn btn-sm btn-outline-primary dropdown-toggle"
          :disabled="isCopying"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          title="自上一變更設計版本複製文件分類表至目前版本（覆寫）"
        >
          <i class="fa me-1" :class="isCopying ? 'fa-spinner fa-spin' : 'fa-copy'"></i>
          {{ isCopying ? '複製中…' : '複製前一版本' }}
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <button
              type="button"
              class="dropdown-item text-danger"
              :disabled="isCopying"
              @click="copyFromPrevious"
            >
              覆寫目前版本
            </button>
          </li>
        </ul>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-outline-danger"
        @click="confirmResetVersion"
      >
        <i class="fa fa-undo me-1"></i>
        恢復此版本預設值
      </button>
    </div>

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於左側選擇工程案。
    </div>

    <div v-else-if="!isContractor" class="alert alert-info mb-0">
      <i class="fa fa-info-circle me-2"></i>
      此頁僅供營造端使用。
    </div>

    <div v-else-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted">載入中...</p>
    </div>

    <div v-else>
      <Modal
        :show="showSupervisoryModal"
        title=""
        icon=""
        size="xl"
        modal-id="contractor-supervisory-b-preview"
        :hide-confirm-button="true"
        :hide-cancel-button="true"
        @update:show="showSupervisoryModal = $event"
      >
        <template #header>
          <div
            class="d-flex w-100 flex-wrap align-items-center justify-content-between gap-2 pe-1 contractor-supervisory-modal-title"
          >
            <span class="fw-bold">監造填寫預覽</span>
            <div v-if="currentProject?.id" class="d-flex align-items-center gap-2" @click.stop>
              <DesignChangeVersionSwitcher
                :model-value="modalSupervisoryDesignChangeId"
                :construction-id="currentProject.id"
                source-type="SUPERVISORY"
                @update:model-value="onModalSupervisoryVersionChange"
              />
            </div>
          </div>
        </template>
        <p class="text-muted small mb-3">
          以下為監造端<strong>自訂</strong> B 類項目（不含預設列）。複製至營造「P類-計畫書」時將<strong>刪除該類別自訂列</strong>並以上表重建（P 類預設列不變）。
        </p>
        <div v-if="supervisoryPreviewLoading" class="text-center py-4 text-muted">
          <i class="fa fa-spinner fa-spin me-2"></i>載入中…
        </div>
        <div v-else class="supervisory-preview-report-card">
          <div class="supervisory-preview-report-card__body">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th style="width: 50px">#</th>
                    <th style="width: 80px">編號</th>
                    <th>文件名稱</th>
                    <th style="min-width: 160px">規定提送日程</th>
                    <th style="width: 100px">保存年限</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="supervisoryPreviewRows.length === 0">
                    <td colspan="5" class="text-center text-muted py-4">此版本尚無自訂 B 類項目</td>
                  </tr>
                  <tr v-for="(row, idx) in supervisoryPreviewRows" :key="idx">
                    <td class="text-center text-muted">{{ idx + 1 }}</td>
                    <td>{{ row.itemNumber }}</td>
                    <td>{{ row.documentName }}</td>
                    <td class="small">{{ row.requiredSubmissionSchedule || '—' }}</td>
                    <td>{{ row.retentionYears == null ? '—' : `${row.retentionYears} 年` }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <template #footer>
          <button type="button" class="btn btn-outline-secondary" @click="showSupervisoryModal = false">關閉</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="isCopyingSupervisoryToP || !constructionId"
            @click="copySupervisoryBToP"
          >
            <i v-if="isCopyingSupervisoryToP" class="fa fa-spinner fa-spin me-1"></i>
            <i v-else class="fa fa-copy me-1"></i>
            {{ isCopyingSupervisoryToP ? '複製中…' : '複製到營造 P 類（目前版本）' }}
          </button>
        </template>
      </Modal>

      <CategoryTable
        v-for="cat in categories"
        :key="cat.code"
        :category="cat.code"
        :title="cat.name"
        :items="groupedItems[cat.code] || []"
        :allow-add="cat.code !== 'G'"
        :allow-reorder="cat.code !== 'G'"
        :allow-null-retention="true"
        :schedule-column-categories="cat.code === 'P' ? ['P'] : []"
        :plan-schedule-extras="cat.code === 'P'"
        :inline-edit-non-default="cat.code === 'P'"
        :dark-inputs="cat.code === 'P'"
        :lock-default-document-name="cat.code === 'P'"
        :show-apply-sidebar-column="cat.code === 'P'"
        :is-dynamic="cat.code === 'E'"
        :sync-label="cat.code === 'E' ? '同步分項工程' : undefined"
        :sync-title="
          cat.code === 'E'
            ? '依目前版本分項工程重新同步 E／S 類共用的自主檢查來源（{分項名稱}自主檢查表；覆寫既有 E 類項目）'
            : undefined
        "
        @add="(data) => handleAdd(cat.code, data)"
        @update="(id, data) => handleUpdate(cat.code, id, data)"
        @toggle-apply-sidebar="(id, value) => handleToggleApplySidebar(cat.code, id, value)"
        @delete="(id) => handleDelete(id)"
        @reorder="handleReorder"
        @sync="() => cat.code === 'E' && handleSyncE()"
      >
        <template v-if="cat.code === 'P'" #headerActions>
          <button
            type="button"
            class="btn btn-sm btn-outline-primary"
            title="預覽監造 B 類自訂項目與規定提送日程，並可複製至本類別"
            @click="openSupervisoryModal"
          >
            <i class="fa fa-eye me-1"></i>
            監造填寫預覽
          </button>
        </template>
        <template v-if="cat.code === 'P'" #planScheduleExtras="{ item }">
          <template v-if="item.isDefault">
            <td class="text-muted small text-center align-middle">—</td>
            <td class="text-muted small text-center align-middle">—</td>
            <td class="text-muted small text-center align-middle">—</td>
          </template>
          <template v-else>
            <td class="align-middle">
              <RepublicDatePicker
                v-if="pPlanScheduleFor(item.id)"
                v-model="pPlanScheduleFor(item.id)!.plannedConstructionDate"
                input-class="form-control form-control-sm p1-date-input"
                placeholder="請選擇"
                value-format="YYYY-MM-DD"
                auto-apply
                @update:model-value="scheduleSavePPlanSchedule"
              />
            </td>
            <td class="align-middle">
              <RepublicDatePicker
                v-if="pPlanScheduleFor(item.id)"
                v-model="pPlanScheduleFor(item.id)!.plannedSubmissionDate"
                input-class="form-control form-control-sm p1-date-input"
                placeholder="請選擇"
                value-format="YYYY-MM-DD"
                auto-apply
                @update:model-value="scheduleSavePPlanSchedule"
              />
            </td>
            <td class="align-middle">
              <input
                v-if="pPlanScheduleFor(item.id)"
                v-model="pPlanScheduleFor(item.id)!.remark"
                type="text"
                class="form-control form-control-sm"
                @input="scheduleSavePPlanSchedule"
              />
            </td>
          </template>
        </template>
      </CategoryTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, getCurrentInstance, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import {
  contractorDocumentClassificationApi,
  type ContractorDocumentClassification,
  type SupervisoryBNonDefaultRow
} from '@/api/contractorDocumentClassification'
import type { DocumentClassification } from '@/api/documentClassification'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import CategoryTable from '@/components/document/CategoryTable.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import { getConstructionDetail, updateConstruction } from '@/api/construction'
import { requestContractorPMenuSidebarRefresh } from '@/utils/contractorPMenuSidebar'
import { requestContractorDocClassSidebarRefresh } from '@/utils/contractorDocClassSidebar'

/**
 * 編輯分類表後，無條件雙 dispatch：
 *  - `contractor-sidebar-p-menu-refresh`：既有 P 類動態項目（沿用 `app-contractor-sidebar-menu` 內 P-menu loader）
 *  - `contractor-sidebar-doc-class-refresh`：新增 6 類動態書架（B/E/G/R/T/Q）
 *
 * 與監造端對稱：handler 不依分類條件挑選，因為「重複請求成本低，且分類錯置時更安全」。
 */
const refreshContractorSidebar = (): void => {
  requestContractorPMenuSidebarRefresh()
  requestContractorDocClassSidebarRefresh()
}

const categories = [
  { code: 'P', name: 'P類-計畫書' },
  { code: 'B', name: 'B類-估驗' },
  { code: 'E', name: 'E類-自主檢查' },
  { code: 'S', name: 'S類-施工安全衛生自主檢查' },
  { code: 'G', name: 'G類-進度報告' },
  { code: 'R', name: 'R類-會議紀錄' },
  { code: 'T', name: 'T類-試驗報告' },
  { code: 'Q', name: 'Q類-品質缺失改善' }
]

const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { isContractor } = useViewPerspective()
const instance = getCurrentInstance()
const proxy = instance?.proxy as any

const currentProject = computed(() => workspaceStore.currentProject)
const hasCurrentProject = computed(() => !!currentProject.value?.id)
const constructionId = computed(() => currentProject.value?.id ?? '')

const loading = ref(false)
const isCopying = ref(false)
const allItems = ref<ContractorDocumentClassification[]>([])
const selectedDesignChangeId = ref<number | null>(null)

const showSupervisoryModal = ref(false)
const modalSupervisoryDesignChangeId = ref<number | null>(null)
const supervisoryPreviewRows = ref<SupervisoryBNonDefaultRow[]>([])
const supervisoryPreviewLoading = ref(false)
const isCopyingSupervisoryToP = ref(false)

type PPlanScheduleRow = {
  documentClassificationId: number
  plannedConstructionDate: string
  plannedSubmissionDate: string
  remark: string
}
const pPlanScheduleById = ref<Record<number, Omit<PPlanScheduleRow, 'documentClassificationId'>>>({})
let pPlanScheduleSaveTimer: number | null = null

function parsePPlanScheduleSaved(
  json: string | null | undefined
): Record<number, { plannedConstructionDate: string; plannedSubmissionDate: string; remark: string }> {
  const out: Record<number, { plannedConstructionDate: string; plannedSubmissionDate: string; remark: string }> = {}
  if (!json || !String(json).trim()) return out
  try {
    const arr = JSON.parse(json) as Array<{
      documentClassificationId?: number
      plannedConstructionDate?: string
      plannedSubmissionDate?: string
      remark?: string
    }>
    if (!Array.isArray(arr)) return out
    for (const r of arr) {
      if (r && typeof r.documentClassificationId === 'number') {
        out[r.documentClassificationId] = {
          plannedConstructionDate: r.plannedConstructionDate ?? '',
          plannedSubmissionDate: r.plannedSubmissionDate ?? '',
          remark: r.remark ?? ''
        }
      }
    }
  } catch {
    /* ignore */
  }
  return out
}

function currentPNonDefaultIds(): number[] {
  return allItems.value.filter((i) => i.category === 'P' && !i.isDefault).map((i) => i.id)
}

function pPlanScheduleFor(id: number) {
  if (!pPlanScheduleById.value[id]) {
    pPlanScheduleById.value = {
      ...pPlanScheduleById.value,
      [id]: { plannedConstructionDate: '', plannedSubmissionDate: '', remark: '' }
    }
  }
  return pPlanScheduleById.value[id]
}

function buildPPlanScheduleJson(): string {
  const ids = new Set(currentPNonDefaultIds())
  const rows: PPlanScheduleRow[] = []
  for (const [k, v] of Object.entries(pPlanScheduleById.value)) {
    const id = Number(k)
    if (!Number.isFinite(id) || !ids.has(id)) continue
    rows.push({
      documentClassificationId: id,
      plannedConstructionDate: v.plannedConstructionDate || '',
      plannedSubmissionDate: v.plannedSubmissionDate || '',
      remark: v.remark ?? ''
    })
  }
  // 穩定排序（避免每次儲存 JSON 順序飄移）
  rows.sort((a, b) => a.documentClassificationId - b.documentClassificationId)
  return JSON.stringify(rows)
}

async function loadPPlanSchedule() {
  const cid = constructionId.value
  const wid = currentProject.value?.workspaceId
  if (!cid || !wid) {
    pPlanScheduleById.value = {}
    return
  }
  try {
    const detail = await getConstructionDetail(cid, wid, 'CONTRACTOR', selectedDesignChangeId.value)
    const parsed = parsePPlanScheduleSaved((detail as any)?.p1CustomPPlanScheduleJson)
    const next: Record<number, { plannedConstructionDate: string; plannedSubmissionDate: string; remark: string }> = {}
    for (const id of currentPNonDefaultIds()) {
      next[id] = parsed[id] ?? { plannedConstructionDate: '', plannedSubmissionDate: '', remark: '' }
    }
    pPlanScheduleById.value = next
  } catch (e) {
    console.error(e)
    pPlanScheduleById.value = {}
  }
}

function scheduleSavePPlanSchedule() {
  if (pPlanScheduleSaveTimer != null) window.clearTimeout(pPlanScheduleSaveTimer)
  pPlanScheduleSaveTimer = window.setTimeout(() => {
    pPlanScheduleSaveTimer = null
    void savePPlanSchedule()
  }, 500)
}

async function savePPlanSchedule() {
  const cid = constructionId.value
  if (!cid) return
  try {
    await updateConstruction(
      cid,
      {
        p1CustomPPlanScheduleJson: buildPPlanScheduleJson()
      } as any,
      selectedDesignChangeId.value
    )
  } catch (e) {
    console.error(e)
    if (proxy?.$toast) proxy.$toast.error('儲存 P 類日期/備註失敗')
  }
}

function toTableRow(row: ContractorDocumentClassification): DocumentClassification {
  return {
    id: row.id,
    constructionId: row.constructionId,
    designChangeId: row.designChangeId,
    category: row.category,
    categoryDisplayName: row.categoryDisplayName,
    itemNumber: row.itemNumber,
    documentName: row.documentName,
    retentionYears: row.retentionYears,
    requiredSubmissionSchedule: row.requiredSubmissionSchedule ?? undefined,
    applyToSidebar: row.category === 'P' ? row.applyToSidebar !== false : row.applyToSidebar,
    isDefault: row.isDefault,
    isLocked: row.isLocked,
    subdivisionWorkItemId: row.subdivisionWorkItemId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy
  }
}

const groupedItems = computed(() => {
  const groups: Record<string, DocumentClassification[]> = {}
  categories.forEach((c) => {
    groups[c.code] = []
  })
  allItems.value.forEach((item) => {
    if (groups[item.category]) {
      groups[item.category].push(toTableRow(item))
    }
  })
  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) => a.itemNumber.localeCompare(b.itemNumber))
  })
  return groups
})

function parseDesignChangeIdFromQuery(raw: unknown): number | null {
  if (raw == null) return null
  const s = Array.isArray(raw) ? raw[0] : String(raw)
  if (!s || s === '') return null
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

/** 網址帶 `?designChangeId=` 時與 P-1 等頁面切到相同變更設計版本 */
function syncDesignChangeFromRoute() {
  selectedDesignChangeId.value = parseDesignChangeIdFromQuery(route.query.designChangeId)
}

async function loadData() {
  const cid = constructionId.value
  if (!cid) return
  loading.value = true
  try {
    allItems.value = await contractorDocumentClassificationApi.getAll(cid, selectedDesignChangeId.value)
    await loadPPlanSchedule()
  } catch (error) {
    console.error(error)
    if (proxy?.$toast) proxy.$toast.error('無法載入分類表')
  } finally {
    loading.value = false
  }
}

async function onVersionChange(versionId: number | null) {
  selectedDesignChangeId.value = versionId
  await loadData()
}

function openSupervisoryModal() {
  showSupervisoryModal.value = true
  modalSupervisoryDesignChangeId.value = null
  void loadSupervisoryPreview()
}

async function onModalSupervisoryVersionChange(versionId: number | null) {
  modalSupervisoryDesignChangeId.value = versionId
  await loadSupervisoryPreview()
}

async function loadSupervisoryPreview() {
  const cid = constructionId.value
  if (!cid) return
  supervisoryPreviewLoading.value = true
  try {
    supervisoryPreviewRows.value = await contractorDocumentClassificationApi.getSupervisoryBCustomPreview(
      cid,
      modalSupervisoryDesignChangeId.value
    )
  } catch (e) {
    console.error(e)
    supervisoryPreviewRows.value = []
    if (proxy?.$toast) proxy.$toast.error('無法載入監造 B 類資料')
  } finally {
    supervisoryPreviewLoading.value = false
  }
}

async function copySupervisoryBToP() {
  const cid = constructionId.value
  if (!cid) return
  if (
    !confirm(
      '確定將「目前選取之監造版本」的自訂 B 類複製到「營造目前版本」的 P 類？\n將刪除營造 P 類所有自訂列並重建，P 類預設列不變。'
    )
  ) {
    return
  }
  isCopyingSupervisoryToP.value = true
  try {
    allItems.value = await contractorDocumentClassificationApi.copySupervisoryBToContractorP(cid, {
      supervisoryDesignChangeId: modalSupervisoryDesignChangeId.value,
      contractorDesignChangeId: selectedDesignChangeId.value
    })
    refreshContractorSidebar()
    if (proxy?.$toast) proxy.$toast.success('已複製到營造 P 類')
    showSupervisoryModal.value = false
  } catch (e: any) {
    console.error(e)
    const msg = e?.response?.data?.message ?? e?.message ?? '複製失敗'
    if (proxy?.$toast) proxy.$toast.error(msg)
  } finally {
    isCopyingSupervisoryToP.value = false
  }
}

async function copyFromPrevious() {
  const cid = constructionId.value
  const tid = selectedDesignChangeId.value
  if (!cid || tid == null) return
  if (!confirm('確定以「上一變更設計版本」覆寫目前版本的文件分類表？此操作無法復原。')) return
  isCopying.value = true
  try {
    await contractorDocumentClassificationApi.copyFromPrevious(cid, tid)
    refreshContractorSidebar()
    if (proxy?.$toast) proxy.$toast.success('已複製並覆寫')
    await loadData()
  } catch (e) {
    console.error(e)
    if (proxy?.$toast) proxy.$toast.error('複製失敗')
  } finally {
    isCopying.value = false
  }
}

async function handleAdd(
  category: string,
  data: { documentName: string; retentionYears: number | null; requiredSubmissionSchedule?: string }
) {
  const cid = constructionId.value
  if (!cid) return
  try {
    const created = await contractorDocumentClassificationApi.create(cid, selectedDesignChangeId.value, {
      category,
      documentName: data.documentName,
      retentionYears: data.retentionYears,
      ...(category === 'P' ? { requiredSubmissionSchedule: data.requiredSubmissionSchedule ?? '' } : {})
    })
    allItems.value = [...allItems.value, created]
    // 不再依分類條件挑選；任何分類新增都同時刷新 P 類與 6 類動態書架。
    refreshContractorSidebar()
    if (proxy?.$toast) proxy.$toast.success('新增成功')
  } catch (error) {
    console.error(error)
    if (proxy?.$toast) proxy.$toast.error('新增失敗')
  }
}

async function handleUpdate(
  _category: string,
  id: number,
  data: {
    documentName: string
    retentionYears?: number | null
    retentionPermanent?: boolean
    requiredSubmissionSchedule?: string
    applyToSidebar?: boolean
  }
) {
  const cid = constructionId.value
  if (!cid) return
  try {
    const updated = await contractorDocumentClassificationApi.update(cid, id, selectedDesignChangeId.value, {
      documentName: data.documentName,
      retentionYears: data.retentionPermanent ? undefined : data.retentionYears,
      retentionPermanent: data.retentionPermanent === true ? true : undefined,
      applyToSidebar: data.applyToSidebar,
      ...(_category === 'P' && data.requiredSubmissionSchedule !== undefined
        ? { requiredSubmissionSchedule: data.requiredSubmissionSchedule ?? '' }
        : {})
    })
    allItems.value = allItems.value.map((item) => (item.id === id ? updated : item))
    refreshContractorSidebar()
    if (proxy?.$toast) proxy.$toast.success('更新成功')
  } catch (error) {
    console.error(error)
    if (proxy?.$toast) proxy.$toast.error('更新失敗')
  }
}

async function handleDelete(id: number) {
  const cid = constructionId.value
  if (!cid) return
  try {
    const deleted = allItems.value.find((item) => item.id === id)
    await contractorDocumentClassificationApi.delete(cid, id, selectedDesignChangeId.value)
    allItems.value = allItems.value.filter((item) => item.id !== id)
    refreshContractorSidebar()
    if (proxy?.$toast) proxy.$toast.success('刪除成功')
  } catch (error) {
    console.error(error)
    if (proxy?.$toast) proxy.$toast.error('刪除失敗')
  }
}

async function handleReorder(items: DocumentClassification[]) {
  const cid = constructionId.value
  if (!cid || items.length === 0) return
  try {
    const batchItems = items.map((item) => ({
      id: item.id,
      itemNumber: item.itemNumber,
      documentName: item.documentName,
      retentionYears: item.retentionYears,
      applyToSidebar: item.applyToSidebar,
      ...(item.category === 'P' ? { requiredSubmissionSchedule: item.requiredSubmissionSchedule ?? '' } : {})
    }))
    await contractorDocumentClassificationApi.batchUpdate(cid, selectedDesignChangeId.value, batchItems)
    await loadData()
    refreshContractorSidebar()
    if (proxy?.$toast) proxy.$toast.success('順序已儲存')
  } catch (error) {
    console.error(error)
    if (proxy?.$toast) proxy.$toast.error('排序儲存失敗')
    await loadData()
  }
}

async function handleToggleApplySidebar(category: string, id: number, applyToSidebar: boolean) {
  if (category !== 'P') return
  const cid = constructionId.value
  if (!cid) return
  const target = allItems.value.find((item) => item.id === id)
  if (!target) return
  try {
    const updated = await contractorDocumentClassificationApi.update(cid, id, selectedDesignChangeId.value, {
      applyToSidebar,
      documentName: target.documentName,
      retentionYears: target.retentionYears ?? undefined,
      ...(typeof target.requiredSubmissionSchedule === 'string'
        ? { requiredSubmissionSchedule: target.requiredSubmissionSchedule }
        : {})
    })
    allItems.value = allItems.value.map((item) => (item.id === id ? updated : item))
    refreshContractorSidebar()
    if (proxy?.$toast) proxy.$toast.success('已更新側邊欄套用設定')
  } catch (error) {
    console.error(error)
    if (proxy?.$toast) proxy.$toast.error('更新側邊欄套用設定失敗')
    await loadData()
  }
}

async function handleSyncE() {
  const cid = constructionId.value
  if (!cid) return
  if (
    !confirm(
      '確定要根據分項工程同步 E／S 類嗎？E 類自主檢查表與 S 類安全衛生自主檢查表都會依目前分項工程重新建立。'
    )
  ) {
    return
  }
  try {
    await contractorDocumentClassificationApi.syncCategoryE(cid, selectedDesignChangeId.value)
    if (proxy?.$toast) proxy.$toast.success('E／S 類同步完成')
    await loadData()
    refreshContractorSidebar()
  } catch (error: any) {
    console.error(error)
    const msg = error?.response?.data?.message ?? error?.message ?? '同步失敗'
    if (proxy?.$toast) proxy.$toast.error(msg)
  }
}

async function confirmResetVersion() {
  const cid = constructionId.value
  if (!cid) return
  const ver =
    selectedDesignChangeId.value == null ? '原契約' : `變更設計（ID ${selectedDesignChangeId.value}）`
  if (!confirm(`警告：確定將「${ver}」的文件分類表恢復為預設值？自訂項目將一併刪除。`)) return
  try {
    allItems.value = await contractorDocumentClassificationApi.resetAll(cid, selectedDesignChangeId.value)
    refreshContractorSidebar()
    if (proxy?.$toast) proxy.$toast.success('已恢復預設值')
  } catch (error) {
    console.error(error)
    if (proxy?.$toast) proxy.$toast.error('恢復失敗')
  }
}

watch(constructionId, (cid) => {
  if (cid) void loadData()
  else {
    allItems.value = []
    pPlanScheduleById.value = {}
  }
})

watch(
  () => route.query.designChangeId,
  () => {
    syncDesignChangeFromRoute()
    if (constructionId.value) void loadData()
  }
)

onMounted(async () => {
  if (!workspaceStore.currentWorkspace) {
    await workspaceStore.initWorkspaces()
  }
  syncDesignChangeFromRoute()
  if (constructionId.value) {
    await loadData()
  }
})

onUnmounted(() => {
  if (pPlanScheduleSaveTimer != null) window.clearTimeout(pPlanScheduleSaveTimer)
  pPlanScheduleSaveTimer = null
})
</script>

<style scoped>
.supervisory-preview-report-card {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  color: var(--bs-body-color);
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: 0.375rem;
  overflow: hidden;
}

.supervisory-preview-report-card__body {
  padding: 0;
}

.contractor-supervisory-modal-title {
  font-size: 1.1rem;
  line-height: 1.3;
}
</style>
