<script lang="ts">
/**
 * P-3 安全衛生組織架構圖 — 結構化資料。
 *
 * 由 FormP3 結構化欄位驅動 SVG 即時預覽，匯出前再把 SVG 轉成 PNG 上傳到後端。
 * 後端據此 PNG 透過 `{{nested_p3_safety_health_org_chart}}` 佔位符插入 Word。
 */
export interface P3OrgChartData {
  /** 公司名稱（例：永驣營造有限公司） */
  companyName: string
  /** 公司負責人 */
  ownerName: string
  /** 公司框右側註釋（例：統籌工程所有事務） */
  ownerNote: string
  /** 是否顯示「勞工安全衛生委員」方塊 */
  showLaborSafetyCommittee: boolean
  /** 品管人員姓名 */
  qualityStaffName: string
  /** 工地主任姓名 */
  siteDirectorName: string
  /** 工地主任右側註釋（例：統籌工地所有事務） */
  siteDirectorNote: string
  /** 緊急救援小組負責人姓名 */
  emergencyTeamLeaderName: string
  /** 緊急救援小組左下註釋 */
  emergencyTeamNote: string
  /** 安衛管理組組長姓名 */
  safetyTeamLeaderName: string
  /** 安衛管理組右側標題（如：安全衛生管理及執行工作如下：） */
  safetyTeamNote: string
  /** 安衛管理組右側列點（教育訓練／工安管理／緊急應變…） */
  safetyTeamItems: string[]
  /** 工務組負責人/工程師姓名 */
  workTeamLeaderName: string
  /** 行政組負責人姓名 */
  adminTeamLeaderName: string
  /** 行政組右側註釋 */
  adminTeamNote: string
}

/** 安全衛生組織架構圖預設資料（依使用者提供之圖樣為基礎） */
export const DEFAULT_P3_ORG_CHART_DATA: P3OrgChartData = {
  companyName: '',
  ownerName: '',
  ownerNote: '統籌工程所有事務',
  showLaborSafetyCommittee: true,
  qualityStaffName: '',
  siteDirectorName: '',
  siteDirectorNote: '統籌工地所有事務',
  emergencyTeamLeaderName: '',
  emergencyTeamNote:
    '平常協助安衛主管實施一般規定，並檢查經常觀察機具設備的安全狀況及變作業情形',
  safetyTeamLeaderName: '',
  safetyTeamNote: '安全衛生管理及執行工作如下：',
  safetyTeamItems: ['教育訓練', '工安管理', '緊急應變', '門禁安全', '交通管制'],
  workTeamLeaderName: '',
  adminTeamLeaderName: '',
  adminTeamNote:
    '遵守工作安全衛生工作守則，並辦理有關安全衛生經常性檢查、重點檢查',
}

/**
 * 將任意輸入正規化為 P3OrgChartData（缺值時回填預設值），方便載入 DB 時容錯。
 */
export function normalizeP3OrgChartData(input: any): P3OrgChartData {
  const d = input && typeof input === 'object' ? input : {}
  return {
    companyName: typeof d.companyName === 'string' ? d.companyName : DEFAULT_P3_ORG_CHART_DATA.companyName,
    ownerName: typeof d.ownerName === 'string' ? d.ownerName : DEFAULT_P3_ORG_CHART_DATA.ownerName,
    ownerNote: typeof d.ownerNote === 'string' ? d.ownerNote : DEFAULT_P3_ORG_CHART_DATA.ownerNote,
    showLaborSafetyCommittee:
      typeof d.showLaborSafetyCommittee === 'boolean'
        ? d.showLaborSafetyCommittee
        : DEFAULT_P3_ORG_CHART_DATA.showLaborSafetyCommittee,
    qualityStaffName: typeof d.qualityStaffName === 'string' ? d.qualityStaffName : DEFAULT_P3_ORG_CHART_DATA.qualityStaffName,
    siteDirectorName: typeof d.siteDirectorName === 'string' ? d.siteDirectorName : DEFAULT_P3_ORG_CHART_DATA.siteDirectorName,
    siteDirectorNote: typeof d.siteDirectorNote === 'string' ? d.siteDirectorNote : DEFAULT_P3_ORG_CHART_DATA.siteDirectorNote,
    emergencyTeamLeaderName:
      typeof d.emergencyTeamLeaderName === 'string'
        ? d.emergencyTeamLeaderName
        : DEFAULT_P3_ORG_CHART_DATA.emergencyTeamLeaderName,
    emergencyTeamNote: typeof d.emergencyTeamNote === 'string' ? d.emergencyTeamNote : DEFAULT_P3_ORG_CHART_DATA.emergencyTeamNote,
    safetyTeamLeaderName:
      typeof d.safetyTeamLeaderName === 'string'
        ? d.safetyTeamLeaderName
        : DEFAULT_P3_ORG_CHART_DATA.safetyTeamLeaderName,
    safetyTeamNote: typeof d.safetyTeamNote === 'string' ? d.safetyTeamNote : DEFAULT_P3_ORG_CHART_DATA.safetyTeamNote,
    safetyTeamItems: Array.isArray(d.safetyTeamItems)
      ? d.safetyTeamItems.filter((s: any) => typeof s === 'string')
      : [...DEFAULT_P3_ORG_CHART_DATA.safetyTeamItems],
    workTeamLeaderName: typeof d.workTeamLeaderName === 'string' ? d.workTeamLeaderName : DEFAULT_P3_ORG_CHART_DATA.workTeamLeaderName,
    adminTeamLeaderName:
      typeof d.adminTeamLeaderName === 'string' ? d.adminTeamLeaderName : DEFAULT_P3_ORG_CHART_DATA.adminTeamLeaderName,
    adminTeamNote: typeof d.adminTeamNote === 'string' ? d.adminTeamNote : DEFAULT_P3_ORG_CHART_DATA.adminTeamNote,
  }
}
</script>

