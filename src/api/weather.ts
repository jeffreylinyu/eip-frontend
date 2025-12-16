/**
 * 中央氣象局天氣 API
 */

// 天氣元素
export interface WeatherTimeSlot {
  startTime: string
  endTime: string
  parameter: {
    parameterName: string
    parameterValue?: string
  }
}

// 天氣元素
export interface WeatherElement {
  elementName: string
  time: WeatherTimeSlot[]
}

// 氣象局 API 回應 - 地點資料
export interface CWALocation {
  locationName: string
  weatherElement: WeatherElement[]
}

// 氣象局 API 回應
export interface CWAResponse {
  records: {
    location: CWALocation[]
  }
}

// Dashboard 天氣資訊
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

/**
 * 基礎 API 調用方法
 * @param locationName 地點名稱
 * @param elementName 要查詢的元素（例如：'Wx,PoP,MinT,MaxT,CI'）
 * @returns API 回應資料
 */
const fetchCWAData = async (locationName: string, elementName: string): Promise<CWALocation> => {
  const apiToken = (import.meta.env.VITE_CWA_API_TOKEN as string | undefined) || ''

  if (!apiToken) {
    throw new Error('尚未設定中央氣象局 API Token，請確認 .env 檔案中的 VITE_CWA_API_TOKEN。')
  }

  const endpoint = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001'
  const url = new URL(endpoint)
  url.searchParams.set('Authorization', apiToken.trim())
  url.searchParams.set('format', 'JSON')
  url.searchParams.set('locationName', locationName)
  url.searchParams.set('elementName', elementName)

  const response = await fetch(url.toString(), {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`氣象資料取得失敗：(${response.status}) ${response.statusText}`)
  }

  const data: CWAResponse = await response.json()

  if (!data?.records?.location?.length) {
    throw new Error('無法取得指定地區的氣象資料')
  }

  return data.records.location[0]
}

/**
 * 從中央氣象局 API 查詢完整天氣資訊（用於 Dashboard）
 * @param locationName 地點名稱（例如：'臺北市'）
 * @returns 完整天氣資訊
 */
export const fetchWeatherInfoFromCWA = async (locationName: string): Promise<WeatherInfo> => {
  const location = await fetchCWAData(locationName, 'Wx,PoP,MinT,MaxT,CI')
  const getElement = (name: string) =>
    location.weatherElement.find((element) => element.elementName === name)?.time?.[0] ?? null

  const wx = getElement('Wx')
  const pop = getElement('PoP')
  const minT = getElement('MinT')
  const maxT = getElement('MaxT')
  const ci = getElement('CI')

  return {
    locationName: location.locationName,
    description: wx?.parameter?.parameterName ?? '',
    code: wx?.parameter?.parameterValue ?? '',
    rainfallProbability: pop?.parameter?.parameterName ? Number(pop.parameter.parameterName) : null,
    minTemp: minT?.parameter?.parameterName ? Number(minT.parameter.parameterName) : null,
    maxTemp: maxT?.parameter?.parameterName ? Number(maxT.parameter.parameterName) : null,
    comfort: ci?.parameter?.parameterName ?? '',
    startTime: wx?.startTime ?? '',
    endTime: wx?.endTime ?? '',
  }
}

// 天氣 API 服務
export const weatherApi = {
  /**
   * 從中央氣象局查詢完整天氣資訊（用於 Dashboard）
   * @param locationName 地點名稱
   * @returns 完整天氣資訊
   */
  fetchWeatherInfo: fetchWeatherInfoFromCWA,
}
