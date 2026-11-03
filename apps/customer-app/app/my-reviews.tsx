import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../src/components/AppText';
import { PagedList } from '../src/components/PagedList';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { api, type MyReview } from '../src/lib/api';
import { baghdadNow } from '../src/lib/format';
import { useDateLabels } from '../src/lib/useDateLabels';
import { colors } from '../src/theme';

// Reviews the customer wrote in the app, with the restaurant's reply.
export default function MyReviewsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('myReviews.title')} />
      <PagedList<MyReview>
        load={(page) => api.myReviews(page)}
        renderItem={(r) => <ReviewCard review={r} />}
        emptyTitle={t('myReviews.empty')}
        emptyText={t('myReviews.emptyText')}
      />
    </SafeAreaView>
  );
}

function ReviewCard({ review: r }: { review: MyReview }) {
  const { t, i18n } = useTranslation();
  const { dateLabel } = useDateLabels();
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.restaurant.id } })}
      accessibilityRole="link"
    >
      <View style={styles.top}>
        <AppText weight="bold" style={styles.restaurant} numberOfLines={1}>
          {i18n.language === 'ar' ? r.restaurant.nameAr : r.restaurant.nameEn}
        </AppText>
        <AppText style={styles.stars}>{'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}</AppText>
      </View>
      <AppText style={styles.date}>{dateLabel(baghdadNow(new Date(r.createdAt)).date)}</AppText>
      {r.moderationStatus === 'HIDDEN' && <AppText style={styles.hidden}>{t('myReviews.hidden')}</AppText>}
      {!!r.text && <AppText style={styles.text}>{r.text}</AppText>}
      {r.reply && (
        <View style={styles.reply}>
          <AppText weight="semibold" style={styles.replyLabel}>
            {t('myReviews.reply')}
          </AppText>
          <AppText style={styles.text}>{r.reply.text}</AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  restaurant: { fontSize: 16, flexShrink: 1 },
  stars: { color: colors.orange, fontSize: 15, letterSpacing: 1 },
  date: { fontSize: 12.5, color: colors.mutedIcon },
  hidden: { fontSize: 12.5, color: colors.red },
  text: { fontSize: 14, lineHeight: 21 },
  reply: { backgroundColor: colors.surface, borderRadius: 12, padding: 10, gap: 2, marginTop: 4 },
  replyLabel: { fontSize: 12.5, color: colors.orangeDark },
});
