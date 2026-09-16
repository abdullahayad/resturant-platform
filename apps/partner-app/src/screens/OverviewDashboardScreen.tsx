import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star, CalendarClock, Megaphone, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { StatCard } from '../components/StatCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { relativeTimeParts } from '../lib/relativeTime';
import { api, type ActivityItem, type ReservationItem, type ReviewSummary } from '../lib/api';
import { radii, cardShadow } from '../theme/tokens';

const activityIcons: Record<ActivityItem['type'], LucideIcon> = {
  review: Star,
  reservation: CalendarClock,
  announcement: Megaphone,
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation(['dashboard', 'common']);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Icon = activityIcons[item.type];

  const text =
    item.type === 'review'
      ? t('dashboard:activity.review', { rating: item.rating, name: item.reviewerName })
      : item.type === 'reservation'
        ? t('dashboard:activity.reservation', { name: item.guestName, event: item.eventTitleEn })
        : t('dashboard:activity.announcement', { title: language === 'ar' ? item.titleAr : item.titleEn });

  const time = relativeTimeParts(item.createdAt);
  const timeText = time.key === 'date' ? time.value : time.key === 'justNow' ? t('common:timeAgo.justNow') : t(`common:timeAgo.${time.key}`, { count: time.count });

  return (
    <View style={styles.activityRow}>
      <View style={styles.activityIcon}>
        <Icon size={16} color={colors.primary} />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.activityText}>{text}</Text>
        <Text style={styles.activityTime}>{timeText}</Text>
      </View>
    </View>
  );
}

export function OverviewDashboardScreen() {
  const { token, staff } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('dashboard');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reservations, setReservations] = useState<ReservationItem[] | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchActivityPage = useCallback((page: number) => api.myActivity(token, page), [token]);
  const {
    items: activity,
    loading: activityLoading,
    loadingMore: activityLoadingMore,
    reload: reloadActivity,
    loadMore: loadMoreActivity,
    hasMore: hasMoreActivity,
  } = usePaginatedList(fetchActivityPage);

  useEffect(() => {
    reloadActivity();
  }, [reloadActivity]);

  useEffect(() => {
    setLoading(true);
    const fetches = [
      api.reviewsSummary(token).then(setSummary).catch(() => {}),
      api.me(token).then((profile) => setStatsVisible(profile.statsVisible)).catch(() => {}),
    ];
    // Chef Table & Events (and its reservations) is Manager/Owner-only —
    // a Menu Editor would just get a 403 here.
    if (staff?.role !== 'MENU_EDITOR') {
      fetches.push(api.myReservations(token).then(setReservations).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [token, staff]);

  const pendingCount = reservations?.filter((r) => r.status === 'PENDING').length;
  const confirmedCount = reservations?.filter((r) => r.status === 'CONFIRMED').length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <Text style={styles.subtitle}>
            {statsVisible ? t('subtitleLive') : t('subtitlePrepared')}
          </Text>
          <View style={styles.grid}>
            <StatCard label={t('stats.profileViews')} value="—" trend={t('notTrackedYet')} comingSoon />
            <StatCard label={t('stats.totalFollowers')} value="—" trend={t('notTrackedYet')} comingSoon />
            <StatCard label={t('stats.menuDishViews')} value="—" trend={t('notTrackedYet')} comingSoon />
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

          <Text style={styles.sectionHeading}>{t('activityHeading')}</Text>
          <View style={styles.activityCard}>
            {activityLoading ? (
              <LoadingState />
            ) : activity.length > 0 ? (
              activity.map((item, i) => (
                <View key={`${item.type}-${item.id}`}>
                  {i > 0 && <View style={styles.activityDivider} />}
                  <ActivityRow item={item} />
                </View>
              ))
            ) : (
              <EmptyState icon={CalendarClock} message={t('activityEmpty')} />
            )}
          </View>
          {hasMoreActivity && (
            <Pressable style={styles.loadMoreButton} onPress={loadMoreActivity} disabled={activityLoadingMore}>
              {activityLoadingMore ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.loadMoreText}>{t('common:loadMore')}</Text>
              )}
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 8, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  flex1: { flex: 1 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 20, marginBottom: 8 },
  activityCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 8,
    ...cardShadow,
  },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  activityDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 8 },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryTint15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: { fontSize: 13, color: colors.foreground, fontWeight: '600' },
  activityTime: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  loadMoreButton: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, marginTop: 8 },
  loadMoreText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
