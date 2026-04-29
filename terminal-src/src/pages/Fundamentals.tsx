// pages/Fundamentals.tsx
// Each indicator card shows last 8 quarters (Q1–Q8) as bar chart + YoY delta + trend
// LIVE MODE: real data from backend (yfinance + FMP)
// SIM  MODE: deterministic simulation when backend is offline
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuarterly, fetchNextEarnings, fetchFundamentals, type QuarterlyData } from '@/api/client'
import { useStore } from '@/store/useStore'

const F = "inherit"

// ─── Sector detection ─────────────────────────────────────────
type Sector = 'normal' | 'cyclical' | 'tech' | 'bank'

const SECTOR_MAP: Record<string, Sector> = {
  JPM:'bank', BAC:'bank', GS:'bank', MS:'bank', WFC:'bank', C:'bank', USB:'bank',
  PNC:'bank', BK:'bank', STT:'bank', SCHW:'bank', TFC:'bank', CFG:'bank',
  DB:'bank', UBS:'bank', HSBC:'bank', BNP:'bank', SAN:'bank',
  // Mature / profitable tech → NORMAL (your doc: "boîte normale = entreprise déjà connue")
  AAPL:'normal', MSFT:'normal', NVDA:'normal', GOOGL:'normal', GOOG:'normal', META:'normal',
  AMZN:'normal', TSMC:'normal', ASML:'normal', ORCL:'normal', CRM:'normal', ADBE:'normal',
  AMD:'normal', INTC:'normal', QCOM:'normal', AVGO:'normal', TXN:'normal', MU:'normal',
  NFLX:'normal', INTU:'normal', NOW:'normal', PANW:'normal',
  // Early-stage / growth / not yet profitable → TECH
  PLTR:'tech', SNOW:'tech', DDOG:'tech', NET:'tech', CRWD:'tech', ZM:'tech', FLY:'tech', RKLB:'tech',
  UBER:'tech', SHOP:'tech', SPOT:'tech',
  TSLA:'cyclical', F:'cyclical', GM:'cyclical', CAT:'cyclical', DE:'cyclical',
  X:'cyclical', NUE:'cyclical', FCX:'cyclical', VALE:'cyclical', RIO:'cyclical',
  DAL:'cyclical', UAL:'cyclical', CCL:'cyclical', RCL:'cyclical',
  NEM:'cyclical', GOLD:'cyclical', BA:'cyclical',
  JNJ:'normal', PG:'normal', KO:'normal', PEP:'normal', WMT:'normal',
  COST:'normal', HD:'normal', XOM:'normal', CVX:'normal', V:'normal',
  MA:'normal', UNH:'normal', LLY:'normal', ABBV:'normal', MRK:'normal',
  PFE:'normal', DIS:'normal', NEE:'normal', RTX:'normal',
  LMT:'normal', HON:'normal', GE:'normal', SPY:'normal', QQQ:'normal',
}

function detectSector(sym: string): Sector {
  return SECTOR_MAP[sym.toUpperCase()] ?? 'normal'
}

const SECTOR_META: Record<Sector, { label: string; emoji: string; color: string; warn: string | null }> = {
  normal:   { emoji:'', color:'#388bfd', label:'Standard — Industry / Consumer / Mature Tech', warn: null },
  cyclical: { emoji:'', color:'#388bfd', label:'Cyclical — Auto / Materials / Shipping / Steel',
    warn:'WARNING: ratios at cycle peak are misleading — analyze over 3-5 years minimum' },
  tech:     { emoji:'', color:'#3fb950', label:'Tech / Growth — AI / SaaS / Biotech',
    warn:'WARNING: not yet profitable + dilution risk — FCF burn and cash runway are priority' },
  bank:     { emoji:'', color:'#7c4dff', label:'Bank / Financial — special case',
    warn:'Debt/EBITDA and Interest Coverage = NOT RELEVANT — use NPL + CET1 + NIM + P/B×ROE' },
}

// ─── Signal evaluation ────────────────────────────────────────
type Sig = 'green' | 'yellow' | 'red' | 'na'
const COL: Record<Sig, string> = { green:'#3fb950', yellow:'#d29922', red:'#f85149', na:'#21262d' }

function evalSig(id: string, v: number | null): { sig: Sig; label: string } {
  if (v == null) return { sig:'na', label:'N/A' }
  const rules: Record<string, () => { sig: Sig; label: string }> = {
    dEbitda:    () => v<2   ?{sig:'green',label:'Excellent (<2x)'}    :v<3?{sig:'yellow',label:'Good (2-3x)'}       :v<4?{sig:'yellow',label:'Caution (3-4x)'}  :{sig:'red',label:'DANGER (>4x)'},
    intCov:     () => v>5   ?{sig:'green',label:'Strong (>5x)'}       :v>2?{sig:'yellow',label:'Moderate (2-5x)'}      :v>1?{sig:'red',label:'Risky (<2x)'}         :{sig:'red',label:'ALARM (<1x)'},
    fcf:        () => v>10  ?{sig:'green',label:'Strong FCF'}            :v>0?{sig:'yellow',label:'Positive FCF'}       :{sig:'red',label:'Burn (negative)'},
    fcfYld:     () => v>8   ?{sig:'green',label:'Undervalued (>8%)'} :v>5?{sig:'green',label:'Fair (5-8%)'}     :v>3?{sig:'yellow',label:'OK (3-5%)'}          :{sig:'red',label:'Expensive (<3%)'},
    roic:       () => v>15  ?{sig:'green',label:'Excellent (>15%)'}    :v>10?{sig:'green',label:'Good (10-15%)'}     :v>8?{sig:'yellow',label:'Moderate (8-10%)'}      :{sig:'red',label:'Weak (<8%)'},
    opMgn:      () => v>20  ?{sig:'green',label:'Excellent (>20%)'}    :v>10?{sig:'green',label:'Good (10-20%)'}     :v>5?{sig:'yellow',label:'Moderate (5-10%)'}      :{sig:'red',label:'Weak (<5%)'},
    netMgn:     () => v>15  ?{sig:'green',label:'Excellent (>15%)'}    :v>8?{sig:'green',label:'Good (8-15%)'}       :v>5?{sig:'yellow',label:'Moderate (5-8%)'}       :{sig:'red',label:'Fragile (<5%)'},
    cfo:        () => v>20  ?{sig:'green',label:'Strong'}                :v>0?{sig:'yellow',label:'Positive'}           :{sig:'red',label:'Negative (burn)'},
    evEbitda:   () => v<8   ?{sig:'green',label:'Cheap (<8x)'}      :v<12?{sig:'yellow',label:'Fair (8-12x)'}   :v<15?{sig:'yellow',label:'Expensive (12-15x)'}    :{sig:'red',label:'Very expensive (>15x)'},
    pe:         () => v<12  ?{sig:'green',label:'Cheap (<12x)'}     :v<20?{sig:'yellow',label:'Fair (12-20x)'}  :v<30?{sig:'yellow',label:'Expensive (20-30x)'}    :{sig:'red',label:'Very expensive (>30x)'},
    de:         () => v<0.5 ?{sig:'green',label:'Low (<0.5x)'}      :v<1?{sig:'yellow',label:'Normal (0.5-1x)'}   :{sig:'red',label:'Leveraged (>1x)'},
    gMgn:       () => v>60  ?{sig:'green',label:'Scalable (>60%)'}     :v>40?{sig:'green',label:'Good (40-60%)'}     :v>20?{sig:'yellow',label:'Moderate (20-40%)'}   :{sig:'red',label:'Weak (<20%)'},
    roe:        () => v>15  ?{sig:'green',label:'Good (>15%)'}          :v>10?{sig:'yellow',label:'Moderate (10-15%)'}   :{sig:'red',label:'Weak (<10%)'},
    preMgn:     () => v>20  ?{sig:'green',label:'Strong (>20%)'}     :v>10?{sig:'yellow',label:'Good (>10%)'}       :{sig:'red',label:'Weak (<10%)'},
    cagr:       () => v>15  ?{sig:'green',label:'Strong (>15%)'}         :v>8?{sig:'yellow',label:'Moderate (8-15%)'}     :{sig:'red',label:'Slow (<8%)'},
    beta:       () => v<0.8 ?{sig:'green',label:'Defensive (<0.8)'}     :v<1.3?{sig:'yellow',label:'Market (~1)'}     :{sig:'red',label:'Volatile (>1.3)'},
    vix:        () => v<18  ?{sig:'green',label:'Calm (<18)'}         :v<25?{sig:'yellow',label:'Stress (18-25)'}   :v<35?{sig:'red',label:'Strong stress (25–35)'}  :{sig:'red',label:'PANIC (>35)'},
    cashRunway: () => v>24  ?{sig:'green',label:'Safe (>24m)'}     :v>12?{sig:'yellow',label:'Monitor (12-24m)'}:{sig:'red',label:'DANGER (<12m)'},
    npl:        () => v<2   ?{sig:'green',label:'Clean (<2%)'}        :v<5?{sig:'yellow',label:'Monitor (2-5%)'} :{sig:'red',label:'Risk (>5%)'},
    deposits:   () => v>2   ?{sig:'green',label:'Growth'}          :v>0?{sig:'yellow',label:'Stable'}            :{sig:'red',label:'Decline'},
    cet1:       () => v>14  ?{sig:'green',label:'Strong (>14%)'}       :v>11?{sig:'yellow',label:'OK (11-14%)'}      :{sig:'red',label:'Fragile (<11%)'},
    pb:         () => v<1   ?{sig:'green',label:'Below book (<1x)'}     :v<1.5?{sig:'yellow',label:'Normal (1-1.5x)'} :{sig:'red',label:'Expensive (>1.5x)'},
    nim:        () => v>3   ?{sig:'green',label:'Strong (>3%)'}          :v>2?{sig:'yellow',label:'OK (2-3%)'}         :{sig:'red',label:'Weak (<2%)'},
    costInc:    () => v<50  ?{sig:'green',label:'Efficient (<50%)'}   :v<65?{sig:'yellow',label:'OK (50-65%)'}      :{sig:'red',label:'Costly (>65%)'},
    ltd:        () => v<80  ?{sig:'green',label:'Liquid (<80%)'}      :v<100?{sig:'yellow',label:'Tight (80-100%)'} :{sig:'red',label:'Risk (>100%)'},
    divPay:     () => v<50  ?{sig:'green',label:'Sustainable (<50%)'}   :v<70?{sig:'yellow',label:'Stretched (50-70%)'}   :{sig:'red',label:'Risky (>70%)'},
    alpha:      () => v>5   ?{sig:'green',label:'Outperformance (>5%)'} :v>0?{sig:'yellow',label:'Positive (0-5%)'}   :v>-5?{sig:'yellow',label:'Slight underperf'}:{sig:'red',label:'Underperformance (<-5%)'},
  }
  return rules[id]?.() ?? { sig:'yellow', label:'—' }
}

