// pages/Saturday.tsx — CHAQUE SAMEDI: REVUE FINANCIÈRE
// Same data logic, TradingView styling
import { useState, useEffect, useMemo } from 'react'
import { useStore, selectMacro, selectCOT } from '@/store/useStore'
import { onActivate } from '@/lib/a11y'

function chg(now: number, prev: number) { return now - prev }
function pct(now: number, prev: number) { return ((now - prev) / Math.abs(prev) * 100) }

// ── Regime engine (UNCHANGED) ───────────────────────────────
function computeRegime(d: Record<string, any>) {
  let bearScore = 0
  const signals: { label: string; val: string; bear: boolean; reason: string }[] = []
  if (d.us10y > 4.3) { bearScore++; signals.push({ label:'US10Y >4.3%', val:`${d.us10y.toFixed(2)}%`, bear:true, reason:'Zone danger: rotation obligataire' }) }
  else { signals.push({ label:'US10Y OK', val:`${d.us10y.toFixed(2)}%`, bear:false, reason:'Taux acceptable' }) }
  if (d.spread > 0.1) { signals.push({ label:'Spread Phase A', val:`${d.spread.toFixed(3)}%`, bear:false, reason:'Courbe normale: économie saine' }) }
  else if (d.spread > -0.1) { bearScore++; signals.push({ label:'Spread Phase C', val:`${d.spread.toFixed(3)}%`, bear:true, reason:'DANGER: remontée vers zéro' }) }
  else { bearScore++; signals.push({ label:'Spread Inverted', val:`${d.spread.toFixed(3)}%`, bear:true, reason:'Inversion: récession probable' }) }
  if (d.vix < 18) { signals.push({ label:'VIX Calme', val:d.vix.toFixed(1), bear:false, reason:'<18: zone idéale' }) }
  else if (d.vix < 25) { bearScore++; signals.push({ label:'VIX Stress', val:d.vix.toFixed(1), bear:true, reason:'18–25: market stressed' }) }
  else { bearScore++; signals.push({ label:'VIX Panic', val:d.vix.toFixed(1), bear:true, reason:'>25: peur élevée' }) }
  const hygDelta = chg(d.hyg_lqd, d.hyg_lqd_prev)
  if (hygDelta < -0.015) { bearScore++; signals.push({ label:'HYG/LQD Alerte', val:d.hyg_lqd.toFixed(3), bear:true, reason:`Baisse ${(hygDelta*100).toFixed(2)}% en 1 semaine` }) }
  else if (d.hyg_lqd > 0.83) { signals.push({ label:'HYG/LQD OK', val:d.hyg_lqd.toFixed(3), bear:false, reason:'Confiance crédit' }) }
  else { bearScore++; signals.push({ label:'HYG/LQD Faible', val:d.hyg_lqd.toFixed(3), bear:true, reason:'Stress crédit modéré' }) }
  if (d.oas < 4) { signals.push({ label:'OAS <4% Sain', val:`${d.oas.toFixed(2)}%`, bear:false, reason:'Spreads compressés' }) }
  else if (d.oas < 6) { bearScore++; signals.push({ label:'OAS Vigilance', val:`${d.oas.toFixed(2)}%`, bear:true, reason:'4–6%: primes risque élevées' }) }
  else { bearScore++; signals.push({ label:'OAS Crise', val:`${d.oas.toFixed(2)}%`, bear:true, reason:'>6%: crise high yield' }) }
  if (d.rsp_spy > 0.95) { signals.push({ label:'Breadth Large', val:d.rsp_spy.toFixed(3), bear:false, reason:'Rally démocratique' }) }
  else if (d.rsp_spy > 0.90) { bearScore++; signals.push({ label:'Breadth Étroite', val:d.rsp_spy.toFixed(3), bear:true, reason:'Mégas caps seulement' }) }
  else { bearScore++; signals.push({ label:'Breadth Danger', val:d.rsp_spy.toFixed(3), bear:true, reason:'Concentration extrême' }) }
  if (d.dxy > 106) { bearScore++; signals.push({ label:'DXY Fort', val:d.dxy.toFixed(1), bear:true, reason:'>106: pression actions' }) }
  else { signals.push({ label:'DXY Neutre', val:d.dxy.toFixed(1), bear:false, reason:'Liquidité acceptable' }) }
  const regime = bearScore <= 1 ? 'RISK-ON' : bearScore <= 3 ? 'NEUTRAL' : 'RISK-OFF'
  const col = bearScore <= 1 ? '#3fb950' : bearScore <= 3 ? '#d29922' : '#f85149'
  return { bearScore, signals, regime, col }
}

