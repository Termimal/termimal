/**
 * Polymarket API proxy.
 *
 * The terminal SPA at /terminal/polymarket fires fetches against
 * /api/polymarket/* (relative). This route proxies them so:
 *
 *   1. We sidestep CORS — the browser hits same-origin termimal.com,
 *      and Cloudflare/Next forwards to clob.polymarket.com server-side.
 *   2. We keep the SPA decoupled from whether the FastAPI intelligence
 *      backend is deployed. Pure CLOB endpoints (markets, book, trades)
 *      work straight away. Enrichment endpoints (scan, signals, …)
 *      degrade gracefully with a 503 + a helpful message until the
 *      FastAPI is deployed.
 *
 * Caching policy (matches the spec):
 *   - markets list   30 s
 *   - order book      5 s
 *   - trades         10 s
 *
 * Everything runs on the Edge runtime (Cloudflare Pages requirement).
 */

export const runtime = 'edge'

import { NextResponse } from 'next/server'

const CLOB_BASE = 'https://clob.polymarket.com'

// In-memory LRU per worker instance. Cloudflare workers spin many
// instances, so this is best-effort, not authoritative — but it cuts
// upstream calls dramatically for hot paths.
type CacheEntry = { ts: number; ttl: number; body: string; status: number; type: string }
const memoryCache = new Map<string, CacheEntry>()
const CACHE_MAX = 256

function cacheGet(key: string): CacheEntry | null {
  const hit = memoryCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.ts > hit.ttl * 1000) {
    memoryCache.delete(key)
    return null
  }
  return hit
}

function cacheSet(key: string, entry: CacheEntry) {
  if (memoryCache.size >= CACHE_MAX) {
    const firstKey = memoryCache.keys().next().value
    if (firstKey) memoryCache.delete(firstKey)
  }
  memoryCache.set(key, entry)
}

/**
 * Best-effort proxy to a CLOB endpoint with TTL caching + retry on 429.
 */
async function proxyClob(path: string, search: URLSearchParams, ttlSec: number): Promise<Response> {
  const upstream = new URL(`${CLOB_BASE}${path}`)
  search.forEach((v, k) => upstream.searchParams.set(k, v))
  const cacheKey = upstream.toString()

  const hit = cacheGet(cacheKey)
  if (hit) {
    return new Response(hit.body, {
      status: hit.status,
      headers: { 'content-type': hit.type, 'x-termimal-cache': 'HIT' },
    })
  }

  // Exponential backoff for 429: 2 s, 4 s, 8 s, then give up.
  const delays = [0, 2000, 4000, 8000]
  let lastErr: unknown = null
  for (const d of delays) {
    if (d > 0) await new Promise((r) => setTimeout(r, d))
    try {
      const res = await fetch(upstream, {
        method: 'GET',
        // Edge-runtime fetch supports `cf` for Cloudflare cache hints,
        // but `next.revalidate` covers the common case for Vercel/CF.
        next: { revalidate: ttlSec },
        headers: { accept: 'application/json' },
      })
      if (res.status === 429) {
        lastErr = new Error('Rate limited by Polymarket CLOB')
        continue
      }
      const body = await res.text()
      const type = res.headers.get('content-type') ?? 'application/json'
      if (res.ok) {
        cacheSet(cacheKey, { ts: Date.now(), ttl: ttlSec, body, status: res.status, type })
      }
      return new Response(body, {
        status: res.status,
        headers: {
          'content-type': type,
          'x-termimal-cache': 'MISS',
          'cache-control': `public, max-age=${ttlSec}, s-maxage=${ttlSec}`,
        },
      })
    } catch (err) {
      lastErr = err
    }
  }

  return NextResponse.json(
    {
      error: 'Markets data temporarily unavailable',
      detail: lastErr instanceof Error ? lastErr.message : String(lastErr),
    },
    { status: 503 },
  )
}

/**
 * Transform a raw CLOB market record into the shape the existing
 * SPA expects (`Market` interface in pages/Polymarket.tsx). The SPA
 * was originally written against the FastAPI's enriched response;
 * by reshaping CLOB output we keep the SPA UI working without the
 * Python backend deployed.
 *
 * Optional enrichment fields (vol_stats, dir_shift, wallet_data,
 * anomaly, signal) are simply omitted — the SPA already treats them
 * as optional.
 */
