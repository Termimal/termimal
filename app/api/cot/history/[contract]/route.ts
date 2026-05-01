/**
 * /api/cot/history/{contract}?weeks=52 — historical net positioning
 * for a single contract. Used by the COT page sparkline cards.
 *
 * Returns an array sorted oldest-to-newest with { date, am, lm, oi }.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'

type Row = Record<string, string | undefined>
const num = (s: string | undefined) => {
  const n = Number(s); return Number.isFinite(n) ? n : 0
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contract: string }> },
) {
  const { contract } = await params
  if (!contract) return NextResponse.json({ data: [] })
  const url = new URL(request.url)
  const weeks = Math.min(208, Math.max(4, Number(url.searchParams.get('weeks')) || 52))

  // Try TFF first (S&P, NDX, FX, Treasuries, BTC), fall back to disagg.
  async function fetchFrom(dataset: string): Promise<Row[]> {
    const u =
      `https://publicreporting.cftc.gov/resource/${dataset}.json` +
      `?$where=contract_market_name='${contract.replace(/'/g, "''")}' OR ` +
      `market_and_exchange_names like '%${contract.replace(/'/g, "''")}%'` +
      `&$order=report_date_as_yyyy_mm_dd DESC&$limit=${weeks}`
    const res = await fetch(u, { next: { revalidate: 21600 } })
    if (!res.ok) return []
    return res.json() as Promise<Row[]>
  }

  try {
    let rows = await fetchFrom('gpe5-46if')
    let kind: 'tff' | 'disagg' = 'tff'
    if (!rows.length) {
      rows = await fetchFrom('72hh-3qaa')
      kind = 'disagg'
    }
    // Sort oldest -> newest for charts.
    rows.reverse()
    const data = rows.map((r) => {
      if (kind === 'tff') {
        const am = num(r.asset_mgr_positions_long_all) - num(r.asset_mgr_positions_short_all)
        const lm = num(r.lev_money_positions_long) - num(r.lev_money_positions_short)
        return {
          date: r.report_date_as_yyyy_mm_dd,
          am, lm,
          oi: num(r.open_interest_all),
        }
      }
      const mm = num(r.m_money_positions_long_all) - num(r.m_money_positions_short_all)
      return {
        date: r.report_date_as_yyyy_mm_dd,
        am: mm, lm: mm,
        oi: num(r.open_interest_all),
      }
    })
    return NextResponse.json({
      data,
      source: 'CFTC Public Reporting',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=21600, s-maxage=21600' },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'cot-history-failed',
      detail: err instanceof Error ? err.message : String(err),
      data: [],
    }, { status: 503 })
  }
}
