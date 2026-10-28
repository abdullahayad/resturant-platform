import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { colors } from '../theme';
import { AppText } from './AppText';

// "My visit code": the QR the restaurant scans in its partner app to count
// a verified visit. The server changes the code every minute, so this
// fetches a fresh one just before the current one runs out - a screenshot
// stops working a couple of minutes later.
export function VisitCodeSheet({ onClose, level }: { onClose: () => void; level: number }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    api
      .visitCode()
      .then((res) => {
        if (cancelled) return;
        setCode(res.code);
        setFailed(false);
        timer = setTimeout(() => setRefreshKey((k) => k + 1), Math.max(5, res.expiresInSeconds - 2) * 1000);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        timer = setTimeout(() => setRefreshKey((k) => k + 1), 10_000);
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refreshKey]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('home.close')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <AppText weight="bold" style={styles.title}>
          {t('profile.visitCode')}
        </AppText>
        <AppText style={styles.text}>{t('profile.visitCodeText')}</AppText>
        <View style={styles.qrBox}>
          {code ? (
            <QRCode value={code} size={220} color={colors.navy} backgroundColor={colors.white} />
          ) : failed ? (
            <AppText style={styles.text}>{t('explore.errorText')}</AppText>
          ) : (
            <ActivityIndicator color={colors.orange} size="large" />
          )}
        </View>
        <View style={styles.levelPill}>
          <AppText weight="bold" style={styles.levelText}>
            {t('profile.level', { n: level })}
          </AppText>
        </View>
        <AppText style={styles.small}>{t('profile.visitCodeRule')}</AppText>
        <Pressable style={styles.done} onPress={onClose} accessibilityRole="button">
          <AppText weight="bold" style={styles.doneText}>
            {t('home.close')}
          </AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,22,64,0.55)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 21 },
  text: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  qrBox: {
    width: 252,
    height: 252,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  levelPill: { backgroundColor: colors.peach, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6 },
  levelText: { color: colors.orangeDark, fontSize: 14 },
  small: { fontSize: 12.5, color: colors.mutedIcon, textAlign: 'center' },
  done: { alignSelf: 'stretch', height: 50, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  doneText: { fontSize: 15 },
});
