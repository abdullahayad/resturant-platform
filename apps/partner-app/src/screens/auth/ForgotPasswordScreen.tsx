import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { useLanguage } from '../../i18n/LanguageContext';
import { FormField } from '../../components/FormField';
import { BrandMark } from '../../components/BrandMark';
import { api } from '../../lib/api';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onDone: () => void;
}

type Step = 'email' | 'reset';

export function ForgotPasswordScreen({ onBack, onDone }: ForgotPasswordScreenProps) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const { t } = useTranslation('auth');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submitEmail = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.forgotPassword(email.trim());
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forgotPassword.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async () => {
    setError(null);
    if (newPassword.length < 8) {
      setError(t('forgotPassword.passwordTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(email.trim(), code.trim(), newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forgotPassword.invalidCode'));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.badgeWrap}>
            <BrandMark size={44} />
          </View>
          <Text style={styles.title}>{t('forgotPassword.successTitle')}</Text>
          <Text style={styles.subtitle}>{t('forgotPassword.successBody')}</Text>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={onDone}>
            <Text style={styles.primaryButtonText}>{t('forgotPassword.backToSignIn')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Pressable onPress={step === 'reset' ? () => setStep('email') : onBack} style={styles.backRow}>
          <BackIcon size={14} color={colors.mutedForeground} />
          <Text style={styles.back}>{t('common:actions.back')}</Text>
        </Pressable>
        <View style={styles.badgeWrap}>
          <BrandMark size={44} />
        </View>

        {step === 'email' ? (
          <>
            <Text style={styles.title}>{t('forgotPassword.title')}</Text>
            <Text style={styles.subtitle}>{t('forgotPassword.subtitle')}</Text>
            <FormField
              label={t('signIn.emailLabel')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('signIn.emailPlaceholder')}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={submitEmail}
              disabled={submitting || !email.trim()}
            >
              {submitting ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('forgotPassword.sendCode')}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('forgotPassword.resetTitle')}</Text>
            <Text style={styles.subtitle}>{t('forgotPassword.resetSubtitle', { email })}</Text>
            <FormField
              label={t('forgotPassword.codeLabel')}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
            />
            <FormField
              label={t('forgotPassword.newPasswordLabel')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder={t('signIn.passwordPlaceholder')}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={submitReset}
              disabled={submitting || code.trim().length !== 6 || !newPassword}
            >
              {submitting ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('forgotPassword.resetSubmit')}</Text>
              )}
            </Pressable>
            <Pressable onPress={submitEmail} disabled={submitting} style={styles.resendLink}>
              <Text style={styles.resendLinkText}>{t('forgotPassword.resendCode')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    title: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 4, textAlign: 'center' },
    subtitle: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginBottom: 8 },
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
    resendLink: { marginTop: 8, alignItems: 'center' },
    resendLinkText: { color: colors.mutedForeground, fontSize: 12, textDecorationLine: 'underline' },
  });
