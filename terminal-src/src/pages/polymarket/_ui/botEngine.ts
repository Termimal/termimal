// pages/polymarket/_ui/botEngine.ts
// Client-side bot evaluation — runs selected entry rule against live orderflow data.
// Fires paper orders via the existing /api/polymarket/orderflow/paper/order endpoint.
// Honors cooldown, max-notional, kill-switch. Live execution is gated at the panel level.

import type { OFMetrics, OFTrade, OFMarketMeta } from '../types'

export type EntryRule = 'absorption_cvd_div' | 'spike_fade' | 'whale_align' | 'manual'

export interface BotEvalConfig {
  entryRule: EntryRule
  stopPct: number      // 0.05 == 5%
  targetPct: number
  maxNotional: number  // cumulative session notional cap (USD)
  cooldownSec: number
}

export interface BotState {
  lastFireTs: number       // last auto-fire time (ms)
  sessionNotional: number  // cumulative notional fired this session
  fills: number            // count of fires that got filled
  lastEvalTs: number       // last time engine ticked
}

export function emptyState(): BotState {
  return { lastFireTs: 0, sessionNotional: 0, fills: 0, lastEvalTs: 0 }
}

// ─── Rule evaluators ──────────────────────────────────────────────
// Each returns either { side, reason } to fire or null to skip.
// `side` is the paper-order direction on the YES outcome (BUY = long YES, SELL = short YES).

interface RuleSignal { side: 'BUY' | 'SELL'; reason: string }

function evalAbsorptionCvdDiv(metrics: OFMetrics | null): RuleSignal | null {
  if (!metrics || !metrics.absorption_events.length || metrics.cvd_series.length < 5) return null
  // Look at absorption in the last 5 minutes
  const now = Date.now()
  const recent = metrics.absorption_events.filter(a => now - a.ts < 5 * 60 * 1000)
  if (!recent.length) return null
  const latest = recent[recent.length - 1]

  // CVD direction in the last 5 points
  const series = metrics.cvd_series
  const tail = series.slice(-5)
  const cvdSlope = tail[tail.length - 1].cvd - tail[0].cvd

  // Contrarian: buy-side aggressors getting absorbed by passive sellers
  // → sellers are in control → FADE the aggressor = SELL
  // For divergence to count, CVD must be moving opposite to what the aggressor is doing
  if (latest.aggressor === 'buy' && cvdSlope <= 0) {
    return { side: 'SELL', reason: 'buy absorption + weak CVD' }
  }
  if (latest.aggressor === 'sell' && cvdSlope >= 0) {
    return { side: 'BUY', reason: 'sell absorption + strong CVD' }
  }
  return null
}

function evalSpikeFade(metrics: OFMetrics | null, whales: OFTrade[]): RuleSignal | null {
  if (!metrics) return null
  const totalNotional = metrics.buy_notional + metrics.sell_notional
  if (totalNotional < 10000) return null // need liquidity to fade

  // Find the largest recent whale trade (last 2 min)
  const now = Date.now()
  const recentWhales = whales.filter(w => now - w.ts < 2 * 60 * 1000 && w.notional >= 10000)
  if (!recentWhales.length) return null
  const largest = recentWhales.reduce((a, b) => b.notional > a.notional ? b : a)

  // Fade: take opposite side of the whale aggressor
  return {
    side: largest.aggressor === 'buy' ? 'SELL' : 'BUY',
    reason: `fade $${Math.round(largest.notional / 1000)}k ${largest.aggressor} spike`,
  }
}

function evalWhaleAlign(metrics: OFMetrics | null, whales: OFTrade[]): RuleSignal | null {
  if (!metrics || !whales.length || metrics.cvd_series.length < 5) return null
  const now = Date.now()
  const recent = whales.filter(w => now - w.ts < 3 * 60 * 1000 && w.notional >= 5000)
  if (!recent.length) return null
  const latest = recent[recent.length - 1]

  // CVD must be moving in the same direction as the whale
  const series = metrics.cvd_series
  const tail = series.slice(-5)
  const cvdSlope = tail[tail.length - 1].cvd - tail[0].cvd
  if (latest.aggressor === 'buy' && cvdSlope > 0) {
    return { side: 'BUY', reason: `whale $${Math.round(latest.notional / 1000)}k buy + CVD up` }
  }
  if (latest.aggressor === 'sell' && cvdSlope < 0) {
    return { side: 'SELL', reason: `whale $${Math.round(latest.notional / 1000)}k sell + CVD down` }
  }
  return null
}

