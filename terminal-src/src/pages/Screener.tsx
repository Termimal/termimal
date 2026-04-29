// pages/Screener.tsx — IBKR-style screener with collapsible filter panel.
// Click "Filters" to expand, set min/max values directly in each field.
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { Logo } from '@/components/common/Logo'

// ─── Sector styling ──────────────────────────────────────────────
const SECTOR_STYLE: Record<string, { bg: string; border: string; fg: string }> = {
  Technology:  { bg: 'rgba(56,139,253,0.10)',  border: 'rgba(56,139,253,0.35)',  fg: '#58a6ff' },
  Finance:     { bg: 'rgba(63,185,80,0.10)',   border: 'rgba(63,185,80,0.35)',   fg: '#56d364' },
  Healthcare:  { bg: 'rgba(165,121,255,0.10)', border: 'rgba(165,121,255,0.35)', fg: '#bc8cff' },
  Energy:      { bg: 'rgba(210,153,34,0.10)',  border: 'rgba(210,153,34,0.35)',  fg: '#e3b341' },
  Consumer:    { bg: 'rgba(236,118,255,0.10)', border: 'rgba(236,118,255,0.35)', fg: '#e89bff' },
  Industrials: { bg: 'rgba(255,166,87,0.10)',  border: 'rgba(255,166,87,0.35)',  fg: '#ffb878' },
  Auto:        { bg: 'rgba(248,81,73,0.10)',   border: 'rgba(248,81,73,0.35)',   fg: '#ff7b72' },
}
const sectorStyle = (s: string) => SECTOR_STYLE[s] || { bg: 'rgba(139,148,158,0.10)', border: 'rgba(139,148,158,0.30)', fg: '#8b949e' }

// ─── Universe ────────────────────────────────────────────────────
interface Row {
  sym: string; name: string; sector: string; country: string
  price: number; volume: number           // live-like (M shares)
  mcap: number                            // $B
  pe: number | null; fwdPe: number | null
  pb: number | null; evEbitda: number | null
  revGrowth: number | null                // %
  epsGrowth: number | null                // %
  roe: number | null; roic: number | null
  netMgn: number | null
  de: number | null                       // debt / equity
  divYield: number | null                 // %
  risk: number
  sig: 'BUY' | 'WATCH' | 'RISK'
}

