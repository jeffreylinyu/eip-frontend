<template>
  <div class="fp-canvas" :class="{ 'fp-canvas--fullscreen': fullscreen }">
    <!--
      viewport = 固定大小的可視區（overflow:hidden）。
      content  = 受 transform(translate+scale) 控制的世界座標層，內含 img + 圖釘。
      圖釘以百分比定位於 content，縮放/平移時自動跟著走；座標換算用 img.getBoundingClientRect()
      （已反映 transform）故任何縮放等級都正確。
    -->
    <div
      ref="viewportRef"
      class="fp-canvas__viewport"
      :class="{ 'fp-canvas__viewport--add': addMode && !!displayUrl }"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dragstart.prevent
    >
      <div class="fp-canvas__content" :style="contentStyle">
        <img
          v-if="displayUrl"
          ref="imgRef"
          :src="displayUrl"
          class="fp-canvas__img"
          draggable="false"
          alt="平面圖"
          @load="onImgLoad"
        />

        <button
          v-for="(pin, idx) in pins"
          v-show="displayUrl"
          :key="pin.id"
          type="button"
          class="fp-pin"
          :class="{ 'fp-pin--active': pin.id === selectedPinId }"
          :style="pinStyle(pin)"
          :title="pin.title || `圖釘 ${idx + 1}`"
          @click.stop="$emit('select', pin.id)"
          @pointerdown.stop="onPinPointerDown($event, pin)"
        >
          <i class="fa fa-map-pin"></i>
          <span class="fp-pin__no">{{ idx + 1 }}</span>
        </button>
      </div>

      <!-- 無圖 / 載入中（不受 transform 影響，置中於 viewport） -->
      <div v-if="!displayUrl" class="fp-canvas__empty">
        <template v-if="imgLoading">
          <i class="fa fa-spinner fa-spin"></i>
          <span>載入中…</span>
        </template>
        <template v-else>
          <i class="fa fa-image"></i>
          <span>無底圖</span>
        </template>
      </div>

      <!-- 縮放控制 -->
      <div v-if="displayUrl" class="fp-canvas__controls">
        <button type="button" title="放大" @click.stop="zoomBy(1.25)"><i class="fa fa-plus"></i></button>
        <button type="button" title="縮小" @click.stop="zoomBy(0.8)"><i class="fa fa-minus"></i></button>
        <button type="button" title="重設" @click.stop="fitView"><i class="fa fa-expand"></i></button>
      </div>

      <div v-if="addMode && displayUrl" class="fp-canvas__hint">
        <i class="fa fa-crosshairs me-1"></i> 點擊圖面以放置圖釘
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import http from '@/api/http'
import type { FloorPlanPage, FloorPlanPin } from '@/api/floorPlans'

const props = defineProps<{
  page: FloorPlanPage | null
  pins: FloorPlanPin[]
  selectedPinId: string | null
  addMode: boolean
  constructionId: string
  fullscreen?: boolean
}>()

const emit = defineEmits<{
  (e: 'add', payload: { xRatio: number; yRatio: number }): void
  (e: 'select', pinId: string): void
  (e: 'move', payload: { pinId: string; xRatio: number; yRatio: number }): void
}>()

const viewportRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)

/* ---------- 圖片載入 ---------- */
const displayUrl = ref<string | null>(null)
const imgLoading = ref(false)
let blobObjectUrl: string | null = null

function revokeBlob() {
  if (blobObjectUrl) {
    URL.revokeObjectURL(blobObjectUrl)
    blobObjectUrl = null
  }
}

async function loadImage() {
  revokeBlob()
  const page = props.page
  if (!page) {
    displayUrl.value = null
    return
  }
  if (page.signedUrl) {
    displayUrl.value = page.signedUrl
    return
  }
  imgLoading.value = true
  displayUrl.value = null
  try {
    const raw = await http.get(
      `/management/construction/floor-plans/pages/${page.id}/download`,
      { params: { constructionId: props.constructionId }, responseType: 'blob' }
    )
    const blob = raw as unknown as Blob
    if (!(blob instanceof Blob) || blob.size === 0) return
    const url = URL.createObjectURL(blob)
    blobObjectUrl = url
    displayUrl.value = url
  } catch {
    displayUrl.value = null
  } finally {
    imgLoading.value = false
  }
}

