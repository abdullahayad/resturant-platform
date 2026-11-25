import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { radii } from '../theme/tokens';

// "Is your info still correct?" on the dashboard: shown every 30 days to a
// live restaurant's owner/managers until they confirm it.
export function InfoCheckCard({ onUpdate }: { onUpdate: () => void }) {
  const { t } = useTranslation('dashboard');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token, staff } = useAuth();
  const allowed = staff?.role !== 'MENU_EDITOR';
  const [due, setDue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    api
      .infoCheck(token)
      .then((s) => {
        if (!cancelled) setDue(s.due);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, allowed]);

  if (!allowed || !due) return null;

  const confirm = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await api.confirmInfo(token);
      setDue(false);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ClipboardCheck size={20} color={colors.primary} />
        <Text style={styles.title}>{t('infoCheck.title')}</Text>
      </View>
      <Text style={styles.body}>{t('infoCheck.body')}</Text>
      <View style={styles.row}>
        <Pressable style={[styles.button, styles.primary]} onPress={confirm} disabled={saving} accessibilityRole="button">
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryText}>{t('infoCheck.yes')}</Text>
          )}
        </Pressable>
        <Pressable style={styles.button} onPress={onUpdate} accessibilityRole="button">
          <Text style={styles.secondaryText}>{t('infoCheck.update')}</Text>
        </Pressable>
      </View>
      {failed && <Text style={styles.error}>{t('infoCheck.failed')}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginBottom: 16,
      padding: 14,
      gap: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.primaryTint30,
      backgroundColor: colors.card,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.foreground },
    body: { fontSize: 13, color: colors.mutedForeground },
    button: {
      flex: 1,
      minHeight: 44,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.primaryTint30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: { backgroundColor: colors.primary },
    primaryText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
    secondaryText: { fontSize: 14, fontWeight: '600', color: colors.primary },
    error: { fontSize: 13, color: colors.destructive },
  });
