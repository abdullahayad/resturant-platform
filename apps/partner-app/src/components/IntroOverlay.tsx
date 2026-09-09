import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../i18n/LanguageContext';

interface IntroOverlayProps {
  onDone: () => void;
  holdMs?: number;
  fadeMs?: number;
}

// Each language's wordmark is cropped into three pieces at its own source
// resolution — English's "Li" / "G" (with the pin) / "ETA", Arabic's matching
// three-piece split of "ليكيته" with the pin-bearing piece in the middle.
// All three pieces of a set share one source height (cropped on the same
// baseline), only their widths differ.
const SEGMENT_SETS = {
  en: {
    sourceHeight: 197,
    segments: [
      { source: require('../../assets/intro-en-1.png'), width: 131 },
      { source: require('../../assets/intro-en-2.png'), width: 192 },
      { source: require('../../assets/intro-en-3.png'), width: 466 },
    ],
  },
  ar: {
    sourceHeight: 264,
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
const TAGLINE_WORD_KEYS = ['common:introTaglineWord1', 'common:introTaglineWord2', 'common:introTaglineWord3'] as const;

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
 * before settling), then the tagline fades in one word at a time at a slow pace, then everything
 * holds before fading into the app. Which wordmark and tagline show depends on the current app
 * language. The native splash itself is configured with no image at all (just white) — Android
 * 12+ won't reliably hold it open on request and its splash-icon rendering center-crops wide art,
 * so all the actual logo presentation happens here instead, under our own control. */
export function IntroOverlay({ onDone, holdMs = 2000, fadeMs = 400 }: IntroOverlayProps) {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const set = SEGMENT_SETS[language];
  const totalSourceWidth = useMemo(() => set.segments.reduce((sum, s) => sum + s.width, 0), [set]);
  const scale = DISPLAY_WIDTH / totalSourceWidth;
  const displayHeight = set.sourceHeight * scale;

  const opacity = useRef(new Animated.Value(1)).current;
  const dropY = useRef(set.segments.map(() => new Animated.Value(DROP_START_Y))).current;
  const wordOpacity = useRef(TAGLINE_WORD_KEYS.map(() => new Animated.Value(0))).current;
  const wordRise = useRef(TAGLINE_WORD_KEYS.map(() => new Animated.Value(10))).current;

  useEffect(() => {
    set.segments.forEach((_, i) => {
      const isLast = i === set.segments.length - 1;
      dropWithBounce(dropY[i], LEAD_IN_MS + i * STAGGER_MS, isLast ? revealTagline : undefined);
    });

    function revealTagline() {
      TAGLINE_WORD_KEYS.forEach((_, i) => {
        const isLast = i === TAGLINE_WORD_KEYS.length - 1;
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
      <View style={styles.row}>
        {set.segments.map((seg, i) => (
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
        ))}
      </View>
      <View style={styles.taglineRow}>
        {TAGLINE_WORD_KEYS.map((key, i) => (
          <Animated.Text
            key={key}
            style={[
              styles.taglineWord,
              { opacity: wordOpacity[i], transform: [{ translateY: wordRise[i] }] },
            ]}
          >
            {t(key)}
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
  // flexDirection:'row' auto-mirrors under RTL and reorders the pieces.
  row: { flexDirection: 'row', alignItems: 'center', direction: 'ltr' },
  // The tagline is ordinary text, not a fixed logo asset — it's left free to mirror under RTL
  // (Arabic words cascade in from the right, matching how the language is actually read).
  taglineRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  taglineWord: { color: '#cc4408', fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
});
