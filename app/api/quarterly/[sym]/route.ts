/**
 * /api/quarterly/{sym} — quarterly financials with FREE deep metrics.
 *
 * Two-stage fetch, both free, no API keys:
 *
 *   1. Yahoo Finance quoteSummary modules — fast, gives the basic
 *      8-quarter income / cashflow / balance sheet timeline plus
 *      earnings surprise history.
 *
 *   2. SEC EDGAR XBRL company-facts — free, public, gives us the
 *      OFFICIALLY-FILED quarterly values for D&A, EBITDA, interest
 *      expense, NOPAT, invested capital. Lets us compute proper
 *      ROIC, EBITDA, debt/EBITDA, interest coverage instead of
 *      faking them.
 *
 * For non-US tickers (no SEC filing), we fall back to Yahoo only;
 * the deep metrics (ROIC, EBITDA, etc.) stay null and the SPA's
 * QuarterlyPanel handles that case.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'
import {
  tickerToCik, fetchFacts, lastNQuarters, ttmFromQuarters,
} from '@/lib/market/sec-edgar'

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
      incomeStatementHistoryQuarterly?:  { incomeStatementHistory?: Stmt[] }
      cashflowStatementHistoryQuarterly?:{ cashflowStatements?: Stmt[] }
      balanceSheetHistoryQuarterly?:     { balanceSheetStatements?: Stmt[] }
      earningsHistory?:                  { history?: EarningsHistoryItem[] }
    }>
  }
}

const r = (n: FinNode) => (typeof n?.raw === 'number' && Number.isFinite(n.raw) ? n.raw : null)
const bn = (n: FinNode) => { const v = r(n); return v == null ? null : v / 1e9 }
const pct = (num: number | null, den: number | null) =>
  num != null && den != null && den !== 0 ? (num / den) * 100 : null

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
    // Fire Yahoo + SEC in parallel.
    const [yahooJson, cik] = await Promise.all([
      yahooFetch<QuoteSummary>(
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}`,
        { ttl: 1800 },
      ),
      tickerToCik(sym),
    ])

    const result = yahooJson?.quoteSummary?.result?.[0]
    if (!result) return NextResponse.json({ error: 'no data' }, { status: 404 })

    const inc = result.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? []
    const cf  = result.cashflowStatementHistoryQuarterly?.cashflowStatements ?? []
    const bs  = result.balanceSheetHistoryQuarterly?.balanceSheetStatements ?? []
    const eh  = result.earningsHistory?.history ?? []

    // Yahoo returns newest first; reverse for oldest -> newest.
    const incR = [...inc].reverse()
    const cfR  = [...cf].reverse()
    const bsR  = [...bs].reverse()

    // ── Pull SEC EDGAR deep metrics if this is a US-listed ticker ──
    let dnaSeries: Record<string, number> = {}
    let intExpSeries: Record<string, number> = {}
    let ebitdaSeries: Record<string, number> = {}
    let invCapSeries: Record<string, number> = {}
    let nopatSeries: Record<string, number> = {}
    if (cik) {
      const facts = await fetchFacts(cik)
      // Common XBRL tags used by issuers for these line items.
      const dna = lastNQuarters(facts,
        'DepreciationDepletionAndAmortization', 12,
      )
      const dnaAlt = !dna.length
        ? lastNQuarters(facts, 'DepreciationAndAmortization', 12)
        : []
      for (const f of dna.length ? dna : dnaAlt) dnaSeries[f.end] = f.val

      const intExp = lastNQuarters(facts, 'InterestExpense', 12)
      for (const f of intExp) intExpSeries[f.end] = f.val

      // EBITDA = OperatingIncomeLoss + D&A
      const op = lastNQuarters(facts, 'OperatingIncomeLoss', 12)
      const opMap: Record<string, number> = {}
      for (const f of op) opMap[f.end] = f.val
      for (const end of Object.keys(opMap)) {
        const dnaVal = dnaSeries[end]
        if (typeof dnaVal === 'number') {
          ebitdaSeries[end] = opMap[end] + dnaVal
        }
      }

      // Invested Capital ≈ Total Debt + Stockholders Equity
      const debt = lastNQuarters(facts, 'LongTermDebt', 12)
      const eq   = lastNQuarters(facts, 'StockholdersEquity', 12)
      const debtMap: Record<string, number> = {}
      for (const f of debt) debtMap[f.end] = f.val
      const eqMap: Record<string, number> = {}
      for (const f of eq)   eqMap[f.end] = f.val
      for (const end of Object.keys(eqMap)) {
        const d = debtMap[end] ?? 0
        invCapSeries[end] = (eqMap[end] ?? 0) + d
      }

      // NOPAT ≈ Operating Income × (1 - effective tax rate). We use
      // the IncomeTaxExpenseBenefit / IncomeBeforeTax ratio as the
      // tax rate proxy when available, else a 21% default.
      const tax = lastNQuarters(facts, 'IncomeTaxExpenseBenefit', 12)
      const pre = lastNQuarters(facts, 'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest', 12)
      const taxMap: Record<string, number> = {}
      for (const f of tax) taxMap[f.end] = f.val
      const preMap: Record<string, number> = {}
      for (const f of pre) preMap[f.end] = f.val
      for (const end of Object.keys(opMap)) {
        const opVal = opMap[end]
        const taxVal = taxMap[end]
        const preVal = preMap[end]
        const taxRate = (taxVal != null && preVal && preVal !== 0)
          ? Math.min(0.5, Math.max(0, taxVal / preVal))
          : 0.21
        nopatSeries[end] = opVal * (1 - taxRate)
      }
    }

    // ── Assemble per-quarter arrays in Yahoo's order. ──────────────
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
      const end = I?.endDate?.fmt ?? ''
      const rev    = bn(I?.totalRevenue)
      const gp     = bn(I?.grossProfit)
      const eb     = bn(I?.ebit)
      const ni     = bn(I?.netIncome)
      const pre    = bn(I?.incomeBeforeTax)
      const cfoV   = bn(C?.totalCashFromOperatingActivities)
      const cpx    = bn(C?.capitalExpenditures)
      const fcfV   = cfoV != null && cpx != null ? cfoV + cpx : null
      const debt   = bn(B?.shortLongTermDebt) ?? bn(B?.longTermDebt)
      const cashV  = bn(B?.cash)
      const nd     = debt != null && cashV != null ? debt - cashV : null
      const eq     = bn(B?.totalStockholderEquity)

      // SEC deep values (in $) — convert to $billions to match.
      const ebitdaSec = ebitdaSeries[end] != null ? ebitdaSeries[end] / 1e9 : null
      const intExpSec = intExpSeries[end] != null ? intExpSeries[end] / 1e9 : null
      const invCapSec = invCapSeries[end] != null ? invCapSeries[end] / 1e9 : null
      const nopatSec  = nopatSeries[end]  != null ? nopatSeries[end]  / 1e9 : null

      revenue.push(rev); gross_profit.push(gp); ebit.push(eb)
      ebitda.push(ebitdaSec ?? null)
      net_income.push(ni); pretax.push(pre)
      cfo.push(cfoV); capex.push(cpx); fcf.push(fcfV)
      total_debt.push(debt); cash.push(cashV); net_debt.push(nd); equity.push(eq)
      gross_mgn.push (pct(gp, rev))
      op_mgn.push    (pct(eb, rev))
      net_mgn.push   (pct(ni, rev))
      pretax_mgn.push(pct(pre, rev))
      roic.push   (nopatSec != null && invCapSec != null && invCapSec !== 0 ? (nopatSec / invCapSec) * 100 : null)
      roe.push    (pct(ni, eq))
      de.push     (debt != null && eq != null && eq !== 0 ? debt / eq : null)
      int_cov.push(eb != null && intExpSec != null && intExpSec !== 0 ? eb / intExpSec : null)
      dEbitda.push(nd != null && ebitdaSec != null && ebitdaSec !== 0 ? nd / ebitdaSec : null)
    }

    const earnings_history = eh.map((e) => ({
      quarter:    e.quarter?.fmt ?? '',
      actual_eps: e.epsActual?.raw ?? null,
      est_eps:    e.epsEstimate?.raw ?? null,
      surprise:   e.surprisePercent?.raw ?? null,
    }))

    // Drop unused `_ttm` lints; keeping the helper around.
    void ttmFromQuarters

    return NextResponse.json({
      data: {
        source: cik
          ? 'Yahoo Finance + SEC EDGAR XBRL'
          : 'Yahoo Finance (non-US ticker — SEC EDGAR not applicable)',
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
      source: cik ? 'Yahoo + SEC EDGAR' : 'Yahoo',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=1800, s-maxage=1800' },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}
