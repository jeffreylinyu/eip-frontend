/** P-1「職業安全衛生教育訓練人數」預設值（可於表單修改） */
export const P1_SAFETY_HEALTH_TRAINING_HEADCOUNT_DEFAULT = 10

/** P-1「交通維持及安全管制」預設（工區位置請以 XXX 自行替換） */
export const P1_TRAFFIC_MAINTENANCE_SAFETY_CONTROL_DEFAULT =
  '由於進出本工地之路線，並不會進入鬧區街道，且工區位於XXX，除材料及廢棄物運輸與工程人員車輛會出入外，其他施工中之車輛並不會離開工區，故對地區交通環境並無衝擊，並均遵守相關法規及規定，不得超速及超載。'

/** P-1「車輛進出路線」預設（路線／位置請以 XXX 自行替換；不含標題前綴） */
export const P1_VEHICLE_ACCESS_ROUTES_DEFAULT =
  '本工地位於XXX旁，進出之路線，可由XXX、XXX進入工區，並不會進入鄉間小道及鬧區街道，故一般符合法規之大型拖板車均可通行。'

/** 後端／Word 匯出用標題（前端不顯示） */
export const P1_COMPLETION_DOCUMENT_SUBMISSION_TITLE = '貳、\t竣工文件提送項目'

/** P-1「竣工文件提送項目」預設列（不含 (1)(2) 序號，項次由表格局欄顯示） */
export const P1_COMPLETION_DOCUMENT_ITEMS_DEFAULT: readonly string[] = [
  '竣工圖：裝訂A3縮影圖乙份。',
  '竣工數量計算書：裝訂成冊5份。',
  '結算明細表：裝訂成冊5份。',
  '工程竣工報告：5份。',
  '竣工書、圖之光碟片：1份。',
  '施工前、中、後之工程施工照片。',
  '施工紀錄影片。',
  '契約另有規定或工程司指示應提送之其他文件。'
]

export type P1CompletionDocumentStored = { items: string[] }

export function encodeP1CompletionDocumentItems(items: string[]): string {
  return JSON.stringify({ items: [...items] } satisfies P1CompletionDocumentStored)
}

/** 舊版「(1)xxx」列轉成純內文 */
export function stripCompletionDocLegacyPrefix(line: string): string {
  return line.replace(/^\(\d+\)\s*/, '').trim()
}

export function decodeP1CompletionDocumentItems(raw: string | null | undefined): string[] {
  const fallback = () => [...P1_COMPLETION_DOCUMENT_ITEMS_DEFAULT]
  if (raw == null || !String(raw).trim()) return fallback()
  const s = String(raw).trim()
  try {
    const o = JSON.parse(s) as { items?: unknown }
    if (o && Array.isArray(o.items)) {
      const arr = o.items.map((x) => stripCompletionDocLegacyPrefix(x == null ? '' : String(x)))
      return arr.length > 0 ? arr : fallback()
    }
  } catch {
    /* 舊資料：純文字 */
  }
  const lines = s.split(/\r?\n/).map((t) => t.trim()).filter(Boolean)
  const titleStripped = lines.filter((line) => !/^貳、/.test(line))
  const itemLines = titleStripped.filter((line) => /^\(\d+\)/.test(line))
  if (itemLines.length >= 1) {
    return itemLines.map((line) => stripCompletionDocLegacyPrefix(line))
  }
  if (titleStripped.length > 0) {
    return titleStripped.length === 1
      ? [titleStripped[0]!]
      : titleStripped
  }
  return fallback()
}
