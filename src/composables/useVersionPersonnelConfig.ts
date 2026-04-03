/**
 * 各版本人員配置狀況（級距、所需人數、目前配置、缺額、區間內缺額）
 * 供專案工地人員管理與其他頁面共用。
 */
import type { VersionContractAmount } from '@/api/designChange'
import type { DesignChangeItem } from '@/api/designChange'
import { LEGACY_OCCUPATION_MAP } from '@/api/sitePersonnelOccupations'
import { getOriginalContractIntervalISO, getDesignChangeIntervalISO } from '@/utils/designChangeIntervals'

/** 人員最小介面：需有職稱與任職紀錄；勞安時需 occupationCategory 判斷甲/乙/丙級 */
export interface PersonWithAssignments {
  memberId: string
  occupation?: string
  position?: string
  /** 職稱類別（如勞安之甲級/乙級/丙級），供營造勞安級距檢核 */
  occupationCategory?: string | null
  assignments?: {
    constructionId: string
    workStartDate?: string | null
    workEndDate?: string | null
  }[]
}

export type ConfigRoleKey = 'OWNER' | 'CONSTRUCTION_MANAGER' | 'QUALITY' | 'LABOUR_SAFETY' | 'TECHNICIAN'

/** 各版本人員配置檢核用角色順序（負責人、工地負責人、專任工程人員、品管、勞安） */
export const ALL_CONFIG_ROLE_KEYS: ConfigRoleKey[] = ['OWNER', 'CONSTRUCTION_MANAGER', 'QUALITY', 'LABOUR_SAFETY', 'TECHNICIAN']

/** 級距 key（A5～A1） */
export function getLevelKey(amount: number): string {
  if (amount < 5000000) return 'A5'
  if (amount < 10000000) return 'A4'
  if (amount < 30000000) return 'A3'
  if (amount < 100000000) return 'A2'
  return 'A1'
}

/** 級距說明文字 */
export function getLevelByBudget(amount: number): string {
  if (amount < 5000000) return 'A5 (500萬以下)'
  if (amount < 10000000) return 'A4 (500萬～1000萬)'
  if (amount < 30000000) return 'A3 (1000萬～3000萬)'
  if (amount < 100000000) return 'A2 (3000萬～1億元)'
  return 'A1 (1億元以上)'
}

const REQUIRED_PERSONNEL: Record<string, Record<ConfigRoleKey, number>> = {
  A5: { OWNER: 0, CONSTRUCTION_MANAGER: 0, QUALITY: 1, LABOUR_SAFETY: 1, TECHNICIAN: 0 },
  A4: { OWNER: 0, CONSTRUCTION_MANAGER: 0, QUALITY: 1, LABOUR_SAFETY: 1, TECHNICIAN: 0 },
  A3: { OWNER: 0, CONSTRUCTION_MANAGER: 0, QUALITY: 1, LABOUR_SAFETY: 1, TECHNICIAN: 1 },
  A2: { OWNER: 0, CONSTRUCTION_MANAGER: 0, QUALITY: 2, LABOUR_SAFETY: 1, TECHNICIAN: 1 },
  A1: { OWNER: 0, CONSTRUCTION_MANAGER: 0, QUALITY: 3, LABOUR_SAFETY: 2, TECHNICIAN: 2 }
}

/** 依契約金額級距回傳所需人數（僅品管/勞安/技師，用於建議配置表；負責人/工地負責人由各版本檢核另行加入） */
export function getRequiredPersonnelByAmount(amount: number): Record<ConfigRoleKey, number> {
  const key = getLevelKey(amount)
  const level = REQUIRED_PERSONNEL[key]
  return {
    OWNER: 0,
    CONSTRUCTION_MANAGER: 0,
    QUALITY: level.QUALITY,
    LABOUR_SAFETY: level.LABOUR_SAFETY,
    TECHNICIAN: level.TECHNICIAN
  }
}

const CONFIG_ROLE_LABELS: Record<ConfigRoleKey, string> = {
  OWNER: '負責人',
  CONSTRUCTION_MANAGER: '工地負責人',
  QUALITY: '品管',
  LABOUR_SAFETY: '勞安',
  TECHNICIAN: '專任工程人員'
}

