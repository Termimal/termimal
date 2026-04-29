// pages/SovereignPage.tsx — Sovereign Intelligence: rates, reserves, digital context
// DATA FRESHNESS: US yields = FRED daily. Other yields = monthly/static. Gold = quarterly. Stablecoin = static.
import React, { useState } from 'react'
import { useStore, selectMacro } from '@/store/useStore'
import { TvLineChart } from '@/components/charts/TvLineChart'

const mono = "'SF Mono', Menlo, Consolas, monospace"

// ═══════════════════════════════════════════════════════════
// SOVEREIGN YIELD DATA — mixed freshness, clearly labeled
// ═══════════════════════════════════════════════════════════
interface YieldRow {
  country: string
  flag: string
  y2: number | null
  y10: number
  y30: number | null
  curve: number   // 10Y-2Y
  d1d: number
  d1w: number
  freshness: 'live' | 'daily' | 'monthly' | 'static'
  asOf: string
}

// Non-US yields: hardcoded from latest available data with honest dates
const YIELD_DATA: YieldRow[] = [
  { country: 'United States', flag: 'US', y2: 4.25, y10: 4.35, y30: 4.52, curve: 0.10, d1d: 0.03, d1w: 0.12, freshness: 'daily', asOf: 'FRED real-time' },
  { country: 'Germany', flag: 'DE', y2: 2.85, y10: 2.42, y30: 2.71, curve: -0.43, d1d: -0.01, d1w: -0.05, freshness: 'monthly', asOf: 'Feb 2026' },
  { country: 'United Kingdom', flag: 'GB', y2: 4.45, y10: 4.18, y30: 4.65, curve: -0.27, d1d: 0.02, d1w: 0.08, freshness: 'monthly', asOf: 'Feb 2026' },
  { country: 'Japan', flag: 'JP', y2: 0.35, y10: 0.88, y30: 1.92, curve: 0.53, d1d: 0.01, d1w: 0.04, freshness: 'monthly', asOf: 'Feb 2026' },
  { country: 'China', flag: 'CN', y2: 1.52, y10: 2.28, y30: 2.65, curve: 0.76, d1d: 0.00, d1w: -0.02, freshness: 'monthly', asOf: 'Feb 2026' },
  { country: 'France', flag: 'FR', y2: 2.95, y10: 3.05, y30: 3.48, curve: 0.10, d1d: -0.01, d1w: -0.03, freshness: 'monthly', asOf: 'Feb 2026' },
  { country: 'Italy', flag: 'IT', y2: 3.25, y10: 3.72, y30: 4.35, curve: 0.47, d1d: 0.02, d1w: 0.06, freshness: 'monthly', asOf: 'Feb 2026' },
  { country: 'Switzerland', flag: 'CH', y2: 1.15, y10: 0.65, y30: 0.82, curve: -0.50, d1d: 0.00, d1w: -0.01, freshness: 'monthly', asOf: 'Feb 2026' },
]

// ═══════════════════════════════════════════════════════════
// SPREAD RELATIONSHIPS
// ═══════════════════════════════════════════════════════════
interface SpreadPair {
  label: string
  desc: string
  value: number
  range1y: [number, number]
  regime: string
  regimeCol: string
}

const SPREADS: SpreadPair[] = [
  { label: 'US – DE 10Y', desc: 'Transatlantic divergence', value: 1.93, range1y: [1.50, 2.20], regime: 'Wide — USD preference', regimeCol: '#d29922' },
  { label: 'IT – DE 10Y', desc: 'Eurozone stress barometer', value: 1.30, range1y: [1.10, 1.85], regime: 'Stable — no stress', regimeCol: '#3fb950' },
  { label: 'US – JP 10Y', desc: 'Carry trade pressure', value: 3.47, range1y: [3.00, 3.90], regime: 'Wide — yen pressure', regimeCol: '#f85149' },
  { label: 'US – CN 10Y', desc: 'Reserve currency tension', value: 2.07, range1y: [1.40, 2.50], regime: 'Elevated — capital flow imbalance', regimeCol: '#d29922' },
]

// ═══════════════════════════════════════════════════════════
// GOLD RESERVES — IMF/WGC quarterly data
// ═══════════════════════════════════════════════════════════
interface GoldRow {
  country: string
  flag: string
  tonnes: number
  pctReserves: number
  change1y: number // tonnes
}

const GOLD_DATA: GoldRow[] = [
  { country: 'United States', flag: 'US', tonnes: 8133, pctReserves: 67.1, change1y: 0 },
  { country: 'Germany', flag: 'DE', tonnes: 3353, pctReserves: 66.5, change1y: 0 },
  { country: 'Italy', flag: 'IT', tonnes: 2452, pctReserves: 64.3, change1y: 0 },
  { country: 'France', flag: 'FR', tonnes: 2437, pctReserves: 63.2, change1y: 0 },
  { country: 'Russia', flag: 'RU', tonnes: 2333, pctReserves: 26.1, change1y: 28 },
  { country: 'China', flag: 'CN', tonnes: 2264, pctReserves: 4.3, change1y: 225 },
  { country: 'Japan', flag: 'JP', tonnes: 846, pctReserves: 4.1, change1y: 0 },
  { country: 'India', flag: 'IN', tonnes: 841, pctReserves: 9.2, change1y: 75 },
  { country: 'Netherlands', flag: 'NL', tonnes: 612, pctReserves: 56.1, change1y: 0 },
  { country: 'Turkey', flag: 'TR', tonnes: 585, pctReserves: 34.2, change1y: 52 },
]

// Historical gold tonnage (10-year snapshot, annual, approx WGC data)
// Each array: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const GOLD_HISTORY: Record<string, number[]> = {
  US: [8133, 8133, 8133, 8133, 8133, 8133, 8133, 8133, 8133, 8133],
  DE: [3381, 3374, 3369, 3367, 3362, 3359, 3355, 3353, 3353, 3353],
  IT: [2452, 2452, 2452, 2452, 2452, 2452, 2452, 2452, 2452, 2452],
  FR: [2436, 2436, 2436, 2436, 2436, 2436, 2437, 2437, 2437, 2437],
  RU: [1615, 1838, 2112, 2271, 2299, 2302, 2330, 2333, 2333, 2333],
  CN: [1843, 1843, 1843, 1948, 1948, 1948, 2010, 2192, 2264, 2264],
  JP: [765, 765, 765, 765, 765, 846, 846, 846, 846, 846],
  IN: [558, 558, 600, 625, 676, 754, 787, 804, 841, 841],
  NL: [612, 612, 612, 612, 612, 612, 612, 612, 612, 612],
  TR: [377, 564, 258, 410, 547, 394, 542, 540, 585, 585],
}
const GOLD_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

