import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

interface DateFieldProps {
  label: string;
  value: string; // 'YYYY-MM-DD', or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
}

function toDate(value: string): Date {
  const d = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DateField({ label, value, onChange, placeholder }: DateFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [show, setShow] = useState(false);

  const displayText = value
    ? toDate(value).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : placeholder;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display="compact"
          onChange={(_event, date) => date && onChange(toDateString(date))}
          style={styles.iosCompact}
        />
      ) : (
        <>
          <Pressable style={styles.input} onPress={() => setShow(true)} accessibilityLabel={label}>
            <Text style={value ? styles.valueText : styles.placeholderText}>{displayText}</Text>
          </Pressable>
          {show && (
            <DateTimePicker
              value={toDate(value)}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShow(false);
                if (event.type === 'set' && date) onChange(toDateString(date));
              }}
            />
          )}
        </>
      )}
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
    backgroundColor: colors.secondary,
  },
  valueText: { color: colors.foreground, fontSize: 14 },
  placeholderText: { color: colors.mutedForeground, fontSize: 14 },
  iosCompact: { alignSelf: 'flex-start' },
});
