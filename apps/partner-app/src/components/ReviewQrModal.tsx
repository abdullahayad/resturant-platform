import { useMemo } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { API_BASE_URL } from '../lib/api';
import { radii } from '../theme/tokens';

interface ReviewQrModalProps {
  restaurantId: string;
  onClose: () => void;
}

// API_BASE_URL already carries the /v1 suffix every other API call needs -
// the review page is a plain server-rendered page outside that prefix (see
// the backend's main.ts UNVERSIONED_ROUTES), so it's stripped back off here.
const ROOT_URL = API_BASE_URL.replace(/\/v1$/, '');

// Same fixed-position overlay trick as the other full-screen modals in this
// app - see RestaurantPreviewModal's own comment for why this has to be
// Platform-conditional rather than a bare 'fixed'.
const backdropStyle: ViewStyle = { position: Platform.OS === 'web' ? ('fixed' as ViewStyle['position']) : 'absolute' };

export function ReviewQrModal({ restaurantId, onClose }: ReviewQrModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('reviews');
  const { t: tCommon } = useTranslation('common');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const link = `${ROOT_URL}/review/${restaurantId}`;

  return (
    <View style={[styles.backdrop, backdropStyle]}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('qrModalTitle')}</Text>

        <View style={styles.qrWrap}>
          <QRCode value={link} size={200} />
        </View>

        <Text style={styles.body}>{t('qrModalBody')}</Text>

        <Text style={styles.link} numberOfLines={2}>
          {link}
        </Text>

        <Pressable style={[styles.button, styles.shareButton]} onPress={() => Share.share({ message: link })}>
          <Text style={styles.shareButtonText}>{t('shareLink')}</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.closeButton]} onPress={onClose}>
          <Text style={styles.closeButtonText}>{tCommon('actions.close')}</Text>
        </Pressable>
      </View>
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  qrWrap: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: radii.md,
  },
  body: { marginTop: 16, fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 19 },
  link: {
    marginTop: 12,
    fontSize: 11.5,
    color: colors.mutedForeground,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
  },
  button: { width: '100%', borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  shareButton: { backgroundColor: colors.primary },
  shareButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 14.5 },
  closeButton: { borderWidth: 1, borderColor: colors.border, marginTop: 10 },
  closeButtonText: { color: colors.foreground, fontWeight: '600', fontSize: 14 },
});