<script setup lang="ts">
/**
 * P-3 安全衛生組織架構圖 — SVG 即時預覽元件。
 *
 * - 完全以結構化 props 驅動；無任何 HTML（避免 `<foreignObject>` 在 canvas drawImage
 *   時會被瀏覽器 taint 的問題）。
 * - **所有樣式以 inline `style` 屬性套用**：因為 SVG 一旦被序列化丟進 `<img>` 載入，
 *   外部 CSS（包含 Vue scoped 樣式）就不會生效；只有 inline style 能保證
 *   後續 canvas → PNG 與最終 Word 中外觀一致。
 * - 對外 expose `getSvgElement()`：FormP3 在按下「同步」或匯出前會以此元件節點
 *   `new XMLSerializer()` → `<img>` → `<canvas>.toBlob('image/png')` 轉 PNG 上傳。
 *
 * 版型參考使用者提供圖樣，採固定版型（單欄主軸 + 左側分支 + 右側註釋）；
 * viewBox 採 1100 × 1080，列印縮放後可放入 A4 直式單頁。
 */
import { computed, ref } from 'vue'

interface Props {
  data: P3OrgChartData
  /** 是否要對外露出 SVG 寬高屬性（false 時只用 viewBox，由父層 css 縮放） */
  showFixedSize?: boolean
}
const props = withDefaults(defineProps<Props>(), { showFixedSize: false })

const svgRef = ref<SVGSVGElement | null>(null)

defineExpose({
  /** 取得 SVG DOM 節點，供父層 serialize 後轉 PNG 上傳。 */
  getSvgElement(): SVGSVGElement | null {
    return svgRef.value
  },
  /** 取得目前 viewBox 寬高（轉 PNG 時 canvas 大小依此倍率放大可獲得清晰度）。 */
  getViewBox(): { w: number; h: number } {
    return { w: W, h: H }
  },
})

/**
 * viewBox 寬高刻意做成 17:21 比例（與 Word 中固定插入尺寸 17cm × 21cm 對齊），
 * 這樣前端 SVG → PNG 轉檔後在 Word 內呈現時不會被拉伸變形。
 *
 * 內部所有節點座標仍沿用原本 1100×1080 的版型，再以 `<g transform="translate(INNER_OFFSET_X, INNER_OFFSET_Y)">`
 * 整體置中於 17:21 畫布內，避免重新計算每個座標。
 */
const INNER_W = 1100
const INNER_H = 1080
const W = 1100
const H = Math.round((W * 21) / 17) // 1359，17:21
const INNER_OFFSET_X = (W - INNER_W) / 2
const INNER_OFFSET_Y = (H - INNER_H) / 2

// === 樣式常數（inline style；確保 SVG 序列化後外觀仍正確）===
const FONT_FAMILY = "'Microsoft JhengHei','PingFang TC','Noto Sans TC',sans-serif"
const STYLE_BOX = 'fill:#ffffff;stroke:#000000;stroke-width:1.4'
const STYLE_TEXT = `font-family:${FONT_FAMILY};font-size:18px;fill:#222222`
// 原本的人名／重點資料用紅色＋底線，但使用者要求圖片中所有文字統一黑色，
// 因此把 STYLE_TEXT_NAME 也改成與一般文字相同的黑色純文字（保留為獨立常數，未來如要再強調可調整）。
const STYLE_TEXT_NAME = `font-family:${FONT_FAMILY};font-size:18px;fill:#222222`
const STYLE_LINE = 'stroke:#000000;stroke-width:1.4;fill:none'
const STYLE_NOTE = `font-family:${FONT_FAMILY};font-size:16px;fill:#222222`
const STYLE_BG = 'fill:#ffffff'

