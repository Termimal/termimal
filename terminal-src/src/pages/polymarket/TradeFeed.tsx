/**
 * Live trade feed for a Polymarket market.
 *
 * On mount, fetches recent trades via /api/polymarket/trades?market=...
 * Then subscribes to the CLOB websocket; new trades slide in from the
 * top with a brief fade. Caps the visible buffer at 50 rows.
 *
 * Each row: time | YES/NO | size | price | direction.
 * Buys of YES = green; buys of NO = red.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { PM, fmtUsd, fmtTime } from './_ui/tokens'
import { StatusDot } from './_ui/primitives'
import { usePolymarketSocket } from '@/lib/usePolymarketSocket'

interface TradeFeedProps {
  /** condition_id of the market. */
  marketId: string | null
  /** YES token id, used to label the side in WS frames. */
  yesTokenId?: string | null
  /** Display label. */
  marketLabel?: string
}

// ── Domain ─────────────────────────────────────────────────────────

interface Trade {
  id: string
  ts: number          // ms epoch
  side: 'YES' | 'NO'
  price: number
  size: number        // USDC notional
  direction: 'BUY' | 'SELL'
}

const BUFFER_CAP = 50

// ── Component ──────────────────────────────────────────────────────

export function TradeFeed({ marketId, yesTokenId, marketLabel }: TradeFeedProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seenRef = useRef<Set<string>>(new Set())

  // ── Initial snapshot ────────────────────────────────────────────
  const loadSnapshot = useCallback(async () => {
    if (!marketId) return
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get('/api/polymarket/trades', { params: { market: marketId } })
      const arr: any[] = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []
      const decoded: Trade[] = arr
        .map((raw) => decodeTrade(raw, yesTokenId))
        .filter((t): t is Trade => t !== null)
      decoded.sort((a, b) => b.ts - a.ts)
      const trimmed = decoded.slice(0, BUFFER_CAP)
      seenRef.current = new Set(trimmed.map((t) => t.id))
      setTrades(trimmed)
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Trade history temporarily unavailable')
    } finally {
      setLoading(false)
    }
  }, [marketId, yesTokenId])

  useEffect(() => {
    if (!marketId) {
      setTrades([])
      seenRef.current = new Set()
      return
    }
    loadSnapshot()
  }, [marketId, loadSnapshot])

  // ── Live updates ────────────────────────────────────────────────
  const assetsIds = useMemo(() => (yesTokenId ? [yesTokenId] : []), [yesTokenId])
  const { lastMessage, status } = usePolymarketSocket<unknown>({
    assetsIds,
    enabled: Boolean(marketId && yesTokenId),
  })

  useEffect(() => {
    if (!lastMessage) return
    const frames: any[] = Array.isArray(lastMessage) ? (lastMessage as any[]) : [lastMessage]
    const incoming: Trade[] = []
    for (const f of frames) {
      if (f?.event_type !== 'trade' && f?.event_type !== 'last_trade_price') continue
      const t = decodeTrade(f, yesTokenId)
      if (!t) continue
      if (seenRef.current.has(t.id)) continue
      seenRef.current.add(t.id)
      incoming.push(t)
    }
    if (!incoming.length) return
    setTrades((prev) => {
      const merged = [...incoming, ...prev]
      merged.sort((a, b) => b.ts - a.ts)
      const trimmed = merged.slice(0, BUFFER_CAP)
      // Garbage-collect the seen set so it doesn't grow unbounded.
      const newSeen = new Set<string>()
      for (const t of trimmed) newSeen.add(t.id)
      seenRef.current = newSeen
      return trimmed
    })
  }, [lastMessage, yesTokenId])

  // ── Render ──────────────────────────────────────────────────────
  if (!marketId) {
    return <div style={emptyStyle}>Select a market from the list to load its trade feed.</div>
  }

  return (
    <div className="pm-scope" style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: PM.bg.app, color: PM.text.secondary, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        borderBottom: `1px solid ${PM.border.subtle}`,
        background: PM.bg.panel,
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <span style={{
          fontSize: PM.size.label, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: PM.text.muted,
        }}>Trades</span>
        {marketLabel && (
          <span style={{
            fontSize: 12, color: PM.text.primary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 360,
          }}>{marketLabel}</span>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: PM.font.mono, color: PM.text.muted }}>
          <StatusDot state={status === 'connected' ? 'live' : status === 'reconnecting' ? 'polling' : 'idle'} />
          {status === 'connected' ? 'LIVE' : status === 'reconnecting' ? 'RECONNECTING' : 'OFFLINE'}
        </span>
      </div>

      {/* Column header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '90px 60px 90px 1fr 70px',
        gap: 12,
        padding: '0 14px', height: 24,
        background: PM.bg.panel,
        borderBottom: `1px solid ${PM.border.prominent}`,
        flexShrink: 0,
        fontSize: PM.size.label, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: PM.text.muted,
        fontFamily: PM.font.ui, alignItems: 'center',
      }}>
        <span>TIME</span>
        <span>SIDE</span>
        <span style={{ textAlign: 'right' }}>SIZE</span>
        <span style={{ textAlign: 'right' }}>PRICE</span>
        <span style={{ textAlign: 'right' }}>DIR</span>
      </div>

      {/* Body */}
      {error ? (
        <div style={{ ...emptyStyle, color: PM.down }}>{error}</div>
      ) : loading && !trades.length ? (
        <div style={emptyStyle}>Loading trades…</div>
      ) : !trades.length ? (
        <div style={emptyStyle}>No trades in window.</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {trades.map((t, i) => {
            const sideColor = t.side === 'YES' ? PM.up : PM.down
            // Most recent row gets a one-shot slide-in animation.
            const isNewest = i === 0
            return (
              <div key={t.id} className={isNewest ? 'pm-slide-in' : ''}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '92px 56px 92px 1fr 80px',
                  gap: 12,
                  padding: '0 14px', minHeight: PM.hit.rowDesktop - 4, alignItems: 'center',
                  borderBottom: `1px solid ${PM.border.subtle}`,
                  borderLeft: `3px solid ${sideColor}`,
                  fontSize: PM.size.body, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
                }}>
                <span style={{ color: PM.text.muted, fontSize: PM.size.meta }}>{fmtTime(new Date(t.ts).toISOString())}</span>
                <span style={{ color: sideColor, fontWeight: 700 }}>{t.side}</span>
                <span style={{ textAlign: 'right', color: PM.text.secondary, fontSize: PM.size.data, fontWeight: 600 }}>{fmtUsd(t.size)}</span>
                <span style={{ textAlign: 'right', color: PM.text.primary, fontSize: PM.size.price, fontWeight: 600 }}>{t.price.toFixed(3)}</span>
                <span style={{ textAlign: 'right', color: t.direction === 'BUY' ? PM.up : PM.down, fontWeight: 700 }}>
                  {t.direction === 'BUY' ? '↑' : '↓'} {t.direction}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Decoders ────────────────────────────────────────────────────────

function decodeTrade(raw: any, yesTokenId?: string | null): Trade | null {
  if (!raw) return null
  const id = String(raw?.id ?? raw?.trade_id ?? raw?.transaction_hash ?? '')
  if (!id) return null
  const tsRaw = raw?.timestamp ?? raw?.match_time ?? raw?.created_at
  const ts = typeof tsRaw === 'number'
    ? (tsRaw < 2_000_000_000 ? tsRaw * 1000 : tsRaw)
    : new Date(tsRaw ?? Date.now()).getTime()
  const price = Number(raw?.price ?? 0)
  const size = Number(raw?.size ?? raw?.amount ?? 0)
  if (!Number.isFinite(price) || !Number.isFinite(size) || size <= 0) return null
  const sideRaw = String(raw?.side ?? raw?.outcome ?? '').toLowerCase()
  const tokenId = String(raw?.asset_id ?? raw?.token_id ?? '')
  const isYes = yesTokenId
    ? tokenId === yesTokenId
    : sideRaw.includes('yes')
  const directionRaw = String(raw?.direction ?? raw?.taker_side ?? '').toLowerCase()
  const direction: 'BUY' | 'SELL' = directionRaw === 'sell' ? 'SELL' : 'BUY'
  return {
    id,
    ts,
    side: isYes ? 'YES' : 'NO',
    price,
    size,
    direction,
  }
}

const emptyStyle: React.CSSProperties = {
  padding: 60, textAlign: 'center',
  fontSize: 11, color: PM.text.muted, fontFamily: PM.font.mono,
  letterSpacing: '0.5px', textTransform: 'uppercase',
}
