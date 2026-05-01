/**
 * Shared Polymarket CLOB helpers used by both the per-path Polymarket
 * proxy and the top-level /api/positioning route.
 */
const CLOB_BASE = 'https://clob.polymarket.com'

export interface ClobTrade {
  asset_id?: string
  price?: string | number
  size?: string | number
  side?: string
  taker_side?: string
  match_time?: number | string
  timestamp?: number | string
  trader?: string
  maker_address?: string
  taker_address?: string
}

export async function fetchClobTrades(market: string, limit = 250): Promise<ClobTrade[]> {
  const r = await fetch(`${CLOB_BASE}/trades?market=${encodeURIComponent(market)}&limit=${limit}`, {
    next: { revalidate: 30 },
    headers: { accept: 'application/json' },
  })
  if (!r.ok) return []
  const j = await r.json().catch(() => null) as { data?: ClobTrade[] } | ClobTrade[] | null
  if (Array.isArray(j)) return j
  return j?.data ?? []
}

export async function fetchClobMarkets(): Promise<unknown[]> {
  const r = await fetch(`${CLOB_BASE}/markets`, {
    next: { revalidate: 30 },
    headers: { accept: 'application/json' },
  })
  if (!r.ok) return []
  const j = await r.json().catch(() => null) as { data?: unknown[] } | unknown[] | null
  if (Array.isArray(j)) return j
  return j?.data ?? []
}

/** Aggregate trades per trader and sort by notional. */
export function aggregateTraders(trades: ClobTrade[], cap = 50) {
  const map = new Map<string, { trader: string; notional: number; buys: number; sells: number }>()
  for (const t of trades) {
    const trader = (t.trader ?? t.maker_address ?? t.taker_address ?? 'unknown').toString()
    const size = Number(t.size ?? 0) * Number(t.price ?? 0)
    if (!Number.isFinite(size) || size <= 0) continue
    const side = String(t.taker_side ?? t.side ?? '').toLowerCase()
    const isBuy = side === 'buy' || side.includes('buy')
    const e = map.get(trader) ?? { trader, notional: 0, buys: 0, sells: 0 }
    e.notional += size
    if (isBuy) e.buys += 1; else e.sells += 1
    map.set(trader, e)
  }
  const wallets = Array.from(map.values())
    .sort((a, b) => b.notional - a.notional)
    .slice(0, cap)
  const total = wallets.reduce((acc, w) => acc + w.notional, 0)
  return wallets.map((w) => ({
    address: w.trader,
    short_address: w.trader.length > 12
      ? w.trader.slice(0, 6) + '…' + w.trader.slice(-4)
      : w.trader,
    volume: w.notional,
    pct_of_market: total > 0 ? (w.notional / total) * 100 : 0,
    score: 0,           // requires resolved-market history
    accuracy: 0,        // requires resolved-market history
    early_rate: 0,      // requires entry-time analysis vs market resolution
    trade_count: w.buys + w.sells,
    direction: w.buys >= w.sells ? 'YES' : 'NO',
    pump_dump_flag: false,
  }))
}