watch(
  () => [props.page?.id, props.page?.signedUrl, props.constructionId] as const,
  () => void loadImage(),
  { immediate: true }
)

// displayUrl 變動後安排 fit（涵蓋 @load 因快取未觸發的情況）
watch(displayUrl, (url) => {
  if (url) scheduleFit()
})

onUnmounted(() => {
  revokeBlob()
  resizeObserver?.disconnect()
})

/* =========================================================================
 * 平移 / 縮放
 * ========================================================================= */
const MAX_SCALE = 8
const TAP_THRESHOLD = 6 // px：小於此移動量視為點擊而非拖曳

const scale = ref(1)
const tx = ref(0)
const ty = ref(0)
// 最小縮放 = 整張圖 contain 進 viewport 的比例（不允許縮得比整圖可見更小）
const fitScale = ref(0.2)

// 圖片原生像素尺寸；content 以「原生尺寸」排版，瀏覽器才會以全解析度解碼，放大才清晰。
const natW = ref(0)
const natH = ref(0)
// content 排版尺寸上限（最長邊）：避免超大圖（如 A0 300DPI）整張解碼造成記憶體爆掉。
// 一般 A3/A4 300DPI 圖紙（最長邊 ≤5000px）可完整原生解析度顯示。
const LAYOUT_MAX_LONG_EDGE = 5000

/** content 實際排版尺寸（原生尺寸，超過上限時等比例縮小） */
const layoutSize = computed(() => {
  if (!natW.value || !natH.value) return { w: 0, h: 0 }
  const r = Math.min(1, LAYOUT_MAX_LONG_EDGE / Math.max(natW.value, natH.value))
  return { w: Math.round(natW.value * r), h: Math.round(natH.value * r) }
})

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 目前 viewport 與 content（scale=1）的尺寸。 */
function dims() {
  const vp = viewportRef.value
  const { w: cw, h: ch } = layoutSize.value
  if (!vp || !cw || !ch) return null
  const vw = vp.clientWidth
  const vh = vp.clientHeight
  if (vw === 0 || vh === 0) return null
  return { vw, vh, cw, ch }
}

/**
 * 限制平移：縮放後內容若大於 viewport，邊緣不可被拖進空白區（Google Map 式）；
 * 若小於 viewport 則置中。每次平移／縮放後呼叫。
 */
function clampTransform() {
  const d = dims()
  if (!d) return
  const sw = d.cw * scale.value
  const sh = d.ch * scale.value
  tx.value = sw <= d.vw ? (d.vw - sw) / 2 : clamp(tx.value, d.vw - sw, 0)
  ty.value = sh <= d.vh ? (d.vh - sh) / 2 : clamp(ty.value, d.vh - sh, 0)
}

const contentStyle = computed(() => ({
  width: `${layoutSize.value.w}px`,
  height: `${layoutSize.value.h}px`,
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
}))

/** 圖釘：百分比定位 + 反向縮放，使其在任何縮放等級下維持固定視覺大小，尖端錨定在座標點。 */
function pinStyle(pin: FloorPlanPin) {
  const inv = 1 / scale.value
  return {
    position: 'absolute' as const,
    left: `${pin.xRatio * 100}%`,
    top: `${pin.yRatio * 100}%`,
    transformOrigin: '50% 100%',
    transform: `translate(-50%, -100%) scale(${inv})`,
  }
}

/** 將整張圖以 contain 方式置中填入 viewport（初始 / 重設）。 */
function fitView() {
  const d = dims()
  if (!d) return
  const s = clamp(Math.min(d.vw / d.cw, d.vh / d.ch), 0.05, MAX_SCALE)
  fitScale.value = s
  scale.value = s
  tx.value = (d.vw - d.cw * s) / 2
  ty.value = (d.vh - d.ch * s) / 2
}

/**
 * 可靠地執行 fitView：@load 在圖片已快取時可能不觸發，且 viewport 尺寸在首幀可能尚未就緒，
 * 故以 rAF 重試直到 dims() 取得有效尺寸。
 */
