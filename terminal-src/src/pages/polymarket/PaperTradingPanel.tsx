// pages/polymarket/PaperTradingPanel.tsx — Operational paper trading workspace
// Supports: open/close/partial-close/flatten-all/reverse/cancel-single/cancel-all
// Paper is DEFAULT. Live mode shows "integration pending" without pretending to trade.
import { useEffect, useState, useRef } from 'react'
import type { OFMarketMeta, PaperPosition } from './types'
import { PM } from './_ui/tokens'
import { Icon } from './_ui/primitives'
import { RiskWarning } from '@/components/common/RiskWarning'

function fmtUsdSigned(n: number): string {
  if (!isFinite(n)) return '—'
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  return `${sign}$${a.toFixed(2)}`
}

type TradeMode = 'paper' | 'live'

export function PaperTradingPanel({ meta }: { meta: OFMarketMeta | null }) {
  const [tradeMode, setTradeMode] = useState<TradeMode>('paper')
  const [outcome, setOutcome] = useState<'Yes' | 'No'>('Yes')
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [size, setSize] = useState('100')
  const [limit, setLimit] = useState('')
  const [stop, setStop] = useState('')
  const [take, setTake] = useState('')
  const [positions, setPositions] = useState<PaperPosition[]>([])
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmFlatten, setConfirmFlatten] = useState(false)
  const [partialMenu, setPartialMenu] = useState<string | null>(null) // position id with partial menu open
  const confirmTimerRef = useRef<number | null>(null)
  const flattenTimerRef = useRef<number | null>(null)

  // Auto-prefill limit from best ask/bid
  useEffect(() => {
    if (!meta) return
    const tok = outcome === 'Yes' ? meta.tokens.yes : meta.tokens.no
    if (!tok) return
    const prefill = side === 'BUY' ? (tok.best_ask ?? tok.last) : (tok.best_bid ?? tok.last)
    setLimit(prefill ? prefill.toString() : '')
  }, [meta, outcome, side])

  // Load positions (only in paper mode — live mode shows pending state)
  useEffect(() => {
    if (tradeMode !== 'paper') { setPositions([]); return }
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/polymarket/orderflow/paper/positions')
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled && j.positions) setPositions(j.positions)
      } catch {}
    }
    load()
    const id = setInterval(load, 4000)
    return () => { cancelled = true; clearInterval(id) }
  }, [tradeMode])

  // Inline validation
  const activeTok = meta ? (outcome === 'Yes' ? meta.tokens.yes : meta.tokens.no) : null
  const tick = activeTok?.tick_size && activeTok.tick_size > 0 ? activeTok.tick_size : 0.001
  const minP = tick
  const maxP = 1 - tick

  const sizeN = parseFloat(size)
  const limitN = parseFloat(limit)
  const stopN = stop ? parseFloat(stop) : null
  const takeN = take ? parseFloat(take) : null

  const sizeValid = isFinite(sizeN) && sizeN > 0
  const limitValid = isFinite(limitN) && limitN >= minP && limitN <= maxP
  const stopValid = stopN === null || (isFinite(stopN) && stopN >= minP && stopN <= maxP && (
    side === 'BUY' ? stopN < limitN : stopN > limitN
  ))
  const takeValid = takeN === null || (isFinite(takeN) && takeN >= minP && takeN <= maxP && (
    side === 'BUY' ? takeN > limitN : takeN < limitN
  ))
  const allValid = sizeValid && limitValid && stopValid && takeValid && !!meta && tradeMode === 'paper'
  const probRangeLabel = `${minP.toFixed(3)} ≤ P ≤ ${maxP.toFixed(3)}`

  async function refresh() {
    const pr = await fetch('/api/polymarket/orderflow/paper/positions')
    if (pr.ok) { const pj = await pr.json(); if (pj.positions) setPositions(pj.positions) }
  }

  async function placeOrder() {
    if (!meta || !allValid) return
    const tok = outcome === 'Yes' ? meta.tokens.yes : meta.tokens.no
    if (!tok) return
    setMsg({ type: 'ok', text: 'PLACING…' })
    try {
      const r = await fetch('/api/polymarket/orderflow/paper/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition_id: meta.condition_id, token_id: tok.token_id,
          outcome, side, size: sizeN,
          limit_price: limitN, stop_prob: stopN, take_prob: takeN,
        }),
      })
      const j = await r.json()
      if (j.error) setMsg({ type: 'err', text: `✗ ${j.error.toUpperCase()}` })
      else setMsg({ type: 'ok', text: `✓ FILLED @ ${j.fill_price?.toFixed(3)}` })
      await refresh()
    } catch (e) {
      setMsg({ type: 'err', text: `✗ ${String(e).toUpperCase()}` })
    }
    setTimeout(() => setMsg(null), 4000)
  }

  async function closePos(id: string, fraction: number = 1) {
    // The backend close endpoint closes fully; for partial close we place an offset order
    const pos = positions.find(p => p.id === id)
    if (!pos) return
    if (fraction >= 1) {
      await fetch(`/api/polymarket/orderflow/paper/close/${id}`, { method: 'POST' })
    } else {
      // Partial: place counter-order for (size * fraction) at current mark
      const tok = meta ? (pos.outcome === 'Yes' ? meta.tokens.yes : meta.tokens.no) : null
      if (!tok || !meta) return
      const counterSide = pos.side === 'BUY' ? 'SELL' : 'BUY'
      const counterPrice = counterSide === 'BUY' ? (tok.best_ask ?? pos.mark_price) : (tok.best_bid ?? pos.mark_price)
      try {
        await fetch('/api/polymarket/orderflow/paper/order', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            condition_id: meta.condition_id, token_id: tok.token_id,
            outcome: pos.outcome, side: counterSide,
            size: pos.size * fraction,
            limit_price: counterPrice,
          }),
        })
      } catch {}
    }
    setPartialMenu(null)
    await refresh()
  }

  async function reversePos(id: string) {
    // Close then open opposite at current mark
    const pos = positions.find(p => p.id === id)
    if (!pos || !meta) return
    const tok = pos.outcome === 'Yes' ? meta.tokens.yes : meta.tokens.no
    if (!tok) return
    await fetch(`/api/polymarket/orderflow/paper/close/${id}`, { method: 'POST' })
    const newSide = pos.side === 'BUY' ? 'SELL' : 'BUY'
    const newPrice = newSide === 'BUY' ? (tok.best_ask ?? pos.mark_price) : (tok.best_bid ?? pos.mark_price)
    try {
      await fetch('/api/polymarket/orderflow/paper/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition_id: meta.condition_id, token_id: tok.token_id,
          outcome: pos.outcome, side: newSide, size: pos.size,
          limit_price: newPrice,
        }),
      })
    } catch {}
    await refresh()
  }

  async function flattenAll() {
    for (const p of positions.filter(p => p.status === 'OPEN')) {
      await fetch(`/api/polymarket/orderflow/paper/close/${p.id}`, { method: 'POST' })
    }
    setConfirmFlatten(false)
    if (flattenTimerRef.current) { clearTimeout(flattenTimerRef.current); flattenTimerRef.current = null }
    await refresh()
  }

  async function resetAll() {
    await fetch('/api/polymarket/orderflow/paper/reset', { method: 'POST' })
    setPositions([])
    setConfirmReset(false)
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null }
  }

  const startConfirmReset = () => {
    setConfirmReset(true)
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    confirmTimerRef.current = window.setTimeout(() => setConfirmReset(false), 5000)
  }
  const startConfirmFlatten = () => {
    setConfirmFlatten(true)
    if (flattenTimerRef.current) clearTimeout(flattenTimerRef.current)
    flattenTimerRef.current = window.setTimeout(() => setConfirmFlatten(false), 5000)
  }

  const open = positions.filter(p => p.status === 'OPEN')
  const closed = positions.filter(p => p.status !== 'OPEN')
  const totalU = open.reduce((s, p) => s + (p.unrealized_pnl || 0), 0)
  const totalR = closed.reduce((s, p) => s + (p.realized_pnl || 0), 0)

  const InputRow = ({ label, unit, value, onChange, placeholder, valid, error }: {
    label: string; unit: string; value: string
    onChange: (v: string) => void; placeholder: string
    valid: boolean; error?: string
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 30, gap: 6 }}>
        <span style={{
          width: 44, fontSize: 10, fontWeight: 500, letterSpacing: '0.4px',
          textTransform: 'uppercase', color: PM.text.muted, fontFamily: PM.font.ui,
        }}>{label}</span>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          height: 24, background: PM.bg.elevated,
          border: `1px solid ${value && !valid ? PM.down : PM.border.prominent}`,
          borderRadius: 2,
        }}>
          <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            disabled={tradeMode === 'live'}
            style={{
              flex: 1, height: 22, padding: '0 6px',
              background: 'transparent', border: 'none',
              color: tradeMode === 'live' ? PM.text.disabled : PM.text.primary,
              fontSize: 11, fontFamily: PM.font.mono,
              fontVariantNumeric: 'tabular-nums', outline: 'none',
            }}
          />
          <span style={{ padding: '0 6px', fontSize: 10, color: PM.text.tertiary, fontFamily: PM.font.mono, letterSpacing: '0.3px' }}>{unit}</span>
        </div>
      </div>
      {value && !valid && error && (
        <div style={{
          fontSize: 9, color: PM.down, fontFamily: PM.font.mono,
          paddingLeft: 50, letterSpacing: '0.3px', textTransform: 'uppercase',
        }}>✗ {error}</div>
      )}
    </div>
  )

  return (
    <div style={{
      background: PM.bg.panel,
      borderLeft: `2px solid ${tradeMode === 'paper' ? PM.warning : PM.down}`,
      display: 'flex', flexDirection: 'column',
      fontFamily: PM.font.ui,
    }}>
      {/* ── Always-visible paper-trading disclaimer ──────────────── */}
      <div style={{ padding: '6px 8px', borderBottom: `1px solid ${PM.border.subtle}` }}>
        <RiskWarning variant={tradeMode === 'paper' ? 'paper' : 'signal'} compact />
      </div>
      {/* ── Mode switch + header (36px) ───────────────────────────── */}
      <div style={{
        height: 36, padding: '0 10px',
        borderBottom: `1px solid ${PM.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: PM.text.muted,
        }}>TRADING</span>
        {/* LIVE / PAPER switch */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 0 }}>
          <button onClick={() => setTradeMode('paper')}
            style={{
              padding: '0 10px', height: 22,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
              fontFamily: PM.font.mono, textTransform: 'uppercase',
              background: tradeMode === 'paper' ? 'rgba(210,153,34,0.18)' : 'transparent',
              color: tradeMode === 'paper' ? PM.warning : PM.text.muted,
              border: `1px solid ${tradeMode === 'paper' ? PM.warning : PM.border.prominent}`,
              borderRadius: '2px 0 0 2px', cursor: 'pointer',
              borderRight: 'none',
            }}>PAPER</button>
          <button onClick={() => setTradeMode('live')}
            style={{
              padding: '0 10px', height: 22,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
              fontFamily: PM.font.mono, textTransform: 'uppercase',
              background: tradeMode === 'live' ? 'rgba(218,54,51,0.18)' : 'transparent',
              color: tradeMode === 'live' ? PM.down : PM.text.muted,
              border: `1px solid ${tradeMode === 'live' ? PM.down : PM.border.prominent}`,
              borderRadius: '0 2px 2px 0', cursor: 'pointer',
            }}>LIVE</button>
        </div>
      </div>

      {/* ── Live integration warning banner ───────────────────────── */}
      {tradeMode === 'live' && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(218,54,51,0.08)',
          borderBottom: `1px solid ${PM.border.subtle}`,
        }}>
          <div style={{
            fontSize: 10, color: PM.down, fontFamily: PM.font.mono,
            letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 700,
            marginBottom: 4,
          }}>⚠ LIVE TRADING DISABLED</div>
          <div style={{ fontSize: 10, color: PM.text.muted, fontFamily: PM.font.mono, lineHeight: 1.5 }}>
            Live execution requires authenticated Polymarket connection.
            Switch back to PAPER to continue practicing.
          </div>
        </div>
      )}

      {/* ── Order ticket (paper only) ─────────────────────────────── */}
      {tradeMode === 'paper' && (
        <>
          {/* YES/NO outcome */}
          <div style={{
            height: 28, display: 'flex',
            borderBottom: `1px solid ${PM.border.subtle}`,
          }}>
            {(['Yes', 'No'] as const).map(o => {
              const active = outcome === o
              const color = o === 'Yes' ? PM.up : PM.down
              return (
                <button key={o} onClick={() => setOutcome(o)}
                  style={{
                    flex: 1, height: 28, background: 'transparent',
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.4px',
                    color: active ? color : PM.text.muted,
                    border: 'none',
                    boxShadow: active ? `inset 0 -2px 0 ${color}` : 'none',
                    cursor: 'pointer', fontFamily: PM.font.ui,
                  }}>
                  {o.toUpperCase()}
                </button>
              )
            })}
          </div>

          {/* BUY/SELL */}
          <div style={{ padding: '8px 10px 4px', display: 'flex', gap: 6 }}>
            {(['BUY', 'SELL'] as const).map(s => {
              const active = side === s
              const color = s === 'BUY' ? PM.up : PM.down
              const bg = active ? (s === 'BUY' ? 'rgba(46,160,67,0.14)' : 'rgba(218,54,51,0.14)') : 'transparent'
              return (
                <button key={s} onClick={() => setSide(s)}
                  style={{
                    flex: 1, height: 26, background: bg,
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.4px',
                    color: active ? color : PM.text.muted,
                    border: `1px solid ${active ? color : PM.border.prominent}`,
                    borderRadius: 2, cursor: 'pointer',
                    fontFamily: PM.font.ui, textTransform: 'uppercase',
                  }}>
                  {s}
                </button>
              )
            })}
          </div>

          {/* Inputs */}
          <div style={{ padding: '0 10px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <InputRow label="SIZE" unit="$" value={size} onChange={setSize} placeholder="100" valid={sizeValid} error="size must be > 0" />
            <InputRow label="LIMIT" unit="p" value={limit} onChange={setLimit} placeholder="0.52" valid={limitValid} error={`price must be ${probRangeLabel}`} />
            <InputRow label="STOP" unit="p" value={stop} onChange={setStop} placeholder="—" valid={stopValid} error={side === 'BUY' ? 'stop must be < limit' : 'stop must be > limit'} />
            <InputRow label="TP" unit="p" value={take} onChange={setTake} placeholder="—" valid={takeValid} error={side === 'BUY' ? 'tp must be > limit' : 'tp must be < limit'} />
          </div>

          {/* Place order button */}
          <div style={{ padding: '0 10px 8px' }}>
            <button onClick={placeOrder} disabled={!allValid}
              style={{
                width: '100%', height: 30,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.6px',
                fontFamily: PM.font.ui, textTransform: 'uppercase',
                background: !allValid ? PM.bg.elevated : (side === 'BUY' ? PM.up : PM.down),
                color: !allValid ? PM.text.disabled : '#0a0a0a',
                border: 'none', borderRadius: 2,
                cursor: allValid ? 'pointer' : 'not-allowed',
              }}>
              PLACE PAPER {side}
            </button>
            {msg && (
              <div style={{
                marginTop: 4, fontSize: 10, fontFamily: PM.font.mono,
                color: msg.type === 'ok' ? PM.up : PM.down, letterSpacing: '0.4px',
              }}>{msg.text}</div>
            )}
          </div>
        </>
      )}

      {/* ── Positions table ──────────────────────────────────────── */}
      <div style={{
        borderTop: `1px solid ${PM.border.subtle}`,
        borderBottom: `1px solid ${PM.border.subtle}`,
      }}>
        <div style={{
          height: 26, padding: '0 10px',
          display: 'flex', alignItems: 'center', gap: 6,
          background: PM.bg.elevated,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 500, letterSpacing: '0.5px',
            textTransform: 'uppercase', color: PM.text.muted,
          }}>OPEN POSITIONS</span>
          <span style={{ fontSize: 10, color: PM.text.tertiary, fontFamily: PM.font.mono }}>{open.length}</span>
          {open.length > 0 && tradeMode === 'paper' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {confirmFlatten ? (
                <>
                  <button onClick={flattenAll}
                    style={{
                      height: 18, padding: '0 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.4px',
                      background: PM.down, color: '#0a0a0a', border: 'none', borderRadius: 2,
                      cursor: 'pointer', fontFamily: PM.font.ui,
                    }}>CONFIRM</button>
                  <button onClick={() => setConfirmFlatten(false)}
                    style={{
                      height: 18, padding: '0 6px', fontSize: 9, letterSpacing: '0.4px',
                      background: 'transparent', color: PM.text.muted,
                      border: `1px solid ${PM.border.prominent}`, borderRadius: 2,
                      cursor: 'pointer', fontFamily: PM.font.ui,
                    }}>×</button>
                </>
              ) : (
                <button onClick={startConfirmFlatten}
                  style={{
                    height: 18, padding: '0 8px', fontSize: 9, fontWeight: 600, letterSpacing: '0.4px',
                    background: 'transparent', color: PM.down,
                    border: `1px solid ${PM.down}55`, borderRadius: 2,
                    cursor: 'pointer', fontFamily: PM.font.ui, textTransform: 'uppercase',
                  }}>FLATTEN ALL</button>
              )}
            </div>
          )}
        </div>

        {open.length === 0 ? (
          <div style={{
            padding: '16px 10px', fontSize: 10, textAlign: 'center',
            color: PM.text.muted, fontFamily: PM.font.mono,
            letterSpacing: '0.4px', textTransform: 'uppercase',
          }}>{tradeMode === 'live' ? 'LIVE MODE — POSITIONS HIDDEN' : 'NO OPEN POSITIONS'}</div>
        ) : (
          <>
            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '32px 36px 42px 1fr 58px 70px',
              gap: 3, padding: '0 8px', height: 20,
              background: PM.bg.panel,
              borderTop: `1px solid ${PM.border.subtle}`, borderBottom: `1px solid ${PM.border.subtle}`,
              alignItems: 'center',
            }}>
              {[['OUT', 'left'], ['SIDE', 'left'], ['SIZE', 'right'], ['ENTRY→MARK', 'left'], ['UPNL', 'right'], ['ACTIONS', 'right']].map(([h, a], i) => (
                <span key={i} style={{
                  fontSize: 9, fontWeight: 500, letterSpacing: '0.4px',
                  textTransform: 'uppercase', color: PM.text.tertiary,
                  fontFamily: PM.font.ui, textAlign: a as any,
                }}>{h}</span>
              ))}
            </div>
            {open.map(p => (
              <div key={p.id}>
                <div className="pm-row-zebra"
                  style={{
                    display: 'grid', gridTemplateColumns: '32px 36px 42px 1fr 58px 70px',
                    gap: 3, padding: '0 8px', height: 24, alignItems: 'center',
                    fontSize: 10, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
                  }}>
                  <span style={{ color: p.outcome === 'Yes' ? PM.up : PM.down, fontWeight: 600 }}>{p.outcome.toUpperCase().slice(0, 3)}</span>
                  <span style={{ color: p.side === 'BUY' ? PM.up : PM.down, fontWeight: 600 }}>{p.side}</span>
                  <span style={{ color: PM.text.secondary, textAlign: 'right' }}>{p.size}</span>
                  <span style={{ color: PM.text.muted, fontSize: 10 }}>
                    <span style={{ color: PM.text.secondary }}>{p.entry_price.toFixed(3)}</span>
                    <span style={{ margin: '0 3px', color: PM.text.tertiary }}>→</span>
                    <span style={{ color: PM.text.primary }}>{p.mark_price.toFixed(3)}</span>
                  </span>
                  <span style={{ color: p.unrealized_pnl >= 0 ? PM.up : PM.down, fontWeight: 600, textAlign: 'right' }}>
                    {fmtUsdSigned(p.unrealized_pnl)}
                  </span>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <button onClick={() => setPartialMenu(partialMenu === p.id ? null : p.id)}
                      title="Partial / reverse / close"
                      style={{
                        width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: partialMenu === p.id ? PM.accent : 'transparent',
                        border: `1px solid ${partialMenu === p.id ? PM.accent : PM.border.prominent}`,
                        color: partialMenu === p.id ? '#fff' : PM.text.muted, cursor: 'pointer',
                        borderRadius: 2, padding: 0, fontSize: 9, fontWeight: 700,
                      }}>…</button>
                    <button onClick={() => closePos(p.id)}
                      title="Close 100%"
                      style={{
                        width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: `1px solid ${PM.border.prominent}`,
                        color: PM.text.muted, cursor: 'pointer', borderRadius: 2, padding: 0,
                      }}>
                      <Icon.Close size={8} color={PM.text.muted} />
                    </button>
                  </div>
                </div>

                {/* Partial / reverse menu */}
                {partialMenu === p.id && (
                  <div style={{
                    padding: '4px 8px 6px',
                    background: PM.bg.elevated,
                    borderTop: `1px solid ${PM.border.subtle}`,
                    borderBottom: `1px solid ${PM.border.subtle}`,
                    display: 'flex', gap: 3, alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 9, color: PM.text.tertiary, letterSpacing: '0.4px', textTransform: 'uppercase', fontFamily: PM.font.ui, marginRight: 4 }}>close</span>
                    {[25, 50, 75].map(pct => (
                      <button key={pct} onClick={() => closePos(p.id, pct / 100)}
                        style={{
                          height: 18, padding: '0 6px', fontSize: 9, fontWeight: 600,
                          background: 'transparent', color: PM.text.secondary,
                          border: `1px solid ${PM.border.prominent}`, borderRadius: 2,
                          cursor: 'pointer', fontFamily: PM.font.mono,
                        }}>{pct}%</button>
                    ))}
                    <div style={{ width: 1, height: 14, background: PM.border.subtle, margin: '0 2px' }}/>
                    <button onClick={() => reversePos(p.id)}
                      style={{
                        height: 18, padding: '0 8px', fontSize: 9, fontWeight: 600, letterSpacing: '0.3px',
                        background: 'transparent', color: PM.warning,
                        border: `1px solid ${PM.warning}55`, borderRadius: 2,
                        cursor: 'pointer', fontFamily: PM.font.ui, textTransform: 'uppercase',
                      }}>REVERSE</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Footer: totals + reset ────────────────────────────────── */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: PM.font.mono, marginBottom: 2 }}>
          <span style={{ color: PM.text.muted, letterSpacing: '0.3px' }}>UNREALIZED</span>
          <span style={{ color: totalU >= 0 ? PM.up : PM.down, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {fmtUsdSigned(totalU)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: PM.font.mono, marginBottom: 8 }}>
          <span style={{ color: PM.text.muted, letterSpacing: '0.3px' }}>REALIZED</span>
          <span style={{ color: totalR >= 0 ? PM.up : PM.down, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {fmtUsdSigned(totalR)}
          </span>
        </div>
        {tradeMode === 'paper' && (
          confirmReset ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={resetAll}
                style={{
                  flex: 1, height: 22, fontSize: 10, fontWeight: 700, letterSpacing: '0.4px',
                  background: PM.down, color: '#0a0a0a', border: 'none', borderRadius: 2,
                  cursor: 'pointer', fontFamily: PM.font.ui, textTransform: 'uppercase',
                }}>CONFIRM RESET</button>
              <button onClick={() => setConfirmReset(false)}
                style={{
                  flex: 1, height: 22, fontSize: 10, letterSpacing: '0.4px',
                  background: 'transparent', color: PM.text.muted,
                  border: `1px solid ${PM.border.prominent}`, borderRadius: 2,
                  cursor: 'pointer', fontFamily: PM.font.ui, textTransform: 'uppercase',
                }}>CANCEL</button>
            </div>
          ) : (
            <button onClick={startConfirmReset}
              style={{
                width: '100%', height: 22, fontSize: 10, letterSpacing: '0.4px',
                background: 'transparent', color: PM.down,
                border: `1px solid ${PM.down}55`, borderRadius: 2,
                cursor: 'pointer', fontFamily: PM.font.ui, textTransform: 'uppercase',
              }}>RESET ALL HISTORY</button>
          )
        )}
      </div>
    </div>
  )
}
