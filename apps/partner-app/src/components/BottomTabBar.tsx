import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';
import type { NavItem, ScreenKey } from '../lib/nav';

interface BottomTabBarProps {
  items: NavItem[];
  active: ScreenKey;
  badges: Partial<Record<ScreenKey, number>>;
  onSelect: (key: ScreenKey) => void;
}

/** Phone-tier nav: every section in one horizontally scrollable row. */
export function BottomTabBar({ items, active, badges, onSelect }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('nav');
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {items.map((item) => {
          const isActive = item.key === active;
          const badgeCount = badges[item.key] ?? 0;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityLabel={badgeCount > 0 ? `${t(`items.${item.key}`)}, ${badgeCount} pending` : t(`items.${item.key}`)}
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.iconWrap}>
                <item.icon size={22} color={isActive ? colors.primary : colors.mutedForeground} />
                {badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={2}>
                {t(`items.${item.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isRTL: boolean) => StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  content: { paddingHorizontal: 8, gap: 4 },
  tab: { width: 84, alignItems: 'center', gap: 3, paddingVertical: 4 },
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: isRTL ? undefined : -8,
    left: isRTL ? -8 : undefined,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  tabLabel: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center', lineHeight: 13 },
  tabLabelActive: { color: colors.primary, fontWeight: '600' },
});