function scheduleFit() {
  let tries = 0
  const attempt = () => {
    const img = imgRef.value
    if (img?.naturalWidth) {
      natW.value = img.naturalWidth
      natH.value = img.naturalHeight
    }
    if (dims()) {
      fitView()
    } else if (tries++ < 15) {
      requestAnimationFrame(attempt)
    }
  }
  requestAnimationFrame(attempt)
}

function onImgLoad() {
  const img = imgRef.value
  if (img?.naturalWidth) {
    natW.value = img.naturalWidth
    natH.value = img.naturalHeight
  }
  scheduleFit()
}

// viewport 尺寸變動時：若目前正處於 fit（最小縮放）則重新 fit，否則僅夾住平移範圍
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  const vp = viewportRef.value
  if (!vp || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => {
    if (!displayUrl.value) return
    if (Math.abs(scale.value - fitScale.value) < 0.001) fitView()
    else clampTransform()
  })
  resizeObserver.observe(vp)
})

/** 以 viewport 內某點 (px,py) 為焦點縮放，保持該點在畫面上不動；下限為 fitScale。 */
function zoomAtPoint(factor: number, px: number, py: number) {
  const newScale = clamp(scale.value * factor, fitScale.value, MAX_SCALE)
  const k = newScale / scale.value
  if (k === 1) return
  tx.value = px - (px - tx.value) * k
  ty.value = py - (py - ty.value) * k
  scale.value = newScale
  clampTransform()
}

function zoomBy(factor: number) {
  const vp = viewportRef.value
  if (!vp) return
  zoomAtPoint(factor, vp.clientWidth / 2, vp.clientHeight / 2)
}

function onWheel(e: WheelEvent) {
  if (!displayUrl.value) return
  // 滑鼠在圖面上時，滾輪直接以游標為焦點縮放（trackpad 捏合送出的 ctrlKey 一併處理）
  e.preventDefault()
  const vp = viewportRef.value
  if (!vp) return
  const rect = vp.getBoundingClientRect()
  // trackpad 捏合的 deltaY 較小，乘上較緩的係數讓縮放平順
  const intensity = e.ctrlKey ? 0.01 : 0.0015
  const factor = Math.exp(-e.deltaY * intensity)
  zoomAtPoint(factor, e.clientX - rect.left, e.clientY - rect.top)
}

/* ---------- 指標（滑鼠 / 觸控）：拖曳平移 + 雙指捏合縮放 ---------- */
const pointers = new Map<number, { x: number; y: number }>()
let panStart: { x: number; y: number; tx: number; ty: number } | null = null
let pinchStart: { dist: number; scale: number; cx: number; cy: number; tx: number; ty: number } | null = null
let movedDist = 0

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function onPointerDown(e: PointerEvent) {
  if (!displayUrl.value) return
  // 阻止瀏覽器原生圖片拖放（避免把圖片拖進檔案輸入框）與文字選取
  e.preventDefault()
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  try {
    viewportRef.value?.setPointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
  if (pointers.size === 1) {
    movedDist = 0
    panStart = { x: e.clientX, y: e.clientY, tx: tx.value, ty: ty.value }
    pinchStart = null
  } else if (pointers.size === 2) {
    panStart = null
    const pts = [...pointers.values()]
    const rect = viewportRef.value!.getBoundingClientRect()
    pinchStart = {
      dist: dist(pts[0], pts[1]),
      scale: scale.value,
      cx: (pts[0].x + pts[1].x) / 2 - rect.left,
      cy: (pts[0].y + pts[1].y) / 2 - rect.top,
      tx: tx.value,
      ty: ty.value,
    }
  }
}

function onPointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pinchStart && pointers.size >= 2) {
    const pts = [...pointers.values()]
    const k = dist(pts[0], pts[1]) / pinchStart.dist
    const newScale = clamp(pinchStart.scale * k, fitScale.value, MAX_SCALE)
    const f = newScale / pinchStart.scale
    tx.value = pinchStart.cx - (pinchStart.cx - pinchStart.tx) * f
    ty.value = pinchStart.cy - (pinchStart.cy - pinchStart.ty) * f
    scale.value = clamp(newScale, fitScale.value, MAX_SCALE)
    clampTransform()
  } else if (panStart && pointers.size === 1) {
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y
    movedDist = Math.max(movedDist, Math.abs(dx) + Math.abs(dy))
    tx.value = panStart.tx + dx
    ty.value = panStart.ty + dy
    clampTransform()
  }
}

