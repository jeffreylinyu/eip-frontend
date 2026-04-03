/**
 * 工地人員職稱（父項）與類別（子項）
 * 監造單位與營造單位選項不同：營造多「工地負責人」及其子項
 */

export interface OccupationCategoryOption {
  value: string
  label: string
}

export interface OccupationOption {
  value: string
  label: string
  color: string
  icon: string
  /** 有子項時顯示類別下拉選單 */
  categories?: OccupationCategoryOption[]
}

/** 勞安人員 - 子項類別（監造、營造共用），value 與後端儲存一致 */
const LABOUR_SAFETY_CATEGORIES: OccupationCategoryOption[] = [
  { value: '甲級職業安全管理師', label: '甲級職業安全管理師' },
  { value: '甲級職業衛生管理師', label: '甲級職業衛生管理師' },
  { value: '乙級職業營造業安全衛生管理員', label: '乙級職業營造業安全衛生管理員' },
  { value: '甲級職業營造業安全衛生業務主管', label: '甲級職業營造業安全衛生業務主管' },
  { value: '乙級職業營造業安全衛生業務主管', label: '乙級職業營造業安全衛生業務主管' },
  { value: '丙級職業營造業安全衛生業務主管', label: '丙級職業營造業安全衛生業務主管' },
  { value: '丁級職業營造業安全衛生業務主管', label: '丁級職業營造業安全衛生業務主管' },
  { value: '特殊作業', label: '特殊作業' },
  { value: '營造作業主管', label: '營造作業主管' }
]

/** 專任工程人員 - 子項類別（監造、營造共用） */
const TECHNICIAN_CATEGORIES: OccupationCategoryOption[] = [
  { value: '土木技師', label: '土木技師' },
  { value: '水利技師', label: '水利技師' },
  { value: '測量技師', label: '測量技師' },
  { value: '環工技師', label: '環工技師' },
  { value: '結構技師', label: '結構技師' },
  { value: '大地技師', label: '大地技師' },
  { value: '水土保持技師', label: '水土保持技師' },
  { value: '建築師', label: '建築師' }
]

/** 品管 - 子項類別（監造、營造共用） */
const QUALITY_CATEGORIES: OccupationCategoryOption[] = [
  { value: '土建品管', label: '土建品管' },
  { value: '機電品管', label: '機電品管' }
]

/** 工地負責人 - 子項類別（僅營造） */
const CONSTRUCTION_MANAGER_CATEGORIES: OccupationCategoryOption[] = [
  { value: '工地主任', label: '工地主任' },
  { value: '古蹟修復工地主任', label: '古蹟修復工地主任' }
]

/** 監造單位 - 工地人員職稱選項（無「工地負責人」） */
export const SUPERVISION_OCCUPATION_OPTIONS: OccupationOption[] = [
  { value: 'OWNER', label: '負責人', color: 'primary', icon: 'fa-user-tie' },
  { value: 'LABOUR_SAFETY', label: '勞安人員', color: 'danger', icon: 'fa-shield-alt', categories: LABOUR_SAFETY_CATEGORIES },
  { value: 'TECHNICIAN', label: '專任工程人員', color: 'info', icon: 'fa-user-graduate', categories: TECHNICIAN_CATEGORIES },
  { value: 'QUALITY', label: '公共工程品質管理人員', color: 'warning', icon: 'fa-check-circle', categories: QUALITY_CATEGORIES },
  { value: 'ADMIN_STAFF', label: '行政人員', color: 'success', icon: 'fa-user' },
  { value: 'SITE_ENGINEER', label: '現場工程師', color: 'secondary', icon: 'fa-user-gear' }
]

