<script lang="ts">
/**
 * P-3 協力廠商組織關係圖 — 結構化資料。
 *
 * 由 FormP3 結構化欄位驅動 SVG 即時預覽，匯出前再把 SVG 轉成 PNG 上傳到後端。
 * 後端據此 PNG 透過 `{{nested_p3_subcontractor_org_chart}}` 佔位符插入 Word。
 *
 * 紅字部分（使用者可編輯）：
 * - constructionName（工程名稱；左側框內直書，自動帶入 currentProject 名稱）
 * - companyName（公司名稱；左側框內直書，自動帶入主要承攬公司名）
 * - materialSuppliers[]（中央材料供應商分類，N 列）
 * - otherSubcontractorTitle（右側「其他協力廠商等」直書文字）
 *
 * 黑字部分（固定不可編輯）：
 * - "(工程承攬)" 左側框上方標題
 * - "(材料供應)" 中央區域上方標題
 */
export interface P3SubcontractorOrgChartData {
  /** 左側框：工程名稱（直書；紅字） */
  constructionName: string
  /** 左側框：公司名稱（直書；紅字） */
  companyName: string
  /** 中央材料供應商分類（紅字；至少 1 列；可動態增減） */
  materialSuppliers: string[]
  /** 右側框：直書文字（預設「其他協力廠商等」；紅字可改） */
  otherSubcontractorTitle: string
}

/**
 * 預設資料：材料供應商分類**預設為空陣列**，由使用者手動新增或透過「依標單工程案資料建構」按鈕產出。
 * 工程名稱／公司名稱會在頁面載入時由 prefill 自動帶入；右側框預設「其他協力廠商等」。
 */
export const DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA: P3SubcontractorOrgChartData = {
  constructionName: '',
  companyName: '',
  materialSuppliers: [],
  otherSubcontractorTitle: '其他協力廠商等',
}

/** 將任意輸入正規化為 P3SubcontractorOrgChartData（缺值時回填預設值），方便載入 DB 時容錯。 */
export function normalizeP3SubcontractorOrgChartData(input: any): P3SubcontractorOrgChartData {
  const d = input && typeof input === 'object' ? input : {}
  return {
    constructionName:
      typeof d.constructionName === 'string'
        ? d.constructionName
        : DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA.constructionName,
    companyName:
      typeof d.companyName === 'string'
        ? d.companyName
        : DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA.companyName,
    materialSuppliers: Array.isArray(d.materialSuppliers)
      ? d.materialSuppliers.filter((s: any) => typeof s === 'string')
      : [...DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA.materialSuppliers],
    otherSubcontractorTitle:
      typeof d.otherSubcontractorTitle === 'string' && d.otherSubcontractorTitle.trim().length > 0
        ? d.otherSubcontractorTitle
        : DEFAULT_P3_SUBCONTRACTOR_ORG_CHART_DATA.otherSubcontractorTitle,
  }
}
</script>

<script setup lang="ts">
/**
 * P-3 協力廠商組織關係圖 — SVG 即時預覽元件。
 *
 * - 全 inline style（與 P3SafetyHealthOrgChartSvg.vue 同手法），確保 SVG 序列化後
 *   `<img>` → canvas → PNG 在 Word 中外觀一致。
 * - 直書文字以「逐字 `<text>` 元素垂直堆疊」實作，避免 `writing-mode` 在不同瀏覽器
 *   或 canvas 重繪時行為不一致。
 * - viewBox 採直立 19:25 比例，列印縮放後可放入 A4 直式單頁；中央材料分類框數量
 *   會依 props 動態計算，每框等高分布。
 */
import { computed, ref } from 'vue'

