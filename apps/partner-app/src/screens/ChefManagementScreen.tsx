import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { useAuth } from '../lib/AuthContext';
import { api, type ChefProfile, type ChefRoleSlug } from '../lib/api';

interface ChefFormState {
  name: string;
  photoUrl: string;
  speciality: string;
  yearsExperience: string;
  awards: string[];
  newAward: string;
}

const emptyForm: ChefFormState = { name: '', photoUrl: '', speciality: '', yearsExperience: '', awards: [], newAward: '' };

function formFromProfile(profile: ChefProfile | null): ChefFormState {
  if (!profile) return emptyForm;
  return {
    name: profile.name,
    photoUrl: profile.photoUrl ?? '',
    speciality: profile.speciality ?? '',
    yearsExperience: profile.yearsExperience != null ? String(profile.yearsExperience) : '',
    awards: profile.awards,
    newAward: '',
  };
}

async function pickAndUploadPhoto(token: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const { url } = await api.uploadFile(token, {
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  });
  return url;
}

function ChefCard({
  title,
  role,
  form,
  setForm,
  onSave,
  onRemove,
  saving,
  hasProfile,
}: {
  title: string;
  role: ChefRoleSlug;
  form: ChefFormState;
  setForm: (updater: (prev: ChefFormState) => ChefFormState) => void;
  onSave: () => void;
  onRemove: () => void;
  saving: boolean;
  hasProfile: boolean;
}) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadPhoto(token);
      if (url) setForm((f) => ({ ...f, photoUrl: url }));
    } finally {
      setUploading(false);
    }
  };

  const addAward = () => {
    const value = form.newAward.trim();
    if (!value) return;
    setForm((f) => ({ ...f, awards: [...f.awards, value], newAward: '' }));
  };

  const removeAward = (index: number) => {
    setForm((f) => ({ ...f, awards: f.awards.filter((_, i) => i !== index) }));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      <Pressable onPress={pickPhoto} style={styles.photoPicker}>
        {form.photoUrl ? (
          <Image source={{ uri: form.photoUrl }} style={styles.photoPreview} />
        ) : uploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.photoPickerText}>Tap to add photo</Text>
        )}
      </Pressable>

      <FormField label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Full name" />
      <FormField
        label="Speciality"
        value={form.speciality}
        onChangeText={(v) => setForm((f) => ({ ...f, speciality: v }))}
        placeholder="e.g. Iraqi Grilled Meats"
      />
      <FormField
        label="Years of Experience"
        value={form.yearsExperience}
        onChangeText={(v) => setForm((f) => ({ ...f, yearsExperience: v }))}
        placeholder="e.g. 12"
        keyboardType="numeric"
      />

      <View style={styles.awardsSection}>
        <Text style={styles.fieldLabel}>Awards</Text>
        {form.awards.map((award, i) => (
          <View key={`${award}-${i}`} style={styles.awardRow}>
            <Text style={styles.awardText}>• {award}</Text>
            <Pressable onPress={() => removeAward(i)}>
              <Text style={styles.removeLink}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.awardAddRow}>
          <FormField
            label=""
            value={form.newAward}
            onChangeText={(v) => setForm((f) => ({ ...f, newAward: v }))}
            placeholder="Add an award"
            style={styles.awardInput}
          />
          <Pressable style={styles.smallButton} onPress={addAward}>
            <Text style={styles.smallButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable style={[styles.button, styles.primaryButton]} onPress={onSave} disabled={saving || !form.name.trim()}>
          {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>Save</Text>}
        </Pressable>
        {hasProfile && (
          <Pressable onPress={onRemove}>
            <Text style={styles.removeLink}>Remove profile</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function ChefManagementScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [headChef, setHeadChef] = useState<ChefProfile | null>(null);
  const [sousChef, setSousChef] = useState<ChefProfile | null>(null);
  const [headForm, setHeadForm] = useState<ChefFormState>(emptyForm);
  const [sousForm, setSousForm] = useState<ChefFormState>(emptyForm);
  const [crewCount, setCrewCount] = useState('');
  const [crewPhotoUrl, setCrewPhotoUrl] = useState('');
  const [savingHead, setSavingHead] = useState(false);
  const [savingSous, setSavingSous] = useState(false);
  const [savingCrew, setSavingCrew] = useState(false);
  const [uploadingCrew, setUploadingCrew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .chefs(token)
      .then((state) => {
        setHeadChef(state.headChef);
        setSousChef(state.sousChef);
        setHeadForm(formFromProfile(state.headChef));
        setSousForm(formFromProfile(state.sousChef));
        setCrewCount(state.crewCount != null ? String(state.crewCount) : '');
        setCrewPhotoUrl(state.crewPhotoUrl ?? '');
      })
      .catch(() => setError('Could not reach the server. Is the backend running on localhost:3000?'));
  }, [token]);

  useEffect(load, [load]);

  const saveProfile = async (role: ChefRoleSlug, form: ChefFormState, setSaving: (v: boolean) => void) => {
    setError(null);
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      await api.upsertChef(token, role, {
        name: form.name.trim(),
        photoUrl: form.photoUrl || undefined,
        speciality: form.speciality.trim() || undefined,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        awards: form.awards,
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save chef profile');
    } finally {
      setSaving(false);
    }
  };

  const removeProfile = async (role: ChefRoleSlug) => {
    await api.deleteChef(token, role);
    load();
  };

  const pickCrewPhoto = async () => {
    setUploadingCrew(true);
    try {
      const url = await pickAndUploadPhoto(token);
      if (url) setCrewPhotoUrl(url);
    } finally {
      setUploadingCrew(false);
    }
  };

  const saveCrew = async () => {
    setError(null);
    setSavingCrew(true);
    try {
      await api.updateCrew(token, {
        crewCount: crewCount ? Number(crewCount) : null,
        crewPhotoUrl: crewPhotoUrl || null,
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save crew info');
    } finally {
      setSavingCrew(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Chef Management</Text>
      <Text style={styles.subtitle}>
        Introduce your kitchen team. This appears on your public profile once the customer app launches.
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.grid}>
        <ChefCard
          title="Head Chef"
          role="chef"
          form={headForm}
          setForm={setHeadForm}
          onSave={() => saveProfile('chef', headForm, setSavingHead)}
          onRemove={() => removeProfile('chef')}
          saving={savingHead}
          hasProfile={!!headChef}
        />
        <ChefCard
          title="Sous Chef"
          role="sous-chef"
          form={sousForm}
          setForm={setSousForm}
          onSave={() => saveProfile('sous-chef', sousForm, setSavingSous)}
          onRemove={() => removeProfile('sous-chef')}
          saving={savingSous}
          hasProfile={!!sousChef}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kitchen Crew</Text>
        <Pressable onPress={pickCrewPhoto} style={styles.photoPicker}>
          {crewPhotoUrl ? (
            <Image source={{ uri: crewPhotoUrl }} style={styles.photoPreview} />
          ) : uploadingCrew ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.photoPickerText}>Tap to add a crew photo</Text>
          )}
        </Pressable>
        <FormField label="Number of Crew Members" value={crewCount} onChangeText={setCrewCount} placeholder="e.g. 12" keyboardType="numeric" />
        <Pressable style={[styles.button, styles.primaryButton]} onPress={saveCrew} disabled={savingCrew}>
          {savingCrew ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>Save</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 16, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground },
  error: { color: colors.destructive, fontSize: 13 },
  fieldLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    width: 340,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  photoPicker: {
    height: 140,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPickerText: { color: colors.mutedForeground, fontSize: 13 },
  awardsSection: { gap: 6 },
  awardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  awardText: { color: colors.foreground, fontSize: 13, flex: 1 },
  awardAddRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  awardInput: { flex: 1 },
  smallButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  smallButtonText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', alignSelf: 'flex-start' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
  removeLink: { fontSize: 12, color: colors.destructive },
});
