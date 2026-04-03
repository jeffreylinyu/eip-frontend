<template>
  <div class="b2-orgchart section-card">
    <button
      type="button"
      class="section-card__header"
      @click="toggleOrgchartCollapsed"
      :aria-expanded="!isOrgchartCollapsed"
    >
      <div class="section-card__header-left">
        <div class="section-icon section-icon--info">
          <i class="fa fa-sitemap"></i>
        </div>
        <div class="section-title-wrap">
          <div class="section-title">緊急應變組織圖</div>
          <div class="section-subtitle">點擊方塊可編輯，內容自動儲存</div>
        </div>
      </div>
      <div class="section-card__header-right">
        <i class="fa chevron" :class="isOrgchartCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
      </div>
    </button>

    <div v-show="!isOrgchartCollapsed" class="section-card__body">
      <div class="section-surface">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <div class="text-muted small"></div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-sm btn-outline-light" @click="applyDefault">
              <i class="fa fa-wand-magic-sparkles me-1"></i>套用預設
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="collapseAll">
              <i class="fa fa-compress me-1"></i>收合內容
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="expandAll">
              <i class="fa fa-expand me-1"></i>展開內容
            </button>
          </div>
        </div>

        <div class="orgchart-stage">
          <div
            ref="canvasRef"
            class="orgchart-canvas"
            :class="{ 'orgchart-canvas--export': isExportingImage }"
            :style="{ height: `${canvasHeight}px` }"
          >
        <!-- 線條（固定；與節點共用同一座標系） -->
        <svg
          class="orgchart-lines"
          :viewBox="`0 0 1000 ${canvasHeight}`"
          preserveAspectRatio="none"
          :style="{ width: '1000px', height: `${canvasHeight}px` }"
        >
          <path v-for="(d, idx) in orgChartPaths" :key="idx" :d="d" />
        </svg>

        <!-- 節點（依內容高度動態排版；像素座標） -->
        <button
          v-for="n in computedLayoutNodes"
          :key="n.id"
          type="button"
          class="org-node"
          :class="{ 'org-node--compact': isCompact && !n.forceExpand }"
          :style="nodeStyle(n)"
          :ref="(el) => setNodeEl(n.id, el as HTMLElement | null)"
          @click="openEditor(n.id)"
        >
          <div class="org-node__title">{{ (model[n.id] as OrgChartNode | undefined)?.title || n.defaultTitle }}</div>
          <div v-if="!isCompact || n.forceExpand" class="org-node__body">
            <div
              class="org-node__bodyPreview"
              :class="{ 'org-node__bodyPreview--expanded': !isCompact || n.forceExpand }"
              v-text="getNodeBodyPreviewText(n.id)"
            />
          </div>
        </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 編輯面板（專案共用 Modal） -->
    <Modal
      :show="editingId !== null"
      :title="editorModalTitle"
      icon="fa fa-pen-to-square"
      modal-id="b2-emergency-orgchart-editor"
      size="lg"
      cancel-text="取消"
      confirm-text="套用"
      confirm-icon="fa fa-check"
      confirm-button-class="btn btn-primary"
      :draggable="false"
      :resizable="false"
      @update:show="onEditorModalShowUpdate"
      @confirm="applyDraft"
      @shown="onEditorModalShown"
    >
      <div class="b2-orgchart-editor-modal-body">
      <div class="mb-3">
        <label class="form-label small text-muted">標題</label>
        <input v-model="draft.title" type="text" class="form-control form-control-sm" />
      </div>

      <div class="mb-0">
        <label class="form-label small text-muted">內容（富文本）</label>
        <div class="rte-toolbar">
          <button type="button" class="rte-btn" title="粗體" @click="execRichCmd('bold')">
            <b>B</b>
          </button>
          <button type="button" class="rte-btn" title="斜體" @click="execRichCmd('italic')">
            <i>I</i>
          </button>
          <button type="button" class="rte-btn" title="底線" @click="execRichCmd('underline')">
            <u>U</u>
          </button>
          <button type="button" class="rte-btn rte-btn--danger" title="清除內容" @click="clearRichContent">
            清除
          </button>
        </div>
        <div
          ref="contentEditorRef"
          class="rte-editor"
          contenteditable="true"
          @input="onRichEditorInput"
          @paste="onRichEditorPaste"
        ></div>
      </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import html2canvas from 'html2canvas'
import Modal from '@/components/bootstrap/Modal.vue'

type OrgChartNode = { title: string; content: string }
type OrgChartModel = Record<string, OrgChartNode | string>

const props = defineProps<{
  modelValue: OrgChartModel | null
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: OrgChartModel): void
}>()

