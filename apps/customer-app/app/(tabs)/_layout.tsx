import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { CalendarCheck, Home, Search, Tag, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabButton } from '../../src/components/TabButton';
import { colors } from '../../src/theme';

// The five main sections, in a floating pill bar. Screens leave ~110px at
// the bottom so their last item is never hidden behind it.
export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList asChild>
        <View style={[styles.bar, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon={Home} label={t('tabs.home')} />
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon={Search} label={t('tabs.explore')} />
          </TabTrigger>
          <TabTrigger name="offers" href="/offers" asChild>
            <TabButton icon={Tag} label={t('tabs.offers')} />
          </TabTrigger>
          <TabTrigger name="events" href="/events" asChild>
            <TabButton icon={CalendarCheck} label={t('tabs.events')} />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon={User} label={t('tabs.profile')} />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    shadowColor: colors.navy,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
