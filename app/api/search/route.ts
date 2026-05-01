/**
 * /api/search?q=apple — Yahoo Finance ticker search. Used by the
 * navbar's symbol picker. Returns a flat string array of matching
 * symbols (the SPA expects `{ query, results: string[] }`).
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

interface YahooSearchResponse {
  quotes?: Array<{
    symbol?: string
    shortname?: string
    longname?: string
    quoteType?: string
  }>
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (!q) return NextResponse.json({ query: q, results: [] })

  try {
    const json = await yahooFetch<YahooSearchResponse>(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`,
      { ttl: 60 },
    )
    const results = (json?.quotes ?? [])
      .map((qq) => qq.symbol)
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
    return NextResponse.json({ query: q, results }, {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=60' },
    })
  } catch (err) {
    // Search failing isn't critical — the navbar already has a
    // hardcoded UNIVERSE list as a local fallback.
    return NextResponse.json({ ...yahooErrorPayload(err), query: q, results: [] }, { status: 503 })
  }
}
