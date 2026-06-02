<script lang="ts">
/**
 * P-3 緊急應變、保全聯絡體制 — 結構化資料。
 *
 * 可編輯欄位（預設以 XX 遮蔽個資，使用者於 P-3 頁面維護後寫入 SVG／匯出 Word；圖上均以黑字顯示）：
 * - siteDirectorName、hospitalName、hospitalPhone
 * - architectOffice、architectName、architectPhone
 * - technicianName、technicianPhone
 * - laborInspectionOffice、laborInspectionPhone
 *
 * 黑字為圖上固定標籤（工程災害、110/119 等），不在此 JSON 內。
 */
export interface P3EmergencyResponseContactData {
  /** 駐工地緊急聯絡人／工地主任姓名 */
  siteDirectorName: string
  /** 送醫／工程災害聯絡醫院名稱 */
  hospitalName: string
  /** 醫院電話 */
  hospitalPhone: string
  /** 建築師事務所 */
  architectOffice: string
  /** 建築師姓名 */
  architectName: string
  /** 建築師電話 */
  architectPhone: string
  /** 承攬廠商公司名稱（可自動帶入；非預設 XX） */
  contractorCompanyName: string
  /** 專任技師姓名 */
  technicianName: string
  /** 專任技師電話 */
  technicianPhone: string
  /** 勞動檢查機關 */
  laborInspectionOffice: string
  /** 勞動檢查機關電話 */
  laborInspectionPhone: string
}

/** 可編輯欄位預設值（遮蔽個資）；圖上與固定標籤同為黑字。 */
export const DEFAULT_P3_EMERGENCY_RESPONSE_CONTACT_DATA: P3EmergencyResponseContactData = {
  siteDirectorName: 'XX',
  hospitalName: 'XX醫院',
  hospitalPhone: '0X-XXXXXXX',
  architectOffice: 'XX建築師事務所',
  architectName: 'XX',
  architectPhone: '0X-XXXXXXX',
  contractorCompanyName: '',
  technicianName: 'XX',
  technicianPhone: '0X-XXXXXXX',
  laborInspectionOffice: 'XX勞動檢查所',
  laborInspectionPhone: '02-XXXXXXXX',
}

const RED_KEYS: (keyof P3EmergencyResponseContactData)[] = [
  'siteDirectorName',
  'hospitalName',
  'hospitalPhone',
  'architectOffice',
  'architectName',
  'architectPhone',
  'technicianName',
  'technicianPhone',
  'laborInspectionOffice',
  'laborInspectionPhone',
]

export function normalizeP3EmergencyResponseContactData(input: any): P3EmergencyResponseContactData {
  const d = input && typeof input === 'object' ? input : {}
  const base = { ...DEFAULT_P3_EMERGENCY_RESPONSE_CONTACT_DATA }
  const out: P3EmergencyResponseContactData = { ...base }
  ;(Object.keys(base) as (keyof P3EmergencyResponseContactData)[]).forEach((key) => {
    const v = d[key]
    // 大多數欄位若為空字串，代表「未填」：回填預設遮蔽值，讓表單欄位直接顯示預設內容（非僅 placeholder）。
    // contractorCompanyName 允許為空（由頁面 prefill 或使用者自行填寫）。
    if (key === 'contractorCompanyName') {
      out[key] = typeof v === 'string' ? v : base[key]
      return
    }
    out[key] = typeof v === 'string' && v.trim().length > 0 ? v : base[key]
  })

  // 相容舊資料：早期版本可能把所有欄位都存成「XX」；
  // 這裡只把「應該呈現格式化遮蔽」的欄位補成新預設值，避免畫面與圖片預設不一致。
  if (out.hospitalName.trim() === 'XX') out.hospitalName = base.hospitalName
  if (out.hospitalPhone.trim() === 'XX') out.hospitalPhone = base.hospitalPhone
  if (out.architectOffice.trim() === 'XX') out.architectOffice = base.architectOffice
  if (out.architectPhone.trim() === 'XX') out.architectPhone = base.architectPhone
  if (out.technicianPhone.trim() === 'XX') out.technicianPhone = base.technicianPhone
  if (out.laborInspectionOffice.trim() === 'XX') out.laborInspectionOffice = base.laborInspectionOffice
  if (out.laborInspectionPhone.trim() === 'XX') out.laborInspectionPhone = base.laborInspectionPhone
  return out
}

