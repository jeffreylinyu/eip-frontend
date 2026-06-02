<script lang="ts">
/** P-3 防颱聯絡體制圖 — 結構化資料（5 個單位名稱框）。 */
export interface P3TyphoonPreventionContactData {
  hospitalName: string
  architectOffice: string
  contractorCompanyName: string
  insuranceCompanyName: string
  typhoonCenterName: string
}

export const DEFAULT_P3_TYPHOON_PREVENTION_CONTACT_DATA: P3TyphoonPreventionContactData = {
  hospitalName: 'XX醫院',
  architectOffice: 'XX建築師事務所',
  contractorCompanyName: '',
  insuranceCompanyName: 'XX保險公司',
  typhoonCenterName: '工地防颱中心',
}

export function normalizeP3TyphoonPreventionContactData(input: unknown): P3TyphoonPreventionContactData {
  const d = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const base = { ...DEFAULT_P3_TYPHOON_PREVENTION_CONTACT_DATA }
  const out: P3TyphoonPreventionContactData = { ...base }
  ;(Object.keys(base) as (keyof P3TyphoonPreventionContactData)[]).forEach((key) => {
    const v = d[key]
    if (key === 'contractorCompanyName') {
      out[key] = typeof v === 'string' ? v : base[key]
      return
    }
    out[key] = typeof v === 'string' && v.trim().length > 0 ? v : base[key]
  })
  if (out.hospitalName.trim() === 'XX') out.hospitalName = base.hospitalName
  if (out.architectOffice.trim() === 'XX') out.architectOffice = base.architectOffice
  if (out.insuranceCompanyName.trim() === 'XX') out.insuranceCompanyName = base.insuranceCompanyName
  return out
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { P3_TYPHOON_PREVENTION_CONTACT_EDITOR_BOXES } from './P3TyphoonPreventionContactMarkers'

interface Props {
  data: P3TyphoonPreventionContactData
  showEditorMarkers?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  showEditorMarkers: true,
})

const svgRef = ref<SVGSVGElement | null>(null)

defineExpose({
  getSvgElement(): SVGSVGElement | null {
    return svgRef.value
  },
  getViewBox(): { w: number; h: number } {
    return { w: W, h: H }
  },
})

const W = 900
const H = 400

const BLACK = '#000000'
const BOX_STROKE = '#000000'
const BOX_FILL = '#ffffff'

const d = computed(() => props.data)
const editorBoxes = P3_TYPHOON_PREVENTION_CONTACT_EDITOR_BOXES

function masked(v: string | undefined | null, fallback = 'XX'): string {
  const s = String(v ?? '').trim()
  return s || fallback
}

const BOX_W = 240
const BOX_H = 52

const boxes = {
  hospital: { x: 40, y: 24 },
  architect: { x: 40, y: 140 },
  contractor: { x: 330, y: 140 },
  insurance: { x: 620, y: 140 },
  typhoon: { x: 330, y: 300 },
} as const

function boxCenterX(x: number) {
  return x + BOX_W / 2
}

function boxBottomY(y: number) {
  return y + BOX_H
}

function boxTopY(y: number) {
  return y
}

function boxLeftX(x: number) {
  return x
}

function boxRightX(x: number) {
  return x + BOX_W
}
</script>

