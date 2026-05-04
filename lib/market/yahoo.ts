/**
 * Tiny Yahoo Finance fetch helper, shared by every market-data API
 * route in this project. Yahoo's public endpoints (query1/query2)
 * have been the de-facto standard for retail market data for years
 * (yfinance, the Python library, talks to the same hosts).
 *
 * The terminal SPA used to talk to a Python FastAPI for these; we
 * proxy the same data through Cloudflare Edge instead so no Python
 * deployment is needed for the basic "see prices" experience.
 *
 * Cache hints on every call so the upstream isn't slammed.
 *
 * NOTE (2024+): Yahoo started returning HTTP 401 on:
 *   - /v7/finance/quote
 *   - /v10/finance/quoteSummary
 *   …unless the request carries an "A1" session cookie + a "crumb"
 * query parameter. Endpoints that DO still work anonymously:
 *   - /v7/finance/spark   (batch price snapshot)
 *   - /v8/finance/chart   (single-symbol price + history)
 * Prefer those at the call site. Adding full crumb auth to this
 * helper is tracked as a follow-up — it requires cookie persistence
 * across Worker isolates, which means a KV binding.
 */

const UA =
  // Yahoo blocks bare requests without a UA. Pretend to be a real browser.
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/126.0.0.0 Safari/537.36'

export type YahooFetchOptions = {
  /** Seconds. Defaults to 30. */
  ttl?: number
}

export async function yahooFetch<T = unknown>(
  url: string,
  options: YahooFetchOptions = {},
): Promise<T> {
  const ttl = options.ttl ?? 30
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'user-agent': UA,
      accept: 'application/json,text/plain,*/*',
      'accept-language': 'en-US,en;q=0.9',
    },
    next: { revalidate: ttl },
  })
  if (!res.ok) {
    throw new Error(`yahoo HTTP ${res.status}`)
  }
  const json = await res.json() as T
  return json
}

/**
 * Format an upstream Yahoo error so callers can return a stable
 * 503 + JSON shape. Used by every route handler.
 */
export function yahooErrorPayload(err: unknown): { error: string; detail: string } {
  return {
    error: 'Yahoo Finance temporarily unavailable',
    detail: err instanceof Error ? err.message : String(err),
  }
}
