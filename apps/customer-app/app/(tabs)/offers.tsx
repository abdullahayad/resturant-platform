import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Clock, Leaf, MapPin, Utensils } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { PagedList } from '../../src/components/PagedList';
import { api, type BudgetDish, type BudgetQuery, type Cuisine, type Offer, type OfferSort } from '../../src/lib/api';
import { formatIqd } from '../../src/lib/format';
import { useDateLabels } from '../../src/lib/useDateLabels';
import { colors } from '../../src/theme';

type Tab = 'deals' | 'budget';
type Band = 'all' | 'under3' | 'b35';

const SORTS: OfferSort[] = ['nearest', 'ending', 'biggest'];
const BANDS: Band[] = ['all', 'under3', 'b35'];
const BAND_QUERY: Record<Band, Pick<BudgetQuery, 'minPrice' | 'maxPrice'>> = {
  all: {},
  under3: { maxPrice: 2999 },
  b35: { minPrice: 3000, maxPrice: 5000 },
};
const DAY_MS = 24 * 60 * 60 * 1000;

const openRestaurant = (id: string) => router.push({ pathname: '/restaurant/[id]', params: { id } });

// Offers tab: running discounts (sortable by distance, end date or size)
// and "5,000 or less" dishes (price bands, cuisine, healthy).
export default function OffersScreen() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [tab, setTab] = useState<Tab>('deals');

  // Discounts. "Nearest" needs the phone's location, asked for only when
  // that sort is picked; until then the list is newest first.
  const [sort, setSort] = useState<OfferSort>('newest');
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);

  const pickSort = async (s: OfferSort) => {
    if (s !== 'nearest') return setSort(sort === s ? 'newest' : s);
    if (sort === 'nearest') return setSort('newest');
    if (point) return setSort('nearest');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('explore.locationTitle'), t('explore.locationText'), [
          { text: t('profile.cancel'), style: 'cancel' },
          { text: t('explore.openSettings'), onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
      setSort('nearest');
    } catch {
      Alert.alert(t('explore.locationTitle'), t('explore.locationFailed'));
    }
  };

  // 5,000 or less.
  const [band, setBand] = useState<Band>('all');
  const [cuisineId, setCuisineId] = useState<string | null>(null);
  const [healthyOnly, setHealthyOnly] = useState(false);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  useEffect(() => {
    api.cuisines().then(setCuisines).catch(() => {});
  }, []);

  const offersQuery = sort === 'nearest' && point ? { sort, ...point } : { sort };
  const budgetQuery: BudgetQuery = { ...BAND_QUERY[band], cuisineId: cuisineId ?? undefined, healthyOnly };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <AppText weight="bold" style={styles.title}>
          {t('tabs.offers')}
        </AppText>
        <AppText style={styles.subtitle}>{t('offers.subtitle')}</AppText>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(['deals', 'budget'] as Tab[]).map((k) => (
          <Pressable
            key={k}
            style={[styles.tab, tab === k && styles.tabActive]}
            onPress={() => setTab(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === k }}
          >
            <AppText weight={tab === k ? 'bold' : 'medium'} style={styles.tabText}>
              {t(`offers.tabs.${k}`)}
            </AppText>
          </Pressable>
        ))}
      </View>

      {tab === 'deals' ? (
        <PagedList<Offer>
          key="deals"
          reloadKey={JSON.stringify(offersQuery)}
          load={(page) => api.offers(page, offersQuery)}
          renderItem={(o) => <OfferCard offer={o} />}
          header={
            <Segmented
              options={SORTS.map((s) => ({ key: s, label: t(`offers.sorts.${s}`) }))}
              value={sort}
              onChange={(s) => pickSort(s as OfferSort)}
              label={t('offers.sortLabel')}
            />
          }
          emptyTitle={t('offers.noDeals')}
          emptyText={t('offers.noDealsText')}
        />
      ) : (
        <PagedList<BudgetDish>
          key="budget"
          reloadKey={JSON.stringify(budgetQuery)}
          load={(page) => api.budgetDishes(page, budgetQuery)}
          renderItem={(d) => <BudgetDishCard dish={d} />}
          numColumns={2}
          header={
            <View style={styles.budgetHeader}>
              <View style={styles.banner}>
                <View style={styles.flex}>
                  <AppText weight="bold" style={styles.bannerTitle}>
                    {t('offers.bannerTitle')}
                  </AppText>
                  <AppText style={styles.bannerText}>{t('offers.bannerText')}</AppText>
                </View>
                <Utensils size={30} color={colors.white} strokeWidth={1.6} />
              </View>
              <Segmented
                options={BANDS.map((b) => ({ key: b, label: t(`offers.bands.${b}`) }))}
                value={band}
                onChange={(b) => setBand(b as Band)}
                label={t('offers.priceLabel')}
              />
              {cuisines.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
                  <CuisineCircle label={t('offers.allCuisines')} icon="🍽️" active={!cuisineId} onPress={() => setCuisineId(null)} />
                  {cuisines.map((c) => (
                    <CuisineCircle
                      key={c.id}
                      label={ar ? c.nameAr : c.nameEn}
                      icon={c.icon ?? '🍽️'}
                      active={cuisineId === c.id}
                      onPress={() => setCuisineId(cuisineId === c.id ? null : c.id)}
                    />
                  ))}
                </ScrollView>
              )}
              <View style={styles.budgetRow}>
                <AppText style={styles.budgetIntro}>{t('offers.cheapestFirst')}</AppText>
                <Pressable
                  style={[styles.healthy, healthyOnly && styles.healthyActive]}
                  onPress={() => setHealthyOnly((v) => !v)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: healthyOnly }}
                >
                  <Leaf size={14} color={colors.green} />
                  <AppText weight="bold" style={styles.healthyText}>
                    {t('offers.healthyOnly')}
                  </AppText>
                </Pressable>
              </View>
            </View>
          }
          emptyTitle={t('offers.noBudget')}
          emptyText={t('offers.noBudgetText')}
        />
      )}
    </SafeAreaView>
  );
}

