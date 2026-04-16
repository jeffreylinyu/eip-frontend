<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import html2canvas from 'html2canvas'
import P1ConstructionProcessFlowView from '@/components/p1/P1ConstructionProcessFlowView.vue'

export type P1FlowNodeRow = { id: string; label: string; kind: string }
export type P1FlowEdgeRow = { from: string; to: string; label: string }

type P1FlowGraph = {
  type: 'graph'
  nodes: P1FlowNodeRow[]
  edges: P1FlowEdgeRow[]
}

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const KIND_OPTIONS = [
  { value: 'process', label: '作業' },
  { value: 'start', label: '開始' },
  { value: 'end', label: '結束' },
  { value: 'decision', label: '決策' }
]

function emptyGraph(): P1FlowGraph {
  return { type: 'graph', nodes: [], edges: [] }
}

function parseGraph(raw: string): P1FlowGraph {
  const s = raw?.trim() ?? ''
  if (!s) return emptyGraph()
  try {
    const o = JSON.parse(s) as Partial<P1FlowGraph>
    if (!o || o.type !== 'graph' || !Array.isArray(o.nodes)) return emptyGraph()
    const nodes: P1FlowNodeRow[] = o.nodes.map((n, i) => ({
      id: String((n as { id?: string }).id ?? '').trim() || `n${i + 1}`,
      label: String((n as { label?: string }).label ?? ''),
      kind: String((n as { kind?: string }).kind ?? 'process').trim() || 'process'
    }))
    const edges: P1FlowEdgeRow[] = Array.isArray(o.edges)
      ? o.edges.map((e) => ({
          from: String((e as { from?: string }).from ?? '').trim(),
          to: String((e as { to?: string }).to ?? '').trim(),
          label: String((e as { label?: string }).label ?? '').trim()
        }))
      : []
    return { type: 'graph', nodes, edges }
  } catch {
    return emptyGraph()
  }
}

function serializeGraph(g: P1FlowGraph): string {
  return JSON.stringify({
    type: 'graph',
    nodes: g.nodes.map((n) => ({
      id: n.id.trim(),
      label: n.label,
      kind: n.kind || 'process'
    })),
    edges: g.edges.map((e) => ({
      from: e.from.trim(),
      to: e.to.trim(),
      ...(e.label.trim() ? { label: e.label.trim() } : {})
    }))
  })
}

/** 無節點時與後端／舊行為一致，存成空字串 */
function serializeForEmit(g: P1FlowGraph): string {
  if (!g.nodes.length) return ''
  return serializeGraph(g)
}

const graph = ref<P1FlowGraph>(parseGraph(props.modelValue))

watch(
  () => props.modelValue,
  (v) => {
    const next = parseGraph(v ?? '')
    if (serializeForEmit(next) === serializeForEmit(graph.value)) return
    graph.value = next
  }
)

watch(
  graph,
  () => {
    const next = serializeForEmit(graph.value)
    if (next !== (props.modelValue ?? '')) emit('update:modelValue', next)
  },
  { deep: true }
)

const previewJson = computed(() => serializeForEmit(graph.value))

const nodeIdOptions = computed(() =>
  graph.value.nodes.map((n) => ({
    value: n.id,
    label: n.id + (n.label ? ` — ${n.label.slice(0, 24)}${n.label.length > 24 ? '…' : ''}` : '')
  }))
)

function addNode() {
  let k = graph.value.nodes.length + 1
  let id = `n${k}`
  while (graph.value.nodes.some((n) => n.id === id)) {
    k += 1
    id = `n${k}`
  }
  graph.value.nodes.push({ id, label: '新節點', kind: 'process' })
}

function removeNode(idx: number) {
  const removed = graph.value.nodes[idx]
  if (!removed) return
  graph.value.nodes.splice(idx, 1)
  graph.value.edges = graph.value.edges.filter((e) => e.from !== removed.id && e.to !== removed.id)
}

function addEdge() {
  const ids = graph.value.nodes.map((n) => n.id).filter(Boolean)
  const from = ids[0] ?? ''
  const to = ids[1] ?? ids[0] ?? ''
  graph.value.edges.push({ from, to, label: '' })
}

function removeEdge(idx: number) {
  graph.value.edges.splice(idx, 1)
}

const flowPreviewCaptureRef = ref<HTMLElement | null>(null)

/** 匯出與畫面預覽一致之 PNG（供 P-1 儲存後上傳）；無節點時回傳 null */
async function exportFlowPreviewPngBlob(): Promise<Blob | null> {
  if (!graph.value.nodes.length) return null
  const el = flowPreviewCaptureRef.value
  if (!el) return null
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false
  })
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

defineExpose({
  exportFlowPreviewPngBlob
})
</script>

