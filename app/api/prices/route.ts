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

/**
 * Yahoo's `/v7/finance/quote` started returning HTTP 401 in 2024 unless
 * the request carries a session cookie + crumb token. The "spark"
 * endpoint (`/v7/finance/spark`) is still anonymous and returns
 * everything we need (regularMarketPrice, previousClose, dayHigh/Low,
 * volume, regularMarketTime) inside `result[i].response[0].meta`.
 * One round-trip, batch over many symbols, no crumb dance.
 */
interface YahooSparkResponse {
  spark?: {
    result?: Array<{
      symbol: string
      response?: Array<{
        meta?: {
          symbol?: string
          regularMarketPrice?: number
          chartPreviousClose?: number
          previousClose?: number
          regularMarketDayHigh?: number
          regularMarketDayLow?: number
          regularMarketVolume?: number
          regularMarketTime?: number
        }
        timestamp?: number[]
        indicators?: {
          quote?: Array<{ open?: (number | null)[] }>
        }
      }>
    }>
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

  // Encode each symbol individually then join with literal commas —
  // `encodeURIComponent(symbols.join(','))` would encode the comma
  // separator as %2C, which Yahoo's batch parser does not accept.
  const yahooUrl =
    `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols.map(encodeURIComponent).join(',')}&range=1d&interval=1d`

  try {
    const json = await yahooFetch<YahooSparkResponse>(yahooUrl, { ttl: 15 })
    const out: Record<string, unknown> = {}
    for (const r of json?.spark?.result ?? []) {
      const m = r.response?.[0]?.meta
      if (!m) continue
      const price = m.regularMarketPrice ?? 0
      const prev  = m.previousClose ?? m.chartPreviousClose ?? price
      const chg   = price - prev
      const pct   = prev ? (chg / prev) * 100 : 0
      const open  = r.response?.[0]?.indicators?.quote?.[0]?.open?.[0] ?? prev
      out[r.symbol] = {
        price,
        prev,
        chg,
        pct,
        open,
        high:    m.regularMarketDayHigh ?? price,
        low:     m.regularMarketDayLow  ?? price,
        vol:     m.regularMarketVolume  ?? 0,
        date:    m.regularMarketTime
          ? new Date(m.regularMarketTime * 1000).toISOString()
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