const UNIVERSE: Row[] = [
  { sym:'AAPL',  name:'Apple Inc.',          sector:'Technology',  country:'US', price:182.50, volume:48,  mcap:3100, pe:29,  fwdPe:27,  pb:44,   evEbitda:22,   revGrowth:2.8,  epsGrowth:8.2,  roe:160, roic:45, netMgn:25, de:1.70, divYield:0.5, risk:28, sig:'BUY'   },
  { sym:'MSFT',  name:'Microsoft Corp.',     sector:'Technology',  country:'US', price:420.30, volume:22,  mcap:3200, pe:35,  fwdPe:32,  pb:12,   evEbitda:24,   revGrowth:12.5, epsGrowth:15.1, roe:38,  roic:38, netMgn:35, de:0.70, divYield:0.7, risk:25, sig:'BUY'   },
  { sym:'NVDA',  name:'NVIDIA Corp.',        sector:'Technology',  country:'US', price:880.20, volume:45,  mcap:2100, pe:65,  fwdPe:38,  pb:55,   evEbitda:45,   revGrowth:126,  epsGrowth:200,  roe:120, roic:55, netMgn:48, de:0.40, divYield:0.03,risk:42, sig:'WATCH' },
  { sym:'GOOGL', name:'Alphabet Inc.',       sector:'Technology',  country:'US', price:175.80, volume:28,  mcap:1900, pe:22,  fwdPe:20,  pb:6.5,  evEbitda:18,   revGrowth:13.6, epsGrowth:18.2, roe:28,  roic:22, netMgn:23, de:0.10, divYield:0.4, risk:30, sig:'BUY'   },
  { sym:'META',  name:'Meta Platforms',      sector:'Technology',  country:'US', price:500.40, volume:18,  mcap:1350, pe:25,  fwdPe:22,  pb:8.2,  evEbitda:16,   revGrowth:16.4, epsGrowth:80.1, roe:32,  roic:28, netMgn:29, de:0.20, divYield:0.4, risk:33, sig:'BUY'   },
  { sym:'AMZN',  name:'Amazon.com',          sector:'Technology',  country:'US', price:185.00, volume:55,  mcap:1950, pe:60,  fwdPe:42,  pb:8.8,  evEbitda:20,   revGrowth:11.0, epsGrowth:40.8, roe:22,  roic:18, netMgn:6,  de:0.60, divYield:0.0, risk:38, sig:'WATCH' },
  { sym:'TSLA',  name:'Tesla Inc.',          sector:'Auto',        country:'US', price:178.20, volume:85,  mcap:560,  pe:170, fwdPe:72,  pb:10.2, evEbitda:52,   revGrowth:-8.7, epsGrowth:-55.0,roe:14,  roic:12, netMgn:4,  de:0.10, divYield:0.0, risk:68, sig:'RISK'  },
  { sym:'AMD',   name:'Advanced Micro Dev.', sector:'Technology',  country:'US', price:155.80, volume:62,  mcap:250,  pe:120, fwdPe:40,  pb:4.1,  evEbitda:38,   revGrowth:10.2, epsGrowth:120,  roe:4,   roic:8,  netMgn:4,  de:0.20, divYield:0.0, risk:55, sig:'WATCH' },
  { sym:'JPM',   name:'JPMorgan Chase',      sector:'Finance',     country:'US', price:198.60, volume:10,  mcap:580,  pe:12,  fwdPe:11,  pb:1.8,  evEbitda:null, revGrowth:12.0, epsGrowth:16.0, roe:17,  roic:15, netMgn:26, de:8.20, divYield:2.2, risk:35, sig:'BUY'   },
  { sym:'BAC',   name:'Bank of America',     sector:'Finance',     country:'US', price:38.20,  volume:42,  mcap:310,  pe:13,  fwdPe:10,  pb:1.1,  evEbitda:null, revGrowth:3.5,  epsGrowth:-8.0, roe:10,  roic:10, netMgn:20, de:9.50, divYield:2.5, risk:40, sig:'WATCH' },
  { sym:'GS',    name:'Goldman Sachs',       sector:'Finance',     country:'US', price:430.10, volume:2,   mcap:155,  pe:14,  fwdPe:11,  pb:1.4,  evEbitda:null, revGrowth:16.1, epsGrowth:24.2, roe:12,  roic:12, netMgn:22, de:11.2, divYield:2.7, risk:42, sig:'WATCH' },
  { sym:'XOM',   name:'ExxonMobil',          sector:'Energy',      country:'US', price:118.40, volume:18,  mcap:450,  pe:14,  fwdPe:12,  pb:2.0,  evEbitda:8,    revGrowth:1.4,  epsGrowth:-32.0,roe:18,  roic:16, netMgn:10, de:0.20, divYield:3.2, risk:45, sig:'WATCH' },
  { sym:'CVX',   name:'Chevron Corp.',       sector:'Energy',      country:'US', price:160.00, volume:8,   mcap:270,  pe:14,  fwdPe:12,  pb:1.7,  evEbitda:7,    revGrowth:-3.5, epsGrowth:-28.0,roe:14,  roic:14, netMgn:11, de:0.15, divYield:4.0, risk:44, sig:'WATCH' },
  { sym:'JNJ',   name:'Johnson & Johnson',   sector:'Healthcare',  country:'US', price:150.30, volume:6,   mcap:380,  pe:16,  fwdPe:14,  pb:5.5,  evEbitda:14,   revGrowth:6.5,  epsGrowth:9.5,  roe:22,  roic:22, netMgn:18, de:0.50, divYield:3.1, risk:22, sig:'BUY'   },
  { sym:'UNH',   name:'UnitedHealth Group',  sector:'Healthcare',  country:'US', price:480.00, volume:3,   mcap:460,  pe:18,  fwdPe:15,  pb:5.0,  evEbitda:13,   revGrowth:9.0,  epsGrowth:13.5, roe:25,  roic:25, netMgn:6,  de:0.80, divYield:1.5, risk:28, sig:'BUY'   },
  { sym:'WMT',   name:'Walmart Inc.',        sector:'Consumer',    country:'US', price:68.40,  volume:15,  mcap:620,  pe:30,  fwdPe:27,  pb:8.2,  evEbitda:19,   revGrowth:4.8,  epsGrowth:15.0, roe:18,  roic:18, netMgn:2,  de:0.65, divYield:1.3, risk:20, sig:'BUY'   },
  { sym:'PG',    name:'Procter & Gamble',    sector:'Consumer',    country:'US', price:168.00, volume:4,   mcap:380,  pe:26,  fwdPe:24,  pb:8.5,  evEbitda:18,   revGrowth:2.3,  epsGrowth:6.2,  roe:20,  roic:20, netMgn:17, de:0.55, divYield:2.3, risk:18, sig:'BUY'   },
  { sym:'CAT',   name:'Caterpillar Inc.',    sector:'Industrials', country:'US', price:345.00, volume:3,   mcap:160,  pe:16,  fwdPe:14,  pb:9.2,  evEbitda:12,   revGrowth:3.2,  epsGrowth:12.0, roe:50,  roic:32, netMgn:13, de:2.05, divYield:1.6, risk:38, sig:'WATCH' },
  { sym:'PLTR',  name:'Palantir Tech.',      sector:'Technology',  country:'US', price:25.80,  volume:45,  mcap:90,   pe:200, fwdPe:110, pb:22,   evEbitda:80,   revGrowth:20.1, epsGrowth:320,  roe:7,   roic:5,  netMgn:8,  de:0.00, divYield:0.0, risk:62, sig:'RISK'  },
  { sym:'PFE',   name:'Pfizer Inc.',         sector:'Healthcare',  country:'US', price:27.50,  volume:32,  mcap:160,  pe:null,fwdPe:11,  pb:1.7,  evEbitda:9,    revGrowth:-42.0,epsGrowth:-70.0,roe:6,   roic:6,  netMgn:2,  de:0.80, divYield:6.1, risk:48, sig:'WATCH' },
  { sym:'ASML',  name:'ASML Holding',        sector:'Technology',  country:'NL', price:890.00, volume:2,   mcap:360,  pe:38,  fwdPe:32,  pb:20,   evEbitda:28,   revGrowth:-1.0, epsGrowth:-2.3, roe:55,  roic:35, netMgn:27, de:0.20, divYield:0.7, risk:35, sig:'BUY'   },
  { sym:'TSM',   name:'Taiwan Semi',         sector:'Technology',  country:'TW', price:150.00, volume:12,  mcap:780,  pe:25,  fwdPe:20,  pb:6.5,  evEbitda:20,   revGrowth:34.0, epsGrowth:45.0, roe:28,  roic:25, netMgn:38, de:0.30, divYield:1.3, risk:38, sig:'BUY'   },
  { sym:'TM',    name:'Toyota Motor',        sector:'Auto',        country:'JP', price:195.00, volume:1.5, mcap:260,  pe:9,   fwdPe:10,  pb:1.1,  evEbitda:9,    revGrowth:18.1, epsGrowth:80.0, roe:14,  roic:10, netMgn:11, de:1.10, divYield:1.8, risk:26, sig:'BUY'   },
  { sym:'NVO',   name:'Novo Nordisk',        sector:'Healthcare',  country:'DK', price:130.00, volume:5,   mcap:580,  pe:44,  fwdPe:36,  pb:29,   evEbitda:35,   revGrowth:31.0, epsGrowth:36.0, roe:85,  roic:60, netMgn:34, de:0.10, divYield:0.8, risk:32, sig:'BUY'   },
  { sym:'SHEL',  name:'Shell plc',           sector:'Energy',      country:'GB', price:70.00,  volume:8,   mcap:225,  pe:13,  fwdPe:10,  pb:1.4,  evEbitda:6,    revGrowth:-15.0,epsGrowth:-30.0,roe:10,  roic:12, netMgn:7,  de:0.40, divYield:3.9, risk:44, sig:'WATCH' },
  // ─── Extended universe — covers full watchlist. Fundamentals N/A for these, but
  // they're included so users can filter/sort by sector/country/price/mcap and see
  // the full universe in the screener instead of just 25 curated rows.
  { sym:'BAC',   name:'Bank of America',     sector:'Finance',     country:'US', price:38.0,  volume:42, mcap:310,  pe:13,  fwdPe:10, pb:1.1,  evEbitda:null, revGrowth:3.5,   epsGrowth:-8.0,  roe:10,  roic:10, netMgn:20, de:9.5,  divYield:2.5, risk:40, sig:'WATCH' },
  { sym:'WFC',   name:'Wells Fargo',         sector:'Finance',     country:'US', price:60.5,  volume:15, mcap:215,  pe:12,  fwdPe:11, pb:1.4,  evEbitda:null, revGrowth:5.0,   epsGrowth:8.0,   roe:11,  roic:11, netMgn:22, de:8.5,  divYield:2.4, risk:38, sig:'WATCH' },
  { sym:'C',     name:'Citigroup',           sector:'Finance',     country:'US', price:65.0,  volume:18, mcap:125,  pe:14,  fwdPe:9,  pb:0.65, evEbitda:null, revGrowth:0.0,   epsGrowth:-15.0, roe:5,   roic:6,  netMgn:14, de:10.0, divYield:3.4, risk:48, sig:'WATCH' },
  { sym:'MS',    name:'Morgan Stanley',      sector:'Finance',     country:'US', price:120.0, volume:8,  mcap:200,  pe:18,  fwdPe:14, pb:2.0,  evEbitda:null, revGrowth:5.0,   epsGrowth:8.0,   roe:13,  roic:12, netMgn:18, de:9.0,  divYield:3.0, risk:38, sig:'WATCH' },
  { sym:'V',     name:'Visa',                sector:'Finance',     country:'US', price:285.0, volume:6,  mcap:580,  pe:32,  fwdPe:28, pb:14,   evEbitda:24,   revGrowth:10.5,  epsGrowth:14.0,  roe:48,  roic:30, netMgn:54, de:0.4,  divYield:0.8, risk:24, sig:'BUY'   },
  { sym:'MA',    name:'Mastercard',          sector:'Finance',     country:'US', price:480.0, volume:3,  mcap:450,  pe:38,  fwdPe:32, pb:60,   evEbitda:30,   revGrowth:13.0,  epsGrowth:18.0,  roe:155, roic:50, netMgn:46, de:2.5,  divYield:0.6, risk:26, sig:'BUY'   },
  { sym:'BLK',   name:'BlackRock',           sector:'Finance',     country:'US', price:880.0, volume:0.5,mcap:130,  pe:23,  fwdPe:20, pb:3.2,  evEbitda:18,   revGrowth:9.0,   epsGrowth:13.0,  roe:14,  roic:13, netMgn:31, de:0.6,  divYield:2.3, risk:30, sig:'BUY'   },
  { sym:'SCHW',  name:'Charles Schwab',      sector:'Finance',     country:'US', price:80.0,  volume:8,  mcap:145,  pe:22,  fwdPe:18, pb:3.5,  evEbitda:null, revGrowth:5.0,   epsGrowth:18.0,  roe:14,  roic:12, netMgn:30, de:7.0,  divYield:1.4, risk:32, sig:'WATCH' },
  { sym:'BX',    name:'Blackstone',          sector:'Finance',     country:'US', price:140.0, volume:4,  mcap:170,  pe:48,  fwdPe:32, pb:14,   evEbitda:38,   revGrowth:20.0,  epsGrowth:30.0,  roe:30,  roic:22, netMgn:25, de:1.5,  divYield:3.5, risk:38, sig:'WATCH' },
  { sym:'SPGI',  name:'S&P Global',          sector:'Finance',     country:'US', price:520.0, volume:1.5,mcap:160,  pe:45,  fwdPe:32, pb:9.0,  evEbitda:32,   revGrowth:14.0,  epsGrowth:22.0,  roe:20,  roic:20, netMgn:31, de:0.8,  divYield:0.7, risk:26, sig:'BUY'   },
  { sym:'PGR',   name:'Progressive',         sector:'Finance',     country:'US', price:240.0, volume:2.5,mcap:140,  pe:18,  fwdPe:16, pb:5.0,  evEbitda:14,   revGrowth:23.0,  epsGrowth:80.0,  roe:30,  roic:25, netMgn:11, de:0.4,  divYield:0.2, risk:24, sig:'BUY'   },
  { sym:'CB',    name:'Chubb',               sector:'Finance',     country:'US', price:280.0, volume:1.2,mcap:113,  pe:12,  fwdPe:11, pb:1.7,  evEbitda:9,    revGrowth:11.0,  epsGrowth:14.0,  roe:15,  roic:14, netMgn:16, de:0.3,  divYield:1.4, risk:22, sig:'BUY'   },
  { sym:'MMC',   name:'Marsh McLennan',      sector:'Finance',     country:'US', price:230.0, volume:1.5,mcap:115,  pe:28,  fwdPe:25, pb:8.5,  evEbitda:20,   revGrowth:9.0,   epsGrowth:14.0,  roe:32,  roic:25, netMgn:18, de:1.0,  divYield:1.4, risk:24, sig:'BUY'   },
  { sym:'INTC',  name:'Intel',               sector:'Technology',  country:'US', price:25.0,  volume:55, mcap:108,  pe:null,fwdPe:30, pb:1.2,  evEbitda:18,   revGrowth:-2.0,  epsGrowth:-95.0, roe:-2,  roic:0,  netMgn:-2, de:0.5,  divYield:0.0, risk:65, sig:'RISK'  },
  { sym:'AVGO',  name:'Broadcom',            sector:'Technology',  country:'US', price:1700, volume:2.5, mcap:790,  pe:38,  fwdPe:32, pb:11,   evEbitda:30,   revGrowth:44.0,  epsGrowth:30.0,  roe:18,  roic:18, netMgn:18, de:1.5,  divYield:1.3, risk:35, sig:'BUY'   },
  { sym:'QCOM',  name:'Qualcomm',            sector:'Technology',  country:'US', price:175.0, volume:8,  mcap:195,  pe:18,  fwdPe:15, pb:7.0,  evEbitda:14,   revGrowth:9.0,   epsGrowth:25.0,  roe:42,  roic:28, netMgn:25, de:0.6,  divYield:1.9, risk:34, sig:'BUY'   },
  { sym:'MU',    name:'Micron',              sector:'Technology',  country:'US', price:115.0, volume:25, mcap:130,  pe:32,  fwdPe:11, pb:2.5,  evEbitda:11,   revGrowth:62.0,  epsGrowth:300,   roe:8,   roic:6,  netMgn:14, de:0.4,  divYield:0.4, risk:48, sig:'WATCH' },
  { sym:'TXN',   name:'Texas Instruments',   sector:'Technology',  country:'US', price:200.0, volume:6,  mcap:185,  pe:38,  fwdPe:32, pb:13,   evEbitda:24,   revGrowth:-10.0, epsGrowth:-22.0, roe:38,  roic:30, netMgn:33, de:0.7,  divYield:2.7, risk:30, sig:'BUY'   },
  { sym:'ADI',   name:'Analog Devices',      sector:'Technology',  country:'US', price:230.0, volume:3,  mcap:115,  pe:60,  fwdPe:30, pb:3.0,  evEbitda:26,   revGrowth:-25.0, epsGrowth:-40.0, roe:5,   roic:6,  netMgn:18, de:0.3,  divYield:1.7, risk:35, sig:'WATCH' },
  { sym:'KLAC',  name:'KLA Corp.',           sector:'Technology',  country:'US', price:780.0, volume:1.2,mcap:105,  pe:34,  fwdPe:26, pb:30,   evEbitda:25,   revGrowth:13.0,  epsGrowth:24.0,  roe:90,  roic:55, netMgn:32, de:1.5,  divYield:0.7, risk:32, sig:'BUY'   },
  { sym:'CDNS',  name:'Cadence Design',      sector:'Technology',  country:'US', price:280.0, volume:1.5,mcap:75,   pe:60,  fwdPe:48, pb:14,   evEbitda:48,   revGrowth:13.0,  epsGrowth:18.0,  roe:25,  roic:22, netMgn:22, de:0.3,  divYield:0.0, risk:30, sig:'BUY'   },
  { sym:'SNPS',  name:'Synopsys',            sector:'Technology',  country:'US', price:580.0, volume:1.2,mcap:88,   pe:50,  fwdPe:42, pb:11,   evEbitda:42,   revGrowth:14.0,  epsGrowth:22.0,  roe:24,  roic:22, netMgn:23, de:0.0,  divYield:0.0, risk:30, sig:'BUY'   },
  { sym:'CRM',   name:'Salesforce',          sector:'Technology',  country:'US', price:280.0, volume:6,  mcap:270,  pe:55,  fwdPe:32, pb:5.0,  evEbitda:25,   revGrowth:11.0,  epsGrowth:35.0,  roe:9,   roic:8,  netMgn:13, de:0.3,  divYield:0.6, risk:30, sig:'BUY'   },
  { sym:'ORCL',  name:'Oracle',              sector:'Technology',  country:'US', price:140.0, volume:8,  mcap:380,  pe:32,  fwdPe:24, pb:65,   evEbitda:21,   revGrowth:8.0,   epsGrowth:14.0,  roe:230, roic:25, netMgn:20, de:9.0,  divYield:1.1, risk:32, sig:'BUY'   },
  { sym:'ADBE',  name:'Adobe',               sector:'Technology',  country:'US', price:540.0, volume:3,  mcap:240,  pe:42,  fwdPe:28, pb:13,   evEbitda:30,   revGrowth:11.0,  epsGrowth:14.0,  roe:30,  roic:25, netMgn:28, de:0.4,  divYield:0.0, risk:32, sig:'BUY'   },
  { sym:'NOW',   name:'ServiceNow',          sector:'Technology',  country:'US', price:790.0, volume:2,  mcap:165,  pe:80,  fwdPe:60, pb:18,   evEbitda:60,   revGrowth:24.0,  epsGrowth:30.0,  roe:18,  roic:18, netMgn:13, de:0.4,  divYield:0.0, risk:36, sig:'BUY'   },
  { sym:'IBM',   name:'IBM',                 sector:'Technology',  country:'US', price:175.0, volume:5,  mcap:160,  pe:21,  fwdPe:18, pb:8.0,  evEbitda:14,   revGrowth:1.0,   epsGrowth:9.0,   roe:38,  roic:14, netMgn:9,  de:2.5,  divYield:3.8, risk:30, sig:'BUY'   },
  { sym:'CSCO',  name:'Cisco',               sector:'Technology',  country:'US', price:50.0,  volume:18, mcap:200,  pe:18,  fwdPe:14, pb:5.0,  evEbitda:13,   revGrowth:-6.0,  epsGrowth:-10.0, roe:28,  roic:22, netMgn:22, de:0.7,  divYield:3.2, risk:28, sig:'WATCH' },
  { sym:'PANW',  name:'Palo Alto Networks',  sector:'Technology',  country:'US', price:340.0, volume:3,  mcap:115,  pe:48,  fwdPe:55, pb:18,   evEbitda:55,   revGrowth:16.0,  epsGrowth:40.0,  roe:42,  roic:25, netMgn:13, de:0.0,  divYield:0.0, risk:38, sig:'BUY'   },
  { sym:'CRWD',  name:'CrowdStrike',         sector:'Technology',  country:'US', price:380.0, volume:3,  mcap:90,   pe:null,fwdPe:80, pb:25,   evEbitda:80,   revGrowth:33.0,  epsGrowth:50.0,  roe:6,   roic:5,  netMgn:8,  de:0.5,  divYield:0.0, risk:48, sig:'WATCH' },
  { sym:'NET',   name:'Cloudflare',          sector:'Technology',  country:'US', price:90.0,  volume:5,  mcap:30,   pe:null,fwdPe:160,pb:35,   evEbitda:120,  revGrowth:31.0,  epsGrowth:0.0,   roe:-2,  roic:0,  netMgn:-2, de:0.5,  divYield:0.0, risk:55, sig:'WATCH' },
  { sym:'DDOG',  name:'Datadog',             sector:'Technology',  country:'US', price:120.0, volume:4,  mcap:42,   pe:80,  fwdPe:60, pb:15,   evEbitda:55,   revGrowth:27.0,  epsGrowth:35.0,  roe:18,  roic:14, netMgn:13, de:0.4,  divYield:0.0, risk:42, sig:'WATCH' },
  { sym:'SNOW',  name:'Snowflake',           sector:'Technology',  country:'US', price:170.0, volume:5,  mcap:55,   pe:null,fwdPe:140,pb:9,    evEbitda:null, revGrowth:32.0,  epsGrowth:0.0,   roe:-12, roic:-8, netMgn:-30,de:0.0,  divYield:0.0, risk:62, sig:'RISK'  },
  { sym:'PYPL',  name:'PayPal',              sector:'Finance',     country:'US', price:75.0,  volume:14, mcap:78,   pe:18,  fwdPe:14, pb:4.0,  evEbitda:13,   revGrowth:8.0,   epsGrowth:14.0,  roe:22,  roic:14, netMgn:14, de:0.5,  divYield:0.0, risk:38, sig:'WATCH' },
  { sym:'SQ',    name:'Block',               sector:'Finance',     country:'US', price:75.0,  volume:8,  mcap:46,   pe:null,fwdPe:30, pb:2.5,  evEbitda:30,   revGrowth:25.0,  epsGrowth:0.0,   roe:0,   roic:0,  netMgn:1,  de:0.4,  divYield:0.0, risk:55, sig:'WATCH' },
  { sym:'COIN',  name:'Coinbase',            sector:'Finance',     country:'US', price:240.0, volume:8,  mcap:60,   pe:35,  fwdPe:28, pb:5.5,  evEbitda:18,   revGrowth:120,   epsGrowth:0.0,   roe:18,  roic:14, netMgn:30, de:0.0,  divYield:0.0, risk:58, sig:'WATCH' },
  { sym:'HOOD',  name:'Robinhood',           sector:'Finance',     country:'US', price:35.0,  volume:25, mcap:30,   pe:65,  fwdPe:32, pb:3.5,  evEbitda:22,   revGrowth:38.0,  epsGrowth:200,   roe:10,  roic:7,  netMgn:32, de:0.0,  divYield:0.0, risk:55, sig:'WATCH' },
  { sym:'MSTR',  name:'MicroStrategy',       sector:'Technology',  country:'US', price:1700,  volume:1.5,mcap:32,   pe:null,fwdPe:null,pb:5.5,evEbitda:null, revGrowth:-5.0,  epsGrowth:0.0,   roe:0,   roic:0,  netMgn:-30,de:1.0,  divYield:0.0, risk:75, sig:'RISK'  },
  { sym:'COST',  name:'Costco',              sector:'Consumer',    country:'US', price:925.0, volume:1.8,mcap:410,  pe:55,  fwdPe:48, pb:18,   evEbitda:36,   revGrowth:8.5,   epsGrowth:14.0,  roe:32,  roic:25, netMgn:3,  de:0.4,  divYield:0.5, risk:22, sig:'BUY'   },
  { sym:'HD',    name:'Home Depot',          sector:'Consumer',    country:'US', price:380.0, volume:3.5,mcap:380,  pe:25,  fwdPe:22, pb:null, evEbitda:18,   revGrowth:1.0,   epsGrowth:5.0,   roe:1100,roic:38, netMgn:10, de:30,   divYield:2.4, risk:28, sig:'BUY'   },
  { sym:'LOW',   name:'Lowe\'s',             sector:'Consumer',    country:'US', price:240.0, volume:3,  mcap:140,  pe:21,  fwdPe:18, pb:null, evEbitda:14,   revGrowth:-9.0,  epsGrowth:-5.0,  roe:0,   roic:25, netMgn:8,  de:0.0,  divYield:1.9, risk:30, sig:'BUY'   },
  { sym:'TGT',   name:'Target',              sector:'Consumer',    country:'US', price:155.0, volume:5,  mcap:72,   pe:18,  fwdPe:15, pb:5.0,  evEbitda:9,    revGrowth:0.0,   epsGrowth:5.0,   roe:30,  roic:14, netMgn:4,  de:1.4,  divYield:2.9, risk:32, sig:'WATCH' },
  { sym:'MCD',   name:'McDonald\'s',         sector:'Consumer',    country:'US', price:280.0, volume:3,  mcap:200,  pe:25,  fwdPe:23, pb:null, evEbitda:18,   revGrowth:3.0,   epsGrowth:8.0,   roe:0,   roic:25, netMgn:33, de:0.0,  divYield:2.4, risk:22, sig:'BUY'   },
  { sym:'SBUX',  name:'Starbucks',           sector:'Consumer',    country:'US', price:80.0,  volume:8,  mcap:90,   pe:24,  fwdPe:21, pb:null, evEbitda:14,   revGrowth:0.0,   epsGrowth:8.0,   roe:0,   roic:18, netMgn:11, de:0.0,  divYield:3.0, risk:28, sig:'BUY'   },
  { sym:'NKE',   name:'Nike',                sector:'Consumer',    country:'US', price:78.0,  volume:9,  mcap:115,  pe:22,  fwdPe:20, pb:7.0,  evEbitda:14,   revGrowth:1.0,   epsGrowth:14.0,  roe:35,  roic:20, netMgn:11, de:0.6,  divYield:1.9, risk:32, sig:'WATCH' },
  { sym:'KO',    name:'Coca-Cola',           sector:'Consumer',    country:'US', price:65.0,  volume:14, mcap:280,  pe:25,  fwdPe:23, pb:11,   evEbitda:20,   revGrowth:6.0,   epsGrowth:8.0,   roe:42,  roic:14, netMgn:23, de:1.5,  divYield:3.0, risk:18, sig:'BUY'   },
  { sym:'PEP',   name:'PepsiCo',             sector:'Consumer',    country:'US', price:170.0, volume:5,  mcap:230,  pe:28,  fwdPe:21, pb:12,   evEbitda:16,   revGrowth:0.0,   epsGrowth:8.0,   roe:50,  roic:18, netMgn:11, de:2.0,  divYield:3.2, risk:20, sig:'BUY'   },
  { sym:'DIS',   name:'Disney',              sector:'Consumer',    country:'US', price:110.0, volume:10, mcap:200,  pe:38,  fwdPe:18, pb:1.8,  evEbitda:16,   revGrowth:1.0,   epsGrowth:-15.0, roe:5,   roic:6,  netMgn:5,  de:0.5,  divYield:0.9, risk:38, sig:'WATCH' },
  { sym:'CMCSA', name:'Comcast',             sector:'Consumer',    country:'US', price:38.0,  volume:18, mcap:150,  pe:9,   fwdPe:9,  pb:1.7,  evEbitda:6,    revGrowth:-1.0,  epsGrowth:-3.0,  roe:18,  roic:9,  netMgn:13, de:1.5,  divYield:3.3, risk:32, sig:'WATCH' },
  { sym:'VZ',    name:'Verizon',             sector:'Telecom',     country:'US', price:42.0,  volume:18, mcap:175,  pe:11,  fwdPe:9,  pb:1.7,  evEbitda:7,    revGrowth:0.0,   epsGrowth:0.0,   roe:18,  roic:8,  netMgn:11, de:1.7,  divYield:6.5, risk:30, sig:'WATCH' },
  { sym:'PM',    name:'Philip Morris',       sector:'Consumer',    country:'US', price:130.0, volume:6,  mcap:200,  pe:22,  fwdPe:18, pb:null, evEbitda:14,   revGrowth:11.0,  epsGrowth:14.0,  roe:0,   roic:30, netMgn:24, de:0.0,  divYield:4.2, risk:24, sig:'BUY'   },
  { sym:'MO',    name:'Altria',              sector:'Consumer',    country:'US', price:55.0,  volume:9,  mcap:95,   pe:9,   fwdPe:9,  pb:null, evEbitda:8,    revGrowth:-1.0,  epsGrowth:-3.0,  roe:0,   roic:55, netMgn:35, de:0.0,  divYield:7.5, risk:30, sig:'BUY'   },
  { sym:'MDLZ',  name:'Mondelez',            sector:'Consumer',    country:'US', price:65.0,  volume:7,  mcap:90,   pe:24,  fwdPe:20, pb:3.5,  evEbitda:18,   revGrowth:1.0,   epsGrowth:5.0,   roe:18,  roic:11, netMgn:13, de:0.7,  divYield:3.0, risk:24, sig:'BUY'   },
  { sym:'TJX',   name:'TJX Companies',       sector:'Consumer',    country:'US', price:130.0, volume:5,  mcap:145,  pe:30,  fwdPe:26, pb:18,   evEbitda:21,   revGrowth:7.0,   epsGrowth:14.0,  roe:65,  roic:30, netMgn:9,  de:0.6,  divYield:1.4, risk:24, sig:'BUY'   },
  { sym:'BKNG',  name:'Booking Holdings',    sector:'Consumer',    country:'US', price:5200, volume:0.3, mcap:170,  pe:34,  fwdPe:24, pb:null, evEbitda:22,   revGrowth:11.0,  epsGrowth:33.0,  roe:0,   roic:60, netMgn:24, de:0.0,  divYield:0.7, risk:30, sig:'BUY'   },
  { sym:'ABNB',  name:'Airbnb',              sector:'Consumer',    country:'US', price:130.0, volume:6,  mcap:85,   pe:18,  fwdPe:30, pb:14,   evEbitda:22,   revGrowth:18.0,  epsGrowth:0.0,   roe:60,  roic:25, netMgn:48, de:0.0,  divYield:0.0, risk:38, sig:'WATCH' },
  { sym:'UBER',  name:'Uber',                sector:'Consumer',    country:'US', price:80.0,  volume:18, mcap:170,  pe:32,  fwdPe:28, pb:18,   evEbitda:28,   revGrowth:15.0,  epsGrowth:90.0,  roe:65,  roic:18, netMgn:13, de:1.2,  divYield:0.0, risk:38, sig:'BUY'   },
  { sym:'LLY',   name:'Eli Lilly',           sector:'Healthcare',  country:'US', price:880.0, volume:3,  mcap:840,  pe:65,  fwdPe:48, pb:60,   evEbitda:50,   revGrowth:36.0,  epsGrowth:100,   roe:80,  roic:50, netMgn:25, de:1.5,  divYield:0.6, risk:32, sig:'BUY'   },
  { sym:'MRK',   name:'Merck',               sector:'Healthcare',  country:'US', price:120.0, volume:9,  mcap:300,  pe:22,  fwdPe:14, pb:7.0,  evEbitda:14,   revGrowth:7.0,   epsGrowth:8.0,   roe:35,  roic:24, netMgn:25, de:0.7,  divYield:2.6, risk:24, sig:'BUY'   },
  { sym:'ABBV',  name:'AbbVie',              sector:'Healthcare',  country:'US', price:170.0, volume:9,  mcap:300,  pe:60,  fwdPe:14, pb:50,   evEbitda:16,   revGrowth:0.0,   epsGrowth:5.0,   roe:90,  roic:18, netMgn:9,  de:9.0,  divYield:3.6, risk:30, sig:'BUY'   },
  { sym:'AMGN',  name:'Amgen',               sector:'Healthcare',  country:'US', price:280.0, volume:3,  mcap:150,  pe:32,  fwdPe:14, pb:30,   evEbitda:14,   revGrowth:18.0,  epsGrowth:5.0,   roe:120, roic:14, netMgn:15, de:5.0,  divYield:3.2, risk:30, sig:'BUY'   },
  { sym:'TMO',   name:'Thermo Fisher',       sector:'Healthcare',  country:'US', price:540.0, volume:1.5,mcap:205,  pe:35,  fwdPe:25, pb:5.0,  evEbitda:22,   revGrowth:0.0,   epsGrowth:5.0,   roe:14,  roic:11, netMgn:14, de:0.7,  divYield:0.3, risk:24, sig:'BUY'   },
  { sym:'ABT',   name:'Abbott Labs',         sector:'Healthcare',  country:'US', price:115.0, volume:5,  mcap:200,  pe:36,  fwdPe:24, pb:5.0,  evEbitda:18,   revGrowth:1.0,   epsGrowth:0.0,   roe:14,  roic:11, netMgn:14, de:0.5,  divYield:1.9, risk:24, sig:'BUY'   },
  { sym:'DHR',   name:'Danaher',             sector:'Healthcare',  country:'US', price:240.0, volume:2,  mcap:175,  pe:42,  fwdPe:28, pb:4.0,  evEbitda:22,   revGrowth:-2.0,  epsGrowth:-10.0, roe:10,  roic:8,  netMgn:18, de:0.4,  divYield:0.5, risk:24, sig:'BUY'   },
  { sym:'GILD',  name:'Gilead Sciences',     sector:'Healthcare',  country:'US', price:80.0,  volume:7,  mcap:100,  pe:18,  fwdPe:11, pb:5.0,  evEbitda:8,    revGrowth:0.0,   epsGrowth:8.0,   roe:30,  roic:18, netMgn:25, de:1.4,  divYield:3.8, risk:28, sig:'BUY'   },
  { sym:'ISRG',  name:'Intuitive Surgical',  sector:'Healthcare',  country:'US', price:540.0, volume:1.5,mcap:190,  pe:80,  fwdPe:60, pb:9.0,  evEbitda:55,   revGrowth:14.0,  epsGrowth:18.0,  roe:14,  roic:14, netMgn:25, de:0.0,  divYield:0.0, risk:28, sig:'BUY'   },
  { sym:'BMY',   name:'Bristol-Myers',       sector:'Healthcare',  country:'US', price:55.0,  volume:11, mcap:115,  pe:null,fwdPe:8,  pb:6.0,  evEbitda:8,    revGrowth:7.0,   epsGrowth:0.0,   roe:0,   roic:0,  netMgn:-25,de:2.5,  divYield:4.4, risk:38, sig:'WATCH' },
  { sym:'CVS',   name:'CVS Health',          sector:'Healthcare',  country:'US', price:65.0,  volume:8,  mcap:80,   pe:11,  fwdPe:9,  pb:1.0,  evEbitda:7,    revGrowth:6.0,   epsGrowth:0.0,   roe:11,  roic:7,  netMgn:1,  de:0.7,  divYield:4.2, risk:38, sig:'WATCH' },
  { sym:'ELV',   name:'Elevance Health',     sector:'Healthcare',  country:'US', price:380.0, volume:1.5,mcap:88,   pe:14,  fwdPe:11, pb:2.4,  evEbitda:8,    revGrowth:2.0,   epsGrowth:8.0,   roe:18,  roic:10, netMgn:4,  de:0.7,  divYield:1.7, risk:30, sig:'BUY'   },
  { sym:'BA',    name:'Boeing',              sector:'Industrials', country:'US', price:170.0, volume:7,  mcap:103,  pe:null,fwdPe:60, pb:null, evEbitda:35,   revGrowth:1.0,   epsGrowth:0.0,   roe:0,   roic:-5, netMgn:-10,de:-1.0, divYield:0.0, risk:65, sig:'RISK'  },
  { sym:'GE',    name:'GE Aerospace',        sector:'Industrials', country:'US', price:175.0, volume:5,  mcap:190,  pe:36,  fwdPe:30, pb:15,   evEbitda:24,   revGrowth:6.0,   epsGrowth:50.0,  roe:42,  roic:14, netMgn:13, de:0.7,  divYield:0.7, risk:30, sig:'BUY'   },
  { sym:'RTX',   name:'RTX',                 sector:'Industrials', country:'US', price:120.0, volume:6,  mcap:160,  pe:24,  fwdPe:18, pb:2.4,  evEbitda:14,   revGrowth:8.0,   epsGrowth:8.0,   roe:9,   roic:7,  netMgn:6,  de:0.7,  divYield:2.3, risk:28, sig:'BUY'   },
  { sym:'LMT',   name:'Lockheed Martin',     sector:'Industrials', country:'US', price:480.0, volume:1.2,mcap:115,  pe:18,  fwdPe:16, pb:14,   evEbitda:13,   revGrowth:5.0,   epsGrowth:5.0,   roe:65,  roic:25, netMgn:9,  de:1.6,  divYield:2.7, risk:24, sig:'BUY'   },
  { sym:'HON',   name:'Honeywell',           sector:'Industrials', country:'US', price:200.0, volume:3,  mcap:135,  pe:22,  fwdPe:20, pb:8.0,  evEbitda:15,   revGrowth:3.0,   epsGrowth:5.0,   roe:32,  roic:18, netMgn:14, de:1.0,  divYield:2.2, risk:24, sig:'BUY'   },
  { sym:'UPS',   name:'UPS',                 sector:'Industrials', country:'US', price:130.0, volume:5,  mcap:115,  pe:18,  fwdPe:14, pb:8.0,  evEbitda:11,   revGrowth:-7.0,  epsGrowth:-25.0, roe:42,  roic:14, netMgn:7,  de:1.7,  divYield:5.0, risk:30, sig:'WATCH' },
  { sym:'DE',    name:'Deere & Co.',         sector:'Industrials', country:'US', price:380.0, volume:2,  mcap:105,  pe:14,  fwdPe:14, pb:6.0,  evEbitda:8,    revGrowth:-15.0, epsGrowth:-20.0, roe:42,  roic:11, netMgn:18, de:2.5,  divYield:1.5, risk:32, sig:'WATCH' },
  { sym:'ADP',   name:'ADP',                 sector:'Industrials', country:'US', price:280.0, volume:1.5,mcap:115,  pe:30,  fwdPe:26, pb:9.0,  evEbitda:21,   revGrowth:7.0,   epsGrowth:11.0,  roe:32,  roic:25, netMgn:18, de:0.7,  divYield:1.8, risk:22, sig:'BUY'   },
  { sym:'F',     name:'Ford Motor',          sector:'Auto',        country:'US', price:11.0,  volume:55, mcap:44,   pe:7,   fwdPe:7,  pb:1.0,  evEbitda:14,   revGrowth:7.0,   epsGrowth:300,   roe:14,  roic:5,  netMgn:3,  de:2.7,  divYield:5.5, risk:50, sig:'WATCH' },
  { sym:'GM',    name:'General Motors',      sector:'Auto',        country:'US', price:50.0,  volume:18, mcap:55,   pe:5,   fwdPe:5,  pb:0.7,  evEbitda:9,    revGrowth:9.0,   epsGrowth:0.0,   roe:14,  roic:5,  netMgn:5,  de:1.5,  divYield:1.0, risk:48, sig:'WATCH' },
  { sym:'RIVN',  name:'Rivian Automotive',   sector:'Auto',        country:'US', price:14.0,  volume:55, mcap:14,   pe:null,fwdPe:null,pb:1.5,  evEbitda:null, revGrowth:80.0,  epsGrowth:0.0,   roe:-30, roic:-25,netMgn:-90,de:0.7,  divYield:0.0, risk:78, sig:'RISK'  },
  { sym:'NIO',   name:'NIO',                 sector:'Auto',        country:'CN', price:5.0,   volume:55, mcap:10,   pe:null,fwdPe:null,pb:1.4,  evEbitda:null, revGrowth:14.0,  epsGrowth:0.0,   roe:-25, roic:-20,netMgn:-30,de:0.7,  divYield:0.0, risk:75, sig:'RISK'  },
  { sym:'LI',    name:'Li Auto',             sector:'Auto',        country:'CN', price:22.0,  volume:11, mcap:24,   pe:18,  fwdPe:15, pb:2.0,  evEbitda:7,    revGrowth:25.0,  epsGrowth:35.0,  roe:14,  roic:11, netMgn:7,  de:0.0,  divYield:0.0, risk:48, sig:'WATCH' },
  { sym:'XPEV',  name:'XPeng',               sector:'Auto',        country:'CN', price:13.0,  volume:11, mcap:12,   pe:null,fwdPe:null,pb:2.0,  evEbitda:null, revGrowth:60.0,  epsGrowth:0.0,   roe:-22, roic:-18,netMgn:-22,de:0.5,  divYield:0.0, risk:72, sig:'RISK'  },
  { sym:'BABA',  name:'Alibaba',             sector:'Technology',  country:'CN', price:80.0,  volume:18, mcap:200,  pe:14,  fwdPe:9,  pb:1.5,  evEbitda:8,    revGrowth:5.0,   epsGrowth:11.0,  roe:9,   roic:7,  netMgn:7,  de:0.2,  divYield:1.2, risk:40, sig:'WATCH' },
  { sym:'JD',    name:'JD.com',              sector:'Technology',  country:'CN', price:38.0,  volume:18, mcap:60,   pe:11,  fwdPe:9,  pb:1.4,  evEbitda:6,    revGrowth:1.0,   epsGrowth:18.0,  roe:13,  roic:9,  netMgn:1,  de:0.4,  divYield:2.6, risk:42, sig:'WATCH' },
  { sym:'PDD',   name:'PDD Holdings',        sector:'Technology',  country:'CN', price:140.0, volume:14, mcap:185,  pe:9,   fwdPe:9,  pb:5.0,  evEbitda:8,    revGrowth:80.0,  epsGrowth:90.0,  roe:48,  roic:38, netMgn:25, de:0.0,  divYield:0.0, risk:42, sig:'BUY'   },
  { sym:'NTES',  name:'NetEase',             sector:'Technology',  country:'CN', price:90.0,  volume:3,  mcap:60,   pe:14,  fwdPe:14, pb:3.0,  evEbitda:9,    revGrowth:7.0,   epsGrowth:14.0,  roe:21,  roic:18, netMgn:26, de:0.0,  divYield:1.7, risk:36, sig:'BUY'   },
  { sym:'SAP',   name:'SAP SE',              sector:'Technology',  country:'DE', price:215.0, volume:1.5,mcap:250,  pe:60,  fwdPe:30, pb:5.0,  evEbitda:24,   revGrowth:9.0,   epsGrowth:14.0,  roe:9,   roic:9,  netMgn:13, de:0.4,  divYield:1.0, risk:30, sig:'BUY'   },
  { sym:'ARM',   name:'ARM Holdings',        sector:'Technology',  country:'GB', price:140.0, volume:7,  mcap:140,  pe:null,fwdPe:80, pb:25,   evEbitda:55,   revGrowth:18.0,  epsGrowth:35.0,  roe:11,  roic:9,  netMgn:14, de:0.0,  divYield:0.0, risk:42, sig:'WATCH' },
  { sym:'SE',    name:'Sea Limited',         sector:'Technology',  country:'SG', price:130.0, volume:3,  mcap:75,   pe:null,fwdPe:35, pb:5.0,  evEbitda:32,   revGrowth:23.0,  epsGrowth:0.0,   roe:14,  roic:11, netMgn:5,  de:0.5,  divYield:0.0, risk:48, sig:'WATCH' },
  { sym:'MELI',  name:'MercadoLibre',        sector:'Technology',  country:'AR', price:2200, volume:0.3, mcap:115,  pe:80,  fwdPe:55, pb:32,   evEbitda:50,   revGrowth:35.0,  epsGrowth:50.0,  roe:42,  roic:30, netMgn:9,  de:0.4,  divYield:0.0, risk:42, sig:'BUY'   },
  { sym:'SMCI',  name:'Super Micro',         sector:'Technology',  country:'US', price:48.0,  volume:14, mcap:28,   pe:24,  fwdPe:14, pb:5.0,  evEbitda:14,   revGrowth:55.0,  epsGrowth:25.0,  roe:30,  roic:24, netMgn:7,  de:0.4,  divYield:0.0, risk:62, sig:'WATCH' },
]

