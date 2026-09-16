import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../lib/AuthContext';
import { api, type Dish, type PriceAdjustmentType } from '../lib/api';
import { ChipSelect } from './ChipSelect';

interface BulkPriceUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onApplied: (updated: Dish[]) => void;
}

// Same fixed-position overlay trick as the other full-screen modals in this
// app (LegalDocumentModal, RestaurantPreviewModal) - RN's <Modal> doesn't
// reliably sit on top of page content on react-native-web.
const backdropStyle: ViewStyle = { position: 'fixed' as ViewStyle['position'] };

type Scope = 'all' | 'selected';
type Direction = 'increase' | 'decrease';

// Mirrors DishesService's computeAdjustedPrice - this is only ever used to
// show a preview here; the real new prices are always computed and clamped
// server-side from whatever the current price actually is at apply time.
function previewPrice(current: number, type: PriceAdjustmentType, signedValue: number): number {
  const raw = type === 'PERCENTAGE' ? current * (1 + signedValue / 100) : current + signedValue;
  const rounded = Math.round(raw * 100) / 100;
  return Math.max(1, rounded);
}

export function BulkPriceUpdateModal({ visible, onClose, onApplied }: BulkPriceUpdateModalProps) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation('menu');
  const { t: tCommon } = useTranslation('common');
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [type, setType] = useState<PriceAdjustmentType>('PERCENTAGE');
  const [direction, setDirection] = useState<Direction>('increase');
  const [amountText, setAmountText] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDishes(null);
    setLoadError(null);
    setType('PERCENTAGE');
    setDirection('increase');
    setAmountText('');
    setScope('all');
    setSelectedIds([]);
    setApplyError(null);
    api
      .myDishes(token)
      .then(setDishes)
      .catch(() => setLoadError(t('bulkPrice.loadFailed')));
  }, [visible, token, t]);

  if (!visible) return null;

  const amount = Number(amountText);
  const hasValidAmount = amountText.trim() !== '' && !Number.isNaN(amount) && amount > 0;
  const signedValue = direction === 'decrease' ? -amount : amount;

  const targetDishes = !dishes ? [] : scope === 'all' ? dishes : dishes.filter((d) => selectedIds.includes(d.id));
  const canApply = hasValidAmount && targetDishes.length > 0 && !applying;

  const handleApply = async () => {
    if (!canApply) return;
    setApplying(true);
    setApplyError(null);
    try {
      const updated = await api.bulkUpdateDishPrices(token, {
        type,
        value: signedValue,
        dishIds: scope === 'selected' ? selectedIds : undefined,
      });
      onApplied(updated);
      onClose();
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : t('bulkPrice.applyFailed'));
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={[styles.backdrop, backdropStyle]}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.flex1}>
            <Text style={styles.title}>{t('bulkPrice.title')}</Text>
            <Text style={styles.subtitle}>{t('bulkPrice.subtitle')}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{tCommon('actions.close')}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {loadError && <Text style={styles.error}>{loadError}</Text>}
          {!dishes && !loadError && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {dishes && (
            <>
              <Text style={styles.fieldLabel}>{t('bulkPrice.adjustmentType')}</Text>
              <Segmented
                colors={colors}
                options={[
                  { id: 'PERCENTAGE' as const, label: t('bulkPrice.percentage') },
                  { id: 'FIXED_AMOUNT' as const, label: t('bulkPrice.fixedAmount') },
                ]}
                value={type}
                onChange={setType}
              />

              <Segmented
                colors={colors}
                options={[
                  { id: 'increase' as const, label: t('bulkPrice.increase') },
                  { id: 'decrease' as const, label: t('bulkPrice.decrease') },
                ]}
                value={direction}
                onChange={setDirection}
              />

              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="numeric"
                placeholder={type === 'PERCENTAGE' ? t('bulkPrice.percentagePlaceholder') : t('bulkPrice.fixedAmountPlaceholder')}
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>{t('bulkPrice.scope')}</Text>
              <Segmented
                colors={colors}
                options={[
                  { id: 'all' as const, label: t('bulkPrice.allDishes') },
                  { id: 'selected' as const, label: t('bulkPrice.selectedDishes') },
                ]}
                value={scope}
                onChange={setScope}
              />

              {scope === 'selected' && (
                <View style={styles.stackGap}>
                  <Text style={styles.hint}>{t('bulkPrice.selectDishesHint')}</Text>
                  <ChipSelect
                    options={dishes.map((d) => ({ id: d.id, label: language === 'ar' ? d.nameAr : d.nameEn }))}
                    selectedIds={selectedIds}
                    onToggle={(id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
                  />
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.fieldLabel}>{t('bulkPrice.preview')}</Text>
                {!hasValidAmount || targetDishes.length === 0 ? (
                  <Text style={styles.hint}>{t('bulkPrice.noChange')}</Text>
                ) : (
                  <View style={styles.stackGap}>
                    {targetDishes.map((dish) => {
                      const oldPrice = Number(dish.price);
                      const newPrice = previewPrice(oldPrice, type, signedValue);
                      const changed = newPrice !== oldPrice;
                      return (
                        <View key={dish.id} style={styles.previewRow}>
                          <Text style={styles.previewName} numberOfLines={1}>
                            {language === 'ar' ? dish.nameAr : dish.nameEn}
                          </Text>
                          <View style={styles.previewPrices}>
                            <Text style={styles.previewOld}>{oldPrice.toLocaleString()}</Text>
                            <Text style={styles.previewArrow}>→</Text>
                            <Text style={[styles.previewNew, changed && (newPrice > oldPrice ? styles.previewUp : styles.previewDown)]}>
                              {newPrice.toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {applyError && <Text style={styles.error}>{applyError}</Text>}
              <Pressable
                style={[styles.button, styles.primaryButton, !canApply && styles.buttonDisabled]}
                onPress={handleApply}
                disabled={!canApply}
              >
                {applying ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('bulkPrice.apply', { count: targetDishes.length })}</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function Segmented<T extends string>({
  colors,
  options,
  value,
  onChange,
}: {
  colors: ThemeColors;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const styles = createStyles(colors);
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable
          key={option.id}
          style={[styles.segment, value === option.id && styles.segmentActive]}
          onPress={() => onChange(option.id)}
        >
          <Text style={[styles.segmentText, value === option.id && styles.segmentTextActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  flex1: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.primary },
  subtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  closeButton: { borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6 },
  closeButtonText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  body: { padding: 20 },
  bodyContent: { gap: 14, paddingBottom: 8 },
  error: { color: colors.destructive, fontSize: 13 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },

  fieldLabel: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.mutedForeground },
  stackGap: { gap: 10 },

  segmented: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.secondary },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
  segmentTextActive: { color: colors.primaryForeground },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    color: colors.foreground,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    outlineWidth: 0,
  },

  section: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  previewName: { flex: 1, fontSize: 13, color: colors.foreground },
  previewPrices: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewOld: { fontSize: 12, color: colors.mutedForeground, textDecorationLine: 'line-through' },
  previewArrow: { fontSize: 12, color: colors.mutedForeground },
  previewNew: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  previewUp: { color: colors.success },
  previewDown: { color: colors.destructive },

  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
});
