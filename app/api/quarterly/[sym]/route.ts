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
import { yahooFetch, yahooFetchAuthed, yahooErrorPayload } from '@/lib/market/yahoo'
import { cachedJson } from '@/lib/edge-cache'
import { withTiming } from '@/lib/observability'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit-edge'

// SEC EDGAR helpers are dynamically imported on first US-ticker hit
// so non-US tickers (which never use them) don't pay the bundle cost.
type SecModule = typeof import('@/lib/market/sec-edgar')
let _sec: SecModule | null = null
async function loadSec(): Promise<SecModule> {
  if (_sec) return _sec
  _sec = await import('@/lib/market/sec-edgar')
  return _sec
}

// XBRL tags we actually consume. Listing them up-front lets us
// fan-out one parallel request per tag (each ~50 KB) instead of
// pulling the full company-facts blob (1-5 MB).
const SEC_TAGS = [
  'DepreciationDepletionAndAmortization',
  'DepreciationAndAmortization',           // alt for some issuers
  'OperatingIncomeLoss',
  'InterestExpense',
  'LongTermDebt',
  'StockholdersEquity',
  'IncomeTaxExpenseBenefit',
  'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
] as const

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
  request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })
  // Per-IP cap on quarterly: SEC EDGAR fetches a 1-5 MB JSON per
  // ticker. Without a cap a hot loop could chew through CPU.
  const rl = checkRateLimit(request, '/api/quarterly', { max: 30, windowSec: 60 })
  const limited = rateLimitResponse(rl)
  if (limited) return limited
  return cachedJson(request, 1800, () =>
    withTiming(`/api/quarterly/${sym}`, () => handle(sym)),
  )
}

async function handle(sym: string): Promise<Response> {

  const modules = [
    'incomeStatementHistoryQuarterly',
    'cashflowStatementHistoryQuarterly',
    'balanceSheetHistoryQuarterly',
    'earningsHistory',
  ].join(',')

  try {
    // Fire Yahoo + SEC in parallel.
    const sec = await loadSec()
    const [yahooJson, cik] = await Promise.all([
      yahooFetchAuthed<QuoteSummary>(
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}`,
        { ttl: 1800 },
      ),
      sec.tickerToCik(sym),
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
      // Eight parallel small JSON requests instead of one huge one.
      // Total upstream payload ~350 KB, JSON.parse cost ~3 ms vs
      // ~20 ms for companyfacts.
      const facts = await sec.fetchManyConcepts(cik, [...SEC_TAGS])

      // Filter each tag's series to quarterly facts only.
      const onlyQ = (rows: typeof facts[string]): typeof facts[string] =>
        rows.filter((f) => f.fp && /^Q\d/.test(f.fp)).slice(-12)

      const dnaRows  = onlyQ(facts['DepreciationDepletionAndAmortization'] ?? [])
      const dnaAlt   = dnaRows.length === 0
        ? onlyQ(facts['DepreciationAndAmortization'] ?? [])
        : []
      for (const f of dnaRows.length ? dnaRows : dnaAlt) dnaSeries[f.end] = f.val

      for (const f of onlyQ(facts['InterestExpense'] ?? [])) intExpSeries[f.end] = f.val

      // EBITDA = OperatingIncomeLoss + D&A
      const opRows = onlyQ(facts['OperatingIncomeLoss'] ?? [])
      const opMap: Record<string, number> = {}
      for (const f of opRows) opMap[f.end] = f.val
      for (const end of Object.keys(opMap)) {
        const dnaVal = dnaSeries[end]
        if (typeof dnaVal === 'number') ebitdaSeries[end] = opMap[end] + dnaVal
      }

      // Invested Capital ≈ Long-Term Debt + Stockholders Equity
      const debtMap: Record<string, number> = {}
      for (const f of onlyQ(facts['LongTermDebt'] ?? [])) debtMap[f.end] = f.val
      const eqMap: Record<string, number> = {}
      for (const f of onlyQ(facts['StockholdersEquity'] ?? [])) eqMap[f.end] = f.val
      for (const end of Object.keys(eqMap)) {
        const d = debtMap[end] ?? 0
        invCapSeries[end] = (eqMap[end] ?? 0) + d
      }

      // NOPAT ≈ Operating Income × (1 - effective tax rate)
      const taxMap: Record<string, number> = {}
      for (const f of onlyQ(facts['IncomeTaxExpenseBenefit'] ?? [])) taxMap[f.end] = f.val
      const preMap: Record<string, number> = {}
      for (const f of onlyQ(facts['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest'] ?? [])) {
        preMap[f.end] = f.val
      }
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
