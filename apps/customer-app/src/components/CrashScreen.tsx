import * as Sentry from '@sentry/react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { AppText } from './AppText';

// Shown instead of a blank or frozen screen when something breaks while
// drawing a screen. The error goes to Sentry so we can fix it, and the
// customer can try again without restarting the app.
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();

  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: 'screen' } });
  }, [error]);

  return (
    <View style={styles.wrap}>
      <AppText weight="bold" style={styles.title}>
        {t('crash.title')}
      </AppText>
      <AppText style={styles.text}>{t('crash.text')}</AppText>
      <Pressable style={styles.button} onPress={retry} accessibilityRole="button">
        <RefreshCw size={18} color={colors.white} />
        <AppText weight="bold" style={styles.buttonText}>
          {t('crash.retry')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: colors.background },
  title: { fontSize: 20, textAlign: 'center' },
  text: { fontSize: 14.5, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  button: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.orange,
  },
  buttonText: { color: colors.white, fontSize: 15.5 },
});
