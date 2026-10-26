import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/AppText';
import { colors } from '../src/theme';

// Shown for a link to a page that doesn't exist (e.g. an old shared link).
export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <AppText weight="bold" style={styles.title}>
        الصفحة غير موجودة · Page not found
      </AppText>
      <Link href="/" style={styles.link}>
        <AppText weight="semibold" style={styles.linkText}>
          الرئيسية · Home
        </AppText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: colors.background },
  title: { fontSize: 18 },
  link: { marginTop: 16, paddingVertical: 12 },
  linkText: { fontSize: 15, color: colors.blue },
});
