import http from './http'

export interface WeatherInfo {
  locationName: string
  description: string
  code: string
  rainfallProbability: number | null
  minTemp: number | null
  maxTemp: number | null
  comfort: string
  startTime: string
  endTime: string
}

/** Fetches weather through the authenticated backend so the CWA token stays server-side. */
export const fetchWeatherInfoFromCWA = async (locationName: string): Promise<WeatherInfo> => {
  return http.get('/management/weather/forecast', { params: { locationName } })
}

export const weatherApi = {
  fetchWeatherInfo: fetchWeatherInfoFromCWA,
}
