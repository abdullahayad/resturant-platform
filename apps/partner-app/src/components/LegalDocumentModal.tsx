import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { LEGAL_LAST_UPDATED, type LegalSection } from '../lib/legalContent';

interface LegalDocumentModalProps {
  visible: boolean;
  title: string;
  sections: LegalSection[];
  onClose: () => void;
}

// RN's built-in <Modal> doesn't reliably overlay the full viewport on
// react-native-web (this app is only ever run/tested via Expo web) — it can
// render without an opaque backdrop and get layered underneath page content
// instead of on top of it. A plain fixed-position overlay in the normal
// render tree is what actually pins over the whole screen here.
const backdropStyle: ViewStyle = { position: 'fixed' as ViewStyle['position'] };

export function LegalDocumentModal({ visible, title, sections, onClose }: LegalDocumentModalProps) {
  if (!visible) return null;

  return (
    <View style={[styles.backdrop, backdropStyle]}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.updated}>Last updated {LEGAL_LAST_UPDATED}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '85%',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.primary },
  updated: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  closeButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  body: { padding: 20 },
  bodyContent: { gap: 16, paddingBottom: 8 },
  section: { gap: 4 },
  sectionHeading: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  sectionBody: { fontSize: 13, color: colors.mutedForeground, lineHeight: 19 },
});