function Segmented({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  label: string;
}) {
  return (
    <View style={styles.segmented} accessibilityLabel={label}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          style={[styles.segment, value === o.key && styles.segmentActive]}
          onPress={() => onChange(o.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.key }}
        >
          <AppText weight={value === o.key ? 'bold' : 'medium'} style={styles.segmentText} numberOfLines={1}>
            {o.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

function CuisineCircle({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.cat} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <View style={[styles.catIcon, active && styles.catIconActive]}>
        <AppText style={styles.catEmoji}>{icon}</AppText>
      </View>
      <AppText weight={active ? 'bold' : 'medium'} style={styles.catLabel} numberOfLines={1}>
        {label}
      </AppText>
      <View style={[styles.catBar, active && styles.catBarActive]} />
    </Pressable>
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
  // A dated offer ending within a day gets a red "Ends soon" tag.
  const endsSoon = !o.isRecurring && !!o.validUntil && new Date(o.validUntil).getTime() - Date.now() < DAY_MS;

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
        <View style={styles.offerTags}>
          {endsSoon && (
            <View style={styles.endsSoon}>
              <Clock size={12} color={colors.red} />
              <AppText weight="bold" style={styles.endsSoonText}>
                {t('offers.endsSoon')}
              </AppText>
            </View>
          )}
          {o.distanceKm != null && (
            <View style={styles.distance}>
              <MapPin size={12} color={colors.muted} />
              <AppText style={styles.distanceText}>{t('offers.km', { n: o.distanceKm })}</AppText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function BudgetDishCard({ dish: d }: { dish: BudgetDish }) {
  const { t, i18n } = useTranslation();
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
      {d.isHealthy && (
        <View style={[styles.dishBadge, styles.healthyBadge]}>
          <Leaf size={11} color={colors.green} />
          <AppText weight="bold" style={styles.healthyBadgeText}>
            {t('offers.healthy')}
          </AppText>
        </View>
      )}
      {d.isMostOrdered && (
        <View style={[styles.dishBadge, styles.popularBadge]}>
          <AppText weight="bold" style={styles.popularBadgeText}>
            {t('offers.mostOrdered')}
          </AppText>
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
  flex: { flex: 1 },
  header: { paddingTop: 8, paddingHorizontal: 16, gap: 2, paddingBottom: 8 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14, color: colors.muted },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.orange },
  tabText: { fontSize: 15 },
  segmented: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 11, paddingHorizontal: 4 },
  segmentActive: { backgroundColor: colors.white, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  segmentText: { fontSize: 13.5 },
  budgetHeader: { gap: 14, marginBottom: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.navy, borderRadius: 16, padding: 16 },
  bannerTitle: { fontSize: 18, color: colors.white },
  bannerText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  cats: { gap: 6, paddingHorizontal: 2 },
  cat: { width: 72, alignItems: 'center', gap: 6 },
  catIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  catIconActive: { backgroundColor: colors.peach },
  catEmoji: { fontSize: 28, lineHeight: 36 },
  catLabel: { fontSize: 12.5 },
  catBar: { width: 40, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  catBarActive: { backgroundColor: colors.orange },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  budgetIntro: { fontSize: 13.5, color: colors.muted, flexShrink: 1 },
  healthy: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10 },
  healthyActive: { backgroundColor: colors.greenTint, borderColor: colors.green },
  healthyText: { fontSize: 13, color: colors.green },
  offerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  endsSoon: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FDECEC', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  endsSoonText: { fontSize: 11.5, color: colors.red },
  distance: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distanceText: { fontSize: 12, color: colors.muted },
  dishBadge: { position: 'absolute', top: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  healthyBadge: { end: 8, backgroundColor: colors.white },
  healthyBadgeText: { fontSize: 11, color: colors.green },
  popularBadge: { start: 8, backgroundColor: colors.orangeDark },
  popularBadgeText: { fontSize: 11, color: colors.white },
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
