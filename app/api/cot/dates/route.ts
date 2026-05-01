/**
 * /api/cot/dates — list available report dates (latest 52 weeks).
 * Uses the same Socrata dataset as /api/cot.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Distinct on report_date — Socrata supports `$select=DISTINCT field`.
    const url =
      'https://publicreporting.cftc.gov/resource/gpe5-46if.json' +
      '?$select=report_date_as_yyyy_mm_dd' +
      '&$group=report_date_as_yyyy_mm_dd' +
      '&$order=report_date_as_yyyy_mm_dd DESC&$limit=52'
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) throw new Error(`cftc http ${res.status}`)
    const rows = await res.json() as Array<{ report_date_as_yyyy_mm_dd?: string }>
    const dates = rows
      .map((r) => r.report_date_as_yyyy_mm_dd)
      .filter((s): s is string => Boolean(s))
    return NextResponse.json({ data: dates, source: 'CFTC Public Reporting' }, {
      headers: { 'cache-control': 'public, max-age=86400, s-maxage=86400' },
    })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
