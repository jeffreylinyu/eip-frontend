<template>
  <div class="floor-plan-pins-page">
    <PageHeader title="工地平面圖點位" icon="fa fa-map-pin" :breadcrumbs="breadcrumbs">
      <template #extra>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="btn btn-sm btn-outline-light"
            :disabled="!hasCurrentProject || uploading"
            @click="triggerUpload"
          >
            <i class="fa fa-upload me-1"></i>{{ uploading ? '上傳中…' : '上傳平面圖' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            class="d-none"
            accept="image/*,application/pdf"
            multiple
            @change="onFilesPicked"
          />
        </div>
      </template>
    </PageHeader>

    <div v-if="!hasCurrentProject" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>請先於左側選擇工程案。
    </div>

    <template v-else>
      <!-- 變更設計版本切換（僅有變更設計時顯示；平面圖依版本分開維護） -->
      <DesignChangeVersionSwitcher
        v-model="selectedDesignChangeId"
        :construction-id="constructionId ?? undefined"
        :source-type="designSourceType"
        class="mb-2"
      />

      <!-- 平面圖文件分頁（桌機；手機改用全螢幕地圖頂列的下拉） -->
      <div v-if="!isMobile && plans.length > 0" class="fp-plan-tabs mb-2">
        <button
          v-for="plan in plans"
          :key="plan.id"
          type="button"
          class="fp-plan-tab"
          :class="{ 'fp-plan-tab--active': plan.id === activePlanId }"
          @click="selectPlan(plan.id)"
        >
          {{ plan.name }}
          <span class="fp-plan-tab__pages">{{ plan.pages.length }}頁</span>
        </button>
      </div>

      <div v-if="loading" class="text-center text-muted py-5">
        <i class="fa fa-spinner fa-spin me-2"></i>載入中…
      </div>

      <div v-else-if="plans.length === 0" class="alert alert-info mb-0">
        <i class="fa fa-info-circle me-2"></i>尚未上傳任何平面圖，點右上角「上傳平面圖」開始。支援圖檔與 PDF（多頁）。
      </div>

      <!-- 桌機主版面（手機改用下方全螢幕地圖 overlay） -->
      <div v-else-if="!isMobile" class="row g-3">
        <!-- 圖面區 -->
        <div class="col-lg-8">
          <Card class="report-card">
            <CardBody>
              <!-- 文件操作 + 頁碼導覽 -->
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <div class="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="addMode ? 'btn-warning' : 'btn-outline-primary'"
                    @click="addMode = !addMode"
                  >
                    <i class="fa fa-map-pin me-1"></i>{{ addMode ? '取消放置' : '新增圖釘' }}
                  </button>
                </div>

                <div v-if="activePlan && activePlan.pages.length > 1" class="d-flex align-items-center gap-2">
                  <button class="btn btn-sm btn-outline-secondary" :disabled="activePageIndex === 0" @click="activePageIndex--">
                    <i class="fa fa-chevron-left"></i>
                  </button>
                  <span class="small">第 {{ activePageIndex + 1 }} / {{ activePlan.pages.length }} 頁</span>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    :disabled="activePageIndex >= activePlan.pages.length - 1"
                    @click="activePageIndex++"
                  >
                    <i class="fa fa-chevron-right"></i>
                  </button>
                </div>

                <div class="d-flex align-items-center gap-1">
                  <button class="btn btn-sm btn-outline-light" title="重新命名" @click="renameActivePlan">
                    <i class="fa fa-pen"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" title="刪除此平面圖" @click="removeActivePlan">
                    <i class="fa fa-trash"></i>
                  </button>
                </div>
              </div>

              <FloorPlanCanvas
                :page="activePage"
                :pins="activePage?.pins ?? []"
                :selected-pin-id="selectedPinId"
                :add-mode="addMode"
                :construction-id="constructionId ?? ''"
                @add="onAddPin"
                @select="onSelectPin"
                @move="onMovePin"
              />
              <div class="text-muted small mt-2">
                <i class="fa fa-info-circle me-1"></i>
                滑鼠滾輪可縮放、拖曳可平移；拖曳圖釘可移動位置。
              </div>
            </CardBody>
          </Card>
        </div>

        <!-- 桌機：右側手風琴 -->
        <div v-if="!isMobile" class="col-lg-4">
          <Card class="report-card">
            <CardBody>
              <h6 class="mb-2">
                <i class="fa fa-list me-1"></i>本頁圖釘
                <span class="badge bg-secondary ms-1">{{ activePage?.pins.length ?? 0 }}</span>
              </h6>

              <div v-if="(activePage?.pins.length ?? 0) === 0" class="text-muted small py-3">
                此頁尚無圖釘。點「新增圖釘」後在圖面上點選位置。
              </div>

              <div v-else class="accordion fp-accordion">
                <div v-for="(pin, idx) in activePage!.pins" :key="pin.id" class="accordion-item">
                  <h2 class="accordion-header">
                    <button
                      type="button"
                      class="accordion-button"
                      :class="{ collapsed: selectedPinId !== pin.id }"
                      @click="onSelectPin(selectedPinId === pin.id ? '' : pin.id)"
                    >
                      <span class="fp-accordion__no">{{ idx + 1 }}</span>
                      {{ pin.title || `圖釘 ${idx + 1}` }}
                      <span v-if="pin.links.length" class="badge bg-info ms-2">{{ pin.links.length }}</span>
                    </button>
                  </h2>
                  <div class="accordion-collapse collapse" :class="{ show: selectedPinId === pin.id }">
                    <div class="accordion-body">
                      <FloorPlanPinDetail
                        :pin="pin"
                        :linkable-items="linkableItems"
                        :saving="savingPinId === pin.id"
                        :design-change-id="selectedDesignChangeId"
                        @save="onSavePin(pin, $event)"
                        @delete="onDeletePin(pin)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- 手機：平面圖清單（點選進入全螢幕地圖） -->
      <div v-else class="fp-mobile-list">
        <button
          v-for="plan in plans"
          :key="plan.id"
          type="button"
          class="fp-mobile-list__item"
          @click="openMobileMap(plan.id)"
        >
          <i class="fa fa-map fp-mobile-list__icon"></i>
          <span class="fp-mobile-list__text">
            <span class="fp-mobile-list__name">{{ plan.name }}</span>
            <span class="fp-mobile-list__meta">{{ plan.pages.length }} 頁 · {{ pinCount(plan) }} 圖釘</span>
          </span>
          <i class="fa fa-chevron-right text-muted"></i>
        </button>
      </div>
    </template>

    <!-- 手機：Google Map 式全螢幕地圖 -->
    <teleport to="body">
      <div v-if="mobileMapOpen" class="fp-mobile">
        <!-- 頂部浮動控制列 -->
        <div class="fp-mobile__bar">
          <button class="fp-mobile__btn" title="返回清單" @click="closeMobileMap">
            <i class="fa fa-arrow-left"></i>
          </button>
          <select
            class="form-select form-select-sm fp-mobile__plan"
            :value="activePlanId ?? ''"
            @change="selectPlan(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <button class="fp-mobile__btn" title="上傳平面圖" @click="triggerUpload">
            <i class="fa" :class="uploading ? 'fa-spinner fa-spin' : 'fa-upload'"></i>
          </button>
          <button class="fp-mobile__btn" title="重新命名" @click="renameActivePlan">
            <i class="fa fa-pen"></i>
          </button>
          <button class="fp-mobile__btn fp-mobile__btn--danger" title="刪除" @click="removeActivePlan">
            <i class="fa fa-trash"></i>
          </button>
        </div>

        <!-- 多頁導覽 -->
        <div v-if="activePlan && activePlan.pages.length > 1" class="fp-mobile__pages">
          <button :disabled="activePageIndex === 0" @click="activePageIndex--">
            <i class="fa fa-chevron-left"></i>
          </button>
          <span>{{ activePageIndex + 1 }} / {{ activePlan.pages.length }}</span>
          <button :disabled="activePageIndex >= activePlan.pages.length - 1" @click="activePageIndex++">
            <i class="fa fa-chevron-right"></i>
          </button>
        </div>

        <FloorPlanCanvas
          fullscreen
          :page="activePage"
          :pins="activePage?.pins ?? []"
          :selected-pin-id="selectedPinId"
          :add-mode="addMode"
          :construction-id="constructionId ?? ''"
          @add="onAddPin"
          @select="onSelectPin"
          @move="onMovePin"
        />

        <!-- 新增圖釘 FAB -->
        <button
          class="fp-mobile__fab"
          :class="{ 'fp-mobile__fab--active': addMode }"
          @click="addMode = !addMode"
        >
          <i class="fa" :class="addMode ? 'fa-times' : 'fa-map-pin'"></i>
        </button>
      </div>
    </teleport>

    <!-- 手機：底部 Bottom Sheet -->
    <teleport to="body">
      <div v-if="isMobile && selectedPin" class="fp-sheet-backdrop" @click="closeSheet"></div>
      <div
        v-if="isMobile"
        class="fp-sheet"
        :class="{ 'fp-sheet--open': !!selectedPin, 'fp-sheet--expanded': sheetExpanded }"
      >
        <div
          class="fp-sheet__handle"
          @pointerdown="onHandleDown"
        >
          <span class="fp-sheet__bar"></span>
        </div>
        <div v-if="selectedPin" class="fp-sheet__header">
          <strong>{{ selectedPin.title || '圖釘' }}</strong>
          <button class="btn btn-sm btn-link text-light" @click="closeSheet">
            <i class="fa fa-times"></i>
          </button>
        </div>
        <div v-if="selectedPin" class="fp-sheet__body">
          <FloorPlanPinDetail
            :pin="selectedPin"
            :linkable-items="linkableItems"
            :saving="savingPinId === selectedPin.id"
            :design-change-id="selectedDesignChangeId"
            @save="onSavePin(selectedPin, $event)"
            @delete="onDeletePin(selectedPin)"
          />
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import FloorPlanCanvas from '@/components/floor-plan/FloorPlanCanvas.vue'
import FloorPlanPinDetail from '@/components/floor-plan/FloorPlanPinDetail.vue'
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import toastService from '@/components/bootstrap/ToastService.js'
import {
  listFloorPlans,
  listLinkableItems,
  uploadFloorPlans,
  renameFloorPlan,
  deleteFloorPlan,
  createPin,
  updatePin,
  deletePin,
  type FloorPlan,
  type FloorPlanPage,
  type FloorPlanPin,
  type LinkableItem
} from '@/api/floorPlans'

const breadcrumbs = [
  { text: '工地管理', href: 'javascript:;' },
  { text: '工地平面圖點位', active: true }
]

const workspaceStore = useWorkspaceStore()
const constructionId = computed<string | null>(() => workspaceStore.currentProject?.id ?? null)
const hasCurrentProject = computed(() => !!constructionId.value)

// 視角 → 變更設計列表來源（監造／營造分開維護）
const { isContractor } = useViewPerspective()
const designSourceType = computed<'CONTRACTOR' | 'SUPERVISORY'>(() =>
  isContractor.value ? 'CONTRACTOR' : 'SUPERVISORY'
)
// 當前選定的變更設計版本（null = 原契約）
const selectedDesignChangeId = ref<number | null>(null)

/** 從後端錯誤物件取出可顯示訊息 */
function errMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

const plans = ref<FloorPlan[]>([])
const linkableItems = ref<LinkableItem[]>([])
const loading = ref(false)
const uploading = ref(false)

const activePlanId = ref<string | null>(null)
const activePageIndex = ref(0)
const selectedPinId = ref<string | null>(null)
const addMode = ref(false)
const savingPinId = ref<string | null>(null)
// 手機：是否已進入全螢幕地圖（由使用者點清單項目進入、頂列返回鍵離開）
const mobileFullscreen = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

/* ---------- 響應式：桌機 / 手機 ---------- */
const isMobile = ref(false)
let mql: MediaQueryList | null = null
function syncIsMobile(e?: MediaQueryListEvent) {
  isMobile.value = e ? e.matches : !!mql?.matches
}

/* ---------- 計算屬性 ---------- */
const activePlan = computed<FloorPlan | null>(
  () => plans.value.find((p) => p.id === activePlanId.value) ?? null
)
const activePage = computed<FloorPlanPage | null>(
  () => activePlan.value?.pages[activePageIndex.value] ?? null
)
const selectedPin = computed<FloorPlanPin | null>(() => {
  if (!selectedPinId.value) return null
  for (const p of plans.value) {
    for (const pg of p.pages) {
      const pin = pg.pins.find((x) => x.id === selectedPinId.value)
      if (pin) return pin
    }
  }
  return null
})

/** 手機全螢幕地圖開啟條件：手機 + 有工程 + 有平面圖 + 使用者已進入 */
const mobileMapOpen = computed(
  () =>
    isMobile.value &&
    hasCurrentProject.value &&
    plans.value.length > 0 &&
    mobileFullscreen.value
)
function pinCount(plan: FloorPlan): number {
  return plan.pages.reduce((sum, pg) => sum + pg.pins.length, 0)
}
function openMobileMap(planId: string) {
  selectPlan(planId)
  mobileFullscreen.value = true
}
function closeMobileMap() {
  mobileFullscreen.value = false
  addMode.value = false
  selectedPinId.value = null
}
// 全螢幕地圖開啟時鎖背景捲動
watch(mobileMapOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

/* ---------- 載入 ---------- */
async function loadAll() {
  const cid = constructionId.value
  if (!cid) return
  loading.value = true
  try {
    const dcId = selectedDesignChangeId.value
    const [planList, items] = await Promise.all([
      listFloorPlans(cid, dcId),
      listLinkableItems(cid, dcId)
    ])
    plans.value = planList
    linkableItems.value = items
    if (!activePlanId.value || !plans.value.some((p) => p.id === activePlanId.value)) {
      activePlanId.value = plans.value[0]?.id ?? null
      activePageIndex.value = 0
    }
  } catch (e) {
    console.error('[FloorPlan] 載入失敗', e)
    toastService.error(errMessage(e, '平面圖載入失敗，請稍後再試。'))
  } finally {
    loading.value = false
  }
}

function selectPlan(id: string) {
  activePlanId.value = id
  activePageIndex.value = 0
  selectedPinId.value = null
  addMode.value = false
}

/* ---------- 上傳 ---------- */
function triggerUpload() {
  fileInputRef.value?.click()
}
async function onFilesPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0 || !constructionId.value) return
  uploading.value = true
  try {
    const created = await uploadFloorPlans(constructionId.value, selectedDesignChangeId.value, files)
    await loadAll()
    if (created[0]?.id) selectPlan(created[0].id)
    toastService.success(`已上傳 ${created.length} 份平面圖`)
  } catch (err) {
    console.error('[FloorPlan] 上傳失敗', err)
    toastService.error(errMessage(err, '上傳失敗，請確認檔案大小與格式後再試。'))
  } finally {
    uploading.value = false
  }
}

/* ---------- 圖釘 ---------- */
async function onAddPin(payload: { xRatio: number; yRatio: number }) {
  const cid = constructionId.value
  const page = activePage.value
  if (!cid || !page) return
  try {
    const pin = await createPin(cid, { pageId: page.id, xRatio: payload.xRatio, yRatio: payload.yRatio })
    page.pins.push(pin)
    addMode.value = false
    onSelectPin(pin.id)
  } catch (e) {
    console.error('[FloorPlan] 新增圖釘失敗', e)
    toastService.error(errMessage(e, '新增圖釘失敗，請稍後再試。'))
  }
}

function onSelectPin(pinId: string) {
  selectedPinId.value = pinId || null
  if (isMobile.value && pinId) sheetExpanded.value = false
}

let moveTimer: ReturnType<typeof setTimeout> | null = null
function onMovePin(payload: { pinId: string; xRatio: number; yRatio: number }) {
  const page = activePage.value
  const pin = page?.pins.find((p) => p.id === payload.pinId)
  if (!pin) return
  pin.xRatio = payload.xRatio
  pin.yRatio = payload.yRatio
  if (moveTimer) clearTimeout(moveTimer)
  const cid = constructionId.value
  if (!cid) return
  moveTimer = setTimeout(() => {
    updatePin(cid, payload.pinId, { xRatio: payload.xRatio, yRatio: payload.yRatio }).catch((e) => {
      console.error('[FloorPlan] 更新位置失敗', e)
      toastService.error(errMessage(e, '圖釘位置儲存失敗。'))
    })
  }, 400)
}

async function onSavePin(pin: FloorPlanPin, payload: { title: string; note: string; linkedItemIds: string[] }) {
  const cid = constructionId.value
  if (!cid) return
  savingPinId.value = pin.id
  try {
    const updated = await updatePin(cid, pin.id, payload)
    Object.assign(pin, updated)
    toastService.success('圖釘已儲存')
  } catch (e) {
    console.error('[FloorPlan] 儲存圖釘失敗', e)
    toastService.error(errMessage(e, '儲存失敗，請稍後再試。'))
  } finally {
    savingPinId.value = null
  }
}

async function onDeletePin(pin: FloorPlanPin) {
  const cid = constructionId.value
  if (!cid) return
  if (!confirm('確定要刪除此圖釘？')) return
  try {
    await deletePin(cid, pin.id)
    const page = activePage.value
    if (page) page.pins = page.pins.filter((p) => p.id !== pin.id)
    if (selectedPinId.value === pin.id) selectedPinId.value = null
  } catch (e) {
    console.error('[FloorPlan] 刪除圖釘失敗', e)
    toastService.error(errMessage(e, '刪除圖釘失敗，請稍後再試。'))
  }
}

/* ---------- 文件操作 ---------- */
async function renameActivePlan() {
  const plan = activePlan.value
  const cid = constructionId.value
  if (!plan || !cid) return
  const name = prompt('平面圖名稱', plan.name)
  if (name == null) return
  const trimmed = name.trim()
  if (!trimmed) return
  try {
    await renameFloorPlan(cid, plan.id, trimmed)
    plan.name = trimmed
  } catch (e) {
    console.error('[FloorPlan] 重新命名失敗', e)
    toastService.error(errMessage(e, '重新命名失敗，請稍後再試。'))
  }
}

async function removeActivePlan() {
  const plan = activePlan.value
  const cid = constructionId.value
  if (!plan || !cid) return
  if (!confirm(`確定要刪除平面圖「${plan.name}」？此操作會一併移除其所有圖釘。`)) return
  try {
    await deleteFloorPlan(cid, plan.id)
    await loadAll()
    toastService.success('已刪除平面圖')
  } catch (e) {
    console.error('[FloorPlan] 刪除平面圖失敗', e)
    toastService.error(errMessage(e, '刪除平面圖失敗，請稍後再試。'))
  }
}

/* ---------- 手機 bottom sheet 拖曳 ---------- */
const sheetExpanded = ref(false)
let dragStartY = 0
function onHandleDown(e: PointerEvent) {
  dragStartY = e.clientY
  window.addEventListener('pointerup', onHandleUp, { once: true })
}
function onHandleUp(e: PointerEvent) {
  const dy = e.clientY - dragStartY
  if (dy < -40) sheetExpanded.value = true
  else if (dy > 40) {
    if (sheetExpanded.value) sheetExpanded.value = false
    else closeSheet()
  }
}
function closeSheet() {
  selectedPinId.value = null
  sheetExpanded.value = false
}

/* ---------- 生命週期 ---------- */
watch(constructionId, () => {
  activePlanId.value = null
  selectedPinId.value = null
  mobileFullscreen.value = false
  loadAll()
})
// 切換變更設計版本：重置選取並重載該版本的平面圖與可連結項目
watch(selectedDesignChangeId, () => {
  activePlanId.value = null
  selectedPinId.value = null
  mobileFullscreen.value = false
  loadAll()
})
watch(activePageIndex, () => {
  selectedPinId.value = null
})

onMounted(() => {
  mql = window.matchMedia('(max-width: 991.98px)')
  syncIsMobile()
  mql.addEventListener('change', syncIsMobile)
  loadAll()
})
onBeforeUnmount(() => {
  mql?.removeEventListener('change', syncIsMobile)
  if (moveTimer) clearTimeout(moveTimer)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.fp-plan-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fp-plan-tab {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
}
.fp-plan-tab--active {
  background: #0d6efd;
  border-color: #0d6efd;
  color: #fff;
}
.fp-plan-tab__pages {
  opacity: 0.7;
  font-size: 11px;
  margin-left: 6px;
}

.fp-accordion__no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: 999px;
  background: #0d6efd;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

/* 手機平面圖清單（進入全螢幕地圖的入口） */
.fp-mobile-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fp-mobile-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  border-radius: 10px;
  padding: 14px 16px;
}
.fp-mobile-list__icon {
  font-size: 20px;
  color: #0d6efd;
}
.fp-mobile-list__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
}
.fp-mobile-list__name {
  font-weight: 600;
}
.fp-mobile-list__meta {
  font-size: 12px;
  opacity: 0.65;
}

/* 手機全螢幕地圖 */
.fp-mobile {
  position: fixed;
  inset: 0;
  z-index: 1030;
  background: #111;
}
.fp-mobile__bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
}
.fp-mobile__plan {
  flex: 1 1 auto;
  min-width: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}
