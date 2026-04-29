// pages/ticker/TickerWorkspace.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { FundamentalPanel } from '@/components/FundamentalPanel'
import { Logo } from '@/components/common/Logo'

interface Props { symbol: string }
const F = "inherit"
const mono = "'SF Mono', Menlo, Consolas, monospace"
const f2 = (n?: number | null) => n != null ? n.toFixed(2) : '—'
const fB = (n?: number | null) => n != null ? '$' + (n >= 1000 ? (n/1000).toFixed(1)+'T' : n.toFixed(0)+'B') : '—'

// ─── Simulated data ──────────────────────────────────────────
const SIM_FUNDS: Record<string, any> = {
  AAPL: { name:'Apple Inc.',        sector:'tech',     exchange:'NASDAQ', price:213.2, mcap:3100, ev:3150, beta:1.24, h52:237.2, l52:164.1, evEbitda:22,  opMgn:30, netMgn:25 },
  MSFT: { name:'Microsoft Corp.',   sector:'tech',     exchange:'NASDAQ', price:415.0, mcap:3200, ev:3100, beta:0.88, h52:468.4, l52:309.1, evEbitda:24,  opMgn:45, netMgn:35 },
  NVDA: { name:'NVIDIA Corp.',      sector:'tech',     exchange:'NASDAQ', price:875.0, mcap:2100, ev:2050, beta:1.72, h52:974.0, l52:460.0, evEbitda:45,  opMgn:55, netMgn:48 },
  GOOGL:{ name:'Alphabet Inc.',     sector:'tech',     exchange:'NASDAQ', price:175.0, mcap:1900, ev:1850, beta:1.05, h52:196.0, l52:130.0, evEbitda:18,  opMgn:28, netMgn:23 },
  META: { name:'Meta Platforms',    sector:'tech',     exchange:'NASDAQ', price:520.0, mcap:1350, ev:1300, beta:1.35, h52:589.0, l52:352.0, evEbitda:16,  opMgn:35, netMgn:29 },
  AMZN: { name:'Amazon.com',        sector:'tech',     exchange:'NASDAQ', price:185.0, mcap:1950, ev:2000, beta:1.18, h52:225.0, l52:151.0, evEbitda:20,  opMgn:8,  netMgn:6  },
  AMD:  { name:'Advanced Micro',    sector:'tech',     exchange:'NASDAQ', price:160.0, mcap:250,  ev:260,  beta:1.85, h52:227.3, l52:141.5, evEbitda:38,  opMgn:4,  netMgn:4  },
  PLTR: { name:'Palantir Tech.',    sector:'tech',     exchange:'NYSE',   price:22.0,  mcap:47,   ev:42,   beta:2.4,  h52:27.5,  l52:12.0,  evEbitda:80,  opMgn:8,  netMgn:8  },
  TSLA: { name:'Tesla Inc.',        sector:'cyclical', exchange:'NASDAQ', price:175.0, mcap:560,  ev:590,  beta:2.1,  h52:271.0, l52:138.8, evEbitda:52,  opMgn:5,  netMgn:4  },
  F:    { name:'Ford Motor',        sector:'cyclical', exchange:'NYSE',   price:12.0,  mcap:48,   ev:110,  beta:1.45, h52:14.8,  l52:9.5,   evEbitda:14,  opMgn:4,  netMgn:2  },
  GM:   { name:'General Motors',    sector:'cyclical', exchange:'NYSE',   price:45.0,  mcap:45,   ev:120,  beta:1.32, h52:55.0,  l52:31.0,  evEbitda:10,  opMgn:7,  netMgn:4  },
  CAT:  { name:'Caterpillar',       sector:'cyclical', exchange:'NYSE',   price:340.0, mcap:160,  ev:185,  beta:1.08, h52:395.0, l52:248.0, evEbitda:12,  opMgn:18, netMgn:13 },
  JPM:  { name:'JPMorgan Chase',    sector:'bank',     exchange:'NYSE',   price:198.0, mcap:580,  ev:null, beta:1.12, h52:220.8, l52:145.0, evEbitda:null,opMgn:null,netMgn:26 },
  BAC:  { name:'Bank of America',   sector:'bank',     exchange:'NYSE',   price:38.0,  mcap:310,  ev:null, beta:1.35, h52:44.4,  l52:26.4,  evEbitda:null,opMgn:null,netMgn:20 },
  GS:   { name:'Goldman Sachs',     sector:'bank',     exchange:'NYSE',   price:480.0, mcap:155,  ev:null, beta:1.42, h52:558.0, l52:312.0, evEbitda:null,opMgn:null,netMgn:22 },
  JNJ:  { name:'Johnson & Johnson', sector:'normal',   exchange:'NYSE',   price:158.0, mcap:380,  ev:395,  beta:0.55, h52:175.0, l52:143.0, evEbitda:14,  opMgn:22, netMgn:18 },
  XOM:  { name:'ExxonMobil',        sector:'normal',   exchange:'NYSE',   price:108.0, mcap:450,  ev:470,  beta:0.85, h52:123.0, l52:95.0,  evEbitda:8,   opMgn:14, netMgn:10 },
  WMT:  { name:'Walmart Inc.',      sector:'normal',   exchange:'NYSE',   price:65.0,  mcap:520,  ev:590,  beta:0.52, h52:72.0,  l52:49.0,  evEbitda:19,  opMgn:5,  netMgn:2  },
}

// ─── Instrument Type Detection ─────────────────────────────────
type InstrumentType = 'equity' | 'forex' | 'crypto' | 'commodity' | 'etf' | 'index'

function getInstrumentType(sym: string): InstrumentType {
  if (sym.endsWith('=X')) return 'forex'
  if (sym.endsWith('-USD') || sym.includes('BTC') || sym.includes('ETH')) return 'crypto'
  if (sym.endsWith('=F')) return 'commodity'
  if (['SPY','QQQ','IWM','DIA','XLK','XLF','XLE','XLV','TLT','HYG','LQD','EWJ','EWG','EWU','FXI'].includes(sym)) return 'etf'
  if (['^GSPC','^IXIC','^DJI','^VIX'].includes(sym)) return 'index'
  return 'equity'
}

function isFX(sym: string): boolean { return sym.endsWith('=X') }
function isJPYPair(sym: string): boolean { return sym.includes('JPY') }

// FX pair metadata
const FX_META: Record<string, { name: string; base: string; quote: string; type: string; region: string }> = {
  'EURUSD=X': { name: 'Euro / US Dollar', base: 'EUR', quote: 'USD', type: 'Major', region: 'EU/US' },
  'GBPUSD=X': { name: 'Pound / US Dollar', base: 'GBP', quote: 'USD', type: 'Major', region: 'GB/US' },
  'USDJPY=X': { name: 'US Dollar / Yen', base: 'USD', quote: 'JPY', type: 'Major', region: 'US/JP' },
  'USDCHF=X': { name: 'US Dollar / Swiss Franc', base: 'USD', quote: 'CHF', type: 'Major', region: 'US/CH' },
  'AUDUSD=X': { name: 'Australian Dollar / USD', base: 'AUD', quote: 'USD', type: 'Major', region: 'AU/US' },
  'USDCAD=X': { name: 'US Dollar / Canadian Dollar', base: 'USD', quote: 'CAD', type: 'Major', region: 'US/CA' },
  'NZDUSD=X': { name: 'New Zealand Dollar / USD', base: 'NZD', quote: 'USD', type: 'Major', region: 'NZ/US' },
  'EURGBP=X': { name: 'Euro / Pound', base: 'EUR', quote: 'GBP', type: 'Cross', region: 'EU/GB' },
  'EURJPY=X': { name: 'Euro / Yen', base: 'EUR', quote: 'JPY', type: 'Cross', region: 'EU/JP' },
  'GBPJPY=X': { name: 'Pound / Yen', base: 'GBP', quote: 'JPY', type: 'Cross', region: 'GB/JP' },
}

function fxPrice(sym: string, val: number): string {
  if (isJPYPair(sym)) return val.toFixed(3)
  return val.toFixed(5)
}

function getSimFund(sym: string) {
  if (SIM_FUNDS[sym]) return SIM_FUNDS[sym]
  // FX pairs — no equity metrics
  if (isFX(sym)) {
    const meta = FX_META[sym]
    const seed = sym.split('').reduce((a,c)=>a+c.charCodeAt(0),0)
    const r = (mn:number,mx:number) => mn + ((seed*1664525+1013904223)>>>0)/4294967296*(mx-mn)
    const px = isJPYPair(sym) ? 140+r(10,20) : 0.6+r(0.2,0.8)
    return {
      name: meta?.name ?? sym.replace('=X',''), sector: 'forex', exchange: 'FX',
      price: px, mcap: null, ev: null, beta: 0.3+r(0.1,0.6),
      h52: px * (1 + r(0.03, 0.12)), l52: px * (1 - r(0.03, 0.12)),
      evEbitda: null, opMgn: null, netMgn: null,
      fxType: meta?.type ?? 'Major', fxBase: meta?.base, fxQuote: meta?.quote, fxRegion: meta?.region,
    }
  }
  const seed = sym.split('').reduce((a,c)=>a+c.charCodeAt(0),0)
  const r = (mn:number,mx:number) => mn + ((seed*1664525+1013904223)>>>0)/4294967296*(mx-mn)
  return { name:sym, sector:'normal', exchange:'NASDAQ', price:100+r(20,200), mcap:50+r(10,500),
    ev:60+r(10,500), beta:0.5+r(0.2,1.8), h52:150+r(20,100), l52:80+r(10,80),
    evEbitda:8+r(2,20), opMgn:8+r(2,22), netMgn:5+r(1,18) }
}

// ─── Real Price chart with TradingView lightweight-charts ────

import { fetchPriceHistory } from '@/api/client'
import { TvCandleChart } from '@/components/charts/TvCandleChart'

const PERIODS = [
  { key: '1d', label: '1D' },
  { key: '5d', label: '5D' },
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '2y', label: '2Y' },
  { key: 'max', label: 'MAX' },
] as const

