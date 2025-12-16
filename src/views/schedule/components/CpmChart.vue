<template>
  <div
    class="cpm-wbs d-flex flex-column"
    :class="{ 'cpm-fullscreen': isFullscreen }"
    style="height: 100%;"
  >
    <!-- topbar -->
    <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
      <div class="d-flex align-items-center gap-2">
        <h5 class="mb-0">
          <i class="fa fa-project-diagram me-2"></i>CPM 要徑圖
        </h5>
        <span class="badge bg-primary">{{ stats.totalTasks }} 個工項</span>
        <span class="badge bg-danger">{{ stats.criticalTasks }} 個關鍵工項</span>
        <span class="badge bg-info">{{ stats.totalDuration }} 天總工期</span>
      </div>

      <!-- 工具列 -->
      <div class="cpm-toolbar d-flex align-items-center" role="toolbar" aria-label="CPM 工具列">
        <!-- 視圖 -->
        <div class="btn-group cpm-toolbar-group" role="group" aria-label="視圖">
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="toggleFullscreen"
            :title="isFullscreen ? '關閉全螢幕' : '全螢幕'"
          >
            <i :class="isFullscreen ? 'fa fa-compress' : 'fa fa-expand'"></i>
            <span class="d-none d-sm-inline ms-1">
              {{ isFullscreen ? '關閉全螢幕' : '全螢幕' }}
            </span>
          </button>
          <button class="btn btn-sm btn-outline-secondary" @click="fitToPage" title="符合頁面">
            <i class="fa fa-compress-arrows-alt"></i>
            <span class="d-none d-sm-inline ms-1">符合頁面</span>
          </button>
          <button class="btn btn-sm btn-outline-secondary" @click="zoomIn" title="放大">
            <i class="fa fa-search-plus"></i>
            <span class="d-none d-sm-inline ms-1">放大</span>
          </button>
          <button class="btn btn-sm btn-outline-secondary" @click="zoomOut" title="縮小">
            <i class="fa fa-search-minus"></i>
            <span class="d-none d-sm-inline ms-1">縮小</span>
          </button>
        </div>

        <!-- 編輯 -->
        <div class="btn-group cpm-toolbar-group" role="group" aria-label="編輯">
          <button
            class="btn btn-sm"
            :class="isDrawMode ? 'btn-dark' : 'btn-outline-secondary'"
            @click="toggleDrawMode"
            title="拉線"
          >
            <i class="fa fa-share-alt"></i>
            <span class="d-none d-sm-inline ms-1">
              {{ isDrawMode ? '結束拉線' : '拉線' }}
            </span>
          </button>
          <button
            class="btn btn-sm btn-outline-secondary"
            :disabled="!hasSelection"
            @click="deleteSelection"
            title="刪除選取"
          >
            <i class="fa fa-trash"></i>
            <span class="d-none d-sm-inline ms-1">刪除</span>
          </button>
          <!-- 線色 -->
          <div
            v-if="selectedConnectorId"
            class="btn btn-sm btn-outline-secondary p-0 d-flex align-items-center justify-content-center"
            title="線色"
          >
            <input
              type="color"
              v-model="connectorColor"
              @change="applyConnectorColor"
              class="cpm-color-input"
            />
          </div>
        </div>

        <!-- 版面 -->
        <div class="btn-group cpm-toolbar-group" role="group" aria-label="版面">
          <button class="btn btn-sm btn-outline-secondary" @click="handleSaveLayout" title="儲存佈局">
            <i class="fa fa-save"></i>
            <span class="d-none d-sm-inline ms-1">儲存</span>
          </button>
          <button class="btn btn-sm btn-outline-secondary" @click="applyAutoLayout" title="自動佈局">
            <i class="fa fa-magic"></i>
            <span class="d-none d-sm-inline ms-1">自動</span>
          </button>
        </div>

        <!-- 匯出 -->
        <div class="btn-group cpm-toolbar-group" role="group" aria-label="匯出">
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            title="匯出"
          >
            <i class="fa fa-download"></i>
            <span class="d-none d-sm-inline ms-1">匯出</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end cpm-dropdown">
            <li><a class="dropdown-item" href="#" @click.prevent="exportAs('PNG')">匯出成 PNG</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="exportAs('JPG')">匯出成 JPG</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="exportAs('SVG')">匯出成 SVG</a></li>
            <li><a class="dropdown-item" href="#" @click.prevent="exportAs('PDF')">匯出成 PDF</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- diagram -->
    <div class="flex-fill">
      <ejs-diagram
        ref="diagram"
        id="cpm-wbs-diagram"
        :width="'100%'"
        :height="'100%'"
        :nodes="nodes"
        :connectors="connectors"
        :layout="layout"
        :snapSettings="snapSettings"
        :scrollSettings="scrollSettings"
        :getNodeDefaults="getNodeDefaults"
        :getConnectorDefaults="getConnectorDefaults"
        @created="onCreated"
        @positionChange="onPositionChange"
        @historyChange="onHistoryChange"
        @selectionChange="onSelectionChange"
        @collectionChange="onCollectionChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useScheduleStore } from '@/stores/schedule'