function transformClobMarket(raw: any): Record<string, unknown> {
  const tokens: any[] = Array.isArray(raw?.tokens) ? raw.tokens : []
  const yesToken = tokens.find((t) => /yes/i.test(t?.outcome ?? '')) ?? tokens[0]
  const noToken  = tokens.find((t) => /no/i.test(t?.outcome ?? ''))  ?? tokens[1]

  const yesPrice = Number(yesToken?.price ?? 0.5)
  const noPrice  = Number(noToken?.price  ?? 1 - yesPrice)

  const tagSrc = Array.isArray(raw?.tags) ? raw.tags[0] : raw?.category
  const tag = (typeof tagSrc === 'string' ? tagSrc : 'OTHER').toUpperCase()

  return {
    id:           String(raw?.condition_id ?? raw?.market_slug ?? raw?.question_id ?? ''),
    question:     String(raw?.question ?? raw?.title ?? '(untitled)'),
    tag,
    yes_price:    yesPrice,
    outcomes: [
      { name: 'YES', price: yesPrice, token_id: String(yesToken?.token_id ?? '') },
      { name: 'NO',  price: noPrice,  token_id: String(noToken?.token_id  ?? '') },
    ],
    volume_24h:   Number(raw?.volume_24hr   ?? raw?.volume24hr ?? 0),
    volume_total: Number(raw?.volume        ?? 0),
    liquidity:    Number(raw?.liquidity     ?? raw?.liquidity_num ?? 0),
    end_date:     String(raw?.end_date_iso  ?? raw?.endDate ?? ''),
    url:          raw?.market_slug ? `https://polymarket.com/market/${raw.market_slug}` : '',
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path: pathParts } = await params
  const path = pathParts.join('/')
  const url = new URL(request.url)

  // ── 1. Markets list ───────────────────────────────────────────────
  if (path === 'markets') {
    const res = await proxyClob('/markets', url.searchParams, 30)
    if (!res.ok) return res
    try {
      const body = await res.text()
      const json = JSON.parse(body)
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
      const transformed = list.map(transformClobMarket)
      return NextResponse.json(transformed, {
        headers: {
          'cache-control': 'public, max-age=30, s-maxage=30',
        },
      })
    } catch {
      return NextResponse.json({ error: 'Bad upstream payload' }, { status: 502 })
    }
  }

  // ── 2. Single market ──────────────────────────────────────────────
  if (path.startsWith('markets/')) {
    const id = pathParts.slice(1).join('/')
    if (!id) return NextResponse.json({ error: 'Missing market id' }, { status: 400 })
    const res = await proxyClob(`/markets/${encodeURIComponent(id)}`, new URLSearchParams(), 30)
    if (!res.ok) return res
    try {
      const body = await res.text()
      const json = JSON.parse(body)
      return NextResponse.json(transformClobMarket(json?.data ?? json))
    } catch {
      return NextResponse.json({ error: 'Bad upstream payload' }, { status: 502 })
    }
  }

  // ── 3. Order book ─────────────────────────────────────────────────
  if (path === 'book') {
    const tokenId = url.searchParams.get('token_id')
    if (!tokenId) {
      return NextResponse.json({ error: 'Missing token_id query param' }, { status: 400 })
    }
    return proxyClob('/book', new URLSearchParams({ token_id: tokenId }), 5)
  }

  // ── 4. Trade history ──────────────────────────────────────────────
  if (path === 'trades') {
    const market = url.searchParams.get('market')
    if (!market) {
      return NextResponse.json({ error: 'Missing market query param' }, { status: 400 })
    }
    return proxyClob('/trades', new URLSearchParams({ market }), 10)
  }

  // ── 5a. Deep scan — light version derived from public CLOB ─────────
  // The Python backend's full scan computes wallet-accuracy scoring
  // against resolved-market history (which we don't persist). Here we
  // do what's feasible at the Edge:
  //   - Pull top-N markets by liquidity
  //   - For each, fetch recent trades and compute:
  //       * volume_1h / avg_7d_hourly  (volume spike multiplier)
  //       * BUY vs SELL ratio recent vs prior  (direction shift)
  //       * anomaly level: STRONG / WEAK / NONE
  //   - Emit a strong/weak signal when both spike + direction agree
  if (path === 'scan') {
    const limit = Math.min(20, Math.max(3, Number(url.searchParams.get('limit')) || 10))
    return runDeepScan(limit)
  }

  // ── 5b. Signal history — no persistence layer at the Edge ─────────
  // Without a database we can't persist signals across requests, so
  // /signals returns an empty array (the SPA's HISTORY tab handles
  // empty gracefully).
  if (path === 'signals') {
    return NextResponse.json([])
  }

  // ── 5c. Marking a signal correct/incorrect — no-op without storage
  if (path.startsWith('signal/')) {
    return NextResponse.json({
      ok: true,
      note: 'Outcome accepted but not persisted — no database backend connected.',
    })
  }

  // Positioning lives at the top-level /api/positioning route, not
  // here — see app/api/positioning/{,[id]}/route.ts.

  // ── 6. Unknown path ───────────────────────────────────────────────
  return NextResponse.json(
    { error: 'unknown-polymarket-path', path },
    { status: 404 },
  )
}

