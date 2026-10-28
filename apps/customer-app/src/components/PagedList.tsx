import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Paginated } from '../lib/api';
import { colors, TAB_BAR_SPACE } from '../theme';
import { AppText } from './AppText';

interface Loaded<T> {
  key: string;
  items: T[];
  total: number;
  page: number;
  failed: boolean;
}

// A scrolling list fed page by page from the server: skeletons while the
// first page loads, pull to refresh, more as you scroll, and friendly
// empty / no-connection messages. Change reloadKey to start over (e.g.
// when a filter changes).
export function PagedList<T extends { id: string }>({
  load,
  renderItem,
  reloadKey = '',
  header,
  numColumns = 1,
  emptyTitle,
  emptyText,
}: {
  load: (page: number) => Promise<Paginated<T>>;
  renderItem: (item: T) => ReactElement;
  reloadKey?: string;
  header?: ReactElement;
  numColumns?: number;
  emptyTitle: string;
  emptyText: string;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Loaded<T> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // The latest load function, without making every render a new request.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const first = useCallback(
    (): Promise<Loaded<T>> =>
      loadRef.current(1).then(
        (p) => ({ key: reloadKey, items: p.items, total: p.total, page: 1, failed: false }),
        () => ({ key: reloadKey, items: [], total: 0, page: 1, failed: true }),
      ),
    [reloadKey],
  );

  useEffect(() => {
    let cancelled = false;
    first().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [first]);

  const current = data?.key === reloadKey ? data : null;

  const refresh = async () => {
    setRefreshing(true);
    setData(await first());
    setRefreshing(false);
  };

  const more = async () => {
    if (!current || loadingMore || current.items.length >= current.total) return;
    setLoadingMore(true);
    try {
      const next = await loadRef.current(current.page + 1);
      setData((prev) =>
        prev?.key === reloadKey ? { ...prev, items: [...prev.items, ...next.items], page: next.page } : prev,
      );
    } catch {
      // The next scroll to the bottom simply tries again.
    } finally {
      setLoadingMore(false);
    }
  };

  const empty = !current ? (
    <View style={styles.skeletons}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeleton} />
      ))}
    </View>
  ) : (
    <View style={styles.empty}>
      <AppText weight="bold" style={styles.emptyTitle}>
        {current.failed ? t('explore.errorTitle') : emptyTitle}
      </AppText>
      <AppText style={styles.emptyText}>{current.failed ? t('explore.errorText') : emptyText}</AppText>
    </View>
  );

  return (
    <FlatList
      data={current?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderItem(item)}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.orange} style={styles.more} /> : null}
      onEndReached={more}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 14, flexGrow: 1 },
  row: { gap: 12 },
  skeletons: { gap: 14 },
  skeleton: { height: 140, borderRadius: 20, backgroundColor: colors.surface },
  more: { marginVertical: 12 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 18, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
