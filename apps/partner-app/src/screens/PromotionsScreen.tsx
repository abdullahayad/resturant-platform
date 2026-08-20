import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { FormField } from '../components/FormField';
import { ChipSelect } from '../components/ChipSelect';
import { useAuth } from '../lib/AuthContext';
import { api, type Dish, type PromotionItem } from '../lib/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDiscount(p: PromotionItem): string {
  return p.discountType === 'PERCENTAGE' ? `${Number(p.discountValue)}% off` : `${Number(p.discountValue).toLocaleString()} IQD off`;
}

function formatScope(p: PromotionItem): string {
  if (p.scope === 'WHOLE_MENU') return 'Whole menu';
  return `On: ${p.dishes.map((d) => d.dish.nameEn).join(', ') || '—'}`;
}

function formatSchedule(p: PromotionItem): string {
  if (p.isRecurring) {
    const day = p.recurringDayOfWeek != null ? DAY_NAMES[p.recurringDayOfWeek] : '—';
    return p.startTime && p.endTime ? `Every ${day}, ${p.startTime}–${p.endTime}` : `Every ${day} (all day)`;
  }
  const from = p.validFrom ? new Date(p.validFrom).toLocaleDateString() : '—';
  const until = p.validUntil ? new Date(p.validUntil).toLocaleDateString() : '—';
  return `${from} – ${until}`;
}

const emptyForm = {
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
  discountValue: '',
  scope: 'WHOLE_MENU' as 'WHOLE_MENU' | 'SPECIFIC_DISHES',
  dishIds: [] as string[],
  isRecurring: false,
  validFrom: '',
  validUntil: '',
  recurringDayOfWeek: 0,
  startTime: '',
  endTime: '',
};

