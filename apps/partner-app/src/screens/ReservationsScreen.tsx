import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users, Phone, CalendarDays, Check, X } from 'lucide-react-native';
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

export function ReservationsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('chefTable');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReservationStatus | 'ALL'>('ALL');

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

  const visible = filter === 'ALL' ? reservations : reservations.filter((r) => r.status === filter);
  const pendingCount = reservations.filter((r) => r.status === 'PENDING').length;

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
          options={FILTERS.map((key) => ({ id: key, label: key === 'ALL' ? t('stats.all') : t(`status.${key}`) }))}
          selectedIds={[filter]}
          onToggle={(id) => setFilter(id as ReservationStatus | 'ALL')}
        />
      )}

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
            <View style={styles.metaRow}>
              <Phone size={14} color={colors.mutedForeground} />
              <Text style={styles.metaText}>{r.guestPhone}</Text>
            </View>

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
        {visible.length === 0 && !loadError && <EmptyState icon={Users} message={t('noReservationsYet')} />}
      </View>
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
});
