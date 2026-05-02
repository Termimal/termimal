/**
 * SEC EDGAR XBRL helper. Free, public, no key required.
 *
 * IMPORTANT — CPU-aware variant:
 *   We hit the per-tag `companyconcept` endpoint, NOT the per-company
 *   `companyfacts` endpoint. The companyfacts JSON for a large issuer
 *   (Apple, Microsoft) is 1-5 MB and JSON.parse alone burns 15-30 ms
 *   of Edge CPU — that's the entire Free-plan budget on a cold isolate.
 *   companyconcept returns one tag at a time at ~50 KB; the seven
 *   tags we need fetched in parallel total ~350 KB and parse in ~2-3 ms.
 *
 *   companyfacts:    https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json
 *   companyconcept:  https://data.sec.gov/api/xbrl/companyconcept/CIK{cik}/us-gaap/{tag}.json
 *
 * Same authoritative source, much smaller responses.
 *
 * Ticker→CIK lookup is cached for 24h per isolate.
 */

const SEC_HEADERS = {
  // SEC requires a User-Agent identifying the app + contact.
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

export interface XBRLFact {
  end: string         // e.g. "2024-09-28"
  val: number
  fy?: number
  fp?: string         // "FY" | "Q1" | ...
  form: string        // "10-Q" | "10-K"
  filed?: string
}

interface ConceptResp {
  units?: Record<string, XBRLFact[]>     // typically { "USD": [...] }
}

/**
 * Fetch a single XBRL tag's full history from SEC. ~50 KB / 5 ms parse.
 * Returns the deduped, sorted (oldest -> newest) array of facts.
 */
export async function fetchConcept(cik: string, tag: string): Promise<XBRLFact[]> {
  try {
    const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${tag}.json`
    const r = await fetch(url, {
      headers: SEC_HEADERS,
      next: { revalidate: 86400 },
    })
    if (!r.ok) return []
    const j = await r.json() as ConceptResp
    const arr = j?.units?.['USD'] ?? []
    // Dedupe by `end`, latest filed wins.
    const byEnd = new Map<string, XBRLFact>()
    for (const f of arr) {
      const cur = byEnd.get(f.end)
      if (!cur) { byEnd.set(f.end, f); continue }
      if ((f.filed ?? '') > (cur.filed ?? '')) byEnd.set(f.end, f)
    }
    return Array.from(byEnd.values()).sort((a, b) => a.end.localeCompare(b.end))
  } catch {
    return []
  }
}

/** Latest N quarterly facts (Q1/Q2/Q3 forms) for a tag. */
export async function lastNQuartersConcept(cik: string, tag: string, n = 12): Promise<XBRLFact[]> {
  const all = await fetchConcept(cik, tag)
  const quarters = all.filter((f) => f.fp && /^Q\d/.test(f.fp))
  return quarters.slice(-n)
}

/**
 * Pull SEVERAL tags in parallel. Returns a map keyed by tag name.
 * The whole batch typically completes in 200-500 ms wall time and
 * <5 ms CPU because each individual response is tiny.
 */
export async function fetchManyConcepts(
  cik: string,
  tags: string[],
): Promise<Record<string, XBRLFact[]>> {
  const out: Record<string, XBRLFact[]> = {}
  const results = await Promise.all(
    tags.map((tag) => fetchConcept(cik, tag).then((rows) => [tag, rows] as const)),
  )
  for (const [tag, rows] of results) out[tag] = rows
  return out
}