/** 營造單位 - 工地人員職稱選項（含「工地負責人」） */
export const CONTRACTOR_OCCUPATION_OPTIONS: OccupationOption[] = [
  { value: 'OWNER', label: '負責人', color: 'primary', icon: 'fa-user-tie' },
  { value: 'LABOUR_SAFETY', label: '勞安人員', color: 'danger', icon: 'fa-shield-alt', categories: LABOUR_SAFETY_CATEGORIES },
  { value: 'TECHNICIAN', label: '專任工程人員', color: 'info', icon: 'fa-user-graduate', categories: TECHNICIAN_CATEGORIES },
  { value: 'CONSTRUCTION_MANAGER', label: '工地負責人', color: 'primary', icon: 'fa-hard-hat', categories: CONSTRUCTION_MANAGER_CATEGORIES },
  { value: 'QUALITY', label: '公共工程品質管理人員', color: 'warning', icon: 'fa-check-circle', categories: QUALITY_CATEGORIES },
  { value: 'ADMIN_STAFF', label: '行政人員', color: 'success', icon: 'fa-user' },
  { value: 'SITE_ENGINEER', label: '現場工程師', color: 'secondary', icon: 'fa-user-gear' },
  { value: 'SITE_CONSTRUCTION_WORKER', label: '現場施工人員', color: 'secondary', icon: 'fa-people-carry' }
]

/** 依公司類型取得職稱選項 */
export function getOccupationOptions(companyType: 'CONTRACTOR' | 'SUPERVISION' | string): OccupationOption[] {
  return companyType === 'SUPERVISION' ? SUPERVISION_OCCUPATION_OPTIONS : CONTRACTOR_OCCUPATION_OPTIONS
}

/** 舊職位代碼對應到新職稱（向後兼容） */
export const LEGACY_OCCUPATION_MAP: Record<string, string> = {
  QUALITY_CONTROL: 'QUALITY',
  SAFETY_OFFICER: 'LABOUR_SAFETY',
  PROFESSIONAL_ENGINEER: 'TECHNICIAN',
  ARCHITECT: 'TECHNICIAN' // 建築師併入專任工程人員
}

/** 職稱選項扁平列表（用於過濾等，預設營造） */
export const POSITION_OPTIONS_FLAT = CONTRACTOR_OCCUPATION_OPTIONS.map(o => ({
  value: o.value,
  label: o.label,
  color: o.color,
  icon: o.icon
}))

/** 取得職稱的顯示名稱（含類別） */
export function getOccupationDisplayLabel(occupation: string | undefined, occupationCategory: string | undefined, options: OccupationOption[]): string {
  if (!occupation) return '未設定'
  if (occupation === 'SITE_WORKER') return '現場人員'
  const opt = options.find(o => o.value === occupation) || options.find(o => LEGACY_OCCUPATION_MAP[occupation] === o.value)
  const title = opt?.label ?? occupation
  if (occupationCategory && opt?.categories?.length) {
    const cat = opt.categories.find(c => c.value === occupationCategory)
    if (cat) return `${title} - ${cat.label}`
  }
  return title
}

/** 將舊職位代碼或任意職稱統一為標準 value（供排序、比對用） */
export function normalizeOccupationValue(v: string | undefined): string {
  if (!v) return ''
  return LEGACY_OCCUPATION_MAP[v] || v
}

/** 職位大小排序順序（數字越小越前面）：負責人 > 工地負責人 > 專任工程人員 > 勞安 > 品管 > 行政 > 現場類 */
export const OCCUPATION_ORDER: Record<string, number> = {
  OWNER: 0,
  CONSTRUCTION_MANAGER: 1,
  TECHNICIAN: 2,
  LABOUR_SAFETY: 3,
  QUALITY: 4,
  ADMIN_STAFF: 5,
  SITE_ENGINEER: 6,
  SITE_CONSTRUCTION_WORKER: 7,
  SITE_WORKER: 6
}

/** 依職位順序排序人員列表（同職位再依姓名），可與 /basic/site-personnel 共用 */
export function sortPersonnelByOccupation<T extends { occupation?: string; position?: string; fullName?: string }>(list: T[]): T[] {
  const arr = [...list]
  arr.sort((a, b) => {
    const ao = normalizeOccupationValue(a.occupation || a.position)
    const bo = normalizeOccupationValue(b.occupation || b.position)
    const ai = OCCUPATION_ORDER[ao] ?? 999
    const bi = OCCUPATION_ORDER[bo] ?? 999
    if (ai !== bi) return ai - bi
    return (a.fullName || '').localeCompare(b.fullName || '', 'zh-Hant')
  })
  return arr
}
