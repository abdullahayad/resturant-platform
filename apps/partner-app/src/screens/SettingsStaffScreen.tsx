import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePostHog } from 'posthog-react-native';
import { Users } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { ChipSelect } from '../components/ChipSelect';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../lib/AuthContext';
import { api, type RestaurantDetail, type StaffMember, type StaffRole } from '../lib/api';
import { cardShadow } from '../theme/tokens';

export function SettingsStaffScreen() {
  const { token, setToken, staff: authStaff } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('settings');
  const posthogDebug = usePostHog();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const roleLabels: Record<StaffRole, string> = {
    MANAGER: t('common:roles.manager'),
    MENU_EDITOR: t('common:roles.menuEditor'),
  };
  // Menu Editors can reach this screen to change their own password, but
  // notification prefs and staff management stay Manager/Owner only —
  // matches the same split enforced on the backend.
  const isManagerOrOwner = authStaff?.role !== 'MENU_EDITOR';

  // ── Account settings ──────────────────────────────────────────────
  const [profile, setProfile] = useState<RestaurantDetail | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadProfile = useCallback(() => {
    if (!isManagerOrOwner) return;
    api.me(token).then(setProfile).catch(() => {});
  }, [token, isManagerOrOwner]);

  useEffect(loadProfile, [loadProfile]);

  const submitPasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 8) {
      setPasswordError(t('passwordTooShort'));
      return;
    }
    setChangingPassword(true);
    try {
      const result = await api.changePassword(token, currentPassword, newPassword);
      setToken(result.accessToken);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('passwordChangeFailed'));
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleNotification = async (key: 'notifyNewReview' | 'notifyNewBooking') => {
    if (!profile) return;
    const next = !profile[key];
    setProfile({ ...profile, [key]: next });
    setSavingPrefs(true);
    try {
      await api.updateNotificationPrefs(token, { [key]: next });
    } catch {
      setProfile((prev) => (prev ? { ...prev, [key]: !next } : prev));
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Staff ──────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('MENU_EDITOR');
  const [inviting, setInviting] = useState(false);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);

  const loadStaff = useCallback(() => {
    if (!isManagerOrOwner) return;
    api.staff(token).then(setStaffList).catch(() => setStaffError(t('loadStaffFailed')));
  }, [token, isManagerOrOwner, t]);

  useEffect(loadStaff, [loadStaff]);

  const submitInvite = async () => {
    setStaffError(null);
    if (!inviteEmail.trim() || invitePassword.length < 8 || !inviteName.trim()) {
      setStaffError(t('inviteValidation'));
      return;
    }
    setInviting(true);
    try {
      const created = await api.inviteStaff(token, {
        email: inviteEmail.trim(),
        password: invitePassword,
        fullName: inviteName.trim(),
        role: inviteRole,
      });
      setStaffList((prev) => [...prev, created]);
      setInviteEmail('');
      setInvitePassword('');
      setInviteName('');
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : t('inviteFailed'));
    } finally {
      setInviting(false);
    }
  };

  const toggleStaffActive = async (member: StaffMember) => {
    setBusyStaffId(member.id);
    try {
      const updated = await api.updateStaff(token, member.id, { isActive: !member.isActive });
      setStaffList((prev) => prev.map((s) => (s.id === member.id ? updated : s)));
    } finally {
      setBusyStaffId(null);
    }
  };

  const removeStaffMember = async (id: string) => {
    setBusyStaffId(id);
    try {
      await api.removeStaff(token, id);
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setBusyStaffId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>

      {/* TEMPORARY — diagnosing why PostHog events never arrive, remove after confirming. */}
      <Pressable
        style={[styles.button, styles.primaryButton]}
        onPress={async () => {
          const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
          const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
          if (!posthogDebug) {
            Alert.alert(
              'PostHog Debug',
              `Client is undefined (Provider not connected).\nPostHog key: ${posthogKey ? `present, starts with "${posthogKey.slice(0, 8)}"` : 'MISSING'}\nSentry DSN: ${sentryDsn ? `present, starts with "${sentryDsn.slice(0, 12)}"` : 'MISSING'}`,
            );
            return;
          }
          try {
            posthogDebug.capture('debug_diagnostic_event');
            await posthogDebug.flush();
            Alert.alert('PostHog Debug', 'Client exists. capture() + flush() both ran with no error.');
          } catch (e) {
            Alert.alert('PostHog Debug', `Client exists but flush() threw: ${String(e)}`);
          }
        }}
      >
        <Text style={styles.primaryButtonText}>DEBUG: Test PostHog (temporary)</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('changePassword')}</Text>
        <FormField
          label={t('currentPasswordLabel')}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder={t('currentPasswordLabel')}
        />
        <FormField
          label={t('newPasswordLabel')}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder={t('newPasswordPlaceholder')}
        />
        {passwordError && <Text style={styles.error}>{passwordError}</Text>}
        {passwordSuccess && <Text style={styles.success}>{t('passwordUpdated')}</Text>}
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={submitPasswordChange}
          disabled={changingPassword}
        >
          {changingPassword ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('updatePassword')}</Text>
          )}
        </Pressable>
      </View>

      {isManagerOrOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notificationPreferences')}</Text>
          <View style={styles.prefRow}>
            <View style={styles.prefLabelBlock}>
              <Text style={styles.prefLabel}>{t('newReviewNotifications')}</Text>
              <Text style={styles.prefHint}>{t('newReviewNotificationsHint')}</Text>
            </View>
            <Switch
              value={profile?.notifyNewReview ?? false}
              onValueChange={() => toggleNotification('notifyNewReview')}
              disabled={!profile || savingPrefs}
              trackColor={{ true: colors.primary, false: colors.secondary }}
            />
          </View>
          <View style={styles.prefRow}>
            <View style={styles.prefLabelBlock}>
              <Text style={styles.prefLabel}>{t('newBookingNotifications')}</Text>
              <Text style={styles.prefHint}>{t('newBookingNotificationsHint')}</Text>
            </View>
            <Switch
              value={profile?.notifyNewBooking ?? false}
              onValueChange={() => toggleNotification('notifyNewBooking')}
              disabled={!profile || savingPrefs}
              trackColor={{ true: colors.primary, false: colors.secondary }}
            />
          </View>
        </View>
      )}

      {isManagerOrOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('staff')}</Text>
          <Text style={styles.sectionHint}>{t('staffHint')}</Text>

          {staffList.map((member) => (
            <View key={member.id} style={styles.staffRow}>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{member.fullName}</Text>
                <Text style={styles.staffMeta}>{member.email} · {roleLabels[member.role]}</Text>
              </View>
              <View style={styles.staffActions}>
                <Pressable
                  onPress={() => toggleStaffActive(member)}
                  disabled={busyStaffId === member.id}
                  style={[styles.badge, member.isActive ? styles.badgeActive : styles.badgeInactive]}
                >
                  <Text style={member.isActive ? styles.badgeActiveText : styles.badgeInactiveText}>
                    {member.isActive ? t('active') : t('inactive')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => removeStaffMember(member.id)}
                  disabled={busyStaffId === member.id}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>{t('remove')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {staffList.length === 0 && <EmptyState icon={Users} message={t('noStaffInvitedYet')} />}

          <View style={styles.inviteForm}>
            <Text style={styles.inviteTitle}>{t('inviteStaff')}</Text>
            <FormField label={t('fullNameLabel')} value={inviteName} onChangeText={setInviteName} placeholder={t('fullNamePlaceholder')} />
            <FormField
              label={t('emailLabel')}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="staff@restaurant.iq"
            />
            <FormField
              label={t('tempPasswordLabel')}
              value={invitePassword}
              onChangeText={setInvitePassword}
              secureTextEntry
              placeholder={t('newPasswordPlaceholder')}
            />
            <View style={styles.roleField}>
              <Text style={styles.roleLabel}>{t('role')}</Text>
              <ChipSelect
                options={[
                  { id: 'MANAGER', label: t('common:roles.manager') },
                  { id: 'MENU_EDITOR', label: t('common:roles.menuEditor') },
                ]}
                selectedIds={[inviteRole]}
                onToggle={(id) => setInviteRole(id as StaffRole)}
              />
            </View>
            {staffError && <Text style={styles.error}>{staffError}</Text>}
            <Pressable style={[styles.button, styles.primaryButton]} onPress={submitInvite} disabled={inviting}>
              {inviting ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('sendInvite')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 40, maxWidth: 560 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  section: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    ...cardShadow,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  sectionHint: { fontSize: 12, color: colors.mutedForeground, marginTop: -6 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
  error: { color: colors.destructive, fontSize: 13 },
  success: { color: colors.success, fontSize: 13 },

  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  prefLabelBlock: { flex: 1 },
  prefLabel: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  prefHint: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },

  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  staffInfo: { flex: 1 },
  staffName: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  staffMeta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  staffActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeActive: { backgroundColor: colors.successTint15 },
  badgeInactive: { backgroundColor: colors.secondary },
  badgeActiveText: { color: colors.success, fontSize: 12, fontWeight: '600' },
  badgeInactiveText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  removeButton: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 5 },
  removeButtonText: { color: colors.destructive, fontSize: 12, fontWeight: '600' },

  inviteForm: { gap: 10, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  inviteTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  roleField: { gap: 8 },
  roleLabel: { fontSize: 13, color: colors.mutedForeground },
});
