import * as Sentry from '@sentry/react-native';

// Both web and native point at the real hosted backend by default, so
// browser testing sees real production data (e.g. an already-registered
// restaurant) instead of an empty local database. Swap the web branch back
// to 'http://localhost:3000' when doing fast local-iteration dev work
// against a local backend instead.
export const API_BASE_URL = 'https://restuarant-portal-liqeta-app.onrender.com/v1';

// Every screen's "Could not reach the server" message comes from a request that
// failed somewhere below — but until now none of those failures were ever
// reported anywhere, so there was no way to tell a genuine outage apart from
// the free-tier host waking up, or see which endpoint was actually involved.
// Both request failure modes get flagged here: fetch() itself throwing (no
// response at all — DNS/network/timeout) and a response that came back with an
// error status (the server answered, just not successfully). A 401 isn't
// reported here — it's an expected, already-handled case (see
// setUnauthorizedHandler below), not a bug worth an alert.
function reportRequestFailure(kind: 'network' | 'http_status' | 'timeout', method: string, path: string, detail: unknown) {
  Sentry.captureException(detail instanceof Error ? detail : new Error(String(detail)), {
    tags: { request_failure_kind: kind },
    extra: { method, path },
  });
}

// Requests could hang forever with no error at all - most commonly when the
// device's network interface changes mid-request (WiFi to cellular, or
// switching between WiFi networks while moving around). The OS drops the
// old connection but fetch() never rejects on its own, so the screen was
// stuck on its loading state indefinitely with no way to recover short of
// restarting the app. 60s matches the longest wait the app already tells
// users to expect during a legitimate cold-start wake-up (see the
// wakingUpServer copy), so this only ever fires on a connection that's
// truly stuck, not a slow-but-working one.
const REQUEST_TIMEOUT_MS = 60_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// File uploads move real bytes over the network (unlike the plain JSON
// calls above) and can legitimately take longer on a weak connection, even
// after resizeForUpload's compression - a bit more headroom than the
// default before treating it as stuck.
const UPLOAD_TIMEOUT_MS = 90_000;

// A stale or expired login token makes every authenticated request fail with
// 401, which screens were previously showing as a generic "Could not reach
// the server" — misleading, since the server and network are both fine. App.tsx
// registers a handler here (once, on mount) that signs the user out and routes
// them back to sign-in with a clear "session expired" message instead.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MasterDataItem {
  id: string;
  nameEn: string;
  nameAr: string;
  sortOrder?: number;
}

