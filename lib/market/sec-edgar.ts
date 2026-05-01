/**
 * SEC EDGAR XBRL helper. Free, public, no key required.
 *
 * Companies file 10-Q (quarterly) and 10-K (annual) reports with the
 * SEC; the EDGAR endpoint exposes every filed numeric fact as JSON
 * via the XBRL company-facts API.
 *
 * https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json
 *
 * The catch: we need the 10-digit CIK, not the ticker. SEC publishes
 * the full ticker→CIK map at:
 *   https://www.sec.gov/files/company_tickers.json
 * (~10 KB, refreshes weekly).
 *
 * This helper:
 *   1. Caches the ticker→CIK map for 24h.
 *   2. Pulls company-facts for a CIK and returns specified XBRL tags.
 *   3. Returns a per-period (quarterly) timeline so the SPA
 *      can render trend cards.
 */

const SEC_HEADERS = {
  // SEC requires a User-Agent identifying the app + contact.
  // https://www.sec.gov/os/accessing-edgar-data
  'user-agent': 'Termimal Research Terminal contact@termimal.com',
  accept: 'application/json',
}

interface TickerMapRow {
  cik_str: number | string
  ticker: string
  title: string
}

let TICKER_MAP: Map<string, string> | null = null
let TICKER_MAP_AT = 0
async function loadTickerMap(): Promise<Map<string, string>> {
  // 24h memo. Cloudflare workers may spin many instances so this is
  // best-effort; even cold misses just hit SEC once and cache.
  if (TICKER_MAP && Date.now() - TICKER_MAP_AT < 24 * 3600 * 1000) return TICKER_MAP
  try {
    const r = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: SEC_HEADERS,
      next: { revalidate: 86400 },
    })
    if (!r.ok) throw new Error(`sec ticker map http ${r.status}`)
    const j = await r.json() as Record<string, TickerMapRow>
    const m = new Map<string, string>()
    for (const k of Object.keys(j)) {
      const row = j[k]
      const cik = String(row.cik_str).padStart(10, '0')
      m.set(String(row.ticker).toUpperCase(), cik)
    }
    TICKER_MAP = m
    TICKER_MAP_AT = Date.now()
    return m
  } catch {
    return TICKER_MAP ?? new Map()
  }
}

export async function tickerToCik(ticker: string): Promise<string | null> {
  const m = await loadTickerMap()
  return m.get(ticker.toUpperCase()) ?? null
}

interface XBRLFact {
  end: string         // e.g. "2024-09-28"
  val: number
  fy?: number
  fp?: string         // "FY" | "Q1" | ...
  form: string        // "10-Q" | "10-K"
  filed?: string
}
interface CompanyFacts {
  facts?: {
    'us-gaap'?: Record<string, {
      label?: string
      units?: Record<string, XBRLFact[]>   // typically "USD" array
    }>
  }
}

export async function fetchFacts(cik: string): Promise<CompanyFacts | null> {
  try {
    const r = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
      headers: SEC_HEADERS,
      next: { revalidate: 86400 },
    })
    if (!r.ok) return null
    return r.json() as Promise<CompanyFacts>
  } catch { return null }
}

/**
 * Pull the raw USD facts for a tag, sorted oldest -> newest, deduped
 * by `end` date (the same period can appear multiple times across
 * 10-Q and 10-K filings; we prefer the most recent `filed`).
 */
export function pullSeries(facts: CompanyFacts | null, tag: string): XBRLFact[] {
  const arr = facts?.facts?.['us-gaap']?.[tag]?.units?.['USD'] ?? []
  // Dedupe: latest filed wins per `end`.
  const byEnd = new Map<string, XBRLFact>()
  for (const f of arr) {
    const cur = byEnd.get(f.end)
    if (!cur) { byEnd.set(f.end, f); continue }
    const newer = (f.filed ?? '') > (cur.filed ?? '')
    if (newer) byEnd.set(f.end, f)
  }
  return Array.from(byEnd.values()).sort((a, b) => a.end.localeCompare(b.end))
}

/** Most-recent N quarterly facts (Q1/Q2/Q3 forms) for a tag. */
export function lastNQuarters(facts: CompanyFacts | null, tag: string, n = 8): XBRLFact[] {
  const all = pullSeries(facts, tag)
  // Quarter facts have fp Q1/Q2/Q3 and fy set. Annual is FY (10-K).
  const quarters = all.filter((f) => f.fp && /^Q\d/.test(f.fp))
  return quarters.slice(-n)
}

/** Sum the prior 4 quarterly values to get a TTM. Returns null if any missing. */
export function ttmFromQuarters(quarters: XBRLFact[]): number | null {
  if (quarters.length < 4) return null
  const last4 = quarters.slice(-4)
  return last4.reduce((acc, q) => acc + q.val, 0)
}
