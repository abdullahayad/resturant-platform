import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { useAuth } from '../lib/AuthContext';
import { api, type Review } from '../lib/api';

export function CustomerReviewsScreen() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .myReviews(token)
      .then(setReviews)
      .catch(() => setLoadError('Could not reach the server. Is the backend running on localhost:3000?'));
  }, [token]);

  useEffect(load, [load]);

  const { average, distribution, visibleCount } = useMemo(() => {
    const visible = reviews.filter((r) => r.moderationStatus !== 'HIDDEN');
    const dist = [5, 4, 3, 2, 1].map((star) => visible.filter((r) => r.rating === star).length);
    const avg = visible.length ? visible.reduce((sum, r) => sum + r.rating, 0) / visible.length : 0;
    return { average: avg, distribution: dist, visibleCount: visible.length };
  }, [reviews]);

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
      <Text style={styles.title}>Customer Reviews</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={styles.summaryCard}>
        <View style={styles.averageBlock}>
          <Text style={styles.averageNumber}>{average.toFixed(1)}</Text>
          <Text style={styles.averageStars}>{'★'.repeat(Math.round(average))}{'☆'.repeat(5 - Math.round(average))}</Text>
          <Text style={styles.hint}>{visibleCount} review{visibleCount === 1 ? '' : 's'}</Text>
        </View>
        <View style={styles.distributionBlock}>
          {distribution.map((count, index) => {
            const star = 5 - index;
            const pct = visibleCount ? (count / visibleCount) * 100 : 0;
            return (
              <View key={star} style={styles.distRow}>
                <Text style={styles.distLabel}>{star}★</Text>
                <View style={styles.distTrack}>
                  <View style={[styles.distFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.distCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.list}>
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewerName}>{review.reviewerName}</Text>
              <Text style={styles.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
            </View>
            <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
            {review.moderationStatus !== 'VISIBLE' && (
              <Text style={styles.moderationBadge}>{review.moderationStatus === 'HIDDEN' ? 'Hidden by admin' : 'Flagged'}</Text>
            )}
            {review.text && <Text style={styles.reviewText}>{review.text}</Text>}

            {review.reply ? (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>Your reply</Text>
                <Text style={styles.replyText}>{review.reply.text}</Text>
              </View>
            ) : (
              <View style={styles.replyForm}>
                <FormField
                  label="Reply publicly"
                  value={replyDrafts[review.id] ?? ''}
                  onChangeText={(v) => setReplyDrafts((prev) => ({ ...prev, [review.id]: v }))}
                  placeholder="Thank you for your feedback…"
                />
                <Pressable
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => submitReply(review.id)}
                  disabled={submittingId === review.id}
                >
                  {submittingId === review.id ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Post Reply</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        ))}
        {reviews.length === 0 && !loadError && <Text style={styles.hint}>No reviews yet.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingBottom: 24, maxWidth: 640 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  error: { color: colors.destructive, fontSize: 13 },
  hint: { fontSize: 12, color: colors.mutedForeground },
  summaryCard: {
    flexDirection: 'row',
    gap: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  averageBlock: { alignItems: 'center', justifyContent: 'center', width: 100 },
  averageNumber: { fontSize: 32, fontWeight: '700', color: colors.foreground },
  averageStars: { color: colors.primary, fontSize: 14, marginTop: 2 },
  distributionBlock: { flex: 1, gap: 6, justifyContent: 'center' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: { width: 24, fontSize: 12, color: colors.mutedForeground },
  distTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: colors.primary },
  distCount: { width: 20, fontSize: 12, color: colors.mutedForeground, textAlign: 'right' },
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
  reviewStars: { color: colors.primary, fontSize: 13 },
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
