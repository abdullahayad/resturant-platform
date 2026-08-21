import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import type { NavItem, ScreenKey } from '../lib/nav';

interface BottomTabBarProps {
  items: NavItem[];
  active: ScreenKey;
  onSelect: (key: ScreenKey) => void;
}

/** Phone-tier nav: every section in one horizontally scrollable row. */
export function BottomTabBar({ items, active, onSelect }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('nav');
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable key={item.key} onPress={() => onSelect(item.key)} style={styles.tab}>
              <item.icon size={22} color={isActive ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={1}>
                {t(`items.${item.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  content: { paddingHorizontal: 8, gap: 4 },
  tab: { width: 72, alignItems: 'center', gap: 3, paddingVertical: 4 },
  tabLabel: { fontSize: 11, color: colors.mutedForeground },
  tabLabelActive: { color: colors.primary, fontWeight: '600' },
});
