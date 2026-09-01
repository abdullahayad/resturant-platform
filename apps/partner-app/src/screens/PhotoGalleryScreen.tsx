import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ImageOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { ChipSelect } from '../components/ChipSelect';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../lib/AuthContext';
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

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [album, setAlbum] = useState<GalleryAlbum>('FOOD');
  const [foodTab, setFoodTab] = useState<string>('ALL');
  const [ambienceTab, setAmbienceTab] = useState<AmbienceSubCategory>('OUTDOOR');
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([api.gallery(token), api.myDishes(token)])
      .then(([p, d]) => {
        setPhotos(p);
        setDishes(d);
      })
      .catch(() => setLoadError(t('common:networkError')));
  }, [token, t]);

  useEffect(loadAll, [loadAll]);

  const foodCategoryTabs = useMemo(() => {
    const seen = new Map<string, { label: string; sortOrder: number }>();
    dishes.forEach((d) => {
      if (d.menuCategory) {
        seen.set(d.menuCategory.id, { label: d.menuCategory.nameEn, sortOrder: d.menuCategory.sortOrder ?? 0 });
      }
    });
    return Array.from(seen, ([id, { label, sortOrder }]) => ({ id, label, sortOrder })).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  }, [dishes]);

  const foodPhotos = useMemo(() => {
    const list = photos.filter((p) => p.album === 'FOOD');
    if (foodTab === 'ALL') return list;
    if (foodTab === 'MOST_ORDERED') return list.filter((p) => p.dish?.isMostOrdered);
    return list.filter((p) => p.dish?.menuCategory?.id === foodTab);
  }, [photos, foodTab]);

  const menuPhotos = useMemo(() => photos.filter((p) => p.album === 'MENU'), [photos]);
  const ambiencePhotos = useMemo(
    () => photos.filter((p) => p.album === 'AMBIENCE' && p.ambienceSubCategory === ambienceTab),
    [photos, ambienceTab],
  );
  const reviewPhotos = useMemo(() => photos.filter((p) => p.album === 'REVIEW'), [photos]);

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
      const { url } = await api.uploadFile(token, {
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
      await api.addGalleryPhoto(token, {
        album,
        url,
        dishId: album === 'FOOD' ? (selectedDishId ?? undefined) : undefined,
        ambienceSubCategory: album === 'AMBIENCE' ? ambienceTab : undefined,
      });
      loadAll();
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

  const activeList =
    album === 'FOOD' ? foodPhotos : album === 'MENU' ? menuPhotos : album === 'AMBIENCE' ? ambiencePhotos : reviewPhotos;

  const renderPhoto = ({ item: photo }: { item: GalleryPhoto }) => (
    <View style={styles.photoCard}>
      <Image source={{ uri: photo.url }} style={styles.photoImage} />
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
        !localPreview ? (
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
});
