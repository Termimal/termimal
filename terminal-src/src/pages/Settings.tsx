// pages/Settings.tsx — API key configuration + data source status
// Security model: keys live in localStorage (until backend auth lands).
// Hardening on top of that:
//   - Stored keys are NEVER loaded into the visible input on mount.
//     A tiny preview (••••••••••last4) is shown instead.
//   - Reveal requires an explicit click and auto-hides after 30s.
//   - Copy-to-clipboard does not require a reveal.
//   - Inputs disable autocomplete, spellcheck, and password-manager picking
//     so credentials never end up in the browser's autofill store.
//   - Clear requires a confirmation step.
import { useEffect, useRef, useState } from 'react'

interface ApiKey { id: string; name: string; url: string; free: boolean; desc: string; placeholder: string; docs: string }

const API_KEYS: ApiKey[] = [
  {
    id:          'fred',
    name:        'FRED (Federal Reserve)',
    url:         'https://fred.stlouisfed.org',
    free:        true,
    desc:        'US10Y, US2Y, US3M, Spread, M2, Fed Funds Rate, Inflation (CPI/PCE). US government source.',
    placeholder: 'abcdef1234567890abcdef1234567890',
    docs:        'https://fred.stlouisfed.org/docs/api/api_key.html',
  },
  {
    id:          'alphavantage',
    name:        'Alpha Vantage',
    url:         'https://www.alphavantage.co',
    free:        true,
    desc:        'Real-time stock prices, OHLCV history, earnings, EPS, fundamentals (income / balance sheet / cash flow).',
    placeholder: 'XXXXXXXXXXXXXXXX',
    docs:        'https://www.alphavantage.co/support/#api-key',
  },
  {
    id:          'polygon',
    name:        'Polygon.io',
    url:         'https://polygon.io',
    free:        true,
    desc:        'Real-time prices, options, forex, crypto. Free tier: 5 req/min. Recommended for stock prices.',
    placeholder: 'aBcDeFgHiJkLmNoPqRsTuVwX',
    docs:        'https://polygon.io/docs/getting-started',
  },
  {
    id:          'quandl',
    name:        'Nasdaq Data Link (Quandl)',
    url:         'https://data.nasdaq.com',
    free:        true,
    desc:        'HYG, LQD, HY OAS spread, commodities. Many free macro series.',
    placeholder: 'xxxxxxxxxxxxxxxxxxxx',
    docs:        'https://docs.data.nasdaq.com/docs/getting-started',
  },
  {
    id:          'fmp',
    name:        'Financial Modeling Prep (FMP)',
    url:         'https://financialmodelingprep.com',
    free:        true,
    desc:        'Fundamentals: income statement, balance sheet, ratios (ROIC, EV/EBITDA, FCF, margins). Free: 250 req/day.',
    placeholder: 'your_fmp_api_key',
    docs:        'https://site.financialmodelingprep.com/developer/docs',
  },
  {
    id:          'twelvedata',
    name:        'Twelve Data',
    url:         'https://twelvedata.com',
    free:        true,
    desc:        'Real-time + historical prices for stocks, ETF, forex, crypto. Free tier: 800 req/day.',
    placeholder: 'your_twelve_data_key',
    docs:        'https://twelvedata.com/docs',
  },
]

// Data source map — what uses what
const SOURCE_MAP = [
  { metric: 'US 10Y / 2Y / 3M Yield',    source: 'FRED',             freq: 'Daily',    key: 'fred',          series: 'GS10, GS2, TB3MS' },
  { metric: '10Y–2Y Spread',              source: 'FRED (computed)',  freq: 'Daily',    key: 'fred',          series: 'T10Y2Y' },
  { metric: 'M2 Money Supply',            source: 'FRED',             freq: 'Weekly',   key: 'fred',          series: 'M2SL' },
  { metric: 'Fed Funds Rate',             source: 'FRED',             freq: 'Daily',    key: 'fred',          series: 'FEDFUNDS' },
  { metric: 'VIX',                        source: 'Yahoo Finance',    freq: 'Real-time', key: 'none',         series: '^VIX (free)' },
  { metric: 'DXY Dollar Index',           source: 'Yahoo Finance',    freq: 'Real-time', key: 'none',         series: 'DX-Y.NYB (free)' },
  { metric: 'WTI / Brent Oil',            source: 'Yahoo Finance',    freq: 'Real-time', key: 'none',         series: 'CL=F / BZ=F (free)' },
  { metric: 'HYG / LQD ETF Ratio',        source: 'Polygon.io',       freq: 'Real-time', key: 'polygon',      series: 'HYG, LQD' },
  { metric: 'HY OAS Spread',              source: 'FRED',             freq: 'Daily',    key: 'fred',          series: 'BAMLH0A0HYM2' },
  { metric: 'RSP / SPY Ratio',            source: 'Polygon / YF',     freq: 'Real-time', key: 'polygon',      series: 'RSP, SPY' },
  { metric: 'Stock prices (OHLCV)',       source: 'Polygon / TwelveData', freq: 'Real-time', key: 'polygon',  series: 'Ticker symbol' },
  { metric: 'Fundamentals (FCF, EBITDA)', source: 'FMP / Alpha Vantage', freq: 'Quarterly', key: 'fmp',       series: 'Income + Cash Flow' },
  { metric: 'EV, Ratios (ROIC, EV/EBITDA)',source:'FMP',             freq: 'Quarterly',  key: 'fmp',         series: 'key-metrics endpoint' },
  { metric: 'COT Report',                 source: 'CFTC.gov',         freq: 'Friday 15:30 UTC', key: 'none', series: 'Free direct' },
]

