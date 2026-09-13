import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { StatCard } from '../components/StatCard';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../lib/AuthContext';
import { api, type RestaurantAnalytics } from '../lib/api';
import { radii, cardShadow } from '../theme/tokens';

const WEEKDAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'] as const;

export function DeepAnalyticsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('analytics');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<RestaurantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.myAnalytics(token).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const maxDayCount = data ? Math.max(1, ...data.busiestDay) : 1;
  const totalBookings = data?.repeatGuestRate.totalBookings ?? 0;

  const trend = data?.ratingTrend.trend ?? null;
  const trendTone: 'up' | 'down' | 'neutral' = trend == null ? 'neutral' : trend > 0.05 ? 'up' : trend < -0.05 ? 'down' : 'neutral';
  const trendLabel =
    trend == null
      ? t('notEnoughData')
      : trendTone === 'up'
        ? t('ratingTrendUp', { amount: trend.toFixed(1) })
        : trendTone === 'down'
          ? t('ratingTrendDown', { amount: Math.abs(trend).toFixed(1) })
          : t('ratingTrendFlat');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <Text style={styles.subtitle}>{t('subtitle')}</Text>

          <View style={styles.grid}>
            <StatCard
              label={t('repeatGuestRate')}
              value={totalBookings ? `${data!.repeatGuestRate.pctOfBookingsFromRepeatGuests}%` : '—'}
              trend={
                totalBookings
                  ? t('repeatGuestRateDetail', {
                      repeatGuests: data!.repeatGuestRate.repeatGuests,
                      uniqueGuests: data!.repeatGuestRate.uniqueGuests,
                    })
                  : t('noBookingsYet')
              }
            />
            <StatCard
              label={t('ratingTrend')}
              value={data?.ratingTrend.last30Average != null ? `${data.ratingTrend.last30Average.toFixed(1)}★` : '—'}
              trend={trendLabel}
              tone={trendTone}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('busiestDay')}</Text>
            <Text style={styles.cardSubtitle}>{t('busiestDaySubtitle')}</Text>
            {totalBookings === 0 ? (
              <Text style={styles.emptyText}>{t('noBookingsYet')}</Text>
            ) : (
              <View style={styles.barList}>
                {WEEKDAY_KEYS.map((key, i) => {
                  const count = data!.busiestDay[i];
                  const pct = Math.round((count / maxDayCount) * 100);
                  return (
                    <View key={key} style={styles.barRow}>
                      <Text style={styles.barLabel}>{t(`weekdays.${key}`)}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.barCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 12, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: -4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },

  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 4,
    ...cardShadow,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  cardSubtitle: { fontSize: 12, color: colors.mutedForeground, marginBottom: 8 },
  emptyText: { fontSize: 13, color: colors.mutedForeground, paddingVertical: 8 },

  barList: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 36, fontSize: 12, color: colors.mutedForeground },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary },
  barCount: { width: 24, fontSize: 12, color: colors.mutedForeground, textAlign: 'right' },
});
