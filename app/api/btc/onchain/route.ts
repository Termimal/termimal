/**
 * /api/btc/onchain — BTC market + chain metrics, free-source aggregation.
 *
 * Sources:
 *   - Coingecko        market price + market cap + 24h volume
 *   - blockchain.info  hashrate, difficulty, mempool, miners revenue
 *   - mempool.space    fee estimates, recent block production
 *
 * What we CAN'T compute on the Edge for free:
 *   - MVRV, MVRV-Z (needs realized cap from Glassnode / CoinMetrics — paid)
 *   - SOPR, NUPL, Reserve Risk (same)
 *   - Long-term holder net position (same)
 *
 * For those we surface a `null` value with `state: 'NEEDS-PAID-FEED'` so
 * the UI shows "—" rather than crashing.
 */
export const runtime = 'edge'

import { NextResponse } from 'next/server'

interface CoingeckoResp {
  market_data?: {
    current_price?: { usd?: number }
    market_cap?:    { usd?: number }
    total_volume?:  { usd?: number }
  }
}
interface BlockchainStatsResp {
  hash_rate?:        number    // GH/s
  difficulty?:       number
  trade_volume_btc?: number
  miners_revenue_usd?: number
  mempool_size?:     number    // bytes
  total_btc_sent?:   number
}
interface MempoolFee {
  fastestFee?: number
  halfHourFee?: number
  hourFee?: number
  economyFee?: number
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try { return await p } catch { return null }
}

async function getCoingecko(): Promise<CoingeckoResp | null> {
  const u = 'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
  const r = await fetch(u, { next: { revalidate: 60 } })
  if (!r.ok) throw new Error(`coingecko http ${r.status}`)
  return r.json() as Promise<CoingeckoResp>
}
async function getChainStats(): Promise<BlockchainStatsResp | null> {
  const r = await fetch('https://api.blockchain.info/stats', { next: { revalidate: 300 } })
  if (!r.ok) throw new Error(`blockchain.info http ${r.status}`)
  return r.json() as Promise<BlockchainStatsResp>
}
async function getMempoolFees(): Promise<MempoolFee | null> {
  const r = await fetch('https://mempool.space/api/v1/fees/recommended', { next: { revalidate: 60 } })
  if (!r.ok) throw new Error(`mempool.space http ${r.status}`)
  return r.json() as Promise<MempoolFee>
}

export async function GET() {
  const [cg, bc, mp] = await Promise.all([
    safe(getCoingecko()),
    safe(getChainStats()),
    safe(getMempoolFees()),
  ])

  const btc_price  = cg?.market_data?.current_price?.usd ?? null
  const market_cap = cg?.market_data?.market_cap?.usd    ?? null

  const metrics: Record<string, {
    name: string; value: number | null; formula: string;
    state: string; interpretation: string; median_90d?: number
  }> = {
    hashrate: {
      name: 'Hash rate',
      value: bc?.hash_rate ? bc.hash_rate * 1e9 : null,    // blockchain.info returns GH/s; expose as H/s
      formula: 'Network hash rate (H/s, 24h average)',
      state: bc?.hash_rate ? 'OK' : 'NEEDS-FEED',
      interpretation: bc?.hash_rate
        ? `Network producing ~${(bc.hash_rate / 1e9).toFixed(1)} EH/s. Higher hash rate = stronger security.`
        : 'Network hash rate temporarily unavailable from upstream.',
    },
    difficulty: {
      name: 'Difficulty',
      value: bc?.difficulty ?? null,
      formula: 'Current PoW difficulty target',
      state: bc?.difficulty ? 'OK' : 'NEEDS-FEED',
      interpretation: 'Adjusts every 2,016 blocks (~2 weeks) to keep block time near 10 minutes.',
    },
    miners_revenue: {
      name: 'Miners revenue (24h)',
      value: bc?.miners_revenue_usd ?? null,
      formula: 'Block subsidy + fees, last 24h, USD',
      state: bc?.miners_revenue_usd ? 'OK' : 'NEEDS-FEED',
      interpretation: 'Spikes correlate with high fee periods (NFTs, ordinals, congestion).',
    },
    mempool_size: {
      name: 'Mempool size',
      value: bc?.mempool_size ?? null,
      formula: 'Unconfirmed transactions waiting (bytes)',
      state: bc?.mempool_size ? 'OK' : 'NEEDS-FEED',
      interpretation: 'Large mempool = high fee pressure.',
    },
    fee_fastest: {
      name: 'Fastest fee (sat/vB)',
      value: mp?.fastestFee ?? null,
      formula: 'Recommended fee for next-block confirmation',
      state: mp?.fastestFee ? 'OK' : 'NEEDS-FEED',
      interpretation: 'Higher = network is congested.',
    },
    mvrv: {
      name: 'MVRV',
      value: null,
      formula: 'Market Cap / Realized Cap',
      state: 'NEEDS-PAID-FEED',
      interpretation: 'Realized Cap requires UTXO-level analytics (Glassnode, CoinMetrics, paid).',
    },
    mvrv_z: {
      name: 'MVRV-Z Score',
      value: null,
      formula: '(Market Cap − Realized Cap) / σ(Market Cap)',
      state: 'NEEDS-PAID-FEED',
      interpretation: 'Same paid-feed dependency as MVRV.',
    },
    nupl: {
      name: 'NUPL',
      value: null,
      formula: '(Market Cap − Realized Cap) / Market Cap',
      state: 'NEEDS-PAID-FEED',
      interpretation: 'Net Unrealized Profit/Loss; paid feed only.',
    },
  }

  return NextResponse.json({
    data: {
      ticker: 'BTC',
      btc_price,
      market_cap,
      realized_cap: null,
      source: 'Coingecko + blockchain.info + mempool.space',
      updated: new Date().toISOString(),
      metrics,
      multi_metric: null,
      error: cg && bc && mp ? undefined : 'Some upstreams returned errors; partial data shown.',
    },
    source: 'Multi-source',
    updated: new Date().toISOString(),
  }, {
    headers: { 'cache-control': 'public, max-age=60, s-maxage=60' },
  })
}
