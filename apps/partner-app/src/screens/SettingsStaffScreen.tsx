import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { ChipSelect } from '../components/ChipSelect';
import { useAuth } from '../lib/AuthContext';
import { api, type RestaurantDetail, type StaffMember, type StaffRole } from '../lib/api';

const roleLabels: Record<StaffRole, string> = { MANAGER: 'Manager', MENU_EDITOR: 'Menu Editor' };

export function SettingsStaffScreen() {
  const { token, setToken } = useAuth();

  // ── Account settings ──────────────────────────────────────────────
  const [profile, setProfile] = useState<RestaurantDetail | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadProfile = useCallback(() => {
    api.me(token).then(setProfile).catch(() => {});
  }, [token]);

  useEffect(loadProfile, [loadProfile]);

  const submitPasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
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
      setPasswordError(err instanceof Error ? err.message : 'Could not change password');
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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('MENU_EDITOR');
  const [inviting, setInviting] = useState(false);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);

  const loadStaff = useCallback(() => {
    api.staff(token).then(setStaff).catch(() => setStaffError('Could not load staff.'));
  }, [token]);

  useEffect(loadStaff, [loadStaff]);

  const submitInvite = async () => {
    setStaffError(null);
    if (!inviteEmail.trim() || invitePassword.length < 8 || !inviteName.trim()) {
      setStaffError('Fill in name, email, and an 8+ character password.');
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
      setStaff((prev) => [...prev, created]);
      setInviteEmail('');
      setInvitePassword('');
      setInviteName('');
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Could not invite staff member');
    } finally {
      setInviting(false);
    }
  };

  const toggleStaffActive = async (member: StaffMember) => {
    setBusyStaffId(member.id);
    try {
      const updated = await api.updateStaff(token, member.id, { isActive: !member.isActive });
      setStaff((prev) => prev.map((s) => (s.id === member.id ? updated : s)));
    } finally {
      setBusyStaffId(null);
    }
  };

  const removeStaffMember = async (id: string) => {
    setBusyStaffId(id);
    try {
      await api.removeStaff(token, id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setBusyStaffId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings & Staff</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <FormField
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="Current password"
        />
        <FormField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="At least 8 characters"
        />
        {passwordError && <Text style={styles.error}>{passwordError}</Text>}
        {passwordSuccess && <Text style={styles.success}>Password updated.</Text>}
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={submitPasswordChange}
          disabled={changingPassword}
        >
          {changingPassword ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryButtonText}>Update Password</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        <View style={styles.prefRow}>
          <View style={styles.prefLabelBlock}>
            <Text style={styles.prefLabel}>New review notifications</Text>
            <Text style={styles.prefHint}>Get notified when a customer leaves a review</Text>
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
            <Text style={styles.prefLabel}>New booking notifications</Text>
            <Text style={styles.prefHint}>Get notified for new chef table bookings</Text>
          </View>
          <Switch
            value={profile?.notifyNewBooking ?? false}
            onValueChange={() => toggleNotification('notifyNewBooking')}
            disabled={!profile || savingPrefs}
            trackColor={{ true: colors.primary, false: colors.secondary }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Staff</Text>
        <Text style={styles.sectionHint}>
          Invite staff with limited access — they can help manage the menu without touching your profile
          or account settings.
        </Text>

        {staff.map((member) => (
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
                  {member.isActive ? 'Active' : 'Inactive'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => removeStaffMember(member.id)}
                disabled={busyStaffId === member.id}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {staff.length === 0 && <Text style={styles.hint}>No staff invited yet.</Text>}

        <View style={styles.inviteForm}>
          <Text style={styles.inviteTitle}>Invite Staff</Text>
          <FormField label="Full name" value={inviteName} onChangeText={setInviteName} placeholder="Staff member's name" />
          <FormField
            label="Email"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="staff@restaurant.iq"
          />
          <FormField
            label="Temporary password"
            value={invitePassword}
            onChangeText={setInvitePassword}
            secureTextEntry
            placeholder="At least 8 characters"
          />
          <View style={styles.roleField}>
            <Text style={styles.roleLabel}>Role</Text>
            <ChipSelect
              options={[
                { id: 'MANAGER', label: 'Manager' },
                { id: 'MENU_EDITOR', label: 'Menu Editor' },
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
              <Text style={styles.primaryButtonText}>Send Invite</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20, paddingBottom: 40, maxWidth: 560 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  section: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  sectionHint: { fontSize: 12, color: colors.mutedForeground, marginTop: -6 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
  error: { color: colors.destructive, fontSize: 13 },
  success: { color: colors.success, fontSize: 13 },
  hint: { color: colors.mutedForeground, fontSize: 13 },

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
  badgeActive: { backgroundColor: 'rgba(92, 184, 110, 0.15)' },
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