// ─── Quarterly data generator ─────────────────────────────────
// Returns 8 quarters: oldest first → newest last
// Labels: Q1 2024, Q2 2024, ... Q4 2025, Q1 2026
function makeQtrs(base: number | null, trend: number, noise: number, seed: number): (number | null)[] {
  if (base == null) return Array(8).fill(null)
  let s = (seed * 1664525 + 1013904223) >>> 0
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const out: number[] = []
  let v = base * (0.75 + rand() * 0.15)  // start ~25% below current
  for (let i = 0; i < 8; i++) {
    v = v * (1 + trend * 0.01) + (rand() - 0.5) * noise
    out.push(parseFloat(v.toFixed(3)))
  }
  return out
}

// Quarter labels for last 8 quarters ending Q1 2026
const QTRLS = ['Q1\'24','Q2\'24','Q3\'24','Q4\'24','Q1\'25','Q2\'25','Q3\'25','Q4\'25']

// ─── Indicator definition ─────────────────────────────────────
interface Ind {
  rank: number; id: string; name: string
  unit: string        // '%', 'x', '$B', 'm', ''
  desc: string
  formula: string
  thresholds: string
  trap?: string
  // quarterly chart style
  qTrend: number      // % drift per quarter (positive = growing)
  qNoise: number      // noise relative to value
  qSeed:  number
  isInverse?: boolean // lower = better (for bar coloring: debt, OAS etc)
}

