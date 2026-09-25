import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../i18n/LanguageContext';

interface IntroOverlayProps {
  onDone: () => void;
  holdMs?: number;
  fadeMs?: number;
}

// Each language's wordmark is cropped into three pieces at its own source
// resolution, arranged left-to-right on screen. All three pieces of a set
// share one source height (cropped on the same baseline), only their widths
// differ. `reverseDropOrder` controls the order pieces animate in (see
// below) — it's independent of their fixed left-to-right screen position.
const SEGMENT_SETS = {
  en: {
    sourceHeight: 171,
    reverseDropOrder: false,
    // "Li" / "G" (with the pin) / "ETA" — drops in reading order, left to right.
    // withAnchorIndex: which segment the small "With" label sits above - "G"
    // (index 1, the pin letter), matching where "ويه" sits above "ك" in Arabic.
    // withOffsetPx: fine-tune nudge off that segment's center, in display px.
    withAnchorIndex: 1,
    withOffsetPx: 0,
    segments: [
      { source: require('../../assets/intro-en-1.png'), width: 115 },
      { source: require('../../assets/intro-en-2.png'), width: 139 },
      { source: require('../../assets/intro-en-3.png'), width: 352 },
    ],
  },
  ar: {
    sourceHeight: 264,
    reverseDropOrder: true,
    // Screen-left to screen-right this reads "يته" / "ك" (with the pin) / "لي" — but
    // Arabic is read right-to-left, so reverseDropOrder makes "لي" (rightmost on
    // screen) drop first, then "ك", then "يته" last: the pieces still land in their
    // fixed left-to-right screen positions, only the *order* they arrive in follows
    // how the word is actually read.
    // withAnchorIndex: "ويه" sits above "ك" (index 1, the pin letter) specifically,
    // not the first-read piece - a deliberate placement, not derived from reading order.
    withAnchorIndex: 1,
    withOffsetPx: -74,
    segments: [
      { source: require('../../assets/intro-ar-1.png'), width: 348 },
      { source: require('../../assets/intro-ar-2.png'), width: 187 },
      { source: require('../../assets/intro-ar-3.png'), width: 155 },
    ],
  },
} as const;

const DISPLAY_WIDTH = 260;
const DROP_START_Y = -160;
const STAGGER_MS = 180;
const LEAD_IN_MS = 2000;
const WORD_STAGGER_MS = 450;
const WITH_LABEL_KEY = 'common:introWithLabel';
const TAGLINE_KEY = 'common:introTagline';

