/**
 * /api/polymarket/wallet/{addr} — REAL historical accuracy for one
 * wallet across all the resolved markets they've traded in.
 *
 * Split out of /api/polymarket/scan because the per-wallet fetch
 * (trades + resolution lookups) is the second-most-expensive code
 * path in this whole project and was burning ~5-12 ms of CPU per
 * scan on Free-plan isolates. Pulling it onto its own URL means
 * we only pay that cost when the user actually opens a wallet.
 *
 * Response shape:
 *   {
 *     address, trades, resolved, correct,
 *     accuracy_real,                // % win rate, or null if <3 resolved
 *     trades_count, computed_at,
 *   }
 *
 * Cache: 1 h per wallet (hot wallet doesn't change in seconds).
 * Per-IP rate limit: 30 / minute.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { cachedJson } from '@/lib/edge-cache'
import { withTiming } from '@/lib/observability'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-edge'

const POLY_DATA = 'https://data-api.polymarket.com'
const GAMMA = 'https://gamma-api.polymarket.com'

interface UserTrade {
  proxyWallet?: string
  market?: string
  conditionId?: string
  outcome?: string
  side?: string
  price?: number
  size?: number
  timestamp?: number
}

interface MarketRes { conditionId: string; resolved_yes: boolean | null }
const RES_CACHE = new Map<string, MarketRes>()

async function getResolution(cid: string): Promise<MarketRes> {
  if (!cid) return { conditionId: cid, resolved_yes: null }
  const hit = RES_CACHE.get(cid)
  if (hit) return hit
  try {
    const r = await fetch(
      `${GAMMA}/markets?condition_ids=${encodeURIComponent(cid)}&closed=true`,
      { next: { revalidate: 86400 } },
    )
    if (!r.ok) {
      const v: MarketRes = { conditionId: cid, resolved_yes: null }
      RES_CACHE.set(cid, v); return v
    }
    const j = await r.json() as Array<{ outcomePrices?: string }> | { data?: Array<{ outcomePrices?: string }> }
    const arr = Array.isArray(j) ? j : (j as { data?: Array<{ outcomePrices?: string }> }).data ?? []
    const m = arr[0]
    let resolved_yes: boolean | null = null
    if (m?.outcomePrices) {
      try {
        const prices = JSON.parse(m.outcomePrices) as string[]
        if (prices.length >= 2) {
          const yp = Number(prices[0]); const np = Number(prices[1])
          if (Number.isFinite(yp) && Number.isFinite(np)) {
            resolved_yes = yp >= 0.99 ? true : np >= 0.99 ? false : null
          }
        }
      } catch { /* ignore */ }
    }
    const v: MarketRes = { conditionId: cid, resolved_yes }
    RES_CACHE.set(cid, v); return v
  } catch {
    const v: MarketRes = { conditionId: cid, resolved_yes: null }
    RES_CACHE.set(cid, v); return v
  }
}

async function fetchUserTrades(address: string, limit = 200): Promise<UserTrade[]> {
  try {
    const r = await fetch(
      `${POLY_DATA}/trades?user=${encodeURIComponent(address)}&limit=${limit}`,
      { next: { revalidate: 600 } },
    )
    if (!r.ok) return []
    const j = await r.json().catch(() => null) as UserTrade[] | { data?: UserTrade[] } | null
    if (Array.isArray(j)) return j
    return j?.data ?? []
  } catch { return [] }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ addr: string }> },
) {
  const { addr } = await params
  if (!addr) return NextResponse.json({ error: 'missing address' }, { status: 400 })

  const rl = checkRateLimit(request, '/api/polymarket/wallet', { max: 30, windowSec: 60 })
  const limited = rateLimitResponse(rl)
  if (limited) return limited

  return cachedJson(request, 3600, () =>
    withTiming(`/api/polymarket/wallet/${addr.slice(0, 10)}`, async () => {
      const trades = await fetchUserTrades(addr, 200)
      if (!trades.length) {
        return NextResponse.json({
          data: {
            address: addr,
            trades_count: 0, resolved: 0, correct: 0, accuracy_real: null,
          },
          source: 'data-api.polymarket.com',
          updated: new Date().toISOString(),
        })
      }
      // Net YES vs NO notional per market.
      const byMarket = new Map<string, { yesNotional: number; noNotional: number }>()
      for (const t of trades) {
        const cid = t.conditionId ?? t.market
        if (!cid) continue
        const out = String(t.outcome ?? '').toLowerCase()
        const side = String(t.side ?? '').toUpperCase()
        const price = Number(t.price ?? 0)
        const size  = Number(t.size  ?? 0)
        const notional = price * size
        if (!Number.isFinite(notional) || notional <= 0) continue
        const bullishYes = (out === 'yes' && side === 'BUY') || (out === 'no' && side === 'SELL')
        const e = byMarket.get(cid) ?? { yesNotional: 0, noNotional: 0 }
        if (bullishYes) e.yesNotional += notional
        else            e.noNotional  += notional
        byMarket.set(cid, e)
      }
      // Resolve up to 30 markets in parallel.
      const cids = Array.from(byMarket.keys()).slice(0, 30)
      const resolutions = await Promise.all(cids.map(getResolution))
      let resolved = 0, correct = 0
      for (let i = 0; i < cids.length; i++) {
        const r = resolutions[i]
        if (!r || r.resolved_yes == null) continue
        resolved++
        const e = byMarket.get(cids[i])!
        const wallet_dir_yes = e.yesNotional >= e.noNotional
        if (wallet_dir_yes === r.resolved_yes) correct++
      }
      return NextResponse.json({
        data: {
          address: addr,
          trades_count: trades.length,
          resolved, correct,
          accuracy_real: resolved >= 3 ? (correct / resolved) * 100 : null,
        },
        source: 'data-api.polymarket.com + gamma-api.polymarket.com',
        updated: new Date().toISOString(),
      })
    }),
  )
}
