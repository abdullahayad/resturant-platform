import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { UtensilsCrossed } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

interface BrandMarkProps {
  size?: number;
}

/** The app's brand mark, used everywhere branding appears in the UI chrome (nav, auth screens,
 * boot screen). Centralized so swapping in a real logo image later is a one-file change instead
 * of editing every place it's rendered. */
export function BrandMark({ size = 40 }: BrandMarkProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const iconSize = Math.round(size * 0.46);
  const radius = Math.round(size * 0.28);
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: radius }]}>
      <UtensilsCrossed size={iconSize} color={colors.primaryForeground} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  badge: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
});
