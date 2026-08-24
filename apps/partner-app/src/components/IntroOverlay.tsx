import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';

interface IntroOverlayProps {
  onDone: () => void;
  holdMs?: number;
  fadeMs?: number;
}

/** Full-screen brand intro shown right after the native splash hands off to JS — the native
 * splash itself has to stay brief (Android 12+ won't reliably hold it open on request), so this
 * is what actually delivers "full logo, hold, fade out" under our own control. */
export function IntroOverlay({ onDone, holdMs = 2000, fadeMs = 400 }: IntroOverlayProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeMs,
        useNativeDriver: true,
      }).start(onDone);
    }, holdMs);
    return () => clearTimeout(timer);
  }, [opacity, holdMs, fadeMs, onDone]);

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Image source={require('../../assets/logo-wordmark.png')} style={styles.logo} resizeMode="contain" />
    </Animated.View>
  );
}

const LOGO_WIDTH = 260;
const LOGO_ASPECT = 189 / 693;

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
  logo: { width: LOGO_WIDTH, height: LOGO_WIDTH * LOGO_ASPECT },
});
