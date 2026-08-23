import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../lib/AuthContext';

interface HeaderProps {
  nameEn: string;
  nameAr: string;
  codeNumber: string;
  onSignOut: () => void;
}

export function Header({ nameEn, nameAr, codeNumber, onSignOut }: HeaderProps) {
  const { staff } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation('common');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const roleLabel = staff ? t(staff.role === 'MANAGER' ? 'roles.manager' : 'roles.menuEditor') : '';
  return (
    <View style={styles.header}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>{nameEn.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{nameEn} · {nameAr}</Text>
        <Text style={styles.code} numberOfLines={1}>
          {codeNumber}
          {staff ? ` · ${staff.fullName} (${roleLabel})` : ''}
        </Text>
      </View>
      <Pressable onPress={toggleLanguage} style={styles.themeToggle}>
        <Text style={styles.langToggleText}>{language === 'en' ? 'AR' : 'EN'}</Text>
      </Pressable>
      <Pressable onPress={toggleTheme} style={styles.themeToggle}>
        {theme === 'dark' ? (
          <Sun size={16} color={colors.mutedForeground} />
        ) : (
          <Moon size={16} color={colors.mutedForeground} />
        )}
      </Pressable>
      <Pressable onPress={onSignOut} style={styles.signOut}>
        <Text style={styles.signOutText}>{t('signOut')}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 18 },
  info: { flex: 1 },
  name: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
  code: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langToggleText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '700' },
  signOut: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutText: { color: colors.mutedForeground, fontSize: 13 },
});
