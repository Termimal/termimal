/**
 * /api/cot — CFTC Commitments of Traders snapshot.
 *
 * Parsing the CFTC weekly TFF + disaggregated reports requires
 * downloading + parsing a large weekly archive (~50 MB raw, narrowed
 * to the contracts we track). The Python backend handles this with
 * scheduled refresh + a derived signal layer; replicating it on the
 * Edge would mean re-implementing that pipeline in TS.
 *
 * Until the Python backend is deployed, we return 503 with a clear
 * message so the COT page renders its existing "data unavailable"
 * empty state instead of dashes-everywhere.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    error: 'cot-backend-offline',
    detail:
      'CFTC Commitments of Traders data requires the Termimal analysis backend ' +
      'for weekly download + parse + signal derivation. Not currently deployed.',
  }, { status: 503 })
}
