import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { StatCard } from '../components/StatCard';

export function OverviewDashboardScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Overview Dashboard</Text>
      <Text style={styles.subtitle}>Wired to real stats once the analytics endpoints land.</Text>
      <View style={styles.grid}>
        <StatCard label="Profile Views" value="—" trend="vs last week" />
        <StatCard label="Total Followers" value="—" trend="daily new followers" />
        <StatCard label="Menu Dish Views" value="—" trend="daily viewer trend" />
        <StatCard label="Chef Table Bookings" value="—" trend="weekly booking trend" />
        <StatCard label="Diner Satisfaction" value="—" trend="star rating" />
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