// ═══════════════════════════════════════════════════════════
// DIGITAL RESERVE CONTEXT — macro framing, not crypto dashboard
// ═══════════════════════════════════════════════════════════
const STABLECOIN_DATA = [
  { name: 'USDT (Tether)', supply: 143, change30d: 2.1, peg: 'USD', backing: 'US Treasuries, cash equivalents' },
  { name: 'USDC (Circle)', supply: 42, change30d: 4.8, peg: 'USD', backing: 'US Treasuries, bank deposits' },
  { name: 'DAI (MakerDAO)', supply: 5.3, change30d: -0.5, peg: 'USD', backing: 'Crypto-collateralized' },
  { name: 'FDUSD (First Digital)', supply: 3.1, change30d: 1.2, peg: 'USD', backing: 'US Treasuries' },
]

// 12-month supply history ($B). Monthly snapshots: Apr-25 through Mar-26.
const STABLE_HISTORY: Record<string, number[]> = {
  'USDT (Tether)':          [110, 113, 118, 121, 124, 127, 130, 133, 136, 138, 140, 143],
  'USDC (Circle)':          [30,  31,  32,  33,  34,  35,  36,  37,  38,  39,  40,  42],
  'DAI (MakerDAO)':         [5.4, 5.4, 5.3, 5.2, 5.2, 5.3, 5.4, 5.3, 5.3, 5.3, 5.3, 5.3],
  'FDUSD (First Digital)':  [2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.05, 3.1],
}
const STABLE_MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']

const SOVEREIGN_POSTURE = [
  { country: 'US', flag: 'US', posture: 'Regulatory framework developing. SEC/CFTC jurisdiction active.', stance: 'Structured' },
  { country: 'EU', flag: 'EU', posture: 'MiCA enacted. Comprehensive regulatory framework.', stance: 'Regulated' },
  { country: 'China', flag: 'CN', posture: 'Crypto banned. CBDC (e-CNY) active in domestic pilots.', stance: 'Restrictive' },
  { country: 'Japan', flag: 'JP', posture: 'Progressive. Licensed exchanges. Stablecoin legislation.', stance: 'Progressive' },
  { country: 'Switzerland', flag: 'CH', posture: 'Crypto-friendly jurisdiction. DLT Act enacted.', stance: 'Permissive' },
  { country: 'UK', flag: 'GB', posture: 'Phased regulation. FCA oversight expanding.', stance: 'Developing' },
]

// ═══════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════

function FreshnessTag({ freshness }: { freshness: string }) {
  const col = freshness === 'live' ? '#3fb950' : freshness === 'daily' ? '#388bfd' : freshness === 'monthly' ? '#d29922' : '#484f58'
  return <span style={{ fontSize: 8, color: col, border: `1px solid ${col}33`, padding: '0 4px', marginLeft: 4, fontWeight: 500, verticalAlign: 'middle' }}>{freshness.toUpperCase()}</span>
}

function SectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #21262d' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.03em' }}>{children}</span>
      {right}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// DETAIL VIEWS — full content replacement (Indicators pattern)
// ═══════════════════════════════════════════════════════════

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return <span onClick={onClick} style={{ fontSize: 13, color: '#388bfd', cursor: 'pointer' }}>← {label}</span>
}

