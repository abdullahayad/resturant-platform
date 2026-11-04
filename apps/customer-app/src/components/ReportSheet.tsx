import { CheckCircle2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type ReportReason } from '../lib/api';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';

const REASONS: ReportReason[] = ['FAKE_REVIEW', 'ABUSIVE', 'SPAM', 'UNDISCLOSED_PAID', 'OTHER'];

// Report a review to LiGETA (fake, abusive, spam, undisclosed paid). An
// admin decides; the review stays up until then.
export function ReportSheet({ reviewId, onClose }: { reviewId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'sent'>('form');
  const [error, setError] = useState(false);

  const send = async () => {
    if (!reason) return;
    setState('sending');
    setError(false);
    try {
      await api.reportReview(reviewId, reason, note.trim() || undefined);
      setState('sent');
    } catch {
      setState('form');
      setError(true);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('home.close')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        {state === 'sent' ? (
          <View style={styles.sent}>
            <CheckCircle2 size={50} color={colors.green} />
            <AppText weight="bold" style={styles.title}>
              {t('report.sentTitle')}
            </AppText>
            <AppText style={styles.muted}>{t('report.sentText')}</AppText>
            <Pressable style={styles.primary} onPress={onClose} accessibilityRole="button">
              <AppText weight="bold" style={styles.primaryText}>
                {t('review.done')}
              </AppText>
            </Pressable>
          </View>
        ) : (
          <>
            <AppText weight="bold" style={styles.title}>
              {t('report.title')}
            </AppText>
            <AppText style={styles.muted}>{t('report.body')}</AppText>
            {REASONS.map((r) => (
              <Pressable
                key={r}
                style={[styles.reason, reason === r && styles.reasonActive]}
                onPress={() => setReason(r)}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === r }}
              >
                <AppText weight={reason === r ? 'bold' : 'regular'} style={[styles.reasonText, reason === r && styles.reasonTextActive]}>
                  {t(`report.reasons.${r}`)}
                </AppText>
              </Pressable>
            ))}
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('report.note')}
              placeholderTextColor={colors.mutedIcon}
              style={styles.input}
              multiline
              maxLength={500}
            />
            {error && <AppText style={styles.error}>{t('report.failed')}</AppText>}
            <Pressable
              style={[styles.primary, (!reason || state === 'sending') && styles.disabled]}
              onPress={send}
              disabled={!reason || state === 'sending'}
              accessibilityRole="button"
            >
              {state === 'sending' ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <AppText weight="bold" style={styles.primaryText}>
                  {t('report.send')}
                </AppText>
              )}
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,22,64,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 8 },
  title: { fontSize: 19, textAlign: 'center' },
  muted: { fontSize: 13.5, color: colors.muted, textAlign: 'center', marginBottom: 4 },
  reason: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 14 },
  reasonActive: { borderColor: colors.orange, backgroundColor: colors.peach },
  reasonText: { fontSize: 14.5 },
  reasonTextActive: { color: colors.orangeDark },
  input: {
    minHeight: 60,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    color: colors.text,
    textAlignVertical: 'top',
  },
  error: { fontSize: 13, color: colors.red, textAlign: 'center' },
  primary: { height: 50, borderRadius: 16, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', marginTop: 4, alignSelf: 'stretch' },
  primaryText: { color: colors.white, fontSize: 15.5 },
  disabled: { opacity: 0.5 },
  sent: { alignItems: 'center', gap: 8 },
});
