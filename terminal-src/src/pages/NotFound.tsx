// pages/NotFound.tsx — branded 404 for any unmatched public route.
// (Authenticated users hitting an unknown route inside the terminal still
//  fall through to <Dashboard /> per App.tsx, by design.)

import { Link } from 'react-router-dom'

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const mono = "'SF Mono', Menlo, Consolas, monospace"

export function NotFoundPage() {
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
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: mono, fontSize: 11, fontWeight: 700,
            letterSpacing: 3, textTransform: 'uppercase', color: '#388bfd',
            marginBottom: 12,
          }}
        >
          404 · Page not found
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0, marginBottom: 12 }}>
          We couldn&apos;t find that page.
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#8b949e', marginBottom: 20 }}>
          The link you followed may be broken, or the page may have moved. Try one of these instead.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              padding: '8px 16px', fontSize: 12, fontFamily: mono, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.5,
              background: '#388bfd', color: '#fff', textDecoration: 'none',
            }}
          >
            Open terminal
          </Link>
          <a
            href="/"
            target="_top"
            rel="noopener"
            style={{
              padding: '8px 16px', fontSize: 12, fontFamily: mono, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.5,
              background: 'transparent', color: '#c9d1d9', textDecoration: 'none',
              border: '1px solid #30363d',
            }}
          >
            Back to site
          </a>
          <a
            href="/support"
            target="_top"
            rel="noopener"
            style={{
              padding: '8px 16px', fontSize: 12, fontFamily: mono, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.5,
              background: 'transparent', color: '#c9d1d9', textDecoration: 'none',
              border: '1px solid #30363d',
            }}
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