const isCompact = ref(false)
const isOrgchartCollapsed = ref(false)
const isExportingImage = ref(false)
/** 匯出時 .orgchart-canvas--export 字變大，若仍用編輯畫面的 measuredHeights 堆疊會重疊；截圖前寫入此快照供 effectiveH 使用 */
const exportSnapshottedHeights = ref<Record<string, number> | null>(null)

type NodeKind = 'fields' | 'list'
type LayoutNode = {
  id: string
  kind: NodeKind
  x: number
  y: number
  w: number
  h: number
  defaultTitle: string
  forceExpand?: boolean
}

const baseLayoutNodes: LayoutNode[] = [
  { id: 'director', kind: 'fields', x: 340, y: 20, w: 320, h: 90, defaultTitle: '處長' },
  { id: 'deputy', kind: 'fields', x: 340, y: 125, w: 320, h: 90, defaultTitle: '副處長' },
  { id: 'sectionChief', kind: 'fields', x: 320, y: 230, w: 360, h: 85, defaultTitle: '第六工務段段長' },

  { id: 'zones', kind: 'list', x: 740, y: 150, w: 240, h: 170, defaultTitle: '分區聯絡窗口', forceExpand: true },

  { id: 'policeFire', kind: 'fields', x: 0, y: 235, w: 230, h: 110, defaultTitle: '警消單位' },
  { id: 'medical', kind: 'fields', x: 0, y: 355, w: 230, h: 110, defaultTitle: '醫療單位' },
  { id: 'utilities', kind: 'fields', x: 0, y: 475, w: 230, h: 110, defaultTitle: '管線單位' },

  { id: 'adminGroup', kind: 'fields', x: 300, y: 390, w: 220, h: 130, defaultTitle: '行政聯絡組' },
  { id: 'siteGroup', kind: 'fields', x: 540, y: 390, w: 220, h: 130, defaultTitle: '現場作業組' },
  { id: 'logisticsGroup', kind: 'fields', x: 790, y: 390, w: 220, h: 130, defaultTitle: '後勤支援組' },

  { id: 'contractor', kind: 'fields', x: 490, y: 585, w: 320, h: 80, defaultTitle: '承包商' }
]

/** 版型預設最小高度（僅供 CSS min-height）；勿把量測後的實際高寫進 min-height，否則內容刪短後框縮不回來 */
const baseMinHeightById: Record<string, number> = Object.fromEntries(baseLayoutNodes.map((n) => [n.id, n.h]))

const measuredHeights = reactive<Record<string, number>>({})
const nodeEls = new Map<string, HTMLElement>()
const ro = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver((entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement
        const id = el.dataset?.nodeId
        if (!id) continue
        // contentRect 不含 padding/border，版和線條會用較小的 h → 與實際框分離；改與畫面一致的 border box 高度
        const bb = e.borderBoxSize?.[0]
        const h =
          bb != null
            ? bb.blockSize
            : el.offsetHeight || Math.ceil(e.contentRect.height)
        measuredHeights[id] = Math.ceil(h)
      }
    })
  : null

function setNodeEl(id: string, el: HTMLElement | null) {
  const prev = nodeEls.get(id)
  if (prev && ro) ro.unobserve(prev)
  if (!el) {
    nodeEls.delete(id)
    return
  }
  el.dataset.nodeId = id
  nodeEls.set(id, el)
  if (ro) ro.observe(el)
}

function effectiveH(n: LayoutNode): number {
  const base = baseMinHeightById[n.id] ?? n.h
  if (isExportingImage.value && exportSnapshottedHeights.value) {
    const sh = exportSnapshottedHeights.value[n.id]
    if (sh != null && !Number.isNaN(sh)) return Math.max(base, Math.ceil(sh))
  }
  const measured = measuredHeights[n.id]
  if (measured == null || Number.isNaN(measured)) return base
  return Math.max(base, measured)
}

/** 套用匯出樣式後依 DOM 真實高度重算堆疊（雙 pass 讓位置與換行穩定） */
async function flushExportLayout(): Promise<void> {
  for (let pass = 0; pass < 2; pass += 1) {
    const snap: Record<string, number> = {}
    for (const n of baseLayoutNodes) {
      const el = nodeEls.get(n.id)
      snap[n.id] = el ? Math.ceil(el.offsetHeight) : baseMinHeightById[n.id] ?? n.h
    }
    exportSnapshottedHeights.value = snap
    await nextTick()
    await new Promise<void>((r) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          r()
        })
      })
    })
  }
}

