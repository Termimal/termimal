// components/FundamentalPanel.tsx
// Auto-detects sector from ticker → shows the RIGHT indicators automatically
// Based on IMPORTANT_INDICATORS_BY_SECTOR.odt

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { fetchFundamentals } from '@/api/client'
import { onActivate } from '@/lib/a11y'

// ── Sector auto-detection database ───────────────────────────
// Covers the most common tickers. Unknown tickers → 'normal' fallback.
const SECTOR_MAP: Record<string, 'normal' | 'cyclical' | 'tech' | 'bank'> = {
  // BANKS
  JPM:'bank', BAC:'bank', GS:'bank', MS:'bank', WFC:'bank', C:'bank',
  BNP:'bank', AXA:'bank', SAN:'bank', HSBC:'bank', DB:'bank', UBS:'bank',
  CS:'bank', BNPP:'bank', BNS:'bank', RY:'bank', TD:'bank', BMO:'bank',
  USB:'bank', PNC:'bank', TFC:'bank', SCHW:'bank', BK:'bank', STT:'bank',
  // MATURE TECH → NORMAL (known, profitable companies)
  AAPL:'normal', MSFT:'normal', NVDA:'normal', GOOGL:'normal', GOOG:'normal',
  META:'normal', AMZN:'normal', TSMC:'normal', ASML:'normal', ORCL:'normal',
  CRM:'normal', ADBE:'normal', AMD:'normal', INTC:'normal', QCOM:'normal',
  AVGO:'normal', TXN:'normal', MU:'normal', AMAT:'normal', LRCX:'normal',
  NFLX:'normal', INTU:'normal', FTNT:'normal', MSCI:'normal', ANSS:'normal', CDNS:'normal',
  PANW:'normal', NOW:'normal', TEAM:'normal',
  // TECH / GROWTH (early-stage, not yet profitable, dilution risk)
  PLTR:'tech', SNOW:'tech', DDOG:'tech', NET:'tech', CRWD:'tech', FLY:'tech', RKLB:'tech',
  ZM:'tech', UBER:'tech', LYFT:'tech', ABNB:'tech', DASH:'tech',
  SHOP:'tech', SPOT:'tech', RBLX:'tech', U:'tech', GTLB:'tech',
  OKTA:'tech', ZS:'tech',
  // CYCLICALS
  TSLA:'cyclical', F:'cyclical', GM:'cyclical', STLA:'cyclical',
  X:'cyclical', NUE:'cyclical', CLF:'cyclical', AA:'cyclical',
  FCX:'cyclical', VALE:'cyclical', RIO:'cyclical', BHP:'cyclical',
  CAT:'cyclical', DE:'cyclical', CMI:'cyclical', PCAR:'cyclical',
  ZIM:'cyclical', DAL:'cyclical', UAL:'cyclical', AAL:'cyclical',
  LUV:'cyclical', CCL:'cyclical', RCL:'cyclical', NCLH:'cyclical',
  MGM:'cyclical', LVS:'cyclical', WYNN:'cyclical', MAR:'cyclical',
  // NORMAL (industry / consumer / healthcare / energy)
  JNJ:'normal', PG:'normal', KO:'normal', PEP:'normal', WMT:'normal',
  COST:'normal', TGT:'normal', HD:'normal', LOW:'normal', CVS:'normal',
  MRK:'normal', PFE:'normal', ABBV:'normal', LLY:'normal', UNH:'normal',
  ABT:'normal', BMY:'normal', AMGN:'normal', GILD:'normal', BIIB:'normal',
  XOM:'normal', CVX:'normal', COP:'normal', SLB:'normal', EOG:'normal',
  BA:'cyclical', RTX:'normal', LMT:'normal', GD:'normal', NOC:'normal',
  GE:'normal', HON:'normal', MMM:'normal', EMR:'normal', ETN:'normal',
  NEE:'normal', DUK:'normal', SO:'normal', AEP:'normal', EXC:'normal',
  SPY:'normal', QQQ:'normal', DIA:'normal', IWM:'normal',
  // Additions — payment networks, intl pharma/oil, IT services, intl auto, semis, consumer brands, media/leisure
  MA:'normal',                                                  // payment network (peer of V)
  NVO:'normal',                                                 // intl pharma
  SHEL:'normal', BP:'normal',                                   // intl integrated oil
  IBM:'normal', CSCO:'normal',                                  // mature IT
  TSM:'normal', ARM:'normal',                                   // semis (mature/profitable)
  TM:'normal',                                                  // intl auto (Toyota — exception to US auto cyclicality)
  MCD:'normal', NKE:'normal',                                   // mature consumer brands
  DIS:'cyclical',                                               // media+leisure: parks+box-office swing it cyclically
  // ETFs / sector funds — show standard panel without bank metrics
  TLT:'normal', HYG:'normal', GLD:'normal', SLV:'normal',
  XLF:'normal', XLE:'normal', XLK:'normal',
  // Final additions — payment networks, fintech/crypto-adjacent, asset mgr, conglomerate, semis, restaurants
  V:'normal',                                                   // Visa — payment network
  PYPL:'normal',                                                // PayPal — mature payments
  SQ:'tech',                                                    // Block — fintech still scaling
  COIN:'tech',                                                  // Coinbase — crypto-cycle exposure, growth-stage
  HOOD:'tech',                                                  // Robinhood — fintech, growth-stage
  MSTR:'tech',                                                  // MicroStrategy — BTC-treasury balance-sheet model
  'BRK-B':'normal',                                             // Berkshire — diversified holding
  BX:'normal',                                                  // Blackstone — asset manager
  SBUX:'normal',                                                // Starbucks — mature consumer
  SMCI:'tech',                                                  // Super Micro — recent growth-tech
  // Universe-expansion additions — most large-caps fall under 'normal'
  // Healthcare / pharma / biotech / med-devices — all mature, profitable → normal
  TMO:'normal', DHR:'normal', ISRG:'normal', MDT:'normal',
  REGN:'normal', ELV:'normal', CI:'normal', SYK:'normal', ZTS:'normal',
  // Industrials / staples / telecom / consulting / payments — mature → normal
  ACN:'normal', VZ:'normal', CMCSA:'normal', PM:'normal', MO:'normal',
  UPS:'normal', ADP:'normal',
  SPGI:'normal', BLK:'normal', MMC:'normal', CB:'normal', PGR:'normal',
  BKNG:'normal', TJX:'normal', MDLZ:'normal',
  LIN:'normal', PLD:'normal',
  // Mature semis → normal
  ADI:'normal', KLAC:'normal', SNPS:'normal',
  // Crypto-linked miners — extremely volatile, unprofitable → tech (growth/burn template)
  MARA:'tech', RIOT:'tech',
  // EV / Chinese EV — cyclical (auto + capex heavy + cycle exposure)
  RIVN:'cyclical', NIO:'cyclical', LI:'cyclical', XPEV:'cyclical',
  // International ADRs — most are mature → normal; SE growth-stage → tech
  BABA:'normal', JD:'normal', PDD:'normal', NTES:'normal',
  SAP:'normal', MELI:'normal',
  SE:'tech',
}

