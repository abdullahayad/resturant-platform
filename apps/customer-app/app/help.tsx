import { router, useFocusEffect } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../src/components/AppText';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { api, ApiError, type SupportStatus, type SupportTicket, type SupportTopic } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { colors, fonts } from '../src/theme';

const TOPICS: SupportTopic[] = ['BOOKING', 'RESTAURANT_INFO', 'LOGIN', 'ACCOUNT', 'OTHER'];

const STATUS_COLORS: Record<SupportStatus, { bg: string; fg: string }> = {
  OPEN: { bg: colors.peach, fg: colors.orangeDark },
  WAITING: { bg: colors.greenTint, fg: colors.green },
  CLOSED: { bg: colors.surface, fg: colors.muted },
};

// Help: write to the LiGETA team and read the replies (answered from the
// admin portal's Customer Support inbox). Needs an account, so the team
// knows who to answer.
export default function HelpScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [topic, setTopic] = useState<SupportTopic>('OTHER');
  const [text, setText] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const replyRowRef = useRef<View>(null);

  // Brings the reply box up above the keyboard once it has opened.
  const showReplyBox = () => {
    setTimeout(() => {
      const list = scrollRef.current?.getInnerViewNode();
      if (!list) return;
      replyRowRef.current?.measureLayout(
        list,
        (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 160), animated: true }),
        () => {},
      );
    }, 300);
  };

  useFocusEffect(
    useCallback(() => {
      if (status !== 'signedIn') return;
      let cancelled = false;
      api
        .supportTickets()
        .then((list) => {
          if (!cancelled) setTickets(list);
        })
        .catch(() => {
          if (!cancelled) setTickets([]);
        });
      return () => {
        cancelled = true;
      };
    }, [status]),
  );

  if (status === 'signedOut') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title={t('help.title')} />
        <View style={styles.center}>
          <AppText style={styles.muted}>{t('profile.signInText')}</AppText>
          <Pressable style={styles.primary} onPress={() => router.push('/login')} accessibilityRole="button">
            <AppText weight="bold" style={styles.primaryText}>
              {t('profile.signIn')}
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const failedMessage = (e: unknown) =>
    e instanceof ApiError && e.status === 400 && e.message.includes('several open') ? t('help.tooMany') : t('help.failed');

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const ticket = await api.openSupportTicket(topic, text.trim());
      setTickets((list) => [ticket, ...(list ?? [])]);
      setText('');
      setComposing(false);
      setOpenId(ticket.id);
    } catch (e) {
      setError(failedMessage(e));
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (id: string) => {
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const updated = await api.replySupportTicket(id, reply.trim());
      setTickets((list) => (list ?? []).map((tk) => (tk.id === id ? updated : tk)));
      setReply('');
    } catch (e) {
      setError(failedMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('help.title')} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <AppText style={styles.muted}>{t('help.intro')}</AppText>

          {composing ? (
            <View style={styles.card}>
              <AppText weight="semibold" style={styles.label}>
                {t('help.topic')}
              </AppText>
              <View style={styles.chips}>
                {TOPICS.map((tp) => (
                  <Pressable
                    key={tp}
                    style={[styles.chip, topic === tp && styles.chipActive]}
                    onPress={() => setTopic(tp)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: topic === tp }}
                  >
                    <AppText weight="semibold" style={[styles.chipText, topic === tp && styles.chipTextActive]}>
                      {t(`help.topics.${tp}`)}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('help.message')}
                placeholderTextColor={colors.mutedIcon}
                style={[styles.input, styles.textArea]}
                multiline
                maxLength={2000}
              />
              <Pressable
                style={[styles.primary, (sending || !text.trim()) && styles.disabled]}
                onPress={send}
                disabled={sending || !text.trim()}
                accessibilityRole="button"
              >
                {sending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <AppText weight="bold" style={styles.primaryText}>
                    {t('help.send')}
                  </AppText>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.primary} onPress={() => setComposing(true)} accessibilityRole="button">
              <AppText weight="bold" style={styles.primaryText}>
                {t('help.new')}
              </AppText>
            </Pressable>
          )}

          {!!error && <AppText style={styles.error}>{error}</AppText>}

          {tickets === null ? (
            <ActivityIndicator color={colors.orange} style={styles.spinner} />
          ) : tickets.length === 0 ? (
            !composing && <AppText style={[styles.muted, styles.centerText]}>{t('help.empty')}</AppText>
          ) : (
            tickets.map((tk) => {
              const open = openId === tk.id;
              const tone = STATUS_COLORS[tk.status];
              const last = tk.messages[tk.messages.length - 1];
              return (
                <View key={tk.id} style={styles.card}>
                  <Pressable style={styles.ticketTop} onPress={() => setOpenId(open ? null : tk.id)} accessibilityRole="button">
                    <View style={styles.flex}>
                      <AppText weight="bold" style={styles.ticketTitle}>
                        {t(`help.topics.${tk.topic}`)}
                      </AppText>
                      {!open && last && (
                        <AppText style={styles.muted} numberOfLines={1}>
                          {last.text}
                        </AppText>
                      )}
                    </View>
                    <View style={[styles.status, { backgroundColor: tone.bg }]}>
                      <AppText weight="bold" style={[styles.statusText, { color: tone.fg }]}>
                        {t(`help.status.${tk.status}`)}
                      </AppText>
                    </View>
                  </Pressable>

                  {open && (
                    <>
                      {tk.messages.map((m) => (
                        <View key={m.id} style={[styles.bubble, m.fromAdmin ? styles.bubbleTeam : styles.bubbleMe]}>
                          <AppText weight="semibold" style={styles.bubbleWho}>
                            {m.fromAdmin ? t('help.team') : t('help.you')}
                          </AppText>
                          <AppText style={styles.bubbleText}>{m.text}</AppText>
                        </View>
                      ))}
                      <View ref={replyRowRef} style={styles.replyRow}>
                        <TextInput
                          value={reply}
                          onChangeText={setReply}
                          placeholder={t('help.reply')}
                          placeholderTextColor={colors.mutedIcon}
                          style={[styles.input, styles.flex]}
                          onFocus={showReplyBox}
                          multiline
                          maxLength={2000}
                        />
                        <Pressable
                          style={[styles.sendButton, (sending || !reply.trim()) && styles.disabled]}
                          onPress={() => sendReply(tk.id)}
                          disabled={sending || !reply.trim()}
                          accessibilityLabel={t('help.send')}
                        >
                          <Send size={18} color={colors.white} />
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  centerText: { textAlign: 'center', marginTop: 20 },
  content: { padding: 16, gap: 12 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  spinner: { marginTop: 20 },
  card: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  label: { fontSize: 14.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.peach, borderColor: colors.orange },
  chipText: { fontSize: 13 },
  chipTextActive: { color: colors.orangeDark },
  input: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  primary: { height: 50, borderRadius: 16, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  primaryText: { color: colors.white, fontSize: 15.5 },
  disabled: { opacity: 0.5 },
  error: { fontSize: 13.5, color: colors.red },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketTitle: { fontSize: 15.5 },
  status: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11.5 },
  bubble: { borderRadius: 14, padding: 10, maxWidth: '88%' },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.peach },
  bubbleTeam: { alignSelf: 'flex-start', backgroundColor: colors.blueTint },
  bubbleWho: { fontSize: 11.5, color: colors.muted, marginBottom: 2 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
});
