import { router } from 'expo-router';
import { Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { PagedList } from '../../src/components/PagedList';
import { api, type BudgetDish, type Offer } from '../../src/lib/api';
import { formatIqd } from '../../src/lib/format';
import { useDateLabels } from '../../src/lib/useDateLabels';
import { colors } from '../../src/theme';

type Tab = 'deals' | 'budget';

const openRestaurant = (id: string) => router.push({ pathname: '/restaurant/[id]', params: { id } });

export default function OffersScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('deals');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <AppText weight="bold" style={styles.title}>
          {t('tabs.offers')}
        </AppText>
        <View style={styles.switcher}>
          {(['deals', 'budget'] as Tab[]).map((k) => (
            <Pressable
              key={k}
              style={[styles.switch, tab === k && styles.switchActive]}
              onPress={() => setTab(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === k }}
            >
              <AppText weight="bold" style={[styles.switchText, tab === k && styles.switchTextActive]}>
                {t(`offers.tabs.${k}`)}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'deals' ? (
        <PagedList<Offer>
          key="deals"
          load={(page) => api.offers(page)}
          renderItem={(o) => <OfferCard offer={o} />}
          emptyTitle={t('offers.noDeals')}
          emptyText={t('offers.noDealsText')}
        />
      ) : (
        <PagedList<BudgetDish>
          key="budget"
          load={(page) => api.budgetDishes(page)}
          renderItem={(d) => <BudgetDishCard dish={d} />}
          numColumns={2}
          header={<AppText style={styles.budgetIntro}>{t('offers.budgetIntro')}</AppText>}
          emptyTitle={t('offers.noBudget')}
          emptyText={t('offers.noBudgetText')}
        />
      )}
    </SafeAreaView>
  );
}

function OfferCard({ offer: o }: { offer: Offer }) {
  const { t, i18n } = useTranslation();
  const { days, dateLabel, timeLabel } = useDateLabels();
  const ar = i18n.language === 'ar';
  const discount =
    o.discountType === 'PERCENTAGE'
      ? t('offers.percentOff', { n: o.discountValue })
      : t('offers.amountOff', { price: formatIqd(o.discountValue) });

  let when: string;
  if (o.isRecurring && o.recurringDayOfWeek != null) {
    when = t('offers.everyDay', { day: days[o.recurringDayOfWeek] });
    if (o.startTime && o.endTime) when += ` · ${timeLabel(o.startTime)} - ${timeLabel(o.endTime)}`;
  } else {
    when = o.validUntil ? t('offers.until', { date: dateLabel(o.validUntil.slice(0, 10)) }) : '';
  }
  const photo = o.photoUrl ?? o.dishes[0]?.photoUrl ?? o.restaurant.coverPhotoUrl;

  return (
    <Pressable style={styles.offer} onPress={() => openRestaurant(o.restaurant.id)} accessibilityRole="button">
      <View style={styles.offerPhotoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.offerPhoto} resizeMode="cover" />
        ) : (
          <View style={[styles.offerPhoto, styles.noPhoto]}>
            <Utensils size={30} color={colors.orange} strokeWidth={1.6} />
          </View>
        )}
        <View style={styles.discount}>
          <AppText weight="bold" style={styles.discountText}>
            {discount}
          </AppText>
        </View>
      </View>
      {/* The dashed edge makes it read as a coupon, as on the design canvas. */}
      <View style={styles.offerBody}>
        <View style={styles.offerTop}>
          <AppText weight="semibold" style={styles.offerRestaurant} numberOfLines={1}>
            {ar ? o.restaurant.nameAr : o.restaurant.nameEn}
          </AppText>
          {o.liveNow && (
            <View style={styles.live}>
              <View style={styles.liveDot} />
              <AppText weight="bold" style={styles.liveText}>
                {t('offers.liveNow')}
              </AppText>
            </View>
          )}
        </View>
        <AppText weight="bold" style={styles.offerTitle} numberOfLines={2}>
          {ar ? o.titleAr : o.titleEn}
        </AppText>
        <AppText style={styles.offerMeta} numberOfLines={2}>
          {o.scope === 'WHOLE_MENU'
            ? t('offers.wholeMenu')
            : o.dishes.map((d) => (ar ? d.nameAr : d.nameEn)).join('، ')}
        </AppText>
        {!!when && <AppText style={styles.offerWhen}>{when}</AppText>}
      </View>
    </Pressable>
  );
}

function BudgetDishCard({ dish: d }: { dish: BudgetDish }) {
  const { i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  return (
    <Pressable style={styles.dish} onPress={() => openRestaurant(d.restaurant.id)} accessibilityRole="button">
      {d.photoUrl ? (
        <Image source={{ uri: d.photoUrl }} style={styles.dishPhoto} resizeMode="cover" />
      ) : (
        <View style={[styles.dishPhoto, styles.noPhoto]}>
          <Utensils size={26} color={colors.orange} strokeWidth={1.6} />
        </View>
      )}
      <View style={styles.dishBody}>
        <AppText weight="semibold" style={styles.dishName} numberOfLines={2}>
          {ar ? d.nameAr : d.nameEn}
        </AppText>
        <AppText style={styles.dishRestaurant} numberOfLines={1}>
          {ar ? d.restaurant.nameAr : d.restaurant.nameEn}
        </AppText>
        <View style={styles.priceRow}>
          <AppText weight="bold" style={[styles.dishPrice, d.discountedPrice != null && { color: colors.orangeDark }]}>
            {formatIqd(d.discountedPrice ?? d.price)}
          </AppText>
          {d.discountedPrice != null && <AppText style={styles.oldPrice}>{formatIqd(d.price)}</AppText>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 8, paddingHorizontal: 16, gap: 12, paddingBottom: 6 },
  title: { fontSize: 26 },
  switcher: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4 },
  switch: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  switchActive: { backgroundColor: colors.white, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  switchText: { fontSize: 14, color: colors.muted },
  switchTextActive: { color: colors.orangeDark },
  budgetIntro: { fontSize: 13.5, color: colors.muted, marginBottom: 4 },
  offer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F0C9A8',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  offerPhotoWrap: { width: 112 },
  offerPhoto: { width: 112, height: '100%', minHeight: 128, backgroundColor: colors.surface },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  discount: {
    position: 'absolute',
    bottom: 8,
    start: 8,
    end: 8,
    backgroundColor: colors.orange,
    borderRadius: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  discountText: { color: colors.white, fontSize: 13 },
  offerBody: { flex: 1, padding: 12, gap: 3 },
  offerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  offerRestaurant: { fontSize: 13, color: colors.orangeDark, flexShrink: 1 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { fontSize: 11, color: colors.green },
  offerTitle: { fontSize: 16 },
  offerMeta: { fontSize: 12.5, color: colors.muted },
  offerWhen: { fontSize: 12.5, color: colors.blue, marginTop: 2 },
  dish: { flex: 1, maxWidth: '48.5%', backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  dishPhoto: { width: '100%', height: 120, backgroundColor: colors.surface },
  dishBody: { padding: 10, gap: 2 },
  dishName: { fontSize: 14 },
  dishRestaurant: { fontSize: 12, color: colors.muted },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dishPrice: { fontSize: 15 },
  oldPrice: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
});
