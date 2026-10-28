import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { ArrowUpDown, Check, MapPin, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { RestaurantCard } from '../../src/components/RestaurantCard';
import { api, type DiscoverQuery, type DiscoverSort, type NamedRef, type RestaurantCard as Card } from '../../src/lib/api';
import { colors, fonts, TAB_BAR_SPACE } from '../../src/theme';

const SEARCH_DELAY_MS = 350;
const SORTS: DiscoverSort[] = ['recommended', 'rating', 'newest'];
// "Nearest" only makes sense once Near me has the phone's location.
const SORTS_NEAR: DiscoverSort[] = ['nearest', ...SORTS];

interface Results {
  key: string;
  items: Card[];
  total: number;
  page: number;
  failed: boolean;
}

export default function ExploreScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ moodId?: string; moodName?: string }>();
  const moodId = params.moodId || undefined;

  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<DiscoverSort>('recommended');
  const [openNow, setOpenNow] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [cuisineIds, setCuisineIds] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<NamedRef[]>([]);
  const [sortOpen, setSortOpen] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<Card>>(null);

  const query = useMemo<DiscoverQuery>(
    () => ({
      q: q || undefined,
      sort,
      openNow,
      offersOnly,
      foodCategoryIds: cuisineIds,
      moodId,
      lat: point?.lat,
      lng: point?.lng,
    }),
    [q, sort, openNow, offersOnly, cuisineIds, moodId, point],
  );
  // Results belong to the filters they were fetched for; while the
  // filters have moved on, the screen shows the loading state instead.
  const key = JSON.stringify(query);
  const current = results?.key === key ? results : null;

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    let cancelled = false;
    api
      .foodCategories()
      .then((list) => {
        if (!cancelled) setCuisines(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchFirstPage = useCallback(
    () =>
      api.restaurants({ ...query, page: 1 }).then(
        (page): Results => ({ key, items: page.items, total: page.total, page: 1, failed: false }),
        (): Results => ({ key, items: [], total: 0, page: 1, failed: true }),
      ),
    [query, key],
  );

  useEffect(() => {
    let cancelled = false;
    fetchFirstPage().then((r) => {
      if (!cancelled) {
        setResults(r);
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchFirstPage]);

  const refresh = async () => {
    setRefreshing(true);
    setResults(await fetchFirstPage());
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!current || loadingMore || current.items.length >= current.total) return;
    setLoadingMore(true);
    try {
      const next = await api.restaurants({ ...query, page: current.page + 1 });
      setResults((prev) =>
        prev?.key === key ? { ...prev, items: [...prev.items, ...next.items], page: next.page } : prev,
      );
    } catch {
      // The next scroll to the bottom simply tries again.
    } finally {
      setLoadingMore(false);
    }
  };

  // Asks for the location only when the customer taps Near me, and only
  // while the app is open (no background location, see app.json).
  const toggleNearMe = async () => {
    if (point) {
      setPoint(null);
      if (sort === 'nearest') setSort('recommended');
      return;
    }
    setLocating(true);
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
    } finally {
      setLocating(false);
    }
  };

  const name = (x: NamedRef) => (i18n.language === 'ar' ? x.nameAr : x.nameEn);
  const toggleCuisine = (id: string) =>
    setCuisineIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const clearMood = () => router.setParams({ moodId: '', moodName: '' });
  const hasFilters = !!moodId || openNow || offersOnly || cuisineIds.length > 0 || !!q;
  const clearAll = () => {
    setText('');
    setQ('');
    setOpenNow(false);
    setOffersOnly(false);
    setCuisineIds([]);
    if (moodId) clearMood();
  };

  const chip = (label: string, active: boolean, onPress: () => void, keyName: string) => (
    <Pressable
      key={keyName}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {active && <Check size={14} color={colors.orangeDark} strokeWidth={2.6} />}
      <AppText weight="semibold" style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </AppText>
    </Pressable>
  );

  const header = (
    <View style={styles.header}>
      <AppText weight="bold" style={styles.title}>
        {t('tabs.explore')}
      </AppText>
      <View style={styles.search}>
        <Search size={20} color={colors.orange} strokeWidth={2.2} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('home.searchHint')}
          placeholderTextColor={colors.mutedIcon}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => setQ(text.trim())}
          accessibilityLabel={t('explore.search')}
        />
        {!!text && (
          <Pressable onPress={() => setText('')} hitSlop={10} accessibilityLabel={t('explore.clearSearch')}>
            <X size={18} color={colors.mutedIcon} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Pressable style={[styles.chip, styles.sortChip]} onPress={() => setSortOpen(true)} accessibilityRole="button">
          <ArrowUpDown size={14} color={colors.blue} strokeWidth={2.4} />
          <AppText weight="semibold" style={[styles.chipText, { color: colors.blue }]}>
            {t(`explore.sort.${sort}`)}
          </AppText>
        </Pressable>
        <Pressable
          style={[styles.chip, !!point && styles.chipActive]}
          onPress={toggleNearMe}
          disabled={locating}
          accessibilityRole="button"
          accessibilityState={{ selected: !!point }}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : (
            <MapPin size={14} color={point ? colors.orangeDark : colors.text} strokeWidth={2.4} />
          )}
          <AppText weight="semibold" style={[styles.chipText, !!point && styles.chipTextActive]}>
            {t('explore.nearMe')}
          </AppText>
        </Pressable>
        {chip(t('explore.openNow'), openNow, () => setOpenNow((v) => !v), 'open')}
        {chip(t('explore.offersOnly'), offersOnly, () => setOffersOnly((v) => !v), 'offers')}
        {cuisines.map((c) => chip(name(c), cuisineIds.includes(c.id), () => toggleCuisine(c.id), c.id))}
      </ScrollView>

      {(!!moodId || current) && (
        <View style={styles.summary}>
          {!!moodId && (
            <Pressable style={styles.moodChip} onPress={clearMood} accessibilityLabel={t('explore.clearMood')}>
              <AppText weight="semibold" style={styles.moodChipText}>
                {params.moodName || t('explore.mood')}
              </AppText>
              <X size={14} color={colors.white} strokeWidth={2.6} />
            </Pressable>
          )}
          {current && !current.failed && (
            <AppText style={styles.count}>{t('explore.results', { n: current.total })}</AppText>
          )}
        </View>
      )}
    </View>
  );

  const empty = !current ? (
    <View style={styles.skeletons}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.skeleton} />
      ))}
    </View>
  ) : (
    <View style={styles.empty}>
      <AppText weight="bold" style={styles.emptyTitle}>
        {current.failed ? t('explore.errorTitle') : t('explore.emptyTitle')}
      </AppText>
      <AppText style={styles.emptyText}>{current.failed ? t('explore.errorText') : t('explore.emptyText')}</AppText>
      {!current.failed && hasFilters && (
        <Pressable style={styles.clearAll} onPress={clearAll} accessibilityRole="button">
          <AppText weight="bold" style={styles.clearAllText}>
            {t('explore.clearAll')}
          </AppText>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header}
      <FlatList
        ref={listRef}
        data={current?.items ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
        ListEmptyComponent={empty}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.orange} style={styles.more} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} />}
      />

      <Modal visible={sortOpen} transparent animationType="slide" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortOpen(false)} accessibilityLabel={t('home.close')} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <AppText weight="bold" style={styles.sheetTitle}>
            {t('explore.sortBy')}
          </AppText>
          {(point ? SORTS_NEAR : SORTS).map((s) => (
            <Pressable
              key={s}
              style={styles.sortRow}
              onPress={() => {
                setSort(s);
                setSortOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: sort === s }}
            >
              <AppText weight={sort === s ? 'bold' : 'regular'} style={styles.sortText}>
                {t(`explore.sort.${s}`)}
              </AppText>
              {sort === s && <Check size={20} color={colors.orange} strokeWidth={2.6} />}
            </Pressable>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 8, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  title: { fontSize: 26, marginHorizontal: 16 },
  search: {
    height: 50,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipActive: { backgroundColor: colors.peach, borderColor: colors.orange },
  sortChip: { backgroundColor: colors.blueTint, borderColor: colors.blueTint },
  chipText: { fontSize: 13.5, color: colors.text },
  chipTextActive: { color: colors.orangeDark },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16 },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navy,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  moodChipText: { color: colors.white, fontSize: 13 },
  count: { fontSize: 13, color: colors.muted },
  list: { padding: 16, gap: 14, flexGrow: 1 },
  skeletons: { gap: 14 },
  skeleton: { height: 260, borderRadius: 20, backgroundColor: colors.surface },
  more: { marginVertical: 12 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  clearAll: { marginTop: 10, backgroundColor: colors.orange, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 11 },
  clearAllText: { color: colors.white, fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,22,64,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20 },
  sheetTitle: { fontSize: 20, marginHorizontal: 16, marginBottom: 6 },
  sortRow: {
    minHeight: 54,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortText: { fontSize: 16 },
});