import {
  DiagramComponent as EjsDiagram,
  Diagram,
  NodeModel,
  ConnectorModel,
  SnapConstraints,
  HierarchicalTree,
  DataBinding,
  AnnotationConstraints,
  NodeConstraints,
  LineRouting,
  ConnectorBridging,
  ConnectorConstraints,
  PrintAndExport,
  DiagramTools,
  ConnectorEditing
} from '@syncfusion/ej2-vue-diagrams'

// 一定要注入這些模組
Diagram.Inject(
  HierarchicalTree,
  DataBinding,
  LineRouting,
  ConnectorBridging,
  PrintAndExport,
  ConnectorEditing
)

interface Props {
  versionId?: number
}
const props = withDefaults(defineProps<Props>(), { versionId: undefined })
const scheduleStore = useScheduleStore()
const currentVersion = computed(() =>
  props.versionId
    ? scheduleStore.versions.find(v => v.id === props.versionId)
    : scheduleStore.currentVersion
)

const projectData = computed(() => ({
  id: currentVersion.value?.id || 0,
  name: currentVersion.value?.name || '',
  tasks: currentVersion.value?.tasks || []
}))

/* ---------- CPM ---------- */
interface LeafTask {
  id: string
  name: string
  duration: number
  predecessors: string
}
interface CpmTask extends LeafTask {
  earlyStart: number
  earlyFinish: number
  lateStart: number
  lateFinish: number
  float: number
  isCritical: boolean
  deps: { id: string; type: 'FS' | 'SS' | 'FF' | 'SF'; lag: number }[]
}

const parseDeps = (pred: string) => {
  if (!pred) return [] as CpmTask['deps']
  const cleaned = String(pred).replace(/天/g, '')
  const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean)
  const out: CpmTask['deps'] = []
  for (const p of parts) {
    let m = p.match(/^(.+?)\s*(FS|SS|FF|SF)(?:\s*([+-]\d+))?$/i)
    if (m) {
      const id = m[1]
      const type = m[2].toUpperCase() as any
      const lag = m[3] ? parseInt(m[3], 10) : 0
      out.push({ id, type, lag })
      continue
    }
    m = p.match(/^(.+?)$/)
    if (m) {
      out.push({ id: m[1], type: 'FS', lag: 0 })
    }
  }
  return out
}

const collectLeafTasks = (roots: any[]): LeafTask[] => {
  const out: LeafTask[] = []
  const walk = (n: any) => {
    if (Array.isArray(n.subtasks) && n.subtasks.length) n.subtasks.forEach(walk)
    else
      out.push({
        id: String(n.TaskID),
        name: n.TaskName,
        duration: n.Duration ?? 0,
        predecessors: String(n.Predecessor || '')
      })
  }
  roots.forEach(walk)
  return out
}

