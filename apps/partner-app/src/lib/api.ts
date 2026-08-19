export const API_BASE_URL = 'http://localhost:3000';

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

export interface RestaurantDetail extends AuthenticatedRestaurant {
  phone: string;
  logoUrl: string | null;
  statsVisible: boolean;
  latitude: number | null;
  longitude: number | null;
  notifyNewReview: boolean;
  notifyNewBooking: boolean;
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

export type ChefRoleSlug = 'chef' | 'sous-chef';

export interface ChefProfile {
  id: string;
  role: 'HEAD_CHEF' | 'SOUS_CHEF';
  name: string;
  photoUrl: string | null;
  speciality: string | null;
  yearsExperience: number | null;
  awards: string[];
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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function send<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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

  me: (token: string) => get<RestaurantDetail>('/restaurants/me', token),
  updateMe: (token: string, payload: UpdateRestaurantProfilePayload) =>
    send<RestaurantDetail>('PATCH', '/restaurants/me', token, payload),
  updateOpeningHours: (token: string, days: OpeningHoursDay[]) =>
    send<RestaurantDetail>('PATCH', '/restaurants/me/hours', token, { days }),

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

  myReviews: (token: string) => get<Review[]>('/restaurants/me/reviews', token),
  reviewsSummary: (token: string) => get<ReviewSummary>('/restaurants/me/reviews/summary', token),
  replyToReview: (token: string, reviewId: string, text: string) =>
    send<Review>('POST', `/restaurants/me/reviews/${reviewId}/reply`, token, { text }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    send<{ success: boolean; accessToken: string }>('PATCH', '/restaurants/me/password', token, {
      currentPassword,
      newPassword,
    }),
  updateNotificationPrefs: (token: string, payload: { notifyNewReview?: boolean; notifyNewBooking?: boolean }) =>
    send<RestaurantDetail>('PATCH', '/restaurants/me/notifications', token, payload),

  eventTypes: () => get<EventTypeItem[]>('/master-data/event-types'),
  myEvents: (token: string) => get<RestaurantEventItem[]>('/restaurants/me/events', token),
  createEvent: (token: string, payload: EventPayload) =>
    send<RestaurantEventItem>('POST', '/restaurants/me/events', token, payload),
  updateEvent: (token: string, id: string, payload: Partial<EventPayload> & { isActive?: boolean }) =>
    send<RestaurantEventItem>('PATCH', `/restaurants/me/events/${id}`, token, payload),
  deleteEvent: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/events/${id}`, token),

  announcements: (token: string) => get<Announcement[]>('/restaurants/me/announcements', token),
  markAnnouncementRead: (token: string, id: string) =>
    send<Announcement>('PATCH', `/restaurants/me/announcements/${id}/read`, token),
  markAnnouncementAcknowledged: (token: string, id: string) =>
    send<Announcement>('PATCH', `/restaurants/me/announcements/${id}/acknowledge`, token),

  myPromotions: (token: string) => get<PromotionItem[]>('/restaurants/me/promotions', token),
  createPromotion: (token: string, payload: PromotionPayload) =>
    send<PromotionItem>('POST', '/restaurants/me/promotions', token, payload),
  updatePromotion: (token: string, id: string, payload: Partial<PromotionPayload> & { isActive?: boolean }) =>
    send<PromotionItem>('PATCH', `/restaurants/me/promotions/${id}`, token, payload),
  deletePromotion: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/promotions/${id}`, token),

  myReservations: (token: string) => get<ReservationItem[]>('/restaurants/me/reservations', token),
  updateReservationStatus: (token: string, id: string, status: ReservationStatus) =>
    send<ReservationItem>('PATCH', `/restaurants/me/reservations/${id}`, token, { status }),

  staff: (token: string) => get<StaffMember[]>('/restaurants/me/staff', token),
  inviteStaff: (token: string, payload: InviteStaffPayload) =>
    send<StaffMember>('POST', '/restaurants/me/staff', token, payload),
  updateStaff: (token: string, id: string, payload: Partial<Pick<StaffMember, 'fullName' | 'role' | 'isActive'>>) =>
    send<StaffMember>('PATCH', `/restaurants/me/staff/${id}`, token, payload),
  removeStaff: (token: string, id: string) =>
    send<{ id: string }>('DELETE', `/restaurants/me/staff/${id}`, token),
};