/** 簡單依字元數對中文做手動換行（避免 SVG 內無 word-wrap） */
function wrapByChars(text: string, maxCharsPerLine: number): string[] {
  const s = String(text || '').trim()
  if (!s) return []
  const lines: string[] = []
  let buf = ''
  for (const ch of s) {
    if (ch === '\n') {
      lines.push(buf)
      buf = ''
      continue
    }
    buf += ch
    if (buf.length >= maxCharsPerLine) {
      lines.push(buf)
      buf = ''
    }
  }
  if (buf) lines.push(buf)
  return lines
}

const ownerNoteLines = computed(() => wrapByChars(props.data.ownerNote, 9))
const siteDirectorNoteLines = computed(() => wrapByChars(props.data.siteDirectorNote, 9))
const emergencyNoteLines = computed(() => wrapByChars(props.data.emergencyTeamNote, 14))
const adminNoteLines = computed(() => wrapByChars(props.data.adminTeamNote, 11))
</script>

<template>
  <svg
    ref="svgRef"
    :viewBox="`0 0 ${W} ${H}`"
    :width="props.showFixedSize ? W : undefined"
    :height="props.showFixedSize ? H : undefined"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="安全衛生組織架構圖"
    style="display:block; width:100%; height:auto; background:#fff;"
  >
    <!-- 整個 17:21 畫布的白底（橫越整個 viewBox） -->
    <rect :style="STYLE_BG" x="0" y="0" :width="W" :height="H" />

    <!-- 內部沿用原本 1100×1080 的座標，整體置中於 17:21 畫布 -->
    <g :transform="`translate(${INNER_OFFSET_X}, ${INNER_OFFSET_Y})`">
    <!-- 內容區白底（沿用原版型；在主白底之上） -->
    <rect :style="STYLE_BG" x="0" y="0" :width="INNER_W" :height="INNER_H" />

    <!-- 公司框（含負責人）-->
    <g>
      <rect :style="STYLE_BOX" x="380" y="30" width="320" height="80" />
      <text :style="STYLE_TEXT_NAME" x="540" y="60" text-anchor="middle">{{ data.companyName || '（公司名稱）' }}</text>
      <text :style="STYLE_TEXT" x="540" y="90" text-anchor="middle">
        負責人：<tspan :style="STYLE_TEXT_NAME">{{ data.ownerName || '－' }}</tspan>
      </text>

      <!-- 公司右側註釋 -->
      <line :style="STYLE_LINE" x1="700" y1="70" x2="780" y2="70" />
      <rect :style="STYLE_BOX" x="780" y="35" width="240" height="70" />
      <template v-if="ownerNoteLines.length === 0">
        <text :style="STYLE_NOTE" x="900" y="74" text-anchor="middle">{{ data.ownerNote || '' }}</text>
      </template>
      <template v-else>
        <text v-for="(ln, i) in ownerNoteLines" :key="i" :style="STYLE_NOTE" x="900" :y="55 + i * 18" text-anchor="middle">{{ ln }}</text>
      </template>
    </g>

    <!-- 主軸：公司中下 → 工地主任 → 安衛管理組 → 下方分叉 -->
    <line :style="STYLE_LINE" x1="540" y1="110" x2="540" y2="700" />

    <!-- 勞工安全衛生委員（依組織架構圖標準版型固定顯示） -->
    <g>
      <line :style="STYLE_LINE" x1="540" y1="225" x2="300" y2="225" />
      <rect :style="STYLE_BOX" x="60" y="195" width="240" height="60" />
      <text :style="STYLE_TEXT" x="180" y="230" text-anchor="middle">勞工安全衛生委員</text>
    </g>

    <!-- 品管人員 -->
    <g>
      <line :style="STYLE_LINE" x1="540" y1="350" x2="300" y2="350" />
      <rect :style="STYLE_BOX" x="60" y="320" width="240" height="60" />
      <text :style="STYLE_TEXT" x="180" y="355" text-anchor="middle">
        品管人員：<tspan :style="STYLE_TEXT_NAME">{{ data.qualityStaffName || '－' }}</tspan>
      </text>
    </g>

    <!-- 工地主任 -->
    <g>
      <rect :style="STYLE_BOX" x="410" y="320" width="260" height="60" />
      <text :style="STYLE_TEXT" x="540" y="355" text-anchor="middle">
        工地主任：<tspan :style="STYLE_TEXT_NAME">{{ data.siteDirectorName || '－' }}</tspan>
      </text>
      <line :style="STYLE_LINE" x1="670" y1="350" x2="780" y2="350" />
      <rect :style="STYLE_BOX" x="780" y="320" width="240" height="60" />
      <template v-if="siteDirectorNoteLines.length === 0">
        <text :style="STYLE_NOTE" x="900" y="354" text-anchor="middle">{{ data.siteDirectorNote || '' }}</text>
      </template>
      <template v-else>
        <text v-for="(ln, i) in siteDirectorNoteLines" :key="i" :style="STYLE_NOTE" x="900" :y="335 + i * 18" text-anchor="middle">{{ ln }}</text>
      </template>
    </g>

    <!-- 緊急救援小組 -->
    <g>
      <line :style="STYLE_LINE" x1="540" y1="500" x2="300" y2="500" />
      <rect :style="STYLE_BOX" x="40" y="460" width="260" height="80" />
      <text :style="STYLE_TEXT" x="170" y="490" text-anchor="middle">緊急救援小組</text>
      <text :style="STYLE_TEXT" x="170" y="515" text-anchor="middle">
        負責人：<tspan :style="STYLE_TEXT_NAME">{{ data.emergencyTeamLeaderName || '－' }}</tspan>
      </text>
      <!-- 緊急救援小組左下註釋（連到緊急救援小組底部）-->
      <line :style="STYLE_LINE" x1="170" y1="540" x2="170" y2="600" />
      <rect :style="STYLE_BOX" x="20" y="600" width="320" height="120" />
      <template v-if="emergencyNoteLines.length === 0">
        <text :style="STYLE_NOTE" x="180" y="660" text-anchor="middle">{{ data.emergencyTeamNote || '' }}</text>
      </template>
      <template v-else>
        <text v-for="(ln, i) in emergencyNoteLines" :key="i" :style="STYLE_NOTE" x="40" :y="630 + i * 20">{{ ln }}</text>
      </template>
    </g>

    <!-- 安衛管理組 -->
    <g>
      <rect :style="STYLE_BOX" x="410" y="475" width="260" height="60" />
      <text :style="STYLE_TEXT" x="540" y="510" text-anchor="middle">
        安衛管理組：<tspan :style="STYLE_TEXT_NAME">{{ data.safetyTeamLeaderName || '－' }}</tspan>
      </text>
      <line :style="STYLE_LINE" x1="670" y1="505" x2="750" y2="505" />
      <!-- 右側列點區 -->
      <rect :style="STYLE_BOX" x="750" y="430" width="320" height="190" />
      <text :style="STYLE_TEXT" x="765" y="460">{{ data.safetyTeamNote || '' }}</text>
      <g v-for="(item, i) in data.safetyTeamItems.slice(0, 8)" :key="i">
        <text :style="STYLE_TEXT" :x="780" :y="490 + i * 22">- <tspan :style="STYLE_TEXT_NAME">{{ item }}</tspan></text>
      </g>
    </g>

    <!-- 主軸下方分叉到工務組 / 行政組 -->
    <line :style="STYLE_LINE" x1="420" y1="700" x2="620" y2="700" />
    <line :style="STYLE_LINE" x1="420" y1="700" x2="420" y2="730" />
    <line :style="STYLE_LINE" x1="620" y1="700" x2="620" y2="730" />

    <!-- 工務組 -->
    <g>
      <rect :style="STYLE_BOX" x="370" y="730" width="100" height="220" />
      <text :style="STYLE_TEXT" x="420" y="765" text-anchor="middle">工務組：</text>
      <text :style="STYLE_TEXT_NAME" x="420" y="800" text-anchor="middle">{{ data.workTeamLeaderName || '－' }}</text>
    </g>

    <!-- 行政組 -->
    <g>
      <rect :style="STYLE_BOX" x="570" y="730" width="100" height="220" />
      <text :style="STYLE_TEXT" x="620" y="765" text-anchor="middle">行政組：</text>
      <text :style="STYLE_TEXT_NAME" x="620" y="800" text-anchor="middle">{{ data.adminTeamLeaderName || '－' }}</text>
      <!-- 行政組右註釋 -->
      <line :style="STYLE_LINE" x1="670" y1="800" x2="730" y2="800" />
      <rect :style="STYLE_BOX" x="730" y="730" width="320" height="160" />
      <template v-if="adminNoteLines.length === 0">
        <text :style="STYLE_NOTE" x="890" y="810" text-anchor="middle">{{ data.adminTeamNote || '' }}</text>
      </template>
      <template v-else>
        <text v-for="(ln, i) in adminNoteLines" :key="i" :style="STYLE_NOTE" x="750" :y="765 + i * 22">{{ ln }}</text>
      </template>
    </g>
    </g>
  </svg>
</template>
