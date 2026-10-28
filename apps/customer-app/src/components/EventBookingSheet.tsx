import { CheckCircle2, Minus, Plus, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError, type EventItem } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatIqd, isIraqiMobile, randomId } from '../lib/format';
import { useDateLabels } from '../lib/useDateLabels';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';

const MAX_PARTY = 20;

// Book seats for one occurrence of an event - name, phone and how many
// people; paid at the restaurant. No account needed, the same as the
// booking flow the partner app already receives.
export function EventBookingSheet({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { dateLabel, timeLabel } = useDateLabels();
  const ar = i18n.language === 'ar';

  // Pre-filled for a signed-in customer.
  const { customer } = useAuth();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [party, setParty] = useState(2);
  const [notes, setNotes] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [state, setState] = useState<'form' | 'sending' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);
  // One key per booking attempt: a retry after a timeout reuses it, so the
  // restaurant never gets the same booking twice.
  const attemptKey = useRef(randomId());

  useEffect(() => {
    if (event.capacity == null) return;
    let cancelled = false;
    api
      .eventAvailability(event.restaurant.id, event.id, event.bookingDate)
      .then((a) => {
        if (!cancelled) setRemaining(a.remaining);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [event]);

  const maxParty = Math.max(1, Math.min(MAX_PARTY, remaining ?? MAX_PARTY));
  const soldOut = remaining === 0;

  const submit = async () => {
    if (!name.trim()) return setError(t('booking.nameNeeded'));
    if (!isIraqiMobile(phone)) return setError(t('booking.phoneInvalid'));
    setError(null);
    setState('sending');
    try {
      await api.reserve(event.restaurant.id, event.id, {
        idempotencyKey: attemptKey.current,
        guestName: name.trim(),
        guestPhone: phone.trim(),
        partySize: Math.min(party, maxParty),
        reservationDate: event.bookingDate,
        notes: notes.trim() || undefined,
      });
      setState('done');
    } catch (e) {
      setState('form');
      setError(e instanceof ApiError && e.status < 500 ? e.message : t('booking.failed'));
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('home.close')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <AppText weight="bold" style={styles.title} numberOfLines={2}>
              {ar ? event.titleAr : event.titleEn}
            </AppText>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('home.close')}>
              <X size={22} color={colors.text} />
            </Pressable>
          </View>
          <AppText style={styles.sub}>
            {(ar ? event.restaurant.nameAr : event.restaurant.nameEn) + ' · ' + dateLabel(event.date)}
            {event.time ? ` · ${timeLabel(event.time)}` : ''}
          </AppText>

          {state === 'done' ? (
            <View style={styles.done}>
              <CheckCircle2 size={54} color={colors.green} />
              <AppText weight="bold" style={styles.doneTitle}>
                {t('booking.sentTitle')}
              </AppText>
              <AppText style={styles.doneText}>{t('booking.sentText')}</AppText>
              <Pressable style={styles.primary} onPress={onClose} accessibilityRole="button">
                <AppText weight="bold" style={styles.primaryText}>
                  {t('booking.done')}
                </AppText>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <AppText weight="semibold" style={styles.label}>
                {t('booking.guests')}
              </AppText>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepButton}
                  onPress={() => setParty((p) => Math.max(1, p - 1))}
                  accessibilityLabel={t('booking.fewer')}
                >
                  <Minus size={20} color={colors.text} />
                </Pressable>
                <AppText weight="bold" style={styles.partyCount}>
                  {Math.min(party, maxParty)}
                </AppText>
                <Pressable
                  style={styles.stepButton}
                  onPress={() => setParty((p) => Math.min(maxParty, p + 1))}
                  accessibilityLabel={t('booking.more')}
                >
                  <Plus size={20} color={colors.text} />
                </Pressable>
                {remaining != null && (
                  <AppText style={[styles.seats, soldOut && { color: colors.red }]}>
                    {soldOut ? t('booking.soldOut') : t('booking.seatsLeft', { n: remaining })}
                  </AppText>
                )}
              </View>

              <AppText weight="semibold" style={styles.label}>
                {t('booking.name')}
              </AppText>
              <TextInput value={name} onChangeText={setName} style={styles.input} maxLength={100} autoComplete="name" />

              <AppText weight="semibold" style={styles.label}>
                {t('booking.phone')}
              </AppText>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="07XX XXX XXXX"
                placeholderTextColor={colors.mutedIcon}
                maxLength={20}
                autoComplete="tel"
              />

              <AppText weight="semibold" style={styles.label}>
                {t('booking.notes')}
              </AppText>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                style={[styles.input, styles.notes]}
                multiline
                maxLength={500}
                placeholder={t('booking.notesHint')}
                placeholderTextColor={colors.mutedIcon}
              />

              {event.price != null && (
                <AppText style={styles.payNote}>
                  {t('booking.total', { price: formatIqd(event.price * Math.min(party, maxParty)) })}
                </AppText>
              )}
              {!!error && <AppText style={styles.error}>{error}</AppText>}

              <Pressable
                style={[styles.primary, (soldOut || state === 'sending') && styles.disabled]}
                onPress={submit}
                disabled={soldOut || state === 'sending'}
                accessibilityRole="button"
              >
                {state === 'sending' ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <AppText weight="bold" style={styles.primaryText}>
                    {t('booking.send')}
                  </AppText>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,22,64,0.45)' },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 19, flex: 1 },
  sub: { fontSize: 13.5, color: colors.muted, marginTop: 2 },
  form: { paddingTop: 12, gap: 6 },
  label: { fontSize: 13.5, marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyCount: { fontSize: 20, minWidth: 26, textAlign: 'center' },
  seats: { fontSize: 13, color: colors.green },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  notes: { minHeight: 70, paddingTop: 12, textAlignVertical: 'top' },
  payNote: { fontSize: 13.5, color: colors.muted, marginTop: 8 },
  error: { fontSize: 13.5, color: colors.red, marginTop: 6 },
  primary: {
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primaryText: { color: colors.white, fontSize: 16 },
  disabled: { opacity: 0.5 },
  done: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  doneTitle: { fontSize: 19 },
  doneText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
