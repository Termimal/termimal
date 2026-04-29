// pages/polymarket/OrderflowDrilldown.tsx — Event-trading workspace with clean hierarchy
import { useEffect, useState, useRef } from 'react'
import type { OFMarketMeta, OFMetrics } from './types'
import { useOrderflowStream } from './useOrderflowStream'
import { MainChart } from './MainChart'
import { WhaleTape } from './WhaleTape'
import { PaperTradingPanel } from './PaperTradingPanel'
import { BotPanel } from './BotPanel'
import { PM, fmtUsd, fmtExpires, fmtTime } from './_ui/tokens'
import { Badge, StatusDot, Icon } from './_ui/primitives'
import { useUnderlying } from './_ui/useUnderlying'

type SidebarTab = 'trade' | 'bot'

export function OrderflowDrilldown({ conditionId, onBack }: { conditionId: string; onBack: () => void }) {
  const [meta, setMeta] = useState<OFMarketMeta | null>(null)
  const [metrics, setMetrics] = useState<OFMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [outcome, setOutcome] = useState<'yes' | 'no'>('yes')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('trade')
  const [eventsOpen, setEventsOpen] = useState(false)
  const stream = useOrderflowStream(conditionId)

  const prevYesRef = useRef<number | null>(null)
  const prevNoRef = useRef<number | null>(null)
  const yesQuoteRef = useRef<HTMLSpanElement | null>(null)
  const noQuoteRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/polymarket/orderflow/market/${conditionId}`)
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled && !j.error) { setMeta(j); setLoading(false) }
      } catch {}
    }
    load()
    const id = setInterval(load, 10000)
    return () => { cancelled = true; clearInterval(id) }
  }, [conditionId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/polymarket/orderflow/metrics/${conditionId}?window=86400&side=${outcome}`)
        if (!r.ok) return
        const j = await r.json()
        if (!cancelled && !j.error) setMetrics(j)
      } catch {}
    }
    load()
    const id = setInterval(load, 10000)
    return () => { cancelled = true; clearInterval(id) }
  }, [conditionId, outcome])

  useEffect(() => {
    const yesAsk = meta?.tokens.yes?.best_ask ?? null
    const noAsk = meta?.tokens.no?.best_ask ?? null
    if (prevYesRef.current !== null && yesAsk !== null && prevYesRef.current !== yesAsk && yesQuoteRef.current) {
      const cls = yesAsk > prevYesRef.current ? 'pm-flash-up' : 'pm-flash-down'
      yesQuoteRef.current.classList.remove('pm-flash-up', 'pm-flash-down')
      void yesQuoteRef.current.offsetHeight
      yesQuoteRef.current.classList.add(cls)
    }
    if (prevNoRef.current !== null && noAsk !== null && prevNoRef.current !== noAsk && noQuoteRef.current) {
      const cls = noAsk > prevNoRef.current ? 'pm-flash-up' : 'pm-flash-down'
      noQuoteRef.current.classList.remove('pm-flash-up', 'pm-flash-down')
      void noQuoteRef.current.offsetHeight
      noQuoteRef.current.classList.add(cls)
    }
    prevYesRef.current = yesAsk
    prevNoRef.current = noAsk
  }, [meta])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return
      if (e.key === 'Escape') onBack()
      else if (e.key === 'y') setOutcome('yes')
      else if (e.key === 'n') setOutcome('no')
      else if (e.key === 'e') setEventsOpen(v => !v)
      else if (e.key === 'b') setSidebarTab(s => s === 'bot' ? 'trade' : 'bot')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const yesTok = meta?.tokens.yes
  const noTok = meta?.tokens.no
  const streamState = stream.status === 'live' ? 'live' : stream.status === 'polling' ? 'polling' : 'down'
  const expires = meta?.end_date ? fmtExpires(meta.end_date) : null
  const activeTok = outcome === 'yes' ? yesTok : noTok

  const yesSpreadCents = yesTok?.best_bid !== null && yesTok?.best_ask != null
    ? ((yesTok.best_ask - yesTok.best_bid) * 100).toFixed(1)
    : '—'

  const absorptions = metrics?.absorption_events || []
  const sweeps = metrics?.sweeps || []
  const hasEvents = absorptions.length > 0 || sweeps.length > 0
  const underlying = useUnderlying(meta?.question)

  return (
    <div className="pm-scope" style={{
      background: PM.bg.app, color: PM.text.secondary, minHeight: '100%',
      display: 'flex', flexDirection: 'column', fontFamily: PM.font.ui,
    }}>

      {/* ── Breadcrumb (28px) ─────────────────────────────────────── */}
      <div style={{
        height: 28, padding: '0 14px',
        background: PM.bg.panel, borderBottom: `1px solid ${PM.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <button onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 8px', height: 20,
            background: 'transparent', border: `1px solid ${PM.border.prominent}`,
            color: PM.text.secondary, cursor: 'pointer', borderRadius: 2,
            fontSize: 10, fontFamily: PM.font.ui, letterSpacing: '0.3px',
          }}>
          <Icon.ArrowLeft size={9} />
          MARKETS
        </button>
        <span style={{ color: PM.text.tertiary, fontSize: 10 }}>/</span>
        <span style={{
          fontSize: 10, color: PM.text.muted, fontFamily: PM.font.mono,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
        }}>{loading ? 'loading…' : (meta?.question || conditionId.slice(0, 40) + '…')}</span>
      </div>

      {/* ── Unified context bar — bigger title, prominent quote, muted stats (fix #2, #7) ── */}
      <div style={{
        padding: '10px 14px',
        background: PM.bg.panel, borderBottom: `1px solid ${PM.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
      }}>
        {/* Title block */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 16, fontWeight: 600, color: PM.text.primary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: PM.font.ui, lineHeight: 1.2,
            }}>{loading ? 'Loading market…' : (meta?.question || '—')}</span>
            {meta?.neg_risk && <Badge label="NEG-RISK" variant="NEG-RISK" />}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 9, color: streamState === 'live' ? PM.up : streamState === 'polling' ? PM.warning : PM.text.muted,
              textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: PM.font.mono,
            }}>
              <StatusDot state={streamState} />
              {stream.status}
            </span>
          </div>
          {/* Secondary stats — muted, smaller */}
          {meta && (
            <div style={{
              fontSize: 10, fontFamily: PM.font.mono, color: PM.text.tertiary,
              letterSpacing: '0.2px',
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            }}>
              <span>24h <span style={{ color: PM.text.muted }}>{fmtUsd(meta.volume_24h)}</span></span>
              <span style={{ color: PM.text.tertiary }}>·</span>
              <span>liq <span style={{ color: PM.text.muted }}>{fmtUsd(meta.liquidity)}</span></span>
              {yesTok && (
                <>
                  <span style={{ color: PM.text.tertiary }}>·</span>
                  <span title={`Tick size — the smallest price increment for this market. The price moves in steps of ${yesTok.tick_size}¢ (i.e., a ${(yesTok.tick_size * 100).toFixed(1)}% probability change).`}
                    style={{ cursor: 'help' }}>
                    tick <span style={{ color: PM.text.muted }}>{yesTok.tick_size}¢</span>
                  </span>
                </>
              )}
              {underlying && (
                <>
                  <span style={{ color: PM.text.tertiary }}>·</span>
                  <span title={`Linked underlying: ${underlying.symbol}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '1px 5px', borderRadius: 2,
                    border: `1px solid ${PM.border.prominent}`,
                    background: PM.bg.elevated,
                  }}>
                    <span style={{ color: PM.text.secondary, fontWeight: 600 }}>{underlying.display}</span>
                    <span style={{ color: PM.text.primary }}>
                      {underlying.price >= 1000 ? `$${underlying.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${underlying.price.toFixed(2)}`}
                    </span>
                    <span style={{ color: underlying.pct >= 0 ? PM.up : PM.down, fontWeight: 600 }}>
                      {underlying.pct >= 0 ? '+' : ''}{underlying.pct.toFixed(2)}%
                    </span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Primary metrics — prominent (fix #2) */}
        {meta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* YES quote — big */}
            {yesTok && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: PM.up,
                  letterSpacing: '0.5px', fontFamily: PM.font.mono,
                }}>YES</span>
                <span ref={yesQuoteRef} style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 3,
                  padding: '1px 4px', borderRadius: 2,
                  fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: PM.down }}>{yesTok.best_bid?.toFixed(3) ?? '—'}</span>
                  <span style={{ fontSize: 9, color: PM.text.tertiary }}>×</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: PM.up }}>{yesTok.best_ask?.toFixed(3) ?? '—'}</span>
                </span>
              </div>
            )}

            {/* NO quote — smaller muted */}
            {noTok && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: PM.text.tertiary,
                  letterSpacing: '0.5px', fontFamily: PM.font.mono,
                }}>NO</span>
                <span ref={noQuoteRef} style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 3,
                  padding: '1px 4px', borderRadius: 2,
                  fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: PM.text.muted }}>{noTok.best_bid?.toFixed(3) ?? '—'}</span>
                  <span style={{ fontSize: 9, color: PM.text.tertiary }}>×</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: PM.text.muted }}>{noTok.best_ask?.toFixed(3) ?? '—'}</span>
                </span>
              </div>
            )}

            {/* Vertical separator */}
            <div style={{ width: 1, height: 28, background: PM.border.subtle }}/>

            {/* Spread (prominent) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: PM.text.muted, letterSpacing: '0.5px', fontFamily: PM.font.mono, textTransform: 'uppercase' }}>SPREAD</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: PM.text.primary, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums' }}>
                {yesSpreadCents}¢
              </span>
            </div>

            {/* Ends (prominent with urgency color) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: PM.text.muted, letterSpacing: '0.5px', fontFamily: PM.font.mono, textTransform: 'uppercase' }}>ENDS</span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: expires?.color ?? PM.text.primary,
                fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
              }}>{expires?.text ?? '—'}</span>
            </div>

            {/* Side switch */}
            <div style={{ display: 'flex', gap: 0, marginLeft: 6 }}>
              {(['yes', 'no'] as const).map((o, i) => (
                <button key={o} onClick={() => setOutcome(o)}
                  style={{
                    padding: '0 10px', height: 24,
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                    fontFamily: PM.font.mono, textTransform: 'uppercase',
                    background: outcome === o ? PM.row.selected : 'transparent',
                    color: outcome === o ? (o === 'yes' ? PM.up : PM.down) : PM.text.muted,
                    border: `1px solid ${outcome === o ? (o === 'yes' ? PM.up : PM.down) : PM.border.prominent}`,
                    borderRadius: i === 0 ? '2px 0 0 2px' : '0 2px 2px 0',
                    borderLeft: i === 1 ? 'none' : undefined,
                    cursor: 'pointer',
                  }}>{o.toUpperCase()}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Main grid: chart + sidebar (sidebar 300px, fix #5) ──── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '1fr 300px',
      }}>
        {/* Left: MainChart + events (hidden when empty, fix #6) */}
        <div style={{
          display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto',
          padding: 10, gap: 10,
        }}>
          <MainChart
            conditionId={conditionId}
            outcome={outcome}
            tokenId={activeTok?.token_id ?? null}
            tickSize={activeTok?.tick_size ?? 0.001}
          />

          {/* Events — only rendered when there is content (fix #6) */}
          {hasEvents && (
            <div style={{ background: PM.bg.panel, border: `1px solid ${PM.border.subtle}` }}>
              <button onClick={() => setEventsOpen(v => !v)}
                style={{
                  width: '100%', height: 28, padding: '0 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', fontFamily: PM.font.ui,
                  borderBottom: eventsOpen ? `1px solid ${PM.border.subtle}` : 'none',
                }}>
                <Icon.Chevron size={10} color={PM.text.muted} rotate={eventsOpen ? 90 : 0} />
                <span style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: '0.5px',
                  textTransform: 'uppercase', color: PM.text.muted,
                }}>EVENTS</span>
                <span style={{ fontSize: 10, color: PM.text.tertiary, fontFamily: PM.font.mono }}>
                  {absorptions.length} abs · {sweeps.length} sweeps
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: PM.text.tertiary, fontFamily: PM.font.mono, letterSpacing: '0.4px' }}>
                  {eventsOpen ? 'HIDE' : 'SHOW'} (e)
                </span>
              </button>
              {eventsOpen && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <EventsTable title="ABSORPTION" rightBorder items={absorptions.slice(0, 15).map(a => ({
                    time: fmtTime(a.ts), price: a.price.toFixed(3), side: a.aggressor === 'buy' ? 'ASK' : 'BID',
                    sideColor: a.aggressor === 'buy' ? PM.down : PM.up, size: fmtUsd(a.volume),
                  }))} />
                  <EventsTable title="SWEEPS" items={sweeps.slice(0, 15).map(s => ({
                    time: fmtTime(s.ts), price: `${s.levels}lv`, side: s.aggressor.toUpperCase(),
                    sideColor: s.aggressor === 'buy' ? PM.up : PM.down, size: fmtUsd(s.notional),
                  }))} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar (300px) */}
        <div style={{
          display: 'flex', flexDirection: 'column', minHeight: 0,
          borderLeft: `1px solid ${PM.border.subtle}`,
          background: PM.bg.app,
        }}>
          <div style={{
            display: 'flex', height: 30,
            background: PM.bg.panel,
            borderBottom: `1px solid ${PM.border.subtle}`, flexShrink: 0,
          }}>
            {([
              { key: 'trade', label: 'TRADE' },
              { key: 'bot', label: 'BOT' },
            ] as const).map(t => {
              const active = sidebarTab === t.key
              return (
                <button key={t.key} onClick={() => setSidebarTab(t.key)}
                  style={{
                    flex: 1, height: 30,
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
                    textTransform: 'uppercase', fontFamily: PM.font.ui,
                    color: active ? PM.accentText : PM.text.muted,
                    background: 'transparent',
                    border: 'none',
                    boxShadow: active ? `inset 0 -2px 0 ${PM.accent}` : 'none',
                    cursor: 'pointer',
                  }}>{t.label}</button>
              )
            })}
          </div>

          {sidebarTab === 'trade' ? (
            <>
              <div style={{ flex: '1 1 55%', minHeight: 240, display: 'flex', flexDirection: 'column' }}>
                <WhaleTape conditionId={conditionId} liveTrades={[...stream.yesTrades, ...stream.noTrades]} />
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <PaperTradingPanel meta={meta} />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10 }}>
              <BotPanel conditionId={conditionId} meta={meta} />
            </div>
          )}
        </div>
      </div>

      {/* ── Keyboard hints footer (22px) ───────────────────────── */}
      <div style={{
        height: 22, padding: '0 14px',
        background: PM.bg.panel,
        borderTop: `1px solid ${PM.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: 14,
        fontSize: 10, fontFamily: PM.font.mono, color: PM.text.tertiary,
        letterSpacing: '0.3px', flexShrink: 0,
      }}>
        <Kbd k="Esc" label="back" />
        <Kbd k="Y" label="YES" />
        <Kbd k="N" label="NO" />
        <Kbd k="B" label="bot" />
        {hasEvents && <Kbd k="E" label="events" />}
        <span style={{ marginLeft: 'auto', color: PM.text.tertiary }}>
          {loading ? 'polling…' : 'live'}
          <span style={{ margin: '0 6px' }}>·</span>
          polymarket orderbook data
        </span>
      </div>
    </div>
  )
}

function Kbd({ k, label }: { k: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        padding: '1px 5px', borderRadius: 2,
        border: `1px solid ${PM.border.prominent}`,
        color: PM.text.secondary,
        fontSize: 9, fontWeight: 600, fontFamily: PM.font.mono,
        lineHeight: 1.3,
      }}>{k}</span>
      <span style={{ color: PM.text.muted }}>{label}</span>
    </span>
  )
}

function EventsTable({ title, items, rightBorder }: {
  title: string
  rightBorder?: boolean
  items: { time: string; price: string; side: string; sideColor: string; size: string }[]
}) {
  return (
    <div style={{ borderRight: rightBorder ? `1px solid ${PM.border.subtle}` : undefined }}>
      <div style={{
        height: 22, padding: '0 12px',
        display: 'flex', alignItems: 'center', gap: 6,
        background: PM.bg.elevated,
        borderBottom: `1px solid ${PM.border.subtle}`,
      }}>
        <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.5px', color: PM.text.muted, textTransform: 'uppercase' }}>{title}</span>
        <span style={{ fontSize: 9, color: PM.text.tertiary, fontFamily: PM.font.mono, marginLeft: 'auto' }}>{items.length}</span>
      </div>
      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ padding: '10px 12px', fontSize: 9, color: PM.text.muted, textAlign: 'center', fontFamily: PM.font.mono, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            NO EVENTS
          </div>
        ) : (
          items.map((e, i) => (
            <div key={i} className="pm-row-zebra" style={{
              display: 'grid', gridTemplateColumns: '72px 52px 42px 1fr',
              gap: 6, padding: '0 12px', height: 20, alignItems: 'center',
              fontSize: 10, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
            }}>
              <span style={{ color: PM.text.muted }}>{e.time}</span>
              <span style={{ color: PM.text.secondary, textAlign: 'right' }}>{e.price}</span>
              <span style={{ color: e.sideColor, fontWeight: 600 }}>{e.side}</span>
              <span style={{ color: PM.text.secondary, textAlign: 'right' }}>{e.size}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