// A) Normal — 16
const IND_NORMAL: Ind[] = [
  {rank:1,  id:'dEbitda',  name:'Debt / EBITDA',        unit:'x',  desc:'Debt crash risk',            formula:'Net Debt ÷ EBITDA',                        thresholds:'<2x excellent · 2-3x good · 3-4x caution · >4x danger', trap:'Very misleading for cyclicals — always check 3-5 years', qTrend:-0.5,qNoise:0.1,qSeed:1,  isInverse:true },
  {rank:2,  id:'intCov',   name:'Interest Coverage',    unit:'x',  desc:'Rate resistance',        formula:'EBIT ÷ Interest Expense',                             thresholds:'>5x strong · 2-5x moderate · <2x risky · <1x ALARM',      trap:'<1x = cannot pay interest',                  qTrend:0.3, qNoise:1,  qSeed:2  },
  {rank:3,  id:'fcf',      name:'FCF',                  unit:'$B', desc:'Real cash generated',               formula:'FCF = CFO − Capex',                           thresholds:'Positive growing · Negative = burn',                      trap:'CFO < Net Income long term = earnings not cash-backed',  qTrend:2,   qNoise:3,  qSeed:3  },
  {rank:4,  id:'fcfYld',   name:'FCF Yield',            unit:'%',  desc:'Stock price vs cash',       formula:'FCF ÷ Market Cap × 100',                      thresholds:'>8% undervalued · 5-8% fair · 3-5% expensive · <3% very expensive', qTrend:0.1,qNoise:0.2,qSeed:4 },
  {rank:5,  id:'roic',     name:'ROIC',                 unit:'%',  desc:'True quality of returns',              formula:'NOPAT ÷ Invested Capital',                     thresholds:'>15% excellent · 10-15% good · <8% moderate · <5% weak',  qTrend:0.5, qNoise:1,  qSeed:5  },
  {rank:6,  id:'opMgn',    name:'Operating Margin',     unit:'%',  desc:'Business profitability',       formula:'EBIT ÷ Revenue',                              thresholds:'>20% excellent · 10-20% good · 5-10% moderate · <5% weak',qTrend:0.3, qNoise:0.8,qSeed:6  },
  {rank:7,  id:'netMgn',   name:'Net Margin',           unit:'%',  desc:'Net profit after all',      formula:'Net Income ÷ Revenue',                        thresholds:'>15% excellent · 8-15% good · <5% fragile',              qTrend:0.3, qNoise:0.7,qSeed:7  },
  {rank:8,  id:'cfo',      name:'CFO',                  unit:'$B', desc:'Operating cash flow',          formula:'Net Income + D&A ± BFR',                      thresholds:'Positive stable · CFO < Net Income = caution',           qTrend:1.5, qNoise:2,  qSeed:8  },
  {rank:9,  id:'evEbitda', name:'EV / EBITDA',          unit:'x',  desc:'True business price',      formula:'EV = (MktCap + Debt − Cash) ÷ EBITDA',       thresholds:'<8x cheap · 8-12x fair · 12-15x expensive · >15x very expensive',trap:'Do not compare across sectors',qTrend:-0.2,qNoise:0.5,qSeed:9,isInverse:true},
  {rank:10, id:'pe',       name:'P/E Ratio',            unit:'x',  desc:'Price vs earnings',        formula:'Price ÷ Earnings Per Share',                 thresholds:'<12x cheap · 12-20x fair · 20-30x expensive · >30x very expensive',qTrend:-0.1,qNoise:0.3,qSeed:9.5,isInverse:true},
  {rank:11, id:'de',       name:'Debt / Equity',        unit:'x',  desc:'Leverage level',                formula:'Total Debt ÷ Equity',                        thresholds:'<0.5x low · 0.5-1x normal · >1x leveraged',             trap:'High ROE can be artificial from share buybacks',    qTrend:-0.2,qNoise:0.1,qSeed:10, isInverse:true},
  {rank:11, id:'gMgn',     name:'Gross Margin',         unit:'%',  desc:'Pricing power',              formula:'(Revenue − COGS) ÷ Revenue',                  thresholds:'>60% scalable · 40-60% good · 20-40% moderate · <20% weak',qTrend:0.1, qNoise:0.5,qSeed:11 },
  {rank:12, id:'roe',      name:'ROE',                  unit:'%',  desc:'Shareholder return',    formula:'Net Income ÷ Equity',                         thresholds:'>15% good · 10-15% moderate · <10% weak',                trap:'ROE inflated by buybacks = trap',                 qTrend:0.4, qNoise:1,  qSeed:12 },
  {rank:13, id:'preMgn',   name:'Pretax Margin',        unit:'%',  desc:'After debt, before taxes',   formula:'EBT ÷ Revenue',                               thresholds:'>20% strong · >10% good',                               qTrend:0.3, qNoise:0.6,qSeed:13 },
  {rank:14, id:'cagr',     name:'CAGR Revenue',         unit:'%',  desc:'Compound annual growth',formula:'(End÷Start)^(1/n) − 1',                      thresholds:'>15% strong · 8-15% moderate · <8% slow',                     qTrend:0.1, qNoise:0.5,qSeed:14 },
  {rank:15, id:'beta',     name:'Beta',                 unit:'',   desc:'Volatility vs market',       formula:'Cov(Rp, Rm) ÷ Var(Rm) — 2Y weekly',          thresholds:'~1 market · >1.3 volatilee · <0.8 defensive',               qTrend:0.0, qNoise:0.05,qSeed:15},
  {rank:16, id:'alpha',    name:'Alpha (Jensen)',       unit:'%',  desc:'Outperformance vs market',   formula:'Rp − (Rf + β × (Rm − Rf)) — annualized 2Y',   thresholds:'>5% excellent · >0% positive · <0% underperformance',     qTrend:0.1, qNoise:1.5,qSeed:16.5},
  {rank:17, id:'vix',      name:'VIX (context)',       unit:'',   desc:'Market fear',             formula:'Implied vol on S&P 500 options',          thresholds:'<18 calm · 18-25 stress · 25-35 fear · >35 panic',    qTrend:-0.3,qNoise:1.5,qSeed:16, isInverse:true},
]

// B) Cyclical — 14
const IND_CYCLICAL: Ind[] = [
  {rank:1, id:'dEbitda',  name:'Debt / EBITDA — PRIORITY #1', unit:'x', desc:'Over full cycle',     formula:'Net Debt ÷ EBITDA — review 3-5 years',         thresholds:'<2x excellent · >4x DANGER (cyclical!)',                 trap:'At cycle peak = always too good',                  qTrend:-0.3,qNoise:0.2,qSeed:101,isInverse:true},
  {rank:2, id:'intCov',   name:'Interest Coverage',           unit:'x', desc:'Interest payments are fixed', formula:'EBIT ÷ Interest Expense',                        thresholds:'>5x strong · <1x ALARM',                                trap:'At cycle bottom profits collapse',             qTrend:0.3, qNoise:0.8,qSeed:102},
  {rank:3, id:'cfo',      name:'CFO — Multi-year',      unit:'$B',desc:'View over full cycle', formula:'Cash from Operations — 3-5 year minimum',      thresholds:'Positive on average across cycle = solid',                  trap:'One peak year hides the real picture',             qTrend:1,   qNoise:3,  qSeed:103},
  {rank:4, id:'fcf',      name:'FCF — Multi-year',      unit:'$B',desc:'FCF over full cycle',  formula:'CFO − Capex — analyze 3-5 year minimum',      thresholds:'Positive on average across cycle = good',                    trap:'FCF at peak = always too flattering',                   qTrend:1,   qNoise:2.5,qSeed:104},
  {rank:5, id:'de',       name:'Debt / Equity',               unit:'x', desc:'Leverage amplifies losses', formula:'Total Debt ÷ Equity',                       thresholds:'<0.5x low · >1x leveraged · >3x DANGER cyclical',       trap:'OK at peak can explode at cycle bottom',          qTrend:-0.1,qNoise:0.1,qSeed:105,isInverse:true},
  {rank:6, id:'opMgn',    name:'Operating Margin — Stability',unit:'%', desc:'Stability > level',    formula:'EBIT ÷ Revenue — check STABILITY',      thresholds:'>15% excellent · 3-8% moderate · <3% fragile at bottom',    trap:'High margin at peak does not predict resilience',        qTrend:0.2, qNoise:1,  qSeed:106},
  {rank:7, id:'roic',     name:'ROIC — Multi-year average',  unit:'%', desc:'Cycle average',      formula:'NOPAT ÷ Invested Capital — 3-5 year average',    thresholds:'>12% cycle avg excellent · 7-12% good · <5% weak',   trap:'ROIC at peak = always too high',                     qTrend:0.4, qNoise:0.8,qSeed:107},
  {rank:8, id:'evEbitda', name:'EV / EBITDA — Use with caution', unit:'x', desc:'Use with extreme caution',formula:'EV ÷ EBITDA',                          thresholds:'<6x cheap · 6-10x fair · >10x expensive',                trap:'EBITDA can collapse 50-80% in recession',       qTrend:-0.2,qNoise:0.5,qSeed:108,isInverse:true},
  {rank:9, id:'netMgn',   name:'Net Margin',                  unit:'%', desc:'Bottom-cycle stress test',formula:'Net Income ÷ Revenue',                     thresholds:'>10% resilient · <3% fragile · Negative = loss',         qTrend:0.3, qNoise:0.8,qSeed:109},
  {rank:10,id:'gMgn',     name:'Gross Margin',                unit:'%', desc:'Pricing power + stability',formula:'(Revenue − COGS) ÷ Revenue',               thresholds:'>35% strong · 20-35% moderate · <15% weak',                 trap:'Low margin normal for steel/shipping',               qTrend:0.1, qNoise:0.5,qSeed:110},
  {rank:11,id:'fcfYld',   name:'FCF Yield — If FCF stable',   unit:'%', desc:'Only if FCF stable over cycle', formula:'FCF ÷ Market Cap × 100',                    thresholds:'>8% undervalued · <3% expensive',                           trap:'FCF yield from 1 peak year = classic value trap',    qTrend:0.1, qNoise:0.3,qSeed:111},
  {rank:12,id:'cagr',     name:'CAGR Revenue',                unit:'%', desc:'Full-cycle growth', formula:'(End÷Start)^(1/n) − 1',                    thresholds:'>10% strong · 5-10% moderate · <5% slow',                     trap:'Calculate over full cycle not 1 peak year',            qTrend:0.1, qNoise:0.4,qSeed:112},
  {rank:13,id:'beta',     name:'Beta',                        unit:'',  desc:'Structural high volatileity',formula:'Cov(Rp, Rm) ÷ Var(Rm)',               thresholds:'β>1.2 typical · β>2 very cyclical',                       qTrend:0.0, qNoise:0.05,qSeed:113},
  {rank:14,id:'vix',      name:'VIX (macro context)',        unit:'',  desc:'Crucial for cyclicals',  formula:'Implied vol S&P 500',               thresholds:'<18 favorable · >35 counter-cyclical opp',                qTrend:-0.3,qNoise:1.5,qSeed:114,isInverse:true},
]

