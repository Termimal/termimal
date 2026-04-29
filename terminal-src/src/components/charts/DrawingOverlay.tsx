// components/charts/DrawingOverlay.tsx — Drawings anchored to chart price/time coordinates
// Supports: trendline, hline, rect, text, arrow, fib
// Each drawing has its own color / lineWidth / lineStyle, plus locked/hidden flags.
// Exposes selectedBounds so parent can float a properties toolbar above the selected object.
import { useRef, useState, useEffect } from 'react'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'

export type DrawingType = 'trendline' | 'hline' | 'rect' | 'text' | 'arrow' | 'fib'
export type LineStyleId = 'solid' | 'dashed' | 'dotted'

export interface Drawing {
  id: string
  type: DrawingType
  lx1: number; py1: number
  lx2: number; py2: number
  text?: string
  color?: string
  lineWidth?: 1 | 2 | 3
  lineStyle?: LineStyleId
  locked?: boolean
  hidden?: boolean
  selected?: boolean
}

export interface SelectedBounds {
  id: string
  type: DrawingType
  x: number; y: number // top-left pixel of bounding box
  w: number; h: number
  // Drawing's current style for the floating toolbar to read
  color: string
  lineWidth: 1 | 2 | 3
  lineStyle: LineStyleId
  locked: boolean
}

interface Props {
  activeTool: string
  width: number
  height: number
  drawings: Drawing[]
  onDrawingsChange: (d: Drawing[]) => void
  onSelectedBoundsChange?: (b: SelectedBounds | null) => void
  chart: IChartApi | null
  series: ISeriesApi<any> | null
  storageKey?: string
  // Optional: when set, called after a drawing is created so the parent can switch
  // back to the crosshair tool. This implements TradingView-style "draw once, then
  // back to cursor" behaviour, so the user doesn't accidentally draw another shape
  // when trying to interact with the one they just made.
  onDrawingComplete?: () => void
}

const DEFAULT_COLOR = '#58a6ff'
const SELECTED_COLOR = '#d29922'
const HANDLE_COLOR = '#d29922'
const PREVIEW_COLOR = 'rgba(88,166,255,0.55)'

const FIB_LEVELS = [
  { ratio: 0,     label: '0' },
  { ratio: 0.236, label: '23.6' },
  { ratio: 0.382, label: '38.2' },
  { ratio: 0.5,   label: '50' },
  { ratio: 0.618, label: '61.8' },
  { ratio: 0.786, label: '78.6' },
  { ratio: 1,     label: '100' },
  { ratio: 1.272, label: '127.2' },
  { ratio: 1.618, label: '161.8' },
]

const HIT = 10, HANDLE = 4, MIN_DRAG = 4

// ── Coordinate conversion ───────────────────────────────
function toPixel(chart: IChartApi | null, series: ISeriesApi<any> | null, lx: number, py: number): { x: number; y: number } | null {
  if (!chart || !series) return null
  try {
    const x = chart.timeScale().logicalToCoordinate(lx as any)
    const y = series.priceToCoordinate(py)
    if (x == null || y == null) return null
    return { x, y }
  } catch { return null }
}

function toData(chart: IChartApi | null, series: ISeriesApi<any> | null, px: number, py: number): { lx: number; price: number } | null {
  if (!chart || !series) return null
  try {
    const lx = chart.timeScale().coordinateToLogical(px)
    const price = series.coordinateToPrice(py)
    if (lx == null || price == null) return null
    return { lx, price: price as number }
  } catch { return null }
}

// ── Hit testing ─────────────────────────────────────────
function ptSegDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2-x1, dy = y2-y1, len2 = dx*dx+dy*dy
  if (len2 === 0) return Math.hypot(px-x1, py-y1)
  const t = Math.max(0, Math.min(1, ((px-x1)*dx+(py-y1)*dy)/len2))
  return Math.hypot(px-(x1+t*dx), py-(y1+t*dy))
}