const computedLayoutNodes = computed<LayoutNode[]>(() => {
  const byId: Record<string, LayoutNode> = {}
  for (const n of baseLayoutNodes) byId[n.id] = { ...n }

  const gapSmall = 16
  const gapMid = 32
  const gapLarge = 65

  // 直向主幹：依內容高度往下推
  byId.director.y = baseLayoutNodes.find(n => n.id === 'director')!.y
  byId.director.h = effectiveH(byId.director)

  byId.deputy.y = byId.director.y + byId.director.h + gapMid
  byId.deputy.h = effectiveH(byId.deputy)

  byId.sectionChief.y = byId.deputy.y + byId.deputy.h + gapMid
  byId.sectionChief.h = effectiveH(byId.sectionChief)

  // 右側窗口：跟著主幹往下，維持相對位置（原本 150）
  const zonesBase = baseLayoutNodes.find(n => n.id === 'zones')!
  byId.zones.y = byId.deputy.y + (zonesBase.y - baseLayoutNodes.find(n => n.id === 'deputy')!.y)
  byId.zones.h = effectiveH(byId.zones)

  // 左側三框：垂直堆疊依內容高度推開
  const leftStartY = byId.sectionChief.y + 5
  byId.policeFire.y = leftStartY
  byId.policeFire.h = effectiveH(byId.policeFire)

  byId.medical.y = byId.policeFire.y + byId.policeFire.h + gapSmall
  byId.medical.h = effectiveH(byId.medical)

  byId.utilities.y = byId.medical.y + byId.medical.h + gapSmall
  byId.utilities.h = effectiveH(byId.utilities)

  // 三組同一排：至少在段長下方留空，避免覆蓋
  const groupsBaseY = baseLayoutNodes.find(n => n.id === 'adminGroup')!.y
  const minGroupsY = byId.sectionChief.y + byId.sectionChief.h + 75
  const groupsY = Math.max(groupsBaseY, minGroupsY)
  for (const id of ['adminGroup', 'siteGroup', 'logisticsGroup'] as const) {
    byId[id].y = groupsY
    byId[id].h = effectiveH(byId[id])
  }

  // 承包商：放在三組底下（取最大高度）且不壓到左側三框底部
  const groupsBottom = Math.max(
    byId.adminGroup.y + byId.adminGroup.h,
    byId.siteGroup.y + byId.siteGroup.h,
    byId.logisticsGroup.y + byId.logisticsGroup.h
  )
  const leftBottom = byId.utilities.y + byId.utilities.h
  byId.contractor.y = Math.max(baseLayoutNodes.find(n => n.id === 'contractor')!.y, groupsBottom + gapLarge, leftBottom + 30)
  byId.contractor.h = effectiveH(byId.contractor)

  return baseLayoutNodes.map(n => byId[n.id])
})

const canvasHeight = computed(() => {
  const nodes = computedLayoutNodes.value
  const maxBottom = Math.max(...nodes.map(n => n.y + n.h))
  return Math.max(720, Math.ceil(maxBottom + 40))
})

const defaultModel = (): OrgChartModel => ({
  director: { title: '處長', content: '' },
  deputy: { title: '副處長', content: '' },
  sectionChief: { title: '第六工務段段長', content: '' },
  zones: { title: '分區聯絡窗口', content: '' },
  policeFire: { title: '警消單位', content: '' },
  medical: { title: '醫療單位', content: '' },
  utilities: { title: '管線單位', content: '' },
  adminGroup: { title: '行政聯絡組', content: '' },
  siteGroup: { title: '現場作業組', content: '' },
  logisticsGroup: { title: '後勤支援組', content: '' },
  contractor: { title: '承包商', content: '' }
})

const model = computed<OrgChartModel>({
  get() {
    return props.modelValue ?? defaultModel()
  },
  set(v) {
    emit('update:modelValue', v)
  }
})

function applyDefault() {
  emit('update:modelValue', defaultModel())
}

function collapseAll() {
  isCompact.value = true
}
function expandAll() {
  isCompact.value = false
}
function toggleOrgchartCollapsed() {
  isOrgchartCollapsed.value = !isOrgchartCollapsed.value
  if (isOrgchartCollapsed.value) {
    closeEditor()
  }
}

function nodeStyle(n: LayoutNode) {
  const minH = baseMinHeightById[n.id] ?? n.h
  return {
    left: `${n.x}px`,
    top: `${n.y}px`,
    width: `${n.w}px`,
    minHeight: `${minH}px`,
    height: 'auto'
  }
}

type Rect = { x: number; y: number; w: number; h: number }
const layoutMap = computed<Record<string, LayoutNode>>(() => {
  const m: Record<string, LayoutNode> = {}
  for (const n of computedLayoutNodes.value) m[n.id] = n
  return m
})

