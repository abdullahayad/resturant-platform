import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { ChipSelect } from '../components/ChipSelect';
import { useAuth } from '../lib/AuthContext';
import { api, type MasterDataItem, type Province, type RestaurantDetail, type Story } from '../lib/api';

export function ProfileInfoScreen() {
  const { token, restaurant, setRestaurant } = useAuth();

  const [detail, setDetail] = useState<RestaurantDetail | null>(null);
  const [businessTypes, setBusinessTypes] = useState<MasterDataItem[]>([]);
  const [foodCategories, setFoodCategories] = useState<MasterDataItem[]>([]);
  const [facilities, setFacilities] = useState<MasterDataItem[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [businessTypeIds, setBusinessTypeIds] = useState<string[]>([]);
  const [foodCategoryIds, setFoodCategoryIds] = useState<string[]>([]);
  const [facilityIds, setFacilityIds] = useState<string[]>([]);
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [storyCaption, setStoryCaption] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [uploadingStory, setUploadingStory] = useState(false);

  const loadAll = useCallback(() => {
    Promise.all([
      api.me(token),
      api.businessTypes(),
      api.foodCategories(),
      api.facilities(),
      api.provinces(),
      api.activeStories(token),
    ])
      .then(([me, bt, fc, fac, pr, st]) => {
        setDetail(me);
        setBusinessTypes(bt);
        setFoodCategories(fc);
        setFacilities(fac);
        setProvinces(pr);
        setStories(st);

        setNameEn(me.nameEn);
        setNameAr(me.nameAr);
        setPhone(me.phone);
        setBusinessTypeIds(me.businessTypes.map((b) => b.businessType.id));
        setFoodCategoryIds(me.foodCategories.map((f) => f.foodCategory.id));
        setFacilityIds(me.facilities.map((f) => f.facility.id));
        setProvinceId(me.province?.id ?? null);
        setDistrictId(me.district?.id ?? null);
        setLatitude(me.latitude != null ? String(me.latitude) : '');
        setLongitude(me.longitude != null ? String(me.longitude) : '');
      })
      .catch(() => setLoadError('Could not reach the server. Is the backend running on localhost:3000?'));
  }, [token]);

  useEffect(loadAll, [loadAll]);

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const selectedProvince = provinces.find((p) => p.id === provinceId);

  const handleSave = async () => {
    setSaveMessage(null);
    setSaving(true);
    try {
      const updated = await api.updateMe(token, {
        nameEn,
        nameAr,
        phone,
        provinceId: provinceId ?? undefined,
        districtId: districtId ?? undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        businessTypeIds,
        foodCategoryIds,
        facilityIds,
      });
      setDetail(updated);
      setRestaurant({ ...restaurant, nameEn: updated.nameEn, nameAr: updated.nameAr, codeNumber: updated.codeNumber });
      setSaveMessage('Saved.');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStory = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingStory(true);
    try {
      const { url } = await api.uploadFile(token, {
        uri: asset.uri,
        name: asset.fileName ?? 'story.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
      await api.createStory(token, url, 'photo', storyCaption || undefined);
      setStoryCaption('');
      const fresh = await api.activeStories(token);
      setStories(fresh);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Story upload failed');
    } finally {
      setUploadingStory(false);
    }
  };

  if (!detail && !loadError) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile & Info</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Information</Text>
        <FormField label="Restaurant name (English)" value={nameEn} onChangeText={setNameEn} />
        <FormField label="Restaurant name (Arabic)" value={nameAr} onChangeText={setNameAr} />
        <FormField label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.fieldLabel}>Business Types</Text>
        <ChipSelect
          options={businessTypes.map((b) => ({ id: b.id, label: b.nameEn }))}
          selectedIds={businessTypeIds}
          onToggle={(id) => toggle(businessTypeIds, setBusinessTypeIds, id)}
        />

        <Text style={styles.fieldLabel}>Food Categories</Text>
        <ChipSelect
          options={foodCategories.map((f) => ({ id: f.id, label: f.nameEn }))}
          selectedIds={foodCategoryIds}
          onToggle={(id) => toggle(foodCategoryIds, setFoodCategoryIds, id)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location & Map</Text>
        <Text style={styles.fieldLabel}>City</Text>
        <ChipSelect
          options={provinces.map((p) => ({ id: p.id, label: p.nameEn }))}
          selectedIds={provinceId ? [provinceId] : []}
          onToggle={(id) => {
            setProvinceId(id === provinceId ? null : id);
            setDistrictId(null);
          }}
        />
        {selectedProvince && (
          <>
            <Text style={styles.fieldLabel}>District</Text>
            <ChipSelect
              options={selectedProvince.districts.map((d) => ({ id: d.id, label: d.nameEn }))}
              selectedIds={districtId ? [districtId] : []}
              onToggle={(id) => setDistrictId(id === districtId ? null : id)}
            />
          </>
        )}
        <View style={styles.row}>
          <View style={styles.flex1}>
            <FormField label="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numeric" placeholder="33.3152" />
          </View>
          <View style={styles.flex1}>
            <FormField label="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numeric" placeholder="44.3661" />
          </View>
        </View>
        <Text style={styles.hint}>
          Numeric pin for now — an embedded map picker needs a Google Maps API key to enable.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Facilities & Amenities</Text>
        <ChipSelect
          options={facilities.map((f) => ({ id: f.id, label: f.nameEn }))}
          selectedIds={facilityIds}
          onToggle={(id) => toggle(facilityIds, setFacilityIds, id)}
        />
      </View>

      {saveMessage && <Text style={styles.saveMessage}>{saveMessage}</Text>}
      <Pressable style={[styles.button, styles.primaryButton]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>24-Hour Daily Story</Text>
        {stories.length === 0 ? (
          <Text style={styles.hint}>No active story.</Text>
        ) : (
          <View style={styles.storyRow}>
            {stories.map((s) => (
              <View key={s.id} style={styles.storyCard}>
                <Image source={{ uri: s.mediaUrl }} style={styles.storyImage} />
                {s.caption && <Text style={styles.storyCaption}>{s.caption}</Text>}
                <Text style={styles.storyExpiry}>
                  Expires {new Date(s.expiresAt).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </View>
        )}
        <FormField
          label="Caption (optional)"
          value={storyCaption}
          onChangeText={setStoryCaption}
          placeholder="Today's special…"
        />
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleAddStory} disabled={uploadingStory}>
          {uploadingStory ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <Text style={styles.secondaryButtonText}>Add Photo to Story</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 4, gap: 20, maxWidth: 640 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  error: { color: colors.destructive, fontSize: 13 },
  section: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  fieldLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  hint: { fontSize: 12, color: colors.mutedForeground },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.foreground, fontWeight: '600', fontSize: 14 },
  saveMessage: { fontSize: 13, color: colors.success },
  storyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  storyCard: {
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  storyImage: { width: '100%', height: 140, backgroundColor: colors.secondary },
  storyCaption: { fontSize: 12, color: colors.foreground, padding: 8, paddingBottom: 0 },
  storyExpiry: { fontSize: 11, color: colors.mutedForeground, padding: 8, paddingTop: 4 },
});
