// Mirrors the partner-app's own ScreenKey values (src/lib/nav.ts) for every
// section a restaurant can actually make changes in - kept here rather than
// imported from the partner app (a separate package) since the backend only
// needs the string values, not the whole nav/icon/role config that lives
// alongside them there.
export const RESTAURANT_ACTIVITY_SECTIONS = [
  'profile',
  'menu',
  'gallery',
  'promotions',
  'advertising',
  'chefManagement',
  'chefTable',
  'reviews',
  'reservations',
  'announcements',
  'settings',
] as const;
export type RestaurantActivitySection = (typeof RESTAURANT_ACTIVITY_SECTIONS)[number];

// Two more filter options on top of the restaurant sections above - these
// aren't restaurant-initiated (a blocked upload or an admin "Manage as this
// restaurant" session), so they're never written to RestaurantActivityLog,
// but the admin portal's section picker treats them the same way.
export const ADMIN_ACTIVITY_SECTIONS = [...RESTAURANT_ACTIVITY_SECTIONS, 'blockedUpload', 'adminSupportSession'] as const;
export type AdminActivitySection = (typeof ADMIN_ACTIVITY_SECTIONS)[number];

export const SECTION_LABELS: Record<AdminActivitySection, string> = {
  profile: 'Profile & Info',
  menu: 'Menu Management',
  gallery: 'Photo Gallery',
  promotions: 'Promotions',
  advertising: 'Advertising',
  chefManagement: 'Chef Management',
  chefTable: 'Chef Table & Events',
  reviews: 'Customer Reviews',
  reservations: 'Reservations',
  announcements: 'Inbox',
  settings: 'Settings & Staff',
  blockedUpload: 'Blocked Uploads',
  adminSupportSession: 'Admin Access',
};
