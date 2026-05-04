/**
 * /api/earnings/{sym} — next earnings date. Yahoo's calendarEvents
 * module returns this. SPA shape: `{ next_earnings, source }`.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetchAuthed, yahooErrorPayload } from '@/lib/market/yahoo'

interface YahooCalSummary {
  quoteSummary?: {
    result?: Array<{
      calendarEvents?: {
        earnings?: {
          earningsDate?: Array<{ raw?: number }>
        }
      }
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
    const json = await yahooFetchAuthed<YahooCalSummary>(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=calendarEvents`,
      { ttl: 3600 },
    )
    const ts = json?.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate?.[0]?.raw
    return NextResponse.json({
      data: {
        next_earnings: typeof ts === 'number'
          ? new Date(ts * 1000).toISOString().slice(0, 10)
          : null,
        source: 'Yahoo Finance',
      },
      source: 'Yahoo Finance',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=3600, s-maxage=3600' },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}
