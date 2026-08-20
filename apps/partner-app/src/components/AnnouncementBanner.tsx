import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import type { ScreenKey } from '../lib/nav';

interface AnnouncementBannerProps {
  active: ScreenKey;
  onView: () => void;
}

export function AnnouncementBanner({ active, onView }: AnnouncementBannerProps) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api
      .announcements(token)
      .then((list) => setUnreadCount(list.filter((a) => !a.readAt).length))
      .catch(() => {});
  }, [token, active]);

  if (unreadCount === 0 || active === 'announcements') return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        {unreadCount === 1 ? 'You have a new announcement' : `You have ${unreadCount} new announcements`} from the
        platform team.
      </Text>
      <Pressable onPress={onView} style={styles.button}>
        <Text style={styles.buttonText}>View</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(217, 154, 78, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 154, 78, 0.3)',
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