const SECTORS = ['All', ...Array.from(new Set(UNIVERSE.map(u => u.sector))).sort()]
const COUNTRIES = ['All', ...Array.from(new Set(UNIVERSE.map(u => u.country))).sort()]
const SIGNALS = ['All', 'BUY', 'WATCH', 'RISK']

// ─── Filter state ───────────────────────────────────────────────
interface FilterState {
  peMin?: string; peMax?: string
  fwdPeMin?: string; fwdPeMax?: string
  pbMin?: string; pbMax?: string
  evEbitdaMin?: string; evEbitdaMax?: string
  mcapMin?: string; mcapMax?: string
  priceMin?: string; priceMax?: string
  volumeMin?: string; volumeMax?: string
  revGrowthMin?: string; revGrowthMax?: string
  epsGrowthMin?: string; epsGrowthMax?: string
  roeMin?: string; roeMax?: string
  roicMin?: string; roicMax?: string
  netMgnMin?: string; netMgnMax?: string
  deMin?: string; deMax?: string
  divYieldMin?: string; divYieldMax?: string
  sector?: string
  country?: string
  sig?: string
  search?: string
}

const EMPTY_FILTERS: FilterState = { sector: 'All', country: 'All', sig: 'All' }

function passes(r: Row, f: FilterState): boolean {
  // Text search
  if (f.search && f.search.trim()) {
    const q = f.search.toLowerCase()
    if (!r.sym.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false
  }
  // Enum filters
  if (f.sector && f.sector !== 'All' && r.sector !== f.sector) return false
  if (f.country && f.country !== 'All' && r.country !== f.country) return false
  if (f.sig && f.sig !== 'All' && r.sig !== f.sig) return false

  // Numeric min/max check helper
  const check = (val: number | null, min?: string, max?: string) => {
    const mn = min ? parseFloat(min) : NaN
    const mx = max ? parseFloat(max) : NaN
    if (!isNaN(mn) || !isNaN(mx)) {
      // Has a constraint → N/A values fail
      if (val == null) return false
      if (!isNaN(mn) && val < mn) return false
      if (!isNaN(mx) && val > mx) return false
    }
    return true
  }

  if (!check(r.pe, f.peMin, f.peMax)) return false
  if (!check(r.fwdPe, f.fwdPeMin, f.fwdPeMax)) return false
  if (!check(r.pb, f.pbMin, f.pbMax)) return false
  if (!check(r.evEbitda, f.evEbitdaMin, f.evEbitdaMax)) return false
  if (!check(r.mcap, f.mcapMin, f.mcapMax)) return false
  if (!check(r.price, f.priceMin, f.priceMax)) return false
  if (!check(r.volume, f.volumeMin, f.volumeMax)) return false
  if (!check(r.revGrowth, f.revGrowthMin, f.revGrowthMax)) return false
  if (!check(r.epsGrowth, f.epsGrowthMin, f.epsGrowthMax)) return false
  if (!check(r.roe, f.roeMin, f.roeMax)) return false
  if (!check(r.roic, f.roicMin, f.roicMax)) return false
  if (!check(r.netMgn, f.netMgnMin, f.netMgnMax)) return false
  if (!check(r.de, f.deMin, f.deMax)) return false
  if (!check(r.divYield, f.divYieldMin, f.divYieldMax)) return false

  return true
}

// ─── Sparkline ───────────────────────────────────────────────────
function Spark({ up }: { up: boolean }) {
  const data = Array.from({ length: 20 }, (_, i) => {
    const base = 100 + (up ? i * 0.4 : -i * 0.3)
    return base + (Math.random() - 0.5) * 3
  })
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1
  const pts = data.map((p, i) => `${2 + 52 * i / 19},${14 - 2 - (p - mn) / rng * 10}`).join(' ')
  return <svg width={56} height={14}><polyline points={pts} fill="none" stroke={up ? '#3fb950' : '#f85149'} strokeWidth="1.2" /></svg>
}

// ═══════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════

// Filter field definition — maps an id to label/unit/type/state keys
type FilterFieldId =
  | 'pe' | 'fwdPe' | 'pb' | 'evEbitda' | 'mcap' | 'price' | 'volume'
  | 'revGrowth' | 'epsGrowth' | 'roe' | 'roic' | 'netMgn' | 'de' | 'divYield'
  | 'sector' | 'country' | 'sig'

interface FilterField {
  id: FilterFieldId
  label: string
  kind: 'range' | 'select'
  unit?: string
  minKey?: keyof FilterState
  maxKey?: keyof FilterState
  valueKey?: keyof FilterState
  options?: string[]
}

const FILTER_FIELDS: FilterField[] = [
  { id: 'pe',        label: 'P/E',            kind: 'range', unit: 'x',  minKey: 'peMin',        maxKey: 'peMax' },
  { id: 'fwdPe',     label: 'Forward P/E',    kind: 'range', unit: 'x',  minKey: 'fwdPeMin',     maxKey: 'fwdPeMax' },
  { id: 'pb',        label: 'P/B',            kind: 'range', unit: 'x',  minKey: 'pbMin',        maxKey: 'pbMax' },
  { id: 'evEbitda',  label: 'EV/EBITDA',      kind: 'range', unit: 'x',  minKey: 'evEbitdaMin',  maxKey: 'evEbitdaMax' },
  { id: 'mcap',      label: 'Market Cap',     kind: 'range', unit: '$B', minKey: 'mcapMin',      maxKey: 'mcapMax' },
  { id: 'price',     label: 'Price',          kind: 'range', unit: '$',  minKey: 'priceMin',     maxKey: 'priceMax' },
  { id: 'volume',    label: 'Volume',         kind: 'range', unit: 'M',  minKey: 'volumeMin',    maxKey: 'volumeMax' },
  { id: 'revGrowth', label: 'Revenue Growth', kind: 'range', unit: '%',  minKey: 'revGrowthMin', maxKey: 'revGrowthMax' },
  { id: 'epsGrowth', label: 'EPS Growth',     kind: 'range', unit: '%',  minKey: 'epsGrowthMin', maxKey: 'epsGrowthMax' },
  { id: 'roe',       label: 'ROE',            kind: 'range', unit: '%',  minKey: 'roeMin',       maxKey: 'roeMax' },
  { id: 'roic',      label: 'ROIC',           kind: 'range', unit: '%',  minKey: 'roicMin',      maxKey: 'roicMax' },
  { id: 'netMgn',    label: 'Net Margin',     kind: 'range', unit: '%',  minKey: 'netMgnMin',    maxKey: 'netMgnMax' },
  { id: 'de',        label: 'Debt / Equity',  kind: 'range', unit: 'x',  minKey: 'deMin',        maxKey: 'deMax' },
  { id: 'divYield',  label: 'Dividend Yield', kind: 'range', unit: '%',  minKey: 'divYieldMin',  maxKey: 'divYieldMax' },
  { id: 'sector',    label: 'Sector',         kind: 'select', valueKey: 'sector',  options: SECTORS },
  { id: 'country',   label: 'Country',        kind: 'select', valueKey: 'country', options: COUNTRIES },
  { id: 'sig',       label: 'Signal',         kind: 'select', valueKey: 'sig',     options: SIGNALS },
]

export function Screener() {
  const navigate = useNavigate()
  const prices = useStore(s => s.prices)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [active, setActive] = useState<FilterFieldId[]>([])  // ordered list of activated filter ids
  const [sortKey, setSortKey] = useState<string>('mcap')
  const [sortAsc, setSortAsc] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  const activeCount = active.length
  const updateF = (patch: Partial<FilterState>) => setFilters(f => ({ ...f, ...patch }))

  const addFilter = (id: FilterFieldId) => {
    if (active.includes(id)) return
    setActive(a => [...a, id])
    setShowPicker(false)
    setPickerSearch('')
  }

  const removeFilter = (id: FilterFieldId) => {
    setActive(a => a.filter(x => x !== id))
    // Clear the stored values for this filter so it stops filtering
    const f = FILTER_FIELDS.find(x => x.id === id)
    if (!f) return
    if (f.kind === 'range') updateF({ [f.minKey!]: '', [f.maxKey!]: '' } as any)
    else updateF({ [f.valueKey!]: 'All' } as any)
  }

  const resetFilters = () => {
    setActive([])
    setFilters(EMPTY_FILTERS)
  }

  const availableFields = FILTER_FIELDS.filter(f =>
    !active.includes(f.id) &&
    (!pickerSearch || f.label.toLowerCase().includes(pickerSearch.toLowerCase()))
  )

  const filtered = useMemo(() => {
    return UNIVERSE.filter(r => passes(r, filters))
      .sort((a, b) => {
        const va = (a as any)[sortKey], vb = (b as any)[sortKey]
        if (va == null) return 1; if (vb == null) return -1
        if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
        return sortAsc ? (va - vb) : (vb - va)
      })
  }, [filters, sortKey, sortAsc])

  function onSort(k: string) {
    if (k === sortKey) setSortAsc(a => !a)
    else { setSortKey(k); setSortAsc(true) }
  }

  const SH = ({ k, label }: { k: string; label: string }) => (
    <th onClick={() => onSort(k)}
      style={{ padding: '5px 10px', textAlign: 'left', fontSize: 8, color: sortKey === k ? '#58a6ff' : '#8b949e', fontWeight: 400, cursor: 'pointer', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>
      {label} {sortKey === k ? (sortAsc ? '▲' : '▼') : ''}
    </th>
  )

  return (
    <div style={{ padding: 12, fontFamily: 'inherit' }}>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#58a6ff', fontWeight: 600, letterSpacing: 0.5 }}>SCREENER</span>
        <span style={{ fontSize: 10, color: '#8b949e', marginLeft: 'auto' }}>
          <span style={{ color: '#c9d1d9', fontWeight: 600 }}>{filtered.length}</span> / {UNIVERSE.length} matching
        </span>
      </div>

      {/* ═══ IBKR-STYLE: Add-filter button + active filter chips ═══ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10, position: 'relative' }}>

        {/* "+ Filters" button — opens picker menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPicker(v => !v)}
            style={{
              padding: '5px 12px', fontSize: 10, borderRadius: 2,
              background: showPicker ? '#21262d' : 'transparent',
              border: '1px solid #30363d',
              color: '#c9d1d9', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              letterSpacing: 0.4, fontWeight: 600, textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!showPicker) e.currentTarget.style.background = '#161b22' }}
            onMouseLeave={e => { if (!showPicker) e.currentTarget.style.background = 'transparent' }}>
            <span style={{ fontSize: 12, color: '#58a6ff' }}>+</span> Filters
            {activeCount > 0 && (
              <span style={{ marginLeft: 4, color: '#58a6ff', fontSize: 9, background: 'rgba(56,139,253,0.10)', border: '1px solid rgba(56,139,253,0.30)', padding: '0 6px', borderRadius: 8 }}>
                {activeCount}
              </span>
            )}
          </button>

          {/* Picker dropdown */}
          {showPicker && (
            <>
              <div onClick={() => setShowPicker(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: '#0e1117', border: '1px solid #30363d', borderRadius: 2,
                width: 240, maxHeight: 340, overflow: 'hidden',
                zIndex: 50, boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column',
              }}>
                <input
                  autoFocus
                  placeholder="Search a filter…"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  style={{
                    padding: '6px 10px', fontSize: 10,
                    background: '#0b0f14', border: 'none',
                    borderBottom: '1px solid #21262d',
                    color: '#c9d1d9', outline: 'none',
                  }}
                />
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {availableFields.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 10, color: '#484f58', textAlign: 'center' }}>
                      {pickerSearch ? 'No matches' : 'All filters are active'}
                    </div>
                  ) : availableFields.map(f => (
                    <div key={f.id}
                      onClick={() => addFilter(f.id)}
                      style={{
                        padding: '6px 12px', fontSize: 11, color: '#c9d1d9',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ flex: 1 }}>{f.label}</span>
                      <span style={{ fontSize: 8, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        {f.kind === 'range' ? f.unit : 'list'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search box — always visible (ticker / name) */}
        <input
          type="text"
          placeholder="Search ticker or name…"
          value={filters.search ?? ''}
          onChange={e => updateF({ search: e.target.value })}
          style={{
            fontSize: 10, padding: '5px 10px',
            background: '#0e1117', border: '1px solid #30363d', borderRadius: 2,
            color: '#c9d1d9', outline: 'none', minWidth: 200,
          }}
        />

        {/* Active filter chips */}
        {active.map(id => {
          const f = FILTER_FIELDS.find(x => x.id === id)!
          return <FilterChip key={id} field={f} filters={filters} updateF={updateF} onRemove={() => removeFilter(id)} />
        })}

        {/* Clear all */}
        {activeCount > 0 && (
          <button onClick={resetFilters}
            style={{
              fontSize: 9, color: '#f85149', background: 'transparent',
              border: '1px solid rgba(248,81,73,0.25)', borderRadius: 2,
              padding: '4px 10px', cursor: 'pointer', marginLeft: 'auto',
              letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: 'inherit',
            }}>
            Clear all
          </button>
        )}
      </div>

      {/* ─── Results table ─── */}
      <div style={{ border: '1px solid #21262d', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#0e1117', borderBottom: '1px solid #21262d' }}>
              <SH k="sym"       label="TICKER" />
              <SH k="name"      label="NAME" />
              <SH k="sector"    label="SECTOR" />
              <SH k="country"   label="CTRY" />
              <SH k="price"     label="PRICE" />
              <SH k="mcap"      label="MCAP ($B)" />
              <SH k="pe"        label="P/E" />
              <SH k="fwdPe"     label="FWD P/E" />
              <SH k="evEbitda"  label="EV/EBITDA" />
              <SH k="revGrowth" label="REV %" />
              <SH k="epsGrowth" label="EPS %" />
              <SH k="roe"       label="ROE%" />
              <SH k="de"        label="D/E" />
              <SH k="divYield"  label="DIV%" />
              <th style={{ padding: '5px 10px', textAlign: 'left', fontSize: 8, color: '#8b949e', fontWeight: 400 }}>TREND</th>
              <SH k="sig"       label="SIG" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const p = prices[r.sym]
              const pct = p?.pct ?? (Math.random() - 0.48) * 3
              const price = p?.price ?? r.price
              const up = pct >= 0
              const sigCol = r.sig === 'BUY' ? '#3fb950' : r.sig === 'RISK' ? '#f85149' : '#484f58'
              const sigIcon = r.sig === 'BUY' ? '▲' : r.sig === 'RISK' ? '▼' : '—'
              return (
                <tr key={r.sym} onClick={() => navigate(`/ticker/${r.sym}`)}
                  style={{ borderBottom: '1px solid #141414', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '6px 10px', color: '#c9d1d9', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Logo sym={r.sym}/>
                      {r.sym}
                    </span>
                  </td>
                  <td style={{ padding: '6px 10px', color: '#8b949e', fontSize: 10, whiteSpace: 'nowrap' }}>{r.name}</td>
                  <td style={{ padding: '6px 10px', fontSize: 10 }}>
                    {(() => { const st = sectorStyle(r.sector); return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#8b949e', fontWeight: 500, letterSpacing: 0.2 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.fg, flexShrink: 0 }} />
                        {r.sector}
                      </span>
                    )})()}
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: 10, color: '#8b949e' }}>{r.country}</td>
                  <td style={{ padding: '6px 10px', color: up ? '#3fb950' : '#f85149', fontWeight: 600 }}>{price.toFixed(2)}</td>
                  <td style={{ padding: '6px 10px', color: '#c9d1d9' }}>{r.mcap}</td>
                  <td style={{ padding: '6px 10px', color: r.pe == null ? '#484f58' : r.pe < 15 ? '#3fb950' : r.pe < 25 ? '#d29922' : '#f85149' }}>{r.pe ?? 'N/A'}</td>
                  <td style={{ padding: '6px 10px', color: r.fwdPe == null ? '#484f58' : '#8b949e' }}>{r.fwdPe ?? 'N/A'}</td>
                  <td style={{ padding: '6px 10px', color: r.evEbitda == null ? '#484f58' : r.evEbitda < 10 ? '#3fb950' : r.evEbitda < 20 ? '#d29922' : '#f85149' }}>{r.evEbitda ?? 'N/A'}</td>
                  <td style={{ padding: '6px 10px', color: r.revGrowth == null ? '#484f58' : r.revGrowth > 10 ? '#3fb950' : r.revGrowth > 0 ? '#8b949e' : '#f85149' }}>
                    {r.revGrowth == null ? 'N/A' : `${r.revGrowth > 0 ? '+' : ''}${r.revGrowth.toFixed(1)}%`}
                  </td>
                  <td style={{ padding: '6px 10px', color: r.epsGrowth == null ? '#484f58' : r.epsGrowth > 10 ? '#3fb950' : r.epsGrowth > 0 ? '#8b949e' : '#f85149' }}>
                    {r.epsGrowth == null ? 'N/A' : `${r.epsGrowth > 0 ? '+' : ''}${r.epsGrowth.toFixed(1)}%`}
                  </td>
                  <td style={{ padding: '6px 10px', color: r.roe == null ? '#484f58' : r.roe > 15 ? '#3fb950' : r.roe > 10 ? '#d29922' : '#f85149' }}>{r.roe ?? 'N/A'}%</td>
                  <td style={{ padding: '6px 10px', color: r.de == null ? '#484f58' : r.de < 1 ? '#3fb950' : r.de < 2 ? '#d29922' : '#f85149' }}>{r.de?.toFixed(1) ?? 'N/A'}</td>
                  <td style={{ padding: '6px 10px', color: '#8b949e' }}>{r.divYield == null ? 'N/A' : `${r.divYield.toFixed(1)}%`}</td>
                  <td style={{ padding: '6px 10px' }}><Spark up={up} /></td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: sigCol }}>{sigIcon}</span>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={16} style={{ padding: 30, textAlign: 'center', color: '#484f58', fontSize: 11 }}>
                No tickers match these filters. Relax a condition or click Reset.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Filter chip — compact active-filter pill with inline controls
// ═══════════════════════════════════════════════════════════════════
function FilterChip({ field, filters, updateF, onRemove }: {
  field: FilterField
  filters: FilterState
  updateF: (patch: Partial<FilterState>) => void
  onRemove: () => void
}) {
  const isRange = field.kind === 'range'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 8px 4px 10px',
      background: 'rgba(56,139,253,0.08)',
      border: '1px solid rgba(56,139,253,0.30)',
      borderRadius: 12,
      height: 26,
    }}>
      <span style={{ fontSize: 10, color: '#58a6ff', fontWeight: 600, letterSpacing: 0.2 }}>
        {field.label}
      </span>
      <span style={{ fontSize: 10, color: '#484f58' }}>·</span>

      {isRange ? (
        <>
          <input
            type="number"
            placeholder="min"
            value={(filters[field.minKey!] as string) ?? ''}
            onChange={e => updateF({ [field.minKey!]: e.target.value } as any)}
            style={{
              width: 50, fontSize: 11, padding: '2px 5px',
              background: '#0b0f14', border: '1px solid #30363d', borderRadius: 2,
              color: '#c9d1d9', outline: 'none',
              fontFamily: "'SF Mono', Menlo, Consolas, monospace",
            }}
          />
          <span style={{ fontSize: 9, color: '#484f58' }}>–</span>
          <input
            type="number"
            placeholder="max"
            value={(filters[field.maxKey!] as string) ?? ''}
            onChange={e => updateF({ [field.maxKey!]: e.target.value } as any)}
            style={{
              width: 50, fontSize: 11, padding: '2px 5px',
              background: '#0b0f14', border: '1px solid #30363d', borderRadius: 2,
              color: '#c9d1d9', outline: 'none',
              fontFamily: "'SF Mono', Menlo, Consolas, monospace",
            }}
          />
          <span style={{ fontSize: 9, color: '#484f58' }}>{field.unit}</span>
        </>
      ) : (
        <select
          value={(filters[field.valueKey!] as string) ?? 'All'}
          onChange={e => updateF({ [field.valueKey!]: e.target.value } as any)}
          style={{
            fontSize: 11, padding: '2px 5px',
            background: '#0b0f14', border: '1px solid #30363d', borderRadius: 2,
            color: '#c9d1d9', outline: 'none',
            fontFamily: 'inherit', maxWidth: 130,
          }}>
          {field.options!.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}

      <span
        onClick={onRemove}
        style={{
          cursor: 'pointer', marginLeft: 4, fontSize: 11,
          color: '#8b949e', lineHeight: 1,
          width: 16, height: 16, borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.color = '#f85149' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' }}
      >
        ×
      </span>
    </span>
  )
}
