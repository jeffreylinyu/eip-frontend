<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import type { AiBatchProgressResponse } from '@/api/aiBatchGenerate'

interface PhaseItem {
  label: string
  subs: string[]
}

interface Props {
  open: boolean
  progress: AiBatchProgressResponse | null
  error: string | null
  displayedPercent: number
  phaseIndex: number
  visibleSubs: number
  coreStates: boolean[]
  phases: PhaseItem[]
  title?: string
  subtitle?: string
  completionTitle?: string
  completionSubtitle?: string
  doneBadge?: string
  workingText?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

// ── Canvas 工程流程圖動畫 ────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null

function startCanvasAnimation() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  canvas.width  = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  const W = canvas.width
  const H = canvas.height

  const nodes = [
    { x: W * 0.12, y: H * 0.22 }, { x: W * 0.38, y: H * 0.12 },
    { x: W * 0.65, y: H * 0.22 }, { x: W * 0.88, y: H * 0.15 },
    { x: W * 0.12, y: H * 0.55 }, { x: W * 0.38, y: H * 0.5  },
    { x: W * 0.65, y: H * 0.55 }, { x: W * 0.88, y: H * 0.5  },
    { x: W * 0.25, y: H * 0.82 }, { x: W * 0.55, y: H * 0.88 },
    { x: W * 0.78, y: H * 0.78 },
  ]
  const edges = [
    [0,1],[1,2],[2,3],[0,4],[1,5],[2,6],[3,7],
    [4,5],[5,6],[6,7],[4,8],[5,8],[5,9],[6,9],[6,10],[7,10],
  ]

  type Pulse = { edgeIdx: number; t: number; speed: number }
  const pulses: Pulse[] = Array.from({ length: 6 }, () => ({
    edgeIdx: Math.floor(Math.random() * edges.length),
    t: Math.random(),
    speed: 0.004 + Math.random() * 0.005,
  }))

  function draw() {
    ctx.clearRect(0, 0, W, H)
    for (const [a, b] of edges) {
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(6,182,212,0.1)'
      ctx.lineWidth = 1
      ctx.moveTo(nodes[a].x, nodes[a].y)
      ctx.lineTo(nodes[b].x, nodes[b].y)
      ctx.stroke()
    }
    for (const p of pulses) {
      p.t += p.speed
      if (p.t > 1) {
        p.t = 0
        p.edgeIdx = Math.floor(Math.random() * edges.length)
      }
      const [a, b] = edges[p.edgeIdx]
      const px = nodes[a].x + (nodes[b].x - nodes[a].x) * p.t
      const py = nodes[a].y + (nodes[b].y - nodes[a].y) * p.t
      const g = ctx.createRadialGradient(px, py, 0, px, py, 7)
      g.addColorStop(0, 'rgba(168,85,247,1)')
      g.addColorStop(0.4, 'rgba(6,182,212,0.6)')
      g.addColorStop(1, 'rgba(6,182,212,0)')
      ctx.beginPath()
      ctx.fillStyle = g
      ctx.arc(px, py, 7, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const n of nodes) {
      ctx.save()
      ctx.translate(n.x, n.y)
      ctx.rotate(Math.PI / 4)
      ctx.strokeStyle = 'rgba(6,182,212,0.35)'
      ctx.fillStyle   = 'rgba(6,182,212,0.06)'
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.rect(-4, -4, 8, 8)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    animFrameId = requestAnimationFrame(draw)
  }
  draw()
}

function stopCanvas() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null }
}

watch(() => props.open, async (open) => {
  if (open) { await nextTick(); startCanvasAnimation() }
  else       { stopCanvas() }
}, { immediate: true })

onBeforeUnmount(stopCanvas)
</script>