<template>
  <div class="p1-flow-editor">
    <div class="p1-flow-editor__grid">
      <div ref="flowPreviewCaptureRef" class="p1-flow-editor__preview">
        <div class="p1-flow-editor__preview-inner">
          <P1ConstructionProcessFlowView :flow-json="previewJson" />
        </div>
      </div>
      <div class="p1-flow-editor__side">
        <div class="p1-flow-editor__block">
          <div class="p1-flow-editor__block-head">
            <span class="p1-flow-editor__block-title">節點</span>
            <button type="button" class="btn btn-sm btn-outline-primary" @click="addNode">
              <i class="fa fa-plus me-1"></i>新增節點
            </button>
          </div>
          <div v-if="!graph.nodes.length" class="text-muted small py-2">尚無節點，請新增或使用 AI 生成。</div>
          <div v-else class="table-scroll-wrap p1-flow-editor__table-wrap">
            <table class="table align-middle p1-flow-editor-table mb-0">
              <thead>
                <tr>
                  <th style="width: 22%">代號 id</th>
                  <th>顯示文字</th>
                  <th style="width: 26%">類型</th>
                  <th style="width: 4.5rem"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(node, idx) in graph.nodes" :key="'fn-' + idx + '-' + node.id">
                  <td>
                    <input v-model="node.id" type="text" class="form-control form-control-sm" autocomplete="off" />
                  </td>
                  <td>
                    <input v-model="node.label" type="text" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <select v-model="node.kind" class="form-select form-select-sm">
                      <option v-for="opt in KIND_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </td>
                  <td>
                    <button type="button" class="btn btn-sm btn-outline-danger" @click="removeNode(idx)">刪</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="p1-flow-editor__block mt-3">
          <div class="p1-flow-editor__block-head">
            <span class="p1-flow-editor__block-title">連線</span>
            <button type="button" class="btn btn-sm btn-outline-primary" :disabled="!graph.nodes.length" @click="addEdge">
              <i class="fa fa-plus me-1"></i>新增連線
            </button>
          </div>
          <div v-if="!graph.edges.length && graph.nodes.length" class="text-muted small py-2">可新增節點之間的箭線（可選標籤）。</div>
          <div v-else-if="!graph.nodes.length" class="text-muted small py-2">請先新增節點。</div>
          <div v-else class="table-scroll-wrap p1-flow-editor__table-wrap">
            <table class="table align-middle p1-flow-editor-table mb-0">
              <thead>
                <tr>
                  <th style="width: 28%">從</th>
                  <th style="width: 28%">到</th>
                  <th>線上標籤（選填）</th>
                  <th style="width: 4.5rem"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(edge, eidx) in graph.edges" :key="'fe-' + eidx">
                  <td>
                    <select v-model="edge.from" class="form-select form-select-sm">
                      <option value="" disabled>選擇</option>
                      <option v-for="opt in nodeIdOptions" :key="'ff-' + opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <select v-model="edge.to" class="form-select form-select-sm">
                      <option value="" disabled>選擇</option>
                      <option v-for="opt in nodeIdOptions" :key="'tt-' + opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <input v-model="edge.label" type="text" class="form-control form-control-sm" placeholder="選填" />
                  </td>
                  <td>
                    <button type="button" class="btn btn-sm btn-outline-danger" @click="removeEdge(eidx)">刪</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.p1-flow-editor__grid {
  display: grid;
  gap: 1rem;
  /* 兩欄等高，預覽區高度跟隨右側編輯區 */
  align-items: stretch;
  min-height: clamp(320px, 56vh, 780px);
}
@media (min-width: 992px) {
  .p1-flow-editor__grid {
    /* 左側預覽較窄，右側編輯區佔剩餘寬度 */
    grid-template-columns: minmax(260px, 420px) minmax(280px, 1fr);
  }
}
.p1-flow-editor__side {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  min-width: 0;
}
.p1-flow-editor__preview {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.65rem;
  background: rgba(255, 255, 255, 0.98);
  color: #111;
  min-height: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.p1-flow-editor__preview-inner {
  padding: 0.75rem 1rem;
  width: 100%;
  max-width: 400px;
  flex: 0 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: auto;
  box-sizing: border-box;
}
@media (max-width: 991px) {
  .p1-flow-editor__preview-inner {
    max-width: 100%;
  }
}
.p1-flow-editor__preview :deep(.p1-construction-flow-view) {
  color: inherit;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.p1-flow-editor__preview :deep(.p1-mermaid-host) {
  display: flex;
  justify-content: center;
  width: 100%;
}
.p1-flow-editor__preview :deep(.p1-mermaid-host svg) {
  display: block;
  margin-inline: auto;
}
.p1-flow-editor__block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.p1-flow-editor__block-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.92);
}
.p1-flow-editor__table-wrap {
  max-height: 280px;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.65rem;
  background: rgba(2, 6, 23, 0.45);
}
.p1-flow-editor-table {
  margin: 0;
  color: rgba(241, 245, 249, 0.95);
  font-size: 0.875rem;
}
.p1-flow-editor-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(15, 23, 42, 0.96);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(226, 232, 240, 0.9);
  font-weight: 600;
}
.p1-flow-editor-table tbody td {
  background: rgba(15, 23, 42, 0.4);
  border-color: rgba(255, 255, 255, 0.08);
  vertical-align: middle;
}
.p1-flow-editor-table :deep(.form-control),
.p1-flow-editor-table :deep(.form-select) {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
}
.p1-flow-editor-table :deep(.form-select option) {
  background: #1e293b;
  color: #f1f5f9;
}
</style>
