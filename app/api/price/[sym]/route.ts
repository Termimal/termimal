/**
 * /api/price/{sym} — single ticker quote. Same payload shape as one
 * row of /api/prices; the SPA's ticker workspace, watchlist row
 * refresh, and dashboard hover-cards all hit this.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

/**
 * Use the v8/chart endpoint which still returns a full quote (in
 * `meta`) without needing the crumb auth that /v7/quote now demands.
 */
interface YahooChartResponse {
  chart?: {
    result?: Array<{
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
      indicators?: {
        quote?: Array<{ open?: (number | null)[] }>
      }
    }>
    error?: { code?: string; description?: string } | null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })

  try {
    const json = await yahooFetch<YahooChartResponse>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`,
      { ttl: 15 },
    )
    const r = json?.chart?.result?.[0]
    const m = r?.meta
    if (!m) {
      return NextResponse.json({ error: 'symbol not found' }, { status: 404 })
    }
    const price = m.regularMarketPrice ?? 0
    const prev  = m.previousClose ?? m.chartPreviousClose ?? price
    const chg   = price - prev
    const pct   = prev ? (chg / prev) * 100 : 0
    const open  = r?.indicators?.quote?.[0]?.open?.[0] ?? prev
    return NextResponse.json({
      data: {
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