// C) Tech — 13
const IND_TECH: Ind[] = [
  {rank:1, id:'cfo',       name:'CFO — Trend (priority #1)', unit:'$B',desc:'Burn or improvement',   formula:'Cash from Operations — analyze TREND',    thresholds:'Positive growing excellent · Negative improving ok',     trap:'Stagnant CFO = model not scalable',                    qTrend:2,   qNoise:2,  qSeed:201},
  {rank:2, id:'fcf',       name:'FCF — Burn / Path to positive',unit:'$B',desc:'Real free cash',       formula:'FCF = CFO − Capex',                           thresholds:'Negative ok if path visible · Accelerating burn = danger', trap:'Promising profitability without delivering = growth trap',qTrend:2.5, qNoise:2,  qSeed:202},
  {rank:3, id:'cashRunway',name:'Cash Runway',               unit:'m', desc:'Survival before dilution',  formula:'Total cash ÷ Annual burn rate',                    thresholds:'>24m safe · 12-24m monitor · <12m DANGER',         trap:'<12m without positive FCF = imminent dilution',            qTrend:1,   qNoise:3,  qSeed:203},
  {rank:4, id:'gMgn',      name:'Gross Margin — >60% required',unit:'%', desc:'Model scalability',  formula:'(Revenue − COGS) ÷ Revenue',                  thresholds:'>70% excellent SaaS · 60-70% very good · <40% question model',trap:'Low gross margin = scaling is difficult',               qTrend:0.3, qNoise:0.5,qSeed:204},
  {rank:5, id:'opMgn',     name:'Operating Margin — Trend',unit:'%',desc:'Must improve',      formula:'EBIT ÷ Revenue',                              thresholds:'Must improve each quarter — target: positive <24m',trap:'Stagnation after 3+ years = model does not scale',         qTrend:1.5, qNoise:1,  qSeed:205},
  {rank:6, id:'de',        name:'Debt / Equity — Often ~0', unit:'x',desc:'If high = red flag',     formula:'Total Debt ÷ Equity',                       thresholds:'~0 normal · >0.5 question · >1 RED FLAG',              trap:'High debt in early tech = model problem',          qTrend:-0.1,qNoise:0.05,qSeed:206,isInverse:true},
  {rank:7, id:'intCov',    name:'Interest Coverage — If debt exists',unit:'x',desc:'If debt exists',       formula:'EBIT ÷ Interest Expense',                             thresholds:'>5x strong · <2x risky · N/A if no debt',           qTrend:0.3, qNoise:0.5,qSeed:207},
  {rank:8, id:'roic',      name:'ROIC — When mature',        unit:'%',desc:'Maturity phase only',formula:'NOPAT ÷ Invested Capital',                    thresholds:'>15% excellent · <8% question · N/A if NOPAT negative', trap:'ROIC in early phase = not relevant',                   qTrend:1,   qNoise:1.5,qSeed:208},
  {rank:9, id:'evEbitda',  name:'EV / EBITDA — If exists',    unit:'x',desc:'If EBITDA negative: N/A', formula:'EV ÷ EBITDA (or EV/Revenue)',               thresholds:'<15x good · 15-25x ok · >25x expensive mature tech',           qTrend:-0.5,qNoise:3,  qSeed:209,isInverse:true},
  {rank:10,id:'fcfYld',    name:'FCF Yield — If FCF stable',  unit:'%',desc:'Mature phase only',  formula:'FCF ÷ Market Cap × 100',                     thresholds:'>5% fair · >8% undervalued · N/A if FCF negative',   trap:'One-time positive FCF = trap',                      qTrend:0.2, qNoise:0.5,qSeed:210},
  {rank:11,id:'cagr',      name:'CAGR Revenue',               unit:'%',desc:'Growth drives valuation',formula:'(Revenue end ÷ start)^(1/n) − 1',        thresholds:'>40% hyper · 25-40% strong · <15% deceleration warning',trap:'Deceleration + high valuation = double penalty',      qTrend:0.5, qNoise:1,  qSeed:211},
  {rank:12,id:'beta',      name:'Beta — Structurally high',unit:'', desc:'Very sensitive to cycles', formula:'Cov(Rp, Rm) ÷ Var(Rm)',                    thresholds:'β>1.5 typical · β>2 extreme',                             qTrend:0.0, qNoise:0.08,qSeed:212},
  {rank:13,id:'vix',       name:'VIX — Tech highly sensitive',   unit:'', desc:'Tech drop + VIX >30 = entry?',formula:'S&P 500 implied vol',               thresholds:'<18 favorable · >30 caution · >35 if runway ok',         qTrend:-0.3,qNoise:1.5,qSeed:213,isInverse:true},
]

