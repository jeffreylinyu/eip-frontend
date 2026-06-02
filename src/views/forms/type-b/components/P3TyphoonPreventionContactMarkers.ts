/** 防颱聯絡體制圖可編輯欄位 key */
export type P3TyphoonPreventionContactFieldKey =
  | 'hospitalName'
  | 'architectOffice'
  | 'contractorCompanyName'
  | 'insuranceCompanyName'
  | 'typhoonCenterName'

export interface P3TyphoonPreventionContactEditorBox {
  id: string
  marker: string
  title: string
  fieldKeys: P3TyphoonPreventionContactFieldKey[]
  badgeX: number
  badgeY: number
}

/** 可編輯維護區塊與圖上框框對照（1～5）。 */
export const P3_TYPHOON_PREVENTION_CONTACT_EDITOR_BOXES: P3TyphoonPreventionContactEditorBox[] = [
  {
    id: 'hospital',
    marker: '1',
    title: '醫院（上）',
    fieldKeys: ['hospitalName'],
    badgeX: 48,
    badgeY: 32,
  },
  {
    id: 'architect',
    marker: '2',
    title: '建築師事務所（中左）',
    fieldKeys: ['architectOffice'],
    badgeX: 48,
    badgeY: 148,
  },
  {
    id: 'contractor',
    marker: '3',
    title: '承攬廠商（中）',
    fieldKeys: ['contractorCompanyName'],
    badgeX: 338,
    badgeY: 148,
  },
  {
    id: 'insurance',
    marker: '4',
    title: '保險公司（中右）',
    fieldKeys: ['insuranceCompanyName'],
    badgeX: 628,
    badgeY: 148,
  },
  {
    id: 'typhoonCenter',
    marker: '5',
    title: '工地防颱中心（下）',
    fieldKeys: ['typhoonCenterName'],
    badgeX: 338,
    badgeY: 308,
  },
]

export { stripEditorOnlyFromSvg } from './P3EmergencyResponseContactMarkers'
