import type { LucideIcon } from 'lucide-react-native';
import type { StaffRole } from './api';
import {
  LayoutDashboard,
  Store,
  BookOpen,
  Percent,
  Sparkles,
  Images,
  ChefHat,
  CalendarClock,
  Star,
  CalendarCheck,
  BarChart3,
  Inbox,
  Settings,
} from 'lucide-react-native';

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
  | 'promotions'
  | 'advertising'
  | 'announcements'
  | 'settings';

export interface NavItem {
  key: ScreenKey;
  labelEn: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  // Hidden from MENU_EDITOR staff logins — the restaurant owner and
  // MANAGER staff always see every item.
  managerOrOwnerOnly?: boolean;
}

export const navItems: NavItem[] = [
  { key: 'dashboard', labelEn: 'Overview Dashboard', icon: LayoutDashboard },
  { key: 'profile', labelEn: 'Profile & Info', icon: Store, managerOrOwnerOnly: true },
  { key: 'menu', labelEn: 'Menu Management', icon: BookOpen },
  { key: 'promotions', labelEn: 'Promotions', icon: Percent },
  { key: 'advertising', labelEn: 'Advertising', icon: Sparkles, managerOrOwnerOnly: true },
  { key: 'gallery', labelEn: 'Photo Gallery', icon: Images },
  { key: 'chefManagement', labelEn: 'Chef Management', icon: ChefHat },
  { key: 'chefTable', labelEn: 'Chef Table & Events', icon: CalendarClock, managerOrOwnerOnly: true },
  { key: 'reviews', labelEn: 'Customer Reviews', icon: Star },
  { key: 'reservations', labelEn: 'Reservations', icon: CalendarCheck, managerOrOwnerOnly: true },
  { key: 'analytics', labelEn: 'Deep Analytics', icon: BarChart3, managerOrOwnerOnly: true },
  { key: 'announcements', labelEn: 'Inbox', icon: Inbox },
  { key: 'settings', labelEn: 'Settings & Staff', icon: Settings },
];

// Sections a restaurant's visibility can be staged-rolled-out for (matches
// the backend's seeded FeatureFlag.key rows exactly). dashboard/profile/settings
// are deliberately excluded — always visible, so admin can never accidentally
// lock a restaurant out of managing their own account.
export const FLAGGABLE_KEYS: ScreenKey[] = [
  'menu',
  'promotions',
  'advertising',
  'gallery',
  'chefManagement',
  'chefTable',
  'reviews',
  'reservations',
  'analytics',
  'announcements',
];
const flaggableKeySet = new Set<ScreenKey>(FLAGGABLE_KEYS);

/** Shared across Sidebar/NavRail/BottomTabBar so the role + rollout filters live in one place. */
export function getVisibleNavItems(role?: StaffRole, enabledKeys?: string[]): NavItem[] {
  return navItems.filter((item) => {
    if (item.managerOrOwnerOnly && role === 'MENU_EDITOR') return false;
    if (enabledKeys && flaggableKeySet.has(item.key) && !enabledKeys.includes(item.key)) return false;
    return true;
  });
}