type SectorKey = 'normal' | 'cyclical' | 'tech' | 'bank'

// ── Fundamental categories (TradingView-style grouping) ─────────
// Maps indicator IDs to semantic groups. Unmapped IDs fall into "OTHER".
type Category = 'PROFITABILITY' | 'BALANCE SHEET' | 'CASH FLOW' | 'VALUATION' | 'MARKET RISK' | 'BANK METRICS' | 'OTHER'
const CATEGORY_OF: Record<string, Category> = {
  // Profitability
  roic: 'PROFITABILITY', opMgn: 'PROFITABILITY', netMgn: 'PROFITABILITY',
  gMgn: 'PROFITABILITY', preMgn: 'PROFITABILITY', roe: 'PROFITABILITY',
  // Cash flow
  fcf: 'CASH FLOW', fcfYld: 'CASH FLOW', cfo: 'CASH FLOW',
  // Balance sheet
  dEbitda: 'BALANCE SHEET', intCov: 'BALANCE SHEET', de: 'BALANCE SHEET',
  cashRunway: 'BALANCE SHEET',
  // Valuation
  pe: 'VALUATION', evEbitda: 'VALUATION', pb: 'VALUATION',
  // Market risk
  beta: 'MARKET RISK',
  // Bank-specific
  nim: 'BANK METRICS', npl: 'BANK METRICS', cet1: 'BANK METRICS',
  costInc: 'BANK METRICS', ltd: 'BANK METRICS',
}
const CATEGORY_ORDER: Category[] = ['PROFITABILITY', 'CASH FLOW', 'BALANCE SHEET', 'VALUATION', 'MARKET RISK', 'BANK METRICS', 'OTHER']

const SECTOR_META: Record<SectorKey, { label: string; emoji: string; color: string; warning?: string }> = {
  normal:   { label: 'Standard — Industry / Consumer / Mature Tech', emoji: '', color: '#388bfd' },
  cyclical: { label: 'Cyclical — Auto / Materials / Shipping / Steel', emoji: '', color: '#388bfd', warning: 'WARNING: ratios at cycle peak are misleading — analyze over 3-5 years' },
  tech:     { label: 'Tech / Growth — AI / Quantum / Biotech', emoji: '', color: '#3fb950', warning: 'WARNING: not yet profitable — FCF burn and cash runway are priority' },
  bank:     { label: 'Bank / Financial — special case', emoji: '', color: '#7c4dff', warning: 'Different analysis: NPL + CET1 + NIM + P/B×ROE. Debt/EBITDA NOT RELEVANT here.' },
}

function detectSector(sym: string): SectorKey {
  return SECTOR_MAP[sym.toUpperCase()] ?? 'normal'
}

