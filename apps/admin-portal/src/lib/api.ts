import { auth, type AdminProfile } from './auth'

// Defaults to the local dev backend; set VITE_API_BASE_URL (e.g. in
// .env.local, gitignored) to point this at a deployed backend instead —
// needed to manage real data from a hosted app instead of this machine's
// own local database.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000') + '/v1'

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type RestaurantStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
export type PublishStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface RestaurantListItem {
  id: string
  codeNumber: string
  nameEn: string
  nameAr: string
  phone: string
  logoUrl: string | null
  status: RestaurantStatus
  statsVisible: boolean
  ownerEmail: string
  createdAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  publishStatus: PublishStatus
  publishSubmittedAt: string | null
  publishRejectionReason: string | null
  publishReviewedAt: string | null
  province: { id: string; nameEn: string; nameAr: string } | null
  district: { id: string; nameEn: string; nameAr: string } | null
  businessTypes: { businessType: { id: string; nameEn: string; nameAr: string } }[]
  chain: { id: string; nameEn: string; nameAr: string } | null
}

// A brand with multiple branches - admin-managed only, never self-declared
// by a restaurant owner (see RestaurantChain's comment in schema.prisma).
interface AdminActivityRestaurant {
  id: string
  nameEn: string
  nameAr: string
  codeNumber: string
}

interface MasterDataName {
  nameEn: string
  nameAr: string
}

// Deliberately only what a restaurant itself adds (new dishes/photos/
// promotions/events) - not restaurant.updatedAt, which also changes on an
// admin's own actions (approve/reject/suspend/set chain/etc.). Each variant
// carries enough to actually look at what was posted (image, name/title,
// description) without a second request.
export type AdminActivityItem =
  | {
      type: 'dish'
      id: string
      createdAt: string
      nameEn: string
      nameAr: string
      photoUrl: string | null
      price: string
      menuCategory: MasterDataName | null
      restaurant: AdminActivityRestaurant
    }
  | { type: 'photo'; id: string; createdAt: string; album: string; url: string; caption: string | null; restaurant: AdminActivityRestaurant }
  | {
      type: 'promotion'
      id: string
      createdAt: string
      titleEn: string
      titleAr: string
      descriptionEn: string | null
      descriptionAr: string | null
      photoUrl: string | null
      discountType: string
      discountValue: string
      restaurant: AdminActivityRestaurant
    }
  | {
      type: 'event'
      id: string
      createdAt: string
      titleEn: string
      titleAr: string
      descriptionEn: string | null
      descriptionAr: string | null
      photoUrl: string | null
      restaurant: AdminActivityRestaurant
    }
  // restaurant is null only for the rare case of an admin's own upload
  // getting blocked (see the backend's uploads/moderation.service.ts).
  | { type: 'blockedUpload'; id: string; createdAt: string; originalName: string; restaurant: AdminActivityRestaurant | null }

export interface Chain {
  id: string
  nameEn: string
  nameAr: string
  createdAt: string
  updatedAt: string
  _count: { restaurants: number }
}

export interface AdminUserItem {
  id: string
  email: string
  fullName: string
  role: 'SUPER_ADMIN' | 'MODERATOR'
  isActive: boolean
  createdAt: string
}

export interface CreateAdminUserPayload {
  email: string
  password: string
  fullName: string
  role: 'SUPER_ADMIN' | 'MODERATOR'
}

export interface PlatformStats {
  totalPartners: number
  activeCount: number
  inactiveCount: number
  pendingApprovals: number
  rejectedCount: number
  totalReviews: number
  flaggedReviews: number
}

export type ModerationStatus = 'VISIBLE' | 'FLAGGED' | 'HIDDEN'

export interface ReviewItem {
  id: string
  reviewerName: string
  rating: number
  text: string | null
  createdAt: string
  moderationStatus: ModerationStatus
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string }
  reply: { id: string; text: string } | null
  photos: { id: string; url: string; moderationStatus: ModerationStatus }[]
}

export interface RestaurantDetail extends RestaurantListItem {
  latitude: number | null
  longitude: number | null
  foodCategories: { foodCategory: { id: string; nameEn: string; nameAr: string } }[]
  facilities: { facility: { id: string; nameEn: string; nameAr: string } }[]
  openingHours: {
    dayOfWeek: number
    isClosed: boolean
    openTime: string | null
    closeTime: string | null
  }[]
}

