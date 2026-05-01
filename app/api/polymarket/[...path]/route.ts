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

  // ── 5. Intelligence endpoints (FastAPI-backed) ────────────────────
  // These endpoints (deep scan, wallet scoring, signal history) are
  // served by the Termimal Python backend, not the public CLOB.
  // Until that backend is deployed and proxied, return a clear 503.
  if (path === 'scan' || path === 'signals' || path.startsWith('signal/')) {
    return NextResponse.json(
      {
        error: 'intelligence-backend-offline',
        detail:
          'Polymarket intelligence (deep scan, wallet scoring, signal history) requires the Termimal analysis backend, which is not currently deployed. The Markets, Order Book, and Trades panels work directly against the public Polymarket CLOB without it.',
      },
      { status: 503 },
    )
  }

  // ── 6. Unknown path ───────────────────────────────────────────────
  return NextResponse.json(
    { error: 'unknown-polymarket-path', path },
    { status: 404 },
  )
}

/**
 * The SPA fires POST /api/polymarket/signal/:id/outcome to mark a
 * resolved signal as correct/incorrect. Without the FastAPI we can't
 * persist anything — return 503 with the same message so the UI shows
 * the graceful "intelligence backend offline" state.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path: pathParts } = await params
  const path = pathParts.join('/')
  if (path.startsWith('signal/')) {
    return NextResponse.json(
      {
        error: 'intelligence-backend-offline',
        detail: 'Outcome tracking requires the Termimal analysis backend.',
      },
      { status: 503 },
    )
  }
  return NextResponse.json({ error: 'method-not-allowed', path }, { status: 405 })
}