function onPointerUp(e: PointerEvent) {
  const wasSinglePan = !!panStart && pointers.size === 1
  pointers.delete(e.pointerId)
  try {
    viewportRef.value?.releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }

  if (pointers.size < 2) pinchStart = null

  if (pointers.size === 0) {
    // 點擊（非拖曳）→ 放置圖釘（僅 addMode）
    if (wasSinglePan && movedDist < TAP_THRESHOLD && props.addMode) {
      const ratio = ratioFromImgRect(e.clientX, e.clientY)
      if (ratio) emit('add', ratio)
    }
    panStart = null
  } else if (pointers.size === 1) {
    // 捏合結束、剩一指 → 接續平移
    const pt = [...pointers.values()][0]
    panStart = { x: pt.x, y: pt.y, tx: tx.value, ty: ty.value }
    movedDist = TAP_THRESHOLD // 捏合後抬起不視為點擊
  }
}

/** clientX/Y → 圖片內比例（img rect 已反映 transform）。 */
function ratioFromImgRect(clientX: number, clientY: number): { xRatio: number; yRatio: number } | null {
  const img = imgRef.value
  if (!img) return null
  const rect = img.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  return {
    xRatio: clamp((clientX - rect.left) / rect.width, 0, 1),
    yRatio: clamp((clientY - rect.top) / rect.height, 0, 1),
  }
}

/* ---------- 拖曳既有圖釘以調整位置 ---------- */
let draggingPin: FloorPlanPin | null = null

function onPinPointerDown(_e: PointerEvent, pin: FloorPlanPin) {
  if (props.addMode) return
  draggingPin = pin
  window.addEventListener('pointermove', onPinDragMove)
  window.addEventListener('pointerup', onPinDragUp, { once: true })
}

function onPinDragMove(e: PointerEvent) {
  if (!draggingPin) return
  const ratio = ratioFromImgRect(e.clientX, e.clientY)
  if (!ratio) return
  emit('move', { pinId: draggingPin.id, ...ratio })
}

function onPinDragUp() {
  draggingPin = null
  window.removeEventListener('pointermove', onPinDragMove)
}
</script>

<style scoped>
.fp-canvas {
  width: 100%;
}
.fp-canvas--fullscreen {
  position: absolute;
  inset: 0;
}

.fp-canvas__viewport {
  position: relative;
  width: 100%;
  height: clamp(360px, 72vh, 900px);
  overflow: hidden;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.18);
  touch-action: none; /* 自行處理平移/縮放手勢 */
  user-select: none;
  -webkit-user-select: none;
}
.fp-canvas--fullscreen .fp-canvas__viewport {
  height: 100%;
  border-radius: 0;
}
.fp-canvas__viewport--add {
  cursor: crosshair;
}

.fp-canvas__content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  will-change: transform;
}

.fp-canvas__img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none; /* 禁止原生圖片拖放 */
  pointer-events: none; /* 讓指標事件落到 viewport，由其統一處理 */
}

.fp-canvas__empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
}
.fp-canvas__empty .fa {
  font-size: 32px;
}

.fp-canvas__controls {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fp-canvas__controls button {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fp-canvas__controls button:hover {
  background: rgba(0, 0, 0, 0.75);
}

.fp-canvas__hint {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  background: rgba(13, 110, 253, 0.9);
  color: #fff;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 13px;
  white-space: nowrap;
  pointer-events: none;
}

/* 圖釘：尖端錨定座標點；大小由 inline 的反向 scale 維持固定 */
.fp-pin {
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  background: transparent;
  color: #dc3545;
  cursor: pointer;
  line-height: 1;
  z-index: 2;
}
.fp-pin .fa {
  font-size: 28px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
}
.fp-pin__no {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 999px;
  background: #0d6efd;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
}
.fp-pin--active {
  color: #ffc107;
  z-index: 3;
}
.fp-pin--active .fa {
  font-size: 32px;
}
</style>
