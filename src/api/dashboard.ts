import http from './http'

export interface DashboardProgressTrendPoint {
  date: string
  plannedProgress: number | null
  actualProgress: number | null
  budgetUsage: number | null
  hasDailyReport: boolean
}

export interface DashboardProgressTrendResponse {
  sourceOwnerType: 'CONTRACTOR'
  fromDate: string | null
  toDate: string | null
  hasPlanData: boolean
  hasDailyReportData: boolean
  hasEstimateData: boolean
  hasBudgetBaselineData: boolean
  points: DashboardProgressTrendPoint[]
}

export interface DashboardEnvironmentResponse {
  weather: {
    available: boolean
    stationId: string | null
    stationName: string | null
    observedAt: string | null
    temperatureCelsius: number | null
    relativeHumidityPercent: number | null
    windSpeedMs: number | null
    windDirectionDegrees: number | null
    message: string | null
  }
  airQuality: {
    available: boolean
    stationId: string | null
    stationName: string | null
    observedAt: string | null
    pm25: number | null
    message: string | null
  }
  noise: {
    available: boolean
    decibels: number | null
    message: string
  }
}

export async function getDashboardProgressTrend(
  constructionId: string,
): Promise<DashboardProgressTrendResponse> {
  return await http.get('/management/dashboard/progress-trend', {
    params: { constructionId },
  }) as unknown as DashboardProgressTrendResponse
}

export async function getDashboardEnvironment(
  constructionId: string,
): Promise<DashboardEnvironmentResponse> {
  return await http.get('/management/dashboard/environment', {
    params: { constructionId },
  }) as unknown as DashboardEnvironmentResponse
}
