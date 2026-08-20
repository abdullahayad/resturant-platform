import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import type { NavItem, ScreenKey } from '../lib/nav';

interface BottomTabBarProps {
  primaryItems: NavItem[];
  active: ScreenKey;
  moreActive: boolean;
  onSelect: (key: ScreenKey) => void;
  onMore: () => void;
}

/** Phone-tier nav: the 4 primary items plus a "More" tab for everything else. */
export function BottomTabBar({ primaryItems, active, moreActive, onSelect, onMore }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('nav');
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {primaryItems.map((item) => {
        const isActive = !moreActive && item.key === active;
        return (
          <Pressable key={item.key} onPress={() => onSelect(item.key)} style={styles.tab}>
            <item.icon size={22} color={isActive ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={1}>
              {t(`items.${item.key}`)}
            </Text>
          </Pressable>
        );
      })}
      <Pressable onPress={onMore} style={styles.tab}>
        <MoreHorizontal size={22} color={moreActive ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.tabLabel, moreActive && styles.tabLabelActive]}>{t('more')}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  tabLabel: { fontSize: 11, color: colors.mutedForeground },
  tabLabelActive: { color: colors.primary, fontWeight: '600' },
});
