// components/charts/TvLineChart.tsx
// TradingView lightweight-charts for macro data with period selector
import { useState, useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts'

interface LineData { label: string; color: string; data: (number | null)[] }
interface RefLine { val: number; color: string; label: string; dash?: boolean }

interface Props {
  title:   string
  sub?:    string
  lines:   LineData[]
  refs?:   RefLine[]
  height?: number
  unit?:   string
  dec?:    number
  fill?:   boolean
  dates?:  string[]   // Optional real dates (ISO yyyy-mm-dd). When provided, slicing is by true date range.
}

// Period config. `months` is the authoritative window length (used when real dates are provided).
// `days` kept for legacy callers passing no dates — approximate synthesis.
const PERIODS = [
  { key: '1W',  months: 0.25, days: 7 },
  { key: '1M',  months: 1,    days: 30 },
  { key: '3M',  months: 3,    days: 90 },
  { key: '6M',  months: 6,    days: 180 },
  { key: '1Y',  months: 12,   days: 365 },
  { key: '5Y',  months: 60,   days: 1825 },
  { key: 'ALL', months: 0,    days: 0 },  // 0 = everything
]

export function TvLineChart({ title, sub, lines, refs, height = 200, unit = '', dec = 2, fill = false, dates }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [period, setPeriod] = useState('1Y')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const maxLen = Math.max(...lines.map(l => l.data.length), 0)
  const cfg = PERIODS.find(p => p.key === period)
  const isAll = cfg?.key === 'ALL'

  // Real-dates mode: slice by date range against the newest date.
  // Fallback (no dates): slice by data-point count as before.
  let sliceStart = 0
  if (dates && dates.length === maxLen && maxLen > 0 && !isAll && cfg) {
    const lastIso = dates[dates.length - 1]
    const last = new Date(lastIso + 'T00:00:00')
    const cutoff = new Date(last)
    cutoff.setMonth(cutoff.getMonth() - cfg.months)
    const cutoffMs = cutoff.getTime()
    // Find first index whose date >= cutoff
    sliceStart = dates.findIndex(d => new Date(d + 'T00:00:00').getTime() >= cutoffMs)
    if (sliceStart === -1) sliceStart = maxLen - 1   // nothing in range — show last point at least
  } else if (!dates && !isAll && cfg) {
    // Legacy day-count fallback
    sliceStart = Math.max(0, maxLen - cfg.days)
  }
  const sliceN = maxLen - sliceStart
  const chartHeight = isFullscreen ? window.innerHeight - 50 : height

  useEffect(() => {
    if (!containerRef.current || maxLen < 2) return

    containerRef.current.innerHTML = ''

    try {
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth || 600,
        height: chartHeight,
        layout: {
          background: { type: ColorType.Solid, color: '#0e1117' },
          textColor: '#8b949e',
          fontSize: 10,
          fontFamily: "'SF Mono', Menlo, Consolas, monospace",
        },
        grid: {
          vertLines: { color: '#161b22' },
          horzLines: { color: '#161b22' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: '#8b949e', width: 1, style: 3, labelBackgroundColor: '#161b22' },
          horzLine: { color: '#8b949e', width: 1, style: 3, labelBackgroundColor: '#161b22' },
        },
        rightPriceScale: { borderColor: '#21262d' },
        timeScale: {
          borderColor: '#21262d',
          fixLeftEdge: true,
          fixRightEdge: true,
          timeVisible: false,
          secondsVisible: false,
          // Span-aware tick label formatting
          tickMarkFormatter: (t: any) => {
            const d = typeof t === 'string'
              ? new Date(t + 'T00:00:00')
              : new Date((t as number) * 1000)
            // Decide format based on visible window span
            const monthsCfg = cfg?.months ?? 0
            // 1W / 1M / 3M: show "DD Mmm" (e.g., "15 Mar")
            if (monthsCfg > 0 && monthsCfg <= 3) {
              const mo = d.toLocaleDateString('en-US', { month: 'short' })
              return `${d.getDate()} ${mo}`
            }
            // 6M / 1Y: show "Mmm YYYY" (e.g., "Jan 2024")
            if (monthsCfg > 0 && monthsCfg <= 12) {
              const mo = d.toLocaleDateString('en-US', { month: 'short' })
              return `${mo} ${d.getFullYear()}`
            }
            // 5Y and ALL: show "YYYY"
            return `${d.getFullYear()}`
          },
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
        watermark: { visible: false },
      })

      // Build timestamps — use real dates when provided, else synthesize as "today minus N days"
      let timestamps: string[] = []
      if (dates && dates.length === maxLen) {
        timestamps = dates.slice(sliceStart)
      } else {
        const today = new Date()
        for (let i = sliceN - 1; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          timestamps.push(d.toISOString().slice(0, 10))
        }
      }

      // Track first series for ref lines
      let firstSeries: any = null

      lines.forEach(line => {
        // Pad shorter data from left, then slice from end
        let values = line.data
        if (values.length < maxLen) {
          values = [...new Array(maxLen - values.length).fill(null), ...values]
        }
        // Take last sliceN points
        values = values.slice(-sliceN)

        if (fill && lines.length === 1) {
          const series = chart.addAreaSeries({
            lineColor: line.color,
            topColor: line.color + '25',
            bottomColor: 'transparent',
            lineWidth: 2,
            crosshairMarkerRadius: 3,
            priceFormat: { type: 'price', precision: dec, minMove: dec > 2 ? 0.001 : 0.01 },
          })
          const pts: any[] = []
          values.forEach((v, i) => { if (v != null && timestamps[i]) pts.push({ time: timestamps[i], value: v }) })
          if (pts.length > 0) series.setData(pts)
          if (!firstSeries) firstSeries = series
        } else {
          const series = chart.addLineSeries({
            color: line.color,
            lineWidth: 2,
            crosshairMarkerRadius: 3,
            priceFormat: { type: 'price', precision: dec, minMove: dec > 2 ? 0.001 : 0.01 },
          })
          const pts: any[] = []
          values.forEach((v, i) => { if (v != null && timestamps[i]) pts.push({ time: timestamps[i], value: v }) })
          if (pts.length > 0) series.setData(pts)
          if (!firstSeries) firstSeries = series
        }
      })

      // Reference lines on the first series
      if (refs?.length && firstSeries) {
        refs.forEach(ref => {
          firstSeries.createPriceLine({
            price: ref.val,
            color: ref.color + '99',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: '',
            lineVisible: true,
          })
        })
      }

      chart.timeScale().fitContent()

      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) chart.applyOptions({ width: entry.contentRect.width })
        }
      })
      ro.observe(containerRef.current)

      return () => { ro.disconnect(); chart.remove() }
    } catch (err) {
      console.error('TvLineChart error:', err)
    }
  }, [lines, refs, chartHeight, unit, dec, fill, sliceN, sliceStart, dates, isFullscreen])

  // Fullscreen handling
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      wrapperRef.current.requestFullscreen()
    }
  }

  return (
    <div ref={wrapperRef} style={{ background: '#0e1117', border: '1px solid #21262d', borderRadius: 2, position: 'relative' }}>
      {/* Header with period buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #161b22' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0, overflow: 'hidden' }}>
          {title && <span style={{ fontSize: 11, fontWeight: 600, color: '#c9d1d9', whiteSpace: 'nowrap' }}>{title}</span>}
          {sub && <span style={{ fontSize: 9, color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {/* Current values */}
          {lines.map(l => {
            const lastVal = l.data.filter(v => v != null).at(-1)
            return (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3, marginRight: 8 }}>
                <span style={{ width: 8, height: 2, background: l.color, display: 'inline-block' }} />
                <span style={{ fontSize: 9, color: '#8b949e' }}>{l.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: l.color, fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>
                  {lastVal != null ? lastVal.toFixed(dec) + unit : '—'}
                </span>
              </span>
            )
          })}
          {/* Period buttons */}
          <div style={{ display: 'flex', gap: 1, marginLeft: 4 }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{
                  padding: '2px 6px', fontSize: 9, borderRadius: 2, border: 'none', cursor: 'pointer',
                  background: period === p.key ? '#388bfd' : 'transparent',
                  color: period === p.key ? '#fff' : '#8b949e',
                  fontWeight: period === p.key ? 600 : 400,
                }}
                onMouseEnter={e => { if (period !== p.key) e.currentTarget.style.background = '#21262d' }}
                onMouseLeave={e => { if (period !== p.key) e.currentTarget.style.background = 'transparent' }}>
                {p.key}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Chart */}
      {maxLen < 2 ? (
        <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e', fontSize: 12 }}>Waiting for data...</div>
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: chartHeight }} />
      )}
      {/* Chart controls — bottom right */}
      <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 3, zIndex: 4 }}>
        <button onClick={() => {
          const count = ((window as any).__popoutCount ?? 0)
          ;(window as any).__popoutCount = count + 1
          const winName = 'tm_' + Date.now()
          const sw = window.screen.availWidth, sh = window.screen.availHeight
          const w = Math.min(920, Math.floor(sw / 2) - 10), h = Math.min(520, Math.floor(sh / 2) - 40)
          // Place in quadrants: top-left, top-right, bottom-left, bottom-right
          const positions = [
            { x: 10, y: 10 },
            { x: sw - w - 10, y: 10 },
            { x: 10, y: sh - h - 50 },
            { x: sw - w - 10, y: sh - h - 50 },
          ]
          const pos = positions[count % 4]
          const features = `width=${w},height=${h},left=${pos.x},top=${pos.y},popup=1,menubar=0,toolbar=0,location=0,status=0,resizable=1`
          const popup = window.open('about:blank', winName, features)
          if (!popup) { alert('Pop-up blocked. Please allow popups for this site.'); return }
          const linesJSON = JSON.stringify(lines.map(l => ({ label: l.label, color: l.color, data: l.data })))
          const refsJSON = JSON.stringify(refs ?? [])
          const lastVals = lines.map(l => { const v = l.data.filter(v => v != null).at(-1); return v != null ? (v as number).toFixed(dec) + unit : '—' }).join(' · ')
          const popTitle = title || lines[0]?.label || 'Chart'
          popup.document.write(`<!DOCTYPE html><html><head><title>Termimal — ${popTitle}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0e1117;font-family:'SF Mono',Menlo,Consolas,monospace;color:#c9d1d9;overflow:hidden}</style>
<script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"><\/script>
</head><body>
<div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #21262d;min-height:44px;background:#0e1117">
<div style="display:flex;align-items:baseline;gap:10px">
<span style="font-size:14px;font-weight:700;color:#c9d1d9;letter-spacing:0.03em">${popTitle}</span>
${sub ? `<span style="font-size:9px;color:#8b949e">${sub}</span>` : ''}
</div>
<span style="font-size:12px;color:#c9d1d9;font-weight:600">${lastVals}</span>
</div>
<div id="c"></div>
<script>
var lines=${linesJSON},refs=${refsJSON};
var h=window.innerHeight-54;
var chart=LightweightCharts.createChart(document.getElementById('c'),{width:window.innerWidth,height:h,
layout:{background:{type:'solid',color:'#0e1117'},textColor:'#8b949e',fontSize:10,fontFamily:"'SF Mono',Menlo,Consolas,monospace"},
grid:{vertLines:{color:'#161b22'},horzLines:{color:'#161b22'}},
rightPriceScale:{borderColor:'#21262d'},timeScale:{borderColor:'#21262d',fixLeftEdge:true,fixRightEdge:true},
handleScroll:{mouseWheel:true,pressedMouseMove:true},handleScale:{mouseWheel:true,pinch:true}});
var today=new Date(),maxLen=Math.max(...lines.map(function(l){return l.data.length}),0);
lines.forEach(function(line){
var pts=[];var vals=line.data;
for(var i=maxLen-1;i>=0;i--){var d=new Date(today);d.setDate(d.getDate()-i);
var idx=vals.length-maxLen+maxLen-1-i;if(idx>=0&&idx<vals.length&&vals[idx]!=null)
pts.push({time:d.toISOString().slice(0,10),value:vals[idx]})}
var s=chart.addLineSeries({color:line.color,lineWidth:2,
priceFormat:{type:'price',precision:${dec},minMove:${dec > 2 ? 0.001 : 0.01}}});
if(pts.length>0)s.setData(pts);
if(refs.length>0&&lines.indexOf(line)===0){refs.forEach(function(r){
s.createPriceLine({price:r.val,color:r.color+'99',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:''})});}
});
chart.timeScale().fitContent();
window.addEventListener('resize',function(){chart.applyOptions({width:window.innerWidth,height:window.innerHeight-54})});
<\/script></body></html>`)
          popup.document.close()
          // Force position after opening (some browsers ignore left/top in features)
          try { popup.moveTo(pos.x, pos.y); popup.resizeTo(w, h) } catch {}
        }}
          style={{ padding: '4px', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#161b22', border: '1px solid #21262d', color: '#8b949e', cursor: 'pointer',
            opacity: 0.6, transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
          title="Pop out">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M6 1h3v3M9 1L5 5M4 1H1v8h8V6" />
          </svg>
        </button>
        <button onClick={toggleFullscreen}
          style={{ padding: '4px', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#161b22', border: '1px solid #21262d', color: '#8b949e', cursor: 'pointer',
            opacity: 0.6, transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
          title="Fullscreen">
          {isFullscreen ? <span style={{ fontSize: 8, fontWeight: 600 }}>ESC</span> : (
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 4V1h3M6 1h3v3M9 6v3H6M4 9H1V6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
