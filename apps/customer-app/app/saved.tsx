import { router } from 'expo-router';
import { Bookmark, CloudDownload, Utensils } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../src/components/AppText';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { type HoursRow, type Named, type RestaurantPage } from '../src/lib/api';
import { baghdadNow, isOpenNow } from '../src/lib/format';
import { useDateLabels } from '../src/lib/useDateLabels';
import { useSaved } from '../src/lib/saved';
import { colors } from '../src/theme';

// Restaurants the customer bookmarked. Kept on the phone with a copy of
// each page, so the list and the pages open without internet.
export default function SavedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { items, remove } = useSaved();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('saved.title')} />
      <FlatList
        data={items}
        keyExtractor={(e) => e.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={
          <View style={styles.note}>
            <CloudDownload size={18} color={colors.blue} />
            <AppText weight="medium" style={styles.noteText}>
              {t('saved.offlineNote')}
            </AppText>
          </View>
        }
        renderItem={({ item }) => <SavedRow page={item.page} onRemove={() => remove(item.id)} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Bookmark size={32} color={colors.orange} strokeWidth={1.7} />
            </View>
            <AppText weight="bold" style={styles.emptyTitle}>
              {t('saved.emptyTitle')}
            </AppText>
            <AppText style={styles.emptyText}>{t('saved.emptyText')}</AppText>
            <Pressable style={styles.explore} onPress={() => router.navigate('/explore')} accessibilityRole="button">
              <AppText weight="bold" style={styles.exploreText}>
                {t('saved.explore')}
              </AppText>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function SavedRow({ page, onRemove }: { page: RestaurantPage; onRemove: () => void }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const name = (x: Named) => (ar ? x.nameAr : x.nameEn);
  const status = useOpenStatus(page.openingHours);
  const cover = page.galleryPhotos.find((p) => p.album === 'FOOD' || p.album === 'AMBIENCE')?.url ?? page.logoUrl;
  const meta = [page.foodCategories[0]?.foodCategory, page.district].filter((x): x is Named => !!x).map(name).join(' · ');

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.rowMain}
        onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: page.id } })}
        accessibilityRole="button"
      >
        {cover ? (
          <Image source={{ uri: cover }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Utensils size={24} color={colors.orange} strokeWidth={1.6} />
          </View>
        )}
        <View style={styles.rowText}>
          <AppText weight="bold" style={styles.name} numberOfLines={1}>
            {name(page)}
          </AppText>
          {!!meta && (
            <AppText style={styles.meta} numberOfLines={1}>
              {meta}
            </AppText>
          )}
          {status && (
            <AppText weight="semibold" style={[styles.status, { color: status.open ? colors.green : colors.muted }]}>
              {status.label}
            </AppText>
          )}
        </View>
      </Pressable>
      <Pressable style={styles.remove} onPress={onRemove} accessibilityRole="button" accessibilityLabel={t('saved.remove')}>
        <Bookmark size={20} color={colors.orange} fill={colors.orange} />
      </Pressable>
    </View>
  );
}

// "Open now", or when it opens next today ("Opens at 4:00 PM").
function useOpenStatus(hours: HoursRow[]): { open: boolean; label: string } | null {
  const { t } = useTranslation();
  const { timeLabel } = useDateLabels();
  const open = isOpenNow(hours);
  if (open === null) return null;
  if (open) return { open: true, label: t('explore.openNow') };
  const now = baghdadNow();
  const today = hours.find((h) => h.dayOfWeek === now.day);
  if (today && !today.isClosed && today.openTime && today.openTime > now.time) {
    return { open: false, label: t('saved.opensAt', { time: timeLabel(today.openTime) }) };
  }
  return { open: false, label: t('explore.closed') };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.blueTint, borderRadius: 12, padding: 12, marginBottom: 4 },
  noteText: { fontSize: 13, color: colors.blue, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  photo: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.surface },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  rowText: { flex: 1, gap: 3, minWidth: 0 },
  name: { fontSize: 16 },
  meta: { fontSize: 13, color: colors.muted },
  status: { fontSize: 13 },
  remove: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  explore: { marginTop: 6, height: 48, paddingHorizontal: 24, borderRadius: 14, backgroundColor: colors.navy, justifyContent: 'center' },
  exploreText: { color: colors.white, fontSize: 15 },
});
