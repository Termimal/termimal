// components/charts/TvCandleChart.tsx — Candlestick/Line/Area/Bars with overlays + RSI/MACD sub-panes
import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'
import { getPrecision } from '@/utils/formatPrice'

interface OHLCVData {
  dates: string[]; open: number[]; high: number[]; low: number[]; close: number[]; volume: number[]
}

interface IndicatorSpec { id: string; active: boolean }

export type ChartType = 'candlestick' | 'line' | 'area' | 'bars'

interface Props {
  data: OHLCVData | null
  height?: number
  showVolume?: boolean
  chartType?: ChartType
  symbol?: string
  onChartReady?: (chart: IChartApi, series: ISeriesApi<any>) => void
  indicators?: IndicatorSpec[]
}

// ─── Math helpers ───────────────────────────────────────────────────
function parseTime(d: string): any {
  if (!d) return 0
  if (d.includes(' ') || (d.includes('T') && d.length > 10)) {
    const ts = Date.parse(d.includes('T') ? d : d.replace(' ', 'T'))
    if (!isNaN(ts)) return Math.floor(ts / 1000)
  }
  return d.slice(0, 10)
}

function calcSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    let sum = 0; for (let j = 0; j < period; j++) sum += data[i - j]
    return sum / period
  })
}

function calcEMA(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1)
  const out: (number | null)[] = []
  let prev: number | null = null
  data.forEach((v, i) => {
    if (i < period - 1) { out.push(null); return }
    if (prev == null) {
      let sum = 0; for (let j = 0; j < period; j++) sum += data[i - j]
      prev = sum / period
    } else {
      prev = v * k + prev * (1 - k)
    }
    out.push(prev)
  })
  return out
}

function calcBB(data: number[], period = 20, k = 2) {
  const mid = calcSMA(data, period)
  const upper: (number|null)[] = []
  const lower: (number|null)[] = []
  for (let i = 0; i < data.length; i++) {
    const m = mid[i]
    if (m == null || i < period - 1) { upper.push(null); lower.push(null); continue }
    let varSum = 0
    for (let j = 0; j < period; j++) { const d = data[i - j] - m; varSum += d * d }
    const sd = Math.sqrt(varSum / period)
    upper.push(m + k * sd); lower.push(m - k * sd)
  }
  return { upper, mid, lower }
}

function calcRSI(close: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = []
  let avgGain = 0, avgLoss = 0
  for (let i = 0; i < close.length; i++) {
    if (i === 0) { out.push(null); continue }
    const diff = close[i] - close[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    if (i <= period) {
      avgGain += gain; avgLoss += loss
      if (i === period) {
        avgGain /= period; avgLoss /= period
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs))
      } else out.push(null)
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs))
    }
  }
  return out
}

function calcMACD(close: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(close, fast)
  const emaSlow = calcEMA(close, slow)
  const macd: (number | null)[] = emaFast.map((v, i) => (v != null && emaSlow[i] != null) ? v - emaSlow[i]! : null)
  // Signal is EMA of macd, filter nulls for calc but keep index alignment
  const macdNonNull = macd.map(v => v ?? 0)
  const sig = calcEMA(macdNonNull, signal).map((v, i) => macd[i] == null ? null : v)
  const hist: (number | null)[] = macd.map((v, i) => (v != null && sig[i] != null) ? v - sig[i]! : null)
  return { macd, signal: sig, hist }
}

function calcVWAP(close: number[], high: number[], low: number[], volume: number[]): (number | null)[] {
  const out: (number | null)[] = []
  let cumVol = 0, cumPV = 0
  for (let i = 0; i < close.length; i++) {
    const typ = (high[i] + low[i] + close[i]) / 3
    const v = volume[i] || 0
    cumPV += typ * v; cumVol += v
    out.push(cumVol > 0 ? cumPV / cumVol : null)
  }
  return out
}

