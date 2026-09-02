import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { ChipSelect } from '../components/ChipSelect';
import { MapPinPicker } from '../components/MapPinPicker';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../lib/AuthContext';
import { resizeForUpload } from '../lib/resizeImage';
import { api, type MasterDataItem, type OpeningHoursDay, type Province, type RestaurantDetail, type Story } from '../lib/api';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const defaultOpeningHours = (): OpeningHoursDay[] =>
  DAY_KEYS.map((_, dayOfWeek) => ({ dayOfWeek, isClosed: false, openTime: '09:00', closeTime: '22:00' }));

export function ProfileInfoScreen() {
  const { token, restaurant, setRestaurant } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('profile');
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const [openingHours, setOpeningHours] = useState<OpeningHoursDay[]>(defaultOpeningHours());

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [localStoryPreview, setLocalStoryPreview] = useState<string | null>(null);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursMessage, setHoursMessage] = useState<string | null>(null);

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
        if (me.openingHours.length === 7) {
          setOpeningHours([...me.openingHours].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
        }
      })
      .catch(() => setLoadError(t('common:networkError')));
  }, [token, t]);

  useEffect(loadAll, [loadAll]);

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const selectedProvince = provinces.find((p) => p.id === provinceId);

  const hasValidPin = latitude.trim() !== '' && longitude.trim() !== '' && !Number.isNaN(Number(latitude)) && !Number.isNaN(Number(longitude));

  const openInGoogleMaps = () => {
    if (!hasValidPin) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
  };

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
      setSaveMessage(t('saved'));
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayOfWeek: number, patch: Partial<OpeningHoursDay>) => {
    setOpeningHours((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  };

  const handleSaveHours = async () => {
    setHoursMessage(null);
    setSavingHours(true);
    try {
      const updated = await api.updateOpeningHours(token, openingHours);
      setOpeningHours([...updated.openingHours].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
      setHoursMessage(t('hoursSaved'));
    } catch (err) {
      setHoursMessage(err instanceof Error ? err.message : t('hoursSaveFailed'));
    } finally {
      setSavingHours(false);
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
    // Show the picked photo immediately from the device's own copy — the
    // upload round-trip (device -> backend -> R2) can take several seconds,
    // and waiting for that before showing anything reads as "nothing
    // happened" rather than "uploading".
    setLocalStoryPreview(asset.uri);
    setUploadingStory(true);
    try {
      const resizedUri = await resizeForUpload(asset.uri, asset.width, asset.height);
      const wasResized = resizedUri !== asset.uri;
      const { url } = await api.uploadFile(token, {
        uri: resizedUri,
        name: asset.fileName ?? 'story.jpg',
        type: wasResized ? 'image/jpeg' : (asset.mimeType ?? 'image/jpeg'),
      });
      await api.createStory(token, url, 'photo', storyCaption || undefined);
      setStoryCaption('');
      const fresh = await api.activeStories(token);
      setStories(fresh);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : t('storyUploadFailed'));
    } finally {
      setUploadingStory(false);
      setLocalStoryPreview(null);
    }
  };

  if (!detail && !loadError) {
    return <LoadingState />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sections.general')}</Text>
        <FormField label={t('nameEnLabel')} value={nameEn} onChangeText={setNameEn} />
        <FormField label={t('nameArLabel')} value={nameAr} onChangeText={setNameAr} />
        <FormField label={t('phoneLabel')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.fieldLabel}>{t('businessTypes')}</Text>
        <ChipSelect
          options={businessTypes.map((b) => ({ id: b.id, label: b.nameEn }))}
          selectedIds={businessTypeIds}
          onToggle={(id) => toggle(businessTypeIds, setBusinessTypeIds, id)}
        />

        <Text style={styles.fieldLabel}>{t('foodCategories')}</Text>
        <ChipSelect
          options={foodCategories.map((f) => ({ id: f.id, label: f.nameEn }))}
          selectedIds={foodCategoryIds}
          onToggle={(id) => toggle(foodCategoryIds, setFoodCategoryIds, id)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sections.location')}</Text>
        <Text style={styles.fieldLabel}>{t('city')}</Text>
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
            <Text style={styles.fieldLabel}>{t('district')}</Text>
            <ChipSelect
              options={selectedProvince.districts.map((d) => ({ id: d.id, label: d.nameEn }))}
              selectedIds={districtId ? [districtId] : []}
              onToggle={(id) => setDistrictId(id === districtId ? null : id)}
            />
          </>
        )}
        <Text style={styles.fieldLabel}>{t('pinHint')}</Text>
        <MapPinPicker
          latitude={hasValidPin ? Number(latitude) : null}
          longitude={hasValidPin ? Number(longitude) : null}
          onChange={(lat, lng) => {
            setLatitude(lat.toFixed(6));
            setLongitude(lng.toFixed(6));
          }}
        />
        <View style={styles.row}>
          <View style={styles.flex1}>
            <FormField label={t('latitude')} value={latitude} editable={false} placeholder="33.3152" />
          </View>
          <View style={styles.flex1}>
            <FormField label={t('longitude')} value={longitude} editable={false} placeholder="44.3661" />
          </View>
        </View>
        <Pressable
          style={[styles.button, styles.secondaryButton, styles.buttonRow, !hasValidPin && styles.buttonDisabled]}
          onPress={openInGoogleMaps}
          disabled={!hasValidPin}
        >
          <MapPin size={16} color={colors.foreground} />
          <Text style={styles.secondaryButtonText}>{t('openInGoogleMaps')}</Text>
        </Pressable>
        <Text style={styles.hint}>{t('mapAttribution')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sections.hours')}</Text>
        {openingHours.map((day) => (
          <View key={day.dayOfWeek} style={styles.hoursRow}>
            <Text style={styles.hoursDayLabel}>{t(`common:days.${DAY_KEYS[day.dayOfWeek]}`)}</Text>
            {!day.isClosed && (
              <View style={styles.hoursTimes}>
                <TextInput
                  value={day.openTime ?? ''}
                  onChangeText={(v) => updateDay(day.dayOfWeek, { openTime: v })}
                  placeholder="09:00"
                  placeholderTextColor={colors.mutedForeground}
                  style={styles.hoursInput}
                />
                <Text style={styles.hoursDash}>–</Text>
                <TextInput
                  value={day.closeTime ?? ''}
                  onChangeText={(v) => updateDay(day.dayOfWeek, { closeTime: v })}
                  placeholder="22:00"
                  placeholderTextColor={colors.mutedForeground}
                  style={styles.hoursInput}
                />
              </View>
            )}
            <View style={styles.hoursClosedToggle}>
              <Text style={styles.hoursClosedLabel}>{t('closed')}</Text>
              <Switch
                value={day.isClosed}
                onValueChange={(v) => updateDay(day.dayOfWeek, { isClosed: v })}
                trackColor={{ true: colors.destructive, false: colors.secondary }}
              />
            </View>
          </View>
        ))}
        {hoursMessage && <Text style={styles.saveMessage}>{hoursMessage}</Text>}
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleSaveHours} disabled={savingHours}>
          {savingHours ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <Text style={styles.secondaryButtonText}>{t('saveHours')}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sections.facilities')}</Text>
        <ChipSelect
          options={facilities.map((f) => ({ id: f.id, label: f.nameEn }))}
          selectedIds={facilityIds}
          onToggle={(id) => toggle(facilityIds, setFacilityIds, id)}
        />
      </View>

      {saveMessage && <Text style={styles.saveMessage}>{saveMessage}</Text>}
      <Pressable style={[styles.button, styles.primaryButton]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>{t('saveChanges')}</Text>}
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sections.story')}</Text>
        {stories.length === 0 && !localStoryPreview ? (
          <Text style={styles.hint}>{t('noActiveStory')}</Text>
        ) : (
          <View style={styles.storyRow}>
            {localStoryPreview && (
              <View style={styles.storyCard}>
                <Image source={{ uri: localStoryPreview }} style={styles.storyImage} />
                <View style={styles.storyUploadingOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              </View>
            )}
            {stories.map((s) => (
              <View key={s.id} style={styles.storyCard}>
                <Image source={{ uri: s.mediaUrl }} style={styles.storyImage} />
                {s.caption && <Text style={styles.storyCaption}>{s.caption}</Text>}
                <Text style={styles.storyExpiry}>
                  {t('expires', { time: new Date(s.expiresAt).toLocaleTimeString() })}
                </Text>
              </View>
            ))}
          </View>
        )}
        <FormField
          label={t('captionLabel')}
          value={storyCaption}
          onChangeText={setStoryCaption}
          placeholder={t('captionPlaceholder')}
        />
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleAddStory} disabled={uploadingStory}>
          {uploadingStory ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <Text style={styles.secondaryButtonText}>{t('addPhotoToStory')}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { padding: 4, gap: 20, maxWidth: 640 },
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
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  buttonDisabled: { opacity: 0.5 },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.foreground, fontWeight: '600', fontSize: 14 },
  saveMessage: { fontSize: 13, color: colors.success },
  storyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  storyCard: {
    position: 'relative',
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  storyImage: { width: '100%', height: 140, backgroundColor: colors.secondary },
  storyUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCaption: { fontSize: 12, color: colors.foreground, padding: 8, paddingBottom: 0 },
  storyExpiry: { fontSize: 11, color: colors.mutedForeground, padding: 8, paddingTop: 4 },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  hoursDayLabel: { width: 90, fontSize: 13, color: colors.foreground, fontWeight: '600' },
  hoursTimes: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  hoursInput: {
    width: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    color: colors.foreground,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 13,
    outlineWidth: 0,
  },
  hoursDash: { color: colors.mutedForeground },
  hoursClosedToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hoursClosedLabel: { fontSize: 12, color: colors.mutedForeground },
});