interface Props {
  data: P3SubcontractorOrgChartData
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

// === 版型常數 ===
/**
 * 總畫布寬高刻意做成 18:22.5 比例（與 Word 中固定插入尺寸 18cm × 22.5cm 對齊），
 * 這樣 SVG → PNG 轉檔後在 Word 內呈現時不會被拉伸變形。
 *
 * 內容版型仍以 1100×1450 設計；畫布寬度依 18:22.5 比例加寬並水平置中內容。
 */
const INNER_W = 1100
const INNER_H = 1450
const H = INNER_H
const W = Math.round((H * 18) / 22.5) // 1160，18:22.5
const INNER_OFFSET_X = (W - INNER_W) / 2
const INNER_OFFSET_Y = 0

/** 左區：公司／工程名稱框 */
const LEFT_X = 50
const LEFT_Y = 110
const LEFT_W = 150
const LEFT_H = 1240
const LEFT_TITLE_Y = 90 // (工程承攬) 標題 Y（在框下方標示）
const LEFT_INNER_PADDING = 30 // 上下內距

/** 中區：材料供應分類框群 */
const CENTER_LEFT = 270
const CENTER_RIGHT = 850
const CENTER_W = CENTER_RIGHT - CENTER_LEFT // 580
const CENTER_TITLE_Y = 60 // (材料供應) 標題 Y
const CENTER_FRAME_TOP = 110 // 中區外框頂端
const CENTER_FRAME_BOTTOM = 1340 // 中區外框底端
const CENTER_INNER_GAP = 30 // 內距：第一個方框 / 最後方框與外框邊緣的距離
const SUPPLIER_BOX_HEIGHT = 90 // 每個材料分類方框高度

/** 右區：其他協力廠商等 */
const RIGHT_X = 920
const RIGHT_Y = 470
const RIGHT_W = 130
const RIGHT_H = 510
const RIGHT_LINE_X = CENTER_RIGHT + 30 // 中區到右框的橫線連接點

// === 樣式常數 ===
// 註：使用者要求「圖片中的字統一為黑色」，因此原本紅色／加粗的標題、直書文字、
// 材料分類框文字皆改為與一般文字相同的黑色純文字。保留兩個獨立常數方便將來如要改色。
const FONT_FAMILY = "'Microsoft JhengHei','PingFang TC','Noto Sans TC',sans-serif"
const STYLE_BOX_BLACK = 'fill:#ffffff;stroke:#000000;stroke-width:1.6'
const STYLE_BOX_DASHED = 'fill:none;stroke:#000000;stroke-width:1.4;stroke-dasharray:4 4'
const STYLE_LINE = 'stroke:#000000;stroke-width:1.4;fill:none'
const STYLE_TEXT_BLACK = `font-family:${FONT_FAMILY};font-size:18px;fill:#222222`
const STYLE_TEXT_HIGHLIGHT = `font-family:${FONT_FAMILY};font-size:20px;fill:#222222`
const STYLE_TEXT_VERTICAL = `font-family:${FONT_FAMILY};font-size:24px;fill:#222222`
const STYLE_BG = 'fill:#ffffff'

/**
 * 把字串轉成「直書逐字」需要的字元陣列；過濾掉不適合單獨佔一行的字元。
 *
 * 注意：直書時數字／英文若想顯示為直立可選擇旋轉，但本表格只會用到中文，因此維持簡單。
 */
function toVerticalChars(s: string): string[] {
  return Array.from((s || '').replace(/\s+/g, ''))
}

/** 左側框：工程名稱（紅字、直書，從上到下，置左半邊） */
const constructionNameChars = computed(() => toVerticalChars(props.data.constructionName))

/** 左側框：公司名稱（紅字、直書，從上到下，置右半邊） */
const companyNameChars = computed(() => toVerticalChars(props.data.companyName))

/** 右側框：其他協力廠商等（紅字、直書，置中） */
const otherSubcontractorChars = computed(() =>
  toVerticalChars(props.data.otherSubcontractorTitle || '其他協力廠商等')
)

/** 中央材料供應分類框：等距分布計算 */
const supplierLayout = computed(() => {
  const items = props.data.materialSuppliers ?? []
  const n = Math.max(items.length, 1)
  const usableTop = CENTER_FRAME_TOP + CENTER_INNER_GAP
  const usableBottom = CENTER_FRAME_BOTTOM - CENTER_INNER_GAP
  const usableHeight = usableBottom - usableTop
  // 框中心點等距分布；總共 n 個 → 中心點分布在 [usableTop + h/2, usableBottom - h/2] 之間
  const halfBox = SUPPLIER_BOX_HEIGHT / 2
  const minCY = usableTop + halfBox
  const maxCY = usableBottom - halfBox
  return items.map((label, i) => {
    const cy = n === 1 ? (minCY + maxCY) / 2 : minCY + ((maxCY - minCY) * i) / (n - 1)
    return {
      label,
      idx: i,
      x: CENTER_LEFT,
      y: cy - halfBox,
      width: CENTER_W,
      height: SUPPLIER_BOX_HEIGHT,
      centerX: CENTER_LEFT + CENTER_W / 2,
      centerY: cy,
      leftPortX: CENTER_LEFT,
      rightPortX: CENTER_RIGHT,
    }
  })
})

/** 左區（公司框）右側出口的中心點：垂直置中於 LEFT 框 */
const leftPortY = computed(() => LEFT_Y + LEFT_H / 2)

/** 右區（其他協力廠商）左側入口的中心點 */
const rightPortY = computed(() => RIGHT_Y + RIGHT_H / 2)

/** 連接 trunk：左側框右邊 → 第一個 supplier 上邊 → 最後一個 supplier 下邊（垂直幹線在 leftPortX = CENTER_LEFT - 30） */
const LEFT_TRUNK_X = CENTER_LEFT - 30
const RIGHT_TRUNK_X = CENTER_RIGHT + 30

const trunkBounds = computed(() => {
  const layout = supplierLayout.value
  if (layout.length === 0) {
    return { topY: leftPortY.value, bottomY: leftPortY.value }
  }
  return {
    topY: layout[0].centerY,
    bottomY: layout[layout.length - 1].centerY,
  }
})
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
    aria-label="協力廠商組織關係圖"
    style="display:block; width:100%; height:auto; background:#fff;"
  >
    <!-- 整張畫布白底（橫越整個 18:22.5 viewBox） -->
    <rect :style="STYLE_BG" x="0" y="0" :width="W" :height="H" />

