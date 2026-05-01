/**
 * /api/cot — CFTC Commitments of Traders, latest report.
 *
 * Source: the CFTC Public Reporting Environment Socrata API. Public,
 * no key required, returns JSON. We pull the most recent week of:
 *   - Traders in Financial Futures (TFF):  dataset gpe5-46if
 *   - Disaggregated Futures Only:          dataset 72hh-3qaa
 *
 * Mapped onto the SPA's `COTEntry` shape so the existing COT page +
 * widgets render without modification. Net positions are computed
 * client-side here so we don't ship raw long/short to render.
 *
 * 6-hour cache — CFTC publishes weekly (Friday after market close).
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'

type SocrataRow = Record<string, string | undefined>

const TFF_URL  = 'https://publicreporting.cftc.gov/resource/gpe5-46if.json'
const DAGG_URL = 'https://publicreporting.cftc.gov/resource/72hh-3qaa.json'

const num = (s: string | undefined): number => {
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

interface COTEntry {
  n: string
  report_type: 'tff' | 'disagg'
  am: number; amc: number; lm: number; lmc: number
  am_long?: number; am_short?: number
  lm_long?: number; lm_short?: number
  dl_long?: number; dl_short?: number; dl_net?: number
  or_long?: number; or_short?: number; or_net?: number
  oi?: number
  signal: string
  date?: string
  source: string
}

function deriveSignal(net: number, change: number): string {
  // Tiny derivation so the SPA chip lights up instead of staying neutral.
  if (Math.abs(change) < 1000) return 'NEUTRAL'
  if (change > 0) return net > 0 ? 'BULL ADD' : 'COVERING'
  return net > 0 ? 'TRIM' : 'BEAR ADD'
}

async function fetchLatest(url: string, contracts: string[]): Promise<SocrataRow[]> {
  // Latest 2 weekly reports per contract so we can compute WoW change.
  const where = encodeURIComponent(
    contracts.map((c) => `contract_market_name='${c.replace(/'/g, "''")}'`).join(' OR '),
  )
  const u = `${url}?$where=${where}&$order=report_date_as_yyyy_mm_dd DESC&$limit=600`
  const res = await fetch(u, { next: { revalidate: 21600 } })
  if (!res.ok) throw new Error(`cftc http ${res.status}`)
  return res.json() as Promise<SocrataRow[]>
}

const TFF_CONTRACTS = [
  'E-MINI S&P 500', 'NASDAQ-100 Consolidated', 'DJIA Consolidated',
  'UST 10Y NOTE', 'UST BOND', 'UST 2Y NOTE',
  'EURO FX', 'JAPANESE YEN', 'BRITISH POUND', 'AUSTRALIAN DOLLAR', 'SWISS FRANC',
  'BITCOIN - CME', 'MICRO BITCOIN',
]
const DAGG_CONTRACTS = [
  'GOLD - COMMODITY EXCHANGE INC.',
  'SILVER - COMMODITY EXCHANGE INC.',
  'COPPER- #1 - COMMODITY EXCHANGE INC.',
  'WTI-PHYSICAL - NEW YORK MERCANTILE EXCHANGE',
  'NATURAL GAS - NEW YORK MERCANTILE EXCHANGE',
  'CORN - CHICAGO BOARD OF TRADE',
  'WHEAT-SRW - CHICAGO BOARD OF TRADE',
  'SOYBEANS - CHICAGO BOARD OF TRADE',
]

/** Convert two consecutive weekly TFF rows for a contract into one COTEntry. */
function tffEntry(latest: SocrataRow, prior: SocrataRow | null): COTEntry {
  const am_long  = num(latest.asset_mgr_positions_long_all)
  const am_short = num(latest.asset_mgr_positions_short_all)
  const lm_long  = num(latest.lev_money_positions_long)
  const lm_short = num(latest.lev_money_positions_short)
  const am  = am_long - am_short
  const lm  = lm_long - lm_short
  const amc = am - (
    (num(prior?.asset_mgr_positions_long_all)) -
    (num(prior?.asset_mgr_positions_short_all))
  )
  const lmc = lm - (
    (num(prior?.lev_money_positions_long)) -
    (num(prior?.lev_money_positions_short))
  )
  return {
    n: latest.contract_market_name ?? '?',
    report_type: 'tff',
    am, amc, lm, lmc,
    am_long, am_short, lm_long, lm_short,
    oi: num(latest.open_interest_all),
    signal: deriveSignal(am, amc),
    date: latest.report_date_as_yyyy_mm_dd,
    source: 'CFTC Public Reporting',
  }
}

function daggEntry(latest: SocrataRow, prior: SocrataRow | null): COTEntry {
  // Disaggregated COT — Producers, Swap Dealers, Managed Money, Other Reportables.
  const mm_long  = num(latest.m_money_positions_long_all)
  const mm_short = num(latest.m_money_positions_short_all)
  const dl_long  = num(latest.prod_merc_positions_long)
  const dl_short = num(latest.prod_merc_positions_short)
  const or_long  = num(latest.other_rept_positions_long)
  const or_short = num(latest.other_rept_positions_short)
  const am  = mm_long - mm_short          // We surface Managed Money as the "asset manager" proxy in disagg
  const lm  = mm_long - mm_short          // and reuse same value for the second slot until the SPA splits them
  const amc = am - (
    (num(prior?.m_money_positions_long_all)) -
    (num(prior?.m_money_positions_short_all))
  )
  return {
    n: latest.market_and_exchange_names ?? latest.contract_market_name ?? '?',
    report_type: 'disagg',
    am, amc, lm, lmc: amc,
    dl_long, dl_short, dl_net: dl_long - dl_short,
    or_long, or_short, or_net: or_long - or_short,
    oi: num(latest.open_interest_all),
    signal: deriveSignal(am, amc),
    date: latest.report_date_as_yyyy_mm_dd,
    source: 'CFTC Public Reporting',
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const wantedContract = url.searchParams.get('contract')

  try {
    const [tff, dagg] = await Promise.all([
      fetchLatest(TFF_URL,  TFF_CONTRACTS).catch(() => [] as SocrataRow[]),
      fetchLatest(DAGG_URL, DAGG_CONTRACTS).catch(() => [] as SocrataRow[]),
    ])

    // Group by contract; keep only the two most recent reports per contract.
    function buildEntries(rows: SocrataRow[], maker: typeof tffEntry): COTEntry[] {
      const byContract = new Map<string, SocrataRow[]>()
      for (const r of rows) {
        const k = r.contract_market_name ?? r.market_and_exchange_names ?? '?'
        const arr = byContract.get(k) ?? []
        arr.push(r)
        byContract.set(k, arr)
      }
      const entries: COTEntry[] = []
      byContract.forEach((arr) => {
        if (!arr.length) return
        // already sorted DESC from the query
        entries.push(maker(arr[0], arr[1] ?? null))
      })
      return entries
    }

    const all = [...buildEntries(tff, tffEntry), ...buildEntries(dagg, daggEntry)]
    const data = wantedContract
      ? all.filter((e) => e.n.toLowerCase().includes(wantedContract.toLowerCase()))
      : all

    return NextResponse.json({
      data,
      source: 'CFTC Public Reporting',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=21600, s-maxage=21600' },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'cot-upstream-failed',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 503 })
  }
}