function rect(id: string): Rect {
  const n = layoutMap.value[id]
  return { x: n.x, y: n.y, w: n.w, h: n.h }
}
function cx(r: Rect) {
  return r.x + r.w / 2
}
function cy(r: Rect) {
  return r.y + r.h / 2
}
function right(r: Rect) {
  return r.x + r.w
}
function bottom(r: Rect) {
  return r.y + r.h
}

function path(points: Array<[number, number]>) {
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
  return path([[x, a], [x, b]])
}

function hLine(y: number, x1: number, x2: number, minLen = 2) {
  const [a, b] = clampMinLen(x1, x2, minLen)
  return path([[a, y], [b, y]])
}

/**
 * 段長 → 分區聯絡窗口：先水平拉出 → 垂直（可上可下）對齊窗口高度 → 再水平接入窗口左緣
 */
function sectionChiefToZonesPath(
  sectionChief: Rect,
  zonesJoinY: number,
  zonesLeftX: number,
  inset: number
): string {
  const x0 = right(sectionChief) + inset
  const ySc = cy(sectionChief)
  const xEnd = zonesLeftX
  // 轉折豎線位置：在段長右側與窗口左緣之間，略靠窗口側較像組織圖習慣
  let xStub = xEnd - 44
  if (xStub <= x0 + 8) xStub = x0 + 20
  if (xStub >= xEnd - 4) xStub = xEnd - 10

  if (Math.abs(ySc - zonesJoinY) < 1) {
    return hLine(ySc, x0, xEnd)
  }
  return path([
    [x0, ySc],
    [xStub, ySc],
    [xStub, zonesJoinY],
    [xEnd, zonesJoinY]
  ])
}

const orgChartPaths = computed<string[]>(() => {
  const director = rect('director')
  const deputy = rect('deputy')
  const sectionChief = rect('sectionChief')
  const zones = rect('zones')
  const adminGroup = rect('adminGroup')
  const siteGroup = rect('siteGroup')
  const logisticsGroup = rect('logisticsGroup')
  const contractor = rect('contractor')
  const policeFire = rect('policeFire')
  const medical = rect('medical')
  const utilities = rect('utilities')

  // 三組分支的水平幹線（維持原本的視覺間距）
  const groupsTop = Math.min(adminGroup.y, siteGroup.y, logisticsGroup.y)
  const branchY = groupsTop - 35
  const groups = [adminGroup, siteGroup, logisticsGroup]
  const groupsCx = groups.map(cx)
  const groupsMinX = Math.min(...groupsCx)
  const groupsMaxX = Math.max(...groupsCx)

  // 三組 → 承包商的水平幹線
  const groupsBottom = Math.max(bottom(adminGroup), bottom(siteGroup), bottom(logisticsGroup))
  const contractorBusY = groupsBottom + 40

  // 左側合併線
  const leftNodes = [policeFire, medical, utilities]
  const leftMergeX = Math.max(...leftNodes.map(right)) + 45
  const leftMergeTopY = Math.min(...leftNodes.map(cy))
  const leftMergeBottomY = cy(contractor) + 5

  const ds: string[] = []
  const inset = 2

  // 主幹：處長 → 副處長 → 段長
  ds.push(vLine(cx(director), bottom(director) + inset, deputy.y - inset))
  ds.push(vLine(cx(deputy), bottom(deputy) + inset, sectionChief.y - inset))

  // 段長 → 分區聯絡窗口（右側）：水平拉出 → 垂直對齊窗口 → 再水平入框（Y 夾在框內）
  const zTop = zones.y + 8
  const zBot = bottom(zones) - 8
  const zonesJoinY =
    zBot < zTop ? cy(zones) : Math.min(Math.max(cy(zones), zTop), zBot)
  const zonesLeftX = zones.x
  ds.push(sectionChiefToZonesPath(sectionChief, zonesJoinY, zonesLeftX, inset))

  // 段長 → 三組（水平分支）
  ds.push(vLine(cx(sectionChief), bottom(sectionChief) + inset, branchY))
  ds.push(hLine(branchY, groupsMinX, groupsMaxX))
  for (const g of groups) {
    ds.push(vLine(cx(g), branchY, g.y - inset))
  }

  // 左側三框 → 合併線
  for (const ln of leftNodes) {
    ds.push(hLine(cy(ln), right(ln) + inset, leftMergeX))
  }
  ds.push(vLine(leftMergeX, leftMergeTopY, leftMergeBottomY))

  // 合併線 → 行政聯絡組（左側入框）
  ds.push(hLine(cy(adminGroup), leftMergeX, adminGroup.x - inset))

  // 合併線 → 承包商（連到框框中心）
  ds.push(hLine(cy(contractor), leftMergeX, cx(contractor)))

  // 三組 → 承包商（先下到幹線，再水平，再下到框框中心）
  for (const g of groups) {
    ds.push(vLine(cx(g), bottom(g) + inset, contractorBusY))
  }
  ds.push(hLine(contractorBusY, groupsMinX, groupsMaxX))
  ds.push(vLine(cx(contractor), contractorBusY, cy(contractor)))

  return ds.filter(Boolean)
})

