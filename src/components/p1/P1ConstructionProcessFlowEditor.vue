<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import html2canvas from 'html2canvas'
import P1ConstructionProcessFlowSyncfusionView from '@/components/p1/P1ConstructionProcessFlowSyncfusionView.vue'

export type P1FlowNodeRow = { id: string; label: string; kind: string }
export type P1FlowEdgeRow = { from: string; to: string; label: string }

type P1FlowGraph = {
  type: 'graph'
  nodes: P1FlowNodeRow[]
  edges: P1FlowEdgeRow[]
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    displayMode?: 'flow' | 'organization'
  }>(),
  {
    displayMode: 'flow'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

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

const flowPreviewCaptureRef = ref<HTMLElement | null>(null)
const flowPreviewDiagramRef = ref<{ exportPngBlob?: () => Promise<Blob | null> } | null>(null)

/** 匯出與畫面預覽一致之 PNG（供 P-1 儲存後上傳）；無節點時回傳 null */
async function exportFlowPreviewPngBlob(): Promise<Blob | null> {
  if (!graph.value.nodes.length) return null
  // 優先走 Syncfusion 內容匯出：不受畫面縮放/viewport 影響
  const b = await flowPreviewDiagramRef.value?.exportPngBlob?.()
  if (b) return b
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
          <P1ConstructionProcessFlowSyncfusionView
            ref="flowPreviewDiagramRef"
            :flow-json="previewJson"
            :display-mode="props.displayMode"
          />
        </div>
      </div>
      <div class="p1-flow-editor__side">
        <div class="p1-flow-editor__block">
          <div class="p1-flow-editor__block-head">
            <span class="p1-flow-editor__block-title">內容</span>
            <button type="button" class="btn btn-sm btn-outline-primary" @click="addNode">
              <i class="fa fa-plus me-1"></i>新增節點
            </button>
          </div>
          <div v-if="!graph.nodes.length" class="text-muted small py-2">尚無節點，請新增或使用 AI 生成。</div>
          <div v-else class="table-scroll-wrap p1-flow-editor__table-wrap">
            <table class="table align-middle p1-flow-editor-table mb-0">
              <thead>
                <tr>
                  <th>內容</th>
                  <th style="width: 4.5rem"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(node, idx) in graph.nodes" :key="'fn-' + idx + '-' + node.id">
                  <td>
                    <input v-model="node.label" type="text" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <button type="button" class="btn btn-sm btn-outline-danger" @click="removeNode(idx)">刪</button>
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
    /* 左側預覽圖放寬，右側內容控制約 30% */
    grid-template-columns: minmax(520px, 1fr) minmax(280px, 30%);
  }
}
.p1-flow-editor__side {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  height: 100%;
  min-width: 0;
}
.p1-flow-editor__block {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
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
  align-items: stretch;
  justify-content: center;
}
.p1-flow-editor__preview-inner {
  padding: 0.75rem 1rem;
  width: 100%;
  max-width: none;
  flex: 0 1 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
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
  align-items: stretch;
}
.p1-flow-editor__preview :deep(.p1-syncfusion-flow-view) {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.p1-flow-editor__preview :deep(.p1-syncfusion-host) {
  width: 100%;
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
  flex: 1 1 auto;
  min-height: 0;
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