export interface EventTypeItem extends MasterDataItem {
  icon: string | null;
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
  agreedToTerms: boolean;
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

export interface StaffSession {
  id: string;
  fullName: string;
  role: 'MANAGER' | 'MENU_EDITOR';
}

export interface PartnerLoginResult {
  accessToken: string;
  restaurant: AuthenticatedRestaurant;
  staff?: StaffSession;
}

export interface OpeningHoursDay {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export type PublishStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface RestaurantDetail extends AuthenticatedRestaurant {
  phone: string;
  logoUrl: string | null;
  statsVisible: boolean;
  latitude: number | null;
  longitude: number | null;
  notifyNewReview: boolean;
  notifyNewBooking: boolean;
  publishStatus: PublishStatus;
  publishSubmittedAt: string | null;
  publishRejectionReason: string | null;
  publishDeclineAcknowledgedAt: string | null;
  province: MasterDataItem | null;
  district: MasterDataItem | null;
  businessTypes: { businessType: MasterDataItem }[];
  foodCategories: { foodCategory: MasterDataItem }[];
  facilities: { facility: MasterDataItem }[];
  openingHours: OpeningHoursDay[];
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

export type PriceAdjustmentType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface BulkUpdateDishPricesPayload {
  type: PriceAdjustmentType;
  // Signed - positive raises prices, negative lowers them.
  value: number;
  // Omit to apply to every active dish; provide ids to apply to only those.
  dishIds?: string[];
}

export type GalleryAlbum = 'FOOD' | 'MENU' | 'AMBIENCE' | 'REVIEW';
export type AmbienceSubCategory = 'OUTDOOR' | 'INDOOR' | 'OTHER';

export interface GalleryPhoto {
  id: string;
  album: GalleryAlbum;
  url: string;
  caption: string | null;
  ambienceSubCategory: AmbienceSubCategory | null;
  dish: { id: string; nameEn: string; isMostOrdered: boolean; menuCategory: MasterDataItem | null } | null;
  isCover: boolean;
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
  photos: { id: string; url: string; moderationStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN' }[];
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

export type ChefRoleSlug = 'chef' | 'sous-chef';

export interface ChefProfile {
  id: string;
  role: 'HEAD_CHEF' | 'SOUS_CHEF';
  name: string;
  photoUrl: string | null;
  speciality: string | null;
  yearsExperience: number | null;
  awards: string[];
  signatureDishes: { dish: { id: string; nameEn: string; nameAr: string; photoUrl: string | null } }[];
}

export interface ChefManagementState {
  headChef: ChefProfile | null;
  sousChef: ChefProfile | null;
  crewCount: number | null;
  crewPhotoUrl: string | null;
}

export interface ChefProfilePayload {
  name: string;
  photoUrl?: string;
  speciality?: string;
  yearsExperience?: number;
  awards?: string[];
  // Omit to leave the existing signature dishes untouched; pass [] to
  // clear them, or a list of dish ids to replace the whole set.
  signatureDishIds?: string[];
}

export type FeaturedStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FeaturedInitiator = 'RESTAURANT' | 'ADMIN';

export interface FeaturedPlacementItem {
  id: string;
  initiator: FeaturedInitiator;
  reason: string | null;
  note: string | null;
  startDate: string | null;
  endDate: string | null;
  status: FeaturedStatus;
  rejectionReason: string | null;
  isActive: boolean;
  isCurrentlyActive: boolean;
  createdAt: string;
}

export interface RequestFeaturedPayload {
  reason?: string;
  startDate?: string;
  endDate?: string;
}

export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PromotionScope = 'WHOLE_MENU' | 'SPECIFIC_DISHES';
export type PromotionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PromotionItem {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  photoUrl: string | null;
  discountType: PromotionDiscountType;
  discountValue: string;
  scope: PromotionScope;
  isRecurring: boolean;
  validFrom: string | null;
  validUntil: string | null;
  recurringDayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  status: PromotionStatus;
  rejectionReason: string | null;
  isActive: boolean;
  createdAt: string;
  dishes: { dish: { id: string; nameEn: string; nameAr: string } }[];
}

// Bookkeeping only, not real performance stats - there's no customer app
// yet to track views/clicks/redemptions, so this is scoped to what's
// actually knowable today: how many promotions this restaurant has run and
// how they've fared in review.
export interface PromotionsSummary {
  total: number;
  byStatus: { PENDING: number; APPROVED: number; REJECTED: number };
  activeNow: number;
  byDiscountType: { PERCENTAGE: number; FIXED_AMOUNT: number };
}

export interface PromotionPayload {
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  photoUrl?: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  scope: PromotionScope;
  dishIds?: string[];
  isRecurring: boolean;
  validFrom?: string;
  validUntil?: string;
  recurringDayOfWeek?: number;
  startTime?: string;
  endTime?: string;
}

export interface RestaurantEventItem {
  id: string;
  eventTypeId: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  photoUrl: string | null;
  price: string | null;
  capacity: number | null;
  isRecurring: boolean;
  eventDate: string | null;
  recurringDayOfWeek: number | null;
  recurringTime: string | null;
  isActive: boolean;
  createdAt: string;
  eventType: EventTypeItem;
  // Guests currently booked against capacity's next occurrence - null for
  // events with no capacity set (unlimited) or with no upcoming occurrence
  // date to measure against. capacityDate is the date bookedCount reflects
  // (the event's own date, or a recurring event's next matching weekday).
  bookedCount: number | null;
  capacityDate: string | null;
}

export interface EventPayload {
  eventTypeId: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  photoUrl?: string;
  price?: number;
  capacity?: number;
  isRecurring: boolean;
  eventDate?: string;
  recurringDayOfWeek?: number;
  recurringTime?: string;
}

export interface Announcement {
  id: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  replyText: string | null;
  repliedAt: string | null;
  notification: {
    id: string;
    titleEn: string;
    titleAr: string;
    bodyEn: string;
    bodyAr: string;
    actionRequired: boolean;
    createdAt: string;
  };
}

export interface RestaurantAnalytics {
  busiestDay: number[]; // 7 counts, Sun..Sat
  ratingTrend: {
    weekly: { weekStart: string; average: number | null; count: number }[];
    last30Average: number | null;
    trend: number | null;
  };
  repeatGuestRate: {
    totalBookings: number;
    uniqueGuests: number;
    repeatGuests: number;
    pctOfBookingsFromRepeatGuests: number;
  };
}

// What a customer would actually see today if a public listing existed -
// each section already filtered server-side to public-visible-only, so this
// screen never needs its own moderation-status checks.
export interface RestaurantPreview {
  id: string;
  nameEn: string;
  nameAr: string;
  codeNumber: string;
  phone: string;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  crewCount: number | null;
  crewPhotoUrl: string | null;
  province: MasterDataItem | null;
  district: MasterDataItem | null;
  businessTypes: { businessType: MasterDataItem }[];
  foodCategories: { foodCategory: MasterDataItem }[];
  facilities: { facility: MasterDataItem }[];
  openingHours: OpeningHoursDay[];
  // discountedPrice is the price after whichever currently-live promotion
  // gives this dish the best deal, or null if none applies right now -
  // computed server-side from real promotion data, never guessed here.
  dishes: (Dish & { discountedPrice: string | null })[];
  galleryPhotos: { id: string; album: GalleryAlbum; url: string; caption: string | null; ambienceSubCategory: AmbienceSubCategory | null; isCover: boolean }[];
  chefProfiles: ChefProfile[];
  // A trimmed shape, not RestaurantEventItem - the public events list has no
  // bookedCount/capacityDate (that's live capacity for the owner's own
  // dashboard, not something a customer preview shows).
  events: {
    id: string;
    eventTypeId: string;
    titleEn: string;
    titleAr: string;
    descriptionEn: string | null;
    descriptionAr: string | null;
    photoUrl: string | null;
    price: string | null;
    capacity: number | null;
    isRecurring: boolean;
    eventDate: string | null;
    recurringDayOfWeek: number | null;
    recurringTime: string | null;
    eventType: EventTypeItem;
  }[];
  overallAverage: number | null;
  totalReviews: number;
}

export type ActivityItem =
  | { type: 'review'; id: string; createdAt: string; reviewerName: string; rating: number }
  | { type: 'reservation'; id: string; createdAt: string; guestName: string; partySize: number; eventTitleEn: string }
  | { type: 'announcement'; id: string; createdAt: string; titleEn: string; titleAr: string };

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface ReservationItem {
  id: string;
  eventId: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservationDate: string;
  status: ReservationStatus;
  notes: string | null;
  createdAt: string;
  event: { id: string; titleEn: string; titleAr: string; capacity: number | null };
  guestTier: { labelEn: string; labelAr: string } | null;
}

// Payment Accounts (Settings & Staff) - each restaurant's own ZainCash/Qi
// Card merchant credentials, stored so a future customer-app checkout can
// charge straight into this restaurant's own account. merchantId here is
// always the masked "••••1234" form the backend returns - the real value
// and the secret are never sent back once saved.
export type PaymentGatewayId = 'zaincash' | 'qicard';

export interface PaymentGatewayConnection {
  merchantId: string;
  connectedAt: string;
}

export interface PaymentAccountsState {
  zaincash: PaymentGatewayConnection | null;
  qicard: PaymentGatewayConnection | null;
}

export interface ConnectPaymentGatewayPayload {
  merchantId: string;
  secret: string;
}

export type StaffRole = 'MANAGER' | 'MENU_EDITOR';

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
}

export interface InviteStaffPayload {
  email: string;
  password: string;
  fullName: string;
  role: StaffRole;
}

async function get<T>(path: string, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (err) {
    reportRequestFailure(err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'network', 'GET', path, err);
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`GET ${path} failed: ${res.status}`);
    if (res.status === 401 && token) {
      unauthorizedHandler?.();
    } else {
      reportRequestFailure('http_status', 'GET', path, err);
    }
    throw err;
  }
  return res.json();
}

async function send<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    reportRequestFailure(err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'network', method, path, err);
    throw err;
  }
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || `${method} ${path} failed`);
    if (res.status === 401) {
      unauthorizedHandler?.();
    } else {
      reportRequestFailure('http_status', method, path, err);
    }
    throw err;
  }
  return data;
}

