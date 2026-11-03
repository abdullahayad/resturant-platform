import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type Province } from '../lib/api';
import { useArea } from '../lib/area';
import { colors } from '../theme';
import { AppText } from './AppText';

// "اختر منطقتك": pick a province, then all of it or one district. Baghdad's
// districts come grouped under its zones (Rusafa / Karkh).
export function AreaSheet({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { area, setArea } = useArea();
  const [provinces, setProvinces] = useState<Province[] | null>(null);
  const [provinceId, setProvinceId] = useState<string | null>(area?.provinceId ?? null);
  const ar = i18n.language === 'ar';
  const name = (x: { nameAr: string; nameEn: string }) => (ar ? x.nameAr : x.nameEn);

  useEffect(() => {
    let cancelled = false;
    api
      .provinces()
      .then((p) => {
        if (!cancelled) setProvinces(p);
      })
      .catch(() => {
        if (!cancelled) setProvinces([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const province = provinces?.find((p) => p.id === provinceId) ?? null;
  const groups = province
    ? [
        ...(province.districts.length ? [{ id: 'none', title: null as string | null, districts: province.districts }] : []),
        ...province.zones.map((z) => ({ id: z.id, title: name(z), districts: z.districts })),
      ]
    : [];

  const choose = (district?: { id: string; nameAr: string; nameEn: string }) => {
    if (!province) return;
    setArea({
      provinceId: province.id,
      provinceNameAr: province.nameAr,
      provinceNameEn: province.nameEn,
      districtId: district?.id,
      districtNameAr: district?.nameAr,
      districtNameEn: district?.nameEn,
    });
    onClose();
  };

  const row = (label: string, selected: boolean, onPress: () => void, key: string) => (
    <Pressable key={key} style={styles.row} onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }}>
      <AppText weight={selected ? 'bold' : 'regular'} style={styles.rowText}>
        {label}
      </AppText>
      {selected && <Check size={20} color={colors.orange} strokeWidth={2.6} />}
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('home.close')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <AppText weight="bold" style={styles.title}>
            {province ? name(province) : t('area.title')}
          </AppText>
          {province && (
            <Pressable onPress={() => setProvinceId(null)} hitSlop={8}>
              <AppText weight="semibold" style={styles.link}>
                {t('area.changeProvince')}
              </AppText>
            </Pressable>
          )}
        </View>

        {provinces === null ? (
          <ActivityIndicator color={colors.orange} style={styles.spinner} />
        ) : (
          <ScrollView>
            {!province ? (
              <>
                {row(t('area.everywhere'), !area, () => {
                  setArea(null);
                  onClose();
                }, 'everywhere')}
                {provinces.map((p) => row(name(p), area?.provinceId === p.id, () => setProvinceId(p.id), p.id))}
              </>
            ) : (
              <>
                {row(t('area.allOf', { name: name(province) }), area?.provinceId === province.id && !area.districtId, () => choose(), 'all')}
                {groups.map((g) => (
                  <View key={g.id}>
                    {g.title && (
                      <AppText weight="bold" style={styles.group}>
                        {g.title}
                      </AppText>
                    )}
                    {g.districts.map((d) => row(name(d), area?.districtId === d.id, () => choose(d), d.id))}
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,22,64,0.45)' },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 6 },
  title: { fontSize: 20 },
  link: { fontSize: 14, color: colors.blue },
  spinner: { marginVertical: 30 },
  group: { fontSize: 13, color: colors.mutedIcon, marginHorizontal: 16, marginTop: 14, marginBottom: 2 },
  row: {
    minHeight: 52,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: 16 },
});
