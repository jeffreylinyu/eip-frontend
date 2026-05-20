<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
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
  phases: PhaseItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

// ── 終端機 Log 資料 ─────────────────────────────────────
const PHASE_LOGS: string[][] = [
  [
    'Connecting to EIP core engine...',
    'Loading construction data schema v4.1',
    'Parsing XML project structure...',
    'Identifying work item categories',
    'Engineering type: 公共工程 / 土木',
    'Data integrity verification: PASSED',
  ],
  [
    'Initializing construction workflow engine',
    'Building work breakdown structure (WBS)',
    'Mapping cross-document dependencies',
    'Configuring sub-category hierarchy',
    'Cross-referencing PCCES item codes',
    'Framework assembly: COMPLETE',
  ],
  [
    'Loading QC regulation database v3.2',
    'Configuring 3-tier inspection workflow',
    'Applying quality management standards',
    'Generating self-check procedure templates',
    '三級品管制度: ACTIVATED',
    'QC framework validation: OK',
  ],
  [
    'Scanning material test requirements',
    'Cross-checking test frequency tables',
    'Matching work items to test protocols',
    'Analyzing contract specifications',
    'Material database sync: 247 items indexed',
    'Test plan generation: COMPLETE',
  ],
  [
    'Initializing document generation engine',
    'Populating construction plan templates',
    'Applying project-specific parameters',
    'Output format: DOCX / PDF configured',
    'Compilation pass 1: SUCCESS',
    'Writing to document store...',
  ],
  [
    'Running document consistency checks',
    'Verifying construction workflow logic',
    'Scanning for risk indicators',
    'Cross-document reference validation',
    'Final integrity check: 0 errors',
    'Committing documents to repository',
  ],
]

// ── Log 行狀態 ───────────────────────────────────────────
interface LogLine {
  id: number
  time: string
  text: string
  type: 'info' | 'ok' | 'warn'
}

const logLines = ref<LogLine[]>([])
const logContainer = ref<HTMLElement | null>(null)
let logIdCounter = 0
let logTimer: ReturnType<typeof setInterval> | null = null
let logQueue: string[] = []

function nowTime() {
  return new Date().toLocaleTimeString('zh-TW', { hour12: false })
}

function classifyLine(text: string): LogLine['type'] {
  if (/COMPLETE|PASSED|SUCCESS|OK|ACTIVATED|DONE|indexed/.test(text)) return 'ok'
  if (/warn|error|fail/i.test(text)) return 'warn'
  return 'info'
}

function pushLog(text: string) {
  logLines.value.push({ id: logIdCounter++, time: nowTime(), text, type: classifyLine(text) })
  if (logLines.value.length > 60) logLines.value.splice(0, logLines.value.length - 60)
}

function drainQueue() {
  if (logQueue.length > 0) {
    const line = logQueue.shift()!
    pushLog(line)
    scrollLog()
  }
}

function scrollLog() {
  setTimeout(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  }, 30)
}

function startLogTimer() {
  if (logTimer) clearInterval(logTimer)
  logTimer = setInterval(drainQueue, 900)
}

function stopLogTimer() {
  if (logTimer) { clearInterval(logTimer); logTimer = null }
}

function enqueuePhaseLines(phaseIdx: number) {
  const lines = PHASE_LOGS[phaseIdx] ?? []
  logQueue.push(...lines)
}

// ── 閃爍游標 ────────────────────────────────────────────
const cursorVisible = ref(true)
let cursorTimer: ReturnType<typeof setInterval> | null = null

function startCursor() {
  if (cursorTimer) clearInterval(cursorTimer)
  cursorTimer = setInterval(() => { cursorVisible.value = !cursorVisible.value }, 530)
}

function stopCursor() {
  if (cursorTimer) { clearInterval(cursorTimer); cursorTimer = null }
}

// ── ASCII 進度條 ─────────────────────────────────────────
const BAR_WIDTH = 32
const asciiBar = computed(() => {
  const filled = Math.round((props.displayedPercent / 100) * BAR_WIDTH)
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled)
})

// ── 生命週期 ─────────────────────────────────────────────
watch(() => props.open, (open) => {
  if (open) {
    logLines.value = []
    logQueue = []
    pushLog('EIP 工程案資料建構引擎 v2.0 initializing...')
    pushLog('Authenticating session credentials...')
    pushLog('已連線至工程案資料建構處理叢集')
    if (props.phaseIndex >= 0) enqueuePhaseLines(props.phaseIndex)
    startLogTimer()
    startCursor()
  } else {
    stopLogTimer()
    stopCursor()
    logLines.value = []
    logQueue = []
  }
}, { immediate: true })