const computeCPM = (flat: LeafTask[]): CpmTask[] => {
  const tasks: CpmTask[] = flat.map(t => ({
    ...t,
    earlyStart: 0,
    earlyFinish: 0,
    lateStart: 0,
    lateFinish: 0,
    float: 0,
    isCritical: false,
    deps: parseDeps(t.predecessors || '')
  }))

  const taskMap = new Map<string, CpmTask>()
  tasks.forEach(task => {
    taskMap.set(task.id, task)
  })

  const idSet = new Set(tasks.map(t => t.id))
  for (const t of tasks) {
    t.deps = t.deps.filter(d => d.id !== t.id && idSet.has(d.id))
  }

  const indegree = new Map<string, number>()
  const successorMap = new Map<string, CpmTask[]>()

  tasks.forEach(t => indegree.set(t.id, 0))

  tasks.forEach(t => {
    t.deps.forEach(dep => {
      indegree.set(t.id, (indegree.get(t.id) || 0) + 1)
      if (!successorMap.has(dep.id)) successorMap.set(dep.id, [])
      successorMap.get(dep.id)!.push(t)
    })
  })

  const topoOrder: CpmTask[] = []
  const queue: CpmTask[] = []
  indegree.forEach((deg, id) => {
    if (deg === 0) {
      const task = taskMap.get(id)
      if (task) queue.push(task)
    }
  })

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]
    topoOrder.push(current)
    const successors = successorMap.get(current.id) || []
    successors.forEach(s => {
      const nextDegree = (indegree.get(s.id) || 0) - 1
      indegree.set(s.id, nextDegree)
      if (nextDegree === 0) queue.push(s)
    })
  }

  if (topoOrder.length !== tasks.length) {
    const remaining = tasks.filter(t => !topoOrder.includes(t))
    topoOrder.push(...remaining)
  }

  const EPS = 1e-9

  topoOrder.forEach(t => {
    if (!t.deps.length) {
      t.earlyStart = 0
    } else {
      const starts = t.deps.map(dep => {
        const p = taskMap.get(dep.id)
        if (!p) return 0
        switch (dep.type) {
          case 'FS':
            return p.earlyFinish + dep.lag
          case 'SS':
            return p.earlyStart + dep.lag
          case 'FF':
            return p.earlyFinish + dep.lag - t.duration
          case 'SF':
            return p.earlyStart + dep.lag - t.duration
          default:
            return p.earlyFinish
        }
      })
      t.earlyStart = starts.length ? Math.max(...starts) : 0
    }
    t.earlyFinish = t.earlyStart + t.duration
  })

  const proj = Math.max(...tasks.map(t => t.earlyFinish))
  const backwardOrder = [...topoOrder].reverse()

  backwardOrder.forEach(t => {
    const successors = successorMap.get(t.id) || []
    if (!successors.length) {
      t.lateFinish = proj
    } else {
      const candidateLFs: number[] = []
      successors.forEach(s => {
        const dep = s.deps.find(d => d.id === t.id)
        if (!dep) return
        switch (dep.type) {
          case 'FS':
            candidateLFs.push(s.lateStart - dep.lag)
            break
          case 'FF':
            candidateLFs.push(s.lateFinish - dep.lag)
            break
          case 'SS': {
            const ls = s.lateStart - dep.lag
            candidateLFs.push(ls + t.duration)
            break
          }
          case 'SF': {
            const ls = s.lateFinish - dep.lag
            candidateLFs.push(ls + t.duration)
            break
          }
          default:
            candidateLFs.push(s.lateStart)
            break
        }
      })
      t.lateFinish = candidateLFs.length ? Math.min(...candidateLFs) : proj
    }
    t.lateStart = t.lateFinish - t.duration
    const slack = t.lateStart - t.earlyStart
    t.float = Math.abs(slack) < EPS ? 0 : slack
  })

  tasks.forEach(t => {
    t.isCritical = Math.abs(t.float) < EPS
  })
  return tasks
}

/* ---------- safe IDs ---------- */
const safeId = (raw: string | number) =>
  `n_${String(raw).replace(/[^a-zA-Z0-9_]/g, '_')}`
const safeConnId = (a: string, b: string) =>
  `c_${a.replace(/[^a-zA-Z0-9_]/g, '_')}_${b.replace(/[^a-zA-Z0-9_]/g, '_')}`
const safeAnnId = (raw: string | number) =>
  `a_${String(raw).replace(/[^a-zA-Z0-9_]/g, '_')}`

/* ---------- diagram states ---------- */
const diagram = ref<any>(null)
const nodes = ref<NodeModel[]>([])
const connectors = ref<ConnectorModel[]>([])
const stats = ref({ totalTasks: 0, criticalTasks: 0, totalDuration: 0 })
const autoFitPending = ref(false)
const isFullscreen = ref(false)

const manualConnectors = ref<Record<string, any>>({})
const connectorStyles = ref<Record<string, { strokeColor?: string; strokeWidth?: number }>>({})
const deletedConnectorIds = ref<Set<string>>(new Set())

const selectedConnectorId = ref<string | null>(null)
const connectorColor = ref('#1F2937')
const hasSelection = ref(false)
const isDrawMode = ref(false)
const loadedFromJson = ref(false)

/* 鎖 */
let isRebuilding = false
let pendingRebuild = false

const layout = {
  type: 'HierarchicalTree',
  orientation: 'LeftToRight',
  horizontalSpacing: 220,
  verticalSpacing: 120,
  horizontalAlignment: 'Left',
  verticalAlignment: 'Top',
  margin: { left: 40, top: 40, right: 40, bottom: 40 }
}
const snapSettings = { constraints: SnapConstraints.None }
const scrollSettings = { canAutoScroll: true }

/* 讓線只能拖中段不能拖頭尾，官方寫法就是用 constraints 拿掉 DragSourceEnd/DragTargetEnd :contentReference[oaicite:2]{index=2} */
const BASE_CONNECTOR_CONSTRAINTS =
  (ConnectorConstraints.Default |
    ConnectorConstraints.DragSegmentThumb |
    ConnectorConstraints.InheritLineRouting |
    ConnectorConstraints.InheritBridging) &
  ~ConnectorConstraints.DragSourceEnd &
  ~ConnectorConstraints.DragTargetEnd

