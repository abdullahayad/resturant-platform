import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

interface IntroOverlayProps {
  onDone: () => void;
  holdMs?: number;
  fadeMs?: number;
}

// Source pixel widths of the three cropped pieces (all share the source height, 189px).
const SEGMENTS = [
  { source: require('../../assets/intro-li.png'), width: 112 },
  { source: require('../../assets/intro-q.png'), width: 168 },
  { source: require('../../assets/intro-eta.png'), width: 413 },
] as const;
const SOURCE_HEIGHT = 189;
const DISPLAY_WIDTH = 260;
const SCALE = DISPLAY_WIDTH / (112 + 168 + 413);
const DISPLAY_HEIGHT = SOURCE_HEIGHT * SCALE;

const DROP_START_Y = -160;
const STAGGER_MS = 180;
const LEAD_IN_MS = 2000;

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

/** Full-screen brand intro shown right after the native splash hands off to JS: plain white for
 * LEAD_IN_MS, then "Li", "Q", and "ETA" drop in one after another (each bouncing twice before
 * settling), then the assembled wordmark holds before fading into the app. The native splash
 * itself is configured with no image at all (just white) — Android 12+ won't reliably hold it
 * open on request and its splash-icon rendering center-crops wide art, so all the actual logo
 * presentation happens here instead, under our own control. */
export function IntroOverlay({ onDone, holdMs = 2000, fadeMs = 400 }: IntroOverlayProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const dropY = useRef(SEGMENTS.map(() => new Animated.Value(DROP_START_Y))).current;

  useEffect(() => {
    SEGMENTS.forEach((_, i) => {
      const isLast = i === SEGMENTS.length - 1;
      dropWithBounce(dropY[i], LEAD_IN_MS + i * STAGGER_MS, isLast ? finishIntro : undefined);
    });

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
        {SEGMENTS.map((seg, i) => (
          <Animated.Image
            key={i}
            source={seg.source}
            style={{
              width: seg.width * SCALE,
              height: DISPLAY_HEIGHT,
              transform: [{ translateY: dropY[i] }],
            }}
            resizeMode="contain"
          />
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
  row: { flexDirection: 'row', alignItems: 'center' },
});
