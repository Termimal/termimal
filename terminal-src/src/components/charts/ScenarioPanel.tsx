// components/charts/ScenarioPanel.tsx — Scenario Planner MVP
import { useState, useEffect, useMemo, useRef } from 'react'
import { formatPrice, getPrecision } from '@/utils/formatPrice'

const mono = "'SF Mono', Menlo, Consolas, monospace"

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
export interface Scenario {
  id: string
  type: 'bull' | 'base' | 'bear'
  status: 'watching' | 'triggered' | 'invalidated' | 'completed'
  trigger: number
  triggerNote: string
  target: number
  targetNote: string
  invalidation: number
  invalidationNote: string
  entry: number | null
  plan: string
  createdAt: string
}

export type ScenarioSet = Scenario[]

const TYPE_COL = { bull: '#34d399', base: '#d29922', bear: '#f85149' }
const TYPE_ICON = { bull: '▲', base: '—', bear: '▼' }
const TYPE_LABEL = { bull: 'BULL CASE', base: 'RANGE / NO TRADE', bear: 'BEAR CASE' }
const TYPE_DESC: Record<string, string> = { bull: 'Breakout scenario', base: 'Chop — wait for resolution', bear: 'Breakdown scenario' }
const STATUS_COL: Record<string, string> = { watching: '#8b949e', triggered: '#c9d1d9', invalidated: '#30363d', completed: '#3fb950' }

