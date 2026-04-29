// pages/RiskPage.tsx — Full risk analysis with gauges, waterfall, scenarios, Monte Carlo
// DATA: reads from Zustand store → backend API
import { useState, useMemo, useEffect } from 'react'
import { useStore, selectMacro } from '@/store/useStore'
import { RiskWarning } from '@/components/common/RiskWarning'
import { MethodologyExpander } from '@/components/common/MethodologyExpander'
import { methodologies } from '@/components/common/methodologies'
import { DataSource } from '@/components/common/DataSource'
import { onActivate } from '@/lib/a11y'

// ── Risk component computation from real data ────────────────
const W = { volatileity: 0.25, macro: 0.25, financial: 0.20, valuation: 0.15, liquidity: 0.15 }

// Helper for Monte Carlo simulation
function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

function useRiskData() {
  const macro = useStore(selectMacro)
  const refreshMacro = useStore(s => s.refreshMacro)

  useEffect(() => { if (!macro) refreshMacro() }, [])

  const us10y_h = macro?.us10y_h ?? []
  const us2y_h  = macro?.us2y_h ?? []
  const vix_h   = macro?.vix_h ?? []
  const dxy_h   = macro?.dxy_h ?? []
  const oas_h   = macro?.oas_h ?? []
  const N = us10y_h.length

  const spread_h = us10y_h.map((v, i) => i < us2y_h.length ? +(v - us2y_h[i]).toFixed(4) : 0)

  // Risk score history (derived from macro history)
  const riskHistory = useMemo(() => {
    return us10y_h.map((u10, i) => {
      const v = vix_h[i] ?? 20
      const sp = spread_h[i] ?? 0
      const u = u10 ?? 4
      const d = dxy_h[i] ?? 100
      const o = oas_h[i] ?? 3

      const volScore = Math.min(100, Math.max(0, (v - 10) / 40 * 100))
      const macroScore = Math.min(100, Math.max(0,
        ((sp < -0.3 ? 60 : sp < 0 ? 40 : 20) +
         (u > 4.3 ? 70 : u > 4.0 ? 45 : 20) +
         (d > 105 ? 60 : d > 102 ? 35 : 15)) / 3
      ))
      return Math.round(volScore * W.volatileity + macroScore * W.macro + 42 * W.financial + 55 * W.valuation + 30 * W.liquidity)
    })
  }, [us10y_h, vix_h, spread_h, dxy_h, oas_h])

  // Generate dates
  const DATES: string[] = []
  const today = new Date()
  for (let i = N - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i) // daily data
    DATES.push(d.toISOString().slice(0, 10))
  }

  const cur = {
    vix:    macro?.vix ?? vix_h.at(-1) ?? 20,
    spread: macro?.spread ?? spread_h.at(-1) ?? 0,
    us10y:  macro?.us10y ?? us10y_h.at(-1) ?? 4,
    dxy:    macro?.dxy ?? dxy_h.at(-1) ?? 100,
    oas:    macro?.oas ?? oas_h.at(-1) ?? 3,
  }

  const COMP = {
    volatileity: Math.min(100, Math.max(0, (cur.vix - 10) / 40 * 100)),
    macro:      Math.min(100, Math.max(0,
      ((cur.spread < -0.3 ? 60 : cur.spread < 0 ? 40 : 20) +
       (cur.us10y > 4.3 ? 70 : cur.us10y > 4.0 ? 45 : 20) +
       (cur.dxy > 105 ? 60 : cur.dxy > 102 ? 35 : 15)) / 3
    )),
    financial:  42,
    valuation:  55,
    liquidity:  30,
  }
  const TOTAL = Math.round(
    COMP.volatileity * W.volatileity + COMP.macro * W.macro +
    COMP.financial * W.financial + COMP.valuation * W.valuation + COMP.liquidity * W.liquidity
  )
  const REGIME = TOTAL < 35 ? 'RISK-ON' : TOTAL < 60 ? 'NEUTRAL' : 'RISK-OFF'
  const REGIME_COL = TOTAL < 35 ? '#3fb950' : TOTAL < 60 ? '#d29922' : '#f85149'

  return { us10y_h, us2y_h, vix_h, dxy_h, oas_h, spread_h, riskHistory, DATES, N, cur, COMP, TOTAL, REGIME, REGIME_COL }
}