function hitTestPx(d: Drawing, mx: number, my: number, w: number, chart: IChartApi|null, series: ISeriesApi<any>|null): boolean {
  if (d.hidden) return false
  const p1 = toPixel(chart, series, d.lx1, d.py1)
  const p2 = toPixel(chart, series, d.lx2, d.py2)
  if (!p1) return false
  const x1=p1.x, y1=p1.y, x2=p2?.x??p1.x, y2=p2?.y??p1.y
  switch (d.type) {
    case 'trendline':
    case 'arrow':
      return ptSegDist(mx, my, x1, y1, x2, y2) < HIT
    case 'hline':
      return Math.abs(my - y1) < HIT
    case 'rect':
      return mx >= Math.min(x1,x2)-HIT && mx <= Math.max(x1,x2)+HIT && my >= Math.min(y1,y2)-HIT && my <= Math.max(y1,y2)+HIT
    case 'fib': {
      // Hit if near any fib level line within the bar range
      const topY = Math.min(y1, y2), botY = Math.max(y1, y2)
      const leftX = Math.min(x1, x2), rightX = Math.max(x1, x2)
      if (mx < leftX - HIT || mx > rightX + HIT) return false
      for (const lv of FIB_LEVELS) {
        const ly = topY + (botY - topY) * lv.ratio
        if (Math.abs(my - ly) < HIT) return true
      }
      return false
    }
    case 'text':
      return mx >= x1-6 && mx <= x1+130 && my >= y1-16 && my <= y1+6
    default: return false
  }
}

function boundsOf(d: Drawing, chart: IChartApi|null, series: ISeriesApi<any>|null, w: number): { x: number; y: number; w: number; h: number } | null {
  const p1 = toPixel(chart, series, d.lx1, d.py1)
  const p2 = toPixel(chart, series, d.lx2, d.py2)
  if (!p1) return null
  const x1=p1.x, y1=p1.y, x2=p2?.x??p1.x, y2=p2?.y??p1.y
  switch (d.type) {
    case 'hline':
      return { x: 0, y: y1 - 8, w: w, h: 16 }
    case 'text':
      return { x: x1 - 4, y: y1 - 18, w: 120, h: 22 }
    default:
      return {
        x: Math.min(x1, x2) - 4,
        y: Math.min(y1, y2) - 4,
        w: Math.abs(x2 - x1) + 8,
        h: Math.abs(y2 - y1) + 8,
      }
  }
}

function getDash(style: LineStyleId | undefined): number[] {
  if (style === 'dashed') return [8, 6]
  if (style === 'dotted') return [2, 4]
  return []
}