const editingId = ref<string | null>(null)
const draft = reactive<any>({ title: '', content: '' })

const canvasRef = ref<HTMLElement | null>(null)
const contentEditorRef = ref<HTMLDivElement | null>(null)

function sanitizeHtml(html: string): string {
  // 限制最常見的惡意內容；這裡是「簡易」富文本，保留一般標籤/格式
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
}

function getNodeBodyHtml(id: string): string {
  const node = (model.value as any)?.[id] as any
  const content = (node as any)?.content
  if (content == null) return ''
  return sanitizeHtml(String(content ?? ''))
}

/** 預覽抽純文字時視為「區塊」的元素：換段落時結尾補 \\n（與多數 contenteditable 行為對齊） */
const HTML_TO_TEXT_BLOCK_TAGS = new Set([
  'p',
  'div',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'tr',
  'section',
  'article',
  'blockquote',
  'pre',
  'ul',
  'ol',
  'table',
  'thead',
  'tbody',
  'tfoot'
])

/**
 * 預覽用純文字：DOM 遍歷。
 * - 未掛上 document 的節點用 innerText 常吃不到 <br>／區塊換行 → 預覽少行。
 * - 若只用正則又會把 <br> 與 </div> 各算一次 → 預覽多行。
 */
function htmlToPlainText(html: string): string {
  const raw = String(html ?? '')
  if (!raw) return ''
  const root = document.createElement('div')
  root.innerHTML = sanitizeHtml(raw)

  function walk(n: Node): string {
    if (n.nodeType === Node.TEXT_NODE) {
      return (n.textContent || '').replace(/\u00a0/g, ' ')
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return ''
    const e = n as Element
    const tag = e.tagName.toLowerCase()
    if (tag === 'br') return '\n'

    let acc = ''
    for (let i = 0; i < e.childNodes.length; i++) {
      acc += walk(e.childNodes[i]!)
    }
    if (HTML_TO_TEXT_BLOCK_TAGS.has(tag) && acc.length > 0 && !/\n$/.test(acc)) {
      acc += '\n'
    }
    return acc
  }

  let out = ''
  for (let i = 0; i < root.childNodes.length; i++) {
    out += walk(root.childNodes[i]!)
  }

  return out
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getNodeBodyPreviewText(id: string): string {
  return htmlToPlainText(getNodeBodyHtml(id))
}

const currentTitle = computed(() => {
  if (!editingId.value) return ''
  const node = model.value[editingId.value] as OrgChartNode | undefined
  return node?.title || ''
})

/** Modal 標題：編輯中即時反映草稿標題，空則回落節點預設 */
const editorModalTitle = computed(() => {
  if (!editingId.value) return ''
  const fromDraft = String(draft.title ?? '').trim()
  if (fromDraft) return fromDraft
  return currentTitle.value || '編輯節點'
})

function onEditorModalShowUpdate(v: boolean) {
  if (!v) closeEditor()
}

/** Teleport 後 body 才掛載，需等共用 Modal 的 shown 再寫入 contenteditable */
function onEditorModalShown() {
  nextTick(() => {
    const el = contentEditorRef.value
    if (el) el.innerHTML = String(draft.content ?? '')
  })
}

function openEditor(id: string) {
  editingId.value = id
  const src = model.value[id] as any
  draft.title = src?.title ?? ''
  draft.content = src?.content ?? ''
}

function onRichEditorInput() {
  const el = contentEditorRef.value
  if (!el) return
  const html = sanitizeHtml(el.innerHTML ?? '')

  draft.content = html
}

function execRichCmd(cmd: string) {
  const el = contentEditorRef.value
  if (!el) return
  el.focus()
  // document.execCommand 為簡易富文本（足夠「簡易」需求）
  document.execCommand(cmd)
  onRichEditorInput()
}

function onRichEditorPaste(e: ClipboardEvent) {
  e.preventDefault()
  const el = contentEditorRef.value
  if (!el) return
  el.focus()

  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!text) return

  // 以純文字插入（不帶外部 HTML / 樣式）
  document.execCommand('insertText', false, text)
  onRichEditorInput()
}

function clearRichContent() {
  const el = contentEditorRef.value
  if (!el) return
  el.innerHTML = ''
  onRichEditorInput()
}

function closeEditor() {
  editingId.value = null
}

function applyDraft() {
  if (!editingId.value) return
  const id = editingId.value
  const next = { ...model.value }
  next[id] = {
    title: draft.title,
    content: sanitizeHtml(String(draft.content ?? ''))
  } as any
  emit('update:modelValue', next)
  closeEditor()
}

watch(
  () => props.modelValue,
  (v) => {
    if (v == null) return

    // 移除舊版 schema（fields/items/label/value），避免只編一格就送出混合結構導致後端驗證失敗
    const root: any = v
    const hasLegacy = baseLayoutNodes.some((n) => {
      const node = root?.[n.id]
      return node && typeof node === 'object' && node.content == null && (Array.isArray(node.fields) || Array.isArray(node.items))
    })
    if (!hasLegacy) return

    const next: any = {}
    for (const n of baseLayoutNodes) {
      const node = root?.[n.id]
      const title = typeof node?.title === 'string' && node.title.trim().length > 0 ? node.title.trim() : n.defaultTitle
      let contentRaw = ''
      if (typeof node?.content === 'string') contentRaw = node.content
      else if (Array.isArray(node?.fields)) contentRaw = String(node?.fields?.[0]?.value ?? '')
      else if (Array.isArray(node?.items)) contentRaw = String(node?.items?.[0] ?? '')
      next[n.id] = { title, content: sanitizeHtml(contentRaw) }
    }

    emit('update:modelValue', next)
  },
  { immediate: true }
)

async function exportOrgChartPngBlob(): Promise<Blob> {
  const prevCollapsed = isOrgchartCollapsed.value
  if (prevCollapsed) {
    isOrgchartCollapsed.value = false
    await nextTick()
  }

  const el = canvasRef.value
  if (!el) throw new Error('orgchart canvas element not found')

  isExportingImage.value = true
  exportSnapshottedHeights.value = null
  await nextTick()
  await flushExportLayout()

  const scale = 2
  const width = Math.max(el.scrollWidth, el.clientWidth)
  const height = Math.max(el.scrollHeight, el.clientHeight)

  // html2canvas 在部分瀏覽器/情境下會把 SVG 畫成空白或漏線，改為：
  // 1) SVG 線條獨立渲染到 canvas
  // 2) DOM 只截框框/文字（暫時隱藏 SVG）
  // 3) 兩張 canvas 合成
  const svg = el.querySelector('svg.orgchart-lines') as SVGSVGElement | null
  const prevSvgVisibility = svg?.style.visibility
  if (svg) svg.style.visibility = 'hidden'

  // 2x 解析度，Word 內較不糊（這裡只抓框框與文字）
  // 白底／黑線僅套在複製 DOM，畫面上維持深色主題，避免儲存時整區閃白
  const nodesCanvas = await html2canvas(el, {
    backgroundColor: null,
    scale,
    useCORS: true,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc) => {
      const canvasEl = clonedDoc.querySelector('.orgchart-canvas')
      if (canvasEl) canvasEl.classList.add('orgchart-canvas--export-capture')
    }
  })

  if (svg) svg.style.visibility = prevSvgVisibility ?? ''

  let linesCanvas: HTMLCanvasElement | null = null
  if (svg) {
    // 把 CSS 計算後的樣式內嵌進 SVG，避免序列化後 stroke 消失
    const cloned = svg.cloneNode(true) as SVGSVGElement
    const srcPaths = Array.from(svg.querySelectorAll('path'))
    const dstPaths = Array.from(cloned.querySelectorAll('path'))
    for (let i = 0; i < Math.min(srcPaths.length, dstPaths.length); i += 1) {
      const s = srcPaths[i]
      const d = dstPaths[i]
      const cs = window.getComputedStyle(s)
      // 畫面上仍為淺色線；匯出 PNG 需與 --export-capture 一致（深色線＋白底）
      const stroke = isExportingImage.value ? 'rgba(0, 0, 0, 0.65)' : cs.stroke
      const strokeWidth = isExportingImage.value ? '2.5px' : cs.strokeWidth
      const fill = cs.fill
      const strokeLinecap = cs.strokeLinecap
      const strokeLinejoin = cs.strokeLinejoin
      const strokeDasharray = cs.strokeDasharray
      const strokeDashoffset = cs.strokeDashoffset
      const opacity = cs.opacity
      if (fill && fill !== 'none') d.setAttribute('fill', fill)
      else d.setAttribute('fill', 'none')
      if (stroke) d.setAttribute('stroke', stroke)
      if (strokeWidth) d.setAttribute('stroke-width', strokeWidth)
      if (strokeLinecap) d.setAttribute('stroke-linecap', strokeLinecap)
      if (strokeLinejoin) d.setAttribute('stroke-linejoin', strokeLinejoin)
      if (strokeDasharray && strokeDasharray !== 'none') d.setAttribute('stroke-dasharray', strokeDasharray)
      if (strokeDashoffset && strokeDashoffset !== '0px') d.setAttribute('stroke-dashoffset', strokeDashoffset)
      if (opacity && opacity !== '1') d.setAttribute('opacity', opacity)
    }

    // 確保序列化後仍有尺寸資訊（避免部分環境載入為 0x0）
    cloned.setAttribute('width', String(width))
    cloned.setAttribute('height', String(height))

    const svgText = new XMLSerializer().serializeToString(cloned)
    const withXmlns = svgText.includes('http://www.w3.org/2000/svg')
      ? svgText
      : svgText.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')

    const svgBlob = new Blob([withXmlns], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('failed to load serialized svg image'))
        img.src = url
      })

      const c = document.createElement('canvas')
      c.width = Math.round(width * scale)
      c.height = Math.round(height * scale)
      const ctx = c.getContext('2d')
      if (!ctx) throw new Error('canvas 2d context not available')
      ctx.drawImage(img, 0, 0, c.width, c.height)
      linesCanvas = c
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = nodesCanvas.width
  canvas.height = nodesCanvas.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context not available')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (linesCanvas) ctx.drawImage(linesCanvas, 0, 0)
  ctx.drawImage(nodesCanvas, 0, 0)

  exportSnapshottedHeights.value = null
  isExportingImage.value = false
  await nextTick()

  if (prevCollapsed) {
    isOrgchartCollapsed.value = true
    await nextTick()
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) reject(new Error('toBlob failed'))
      else resolve(b)
    }, 'image/png')
  })
  return blob
}

