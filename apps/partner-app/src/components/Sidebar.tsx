import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { UtensilsCrossed } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { getVisibleNavItems, type ScreenKey } from '../lib/nav';
import { useAuth } from '../lib/AuthContext';

interface SidebarProps {
  active: ScreenKey;
  onSelect: (key: ScreenKey) => void;
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  const { staff } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const visibleItems = getVisibleNavItems(staff?.role);

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.brandBadge}>
          <UtensilsCrossed size={18} color={colors.primaryForeground} />
        </View>
        <View>
          <Text style={styles.brandTitle}>Partner Portal</Text>
          <Text style={styles.brandSubtitle}>#IRQ-00000</Text>
        </View>
      </View>
      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent} showsVerticalScrollIndicator={false}>
        {visibleItems.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={[styles.navItem, isActive && styles.navItemActive]}
            >
              {isActive && <View style={styles.activeBar} />}
              <View style={styles.navItemContent}>
                <item.icon size={16} color={isActive ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.labelEn}
                </Text>
              </View>
              {item.comingSoon && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Soon</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 20,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, marginBottom: 24 },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  brandTitle: { color: colors.primary, fontSize: 17, fontWeight: '700' },
  brandSubtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 1 },
  nav: { flex: 1 },
  navContent: { gap: 2 },
  navItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navItemActive: { backgroundColor: colors.primaryTint15 },
  navItemContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeBar: {
    position: 'absolute',
    left: -12,
    top: '50%',
    marginTop: -8,
    width: 3,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
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
