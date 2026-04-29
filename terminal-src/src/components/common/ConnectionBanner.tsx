// components/common/ConnectionBanner.tsx — appears across the top of every
// page once the API has failed at least 3 health checks. Tells the user
// what's happening so they aren't staring at "Connecting…" forever.

import { useStore } from '@/store/useStore'

export function ConnectionBanner() {
  const apiOnline = useStore(s => s.apiOnline)
  const failed    = useStore((s: any) => s.apiFailedChecks ?? 0)

  if (apiOnline) return null
  if (failed < 3) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'rgba(248,81,73,0.08)',
        borderBottom: '1px solid rgba(248,81,73,0.30)',
        color: '#c9d1d9',
        padding: '6px 14px',
        fontFamily: "'SF Mono', Menlo, Consolas, monospace",
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <span aria-hidden style={{ color: '#f85149', fontWeight: 700 }}>▲</span>
      <span style={{ color: '#f85149', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10 }}>
        Backend offline
      </span>
      <span style={{ color: '#8b949e', flex: 1, minWidth: 200 }}>
        We can't reach the data API. Live prices, macro, COT, and Polymarket data won't update until the backend is online.
      </span>
      <button
        type="button"
        onClick={() => useStore.getState().checkApi()}
        style={{
          padding: '4px 12px', fontSize: 10, fontFamily: 'inherit', fontWeight: 700,
          background: '#0e1117', color: '#c9d1d9',
          border: '1px solid #30363d', cursor: 'pointer',
          letterSpacing: 0.5, textTransform: 'uppercase',
        }}
      >
        Retry now
      </button>
    </div>
  )
}

export default ConnectionBanner
