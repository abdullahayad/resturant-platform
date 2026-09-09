import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Sits at the very top of the app, outside every provider — a crash inside
// a provider (theme, router) would otherwise slip past a boundary placed
// below them. Deliberately plain, theme-independent styling: this is the
// one screen that must render even if the theme system itself is what broke.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // No crash-reporting service wired up for the admin portal yet (unlike
    // the partner app's Sentry) — at least this survives in server/browser logs.
    console.error('Admin portal crashed:', error)
  }

  reset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
            backgroundColor: '#0b0b0f',
            color: '#f4f4f5',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</div>
          <div style={{ fontSize: 14, color: '#a1a1aa', textAlign: 'center' }}>
            Please reload the page. If this keeps happening, let us know.
          </div>
          <button
            onClick={this.reset}
            style={{
              marginTop: 12,
              borderRadius: 10,
              padding: '10px 20px',
              backgroundColor: '#d99a4e',
              color: '#2a1c0c',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
