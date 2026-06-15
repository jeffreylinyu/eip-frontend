import { PccesItemType } from '@/api/pcces'

const TYPE_ICON_MAP: Record<string, string> = {
  [PccesItemType.MAIN_ITEM]: 'fa fa-folder text-primary',
  [PccesItemType.LABOUR]: 'fa fa-users text-info',
  [PccesItemType.EQUIPMENT]: 'fa fa-cog text-warning',
  [PccesItemType.MATERIAL]: 'fa fa-cube text-success',
  [PccesItemType.MISC]: 'fa fa-archive text-secondary',
  [PccesItemType.WORK_ITEM]: 'fa fa-hammer text-danger',
  [PccesItemType.TEST_ITEM]: 'fa fa-flask text-purple'
}

const TYPE_LABEL_MAP: Record<string, string> = {
  [PccesItemType.MAIN_ITEM]: '大項',
  [PccesItemType.LABOUR]: '人工',
  [PccesItemType.EQUIPMENT]: '機具',
  [PccesItemType.MATERIAL]: '材料',
  [PccesItemType.MISC]: '雜項',
  [PccesItemType.WORK_ITEM]: '工項',
  [PccesItemType.TEST_ITEM]: '試驗項'
}

export function getPccesTypeIcon(type: string | null | undefined): string {
  if (!type) return ''
  return TYPE_ICON_MAP[type] || ''
}

export function getPccesTypeLabel(type: string | null | undefined): string {
  if (!type) return ''
  return TYPE_LABEL_MAP[type] || ''
}