// ── Component ───────────────────────────────────────────
// AxisHint — small invisible div that overlays the price-axis (right) or time-axis (bottom)
// area of the chart. Sets the right cursor (ns-resize / ew-resize) so the user gets
// TradingView-style feedback on hover. On mousedown it disables its own pointer-events
// so the lightweight-charts canvas underneath receives the event natively — the user's
// drag motion then flows directly to the chart's axis-drag handler. Pointer-events
// restore on document mouseup.
function AxisHint({ side, width, height, cursor, chart, onEnter }: {
  side: 'right' | 'bottom'
  width: number
  height: number
  cursor: 'ns-resize' | 'ew-resize'
  chart: IChartApi | null
  onEnter?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Custom price-axis drag: manipulate scaleMargins directly via lightweight-charts API.
  // Drag DOWN on the price axis → reduce top margin (expand visible price range upward).
  // Drag UP on the price axis → increase top margin (compress visible price range).
  // No event forwarding needed — bypasses all the synthetic-event complexity that
  // didn't reliably engage lightweight-charts' internal axis-drag handler.
  const handleDown = (e: React.MouseEvent) => {
    if (!chart) return
    e.preventDefault(); e.stopPropagation()
    if (side === 'right') {
      const ps = chart.priceScale('right')
      const startY = e.clientY
      let initial: { top: number, bottom: number }
      try {
        const opts: any = ps.options()
        initial = { top: opts.scaleMargins?.top ?? 0.05, bottom: opts.scaleMargins?.bottom ?? 0.25 }
      } catch { initial = { top: 0.05, bottom: 0.25 } }
      // Switch off autoScale while user is dragging
      try { ps.applyOptions({ autoScale: false } as any) } catch {}

      const onMove = (ev: MouseEvent) => {
        const dy = ev.clientY - startY
        // Sensitivity: each ~1500px of drag changes margin by full 0.4. Slow & precise,
        // matching TradingView's price-axis-drag feel — needs deliberate motion to scale.
        const delta = dy / 1500
        // Drag DOWN (positive dy) → reduce both margins → data fills more of vertical space
        // Bounds: 0.45 max margin = data can compress to ~10% of space (good zoom-out),
        // 0.02 min = data can fill ~96% of space (good zoom-in). Reverted from 0.95/0.001
        // because looser bounds felt unbalanced.
        const newTop = Math.max(0.02, Math.min(0.45, initial.top - delta))
        const newBottom = Math.max(0.02, Math.min(0.45, initial.bottom - delta))
        try { ps.applyOptions({ scaleMargins: { top: newTop, bottom: newBottom } }) } catch {}
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove, true)
        document.removeEventListener('mouseup', onUp, true)
      }
      document.addEventListener('mousemove', onMove, true)
      document.addEventListener('mouseup', onUp, true)
    } else {
      // Bottom (time) axis: use lightweight-charts' built-in time-scale API to set the
      // visible time range based on horizontal drag. Drag right → expand range, left → compress.
      const ts = chart.timeScale()
      const startX = e.clientX
      let initialBars: any
      try { initialBars = ts.getVisibleLogicalRange() } catch { initialBars = null }
      if (!initialBars) return
      const initWidth = initialBars.to - initialBars.from

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX
        // Drag right → compress (zoom in horizontally), drag left → expand. Slower
        // sensitivity so the chart doesn't whip across the screen.
        const factor = 1 + (dx / 800)
        const newWidth = Math.max(5, initWidth * factor)
        const center = (initialBars.from + initialBars.to) / 2
        try {
          ts.setVisibleLogicalRange({ from: center - newWidth / 2, to: center + newWidth / 2 })
        } catch {}
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove, true)
        document.removeEventListener('mouseup', onUp, true)
      }
      document.addEventListener('mousemove', onMove, true)
      document.addEventListener('mouseup', onUp, true)
    }
  }
  const handleDouble = (e: React.MouseEvent) => {
    if (!chart) return
    e.preventDefault(); e.stopPropagation()
    if (side === 'right') {
      try { chart.priceScale('right').applyOptions({ autoScale: true } as any) } catch {}
    } else {
      try { chart.timeScale().fitContent() } catch {}
    }
  }
  // When user enters the axis area, clear lightweight-charts' crosshair so the
  // dashed + guide lines stop drawing across the axis labels.
  const handleEnter = () => {
    onEnter?.()
    try { chart?.clearCrosshairPosition?.() } catch {}
  }
  const style: React.CSSProperties = {
    position: 'absolute', cursor, pointerEvents: 'auto', zIndex: 11,
    background: 'transparent', userSelect: 'none',
  }
  if (side === 'right') {
    style.top = 0
    style.right = 0
    style.width = width
    style.height = height
  } else {
    style.bottom = 0
    style.left = 0
    style.width = width
    style.height = height
  }
  return (
    <div ref={ref} style={style}
      onMouseDown={handleDown}
      onDoubleClick={handleDouble}
      onMouseEnter={handleEnter}
    />
  )
}