/** Drop from above, bounce twice (a big bounce then a smaller one), then settle at rest. */
function dropWithBounce(value: Animated.Value, delay: number, onComplete?: () => void) {
  Animated.sequence([
    Animated.delay(delay),
    Animated.timing(value, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    Animated.timing(value, { toValue: -22, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    Animated.timing(value, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    Animated.timing(value, { toValue: -9, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    Animated.timing(value, { toValue: 0, duration: 90, easing: Easing.in(Easing.quad), useNativeDriver: true }),
  ]).start(onComplete);
}

/** Fade a tagline word up into place. */
function revealWord(opacity: Animated.Value, rise: Animated.Value, delay: number, onComplete?: () => void) {
  Animated.sequence([
    Animated.delay(delay),
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]),
  ]).start(onComplete);
}

/** Full-screen brand intro shown right after the native splash hands off to JS: plain white for
 * LEAD_IN_MS, then the wordmark's three pieces drop in one after another (each bouncing twice
 * before settling), then a small "With" label fades in above the wordmark's first-read segment
 * (above "Li" / "لي"), then the tagline fades in below it one word at a time at a slow pace, then
 * everything holds before fading into the app. Which wordmark and tagline show depends on the
 * current app language. The native splash itself is configured with no image at all (just white)
 * — Android 12+ won't reliably hold it open on request and its splash-icon rendering center-crops
 * wide art, so all the actual logo presentation happens here instead, under our own control. */
export function IntroOverlay({ onDone, holdMs = 2000, fadeMs = 400 }: IntroOverlayProps) {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const set = SEGMENT_SETS[language];
  const totalSourceWidth = useMemo(() => set.segments.reduce((sum, s) => sum + s.width, 0), [set]);
  const scale = DISPLAY_WIDTH / totalSourceWidth;
  const displayHeight = set.sourceHeight * scale;
  const withAnchorIndex = set.withAnchorIndex;
  const withLeftPx = useMemo(
    () => set.segments.slice(0, withAnchorIndex).reduce((sum, s) => sum + s.width, 0) * scale + set.withOffsetPx,
    [set, withAnchorIndex, scale],
  );
  const withWidthPx = set.segments[withAnchorIndex].width * scale;

  const taglineWords = useMemo(() => t(TAGLINE_KEY).split(' '), [t]);

  const opacity = useRef(new Animated.Value(1)).current;
  const dropY = useRef(set.segments.map(() => new Animated.Value(DROP_START_Y))).current;
  const withOpacity = useRef(new Animated.Value(0)).current;
  const withRise = useRef(new Animated.Value(10)).current;
  const wordOpacity = useRef(taglineWords.map(() => new Animated.Value(0))).current;
  const wordRise = useRef(taglineWords.map(() => new Animated.Value(10))).current;

  // React Native Web doesn't reliably honor the row's `direction: 'ltr'` override
  // when the document itself is globally RTL — it still mirrors the flex order,
  // unlike native, which respects the override correctly. Compensate by reversing
  // the *rendered* order on web only, for RTL wordmarks only. Each image keeps its
  // own dropY (indexed by its original, unreversed position), so the drop-order
  // timing logic below — which is about reading order, not screen position — is
  // completely unaffected by this.
  const displayIndices = useMemo(() => {
    const indices = set.segments.map((_, i) => i);
    return Platform.OS === 'web' && set.reverseDropOrder ? indices.reverse() : indices;
  }, [set]);

  useEffect(() => {
    const lastCount = set.segments.length - 1;
    set.segments.forEach((_, i) => {
      // Screen position (i) is fixed; drop order can differ from it (see reverseDropOrder above).
      const dropOrder = set.reverseDropOrder ? lastCount - i : i;
      const isLastToLand = dropOrder === lastCount;
      dropWithBounce(dropY[i], LEAD_IN_MS + dropOrder * STAGGER_MS, isLastToLand ? revealWithLabel : undefined);
    });

    function revealWithLabel() {
      revealWord(withOpacity, withRise, 0, revealTagline);
    }

    function revealTagline() {
      taglineWords.forEach((_, i) => {
        const isLast = i === taglineWords.length - 1;
        revealWord(wordOpacity[i], wordRise[i], i * WORD_STAGGER_MS, isLast ? finishIntro : undefined);
      });
    }

    function finishIntro() {
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: fadeMs, useNativeDriver: true }).start(onDone);
      }, holdMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <View style={styles.wordmarkWrap}>
        <Animated.Text
          style={[
            styles.withLabel,
            {
              left: withLeftPx,
              width: withWidthPx,
              opacity: withOpacity,
              transform: [{ translateY: withRise }],
              fontSize: language === 'ar' ? 19 : 13,
              top: language === 'ar' ? -28 : -22,
            },
          ]}
        >
          {t(WITH_LABEL_KEY)}
        </Animated.Text>
        <View style={styles.row}>
          {displayIndices.map((i) => {
            const seg = set.segments[i];
            return (
              <Animated.Image
                key={i}
                source={seg.source}
                style={{
                  width: seg.width * scale,
                  height: displayHeight,
                  transform: [{ translateY: dropY[i] }],
                }}
                resizeMode="contain"
              />
            );
          })}
        </View>
      </View>
      <View style={styles.taglineRow}>
        {taglineWords.map((word, i) => (
          <Animated.Text
            key={`${word}-${i}`}
            style={[
              styles.taglineWord,
              {
                opacity: wordOpacity[i],
                transform: [{ translateY: wordRise[i] }],
                fontSize: language === 'ar' ? 18 : 15,
              },
            ]}
          >
            {word}
          </Animated.Text>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  // Brand wordmark stays fixed left-to-right regardless of app language — without this,
  // flexDirection:'row' auto-mirrors under RTL and reorders the pieces. `direction` is a
  // real Yoga layout property RN honors on native even though it's outside RN's official
  // style typings (hence the native-only guard: React Native Web's style validator flags
  // it as invalid and doesn't apply it the same way anyway - web's fix is the
  // `displayIndices` reversal above instead).
  row: { flexDirection: 'row', alignItems: 'center', ...(Platform.OS !== 'web' ? { direction: 'ltr' as const } : null) },
  // Fixed-width wrapper (equal to DISPLAY_WIDTH by construction, since `scale` is derived from
  // it) so the "With" label can be positioned absolutely above the wordmark's first-read segment
  // without disturbing the row's own centering.
  wordmarkWrap: { width: DISPLAY_WIDTH, position: 'relative', marginTop: 24 },
  withLabel: { position: 'absolute', top: -22, fontSize: 13, fontWeight: '600', color: '#cc4408', letterSpacing: 0.5, textAlign: 'center' },
  // The tagline is ordinary text, not a fixed logo asset — it's left free to mirror under RTL
  // (Arabic words cascade in from the right, matching how the language is actually read).
  taglineRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  taglineWord: { color: '#cc4408', fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
});
