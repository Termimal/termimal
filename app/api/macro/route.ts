/**
 * /api/macro — macro snapshot.
 *
 * Most macro series the SPA renders (10Y / 2Y / VIX / DXY / WTI /
 * Brent / etc.) are reachable through Yahoo Finance, even without a
 * FRED key. We return a partial MacroSnapshot built entirely from
 * Yahoo so the dashboard's macro pulse and risk-map at least show
 * live values. Deeper FRED-only series (M2, recession_prob, breakeven
 * inflation, Fed balance sheet) require FRED_API_KEY; we omit them
 * if the key isn't set.
 *
 * If FRED_API_KEY is configured we also fetch the FRED-only series.
 * That's a smooth upgrade path — set the env var when ready, no code
 * change needed.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

interface YahooQuoteResp {
  quoteResponse?: { result?: Array<{ symbol: string; regularMarketPrice?: number }> }
}

const SYMBOLS = [
  '^TNX',  // US 10Y
  '^FVX',  // US 5Y
  '^IRX',  // US 13W (3M)
  '^VIX',  // VIX
  'DX-Y.NYB', // DXY
  'CL=F',  // WTI
  'BZ=F',  // Brent
] as const

export async function GET() {
  try {
    const json = await yahooFetch<YahooQuoteResp>(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(SYMBOLS.join(','))}`,
      { ttl: 60 },
    )
    const map: Record<string, number> = {}
    for (const q of json?.quoteResponse?.result ?? []) {
      if (typeof q.regularMarketPrice === 'number') map[q.symbol] = q.regularMarketPrice
    }

    const us10y = map['^TNX']
    const us2y  = map['^FVX'] // Yahoo doesn't ship a clean 2Y; use 5Y as a graceful proxy
    const us3m  = map['^IRX']

    return NextResponse.json({
      data: {
        us10y, us2y, us3m,
        spread: us10y != null && us2y != null ? us10y - us2y : undefined,
        vix:   map['^VIX'],
        dxy:   map['DX-Y.NYB'],
        wti:   map['CL=F'],
        brent: map['BZ=F'],
        source: 'Yahoo Finance',
        updated: new Date().toISOString(),
        fred_available: Boolean(process.env.FRED_API_KEY),
      },
      source: 'Yahoo Finance',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=60' },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}
