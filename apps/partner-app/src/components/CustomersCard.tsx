import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Users, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api, type CustomerVisitItem, type CustomersSummary } from '../lib/api';
import { radii, cardShadow } from '../theme/tokens';

const RECENT_COUNT = 5;

// "Your customers" on the Reviews screen: verified visits (customers' visit
// codes you scanned) and how many people follow you in the customer app.
// Owner and managers only - menu editors get no data back, so the card
// simply doesn't show for them. refreshKey changes after each scan.
export function CustomersCard({ refreshKey }: { refreshKey: number }) {
  const { t } = useTranslation('reviews');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token } = useAuth();
  const [summary, setSummary] = useState<CustomersSummary | null>(null);
  const [recent, setRecent] = useState<CustomerVisitItem[]>([]);
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([api.customersSummary(token), api.customerVisits(token, 1)])
      .then(([s, v]) => {
        if (cancelled) return;
        setSummary(s);
        setRecent(v.items.slice(0, RECENT_COUNT));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  if (!summary) return null;

  const stats: [string, number][] = [
    [t('customers.today'), summary.visitsToday],
    [t('customers.thisWeek'), summary.visitsThisWeek],
    [t('customers.totalVisits'), summary.totalVisits],
    [t('customers.customers'), summary.uniqueCustomers],
    [t('customers.returning'), summary.returningCustomers],
    [t('customers.followers'), summary.followers],
  ];

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Users size={20} color={colors.primary} />
        <View style={styles.flex1}>
          <Text style={styles.title}>{t('customers.title')}</Text>
          <Text style={styles.body}>{t('customers.body')}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        {stats.map(([label, value]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>{t('customers.recent')}</Text>
        {summary.totalVisits > RECENT_COUNT && (
          <Pressable onPress={() => setAllOpen(true)} hitSlop={8}>
            <Text style={styles.link}>{t('customers.seeAll')}</Text>
          </Pressable>
        )}
      </View>
      {recent.length === 0 ? (
        <Text style={styles.body}>{t('customers.none')}</Text>
      ) : (
        recent.map((v) => <VisitRow key={v.id} visit={v} styles={styles} />)
      )}

      {allOpen && <AllVisitsModal onClose={() => setAllOpen(false)} styles={styles} />}
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function VisitRow({ visit, styles }: { visit: CustomerVisitItem; styles: Styles }) {
  const { t } = useTranslation('reviews');
  return (
    <View style={styles.visitRow}>
      <View style={styles.flex1}>
        <Text style={styles.visitName}>{visit.customerName}</Text>
        <Text style={styles.visitMeta}>
          {t('customers.levelVisits', { level: visit.level, count: visit.visitsHere })}
        </Text>
      </View>
      <Text style={styles.visitDate}>{new Date(visit.createdAt).toLocaleDateString()}</Text>
    </View>
  );
}

function AllVisitsModal({ onClose, styles }: { onClose: () => void; styles: Styles }) {
  const { t } = useTranslation('reviews');
  const { colors } = useTheme();
  const { token } = useAuth();
  const [items, setItems] = useState<CustomerVisitItem[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNext = useCallback(async () => {
    if (!token || loading || (page > 0 && items.length >= total)) return;
    setLoading(true);
    try {
      const next = await api.customerVisits(token, page + 1);
      setItems((prev) => [...prev, ...next.items]);
      setTotal(next.total);
      setPage(next.page);
    } catch {
      // Scrolling to the bottom again retries.
    } finally {
      setLoading(false);
    }
  }, [token, loading, page, items.length, total]);

  useEffect(() => {
    loadNext();
    // First page only; later pages load on scroll.
  }, []);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, styles.flex1]}>{t('customers.allVisits')}</Text>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel={t('customers.close')}>
            <X size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <FlatList
          data={items}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => <VisitRow visit={item} styles={styles} />}
          onEndReached={loadNext}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
        />
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
    ...cardShadow,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex1: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  body: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: radii.sm,
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  statLabel: { fontSize: 11.5, color: colors.mutedForeground, marginTop: 2, textAlign: 'center' },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recentTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  link: { fontSize: 13, fontWeight: '600', color: colors.primary },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  visitName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  visitMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  visitDate: { fontSize: 12, color: colors.mutedForeground },
  modal: { flex: 1, backgroundColor: colors.background, padding: 16, paddingTop: 48, gap: 12 },
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
  spinner: { marginVertical: 12 },
});
