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
  // Hidden from MENU_EDITOR staff logins — the restaurant owner and
  // MANAGER staff always see every item.
  managerOrOwnerOnly?: boolean;
}

export const navItems: NavItem[] = [
  { key: 'dashboard', labelEn: 'Overview Dashboard' },
  { key: 'profile', labelEn: 'Profile & Info', managerOrOwnerOnly: true },
  { key: 'menu', labelEn: 'Menu Management' },
  { key: 'gallery', labelEn: 'Photo Gallery' },
  { key: 'chefManagement', labelEn: 'Chef Management' },
  { key: 'chefTable', labelEn: 'Chef Table & Events', managerOrOwnerOnly: true },
  { key: 'reviews', labelEn: 'Customer Reviews' },
  { key: 'reservations', labelEn: 'Reservations', comingSoon: true, managerOrOwnerOnly: true },
  { key: 'analytics', labelEn: 'Deep Analytics', comingSoon: true, managerOrOwnerOnly: true },
  { key: 'settings', labelEn: 'Settings & Staff', managerOrOwnerOnly: true },
];