defineExpose({
  exportOrgChartPngBlob
})
</script>

<style scoped>
.b2-orgchart {
  width: 100%;
}

/* 收合卡片（樣式比照「工程位置圖」區塊） */
.section-card {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.85rem;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.085), rgba(0, 0, 0, 0.16));
  box-shadow:
    0 22px 56px rgba(0, 0, 0, 0.40),
    0 0 0 1px rgba(0, 0, 0, 0.34) inset;
}
.section-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.07),
    0 0 0 6px rgba(0, 0, 0, 0.10);
}
.section-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 0 0 1px rgba(255, 255, 255, 0.09) inset;
}

.section-card__header {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(0, 0, 0, 0.05));
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: background 0.2s ease;
}
.section-card__header:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.07));
}
.section-card__header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}
.section-title-wrap {
  min-width: 0;
}
.section-title {
  font-weight: 700;
}
.section-subtitle {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.58);
}
.section-card__header-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 0 0 auto;
}
.chevron {
  color: rgba(255, 255, 255, 0.65);
}

.section-card__body {
  position: relative;
  padding: 0.95rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.10), rgba(0, 0, 0, 0.20));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 12px 28px rgba(0, 0, 0, 0.18) inset;
}
.section-card__body::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 -1px 0 rgba(0, 0, 0, 0.35) inset;
  opacity: 0.9;
}
.section-surface {
  position: relative;
  z-index: 1;
  padding: 0.75rem;
  border-radius: 0.65rem;
  border: none;
  background: transparent;
  box-shadow: none;
}
.section-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
}
.section-icon--info {
  background: rgba(var(--bs-info-rgb), 0.16);
  color: rgba(255, 255, 255, 0.9);
}

