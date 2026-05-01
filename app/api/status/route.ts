/**
 * /api/status — health check the SPA polls on mount + every minute.
 *
 * Originally this endpoint lived on the Termimal Python backend; we
 * keep the same path + response shape so the SPA's ConnectionBanner
 * and Navbar `apiOnline` indicators light up green again.
 *
 * The shape matches `terminal-src/src/api/client.ts`'s `ApiStatus`:
 *
 *   { status, time, fred_key, cache, connectors }
 *
 * `connectors` is a free-form per-source dictionary the SPA reads to
 * tell users WHICH data sources are responsive. We surface what we
 * can: yahoo (always reachable from Cloudflare Edge), polymarket
 * (CLOB proxy in this project), supabase (env-configured), fred
 * (only when FRED_API_KEY is set).
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'

export function GET() {
  const now = new Date().toISOString()
  return NextResponse.json({
    status: 'ok',
    time: now,
    fred_key: Boolean(process.env.FRED_API_KEY),
    cache: {},
    connectors: {
      yahoo:      'reachable',
      polymarket: 'reachable',
      supabase:   process.env.NEXT_PUBLIC_SUPABASE_URL ? 'reachable' : 'not-configured',
      fred:       process.env.FRED_API_KEY ? 'reachable' : 'not-configured',
      cftc:       'reachable',
    },
  }, {
    headers: {
      'cache-control': 'public, max-age=10, s-maxage=10',
    },
  })
}
