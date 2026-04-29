// types/index.ts
// Single source of truth for all data shapes used across the app

// ─── Price & Market ──────────────────────────────────────────

export interface PriceSnapshot {
  price:   number
  prev:    number
  chg:     number
  pct:     number
  open:    number
  high:    number
  low:     number
  vol:     number
  date:    string
  source:  string
  updated: string
  error?:  string
}

export interface PriceHistory {
  ticker:   string
  period:   string
  interval?: string
  dates:    string[]
  open:     number[]
  high:     number[]
  low:      number[]
  close:    number[]
  volume:   number[]
  source:   string
  updated:  string
  error?:   string
}

// ─── Fundamentals (Analyse_Fondamental.txt indicators) ───────

export type DataQuality = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT AVAILABLE'

export interface Fundamentals {
  ticker:   string
  name:     string
  sector:   string
  industry: string
  exchange: string
  currency: string

  // Price
  price?:     number
  mcap?:      number   // billions
  ev?:        number   // billions
  beta?:      number
  h52?:       number
  l52?:       number
  avg_vol?:   number
  eps?:       number
  pb?:        number
  peg?:       number
  fwd_pe?:    number
  pe?:        number
  div_yield?: number

  // Core metrics (Analyse_Fondamental.txt)
  rev?:      number   // Revenue TTM (billions)
  ebitda?:   number   // EBITDA TTM (billions)
  fcf?:      number   // Free Cash Flow (billions)
  cfo?:      number   // Operating Cash Flow (billions)
  net_debt?: number   // Net Debt (billions)

  // I)  Debt/EBITDA   — Dette nette / EBITDA
  dEbitda?:  number
  // II) Interest Coverage — EBIT / Intérêts
  intCov?:   number
  // III) FCF Yield — FCF / Market Cap * 100
  fcfYld?:   number
  // V)  ROIC
  roic?:     number
  // VI) Margins
  gMgn?:     number   // Gross Margin
  opMgn?:    number   // Operating Margin
  preMgn?:   number   // Pretax Margin
  netMgn?:   number   // Net Margin
  // VII) ROE
  roe?:      number
  // VIII) Debt/Equity
  de?:       number
  // IX) EV/EBITDA
  evEbitda?: number

  // Historical arrays (5 years, oldest→newest)
  rev_hist?:    (number | null)[]
  ebitda_hist?: (number | null)[]
  fcf_hist?:    (number | null)[]
  netMgn_hist?: (number | null)[]
  opMgn_hist?:  (number | null)[]

  // Bank-specific
  nim?:      number   // XI) NIM
  npl?:      number   // XII) NPL
  cet1?:     number   // CET1 ratio
  costInc?:  number   // Cost-to-Income
  ltd?:      number   // Loan-to-Deposit

  // NEW indicators
  cagr?:      number   // CAGR Revenue %
  alpha?:     number   // Jensen's Alpha %
  cashRunway?:number   // Cash Runway months

  // Metadata
  data_quality?:  DataQuality
  source?:        string
  updated?:       string
  _fund_source?:  string
  _fund_updated?: string
  error?:         string
}

// ─── Macro (LE_CHANGEMENT_DANS_LA_BOURSE.txt) ────────────────

export interface MacroSnapshot {
  // 1. LES TAUX
  us10y?:   number
  us2y?:    number
  us3m?:    number
  spread?:  number   // 10Y-2Y

  // 2. LE CRÉDIT
  hyg_lqd?: number
  oas?:     number   // HY OAS spread

  // 3. LE POSITIONNEMENT
  vix?:     number

  // 4. LA LARGEUR
  rsp_spy?: number
  ad_line?: number

  // 5. LA LIQUIDITÉ
  dxy?:         number
  wti?:         number
  brent?:       number
  fed_balance?: number   // Fed balance sheet (trillions)
  m2_growth?:   number   // YoY %
  inflation_be?: number  // 10Y Breakeven
  recession_prob?: number

  // History arrays (52 weeks)
  us10y_h?:     number[]
  us2y_h?:      number[]
  us3m_h?:      number[]
  spread_h?:    number[]
  vix_h?:       number[]
  dxy_h?:       number[]
  wti_h?:       number[]
  brent_h?:     number[]
  hyg_lqd_h?:   number[]
  oas_h?:       number[]
  rsp_spy_h?:   number[]
  ad_h?:        number[]
  fed_bal_h?:   number[]
  liq_h?:       number[]
  inflation_h?: number[]
  spy_h?:       number[]
  // Optional global indices used by MacroPage for cross-region context
  vstoxx_h?:    number[]
  nikkei_h?:    number[]
  hsi_h?:       number[]
  weeks?:       string[]   // labels

  source?:          string
  updated?:         string
  fred_available?:  boolean
}

// ─── COT (CFTC.gov) ──────────────────────────────────────────

export interface COTCategory {
  name:      string
  long:      number
  short:     number
  net:       number
  chg:       number
  chg_long:  number
  chg_short: number
}

export interface COTEntry {
  n:        string   // contract name
  report_type?: 'tff' | 'disagg'
  categories?: Record<string, COTCategory>
  am:       number   // Asset Manager net (legacy)
  amc:      number   // WoW change
  lm:       number   // Leveraged Money net (legacy)
  lmc:      number   // WoW change
  am_long?:  number
  am_short?: number
  lm_long?:  number
  lm_short?: number
  dl_long?:  number
  dl_short?: number
  dl_net?:   number
  or_long?:  number
  or_short?: number
  or_net?:   number
  oi?:      number
  signal:   string
  date?:    string
  source?:  string
  updated?: string
  error?:   string
}

// ─── Risk Engine ─────────────────────────────────────────────

export type Regime = 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF'
export type OpportunityStatus = '▲ BUY' | '▲ WATCHLIST' | '▼ HIGH RISK'

export interface RiskScore {
  total:       number   // 0–100
  regime:      Regime
  components: {
    volatileity:   number
    macro:        number
    financial:    number
    valuation:    number
    liquidity:    number
  }
  warnings: RiskWarning[]
  computed: string   // timestamp
}

export interface RiskWarning {
  id:        string
  label:     string
  trigger:   string
  value:     number | string
  threshold: number | string
  severity:  'low' | 'medium' | 'high'
}

export interface OpportunitySignal {
  status:     OpportunityStatus
  score:      number   // 0–100
  confidence: 'Low' | 'Medium' | 'High'
  reasons:    string[]
  conditions: string[]   // "what would change my mind"
}

// ─── Sector Typing (IMPORTANT_INDICATORS_BY_SECTOR.odt) ──────

export type SectorType = 'normal' | 'cyclical' | 'tech' | 'bank'

export interface IndicatorDef {
  id:      string
  n:       string   // display name
  formula: string
  th:      string   // thresholds text
  why:     string   // explanation
  unit?:   string
}

export interface SectorGroup {
  [groupName: string]: IndicatorDef[]
}

export interface SectorMapping {
  label:    string
  source:   string
  warnings?: string[]
  groups:   SectorGroup
}

// ─── Watchlist ───────────────────────────────────────────────

export interface WatchlistEntry {
  sym:     string
  addedAt: string
}

// ─── API Response wrappers ───────────────────────────────────

export interface ApiResponse<T> {
  data:    T
  source:  string
  updated?: string
  error?:  string
}

// ─── Signal helpers ──────────────────────────────────────────

export type SignalColor = 'green' | 'yellow' | 'red' | 'gray'

export interface Signal {
  color: SignalColor
  label: string
  css:   string
}