<template>
  <svg
    ref="svgRef"
    :viewBox="`0 0 ${W} ${H}`"
    width="100%"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="防颱聯絡體制"
    style="display: block; max-width: 100%; height: auto; background: #fff"
  >
    <defs>
      <marker id="typhoon-arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse">
        <path d="M0,0 L8,4 L0,8 Z" :fill="BOX_STROKE" />
      </marker>
    </defs>
    <rect x="0" y="0" :width="W" :height="H" fill="#fff" />

    <!-- 1 醫院 -->
    <rect
      :x="boxes.hospital.x"
      :y="boxes.hospital.y"
      :width="BOX_W"
      :height="BOX_H"
      :fill="BOX_FILL"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
    />
    <text
      :x="boxCenterX(boxes.hospital.x)"
      :y="boxes.hospital.y + BOX_H / 2 + 5"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 15px"
    >
      {{ masked(d.hospitalName, 'XX醫院') }}
    </text>

    <!-- 2 建築師 -->
    <rect
      :x="boxes.architect.x"
      :y="boxes.architect.y"
      :width="BOX_W"
      :height="BOX_H"
      :fill="BOX_FILL"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
    />
    <text
      :x="boxCenterX(boxes.architect.x)"
      :y="boxes.architect.y + BOX_H / 2 + 5"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 15px"
    >
      {{ masked(d.architectOffice, 'XX建築師事務所') }}
    </text>

    <!-- 3 承攬廠商 -->
    <rect
      :x="boxes.contractor.x"
      :y="boxes.contractor.y"
      :width="BOX_W"
      :height="BOX_H"
      :fill="BOX_FILL"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
    />
    <text
      :x="boxCenterX(boxes.contractor.x)"
      :y="boxes.contractor.y + BOX_H / 2 + 5"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 15px"
    >
      {{ String(d.contractorCompanyName || '').trim() || 'XX營造' }}
    </text>

    <!-- 4 保險公司 -->
    <rect
      :x="boxes.insurance.x"
      :y="boxes.insurance.y"
      :width="BOX_W"
      :height="BOX_H"
      :fill="BOX_FILL"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
    />
    <text
      :x="boxCenterX(boxes.insurance.x)"
      :y="boxes.insurance.y + BOX_H / 2 + 5"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 15px"
    >
      {{ masked(d.insuranceCompanyName, 'XX保險公司') }}
    </text>

    <!-- 5 工地防颱中心 -->
    <rect
      :x="boxes.typhoon.x"
      :y="boxes.typhoon.y"
      :width="BOX_W"
      :height="BOX_H"
      :fill="BOX_FILL"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
    />
    <text
      :x="boxCenterX(boxes.typhoon.x)"
      :y="boxes.typhoon.y + BOX_H / 2 + 5"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 15px"
    >
      {{ masked(d.typhoonCenterName, '工地防颱中心') }}
    </text>

    <!-- 連線 -->
    <!-- 1 → 2 垂直 -->
    <line
      :x1="boxCenterX(boxes.hospital.x)"
      :y1="boxBottomY(boxes.hospital.y)"
      :x2="boxCenterX(boxes.architect.x)"
      :y2="boxTopY(boxes.architect.y)"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
      marker-end="url(#typhoon-arrow)"
    />
    <!-- 3 → 2 向左 -->
    <line
      :x1="boxLeftX(boxes.contractor.x)"
      :y1="boxes.contractor.y + BOX_H / 2"
      :x2="boxRightX(boxes.architect.x)"
      :y2="boxes.architect.y + BOX_H / 2"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
      marker-end="url(#typhoon-arrow)"
    />
    <!-- 4 → 3 向左 -->
    <line
      :x1="boxLeftX(boxes.insurance.x)"
      :y1="boxes.insurance.y + BOX_H / 2"
      :x2="boxRightX(boxes.contractor.x)"
      :y2="boxes.contractor.y + BOX_H / 2"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
      marker-end="url(#typhoon-arrow)"
    />
    <!-- 5 → 3 向上 -->
    <line
      :x1="boxCenterX(boxes.typhoon.x)"
      :y1="boxTopY(boxes.typhoon.y)"
      :x2="boxCenterX(boxes.contractor.x)"
      :y2="boxBottomY(boxes.contractor.y)"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
      marker-end="url(#typhoon-arrow)"
    />
    <!-- 2 → 5 L 形（無箭頭） -->
    <line
      :x1="boxCenterX(boxes.architect.x)"
      :y1="boxBottomY(boxes.architect.y)"
      :x2="boxCenterX(boxes.architect.x)"
      :y2="boxes.typhoon.y + BOX_H / 2"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
    />
    <line
      :x1="boxCenterX(boxes.architect.x)"
      :y1="boxes.typhoon.y + BOX_H / 2"
      :x2="boxLeftX(boxes.typhoon.x)"
      :y2="boxes.typhoon.y + BOX_H / 2"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
    />

    <g v-if="showEditorMarkers" class="editor-only">
      <template v-for="box in editorBoxes" :key="'marker-' + box.id">
        <circle :cx="box.badgeX" :cy="box.badgeY" r="12" fill="#2563eb" stroke="#fff" stroke-width="1.2" />
        <text
          :x="box.badgeX"
          :y="box.badgeY + 1"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="#ffffff"
          style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 13px; font-weight: 700"
        >
          {{ box.marker }}
        </text>
      </template>
    </g>
  </svg>
</template>
