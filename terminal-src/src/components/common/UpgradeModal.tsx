// components/common/UpgradeModal.tsx — institutional upgrade popup.
// Used by usage-cap nudges (createAlert, addWatchlistSymbol, etc.) and by
// PaywallGate (full-page lock for higher-tier modules).
//
// Style spec: dark terminal UI, sharp typography, aligned columns, no
// gradients, no glow, no consumer-fintech bright colors. Lock + check
// icons only. Numbers as ∞ (never the word "Unlimited").

import { useEffect, useRef } from 'react'
import { PLAN_PRICES, PLAN_CURRENCY, PLAN_LIMITS, formatLimit, type Plan } from '@/lib/plan'

const mono = "'SF Mono', Menlo, Consolas, monospace"

// Marketing-site origin for the "Upgrade" button.
const MARKETING_URL =
  (import.meta as any).env?.VITE_MARKETING_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')

interface FeatureRow {
  label: string
  free: boolean | string  // string = numeric cap rendered as-is
  pro: boolean | string
  premium: boolean | string
}

// Feature comparison table — same rows as the marketing /pricing page.
const FEATURE_TABLE: FeatureRow[] = [
  // Free baseline
  { label: 'Dashboard',                   free: true,  pro: true,  premium: true  },
  { label: 'Ticker workspace',            free: true,  pro: true,  premium: true  },
  { label: 'Charts (basic)',              free: true,  pro: true,  premium: true  },
  { label: 'Screener (basic)',            free: true,  pro: true,  premium: true  },
  { label: 'Global indicators',           free: 'Limited', pro: 'Full', premium: 'Full' },
  { label: 'News flow',                   free: 'Limited', pro: 'Full', premium: 'Full' },
  { label: 'Portfolio',                   free: 'Basic',   pro: 'Full', premium: 'Full' },

  // Pro
  { label: 'Charts (advanced)',           free: false, pro: true,  premium: true  },
  { label: 'Screener (advanced filters)', free: false, pro: true,  premium: true  },
  { label: 'Risk engine',                 free: false, pro: true,  premium: true  },
  { label: 'COT report',                  free: false, pro: true,  premium: true  },
  { label: 'Scenario planner',            free: false, pro: true,  premium: true  },
  { label: 'Macro intelligence',          free: false, pro: true,  premium: true  },
  { label: 'Desktop app',                 free: false, pro: true,  premium: true  },

  // Premium (intelligence layer — moat)
  { label: 'Event probabilities',         free: false, pro: false, premium: true  },
  { label: 'On-chain analytics',          free: false, pro: false, premium: true  },
  { label: 'Sentiment / anomaly detector', free: false, pro: false, premium: true },
  { label: 'AI weekly briefing',          free: false, pro: false, premium: true  },
  { label: 'Sovereign intelligence',      free: false, pro: false, premium: true  },
  { label: 'API access',                  free: false, pro: false, premium: true  },
  { label: 'Priority support',            free: false, pro: false, premium: true  },
]

// Limits row — rendered numerically with ∞.
const LIMITS_ROWS: { label: string; key: keyof typeof PLAN_LIMITS.free }[] = [
  { label: 'Watchlist symbols', key: 'watchlistSymbols' },
  { label: 'Saved workspaces',  key: 'savedWorkspaces'  },
  { label: 'Alerts',            key: 'alerts'           },
]

export interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  /** Plan the user must reach. Defaults to 'pro'. */
  requiredPlan?: Plan
  /** Plain-language reason shown below the title. */
  reason?: string
  /** Optional title override. */
  title?: string
}

function Cell({ value, accent }: { value: boolean | string; accent: boolean }) {
  if (typeof value === 'string') {
    return <span style={{ color: accent ? '#c9d1d9' : '#8b949e', fontFamily: mono, fontSize: 10 }}>{value}</span>
  }
  if (value) {
    return <span aria-label="Included" title="Included" style={{ color: accent ? '#388bfd' : '#3fb950', fontFamily: mono, fontWeight: 600 }}>✓</span>
  }
  return <span aria-label="Locked" title="Locked" style={{ color: '#30363d', fontFamily: mono }}>✕</span>
}

