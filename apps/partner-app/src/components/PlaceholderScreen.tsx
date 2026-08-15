import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  comingSoon?: boolean;
}

export function PlaceholderScreen({ title, description, comingSoon }: PlaceholderScreenProps) {
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

const styles = StyleSheet.create({
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
