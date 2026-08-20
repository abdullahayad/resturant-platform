import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { UtensilsCrossed } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';
import { getVisibleNavItems, type ScreenKey } from '../lib/nav';
import { useAuth } from '../lib/AuthContext';

interface NavRailProps {
  active: ScreenKey;
  onSelect: (key: ScreenKey) => void;
}

/** Medium-width tier (portrait tablets): icon-only column, same nav data as Sidebar/BottomTabBar. */
export function NavRail({ active, onSelect }: NavRailProps) {
  const { staff } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);
  const visibleItems = getVisibleNavItems(staff?.role);

  return (
    <View style={styles.rail}>
      <View style={styles.brandBadge}>
        <UtensilsCrossed size={18} color={colors.primaryForeground} />
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
              <item.icon size={20} color={isActive ? colors.primary : colors.mutedForeground} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isRTL: boolean) => StyleSheet.create({
  rail: {
    width: 64,
    backgroundColor: colors.card,
    borderRightWidth: isRTL ? 0 : 1,
    borderLeftWidth: isRTL ? 1 : 0,
    borderRightColor: colors.border,
    borderLeftColor: colors.border,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: isRTL ? -4 : 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
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
  nav: { flex: 1, alignSelf: 'stretch' },
  navContent: { alignItems: 'center', gap: 4 },
  navItem: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: { backgroundColor: colors.primaryTint15 },
});
