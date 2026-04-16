<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import mermaid from 'mermaid'

const props = defineProps<{
  /** P-1 施工流程圖 JSON（type=graph, nodes, edges） */
  flowJson: string
}>()

const hostRef = ref<HTMLElement | null>(null)
const errorText = ref('')
let mermaidReady = false

function ensureMermaid() {
  if (mermaidReady) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'neutral',
    fontFamily: 'inherit',
    themeVariables: {
      fontSize: '15px'
    },
    flowchart: {
      htmlLabels: true,
      useMaxWidth: true,
      nodeSpacing: 52,
      rankSpacing: 56
    }
  })
  mermaidReady = true
}

/** Mermaid flowchart 保留字：作為節點 id 會造成解析錯誤（例如 end 用於關閉 subgraph） */
const MERMAID_RESERVED_IDS = new Set(
  [
    'end',
    'subgraph',
    'graph',
    'flowchart',
    'style',
    'class',
    'direction',
    'link',
    'click',
    'callback',
    'default',
    'break',
    'continue',
    'start'
  ].map((s) => s.toLowerCase())
)

/** Mermaid 節點文字：避免破壞語法 */
function escLabel(s: string): string {
  return s.replace(/[\[\]{}|"\\]/g, ' ').replace(/\s+/g, ' ').trim() || ' '
}

type P1FlowGraph = {
  type: string
  nodes: Array<{ id: string; label: string; kind?: string }>
  edges: Array<{ from: string; to: string; label?: string }>
}

function parseFlow(raw: string): P1FlowGraph | null {
  try {
    const flow = JSON.parse(raw) as P1FlowGraph
    if (!flow || flow.type !== 'graph' || !Array.isArray(flow.nodes)) return null
    return flow
  } catch {
    return null
  }
}

/** 單一節點 id 轉為 Mermaid 安全 id（不含保留字、不以數字開頭） */
function baseSafeId(raw: string, fallback: string): string {
  let id = String(raw || '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
  if (!id) id = fallback
  if (/^\d/.test(id)) id = `n${id}`
  if (MERMAID_RESERVED_IDS.has(id.toLowerCase())) id = `v_${id}`
  return id
}

/**
 * 為所有節點建立「原始 id → Mermaid 安全 id」對照，邊線 from/to 必須經由此表轉換。
 */
function buildMermaidIdMap(nodes: P1FlowGraph['nodes']): Map<string, string> {
  const map = new Map<string, string>()
  const used = new Set<string>()
  nodes.forEach((n, i) => {
    const rawOriginal = String(n.id ?? '').trim()
    let safe = baseSafeId(rawOriginal, `n${i + 1}`)
    let bump = 2
    while (used.has(safe)) {
      safe = `${baseSafeId(rawOriginal, `n${i + 1}`)}_${bump++}`
    }
    used.add(safe)
    map.set(rawOriginal, safe)
    const rawSan = rawOriginal.replace(/[^A-Za-z0-9_]/g, '_')
    if (rawSan && rawSan !== rawOriginal && !map.has(rawSan)) {
      map.set(rawSan, safe)
    }
  })
  return map
}

function resolveEndpoint(ref: string, idMap: Map<string, string>): string | null {
  const t = String(ref ?? '').trim()
  if (!t) return null
  if (idMap.has(t)) return idMap.get(t)!
  const san = t.replace(/[^A-Za-z0-9_]/g, '_')
  if (san && idMap.has(san)) return idMap.get(san)!
  return null
}

function flowToMermaid(flow: P1FlowGraph): string | null {
  if (!flow.nodes?.length) return null
  const idMap = buildMermaidIdMap(flow.nodes)
  const lines: string[] = ['flowchart TD']

  for (let i = 0; i < flow.nodes.length; i++) {
    const n = flow.nodes[i]
    const rawOriginal = String(n.id ?? '').trim()
    const id = idMap.get(rawOriginal) ?? baseSafeId(rawOriginal, `n${i + 1}`)
    const label = escLabel(String(n.label ?? ''))
    const kind = String(n.kind || 'process').toLowerCase()
    if (kind === 'decision') {
      lines.push(`  ${id}{${label}}`)
    } else if (kind === 'start' || kind === 'end') {
      lines.push(`  ${id}([${label}])`)
    } else {
      lines.push(`  ${id}[${label}]`)
    }
  }

  if (Array.isArray(flow.edges)) {
    for (const e of flow.edges) {
      const from = resolveEndpoint(String(e.from ?? ''), idMap)
      const to = resolveEndpoint(String(e.to ?? ''), idMap)
      if (!from || !to || from === to) continue
      const el = e.label && String(e.label).trim() ? `|${escLabel(String(e.label))}|` : ''
      lines.push(`  ${from} -->${el} ${to}`)
    }
  }

  return lines.join('\n')
}

async function renderChart() {
  errorText.value = ''
  const raw = props.flowJson?.trim() ?? ''
  if (!raw) {
    if (hostRef.value) hostRef.value.innerHTML = ''
    return
  }
  const flow = parseFlow(raw)
  const code = flow ? flowToMermaid(flow) : null
  if (!code) {
    if (hostRef.value) hostRef.value.innerHTML = ''
    errorText.value = '無法解析流程圖資料'
    return
  }
  await nextTick()
  if (!hostRef.value) return
  ensureMermaid()
  try {
    const id = `p1flow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const { svg } = await mermaid.render(id, code)
    hostRef.value.innerHTML = svg
  } catch (e) {
    console.error('[P1ConstructionProcessFlowView]', e)
    errorText.value = '流程圖渲染失敗'
    if (hostRef.value) hostRef.value.innerHTML = ''
  }
}

watch(
  () => props.flowJson,
  () => {
    void renderChart()
  },
  { immediate: true }
)

onMounted(() => {
  void renderChart()
})
</script>

<template>
  <div class="p1-construction-flow-view">
    <div v-if="errorText" class="text-warning small py-2">
      {{ errorText }}
    </div>
    <div v-else-if="!flowJson?.trim()" class="text-muted small py-3 text-center">尚無流程圖，請使用 AI 生成。</div>
    <div ref="hostRef" class="p1-mermaid-host" />
  </div>
</template>

<style scoped>
.p1-mermaid-host {
  overflow-x: auto;
  min-height: 100px;
  padding: 0.5rem 0;
}
.p1-mermaid-host :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
