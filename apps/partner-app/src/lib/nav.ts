export type ScreenKey =
  | 'dashboard'
  | 'profile'
  | 'menu'
  | 'gallery'
  | 'chefManagement'
  | 'chefTable'
  | 'reviews'
  | 'reservations'
  | 'analytics'
  | 'settings';

export interface NavItem {
  key: ScreenKey;
  labelEn: string;
  comingSoon?: boolean;
}

export const navItems: NavItem[] = [
  { key: 'dashboard', labelEn: 'Overview Dashboard' },
  { key: 'profile', labelEn: 'Profile & Info' },
  { key: 'menu', labelEn: 'Menu Management' },
  { key: 'gallery', labelEn: 'Photo Gallery' },
  { key: 'chefManagement', labelEn: 'Chef Management', comingSoon: true },
  { key: 'chefTable', labelEn: 'Chef Table & Events' },
  { key: 'reviews', labelEn: 'Customer Reviews' },
  { key: 'reservations', labelEn: 'Reservations', comingSoon: true },
  { key: 'analytics', labelEn: 'Deep Analytics', comingSoon: true },
  { key: 'settings', labelEn: 'Settings & Staff' },
];
