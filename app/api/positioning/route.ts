/**
 * /api/positioning — overview list of positioning-tracked markets.
 *
 * Light implementation: serves the top markets from the public
 * Polymarket CLOB so the SPA's positioning page renders without
 * needing the Python intelligence backend deployed. Per-market
 * detail (wallet flows) lives at /api/positioning/{id}.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { fetchClobMarkets } from '@/lib/market/polymarket-clob'

export async function GET() {
  try {
    const list = await fetchClobMarkets()
    const items = list.slice(0, 50).map((m) => {
      const raw = m as Record<string, unknown>
      const tokens = Array.isArray(raw.tokens) ? raw.tokens as Array<Record<string, unknown>> : []
      const yes = tokens.find((t) => /yes/i.test(String(t.outcome ?? ''))) ?? tokens[0]
      return {
        id: String(raw.condition_id ?? raw.market_slug ?? ''),
        question: String(raw.question ?? '(untitled)'),
        tag: String((Array.isArray(raw.tags) ? raw.tags[0] : raw.category) ?? 'OTHER').toUpperCase(),
        yes_price: Number((yes as { price?: number })?.price ?? 0.5),
        liquidity: Number(raw.liquidity ?? 0),
        volume_24h: Number((raw as { volume_24hr?: number }).volume_24hr ?? 0),
        end_date: String((raw as { end_date_iso?: string }).end_date_iso ?? ''),
      }
    })
    return NextResponse.json({
      data: items,
      source: 'Polymarket CLOB (positioning overview)',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=60' },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'positioning-upstream-failed',
      detail: err instanceof Error ? err.message : String(err),
      data: [],
    }, { status: 503 })
  }
}
