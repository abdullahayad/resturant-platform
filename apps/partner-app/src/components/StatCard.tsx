import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { radii, raisedShadow } from '../theme/tokens';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  /** 'up'/'down' render a colored arrow (only for an actual computed delta); 'neutral' (default) is a plain caption. */
  tone?: 'up' | 'down' | 'neutral';
  /** For stats that aren't implemented yet (not "loading", never populated) — dashed border and a
   * muted pill instead of a plain caption, so it reads as intentional rather than broken. */
  comingSoon?: boolean;
}

export function StatCard({ label, value, trend, tone = 'neutral', comingSoon = false }: StatCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.card, comingSoon && styles.cardComingSoon]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, comingSoon && styles.valueMuted]}>{value}</Text>
      {trend && (
        comingSoon ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{trend}</Text>
          </View>
        ) : (
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
        )
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    ...raisedShadow,
  },
  cardComingSoon: {
    borderStyle: 'dashed',
    shadowOpacity: 0,
    elevation: 0,
  },
  label: { fontSize: 13, color: colors.mutedForeground },
  value: { fontSize: 26, fontWeight: '700', color: colors.foreground, marginTop: 8, letterSpacing: -0.5 },
  valueMuted: { color: colors.mutedForeground },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  trendArrow: { color: colors.success, fontSize: 11 },
  trendText: { color: colors.success, fontSize: 12 },
  neutral: { color: colors.mutedForeground },
  down: { color: colors.destructive },
  pill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.secondary,
  },
  pillText: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600' },
});
