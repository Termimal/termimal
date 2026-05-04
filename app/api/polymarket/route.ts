/**
 * /api/polymarket — markets list (no path).
 *
 * The SPA's `fetchPolymarket()` hits `/api/polymarket` (bare) and
 * expects `{ data: PolymarketEvent[] }`. The existing catch-all at
 * `[...path]/route.ts` only matches `/api/polymarket/<something>`, so
 * the bare path 404'd. This route fills that gap by proxying the CLOB
 * markets list and reshaping each row into the SPA's PolymarketEvent
 * shape (same fields the SPA already consumes).
 */

export const runtime = 'edge'

import { NextResponse } from 'next/server'

const CLOB_BASE = 'https://clob.polymarket.com'

interface ClobMarketRaw {
  condition_id?: string
  market_slug?: string
  question_id?: string
  question?: string
  title?: string
  category?: string
  tags?: string[]
  tokens?: Array<{ outcome?: string; price?: number | string }>
  volume?: number | string
  volume_24hr?: number | string
  liquidity?: number | string
  liquidity_num?: number | string
  end_date_iso?: string
  endDate?: string
  active?: boolean
  closed?: boolean
}

function transformToEvent(raw: ClobMarketRaw): Record<string, unknown> {
  const tokens = Array.isArray(raw?.tokens) ? raw.tokens : []
  const yesToken = tokens.find((t) => /yes/i.test(String(t?.outcome ?? ''))) ?? tokens[0]
  const yesPrice = Number(yesToken?.price ?? 0.5)
  const tagSrc = Array.isArray(raw?.tags) ? raw.tags[0] : raw?.category
  return {
    id:          String(raw?.condition_id ?? raw?.market_slug ?? raw?.question_id ?? ''),
    name:        String(raw?.question ?? raw?.title ?? '(untitled)'),
    category:    String(typeof tagSrc === 'string' ? tagSrc : 'OTHER').toUpperCase(),
    probability: yesPrice,
    volume:      Number(raw?.volume ?? 0),
    liquidity:   Number(raw?.liquidity ?? raw?.liquidity_num ?? 0),
    end_date:    raw?.end_date_iso ?? raw?.endDate ?? null,
    source:      'Polymarket CLOB',
    url:         raw?.market_slug ? `https://polymarket.com/market/${raw.market_slug}` : '',
    active:      raw?.active !== false && raw?.closed !== true,
  }
}

export async function GET(): Promise<Response> {
  try {
    const res = await fetch(`${CLOB_BASE}/markets`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      return NextResponse.json(
        { data: [], error: `clob http ${res.status}` },
        { status: 200, headers: { 'cache-control': 'public, max-age=30, s-maxage=30' } },
      )
    }
    const json = await res.json().catch(() => null) as
      | { data?: ClobMarketRaw[] }
      | ClobMarketRaw[]
      | null
    const list: ClobMarketRaw[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
        ? (json as { data: ClobMarketRaw[] }).data
        : []

    // Sort by volume descending so the SPA's default top-N view shows
    // the most active markets first.
    const events = list
      .map(transformToEvent)
      .sort((a, b) => Number(b.volume ?? 0) - Number(a.volume ?? 0))

    return NextResponse.json(
      {
        data: events,
        source: 'Polymarket CLOB',
        updated: new Date().toISOString(),
      },
      {
        headers: { 'cache-control': 'public, max-age=60, s-maxage=60' },
      },
    )
  } catch (err) {
    return NextResponse.json(
      {
        data: [],
        error: 'polymarket-unavailable',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    )
  }
}
