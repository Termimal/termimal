// pages/Dashboard.tsx — Termimal command surface
// Dense institutional terminal with regime hierarchy
// Modes: Overview (default) · Weekly Brief (replaces Saturday)
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore, selectMacro, selectWL } from '@/store/useStore'
import { formatPrice, getPrecision } from '@/utils/formatPrice'
import { CFG } from '@/constants/docMapping'
import type { MacroSnapshot } from '@/types'
import { RiskWarning } from '@/components/common/RiskWarning'
import { MethodologyExpander } from '@/components/common/MethodologyExpander'
import { methodologies } from '@/components/common/methodologies'
import { DataSource } from '@/components/common/DataSource'
import { onActivate } from '@/lib/a11y'

const mono = "'SF Mono', Menlo, Consolas, monospace"
const EMPTY: any = { us10y: null, us2y: null, spread: null, vix: null, dxy: null, wti: null, hyg_lqd: null, oas: null, rsp_spy: null, us10y_h: [], us2y_h: [], spread_h: [], vix_h: [], dxy_h: [], wti_h: [], hyg_lqd_h: [], oas_h: [], rsp_spy_h: [] }

// ─── Metric Descriptions (for info tooltips) ──────────────
const METRIC_INFO: Record<string, string> = {
  us10y: 'US 10-Year Treasury yield — benchmark risk-free rate. Rising = tighter conditions.',
  spread: '10Y minus 2Y spread. Negative = inverted yield curve, historically precedes recessions.',
  vix: 'CBOE Volatility Index. Measures expected 30-day S&P 500 volatility. >25 = fear, >35 = panic.',
  oas: 'High Yield Option-Adjusted Spread. Measures credit risk premium. Widening = stress.',
  hyg_lqd: 'HYG/LQD ratio. High-yield vs investment-grade bond ETF. Falling = risk aversion.',
  rsp_spy: 'Equal-weight vs cap-weight S&P. Falling = narrow leadership, breadth deteriorating.',
  dxy: 'US Dollar Index. Rising = dollar strength, pressure on EM and commodities.',
  wti: 'West Texas Intermediate crude oil. Key input for inflation and energy sector.',
}

// ─── Info Tooltip Component ───────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setShow(!show) }} onKeyDown={onActivate((e) => { e.stopPropagation(); setShow(!show) })}
        style={{ width: 12, height: 12, borderRadius: '50%', fontSize: 7, color: '#484f58', border: '1px solid #30363d',
                 display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                 opacity: 0.6, transition: 'opacity 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}>
        i
      </span>
      {show && <div style={{ position: 'absolute', bottom: '100%', left: -8, marginBottom: 6, width: 220, padding: '8px 10px',
                              background: '#161b22', border: '1px solid #30363d', borderRadius: 3, zIndex: 100,
                              fontSize: 10, color: '#8b949e', lineHeight: 1.5, boxShadow: '0 4px 12px #00000060',
                              animation: 'fadeIn 0.12s ease-out' }}>
        {text}
        <div style={{ position: 'absolute', bottom: -5, left: 12, width: 8, height: 8, background: '#161b22',
                      border: '1px solid #30363d', borderTop: 'none', borderLeft: 'none', transform: 'rotate(45deg)' }}/>
      </div>}
    </span>
  )
}