// ── Simulated fundamentals ────────────────────────────────────
const SIM_FUNDS: Record<string, Record<string, number | null>> = {
  AAPL: { pe:32, dEbitda:0.4, intCov:28,  fcf:107, fcfYld:3.4, roic:45, opMgn:30, netMgn:25, cfo:130, evEbitda:22, de:1.7, gMgn:44, roe:160, preMgn:28, beta:1.24, cashRunway:null },
  MSFT: { pe:35, dEbitda:0.5, intCov:35,  fcf:75,  fcfYld:2.3, roic:38, opMgn:45, netMgn:35, cfo:100, evEbitda:24, de:0.7, gMgn:68, roe:38,  preMgn:42, beta:0.88, cashRunway:null },
  NVDA: { pe:65, dEbitda:0.3, intCov:80,  fcf:45,  fcfYld:2.1, roic:55, opMgn:55, netMgn:48, cfo:60,  evEbitda:45, de:0.4, gMgn:74, roe:120, preMgn:52, beta:1.72, cashRunway:null },
  GOOGL:{ pe:22, dEbitda:0.2, intCov:60,  fcf:65,  fcfYld:3.4, roic:22, opMgn:28, netMgn:23, cfo:95,  evEbitda:18, de:0.1, gMgn:55, roe:28,  preMgn:26, beta:1.05, cashRunway:null },
  META: { pe:25, dEbitda:0.3, intCov:45,  fcf:38,  fcfYld:2.8, roic:28, opMgn:35, netMgn:29, cfo:58,  evEbitda:16, de:0.2, gMgn:81, roe:32,  preMgn:32, beta:1.35, cashRunway:null },
  AMZN: { pe:60, dEbitda:1.2, intCov:12,  fcf:25,  fcfYld:1.3, roic:18, opMgn:8,  netMgn:6,  cfo:85,  evEbitda:20, de:0.6, gMgn:46, roe:22,  preMgn:7,  beta:1.18, cashRunway:null },
  TSLA: { pe:170, dEbitda:3.8, intCov:8,   fcf:2,   fcfYld:0.4, roic:12, opMgn:5,  netMgn:4,  cfo:10,  evEbitda:52, de:0.1, gMgn:18, roe:14,  preMgn:5,  beta:2.1,  cashRunway:null },
  AMD:  { pe:120, dEbitda:0.8, intCov:15,  fcf:4,   fcfYld:0.6, roic:8,  opMgn:4,  netMgn:4,  cfo:6,   evEbitda:38, de:0.2, gMgn:47, roe:4,   preMgn:4,  beta:1.85, cashRunway:null },
  PLTR: { pe:200, dEbitda:null,intCov:null,fcf:3,   fcfYld:1.0, roic:5,  opMgn:8,  netMgn:8,  cfo:4,   evEbitda:80, de:0.0, gMgn:81, roe:7,   preMgn:9,  beta:2.4,  cashRunway:36 },
  SNOW: { pe:null, dEbitda:null,intCov:null,fcf:-2,  fcfYld:-0.5,roic:-8, opMgn:-15,netMgn:-18,cfo:-1,  evEbitda:null,de:0.0, gMgn:68, roe:-20, preMgn:-18,beta:1.95, cashRunway:28 },
  JPM:  { pe:12, npl:1.1, nim:2.8, cet1:15.3, pb:1.8, roe:17, de:8.2, costInc:55, ltd:72, beta:1.12, intCov:null, dEbitda:null, fcf:null },
  BAC:  { pe:10, npl:0.9, nim:2.1, cet1:13.8, pb:1.1, roe:10, de:9.5, costInc:62, ltd:68, beta:1.35 },
  GS:   { pe:14, npl:0.5, nim:null,cet1:14.9, pb:1.4, roe:12, de:11.2,costInc:60, ltd:null,beta:1.42 },
  TSMC: { pe:25, dEbitda:0.4, intCov:25,  fcf:12,  fcfYld:0.8, roic:25, opMgn:42, netMgn:38, cfo:35,  evEbitda:20, de:0.3, gMgn:53, roe:28,  beta:1.05 },
  ASML: { pe:38, dEbitda:0.2, intCov:40,  fcf:8,   fcfYld:1.1, roic:35, opMgn:32, netMgn:27, cfo:12,  evEbitda:28, de:0.2, gMgn:51, roe:55,  beta:1.25 },
  XOM:  { pe:10, dEbitda:0.8, intCov:18,  fcf:30,  fcfYld:5.2, roic:16, opMgn:14, netMgn:10, cfo:55,  evEbitda:8,  de:0.2, gMgn:38, roe:18,  beta:0.85 },
  CVX:  { pe:11, dEbitda:0.5, intCov:22,  fcf:18,  fcfYld:5.8, roic:14, opMgn:13, netMgn:11, cfo:35,  evEbitda:7,  de:0.2, gMgn:35, roe:14,  beta:0.80 },
  CAT:  { pe:18, dEbitda:2.1, intCov:14,  fcf:6,   fcfYld:3.2, roic:32, opMgn:18, netMgn:13, cfo:10,  evEbitda:12, de:2.0, gMgn:37, roe:55,  beta:1.08 },
  F:    { pe:12, dEbitda:3.5, intCov:5,   fcf:2,   fcfYld:1.8, roic:8,  opMgn:4,  netMgn:2,  cfo:8,   evEbitda:14, de:3.1, gMgn:8,  roe:10,  beta:1.45 },
  JNJ:  { pe:15, dEbitda:1.0, intCov:22,  fcf:18,  fcfYld:4.5, roic:22, opMgn:22, netMgn:18, cfo:22,  evEbitda:14, de:0.5, gMgn:68, roe:22,  beta:0.55 },
  WMT:  { pe:28, dEbitda:1.8, intCov:12,  fcf:12,  fcfYld:1.2, roic:18, opMgn:5,  netMgn:2,  cfo:25,  evEbitda:19, de:0.6, gMgn:25, roe:20,  beta:0.52 },
}

function getSimData(sym: string): Record<string, number | null> {
  if (SIM_FUNDS[sym]) return SIM_FUNDS[sym]
  // Random plausible data for unknown tickers
  const sector = detectSector(sym)
  if (sector === 'bank') return { pe: 8+Math.random()*10, npl: 1.5+Math.random()*2, nim: 2+Math.random(), cet1: 12+Math.random()*4, pb: 0.8+Math.random()*1.2, roe: 8+Math.random()*12, de: 7+Math.random()*5, costInc: 50+Math.random()*20, ltd: 65+Math.random()*30, beta: 0.9+Math.random()*0.6 }
  if (sector === 'tech') return { pe: 30+Math.random()*170, dEbitda: Math.random()*2, intCov: 5+Math.random()*30, fcf: -5+Math.random()*20, fcfYld: -1+Math.random()*5, roic: 5+Math.random()*25, opMgn: -5+Math.random()*30, netMgn: -5+Math.random()*25, cfo: -5+Math.random()*25, evEbitda: 15+Math.random()*40, de: Math.random()*0.5, gMgn: 40+Math.random()*40, roe: 5+Math.random()*30, beta: 1.2+Math.random()*1.2, cashRunway: 12+Math.random()*36 }
  if (sector === 'cyclical') return { pe: 5+Math.random()*20, dEbitda: 1+Math.random()*4, intCov: 3+Math.random()*15, fcf: 1+Math.random()*10, fcfYld: 1+Math.random()*6, roic: 8+Math.random()*18, opMgn: 5+Math.random()*20, netMgn: 3+Math.random()*15, cfo: 2+Math.random()*15, evEbitda: 6+Math.random()*14, de: 0.3+Math.random()*2.5, gMgn: 15+Math.random()*30, roe: 10+Math.random()*30, beta: 1.0+Math.random()*0.8 }
  return { pe: 10+Math.random()*25, dEbitda: 0.5+Math.random()*2.5, intCov: 5+Math.random()*25, fcf: 2+Math.random()*30, fcfYld: 1+Math.random()*7, roic: 8+Math.random()*22, opMgn: 8+Math.random()*22, netMgn: 5+Math.random()*18, cfo: 3+Math.random()*30, evEbitda: 7+Math.random()*15, de: 0.2+Math.random()*1.5, gMgn: 25+Math.random()*40, roe: 10+Math.random()*25, preMgn: 8+Math.random()*20, beta: 0.7+Math.random()*0.9 }
}

