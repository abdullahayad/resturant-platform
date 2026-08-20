import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  comingSoon?: boolean;
}

export function PlaceholderScreen({ title, description, comingSoon }: PlaceholderScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>{comingSoon ? 'Coming soon' : 'Not yet implemented'}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, gap: 8 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  description: { fontSize: 14, color: colors.mutedForeground },
  card: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { color: colors.mutedForeground, fontSize: 14 },
});
