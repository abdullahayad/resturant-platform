import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { ChipSelect } from '../components/ChipSelect';
import { EmptyState } from '../components/EmptyState';
import { UtensilsCrossed } from 'lucide-react-native';
import { radii, cardShadow } from '../theme/tokens';
import { useAuth } from '../lib/AuthContext';
import { resizeForUpload } from '../lib/resizeImage';
import { localizedName } from '../lib/localizedName';
import { useLanguage } from '../i18n/LanguageContext';
import { api, type Dish, type MasterDataItem } from '../lib/api';

const emptyForm = { nameEn: '', nameAr: '', price: '', categoryId: null as string | null, photoUrl: '', isMostOrdered: false };

const CARD_WIDTH = 220;
const CARD_GAP = 12;

export function MenuManagementScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation('menu');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const numColumns = Math.max(1, Math.floor(width / (CARD_WIDTH + CARD_GAP)));

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<MasterDataItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([api.myDishes(token), api.menuCategories()])
      .then(([d, c]) => {
        setDishes(d);
        setCategories(c);
      })
      .catch(() => setLoadError(t('common:networkError')));
  }, [token, t]);

  useEffect(loadAll, [loadAll]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
    setLocalPhotoPreview(null);
  };

  const startEdit = (dish: Dish) => {
    setLocalPhotoPreview(null);
    setEditingId(dish.id);
    setForm({
      nameEn: dish.nameEn,
      nameAr: dish.nameAr,
      price: dish.price,
      categoryId: dish.menuCategory?.id ?? null,
      photoUrl: dish.photoUrl ?? '',
      isMostOrdered: dish.isMostOrdered,
    });
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // Show the picked photo immediately from the device's own copy — the
    // upload round-trip (device -> backend -> R2) can take several seconds,
    // and waiting for that before showing anything reads as "nothing
    // happened" rather than "uploading".
    setLocalPhotoPreview(asset.uri);
    setUploadingPhoto(true);
    try {
      const resizedUri = await resizeForUpload(asset.uri, asset.width, asset.height);
      const wasResized = resizedUri !== asset.uri;
      const { url } = await api.uploadFile(token, {
        uri: resizedUri,
        name: asset.fileName ?? 'dish.jpg',
        type: wasResized ? 'image/jpeg' : (asset.mimeType ?? 'image/jpeg'),
      });
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('photoUploadFailed'));
      setLocalPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async () => {
    setFormError(null);
    const price = Number(form.price);
    if (
      !form.nameEn.trim() ||
      !form.nameAr.trim() ||
      !price ||
      price <= 0 ||
      !form.categoryId ||
      !form.photoUrl
    ) {
      setFormError(t('validation'));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        nameEn: form.nameEn,
        nameAr: form.nameAr,
        price,
        menuCategoryId: form.categoryId ?? undefined,
        photoUrl: form.photoUrl || undefined,
        isMostOrdered: form.isMostOrdered,
      };
      if (editingId) {
        const updated = await api.updateDish(token, editingId, payload);
        setDishes((prev) => prev.map((d) => (d.id === editingId ? updated : d)));
      } else {
        const created = await api.createDish(token, payload);
        setDishes((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    await api.deleteDish(token, id);
    setDishes((prev) => prev.filter((d) => d.id !== id));
    setConfirmDeleteId(null);
    if (editingId === id) resetForm();
  };

  const renderDish = ({ item: dish }: { item: Dish }) => (
    <View style={styles.dishCard}>
      {dish.photoUrl ? (
        <Image source={{ uri: dish.photoUrl }} style={styles.dishImage} />
      ) : (
        <View style={[styles.dishImage, styles.photoPlaceholder]} />
      )}
      <View style={styles.dishBody}>
        <Text style={styles.dishName}>{dish.nameEn} · {dish.nameAr}</Text>
        <Text style={styles.dishMeta}>
          {dish.menuCategory ? localizedName(dish.menuCategory, language) : t('uncategorized')} · {Number(dish.price).toLocaleString()} IQD
        </Text>
        {dish.isMostOrdered && <Text style={styles.badge}>{t('mostOrdered')}</Text>}
        <View style={styles.dishActions}>
          <Pressable onPress={() => startEdit(dish)}>
            <Text style={styles.link}>{t('edit')}</Text>
          </Pressable>
          {confirmDeleteId === dish.id ? (
            <View style={styles.row}>
              <Pressable onPress={() => remove(dish.id)}>
                <Text style={[styles.link, styles.destructiveLink]}>{t('confirm')}</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmDeleteId(null)}>
                <Text style={styles.link}>{t('cancel')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDeleteId(dish.id)}>
              <Text style={[styles.link, styles.destructiveLink]}>{t('delete')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      key={numColumns}
      data={dishes}
      keyExtractor={(dish) => dish.id}
      renderItem={renderDish}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View style={styles.headerGroup}>
          <Text style={styles.title}>{t('title')}</Text>
          {loadError && <Text style={styles.error}>{loadError}</Text>}

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? t('editDish') : t('addDish')}</Text>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField label={t('nameEnLabel')} value={form.nameEn} onChangeText={(v) => setForm((f) => ({ ...f, nameEn: v }))} />
              </View>
              <View style={styles.flex1}>
                <FormField label={t('nameArLabel')} value={form.nameAr} onChangeText={(v) => setForm((f) => ({ ...f, nameAr: v }))} />
              </View>
            </View>

            <FormField
              label={t('priceLabel')}
              value={form.price}
              onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
              keyboardType="numeric"
              placeholder="10000"
            />

            <Text style={styles.fieldLabel}>{t('category')}</Text>
            <ChipSelect
              options={categories.map((c) => ({ id: c.id, label: localizedName(c, language) }))}
              selectedIds={form.categoryId ? [form.categoryId] : []}
              onToggle={(id) => setForm((f) => ({ ...f, categoryId: id === f.categoryId ? null : id }))}
            />

            <View style={styles.photoRow}>
              {localPhotoPreview || form.photoUrl ? (
                <Image source={{ uri: localPhotoPreview ?? form.photoUrl }} style={styles.photoPreview} />
              ) : (
                <View style={[styles.photoPreview, styles.photoPlaceholder]}>
                  <Text style={styles.hint}>{t('noPhoto')}</Text>
                </View>
              )}
              <Pressable style={[styles.button, styles.secondaryButton]} onPress={pickPhoto} disabled={uploadingPhoto}>
                {uploadingPhoto ? <ActivityIndicator color={colors.foreground} /> : <Text style={styles.secondaryButtonText}>{t('choosePhoto')}</Text>}
              </Pressable>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>{t('mostOrdered')}</Text>
              <Switch
                value={form.isMostOrdered}
                onValueChange={(v) => setForm((f) => ({ ...f, isMostOrdered: v }))}
                trackColor={{ true: colors.primary, false: colors.secondary }}
              />
            </View>

            {formError && <Text style={styles.error}>{formError}</Text>}

            <View style={styles.row}>
              <Pressable style={[styles.button, styles.primaryButton, styles.flex1]} onPress={submit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.primaryButtonText}>{editingId ? t('saveChanges') : t('addDish')}</Text>
                )}
              </Pressable>
              {editingId && (
                <Pressable style={[styles.button, styles.secondaryButton]} onPress={resetForm}>
                  <Text style={styles.secondaryButtonText}>{t('cancel')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={!loadError ? <EmptyState icon={UtensilsCrossed} message={t('noDishesYet')} /> : null}
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 24 },
  headerGroup: { gap: 20 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  error: { color: colors.destructive, fontSize: 13 },
  formCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
    ...cardShadow,
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  fieldLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.mutedForeground },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPreview: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.secondary },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.foreground, fontWeight: '600', fontSize: 13 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  dishCard: {
    width: CARD_WIDTH,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  dishImage: { width: '100%', height: 120, backgroundColor: colors.secondary },
  dishBody: { padding: 12, gap: 4 },
  dishName: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  dishMeta: { color: colors.mutedForeground, fontSize: 12 },
  badge: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  dishActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  link: { color: colors.mutedForeground, fontSize: 13 },
  destructiveLink: { color: colors.destructive },
});
