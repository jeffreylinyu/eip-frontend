<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
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
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

// ── 主題系統 ────────────────────────────────────────────
type AiTheme = 'steel' | 'carbon' | 'amber'

const AI_THEMES: Record<AiTheme, {
  label: string
  dot: string
  vars: Record<string, string>
  pipe: { line: string; seg0: string; seg1: string; particle0: string; particle1: string; core0: string; core1: string; ring: string }
}> = {
  steel: {
    label: '鋼藍',
    dot: '#0ea5e9',
    pipe: {
      line:      'rgba(14,165,233,0.05)',
      seg0:      'rgba(14,165,233,0)',
      seg1:      'rgba(56,189,248,0.75)',
      particle0: '56,189,248',
      particle1: '99,102,241',
      core0:     'rgba(56,189,248,0.55)',
      core1:     'rgba(14,165,233,0)',
      ring:      '56,189,248',
    },
    vars: {
      '--ai-bg': '#07101e',
      '--ai-border-1': 'rgba(30, 64, 175, 0.9)',
      '--ai-border-2': 'rgba(14, 165, 233, 0.7)',
      '--ai-frame-speed': '9s',
      '--ai-grid-color': 'rgba(14, 165, 233, 0.03)',
      '--ai-scan-color': 'rgba(14, 165, 233, 0.5)',
      '--ai-scan-speed': '7s',
      '--ai-header-bg': 'rgba(14, 165, 233, 0.04)',
      '--ai-header-border': 'rgba(14, 165, 233, 0.12)',
      '--ai-icon-color': '#38bdf8',
      '--ai-pulse-color': 'rgba(56, 189, 248, 0.3)',
      '--ai-title-color': '#7dd3fc',
      '--ai-text': '#94a3b8',
      '--ai-phase-text': '#cbd5e1',
      '--ai-sub-visible': '#7dd3fc',
      '--ai-arrow-color': '#0ea5e9',
      '--ai-progress-from': '#1e40af',
      '--ai-progress-to': '#0ea5e9',
      '--ai-glow-dot': '#38bdf8',
      '--ai-glow-shadow': 'rgba(56, 189, 248, 0.35)',
      '--ai-pct-color': '#7dd3fc',
      '--ai-dot-active': 'rgba(14, 165, 233, 0.55)',
      '--ai-dot-active-border': 'rgba(56, 189, 248, 0.6)',
      '--ai-phase-active': '#38bdf8',
      '--ai-phase-done': 'rgba(14, 165, 233, 0.5)',
      '--ai-core-label': '#1e3a5f',
      '--ai-badge-done': '#38bdf8',
      '--ai-done-icon': '#38bdf8',
      '--ai-done-sub': '#7dd3fc',
      '--ai-border-radius': '4px',
      '--ai-shadow': '0 0 40px rgba(14,165,233,0.08), 0 24px 56px rgba(0,0,0,0.8)',
      '--ai-footer-border': 'rgba(14, 165, 233, 0.06)',
    },
  },
  carbon: {
    label: '碳黑',
    dot: '#6b7280',
    pipe: {
      line:      'rgba(255,255,255,0.04)',
      seg0:      'rgba(255,255,255,0)',
      seg1:      'rgba(209,213,219,0.65)',
      particle0: '209,213,219',
      particle1: '156,163,175',
      core0:     'rgba(209,213,219,0.45)',
      core1:     'rgba(209,213,219,0)',
      ring:      '209,213,219',
    },
    vars: {
      '--ai-bg': '#101010',
      '--ai-border-1': 'rgba(200, 200, 200, 0.5)',
      '--ai-border-2': 'rgba(120, 120, 120, 0.25)',
      '--ai-frame-speed': '13s',
      '--ai-grid-color': 'rgba(255, 255, 255, 0.02)',
      '--ai-scan-color': 'rgba(255, 255, 255, 0.22)',
      '--ai-scan-speed': '10s',
      '--ai-header-bg': 'rgba(255, 255, 255, 0.02)',
      '--ai-header-border': 'rgba(255, 255, 255, 0.07)',
      '--ai-icon-color': '#d1d5db',
      '--ai-pulse-color': 'rgba(209, 213, 219, 0.2)',
      '--ai-title-color': '#f1f5f9',
      '--ai-text': '#4b5563',
      '--ai-phase-text': '#9ca3af',
      '--ai-sub-visible': '#9ca3af',
      '--ai-arrow-color': '#6b7280',
      '--ai-progress-from': '#1f2937',
      '--ai-progress-to': '#6b7280',
      '--ai-glow-dot': '#9ca3af',
      '--ai-glow-shadow': 'rgba(156, 163, 175, 0.3)',
      '--ai-pct-color': '#e5e7eb',
      '--ai-dot-active': 'rgba(255, 255, 255, 0.35)',
      '--ai-dot-active-border': 'rgba(255, 255, 255, 0.45)',
      '--ai-phase-active': '#d1d5db',
      '--ai-phase-done': 'rgba(255, 255, 255, 0.22)',
      '--ai-core-label': '#374151',
      '--ai-badge-done': '#d1d5db',
      '--ai-done-icon': '#e5e7eb',
      '--ai-done-sub': '#9ca3af',
      '--ai-border-radius': '2px',
      '--ai-shadow': '0 0 60px rgba(0,0,0,0.6), 0 24px 56px rgba(0,0,0,0.9)',
      '--ai-footer-border': 'rgba(255, 255, 255, 0.05)',
    },
  },
  amber: {
    label: '琥珀',
    dot: '#d97706',
    pipe: {
      line:      'rgba(217,119,6,0.06)',
      seg0:      'rgba(252,211,77,0)',
      seg1:      'rgba(251,191,36,0.75)',
      particle0: '251,191,36',
      particle1: '245,158,11',
      core0:     'rgba(251,191,36,0.5)',
      core1:     'rgba(217,119,6,0)',
      ring:      '251,191,36',
    },
    vars: {
      '--ai-bg': '#0d0900',
      '--ai-border-1': 'rgba(217, 119, 6, 0.85)',
      '--ai-border-2': 'rgba(252, 211, 77, 0.45)',
      '--ai-frame-speed': '8s',
      '--ai-grid-color': 'rgba(217, 119, 6, 0.04)',
      '--ai-scan-color': 'rgba(252, 211, 77, 0.32)',
      '--ai-scan-speed': '6s',
      '--ai-header-bg': 'rgba(217, 119, 6, 0.05)',
      '--ai-header-border': 'rgba(217, 119, 6, 0.15)',
      '--ai-icon-color': '#fbbf24',
      '--ai-pulse-color': 'rgba(251, 191, 36, 0.25)',
      '--ai-title-color': '#fcd34d',
      '--ai-text': '#57534e',
      '--ai-phase-text': '#a8a29e',
      '--ai-sub-visible': '#fcd34d',
      '--ai-arrow-color': '#d97706',
      '--ai-progress-from': '#78350f',
      '--ai-progress-to': '#f59e0b',
      '--ai-glow-dot': '#fbbf24',
      '--ai-glow-shadow': 'rgba(251, 191, 36, 0.35)',
      '--ai-pct-color': '#fcd34d',
      '--ai-dot-active': 'rgba(245, 158, 11, 0.6)',
      '--ai-dot-active-border': 'rgba(251, 191, 36, 0.7)',
      '--ai-phase-active': '#fbbf24',
      '--ai-phase-done': 'rgba(217, 119, 6, 0.5)',
      '--ai-core-label': '#44403c',
      '--ai-badge-done': '#fbbf24',
      '--ai-done-icon': '#fbbf24',
      '--ai-done-sub': '#fcd34d',
      '--ai-border-radius': '1px',
      '--ai-shadow': '0 0 40px rgba(217,119,6,0.1), 0 24px 56px rgba(0,0,0,0.9)',
      '--ai-footer-border': 'rgba(217, 119, 6, 0.08)',
    },
  },
}