export function UpgradeModal({
  open,
  onClose,
  requiredPlan = 'pro',
  reason,
  title,
}: UpgradeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while open + Esc to close + restore focus
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // Auto-focus the first focusable element in the dialog when it opens
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])')?.focus()
    }, 0)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(focusTimer)
      try { previouslyFocused?.focus?.() } catch {}
    }
  }, [open, onClose])

  if (!open) return null

  const recommended = requiredPlan === 'premium' ? 'premium' : 'pro'
  const recPrice = PLAN_PRICES[recommended]
  const upgradeHref = `${MARKETING_URL}/pricing?from=terminal&plan=${recommended}`

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.70)',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(820px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#0e1117',
          border: '1px solid #21262d',
          fontFamily: mono,
          color: '#c9d1d9',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#8b949e', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }}>
              Upgrade required · {recPrice.label}
            </div>
            <div id="upgrade-modal-title" style={{ fontSize: 16, fontWeight: 600, color: '#f0f6fc', letterSpacing: -0.2 }}>
              {title ?? `Unlock ${recPrice.label} features`}
            </div>
            {reason && (
              <p style={{ marginTop: 8, fontSize: 11, lineHeight: 1.6, color: '#8b949e', maxWidth: 580 }}>{reason}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: '#484f58', fontSize: 16, cursor: 'pointer', padding: 4, fontFamily: mono }}
          >
            ✕
          </button>
        </div>

        {/* Plan column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
          padding: '14px 24px',
          borderBottom: '1px solid #21262d',
          alignItems: 'baseline',
          gap: 0,
        }}>
          <div />
          {(['free', 'pro', 'premium'] as Plan[]).map(p => {
            const price = PLAN_PRICES[p]
            const isRec = p === recommended
            return (
              <div key={p} style={{ textAlign: 'center', padding: '0 8px' }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                  color: isRec ? '#388bfd' : '#8b949e',
                  marginBottom: 4,
                }}>
                  {price.label}{isRec && <span style={{ marginLeft: 6, color: '#388bfd', fontSize: 8 }}>· RECOMMENDED</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f6fc', fontFamily: mono }}>
                  {price.monthly === 0 ? `${PLAN_CURRENCY}0` : `${PLAN_CURRENCY}${price.yearly.toFixed(2)}`}
                  {price.monthly > 0 && <span style={{ fontSize: 9, color: '#484f58', fontWeight: 400, marginLeft: 4 }}>/mo</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Limits */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #21262d' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#484f58', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 }}>
            Limits
          </div>
          {LIMITS_ROWS.map(r => (
            <div key={r.key} style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
              padding: '5px 0',
              fontSize: 10,
              alignItems: 'center',
            }}>
              <div style={{ color: '#8b949e' }}>{r.label}</div>
              {(['free', 'pro', 'premium'] as Plan[]).map(p => (
                <div key={p} style={{ textAlign: 'center', color: p === recommended ? '#c9d1d9' : '#8b949e', fontFamily: mono, fontWeight: p === recommended ? 600 : 400 }}>
                  {formatLimit(PLAN_LIMITS[p][r.key])}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Feature comparison */}
        <div style={{ padding: '12px 24px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#484f58', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 }}>
            Features
          </div>
          {FEATURE_TABLE.map((row, i) => (
            <div key={row.label} style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
              padding: '6px 0',
              fontSize: 10,
              alignItems: 'center',
              borderBottom: i < FEATURE_TABLE.length - 1 ? '1px solid #161b22' : 'none',
            }}>
              <div style={{ color: '#c9d1d9' }}>{row.label}</div>
              <div style={{ textAlign: 'center' }}><Cell value={row.free}    accent={false}                          /></div>
              <div style={{ textAlign: 'center' }}><Cell value={row.pro}     accent={recommended === 'pro'}          /></div>
              <div style={{ textAlign: 'center' }}><Cell value={row.premium} accent={recommended === 'premium'}      /></div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '18px 24px', borderTop: '1px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 9, color: '#484f58', letterSpacing: 0.4 }}>
            14-day trial · Cancel anytime · No charge until trial ends
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 14px', fontSize: 10, background: 'transparent', color: '#8b949e', border: '1px solid #21262d', cursor: 'pointer', fontFamily: mono, letterSpacing: 0.5, textTransform: 'uppercase' }}
            >
              Maybe later
            </button>
            <a
              href={upgradeHref}
              target="_top"
              rel="noopener"
              style={{ padding: '8px 18px', fontSize: 10, fontWeight: 700, background: '#388bfd', color: '#fff', textDecoration: 'none', fontFamily: mono, letterSpacing: 0.5, textTransform: 'uppercase' }}
            >
              Upgrade to {recPrice.label}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpgradeModal
