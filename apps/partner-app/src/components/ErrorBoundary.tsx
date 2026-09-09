import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Sits at the very top of the app, outside every provider — a crash inside
// a provider (theme, language, auth) would otherwise slip past a boundary
// placed below them. Deliberately hardcoded, theme-independent styling:
// this is the one screen that must render even if the theme system itself
// is what broke.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    Sentry.captureException(error);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>Please restart the app. If this keeps happening, let us know.</Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1f', padding: 24, gap: 12 },
  title: { color: '#f4f4f5', fontSize: 18, fontWeight: '700' },
  message: { color: '#a1a1aa', fontSize: 14, textAlign: 'center' },
  button: { marginTop: 12, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#d99a4e' },
  buttonText: { color: '#2a1c0c', fontWeight: '700', fontSize: 14 },
});