<template>
  <div
    class="ai-batch-modal-backdrop"
    @click.self="(progress?.status === 'DONE' || !!error) && emit('close')"
  >
    <div class="ai-modal-frame">
      <div class="ai-modal-frame__spin"></div>
      <div class="ai-batch-modal">
        <div class="ai-blueprint-grid"></div>
        <canvas ref="canvasRef" class="ai-batch-canvas"></canvas>
        <div class="ai-scan-line"></div>

        <!-- Header -->
        <div class="ai-batch-modal__header">
          <div class="ai-header-icon">
            <div class="ai-pulse-ring r1"></div>
            <div class="ai-pulse-ring r2"></div>
            <i class="fa fa-microchip"></i>
          </div>
          <div class="ai-header-text">
            <div class="ai-header-title">{{ title || '工程核心啟動中' }}</div>
            <div class="ai-header-sub">{{ subtitle || 'Engineering Intelligence System' }}</div>
          </div>
          <button
            v-if="progress?.status === 'DONE' || !!error"
            type="button"
            class="btn-close btn-close-white ms-auto"
            @click="emit('close')"
          ></button>
          <div v-else class="ms-auto" style="width: 16px;"></div>
        </div>

        <!-- Body -->
        <div class="ai-batch-modal__body">
          <template v-if="error">
            <div class="d-flex align-items-center gap-2 text-danger py-2">
              <i class="fa fa-circle-exclamation fa-lg"></i>
              <span>{{ error }}</span>
            </div>
          </template>

          <template v-else>
            <template v-if="progress?.status === 'DONE'">
              <div class="ai-complete-block">
                <div class="ai-complete-icon"><i class="fa fa-circle-check"></i></div>
                <div class="ai-complete-title">{{ completionTitle || '工程資料建立完成' }}</div>
                <div class="ai-complete-sub">{{ completionSubtitle || '已完成公共工程邏輯整合' }}</div>
                <div
                  v-if="progress.failedItems?.length"
                  class="alert alert-warning text-start mt-3 mb-0"
                >
                  <div class="fw-semibold mb-1">部分項目未完成，可稍後單獨重試：</div>
                  <ul class="mb-0 ps-3">
                    <li v-for="item in progress.failedItems" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="ai-phase-main">
                {{ progress ? phases[phaseIndex]?.label : '系統初始化中…' }}
              </div>
              <div class="ai-subs">
                <div
                  v-for="(sub, i) in (phases[phaseIndex]?.subs ?? [])"
                  :key="i"
                  class="ai-sub-item"
                  :class="{ 'is-visible': i < visibleSubs }"
                >
                  <span class="ai-sub-arrow">▸</span>{{ sub }}
                </div>
              </div>
            </template>

            <!-- 進度條 -->
            <div class="ai-progress-track">
              <div
                class="ai-progress-fill"
                :class="{ 'is-done': progress?.status === 'DONE' }"
                :style="{ width: `${displayedPercent}%` }"
              ></div>
              <div
                v-if="progress?.status !== 'DONE'"
                class="ai-progress-glow"
                :style="{ left: `calc(${displayedPercent}% - 6px)` }"
              ></div>
            </div>

            <!-- 百分比 + 階段點 -->
            <div class="ai-progress-meta">
              <span class="ai-pct-num">{{ displayedPercent }}<span class="ai-pct-unit">%</span></span>
              <div class="ai-phase-dots">
                <div
                  v-for="(_, i) in phases"
                  :key="i"
                  class="ai-phase-dot"
                  :class="{
                    'is-active': i === phaseIndex && progress?.status !== 'DONE',
                    'is-done':   i < phaseIndex  || progress?.status === 'DONE',
                  }"
                ></div>
              </div>
              <span v-if="progress" class="ai-step-count">
                {{ progress.currentStep }} / {{ progress.totalSteps }}
              </span>
            </div>

            <!-- CPU 核心負載矩陣 -->
            <div class="ai-status-bar">
              <template v-if="progress?.status !== 'DONE'">
                <div class="ai-core-grid">
                  <div
                    v-for="(active, i) in coreStates"
                    :key="i"
                    class="ai-core-cell"
                    :class="{ 'is-active': active }"
                  ></div>
                </div>
                <span class="ai-core-label">CORE LOAD</span>
              </template>
              <span v-else class="ai-badge-done">
                <i class="fa fa-check me-1"></i>{{ doneBadge || '公共工程邏輯建構完成' }}
              </span>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="ai-batch-modal__footer">
          <small class="text-muted">
            <template v-if="progress?.status === 'DONE' || error">可關閉此視窗</template>
            <template v-else>{{ workingText || '系統正在建構中，請稍候…' }}</template>
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-batch-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 20, 0.88);
  backdrop-filter: blur(5px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 旋轉邊框外框 */
.ai-modal-frame {
  position: relative;
  border-radius: 4px;
  padding: 1px;
  width: 660px;
  max-width: 94vw;
  overflow: hidden;
}

.ai-modal-frame__spin {
  position: absolute;
  top: 50%; left: 50%;
  width: 300%; height: 300%;
  transform: translate(-50%, -50%) rotate(0deg);
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(30, 64, 175, 0.9)  60deg,
    rgba(14, 165, 233, 0.7) 110deg,
    transparent 170deg,
    transparent 360deg
  );
  animation: frame-spin 9s linear infinite;
  z-index: 0;
}

@keyframes frame-spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Modal 主體 */
.ai-batch-modal {
  position: relative;
  background: #07101e;
  border-radius: 3px;
  overflow: hidden;
  z-index: 1;
  box-shadow: 0 0 40px rgba(14,165,233,0.08), 0 24px 56px rgba(0,0,0,0.8);
}

/* 藍圖網格背景 */
.ai-blueprint-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(14,165,233,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(14,165,233,0.03) 1px, transparent 1px);
  background-size: 32px 32px;
  z-index: 0;
  pointer-events: none;
}

/* Canvas */
.ai-batch-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.3;
  pointer-events: none;
  z-index: 1;
}

/* 掃描線 */
.ai-scan-line {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, rgba(14,165,233,0.5) 50%, transparent 90%);
  animation: scan 7s linear infinite;
  z-index: 2;
  pointer-events: none;
}

