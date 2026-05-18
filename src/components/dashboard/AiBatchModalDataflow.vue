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

interface ThemePipe {
  pipeOuter: string
  pipeInner: string
  pktHead: string
  pktTrail: string
  blockBg: string
  blockBorder: string
  blockBorderPulse: string
  blockText: string
  blockDot: string
  coreGlow0: string
  coreGlow1: string
  coreRing: string
  coreText: string
  arrivalRing: string
}

const AI_THEMES: Record<AiTheme, {
  label: string; dot: string
  vars: Record<string, string>
  pipe: ThemePipe
}> = {
  steel: {
    label: '鋼藍', dot: '#0ea5e9',
    pipe: {
      pipeOuter:       'rgba(14,165,233,0.13)',
      pipeInner:       'rgba(3,8,22,0.85)',
      pktHead:         'rgba(56,189,248,1)',
      pktTrail:        'rgba(14,165,233,0)',
      blockBg:         'rgba(4,12,28,0.92)',
      blockBorder:     'rgba(14,165,233,0.28)',
      blockBorderPulse:'rgba(56,189,248,0.7)',
      blockText:       'rgba(186,230,253,0.9)',
      blockDot:        '#38bdf8',
      coreGlow0:       'rgba(56,189,248,0.55)',
      coreGlow1:       'rgba(14,165,233,0)',
      coreRing:        'rgba(56,189,248,0.35)',
      coreText:        'rgba(186,230,253,0.8)',
      arrivalRing:     '56,189,248',
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
    label: '碳黑', dot: '#6b7280',
    pipe: {
      pipeOuter:       'rgba(255,255,255,0.09)',
      pipeInner:       'rgba(8,8,8,0.88)',
      pktHead:         'rgba(209,213,219,1)',
      pktTrail:        'rgba(156,163,175,0)',
      blockBg:         'rgba(12,12,12,0.93)',
      blockBorder:     'rgba(209,213,219,0.22)',
      blockBorderPulse:'rgba(255,255,255,0.65)',
      blockText:       'rgba(226,232,240,0.88)',
      blockDot:        '#9ca3af',
      coreGlow0:       'rgba(209,213,219,0.45)',
      coreGlow1:       'rgba(209,213,219,0)',
      coreRing:        'rgba(209,213,219,0.3)',
      coreText:        'rgba(226,232,240,0.75)',
      arrivalRing:     '209,213,219',
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
    label: '琥珀', dot: '#d97706',
    pipe: {
      pipeOuter:       'rgba(217,119,6,0.15)',
      pipeInner:       'rgba(10,6,0,0.9)',
      pktHead:         'rgba(251,191,36,1)',
      pktTrail:        'rgba(217,119,6,0)',
      blockBg:         'rgba(10,6,0,0.93)',
      blockBorder:     'rgba(217,119,6,0.32)',
      blockBorderPulse:'rgba(251,191,36,0.75)',
      blockText:       'rgba(253,230,138,0.9)',
      blockDot:        '#fbbf24',
      coreGlow0:       'rgba(251,191,36,0.5)',
      coreGlow1:       'rgba(217,119,6,0)',
      coreRing:        'rgba(251,191,36,0.3)',
      coreText:        'rgba(253,230,138,0.8)',
      arrivalRing:     '251,191,36',
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

// ── Canvas 資料源匯流動畫 ────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animFrameId: number | null = null

// 資料來源定義（各代表一種工程文件來源）
const SOURCE_DEFS = [
  { label: 'PCCES工項', fx: 0.08, fy: 0.15 },
  { label: '工程合約',  fx: 0.50, fy: 0.07 },
  { label: '施工規範',  fx: 0.90, fy: 0.16 },
  { label: '品管制度',  fx: 0.93, fy: 0.58 },
  { label: '材料試驗',  fx: 0.80, fy: 0.90 },
  { label: '設計圖說',  fx: 0.20, fy: 0.90 },
  { label: '施工計畫',  fx: 0.06, fy: 0.58 },
]

// 求區塊邊緣上距離目標最近的點（供管線精準對接）
function blockEdge(sx: number, sy: number, tx: number, ty: number, bw: number, bh: number) {
  const dx = tx - sx
  const dy = ty - sy
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: sx, y: sy }
  const scaleX = Math.abs(dx) > 0.001 ? (bw / 2) / Math.abs(dx) : Infinity
  const scaleY = Math.abs(dy) > 0.001 ? (bh / 2) / Math.abs(dy) : Infinity
  const s = Math.min(scaleX, scaleY)
  return { x: sx + dx * s, y: sy + dy * s }
}

// 圓周上的接點
function circleEdge(cx: number, cy: number, r: number, tx: number, ty: number) {
  const angle = Math.atan2(ty - cy, tx - cx)
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }
}

function startCanvasAnimation() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  canvas.width  = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  const W = canvas.width
  const H = canvas.height
  const cx = W / 2
  const cy = H / 2

  // 區塊尺寸
  const BW = Math.round(W * 0.115)  // ~76px on 660px canvas
  const BH = 26

  // 根據實際像素座標建立來源
  const sources = SOURCE_DEFS.map(d => ({
    label: d.label,
    x: d.fx * W,
    y: d.fy * H,
    bw: BW, bh: BH,
    phase: Math.random() * Math.PI * 2,   // pulsing offset
    dotPhase: Math.random() * Math.PI * 2,
  }))

  // 為每條管線建立資料封包
  const PACKETS_PER_PIPE = 3
  const BASE_PX_SPEED    = 0.45          // 每幀 px（視覺速度保持一致）

  type Packet = { t: number; speed: number }
  type PipeObj = {
    src:    typeof sources[0]
    startPt: { x: number; y: number }   // 區塊邊緣
    endPt:   { x: number; y: number }   // 核心邊緣
    dist:    number
    packets: Packet[]
  }

  const CORE_R = 22  // 核心圓半徑（px）

  const pipes: PipeObj[] = sources.map(src => {
    const startPt = blockEdge(src.x, src.y, cx, cy, src.bw, src.bh)
    const endPt   = circleEdge(cx, cy, CORE_R, src.x, src.y)
    const dist    = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y)
    const speed   = BASE_PX_SPEED / dist    // t/frame

    const packets: Packet[] = Array.from({ length: PACKETS_PER_PIPE }, (_, i) => ({
      t:     i / PACKETS_PER_PIPE,
      speed,
    }))
    return { src, startPt, endPt, dist, packets }
  })

  // 到達光環
  type Ring = { r: number; a: number; rgb: string }
  const rings: Ring[] = []

  // 全域計時
  let frame    = 0
  let corePh   = 0

  function draw() {
    ctx.clearRect(0, 0, W, H)
    frame++
    corePh += 0.025

    const pc = AI_THEMES[aiTheme.value].pipe

    // ── 1. 管道（外壁 + 內腔）──
    for (const pipe of pipes) {
      const { startPt: s, endPt: e } = pipe

      // 外壁光暈
      ctx.beginPath()
      ctx.strokeStyle = pc.pipeOuter
      ctx.lineWidth   = 5
      ctx.lineCap     = 'round'
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(e.x, e.y)
      ctx.stroke()

      // 內腔（暗色，產生「管壁」視覺深度）
      ctx.beginPath()
      ctx.strokeStyle = pc.pipeInner
      ctx.lineWidth   = 3
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(e.x, e.y)
      ctx.stroke()
    }

    // ── 2. 資料封包（帶漸隱尾跡的光段）──
    const PKT_TRAIL = 0.055   // 尾跡長度（t 比例）

    for (const pipe of pipes) {
      for (const pkt of pipe.packets) {
        pkt.t += pkt.speed
        if (pkt.t >= 1) {
          pkt.t -= 1
          rings.push({ r: 0, a: 0.6, rgb: pc.arrivalRing })
        }

        const headT = pkt.t
        const tailT = Math.max(0, headT - PKT_TRAIL)

        const { startPt: s, endPt: e } = pipe

        const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) =>
          ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

        const headPt = lerp(s, e, headT)
        const tailPt = lerp(s, e, tailT)

        // 尾跡漸層段
        const sg = ctx.createLinearGradient(tailPt.x, tailPt.y, headPt.x, headPt.y)
        sg.addColorStop(0, pc.pktTrail)
        sg.addColorStop(1, pc.pktHead)
        ctx.beginPath()
        ctx.strokeStyle = sg
        ctx.lineWidth   = 2
        ctx.lineCap     = 'round'
        ctx.moveTo(tailPt.x, tailPt.y)
        ctx.lineTo(headPt.x, headPt.y)
        ctx.stroke()

        // 頭部光點
        const headR = 3.5
        const hg = ctx.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, headR * 2)
        hg.addColorStop(0, pc.pktHead)
        hg.addColorStop(1, pc.pktTrail)
        ctx.beginPath()
        ctx.fillStyle = hg
        ctx.arc(headPt.x, headPt.y, headR * 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ── 3. 資料來源區塊 ──
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'

    for (const src of sources) {
      src.phase    += 0.018
      src.dotPhase += 0.05

      const bx = src.x - src.bw / 2
      const by = src.y - src.bh / 2
      const pulse = (Math.sin(src.phase) + 1) / 2  // 0 ~ 1

      // 背景
      ctx.fillStyle = pc.blockBg
      ctx.beginPath()
      ctx.roundRect(bx, by, src.bw, src.bh, 3)
      ctx.fill()

      // 邊框（隨 pulse 輕微亮暗）
      const borderColor = pulse > 0.65 ? pc.blockBorderPulse : pc.blockBorder
      ctx.strokeStyle = borderColor
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.roundRect(bx, by, src.bw, src.bh, 3)
      ctx.stroke()

      // 指示燈（左側小圓）
      const dotX = bx + 9
      const dotY = src.y
      const dotOn = Math.sin(src.dotPhase) > 0
      ctx.beginPath()
      if (dotOn) {
        ctx.fillStyle   = pc.blockDot
        ctx.shadowColor = pc.blockDot
        ctx.shadowBlur  = 6
      } else {
        ctx.fillStyle  = 'rgba(40,50,80,0.6)'
        ctx.shadowBlur = 0
      }
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // 標籤文字
      ctx.font      = `${Math.round(BW * 0.155)}px "Noto Sans TC", sans-serif`
      ctx.fillStyle = pc.blockText
      ctx.fillText(src.label, src.x + 4, src.y)

      // 區塊右側「資料量」迷你進度條（3格像素條）
      const barX = bx + src.bw - 6
      const barH = 12
      const barY = src.y - barH / 2
      for (let seg = 0; seg < 3; seg++) {
        const segOn = ((frame + src.dotPhase * 8 + seg * 5) % 18) < 12
        ctx.fillStyle = segOn ? pc.blockDot : 'rgba(30,50,80,0.4)'
        ctx.fillRect(barX - seg * 4, barY + seg * 4, 3, 3)
      }
    }

    // ── 4. 中心核心（收斂點）──
    // 多層漸層光暈（呼吸脈動）
    const breathR = CORE_R + Math.sin(corePh) * 4
    for (let layer = 4; layer >= 0; layer--) {
      const r  = breathR + layer * 10
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      const a  = (0.45 - layer * 0.08) * ((Math.sin(corePh) + 1) * 0.25 + 0.75)
      cg.addColorStop(0, pc.coreGlow0.replace('0.55)', `${a})`))
      cg.addColorStop(1, pc.coreGlow1)
      ctx.beginPath()
      ctx.fillStyle = cg
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // 核心外圈（三弧旋轉）
    for (let arc = 0; arc < 3; arc++) {
      const speed  = arc % 2 === 0 ? 1 : -0.7
      const angle  = corePh * speed + (arc * Math.PI * 2) / 3
      const arcLen = Math.PI * (0.5 + arc * 0.15)
      ctx.beginPath()
      ctx.strokeStyle = pc.coreRing
      ctx.lineWidth   = 1.2
      ctx.arc(cx, cy, CORE_R + 6 + arc * 7, angle, angle + arcLen)
      ctx.stroke()
    }

    // 核心圓心
    ctx.beginPath()
    ctx.fillStyle = pc.coreGlow0
    ctx.arc(cx, cy, CORE_R * 0.55, 0, Math.PI * 2)
    ctx.fill()

    // 核心文字
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.font         = `bold ${Math.round(CORE_R * 0.52)}px monospace`
    ctx.fillStyle    = pc.coreText
    ctx.fillText('EIP', cx, cy - CORE_R * 0.22)
    ctx.font         = `${Math.round(CORE_R * 0.38)}px monospace`
    ctx.fillText('CORE', cx, cy + CORE_R * 0.3)

    // ── 5. 到達光環向外擴散 ──
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i]
      ring.r += 2.5
      ring.a -= 0.025
      if (ring.a <= 0) { rings.splice(i, 1); continue }
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${ring.rgb},${ring.a})`
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
          <div class="ai-theme-switcher ms-auto">
            <button
              v-for="(def, key) in AI_THEMES" :key="key"
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

            <div class="ai-progress-meta">
              <span class="ai-pct-num">{{ displayedPercent }}<span class="ai-pct-unit">%</span></span>
              <div class="ai-phase-dots">
                <div
                  v-for="(_, i) in phases" :key="i"
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

            <div class="ai-status-bar">
              <template v-if="progress?.status !== 'DONE'">
                <div class="ai-core-grid">
                  <div
                    v-for="(active, i) in coreStates" :key="i"
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

/* 資料匯流 canvas：可見度調高，讓來源區塊清晰 */
.ai-batch-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.62;
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
  display: flex; align-items: center; justify-content: center;
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
  color: rgba(255,255,255,0.12);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 2px;
}

.ai-theme-switcher { display: flex; gap: 5px; align-items: center; }

.ai-theme-btn {
  width: 12px; height: 12px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.15);
  background: var(--dot, #666);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
  padding: 0;

  &:hover { transform: scale(1.25); }
  &.is-active { border-color: rgba(255,255,255,0.7); transform: scale(1.2); }
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

.ai-complete-icon { font-size: 1.8rem; color: var(--ai-done-icon); margin-bottom: 1rem; }

.ai-complete-title {
  font-size: 1.05rem; font-weight: 600;
  color: #e2e8f0; letter-spacing: 0.05em; margin-bottom: 0.5rem;
}

.ai-complete-sub {
  font-size: 0.72rem; color: var(--ai-done-sub);
  letter-spacing: 0.1em; font-weight: 500;
  text-transform: uppercase; opacity: 0.8;
}

.ai-phase-main {
  font-size: 1rem; font-weight: 500;
  color: var(--ai-phase-text);
  letter-spacing: 0.02em; margin-bottom: 1rem; min-height: 1.5rem;
}

.ai-subs { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.75rem; min-height: 4rem; }

.ai-sub-item {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.73rem; color: transparent;
  letter-spacing: 0.05em; opacity: 0; transform: translateX(-6px);
  transition: opacity 0.5s ease, transform 0.5s ease, color 0.5s ease;
}

.ai-sub-item.is-visible { opacity: 1; transform: translateX(0); color: var(--ai-sub-visible); }

.ai-sub-arrow { color: var(--ai-arrow-color); font-size: 0.6rem; flex-shrink: 0; opacity: 0.7; }

.ai-progress-track {
  position: relative; height: 3px;
  background: rgba(255,255,255,0.05);
  border-radius: 0; overflow: visible; margin-bottom: 1rem;
}

.ai-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--ai-progress-from), var(--ai-progress-to));
  transition: width 2s linear;
}

.ai-progress-fill.is-done { background: var(--ai-progress-to); transition: width 0.6s ease; }

.ai-progress-glow {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--ai-glow-dot);
  box-shadow: 0 0 6px 3px var(--ai-glow-shadow);
  transition: left 2s linear; pointer-events: none;
}

.ai-progress-meta { display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.25rem; }

.ai-pct-num {
  font-size: 2.2rem; font-weight: 700; line-height: 1;
  color: var(--ai-pct-color); font-variant-numeric: tabular-nums;
  min-width: 3.5ch; display: inline-block; text-align: right;
  flex-shrink: 0; letter-spacing: -0.02em;
}

.ai-pct-unit { font-size: 1rem; font-weight: 400; color: rgba(255,255,255,0.15); }

.ai-phase-dots { display: flex; gap: 4px; align-items: center; }

.ai-phase-dot {
  width: 18px; height: 2px;
  background: rgba(255,255,255,0.07);
  transition: all 0.8s ease;
}

.ai-phase-dot.is-done { background: var(--ai-phase-done); }
.ai-phase-dot.is-active { background: var(--ai-phase-active); box-shadow: 0 0 5px var(--ai-phase-active); width: 26px; }

.ai-step-count {
  font-size: 0.7rem; color: rgba(255,255,255,0.12);
  letter-spacing: 0.05em; margin-left: auto; font-variant-numeric: tabular-nums;
}

.ai-status-bar {
  display: flex; align-items: center; gap: 0.75rem;
  padding-top: 0.9rem; border-top: 1px solid var(--ai-footer-border);
}

.ai-core-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; }

.ai-core-cell {
  width: 9px; height: 9px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.ai-core-cell.is-active {
  background: var(--ai-dot-active);
  border-color: var(--ai-dot-active-border);
  box-shadow: 0 0 4px var(--ai-glow-shadow);
}

.ai-core-label { font-size: 0.6rem; letter-spacing: 0.12em; color: var(--ai-core-label); text-transform: uppercase; font-weight: 500; }

.ai-badge-done { font-size: 0.73rem; font-weight: 600; color: var(--ai-badge-done); letter-spacing: 0.05em; }

.ai-batch-modal__footer {
  position: relative; z-index: 3;
  padding: 0.6rem 1.75rem;
  border-top: 1px solid var(--ai-footer-border);
  text-align: right;
  background: rgba(0,0,0,0.25);
}
</style>
