import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';
import { getVisibleNavItems, type ScreenKey } from '../lib/nav';
import { useAuth } from '../lib/AuthContext';
import { BrandMark } from './BrandMark';

interface SidebarProps {
  active: ScreenKey;
  badges: Partial<Record<ScreenKey, number>>;
  onSelect: (key: ScreenKey) => void;
}

export function Sidebar({ active, badges, onSelect }: SidebarProps) {
  const { staff, enabledKeys } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const { t } = useTranslation('nav');
  const styles = useMemo(() => createStyles(colors, isRTL), [colors, isRTL]);
  const visibleItems = getVisibleNavItems(staff?.role, enabledKeys);

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <BrandMark size={34} />
        <View>
          <Text style={styles.brandTitle}>{t('brand')}</Text>
          <Text style={styles.brandSubtitle}>#IRQ-00000</Text>
        </View>
      </View>
      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent} showsVerticalScrollIndicator={false}>
        {visibleItems.map((item) => {
          const isActive = item.key === active;
          const badgeCount = badges[item.key] ?? 0;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={[styles.navItem, isActive && styles.navItemActive]}
              accessibilityRole="tab"
              accessibilityLabel={badgeCount > 0 ? `${t(`items.${item.key}`)}, ${badgeCount} pending` : t(`items.${item.key}`)}
              accessibilityState={{ selected: isActive }}
            >
              {isActive && <View style={styles.activeBar} />}
              <View style={styles.navItemContent}>
                <item.icon size={16} color={isActive ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {t(`items.${item.key}`)}
                </Text>
              </View>
              {item.comingSoon && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('common:soon')}</Text>
                </View>
              )}
              {badgeCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isRTL: boolean) => StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.card,
    borderRightWidth: isRTL ? 0 : 1,
    borderLeftWidth: isRTL ? 1 : 0,
    borderRightColor: colors.border,
    borderLeftColor: colors.border,
    paddingVertical: 20,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: isRTL ? -4 : 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, marginBottom: 24 },
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
    left: isRTL ? undefined : -12,
    right: isRTL ? -12 : undefined,
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
  notifBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
