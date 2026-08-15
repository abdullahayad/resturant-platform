import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
}

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {trend && (
        <View style={styles.trendRow}>
          <Text style={styles.trendArrow}>▲</Text>
          <Text style={styles.trendText}>{trend}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  label: { fontSize: 13, color: colors.mutedForeground },
  value: { fontSize: 24, fontWeight: '600', color: colors.foreground, marginTop: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  trendArrow: { color: colors.success, fontSize: 11 },
  trendText: { color: colors.success, fontSize: 12 },
});
