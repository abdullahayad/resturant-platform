import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { BrandMark } from '../../components/BrandMark';

interface AuthLandingScreenProps {
  onSignIn: () => void;
  onRegister: () => void;
}

export function AuthLandingScreen({ onSignIn, onRegister }: AuthLandingScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('auth');
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badgeWrap}>
          <BrandMark size={56} />
        </View>
        <Text style={styles.brand}>{t('landing.brand')}</Text>
        <Text style={styles.subtitle}>{t('landing.subtitle')}</Text>

        <Pressable style={[styles.button, styles.primaryButton]} onPress={onSignIn}>
          <Text style={styles.primaryButtonText}>{t('landing.signIn')}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={onRegister}>
          <Text style={styles.secondaryButtonText}>{t('landing.register')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
  },
  badgeWrap: { alignSelf: 'center', marginBottom: 4 },
  brand: { fontSize: 22, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.foreground, fontWeight: '600', fontSize: 15 },
});
