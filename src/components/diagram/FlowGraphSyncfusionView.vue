<script setup lang="ts">
import '@syncfusion/ej2-vue-diagrams/styles/bootstrap5-dark.css'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  DiagramComponent as EjsDiagram,
  Diagram,
  NodeModel,
  ConnectorModel,
  HierarchicalTree,
  DataBinding,
  LineRouting,
  ConnectorBridging,
  PrintAndExport,
  DiagramTools,
  SnapConstraints,
  NodeConstraints,
  ConnectorConstraints
} from '@syncfusion/ej2-vue-diagrams'
import type { DiagramModel } from '@syncfusion/ej2-vue-diagrams'

Diagram.Inject(HierarchicalTree, DataBinding, LineRouting, ConnectorBridging, PrintAndExport)

const props = withDefaults(
  defineProps<{
    /** 流程圖 JSON（type=graph, nodes, edges） */
    flowJson: string
    /** 畫面高度（純顯示用，不影響 Content 匯出） */
    height?: string
    /** 顯示語意：流程圖或組織圖 */
    displayMode?: 'flow' | 'organization'
  }>(),
  { height: '520px', displayMode: 'flow' }
)

type FlowNode = { id: string; label: string; kind: string }
type FlowEdge = { from: string; to: string; label?: string }
type FlowGraph = { type: string; nodes: FlowNode[]; edges: FlowEdge[] }

const diagramRef = ref<InstanceType<typeof EjsDiagram> | null>(null)
const hostEl = ref<HTMLElement | null>(null)
const nodes = ref<NodeModel[]>([])
const connectors = ref<ConnectorModel[]>([])
const isCreated = ref(false)

let readyResolve: (() => void) | null = null
const readyPromise = new Promise<void>((resolve) => {
  readyResolve = resolve
})

const layout = computed<DiagramModel['layout']>(() => ({
  type: 'HierarchicalTree',
  orientation: 'TopToBottom',
  horizontalSpacing: 28,
  verticalSpacing: 34
}))

const snapSettings = computed(() => ({
  constraints: SnapConstraints.None
}))

function estimateDisplayUnits(s: string): number {
  let u = 0
  for (const ch of (s || '').trim()) {
    const code = ch.codePointAt(0) ?? 0
    u += code <= 0x7f ? 0.6 : 1
  }
  return Math.max(0, u)
}

function computeNodeSize(kind: string, label: string, displayMode: 'flow' | 'organization'): { width: number; height: number; fontSize: number } {
  if (displayMode === 'organization') {
    const fontSize = 14
    const lineHeight = 18
    const paddingY = 12
    const width = 178
    const maxUnitsPerLine = 10
    const units = estimateDisplayUnits(label)
    const lines = Math.max(1, Math.ceil(units / maxUnitsPerLine))
    const height = Math.max(54, paddingY * 2 + lines * lineHeight)
    return { width, height, fontSize }
  }
  const k = kind.toLowerCase()
  const fontSize = 14
  const lineHeight = 18
  const paddingY = 10

  const width = k === 'start' || k === 'end' ? 140 : k === 'decision' ? 190 : 240

  const maxUnitsPerLine = k === 'decision' ? 10 : k === 'start' || k === 'end' ? 10 : 14
  const units = estimateDisplayUnits(label)
  const lines = Math.max(1, Math.ceil(units / maxUnitsPerLine))

  const minHeight = k === 'start' || k === 'end' ? 44 : k === 'decision' ? 64 : 52
  const height = Math.max(minHeight, paddingY * 2 + lines * lineHeight)
  return { width, height, fontSize }
}

function safeParse(raw: string): FlowGraph | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  try {
    const o = JSON.parse(s) as Partial<FlowGraph>
    if (!o || o.type !== 'graph' || !Array.isArray(o.nodes) || !Array.isArray(o.edges)) return null
    return o as FlowGraph
  } catch {
    return null
  }
}

