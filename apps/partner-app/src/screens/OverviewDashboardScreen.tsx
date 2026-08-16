import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../lib/AuthContext';
import { api, type ReviewSummary } from '../lib/api';

export function OverviewDashboardScreen() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    api.reviewsSummary(token).then(setSummary).catch(() => {});
  }, [token]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Overview Dashboard</Text>
      <Text style={styles.subtitle}>
        Diner Satisfaction is live from your reviews. The rest need a public customer app to generate
        real traffic before they can show anything but zero.
      </Text>
      <View style={styles.grid}>
        <StatCard label="Profile Views" value="—" trend="Not tracked yet" />
        <StatCard label="Total Followers" value="—" trend="Not tracked yet" />
        <StatCard label="Menu Dish Views" value="—" trend="Not tracked yet" />
        <StatCard label="Chef Table Bookings" value="—" trend="Not built yet" />
        <StatCard
          label="Diner Satisfaction"
          value={summary ? `${summary.overallAverage.toFixed(1)}★` : '—'}
          trend={summary ? `from ${summary.totalCount} review${summary.totalCount === 1 ? '' : 's'}` : undefined}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
});
