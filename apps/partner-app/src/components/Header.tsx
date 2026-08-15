import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>R</Text>
      </View>
      <View>
        <Text style={styles.name}>Demo Restaurant · مطعم تجريبي</Text>
        <Text style={styles.code}>#IRQ-00001</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 18 },
  name: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
  code: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
});
