export const API_BASE_URL = 'http://localhost:3000';

export interface MasterDataItem {
  id: string;
  nameEn: string;
  nameAr: string;
}

export interface District extends MasterDataItem {}

export interface Province extends MasterDataItem {
  districts: District[];
}

export interface RegisterRestaurantPayload {
  nameEn: string;
  nameAr: string;
  phone: string;
  ownerEmail: string;
  ownerPassword: string;
  provinceId?: string;
  districtId?: string;
  businessTypeIds: string[];
  foodCategoryIds: string[];
}

export type RestaurantStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface AuthenticatedRestaurant {
  id: string;
  codeNumber: string;
  nameEn: string;
  nameAr: string;
  status: RestaurantStatus;
  rejectionReason: string | null;
}

export interface PartnerLoginResult {
  accessToken: string;
  restaurant: AuthenticatedRestaurant;
}

export interface RestaurantDetail extends AuthenticatedRestaurant {
  phone: string;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  province: MasterDataItem | null;
  district: MasterDataItem | null;
  businessTypes: { businessType: MasterDataItem }[];
  foodCategories: { foodCategory: MasterDataItem }[];
  facilities: { facility: MasterDataItem }[];
}

export interface UpdateRestaurantProfilePayload {
  nameEn?: string;
  nameAr?: string;
  phone?: string;
  provinceId?: string;
  districtId?: string;
  latitude?: number;
  longitude?: number;
  businessTypeIds?: string[];
  foodCategoryIds?: string[];
  facilityIds?: string[];
}

export interface Story {
  id: string;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  caption: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface Dish {
  id: string;
  nameEn: string;
  nameAr: string;
  price: string;
  photoUrl: string | null;
  isMostOrdered: boolean;
  menuCategory: MasterDataItem | null;
}

export interface DishPayload {
  nameEn: string;
  nameAr: string;
  price: number;
  menuCategoryId?: string;
  photoUrl?: string;
  isMostOrdered?: boolean;
}

export type GalleryAlbum = 'FOOD' | 'MENU' | 'AMBIENCE';
export type AmbienceSubCategory = 'OUTDOOR' | 'INDOOR' | 'OTHER';

export interface GalleryPhoto {
  id: string;
  album: GalleryAlbum;
  url: string;
  caption: string | null;
  ambienceSubCategory: AmbienceSubCategory | null;
  dish: { id: string; nameEn: string; isMostOrdered: boolean; menuCategory: MasterDataItem | null } | null;
}

export interface CreateGalleryPhotoPayload {
  album: GalleryAlbum;
  url: string;
  caption?: string;
  dishId?: string;
  ambienceSubCategory?: AmbienceSubCategory;
}

export interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  text: string | null;
  createdAt: string;
  moderationStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN';
  reply: { id: string; text: string; createdAt: string } | null;
}

export interface ReviewCategoryScore {
  key: string;
  labelEn: string;
  labelAr: string;
  average: number | null;
  trend: number | null;
}

export interface ReviewSummary {
  totalCount: number;
  overallAverage: number;
  positiveSentimentPct: number;
  distribution: { star: number; count: number; pct: number }[];
  categoryScores: ReviewCategoryScore[];
}

async function get<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function send<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `${method} ${path} failed`);
  return data;
}

export const api = {
  businessTypes: () => get<MasterDataItem[]>('/master-data/business-types'),
  foodCategories: () => get<MasterDataItem[]>('/master-data/food-categories'),
  facilities: () => get<MasterDataItem[]>('/master-data/facilities'),
  provinces: () => get<Province[]>('/master-data/provinces'),

  async registerRestaurant(payload: RegisterRestaurantPayload) {
    const res = await fetch(`${API_BASE_URL}/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      throw new Error(message || 'Registration failed');
    }
    return data;
  },

  async login(email: string, password: string): Promise<PartnerLoginResult> {
    const res = await fetch(`${API_BASE_URL}/auth/partner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid email or password');
    return data;
  },

  me: (token: string) => get<RestaurantDetail>('/restaurants/me', token),
  updateMe: (token: string, payload: UpdateRestaurantProfilePayload) =>
    send<RestaurantDetail>('PATCH', '/restaurants/me', token, payload),

  async uploadFile(token: string, file: { uri: string; name: string; type: string }): Promise<{ url: string }> {
    const form = new FormData();
    // React Native's FormData accepts this {uri,name,type} shape directly; web (Expo web) uses a Blob instead.
    if (file.uri.startsWith('blob:') || file.uri.startsWith('data:')) {
      const blob = await (await fetch(file.uri)).blob();
      form.append('file', blob, file.name);
    } else {
      form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    }
    const res = await fetch(`${API_BASE_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },

  activeStories: (token: string) => get<Story[]>('/restaurants/me/stories', token),
  createStory: (token: string, mediaUrl: string, mediaType: 'photo' | 'video', caption?: string) =>
    send<Story>('POST', '/restaurants/me/stories', token, { mediaUrl, mediaType, caption }),

  menuCategories: () => get<MasterDataItem[]>('/master-data/menu-categories'),
  myDishes: (token: string) => get<Dish[]>('/restaurants/me/dishes', token),
  createDish: (token: string, payload: DishPayload) =>
    send<Dish>('POST', '/restaurants/me/dishes', token, payload),
  updateDish: (token: string, id: string, payload: Partial<DishPayload>) =>
    send<Dish>('PATCH', `/restaurants/me/dishes/${id}`, token, payload),
  deleteDish: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/dishes/${id}`, token),

  gallery: (token: string, album?: GalleryAlbum) =>
    get<GalleryPhoto[]>(`/restaurants/me/gallery${album ? `?album=${album}` : ''}`, token),
  addGalleryPhoto: (token: string, payload: CreateGalleryPhotoPayload) =>
    send<GalleryPhoto>('POST', '/restaurants/me/gallery', token, payload),
  deleteGalleryPhoto: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/gallery/${id}`, token),

  myReviews: (token: string) => get<Review[]>('/restaurants/me/reviews', token),
  reviewsSummary: (token: string) => get<ReviewSummary>('/restaurants/me/reviews/summary', token),
  replyToReview: (token: string, reviewId: string, text: string) =>
    send<Review>('POST', `/restaurants/me/reviews/${reviewId}/reply`, token, { text }),
};
