import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

// The backend's free hosting tier falls asleep after 15 minutes idle and
// can take up to ~50s to wake on the next request — with nothing else on
// screen, that reads as "the app is broken" rather than "still loading".
// A plain spinner says nothing for the first several seconds either way
// (a normal, awake request is near-instant), so this delay only ever
// shows up during that genuine slow case.
const SLOW_HINT_DELAY_MS = 6000;

/** The "centered spinner replacing screen content" pattern that was hand-rolled per screen. */
export function LoadingState() {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowHint(true), SLOW_HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      {showSlowHint && <Text style={styles.hint}>{t('wakingUpServer')}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48 },
  hint: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', paddingHorizontal: 32 },
});
