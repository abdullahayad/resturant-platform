import { createElement, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

interface TimeFieldProps {
  label: string;
  value: string; // 'HH:mm', or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Web fallback: @react-native-community/datetimepicker has no web implementation, so this
 * renders a real browser <input type="time">, which already gives a native clock popup. */
export function TimeField({ label, value, onChange, placeholder }: TimeFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {createElement('input', {
        type: 'time',
        value,
        placeholder,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        style: styles.input,
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, color: colors.mutedForeground },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
    backgroundColor: colors.secondary,
    fontSize: 14,
    fontFamily: 'inherit',
    outlineWidth: 0,
  } as never,
});