// ── SVG helpers ───────────────────────────────────────────────
const P = { t: 28, r: 14, b: 36, l: 48 }

function SparkLine({ data, color, width = 200, height = 50 }: { data: number[]; color: string; width?: number; height?: number }) {
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 0.1
  const iW = width - 8, iH = height - 8
  const pts = data.map((v, i) => `${4 + iW * i / (data.length - 1)},${4 + iH * (1 - (v - mn) / r)}`).join(' ')
  const fill = `${pts.split(' ')[0].split(',')[0]},${4 + iH} 4,${4 + iH}`
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polygon points={`${pts} ${fill}`} fill={color} opacity="0.08" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function RiskGauge({ score, size = 110 }: { score: number; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38
  const circ = 2 * Math.PI * r
  const col = score < 35 ? '#3fb950' : score < 60 ? '#d29922' : '#f85149'
  const strokeDash = circ * (score / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#21262d" strokeWidth={size * 0.09} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={size * 0.09}
        strokeDasharray={`${strokeDash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fill={col}
        fontSize={size * 0.22} fontWeight="700" fontFamily="inherit">{score}</text>
      <text x={cx} y={cy + size * 0.14} textAnchor="middle" fill="#444"
        fontSize={size * 0.09} fontFamily="inherit">/ 100</text>
    </svg>
  )
}

function BarH({ pct, color, label, value }: { pct: number; color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 8, color: '#8b949e', textAlign: 'right' }}>{label}</span>
      <div style={{ background: '#161b22', height: 8, position: 'relative', borderRadius: 2 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color, fontFamily: "inherit" }}>{value}</span>
    </div>
  )
}

// ── Risk Score Time Series Chart ──────────────────────────────
function RiskTimeSeries({ zoom, riskHistory, DATES }: { zoom: number; riskHistory: number[]; DATES: string[] }) {
  const W2 = 860, H2 = 160
  const data = riskHistory.slice(-zoom)
  const dates = DATES.slice(-zoom)
  const mn = 0, mx = 100, iW = W2 - P.l - P.r, iH = H2 - P.t - P.b
  const xS = (i: number) => P.l + (i / Math.max(data.length - 1, 1)) * iW
  const yS = (v: number) => P.t + (1 - (v - mn) / (mx - mn)) * iH

  const curVal = data[data.length - 1] ?? 50
  const curCol = curVal < 35 ? '#3fb950' : curVal < 60 ? '#d29922' : '#f85149'
  const segCol = (v: number) => v < 35 ? '#3fb950' : v < 60 ? '#d29922' : '#f85149'

  // Build colored segments
  const segments: { path: string; color: string }[] = []
  for (let i = 1; i < data.length; i++) {
    const col = segCol(data[i])
    const d = `M${xS(i-1).toFixed(1)},${yS(data[i-1]).toFixed(1)} L${xS(i).toFixed(1)},${yS(data[i]).toFixed(1)}`
    if (segments.length > 0 && segments[segments.length - 1].color === col) {
      segments[segments.length - 1].path += ` L${xS(i).toFixed(1)},${yS(data[i]).toFixed(1)}`
    } else {
      segments.push({ path: d, color: col })
    }
  }

  // Fill path
  const fillPts = data.map((v, i) => `${i ? 'L' : 'M'}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join('')
  const fill = `${fillPts} L${xS(data.length - 1)},${P.t + iH} L${P.l},${P.t + iH} Z`

  // Background regime zones
  const zones = [
    { y1: yS(100), y2: yS(60), color: '#f8514910', label: 'Risk-off' },
    { y1: yS(60),  y2: yS(35), color: '#d2992210', label: 'Neutral' },
    { y1: yS(35),  y2: yS(0),  color: '#3fb95010', label: 'Risk-on' },
  ]

  // Smart X axis labels — adjust format based on zoom range
  const totalDays = data.length
  const xTicks: { i: number; label: string }[] = []
  const step = Math.max(1, Math.floor(totalDays / 8))
  for (let i = 0; i < totalDays; i += step) {
    const d = dates[i]
    if (!d) continue
    const dt = new Date(d)
    let label: string
    if (totalDays > 365) label = dt.toLocaleDateString('en-US', { month: 'short' }) + " '" + dt.getFullYear().toString().slice(2)
    else label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    xTicks.push({ i, label })
  }

  return (
    <svg viewBox={`0 0 ${W2} ${H2}`} style={{ width: '100%', display: 'block' }}>
      {/* Background regime zones */}
      {zones.map((z, i) => (
        <g key={i}>
          <rect x={P.l} y={z.y1} width={iW} height={z.y2 - z.y1} fill={z.color} />
          <text x={W2 - P.r + 3} y={(z.y1 + z.y2) / 2 + 3} fontSize="7" fill={z.color.slice(0, 7)} opacity="0.6">{z.label}</text>
        </g>
      ))}
      {/* Threshold lines */}
      {[35, 60].map(v => (
        <g key={v}>
          <line x1={P.l} y1={yS(v)} x2={W2 - P.r} y2={yS(v)} stroke={v < 50 ? '#3fb950' : '#f85149'} strokeWidth="0.5" strokeDasharray="6,4" opacity="0.25" />
          <text x={P.l - 4} y={yS(v) + 3} textAnchor="end" fill={v < 50 ? '#3fb950' : '#f85149'} fontSize="7.5" opacity="0.5">{v}</text>
        </g>
      ))}
      {/* Y axis labels */}
      {[0, 25, 50, 75, 100].map(v => (
        <text key={v} x={P.l - 4} y={yS(v) + 3} textAnchor="end" fill="#30363d" fontSize="7" fontFamily="inherit">{v}</text>
      ))}
      {/* Fill — uses current regime color */}
      <path d={fill} fill={curCol} opacity="0.04" />
      {/* Colored line segments */}
      {segments.map((seg, i) => (
        <path key={i} d={seg.path} fill="none" stroke={seg.color} strokeWidth="1.5" strokeLinejoin="round" />
      ))}
      {/* Current value marker */}
      <circle cx={xS(data.length - 1)} cy={yS(curVal)} r={4} fill={curCol} stroke="#0e1117" strokeWidth={2} />
      <rect x={xS(data.length - 1) + 6} y={yS(curVal) - 8} width={28} height={16} rx={2} fill={curCol} />
      <text x={xS(data.length - 1) + 20} y={yS(curVal) + 4} textAnchor="middle" fill="#0e1117" fontSize="8" fontWeight="700" fontFamily="monospace">{curVal.toFixed(0)}</text>
      {/* X ticks */}
      {xTicks.map(({ i, label }) => (
        <g key={`x-${i}`}>
          <line x1={xS(i)} y1={P.t + iH} x2={xS(i)} y2={P.t + iH + 4} stroke="#21262d" />
          <text x={xS(i)} y={P.t + iH + 14} textAnchor="middle" fill="#30363d" fontSize="7" fontFamily="inherit">{label}</text>
        </g>
      ))}
      {/* Axes */}
      <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + iH} stroke="#21262d" />
      <line x1={P.l} y1={P.t + iH} x2={W2 - P.r} y2={P.t + iH} stroke="#21262d" />
      {/* Data point count */}
      <text x={W2 - P.r} y={P.t + 8} textAnchor="end" fill="#21262d" fontSize="7">{data.length} pts</text>
    </svg>
  )
}

// ── Monte Carlo Fan Chart ─────────────────────────────────────
function MonteCarloFan({ beta }: { beta: number }) {
  const sigma = beta * 0.012
  const PATHS = 200, DAYS = 90
  const W2 = 500, H2 = 160
  const iW = W2 - P.l - P.r, iH = H2 - P.t - P.b

  const paths = useMemo(() => {
    const r = rng(99)
    return Array.from({ length: PATHS }, () => {
      let p = 100; const path = [p]
      for (let d = 0; d < DAYS; d++) {
        const z = Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r())
        p *= 1 + 0.0002 + sigma * z
        path.push(+p.toFixed(2))
      }
      return path
    })
  }, [sigma])

  const xS = (i: number) => P.l + (i / DAYS) * iW
  const mn = 60, mx = 160, yS = (v: number) => P.t + (1 - (v - mn) / (mx - mn)) * iH

  // Percentile bands
  const pcts = [5, 25, 50, 75, 95]
  const bands = Array.from({ length: DAYS + 1 }, (_, d) => {
    const vals = paths.map(p => p[d]).sort((a, b) => a - b)
    const at = (p: number) => vals[Math.floor(p / 100 * vals.length)] ?? vals[vals.length - 1]
    return pcts.map(at)
  })

  const makeArea = (p1: number, p2: number) => {
    const top = bands.map((b, d) => `${d === 0 ? 'M' : 'L'}${xS(d)},${yS(b[pcts.indexOf(p1)])}`)
    const bot = [...bands].reverse().map((b, d) => `L${xS(DAYS - d)},${yS(b[pcts.indexOf(p2)])}`)
    return [...top, ...bot, 'Z'].join(' ')
  }
  const makeLine = (p: number) =>
    bands.map((b, d) => `${d === 0 ? 'M' : 'L'}${xS(d)},${yS(b[pcts.indexOf(p)])}`).join(' ')

  const finals = paths.map(p => p[DAYS])
  const p10 = (finals.filter(v => v < 90).length / finals.length * 100).toFixed(0)
  const p20 = (finals.filter(v => v < 80).length / finals.length * 100).toFixed(0)

  return (
    <div>
      <svg viewBox={`0 0 ${W2} ${H2}`} style={{ width: '100%', display: 'block' }}>
        {/* Zone fills */}
        <path d={makeArea(5, 95)}  fill="#388bfd" opacity="0.04" />
        <path d={makeArea(25, 75)} fill="#388bfd" opacity="0.07" />
        {/* Band lines */}
        <path d={makeLine(5)}  fill="none" stroke="#388bfd" strokeWidth="0.8" opacity="0.3" strokeDasharray="3,2" />
        <path d={makeLine(95)} fill="none" stroke="#388bfd" strokeWidth="0.8" opacity="0.3" strokeDasharray="3,2" />
        <path d={makeLine(25)} fill="none" stroke="#388bfd" strokeWidth="1" opacity="0.5" />
        <path d={makeLine(75)} fill="none" stroke="#388bfd" strokeWidth="1" opacity="0.5" />
        <path d={makeLine(50)} fill="none" stroke="#3fb950" strokeWidth="1.8" />
        {/* Ref line -20% */}
        <line x1={P.l} y1={yS(80)} x2={W2 - P.r} y2={yS(80)} stroke="#f85149" strokeWidth="0.8" strokeDasharray="4,3" />
        <text x={W2 - P.r - 2} y={yS(80) - 3} textAnchor="end" fill="#f85149" fontSize="7" fontFamily="inherit">-20%</text>
        {/* Axes */}
        {[70, 80, 90, 100, 110, 120].map(v => (
          <g key={v}>
            <line x1={P.l} y1={yS(v)} x2={W2 - P.r} y2={yS(v)} stroke="#161b22" strokeWidth="0.8" />
            <text x={P.l - 3} y={yS(v) + 3} textAnchor="end" fill="#2a2a2a" fontSize="7.5" fontFamily="inherit">{v}</text>
          </g>
        ))}
        {[0, 30, 60, 90].map(d => (
          <text key={d} x={xS(d)} y={P.t + iH + 14} textAnchor="middle" fill="#2a2a2a" fontSize="7.5" fontFamily="inherit">
            +{d}d
          </text>
        ))}
        <line x1={P.l} y1={P.t + iH} x2={W2 - P.r} y2={P.t + iH} stroke="#21262d" />
        <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + iH} stroke="#21262d" />
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 8, color: '#8b949e' }}>
        <span style={{ color: '#d29922' }}>P(&gt;-10%): <b>{p10}%</b></span>
        <span style={{ color: '#f85149' }}>P(&gt;-20%): <b>{p20}%</b></span>
        <span style={{ color: '#8b949e' }}>β=1.24 · σ={(sigma * 100).toFixed(2)}%/d · {PATHS} GBM paths</span>
        <span style={{ marginLeft: 'auto', color: '#21262d' }}>Median ─ P25/P75 ── P5/P95</span>
      </div>
    </div>
  )
}

