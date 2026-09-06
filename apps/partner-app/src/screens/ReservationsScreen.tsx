import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../lib/AuthContext';
import { api, type ReservationItem, type ReservationStatus } from '../lib/api';
import { radii, cardShadow } from '../theme/tokens';

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

export function ReservationsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('chefTable');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('reservations')}</Text>
      <Text style={styles.subtitle}>{t('reservationsSubtitle')}</Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={styles.formCard}>
        {reservations.map((r) => {
          const statusStyle = reservationStatusStyles[r.status];
          return (
            <View key={r.id} style={styles.reservationRow}>
              <View style={styles.reservationInfo}>
                <Text style={styles.reservationGuest}>{t('partyOf', { name: r.guestName, size: r.partySize })}</Text>
                <Text style={styles.eventType}>{r.event.titleEn} — {formatReservationDate(r.reservationDate)}</Text>
                <Text style={styles.eventType}>{r.guestPhone}</Text>
                {r.guestTier && (
                  <View style={styles.badgeTier}>
                    <Text style={styles.badgeTierText}>
                      {t('tierBadge', { labelEn: r.guestTier.labelEn, labelAr: r.guestTier.labelAr })}
                    </Text>
                  </View>
                )}
                {r.notes && <Text style={styles.eventDescription}>{r.notes}</Text>}
              </View>
              <View style={styles.reservationActions}>
                <View style={[styles.badge, styles[statusStyle.badge]]}>
                  <Text style={styles[statusStyle.text]}>{t(`status.${r.status}`)}</Text>
                </View>
                {r.status === 'PENDING' && (
                  <Pressable
                    disabled={busyId === r.id}
                    onPress={() => setReservationStatus(r.id, 'CONFIRMED')}
                    style={styles.confirmLink}
                  >
                    <Text style={styles.confirmLinkText}>{t('confirm')}</Text>
                  </Pressable>
                )}
                {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                  <Pressable
                    disabled={busyId === r.id}
                    onPress={() => setReservationStatus(r.id, 'CANCELLED')}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>{t('cancel')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
        {reservations.length === 0 && !loadError && <EmptyState icon={Users} message={t('noReservationsYet')} />}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 40, maxWidth: 620 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground },
  error: { color: colors.destructive, fontSize: 13 },

  formCard: {
    gap: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    ...cardShadow,
  },
  eventType: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  eventDescription: { color: colors.mutedForeground, fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTier: { alignSelf: 'flex-start', backgroundColor: colors.primaryTint15, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  badgeTierText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
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
});
