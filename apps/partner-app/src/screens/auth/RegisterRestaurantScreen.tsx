import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { useLanguage } from '../../i18n/LanguageContext';
import { FormField } from '../../components/FormField';
import { ChipSelect } from '../../components/ChipSelect';
import { LegalDocumentModal } from '../../components/LegalDocumentModal';
import { BrandMark } from '../../components/BrandMark';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../../lib/legalContent';
import { localizedName } from '../../lib/localizedName';
import { api, type MasterDataItem, type Province } from '../../lib/api';

interface RegisterRestaurantScreenProps {
  onBack: () => void;
  onRegistered: () => void;
}

// Iraqi domestic numbers are written with or without the leading 0
// (07XXXXXXXXX, 11 digits, or 7XXXXXXXXX, 10 digits); anything starting
// with + or 00 is treated as international - a 2-3 digit country code
// followed by a 10-digit number, e.g. +964 770 123 4567 or
// 00964 770 123 4567.
function isValidPhoneNumber(raw: string): boolean {
  const cleaned = raw.trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '');
    return digits.length === 12 || digits.length === 13;
  }
  if (cleaned.startsWith('00')) {
    const digits = cleaned.slice(2).replace(/\D/g, '');
    return digits.length === 12 || digits.length === 13;
  }
  const digits = cleaned.replace(/\D/g, '');
  return cleaned.startsWith('0') ? digits.length === 11 : digits.length === 10;
}

const isValidEmailAddress = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());

