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
