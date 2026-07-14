declare namespace google.maps {
  class Geocoder {
    geocode(request: GeocoderRequest): Promise<GeocoderResponse>
  }

  interface GeocoderRequest {
    address?: string
    region?: string
    componentRestrictions?: { country: string }
    location?: { lat: number; lng: number }
  }

  interface GeocoderResponse {
    results?: GeocoderResult[]
  }

  interface GeocoderResult {
    formatted_address?: string
    types?: string[]
    geometry?: {
      location?: {
        lat(): number
        lng(): number
      }
    }
  }
}
