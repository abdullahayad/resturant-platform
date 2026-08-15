export const API_BASE_URL = 'http://localhost:3000';

export type RestaurantStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface RestaurantListItem {
  id: string;
  codeNumber: string;
  nameEn: string;
  nameAr: string;
  phone: string;
  logoUrl: string | null;
  status: RestaurantStatus;
  ownerEmail: string;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  province: { id: string; nameEn: string; nameAr: string } | null;
  district: { id: string; nameEn: string; nameAr: string } | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  restaurants: (status?: RestaurantStatus) =>
    get<RestaurantListItem[]>(`/restaurants${status ? `?status=${status}` : ''}`),
  approve: (id: string) => patch<RestaurantListItem>(`/restaurants/${id}/approve`),
  reject: (id: string, reason?: string) =>
    patch<RestaurantListItem>(`/restaurants/${id}/reject`, { reason }),
  suspend: (id: string) => patch<RestaurantListItem>(`/restaurants/${id}/suspend`),
};
