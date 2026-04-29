// pages/polymarket/types.ts
export interface OFTrade {
  ts: number
  price: number
  size: number
  notional: number
  side: 'BUY' | 'SELL'
  aggressor: 'buy' | 'sell'
  outcome: string
  outcome_index?: number
  token_id: string
  wallet: string
  pseudonym: string
  tx: string
}

export interface OFBook {
  token_id: string
  bids: [number, number][]
  asks: [number, number][]
  tick_size: number
  min_order_size: number
  ts: number
  stale: boolean
}

export interface OFTokenMeta {
  token_id: string
  best_bid: number | null
  best_ask: number | null
  last: number
  tick_size: number
  min_order_size: number
}

export interface OFMarketMeta {
  condition_id: string
  question: string
  slug: string
  end_date: string
  volume_24h: number
  liquidity: number
  neg_risk: boolean
  outcomes: string[]
  tokens: { yes: OFTokenMeta | null; no: OFTokenMeta | null }
}

export interface CVDPoint { ts: number; cvd: number }

export interface AbsorptionEvent { ts: number; price: number; aggressor: 'buy' | 'sell'; volume: number; price_range: number }
export interface SweepEvent     { ts: number; aggressor: 'buy' | 'sell'; levels: number; notional: number; duration_ms: number }
export interface DivergenceEvent{ ts: number; type: string; price_pivot: number; cvd_pivot: number }

export interface OFMetrics {
  window_sec: number
  outcome: string
  trade_count: number
  buy_notional: number
  sell_notional: number
  delta_notional: number
  cvd_series: CVDPoint[]
  absorption_events: AbsorptionEvent[]
  sweeps: SweepEvent[]
  divergences: DivergenceEvent[]
}

export interface ProfileBin { price: number; buy: number; sell: number; total: number }
export interface OFProfile {
  bin: number
  total_volume_notional: number
  bins: ProfileBin[]
  poc: number | null
  vah: number | null
  val: number | null
  hvn: number[]
  lvn: number[]
}

export interface FootprintCell { price: number; buy: number; sell: number; imbalance: number; stacked: boolean }
export interface FootprintBar {
  ts_start: number
  open: number; high: number; low: number; close: number
  delta: number
  cells: FootprintCell[]
  unfinished_top: boolean
  unfinished_bot: boolean
  stacked_zones: { from: number; to: number; side: 'buy'|'sell'; count: number }[]
}

export interface PaperPosition {
  id: string
  condition_id: string
  token_id: string
  outcome: string
  side: 'BUY' | 'SELL'
  size: number
  entry_price: number
  mark_price: number
  unrealized_pnl: number
  realized_pnl: number
  opened_ts: number
  closed_ts: number | null
  stop_prob: number | null
  take_prob: number | null
  status: 'OPEN' | 'CLOSED' | 'STOPPED' | 'TAKEN'
}
