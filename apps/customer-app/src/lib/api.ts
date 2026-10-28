export const API_BASE_URL = 'https://api.ligeta.app/v1';

const REQUEST_TIMEOUT_MS = 15000;

// A failed request, with the server's own message when it sent one (shown
// to the customer for things like "fully booked").
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// The signed-in customer's token, set by the auth store - sent with every
// request once present.
let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      let message = `${method} ${path} failed: ${res.status}`;
      try {
        const data = (await res.json()) as { message?: string | string[] };
        if (data.message) message = Array.isArray(data.message) ? data.message[0] : data.message;
      } catch {
        // Not JSON - keep the generic message.
      }
      throw new ApiError(res.status, message);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } finally {
    clearTimeout(timer);
  }
}

const get = <T>(path: string) => request<T>('GET', path);

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

export interface Named {
  nameEn: string;
  nameAr: string;
}

export type RestaurantClass = 'LUXURY' | 'UPSCALE' | 'MODERATE' | 'BUDGET';

// One Explore/search/Home card - the full page comes from restaurantPage().
// Numbers are already rounded by the server.
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

// The small restaurant label on offer, dish and event cards.
export interface RestaurantMini {
  id: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  district: NamedRef | null;
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

export interface HoursRow {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface MenuDish {
  id: string;
  nameEn: string;
  nameAr: string;
  price: string;
  discountedPrice: string | null;
  photoUrl: string | null;
  isMostOrdered: boolean;
  menuCategory: (NamedRef & { sortOrder: number }) | null;
}

export interface GalleryPhoto {
  id: string;
  album: 'FOOD' | 'MENU' | 'AMBIENCE' | 'REVIEW';
  url: string;
  caption: string | null;
}

export interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  text: string | null;
  createdAt: string;
  reply: { text: string } | null;
  photos: { id: string; url: string }[];
}

export interface ChefProfile {
  id: string;
  role: 'HEAD_CHEF' | 'SOUS_CHEF';
  name: string;
  photoUrl: string | null;
  speciality: string | null;
  yearsExperience: number | null;
  signatureDishes: { dish: NamedRef & { photoUrl: string | null } }[];
}

// Everything on a restaurant's own page (the same data as its public web page).
export interface RestaurantPage {
  id: string;
  nameEn: string;
  nameAr: string;
  phone: string;
  logoUrl: string | null;
  latitude: string | null;
  longitude: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  province: Named | null;
  district: Named | null;
  chain: Named | null;
  businessTypes: { businessType: Named }[];
  foodCategories: { foodCategory: Named }[];
  facilities: { facility: Named & { icon: string | null } }[];
  openingHours: HoursRow[];
  dishes: MenuDish[];
  galleryPhotos: GalleryPhoto[];
  chefProfiles: ChefProfile[];
  reviews: Review[];
  overallAverage: number | null;
  totalReviews: number;
}

export interface Offer {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  photoUrl: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  scope: 'WHOLE_MENU' | 'SPECIFIC_DISHES';
  isRecurring: boolean;
  validFrom: string | null;
  validUntil: string | null;
  recurringDayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  liveNow: boolean;
  dishes: (NamedRef & { price: number; photoUrl: string | null })[];
  restaurant: RestaurantMini;
}

export interface BudgetDish {
  id: string;
  nameEn: string;
  nameAr: string;
  price: number;
  discountedPrice: number | null;
  photoUrl: string | null;
  menuCategory: NamedRef | null;
  restaurant: RestaurantMini;
}

export interface EventType extends NamedRef {
  icon: string | null;
}

export interface EventItem {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  photoUrl: string | null;
  price: number | null;
  capacity: number | null;
  isRecurring: boolean;
  recurringDaysOfWeek: number[];
  date: string; // Baghdad "YYYY-MM-DD"
  time: string | null; // "HH:mm"
  bookingDate: string;
  eventType: EventType;
  restaurant: RestaurantMini;
}

export interface EventsQuery {
  date?: string;
  eventTypeId?: string;
  restaurantId?: string;
  page?: number;
}

export interface ReservationInput {
  idempotencyKey: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservationDate: string;
  notes?: string;
}

function toQueryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query) as [string, unknown][]) {
    if (value === undefined || value === null || value === '' || value === false) continue;
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
  restaurantPage: (id: string) => get<RestaurantPage>(`/restaurants/${encodeURIComponent(id)}/public-page`),
  offers: (page = 1) => get<Paginated<Offer>>('/discover/offers' + toQueryString({ page })),
  budgetDishes: (page = 1, maxPrice?: number) =>
    get<Paginated<BudgetDish>>('/discover/budget-dishes' + toQueryString({ page, maxPrice })),
  events: (query: EventsQuery = {}) => get<Paginated<EventItem>>('/discover/events' + toQueryString(query)),
  eventAvailability: (restaurantId: string, eventId: string, date: string) =>
    get<{ capacity: number | null; reserved: number; remaining: number | null }>(
      `/restaurants/${restaurantId}/events/${eventId}/availability` + toQueryString({ date }),
    ),
  reserve: (restaurantId: string, eventId: string, input: ReservationInput) =>
    request<{ id: string; status: string }>('POST', `/restaurants/${restaurantId}/events/${eventId}/reservations`, input),
  // Filter chips.
  foodCategories: () => get<NamedRef[]>('/master-data/food-categories'),
  eventTypes: () => get<EventType[]>('/master-data/event-types'),
};