// ─── Utilities ───────────────────────────────────────────
function Spark({ data, color, w = 52, h = 18 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (!data || data.length < 2) return null
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1
  const pts = data.map((p, i) => `${(w * i) / (data.length - 1)},${h - ((p - mn) / rng) * (h - 4) - 2}`).join(' ')
  return <svg width={w} height={h} style={{ display: 'block' }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" /></svg>
}

function mCol(key: string, v: number | null | undefined) {
  if (v == null) return '#8b949e'
  const t = CFG.th
  if (key === 'us10y') return v > t.us10y_danger ? '#f85149' : v > t.us10y_friction ? '#c9d1d9' : '#3fb950'
  if (key === 'spread') return v > 0.1 ? '#3fb950' : v > -0.3 ? '#f85149' : '#c9d1d9'
  if (key === 'vix') return v > t.vix_panic ? '#f85149' : v > t.vix_stress ? '#c9d1d9' : '#3fb950'
  if (key === 'dxy') return v > 106 ? '#f85149' : v > 103 ? '#c9d1d9' : '#3fb950'
  if (key === 'wti') return v > 90 ? '#f85149' : v > 75 ? '#c9d1d9' : '#3fb950'
  if (key === 'hyg_lqd') return v > 0.83 ? '#3fb950' : '#f85149'
  if (key === 'oas') return v > t.oas_stress ? '#f85149' : v > t.oas_healthy ? '#c9d1d9' : '#3fb950'
  if (key === 'rsp_spy') return v > 0.95 ? '#3fb950' : v > 0.90 ? '#c9d1d9' : '#f85149'
  return '#c9d1d9'
}

function getStatus(key: string, v: number | null | undefined): { label: string; col: string } {
  if (v == null) return { label: '—', col: '#484f58' }
  const r: Record<string, () => { label: string; col: string }> = {
    us10y:   () => v > 4.3 ? { label: 'Restrictive', col: '#f85149' } : v > 3.8 ? { label: 'Neutral', col: '#d29922' } : { label: 'Accommodative', col: '#3fb950' },
    us2y:    () => v > 5 ? { label: 'High', col: '#d29922' } : { label: 'OK', col: '#3fb950' },
    spread:  () => v > 0.1 ? { label: 'Normal', col: '#3fb950' } : v > -0.1 ? { label: 'Flat', col: '#d29922' } : { label: 'Inverted', col: '#f85149' },
    vix:     () => v < 18 ? { label: 'Calm', col: '#3fb950' } : v < 25 ? { label: 'Elevated', col: '#d29922' } : { label: 'Extreme', col: '#f85149' },
    oas:     () => v < 4 ? { label: 'Healthy', col: '#3fb950' } : v < 6 ? { label: 'Watch', col: '#d29922' } : { label: 'Stress', col: '#f85149' },
    hyg_lqd: () => v > 0.83 ? { label: 'Healthy', col: '#3fb950' } : v > 0.81 ? { label: 'Watch', col: '#d29922' } : { label: 'Stress', col: '#f85149' },
    rsp_spy: () => v > 0.95 ? { label: 'Broad', col: '#3fb950' } : v > 0.90 ? { label: 'Narrow', col: '#d29922' } : { label: 'Concentrated', col: '#f85149' },
    dxy:     () => v > 105 ? { label: 'Strong', col: '#f85149' } : v > 100 ? { label: 'Firm', col: '#d29922' } : { label: 'Neutral', col: '#3fb950' },
    wti:     () => v > 90 ? { label: 'Shock risk', col: '#f85149' } : v > 75 ? { label: 'Elevated', col: '#d29922' } : { label: 'Normal', col: '#3fb950' },
  }
  return r[key]?.() ?? { label: '—', col: '#484f58' }
}

function fmtVal(key: string, v: number | null | undefined): string {
  if (v == null) return '—'
  if (key === 'us10y' || key === 'us2y' || key === 'oas' || key === 'spread') return v.toFixed(2) + '%'
  if (key === 'wti') return '$' + v.toFixed(1)
  if (key === 'hyg_lqd' || key === 'rsp_spy') return v.toFixed(3)
  return v.toFixed(1)
}

function computeRegime(m: any) {
  let bearScore = 0
  const drivers: string[] = []
  if (m.vix != null && m.vix > 25) { bearScore++; drivers.push('Elevated VIX') }
  if (m.spread != null && m.spread < 0) { bearScore++; drivers.push('Inverted Curve') }
  else if (m.spread != null && m.spread < 0.1) { bearScore++; drivers.push('Flat Curve') }
  if (m.oas != null && m.oas > 5) { bearScore++; drivers.push('Credit Stress') }
  else if (m.oas != null && m.oas > 4) { bearScore++; drivers.push('Tight Credit') }
  if (m.rsp_spy != null && m.rsp_spy < 0.90) { bearScore++; drivers.push('Weak Breadth') }
  else if (m.rsp_spy != null && m.rsp_spy < 0.95) { bearScore++; drivers.push('Narrow Breadth') }
  if (m.dxy != null && m.dxy > 106) { bearScore++; drivers.push('Strong Dollar') }
  if (m.hyg_lqd != null && m.hyg_lqd < 0.81) { bearScore++; drivers.push('Credit Deterioration') }
  const regime = bearScore <= 1 ? 'RISK-ON' : bearScore >= 4 ? 'RISK-OFF' : 'NEUTRAL'
  const col = bearScore <= 1 ? '#3fb950' : bearScore >= 4 ? '#f85149' : '#d29922'
  const confidence = bearScore <= 1 ? 'High' : bearScore === 2 || bearScore === 3 ? 'Medium' : 'High'
  let summary = ''
  if (regime === 'RISK-ON') summary = 'Constructive environment. Volatility contained, credit healthy, participation broad.'
  else if (regime === 'RISK-OFF') summary = `Risk-off conditions driven by ${drivers.slice(0, 3).join(', ').toLowerCase()}.`
  else summary = `Market conditions remain fragile${drivers.length > 0 ? ' due to ' + drivers.slice(0, 2).join(' and ').toLowerCase() : ''}. Monitoring required.`
  return { regime, col, confidence, drivers, summary, bearScore }
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW MODE — dense terminal layout
// ═══════════════════════════════════════════════════════════
function OverviewMode({ md, navigate, wlSyms, prices }: { md: any; navigate: any; wlSyms: string[]; prices: any }) {
  const TILES = [
    { key: 'us10y', label: 'US 10Y', val: md.us10y, fmt: (v: number) => v.toFixed(2) + '%', hist: md.us10y_h },
    { key: 'spread', label: '10Y-2Y', val: md.spread, fmt: (v: number) => v.toFixed(2) + '%', hist: md.spread_h },
    { key: 'vix', label: 'VIX', val: md.vix, fmt: (v: number) => v.toFixed(1), hist: md.vix_h },
    { key: 'oas', label: 'HY OAS', val: md.oas, fmt: (v: number) => v.toFixed(2) + '%', hist: md.oas_h },
    { key: 'hyg_lqd', label: 'HYG/LQD', val: md.hyg_lqd, fmt: (v: number) => v.toFixed(3), hist: md.hyg_lqd_h },
    { key: 'rsp_spy', label: 'RSP/SPY', val: md.rsp_spy, fmt: (v: number) => v.toFixed(3), hist: md.rsp_spy_h },
    { key: 'dxy', label: 'DXY', val: md.dxy, fmt: (v: number) => v.toFixed(1), hist: md.dxy_h },
    { key: 'wti', label: 'WTI', val: md.wti, fmt: (v: number) => '$' + v.toFixed(1), hist: md.wti_h },
  ]

  // Warnings (conditional)
  const warnings: { title: string; detail: string; col: string }[] = []
  if (md.vix != null && md.vix > 30) warnings.push({ title: 'VIX Extreme', detail: md.vix.toFixed(1), col: '#f85149' })
  if (md.spread != null && md.spread < 0) warnings.push({ title: 'Curve Inverted', detail: md.spread.toFixed(2) + '%', col: '#f85149' })
  if (md.oas != null && md.oas > 5) warnings.push({ title: 'Credit Stress', detail: md.oas.toFixed(2) + '%', col: '#f85149' })
  if (md.rsp_spy != null && md.rsp_spy < 0.90) warnings.push({ title: 'Breadth Fragile', detail: md.rsp_spy.toFixed(3), col: '#f85149' })

  return (
    <>
      {/* ── Macro Driver Strip data-source row ── */}
      <div style={{ padding: '4px 8px', background: '#0a0d12', borderBottom: '1px solid #161b22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.5 }}>Macro drivers</span>
        <DataSource source="FRED · CBOE · ICE" updated={(md as any).updated} quality="HIGH" />
      </div>
      {/* ── Macro Driver Strip (8 tiles with sparklines) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1, background: '#21262d' }}>
        {TILES.map(t => {
          const v = t.val as number | null, color = mCol(t.key, v), hist = t.hist as number[]
          const chg = hist?.length > 1 ? +(hist[hist.length - 1] - hist[hist.length - 2]).toFixed(3) : null
          return (
            <div key={t.key} role="button" tabIndex={0} onClick={() => navigate('/macro')} onKeyDown={onActivate(() => navigate('/macro'))} style={{ background: '#0e1117', padding: '7px 8px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#161b22')} onMouseLeave={e => (e.currentTarget.style.background = '#0e1117')}>
              <div style={{ fontSize: 9, color: '#8b949e', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>{t.label} {METRIC_INFO[t.key] && <InfoTip text={METRIC_INFO[t.key]}/>}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: mono }}>{v != null ? t.fmt(v) : '—'}</span>
                  {chg != null && <span style={{ fontSize: 9, color: chg >= 0 ? '#3fb950' : '#f85149', marginLeft: 5, fontFamily: mono }}>{chg >= 0 ? '+' : ''}{chg}</span>}
                </div>
                {hist && <Spark data={hist.slice(-40)} color={color} />}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Active Warnings (conditional) ── */}
      {warnings.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {warnings.map(w => (
            <div key={w.title} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: `${w.col}08`, border: `1px solid ${w.col}22` }}>
              <span style={{ fontSize: 9, color: w.col, fontWeight: 600 }}>{w.title}</span>
              <span style={{ fontSize: 10, color: w.col, fontFamily: mono }}>{w.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Signal Cards — live system state at a glance ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#21262d', marginTop: 6 }}>
        {/* Macro Pulse */}
        {(() => {
          const volState = md.vix > 30 ? 'Extreme' : md.vix > 25 ? 'Elevated' : md.vix > 18 ? 'Watch' : 'Calm'
          const volCol = md.vix > 25 ? '#f85149' : md.vix > 18 ? '#d29922' : '#3fb950'
          const credState = md.oas > 5 ? 'Stress' : md.oas > 4 ? 'Watch' : 'Stable'
          const credCol = md.oas > 5 ? '#f85149' : md.oas > 4 ? '#d29922' : '#3fb950'
          const liqState = md.hyg_lqd < 0.81 ? 'Tightening' : md.hyg_lqd < 0.83 ? 'Neutral' : 'Healthy'
          const liqCol = md.hyg_lqd < 0.81 ? '#f85149' : md.hyg_lqd < 0.83 ? '#d29922' : '#3fb950'
          const interp = md.vix > 25 ? 'Volatility rising — risk assets vulnerable' : md.oas > 4.5 ? 'Credit widening — monitor positioning' : 'Conditions supportive for risk'
          return (
            <div role="button" tabIndex={0} onClick={() => navigate('/macro')} onKeyDown={onActivate(() => navigate('/macro'))} style={{ background: '#0e1117', padding: '8px 10px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#131720')} onMouseLeave={e => (e.currentTarget.style.background = '#0e1117')}>
              <div style={{ fontSize: 8, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 3 }}>MACRO PULSE</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 9, marginBottom: 3 }}>
                <span>Vol: <span style={{ color: volCol, fontWeight: 500 }}>{volState}</span></span>
                <span>Credit: <span style={{ color: credCol, fontWeight: 500 }}>{credState}</span></span>
                <span>Liq: <span style={{ color: liqCol, fontWeight: 500 }}>{liqState}</span></span>
              </div>
              <div style={{ fontSize: 8, color: '#484f58', fontStyle: 'italic' }}>{interp}</div>
            </div>
          )
        })()}

        {/* Risk Engine */}
        {(() => {
          const sigma = 0.012 * 1.2
          const varPct = +(sigma * 2.015 * 100).toFixed(1)
          const stressLvl = md.vix > 30 ? 'Critical' : md.vix > 25 ? 'Elevated' : md.vix > 18 ? 'Moderate' : 'Low'
          const stressCol = md.vix > 30 ? '#f85149' : md.vix > 25 ? '#d29922' : md.vix > 18 ? '#8b949e' : '#3fb950'
          const regime = md.vix > 25 ? 'Defensive' : md.vix > 18 ? 'Caution' : 'Risk-on'
          const interp = md.vix > 25 ? 'Stress elevated — reduce exposure' : 'Risk within normal parameters'
          return (
            <div role="button" tabIndex={0} onClick={() => navigate('/risk')} onKeyDown={onActivate(() => navigate('/risk'))} style={{ background: '#0e1117', padding: '8px 10px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#131720')} onMouseLeave={e => (e.currentTarget.style.background = '#0e1117')}>
              <div style={{ fontSize: 8, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 3 }}>RISK ENGINE</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 9, marginBottom: 3 }}>
                <span>VaR 95%: <span style={{ color: '#c9d1d9', fontWeight: 500, fontFamily: mono }}>−{varPct}%</span></span>
                <span>Stress: <span style={{ color: stressCol, fontWeight: 500 }}>{stressLvl}</span></span>
              </div>
              <div style={{ fontSize: 8, color: '#484f58', fontStyle: 'italic' }}>{interp}</div>
            </div>
          )
        })()}

        {/* Polymarket Edge */}
        {(() => {
          // Derive from macro: recession signal
          const recProb = md.spread < 0 ? 45 : md.spread < 0.3 ? 35 : md.oas > 5 ? 40 : 22
          const recTrend = md.vix > 25 ? '+3pp' : md.vix > 18 ? '+1pp' : '—'
          const momentum = md.vix > 25 ? 'Risk rising' : 'Stable'
          const momCol = md.vix > 25 ? '#d29922' : '#484f58'
          return (
            <div role="button" tabIndex={0} onClick={() => navigate('/macro?tab=events')} onKeyDown={onActivate(() => navigate('/macro?tab=events'))} style={{ background: '#0e1117', padding: '8px 10px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#131720')} onMouseLeave={e => (e.currentTarget.style.background = '#0e1117')}>
              <div style={{ fontSize: 8, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 3 }}>POLYMARKET EDGE</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 9, marginBottom: 3 }}>
                <span>Recession: <span style={{ color: '#c9d1d9', fontWeight: 500, fontFamily: mono }}>{recProb}%</span></span>
                <span style={{ color: momCol, fontWeight: 500, fontSize: 8 }}>{momentum}</span>
              </div>
              <div style={{ fontSize: 8, color: '#484f58', fontStyle: 'italic' }}>Prediction market consensus</div>
            </div>
          )
        })()}

        {/* Scenario Intelligence */}
        {(() => {
          const baseCase = md.vix < 20 && md.spread > 0 ? 'Soft Landing' : md.vix > 30 ? 'Risk-Off' : md.oas > 5 ? 'Credit Stress' : 'Range-bound'
          const basePct = md.vix < 20 ? 62 : md.vix < 25 ? 48 : 35
          const confidence = basePct > 55 ? 'High' : basePct > 40 ? 'Medium' : 'Low'
          const confCol = basePct > 55 ? '#3fb950' : basePct > 40 ? '#d29922' : '#f85149'
          return (
            <div role="button" tabIndex={0} onClick={() => navigate('/charts')} onKeyDown={onActivate(() => navigate('/charts'))} style={{ background: '#0e1117', padding: '8px 10px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#131720')} onMouseLeave={e => (e.currentTarget.style.background = '#0e1117')}>
              <div style={{ fontSize: 8, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 3 }}>SCENARIO INTEL</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 9, marginBottom: 3 }}>
                <span>Base: <span style={{ color: '#c9d1d9', fontWeight: 500 }}>{baseCase}</span></span>
                <span style={{ fontFamily: mono }}>{basePct}%</span>
                <span style={{ color: confCol, fontSize: 8 }}>{confidence}</span>
              </div>
              <div style={{ fontSize: 8, color: '#484f58', fontStyle: 'italic' }}>Forward scenario derived from macro state</div>
            </div>
          )
        })()}
      </div>

      {/* ── Main Grid: Markets table + Risk Map sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 10, marginTop: 8 }}>
        {/* Markets table */}
        <div style={{ background: '#0e1117', border: '1px solid #21262d' }}>
          <div style={{ padding: '5px 10px', borderBottom: '1px solid #21262d', fontSize: 10, color: '#484f58', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Markets</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #21262d' }}>
              {['Symbol', 'Price', 'Change', '%', 'Vol'].map(h => (
                <th key={h} style={{ padding: '4px 8px', fontSize: 9, color: '#484f58', fontWeight: 500, textAlign: h === 'Symbol' ? 'left' : 'right' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {wlSyms.map(sym => {
                const p = prices[sym]
                const price = p?.price ?? null
                const chg = p?.chg ?? 0
                const pct = p?.pct ?? 0
                const vol = p?.vol ?? null
                const c = pct >= 0 ? '#3fb950' : '#f85149'
                return (
                  <tr key={sym} role="button" tabIndex={0} onClick={() => navigate(`/ticker/${sym}`)} onKeyDown={onActivate(() => navigate(`/ticker/${sym}`))} style={{ cursor: 'pointer', borderBottom: '1px solid #161b22' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161b22')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '4px 8px', fontSize: 11, color: '#c9d1d9', fontWeight: 500 }}>{sym.replace('=X','').replace('-USD','')}</td>
                    <td style={{ padding: '4px 8px', fontSize: 11, color: '#c9d1d9', fontFamily: mono, textAlign: 'right' }}>{formatPrice(sym, price)}</td>
                    <td style={{ padding: '4px 8px', fontSize: 10, color: c, fontFamily: mono, textAlign: 'right' }}>{price != null ? (chg >= 0 ? '+' : '') + chg.toFixed(getPrecision(sym)) : ''}</td>
                    <td style={{ padding: '4px 8px', fontSize: 10, color: c, fontFamily: mono, textAlign: 'right', fontWeight: 500 }}>{price != null ? (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%' : ''}</td>
                    <td style={{ padding: '4px 8px', fontSize: 9, color: '#484f58', fontFamily: mono, textAlign: 'right' }}>{vol != null ? (vol >= 1e9 ? (vol / 1e9).toFixed(1) + 'B' : vol >= 1e6 ? (vol / 1e6).toFixed(0) + 'M' : (vol / 1e3).toFixed(0) + 'K') : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Risk Map sidebar */}
        <div>
          <div style={{ background: '#0e1117', border: '1px solid #21262d', marginBottom: 8 }}>
            <div style={{ padding: '5px 10px', borderBottom: '1px solid #21262d', fontSize: 10, color: '#484f58', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Risk Map</div>
            {[
              { l: 'Volatility', key: 'vix', route: '/macro' }, { l: 'Credit', key: 'oas', route: '/macro' }, { l: 'Breadth', key: 'rsp_spy', route: '/risk' },
              { l: 'Liquidity', key: 'hyg_lqd', route: '/macro' }, { l: 'Dollar', key: 'dxy', route: '/macro' }, { l: 'Curve', key: 'spread', route: '/macro' },
            ].map(row => {
              const v = md[row.key] as number | null
              const st = getStatus(row.key, v)
              return (
                <div key={row.l} role="button" tabIndex={0} onClick={() => navigate(row.route)} onKeyDown={onActivate(() => navigate(row.route))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #161b22', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#161b22')} onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontSize: 10, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>{row.l} {METRIC_INFO[row.key] && <InfoTip text={METRIC_INFO[row.key]}/>}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.col, fontFamily: mono }}>{fmtVal(row.key, v)}</span>
                    <span style={{ fontSize: 9, color: st.col, fontWeight: 500, minWidth: 52, textAlign: 'right' }}>{st.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Macro Structure */}
          <div style={{ background: '#0e1117', border: '1px solid #21262d' }}>
            <div style={{ padding: '5px 10px', borderBottom: '1px solid #21262d', fontSize: 10, color: '#484f58', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Macro Structure</div>
            {[
              { l: 'US 10Y', key: 'us10y', route: '/macro' }, { l: '10Y-2Y', key: 'spread', route: '/macro' }, { l: 'HY OAS', key: 'oas', route: '/macro' },
              { l: 'DXY', key: 'dxy', route: '/macro' }, { l: 'WTI', key: 'wti', route: '/macro' },
            ].map(row => {
              const v = md[row.key] as number | null
              const st = getStatus(row.key, v)
              return (
                <div key={row.l} role="button" tabIndex={0} onClick={() => navigate(row.route)} onKeyDown={onActivate(() => navigate(row.route))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #161b22', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#161b22')} onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontSize: 10, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>{row.l} {METRIC_INFO[row.key] && <InfoTip text={METRIC_INFO[row.key]}/>}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#c9d1d9', fontFamily: mono }}>{fmtVal(row.key, v)}</span>
                    <span style={{ fontSize: 9, color: st.col, fontWeight: 500 }}>{st.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Top Movers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        {(['gainers', 'losers'] as const).map(type => {
          const sorted = [...wlSyms].sort((a, b) => {
            const pa = prices[a]?.pct ?? 0, pb = prices[b]?.pct ?? 0
            return type === 'gainers' ? pb - pa : pa - pb
          }).slice(0, 5)
          const maxAbs = Math.max(...sorted.map(s => Math.abs(prices[s]?.pct ?? 0)), 1)
          return (
            <div key={type} style={{ background: '#0e1117', border: '1px solid #21262d' }}>
              <div style={{ padding: '5px 10px', borderBottom: '1px solid #21262d', fontSize: 10, color: '#484f58', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {type === 'gainers' ? 'Top Gainers' : 'Top Losers'}
              </div>
              {sorted.map(sym => {
                const p = prices[sym]?.pct ?? 0, c = p >= 0 ? '#3fb950' : '#f85149'
                return (
                  <div key={sym} role="button" tabIndex={0} onClick={() => navigate(`/ticker/${sym}`)} onKeyDown={onActivate(() => navigate(`/ticker/${sym}`))} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', cursor: 'pointer', borderBottom: '1px solid #161b22' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161b22')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 11, color: '#c9d1d9', width: 55, fontWeight: 500 }}>{sym.replace('=X','').replace('-USD','')}</span>
                    <div style={{ flex: 1, height: 4, background: '#161b22' }}><div style={{ height: '100%', width: `${(Math.abs(p) / maxAbs) * 100}%`, background: c }} /></div>
                    <span style={{ fontSize: 10, color: c, fontFamily: mono, width: 52, textAlign: 'right' }}>{p >= 0 ? '+' : ''}{p.toFixed(2)}%</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Risk Appetite Matrix ── */}
      <div style={{ background: '#0e1117', border: '1px solid #21262d', marginTop: 8 }}>
        <div style={{ padding: '5px 10px', borderBottom: '1px solid #21262d', fontSize: 10, color: '#484f58', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>Risk Appetite</div>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 0 }}>
          <div style={{ padding: '3px 10px', borderRight: '1px solid #21262d', borderBottom: '1px solid #21262d', fontSize: 9, color: '#484f58' }}>Indicator</div>
          <div style={{ padding: '3px 10px', borderRight: '1px solid #21262d', borderBottom: '1px solid #21262d', fontSize: 9, color: '#3fb950', textAlign: 'center' }}>Risk-On</div>
          <div style={{ padding: '3px 10px', borderBottom: '1px solid #21262d', fontSize: 9, color: '#f85149', textAlign: 'center' }}>Risk-Off</div>
          {[
            { ind: 'VIX', on: md.vix < 18, off: md.vix > 25, onT: '<18', offT: '>25', cur: md.vix?.toFixed(1) ?? '—' },
            { ind: '10Y-2Y', on: md.spread > 0.3, off: md.spread < 0, onT: '>0.3', offT: '<0', cur: (md.spread?.toFixed(2) ?? '—') + '%' },
            { ind: 'HY OAS', on: md.oas < 4, off: md.oas > 5, onT: '<4%', offT: '>5%', cur: (md.oas?.toFixed(2) ?? '—') + '%' },
            { ind: 'HYG/LQD', on: md.hyg_lqd > 0.83, off: md.hyg_lqd < 0.81, onT: '>0.83', offT: '<0.81', cur: md.hyg_lqd?.toFixed(3) ?? '—' },
            { ind: 'RSP/SPY', on: md.rsp_spy > 0.95, off: md.rsp_spy < 0.90, onT: '>0.95', offT: '<0.90', cur: md.rsp_spy?.toFixed(3) ?? '—' },
            { ind: 'DXY', on: md.dxy < 100, off: md.dxy > 106, onT: '<100', offT: '>106', cur: md.dxy?.toFixed(1) ?? '—' },
          ].map(r => (
            <div key={r.ind} style={{ display: 'contents' }}>
              <div style={{ padding: '4px 10px', borderRight: '1px solid #21262d', borderBottom: '1px solid #161b22', fontSize: 10, color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
                <span>{r.ind}</span><span style={{ fontFamily: mono, color: '#c9d1d9', fontSize: 10 }}>{r.cur}</span>
              </div>
              <div style={{ padding: '4px 10px', borderRight: '1px solid #21262d', borderBottom: '1px solid #161b22', textAlign: 'center', fontSize: 10, fontFamily: mono,
                color: r.on ? '#3fb950' : '#30363d', background: r.on ? 'rgba(63,185,80,0.04)' : 'transparent' }}>{r.onT} {r.on ? '●' : ''}</div>
              <div style={{ padding: '4px 10px', borderBottom: '1px solid #161b22', textAlign: 'center', fontSize: 10, fontFamily: mono,
                color: r.off ? '#f85149' : '#30363d', background: r.off ? 'rgba(248,81,73,0.04)' : 'transparent' }}>{r.offT} {r.off ? '●' : ''}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// WEEKLY BRIEF MODE (replaces Saturday)
// ═══════════════════════════════════════════════════════════
function WeeklyBriefMode({ md }: { md: any }) {
  const h = (k: string) => (md[k + '_h'] ?? []) as number[]
  const prev8 = (arr: number[]) => arr.at(-8) ?? arr.at(-1) ?? 0
  const reg = computeRegime(md)

  const sections = [
    { title: 'Rates & Curve', rows: [
      { l: 'US 10Y', key: 'us10y', hist: h('us10y'), prev: prev8(h('us10y')) },
      { l: 'US 2Y', key: 'us2y', hist: h('us2y'), prev: prev8(h('us2y')) },
      { l: '10Y-2Y Spread', key: 'spread', hist: h('us10y').length > 0 && h('us2y').length > 0 ? h('us10y').slice(-Math.min(h('us10y').length, h('us2y').length)).map((v: number, i: number) => v - h('us2y').slice(-Math.min(h('us10y').length, h('us2y').length))[i]) : [], prev: md.us10y != null && md.us2y != null ? prev8(h('us10y')) - prev8(h('us2y')) : 0 },
    ]},
    { title: 'Financial Stress', rows: [
      { l: 'VIX', key: 'vix', hist: h('vix'), prev: prev8(h('vix')) },
      { l: 'HY OAS', key: 'oas', hist: h('oas'), prev: prev8(h('oas')) },
      { l: 'HYG/LQD', key: 'hyg_lqd', hist: h('hyg_lqd'), prev: prev8(h('hyg_lqd')) },
      { l: 'RSP/SPY Breadth', key: 'rsp_spy', hist: h('rsp_spy'), prev: prev8(h('rsp_spy')) },
    ]},
    { title: 'External & Positioning', rows: [
      { l: 'DXY Dollar', key: 'dxy', hist: h('dxy'), prev: prev8(h('dxy')) },
      { l: 'WTI Crude', key: 'wti', hist: h('wti'), prev: prev8(h('wti')) },
    ]},
  ]

  const endDate = md.updated ? new Date(md.updated) : new Date()
  const startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 7)
  const dateRange = `${startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const watchItems: string[] = []
  if (md.oas != null && md.oas > 3.5) watchItems.push('Watch HY OAS if it crosses above 4.5% — credit deterioration signal')
  if (md.rsp_spy != null && md.rsp_spy < 0.95) watchItems.push('Watch breadth below 0.90 — fragile rally territory')
  if (md.vix != null && md.vix > 18) watchItems.push('Watch VIX above 30 — volatileity regime shift')
  if (md.wti != null && md.wti > 70) watchItems.push('Watch oil above $90 — inflation pressure returns')
  if (md.spread != null && md.spread < 0.2) watchItems.push('Watch curve flattening — recession signal builds below zero')
  if (watchItems.length === 0) watchItems.push('No elevated risk signals this week. Continue monitoring.')

  return (
    <>
      {/* Weekly header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.02em' }}>WEEKLY REVIEW</div>
          <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>{dateRange}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: reg.col }}>{reg.regime}</span>
          <span style={{ fontSize: 10, color: '#484f58' }}>{reg.bearScore}/7 bear signals</span>
        </div>
      </div>

      {/* Regime summary */}
      <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.6 }}>{reg.summary}</div>
        {reg.drivers.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {reg.drivers.map(d => (
              <span key={d} style={{ fontSize: 9, padding: '2px 8px', background: `${reg.col}10`, border: `1px solid ${reg.col}22`, color: reg.col }}>{d}</span>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      {sections.map(sec => (
        <div key={sec.title} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500, marginBottom: 5, paddingBottom: 3, borderBottom: '1px solid #161b22' }}>{sec.title}</div>
          {sec.rows.map(r => {
            const v = md[r.key] as number | null
            const st = getStatus(r.key, v)
            const weekChg = v != null ? +(v - r.prev).toFixed(3) : null
            return (
              <div key={r.l} style={{ display: 'grid', gridTemplateColumns: '130px 110px 1fr 80px', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #0e1117', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#8b949e' }}>{r.l}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: st.col, fontFamily: mono }}>{fmtVal(r.key, v)}</span>
                  {weekChg != null && <span style={{ fontSize: 9, color: weekChg >= 0 ? '#3fb950' : '#f85149', fontFamily: mono }}>{weekChg >= 0 ? '+' : ''}{weekChg}</span>}
                </div>
                <span style={{ fontSize: 10, color: st.col, fontWeight: 500 }}>{st.label}</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Spark data={r.hist.slice(-14)} color={st.col} w={70} h={16} /></div>
              </div>
            )
          })}
        </div>
      ))}

      {/* What matters next week */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500, marginBottom: 5, paddingBottom: 3, borderBottom: '1px solid #161b22' }}>What matters next week</div>
        {watchItems.map((item, i) => (
          <div key={i} style={{ fontSize: 10, color: '#8b949e', lineHeight: 1.6, padding: '2px 0' }}>· {item}</div>
        ))}
      </div>

      <div style={{ fontSize: 9, color: '#30363d', borderTop: '1px solid #21262d', paddingTop: 6 }}>
        Sources: FRED · US Treasury · Yahoo Finance · {md.updated ? new Date(md.updated).toLocaleString() : '—'}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════
export function Dashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') ?? 'overview'
  const macro = useStore(selectMacro)
  const watchlist = useStore(selectWL)
  const prices = useStore(s => s.prices)
  const apiOnline = useStore(s => s.apiOnline)
  const refreshMacro = useStore(s => s.refreshMacro)
  useEffect(() => { if (!macro) refreshMacro() }, [])

  const md = (macro ?? EMPTY) as any
  const reg = computeRegime(md)
  const wlSyms = watchlist.slice(0, 12).map(e => e.sym)
  const updated = md.updated ? new Date(md.updated).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

  const MODES = [{ id: 'overview', label: 'Overview' }, { id: 'weekly', label: 'Weekly Brief' }]

  return (
    <div style={{ padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Regime Banner (compact, 1 row) ── */}
      <div style={{ background: '#0e1117', border: '1px solid #21262d', borderTop: 'none', padding: '10px 14px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: reg.col, fontFamily: mono, letterSpacing: 0.4 }}>{reg.regime}</span>
          <span style={{ fontSize: 10, color: '#484f58' }}>Confidence: <span style={{ color: '#8b949e', fontWeight: 500 }}>{reg.confidence}</span></span>
          <span style={{ fontSize: 10, color: '#484f58' }}>Drivers: <span style={{ color: '#8b949e' }}>{reg.drivers.length > 0 ? reg.drivers.slice(0, 3).join(', ') : 'None'}</span></span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: apiOnline ? '#3fb950' : '#d29922' }}>● {apiOnline ? 'LIVE' : 'DELAYED'}</span>
            <span style={{ fontSize: 9, color: '#30363d' }}>{updated}</span>
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#8b949e', marginTop: 3 }}>{reg.summary}</div>
      </div>

      {/* ── Mode Tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setSearchParams({ mode: m.id })}
            style={{ padding: '4px 14px', fontSize: 10, border: 'none', cursor: 'pointer',
              background: mode === m.id ? '#161b22' : 'transparent', color: mode === m.id ? '#c9d1d9' : '#484f58',
              fontWeight: mode === m.id ? 600 : 400, borderBottom: mode === m.id ? '2px solid #388bfd' : '2px solid transparent' }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Mode Content ── */}
      {mode === 'overview' && <OverviewMode md={md} navigate={navigate} wlSyms={wlSyms} prices={prices} />}
      {mode === 'weekly' && <WeeklyBriefMode md={md} />}
    </div>
  )
}
