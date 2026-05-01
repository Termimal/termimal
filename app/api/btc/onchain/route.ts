/**
 * /api/btc/onchain — BTC market + chain metrics, all from FREE sources.
 *
 * No paid feeds, no API keys. Sources:
 *   - CoinMetrics Community API   (real on-chain metrics: MVRV,
 *                                  Realized Cap, NUPL, NVT, hash rate,
 *                                  active addresses)
 *                                  https://docs.coinmetrics.io/api/v4/community
 *   - Coingecko                    market price + market cap + 24h vol
 *   - blockchain.info              difficulty, miners revenue, mempool size
 *   - mempool.space                fee tiers
 *
 * CoinMetrics Community is genuinely free and key-less — it's the
 * data sponsoring the academic Bitcoin Coinmetrics archive used in
 * countless papers. It exposes:
 *   CapMVRVCur     - MVRV ratio (Market Cap / Realized Cap)
 *   CapRealUSD     - Realized Cap in USD
 *   CapMrktCurUSD  - Market Cap in USD
 *   PriceUSD       - daily price
 *   HashRate       - 7-day average hash rate
 *   AdrActCnt      - active addresses
 *   NVTAdj         - Network Value to Transactions
 *   SplyCur        - circulating supply
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'

// ── Source 1: CoinMetrics Community ─────────────────────────────────
const CM_METRICS = [
  'PriceUSD',
  'CapMrktCurUSD',
  'CapRealUSD',
  'CapMVRVCur',
  'HashRate',
  'AdrActCnt',
  'NVTAdj',
  'SplyCur',
] as const

type CMRow = Record<string, string | number>
interface CMResponse {
  data?: CMRow[]
  error?: string
}

async function getCoinMetrics(): Promise<Record<string, number | null>> {
  const url =
    'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics' +
    `?assets=btc&metrics=${CM_METRICS.join(',')}` +
    '&frequency=1d&page_size=1&pretty=false'
  try {
    const res = await fetch(url, { next: { revalidate: 600 } })
    if (!res.ok) throw new Error(`coinmetrics http ${res.status}`)
    const json = await res.json() as CMResponse
    const row = json?.data?.[0] ?? {}
    const out: Record<string, number | null> = {}
    for (const k of CM_METRICS) {
      const v = row[k]
      const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
      out[k] = Number.isFinite(n) ? n : null
    }
    out._asof = typeof row.time === 'string' ? Number(new Date(row.time).getTime()) : null
    return out
  } catch {
    return {}
  }
}

// ── Source 2: Coingecko ────────────────────────────────────────────
interface CoingeckoResp {
  market_data?: {
    current_price?: { usd?: number }
    market_cap?:    { usd?: number }
    total_volume?:  { usd?: number }
  }
}
async function getCoingecko(): Promise<CoingeckoResp | null> {
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
      { next: { revalidate: 60 } },
    )
    if (!r.ok) return null
    return r.json() as Promise<CoingeckoResp>
  } catch { return null }
}

// ── Source 3: blockchain.info ──────────────────────────────────────
interface ChainStats {
  hash_rate?: number
  difficulty?: number
  miners_revenue_usd?: number
  mempool_size?: number
}
async function getChainStats(): Promise<ChainStats | null> {
  try {
    const r = await fetch('https://api.blockchain.info/stats', { next: { revalidate: 300 } })
    if (!r.ok) return null
    return r.json() as Promise<ChainStats>
  } catch { return null }
}

// ── Source 4: mempool.space ────────────────────────────────────────
interface MempoolFee { fastestFee?: number; halfHourFee?: number; hourFee?: number; economyFee?: number }
async function getMempoolFees(): Promise<MempoolFee | null> {
  try {
    const r = await fetch('https://mempool.space/api/v1/fees/recommended', { next: { revalidate: 60 } })
    if (!r.ok) return null
    return r.json() as Promise<MempoolFee>
  } catch { return null }
}

// ── Interpretation helpers ─────────────────────────────────────────
function mvrvState(mvrv: number | null): { state: string; interp: string } {
  if (mvrv == null) return { state: 'NEEDS-FEED', interp: 'CoinMetrics returned no value.' }
  if (mvrv > 3.7) return { state: 'EUPHORIA',   interp: 'MVRV >3.7 historically marks blow-off tops.' }
  if (mvrv > 2.5) return { state: 'OVERHEATED', interp: 'Above 2.5: late-cycle territory.' }
  if (mvrv > 1.5) return { state: 'NEUTRAL',    interp: '1.5-2.5: mid-cycle expansion.' }
  if (mvrv > 1.0) return { state: 'COOLING',    interp: '1.0-1.5: coiling for next leg.' }
  return            { state: 'CAPITULATION', interp: 'MVRV <1.0: holders sitting on aggregate losses, classic accumulation zone.' }
}
function nupl(mcap: number | null, rcap: number | null): number | null {
  if (mcap == null || rcap == null || mcap === 0) return null
  return (mcap - rcap) / mcap
}
function nuplState(n: number | null): { state: string; interp: string } {
  if (n == null) return { state: 'NEEDS-FEED', interp: '' }
  if (n > 0.75) return { state: 'EUPHORIA',     interp: 'NUPL >0.75 — unrealized gains at cycle-top extremes.' }
  if (n > 0.5)  return { state: 'BELIEF',       interp: '0.5-0.75 — late bull phase.' }
  if (n > 0.25) return { state: 'OPTIMISM',     interp: '0.25-0.5 — typical bull market.' }
  if (n > 0)    return { state: 'HOPE',         interp: 'Slightly net unrealized profit.' }
  return            { state: 'CAPITULATION', interp: 'NUPL <0 — aggregate unrealized loss, deep value zone.' }
}

// ── Handler ────────────────────────────────────────────────────────
export async function GET() {
  const [cm, cg, bc, mp] = await Promise.all([
    getCoinMetrics(),
    getCoingecko(),
    getChainStats(),
    getMempoolFees(),
  ])

  // Prefer CoinMetrics for price + mcap (their numbers are more
  // consistent with realized cap), fall back to Coingecko.
  const btc_price  = (cm.PriceUSD as number)        ?? cg?.market_data?.current_price?.usd ?? null
  const market_cap = (cm.CapMrktCurUSD as number)   ?? cg?.market_data?.market_cap?.usd    ?? null
  const realized_cap = (cm.CapRealUSD as number)    ?? null
  const mvrv       = (cm.CapMVRVCur as number)      ?? null
  const hash_rate  = (cm.HashRate as number)        ?? (bc?.hash_rate ? bc.hash_rate * 1e9 : null)
  const active_addr= (cm.AdrActCnt as number)       ?? null
  const nvt        = (cm.NVTAdj as number)          ?? null
  const supply     = (cm.SplyCur as number)         ?? null
  const nuplVal    = nupl(market_cap, realized_cap)
  const mvrvCtx    = mvrvState(mvrv)
  const nuplCtx    = nuplState(nuplVal)

  const metrics: Record<string, {
    name: string; value: number | null; formula: string
    state: string; interpretation: string
  }> = {
    mvrv: {
      name: 'MVRV',
      value: mvrv,
      formula: 'Market Cap / Realized Cap',
      state: mvrvCtx.state,
      interpretation: mvrvCtx.interp,
    },
    nupl: {
      name: 'NUPL',
      value: nuplVal,
      formula: '(Market Cap − Realized Cap) / Market Cap',
      state: nuplCtx.state,
      interpretation: nuplCtx.interp,
    },
    realized_cap: {
      name: 'Realized Cap',
      value: realized_cap,
      formula: 'Σ (last_move_price × value) across UTXOs',
      state: realized_cap ? 'OK' : 'NEEDS-FEED',
      interpretation: realized_cap
        ? `Aggregate cost basis of all BTC: $${(realized_cap / 1e9).toFixed(0)}B.`
        : '',
    },
    hashrate: {
      name: 'Hash rate',
      value: hash_rate,
      formula: 'Network hash rate (H/s, 7d avg)',
      state: hash_rate ? 'OK' : 'NEEDS-FEED',
      interpretation: hash_rate
        ? `Network producing ~${(hash_rate / 1e18).toFixed(1)} EH/s. Higher = stronger security.`
        : '',
    },
    nvt: {
      name: 'NVT',
      value: nvt,
      formula: 'Network Value / Transaction Volume',
      state: nvt == null ? 'NEEDS-FEED' : nvt > 95 ? 'OVERHEATED' : nvt > 50 ? 'NEUTRAL' : 'UNDERHEATED',
      interpretation: nvt == null ? '' : 'High NVT = market value outrunning chain throughput (potential overvaluation).',
    },
    active_addresses: {
      name: 'Active addresses',
      value: active_addr,
      formula: 'Distinct addresses active in last 24h',
      state: active_addr ? 'OK' : 'NEEDS-FEED',
      interpretation: active_addr ? 'Network usage signal — sustained growth supports valuation.' : '',
    },
    difficulty: {
      name: 'Difficulty',
      value: bc?.difficulty ?? null,
      formula: 'Current PoW difficulty target',
      state: bc?.difficulty ? 'OK' : 'NEEDS-FEED',
      interpretation: 'Adjusts every 2,016 blocks (~2 weeks).',
    },
    miners_revenue: {
      name: 'Miners revenue (24h)',
      value: bc?.miners_revenue_usd ?? null,
      formula: 'Block subsidy + fees, last 24h, USD',
      state: bc?.miners_revenue_usd ? 'OK' : 'NEEDS-FEED',
      interpretation: 'Spikes during congestion or fee events (NFTs, ordinals).',
    },
    mempool_size: {
      name: 'Mempool size',
      value: bc?.mempool_size ?? null,
      formula: 'Unconfirmed bytes',
      state: bc?.mempool_size ? 'OK' : 'NEEDS-FEED',
      interpretation: 'Large mempool = high fee pressure.',
    },
    fee_fastest: {
      name: 'Fastest fee (sat/vB)',
      value: mp?.fastestFee ?? null,
      formula: 'Recommended next-block fee',
      state: mp?.fastestFee ? 'OK' : 'NEEDS-FEED',
      interpretation: '',
    },
    supply: {
      name: 'Circulating supply',
      value: supply,
      formula: 'Total mined BTC',
      state: supply ? 'OK' : 'NEEDS-FEED',
      interpretation: supply ? `${supply.toFixed(0)} / 21,000,000 BTC mined.` : '',
    },
  }

  // Build a multi_metric "alignment" summary the SPA can use.
  const aligned: string[] = []
  if (mvrvCtx.state === 'CAPITULATION' && nuplCtx.state === 'CAPITULATION') aligned.push('MVRV + NUPL both in capitulation')
  if (mvrvCtx.state === 'EUPHORIA' && nuplCtx.state === 'EUPHORIA')         aligned.push('MVRV + NUPL both in euphoria')
  const multi_metric = aligned.length
    ? { alignment: aligned[0], context: 'On-chain valuation metrics agree.' }
    : null

  return NextResponse.json({
    data: {
      ticker: 'BTC',
      btc_price,
      market_cap,
      realized_cap,
      source: 'CoinMetrics Community + Coingecko + blockchain.info + mempool.space',
      updated: new Date().toISOString(),
      metrics,
      multi_metric,
    },
    source: 'Multi-source (free)',
    updated: new Date().toISOString(),
  }, {
    headers: { 'cache-control': 'public, max-age=300, s-maxage=300' },
  })
}
