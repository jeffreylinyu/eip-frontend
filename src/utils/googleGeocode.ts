import { Loader } from '@googlemaps/js-api-loader'

export interface GeocodedLocation {
  latitude: number
  longitude: number
  formattedAddress?: string
}

const loaderCache = new Map<string, Loader>()

function getLoader(apiKey: string): Loader {
  const cached = loaderCache.get(apiKey)
  if (cached) return cached

  const loader = new Loader({
    apiKey,
    version: 'weekly',
    language: 'zh-TW',
    region: 'TW',
    libraries: ['geocoding'],
  })
  loaderCache.set(apiKey, loader)
  return loader
}

/** 將 Google 回傳的完整地址整理為台灣常用格式（去除郵遞區號與國名前綴） */
export function normalizeTaiwanAddress(formattedAddress: string): string {
  return formattedAddress
    .replace(/^\d{3,6}\s*/, '')
    .replace(/^(台灣|臺灣)\s*/, '')
    .trim()
}

export async function geocodeTaiwanAddress(
  address: string,
  apiKey: string
): Promise<GeocodedLocation | null> {
  const trimmed = address.trim()
  if (!trimmed || !apiKey.trim()) return null

  const loader = getLoader(apiKey.trim())
  await loader.load()

  const geocoder = new google.maps.Geocoder()
  const response = await geocoder.geocode({
    address: trimmed,
    region: 'TW',
    componentRestrictions: { country: 'TW' },
  })

  const result = response.results?.[0]
  const location = result?.geometry?.location
  if (!result || !location) return null

  return {
    latitude: location.lat(),
    longitude: location.lng(),
    formattedAddress: result.formatted_address
      ? normalizeTaiwanAddress(result.formatted_address)
      : undefined,
  }
}

/** 依座標反查地址（拖曳圖釘後回填地址用） */
export async function reverseGeocodeTaiwanLatLng(
  lat: number,
  lng: number,
  apiKey: string
): Promise<GeocodedLocation | null> {
  if (!apiKey.trim()) return null

  const loader = getLoader(apiKey.trim())
  await loader.load()

  const geocoder = new google.maps.Geocoder()
  const response = await geocoder.geocode({ location: { lat, lng } })

  // 優先取有門牌（street_address / premise）的結果，退而求其次取第一筆
  const results = response.results ?? []
  const preferred =
    results.find((r) =>
      r.types?.some((t) => t === 'street_address' || t === 'premise' || t === 'subpremise' || t === 'route')
    ) ?? results[0]
  if (!preferred?.formatted_address) return null

  return {
    latitude: lat,
    longitude: lng,
    formattedAddress: normalizeTaiwanAddress(preferred.formatted_address),
  }
}
