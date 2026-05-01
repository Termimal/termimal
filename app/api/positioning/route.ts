/**
 * /api/positioning — derived positioning intelligence (cluster
 * detection, leveraged-money flips, volume anomalies). Backend-only.
 */
export const runtime = 'edge'
import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    error: 'positioning-backend-offline',
    detail: 'Positioning intelligence requires the Termimal analysis backend. Not currently deployed.',
  }, { status: 503 })
}
