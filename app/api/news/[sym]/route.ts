/**
 * /api/news/{sym} — recent news for a ticker.
 *
 * Yahoo's /v1/finance/search endpoint embeds a news array beside the
 * quote results — works anonymously (no crumb), returns 5–10 recent
 * items including title, link, publisher, and publish timestamp.
 *
 * SPA shape: { data: [{ title, link, publisher, date, type? }] }
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

interface SearchNews {
  uuid?: string
  title?: string
  link?: string
  publisher?: string
  providerPublishTime?: number
  type?: string
}

interface SearchResp {
  news?: SearchNews[]
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })

  try {
    const json = await yahooFetch<SearchResp>(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym)}&newsCount=10&quotesCount=0`,
      { ttl: 600 },
    )
    const items = (json?.news ?? []).map((n) => ({
      title:     n.title ?? '',
      link:      n.link ?? '',
      publisher: n.publisher ?? '',
      date: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString().slice(0, 10)
        : '',
      type: n.type ?? '',
    })).filter((n) => n.title && n.link)

    return NextResponse.json({
      data: items,
      source: 'Yahoo Finance',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=600, s-maxage=600' },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}