export interface PublishReviewDetail extends RestaurantDetail {
  crewCount: number | null
  crewPhotoUrl: string | null
  publishReviewedBy: { fullName: string } | null
  dishes: {
    id: string
    nameEn: string
    nameAr: string
    price: string
    photoUrl: string | null
    isMostOrdered: boolean
    moderationStatus: ModerationStatus
    menuCategory: { id: string; nameEn: string; nameAr: string } | null
  }[]
  galleryPhotos: {
    id: string
    album: 'FOOD' | 'MENU' | 'AMBIENCE'
    url: string
    caption: string | null
    moderationStatus: ModerationStatus
    ambienceSubCategory: 'OUTDOOR' | 'INDOOR' | 'OTHER' | null
    dish: { id: string; nameEn: string } | null
  }[]
  chefProfiles: {
    id: string
    role: 'HEAD_CHEF' | 'SOUS_CHEF'
    name: string
    photoUrl: string | null
    speciality: string | null
    yearsExperience: number | null
    awards: string[]
  }[]
  events: {
    id: string
    titleEn: string
    titleAr: string
    descriptionEn: string | null
    photoUrl: string | null
    price: string | null
    isActive: boolean
    moderationStatus: ModerationStatus
    eventType: { id: string; nameEn: string; nameAr: string; icon: string | null }
  }[]
  staffUsers: {
    id: string
    email: string
    fullName: string
    role: 'MANAGER' | 'MENU_EDITOR'
    isActive: boolean
    createdAt: string
  }[]
}

export interface ModeratableDishItem {
  id: string
  nameEn: string
  nameAr: string
  photoUrl: string | null
  moderationStatus: ModerationStatus
  createdAt: string
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string }
}

export interface ModeratableGalleryPhotoItem {
  id: string
  url: string
  caption: string | null
  album: 'FOOD' | 'MENU' | 'AMBIENCE'
  moderationStatus: ModerationStatus
  createdAt: string
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string }
}

export interface ModeratableEventItem {
  id: string
  titleEn: string
  titleAr: string
  photoUrl: string | null
  moderationStatus: ModerationStatus
  createdAt: string
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string }
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface AdminEventItem {
  id: string
  titleEn: string
  titleAr: string
  photoUrl: string | null
  price: string | null
  capacity: number | null
  isRecurring: boolean
  eventDate: string | null
  recurringDayOfWeek: number | null
  recurringTime: string | null
  isActive: boolean
  moderationStatus: ModerationStatus
  createdAt: string
  eventType: { id: string; nameEn: string; nameAr: string; icon: string | null }
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string }
  _count: { reservations: number }
}

export interface AdminEventReservationItem {
  id: string
  guestName: string
  guestPhone: string
  partySize: number
  reservationDate: string
  status: ReservationStatus
  notes: string | null
  createdAt: string
}

export type MasterDataKind = 'business-types' | 'food-categories' | 'menu-categories' | 'facilities' | 'event-types'

export interface MasterDataItemFull {
  id: string
  nameEn: string
  nameAr: string
  sortOrder: number
  isActive: boolean
  icon?: string | null
}

export interface MasterDataItemPayload {
  nameEn: string
  nameAr: string
  sortOrder?: number
  icon?: string
  isActive?: boolean
}

export type FeaturedStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type FeaturedInitiator = 'RESTAURANT' | 'ADMIN'

export interface FeaturedPlacementItem {
  id: string
  restaurantId: string
  initiator: FeaturedInitiator
  reason: string | null
  note: string | null
  startDate: string | null
  endDate: string | null
  status: FeaturedStatus
  rejectionReason: string | null
  isActive: boolean
  isCurrentlyActive: boolean
  createdAt: string
  reviewedBy: { fullName: string } | null
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string }
}

export type PromotionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'
export type PromotionScope = 'WHOLE_MENU' | 'SPECIFIC_DISHES'

export interface PromotionItem {
  id: string
  titleEn: string
  titleAr: string
  descriptionEn: string | null
  descriptionAr: string | null
  photoUrl: string | null
  discountType: PromotionDiscountType
  discountValue: string
  scope: PromotionScope
  isRecurring: boolean
  validFrom: string | null
  validUntil: string | null
  recurringDayOfWeek: number | null
  startTime: string | null
  endTime: string | null
  status: PromotionStatus
  rejectionReason: string | null
  isActive: boolean
  createdAt: string
  dishes: { dish: { id: string; nameEn: string; nameAr: string; price: string } }[]
  reviewedBy: { fullName: string } | null
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string }
}

