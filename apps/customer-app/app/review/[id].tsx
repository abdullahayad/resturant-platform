import { router, useLocalSearchParams } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { CheckCircle2, ImagePlus, Star, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
const MAX_PHOTOS = 4;
// Long edge in pixels - plenty for a phone screen, small enough to upload fast.
const PHOTO_MAX_EDGE = 1600;

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
  // Picked photos: the phone's own copy (shown at once) and, once
  // uploaded, its link.
  const [photos, setPhotos] = useState<{ uri: string; url?: string; failed?: boolean }[]>([]);

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.9,
    });
    if (result.canceled) return;
    for (const asset of result.assets.slice(0, MAX_PHOTOS - photos.length)) {
      setPhotos((list) => [...list, { uri: asset.uri }]);
      try {
        const longest = Math.max(asset.width, asset.height);
        const resized =
          longest > PHOTO_MAX_EDGE
            ? await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: asset.width >= asset.height ? { width: PHOTO_MAX_EDGE } : { height: PHOTO_MAX_EDGE } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
              )
            : await ImageManipulator.manipulateAsync(asset.uri, [], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
        const url = await api.uploadReviewPhoto(id, resized.uri);
        setPhotos((list) => list.map((p) => (p.uri === asset.uri ? { ...p, url } : p)));
      } catch {
        setPhotos((list) => list.map((p) => (p.uri === asset.uri ? { ...p, failed: true } : p)));
      }
    }
  };

  const uploading = photos.some((p) => !p.url && !p.failed);

  const submit = async () => {
    if (!name.trim()) return setError(t('review.needName'));
    if (!rating) return setError(t('review.needRating'));
    setError(null);
    setSending(true);
    try {
      if (name.trim() !== (customer?.name ?? '')) await update({ name: name.trim() });
      const photoUrls = photos.flatMap((p) => (p.url ? [p.url] : []));
      const input: ReviewInput = { rating, ...scores, text: text.trim() || undefined, photoUrls: photoUrls.length ? photoUrls : undefined };
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
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
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

          <AppText weight="semibold" style={styles.label}>
            {t('review.photos')}
          </AppText>
          <View style={styles.photoRow}>
            {photos.map((p) => (
              <View key={p.uri} style={styles.photoWrap}>
                <Image source={{ uri: p.uri }} style={[styles.photo, (!p.url || p.failed) && styles.photoPending]} />
                {!p.url && !p.failed && <ActivityIndicator style={styles.photoSpinner} color={colors.white} />}
                <Pressable
                  style={styles.photoRemove}
                  onPress={() => setPhotos((list) => list.filter((x) => x.uri !== p.uri))}
                  hitSlop={6}
                  accessibilityLabel={t('review.removePhoto')}
                >
                  <X size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable style={[styles.photo, styles.addPhoto]} onPress={addPhotos} accessibilityRole="button" accessibilityLabel={t('review.addPhotos')}>
                <ImagePlus size={24} color={colors.orange} />
              </Pressable>
            )}
          </View>
          {photos.some((p) => p.failed) && <AppText style={styles.error}>{t('review.photoFailed')}</AppText>}
          {!!error && <AppText style={styles.error}>{error}</AppText>}

          <Pressable
            style={[styles.primary, (sending || uploading) && styles.disabled]}
            onPress={submit}
            disabled={sending || uploading}
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
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { position: 'relative' },
  photo: { width: 74, height: 74, borderRadius: 14, backgroundColor: colors.surface },
  photoPending: { opacity: 0.5 },
  photoSpinner: { position: 'absolute', top: 27, left: 27 },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(31,22,64,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.orange, backgroundColor: colors.peach },
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
