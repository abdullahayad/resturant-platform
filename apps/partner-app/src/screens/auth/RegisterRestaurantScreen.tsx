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
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

  const canSubmit =
    nameEn.trim() && nameAr.trim() && phone.trim() && email.trim() && password.length >= 8 &&
    businessTypeIds.length > 0 && foodCategoryIds.length > 0 && agreedToTerms;

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.registerRestaurant({
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
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('register.genericError'));
    } finally {
      setSubmitting(false);
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

      <FormField label={t('register.nameEnLabel')} value={nameEn} onChangeText={setNameEn} placeholder={t('register.nameEnPlaceholder')} />
      <FormField label={t('register.nameArLabel')} value={nameAr} onChangeText={setNameAr} placeholder={t('register.nameArPlaceholder')} />
      <FormField label={t('register.phoneLabel')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('register.phonePlaceholder')} />
      <FormField label={t('register.emailLabel')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder={t('register.emailPlaceholder')} />
      <FormField label={t('register.passwordLabel')} value={password} onChangeText={setPassword} secureTextEntry placeholder={t('register.passwordPlaceholder')} />

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
            setDistrictId(null);
          }}
        />
      </View>

      {selectedProvince && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('register.district')}</Text>
          <ChipSelect
            options={selectedProvince.districts.map((d) => ({ id: d.id, label: localizedName(d, language) }))}
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
  error: { color: colors.destructive, fontSize: 13 },
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