    <!-- 內部沿用原本 1100×1450 的座標，整體置中於 18:22.5 畫布 -->
    <g :transform="`translate(${INNER_OFFSET_X}, ${INNER_OFFSET_Y})`">
    <!-- 內容區白底（沿用原版型；在主白底之上） -->
    <rect :style="STYLE_BG" x="0" y="0" :width="INNER_W" :height="INNER_H" />

    <!-- 左側：工程承攬框（含工程名稱 + 公司名稱直書） -->
    <g>
      <!-- 上方 (工程承攬) 文字 — 黑色，固定 -->
      <text
        :style="STYLE_TEXT_BLACK"
        :x="LEFT_X + LEFT_W / 2"
        :y="LEFT_TITLE_Y"
        text-anchor="middle"
      >
        (工程承攬)
      </text>
      <!-- 框 -->
      <rect :style="STYLE_BOX_BLACK" :x="LEFT_X" :y="LEFT_Y" :width="LEFT_W" :height="LEFT_H" />

      <!-- 工程名稱（紅字直書，左半邊） -->
      <g v-if="constructionNameChars.length > 0">
        <text
          v-for="(ch, i) in constructionNameChars"
          :key="`cn-${i}`"
          :style="STYLE_TEXT_VERTICAL"
          :x="LEFT_X + LEFT_W * 0.32"
          :y="LEFT_Y + LEFT_INNER_PADDING + (i + 0.7) * 32"
          text-anchor="middle"
        >{{ ch }}</text>
      </g>

      <!-- 公司名稱（紅字直書，右半邊） -->
      <g v-if="companyNameChars.length > 0">
        <text
          v-for="(ch, i) in companyNameChars"
          :key="`co-${i}`"
          :style="STYLE_TEXT_VERTICAL"
          :x="LEFT_X + LEFT_W * 0.68"
          :y="LEFT_Y + LEFT_INNER_PADDING + (i + 0.7) * 32"
          text-anchor="middle"
        >{{ ch }}</text>
      </g>
    </g>