export function isP3EmergencyRedField(key: keyof P3EmergencyResponseContactData): boolean {
  return RED_KEYS.includes(key)
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  P3_EMERGENCY_CONTACT_EDITOR_BOXES,
  editorBoxBadgePositions,
} from './P3EmergencyResponseContactMarkers'

interface Props {
  data: P3EmergencyResponseContactData
  /** 維護畫面顯示 1～5 對照標記；匯出 PNG 時應為 false 或先 strip editor-only */
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

/** 橫向畫布；H 依最下方節點（搶修施工 y=526+h=40）留約 14px 底邊，避免 PNG／Word 圖下方大片留白。 */
const W = 1100
const H = 580

const BLACK = '#000000'
const BOX_STROKE = '#000000'
const BOX_FILL = '#ffffff'

const d = computed(() => props.data)
const editorBoxes = P3_EMERGENCY_CONTACT_EDITOR_BOXES

function masked(v: string | undefined | null, fallback = 'XX'): string {
  const s = String(v ?? '').trim()
  return s || fallback
}

/** 在矩形內垂直置中多行文字（每行一個 text）。 */
function lineYs(lineCount: number, boxY: number, boxH: number, lineHeight = 18): number[] {
  const total = lineCount * lineHeight
  const start = boxY + (boxH - total) / 2 + lineHeight * 0.75
  return Array.from({ length: lineCount }, (_, i) => start + i * lineHeight)
}
</script>

<template>
  <svg
    ref="svgRef"
    :viewBox="`0 0 ${W} ${H}`"
    width="100%"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="緊急應變、保全聯絡體制"
    style="display: block; max-width: 100%; height: auto; background: #fff"
  >
    <defs>
      <!--
        箭頭只用在「指向框框」的線段終點；拐角/交會點不畫箭頭。
        refX=8 讓箭頭尖端貼在線段端點（不往前延伸），避免被框線/填色遮住。
      -->
      <!-- auto-start-reverse：同一個 marker 可同時用在 marker-start / marker-end，方向正確 -->
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse">
        <path d="M0,0 L8,4 L0,8 Z" :fill="BOX_STROKE" />
      </marker>
    </defs>
    <rect x="0" y="0" :width="W" :height="H" fill="#fff" />

    <!-- 標題 -->
    <text
      :x="W / 2"
      y="36"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 20px; font-weight: 700"
    >
      緊急應變、保全聯絡體制
    </text>

    <!-- 駐工地緊急聯絡人 -->
    <rect x="370" y="52" width="360" height="72" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      v-for="(line, i) in ['駐工地緊急聯絡人', '工地主任', masked(d.siteDirectorName, 'XX')]"
      :key="'contact-' + i"
      :x="550"
      :y="lineYs(3, 52, 72)[i]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 15px"
    >
      {{ line }}
    </text>

    <!-- 連線統一放在 SVG 最後畫，避免被框框遮住 -->

    <!-- 工程災害 / 傷亡或交通事故 -->
    <rect x="180" y="152" width="200" height="36" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      x="280"
      y="176"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 15px; font-weight: 600"
    >
      工程災害
    </text>
    <rect x="720" y="152" width="200" height="36" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      x="820"
      y="176"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 15px; font-weight: 600"
    >
      傷亡或交通事故
    </text>

    <!-- 左：醫院 -->
    <rect x="70" y="218" width="220" height="88" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      v-for="(line, i) in [masked(d.hospitalName, 'XX醫院'), masked(d.hospitalPhone, '0X-XXXXXXX')]"
      :key="'hosp-' + i"
      :x="180"
      :y="lineYs(2, 218, 88)[i]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 14px"
    >
      {{ line }}
    </text>

