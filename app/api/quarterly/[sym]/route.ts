/**
 * /api/quarterly/{sym} — quarterly financials, Yahoo-backed.
 *
 * The full Termimal experience uses FMP (paid) on the Python backend
 * to surface 8 quarters of revenue/EBITDA/FCF/margins/ROIC/ROE/etc.
 * Yahoo's quoteSummary modules give us 4 quarters for free, which
 * still lights up the SPA's QuarterlyPanel — just less history.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

type FinNode = { fmt?: string; raw?: number } | undefined
type Stmt = {
  endDate?: { fmt?: string }
  totalRevenue?: FinNode
  grossProfit?: FinNode
  ebit?: FinNode
  netIncome?: FinNode
  incomeBeforeTax?: FinNode
  totalCashFromOperatingActivities?: FinNode
  capitalExpenditures?: FinNode
  totalLiab?: FinNode
  totalCurrentAssets?: FinNode
  cash?: FinNode
  totalStockholderEquity?: FinNode
  shortLongTermDebt?: FinNode
  longTermDebt?: FinNode
}
type EarningsHistoryItem = {
  quarter?: { fmt?: string }
  epsActual?: { raw?: number }
  epsEstimate?: { raw?: number }
  surprisePercent?: { raw?: number }
}
interface QuoteSummary {
  quoteSummary?: {
    result?: Array<{
      incomeStatementHistoryQuarterly?: { incomeStatementHistory?: Stmt[] }
      cashflowStatementHistoryQuarterly?: { cashflowStatements?: Stmt[] }
      balanceSheetHistoryQuarterly?: { balanceSheetStatements?: Stmt[] }
      earningsHistory?: { history?: EarningsHistoryItem[] }
    }>
  }
}

const r = (n: FinNode) => (typeof n?.raw === 'number' && Number.isFinite(n.raw) ? n.raw : null)
const bn = (n: FinNode) => {
  const v = r(n)
  return v == null ? null : v / 1e9
}
const pct = (numerator: number | null, denominator: number | null) =>
  numerator != null && denominator != null && denominator !== 0
    ? (numerator / denominator) * 100
    : null

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })

  const modules = [
    'incomeStatementHistoryQuarterly',
    'cashflowStatementHistoryQuarterly',
    'balanceSheetHistoryQuarterly',
    'earningsHistory',
  ].join(',')

  try {
    const json = await yahooFetch<QuoteSummary>(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}`,
      { ttl: 1800 },
    )
    const result = json?.quoteSummary?.result?.[0]
    if (!result) return NextResponse.json({ error: 'no data' }, { status: 404 })

    const inc = result.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? []
    const cf  = result.cashflowStatementHistoryQuarterly?.cashflowStatements ?? []
    const bs  = result.balanceSheetHistoryQuarterly?.balanceSheetStatements ?? []
    const eh  = result.earningsHistory?.history ?? []

    // Yahoo returns newest first; reverse for oldest -> newest.
    const incR = [...inc].reverse()
    const cfR  = [...cf].reverse()
    const bsR  = [...bs].reverse()

    const quarters = incR.map((q) => q.endDate?.fmt ?? '')

    const revenue:      (number|null)[] = []
    const gross_profit: (number|null)[] = []
    const ebit:         (number|null)[] = []
    const ebitda:       (number|null)[] = []
    const net_income:   (number|null)[] = []
    const pretax:       (number|null)[] = []
    const cfo:          (number|null)[] = []
    const capex:        (number|null)[] = []
    const fcf:          (number|null)[] = []
    const total_debt:   (number|null)[] = []
    const cash:         (number|null)[] = []
    const net_debt:     (number|null)[] = []
    const equity:       (number|null)[] = []
    const gross_mgn:    (number|null)[] = []
    const op_mgn:       (number|null)[] = []
    const net_mgn:      (number|null)[] = []
    const pretax_mgn:   (number|null)[] = []
    const roic:         (number|null)[] = []
    const roe:          (number|null)[] = []
    const de:           (number|null)[] = []
    const int_cov:      (number|null)[] = []
    const dEbitda:      (number|null)[] = []

    for (let i = 0; i < incR.length; i++) {
      const I = incR[i]
      const C = cfR[i]
      const B = bsR[i]
      const rev    = bn(I?.totalRevenue)
      const gp     = bn(I?.grossProfit)
      const eb     = bn(I?.ebit)
      const ni     = bn(I?.netIncome)
      const pre    = bn(I?.incomeBeforeTax)
      const cfoV   = bn(C?.totalCashFromOperatingActivities)
      const cpx    = bn(C?.capitalExpenditures)
      const fcfV   = cfoV != null && cpx != null ? cfoV + cpx : null  // capex is negative on Yahoo
      const debt   = bn(B?.shortLongTermDebt) ?? bn(B?.longTermDebt)
      const cashV  = bn(B?.cash)
      const nd     = debt != null && cashV != null ? debt - cashV : null
      const eq     = bn(B?.totalStockholderEquity)

      revenue.push(rev); gross_profit.push(gp); ebit.push(eb); ebitda.push(null /* not in basic */)
      net_income.push(ni); pretax.push(pre)
      cfo.push(cfoV); capex.push(cpx); fcf.push(fcfV)
      total_debt.push(debt); cash.push(cashV); net_debt.push(nd); equity.push(eq)
      gross_mgn.push (pct(gp, rev))
      op_mgn.push    (pct(eb, rev))
      net_mgn.push   (pct(ni, rev))
      pretax_mgn.push(pct(pre, rev))
      roic.push(null)         // Needs tax info, skip on free Yahoo
      roe.push (pct(ni, eq))
      de.push  (debt != null && eq != null && eq !== 0 ? debt / eq : null)
      int_cov.push(null)      // Needs interest expense
      dEbitda.push(null)
    }

    const earnings_history = eh.map((e) => ({
      quarter:    e.quarter?.fmt ?? '',
      actual_eps: e.epsActual?.raw ?? null,
      est_eps:    e.epsEstimate?.raw ?? null,
      surprise:   e.surprisePercent?.raw ?? null,
    }))

    return NextResponse.json({
      data: {
        source: 'Yahoo Finance',
        ticker: sym.toUpperCase(),
        quarters,
        updated: new Date().toISOString(),
        revenue, gross_profit, ebit, ebitda, net_income, pretax,
        cfo, capex, fcf,
        total_debt, cash, net_debt, equity,
        gross_mgn, op_mgn, net_mgn, pretax_mgn,
        roic, roe, de, int_cov, dEbitda,
        earnings_history,
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
