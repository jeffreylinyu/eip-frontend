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
    formattedAddress: result.formatted_address,
  }
}