watch(() => props.phaseIndex, (newIdx, oldIdx) => {
  if (!props.open) return
  if (newIdx !== oldIdx && newIdx >= 0) {
    if (newIdx > 0) {
      pushLog(`─── Phase ${newIdx} complete ───`)
    }
    enqueuePhaseLines(newIdx)
    scrollLog()
  }
})

watch(() => props.progress, (p) => {
  if (!props.open || !p) return
  if (p.status === 'DONE') {
    stopLogTimer()
    logQueue = []
    pushLog('─────────────────────────────────────')
    pushLog('All documents generated successfully.')
    pushLog('Finalizing output bundle...')
    pushLog('[DONE] 工程案資料建構引擎已停止。')
    scrollLog()
  }
})

onBeforeUnmount(() => {
  stopLogTimer()
  stopCursor()
})
</script>

<template>
  <div
    class="term-backdrop"
    @click.self="(progress?.status === 'DONE' || !!error) && emit('close')"
  >
    <div class="term-window">
      <!-- Title bar -->
      <div class="term-titlebar">
        <div class="term-dots">
          <span class="term-dot td-red"></span>
          <span class="term-dot td-yellow"></span>
          <span class="term-dot td-green"></span>
        </div>
        <span class="term-title">eip-ai-engine — bash</span>
        <button
          v-if="progress?.status === 'DONE' || !!error"
          class="term-close-btn"
          @click="emit('close')"
        >✕</button>
        <span v-else class="term-close-btn" style="opacity: 0; cursor: default;">✕</span>
      </div>

      <!-- Main layout: log (left) | status panel (right) -->
      <div class="term-body">

        <!-- Log panel -->
        <div class="term-log-panel" ref="logContainer">
          <div class="term-log-header">
            <span class="term-prompt">root@eip-engine</span><span class="term-colon">:</span><span class="term-path">~/ai-generate</span><span class="term-dollar">$</span>
            <span class="term-cmd"> ./run-batch-generate.sh --project="{{ progress?.jobId ?? 'preview' }}"</span>
          </div>

          <div
            v-for="line in logLines"
            :key="line.id"
            class="term-log-line"
            :class="`is-${line.type}`"
          >
            <span class="term-log-time">[{{ line.time }}]</span>
            <span class="term-log-text"> {{ line.text }}</span>
          </div>

          <!-- 游標行 -->
          <div v-if="progress?.status !== 'DONE' && !error" class="term-log-line">
            <span class="term-log-time">[{{ nowTime() }}]</span>
            <span class="term-log-text"> </span>
            <span class="term-cursor" :class="{ 'is-visible': cursorVisible }">▌</span>
          </div>
          <div v-else-if="progress?.status === 'DONE'" class="term-log-line is-ok">
            <span class="term-log-text">Process exited with code 0</span>
          </div>
        </div>

        <!-- Status panel -->
        <div class="term-status-panel">
          <div class="term-status-block">
            <div class="term-label">PHASE</div>
            <div class="term-phase-name">
              {{ progress ? phases[phaseIndex]?.label : '初始化中…' }}
            </div>
          </div>

          <div class="term-status-block">
            <div class="term-label">STEP</div>
            <div class="term-step-counter">
              <span class="term-step-cur">{{ progress?.currentStep ?? 0 }}</span>
              <span class="term-step-sep">/</span>
              <span class="term-step-tot">{{ progress?.totalSteps ?? phases.length }}</span>
            </div>
            <div class="term-step-dots">
              <span
                v-for="(_, i) in phases"
                :key="i"
                class="term-step-dot"
                :class="{
                  'is-active': i === phaseIndex && progress?.status !== 'DONE',
                  'is-done': i < phaseIndex || progress?.status === 'DONE',
                }"
              ></span>
            </div>
          </div>

          <div class="term-status-block">
            <div class="term-label">PROGRESS</div>
            <div class="term-pct">{{ displayedPercent }}<span class="term-pct-unit">%</span></div>
            <div class="term-bar-wrap">
              <span class="term-bar-bracket">[</span>
              <span
                class="term-bar-fill"
                :class="{ 'is-done': progress?.status === 'DONE' }"
              >{{ asciiBar }}</span>
              <span class="term-bar-bracket">]</span>
            </div>
          </div>

          <div class="term-status-block" v-if="error">
            <div class="term-label">ERROR</div>
            <div class="term-error-text">{{ error }}</div>
          </div>

          <div class="term-status-block" v-else-if="progress?.status === 'DONE'">
            <div class="term-done-badge">
              <span class="term-done-icon">✓</span>
              <span>BUILD SUCCESS</span>
            </div>
            <div class="term-done-sub">工程文件建立完成</div>
          </div>

          <div class="term-status-block term-status-footer">
            <template v-if="progress?.status === 'DONE' || error">
              <span class="term-hint">[CLICK OUTSIDE OR ✕ TO CLOSE]</span>
            </template>
            <template v-else>
              <span class="term-hint">[DO NOT CLOSE — PROCESSING]</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Terminal colour palette */