function makeNode(n: FlowNode): NodeModel {
  const kind = String(n.kind ?? 'process').toLowerCase()
  const label = String(n.label ?? '').trim()
  const size = computeNodeSize(kind, label, props.displayMode)
  const base: NodeModel = {
    id: String(n.id ?? '').trim(),
    annotations: [
      {
        content: label,
        style: {
          color: '#111',
          fontSize: size.fontSize,
          textWrapping: 'Wrap'
        } as any
      }
    ],
    style: { fill: '#f2f2f2', strokeColor: '#999', strokeWidth: 1 },
    constraints:
      (NodeConstraints.Default | NodeConstraints.PointerEvents) &
      ~NodeConstraints.Select &
      ~NodeConstraints.Drag &
      ~NodeConstraints.Resize &
      ~NodeConstraints.Rotate
  }

  if (props.displayMode === 'organization') {
    return { ...base, width: size.width, height: size.height, shape: { type: 'Basic', shape: 'Rectangle' } }
  }

  if (kind === 'start' || kind === 'end') {
    return { ...base, width: size.width, height: size.height, shape: { type: 'Basic', shape: 'Ellipse' } }
  }
  if (kind === 'decision') {
    return { ...base, width: size.width, height: size.height, shape: { type: 'Basic', shape: 'Diamond' } }
  }
  return { ...base, width: size.width, height: size.height, shape: { type: 'Basic', shape: 'Rectangle' } }
}

function makeConnector(e: FlowEdge): ConnectorModel {
  const isOrganization = props.displayMode === 'organization'
  return {
    id: `c-${String(e.from)}-${String(e.to)}`,
    sourceID: String(e.from),
    targetID: String(e.to),
    type: 'Orthogonal',
    style: { strokeColor: '#666', strokeWidth: 1 },
    targetDecorator: isOrganization ? { shape: 'None' } : { shape: 'Arrow', style: { fill: '#666', strokeColor: '#666' } },
    constraints:
      (ConnectorConstraints.Default | ConnectorConstraints.InheritLineRouting | ConnectorConstraints.InheritBridging) &
      ~ConnectorConstraints.Select &
      ~ConnectorConstraints.Drag &
      ~ConnectorConstraints.DragSourceEnd &
      ~ConnectorConstraints.DragTargetEnd &
      ~ConnectorConstraints.DragSegmentThumb,
    annotations:
      isOrganization
        ? []
        :
      e.label && String(e.label).trim()
        ? [
            {
              content: String(e.label).trim(),
              offset: 0.5,
              verticalAlignment: 'Top',
              horizontalAlignment: 'Center',
              margin: { top: -10, bottom: 0, left: 0, right: 0 },
              style: { color: '#111', fontSize: 12, fill: '#ffffff', strokeColor: 'transparent' }
            }
          ]
        : []
  }
}

function wouldCreateCycle(adjacency: Map<string, string[]>, from: string, to: string): boolean {
  if (!from || !to) return false
  if (from === to) return true
  const stack = [to]
  const visited = new Set<string>()
  while (stack.length) {
    const current = stack.pop()!
    if (current === from) return true
    if (visited.has(current)) continue
    visited.add(current)
    const nextList = adjacency.get(current) ?? []
    for (const next of nextList) stack.push(next)
  }
  return false
}

function makeAcyclicEdges(edges: FlowEdge[], idSet: Set<string>): FlowEdge[] {
  const adjacency = new Map<string, string[]>()
  const accepted: FlowEdge[] = []
  const seen = new Set<string>()
  for (const edge of edges || []) {
    const from = String(edge.from ?? '').trim()
    const to = String(edge.to ?? '').trim()
    if (!idSet.has(from) || !idSet.has(to)) continue
    if (!from || !to || from === to) continue
    const key = `${from}__${to}__${String(edge.label ?? '').trim()}`
    if (seen.has(key)) continue
    if (wouldCreateCycle(adjacency, from, to)) continue
    seen.add(key)
    accepted.push({ ...edge, from, to, label: String(edge.label ?? '').trim() })
    const list = adjacency.get(from) ?? []
    list.push(to)
    adjacency.set(from, list)
  }
  return accepted
}

