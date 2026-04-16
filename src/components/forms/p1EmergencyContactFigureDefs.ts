/** 圖10.2 五組固定 id（與後端 fig102Rows 驗證一致） */
export type P1EmergencyContactRowId =
  | 'medical_team'
  | 'fire_team'
  | 'engineering_team'
  | 'security_team'
  | 'coordinator'

export type P1Fig102RowDef = {
  id: P1EmergencyContactRowId
  defaultTitle: string
  defaultDuty: string
  defaultContacts: string
}

export const P1_FIG102_ROW_DEFS: P1Fig102RowDef[] = [
  {
    id: 'medical_team',
    defaultTitle: '醫療組',
    defaultDuty: '（搶救傷患、後送）',
    defaultContacts:
      'XXX縣政府衛生局XXX衛生所 XXX衛生室 (03-xxxx)\nXXX醫院 (03-xxxx)\nXXX醫院 (03-xxxx)'
  },
  {
    id: 'fire_team',
    defaultTitle: '消防組',
    defaultDuty: '（災害搶救）',
    defaultContacts: 'XXX縣政府消防局XXX大隊 XXX救護站 (03-xxxx)'
  },
  {
    id: 'engineering_team',
    defaultTitle: '工程組',
    defaultDuty: '（災害搶救）',
    defaultContacts:
      'XXX公司XXX營運處 (03-xxxx)\nXXX公司XXX管理處 (03-xxxx)\nXXX公司XXX營運處 (03-xxxx)'
  },
  {
    id: 'security_team',
    defaultTitle: '警衛組',
    defaultDuty: '（警戒、交通指揮）',
    defaultContacts: 'XXX縣警察局XXX分局 (03-xxxx)\nXXX縣警察局XXX派出所 (03-xxxx)'
  },
  {
    id: 'coordinator',
    defaultTitle: '協調人',
    defaultDuty: '（災害搶救）',
    defaultContacts: '勞動部XXX職安中心 (02-xxxx)'
  }
]

/** 圖10.3 上排六格（左→右），地名／專有名稱預設以 XXX 表示，使用者可改 */
export const P1_FIG103_TOP_LABEL_DEFAULTS: [
  string,
  string,
  string,
  string,
  string,
  string
] = [
  '保險公司',
  '勞動部XXX職安中心',
  'XXX縣警察局XXX派出所',
  '公路總局XXX養護工程處XXX工務段',
  'XXX縣政府',
  '緊急救援\n相關單位'
]

export type P1Fig102Row = {
  id: P1EmergencyContactRowId
  title: string
  duty: string
  contacts: string
}

export type P1EmergencyContactBundle = {
  version: 2
  fig102Rows: P1Fig102Row[]
  /** 圖10.3 上排六格文字（左→右） */
  fig103TopLabels: [string, string, string, string, string, string]
}

function rowDefById(id: P1EmergencyContactRowId): P1Fig102RowDef {
  const d = P1_FIG102_ROW_DEFS.find((x) => x.id === id)
  if (!d) throw new Error(`unknown p1 fig102 id: ${id}`)
  return d
}

export function defaultP1EmergencyContactBundle(): P1EmergencyContactBundle {
  return {
    version: 2,
    fig102Rows: P1_FIG102_ROW_DEFS.map((d) => ({
      id: d.id,
      title: d.defaultTitle,
      duty: d.defaultDuty,
      contacts: d.defaultContacts
    })),
    fig103TopLabels: [...P1_FIG103_TOP_LABEL_DEFAULTS]
  }
}

const LEGACY_IDS = new Set([
  'highway_maintenance',
  'labor_osha',
  'epa',
  'police_branch',
  'police_station',
  'fire_station',
  'health_clinic',
  'hospital_a',
  'hospital_b',
  'taipower',
  'water',
  'telecom',
  'county_government'
])

function migrateV1Rows(
  rows: { id?: string; title?: string; text?: string; duty?: string; contacts?: string }[]
): P1Fig102Row[] {
  const byId = new Map<string, { title: string; duty: string; contacts: string }>()
  for (const r of rows) {
    if (!r?.id) continue
    const id = String(r.id)
    const title = typeof r.title === 'string' ? r.title : ''
    const duty =
      typeof r.duty === 'string'
        ? r.duty
        : typeof r.text === 'string'
          ? r.text
          : ''
    const contacts = typeof r.contacts === 'string' ? r.contacts : ''
    byId.set(id, { title, duty, contacts })
  }
  return P1_FIG102_ROW_DEFS.map((def) => {
    const s = byId.get(def.id)
    if (!s) {
      return {
        id: def.id,
        title: def.defaultTitle,
        duty: def.defaultDuty,
        contacts: def.defaultContacts
      }
    }
    return {
      id: def.id,
      title: s.title.trim() ? s.title : def.defaultTitle,
      duty: s.duty,
      contacts: s.contacts
    }
  })
}