export function DrawingOverlay({ activeTool, width, height, drawings, onDrawingsChange, onSelectedBoundsChange, chart, series, storageKey, onDrawingComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [sp, setSp] = useState<{x:number;y:number}|null>(null)
  const [cp, setCp] = useState<{x:number;y:number}|null>(null)
  const [dragId, setDragId] = useState<string|null>(null)
  const [dragStart, setDragStart] = useState({x:0,y:0})
  const [hovering, setHovering] = useState(false)
  // Track cursor position on the overlay so we can show TradingView-style ns-resize
  // (vertical) cursor on the right price-axis area and ew-resize on the bottom
  // time-axis area, even when in passThrough mode.
  const [hoverPos, setHoverPos] = useState<{x:number; y:number} | null>(null)
  const [tick, setTick] = useState(0)
  const [ctxMenu, setCtxMenu] = useState<{x:number;y:number;id:string}|null>(null)
  const [resizeId, setResizeId] = useState<string|null>(null)
  const [resizeCorner, setResizeCorner] = useState<'p1'|'p2'|'p3'|'p4'|null>(null)

  const isDrawTool = ['trendline','hline','rect','text','arrow','fib'].includes(activeTool)
  const isSelect = activeTool === 'crosshair'
  const hasSelected = drawings.some(d => d.selected)

  // Persistence
  useEffect(() => {
    if (!storageKey) return
    try {
      const s = localStorage.getItem(`ft-draw-${storageKey}`)
      if (s) {
        const p = JSON.parse(s)
        if (Array.isArray(p)) onDrawingsChange(p.map((d:any) => ({ ...d, selected: false })))
      }
    } catch {}
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    try {
      const clean = drawings.map(d => ({ ...d, selected: false }))
      if (clean.length) localStorage.setItem(`ft-draw-${storageKey}`, JSON.stringify(clean))
      else localStorage.removeItem(`ft-draw-${storageKey}`)
    } catch {}
  }, [drawings, storageKey])

  // Chart pan/zoom re-render
  useEffect(() => {
    if (!chart) return
    const handler = () => setTick(t => t + 1)
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler)
    return () => { try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler) } catch {} }
  }, [chart])

  // Emit selected bounds to parent for floating toolbar
  useEffect(() => {
    if (!onSelectedBoundsChange) return
    const sel = drawings.find(d => d.selected)
    if (!sel) { onSelectedBoundsChange(null); return }
    const b = boundsOf(sel, chart, series, width)
    if (!b) { onSelectedBoundsChange(null); return }
    onSelectedBoundsChange({
      id: sel.id, type: sel.type,
      x: b.x, y: b.y, w: b.w, h: b.h,
      color: sel.color ?? DEFAULT_COLOR,
      lineWidth: sel.lineWidth ?? 1,
      lineStyle: sel.lineStyle ?? 'solid',
      locked: !!sel.locked,
    })
  }, [drawings, tick, width, height, chart, series])

  // Render
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    c.width = width * dpr; c.height = height * dpr
    ctx.scale(dpr, dpr)
    c.style.width = width + 'px'; c.style.height = height + 'px'
    ctx.clearRect(0, 0, width, height)
    ctx.imageSmoothingEnabled = true
    if (!chart || !series) return

    drawings.forEach(d => {
      if (d.hidden) return
      const p1 = toPixel(chart, series, d.lx1, d.py1)
      const p2 = toPixel(chart, series, d.lx2, d.py2)
      if (!p1) return

      const sel = !!d.selected
      const baseColor = d.color ?? DEFAULT_COLOR
      const col = sel ? SELECTED_COLOR : baseColor
      const lw = d.lineWidth ?? 1
      const dash = getDash(d.lineStyle)

      ctx.save()
      ctx.globalAlpha = d.locked ? 0.5 : (sel ? 1 : 0.9)
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = sel ? lw + 0.5 : lw
      if (dash.length) ctx.setLineDash(dash)

      const x1 = p1.x, y1 = p1.y, x2 = p2?.x ?? p1.x, y2 = p2?.y ?? p1.y

      if (d.type === 'trendline' && p2) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
        ctx.setLineDash([])
        if (sel) { ctx.fillStyle=HANDLE_COLOR; ctx.fillRect(x1-HANDLE,y1-HANDLE,HANDLE*2,HANDLE*2); ctx.fillRect(x2-HANDLE,y2-HANDLE,HANDLE*2,HANDLE*2) }
      } else if (d.type === 'arrow' && p2) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
        ctx.setLineDash([])
        // Arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const head = 10
        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7))
        ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7))
        ctx.closePath()
        ctx.fill()
        if (sel) { ctx.fillStyle=HANDLE_COLOR; ctx.fillRect(x1-HANDLE,y1-HANDLE,HANDLE*2,HANDLE*2); ctx.fillRect(x2-HANDLE,y2-HANDLE,HANDLE*2,HANDLE*2) }
      } else if (d.type === 'hline') {
        if (!dash.length) ctx.setLineDash([6, 4])
        ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(width, y1); ctx.stroke()
        ctx.setLineDash([])
        ctx.font = '10px monospace'; ctx.textAlign = 'right'
        ctx.fillText(`${d.py1.toFixed(2)}`, width - 6, y1 - 5)
        ctx.textAlign = 'left'
        if (sel) { ctx.fillStyle=HANDLE_COLOR; ctx.fillRect(4, y1-HANDLE, HANDLE*2, HANDLE*2); ctx.fillRect(width-12, y1-HANDLE, HANDLE*2, HANDLE*2) }
      } else if (d.type === 'rect' && p2) {
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2)
        const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1)
        ctx.fillStyle = sel ? 'rgba(210,153,34,0.08)' : 'rgba(88,166,255,0.06)'
        const savedAlpha = ctx.globalAlpha
        ctx.globalAlpha = 1
        ctx.fillRect(rx, ry, rw, rh)
        ctx.globalAlpha = savedAlpha
        ctx.strokeStyle = col
        ctx.strokeRect(rx, ry, rw, rh)
        ctx.setLineDash([])
        if (sel) {
          ctx.fillStyle = HANDLE_COLOR
          ;[{x:x1,y:y1},{x:x2,y:y2},{x:x1,y:y2},{x:x2,y:y1}].forEach(p => ctx.fillRect(p.x-HANDLE, p.y-HANDLE, HANDLE*2, HANDLE*2))
        }
      } else if (d.type === 'fib' && p2) {
        const topY = Math.min(y1, y2), botY = Math.max(y1, y2)
        const leftX = Math.min(x1, x2), rightX = Math.max(x1, x2)
        const topP = Math.max(d.py1, d.py2), botP = Math.min(d.py1, d.py2)
        ctx.font = '10px monospace'; ctx.textAlign = 'right'
        for (const lv of FIB_LEVELS) {
          const ly = topY + (botY - topY) * lv.ratio
          const lp = topP - (topP - botP) * lv.ratio
          ctx.beginPath()
          ctx.moveTo(leftX, ly); ctx.lineTo(rightX, ly)
          ctx.stroke()
          ctx.fillStyle = col
          ctx.globalAlpha = sel ? 0.95 : 0.75
          ctx.fillText(`${lv.label}% ${lp.toFixed(2)}`, rightX - 4, ly - 3)
        }
        ctx.textAlign = 'left'
        ctx.setLineDash([])
        if (sel) {
          ctx.fillStyle = HANDLE_COLOR; ctx.globalAlpha = 1
          ;[{x:x1,y:y1},{x:x2,y:y2}].forEach(p => ctx.fillRect(p.x-HANDLE, p.y-HANDLE, HANDLE*2, HANDLE*2))
        }
      } else if (d.type === 'text') {
        ctx.setLineDash([])
        ctx.font = '11px -apple-system,sans-serif'
        ctx.fillStyle = col
        ctx.globalAlpha = sel ? 1 : 0.92
        ctx.fillText(d.text ?? 'Note', x1, y1)
        if (sel) {
          const m = ctx.measureText(d.text ?? 'Note')
          ctx.strokeStyle = 'rgba(210,153,34,0.5)'
          ctx.setLineDash([3, 3])
          ctx.strokeRect(x1-3, y1-14, m.width+6, 18)
          ctx.setLineDash([])
        }
      }
      ctx.restore()
    })

    // Preview
    if (isDrawing && sp && cp) {
      ctx.save(); ctx.strokeStyle = PREVIEW_COLOR; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.globalAlpha = 0.7
      if (activeTool === 'trendline' || activeTool === 'arrow') {
        ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(cp.x, cp.y); ctx.stroke()
      } else if (activeTool === 'hline') {
        ctx.beginPath(); ctx.moveTo(0, sp.y); ctx.lineTo(width, sp.y); ctx.stroke()
      } else if (activeTool === 'rect' || activeTool === 'fib') {
        const rx = Math.min(sp.x, cp.x), ry = Math.min(sp.y, cp.y)
        ctx.fillStyle = 'rgba(88,166,255,0.04)'; ctx.globalAlpha = 1
        ctx.fillRect(rx, ry, Math.abs(cp.x-sp.x), Math.abs(cp.y-sp.y))
        ctx.globalAlpha = 0.6
        ctx.strokeRect(rx, ry, Math.abs(cp.x-sp.x), Math.abs(cp.y-sp.y))
      }
      ctx.restore()
    }
  }, [drawings, isDrawing, sp, cp, activeTool, width, height, chart, series, tick])

  const pos = (e: React.MouseEvent) => {
    const r = canvasRef.current?.getBoundingClientRect()
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 }
  }

  // Forward a mouse event to whatever chart canvas is underneath the overlay.
  // Used so that clicking empty area in the overlay still pans the chart, and
  // mousewheel still zooms — even though the overlay receives events first.
  // The trick: temporarily set the overlay's pointer-events to 'none' so the
  // chart canvas underneath becomes the topmost interactive element, then
  // dispatch a synthetic event at the same coordinates. Restore pointer-events
  // on document mouseup so subsequent events return to the overlay.
  const forwardToChart = (e: React.MouseEvent, type: string) => {
    const wrapper = canvasRef.current
    if (!wrapper) return
    wrapper.style.pointerEvents = 'none'
    const target = document.elementFromPoint(e.clientX, e.clientY)
    if (target && target !== wrapper) {
      target.dispatchEvent(new MouseEvent(type, {
        clientX: e.clientX, clientY: e.clientY, button: e.button, buttons: e.buttons,
        bubbles: true, cancelable: true, view: window,
      }))
    }
    if (type === 'mousedown') {
      // Drag continues at document level (lightweight-charts captures there).
      // Restore pointer-events when the drag ends.
      const restore = () => {
        if (wrapper) wrapper.style.pointerEvents = 'auto'
        document.removeEventListener('mouseup', restore, true)
      }
      document.addEventListener('mouseup', restore, true)
    } else {
      setTimeout(() => { if (wrapper) wrapper.style.pointerEvents = 'auto' }, 30)
    }
  }
  const forwardWheelToChart = (e: React.WheelEvent) => {
    const wrapper = canvasRef.current
    if (!wrapper) return
    wrapper.style.pointerEvents = 'none'
    const target = document.elementFromPoint(e.clientX, e.clientY)
    if (target && target !== wrapper) {
      target.dispatchEvent(new WheelEvent('wheel', {
        clientX: e.clientX, clientY: e.clientY,
        deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ, deltaMode: e.deltaMode,
        bubbles: true, cancelable: true, view: window,
      }))
    }
    setTimeout(() => { if (wrapper) wrapper.style.pointerEvents = 'auto' }, 30)
  }

  const onDown = (e: React.MouseEvent) => {
    setCtxMenu(null)
    const p = pos(e)
    if (isSelect) {
      const hit = [...drawings].reverse().find(d => !d.locked && hitTestPx(d, p.x, p.y, width, chart, series))
      if (hit) {
        e.stopPropagation(); e.preventDefault()
        onDrawingsChange(drawings.map(d => ({ ...d, selected: d.id === hit.id })))
        if (hit.type === 'rect' && hit.selected) {
          const hp1 = toPixel(chart, series, hit.lx1, hit.py1)
          const hp2 = toPixel(chart, series, hit.lx2, hit.py2)
          if (hp1 && hp2) {
            const corners = [{k:'p1' as const,x:hp1.x,y:hp1.y},{k:'p2' as const,x:hp2.x,y:hp2.y},{k:'p3' as const,x:hp1.x,y:hp2.y},{k:'p4' as const,x:hp2.x,y:hp1.y}]
            const hitCorner = corners.find(c => Math.hypot(p.x-c.x, p.y-c.y) < HIT)
            if (hitCorner) { setResizeId(hit.id); setResizeCorner(hitCorner.k); setDragStart(p); return }
          }
        }
        setDragId(hit.id); setDragStart(p)
        return
      }
      // Empty area click. First deselect any selected drawing (closes the floating
      // toolbar). Then forward the mousedown to the chart canvas underneath so the
      // user can still pan the chart by drag, even though the overlay receives
      // events. The forward uses pointer-events:'none' temporarily and dispatches
      // a synthetic event at the same coordinates.
      if (hasSelected) { onDrawingsChange(drawings.map(d => ({ ...d, selected: false }))) }
      forwardToChart(e, 'mousedown')
      return
    }
    if (activeTool === 'text') {
      e.stopPropagation(); e.preventDefault()
      const dataP = toData(chart, series, p.x, p.y); if (!dataP) return
      const text = window.prompt('Annotation:', ''); if (!text) return
      onDrawingsChange([...drawings.map(d=>({...d,selected:false})), { id:Date.now().toString(), type:'text', lx1:dataP.lx, py1:dataP.price, lx2:dataP.lx, py2:dataP.price, text, color: DEFAULT_COLOR, lineWidth: 1, lineStyle: 'solid' }])
      onDrawingComplete?.()
      return
    }
    if (isDrawTool) { e.stopPropagation(); e.preventDefault(); setIsDrawing(true); setSp(p); setCp(p) }
  }

  const onMove = (e: React.MouseEvent) => {
    const p = pos(e)
    setHoverPos(p)
    if (isDrawing && sp) { e.stopPropagation(); e.preventDefault(); setCp(p); return }
    if (resizeId && resizeCorner) {
      e.stopPropagation(); e.preventDefault()
      const newData = toData(chart, series, p.x, p.y); if (!newData) return
      onDrawingsChange(drawings.map(d => {
        if (d.id !== resizeId) return d
        if (resizeCorner === 'p1') return { ...d, lx1: newData.lx, py1: newData.price }
        if (resizeCorner === 'p2') return { ...d, lx2: newData.lx, py2: newData.price }
        if (resizeCorner === 'p3') return { ...d, lx1: newData.lx, py2: newData.price }
        if (resizeCorner === 'p4') return { ...d, lx2: newData.lx, py1: newData.price }
        return d
      }))
      return
    }
    if (dragId) {
      e.stopPropagation(); e.preventDefault()
      const d = drawings.find(dr => dr.id === dragId); if (!d || d.locked) return
      const oldData = toData(chart, series, dragStart.x, dragStart.y)
      const newData = toData(chart, series, p.x, p.y)
      if (!oldData || !newData) return
      const dlx = newData.lx - oldData.lx, dpy = newData.price - oldData.price
      onDrawingsChange(drawings.map(dr => dr.id === dragId
        ? d.type === 'hline'
          ? { ...dr, py1: dr.py1 + dpy, py2: dr.py2 + dpy }
          : { ...dr, lx1: dr.lx1 + dlx, py1: dr.py1 + dpy, lx2: dr.lx2 + dlx, py2: dr.py2 + dpy }
        : dr))
      setDragStart(p); return
    }
    if (isSelect) {
      setHovering(drawings.some(d => !d.locked && hitTestPx(d, p.x, p.y, width, chart, series)))
    }
  }

  const onUp = (e: React.MouseEvent) => {
    if (isDrawing && sp && cp) {
      e.stopPropagation(); e.preventDefault()
      const dist = Math.hypot(cp.x-sp.x, cp.y-sp.y)
      if (activeTool === 'hline' || dist >= MIN_DRAG) {
        const d1 = toData(chart, series, sp.x, sp.y)
        const d2 = toData(chart, series, cp.x, cp.y)
        if (d1) {
          const newDrawing: Drawing = {
            id: Date.now().toString(),
            type: activeTool as DrawingType,
            lx1: d1.lx, py1: d1.price,
            lx2: activeTool === 'hline' ? d1.lx : (d2?.lx ?? d1.lx),
            py2: activeTool === 'hline' ? d1.price : (d2?.price ?? d1.price),
            color: DEFAULT_COLOR, lineWidth: 1, lineStyle: 'solid',
            selected: true,
          }
          onDrawingsChange([...drawings.map(d => ({ ...d, selected: false })), newDrawing])
          // Switch back to cursor so the user can immediately interact with what they drew
          onDrawingComplete?.()
        }
      }
    }
    setIsDrawing(false); setSp(null); setCp(null); setDragId(null); setResizeId(null); setResizeCorner(null)
  }

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ctxMenu) { setCtxMenu(null); return }
        if (isDrawing) { setIsDrawing(false); setSp(null); setCp(null); return }
        if (hasSelected) { onDrawingsChange(drawings.map(d => ({ ...d, selected: false }))); return }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelected) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
        e.preventDefault(); e.stopPropagation()
        onDrawingsChange(drawings.filter(d => !d.selected))
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [drawings, onDrawingsChange, isDrawing, hasSelected])

  let cursor: string = 'crosshair'
  if (isDrawTool) cursor = 'crosshair'
  else if (resizeId) cursor = 'nwse-resize'
  else if (dragId) cursor = 'grabbing'
  else if (hovering) cursor = 'grab'
  // In cursor mode, show + crosshair over the chart body. The AxisHint sibling
  // elements (rendered after this canvas) override the cursor over the price/time
  // axis areas to ns-resize / ew-resize via their own pointer-events and z-index.
  else if (activeTool === 'crosshair') cursor = 'crosshair'

  // When in cursor mode with a selected drawing, intercept clicks so the next click
  // on empty area deselects (closing the floating toolbar). When nothing is selected,
  // pass mouse events through so the user can pan/zoom the chart freely.
  // Always receive events in select/draw mode — we forward to chart manually
  // when the user clicks empty area or scrolls the wheel.
  const passThrough = !isSelect && !isDrawTool && !dragId && !isDrawing && !resizeId

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const p = pos(e)
    const hit = [...drawings].reverse().find(d => hitTestPx(d, p.x, p.y, width, chart, series))
    if (hit) {
      onDrawingsChange(drawings.map(d => ({ ...d, selected: d.id === hit.id })))
      setCtxMenu({ x: e.clientX, y: e.clientY, id: hit.id })
    } else {
      setCtxMenu(null)
    }
  }

  const menuItem = (label: string, onClick: () => void, color: string = '#c9d1d9') => (
    <button onClick={() => { onClick(); setCtxMenu(null) }}
      style={{ display: 'block', width: '100%', padding: '6px 14px', background: 'transparent', border: 'none',
               color, fontSize: 11, cursor: 'pointer', textAlign: 'left' }}
      onMouseOver={e => (e.currentTarget.style.background = '#21262d')}
      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
      {label}
    </button>
  )

  return (
    <>
      <canvas ref={canvasRef} width={width} height={height}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
        onContextMenu={onContextMenu}
        onWheel={(e) => { if (isSelect && !dragId && !resizeId && !isDrawing) forwardWheelToChart(e) }}
        onDoubleClick={(e) => { if (isSelect && !dragId && !resizeId) forwardToChart(e, 'dblclick') }}
        onMouseLeave={(e) => { onUp(e as any); setHovering(false); setHoverPos(null) }}
        style={{ position: 'absolute', top: 0, left: 0, width, height, cursor, pointerEvents: passThrough ? 'none' : 'auto', zIndex: 10 }}
      />
      {/* Axis cursor hints — show TradingView-style ns-resize on right price-axis
          area and ew-resize on bottom time-axis area. Clicks/drags forward to the
          chart canvas underneath via dispatchEvent so the user can still drag the
          axis to scale the chart. */}
      <AxisHint side="right" width={72} height={height - 24} cursor="ns-resize" chart={chart}/>
      <AxisHint side="bottom" width={width - 72} height={24} cursor="ew-resize" chart={chart}/>
      {ctxMenu && (() => {
        const d = drawings.find(dr => dr.id === ctxMenu.id)
        return (
          <div style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 1000,
                       background: '#161b22', border: '1px solid #30363d', borderRadius: 3,
                       boxShadow: '0 4px 16px rgba(0,0,0,0.5)', padding: '4px 0', minWidth: 130 }}
               onClick={e => e.stopPropagation()}>
            {menuItem('Duplicate', () => {
              const orig = drawings.find(dr => dr.id === ctxMenu.id)
              if (orig) onDrawingsChange([...drawings, { ...orig, id: Date.now().toString(), lx1: orig.lx1 + 2, py1: orig.py1, lx2: orig.lx2 + 2, py2: orig.py2, selected: false }])
            })}
            {menuItem(d?.locked ? 'Unlock' : 'Lock', () => {
              onDrawingsChange(drawings.map(dr => dr.id === ctxMenu.id ? { ...dr, locked: !dr.locked } : dr))
            })}
            {menuItem(d?.hidden ? 'Show' : 'Hide', () => {
              onDrawingsChange(drawings.map(dr => dr.id === ctxMenu.id ? { ...dr, hidden: !dr.hidden } : dr))
            })}
            <div style={{ height: 1, background: '#30363d', margin: '4px 0' }}/>
            {menuItem('Delete', () => onDrawingsChange(drawings.filter(dr => dr.id !== ctxMenu.id)), '#f85149')}
          </div>
        )
      })()}
    </>
  )
}