// Builds a "?a=1&b=2" query string from an object, skipping any key whose
// value is undefined, null, or an empty string.
function qsFrom(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
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
    // Owners and invited staff share this one sign-in form; the backend
    // resolves which account the email belongs to.
    const res = await fetch(`${API_BASE_URL}/auth/partner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid email or password');
    return data;
  },

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/restaurants/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not send reset code');
    return data;
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/restaurants/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid or expired code');
    return data;
  },

  me: (token: string) => get<RestaurantDetail>('/restaurants/me', token),
  updateMe: (token: string, payload: UpdateRestaurantProfilePayload) =>
    send<RestaurantDetail>('PATCH', '/restaurants/me', token, payload),
  updateOpeningHours: (token: string, days: OpeningHoursDay[]) =>
    send<RestaurantDetail>('PATCH', '/restaurants/me/hours', token, { days }),
  submitForPublish: (token: string) => send<RestaurantDetail>('POST', '/restaurants/me/publish-submit', token),
  acknowledgePublishDecline: (token: string) =>
    send<RestaurantDetail>('PATCH', '/restaurants/me/publish-acknowledge', token),

  async uploadFile(token: string, file: { uri: string; name: string; type: string }): Promise<{ url: string }> {
    const form = new FormData();
    // RN's old {uri,name,type} FormData shorthand throws "Unsupported FormDataPart
    // implementation" under the new architecture (SDK 57 / RN 0.86) — fetching the
    // URI into a real Blob works uniformly for web blob:/data: URIs and native
    // file:/content: URIs alike.
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name);
    let res: Response;
    try {
      res = await fetchWithTimeout(
        `${API_BASE_URL}/uploads`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
        UPLOAD_TIMEOUT_MS,
      );
    } catch (err) {
      reportRequestFailure(err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'network', 'POST', '/uploads', err);
      throw err;
    }
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Upload failed');
      if (res.status !== 401) reportRequestFailure('http_status', 'POST', '/uploads', err);
      throw err;
    }
    return data;
  },

  activeStories: (token: string) => get<Story[]>('/restaurants/me/stories', token),
  createStory: (token: string, mediaUrl: string, mediaType: 'photo' | 'video', caption?: string) =>
    send<Story>('POST', '/restaurants/me/stories', token, { mediaUrl, mediaType, caption }),

  menuCategories: () => get<MasterDataItem[]>('/master-data/menu-categories'),
  // Full, unpaginated - other screens (Photo Gallery's dish picker,
  // Promotions' specific-dishes picker) need every dish at once. Menu
  // Management's own browsing view uses browseDishes() instead.
  myDishes: (token: string) => get<Dish[]>('/restaurants/me/dishes', token),
  browseDishes: (token: string, page?: number) =>
    get<Paginated<Dish>>(`/restaurants/me/dishes/browse${qsFrom({ page })}`, token),
  createDish: (token: string, payload: DishPayload) =>
    send<Dish>('POST', '/restaurants/me/dishes', token, payload),
  updateDish: (token: string, id: string, payload: Partial<DishPayload>) =>
    send<Dish>('PATCH', `/restaurants/me/dishes/${id}`, token, payload),
  deleteDish: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/dishes/${id}`, token),
  bulkUpdateDishPrices: (token: string, payload: BulkUpdateDishPricesPayload) =>
    send<Dish[]>('PATCH', '/restaurants/me/dishes/bulk-price', token, payload),

  // Fetches one tab's slice at a time (paginated) rather than every photo
  // at once - mostOrdered/menuCategoryId only apply within the FOOD album,
  // ambienceSubCategory only within AMBIENCE.
  gallery: (
    token: string,
    album?: GalleryAlbum,
    filters?: { mostOrdered?: boolean; menuCategoryId?: string; ambienceSubCategory?: AmbienceSubCategory },
    page?: number,
  ) =>
    get<Paginated<GalleryPhoto>>(
      `/restaurants/me/gallery${qsFrom({
        album,
        mostOrdered: filters?.mostOrdered ? 'true' : undefined,
        menuCategoryId: filters?.menuCategoryId,
        ambienceSubCategory: filters?.ambienceSubCategory,
        page,
      })}`,
      token,
    ),
  addGalleryPhoto: (token: string, payload: CreateGalleryPhotoPayload) =>
    send<GalleryPhoto>('POST', '/restaurants/me/gallery', token, payload),
  deleteGalleryPhoto: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/gallery/${id}`, token),
  setGalleryCover: (token: string, id: string, cover: boolean) =>
    send<GalleryPhoto>('PATCH', `/restaurants/me/gallery/${id}/cover`, token, { cover }),

  chefs: (token: string) => get<ChefManagementState>('/restaurants/me/chefs', token),
  upsertChef: (token: string, role: ChefRoleSlug, payload: ChefProfilePayload) =>
    send<ChefProfile>('PUT', `/restaurants/me/chefs/${role}`, token, payload),
  deleteChef: (token: string, role: ChefRoleSlug) =>
    send<{ id: string }>('DELETE', `/restaurants/me/chefs/${role}`, token),
  updateCrew: (token: string, payload: { crewCount?: number | null; crewPhotoUrl?: string | null }) =>
    send<{ crewCount: number | null; crewPhotoUrl: string | null }>(
      'PATCH',
      '/restaurants/me/chefs/crew',
      token,
      payload,
    ),

  myReviews: (token: string, page?: number, rating?: number) =>
    get<Paginated<Review>>(`/restaurants/me/reviews${qsFrom({ page, rating })}`, token),
  newReviewsCount: (token: string, since: string) =>
    get<{ count: number }>(`/restaurants/me/reviews/new-count${qsFrom({ since })}`, token),
  reviewsSummary: (token: string) => get<ReviewSummary>('/restaurants/me/reviews/summary', token),
  replyToReview: (token: string, reviewId: string, text: string) =>
    send<Review>('POST', `/restaurants/me/reviews/${reviewId}/reply`, token, { text }),
  suggestReviewReply: (token: string, reviewId: string) =>
    send<{ suggestion: string }>('POST', `/restaurants/me/reviews/${reviewId}/suggest-reply`, token),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    send<{ success: boolean; accessToken: string }>('PATCH', '/restaurants/me/password', token, {
      currentPassword,
      newPassword,
    }),
  updateNotificationPrefs: (token: string, payload: { notifyNewReview?: boolean; notifyNewBooking?: boolean }) =>
    send<RestaurantDetail>('PATCH', '/restaurants/me/notifications', token, payload),
  registerPushToken: (token: string, pushToken: string) =>
    send<{ success: boolean }>('POST', '/restaurants/me/push-token', token, { token: pushToken }),
  unregisterPushToken: (token: string, pushToken: string) =>
    send<{ success: boolean }>('DELETE', '/restaurants/me/push-token', token, { token: pushToken }),

  eventTypes: () => get<EventTypeItem[]>('/master-data/event-types'),
  myEvents: (token: string) => get<RestaurantEventItem[]>('/restaurants/me/events', token),
  createEvent: (token: string, payload: EventPayload) =>
    send<RestaurantEventItem>('POST', '/restaurants/me/events', token, payload),
  updateEvent: (token: string, id: string, payload: Partial<EventPayload> & { isActive?: boolean }) =>
    send<RestaurantEventItem>('PATCH', `/restaurants/me/events/${id}`, token, payload),
  deleteEvent: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/events/${id}`, token),

  myFeatured: (token: string) => get<FeaturedPlacementItem[]>('/restaurants/me/featured', token),
  myFeatureFlags: (token: string) => get<string[]>('/restaurants/me/feature-flags', token),

  myAnalytics: (token: string) => get<RestaurantAnalytics>('/restaurants/me/analytics', token),
  myActivity: (token: string, page?: number) => get<Paginated<ActivityItem>>(`/restaurants/me/activity${qsFrom({ page })}`, token),
  myPreview: (token: string) => get<RestaurantPreview>('/restaurants/me/preview', token),
  requestFeatured: (token: string, payload: RequestFeaturedPayload) =>
    send<FeaturedPlacementItem>('POST', '/restaurants/me/featured', token, payload),
  cancelFeaturedRequest: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/featured/${id}`, token),

  announcements: (token: string, page?: number) =>
    get<Paginated<Announcement>>(`/restaurants/me/announcements${qsFrom({ page })}`, token),
  unreadAnnouncementsCount: (token: string) => get<{ count: number }>('/restaurants/me/announcements/unread-count', token),
  markAnnouncementRead: (token: string, id: string) =>
    send<Announcement>('PATCH', `/restaurants/me/announcements/${id}/read`, token),
  markAnnouncementAcknowledged: (token: string, id: string) =>
    send<Announcement>('PATCH', `/restaurants/me/announcements/${id}/acknowledge`, token),
  replyToAnnouncement: (token: string, id: string, text: string) =>
    send<Announcement>('PATCH', `/restaurants/me/announcements/${id}/reply`, token, { text }),

  myPromotions: (token: string, page?: number) =>
    get<Paginated<PromotionItem>>(`/restaurants/me/promotions${qsFrom({ page })}`, token),
  rejectedPromotionsCount: (token: string) => get<{ count: number }>('/restaurants/me/promotions/rejected-count', token),
  promotionsSummary: (token: string) => get<PromotionsSummary>('/restaurants/me/promotions/summary', token),
  createPromotion: (token: string, payload: PromotionPayload) =>
    send<PromotionItem>('POST', '/restaurants/me/promotions', token, payload),
  updatePromotion: (token: string, id: string, payload: Partial<PromotionPayload> & { isActive?: boolean }) =>
    send<PromotionItem>('PATCH', `/restaurants/me/promotions/${id}`, token, payload),
  deletePromotion: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/promotions/${id}`, token),

  // Full, unpaginated - the calendar view needs every reservation to show
  // accurate day counts across a month, not just a page of them.
  myReservations: (token: string) => get<ReservationItem[]>('/restaurants/me/reservations', token),
  pendingReservationsCount: (token: string) => get<{ count: number }>('/restaurants/me/reservations/pending-count', token),
  updateReservationStatus: (token: string, id: string, status: ReservationStatus) =>
    send<ReservationItem>('PATCH', `/restaurants/me/reservations/${id}`, token, { status }),

  staff: (token: string) => get<StaffMember[]>('/restaurants/me/staff', token),
  inviteStaff: (token: string, payload: InviteStaffPayload) =>
    send<StaffMember>('POST', '/restaurants/me/staff', token, payload),
  updateStaff: (token: string, id: string, payload: Partial<Pick<StaffMember, 'fullName' | 'role' | 'isActive'>>) =>
    send<StaffMember>('PATCH', `/restaurants/me/staff/${id}`, token, payload),
  removeStaff: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/staff/${id}`, token),

  deleteAccount: (token: string) =>
    send<{ deleted: 'staff' | 'restaurant' }>('DELETE', '/restaurants/me/account', token),

  myPaymentAccounts: (token: string) => get<PaymentAccountsState>('/restaurants/me/payment-accounts', token),
  connectPaymentGateway: (token: string, gateway: PaymentGatewayId, payload: ConnectPaymentGatewayPayload) =>
    send<PaymentAccountsState>('PUT', `/restaurants/me/payment-accounts/${gateway}`, token, payload),
  disconnectPaymentGateway: (token: string, gateway: PaymentGatewayId) =>
    send<PaymentAccountsState>('DELETE', `/restaurants/me/payment-accounts/${gateway}`, token),
};