// D) Bank — 14
const IND_BANK: Ind[] = [
  {rank:1, id:'npl',     name:'NPL — Non-Performing Loans', unit:'%',desc:'Loan portfolio quality', formula:'Loans past-due 90d+ ÷ Total loans × 100',    thresholds:'<2% clean · 2-5% monitor · >5% risk',              trap:'Can spike rapidly in recession',            qTrend:-0.1,qNoise:0.08,qSeed:301,isInverse:true},
  {rank:2, id:'deposits',name:'Coverage Ratio (Provisions/NPL)',  unit:'%',desc:'Losses already provisioned', formula:'Provisions ÷ NPL × 100',                    thresholds:'>100% excellent · 70-100% good · <50% risky',             trap:'Low coverage = forced provisions in crisis',         qTrend:0.3, qNoise:2,  qSeed:302},
  {rank:3, id:'cet1',    name:'CET1 Ratio',                unit:'%',desc:'Regulatory capital cushion',formula:'CET1 ÷ Risk-Weighted Assets × 100',        thresholds:'>14% strong · 11-14% compliant · <11% fragile',            trap:'Regulator can force capital raise if too low',      qTrend:0.2, qNoise:0.2,qSeed:303},
  {rank:4, id:'pb',      name:'P/B + ROE (combo)',          unit:'x',desc:'Bank valuation',        formula:'Price ÷ Book Value (Equity)',                thresholds:'P/B<1 + ROE>10% = opportunity · P/B>1.5 + ROE<8% = expensive',trap:'P/B<1 alone can be value trap',                       qTrend:0.1, qNoise:0.05,qSeed:304},
  {rank:5, id:'roe',     name:'ROE (with P/B)',       unit:'%',desc:'Return on capital',       formula:'Net Income ÷ Equity × 100',                 thresholds:'>12% excellent · 8-12% fair · <6% weak',             trap:'ROE<8% + P/B>1 = poor/expensive',                            qTrend:0.3, qNoise:0.5,qSeed:305},
  {rank:6, id:'nim',     name:'NIM — Net Interest Margin',  unit:'%',desc:'What the bank earns',     formula:'(Interest received − paid) ÷ Earning assets',thresholds:'>3% strong · 2-3% OK · <2% weak',                trap:'NIM compressed by low rates = less revenue',         qTrend:0.1, qNoise:0.08,qSeed:306},
  {rank:7, id:'costInc', name:'Cost-to-Income Ratio',       unit:'%',desc:'Operating efficiency',  formula:'Costs ÷ Net revenue × 100',                thresholds:'<45% excellent · <55% good · 55-65% ok · >70% problem',  trap:'High fixed costs = vulnerable if revenue drops',   qTrend:-0.2,qNoise:0.5,qSeed:307,isInverse:true},
  {rank:8, id:'ltd',     name:'Loan-to-Deposit (L/D)',      unit:'%',desc:'Liquidity: loans vs deposits', formula:'Total Loans ÷ Total Deposits × 100',          thresholds:'<80% liquid · 80-100% normal · >100% bank run risk',   trap:'L/D >100 + market stress = bank run risk (cf. SVB 2023)',    qTrend:0.1, qNoise:0.5,qSeed:308},
  {rank:9, id:'divPay',  name:'Deposits Growth + Div Payout',unit:'%',desc:'Deposit stability + dividend',formula:'Dividend ÷ Net Income × 100',           thresholds:'Deposits +2% stable · Payout <50% sustainable · >70% risky',trap:'Dividend >70% = unsustainable if profits decline',  qTrend:-0.1,qNoise:1,  qSeed:309,isInverse:true},
  {rank:10,id:'de',      name:'Debt / Equity (secondary)',  unit:'x',desc:'Naturally high for banks', formula:'Total Debt ÷ Equity',                   thresholds:'Naturally high — DO NOT compare with industrials',        trap:'DO NOT be alarmed — use CET1 instead',          qTrend:0.0, qNoise:0.2,qSeed:310,isInverse:true},
  {rank:11,id:'cfo',     name:'CFO / FCF (indicative)',       unit:'$B',desc:'Less clean for banks', formula:'Cash from Operations',                     thresholds:'Positive = good indicator',                                 trap:'Analyze differently from industrial companies',   qTrend:0.5, qNoise:2,  qSeed:311},
  {rank:12,id:'intCov',  name:'Interest Cov (peu pertinent)',unit:'x',desc:'PEU PERTINENT banque',       formula:'EBIT ÷ Interest (rarely applicable)',          thresholds:'PEU PERTINENT — utiliser NIM et CET1',                    trap:'Applying Debt/EBITDA to a bank = classic error', qTrend:0.0, qNoise:0.3,qSeed:312},
  {rank:13,id:'beta',    name:'Beta — Sensitive to credit/rates', unit:'', desc:'Cyclical with credit/rates',  formula:'Cov(Rp, Rm) ÷ Var(Rm)',                   thresholds:'β~1 typical · β>1.3 cyclical-credit',                     qTrend:0.0, qNoise:0.05,qSeed:313},
  {rank:14,id:'vix',     name:'VIX — Valuation context',  unit:'', desc:'Bank macro context',      formula:'S&P 500 implied vol',                    thresholds:'<18 favorable · >35 opportunity if NPL and CET1 OK',       qTrend:-0.3,qNoise:1.5,qSeed:314,isInverse:true},
]

const INDS: Record<Sector, Ind[]> = { normal:IND_NORMAL, cyclical:IND_CYCLICAL, tech:IND_TECH, bank:IND_BANK }

// ─── Simulated current values per ticker ─────────────────────
type FundData = Record<string, number | null>
const SIM: Record<string, FundData> = {
  AAPL: {pe:32,dEbitda:0.42,intCov:28,fcf:107,fcfYld:3.4,roic:44,opMgn:30.0,netMgn:25.3,cfo:130,evEbitda:22.4,de:1.74,gMgn:44.1,roe:160,preMgn:28.0,cagr:8.2,beta:1.24,alpha:3.2,vix:19.2},
  MSFT: {pe:35,dEbitda:0.5,intCov:35,fcf:75,fcfYld:2.3,roic:38,opMgn:45.1,netMgn:35.5,cfo:100,evEbitda:24.1,de:0.69,gMgn:68.4,roe:38,preMgn:41.8,cagr:12.1,beta:0.88,alpha:8.5,vix:19.2},
  NVDA: {pe:65,dEbitda:0.3,intCov:80,fcf:45,fcfYld:2.1,roic:55,opMgn:55.0,netMgn:48.1,cfo:60,evEbitda:45.2,de:0.43,gMgn:74.6,roe:120,preMgn:52.4,cagr:35.0,beta:1.72,alpha:42.1,vix:19.2,cashRunway:null},
  GOOGL:{dEbitda:0.2,intCov:60,fcf:65,fcfYld:3.4,roic:22,opMgn:28.1,netMgn:23.0,cfo:95,evEbitda:17.8,de:0.12,gMgn:55.3,roe:28,preMgn:26.2,cagr:11.5,beta:1.05,alpha:5.4,vix:19.2},
  META: {pe:25,dEbitda:0.3,intCov:45,fcf:38,fcfYld:2.8,roic:28,opMgn:35.2,netMgn:29.1,cfo:58,evEbitda:16.0,de:0.22,gMgn:81.0,roe:32,preMgn:32.4,cagr:20.0,beta:1.35,alpha:12.8,vix:19.2},
  AMZN: {pe:60,dEbitda:1.2,intCov:12,fcf:25,fcfYld:1.3,roic:18,opMgn:8.1,netMgn:5.9,cfo:85,evEbitda:19.8,de:0.6,gMgn:46.0,roe:22,preMgn:7.0,cagr:15.0,beta:1.18,alpha:4.2,vix:19.2},
  AMD:  {dEbitda:0.8,intCov:8,fcf:3.5,fcfYld:0.5,roic:7,opMgn:3.8,netMgn:3.5,cfo:5.9,evEbitda:38.0,de:0.21,gMgn:47.1,roe:4,preMgn:3.9,cagr:18.0,beta:1.85,alpha:-2.1,vix:19.2,cashRunway:null},
  PLTR: {pe:200,dEbitda:null,intCov:null,fcf:3.1,fcfYld:1.0,roic:4.8,opMgn:8.2,netMgn:8.0,cfo:3.9,evEbitda:80.0,de:0.02,gMgn:80.8,roe:7,preMgn:9.1,cagr:25.0,beta:2.4,alpha:18.5,vix:19.2,cashRunway:36},
  SNOW: {pe:null,dEbitda:null,intCov:null,fcf:-2.1,fcfYld:-0.5,roic:-8,opMgn:-15.0,netMgn:-18.0,cfo:-1.2,evEbitda:null,de:0.0,gMgn:68.4,roe:-20,preMgn:-18.0,cagr:30.0,beta:1.95,alpha:-8.2,vix:19.2,cashRunway:28},
  TSLA: {pe:170,dEbitda:3.8,intCov:8,fcf:2.1,fcfYld:0.4,roic:12,opMgn:5.2,netMgn:3.9,cfo:10.1,evEbitda:52.0,de:0.08,gMgn:18.2,roe:14,preMgn:5.1,cagr:22.0,beta:2.1,alpha:-5.8,vix:19.2},
  F:    {dEbitda:3.5,intCov:4.8,fcf:2.0,fcfYld:1.8,roic:7.8,opMgn:3.5,netMgn:2.1,cfo:8.2,evEbitda:13.8,de:3.1,gMgn:8.2,roe:10,preMgn:2.8,cagr:3.0,beta:1.45,alpha:-3.1,vix:19.2},
  CAT:  {dEbitda:2.1,intCov:14,fcf:6.2,fcfYld:3.2,roic:31.8,opMgn:18.0,netMgn:13.2,cfo:10.1,evEbitda:12.1,de:2.0,gMgn:36.9,roe:55,preMgn:16.0,cagr:12.0,beta:1.08,alpha:7.1,vix:19.2},
  JPM:  {npl:1.1,deposits:115,cet1:15.3,pb:1.81,roe:17,nim:2.8,costInc:55,ltd:72,divPay:28,de:8.2,cfo:42,intCov:null,beta:1.12,vix:19.2},
  BAC:  {npl:0.9,deposits:108,cet1:13.8,pb:1.12,roe:10,nim:2.1,costInc:62,ltd:68,divPay:32,de:9.5,cfo:35,intCov:null,beta:1.35,vix:19.2},
  GS:   {npl:0.5,deposits:95, cet1:14.9,pb:1.42,roe:12,nim:null,costInc:60,ltd:null,divPay:22,de:11.2,cfo:28,intCov:null,beta:1.42,vix:19.2},
  JNJ:  {dEbitda:1.0,intCov:22,fcf:18.0,fcfYld:4.5,roic:22,opMgn:22.1,netMgn:18.2,cfo:22.4,evEbitda:14.0,de:0.5,gMgn:68.1,roe:22,preMgn:20.0,cagr:5.0,beta:0.55,vix:19.2},
  XOM:  {dEbitda:0.8,intCov:18,fcf:30.0,fcfYld:5.2,roic:16,opMgn:14.0,netMgn:10.1,cfo:55.0,evEbitda:7.8,de:0.19,gMgn:38.0,roe:18,preMgn:12.0,cagr:4.0,beta:0.85,vix:19.2},
  WMT:  {dEbitda:1.8,intCov:12,fcf:12.0,fcfYld:1.2,roic:18,opMgn:5.1,netMgn:2.4,cfo:25.0,evEbitda:19.0,de:0.6,gMgn:24.8,roe:20,preMgn:2.9,cagr:6.0,beta:0.52,vix:19.2},
}