const getNodeDefaults = (n: NodeModel) => {
  if (n.width == null) n.width = 180
  if (n.height == null) n.height = 90
  n.constraints =
    (n.constraints ?? NodeConstraints.Default) |
    NodeConstraints.Drag |
    NodeConstraints.Select |
    NodeConstraints.PointerEvents
  ;(n as any).hitPadding = 8
  return n
}

const getConnectorDefaults = (c: ConnectorModel) => {
  c.type = 'Orthogonal'
  c.constraints = BASE_CONNECTOR_CONSTRAINTS
  return c
}

const isContainerReady = () => {
  const el = document.getElementById('cpm-wbs-diagram')
  if (!el) return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

const disableHtmlHit = () => {
  const ej = diagram.value?.ej2Instances
  if (!ej) return
  const host: HTMLElement | null = ej.element
  if (!host) return
  host.querySelectorAll('.aon-card').forEach((el: any) => {
    ;(el as HTMLElement).style.pointerEvents = 'none'
  })
}

const scheduleRebuild = () => {
  if (isRebuilding) {
    pendingRebuild = true
    return
  }
  rebuild()
}

const rebuild = async () => {
  try {
    if (isRebuilding) {
      pendingRebuild = true
      return
    }
    isRebuilding = true

    const ej = diagram.value?.ej2Instances
    const savedDiagramJson = currentVersion.value?.cpmDiagramJson
    if (ej && savedDiagramJson) {
      ej.loadDiagram(savedDiagramJson)
      await nextTick()
      disableHtmlHit()

      nodes.value = (ej.nodes || []).map((n: any) => ({ ...n }))
      connectors.value = (ej.connectors || []).map((c: any) => ({ ...c }))
      manualConnectors.value = currentVersion.value?.cpmManualConnectors || {}
      connectorStyles.value = currentVersion.value?.cpmConnectorStyles || {}
      deletedConnectorIds.value = new Set(currentVersion.value?.cpmDeletedConnectors || [])
      loadedFromJson.value = true

      ;(ej.connectors || []).forEach((c: any) => {
        c.constraints = BASE_CONNECTOR_CONSTRAINTS
      })
      ej.dataBind()
      return
    }

    loadedFromJson.value = false

    if (!projectData.value.tasks?.length) return

    const leaves = collectLeafTasks(projectData.value.tasks)
    const res = computeCPM(leaves)

    stats.value = {
      totalTasks: res.length,
      criticalTasks: res.filter(t => t.isCritical).length,
      totalDuration: Math.max(...res.map(t => t.earlyFinish))
    }

    const newNodes: NodeModel[] = res.map(t => {
      const id = safeId(t.id)
      const stroke = t.isCritical ? '#dc3545' : '#1E88E5'
      const fill = t.isCritical ? '#FFE5E9' : '#FFFFFF'
      const title = t.name.replace(/"/g, '&quot;')
      const card = `
        <div class="aon-card" style="
          border:2px solid ${stroke}; background:${fill};
          border-radius:10px; min-width:180px; height:90px;
          padding:6px 10px; box-sizing:border-box;
          box-shadow:0 1px 2px rgba(0,0,0,.06);
          display:flex; flex-direction:column; justify-content:center; align-items:center;
          pointer-events:none;">
          <div style="font-weight:700; margin-bottom:4px; color:${t.isCritical ? '#dc3545' : '#111827'}; text-align:center;">${title}</div>
          <div style="font-size:12px; color:${t.isCritical ? '#dc3545' : '#374151'};">ES:${t.earlyStart}　EF:${t.earlyFinish}</div>
          <div style="font-size:12px; color:${t.isCritical ? '#dc3545' : '#388E3C'};">Float:${t.float}</div>
        </div>`
      return {
        id,
        width: 180,
        height: 90,
        shape: { type: 'Basic', shape: 'RoundedRectangle' },
        style: {
          fill: 'rgba(0,0,0,0)',
          strokeColor: 'rgba(0,0,0,0)'
        },
        data: {
          kind: 'task',
          rawId: t.id,
          isCritical: t.isCritical,
          title: t.name,
          es: t.earlyStart,
          ef: t.earlyFinish,
          float: t.float
        },
        annotations: [
          {
            id: safeAnnId(t.id),
            template: card,
            offset: { x: 0.5, y: 0.5 },
            width: 180,
            height: 90,
            constraints: AnnotationConstraints.ReadOnly
          }
        ]
      } as NodeModel
    })

    const newConns: ConnectorModel[] = []
    const byId = Object.fromEntries(res.map(t => [t.id, t]))
    const isCrit = Object.fromEntries(res.map(t => [safeId(t.id), t.isCritical]))
    const EPS = 1e-9
    const isEdgeCritical = (
      pId: string,
      sId: string,
      type: 'FS' | 'SS' | 'FF' | 'SF',
      lag: number
    ) => {
      const p = byId[pId]
      const s = byId[sId]
      if (!p || !s || !p.isCritical || !s.isCritical) return false
      switch (type) {
        case 'FS':
          return Math.abs(s.earlyStart - (p.earlyFinish + lag)) < EPS
        case 'SS':
          return Math.abs(s.earlyStart - (p.earlyStart + lag)) < EPS
        case 'FF':
          return Math.abs(s.earlyFinish - (p.earlyFinish + lag)) < EPS
        case 'SF':
          return Math.abs(s.earlyFinish - (p.earlyStart + lag)) < EPS
      }
    }
    const projEF = Math.max(...res.map(t => t.earlyFinish))

    for (const t of res) {
      for (const d of t.deps) {
        const s = safeId(d.id)
        const tgt = safeId(t.id)
        const critEdge = isEdgeCritical(d.id, t.id, d.type, d.lag)
        const line = critEdge ? '#dc3545' : '#90CAF9'
        const tag = critEdge ? '#dc3545' : '#1976D2'
        const label = d.lag !== 0 ? `${d.type}${d.lag > 0 ? '+' : ''}${d.lag}` : d.type
        newConns.push({
          id: safeConnId(d.id, t.id),
          sourceID: s,
          targetID: tgt,
          type: 'Orthogonal',
          constraints: BASE_CONNECTOR_CONSTRAINTS,
          style: { strokeColor: line, strokeWidth: critEdge ? 3 : 2 },
          targetDecorator: {
            shape: 'Arrow',
            style: { fill: line, strokeColor: line }
          },
          annotations: [
            {
              id: safeAnnId(`${d.id}-${t.id}`),
              content: label,
              offset: 0.5,
              style: {
                fontSize: 16,
                color: tag,
                fill: 'rgba(255,255,255,.8)'
              },
              margin: { left: 6, right: 6, top: 3, bottom: 3 }
            }
          ]
        } as ConnectorModel)
      }
    }

    const startIdRaw = '__START__'
    const endIdRaw = '__END__'
    const sNode = safeId(startIdRaw)
    const eNode = safeId(endIdRaw)
    const hasSucc = (id: string) => res.some(x => x.deps.some(d => d.id === id))
    const roots = res.filter(t => !t.deps.length)
    const leaves2 = res.filter(t => !hasSucc(t.id))

    newNodes.push(
      {
        id: sNode,
        width: 120,
        height: 40,
        shape: { type: 'Basic', shape: 'Ellipse' },
        style: { fill: '#E8F5E9', strokeColor: '#2E7D32', strokeWidth: 2 },
        annotations: [
          {
            id: safeAnnId(startIdRaw),
            content: '開始',
            style: { color: '#2E7D32', bold: true }
          }
        ]
      } as NodeModel,
      {
        id: eNode,
        width: 120,
        height: 40,
        shape: { type: 'Basic', shape: 'Ellipse' },
        style: { fill: '#FFF5F5', strokeColor: '#B71C1C', strokeWidth: 2 },
        annotations: [
          {
            id: safeAnnId(endIdRaw),
            content: '結束',
            style: { color: '#B71C1C', bold: true }
          }
        ]
      } as NodeModel
    )

    for (const t of roots) {
      const tgt = safeId(t.id)
      const critEdge = !!isCrit[tgt] && Math.abs((byId[t.id]?.earlyStart ?? 0) - 0) < EPS
      const line = critEdge ? '#dc3545' : '#90CAF9'
      newConns.push({
        id: safeConnId(startIdRaw, t.id),
        sourceID: sNode,
        targetID: tgt,
        type: 'Orthogonal',
        constraints: BASE_CONNECTOR_CONSTRAINTS,
        style: { strokeColor: line, strokeWidth: critEdge ? 3 : 2 },
        targetDecorator: { shape: 'Arrow', style: { fill: line, strokeColor: line } }
      } as ConnectorModel)
    }

    for (const t of leaves2) {
      const src = safeId(t.id)
      const critEdge =
        !!isCrit[src] && Math.abs((byId[t.id]?.earlyFinish ?? 0) - projEF) < EPS
      const line = critEdge ? '#dc3545' : '#90CAF9'
      newConns.push({
        id: safeConnId(t.id, endIdRaw),
        sourceID: src,
        targetID: eNode,
        type: 'Orthogonal',
        constraints: BASE_CONNECTOR_CONSTRAINTS,
        style: { strokeColor: line, strokeWidth: critEdge ? 3 : 2 },
        targetDecorator: { shape: 'Arrow', style: { fill: line, strokeColor: line } }
      } as ConnectorModel)
    }

    nodes.value = newNodes
    connectors.value = newConns
    await nextTick()

    if (diagram.value?.ej2Instances) {
      const ej2 = diagram.value.ej2Instances
      if (typeof ej2.beginUpdate === 'function') ej2.beginUpdate()

      ej2.layout = { ...layout }
      ej2.dataBind()
      if (!isContainerReady()) {
        await new Promise<void>(r => requestAnimationFrame(() => r()))
      }
      if (typeof ej2.doLayout === 'function') ej2.doLayout()
      fitToPage()
      ej2.layout = { type: 'None' }
      ej2.dataBind()

      if (typeof ej2.endUpdate === 'function') ej2.endUpdate()
    }

    await nextTick()
    disableHtmlHit()
  } catch (err) {
    console.error('CPM 重建錯誤', err)
    nodes.value = []
    connectors.value = []
    stats.value = { totalTasks: 0, criticalTasks: 0, totalDuration: 0 }
  } finally {
    isRebuilding = false
    if (pendingRebuild) {
      pendingRebuild = false
      rebuild()
    }
  }
}

/* ---------- 操作 ---------- */
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  nextTick(() => {
    fitToPage()
  })
}
const fitToPage = () => diagram.value?.ej2Instances.fitToPage({ mode: 'Page', region: 'Content' })
const zoomIn = () => diagram.value?.ej2Instances.zoomTo({ type: 'ZoomIn', zoomFactor: 0.2 })
const zoomOut = () => diagram.value?.ej2Instances.zoomTo({ type: 'ZoomOut', zoomFactor: 0.2 })

const toggleDrawMode = () => {
  const ej = diagram.value?.ej2Instances
  if (!ej) return
  isDrawMode.value = !isDrawMode.value
  if (isDrawMode.value) {
    const id = `m_${Date.now()}`
    ej.drawingObject = {
      id,
      sourcePoint: { x: 0, y: 0 },
      targetPoint: { x: 100, y: 100 },
      type: 'Orthogonal',
      constraints: BASE_CONNECTOR_CONSTRAINTS,
      style: { strokeColor: connectorColor.value, strokeWidth: 2 },
      data: { manual: true }
    }
    ej.tool = DiagramTools.DrawOnce
  } else {
    ej.drawingObject = {}
    ej.tool = DiagramTools.Default
  }
}

const onSelectionChange = () => {
  const ej = diagram.value?.ej2Instances
  if (!ej) return
  const sel = ej.selectedItems
  const c = sel?.connectors?.[0]
  const n = sel?.nodes?.[0]

  hasSelection.value = !!(c || n)

  if (c) {
    selectedConnectorId.value = c.id
    const st = connectorStyles.value[c.id]
    connectorColor.value = st?.strokeColor || c.style?.strokeColor || '#1F2937'
  } else {
    selectedConnectorId.value = null
  }
}

const onCollectionChange = (args: any) => {
  const ej = diagram.value?.ej2Instances
  if (!ej) return

  if (args?.state === 'Changed' || args?.state === 'Insert') {
    const el = args.element
    if (el && el instanceof Object && el.id && el.sourceID && el.targetID) {
      el.constraints = BASE_CONNECTOR_CONSTRAINTS

      if (isDrawMode.value || el.data?.manual) {
        const realId = el.id.startsWith('m_') ? el.id : `m_${el.id}`
        if (realId !== el.id) {
          el.id = realId
        }
        manualConnectors.value[realId] = {
          id: realId,
          sourceID: el.sourceID,
          targetID: el.targetID,
          type: el.type || 'Orthogonal',
          constraints: BASE_CONNECTOR_CONSTRAINTS,
          style: {
            strokeColor: el.style?.strokeColor || connectorColor.value,
            strokeWidth: el.style?.strokeWidth || 2
          },
          data: { manual: true }
        }
        if (isDrawMode.value) {
          isDrawMode.value = false
          ej.drawingObject = {}
          ej.tool = DiagramTools.Default
        }
      }
      ej.dataBind()
    }
  }

  if (args?.state === 'Remove') {
    const el = args.element
    if (el && el.id) {
      deletedConnectorIds.value.add(el.id)
      delete manualConnectors.value[el.id]
    }
  }
}

const onPositionChange = () => {
  disableHtmlHit()
}
const onHistoryChange = () => {
  disableHtmlHit()
}

/* ---------- 儲存 ---------- */
const captureNodePositions = (ej: any) => {
  const map: Record<string, { x: number; y: number; w: number; h: number }> = {}
  ej?.nodes?.forEach((n: any) => {
    map[n.id] = { x: n.offsetX, y: n.offsetY, w: n.width, h: n.height }
  })
  return map
}
const collectConnectorSegments = (ej: any) => {
  const map: Record<string, any> = {}
  ej?.connectors?.forEach((c: any) => {
    const segs: any[] = []
    if (Array.isArray(c.segments)) {
      c.segments.forEach((s: any) => {
        const pts = s.points || s.pointCollection || s.pointsCollection
        if (Array.isArray(pts)) {
          segs.push({
            type: s.type || c.type || 'Orthogonal',
            points: pts.map((p: any) => ({ x: p.x, y: p.y }))
          })
        } else {
          segs.push({
            type: s.type || c.type || 'Orthogonal'
          })
        }
      })
    }
    map[c.id] = {
      type: c.type || 'Orthogonal',
      segments: segs,
      style: c.style
    }
  })
  return map
}
const captureViewport = (ej: any) => {
  try {
    const zoom =
      ej?.scrollSettings?.currentZoom ??
      ej?.scroller?.currentZoom ??
      ej?.zoomFactor ??
      1
    const x = ej?.scrollSettings?.horizontalOffset ?? 0
    const y = ej?.scrollSettings?.verticalOffset ?? 0
    return { zoom, x, y }
  } catch {
    return { zoom: 1, x: 0, y: 0 }
  }
}

const handleSaveLayout = async () => {
  const ej = diagram.value?.ej2Instances
  const ver = currentVersion.value
  if (!ej || !ver) return

  const nodePos = captureNodePositions(ej)
  const connSeg = collectConnectorSegments(ej)
  const vp = captureViewport(ej)
  const diagramJson = ej.saveDiagram()
  const deletedArr = Array.from(deletedConnectorIds.value)

  scheduleStore.saveCpmLayout(ver.id, {
    cpmLayout: nodePos,
    cpmViewport: vp,
    cpmConnectors: connSeg,
    cpmDiagramJson: diagramJson,
    cpmManualConnectors: manualConnectors.value,
    cpmConnectorStyles: connectorStyles.value,
    cpmDeletedConnectors: deletedArr
  } as any)

  loadedFromJson.value = true
}

/* ---------- 自動佈局 ---------- */
const applyAutoLayout = async () => {
  const ej = diagram.value?.ej2Instances
  const ver = currentVersion.value
  if (!ej || !ver) return

  scheduleStore.updateVersion(ver.id, {
    cpmLayout: {},
    cpmViewport: undefined,
    cpmConnectors: {},
    cpmDiagramJson: undefined,
    cpmManualConnectors: {},
    cpmConnectorStyles: {},
    cpmDeletedConnectors: []
  } as any)

  manualConnectors.value = {}
  connectorStyles.value = {}
  deletedConnectorIds.value = new Set()
  loadedFromJson.value = false

  await rebuild()
}

/* ---------- 刪除目前選取 ---------- */
const deleteSelection = () => {
  const ej = diagram.value?.ej2Instances
  if (!ej) return
  const sel = ej.selectedItems
  const c = sel?.connectors?.[0]
  const n = sel?.nodes?.[0]

  if (c) {
    ej.remove(c)
    deletedConnectorIds.value.add(c.id)
    delete manualConnectors.value[c.id]
    selectedConnectorId.value = null
    hasSelection.value = false
    return
  }

  if (n && n.data?.manual) {
    ej.remove(n)
    hasSelection.value = false
  }
}

/* ---------- 改線顏色 ---------- */
const applyConnectorColor = () => {
  const ej = diagram.value?.ej2Instances
  if (!ej) return
  const id = selectedConnectorId.value
  if (!id) return
  const c = ej.getObject(id)
  if (!c) return
  c.style = {
    ...(c.style || {}),
    strokeColor: connectorColor.value
  }
  ej.dataBind()
  connectorStyles.value[id] = {
    strokeColor: connectorColor.value
  }
}

/* ---------- 匯出 ---------- */
type ExportFormat = 'PNG' | 'JPG' | 'SVG' | 'PDF'
const sanitizeFileName = (name: string) =>
  name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]+/g, '_')

