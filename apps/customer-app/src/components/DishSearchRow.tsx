import { router } from 'expo-router';
import { Utensils } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { BudgetDish } from '../lib/api';
import { formatIqd } from '../lib/format';
import { colors } from '../theme';
import { AppText } from './AppText';

// Explore search: the matching dishes themselves ("كباب" -> every kebab
// and its price), above the restaurant results. Tapping one opens its
// restaurant.
export function DishSearchRow({ dishes, total }: { dishes: BudgetDish[]; total: number }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  if (!dishes.length) return null;

  return (
    <View style={styles.wrap}>
      <AppText weight="bold" style={styles.title}>
        {t('explore.dishes', { count: total })}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {dishes.map((d) => {
          const discounted = d.discountedPrice != null && d.discountedPrice < d.price;
          return (
            <Pressable
              key={d.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: d.restaurant.id } })}
              accessibilityRole="button"
              accessibilityLabel={ar ? d.nameAr : d.nameEn}
            >
              {d.photoUrl ? (
                <Image source={{ uri: d.photoUrl }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photo, styles.noPhoto]}>
                  <Utensils size={22} color={colors.orange} />
                </View>
              )}
              <View style={styles.body}>
                <AppText weight="bold" style={styles.name} numberOfLines={1}>
                  {ar ? d.nameAr : d.nameEn}
                </AppText>
                <AppText style={styles.place} numberOfLines={1}>
                  {ar ? d.restaurant.nameAr : d.restaurant.nameEn}
                </AppText>
                <View style={styles.prices}>
                  <AppText weight="bold" style={styles.price}>
                    {formatIqd(discounted ? d.discountedPrice! : d.price)} IQD
                  </AppText>
                  {discounted && <AppText style={styles.oldPrice}>{formatIqd(d.price)}</AppText>}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <AppText weight="bold" style={styles.title}>
        {t('explore.places')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginHorizontal: -16 },
  title: { fontSize: 16, marginHorizontal: 16 },
  row: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  card: {
    width: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: { width: '100%', height: 96, backgroundColor: colors.surface },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  body: { padding: 9, gap: 2 },
  name: { fontSize: 13.5 },
  place: { fontSize: 12, color: colors.muted },
  prices: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  price: { fontSize: 13, color: colors.orangeDark },
  oldPrice: { fontSize: 11.5, color: colors.muted, textDecorationLine: 'line-through' },
});
