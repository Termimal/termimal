// pages/EventRiskPage.tsx — Event Risk Monitor v3
// Data transparency, 22 curated events, terminal-grade polish
import React, { useState } from 'react'
import { TvLineChart } from '@/components/charts/TvLineChart'

const mono = "'SF Mono', Menlo, Consolas, monospace"

type Impact = 'Low' | 'Medium' | 'High' | 'Critical'
type Horizon = 'Near-term' | 'Medium-term' | 'Long-term'
type SourceMethod = 'Market-derived' | 'Model-based' | 'Aggregated' | 'Analyst estimate' | 'Editorial estimate'
type Reliability = 'High' | 'Medium' | 'Low'
type Freshness = 'Hourly' | 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Static'

interface DataTransparency {
  source: string
  freshness: Freshness
  method: SourceMethod
  reliability: Reliability
  lastVerified: string
}

interface EventItem {
  id: string; name: string; category: string; probability: number; delta7d: number; delta30d: number
  date: string | null; history: number[]
  impact: Impact; horizon: Horizon; transparency: DataTransparency
  primaryDrivers: string[]; relatedAssets: string[]; opposingForces: string[]; keyCatalysts: string[]
}

const CATEGORIES = ['All', 'Central Bank', 'Macro', 'Geopolitical', 'Markets', 'Regulatory']

const IMPACT_COLORS: Record<Impact, string> = { Critical:'#f85149', High:'#d29922', Medium:'#388bfd', Low:'#484f58' }
const RELIABILITY_COLORS: Record<Reliability, string> = { High:'#3fb950', Medium:'#d29922', Low:'#f85149' }

function impactRank(i: Impact): number { return { Critical:4, High:3, Medium:2, Low:1 }[i] }

// ─── Momentum ────────────────────────────────────────────
function getMomentum(history: number[]): { label: string; color: string } {
  if (history.length < 4) return { label: 'Market-priced', color: '#388bfd' }
  const recent = history.slice(-4)
  const older = history.slice(-8, -4)
  if (older.length === 0) return { label: 'Market-priced', color: '#388bfd' }
  const rA = recent.reduce((a, b) => a + b, 0) / recent.length
  const oA = older.reduce((a, b) => a + b, 0) / older.length
  const d = rA - oA
  if (d > 2) return { label: 'Rising risk', color: '#d29922' }
  if (d < -2) return { label: 'Falling risk', color: '#388bfd' }
  return { label: 'Stable outlook', color: '#484f58' }
}

