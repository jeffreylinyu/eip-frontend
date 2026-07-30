export interface FixedDocumentFormSpec {
  code: string
  category: 'C' | 'G'
  itemNumber: string
  fallbackName: string
  path: string
  ownerType: 'SUPERVISORY' | 'CONTRACTOR'
}

export const SUPERVISORY_C_FIXED_FORMS: readonly FixedDocumentFormSpec[] = [
  {
    code: 'C01',
    category: 'C',
    itemNumber: '01',
    fallbackName: '全民督工案件',
    path: '/forms/c1-public-supervision-case',
    ownerType: 'SUPERVISORY',
  },
  {
    code: 'C02',
    category: 'C',
    itemNumber: '02',
    fallbackName: '施工月報',
    path: '/forms/c2-supervision-periodic-report',
    ownerType: 'SUPERVISORY',
  },
  {
    code: 'C03',
    category: 'C',
    itemNumber: '03',
    fallbackName: '施工協調會紀錄',
    path: '/forms/c3-construction-coordination-meeting',
    ownerType: 'SUPERVISORY',
  },
  {
    code: 'C04',
    category: 'C',
    itemNumber: '04',
    fallbackName: '各項會勘紀錄',
    path: '/forms/c4-site-inspection-record',
    ownerType: 'SUPERVISORY',
  },
  {
    code: 'C05',
    category: 'C',
    itemNumber: '05',
    fallbackName: '公共工程監造報表',
    path: '/forms/c5-public-works-supervision-report',
    ownerType: 'SUPERVISORY',
  },
]

export const CONTRACTOR_G_FIXED_FORMS: readonly FixedDocumentFormSpec[] = [
  {
    code: 'G01',
    category: 'G',
    itemNumber: '01',
    fallbackName: '全民督工案件',
    path: '/forms/g1-public-supervision-case',
    ownerType: 'CONTRACTOR',
  },
  {
    code: 'G02',
    category: 'G',
    itemNumber: '02',
    fallbackName: '施工網狀圖',
    path: '/forms/g2-construction-network-diagram',
    ownerType: 'CONTRACTOR',
  },
  {
    code: 'G03',
    category: 'G',
    itemNumber: '03',
    fallbackName: '施工協調會紀錄',
    path: '/forms/g3-construction-coordination-meeting',
    ownerType: 'CONTRACTOR',
  },
  {
    code: 'G04',
    category: 'G',
    itemNumber: '04',
    fallbackName: '各項會勘紀錄',
    path: '/forms/g4-site-inspection-record',
    ownerType: 'CONTRACTOR',
  },
  {
    code: 'G05',
    category: 'G',
    itemNumber: '05',
    fallbackName: '營建剩餘土石方管理',
    path: '/forms/g5-surplus-soil-management',
    ownerType: 'CONTRACTOR',
  },
  {
    code: 'G06',
    category: 'G',
    itemNumber: '06',
    fallbackName: '公共工程施工日誌',
    path: '/forms/g6-public-works-construction-daily-report',
    ownerType: 'CONTRACTOR',
  },
]

export const FIXED_DOCUMENT_FORMS: readonly FixedDocumentFormSpec[] = [
  ...SUPERVISORY_C_FIXED_FORMS,
  ...CONTRACTOR_G_FIXED_FORMS,
]
