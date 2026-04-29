// components/common/OnboardingTour.tsx
// Three-step first-run tour for new authenticated users:
//   1. Regime banner (Dashboard)
//   2. Watchlist (right sidebar)
//   3. Polymarket signal workflow
// Dismissed via localStorage flag so it never re-shows.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'termimal:onboarding:dismissed:v1'
const mono = "'SF Mono', Menlo, Consolas, monospace"

interface Step {
  title: string
  body: string
  cta: { label: string; route?: string }
}

const STEPS: Step[] = [
  {
    title: 'Step 1 · Read the regime banner',
    body: 'The top of the Dashboard shows Termimal\'s regime label — RISK-ON, NEUTRAL, or RISK-OFF — derived from VIX, the 10Y-2Y spread, HY OAS, breadth, dollar, and credit. Tap the "How the regime label is computed" expander to see the rule and the live drivers.',
    cta: { label: 'Show me the Dashboard', route: '/' },
  },
  {
    title: 'Step 2 · Build your watchlist',
    body: 'The right sidebar is your watchlist. Add symbols by typing in the search box — equities, FX, futures, crypto. Click a symbol to open its workspace with charts, fundamentals, news, and COT positioning side-by-side.',
    cta: { label: 'Open New Tab', route: '/newtab' },
  },
  {
    title: 'Step 3 · Run a Polymarket scan',
    body: 'Polymarket Intelligence pulls live prediction-market data, ranks wallets by accuracy, and flags anomalies. Open the page and click RUN DEEP SCAN to surface STRONG and WEAK signals. The methodology behind every score is one click away.',
    cta: { label: 'Open Polymarket', route: '/polymarket' },
  },
]

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(STORAGE_KEY) === '1') return
    if (localStorage.getItem('ft-auth') !== 'true') return
    // Defer slightly so the dashboard finishes its first paint
    const id = window.setTimeout(() => setVisible(true), 600)
    return () => window.clearTimeout(id)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try { window.localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const onCta = () => {
    if (current.cta.route) navigate(current.cta.route)
    if (isLast) dismiss()
    else setStep(s => s + 1)
  }

  return (
    <div
      role="dialog"
      aria-label="First-run tour"
      style={{
        position: 'fixed',
        bottom: 36,
        right: 16,
        zIndex: 9999,
        width: 360,
        background: '#161b22',
        border: '1px solid #34d39944',
        boxShadow: '0 12px 40px #00000060',
        fontFamily: mono,
        color: '#c9d1d9',
      }}
    >
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: '#34d399', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            Welcome to Termimal · Step {step + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss tour"
            style={{ background: 'transparent', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 12, padding: 0, marginLeft: 8 }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: '#c9d1d9', marginBottom: 6 }}>{current.title}</div>
        <p style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.6, margin: 0, marginBottom: 12 }}>{current.body}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                aria-hidden
                style={{ width: 18, height: 2, background: i <= step ? '#34d399' : '#21262d' }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                style={{
                  padding: '5px 10px', fontSize: 10, fontFamily: mono,
                  background: 'transparent', color: '#8b949e',
                  border: '1px solid #30363d', cursor: 'pointer',
                }}
              >
                BACK
              </button>
            )}
            <button
              type="button"
              onClick={onCta}
              style={{
                padding: '5px 12px', fontSize: 10, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5,
                background: '#34d399', color: '#fff',
                border: 'none', cursor: 'pointer',
              }}
            >
              {isLast ? 'FINISH' : `${current.cta.label.toUpperCase()} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTour
