import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { LucideIcon } from 'lucide-react-native';
import type { Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { AppText } from './AppText';

type Props = TabTriggerSlotProps & {
  icon: LucideIcon;
  label: string;
  badge?: string;
  ref?: Ref<View>;
};

// One item of the floating bottom bar - the active tab sits in a soft
// peach pill, like the design canvas.
export function TabButton({ icon: Icon, label, badge, isFocused, ...props }: Props) {
  const color = isFocused ? colors.orangeDark : colors.mutedIcon;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={[styles.button, isFocused && styles.active]}
    >
      {badge && (
        <View style={styles.badge}>
          <AppText weight="bold" style={styles.badgeText}>
            {badge}
          </AppText>
        </View>
      )}
      <Icon size={22} color={color} strokeWidth={isFocused ? 2 : 1.8} />
      <AppText weight={isFocused ? 'bold' : 'medium'} style={[styles.label, { color }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 64, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', gap: 2 },
  active: { backgroundColor: colors.peach },
  label: { fontSize: 11 },
  badge: {
    position: 'absolute',
    top: -6,
    backgroundColor: colors.orange,
    borderRadius: 6,
    paddingHorizontal: 6,
    zIndex: 1,
  },
  badgeText: { color: colors.white, fontSize: 9 },
});