// ── Signal evaluation ─────────────────────────────────────────
type Sig = 'green' | 'yellow' | 'red' | 'na'
function evaluate(id: string, v: number | null): { sig: Sig; text: string; short: string } {
  if (v === null || v === undefined) return { sig: 'na', text: 'Data not available', short: 'N/A' }
  const rules: Record<string, (v: number) => { sig: Sig; text: string; short: string }> = {
    dEbitda:    v => v < 2   ? {sig:'green',  text:'Excellent — <2x: fast repayment',         short:'<2x '}  : v < 3 ? {sig:'yellow', text:'Good — 2-3x: manageable',                short:'2–3x !'} : v < 4 ? {sig:'yellow', text:'Caution — 3-4x: monitor',          short:'3–4x !'} : {sig:'red', text:'DANGER — >4x: high debt',             short:'>4x !'},
    intCov:     v => v > 5   ? {sig:'green',  text:'Strong — can cover interest 5x+',               short:'>5x '}  : v > 2 ? {sig:'yellow', text:'Moderate — 2-5x: OK but monitor',    short:'2–5x !'} : v > 1 ? {sig:'red',    text:'Risky — <2x: interest pressure', short:'<2x !'} : {sig:'red', text:'ALARM — cannot cover interest payments', short:'<1x '},
    fcf:        v => v > 0   ? {sig:'green',  text:'Positive FCF — cash available',                  short:'+ '}    : {sig:'red', text:'Negative FCF — cash burn',                         short:'− !'},
    fcfYld:     v => v > 8   ? {sig:'green',  text:'Undervalued — >8%: strong cash vs price',  short:'>8% '}  : v > 5 ? {sig:'green',  text:'Fair — 5-8%',                      short:'5–8% '} : v > 3 ? {sig:'yellow', text:'OK — 3-5%: not cheap',            short:'3–5% !'} : {sig:'red', text:'Expensive — <3%: low cash vs price',         short:'<3% !'},
    roic:       v => v > 15  ? {sig:'green',  text:'Excellent — >15%: profit machine',             short:'>15% '} : v > 10? {sig:'green',  text:'Good — 10-15%: profitable',             short:'10–15% '}: v > 8 ? {sig:'yellow', text:'Moderate — 8–10%',                       short:'8–10% !'}: {sig:'red', text:'Weak — <8%: poor capital use',    short:'<8% !'},
    opMgn:      v => v > 20  ? {sig:'green',  text:'Excellent — >20%: highly profitable',       short:'>20% '} : v > 10? {sig:'green',  text:'Good — 10–20%',                       short:'10–20% '}: v > 5 ? {sig:'yellow', text:'Moderate — 5–10%',                       short:'5–10% !'}: {sig:'red', text:'Weak — <5%: low operating margin', short:'<5% !'},
    netMgn:     v => v > 15  ? {sig:'green',  text:'Excellent — >15%: strong net profit',              short:'>15% '} : v > 8 ? {sig:'green',  text:'Good — 8–15%',                        short:'8–15% '} : v > 5 ? {sig:'yellow', text:'Moderate — 5-8%',                        short:'5–8% !'} : {sig:'red', text:'Fragile — <5%: thin margins',          short:'<5% !'},
    cfo:        v => v > 0   ? {sig:'green',  text:'Positive CFO — operations generate cash',          short:'+ '}    : {sig:'red', text:'Negative CFO — operations burn cash',            short:'− !'},
    evEbitda:   v => v < 8   ? {sig:'green',  text:'Cheap — <8x: attractive valuation',        short:'<8x '}  : v < 12? {sig:'yellow', text:'Fair — 8-12x',                      short:'8–12x !'}: v < 15? {sig:'yellow', text:'Expensive — 12-15x',                        short:'12–15x !'}: {sig:'red', text:'Very expensive — >15x',                  short:'>15x !'},
    pe:         v => v < 12  ? {sig:'green',  text:'Cheap — <12x: low earnings multiple',       short:'<12x '}  : v < 20? {sig:'yellow', text:'Fair — 12-20x',                     short:'12-20x !'}: v < 30? {sig:'yellow', text:'Expensive — 20-30x',                       short:'20-30x !'}: {sig:'red', text:'Very expensive — >30x',                 short:'>30x !'},
    de:         v => v < 0.5 ? {sig:'green',  text:'Low leverage — <0.5x',                     short:'<0.5 '} : v < 1 ? {sig:'yellow', text:'Normal — 0.5-1x',                     short:'0.5–1x !'}: {sig:'red', text:'Leveraged — >1x',                              short:'>1x !'},
    gMgn:       v => v > 60  ? {sig:'green',  text:'Strong gross margin — >60%: scalable model',      short:'>60% '} : v > 40? {sig:'green',  text:'Good — 40–60%',                       short:'40–60% '}: v > 20? {sig:'yellow', text:'Moderate — 20–40%',                      short:'20–40% !'}: {sig:'red', text:'Weak — <20%: peu de marge',        short:'<20% !'},
    roe:        v => v > 15  ? {sig:'green',  text:'Good ROE — >15%: profitable for shareholders',     short:'>15% '} : v > 10? {sig:'yellow', text:'Moderate — 10–15%',                      short:'10–15% !'}: {sig:'red', text:'Weak — <10%',                              short:'<10% !'},
    preMgn:     v => v > 20  ? {sig:'green',  text:'Strong — >20%',                                short:'>20% '} : v > 10? {sig:'yellow', text:'Good — >10%',                          short:'>10% !'} : {sig:'red', text:'Weak — <10%',                              short:'<10% !'},
    beta:       v => v < 0.8 ? {sig:'green',  text:'Defensive — β<0.8: less volatilee than market',    short:'Defensive'}: v < 1.3?{sig:'yellow', text:'Neutral — β≈1: moves with market',       short:'Neutral'}  : {sig:'red', text:'Volatilee — β>1.3: amplifies market moves',   short:'Volatile'},
    nim:        v => v > 3   ? {sig:'green',  text:'Strong — >3%: good interest margin',                short:'>3% '}  : v > 2 ? {sig:'yellow', text:'OK — 2-3%',                           short:'2–3% !'} : {sig:'red', text:'Weak — <2%: NIM under pressure',          short:'<2% !'},
    npl:        v => v < 2   ? {sig:'green',  text:'Clean — <2%: quality loans',                 short:'<2% '}  : v < 5 ? {sig:'yellow', text:'Monitor — 2-5%',                   short:'2–5% !'} : {sig:'red', text:'Risk — >5%: many bad loans',  short:'>5% !'},
    cet1:       v => v > 14  ? {sig:'green',  text:'Solide — >14%: coussin capital fort',            short:'>14% '} : v > 11? {sig:'yellow', text:'OK — 11–14%',                          short:'11–14% !'}: {sig:'red', text:'Fragile — <11%',                           short:'<11% !'},
    pb:         v => v < 1   ? {sig:'green',  text:'Below book — <1x: potentially undervalued',          short:'<1x '}  : v < 1.5?{sig:'yellow', text:'Normal — 1–1.5x',                     short:'1–1.5x !'}: {sig:'red', text:'Cher — >1.5x',                             short:'>1.5x !'},
    costInc:    v => v < 50  ? {sig:'green',  text:'Efficient — <50%: well-managed bank',            short:'<50% '} : v < 65? {sig:'yellow', text:'OK — 50–65%',                          short:'50–65% !'}: {sig:'red', text:'Costly — >65%',                           short:'>65% !'},
    ltd:        v => v < 80  ? {sig:'green',  text:'Healthy — <80%: adequate bank liquidity',         short:'<80% '} : v < 100?{sig:'yellow', text:'Tight — 80-100%',                      short:'80–100% !'}: {sig:'red', text:'Risk — >100%: lending more than deposits', short:'>100% !'},
    cashRunway: v => v > 24  ? {sig:'green',  text:'Safe — >24 months of cash',                    short:'>24m '} : v > 12? {sig:'yellow', text:'OK — 12-24 months',                      short:'12–24m !'}: {sig:'red', text:'DANGER — <12 months before dilution/bankruptcy', short:'<12m !'},
  }
  return rules[id]?.(v) ?? { sig: 'yellow' as Sig, text: String(v), short: String(v) }
}

