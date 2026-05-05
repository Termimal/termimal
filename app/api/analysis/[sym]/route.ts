/**
 * /api/analysis/{sym} — chart-first technical analysis snapshot.
 *
 * Pulls ~6 months of daily candles from Yahoo's anonymous /v8/chart
 * endpoint, then computes the indicators the SPA's AnalysisTab
 * consumes:
 *
 *   - chart_data: closes / highs / lows / volumes / sma20 / sma50 /
 *                 rsi (14)
 *   - trend:      bias (Bullish / Bearish / Neutral) from SMA stack
 *                 and current price position
 *   - momentum:   RSI label, MACD-ish sign (sma20 vs sma50)
 *   - levels:     recent local highs/lows as support/resistance
 *   - scenarios:  base / bull / bear targets derived from levels
 *
 * Pure TS, no upstream stats library. Designed to render in <50 ms
 * on a warm Worker isolate.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

interface ChartResp {
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
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })

  try {
    const json = await yahooFetch<ChartResp>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=6mo&interval=1d`,
      { ttl: 600 },
    )
    const r0 = json?.chart?.result?.[0]
    const q = r0?.indicators?.quote?.[0]
    if (!r0 || !q) {
      return NextResponse.json({ data: { error: 'no chart data' } })
    }

    // Drop any rows where the close is null (Yahoo holidays etc.).
    const closes: number[] = []
    const highs:  number[] = []
    const lows:   number[] = []
    const vols:   number[] = []
    const ts: number[] = []
    const tsArr = r0.timestamp ?? []
    for (let i = 0; i < tsArr.length; i++) {
      const c = q.close?.[i]
      const h = q.high?.[i]
      const l = q.low?.[i]
      const v = q.volume?.[i]
      if (typeof c !== 'number' || !Number.isFinite(c)) continue
      closes.push(c)
      highs.push(typeof h === 'number' ? h : c)
      lows.push(typeof l === 'number' ? l : c)
      vols.push(typeof v === 'number' ? v : 0)
      ts.push(tsArr[i])
    }

    const N = closes.length
    if (N < 20) {
      return NextResponse.json({ data: { error: 'insufficient history' } })
    }

    const sma20 = sma(closes, 20)
    const sma50 = sma(closes, 50)
    const rsi   = rsi14(closes)

    const last        = closes[N - 1]
    const lastSma20   = sma20[sma20.length - 1] ?? last
    const lastSma50   = sma50[sma50.length - 1] ?? last
    const lastRsi     = rsi[rsi.length - 1] ?? 50

    // ── Trend bias ───
    let bias: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral'
    if (last > lastSma20 && lastSma20 > lastSma50) bias = 'Bullish'
    else if (last < lastSma20 && lastSma20 < lastSma50) bias = 'Bearish'

    // ── Momentum ───
    const rsiLabel =
      lastRsi >= 70 ? 'Overbought' :
      lastRsi <= 30 ? 'Oversold' :
      lastRsi >= 55 ? 'Strong' :
      lastRsi <= 45 ? 'Weak' :
      'Neutral'

    // ── Levels: pivots from a sliding 5-day window ───
    const levels = pivotLevels(highs, lows, last)

    // ── Scenarios: nearest support/resistance from the last close ───
    const above = levels.filter((l) => l.price > last).sort((a, b) => a.price - b.price)
    const below = levels.filter((l) => l.price < last).sort((a, b) => b.price - a.price)
    const r1 = above[0]?.price ?? last * 1.05
    const r2 = above[1]?.price ?? last * 1.10
    const s1 = below[0]?.price ?? last * 0.95
    const s2 = below[1]?.price ?? last * 0.90
    const scenarios = {
      base: { target: (r1 + s1) / 2, prob: 'mid' },
      bull: { target: r2, prob: bias === 'Bullish' ? 'higher' : 'mid' },
      bear: { target: s2, prob: bias === 'Bearish' ? 'higher' : 'mid' },
    }

    return NextResponse.json({
      data: {
        chart_data: { closes, highs, lows, volumes: vols, sma20, sma50, rsi, timestamps: ts },
        trend: {
          bias,
          last,
          sma20: lastSma20,
          sma50: lastSma50,
        },
        momentum: {
          rsi: lastRsi,
          rsi_label: rsiLabel,
          macd_sign: lastSma20 > lastSma50 ? 'positive' : 'negative',
        },
        levels,
        scenarios,
      },
      source: 'Yahoo Finance',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=600, s-maxage=600' },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}

/* ── Indicator helpers ────────────────────────────────────────── */

function sma(values: number[], period: number): number[] {
  const out: number[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    out.push(i + 1 >= period ? sum / period : Number.NaN)
  }
  // Backfill leading NaN with the first valid value so chart paths render.
  let firstValid = out.findIndex((v) => Number.isFinite(v))
  if (firstValid < 0) firstValid = 0
  for (let i = 0; i < firstValid; i++) out[i] = out[firstValid] ?? values[i]
  return out
}

function rsi14(closes: number[], period = 14): number[] {
  const out: number[] = []
  if (closes.length === 0) return out
  let gain = 0, loss = 0
  for (let i = 1; i <= period && i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) gain += d; else loss -= d
  }
  let avgGain = gain / period
  let avgLoss = loss / period
  for (let i = 0; i <= period && i < closes.length; i++) out.push(50)
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    const g = d > 0 ? d : 0
    const l = d < 0 ? -d : 0
    avgGain = (avgGain * (period - 1) + g) / period
    avgLoss = (avgLoss * (period - 1) + l) / period
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss
    out.push(100 - 100 / (1 + rs))
  }
  return out
}

interface Level { price: number; touches: number; type: 'support' | 'resistance' }

function pivotLevels(highs: number[], lows: number[], last: number): Level[] {
  // Find local maxima/minima with a 5-day window. Cluster nearby pivots
  // (within 1 % of price) to avoid duplicates.
  const window = 5
  const raw: { price: number; type: 'support' | 'resistance' }[] = []
  for (let i = window; i < highs.length - window; i++) {
    let isHigh = true, isLow = true
    for (let k = 1; k <= window; k++) {
      if (highs[i] <= highs[i - k] || highs[i] <= highs[i + k]) isHigh = false
      if (lows[i]  >= lows[i - k]  || lows[i]  >= lows[i + k])  isLow = false
    }
    if (isHigh) raw.push({ price: highs[i], type: 'resistance' })
    if (isLow)  raw.push({ price: lows[i],  type: 'support' })
  }
  // Cluster into bands (~1 % wide).
  const bands: Level[] = []
  raw.sort((a, b) => a.price - b.price)
  for (const p of raw) {
    const last = bands[bands.length - 1]
    if (last && Math.abs(p.price - last.price) / last.price < 0.01) {
      last.touches += 1
      // Re-classify whether the cluster sits above or below the live price.
      last.type = p.price > 0 && last.price > 0 && p.price >= last.price * 0.999 ? p.type : last.type
    } else {
      bands.push({ price: p.price, touches: 1, type: p.type })
    }
  }
  // Re-classify each band against the *current* price so the SPA's
  // support/resistance colouring stays consistent.
  for (const b of bands) b.type = b.price > last ? 'resistance' : 'support'
  // Keep the strongest 8 (most touches), nearest first.
  return bands
    .sort((a, b) => b.touches - a.touches || Math.abs(a.price - last) - Math.abs(b.price - last))
    .slice(0, 8)
    .sort((a, b) => a.price - b.price)
}