function getSimData(sym: string): FundData {
  if (SIM[sym]) return SIM[sym]
  const sec = detectSector(sym)
  let s = sym.split('').reduce((a,c)=>a+c.charCodeAt(0),0)
  const rr = () => { s=(s*1664525+1013904223)>>>0; return s/4294967296 }
  const r = (mn:number,mx:number) => mn+rr()*(mx-mn)
  if (sec==='bank')     return {pe:r(8,18),npl:r(0.5,4),deposits:r(70,120),cet1:r(10,17),pb:r(0.7,2.2),roe:r(6,18),nim:r(1.5,3.5),costInc:r(44,72),ltd:r(55,110),divPay:r(15,70),de:r(5,14),cfo:r(5,50),intCov:null,beta:r(0.8,1.5),vix:19.2}
  if (sec==='tech')     return {pe:r(30,200),dEbitda:r(0,1.5),intCov:r(3,80),fcf:r(-15,60),fcfYld:r(-2,5),roic:r(-10,40),opMgn:r(-20,55),netMgn:r(-15,48),cfo:r(-10,60),evEbitda:r(12,90),de:r(0,0.8),gMgn:r(40,85),roe:r(-20,120),preMgn:r(-18,52),cagr:r(8,45),beta:r(1.1,2.6),vix:19.2,cashRunway:r(8,48)}
  if (sec==='cyclical') return {pe:r(5,25),dEbitda:r(0.8,5),intCov:r(2,18),fcf:r(-2,15),fcfYld:r(0.5,7),roic:r(4,25),opMgn:r(2,22),netMgn:r(1,16),cfo:r(0.5,20),evEbitda:r(4,18),de:r(0.2,4),gMgn:r(8,40),roe:r(5,60),preMgn:r(1,18),cagr:r(1,18),beta:r(0.9,2.1),vix:19.2}
  return {pe:r(10,30),dEbitda:r(0.3,3),intCov:r(4,35),fcf:r(1,40),fcfYld:r(1,9),roic:r(7,35),opMgn:r(5,35),netMgn:r(3,22),cfo:r(2,45),evEbitda:r(6,20),de:r(0.1,2),gMgn:r(20,70),roe:r(7,35),preMgn:r(5,25),cagr:r(2,20),beta:r(0.4,1.5),vix:19.2}
}

// ─── Format value for display ─────────────────────────────────
function fmt(v: number | null, unit: string, short = false): string {
  if (v == null) return '—'
  const abs = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  if (unit === '$B') {
    if (short) return abs >= 1000 ? `${sign}$${(abs/1000).toFixed(1)}T` : `${sign}$${abs.toFixed(0)}B`
    return abs >= 1000 ? `${sign}$${(abs/1000).toFixed(2)}T` : `${sign}$${abs.toFixed(1)}B`
  }
  if (unit === '%')  return `${sign}${abs.toFixed(1)}%`
  if (unit === 'x')  return `${sign}${abs.toFixed(abs<10?2:1)}x`
  if (unit === 'm')  return `${sign}${abs.toFixed(0)}m`
  return `${sign}${abs.toFixed(abs<10?2:1)}`
}

// ─── Quarterly bar chart ──────────────────────────────────────
function QtrBars({ qtrs, unit, isInverse, col }: {
  qtrs: (number | null)[]
  unit: string
  isInverse?: boolean
  col: string
}) {
  const valid = qtrs.filter((v): v is number => v != null)
  if (valid.length === 0) return <div style={{ fontSize: 9, color: '#21262d', textAlign: 'center', padding: '20px 0' }}>Quarterly data not available</div>

  const mn = Math.min(...valid)
  const mx = Math.max(...valid)
  const range = mx - mn || Math.abs(mn) * 0.1 || 0.001

  const BAR_H = 52   // max bar height px
  const hasNeg = valid.some(v => v < 0)
  const zeroLine = hasNeg ? Math.max(0, (-mn) / range * BAR_H) : 0

  return (
    <div>
      {/* Bars */}
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: BAR_H + 18, padding: '0 2px' }}>
        {qtrs.map((v, i) => {
          const isLast = i === qtrs.length - 1
          const isPrev = i === qtrs.length - 2
          if (v == null) return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: '100%', height: 4, background: '#21262d' }} />
              <div style={{ fontSize: 6.5, color: '#21262d', whiteSpace: 'nowrap' }}>{QTRLS[i]}</div>
            </div>
          )
          const pct    = Math.abs(v - (hasNeg ? 0 : mn)) / range
          const barH   = Math.max(2, Math.round(pct * BAR_H))
          const isPos  = v >= 0
          // Color logic: last bar = bright signal color; others = dim version
          const barCol = isLast ? col : isPrev ? col + 'aa' : col + '44'
          const yoyChg = i >= 4 ? v - (qtrs[i - 4] ?? v) : null  // year-over-year (same quarter last year)

          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, position: 'relative' }}>
              {/* Value label on top of EVERY bar */}
              <div style={{ fontSize: 6.5, color: isLast ? col : '#8b949e', whiteSpace: 'nowrap', marginBottom: 2, fontWeight: isLast ? 700 : 400 }}>
                {fmt(v, unit, true)}
              </div>

              {/* Bar */}
              <div style={{
                width: '100%',
                height: barH,
                background: isPos ? barCol : (isInverse ? col : '#f85149') + (isLast ? '' : '55'),
                borderRadius: '1px 1px 0 0',
                transition: 'height 0.3s',
                position: 'relative',
              }}>
              </div>

              {/* Quarter label */}
              <div style={{ fontSize: 6.5, color: '#8b949e', marginTop: 3, whiteSpace: 'nowrap' }}>
                {QTRLS[i]}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Individual card ──────────────────────────────────────────
