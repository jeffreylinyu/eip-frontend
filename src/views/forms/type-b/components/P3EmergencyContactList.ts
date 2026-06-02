/** P-3 緊急聯絡方式表：單列 */
export interface P3EmergencyContactListRow {
  id: string
  category: string
  unitName: string
  phone: string
  remark: string
}

export interface P3EmergencyContactListData {
  version: number
  rows: P3EmergencyContactListRow[]
}

/** 建議類別（可選；使用者亦可自行輸入） */
export const P3_EMERGENCY_CONTACT_CATEGORY_OPTIONS: string[] = [
  '主辦機關',
  '醫院',
  '監造單位',
  '施工廠商',
  '警察局',
  '消防隊',
  '勞檢所',
  '管線'
]

export const DEFAULT_P3_EMERGENCY_CONTACT_LIST: P3EmergencyContactListData = {
  version: 1,
  rows: []
}

function newRowId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyEmergencyContactListRow(category = ''): P3EmergencyContactListRow {
  return {
    id: newRowId(),
    category,
    unitName: '',
    phone: '',
    remark: ''
  }
}

export function normalizeP3EmergencyContactList(input: unknown): P3EmergencyContactListData {
  const d = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const rawRows = Array.isArray(d.rows) ? d.rows : []
  const rows: P3EmergencyContactListRow[] = []
  for (const item of rawRows) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const category = typeof r.category === 'string' ? r.category.trim() : ''
    const unitName = typeof r.unitName === 'string' ? r.unitName.trim() : ''
    const phone = typeof r.phone === 'string' ? r.phone.trim() : ''
    const remark = typeof r.remark === 'string' ? r.remark.trim() : ''
    if (!category && !unitName && !phone && !remark) continue
    const id =
      typeof r.id === 'string' && r.id.trim()
        ? r.id.trim()
        : newRowId()
    rows.push({ id, category, unitName, phone, remark })
  }
  return { version: 1, rows }
}
