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

/**
 * Sources we try to bootstrap an A1 cookie from. fc.yahoo.com used
 * to be the canonical "fast-cookie" origin but as of 2024 it
 * frequently does NOT set A1 from datacenter (Cloudflare Worker)
 * IPs. The Yahoo finance origin still sets it for those callers.
 * We try them in order until one works.
 */
const COOKIE_SOURCES = [
  'https://finance.yahoo.com/quote/AAPL/',
  'https://finance.yahoo.com/',
  'https://www.yahoo.com/',
  'https://login.yahoo.com/',
  'https://fc.yahoo.com/',
]

async function fetchA1Cookie(): Promise<string | null> {
  for (const url of COOKIE_SOURCES) {
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': UA,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      })
      const cookieRaw =
        (typeof (res.headers as { getSetCookie?: () => string[] }).getSetCookie === 'function'
          ? ((res.headers as { getSetCookie: () => string[] }).getSetCookie().join('; '))
          : res.headers.get('set-cookie'))
      const cookie = extractA1Cookie(cookieRaw)
      if (cookie) return cookie
    } catch {
      // Try next source.
    }
  }
  return null
}

/**
 * Extract a `crumb` value from the inline JS of a Yahoo finance
 * page. Yahoo embeds it as `"CrumbStore":{"crumb":"<value>"}` in
 * the HTML body. Used as a fallback when the /v1/test/getcrumb
 * endpoint refuses to serve our cookie.
 */
async function fetchCrumbFromHtml(cookie: string): Promise<string | null> {
  try {
    const res = await fetch('https://finance.yahoo.com/quote/AAPL/', {
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        cookie,
      },
    })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/"CrumbStore"\s*:\s*\{\s*"crumb"\s*:\s*"([^"]+)"/)
    if (m && m[1]) {
      // Yahoo escapes `/` etc. into the crumb; un-escape.
      return m[1].replace(/\\u002F/g, '/').replace(/\\u003D/g, '=')
    }
    return null
  } catch {
    return null
  }
}

async function bootstrapCrumb(): Promise<CrumbState> {
  // Step 1: Get an A1 cookie. Try multiple Yahoo origins.
  const cookie = await fetchA1Cookie()
  if (!cookie) {
    throw new Error('yahoo crumb bootstrap: no A1 cookie returned')
  }

  // Step 2a: Trade the cookie for a crumb via the API endpoint.
  let crumb = ''
  try {
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'user-agent': UA,
        accept: 'text/plain,*/*',
        cookie,
      },
    })
    if (crumbRes.ok) {
      const body = (await crumbRes.text()).trim()
      if (body && body.length <= 32 && !body.includes('<')) crumb = body
    }
  } catch {
    // fall through to HTML fallback
  }

  // Step 2b: Fall back to scraping the crumb from a Yahoo finance
  // page if the API endpoint refused us.
  if (!crumb) {
    const fromHtml = await fetchCrumbFromHtml(cookie)
    if (fromHtml) crumb = fromHtml
  }

  if (!crumb) {
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
