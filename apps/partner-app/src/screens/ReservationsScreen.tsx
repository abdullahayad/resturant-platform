import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users, Phone, CalendarDays, Check, X, ChevronLeft, ChevronRight, CalendarCheck2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { ChipSelect } from '../components/ChipSelect';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../lib/AuthContext';
import { api, type ReservationItem, type ReservationStatus } from '../lib/api';
import { radii, cardShadow } from '../theme/tokens';

type ScreenStyles = ReturnType<typeof createStyles>;
type AccentKey = 'accentPending' | 'accentConfirmed' | 'accentCancelled';
type BadgeKey = 'badgePending' | 'badgeConfirmed' | 'badgeCancelled';
type BadgeTextKey = 'badgePendingText' | 'badgeConfirmedText' | 'badgeCancelledText';

const STATUS_ACCENT: Record<ReservationStatus, AccentKey> = {
  PENDING: 'accentPending',
  CONFIRMED: 'accentConfirmed',
  CANCELLED: 'accentCancelled',
  COMPLETED: 'accentConfirmed',
};

const STATUS_BADGE: Record<ReservationStatus, { badge: BadgeKey; text: BadgeTextKey }> = {
  PENDING: { badge: 'badgePending', text: 'badgePendingText' },
  CONFIRMED: { badge: 'badgeConfirmed', text: 'badgeConfirmedText' },
  CANCELLED: { badge: 'badgeCancelled', text: 'badgeCancelledText' },
  COMPLETED: { badge: 'badgeConfirmed', text: 'badgeConfirmedText' },
};

const FILTERS: (ReservationStatus | 'ALL')[] = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

function formatReservationDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

type ViewMode = 'list' | 'calendar';

function dateKey(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Locale-aware short weekday labels (Sun..Sat) for the calendar header —
// derived from a known Sunday rather than hardcoded English abbreviations,
// so this reads correctly under Arabic too. The app fully reloads on
// language switch (see LanguageContext), so a module-level constant is fine.
const WEEKDAY_LABELS = (() => {
  const knownSunday = new Date(2026, 0, 4);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(knownSunday);
    d.setDate(knownSunday.getDate() + i);
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  });
})();

function callGuest(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits) Linking.openURL(`tel:${digits}`).catch(() => {});
}