export interface NotificationItem {
  id: string
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
  actionRequired: boolean
  createdAt: string
  createdBy: { fullName: string }
  recipientCount: number
  readCount: number
  acknowledgedCount: number
  unseenReplyCount: number
}

export interface NotificationRecipientDetail {
  id: string
  readAt: string | null
  acknowledgedAt: string | null
  replyText: string | null
  repliedAt: string | null
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string }
}

export interface CreateNotificationPayload {
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
  actionRequired?: boolean
  restaurantId?: string
  provinceId?: string
  businessTypeId?: string
}

export interface LoyaltyTierItem {
  id: string
  labelEn: string
  labelAr: string
  thresholdCount: number
  rewardEn: string
  rewardAr: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export interface LoyaltyTierPayload {
  labelEn: string
  labelAr: string
  thresholdCount: number
  rewardEn: string
  rewardAr: string
  sortOrder?: number
  isActive?: boolean
}

export interface LoyaltyRewardItem {
  id: string
  guestPhone: string
  tierId: string
  tierLabelEn: string
  tierLabelAr: string
  rewardEn: string
  rewardAr: string
  bookingCountAtIssuance: number
  issuedAt: string
  redeemedAt: string | null
  issuedBy: { fullName: string } | null
}

export interface LoyaltyGuestLookupResult {
  phone: string
  qualifyingBookingCount: number
  restaurantsVisited: { id: string; nameEn: string; nameAr: string; codeNumber: string }[]
  currentTier: { id: string; labelEn: string; labelAr: string } | null
  rewards: LoyaltyRewardItem[]
}

export interface District {
  id: string
  nameEn: string
  nameAr: string
  code: string
  sortOrder: number
  isActive: boolean
}

export interface Province extends District {
  districts: District[]
}

export interface FeatureFlagOverrideItem {
  id: string
  enabled: boolean
  restaurant: { id: string; nameEn: string; nameAr: string; codeNumber: string } | null
  district: { id: string; nameEn: string; nameAr: string; province: { nameEn: string; nameAr: string } } | null
  province: { id: string; nameEn: string; nameAr: string } | null
}

export interface FeatureFlagItem {
  id: string
  key: string
  labelEn: string
  defaultEnabled: boolean
  overrides: FeatureFlagOverrideItem[]
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

async function send<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handle<T>(res)
}

// Builds a "?a=1&b=2" query string from an object, skipping any key whose
// value is undefined, null, or an empty string — used by every paginated
// list call below so each one doesn't have to hand-build its own params.
function qsFrom(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
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

  restaurants: (filters?: {
    status?: RestaurantStatus
    publishStatus?: PublishStatus
    provinceId?: string
    districtId?: string
    businessTypeId?: string
    foodCategoryId?: string
    search?: string
    page?: number
  }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.publishStatus) params.set('publishStatus', filters.publishStatus)
    if (filters?.provinceId) params.set('provinceId', filters.provinceId)
    if (filters?.districtId) params.set('districtId', filters.districtId)
    if (filters?.businessTypeId) params.set('businessTypeId', filters.businessTypeId)
    if (filters?.foodCategoryId) params.set('foodCategoryId', filters.foodCategoryId)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.page) params.set('page', String(filters.page))
    const qs = params.toString()
    return get<Paginated<RestaurantListItem>>(`/restaurants${qs ? `?${qs}` : ''}`)
  },
  // Full, unpaginated - for "pick a restaurant" dropdowns (Advertising's
  // grant-placement picker, Feature Flags' and Notifications' targeting
  // pickers), unlike the (now paginated) restaurants() browsing list above.
  restaurantsPicker: (status?: RestaurantStatus) => get<RestaurantListItem[]>(`/restaurants/picker${qsFrom({ status })}`),
  restaurant: (id: string) => get<RestaurantDetail>(`/restaurants/${id}`),
  approve: (id: string) => send<RestaurantListItem>('PATCH', `/restaurants/${id}/approve`),
  reject: (id: string, reason?: string) =>
    send<RestaurantListItem>('PATCH', `/restaurants/${id}/reject`, { reason }),
  suspend: (id: string) => send<RestaurantListItem>('PATCH', `/restaurants/${id}/suspend`),
  setStatsVisibility: (id: string, statsVisible: boolean) =>
    send<RestaurantListItem>('PATCH', `/restaurants/${id}/stats-visibility`, { statsVisible }),
  setRestaurantChain: (id: string, chainId: string | null) =>
    send<RestaurantListItem>('PATCH', `/restaurants/${id}/chain`, { chainId }),

  chains: () => get<Chain[]>('/chains'),
  adminActivity: (page?: number) => get<Paginated<AdminActivityItem>>(`/admin-activity${qsFrom({ page })}`),
  recentBlockedCount: () => get<{ count: number }>('/admin-activity/recent-blocked-count'),
  createChain: (payload: { nameEn: string; nameAr: string }) => send<Chain>('POST', '/chains', payload),
  updateChain: (id: string, payload: { nameEn: string; nameAr: string }) =>
    send<Chain>('PATCH', `/chains/${id}`, payload),
  deleteChain: (id: string) => send<{ id: string }>('DELETE', `/chains/${id}`),

  publishReview: (id: string) => get<PublishReviewDetail>(`/restaurants/${id}/publish-review`),
  moderatePublish: (id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) =>
    send<RestaurantListItem>('PATCH', `/restaurants/${id}/publish-moderate`, { status, rejectionReason }),

  moderatableDishes: (status?: ModerationStatus, page?: number) =>
    get<Paginated<ModeratableDishItem>>(`/admin/dishes${qsFrom({ status, page })}`),
  moderateDish: (id: string, status: ModerationStatus) =>
    send<ModeratableDishItem>('PATCH', `/admin/dishes/${id}/moderate`, { status }),

  moderatableGalleryPhotos: (status?: ModerationStatus, page?: number) =>
    get<Paginated<ModeratableGalleryPhotoItem>>(`/admin/gallery-photos${qsFrom({ status, page })}`),
  moderateGalleryPhoto: (id: string, status: ModerationStatus) =>
    send<ModeratableGalleryPhotoItem>('PATCH', `/admin/gallery-photos/${id}/moderate`, { status }),

  moderatableEvents: (status?: ModerationStatus, page?: number) =>
    get<Paginated<ModeratableEventItem>>(`/admin/events${qsFrom({ status, page })}`),
  moderateEvent: (id: string, status: ModerationStatus) =>
    send<ModeratableEventItem>('PATCH', `/admin/events/${id}/moderate`, { status }),

  // Busiest-first, with optional search across title/restaurant - a
  // different view onto the same /admin/events endpoint moderatableEvents
  // above uses (see events.service.ts's adminList for why one endpoint
  // supports both).
  adminEvents: (search?: string, page?: number) =>
    get<Paginated<AdminEventItem>>(`/admin/events${qsFrom({ search, page, sort: 'reservationCount' })}`),
  adminEventReservations: (id: string) => get<AdminEventReservationItem[]>(`/admin/events/${id}/reservations`),

  masterData: (kind: MasterDataKind) => get<MasterDataItemFull[]>(`/master-data/admin/${kind}`),
  createMasterDataItem: (kind: MasterDataKind, payload: MasterDataItemPayload) =>
    send<MasterDataItemFull>('POST', `/master-data/admin/${kind}`, payload),
  updateMasterDataItem: (kind: MasterDataKind, id: string, payload: Partial<MasterDataItemPayload>) =>
    send<MasterDataItemFull>('PATCH', `/master-data/admin/${kind}/${id}`, payload),
  deleteMasterDataItem: (kind: MasterDataKind, id: string) =>
    send<{ id: string }>('DELETE', `/master-data/admin/${kind}/${id}`),

  provinces: () => get<Province[]>('/master-data/admin/provinces'),
  createProvince: (payload: { nameEn: string; nameAr: string; code: string; sortOrder?: number }) =>
    send<District>('POST', '/master-data/admin/provinces', payload),
  updateProvince: (id: string, payload: Partial<MasterDataItemPayload & { code: string }>) =>
    send<District>('PATCH', `/master-data/admin/provinces/${id}`, payload),
  deleteProvince: (id: string) => send<{ id: string }>('DELETE', `/master-data/admin/provinces/${id}`),

  createDistrict: (provinceId: string, payload: { nameEn: string; nameAr: string; code: string; sortOrder?: number }) =>
    send<District>('POST', `/master-data/admin/provinces/${provinceId}/districts`, payload),
  updateDistrict: (id: string, payload: Partial<MasterDataItemPayload & { code: string }>) =>
    send<District>('PATCH', `/master-data/admin/districts/${id}`, payload),
  deleteDistrict: (id: string) => send<{ id: string }>('DELETE', `/master-data/admin/districts/${id}`),

  reviews: (status?: ModerationStatus, page?: number) => get<Paginated<ReviewItem>>(`/reviews${qsFrom({ status, page })}`),
  moderateReview: (id: string, status: ModerationStatus) =>
    send<ReviewItem>('PATCH', `/reviews/${id}/moderate`, { status }),

  platformStats: () => get<PlatformStats>('/admin/stats'),

  adminUsers: () => get<AdminUserItem[]>('/admin-users'),
  createAdminUser: (payload: CreateAdminUserPayload) => send<AdminUserItem>('POST', '/admin-users', payload),
  updateAdminUser: (id: string, payload: Partial<Pick<AdminUserItem, 'fullName' | 'role' | 'isActive'>>) =>
    send<AdminUserItem>('PATCH', `/admin-users/${id}`, payload),

  promotions: (status?: PromotionStatus, page?: number) =>
    get<Paginated<PromotionItem>>(`/admin/promotions${qsFrom({ status, page })}`),
  moderatePromotion: (id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) =>
    send<PromotionItem>('PATCH', `/admin/promotions/${id}/moderate`, { status, rejectionReason }),

  featured: (status?: FeaturedStatus) =>
    get<FeaturedPlacementItem[]>(`/admin/featured${status ? `?status=${status}` : ''}`),
  grantFeatured: (payload: { restaurantId: string; note?: string; startDate?: string; endDate?: string }) =>
    send<FeaturedPlacementItem>('POST', '/admin/featured/grant', payload),
  moderateFeatured: (
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string; startDate?: string; endDate?: string },
  ) => send<FeaturedPlacementItem>('PATCH', `/admin/featured/${id}/moderate`, payload),
  revokeFeatured: (id: string) => send<FeaturedPlacementItem>('PATCH', `/admin/featured/${id}/revoke`),

  loyaltyTiers: () => get<LoyaltyTierItem[]>('/admin/loyalty/tiers'),
  createLoyaltyTier: (payload: LoyaltyTierPayload) => send<LoyaltyTierItem>('POST', '/admin/loyalty/tiers', payload),
  updateLoyaltyTier: (id: string, payload: Partial<LoyaltyTierPayload>) =>
    send<LoyaltyTierItem>('PATCH', `/admin/loyalty/tiers/${id}`, payload),
  loyaltyGuestLookup: (phone: string) =>
    get<LoyaltyGuestLookupResult>(`/admin/loyalty/guests/${encodeURIComponent(phone)}`),
  grantLoyaltyReward: (payload: { guestPhone: string; tierId: string }) =>
    send<LoyaltyRewardItem>('POST', '/admin/loyalty/rewards/grant', payload),
  redeemLoyaltyReward: (id: string) => send<LoyaltyRewardItem>('PATCH', `/admin/loyalty/rewards/${id}/redeem`),

  featureFlags: () => get<FeatureFlagItem[]>('/admin/feature-flags'),
  updateFeatureFlagDefault: (id: string, defaultEnabled: boolean) =>
    send<FeatureFlagItem>('PATCH', `/admin/feature-flags/${id}`, { defaultEnabled }),
  setFeatureFlagOverride: (
    id: string,
    payload: { restaurantId?: string; districtId?: string; provinceId?: string; enabled: boolean },
  ) => send<FeatureFlagOverrideItem>('POST', `/admin/feature-flags/${id}/overrides`, payload),
  removeFeatureFlagOverride: (overrideId: string) =>
    send<{ id: string }>('DELETE', `/admin/feature-flags/overrides/${overrideId}`),

  notifications: () => get<NotificationItem[]>('/admin/notifications'),
  createNotification: (payload: CreateNotificationPayload) =>
    send<NotificationItem>('POST', '/admin/notifications', payload),
  notificationRecipients: (id: string) =>
    get<NotificationRecipientDetail[]>(`/admin/notifications/${id}/recipients`),
  deleteNotification: (id: string) => send<{ id: string }>('DELETE', `/admin/notifications/${id}`),
}

export { UnauthorizedError }
