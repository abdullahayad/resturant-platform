import { router, useFocusEffect } from 'expo-router';
import { Bell, ChevronDown, MapPin, Search, Star, Utensils } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { AreaSheet } from '../../src/components/AreaSheet';
import {
  api,
  type BudgetDish,
  type Chef,
  type Critic,
  type Cuisine,
  type HomeBanner,
  type Mood,
  type MoodGroup,
  type RestaurantCard,
} from '../../src/lib/api';
import { useArea } from '../../src/lib/area';
import { useAuth } from '../../src/lib/auth';
import { formatIqd } from '../../src/lib/format';
import { colors, TAB_BAR_SPACE } from '../../src/theme';

// Home shows 9 moods; the 10th tile opens all of them (matches the admin
// portal's Customer Moods page, which explains the same rule).
const HOME_MOOD_COUNT = 9;
const GROUP_ORDER: MoodGroup[] = ['CLASSIC', 'PEOPLE', 'PLACE', 'TIME', 'FOOD', 'SEASONAL'];
const TILE_COLORS = ['#FDF0E6', '#E6EDFC', '#F5DDE3', '#F6E3D3', '#F8EBC6', '#E4E1F0', '#E3F1E6', '#EADFD3'];

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [moods, setMoods] = useState<Mood[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [featured, setFeatured] = useState<RestaurantCard[]>([]);
  const [healthy, setHealthy] = useState<BudgetDish[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [critics, setCritics] = useState<Critic[]>([]);
  const [areaOpen, setAreaOpen] = useState(false);
  const { area } = useArea();
  const { status } = useAuth();
  const [unread, setUnread] = useState(0);

  // The bell's count, fresh each time Home comes back into view.
  useFocusEffect(
    useCallback(() => {
      if (status !== 'signedIn') return;
      let cancelled = false;
      api
        .unreadNotifications()
        .then((r) => {
          if (!cancelled) setUnread(r.count);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [status]),
  );
  const { width } = useWindowDimensions();
  const bannerWidth = width - 32;

  // Pull-to-refresh only; the first load happens in the effect below.
  const load = useCallback(async () => {
    try {
      setMoods(await api.moods());
      setFailed(false);
      setFeatured(await api.featured());
      setHealthy((await api.healthyDishes()).items);
      setBanners(await api.homeBanners());
      setCuisines(await api.cuisines());
      setChefs(await api.chefs());
      setCritics(await api.critics());
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .moods()
      .then((m) => {
        if (!cancelled) setMoods(m);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    api
      .featured()
      .then((f) => {
        if (!cancelled) setFeatured(f);
      })
      .catch(() => {});
    api
      .healthyDishes()
      .then((h) => {
        if (!cancelled) setHealthy(h.items);
      })
      .catch(() => {});
    // Each Home row loads on its own - one failing never blanks the others.
    const keep = <T,>(request: Promise<T>, set: (value: T) => void) =>
      request
        .then((value) => {
          if (!cancelled) set(value);
        })
        .catch(() => {});
    keep(api.homeBanners(), setBanners);
    keep(api.cuisines(), setCuisines);
    keep(api.chefs(), setChefs);
    keep(api.critics(), setCritics);
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const name = (m: Mood) => (i18n.language === 'ar' ? m.nameAr : m.nameEn);
  const ar = i18n.language === 'ar';
  const areaTitle = area
    ? ar
      ? (area.districtNameAr ?? area.provinceNameAr)
      : (area.districtNameEn ?? area.provinceNameEn)
    : t('home.everywhere');
  const areaSubtitle = area
    ? area.districtId
      ? ar
        ? area.provinceNameAr
        : area.provinceNameEn
      : t('home.allAreas')
    : t('home.chooseArea');

  // Where a banner leads, as set in Admin > Home Layout.
  const openBanner = (b: HomeBanner) => {
    if (b.linkType === 'RESTAURANT' && b.linkValue) {
      router.push({ pathname: '/restaurant/[id]', params: { id: b.linkValue } });
    } else if (b.linkType === 'MOOD' && b.linkValue) {
      const mood = list.find((m) => m.id === b.linkValue);
      router.push({ pathname: '/explore', params: { moodId: b.linkValue, moodName: mood ? name(mood) : '' } });
    } else if (b.linkType === 'HEALTHY') {
      router.push({ pathname: '/explore', params: { healthy: '1' } });
    } else if (b.linkType === 'OFFERS') {
      router.push('/offers');
    } else if (b.linkType === 'EVENTS') {
      router.push('/events');
    }
  };
  const list = moods ?? [];
  const showMore = list.length > HOME_MOOD_COUNT + 1;
  const homeMoods = showMore ? list.slice(0, HOME_MOOD_COUNT) : list;

  const tile = (m: Mood, index: number) => (
    <Pressable
      key={m.id}
      style={styles.mood}
      accessibilityRole="button"
      accessibilityLabel={name(m)}
      onPress={() => {
        setAllOpen(false);
        router.push({ pathname: '/explore', params: { moodId: m.id, moodName: name(m) } });
      }}
    >
      <View style={[styles.moodIcon, { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] }]}>
        <AppText style={styles.moodEmoji}>{m.emoji}</AppText>
      </View>
      <AppText weight="semibold" style={styles.moodLabel} numberOfLines={2}>
        {name(m)}
      </AppText>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
          <Pressable
            style={styles.location}
            onPress={() => setAreaOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('home.chooseArea')}
          >
            <View style={styles.row}>
              <MapPin size={20} color={colors.orange} fill={colors.orange} stroke={colors.peach} />
              <AppText weight="bold" style={styles.city}>
                {areaTitle}
              </AppText>
              <ChevronDown size={16} color={colors.text} />
            </View>
            <AppText style={styles.area}>{areaSubtitle}</AppText>
          </Pressable>
          {status === 'signedIn' && (
            <Pressable
              style={styles.bell}
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.title')}
            >
              <Bell size={22} color={colors.text} />
              {unread > 0 && (
                <View style={styles.bellBadge}>
                  <AppText weight="bold" style={styles.bellBadgeText}>
                    {unread > 9 ? '9+' : unread}
                  </AppText>
                </View>
              )}
            </Pressable>
          )}
          </View>

          <Pressable style={styles.search} onPress={() => router.push('/explore')} accessibilityRole="search">
            <Search size={20} color={colors.orange} strokeWidth={2.2} />
            <AppText style={styles.searchHint}>{t('home.searchHint')}</AppText>
          </Pressable>
        </View>

        {banners.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={bannerWidth + 10}
            decelerationRate="fast"
            contentContainerStyle={styles.bannerRow}
          >
            {banners.map((b) => (
              <Pressable
                key={b.id}
                style={[styles.banner, { width: bannerWidth, backgroundColor: b.color ?? colors.orange }]}
                onPress={() => openBanner(b)}
                disabled={b.linkType === 'NONE'}
                accessibilityRole={b.linkType === 'NONE' ? 'text' : 'button'}
              >
                {b.imageUrl && <Image source={{ uri: b.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                {b.imageUrl && <View style={styles.bannerShade} />}
                <AppText weight="bold" style={styles.bannerTitle} numberOfLines={2}>
                  {ar ? b.titleAr : b.titleEn}
                </AppText>
                {!!(ar ? b.subtitleAr : b.subtitleEn) && (
                  <AppText style={styles.bannerSubtitle} numberOfLines={2}>
                    {ar ? b.subtitleAr : b.subtitleEn}
                  </AppText>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}

        {cuisines.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cuisineRow}>
            {cuisines.map((c) => (
              <Pressable
                key={c.id}
                style={styles.cuisine}
                onPress={() => router.push({ pathname: '/explore', params: { cuisines: c.id } })}
                accessibilityRole="button"
                accessibilityLabel={ar ? c.nameAr : c.nameEn}
              >
                {c.photoUrl ? (
                  <Image source={{ uri: c.photoUrl }} style={styles.cuisinePhoto} />
                ) : (
                  <View style={[styles.cuisinePhoto, styles.cuisineNoPhoto]}>
                    <AppText style={styles.cuisineIcon}>{c.icon ?? '🍽️'}</AppText>
                  </View>
                )}
                <AppText weight="semibold" style={styles.cuisineName} numberOfLines={1}>
                  {c.icon && c.photoUrl ? `${c.icon} ` : ''}
                  {ar ? c.nameAr : c.nameEn}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <AppText weight="bold" style={styles.sectionTitle}>
          {t('home.moodTitle')}
        </AppText>
        {failed && moods === null ? (
          <AppText style={styles.error}>{t('home.moodsError')}</AppText>
        ) : (
          <View style={styles.grid}>
            {moods === null
              ? Array.from({ length: 10 }, (_, i) => (
                  <View key={i} style={styles.mood}>
                    <View style={[styles.moodIcon, styles.skeleton]} />
                  </View>
                ))
              : homeMoods.map(tile)}
            {showMore && (
              <Pressable style={styles.mood} onPress={() => setAllOpen(true)} accessibilityRole="button">
                <View style={[styles.moodIcon, styles.moreIcon]}>
                  <AppText weight="bold" style={styles.moreCount}>
                    +{list.length - HOME_MOOD_COUNT}
                  </AppText>
                </View>
                <AppText weight="bold" style={[styles.moodLabel, { color: colors.blue }]}>
                  {t('home.moreMoods')}
                </AppText>
              </Pressable>
            )}
          </View>
        )}

        {healthy.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <AppText weight="bold" style={[styles.sectionTitle, styles.sectionTitleInline]}>
                {t('home.healthyDishes')}
              </AppText>
              <Pressable
                onPress={() => router.push({ pathname: '/explore', params: { healthy: '1' } })}
                hitSlop={8}
                accessibilityRole="link"
              >
                <AppText weight="semibold" style={styles.sectionLink}>
                  {t('home.healthyRestaurants')}
                </AppText>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {healthy.map((d) => (
                <Pressable
                  key={d.id}
                  style={styles.healthyCard}
                  onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: d.restaurant.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={i18n.language === 'ar' ? d.nameAr : d.nameEn}
                >
                  {d.photoUrl ? (
                    <Image source={{ uri: d.photoUrl }} style={styles.healthyPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[styles.healthyPhoto, styles.healthyNoPhoto]}>
                      <AppText style={styles.healthyLeaf}>🌿</AppText>
                    </View>
                  )}
                  <View style={styles.featuredBody}>
                    <AppText weight="bold" style={styles.healthyName} numberOfLines={1}>
                      {i18n.language === 'ar' ? d.nameAr : d.nameEn}
                    </AppText>
                    <AppText style={styles.featuredMetaText} numberOfLines={1}>
                      {i18n.language === 'ar' ? d.restaurant.nameAr : d.restaurant.nameEn}
                    </AppText>
                    <AppText weight="bold" style={styles.healthyPrice}>
                      {formatIqd(d.discountedPrice ?? d.price)} IQD
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {featured.length > 0 && (
          <>
            <AppText weight="bold" style={styles.sectionTitle}>
              {t('home.dontMiss')}
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {featured.map((r) => (
                <Pressable
                  key={r.id}
                  style={styles.featured}
                  onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={i18n.language === 'ar' ? r.nameAr : r.nameEn}
                >
                  {r.coverPhotoUrl ? (
                    <Image source={{ uri: r.coverPhotoUrl }} style={styles.featuredPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[styles.featuredPhoto, styles.featuredNoPhoto]}>
                      <Utensils size={30} color={colors.orange} strokeWidth={1.6} />
                    </View>
                  )}
                  <View style={styles.sponsored}>
                    <AppText weight="bold" style={styles.sponsoredText}>
                      {t('home.sponsored')}
                    </AppText>
                  </View>
                  <View style={styles.featuredBody}>
                    <AppText weight="bold" style={styles.featuredName} numberOfLines={1}>
                      {i18n.language === 'ar' ? r.nameAr : r.nameEn}
                    </AppText>
                    <View style={styles.featuredMeta}>
                      {r.rating != null && (
                        <>
                          <Star size={12} color={colors.orange} fill={colors.orange} />
                          <AppText weight="semibold" style={styles.featuredMetaText}>
                            {r.rating.toFixed(1)}
                          </AppText>
                        </>
                      )}
                      <AppText style={styles.featuredMetaText} numberOfLines={1}>
                        {r.foodCategories
                          .slice(0, 2)
                          .map((f) => (i18n.language === 'ar' ? f.nameAr : f.nameEn))
                          .join(' · ')}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {critics.length > 0 && (
          <>
            <AppText weight="bold" style={styles.sectionTitle}>
              {t('home.critics')}
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {critics.slice(0, 15).map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.critic}
                  onPress={() => router.push({ pathname: '/critic/[id]', params: { id: c.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                >
                  <View style={[styles.criticAvatar, c.isStar && styles.criticStar]}>
                    <AppText weight="bold" style={styles.criticInitial}>
                      {c.name.charAt(0)}
                    </AppText>
                  </View>
                  <AppText weight="bold" style={styles.chefName} numberOfLines={1}>
                    {c.isStar ? '⭐ ' : ''}
                    {c.name}
                  </AppText>
                  <AppText style={styles.chefPlace} numberOfLines={1}>
                    {c.specialties[0]
                      ? `${c.specialties[0].icon ?? ''} ${ar ? c.specialties[0].nameAr : c.specialties[0].nameEn}`.trim()
                      : t('critics.reviewsCount', { n: c.reviewCount })}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {chefs.length > 0 && (
          <>
            <AppText weight="bold" style={styles.sectionTitle}>
              {t('home.chefs')}
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {chefs.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.chef}
                  onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: c.restaurant.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                >
                  {c.photoUrl ? (
                    <Image source={{ uri: c.photoUrl }} style={styles.chefPhoto} />
                  ) : (
                    <View style={[styles.chefPhoto, styles.chefNoPhoto]}>
                      <AppText style={styles.cuisineIcon}>👨‍🍳</AppText>
                    </View>
                  )}
                  <AppText weight="bold" style={styles.chefName} numberOfLines={1}>
                    {c.name}
                  </AppText>
                  <AppText style={styles.chefPlace} numberOfLines={1}>
                    {ar ? c.restaurant.nameAr : c.restaurant.nameEn}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {areaOpen && <AreaSheet onClose={() => setAreaOpen(false)} />}

      <Modal visible={allOpen} transparent animationType="slide" onRequestClose={() => setAllOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAllOpen(false)} accessibilityLabel={t('home.close')} />
        <View style={styles.sheet}>
          <AppText weight="bold" style={styles.sheetTitle}>
            {t('home.allMoods')}
          </AppText>
          <ScrollView>
            {GROUP_ORDER.map((group) => {
              const items = list.filter((m) => m.group === group);
              if (!items.length) return null;
              return (
                <View key={group}>
                  <AppText weight="bold" style={styles.groupTitle}>
                    {t(`home.groups.${group}`)}
                  </AppText>
                  <View style={styles.grid}>{items.map((m) => tile(m, list.indexOf(m)))}</View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.peach },
  scroll: { backgroundColor: colors.background, flexGrow: 1 },
  header: { backgroundColor: colors.peach, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  location: { alignSelf: 'flex-start', minHeight: 44, flexShrink: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  bellBadge: {
    position: 'absolute',
    top: -2,
    end: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { color: colors.white, fontSize: 10.5, lineHeight: 14 },
  city: { fontSize: 20 },
  area: { fontSize: 13, color: colors.muted, paddingStart: 25 },
  search: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchHint: { fontSize: 15, color: colors.mutedIcon },
  sectionTitle: { fontSize: 21, marginTop: 26, marginBottom: 14, marginHorizontal: 16 },
  bannerRow: { paddingHorizontal: 16, gap: 10, paddingTop: 18 },
  banner: { height: 150, borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-end', padding: 16 },
  bannerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  bannerTitle: { color: colors.white, fontSize: 21 },
  bannerSubtitle: { color: colors.white, fontSize: 13.5, opacity: 0.92, marginTop: 2 },
  cuisineRow: { paddingHorizontal: 16, gap: 14, paddingTop: 20 },
  cuisine: { width: 76, alignItems: 'center', gap: 6 },
  cuisinePhoto: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface },
  cuisineNoPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  cuisineIcon: { fontSize: 32, lineHeight: 40 },
  cuisineName: { fontSize: 12, textAlign: 'center' },
  chef: { width: 96, alignItems: 'center', gap: 4 },
  critic: { width: 92, alignItems: 'center', gap: 4 },
  criticAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  criticStar: { borderColor: colors.orange },
  criticInitial: { fontSize: 28, color: colors.blue },
  chefPhoto: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.surface },
  chefNoPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  chefName: { fontSize: 13, textAlign: 'center' },
  chefPlace: { fontSize: 11.5, color: colors.muted, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, rowGap: 12 },
  mood: { width: '20%', alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  moodIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  moodEmoji: { fontSize: 28, lineHeight: 34 },
  moodLabel: { fontSize: 11.5, lineHeight: 15, textAlign: 'center' },
  moreIcon: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B8C8F0' },
  moreCount: { fontSize: 18, color: colors.blue },
  skeleton: { backgroundColor: colors.surface },
  error: { marginHorizontal: 16, fontSize: 14, color: colors.muted },
  featuredRow: { paddingHorizontal: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginEnd: 16 },
  sectionTitleInline: { flexShrink: 1 },
  sectionLink: { fontSize: 13.5, color: colors.green },
  healthyCard: {
    width: 160,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  healthyPhoto: { width: '100%', height: 110, backgroundColor: colors.surface },
  healthyNoPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenTint },
  healthyLeaf: { fontSize: 34, lineHeight: 42 },
  healthyName: { fontSize: 14 },
  healthyPrice: { fontSize: 13.5, color: colors.green, marginTop: 2 },
  featured: { width: 230, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  featuredPhoto: { width: '100%', height: 130, backgroundColor: colors.surface },
  featuredNoPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  sponsored: { position: 'absolute', top: 8, start: 8, backgroundColor: 'rgba(31,22,64,0.78)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sponsoredText: { color: colors.white, fontSize: 10.5 },
  featuredBody: { padding: 10, gap: 2 },
  featuredName: { fontSize: 15 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredMetaText: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,22,64,0.45)' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sheetTitle: { fontSize: 20, marginHorizontal: 16, marginBottom: 6 },
  groupTitle: { fontSize: 13, color: colors.mutedIcon, marginHorizontal: 16, marginTop: 14, marginBottom: 10 },
});
