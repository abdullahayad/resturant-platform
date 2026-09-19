import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Users } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { ChipSelect } from '../components/ChipSelect';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../lib/AuthContext';
import {
  api,
  type PaymentAccountsState,
  type PaymentGatewayConnection,
  type PaymentGatewayId,
  type RestaurantDetail,
  type StaffMember,
  type StaffRole,
} from '../lib/api';
import { cardShadow } from '../theme/tokens';

const GATEWAY_LABELS: Record<PaymentGatewayId, string> = { zaincash: 'ZainCash', qicard: 'Qi Card' };

export function SettingsStaffScreen() {
  const { token, setToken, staff: authStaff, signOut } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('settings');
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

  // ── Payment Accounts ─────────────────────────────────────────────────
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountsState | null>(null);
  const [paymentAccountsLoading, setPaymentAccountsLoading] = useState(isManagerOrOwner);
  const [paymentAccountsError, setPaymentAccountsError] = useState<string | null>(null);

  const loadPaymentAccounts = useCallback(() => {
    if (!isManagerOrOwner) return;
    api
      .myPaymentAccounts(token)
      .then(setPaymentAccounts)
      .catch(() => setPaymentAccountsError(t('paymentAccounts.loadFailed')))
      .finally(() => setPaymentAccountsLoading(false));
  }, [token, isManagerOrOwner, t]);

  useEffect(loadPaymentAccounts, [loadPaymentAccounts]);

  // ── Staff ──────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(isManagerOrOwner);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('MENU_EDITOR');
  const [inviting, setInviting] = useState(false);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);

  const loadStaff = useCallback(() => {
    if (!isManagerOrOwner) return;
    api.staff(token).then(setStaffList).catch(() => setStaffError(t('loadStaffFailed'))).finally(() => setStaffLoading(false));
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

  // Owner deletes the whole restaurant (menu, photos, staff, everything);
  // a staff login only removes their own access — the backend decides
  // which based on the token, see RestaurantsService.deleteAccount.
  const [deletingAccount, setDeletingAccount] = useState(false);
  // The owner login has no staff record at all — isManagerOrOwner is also
  // true for a Manager, who is still just a staff account for this purpose.
  const isOwner = !authStaff;
  const confirmDeleteAccount = () => {
    Alert.alert(
      isOwner ? t('deleteAccount.confirmTitle') : t('deleteAccount.confirmTitleStaff'),
      isOwner ? t('deleteAccount.confirmBody') : t('deleteAccount.confirmBodyStaff'),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        { text: t('deleteAccount.confirmButton'), style: 'destructive', onPress: deleteAccount },
      ],
    );
  };
  const deleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.deleteAccount(token);
      signOut();
    } catch {
      setDeletingAccount(false);
      Alert.alert(t('deleteAccount.errorTitle'), t('deleteAccount.errorBody'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>

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
          <Text style={styles.sectionTitle}>{t('paymentAccounts.title')}</Text>
          <Text style={styles.sectionHint}>{t('paymentAccounts.hint')}</Text>
          {paymentAccountsError && <Text style={styles.error}>{paymentAccountsError}</Text>}
          {paymentAccountsLoading ? (
            <LoadingState />
          ) : (
            (['zaincash', 'qicard'] as const).map((gatewayId) => (
              <PaymentGatewayCard
                key={gatewayId}
                gatewayId={gatewayId}
                connection={paymentAccounts?.[gatewayId] ?? null}
                token={token}
                colors={colors}
                t={t}
                onChange={setPaymentAccounts}
              />
            ))
          )}
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
          {staffLoading ? (
            <LoadingState />
          ) : (
            staffList.length === 0 && <EmptyState icon={Users} message={t('noStaffInvitedYet')} />
          )}

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

      <View style={[styles.section, styles.dangerSection]}>
        <Text style={styles.dangerSectionTitle}>{t('deleteAccount.title')}</Text>
        <Text style={styles.sectionHint}>
          {isOwner ? t('deleteAccount.hint') : t('deleteAccount.hintStaff')}
        </Text>
        <Pressable
          style={[styles.button, styles.dangerButton]}
          onPress={confirmDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator color={colors.destructive} />
          ) : (
            <Text style={styles.dangerButtonText}>
              {isOwner ? t('deleteAccount.button') : t('deleteAccount.buttonStaff')}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

interface PaymentGatewayCardProps {
  gatewayId: PaymentGatewayId;
  connection: PaymentGatewayConnection | null;
  token: string;
  colors: ThemeColors;
  t: TFunction;
  onChange: (state: PaymentAccountsState) => void;
}

function PaymentGatewayCard({ gatewayId, connection, token, colors, t, onChange }: PaymentGatewayCardProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const label = GATEWAY_LABELS[gatewayId];

  const [formOpen, setFormOpen] = useState(false);
  const [merchantId, setMerchantId] = useState('');
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openForm = () => {
    setError(null);
    setMerchantId('');
    setSecret('');
    setFormOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (!merchantId.trim() || !secret.trim()) {
      setError(t('paymentAccounts.validation'));
      return;
    }
    setSaving(true);
    try {
      const updated = await api.connectPaymentGateway(token, gatewayId, { merchantId: merchantId.trim(), secret: secret.trim() });
      onChange(updated);
      setFormOpen(false);
      setMerchantId('');
      setSecret('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('paymentAccounts.connectFailed'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDisconnect = () => {
    Alert.alert(
      t('paymentAccounts.disconnectConfirmTitle', { gateway: label }),
      t('paymentAccounts.disconnectConfirmBody'),
      [
        { text: t('paymentAccounts.cancel'), style: 'cancel' },
        { text: t('paymentAccounts.disconnect'), style: 'destructive', onPress: disconnect },
      ],
    );
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const updated = await api.disconnectPaymentGateway(token, gatewayId);
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('paymentAccounts.disconnectFailed'));
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <View style={styles.gatewayCard}>
      <View style={styles.gatewayHeader}>
        <Text style={styles.gatewayName}>{label}</Text>
        {connection && !formOpen && (
          <View style={[styles.badge, styles.badgeActive]}>
            <Text style={styles.badgeActiveText}>{t('paymentAccounts.connected')}</Text>
          </View>
        )}
      </View>

      {connection && !formOpen && (
        <>
          <Text style={styles.gatewayMeta}>{connection.merchantId}</Text>
          <Text style={styles.prefHint}>
            {t('paymentAccounts.connectedSince', { date: new Date(connection.connectedAt).toLocaleDateString() })}
          </Text>
        </>
      )}

      {!formOpen && (
        <View style={styles.gatewayActions}>
          <Pressable style={[styles.button, styles.secondaryButton, styles.flex1]} onPress={openForm}>
            <Text style={styles.secondaryButtonText}>{connection ? t('paymentAccounts.replace') : t('paymentAccounts.connect')}</Text>
          </Pressable>
          {connection && (
            <Pressable style={styles.removeButton} onPress={confirmDisconnect} disabled={disconnecting}>
              {disconnecting ? (
                <ActivityIndicator color={colors.destructive} size="small" />
              ) : (
                <Text style={styles.removeButtonText}>{t('paymentAccounts.disconnect')}</Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {formOpen && (
        <View style={styles.inviteForm}>
          <FormField label={t('paymentAccounts.merchantIdLabel')} value={merchantId} onChangeText={setMerchantId} autoCapitalize="none" />
          <FormField label={t('paymentAccounts.secretLabel')} value={secret} onChangeText={setSecret} secureTextEntry />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.gatewayActions}>
            <Pressable style={[styles.button, styles.primaryButton, styles.flex1]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>{t('paymentAccounts.save')}</Text>}
            </Pressable>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setFormOpen(false)} disabled={saving}>
              <Text style={styles.secondaryButtonText}>{t('paymentAccounts.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!formOpen && !connection && <Text style={styles.prefHint}>{t('paymentAccounts.notActiveYet')}</Text>}
    </View>
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
  dangerSection: { borderColor: colors.destructiveTint15 },
  dangerSectionTitle: { fontSize: 15, fontWeight: '700', color: colors.destructive },
  dangerButton: { backgroundColor: colors.destructiveTint15 },
  dangerButtonText: { color: colors.destructive, fontWeight: '700', fontSize: 14 },
  button: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.foreground, fontWeight: '600', fontSize: 13 },
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

  flex1: { flex: 1 },
  gatewayCard: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  gatewayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gatewayName: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  gatewayMeta: { color: colors.foreground, fontSize: 13 },
  gatewayActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
});
