import { router } from 'expo-router';
import { ChevronDown, MapPin, Search, Star, Utensils } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { api, type Mood, type MoodGroup, type RestaurantCard } from '../../src/lib/api';
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

  // Pull-to-refresh only; the first load happens in the effect below.
  const load = useCallback(async () => {
    try {
      setMoods(await api.moods());
      setFailed(false);
      setFeatured(await api.featured());
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
          <Pressable style={styles.location} accessibilityRole="button" accessibilityLabel={t('home.chooseArea')}>
            <View style={styles.row}>
              <MapPin size={20} color={colors.orange} fill={colors.orange} stroke={colors.peach} />
              <AppText weight="bold" style={styles.city}>
                {t('home.city')}
              </AppText>
              <ChevronDown size={16} color={colors.text} />
            </View>
            <AppText style={styles.area}>{t('home.chooseArea')}</AppText>
          </Pressable>

          <Pressable style={styles.search} onPress={() => router.push('/explore')} accessibilityRole="search">
            <Search size={20} color={colors.orange} strokeWidth={2.2} />
            <AppText style={styles.searchHint}>{t('home.searchHint')}</AppText>
          </Pressable>
        </View>

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
      </ScrollView>

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
  location: { alignSelf: 'flex-start', minHeight: 44 },
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