.orgchart-stage {
  position: relative;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  overflow: visible; /* 不在容器內滾動，改由外層頁面滾動顯示完整內容 */
  padding: 0.75rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 760px;
}
.orgchart-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 0 0 1px rgba(0, 0, 0, 0.25) inset;
}

.orgchart-canvas {
  position: relative;
  width: 1000px;
  height: auto;
}
.orgchart-lines {
  position: absolute;
  inset: 0;
  width: 1000px;
  height: 100%;
  pointer-events: none;
}
.orgchart-lines path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.32);
  stroke-width: 2;
}

/* 儲存／截圖時「版面」仍用 --export（字級、內距），畫面維持深色底，避免整塊變白閃爍。
 * 白底、黑線、深色字僅在 html2canvas 的複製節點加上 --export-capture 時套用。 */
.orgchart-canvas--export.orgchart-canvas--export-capture .orgchart-lines path {
  stroke: rgba(0, 0, 0, 0.65);
  stroke-width: 2.5;
}

.org-node {
  position: absolute;
  margin: 0;
  box-sizing: border-box;
  height: auto;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.65rem;
  /* 不透明底，避免看到後方線條 */
  background: #0b1220;
  color: rgba(255, 255, 255, 0.92);
  text-align: left;
  padding: 0.45rem 0.55rem;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  transition: transform 0.15s ease, border-color 0.15s ease;
  overflow: visible; /* 內容完整顯示，不裁切 */
}
.org-node::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* 內層微亮面板感，同時遮住底線 */
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.12));
}

