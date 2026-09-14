import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import type { ScreenKey } from '../lib/nav';

interface AnnouncementBannerProps {
  active: ScreenKey;
  onView: () => void;
}

export function AnnouncementBanner({ active, onView }: AnnouncementBannerProps) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api
      .unreadAnnouncementsCount(token)
      .then(({ count }) => setUnreadCount(count))
      .catch(() => {});
  }, [token, active]);

  if (unreadCount === 0 || active === 'announcements') return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{t('announcementBanner.unread', { count: unreadCount })}</Text>
      <Pressable onPress={onView} style={styles.button}>
        <Text style={styles.buttonText}>{t('announcementBanner.view')}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primaryTint15,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryTint30,
  },
  text: { color: colors.foreground, fontSize: 13, flex: 1 },
  button: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  buttonText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700' },
});