// ── Sector indicator definitions ─────────────────────────────
interface IndicatorDef {
  num: number; id: string; label: string; unit: string
  formula: string; why: string; trap?: string
}

const INDICATORS: Record<SectorKey, IndicatorDef[]> = {
  normal: [
    { num:1,  id:'dEbitda',  label:'Debt / EBITDA',      unit:'x', formula:'Net Debt ÷ EBITDA',            why:'How many years of profit to repay debt' },
    { num:2,  id:'intCov',   label:'Interest Coverage',  unit:'x', formula:'EBIT ÷ Interest Expense',                why:'Can it pay interest on its debt?',      trap:'<1x = ALARM — cannot cover interest' },
    { num:3,  id:'fcf',      label:'Free Cash Flow',     unit:'B', formula:'CFO − Capex',                    why:'Real cash available after investments' },
    { num:4,  id:'fcfYld',   label:'FCF Yield',          unit:'%', formula:'FCF ÷ Market Cap × 100',         why:'Is the stock expensive relative to cash generated?' },
    { num:5,  id:'roic',     label:'ROIC',               unit:'%', formula:'NOPAT ÷ Invested Capital',        why:'L\'entreprise transforme-t-elle l\'argent en profit ?' },
    { num:6,  id:'opMgn',    label:'Operating Margin',   unit:'%', formula:'EBIT ÷ Revenue',                 why:'Business profitability before interest and taxes' },
    { num:7,  id:'netMgn',   label:'Net Margin',         unit:'%', formula:'Net Income ÷ Revenue',           why:'Net profit after everything: taxes, interest, exceptional' },
    { num:8,  id:'cfo',      label:'CFO',                unit:'B', formula:'Cash from Operations',           why:'CFO < Net Income long term = earnings not cash-backed', trap:'If CFO < Net Income over multiple years = caution' },
    { num:9,  id:'evEbitda', label:'EV / EBITDA',        unit:'x', formula:'(MktCap + Debt − Cash) ÷ EBITDA', why:'True business price — debt and cash included' },
    { num:10, id:'pe',       label:'P/E Ratio',          unit:'x', formula:'Price ÷ Earnings Per Share',     why:'Price relative to earnings — most common valuation metric' },
    { num:11, id:'de',       label:'Debt / Equity',      unit:'x', formula:'Total Debt ÷ Equity',          why:'Debt level relative to equity' },
    { num:11, id:'gMgn',     label:'Gross Margin',       unit:'%', formula:'(Revenue − COGS) ÷ Revenue',     why:'Gross profit per sale before overhead' },
    { num:12, id:'roe',      label:'ROE',                unit:'%', formula:'Net Income ÷ Equity',            why:'Shareholder return on equity',                       trap:'WARNING: buybacks reduce equity and mechanically inflate ROE' },
    { num:13, id:'preMgn',   label:'Pretax Margin',      unit:'%', formula:'EBT ÷ Revenue',                  why:'What remains after debt costs, before taxes' },
    { num:14, id:'beta',     label:'Beta',               unit:'',  formula:'Return regression vs market', why:'Price movement intensity vs market: 1=market, >1.3=very volatilee' },
  ],
  cyclical: [
    { num:1,  id:'dEbitda',  label:'Debt / EBITDA',      unit:'x', formula:'Net Debt ÷ EBITDA',            why:'En cyclique: la dette peut TUER en bas de cycle',  trap:'Ratios "beaux" au PIC du cycle — regarder 3–5 ans' },
    { num:2,  id:'intCov',   label:'Interest Coverage',  unit:'x', formula:'EBIT ÷ Interest Expense',                why:'Interest payments continue even when profits drop' },
    { num:3,  id:'cfo',      label:'CFO (multi-year)', unit:'B', formula:'Cash from Operations',           why:'For cyclicals: review 3-5 years, not just current year', trap:'One good year can mask a negative cycle' },
    { num:4,  id:'fcf',      label:'FCF (multi-year)', unit:'B', formula:'CFO − Capex',                    why:'FCF Yield useful ONLY if FCF stable across full cycle' },
    { num:5,  id:'de',       label:'Debt / Equity',      unit:'x', formula:'Total Debt ÷ Equity',          why:'Levier amplifie les pertes en retournement de cycle',  trap:'Ratio qui semble normal au pic peut exploser en bas de cycle' },
    { num:6,  id:'opMgn',    label:'Operating Margin',   unit:'%', formula:'EBIT ÷ Revenue',                 why:'For cyclicals: STABILITY > level — stable margin = quality' },
    { num:7,  id:'roic',     label:'ROIC (moy. cycle)',  unit:'%', formula:'NOPAT ÷ Capital',                why:'Prefer full-cycle average over peak ROIC', trap:'ROIC at cycle peak can be too flattering' },
    { num:8,  id:'evEbitda', label:'EV / EBITDA',        unit:'x', formula:'(MktCap + D − Cash) ÷ EBITDA',  why:'With CAUTION — high EV/EBITDA at peak = dangerous, not an opportunity', trap:'EV/EBITDA bas en bas de cycle ≠ automatiquement bon' },
    { num:9,  id:'netMgn',   label:'Net Margin',         unit:'%', formula:'Net Income ÷ Revenue',           why:'For cyclicals: margin at cycle bottom = true stress test' },
    { num:10, id:'gMgn',     label:'Gross Margin',       unit:'%', formula:'(Revenue − COGS) ÷ Revenue',     why:'Si marge brute s\'effondre en bas de cycle = pas de pricing power' },
    { num:11, id:'fcfYld',   label:'FCF Yield',          unit:'%', formula:'FCF ÷ MktCap × 100',             why:'Pertinent SEULEMENT si FCF est stable sur le cycle',  trap:'FCF au pic du cycle gonfle artificiellement le yield' },
    { num:12, id:'beta',     label:'Beta',               unit:'',  formula:'Regression vs market',           why:'Cyclicals often have structurally high beta' },
  ],
  tech: [
    { num:1,  id:'cfo',       label:'CFO — Trend',    unit:'B', formula:'Cash from Operations',           why:'Burn or improvement? C\'est LA question #1 en tech early', trap:'Un CFO negative est acceptable si la tendance s\'improves' },
    { num:2,  id:'fcf',       label:'FCF — Real burn',   unit:'B', formula:'CFO − Capex',                    why:'Negative FCF acceptable IF path to positive is visible' },
    { num:3,  id:'cashRunway',label:'Cash Runway',        unit:'m', formula:'Cash ÷ Burn annuel',             why:'Combien de mois avant dilution ou faillite ?',           trap:'Si runway <12 mois sans FCF positive = dilution ou faillite imminente' },
    { num:4,  id:'gMgn',      label:'Gross Margin',      unit:'%', formula:'(Revenue − COGS) ÷ Revenue',     why:'>60% = scalable model: each additional sale is nearly pure margin' },
    { num:5,  id:'opMgn',     label:'Operating Margin',  unit:'%', formula:'EBIT ÷ Revenue',                 why:'Not necessarily positive — but MUST improve each quarter' },
    { num:6,  id:'de',        label:'Debt / Equity',     unit:'x', formula:'Total Debt ÷ Equity',          why:'In early tech: often low. If high = immediate RED FLAG',  trap:'Dette highe en tech early = signe de problème de model' },
    { num:7,  id:'intCov',    label:'Interest Coverage', unit:'x', formula:'EBIT ÷ Interest Expense',                why:'Pertinent uniquement si la société a de la dette existante' },
    { num:8,  id:'roic',      label:'ROIC',              unit:'%', formula:'NOPAT ÷ Capital',                why:'Pertinent seulement quand la tech devient mature — faible en early = normal' },
    { num:9,  id:'evEbitda',  label:'EV / EBITDA',       unit:'x', formula:'(MktCap + D − Cash) ÷ EBITDA',  why:'Seulement si EBITDA existe. Sinon: utiliser EV/Revenue' },
    { num:10, id:'fcfYld',    label:'FCF Yield',         unit:'%', formula:'FCF ÷ MktCap × 100',             why:'Pertinent seulement si FCF est stable et positive' },
    { num:11, id:'beta',      label:'Beta',              unit:'',  formula:'Regression vs market',           why:'>1.5 very courant en tech — volatileité structurellement highe' },
  ],
  bank: [
    { num:1,  id:'npl',       label:'NPL Ratio',         unit:'%', formula:'Prêts impayés ÷ Total prêts',    why:'Qualité des prêts — un prêt devient NPL après 90j de retard', trap:'NPL peut exploser very vite en récession' },
    { num:2,  id:'cet1',      label:'CET1 Ratio',        unit:'%', formula:'Capital CET1 ÷ RWA',             why:'Coussin de capital — resilience aux chocs financiers' },
    { num:3,  id:'pb',        label:'P / Book (P/B)',    unit:'x', formula:'Prix ÷ Capitaux propres comptables', why:'Si P/B < 1 ET ROE > 10% → potentiellement intéressant' },
    { num:4,  id:'roe',       label:'ROE',               unit:'%', formula:'Net Income ÷ Equity',            why:'Key bank valuation combo: ROE > 10% + P/B < 1 = opportunity' },
    { num:5,  id:'nim',       label:'NIM',               unit:'%', formula:'(Interests reçus − payés) ÷ Actifs productifs', why:'Ce que gagne la banque sur ses opérations de crédit' },
    { num:6,  id:'costInc',   label:'Cost-to-Income',    unit:'%', formula:'Coûts d\'exploitation ÷ Revenus nets', why:'Efficacité de la banque: combien coûte chaque euro de revenu' },
    { num:7,  id:'ltd',       label:'Loan-to-Deposit',   unit:'%', formula:'Prêts ÷ Dépôts',                 why:'Liquidité banque — risque bank run si ratio trop high' },
    { num:8,  id:'de',        label:'Debt / Equity',     unit:'x', formula:'Total Debt ÷ Equity',          why:'Moins central pour banques — ratio naturellement high',    trap:'Debt/Equity high est NORMAL pour une banque, ≠ industrie' },
    { num:9,  id:'beta',      label:'Beta',              unit:'',  formula:'Regression vs market',           why:'Les banques sont cycliques avec le crédit — beta modéré' },
  ],
}

