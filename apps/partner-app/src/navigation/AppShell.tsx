import { lazy, Suspense, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNavBadges } from '../hooks/useNavBadges';
import { usePushRegistration } from '../hooks/usePushRegistration';
import { useNotificationNavigation } from '../hooks/useNotificationNavigation';
import { Sidebar } from '../components/Sidebar';
import { NavRail } from '../components/NavRail';
import { BottomTabBar } from '../components/BottomTabBar';
import { Header } from '../components/Header';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { LoadingState } from '../components/LoadingState';
import { getVisibleNavItems, type ScreenKey } from '../lib/nav';
import { useAuth } from '../lib/AuthContext';
// Dashboard loads eagerly — it's the screen shown immediately on sign-in, so
// lazy-loading it would only add a loading flash with no benefit. Every
// other screen is loaded on first visit instead of bundled into app startup.
import { OverviewDashboardScreen } from '../screens/OverviewDashboardScreen';
import type { AuthenticatedRestaurant } from '../lib/api';

const ProfileInfoScreen = lazy(() => import('../screens/ProfileInfoScreen').then((m) => ({ default: m.ProfileInfoScreen })));
const MenuManagementScreen = lazy(() => import('../screens/MenuManagementScreen').then((m) => ({ default: m.MenuManagementScreen })));
const PhotoGalleryScreen = lazy(() => import('../screens/PhotoGalleryScreen').then((m) => ({ default: m.PhotoGalleryScreen })));
const ChefManagementScreen = lazy(() => import('../screens/ChefManagementScreen').then((m) => ({ default: m.ChefManagementScreen })));
const ChefTableEventsScreen = lazy(() => import('../screens/ChefTableEventsScreen').then((m) => ({ default: m.ChefTableEventsScreen })));
const CustomerReviewsScreen = lazy(() => import('../screens/CustomerReviewsScreen').then((m) => ({ default: m.CustomerReviewsScreen })));
const ReservationsScreen = lazy(() => import('../screens/ReservationsScreen').then((m) => ({ default: m.ReservationsScreen })));
const DeepAnalyticsScreen = lazy(() => import('../screens/DeepAnalyticsScreen').then((m) => ({ default: m.DeepAnalyticsScreen })));
const PromotionsScreen = lazy(() => import('../screens/PromotionsScreen').then((m) => ({ default: m.PromotionsScreen })));
const AdvertisingScreen = lazy(() => import('../screens/AdvertisingScreen').then((m) => ({ default: m.AdvertisingScreen })));
const AnnouncementsScreen = lazy(() => import('../screens/AnnouncementsScreen').then((m) => ({ default: m.AnnouncementsScreen })));
const SettingsStaffScreen = lazy(() => import('../screens/SettingsStaffScreen').then((m) => ({ default: m.SettingsStaffScreen })));

const screens: Record<ScreenKey, React.ComponentType> = {
  dashboard: OverviewDashboardScreen,
  profile: ProfileInfoScreen,
  menu: MenuManagementScreen,
  gallery: PhotoGalleryScreen,
  chefManagement: ChefManagementScreen,
  chefTable: ChefTableEventsScreen,
  reviews: CustomerReviewsScreen,
  reservations: ReservationsScreen,
  analytics: DeepAnalyticsScreen,
  promotions: PromotionsScreen,
  advertising: AdvertisingScreen,
  announcements: AnnouncementsScreen,
  settings: SettingsStaffScreen,
};

interface AppShellProps {
  restaurant: AuthenticatedRestaurant;
  onSignOut: () => void;
}

export function AppShell({ restaurant, onSignOut }: AppShellProps) {
  const { staff } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tier = useBreakpoint();
  const [active, setActive] = useState<ScreenKey>('dashboard');
  const ActiveScreen = screens[active];

  const visibleItems = useMemo(() => getVisibleNavItems(staff?.role), [staff?.role]);
  const badges = useNavBadges(active);
  usePushRegistration();
  useNotificationNavigation(setActive);

  return (
    <View style={[styles.container, tier === 'phone' && styles.containerPhone]}>
      {tier === 'sidebar' && <Sidebar active={active} badges={badges} onSelect={setActive} />}
      {tier === 'rail' && <NavRail active={active} badges={badges} onSelect={setActive} />}
      <View style={styles.content}>
        <Header
          nameEn={restaurant.nameEn}
          nameAr={restaurant.nameAr}
          codeNumber={restaurant.codeNumber}
          onSignOut={onSignOut}
        />
        <AnnouncementBanner active={active} onView={() => setActive('announcements')} />
        <View style={[styles.body, tier === 'phone' && styles.bodyPhone]}>
          <Suspense fallback={<LoadingState />}>
            <ActiveScreen />
          </Suspense>
        </View>
      </View>
      {tier === 'phone' && (
        <BottomTabBar items={visibleItems} active={active} badges={badges} onSelect={setActive} />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  containerPhone: { flexDirection: 'column' },
  content: { flex: 1 },
  body: { flex: 1, padding: 24 },
  bodyPhone: { padding: 16 },
});
