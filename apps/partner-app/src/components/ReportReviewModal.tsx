import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api, type ReportReason } from '../lib/api';
import { radii } from '../theme/tokens';

const REASONS: ReportReason[] = ['FAKE_REVIEW', 'ABUSIVE', 'SPAM', 'UNDISCLOSED_PAID', 'OTHER'];

// Report a review about your restaurant to LiGETA (fake, abusive, spam,
// undisclosed paid). An admin decides in the admin portal - the review
// stays up until then.
export function ReportReviewModal({ reviewId, onClose }: { reviewId: string; onClose: () => void }) {
  const { t } = useTranslation('reviews');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'sent'>('form');
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!token || !reason) return;
    setState('sending');
    setError(null);
    try {
      await api.reportReview(token, reviewId, reason, note.trim() || undefined);
      setState('sent');
    } catch (err) {
      setState('form');
      setError(err instanceof Error ? err.message : t('report.failed'));
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('report.title')}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('report.close')}>
              <X size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {state === 'sent' ? (
            <View style={styles.sent}>
              <CheckCircle2 size={44} color={colors.success} />
              <Text style={styles.body}>{t('report.sent')}</Text>
              <Pressable style={styles.primary} onPress={onClose}>
                <Text style={styles.primaryText}>{t('report.close')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.body}>{t('report.body')}</Text>
              {REASONS.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.reason, reason === r && styles.reasonActive]}
                  onPress={() => setReason(r)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reason === r }}
                >
                  <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{t(`report.reasons.${r}`)}</Text>
                </Pressable>
              ))}
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('report.notePlaceholder')}
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
                maxLength={500}
                multiline
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                style={[styles.primary, (!reason || state === 'sending') && styles.disabled]}
                onPress={send}
                disabled={!reason || state === 'sending'}
              >
                {state === 'sending' ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.primaryText}>{t('report.send')}</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  card: { borderRadius: radii.lg, backgroundColor: colors.card, padding: 18, gap: 10, maxWidth: 480, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  body: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
  reason: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 11, paddingHorizontal: 14 },
  reasonActive: { borderColor: colors.primary, backgroundColor: colors.secondary },
  reasonText: { fontSize: 14, color: colors.foreground },
  reasonTextActive: { fontWeight: '700', color: colors.primary },
  input: {
    minHeight: 60,
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
  error: { fontSize: 13, color: colors.destructive },
  primary: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12 },
  primaryText: { color: colors.primaryForeground, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  sent: { alignItems: 'center', gap: 12, paddingVertical: 8 },
});