// ── Mini sparkline with fill ──────────────────────────────────
function Spark({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null
  const w = 80, h = 28, pad = 2
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 0.001
  const pts = data.map((v, i) =>
    `${pad + (w - 2 * pad) * i / (data.length - 1)},${h - pad - (v - mn) / rng * (h - 2 * pad)}`
  ).join(' ')
  const ptArr = pts.split(' ')
  const fill = `${ptArr[0]} ${pts} ${ptArr[ptArr.length-1].split(',')[0]},${h-pad} ${pad},${h-pad}`
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polygon points={fill} fill={color} opacity="0.1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── Indicator card ────────────────────────────────────────────
function Card({ def, value, sector }: { def: IndicatorDef; value: number | null; sector: SectorKey }) {
  const [hov, setHov] = useState(false)
  const ev = evaluate(def.id, value)
  const col = ev.sig === 'green' ? '#3fb950' : ev.sig === 'red' ? '#f85149' : ev.sig === 'yellow' ? '#d29922' : '#8b949e'
  const display = value === null ? 'N/A' : def.unit === 'B' ? `$${Math.abs(value) >= 1 ? value.toFixed(0) : value.toFixed(1)}B` : def.unit === 'm' ? `${Math.round(value)}m` : def.unit === '' ? `β${value.toFixed(2)}` : `${value.toFixed(1)}${def.unit}`

  // Generate sparkline history
  const hist = value !== null ? Array.from({ length: 8 }, (_, i) => {
    const v = value * (0.75 + Math.sin(i * 0.8) * 0.15 + Math.random() * 0.1)
    return Math.max(0.01, v)
  }) : []

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#161b22' : '#0e1117',
        border: `1px solid ${hov ? col + '55' : '#21262d'}`,
        borderTop: `2px solid ${value !== null ? col : '#21262d'}`,
        padding: '8px 10px 6px',
        position: 'relative',
        transition: 'all 0.12s',
        cursor: 'default',
      }}>

      {/* Priority number */}
      <div style={{ position:'absolute', top:5, right:7, fontSize:8, color:'#8b949e', fontWeight:700 }}>#{def.num}</div>

      {/* Label */}
      <div style={{ fontSize: 8, color: '#8b949e', letterSpacing:0.4, marginBottom: 5, paddingRight: 14, lineHeight: 1.3 }}>{def.label}</div>

      {/* Value */}
      <div style={{ fontSize: value === null ? 11 : 17, fontWeight: 700, color: col, fontFamily:"inherit", marginBottom: 4 }}>{display}</div>

      {/* Signal badge */}
      <div style={{ fontSize: 8, color: col, background: col+'12', border:`1px solid ${col}25`, padding:'1px 5px', display:'inline-block', marginBottom: 5 }}>
        {ev.short}
      </div>

      {/* Sparkline */}
      {hist.length > 0 && <Spark data={hist} color={col} />}

      {/* Tooltip on hover */}
      {hov && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 4px)', left:0, zIndex:100, minWidth:220,
          background:'#21262d', border:`1px solid ${col}44`, padding:'10px 12px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.8)',
        }}>
          <div style={{ fontSize:10, color:col, fontWeight:700, marginBottom:5 }}>{def.label}</div>
          <div style={{ fontSize:8, color:'#8b949e', lineHeight:1.8 }}>
            <div>📐 <b>Formule:</b> {def.formula}</div>
            <div>💡 <b>Pourquoi:</b> {def.why}</div>
            {def.trap && <div style={{ color:'#f85149', marginTop:4 }}>! <b>PIÈGE:</b> {def.trap}</div>}
          </div>
          <div style={{ marginTop:6, fontSize:8, color:col }}>{ev.text}</div>
        </div>
      )}
    </div>
  )
}