const aiTheme = ref<AiTheme>('steel')
const themeVars = computed(() => AI_THEMES[aiTheme.value].vars)
const pipeColors = computed(() => AI_THEMES[aiTheme.value].pipe)

// ── Canvas 管線匯流動畫 ──────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null

// 沿矩形邊緣均勻採樣來源點
function buildSources(W: number, H: number, cx: number, cy: number) {
  const pts: { x: number; y: number }[] = []
  const perEdge = 7
  for (let i = 0; i <= perEdge; i++) {
    const f = i / perEdge
    pts.push({ x: f * W,     y: -10     }) // 上邊
    pts.push({ x: f * W,     y: H + 10  }) // 下邊
    pts.push({ x: -10,       y: f * H   }) // 左邊
    pts.push({ x: W + 10,    y: f * H   }) // 右邊
  }
  // 過濾掉距離中心太近的點（避免極短管線）
  return pts.filter(p => {
    const d = Math.hypot(p.x - cx, p.y - cy)
    return d > Math.min(W, H) * 0.2
  })
}

function startCanvasAnimation() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  canvas.width  = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  const W = canvas.width
  const H = canvas.height

  // 匯流中心：畫布幾何中心
  const cx = W / 2
  const cy = H / 2

  const sources = buildSources(W, H, cx, cy)

  // ── 管線狀態（每條管線有一個滑動的「資料封包段」） ──
  type Pipeline = {
    src:   { x: number; y: number }
    t:     number    // 資料封包前端位置（0=來源，1=中心）
    speed: number
    len:   number    // 封包長度（佔整條管線的比例）
  }

  const PIPE_COUNT = 18
  const pipelines: Pipeline[] = Array.from({ length: PIPE_COUNT }, () => {
    const src = sources[Math.floor(Math.random() * sources.length)]
    return {
      src,
      t:     Math.random(),
      speed: 0.0018 + Math.random() * 0.0025,
      len:   0.10 + Math.random() * 0.12,
    }
  })

  // ── 微粒（沿管線飄動的小光點）──
  type Dot = {
    src:   { x: number; y: number }
    t:     number
    speed: number
    color: string  // '56,189,248' 格式
    size:  number
    trail: { x: number; y: number }[]
  }

  const DOT_COLORS = [pipeColors.value.particle0, pipeColors.value.particle1]
  const dots: Dot[] = Array.from({ length: 32 }, () => {
    const src = sources[Math.floor(Math.random() * sources.length)]
    return {
      src,
      t:     Math.random(),
      speed: 0.0028 + Math.random() * 0.003,
      color: DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)],
      size:  1.2 + Math.random() * 1.4,
      trail: [],
    }
  })

  // ── 到達中心後的擴散光環 ──
  type Ring = { r: number; a: number; c: string }
  const rings: Ring[] = []

  // ── 中心核心的脈動相位 ──
  let corePhase = 0

  function lerp(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  }

  const center = { x: cx, y: cy }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    const pc = pipeColors.value

    // ── 1. 管線底線 ──
    for (const pipe of pipelines) {
      ctx.beginPath()
      ctx.strokeStyle = pc.line
      ctx.lineWidth = 1
      ctx.moveTo(pipe.src.x, pipe.src.y)
      ctx.lineTo(cx, cy)
      ctx.stroke()
    }

    // ── 2. 滑動資料封包段（帶頭部亮光，尾部漸隱） ──
    for (const pipe of pipelines) {
      pipe.t += pipe.speed
      let arrivedRing = false
      if (pipe.t > 1 + pipe.len) {
        pipe.t = -pipe.len
        pipe.src = sources[Math.floor(Math.random() * sources.length)]
        arrivedRing = true
      }

      // 封包段從 tailT 到 headT
      const headT = Math.min(pipe.t, 1)
      const tailT = Math.max(pipe.t - pipe.len, 0)
      if (headT <= tailT) continue

      const headPt = lerp(pipe.src, center, headT)
      const tailPt = lerp(pipe.src, center, tailT)

      const grad = ctx.createLinearGradient(tailPt.x, tailPt.y, headPt.x, headPt.y)
      grad.addColorStop(0,   pc.seg0)
      grad.addColorStop(0.5, pc.seg1.replace('0.75)', '0.3)'))
      grad.addColorStop(1,   pc.seg1)
      ctx.beginPath()
      ctx.strokeStyle = grad
      ctx.lineWidth   = 1.5
      ctx.lineCap     = 'round'
      ctx.moveTo(tailPt.x, tailPt.y)
      ctx.lineTo(headPt.x, headPt.y)
      ctx.stroke()

      // 頭部光暈
      if (headT >= 0.95) {
        const glow = ctx.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, 5)
        glow.addColorStop(0, pc.seg1)
        glow.addColorStop(1, pc.seg0)
        ctx.beginPath()
        ctx.fillStyle = glow
        ctx.arc(headPt.x, headPt.y, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      if (arrivedRing) {
        rings.push({ r: 0, a: 0.55, c: pc.ring })
      }
    }

    // ── 3. 微粒光點（帶尾跡） ──
    for (const dot of dots) {
      dot.t += dot.speed
      if (dot.t >= 1) {
        dot.t = 0
        dot.src   = sources[Math.floor(Math.random() * sources.length)]
        dot.color = DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)]
        dot.trail = []
        rings.push({ r: 0, a: 0.35, c: pc.ring })
      }

      const pt = lerp(dot.src, center, dot.t)
      dot.trail.unshift({ x: pt.x, y: pt.y })
      if (dot.trail.length > 7) dot.trail.pop()

      // 尾跡
      for (let i = 1; i < dot.trail.length; i++) {
        const tp = dot.trail[i]
        const a  = (1 - i / dot.trail.length) * 0.35
        ctx.beginPath()
        ctx.fillStyle = `rgba(${dot.color},${a})`
        ctx.arc(tp.x, tp.y, dot.size * (1 - i / dot.trail.length), 0, Math.PI * 2)
        ctx.fill()
      }

      // 頭部光點
      const r  = dot.size * 2.8
      const dg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r)
      dg.addColorStop(0, `rgba(${dot.color},0.95)`)
      dg.addColorStop(0.45, `rgba(${dot.color},0.45)`)
      dg.addColorStop(1,   `rgba(${dot.color},0)`)
      ctx.beginPath()
      ctx.fillStyle = dg
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // ── 4. 中心收斂核心 ──
    corePhase += 0.04
    const coreR = 14 + Math.sin(corePhase) * 3

    for (let pass = 0; pass < 3; pass++) {
      const r = coreR - pass * 4
      if (r <= 0) continue
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      cg.addColorStop(0, pc.core0)
      cg.addColorStop(1, pc.core1)
      ctx.beginPath()
      ctx.fillStyle = cg
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // 核心外圓弧（三條旋轉虛線弧）
    for (let i = 0; i < 3; i++) {
      const arcAngle = corePhase * (i % 2 === 0 ? 1 : -1.3) + (i * Math.PI * 2) / 3
      ctx.beginPath()
      ctx.strokeStyle = pc.seg1.replace('0.75)', '0.25)')
      ctx.lineWidth   = 1
      ctx.arc(cx, cy, 18 + i * 6, arcAngle, arcAngle + Math.PI * 1.1)
      ctx.stroke()
    }

    // ── 5. 到達光環向外擴散 ──
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i]
      ring.r += 2.2
      ring.a -= 0.022
      if (ring.a <= 0) { rings.splice(i, 1); continue }
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${ring.c},${ring.a})`
      ctx.lineWidth   = 1
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2)
      ctx.stroke()
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

// 主題切換時重啟動畫（刷新管線顏色）
watch(aiTheme, async () => {
  if (!props.open) return
  stopCanvas()
  await nextTick()
  startCanvasAnimation()
})

onBeforeUnmount(stopCanvas)
</script>

<template>
  <div
    class="ai-batch-modal-backdrop"
    @click.self="(progress?.status === 'DONE' || !!error) && emit('close')"
  >
    <div class="ai-modal-frame" :style="themeVars">
      <div class="ai-modal-frame__spin"></div>
      <div class="ai-batch-modal">
        <div class="ai-blueprint-grid"></div>
        <!-- 管線匯流 Canvas（透明度略高於方案一以突顯動畫） -->
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
            <div class="ai-header-title">工程核心啟動中</div>
            <div class="ai-header-sub">Engineering Intelligence System</div>
          </div>
          <!-- 主題選擇器 -->
          <div class="ai-theme-switcher ms-auto">
            <button
              v-for="(def, key) in AI_THEMES"
              :key="key"
              class="ai-theme-btn"
              :class="{ 'is-active': aiTheme === key }"
              :title="def.label"
              :style="{ '--dot': def.dot }"
              @click="aiTheme = key as AiTheme"
            ></button>
          </div>
          <button
            v-if="progress?.status === 'DONE' || !!error"
            type="button"
            class="btn-close btn-close-white ms-2"
            @click="emit('close')"
          ></button>
          <div v-else class="ms-2" style="width: 16px;"></div>
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
                <div class="ai-complete-title">工程文件建立完成</div>
                <div class="ai-complete-sub">已完成公共工程邏輯整合</div>
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
                <i class="fa fa-check me-1"></i>公共工程邏輯建構完成
              </span>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="ai-batch-modal__footer">
          <small class="text-muted">
            <template v-if="progress?.status === 'DONE' || error">可關閉此視窗</template>
            <template v-else>系統正在建構中，請稍候…</template>
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
    var(--ai-border-1) 60deg,
    var(--ai-border-2) 110deg,
    transparent 170deg,
    transparent 360deg
  );
  animation: frame-spin var(--ai-frame-speed, 9s) linear infinite;
  z-index: 0;
}

@keyframes frame-spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

.ai-batch-modal {
  position: relative;
  background: var(--ai-bg, #07101e);
  border-radius: var(--ai-border-radius, 3px);
  overflow: hidden;
  z-index: 1;
  box-shadow: var(--ai-shadow);
}

.ai-blueprint-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--ai-grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--ai-grid-color) 1px, transparent 1px);
  background-size: 32px 32px;
  z-index: 0;
  pointer-events: none;
}

/* 管線匯流 Canvas — 透明度提高以突顯動畫 */
.ai-batch-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.55;
  pointer-events: none;
  z-index: 1;
}

.ai-scan-line {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--ai-scan-color) 50%, transparent 90%);
  animation: scan var(--ai-scan-speed, 7s) linear infinite;
  z-index: 2;
  pointer-events: none;
}

@keyframes scan {
  0%   { top: 0;    opacity: 0.8; }
  90%  { opacity: 0.3; }
  100% { top: 100%; opacity: 0; }
}

.ai-batch-modal__header {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--ai-header-border);
  background: var(--ai-header-bg);
}

.ai-header-icon {
  position: relative;
  width: 36px; height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ai-icon-color);
  font-size: 1rem;
  flex-shrink: 0;
}

.ai-pulse-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--ai-pulse-color);
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
  color: var(--ai-title-color);
  line-height: 1.2;
}

.ai-header-sub {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.12);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 2px;
}

.ai-theme-switcher {
  display: flex;
  gap: 5px;
  align-items: center;
}

.ai-theme-btn {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  background: var(--dot, #666);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
  padding: 0;

  &:hover { transform: scale(1.25); }
  &.is-active {
    border-color: rgba(255, 255, 255, 0.7);
    transform: scale(1.2);
  }
}

.ai-batch-modal__body {
  position: relative;
  z-index: 3;
  padding: 1.75rem 1.75rem 1.25rem;
  color: var(--ai-text);
  min-height: 230px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.ai-complete-block { text-align: center; padding: 1.5rem 0; }

.ai-complete-icon {
  font-size: 1.8rem;
  color: var(--ai-done-icon);
  margin-bottom: 1rem;
}

.ai-complete-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.ai-complete-sub {
  font-size: 0.72rem;
  color: var(--ai-done-sub);
  letter-spacing: 0.1em;
  font-weight: 500;
  text-transform: uppercase;
  opacity: 0.8;
}

.ai-phase-main {
  font-size: 1rem;
  font-weight: 500;
  color: var(--ai-phase-text);
  letter-spacing: 0.02em;
  margin-bottom: 1rem;
  min-height: 1.5rem;
}

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
  color: var(--ai-sub-visible);
}

.ai-sub-arrow {
  color: var(--ai-arrow-color);
  font-size: 0.6rem;
  flex-shrink: 0;
  opacity: 0.7;
}

.ai-progress-track {
  position: relative;
  height: 3px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0;
  overflow: visible;
  margin-bottom: 1rem;
}

.ai-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--ai-progress-from), var(--ai-progress-to));
  transition: width 2s linear;
}

.ai-progress-fill.is-done {
  background: var(--ai-progress-to);
  transition: width 0.6s ease;
}

.ai-progress-glow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--ai-glow-dot);
  box-shadow: 0 0 6px 3px var(--ai-glow-shadow);
  transition: left 2s linear;
  pointer-events: none;
}

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
  color: var(--ai-pct-color);
  font-variant-numeric: tabular-nums;
  min-width: 3.5ch;
  display: inline-block;
  text-align: right;
  flex-shrink: 0;
  letter-spacing: -0.02em;
}

.ai-pct-unit {
  font-size: 1rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.15);
}

.ai-phase-dots { display: flex; gap: 4px; align-items: center; }

.ai-phase-dot {
  width: 18px;
  height: 2px;
  background: rgba(255, 255, 255, 0.07);
  transition: all 0.8s ease;
}

.ai-phase-dot.is-done  { background: var(--ai-phase-done); }
.ai-phase-dot.is-active {
  background: var(--ai-phase-active);
  box-shadow: 0 0 5px var(--ai-phase-active);
  width: 26px;
}

.ai-step-count {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.12);
  letter-spacing: 0.05em;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.ai-status-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--ai-footer-border);
}

.ai-core-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
}

.ai-core-cell {
  width: 9px;
  height: 9px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.ai-core-cell.is-active {
  background: var(--ai-dot-active);
  border-color: var(--ai-dot-active-border);
  box-shadow: 0 0 4px var(--ai-glow-shadow);
}

.ai-core-label {
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  color: var(--ai-core-label);
  text-transform: uppercase;
  font-weight: 500;
}

.ai-badge-done {
  font-size: 0.73rem;
  font-weight: 600;
  color: var(--ai-badge-done);
  letter-spacing: 0.05em;
}

.ai-batch-modal__footer {
  position: relative;
  z-index: 3;
  padding: 0.6rem 1.75rem;
  border-top: 1px solid var(--ai-footer-border);
  text-align: right;
  background: rgba(0, 0, 0, 0.25);
}
</style>
