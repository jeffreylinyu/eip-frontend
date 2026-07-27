import http from '@/api/http'

export interface WebsiteDemoBookingListItem {
  id: number
  contactName: string
  organization: string
  email: string
  phone: string | null
  preferredContactTime: string | null
  message: string | null
  clientIp: string | null
  createdAt: string
}

export interface WebsiteDemoBookingPage {
  content: WebsiteDemoBookingListItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export async function listWebsiteDemoBookings(
  page = 0,
  size = 20
): Promise<WebsiteDemoBookingPage> {
  const data = (await http.get('/management/admin/website/demo-bookings', {
    params: { page, size },
  })) as unknown as WebsiteDemoBookingPage
  if (data && Array.isArray(data.content)) {
    return data
  }
  return {
    content: [],
    page: 0,
    size,
    totalElements: 0,
    totalPages: 0,
  }
}
