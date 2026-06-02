/** 體制圖可編輯欄位 key（與 P3EmergencyResponseContactData 一致） */
export type P3EmergencyContactFieldKey =
  | 'siteDirectorName'
  | 'hospitalName'
  | 'hospitalPhone'
  | 'architectOffice'
  | 'architectName'
  | 'architectPhone'
  | 'contractorCompanyName'
  | 'technicianName'
  | 'technicianPhone'
  | 'laborInspectionOffice'
  | 'laborInspectionPhone'

/** 維護用編號框（1～5）；匯出 PNG 時不顯示標記。 */
export interface P3EmergencyContactEditorBox {
  id: string
  /** 阿拉伯數字，如 1、2（非 ① 等特殊字元） */
  marker: string
  /** 區塊標題（表單分組用） */
  title: string
  fieldKeys: P3EmergencyContactFieldKey[]
  /** 主框左上角標記座標（SVG viewBox） */
  badgeX: number
  badgeY: number
  /** 同一資料出現在多個框時（如送醫治療與左上醫院同源） */
  extraBadges?: { x: number; y: number; hint?: string }[]
}

/** 表單欄位簡短標籤（對照圖上框框內容，不重複區塊名稱） */
export const P3_EMERGENCY_CONTACT_FIELD_LABELS: Record<P3EmergencyContactFieldKey, string> = {
  siteDirectorName: '負責人姓名',
  hospitalName: '名稱',
  hospitalPhone: '電話',
  architectOffice: '事務所',
  architectName: '姓名',
  architectPhone: '電話',
  contractorCompanyName: '名稱',
  technicianName: '姓名',
  technicianPhone: '電話',
  laborInspectionOffice: '名稱',
  laborInspectionPhone: '電話',
}

/** 可編輯維護區塊與圖上框框對照（方案 A：按框編號）。 */
export const P3_EMERGENCY_CONTACT_EDITOR_BOXES: P3EmergencyContactEditorBox[] = [
  {
    id: 'siteDirector',
    marker: '1',
    title: '駐工地緊急聯絡人',
    fieldKeys: ['siteDirectorName'],
    badgeX: 378,
    badgeY: 58,
  },
  {
    id: 'hospital',
    marker: '2',
    title: '醫院（工程災害／送醫治療共用）',
    fieldKeys: ['hospitalName', 'hospitalPhone'],
    badgeX: 78,
    badgeY: 224,
    extraBadges: [{ x: 708, y: 424, hint: '同上' }],
  },
  {
    id: 'architect',
    marker: '3',
    title: '建築師',
    fieldKeys: ['architectOffice', 'architectName', 'architectPhone'],
    badgeX: 338,
    badgeY: 224,
  },
  {
    id: 'labor',
    marker: '4',
    title: '勞動檢查機關',
    fieldKeys: ['laborInspectionOffice', 'laborInspectionPhone'],
    badgeX: 588,
    badgeY: 224,
  },
  {
    id: 'contractor',
    marker: '5',
    title: '承攬廠商／專任技師',
    fieldKeys: ['contractorCompanyName', 'technicianName', 'technicianPhone'],
    badgeX: 338,
    badgeY: 336,
  },
]

export function editorBoxBadgePositions(box: P3EmergencyContactEditorBox): { x: number; y: number; hint?: string }[] {
  const main = [{ x: box.badgeX, y: box.badgeY }]
  if (!box.extraBadges?.length) return main
  return [...main, ...box.extraBadges]
}

/** 匯出 PNG 前移除維護用標記（class="editor-only"）。 */
export function stripEditorOnlyFromSvg(svgEl: SVGSVGElement): SVGSVGElement {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('.editor-only').forEach((el) => el.remove())
  return clone
}
