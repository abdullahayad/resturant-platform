import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Star, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { api, ApiError, type ReviewInput } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { colors, fonts } from '../../src/theme';

type Category = 'foodRating' | 'serviceRating' | 'staffRating' | 'ambienceRating';
const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'foodRating', label: 'review.food' },
  { key: 'serviceRating', label: 'review.service' },
  { key: 'staffRating', label: 'review.staff' },
  { key: 'ambienceRating', label: 'review.ambience' },
];

// Writing a review in the app: overall stars (required), four optional
// category scores and a few words. The name is the account's - set or
// changed right here - and the verified phone number comes from the
// account too, so no phone field.
export default function WriteReviewScreen() {
  const { id, name: restaurantName } = useLocalSearchParams<{ id: string; name?: string }>();
  const { t } = useTranslation();
  const { customer, update } = useAuth();
  const [name, setName] = useState(customer?.name ?? '');
  const [rating, setRating] = useState(0);
  const [scores, setScores] = useState<Partial<Record<Category, number>>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return setError(t('review.needName'));
    if (!rating) return setError(t('review.needRating'));
    setError(null);
    setSending(true);
    try {
      if (name.trim() !== (customer?.name ?? '')) await update({ name: name.trim() });
      const input: ReviewInput = { rating, ...scores, text: text.trim() || undefined };
      await api.writeReview(id, input);
      setSent(true);
    } catch (e) {
      setError(
        e instanceof ApiError && e.message === 'review-cooldown-active' ? t('review.cooldown') : t('review.failed'),
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <CheckCircle2 size={60} color={colors.green} />
        <AppText weight="bold" style={styles.sentTitle}>
          {t('review.sentTitle')}
        </AppText>
        <AppText style={styles.sentText}>{t('review.sentText')}</AppText>
        <Pressable style={[styles.primary, styles.doneButton]} onPress={() => router.back()} accessibilityRole="button">
          <AppText weight="bold" style={styles.primaryText}>
            {t('review.done')}
          </AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <AppText weight="bold" style={styles.title} numberOfLines={2}>
            {t('review.title', { name: restaurantName ?? '' })}
          </AppText>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('home.close')}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <AppText weight="semibold" style={styles.label}>
            {t('review.overall')}
          </AppText>
          <Stars value={rating} onChange={setRating} size={40} label={t('review.overall')} />

          {CATEGORIES.map((c) => (
            <View key={c.key} style={styles.categoryRow}>
              <AppText style={styles.categoryLabel}>
                {t(c.label)} <AppText style={styles.optional}>({t('review.optional')})</AppText>
              </AppText>
              <Stars
                value={scores[c.key] ?? 0}
                onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))}
                size={24}
                label={t(c.label)}
              />
            </View>
          ))}

          <AppText weight="semibold" style={styles.label}>
            {t('review.text')}
          </AppText>
          <TextInput
            value={text}
            onChangeText={setText}
            style={[styles.input, styles.textArea]}
            multiline
            maxLength={2000}
          />

          <AppText weight="semibold" style={styles.label}>
            {t('review.yourName')}
          </AppText>
          <TextInput value={name} onChangeText={setName} style={styles.input} maxLength={60} autoComplete="name" />

          <AppText style={styles.note}>{t('review.photosSoon')}</AppText>
          {!!error && <AppText style={styles.error}>{error}</AppText>}

          <Pressable
            style={[styles.primary, sending && styles.disabled]}
            onPress={submit}
            disabled={sending}
            accessibilityRole="button"
          >
            {sending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <AppText weight="bold" style={styles.primaryText}>
                {t('review.send')}
              </AppText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stars({
  value,
  onChange,
  size,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  size: number;
  label: string;
}) {
  return (
    <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ now: value, min: 0, max: 5 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n === value ? 0 : n)} hitSlop={4} accessibilityLabel={`${n}`}>
          <Star size={size} color={colors.orange} fill={n <= value ? colors.orange : 'transparent'} strokeWidth={1.8} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  title: { fontSize: 21, flex: 1 },
  form: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  label: { fontSize: 14.5, marginTop: 10 },
  stars: { flexDirection: 'row', gap: 8 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  categoryLabel: { fontSize: 14 },
  optional: { fontSize: 12, color: colors.mutedIcon },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  textArea: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  note: { fontSize: 12.5, color: colors.mutedIcon, marginTop: 6 },
  error: { fontSize: 13.5, color: colors.red },
  primary: {
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: { alignSelf: 'stretch' },
  primaryText: { color: colors.white, fontSize: 16 },
  disabled: { opacity: 0.6 },
  sentTitle: { fontSize: 21, textAlign: 'center' },
  sentText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21 },
});
