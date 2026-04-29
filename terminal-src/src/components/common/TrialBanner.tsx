// components/common/TrialBanner.tsx — top-of-Dashboard "Try Pro for 14 days"
// for Free users. Dismissible (localStorage flag), reappears in 7 days so a
// user who clicked "later" eventually sees it again.

import { useEffect, useState } from 'react'
import { usePlan, PLAN_PRICES, PLAN_CURRENCY } from '@/lib/plan'

const STORAGE_KEY = 'termimal:trial-banner:hidden-until'
const SNOOZE_DAYS = 7
const mono = "'SF Mono', Menlo, Consolas, monospace"

const MARKETING_URL =
  (import.meta as any).env?.VITE_MARKETING_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')

export function TrialBanner() {
  const { plan, loading } = usePlan()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (loading || plan !== 'free') { setVisible(false); return }
    const hiddenUntil = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    setVisible(Date.now() > hiddenUntil)
  }, [plan, loading])

  if (!visible) return null

  const dismiss = () => {
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000
    try { localStorage.setItem(STORAGE_KEY, String(until)) } catch {}
    setVisible(false)
  }

  return (
    <div
      role="region"
      aria-label="Upgrade promotion"
      style={{
        background: '#0e1117',
        borderBottom: '1px solid #21262d',
        borderTop: '1px solid #21262d',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: mono,
        fontSize: 10,
        color: '#c9d1d9',
        flexWrap: 'wrap',
      }}
    >
      <span aria-hidden style={{ color: '#388bfd', fontWeight: 700 }}>·</span>
      <span style={{ flex: 1, minWidth: 240 }}>
        <span style={{ fontWeight: 600, color: '#f0f6fc' }}>Termimal {PLAN_PRICES.pro.label} — the professional baseline.</span>
        <span style={{ color: '#8b949e', marginLeft: 8 }}>
          Risk engine, COT, advanced charts &amp; screener, scenario planner, macro intelligence. {PLAN_CURRENCY}{PLAN_PRICES.pro.monthly.toFixed(2)}/mo. 14-day trial.
        </span>
      </span>
      <a
        href={`${MARKETING_URL}/pricing?from=terminal-banner&plan=pro`}
        target="_top"
        rel="noopener"
        style={{
          padding: '4px 12px',
          fontSize: 10, fontWeight: 700, fontFamily: mono,
          background: '#388bfd', color: '#fff',
          textDecoration: 'none',
          letterSpacing: 0.4, textTransform: 'uppercase',
        }}
      >
        Start trial →
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss for 7 days"
        style={{ background: 'transparent', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
      >
        ×
      </button>
    </div>
  )
}

export default TrialBanner