// ── Sparkline ──────────────────────────────────────────────
function Spark7({ data, col }: { data: number[]; col: string }) {
  if (!data || data.length < 2) return <span style={{ color: '#8b949e' }}>—</span>
  const pts = data.slice(-14)
  const w = 90, h = 24, pad = 2
  const mn = Math.min(...pts), mx = Math.max(...pts), rng = mx - mn || 0.001
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${pad + (w - 2 * pad) * i / (pts.length - 1)},${h - pad - ((v - mn) / rng) * (h - 2 * pad)}`).join(' ')
  return <svg width={w} height={h} style={{ verticalAlign: 'middle' }}><path d={d} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" /></svg>
}

// ── Signal badge ──────────────────────────────────────────
function Badge({ bear, label, val }: { bear: boolean; label: string; val: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', fontSize: 10, fontWeight: 400,
      background: bear ? '#f8514915' : '#3fb95015',
      border: `1px solid ${bear ? '#f8514933' : '#3fb95033'}`,
      color: bear ? '#f85149' : '#3fb950',
    }}>
      {bear ? '▼' : '▲'} {label} <span style={{ fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>{val}</span>
    </span>
  )
}

// ── Section (collapsible) ──────────────────────────────────
function Section({ num, title, rows }: {
  num: string; title: string
  rows: { label: string; val: string; chgVal: string; chgUp: boolean; zone: string; zoneCol: string; explain: string; spark: number[] }[]
}) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: 0 }}>
      <div role="button" tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={onActivate(() => setOpen(!open))}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #21262d' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <span style={{ fontSize: 10, fontWeight: 500, color: '#484f58', padding: '0',  }}>{num}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#c9d1d9' }}>{title}</span>
        <span style={{ marginLeft: 'auto', color: '#8b949e', fontSize: 11 }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && rows.map((r, i) => (
        <div key={i} style={{ padding: '12px 14px', borderBottom: i < rows.length - 1 ? '1px solid #21262d' : 'none', display: 'grid', gridTemplateColumns: '130px 160px 1fr 90px', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#8b949e' }}>{r.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: r.zoneCol, fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>{r.val}</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: r.chgUp ? '#3fb950' : '#f85149' }}>
              {r.chgUp ? '▲' : '▼'}{r.chgVal}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 500, color: r.zoneCol, display: 'inline-block', marginBottom: 4 }}>
              {r.zone}
            </span>
            <div style={{ fontSize: 10, color: '#8b949e', lineHeight: 1.5 }}>{r.explain}</div>
          </div>
          <Spark7 data={r.spark} col={r.zoneCol} />
        </div>
      ))}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────
export function SaturdayPage() {
  const macro = useStore(selectMacro)
  const cot = useStore(selectCOT)
  const refreshMacro = useStore(s => s.refreshMacro)
  const refreshCOT = useStore(s => s.refreshCOT)

  useEffect(() => {
    if (!macro) refreshMacro()
    if (!cot || cot.length === 0) refreshCOT()
  }, [])

  const weekRange = useMemo(() => {
    if (!macro?.updated) return ''
    const end = new Date(macro.updated)
    const start = new Date(end); start.setDate(start.getDate() - 7)
    return `${start.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })} – ${end.toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}`
  }, [macro?.updated])

  if (!macro) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#8b949e', fontSize: 13 }}>
        Chargement des données macro...
        <div style={{ marginTop: 8, fontSize: 11 }}>Backend must be running with FRED key configured</div>
      </div>
    )
  }

  const m = macro as any
  const h = (k: string) => (m[k + '_h'] ?? []) as number[]
  const prev = (arr: number[], n = 8) => arr.at(-n) ?? arr.at(-1) ?? 0

  const d = {
    us10y: m.us10y ?? 0, us10y_prev: prev(h('us10y')), us10y_h: h('us10y'),
    us2y: m.us2y ?? 0, us2y_prev: prev(h('us2y')), us2y_h: h('us2y'),
    spread: m.spread ?? 0,
    vix: m.vix ?? 0, vix_prev: prev(h('vix')), vix_h: h('vix'),
    hyg_lqd: m.hyg_lqd ?? 0, hyg_lqd_prev: prev(h('hyg_lqd')), hyg_h: h('hyg_lqd'),
    oas: m.oas ?? 0, oas_prev: prev(h('oas')), oas_h: h('oas'),
    rsp_spy: m.rsp_spy ?? 0, rsp_spy_prev: prev(h('rsp_spy')), rsp_h: h('rsp_spy'),
    dxy: m.dxy ?? 0, dxy_prev: prev(h('dxy')), dxy_h: h('dxy'),
    wti: m.wti ?? 0, wti_prev: prev(h('wti')), wti_h: h('wti'),
    cot_sp: (cot ?? []).find((c: any) => c.n?.includes('S&P') || c.n?.includes('E-MINI')),
  }
  const spread_h = d.us10y_h.length > 0 && d.us2y_h.length > 0
    ? d.us10y_h.slice(-Math.min(d.us10y_h.length, d.us2y_h.length)).map((v: number, i: number) => v - d.us2y_h.slice(-Math.min(d.us10y_h.length, d.us2y_h.length))[i])
    : []

  const { bearScore, signals, regime, col } = computeRegime(d)

  return (
    <div style={{ padding: 16, minHeight: '100%', color: '#c9d1d9' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.02em' }}>REVUE HEBDOMADAIRE</div>
          <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{weekRange} · 100% quantitative analysis</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: col, border: `1px solid ${col}33` }}>
            {regime}
          </span>
          <span style={{ fontSize: 11, color: '#8b949e' }}>{bearScore}/7 bear signals</span>
        </div>
      </div>

      {/* Signal badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {signals.map((s, i) => <Badge key={i} bear={s.bear} label={s.label} val={s.val} />)}
      </div>

      {/* Sections — same data, same order */}
      <Section num="01" title="LES TAUX — Le coût de l'argent" rows={[
        { label:'US 10Y Yield', val:d.us10y.toFixed(2)+'%', chgVal:Math.abs(d.us10y-d.us10y_prev).toFixed(3)+'%', chgUp:d.us10y>d.us10y_prev,
          zone:d.us10y>4.3?'DANGER >4.3%':d.us10y>3.8?'FRICTION':'OK',
          zoneCol:d.us10y>4.3?'#f85149':d.us10y>3.8?'#d29922':'#3fb950',
          explain:'Taux sans risque. >4.3% → quants coupent longs. Chaque +0.5% rapide risque correction.',
          spark:d.us10y_h.slice(-14) },
        { label:'US 2Y Yield', val:d.us2y.toFixed(2)+'%', chgVal:Math.abs(d.us2y-d.us2y_prev).toFixed(3)+'%', chgUp:d.us2y>d.us2y_prev,
          zone:d.us2y>5?'HIGH':'OK', zoneCol:d.us2y>5?'#d29922':'#3fb950',
          explain:'Piloté par Fed Funds. US2Y>US10Y = inversion = signal récession.',
          spark:d.us2y_h.slice(-14) },
        { label:'10Y–2Y Spread', val:d.spread.toFixed(2)+'%', chgVal:Math.abs(d.spread-(d.us10y_prev-d.us2y_prev)).toFixed(3)+'%', chgUp:d.spread>(d.us10y_prev-d.us2y_prev),
          zone:d.spread>0.1?'Phase A':d.spread>-0.1?'Phase C':'Phase B',
          zoneCol:d.spread>0.1?'#3fb950':d.spread>-0.1?'#f85149':'#d29922',
          explain:'US10Y−US2Y. Phase A(>0)=sain. Phase B(<0)=inversion. Phase C: remontée rapide=danger max.',
          spark:spread_h.slice(-14) },
      ]} />

      <Section num="02" title="LE CRÉDIT — Le stress financier" rows={[
        { label:'HYG/LQD Ratio', val:d.hyg_lqd.toFixed(3), chgVal:Math.abs(d.hyg_lqd-d.hyg_lqd_prev).toFixed(4), chgUp:d.hyg_lqd>d.hyg_lqd_prev,
          zone:d.hyg_lqd>0.83?'OK':'STRESS', zoneCol:d.hyg_lqd>0.83?'#3fb950':'#f85149',
          explain:'HYG/LQD. Hausse=banques prêtent. Baisse >0.02 en 1-2j = SIGNAL CRASH.',
          spark:d.hyg_h.slice(-14) },
        { label:'HY OAS', val:d.oas.toFixed(2)+'%', chgVal:Math.abs(d.oas-d.oas_prev).toFixed(3)+'%', chgUp:d.oas>d.oas_prev,
          zone:d.oas<4?'Healthy':d.oas<6?'WATCH':'CRISIS', zoneCol:d.oas<4?'#3fb950':d.oas<6?'#d29922':'#f85149',
          explain:'Option-Adjusted Spread. <4%=confiant. >6%=crise crédit.',
          spark:d.oas_h.slice(-14) },
      ]} />

      <Section num="03" title="LE POSITIONNEMENT — Le carburant" rows={[
        { label:'VIX', val:d.vix.toFixed(1), chgVal:Math.abs(d.vix-d.vix_prev).toFixed(1), chgUp:d.vix>d.vix_prev,
          zone:d.vix<18?'Calm':d.vix<25?'STRESS':d.vix<35?'🚨 Peur':'PANIC',
          zoneCol:d.vix<18?'#3fb950':d.vix<25?'#d29922':'#f85149',
          explain:'<18 calme. 18-25 nervosité. >35 PANIQUE → zone achat contrarian.',
          spark:d.vix_h.slice(-14) },
      ]} />

      <Section num="04" title="LA LARGEUR — Santé du marché" rows={[
        { label:'RSP/SPY', val:d.rsp_spy.toFixed(3), chgVal:Math.abs(d.rsp_spy-d.rsp_spy_prev).toFixed(4), chgUp:d.rsp_spy>d.rsp_spy_prev,
          zone:d.rsp_spy>0.95?'Broad':d.rsp_spy>0.90?'NARROW':'FRAGILE',
          zoneCol:d.rsp_spy>0.95?'#3fb950':d.rsp_spy>0.90?'#d29922':'#f85149',
          explain:'Equal-Weight/Cap-Weight. >0.95=tout monte. <0.90=seuls les Magnificent 7.',
          spark:d.rsp_h.slice(-14) },
      ]} />

      <Section num="05" title="LA LIQUIDITÉ — Le robinet" rows={[
        { label:'DXY Dollar', val:d.dxy.toFixed(1), chgVal:Math.abs(d.dxy-d.dxy_prev).toFixed(2), chgUp:d.dxy>d.dxy_prev,
          zone:d.dxy>106?'STRONG':d.dxy>100?'NEUTRAL':'Weak USD',
          zoneCol:d.dxy>106?'#f85149':d.dxy>100?'#d29922':'#3fb950',
          explain:'Dollar fort = sorties capitaux émergents, pression commodities.',
          spark:d.dxy_h.slice(-14) },
        { label:'WTI Crude', val:'$'+d.wti.toFixed(1), chgVal:Math.abs(d.wti-d.wti_prev).toFixed(2), chgUp:d.wti>d.wti_prev,
          zone:d.wti>90?'SHOCK':d.wti>75?'NORMAL-HIGH':'OK',
          zoneCol:d.wti>90?'#f85149':d.wti>75?'#d29922':'#3fb950',
          explain:'>$90 choc inflationniste. >$100 choc économique mondial.',
          spark:d.wti_h.slice(-14) },
      ]} />

      {d.cot_sp && (
        <Section num="06" title="COT — Positionnement S&P 500" rows={[
          { label:'Asset Managers', val:d.cot_sp.am.toLocaleString(), chgVal:Math.abs(d.cot_sp.amc).toLocaleString(), chgUp:d.cot_sp.amc>0,
            zone:d.cot_sp.am>0?'▲ Net Long':'▼ Net Short', zoneCol:d.cot_sp.am>0?'#3fb950':'#f85149',
            explain:'Fonds de pension. LONG=pas de chute attendue.', spark:[] },
          { label:'Leveraged Money', val:d.cot_sp.lm.toLocaleString(), chgVal:Math.abs(d.cot_sp.lmc).toLocaleString(), chgUp:d.cot_sp.lmc>0,
            zone:d.cot_sp.lm<0?'▲ Net Short':'▲ Net Long', zoneCol:d.cot_sp.lm<0?'#d29922':'#3fb950',
            explain:'Hedge funds. AM LONG + LM SHORT = signal achat fort.', spark:[] },
        ]} />
      )}

      {/* Mechanism box */}
      <div style={{ margin:'12px 0', padding:'12px 16px', background:'transparent', border:'1px solid #21262d', borderRadius:8, fontSize:11, color:'#8b949e', lineHeight:1.6 }}>
        <span style={{ fontWeight:500, color:'#8b949e' }}>⚡ MÉCANIQUE DU SPREAD:</span>{' '}
        Quand spread passe de −0.5 → +0.5, les banques cessent de prêter (NIM négatif). Entreprises épuisent réserves en Phase B.
        Phase C: emprunt impossible → chute bénéfices → effondrement boursier. Fed baisse taux en panique mais trop tard.
      </div>

      <div style={{ fontSize:10, color:'#484f58', marginTop:10, borderTop:'1px solid #21262d', paddingTop:8 }}>
        Sources: FRED · Yahoo Finance · CFTC COT · {macro?.updated ? new Date(macro.updated).toLocaleString() : '—'}
      </div>
    </div>
  )
}
