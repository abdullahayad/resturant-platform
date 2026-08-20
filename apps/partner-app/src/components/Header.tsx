import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';

const roleLabels = { MANAGER: 'Manager', MENU_EDITOR: 'Menu Editor' } as const;

interface HeaderProps {
  nameEn: string;
  nameAr: string;
  codeNumber: string;
  onSignOut: () => void;
}

export function Header({ nameEn, nameAr, codeNumber, onSignOut }: HeaderProps) {
  const { staff } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>{nameEn.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{nameEn} · {nameAr}</Text>
        <Text style={styles.code}>
          {codeNumber}
          {staff ? ` · Signed in as ${staff.fullName} (${roleLabels[staff.role]})` : ''}
        </Text>
      </View>
      <Pressable onPress={toggleTheme} style={styles.themeToggle}>
        {theme === 'dark' ? (
          <Sun size={16} color={colors.mutedForeground} />
        ) : (
          <Moon size={16} color={colors.mutedForeground} />
        )}
      </Pressable>
      <Pressable onPress={onSignOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
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
  signOut: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutText: { color: colors.mutedForeground, fontSize: 13 },
});