function genId() { return 'sc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

// ═══════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════
function loadScenarios(symbol: string): ScenarioSet {
  try { const s = localStorage.getItem(`ft-scenarios-${symbol}`); return s ? JSON.parse(s) : [] } catch { return [] }
}
function saveScenarios(symbol: string, scenarios: ScenarioSet) {
  localStorage.setItem(`ft-scenarios-${symbol}`, JSON.stringify(scenarios))
}

// ═══════════════════════════════════════════════════════════
// STATUS LOGIC
// ═══════════════════════════════════════════════════════════
function computeStatus(sc: Scenario, price: number): Scenario['status'] {
  if (sc.type === 'bull') {
    if (price >= sc.target) return 'completed'
    if (price <= sc.invalidation) return 'invalidated'
    if (price >= sc.trigger) return 'triggered'
    return 'watching'
  }
  if (sc.type === 'bear') {
    if (price <= sc.target) return 'completed'
    if (price >= sc.invalidation) return 'invalidated'
    if (price <= sc.trigger) return 'triggered'
    return 'watching'
  }
  // base = range
  if (sc.trigger > 0 && sc.invalidation > 0) {
    const hi = Math.max(sc.trigger, sc.invalidation)
    const lo = Math.min(sc.trigger, sc.invalidation)
    if (price > hi || price < lo) return 'invalidated'
    return 'triggered' // in range = base case active
  }
  return 'watching'
}

function getSummary(scenarios: ScenarioSet): string {
  const triggered = scenarios.find(s => s.status === 'triggered')
  if (triggered) {
    if (triggered.type === 'bull') return 'Bull case developing'
    if (triggered.type === 'bear') return 'Bear case developing'
    return 'Range-bound — no trade'
  }
  const completed = scenarios.find(s => s.status === 'completed')
  if (completed) return `${completed.type === 'bull' ? 'Bull' : 'Bear'} target reached`
  const allInval = scenarios.length > 0 && scenarios.every(s => s.status === 'invalidated')
  if (allInval) return 'All scenarios invalidated'
  if (scenarios.length === 0) return 'No scenarios defined'
  return 'Watching — no trigger hit'
}

// ═══════════════════════════════════════════════════════════
// PANEL COMPONENT
// ═══════════════════════════════════════════════════════════
interface Props {
  symbol: string
  currentPrice: number
  onClose: () => void
  scenarios: ScenarioSet
  onScenariosChange: (s: ScenarioSet) => void
}

export function ScenarioPanel({ symbol, currentPrice, onClose, scenarios, onScenariosChange }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState<'bull' | 'base' | 'bear' | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(scenarios.map(s => s.id)))
  const dec = getPrecision(symbol)

  // Update statuses based on price
  useEffect(() => {
    if (!currentPrice || scenarios.length === 0) return
    let changed = false
    const updated = scenarios.map(sc => {
      const newStatus = computeStatus(sc, currentPrice)
      if (newStatus !== sc.status) { changed = true; return { ...sc, status: newStatus } }
      return sc
    })
    if (changed) onScenariosChange(updated)
  }, [currentPrice])

  // Persist
  useEffect(() => { saveScenarios(symbol, scenarios) }, [scenarios, symbol])

  const summary = getSummary(scenarios)
  const summaryCol = summary.includes('Bull') ? '#34d399' : summary.includes('Bear') ? '#f85149' : summary.includes('Range') ? '#d29922' : summary.includes('target') ? '#3fb950' : '#484f58'

  const hasBull = scenarios.some(s => s.type === 'bull')
  const hasBase = scenarios.some(s => s.type === 'base')
  const hasBear = scenarios.some(s => s.type === 'bear')

  const addScenario = (sc: Scenario) => {
    onScenariosChange([...scenarios, sc])
    setCreating(null)
    setExpanded(prev => new Set(prev).add(sc.id))
  }

  const updateScenario = (sc: Scenario) => {
    onScenariosChange(scenarios.map(s => s.id === sc.id ? sc : s))
    setEditing(null)
  }

  const deleteScenario = (id: string) => {
    onScenariosChange(scenarios.filter(s => s.id !== id))
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  return (
    <div style={{ width: 272, background: '#0e1117', borderLeft: '1px solid #21262d', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #21262d' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.03em' }}>SCENARIOS · {symbol}</div>
          <span onClick={onClose} style={{ cursor: 'pointer', color: '#30363d', fontSize: 11, padding: '2px 4px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#8b949e')} onMouseLeave={e => (e.currentTarget.style.color = '#30363d')}>✕</span>
        </div>
        <div style={{ fontSize: 9, color: summaryCol }}>{summary}</div>
        {currentPrice > 0 && <div style={{ fontSize: 9, color: '#30363d', fontFamily: mono, marginTop: 2 }}>Last: {formatPrice(symbol, currentPrice)}</div>}
      </div>

      {/* Scenario list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
        {scenarios.length === 0 && !creating && (
          <div style={{ padding: '24px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#484f58', marginBottom: 6 }}>No scenarios yet</div>
            <div style={{ fontSize: 10, color: '#30363d', lineHeight: 1.6, marginBottom: 12 }}>
              Map your bull, base, and bear case<br />before entering a trade.
            </div>
            <div style={{ fontSize: 9, color: '#21262d', lineHeight: 1.6 }}>
              Bull = breakout plan<br />
              Base = range / no trade<br />
              Bear = breakdown plan
            </div>
          </div>
        )}

        {scenarios.map(sc => {
          const col = TYPE_COL[sc.type]
          const isExp = expanded.has(sc.id)
          const isEditing = editing === sc.id
          const rr = sc.entry && sc.invalidation && sc.target
            ? Math.abs(sc.target - sc.entry) / Math.abs(sc.entry - sc.invalidation)
            : null

          if (isEditing) return <ScenarioForm key={sc.id} type={sc.type} initial={sc} price={currentPrice} dec={dec} onSave={updateScenario} onCancel={() => setEditing(null)} />

          return (
            <div key={sc.id} style={{ borderBottom: '1px solid #161b22', borderLeft: `2px solid ${col}`, opacity: sc.status === 'invalidated' ? 0.4 : 1 }}>
              {/* Card header */}
              <div onClick={() => toggleExpand(sc.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0e1117')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ fontSize: 10, color: col }}>{TYPE_ICON[sc.type]}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#c9d1d9', flex: 1 }}>{TYPE_LABEL[sc.type]}</span>
                <span style={{
                  fontSize: 8, fontWeight: 600, color: STATUS_COL[sc.status],
                  background: `${STATUS_COL[sc.status]}12`,
                  border: `1px solid ${STATUS_COL[sc.status]}44`,
                  padding: '1px 6px', letterSpacing: '0.03em', textTransform: 'uppercase',
                  textDecoration: sc.status === 'invalidated' ? 'line-through' : 'none',
                }}>{sc.status}</span>
              </div>

              {/* Expanded content */}
              {isExp && (
                <div style={{ padding: '2px 12px 10px' }}>
                  {sc.type === 'base' ? (
                    <div style={{ fontSize: 10, color: '#8b949e' }}>
                      <div style={{ fontSize: 9, color: '#d29922', marginBottom: 6 }}>Price stays between these levels — no directional trade.</div>
                      <Row label="Upper Bound" value={sc.trigger} col={col} dec={dec} />
                      <Row label="Lower Bound" value={sc.invalidation} col={col} dec={dec} />
                      <div style={{ fontSize: 9, color: '#30363d', marginTop: 4 }}>Breaks above or below = scenario resolved</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: '#8b949e' }}>
                      <Row label="Trigger" value={sc.trigger} col={col} note={sc.triggerNote} dec={dec} />
                      <Row label="Target" value={sc.target} col={col} note={sc.targetNote} dec={dec} />
                      <Row label="Stop / Inval." value={sc.invalidation} col="#f85149" note={sc.invalidationNote} dec={dec} />
                      {sc.entry != null && <Row label="Entry" value={sc.entry} col="#3fb950" dec={dec} />}
                      {rr != null && (
                        <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #161b22' }}>
                          <Row label="R : R" value={null} text={`1 : ${rr.toFixed(1)}`} col={rr >= 2 ? '#3fb950' : rr >= 1 ? '#d29922' : '#f85149'} />
                        </div>
                      )}
                    </div>
                  )}
                  {sc.plan && (
                    <div style={{ fontSize: 10, color: '#484f58', marginTop: 8, padding: '6px 8px', background: '#0e1117', borderLeft: `2px solid ${col}22`, lineHeight: 1.5 }}>
                      {sc.plan}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <span onClick={() => setEditing(sc.id)} style={{ fontSize: 9, color: '#484f58', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#34d399')} onMouseLeave={e => (e.currentTarget.style.color = '#484f58')}>Edit</span>
                    <span onClick={() => deleteScenario(sc.id)} style={{ fontSize: 9, color: '#484f58', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f85149')} onMouseLeave={e => (e.currentTarget.style.color = '#484f58')}>Delete</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Create form */}
        {creating && (
          <ScenarioForm type={creating} price={currentPrice} dec={dec} onSave={addScenario} onCancel={() => setCreating(null)} />
        )}
      </div>

      {/* Add buttons */}
      {!creating && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #21262d', display: 'flex', gap: 4 }}>
          {!hasBull && <AddBtn type="bull" onClick={() => setCreating('bull')} />}
          {!hasBase && <AddBtn type="base" onClick={() => setCreating('base')} />}
          {!hasBear && <AddBtn type="bear" onClick={() => setCreating('bear')} />}
          {hasBull && hasBase && hasBear && (
            <div style={{ fontSize: 9, color: '#30363d', padding: '4px 0' }}>All scenarios defined</div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══ Helpers ═══
function Row({ label, value, col, note, text, dec = 2 }: { label: string; value: number | null; col: string; note?: string; text?: string; dec?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
      <span style={{ color: '#484f58' }}>{label}</span>
      <span style={{ fontFamily: mono, fontWeight: 500, color: col }}>
        {text ?? (value != null ? value.toFixed(dec) : '—')}
        {note && <span style={{ color: '#30363d', fontWeight: 400, marginLeft: 4 }}>{note}</span>}
      </span>
    </div>
  )
}

function AddBtn({ type, onClick }: { type: 'bull' | 'base' | 'bear'; onClick: () => void }) {
  const col = TYPE_COL[type]
  return (
    <button onClick={onClick}
      style={{ flex: 1, padding: '5px 0', fontSize: 9, fontWeight: 500, color: col, background: 'transparent', border: `1px solid ${col}33`, cursor: 'pointer', letterSpacing: '0.03em' }}
      onMouseEnter={e => (e.currentTarget.style.background = col + '10')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      + {type.toUpperCase()}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════
// SCENARIO FORM
// ═══════════════════════════════════════════════════════════
function ScenarioForm({ type, initial, price, dec, onSave, onCancel }: {
  type: 'bull' | 'base' | 'bear'; initial?: Scenario; price: number; dec?: number; onSave: (s: Scenario) => void; onCancel: () => void
}) {
  const col = TYPE_COL[type]
  const d = dec ?? 2
  const [trigger, setTrigger] = useState(initial?.trigger?.toString() ?? '')
  const [triggerNote, setTriggerNote] = useState(initial?.triggerNote ?? '')
  const [target, setTarget] = useState(initial?.target?.toString() ?? '')
  const [targetNote, setTargetNote] = useState(initial?.targetNote ?? '')
  const [invalidation, setInvalidation] = useState(initial?.invalidation?.toString() ?? '')
  const [invalidationNote, setInvalidationNote] = useState(initial?.invalidationNote ?? '')
  const [entry, setEntry] = useState(initial?.entry?.toString() ?? '')
  const [plan, setPlan] = useState(initial?.plan ?? '')

  // Suggest defaults
  useEffect(() => {
    if (initial || !price) return
    if (type === 'bull') {
      setTrigger((price * 1.02).toFixed(d))
      setTarget((price * 1.08).toFixed(d))
      setInvalidation((price * 0.97).toFixed(d))
    } else if (type === 'bear') {
      setTrigger((price * 0.98).toFixed(d))
      setTarget((price * 0.92).toFixed(d))
      setInvalidation((price * 1.03).toFixed(d))
    } else {
      setTrigger((price * 1.02).toFixed(d))
      setInvalidation((price * 0.98).toFixed(d))
    }
  }, [])

  const save = () => {
    const sc: Scenario = {
      id: initial?.id ?? genId(),
      type, status: 'watching',
      trigger: +trigger || 0, triggerNote,
      target: +target || 0, targetNote,
      invalidation: +invalidation || 0, invalidationNote,
      entry: entry ? +entry : null,
      plan, createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    onSave(sc)
  }

  const F = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9, color: '#484f58', marginBottom: 2 }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', fontSize: 10, padding: '4px 6px', background: '#0e1117', border: '1px solid #21262d', color: '#c9d1d9', fontFamily: mono, outline: 'none' }}
        onFocus={e => (e.target.style.borderColor = col)} onBlur={e => (e.target.style.borderColor = '#21262d')} />
    </div>
  )

  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid #161b22', background: '#0e1117' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: col }}>{TYPE_ICON[type]}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#c9d1d9' }}>{TYPE_LABEL[type]}</span>
      </div>
      <div style={{ fontSize: 9, color: '#30363d', marginBottom: 8 }}>{TYPE_DESC[type]}</div>

      {type === 'base' ? (<>
        <F label="Upper bound (resistance)" value={trigger} onChange={setTrigger} placeholder="Price ceiling" />
        <F label="Lower bound (support)" value={invalidation} onChange={setInvalidation} placeholder="Price floor" />
        <div style={{ fontSize: 9, color: '#30363d', marginBottom: 6 }}>If price stays inside → no trade. If it breaks out → scenario resolved.</div>
      </>) : (<>
        <F label={type === 'bull' ? 'Trigger — break above' : 'Trigger — break below'} value={trigger} onChange={setTrigger} />
        <input value={triggerNote} onChange={e => setTriggerNote(e.target.value)} placeholder="e.g. Break and hold above resistance"
          style={{ width: '100%', fontSize: 9, padding: '3px 6px', background: 'transparent', border: '1px solid #161b22', color: '#484f58', marginBottom: 6, outline: 'none' }} />
        <F label="Target price" value={target} onChange={setTarget} />
        <F label="Stop / Invalidation" value={invalidation} onChange={setInvalidation} />
        <F label="Entry price (optional)" value={entry} onChange={setEntry} placeholder="Leave empty if waiting" />
      </>)}

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: '#484f58', marginBottom: 2 }}>Plan</div>
        <textarea value={plan} onChange={e => setPlan(e.target.value)}
          placeholder={type === 'base' ? 'No trade. Wait for resolution...' : 'What do I do if this scenario triggers?'}
          rows={2} style={{ width: '100%', fontSize: 10, padding: '4px 6px', background: '#0e1117', border: '1px solid #21262d', color: '#c9d1d9', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
          onFocus={e => (e.target.style.borderColor = col)} onBlur={e => (e.target.style.borderColor = '#21262d')} />
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={save} style={{ flex: 1, padding: '5px', fontSize: 9, fontWeight: 500, color: '#fff', background: col, border: 'none', cursor: 'pointer' }}>
          {initial ? 'Update' : 'Save'}
        </button>
        <button onClick={onCancel} style={{ flex: 1, padding: '5px', fontSize: 9, color: '#484f58', background: 'transparent', border: '1px solid #21262d', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// CHART OVERLAY — renders scenario zones on chart canvas
// Principle: minimal, precise, low-noise. Lines only in right 60% of chart.
// Labels are compact single-word. Fills are barely visible.
// ═══════════════════════════════════════════════════════════
export function ScenarioOverlay({ scenarios, width, height, chart, series }: {
  scenarios: ScenarioSet; width: number; height: number; chart: any; series: any
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!chart) return
    const h = () => setTick(t => t + 1)
    chart.timeScale().subscribeVisibleLogicalRangeChange(h)
    return () => { try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(h) } catch {} }
  }, [chart])

  useEffect(() => {
    const c = canvasRef.current; if (!c || !chart || !series) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    c.width = width * dpr; c.height = height * dpr
    ctx.scale(dpr, dpr)
    c.style.width = width + 'px'; c.style.height = height + 'px'
    ctx.clearRect(0, 0, width, height)

    const R = width - 58 // right edge before price axis
    const L = width * 0.35 // lines start from 35% — not full width

    scenarios.forEach(sc => {
      if (sc.status === 'invalidated') return
      const col = TYPE_COL[sc.type]
      const toY = (price: number) => { try { return series.priceToCoordinate(price) } catch { return null } }

      if (sc.type === 'base') {
        const y1 = toY(sc.trigger), y2 = toY(sc.invalidation)
        if (y1 == null || y2 == null) return
        ctx.save()
        // Subtle fill between range bounds
        const top = Math.min(y1, y2), bot = Math.max(y1, y2)
        ctx.globalAlpha = 0.02; ctx.fillStyle = col
        ctx.fillRect(L, top, R - L, bot - top)
        // Two dashed range lines
        ctx.setLineDash([4, 4]); ctx.strokeStyle = col; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.35
        ctx.beginPath(); ctx.moveTo(L, y1); ctx.lineTo(R, y1); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(L, y2); ctx.lineTo(R, y2); ctx.stroke()
        // Single label
        ctx.setLineDash([]); ctx.globalAlpha = 0.5; ctx.font = '8px -apple-system,sans-serif'; ctx.textAlign = 'right'
        ctx.fillStyle = col; ctx.fillText('RANGE', R - 4, Math.min(y1, y2) - 4)
        ctx.restore()
        return
      }

      const yT = toY(sc.trigger), yG = toY(sc.target), yI = toY(sc.invalidation)
      if (yT == null || yG == null) return

      ctx.save()

      // Zone fill — barely visible
      const top = Math.min(yT, yG), bot = Math.max(yT, yG)
      ctx.globalAlpha = 0.025; ctx.fillStyle = col
      ctx.fillRect(L, top, R - L, bot - top)

      // Trigger — dashed
      ctx.setLineDash([5, 4]); ctx.strokeStyle = col; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.35
      ctx.beginPath(); ctx.moveTo(L, yT); ctx.lineTo(R, yT); ctx.stroke()

      // Target — thin solid
      ctx.setLineDash([]); ctx.lineWidth = 0.5; ctx.globalAlpha = 0.25
      ctx.beginPath(); ctx.moveTo(L, yG); ctx.lineTo(R, yG); ctx.stroke()

      // Invalidation — short dotted, right side only
      if (yI != null) {
        ctx.strokeStyle = '#f85149'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.2
        ctx.setLineDash([2, 3])
        ctx.beginPath(); ctx.moveTo(R - 100, yI); ctx.lineTo(R, yI); ctx.stroke()
      }

      // Entry tick
      if (sc.entry) {
        const yE = toY(sc.entry)
        if (yE != null) {
          ctx.setLineDash([]); ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.35
          ctx.beginPath(); ctx.moveTo(R - 16, yE); ctx.lineTo(R - 4, yE); ctx.stroke()
        }
      }

      // Single compact label at target level
      ctx.setLineDash([]); ctx.globalAlpha = 0.45; ctx.font = '8px -apple-system,sans-serif'; ctx.textAlign = 'right'
      ctx.fillStyle = col
      ctx.fillText(sc.type === 'bull' ? 'BULL' : 'BEAR', R - 4, yG - 4)

      ctx.restore()
    })
  }, [scenarios, width, height, chart, series, tick])

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }} />
}
