import { BadgeCheck, MapPin, Star, Utensils } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { NamedRef, RestaurantCard as Card } from '../lib/api';
import { formatIqd } from '../lib/format';
import { colors } from '../theme';
import { AppText } from './AppText';

// One restaurant in an Explore/search list: big photo, then name, rating,
// cuisines, area and the small facts that decide a visit (open now, price,
// offer).
export function RestaurantCard({ restaurant: r, onPress }: { restaurant: Card; onPress?: () => void }) {
  const { t, i18n } = useTranslation();
  const name = (x: NamedRef | Card) => (i18n.language === 'ar' ? x.nameAr : x.nameEn);
  const cuisines = r.foodCategories.slice(0, 3).map(name).join(' · ');
  const place = [r.district, r.province].filter((x): x is NamedRef => !!x).map(name)[0];

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={name(r)}>
      <View style={styles.photoWrap}>
        {r.coverPhotoUrl ? (
          <Image source={{ uri: r.coverPhotoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            {r.logoUrl ? (
              <Image source={{ uri: r.logoUrl }} style={styles.logo} />
            ) : (
              <Utensils size={34} color={colors.orange} strokeWidth={1.6} />
            )}
          </View>
        )}
        <View style={styles.tags}>
          {r.hasOffer && (
            <View style={[styles.tag, { backgroundColor: colors.orange }]}>
              <AppText weight="bold" style={styles.tagText}>
                {t('explore.offer')}
              </AppText>
            </View>
          )}
          {r.isFeatured && (
            <View style={[styles.tag, { backgroundColor: colors.navy }]}>
              <AppText weight="bold" style={styles.tagText}>
                {t('explore.sponsored')}
              </AppText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <View style={[styles.row, styles.nameRow]}>
            <AppText weight="bold" style={styles.name} numberOfLines={1}>
              {name(r)}
            </AppText>
            {r.isVerified && <BadgeCheck size={17} color={colors.blue} />}
          </View>
          {r.rating != null ? (
            <View style={styles.rating}>
              <Star size={13} color={colors.white} fill={colors.white} />
              <AppText weight="bold" style={styles.ratingText}>
                {r.rating.toFixed(1)}
              </AppText>
            </View>
          ) : (
            <AppText weight="semibold" style={styles.newTag}>
              {t('explore.new')}
            </AppText>
          )}
        </View>

        {!!cuisines && (
          <AppText style={styles.muted} numberOfLines={1}>
            {cuisines}
          </AppText>
        )}

        <View style={[styles.row, styles.facts]}>
          {!!place && (
            <View style={styles.fact}>
              <MapPin size={13} color={colors.mutedIcon} />
              <AppText style={styles.factText}>
                {place}
                {r.distanceKm != null ? ` · ${t('explore.km', { km: r.distanceKm })}` : ''}
              </AppText>
            </View>
          )}
          {r.isOpenNow != null && (
            <AppText weight="semibold" style={[styles.factText, { color: r.isOpenNow ? colors.green : colors.red }]}>
              {r.isOpenNow ? t('explore.openNow') : t('explore.closed')}
            </AppText>
          )}
          {r.priceFrom != null && (
            <AppText style={styles.factText}>{t('explore.priceFrom', { price: formatIqd(r.priceFrom) })}</AppText>
          )}
          {r.reviewCount > 0 && (
            <AppText style={styles.factText}>{t('explore.reviews', { n: r.reviewCount })}</AppText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  photoWrap: { position: 'relative' },
  photo: { width: '100%', height: 170, backgroundColor: colors.surface },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  logo: { width: 76, height: 76, borderRadius: 20 },
  tags: { position: 'absolute', top: 10, start: 10, flexDirection: 'row', gap: 6 },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { color: colors.white, fontSize: 11.5 },
  body: { padding: 14, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameRow: { flexShrink: 1, justifyContent: 'flex-start', gap: 5 },
  name: { fontSize: 17, flexShrink: 1 },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ratingText: { color: colors.white, fontSize: 13 },
  newTag: { fontSize: 12, color: colors.blue },
  muted: { fontSize: 13, color: colors.muted },
  facts: { justifyContent: 'flex-start', flexWrap: 'wrap', columnGap: 12, rowGap: 2, marginTop: 4 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  factText: { fontSize: 12.5, color: colors.muted },
});
