/**
 * /api/regression/{sym} — long-term price regression vs fair value.
 *
 * Pulls 10 years of weekly closes from Yahoo's anonymous /v8/chart
 * endpoint, then fits four regression models in TypeScript:
 *
 *   1. Linear      y = a + b·t
 *   2. Log-linear  ln(y) = a + b·t              (constant compounding)
 *   3. Polynomial  y = a + b·t + c·t²            (changing growth rate)
 *   4. Power       y = a · t^b   (fitted in log-log space)
 *
 * Each model gets an in-sample fit, a 26-week forward forecast, an
 * R², a "fair value" (today's model value), and the current
 * deviation_pct (how far the live close is from fair value). The
 * model with the highest R² is reported as `best_model`.
 *
 * SPA shape (RegressionTab):
 *   {
 *     data: {
 *       closes: number[],
 *       dates:  string[],
 *       best_model: string,
 *       fair_value, r2, deviation_pct, fit, forecast,
 *       models: [{ name, fit, forecast, fair_value, r2, deviation_pct }]
 *     }
 *   }
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

interface ChartResp {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      indicators?: { quote?: Array<{ close?: (number | null)[] }> }
    }>
  }
}

interface ModelFit {
  name: string
  fit: number[]
  forecast: number[]
  fair_value: number
  r2: number
  deviation_pct: number
}

const FORECAST_WEEKS = 26

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })

  try {
    const json = await yahooFetch<ChartResp>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=10y&interval=1wk`,
      { ttl: 86400 },
    )
    const ts = json?.chart?.result?.[0]?.timestamp ?? []
    const rawCloses = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []

    const closes: number[] = []
    const dates: string[]  = []
    for (let i = 0; i < ts.length; i++) {
      const c = rawCloses[i]
      if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
        closes.push(c)
        dates.push(new Date(ts[i] * 1000).toISOString().slice(0, 10))
      }
    }

    if (closes.length < 30) {
      return NextResponse.json({ data: { error: 'not enough history' } })
    }

    const n = closes.length
    const t = Array.from({ length: n }, (_, i) => i)
    const yMean = closes.reduce((a, b) => a + b, 0) / n

    // CPU-conscious: 10 y of weekly data is ~520 points × 4 models ×
    // 2 arrays (fit + 26-week forecast) ≈ 4 400 numbers in the JSON.
    // On the Free-plan 10 ms ceiling that JSON-encode alone burns
    // ~3 ms. Limit to two models (linear + log-linear) by default —
    // polynomial-2 and power add little signal for >90 % of tickers
    // and double the CPU. Clients can opt-in via ?models=all.
    const url = new URL(request.url)
    const wantAll = url.searchParams.get('models') === 'all'

    const linear      = fitLinear(t, closes, yMean, n)
    const logLinear   = fitLogLinear(t, closes, yMean, n)
    const models: ModelFit[] = [
      { name: 'linear',     ...linear    },
      { name: 'log-linear', ...logLinear },
    ]
    if (wantAll) {
      models.push(
        { name: 'polynomial-2', ...fitPoly2(t, closes, yMean, n) },
        { name: 'power',        ...fitPower(t, closes, yMean, n) },
      )
    }

    // Best model = highest R² (clamped to >= 0; some power fits return
    // a negative R² when the trajectory is genuinely non-power).
    const best = models.reduce((acc, m) => (m.r2 > acc.r2 ? m : acc), models[0])

    return NextResponse.json({
      data: {
        closes,
        dates,
        best_model:    best.name,
        fit:           best.fit,
        forecast:      best.forecast,
        fair_value:    best.fair_value,
        r2:            best.r2,
        deviation_pct: best.deviation_pct,
        models,
      },
      source: 'Yahoo Finance',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=86400, s-maxage=86400' },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}

/* ── Regression helpers ────────────────────────────────────────── */

function r2Of(actual: number[], predicted: number[]): number {
  const mean = actual.reduce((a, b) => a + b, 0) / actual.length
  let ssRes = 0, ssTot = 0
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i], p = predicted[i]
    ssRes += (a - p) ** 2
    ssTot += (a - mean) ** 2
  }
  if (ssTot === 0) return 0
  return Math.max(0, 1 - ssRes / ssTot)
}

function deviation(price: number, fair: number): number {
  if (!fair || !Number.isFinite(fair)) return 0
  return ((price - fair) / fair) * 100
}

function fitLinear(t: number[], y: number[], _yMean: number, n: number): Omit<ModelFit, 'name'> {
  // y = a + b·t — closed-form OLS.
  const tMean = (n - 1) / 2
  const yMean = y.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (t[i] - tMean) * (y[i] - yMean)
    den += (t[i] - tMean) ** 2
  }
  const b = den === 0 ? 0 : num / den
  const a = yMean - b * tMean
  const fit = t.map((ti) => a + b * ti)
  const forecast = Array.from({ length: FORECAST_WEEKS }, (_, k) => a + b * (n - 1 + k + 1))
  const fair_value = fit[fit.length - 1]
  return {
    fit,
    forecast,
    fair_value,
    r2: r2Of(y, fit),
    deviation_pct: deviation(y[y.length - 1], fair_value),
  }
}