export function getConfigRoleLabel(role: ConfigRoleKey): string {
  return CONFIG_ROLE_LABELS[role]
}

/** 勞安職稱類別對應等級（數字越大越高；營造級距檢核用） */
const LABOUR_SAFETY_CATEGORY_RANK: Record<string, number> = {
  '丁級職業營造業安全衛生業務主管': 1,
  '丙級職業營造業安全衛生業務主管': 1,
  '乙級職業營造業安全衛生業務主管': 2,
  '甲級職業營造業安全衛生業務主管': 3,
  '乙級職業營造業安全衛生管理員': 4,
  '乙級職業營造業安全衛生管理員(專職)': 4,
  '乙級職業營造業安全衛生管理員（專職）': 4,
  '甲級職業安全管理師': 5,
  '甲級職業衛生管理師': 5
}

export function getLabourSafetyRank(category: string | null | undefined): number {
  const key = (category || '').trim()
  return LABOUR_SAFETY_CATEGORY_RANK[key] ?? 0
}

/** 營造業勞安配置：各級距所需最低等級槽位（2=乙級以上, 3=甲級）；A5/A4=1乙級, A3=1甲級, A2=1甲+1乙, A1=2甲 */
function getLabourSafetySlotsByLevel(levelKey: string): number[] {
  switch (levelKey) {
    case 'A5':
    case 'A4':
      return [2] // 1 名乙級以上
    case 'A3':
      return [3] // 1 名甲級
    case 'A2':
      return [3, 2] // 1 甲級與 1 乙級
    case 'A1':
      return [3, 3] // 至少 2 名甲級
    default:
      return [2]
  }
}

/** 勞安所需級距說明（供各版本人員配置狀況顯示）；監造(FIXED)回傳空字串 */
export function getLabourSafetyRequirementText(levelKey: string): string {
  switch (levelKey) {
    case 'A5':
    case 'A4':
      return '乙級以上'
    case 'A3':
      return '甲級'
    case 'A2':
      return '1名甲級與1名乙級'
    case 'A1':
      return '至少2名甲級'
    default:
      return ''
  }
}

function toDateOnly(s: string | null | undefined): string | null {
  if (!s || typeof s !== 'string') return null
  const part = s.trim().split('T')[0]
  return part || null
}

