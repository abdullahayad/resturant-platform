import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { useLanguage } from '../../i18n/LanguageContext';
import { FormField } from '../../components/FormField';
import { BrandMark } from '../../components/BrandMark';
import { api, type AuthenticatedRestaurant, type StaffSession } from '../../lib/api';

interface SignInScreenProps {
  onBack: () => void;
  onSignedIn: (token: string, restaurant: AuthenticatedRestaurant, staff?: StaffSession) => void;
  onForgotPassword: () => void;
  sessionExpired?: boolean;
}

export function SignInScreen({ onBack, onSignedIn, onForgotPassword, sessionExpired }: SignInScreenProps) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const { t } = useTranslation('auth');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  // The backend's free hosting tier can take up to ~50s to wake up after
  // sitting idle — sign-in is most people's very first request, so without
  // this a slow wake-up just looks like a frozen button.
  const [signInSlow, setSignInSlow] = useState(false);
  useEffect(() => {
    if (!submitting) {
      setSignInSlow(false);
      return;
    }
    const timer = setTimeout(() => setSignInSlow(true), 6000);
    return () => clearTimeout(timer);
  }, [submitting]);

  const submit = async (overrideEmail?: string, overridePassword?: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.login(overrideEmail ?? email, overridePassword ?? password);
      onSignedIn(result.accessToken, result.restaurant, result.staff);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signIn.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Pressable onPress={onBack} style={styles.backRow}>
          <BackIcon size={14} color={colors.mutedForeground} />
          <Text style={styles.back}>{t('common:actions.back')}</Text>
        </Pressable>
        <View style={styles.badgeWrap}>
          <BrandMark size={44} />
        </View>
        <Text style={styles.title}>{t('signIn.title')}</Text>
        {sessionExpired && <Text style={styles.notice}>{t('signIn.sessionExpired')}</Text>}

        <FormField
          label={t('signIn.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('signIn.emailPlaceholder')}
        />
        <FormField
          label={t('signIn.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('signIn.passwordPlaceholder')}
        />

        <Pressable onPress={onForgotPassword} style={styles.forgotLink}>
          <Text style={styles.forgotLinkText}>{t('signIn.forgotPassword')}</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.button, styles.primaryButton]} onPress={() => submit()} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('signIn.submit')}</Text>
          )}
        </Pressable>
        {signInSlow && <Text style={styles.slowHint}>{t('common:wakingUpServer')}</Text>}

        {__DEV__ && (
          <Pressable
            style={styles.devLink}
            onPress={() => {
              setEmail('demo@restaurant.iq');
              setPassword('DemoPass123');
              submit('demo@restaurant.iq', 'DemoPass123');
            }}
          >
            <Text style={styles.devLinkText}>{t('signIn.devLink')}</Text>
          </Pressable>
        )}
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
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  back: { color: colors.mutedForeground, fontSize: 14 },
  badgeWrap: { alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 8, textAlign: 'center' },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  error: { color: colors.destructive, fontSize: 13 },
  notice: {
    color: colors.primary,
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: colors.primaryTint15,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  slowHint: { color: colors.mutedForeground, fontSize: 12.5, textAlign: 'center', marginTop: -4 },
  forgotLink: { alignSelf: 'flex-end' },
  forgotLinkText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  devLink: { marginTop: 8, alignItems: 'center' },
  devLinkText: { color: colors.mutedForeground, fontSize: 12, textDecorationLine: 'underline' },
});
