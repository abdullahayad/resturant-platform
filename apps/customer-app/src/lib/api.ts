export const API_BASE_URL = 'https://api.ligeta.app/v1';

const REQUEST_TIMEOUT_MS = 15000;

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(API_BASE_URL + path, { signal: controller.signal });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export type MoodGroup = 'CLASSIC' | 'PEOPLE' | 'PLACE' | 'TIME' | 'FOOD' | 'SEASONAL';

// A "What's the mood today?" tile, managed from the admin portal's
// App > Customer Moods page. Only switched-on, in-season moods come back.
export interface Mood {
  id: string;
  nameEn: string;
  nameAr: string;
  emoji: string;
  group: MoodGroup;
  foodsEn: string | null;
  foodsAr: string | null;
}

export interface NamedRef {
  id: string;
  nameEn: string;
  nameAr: string;
}

export type RestaurantClass = 'LUXURY' | 'UPSCALE' | 'MODERATE' | 'BUDGET';

// One Explore/search/Home card - the full page comes from the restaurant
// page endpoint. Numbers are already rounded by the server.
export interface RestaurantCard {
  id: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  class: RestaurantClass | null;
  isVerified: boolean;
  isFeatured: boolean;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  rating: number | null;
  reviewCount: number;
  priceFrom: number | null;
  hasOffer: boolean;
  isOpenNow: boolean | null;
  province: NamedRef | null;
  district: NamedRef | null;
  chain: NamedRef | null;
  businessTypes: NamedRef[];
  foodCategories: NamedRef[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type DiscoverSort = 'recommended' | 'rating' | 'nearest' | 'newest';

export interface DiscoverQuery {
  q?: string;
  provinceId?: string;
  districtId?: string;
  moodId?: string;
  businessTypeIds?: string[];
  foodCategoryIds?: string[];
  facilityIds?: string[];
  classes?: RestaurantClass[];
  lat?: number;
  lng?: number;
  radiusKm?: number;
  openNow?: boolean;
  offersOnly?: boolean;
  sort?: DiscoverSort;
  page?: number;
}

function toQueryString(query: DiscoverQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  moods: () => get<Mood[]>('/moods'),
  restaurants: (query: DiscoverQuery = {}) =>
    get<Paginated<RestaurantCard>>('/discover/restaurants' + toQueryString(query)),
  featured: () => get<RestaurantCard[]>('/discover/featured'),
};
