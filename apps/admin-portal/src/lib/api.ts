import { auth, type AdminProfile } from './auth'

export const API_BASE_URL = 'http://localhost:3000'

export type RestaurantStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'

export interface RestaurantListItem {
  id: string
  codeNumber: string
  nameEn: string
  nameAr: string
  phone: string
  logoUrl: string | null
  status: RestaurantStatus
  ownerEmail: string
  createdAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  province: { id: string; nameEn: string; nameAr: string } | null
  district: { id: string; nameEn: string; nameAr: string } | null
}

class UnauthorizedError extends Error {}

function authHeaders(): HeadersInit {
  const token = auth.getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    auth.clear()
    throw new UnauthorizedError('Session expired, please sign in again')
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() })
  return handle<T>(res)
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handle<T>(res)
}

export const api = {
  async login(email: string, password: string): Promise<{ accessToken: string; admin: AdminProfile }> {
    const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Invalid email or password')
    return data
  },

  restaurants: (status?: RestaurantStatus) =>
    get<RestaurantListItem[]>(`/restaurants${status ? `?status=${status}` : ''}`),
  approve: (id: string) => patch<RestaurantListItem>(`/restaurants/${id}/approve`),
  reject: (id: string, reason?: string) =>
    patch<RestaurantListItem>(`/restaurants/${id}/reject`, { reason }),
  suspend: (id: string) => patch<RestaurantListItem>(`/restaurants/${id}/suspend`),
}

export { UnauthorizedError }
