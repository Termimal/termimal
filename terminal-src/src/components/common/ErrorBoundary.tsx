// components/common/ErrorBoundary.tsx — Top-level React error boundary.
// Wraps the entire app in main.tsx so a render-time crash shows a branded
// fallback instead of a blank page.

import React from 'react'

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const mono = "'SF Mono', Menlo, Consolas, monospace"

interface State {
  error: Error | null
  digest: string
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, digest: '' }

  static getDerivedStateFromError(error: Error): State {
    // Short pseudo-digest for support correspondence.
    const digest = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    return { error, digest }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('App error boundary caught:', error, info)
  }

  reset = () => {
    this.setState({ error: null, digest: '' })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0e1117',
          color: '#c9d1d9',
          fontFamily: font,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <div
            style={{
              fontFamily: mono, fontSize: 11, fontWeight: 700,
              letterSpacing: 3, textTransform: 'uppercase', color: '#f85149',
              marginBottom: 12,
            }}
          >
            Something went wrong
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', margin: 0, marginBottom: 12 }}>
            The terminal hit an unexpected error.
          </h1>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: '#8b949e', marginBottom: 8 }}>
            The error was logged on your device. You can retry, or contact support if the problem keeps happening.
          </p>
          <p style={{ fontSize: 11, fontFamily: mono, color: '#484f58', marginBottom: 20 }}>
            Reference: {this.state.digest}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.reset}
              style={{
                padding: '8px 16px', fontSize: 12, fontFamily: mono, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 0.5,
                background: '#388bfd', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              style={{
                padding: '8px 16px', fontSize: 12, fontFamily: mono, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 0.5,
                background: 'transparent', color: '#c9d1d9',
                border: '1px solid #30363d', cursor: 'pointer',
              }}
            >
              Reload
            </button>
            <a
              href="mailto:support@termimal.com"
              style={{
                padding: '8px 16px', fontSize: 12, fontFamily: mono, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 0.5,
                background: 'transparent', color: '#c9d1d9',
                border: '1px solid #30363d', textDecoration: 'none',
              }}
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
