/**
 * /api/macro — full macro snapshot from FREE sources, no FRED key.
 *
 * Sources:
 *   - DBnomics  https://api.db.nomics.world  (proxies ALL FRED data,
 *               no key required, JSON, free).
 *   - Yahoo     for live VIX, DXY, WTI, Brent (FRED has these too but
 *               with end-of-day delay; Yahoo gives intraday quotes).
 *
 * What this gives the SPA, all real, all live:
 *   - Treasury yields: 10Y, 5Y (proxy for 2Y), 3M
 *   - Yield curve spread (10Y - 2Y)
 *   - VIX
 *   - DXY, WTI, Brent
 *   - M2 money supply (FRED M2SL via DBnomics)
 *   - 10Y breakeven inflation (FRED T10YIE)
 *   - Recession probability (FRED RECPROUSM156N)
 *   - Fed balance sheet (FRED WALCL)
 *   - Historical 52-week arrays for the spark cards
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooFetchAuthed, yahooErrorPayload } from '@/lib/market/yahoo'
import { cachedJson } from '@/lib/edge-cache'
import { withTiming } from '@/lib/observability'

// ── Yahoo: live intraday for indices/futures ────────────────────────
interface YahooQuote {
  quoteResponse?: {
    result?: Array<{ symbol: string; regularMarketPrice?: number }>
  }
}
const YAHOO_SYMBOLS = ['^TNX', '^FVX', '^IRX', '^VIX', 'DX-Y.NYB', 'CL=F', 'BZ=F'] as const

// ── DBnomics helpers ────────────────────────────────────────────────
// DBnomics URL pattern:
//   https://api.db.nomics.world/v22/series?series_ids=FRED/M2SL&observations=1
// returns an array of observations: [[date, value], ...] with newest last.
//
// We hit it once per series and keep latest + last 52 weekly observations
// for the spark history cards.
const FRED_SERIES = {
  M2SL:           'FRED/M2SL',           // M2 money supply (monthly)
  T10YIE:         'FRED/T10YIE',         // 10Y breakeven inflation (daily)
  RECPROUSM156N:  'FRED/RECPROUSM156N',  // recession probability (monthly)
  WALCL:          'FRED/WALCL',          // Fed assets - total (weekly)
  HYG:            'FRED/BAMLH0A0HYM2',   // ICE BofA HY OAS (daily, free)
} as const

interface DBnomicsResp {
  series?: {
    docs?: Array<{
      period?: string[]
      value?: (number | null | string)[]
    }>
  }
}

async function fetchDB(seriesId: string): Promise<{ latest: number | null; history: number[]; periods: string[] }> {
  try {
    const url = `https://api.db.nomics.world/v22/series?series_ids=${encodeURIComponent(seriesId)}&observations=1`
    const r = await fetch(url, { next: { revalidate: 21600 } })
    if (!r.ok) return { latest: null, history: [], periods: [] }
    const j = await r.json() as DBnomicsResp
    const doc = j?.series?.docs?.[0]
    const periods = doc?.period ?? []
    const valuesRaw = doc?.value ?? []
    const values: number[] = []
    const periodsClean: string[] = []
    for (let i = 0; i < valuesRaw.length; i++) {
      const v = valuesRaw[i]
      if (v == null) continue
      const n = typeof v === 'string' ? Number(v) : v
      if (!Number.isFinite(n)) continue
      values.push(n)
      periodsClean.push(periods[i] ?? '')
    }
    if (!values.length) return { latest: null, history: [], periods: [] }
    const last = values[values.length - 1]
    // 52 most recent observations for the spark.
    return {
      latest: last,
      history: values.slice(-52),
      periods: periodsClean.slice(-52),
    }
  } catch {
    return { latest: null, history: [], periods: [] }
  }
}

// Year-over-year % growth from a monthly series (12-period diff).
function yoyPct(history: number[]): number | null {
  if (history.length < 13) return null
  const a = history[history.length - 13]
  const b = history[history.length - 1]
  if (!Number.isFinite(a) || a === 0) return null
  return ((b - a) / a) * 100
}

// ── Yahoo histories for the spark cards (1y daily) ───────────────────
async function fetchYahooSpark(sym: string): Promise<number[]> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1wk`,
      { next: { revalidate: 3600 } },
    )
    if (!r.ok) return []
    const j = await r.json() as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> } }
    const closes = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    return closes.filter((c): c is number => typeof c === 'number').slice(-52)
  } catch { return [] }
}

export async function GET(request: Request) {
  // Macro is expensive to compute (10 parallel upstream fetches +
  // YoY math + 52w window slicing). Cache aggressively at the colo;
  // FRED data updates monthly/weekly so 5 min is conservative.
  return cachedJson(request, 300, () => withTiming('/api/macro', () => handle()))
}

async function handle(): Promise<Response> {
  // Run everything in parallel — Cloudflare Edge will fan out.
  const [yahooQuotes, m2, t10yie, rec, walcl, hyg, vixHist, dxyHist, wtiHist, brentHist, spyHist] =
    await Promise.all([
      yahooFetchAuthed<YahooQuote>(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(YAHOO_SYMBOLS.join(','))}`,
        { ttl: 60 },
      ).catch(() => null),
      fetchDB(FRED_SERIES.M2SL),
      fetchDB(FRED_SERIES.T10YIE),
      fetchDB(FRED_SERIES.RECPROUSM156N),
      fetchDB(FRED_SERIES.WALCL),
      fetchDB(FRED_SERIES.HYG),
      fetchYahooSpark('^VIX'),
      fetchYahooSpark('DX-Y.NYB'),
      fetchYahooSpark('CL=F'),
      fetchYahooSpark('BZ=F'),
      fetchYahooSpark('SPY'),
    ])

  const yahooMap: Record<string, number> = {}
  for (const q of yahooQuotes?.quoteResponse?.result ?? []) {
    if (typeof q.regularMarketPrice === 'number') yahooMap[q.symbol] = q.regularMarketPrice
  }

  const us10y = yahooMap['^TNX']
  // Yahoo doesn't ship a clean 2Y; use 5Y as a graceful proxy. The SPA
  // already labels this honestly in the macro tooltip.
  const us2y  = yahooMap['^FVX']
  const us3m  = yahooMap['^IRX']

  return NextResponse.json({
    data: {
      // Live rates
      us10y, us2y, us3m,
      spread: us10y != null && us2y != null ? us10y - us2y : undefined,
      vix:   yahooMap['^VIX'],
      dxy:   yahooMap['DX-Y.NYB'],
      wti:   yahooMap['CL=F'],
      brent: yahooMap['BZ=F'],

      // FRED via DBnomics — REAL DATA, NO KEY
      m2_growth:      yoyPct(m2.history),
      inflation_be:   t10yie.latest ?? undefined,
      recession_prob: rec.latest ?? undefined,
      fed_balance:    walcl.latest != null ? walcl.latest / 1000 : undefined, // $M to $T
      oas:            hyg.latest ?? undefined,

      // Histories (52w arrays)
      vix_h:        vixHist,
      dxy_h:        dxyHist,
      wti_h:        wtiHist,
      brent_h:      brentHist,
      spy_h:        spyHist,
      fed_bal_h:    walcl.history.map((v) => v / 1000),  // → trillions
      inflation_h:  t10yie.history,
      oas_h:        hyg.history,

      source: 'Yahoo Finance + DBnomics (FRED, ECB, BIS — free, no key)',
      updated: new Date().toISOString(),
      // SPA flag: this lights up FRED-only widgets. true now because
      // DBnomics provides FRED data without a key.
      fred_available: true,
    },
    source: 'Yahoo + DBnomics',
    updated: new Date().toISOString(),
  }, {
    headers: { 'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600' },
  })
}