.fp-mobile__btn {
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fp-mobile__btn--danger {
  color: #ff6b6b;
}
.fp-mobile__pages {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 13px;
}
.fp-mobile__pages button {
  border: none;
  background: transparent;
  color: #fff;
  padding: 2px 6px;
}
.fp-mobile__pages button:disabled {
  opacity: 0.35;
}
.fp-mobile__fab {
  position: absolute;
  left: 16px;
  bottom: 22px;
  z-index: 6;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: #0d6efd;
  color: #fff;
  font-size: 20px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
}
.fp-mobile__fab--active {
  background: #ffc107;
  color: #212529;
}

/* Bottom sheet */
.fp-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1040;
}
.fp-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1050;
  background: var(--bs-body-bg, #1c1c1c);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
  transform: translateY(100%);
  transition: transform 0.25s ease, max-height 0.25s ease;
  max-height: 55vh;
  display: flex;
  flex-direction: column;
}
.fp-sheet--open {
  transform: translateY(0);
}
.fp-sheet--expanded {
  max-height: 88vh;
}
.fp-sheet__handle {
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
  cursor: grab;
  touch-action: none;
}
.fp-sheet__bar {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.3);
}
.fp-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.fp-sheet__body {
  padding: 12px 16px 24px;
  overflow-y: auto;
}
</style>