// ─── 22 curated events ───────────────────────────────────
const EVENTS: EventItem[] = [
  // ── Central Bank (5) ──
  { id:'fed-cut-jun', name:'Fed cuts rates by June 2026', category:'Central Bank', impact:'Critical', horizon:'Near-term',
    probability:62, delta7d:4, delta30d:-8, date:'2026-06-18',
    history:[45,48,52,55,58,54,50,53,58,62,66,70,68,65,60,58,62],
    transparency:{ source:'CME FedWatch (sample)', freshness:'Weekly', method:'Market-derived', reliability:'Medium', lastVerified:'2026-03-21' },
    primaryDrivers:['Core PCE trajectory','Labor market cooling','FOMC dot plot shift','Financial conditions tightening'],
    relatedAssets:['US10Y','DXY','TLT','SPY','GLD'],
    opposingForces:['Sticky services inflation','Fiscal deficit widening','Strong consumer spending'],
    keyCatalysts:['Apr 10 CPI release','May 7 FOMC meeting','June 18 FOMC decision'] },
  { id:'ecb-cut-h2', name:'ECB cuts rates to 2.25% by year-end', category:'Central Bank', impact:'High', horizon:'Medium-term',
    probability:58, delta7d:-2, delta30d:5, date:'2026-12-31',
    history:[48,50,52,54,55,56,57,58,59,60,58,57,56,57,58,58,58],
    transparency:{ source:'ESTR futures curve (sample)', freshness:'Weekly', method:'Market-derived', reliability:'Medium', lastVerified:'2026-03-21' },
    primaryDrivers:['Eurozone disinflation','Weak German industrial output','Credit contraction'],
    relatedAssets:['EURUSD','DE10Y','STOXX50','Euro IG credit'],
    opposingForces:['Services inflation persistence','Wage growth above 4%','Fiscal expansion plans'],
    keyCatalysts:['Apr 17 ECB meeting','Eurozone flash CPI','German IFO survey'] },
  { id:'boj-hike', name:'BOJ hikes above 0.75% by end 2026', category:'Central Bank', impact:'High', horizon:'Medium-term',
    probability:44, delta7d:6, delta30d:15, date:'2026-12-31',
    history:[18,20,22,25,28,30,32,34,36,38,40,38,40,42,43,42,44],
    transparency:{ source:'JPY OIS curve + BOJ communication (sample)', freshness:'Bi-weekly', method:'Model-based', reliability:'Medium', lastVerified:'2026-03-20' },
    primaryDrivers:['Japanese CPI above 2%','Shunto wage negotiations above 5%','Yen depreciation pressure'],
    relatedAssets:['USDJPY','JP10Y','NKY','DXJ'],
    opposingForces:['Weak domestic consumption','Government pressure for accommodation','Global slowdown risk'],
    keyCatalysts:['Shunto results','BOJ quarterly outlook report','Tankan survey'] },
  { id:'boe-cut', name:'BOE cuts below 4% in H2 2026', category:'Central Bank', impact:'Medium', horizon:'Medium-term',
    probability:55, delta7d:3, delta30d:7, date:'2026-12-31',
    history:[38,40,42,44,45,47,48,49,50,51,52,53,52,54,55,54,55],
    transparency:{ source:'SONIA swap rates (sample)', freshness:'Weekly', method:'Market-derived', reliability:'Medium', lastVerified:'2026-03-21' },
    primaryDrivers:['UK services disinflation','MPC dovish shift','Housing market weakness'],
    relatedAssets:['GBPUSD','UK10Y','FTSE100'],
    opposingForces:['Wage growth still elevated','Energy price pass-through','Fiscal spending'],
    keyCatalysts:['MPC voting pattern','UK CPI release','Spring statement'] },
  { id:'pboc-stimulus', name:'PBOC delivers major stimulus package', category:'Central Bank', impact:'High', horizon:'Near-term',
    probability:48, delta7d:5, delta30d:10, date:null,
    history:[30,32,33,35,36,38,39,40,42,43,44,45,44,46,47,47,48],
    transparency:{ source:'PBOC OMO data + state media signals (sample)', freshness:'Weekly', method:'Analyst estimate', reliability:'Low', lastVerified:'2026-03-18' },
    primaryDrivers:['Property sector contraction','Youth unemployment above 15%','Deflationary pressure','Capital outflow acceleration'],
    relatedAssets:['FXI','USDCNH','Copper','AUD','Iron Ore'],
    opposingForces:['Yuan depreciation concern','Local government debt ceiling','US trade retaliation risk'],
    keyCatalysts:['Quarterly GDP release','Politburo economic meeting','RRR decision window'] },

  // ── Macro (5) ──
  { id:'us-recession', name:'US recession onset within 12 months', category:'Macro', impact:'Critical', horizon:'Medium-term',
    probability:22, delta7d:-3, delta30d:-8, date:null,
    history:[35,33,30,28,26,25,24,23,22,21,20,22,24,25,24,23,22],
    transparency:{ source:'Conference Board LEI composite (sample)', freshness:'Monthly', method:'Model-based', reliability:'Medium', lastVerified:'2026-03-15' },
    primaryDrivers:['Yield curve normalization lag','ISM PMI below 50','Consumer sentiment decline','Credit tightening'],
    relatedAssets:['SPY','TLT','HYG','VIX','US10Y-2Y'],
    opposingForces:['Strong labor market','Fiscal spending resilience','AI-driven productivity gains'],
    keyCatalysts:['ISM PMI release','Monthly payrolls','GDP advance estimate','Consumer confidence'] },
  { id:'eu-recession', name:'Eurozone enters recession in 2026', category:'Macro', impact:'High', horizon:'Medium-term',
    probability:32, delta7d:1, delta30d:4, date:null,
    history:[22,24,25,26,27,28,29,28,29,30,31,30,31,32,31,32,32],
    transparency:{ source:'Eurostat + PMI composite (sample)', freshness:'Monthly', method:'Model-based', reliability:'Medium', lastVerified:'2026-03-15' },
    primaryDrivers:['German industrial contraction','Credit impulse negative','Energy cost overhang','Trade exposure to China'],
    relatedAssets:['EURUSD','STOXX50','DE10Y','EWG'],
    opposingForces:['Services sector resilience','ECB easing cycle','NextGenEU fiscal flows'],
    keyCatalysts:['Flash PMI','German IFO','Eurostat GDP flash','ECB lending survey'] },
  { id:'us-cpi-reaccel', name:'US core inflation re-accelerates above 3.5%', category:'Macro', impact:'High', horizon:'Near-term',
    probability:20, delta7d:-2, delta30d:-5, date:null,
    history:[30,28,27,26,25,24,23,22,22,21,20,21,22,21,20,20,20],
    transparency:{ source:'BLS CPI + Cleveland Fed Nowcast (sample)', freshness:'Monthly', method:'Model-based', reliability:'Medium', lastVerified:'2026-03-12' },
    primaryDrivers:['Shelter cost persistence','Wage-price feedback','Supply chain re-shoring costs','Commodity uptick'],
    relatedAssets:['TLT','TIP','DXY','GLD','US10Y'],
    opposingForces:['Base effects favorable','Used car deflation','Healthcare disinflation'],
    keyCatalysts:['Monthly CPI release','PCE deflator','Cleveland Fed Nowcast update'] },
  { id:'china-hard-landing', name:'China GDP growth falls below 3%', category:'Macro', impact:'Critical', horizon:'Long-term',
    probability:12, delta7d:1, delta30d:3, date:null,
    history:[6,7,7,8,8,9,9,10,10,10,11,11,10,11,12,12,12],
    transparency:{ source:'NBS + satellite indicators (sample)', freshness:'Quarterly', method:'Analyst estimate', reliability:'Low', lastVerified:'2026-03-01' },
    primaryDrivers:['Property deleveraging','Local government debt stress','Demographics','Export demand contraction'],
    relatedAssets:['FXI','USDCNH','Copper','AUD','Iron Ore','EEM'],
    opposingForces:['State industrial policy','Infrastructure spending','Tech sector growth'],
    keyCatalysts:['Quarterly GDP','PMI releases','Property sales data','Trade balance'] },
  { id:'global-slowdown', name:'Synchronized global growth slowdown (<2%)', category:'Macro', impact:'Critical', horizon:'Medium-term',
    probability:18, delta7d:0, delta30d:2, date:null,
    history:[12,13,14,14,15,15,16,16,17,17,17,18,17,18,18,18,18],
    transparency:{ source:'IMF WEO + OECD CLI composite (sample)', freshness:'Monthly', method:'Model-based', reliability:'Medium', lastVerified:'2026-03-10' },
    primaryDrivers:['Trade fragmentation','Monetary policy lag effects','China deceleration','Geopolitical uncertainty tax'],
    relatedAssets:['EEM','Copper','AUDUSD','MSCI World','Shipping indices'],
    opposingForces:['US fiscal resilience','India growth acceleration','AI productivity boost'],
    keyCatalysts:['IMF WEO update','OECD interim forecast','Global PMI composite'] },

  // ── Geopolitical (5) ──
  { id:'us-cn-tariff', name:'US-China tariff escalation by Q3 2026', category:'Geopolitical', impact:'Critical', horizon:'Medium-term',
    probability:38, delta7d:2, delta30d:12, date:null,
    history:[20,22,24,26,25,28,30,32,34,33,35,36,34,36,38,37,38],
    transparency:{ source:'USTR filings + Congressional tracker (sample)', freshness:'Bi-weekly', method:'Analyst estimate', reliability:'Low', lastVerified:'2026-03-18' },
    primaryDrivers:['Semiconductor export controls tightening','Trade deficit widening','Election cycle positioning','Tech decoupling acceleration'],
    relatedAssets:['FXI','USDCNH','KWEB','Copper','SOXX'],
    opposingForces:['Corporate lobbying against tariffs','Supply chain cost pressure','Diplomatic engagement windows'],
    keyCatalysts:['USTR review deadlines','Congressional hearings','Executive order windows','G7/G20 meetings'] },
  { id:'taiwan-strait', name:'Taiwan Strait military escalation', category:'Geopolitical', impact:'Critical', horizon:'Long-term',
    probability:8, delta7d:0, delta30d:-1, date:null,
    history:[12,11,10,10,9,9,8,8,9,8,8,9,8,8,8,8,8],
    transparency:{ source:'DOD reports + OSINT naval tracking (sample)', freshness:'Monthly', method:'Analyst estimate', reliability:'Low', lastVerified:'2026-03-01' },
    primaryDrivers:['PLA military buildup','US arms sales to Taiwan','Cross-strait political dynamics','Semiconductor leverage'],
    relatedAssets:['TSM','SOXX','USDTWD','FXI','GLD','VIX'],
    opposingForces:['Economic interdependence','US deterrence posture','Global diplomatic pressure','Corporate de-risking'],
    keyCatalysts:['PLA exercises near Taiwan','US naval transits','Taiwan political calendar','Semiconductor supply agreements'] },
  { id:'mideast-oil', name:'Middle East conflict disrupts oil supply', category:'Geopolitical', impact:'Critical', horizon:'Near-term',
    probability:18, delta7d:2, delta30d:5, date:null,
    history:[10,11,12,13,14,13,14,15,16,15,16,17,16,17,18,17,18],
    transparency:{ source:'OSINT trackers + shipping data (sample)', freshness:'Weekly', method:'Analyst estimate', reliability:'Low', lastVerified:'2026-03-20' },
    primaryDrivers:['Iran nuclear brinkmanship','Houthi Red Sea disruptions','Israel-Hezbollah escalation','Strait of Hormuz risk'],
    relatedAssets:['WTI','Brent','GLD','XLE','VIX','Shipping ETFs'],
    opposingForces:['US strategic reserve capacity','OPEC+ spare capacity','Diplomatic back-channels','Maritime security coalitions'],
    keyCatalysts:['IAEA reports','Shipping insurance rates','US force deployments','Iran sanctions enforcement'] },
  { id:'ru-ua-ceasefire', name:'Russia-Ukraine ceasefire or escalation', category:'Geopolitical', impact:'High', horizon:'Medium-term',
    probability:25, delta7d:1, delta30d:3, date:null,
    history:[18,19,20,20,21,21,22,22,23,23,24,24,24,25,25,25,25],
    transparency:{ source:'ISW + diplomatic reporting (sample)', freshness:'Weekly', method:'Analyst estimate', reliability:'Low', lastVerified:'2026-03-20' },
    primaryDrivers:['Frontline attrition dynamics','Weapons delivery pipeline','Diplomatic back-channels','Sanctions fatigue'],
    relatedAssets:['EURUSD','TTF Gas','GLD','Wheat','Defense ETFs'],
    opposingForces:['Territorial maximalism on both sides','Domestic political constraints','Escalation risk miscalculation'],
    keyCatalysts:['UN General Assembly','Weapons package approvals','Energy infrastructure attacks','Peace conference invitations'] },
  { id:'eu-energy', name:'EU energy supply crisis recurrence', category:'Geopolitical', impact:'High', horizon:'Medium-term',
    probability:15, delta7d:-1, delta30d:-4, date:null,
    history:[25,24,22,20,19,18,17,16,15,14,15,16,15,14,15,15,15],
    transparency:{ source:'IEA + EU gas storage data (sample)', freshness:'Monthly', method:'Model-based', reliability:'Medium', lastVerified:'2026-03-15' },
    primaryDrivers:['LNG contract expirations','Storage level drawdowns','Winter demand variability','Pipeline infrastructure risk'],
    relatedAssets:['TTF Gas','EURUSD','STOXX50','XLE','Utilities'],
    opposingForces:['Diversified LNG imports','Renewable capacity additions','Industrial demand destruction','Strategic reserves'],
    keyCatalysts:['Storage level reports','LNG spot pricing','Winter weather forecasts','Pipeline maintenance schedules'] },

  // ── Markets (4) ──
  { id:'spx-ath', name:'S&P 500 new all-time high within 12 months', category:'Markets', impact:'Medium', horizon:'Medium-term',
    probability:65, delta7d:2, delta30d:5, date:null,
    history:[55,56,57,58,59,60,60,61,62,62,63,63,64,64,65,65,65],
    transparency:{ source:'Historical base rate + macro conditions (sample)', freshness:'Weekly', method:'Model-based', reliability:'Medium', lastVerified:'2026-03-21' },
    primaryDrivers:['Earnings growth trajectory','AI capex cycle','Rate cut expectations','Buyback activity'],
    relatedAssets:['SPY','QQQ','VIX','HYG','IGV'],
    opposingForces:['Valuation stretched vs history','Geopolitical risk premium','Concentration risk (Mag 7)','Credit spread widening'],
    keyCatalysts:['Earnings season','Fed meetings','Macro data surprises','Flows data (EPFR)'] },
  { id:'oil-100', name:'Oil (WTI) above $100/bbl', category:'Markets', impact:'High', horizon:'Medium-term',
    probability:15, delta7d:1, delta30d:4, date:null,
    history:[8,9,9,10,10,11,11,12,12,13,13,14,14,14,15,15,15],
    transparency:{ source:'Futures curve + supply/demand balance (sample)', freshness:'Weekly', method:'Model-based', reliability:'Medium', lastVerified:'2026-03-21' },
    primaryDrivers:['OPEC+ production discipline','Geopolitical supply risk','Strategic reserve depletion','Demand recovery Asia'],
    relatedAssets:['WTI','Brent','XLE','OIH','USDCAD','NOK'],
    opposingForces:['US shale production growth','EV adoption pace','Global demand uncertainty','SPR release option'],
    keyCatalysts:['OPEC+ meetings','EIA inventory reports','Middle East developments','China demand data'] },
  { id:'btc-100k', name:'Bitcoin sustains above $100K', category:'Markets', impact:'Medium', horizon:'Near-term',
    probability:40, delta7d:3, delta30d:8, date:null,
    history:[22,24,26,28,29,30,32,33,34,35,36,37,38,38,39,40,40],
    transparency:{ source:'Spot exchange data + on-chain (sample)', freshness:'Daily', method:'Market-derived', reliability:'Medium', lastVerified:'2026-03-22' },
    primaryDrivers:['Institutional inflows (ETF)','Halving supply dynamics','Macro hedge narrative','Regulatory clarity improving'],
    relatedAssets:['BTC-USD','ETH-USD','COIN','MSTR','MARA','Stablecoin supply'],
    opposingForces:['Regulatory crackdown risk','Exchange counterparty risk','Leverage unwind','Risk-off correlation'],
    keyCatalysts:['ETF flow data','Regulatory rulings','Macro risk-on/off shifts','Halving anniversary dynamics'] },
  { id:'vix-spike', name:'VIX spike above 35 (stress event)', category:'Markets', impact:'High', horizon:'Near-term',
    probability:25, delta7d:0, delta30d:2, date:null,
    history:[20,20,21,21,22,22,23,23,23,24,24,24,25,25,25,25,25],
    transparency:{ source:'VIX term structure + historical frequency (sample)', freshness:'Weekly', method:'Model-based', reliability:'Medium', lastVerified:'2026-03-21' },
    primaryDrivers:['Geopolitical shock potential','Liquidity fragility','Positioning concentration','Macro surprise sensitivity'],
    relatedAssets:['VIX','UVXY','SPY','TLT','GLD','VIXY'],
    opposingForces:['Systematic vol selling','Central bank put perception','Corporate buybacks','Diversified positioning'],
    keyCatalysts:['FOMC meetings','Geopolitical flashpoints','Options expiration','Liquidity events (quarter-end)'] },

  // ── Regulatory (3) ──
  { id:'crypto-reg', name:'US comprehensive crypto regulation enacted', category:'Regulatory', impact:'Medium', horizon:'Medium-term',
    probability:35, delta7d:1, delta30d:3, date:null,
    history:[28,29,30,31,30,32,33,34,33,34,35,34,33,34,35,35,35],
    transparency:{ source:'Congressional bill tracker (sample)', freshness:'Bi-weekly', method:'Analyst estimate', reliability:'Low', lastVerified:'2026-03-18' },
    primaryDrivers:['Bipartisan stablecoin bill momentum','SEC enforcement pressure','Industry lobbying acceleration'],
    relatedAssets:['BTC-USD','ETH-USD','COIN','Stablecoin supply'],
    opposingForces:['Congressional gridlock','Inter-agency turf wars','Election cycle distraction'],
    keyCatalysts:['Committee markups','SEC enforcement actions','Industry coalition announcements','Midterm campaign positions'] },
  { id:'ai-reg', name:'EU AI Act enforcement triggers market impact', category:'Regulatory', impact:'High', horizon:'Near-term',
    probability:42, delta7d:3, delta30d:8, date:'2026-08-01',
    history:[25,27,28,30,31,33,34,35,36,37,38,39,38,40,41,42,42],
    transparency:{ source:'EU Commission tracker (sample)', freshness:'Monthly', method:'Analyst estimate', reliability:'Low', lastVerified:'2026-03-15' },
    primaryDrivers:['Compliance cost escalation','Model transparency mandates','High-risk classification scope','Cross-border enforcement'],
    relatedAssets:['MSFT','GOOGL','META','NVDA','EU tech sector'],
    opposingForces:['Industry adaptation','Phased implementation','US competitive pressure on EU','Innovation exemptions lobbying'],
    keyCatalysts:['Implementation guideline publications','First enforcement actions','Corporate compliance disclosures','US regulatory response'] },
  { id:'etf-approvals', name:'New major asset class ETF approvals (e.g., ETH, Solana)', category:'Regulatory', impact:'Medium', horizon:'Near-term',
    probability:50, delta7d:2, delta30d:6, date:null,
    history:[32,34,36,38,39,40,41,42,43,44,45,46,47,48,49,50,50],
    transparency:{ source:'SEC filing tracker + Bloomberg (sample)', freshness:'Weekly', method:'Analyst estimate', reliability:'Medium', lastVerified:'2026-03-22' },
    primaryDrivers:['BTC ETF success precedent','Institutional demand signals','SEC leadership shift','Bipartisan political support'],
    relatedAssets:['ETH-USD','SOL-USD','COIN','GBTC','Crypto infrastructure'],
    opposingForces:['SEC staff resistance','Market manipulation concerns','Custody infrastructure gaps','Political reversal risk'],
    keyCatalysts:['SEC comment period deadlines','Commissioner speeches','Court rulings','Industry applications'] },
]

