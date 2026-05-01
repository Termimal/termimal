/**
 * /api/positioning/{id} — wallet-flow drilldown for a single market.
 *
 * Aggregates trades from the public Polymarket CLOB by trader. We
 * surface the top 50 wallets by notional with their direction skew;
 * scoring fields (accuracy, early-entry rate, manipulation flags) are
 * left at zero because they require resolved-market history we don't
 * persist at the Edge.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { fetchClobTrades, aggregateTraders } from '@/lib/market/polymarket-clob'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  try {
    const trades = await fetchClobTrades(id, 500)
    if (!trades.length) {
      return NextResponse.json({
        data: { id, summary: null, wallets: [], trades: [] },
        source: 'Polymarket CLOB',
      })
    }
    const wallets = aggregateTraders(trades)
    const total = wallets.reduce((acc, w) => acc + w.volume, 0)
    return NextResponse.json({
      data: {
        id,
        summary: {
          total_volume: total,
          trade_count: trades.length,
          wallets: wallets.length,
        },
        wallets,
        trades: trades.slice(0, 100),
      },
      source: 'Polymarket CLOB',
      updated: new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'public, max-age=30, s-maxage=30' },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'positioning-detail-failed',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 503 })
  }
}
