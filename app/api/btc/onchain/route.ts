/**
 * /api/btc/onchain — BTC on-chain metrics (MVRV, Z-Score, realized cap).
 * Multi-source aggregation; not feasible at the Edge without a backend.
 */
export const runtime = 'edge'
import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    error: 'onchain-backend-offline',
    detail: 'BTC on-chain analytics requires the Termimal analysis backend. Not currently deployed.',
  }, { status: 503 })
}