const REVEAL_TIMEOUT_MS = 30_000

function maskKey(value: string): string {
  if (!value) return ''
  if (value.length <= 6) return '•'.repeat(value.length)
  return '•'.repeat(Math.max(8, value.length - 4)) + value.slice(-4)
}

export function Settings() {
  // Two separate state shapes:
  //  - storedMasks: rendered placeholder showing "••••••••cdef" if a key is saved
  //  - draft:       transient input value during editing (cleared on save / blur-without-edit)
  const [storedMasks, setStoredMasks] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [revealId, setRevealId] = useState<string | null>(null)
  const [revealValue, setRevealValue] = useState('')
  const [confirmClear, setConfirmClear] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const revealTimerRef = useRef<number | null>(null)

  // Load preview only — never the raw value — on mount.
  useEffect(() => {
    const masks: Record<string, string> = {}
    API_KEYS.forEach(k => {
      const v = localStorage.getItem(`apikey_${k.id}`)
      if (v) masks[k.id] = maskKey(v)
    })
    setStoredMasks(masks)
  }, [])

  function saveKey(id: string) {
    const v = (draft[id] ?? '').trim()
    if (!v) return
    localStorage.setItem(`apikey_${id}`, v)
    setStoredMasks(s => ({ ...s, [id]: maskKey(v) }))
    setDraft(d => { const n = { ...d }; delete n[id]; return n })
    setEditingId(null)
    setSaved(s => ({ ...s, [id]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2000)
  }

  function clearKey(id: string) {
    localStorage.removeItem(`apikey_${id}`)
    setStoredMasks(s => { const n = { ...s }; delete n[id]; return n })
    setConfirmClear(null)
    if (revealId === id) hideReveal()
  }

  function startEdit(id: string) {
    setEditingId(id)
    setDraft(d => ({ ...d, [id]: '' }))
  }

  function cancelEdit(id: string) {
    setEditingId(null)
    setDraft(d => { const n = { ...d }; delete n[id]; return n })
  }

  function hideReveal() {
    if (revealTimerRef.current) {
      window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
    setRevealId(null)
    setRevealValue('')
  }

  function reveal(id: string) {
    const v = localStorage.getItem(`apikey_${id}`) ?? ''
    if (!v) return
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current)
    setRevealId(id)
    setRevealValue(v)
    revealTimerRef.current = window.setTimeout(hideReveal, REVEAL_TIMEOUT_MS)
  }

  async function copy(id: string) {
    const v = localStorage.getItem(`apikey_${id}`) ?? ''
    if (!v) return
    try {
      await navigator.clipboard.writeText(v)
      setCopied(id)
      setTimeout(() => setCopied(c => (c === id ? null : c)), 1500)
    } catch {
      // Fallback: do a tiny invisible textarea copy
      const ta = document.createElement('textarea')
      ta.value = v
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      ta.remove()
      setCopied(id)
      setTimeout(() => setCopied(c => (c === id ? null : c)), 1500)
    }
  }

  // Hide any visible reveal when the tab loses focus.
  useEffect(() => {
    const onVis = () => { if (document.hidden) hideReveal() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const hasKey = (id: string) => !!storedMasks[id]

  return (
    <div style={{ background: '#0e1117', minHeight: '100%', padding: '16px 18px', color: '#c9d1d9' }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#388bfd', letterSpacing: '0.12em', marginBottom: 4 }}>
          ⚙ API CONFIGURATION
        </div>
        <div style={{ fontSize: 9, color: '#8b949e', lineHeight: 1.7 }}>
          Keys are stored locally in your browser (localStorage) — never transmitted to a server.<br />
          The terminal runs in <span style={{ color: '#d29922' }}>SIM</span> mode without keys. With keys, real data is used.
        </div>
      </div>

      {/* Security info */}
      <div style={{ padding: '10px 14px', background: '#0e1117', border: '1px solid #21262d', borderLeft: '3px solid #d29922', marginBottom: 16, fontSize: 9, color: '#8b949e', lineHeight: 1.8 }}>
        <span style={{ color: '#d29922', fontWeight: 600 }}>SECURITY NOTE</span><br />
        Keys are masked by default. Reveal auto-hides after 30 seconds and on tab blur. Saved values are never preloaded into the input field. Use the Copy button to copy without revealing. Pasting a key into the input replaces the saved value only after Save.
      </div>

      {/* API Key cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {API_KEYS.map(api => {
          const stored = hasKey(api.id)
          const editing = editingId === api.id
          const isRevealed = revealId === api.id
          const isSaved = saved[api.id]
          const isCopied = copied === api.id
          const inConfirmClear = confirmClear === api.id
          return (
            <div key={api.id} style={{
              background: '#0e1117',
              border: `1px solid ${stored ? '#3fb95033' : '#21262d'}`,
              borderTop: `2px solid ${stored ? '#3fb950' : '#388bfd'}`,
              padding: '14px 16px',
            }}>
              {/* API name + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#ddd' }}>{api.name}</span>
                  {api.free && <span style={{ marginLeft: 8, fontSize: 7, color: '#3fb950', border: '1px solid #3fb95044', padding: '1px 6px' }}>FREE</span>}
                </div>
                <div style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: stored ? '#3fb950' : '#21262d' }} />
                  <span style={{ color: stored ? '#3fb950' : '#8b949e' }}>{stored ? 'CONFIGURED' : 'NOT CONFIGURED'}</span>
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: 8, color: '#8b949e', lineHeight: 1.6, marginBottom: 10 }}>{api.desc}</div>

              {/* Masked preview row (when stored AND not editing) */}
              {stored && !editing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div
                    style={{
                      flex: 1, background: '#161b22', border: '1px solid #222',
                      color: '#c9d1d9', fontSize: 10, padding: '5px 10px',
                      fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                      letterSpacing: 0.5,
                      userSelect: isRevealed ? 'text' : 'none',
                    }}
                    aria-label={`Saved ${api.name} key`}
                  >
                    {isRevealed ? revealValue : storedMasks[api.id]}
                  </div>
                  {isRevealed ? (
                    <button onClick={hideReveal}
                      title="Hide key"
                      style={{ padding: '5px 10px', fontSize: 9, background: 'transparent', border: '1px solid #222', color: '#8b949e', cursor: 'pointer' }}>
                      Hide
                    </button>
                  ) : (
                    <button onClick={() => reveal(api.id)}
                      title="Reveal saved key (auto-hides in 30s)"
                      style={{ padding: '5px 10px', fontSize: 9, background: 'transparent', border: '1px solid #222', color: '#8b949e', cursor: 'pointer' }}>
                      Reveal
                    </button>
                  )}
                  <button onClick={() => copy(api.id)}
                    title="Copy without revealing"
                    style={{ padding: '5px 10px', fontSize: 9, background: 'transparent', border: '1px solid #222', color: isCopied ? '#3fb950' : '#8b949e', cursor: 'pointer' }}>
                    {isCopied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={() => startEdit(api.id)}
                    title="Replace saved key"
                    style={{ padding: '5px 12px', fontSize: 9, background: '#388bfd18', border: '1px solid #388bfd44', color: '#388bfd', cursor: 'pointer' }}>
                    Replace
                  </button>
                </div>
              )}

              {/* Edit / first-time entry row */}
              {(editing || !stored) && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    name={`apikey-${api.id}-${Math.random().toString(36).slice(2)}`}
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    value={draft[api.id] ?? ''}
                    onChange={e => setDraft(d => ({ ...d, [api.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveKey(api.id)
                      if (e.key === 'Escape') cancelEdit(api.id)
                    }}
                    placeholder={api.placeholder}
                    style={{
                      flex: 1, background: '#161b22', border: '1px solid #222',
                      color: '#c9d1d9', fontSize: 9, padding: '5px 10px', outline: 'none',
                      fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                    }}
                  />
                  <button onClick={() => saveKey(api.id)}
                    style={{ padding: '5px 14px', fontSize: 9, background: isSaved ? '#3fb95020' : '#388bfd18', border: `1px solid ${isSaved ? '#3fb95055' : '#388bfd44'}`, color: isSaved ? '#3fb950' : '#388bfd', cursor: 'pointer' }}>
                    {isSaved ? '▲ SAVED' : 'SAVE'}
                  </button>
                  {editing && (
                    <button onClick={() => cancelEdit(api.id)}
                      style={{ padding: '5px 10px', fontSize: 9, background: 'transparent', border: '1px solid #222', color: '#8b949e', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {/* Clear / docs row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 7.5, color: '#8b949e' }}>
                  Get a free key: <a href={api.docs} target="_blank" rel="noreferrer noopener"
                    style={{ color: '#388bfd', textDecoration: 'none' }}>{api.url}</a>
                </div>
                {stored && !editing && (
                  inConfirmClear ? (
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => clearKey(api.id)}
                        style={{ padding: '3px 8px', fontSize: 8, background: '#f8514920', border: '1px solid #f8514955', color: '#f85149', cursor: 'pointer' }}>
                        Confirm delete
                      </button>
                      <button onClick={() => setConfirmClear(null)}
                        style={{ padding: '3px 8px', fontSize: 8, background: 'transparent', border: '1px solid #222', color: '#8b949e', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmClear(api.id)}
                      style={{ padding: '3px 8px', fontSize: 8, background: 'transparent', border: '1px solid #f8514933', color: '#f85149', cursor: 'pointer' }}>
                      Delete key
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Data source map table */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#388bfd', letterSpacing: 0.6, marginBottom: 10 }}>
          DATA SOURCE MAP — METRIC → SOURCE → FREQUENCY → REQUIRED KEY
        </div>
        <div style={{ border: '1px solid #21262d', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 160px 120px 100px 1fr', gap: 0, background: '#0e1117', borderBottom: '1px solid #21262d', padding: '6px 12px' }}>
            {['Metric', 'Source', 'Frequency', 'API Key', 'Series / Notes'].map(h => (
              <span key={h} style={{ fontSize: 8, color: '#8b949e', letterSpacing: 0.4 }}>{h}</span>
            ))}
          </div>
          {SOURCE_MAP.map((row, i) => {
            const configured = row.key === 'none' || hasKey(row.key)
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '220px 160px 120px 100px 1fr',
                gap: 0, padding: '7px 12px',
                background: '#0e1117',
                borderBottom: '1px solid #161b22',
              }}>
                <span style={{ fontSize: 9, color: '#aaa' }}>{row.metric}</span>
                <span style={{ fontSize: 9, color: '#8b949e' }}>{row.source}</span>
                <span style={{ fontSize: 9, color: '#8b949e' }}>{row.freq}</span>
                <span style={{ fontSize: 8 }}>
                  {row.key === 'none'
                    ? <span style={{ color: '#3fb950' }}>FREE</span>
                    : <span style={{ color: configured ? '#3fb950' : '#f85149' }}>
                        {row.key.toUpperCase()} {configured ? '▲' : '— missing'}
                      </span>
                  }
                </span>
                <span style={{ fontSize: 8, color: '#8b949e' }}>{row.series}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '12px 16px', background: '#0e1117', border: '1px solid #21262d', fontSize: 9, color: '#8b949e', lineHeight: 1.8 }}>
        <div style={{ color: '#388bfd', fontWeight: 600, marginBottom: 8 }}>HOW IT WORKS</div>
        <div>1. You save your keys here (stored in your browser, never transmitted).</div>
        <div>2. The Python backend reads them from the local config endpoint.</div>
        <div>3. Hourly / daily jobs fetch real data and cache it.</div>
        <div>4. The frontend shows <span style={{ color: '#3fb950' }}>LIVE</span> instead of <span style={{ color: '#d29922' }}>SIM</span>.</div>
      </div>

      <div style={{ marginTop: 10, fontSize: 7, color: '#21262d', display: 'flex', justifyContent: 'space-between' }}>
        <span>Keys stored in browser localStorage · Never sent to an external server</span>
        <span>Reveal auto-hides after 30s · Tab-blur wipes reveal</span>
      </div>

      {/* Account — managed on the marketing site, not in the terminal */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#0e1117', border: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 2 }}>Account</div>
          <div style={{ fontSize: 10, color: '#484f58' }}>Profile, billing, and security on the main site</div>
        </div>
        <a href="/" target="_top" rel="noopener" style={{ fontSize: 10, padding: '5px 12px', background: 'transparent', color: '#388bfd', border: '1px solid #21262d', textDecoration: 'none' }}>
          Open termimal.com
        </a>
      </div>
    </div>
  )
}