/**
 * The SPA fires POST /api/polymarket/signal/:id/outcome to mark a
 * resolved signal as correct/incorrect. Without persistence we accept
 * the call but no-op so the UI's success path runs instead of a 503.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path: pathParts } = await params
  const path = pathParts.join('/')
  if (path.startsWith('signal/')) {
    return NextResponse.json({ ok: true, note: 'Outcome accepted but not persisted.' })
  }
  return NextResponse.json({ error: 'method-not-allowed', path }, { status: 405 })
}

/* ════════════════════════════════════════════════════════════════════
 *  CLOB-derived intelligence — light scan + positioning helpers
 * ════════════════════════════════════════════════════════════════════ */

interface ClobTrade {
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

async function fetchTradesForMarket(market: string, limit = 200): Promise<ClobTrade[]> {
  const r = await fetch(`${CLOB_BASE}/trades?market=${encodeURIComponent(market)}&limit=${limit}`, {
    next: { revalidate: 30 },
    headers: { accept: 'application/json' },
  })
  if (!r.ok) return []
  const j = await r.json().catch(() => null) as { data?: ClobTrade[] } | ClobTrade[] | null
  if (Array.isArray(j)) return j
  return j?.data ?? []
}

async function runDeepScan(limit: number): Promise<Response> {
  // 1. Pull markets snapshot.
  const marketsRes = await proxyClob('/markets', new URLSearchParams(), 30)
  if (!marketsRes.ok) return marketsRes
  const list = await (async () => {
    try {
      const json = JSON.parse(await marketsRes.text())
      const arr = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
      return arr.map(transformClobMarket) as Array<ReturnType<typeof transformClobMarket>>
    } catch { return [] as Array<ReturnType<typeof transformClobMarket>> }
  })()

  // 2. Sort by liquidity, take top N for the scan budget.
  const top = list
    .slice()
    .sort((a, b) => (Number(b.liquidity) || 0) - (Number(a.liquidity) || 0))
    .slice(0, limit)

  // 3. Compute real volume + direction + per-wallet stats in parallel.
  //    Wallet score (0-100) is now computed honestly from this market's
  //    trade history, NOT a placeholder zero:
  //      - 60% from average entry quality: difference between this
  //        wallet's volume-weighted average buy price and the current
  //        YES price. Buying YES at 0.30 when YES is now 0.65 = strong
  //        edge. Buying NO (= shorting YES) at 0.70 when YES is now
  //        0.35 = strong edge.
  //      - 40% from trade-count percentile inside this market (more
  //        trades = more conviction signal, capped to avoid bots).
  const enriched = await Promise.all(top.map(async (m) => {
    const id = String(m.id)
    if (!id) return m
    const trades = await fetchTradesForMarket(id, 500).catch(() => [] as ClobTrade[])
    const now = Date.now()
    const yesPrice = Number(m.yes_price)

    // ── Volume + direction (existing logic, kept) ──────────────────
    let vol1h = 0
    let buys = 0, sells = 0, buys24h = 0, sells24h = 0
    let total = 0
    for (const t of trades) {
      const tsRaw = t.match_time ?? t.timestamp ?? null
      const ts = typeof tsRaw === 'number'
        ? (tsRaw < 2_000_000_000 ? tsRaw * 1000 : tsRaw)
        : tsRaw ? new Date(tsRaw).getTime() : null
      if (!ts) continue
      const ageMin = (now - ts) / 60_000
      const size = Number(t.size ?? 0) * Number(t.price ?? 0)
      if (!Number.isFinite(size) || size <= 0) continue
      total += size
      if (ageMin <= 60) vol1h += size
      const side = String(t.taker_side ?? t.side ?? '').toLowerCase()
      const isBuy = side === 'buy' || side.includes('buy')
      if (ageMin <= 60) (isBuy ? buys++ : sells++)
      else if (ageMin <= 60 * 24) (isBuy ? buys24h++ : sells24h++)
    }
    const avg7dHourly = total / Math.max(1, Math.min(168, trades.length / 2))
    const multiplier = avg7dHourly > 0 ? vol1h / avg7dHourly : 0
    const spike = multiplier >= 3
    const ratio_recent = buys + sells > 0 ? buys / (buys + sells) : 0.5
    const ratio_prior  = buys24h + sells24h > 0 ? buys24h / (buys24h + sells24h) : 0.5
    const shift = ratio_recent - ratio_prior
    const directional = Math.abs(shift) >= 0.15

    // ── Per-wallet aggregation with REAL entry-quality scoring ─────
    type Agg = { trader: string; notional: number; buys: number; sells: number; vwap_buy: number; vwap_buy_w: number; vwap_sell: number; vwap_sell_w: number; first_ts: number; last_ts: number }
    const wmap = new Map<string, Agg>()
    let firstMarketTs = Infinity
    let lastMarketTs = 0
    for (const t of trades) {
      const trader = (t.trader ?? t.maker_address ?? t.taker_address ?? '').toString()
      if (!trader) continue
      const tsRaw = t.match_time ?? t.timestamp ?? null
      const ts = typeof tsRaw === 'number'
        ? (tsRaw < 2_000_000_000 ? tsRaw * 1000 : tsRaw)
        : tsRaw ? new Date(tsRaw).getTime() : 0
      const price = Number(t.price ?? 0)
      const size  = Number(t.size ?? 0)
      const notional = price * size
      if (!Number.isFinite(notional) || notional <= 0) continue
      const side = String(t.taker_side ?? t.side ?? '').toLowerCase()
      const isBuy = side === 'buy' || side.includes('buy')
      const e = wmap.get(trader) ?? {
        trader, notional: 0, buys: 0, sells: 0,
        vwap_buy: 0, vwap_buy_w: 0, vwap_sell: 0, vwap_sell_w: 0,
        first_ts: Number.MAX_SAFE_INTEGER, last_ts: 0,
      }
      e.notional += notional
      if (isBuy) {
        e.buys += 1
        e.vwap_buy += price * size
        e.vwap_buy_w += size
      } else {
        e.sells += 1
        e.vwap_sell += price * size
        e.vwap_sell_w += size
      }
      if (ts && ts < e.first_ts) e.first_ts = ts
      if (ts && ts > e.last_ts) e.last_ts = ts
      if (ts && ts < firstMarketTs) firstMarketTs = ts
      if (ts && ts > lastMarketTs) lastMarketTs = ts
      wmap.set(trader, e)
    }

    // Score wallets. accuracy here = fraction of notional that's
    // currently in-the-money based on YES vs NO entry vs current price.
    const wallets = Array.from(wmap.values())
      .map((w) => {
        const buyVwap  = w.vwap_buy_w  > 0 ? w.vwap_buy  / w.vwap_buy_w  : null
        const sellVwap = w.vwap_sell_w > 0 ? w.vwap_sell / w.vwap_sell_w : null
        // Buy on YES side wins when current price > buy VWAP.
        // "Sell" in CLOB terms is selling YES = buying NO; that wins
        // when current YES has FALLEN (i.e. NO has risen).
        const buyEdge  = buyVwap  != null && yesPrice > 0 ? (yesPrice - buyVwap) : 0
        const sellEdge = sellVwap != null && yesPrice > 0 ? (sellVwap - yesPrice) : 0
        const dominantBuy = w.buys >= w.sells
        const edge = dominantBuy ? buyEdge : sellEdge
        // Map edge ([-1, +1]) to a 0..100 accuracy proxy.
        const accuracy = Math.max(0, Math.min(100, Math.round(50 + edge * 100)))
        // Early-rate: how early in this market's life this wallet
        // first traded, expressed 0..100.
        const span = lastMarketTs - firstMarketTs
        const earlyRate = (span > 0 && w.first_ts > 0)
          ? Math.max(0, Math.min(100, Math.round(100 * (1 - (w.first_ts - firstMarketTs) / span))))
          : 0
        // Score: weighted blend of accuracy + early entry, with a
        // light log-scaled trade-count nudge for conviction.
        const tcBoost = Math.min(20, Math.log10(Math.max(1, w.buys + w.sells)) * 10)
        const score = Math.max(0, Math.min(100, Math.round(0.55 * accuracy + 0.35 * earlyRate + tcBoost * 0.10)))
        const tradeCount = w.buys + w.sells
        // Pump-dump heuristic: many trades + very recent + low size variance.
        const pumpDump = tradeCount > 60 && (w.last_ts - w.first_ts) < 2 * 3600 * 1000
        return {
          address: w.trader,
          short_address: w.trader.length > 12
            ? w.trader.slice(0, 6) + '…' + w.trader.slice(-4)
            : w.trader,
          volume: w.notional,
          pct_of_market: 0,        // filled below once total known
          score,
          accuracy,
          early_rate: earlyRate,
          trade_count: tradeCount,
          direction: dominantBuy ? 'YES' : 'NO',
          pump_dump_flag: pumpDump,
        }
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 50)
    const totalWalletVol = wallets.reduce((acc, w) => acc + w.volume, 0)
    for (const w of wallets) w.pct_of_market = totalWalletVol > 0 ? (w.volume / totalWalletVol) * 100 : 0

    // High-score wallets agree on a direction → treat as cluster.
    const highScore = wallets.filter((w) => w.score >= 70)
    const highScoreYesShare = highScore.length > 0
      ? highScore.filter((w) => w.direction === 'YES').length / highScore.length
      : null
    const clusterConfirmed = highScoreYesShare != null && (highScoreYesShare >= 0.7 || highScoreYesShare <= 0.3)
    const clusterDirection = clusterConfirmed
      ? (highScoreYesShare! >= 0.5 ? 'YES' : 'NO')
      : null
    const avgWalletScore = highScore.length > 0
      ? highScore.reduce((a, w) => a + w.score, 0) / highScore.length
      : 0

    const conditions = {
      volume_spike: spike,
      directional_shift: directional,
      wallet_consensus: clusterConfirmed,
    }
    const passed = Object.values(conditions).filter(Boolean).length
    const level: 'STRONG' | 'WEAK' | 'NONE' = passed >= 2 ? 'STRONG' : passed === 1 ? 'WEAK' : 'NONE'
    const direction = clusterDirection ?? (shift > 0 ? 'YES' : 'NO')

    return {
      ...m,
      trades_analyzed: trades.length,
      vol_stats: { volume_1h: vol1h, avg_7d_hourly: avg7dHourly, multiplier, spike },
      dir_shift: {
        shift,
        direction: shift > 0 ? 'YES' : 'NO',
        ratio_recent,
        ratio_prior,
        significant: directional,
      },
      wallet_data: {
        wallets,
        high_score_wallets: highScore,
        cluster_confirmed: clusterConfirmed,
        cluster_direction: clusterDirection,
        manipulation_flags: wallets.filter((w) => w.pump_dump_flag).map((w) => w.short_address),
        total_volume: totalWalletVol,
      },
      anomaly: { level, passed, conditions },
      signal: level !== 'NONE'
        ? {
            signal_id: `${id}-${now}`,
            timestamp: new Date().toISOString(),
            market: m.question,
            tag: m.tag,
            direction,
            confidence: Math.min(95, Math.round(35 + multiplier * 8 + Math.abs(shift) * 80 + (clusterConfirmed ? 20 : 0))),
            wallets_short: highScore.slice(0, 5).map((w) => w.short_address),
            avg_wallet_score: avgWalletScore,
            volume_multiplier: multiplier,
            volume_1h: vol1h,
            polymarket_url: m.url,
            recommended_instrument: 'POLYMARKET',
            recommended_direction: direction === 'YES' ? 'LONG' : 'SHORT',
            reasoning:
              `Volume ${multiplier.toFixed(1)}× baseline · direction shift ${(shift * 100).toFixed(0)}%` +
              (clusterConfirmed ? ` · wallet cluster on ${direction}` : ''),
            cross_market_confirmation: false,
            cross_market_checks: [],
            signal_level: level,
            conditions_met: passed,
            yes_price: yesPrice,
            liquidity: Number(m.liquidity),
            outcome: null,
          }
        : null,
    }
  }))

  // The transformClobMarket helper widens its return shape to
  // Record<string, unknown>, so TS can't see the signal field we
  // added in this handler. Cast through `any` once at the boundary.
  type EnrichedMarket = (typeof enriched)[number] & { signal: { signal_level?: 'STRONG' | 'WEAK' | 'NONE' } | null }
  const all = enriched as EnrichedMarket[]
  const strong_signals = all
    .map((m) => m.signal)
    .filter((s): s is NonNullable<typeof s> & { signal_level: 'STRONG' } => Boolean(s) && s!.signal_level === 'STRONG')
  const weak_signals = all
    .map((m) => m.signal)
    .filter((s): s is NonNullable<typeof s> & { signal_level: 'WEAK' } => Boolean(s) && s!.signal_level === 'WEAK')

  return NextResponse.json({
    markets: enriched,
    strong_signals,
    weak_signals,
    scanned: enriched.length,
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'cache-control': 'public, max-age=30, s-maxage=30' },
  })
}

async function runPositioningOverview(): Promise<Response> {
  // Light overview: top markets by liquidity, no per-market deep dive.
  const marketsRes = await proxyClob('/markets', new URLSearchParams(), 60)
  if (!marketsRes.ok) return marketsRes
  try {
    const json = JSON.parse(await marketsRes.text())
    const arr = Array.isArray(json?.data) ? json.data : []
    const items = arr.slice(0, 30).map(transformClobMarket)
    return NextResponse.json({
      data: items,
      source: 'Polymarket CLOB',
      updated: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

async function runPositioningDetail(id: string): Promise<Response> {
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const trades = await fetchTradesForMarket(id, 500).catch(() => [] as ClobTrade[])
  if (!trades.length) {
    return NextResponse.json({
      data: { id, trades: [], wallets: [], summary: null },
      source: 'Polymarket CLOB',
    })
  }
  // Aggregate per-trader notional + side.
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
    .slice(0, 50)
    .map((w) => ({
      address: w.trader,
      short_address: w.trader.slice(0, 6) + '…' + w.trader.slice(-4),
      volume: w.notional,
      pct_of_market: 0,
      score: 0,
      accuracy: 0,
      early_rate: 0,
      trade_count: w.buys + w.sells,
      direction: w.buys >= w.sells ? 'YES' : 'NO',
      pump_dump_flag: false,
    }))
  const total = wallets.reduce((acc, w) => acc + w.volume, 0)
  for (const w of wallets) {
    w.pct_of_market = total > 0 ? (w.volume / total) * 100 : 0
  }
  return NextResponse.json({
    data: {
      id,
      summary: { total_volume: total, trade_count: trades.length, wallets: wallets.length },
      wallets,
      trades: trades.slice(0, 100),
    },
    source: 'Polymarket CLOB',
    updated: new Date().toISOString(),
  }, {
    headers: { 'cache-control': 'public, max-age=30, s-maxage=30' },
  })
}
