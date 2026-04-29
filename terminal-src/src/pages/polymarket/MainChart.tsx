// pages/polymarket/MainChart.tsx — Mode-switched chart workspace
// One toolbar row (36px). No stacked sub-toolbars. Lightweight-charts for probability view.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, UTCTimestamp, SeriesMarker, Time, IPriceLine } from 'lightweight-charts'
import type { FootprintBar, CVDPoint, OFProfile, OFTrade, AbsorptionEvent, OFBook } from './types'
import { PM } from './_ui/tokens'
import { SegmentedControl } from './_ui/primitives'

function fmtK(n: number): string {
  if (!isFinite(n) || n === 0) return '0'
  const a = Math.abs(n)
  if (a >= 1e6) return `${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${(a / 1e3).toFixed(1)}k`
  return `${a.toFixed(0)}`
}
function fmtKSigned(n: number): string {
  if (!isFinite(n) || n === 0) return '0'
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(1)}k`
  return `${sign}${a.toFixed(0)}`
}

type ChartMode = 'probability' | 'footprint' | 'dom'

// ════════════════════════════════════════════════════════════════════════════
// MAIN CHART — stateful shell with mode switcher; single toolbar row
// ════════════════════════════════════════════════════════════════════════════
export function MainChart({ conditionId, outcome, tokenId, tickSize }: {
  conditionId: string
  outcome: 'yes' | 'no'
  tokenId: string | null
  tickSize: number
}) {
  const [mode, setMode] = useState<ChartMode>('probability')

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {mode === 'probability' && <ProbabilityView mode={mode} setMode={setMode} conditionId={conditionId} outcome={outcome} tickSize={tickSize} />}
      {mode === 'footprint' && <FootprintView mode={mode} setMode={setMode} conditionId={conditionId} outcome={outcome} />}
      {mode === 'dom' && <DomView mode={mode} setMode={setMode} conditionId={conditionId} outcome={outcome} tokenId={tokenId} />}
    </div>
  )
}

// ─── Shared mode selector used inside each view's toolbar ───────────────────
function ModeSwitch({ mode, setMode }: { mode: ChartMode; setMode: (m: ChartMode) => void }) {
  return (
    <SegmentedControl
      value={mode}
      onChange={v => setMode(v as ChartMode)}
      options={[
        { label: 'PROB', value: 'probability' },
        { label: 'FP', value: 'footprint' },
        { label: 'DOM', value: 'dom' },
      ]}
      size="sm"
    />
  )
}

// ─── Toggle pill (flat, no dot) ─────────────────────────────────────────────
function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      style={{
        height: 22, padding: '0 8px',
        fontSize: 10, fontWeight: 600, letterSpacing: '0.4px',
        fontFamily: PM.font.ui, textTransform: 'uppercase',
        background: active ? 'rgba(56,139,253,0.14)' : 'transparent',
        color: active ? PM.accentText : PM.text.muted,
        border: `1px solid ${active ? 'rgba(56,139,253,0.4)' : PM.border.prominent}`,
        borderRadius: 2, cursor: 'pointer',
        transition: `all ${PM.motion}`,
      }}>{label}</button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PROBABILITY VIEW — lightweight-charts engine
// ════════════════════════════════════════════════════════════════════════════
function ProbabilityView({ mode, setMode, conditionId, outcome, tickSize }: {
  mode: ChartMode; setMode: (m: ChartMode) => void
  conditionId: string; outcome: 'yes' | 'no'; tickSize: number
}) {
  const [bars, setBars] = useState<FootprintBar[]>([])
  const [cvd, setCvd] = useState<CVDPoint[]>([])
  const [absorptions, setAbsorptions] = useState<AbsorptionEvent[]>([])
  const [profile, setProfile] = useState<OFProfile | null>(null)
  const [whales, setWhales] = useState<OFTrade[]>([])
  const [barSec, setBarSec] = useState(900)
  const [loading, setLoading] = useState(true)
  const [showAbsorption, setShowAbsorption] = useState(true)
  const [showWhales, setShowWhales] = useState(true)
  const [showCvd, setShowCvd] = useState(true)

  const mainRef = useRef<HTMLDivElement>(null)
  const cvdRef = useRef<HTMLDivElement>(null)
  const mainChartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const cvdChartRef = useRef<IChartApi | null>(null)
  const cvdSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const pocLineRef = useRef<IPriceLine | null>(null)

  // ── Data fetching ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      try {
        const [rBars, rMetrics, rProf, rWhales] = await Promise.all([
          fetch(`/api/polymarket/orderflow/footprint/${conditionId}?bar_sec=${barSec}&bin=${Math.max(tickSize, 0.005)}&side=${outcome}&bars=80`),
          fetch(`/api/polymarket/orderflow/metrics/${conditionId}?window=${Math.max(barSec * 80, 86400)}&side=${outcome}`),
          fetch(`/api/polymarket/orderflow/profile/${conditionId}?bin=${Math.max(tickSize, 0.005)}&side=${outcome}&window=${Math.max(barSec * 80, 86400)}`),
          fetch(`/api/polymarket/orderflow/whales/${conditionId}?min_notional=5000&limit=60`),
        ])
        if (cancelled) return
        if (rBars.ok) { const j = await rBars.json(); if (!j.error) setBars(j.bars || []) }
        if (rMetrics.ok) {
          const j = await rMetrics.json()
          if (!j.error) { setCvd(j.cvd_series || []); setAbsorptions(j.absorption_events || []) }
        }
        if (rProf.ok) { const j = await rProf.json(); if (!j.error) setProfile(j) }
        if (rWhales.ok) { const j = await rWhales.json(); if (j.trades) setWhales(j.trades) }
        setLoading(false)
      } catch {}
    }
    loadAll()
    const id = setInterval(loadAll, 6000)
    return () => { cancelled = true; clearInterval(id) }
  }, [conditionId, outcome, barSec, tickSize])

  // ── Create main chart ─────────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    const chart = createChart(el, {
      width: el.clientWidth || 600,
      height: el.clientHeight || 400,
      layout: {
        background: { type: ColorType.Solid, color: PM.bg.panel },
        textColor: PM.text.secondary,
        fontSize: 11,
        fontFamily: "'SF Mono', Menlo, Consolas, monospace",
      },
      grid: {
        // Dim gridlines significantly — barely perceptible (fix #9)
        vertLines: { color: 'rgba(139,148,158,0.06)', style: LineStyle.Solid },
        horzLines: { color: 'rgba(139,148,158,0.06)', style: LineStyle.Solid },
      },
      timeScale: {
        borderColor: PM.border.subtle,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: PM.border.subtle,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: PM.text.muted, width: 1, style: LineStyle.Dashed, labelBackgroundColor: PM.bg.elevated },
        horzLine: { color: PM.text.muted, width: 1, style: LineStyle.Dashed, labelBackgroundColor: PM.bg.elevated },
      },
    })

    const dec = Math.max(3, Math.ceil(-Math.log10(tickSize)))
    const minMove = tickSize > 0 ? tickSize : 0.001
    const priceFormat = { type: 'price' as const, precision: dec, minMove }

    const candleSeries = chart.addCandlestickSeries({
      upColor: PM.up,
      downColor: PM.down,
      borderUpColor: PM.up,
      borderDownColor: PM.down,
      wickUpColor: PM.up,
      wickDownColor: PM.down,
      priceFormat,
      // Current-price badge — always visible + accent color so it pops even at extreme zoom
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineColor: PM.accent,
      priceLineWidth: 1,
      priceLineStyle: LineStyle.Dashed,
    })

    const volumeSeries = chart.addHistogramSeries({
      color: PM.text.muted,
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      // Hide the price line and last-value label on the volume scale (fix #4)
      lastValueVisible: false,
      priceLineVisible: false,
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      visible: false,
    })

    mainChartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect
        if (width > 0 && height > 0) chart.applyOptions({ width, height })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
      mainChartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [tickSize])

  // ── Create/destroy CVD chart based on toggle ─────────────────────
  useEffect(() => {
    if (!showCvd) return
    const el = cvdRef.current
    if (!el) return

    const chart = createChart(el, {
      width: el.clientWidth || 600,
      height: el.clientHeight || 140,
      layout: {
        background: { type: ColorType.Solid, color: PM.bg.panel },
        textColor: PM.text.secondary,
        fontSize: 10,
        fontFamily: "'SF Mono', Menlo, Consolas, monospace",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: 'rgba(139,148,158,0.05)', style: LineStyle.Solid },
      },
      timeScale: {
        borderColor: PM.border.subtle,
        timeVisible: true,
        secondsVisible: false,
        visible: false,
      },
      rightPriceScale: { borderColor: PM.border.subtle },
      handleScroll: false,
      handleScale: false,
      crosshair: { mode: CrosshairMode.Hidden },
    })

    const series = chart.addAreaSeries({
      lineColor: PM.up,
      topColor: 'rgba(46,160,67,0.22)',
      bottomColor: 'rgba(46,160,67,0.0)',
      lineWidth: 2,
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    })

    cvdChartRef.current = chart
    cvdSeriesRef.current = series

    const mainChart = mainChartRef.current
    let unsubMain: (() => void) | null = null
    if (mainChart) {
      const handler = (range: any) => {
        if (range && cvdChartRef.current) {
          cvdChartRef.current.timeScale().setVisibleLogicalRange(range)
        }
      }
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(handler)
      unsubMain = () => mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(handler)
    }

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect
        if (width > 0 && height > 0) chart.applyOptions({ width, height })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      if (unsubMain) unsubMain()
      chart.remove()
      cvdChartRef.current = null
      cvdSeriesRef.current = null
    }
  }, [showCvd])

  // ── Update candles + volume ──────────────────────────────────────
  useEffect(() => {
    const cs = candleSeriesRef.current
    const vs = volumeSeriesRef.current
    if (!cs || !vs) return
    if (!bars.length) { cs.setData([]); vs.setData([]); return }

    const byTs = new Map<number, FootprintBar>()
    for (const b of bars) byTs.set(Math.floor(b.ts_start / 1000), b)
    const sorted = Array.from(byTs.entries()).sort((a, b) => a[0] - b[0])

    cs.setData(sorted.map(([t, b]) => ({
      time: t as UTCTimestamp,
      open: b.open, high: b.high, low: b.low, close: b.close,
    })))

    vs.setData(sorted.map(([t, b]) => {
      let buy = 0, sell = 0
      for (const c of b.cells) { buy += c.buy; sell += c.sell }
      return {
        time: t as UTCTimestamp,
        value: buy + sell,
        color: buy >= sell ? 'rgba(46,160,67,0.5)' : 'rgba(218,54,51,0.5)',
      }
    }))

    mainChartRef.current?.timeScale().fitContent()
  }, [bars])

  // ── Update CVD ───────────────────────────────────────────────────
  useEffect(() => {
    const s = cvdSeriesRef.current
    if (!s) return
    if (!cvd.length) { s.setData([]); return }
    const byTs = new Map<number, number>()
    for (const p of cvd) byTs.set(Math.floor(p.ts / 1000), p.cvd)
    const data = Array.from(byTs.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([t, v]) => ({ time: t as UTCTimestamp, value: v }))
    s.setData(data)
    const last = data[data.length - 1]?.value ?? 0
    s.applyOptions({
      lineColor: last >= 0 ? PM.up : PM.down,
      topColor: last >= 0 ? 'rgba(46,160,67,0.22)' : 'rgba(218,54,51,0.22)',
      bottomColor: last >= 0 ? 'rgba(46,160,67,0.0)' : 'rgba(218,54,51,0.0)',
    })
  }, [cvd, showCvd])

  // ── Markers (absorption + whales) ────────────────────────────────
  useEffect(() => {
    const cs = candleSeriesRef.current
    if (!cs) return
    const markers: SeriesMarker<Time>[] = []
    if (showAbsorption) {
      for (const a of absorptions) {
        markers.push({
          time: Math.floor(a.ts / 1000) as UTCTimestamp,
          position: a.aggressor === 'buy' ? 'belowBar' : 'aboveBar',
          color: a.aggressor === 'buy' ? PM.up : PM.down,
          shape: a.aggressor === 'buy' ? 'arrowUp' : 'arrowDown',
          text: 'abs',
        })
      }
    }
    if (showWhales) {
      const top = [...whales].sort((a, b) => b.notional - a.notional).slice(0, 20)
      for (const w of top) {
        markers.push({
          time: Math.floor(w.ts / 1000) as UTCTimestamp,
          position: 'inBar',
          color: w.aggressor === 'buy' ? PM.up : PM.down,
          shape: 'circle',
        })
      }
    }
    markers.sort((a, b) => (a.time as number) - (b.time as number))
    cs.setMarkers(markers)
  }, [absorptions, whales, showAbsorption, showWhales])

  // ── POC line ─────────────────────────────────────────────────────
  useEffect(() => {
    const cs = candleSeriesRef.current
    if (!cs) return
    if (pocLineRef.current) { cs.removePriceLine(pocLineRef.current); pocLineRef.current = null }
    if (profile && profile.poc !== null) {
      pocLineRef.current = cs.createPriceLine({
        price: profile.poc,
        color: PM.accent,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'POC',
      })
    }
  }, [profile])

  const summary = useMemo(() => {
    if (!bars.length) return null
    let buy = 0, sell = 0
    for (const b of bars) for (const c of b.cells) { buy += c.buy; sell += c.sell }
    const lastCvd = cvd.length ? cvd[cvd.length - 1].cvd : 0
    return { buy, sell, delta: buy - sell, lastCvd }
  }, [bars, cvd])

  const mainHeight = showCvd ? 420 : 580

  return (
    <>
      {/* ── UNIFIED TOOLBAR (36px, fix #1) ──────────────────────────── */}
      <div style={{
        height: 36, padding: '0 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${PM.border.subtle}`,
      }}>
        <ModeSwitch mode={mode} setMode={setMode} />
        <div style={{ width: 1, height: 16, background: PM.border.subtle }}/>
        <SegmentedControl
          value={barSec} onChange={setBarSec}
          options={[
            { label: '5M', value: 300 }, { label: '15M', value: 900 },
            { label: '1H', value: 3600 }, { label: '4H', value: 14400 },
          ]}
          size="sm"
        />
        <div style={{ width: 1, height: 16, background: PM.border.subtle }}/>
        <Toggle active={showAbsorption} onClick={() => setShowAbsorption(v => !v)} label={`ABSORPTION${absorptions.length ? ` · ${absorptions.length}` : ''}`} />
        <Toggle active={showWhales} onClick={() => setShowWhales(v => !v)} label={`WHALES${whales.length ? ` · ${Math.min(whales.length, 20)}` : ''}`} />
        <Toggle active={showCvd} onClick={() => setShowCvd(v => !v)} label="CVD" />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: PM.font.mono, color: PM.text.muted }}>
          {summary && (
            <>
              <span style={{ color: summary.delta >= 0 ? PM.up : PM.down, fontWeight: 600 }}>Δ {fmtKSigned(summary.delta)}</span>
              <span style={{ color: PM.text.tertiary }}>·</span>
              <span style={{ color: summary.lastCvd >= 0 ? PM.up : PM.down, fontWeight: 600 }}>CVD {fmtKSigned(summary.lastCvd)}</span>
            </>
          )}
        </div>
      </div>

      {/* ── CHART ──────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <div ref={mainRef} style={{ width: '100%', height: mainHeight }} />
        {showCvd && (
          <>
            <div style={{
              height: 20, padding: '0 12px',
              display: 'flex', alignItems: 'center', gap: 8,
              background: PM.bg.panel,
              borderTop: `1px solid ${PM.border.subtle}`,
              fontSize: 9, fontFamily: PM.font.mono, color: PM.text.muted,
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              <span>CVD</span>
              {summary && (
                <span style={{
                  marginLeft: 'auto',
                  color: summary.lastCvd >= 0 ? PM.up : PM.down,
                  fontWeight: 600,
                }}>{fmtKSigned(summary.lastCvd)}</span>
              )}
            </div>
            <div ref={cvdRef} style={{ width: '100%', height: 140 }} />
          </>
        )}
        {!loading && bars.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: PM.bg.panel,
            fontSize: 11, color: PM.text.muted, fontFamily: PM.font.mono,
          }}>
            <div style={{ letterSpacing: '0.6px', textTransform: 'uppercase' }}>No trade events yet</div>
            <div style={{ fontSize: 10, color: PM.text.tertiary }}>Low-activity market — waiting for fresh orderflow</div>
          </div>
        )}
        {loading && !bars.length && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: PM.bg.panel,
            fontSize: 11, color: PM.text.muted, fontFamily: PM.font.mono,
            letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>LOADING…</div>
        )}
        {loading && bars.length > 0 && (
          <div className="pm-progress-bar" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
        )}
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// FOOTPRINT VIEW — dedicated canvas grid
// ════════════════════════════════════════════════════════════════════════════
type FpSubMode = 'bidask' | 'delta' | 'volume'

function FootprintView({ mode, setMode, conditionId, outcome }: {
  mode: ChartMode; setMode: (m: ChartMode) => void
  conditionId: string; outcome: 'yes' | 'no'
}) {
  const [bars, setBars] = useState<FootprintBar[]>([])
  const [barSec, setBarSec] = useState(900)
  const [subMode, setSubMode] = useState<FpSubMode>('bidask')
  const [zoom, setZoom] = useState<'auto' | 'compact' | 'wide'>('auto')
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<{ barIdx: number; cellIdx: number; x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const layoutRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/polymarket/orderflow/footprint/${conditionId}?bar_sec=${barSec}&bin=0.005&side=${outcome}&bars=24`)
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled && !j.error) { setBars(j.bars || []); setLoading(false) }
      } catch {}
    }
    load()
    const id = setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [conditionId, outcome, barSec])

  const pocByBar = useMemo(() => bars.map(b => {
    if (!b.cells.length) return -1
    let bi = 0, bv = 0
    for (let i = 0; i < b.cells.length; i++) {
      const v = b.cells[i].buy + b.cells[i].sell
      if (v > bv) { bv = v; bi = i }
    }
    return bi
  }), [bars])

  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const dpr = window.devicePixelRatio || 1
    const W = cvs.clientWidth, H = cvs.clientHeight
    cvs.width = W * dpr; cvs.height = H * dpr
    const ctx = cvs.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.fillStyle = PM.bg.panel; ctx.fillRect(0, 0, W, H)

    if (!bars.length) {
      ctx.fillStyle = PM.text.muted
      ctx.font = `11px ${PM.font.mono}`; ctx.textAlign = 'center'
      ctx.fillText('WAITING FOR FOOTPRINT DATA…', W / 2, H / 2)
      return
    }

    const PAD = { l: 62, r: 20, t: 12, b: 60 }
    const chartW = W - PAD.l - PAD.r
    const chartH = H - PAD.t - PAD.b
    const minBarW = zoom === 'compact' ? 48 : zoom === 'wide' ? 120 : Math.max(72, chartW / bars.length - 6)
    const barW = zoom === 'wide' ? 120 : zoom === 'compact' ? 48 : minBarW
    const barGap = 6
    const effectiveBars = Math.min(bars.length, Math.floor(chartW / (barW + barGap)))
    const visible = bars.slice(bars.length - effectiveBars)

    let minP = Infinity, maxP = -Infinity
    for (const b of visible) { minP = Math.min(minP, b.low); maxP = Math.max(maxP, b.high) }
    const pRaw = maxP - minP || 0.02
    const pPad = pRaw * 0.08
    minP -= pPad; maxP += pPad
    const pr = maxP - minP
    const yForPrice = (p: number) => PAD.t + chartH * (1 - (p - minP) / pr)
    const bin = 0.005
    const cellH = Math.max(14, chartH / (pr / bin))
    layoutRef.current = { PAD, chartW, chartH, barW, barGap, minP, pr, cellH, visible }

    ctx.strokeStyle = PM.border.subtle; ctx.lineWidth = 1
    ctx.strokeRect(PAD.l, PAD.t, chartW, chartH)

    const pSpan = maxP - minP
    const pStep = pSpan < 0.05 ? 0.01 : pSpan < 0.2 ? 0.02 : 0.05
    const pStart = Math.ceil(minP / pStep) * pStep
    ctx.font = `10px ${PM.font.mono}`; ctx.fillStyle = PM.text.muted; ctx.textAlign = 'right'
    for (let p = pStart; p <= maxP; p += pStep) {
      const y = yForPrice(p)
      ctx.strokeStyle = 'rgba(139,148,158,0.08)'
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + chartW, y); ctx.stroke()
      ctx.fillText(p.toFixed(3), PAD.l - 6, y + 3.5)
    }

    visible.forEach((b, vi) => {
      const i = bars.indexOf(b)
      const x = PAD.l + vi * (barW + barGap) + 2
      const yH = yForPrice(b.high), yL = yForPrice(b.low)
      const bullish = b.close >= b.open
      ctx.strokeStyle = PM.border.prominent; ctx.lineWidth = 1
      ctx.strokeRect(x, yH, barW, yL - yH)
      ctx.strokeStyle = bullish ? PM.up : PM.down; ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + barW / 2, yH); ctx.lineTo(x + barW / 2, yL); ctx.stroke()

      const canRenderNumbers = barW >= 48
      for (let j = 0; j < b.cells.length; j++) {
        const cell = b.cells[j]
        const yc = yForPrice(cell.price) - cellH / 2
        if (yc + cellH < PAD.t || yc > PAD.t + chartH) continue
        const buyTotal = cell.buy, sellTotal = cell.sell, total = buyTotal + sellTotal
        const delta = buyTotal - sellTotal
        const imb = cell.imbalance

        if (subMode === 'bidask') {
          let bg: string | null = null
          if (cell.stacked) bg = delta > 0 ? 'rgba(46,160,67,0.32)' : 'rgba(218,54,51,0.32)'
          else if (imb >= 3 && buyTotal >= 50) bg = 'rgba(46,160,67,0.14)'
          else if (imb > 0 && imb <= 1 / 3 && sellTotal >= 50) bg = 'rgba(218,54,51,0.14)'
          if (bg) { ctx.fillStyle = bg; ctx.fillRect(x, yc, barW, cellH - 1) }

          if (canRenderNumbers) {
            ctx.strokeStyle = PM.border.subtle; ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(x + barW / 2, yc + 2); ctx.lineTo(x + barW / 2, yc + cellH - 2)
            ctx.stroke()
            ctx.font = `600 11px ${PM.font.mono}`
            if (sellTotal > 0) {
              ctx.fillStyle = PM.down; ctx.textAlign = 'left'
              ctx.fillText(fmtK(sellTotal), x + 4, yc + cellH * 0.68)
            }
            if (buyTotal > 0) {
              ctx.fillStyle = PM.up; ctx.textAlign = 'right'
              ctx.fillText(fmtK(buyTotal), x + barW - 4, yc + cellH * 0.68)
            }
          } else {
            const maxCellVol = Math.max(...b.cells.map(c => c.buy + c.sell)) || 1
            const buyW = (buyTotal / maxCellVol) * (barW / 2 - 2)
            const sellW = (sellTotal / maxCellVol) * (barW / 2 - 2)
            ctx.fillStyle = PM.up; ctx.fillRect(x + barW / 2 - buyW, yc + 2, buyW, cellH - 4)
            ctx.fillStyle = PM.down; ctx.fillRect(x + barW / 2, yc + 2, sellW, cellH - 4)
          }
        } else if (subMode === 'delta') {
          const intensity = Math.min(1, Math.abs(delta) / 500)
          const bg = delta >= 0 ? `rgba(46,160,67,${0.1 + intensity * 0.3})` : `rgba(218,54,51,${0.1 + intensity * 0.3})`
          ctx.fillStyle = bg; ctx.fillRect(x, yc, barW, cellH - 1)
          if (canRenderNumbers && total > 0) {
            ctx.fillStyle = delta >= 0 ? PM.up : PM.down
            ctx.font = `700 11px ${PM.font.mono}`; ctx.textAlign = 'center'
            ctx.fillText(fmtKSigned(delta), x + barW / 2, yc + cellH * 0.68)
          }
        } else {
          const maxCellVol = Math.max(...b.cells.map(c => c.buy + c.sell)) || 1
          const fillW = (total / maxCellVol) * (barW - 4)
          ctx.fillStyle = PM.text.secondary
          ctx.fillRect(x + 2, yc + 2, fillW, cellH - 4)
          if (canRenderNumbers && total > 0) {
            ctx.fillStyle = PM.text.primary
            ctx.font = `600 11px ${PM.font.mono}`; ctx.textAlign = 'right'
            ctx.fillText(fmtK(total), x + barW - 4, yc + cellH * 0.68)
          }
        }

        if (pocByBar[i] === j) {
          ctx.strokeStyle = PM.accent; ctx.lineWidth = 1.5
          ctx.strokeRect(x + 0.5, yc + 0.5, barW - 1, cellH - 2)
        }
      }

      const dColor = b.delta >= 0 ? PM.up : PM.down
      const dBg = b.delta >= 0 ? 'rgba(46,160,67,0.18)' : 'rgba(218,54,51,0.18)'
      ctx.fillStyle = dBg
      ctx.fillRect(x, PAD.t + chartH + 4, barW, 20)
      ctx.fillStyle = dColor
      ctx.font = `700 11px ${PM.font.mono}`; ctx.textAlign = 'center'
      ctx.fillText(`Δ ${fmtKSigned(b.delta)}`, x + barW / 2, PAD.t + chartH + 18)
      ctx.fillStyle = PM.text.muted
      ctx.font = `10px ${PM.font.mono}`; ctx.textAlign = 'center'
      ctx.fillText(
        new Date(b.ts_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        x + barW / 2, PAD.t + chartH + 42
      )
    })

    if (subMode === 'bidask') {
      ctx.fillStyle = PM.down; ctx.font = `600 9px ${PM.font.mono}`; ctx.textAlign = 'left'
      ctx.fillText('BID', PAD.l + 4, PAD.t - 2)
      ctx.fillStyle = PM.up; ctx.textAlign = 'right'
      ctx.fillText('ASK', PAD.l + (barW) - 4, PAD.t - 2)
    }

    if (hover) {
      ctx.strokeStyle = PM.text.primary; ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(PAD.l, hover.y); ctx.lineTo(PAD.l + chartW, hover.y); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(hover.x, PAD.t); ctx.lineTo(hover.x, PAD.t + chartH); ctx.stroke()
      ctx.setLineDash([])
    }
  }, [bars, subMode, zoom, pocByBar, hover, barSec])

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bars.length || !layoutRef.current) return
    const cvs = canvasRef.current!
    const rect = cvs.getBoundingClientRect()
    const scale = cvs.clientWidth / rect.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale
    const { PAD, chartW, chartH, barW, barGap, minP, pr, visible } = layoutRef.current
    if (x < PAD.l || x > PAD.l + chartW || y < PAD.t || y > PAD.t + chartH) { setHover(null); return }
    const vi = Math.floor((x - PAD.l) / (barW + barGap))
    if (vi < 0 || vi >= visible.length) { setHover(null); return }
    const bar = visible[vi]
    const barIdx = bars.indexOf(bar)
    const priceAtY = minP + (1 - (y - PAD.t) / chartH) * pr
    let best = -1, bestD = Infinity
    for (let j = 0; j < bar.cells.length; j++) {
      const d = Math.abs(bar.cells[j].price - priceAtY)
      if (d < bestD) { bestD = d; best = j }
    }
    if (best === -1) { setHover(null); return }
    const yFor = (p: number) => PAD.t + chartH * (1 - (p - minP) / pr)
    setHover({ barIdx, cellIdx: best, x: PAD.l + vi * (barW + barGap) + 2 + barW / 2, y: yFor(bar.cells[best].price) })
  }

  const readout = hover && bars[hover.barIdx] && bars[hover.barIdx].cells[hover.cellIdx]
    ? (() => {
        const b = bars[hover.barIdx], c = b.cells[hover.cellIdx]
        return { bar: b, cell: c, delta: c.buy - c.sell }
      })()
    : null

  return (
    <>
      <div style={{
        height: 36, padding: '0 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${PM.border.subtle}`,
      }}>
        <ModeSwitch mode={mode} setMode={setMode} />
        <div style={{ width: 1, height: 16, background: PM.border.subtle }}/>
        <SegmentedControl value={barSec} onChange={setBarSec}
          options={[{ label: '5M', value: 300 }, { label: '15M', value: 900 }, { label: '1H', value: 3600 }]} size="sm"/>
        <div style={{ width: 1, height: 16, background: PM.border.subtle }}/>
        <SegmentedControl value={subMode} onChange={v => setSubMode(v as FpSubMode)}
          options={[{ label: 'BID×ASK', value: 'bidask' }, { label: 'Δ', value: 'delta' }, { label: 'VOL', value: 'volume' }]} size="sm"/>
        <div style={{ width: 1, height: 16, background: PM.border.subtle }}/>
        <SegmentedControl value={zoom} onChange={v => setZoom(v as any)}
          options={[{ label: 'AUTO', value: 'auto' }, { label: 'WIDE', value: 'wide' }, { label: 'COMP', value: 'compact' }]} size="sm"/>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: PM.text.tertiary, fontFamily: PM.font.mono }}>
          {readout ? (
            <>
              {readout.cell.price.toFixed(3)} · <span style={{ color: PM.down }}>bid {fmtK(readout.cell.sell)}</span> · <span style={{ color: PM.up }}>ask {fmtK(readout.cell.buy)}</span> · <span style={{ color: readout.delta >= 0 ? PM.up : PM.down, fontWeight: 600 }}>Δ {fmtKSigned(readout.delta)}</span>
            </>
          ) : 'hover a cell'}
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}
          style={{ width: '100%', height: 580, display: 'block', cursor: 'crosshair' }}/>
        {loading && <div className="pm-progress-bar" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DOM VIEW
// ════════════════════════════════════════════════════════════════════════════
function DomView({ mode, setMode, conditionId, outcome, tokenId }: {
  mode: ChartMode; setMode: (m: ChartMode) => void
  conditionId: string; outcome: 'yes' | 'no'; tokenId: string | null
}) {
  const [book, setBook] = useState<OFBook | null>(null)
  const [recentTrades, setRecentTrades] = useState<OFTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!tokenId) { setError('No token ID available for this outcome'); setLoading(false); return }
      try {
        const [rBook, rWhales] = await Promise.all([
          fetch(`/api/polymarket/orderflow/book/${conditionId}?side=${outcome}`),
          fetch(`/api/polymarket/orderflow/whales/${conditionId}?min_notional=100&limit=20`),
        ])
        if (cancelled) return
        if (rBook.ok) { const j = await rBook.json(); if (!j.error) { setBook(j); setError(null) } else setError(j.error) }
        else setError('Book endpoint unavailable')
        if (rWhales.ok) { const j = await rWhales.json(); if (j.trades) setRecentTrades(j.trades.slice(0, 20)) }
        setLoading(false)
      } catch (e) { setError(String(e)); setLoading(false) }
    }
    load()
    const id = setInterval(load, 3000)
    return () => { cancelled = true; clearInterval(id) }
  }, [conditionId, outcome, tokenId])

  // Toolbar always visible even when error
  const Toolbar = (
    <div style={{
      height: 36, padding: '0 12px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${PM.border.subtle}`,
    }}>
      <ModeSwitch mode={mode} setMode={setMode} />
      <div style={{ width: 1, height: 16, background: PM.border.subtle }}/>
      <span style={{ fontSize: 10, color: PM.text.muted, fontFamily: PM.font.mono, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
        orderbook · {outcome.toUpperCase()} outcome
      </span>
    </div>
  )

  if (error || !book) {
    return (
      <>
        {Toolbar}
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: PM.text.muted, fontFamily: PM.font.mono, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
            {loading ? 'LOADING ORDERBOOK…' : error ? 'ORDERBOOK UNAVAILABLE' : 'NO BOOK DATA'}
          </div>
          {error && <div style={{ fontSize: 10, color: PM.text.tertiary, fontFamily: PM.font.mono, maxWidth: 400, margin: '0 auto' }}>{error}</div>}
        </div>
      </>
    )
  }

  const bids = [...book.bids].sort((a, b) => b[0] - a[0]).slice(0, 15)
  const asks = [...book.asks].sort((a, b) => a[0] - b[0]).slice(0, 15)
  const bestBid = bids[0]?.[0] ?? 0
  const bestAsk = asks[0]?.[0] ?? 0
  const spread = bestAsk - bestBid
  const midPrice = (bestBid + bestAsk) / 2
  const maxSize = Math.max(...bids.map(b => b[1]), ...asks.map(a => a[1]), 1)

  return (
    <>
      {Toolbar}
      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
        <div style={{ border: `1px solid ${PM.border.subtle}`, background: PM.bg.panel }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 1fr',
            height: 26, borderBottom: `1px solid ${PM.border.prominent}`, background: PM.bg.elevated,
            alignItems: 'center', padding: '0 12px',
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: PM.text.muted, letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: 'right' }}>BID SIZE</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: PM.text.muted, letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: 'center' }}>PRICE</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: PM.text.muted, letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: 'left' }}>ASK SIZE</span>
          </div>
          {asks.slice().reverse().map((a, i) => {
            const [price, size] = a
            const ratio = size / maxSize
            return (
              <div key={`a${i}`} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 1fr',
                height: 22, padding: '0 12px', alignItems: 'center',
                borderBottom: `1px solid ${PM.border.subtle}`,
                fontSize: 11, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
              }}>
                <span/>
                <span style={{ color: PM.down, fontWeight: 600, textAlign: 'center' }}>{price.toFixed(3)}</span>
                <div style={{ position: 'relative', height: 22 }}>
                  <div style={{ position: 'absolute', left: 0, top: 3, bottom: 3, width: `${ratio * 100}%`, background: 'rgba(218,54,51,0.14)' }}/>
                  <span style={{ position: 'absolute', left: 8, top: 3, color: PM.down }}>{fmtK(size)}</span>
                </div>
              </div>
            )
          })}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 1fr',
            height: 26, padding: '0 12px', alignItems: 'center',
            background: PM.bg.elevated,
            borderTop: `1px solid ${PM.border.prominent}`, borderBottom: `1px solid ${PM.border.prominent}`,
            fontSize: 11, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
          }}>
            <span style={{ textAlign: 'right', color: PM.text.muted }}>spread {(spread * 100).toFixed(2)}¢</span>
            <span style={{ color: PM.accent, fontWeight: 600, textAlign: 'center' }}>{midPrice.toFixed(3)}</span>
            <span style={{ textAlign: 'left', color: PM.text.muted }}>mid</span>
          </div>
          {bids.map((b, i) => {
            const [price, size] = b
            const ratio = size / maxSize
            return (
              <div key={`b${i}`} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 1fr',
                height: 22, padding: '0 12px', alignItems: 'center',
                borderBottom: `1px solid ${PM.border.subtle}`,
                fontSize: 11, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
              }}>
                <div style={{ position: 'relative', height: 22 }}>
                  <div style={{ position: 'absolute', right: 0, top: 3, bottom: 3, width: `${ratio * 100}%`, background: 'rgba(46,160,67,0.14)' }}/>
                  <span style={{ position: 'absolute', right: 8, top: 3, color: PM.up }}>{fmtK(size)}</span>
                </div>
                <span style={{ color: PM.up, fontWeight: 600, textAlign: 'center' }}>{price.toFixed(3)}</span>
                <span/>
              </div>
            )
          })}
          {book.stale && (
            <div style={{
              padding: '8px 12px', borderTop: `1px solid ${PM.border.subtle}`,
              fontSize: 10, color: PM.warning, fontFamily: PM.font.mono, letterSpacing: '0.4px', textTransform: 'uppercase',
              textAlign: 'center',
            }}>⚠ BOOK DATA STALE</div>
          )}
        </div>
        <div style={{ border: `1px solid ${PM.border.subtle}`, background: PM.bg.panel }}>
          <div style={{
            height: 26, padding: '0 12px',
            borderBottom: `1px solid ${PM.border.prominent}`, background: PM.bg.elevated,
            display: 'flex', alignItems: 'center',
            fontSize: 10, fontWeight: 600, color: PM.text.muted, letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>RECENT TRADES</div>
          {recentTrades.length === 0 ? (
            <div style={{ padding: 20, fontSize: 10, color: PM.text.muted, textAlign: 'center', fontFamily: PM.font.mono, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              NO RECENT TRADES
            </div>
          ) : (
            recentTrades.map((t, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '60px 40px 1fr 60px',
                gap: 6, padding: '0 12px', height: 22, alignItems: 'center',
                borderBottom: `1px solid ${PM.border.subtle}`,
                fontSize: 10, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
              }}>
                <span style={{ color: PM.text.muted }}>{new Date(t.ts).toLocaleTimeString('en-GB', { hour12: false })}</span>
                <span style={{ color: t.aggressor === 'buy' ? PM.up : PM.down, fontWeight: 600 }}>{t.aggressor.toUpperCase()}</span>
                <span style={{ color: PM.text.secondary, textAlign: 'right' }}>${fmtK(t.notional)}</span>
                <span style={{ color: PM.text.primary, textAlign: 'right' }}>{t.price.toFixed(3)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