:root {
  --t-bg: #0d1117;
  --t-bar: #161b22;
  --t-border: #30363d;
  --t-green: #39d353;
  --t-green-dim: #26a641;
  --t-amber: #e3b341;
  --t-red: #f85149;
  --t-muted: #484f58;
  --t-text: #c9d1d9;
  --t-panel: #161b22;
}

.term-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(4px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Window chrome ── */
.term-window {
  width: 760px;
  max-width: 96vw;
  max-height: 90vh;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.9);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', 'SF Mono', monospace;
}

.term-titlebar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  flex-shrink: 0;
}

.term-dots { display: flex; gap: 6px; }

.term-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.td-red    { background: #f85149; }
.td-yellow { background: #e3b341; }
.td-green  { background: #39d353; }

.term-title {
  flex: 1;
  text-align: center;
  font-size: 0.72rem;
  color: #484f58;
  letter-spacing: 0.04em;
}

.term-close-btn {
  background: none;
  border: none;
  color: #484f58;
  font-size: 0.72rem;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.15s;

  &:hover { color: #c9d1d9; }
}

/* ── Main body: flex row ── */
.term-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 320px;
}

/* ── Log panel (left, scrollable) ── */
.term-log-panel {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  font-size: 0.7rem;
  line-height: 1.7;
  color: #8b949e;
  border-right: 1px solid #21262d;
  scroll-behavior: smooth;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
}

.term-log-header {
  margin-bottom: 0.5rem;
  font-size: 0.7rem;
}

.term-prompt { color: #39d353; font-weight: 600; }
.term-colon  { color: #8b949e; }
.term-path   { color: #58a6ff; }
.term-dollar { color: #8b949e; }
.term-cmd    { color: #c9d1d9; }

.term-log-line {
  display: flex;
  gap: 0;
  color: #8b949e;

  &.is-ok   .term-log-text { color: #39d353; }
  &.is-warn .term-log-text { color: #e3b341; }
}

.term-log-time {
  color: #30363d;
  flex-shrink: 0;
  margin-right: 0.25rem;
}

.term-log-text { word-break: break-all; }

.term-cursor {
  display: inline-block;
  color: #39d353;
  opacity: 0;
  transition: opacity 0.08s;

  &.is-visible { opacity: 1; }
}

/* ── Status panel (right, fixed width) ── */
.term-status-panel {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem 0.85rem;
  gap: 1.1rem;
  background: #0d1117;
  overflow-y: auto;
}

.term-status-block { display: flex; flex-direction: column; gap: 0.3rem; }

.term-label {
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  color: #30363d;
  font-weight: 700;
  text-transform: uppercase;
}

.term-phase-name {
  font-size: 0.68rem;
  color: #c9d1d9;
  line-height: 1.5;
}

.term-step-counter {
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.term-step-cur { color: #39d353; }
.term-step-sep { color: #30363d; font-size: 1rem; }
.term-step-tot { color: #484f58; font-size: 1rem; }

.term-step-dots {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.term-step-dot {
  width: 6px;
  height: 6px;
  border-radius: 1px;
  background: #21262d;
  transition: all 0.5s ease;

  &.is-done   { background: #26a641; }
  &.is-active { background: #39d353; box-shadow: 0 0 6px #39d353; }
}

/* Percentage */
.term-pct {
  font-size: 2rem;
  font-weight: 700;
  color: #39d353;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.term-pct-unit {
  font-size: 1rem;
  font-weight: 400;
  color: #30363d;
}

/* ASCII bar */
.term-bar-wrap {
  display: flex;
  align-items: center;
  font-size: 0.62rem;
  line-height: 1;
  letter-spacing: 0;
}

.term-bar-bracket { color: #484f58; }

.term-bar-fill {
  color: #26a641;
  letter-spacing: -0.5px;
  transition: all 2s linear;

  &.is-done { color: #39d353; }
}

/* Done / error states */
.term-done-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #39d353;
}

.term-done-icon { font-size: 1rem; }

.term-done-sub {
  font-size: 0.62rem;
  color: #484f58;
}

.term-error-text {
  font-size: 0.68rem;
  color: #f85149;
  line-height: 1.5;
}

.term-status-footer { margin-top: auto; }

.term-hint {
  font-size: 0.58rem;
  color: #30363d;
  letter-spacing: 0.05em;
}
</style>
