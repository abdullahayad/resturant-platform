import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '../theme';
import { AppText } from './AppText';

// The public pages live on the website (served by the API); the customer's
// language picks the Arabic or English version.
const SITE = 'https://api.ligeta.app';

export function openLegalPage(page: 'app-privacy' | 'app-terms', lang: string) {
  Linking.openURL(`${SITE}/${page}?lang=${lang === 'ar' ? 'ar' : 'en'}`).catch(() => {});
}

// "By continuing you agree to the Terms of Use and Privacy Policy" - shown
// under the sign-in button, so creating an account means agreeing.
export function AgreeToTerms({ style }: { style?: StyleProp<TextStyle> }) {
  const { t, i18n } = useTranslation();
  return (
    <AppText style={[styles.agree, style]}>
      {t('legal.agreePrefix')}
      <AppText weight="semibold" style={styles.link} onPress={() => openLegalPage('app-terms', i18n.language)} accessibilityRole="link">
        {t('legal.terms')}
      </AppText>
      {t('legal.and')}
      <AppText weight="semibold" style={styles.link} onPress={() => openLegalPage('app-privacy', i18n.language)} accessibilityRole="link">
        {t('legal.privacy')}
      </AppText>
      {t('legal.agreeSuffix')}
    </AppText>
  );
}

// Small "Privacy policy · Terms of use" footer for the Profile screen.
export function LegalFooter() {
  const { t, i18n } = useTranslation();
  return (
    <View style={styles.footer}>
      <AppText style={styles.footerLink} onPress={() => openLegalPage('app-privacy', i18n.language)} accessibilityRole="link">
        {t('legal.privacy')}
      </AppText>
      <AppText style={styles.dot}>·</AppText>
      <AppText style={styles.footerLink} onPress={() => openLegalPage('app-terms', i18n.language)} accessibilityRole="link">
        {t('legal.terms')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  agree: { fontSize: 12.5, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  link: { fontSize: 12.5, color: colors.blue },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 8 },
  footerLink: { fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
  dot: { fontSize: 13, color: colors.mutedIcon },
});
