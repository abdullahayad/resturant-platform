import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { useAuth } from '../lib/AuthContext';
import { api, type FeaturedPlacementItem } from '../lib/api';

function formatDateRange(p: FeaturedPlacementItem): string {
  if (!p.startDate && !p.endDate) return 'Open-ended';
  const from = p.startDate ? new Date(p.startDate).toLocaleDateString() : '—';
  const until = p.endDate ? new Date(p.endDate).toLocaleDateString() : '—';
  return `${from} – ${until}`;
}

export function AdvertisingScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [placements, setPlacements] = useState<FeaturedPlacementItem[] | null>(null);
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api.myFeatured(token).then(setPlacements).catch(() => setPlacements([]));
  }, [token]);

  useEffect(load, [load]);

  const activePlacement = placements?.find((p) => p.isCurrentlyActive);
  const pendingRequest = placements?.find((p) => p.status === 'PENDING');
  const history = placements?.filter((p) => p !== activePlacement && p !== pendingRequest) ?? [];

  const submitRequest = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await api.requestFeatured(token, {
        reason: reason.trim() || undefined,
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.000Z` : undefined,
      });
      setReason('');
      setStartDate('');
      setEndDate('');
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async (id: string) => {
    setBusyId(id);
    try {
      await api.cancelFeaturedRequest(token, id);
      load();
    } finally {
      setBusyId(null);
    }
  };

  if (placements === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Advertising</Text>
      <Text style={styles.subtitle}>
        Get extra visibility on the platform. Request to be featured, or an admin may feature you directly.
      </Text>

      {activePlacement && (
        <View style={[styles.card, styles.activeCard]}>
          <View style={styles.activeTitleRow}>
            <BadgeCheck size={16} color={colors.success} />
            <Text style={styles.activeTitle}>You're currently Featured</Text>
          </View>
          <Text style={styles.cardMeta}>{formatDateRange(activePlacement)}</Text>
          {activePlacement.note && <Text style={styles.cardMeta}>{activePlacement.note}</Text>}
        </View>
      )}

      {pendingRequest && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Featured request awaiting review</Text>
            <View style={[styles.badge, styles.badgeInactive]}>
              <Text style={styles.badgeInactiveText}>PENDING</Text>
            </View>
          </View>
          {pendingRequest.reason && <Text style={styles.cardMeta}>{pendingRequest.reason}</Text>}
          <Text style={styles.cardMeta}>{formatDateRange(pendingRequest)}</Text>
          <Pressable onPress={() => withdraw(pendingRequest.id)} disabled={busyId === pendingRequest.id} style={styles.withdrawLink}>
            <Text style={styles.removeButtonText}>Withdraw request</Text>
          </Pressable>
        </View>
      )}

      {!pendingRequest && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Request to be Featured</Text>
          <FormField
            label="Why should we feature you? (optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. We just launched a new seasonal menu"
          />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField label="Preferred start date (optional)" value={startDate} onChangeText={setStartDate} placeholder="2026-08-20" />
            </View>
            <View style={styles.flex1}>
              <FormField label="Preferred end date (optional)" value={endDate} onChangeText={setEndDate} placeholder="2026-08-27" />
            </View>
          </View>
          {formError && <Text style={styles.error}>{formError}</Text>}
          <Pressable style={[styles.button, styles.primaryButton]} onPress={submitRequest} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>Submit Request</Text>}
          </Pressable>
        </View>
      )}

      {history.length > 0 && (
        <View style={styles.list}>
          <Text style={styles.formTitle}>History</Text>
          {history.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {p.initiator === 'ADMIN' ? 'Granted by admin' : 'Your request'}
                </Text>
                <View
                  style={[
                    styles.badge,
                    p.status === 'APPROVED' ? styles.badgeActive : p.status === 'REJECTED' ? styles.badgeCancelled : styles.badgeInactive,
                  ]}
                >
                  <Text
                    style={
                      p.status === 'APPROVED'
                        ? styles.badgeActiveText
                        : p.status === 'REJECTED'
                          ? styles.badgeCancelledText
                          : styles.badgeInactiveText
                    }
                  >
                    {p.status === 'APPROVED' && !p.isActive ? 'REVOKED' : p.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>{formatDateRange(p)}</Text>
              {p.reason && <Text style={styles.cardMeta}>Reason: {p.reason}</Text>}
              {p.status === 'REJECTED' && p.rejectionReason && (
                <Text style={styles.rejection}>Rejected: {p.rejectionReason}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { gap: 16, paddingBottom: 40, maxWidth: 620 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground },
  error: { color: colors.destructive, fontSize: 13 },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },

  list: { gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
  },
  activeCard: { borderColor: colors.success, backgroundColor: colors.successTint08 },
  activeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeTitle: { color: colors.success, fontSize: 15, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  cardMeta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  rejection: { color: colors.destructive, fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeActive: { backgroundColor: colors.successTint15 },
  badgeInactive: { backgroundColor: colors.secondary },
  badgeActiveText: { color: colors.success, fontSize: 12, fontWeight: '600' },
  badgeInactiveText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  badgeCancelled: { backgroundColor: colors.destructiveTint15 },
  badgeCancelledText: { color: colors.destructive, fontSize: 12, fontWeight: '600' },
  withdrawLink: { marginTop: 4, alignSelf: 'flex-start' },
  removeButtonText: { color: colors.destructive, fontSize: 12, fontWeight: '600' },

  formCard: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
});
