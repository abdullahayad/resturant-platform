import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { ChipSelect } from '../components/ChipSelect';
import { useAuth } from '../lib/AuthContext';
import {
  api,
  type AmbienceSubCategory,
  type Dish,
  type GalleryAlbum,
  type GalleryPhoto,
} from '../lib/api';

const albumTabs: { key: GalleryAlbum; label: string }[] = [
  { key: 'FOOD', label: 'Food Album' },
  { key: 'MENU', label: 'Menu Album' },
  { key: 'AMBIENCE', label: 'Ambience Album' },
];

const ambienceTabs: { key: AmbienceSubCategory; label: string }[] = [
  { key: 'OUTDOOR', label: 'Outdoor' },
  { key: 'INDOOR', label: 'Indoor' },
  { key: 'OTHER', label: 'Other' },
];

export function PhotoGalleryScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [album, setAlbum] = useState<GalleryAlbum>('FOOD');
  const [foodTab, setFoodTab] = useState<string>('ALL');
  const [ambienceTab, setAmbienceTab] = useState<AmbienceSubCategory>('OUTDOOR');
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([api.gallery(token), api.myDishes(token)])
      .then(([p, d]) => {
        setPhotos(p);
        setDishes(d);
      })
      .catch(() => setLoadError('Could not reach the server. Is the backend running on localhost:3000?'));
  }, [token]);

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

  const addPhoto = async () => {
    setError(null);
    if (album === 'FOOD' && !selectedDishId) {
      setError('Pick a dish for this photo first.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
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
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (id: string) => {
    await api.deleteGalleryPhoto(token, id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const renderGrid = (list: GalleryPhoto[]) => (
    <View style={styles.grid}>
      {list.map((photo) => (
        <View key={photo.id} style={styles.photoCard}>
          <Image source={{ uri: photo.url }} style={styles.photoImage} />
          {photo.dish && <Text style={styles.photoCaption}>{photo.dish.nameEn}</Text>}
          <Pressable onPress={() => removePhoto(photo.id)}>
            <Text style={styles.removeLink}>Remove</Text>
          </Pressable>
        </View>
      ))}
      {list.length === 0 && <Text style={styles.hint}>No photos yet.</Text>}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Photo Gallery</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={styles.albumTabs}>
        {albumTabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setAlbum(tab.key)}
            style={[styles.albumTab, album === tab.key && styles.albumTabActive]}
          >
            <Text style={[styles.albumTabText, album === tab.key && styles.albumTabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {album === 'FOOD' && (
        <>
          <ChipSelect
            options={[
              { id: 'ALL', label: 'All Photos' },
              { id: 'MOST_ORDERED', label: 'Most Ordered' },
              ...foodCategoryTabs,
            ]}
            selectedIds={[foodTab]}
            onToggle={(id) => setFoodTab(id)}
          />
          <View style={styles.addRow}>
            <Text style={styles.fieldLabel}>Add to dish:</Text>
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
          options={ambienceTabs.map((t) => ({ id: t.key, label: t.label }))}
          selectedIds={[ambienceTab]}
          onToggle={(id) => setAmbienceTab(id as AmbienceSubCategory)}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, styles.primaryButton]} onPress={addPhoto} disabled={uploading}>
        {uploading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>Add Photo</Text>}
      </Pressable>

      {album === 'FOOD' && renderGrid(foodPhotos)}
      {album === 'MENU' && renderGrid(menuPhotos)}
      {album === 'AMBIENCE' && renderGrid(ambiencePhotos)}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 16, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  error: { color: colors.destructive, fontSize: 13 },
  hint: { fontSize: 12, color: colors.mutedForeground },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoCard: {
    width: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    padding: 8,
    gap: 4,
  },
  photoImage: { width: '100%', height: 120, borderRadius: 8, backgroundColor: colors.secondary },
  photoCaption: { fontSize: 12, color: colors.foreground },
  removeLink: { fontSize: 12, color: colors.destructive },
});
