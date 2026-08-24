import { Image, StyleSheet } from 'react-native';

interface BrandMarkProps {
  size?: number;
}

/** The app's brand mark, used everywhere branding appears in the UI chrome (nav, auth screens,
 * boot screen). Renders just the pin symbol from the LiQETA logo — a compact square badge can't
 * fit the full wordmark legibly, unlike the native app icon which uses the full logo. */
export function BrandMark({ size = 40 }: BrandMarkProps) {
  return (
    <Image
      source={require('../../assets/logo-pin-mark.png')}
      style={[styles.mark, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
});
