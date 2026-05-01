/**
 * Live Polymarket order book panel.
 *
 * Fetches the initial book snapshot via the Next.js proxy
 * (/api/polymarket/book?token_id=...) and then subscribes to the
 * CLOB WebSocket for incremental updates. Displays the top 10 bids
 * and asks with depth bars proportional to the largest order on
 * either side.
 *
 * Bids in green, asks in red. Best bid / best ask / spread shown
 * prominently at the top.
 *
 * Empty / error states are inline (never blank), per the platform's
 * "graceful degradation" rule.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { PM, fmtUsd } from './_ui/tokens'
import { StatusDot } from './_ui/primitives'
import { usePolymarketSocket } from '@/lib/usePolymarketSocket'

interface OrderBookProps {
  tokenId: string | null
  /** Display label (typically the market question, truncated). */
  marketLabel?: string
}

// ── Domain types ────────────────────────────────────────────────────
type Level = { price: number; size: number }
type BookSnapshot = {
  bids: Level[]
  asks: Level[]
}

type WsBookFrame = {
  event_type?: string
  asset_id?: string
  bids?: { price: string | number; size: string | number }[]
  asks?: { price: string | number; size: string | number }[]
  // Some frames carry `changes` rather than full sides — handled below.
  changes?: { price: string | number; size: string | number; side: 'BUY' | 'SELL' }[]
}

// ── Helpers ─────────────────────────────────────────────────────────

function parseLevel(raw: { price: string | number; size: string | number }): Level {
  return { price: Number(raw.price), size: Number(raw.size) }
}

/** Sort + dedupe + cap to top N levels. */
function normalize(levels: Level[], side: 'bids' | 'asks', cap = 10): Level[] {
  const grouped = new Map<number, number>()
  for (const lv of levels) {
    if (!Number.isFinite(lv.price) || !Number.isFinite(lv.size)) continue
    if (lv.size <= 0) continue
    grouped.set(lv.price, (grouped.get(lv.price) ?? 0) + lv.size)
  }
  const arr = Array.from(grouped, ([price, size]) => ({ price, size }))
  arr.sort((a, b) => (side === 'bids' ? b.price - a.price : a.price - b.price))
  return arr.slice(0, cap)
}

// ── Component ───────────────────────────────────────────────────────

export function OrderBook({ tokenId, marketLabel }: OrderBookProps) {
  const [book, setBook] = useState<BookSnapshot>({ bids: [], asks: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const flashRef = useRef<{ price: number; ts: number } | null>(null)

  // ── Snapshot fetch ────────────────────────────────────────────────
  const loadSnapshot = useCallback(async () => {
    if (!tokenId) return
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get('/api/polymarket/book', { params: { token_id: tokenId } })
      const bids = Array.isArray(r.data?.bids) ? r.data.bids.map(parseLevel) : []
      const asks = Array.isArray(r.data?.asks) ? r.data.asks.map(parseLevel) : []
      setBook({
        bids: normalize(bids, 'bids'),
        asks: normalize(asks, 'asks'),
      })
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Order book temporarily unavailable')
    } finally {
      setLoading(false)
    }
  }, [tokenId])

  useEffect(() => {
    if (!tokenId) {
      setBook({ bids: [], asks: [] })
      return
    }
    loadSnapshot()
  }, [tokenId, loadSnapshot])

  // ── Live updates via WebSocket ────────────────────────────────────
  const assetsIds = useMemo(() => (tokenId ? [tokenId] : []), [tokenId])
  const { lastMessage, status } = usePolymarketSocket<WsBookFrame>({
    assetsIds,
    enabled: Boolean(tokenId),
  })

  useEffect(() => {
    if (!lastMessage) return
    // Polymarket frames may arrive as a single object or an array of
    // { event_type: 'book' | 'price_change', ... } items. We only
    // care about updates whose asset_id matches our token.
    const frames: WsBookFrame[] = Array.isArray(lastMessage)
      ? (lastMessage as WsBookFrame[])
      : [lastMessage]

    setBook((prev) => {
      let bids = prev.bids
      let asks = prev.asks
      for (const f of frames) {
        if (f.asset_id && f.asset_id !== tokenId) continue
        if (Array.isArray(f.bids) || Array.isArray(f.asks)) {
          // Full snapshot frame — replace.
          if (Array.isArray(f.bids)) bids = normalize(f.bids.map(parseLevel), 'bids')
          if (Array.isArray(f.asks)) asks = normalize(f.asks.map(parseLevel), 'asks')
        } else if (Array.isArray(f.changes)) {
          // Delta frame — apply per side. size === 0 means remove.
          const bidMap = new Map(bids.map((l) => [l.price, l.size]))
          const askMap = new Map(asks.map((l) => [l.price, l.size]))
          for (const c of f.changes) {
            const price = Number(c.price)
            const size = Number(c.size)
            const map = c.side === 'BUY' ? bidMap : askMap
            if (size <= 0) map.delete(price)
            else map.set(price, size)
          }
          bids = normalize(
            Array.from(bidMap, ([price, size]) => ({ price, size })),
            'bids',
          )
          asks = normalize(
            Array.from(askMap, ([price, size]) => ({ price, size })),
            'asks',
          )
        }
      }
      return { bids, asks }
    })

    // Trigger a brief flash on best-bid changes.
    flashRef.current = { price: 0, ts: Date.now() }
  }, [lastMessage, tokenId])

  // ── Derived values ────────────────────────────────────────────────
  const bestBid = book.bids[0]?.price ?? null
  const bestAsk = book.asks[0]?.price ?? null
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null
  const maxSize = useMemo(() => {
    let m = 0
    for (const lv of book.bids) m = Math.max(m, lv.size)
    for (const lv of book.asks) m = Math.max(m, lv.size)
    return m || 1
  }, [book])

  // ── Render ────────────────────────────────────────────────────────
  if (!tokenId) {
    return (
      <div style={emptyStyle}>
        Select a market from the list to load its live order book.
      </div>
    )
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
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: PM.text.muted,
        }}>Order Book</span>
        {marketLabel && (
          <span style={{
            fontSize: 12, color: PM.text.primary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 360,
          }}>{marketLabel}</span>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: PM.font.mono, color: PM.text.muted }}>
          <StatusDot state={status === 'connected' ? 'live' : status === 'reconnecting' ? 'polling' : 'idle'} />
          {status === 'connected' ? 'LIVE' : status === 'reconnecting' ? 'RECONNECTING' : status === 'connecting' ? 'CONNECTING' : status === 'error' ? 'ERROR' : 'OFFLINE'}
        </span>
      </div>

      {/* Best bid / ask / spread strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderBottom: `1px solid ${PM.border.subtle}`,
        background: PM.bg.panel, flexShrink: 0,
      }}>
        <Stat label="BEST BID" value={bestBid != null ? bestBid.toFixed(3) : '—'} color={PM.up} />
        <Stat label="BEST ASK" value={bestAsk != null ? bestAsk.toFixed(3) : '—'} color={PM.down} />
        <Stat label="SPREAD"   value={spread != null ? spread.toFixed(3) : '—'} color={PM.text.primary} />
      </div>

      {/* Body */}
      {error ? (
        <div style={{ ...emptyStyle, color: PM.down }}>{error}</div>
      ) : loading && !book.bids.length && !book.asks.length ? (
        <div style={emptyStyle}>Loading order book…</div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* Bids */}
          <Side levels={book.bids} side="bids" maxSize={maxSize} />
          {/* Asks */}
          <Side levels={book.asks} side="asks" maxSize={maxSize} />
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '8px 14px', borderRight: `1px solid ${PM.border.subtle}`,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 500, letterSpacing: '0.5px',
        textTransform: 'uppercase', color: PM.text.muted,
      }}>{label}</span>
      <span style={{
        fontSize: 16, fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
        color, fontWeight: 600,
      }}>{value}</span>
    </div>
  )
}

