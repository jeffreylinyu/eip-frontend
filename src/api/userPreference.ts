import http from '@/api/http'

export type DailyReportExecutionExportMode = 'ITEM_ROWS' | 'HEADER_ROWS'

export interface DailyReportExportPreferences {
  executionExportMode: DailyReportExecutionExportMode
  executionAttachItemDetails: boolean
}

export const DEFAULT_DAILY_REPORT_EXPORT_PREFERENCES: DailyReportExportPreferences = {
  executionExportMode: 'ITEM_ROWS',
  executionAttachItemDetails: false
}

export async function getDailyReportExportPreferences(): Promise<DailyReportExportPreferences> {
  const data = await http.get<DailyReportExportPreferences>(
    '/management/user/preferences/daily-report-export'
  )
  const merged = {
    ...DEFAULT_DAILY_REPORT_EXPORT_PREFERENCES,
    ...(data ?? {})
  }
  if (merged.executionExportMode === 'ITEM_ROWS') {
    merged.executionAttachItemDetails = false
  }
  return merged
}

export async function saveDailyReportExportPreferences(
  preferences: DailyReportExportPreferences
): Promise<DailyReportExportPreferences> {
  const payload: DailyReportExportPreferences = {
    ...preferences,
    executionAttachItemDetails:
      preferences.executionExportMode === 'HEADER_ROWS'
        ? preferences.executionAttachItemDetails
        : false
  }
  const data = (await http.put(
    '/management/user/preferences/daily-report-export',
    payload
  )) as DailyReportExportPreferences
  return {
    ...DEFAULT_DAILY_REPORT_EXPORT_PREFERENCES,
    ...data,
    executionAttachItemDetails:
      data.executionExportMode === 'HEADER_ROWS'
        ? data.executionAttachItemDetails
        : false
  }
}

export interface SelfCheckInspectionSignPreferences {
  autoFillInspectorOnSign: boolean
}

export const DEFAULT_SELF_CHECK_INSPECTION_SIGN_PREFERENCES: SelfCheckInspectionSignPreferences =
  {
    autoFillInspectorOnSign: true
  }

export async function getSelfCheckInspectionSignPreferences(): Promise<SelfCheckInspectionSignPreferences> {
  const data = await http.get<SelfCheckInspectionSignPreferences>(
    '/management/user/preferences/self-check-inspection-sign'
  )
  return {
    ...DEFAULT_SELF_CHECK_INSPECTION_SIGN_PREFERENCES,
    ...(data ?? {})
  }
}

export async function saveSelfCheckInspectionSignPreferences(
  preferences: SelfCheckInspectionSignPreferences
): Promise<SelfCheckInspectionSignPreferences> {
  const data = (await http.put(
    '/management/user/preferences/self-check-inspection-sign',
    preferences
  )) as SelfCheckInspectionSignPreferences
  return {
    ...DEFAULT_SELF_CHECK_INSPECTION_SIGN_PREFERENCES,
    ...data
  }
}
