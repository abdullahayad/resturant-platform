import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface ChipOption {
  id: string;
  label: string;
}

interface ChipSelectProps {
  options: ChipOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  multi?: boolean;
}

export function ChipSelect({ options, selectedIds, onToggle, multi = true }: ChipSelectProps) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = selectedIds.includes(option.id);
        return (
          <Pressable
            key={option.id}
            onPress={() => onToggle(option.id)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
      {options.length === 0 && <Text style={styles.empty}>Loading…</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.mutedForeground, fontSize: 13 },
  chipTextSelected: { color: colors.primaryForeground, fontWeight: '600' },
  empty: { color: colors.mutedForeground, fontSize: 13 },
});
