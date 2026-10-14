import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';

interface FormFieldProps extends TextInputProps {
  label: string;
}

export function FormField({
  label,
  style,
  onFocus,
  onBlur,
  editable = true,
  secureTextEntry,
  ...inputProps
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  // Only password fields (secureTextEntry passed at all) get the eye toggle -
  // starts hidden, same as the browser/OS default for a password field.
  const [revealed, setRevealed] = useState(false);
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPasswordField = secureTextEntry !== undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          editable={editable}
          secureTextEntry={isPasswordField && !revealed}
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            isPasswordField && (isRTL ? styles.inputPaddedStart : styles.inputPaddedEnd),
            focused && styles.inputFocused,
            !editable && styles.inputDisabled,
            style,
          ]}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {isPasswordField && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            style={[styles.revealButton, isRTL ? styles.revealButtonStart : styles.revealButtonEnd]}
            hitSlop={8}
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? (
              <EyeOff size={18} color={colors.mutedForeground} />
            ) : (
              <Eye size={18} color={colors.mutedForeground} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, color: colors.mutedForeground },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
    backgroundColor: colors.secondary,
    fontSize: 14,
    // react-native-web renders TextInput as a real <input>, which gets the
    // browser's own default focus outline on top of our custom glow below.
    outlineWidth: 0,
  },
  // Extra room so the password text never runs under the eye button.
  inputPaddedEnd: { paddingRight: 42 },
  inputPaddedStart: { paddingLeft: 42 },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  revealButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealButtonEnd: { right: 0 },
  revealButtonStart: { left: 0 },
});
