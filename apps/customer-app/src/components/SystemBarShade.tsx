import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The app draws behind Android's back/home/recent buttons, and those light
// buttons disappear on our white screens - this grey strip sits behind
// them, and only there.
export function SystemBarShade() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android' || insets.bottom === 0) return null;
  return <View pointerEvents="none" style={[styles.shade, { height: insets.bottom }]} />;
}

const styles = StyleSheet.create({
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#77757F' },
});