export function evaluateRule(
  rule: EntryRule,
  metrics: OFMetrics | null,
  whales: OFTrade[]
): RuleSignal | null {
  switch (rule) {
    case 'absorption_cvd_div': return evalAbsorptionCvdDiv(metrics)
    case 'spike_fade':         return evalSpikeFade(metrics, whales)
    case 'whale_align':        return evalWhaleAlign(metrics, whales)
    case 'manual':             return null
  }
}

// ─── Fire a paper order ────────────────────────────────────────────
export interface FireResult {
  ok: boolean
  message: string
  fillPrice?: number
}

export async function firePaperOrder(params: {
  meta: OFMarketMeta
  signal: RuleSignal
  notional: number
}): Promise<FireResult> {
  const tok = params.meta.tokens.yes
  if (!tok) return { ok: false, message: 'no YES token' }
  // Use ask for BUY, bid for SELL. Fall back to last known price.
  const limit = params.signal.side === 'BUY'
    ? (tok.best_ask ?? tok.last)
    : (tok.best_bid ?? tok.last)
  if (!limit || !isFinite(limit) || limit <= 0) return { ok: false, message: 'no valid price' }

  try {
    const r = await fetch('/api/polymarket/orderflow/paper/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condition_id: params.meta.condition_id,
        token_id: tok.token_id,
        outcome: 'Yes',
        side: params.signal.side,
        size: params.notional,
        limit_price: limit,
      }),
    })
    const j = await r.json()
    if (j.error) return { ok: false, message: j.error }
    return { ok: true, message: `FILLED @ ${j.fill_price?.toFixed?.(3) ?? limit.toFixed(3)}`, fillPrice: j.fill_price ?? limit }
  } catch (e) {
    return { ok: false, message: `net error: ${String(e).slice(0, 40)}` }
  }
}

// ─── Main tick — orchestrates one bot evaluation cycle ─────────────
export interface TickResult {
  event: 'skip' | 'cooldown' | 'cap' | 'fire_ok' | 'fire_err' | 'no_meta'
  message: string
  signal?: RuleSignal
  fillPrice?: number
}

export async function runBotTick(params: {
  config: BotEvalConfig
  state: BotState
  meta: OFMarketMeta | null
  metrics: OFMetrics | null
  whales: OFTrade[]
}): Promise<TickResult> {
  const { config, state, meta, metrics, whales } = params

  if (!meta) return { event: 'no_meta', message: 'no market meta' }

  const signal = evaluateRule(config.entryRule, metrics, whales)
  if (!signal) return { event: 'skip', message: 'no signal' }

  // Cooldown
  const sinceFire = (Date.now() - state.lastFireTs) / 1000
  if (state.lastFireTs > 0 && sinceFire < config.cooldownSec) {
    return { event: 'cooldown', message: `signal "${signal.reason}" — cooldown ${Math.round(config.cooldownSec - sinceFire)}s` }
  }

  // Notional cap — each fire is 1/5 of max notional
  const perFire = Math.max(10, Math.min(config.maxNotional / 5, 100))
  if (state.sessionNotional + perFire > config.maxNotional) {
    return { event: 'cap', message: `max notional ${config.maxNotional} reached` }
  }

  // Fire
  const result = await firePaperOrder({ meta, signal, notional: perFire })
  if (result.ok) {
    return { event: 'fire_ok', message: `${signal.side} $${perFire} — ${signal.reason} — ${result.message}`, signal, fillPrice: result.fillPrice }
  } else {
    return { event: 'fire_err', message: `FIRE FAILED — ${result.message}`, signal }
  }
}
