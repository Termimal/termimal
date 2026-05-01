/**
 * /api/fundamentals/{sym} — Yahoo Finance quoteSummary mapped onto the
 * SPA's `Fundamentals` shape. Powers the ticker workspace and the
 * Fundamentals page.
 *
 * We map the ratios + margins we can derive from quoteSummary; deep
 * historical arrays (rev_hist, ebitda_hist, fcf_hist) come from the
 * Python backend's FMP integration when it's deployed. When it's
 * not, we omit those fields and the SPA renders the live ratios it
 * does have.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { yahooFetch, yahooErrorPayload } from '@/lib/market/yahoo'

interface YahooQuoteSummary {
  quoteSummary?: {
    result?: Array<{
      price?: {
        symbol?: string
        longName?: string
        shortName?: string
        currency?: string
        exchangeName?: string
        regularMarketPrice?: { raw?: number }
        marketCap?: { raw?: number }
      }
      summaryDetail?: {
        beta?:                { raw?: number }
        fiftyTwoWeekHigh?:    { raw?: number }
        fiftyTwoWeekLow?:     { raw?: number }
        averageVolume?:       { raw?: number }
        trailingPE?:          { raw?: number }
        forwardPE?:           { raw?: number }
        priceToSalesTrailing12Months?: { raw?: number }
        dividendYield?:       { raw?: number }
      }
      defaultKeyStatistics?: {
        enterpriseValue?:     { raw?: number }
        priceToBook?:         { raw?: number }
        pegRatio?:            { raw?: number }
        trailingEps?:         { raw?: number }
        enterpriseToEbitda?:  { raw?: number }
      }
      financialData?: {
        totalRevenue?:        { raw?: number }
        ebitda?:              { raw?: number }
        freeCashflow?:        { raw?: number }
        operatingCashflow?:   { raw?: number }
        totalDebt?:           { raw?: number }
        totalCash?:           { raw?: number }
        debtToEquity?:        { raw?: number }
        returnOnAssets?:      { raw?: number }
        returnOnEquity?:      { raw?: number }
        grossMargins?:        { raw?: number }
        operatingMargins?:    { raw?: number }
        profitMargins?:       { raw?: number }
        revenueGrowth?:       { raw?: number }
      }
      assetProfile?: {
        sector?:    string
        industry?:  string
      }
    }>
    error?: { description?: string } | null
  }
}

const num = (n: number | undefined | null) => (typeof n === 'number' && Number.isFinite(n) ? n : undefined)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sym: string }> },
) {
  const { sym } = await params
  if (!sym) return NextResponse.json({ error: 'missing symbol' }, { status: 400 })

  const modules = [
    'price', 'summaryDetail', 'defaultKeyStatistics',
    'financialData', 'assetProfile',
  ].join(',')
  const yahooUrl =
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${modules}`

  try {
    const json = await yahooFetch<YahooQuoteSummary>(yahooUrl, { ttl: 300 })
    const r = json?.quoteSummary?.result?.[0]
    if (!r) return NextResponse.json({ error: 'symbol not found' }, { status: 404 })

    const price = num(r.price?.regularMarketPrice?.raw)
    const mcapRaw = num(r.price?.marketCap?.raw)
    const evRaw   = num(r.defaultKeyStatistics?.enterpriseValue?.raw)
    const fcfRaw  = num(r.financialData?.freeCashflow?.raw)
    const revRaw  = num(r.financialData?.totalRevenue?.raw)
    const ebitdaRaw = num(r.financialData?.ebitda?.raw)
    const cfoRaw  = num(r.financialData?.operatingCashflow?.raw)
    const debtRaw = num(r.financialData?.totalDebt?.raw)
    const cashRaw = num(r.financialData?.totalCash?.raw)
    const netDebtRaw = (debtRaw ?? 0) - (cashRaw ?? 0)

    // Most fields are returned in $billions in the SPA. Yahoo gives
    // them in raw $; divide by 1e9 where appropriate.
    const toBn = (n: number | undefined) => n != null ? n / 1e9 : undefined
    const toPct = (n: number | undefined) => n != null ? n * 100 : undefined

    const rev = toBn(revRaw)
    const fcf = toBn(fcfRaw)
    const fcfYld = price && mcapRaw && fcfRaw
      ? (fcfRaw / mcapRaw) * 100
      : undefined

    return NextResponse.json({
      data: {
        ticker:   sym.toUpperCase(),
        name:     r.price?.longName ?? r.price?.shortName ?? sym,
        sector:   r.assetProfile?.sector   ?? '',
        industry: r.assetProfile?.industry ?? '',
        exchange: r.price?.exchangeName    ?? '',
        currency: r.price?.currency        ?? 'USD',

        price,
        mcap: toBn(mcapRaw),
        ev:   toBn(evRaw),
        beta:    num(r.summaryDetail?.beta?.raw),
        h52:     num(r.summaryDetail?.fiftyTwoWeekHigh?.raw),
        l52:     num(r.summaryDetail?.fiftyTwoWeekLow?.raw),
        avg_vol: num(r.summaryDetail?.averageVolume?.raw),
        eps:     num(r.defaultKeyStatistics?.trailingEps?.raw),
        pb:      num(r.defaultKeyStatistics?.priceToBook?.raw),
        peg:     num(r.defaultKeyStatistics?.pegRatio?.raw),
        fwd_pe:  num(r.summaryDetail?.forwardPE?.raw),
        pe:      num(r.summaryDetail?.trailingPE?.raw),
        div_yield: toPct(r.summaryDetail?.dividendYield?.raw),

        rev,
        ebitda: toBn(ebitdaRaw),
        fcf,
        cfo: toBn(cfoRaw),
        net_debt: toBn(netDebtRaw),

        dEbitda: ebitdaRaw && netDebtRaw ? netDebtRaw / ebitdaRaw : undefined,
        fcfYld,
        gMgn:   toPct(r.financialData?.grossMargins?.raw),
        opMgn:  toPct(r.financialData?.operatingMargins?.raw),
        netMgn: toPct(r.financialData?.profitMargins?.raw),
        roe:    toPct(r.financialData?.returnOnEquity?.raw),
        de:     num(r.financialData?.debtToEquity?.raw),
        evEbitda: num(r.defaultKeyStatistics?.enterpriseToEbitda?.raw),
        cagr:    toPct(r.financialData?.revenueGrowth?.raw),

        data_quality: 'MEDIUM',
        source:  'Yahoo Finance',
        updated: new Date().toISOString(),
      },
      source: 'Yahoo Finance',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=300, s-maxage=300' },
    })
  } catch (err) {
    return NextResponse.json(yahooErrorPayload(err), { status: 503 })
  }
}
