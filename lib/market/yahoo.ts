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
 * AUTH (2024+):
 *   Yahoo started returning HTTP 401 on /v7/finance/quote and
 *   /v10/finance/quoteSummary unless the request carries an "A1"
 *   session cookie + a "crumb" query parameter. The flow:
 *     1. GET https://fc.yahoo.com/  → captures A1 cookie in Set-Cookie.
 *     2. GET https://query1.../v1/test/getcrumb with that cookie →
 *        body is an opaque crumb string (~11 chars).
 *     3. All subsequent requests append ?crumb=<crumb> and send
 *        Cookie: A1=<value>.
 *   We cache the (cookie, crumb) pair in module scope per Worker
 *   isolate. On 401 we invalidate and refetch. Anonymous endpoints
 *   that DO still work (no crumb needed):
 *     - /v7/finance/spark    (batch quote)
 *     - /v8/finance/chart    (single-symbol price + history)
 *   Prefer those when possible — they avoid the 3-request crumb
 *   bootstrap entirely.
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

/* ════════════════════════════════════════════════════════════════
 *  CRUMB AUTH
 *  Required for /v7/finance/quote and /v10/finance/quoteSummary.
 *  Cached per isolate — first call costs ~3 round trips, subsequent
 *  calls reuse the cached crumb until it expires (or until we get
 *  a 401 back, at which point we refresh).
 * ════════════════════════════════════════════════════════════════ */

interface CrumbState {
  cookie: string
  crumb: string
  fetchedAt: number
}

let crumbState: CrumbState | null = null
const CRUMB_TTL_MS = 30 * 60 * 1000  // 30 minutes — Yahoo's typical session length

/** Pull the A1 cookie out of a Set-Cookie response header. */
function extractA1Cookie(setCookieRaw: string | null): string | null {
  if (!setCookieRaw) return null
  // Set-Cookie may contain multiple cookies separated by commas (with
  // care: dates inside cookies also use commas). Split on ", <name>="
  // boundaries and pick the A1 one. Simpler heuristic: look for an
  // A1=...; segment.
  const match = setCookieRaw.match(/A1=[^;]+/)
  return match ? match[0] : null
}

async function bootstrapCrumb(): Promise<CrumbState> {
  // Step 1: Hit a Yahoo origin that issues an A1 cookie.
  const seedRes = await fetch('https://fc.yahoo.com/', {
    headers: {
      'user-agent': UA,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  })
  // Workers expose Set-Cookie via getSetCookie() (multi-value) or
  // get('set-cookie') (joined). Try both for portability.
  const cookieRaw =
    (typeof (seedRes.headers as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? ((seedRes.headers as { getSetCookie: () => string[] }).getSetCookie().join('; '))
      : seedRes.headers.get('set-cookie'))
  const cookie = extractA1Cookie(cookieRaw)
  if (!cookie) {
    throw new Error('yahoo crumb bootstrap: no A1 cookie returned')
  }

  // Step 2: Trade the cookie for a crumb token.
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'user-agent': UA,
      accept: 'text/plain,*/*',
      cookie,
    },
  })
  if (!crumbRes.ok) {
    throw new Error(`yahoo crumb bootstrap: getcrumb http ${crumbRes.status}`)
  }
  const crumb = (await crumbRes.text()).trim()
  if (!crumb || crumb.length > 32) {
    throw new Error('yahoo crumb bootstrap: empty or malformed crumb')
  }

  return { cookie, crumb, fetchedAt: Date.now() }
}

async function getCrumbState(forceRefresh = false): Promise<CrumbState> {
  if (
    !forceRefresh &&
    crumbState &&
    Date.now() - crumbState.fetchedAt < CRUMB_TTL_MS
  ) {
    return crumbState
  }
  crumbState = await bootstrapCrumb()
  return crumbState
}

/**
 * Same contract as `yahooFetch` but appends `?crumb=...` and the A1
 * cookie. Use for `/v7/finance/quote` and `/v10/finance/quoteSummary`.
 * On 401 we invalidate the crumb cache and retry exactly once.
 */
export async function yahooFetchAuthed<T = unknown>(
  url: string,
  options: YahooFetchOptions = {},
): Promise<T> {
  const ttl = options.ttl ?? 30

  const doFetch = async (state: CrumbState) => {
    const u = new URL(url)
    u.searchParams.set('crumb', state.crumb)
    return fetch(u.toString(), {
      method: 'GET',
      headers: {
        'user-agent': UA,
        accept: 'application/json,text/plain,*/*',
        'accept-language': 'en-US,en;q=0.9',
        cookie: state.cookie,
      },
      next: { revalidate: ttl },
    })
  }

  let state = await getCrumbState()
  let res = await doFetch(state)
  if (res.status === 401) {
    // Crumb expired or rotated. Refresh and retry once.
    state = await getCrumbState(true)
    res = await doFetch(state)
  }
  if (!res.ok) {
    throw new Error(`yahoo HTTP ${res.status}`)
  }
  return await res.json() as T
}
