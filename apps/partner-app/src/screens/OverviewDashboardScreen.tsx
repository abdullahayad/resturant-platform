import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../lib/AuthContext';
import { api, type ReservationItem, type ReviewSummary } from '../lib/api';

export function OverviewDashboardScreen() {
  const { token, staff } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('dashboard');
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
      <Text style={styles.title}>{t('title')}</Text>
      <Text style={styles.subtitle}>
        {statsVisible ? t('subtitleLive') : t('subtitlePrepared')}
      </Text>
      <View style={styles.grid}>
        <StatCard label={t('stats.profileViews')} value="—" trend={t('notTrackedYet')} />
        <StatCard label={t('stats.totalFollowers')} value="—" trend={t('notTrackedYet')} />
        <StatCard label={t('stats.menuDishViews')} value="—" trend={t('notTrackedYet')} />
        <StatCard
          label={t('stats.chefTableBookings')}
          value={statsVisible && confirmedCount != null ? String(confirmedCount) : '—'}
          trend={statsVisible && pendingCount != null ? t('pendingConfirmation', { count: pendingCount }) : t('notAvailableYet')}
        />
        <StatCard
          label={t('stats.dinerSatisfaction')}
          value={statsVisible && summary ? `${summary.overallAverage.toFixed(1)}★` : '—'}
          trend={
            statsVisible && summary
              ? t('fromReviews', { count: summary.totalCount })
              : t('notAvailableYet')
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
