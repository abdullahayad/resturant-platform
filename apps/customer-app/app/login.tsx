import { router } from 'expo-router';
import { MessageCircle, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../src/components/AppText';
import { api, ApiError } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { isIraqiMobile } from '../src/lib/format';
import { colors, fonts } from '../src/theme';

// Sign in with a 6-digit code sent on WhatsApp - no password. A new number
// creates the account on the spot.
export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeInput = useRef<TextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // The server answers in English; the customer sees their own language.
  const message = (e: unknown) => {
    if (!(e instanceof ApiError)) return t('login.failed');
    if (e.status === 429) return t('login.wait');
    if (e.status === 503) return t('login.unavailable');
    if (e.message === 'Wrong code') return t('login.wrongCode');
    if (e.message.startsWith('This code has expired')) return t('login.expired');
    if (e.status === 400) return t('booking.phoneInvalid');
    return t('login.failed');
  };

  const sendCode = async () => {
    if (!isIraqiMobile(phone)) return setError(t('booking.phoneInvalid'));
    setError(null);
    setBusy(true);
    try {
      const res = await api.requestCode(phone);
      setResendIn(res.resendInSeconds);
      setStep('code');
      setCode('');
      setTimeout(() => codeInput.current?.focus(), 300);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (!/^\d{6}$/.test(value)) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api.verifyCode(phone, value);
      await signIn(res.token, res.customer);
      router.back();
    } catch (e) {
      setError(message(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.close} onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('home.close')}>
          <X size={24} color={colors.text} />
        </Pressable>

        <View style={styles.body}>
          <View style={styles.icon}>
            <MessageCircle size={34} color={colors.white} />
          </View>
          <AppText weight="bold" style={styles.title}>
            {step === 'phone' ? t('login.title') : t('login.codeTitle')}
          </AppText>
          <AppText style={styles.text}>
            {step === 'phone' ? t('login.text') : t('login.codeText', { phone })}
          </AppText>

          {step === 'phone' ? (
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="07XX XXX XXXX"
              placeholderTextColor={colors.mutedIcon}
              maxLength={20}
              autoFocus
              autoComplete="tel"
              onSubmitEditing={sendCode}
              accessibilityLabel={t('booking.phone')}
            />
          ) : (
            <TextInput
              ref={codeInput}
              value={code}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, 6);
                setCode(digits);
                if (digits.length === 6) verify(digits);
              }}
              style={[styles.input, styles.codeInput]}
              keyboardType="number-pad"
              placeholder="••••••"
              placeholderTextColor={colors.mutedIcon}
              maxLength={6}
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              accessibilityLabel={t('login.codeLabel')}
            />
          )}

          {!!error && <AppText style={styles.error}>{error}</AppText>}

          <Pressable
            style={[styles.primary, busy && styles.disabled]}
            onPress={step === 'phone' ? sendCode : () => verify(code)}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <AppText weight="bold" style={styles.primaryText}>
                {step === 'phone' ? t('login.send') : t('login.confirm')}
              </AppText>
            )}
          </Pressable>

          {step === 'code' && (
            <View style={styles.row}>
              <Pressable onPress={() => setStep('phone')} hitSlop={8}>
                <AppText weight="semibold" style={styles.link}>
                  {t('login.changeNumber')}
                </AppText>
              </Pressable>
              <Pressable onPress={sendCode} disabled={resendIn > 0 || busy} hitSlop={8}>
                <AppText weight="semibold" style={[styles.link, resendIn > 0 && styles.linkDisabled]}>
                  {resendIn > 0 ? t('login.resendIn', { n: resendIn }) : t('login.resend')}
                </AppText>
              </Pressable>
            </View>
          )}

          <AppText style={styles.note}>{t('login.note')}</AppText>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  close: { alignSelf: 'flex-end', padding: 16 },
  body: { paddingHorizontal: 24, gap: 12, alignItems: 'stretch' },
  icon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#25A244',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 24, textAlign: 'center' },
  text: { fontSize: 14.5, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontFamily: fonts.semibold,
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  codeInput: { letterSpacing: 10, fontSize: 24 },
  error: { fontSize: 13.5, color: colors.red, textAlign: 'center' },
  primary: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryText: { color: colors.white, fontSize: 16 },
  disabled: { opacity: 0.6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { fontSize: 14, color: colors.blue },
  linkDisabled: { color: colors.mutedIcon },
  note: { fontSize: 12.5, color: colors.mutedIcon, textAlign: 'center', marginTop: 12, lineHeight: 19 },
});
