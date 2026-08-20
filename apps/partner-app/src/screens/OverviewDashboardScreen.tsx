import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../lib/AuthContext';
import { api, type ReservationItem, type ReviewSummary } from '../lib/api';

export function OverviewDashboardScreen() {
  const { token, staff } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reservations, setReservations] = useState<ReservationItem[] | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    api.reviewsSummary(token).then(setSummary).catch(() => {});
    // Chef Table & Events (and its reservations) is Manager/Owner-only —
    // a Menu Editor would just get a 403 here.
    if (staff?.role !== 'MENU_EDITOR') {
      api.myReservations(token).then(setReservations).catch(() => {});
    }
    api.me(token).then((profile) => setStatsVisible(profile.statsVisible)).catch(() => {});
  }, [token, staff]);

  const pendingCount = reservations?.filter((r) => r.status === 'PENDING').length;
  const confirmedCount = reservations?.filter((r) => r.status === 'CONFIRMED').length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Overview Dashboard</Text>
      <Text style={styles.subtitle}>
        {statsVisible
          ? 'Diner Satisfaction and Chef Table Bookings are live. Profile Views, Followers, and Menu Dish Views need a public customer app to generate real traffic before they can show anything but zero.'
          : 'Your performance numbers are being prepared and will be enabled by the platform team soon.'}
      </Text>
      <View style={styles.grid}>
        <StatCard label="Profile Views" value="—" trend="Not tracked yet" />
        <StatCard label="Total Followers" value="—" trend="Not tracked yet" />
        <StatCard label="Menu Dish Views" value="—" trend="Not tracked yet" />
        <StatCard
          label="Chef Table Bookings"
          value={statsVisible && confirmedCount != null ? String(confirmedCount) : '—'}
          trend={statsVisible && pendingCount != null ? `${pendingCount} pending confirmation` : 'Not available yet'}
        />
        <StatCard
          label="Diner Satisfaction"
          value={statsVisible && summary ? `${summary.overallAverage.toFixed(1)}★` : '—'}
          trend={
            statsVisible && summary
              ? `from ${summary.totalCount} review${summary.totalCount === 1 ? '' : 's'}`
              : 'Not available yet'
          }
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 8, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
});
