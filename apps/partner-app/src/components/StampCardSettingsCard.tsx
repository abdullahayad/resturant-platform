import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Stamp } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api, type StampCardSettings } from '../lib/api';
import { radii, cardShadow } from '../theme/tokens';

const MIN_VISITS = 2;
const MAX_VISITS = 20;

// "Stamp card" on the Reviews screen, next to Scan Visit: every N verified
// visits a customer earns the reward written here, and the cashier hands
// it over from the scan result. Owner and managers only - for anyone else
// the settings don't load and the card stays hidden.
export function StampCardSettingsCard() {
  const { t } = useTranslation('reviews');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token } = useAuth();
  const [form, setForm] = useState<StampCardSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .stampCard(token)
      .then((s) => setForm({ isActive: s.isActive, visitsRequired: s.visitsRequired, rewardEn: s.rewardEn, rewardAr: s.rewardAr }))
      .catch(() => {});
  }, [token]);

  if (!form) return null;
  const set = <K extends keyof StampCardSettings>(key: K, value: StampCardSettings[K]) => {
    setMessage(null);
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const save = async () => {
    if (!token) return;
    if (form.isActive && (!form.rewardEn.trim() || !form.rewardAr.trim())) {
      setMessage({ ok: false, text: t('stampCard.needReward') });
      return;
    }
    setSaving(true);
    try {
      await api.updateStampCard(token, form);
      setMessage({ ok: true, text: t('stampCard.saved') });
    } catch {
      setMessage({ ok: false, text: t('stampCard.failed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Stamp size={20} color={colors.primary} />
        <View style={styles.flex1}>
          <Text style={styles.title}>{t('stampCard.title')}</Text>
          <Text style={styles.body}>{t('stampCard.body')}</Text>
        </View>
        <Switch value={form.isActive} onValueChange={(v) => set('isActive', v)} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t('stampCard.visits')}</Text>
        <View style={styles.stepper}>
          <Pressable
            style={styles.stepButton}
            onPress={() => set('visitsRequired', Math.max(MIN_VISITS, form.visitsRequired - 1))}
            accessibilityLabel="-"
          >
            <Minus size={18} color={colors.foreground} />
          </Pressable>
          <Text style={styles.count}>{form.visitsRequired}</Text>
          <Pressable
            style={styles.stepButton}
            onPress={() => set('visitsRequired', Math.min(MAX_VISITS, form.visitsRequired + 1))}
            accessibilityLabel="+"
          >
            <Plus size={18} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.label}>{t('stampCard.rewardEn')}</Text>
      <TextInput
        value={form.rewardEn}
        onChangeText={(v) => set('rewardEn', v)}
        placeholder="Free dessert"
        placeholderTextColor={colors.mutedForeground}
        maxLength={80}
        style={styles.input}
      />
      <Text style={styles.label}>{t('stampCard.rewardAr')}</Text>
      <TextInput
        value={form.rewardAr}
        onChangeText={(v) => set('rewardAr', v)}
        placeholder="حلى مجاني"
        placeholderTextColor={colors.mutedForeground}
        maxLength={80}
        style={[styles.input, styles.rtl]}
      />

      <Text style={styles.example}>
        {t('stampCard.example', { count: form.visitsRequired, reward: form.rewardEn.trim() || '…' })}
      </Text>

      <Pressable onPress={save} disabled={saving} style={[styles.button, saving && styles.disabled]}>
        {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.buttonText}>{t('stampCard.save')}</Text>}
      </Pressable>
      {message && <Text style={message.ok ? styles.ok : styles.error}>{message.text}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
      gap: 10,
      ...cardShadow,
    },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    flex1: { flex: 1 },
    title: { fontSize: 16, fontWeight: '700', color: colors.foreground },
    body: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 13.5, fontWeight: '600', color: colors.foreground },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    count: { fontSize: 18, fontWeight: '700', color: colors.foreground, minWidth: 24, textAlign: 'center' },
    input: {
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      color: colors.foreground,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    rtl: { textAlign: 'right', writingDirection: 'rtl' },
    example: { fontSize: 13, color: colors.mutedForeground },
    button: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: 'center' },
    buttonText: { color: colors.primaryForeground, fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.6 },
    ok: { fontSize: 13, color: colors.success },
    error: { fontSize: 13, color: colors.destructive },
  });
