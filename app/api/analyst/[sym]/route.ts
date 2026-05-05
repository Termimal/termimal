/**
 * /api/analyst/{sym} — Wall Street analyst consensus + price targets.
 *
 * Pulled from Yahoo's quoteSummary modules (recommendationTrend +
 * financialData + price). Crumb-authed — gracefully degrades to a
 * partial response if any field is missing.
 *
 * SPA shape (TickerWorkspace AnalystTab):
 *   {
 *     data: {
 *       rec_label, strong_buy, buy, hold, sell, strong_sell,
 *       n_analysts, target_median, target_high, target_low,
 *       current_price, upside,
 *       price_history: [{ close, date }]
 *     }
 *   }
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooFetchAuthed, yahooErrorPayload } from '@/lib/market/yahoo'

interface RecRow {
  period?: string         // "0m" | "-1m" | "-2m" | "-3m"
  strongBuy?: number
  buy?: number
  hold?: number
  sell?: number
  strongSell?: number
}

interface QuoteSummary {
  quoteSummary?: {
    result?: Array<{
      recommendationTrend?: { trend?: RecRow[] }
      financialData?: {
        targetMedianPrice?:    { raw?: number }
        targetHighPrice?:      { raw?: number }
        targetLowPrice?:       { raw?: number }
        targetMeanPrice?:      { raw?: number }
        recommendationKey?:    string
        recommendationMean?:   { raw?: number }
        numberOfAnalystOpinions?: { raw?: number }
        currentPrice?:         { raw?: number }
      }
      price?: {
        regularMarketPrice?: { raw?: number }
      }
    }>
  }
}

interface ChartResp {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      indicators?: { quote?: Array<{ close?: (number | null)[] }> }
    }>
  }
}

const REC_LABELS: Record<string, string> = {
  strong_buy:  'Strong Buy',
  buy:         'Buy',
  hold:        'Hold',
  underperform:'Underperform',
  sell:        'Sell',
  strongbuy:   'Strong Buy',
  strongsell:  'Strong Sell',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })

  try {
    const [summary, chart] = await Promise.all([
      yahooFetchAuthed<QuoteSummary>(
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=recommendationTrend,financialData,price`,
        { ttl: 1800 },
      ).catch(() => null),
      // 60-day daily history for the price-target chart.
      yahooFetch<ChartResp>(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1d`,
        { ttl: 600 },
      ).catch(() => null),
    ])

    const r = summary?.quoteSummary?.result?.[0]
    if (!r) {
      return NextResponse.json({ data: { error: 'no analyst data' } }, { status: 200 })
    }

    // Use the most recent (period === '0m') trend row when available.
    const trend = r.recommendationTrend?.trend ?? []
    const cur =
      trend.find((t) => t.period === '0m') ??
      trend[0] ??
      {}

    const fd = r.financialData ?? {}
    const targetMedian = fd.targetMedianPrice?.raw ?? fd.targetMeanPrice?.raw ?? null
    const targetHigh   = fd.targetHighPrice?.raw   ?? null
    const targetLow    = fd.targetLowPrice?.raw    ?? null
    const currentPrice = fd.currentPrice?.raw      ?? r.price?.regularMarketPrice?.raw ?? null
    const recKey       = (fd.recommendationKey ?? '').toLowerCase()

    const upside = (targetMedian && currentPrice)
      ? ((targetMedian - currentPrice) / currentPrice) * 100
      : null

    // Build price_history from chart endpoint.
    const ts = chart?.chart?.result?.[0]?.timestamp ?? []
    const closes = chart?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    const price_history: { date: string; close: number }[] = []
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i]
      if (typeof c === 'number' && Number.isFinite(c)) {
        price_history.push({
          date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
          close: c,
        })
      }
    }

    return NextResponse.json({
      data: {
        rec_label:    REC_LABELS[recKey] ?? recKey ?? 'N/A',
        strong_buy:   cur.strongBuy   ?? 0,
        buy:          cur.buy         ?? 0,
        hold:         cur.hold        ?? 0,
        sell:         cur.sell        ?? 0,
        strong_sell:  cur.strongSell  ?? 0,
        n_analysts:   fd.numberOfAnalystOpinions?.raw ?? 0,
        target_median: targetMedian,
        target_high:   targetHigh,
        target_low:    targetLow,
        current_price: currentPrice,
        upside,
        price_history,
      },
      source: 'Yahoo Finance',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=1800, s-maxage=1800' },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}