    <!-- 左幹線：從左側框右邊水平拉到 LEFT_TRUNK_X，再向下／向上連接所有 supplier -->
    <g>
      <line
        :style="STYLE_LINE"
        :x1="LEFT_X + LEFT_W"
        :y1="leftPortY"
        :x2="LEFT_TRUNK_X"
        :y2="leftPortY"
      />
      <line
        :style="STYLE_LINE"
        :x1="LEFT_TRUNK_X"
        :y1="trunkBounds.topY"
        :x2="LEFT_TRUNK_X"
        :y2="trunkBounds.bottomY"
      />
      <!-- 每個 supplier 的水平分支（從幹線到框左邊） -->
      <line
        v-for="row in supplierLayout"
        :key="`l-${row.idx}`"
        :style="STYLE_LINE"
        :x1="LEFT_TRUNK_X"
        :y1="row.centerY"
        :x2="row.leftPortX"
        :y2="row.centerY"
      />
    </g>

    <!-- 中央：(材料供應) 標題 -->
    <text
      :style="STYLE_TEXT_BLACK"
      :x="(CENTER_LEFT + CENTER_RIGHT) / 2"
      :y="CENTER_TITLE_Y"
      text-anchor="middle"
    >
      (材料供應)
    </text>

    <!-- 中央：外框（虛線 / 圍住所有 supplier） -->
    <rect
      :style="STYLE_BOX_DASHED"
      :x="CENTER_LEFT - 10"
      :y="CENTER_FRAME_TOP"
      :width="CENTER_W + 20"
      :height="CENTER_FRAME_BOTTOM - CENTER_FRAME_TOP"
      rx="6"
      ry="6"
    />

    <!-- 中央：材料供應分類方框（紅字） -->
    <g>
      <g v-for="row in supplierLayout" :key="`b-${row.idx}`">
        <rect
          :style="STYLE_BOX_BLACK"
          :x="row.x"
          :y="row.y"
          :width="row.width"
          :height="row.height"
        />
        <text
          :style="STYLE_TEXT_HIGHLIGHT"
          :x="row.centerX"
          :y="row.centerY + 7"
          text-anchor="middle"
        >{{ row.label || `（材料供應商 ${row.idx + 1}）` }}</text>
      </g>
    </g>

    <!-- 右幹線：從每個 supplier 右側水平拉到 RIGHT_TRUNK_X，再連接到右側框左邊中央 -->
    <g>
      <line
        v-for="row in supplierLayout"
        :key="`r-${row.idx}`"
        :style="STYLE_LINE"
        :x1="row.rightPortX"
        :y1="row.centerY"
        :x2="RIGHT_TRUNK_X"
        :y2="row.centerY"
      />
      <line
        :style="STYLE_LINE"
        :x1="RIGHT_TRUNK_X"
        :y1="trunkBounds.topY"
        :x2="RIGHT_TRUNK_X"
        :y2="trunkBounds.bottomY"
      />
      <line
        :style="STYLE_LINE"
        :x1="RIGHT_TRUNK_X"
        :y1="rightPortY"
        :x2="RIGHT_X"
        :y2="rightPortY"
      />
    </g>

    <!-- 右側：其他協力廠商等框（紅字直書） -->
    <g>
      <rect :style="STYLE_BOX_BLACK" :x="RIGHT_X" :y="RIGHT_Y" :width="RIGHT_W" :height="RIGHT_H" />
      <g v-if="otherSubcontractorChars.length > 0">
        <text
          v-for="(ch, i) in otherSubcontractorChars"
          :key="`oc-${i}`"
          :style="STYLE_TEXT_VERTICAL"
          :x="RIGHT_X + RIGHT_W / 2"
          :y="RIGHT_Y + 60 + i * 36"
          text-anchor="middle"
        >{{ ch }}</text>
      </g>
    </g>
    </g>
  </svg>
</template>