function addOneDay(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function minusOneDay(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** 職稱對應到配置角色（負責人、工地負責人、品管、勞安、專任工程人員）；無則 null */
export function occupationToConfigRole(occupation: string | undefined): ConfigRoleKey | null {
  if (!occupation) return null
  const v = LEGACY_OCCUPATION_MAP[occupation] || occupation
  if (v === 'OWNER' || v === 'CONSTRUCTION_MANAGER' || v === 'QUALITY' || v === 'LABOUR_SAFETY' || v === 'TECHNICIAN') return v
  return null
}

/** 該員在指定專案、指定日期是否在任職區間內 */
function isCoveringDate(
  assignments: PersonWithAssignments['assignments'],
  constructionId: string,
  date: string
): boolean {
  if (!assignments?.length) return false
  for (const a of assignments) {
    if (a.constructionId !== constructionId) continue
    const start = toDateOnly(a.workStartDate)
    const end = toDateOnly(a.workEndDate)
    if (!start || start > date) continue
    if (end == null || end >= date) return true
  }
  return false
}

/** 方案 A：依「今天」計算各配置角色在專案的人數 */
export function getCurrentCountByRoleToday(
  assignedPersonnel: PersonWithAssignments[],
  constructionId: string,
  today: string
): Record<ConfigRoleKey, number> {
  const count: Record<ConfigRoleKey, number> = {
    OWNER: 0,
    CONSTRUCTION_MANAGER: 0,
    QUALITY: 0,
    LABOUR_SAFETY: 0,
    TECHNICIAN: 0
  }
  for (const p of assignedPersonnel) {
    if (!isCoveringDate(p.assignments, constructionId, today)) continue
    const role = occupationToConfigRole(p.occupation || p.position)
    if (role) count[role] += 1
  }
  return count
}

export interface VersionInterval {
  versionId: number | null
  versionName: string
  start: string | null
  end: string | null
}

/** 計算各版本的生效區間（共用同一套版本區間算法） */
export function computeVersionIntervals(
  versionAmounts: VersionContractAmount[],
  designChangeList: DesignChangeItem[],
  options: { projectStartDate?: string | null; projectEndDate?: string | null; today?: string } = {}
): VersionInterval[] {
  const result: VersionInterval[] = []
  for (const v of versionAmounts) {
    if (v.designChangeId == null) {
      const interval = getOriginalContractIntervalISO({
        signDate: options.projectStartDate ?? null,
        designChangeList,
        projectEndDate: options.projectEndDate ?? null
      })
      result.push({
        versionId: null,
        versionName: v.versionName,
        start: interval.start,
        end: interval.openEnded ? (options.today ?? new Date().toISOString().slice(0, 10)) : interval.end
      })
    } else {
      const dc = designChangeList.find((d) => d.id === v.designChangeId)
      const interval = dc
        ? getDesignChangeIntervalISO({
            item: dc,
            index: designChangeList.findIndex((x) => x.id === v.designChangeId),
            designChangeList,
            projectEndDate: options.projectEndDate ?? null
          })
        : { start: null, end: null, openEnded: false }
      result.push({
        versionId: v.designChangeId,
        versionName: v.versionName,
        start: interval.start,
        end: interval.openEnded ? (options.today ?? new Date().toISOString().slice(0, 10)) : interval.end
      })
    }
  }
  return result
}

/** 單一版本的人員配置結果 */
export interface VersionPersonnelResult {
  versionId: number | null
  versionName: string
  level: string
  levelKey: string
  required: Record<ConfigRoleKey, number>
  interval: { start: string | null; end: string | null }
  /** 區間內缺漏的角色（只要區間內任一天不足即列出） */
  missingRoles: { role: ConfigRoleKey; roleName: string; required: number }[]
  /** 區間內缺漏的時段（每個角色可多段） */
  gaps: { role: ConfigRoleKey; roleName: string; periods: { start: string; end: string }[] }[]
}

/** 在區間 [intervalStart, intervalEnd] 內，依任職紀錄計算某角色在哪些子區間人數 < required */
function computeGapsForRole(
  assignedPersonnel: PersonWithAssignments[],
  constructionId: string,
  role: ConfigRoleKey,
  required: number,
  intervalStart: string,
  intervalEnd: string
): { start: string; end: string }[] {
  if (required <= 0) return []
  const rolePeople = assignedPersonnel.filter((p) => occupationToConfigRole(p.occupation || p.position) === role)
  const rawAssignments = rolePeople.flatMap((p) =>
    (p.assignments ?? [])
      .filter((a) => a.constructionId === constructionId)
      .map((a) => ({
        start: toDateOnly(a.workStartDate),
        end: toDateOnly(a.workEndDate)
      }))
  )

  // 事件表：date -> delta（date 當天開始生效）
  const deltaByDate: Record<string, number> = {}

  for (const a of rawAssignments) {
    if (!a.start) continue
    const s = a.start < intervalStart ? intervalStart : a.start
    const e = (a.end ?? intervalEnd) > intervalEnd ? intervalEnd : (a.end ?? intervalEnd)
    if (s > intervalEnd || e < intervalStart) continue
    deltaByDate[s] = (deltaByDate[s] ?? 0) + 1
    const endNext = addOneDay(e)
    deltaByDate[endNext] = (deltaByDate[endNext] ?? 0) - 1
  }

  // 加入哨兵，確保能覆蓋整個區間並收尾
  const endPlus1 = addOneDay(intervalEnd)
  deltaByDate[intervalStart] = deltaByDate[intervalStart] ?? 0
  deltaByDate[endPlus1] = deltaByDate[endPlus1] ?? 0

  const dates = Object.keys(deltaByDate).sort()
  let count = 0
  const gaps: { start: string; end: string }[] = []

  for (let i = 0; i < dates.length - 1; i++) {
    const d = dates[i]
    // 更新當天人數
    count += deltaByDate[d] ?? 0
    const next = dates[i + 1]
    const segStart = d
    const segEnd = minusOneDay(next)
    // 只關注版本區間內的 segment
    if (segStart > intervalEnd) continue
    const s = segStart < intervalStart ? intervalStart : segStart
    const e = segEnd > intervalEnd ? intervalEnd : segEnd
    if (s > e) continue
    if (count < required) gaps.push({ start: s, end: e })
  }

  // 合併相鄰區間
  gaps.sort((a, b) => a.start.localeCompare(b.start))
  const merged: { start: string; end: string }[] = []
  for (const g of gaps) {
    const last = merged[merged.length - 1]
    if (!last) {
      merged.push({ ...g })
      continue
    }
    if (addOneDay(last.end) >= g.start) {
      if (g.end > last.end) last.end = g.end
    } else {
      merged.push({ ...g })
    }
  }
  return merged
}

/** 營造勞安：依級距所需等級槽位檢核（甲/乙/丙級），區間內任一時段無法滿足槽位即為缺漏 */
function computeGapsForLabourSafetyBySlots(
  assignedPersonnel: PersonWithAssignments[],
  constructionId: string,
  levelKey: string,
  intervalStart: string,
  intervalEnd: string
): { start: string; end: string }[] {
  const slots = getLabourSafetySlotsByLevel(levelKey)
  if (slots.length === 0) return []
  const slotsDesc = [...slots].sort((a, b) => b - a)

  const labourSafetyPeople = assignedPersonnel.filter(
    (p) => occupationToConfigRole(p.occupation || p.position) === 'LABOUR_SAFETY'
  )
  type Event = { date: string; delta: number; memberId: string; rank: number }
  const events: Event[] = []
  for (const p of labourSafetyPeople) {
    const rank = getLabourSafetyRank(p.occupationCategory)
    for (const a of p.assignments ?? []) {
      if (a.constructionId !== constructionId) continue
      const start = toDateOnly(a.workStartDate)
      if (!start) continue
      const end = (a.workEndDate ? toDateOnly(a.workEndDate) : null) ?? intervalEnd
      const s = start < intervalStart ? intervalStart : start
      const e = end > intervalEnd ? intervalEnd : end
      if (s > intervalEnd || e < intervalStart) continue
      events.push({ date: s, delta: 1, memberId: p.memberId, rank })
      events.push({ date: addOneDay(e), delta: -1, memberId: p.memberId, rank })
    }
  }
  const endPlus1 = addOneDay(intervalEnd)
  events.push({ date: intervalStart, delta: 0, memberId: '', rank: 0 })
  events.push({ date: endPlus1, delta: 0, memberId: '', rank: 0 })

  const dateOrder = [...new Set(events.map((e) => e.date))].sort()
  const activeList: { memberId: string; rank: number }[] = []

  const gaps: { start: string; end: string }[] = []
  for (let i = 0; i < dateOrder.length - 1; i++) {
    const d = dateOrder[i]
    const next = dateOrder[i + 1]
    for (const e of events) {
      if (e.date !== d) continue
      if (e.delta === 1) activeList.push({ memberId: e.memberId, rank: e.rank })
      else if (e.delta === -1) {
        const idx = activeList.findIndex((x) => x.memberId === e.memberId && x.rank === e.rank)
        if (idx >= 0) activeList.splice(idx, 1)
      }
    }
    const ranks = activeList.map((x) => x.rank).sort((a, b) => b - a)
    const satisfied =
      ranks.length >= slotsDesc.length && slotsDesc.every((slot, i) => ranks[i] >= slot)
    const segStart = d < intervalStart ? intervalStart : d
    const segEnd = minusOneDay(next) > intervalEnd ? intervalEnd : minusOneDay(next)
    if (segStart <= segEnd && !satisfied) gaps.push({ start: segStart, end: segEnd })
  }

  gaps.sort((a, b) => a.start.localeCompare(b.start))
  const merged: { start: string; end: string }[] = []
  for (const g of gaps) {
    const last = merged[merged.length - 1]
    if (!last) {
      merged.push({ ...g })
      continue
    }
    if (addOneDay(last.end) >= g.start) {
      if (g.end > last.end) last.end = g.end
    } else {
      merged.push({ ...g })
    }
  }
  return merged
}

export interface VersionPersonnelConfigInput {
  versionAmounts: VersionContractAmount[]
  designChangeList: DesignChangeItem[]
  assignedPersonnel: PersonWithAssignments[]
  constructionId: string
  projectStartDate?: string | null
  projectEndDate?: string | null
  today?: string
  /** 監造用：不依級距，每個版本固定所需人數（例：1 專任工程人員、1 品管、1 勞安） */
  fixedRequired?: Record<ConfigRoleKey, number>
}

export interface VersionPersonnelConfigResult {
  dataComplete: boolean
  versions: VersionPersonnelResult[]
}

/**
 * 計算各版本的人員配置狀況（可共用）。
 * - 依「版本生效區間」檢查任職紀錄：只要區間內任一天不足即視為缺漏。
 * - gaps 直接回傳區間內缺漏的日期區間（可多段），供 UI 顯示。
 */
export function computeVersionPersonnelConfig(input: VersionPersonnelConfigInput): VersionPersonnelConfigResult {
  const {
    versionAmounts,
    designChangeList,
    assignedPersonnel,
    constructionId,
    projectStartDate,
    projectEndDate,
    today: todayOpt,
    fixedRequired
  } = input
  const today = todayOpt ?? new Date().toISOString().slice(0, 10)

  if (!versionAmounts?.length) {
    return { dataComplete: false, versions: [] }
  }

  const intervals = computeVersionIntervals(versionAmounts, designChangeList, {
    projectStartDate,
    projectEndDate,
    today
  })

  const versions: VersionPersonnelResult[] = versionAmounts.map((v, idx) => {
    const useFixed = fixedRequired != null
    const levelKey = useFixed ? 'FIXED' : getLevelKey(v.contractAmount)
    const level = useFixed
      ? '1 名專任工程人員、1 名品管人員、1 名勞安人員'
      : getLevelByBudget(v.contractAmount)
    const levelOnly = getRequiredPersonnelByAmount(v.contractAmount) // 建議配置僅品管/勞安/技師，不含負責人/工地負責人
    const required: Record<ConfigRoleKey, number> = useFixed
      ? { ...fixedRequired }
      : {
          OWNER: 1,
          CONSTRUCTION_MANAGER: 0,
          QUALITY: levelOnly.QUALITY,
          LABOUR_SAFETY: levelOnly.LABOUR_SAFETY,
          TECHNICIAN: Math.max(1, levelOnly.TECHNICIAN) // 營造每個版本至少 1 名專任工程人員
        }
    const interval = intervals[idx]
    const hasInterval = !!(interval?.start && interval?.end)
    const rolesToCheck = ALL_CONFIG_ROLE_KEYS

    const gaps: VersionPersonnelResult['gaps'] = []
    if (hasInterval) {
      for (const role of rolesToCheck) {
        const req = required[role] ?? 0
        if (req <= 0) continue
        const periods =
          role === 'LABOUR_SAFETY' && !useFixed
            ? computeGapsForLabourSafetyBySlots(
                assignedPersonnel,
                constructionId,
                levelKey,
                interval.start!,
                interval.end!
              )
            : computeGapsForRole(assignedPersonnel, constructionId, role, req, interval.start!, interval.end!)
        if (periods.length > 0) gaps.push({ role, roleName: getConfigRoleLabel(role), periods })
      }
    }
    const missingRoles: VersionPersonnelResult['missingRoles'] = gaps.map(g => ({
      role: g.role,
      roleName: g.roleName,
      required: required[g.role]
    }))

    return {
      versionId: v.designChangeId,
      versionName: v.versionName,
      level,
      levelKey,
      required,
      interval: { start: interval?.start ?? null, end: interval?.end ?? null },
      missingRoles,
      gaps
    }
  })

  // 只要任一版本缺少必要區間資料就視為不完整（依需求：資料不完整無法提供）
  const dataComplete = versions.every(v => !!(v.interval.start && v.interval.end))
  return { dataComplete, versions }
}
