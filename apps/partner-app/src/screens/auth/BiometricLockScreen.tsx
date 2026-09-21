import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { ScanFace } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { BrandMark } from '../../components/BrandMark';

interface BiometricLockScreenProps {
  onUnlocked: () => void;
  onUsePasswordInstead: () => void;
}

/** Shown in front of the app when a stored session exists and the device has biometrics
 * enrolled — App.tsx decides *when* this appears (cold start, or resuming after a long
 * background stint); this component only owns the actual unlock attempt and its outcome. */
export function BiometricLockScreen({ onUnlocked, onUsePasswordInstead }: BiometricLockScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('auth');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prompting, setPrompting] = useState(false);
  const [failed, setFailed] = useState(false);

  const attempt = useCallback(async () => {
    setFailed(false);
    setPrompting(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.promptMessage'),
        disableDeviceFallback: false,
      });
      if (result.success) onUnlocked();
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPrompting(false);
    }
  }, [onUnlocked, t]);

  // Auto-prompt once on mount, so opening the app goes straight to the Face
  // ID/fingerprint sheet instead of requiring an extra tap first.
  useEffect(() => {
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badgeWrap}>
          <BrandMark size={44} />
        </View>
        <View style={styles.iconWrap}>
          <ScanFace size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t('lock.title')}</Text>
        <Text style={styles.subtitle}>{t('lock.subtitle')}</Text>

        {failed && <Text style={styles.error}>{t('lock.failed')}</Text>}

        <Pressable style={[styles.button, styles.primaryButton]} onPress={attempt} disabled={prompting}>
          {prompting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('lock.tryAgain')}</Text>
          )}
        </Pressable>

        <Pressable onPress={onUsePasswordInstead} style={styles.passwordLink}>
          <Text style={styles.passwordLinkText}>{t('lock.usePassword')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    gap: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
  },
  badgeWrap: { marginBottom: 4 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  subtitle: { fontSize: 13.5, color: colors.mutedForeground, textAlign: 'center', marginBottom: 8 },
  error: { color: colors.destructive, fontSize: 13, textAlign: 'center' },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', alignSelf: 'stretch', marginTop: 4 },
  primaryButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  passwordLink: { marginTop: 4 },
  passwordLinkText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
