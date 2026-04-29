// components/common/CookieConsent.tsx
// CNIL-style opt-in banner: Strict / Functional / Analytics / Marketing.
// Persisted in localStorage as termimal:cookies:v1.
// Honours the GPC signal by defaulting analytics + marketing OFF.
// Re-openable via openCookiePreferences() — wire from any "Cookie preferences"
// link in the footer.

import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'termimal:cookies:v1'
const OPEN_EVENT  = 'termimal:cookies:open'
const CHANGE_EVT  = 'termimal:cookies:changed'
const mono = "'SF Mono', Menlo, Consolas, monospace"

export interface CookieConsent {
  necessary: true
  functional: boolean
  analytics: boolean
  marketing: boolean
  decidedAt: string
}

const DEFAULT: CookieConsent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  decidedAt: '',
}

function read(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return { ...DEFAULT, ...parsed, necessary: true } as CookieConsent
  } catch {
    return null
  }
}

function write(c: CookieConsent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
    window.dispatchEvent(new CustomEvent(CHANGE_EVT, { detail: c }))
  } catch {}
}

export function openCookiePreferences() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function useCookieConsent(): CookieConsent {
  const [c, setC] = useState<CookieConsent>(() => read() ?? DEFAULT)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsent>).detail
      if (detail) setC(detail)
    }
    window.addEventListener(CHANGE_EVT, handler as EventListener)
    return () => window.removeEventListener(CHANGE_EVT, handler as EventListener)
  }, [])
  return c
}

function Toggle({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '8px 10px',
        background: '#0e1117',
        border: '1px solid #21262d',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: '#34d399' }}
        aria-label={label}
      />
      <span>
        <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#c9d1d9', marginBottom: 2 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 10, color: '#8b949e', lineHeight: 1.4 }}>{desc}</span>
      </span>
    </label>
  )
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [functional, setFunctional] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const existing = read()
    if (!existing) {
      setVisible(true)
    } else {
      setFunctional(existing.functional)
      setAnalytics(existing.analytics)
      setMarketing(existing.marketing)
    }

    if (typeof navigator !== 'undefined' && (navigator as any).globalPrivacyControl === true) {
      setAnalytics(false)
      setMarketing(false)
    }

    const onOpen = () => {
      const cur = read()
      if (cur) {
        setFunctional(cur.functional)
        setAnalytics(cur.analytics)
        setMarketing(cur.marketing)
      }
      setShowDetails(true)
      setVisible(true)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  const save = useCallback((c: Omit<CookieConsent, 'necessary' | 'decidedAt'>) => {
    write({ ...c, necessary: true, decidedAt: new Date().toISOString() })
    setVisible(false)
    setShowDetails(false)
  }, [])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          maxWidth: 720,
          width: '100%',
          background: '#161b22',
          border: '1px solid #30363d',
          fontFamily: mono,
          color: '#c9d1d9',
          boxShadow: '0 12px 40px #00000060',
        }}
      >
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <span aria-hidden style={{ color: '#34d399', fontSize: 14, fontWeight: 700 }}>i</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#c9d1d9', marginBottom: 4 }}>
                Termimal uses cookies
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#8b949e', lineHeight: 1.6 }}>
                Strictly necessary cookies keep you signed in and the platform secure — they cannot be turned off.
                Functional, analytics, and marketing cookies are optional. You can change your choice at any time
                from the footer. See our <a href="/cookies" style={{ color: '#34d399' }}>Cookie Policy</a> and {' '}
                <a href="/privacy" style={{ color: '#34d399' }}>Privacy Policy</a>.
              </p>
            </div>
          </div>

          {showDetails && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <Toggle
                label="Strictly necessary"
                desc="Authentication, session security. Always on."
                checked
                disabled
                onChange={() => {}}
              />
              <Toggle
                label="Functional"
                desc="Theme, layout, watchlist preferences."
                checked={functional}
                onChange={setFunctional}
              />
              <Toggle
                label="Analytics"
                desc="Aggregate usage and performance metrics."
                checked={analytics}
                onChange={setAnalytics}
              />
              <Toggle
                label="Marketing"
                desc="Conversion attribution and audience measurement."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
            {!showDetails && (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                style={{
                  padding: '6px 12px', fontSize: 10, fontFamily: mono,
                  background: 'transparent', color: '#8b949e',
                  border: '1px solid transparent', cursor: 'pointer',
                }}
              >
                CUSTOMIZE
              </button>
            )}
            <button
              type="button"
              onClick={() => save({ functional: false, analytics: false, marketing: false })}
              style={{
                padding: '6px 12px', fontSize: 10, fontFamily: mono,
                background: 'transparent', color: '#c9d1d9',
                border: '1px solid #30363d', cursor: 'pointer',
              }}
            >
              REJECT ALL
            </button>
            {showDetails ? (
              <button
                type="button"
                onClick={() => save({ functional, analytics, marketing })}
                style={{
                  padding: '6px 14px', fontSize: 10, fontFamily: mono, fontWeight: 600,
                  background: '#34d399', color: '#fff',
                  border: 'none', cursor: 'pointer',
                }}
              >
                SAVE SELECTION
              </button>
            ) : (
              <button
                type="button"
                onClick={() => save({ functional: true, analytics: true, marketing: true })}
                style={{
                  padding: '6px 14px', fontSize: 10, fontFamily: mono, fontWeight: 600,
                  background: '#34d399', color: '#fff',
                  border: 'none', cursor: 'pointer',
                }}
              >
                ACCEPT ALL
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CookieConsentBanner
