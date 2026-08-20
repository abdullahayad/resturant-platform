import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { ChipSelect } from '../components/ChipSelect';
import { useAuth } from '../lib/AuthContext';
import { api, type EventTypeItem, type ReservationItem, type ReservationStatus, type RestaurantEventItem } from '../lib/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatSchedule(event: RestaurantEventItem): string {
  if (event.isRecurring) {
    return `Every ${DAY_NAMES[event.recurringDayOfWeek ?? 0]} at ${event.recurringTime}`;
  }
  if (!event.eventDate) return 'Date not set';
  const d = new Date(event.eventDate);
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const emptyForm = {
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  price: '',
  capacity: '',
  eventTypeId: '',
  isRecurring: false,
  eventDate: '',
  eventTime: '',
  recurringDayOfWeek: 0,
  recurringTime: '',
};

type ScreenStyles = ReturnType<typeof createStyles>;

const reservationStatusStyles: Record<ReservationStatus, { badge: keyof ScreenStyles; text: keyof ScreenStyles }> = {
  PENDING: { badge: 'badgeInactive', text: 'badgeInactiveText' },
  CONFIRMED: { badge: 'badgeActive', text: 'badgeActiveText' },
  CANCELLED: { badge: 'badgeCancelled', text: 'badgeCancelledText' },
  COMPLETED: { badge: 'badgeActive', text: 'badgeActiveText' },
};

function formatReservationDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export function ChefTableEventsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [eventTypes, setEventTypes] = useState<EventTypeItem[]>([]);
  const [events, setEvents] = useState<RestaurantEventItem[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyReservationId, setBusyReservationId] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([api.eventTypes(), api.myEvents(token), api.myReservations(token)])
      .then(([types, mine, myReservations]) => {
        setEventTypes(types);
        setEvents(mine);
        setReservations(myReservations);
      })
      .catch(() => setLoadError('Could not reach the server. Is the backend running on localhost:3000?'));
  }, [token]);

  useEffect(loadAll, [loadAll]);

  const submit = async () => {
    setFormError(null);
    if (!form.titleEn.trim() || !form.titleAr.trim() || !form.eventTypeId) {
      setFormError('Fill in title (EN/AR) and pick an event type.');
      return;
    }
    if (form.isRecurring && !form.recurringTime) {
      setFormError('Set a time for the recurring event.');
      return;
    }
    if (!form.isRecurring && (!form.eventDate || !form.eventTime)) {
      setFormError('Set a date and time for the event.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createEvent(token, {
        titleEn: form.titleEn.trim(),
        titleAr: form.titleAr.trim(),
        descriptionEn: form.descriptionEn.trim() || undefined,
        price: form.price ? Number(form.price) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        eventTypeId: form.eventTypeId,
        isRecurring: form.isRecurring,
        eventDate: form.isRecurring ? undefined : `${form.eventDate}T${form.eventTime}:00`,
        recurringDayOfWeek: form.isRecurring ? form.recurringDayOfWeek : undefined,
        recurringTime: form.isRecurring ? form.recurringTime : undefined,
      });
      setEvents((prev) => [created, ...prev]);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create event');
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
    } finally {
      setBusyId(null);
    }
  };

  const setReservationStatus = async (id: string, status: ReservationStatus) => {
    setBusyReservationId(id);
    try {
      const updated = await api.updateReservationStatus(token, id, status);
      setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } finally {
      setBusyReservationId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Chef Table & Events</Text>
      <Text style={styles.subtitle}>
        Announce buffet nights, live music, chef's table experiences, or anything else, and manage
        reservation requests against them.
      </Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={styles.list}>
        {events.map((event) => (
          <View key={event.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.eventIcon}>{event.eventType.icon ?? '📅'}</Text>
                <View>
                  <Text style={styles.eventTitle}>{event.titleEn} · {event.titleAr}</Text>
                  <Text style={styles.eventType}>{event.eventType.nameEn}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => toggleActive(event)}
                disabled={busyId === event.id}
                style={[styles.badge, event.isActive ? styles.badgeActive : styles.badgeInactive]}
              >
                <Text style={event.isActive ? styles.badgeActiveText : styles.badgeInactiveText}>
                  {event.isActive ? 'Visible' : 'Hidden'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.eventSchedule}>{formatSchedule(event)}</Text>
            {event.price && <Text style={styles.eventPrice}>{Number(event.price).toLocaleString()} IQD</Text>}
            {event.capacity != null && <Text style={styles.eventPrice}>Capacity: {event.capacity} guests</Text>}
            {event.descriptionEn && <Text style={styles.eventDescription}>{event.descriptionEn}</Text>}
            <Pressable onPress={() => removeEvent(event.id)} disabled={busyId === event.id} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>Delete</Text>
            </Pressable>
          </View>
        ))}
        {events.length === 0 && !loadError && <Text style={styles.hint}>No events yet.</Text>}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Reservations</Text>
        {reservations.map((r) => {
          const statusStyle = reservationStatusStyles[r.status];
          return (
            <View key={r.id} style={styles.reservationRow}>
              <View style={styles.reservationInfo}>
                <Text style={styles.reservationGuest}>{r.guestName} · party of {r.partySize}</Text>
                <Text style={styles.eventType}>{r.event.titleEn} — {formatReservationDate(r.reservationDate)}</Text>
                <Text style={styles.eventType}>{r.guestPhone}</Text>
                {r.notes && <Text style={styles.eventDescription}>{r.notes}</Text>}
              </View>
              <View style={styles.reservationActions}>
                <View style={[styles.badge, styles[statusStyle.badge]]}>
                  <Text style={styles[statusStyle.text]}>{r.status}</Text>
                </View>
                {r.status === 'PENDING' && (
                  <Pressable
                    disabled={busyReservationId === r.id}
                    onPress={() => setReservationStatus(r.id, 'CONFIRMED')}
                    style={styles.confirmLink}
                  >
                    <Text style={styles.confirmLinkText}>Confirm</Text>
                  </Pressable>
                )}
                {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                  <Pressable
                    disabled={busyReservationId === r.id}
                    onPress={() => setReservationStatus(r.id, 'CANCELLED')}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
        {reservations.length === 0 && !loadError && <Text style={styles.hint}>No reservation requests yet.</Text>}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Create Event</Text>
        <FormField label="Title (English)" value={form.titleEn} onChangeText={(v) => setForm((f) => ({ ...f, titleEn: v }))} placeholder="Friday Live Music" />
        <FormField label="Title (Arabic)" value={form.titleAr} onChangeText={(v) => setForm((f) => ({ ...f, titleAr: v }))} placeholder="موسيقى حية كل جمعة" />
        <FormField
          label="Description (optional)"
          value={form.descriptionEn}
          onChangeText={(v) => setForm((f) => ({ ...f, descriptionEn: v }))}
          placeholder="What should customers expect?"
        />
        <View style={styles.row}>
          <View style={styles.flex1}>
            <FormField
              label="Price per person, IQD (optional)"
              value={form.price}
              onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
              keyboardType="numeric"
              placeholder="25000"
            />
          </View>
          <View style={styles.flex1}>
            <FormField
              label="Capacity, guests (optional)"
              value={form.capacity}
              onChangeText={(v) => setForm((f) => ({ ...f, capacity: v }))}
              keyboardType="numeric"
              placeholder="40"
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Event Type</Text>
        <ChipSelect
          options={eventTypes.map((t) => ({ id: t.id, label: `${t.icon ?? ''} ${t.nameEn}`.trim() }))}
          selectedIds={form.eventTypeId ? [form.eventTypeId] : []}
          onToggle={(id) => setForm((f) => ({ ...f, eventTypeId: id === f.eventTypeId ? '' : id }))}
        />

        <Text style={styles.fieldLabel}>Schedule</Text>
        <ChipSelect
          options={[
            { id: 'once', label: 'One-off date' },
            { id: 'weekly', label: 'Every week' },
          ]}
          selectedIds={[form.isRecurring ? 'weekly' : 'once']}
          onToggle={(id) => setForm((f) => ({ ...f, isRecurring: id === 'weekly' }))}
        />

        {form.isRecurring ? (
          <>
            <Text style={styles.fieldLabel}>Day of the week</Text>
            <ChipSelect
              options={DAY_NAMES.map((label, id) => ({ id: String(id), label }))}
              selectedIds={[String(form.recurringDayOfWeek)]}
              onToggle={(id) => setForm((f) => ({ ...f, recurringDayOfWeek: Number(id) }))}
            />
            <FormField
              label="Time"
              value={form.recurringTime}
              onChangeText={(v) => setForm((f) => ({ ...f, recurringTime: v }))}
              placeholder="20:00"
            />
          </>
        ) : (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField label="Date" value={form.eventDate} onChangeText={(v) => setForm((f) => ({ ...f, eventDate: v }))} placeholder="2026-08-28" />
            </View>
            <View style={styles.flex1}>
              <FormField label="Time" value={form.eventTime} onChangeText={(v) => setForm((f) => ({ ...f, eventTime: v }))} placeholder="20:00" />
            </View>
          </View>
        )}

        {formError && <Text style={styles.error}>{formError}</Text>}
        <Pressable style={[styles.button, styles.primaryButton]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>Create Event</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 40, maxWidth: 620 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground },
  error: { color: colors.destructive, fontSize: 13 },
  hint: { color: colors.mutedForeground, fontSize: 13 },

  list: { gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitleBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  eventIcon: { fontSize: 22 },
  eventTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  eventType: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  eventSchedule: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  eventPrice: { color: colors.foreground, fontSize: 12 },
  eventDescription: { color: colors.mutedForeground, fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeActive: { backgroundColor: colors.successTint15 },
  badgeInactive: { backgroundColor: colors.secondary },
  badgeActiveText: { color: colors.success, fontSize: 12, fontWeight: '600' },
  badgeInactiveText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  badgeCancelled: { backgroundColor: colors.destructiveTint15 },
  badgeCancelledText: { color: colors.destructive, fontSize: 12, fontWeight: '600' },
  removeButton: { alignSelf: 'flex-start', marginTop: 4 },
  removeButtonText: { color: colors.destructive, fontSize: 12, fontWeight: '600' },

  reservationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  reservationInfo: { flex: 1, gap: 2 },
  reservationGuest: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  reservationActions: { alignItems: 'flex-end', gap: 6 },
  confirmLink: {},
  confirmLinkText: { color: colors.success, fontSize: 12, fontWeight: '600' },

  formCard: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  fieldLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
});