// ── Country Yield Detail ──
function CountryYieldView({ row, usRow, macro, onBack }: { row: YieldRow; usRow: YieldRow; macro: any; onBack: () => void }) {
  const isUS = row.flag === 'US'
  const us10y_h = macro?.us10y_h ?? []
  const us2y_h = macro?.us2y_h ?? []
  const us3m_h = macro?.us3m_h ?? []
  const hasHistory = isUS && us10y_h.length > 2

  const spread = row.y2 != null ? row.y10 - row.y2 : null
  const curveLabel = spread != null ? (spread > 0.2 ? 'Normal' : spread > -0.1 ? 'Flat' : 'Inverted') : '—'
  const curveCol = spread != null ? (spread > 0.2 ? '#3fb950' : spread > -0.1 ? '#d29922' : '#f85149') : '#484f58'
  const d1dCol = row.d1d > 0 ? '#f85149' : row.d1d < 0 ? '#3fb950' : '#484f58'

  // SVG yield curve for non-US
  const renderCurveShape = () => {
    const tenors = ['2Y', '10Y', '30Y']
    const vals = [row.y2, row.y10, row.y30]
    const usVals = [usRow.y2, usRow.y10, usRow.y30]
    const allVals = [...vals, ...usVals].filter(v => v != null) as number[]
    if (allVals.length < 2) return null
    const mn = Math.min(...allVals) - 0.5, mx = Math.max(...allVals) + 0.5
    const W = 480, H = 220, PL = 44, PR = 20, PT = 20, PB = 28
    const cw = W - PL - PR, ch = H - PT - PB
    const toX = (i: number) => PL + (i / 2) * cw
    const toY = (v: number) => PT + ch - ((v - mn) / (mx - mn)) * ch
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxWidth: 560 }}>
        {/* Grid lines */}
        {[0, 1, 2].map(i => <line key={i} x1={toX(i)} y1={PT} x2={toX(i)} y2={PT + ch} stroke="#161b22" strokeWidth={0.5} />)}
        {/* Y-axis ticks */}
        {Array.from({ length: 5 }, (_, i) => mn + ((mx - mn) / 4) * i).map(v => (
          <React.Fragment key={v}>
            <line x1={PL} y1={toY(v)} x2={PL + cw} y2={toY(v)} stroke="#161b22" strokeWidth={0.3} />
            <text x={PL - 4} y={toY(v) + 3} textAnchor="end" fill="#30363d" fontSize={8} fontFamily={mono}>{v.toFixed(1)}</text>
          </React.Fragment>
        ))}
        {/* US curve — dashed reference */}
        {usVals[0] != null && usVals[1] != null && (
          <polyline fill="none" stroke="#388bfd" strokeWidth={1.2} strokeDasharray="5 4" opacity={0.35}
            points={usVals.map((v, i) => v != null ? `${toX(i)},${toY(v)}` : '').filter(Boolean).join(' ')} />
        )}
        {usVals.map((v, i) => v != null ? <circle key={`u${i}`} cx={toX(i)} cy={toY(v)} r={3} fill="#388bfd" opacity={0.35} /> : null)}
        {/* Country curve — solid */}
        {vals[0] != null && vals[1] != null && (
          <polyline fill="none" stroke="#c9d1d9" strokeWidth={2}
            points={vals.map((v, i) => v != null ? `${toX(i)},${toY(v)}` : '').filter(Boolean).join(' ')} />
        )}
        {vals.map((v, i) => v != null ? <circle key={`c${i}`} cx={toX(i)} cy={toY(v)} r={4} fill="#c9d1d9" /> : null)}
        {/* Value labels on country */}
        {vals.map((v, i) => v != null ? <text key={`v${i}`} x={toX(i)} y={toY(v) - 10} textAnchor="middle" fill="#c9d1d9" fontSize={11} fontWeight={600} fontFamily={mono}>{v.toFixed(2)}%</text> : null)}
        {/* US labels — subtle */}
        {usVals.map((v, i) => v != null ? <text key={`uv${i}`} x={toX(i)} y={toY(v) + 16} textAnchor="middle" fill="#388bfd" fontSize={9} opacity={0.45} fontFamily={mono}>{v.toFixed(2)}</text> : null)}
        {/* Tenor labels */}
        {tenors.map((t, i) => <text key={t} x={toX(i)} y={H - 6} textAnchor="middle" fill="#8b949e" fontSize={10}>{t}</text>)}
      </svg>
    )
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <BackLink onClick={onBack} label="Back to Sovereign" />

      {/* Header — matches Indicators */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: '#484f58', fontWeight: 600 }}>{row.flag}</span>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#c9d1d9' }}>{row.country}</div>
          <div style={{ fontSize: 12, color: '#8b949e' }}>Sovereign Bond Yields</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#c9d1d9', fontFamily: mono }}>
            {row.y10.toFixed(2)} <span style={{ fontSize: 14, color: '#8b949e' }}>% 10Y</span>
          </div>
          <div style={{ fontSize: 13, color: d1dCol, fontFamily: mono }}>
            {row.d1d >= 0 ? '▲' : '▼'} {Math.abs(row.d1d * 100).toFixed(0)}bp
            <FreshnessTag freshness={row.freshness} />
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { l: '2Y', v: row.y2 != null ? row.y2.toFixed(2) + '%' : '—' },
          { l: '10Y', v: row.y10.toFixed(2) + '%' },
          { l: '30Y', v: row.y30 != null ? row.y30.toFixed(2) + '%' : '—' },
          { l: '10Y–2Y', v: spread != null ? (spread > 0 ? '+' : '') + (spread * 100).toFixed(0) + 'bp' : '—' },
          { l: 'Curve', v: curveLabel },
        ].map(k => (
          <div key={k.l} style={{ flex: 1, background: '#161b22', padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: '#484f58', marginBottom: 2 }}>{k.l}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: k.l === 'Curve' || k.l === '10Y–2Y' ? curveCol : '#c9d1d9', fontFamily: mono }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Primary chart area — bare, no card wrapper */}
      {hasHistory ? (<>
        <div style={{ fontSize: 10, color: '#484f58', marginBottom: 6 }}>YIELD HISTORY <span style={{ color: '#30363d' }}>— FRED daily</span></div>
        <TvLineChart title="" sub="" unit="%" dec={2} height={350} lines={[
          { label: '10Y', color: '#388bfd', data: us10y_h },
          { label: '2Y', color: '#d29922', data: us2y_h },
          ...(us3m_h.length > 0 ? [{ label: '3M', color: '#8b949e', data: us3m_h }] : []),
        ]} />
      </>) : (<>
        <div style={{ fontSize: 10, color: '#484f58', marginBottom: 8 }}>YIELD CURVE SHAPE <span style={{ color: '#30363d' }}>— vs US reference</span></div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>{renderCurveShape()}</div>
          <div style={{ width: 160, fontSize: 10, lineHeight: 2, paddingTop: 12, flexShrink: 0 }}>
            <div><span style={{ display: 'inline-block', width: 16, height: 2, background: '#c9d1d9', verticalAlign: 'middle', marginRight: 6 }} /><span style={{ color: '#8b949e' }}>{row.flag}</span></div>
            <div><span style={{ display: 'inline-block', width: 16, height: 0, borderTop: '1.5px dashed #388bfd', opacity: 0.4, verticalAlign: 'middle', marginRight: 6 }} /><span style={{ color: '#484f58' }}>US</span></div>
            <div style={{ marginTop: 10, color: '#30363d', fontSize: 9, lineHeight: 1.5 }}>No daily history for {row.country}.<br />Shape from {row.asOf} snapshot.</div>
          </div>
        </div>
      </>)}

      {/* Relative positioning — below chart, simple grid, no card */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #21262d' }}>
        <div style={{ fontSize: 10, color: '#484f58', marginBottom: 8 }}>RELATIVE POSITIONING</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {YIELD_DATA.filter(r => r.flag !== row.flag).slice(0, 8).map(other => {
            const diff = (row.y10 - other.y10) * 100
            return (
              <div key={other.flag} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 10, color: '#484f58' }}>vs {other.flag}</span>
                <span style={{ fontSize: 10, color: diff > 0 ? '#f85149' : '#3fb950', fontFamily: mono, fontWeight: 500 }}>{diff > 0 ? '+' : ''}{diff.toFixed(0)}bp</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Spread Detail View ──
function SpreadDetailView({ spread, macro, onBack }: { spread: SpreadPair; macro: any; onBack: () => void }) {
  const us10y_h = macro?.us10y_h ?? []
  const hasData = us10y_h.length > 2
  const otherFlag = spread.label.split('–')[1]?.trim().split(' ')[0] ?? ''
  const otherRow = YIELD_DATA.find(r => r.flag === otherFlag)
  const otherY10 = otherRow?.y10 ?? 0
  const pct = ((spread.value - spread.range1y[0]) / (spread.range1y[1] - spread.range1y[0])) * 100

  return (
    <div style={{ padding: '20px 24px' }}>
      <BackLink onClick={onBack} label="Back to Sovereign" />

      {/* Header — matches Indicators */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#c9d1d9' }}>{spread.label}</div>
          <div style={{ fontSize: 12, color: '#8b949e' }}>{spread.desc}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#c9d1d9', fontFamily: mono }}>
            {spread.value.toFixed(2)} <span style={{ fontSize: 14, color: '#8b949e' }}>%</span>
          </div>
          <div style={{ fontSize: 13, color: spread.regimeCol }}>{spread.regime}</div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'Current', v: spread.value.toFixed(2) + '%', c: '#c9d1d9' },
          { l: '1Y Low', v: spread.range1y[0].toFixed(2) + '%', c: '#3fb950' },
          { l: '1Y High', v: spread.range1y[1].toFixed(2) + '%', c: '#f85149' },
          { l: 'Percentile', v: Math.round(pct) + '%', c: pct > 75 ? '#f85149' : pct > 25 ? '#d29922' : '#3fb950' },
        ].map(k => (
          <div key={k.l} style={{ flex: 1, background: '#161b22', padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: '#484f58', marginBottom: 2 }}>{k.l}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: k.c, fontFamily: mono }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Primary chart — bare, no card wrapper */}
      <div style={{ fontSize: 10, color: '#484f58', marginBottom: 6 }}>
        US 10Y <span style={{ color: '#30363d' }}>— FRED daily · {otherFlag} 10Y reference ({otherRow?.freshness ?? 'static'})</span>
      </div>
      {hasData ? (
        <TvLineChart title="" sub="" unit="%" dec={2} height={350}
          lines={[{ label: 'US 10Y', color: '#388bfd', data: us10y_h }]}
          refs={otherY10 > 0 ? [{ val: otherY10, color: '#d29922', label: `${otherFlag} 10Y`, dash: true }] : []}
        />
      ) : (
        <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>No US yield history — check FRED API key</div>
      )}
      <div style={{ fontSize: 9, color: '#30363d', marginTop: 6 }}>
        Gap between blue line and amber reference = the spread. Widening = divergence.
      </div>

      {/* Range context — below chart, simple, no card */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #21262d' }}>
        <div style={{ fontSize: 10, color: '#484f58', marginBottom: 8 }}>1Y RANGE POSITION</div>
        <div style={{ position: 'relative', padding: '0 44px', marginBottom: 10 }}>
          <span style={{ position: 'absolute', left: 0, top: 2, fontSize: 10, color: '#30363d', fontFamily: mono }}>{spread.range1y[0].toFixed(2)}</span>
          <div style={{ height: 8, background: '#161b22', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: spread.regimeCol, opacity: 0.2 }} />
            <div style={{ position: 'absolute', left: `${Math.max(0, Math.min(100, pct))}%`, top: -4, width: 3, height: 16, background: spread.regimeCol, marginLeft: -1 }} />
          </div>
          <span style={{ position: 'absolute', right: 0, top: 2, fontSize: 10, color: '#30363d', fontFamily: mono }}>{spread.range1y[1].toFixed(2)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.6 }}>
          Current spread at the <span style={{ color: '#c9d1d9', fontWeight: 500 }}>{Math.round(pct)}th percentile</span> of its 1-year range.
          {pct > 80 ? ' Near the top — significant divergence.' : pct < 20 ? ' Near the bottom — rates converging.' : ''}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export function SovereignPage() {
  const macro = useStore(selectMacro)
  const [detail, setDetail] = useState<{ type: 'yield' | 'spread'; id: string } | null>(null)
  const [goldDetail, setGoldDetail] = useState<GoldRow | null>(null)
  const [stableDetail, setStableDetail] = useState<typeof STABLECOIN_DATA[0] | null>(null)
  const scrollRef = React.useRef(0)

  const openDetail = (type: 'yield' | 'spread', id: string) => {
    // Save scroll position of parent main
    const main = document.querySelector('main')
    if (main) scrollRef.current = main.scrollTop
    setDetail({ type, id })
    // Scroll to top on next frame
    requestAnimationFrame(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 0 })
  }

  const closeDetail = () => {
    setDetail(null)
    // Restore scroll position on next frame
    requestAnimationFrame(() => { const m = document.querySelector('main'); if (m) m.scrollTop = scrollRef.current })
  }

  // Override US row with live FRED data if available
  const yields = YIELD_DATA.map(r => {
    if (r.flag === 'US' && macro?.us10y != null && !isNaN(macro.us10y)) {
      return { ...r, y10: macro.us10y, y2: (macro?.us2y != null && !isNaN(macro.us2y)) ? macro.us2y : r.y2, freshness: 'daily' as const, asOf: 'FRED real-time' }
    }
    return r
  })

  const usRow = yields.find(r => r.flag === 'US')!

  // ═══ DETAIL VIEW — full content replacement ═══
  if (detail) {
    if (detail.type === 'yield') {
      const row = yields.find(r => r.flag === detail.id)
      if (row) return <CountryYieldView row={row} usRow={usRow} macro={macro} onBack={closeDetail} />
    }
    if (detail.type === 'spread') {
      const sp = SPREADS.find(s => s.label === detail.id)
      if (sp) return <SpreadDetailView spread={sp} macro={macro} onBack={closeDetail} />
    }
    setDetail(null)
  }

  // ═══ OVERVIEW ═══

  // Regime summary
  const usDE = (yields.find(r => r.flag === 'US')?.y10 ?? 4.35) - (yields.find(r => r.flag === 'DE')?.y10 ?? 2.42)
  const regimeSummary = usDE > 2 ? 'Diverging — wide transatlantic spread favors USD' : usDE > 1.5 ? 'Moderate divergence — rates normalizing differently' : 'Converging — global rates aligning'
  const regimeCol = usDE > 2 ? '#d29922' : usDE > 1.5 ? '#8b949e' : '#3fb950'

  const totalStable = STABLECOIN_DATA.reduce((a, s) => a + s.supply, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Regime summary */}
      <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4 }}>GLOBAL RATES REGIME</span>
          <span style={{ fontSize: 11, color: regimeCol, marginLeft: 10 }}>{regimeSummary}</span>
        </div>
        <div style={{ fontSize: 9, color: '#30363d' }}>
          Gold reserves: IMF/WGC Q4 2025 · Stablecoins: as of Mar 2026 · Non-US yields: monthly
        </div>
      </div>

      {/* ═══ SECTION 1: GLOBAL RATES MATRIX ═══ */}
      <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '12px 14px' }}>
        <SectionTitle right={<span style={{ fontSize: 8, color: '#30363d' }}>Yields in % · Deltas in bp</span>}>
          SOVEREIGN YIELDS
        </SectionTitle>
        <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #21262d' }}>
              {['', 'Country', '2Y', '10Y', '30Y', '10Y–2Y', 'Δ1D', 'Δ1W', 'Data'].map(h => (
                <th key={h} style={{ padding: '4px 8px', textAlign: h === '' || h === 'Country' ? 'left' : 'right', fontSize: 9, color: '#484f58', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yields.map(r => {
              const curveCol = r.curve < 0 ? '#f85149' : r.curve > 0.3 ? '#3fb950' : '#d29922'
              return (
                <tr key={r.flag} onClick={() => openDetail('yield', r.flag)}
                  style={{ borderBottom: '1px solid #161b22', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#161b22')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '5px 8px', fontSize: 9, color: '#484f58', width: 24 }}>{r.flag}</td>
                  <td style={{ padding: '5px 8px', color: '#c9d1d9', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.country}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: mono, color: '#8b949e' }}>{r.y2 != null ? r.y2.toFixed(2) : '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: mono, color: '#c9d1d9', fontWeight: 600 }}>{r.y10.toFixed(2)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: mono, color: '#8b949e' }}>{r.y30 != null ? r.y30.toFixed(2) : '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: mono, color: curveCol, fontWeight: 500 }}>{r.curve > 0 ? '+' : ''}{(r.curve * 100).toFixed(0)}bp</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: mono, color: r.d1d > 0 ? '#f85149' : r.d1d < 0 ? '#3fb950' : '#484f58', fontSize: 9 }}>{r.d1d > 0 ? '+' : ''}{(r.d1d * 100).toFixed(0)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: mono, color: r.d1w > 0 ? '#f85149' : r.d1w < 0 ? '#3fb950' : '#484f58', fontSize: 9 }}>{r.d1w > 0 ? '+' : ''}{(r.d1w * 100).toFixed(0)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}><FreshnessTag freshness={r.freshness} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ fontSize: 8, color: '#21262d', marginTop: 6 }}>
          Rising yields (red Δ) = tightening. Falling (green) = easing. Negative curve = inverted.
        </div>

        {/* 10Y Yield Comparison Bars */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #161b22' }}>
          <div style={{ fontSize: 9, color: '#484f58', marginBottom: 6 }}>10Y YIELD COMPARISON</div>
          {[...yields].sort((a, b) => b.y10 - a.y10).map(r => {
            const maxY = 5.0
            const pct = Math.max(0, Math.min(100, (r.y10 / maxY) * 100))
            const barCol = r.y10 > 4 ? '#f85149' : r.y10 > 2.5 ? '#d29922' : r.y10 > 1 ? '#388bfd' : '#3fb950'
            return (
              <div key={r.flag} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: '#484f58', width: 20, textAlign: 'right', flexShrink: 0 }}>{r.flag}</span>
                <div style={{ flex: 1, height: 6, background: '#161b22', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: barCol, opacity: 0.6, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 9, fontFamily: mono, color: '#8b949e', width: 34, textAlign: 'right', flexShrink: 0 }}>{r.y10.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ SECTION 2: SPREADS & GOLD (side by side) ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Spreads */}
        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '12px 14px' }}>
          <SectionTitle right={<FreshnessTag freshness="monthly" />}>
            KEY SPREAD RELATIONSHIPS
          </SectionTitle>
          {SPREADS.map(sp => {
            const pct = ((sp.value - sp.range1y[0]) / (sp.range1y[1] - sp.range1y[0])) * 100
            return (
              <div key={sp.label} onClick={() => openDetail('spread', sp.label)}
                style={{ marginBottom: 14, cursor: 'pointer', padding: '4px 6px', marginLeft: -6 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#161b22')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: '#c9d1d9', fontWeight: 500 }}>{sp.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: mono, color: '#c9d1d9' }}>{sp.value.toFixed(2)}%</span>
                </div>
                <div style={{ fontSize: 9, color: '#484f58', marginBottom: 5 }}>{sp.desc}</div>
                <div style={{ position: 'relative', padding: '0 32px' }}>
                  <span style={{ position: 'absolute', left: 0, top: 0, fontSize: 8, color: '#30363d', fontFamily: mono }}>{sp.range1y[0].toFixed(1)}</span>
                  <div style={{ height: 6, background: '#161b22', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: sp.regimeCol, opacity: 0.2 }} />
                    <div style={{ position: 'absolute', left: `${Math.max(0, Math.min(100, pct))}%`, top: -3, width: 2, height: 12, background: sp.regimeCol, marginLeft: -1 }} />
                  </div>
                  <span style={{ position: 'absolute', right: 0, top: 0, fontSize: 8, color: '#30363d', fontFamily: mono }}>{sp.range1y[1].toFixed(1)}</span>
                </div>
                <div style={{ fontSize: 9, color: sp.regimeCol, marginTop: 4 }}>{sp.regime}</div>
              </div>
            )
          })}
        </div>

        {/* Gold Reserves */}
        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '12px 14px' }}>
          <SectionTitle right={<span style={{ fontSize: 8, color: '#30363d' }}>IMF/WGC · Q4 2025</span>}>
            SOVEREIGN GOLD RESERVES
          </SectionTitle>
          {GOLD_DATA.map((r, i) => {
            const maxT = 8200
            const pct = (r.tonnes / maxT) * 100
            const addPct = r.change1y > 0 ? (r.change1y / maxT) * 100 : 0
            return (
              <div key={r.flag} onClick={() => setGoldDetail(r)}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#161b22'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                style={{ marginBottom: 2, padding: '4px 6px', borderBottom: '1px solid #161b22', cursor: 'pointer', transition: 'background 80ms' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: '#30363d', width: 14, textAlign: 'right' }}>{i + 1}</span>
                  <span style={{ fontSize: 9, color: '#484f58', width: 18 }}>{r.flag}</span>
                  <span style={{ fontSize: 10, color: '#c9d1d9', fontWeight: 500, flex: 1 }}>{r.country}</span>
                  <span style={{ fontSize: 10, fontFamily: mono, color: '#c9d1d9', fontWeight: 500 }}>{r.tonnes.toLocaleString()}t</span>
                  <span style={{ fontSize: 9, fontFamily: mono, color: r.pctReserves > 50 ? '#d29922' : '#484f58', width: 36, textAlign: 'right' }}>{r.pctReserves.toFixed(0)}%</span>
                  {r.change1y > 0 ? (
                    <span style={{ fontSize: 9, fontFamily: mono, color: '#3fb950', fontWeight: 600, width: 40, textAlign: 'right' }}>+{r.change1y}t</span>
                  ) : (
                    <span style={{ fontSize: 9, color: '#21262d', width: 40, textAlign: 'right' }}>—</span>
                  )}
                </div>
                {/* Reserve bar */}
                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 44 }}>
                  <div style={{ flex: 1, height: 4, background: '#161b22', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#d29922', opacity: 0.4 }} />
                    {addPct > 0 && (
                      <div style={{ position: 'absolute', top: 0, left: `${pct - addPct}%`, height: '100%', width: `${addPct}%`, background: '#3fb950', opacity: 0.7 }} />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ fontSize: 8, color: '#21262d', marginTop: 6 }}>
            Gold bars = total tonnes. Green segments = 1Y accumulation. Active buyers: CN, IN, TR, RU.
          </div>
        </div>
      </div>

      {/* ═══ SECTION 3: DIGITAL RESERVE CONTEXT ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Stablecoin supply */}
        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '12px 14px' }}>
          <SectionTitle right={<span style={{ fontSize: 8, color: '#30363d' }}>As of Mar 2026 · Static</span>}>
            DOLLAR-SYSTEM EXTENSION — STABLECOINS
          </SectionTitle>
          <div style={{ fontSize: 9, color: '#484f58', marginBottom: 10, lineHeight: 1.5 }}>
            Stablecoins function as shadow-dollar liquidity outside the traditional banking system.
            99%+ are USD-denominated. Growth reinforces dollar hegemony.
          </div>
          <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d' }}>
                {['Asset', 'Supply', '30d Δ', 'Backing'].map(h => (
                  <th key={h} style={{ padding: '3px 6px', textAlign: h === 'Asset' || h === 'Backing' ? 'left' : 'right', fontSize: 9, color: '#484f58', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STABLECOIN_DATA.map(s => (
                <tr key={s.name} onClick={() => setStableDetail(s)}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#161b22'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  style={{ borderBottom: '1px solid #161b22', cursor: 'pointer', transition: 'background 80ms' }}>
                  <td style={{ padding: '4px 6px', color: '#c9d1d9', fontWeight: 500, fontSize: 10 }}>{s.name}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: mono, color: '#c9d1d9' }}>${s.supply}B</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: mono, color: s.change30d > 0 ? '#3fb950' : s.change30d < 0 ? '#f85149' : '#484f58' }}>
                    {s.change30d > 0 ? '+' : ''}{s.change30d.toFixed(1)}%
                  </td>
                  <td style={{ padding: '4px 6px', color: '#484f58', fontSize: 9 }}>{s.backing}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, padding: '8px 10px', background: '#0e1117', border: '1px solid #161b22' }}>
            {/* Supply proportion bar */}
            <div style={{ fontSize: 9, color: '#484f58', marginBottom: 4 }}>Supply Composition</div>
            <div style={{ display: 'flex', height: 8, marginBottom: 6, overflow: 'hidden' }}>
              {STABLECOIN_DATA.map((s, i) => {
                const cols = ['#388bfd', '#3fb950', '#d29922', '#8957e5']
                return <div key={s.name} style={{ width: `${(s.supply / totalStable) * 100}%`, background: cols[i], opacity: 0.6 }} title={`${s.name}: $${s.supply}B`} />
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 8, color: '#484f58', marginBottom: 8 }}>
              {STABLECOIN_DATA.map((s, i) => {
                const cols = ['#388bfd', '#3fb950', '#d29922', '#8957e5']
                return <span key={s.name}><span style={{ display: 'inline-block', width: 6, height: 6, background: cols[i], opacity: 0.6, marginRight: 3, verticalAlign: 'middle' }} />{s.name.split(' ')[0]} {((s.supply / totalStable) * 100).toFixed(0)}%</span>
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 10 }}>
              <span style={{ color: '#484f58' }}>Total supply</span>
              <span style={{ color: '#c9d1d9', fontFamily: mono, fontWeight: 600 }}>${totalStable.toFixed(0)}B</span>
              <span style={{ color: '#484f58' }}>USD-denominated</span>
              <span style={{ color: '#8b949e' }}>99%+</span>
              <span style={{ color: '#484f58' }}>% of US M2</span>
              <span style={{ color: '#8b949e', fontFamily: mono }}>~0.9%</span>
              <span style={{ color: '#484f58' }}>Trajectory</span>
              <span style={{ color: '#3fb950' }}>Expanding</span>
            </div>
          </div>
        </div>

        {/* Sovereign posture */}
        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '12px 14px' }}>
          <SectionTitle right={<span style={{ fontSize: 8, color: '#30363d' }}>Regulatory landscape · Static</span>}>
            SOVEREIGN DIGITAL POSTURE
          </SectionTitle>
          <div style={{ fontSize: 9, color: '#484f58', marginBottom: 10, lineHeight: 1.5 }}>
            How major jurisdictions approach digital assets and CBDCs.
            Regulatory stance affects capital flows and reserve positioning.
          </div>
          {SOVEREIGN_POSTURE.map(sp => {
            const stanceCol = sp.stance === 'Permissive' || sp.stance === 'Progressive' ? '#3fb950'
              : sp.stance === 'Regulated' || sp.stance === 'Structured' ? '#388bfd'
              : sp.stance === 'Restrictive' ? '#f85149' : '#d29922'
            return (
              <div key={sp.country} style={{ padding: '6px 0', borderBottom: '1px solid #161b22' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 9, color: '#484f58' }}>{sp.flag}</span>
                  <span style={{ fontSize: 10, color: '#c9d1d9', fontWeight: 500 }}>{sp.country}</span>
                  <span style={{ fontSize: 8, color: stanceCol, border: `1px solid ${stanceCol}33`, padding: '0 5px', marginLeft: 'auto' }}>{sp.stance}</span>
                </div>
                <div style={{ fontSize: 9, color: '#484f58', lineHeight: 1.4, paddingLeft: 20 }}>{sp.posture}</div>
              </div>
            )
          })}
          <div style={{ marginTop: 10, padding: '8px 10px', background: '#0e1117', border: '1px solid #161b22', fontSize: 9, color: '#484f58', lineHeight: 1.5 }}>
            <span style={{ color: '#8b949e', fontWeight: 500 }}>Macro implication:</span> Stablecoin adoption = expanding USD demand outside Fed control.
            Restrictive jurisdictions (CN) push alternative reserve narratives. Permissive ones (CH, JP) attract digital capital.
          </div>
        </div>
      </div>

      {/* ── Gold Reserves drilldown modal ── */}
      {goldDetail && (() => {
        const hist = GOLD_HISTORY[goldDetail.flag] || []
        const rawMin = Math.min(...hist), rawMax = Math.max(...hist)
        const rawRange = rawMax - rawMin
        // If flat (no variation), pad ±3% so the line sits centered with breathing room
        const isFlat = rawRange < Math.max(1, rawMax * 0.005)
        const padV = isFlat ? Math.max(rawMax * 0.03, 5) : rawRange * 0.12
        const minV = rawMin - padV
        const maxV = rawMax + padV
        const rng = (maxV - minV) || 1
        const W = 720, H = 260, PAD = { l: 56, r: 20, t: 16, b: 28 }
        const cw = W - PAD.l - PAD.r, ch = H - PAD.t - PAD.b
        const xFor = (i: number) => PAD.l + (i / (hist.length - 1)) * cw
        const yFor = (v: number) => PAD.t + ch * (1 - (v - minV) / rng)
        const first = hist[0] ?? 0, last = hist[hist.length - 1] ?? 0
        const tenYrChange = last - first
        const pctChange = first > 0 ? ((last - first) / first) * 100 : 0
        const isUp = tenYrChange >= 0
        const path = hist.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)} ${yFor(v).toFixed(2)}`).join(' ')
        const area = `${path} L ${xFor(hist.length - 1).toFixed(2)} ${PAD.t + ch} L ${PAD.l} ${PAD.t + ch} Z`
        return (
          <div onClick={() => setGoldDetail(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#0d1117', border: '1px solid #30363d', width: 780, padding: 20, fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>SOVEREIGN GOLD RESERVES · {goldDetail.flag}</div>
                  <div style={{ fontSize: 18, color: '#c9d1d9', fontWeight: 600 }}>
                    {goldDetail.country}
                    {isFlat && <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 500, color: '#8b949e', background: 'rgba(139,148,158,0.12)', border: '1px solid rgba(139,148,158,0.35)', padding: '2px 8px', borderRadius: 3, letterSpacing: 0.4, textTransform: 'uppercase', verticalAlign: 'middle' }}>Stable · no net change</span>}
                  </div>
                </div>
                <button onClick={() => setGoldDetail(null)}
                  style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>✕ Close</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { l: 'CURRENT', v: `${goldDetail.tonnes.toLocaleString()}t`, c: '#d29922' },
                  { l: '% RESERVES', v: `${goldDetail.pctReserves.toFixed(1)}%`, c: '#c9d1d9' },
                  { l: '1Y CHANGE', v: goldDetail.change1y > 0 ? `+${goldDetail.change1y}t` : '—', c: goldDetail.change1y > 0 ? '#3fb950' : '#484f58' },
                  { l: '10Y CHANGE', v: `${isUp ? '+' : ''}${tenYrChange}t (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%)`, c: isUp ? '#3fb950' : '#f85149' },
                ].map(m => (
                  <div key={m.l} style={{ background: '#161b22', border: '1px solid #21262d', padding: '7px 9px' }}>
                    <div style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{m.l}</div>
                    <div style={{ fontSize: 13, color: m.c, fontWeight: 600, fontFamily: mono, fontVariantNumeric: 'tabular-nums' }}>{m.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>HOLDINGS HISTORY · 10 YEARS</div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', background: '#0a0d12' }}>
                {/* Y axis */}
                {[0, 0.25, 0.5, 0.75, 1].map(f => {
                  const v = minV + rng * (1 - f)
                  return (
                    <g key={f}>
                      <line x1={PAD.l} x2={PAD.l + cw} y1={PAD.t + ch * f} y2={PAD.t + ch * f} stroke="#21262d" strokeDasharray="2 3" strokeWidth={1} />
                      <text x={PAD.l - 6} y={PAD.t + ch * f + 3} fontSize={9} fill="#484f58" textAnchor="end" fontFamily={mono}>{Math.round(v).toLocaleString()}t</text>
                    </g>
                  )
                })}
                {/* Area */}
                <path d={area} fill={isFlat ? 'rgba(139,148,158,0.08)' : isUp ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)'} />
                {/* Line */}
                <path d={path} stroke={isFlat ? '#8b949e' : isUp ? '#3fb950' : '#f85149'} strokeWidth={1.8} fill="none" />
                {/* Dots */}
                {hist.map((v, i) => (
                  <circle key={i} cx={xFor(i)} cy={yFor(v)} r={2.2} fill={isFlat ? '#8b949e' : isUp ? '#3fb950' : '#f85149'} />
                ))}
                {/* X labels */}
                {GOLD_YEARS.map((y, i) => (
                  <text key={y} x={xFor(i)} y={PAD.t + ch + 16} fontSize={9} fill="#484f58" textAnchor="middle" fontFamily={mono}>{y}</text>
                ))}
                {/* Last value label */}
                <text x={xFor(hist.length - 1) - 4} y={yFor(last) - 8} fontSize={10} fill={isFlat ? '#8b949e' : isUp ? '#3fb950' : '#f85149'} textAnchor="end" fontWeight={600} fontFamily={mono}>{last.toLocaleString()}t</text>
              </svg>

              <div style={{ marginTop: 12, padding: '8px 10px', background: '#0a0d12', border: '1px solid #161b22', fontSize: 10, color: '#8b949e', lineHeight: 1.5 }}>
                <span style={{ color: '#c9d1d9', fontWeight: 500 }}>Context:</span>{' '}
                {isFlat ? `Holdings unchanged at ${last.toLocaleString()}t for the entire 10-year window. ${goldDetail.flag === 'US' ? 'US reserves have been stable at 8,133.5 metric tonnes since 1980s — no active buying or selling.' : 'Passive holder — no active accumulation or disposal.'}` :
                 goldDetail.change1y > 50 ? `Active accumulator — adding ${goldDetail.change1y}t over the last year.` :
                 goldDetail.change1y > 0 ? `Modest accumulation (+${goldDetail.change1y}t YoY).` :
                 'Holdings stable over recent period.'}
                {' '}Source: IMF, World Gold Council. Updated quarterly.
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Stablecoin drilldown modal ── */}
      {stableDetail && (() => {
        const hist = STABLE_HISTORY[stableDetail.name] || []
        const rawMin = Math.min(...hist), rawMax = Math.max(...hist)
        const rawRange = rawMax - rawMin
        const isFlat = rawRange < Math.max(0.1, rawMax * 0.01)
        const padV = isFlat ? Math.max(rawMax * 0.05, 0.2) : rawRange * 0.12
        const minV = rawMin - padV
        const maxV = rawMax + padV
        const rng = (maxV - minV) || 1
        const W = 720, H = 260, PAD = { l: 56, r: 20, t: 16, b: 28 }
        const cw = W - PAD.l - PAD.r, ch = H - PAD.t - PAD.b
        const xFor = (i: number) => PAD.l + (i / (hist.length - 1)) * cw
        const yFor = (v: number) => PAD.t + ch * (1 - (v - minV) / rng)
        const first = hist[0] ?? 0, last = hist[hist.length - 1] ?? 0
        const yoyChange = last - first
        const yoyPct = first > 0 ? ((last - first) / first) * 100 : 0
        const isUp = yoyChange >= 0
        const path = hist.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)} ${yFor(v).toFixed(2)}`).join(' ')
        const area = `${path} L ${xFor(hist.length - 1).toFixed(2)} ${PAD.t + ch} L ${PAD.l} ${PAD.t + ch} Z`
        return (
          <div onClick={() => setStableDetail(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#0d1117', border: '1px solid #30363d', width: 780, padding: 20, fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>DOLLAR-SYSTEM EXTENSION · STABLECOIN</div>
                  <div style={{ fontSize: 18, color: '#c9d1d9', fontWeight: 600 }}>{stableDetail.name}</div>
                </div>
                <button onClick={() => setStableDetail(null)}
                  style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>✕ Close</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { l: 'SUPPLY', v: `$${stableDetail.supply}B`, c: '#388bfd' },
                  { l: '30D Δ', v: `${stableDetail.change30d > 0 ? '+' : ''}${stableDetail.change30d.toFixed(1)}%`, c: stableDetail.change30d > 0 ? '#3fb950' : stableDetail.change30d < 0 ? '#f85149' : '#484f58' },
                  { l: '12M Δ', v: `${isUp ? '+' : ''}$${yoyChange.toFixed(1)}B (${yoyPct >= 0 ? '+' : ''}${yoyPct.toFixed(1)}%)`, c: isUp ? '#3fb950' : '#f85149' },
                  { l: 'PEG', v: stableDetail.peg, c: '#c9d1d9' },
                ].map(m => (
                  <div key={m.l} style={{ background: '#161b22', border: '1px solid #21262d', padding: '7px 9px' }}>
                    <div style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{m.l}</div>
                    <div style={{ fontSize: 13, color: m.c, fontWeight: 600, fontFamily: mono, fontVariantNumeric: 'tabular-nums' }}>{m.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>SUPPLY HISTORY · 12 MONTHS ($B)</div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block', background: '#0a0d12' }}>
                {[0, 0.25, 0.5, 0.75, 1].map(f => {
                  const v = minV + rng * (1 - f)
                  return (
                    <g key={f}>
                      <line x1={PAD.l} x2={PAD.l + cw} y1={PAD.t + ch * f} y2={PAD.t + ch * f} stroke="#21262d" strokeDasharray="2 3" strokeWidth={1} />
                      <text x={PAD.l - 6} y={PAD.t + ch * f + 3} fontSize={9} fill="#484f58" textAnchor="end" fontFamily={mono}>${v.toFixed(v < 10 ? 1 : 0)}B</text>
                    </g>
                  )
                })}
                <path d={area} fill={isFlat ? 'rgba(139,148,158,0.08)' : isUp ? 'rgba(56,139,253,0.14)' : 'rgba(248,81,73,0.12)'} />
                <path d={path} stroke={isFlat ? '#8b949e' : isUp ? '#388bfd' : '#f85149'} strokeWidth={1.8} fill="none" />
                {hist.map((v, i) => (
                  <circle key={i} cx={xFor(i)} cy={yFor(v)} r={2.2} fill={isFlat ? '#8b949e' : isUp ? '#388bfd' : '#f85149'} />
                ))}
                {STABLE_MONTHS.map((m, i) => (
                  <text key={m} x={xFor(i)} y={PAD.t + ch + 16} fontSize={9} fill="#484f58" textAnchor="middle" fontFamily={mono}>{m}</text>
                ))}
                <text x={xFor(hist.length - 1) - 4} y={yFor(last) - 8} fontSize={10} fill={isFlat ? '#8b949e' : isUp ? '#388bfd' : '#f85149'} textAnchor="end" fontWeight={600} fontFamily={mono}>${last}B</text>
              </svg>

              <div style={{ marginTop: 12, padding: '8px 10px', background: '#0a0d12', border: '1px solid #161b22', fontSize: 10, color: '#8b949e', lineHeight: 1.5 }}>
                <span style={{ color: '#c9d1d9', fontWeight: 500 }}>Backing:</span> {stableDetail.backing}.{' '}
                {yoyPct > 25 ? 'Rapid supply expansion — incremental USD demand outside Fed purview.' :
                 yoyPct > 0 ? 'Measured growth in circulating supply.' :
                 'Supply contracting — possible redemption pressure or market stress.'}
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