export function RegisterRestaurantScreen({ onBack, onRegistered }: RegisterRestaurantScreenProps) {
  const { colors } = useTheme();
  const { isRTL, language } = useLanguage();
  const { t } = useTranslation('auth');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;
  const [businessTypes, setBusinessTypes] = useState<MasterDataItem[]>([]);
  const [foodCategories, setFoodCategories] = useState<MasterDataItem[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessTypeIds, setBusinessTypeIds] = useState<string[]>([]);
  const [foodCategoryIds, setFoodCategoryIds] = useState<string[]>([]);
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Set once the form's been submitted and a code emailed - while this is
  // set, the screen shows the "enter your code" step instead of the form.
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Which text fields the user has already left (tabbed/clicked away from)
  // at least once - an inline red error only shows for a field once they've
  // actually moved past it, not while they're still mid-typing their first
  // character.
  const [touched, setTouched] = useState({ nameEn: false, nameAr: false, phone: false, email: false, password: false });
  const markTouched = (field: keyof typeof touched) => setTouched((t) => ({ ...t, [field]: true }));

  useEffect(() => {
    Promise.all([api.businessTypes(), api.foodCategories(), api.provinces()])
      .then(([bt, fc, pr]) => {
        setBusinessTypes(bt);
        setFoodCategories(fc);
        setProvinces(pr);
      })
      .catch(() => setLoadError(t('common:networkError')));
  }, [t]);

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const selectedProvince = provinces.find((p) => p.id === provinceId);
  const selectedZone = selectedProvince?.zones.find((z) => z.id === zoneId);
  // Most provinces have no zones at all - the district list is just
  // whatever sits directly under the province, same as always. A province
  // with zones (Baghdad: Rusafa/Karkh) picks a zone first, and the district
  // list underneath is that zone's districts instead.
  const districtOptions = selectedProvince
    ? selectedProvince.zones.length > 0
      ? (selectedZone?.districts ?? [])
      : selectedProvince.districts
    : [];

  // Catches obviously-wrong values before they ever reach the network - the
  // backend is the real source of truth (it rejects a malformed email
  // outright), but nothing there currently catches a garbage phone number
  // like "1", so a bad value here would otherwise create an account whose
  // owner can never actually be reached for password resets or support.
  const isValidEmail = isValidEmailAddress(email);
  const isValidPhone = isValidPhoneNumber(phone);

  const canSubmit =
    nameEn.trim() && nameAr.trim() && isValidPhone && isValidEmail && password.length >= 8 &&
    businessTypeIds.length > 0 && foodCategoryIds.length > 0 && agreedToTerms;

  // The submit button below is simply disabled while canSubmit is false, so
  // nothing fires on tap to explain why. Text fields get their own inline
  // red message once the user leaves them (see `touched` above); these two
  // can't use the same "leave the field" moment (a chip toggle or checkbox
  // tap doesn't blur anything), so they're listed here instead, once the
  // form has been touched at all.
  const hasStartedFilling = nameEn || nameAr || phone || email || password;
  const missingReasons = hasStartedFilling
    ? [
        businessTypeIds.length === 0 && t('register.validation.businessTypes'),
        foodCategoryIds.length === 0 && t('register.validation.foodCategories'),
        !agreedToTerms && t('register.validation.terms'),
      ].filter((reason): reason is string => Boolean(reason))
    : [];

  const registrationPayload = () => ({
    nameEn,
    nameAr,
    phone,
    ownerEmail: email,
    ownerPassword: password,
    provinceId: provinceId ?? undefined,
    districtId: districtId ?? undefined,
    businessTypeIds,
    foodCategoryIds,
    agreedToTerms,
  });

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { pendingToken: token } = await api.startRegisterRestaurant(registrationPayload());
      setPendingToken(token);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('register.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!pendingToken) return;
    setVerifyError(null);
    setVerifying(true);
    try {
      await api.confirmRegisterRestaurant(pendingToken, verifyCode.trim());
      setSubmitted(true);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : t('register.genericError'));
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setVerifyError(null);
    setResent(false);
    setResending(true);
    try {
      const { pendingToken: token } = await api.startRegisterRestaurant(registrationPayload());
      setPendingToken(token);
      setVerifyCode('');
      setResent(true);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : t('register.genericError'));
    } finally {
      setResending(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.centered}>
        <View style={styles.card}>
          <View style={styles.badgeWrap}>
            <BrandMark size={44} />
          </View>
          <Text style={styles.successTitle}>{t('register.successTitle')}</Text>
          <Text style={styles.successBody}>{t('register.successBody')}</Text>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={onRegistered}>
            <Text style={styles.primaryButtonText}>{t('register.backToSignIn')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (pendingToken) {
    return (
      <View style={styles.centered}>
        <View style={styles.card}>
          <View style={styles.badgeWrap}>
            <BrandMark size={44} />
          </View>
          <Text style={styles.successTitle}>{t('register.verify.title')}</Text>
          <Text style={styles.successBody}>{t('register.verify.subtitle', { email })}</Text>

          <FormField
            label={t('register.verify.codeLabel')}
            value={verifyCode}
            onChangeText={setVerifyCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
          {verifyError && <Text style={styles.error}>{verifyError}</Text>}
          {resent && !verifyError && <Text style={styles.resentText}>{t('register.verify.resent')}</Text>}

          <Pressable
            style={[styles.button, styles.primaryButton, verifyCode.trim().length !== 6 && styles.buttonDisabled]}
            disabled={verifyCode.trim().length !== 6 || verifying}
            onPress={handleConfirmCode}
          >
            {verifying ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('register.verify.submit')}</Text>
            )}
          </Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleResendCode} disabled={resending}>
            {resending ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <Text style={styles.secondaryButtonText}>{t('register.verify.resend')}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setPendingToken(null)}>
            <Text style={styles.back}>{t('register.verify.backToForm')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack} style={styles.backRow}>
        <BackIcon size={14} color={colors.mutedForeground} />
        <Text style={styles.back}>{t('common:actions.back')}</Text>
      </Pressable>
      <View style={styles.badgeWrap}>
        <BrandMark size={44} />
      </View>
      <Text style={styles.title}>{t('register.title')}</Text>
      <Text style={styles.subtitle}>{t('register.subtitle')}</Text>

      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View>
        <FormField
          label={t('register.nameEnLabel')}
          value={nameEn}
          onChangeText={setNameEn}
          onBlur={() => markTouched('nameEn')}
          placeholder={t('register.nameEnPlaceholder')}
        />
        {touched.nameEn && !nameEn.trim() && <Text style={styles.fieldError}>{t('register.validation.nameEn')}</Text>}
      </View>
      <View>
        <FormField
          label={t('register.nameArLabel')}
          value={nameAr}
          onChangeText={setNameAr}
          onBlur={() => markTouched('nameAr')}
          placeholder={t('register.nameArPlaceholder')}
        />
        {touched.nameAr && !nameAr.trim() && <Text style={styles.fieldError}>{t('register.validation.nameAr')}</Text>}
      </View>
      <View>
        <FormField
          label={t('register.phoneLabel')}
          value={phone}
          onChangeText={setPhone}
          onBlur={() => markTouched('phone')}
          keyboardType="phone-pad"
          placeholder={t('register.phonePlaceholder')}
        />
        {touched.phone && !isValidPhone && <Text style={styles.fieldError}>{t('register.validation.phone')}</Text>}
      </View>
      <View>
        <FormField
          label={t('register.emailLabel')}
          value={email}
          onChangeText={setEmail}
          onBlur={() => markTouched('email')}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('register.emailPlaceholder')}
        />
        {touched.email && !isValidEmail && <Text style={styles.fieldError}>{t('register.validation.email')}</Text>}
      </View>
      <View>
        <FormField
          label={t('register.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          onBlur={() => markTouched('password')}
          secureTextEntry
          placeholder={t('register.passwordPlaceholder')}
        />
        {touched.password && password.length < 8 && <Text style={styles.fieldError}>{t('register.validation.password')}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('register.businessTypes')}</Text>
        <ChipSelect
          options={businessTypes.map((b) => ({ id: b.id, label: localizedName(b, language) }))}
          selectedIds={businessTypeIds}
          onToggle={(id) => toggle(businessTypeIds, setBusinessTypeIds, id)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('register.foodCategories')}</Text>
        <ChipSelect
          options={foodCategories.map((f) => ({ id: f.id, label: localizedName(f, language) }))}
          selectedIds={foodCategoryIds}
          onToggle={(id) => toggle(foodCategoryIds, setFoodCategoryIds, id)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('register.city')}</Text>
        <ChipSelect
          options={provinces.map((p) => ({ id: p.id, label: localizedName(p, language) }))}
          selectedIds={provinceId ? [provinceId] : []}
          onToggle={(id) => {
            setProvinceId(id === provinceId ? null : id);
            setZoneId(null);
            setDistrictId(null);
          }}
        />
      </View>

      {selectedProvince && selectedProvince.zones.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('register.zone')}</Text>
          <ChipSelect
            options={selectedProvince.zones.map((z) => ({ id: z.id, label: localizedName(z, language) }))}
            selectedIds={zoneId ? [zoneId] : []}
            onToggle={(id) => {
              setZoneId(id === zoneId ? null : id);
              setDistrictId(null);
            }}
          />
        </View>
      )}

      {selectedProvince && (selectedProvince.zones.length === 0 || selectedZone) && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('register.district')}</Text>
          <ChipSelect
            options={districtOptions.map((d) => ({ id: d.id, label: localizedName(d, language) }))}
            selectedIds={districtId ? [districtId] : []}
            onToggle={(id) => setDistrictId(id === districtId ? null : id)}
          />
        </View>
      )}

      <View style={styles.termsRow}>
        <Pressable onPress={() => setAgreedToTerms((v) => !v)}>
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Check size={13} color={colors.primaryForeground} strokeWidth={3} />}
          </View>
        </Pressable>
        <Text style={styles.termsText}>
          {t('register.termsPrefix')}{' '}
          <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>
            {t('register.termsOfService')}
          </Text>{' '}
          {t('register.and')}{' '}
          <Text style={styles.termsLink} onPress={() => setShowPrivacy(true)}>
            {t('register.privacyPolicy')}
          </Text>
        </Text>
      </View>

      <LegalDocumentModal visible={showTerms} title={t('register.termsOfService')} sections={TERMS_OF_SERVICE} onClose={() => setShowTerms(false)} />
      <LegalDocumentModal visible={showPrivacy} title={t('register.privacyPolicy')} sections={PRIVACY_POLICY} onClose={() => setShowPrivacy(false)} />

      {submitError && <Text style={styles.error}>{submitError}</Text>}
      {missingReasons.length > 0 && (
        <View style={styles.hintBox}>
          {missingReasons.map((reason) => (
            <Text key={reason} style={styles.hintText}>• {reason}</Text>
          ))}
        </View>
      )}

      <Pressable
        style={[styles.button, styles.primaryButton, !canSubmit && styles.buttonDisabled]}
        disabled={!canSubmit || submitting}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.primaryButtonText}>{t('register.submit')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { padding: 24, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  back: { color: colors.mutedForeground, fontSize: 14 },
  badgeWrap: { alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginBottom: 8, textAlign: 'center' },
  section: { gap: 8 },
  sectionLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { color: colors.foreground, fontSize: 13, flex: 1, lineHeight: 19 },
  termsLink: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
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
  error: { color: colors.destructive, fontSize: 13 },
  resentText: { color: colors.success, fontSize: 13 },
  fieldError: { color: colors.destructive, fontSize: 12, marginTop: 4 },
  hintBox: { gap: 3 },
  hintText: { color: colors.mutedForeground, fontSize: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    maxWidth: 420,
    width: '100%',
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
  successTitle: { fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  successBody: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
});