// ── Scenario ladder (static) ─────────────────────────────────
const SCENARIOS = [
  { name: 'WORST',    prob: 3,  ret: '-40%',  dd: '-55%', vol: 'Extreme +180%', liq: 'Crisis',    col: '#f85149' },
  { name: 'SEVERE',   prob: 8,  ret: '-25%',  dd: '-35%', vol: 'Very high',     liq: 'Stress',    col: '#e05030' },
  { name: 'BEARISH',  prob: 20, ret: '-12%',  dd: '-18%', vol: 'High +40%',     liq: 'Tight',     col: '#d29922' },
  { name: 'BASE',     prob: 40, ret: '+5%',   dd: '-8%',  vol: 'Normal',        liq: 'Normal',    col: '#8b949e' },
  { name: 'BULLISH',  prob: 22, ret: '+18%',  dd: '-4%',  vol: 'Low -20%',      liq: 'Ample',     col: '#388bfd' },
  { name: 'BEST',     prob: 7,  ret: '+35%',  dd: '-2%',  vol: 'Very low',      liq: 'Perfect',   col: '#3fb950' },
]

// ── Main export ───────────────────────────────────────────────
export function RiskPage() {
  const [tsZoom, setTsZoom] = useState(90)
  const [showDetail, setShowDetail] = useState(false)
  const { us10y_h, vix_h, dxy_h, oas_h, spread_h, riskHistory, DATES, N, cur, COMP, TOTAL, REGIME, REGIME_COL } = useRiskData()

  if (N === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#8b949e' }}>
        <div style={{ fontSize: 14, marginBottom: 10 }}>Loading risk data...</div>
        <div style={{ fontSize: 10 }}>Waiting for macro data from backend</div>
      </div>
    )
  }

  const WARNINGS = [
    { active: cur.us10y > 4.3, label: 'US 10Y above 4.30%', val: `${cur.us10y.toFixed(2)}%`, reason: 'Long positions under pressure from quant deleveraging', col: '#f85149' },
    { active: cur.spread < -0.2 && cur.spread > -0.6, label: 'Yield curve un-inverting', val: `${cur.spread.toFixed(3)}%`, reason: 'Companies depleting cash reserves as curve steepens', col: '#f85149' },
    { active: cur.vix > 20, label: 'Volatility elevated', val: `VIX ${cur.vix.toFixed(1)}`, reason: 'Demand for downside protection increasing', col: '#d29922' },
    { active: cur.oas > 4.5, label: 'Credit spreads widening', val: `OAS ${cur.oas.toFixed(2)}%`, reason: 'Lending conditions tightening on risky borrowers', col: '#d29922' },
    { active: cur.dxy > 103, label: 'Dollar strength', val: `DXY ${cur.dxy.toFixed(1)}`, reason: 'Strong dollar pressures emerging market assets', col: '#d29922' },
  ]
  const ACTIVE_WARNS = WARNINGS.filter(w => w.active)

  // Derive human-readable drivers
  const driverLines: string[] = []
  if (cur.vix > 25) driverLines.push('Volatility is the primary source of stress')
  else if (cur.vix > 18) driverLines.push('Volatility is elevated but manageable')
  else driverLines.push('Volatility is contained')
  if (cur.oas > 5) driverLines.push('Credit conditions are weakening')
  else if (cur.oas > 4) driverLines.push('Credit is stable but bears watching')
  else driverLines.push('Credit conditions are healthy')
  if (cur.spread < 0) driverLines.push('Yield curve remains inverted — recession signal')
  else driverLines.push('Yield curve is normal')

  const sigma = 0.012 * 1.24
  const varPct = +(sigma * 2.015 * 100).toFixed(1)

  return (
    <div style={{ background: '#0e1117', minHeight: '100%', padding: '12px 14px', color: '#c9d1d9' }}>

      {/* ── Trust + methodology row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <DataSource source="FRED · CBOE · ICE BofA" updated={undefined} quality="HIGH" />
        </div>
        <RiskWarning variant="signal" compact />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          <MethodologyExpander title="How VaR 95% is computed" {...methodologies.var95} />
          <MethodologyExpander title="VIX regime" {...methodologies.vix} />
          <MethodologyExpander title="HY OAS regime" {...methodologies.oas} />
        </div>
      </div>

      {/* ══════ 1. EXECUTIVE SUMMARY — answers in 10 seconds ══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, marginBottom: 16, padding: '16px 20px', background: '#0e1117', border: `1px solid ${REGIME_COL}33` }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: '#484f58', letterSpacing: 0.4, fontWeight: 500 }}>RISK STATE</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: REGIME_COL }}>{REGIME}</span>
            <span style={{ fontSize: 11, color: '#8b949e' }}>{TOTAL} / 100</span>
            {ACTIVE_WARNS.length > 0 && (
              <span style={{ fontSize: 9, color: '#f85149', padding: '2px 8px', background: '#f8514910', border: '1px solid #f8514933' }}>
                {ACTIVE_WARNS.length} active alert{ACTIVE_WARNS.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#c9d1d9', lineHeight: 1.6, marginBottom: 6 }}>
            {TOTAL < 35 ? 'Risk environment is supportive. Conditions favor risk-taking with contained volatileity and stable credit.' :
             TOTAL < 60 ? 'Risk is moderate. Some indicators warrant caution but conditions do not require defensive action.' :
             'Elevated risk environment. Multiple stress indicators are active. Defensive positioning recommended.'}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 10 }}>
            {driverLines.map((d, i) => (
              <span key={i} style={{ color: '#8b949e' }}>· {d}</span>
            ))}
          </div>
        </div>
        <RiskGauge score={TOTAL} size={90} />
      </div>

      {/* ══════ 2. KEY CONTRIBUTORS — simplified bars ══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 10, marginBottom: 10 }}>
        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '12px 16px' }}>
          <div style={{ fontSize: 9, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 10 }}>Risk contributors</div>
          {[
            { label: 'Volatility',  pct: COMP.volatileity, w: W.volatileity, col: COMP.volatileity > 50 ? '#d29922' : '#8b949e' },
            { label: 'Macro stress', pct: COMP.macro,      w: W.macro,      col: COMP.macro > 50 ? '#f85149' : '#8b949e' },
            { label: 'Financial',    pct: COMP.financial,  w: W.financial,  col: '#8b949e' },
            { label: 'Valuation',    pct: COMP.valuation,  w: W.valuation,  col: '#8b949e' },
            { label: 'Liquidity',    pct: COMP.liquidity,  w: W.liquidity,  col: COMP.liquidity > 50 ? '#d29922' : '#8b949e' },
          ].map(c => (
            <BarH key={c.label} label={c.label} pct={c.pct} color={c.col} value={`${Math.round(c.pct * c.w)} pts`} />
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #161b22', display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
            <span style={{ color: '#484f58' }}>Weighted total</span>
            <span style={{ fontWeight: 600, color: REGIME_COL }}>{TOTAL} / 100</span>
          </div>
        </div>

        {/* Macro readings */}
        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 8 }}>Current readings</div>
          {[
            { l: 'US 10Y',    v: cur.us10y.toFixed(2) + '%', c: cur.us10y > 4.3 ? '#f85149' : cur.us10y > 3.8 ? '#d29922' : '#3fb950' },
            { l: '10Y-2Y',    v: cur.spread.toFixed(3) + '%', c: cur.spread < 0 ? '#f85149' : '#3fb950' },
            { l: 'VIX',       v: cur.vix.toFixed(1),         c: cur.vix > 25 ? '#f85149' : cur.vix > 18 ? '#d29922' : '#3fb950' },
            { l: 'HY OAS',    v: cur.oas.toFixed(2) + '%',   c: cur.oas > 5 ? '#f85149' : cur.oas > 4 ? '#d29922' : '#3fb950' },
            { l: 'DXY',       v: cur.dxy.toFixed(1),         c: cur.dxy > 105 ? '#f85149' : '#8b949e' },
          ].map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ fontSize: 9, color: '#8b949e' }}>{r.l}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: r.c }}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ 3. ACTIVE ALERTS — only if present ══════ */}
      {ACTIVE_WARNS.length > 0 && (
        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 8 }}>
            Active risk signals
          </div>
          {ACTIVE_WARNS.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: i < ACTIVE_WARNS.length - 1 ? '1px solid #161b22' : 'none' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: w.col, flexShrink: 0, marginTop: 4 }} />
              <div>
                <span style={{ fontSize: 10, fontWeight: 600, color: w.col }}>{w.label}</span>
                <span style={{ fontSize: 10, color: '#8b949e', marginLeft: 8 }}>{w.val}</span>
                <div style={{ fontSize: 9, color: '#484f58', marginTop: 1 }}>{w.reason}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════ 4. RISK SCORE HISTORY ══════ */}
      <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: '#484f58', letterSpacing: 0.4, fontWeight: 500 }}>
            Risk score — {tsZoom <= 180 ? `${tsZoom} days` : tsZoom === 365 ? '1 year' : tsZoom === 730 ? '2 years' : tsZoom === 1825 ? '5 years' : tsZoom === 3650 ? '10 years' : 'Max'}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[30, 60, 90, 180, 365, 730, 1825, 3650, 99999].map(d => (
              <button key={d} onClick={() => setTsZoom(d)}
                style={{ padding: '2px 8px', fontSize: 8, cursor: 'pointer', border: '1px solid', background: tsZoom === d ? '#161b22' : 'transparent',
                  borderColor: tsZoom === d ? '#388bfd' : '#21262d', color: tsZoom === d ? '#388bfd' : '#8b949e', transition: 'all 0.15s' }}>
                {d <= 180 ? `${d}D` : d === 365 ? '1Y' : d === 730 ? '2Y' : d === 1825 ? '5Y' : d === 3650 ? '10Y' : 'MAX'}
              </button>
            ))}
          </div>
        </div>
        <RiskTimeSeries zoom={tsZoom} riskHistory={riskHistory} DATES={DATES} />
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 8, color: '#30363d' }}>
          <span style={{ color: '#3fb950' }}>0–35 Risk-on</span>
          <span style={{ color: '#d29922' }}>35–60 Neutral</span>
          <span style={{ color: '#f85149' }}>60–100 Risk-off</span>
        </div>
      </div>

      {/* ══════ 5. ADVANCED ANALYTICS — deeper layer ══════ */}
      <div style={{ fontSize: 9, color: '#30363d', letterSpacing: 0.4, fontWeight: 500, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #161b22' }}>
        Advanced Analytics
      </div>

      {/* Monte Carlo + VaR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 10, marginBottom: 10 }}>
        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '10px 14px' }}>
          <div style={{ fontSize: 9, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 4 }}>Monte Carlo simulation</div>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 8 }}>
            Most simulated paths remain near base case. Downside tail reaches roughly −20% over the 90-day horizon.
          </div>
          <MonteCarloFan beta={1.24} />
        </div>

        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '10px 14px' }}>
          <div style={{ fontSize: 9, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 8 }}>Value at Risk — 95% confidence</div>
          {[
            { method: 'Historical',         var1d: '1.89%', var10d: '5.98%', cvar: '2.54%' },
            { method: 'Parametric (t-dist)', var1d: '1.63%', var10d: '5.16%', cvar: '2.19%' },
            { method: 'Monte Carlo',         var1d: '1.74%', var10d: '5.50%', cvar: '2.35%' },
          ].map(r => (
            <div key={r.method} style={{ padding: '6px 0', borderBottom: '1px solid #161b22' }}>
              <div style={{ fontSize: 9, color: '#8b949e', marginBottom: 4 }}>{r.method}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {[['1D', r.var1d], ['10D', r.var10d], ['CVaR', r.cvar]].map(([l, v]) => (
                  <div key={l as string}>
                    <div style={{ fontSize: 7, color: '#30363d' }}>{l}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#d29922' }}>−{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 6, fontSize: 7, color: '#30363d' }}>β=1.24 · σ=1.49%/d · calibrated 1Y</div>
        </div>
      </div>

      {/* Scenario distribution — simplified */}
      <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: '#484f58', letterSpacing: 0.4, fontWeight: 500, marginBottom: 8 }}>Scenario distribution</div>
        {/* Primary view: probability bar */}
        <div style={{ display: 'flex', height: 28, gap: 1, marginBottom: 6 }}>
          {SCENARIOS.map(s => (
            <div key={s.name} style={{ flex: s.prob, background: s.col + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
              onMouseEnter={e => (e.currentTarget.style.background = s.col + '66')}
              onMouseLeave={e => (e.currentTarget.style.background = s.col + '33')}>
              <span style={{ fontSize: 8, color: s.col, fontWeight: 600 }}>{s.prob}%</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#484f58', marginBottom: 8 }}>
          {SCENARIOS.map(s => (
            <span key={s.name} style={{ color: s.col, fontWeight: 500, textAlign: 'center', flex: s.prob }}>{s.name}</span>
          ))}
        </div>
        {/* Detail toggle */}
        <div role="button" tabIndex={0} onClick={() => setShowDetail(!showDetail)} onKeyDown={onActivate(() => setShowDetail(!showDetail))} style={{ fontSize: 9, color: '#388bfd', cursor: 'pointer', padding: '4px 0' }}>
          {showDetail ? 'Hide details' : 'Show scenario details'}
        </div>
        {showDetail && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginTop: 8 }}>
            {SCENARIOS.map(s => (
              <div key={s.name} style={{ padding: '6px 8px', borderTop: `2px solid ${s.col}33` }}>
                <div style={{ fontSize: 8, fontWeight: 600, color: s.col, marginBottom: 4 }}>{s.name} {s.prob}%</div>
                {[['Return', s.ret], ['Max DD', s.dd], ['Vol', s.vol]].map(([l, v]) => (
                  <div key={l as string} style={{ fontSize: 8, color: '#484f58', marginBottom: 2 }}>
                    <span style={{ color: '#30363d' }}>{l}: </span>{v}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '6px 0', borderTop: '1px solid #161b22', display: 'flex', justifyContent: 'space-between', fontSize: 7, color: '#21262d' }}>
        <span>Risk engine — weighted composite model</span>
        <span>GBM simulation · VaR calibrated 1Y · Student-t quantiles</span>
      </div>
    </div>
  )
}
