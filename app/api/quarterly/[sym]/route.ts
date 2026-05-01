/**
 * /api/quarterly/{sym} — quarterly financials.
 *
 * The full Termimal experience here uses Financial Modeling Prep
 * (paid API) on the Python backend to surface 8 quarters of revenue,
 * EBITDA, FCF, margins, ROIC, ROE, etc. We don't have FMP credentials
 * on the Edge, so we degrade gracefully: respond 503 with a clear
 * "needs FMP backend" message. The SPA's QuarterlyPanel already
 * handles the null-data path.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    error: 'quarterly-backend-offline',
    detail:
      'Quarterly financials require the Termimal FMP-backed analysis backend, ' +
      'which is not currently deployed. Live ratios from /api/fundamentals/{sym} ' +
      'are served independently and continue to work.',
  }, { status: 503 })
}
