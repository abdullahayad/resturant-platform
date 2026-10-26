import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { CalendarCheck, Home, Search, Tag, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabButton } from '../../src/components/TabButton';
import { colors } from '../../src/theme';

// The five main sections in a floating pill bar. The routes are declared
// in a hidden TabList (expo-router/ui needs one); the visible bar is a
// separate view so its own styling and safe-area position are never
// overridden by TabList's.
export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList style={styles.hidden}>
        <TabTrigger name="index" href="/">
          <Text>home</Text>
        </TabTrigger>
        <TabTrigger name="explore" href="/explore">
          <Text>explore</Text>
        </TabTrigger>
        <TabTrigger name="offers" href="/offers">
          <Text>offers</Text>
        </TabTrigger>
        <TabTrigger name="events" href="/events">
          <Text>events</Text>
        </TabTrigger>
        <TabTrigger name="profile" href="/profile">
          <Text>profile</Text>
        </TabTrigger>
      </TabList>

      {/* Sits above Android's own back/home buttons (or gesture bar). */}
      <View style={[styles.bar, { bottom: insets.bottom + 12 }]}>
        <TabTrigger name="index" asChild>
          <TabButton icon={Home} label={t('tabs.home')} />
        </TabTrigger>
        <TabTrigger name="explore" asChild>
          <TabButton icon={Search} label={t('tabs.explore')} />
        </TabTrigger>
        <TabTrigger name="offers" asChild>
          <TabButton icon={Tag} label={t('tabs.offers')} />
        </TabTrigger>
        <TabTrigger name="events" asChild>
          <TabButton icon={CalendarCheck} label={t('tabs.events')} />
        </TabTrigger>
        <TabTrigger name="profile" asChild>
          <TabButton icon={User} label={t('tabs.profile')} />
        </TabTrigger>
      </View>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  slot: { flex: 1 },
  hidden: { display: 'none' },
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
