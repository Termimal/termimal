/**
 * /api/history/{sym}?period=1d|5d|1mo|3mo|6mo|1y|2y|5y|max
 *
 * OHLCV history matching the SPA's `PriceHistory` shape. Used by
 * every chart in the terminal — sparklines, ticker workspace, the
 * Charts page.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

const PERIOD_TO_INTERVAL: Record<string, string> = {
  '1d':  '5m',
  '5d':  '15m',
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1d',
  '1y':  '1d',
  '2y':  '1wk',
  '5y':  '1wk',
  'max': '1mo',
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          open?:   (number | null)[]
          high?:   (number | null)[]
          low?:    (number | null)[]
          close?:  (number | null)[]
          volume?: (number | null)[]
        }>
      }
    }>
    error?: { description?: string } | null
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })

  const url = new URL(request.url)
  const period = url.searchParams.get('period') ?? '1y'
  const interval = PERIOD_TO_INTERVAL[period] ?? '1d'

  const yahooUrl =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}` +
    `?range=${period}&interval=${interval}&includePrePost=false&events=div%2Csplits`

  try {
    const json = await yahooFetch<YahooChartResponse>(yahooUrl, { ttl: 60 })
    const r = json?.chart?.result?.[0]
    const ts = r?.timestamp ?? []
    const q  = r?.indicators?.quote?.[0]
    if (!ts.length || !q) {
      return NextResponse.json({ error: 'no data' }, { status: 404 })
    }

    // Filter out nullable rows so the SPA charts don't see NaN.
    const open: number[] = []
    const high: number[] = []
    const low:  number[] = []
    const close:number[] = []
    const vol:  number[] = []
    const dates:string[] = []
    for (let i = 0; i < ts.length; i++) {
      const c = q.close?.[i]
      if (c == null) continue
      open.push(q.open?.[i]   ?? c)
      high.push(q.high?.[i]   ?? c)
      low.push (q.low?.[i]    ?? c)
      close.push(c)
      vol.push (q.volume?.[i] ?? 0)
      dates.push(new Date(ts[i] * 1000).toISOString())
    }

    return NextResponse.json({
      data: {
        ticker:   sym.toUpperCase(),
        period,
        interval,
        dates, open, high, low, close, volume: vol,
        source:  'Yahoo Finance',
        updated: new Date().toISOString(),
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