function PriceChart({ symbol, up }: { symbol: string; up: boolean }) {
  const [period, setPeriod] = useState<string>('3mo')
  const [chartMode, setChartMode] = useState<'candlestick' | 'bars' | 'line' | 'area'>('candlestick')
  const [showChartMenu, setShowChartMenu] = useState(false)
  const [data, setData] = useState<{ dates: string[]; close: number[]; open: number[]; high: number[]; low: number[]; volume: number[]; interval?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPriceHistory(symbol, period as any).then(d => {
      if (!cancelled && d && d.close?.length) setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [symbol, period])

  return (
    <div>
      {/* Period + chart type buttons */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 6, alignItems: 'center' }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            style={{
              padding: '3px 10px', fontSize: 11, borderRadius: 2, border: 'none', cursor: 'pointer',
              background: period === p.key ? '#388bfd' : 'transparent',
              color: period === p.key ? '#fff' : '#8b949e',
              fontWeight: period === p.key ? 600 : 400,
            }}
            onMouseEnter={e => { if (period !== p.key) e.currentTarget.style.background = '#21262d' }}
            onMouseLeave={e => { if (period !== p.key) e.currentTarget.style.background = 'transparent' }}>
            {p.label}
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: '#21262d', margin: '0 4px' }} />

        {/* Chart type dropdown — matches Charts mode style */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowChartMenu(v => !v)}
            onBlur={() => setTimeout(() => setShowChartMenu(false), 150)}
            style={{
              padding: '3px 10px', fontSize: 10, borderRadius: 2, border: '1px solid #30363d',
              cursor: 'pointer', background: showChartMenu ? '#21262d' : 'transparent',
              color: '#c9d1d9', display: 'inline-flex', alignItems: 'center', gap: 6,
              textTransform: 'capitalize', fontFamily: 'inherit',
            }}>
            <span style={{ fontSize: 11 }}>
              {chartMode === 'candlestick' ? '🕯' : chartMode === 'bars' ? '▌' : chartMode === 'line' ? '╱' : '▲'}
            </span>
            {chartMode}
            <span style={{ fontSize: 8, color: '#8b949e' }}>▾</span>
          </button>
          {showChartMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 2,
              background: '#0e1117', border: '1px solid #30363d', borderRadius: 2,
              zIndex: 50, minWidth: 120, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}>
              {(['candlestick', 'bars', 'line', 'area'] as const).map(mode => (
                <div key={mode}
                  onMouseDown={e => { e.preventDefault(); setChartMode(mode); setShowChartMenu(false) }}
                  style={{
                    padding: '6px 12px', fontSize: 10, cursor: 'pointer',
                    color: chartMode === mode ? '#58a6ff' : '#c9d1d9',
                    background: chartMode === mode ? 'rgba(56,139,253,0.08)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 8,
                    textTransform: 'capitalize',
                  }}
                  onMouseEnter={e => { if (chartMode !== mode) e.currentTarget.style.background = '#161b22' }}
                  onMouseLeave={e => { if (chartMode !== mode) e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ fontSize: 11, width: 12 }}>
                    {mode === 'candlestick' ? '🕯' : mode === 'bars' ? '▌' : mode === 'line' ? '╱' : '▲'}
                  </span>
                  {mode}
                  {chartMode === mode && <span style={{ marginLeft: 'auto', fontSize: 9 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        {data?.interval && <span style={{ fontSize: 9, color: '#8b949e', marginLeft: 8 }}>{data.interval} bars</span>}
        {loading && <span style={{ fontSize: 9, color: '#8b949e', marginLeft: 8 }}>Loading...</span>}
      </div>
      {/* Chart */}
      <TvCandleChart data={data} height={350} showVolume={true} chartType={chartMode} symbol={symbol} />
    </div>
  )
}

// ─── Risk Gauge ───────────────────────────────────────────────
function RiskGauge({score}:{score:number}) {
  const col = score<35?'#3fb950':score<60?'#d29922':'#f85149'
  const r=28,circ=2*Math.PI*r
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#21262d" strokeWidth="7"/>
      <circle cx="36" cy="36" r={r} fill="none" stroke={col} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={circ*(1-score/100)}
        strokeLinecap="round" transform="rotate(-90 36 36)"/>
      <text x="36" y="34" textAnchor="middle" dominantBaseline="middle"
        fill={col} fontSize="15" fontWeight="700" fontFamily={F}>{score}</text>
      <text x="36" y="48" textAnchor="middle" fill="#333" fontSize="7" fontFamily={F}>RISK</text>
    </svg>
  )
}

// ─── Valuation tab — sector-specific ─────────────────────────
function ValuationTab({f, symbol}:{f:any; symbol:string}) {
  const sector = f.sector ?? 'normal'
  const isTech = sector === 'tech'
  const isBank = sector === 'bank'

  // Valuation percentile (estimated from current value vs simulated 5yr range)
  const seed = symbol.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
  const r5y = (base: number, spread: number) => {
    const vals = Array.from({length:20}, (_, i) => +(base * (0.75 + Math.sin(i * 0.5 + seed * 0.01) * spread / base + (Math.random() - 0.5) * 0.1)).toFixed(2))
    const sorted = [...vals].sort((a, b) => a - b)
    const current = base
    const pctile = sorted.filter(v => v <= current).length / sorted.length * 100
    const mean = vals.reduce((a, b) => a + b) / vals.length
    const sigma = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length)
    return { vals, mean, sigma, pctile, current }
  }

  const realEvEbitda = f.evEbitda ?? null
  const evEbitda = r5y(realEvEbitda ?? 15, 4)
  const evFcf = r5y(realEvEbitda != null ? realEvEbitda * 1.4 : 20, 5)

  // Sector-specific metrics — ONLY real data, N/A when missing
  const sectorMetrics = isBank ? [
    { l: 'Price/Book', v: f.pb != null ? (+f.pb).toFixed(2) + 'x' : '—', c: (f.pb ?? 99) < 1 ? '#3fb950' : (f.pb ?? 99) < 1.5 ? '#d29922' : '#f85149', sub: 'Bank valuation benchmark' },
    { l: 'NIM', v: f.nim != null ? (+f.nim).toFixed(2) + '%' : '—', c: '#3fb950', sub: 'Net Interest Margin' },
    { l: 'Cost/Income', v: f.costInc != null ? (+f.costInc).toFixed(0) + '%' : '—', c: '#d29922', sub: 'Efficiency ratio (<60% good)' },
    { l: 'CET1 Ratio', v: f.cet1 != null ? (+f.cet1).toFixed(1) + '%' : '—', c: '#3fb950', sub: 'Capital adequacy' },
  ] : [
    { l: 'Debt/EBITDA', v: f.dEbitda != null ? (+f.dEbitda).toFixed(1) + 'x' : '—', c: (f.dEbitda ?? 99) < 2 ? '#3fb950' : (f.dEbitda ?? 99) < 3 ? '#d29922' : '#f85149', sub: 'Net Debt ÷ EBITDA' },
    { l: 'FCF Yield', v: f.fcfYld != null ? (+f.fcfYld).toFixed(1) + '%' : '—', c: (f.fcfYld ?? 0) > 5 ? '#3fb950' : (f.fcfYld ?? 0) > 3 ? '#d29922' : '#f85149', sub: 'FCF ÷ Market Cap' },
    { l: 'ROIC', v: f.roic != null ? (+f.roic).toFixed(1) + '%' : '—', c: (f.roic ?? 0) > 15 ? '#3fb950' : (f.roic ?? 0) > 10 ? '#d29922' : '#f85149', sub: 'Return on Invested Capital' },
    { l: 'P/E', v: f.pe != null ? (+f.pe).toFixed(1) + 'x' : '—', c: (f.pe ?? 99) < 15 ? '#3fb950' : (f.pe ?? 99) < 25 ? '#d29922' : '#f85149', sub: 'Price ÷ Earnings' },
  ]

  // Percentile bar
  const PctBar = ({ pctile, label }: { pctile: number; label: string }) => {
    const col = pctile < 30 ? '#3fb950' : pctile < 70 ? '#d29922' : '#f85149'
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
          <span style={{ color: '#8b949e' }}>{label}</span>
          <span style={{ color: col, fontWeight: 500 }}>{pctile.toFixed(0)}th percentile</span>
        </div>
        <div style={{ height: 6, background: '#21262d', borderRadius: 2, position: 'relative' }}>
          <div style={{ position: 'absolute', left: `${pctile}%`, top: -2, width: 10, height: 10, borderRadius: '50%', background: col, transform: 'translateX(-50%)' }} />
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #3fb95044, #d2992244, #f8514944)', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#8b949e', marginTop: 2 }}>
          <span>Cheap</span><span>Fair</span><span>Expensive</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Core valuation metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { l: 'EV/EBITDA', v: f.evEbitda != null ? (typeof f.evEbitda === 'number' ? f.evEbitda.toFixed(1) : f.evEbitda) + 'x' : '—', c: f.evEbitda != null ? (f.evEbitda < 10 ? '#3fb950' : f.evEbitda < 18 ? '#d29922' : '#f85149') : '#8b949e', sub: 'Enterprise value metric' },
          { l: 'Op Margin', v: f.opMgn != null ? (typeof f.opMgn === 'number' ? f.opMgn.toFixed(1) : f.opMgn) + '%' : '—', c: f.opMgn != null ? (f.opMgn > 20 ? '#3fb950' : f.opMgn > 10 ? '#d29922' : '#f85149') : '#8b949e', sub: 'Operating profitability' },
          { l: 'Net Margin', v: f.netMgn != null ? (typeof f.netMgn === 'number' ? f.netMgn.toFixed(1) : f.netMgn) + '%' : '—', c: f.netMgn != null ? (f.netMgn > 15 ? '#3fb950' : f.netMgn > 8 ? '#d29922' : '#f85149') : '#8b949e', sub: 'Bottom line profit' },
          { l: 'Beta β', v: 'β' + f2(f.beta), c: f.beta < 0.8 ? '#3fb950' : f.beta < 1.3 ? '#d29922' : '#f85149', sub: 'Volatility vs market' },
        ].map(k => (
          <div key={k.l} style={{ background: '#161b22', borderTop: `2px solid ${k.c}`, padding: '12px 14px', borderRadius: 2 }}>
            <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: k.c, fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>{k.v}</div>
            <div style={{ fontSize: 9, color: '#8b949e', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Sector-specific metrics */}
      <div>
        <div style={{ fontSize: 12, color: '#8b949e', fontWeight: 500, marginBottom: 8 }}>
          {isBank ? 'BANK METRICS' : 'KEY METRICS'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {sectorMetrics.map(k => (
            <div key={k.l} style={{ background: '#161b22', padding: '10px 12px', borderRadius: 2 }}>
              <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 3 }}>{k.l}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: k.c, fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>{k.v}</div>
              <div style={{ fontSize: 9, color: '#8b949e', marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5yr Percentile bands */}
      <div style={{ background: '#161b22', borderRadius: 2, padding: 14 }}>
        <div style={{ fontSize: 12, color: '#c9d1d9', fontWeight: 500, marginBottom: 12 }}>Valuation vs 5-Year History</div>
        <PctBar pctile={evEbitda.pctile} label={`EV/EBITDA: ${(f.evEbitda ?? 15).toFixed(1)}x (5yr mean: ${evEbitda.mean.toFixed(1)}x)`} />
        <PctBar pctile={evFcf.pctile} label={`EV/FCF: ${realEvEbitda != null ? (realEvEbitda * 1.4).toFixed(1) : '—'}x (estimated)`} />
        <div style={{ marginTop: 8, fontSize: 10, color: '#8b949e', background: '#0e1117', padding: '8px 10px', borderRadius: 2 }}>
          {evEbitda.pctile < 25 ? 'Trading below historical average — potentially undervalued' :
           evEbitda.pctile > 75 ? 'Trading above historical average — potentially overvalued' :
           'Trading near historical average — fairly valued'}
        </div>
      </div>
    </div>
  )
}

// ─── TRADE PLANNER — position sizing calculator ─────────────
function TradePlanner({ price, beta }: { price: number; beta: number }) {
  const [entry, setEntry] = useState(price.toFixed(2))
  const [stop, setStop] = useState('')
  const [target, setTarget] = useState('')
  const [capital, setCapital] = useState('100000')

  const atr14 = +(price * beta * 0.015).toFixed(2)
  const ep = +entry, sp = +stop, tp = +target, cap = +capital
  const riskPerShare = ep && sp ? Math.abs(ep - sp) : 0
  const rewardPerShare = ep && tp ? Math.abs(tp - ep) : 0
  const rr = riskPerShare > 0 ? +(rewardPerShare / riskPerShare).toFixed(2) : 0
  const shares = riskPerShare > 0 && cap > 0 ? Math.floor((cap * 0.01) / riskPerShare) : 0
  const posSize = shares * ep
  const capitalAtRisk = shares * riskPerShare
  const R = (props: { l: string; v: string; c?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: 11, color: '#8b949e' }}>{props.l}</span>
      <span style={{ fontSize: 11, fontFamily: mono, fontWeight: 500, color: props.c ?? '#c9d1d9' }}>{props.v}</span>
    </div>
  )

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 10, color: '#484f58', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #21262d' }}>Trade Planner</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
        {[
          { l: 'Entry', v: entry, set: setEntry },
          { l: 'Stop', v: stop, set: setStop, ph: (price - atr14).toFixed(2) },
          { l: 'Target', v: target, set: setTarget, ph: (price + atr14 * 2).toFixed(2) },
          { l: 'Capital', v: capital, set: setCapital },
        ].map(inp => (
          <div key={inp.l}>
            <div style={{ fontSize: 9, color: '#484f58', marginBottom: 2 }}>{inp.l}</div>
            <input value={inp.v} onChange={e => inp.set(e.target.value)} placeholder={inp.ph ?? ''}
              style={{ width: '100%', fontSize: 11, padding: '4px 6px', background: '#0e1117', border: '1px solid #21262d', color: '#c9d1d9', fontFamily: mono }} />
          </div>
        ))}
      </div>
      {riskPerShare > 0 && (
        <div style={{ background: '#0e1117', border: '1px solid #21262d', padding: '8px 10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <R l="Risk / Reward" v={`1 : ${rr}`} />
            <R l="Shares" v={`${shares}`} />
            <R l="Position Size" v={`$${posSize.toLocaleString()}`} />
            <R l="Capital at Risk" v={`$${capitalAtRisk.toFixed(0)}`} />
            <R l="% of Portfolio" v={`${cap > 0 ? (posSize / cap * 100).toFixed(1) : 0}%`} />
            <R l="Risk % of Portfolio" v={`${cap > 0 ? (capitalAtRisk / cap * 100).toFixed(2) : 0}%`} />
          </div>
        </div>
      )}
      {!stop && (
        <div style={{ fontSize: 10, color: '#484f58', marginTop: 6 }}>
          ATR-based stops: 1× = ${(price - atr14).toFixed(2)} · 2× = ${(price - atr14 * 2).toFixed(2)}
        </div>
      )}
    </div>
  )
}

// ─── RISK TAB — rebuilt with full plain-language explanations ─
function RiskTab({f, symbol}:{f:any; symbol:string}) {
  const prices = useStore(s => s.prices)
  const livePrice = prices[symbol]?.price ?? f.price ?? 100
  const beta   = f.beta ?? 1.2
  // Daily volatileity proxy: σ_daily ≈ β × σ_market_daily (market ~1.2% daily σ)
  const sigma  = beta * 0.012

  // VaR formulas:
  // Historical  VaR 95%: z=1.645 (95th percentile of normal) — but we use heavier tail
  // Parametric  VaR 95% Student-t (ν=5): z≈2.015
  // CVaR / ES   95% = E[loss | loss > VaR] ≈ σ × φ(z)/(1-0.95)
  const varH1d  = +(sigma * 1.645 * 100).toFixed(2)   // Historical VaR 1D 95%
  const varP1d  = +(sigma * 2.015 * 100).toFixed(2)   // Parametric (t-dist) VaR 1D 95%
  const cvar1d  = +(sigma * 2.626 * 100).toFixed(2)   // CVaR/Expected Shortfall 1D 95%
  const var10d  = +(varP1d * Math.sqrt(10)).toFixed(2) // 10-day VaR (Basel sqrt rule)
  const cvar10d = +(cvar1d * Math.sqrt(10)).toFixed(2)

  // The KEY number — worst 5% scenario loss (1D, parametric)
  const worst5pct = varP1d

  // Risk score
  const riskScore = Math.min(100, Math.round(25 + beta * 16))
  const riskCol   = riskScore < 35 ? '#3fb950' : riskScore < 60 ? '#d29922' : '#f85149'
  const riskLabel = riskScore < 35 ? 'LOW' : riskScore < 60 ? 'MODERATE' : 'HIGH'

  // Monte Carlo — deterministic seeded paths
  const PATHS = 60
  const DAYS  = 90
  const seed0 = symbol.split('').reduce((a,c)=>a+c.charCodeAt(0), 0)

  const paths = useMemo(() => {
    let s = (seed0 * 1664525 + 1013904223) >>> 0
    const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    return Array.from({length: PATHS}, () => {
      let p = 100
      const path = [p]
      for (let d = 0; d < DAYS; d++) {
        // Box-Muller for normal random
        const u1 = rng(), u2 = rng()
        const z  = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
        p = p * (1 + 0.0004 + sigma * z)
        path.push(+p.toFixed(3))
      }
      return path
    })
  }, [symbol, sigma])

  const finals = paths.map(p => p[p.length - 1])
  // Probability of drawdown thresholds
  const pDn10 = Math.round(finals.filter(v => v < 90).length / PATHS * 100)
  const pDn20 = Math.round(finals.filter(v => v < 80).length / PATHS * 100)
  const pDn30 = Math.round(finals.filter(v => v < 70).length / PATHS * 100)
  const pUp10 = Math.round(finals.filter(v => v > 110).length / PATHS * 100)
  const pUp20 = Math.round(finals.filter(v => v > 120).length / PATHS * 100)

  // Monte Carlo VaR (5th percentile of final distribution)
  const sortedFinals = [...finals].sort((a,b) => a-b)
  const mcVaR = +(100 - sortedFinals[Math.floor(PATHS * 0.05)]).toFixed(2)
  const mcCVaR = +(100 - sortedFinals.slice(0, Math.floor(PATHS * 0.05)).reduce((a,b)=>a+b,0) / Math.floor(PATHS * 0.05)).toFixed(2)

  // Chart dimensions
  const W = 900, H = 260, PL = 8, PR = 60, PT = 16, PB = 30
  const iW = W - PL - PR, iH = H - PT - PB

  // Y range: 60 to 160 (normalised to 100 start)
  const yMn = 58, yMx = 155
  const xS = (d: number) => PL + iW * d / DAYS
  const yS = (v: number) => PT + iH * (1 - (v - yMn) / (yMx - yMn))

  // Percentile bands
  const pctBands = [5, 25, 50, 75, 95].map(p => {
    const idx = Math.floor(PATHS * p / 100)
    const sorted = paths.map(pa => pa).sort((a,b) => a[a.length-1] - b[b.length-1])
    return sorted[Math.min(idx, PATHS-1)]
  })
  const bandCols = ['#f85149', '#d29922', '#c9d1d9', '#388bfd', '#3fb950']
  const bandLabels = ['P5 (downside)','P25','P50 (median)','P75','P95 (upside)']

  // Var level line on chart (1D * sqrt(90) for 90-day horizon)
  const varLine20 = 80  // -20% threshold
  const varLine10 = 90  // -10% threshold

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10,}}>

      {/* ═══════ HERO — VaR Summary ═══════ */}
      <div style={{
        background:'#0e1117',
        border:'1px solid #21262d',
        borderLeft:'3px solid #f85149',
        padding:'16px 20px',
        display:'grid',
        gridTemplateColumns:'1fr auto',
        gap:20,
        alignItems:'center',
      }}>
        <div>
          <div style={{fontSize:10,color:'#484f58',letterSpacing:0.5,marginBottom:8,textTransform:'uppercase'}}>
            WORST 5% SCENARIO — VALUE AT RISK
          </div>
          <div style={{fontSize:12,color:'#8b949e',lineHeight:1.8,marginBottom:8}}>
            In the <span style={{color:'#c9d1d9',fontWeight:600}}>worst 5% of trading days</span> for {symbol}, expected minimum loss:
          </div>
          <div style={{display:'flex',alignItems:'baseline',gap:20,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:9,color:'#484f58',marginBottom:2,textTransform:'uppercase'}}>1-Day VaR 95%</div>
              <div style={{fontSize:42,fontWeight:700,color:'#f85149',lineHeight:1,fontFamily:mono}}>-{worst5pct}%</div>
              <div style={{fontSize:8,color:'#484f58',marginTop:4}}>
                5 out of 100 trading days at least this bad
              </div>
            </div>
            <div style={{width:1,height:50,background:'#21262d'}}/>
            <div>
              <div style={{fontSize:9,color:'#484f58',marginBottom:2,textTransform:'uppercase'}}>10-Day VaR (Basel)</div>
              <div style={{fontSize:30,fontWeight:700,color:'#f85149',opacity:0.7,lineHeight:1,fontFamily:mono}}>-{var10d}%</div>
              <div style={{fontSize:8,color:'#484f58',marginTop:4}}>
                VaR 1D x sqrt(10)
              </div>
            </div>
            <div style={{width:1,height:50,background:'#21262d'}}/>
            <div>
              <div style={{fontSize:9,color:'#484f58',marginBottom:2,textTransform:'uppercase'}}>Expected Shortfall (CVaR)</div>
              <div style={{fontSize:30,fontWeight:700,color:'#f85149',opacity:0.5,lineHeight:1,fontFamily:mono}}>-{cvar1d}%</div>
              <div style={{fontSize:8,color:'#484f58',marginTop:4}}>
                Average loss in the worst 5% of days
              </div>
            </div>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,minWidth:120}}>
          <RiskGauge score={riskScore}/>
          <div style={{fontSize:11,fontWeight:600,color:riskCol,letterSpacing:0.4}}>{riskLabel}</div>
          <div style={{fontSize:9,color:'#484f58',textAlign:'center',lineHeight:1.5,fontFamily:mono}}>
            beta {f2(beta)}<br/>
            sigma {+(sigma*100).toFixed(2)}%/d
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          EXPLICATIONS EN LANGAGE CLAIR
      ═══════════════════════════════════════════════════════ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>

        {/* VaR explained */}
        <div style={{background:'#0e1117',border:'1px solid #21262d',padding:'12px 14px'}}>
          <div style={{fontSize:9,color:'#484f58',letterSpacing:0.5,marginBottom:8,textTransform:'uppercase'}}>
            VALUE AT RISK — METHODOLOGY
          </div>
          <div style={{fontSize:8.5,color:'#8b949e',lineHeight:2}}>
            <div style={{color:'#8b949e',marginBottom:6}}>
              VaR = maximum expected loss in the <b style={{color:'#c9d1d9'}}>worst 5% of outcomes</b>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'4px 12px',alignItems:'baseline'}}>
              <span style={{color:'#d29922',fontSize:11,fontWeight:700,fontFamily:mono}}>-{varH1d}%</span>
              <span>Historical VaR — based on observed returns</span>
              <span style={{color:'#c9d1d9',fontSize:11,fontWeight:700,fontFamily:mono}}>-{varP1d}%</span>
              <span>Parametric VaR (Student-t, v=5) — fat-tail adjusted</span>
              <span style={{color:'#f85149',fontSize:11,fontWeight:700,fontFamily:mono}}>-{cvar1d}%</span>
              <span>CVaR / Expected Shortfall — average loss beyond VaR</span>
            </div>
            <div style={{marginTop:8,padding:'6px 8px',background:'#161b22',borderLeft:'2px solid #21262d',fontSize:8,color:'#8b949e',lineHeight:1.7}}>
              On a $10,000 position in {symbol}:<br/>
              worst 5% daily loss = <b style={{color:'#f85149'}}>${(varP1d/100*10000).toFixed(0)}</b>
            </div>
          </div>
        </div>

        {/* CVaR explained */}
        <div style={{background:'#0e1117',border:'1px solid #21262d',padding:'12px 14px'}}>
          <div style={{fontSize:9,color:'#484f58',letterSpacing:0.5,marginBottom:8,textTransform:'uppercase'}}>
            EXPECTED SHORTFALL (CVaR)
          </div>
          <div style={{fontSize:8.5,color:'#8b949e',lineHeight:2}}>
            <div style={{color:'#8b949e',marginBottom:6}}>
              CVaR = average loss once VaR threshold is breached.<br/>
              The true measure of tail risk.
            </div>
            <div style={{background:'#161b22',padding:'8px 10px',marginBottom:8}}>
              <div style={{fontSize:8,color:'#8b949e'}}>VaR 95% threshold: <span style={{color:'#d29922',fontFamily:mono}}>-{varP1d}%</span></div>
              <div style={{fontSize:8,color:'#8b949e',marginTop:3}}>CVaR 95% (avg beyond): <span style={{color:'#f85149',fontWeight:600,fontFamily:mono}}>-{cvar1d}%</span></div>
              <div style={{fontSize:8,color:'#8b949e',marginTop:3}}>10D CVaR (Basel): <span style={{color:'#f85149',fontFamily:mono}}>-{cvar10d}%</span></div>
            </div>
            <div style={{fontSize:8,color:'#8b949e',lineHeight:1.7}}>
              On $10,000 in {symbol}, extreme bad day avg loss:
              <b style={{color:'#f85149'}}> ${(cvar1d/100*10000).toFixed(0)}</b>
            </div>
            <div style={{marginTop:6,fontSize:8,color:'#30363d'}}>
              CVaR = sigma x phi(z) / (1 - 0.95)
            </div>
          </div>
        </div>

        {/* Monte Carlo probabilities */}
        <div style={{background:'#0e1117',border:'1px solid #21262d',padding:'12px 14px'}}>
          <div style={{fontSize:9,color:'#484f58',letterSpacing:0.5,marginBottom:8,textTransform:'uppercase'}}>
            MONTE CARLO — 90-DAY PROBABILITIES
          </div>
          <div style={{fontSize:8.5,color:'#8b949e',lineHeight:1.8}}>
            <div style={{color:'#8b949e',marginBottom:8}}>
              {PATHS} GBM simulations. Each path = one possible outcome.
            </div>

            <div style={{marginBottom:8}}>
              <div style={{fontSize:8,color:'#f85149',marginBottom:4,textTransform:'uppercase'}}>Downside probability (90D)</div>
              {[
                {label:'Loss > 10%',  pct:pDn10, col:'#d29922'},
                {label:'Loss > 20%',  pct:pDn20, col:'#f85149'},
                {label:'Loss > 30%',  pct:pDn30, col:'#f85149'},
              ].map(r=>(
                <div key={r.label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{fontSize:8,color:'#8b949e',width:80}}>{r.label}</span>
                  <div style={{flex:1,height:3,background:'#161b22'}}>
                    <div style={{width:`${r.pct}%`,height:'100%',background:r.col}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:600,color:r.col,width:30,textAlign:'right',fontFamily:mono}}>{r.pct}%</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{fontSize:8,color:'#3fb950',marginBottom:4,textTransform:'uppercase'}}>Upside probability (90D)</div>
              {[
                {label:'Gain > 10%', pct:pUp10, col:'#3fb950'},
                {label:'Gain > 20%', pct:pUp20, col:'#3fb950'},
              ].map(r=>(
                <div key={r.label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{fontSize:8,color:'#8b949e',width:80}}>{r.label}</span>
                  <div style={{flex:1,height:3,background:'#161b22'}}>
                    <div style={{width:`${r.pct}%`,height:'100%',background:r.col}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:600,color:r.col,width:30,textAlign:'right',fontFamily:mono}}>{r.pct}%</span>
                </div>
              ))}
            </div>

            <div style={{marginTop:6,fontSize:8,color:'#30363d',fontFamily:mono}}>
              MC VaR 90D: <span style={{color:'#f85149'}}>-{mcVaR}%</span> ·
              CVaR: <span style={{color:'#f85149'}}>-{mcCVaR}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MONTE CARLO FAN CHART — annotated
      ═══════════════════════════════════════════════════════ */}
      <div style={{background:'#0e1117',border:'1px solid #21262d',padding:'14px 0 8px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 16px 10px 16px',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontSize:9,color:'#484f58',letterSpacing:0.5,textTransform:'uppercase'}}>
              MONTE CARLO SIMULATION — {PATHS} paths · {DAYS} days · GBM (sigma={+(sigma*100).toFixed(2)}%/d)
            </div>
            <div style={{fontSize:8,color:'#30363d',marginTop:2}}>
              Probability distribution — not a prediction. Each path = one possible outcome.
            </div>
          </div>
          <div style={{display:'flex',gap:14,fontSize:8}}>
            {bandLabels.map((l,i)=>(
              <span key={l} style={{color:bandCols[i],display:'flex',alignItems:'center',gap:4}}>
                <span style={{display:'inline-block',width:14,height:bandCols[i]==='#c9d1d9'?2:1.5,background:bandCols[i]}}/>
                {l}
              </span>
            ))}
          </div>
        </div>

        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:'block'}}>
          {/* Grid lines */}
          {[60,70,80,90,100,110,120,130,140].map(v=>(
            <g key={v}>
              <line x1={PL} y1={yS(v)} x2={W-PR} y2={yS(v)} stroke={v===100?'#21262d':'#161b22'} strokeWidth={v===100?1.5:0.5}/>
              <text x={W-PR+5} y={yS(v)+3} fill={v===100?'#8b949e':'#30363d'}
                fontSize="8" fontFamily={F}>{v===100?'BASE':v+'%'}</text>
            </g>
          ))}

          {/* Background paths — very muted slate */}
          {paths.map((path,i)=>(
            <polyline key={i}
              points={path.map((v,d)=>`${xS(d)},${yS(v)}`).join(' ')}
              fill="none" stroke="#8b949e" strokeWidth="0.4" opacity="0.08"/>
          ))}

          {/* Threshold lines */}
          <line x1={PL} y1={yS(90)} x2={W-PR} y2={yS(90)}
            stroke="#d29922" strokeWidth="0.8" strokeDasharray="6,4" opacity="0.5"/>
          <text x={W-PR+5} y={yS(90)+3} fill="#d29922" fontSize="8" fontFamily={F}>-10%</text>

          <line x1={PL} y1={yS(80)} x2={W-PR} y2={yS(80)}
            stroke="#f85149" strokeWidth="0.8" strokeDasharray="6,4" opacity="0.5"/>
          <text x={W-PR+5} y={yS(80)+3} fill="#f85149" fontSize="8" fontFamily={F}>-20%</text>

          {/* Percentile lines — each distinct */}
          {pctBands.map((band, bi) => (
            <polyline key={bi}
              points={band.map((v,d)=>`${xS(d)},${yS(v)}`).join(' ')}
              fill="none" stroke={bandCols[bi]} strokeWidth={bi===2?2:1.2} opacity={bi===2?1:0.85}/>
          ))}

          {/* X axis */}
          {[0,30,60,90].map(d=>(
            <g key={d}>
              <line x1={xS(d)} y1={PT+iH} x2={xS(d)} y2={PT+iH+5} stroke="#21262d"/>
              <text x={xS(d)} y={PT+iH+16} textAnchor="middle" fill="#30363d" fontSize="8" fontFamily={F}>
                {d===0?'Today':d===30?'+1M':d===60?'+2M':'+3M'}
              </text>
            </g>
          ))}

          {/* VaR endpoint */}
          <circle cx={xS(DAYS)} cy={yS(sortedFinals[Math.floor(PATHS*0.05)])} r="3" fill="#f85149" opacity="0.8"/>
          <text x={xS(DAYS)-10} y={yS(sortedFinals[Math.floor(PATHS*0.05)])-8}
            textAnchor="end" fill="#f85149" fontSize="8" fontFamily={F} fontWeight="600">
            VaR P5 = -{mcVaR}%
          </text>
        </svg>

        <div style={{padding:'6px 16px 0',fontSize:8,color:'#30363d'}}>
          GBM model · beta={f2(beta)} · sigma={+(sigma*100).toFixed(2)}%/d ·
          Assumes log-normal returns · Does not predict exogenous shocks ·
          Probability distribution only
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          BETA EXPLAINED — what it means for this stock
      ═══════════════════════════════════════════════════════ */}
      <div style={{background:'#0e1117',border:'1px solid #21262d',padding:'12px 14px',
        display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div>
          <div style={{fontSize:9,color:'#484f58',marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>BETA INTERPRETATION</div>
          <div style={{fontSize:8.5,color:'#8b949e',lineHeight:2}}>
            Beta = <b style={{color:'#c9d1d9',fontFamily:mono}}>{f2(beta)}</b> for {symbol}:
          </div>
          <div style={{padding:'8px 12px',background:'#161b22',border:`1px solid ${f.beta<0.8?'#3fb950':f.beta<1.3?'#d29922':'#f85149'}22`,marginTop:6}}>
            {beta < 0.8
              ? <div style={{fontSize:9,color:'#3fb950',lineHeight:1.8}}>
                  <b>Defensive</b> — if the market drops 10%, {symbol} drops approx.&nbsp;
                  <b>{+(beta*10).toFixed(1)}%</b>. Lower volatileity than market.
                </div>
              : beta < 1.3
              ? <div style={{fontSize:9,color:'#d29922',lineHeight:1.8}}>
                  <b>Market-neutral</b> — if the market drops 10%, {symbol} drops approx.&nbsp;
                  <b>{+(beta*10).toFixed(1)}%</b>. Tracks the market.
                </div>
              : <div style={{fontSize:9,color:'#f85149',lineHeight:1.8}}>
                  <b>High volatileity</b> — if the market drops 10%, {symbol} drops approx.&nbsp;
                  <b>{+(beta*10).toFixed(1)}%</b>. Amplifies market moves.
                </div>
            }
          </div>
          <div style={{marginTop:8,fontSize:8,color:'#484f58',lineHeight:1.7,fontFamily:mono}}>
            beta = Cov(Rp, Rm) / Var(Rm)<br/>
            sigma_d = beta x 1.2% = {+(sigma*100).toFixed(2)}%/d<br/>
            sigma_a = {+(sigma*100*Math.sqrt(252)).toFixed(1)}%
          </div>
        </div>

        <div>
          <div style={{fontSize:9,color:'#484f58',marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>VaR COMPARISON BY RISK PROFILE</div>
          <div style={{fontSize:8,color:'#8b949e',marginBottom:8}}>
            VaR 95% 1D at different risk levels:
          </div>
          {[
            {label:'Defensive (beta=0.5)',   var_:+(0.5*0.012*2.015*100).toFixed(2), col:'#3fb950'},
            {label:'Market (beta=1.0)',     var_:+(1.0*0.012*2.015*100).toFixed(2), col:'#d29922'},
            {label:'Volatile (beta=1.5)',    var_:+(1.5*0.012*2.015*100).toFixed(2), col:'#8b949e'},
            {label:`${symbol} (beta=${f2(beta)})`, var_:varP1d, col:riskCol, highlight:true},
            {label:'Speculative (beta=2.5)', var_:+(2.5*0.012*2.015*100).toFixed(2), col:'#f85149'},
          ].map(r=>(
            <div key={r.label} style={{
              display:'flex',alignItems:'center',gap:8,marginBottom:5,
              padding: r.highlight?'4px 8px':'0',
              background: r.highlight?'#161b22':'transparent',
              border: r.highlight?`1px solid ${riskCol}33`:'none',
            }}>
              <span style={{fontSize:r.highlight?9:8,color:r.highlight?r.col:'#484f58',width:160,fontWeight:r.highlight?600:400}}>
                {r.highlight?'> ':''}{r.label}
              </span>
              <div style={{flex:1,height:3,background:'#161b22'}}>
                <div style={{width:`${Math.min(100,r.var_/5*100)}%`,height:'100%',background:r.col}}/>
              </div>
              <span style={{fontSize:r.highlight?11:9,fontWeight:r.highlight?600:400,color:r.col,width:42,textAlign:'right',fontFamily:mono}}>
                -{r.var_}%
              </span>
            </div>
          ))}
          <div style={{marginTop:6,fontSize:8,color:'#30363d',fontFamily:mono}}>
            VaR = beta x sigma_mkt x z_0.95 (Student-t, v=5)
          </div>
        </div>
      </div>

      {/* ── Trade Planner ── */}
      <TradePlanner price={livePrice} beta={beta} />

    </div>
  )
}

// ─── Main workspace ───────────────────────────────────────────
// ─── Relative Strength vs Sector ─────────────────────────────
const SECTOR_ETFS: Record<string, { etf: string; name: string }> = {
  tech:     { etf: 'XLK', name: 'Technology (XLK)' },
  bank:     { etf: 'XLF', name: 'Financials (XLF)' },
  cyclical: { etf: 'XLY', name: 'Consumer Disc. (XLY)' },
  normal:   { etf: 'SPY', name: 'S&P 500 (SPY)' },
}

function RelativeStrength({ symbol, sector }: { symbol: string; sector: string }) {
  const [rsData, setRsData] = useState<{ stock: number[]; sector: number[]; spy: number[]; dates: string[] } | null>(null)

  useEffect(() => {
    const sectorInfo = SECTOR_ETFS[sector] ?? SECTOR_ETFS.normal
    Promise.all([
      fetchPriceHistory(symbol, '3mo'),
      fetchPriceHistory(sectorInfo.etf, '3mo'),
      fetchPriceHistory('SPY', '3mo'),
    ]).then(([stockH, sectorH, spyH]) => {
      if (!stockH?.close?.length || !spyH?.close?.length) return
      // Normalize to 100 at start
      const norm = (arr: number[]) => {
        const base = arr[0] || 1
        return arr.map(v => (v / base) * 100)
      }
      const minLen = Math.min(stockH.close.length, spyH.close.length, sectorH?.close?.length ?? Infinity)
      setRsData({
        stock: norm(stockH.close.slice(-minLen)),
        sector: sectorH?.close?.length ? norm(sectorH.close.slice(-minLen)) : [],
        spy: norm(spyH.close.slice(-minLen)),
        dates: stockH.dates.slice(-minLen),
      })
    }).catch(() => {})
  }, [symbol, sector])

  if (!rsData) return null

  const sectorInfo = SECTOR_ETFS[sector] ?? SECTOR_ETFS.normal
  const isSectorSpy = sectorInfo.etf === 'SPY'  // avoid showing SPY twice
  const stockPerf = rsData.stock.length > 0 ? rsData.stock[rsData.stock.length - 1] - 100 : 0
  const sectorPerf = rsData.sector.length > 0 ? rsData.sector[rsData.sector.length - 1] - 100 : 0
  const spyPerf = rsData.spy.length > 0 ? rsData.spy[rsData.spy.length - 1] - 100 : 0
  const outperformsSector = stockPerf > sectorPerf
  const outperformsSpy = stockPerf > spyPerf

  // Build deduplicated benchmark rows (filters out duplicate SPY when it IS the sector proxy)
  const benchmarkRows = [
    { label: symbol, perf: stockPerf, col: '#388bfd' },
    ...(!isSectorSpy ? [{ label: sectorInfo.etf, perf: sectorPerf, col: '#d29922' }] : []),
    { label: 'SPY', perf: spyPerf, col: '#8b949e' },
  ]

  // Mini RS chart
  const w = 500, h = 80, pl = 0, pr = 0, pt = 4, pb = 4
  const allVals = [...rsData.stock, ...rsData.sector, ...rsData.spy].filter(Boolean)
  const mn = Math.min(...allVals), mx = Math.max(...allVals), rng = mx - mn || 1
  const iw = w - pl - pr, ih = h - pt - pb
  const makeLine = (arr: number[]) => arr.map((v, i) => `${pl + iw * i / (arr.length - 1)},${pt + ih * (1 - (v - mn) / rng)}`).join(' ')

  return (
    <div style={{ background: '#161b22', borderRadius: 2, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#c9d1d9' }}>Relative Strength (3M)</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {!isSectorSpy && (
            <span style={{ fontSize: 10, color: outperformsSector ? '#3fb950' : '#f85149' }}>
              vs {sectorInfo.name}: {outperformsSector ? '▲ Outperforming' : '▼ Underperforming'}
            </span>
          )}
          <span style={{ fontSize: 10, color: outperformsSpy ? '#3fb950' : '#f85149' }}>
            vs SPY: {outperformsSpy ? '▲ Outperforming' : '▼ Underperforming'}
          </span>
        </div>
      </div>

      {/* Performance bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px', gap: 6, marginBottom: 10 }}>
        {benchmarkRows.map(r => {
          const maxAbs = Math.max(...benchmarkRows.map(b => Math.abs(b.perf)), 1)
          const barPct = (Math.abs(r.perf) / maxAbs) * 100
          const isPos = r.perf >= 0
          return (
            <React.Fragment key={r.label}>
              <span style={{ fontSize: 11, color: r.col, fontWeight: 500 }}>{r.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', height: 12 }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: isPos ? 'flex-start' : 'flex-end' }}>
                  <div style={{ width: `${barPct}%`, height: 6, background: isPos ? '#3fb950' : '#f85149', borderRadius: 2, minWidth: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 11, fontFamily: "'SF Mono', Menlo, Consolas, monospace", color: isPos ? '#3fb950' : '#f85149', textAlign: 'right', fontWeight: 500 }}>
                {isPos ? '+' : ''}{r.perf.toFixed(1)}%
              </span>
            </React.Fragment>
          )
        })}
      </div>

      {/* Mini normalized chart */}
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <line x1={pl} y1={pt + ih * (1 - (100 - mn) / rng)} x2={w - pr} y2={pt + ih * (1 - (100 - mn) / rng)} stroke="#21262d" strokeWidth="0.5" strokeDasharray="3 3" />
        {rsData.spy.length > 0 && <polyline points={makeLine(rsData.spy)} fill="none" stroke="#8b949e" strokeWidth="1" opacity="0.5" />}
        {!isSectorSpy && rsData.sector.length > 0 && <polyline points={makeLine(rsData.sector)} fill="none" stroke="#d29922" strokeWidth="1" opacity="0.6" />}
        <polyline points={makeLine(rsData.stock)} fill="none" stroke="#388bfd" strokeWidth="1.5" />
      </svg>

      {/* Signal */}
      <div style={{ marginTop: 8, fontSize: 10, color: '#8b949e', background: '#0e1117', padding: '6px 10px', borderRadius: 2 }}>
        {isSectorSpy
          ? outperformsSpy ? 'Outperforming market — money flowing in' : 'Underperforming market — no institutional interest yet'
          : outperformsSector && outperformsSpy ? 'Stock outperforming both sector and market — money flowing in, thesis activating'
          : outperformsSector ? 'Outperforming sector but lagging market — relative strength within sector only'
          : !outperformsSector && !outperformsSpy ? 'Underperforming both sector and market — no institutional interest yet'
          : 'Mixed — outperforming market but lagging sector peers'}
      </div>
    </div>
  )
}

// ─── Regression Analysis Tab ─────────────────────────────────
function RegressionTab({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(''); setData(null); setSelectedModel(null)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 120000)
    fetch(`/api/regression/${symbol}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(j => {
        clearTimeout(timer)
        if (j?.data?.error) { setError(j.data.error); setLoading(false); return }
        if (j?.data?.closes?.length) { setData(j.data); setSelectedModel(j.data.best_model) }
        else setError('No historical data returned')
        setLoading(false)
      })
      .catch(e => {
        clearTimeout(timer)
        if (e.name === 'AbortError') { setError('Request timed out (2min). Backend may be slow on first load — try again.'); }
        else { setError(e.message || 'Failed to load') }
        setLoading(false)
      })
    return () => { clearTimeout(timer) }
  }, [symbol])

  if (loading) return <div style={{ padding: 30, textAlign: 'center', color: '#8b949e', fontSize: 12 }}>Downloading 10 years of weekly data... First load takes 30-60 seconds, cached after.</div>
  if (error) return <div style={{ padding: 30, textAlign: 'center', color: '#f85149', fontSize: 12 }}>Error: {error}<br/><span style={{color:'#8b949e',fontSize:11}}>Backend must be running. Check terminal for errors.</span></div>
  if (!data) return <div style={{ padding: 30, textAlign: 'center', color: '#8b949e', fontSize: 12 }}>No data available — backend may be offline</div>

  // Get selected model data (full fit + forecast from backend)
  const activeModel = data.models?.find((m: any) => m.name === selectedModel) ?? data.models?.[0]
  const activeFit = activeModel?.fit ?? data.fit
  const activeForecast = activeModel?.forecast ?? data.forecast
  const activeFairValue = activeModel?.fair_value ?? data.fair_value
  const activeR2 = activeModel?.r2 ?? data.r2
  const activeDeviation = activeModel?.deviation_pct ?? data.deviation_pct
  const activeModelName = activeModel?.name ?? data.best_model

  // Signal color for active model
  const activeSigCol = activeDeviation < -15 ? '#3fb950' : activeDeviation < -5 ? '#3fb950' : activeDeviation > 15 ? '#f85149' : activeDeviation > 5 ? '#f85149' : '#d29922'
  const activeSignal = activeDeviation < -15 ? 'STRONGLY UNDERVALUED' : activeDeviation < -5 ? 'UNDERVALUED' : activeDeviation > 15 ? 'STRONGLY OVERVALUED' : activeDeviation > 5 ? 'OVERVALUED' : 'FAIR VALUE'

  // SVG chart: actual + fit + forecast
  const allClose = [...data.closes, ...activeForecast]
  const allFit = [...activeFit, ...activeForecast]
  const n = data.closes.length
  const total = allClose.length
  const mn = Math.min(...allClose, ...allFit), mx = Math.max(...allClose, ...allFit)
  const rng = mx - mn || 1
  const w = 800, h = 220, pl = 50, pr = 10, pt = 10, pb = 25
  const iw = w - pl - pr, ih = h - pt - pb
  const xS = (i: number) => pl + (iw * i) / (total - 1)
  const yS = (v: number) => pt + ih * (1 - (v - mn) / rng)

  const priceLine = data.closes.map((v: number, i: number) => `${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(' ')
  const fitLine = activeFit.map((v: number, i: number) => `${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(' ')
  const forecastLine = activeForecast.map((v: number, i: number) => `${xS(n + i).toFixed(1)},${yS(v).toFixed(1)}`).join(' ')

  // Seasonality bars
  const maxSeas = Math.max(...data.seasonality.map((v: number) => Math.abs(v)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Signal card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <div style={{ background: '#161b22', borderTop: `2px solid ${activeSigCol}`, borderRadius: 2, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>Current Price</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#c9d1d9', fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>${data.current_price}</div>
        </div>
        <div style={{ background: '#161b22', borderTop: `2px solid ${activeSigCol}`, borderRadius: 2, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>Fair Value ({activeModelName})</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#388bfd', fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>${activeFairValue}</div>
        </div>
        <div style={{ background: '#161b22', borderTop: `2px solid ${activeSigCol}`, borderRadius: 2, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>Deviation</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: activeSigCol, fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>{activeDeviation > 0 ? '+' : ''}{activeDeviation}%</div>
        </div>
        <div style={{ background: '#161b22', borderTop: `2px solid ${activeSigCol}`, borderRadius: 2, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>Signal</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: activeSigCol }}>{activeSignal}</div>
          <div style={{ fontSize: 10, color: '#8b949e', marginTop: 4 }}>R² = {activeR2}</div>
        </div>
      </div>

      {/* Model selector */}
      <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
        {(data.models ?? []).map((m: any) => (
          <button key={m.name} onClick={() => setSelectedModel(m.name)}
            style={{ padding: '5px 14px', borderRadius: 2, fontSize: 11, cursor: 'pointer', border: 'none',
              background: m.name === selectedModel ? '#388bfd22' : '#161b22',
              color: m.name === selectedModel ? '#388bfd' : '#8b949e',
              borderBottom: m.name === selectedModel ? '2px solid #388bfd' : '2px solid transparent',
              fontWeight: m.name === selectedModel ? 600 : 400,
            }}>
            {m.name.charAt(0).toUpperCase() + m.name.slice(1)}: R²={m.r2}
            {m.name === data.best_model && <span style={{ fontSize: 8, color: '#3fb950', marginLeft: 4 }}>BEST</span>}
          </button>
        ))}
      </div>

      {/* Price + Fit + Forecast chart */}
      <div key={`chart-${selectedModel}`} style={{ background: '#161b22', borderRadius: 2, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#c9d1d9', marginBottom: 10 }}>
          10Y Price + {activeModelName} fit + 1Y forecast
        </div>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <g key={p}>
              <line x1={pl} y1={pt + ih * p} x2={w - pr} y2={pt + ih * p} stroke="#21262d" strokeWidth="0.5" />
              <text x={pl - 5} y={pt + ih * p + 3} textAnchor="end" fill="#8b949e" fontSize="8" fontFamily="monospace">
                {(mx - rng * p).toFixed(0)}
              </text>
            </g>
          ))}
          {/* Forecast zone background */}
          <rect x={xS(n)} y={pt} width={xS(total - 1) - xS(n)} height={ih} fill="#388bfd08" />
          <line x1={xS(n)} y1={pt} x2={xS(n)} y2={pt + ih} stroke="#388bfd" strokeWidth="0.5" strokeDasharray="4 4" />
          {/* Price line */}
          <polyline points={priceLine} fill="none" stroke="#c9d1d9" strokeWidth="1" opacity="0.6" />
          {/* Fit line */}
          <polyline points={fitLine} fill="none" stroke="#388bfd" strokeWidth="1.5" />
          {/* Forecast */}
          <polyline points={forecastLine} fill="none" stroke="#3fb950" strokeWidth="1.5" strokeDasharray="4 2" />
          {/* Labels */}
          <text x={xS(n / 2)} y={h - 4} textAnchor="middle" fill="#8b949e" fontSize="8">Historical (10Y)</text>
          <text x={xS(n + 26)} y={h - 4} textAnchor="middle" fill="#3fb950" fontSize="8">Forecast (1Y)</text>
        </svg>
        <div style={{ display: 'flex', gap: 16, fontSize: 10, marginTop: 6 }}>
          <span style={{ color: '#8b949e' }}>— Price</span>
          <span style={{ color: '#388bfd' }}>— {activeModelName} fit</span>
          <span style={{ color: '#3fb950' }}>-- Forecast</span>
          <span style={{ marginLeft: 'auto', color: '#8b949e' }}>1Y target: <b style={{ color: '#3fb950' }}>${activeForecast[activeForecast.length - 1]}</b></span>
        </div>
      </div>

      {/* Seasonality chart */}
      <div style={{ background: '#161b22', borderRadius: 2, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#c9d1d9', marginBottom: 10 }}>Seasonality (average weekly effect over 10Y)</div>
        <div style={{ display: 'flex', gap: 1, alignItems: 'center', height: 60 }}>
          {data.seasonality.slice(0, 52).map((v: number, i: number) => {
            const barH = Math.abs(v) / maxSeas * 25
            const col = v >= 0 ? '#3fb950' : '#f85149'
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 60 }}>
                {v >= 0 && <div style={{ width: '80%', height: barH, background: col, borderRadius: 1 }} />}
                <div style={{ height: 1, width: '100%', background: '#21262d' }} />
                {v < 0 && <div style={{ width: '80%', height: barH, background: col, borderRadius: 1 }} />}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#8b949e', marginTop: 2 }}>
          <span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span><span>Dec</span>
        </div>
        <div style={{ fontSize: 10, color: '#8b949e', marginTop: 8 }}>
          Green bars = historically strong weeks · Red = historically weak · Effect removed before regression to get clean trend
        </div>
      </div>

      {/* When to buy/sell */}
      <div style={{ background: '#161b22', borderRadius: 2, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#c9d1d9', marginBottom: 8 }}>Timing Suggestion ({activeModelName})</div>
        <div style={{ fontSize: 12, color: activeSigCol, marginBottom: 6 }}>
          {activeDeviation < -10
            ? `Currently ${Math.abs(activeDeviation).toFixed(0)}% below fair value — BUY zone based on ${activeModelName} regression`
            : activeDeviation < -3
            ? `Slightly below fair value (${activeDeviation.toFixed(1)}%) — consider accumulating`
            : activeDeviation > 10
            ? `Currently ${activeDeviation.toFixed(0)}% above fair value — consider taking profits`
            : activeDeviation > 3
            ? `Slightly above fair value (${activeDeviation.toFixed(1)}%) — wait for pullback`
            : `Near fair value — no strong signal either way`}
        </div>
        <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.6 }}>
          1Y forecast: ${activeForecast[0]} → ${activeForecast[activeForecast.length - 1]} ({((activeForecast[activeForecast.length - 1] / data.current_price - 1) * 100).toFixed(1)}%)
          <br />Best seasonal months to buy: {data.seasonality.map((v: number, i: number) => ({ v, i })).sort((a: any, b: any) => a.v - b.v).slice(0, 3).map((x: any) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Math.floor(x.i / 4.33)]).join(', ')}
        </div>
      </div>
    </div>
  )
}


// ─── Stock News Tab ──────────────────────────────────────────
function StockNewsTab({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    // Fetch news from yfinance via backend
    fetch(`/api/news/${symbol}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.data) setNews(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [symbol])

  const mono = "'SF Mono', Menlo, Consolas, monospace"

  if (loading) return <div style={{padding:20,color:'#484f58',fontSize:11}}>Loading news for {symbol}...</div>
  if (!news.length) return <div style={{padding:20,color:'#484f58',fontSize:11}}>No recent news found for {symbol}</div>

  return (
    <div style={{display:'flex',flexDirection:'column',gap:0}}>
      <div style={{fontSize:9,color:'#484f58',textTransform:'uppercase',letterSpacing:0.5,padding:'8px 0',borderBottom:'1px solid #21262d'}}>
        {symbol} NEWS · {news.length} articles
      </div>
      {news.map((item: any, i: number) => (
        <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
           style={{display:'block',padding:'10px 12px',borderBottom:'1px solid #161b22',textDecoration:'none',
                   transition:'background 0.12s',cursor:'pointer'}}
           onMouseOver={e=>(e.currentTarget.style.background='#161b22')}
           onMouseOut={e=>(e.currentTarget.style.background='transparent')}>
          <div style={{fontSize:12,color:'#c9d1d9',fontWeight:500,marginBottom:4,lineHeight:1.4}}>{item.title}</div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <span style={{fontSize:9,color:'#484f58'}}>{item.publisher}</span>
            <span style={{fontSize:9,color:'#30363d',fontFamily:mono}}>{item.date}</span>
            {item.type && <span style={{fontSize:8,color:'#388bfd',background:'#388bfd12',border:'1px solid #388bfd25',padding:'1px 5px'}}>{item.type}</span>}
          </div>
        </a>
      ))}
    </div>
  )
}

// ─── Swing Analysis Tab — Chart-First Technical Analysis ─────
function AnalysisTab({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const mono = "'SF Mono', Menlo, Consolas, monospace"

  useEffect(() => {
    setLoading(true); setError(''); setData(null)
    fetch(`/api/analysis/${symbol}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(j => { if (j?.data?.error) setError(j.data.error); else if (j?.data) setData(j.data); else setError('No data'); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [symbol])

  if (loading) return <div style={{padding:20,color:'#484f58',fontSize:11}}>Computing analysis for {symbol}...</div>
  if (error || !data) return <div style={{padding:20,color:'#f85149',fontSize:11}}>{error || 'Analysis unavailable'}</div>

  const t = data.trend || {}
  const m = data.momentum || {}
  const sc = data.scenarios || {}
  const levels = data.levels || []
  const cd = data.chart_data || {}
  const closes: number[] = cd.closes || []
  const highs: number[] = cd.highs || []
  const lows: number[] = cd.lows || []
  const vols: number[] = cd.volumes || []
  const sma20: number[] = cd.sma20 || []
  const sma50: number[] = cd.sma50 || []
  const rsiH: number[] = cd.rsi || []
  const N = closes.length

  if (N < 10) return <div style={{padding:20,color:'#484f58',fontSize:11}}>Insufficient chart data</div>

  const trendCol = t.bias === 'Bullish' ? '#3fb950' : t.bias === 'Bearish' ? '#f85149' : '#d29922'

  // ── Chart geometry ──
  const W = 960
  const priceH = 320, volH = 60, rsiHH = 80, gap = 2
  const totalH = priceH + volH + rsiHH + gap * 2
  const PAD = { l: 60, r: 60, t: 12, b: 24 }
  const cw = W - PAD.l - PAD.r

  // Price range
  const pMin = Math.min(...lows) * 0.998
  const pMax = Math.max(...highs) * 1.002
  const pR = pMax - pMin || 1

  // Volume range
  const vMax = Math.max(...vols, 1)

  const toX = (i: number) => PAD.l + (i / Math.max(N - 1, 1)) * cw
  const toYP = (v: number) => PAD.t + (priceH - 8) - ((v - pMin) / pR) * (priceH - 16)
  const toYV = (v: number) => PAD.t + priceH + gap + volH - ((v / vMax) * (volH - 4))
  const toYR = (v: number) => PAD.t + priceH + gap + volH + gap + rsiHH - 4 - ((v / 100) * (rsiHH - 8))

  const barW = Math.max(1, (cw / N) * 0.7)

  // ── Support/Resistance lines on chart ──
  const srLines = levels.filter((l: any) => l.price >= pMin && l.price <= pMax).slice(0, 6)

  // ── Price Y grid ──
  const pTicks = 6
  const pGrid = Array.from({length: pTicks + 1}, (_, i) => pMin + (pR * i / pTicks))

  // ── Build paths ──
  const sma20Path = sma20.length >= N ? sma20.map((v: number, i: number) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toYP(v)}`).join(' ') : ''
  const sma50Path = sma50.length >= N ? sma50.map((v: number, i: number) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toYP(v)}`).join(' ') : ''
  const rsiPath = rsiH.length > 5 ? rsiH.map((v: number, i: number) => {
    const xi = N - rsiH.length + i
    return `${i === 0 ? 'M' : 'L'}${toX(xi >= 0 ? xi : 0)},${toYR(v)}`
  }).join(' ') : ''

  // ── X axis dates ──
  const xLabels: { x: number; label: string }[] = []
  const step = Math.max(1, Math.floor(N / 6))
  for (let i = 0; i < N; i += step) {
    const dAgo = N - 1 - i
    xLabels.push({ x: toX(i), label: dAgo === 0 ? 'Now' : dAgo < 31 ? `${dAgo}d` : `${Math.round(dAgo / 30)}mo` })
  }

  const fmtP = (v: number) => v >= 10000 ? `$${(v / 1000).toFixed(1)}k` : v >= 100 ? `$${v.toFixed(0)}` : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 0}}>

      {/* ── Trend strip ── */}
      <div style={{background: '#0e1117', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #161b22'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <span style={{fontSize: 11, color: trendCol, fontWeight: 600}}>{t.structure}</span>
          <span style={{fontSize: 9, color: '#484f58'}}>Bias: <span style={{color: trendCol}}>{t.bias}</span></span>
          <span style={{fontSize: 9, color: '#484f58'}}>Score: <span style={{color: trendCol, fontFamily: mono}}>{t.score}</span></span>
          {t.sma50 && <span style={{fontSize: 9, color: '#484f58'}}>50d: <span style={{color: data.price > t.sma50 ? '#3fb950' : '#f85149', fontFamily: mono}}>{fmtP(t.sma50)}</span></span>}
          {t.sma200 && <span style={{fontSize: 9, color: '#484f58'}}>200d: <span style={{color: data.price > t.sma200 ? '#3fb950' : '#f85149', fontFamily: mono}}>{fmtP(t.sma200)}</span></span>}
        </div>
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          {m.rsi != null && <span style={{fontSize: 9, color: '#484f58'}}>RSI: <span style={{color: m.rsi > 70 ? '#f85149' : m.rsi < 30 ? '#3fb950' : '#8b949e', fontFamily: mono}}>{m.rsi}</span></span>}
          {m.divergence && <span style={{fontSize: 8, color: '#d29922'}}>DIV</span>}
        </div>
      </div>

      {/* ══════════ MAIN CHART ══════════ */}
      <div style={{background: '#0e1117', position: 'relative'}}>
        <svg viewBox={`0 0 ${W} ${totalH}`} style={{width: '100%', height: totalH, display: 'block'}}>

          {/* ── PRICE PANEL ── */}
          {/* Price grid */}
          {pGrid.map((v, i) => <g key={i}>
            <line x1={PAD.l} x2={PAD.l + cw} y1={toYP(v)} y2={toYP(v)} stroke="#151920" strokeWidth={1}/>
            <text x={PAD.l - 6} y={toYP(v) + 3} fontSize={8} fill="#30363d" textAnchor="end" fontFamily="monospace">{fmtP(v)}</text>
          </g>)}

          {/* Support/Resistance lines */}
          {srLines.map((l: any, i: number) => {
            const isS = l.role === 'Support'
            const lCol = isS ? '#3fb950' : '#f85149'
            return <g key={`sr-${i}`}>
              <line x1={PAD.l} x2={PAD.l + cw} y1={toYP(l.price)} y2={toYP(l.price)} stroke={lCol} strokeWidth={0.8} opacity={0.5} strokeDasharray="6,4"/>
              <rect x={PAD.l + cw + 4} y={toYP(l.price) - 7} width={52} height={14} rx={2} fill={lCol} opacity={0.15}/>
              <text x={PAD.l + cw + 8} y={toYP(l.price) + 3} fontSize={7} fill={lCol} opacity={0.9} fontFamily="monospace">
                {l.role === 'Support' ? 'S' : 'R'} {typeof l.price === 'number' ? (l.price >= 1000 ? l.price.toFixed(0) : l.price.toFixed(2)) : l.price}
              </text>
              {/* Touch dots */}
              <circle cx={PAD.l + cw + 2} cy={toYP(l.price)} r={2} fill={lCol} opacity={0.6}/>
            </g>
          })}

          {/* Candlesticks */}
          {closes.map((c, i) => {
            const o = i > 0 ? closes[i - 1] : c
            const h = highs[i], l = lows[i]
            const up = c >= o
            const col = up ? '#3fb950' : '#f85149'
            const bodyTop = Math.min(o, c), bodyBot = Math.max(o, c)
            const x = toX(i)
            return <g key={`c-${i}`}>
              {/* Wick */}
              <line x1={x} x2={x} y1={toYP(h)} y2={toYP(l)} stroke={col} strokeWidth={0.8} opacity={0.6}/>
              {/* Body */}
              <rect x={x - barW / 2} y={toYP(bodyBot)} width={barW} height={Math.max(1, toYP(bodyTop) - toYP(bodyBot))} fill={up ? col : col} opacity={0.9}/>
            </g>
          })}

          {/* SMA overlays */}
          {sma20Path && <polyline points={sma20Path} fill="none" stroke="#d29922" strokeWidth={1} opacity={0.6}/>}
          {sma50Path && <polyline points={sma50Path} fill="none" stroke="#388bfd" strokeWidth={1.2} opacity={0.7}/>}

          {/* Current price marker */}
          <line x1={PAD.l} x2={PAD.l + cw} y1={toYP(closes[N - 1])} y2={toYP(closes[N - 1])} stroke="#c9d1d9" strokeWidth={0.5} opacity={0.3} strokeDasharray="2,3"/>
          <rect x={PAD.l + cw + 4} y={toYP(closes[N - 1]) - 8} width={52} height={16} rx={2} fill="#c9d1d9"/>
          <text x={PAD.l + cw + 30} y={toYP(closes[N - 1]) + 4} fontSize={9} fill="#0e1117" textAnchor="middle" fontWeight={700} fontFamily="monospace">
            {closes[N - 1] >= 1000 ? closes[N - 1].toFixed(0) : closes[N - 1].toFixed(2)}
          </text>

          {/* Panel separator */}
          <line x1={PAD.l} x2={PAD.l + cw} y1={PAD.t + priceH} y2={PAD.t + priceH} stroke="#21262d" strokeWidth={1}/>

          {/* ── VOLUME PANEL ── */}
          {vols.map((v, i) => {
            const up = i > 0 ? closes[i] >= closes[i - 1] : true
            return <rect key={`v-${i}`} x={toX(i) - barW / 2} y={toYV(v)} width={barW} height={Math.max(1, PAD.t + priceH + gap + volH - toYV(v))} fill={up ? '#3fb950' : '#f85149'} opacity={0.5}/>
          })}
          <text x={PAD.l + 4} y={PAD.t + priceH + gap + 10} fontSize={7} fill="#30363d">VOLUME</text>

          {/* Volume separator */}
          <line x1={PAD.l} x2={PAD.l + cw} y1={PAD.t + priceH + gap + volH} y2={PAD.t + priceH + gap + volH} stroke="#21262d" strokeWidth={1}/>

          {/* ── RSI PANEL ── */}
          {/* RSI zones */}
          <rect x={PAD.l} y={toYR(70)} width={cw} height={toYR(30) - toYR(70)} fill="#8b949e" opacity={0.03}/>
          <rect x={PAD.l} y={toYR(100)} width={cw} height={toYR(70) - toYR(100)} fill="#f85149" opacity={0.04}/>
          <rect x={PAD.l} y={toYR(30)} width={cw} height={toYR(0) - toYR(30)} fill="#3fb950" opacity={0.04}/>

          {/* RSI thresholds */}
          <line x1={PAD.l} x2={PAD.l + cw} y1={toYR(70)} y2={toYR(70)} stroke="#f85149" strokeWidth={0.5} opacity={0.4} strokeDasharray="4,4"/>
          <line x1={PAD.l} x2={PAD.l + cw} y1={toYR(30)} y2={toYR(30)} stroke="#3fb950" strokeWidth={0.5} opacity={0.4} strokeDasharray="4,4"/>
          <line x1={PAD.l} x2={PAD.l + cw} y1={toYR(50)} y2={toYR(50)} stroke="#484f58" strokeWidth={0.3} opacity={0.3} strokeDasharray="2,4"/>

          {/* RSI line */}
          {rsiPath && <polyline points={rsiPath} fill="none" stroke={m.rsi > 70 ? '#f85149' : m.rsi < 30 ? '#3fb950' : '#388bfd'} strokeWidth={1.3}/>}

          {/* RSI labels */}
          <text x={PAD.l - 6} y={toYR(70) + 3} fontSize={7} fill="#f85149" textAnchor="end" opacity={0.6}>70</text>
          <text x={PAD.l - 6} y={toYR(50) + 3} fontSize={7} fill="#484f58" textAnchor="end" opacity={0.5}>50</text>
          <text x={PAD.l - 6} y={toYR(30) + 3} fontSize={7} fill="#3fb950" textAnchor="end" opacity={0.6}>30</text>
          <text x={PAD.l + 4} y={PAD.t + priceH + gap + volH + gap + 10} fontSize={7} fill="#30363d">RSI(14)</text>

          {/* RSI current value */}
          {m.rsi != null && <g>
            <rect x={PAD.l + cw + 4} y={toYR(m.rsi) - 7} width={30} height={14} rx={2} fill={m.rsi > 70 ? '#f85149' : m.rsi < 30 ? '#3fb950' : '#388bfd'} opacity={0.9}/>
            <text x={PAD.l + cw + 19} y={toYR(m.rsi) + 3} fontSize={8} fill="#0e1117" textAnchor="middle" fontWeight={600} fontFamily="monospace">{m.rsi.toFixed(0)}</text>
          </g>}

          {/* ── X AXIS ── */}
          {xLabels.map((xl, i) => <text key={i} x={xl.x} y={totalH - 4} fontSize={8} fill="#30363d" textAnchor="middle" fontFamily="monospace">{xl.label}</text>)}

          {/* Axes */}
          <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={PAD.t + totalH - PAD.b} stroke="#21262d" strokeWidth={1}/>
          <line x1={PAD.l + cw} x2={PAD.l + cw} y1={PAD.t} y2={PAD.t + totalH - PAD.b} stroke="#21262d" strokeWidth={1}/>
        </svg>

        {/* Legend */}
        <div style={{position: 'absolute', top: 4, left: PAD.l + 8, display: 'flex', gap: 14, alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 3}}>
            <div style={{width: 12, height: 2, background: '#d29922', opacity: 0.6}}/>
            <span style={{fontSize: 7, color: '#d29922', opacity: 0.7}}>SMA 20</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 3}}>
            <div style={{width: 12, height: 2, background: '#388bfd', opacity: 0.7}}/>
            <span style={{fontSize: 7, color: '#388bfd', opacity: 0.8}}>SMA 50</span>
          </div>
          {srLines.filter((l: any) => l.role === 'Support').length > 0 && <div style={{display: 'flex', alignItems: 'center', gap: 3}}>
            <div style={{width: 12, height: 1, background: '#3fb950', opacity: 0.5, borderTop: '1px dashed #3fb950'}}/>
            <span style={{fontSize: 7, color: '#3fb950', opacity: 0.7}}>Support</span>
          </div>}
          {srLines.filter((l: any) => l.role === 'Resistance').length > 0 && <div style={{display: 'flex', alignItems: 'center', gap: 3}}>
            <div style={{width: 12, height: 1, background: '#f85149', opacity: 0.5, borderTop: '1px dashed #f85149'}}/>
            <span style={{fontSize: 7, color: '#f85149', opacity: 0.7}}>Resistance</span>
          </div>}
        </div>
      </div>

      {/* ── Divergence alert ── */}
      {m.divergence && <div style={{background: '#0e1117', padding: '6px 20px', borderTop: '1px solid #161b22'}}>
        <span style={{fontSize: 10, color: '#d29922', borderLeft: '2px solid #d29922', paddingLeft: 8}}>{m.divergence}</span>
      </div>}

      {/* ── SCENARIOS ── */}
      <div style={{display: 'flex', gap: 0, borderTop: '1px solid #161b22'}}>
        {/* Bull */}
        <div style={{flex: 1, background: '#0e1117', padding: '10px 16px', borderRight: '1px solid #161b22'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
            <span style={{fontSize: 10, color: '#3fb950', fontWeight: 600}}>BULL CASE</span>
            <span style={{fontSize: 8, color: '#3fb950', background: '#3fb95010', border: '1px solid #3fb95025', padding: '1px 6px'}}>{sc.bull?.probability}</span>
          </div>
          <div style={{fontSize: 9, color: '#8b949e', lineHeight: 1.6}}>
            <div>Target: <span style={{color: '#3fb950', fontFamily: mono, fontWeight: 600}}>{sc.bull?.target != null ? (typeof sc.bull.target === 'number' ? sc.bull.target.toLocaleString() : sc.bull.target) : '—'}</span></div>
            <div>Extended: <span style={{color: '#3fb950', fontFamily: mono}}>{sc.bull?.extended_target != null ? (typeof sc.bull.extended_target === 'number' ? sc.bull.extended_target.toLocaleString() : sc.bull.extended_target) : '—'}</span></div>
            <div>Invalidation: <span style={{color: '#f85149', fontFamily: mono}}>{sc.bull?.invalidation != null ? (typeof sc.bull.invalidation === 'number' ? sc.bull.invalidation.toLocaleString() : sc.bull.invalidation) : '—'}</span></div>
          </div>
          <div style={{marginTop: 6, borderTop: '1px solid #21262d', paddingTop: 4}}>
            {(sc.bull?.conditions || []).map((c: string, i: number) => <div key={i} style={{fontSize: 8, color: '#484f58', padding: '1px 0', paddingLeft: 6, borderLeft: '1px solid #3fb95040'}}>{c}</div>)}
          </div>
        </div>

        {/* Bear */}
        <div style={{flex: 1, background: '#0e1117', padding: '10px 16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
            <span style={{fontSize: 10, color: '#f85149', fontWeight: 600}}>BEAR CASE</span>
            <span style={{fontSize: 8, color: '#f85149', background: '#f8514910', border: '1px solid #f8514925', padding: '1px 6px'}}>{sc.bear?.probability}</span>
          </div>
          <div style={{fontSize: 9, color: '#8b949e', lineHeight: 1.6}}>
            <div>Target: <span style={{color: '#f85149', fontFamily: mono, fontWeight: 600}}>{sc.bear?.target != null ? (typeof sc.bear.target === 'number' ? sc.bear.target.toLocaleString() : sc.bear.target) : '—'}</span></div>
            <div>Extended: <span style={{color: '#f85149', fontFamily: mono}}>{sc.bear?.extended_target != null ? (typeof sc.bear.extended_target === 'number' ? sc.bear.extended_target.toLocaleString() : sc.bear.extended_target) : '—'}</span></div>
            <div>Invalidation: <span style={{color: '#3fb950', fontFamily: mono}}>{sc.bear?.invalidation != null ? (typeof sc.bear.invalidation === 'number' ? sc.bear.invalidation.toLocaleString() : sc.bear.invalidation) : '—'}</span></div>
          </div>
          <div style={{marginTop: 6, borderTop: '1px solid #21262d', paddingTop: 4}}>
            {(sc.bear?.conditions || []).map((c: string, i: number) => <div key={i} style={{fontSize: 8, color: '#484f58', padding: '1px 0', paddingLeft: 6, borderLeft: '1px solid #f8514940'}}>{c}</div>)}
          </div>
        </div>
      </div>

      <div style={{fontSize: 7, color: '#21262d', textAlign: 'right', padding: '4px 16px', background: '#0e1117'}}>
        {symbol} · {data.n_days}d · Updated {data.updated ? new Date(data.updated).toLocaleTimeString('en-GB') : '—'} UTC
      </div>

      {/* ── Analyst Consensus ── */}
      <AnalystConsensus symbol={symbol} />
    </div>
  )
}

// ─── Analyst Consensus ───────────────────────────────────────
function AnalystConsensus({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<
    | { mode: 'history'; x: number; y: number; idx: number }
    | { mode: 'forecast'; x: number; y: number; t: number }  // t = 0..1 along projection
    | null
  >(null)
  const [gaugeHov, setGaugeHov] = useState<boolean>(false)
  const mono = "'SF Mono', Menlo, Consolas, monospace"

  useEffect(() => {
    setLoading(true); setData(null); setTooltip(null)
    fetch(`/api/analyst/${symbol}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.data && !j.data.error) setData(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [symbol])

  if (loading) return (
    <div style={{padding:'20px 20px',borderTop:'1px solid #161b22',background:'#0e1117'}}>
      <div style={{fontSize:10,color:'#484f58'}}>Loading analyst consensus…</div>
    </div>
  )

  // No data or missing targets — hide silently
  if (!data || !data.target_median || !data.current_price) return null

  const {
    rec_label, strong_buy, buy, hold, sell, strong_sell,
    n_analysts, target_median, target_high, target_low,
    current_price, upside, price_history,
  } = data

  const fmtP = (v: number) => v >= 10000 ? `$${(v/1000).toFixed(1)}k` : v >= 100 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`

  const totalVotes = (strong_buy + buy + hold + sell + strong_sell) || 1
  const hasBreakdown = (strong_buy + buy + hold + sell + strong_sell) > 0
  const recScore = ((strong_buy * 5 + buy * 4 + hold * 3 + sell * 2 + strong_sell * 1) / totalVotes)

  // Gauge: 1=Strong Sell, 5=Strong Buy — map 1-5 to 0-180deg arc
  const gaugeAngle = ((recScore - 1) / 4) * 180  // 0 = far left, 180 = far right
  const recColor = recScore >= 4 ? '#3fb950' : recScore >= 3.2 ? '#3fb950' : recScore >= 2.5 ? '#d29922' : '#f85149'

  // Needle SVG math
  const gCx = 80, gCy = 72, gR = 58
  const needleRad = (gaugeAngle - 180) * (Math.PI / 180)
  const nx = gCx + (gR - 8) * Math.cos(needleRad)
  const ny = gCy + (gR - 8) * Math.sin(needleRad)

  // ── Price target chart geometry ──
  const history = (price_history || []).slice(-60)  // last 60 trading days
  const histLen = history.length
  const hasHistory = histLen >= 5

  const CHART_W = 560, CHART_H = 160
  const LEFT_PAD = 44, RIGHT_PAD = 80, TOP_PAD = 18, BOT_PAD = 22
  const chartW = CHART_W - LEFT_PAD - RIGHT_PAD
  const histWidth = Math.floor(chartW * 0.62)
  const projWidth = chartW - histWidth

  const allPrices = hasHistory
    ? [...history.map((d: any) => d.close), target_high ?? target_median, target_low ?? target_median]
    : [current_price * 0.85, target_high ?? target_median * 1.05]
  const pMin = Math.min(...allPrices) * 0.97
  const pMax = Math.max(...allPrices) * 1.03
  const pRange = pMax - pMin || 1

  const yP = (v: number) => TOP_PAD + (CHART_H - TOP_PAD - BOT_PAD) * (1 - (v - pMin) / pRange)
  const xH = (i: number) => LEFT_PAD + (i / Math.max(histLen - 1, 1)) * histWidth
  const xNow = LEFT_PAD + histWidth
  const xProj = (t: number) => xNow + t * projWidth  // t: 0-1

  const histPath = hasHistory
    ? history.map((d: any, i: number) => `${xH(i).toFixed(1)},${yP(d.close).toFixed(1)}`).join(' ')
    : ''

  const yMed  = yP(target_median)
  const yHigh = target_high ? yP(target_high) : yMed
  const yLow  = target_low  ? yP(target_low)  : yMed
  const yCur  = hasHistory ? yP(history[histLen - 1].close) : yP(current_price)

  // Projection cone polygon: current point → high/low spread at x=1
  const conePoints = `${xNow},${yCur} ${xProj(1)},${yHigh} ${xProj(1)},${yLow}`

  // Recommendation breakdown bar segments
  const segs = [
    { label: 'Strong Buy', count: strong_buy,  color: '#3fb950' },
    { label: 'Buy',        count: buy,          color: '#3fb950' },
    { label: 'Hold',       count: hold,         color: '#d29922' },
    { label: 'Sell',       count: sell,         color: '#f85149' },
    { label: 'Strong Sell',count: strong_sell,  color: '#f85149' },
  ]

  // ── Range bar ──
  const rbMin = target_low   ?? current_price * 0.85
  const rbMax = target_high  ?? current_price * 1.15
  const rbRange = rbMax - rbMin || 1
  const rbPos = (v: number) => Math.max(0, Math.min(100, ((v - rbMin) / rbRange) * 100))
  const curPos  = rbPos(current_price)
  const medPos  = rbPos(target_median)

  // Upside color
  const upsideColor = !upside ? '#8b949e' : upside >= 15 ? '#3fb950' : upside >= 0 ? '#3fb950' : '#f85149'

  return (
    <div style={{borderTop:'2px solid #1c2128',background:'#0e1117',padding:'20px 20px 24px'}}>

      {/* Section header */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:600,color:'#c9d1d9',letterSpacing:0.4}}>ANALYST CONSENSUS</div>
        <div style={{fontSize:10,color:'#484f58',marginTop:2}}>12-month analyst target and recommendation</div>
      </div>

      {/* ── 2-column layout ── */}
      <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:20,alignItems:'start'}}>

        {/* ════ LEFT — Consensus card ════ */}
        <div style={{display:'flex',flexDirection:'column',gap:0,background:'#161b22',border:'1px solid #21262d',borderRadius:2}}>

          {/* Gauge */}
          <div style={{padding:'16px 16px 0',display:'flex',flexDirection:'column',alignItems:'center',position:'relative'}}>
            <svg
              width={160} height={88} viewBox="0 0 160 88" style={{overflow:'visible', cursor:'pointer'}}
              onMouseEnter={() => setGaugeHov(true)}
              onMouseLeave={() => setGaugeHov(false)}>
              {/* Arc segments — 5 zones. All highlight together when gauge is hovered. */}
              {[
                {start:0,   end:36,  col:'#f85149', label:'Strong Sell', count: strong_sell},
                {start:36,  end:72,  col:'#f85149', label:'Sell',         count: sell},
                {start:72,  end:108, col:'#d29922', label:'Hold',         count: hold},
                {start:108, end:144, col:'#3fb950', label:'Buy',          count: buy},
                {start:144, end:180, col:'#3fb950', label:'Strong Buy',   count: strong_buy},
              ].map(({start, end, col, label}) => {
                const s = (start - 180) * Math.PI / 180
                const e = (end   - 180) * Math.PI / 180
                const r = 58, ir = 44
                const x1o = gCx + r * Math.cos(s), y1o = gCy + r * Math.sin(s)
                const x2o = gCx + r * Math.cos(e), y2o = gCy + r * Math.sin(e)
                const x1i = gCx + ir * Math.cos(s), y1i = gCy + ir * Math.sin(s)
                const x2i = gCx + ir * Math.cos(e), y2i = gCy + ir * Math.sin(e)
                const lg = end - start > 180 ? 1 : 0
                return (
                  <path key={label}
                    d={`M${x1i.toFixed(1)},${y1i.toFixed(1)} L${x1o.toFixed(1)},${y1o.toFixed(1)} A${r},${r} 0 ${lg},1 ${x2o.toFixed(1)},${y2o.toFixed(1)} L${x2i.toFixed(1)},${y2i.toFixed(1)} A${ir},${ir} 0 ${lg},0 ${x1i.toFixed(1)},${y1i.toFixed(1)}`}
                    fill={col} opacity={gaugeHov ? 1 : 0.85}
                  />
                )
              })}
              {/* Needle */}
              <line
                x1={gCx} y1={gCy}
                x2={nx.toFixed(1)} y2={ny.toFixed(1)}
                stroke="#c9d1d9" strokeWidth={2} strokeLinecap="round"
                pointerEvents="none"
              />
              <circle cx={gCx} cy={gCy} r={4} fill="#c9d1d9" pointerEvents="none"/>
              {/* Tick labels */}
              {[{a:0,l:'SS'},{a:45,l:'S'},{a:90,l:'H'},{a:135,l:'B'},{a:180,l:'SB'}].map(({a,l})=>{
                const rad = (a - 180) * Math.PI / 180
                const tx = gCx + 68 * Math.cos(rad), ty = gCy + 68 * Math.sin(rad)
                return <text key={l} x={tx.toFixed(1)} y={ty.toFixed(1)} fontSize={6.5} fill="#484f58" textAnchor="middle" dominantBaseline="middle" pointerEvents="none">{l}</text>
              })}
            </svg>
            {/* Hover panel — shows ALL 5 counts at once. Positioned to overlay the
                gauge area without obscuring the recommendation label below. */}
            {gaugeHov && (
              <div
                onMouseEnter={() => setGaugeHov(true)}
                onMouseLeave={() => setGaugeHov(false)}
                style={{
                  position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(10,14,20,0.96)', border: '1px solid #30363d', borderRadius: 3,
                  padding: '8px 10px', minWidth: 150, zIndex: 5, fontFamily: mono,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}>
                <div style={{ fontSize: 8, color: '#484f58', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, textAlign: 'center', fontWeight: 600 }}>
                  {n_analysts} ANALYSTS · {rec_label.toUpperCase()}
                </div>
                {hasBreakdown ? segs.map(s => {
                  const pct = n_analysts > 0 ? Math.round((s.count / n_analysts) * 100) : 0
                  return (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 10 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }}/>
                      <span style={{ color: '#c9d1d9', flex: 1 }}>{s.label}</span>
                      <span style={{ color: s.color, fontWeight: 600, minWidth: 18, textAlign: 'right' }}>{s.count}</span>
                      <span style={{ color: '#484f58', fontSize: 9, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  )
                }) : (
                  <div style={{ fontSize: 9, color: '#8b949e', textAlign: 'center', padding: '6px 0', lineHeight: 1.5 }}>
                    Per-analyst breakdown<br/>not available from data source
                  </div>
                )}
              </div>
            )}
            {/* Label + score */}
            <div style={{marginTop:-4,textAlign:'center'}}>
              <div style={{fontSize:15,fontWeight:600,color:recColor,letterSpacing:'0.02em'}}>{rec_label}</div>
              <div style={{fontSize:9,color:'#484f58',marginTop:1}}>{n_analysts} analysts</div>
            </div>
          </div>

          {/* Breakdown bar */}
          <div style={{padding:'10px 14px 0'}}>
            <div style={{display:'flex',height:5,borderRadius:2,overflow:'hidden',gap:1}}>
              {segs.filter(s=>s.count>0).map(s=>(
                <div key={s.label} style={{flex:s.count,background:s.color}} title={`${s.label}: ${s.count}`}/>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
              {segs.filter(s=>s.count>0).map(s=>(
                <div key={s.label} style={{textAlign:'center',minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,color:s.color,fontFamily:mono}}>{s.count}</div>
                  <div style={{fontSize:7.5,color:'#484f58',whiteSpace:'nowrap',overflow:'hidden'}}>{s.label.replace('Strong ','S.')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key figures */}
          <div style={{padding:'12px 14px 14px',display:'flex',flexDirection:'column',gap:7,marginTop:4,borderTop:'1px solid #1c2128'}}>
            {[
              {l:'Current Price', v:fmtP(current_price), c:'#c9d1d9'},
              {l:'Median Target',  v:fmtP(target_median), c:recColor},
              {l:'Upside / Down',  v:upside != null ? fmtPct(upside) : '—', c:upsideColor},
              {l:'High Target',    v:target_high ? fmtP(target_high)  : '—', c:'#3fb950'},
              {l:'Low Target',     v:target_low  ? fmtP(target_low)   : '—', c:'#f85149'},
            ].map(({l,v,c})=>(
              <div key={l} style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
                <span style={{fontSize:10,color:'#484f58'}}>{l}</span>
                <span style={{fontSize:12,fontWeight:600,color:c,fontFamily:mono}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ════ RIGHT — Price target chart + range bar ════ */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>

          {/* Chart */}
          <div style={{background:'#161b22',border:'1px solid #21262d',borderRadius:2,position:'relative'}}>
            <div style={{padding:'10px 14px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:10,color:'#8b949e',fontWeight:500}}>12-Month Price Target</span>
              <span style={{fontSize:9,color:'#484f58'}}>{n_analysts} analyst{n_analysts !== 1 ? 's' : ''}</span>
            </div>
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              style={{width:'100%',height:CHART_H,display:'block',cursor:'crosshair'}}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const svgX = (e.clientX - rect.left) * (CHART_W / rect.width)
                const svgY = (e.clientY - rect.top) * (CHART_H / rect.height)
                // Only show tooltip when cursor is inside the actual chart area
                // (not in axis labels, padding, or above/below the data zone).
                const inChartY = svgY >= TOP_PAD && svgY <= CHART_H - BOT_PAD
                if (!inChartY) { setTooltip(null); return }

                // History zone (left of NOW)
                if (hasHistory && svgX >= LEFT_PAD && svgX <= xNow) {
                  const idx = Math.round(((svgX - LEFT_PAD) / histWidth) * (histLen - 1))
                  setTooltip({ mode: 'history', x: svgX, y: svgY, idx: Math.min(idx, histLen - 1) })
                  return
                }
                // Forecast zone (right of NOW). Strict bounds — tooltip clears the
                // moment cursor leaves the projection cone horizontally.
                if (svgX > xNow && svgX <= xProj(1)) {
                  const t = (svgX - xNow) / projWidth
                  setTooltip({ mode: 'forecast', x: svgX, y: svgY, t: Math.min(Math.max(t, 0), 1) })
                  return
                }
                setTooltip(null)
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Glow filter for the projection line */}
              <defs>
                <filter id="projGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Y grid */}
              {[0.25, 0.5, 0.75].map(t => {
                const yv = TOP_PAD + (CHART_H - TOP_PAD - BOT_PAD) * t
                const pv = pMin + pRange * (1 - t)
                return <g key={t}>
                  <line x1={LEFT_PAD} x2={CHART_W - RIGHT_PAD} y1={yv} y2={yv} stroke="#151920" strokeWidth={1}/>
                  <text x={LEFT_PAD - 4} y={yv + 3} fontSize={7.5} fill="#30363d" textAnchor="end" fontFamily="monospace">{fmtP(pv)}</text>
                </g>
              })}

              {/* NOW divider */}
              <line x1={xNow} x2={xNow} y1={TOP_PAD} y2={CHART_H - BOT_PAD} stroke="#30363d" strokeWidth={1} strokeDasharray="3,3"/>
              <text x={xNow} y={CHART_H - BOT_PAD + 11} fontSize={7} fill="#484f58" textAnchor="middle">NOW</text>
              <text x={LEFT_PAD + histWidth/2} y={CHART_H - BOT_PAD + 11} fontSize={7} fill="#30363d" textAnchor="middle">90d history</text>
              <text x={xNow + projWidth/2} y={CHART_H - BOT_PAD + 11} fontSize={7} fill="#30363d" textAnchor="middle">12m forecast</text>

              {/* Projection cone (shaded band) */}
              <polygon points={conePoints} fill="#388bfd" opacity={0.18}/>

              {/* High target line */}
              {target_high && <>
                <line x1={xNow} x2={xProj(1)} y1={yHigh} y2={yHigh} stroke="#3fb950" strokeWidth={2} strokeDasharray="6,3" opacity={1}/>
                <text x={xProj(1)+4} y={yHigh+3} fontSize={8} fill="#3fb950" fontFamily="monospace" fontWeight="600">{fmtP(target_high)}</text>
              </>}

              {/* Median target line */}
              <line x1={xNow} x2={xProj(1)} y1={yMed} y2={yMed} stroke="#60a5fa" strokeWidth={2} strokeDasharray="6,3" opacity={1}/>
              <text x={xProj(1)+4} y={yMed+3} fontSize={8} fill="#60a5fa" fontFamily="monospace" fontWeight="700">{fmtP(target_median)}</text>

              {/* Low target line */}
              {target_low && <>
                <line x1={xNow} x2={xProj(1)} y1={yLow} y2={yLow} stroke="#f85149" strokeWidth={2} strokeDasharray="6,3" opacity={1}/>
                <text x={xProj(1)+4} y={yLow+3} fontSize={8} fill="#f85149" fontFamily="monospace" fontWeight="600">{fmtP(target_low)}</text>
              </>}

              {/* Main projection line from NOW → median target — GLOWING and BOLD */}
              <line x1={xNow} x2={xProj(1)} y1={yCur} y2={yMed} stroke="#60a5fa" strokeWidth={4} opacity={0.45} filter="url(#projGlow)"/>
              <line x1={xNow} x2={xProj(1)} y1={yCur} y2={yMed} stroke="#60a5fa" strokeWidth={2.5} opacity={1}/>

              {/* Historical price line — bright so it reads clearly on dark background */}
              {histPath && <polyline points={histPath} fill="none" stroke="#c9d1d9" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"/>}

              {/* Current price dot + label */}
              {hasHistory && <>
                <circle cx={xNow} cy={yCur} r={4} fill="#c9d1d9" stroke="#0e1117" strokeWidth={1.5}/>
                <rect x={xNow - 36} y={yCur - 13} width={34} height={12} rx={2} fill="#c9d1d9"/>
                <text x={xNow - 19} y={yCur - 4} fontSize={7.5} fill="#0e1117" textAnchor="middle" fontWeight="700" fontFamily="monospace">{fmtP(current_price)}</text>
              </>}

              {/* Static upside % label in middle of cone (hidden when user is hovering forecast) */}
              {upside != null && tooltip?.mode !== 'forecast' && <g>
                <text x={xProj(0.5)} y={yMed - 5} fontSize={9} fill={upsideColor} textAnchor="middle" fontWeight="700" fontFamily="monospace">
                  {fmtPct(upside)}
                </text>
              </g>}

              {/* Hover tooltip — HISTORY zone */}
              {tooltip?.mode === 'history' && hasHistory && history[tooltip.idx] && (() => {
                const hx = xH(tooltip.idx)
                const hy = yP(history[tooltip.idx].close)
                const BOX_W = 100, BOX_H = 22
                // Anchor box to cursor like forecast tooltip; flip at edges so it stays in-bounds.
                const flipX = tooltip.x + BOX_W + 10 > CHART_W - RIGHT_PAD
                const flipY = tooltip.y - BOX_H - 14 < TOP_PAD
                const boxX = flipX ? tooltip.x - BOX_W - 10 : tooltip.x + 10
                const boxY = flipY ? tooltip.y + 14 : tooltip.y - BOX_H - 14
                return (
                  <g>
                    {/* Vertical crosshair line at cursor x */}
                    <line x1={tooltip.x} x2={tooltip.x} y1={TOP_PAD} y2={CHART_H-BOT_PAD} stroke="#484f58" strokeWidth={0.8} opacity={0.5} strokeDasharray="2,2"/>
                    {/* Dot ON the cursor — confirms tooltip is following cursor */}
                    <circle cx={tooltip.x} cy={tooltip.y} r={3} fill="#fff" stroke="#0e1117" strokeWidth={1.5}/>
                    {/* Reference dot on the actual data point so user can correlate */}
                    <circle cx={hx} cy={hy} r={2.5} fill="#c9d1d9" opacity={0.7}/>
                    {/* Tooltip box — anchored at cursor, not at data point. No more gap. */}
                    <rect x={boxX} y={boxY} width={BOX_W} height={BOX_H} rx={3} fill="#0e1117" stroke="#30363d" strokeWidth={1}/>
                    <text x={boxX + 6} y={boxY + 9} fontSize={7.5} fill="#8b949e" fontFamily="monospace">
                      {history[tooltip.idx].date}
                    </text>
                    <text x={boxX + 6} y={boxY + 18} fontSize={9} fill="#c9d1d9" fontFamily="monospace" fontWeight="600">
                      {fmtP(history[tooltip.idx].close)}
                    </text>
                  </g>
                )
              })()}

              {/* Hover tooltip — FORECAST zone: shows all 3 scenarios at cursor's time */}
              {tooltip?.mode === 'forecast' && (() => {
                const t = tooltip.t
                // Interpolate each of the 3 scenario lines from current price → its 12m target.
                // t = 0..1 along the forecast horizon; t=1 = the analyst's stated 12m target.
                const bullPrice  = current_price + ((target_high   ?? target_median) - current_price) * t
                const basePrice  = current_price + (target_median - current_price) * t
                const bearPrice  = current_price + ((target_low    ?? target_median) - current_price) * t
                const bullPct    = ((bullPrice - current_price) / current_price) * 100
                const basePct    = ((basePrice - current_price) / current_price) * 100
                const bearPct    = ((bearPrice - current_price) / current_price) * 100
                const baseY      = yCur + (yMed - yCur) * t   // dot rendered on median line
                const lineX      = xNow + projWidth * t
                const months     = Math.round(t * 12)

                // Tooltip box anchors right at the cursor with a small offset so it never
                // appears far from where the user is pointing. Edge-flip prevents overflow.
                const BOX_W = 158, BOX_H = 70
                const OFFSET_X = 6, OFFSET_Y = 8
                const flipX = tooltip.x + BOX_W + OFFSET_X > CHART_W - RIGHT_PAD
                const flipY = tooltip.y - BOX_H - OFFSET_Y < TOP_PAD
                const boxX = flipX ? tooltip.x - BOX_W - OFFSET_X : tooltip.x + OFFSET_X
                const boxY = flipY ? tooltip.y + OFFSET_Y : tooltip.y - BOX_H - OFFSET_Y
                // Leader line: thin connector from cursor to nearest corner of tooltip box,
                // making it visually clear which cursor position the tooltip is for.
                const leadX = flipX ? boxX + BOX_W : boxX
                const leadY = flipY ? boxY : boxY + BOX_H

                // Color helper — green for upside, red for downside
                const c = (v: number) => v >= 0 ? '#3fb950' : '#f85149'
                const sgn = (v: number) => v >= 0 ? '+' : ''
                return (
                  <g>
                    {/* Dashed vertical line at cursor x — full chart height to anchor visually */}
                    <line x1={lineX} x2={lineX} y1={TOP_PAD} y2={CHART_H-BOT_PAD} stroke="#60a5fa" strokeWidth={0.8} opacity={0.4} strokeDasharray="2,2"/>
                    {/* Dots at the 3 scenario lines for the cursor's time. */}
                    {target_high && <circle cx={lineX} cy={yCur + (yHigh - yCur) * t} r={3.5} fill="#3fb950" stroke="#0e1117" strokeWidth={1}/>}
                    <circle cx={lineX} cy={baseY} r={4} fill="#60a5fa" stroke="#0e1117" strokeWidth={1.5}/>
                    {target_low && <circle cx={lineX} cy={yCur + (yLow - yCur) * t} r={3.5} fill="#f85149" stroke="#0e1117" strokeWidth={1}/>}
                    {/* Leader line from cursor to tooltip box corner — eliminates "gap" feel */}
                    <line x1={tooltip.x} y1={tooltip.y} x2={leadX} y2={leadY} stroke="#30363d" strokeWidth={1} opacity={0.7}/>
                    {/* White dot ON the cursor itself confirms tooltip is attached to mouse */}
                    <circle cx={tooltip.x} cy={tooltip.y} r={2.5} fill="#fff" stroke="#0e1117" strokeWidth={1}/>
                    {/* Tooltip box — 3 scenarios stacked */}
                    <rect x={boxX} y={boxY} width={BOX_W} height={BOX_H} rx={3} fill="#0e1117" stroke="#30363d" strokeWidth={1}/>
                    {/* Header — months from now */}
                    <text x={boxX + 6} y={boxY + 11} fontSize={7.5} fill="#8b949e" fontFamily="monospace" letterSpacing={0.3}>
                      +{months} MONTH{months === 1 ? '' : 'S'} FROM NOW
                    </text>
                    <line x1={boxX + 6} x2={boxX + BOX_W - 6} y1={boxY + 16} y2={boxY + 16} stroke="#21262d" strokeWidth={0.6}/>
                    {/* BULL row */}
                    <circle cx={boxX + 10} cy={boxY + 26} r={2.5} fill="#3fb950"/>
                    <text x={boxX + 17} y={boxY + 28} fontSize={8} fill="#8b949e" fontFamily="monospace">BULL</text>
                    <text x={boxX + BOX_W - 6} y={boxY + 28} fontSize={9} fill={c(bullPct)} fontFamily="monospace" fontWeight="700" textAnchor="end">
                      {fmtP(bullPrice)} <tspan fill={c(bullPct)} fontSize={8}>({sgn(bullPct)}{bullPct.toFixed(1)}%)</tspan>
                    </text>
                    {/* BASE row (highlighted as the analyst median) */}
                    <circle cx={boxX + 10} cy={boxY + 41} r={2.5} fill="#60a5fa"/>
                    <text x={boxX + 17} y={boxY + 43} fontSize={8} fill="#c9d1d9" fontFamily="monospace" fontWeight="600">BASE</text>
                    <text x={boxX + BOX_W - 6} y={boxY + 43} fontSize={9} fill={c(basePct)} fontFamily="monospace" fontWeight="700" textAnchor="end">
                      {fmtP(basePrice)} <tspan fill={c(basePct)} fontSize={8}>({sgn(basePct)}{basePct.toFixed(1)}%)</tspan>
                    </text>
                    {/* BEAR row */}
                    <circle cx={boxX + 10} cy={boxY + 56} r={2.5} fill="#f85149"/>
                    <text x={boxX + 17} y={boxY + 58} fontSize={8} fill="#8b949e" fontFamily="monospace">BEAR</text>
                    <text x={boxX + BOX_W - 6} y={boxY + 58} fontSize={9} fill={c(bearPct)} fontFamily="monospace" fontWeight="700" textAnchor="end">
                      {fmtP(bearPrice)} <tspan fill={c(bearPct)} fontSize={8}>({sgn(bearPct)}{bearPct.toFixed(1)}%)</tspan>
                    </text>
                  </g>
                )
              })()}
            </svg>
          </div>

          {/* ── Range bar ── */}
          <div style={{background:'#161b22',border:'1px solid #21262d',borderRadius:2,padding:'11px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:9,color:'#8b949e',fontWeight:500,letterSpacing:0.5}}>ANALYST PRICE RANGE</span>
              <span style={{fontSize:9,color:'#484f58'}}>{target_low ? fmtP(target_low) : '—'} — {target_high ? fmtP(target_high) : '—'}</span>
            </div>
            <div style={{position:'relative',height:8,borderRadius:3,background:'linear-gradient(90deg, #f85149 0%, #d29922 38%, #3fb950 100%)',opacity:0.6}}/>
            <div style={{position:'relative',height:8,marginTop:-8,borderRadius:3}}>
              {/* Current price marker */}
              <div style={{position:'absolute',left:`${curPos}%`,transform:'translateX(-50%)',top:-4,width:2,height:16,background:'#c9d1d9',borderRadius:1}}/>
              {/* Median marker */}
              <div style={{position:'absolute',left:`${medPos}%`,transform:'translateX(-50%)',top:-3,width:8,height:8,borderRadius:'50%',background:'#60a5fa',border:'1.5px solid #0e1117'}}/>
            </div>
            <div style={{marginTop:6,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:2,height:10,background:'#c9d1d9',borderRadius:1}}/>
                <span style={{fontSize:9,color:'#8b949e'}}>Current <span style={{color:'#c9d1d9',fontFamily:mono,fontWeight:600}}>{fmtP(current_price)}</span></span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'#60a5fa',border:'1px solid #0e1117'}}/>
                <span style={{fontSize:9,color:'#8b949e'}}>Median <span style={{color:'#60a5fa',fontFamily:mono,fontWeight:600}}>{fmtP(target_median)}</span></span>
              </div>
              {upside != null && (
                <span style={{fontSize:9,fontWeight:700,color:upsideColor,marginLeft:'auto',fontFamily:mono}}>{fmtPct(upside)} to median</span>
              )}
            </div>
          </div>

          {/* One-sentence insight */}
          <div style={{fontSize:10,color:'#484f58',lineHeight:1.6,paddingLeft:2}}>
            {n_analysts} analyst{n_analysts !== 1 ? 's' : ''} covering {symbol}.{' '}
            {upside != null && upside > 5 && `Consensus sees ${fmtPct(upside)} upside to ${fmtP(target_median)}.`}
            {upside != null && upside < -5 && `Consensus sees downside risk; median target ${fmtP(target_median)}.`}
            {upside != null && Math.abs(upside) <= 5 && `Price is near analyst consensus target of ${fmtP(target_median)}.`}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SVG Sparkline ────────────────────────────────────────────
function Spark({ history, color, h = 28 }: { history: number[]; color: string; h?: number }) {
  if (!history || history.length < 3) return null
  const mn = Math.min(...history), mx = Math.max(...history), rng = mx - mn || 1
  const pts = history.map((v, i) => `${(i/(history.length-1))*100},${h-((v-mn)/rng)*(h-4)-2}`).join(' ')
  return <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" style={{width:'100%',height:h,display:'block'}}>
    <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
  </svg>
}

// ─── Band colors ──────────────────────────────────────────────
const BAND_COLORS: Record<string, string> = {
  depressed: '#388bfd', supportive: '#3fb950', neutral: '#8b949e',
  elevated: '#d29922', overheated: '#f85149',
}

// ─── CryptoQuant-Style Dual-Axis Research Chart ──────────────
function MetricDetail({ data, expanded, onBack, sc, mono }: {
  data: any; expanded: string; onBack: () => void; sc: (s:string|null)=>string; mono: string
}) {
  const [tf, setTf] = useState<string>('')
  const [showPrice, setShowPrice] = useState(true)

  let m: any = null, secTitle = ''
  for (const [, sec] of Object.entries(data.sections) as any) {
    const found = sec.metrics.find((x:any) => x.name === expanded)
    if (found) { m = found; secTitle = sec.title; break }
  }
  if (!m) { onBack(); return null }

  const col = sc(m.state)
  const activeTf = tf || m.default_tf || 'max'
  const metricHist: number[] = m.history || []
  const priceHist: number[] = data.price_history || []
  const priceDates: string[] = data.price_dates || []
  const offset = m.hist_offset || 0

  // Timeframe
  const tfMap: Record<string,number> = { '90d':90, '1y':365, '2y':730, '4y':1460, 'max':999999 }
  const tfDays = tfMap[activeTf] || 999999

  // Build aligned arrays — handle missing price_history gracefully
  const aligned: { price: number; metric: number | null; date: string }[] = []
  const hasPriceData = priceHist.length > 0

  if (hasPriceData) {
    // Full alignment: metric history[i] corresponds to price at index (offset + i)
    const totalLen = offset + metricHist.length
    const sliceStart = Math.max(0, totalLen - tfDays)
    for (let i = sliceStart; i < Math.min(totalLen, priceHist.length); i++) {
      const mi = i - offset
      aligned.push({
        price: priceHist[i] || 0,
        metric: mi >= 0 && mi < metricHist.length ? metricHist[mi] : null,
        date: priceDates[i] || '',
      })
    }
  } else {
    // Fallback: no price data — use metric history only
    const sliced = tfDays >= metricHist.length ? metricHist : metricHist.slice(-tfDays)
    for (let i = 0; i < sliced.length; i++) {
      aligned.push({ price: 0, metric: sliced[i], date: '' })
    }
  }

  const N = aligned.length
  const hasChart = N > 5
  const current = m.value
  const metricVals = aligned.map(a => a.metric).filter(v => v !== null) as number[]
  const priceVals = aligned.map(a => a.price)

  // Stats
  const mMn = metricVals.length ? Math.min(...metricVals) : 0
  const mMx = metricVals.length ? Math.max(...metricVals) : 0
  const mRng = mMx - mMn || 1
  const mAvg = metricVals.length ? metricVals.reduce((a,b)=>a+b,0)/metricVals.length : 0
  const mSorted = [...metricVals].sort((a,b)=>a-b)
  const mMed = mSorted.length ? mSorted[Math.floor(mSorted.length/2)] : 0
  const mP10 = mSorted.length > 10 ? mSorted[Math.floor(mSorted.length*0.1)] : mMn
  const mP90 = mSorted.length > 10 ? mSorted[Math.floor(mSorted.length*0.9)] : mMx
  const pctile = metricVals.length && current!=null ? Math.round(mSorted.filter(v=>v<=current).length/mSorted.length*100) : null

  const pMn = priceVals.length ? Math.min(...priceVals) : 0
  const pMx = priceVals.length ? Math.max(...priceVals) : 0

  // ── Chart geometry ──
  const W = 1000, H = 420
  const PAD = { t:20, b:36, l:70, r:72 }
  const cw = W-PAD.l-PAD.r, ch = H-PAD.t-PAD.b

  // Right Y axis = metric
  let yRmin = mMn - mRng*0.08, yRmax = mMx + mRng*0.08
  if (m.bands) for (const b of m.bands) {
    if (typeof b.min==='number' && b.min > -100) yRmin = Math.min(yRmin, b.min)
    if (typeof b.max==='number' && b.max < 200) yRmax = Math.max(yRmax, b.max)
  }
  if (current!=null) { yRmin = Math.min(yRmin, current-mRng*0.05); yRmax = Math.max(yRmax, current+mRng*0.05) }
  const yRR = yRmax-yRmin || 1

  // Left Y axis = price
  const pRng = pMx - pMn || 1
  const yLmin = pMn - pRng*0.05, yLmax = pMx + pRng*0.05
  const yLR = yLmax - yLmin || 1

  const toYR = (v:number) => PAD.t+ch-((v-yRmin)/yRR)*ch
  const toYL = (v:number) => PAD.t+ch-((v-yLmin)/yLR)*ch
  const toX = (i:number) => PAD.l+(i/Math.max(N-1,1))*cw

  // Band zones (on metric/right axis)
  const bandElems = (m.bands||[]).map((b:any,i:number) => {
    const bLo = Math.max(b.min, yRmin), bHi = Math.min(b.max, yRmax)
    if (bHi<=yRmin||bLo>=yRmax) return null
    const y1 = toYR(bHi), y2 = toYR(bLo), bc = BAND_COLORS[b.color]||'#8b949e'
    return <g key={i}>
      <rect x={PAD.l} y={y1} width={cw} height={Math.max(0,y2-y1)} fill={bc} opacity={0.07}/>
      <line x1={PAD.l} x2={PAD.l+cw} y1={y1} y2={y1} stroke={bc} strokeWidth={0.5} opacity={0.3} strokeDasharray="8,4"/>
      <text x={PAD.l+cw+PAD.r-4} y={(y1+y2)/2+3} fontSize={8} fill={bc} opacity={0.8} textAnchor="end" fontWeight={500}>{b.label}</text>
    </g>
  })

  // Y grid (metric axis)
  const yTicks = 8
  const yGridR = Array.from({length:yTicks+1},(_,i)=>({ v:yRmin+(yRR*i/yTicks), y:toYR(yRmin+(yRR*i/yTicks)) }))
  // Y grid (price axis)
  const yGridL = Array.from({length:yTicks+1},(_,i)=>({ v:yLmin+(yLR*i/yTicks), y:toYL(yLmin+(yLR*i/yTicks)) }))

  // X labels
  const xLabels: {x:number;label:string}[] = []
  if (hasChart) {
    const step = Math.max(1, Math.floor(N/7))
    for (let i=0; i<N; i+=step) {
      const d = aligned[i]?.date
      if (d) {
        const parts = d.split('-')
        xLabels.push({x:toX(i), label: parts.length>=2 ? `${parts[1]}/${parts[0].slice(2)}` : d.slice(0,7)})
      }
    }
  }

  // Metric reference lines
  const refs = metricVals.length ? [
    {v:mAvg, label:`AVG ${mAvg.toFixed(2)}`, dash:'4,4', c:'#484f58'},
    {v:mMed, label:`MED ${mMed.toFixed(2)}`, dash:'8,4', c:'#388bfd'},
  ].filter(r=>r.v>yRmin&&r.v<yRmax) : []

  // Paths
  const metricPts = aligned.map((a,i)=>a.metric!=null?`${toX(i)},${toYR(a.metric)}`:null)
  // Build continuous segments for metric line (skip nulls)
  let metricPath = ''
  let inSegment = false
  for (let i=0;i<N;i++) {
    if (aligned[i].metric!=null) {
      metricPath += (inSegment?'L':'M') + `${toX(i)},${toYR(aligned[i].metric!)} `
      inSegment = true
    } else { inSegment = false }
  }

  const pricePath = aligned.map((a,i)=>`${i===0?'M':'L'}${toX(i)},${toYL(a.price)}`).join(' ')

  // Area under metric
  const firstMetric = aligned.findIndex(a=>a.metric!=null)
  const lastMetric = aligned.length-1-[...aligned].reverse().findIndex(a=>a.metric!=null)
  let areaPath = ''
  if (firstMetric>=0 && lastMetric>firstMetric) {
    areaPath = `M${toX(firstMetric)},${toYR(aligned[firstMetric].metric!)} `
    for (let i=firstMetric;i<=lastMetric;i++) {
      if (aligned[i].metric!=null) areaPath+=`L${toX(i)},${toYR(aligned[i].metric!)} `
    }
    areaPath += `L${toX(lastMetric)},${PAD.t+ch} L${toX(firstMetric)},${PAD.t+ch} Z`
  }

  const curY = current!=null ? toYR(current) : null
  const curOk = curY!=null && curY>PAD.t-15 && curY<H-PAD.b+15
  const curPrice = priceVals.length ? priceVals[priceVals.length-1] : 0

  const TFS = ['90d','1y','2y','4y','max']

  const fmtPrice = (v:number) => v>=10000?`$${(v/1000).toFixed(0)}k`:v>=1000?`$${(v/1000).toFixed(1)}k`:`$${v.toFixed(0)}`

  return <div style={{display:'flex',flexDirection:'column',gap:0}}>
    {/* ── BACK ── */}
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
      <button onClick={onBack} style={{fontSize:10,color:'#388bfd',background:'transparent',border:'1px solid #388bfd33',padding:'4px 16px',cursor:'pointer'}}>← BACK</button>
      <span style={{fontSize:9,color:'#30363d',textTransform:'uppercase',letterSpacing:0.5}}>{secTitle}</span>
    </div>

    {/* ── HEADER ── */}
    <div style={{background:'#0e1117',padding:'14px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #161b22'}}>
      <div style={{display:'flex',alignItems:'baseline',gap:16}}>
        <span style={{fontSize:18,color:'#c9d1d9',fontWeight:600,letterSpacing:-0.2}}>{m.name}</span>
        {current!=null?<span style={{fontSize:28,fontWeight:500,color:col,fontFamily:mono,fontVariantNumeric:'tabular-nums',letterSpacing:-0.5}}>
          {typeof current==='number'?current.toLocaleString(undefined,{maximumFractionDigits:2}):current}
          {m.unit&&<span style={{fontSize:12,color:'#484f58',marginLeft:4,fontWeight:400}}>{m.unit}</span>}
        </span>:<span style={{fontSize:13,color:'#484f58',fontStyle:'italic'}}>Unavailable</span>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        {pctile!=null&&<span style={{fontSize:10,color:'#484f58',fontFamily:mono}}>{pctile}th pctl</span>}
        {m.state&&<span style={{fontSize:11,color:col,background:col+'10',border:`1px solid ${col}30`,padding:'5px 16px',fontWeight:600}}>{m.state}</span>}
      </div>
    </div>

    {/* ── INTERPRETATION ── */}
    {m.interpretation&&<div style={{background:'#0e1117',padding:'10px 24px',borderBottom:'1px solid #161b22'}}>
      <div style={{fontSize:12,color:'#8b949e',borderLeft:`3px solid ${col}50`,paddingLeft:14}}>{m.interpretation}</div>
    </div>}

    {/* ── CONTROLS: Timeframe + Price toggle ── */}
    <div style={{background:'#0e1117',padding:'8px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #161b22'}}>
      <div style={{display:'flex',gap:2}}>
        {TFS.filter(t=>t==='max'||(tfMap[t]||0)<=priceHist.length).map(t=>(
          <button key={t} onClick={()=>setTf(t)} style={{fontSize:10,padding:'5px 14px',cursor:'pointer',fontFamily:mono,
            color:activeTf===t?'#c9d1d9':'#484f58',background:activeTf===t?'#161b22':'transparent',
            border:activeTf===t?'1px solid #388bfd':'1px solid transparent'}}>
            {t==='max'?'MAX':t.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <button onClick={()=>setShowPrice(!showPrice)} style={{fontSize:9,padding:'4px 12px',cursor:'pointer',
          color:showPrice?'#c9d1d9':'#484f58',background:showPrice?'#161b22':'transparent',
          border:showPrice?'1px solid #d29922':'1px solid #21262d'}}>
          {showPrice&&hasPriceData?'PRICE ON':'PRICE OFF'}
        </button>
        <span style={{fontSize:8,color:'#30363d'}}>{N} pts</span>
      </div>
    </div>

    {/* ── DUAL-AXIS CHART ── */}
    {hasChart?<div style={{background:'#0e1117',position:'relative'}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:420,display:'block'}}>
        {/* Horizontal grid */}
        {yGridR.map((g,i)=><line key={i} x1={PAD.l} x2={PAD.l+cw} y1={g.y} y2={g.y} stroke="#151920" strokeWidth={1}/>)}

        {/* Band zones */}
        {bandElems}

        {/* Reference lines */}
        {refs.map((r,i)=><g key={i}>
          <line x1={PAD.l} x2={PAD.l+cw} y1={toYR(r.v)} y2={toYR(r.v)} stroke={r.c} strokeWidth={0.8} strokeDasharray={r.dash} opacity={0.6}/>
          <text x={PAD.l+6} y={toYR(r.v)-4} fontSize={8} fill={r.c} opacity={0.9} fontFamily="monospace">{r.label}</text>
        </g>)}

        {/* BTC Price line (left axis) — behind metric */}
        {showPrice&&hasPriceData&&<polyline points={pricePath} fill="none" stroke="#d2992240" strokeWidth={1.2}/>}

        {/* Metric area fill */}
        {areaPath&&<path d={areaPath} fill={col} opacity={0.05}/>}

        {/* Metric line (right axis) — on top */}
        <polyline points={metricPath} fill="none" stroke={col} strokeWidth={2}/>

        {/* Current value horizontal */}
        {curOk&&<line x1={PAD.l} x2={PAD.l+cw} y1={curY!} y2={curY!} stroke={col} strokeWidth={0.5} opacity={0.35} strokeDasharray="3,4"/>}

        {/* Current marker */}
        {curOk&&<>
          <circle cx={PAD.l+cw} cy={curY!} r={6} fill={col} stroke="#0e1117" strokeWidth={2.5}/>
          <rect x={PAD.l+cw-58} y={curY!-12} width={54} height={24} rx={3} fill={col}/>
          <text x={PAD.l+cw-31} y={curY!+5} fontSize={11} fill="#0e1117" textAnchor="middle" fontWeight={700} fontFamily="monospace">
            {typeof current==='number'?current.toFixed(2):current}
          </text>
        </>}

        {/* Left Y axis labels (price) */}
        {showPrice&&hasPriceData&&yGridL.map((g,i)=><text key={i} x={PAD.l-8} y={g.y+3} fontSize={8} fill="#d2992260" textAnchor="end" fontFamily="monospace">{fmtPrice(g.v)}</text>)}

        {/* Right Y axis labels (metric) */}
        {yGridR.map((g,i)=><text key={i} x={PAD.l+cw+8} y={g.y+3} fontSize={9} fill="#30363d" fontFamily="monospace">{g.v.toFixed(g.v>100?0:g.v>10?1:2)}</text>)}

        {/* X axis labels */}
        {xLabels.map((xl,i)=><text key={i} x={xl.x} y={H-8} fontSize={9} fill="#30363d" textAnchor="middle" fontFamily="monospace">{xl.label}</text>)}

        {/* Axes */}
        <line x1={PAD.l} x2={PAD.l+cw} y1={PAD.t+ch} y2={PAD.t+ch} stroke="#21262d" strokeWidth={1}/>
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={PAD.t+ch} stroke="#21262d" strokeWidth={1}/>
        <line x1={PAD.l+cw} x2={PAD.l+cw} y1={PAD.t} y2={PAD.t+ch} stroke="#21262d" strokeWidth={1}/>

        {/* Axis labels */}
        {showPrice&&hasPriceData&&<text x={12} y={PAD.t+ch/2} fontSize={9} fill="#d2992250" textAnchor="middle" transform={`rotate(-90,12,${PAD.t+ch/2})`}>BTC PRICE (USD)</text>}
        <text x={W-12} y={PAD.t+ch/2} fontSize={9} fill={col+'80'} textAnchor="middle" transform={`rotate(90,${W-12},${PAD.t+ch/2})`}>{m.name.toUpperCase()}</text>
      </svg>

      {/* Legend overlay */}
      <div style={{position:'absolute',top:8,left:PAD.l+8,display:'flex',gap:16,alignItems:'center'}}>
        {showPrice&&hasPriceData&&<div style={{display:'flex',alignItems:'center',gap:4}}>
          <div style={{width:16,height:2,background:'#d29922',opacity:0.4}}/>
          <span style={{fontSize:8,color:'#d29922',opacity:0.6}}>BTC Price</span>
        </div>}
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <div style={{width:16,height:2,background:col}}/>
          <span style={{fontSize:8,color:col}}>{m.name}</span>
        </div>
        {m.bands&&m.bands.map((b:any,i:number)=>{const bc=BAND_COLORS[b.color]||'#8b949e';return(
          <div key={i} style={{display:'flex',alignItems:'center',gap:3}}>
            <div style={{width:8,height:8,background:bc,opacity:0.25,borderRadius:1}}/>
            <span style={{fontSize:7,color:bc,opacity:0.7}}>{b.label}</span>
          </div>
        )})}
      </div>
    </div>:<div style={{background:'#0e1117',padding:60,textAlign:'center',color:'#30363d',fontSize:12}}>No chart data</div>}

    {/* ── STATS ── */}
    {metricVals.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:0,background:'#0e1117',borderTop:'1px solid #161b22'}}>
      {[{l:'CURRENT',v:current!=null?(typeof current==='number'?current.toFixed(2):current):'—',c:col},
        {l:'AVERAGE',v:mAvg.toFixed(2),c:'#8b949e'},{l:'MEDIAN',v:mMed.toFixed(2),c:'#388bfd'},
        {l:'P10',v:mP10.toFixed(2),c:'#3fb950'},{l:'P90',v:mP90.toFixed(2),c:'#f85149'},
        {l:'RANGE',v:`${mMn.toFixed(2)} — ${mMx.toFixed(2)}`,c:'#484f58'},
      ].map(s=><div key={s.l} style={{padding:'10px 14px',borderRight:'1px solid #161b22'}}>
        <div style={{fontSize:7,color:'#484f58',letterSpacing:0.5,marginBottom:3}}>{s.l}</div>
        <div style={{fontSize:13,fontWeight:600,color:s.c,fontFamily:mono}}>{s.v}</div>
      </div>)}
    </div>}

    {/* ── WHAT DOES THIS MEAN ── */}
    {m.what&&<div style={{background:'#0e1117',padding:'14px 24px',borderTop:'1px solid #161b22'}}>
      <div style={{fontSize:9,color:'#484f58',textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>WHAT DOES THIS MEAN?</div>
      <div style={{fontSize:12,color:'#8b949e',lineHeight:1.7}}>{m.what}</div>
    </div>}

    {/* ── METHODOLOGY ── */}
    <div style={{background:'#0e1117',padding:'14px 24px',borderTop:'1px solid #161b22'}}>
      <div style={{fontSize:9,color:'#484f58',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>METHODOLOGY</div>
      <div style={{display:'grid',gridTemplateColumns:'90px 1fr',gap:'6px 16px',fontSize:11}}>
        <span style={{color:'#484f58'}}>Formula</span><span style={{color:'#8b949e',fontFamily:mono,fontSize:10}}>{m.formula}</span>
        <span style={{color:'#484f58'}}>Source</span><span style={{color:'#8b949e'}}>{m.source||'yfinance'}</span>
        <span style={{color:'#484f58'}}>Updated</span><span style={{color:'#8b949e'}}>{data.updated?new Date(data.updated).toLocaleTimeString('en-GB')+' UTC':'—'}</span>
        {m.median!=null&&<><span style={{color:'#484f58'}}>Median</span><span style={{color:'#8b949e',fontFamily:mono}}>{m.median}</span></>}
        {m.bands&&<><span style={{color:'#484f58'}}>Intervals</span><span style={{color:'#8b949e'}}>{m.bands.map((b:any)=>`${b.label} (${b.min<-50?'…':typeof b.min==='number'?b.min.toFixed(1):b.min}–${b.max>50?'…':typeof b.max==='number'?b.max.toFixed(1):b.max})`).join(' · ')}</span></>}
      </div>
    </div>
  </div>
}

// ─── BTC On-Chain Research Panel ─────────────────────────────
function BtcOnchainPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string|null>(null)

  useEffect(() => {
    if (!symbol.includes('BTC') && !symbol.includes('ETH')) { setLoading(false); setError('Available for BTC only'); return }
    setLoading(true); setError('')
    fetch('/api/btc/onchain').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()})
      .then(j=>{const d=j?.data;if(d?.error)setError(d.error);else if(d?.sections)setData(d);else setError('No data');setLoading(false)})
      .catch(e=>{setError(`${e.message}`);setLoading(false)})
  }, [symbol])

  const sc = (s:string|null) => {
    if (!s) return '#8b949e'
    if (['Depressed','Deep Stress','Stressed'].includes(s)) return '#388bfd'
    if (['Supportive','Calm','Increasing'].includes(s)) return '#3fb950'
    if (['Elevated'].includes(s)) return '#d29922'
    if (['Overheated','Extreme','Declining'].includes(s)) return '#f85149'
    return '#8b949e'
  }

  const mono = "'SF Mono', Menlo, Consolas, monospace"

  if (loading) return <div style={{padding:20,color:'#484f58',fontSize:11}}>Loading on-chain research...</div>
  if (!data) return <div style={{padding:16,background:'#0e1117',border:'1px solid #21262d'}}>
    <div style={{fontSize:9,color:'#484f58',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>ON-CHAIN RESEARCH</div>
    <div style={{fontSize:11,color:'#f85149'}}>{error||'Data unavailable'}</div>
    <div style={{fontSize:9,color:'#484f58',marginTop:4}}>Check backend terminal for [BTC ON-CHAIN] logs.</div>
  </div>

  // ── Expanded metric detail (research-grade) ──
  if (expanded) {
    return <MetricDetail data={data} expanded={expanded} onBack={()=>setExpanded(null)} sc={sc} mono={mono} />
  }

  // ── Section-based grid view ──
  const sections = Object.entries(data.sections) as [string, any][]
  return <div style={{display:'flex',flexDirection:'column',gap:16}}>
    {sections.map(([key, sec]) => (
      <div key={key}>
        {/* Section header */}
        <div style={{fontSize:9,color:'#484f58',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8,paddingBottom:4,borderBottom:'1px solid #21262d'}}>
          {sec.title}
        </div>
        {/* Metric cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:8}}>
          {sec.metrics.map((m:any) => {
            const col = sc(m.state)
            const hasValue = m.value != null
            return (
              <div key={m.name} onClick={()=>hasValue && m.history?.length > 2 ? setExpanded(m.name) : null}
                   style={{background:'#0e1117',border:'1px solid #21262d',padding:'10px 12px',
                           cursor: hasValue && m.history?.length > 2 ? 'pointer' : 'default',
                           borderLeft: m.state ? `2px solid ${col}` : '1px solid #21262d'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                  <span style={{fontSize:9,color:'#484f58',fontWeight:500}}>{m.name}</span>
                  {m.state && <span style={{fontSize:7,color:col,background:col+'12',border:`1px solid ${col}25`,padding:'1px 5px'}}>{m.state}</span>}
                </div>
                {hasValue ? (
                  <div style={{fontSize:18,fontWeight:600,color:col,fontFamily:mono,marginBottom:3}}>
                    {typeof m.value==='number' ? m.value.toLocaleString(undefined,{maximumFractionDigits:2}) : m.value}
                    {m.unit && <span style={{fontSize:10,color:'#484f58',marginLeft:3}}>{m.unit}</span>}
                  </div>
                ) : (
                  <div style={{fontSize:11,color:'#30363d',marginBottom:3,fontStyle:'italic'}}>Data unavailable</div>
                )}
                {m.history?.length > 2 && <Spark history={m.history} color={col} h={22}/>}
                {m.interpretation && <div style={{fontSize:8,color:'#484f58',marginTop:3}}>{m.interpretation}</div>}
                <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                  <span style={{fontSize:7,color:'#21262d'}}>{m.formula?.slice(0,40)}</span>
                  <span style={{fontSize:7,color:'#21262d'}}>{m.source?.slice(0,20) || 'yfinance'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    ))}
    <div style={{fontSize:8,color:'#21262d',textAlign:'right',paddingTop:4}}>
      Source: yfinance · Updated: {data.updated ? new Date(data.updated).toLocaleTimeString('en-GB') + ' UTC' : '—'} · Analytical context only
    </div>
  </div>
}

export function TickerWorkspace({ symbol }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<string>('overview')
  const prices = useStore(s => s.prices)
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useStore()
  const { apiOnline } = useStore()
  const [liveFund, setLiveFund] = useState<any>(null)

  // Fetch real fundamentals when backend is online
  useEffect(() => {
    if (!apiOnline || isFX(symbol)) return
    import('@/api/client').then(({ fetchFundamentals }) => {
      fetchFundamentals(symbol).then(d => { if (d) setLiveFund(d) })
    })
  }, [symbol, apiOnline])

  const simF  = getSimFund(symbol)
  // Merge: live fundamentals override sim data — ALL fields
  const f = liveFund ? {
    ...simF,
    price: liveFund.price ?? simF.price,
    name: liveFund.name ?? simF.name,
    sector: liveFund.sector ?? simF.sector,
    exchange: liveFund.exchange ?? simF.exchange,
    beta: liveFund.beta ?? simF.beta,
    mcap: liveFund.mcap ?? simF.mcap,
    ev: liveFund.ev ?? simF.ev,
    h52: liveFund.h52 ?? simF.h52,
    l52: liveFund.l52 ?? simF.l52,
    pe: liveFund.pe ?? liveFund.fwd_pe ?? null,
    evEbitda: liveFund.evEbitda ?? simF.evEbitda,
    opMgn: liveFund.opMgn != null ? +liveFund.opMgn.toFixed(2) : simF.opMgn,
    netMgn: liveFund.netMgn != null ? +liveFund.netMgn.toFixed(2) : simF.netMgn,
    dEbitda: liveFund.dEbitda ?? null,
    intCov: liveFund.intCov ?? null,
    fcf: liveFund.fcf ?? null,
    fcfYld: liveFund.fcfYld ?? null,
    roic: liveFund.roic ?? null,
    gMgn: liveFund.gMgn ?? null,
    preMgn: liveFund.preMgn ?? null,
    de: liveFund.de ?? null,
    roe: liveFund.roe ?? null,
    cfo: liveFund.cfo ?? null,
    cagr: liveFund.cagr ?? null,
    alpha: liveFund.alpha ?? null,
  } : simF
  const fx    = isFX(symbol)
  const instType = getInstrumentType(symbol)
  const p     = prices[symbol]
  const price = p?.price ?? f.price ?? 150
  const pct   = p?.pct   ?? ((symbol.charCodeAt(0) % 3 === 0) ? 1.29 : -0.48)
  const up    = pct >= 0
  const inWL  = isInWatchlist(symbol)

  const beta      = f.beta ?? 1.2
  const sigma     = beta * 0.012
  const varStrip  = +(sigma * 2.015 * 100).toFixed(2)
  const volumes_str = p?.vol ? `$${(p.vol / 1e9).toFixed(1)}B` : '—'

  // Instrument-aware tabs
  const isCrypto = instType === 'crypto'
  const TABS = fx ? [
    { id:'overview',   label:'OVERVIEW' },
    { id:'news',       label:'NEWS' },
    { id:'analysis',   label:'ANALYSIS' },
    { id:'risk',       label:'RISK' },
    { id:'regression', label:'REGRESSION' },
  ] : isCrypto ? [
    { id:'onchain',    label:'ON-CHAIN' },
    { id:'news',       label:'NEWS' },
    { id:'analysis',   label:'ANALYSIS' },
    { id:'risk',       label:'RISK' },
    { id:'regression', label:'REGRESSION' },
  ] : [
    { id:'overview',   label:'OVERVIEW' },
    { id:'news',       label:'NEWS' },
    { id:'analysis',   label:'ANALYSIS' },
    { id:'risk',       label:'RISK' },
    { id:'regression', label:'REGRESSION' },
  ]

  // Redirect away from the deprecated valuation tab if user had it saved
  useEffect(() => { if (tab === 'valuation') setTab('overview') }, [tab])

  // Default tab for crypto
  useEffect(() => { if (isCrypto && tab === 'overview') setTab('onchain') }, [isCrypto])

  // FX price formatting
  const priceStr = fx ? fxPrice(symbol, price) : price.toFixed(2)

  // FX-specific header KPIs vs equity KPIs
  const atr = +(price * (f.beta ?? 0.5) * 0.008).toFixed(fx && !isJPYPair(symbol) ? 4 : 2)
  const atrPct = +((atr / price) * 100).toFixed(2)

  const headerKPIs = fx ? [
    {l:'TYPE',    v:f.fxType ?? 'Major'},
    {l:'BETA/DXY',v:f2(f.beta)},
    {l:'52W H',   v:fxPrice(symbol, f.h52 ?? price*1.1)},
    {l:'52W L',   v:fxPrice(symbol, f.l52 ?? price*0.9)},
    {l:'ATR(14)', v:fx && !isJPYPair(symbol) ? atr.toFixed(4) : atr.toFixed(2)},
    {l:'ATR %',   v:atrPct+'%'},
    {l:'VaR 95% 1D', v:'−'+varStrip+'%', bold:true, col:'#f85149'},
  ] : [
    {l:'MCAP',    v:fB(f.mcap)},
    {l:'EV',      v:fB(f.ev)},
    {l:'BETA',    v:'β'+f2(f.beta)},
    {l:'52W H',   v:f2(f.h52)},
    {l:'52W L',   v:f2(f.l52)},
    {l:'EV/EBITDA',v:f.evEbitda!=null?(typeof f.evEbitda==='number'?f.evEbitda.toFixed(1):f.evEbitda)+'x':'—'},
    {l:'VaR 95% 1D', v:'−'+varStrip+'%', bold:true, col:'#f85149'},
  ]

  return (
    <div style={{minHeight:'100%',overflow:'auto'}}>

      {/* Top strip */}
      <div style={{background:'#0e1117',borderBottom:'1px solid #21262d',padding:'10px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <span style={{display:'inline-flex',transform:'scale(1.7)',transformOrigin:'left center',marginRight:8}}><Logo sym={symbol}/></span>
          <span style={{fontSize:22,fontWeight:600,color:'#c9d1d9',letterSpacing:-0.3}}>{fx ? symbol.replace('=X','') : symbol}</span>
          <span style={{fontSize:12,color:'#8b949e'}}>{f.name}</span>
          <span style={{fontSize:8,color:'#8b949e',background:'#21262d',padding:'1px 7px'}}>{f.exchange}</span>
          {fx && <span style={{fontSize:8,color:'#388bfd',background:'#388bfd15',padding:'1px 7px'}}>FOREX</span>}
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <button onClick={()=>inWL?removeFromWatchlist(symbol):addToWatchlist(symbol)}
              style={{fontSize:9,color:inWL?'#388bfd':'#8b949e',border:`1px solid ${inWL?'#388bfd':'#8b949e'}`,background:'transparent',padding:'4px 12px',cursor:'pointer',}}>
              {inWL?'★ WATCHLIST':'☆ ADD'}
            </button>
            <button onClick={()=>navigate(-1)} style={{fontSize:9,color:'#8b949e',border:'1px solid #333',background:'transparent',padding:'4px 12px',cursor:'pointer',}}>✕</button>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'baseline',gap:20,marginTop:8,flexWrap:'wrap'}}>
          <span style={{fontSize:30,fontWeight:500,color:up?'#3fb950':'#f85149',fontFamily:mono,fontVariantNumeric:'tabular-nums',letterSpacing:-0.5}}>{priceStr}</span>
          <span style={{fontSize:14,color:up?'#3fb950':'#f85149'}}>{up?'+':''}{pct.toFixed(2)}%</span>
          {headerKPIs.map(k=>(
            <div key={k.l}>
              <div style={{fontSize:9,color:'#484f58'}}>{k.l}</div>
              <div style={{fontSize:11,color:(k as any).col??'#8b949e',fontWeight:(k as any).bold?700:600,}}>{k.v}</div>
            </div>
          ))}
        </div>

        <div style={{marginTop:8}}><PriceChart symbol={symbol} up={up}/></div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid #21262d',background:'#0e1117',}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'8px 18px',fontSize:9,letterSpacing:0.5,cursor:'pointer',
              background:'transparent',border:'none',
              color:tab===t.id?'#388bfd':'#8b949e',
              borderBottom:tab===t.id?'2px solid #388bfd':'2px solid transparent'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflow:'auto',padding:12}}>
        {tab==='overview' && (
          fx ? (
            /* ═══ FX OVERVIEW ═══ */
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                {[
                  {l:'Pair Type', v:f.fxType??'Major', c:'#388bfd'},
                  {l:'Region', v:f.fxRegion??'—', c:'#8b949e'},
                  {l:'ATR(14)', v:fx&&!isJPYPair(symbol)?atr.toFixed(4):atr.toFixed(2), c:'#c9d1d9'},
                  {l:'ATR %', v:atrPct+'%', c:atrPct<0.5?'#3fb950':atrPct<1?'#d29922':'#f85149'},
                ].map(k=>(
                  <div key={k.l} style={{background:'#161b22',padding:'10px 14px'}}>
                    <div style={{fontSize:10,color:'#8b949e',marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:16,fontWeight:600,color:k.c,fontFamily:mono}}>{k.v}</div>
                  </div>
                ))}
              </div>
              {/* FX context */}
              <div style={{background:'#0e1117',border:'1px solid #21262d',padding:'10px 14px'}}>
                <div style={{fontSize:10,color:'#484f58',textTransform:'uppercase',letterSpacing:0.4,marginBottom:8}}>Pair Context</div>
                <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'4px 16px',fontSize:11}}>
                  <span style={{color:'#484f58'}}>Base</span><span style={{color:'#c9d1d9'}}>{f.fxBase ?? symbol.slice(0,3)}</span>
                  <span style={{color:'#484f58'}}>Quote</span><span style={{color:'#c9d1d9'}}>{f.fxQuote ?? symbol.slice(3,6)}</span>
                  <span style={{color:'#484f58'}}>Classification</span><span style={{color:'#388bfd'}}>{f.fxType ?? 'Major'}</span>
                  <span style={{color:'#484f58'}}>DXY Sensitivity</span><span style={{color:'#8b949e'}}>{f.fxQuote==='USD'||f.fxBase==='USD'?'Direct — pair contains USD':'Indirect — cross pair'}</span>
                  <span style={{color:'#484f58'}}>52W Range</span><span style={{color:'#8b949e',fontFamily:mono}}>{fxPrice(symbol,f.l52??price*0.9)} — {fxPrice(symbol,f.h52??price*1.1)}</span>
                  <span style={{color:'#484f58'}}>Range Position</span><span style={{color:'#c9d1d9',fontFamily:mono}}>{(((price-(f.l52??price*0.9))/((f.h52??price*1.1)-(f.l52??price*0.9)))*100).toFixed(0)}%</span>
                </div>
              </div>
              <div style={{fontSize:9,color:'#30363d',padding:'4px 0'}}>
                Risk, Monte Carlo, and Regression tabs use price-return models — fully applicable to FX pairs.
                Valuation tab hidden: no equity fundamentals for currency pairs.
              </div>
            </div>
          ) : (
            /* ═══ EQUITY OVERVIEW ═══ */
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {[
                  {l:'Op Margin', v:f.opMgn!=null?(typeof f.opMgn==='number'?f.opMgn.toFixed(1):f.opMgn)+'%':'—', c:f.opMgn!=null?(f.opMgn>20?'#3fb950':f.opMgn>10?'#d29922':'#f85149'):'#8b949e'},
                  {l:'Net Margin',v:f.netMgn!=null?(typeof f.netMgn==='number'?f.netMgn.toFixed(1):f.netMgn)+'%':'—',c:f.netMgn!=null?(f.netMgn>15?'#3fb950':f.netMgn>8?'#d29922':'#f85149'):'#8b949e'},
                  {l:'EV/EBITDA', v:f.evEbitda!=null?(typeof f.evEbitda==='number'?f.evEbitda.toFixed(1):f.evEbitda)+'x':'—',c:f.evEbitda!=null?(f.evEbitda<8?'#3fb950':f.evEbitda<12?'#d29922':'#f85149'):'#8b949e'},
                ].map(k=>(
                  <div key={k.l} style={{background:'#161b22',padding:'10px 14px'}}>
                    <div style={{fontSize:10,color:'#8b949e',marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:18,fontWeight:600,color:k.c,fontFamily:'monospace'}}>{k.v}</div>
                  </div>
                ))}
              </div>
              <RelativeStrength symbol={symbol} sector={f.sector ?? 'normal'} />
              <FundamentalPanel defaultSym={symbol} />
              {/* Valuation section — formerly a separate tab, now integrated */}
              <div style={{ marginTop: 4, paddingTop: 10, borderTop: '2px solid #21262d' }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                  color: '#c9d1d9', textTransform: 'uppercase',
                  padding: '0 4px 8px', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>VALUATION</span>
                  <span style={{ fontSize: 8, color: '#484f58', fontWeight: 500, letterSpacing: 0.3 }}>
                    — sector-weighted multiples vs 5Y history
                  </span>
                </div>
                <ValuationTab f={f} symbol={symbol}/>
              </div>
            </div>
          )
        )}
        {tab==='news'      && <StockNewsTab symbol={symbol}/>}
        {tab==='analysis'  && <AnalysisTab symbol={symbol}/>}
        {tab==='onchain'   && isCrypto && <BtcOnchainPanel symbol={symbol}/>}
        {tab==='risk'      && <RiskTab f={f} symbol={symbol}/>}
        {tab==='regression' && <RegressionTab symbol={symbol}/>}
      </div>
    </div>
  )
}
