import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

interface TimeFieldProps {
  label: string;
  value: string; // 'HH:mm', or '' when unset
  onChange: (value: string) => void;
  placeholder?: string;
}

function toDate(value: string): Date {
  const d = new Date();
  if (value) {
    const [h, m] = value.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

function toTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TimeField({ label, value, onChange, placeholder }: TimeFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [show, setShow] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          display="compact"
          onChange={(_event, date) => date && onChange(toTimeString(date))}
          style={styles.iosCompact}
        />
      ) : (
        <>
          <Pressable style={styles.input} onPress={() => setShow(true)} accessibilityLabel={label}>
            <Text style={value ? styles.valueText : styles.placeholderText}>{value || placeholder}</Text>
          </Pressable>
          {show && (
            <DateTimePicker
              value={toDate(value)}
              mode="time"
              display="default"
              is24Hour
              onChange={(event, date) => {
                setShow(false);
                if (event.type === 'set' && date) onChange(toTimeString(date));
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