const buildExportNodes = (ej: any): NodeModel[] => {
  const pos: Record<string, { x: number; y: number; w: number; h: number }> = {}
  ej.nodes?.forEach((n: any) => {
    pos[n.id] = {
      x: n.offsetX,
      y: n.offsetY,
      w: n.width,
      h: n.height
    }
  })

  return (ej.nodes || []).map((n: any) => {
    const p = pos[n.id] || {
      x: n.offsetX,
      y: n.offsetY,
      w: n.width,
      h: n.height
    }

    const ann = Array.isArray(n.annotations) ? n.annotations[0] : undefined
    const isTemplate = !!(ann && (ann as any).template)
    const data = n.data || {}

    if (data.kind === 'task' && isTemplate) {
      const isCritical = !!data.isCritical
      const fill = isCritical ? '#FFE5E9' : '#FFFFFF'
      const stroke = isCritical ? '#dc3545' : '#1E88E5'
      const title = String(data.title ?? '')
      const es = data.es ?? ''
      const ef = data.ef ?? ''
      const fl = data.float ?? ''

      return {
        id: n.id,
        width: p.w ?? 180,
        height: p.h ?? 90,
        offsetX: p.x,
        offsetY: p.y,
        shape: { type: 'Basic', shape: 'Rectangle' },
        style: { fill, strokeColor: stroke, strokeWidth: 2 },
        annotations: [
          {
            id: ann?.id || `${n.id}_ann`,
            content: `${title}\nES:${es}  EF:${ef}\nFloat:${fl}`,
            style: {
              whiteSpace: 'PreserveAll'
            }
          }
        ]
      } as NodeModel
    }

    return {
      id: n.id,
      width: p.w ?? n.width,
      height: p.h ?? n.height,
      offsetX: p.x,
      offsetY: p.y,
      shape: n.shape,
      style: n.style,
      annotations: n.annotations
    } as NodeModel
  })
}

