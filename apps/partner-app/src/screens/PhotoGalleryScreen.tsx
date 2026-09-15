import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ImageOff, Star } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { ChipSelect } from '../components/ChipSelect';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../lib/AuthContext';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { resizeForUpload } from '../lib/resizeImage';
import { localizedName } from '../lib/localizedName';
import { useLanguage } from '../i18n/LanguageContext';
import {
  api,
  type AmbienceSubCategory,
  type Dish,
  type GalleryAlbum,
  type GalleryPhoto,
} from '../lib/api';

const CARD_WIDTH = 160;
const CARD_GAP = 12;

export function PhotoGalleryScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation('gallery');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const numColumns = Math.max(1, Math.floor(width / (CARD_WIDTH + CARD_GAP)));
  const albumTabs: { key: GalleryAlbum; label: string }[] = [
    { key: 'FOOD', label: t('tabs.food') },
    { key: 'MENU', label: t('tabs.menu') },
    { key: 'AMBIENCE', label: t('tabs.ambience') },
    { key: 'REVIEW', label: t('tabs.review') },
  ];
  const ambienceTabs: { key: AmbienceSubCategory; label: string }[] = [
    { key: 'OUTDOOR', label: t('ambienceTabs.outdoor') },
    { key: 'INDOOR', label: t('ambienceTabs.indoor') },
    { key: 'OTHER', label: t('ambienceTabs.other') },
  ];

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [album, setAlbum] = useState<GalleryAlbum>('FOOD');
  const [foodTab, setFoodTab] = useState<string>('ALL');
  const [ambienceTab, setAmbienceTab] = useState<AmbienceSubCategory>('OUTDOOR');
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingCoverId, setTogglingCoverId] = useState<string | null>(null);

  // Fetches exactly the current tab's slice (paginated), refetching from
  // page 1 whenever the album or one of its sub-filters changes - replaced
  // fetching every photo once and slicing it client-side into 4 tabs at
  // once, which stopped showing a tab's real content once a restaurant had
  // enough photos that it wasn't all on the first fetch.
  const fetchPage = useCallback(
    (page: number) =>
      api.gallery(
        token,
        album,
        {
          mostOrdered: album === 'FOOD' && foodTab === 'MOST_ORDERED',
          menuCategoryId: album === 'FOOD' && foodTab !== 'ALL' && foodTab !== 'MOST_ORDERED' ? foodTab : undefined,
          ambienceSubCategory: album === 'AMBIENCE' ? ambienceTab : undefined,
        },
        page,
      ),
    [token, album, foodTab, ambienceTab],
  );
  const {
    items: activeList,
    setItems: setPhotos,
    loading,
    loadingMore,
    error: photosError,
    reload,
    loadMore,
  } = usePaginatedList(fetchPage);

  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    // The "add to dish" picker and the food-category tabs both need every
    // dish at once, unlike the (paginated) photo list above.
    api.myDishes(token).then(setDishes).catch(() => setLoadError(t('common:networkError')));
  }, [token, t]);
  useEffect(() => {
    if (photosError) setLoadError(t('common:networkError'));
  }, [photosError, t]);

  const foodCategoryTabs = useMemo(() => {
    const seen = new Map<string, { label: string; sortOrder: number }>();
    dishes.forEach((d) => {
      if (d.menuCategory) {
        seen.set(d.menuCategory.id, { label: localizedName(d.menuCategory, language), sortOrder: d.menuCategory.sortOrder ?? 0 });
      }
    });
    return Array.from(seen, ([id, { label, sortOrder }]) => ({ id, label, sortOrder })).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  }, [dishes, language]);

  const addPhoto = async () => {
    setError(null);
    if (album === 'FOOD' && !selectedDishId) {
      setError(t('pickDishFirst'));
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // Show the picked photo immediately from the device's own copy — the
    // upload round-trip (device -> backend -> R2) can take several seconds,
    // and waiting for that before showing anything reads as "nothing
    // happened" rather than "uploading".
    setLocalPreview(asset.uri);
    setUploading(true);
    try {
      const resizedUri = await resizeForUpload(asset.uri, asset.width, asset.height);
      const wasResized = resizedUri !== asset.uri;
      const { url } = await api.uploadFile(token, {
        uri: resizedUri,
        name: asset.fileName ?? 'photo.jpg',
        type: wasResized ? 'image/jpeg' : (asset.mimeType ?? 'image/jpeg'),
      });
      await api.addGalleryPhoto(token, {
        album,
        url,
        dishId: album === 'FOOD' ? (selectedDishId ?? undefined) : undefined,
        ambienceSubCategory: album === 'AMBIENCE' ? ambienceTab : undefined,
      });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setUploading(false);
      setLocalPreview(null);
    }
  };

  const removePhoto = async (id: string) => {
    await api.deleteGalleryPhoto(token, id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Patches the toggled photo (and un-marks whatever else was cover) in
  // place, deliberately *not* reload()ing - the backend sorts the cover
  // first, so reloading here would resort the whole grid the instant a
  // star is tapped, moving that photo to slot #1 mid-interaction. That
  // made it look like the wrong photo got starred (it was always "whatever
  // just became slot #1") when picking a cover among several photos. The
  // real reorder still happens next time this tab is opened/refetched -
  // just not while the owner is actively comparing photos.
  //
  // The star flips *before* the request goes out (optimistic), not after
  // it resolves - waiting for the network round-trip first was the visible
  // lag between tapping and the star actually appearing. On failure this
  // re-syncs from the server instead of trying to hand-compute an undo.
  const toggleCover = async (photo: GalleryPhoto) => {
    const next = !photo.isCover;
    setTogglingCoverId(photo.id);
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === photo.id) return { ...p, isCover: next };
        return next && p.isCover ? { ...p, isCover: false } : p;
      }),
    );
    try {
      await api.setGalleryCover(token, photo.id, next);
    } catch {
      setError(t('common:networkError'));
      reload();
    } finally {
      setTogglingCoverId(null);
    }
  };

  const renderPhoto = ({ item: photo }: { item: GalleryPhoto }) => (
    <View style={styles.photoCard}>
      <Image source={{ uri: photo.url }} style={styles.photoImage} />
      {album !== 'REVIEW' && (
        <Pressable
          onPress={() => toggleCover(photo)}
          disabled={togglingCoverId === photo.id}
          style={styles.coverButton}
          hitSlop={8}
        >
          <Star
            size={16}
            color={colors.primary}
            fill={photo.isCover ? colors.primary : 'transparent'}
          />
        </Pressable>
      )}
      {photo.dish && <Text style={styles.photoCaption}>{photo.dish.nameEn}</Text>}
      {photo.album === 'REVIEW' && photo.caption && <Text style={styles.photoCaption}>{photo.caption}</Text>}
      <Pressable onPress={() => removePhoto(photo.id)}>
        <Text style={styles.removeLink}>{t('remove')}</Text>
      </Pressable>
    </View>
  );

  return (
    <FlatList
      key={numColumns}
      data={activeList}
      keyExtractor={(photo) => photo.id}
      renderItem={renderPhoto}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
      contentContainerStyle={styles.container}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerSpinner} color={colors.primary} /> : null}
      ListHeaderComponent={
        <View style={styles.headerGroup}>
          <Text style={styles.title}>{t('title')}</Text>
          {loadError && <Text style={styles.error}>{loadError}</Text>}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albumTabs}>
            {albumTabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setAlbum(tab.key)}
                style={[styles.albumTab, album === tab.key && styles.albumTabActive]}
              >
                <Text style={[styles.albumTabText, album === tab.key && styles.albumTabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {album === 'FOOD' && (
            <>
              <ChipSelect
                options={[
                  { id: 'ALL', label: t('foodFilters.all') },
                  { id: 'MOST_ORDERED', label: t('foodFilters.mostOrdered') },
                  ...foodCategoryTabs,
                ]}
                selectedIds={[foodTab]}
                onToggle={(id) => setFoodTab(id)}
              />
              <View style={styles.addRow}>
                <Text style={styles.fieldLabel}>{t('addToDish')}</Text>
                <ChipSelect
                  options={dishes.map((d) => ({ id: d.id, label: d.nameEn }))}
                  selectedIds={selectedDishId ? [selectedDishId] : []}
                  onToggle={(id) => setSelectedDishId(id === selectedDishId ? null : id)}
                />
              </View>
            </>
          )}

          {album === 'AMBIENCE' && (
            <ChipSelect
              options={ambienceTabs.map((tab) => ({ id: tab.key, label: tab.label }))}
              selectedIds={[ambienceTab]}
              onToggle={(id) => setAmbienceTab(id as AmbienceSubCategory)}
            />
          )}

          {/* REVIEW album has no upload flow — these photos only ever come
              from a customer's review, the restaurant can just browse/remove. */}
          {album === 'REVIEW' && <Text style={styles.fieldLabel}>{t('reviewPhotosHint')}</Text>}

          {error && <Text style={styles.error}>{error}</Text>}

          {album !== 'REVIEW' && (
            <Pressable style={[styles.button, styles.primaryButton]} onPress={addPhoto} disabled={uploading}>
              {uploading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>{t('addPhoto')}</Text>}
            </Pressable>
          )}

          {localPreview && (
            <View style={[styles.photoCard, styles.uploadingCard]}>
              <Image source={{ uri: localPreview }} style={styles.photoImage} />
              <View style={styles.photoUploadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        !localPreview && !loading ? (
          <EmptyState icon={ImageOff} message={album === 'REVIEW' ? t('noReviewPhotosYet') : t('noPhotosYet')} />
        ) : null
      }
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 16, paddingBottom: 24 },
  headerGroup: { gap: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  error: { color: colors.destructive, fontSize: 13 },
  fieldLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  albumTabs: { flexDirection: 'row', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 },
  albumTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  albumTabActive: { backgroundColor: colors.primaryTint15 },
  albumTabText: { color: colors.mutedForeground, fontSize: 14, fontWeight: '600' },
  albumTabTextActive: { color: colors.primary },
  addRow: { gap: 8 },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', alignSelf: 'flex-start' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  footerSpinner: { paddingVertical: 16 },
  photoCard: {
    position: 'relative',
    width: CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    padding: 8,
    gap: 4,
  },
  uploadingCard: { marginBottom: CARD_GAP },
  photoImage: { width: '100%', height: 120, borderRadius: 8, backgroundColor: colors.secondary },
  photoUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCaption: { fontSize: 12, color: colors.foreground },
  removeLink: { fontSize: 12, color: colors.destructive },
  coverButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
