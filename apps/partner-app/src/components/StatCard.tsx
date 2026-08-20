import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  /** 'up'/'down' render a colored arrow (only for an actual computed delta); 'neutral' (default) is a plain caption. */
  tone?: 'up' | 'down' | 'neutral';
}

export function StatCard({ label, value, trend, tone = 'neutral' }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {trend && (
        <View style={styles.trendRow}>
          {tone !== 'neutral' && (
            <Text style={[styles.trendArrow, tone === 'down' && styles.down]}>
              {tone === 'up' ? '▲' : '▼'}
            </Text>
          )}
          <Text style={[styles.trendText, tone === 'neutral' && styles.neutral, tone === 'down' && styles.down]}>
            {trend}
          </Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  label: { fontSize: 13, color: colors.mutedForeground },
  value: { fontSize: 26, fontWeight: '700', color: colors.foreground, marginTop: 8, letterSpacing: -0.5 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  trendArrow: { color: colors.success, fontSize: 11 },
  trendText: { color: colors.success, fontSize: 12 },
  neutral: { color: colors.mutedForeground },
  down: { color: colors.destructive },
});