const buildExportConnectors = (ej: any): ConnectorModel[] => {
  return (ej.connectors || []).map((c: any) => {
    const stroke = c.style?.strokeColor || '#1F2937'
    const width = Math.max(2, c.style?.strokeWidth ?? 2)

    return {
      id: c.id,
      sourceID: c.sourceID,
      targetID: c.targetID,
      type: c.type || 'Orthogonal',
      constraints: c.constraints ?? BASE_CONNECTOR_CONSTRAINTS,
      style: {
        ...(c.style || {}),
        strokeColor: stroke,
        strokeWidth: width
      },
      targetDecorator: {
        shape: (c.targetDecorator && c.targetDecorator.shape) || 'Arrow',
        style: {
          ...(c.targetDecorator && c.targetDecorator.style ? c.targetDecorator.style : {}),
          fill: stroke,
          strokeColor: stroke
        }
      },
      annotations: c.annotations
    } as ConnectorModel
  })
}

const exportAs = async (format: ExportFormat) => {
  const ej = diagram.value?.ej2Instances
  if (!ej) return

  const backupJson = ej.saveDiagram()

  const exportNodes = buildExportNodes(ej)
  const exportConns = buildExportConnectors(ej)

  ej.clear()
  exportNodes.forEach((n: any) => ej.add(n))
  exportConns.forEach((c: any) => ej.add(c))
  ej.dataBind()

  const base = projectData.value.name || 'CPM'
  const fileName = `${sanitizeFileName(base)}_${new Date().toISOString().slice(0, 10)}`
  await ej.exportDiagram({
    fileName,
    format,
    region: 'Content',
    multiplePage: false,
    mode: 'Download'
  })

  ej.loadDiagram(backupJson)
  await nextTick()
  disableHtmlHit()
}

