<template>
  <div class="p1-em-fig section-card">
    <button type="button" class="section-card__header" @click="collapsed = !collapsed" :aria-expanded="!collapsed">
      <div class="section-card__header-left">
        <div class="section-icon section-icon--danger">
          <i class="fa fa-phone-volume"></i>
        </div>
        <div class="section-title-wrap">
          <div class="section-title">緊急聯絡</div>
        </div>
      </div>
      <div class="section-card__header-right">
        <i class="fa chevron" :class="collapsed ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
      </div>
    </button>

    <div v-show="!collapsed" class="section-card__body">
      <div class="table-scroll-wrap p1-em-fig102-editor-wrap mb-4">
        <table class="table align-middle p1-resource-table mb-0">
          <thead>
            <tr>
              <th style="width: 14%">組別（圖中排）</th>
              <th style="width: 18%">職掌（圖中排）</th>
              <th>聯絡單位／電話（圖底，可多行）</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in local.fig102Rows" :key="row.id">
              <td>
                <input
                  v-model="row.title"
                  type="text"
                  class="form-control form-control-sm"
                  @input="onFieldInput"
                />
              </td>
              <td>
                <input
                  v-model="row.duty"
                  type="text"
                  class="form-control form-control-sm"
                  @input="onFieldInput"
                />
              </td>
              <td>
                <textarea
                  v-model="row.contacts"
                  class="form-control form-control-sm p1-em-fig-textarea"
                  rows="3"
                  @input="onFieldInput"
                ></textarea>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="row g-4">
        <div class="col-12">
          <div class="p1-em-fig-preview-title">緊急應變組織架構圖（預覽）</div>
          <div ref="fig102RootRef" class="p1-em-fig-sheet p1-em-fig-sheet--102">
            <div class="p1-em-fig-caption">緊急應變組織架構圖</div>
            <div ref="fig102ExportRef" class="p1-em-fig-export-scope">
              <div ref="fig102DiagramRef" class="p1-em-fig-canvas">
                <svg
                  ref="fig102SvgRef"
                  class="p1-em-fig-lines"
                  xmlns="http://www.w3.org/2000/svg"
                  :viewBox="`0 0 ${fig102SvgSize.w} ${fig102SvgSize.h}`"
                  preserveAspectRatio="none"
                >
                  <path v-for="(d, idx) in fig102LinePaths" :key="'l102-' + idx" :d="d" />
                </svg>
                <div class="p1-em-fig-canvas-stack">
                  <div class="p1-em-fig102-top">承商緊急應變小組　召集人　工地主任</div>
                  <div class="p1-em-fig102-mid">
                    <div v-for="row in local.fig102Rows" :key="'pm-' + row.id" class="p1-em-fig102-mid-cell">
                      <div class="p1-em-fig102-mid-title">{{ displayTitle(row) }}</div>
                      <div class="p1-em-fig102-mid-duty">{{ displayDuty(row) }}</div>
                    </div>
                  </div>
                  <div class="p1-em-fig102-bottom">
                    <div v-for="row in local.fig102Rows" :key="'pb-' + row.id" class="p1-em-fig102-bot-cell">
                      <div class="p1-em-fig-sheet-text">{{ displayContacts(row) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12">
          <div class="fig103-top-editor-grid mb-3">
            <div v-for="meta in fig103TopEditorMeta" :key="'top-edit-' + meta.i" class="fig103-top-editor-cell">
              <div class="fig103-top-editor-index">{{ meta.i + 1 }}</div>
              <textarea
                v-model="local.fig103TopLabels[meta.i]"
                class="form-control form-control-sm p1-em-fig-textarea fig103-top-editor-textarea"
                :rows="meta.rows"
                :placeholder="meta.hint"
                @input="onFieldInput"
              ></textarea>
            </div>
          </div>
          <div class="p1-em-fig-preview-title">緊急事故與災害通報系統圖（預覽）</div>
          <div ref="fig103DiagramRootRef" class="p1-em-fig-sheet p1-em-fig-sheet--103">
            <div class="p1-em-fig-caption">緊急事故與災害通報系統圖</div>
            <div ref="fig103ExportRef" class="p1-em-fig-export-scope p1-em-fig103-export-scope">
              <div ref="fig103DiagramRef" class="p1-em-fig-canvas p1-em-fig103-diagram">
                <div ref="fig103StackRef" class="p1-em-fig-canvas-stack p1-em-fig103-stack">
                  <svg
                    ref="fig103SvgRef"
                    class="p1-em-fig-lines p1-em-fig-lines--fig103"
                    xmlns="http://www.w3.org/2000/svg"
                    :width="fig103SvgSize.w"
                    :height="fig103SvgSize.h"
                    :viewBox="`0 0 ${fig103SvgSize.w} ${fig103SvgSize.h}`"
                    preserveAspectRatio="none"
                  >
                    <path v-for="(d, idx) in fig103LinePaths" :key="'l103-' + idx" :d="d" />
                  </svg>
                  <div class="p1-em-fig103-top-grid">
                    <div
                      v-for="ti in 6"
                      :key="'topn-' + ti"
                      class="p1-em-fig103-node p1-em-fig103-node--top p1-em-fig103-node--black"
                    >
                      {{ displayFig103Top(ti - 1) }}
                    </div>
                  </div>

                  <div class="p1-em-fig103-mid-wrap">
                    <div class="p1-em-fig103-flow-row">
                      <div class="p1-em-fig103-node p1-em-fig103-node--black p1-em-fig103-node--flow">承包商</div>
                      <span class="p1-em-fig103-arrow" aria-hidden="true">←</span>
                      <div class="p1-em-fig103-node p1-em-fig103-node--black p1-em-fig103-node--flow">災害或事故發現者</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="p1-em-fig103-note-wrap">
                <div class="p1-em-fig103-note-box">重大職災於8小時內通報勞檢單位</div>
              </div>
            </div>
          </div>

          <div class="p1-em-fig-preview-title p1-em-fig-preview-title--103table">相關單位電話及傳真（預覽）</div>
          <div ref="fig103TableRootRef" class="p1-em-fig-sheet p1-em-fig-sheet--103table">
            <div class="p1-em-fig-caption">相關單位電話及傳真</div>
            <table class="p1-em-fig103-tbl p1-em-fig103-tbl--full">
              <tbody>
                <tr v-for="row in local.fig102Rows" :key="'pv-' + row.id">
                  <td class="p1-em-fig-sheet-text">{{ displayFig103PhoneCellFromFig102Row(row) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import html2canvas from 'html2canvas'
import {
  P1_FIG102_ROW_DEFS,
  P1_FIG103_TOP_LABEL_DEFAULTS,
  defaultP1EmergencyContactBundle,
  displayFig102Contacts,
  displayFig102Duty,
  displayFig102Title,
  displayFig103PhoneCellFromFig102Row,
  displayFig103TopLabel,
  type P1EmergencyContactBundle,
  type P1Fig102Row
} from './p1EmergencyContactFigureDefs'

const fig103TopEditorMeta = [
  { i: 0, rows: 2, hint: '例：保險公司' },
  { i: 1, rows: 2, hint: '例：勞動部XXX職安中心' },
  { i: 2, rows: 2, hint: '例：XXX縣警察局XXX派出所' },
  { i: 3, rows: 3, hint: '例：公路總局XXX養護工程處XXX工務段' },
  { i: 4, rows: 2, hint: '例：XXX縣政府' },
  { i: 5, rows: 3, hint: '例：緊急救援（換行）相關單位' }
] as const

const props = defineProps<{
  modelValue: P1EmergencyContactBundle | null
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: P1EmergencyContactBundle): void
}>()

const collapsed = ref(false)
const fig102RootRef = ref<HTMLElement | null>(null)
const fig103DiagramRootRef = ref<HTMLElement | null>(null)
const fig103TableRootRef = ref<HTMLElement | null>(null)
const fig102ExportRef = ref<HTMLElement | null>(null)
const fig103ExportRef = ref<HTMLElement | null>(null)
const fig102DiagramRef = ref<HTMLElement | null>(null)
const fig103DiagramRef = ref<HTMLElement | null>(null)
const fig102SvgRef = ref<SVGSVGElement | null>(null)
const fig103SvgRef = ref<SVGSVGElement | null>(null)
const fig103StackRef = ref<HTMLElement | null>(null)

const fig102SvgSize = reactive({ w: 640, h: 320 })
const fig103SvgSize = reactive({ w: 640, h: 280 })
const fig102LinePaths = shallowRef<string[]>([])
const fig103LinePaths = shallowRef<string[]>([])
const isExporting = ref(false)
let redrawRafA = 0
let redrawRafB = 0

type LocalState = {
  fig102Rows: P1Fig102Row[]
  fig103TopLabels: string[]
}

function cloneTopLabels6(b: P1EmergencyContactBundle): string[] {
  const d = P1_FIG103_TOP_LABEL_DEFAULTS
  const t = b.fig103TopLabels
  if (!Array.isArray(t) || t.length < 6) return [...d]
  return [
    t[0] ?? d[0],
    t[1] ?? d[1],
    t[2] ?? d[2],
    t[3] ?? d[3],
    t[4] ?? d[4],
    t[5] ?? d[5]
  ]
}

function cloneFromBundle(b: P1EmergencyContactBundle): LocalState {
  const d = defaultP1EmergencyContactBundle()
  const fig102Rows = P1_FIG102_ROW_DEFS.map((def) => {
    const r = b.fig102Rows.find((x) => x.id === def.id)
    const fallback = d.fig102Rows.find((x) => x.id === def.id)!
    const contactText = (r?.contacts ?? '').trim()
    return r
      ? {
          id: r.id,
          title: r.title,
          duty: r.duty,
          contacts: contactText ? r.contacts : fallback.contacts
        }
      : { ...fallback }
  })
  return {
    fig102Rows,
    fig103TopLabels: cloneTopLabels6(b)
  }
}

const local = reactive<LocalState>(cloneFromBundle(props.modelValue ?? defaultP1EmergencyContactBundle()))

function applyProps(b: P1EmergencyContactBundle) {
  const c = cloneFromBundle(b)
  local.fig102Rows.splice(0, local.fig102Rows.length, ...c.fig102Rows)
  local.fig103TopLabels.splice(0, local.fig103TopLabels.length, ...c.fig103TopLabels)
}

applyProps(props.modelValue ?? defaultP1EmergencyContactBundle())

watch(
  () => props.modelValue,
  (v) => {
    applyProps(v ?? defaultP1EmergencyContactBundle())
  },
  { deep: true }
)

function syncEmit() {
  const top = local.fig103TopLabels
  while (top.length < 6) top.push('')
  const labels: [string, string, string, string, string, string] = [
    top[0] ?? '',
    top[1] ?? '',
    top[2] ?? '',
    top[3] ?? '',
    top[4] ?? '',
    top[5] ?? ''
  ]
  emit('update:modelValue', {
    version: 2,
    fig102Rows: local.fig102Rows.map((r) => ({
      id: r.id,
      title: r.title ?? '',
      duty: r.duty ?? '',
      contacts: r.contacts ?? ''
    })),
    fig103TopLabels: labels
  })
}

function onFieldInput() {
  syncEmit()
}

function displayTitle(row: P1Fig102Row) {
  return displayFig102Title(row.id, row.title)
}
function displayDuty(row: P1Fig102Row) {
  return displayFig102Duty(row.id, row.duty)
}
function displayContacts(row: P1Fig102Row) {
  return displayFig102Contacts(row.id, row.contacts)
}

function displayFig103Top(i: number) {
  return displayFig103TopLabel(local.fig103TopLabels, i)
}

type LineRect = { x: number; y: number; w: number; h: number }

function relRect(stage: HTMLElement, el: HTMLElement): LineRect {
  const sr = stage.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  return {
    x: er.left - sr.left,
    y: er.top - sr.top,
    w: er.width,
    h: er.height
  }
}

function pathPts(points: Array<[number, number]>) {
  if (points.length < 2) return ''
  const [p0, ...rest] = points
  const parts = [`M ${Math.round(p0[0])} ${Math.round(p0[1])}`]
  for (const p of rest) parts.push(`L ${Math.round(p[0])} ${Math.round(p[1])}`)
  return parts.join(' ')
}

function clampMinLen(a: number, b: number, minLen = 2) {
  if (Math.abs(b - a) >= minLen) return [a, b] as const
  if (b >= a) return [a, a + minLen] as const
  return [a, a - minLen] as const
}

function vLine(x: number, y1: number, y2: number, minLen = 2) {
  const [a, b] = clampMinLen(y1, y2, minLen)
  return pathPts([
    [x, a],
    [x, b]
  ])
}

/** 圖10.3：小數座標；SVG 寬高與 viewBox 與 stage 一致時 none 不會造成非等比錯位 */
function fmtCoord(n: number) {
  return `${Math.round(n * 100) / 100}`
}
function pathPtsPrecise(points: Array<[number, number]>) {
  if (points.length < 2) return ''
  const [p0, ...rest] = points
  const parts = [`M ${fmtCoord(p0[0])} ${fmtCoord(p0[1])}`]
  for (const p of rest) parts.push(`L ${fmtCoord(p[0])} ${fmtCoord(p[1])}`)
  return parts.join(' ')
}
function vLine103(x: number, y1: number, y2: number) {
  const lo = Math.min(y1, y2)
  const hi = Math.max(y1, y2)
  if (hi - lo < 0.05) return ''
  return pathPtsPrecise([
    [x, lo],
    [x, hi]
  ])
}
function hLine103(y: number, x1: number, x2: number) {
  const lo = Math.min(x1, x2)
  const hi = Math.max(x1, x2)
  if (hi - lo < 0.05) return ''
  return pathPtsPrecise([
    [lo, y],
    [hi, y]
  ])
}

function updateFig102Lines() {
  const stage = fig102DiagramRef.value
  if (!stage) return
  const sr = stage.getBoundingClientRect()
  if (sr.width <= 0 || sr.height <= 0) return
  fig102SvgSize.w = Math.max(1, Math.ceil(sr.width))
  fig102SvgSize.h = Math.max(1, Math.ceil(sr.height))

  const top = stage.querySelector('.p1-em-fig102-top') as HTMLElement | null
  const mids = Array.from(stage.querySelectorAll('.p1-em-fig102-mid .p1-em-fig102-mid-cell')) as HTMLElement[]
  const bots = Array.from(stage.querySelectorAll('.p1-em-fig102-bottom .p1-em-fig102-bot-cell')) as HTMLElement[]
  if (!top || mids.length !== 5 || bots.length !== 5) {
    fig102LinePaths.value = []
    return
  }

  const inset = 2
  const tr = relRect(stage, top)
  const midR = mids.map((m) => relRect(stage, m))
  const botR = bots.map((b) => relRect(stage, b))

  const cxT = tr.x + tr.w / 2
  const bottomT = tr.y + tr.h
  const midTopY = Math.min(...midR.map((r) => r.y))
  const H1 = midTopY - 8
  const xs = midR.map((r) => r.x + r.w / 2)

  const ds: string[] = []
  ds.push(vLine(cxT, bottomT + inset, H1))
  for (let i = 0; i < 5; i++) {
    ds.push(vLine(xs[i]!, H1, midR[i]!.y - inset))
  }
  for (let i = 0; i < 5; i++) {
    const mb = midR[i]!.y + midR[i]!.h
    ds.push(vLine(xs[i]!, mb + inset, botR[i]!.y - inset))
  }

  fig102LinePaths.value = ds.filter(Boolean)
}

function updateFig103Lines() {
  const stage = fig103StackRef.value
  if (!stage) return
  const tops = Array.from(stage.querySelectorAll('.p1-em-fig103-node--top')) as HTMLElement[]
  const flows = Array.from(stage.querySelectorAll('.p1-em-fig103-node--flow')) as HTMLElement[]
  if (tops.length !== 6 || flows.length !== 2) {
    fig103LinePaths.value = []
    return
  }

  const sb = stage.getBoundingClientRect()
  function relToStage(el: HTMLElement): LineRect {
    const er = el.getBoundingClientRect()
    return {
      x: er.left - sb.left,
      y: er.top - sb.top,
      w: er.width,
      h: er.height
    }
  }

  // 版面：左承包商、右發現者；箭頭「←」表示由發現者指向承包商（不對調方框位置）
  const contractor = flows[0]!
  const discoverer = flows[1]!
  const cr = relToStage(contractor)
  const dr = relToStage(discoverer)
  const topRects = tops.map((t) => relToStage(t))

  /** 上排左起第 4 格（0-based=3）＝「公路總局…獨立山工務段」（displayFlowRed(2)）— 主幹與發現者連線對齊此欄 */
  const FIG103_HIGHWAY_TOP_INDEX = 3

  const cxs = topRects.map((r) => r.x + r.w / 2)
  const bottoms = topRects.map((r) => r.y + r.h)
  const bottomMax = Math.max(...bottoms)
  const flowTop = Math.min(dr.y, cr.y)

  /** 垂線貼齊框線：勿再用 +inset 離開框底／框頂，否則畫面上會像「沒接上」 */
  const inset = 0
  /** 上排各格底邊到第一條橫幹線 */
  const gapTopToBus = 22
  /** 橫幹線到第二條橫線（分叉）之間，至少要有這段垂直主幹 */
  const minBusToMerge = 28
  /** 第二條橫線（分叉橫線）到「承包商／災害或事故發現者」框頂之間留白 */
  const gapMergeToFlow = 40

  let busY = bottomMax + gapTopToBus
  let mergeY = flowTop - gapMergeToFlow

  if (mergeY < busY + minBusToMerge) {
    mergeY = busY + minBusToMerge
  }
  const mergeMax = flowTop - 3
  if (mergeY > mergeMax) {
    mergeY = mergeMax
    busY = Math.min(busY, mergeY - minBusToMerge)
    if (busY < bottomMax + 2) {
      busY = bottomMax + 4
    }
  }

  if (mergeY <= busY + 2 || busY >= mergeY) {
    fig103LinePaths.value = []
    return
  }

  /** 分叉橫線（承包商←發現者上方那條）再往上移，與兩框距離加大 */
  const mergeLineExtraUp = 14
  mergeY -= mergeLineExtraUp
  if (mergeY <= busY + 2) {
    mergeY = busY + 4
  }
  const mergeMinGapAboveFlow = 8
  if (mergeY > flowTop - mergeMinGapAboveFlow) {
    mergeY = flowTop - mergeMinGapAboveFlow
  }
  if (mergeY <= busY + 2 || busY >= mergeY) {
    fig103LinePaths.value = []
    return
  }

  const cxTrunk = cxs[FIG103_HIGHWAY_TOP_INDEX]!
  const cxDisc = dr.x + dr.w / 2
  const cxCont = cr.x + cr.w / 2

  const stageW = sb.width
  const stageH = Math.max(sb.height, 1)

  const ds: string[] = []
  ds.push(hLine103(busY, Math.min(...cxs), Math.max(...cxs)))
  const botHw = topRects[FIG103_HIGHWAY_TOP_INDEX]!.y + topRects[FIG103_HIGHWAY_TOP_INDEX]!.h
  for (let i = 0; i < 6; i++) {
    if (i === FIG103_HIGHWAY_TOP_INDEX) continue
    const bot = topRects[i]!.y + topRects[i]!.h
    ds.push(vLine103(cxs[i]!, bot, busY))
  }
  ds.push(vLine103(cxTrunk, botHw, mergeY))
  const mergeXLo = Math.min(cxTrunk, cxDisc, cxCont)
  const mergeXHi = Math.max(cxTrunk, cxDisc, cxCont)
  ds.push(hLine103(mergeY, mergeXLo, mergeXHi))
  ds.push(vLine103(cxDisc, mergeY, dr.y))
  ds.push(vLine103(cxCont, mergeY, cr.y))

  const cxMidFlow = (cxCont + cxDisc) / 2
  if (Math.abs(cxMidFlow - cxTrunk) > 6) {
    ds.push(vLine103(cxMidFlow, busY, mergeY))
  }

  if (stageW <= 0) {
    fig103LinePaths.value = []
    return
  }
  fig103SvgSize.w = stageW
  fig103SvgSize.h = Math.max(1, Math.ceil(stageH))

  fig103LinePaths.value = ds.filter(Boolean)
}

function scheduleLineRedraw() {
  nextTick(() => {
    if (redrawRafA) cancelAnimationFrame(redrawRafA)
    if (redrawRafB) cancelAnimationFrame(redrawRafB)
    redrawRafA = requestAnimationFrame(() => {
      redrawRafB = requestAnimationFrame(() => {
        updateFig102Lines()
        updateFig103Lines()
      })
    })
  })
}

let lineResizeObserver: ResizeObserver | null = null

onMounted(() => {
  lineResizeObserver = new ResizeObserver(() => scheduleLineRedraw())
  nextTick(() => {
    if (fig102DiagramRef.value) lineResizeObserver!.observe(fig102DiagramRef.value)
    if (fig103StackRef.value) lineResizeObserver!.observe(fig103StackRef.value)
    scheduleLineRedraw()
  })
})

onBeforeUnmount(() => {
  if (redrawRafA) cancelAnimationFrame(redrawRafA)
  if (redrawRafB) cancelAnimationFrame(redrawRafB)
  lineResizeObserver?.disconnect()
  lineResizeObserver = null
})

watch(
  () => local,
  () => scheduleLineRedraw(),
  { deep: true }
)

watch(
  () => collapsed.value,
  (v) => {
    if (!v) scheduleLineRedraw()
  }
)

/**
 * 單次 html2canvas（不隱藏 SVG、不另畫線圖層對齊），避免舊版合成造成的滿版／跑版。
 * 匯出前仍刷新連線座標，並套用 --export-capture 字級。
 */
async function captureSheetPng(sheetEl: HTMLElement, updateLinesFn?: () => void): Promise<Blob> {
  isExporting.value = true
  sheetEl.classList.add('p1-em-fig--export-capture')
  try {
    await nextTick()
    updateLinesFn?.()
    await nextTick()
    const nodesCanvas = await html2canvas(sheetEl, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false
    })
    return new Promise<Blob>((resolve, reject) => {
      nodesCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    })
  } finally {
    sheetEl.classList.remove('p1-em-fig--export-capture')
    isExporting.value = false
    void nextTick().then(() => scheduleLineRedraw())
  }
}

async function exportFig102PngBlob(): Promise<Blob> {
  const sheet = fig102RootRef.value
  if (!sheet) throw new Error('fig102 sheet not found')
  return captureSheetPng(sheet, updateFig102Lines)
}

async function exportFig103PngBlob(): Promise<Blob> {
  const sheet = fig103DiagramRootRef.value
  if (!sheet) throw new Error('fig103 diagram sheet not found')
  return captureSheetPng(sheet, updateFig103Lines)
}

async function exportFig103TablePngBlob(): Promise<Blob> {
  const sheet = fig103TableRootRef.value
  if (!sheet) throw new Error('fig103 phone table sheet not found')
  return captureSheetPng(sheet)
}

defineExpose({
  exportFig102PngBlob,
  exportFig103PngBlob,
  exportFig103TablePngBlob
})
</script>

<style scoped>
.p1-em-fig-section-label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.p1-em-fig.section-card {
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
}
.section-card__header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
}
.section-card__header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}
.section-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.section-icon--danger {
  background: rgba(220, 53, 69, 0.2);
  color: #f8a0aa;
}
.section-title {
  font-weight: 700;
  font-size: 1.05rem;
}
.section-card__body {
  padding: 0 1rem 1rem;
}
/* 與 FormP1OverallConstructionPlan 內編輯表一致 */
.table-scroll-wrap {
  max-height: 420px;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.65rem;
  background: rgba(2, 6, 23, 0.45);
}
.p1-em-fig102-editor-wrap {
  max-height: none;
}
.p1-resource-table {
  margin: 0;
  color: rgba(241, 245, 249, 0.95);
}
.p1-resource-table thead th {
  position: sticky;
  top: 0;
  z-index: 12;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(226, 232, 240, 0.92);
}
.p1-resource-table tbody td {
  background: rgba(15, 23, 42, 0.45);
  border-color: rgba(255, 255, 255, 0.1);
}
.p1-resource-table :deep(input.form-control),
.p1-resource-table :deep(textarea.form-control) {
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
}
.p1-em-fig-table :deep(th) {
  background: rgba(255, 255, 255, 0.06);
}
.p1-em-fig-textarea {
  resize: vertical;
  min-height: 2.5rem;
}
.fig103-top-editor-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.5rem;
}
.fig103-top-editor-cell {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.5rem;
  background: rgba(15, 23, 42, 0.45);
  padding: 0.45rem;
}
.fig103-top-editor-index {
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.95);
  margin-bottom: 0.3rem;
}
.fig103-top-editor-textarea {
  min-height: 4.5rem;
  font-size: 0.9rem;
}
@media (max-width: 1200px) {
  .fig103-top-editor-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 768px) {
  .fig103-top-editor-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.p1-em-fig-preview-title {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  opacity: 0.9;
}
.p1-em-fig-preview-title--103table {
  margin-top: 1.35rem;
}
.p1-em-fig-sheet {
  border: 1px solid #333;
  border-radius: 4px;
  padding: 12px 14px;
  background: #fff;
  color: #111;
  max-width: 960px;
}
/* 匯出 PNG：不繪製預覽白底外框 */
.p1-em-fig-sheet.p1-em-fig--export-capture {
  border: none;
}
.p1-em-fig-export-scope {
  display: inline-block;
  width: fit-content;
  max-width: none;
}
.p1-em-fig-sheet--103 .p1-em-fig-export-scope,
.p1-em-fig103-export-scope {
  display: block;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.p1-em-fig103-diagram {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.p1-em-fig103-diagram .p1-em-fig103-stack {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.p1-em-fig-sheet--export {
  box-shadow: none;
}
.p1-em-fig-caption {
  text-align: center;
  font-weight: 700;
  margin-bottom: 10px;
  font-size: 16px;
}
.p1-em-fig-canvas {
  position: relative;
  width: 100%;
  overflow: visible;
}
.p1-em-fig-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: visible;
}
.p1-em-fig-lines--fig103 {
  display: block;
  position: absolute;
  left: 0;
  top: 0;
  /* 覆寫 .p1-em-fig-lines 的 inset:0 + width/height:100%，改由 SVG 屬性與 viewBox 與 stage 1:1 */
  right: auto;
  bottom: auto;
  width: auto;
  height: auto;
  max-width: none;
}
.p1-em-fig-lines path {
  fill: none;
  stroke: rgba(0, 0, 0, 0.72);
  stroke-width: 2;
  stroke-linecap: square;
  stroke-linejoin: miter;
}
.p1-em-fig-canvas-stack {
  position: relative;
  z-index: 2;
}
/* 圖10.3：連線 SVG 與方框同一層 stack，座標原點一致 */
.p1-em-fig103-stack {
  position: relative;
  isolation: isolate;
}
.p1-em-fig-sheet-text {
  color: #111;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.35;
  font-size: 11px;
}
.p1-em-fig102-top {
  text-align: center;
  border: 2px solid #000;
  padding: 10px 8px;
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 8px;
}
.p1-em-fig102-mid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
  margin-bottom: 5px;
}
.p1-em-fig102-mid-cell {
  border: 1px solid #000;
  text-align: center;
  font-size: 11px;
  padding: 6px 3px;
  min-height: 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.p1-em-fig102-mid-title {
  font-weight: 700;
  color: #111;
  line-height: 1.2;
}
.p1-em-fig102-mid-duty {
  font-size: 10px;
  color: #111;
  line-height: 1.25;
}
.p1-em-fig102-bottom {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
}
.p1-em-fig102-bot-cell {
  border: 1px solid #000;
  min-height: 120px;
  padding: 6px;
  text-align: left;
  vertical-align: top;
}

.p1-em-fig103-top-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  align-items: stretch;
}
.p1-em-fig103-node {
  border: 1px solid #000;
  padding: 7px 5px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  line-height: 1.25;
}
.p1-em-fig103-node--black {
  font-weight: 600;
  font-size: 12px;
  color: #111;
  white-space: pre-wrap;
  word-break: break-word;
}
.p1-em-fig103-diagram .p1-em-fig103-top-grid {
  margin-bottom: 0;
  padding-bottom: 18px;
}
.p1-em-fig103-mid-wrap {
  display: flex;
  flex-wrap: wrap;
  /* 勿用 center：避免 flex 交叉軸置中把整排往下擠、壓縮連線可用高度 */
  align-items: flex-start;
  justify-content: center;
  gap: 10px 16px;
  margin-top: 36px;
  margin-bottom: 20px;
}
.p1-em-fig103-flow-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  /* 「承包商 ← 發現者」整列略往右，與上排公路總局欄較對齊 */
  margin-left: 28px;
}
.p1-em-fig103-arrow {
  font-weight: 700;
  font-size: 14px;
}
.p1-em-fig103-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.p1-em-fig103-tbl--full {
  table-layout: fixed;
  width: 100%;
  max-width: 100%;
}
.p1-em-fig103-tbl td {
  border: 1px solid #000;
  padding: 5px 8px;
  vertical-align: top;
}
.p1-em-fig103-tbl--full td {
  width: 100%;
  box-sizing: border-box;
}
.p1-em-fig103-tbl--full .p1-em-fig-sheet-text {
  font-size: 13px;
}
.p1-em-fig103-note-wrap {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin: 10px 0 10px;
  box-sizing: border-box;
}
.p1-em-fig103-note-box {
  display: inline-block;
  margin: 0;
  border: 1px solid #000;
  background: #fff;
  color: #111;
  font-size: 13px;
  line-height: 1.25;
  padding: 6px 10px;
  white-space: nowrap;
}

/* 僅 html2canvas 複製節點：匯出用較大字級（比照 B-2 orgchart-canvas--export-capture） */
.p1-em-fig--export-capture .p1-em-fig102-top {
  font-size: 19px !important;
  padding: 15px 13px !important;
}
.p1-em-fig--export-capture .p1-em-fig102-mid-cell {
  font-size: 16px !important;
  padding: 9px 6px !important;
  min-height: 72px !important;
}
.p1-em-fig--export-capture .p1-em-fig102-mid-title {
  font-size: 16px !important;
}
.p1-em-fig--export-capture .p1-em-fig102-mid-duty {
  font-size: 14px !important;
}
.p1-em-fig--export-capture .p1-em-fig102-bot-cell {
  min-height: 148px !important;
  padding: 9px !important;
}
.p1-em-fig--export-capture .p1-em-fig102-bottom .p1-em-fig-sheet-text {
  font-size: 15px !important;
  line-height: 1.4 !important;
}
.p1-em-fig--export-capture .p1-em-fig103-node--black {
  font-size: 16px !important;
}
.p1-em-fig--export-capture .p1-em-fig103-arrow {
  font-size: 17px !important;
}
.p1-em-fig--export-capture .p1-em-fig103-node {
  min-height: 60px !important;
  padding: 9px 7px !important;
}
.p1-em-fig--export-capture .p1-em-fig103-diagram .p1-em-fig103-top-grid {
  padding-bottom: 22px !important;
}
.p1-em-fig--export-capture .p1-em-fig103-mid-wrap {
  margin-top: 40px !important;
  margin-bottom: 24px !important;
}
.p1-em-fig--export-capture .p1-em-fig-sheet--103table .p1-em-fig-caption {
  font-size: 19px !important;
  margin-bottom: 12px !important;
}
.p1-em-fig--export-capture .p1-em-fig103-tbl {
  font-size: 16px !important;
}
.p1-em-fig--export-capture .p1-em-fig103-tbl td {
  padding: 8px 11px !important;
}
.p1-em-fig--export-capture .p1-em-fig103-tbl--full .p1-em-fig-sheet-text {
  font-size: 16px !important;
}
.p1-em-fig--export-capture .p1-em-fig103-note-box {
  font-size: 15px !important;
  padding: 8px 13px !important;
}
</style>
