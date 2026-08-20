import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import type { ScreenKey } from '../lib/nav';
import { OverviewDashboardScreen } from '../screens/OverviewDashboardScreen';
import { ProfileInfoScreen } from '../screens/ProfileInfoScreen';
import { MenuManagementScreen } from '../screens/MenuManagementScreen';
import { PhotoGalleryScreen } from '../screens/PhotoGalleryScreen';
import { ChefManagementScreen } from '../screens/ChefManagementScreen';
import { ChefTableEventsScreen } from '../screens/ChefTableEventsScreen';
import { CustomerReviewsScreen } from '../screens/CustomerReviewsScreen';
import { ReservationsScreen } from '../screens/ReservationsScreen';
import { DeepAnalyticsScreen } from '../screens/DeepAnalyticsScreen';
import { PromotionsScreen } from '../screens/PromotionsScreen';
import { AdvertisingScreen } from '../screens/AdvertisingScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { SettingsStaffScreen } from '../screens/SettingsStaffScreen';
import type { AuthenticatedRestaurant } from '../lib/api';

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [active, setActive] = useState<ScreenKey>('dashboard');
  const ActiveScreen = screens[active];

  return (
    <View style={styles.container}>
      <Sidebar active={active} onSelect={setActive} />
      <View style={styles.content}>
        <Header
          nameEn={restaurant.nameEn}
          nameAr={restaurant.nameAr}
          codeNumber={restaurant.codeNumber}
          onSignOut={onSignOut}
        />
        <AnnouncementBanner active={active} onView={() => setActive('announcements')} />
        <View style={styles.body}>
          <ActiveScreen />
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  content: { flex: 1 },
  body: { flex: 1, padding: 24 },
});
