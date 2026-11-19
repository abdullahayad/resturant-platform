import { Check, LocateFixed, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type Province } from '../lib/api';
import { useArea } from '../lib/area';
import { foldSearchText } from '../lib/searchText';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';

// "اختر منطقتك": My location (nearest first), or a province then all of it
// or one district - or type an area's name to jump straight to it.
// Baghdad's districts come grouped under its zones (Rusafa / Karkh).
export function AreaSheet({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { area, setArea, nearMe, locating, setNearMe } = useArea();
  const [query, setQuery] = useState('');
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

  type Named = { id: string; nameAr: string; nameEn: string };
  // Picking a place to visit turns My location off - the customer is
  // looking somewhere else now.
  const pick = (p: Named, district?: Named) => {
    if (nearMe) void setNearMe(false);
    setArea({
      provinceId: p.id,
      provinceNameAr: p.nameAr,
      provinceNameEn: p.nameEn,
      districtId: district?.id,
      districtNameAr: district?.nameAr,
      districtNameEn: district?.nameEn,
    });
    onClose();
  };

  const useMyLocation = async () => {
    if (await setNearMe(true)) {
      setArea(null);
      onClose();
    }
  };

  // Typed search: districts (with their province) and provinces whose
  // name contains the words, either language.
  const matches = useMemo(() => {
    const q = foldSearchText(query);
    if (!q || !provinces) return null;
    const hit = (x: Named) => foldSearchText(x.nameAr).includes(q) || foldSearchText(x.nameEn).includes(q);
    const out: { key: string; province: Named; district?: Named }[] = [];
    for (const p of provinces) {
      if (hit(p)) out.push({ key: p.id, province: p });
      for (const d of [...p.districts, ...p.zones.flatMap((z) => z.districts)]) {
        if (hit(d)) out.push({ key: d.id, province: p, district: d });
      }
    }
    return out.slice(0, 40);
  }, [query, provinces]);

  const choose = (district?: { id: string; nameAr: string; nameEn: string }) => {
    if (!province) return;
    if (nearMe) void setNearMe(false);
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

        {!province && (
          <View style={styles.search}>
            <Search size={18} color={colors.mutedIcon} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('area.searchHint')}
              placeholderTextColor={colors.mutedIcon}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {!!query && (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('explore.clearSearch')}>
                <X size={18} color={colors.mutedIcon} />
              </Pressable>
            )}
          </View>
        )}

        {provinces === null ? (
          <ActivityIndicator color={colors.orange} style={styles.spinner} />
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            {matches ? (
              matches.length ? (
                matches.map((m) =>
                  row(
                    m.district ? `${name(m.district)} · ${name(m.province)}` : t('area.allOf', { name: name(m.province) }),
                    m.district ? area?.districtId === m.district.id : area?.provinceId === m.province.id && !area.districtId,
                    () => pick(m.province, m.district),
                    m.key,
                  ),
                )
              ) : (
                <AppText style={styles.noMatch}>{t('area.noMatch')}</AppText>
              )
            ) : !province ? (
              <>
                <Pressable style={styles.row} onPress={useMyLocation} disabled={locating} accessibilityRole="radio" accessibilityState={{ checked: nearMe }}>
                  <View style={styles.myLocation}>
                    {locating ? <ActivityIndicator size="small" color={colors.orange} /> : <LocateFixed size={20} color={colors.orange} />}
                    <View>
                      <AppText weight={nearMe ? 'bold' : 'semibold'} style={styles.rowText}>
                        {t('area.myLocation')}
                      </AppText>
                      <AppText style={styles.rowHint}>{t('area.myLocationHint')}</AppText>
                    </View>
                  </View>
                  {nearMe && <Check size={20} color={colors.orange} strokeWidth={2.6} />}
                </Pressable>
                {row(t('area.everywhere'), !area && !nearMe, () => {
                  if (nearMe) void setNearMe(false);
                  setArea(null);
                  onClose();
                }, 'everywhere')}
                {provinces.map((p) => row(name(p), !nearMe && area?.provinceId === p.id, () => setProvinceId(p.id), p.id))}
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
  rowHint: { fontSize: 12.5, color: colors.muted },
  myLocation: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  search: {
    height: 46,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  noMatch: { fontSize: 14, color: colors.muted, textAlign: 'center', marginVertical: 24 },
});
