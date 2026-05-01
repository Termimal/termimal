/**
 * /api/price/{sym} — single ticker quote. Same payload shape as one
 * row of /api/prices; the SPA's ticker workspace, watchlist row
 * refresh, and dashboard hover-cards all hit this.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: Array<{
      symbol: string
      regularMarketPrice?: number
      regularMarketPreviousClose?: number
      regularMarketChange?: number
      regularMarketChangePercent?: number
      regularMarketOpen?: number
      regularMarketDayHigh?: number
      regularMarketDayLow?: number
      regularMarketVolume?: number
      regularMarketTime?: number
    }>
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })

  try {
    const json = await yahooFetch<YahooQuoteResponse>(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`,
      { ttl: 15 },
    )
    const q = json?.quoteResponse?.result?.[0]
    if (!q) {
      return NextResponse.json({ error: 'symbol not found' }, { status: 404 })
    }
    return NextResponse.json({
      data: {
        price:   q.regularMarketPrice          ?? 0,
        prev:    q.regularMarketPreviousClose  ?? 0,
        chg:     q.regularMarketChange         ?? 0,
        pct:     q.regularMarketChangePercent  ?? 0,
        open:    q.regularMarketOpen           ?? 0,
        high:    q.regularMarketDayHigh        ?? 0,
        low:     q.regularMarketDayLow         ?? 0,
        vol:     q.regularMarketVolume         ?? 0,
        date:    q.regularMarketTime
          ? new Date(q.regularMarketTime * 1000).toISOString()
          : new Date().toISOString(),
        source:  'Yahoo Finance',
        updated: new Date().toISOString(),
      },
      source: 'Yahoo Finance',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=15, s-maxage=15' },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}