// ─── Helpers ─────────────────────────────────────────────
function DeltaChip({ val }: { val: number }) {
  if (val === 0) return <span style={{ fontSize:10, color:'#30363d', fontFamily:mono }}>—</span>
  const col = val > 0 ? '#3fb950' : '#f85149'
  return <span style={{ fontSize:10, color:col, fontFamily:mono }}>{val > 0 ? '+' : ''}{val}pp</span>
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span style={{ color:'#21262d', fontSize:8, marginLeft:2 }}>&#8597;</span>
  return <span style={{ color:'#388bfd', fontSize:8, marginLeft:2 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

function ImpactLabel({ impact }: { impact: Impact }) {
  const col = IMPACT_COLORS[impact]
  return <span style={{ fontSize:8, fontWeight:600, color:col, letterSpacing:0.4, textTransform:'uppercase' as const }}>{impact}</span>
}

function InterpretationLabel({ history }: { history: number[] }) {
  const { label, color } = getMomentum(history)
  return <span style={{ fontSize:9, color, fontFamily:mono }}>{label}</span>
}

// row highlight style
const rowBase = { borderBottom:'1px solid #161b22', cursor:'pointer', transition:'background 0.08s' }

// ═══ DETAIL VIEW ═══
// ── Estimated Impact Model ─────────────────────────────────
// Maps event categories to expected directional impact on key indicators
// This is a scenario-implied model, NOT a prediction
const IMPACT_MAP: Record<string, Record<string, { dir: string; mag: string; conf: string }>> = {
  'Central Bank': {
    'SPX':  { dir: '▲', mag: '+1.5% to +3%', conf: 'Medium — depends on forward guidance' },
    'US10Y':{ dir: '▼', mag: '−10 to −25bp', conf: 'High — direct rate channel' },
    'DXY':  { dir: '▼', mag: '−0.5% to −1.5%', conf: 'Medium — depends on relative rates' },
    'VIX':  { dir: '▼', mag: '−2 to −5 pts', conf: 'Medium — reduced uncertainty' },
    'GLD':  { dir: '▲', mag: '+1% to +3%', conf: 'Medium — real rate sensitive' },
    'BTC':  { dir: '▲', mag: '+2% to +8%', conf: 'Low — high-beta risk asset' },
    'HYG':  { dir: '▲', mag: '+0.5% to +1%', conf: 'Medium — spread compression' },
  },
  'Macro': {
    'SPX':  { dir: '▼', mag: '−5% to −15%', conf: 'High if recession confirmed' },
    'US10Y':{ dir: '▼', mag: '−50 to −100bp', conf: 'High — flight to safety' },
    'VIX':  { dir: '▲', mag: '+10 to +25 pts', conf: 'High — risk aversion' },
    'DXY':  { dir: '▲', mag: '+2% to +5%', conf: 'Medium — safe haven' },
    'GLD':  { dir: '▲', mag: '+5% to +15%', conf: 'High — crisis hedge' },
    'BTC':  { dir: '?', mag: '±10% to ±20%', conf: 'Low — conflicting narratives' },
    'HYG':  { dir: '▼', mag: '−3% to −8%', conf: 'High — credit risk repricing' },
  },
  'Geopolitical': {
    'WTI':  { dir: '▲', mag: '+5% to +20%', conf: 'Medium — supply disruption risk' },
    'GLD':  { dir: '▲', mag: '+3% to +10%', conf: 'High — safe haven' },
    'VIX':  { dir: '▲', mag: '+5 to +15 pts', conf: 'High — uncertainty spike' },
    'SPX':  { dir: '▼', mag: '−2% to −8%', conf: 'Medium — risk-off' },
    'DXY':  { dir: '▲', mag: '+1% to +3%', conf: 'Medium — safe haven bid' },
    'BTC':  { dir: '?', mag: '±5% to ±15%', conf: 'Low — depends on severity' },
  },
  'default': {
    'SPX':  { dir: '?', mag: '±1% to ±5%', conf: 'Low — event-specific' },
    'VIX':  { dir: '▲', mag: '+2 to +8 pts', conf: 'Medium — any surprise' },
    'DXY':  { dir: '?', mag: '±0.5% to ±2%', conf: 'Low — depends on context' },
  },
}

function EstimatedImpact({ event }: { event: EventItem }) {
  const map = IMPACT_MAP[event.category] || IMPACT_MAP['default']
  const m = "'SF Mono', Menlo, Consolas, monospace"
  const dirCol = (d: string) => d === '▲' ? '#3fb950' : d === '▼' ? '#f85149' : '#d29922'

  // Scale estimates by probability
  const probScale = event.probability > 60 ? 'Higher likelihood' : event.probability > 35 ? 'Moderate likelihood' : 'Lower likelihood'

  return (
    <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid #21262d' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontSize:9, color:'#484f58', textTransform:'uppercase', letterSpacing:0.4 }}>
          ESTIMATED IMPACT IF EVENT OCCURS
        </div>
        <span style={{ fontSize:8, color:'#d29922', background:'#d2992212', border:'1px solid #d2992225', padding:'1px 6px' }}>
          Model estimate · {probScale}
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:6 }}>
        {Object.entries(map).map(([asset, est]) => (
          <div key={asset} style={{ background:'#0e1117', border:'1px solid #21262d', padding:'8px 10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:10, color:'#c9d1d9', fontWeight:500, fontFamily:m }}>{asset}</span>
              <span style={{ fontSize:14, color:dirCol(est.dir) }}>{est.dir}</span>
            </div>
            <div style={{ fontSize:10, color:dirCol(est.dir), fontFamily:m, fontWeight:600, marginBottom:2 }}>{est.mag}</div>
            <div style={{ fontSize:8, color:'#484f58' }}>{est.conf}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:8, color:'#30363d', marginTop:6, fontStyle:'italic' }}>
        Estimates based on historical event-type response patterns. Actual outcomes may differ significantly. Not investment advice.
      </div>
    </div>
  )
}

function EventDetail({ event, onBack }: { event: EventItem; onBack: () => void }) {
  const d7col = event.delta7d > 0 ? '#3fb950' : event.delta7d < 0 ? '#f85149' : '#484f58'
  const d30col = event.delta30d > 0 ? '#3fb950' : event.delta30d < 0 ? '#f85149' : '#484f58'
  const { label: momLabel, color: momCol } = getMomentum(event.history)
  const t = event.transparency

  return (
    <div style={{ padding:'20px 24px' }}>
      {/* Back nav */}
      <span onClick={onBack} style={{ fontSize:12, color:'#388bfd', cursor:'pointer', letterSpacing:'0.01em' }}>← Event Risk Monitor</span>

      {/* Header */}
      <div style={{ marginTop:14, display:'flex', alignItems:'flex-start', gap:16 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:600, color:'#c9d1d9', lineHeight:1.3 }}>{event.name}</div>
          <div style={{ marginTop:5, fontSize:10, color:'#484f58', display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ color:'#8b949e' }}>{event.category}</span>
            <span>·</span><span>{event.horizon}</span>
            <span>·</span><span>{t.source}</span>
            <span>·</span><span>{t.freshness}</span>
            {event.date && <><span>·</span><span>Target: {event.date}</span></>}
          </div>
          <div style={{ marginTop:5, display:'flex', gap:8, alignItems:'center' }}>
            <ImpactLabel impact={event.impact} />
            <span style={{ fontSize:8, color:'#30363d', border:'1px solid #21262d', padding:'0 5px' }}>
              {t.method === 'Market-derived' ? 'MARKET DATA' : t.method === 'Model-based' ? 'MODEL OUTPUT' : 'EDITORIAL ESTIMATE'}
            </span>
          </div>
        </div>
        <div style={{ textAlign:'right', minWidth:100 }}>
          <div style={{ fontSize:26, fontWeight:700, color:'#c9d1d9', fontFamily:mono, lineHeight:1 }}>{event.probability}<span style={{ fontSize:13, color:'#8b949e' }}>%</span></div>
          <div style={{ fontSize:11, color:d7col, fontFamily:mono, marginTop:4 }}>{event.delta7d > 0 ? '+' : ''}{event.delta7d}pp <span style={{ fontSize:9, color:'#30363d' }}>7d</span></div>
          <div style={{ fontSize:9, color:momCol, marginTop:2 }}>{momLabel}</div>
        </div>
      </div>

      {/* Inline KPIs — lighter style */}
      <div style={{ display:'flex', gap:1, marginTop:16, marginBottom:20, background:'#161b22' }}>
        {[
          { l:'Probability', v:`${event.probability}%`, c:'#c9d1d9' },
          { l:'7d Change', v:`${event.delta7d > 0 ? '+' : ''}${event.delta7d}pp`, c:d7col },
          { l:'30d Change', v:`${event.delta30d > 0 ? '+' : ''}${event.delta30d}pp`, c:d30col },
          { l:'Momentum', v:momLabel, c:momCol },
          { l:'Impact', v:event.impact, c:IMPACT_COLORS[event.impact] },
          { l:'Reliability', v:t.reliability, c:RELIABILITY_COLORS[t.reliability] },
        ].map(k => (
          <div key={k.l} style={{ flex:1, padding:'8px 10px', background:'#0e1117' }}>
            <div style={{ fontSize:8, color:'#30363d', marginBottom:2, textTransform:'uppercase' as const, letterSpacing:0.4 }}>{k.l}</div>
            <div style={{ fontSize:13, fontWeight:600, color:k.c, fontFamily:mono }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Probability chart — primary analytical surface */}
      <div style={{ fontSize:9, color:'#484f58', marginBottom:6 }}>
        {event.history.length > 2
          ? <>PROBABILITY HISTORY <span style={{ color:'#30363d' }}>— weekly · {t.method.toLowerCase()} · {t.freshness.toLowerCase()} update</span></>
          : <>CURRENT MARKET PRICING <span style={{ color:'#30363d' }}>— {t.source} · {t.method.toLowerCase()}</span></>
        }
      </div>
      {event.history.length > 2 ? (
        <TvLineChart title="" sub="" unit="%" dec={0} height={320} fill
          lines={[{ label:'Probability', color:'#388bfd', data:event.history }]}
          refs={[{ val:50, color:'#21262d', label:'50%', dash:true }]} />
      ) : (
        <div style={{ height:200, background:'#0e1117', border:'1px solid #21262d', display:'flex', alignItems:'center', justifyContent:'center', gap:40 }}>
          {/* Probability gauge */}
          <div style={{ textAlign:'center' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#21262d" strokeWidth="8" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#388bfd" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 50 * event.probability / 100} ${2 * Math.PI * 50}`}
                strokeLinecap="round" transform="rotate(-90 60 60)" />
              <text x="60" y="55" textAnchor="middle" fill="#c9d1d9" fontSize="24" fontWeight="700" fontFamily="'SF Mono',monospace">{event.probability}%</text>
              <text x="60" y="72" textAnchor="middle" fill="#484f58" fontSize="9">YES probability</text>
            </svg>
          </div>
          {/* Market info */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(event as any)._volume > 0 && (
              <div>
                <div style={{ fontSize:8, color:'#30363d', textTransform:'uppercase', letterSpacing:0.4 }}>Volume traded</div>
                <div style={{ fontSize:16, fontWeight:600, color:'#c9d1d9', fontFamily:"'SF Mono',monospace" }}>${((event as any)._volume / 1000).toFixed(0)}k</div>
              </div>
            )}
            <div>
              <div style={{ fontSize:8, color:'#30363d', textTransform:'uppercase', letterSpacing:0.4 }}>Source</div>
              <div style={{ fontSize:12, color:'#3fb950', fontWeight:500 }}>Polymarket</div>
            </div>
            {(event as any)._url && (
              <a href={(event as any)._url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:10, color:'#388bfd', textDecoration:'none' }}>
                View on Polymarket →
              </a>
            )}
            <div style={{ fontSize:9, color:'#30363d', marginTop:4 }}>History tracking requires multiple snapshots over time</div>
          </div>
        </div>
      )}

      {/* Structured context — 4 blocks */}
      <div style={{ marginTop:20, paddingTop:14, borderTop:'1px solid #21262d', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px 24px' }}>
        <div>
          <div style={{ fontSize:9, color:'#484f58', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:0.4 }}>Primary Drivers</div>
          {event.primaryDrivers.map(d => <div key={d} style={{ fontSize:10, color:'#8b949e', padding:'2px 0', lineHeight:1.5 }}>· {d}</div>)}
        </div>
        <div>
          <div style={{ fontSize:9, color:'#484f58', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:0.4 }}>Related Assets</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {event.relatedAssets.map(a => <span key={a} style={{ fontSize:10, color:'#8b949e', background:'#161b22', padding:'2px 7px', fontFamily:mono }}>{a}</span>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize:9, color:'#484f58', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:0.4 }}>Opposing Forces</div>
          {event.opposingForces.map(d => <div key={d} style={{ fontSize:10, color:'#8b949e', padding:'2px 0', lineHeight:1.5 }}>· {d}</div>)}
        </div>
        <div>
          <div style={{ fontSize:9, color:'#484f58', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:0.4 }}>Key Catalysts</div>
          {event.keyCatalysts.map(d => <div key={d} style={{ fontSize:10, color:'#8b949e', padding:'2px 0', lineHeight:1.5 }}>· {d}</div>)}
        </div>
      </div>

      {/* ── ESTIMATED IMPACT ON INDICATORS ── */}
      <EstimatedImpact event={event} />

      {/* Data Transparency block */}
      <div style={{ marginTop:16, paddingTop:12, borderTop:'1px solid #161b22' }}>
        <div style={{ fontSize:9, color:'#484f58', marginBottom:8, textTransform:'uppercase' as const, letterSpacing:0.4 }}>Data Transparency</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
          {[
            { l:'Source', v:t.source },
            { l:'Freshness', v:t.freshness },
            { l:'Method', v:t.method },
            { l:'Reliability', v:t.reliability, c:RELIABILITY_COLORS[t.reliability] },
            { l:'Last Verified', v:t.lastVerified },
          ].map(f => (
            <div key={f.l}>
              <div style={{ fontSize:8, color:'#21262d', marginBottom:2, textTransform:'uppercase' as const }}>{f.l}</div>
              <div style={{ fontSize:10, color:(f as any).c ?? '#8b949e', lineHeight:1.4 }}>{f.v}</div>
            </div>
          ))}
        </div>
        {t.method !== 'Market-derived' && (
          <div style={{ marginTop:8, fontSize:9, color:'#30363d', fontStyle:'italic' }}>
            This probability is {t.method === 'Analyst estimate' || t.method === 'Editorial estimate' ? 'an editorial estimate' : 'model-derived'} and is not based on live market pricing.
          </div>
        )}
      </div>
    </div>
  )
}

// ═══ OVERVIEW ═══
export function EventRiskPage() {
  const [detail, setDetail] = useState<EventItem | null>(null)
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'probability' | 'delta7d' | 'name' | 'impact' | 'volume'>('volume')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const scrollRef = React.useRef(0)

  // ── Polymarket real data ──
  const [polyEvents, setPolyEvents] = useState<EventItem[]>([])
  const [polyLoading, setPolyLoading] = useState(true)
  const [polySource, setPolySource] = useState<'live' | 'error' | 'loading'>('loading')

  React.useEffect(() => {
    setPolyLoading(true)
    // Use /api/polymarket/markets — same endpoint Polymarket main page uses, returns more
    // markets including non-macro topics (sports, politics, crypto). We sort by 24h volume
    // and surface the highest-activity events first to match the Polymarket website.
    fetch('/api/polymarket/markets')
      .then(r => r.json())
      .then((raw: any[]) => {
        if (Array.isArray(raw) && raw.length > 0) {
          // Sort by 24h volume descending so the highest-activity markets surface first
          const byVolume = raw.slice().sort((a, b) => (b.volume_24h ?? 0) - (a.volume_24h ?? 0))
          // Map Polymarket Market shape → EventItem
          const mapped: EventItem[] = byVolume.map((m: any) => {
            // Inferred category from question text (best-effort heuristic)
            const q = (m.question || '').toLowerCase()
            const cat: string =
              /fed|rate|fomc|ecb|boj|boe|hike|cut|monetary/.test(q)             ? 'Central Bank' :
              /election|vote|president|congress|senate|policy|tariff/.test(q)   ? 'Geopolitical' :
              /recession|gdp|inflation|cpi|jobs|unemployment|growth/.test(q)    ? 'Macro' :
              /sec|regulation|approval|ban|legal/.test(q)                       ? 'Regulatory' :
                                                                                  'Markets'
            // Probability = YES price × 100 (Polymarket binary markets: yes_price ∈ [0,1])
            const prob = Math.round((m.yes_price ?? 0.5) * 100 * 10) / 10
            // Impact = a function of liquidity + volume (gives a hierarchy without needing analyst input)
            const liq = m.liquidity ?? 0
            const v24 = m.volume_24h ?? 0
            const impact: Impact =
              (liq > 5_000_000 || v24 > 1_000_000) ? 'Critical' :
              (liq > 1_000_000 || v24 > 250_000)   ? 'High'     :
              (liq > 250_000)                       ? 'Medium'   : 'Low'
            return {
              id: m.id || m.condition_id || m.question?.slice(0, 32),
              name: m.question || 'Untitled market',
              category: cat,
              probability: prob,
              delta7d: 0, delta30d: 0,
              date: m.end_date || null,
              history: [prob],
              impact,
              horizon: 'Near-term' as Horizon,
              transparency: {
                source: 'Polymarket',
                freshness: 'Hourly' as Freshness,
                method: 'Market-derived' as SourceMethod,
                reliability: 'High' as Reliability,
                lastVerified: new Date().toISOString().slice(0, 10),
              },
              primaryDrivers: [], relatedAssets: [], opposingForces: [], keyCatalysts: [],
              _volume: v24,
              _liquidity: liq,
              _url: m.url ?? '',
            } as any
          })
          setPolyEvents(mapped)
          setPolySource('live')
        } else {
          setPolySource('error')
        }
      })
      .catch(() => setPolySource('error'))
      .finally(() => setPolyLoading(false))
  }, [])

  // Merge: Polymarket first, then curated fallback
  const allEvents = polySource === 'live' ? polyEvents : EVENTS
  const sourceLabel = polySource === 'live' ? 'Polymarket · Live odds' : 'Curated estimates · Not live'

  const openDetail = (ev: EventItem) => {
    const main = document.querySelector('main')
    if (main) scrollRef.current = main.scrollTop
    setDetail(ev)
    requestAnimationFrame(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 0 })
  }
  const closeDetail = () => {
    setDetail(null)
    requestAnimationFrame(() => { const m = document.querySelector('main'); if (m) m.scrollTop = scrollRef.current })
  }
  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  if (detail) return <EventDetail event={detail} onBack={closeDetail} />

  const filtered = allEvents.filter(e => {
    if (cat !== 'All' && e.category !== cat) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.category.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const sorted = [...filtered].sort((a, b) => {
    const m = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'name') return a.name.localeCompare(b.name) * m
    if (sortKey === 'impact') return (impactRank(b.impact) - impactRank(a.impact)) * m
    if (sortKey === 'volume') return (((b as any)._volume ?? 0) - ((a as any)._volume ?? 0)) * m
    return ((b[sortKey] ?? 0) - (a[sortKey] ?? 0)) * m
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Header */}
      <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, color:'#8b949e', fontWeight:500 }}>EVENT RISK MONITOR</span>
          <span style={{ fontSize:10, color:'#30363d' }}>{sorted.length} events</span>
          {polySource === 'live' ? (
            <span style={{ fontSize:8, color:'#3fb950', border:'1px solid #3fb95033', padding:'0 5px' }}>● POLYMARKET LIVE</span>
          ) : polyLoading ? (
            <span style={{ fontSize:8, color:'#d29922', border:'1px solid #d2992233', padding:'0 5px' }}>LOADING...</span>
          ) : (
            <span style={{ fontSize:8, color:'#484f58', border:'1px solid #21262d', padding:'0 5px' }}>SAMPLE DATA</span>
          )}
        </div>
        <span style={{ fontSize:9, color:'#30363d' }}>{sourceLabel}</span>
      </div>

      {/* Category tabs + search */}
      <div style={{ display:'flex', alignItems:'center', borderBottom:'1px solid #161b22' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding:'5px 14px', fontSize:10, cursor:'pointer', border:'none', background:'transparent',
              color:cat === c ? '#c9d1d9' : '#484f58', fontWeight:cat === c ? 500 : 400,
              borderBottom:cat === c ? '2px solid #388bfd' : '2px solid transparent', transition:'color 0.1s' }}>
            {c}
          </button>
        ))}
        <div style={{ marginLeft:'auto', paddingRight:8, display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:10, color:'#30363d' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter events"
            style={{ background:'transparent', border:'none', borderBottom:`1px solid ${search ? '#388bfd' : '#21262d'}`, color:'#c9d1d9', fontSize:10, padding:'4px 2px', width: search ? 130 : 90, outline:'none', fontFamily:mono, transition:'width 0.2s, border-color 0.2s' }}
            onFocus={e => { e.currentTarget.style.width = '130px'; e.currentTarget.style.borderBottomColor = '#388bfd' }}
            onBlur={e => { if (!search) { e.currentTarget.style.width = '90px'; e.currentTarget.style.borderBottomColor = '#21262d' } }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'#0e1117', border:'1px solid #21262d' }}>
        <table style={{ width:'100%', fontSize:10, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #21262d' }}>
              <th onClick={() => toggleSort('name')} style={{ padding:'7px 12px', textAlign:'left', fontSize:9, color:'#484f58', fontWeight:500, cursor:'pointer' }}>Event <SortIcon active={sortKey==='name'} dir={sortDir} /></th>
              <th onClick={() => toggleSort('impact')} style={{ padding:'7px 8px', textAlign:'center', fontSize:9, color:'#484f58', fontWeight:500, width:60, cursor:'pointer' }}>Impact <SortIcon active={sortKey==='impact'} dir={sortDir} /></th>
              <th onClick={() => toggleSort('probability')} style={{ padding:'7px 8px', textAlign:'right', fontSize:9, color:'#484f58', fontWeight:500, width:55, cursor:'pointer' }}>Prob <SortIcon active={sortKey==='probability'} dir={sortDir} /></th>
              <th onClick={() => toggleSort('volume')} style={{ padding:'7px 8px', textAlign:'right', fontSize:9, color:'#484f58', fontWeight:500, width:80, cursor:'pointer' }} title="24-hour trading volume on Polymarket">Vol 24h <SortIcon active={sortKey==='volume'} dir={sortDir} /></th>
              <th onClick={() => toggleSort('delta7d')} style={{ padding:'7px 8px', textAlign:'right', fontSize:9, color:'#484f58', fontWeight:500, width:50, cursor:'pointer' }}>7d <SortIcon active={sortKey==='delta7d'} dir={sortDir} /></th>
              <th style={{ padding:'7px 8px', textAlign:'right', fontSize:9, color:'#484f58', fontWeight:500, width:50 }}>30d</th>
              <th style={{ padding:'7px 8px', textAlign:'center', fontSize:9, color:'#484f58', fontWeight:500, width:90 }}>Outlook</th>
              <th style={{ padding:'7px 8px', textAlign:'left', fontSize:9, color:'#484f58', fontWeight:500, width:80 }}>Method</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(ev => {
              return (
                <tr key={ev.id} onClick={() => openDetail(ev)} style={rowBase}
                  onMouseEnter={e => (e.currentTarget.style.background = '#131720')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding:'8px 12px' }}>
                    <span style={{ color:'#c9d1d9', fontWeight:500, fontSize:11 }}>{ev.name}</span>
                    <span style={{ fontSize:8, color:'#30363d', marginLeft:6 }}>{ev.category}</span>
                  </td>
                  <td style={{ padding:'8px 8px', textAlign:'center' }}><ImpactLabel impact={ev.impact} /></td>
                  <td style={{ padding:'8px 8px', textAlign:'right', fontFamily:mono, color:'#c9d1d9', fontWeight:600, fontSize:11 }}>{ev.probability}%</td>
                  <td style={{ padding:'8px 8px', textAlign:'right', fontFamily:mono, fontSize:10 }}>
                    {(ev as any)._volume > 0 ? (
                      <span style={{ color: (ev as any)._volume >= 1_000_000 ? '#3fb950' : (ev as any)._volume >= 100_000 ? '#c9d1d9' : '#8b949e' }}>
                        {(ev as any)._volume >= 1_000_000
                          ? `$${((ev as any)._volume / 1_000_000).toFixed(1)}M`
                          : (ev as any)._volume >= 1000
                          ? `$${((ev as any)._volume / 1000).toFixed(0)}K`
                          : `$${(ev as any)._volume.toFixed(0)}`}
                      </span>
                    ) : <span style={{ color:'#30363d' }}>—</span>}
                  </td>
                  <td style={{ padding:'8px 8px', textAlign:'right' }}><DeltaChip val={ev.delta7d} /></td>
                  <td style={{ padding:'8px 8px', textAlign:'right' }}><DeltaChip val={ev.delta30d} /></td>
                  <td style={{ padding:'8px 8px', textAlign:'center' }}><InterpretationLabel history={ev.history} /></td>
                  <td style={{ padding:'8px 8px', fontSize:8, color: ev.transparency.source === 'Polymarket' ? '#3fb950' : '#30363d' }}>{ev.transparency.source === 'Polymarket' ? 'Polymarket' : ev.transparency.method === 'Market-derived' ? 'Market' : ev.transparency.method === 'Model-based' ? 'Model' : 'Estimate'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ fontSize:8, color:'#21262d', display:'flex', justifyContent:'space-between', padding:'0 2px' }}>
        <span>{polySource === 'live' ? 'Probabilities from Polymarket prediction markets · Real money-weighted odds' : 'Probabilities are sample estimates with varying sources · Not live market pricing'}</span>
        <span>{polySource === 'live' ? 'Source: gamma-api.polymarket.com · Refreshed every 15 min' : 'Curated editorial estimates · Connect backend for Polymarket live data'}</span>
      </div>
    </div>
  )
}
