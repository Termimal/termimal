/**
 * /api/prices — batch quote for many symbols at once.
 *
 * Response matches the SPA's `Record<string, PriceSnapshot>` contract,
 * wrapped in `{ data: ..., source, updated }`.
 *
 * Default symbol set (when no ?symbols= is provided) covers everything
 * the Termimal dashboard ribbon and risk-map use: indices, mega caps,
 * majors, gold, oil, BTC/ETH. The SPA can override by passing a
 * comma-separated list.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'
import { cachedJson } from '@/lib/edge-cache'
import { withTiming } from '@/lib/observability'

const DEFAULT_SYMBOLS = [
  // US indices
  '^GSPC', '^IXIC', '^DJI', '^RUT', '^VIX',
  // Intl indices
  '^GDAXI', '^FTSE', '^N225', '^HSI',
  // Mega caps
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'BRK-B', 'JPM',
  // FX
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X',
  // Commodities + crypto
  'GC=F', 'SI=F', 'CL=F', 'BTC-USD', 'ETH-USD', 'SOL-USD',
]

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
    error?: { description?: string } | null
  }
}

export async function GET(request: Request) {
  return cachedJson(request, 15, () => withTiming('/api/prices', () => handle(request)))
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const param = url.searchParams.get('symbols')
  const symbols = param
    ? param.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_SYMBOLS

  if (!symbols.length) {
    return NextResponse.json({ error: 'no symbols' }, { status: 400 })
  }

  const yahooUrl =
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`

  try {
    const json = await yahooFetch<YahooQuoteResponse>(yahooUrl, { ttl: 15 })
    const out: Record<string, unknown> = {}
    for (const q of json?.quoteResponse?.result ?? []) {
      out[q.symbol] = {
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
      }
    }
    return NextResponse.json({
      data: out,
      source: 'Yahoo Finance',
      updated: new Date().toISOString(),
    }, {
      headers: {
        'cache-control': 'public, max-age=15, s-maxage=15',
      },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}
