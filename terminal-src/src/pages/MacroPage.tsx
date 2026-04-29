// pages/MacroPage.tsx — TradingView lightweight-charts version
// Data fetching UNCHANGED — only chart rendering replaced
import { useEffect, useState } from 'react'
import { useStore, selectMacro } from '@/store/useStore'
import { TvLineChart } from '@/components/charts/TvLineChart'
import { SovereignPage } from '@/pages/SovereignPage'
import { EventRiskPage } from '@/pages/EventRiskPage'
import { PositioningPage } from '@/pages/PositioningPage'
import { Calendar } from '@/pages/Calendar'
import { DataSource } from '@/components/common/DataSource'
import { PaywallGate } from '@/components/common/PaywallGate'

// ─── Regime band reading ─────────────────────────────────────
function RegimeReading({ label, val, status, col }: { label: string; val: string; status: string; col: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#c9d1d9', fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>{val}</span>
      <span style={{ fontSize: 9, color: col, fontWeight: 500 }}>{status}</span>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────
export function MacroPage() {
  const macro = useStore(selectMacro)
  const refreshMacro = useStore(s => s.refreshMacro)
  const apiOnline = useStore(s => s.apiOnline)
  const [view, setView] = useState<'overview' | 'sovereign' | 'events' | 'positioning' | 'calendar'>('overview')

  // Listen for cross-navigation from COT page
  useEffect(() => {
    const handler = (e: Event) => {
      setView('positioning')
    }
    window.addEventListener('ft-open-positioning', handler)
    // Check if we were navigated to with a positioning target
    if ((window as any).__ftPositioningTarget) {
      setView('positioning')
    }
    return () => window.removeEventListener('ft-open-positioning', handler)
  }, [])

  useEffect(() => { if (!macro) refreshMacro() }, [])

  // Real data arrays from backend (UNCHANGED)
  const us10y_h   = macro?.us10y_h   ?? []
  const us2y_h    = macro?.us2y_h    ?? []
  const us3m_h    = macro?.us3m_h    ?? []
  const vix_h     = macro?.vix_h     ?? []
  const dxy_h     = macro?.dxy_h     ?? []

  // Regional volatileity — calculate 20-day realized vol from index prices
  const calcRealizedVol = (prices: number[]): number[] => {
    if (prices.length < 22) return []
    const vols: number[] = []
    for (let i = 21; i < prices.length; i++) {
      let sumSq = 0
      for (let j = i - 19; j <= i; j++) {
        const ret = Math.log(prices[j] / prices[j - 1])
        sumSq += ret * ret
      }
      vols.push(Math.sqrt(sumSq / 20 * 252) * 100) // annualized, as %
    }
    return vols
  }
  const vstoxx_vol = calcRealizedVol(macro?.vstoxx_h ?? [])
  const nikkei_vol = calcRealizedVol(macro?.nikkei_h ?? [])
  const hsi_vol    = calcRealizedVol(macro?.hsi_h ?? [])

  const [vixRegion, setVixRegion] = useState<'us' | 'eu' | 'jp' | 'cn'>('us')
  const [vixOpen, setVixOpen] = useState(false)
  const vixDataMap = {
    us: { data: vix_h, label: 'VIX (S&P 500)', color: '#d29922' },
    eu: { data: vstoxx_vol, label: 'Euro STOXX 50 Vol', color: '#388bfd' },
    jp: { data: nikkei_vol, label: 'Nikkei 225 Vol', color: '#f85149' },
    cn: { data: hsi_vol, label: 'Hang Seng Vol', color: '#3fb950' },
  }
  const activeVix = vixDataMap[vixRegion]
  const wti_h     = macro?.wti_h     ?? []
  const brent_h   = macro?.brent_h   ?? []
  const hyg_lqd_h = macro?.hyg_lqd_h ?? []
  const oas_h     = macro?.oas_h     ?? []
  const rsp_spy_h = macro?.rsp_spy_h ?? []
  const liq_h     = macro?.liq_h     ?? []

  // Computed spread — keep nulls in array (chart skips them), only need length > 1 to render
  const raw_spread_h = macro?.spread_h ?? []
  const spread_h = raw_spread_h.length > 1 ? raw_spread_h : (() => {
    const n = Math.min(us10y_h.length, us2y_h.length)
    if (n === 0) return []
    return us10y_h.slice(-n).map((v: number, i: number) => {
      const b = us2y_h.slice(-n)[i]
      if (v == null || b == null || isNaN(v) || isNaN(b)) return null
      return parseFloat((v - b).toFixed(4))
    })
  })()

  // Current values — with NaN fallback
  const safe = (v: any, fb: number) => (v != null && !isNaN(v)) ? v : fb
  const cur = {
    us10y:  safe(macro?.us10y, safe(us10y_h.at(-1), 4.25)),
    spread: safe(macro?.spread, safe(spread_h.at(-1), 0.10)),
    vix:    safe(macro?.vix, safe(vix_h.at(-1), 20)),
    dxy:    safe(macro?.dxy, safe(dxy_h.at(-1), 103)),
    wti:    safe(macro?.wti, safe(wti_h.at(-1), 75)),
    oas:    safe(macro?.oas, safe(oas_h.at(-1), 3.5)),
  }
  const p8 = {
    us10y:  safe(us10y_h.at(-8), cur.us10y),
    spread: safe(spread_h.at(-8), cur.spread),
    vix:    safe(vix_h.at(-8), cur.vix),
    dxy:    safe(dxy_h.at(-8), cur.dxy),
    wti:    safe(wti_h.at(-8), cur.wti),
    oas:    safe(oas_h.at(-8), cur.oas),
  }

  const updatedDate = macro?.updated
    ? new Date(macro.updated).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div style={{ background: '#0e1117', minHeight: '100%', padding: '12px 14px', color: '#c9d1d9' }}>

      {/* Header with sub-nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#c9d1d9' }}>MACRO INTELLIGENCE</div>
          <div style={{ display: 'flex', gap: 0 }}>
            {([['overview', 'Overview'], ['calendar', 'Calendar'], ['events', 'Event Risk'], ['sovereign', 'Sovereign'], ['positioning', 'Positioning']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                style={{ padding: '4px 14px', fontSize: 10, cursor: 'pointer', background: 'transparent', border: 'none',
                  color: view === id ? '#c9d1d9' : '#484f58', fontWeight: view === id ? 500 : 400,
                  borderBottom: view === id ? '2px solid #388bfd' : '2px solid transparent' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DataSource source="FRED · CBOE · ICE" updated={(macro as any)?.updated} quality="HIGH" />
          <span style={{ fontSize: 10, color: '#8b949e' }}>
            {updatedDate} · {apiOnline ? '● LIVE' : '● OFFLINE'}
          </span>
        </div>
      </div>

      {view === 'calendar' ? (
        <Calendar />
      ) : view === 'sovereign' ? (
        // Sovereign intelligence — Premium-only sub-tab inside Macro (Pro page).
        <PaywallGate feature="sovereignIntelligence"><SovereignPage /></PaywallGate>
      ) : view === 'events' ? (
        <EventRiskPage />
      ) : view === 'positioning' ? (
        <PositioningPage />
      ) : (
      <>

      {/* ── REGIME BAND — single-line macro state summary ── */}
      <div style={{ background: '#0e1117', border: '1px solid #21262d', borderLeft: 'none', borderRight: 'none',
        padding: '9px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
        <RegimeReading label="RATES" val={cur.us10y.toFixed(2) + '%'}
          status={cur.us10y < 3.8 ? 'Accommodative' : cur.us10y < 4.3 ? 'Neutral' : 'Restrictive'}
          col={cur.us10y < 3.8 ? '#3fb950' : cur.us10y < 4.3 ? '#d29922' : '#f85149'} />
        <span style={{ margin: '0 10px', color: '#21262d' }}>·</span>
        <RegimeReading label="CURVE" val={cur.spread.toFixed(3) + '%'}
          status={cur.spread > 0.1 ? 'Normal' : cur.spread > -0.3 ? 'Flat' : 'Inverted'}
          col={cur.spread > 0.1 ? '#3fb950' : cur.spread > -0.3 ? '#d29922' : '#f85149'} />
        <span style={{ margin: '0 10px', color: '#21262d' }}>·</span>
        <RegimeReading label="VOLATILITY" val={cur.vix.toFixed(1)}
          status={cur.vix < 18 ? 'Calm' : cur.vix < 25 ? 'Elevated' : 'Extreme'}
          col={cur.vix < 18 ? '#3fb950' : cur.vix < 25 ? '#d29922' : '#f85149'} />
        <span style={{ margin: '0 10px', color: '#21262d' }}>·</span>
        <RegimeReading label="CREDIT" val={cur.oas.toFixed(2) + '%'}
          status={cur.oas < 4 ? 'Healthy' : cur.oas < 6 ? 'Watch' : 'Stress'}
          col={cur.oas < 4 ? '#3fb950' : cur.oas < 6 ? '#d29922' : '#f85149'} />
        <span style={{ margin: '0 10px', color: '#21262d' }}>·</span>
        <RegimeReading label="DOLLAR" val={cur.dxy.toFixed(1)}
          status={cur.dxy > 105 ? 'Strong' : cur.dxy > 102 ? 'Firm' : 'Neutral'}
          col={cur.dxy > 105 ? '#f85149' : cur.dxy > 102 ? '#d29922' : '#3fb950'} />
        <span style={{ margin: '0 10px', color: '#21262d' }}>·</span>
        <RegimeReading label="OIL" val={'$' + cur.wti.toFixed(1)}
          status={cur.wti > 90 ? 'Shock risk' : cur.wti > 75 ? 'Elevated' : 'Normal'}
          col={cur.wti > 90 ? '#f85149' : cur.wti > 75 ? '#d29922' : '#3fb950'} />
        <div style={{ marginLeft: 'auto' }} />
      </div>

      {/* ═══ TIER 1: RATES & CURVE — regime-defining ═══ */}
      <div style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #161b22' }}>
        Rates & Curve
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <TvLineChart
          title="YIELD CURVE — US Treasuries"
          sub="US10Y · US2Y · US3M"
          unit="%" dec={2} height={260}
          lines={[
            { label: 'US10Y', color: '#388bfd', data: us10y_h },
            { label: 'US2Y',  color: '#3fb950', data: us2y_h },
            { label: 'US3M',  color: '#7c4dff', data: us3m_h },
          ]}
          refs={[
            { val: 3.80, color: '#3fb950', label: 'Accommodative 3.80%', dash: true },
            { val: 4.20, color: '#d29922', label: 'Neutral 4.20%', dash: true },
            { val: 4.30, color: '#f85149', label: 'Restrictive 4.30%', dash: true },
          ]}
        />

        <TvLineChart
          title="10Y-2Y SPREAD"
          sub=">0 normal curve · <0 inverted · recession signal"
          unit="%" dec={3} height={260} fill
          lines={[{ label: '10Y-2Y', color: '#3fb950', data: spread_h }]}
          refs={[
            { val: 0.3, color: '#3fb950', label: 'Normal', dash: true },
            { val: 0.0, color: '#d29922', label: 'Zero' },
            { val: -0.5, color: '#f85149', label: 'Deep inversion', dash: true },
          ]}
        />
      </div>

      {/* ═══ TIER 2: STRESS CONFIRMATION — does stress data confirm the rates picture? ═══ */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #161b22' }}>
        <span style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500 }}>Stress Confirmation</span>
        <span style={{ fontSize: 9, color: '#30363d' }}>— does stress data confirm or contradict the rates picture?</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {/* VIX — click title to switch series */}
        <div style={{ position: 'relative' }}>
          <TvLineChart
            title=""
            sub=""
            dec={1} height={180} fill
            lines={[{ label: activeVix.label, color: activeVix.color, data: activeVix.data }]}
            refs={vixRegion === 'us' ? [
              { val: 18, color: '#3fb950', label: 'Calm 18', dash: true },
              { val: 25, color: '#d29922', label: 'Elevated 25', dash: true },
              { val: 35, color: '#f85149', label: 'Extreme 35', dash: true },
            ] : [
              { val: 15, color: '#3fb950', label: 'Low vol', dash: true },
              { val: 25, color: '#d29922', label: 'Elevated', dash: true },
              { val: 40, color: '#f85149', label: 'Crisis', dash: true },
            ]}
          />
          {/* Clickable title + sub overlay — triggers dropdown */}
          <div style={{ position: 'absolute', top: 5, left: 8, zIndex: 5, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div onClick={() => setVixOpen(!vixOpen)}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#c9d1d9', background: vixOpen ? '#1c2128' : 'transparent',
                border: `1px solid ${vixOpen ? '#388bfd44' : 'transparent'}`, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!vixOpen) { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.borderColor = '#21262d' } }}
              onMouseLeave={e => { if (!vixOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' } }}>
              {activeVix.label} <span style={{ fontSize: 8, color: '#484f58' }}>▾</span>
            </div>
            <span style={{ fontSize: 9, color: '#8b949e' }}>{vixRegion === 'us' ? '<18 calm · 18-25 elevated · >35 extreme' : '20-day realized vol (ann.)'}</span>
          </div>
          {vixOpen && (
            <>
              <div onClick={() => setVixOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 8 }} />
              <div style={{ position: 'absolute', top: 30, left: 8, zIndex: 10, background: '#161b22', border: '1px solid #30363d', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', minWidth: 180 }}>
              {([
                { k: 'us' as const, label: 'VIX (S&P 500)' },
                { k: 'eu' as const, label: 'Euro STOXX 50 Vol' },
                { k: 'jp' as const, label: 'Nikkei 225 Vol' },
                { k: 'cn' as const, label: 'Hang Seng Vol' },
              ]).map(opt => (
                <div key={opt.k} onClick={() => { setVixRegion(opt.k); setVixOpen(false) }}
                  style={{ padding: '7px 14px', fontSize: 10, cursor: 'pointer', 
                    color: vixRegion === opt.k ? '#c9d1d9' : '#8b949e',
                    background: vixRegion === opt.k ? '#388bfd18' : 'transparent', 
                    borderLeft: vixRegion === opt.k ? '2px solid #388bfd' : '2px solid transparent',
                    transition: 'all 0.1s' }}
                  onMouseEnter={e => { if (vixRegion !== opt.k) e.currentTarget.style.background = '#1c2128' }}
                  onMouseLeave={e => { if (vixRegion !== opt.k) e.currentTarget.style.background = 'transparent' }}>
                  {opt.label}
                </div>
              ))}
              </div>
            </>
          )}
        </div>

        <TvLineChart
            title="HY OAS — High Yield Spread"
            sub="<4% healthy · 4-6% watch · >6% credit stress"
            unit="%" dec={2} height={180} fill
            lines={[{ label: 'HY OAS', color: '#f85149', data: oas_h }]}
            refs={[
              { val: 4.0, color: '#d29922', label: '<4% healthy', dash: true },
              { val: 6.0, color: '#f85149', label: '>6% stress', dash: true },
            ]}
          />

        <TvLineChart
          title="CREDIT — HYG/LQD Ratio"
          sub="Rising = credit healthy · Sharp decline = stress signal"
          dec={3} height={180} fill
          lines={[{ label: 'HYG/LQD', color: '#3fb950', data: hyg_lqd_h }]}
          refs={[{ val: 0.80, color: '#f85149', label: 'Stress 0.80', dash: true }]}
        />

        <TvLineChart
          title="MARKET BREADTH — RSP/SPY"
          sub="Rising = broad rally · Falling = narrow / fragile"
          dec={3} height={180}
          lines={[{ label: 'RSP/SPY', color: '#7c4dff', data: rsp_spy_h }]}
          refs={[
            { val: 0.95, color: '#d29922', label: 'Watch 0.95', dash: true },
            { val: 0.90, color: '#f85149', label: 'Fragile 0.90', dash: true },
          ]}
        />
      </div>

      {/* ═══ TIER 3: EXTERNAL CONTEXT — inputs to the regime, not the regime itself ═══ */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #161b22' }}>
        <span style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500 }}>External Context</span>
        <span style={{ fontSize: 9, color: '#30363d' }}>— inputs to the regime, not the regime itself</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <TvLineChart
          title="DXY — US Dollar Index"
          sub="EUR/GBP/JPY/CHF/SEK/CAD basket"
          dec={2} height={160}
          lines={[{ label: 'DXY', color: '#8b949e', data: dxy_h }]}
          refs={[
            { val: 100, color: '#d29922', label: '100 key level', dash: true },
            { val: 105, color: '#f85149', label: '105 strong dollar', dash: true },
          ]}
        />

        <TvLineChart
          title="OIL — WTI & Brent"
          sub=">$90 inflation pressure · >$100 economic shock"
          unit="$" dec={1} height={160}
          lines={[
            { label: 'WTI', color: '#388bfd', data: wti_h },
            { label: 'Brent', color: '#8b949e', data: brent_h },
          ]}
          refs={[
            { val: 90, color: '#d29922', label: '$90 pressure', dash: true },
            { val: 100, color: '#f85149', label: '$100 shock', dash: true },
          ]}
        />
      </div>

      {/* Footer */}
      <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8b949e' }}>
        <span>Sources: FRED · US Treasury · Yahoo Finance</span>
        <span>Last updated: {updatedDate}</span>
      </div>

      </>
      )}
    </div>
  )
}