export function ReservationsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('chefTable');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarCursor, setCalendarCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    api
      .myReservations(token)
      .then(setReservations)
      .catch(() => setLoadError(t('common:networkError')));
  }, [token, t]);

  useEffect(loadAll, [loadAll]);

  const setReservationStatus = async (id: string, status: ReservationStatus) => {
    setBusyId(id);
    try {
      const updated = await api.updateReservationStatus(token, id, status);
      setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = reservations.filter((r) => r.status === 'PENDING').length;

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    reservations.forEach((r) => {
      const key = dateKey(r.reservationDate);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [reservations]);

  const calendarCells = useMemo(() => {
    const startOffset = calendarCursor.getDay();
    const daysInMonth = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null; key: string | null }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, key: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), day);
      cells.push({ date, key: dateKey(date) });
    }
    return cells;
  }, [calendarCursor]);

  const goPrevMonth = () => {
    setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };
  const goNextMonth = () => {
    setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const visible =
    viewMode === 'list'
      ? filter === 'ALL'
        ? reservations
        : reservations.filter((r) => r.status === filter)
      : selectedDay
        ? reservations.filter((r) => dateKey(r.reservationDate) === selectedDay)
        : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View>
        <Text style={styles.title}>{t('reservations')}</Text>
        <Text style={styles.subtitle}>{t('reservationsSubtitle')}</Text>
      </View>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      {reservations.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{reservations.length}</Text>
            <Text style={styles.statLabel}>{t('stats.total')}</Text>
          </View>
          <View style={[styles.statCard, pendingCount > 0 && styles.statCardHighlight]}>
            <Text style={[styles.statValue, pendingCount > 0 && styles.statValueHighlight]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>{t('stats.awaitingReply')}</Text>
          </View>
        </View>
      )}

      {reservations.length > 0 && (
        <ChipSelect
          options={[
            { id: 'list', label: t('view.list') },
            { id: 'calendar', label: t('view.calendar') },
          ]}
          selectedIds={[viewMode]}
          onToggle={(id) => setViewMode(id as ViewMode)}
        />
      )}

      {reservations.length > 0 && viewMode === 'list' && (
        <ChipSelect
          options={FILTERS.map((key) => ({ id: key, label: key === 'ALL' ? t('stats.all') : t(`status.${key}`) }))}
          selectedIds={[filter]}
          onToggle={(id) => setFilter(id as ReservationStatus | 'ALL')}
        />
      )}

      {reservations.length > 0 && viewMode === 'calendar' && (
        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={goPrevMonth} style={styles.calendarNavButton}>
              <ChevronLeft size={18} color={colors.foreground} />
            </Pressable>
            <Text style={styles.calendarMonthLabel}>
              {calendarCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable onPress={goNextMonth} style={styles.calendarNavButton}>
              <ChevronRight size={18} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={styles.calendarWeekdaysRow}>
            {WEEKDAY_LABELS.map((w) => (
              <Text key={w} style={styles.calendarWeekdayText}>{w}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarCells.map((cell, i) => {
              if (!cell.date || !cell.key) return <View key={`blank-${i}`} style={styles.calendarCell} />;
              const count = countsByDay.get(cell.key) ?? 0;
              const isSelected = selectedDay === cell.key;
              return (
                <Pressable
                  key={cell.key}
                  disabled={count === 0}
                  onPress={() => setSelectedDay(isSelected ? null : cell.key)}
                  style={[
                    styles.calendarCell,
                    styles.calendarDayCell,
                    count > 0 && styles.calendarDayCellHasBookings,
                    isSelected && styles.calendarDayCellSelected,
                  ]}
                >
                  <Text style={[styles.calendarDayNumber, isSelected && styles.calendarDayNumberSelected]}>
                    {cell.date.getDate()}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.calendarDayBadge, isSelected && styles.calendarDayBadgeSelected]}>
                      <Text style={[styles.calendarDayBadgeText, isSelected && styles.calendarDayBadgeTextSelected]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {selectedDay && (
            <Text style={styles.calendarSelectedLabel}>
              {new Date(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          )}
        </View>
      )}

      {viewMode === 'calendar' && !selectedDay ? (
        <Text style={styles.calendarHint}>{t('view.selectDayHint')}</Text>
      ) : (
      <View style={styles.list}>
        {visible.map((r) => (
          <View key={r.id} style={[styles.card, styles[STATUS_ACCENT[r.status]]]}>
            <View style={styles.cardTop}>
              <View style={styles.guestRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{r.guestName.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.reservationGuest}>{r.guestName}</Text>
                  <Text style={styles.partySize}>{t('partySize', { size: r.partySize })}</Text>
                </View>
              </View>
              <View style={[styles.badge, styles[STATUS_BADGE[r.status].badge]]}>
                <Text style={styles[STATUS_BADGE[r.status].text]}>{t(`status.${r.status}`)}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <CalendarDays size={14} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{r.event.titleEn} — {formatReservationDate(r.reservationDate)}</Text>
            </View>
            <Pressable style={styles.metaRow} onPress={() => callGuest(r.guestPhone)}>
              <Phone size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, styles.phoneText]}>{r.guestPhone}</Text>
            </Pressable>

            {r.guestTier && (
              <View style={styles.badgeTier}>
                <Text style={styles.badgeTierText}>
                  {t('tierBadge', { labelEn: r.guestTier.labelEn, labelAr: r.guestTier.labelAr })}
                </Text>
              </View>
            )}
            {r.notes && <Text style={styles.notes}>{r.notes}</Text>}

            {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
              <View style={styles.actionsRow}>
                {r.status === 'PENDING' && (
                  <Pressable
                    disabled={busyId === r.id}
                    onPress={() => setReservationStatus(r.id, 'CONFIRMED')}
                    style={[styles.actionButton, styles.confirmButton]}
                  >
                    <Check size={14} color={colors.success} />
                    <Text style={styles.confirmButtonText}>{t('confirm')}</Text>
                  </Pressable>
                )}
                {r.status === 'CONFIRMED' && (
                  <Pressable
                    disabled={busyId === r.id}
                    onPress={() => setReservationStatus(r.id, 'COMPLETED')}
                    style={[styles.actionButton, styles.completeButton]}
                  >
                    <CalendarCheck2 size={14} color={colors.primary} />
                    <Text style={styles.completeButtonText}>{t('markCompleted')}</Text>
                  </Pressable>
                )}
                <Pressable
                  disabled={busyId === r.id}
                  onPress={() => setReservationStatus(r.id, 'CANCELLED')}
                  style={[styles.actionButton, styles.cancelButton]}
                >
                  <X size={14} color={colors.destructive} />
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
        {visible.length === 0 && !loadError && (
          <EmptyState
            icon={Users}
            message={viewMode === 'calendar' ? t('view.noBookingsThisDay') : t('noReservationsYet')}
          />
        )}
      </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 16, paddingBottom: 40, maxWidth: 620 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  error: { color: colors.destructive, fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...cardShadow,
  },
  statCardHighlight: { borderColor: colors.primaryTint30, backgroundColor: colors.primaryTint15 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.foreground },
  statValueHighlight: { color: colors.primary },
  statLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },

  list: { gap: 12 },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    backgroundColor: colors.card,
    padding: 14,
    gap: 8,
    ...cardShadow,
  },
  accentPending: { borderLeftColor: colors.mutedForeground },
  accentConfirmed: { borderLeftColor: colors.success },
  accentCancelled: { borderLeftColor: colors.destructive },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  reservationGuest: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  partySize: { color: colors.mutedForeground, fontSize: 12, marginTop: 1 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: colors.mutedForeground, fontSize: 12.5 },
  notes: { color: colors.mutedForeground, fontSize: 12, fontStyle: 'italic' },

  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTier: { alignSelf: 'flex-start', backgroundColor: colors.primaryTint15, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTierText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  badgePending: { backgroundColor: colors.secondary },
  badgePendingText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  badgeConfirmed: { backgroundColor: colors.successTint15 },
  badgeConfirmedText: { color: colors.success, fontSize: 12, fontWeight: '600' },
  badgeCancelled: { backgroundColor: colors.destructiveTint15 },
  badgeCancelledText: { color: colors.destructive, fontSize: 12, fontWeight: '600' },

  phoneText: { textDecorationLine: 'underline' },

  calendar: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    gap: 10,
    ...cardShadow,
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNavButton: { padding: 6, borderRadius: 8 },
  calendarMonthLabel: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  calendarWeekdaysRow: { flexDirection: 'row' },
  calendarWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  calendarDayCell: { borderRadius: 8 },
  calendarDayCellHasBookings: { backgroundColor: colors.secondary },
  calendarDayCellSelected: { backgroundColor: colors.primary },
  calendarDayNumber: { fontSize: 13, color: colors.foreground },
  calendarDayNumberSelected: { color: colors.primaryForeground, fontWeight: '700' },
  calendarDayBadge: {
    marginTop: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayBadgeSelected: { backgroundColor: colors.primaryForeground },
  calendarDayBadgeText: { color: colors.primaryForeground, fontSize: 9, fontWeight: '700' },
  calendarDayBadgeTextSelected: { color: colors.primary },
  calendarSelectedLabel: { fontSize: 13, fontWeight: '600', color: colors.primary, textAlign: 'center' },
  calendarHint: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', paddingVertical: 20 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  confirmButton: { borderColor: colors.successTint15, backgroundColor: colors.successTint08 },
  confirmButtonText: { color: colors.success, fontSize: 13, fontWeight: '600' },
  cancelButton: { borderColor: colors.destructiveTint15 },
  cancelButtonText: { color: colors.destructive, fontSize: 13, fontWeight: '600' },
  completeButton: { borderColor: colors.primaryTint30, backgroundColor: colors.primaryTint15 },
  completeButtonText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
