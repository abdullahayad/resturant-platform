import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { ChipSelect } from '../components/ChipSelect';
import { useAuth } from '../lib/AuthContext';
import { api, type Dish, type MasterDataItem } from '../lib/api';

const emptyForm = { nameEn: '', nameAr: '', price: '', categoryId: null as string | null, photoUrl: '', isMostOrdered: false };

export function MenuManagementScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<MasterDataItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([api.myDishes(token), api.menuCategories()])
      .then(([d, c]) => {
        setDishes(d);
        setCategories(c);
      })
      .catch(() => setLoadError('Could not reach the server. Is the backend running on localhost:3000?'));
  }, [token]);

  useEffect(loadAll, [loadAll]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
  };

  const startEdit = (dish: Dish) => {
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
    setUploadingPhoto(true);
    try {
      const { url } = await api.uploadFile(token, {
        uri: asset.uri,
        name: asset.fileName ?? 'dish.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async () => {
    setFormError(null);
    const price = Number(form.price);
    if (!form.nameEn.trim() || !form.nameAr.trim() || !price || price <= 0) {
      setFormError('Name (EN/AR) and a valid price are required.');
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
      setFormError(err instanceof Error ? err.message : 'Save failed');
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Menu Management</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? 'Edit Dish' : 'Add Dish'}</Text>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <FormField label="Name (English)" value={form.nameEn} onChangeText={(v) => setForm((f) => ({ ...f, nameEn: v }))} />
          </View>
          <View style={styles.flex1}>
            <FormField label="Name (Arabic)" value={form.nameAr} onChangeText={(v) => setForm((f) => ({ ...f, nameAr: v }))} />
          </View>
        </View>

        <FormField
          label="Price (IQD)"
          value={form.price}
          onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
          keyboardType="numeric"
          placeholder="10000"
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <ChipSelect
          options={categories.map((c) => ({ id: c.id, label: c.nameEn }))}
          selectedIds={form.categoryId ? [form.categoryId] : []}
          onToggle={(id) => setForm((f) => ({ ...f, categoryId: id === f.categoryId ? null : id }))}
        />

        <View style={styles.photoRow}>
          {form.photoUrl ? (
            <Image source={{ uri: form.photoUrl }} style={styles.photoPreview} />
          ) : (
            <View style={[styles.photoPreview, styles.photoPlaceholder]}>
              <Text style={styles.hint}>No photo</Text>
            </View>
          )}
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={pickPhoto} disabled={uploadingPhoto}>
            {uploadingPhoto ? <ActivityIndicator color={colors.foreground} /> : <Text style={styles.secondaryButtonText}>Choose Photo</Text>}
          </Pressable>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>Most Ordered</Text>
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
              <Text style={styles.primaryButtonText}>{editingId ? 'Save Changes' : 'Add Dish'}</Text>
            )}
          </Pressable>
          {editingId && (
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={resetForm}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.grid}>
        {dishes.map((dish) => (
          <View key={dish.id} style={styles.dishCard}>
            {dish.photoUrl ? (
              <Image source={{ uri: dish.photoUrl }} style={styles.dishImage} />
            ) : (
              <View style={[styles.dishImage, styles.photoPlaceholder]} />
            )}
            <View style={styles.dishBody}>
              <Text style={styles.dishName}>{dish.nameEn} · {dish.nameAr}</Text>
              <Text style={styles.dishMeta}>
                {dish.menuCategory?.nameEn ?? 'Uncategorized'} · {Number(dish.price).toLocaleString()} IQD
              </Text>
              {dish.isMostOrdered && <Text style={styles.badge}>Most Ordered</Text>}
              <View style={styles.dishActions}>
                <Pressable onPress={() => startEdit(dish)}>
                  <Text style={styles.link}>Edit</Text>
                </Pressable>
                {confirmDeleteId === dish.id ? (
                  <View style={styles.row}>
                    <Pressable onPress={() => remove(dish.id)}>
                      <Text style={[styles.link, styles.destructiveLink]}>Confirm</Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmDeleteId(null)}>
                      <Text style={styles.link}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => setConfirmDeleteId(dish.id)}>
                    <Text style={[styles.link, styles.destructiveLink]}>Delete</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        ))}
        {dishes.length === 0 && !loadError && <Text style={styles.hint}>No dishes yet.</Text>}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  error: { color: colors.destructive, fontSize: 13 },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dishCard: {
    width: 220,
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
  link: { color: colors.mutedForeground, fontSize: 13, marginRight: 12 },
  destructiveLink: { color: colors.destructive },
});
