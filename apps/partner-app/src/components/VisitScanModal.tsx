import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { CheckCircle2, ScanLine, X, XCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api, type VisitScanResult } from '../lib/api';
import { radii, cardShadow } from '../theme/tokens';

// Web only: the same fixed-position overlay as ReviewQrModal (see
// RestaurantPreviewModal for why). On phones the scanner opens in a real
// Modal instead - drawn as an overlay over the Reviews screen, Android's
// camera preview ended up hidden behind it (a black camera).
const webBackdropStyle: ViewStyle = { position: 'fixed' as ViewStyle['position'] };

type ScanState =
  | { kind: 'scanning' }
  | { kind: 'checking' }
  | { kind: 'done'; result: VisitScanResult }
  | { kind: 'failed' };

// Staff scan the "My visit code" QR a customer shows in the customer app,
// which records a verified visit. Opened from the Reviews screen, next to
// the restaurant's own review QR - and only offered when the off-by-default
// "visitScan" feature flag is on.
export function VisitScanModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('visitScan');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>({ kind: 'scanning' });
  // The camera fires several reads per second for the same code - only the
  // first one in each scan is sent.
  const busy = useRef(false);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy.current || !token) return;
    busy.current = true;
    setState({ kind: 'checking' });
    try {
      setState({ kind: 'done', result: await api.scanVisit(token, data) });
    } catch {
      setState({ kind: 'failed' });
    }
  };

  const scanNext = () => {
    busy.current = false;
    setState({ kind: 'scanning' });
  };

  const header = (
    <View style={styles.headerRow}>
      <View style={styles.flex1}>
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>
      </View>
      <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('close')}>
        <X size={22} color={colors.foreground} />
      </Pressable>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, webBackdropStyle]}>
        {header}
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{t('phoneOnly')}</Text>
        </View>
      </View>
    );
  }

  let body: ReactNode = null;
  if (permission && !permission.granted) {
    body = (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>{t('permissionNeeded')}</Text>
        <Pressable onPress={requestPermission} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{t('allowCamera')}</Text>
        </Pressable>
      </View>
    );
  } else if (permission) {
    // The camera stays on between scans - switching it off and on again for
    // "Scan next" left it black on some phones. The result is shown on top
    // of it, and new reads are ignored until Scan next.
    body = (
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={state.kind === 'scanning' ? onScanned : undefined}
        />
        <View style={styles.frame} pointerEvents="none" />
        <Text style={styles.cameraHint}>{state.kind === 'checking' ? t('checking') : t('pointCamera')}</Text>
        {(state.kind === 'done' || state.kind === 'failed') && (
          <View style={styles.resultLayer}>
            <View style={[styles.result, state.kind === 'done' ? styles.resultOk : styles.resultFail]}>
              {state.kind === 'done' ? (
                <>
                  <CheckCircle2 size={48} color={colors.success} />
                  <Text style={styles.resultTitle}>{t('recorded')}</Text>
                  <Text style={styles.resultName}>{state.result.customerName}</Text>
                  <Text style={styles.resultMeta}>
                    {t('levelAndVisits', { level: state.result.level, visits: state.result.visitCount })}
                  </Text>
                  {state.result.alreadyToday && <Text style={styles.resultMeta}>{t('alreadyToday')}</Text>}
                </>
              ) : (
                <>
                  <XCircle size={48} color={colors.destructive} />
                  <Text style={styles.resultTitle}>{t('notRecognised')}</Text>
                  <Text style={styles.resultMeta}>{t('notRecognisedHint')}</Text>
                </>
              )}
              <Pressable onPress={scanNext} style={styles.primaryButton}>
                <ScanLine size={18} color={colors.primaryForeground} />
                <Text style={styles.primaryButtonText}>{t('scanNext')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.container, styles.modalFill]}>
        {header}
        {body}
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
    padding: 16,
    paddingTop: 48,
    gap: 16,
  },
  modalFill: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex1: { flex: 1 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  notice: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 20,
    gap: 14,
    alignItems: 'center',
    ...cardShadow,
  },
  noticeText: { fontSize: 15, color: colors.foreground, textAlign: 'center' },
  // No rounded clipping here: on Android the camera preview can render
  // black inside a clipped (overflow: hidden) parent.
  cameraWrap: {
    flex: 1,
    minHeight: 320,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { width: 220, height: 220, borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF' },
  cameraHint: {
    position: 'absolute',
    bottom: 18,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  result: { borderRadius: radii.lg, borderWidth: 1, padding: 24, gap: 8, alignItems: 'center', ...cardShadow },
  resultOk: { borderColor: colors.success, backgroundColor: colors.card },
  resultFail: { borderColor: colors.destructive, backgroundColor: colors.card },
  resultTitle: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  resultName: { fontSize: 17, fontWeight: '600', color: colors.foreground },
  resultMeta: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
  primaryButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: { color: colors.primaryForeground, fontSize: 15, fontWeight: '700' },
});