/* ---------- lifecycle ---------- */
const onCreated = async () => {
  await rebuild()
  disableHtmlHit()
}
watch(
  () => props.versionId,
  () => {
    autoFitPending.value = true
    scheduleRebuild()
  }
)
watch(
  () => projectData.value.tasks,
  () => {
    scheduleRebuild()
  },
  { deep: true }
)
onMounted(() => {
  autoFitPending.value = true
  scheduleRebuild()
})
</script>

<style scoped>
.cpm-wbs {
  background: #fafafa;
}
::deep(.aon-card) {
  transform: translateZ(0);
  pointer-events: none !important;
}
.cpm-fullscreen {
  position: fixed !important;
  inset: 0;
  z-index: 2000;
  background: #fff;
}

/* 工具列本體：要讓 dropdown 能浮在上面，要有 position + z-index */
.cpm-toolbar {
  background: rgba(248, 249, 250, 0.6);
  backdrop-filter: blur(2px);
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-radius: 0.75rem;
  padding: 0.25rem 0.5rem;
  z-index: 999;
  position: relative;
  gap: 0.5rem;
}

/* 每一組之間再拉開一點 */
.cpm-toolbar-group {
  gap: 0.25rem;
}

/* dropdown 要比 toolbar 再高一層，避免被 diagram 蓋掉 :contentReference[oaicite:3]{index=3} */
.cpm-dropdown {
  z-index: 2101;
}

/* 小色塊 */
.cpm-toolbar .cpm-color-input {
  width: 2.1rem;
  height: 1.6rem;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
</style>
