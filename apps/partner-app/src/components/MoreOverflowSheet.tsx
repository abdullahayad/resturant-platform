import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import type { NavItem, ScreenKey } from '../lib/nav';

interface MoreOverflowSheetProps {
  visible: boolean;
  items: NavItem[];
  active: ScreenKey;
  onSelect: (key: ScreenKey) => void;
  onClose: () => void;
}

// Same reasoning as LegalDocumentModal.tsx: RN's <Modal> doesn't reliably
// overlay the full viewport on react-native-web, so this uses the same
// manual position:'fixed' backdrop instead of <Modal>.
const backdropStyle: ViewStyle = { position: 'fixed' as ViewStyle['position'] };

/** Phone-tier overflow list for nav items that don't fit on the bottom tab bar. */
export function MoreOverflowSheet({ visible, items, active, onSelect, onClose }: MoreOverflowSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!visible) return null;

  return (
    <View style={[styles.backdrop, backdropStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {items.map((item) => {
            const isActive = item.key === active;
            return (
              <Pressable
                key={item.key}
                onPress={() => onSelect(item.key)}
                style={[styles.item, isActive && styles.itemActive]}
              >
                <item.icon size={18} color={isActive ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>{item.labelEn}</Text>
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
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '70%',
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 12, paddingBottom: 8, gap: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemActive: { backgroundColor: colors.primaryTint15 },
  itemLabel: { flex: 1, color: colors.mutedForeground, fontSize: 15 },
  itemLabelActive: { color: colors.primary, fontWeight: '600' },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.secondary,
  },
  badgeText: { color: colors.mutedForeground, fontSize: 10 },
});
