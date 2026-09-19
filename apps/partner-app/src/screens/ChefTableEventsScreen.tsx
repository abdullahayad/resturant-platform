import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CalendarClock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { DateField } from '../components/DateField';
import { TimeField } from '../components/TimeField';
import { ChipSelect } from '../components/ChipSelect';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../lib/AuthContext';
import { resizeForUpload } from '../lib/resizeImage';
import { localizedName } from '../lib/localizedName';
import { useLanguage } from '../i18n/LanguageContext';
import { api, type EventTypeItem, type RestaurantEventItem } from '../lib/api';
import { radii, cardShadow } from '../theme/tokens';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function formatSchedule(event: RestaurantEventItem, t: TFunction): string {
  if (event.isRecurring) {
    const day = t(`common:days.${DAY_KEYS[event.recurringDayOfWeek ?? 0]}`);
    return t('every', { day, time: event.recurringTime });
  }
  if (!event.eventDate) return t('dateNotSet');
  const d = new Date(event.eventDate);
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const emptyForm = {
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  photoUrl: '',
  price: '',
  capacity: '',
  eventTypeId: '',
  isRecurring: false,
  eventDate: '',
  eventTime: '',
  recurringDayOfWeek: 0,
  recurringTime: '',
};

export function ChefTableEventsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation('chefTable');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [eventTypes, setEventTypes] = useState<EventTypeItem[]>([]);
  const [events, setEvents] = useState<RestaurantEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([api.eventTypes(), api.myEvents(token)])
      .then(([types, mine]) => {
        setEventTypes(types);
        setEvents(mine);
      })
      .catch(() => setLoadError(t('common:networkError')))
      .finally(() => setLoading(false));
  }, [token, t]);

  useEffect(loadAll, [loadAll]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
    setLocalPhotoPreview(null);
  };

  const startEdit = (event: RestaurantEventItem) => {
    setLocalPhotoPreview(null);
    setEditingId(event.id);
    setFormError(null);
    setForm({
      titleEn: event.titleEn,
      titleAr: event.titleAr,
      descriptionEn: event.descriptionEn ?? '',
      photoUrl: event.photoUrl ?? '',
      price: event.price ?? '',
      capacity: event.capacity != null ? String(event.capacity) : '',
      eventTypeId: event.eventTypeId,
      isRecurring: event.isRecurring,
      eventDate: event.eventDate ? event.eventDate.slice(0, 10) : '',
      eventTime: event.eventDate ? new Date(event.eventDate).toTimeString().slice(0, 5) : '',
      recurringDayOfWeek: event.recurringDayOfWeek ?? 0,
      recurringTime: event.recurringTime ?? '',
    });
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setLocalPhotoPreview(asset.uri);
    setUploadingPhoto(true);
    try {
      const resizedUri = await resizeForUpload(asset.uri, asset.width, asset.height);
      const wasResized = resizedUri !== asset.uri;
      const { url } = await api.uploadFile(token, {
        uri: resizedUri,
        name: asset.fileName ?? 'event.jpg',
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
    if (!form.titleEn.trim() || !form.titleAr.trim() || !form.eventTypeId) {
      setFormError(t('validation.titleAndType'));
      return;
    }
    if (form.isRecurring && !form.recurringTime) {
      setFormError(t('validation.recurringTime'));
      return;
    }
    if (!form.isRecurring && (!form.eventDate || !form.eventTime)) {
      setFormError(t('validation.dateAndTime'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        titleEn: form.titleEn.trim(),
        titleAr: form.titleAr.trim(),
        descriptionEn: form.descriptionEn.trim() || undefined,
        photoUrl: form.photoUrl || undefined,
        price: form.price ? Number(form.price) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        eventTypeId: form.eventTypeId,
        isRecurring: form.isRecurring,
        eventDate: form.isRecurring ? undefined : `${form.eventDate}T${form.eventTime}:00`,
        recurringDayOfWeek: form.isRecurring ? form.recurringDayOfWeek : undefined,
        recurringTime: form.isRecurring ? form.recurringTime : undefined,
      };
      if (editingId) {
        const updated = await api.updateEvent(token, editingId, payload);
        setEvents((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
      } else {
        const created = await api.createEvent(token, payload);
        setEvents((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : editingId ? t('updateFailed') : t('createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (event: RestaurantEventItem) => {
    setBusyId(event.id);
    try {
      const updated = await api.updateEvent(token, event.id, { isActive: !event.isActive });
      setEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
    } finally {
      setBusyId(null);
    }
  };

  const removeEvent = async (id: string) => {
    setBusyId(id);
    try {
      await api.deleteEvent(token, id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) resetForm();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>
      <Text style={styles.subtitle}>{t('subtitle')}</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={styles.list}>
        {events.map((event) => (
          <View key={event.id} style={styles.card}>
            {event.photoUrl ? (
              <Image source={{ uri: event.photoUrl }} style={styles.cardPhoto} />
            ) : null}
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.eventIcon}>{event.eventType.icon ?? '📅'}</Text>
                <View>
                  <Text style={styles.eventTitle}>{event.titleEn} · {event.titleAr}</Text>
                  <Text style={styles.eventType}>{localizedName(event.eventType, language)}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => toggleActive(event)}
                disabled={busyId === event.id}
                style={[styles.badge, event.isActive ? styles.badgeActive : styles.badgeInactive]}
              >
                <Text style={event.isActive ? styles.badgeActiveText : styles.badgeInactiveText}>
                  {event.isActive ? t('visible') : t('hidden')}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.eventSchedule}>{formatSchedule(event, t)}</Text>
            {event.price && <Text style={styles.eventPrice}>{Number(event.price).toLocaleString()} IQD</Text>}
            {event.capacity != null && (
              event.bookedCount != null ? (
                <View style={styles.capacityBlock}>
                  <Text style={styles.eventPrice}>{t('bookedOfCapacity', { booked: event.bookedCount, capacity: event.capacity })}</Text>
                  <View style={styles.capacityTrack}>
                    <View
                      style={[
                        styles.capacityFill,
                        { width: `${Math.min(100, Math.round((event.bookedCount / event.capacity) * 100))}%` },
                      ]}
                    />
                  </View>
                </View>
              ) : (
                <Text style={styles.eventPrice}>{t('capacity', { count: event.capacity })}</Text>
              )
            )}
            {event.descriptionEn && <Text style={styles.eventDescription}>{event.descriptionEn}</Text>}
            <View style={styles.cardActions}>
              <Pressable onPress={() => startEdit(event)} disabled={busyId === event.id}>
                <Text style={styles.link}>{t('edit')}</Text>
              </Pressable>
              <Pressable onPress={() => removeEvent(event.id)} disabled={busyId === event.id}>
                <Text style={[styles.link, styles.destructiveLink]}>{t('delete')}</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {loading ? (
          <LoadingState />
        ) : (
          events.length === 0 && !loadError && <EmptyState icon={CalendarClock} message={t('noEventsYet')} />
        )}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? t('editEvent') : t('createEvent')}</Text>
        <FormField label={t('titleEnLabel')} value={form.titleEn} onChangeText={(v) => setForm((f) => ({ ...f, titleEn: v }))} placeholder={t('titleEnPlaceholder')} />
        <FormField label={t('titleArLabel')} value={form.titleAr} onChangeText={(v) => setForm((f) => ({ ...f, titleAr: v }))} placeholder={t('titleArPlaceholder')} />
        <FormField
          label={t('descriptionLabel')}
          value={form.descriptionEn}
          onChangeText={(v) => setForm((f) => ({ ...f, descriptionEn: v }))}
          placeholder={t('descriptionPlaceholder')}
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

        <View style={styles.row}>
          <View style={styles.flex1}>
            <FormField
              label={t('priceLabel')}
              value={form.price}
              onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
              keyboardType="numeric"
              placeholder="25000"
            />
          </View>
          <View style={styles.flex1}>
            <FormField
              label={t('capacityLabel')}
              value={form.capacity}
              onChangeText={(v) => setForm((f) => ({ ...f, capacity: v }))}
              keyboardType="numeric"
              placeholder="40"
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>{t('eventType')}</Text>
        <ChipSelect
          options={eventTypes.map((type) => ({ id: type.id, label: `${type.icon ?? ''} ${localizedName(type, language)}`.trim() }))}
          selectedIds={form.eventTypeId ? [form.eventTypeId] : []}
          onToggle={(id) => setForm((f) => ({ ...f, eventTypeId: id === f.eventTypeId ? '' : id }))}
        />

        <Text style={styles.fieldLabel}>{t('schedule')}</Text>
        <ChipSelect
          options={[
            { id: 'once', label: t('oneOffDate') },
            { id: 'weekly', label: t('everyWeek') },
          ]}
          selectedIds={[form.isRecurring ? 'weekly' : 'once']}
          onToggle={(id) => setForm((f) => ({ ...f, isRecurring: id === 'weekly' }))}
        />

        {form.isRecurring ? (
          <>
            <Text style={styles.fieldLabel}>{t('dayOfWeek')}</Text>
            <ChipSelect
              options={DAY_KEYS.map((key, id) => ({ id: String(id), label: t(`common:days.${key}`) }))}
              selectedIds={[String(form.recurringDayOfWeek)]}
              onToggle={(id) => setForm((f) => ({ ...f, recurringDayOfWeek: Number(id) }))}
            />
            <TimeField
              label={t('timeLabel')}
              value={form.recurringTime}
              onChange={(v) => setForm((f) => ({ ...f, recurringTime: v }))}
              placeholder="20:00"
            />
          </>
        ) : (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <DateField label={t('dateLabel')} value={form.eventDate} onChange={(v) => setForm((f) => ({ ...f, eventDate: v }))} placeholder="2026-08-28" />
            </View>
            <View style={styles.flex1}>
              <TimeField label={t('timeLabel')} value={form.eventTime} onChange={(v) => setForm((f) => ({ ...f, eventTime: v }))} placeholder="20:00" />
            </View>
          </View>
        )}

        {formError && <Text style={styles.error}>{formError}</Text>}
        <View style={styles.row}>
          <Pressable style={[styles.button, styles.primaryButton, styles.flex1]} onPress={submit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryButtonText}>{editingId ? t('saveChanges') : t('submit')}</Text>
            )}
          </Pressable>
          {editingId && (
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={resetForm}>
              <Text style={styles.secondaryButtonText}>{t('cancel')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 40, maxWidth: 620 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground },
  error: { color: colors.destructive, fontSize: 13 },

  list: { gap: 12 },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
    overflow: 'hidden',
    ...cardShadow,
  },
  cardPhoto: { width: '100%', height: 140, borderRadius: radii.sm, backgroundColor: colors.secondary, marginBottom: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  eventIcon: { fontSize: 22 },
  eventTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  eventType: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  eventSchedule: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  eventPrice: { color: colors.foreground, fontSize: 12 },
  capacityBlock: { gap: 4 },
  capacityTrack: { height: 6, borderRadius: 3, backgroundColor: colors.secondary, overflow: 'hidden' },
  capacityFill: { height: '100%', backgroundColor: colors.primary },
  eventDescription: { color: colors.mutedForeground, fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeActive: { backgroundColor: colors.successTint15 },
  badgeInactive: { backgroundColor: colors.secondary },
  badgeActiveText: { color: colors.success, fontSize: 12, fontWeight: '600' },
  badgeInactiveText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  link: { color: colors.mutedForeground, fontSize: 13 },
  destructiveLink: { color: colors.destructive },

  formCard: {
    gap: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    ...cardShadow,
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  fieldLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.mutedForeground },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPreview: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.secondary },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', paddingHorizontal: 16 },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.foreground, fontWeight: '600', fontSize: 13 },
});
