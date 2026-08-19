import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { FormField } from '../../components/FormField';
import { ChipSelect } from '../../components/ChipSelect';
import { api, type MasterDataItem, type Province } from '../../lib/api';

interface RegisterRestaurantScreenProps {
  onBack: () => void;
  onRegistered: () => void;
}

export function RegisterRestaurantScreen({ onBack, onRegistered }: RegisterRestaurantScreenProps) {
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
      .catch(() => setLoadError('Could not reach the server. Is the backend running on localhost:3000?'));
  }, []);

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
      setSubmitError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.successTitle}>Application submitted</Text>
          <Text style={styles.successBody}>
            Your restaurant is now under review. You'll be able to sign in once an admin approves it.
          </Text>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={onRegistered}>
            <Text style={styles.primaryButtonText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>{'‹ Back'}</Text>
      </Pressable>
      <Text style={styles.title}>Register Restaurant</Text>
      <Text style={styles.subtitle}>
        Submitted restaurants start as Pending Review until an admin approves them.
      </Text>

      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <FormField label="Restaurant name (English)" value={nameEn} onChangeText={setNameEn} placeholder="Al Baghdadi Restaurant" />
      <FormField label="Restaurant name (Arabic)" value={nameAr} onChangeText={setNameAr} placeholder="مطعم البغدادي" />
      <FormField label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07XXXXXXXXX" />
      <FormField label="Owner email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="owner@restaurant.iq" />
      <FormField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Business Types</Text>
        <ChipSelect
          options={businessTypes.map((b) => ({ id: b.id, label: b.nameEn }))}
          selectedIds={businessTypeIds}
          onToggle={(id) => toggle(businessTypeIds, setBusinessTypeIds, id)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Food Categories</Text>
        <ChipSelect
          options={foodCategories.map((f) => ({ id: f.id, label: f.nameEn }))}
          selectedIds={foodCategoryIds}
          onToggle={(id) => toggle(foodCategoryIds, setFoodCategoryIds, id)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>City</Text>
        <ChipSelect
          options={provinces.map((p) => ({ id: p.id, label: p.nameEn }))}
          selectedIds={provinceId ? [provinceId] : []}
          onToggle={(id) => {
            setProvinceId(id === provinceId ? null : id);
            setDistrictId(null);
          }}
        />
      </View>

      {selectedProvince && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>District</Text>
          <ChipSelect
            options={selectedProvince.districts.map((d) => ({ id: d.id, label: d.nameEn }))}
            selectedIds={districtId ? [districtId] : []}
            onToggle={(id) => setDistrictId(id === districtId ? null : id)}
          />
        </View>
      )}

      <Pressable style={styles.termsRow} onPress={() => setAgreedToTerms((v) => !v)}>
        <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
          {agreedToTerms && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.termsText}>I agree to the Terms of Service and Privacy Policy</Text>
      </Pressable>

      {submitError && <Text style={styles.error}>{submitError}</Text>}

      <Pressable
        style={[styles.button, styles.primaryButton, !canSubmit && styles.buttonDisabled]}
        disabled={!canSubmit || submitting}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={styles.primaryButtonText}>Submit for Review</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  back: { color: colors.mutedForeground, fontSize: 14, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginBottom: 8 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
  termsText: { color: colors.foreground, fontSize: 13, flex: 1 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  primaryButton: { backgroundColor: colors.primary },
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
  },
  successTitle: { fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  successBody: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
});
