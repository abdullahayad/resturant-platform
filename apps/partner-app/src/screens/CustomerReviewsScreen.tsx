import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Sparkles, UtensilsCrossed, Bell, Users, Building2, Star, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { FormField } from '../components/FormField';
import { StarRating } from '../components/StarRating';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../lib/AuthContext';
import { api, type Review, type ReviewSummary } from '../lib/api';
import { setReviewsLastSeen } from '../lib/reviewsSeen/storage';
import { radii, cardShadow } from '../theme/tokens';

const categoryIcons: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  service: Bell,
  staff: Users,
  ambience: Building2,
};

export function CustomerReviewsScreen() {
  const { token, enabledKeys } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('reviews');
  const tier = useBreakpoint();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const canSuggestReplies = enabledKeys.includes('aiReviewReplies');
  // Tracks which drafts came from "Suggest a reply" and haven't been hand-
  // edited since, so the hint disappears the moment the owner starts typing.
  const [aiDraftIds, setAiDraftIds] = useState<Set<string>>(new Set());
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [suggestErrors, setSuggestErrors] = useState<Record<string, string>>({});

  // The star filter now runs server-side (the backend already excludes
  // HIDDEN reviews too, a filter that used to happen client-side) - it's
  // in fetchPage's deps so picking a star re-runs reload() with the new
  // filter, starting back at page 1.
  const fetchPage = useCallback(
    (page: number) => api.myReviews(token, page, starFilter ?? undefined),
    [token, starFilter],
  );
  const { items: visibleReviews, setItems: setReviews, loadingMore, error, reload, loadMore } =
    usePaginatedList(fetchPage);

  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    api
      .reviewsSummary(token)
      .then(setSummary)
      .catch(() => setLoadError(t('common:networkError')));
  }, [token, t]);
  useEffect(() => {
    if (error) setLoadError(t('common:networkError'));
  }, [error, t]);
  useEffect(() => {
    setReviewsLastSeen(new Date().toISOString());
  }, []);

  const submitReply = async (reviewId: string) => {
    const text = replyDrafts[reviewId]?.trim();
    if (!text) return;
    setSubmittingId(reviewId);
    try {
      const updated = await api.replyToReview(token, reviewId, text);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
      setAiDraftIds((prev) => {
        if (!prev.has(reviewId)) return prev;
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const suggestReply = async (reviewId: string) => {
    setSuggestingId(reviewId);
    setSuggestErrors((prev) => ({ ...prev, [reviewId]: '' }));
    try {
      const { suggestion } = await api.suggestReviewReply(token, reviewId);
      setReplyDrafts((prev) => ({ ...prev, [reviewId]: suggestion }));
      setAiDraftIds((prev) => new Set(prev).add(reviewId));
    } catch {
      setSuggestErrors((prev) => ({ ...prev, [reviewId]: t('suggestFailed') }));
    } finally {
      setSuggestingId(null);
    }
  };

  const editReplyDraft = (reviewId: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: text }));
    setAiDraftIds((prev) => {
      if (!prev.has(reviewId)) return prev;
      const next = new Set(prev);
      next.delete(reviewId);
      return next;
    });
  };

  const renderReview = ({ item: review }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{review.reviewerName}</Text>
        <StarRating value={review.rating} size={13} />
      </View>
      <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
      {review.moderationStatus !== 'VISIBLE' && (
        <Text style={styles.moderationBadge}>{review.moderationStatus === 'HIDDEN' ? t('hiddenByAdmin') : t('flagged')}</Text>
      )}
      {review.text && <Text style={styles.reviewText}>{review.text}</Text>}
      {review.photos.length > 0 && (
        <View style={styles.reviewPhotoRow}>
          {review.photos.map((photo) => (
            <Image key={photo.id} source={{ uri: photo.url }} style={styles.reviewPhoto} />
          ))}
        </View>
      )}

      {review.reply ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>{t('yourReply')}</Text>
          <Text style={styles.replyText}>{review.reply.text}</Text>
        </View>
      ) : (
        <View style={styles.replyForm}>
          {canSuggestReplies && (
            <Pressable
              style={[styles.button, styles.secondaryButton, styles.suggestButton]}
              onPress={() => suggestReply(review.id)}
              disabled={suggestingId === review.id}
            >
              {suggestingId === review.id ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <>
                  <Sparkles size={14} color={colors.foreground} />
                  <Text style={styles.secondaryButtonText}>{t('suggestReply')}</Text>
                </>
              )}
            </Pressable>
          )}
          {!!suggestErrors[review.id] && <Text style={styles.error}>{suggestErrors[review.id]}</Text>}
          <FormField
            label={t('replyLabel')}
            value={replyDrafts[review.id] ?? ''}
            onChangeText={(v) => editReplyDraft(review.id, v)}
            placeholder={t('replyPlaceholder')}
          />
          {aiDraftIds.has(review.id) && !!replyDrafts[review.id] && (
            <Text style={styles.aiDraftHint}>{t('aiDraftHint')}</Text>
          )}
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
  );

  return (
    <FlatList
      data={visibleReviews}
      keyExtractor={(review) => review.id}
      renderItem={renderReview}
      ItemSeparatorComponent={() => <View style={styles.reviewSeparator} />}
      contentContainerStyle={styles.container}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerSpinner} color={colors.primary} /> : null}
      ListHeaderComponent={
        <View style={styles.headerGroup}>
          <Text style={styles.title}>{t('title')}</Text>
          {loadError && <Text style={styles.error}>{loadError}</Text>}

          {summary && (
            <>
              <View style={[styles.summaryRow, tier === 'phone' && styles.summaryColumn]}>
                <View style={[styles.overallCard, tier === 'phone' && styles.overallCardWide]}>
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
        </View>
      }
      ListEmptyComponent={!loadError ? <EmptyState icon={Star} message={t('noReviewsMatchFilter')} /> : null}
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 24, maxWidth: 900 },
  headerGroup: { gap: 20 },
  reviewSeparator: { height: 12 },
  footerSpinner: { paddingVertical: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  error: { color: colors.destructive, fontSize: 13 },

  // Row + wrap is fine on wider screens where all three cards fit on one
  // line without wrapping — but React Native's flexbox can miscalculate a
  // wrapped card's height when it lands alone on its own line (flex:1 +
  // minWidth together), which showed up as the reputation card collapsing
  // and its centered text spilling onto the section below it on narrow
  // phones. Stacking instead of wrapping on phone width sidesteps that
  // entirely rather than fighting the underlying layout bug.
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryColumn: { flexDirection: 'column', flexWrap: 'nowrap' },
  overallCard: {
    width: 150,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...cardShadow,
  },
  overallCardWide: { width: '100%' },
  overallLabel: { fontSize: 11, color: colors.primary, fontWeight: '700', letterSpacing: 1 },
  overallScore: { fontSize: 28, fontWeight: '800', color: colors.foreground },
  overallCount: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },

  headlineCard: {
    flex: 1,
    minWidth: 220,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
    justifyContent: 'center',
    ...cardShadow,
  },
  headlineTop: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  headlineTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  sentimentBadge: { backgroundColor: colors.successTint15, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  sentimentText: { color: colors.success, fontSize: 11, fontWeight: '700' },
  headlineBody: { fontSize: 12, color: colors.mutedForeground, lineHeight: 17 },

  distributionCard: {
    minWidth: 220,
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
    justifyContent: 'center',
    ...cardShadow,
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    gap: 4,
    ...cardShadow,
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

  reviewCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
    ...cardShadow,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewerName: { color: colors.foreground, fontWeight: '600', fontSize: 14 },
  reviewDate: { color: colors.mutedForeground, fontSize: 11 },
  reviewText: { color: colors.foreground, fontSize: 13, marginTop: 4 },
  reviewPhotoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  reviewPhoto: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.secondary },
  moderationBadge: { color: colors.destructive, fontSize: 11, fontWeight: '600' },
  replyBox: { marginTop: 8, borderRadius: 10, backgroundColor: colors.secondary, padding: 10 },
  replyLabel: { fontSize: 11, color: colors.mutedForeground, fontWeight: '600' },
  replyText: { fontSize: 13, color: colors.foreground, marginTop: 2 },
  replyForm: { marginTop: 8, gap: 8 },
  button: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 16 },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 13 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary },
  secondaryButtonText: { color: colors.foreground, fontWeight: '600', fontSize: 13 },
  suggestButton: { flexDirection: 'row', gap: 6 },
  aiDraftHint: { fontSize: 11, color: colors.mutedForeground, fontStyle: 'italic' },
});
