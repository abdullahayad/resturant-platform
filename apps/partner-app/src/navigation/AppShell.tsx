import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
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
import { SettingsStaffScreen } from '../screens/SettingsStaffScreen';

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
  settings: SettingsStaffScreen,
};

export function AppShell() {
  const [active, setActive] = useState<ScreenKey>('dashboard');
  const ActiveScreen = screens[active];

  return (
    <View style={styles.container}>
      <Sidebar active={active} onSelect={setActive} />
      <View style={styles.content}>
        <Header />
        <View style={styles.body}>
          <ActiveScreen />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  content: { flex: 1 },
  body: { flex: 1, padding: 24 },
});
