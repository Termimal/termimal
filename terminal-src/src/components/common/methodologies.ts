// components/common/methodologies.ts
// Single source of truth for "How this is computed" content.
// Wired into MethodologyExpander on every derived metric in the terminal.

import type { MethodologyStep } from './MethodologyExpander'

export interface Methodology {
  summary: string
  inputs: string[]
  steps: MethodologyStep[]
  caveats?: string[]
}

export const methodologies: Record<string, Methodology> = {
  // ── Dashboard regime ────────────────────────────────────
  regime: {
    summary:
      'Termimal\'s macro regime label is a rule-based composite that scans eight macro drivers and counts how many are in their stress zones. The label updates whenever any input refreshes.',
    inputs: ['VIX', '10Y-2Y spread', 'HY OAS', 'HYG/LQD ratio', 'RSP/SPY breadth', 'DXY', 'WTI', 'US 10Y level'],
    steps: [
      { label: 'Per-driver flag', detail: 'Each driver is checked against fixed thresholds (e.g., VIX > 25, spread < 0.1, OAS > 4) and contributes 0–1 to the bear score.' },
      { label: 'Aggregate', detail: 'Sum the per-driver flags into a single bear score (0–8).' },
      { label: 'Label', detail: 'RISK-ON when score ≤ 1, NEUTRAL when 2–3, RISK-OFF when ≥ 4. Confidence is High at the extremes, Medium in the middle.' },
      { label: 'Drivers list', detail: 'Show the named flags that fired so you can see what is driving the label.' },
    ],
    caveats: [
      'Thresholds are static and intentionally simple — they are not optimised against any backtest.',
      'The regime is descriptive, not predictive; treat it as a context layer, not a trade signal.',
    ],
  },

  vix: {
    summary:
      'CBOE 30-day implied volatility on the S&P 500. Termimal classifies the regime by absolute level: Calm < 18, Elevated 18–25, Extreme ≥ 25.',
    inputs: ['CBOE VIX index'],
    steps: [
      { label: 'Level', detail: 'Pull the spot VIX print from the macro feed.' },
      { label: 'Regime', detail: 'Map the level to Calm / Elevated / Extreme via the thresholds above.' },
    ],
    caveats: [
      'VIX measures S&P options demand, not realised volatility. Single-stock or sector vol can diverge.',
    ],
  },

  spread: {
    summary:
      'US 10-year minus 2-year Treasury yield. Negative readings indicate an inverted yield curve, historically a leading indicator of recessions.',
    inputs: ['FRED DGS10', 'FRED DGS2'],
    steps: [
      { label: 'Subtract', detail: 'spread = US10Y − US2Y, both pulled from FRED.' },
      { label: 'Label', detail: 'Normal > 0.1, Flat between -0.1 and 0.1, Inverted < -0.1.' },
    ],
    caveats: [
      'Inversions historically precede recessions by 6–24 months — not a timing signal.',
      'The 3M/10Y spread is sometimes a stronger signal; the 10Y/2Y is shown here for cycle context.',
    ],
  },

  oas: {
    summary:
      'High-yield option-adjusted spread (ICE BofA US High Yield Index). Measures the credit risk premium investors demand over Treasuries. Widening spreads typically lead equity drawdowns.',
    inputs: ['ICE BofA US HY Index OAS', 'Trailing 5-year percentile'],
    steps: [
      { label: 'OAS', detail: 'Strip optionality from corporate bond yields to get a clean spread to Treasuries.' },
      { label: 'Regime', detail: 'Healthy < 4%, Watch 4–5%, Stress > 5%.' },
    ],
  },

  breadth_rsp_spy: {
    summary:
      'Equal-weight S&P (RSP) divided by cap-weighted S&P (SPY). Falling values mean the index is being carried by a few mega-caps — narrow leadership, fragile breadth.',
    inputs: ['RSP price', 'SPY price'],
    steps: [
      { label: 'Ratio', detail: 'RSP ÷ SPY at each close.' },
      { label: 'Regime', detail: 'Broad > 0.95, Narrow 0.90–0.95, Concentrated < 0.90.' },
    ],
    caveats: [
      'Breadth lags price at major turns; it can stay narrow for extended periods in mega-cap-led tapes.',
    ],
  },

  hyg_lqd: {
    summary:
      'High-yield bond ETF (HYG) divided by investment-grade bond ETF (LQD). A risk-appetite gauge: rising means investors are reaching for yield, falling means risk aversion.',
    inputs: ['HYG price', 'LQD price'],
    steps: [
      { label: 'Ratio', detail: 'HYG ÷ LQD at each close.' },
      { label: 'Regime', detail: 'Healthy > 0.83, Watch 0.81–0.83, Stress < 0.81.' },
    ],
  },

  dxy: {
    summary:
      'US Dollar Index — a trade-weighted basket against six major currencies. Strong dollar tightens global financial conditions and pressures EM and commodities.',
    inputs: ['ICE DXY'],
    steps: [
      { label: 'Level', detail: 'Read the spot DXY print.' },
      { label: 'Regime', detail: 'Neutral < 100, Firm 100–105, Strong > 105.' },
    ],
  },

  wti: {
    summary:
      'West Texas Intermediate crude oil price. Key input for headline inflation and the energy sector. Sustained moves above $90 historically coincide with growth-scare regimes.',
    inputs: ['WTI front-month future'],
    steps: [
      { label: 'Level', detail: 'Read the front-month WTI close.' },
      { label: 'Regime', detail: 'Normal < $75, Elevated $75–$90, Shock risk > $90.' },
    ],
  },

  // ── Risk Engine ──────────────────────────────────────────
  var95: {
    summary:
      'Parametric one-day Value at Risk at 95% confidence, computed from a portfolio volatility estimate. Interpret as: "on a typical day, losses should not exceed VaR 95%". On bad days they will.',
    inputs: ['Estimated daily portfolio σ', 'Z-score for 95% (≈1.645–2.015)'],
    steps: [
      { label: 'σ estimate', detail: 'Use a recent rolling standard deviation of returns or a model-implied σ.' },
      { label: 'Z scaling', detail: 'VaR ≈ σ × Z, where Z ≈ 1.645 for one-tailed 95% under normality.' },
      { label: 'Convert to %', detail: 'Multiply by 100 to display as a percentage of portfolio value.' },
    ],
    caveats: [
      'Parametric VaR assumes normal returns; financial returns are fat-tailed, so realised tail losses can be 2–5× the VaR figure.',
      'VaR says nothing about the size of losses beyond the cutoff (CVaR/Expected Shortfall does).',
    ],
  },

  // ── COT positioning ──────────────────────────────────────
  cot: {
    summary:
      'CFTC Commitments of Traders weekly report. Termimal shows net positioning by category and flags percentile extremes that historically precede mean reversion.',
    inputs: ['CFTC weekly COT report', 'Trailing 3-year percentile per category'],
    steps: [
      { label: 'Net position', detail: 'Net = Long contracts − Short contracts, per category and per future.' },
      { label: 'Crowding', detail: 'Rank against the trailing 3y for that category to flag extreme percentiles.' },
      { label: 'Display', detail: 'Show raw net plus a crowding badge when |percentile| > 90.' },
    ],
    caveats: [
      'COT has a Tuesday cut-off and Friday release — the data is structurally lagged by 3 trading days.',
    ],
  },

  // ── Polymarket signals ───────────────────────────────────
  wallet_score: {
    summary:
      'Termimal scores Polymarket wallets on accuracy, early-entry rate, and trade volume to surface "smart money" addresses worth following. The score is not a track record audited by Polymarket.',
    inputs: ['Wallet trade history', 'Resolved-market accuracy', 'Average entry price', 'Total trade count'],
    steps: [
      { label: 'Accuracy', detail: 'For each resolved market the wallet traded, was their final position the winning side? accuracy = correct / total.' },
      { label: 'Early-entry rate', detail: 'Fraction of trades entered when the market price was below 0.40 (high-conviction early bets).' },
      { label: 'Volume weight', detail: 'log(trade_count) so a wallet with 100 trades is meaningfully ahead of one with 5, but not 20× ahead.' },
      { label: 'Composite', detail: 'score = (accuracy × 0.4 + early_rate × 0.3 + log_norm(trades) × 0.2) × 100.' },
    ],
    caveats: [
      'Public on-chain history only — wallets may be controlled by the same entity, inflating apparent independence.',
      'Past accuracy on resolved markets does not guarantee future hit rate. Survivor bias is real.',
    ],
  },

  anomaly: {
    summary:
      'The anomaly detector flags Polymarket markets where short-window volume diverges sharply from the recent baseline, or where directional flow swings against price — both consistent with informed activity or manipulation attempts.',
    inputs: ['1-hour rolling volume', '7-day average volume', 'Buy/sell volume split', 'Wallet diversity'],
    steps: [
      { label: 'Volume spike', detail: 'Flag if volume_1h > avg_7d × spike_multiplier (default 3×).' },
      { label: 'Directional shift', detail: 'Flag if the buy/sell volume split flips by >20pp within an hour while price moves opposite.' },
      { label: 'Manipulation hint', detail: 'Flag if a small set of wallets (Herfindahl > 0.6) drives most of a spike.' },
    ],
    caveats: [
      'Anomalies are correlations, not proof of manipulation. Some legitimate news flow looks the same.',
      'Tune the multipliers per market — high-volume markets need stricter thresholds.',
    ],
  },

  polymarket_signal: {
    summary:
      'A Polymarket signal combines wallet quality, anomaly flags, and cross-market alignment to surface markets where smart money has taken a directional position. Confidence is qualitative, not a probability.',
    inputs: ['Top-quintile wallet positions', 'Anomaly flags', 'Cross-market direction (e.g., /ES, /MES, ETH, BTC)'],
    steps: [
      { label: 'Wallet consensus', detail: 'Count of top-decile wallets net long minus net short on the YES side.' },
      { label: 'Anomaly trigger', detail: 'Require a recent volume spike or directional shift to time the signal.' },
      { label: 'Cross-market check', detail: 'Confirm or downgrade the signal based on whether linked instruments agree.' },
      { label: 'Confidence', detail: 'STRONG when all three align; WEAK when only wallet consensus fires.' },
    ],
    caveats: [
      'Polymarket signals are not orders — there is no guaranteed path from "signal" to "PnL".',
      'Cross-market correlations break down under regime shifts; treat alignment as supportive context, not proof.',
    ],
  },

  // ── On-chain BTC ─────────────────────────────────────────
  mvrv: {
    summary:
      'MVRV (Market Value to Realised Value) compares the network market cap to the aggregate cost basis of every coin moved on-chain. Values below 1 mean the network is, on average, holding at a loss; well above 1 indicates broad unrealised profit.',
    inputs: ['Market cap (price × supply)', 'Realised cap (sum of UTXOs at last-moved price)'],
    steps: [
      { label: 'Market cap', detail: 'Spot price × circulating supply.' },
      { label: 'Realised cap', detail: 'Sum each UTXO at the price when it last moved on-chain.' },
      { label: 'Ratio', detail: 'MVRV = Market cap ÷ Realised cap.' },
      { label: 'Z-score (optional)', detail: 'Standardise against the asset\'s own historical distribution to flag extremes.' },
    ],
    caveats: [
      'Lost coins remain in realised cap forever, biasing the ratio low for older networks.',
      'MVRV is a cycle-level signal, not a timing tool — it can stay extended for months.',
    ],
  },
}
