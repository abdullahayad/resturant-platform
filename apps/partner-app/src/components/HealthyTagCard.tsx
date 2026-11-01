import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Leaf } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api, type HealthyTagStatus } from '../lib/api';
import { radii, cardShadow } from '../theme/tokens';

// The 🌿 Healthy tag, at the top of Menu Management: a restaurant marks its
// healthy dishes below, then asks for the tag here and LiGETA approves it
// in the admin portal. Only approved restaurants appear in the customer
// app's Healthy mode (healthy dishes show in its Home row either way).
// refreshKey changes whenever the dish list does, so the healthy-dish count
// stays current.
export function HealthyTagCard({ refreshKey }: { refreshKey: string }) {
  const { t } = useTranslation('menu');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token } = useAuth();
  const [status, setStatus] = useState<HealthyTagStatus | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api.healthyStatus(token).then(setStatus).catch(() => {});
  }, [token]);

  useEffect(load, [load, refreshKey]);

  if (!status) return null;

  const request = async () => {
    if (!token) return;
    setSending(true);
    setError(null);
    try {
      setStatus(await api.requestHealthyTag(token, note.trim() || undefined));
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('healthy.failed'));
    } finally {
      setSending(false);
    }
  };

  const { healthyStatus, healthyDishCount } = status;
  const canRequest = healthyStatus === 'NONE' || healthyStatus === 'REJECTED';

  return (
    <View style={[styles.card, healthyStatus === 'APPROVED' && styles.cardApproved]}>
      <View style={styles.titleRow}>
        <Leaf size={20} color={colors.success} />
        <Text style={styles.title}>{t('healthy.title')}</Text>
        <Text style={[styles.pill, healthyStatus === 'APPROVED' && styles.pillApproved]}>
          {t(`healthy.status.${healthyStatus}`)}
        </Text>
      </View>

      <Text style={styles.body}>
        {healthyStatus === 'APPROVED'
          ? t('healthy.approvedBody')
          : healthyStatus === 'PENDING'
            ? t('healthy.pendingBody')
            : t('healthy.body')}
      </Text>
      <Text style={styles.count}>{t('healthy.dishCount', { count: healthyDishCount })}</Text>

      {healthyStatus === 'REJECTED' && status.healthyRejectionReason && (
        <Text style={styles.rejected}>{t('healthy.reason', { reason: status.healthyRejectionReason })}</Text>
      )}

      {canRequest && (
        <>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('healthy.notePlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            style={styles.input}
            maxLength={500}
            multiline
          />
          {healthyDishCount === 0 && <Text style={styles.hint}>{t('healthy.needDish')}</Text>}
          {error && <Text style={styles.rejected}>{error}</Text>}
          <Pressable
            onPress={request}
            disabled={sending || healthyDishCount === 0}
            style={[styles.button, (sending || healthyDishCount === 0) && styles.disabled]}
            accessibilityRole="button"
          >
            {sending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.buttonText}>{t('healthy.request')}</Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 8,
    ...cardShadow,
  },
  cardApproved: { borderColor: colors.success },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.foreground },
  pill: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pillApproved: { color: colors.success },
  body: { fontSize: 14, color: colors.mutedForeground },
  count: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  rejected: { fontSize: 13, color: colors.destructive },
  hint: { fontSize: 13, color: colors.mutedForeground },
  input: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.primaryForeground, fontSize: 15, fontWeight: '700' },
});