@keyframes scan {
  0%   { top: 0;    opacity: 0.8; }
  90%  { opacity: 0.3; }
  100% { top: 100%; opacity: 0; }
}

/* Header */
.ai-batch-modal__header {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(14,165,233,0.12);
  background: rgba(14,165,233,0.04);
}

.ai-header-icon {
  position: relative;
  width: 36px; height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #38bdf8;
  font-size: 1rem;
  flex-shrink: 0;
}

.ai-pulse-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(56,189,248,0.3);
  animation: pulse-ring 3.5s ease-out infinite;
}

.ai-pulse-ring.r1 { width: 28px; height: 28px; animation-delay: 0s; }
.ai-pulse-ring.r2 { width: 42px; height: 42px; animation-delay: 1.2s; }

@keyframes pulse-ring {
  0%   { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(1.8); opacity: 0; }
}

.ai-header-text { flex: 1; }

.ai-header-title {
  font-weight: 600;
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7dd3fc;
  line-height: 1.2;
}

.ai-header-sub {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.12);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 2px;
}

/* Body */
.ai-batch-modal__body {
  position: relative;
  z-index: 3;
  padding: 1.75rem 1.75rem 1.25rem;
  color: #94a3b8;
  min-height: 230px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 完成態 */
.ai-complete-block { text-align: center; padding: 1.5rem 0; }

.ai-complete-icon { font-size: 1.8rem; color: #38bdf8; margin-bottom: 1rem; }

.ai-complete-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.ai-complete-sub {
  font-size: 0.72rem;
  color: #7dd3fc;
  letter-spacing: 0.1em;
  font-weight: 500;
  text-transform: uppercase;
  opacity: 0.8;
}

/* 階段主文字 */
.ai-phase-main {
  font-size: 1rem;
  font-weight: 500;
  color: #cbd5e1;
  letter-spacing: 0.02em;
  margin-bottom: 1rem;
  min-height: 1.5rem;
}

/* 子項目 */
.ai-subs {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1.75rem;
  min-height: 4rem;
}

.ai-sub-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.73rem;
  color: transparent;
  letter-spacing: 0.05em;
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.5s ease, transform 0.5s ease, color 0.5s ease;
}

.ai-sub-item.is-visible {
  opacity: 1;
  transform: translateX(0);
  color: #7dd3fc;
}

.ai-sub-arrow { color: #0ea5e9; font-size: 0.6rem; flex-shrink: 0; opacity: 0.7; }

/* 進度條 */
.ai-progress-track {
  position: relative;
  height: 3px;
  background: rgba(255,255,255,0.05);
  overflow: visible;
  margin-bottom: 1rem;
}

.ai-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1e40af, #0ea5e9);
  transition: width 2s linear;
}

.ai-progress-fill.is-done { background: #0ea5e9; transition: width 0.6s ease; }

.ai-progress-glow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 6px 3px rgba(56,189,248,0.35);
  transition: left 2s linear;
  pointer-events: none;
}

/* 百分比 + 階段點 */
.ai-progress-meta {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.ai-pct-num {
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1;
  color: #7dd3fc;
  font-variant-numeric: tabular-nums;
  min-width: 3.5ch;
  display: inline-block;
  text-align: right;
  flex-shrink: 0;
  letter-spacing: -0.02em;
}

.ai-pct-unit { font-size: 1rem; font-weight: 400; color: rgba(255,255,255,0.15); }

.ai-phase-dots { display: flex; gap: 4px; align-items: center; }

.ai-phase-dot {
  width: 18px;
  height: 2px;
  background: rgba(255,255,255,0.07);
  transition: all 0.8s ease;
}

.ai-phase-dot.is-done  { background: rgba(14,165,233,0.5); }
.ai-phase-dot.is-active {
  background: #38bdf8;
  box-shadow: 0 0 5px #38bdf8;
  width: 26px;
}

.ai-step-count {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.12);
  letter-spacing: 0.05em;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

/* 狀態列 */
.ai-status-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(14,165,233,0.06);
}

/* CPU 核心矩陣 */
.ai-core-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
}

.ai-core-cell {
  width: 9px;
  height: 9px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.ai-core-cell.is-active {
  background: rgba(14,165,233,0.55);
  border-color: rgba(56,189,248,0.6);
  box-shadow: 0 0 4px rgba(56,189,248,0.35);
}

.ai-core-label {
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  color: #1e3a5f;
  text-transform: uppercase;
  font-weight: 500;
}

.ai-badge-done { font-size: 0.73rem; font-weight: 600; color: #38bdf8; letter-spacing: 0.05em; }

/* Footer */
.ai-batch-modal__footer {
  position: relative;
  z-index: 3;
  padding: 0.6rem 1.75rem;
  border-top: 1px solid rgba(14,165,233,0.06);
  text-align: right;
  background: rgba(0,0,0,0.25);
}
</style>