function Side({
  levels,
  side,
  maxSize,
}: {
  levels: Level[]
  side: 'bids' | 'asks'
  maxSize: number
}) {
  const colour = side === 'bids' ? PM.up : PM.down
  const bgFlash = side === 'bids' ? 'rgba(63,185,80,0.06)' : 'rgba(248,81,73,0.06)'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderRight: side === 'bids' ? `1px solid ${PM.border.subtle}` : 'none',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        padding: '6px 12px', height: 24,
        background: PM.bg.panel,
        borderBottom: `1px solid ${PM.border.prominent}`,
        fontSize: 10, fontWeight: 500, letterSpacing: '0.5px',
        textTransform: 'uppercase', color: PM.text.muted,
        fontFamily: PM.font.ui,
      }}>
        <span>{side === 'bids' ? 'BID' : 'ASK'}</span>
        <span style={{ textAlign: 'right' }}>SIZE</span>
      </div>
      {!levels.length && (
        <div style={{
          padding: 24, fontSize: 11, color: PM.text.muted,
          textAlign: 'center', fontFamily: PM.font.mono,
        }}>NO ORDERS</div>
      )}
      {levels.map((lv) => {
        const pct = Math.min(100, (lv.size / maxSize) * 100)
        return (
          <div key={`${lv.price}-${lv.size}`} style={{
            position: 'relative',
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            padding: '4px 12px', height: 26, alignItems: 'center',
            borderBottom: `1px solid ${PM.bg.app}`,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              right: side === 'bids' ? `${100 - pct}%` : 'auto',
              left: side === 'asks' ? `${100 - pct}%` : 'auto',
              background: bgFlash,
              transition: 'right 200ms ease, left 200ms ease',
            }} />
            <span style={{
              position: 'relative',
              fontSize: 12, fontFamily: PM.font.mono,
              fontVariantNumeric: 'tabular-nums', color: colour, fontWeight: 600,
            }}>{lv.price.toFixed(3)}</span>
            <span style={{
              position: 'relative',
              textAlign: 'right',
              fontSize: 12, fontFamily: PM.font.mono,
              fontVariantNumeric: 'tabular-nums', color: PM.text.secondary,
            }}>{fmtUsd(lv.size)}</span>
          </div>
        )
      })}
    </div>
  )
}

const emptyStyle: React.CSSProperties = {
  padding: 60, textAlign: 'center',
  fontSize: 11, color: PM.text.muted, fontFamily: PM.font.mono,
  letterSpacing: '0.5px', textTransform: 'uppercase',
}