function parseFig103TopLabels(
  root: {
    fig103TopLabels?: string[]
    fig103FlowRedLabels?: string[]
  },
  base: P1EmergencyContactBundle
): [string, string, string, string, string, string] {
  const d = P1_FIG103_TOP_LABEL_DEFAULTS
  if (Array.isArray(root.fig103TopLabels) && root.fig103TopLabels.length >= 6) {
    return [
      typeof root.fig103TopLabels[0] === 'string' ? root.fig103TopLabels[0] : d[0],
      typeof root.fig103TopLabels[1] === 'string' ? root.fig103TopLabels[1] : d[1],
      typeof root.fig103TopLabels[2] === 'string' ? root.fig103TopLabels[2] : d[2],
      typeof root.fig103TopLabels[3] === 'string' ? root.fig103TopLabels[3] : d[3],
      typeof root.fig103TopLabels[4] === 'string' ? root.fig103TopLabels[4] : d[4],
      typeof root.fig103TopLabels[5] === 'string' ? root.fig103TopLabels[5] : d[5]
    ]
  }
  const flow = Array.isArray(root.fig103FlowRedLabels) ? root.fig103FlowRedLabels : []
  if (flow.length >= 4) {
    return [
      d[0],
      typeof flow[0] === 'string' ? flow[0] : d[1],
      typeof flow[1] === 'string' ? flow[1] : d[2],
      typeof flow[2] === 'string' ? flow[2] : d[3],
      typeof flow[3] === 'string' ? flow[3] : d[4],
      d[5]
    ]
  }
  return [...base.fig103TopLabels]
}

export function parseP1EmergencyContactBundle(json: string | null | undefined): P1EmergencyContactBundle {
  const base = defaultP1EmergencyContactBundle()
  if (!json || !String(json).trim()) return base
  try {
    const root = JSON.parse(json) as {
      version?: number
      fig102Rows?: { id?: string; title?: string; duty?: string; contacts?: string; text?: string }[]
      fig103TopLabels?: string[]
      fig103FlowRedLabels?: string[]
      fig103TableRows?: { text?: string }[]
      rows?: { id?: string; title?: string; text?: string; duty?: string; contacts?: string }[]
    }

    if (Array.isArray(root.fig102Rows) && root.fig102Rows.length > 0) {
      const fig102Rows = migrateV1Rows(root.fig102Rows)
      const fig103TopLabels = parseFig103TopLabels(root, base)
      return { version: 2, fig102Rows, fig103TopLabels }
    }

    if (Array.isArray(root.rows) && root.rows.length > 0) {
      const hasLegacy = root.rows.some((r) => r?.id && LEGACY_IDS.has(String(r.id)))
      if (hasLegacy) return base
      const fig102Rows = migrateV1Rows(root.rows)
      return {
        version: 2,
        fig102Rows,
        fig103TopLabels: parseFig103TopLabels(root, base)
      }
    }

    return base
  } catch {
    return base
  }
}

export function stringifyP1EmergencyContactBundle(bundle: P1EmergencyContactBundle | null): string {
  const b = bundle ?? defaultP1EmergencyContactBundle()
  return JSON.stringify({
    version: 2,
    fig102Rows: b.fig102Rows.map((r) => ({
      id: r.id,
      title: r.title ?? '',
      duty: r.duty ?? '',
      contacts: r.contacts ?? ''
    })),
    fig103TopLabels: [...b.fig103TopLabels]
  })
}

/** 預覽用：欄位空白時回退預設 */
export function displayFig102Title(id: P1EmergencyContactRowId, title: string): string {
  const t = title.trim()
  if (t) return t
  return rowDefById(id).defaultTitle
}

export function displayFig102Duty(id: P1EmergencyContactRowId, duty: string): string {
  const t = duty.trim()
  if (t) return t
  return rowDefById(id).defaultDuty
}

export function displayFig102Contacts(id: P1EmergencyContactRowId, contacts: string): string {
  const t = contacts.trim()
  if (t) return t
  return rowDefById(id).defaultContacts
}

/** 圖10.3 上排第 idx 格（0-based） */
export function displayFig103TopLabel(labels: string[] | undefined, idx: number): string {
  const d = P1_FIG103_TOP_LABEL_DEFAULTS
  const t = (labels?.[idx] ?? '').trim()
  if (t) return t
  return d[idx] ?? ''
}

/** 圖10.3「相關單位電話及傳真」：與圖10.2 同列組別＋聯絡欄（僅預覽／匯出用，不另存 JSON） */
export function displayFig103PhoneCellFromFig102Row(row: P1Fig102Row): string {
  const title = displayFig102Title(row.id, row.title)
  const contacts = displayFig102Contacts(row.id, row.contacts).trim()
  if (!contacts) return `${title}\n（未填）`
  return `${title}\n${contacts}`
}