async function applyLayoutAndFit() {
  await nextTick()
  const host = hostEl.value
  if (!host) return
  const w = host.clientWidth
  const h = host.clientHeight
  if (!w || !h) return
  const ej = (diagramRef.value as any)?.ej2Instances as Diagram | undefined
  if (!ej) return
  try {
    ej.dataBind()
    ej.doLayout()
    // 用 Content fit，避免少量節點時被放到「很大」
    ej.fitToPage({ mode: 'Page', region: 'Content' } as any)
    // 仍可能因內容太少而放大過頭：限制最大縮放
    const z = (ej as any).zoomFactor as number | undefined
    if (typeof z === 'number' && Number.isFinite(z) && z > 0.9) {
      let guard = 0
      while (((ej as any).zoomFactor as number) > 0.9 && guard < 6) {
        ej.zoomTo({ type: 'ZoomOut', zoomFactor: 0.1 } as any)
        guard += 1
      }
    }
  } catch {
    // ignore
  }
}

async function rebuild() {
  const g = safeParse(props.flowJson)
  if (!g?.nodes?.length) {
    nodes.value = []
    connectors.value = []
    await applyLayoutAndFit()
    return
  }

  const idSet = new Set(g.nodes.map(n => String(n.id ?? '').trim()).filter(Boolean))
  nodes.value = g.nodes.map(makeNode).filter(x => !!x.id)
  connectors.value = makeAcyclicEdges(g.edges || [], idSet).map(makeConnector)

  if (isCreated.value) await applyLayoutAndFit()
}

watch(
  () => props.flowJson,
  () => void rebuild(),
  { immediate: true }
)

onMounted(() => void rebuild())

function onCreated() {
  isCreated.value = true
  readyResolve?.()
  readyResolve = null
  setTimeout(() => void applyLayoutAndFit(), 0)
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const s = String(dataUrl || '')
  const m = s.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  const mime = m[1] || 'image/png'
  const b64 = m[2] || ''
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function exportPngBlob(): Promise<Blob | null> {
  // 確保 Syncfusion 已完成 created，避免偶發拿不到 ej2Instances
  if (!isCreated.value) {
    await Promise.race([readyPromise, new Promise((r) => setTimeout(r, 2500))])
  }
  const ej = (diagramRef.value as any)?.ej2Instances as Diagram | undefined
  if (!ej) return null
  try {
    const res = (await (ej as any).exportDiagram({
      format: 'PNG',
      region: 'Content',
      multiplePage: false,
      mode: 'Data'
    })) as unknown
    if (typeof res === 'string') return dataUrlToBlob(res)
    if (res && typeof res === 'object' && 'data' in (res as any) && typeof (res as any).data === 'string') {
      return dataUrlToBlob((res as any).data)
    }
    return null
  } catch {
    return null
  }
}

async function waitUntilReady(timeoutMs: number = 2500): Promise<boolean> {
  if (isCreated.value) return true
  try {
    await Promise.race([readyPromise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))])
    return true
  } catch {
    return false
  }
}

defineExpose({ exportPngBlob, waitUntilReady })
</script>

<template>
  <div class="p1-syncfusion-flow-view">
    <div v-if="!flowJson?.trim()" class="text-muted small py-3 text-center">尚無流程圖，請先產生資料。</div>
    <div v-else ref="hostEl" class="p1-syncfusion-host">
      <ejs-diagram
        ref="diagramRef"
        :width="'100%'"
        :height="props.height"
        :nodes="nodes"
        :connectors="connectors"
        :layout="layout"
        :snapSettings="snapSettings"
        :tool="DiagramTools.None"
        @created="onCreated"
      />
    </div>
  </div>
</template>

<style scoped>
.p1-syncfusion-flow-view {
  width: 100%;
}
.p1-syncfusion-host {
  width: 100%;
}
</style>
