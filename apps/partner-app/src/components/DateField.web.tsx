import { createElement, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { NATIVE_DT_CLASS, ensureNativeDateTimeStyles } from './nativeDateTimeInput.web';

interface DateFieldProps {
  label: string;
  value: string; // 'YYYY-MM-DD', or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Web fallback: @react-native-community/datetimepicker has no web implementation, so this
 * renders a real browser <input type="date">, which already gives a native calendar popup —
 * styled to match the app's own theme (including the popup itself, via colorScheme). */
export function DateField({ label, value, onChange, placeholder }: DateFieldProps) {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  useEffect(ensureNativeDateTimeStyles, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {createElement('input', {
        type: 'date',
        value,
        placeholder,
        className: NATIVE_DT_CLASS,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        style: {
          ...(styles.input as object),
          colorScheme: theme,
          '--dt-border-default': colors.border,
        },
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, color: colors.mutedForeground },
  input: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
    backgroundColor: colors.secondary,
    fontSize: 14,
    fontFamily: 'inherit',
    outlineWidth: 0,
    '--dt-border-hover': colors.mutedForeground,
    '--dt-border-focus': colors.primary,
    '--dt-glow': colors.primaryTint30,
    '--dt-icon-hover-bg': colors.primaryTint15,
  } as never,
});
