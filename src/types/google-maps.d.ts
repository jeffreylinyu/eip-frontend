declare namespace google.maps {
  class Geocoder {
    geocode(request: GeocoderRequest): Promise<GeocoderResponse>
  }

  interface GeocoderRequest {
    address?: string
    region?: string
    componentRestrictions?: { country: string }
  }

  interface GeocoderResponse {
    results?: GeocoderResult[]
  }

  interface GeocoderResult {
    formatted_address?: string
    geometry?: {
      location?: {
        lat(): number
        lng(): number
      }
    }
  }
}