/* 匯出用字級／內距（與編輯同色底，不閃白） */
.orgchart-canvas--export .org-node {
  /* Word 插圖後字會變小感，匯出時略放大並多留一點內距 */
  padding: 0.55rem 0.7rem;
}
.orgchart-canvas--export .org-node__title {
  font-size: 1.2rem;
  line-height: 1.2;
  margin-bottom: 0.35rem;
}
.orgchart-canvas--export .org-node__body {
  font-size: 1.05rem;
  line-height: 1.35;
}
.orgchart-canvas--export .org-node__bodyPreview {
  font-size: 1.05rem;
  line-height: 1.35;
}

/* 僅截圖複製 DOM：白底供 Word */
.orgchart-canvas--export.orgchart-canvas--export-capture .org-node {
  background: #ffffff;
  color: #111827;
  border-color: rgba(0, 0, 0, 0.7);
  box-shadow: none;
}
.orgchart-canvas--export.orgchart-canvas--export-capture .org-node::before {
  background: transparent;
}
.orgchart-canvas--export.orgchart-canvas--export-capture .org-line__label,
.orgchart-canvas--export.orgchart-canvas--export-capture .org-node__title,
.orgchart-canvas--export.orgchart-canvas--export-capture .org-node__body,
.orgchart-canvas--export.orgchart-canvas--export-capture .org-node__bodyPreview {
  color: #111827;
}
.orgchart-canvas--export.orgchart-canvas--export-capture .org-line__value {
  color: #111827;
}
.orgchart-canvas--export.orgchart-canvas--export-capture .org-list-row__idx,
.orgchart-canvas--export.orgchart-canvas--export-capture .org-list-row__text {
  color: #111827;
}
.org-node > * {
  position: relative;
  z-index: 1;
}
.org-node:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.22);
}
.org-node__title {
  font-weight: 800;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  line-height: 1.1;
}
.org-node__body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.78rem;
  line-height: 1.2;
  /* 直接顯示完整內容，不要滾輪 */
}

.org-node__bodyPreview {
  width: 100%;
  font-size: 0.78rem;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.92);
  white-space: pre-line; /* 保留換行 */
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3; /* 超過 3 行顯示 ... */
  line-clamp: 3;
  word-break: break-word;
}
.org-node__bodyPreview--expanded {
  display: block;
  -webkit-line-clamp: unset;
  line-clamp: unset;
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-word;
}

.rte-toolbar {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.rte-btn {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.92);
  border-radius: 0.5rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  line-height: 1;
}
.rte-btn--danger {
  border-color: rgba(255, 99, 132, 0.35);
  background: rgba(255, 99, 132, 0.10);
}
.rte-editor {
  min-height: 140px;
  border-radius: 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  padding: 0.6rem 0.75rem;
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.92);
  outline: none;
  overflow: auto;
}
.rte-editor:focus {
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.20);
}

/* Modal 內富文本維持與組織圖相同的暗色編輯區（不自動改成淺色） */
.b2-orgchart-editor-modal-body {
  padding: 0.75rem;
  border-radius: 0.65rem;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.b2-orgchart-editor-modal-body .form-label,
.b2-orgchart-editor-modal-body .text-muted {
  color: rgba(255, 255, 255, 0.6) !important;
}
.b2-orgchart-editor-modal-body .form-control {
  background: rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
}
.b2-orgchart-editor-modal-body .form-control:focus {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(13, 110, 253, 0.55);
  color: #fff;
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.2);
}

@media (max-width: 768px) {
  .orgchart-stage {
    padding: 0.5rem;
  }
}

@media (max-width: 576px) {
  .org-node__title {
    font-size: 0.85rem;
  }
  .org-node__body {
    font-size: 0.74rem;
  }
}
.org-line {
  display: flex;
  gap: 0.25rem;
}
.org-line__label {
  color: rgba(255, 255, 255, 0.62);
  white-space: nowrap;
}
.org-line__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.org-list-row {
  display: flex;
  gap: 0.4rem;
}
.org-list-row__idx {
  width: 18px;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
}
.org-list-row__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-node--compact .org-node__body {
  display: none;
}
</style>

