import http from './http'

/**
 * 中央氣象署自動氣象站（後端推算最近測站）
 */

export interface CwaWeatherStation {
  stationId: string
  stationName: string
  countyName?: string
  latitude: number
  longitude: number
  distanceKm: number
}

export const findNearestCwaStation = async (
  latitude: number,
  longitude: number
): Promise<CwaWeatherStation> => {
  const data = await http.get('/management/weather/stations/nearest', {
    params: { lat: latitude, lng: longitude },
  })
  return data as unknown as CwaWeatherStation
}
