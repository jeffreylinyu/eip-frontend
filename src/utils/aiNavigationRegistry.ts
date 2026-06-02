import { ViewType } from '@/composables/useViewPerspective'

/** 與後端 AiNavigationTarget 枚舉名稱一致 */
export type AiNavigationTargetId =
  | 'BASIC_DATA'
  | 'SITE_PERSONNEL'
  | 'PROJECT_ITEM_DATABASE'
  | 'PROJECT_ITEM_DATABASE_MATERIAL_INSPECTION'
  | 'TENDER_MATERIAL_SETTINGS'
  | 'WORK_ITEMS'
  | 'O2_EXTENSION'
  | 'O3_ESTIMATE'
  | 'O1_COMMENCEMENT'
  | 'O4_LABOUR_SAFETY'

export interface AiNavigationHintDto {
  target: string
  label: string
  query?: Record<string, string> | null
}

export interface ResolvedNavigationLink {
  path: string
  query?: Record<string, string>
  label: string
}

function viewPrefix(viewType: ViewType): string {
  return viewType === ViewType.CONTRACTOR ? '/contractor' : '/supervisory'
}

/**
 * 依目前視角將後端 navigationHints 解析為可 router.push 的連結。
 */
export function resolveNavigationLink(
  hint: AiNavigationHintDto,
  viewType: ViewType,
): ResolvedNavigationLink | null {
  const target = hint.target as AiNavigationTargetId
  const prefix = viewPrefix(viewType)
  const query = hint.query ?? undefined

  switch (target) {
    case 'BASIC_DATA':
      return { path: `${prefix}/basic/basic-data`, query, label: hint.label || '基本資料' }
    case 'SITE_PERSONNEL':
      return { path: `${prefix}/basic/site-personnel`, query, label: hint.label || '工地人員' }
    case 'PROJECT_ITEM_DATABASE':
      return { path: `${prefix}/basic/project-item-database`, query, label: hint.label || '工程項目標單' }
    case 'PROJECT_ITEM_DATABASE_MATERIAL_INSPECTION':
      return {
        path: `${prefix}/basic/project-item-database`,
        query: { tab: 'materialInspection', ...query },
        label: hint.label || '材料與試驗',
      }
    case 'TENDER_MATERIAL_SETTINGS':
      return { path: '/forms/tender-material-settings', query, label: hint.label || '標單材料設定' }
    case 'WORK_ITEMS':
      return {
        path:
          viewType === ViewType.CONTRACTOR
            ? '/forms/subdivision-work-items'
            : '/forms/b-construction-maintenance',
        query,
        label: viewType === ViewType.CONTRACTOR ? '分項工程' : '施工項目',
      }
    case 'O2_EXTENSION':
      return { path: '/forms/o1-extension', query, label: hint.label || '工期展延' }
    case 'O3_ESTIMATE':
      return { path: '/forms/o3-estimate', query, label: hint.label || '工驗計價' }
    case 'O1_COMMENCEMENT':
      return { path: '/forms/o1-commencement', query, label: hint.label || '開竣停工報告' }
    case 'O4_LABOUR_SAFETY':
      return { path: '/forms/o4-labour-safety', query, label: hint.label || '職安報備書' }
    default:
      return null
  }
}

export function resolveNavigationLinks(
  hints: AiNavigationHintDto[] | undefined | null,
  viewType: ViewType,
): ResolvedNavigationLink[] {
  if (!hints?.length) return []
  const out: ResolvedNavigationLink[] = []
  const seen = new Set<string>()
  for (const hint of hints) {
    const link = resolveNavigationLink(hint, viewType)
    if (!link) continue
    const key = `${link.path}?${JSON.stringify(link.query ?? {})}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(link)
  }
  return out
}
