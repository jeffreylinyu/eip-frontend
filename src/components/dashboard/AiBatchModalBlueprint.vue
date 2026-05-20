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
  coreStates: boolean[]
  phases: PhaseItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

// ── 施工燈號閃爍 ─────────────────────────────────────────
const warnOn = ref(true)
let warnTimer: ReturnType<typeof setInterval> | null = null

watch(() => props.open, (open) => {
  if (open) {
    warnTimer = setInterval(() => { warnOn.value = !warnOn.value }, 750)
  } else {
    if (warnTimer) { clearInterval(warnTimer); warnTimer = null }
    warnOn.value = true
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (warnTimer) { clearInterval(warnTimer); warnTimer = null }
})

// ── 樓層狀態 ─────────────────────────────────────────────
function floorState(i: number): 'done' | 'active' | 'pending' {
  if (props.progress?.status === 'DONE') return 'done'
  if (i < props.phaseIndex) return 'done'
  if (i === props.phaseIndex) return 'active'
  return 'pending'
}

// 窗戶亮起規則：完成樓層全亮；進行中樓層依 visibleSubs 逐窗亮起
function isWindowLit(floorIdx: number, winIdx: number): boolean {
  if (props.progress?.status === 'DONE') return true
  if (floorIdx < props.phaseIndex) return true
  if (floorIdx === props.phaseIndex) return winIdx < props.visibleSubs
  return false
}

// ── 起重機鋼索長度：phase 越高，鋼索越短 ────────────────
// 每層高度（px，需與 CSS .bp-floor height 一致）
const FLOOR_PX = 40
const CRANE_ABOVE_PX = 52  // 起重機頂部高出建築的距離

const cableLen = computed(() => {
  // SVG 座標系：頂部 y=0，底部 y=buildingH
  // 起重機臂在 y=0（scene 頂端），鋼索從臂端往下延伸到目前施工樓層中央
  const buildingH = props.phases.length * FLOOR_PX
  // column-reverse：floor i 的頂部 DOM y = (phases.length - 1 - i) * FLOOR_PX
  const floorTopY = (props.phases.length - 1 - props.phaseIndex) * FLOOR_PX
  const floorMidY = floorTopY + FLOOR_PX / 2
  // 在 scene 座標中，building 從 CRANE_ABOVE_PX 開始
  return CRANE_ABOVE_PX + floorMidY
})

const isDone = computed(() => props.progress?.status === 'DONE')
const canClose = computed(() => isDone.value || !!props.error)
</script>

<template>
  <div
    class="bp-backdrop"
    @click.self="canClose && emit('close')"
  >
    <div class="bp-modal">

      <!-- 工地警戒斜紋 -->
      <div class="bp-hazard-stripe"></div>

      <!-- Header -->
      <div class="bp-header">
        <div class="bp-header-icon">
          <i class="fa fa-helmet-safety"></i>
        </div>
        <div class="bp-header-text">
          <div class="bp-header-title">工程文件建置系統</div>
          <div class="bp-header-sub">工程案資料建構</div>
        </div>
        <div
          class="bp-status-badge"
          :class="{
            'is-running': !isDone && !error,
            'is-done': isDone,
            'is-error': !!error,
          }"
        >
          <span v-if="error">ERROR</span>
          <span v-else-if="isDone">COMPLETE</span>
          <span v-else>RUNNING</span>
        </div>
        <button v-if="canClose" class="bp-close-btn" @click="emit('close')">✕</button>
        <div v-else style="width: 20px; flex-shrink: 0;"></div>
      </div>

      <!-- Body -->
      <div class="bp-body">

        <!-- 左：建築施工可視化 -->
        <div class="bp-viz-col">
          <!-- 尺寸標記（右側） -->
          <div class="bp-dim-ruler">
            <div class="bp-dim-top">{{ phases.length }}F</div>
            <div class="bp-dim-line-v"></div>
            <div class="bp-dim-bot">GFL</div>
          </div>

          <!-- 建築 + 起重機場景 -->
          <div class="bp-scene">

            <!-- 建築主體 -->
            <div class="bp-building">
              <div
                v-for="(phase, i) in phases"
                :key="i"
                class="bp-floor"
                :class="`is-${floorState(i)}`"
              >
                <!-- 鋼架柱（左右兩側） -->
                <div class="bp-col-l"></div>
                <div class="bp-col-r"></div>

                <!-- 窗戶組 -->
                <div class="bp-windows">
                  <span
                    v-for="w in 3"
                    :key="w"
                    class="bp-win"
                    :class="{ 'is-lit': isWindowLit(i, w - 1) }"
                  ></span>
                </div>

                <!-- 施工燈號（僅進行中樓層） -->
                <div
                  v-if="floorState(i) === 'active'"
                  class="bp-warn-light"
                  :class="{ 'is-on': warnOn }"
                ></div>

                <!-- 層號 -->
                <span class="bp-floor-label">{{ i + 1 }}F</span>
              </div>
            </div>

            <!-- 起重機（絕對定位於建築右側） -->
            <div class="bp-crane">
              <!-- 臂架水平橫樑 -->
              <div class="bp-crane-jib"></div>
              <!-- 配重臂 -->
              <div class="bp-crane-counter"></div>
              <!-- 桅桿頂部三角 -->
              <div class="bp-crane-mast-tip"></div>
              <!-- 桅桿主柱 -->
              <div class="bp-crane-mast"></div>
              <!-- 鋼索 -->
              <div class="bp-crane-cable" :style="{ height: cableLen + 'px' }"></div>
              <!-- 吊鉤 -->
              <div class="bp-crane-hook" :style="{ top: cableLen + 'px' }"></div>
              <!-- 頂部警示燈 -->
              <div class="bp-crane-light" :class="{ 'is-on': warnOn }"></div>
            </div>
          </div>

          <!-- 地基 -->
          <div class="bp-foundation"></div>
          <!-- 地坪線標記 -->
          <div class="bp-ground-label">▲ G.L.</div>
        </div>

        <!-- 右：資訊面板 -->
        <div class="bp-info-col">

          <!-- 完成態 -->
          <template v-if="isDone">
            <div class="bp-done-block">
              <div class="bp-done-icon"><i class="fa fa-circle-check"></i></div>
              <div class="bp-done-title">工程文件建立完成</div>
              <div class="bp-done-sub">ALL DOCUMENTS GENERATED SUCCESSFULLY</div>
            </div>
          </template>

          <!-- 錯誤態 -->
          <template v-else-if="error">
            <div class="bp-error-block">
              <i class="fa fa-triangle-exclamation fa-lg me-2"></i>
              <span>{{ error }}</span>
            </div>
          </template>

          <!-- 施工中 -->
          <template v-else>
            <!-- 當前工序 -->
            <div class="bp-info-block">
              <div class="bp-info-label">當前工序</div>
              <div class="bp-info-phase">
                {{ progress ? phases[phaseIndex]?.label : '系統初始化中…' }}
              </div>
            </div>

            <!-- 作業項目 -->
            <div class="bp-info-block">
              <div class="bp-info-label">作業項目</div>
              <div class="bp-checklist">
                <div
                  v-for="(sub, i) in (phases[phaseIndex]?.subs ?? [])"
                  :key="i"
                  class="bp-check-item"
                  :class="{ 'is-checked': i < visibleSubs }"
                >
                  <span class="bp-check-box">{{ i < visibleSubs ? '☑' : '☐' }}</span>
                  <span class="bp-check-text">{{ sub }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- 完成率（永遠顯示） -->
          <div class="bp-info-block bp-pct-block">
            <div class="bp-info-label">完成率</div>
            <div class="bp-pct-row">
              <span class="bp-pct-big">{{ displayedPercent }}</span>
              <span class="bp-pct-unit">%</span>
            </div>
          </div>

          <!-- 工序里程碑 -->
          <div class="bp-info-block">
            <div class="bp-info-label">工序里程碑</div>
            <div class="bp-milestones">
              <div
                v-for="(_, i) in phases"
                :key="i"
                class="bp-milestone"
                :class="{
                  'is-done': i < phaseIndex || isDone,
                  'is-active': i === phaseIndex && !isDone,
                }"
              >
                <span class="bp-ms-dot"></span>
                <span class="bp-ms-num">P{{ i + 1 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer 進度條 -->
      <div class="bp-footer">
        <div class="bp-progress-track">
          <div
            class="bp-progress-fill"
            :class="{ 'is-done': isDone }"
            :style="{ width: `${displayedPercent}%` }"
          ></div>
          <span class="bp-progress-pct">{{ displayedPercent }}%</span>
        </div>
        <div class="bp-footer-meta">
          <span class="bp-footer-phase">
            <template v-if="canClose">可關閉此視窗</template>
            <template v-else>{{ phases[phaseIndex]?.label ?? '初始化中…' }}</template>
          </span>
          <span class="bp-footer-step">
            STEP {{ progress?.currentStep ?? 0 }} / {{ phases.length }}
          </span>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Tokens ── */
:root {
  --bp-yellow: #f59e0b;
  --bp-yellow-dim: #d97706;
  --bp-orange: #ea580c;
  --bp-steel: #1e3a5c;
  --bp-steel-light: #2563eb;
  --bp-bg: #0b1622;
  --bp-panel: #101f30;
  --bp-border: #1e3a5c;
  --bp-text: #cbd5e1;
  --bp-muted: #475569;
}

/* ── Backdrop ── */
.bp-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 20, 0.92);
  backdrop-filter: blur(4px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Modal window ── */
.bp-modal {
  width: 720px;
  max-width: 96vw;
  background: #0b1622;
  border: 1px solid #1e3a5c;
  border-top: none;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(245,158,11,0.08), 0 32px 64px rgba(0,0,0,0.9);
}

/* ── 工地警戒斜紋 ── */
.bp-hazard-stripe {
  height: 7px;
  background: repeating-linear-gradient(
    -45deg,
    #f59e0b 0px,
    #f59e0b 9px,
    #0b1622 9px,
    #0b1622 18px
  );
}

/* ── Header ── */
.bp-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  background: #0f1e30;
  border-bottom: 1px solid #1e3a5c;
}

.bp-header-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 4px;
  color: #f59e0b;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.bp-header-text { flex: 1; }

.bp-header-title {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e2e8f0;
}

.bp-header-sub {
  font-size: 0.58rem;
  color: #334155;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 2px;
}

.bp-status-badge {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 3px 8px;
  border-radius: 2px;
  border: 1px solid;

  &.is-running {
    color: #f59e0b;
    border-color: rgba(245,158,11,0.4);
    background: rgba(245,158,11,0.07);
  }
  &.is-done {
    color: #34d399;
    border-color: rgba(52,211,153,0.4);
    background: rgba(52,211,153,0.07);
  }
  &.is-error {
    color: #f87171;
    border-color: rgba(248,113,113,0.4);
    background: rgba(248,113,113,0.07);
  }
}

.bp-close-btn {
  background: none;
  border: 1px solid #1e3a5c;
  border-radius: 3px;
  color: #475569;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;

  &:hover { color: #e2e8f0; border-color: #475569; }
}

/* ── Body layout ── */
.bp-body {
  display: flex;
  padding: 1.25rem;
  gap: 1.25rem;
  min-height: 260px;
}

/* ── Left: visualization column ── */
.bp-viz-col {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  position: relative;
}

/* Dimension ruler */
.bp-dim-ruler {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 4px;
  gap: 0;
  color: #334155;
  font-size: 0.55rem;
  letter-spacing: 0.05em;
}

.bp-dim-top, .bp-dim-bot { line-height: 1; }

.bp-dim-line-v {
  flex: 1;
  width: 1px;
  background: #1e3a5c;
  margin: 3px 0;
  min-height: 180px;
}

/* Building scene (relative container for crane) */
.bp-scene {
  position: relative;
  display: flex;
  align-items: flex-start;
}

/* ── Building ── */
.bp-building {
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  width: 148px;
  position: relative;
  z-index: 1;
}

.bp-floor {
  height: 40px;
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 8px 0 6px;
  gap: 6px;
  transition: background 0.9s ease, border-color 0.9s ease, box-shadow 0.9s ease;
  border-left: 2px solid #1e3a5c;
  border-right: 2px solid #1e3a5c;
  border-top: 1px solid #1a3050;
  background: #080f1c;

  &.is-done {
    background: #0d1e35;
    border-left-color: #2563eb;
    border-right-color: #2563eb;
    border-top-color: #2563eb;
  }

  &.is-active {
    background: #1a0e05;
    border-left-color: #f59e0b;
    border-right-color: #f59e0b;
    border-top-color: #f59e0b;
    box-shadow: inset 0 0 16px rgba(245,158,11,0.08), 0 0 8px rgba(245,158,11,0.12);
  }
}

/* 鋼構立柱 */
.bp-col-l, .bp-col-r {
  position: absolute;
  top: 0; bottom: 0;
  width: 4px;
  background: #1e3a5c;
  transition: background 0.9s ease;

  .is-done & { background: #1e4d8c; }
  .is-active & { background: #78350f; }
}

.bp-col-l { left: 0; }
.bp-col-r { right: 0; }

/* 窗戶組 */
.bp-windows {
  display: flex;
  gap: 5px;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.bp-win {
  width: 20px;
  height: 24px;
  border: 1px solid #1e3a5c;
  background: #050c18;
  border-radius: 1px;
  transition: background 0.7s ease, border-color 0.7s ease, box-shadow 0.7s ease;

  .is-done & { border-color: #1e4d8c; }
  .is-active & { border-color: #78350f; }

  &.is-lit {
    background: rgba(251, 191, 36, 0.18);
    border-color: rgba(251, 191, 36, 0.45);
    box-shadow: 0 0 6px rgba(251, 191, 36, 0.2), inset 0 0 8px rgba(251, 191, 36, 0.1);
  }
}

/* 施工警示燈 */
.bp-warn-light {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7c2d12;
  flex-shrink: 0;
  transition: background 0.2s ease, box-shadow 0.2s ease;

  &.is-on {
    background: #f97316;
    box-shadow: 0 0 8px #ea580c, 0 0 16px rgba(234, 88, 12, 0.4);
  }
}

/* 層號 */
.bp-floor-label {
  font-size: 0.55rem;
  color: #1e3a5c;
  letter-spacing: 0.05em;
  flex-shrink: 0;

  .is-done & { color: #1e4d8c; }
  .is-active & { color: #78350f; }
}

/* 地基 */
.bp-foundation {
  height: 8px;
  background: linear-gradient(90deg, #1e3a5c, #2563eb, #1e3a5c);
  width: 148px;
  margin-left: auto;
}

.bp-ground-label {
  font-size: 0.52rem;
  color: #334155;
  letter-spacing: 0.08em;
  margin-top: 3px;
  text-align: center;
  width: 148px;
  margin-left: auto;
}

/* ── 起重機 ── */
.bp-crane {
  position: absolute;
  right: -38px;
  top: 0;
  width: 32px;
  height: 100%;
}

/* 主桅桿 */
.bp-crane-mast {
  position: absolute;
  left: 14px;
  top: 20px;
  width: 5px;
  bottom: 0;
  background: linear-gradient(to bottom, #d97706, #92400e);
  border-radius: 1px;
}

/* 桅桿頂部斜切三角 */
.bp-crane-mast-tip {
  position: absolute;
  left: 8px;
  top: 0;
  width: 0;
  height: 0;
  border-left: 9px solid transparent;
  border-right: 9px solid transparent;
  border-bottom: 22px solid #d97706;
}

/* 水平臂架（向左伸出） */
.bp-crane-jib {
  position: absolute;
  top: 4px;
  right: 12px;
  height: 4px;
  width: 160px; /* extends left over building */
  background: #d97706;
  border-radius: 2px;
  transform-origin: right center;
}

/* 配重臂（向右） */
.bp-crane-counter {
  position: absolute;
  top: 4px;
  left: 18px;
  height: 4px;
  width: 14px;
  background: #92400e;
  border-radius: 2px;
}

/* 鋼索 */
.bp-crane-cable {
  position: absolute;
  left: 3px; /* at left tip of jib; jib extends 160px left, crane is 32px right of building, so tip ≈ building left... simplify */
  top: 8px;
  width: 1px;
  background: rgba(148, 163, 184, 0.5);
  transition: height 1.5s ease;
}

/* 吊鉤 */
.bp-crane-hook {
  position: absolute;
  left: -3px;
  width: 7px;
  height: 7px;
  border: 1.5px solid #64748b;
  border-radius: 50%;
  transition: top 1.5s ease;
}

/* 頂部警示燈 */
.bp-crane-light {
  position: absolute;
  top: -4px;
  left: 11px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #7c2d12;
  transition: background 0.2s ease, box-shadow 0.2s ease;

  &.is-on {
    background: #f97316;
    box-shadow: 0 0 8px #ea580c, 0 0 20px rgba(234, 88, 12, 0.5);
  }
}

/* ── Right: info column ── */
.bp-info-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-left: 0.5rem;
  border-left: 1px solid #1e3a5c;
}

.bp-info-block { display: flex; flex-direction: column; gap: 0.3rem; }

.bp-info-label {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #334155;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  &::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 1px;
    background: #f59e0b;
  }
}

.bp-info-phase {
  font-size: 0.8rem;
  font-weight: 500;
  color: #e2e8f0;
  line-height: 1.5;
}

/* Checklist */
.bp-checklist { display: flex; flex-direction: column; gap: 0.35rem; }

.bp-check-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #334155;
  transition: color 0.4s ease;

  &.is-checked { color: #94a3b8; }
}

.bp-check-box {
  font-size: 0.75rem;
  flex-shrink: 0;
  color: #334155;
  .is-checked & { color: #34d399; }
}

/* Percentage */
.bp-pct-block { margin-top: auto; }

.bp-pct-row { display: flex; align-items: baseline; gap: 2px; }

.bp-pct-big {
  font-size: 2.4rem;
  font-weight: 700;
  color: #f59e0b;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.bp-pct-unit {
  font-size: 1.1rem;
  font-weight: 400;
  color: #78350f;
}

/* Milestones */
.bp-milestones {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.bp-milestone {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: default;
}

.bp-ms-dot {
  width: 8px;
  height: 8px;
  border-radius: 1px;
  background: #0f1e30;
  border: 1px solid #1e3a5c;
  display: inline-block;
  transition: all 0.6s ease;

  .bp-milestone.is-done & {
    background: #1d4ed8;
    border-color: #3b82f6;
  }
  .bp-milestone.is-active & {
    background: #f59e0b;
    border-color: #fbbf24;
    box-shadow: 0 0 6px rgba(245,158,11,0.5);
  }
}

.bp-ms-num {
  font-size: 0.55rem;
  color: #1e3a5c;
  letter-spacing: 0.04em;

  .bp-milestone.is-done & { color: #3b82f6; }
  .bp-milestone.is-active & { color: #f59e0b; }
}

/* Done / Error states */
.bp-done-block {
  text-align: center;
  padding: 1rem 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.bp-done-icon {
  font-size: 1.8rem;
  color: #34d399;
  margin-bottom: 0.75rem;
}

.bp-done-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 0.4rem;
}

.bp-done-sub {
  font-size: 0.6rem;
  color: #475569;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.bp-error-block {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f87171;
  font-size: 0.8rem;
  padding: 0.5rem 0;
}

/* ── Footer 進度條 ── */
.bp-footer {
  padding: 0 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.bp-progress-track {
  position: relative;
  height: 6px;
  background: #0f1e30;
  border: 1px solid #1e3a5c;
  border-radius: 1px;
  overflow: hidden;
}

.bp-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #d97706, #f59e0b);
  transition: width 2s linear;
  position: relative;

  &.is-done {
    background: #34d399;
    transition: width 0.8s ease;
  }

  /* Animated shimmer on fill */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
    animation: shimmer 2s linear infinite;
  }
}

@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.bp-progress-pct {
  display: none;
}

.bp-footer-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bp-footer-phase {
  font-size: 0.65rem;
  color: #475569;
}

.bp-footer-step {
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: #334155;
  font-variant-numeric: tabular-nums;
}
</style>