    <!-- 左：建築師 -->
    <rect x="330" y="218" width="220" height="88" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      v-for="(line, i) in [masked(d.architectOffice, 'XX建築師事務所'), masked(d.architectName, 'XX'), masked(d.architectPhone, '0X-XXXXXXX')]"
      :key="'arch-' + i"
      :x="440"
      :y="lineYs(3, 218, 88)[i]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 13px"
    >
      {{ line }}
    </text>

    <!-- 醫院 ↔ 建築師 雙向箭頭（連線在最下方） -->

    <!-- 右：勞檢 -->
    <rect x="580" y="218" width="200" height="88" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      v-for="(line, i) in [masked(d.laborInspectionOffice, 'XX勞動檢查所'), masked(d.laborInspectionPhone, '02-XXXXXXXX')]"
      :key="'labor-' + i"
      :x="680"
      :y="lineYs(2, 218, 88)[i]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 14px"
    >
      {{ line }}
    </text>

    <!-- 右：110/119 -->
    <rect x="840" y="218" width="200" height="88" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      v-for="(line, i) in ['治安: 110', '交通: 1999', '消防: 119']"
      :key="'emg-' + i"
      :x="940"
      :y="lineYs(3, 218, 88)[i]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 14px"
    >
      {{ line }}
    </text>
    <!-- 建築師 → 勞檢（橫向；連線在最下方） -->

    <!-- 左下：災害受損單位 -->
    <rect x="70" y="330" width="220" height="100" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      v-for="(line, i) in ['災害受損單位', '自來水', '瓦斯', '電信', '電力']"
      :key="'util-' + i"
      :x="180"
      :y="348 + i * 17"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 13px"
    >
      {{ line }}
    </text>

    <!-- 左下：營造公司 + 專任技師 -->
    <rect x="330" y="330" width="220" height="100" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      :x="440"
      :y="lineYs(4, 330, 100)[0]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 13px"
    >
      {{ String(d.contractorCompanyName || '').trim() || '承攬廠商' }}
    </text>
    <text
      :x="440"
      :y="lineYs(4, 330, 100)[1]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 13px"
    >
      專任技師
    </text>
    <text
      :x="440"
      :y="lineYs(4, 330, 100)[2]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 13px"
    >
      {{ masked(d.technicianName, 'XX') }}
    </text>
    <text
      :x="440"
      :y="lineYs(4, 330, 100)[3]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 13px"
    >
      {{ masked(d.technicianPhone, '0X-XXXXXXX') }}
    </text>

    <!-- 右下：現場處理 -->
    <rect x="710" y="358" width="200" height="40" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      x="810"
      y="384"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 15px"
    >
      現場處理
    </text>

    <!-- 左：擬定搶修 → 搶修施工 -->
    <rect x="200" y="468" width="200" height="40" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      x="300"
      y="494"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 14px"
    >
      擬定緊急搶修工程
    </text>
    <!-- 連線在最下方 -->
    <rect x="200" y="526" width="200" height="40" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      x="300"
      y="552"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 14px"
    >
      搶修施工
    </text>

    <!-- 右：送醫治療 -->
    <rect x="700" y="418" width="220" height="96" :fill="BOX_FILL" :stroke="BOX_STROKE" stroke-width="1.2" />
    <text
      v-for="(line, i) in ['送醫治療', masked(d.hospitalName, 'XX醫院'), masked(d.hospitalPhone, '0X-XXXXXXX')]"
      :key="'med-' + i"
      :x="810"
      :y="lineYs(3, 418, 96)[i]"
      text-anchor="middle"
      :fill="BLACK"
      style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 14px"
    >
      {{ line }}
    </text>

    <!-- ===================== 連線（箭頭只在框框端點） ===================== -->

