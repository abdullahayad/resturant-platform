import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { navItems, type ScreenKey } from '../lib/nav';

interface SidebarProps {
  active: ScreenKey;
  onSelect: (key: ScreenKey) => void;
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>Partner Portal</Text>
        <Text style={styles.brandSubtitle}>#IRQ-00000</Text>
      </View>
      <View style={styles.nav}>
        {navItems.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={[styles.navItem, isActive && styles.navItemActive]}
            >
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.labelEn}
              </Text>
              {item.comingSoon && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Soon</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  brand: { paddingHorizontal: 8, marginBottom: 20 },
  brandTitle: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  brandSubtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  nav: { gap: 2 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  navItemActive: { backgroundColor: 'rgba(217, 154, 78, 0.15)' },
  navLabel: { color: colors.mutedForeground, fontSize: 14 },
  navLabelActive: { color: colors.primary, fontWeight: '600' },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.secondary,
  },
  badgeText: { color: colors.mutedForeground, fontSize: 10 },
});
