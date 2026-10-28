import { CalendarDays, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { EventItem } from '../lib/api';
import { formatIqd } from '../lib/format';
import { useDateLabels } from '../lib/useDateLabels';
import { colors } from '../theme';
import { AppText } from './AppText';

// One event: photo, type, title, restaurant, when, price and a Book button.
// showRestaurant is off on the restaurant's own page.
export function EventCard({
  event: e,
  onBook,
  onOpenRestaurant,
  showRestaurant = true,
}: {
  event: EventItem;
  onBook: () => void;
  onOpenRestaurant?: () => void;
  showRestaurant?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { dateLabel, timeLabel } = useDateLabels();
  const ar = i18n.language === 'ar';

  return (
    <View style={styles.card}>
      {e.photoUrl ? (
        <Image source={{ uri: e.photoUrl }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.noPhoto]}>
          <AppText style={styles.icon}>{e.eventType.icon ?? '🎉'}</AppText>
        </View>
      )}
      <View style={styles.body}>
        <AppText weight="semibold" style={styles.type}>
          {e.eventType.icon ? `${e.eventType.icon} ` : ''}
          {ar ? e.eventType.nameAr : e.eventType.nameEn}
        </AppText>
        <AppText weight="bold" style={styles.title} numberOfLines={2}>
          {ar ? e.titleAr : e.titleEn}
        </AppText>
        {showRestaurant && (
          <Pressable onPress={onOpenRestaurant} hitSlop={6} accessibilityRole="link">
            <AppText weight="semibold" style={styles.restaurant} numberOfLines={1}>
              {ar ? e.restaurant.nameAr : e.restaurant.nameEn}
              {e.restaurant.district ? ` · ${ar ? e.restaurant.district.nameAr : e.restaurant.district.nameEn}` : ''}
            </AppText>
          </Pressable>
        )}
        <View style={styles.when}>
          <View style={styles.fact}>
            <CalendarDays size={14} color={colors.mutedIcon} />
            <AppText style={styles.factText}>{dateLabel(e.date)}</AppText>
          </View>
          {e.time && (
            <View style={styles.fact}>
              <Clock size={14} color={colors.mutedIcon} />
              <AppText style={styles.factText}>{timeLabel(e.time)}</AppText>
            </View>
          )}
        </View>
        <View style={styles.footer}>
          <AppText weight="bold" style={styles.price}>
            {e.price != null ? t('events.pricePerPerson', { price: formatIqd(e.price) }) : t('events.free')}
          </AppText>
          <Pressable style={styles.book} onPress={onBook} accessibilityRole="button">
            <AppText weight="bold" style={styles.bookText}>
              {t('events.book')}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  photo: { width: '100%', height: 150, backgroundColor: colors.surface },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueTint },
  icon: { fontSize: 46, lineHeight: 56 },
  body: { padding: 14, gap: 4 },
  type: { fontSize: 12.5, color: colors.blue },
  title: { fontSize: 17 },
  restaurant: { fontSize: 13.5, color: colors.orangeDark },
  when: { flexDirection: 'row', gap: 14, marginTop: 2 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factText: { fontSize: 13, color: colors.muted },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  price: { fontSize: 14.5 },
  book: { backgroundColor: colors.orange, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 9 },
  bookText: { color: colors.white, fontSize: 14 },
});