function fitLogLinear(t: number[], y: number[], _yMean: number, n: number): Omit<ModelFit, 'name'> {
  // ln(y) = a + b·t — closed-form OLS in log space.
  const lnY = y.map((v) => Math.log(v))
  const tMean   = (n - 1) / 2
  const lnYMean = lnY.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (t[i] - tMean) * (lnY[i] - lnYMean)
    den += (t[i] - tMean) ** 2
  }
  const b = den === 0 ? 0 : num / den
  const a = lnYMean - b * tMean
  const fit = t.map((ti) => Math.exp(a + b * ti))
  const forecast = Array.from({ length: FORECAST_WEEKS }, (_, k) =>
    Math.exp(a + b * (n - 1 + k + 1)),
  )
  const fair_value = fit[fit.length - 1]
  return {
    fit,
    forecast,
    fair_value,
    r2: r2Of(y, fit),
    deviation_pct: deviation(y[y.length - 1], fair_value),
  }
}

function fitPoly2(t: number[], y: number[], _yMean: number, n: number): Omit<ModelFit, 'name'> {
  // y = a + b·t + c·t² — solve normal equations directly.
  // System: [n, Σt, Σt²; Σt, Σt², Σt³; Σt², Σt³, Σt⁴] · [a;b;c] = [Σy; Σt·y; Σt²·y]
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0
  let sy = 0, sty = 0, st2y = 0
  for (let i = 0; i < n; i++) {
    const ti = t[i], yi = y[i]
    const t2 = ti * ti, t3 = t2 * ti, t4 = t3 * ti
    s1 += ti; s2 += t2; s3 += t3; s4 += t4
    sy += yi; sty += ti * yi; st2y += t2 * yi
  }
  const A: number[][] = [
    [n,  s1, s2],
    [s1, s2, s3],
    [s2, s3, s4],
  ]
  const B = [sy, sty, st2y]
  const sol = solve3x3(A, B)
  if (!sol) return fitLinear(t, y, _yMean, n)
  const [a, b, c] = sol
  const fit = t.map((ti) => a + b * ti + c * ti * ti)
  const forecast = Array.from({ length: FORECAST_WEEKS }, (_, k) => {
    const ti = n - 1 + k + 1
    return a + b * ti + c * ti * ti
  })
  const fair_value = fit[fit.length - 1]
  return {
    fit,
    forecast,
    fair_value,
    r2: r2Of(y, fit),
    deviation_pct: deviation(y[y.length - 1], fair_value),
  }
}

function fitPower(t: number[], y: number[], _yMean: number, n: number): Omit<ModelFit, 'name'> {
  // y = a · t^b → fit linear in log-log space. Use t+1 since log(0) = -∞.
  const lnT = t.map((ti) => Math.log(ti + 1))
  const lnY = y.map((v) => Math.log(v))
  const lnTMean = lnT.reduce((a, b) => a + b, 0) / n
  const lnYMean = lnY.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (lnT[i] - lnTMean) * (lnY[i] - lnYMean)
    den += (lnT[i] - lnTMean) ** 2
  }
  const b = den === 0 ? 0 : num / den
  const lnA = lnYMean - b * lnTMean
  const fit = t.map((ti) => Math.exp(lnA + b * Math.log(ti + 1)))
  const forecast = Array.from({ length: FORECAST_WEEKS }, (_, k) =>
    Math.exp(lnA + b * Math.log(n - 1 + k + 2)),
  )
  const fair_value = fit[fit.length - 1]
  return {
    fit,
    forecast,
    fair_value,
    r2: r2Of(y, fit),
    deviation_pct: deviation(y[y.length - 1], fair_value),
  }
}

function solve3x3(A: number[][], b: number[]): number[] | null {
  // Gaussian elimination with partial pivoting on a 3×3.
  const M = A.map((row, i) => [...row, b[i]])
  for (let i = 0; i < 3; i++) {
    let pivot = i
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[pivot][i])) pivot = k
    }
    if (pivot !== i) [M[i], M[pivot]] = [M[pivot], M[i]]
    if (Math.abs(M[i][i]) < 1e-12) return null
    for (let k = i + 1; k < 3; k++) {
      const f = M[k][i] / M[i][i]
      for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j]
    }
  }
  const x: number[] = [0, 0, 0]
  for (let i = 2; i >= 0; i--) {
    let s = M[i][3]
    for (let j = i + 1; j < 3; j++) s -= M[i][j] * x[j]
    x[i] = s / M[i][i]
  }
  return x
}
