import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sparkles, UtensilsCrossed, Bell, Users, Building2, Star, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../lib/AuthContext';
import { api, type Review, type ReviewSummary } from '../lib/api';

const categoryIcons: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  service: Bell,
  staff: Users,
  ambience: Building2,
};

export function CustomerReviewsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('reviews');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [starFilter, setStarFilter] = useState<number | null>(null);

  const load = useCallback(() => {
    Promise.all([api.myReviews(token), api.reviewsSummary(token)])
      .then(([r, s]) => {
        setReviews(r);
        setSummary(s);
      })
      .catch(() => setLoadError(t('common:networkError')));
  }, [token, t]);

  useEffect(load, [load]);

  const visibleReviews = useMemo(() => {
    const list = reviews.filter((r) => r.moderationStatus !== 'HIDDEN');
    return starFilter ? list.filter((r) => r.rating === starFilter) : list;
  }, [reviews, starFilter]);

  const submitReply = async (reviewId: string) => {
    const text = replyDrafts[reviewId]?.trim();
    if (!text) return;
    setSubmittingId(reviewId);
    try {
      const updated = await api.replyToReview(token, reviewId, text);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      {summary && (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.overallCard}>
              <Text style={styles.overallLabel}>{t('overall')}</Text>
              <Text style={styles.overallScore}>{summary.overallAverage.toFixed(1)}★</Text>
              <StarRating value={summary.overallAverage} size={15} />
              <Text style={styles.overallCount}>{t('reviews', { count: summary.totalCount })}</Text>
            </View>

            <View style={styles.headlineCard}>
              <View style={styles.headlineTop}>
                <Text style={styles.headlineTitle}>{t('reputationTitle')}</Text>
                <View style={styles.sentimentBadge}>
                  <Text style={styles.sentimentText}>{t('positiveSentiment', { pct: summary.positiveSentimentPct })}</Text>
                </View>
              </View>
              <Text style={styles.headlineBody}>{t('reputationBody')}</Text>
            </View>

            <View style={styles.distributionCard}>
              {summary.distribution.map((row) => (
                <Pressable
                  key={row.star}
                  onPress={() => setStarFilter(starFilter === row.star ? null : row.star)}
                  style={styles.distRow}
                >
                  <Text style={[styles.distLabel, starFilter === row.star && styles.distLabelActive]}>
                    {row.star}★
                  </Text>
                  <View style={styles.distTrack}>
                    <View style={[styles.distFill, { width: `${row.pct}%` }]} />
                  </View>
                  <Text style={styles.distPct}>{row.pct}%</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <View style={styles.sectionHeadingRow}>
              <Sparkles size={15} color={colors.primary} />
              <Text style={styles.sectionHeading}>{t('categoryScoresHeading')}</Text>
            </View>
            <Text style={styles.sectionSubheading}>{t('categoryScoresSubheading')}</Text>
            <View style={styles.categoryRow}>
              {summary.categoryScores.map((cat) => {
                const trendUp = cat.trend != null && cat.trend > 0;
                const trendDown = cat.trend != null && cat.trend < 0;
                const CategoryIcon = categoryIcons[cat.key] ?? Star;
                return (
                  <View key={cat.key} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <CategoryIcon size={18} color={colors.primary} />
                      <Text style={styles.categoryScore}>{cat.average != null ? `${cat.average}★` : '—'}</Text>
                    </View>
                    <Text style={styles.categoryLabel}>
                      {cat.labelEn} <Text style={styles.categoryLabelAr}>({cat.labelAr})</Text>
                    </Text>
                    <View style={styles.categoryTrendRow}>
                      <Text style={styles.categoryTrendHint}>{t('last30Days')}</Text>
                      {cat.trend != null && (
                        <Text style={[styles.categoryTrend, trendUp && styles.trendUp, trendDown && styles.trendDown]}>
                          {trendUp ? '↑' : trendDown ? '↓' : '—'} {trendUp ? '+' : ''}{cat.trend}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}

      <View style={styles.filterRow}>
        <Pressable onPress={() => setStarFilter(null)} style={[styles.filterChip, starFilter === null && styles.filterChipActive]}>
          <Text style={[styles.filterChipText, starFilter === null && styles.filterChipTextActive]}>{t('all')}</Text>
        </Pressable>
        {[5, 4, 3, 2, 1].map((star) => (
          <Pressable
            key={star}
            onPress={() => setStarFilter(starFilter === star ? null : star)}
            style={[styles.filterChip, starFilter === star && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, starFilter === star && styles.filterChipTextActive]}>{star}★</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {visibleReviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewerName}>{review.reviewerName}</Text>
              <StarRating value={review.rating} size={13} />
            </View>
            <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
            {review.moderationStatus !== 'VISIBLE' && (
              <Text style={styles.moderationBadge}>{review.moderationStatus === 'HIDDEN' ? t('hiddenByAdmin') : t('flagged')}</Text>
            )}
            {review.text && <Text style={styles.reviewText}>{review.text}</Text>}

            {review.reply ? (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>{t('yourReply')}</Text>
                <Text style={styles.replyText}>{review.reply.text}</Text>
              </View>
            ) : (
              <View style={styles.replyForm}>
                <FormField
                  label={t('replyLabel')}
                  value={replyDrafts[review.id] ?? ''}
                  onChangeText={(v) => setReplyDrafts((prev) => ({ ...prev, [review.id]: v }))}
                  placeholder={t('replyPlaceholder')}
                />
                <Pressable
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => submitReply(review.id)}
                  disabled={submittingId === review.id}
                >
                  {submittingId === review.id ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('postReply')}</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        ))}
        {visibleReviews.length === 0 && !loadError && <Text style={styles.hint}>{t('noReviewsMatchFilter')}</Text>}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 24, maxWidth: 900 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  error: { color: colors.destructive, fontSize: 13 },
  hint: { fontSize: 12, color: colors.mutedForeground },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  overallCard: {
    width: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  overallLabel: { fontSize: 11, color: colors.primary, fontWeight: '700', letterSpacing: 1 },
  overallScore: { fontSize: 28, fontWeight: '800', color: colors.foreground },
  overallCount: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },

  headlineCard: {
    flex: 1,
    minWidth: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
    justifyContent: 'center',
  },
  headlineTop: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  headlineTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  sentimentBadge: { backgroundColor: colors.successTint15, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  sentimentText: { color: colors.success, fontSize: 11, fontWeight: '700' },
  headlineBody: { fontSize: 12, color: colors.mutedForeground, lineHeight: 17 },

  distributionCard: {
    minWidth: 220,
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
    justifyContent: 'center',
  },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: { width: 24, fontSize: 12, color: colors.mutedForeground },
  distLabelActive: { color: colors.primary, fontWeight: '700' },
  distTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: colors.primary },
  distPct: { width: 32, fontSize: 11, color: colors.mutedForeground, textAlign: 'right' },

  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeading: { fontSize: 14, fontWeight: '700', color: colors.primary },
  sectionSubheading: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, marginBottom: 10 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: {
    width: 190,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    gap: 4,
  },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryScore: { fontSize: 16, fontWeight: '700', color: colors.primary },
  categoryLabel: { fontSize: 13, color: colors.foreground, fontWeight: '600' },
  categoryLabelAr: { color: colors.mutedForeground, fontWeight: '400' },
  categoryTrendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  categoryTrendHint: { fontSize: 11, color: colors.mutedForeground },
  categoryTrend: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
  trendUp: { color: colors.success },
  trendDown: { color: colors.destructive },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.mutedForeground, fontSize: 13 },
  filterChipTextActive: { color: colors.primaryForeground, fontWeight: '700' },

  list: { gap: 12 },
  reviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewerName: { color: colors.foreground, fontWeight: '600', fontSize: 14 },
  reviewDate: { color: colors.mutedForeground, fontSize: 11 },
  reviewText: { color: colors.foreground, fontSize: 13, marginTop: 4 },
  moderationBadge: { color: colors.destructive, fontSize: 11, fontWeight: '600' },
  replyBox: { marginTop: 8, borderRadius: 10, backgroundColor: colors.secondary, padding: 10 },
  replyLabel: { fontSize: 11, color: colors.mutedForeground, fontWeight: '600' },
  replyText: { fontSize: 13, color: colors.foreground, marginTop: 2 },
  replyForm: { marginTop: 8, gap: 8 },
  button: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 16 },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 13 },
});