// ── Category section (collapsible group) ─────────────────────
function CategorySection({ title, items, data, sector }: {
  title: string
  items: IndicatorDef[]
  data: Record<string, number | null>
  sector: SectorKey
}) {
  const [open, setOpen] = useState(true)

  // Count indicator health in this category
  const sigs = items.map(d => evaluate(d.id, data[d.id] ?? null).sig)
  const greens = sigs.filter(s => s === 'green').length
  const yellows = sigs.filter(s => s === 'yellow').length
  const reds = sigs.filter(s => s === 'red').length

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Header bar — clickable to collapse */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={onActivate(() => setOpen(v => !v))}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '5px 8px', background: '#161b22',
          border: '1px solid #21262d', cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
        onMouseLeave={e => (e.currentTarget.style.background = '#161b22')}>
        <span style={{
          fontSize: 9, color: '#8b949e', transition: 'transform 120ms',
          display: 'inline-block',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>▶</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#c9d1d9',
          letterSpacing: 0.6, textTransform: 'uppercase',
        }}>{title}</span>
        <span style={{ fontSize: 9, color: '#484f58', fontWeight: 500 }}>
          {items.length} metric{items.length === 1 ? '' : 's'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: 9, fontWeight: 700 }}>
          {greens > 0 && <span style={{ color: '#3fb950' }}>● {greens}</span>}
          {yellows > 0 && <span style={{ color: '#d29922' }}>● {yellows}</span>}
          {reds > 0 && <span style={{ color: '#f85149' }}>● {reds}</span>}
        </div>
      </div>

      {/* Content grid */}
      {open && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 6,
          padding: '8px 0',
        }}>
          {items.map(def => (
            <Card key={def.id + def.num} def={def} value={data[def.id] ?? null} sector={sector} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export function FundamentalPanel({ defaultSym = 'AAPL' }: { defaultSym?: string }) {
  const navigate = useNavigate()
  const [input, setInput] = useState(defaultSym.toUpperCase())
  const [sym,   setSym]   = useState(defaultSym.toUpperCase())
  const [liveFund, setLiveFund] = useState<Record<string, number | null> | null>(null)
  const { apiOnline } = useStore()

  const sector  = detectSector(sym)
  const meta    = SECTOR_META[sector]
  const defs    = INDICATORS[sector]
  const simData = getSimData(sym)

  // Fetch real fundamentals when backend is online
  useEffect(() => {
    if (!apiOnline) { setLiveFund(null); return }
    fetchFundamentals(sym).then(f => {
      if (!f) return
      const real: Record<string, number | null> = {}
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

  // When live: use ONLY real data (N/A for missing). When offline: sim fallback.
  const data = liveFund
    ? { ...liveFund }
    : apiOnline ? {} : { ...simData }

  // Score
  const scored  = defs.map(d => evaluate(d.id, data[d.id] ?? null).sig)
  const greens  = scored.filter(s => s === 'green').length
  const yellows = scored.filter(s => s === 'yellow').length
  const reds    = scored.filter(s => s === 'red').length
  const nas     = scored.filter(s => s === 'na').length
  const total   = greens + yellows + reds
  const pct     = total > 0 ? Math.round((greens + yellows * 0.5) / total * 100) : 50
  const hcol    = pct > 65 ? '#3fb950' : pct > 40 ? '#d29922' : '#f85149'
  const verdict = pct > 65 ? ' STRONG FUNDAMENTALS' : pct > 40 ? '! MIXED FUNDAMENTALS' : '! WEAK FUNDAMENTALS'

  return (
    <div style={{ fontFamily:"inherit", border:'1px solid #21262d', background:'#0e1117' }}>

      {/* ── Header ─── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 14px', borderBottom:'1px solid #21262d', flexWrap:'wrap' }}>

        <span style={{ fontSize:10, color:'#388bfd', fontWeight:700, letterSpacing:0.6 }}>FUNDAMENTAL ANALYSIS</span>

        {/* Ticker input */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input value={input} onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && setSym(input)}
            style={{ background:'#161b22', border:'1px solid #21262d', color:'#c9d1d9', fontSize:11, fontWeight:700, padding:'3px 8px', width:85, outline:'none', fontFamily:"inherit" }} />
          <button onClick={() => setSym(input)}
            style={{ fontSize:8, color:'#388bfd', border:'1px solid #388bfd44', background:'transparent', padding:'3px 8px', cursor:'pointer' }}>GO</button>
          <button onClick={() => navigate(`/ticker/${sym}`)}
            style={{ fontSize:8, color:'#388bfd', border:'1px solid #388bfd44', background:'transparent', padding:'3px 8px', cursor:'pointer' }}>OPEN →</button>
        </div>

        {/* Auto-detected sector badge */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', background: meta.color+'12', border:`1px solid ${meta.color}33` }}>
          <span style={{ fontSize:10 }}>{meta.emoji}</span>
          <span style={{ fontSize:9, color: meta.color, fontWeight:700 }}>AUTO: {sector.toUpperCase()}</span>
          <span style={{ fontSize:8, color:'#8b949e' }}>— {meta.label}</span>
        </div>

        {/* Health score */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', gap:8, fontSize:9 }}>
            <span style={{ color:'#3fb950' }}> {greens}</span>
            <span style={{ color:'#d29922' }}>! {yellows}</span>
            <span style={{ color:'#f85149' }}>! {reds}</span>
            {nas > 0 && <span style={{ color:'#8b949e' }}>— {nas}</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:70, height:4, background:'#21262d', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:hcol, transition:'width 0.5s' }} />
            </div>
            <span style={{ fontSize:10, color:hcol, fontWeight:700 }}>{pct}%</span>
          </div>
          <span style={{ fontSize:9, color:hcol, fontWeight:700 }}>{verdict}</span>
        </div>
      </div>

      {/* ── Sector warning banner ─── */}
      {meta.warning && (
        <div style={{ padding:'5px 14px', borderBottom:`1px solid ${meta.color}22`, background:`${meta.color}08`, fontSize:8, color:meta.color }}>
          {meta.warning}
        </div>
      )}

      {/* ── Categorized indicator sections ─── */}
      <div style={{ padding: 10 }}>
        {(() => {
          // Group defs by category
          const groups = new Map<Category, typeof defs>()
          for (const d of defs) {
            const cat = CATEGORY_OF[d.id] ?? 'OTHER'
            if (!groups.has(cat)) groups.set(cat, [])
            groups.get(cat)!.push(d)
          }
          // Render in canonical order, skipping empty categories
          return CATEGORY_ORDER.filter(c => groups.has(c)).map(cat => {
            const items = groups.get(cat)!
            return <CategorySection key={cat} title={cat} items={items} data={data} sector={sector} />
          })
        })()}
      </div>

      {/* ── Quick tickers for demo ─── */}
      <div style={{ padding:'6px 14px', borderTop:'1px solid #21262d', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:8, color:'#8b949e' }}>TRY:</span>
        {['AAPL','NVDA','JPM','TSLA','SNOW','XOM','CAT','AMZN'].map(t => (
          <button key={t} onClick={() => { setInput(t); setSym(t) }}
            style={{ fontSize:8, color: detectSector(t) === 'bank' ? '#7c4dff' : detectSector(t) === 'tech' ? '#3fb950' : detectSector(t) === 'cyclical' ? '#388bfd' : '#388bfd',
              border:`1px solid currentColor`, background:'transparent', padding:'1px 7px', cursor:'pointer', opacity: sym === t ? 1 : 0.5 }}>
            {t}
          </button>
        ))}
        <span style={{ fontSize:7, color:'#21262d', marginLeft:'auto' }}>Source: Fundamental Analysis • Hover for formula + thresholds</span>
      </div>
    </div>
  )
}