// ─── Component ───────────────────────────────────────────────────────
export function TvCandleChart({ data, height = 500, showVolume = true, chartType = 'candlestick', symbol, onChartReady, indicators = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !data?.dates?.length || !data?.close?.length) return
    el.innerHTML = ''

    try {
      const isIntraday = data.dates[0]?.includes(' ') || (data.dates[0]?.includes('T') && data.dates[0]?.length > 10)
      const dec = symbol ? getPrecision(symbol) : 2
      const priceFmt = { type: 'price' as const, precision: dec, minMove: 1 / Math.pow(10, dec) }

      const hasInd = (id: string) => indicators.some(i => i.id === id && i.active)
      const rsiActive = hasInd('rsi')
      const macdActive = hasInd('macd')

      // Figure out pane heights
      const subPaneH = 110
      const subCount = (rsiActive ? 1 : 0) + (macdActive ? 1 : 0)
      const mainH = Math.max(200, height - subCount * subPaneH)

      // ── Main chart container ───────────────────────────────────
      const mainEl = document.createElement('div')
      mainEl.style.width = '100%'
      mainEl.style.height = `${mainH}px`
      mainEl.style.position = 'relative'  // so absolute children (axis overlays) anchor here
      el.appendChild(mainEl)

      const chart = createChart(mainEl, {
        width: mainEl.clientWidth || 800, height: mainH,
        layout: { background: { type: ColorType.Solid, color: '#0e1117' }, textColor: '#8b949e', fontSize: 11, fontFamily: "'SF Mono', Menlo, Consolas, monospace" },
        grid: { vertLines: { color: '#161b22' }, horzLines: { color: '#161b22' } },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: '#484f58', width: 1, style: LineStyle.Dashed, labelBackgroundColor: 'rgba(56,139,253,0.6)' },
          horzLine: { color: '#484f58', width: 1, style: LineStyle.Dashed, labelBackgroundColor: 'rgba(56,139,253,0.6)' },
        },
        rightPriceScale: {
          borderColor: '#21262d',
          scaleMargins: { top: 0.05, bottom: showVolume ? 0.25 : 0.05 },
          // autoScale: false lets the user freely pan the chart body up/down without
          // the price scale snapping back to fit data. They can still double-click
          // the price axis to re-fit. This matches TradingView default behavior.
          autoScale: false,
          mode: 0,
          alignLabels: true,
          entireTextOnly: false,
        },
        timeScale: {
          borderColor: '#21262d',
          timeVisible: isIntraday,
          secondsVisible: false,
          visible: subCount === 0,
        },
        // pressedMouseMove + vertTouchDrag: drag chart in any direction.
        // mouseWheel: scroll horizontally; Shift+wheel scrolls vertically.
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
        handleScale: {
          mouseWheel: true,
          pinch: true,
          axisPressedMouseMove: { time: true, price: true },  // drag axis to scale
          axisDoubleClickReset: { time: true, price: true },  // double-click axis to reset
        },
        watermark: { visible: false },
      })

      const up = data.close[data.close.length - 1] >= data.close[0]
      const indices = data.dates.map((_, i) => i)
      let mainSeries: ISeriesApi<any>

      if (chartType === 'candlestick' && data.open?.length) {
        mainSeries = chart.addCandlestickSeries({
          upColor: '#3fb950', downColor: '#f85149',
          borderUpColor: '#3fb950', borderDownColor: '#f85149',
          wickUpColor: '#3fb950', wickDownColor: '#f85149',
          priceFormat: priceFmt,
        })
        const bars = indices.map(i => ({ time: parseTime(data.dates[i]), open: data.open[i], high: data.high[i], low: data.low[i], close: data.close[i] }))
          .filter(b => b.time && b.open != null && b.close != null)
        if (bars.length) mainSeries.setData(bars as any)
      } else if (chartType === 'bars' && data.open?.length) {
        mainSeries = chart.addBarSeries({
          upColor: '#3fb950', downColor: '#f85149',
          priceFormat: priceFmt,
          thinBars: false,
        })
        const bars = indices.map(i => ({ time: parseTime(data.dates[i]), open: data.open[i], high: data.high[i], low: data.low[i], close: data.close[i] }))
          .filter(b => b.time && b.open != null && b.close != null)
        if (bars.length) mainSeries.setData(bars as any)
      } else if (chartType === 'line') {
        mainSeries = chart.addLineSeries({
          color: up ? '#3fb950' : '#f85149',
          lineWidth: 2,
          priceFormat: priceFmt,
          lastValueVisible: true,
          priceLineVisible: true,
        })
        const pts = indices.map(i => ({ time: parseTime(data.dates[i]), value: data.close[i] })).filter(p => p.time && p.value != null)
        if (pts.length) mainSeries.setData(pts as any)
      } else {
        // area (default fallback)
        mainSeries = chart.addAreaSeries({
          lineColor: up ? '#3fb950' : '#f85149',
          topColor: up ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
          bottomColor: 'transparent', lineWidth: 2, crosshairMarkerRadius: 4,
          priceFormat: priceFmt,
        })
        const pts = indices.map(i => ({ time: parseTime(data.dates[i]), value: data.close[i] })).filter(p => p.time && p.value != null)
        if (pts.length) mainSeries.setData(pts as any)
      }

      // Volume
      if (showVolume && data.volume?.length) {
        const volSeries = chart.addHistogramSeries({ color: '#8b949e', priceFormat: { type: 'volume' }, priceScaleId: 'vol' })
        chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
        const avgVol = calcSMA(data.volume, 20)
        const vols = indices.map(i => {
          const v = data.volume[i] || 0, avg = avgVol[i]
          const isUp = data.close[i] >= (data.open?.[i] ?? data.close[i])
          const isHighVol = avg != null && v > avg * 1.5
          return { time: parseTime(data.dates[i]), value: v,
            color: isHighVol ? (isUp ? 'rgba(63,185,80,0.7)' : 'rgba(248,81,73,0.7)') : (isUp ? 'rgba(63,185,80,0.2)' : 'rgba(248,81,73,0.2)') }
        }).filter(v => v.time)
        if (vols.length) volSeries.setData(vols as any)
      }

      // Helper to add a line overlay
      const d = data // local narrowed reference for closures
      function addLine(color: string, values: (number | null)[], lineWidth: 1 | 2 = 1, lineStyle: LineStyle = LineStyle.Solid) {
        const s = chart.addLineSeries({ color, lineWidth, lineStyle, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
        const pts = indices.map(i => ({ time: parseTime(d.dates[i]), value: values[i] })).filter(p => p.time && p.value != null)
        if (pts.length) s.setData(pts as any)
        return s
      }

      if (hasInd('sma20')) addLine('#f0b429', calcSMA(data.close, 20))
      if (hasInd('sma50')) addLine('#34d399', calcSMA(data.close, 50))
      if (hasInd('sma200')) addLine('#da3633', calcSMA(data.close, 200))
      if (hasInd('ema20')) addLine('#d29922', calcEMA(data.close, 20), 1, LineStyle.Dashed)
      if (hasInd('ema50')) addLine('#58a6ff', calcEMA(data.close, 50), 1, LineStyle.Dashed)
      if (hasInd('bb')) {
        const { upper, mid, lower } = calcBB(data.close, 20, 2)
        addLine('#8b949e', upper, 1, LineStyle.Dashed)
        addLine('#8b949e', mid, 1, LineStyle.Solid)
        addLine('#8b949e', lower, 1, LineStyle.Dashed)
      }
      if (hasInd('vwap') && data.high?.length && data.low?.length && data.volume?.length) {
        addLine('#a371f7', calcVWAP(data.close, data.high, data.low, data.volume), 2)
      }

      chart.timeScale().fitContent()
      // One-shot auto-fit on load so initial data is visible. We don't keep
      // autoScale on because that would prevent vertical user panning.
      chart.priceScale('right').applyOptions({ autoScale: true })
      // After the initial paint, switch off autoScale so user can freely drag
      // the chart up/down without it snapping back. setTimeout 0 is enough
      // because lightweight-charts paints synchronously.
      setTimeout(() => {
        try { chart.priceScale('right').applyOptions({ autoScale: false }) } catch {}
      }, 50)
      if (onChartReady) onChartReady(chart, mainSeries)

      // Note: axis cursor hints are rendered by DrawingOverlay (sibling of this chart)
      // so they sit at a higher z-index above the drawing canvas. See AxisHint there.

      // ── RSI sub-pane ────────────────────────────────────────
      const subCharts: IChartApi[] = []
      if (rsiActive) {
        const rsiEl = document.createElement('div')
        rsiEl.style.width = '100%'
        rsiEl.style.height = `${subPaneH}px`
        rsiEl.style.borderTop = '1px solid #21262d'
        el.appendChild(rsiEl)

        const rsiChart = createChart(rsiEl, {
          width: rsiEl.clientWidth || 800, height: subPaneH,
          layout: { background: { type: ColorType.Solid, color: '#0e1117' }, textColor: '#8b949e', fontSize: 10, fontFamily: "'SF Mono', Menlo, Consolas, monospace" },
          grid: { vertLines: { visible: false }, horzLines: { color: '#161b22' } },
          rightPriceScale: { borderColor: '#21262d' },
          timeScale: {
            borderColor: '#21262d',
            timeVisible: isIntraday,
            secondsVisible: false,
            visible: !macdActive, // only show time on the last pane
          },
          handleScroll: false, handleScale: false,
          crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#484f58', width: 1, style: LineStyle.Dashed }, horzLine: { visible: false, labelVisible: false } },
          watermark: { visible: false },
        })

        const rsiSeries = rsiChart.addLineSeries({ color: '#d29922', lineWidth: 1, priceFormat: { type: 'price', precision: 2, minMove: 0.01 } })
        const rsiData = calcRSI(data.close, 14)
        const rsiPts = indices.map(i => ({ time: parseTime(data.dates[i]), value: rsiData[i] })).filter(p => p.time && p.value != null)
        if (rsiPts.length) rsiSeries.setData(rsiPts as any)

        // Overbought/oversold reference lines
        rsiSeries.createPriceLine({ price: 70, color: '#f85149', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '70' })
        rsiSeries.createPriceLine({ price: 30, color: '#3fb950', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '30' })
        rsiSeries.createPriceLine({ price: 50, color: '#484f58', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })

        // Pane header label
        const label = document.createElement('div')
        label.style.cssText = 'position:absolute;top:4px;left:8px;font-size:9px;color:#8b949e;font-family:"SF Mono",monospace;letter-spacing:0.5px;text-transform:uppercase;pointer-events:none;'
        label.textContent = 'RSI 14'
        rsiEl.style.position = 'relative'
        rsiEl.appendChild(label)

        subCharts.push(rsiChart)
      }

      // ── MACD sub-pane ───────────────────────────────────────
      if (macdActive) {
        const macdEl = document.createElement('div')
        macdEl.style.width = '100%'
        macdEl.style.height = `${subPaneH}px`
        macdEl.style.borderTop = '1px solid #21262d'
        macdEl.style.position = 'relative'
        el.appendChild(macdEl)

        const macdChart = createChart(macdEl, {
          width: macdEl.clientWidth || 800, height: subPaneH,
          layout: { background: { type: ColorType.Solid, color: '#0e1117' }, textColor: '#8b949e', fontSize: 10, fontFamily: "'SF Mono', Menlo, Consolas, monospace" },
          grid: { vertLines: { visible: false }, horzLines: { color: '#161b22' } },
          rightPriceScale: { borderColor: '#21262d' },
          timeScale: { borderColor: '#21262d', timeVisible: isIntraday, secondsVisible: false, visible: true },
          handleScroll: false, handleScale: false,
          crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#484f58', width: 1, style: LineStyle.Dashed }, horzLine: { visible: false, labelVisible: false } },
          watermark: { visible: false },
        })

        const { macd: macdLine, signal: sigLine, hist } = calcMACD(data.close, 12, 26, 9)

        // Histogram first (so lines draw on top)
        const histSeries = macdChart.addHistogramSeries({ priceFormat: { type: 'price', precision: 3, minMove: 0.001 } })
        const histPts = indices.map(i => {
          if (hist[i] == null) return null
          return { time: parseTime(data.dates[i]), value: hist[i] as number, color: (hist[i] as number) >= 0 ? 'rgba(63,185,80,0.6)' : 'rgba(248,81,73,0.6)' }
        }).filter((p): p is { time: any; value: number; color: string } => p != null && !!p.time)
        if (histPts.length) histSeries.setData(histPts as any)

        const macdSeriesLine = macdChart.addLineSeries({ color: '#58a6ff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        const macdPts = indices.map(i => ({ time: parseTime(data.dates[i]), value: macdLine[i] })).filter(p => p.time && p.value != null)
        if (macdPts.length) macdSeriesLine.setData(macdPts as any)

        const sigSeries = macdChart.addLineSeries({ color: '#d29922', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        const sigPts = indices.map(i => ({ time: parseTime(data.dates[i]), value: sigLine[i] })).filter(p => p.time && p.value != null)
        if (sigPts.length) sigSeries.setData(sigPts as any)

        // Pane header label
        const label = document.createElement('div')
        label.style.cssText = 'position:absolute;top:4px;left:8px;font-size:9px;color:#8b949e;font-family:"SF Mono",monospace;letter-spacing:0.5px;text-transform:uppercase;pointer-events:none;z-index:1;'
        label.textContent = 'MACD 12 26 9'
        macdEl.appendChild(label)

        subCharts.push(macdChart)
      }

      // ── Sync time axes across all panes ────────────────────
      const mainTs = chart.timeScale()
      const syncHandlers: Array<() => void> = []
      subCharts.forEach(sc => {
        const h = (range: any) => { if (range) sc.timeScale().setVisibleLogicalRange(range) }
        mainTs.subscribeVisibleLogicalRangeChange(h)
        syncHandlers.push(() => mainTs.unsubscribeVisibleLogicalRangeChange(h))
      })

      // Resize handler
      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            chart.applyOptions({ width: entry.contentRect.width })
            subCharts.forEach(sc => sc.applyOptions({ width: entry.contentRect.width }))
          }
        }
      })
      ro.observe(el)

      return () => {
        ro.disconnect()
        syncHandlers.forEach(fn => { try { fn() } catch {} })
        subCharts.forEach(sc => { try { sc.remove() } catch {} })
        try { chart.remove() } catch {}
      }
    } catch (err) {
      console.error('TvCandleChart error:', err)
      el.innerHTML = '<div style="padding:20px;color:#8b949e;font-size:12px;text-align:center">Chart error</div>'
    }
  }, [data, height, showVolume, chartType, indicators, symbol, onChartReady])

  if (!data?.dates?.length) {
    return <div style={{ height, background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e', fontSize: 12 }}>Loading chart...</div>
  }

  return <div ref={containerRef} style={{ width: '100%', height, overflow: 'hidden' }} />
}