export function PromotionsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([api.myPromotions(token), api.myDishes(token)])
      .then(([mine, myDishes]) => {
        setPromotions(mine);
        setDishes(myDishes);
      })
      .catch(() => setLoadError('Could not reach the server. Is the backend running on localhost:3000?'));
  }, [token]);

  useEffect(loadAll, [loadAll]);

  const submit = async () => {
    setFormError(null);
    if (!form.titleEn.trim() || !form.titleAr.trim()) {
      setFormError('Fill in title (EN/AR).');
      return;
    }
    if (!form.discountValue || Number(form.discountValue) <= 0) {
      setFormError('Enter a discount value greater than 0.');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && Number(form.discountValue) > 100) {
      setFormError('A percentage discount cannot exceed 100.');
      return;
    }
    if (form.scope === 'SPECIFIC_DISHES' && form.dishIds.length === 0) {
      setFormError('Pick at least one dish for a dish-specific promotion.');
      return;
    }
    if (!form.isRecurring && (!form.validFrom || !form.validUntil)) {
      setFormError('Set a start and end date.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createPromotion(token, {
        titleEn: form.titleEn.trim(),
        titleAr: form.titleAr.trim(),
        descriptionEn: form.descriptionEn.trim() || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        scope: form.scope,
        dishIds: form.scope === 'SPECIFIC_DISHES' ? form.dishIds : undefined,
        isRecurring: form.isRecurring,
        validFrom: form.isRecurring ? undefined : `${form.validFrom}T00:00:00.000Z`,
        validUntil: form.isRecurring ? undefined : `${form.validUntil}T23:59:59.000Z`,
        recurringDayOfWeek: form.isRecurring ? form.recurringDayOfWeek : undefined,
        startTime: form.isRecurring && form.startTime ? form.startTime : undefined,
        endTime: form.isRecurring && form.endTime ? form.endTime : undefined,
      });
      setPromotions((prev) => [created, ...prev]);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create promotion');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (promo: PromotionItem) => {
    setBusyId(promo.id);
    try {
      const updated = await api.updatePromotion(token, promo.id, { isActive: !promo.isActive });
      setPromotions((prev) => prev.map((p) => (p.id === promo.id ? updated : p)));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await api.deletePromotion(token, id);
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Promotions</Text>
      <Text style={styles.subtitle}>
        Offer a discount on your menu or a specific dish. New and edited promotions need admin approval
        before they go live.
      </Text>
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      <View style={styles.list}>
        {promotions.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.flex1}>
                <Text style={styles.cardTitle}>{p.titleEn} · {p.titleAr}</Text>
                <Text style={styles.cardMeta}>{formatDiscount(p)} · {formatScope(p)}</Text>
                <Text style={styles.cardMeta}>{formatSchedule(p)}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  p.status === 'APPROVED' ? styles.badgeActive : p.status === 'REJECTED' ? styles.badgeCancelled : styles.badgeInactive,
                ]}
              >
                <Text
                  style={
                    p.status === 'APPROVED'
                      ? styles.badgeActiveText
                      : p.status === 'REJECTED'
                        ? styles.badgeCancelledText
                        : styles.badgeInactiveText
                  }
                >
                  {p.status}
                </Text>
              </View>
            </View>
            {p.status === 'REJECTED' && p.rejectionReason && (
              <Text style={styles.rejection}>Rejected: {p.rejectionReason}</Text>
            )}
            <View style={styles.cardActions}>
              {p.status === 'APPROVED' && (
                <Pressable onPress={() => toggleActive(p)} disabled={busyId === p.id}>
                  <Text style={styles.toggleLink}>{p.isActive ? 'Turn off' : 'Turn on'}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => remove(p.id)} disabled={busyId === p.id}>
                <Text style={styles.removeButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {promotions.length === 0 && !loadError && <Text style={styles.hint}>No promotions yet.</Text>}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Create Promotion</Text>
        <FormField label="Title (English)" value={form.titleEn} onChangeText={(v) => setForm((f) => ({ ...f, titleEn: v }))} placeholder="Weekend Sale" />
        <FormField label="Title (Arabic)" value={form.titleAr} onChangeText={(v) => setForm((f) => ({ ...f, titleAr: v }))} placeholder="تخفيضات نهاية الأسبوع" />
        <FormField
          label="Description (optional)"
          value={form.descriptionEn}
          onChangeText={(v) => setForm((f) => ({ ...f, descriptionEn: v }))}
          placeholder="What's included?"
        />

        <Text style={styles.fieldLabel}>Discount Type</Text>
        <ChipSelect
          options={[
            { id: 'PERCENTAGE', label: 'Percentage off' },
            { id: 'FIXED_AMOUNT', label: 'Fixed amount off' },
          ]}
          selectedIds={[form.discountType]}
          onToggle={(id) => setForm((f) => ({ ...f, discountType: id as 'PERCENTAGE' | 'FIXED_AMOUNT' }))}
        />
        <FormField
          label={form.discountType === 'PERCENTAGE' ? 'Discount, % (e.g. 20)' : 'Discount, IQD (e.g. 5000)'}
          value={form.discountValue}
          onChangeText={(v) => setForm((f) => ({ ...f, discountValue: v }))}
          keyboardType="numeric"
          placeholder={form.discountType === 'PERCENTAGE' ? '20' : '5000'}
        />

        <Text style={styles.fieldLabel}>Applies To</Text>
        <ChipSelect
          options={[
            { id: 'WHOLE_MENU', label: 'Whole menu' },
            { id: 'SPECIFIC_DISHES', label: 'Specific dishes' },
          ]}
          selectedIds={[form.scope]}
          onToggle={(id) => setForm((f) => ({ ...f, scope: id as 'WHOLE_MENU' | 'SPECIFIC_DISHES' }))}
        />
        {form.scope === 'SPECIFIC_DISHES' && (
          <ChipSelect
            options={dishes.map((d) => ({ id: d.id, label: d.nameEn }))}
            selectedIds={form.dishIds}
            onToggle={(id) =>
              setForm((f) => ({
                ...f,
                dishIds: f.dishIds.includes(id) ? f.dishIds.filter((d) => d !== id) : [...f.dishIds, id],
              }))
            }
          />
        )}

        <Text style={styles.fieldLabel}>Schedule</Text>
        <ChipSelect
          options={[
            { id: 'once', label: 'Date range' },
            { id: 'weekly', label: 'Recurring (day of week)' },
          ]}
          selectedIds={[form.isRecurring ? 'weekly' : 'once']}
          onToggle={(id) => setForm((f) => ({ ...f, isRecurring: id === 'weekly' }))}
        />

        {form.isRecurring ? (
          <>
            <Text style={styles.fieldLabel}>Day of the week</Text>
            <ChipSelect
              options={DAY_NAMES.map((label, id) => ({ id: String(id), label }))}
              selectedIds={[String(form.recurringDayOfWeek)]}
              onToggle={(id) => setForm((f) => ({ ...f, recurringDayOfWeek: Number(id) }))}
            />
            <Text style={styles.hint}>Leave start/end time blank for an all-day "day special".</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField label="Start time (optional)" value={form.startTime} onChangeText={(v) => setForm((f) => ({ ...f, startTime: v }))} placeholder="17:00" />
              </View>
              <View style={styles.flex1}>
                <FormField label="End time (optional)" value={form.endTime} onChangeText={(v) => setForm((f) => ({ ...f, endTime: v }))} placeholder="19:00" />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField label="Start date" value={form.validFrom} onChangeText={(v) => setForm((f) => ({ ...f, validFrom: v }))} placeholder="2026-08-20" />
            </View>
            <View style={styles.flex1}>
              <FormField label="End date" value={form.validUntil} onChangeText={(v) => setForm((f) => ({ ...f, validUntil: v }))} placeholder="2026-08-22" />
            </View>
          </View>
        )}

        {formError && <Text style={styles.error}>{formError}</Text>}
        <Pressable style={[styles.button, styles.primaryButton]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>Submit for Approval</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 40, maxWidth: 620 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground },
  error: { color: colors.destructive, fontSize: 13 },
  hint: { color: colors.mutedForeground, fontSize: 12 },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },

  list: { gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  cardMeta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  rejection: { color: colors.destructive, fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeActive: { backgroundColor: colors.successTint15 },
  badgeInactive: { backgroundColor: colors.secondary },
  badgeActiveText: { color: colors.success, fontSize: 12, fontWeight: '600' },
  badgeInactiveText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  badgeCancelled: { backgroundColor: colors.destructiveTint15 },
  badgeCancelledText: { color: colors.destructive, fontSize: 12, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  toggleLink: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  removeButtonText: { color: colors.destructive, fontSize: 12, fontWeight: '600' },

  formCard: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  fieldLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14 },
});