    <!-- 聯絡人 → 兩分支（交會點不畫箭頭） -->
    <line x1="550" y1="124" x2="550" y2="138" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="280" y1="138" x2="820" y2="138" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="280" y1="138" x2="280" y2="152" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />
    <line x1="820" y1="138" x2="820" y2="152" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />

    <!-- 工程災害 →（分岔）→ 醫院 / 建築師（先下來再分岔；垂直線加長） -->
    <line x1="280" y1="188" x2="280" y2="204" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="180" y1="204" x2="440" y2="204" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="180" y1="204" x2="180" y2="218" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />
    <line x1="440" y1="204" x2="440" y2="218" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />

    <!-- 傷亡或交通事故 →（分岔）→ 勞檢 / 110-1999-119（先下來再分岔；垂直線加長） -->
    <line x1="820" y1="188" x2="820" y2="204" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="680" y1="204" x2="940" y2="204" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="680" y1="204" x2="680" y2="218" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />
    <line x1="940" y1="204" x2="940" y2="218" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />

    <!-- 醫院 ↔ 建築師（雙向） / 勞檢 ↔ 110/119（雙向） / 建築師 → 勞檢（單向） -->
    <line
      x1="292"
      y1="262"
      x2="328"
      y2="262"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
      marker-end="url(#arrow)"
      marker-start="url(#arrow)"
    />
    <line
      x1="785"
      y1="262"
      x2="835"
      y2="262"
      :stroke="BOX_STROKE"
      stroke-width="1.2"
      marker-end="url(#arrow)"
      marker-start="url(#arrow)"
    />
    <path d="M 550 262 L 580 262" fill="none" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />

    <!-- 醫院 / 建築師 → 下方兩框（只在框端點畫箭頭） -->
    <line x1="180" y1="306" x2="180" y2="330" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />
    <line x1="440" y1="306" x2="440" y2="330" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />

    <!-- 勞檢 / 110/119 → 現場處理（交會點不畫箭頭；只指向框框） -->
    <line x1="680" y1="306" x2="680" y2="340" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="940" y1="306" x2="940" y2="340" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="680" y1="340" x2="940" y2="340" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="810" y1="340" x2="810" y2="358" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />

    <!-- 下方兩框 → 擬定緊急搶修工程（交會點不畫箭頭；只指向框框） -->
    <line x1="180" y1="430" x2="180" y2="450" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="420" y1="430" x2="420" y2="450" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="180" y1="450" x2="420" y2="450" :stroke="BOX_STROKE" stroke-width="1.2" />
    <line x1="300" y1="450" x2="300" y2="468" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />

    <!-- 擬定緊急搶修工程 → 搶修施工 -->
    <line x1="300" y1="508" x2="300" y2="526" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />

    <!-- 現場處理 → 送醫治療 -->
    <line x1="810" y1="398" x2="810" y2="418" :stroke="BOX_STROKE" stroke-width="1.2" marker-end="url(#arrow)" />

    <!-- 維護用編號標記（最上層；匯出 PNG 前移除 .editor-only） -->
    <g v-if="showEditorMarkers" class="editor-only">
      <template v-for="box in editorBoxes" :key="'marker-' + box.id">
        <g v-for="(pos, pi) in editorBoxBadgePositions(box)" :key="box.id + '-' + pi">
          <circle :cx="pos.x" :cy="pos.y" r="12" fill="#2563eb" stroke="#fff" stroke-width="1.2" />
          <text
            :x="pos.x"
            :y="pos.y + 1"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="#ffffff"
            style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 13px; font-weight: 700"
          >
            {{ box.marker }}
          </text>
          <text
            v-if="pos.hint"
            :x="pos.x + 18"
            :y="pos.y + 4"
            fill="#2563eb"
            style="font-family: 'Microsoft JhengHei', sans-serif; font-size: 11px"
          >
            {{ pos.hint }}
          </text>
        </g>
      </template>
    </g>
  </svg>
</template>