function IndCard({ ind, value, sym, qtrsOverride, isLive }: {
  ind: Ind; value: number | null; sym: string
  qtrsOverride?: (number | null)[]
  isLive?: boolean
}) {
  const [hov, setHov] = useState(false)
  const ev  = evalSig(ind.id, value)
  const col = ev.sig === 'na' ? '#21262d' : COL[ev.sig]
  const isNA = value == null

  // Use real quarterly data if provided, otherwise simulate
  const qtrs = qtrsOverride ?? makeQtrs(value, ind.qTrend, ind.qNoise, ind.qSeed + sym.charCodeAt(0))

  // YoY delta: last quarter vs same quarter 1 year ago (index 4 vs 0 in our 8-quarter array)
  const last    = qtrs[7]
  const yearAgo = qtrs[3]
  const yoyDelta = (last != null && yearAgo != null && yearAgo !== 0)
    ? ((last - yearAgo) / Math.abs(yearAgo) * 100)
    : null
  const qoqDelta = (last != null && qtrs[6] != null && qtrs[6] !== 0)
    ? ((last - qtrs[6]!) / Math.abs(qtrs[6]!) * 100)
    : null

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#161b22' : '#0e1117',
        border: `1px solid ${hov ? col + '55' : '#21262d'}`,
        borderTop: `3px solid ${isNA ? '#21262d' : col}`,
        padding: '12px 14px',
        position: 'relative',
        transition: 'border-color 0.12s, background 0.12s',
        cursor: 'default',
        borderRadius: 2,
      }}
    >
      {/* Rank */}
      <div style={{ position:'absolute', top:10, right:12, fontSize:10, fontWeight:700, color: isNA?'#21262d':col+'88',  }}>
        #{ind.rank}
      </div>

      {/* Indicator name */}
      <div style={{ fontSize: 9, color: '#8b949e', marginBottom: 5, paddingRight: 24, lineHeight: 1.4,  }}>
        {ind.name}
      </div>

      {/* Current value — large */}
      <div style={{ fontSize: isNA ? 16 : 24, fontWeight: 500, color: isNA ? '#21262d' : col, lineHeight: 1, marginBottom: 5, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>
        {isNA ? '—' : fmt(value, ind.unit)}
      </div>

      {/* Signal badge + QoQ + YoY deltas */}
      {!isNA && (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 8, color: col, background: col+'15', border:`1px solid ${col}30`, padding:'1px 7px',  }}>
            {ev.label}
          </span>
          {qoqDelta != null && (
            <span style={{ fontSize: 8, color: qoqDelta >= 0 ? '#3fb950' : '#f85149',  }}>
              QoQ {qoqDelta >= 0 ? '▲' : '▼'}{Math.abs(qoqDelta).toFixed(1)}%
            </span>
          )}
          {yoyDelta != null && (
            <span style={{ fontSize: 8, color: yoyDelta >= 0 ? '#3fb95055' : '#f8514955',  }}>
              YoY {yoyDelta >= 0 ? '▲' : '▼'}{Math.abs(yoyDelta).toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* Quarterly bar chart */}
      <QtrBars qtrs={qtrs} unit={ind.unit} isInverse={ind.isInverse} col={col} />

      {/* Hover tooltip */}
      {hov && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, width: 290,
          background: '#161b22', border: `1px solid ${col}44`,
          padding: '11px 13px', boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
          pointerEvents: 'none', 
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: col, marginBottom: 7 }}>#{ind.rank} — {ind.name}</div>
          <div style={{ display: 'grid', gap: 5, fontSize: 8, color: '#8b949e', lineHeight: 1.55 }}>
            <div><span style={{ color: '#8b949e' }}>Formule:</span> {ind.formula}</div>
            <div><span style={{ color: '#8b949e' }}>Seuils:</span>  {ind.thresholds}</div>
            <div><span style={{ color: '#8b949e' }}>Pourquoi:</span> {ind.desc}</div>
            {ind.trap && <div style={{ color: '#f85149aa' }}>Warning: {ind.trap}</div>}
          </div>
          {/* Quarterly table in tooltip */}
          <div style={{ marginTop: 8, borderTop: `1px solid ${col}22`, paddingTop: 7 }}>
            <div style={{ fontSize: 7, color: '#21262d', marginBottom: 4 }}>HISTORIQUE TRIMESTRIEL</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
              {qtrs.map((v, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 6.5, color: '#21262d' }}>{QTRLS[i]}</div>
                  <div style={{ fontSize: 8, color: v != null ? col : '#21262d', fontWeight: 600 }}>{fmt(v, ind.unit, true)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Health score bar ─────────────────────────────────────────
function HealthBar({ inds, data }: { inds: Ind[]; data: FundData }) {
  const sigs  = inds.map(ind => evalSig(ind.id, data[ind.id] ?? null).sig)
  const g     = sigs.filter(s => s === 'green').length
  const y     = sigs.filter(s => s === 'yellow').length
  const r     = sigs.filter(s => s === 'red').length
  const total = g + y + r || 1
  const pct   = Math.round((g * 1 + y * 0.5) / total * 100)
  const col   = pct >= 65 ? '#3fb950' : pct >= 40 ? '#d29922' : '#f85149'
  const msg   = pct >= 65 ? '▲ STRONG' : pct >= 40 ? '▲ MIXED' : '▼ WEAK'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10,  }}>
      <span style={{ fontSize: 8, color: '#3fb950' }}>▲{g}</span>
      <span style={{ fontSize: 8, color: '#d29922' }}>▲{y}</span>
      <span style={{ fontSize: 8, color: '#f85149' }}>▼{r}</span>
      <div style={{ width: 160, height: 4, background: '#161b22', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: col, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: col,  }}>{pct}%</span>
      <span style={{ fontSize: 9, color: col }}>{msg}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export function Fundamentals() {
  const navigate  = useNavigate()
  const [input, setInput]       = useState('AAPL')
  const [sym,   setSym]         = useState('AAPL')
  const [liveQ, setLiveQ]       = useState<QuarterlyData | null>(null)
  const [liveFund, setLiveFund] = useState<Record<string, number | null> | null>(null)
  const [nextEarnings, setNextE]= useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const { apiOnline }           = useStore()
  const macro                   = useStore(s => s.macro)

  const sector = detectSector(sym)
  const meta   = SECTOR_META[sector]
  const inds   = INDS[sector]
  const simData = getSimData(sym)

  // When backend is online and fundamentals loaded: use ONLY real data (no fake values)
  // When backend is offline: use sim data as fallback (labeled SIM)
  const realVix = macro?.vix ?? null
  const data: Record<string, number | null> = liveFund
    ? { ...liveFund, vix: realVix }      // real values + real VIX
    : apiOnline
      ? { vix: realVix }                 // loading — show VIX at least
      : { ...simData }                   // offline — sim fallback

  // When backend is online, fetch real quarterly data AND fundamentals
  useEffect(() => {
    if (!apiOnline) { setLiveQ(null); setLiveFund(null); return }
    setLoading(true)
    fetchQuarterly(sym)
      .then(d => { if (d?.quarters?.length) setLiveQ(d) })
      .finally(() => setLoading(false))
    fetchNextEarnings(sym)
      .then(d => { if (d?.next_earnings) setNextE(d.next_earnings) })
    // Fetch real fundamentals for snapshot values
    fetchFundamentals(sym)
      .then(f => {
        if (!f) return
        const real: Record<string, number | null> = {}
        // Map ALL backend fields to indicator IDs
        const map: [string, any][] = [
          ['pe', (f as any).pe ?? f.fwd_pe],
          ['dEbitda', f.dEbitda],
          ['intCov', f.intCov],
          ['fcf', f.fcf],
          ['fcfYld', f.fcfYld],
          ['roic', f.roic],
          ['opMgn', f.opMgn],
          ['netMgn', (f as any).netMgn],
          ['cfo', f.cfo],
          ['gMgn', f.gMgn],
          ['preMgn', f.preMgn],
          ['de', (f as any).de],
          ['roe', (f as any).roe],
          ['beta', f.beta],
          ['alpha', (f as any).alpha],
          ['pb', f.pb],
          ['evEbitda', (f as any).evEbitda],
          ['cagr', (f as any).cagr],
          ['cashRunway', (f as any).cashRunway],
          ['nim', (f as any).nim],
          ['npl', (f as any).npl],
          ['cet1', (f as any).cet1],
          ['costInc', (f as any).costInc],
          ['ltd', (f as any).ltd],
        ]
        for (const [k, v] of map) {
          if (v != null && typeof v === 'number' && !isNaN(v)) real[k] = +v.toFixed(4)
        }
        if (Object.keys(real).length > 0) setLiveFund(real)
      })
  }, [sym, apiOnline])

  // Build quarterly arrays: real data if available, otherwise simulation
  function getQtrValues(metricId: string, ind: Ind): (number | null)[] {
    if (liveQ) {
      const map: Record<string, keyof QuarterlyData> = {
        dEbitda:'dEbitda', intCov:'int_cov', fcf:'fcf', fcfYld:'fcf',
        roic:'roic', opMgn:'op_mgn', netMgn:'net_mgn', cfo:'cfo',
        evEbitda:'dEbitda', de:'de', gMgn:'gross_mgn', roe:'roe',
        preMgn:'pretax_mgn', cagr:'revenue', beta:'de',
        npl:'de', deposits:'equity', cet1:'equity', pb:'de',
        nim:'op_mgn', costInc:'op_mgn', ltd:'de', divPay:'net_mgn',
        cashRunway:'cash',
      }
      const key = map[metricId]
      const arr = key ? (liveQ[key] as (number|null)[]) : null
      if (arr && arr.length >= 4) {
        // Pad to 8 elements if shorter
        const padded: (number|null)[] = Array(Math.max(0, 8 - arr.length)).fill(null).concat(arr)
        return padded.slice(-8)
      }
    }
    return makeQtrs(data[metricId] ?? null, ind.qTrend, ind.qNoise, ind.qSeed + sym.charCodeAt(0))
  }

  // Source label shown in footer
  const dataSource = liveQ
    ? liveQ.source + ' · ' + (liveQ.updated ? new Date(liveQ.updated).toLocaleTimeString('en-GB') : '')
    : 'SIMULATION (backend offline)'
  const isLive = !!liveQ

  function go() { const s = input.trim().toUpperCase(); if (s) setSym(s) }

  return (
    <div style={{ background:'#0e1117', minHeight:'100%', padding:'14px 16px',  color:'#c9d1d9' }}>

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#c9d1d9', letterSpacing:0.4 }}>
            FUNDAMENTAL ANALYSIS
          </div>
          {/* LIVE / SIM badge */}
          <span style={{
            fontSize:9, padding:'2px 8px',  letterSpacing:0.5,
            background: isLive ? '#3fb95018' : '#d2992218',
            border: `1px solid ${isLive ? '#3fb95044' : '#d2992244'}`,
            color: isLive ? '#3fb950' : '#d29922',
          }}>
            {loading ? '⟳ LOADING...' : isLive ? '● LIVE' : '◌ SIM'}
          </span>
          {/* Next earnings */}
          {nextEarnings && (
            <span style={{ fontSize:9, color:'#388bfd',  }}>
              📅 Prochain earnings: {new Date(nextEarnings).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}
            </span>
          )}
          {/* EPS surprise strip */}
          {liveQ?.earnings_history && liveQ.earnings_history.length > 0 && (
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              <span style={{ fontSize:8, color:'#8b949e',  }}>EPS:</span>
              {liveQ.earnings_history.slice(-4).map((e, i) => (
                <span key={i} style={{
                  fontSize:8, padding:'1px 5px', 
                  background: e.surprise == null ? '#161b22' : e.surprise >= 0 ? '#3fb95018' : '#f8514918',
                  border: `1px solid ${e.surprise == null ? '#21262d' : e.surprise >= 0 ? '#3fb95044' : '#f8514944'}`,
                  color: e.surprise == null ? '#8b949e' : e.surprise >= 0 ? '#3fb950' : '#f85149',
                }}>
                  {e.quarter}: {e.surprise == null ? '—' : (e.surprise >= 0 ? '+' : '') + e.surprise.toFixed(1) + '%'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ticker input */}
        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
          <input value={input} onChange={e=>setInput(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==='Enter'&&go()}
            placeholder="TICKER"
            style={{ background:'#161b22', border:'1px solid #21262d', color:'#388bfd', fontSize:16, fontWeight:700, padding:'5px 14px', width:120, outline:'none',  letterSpacing:0.5, borderRadius:4 }}
          />
          <button onClick={go} style={{ padding:'5px 14px', fontSize:9, background:'#388bfd18', border:'1px solid #388bfd44', color:'#388bfd', cursor:'pointer',  letterSpacing:0.5, borderRadius:4 }}>
            ANALYZE
          </button>
          <button onClick={()=>navigate(`/ticker/${sym}`)} style={{ padding:'5px 14px', fontSize:9, background:'#3fb95014', border:'1px solid #3fb95033', color:'#3fb950', cursor:'pointer',  borderRadius:4 }}>
            WORKSPACE →
          </button>
        </div>

        {/* Sector badge */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px', background:meta.color+'10', border:`1px solid ${meta.color}30`, flexShrink:0 }}>
          <span style={{ fontSize:16 }}>{meta.emoji}</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:meta.color, letterSpacing:0.4 }}>AUTO: {sector.toUpperCase()}</div>
            <div style={{ fontSize:7.5, color:'#8b949e', marginTop:1 }}>{meta.label}</div>
          </div>
        </div>

        <div style={{ marginLeft:'auto' }}>
          <HealthBar inds={inds} data={data} />
        </div>
      </div>

      {/* Warning banner */}
      {meta.warn && (
        <div style={{ padding:'8px 14px', background:meta.color+'0a', border:`1px solid ${meta.color}20`, borderLeft:`3px solid ${meta.color}`, marginBottom:12, fontSize:8.5, color:meta.color, lineHeight:1.6,  }}>
          ⚠ {meta.warn}
        </div>
      )}

      {/* Subtitle */}
      <div style={{ fontSize:7.5, color:'#21262d', marginBottom:12,  }}>
        {sym} · {inds.length} indicators · bars = last 8 quarters ({QTRLS[0]} → {QTRLS[7]}) · brightest = current quarter · hover for formula + table
      </div>

      {/* Cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
        {inds.map(ind => {
          const qVals = getQtrValues(ind.id, ind)
          // Current value priority: 
          // 1. Real fundamentals snapshot (TTM) — matches Research tab
          // 2. Last quarterly value if fundamentals doesn't have it
          // 3. Fallback
          const fundVal = data[ind.id] ?? null
          const qtrVal = qVals.length ? [...qVals].reverse().find(v => v != null) ?? null : null
          const liveVal = fundVal ?? qtrVal
          return (
            <IndCard
              key={`${sym}-${ind.id}-${ind.rank}`}
              ind={ind}
              value={liveVal}
              sym={sym}
              qtrsOverride={qVals}
              isLive={isLive}
            />
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop:14, paddingTop:8, borderTop:'1px solid #0e1117', display:'flex', justifyContent:'space-between', fontSize:7, color:'#484f58',  }}>
        <span>{isLive ? `Source: ${dataSource}` : `SIM · ${dataSource} · start backend/server.py for live data`} · hover for formula + table</span>
        <span>{new Date().toLocaleDateString('en-GB')} · {inds.length} indicators · {QTRLS[0]}–{QTRLS[7]}</span>
      </div>
    </div>
  )
}
