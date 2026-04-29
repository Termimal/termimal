// pages/Charts.tsx — Charting workspace: TradingView-level drawing + indicators
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TvCandleChart, type ChartType } from '@/components/charts/TvCandleChart'
import { formatPrice, getPrecision, isForex, isCrypto } from '@/utils/formatPrice'
import { DrawingOverlay, Drawing, SelectedBounds } from '@/components/charts/DrawingOverlay'
import { ScenarioPanel, ScenarioOverlay, type ScenarioSet } from '@/components/charts/ScenarioPanel'
import { fetchPriceHistory } from '@/api/client'
import { Logo } from '@/components/common/Logo'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'

// ─── Timeframe options (expanded) ─────────────────────────────────
const TF_OPTIONS = [
  { key: '1d',  label: '1D'  },
  { key: '5d',  label: '5D'  },
  { key: '1mo', label: '1M'  },
  { key: '3mo', label: '3M'  },
  { key: '6mo', label: '6M'  },
  { key: '1y',  label: '1Y'  },
  { key: '2y',  label: '2Y'  },
  { key: '5y',  label: '5Y'  },
  { key: 'max', label: 'MAX' },
]

// ─── Chart type options ────────────────────────────────────────────
const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: 'candlestick', label: 'Candles' },
  { key: 'bars',        label: 'Bars' },
  { key: 'line',        label: 'Line' },
  { key: 'area',        label: 'Area' },
]

// ─── SVG icon helper ──────────────────────────────────────────────
const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

// ─── Drawing tools (vertical left toolbar) ────────────────────────
const DRAW_TOOLS: { id: string; icon: JSX.Element; title: string }[] = [
  { id: 'crosshair', icon: (<Icon><circle cx="8" cy="8" r="1" fill="currentColor"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3"/></Icon>), title: 'Cursor (click drawings to select, drag to move, Delete to remove)' },
  { id: 'trendline', icon: (<Icon><path d="M2 14L14 2"/><circle cx="2" cy="14" r="1.3" fill="currentColor"/><circle cx="14" cy="2" r="1.3" fill="currentColor"/></Icon>), title: 'Trend Line' },
  { id: 'hline',     icon: (<Icon><path d="M1 8h14"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/></Icon>), title: 'Horizontal Line' },
  { id: 'rect',      icon: (<Icon><rect x="2.5" y="4.5" width="11" height="7" rx="0.5"/></Icon>), title: 'Rectangle Zone' },
  { id: 'arrow',     icon: (<Icon><path d="M2 14L14 2"/><path d="M9 2h5v5"/></Icon>), title: 'Arrow' },
  { id: 'fib',       icon: (<Icon><path d="M1 3h14M1 6h14M1 9h14M1 12h14"/></Icon>), title: 'Fibonacci' },
  { id: 'text',      icon: (<svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor"><text x="3" y="13" fontSize="12" fontWeight="700" fontFamily="'SF Mono', Menlo, monospace">T</text></svg>), title: 'Text Annotation' },
]

// ─── Available indicators ─────────────────────────────────────────
const AVAILABLE_INDICATORS = [
  { id: 'vol',    label: 'Volume',            group: 'volume'  },
  { id: 'sma20',  label: 'SMA 20',            group: 'overlay' },
  { id: 'sma50',  label: 'SMA 50',            group: 'overlay' },
  { id: 'sma200', label: 'SMA 200',           group: 'overlay' },
  { id: 'ema20',  label: 'EMA 20',            group: 'overlay' },
  { id: 'ema50',  label: 'EMA 50',            group: 'overlay' },
  { id: 'bb',     label: 'Bollinger Bands',   group: 'overlay' },
  { id: 'vwap',   label: 'VWAP',              group: 'overlay' },
  { id: 'rsi',    label: 'RSI 14',            group: 'oscillator' },
  { id: 'macd',   label: 'MACD 12 26 9',      group: 'oscillator' },
]

const DEFAULT_INDICATORS = AVAILABLE_INDICATORS.map(i => ({ id: i.id, active: i.id === 'vol' }))

const mono = "'SF Mono', 'Fira Code', Menlo, Consolas, monospace"

const SYM_UNIVERSE = [
  // Stocks — Tech / AI
  {s:'AAPL',n:'Apple Inc',t:'Stock'},{s:'MSFT',n:'Microsoft',t:'Stock'},{s:'NVDA',n:'NVIDIA',t:'Stock'},
  {s:'GOOGL',n:'Alphabet',t:'Stock'},{s:'META',n:'Meta Platforms',t:'Stock'},{s:'AMZN',n:'Amazon',t:'Stock'},
  {s:'TSLA',n:'Tesla',t:'Stock'},{s:'AMD',n:'AMD',t:'Stock'},{s:'NFLX',n:'Netflix',t:'Stock'},
  {s:'AVGO',n:'Broadcom',t:'Stock'},{s:'TSM',n:'Taiwan Semi',t:'Stock'},{s:'ASML',n:'ASML Holding',t:'Stock'},
  {s:'INTC',n:'Intel',t:'Stock'},{s:'QCOM',n:'Qualcomm',t:'Stock'},{s:'MU',n:'Micron',t:'Stock'},
  {s:'ARM',n:'ARM Holdings',t:'Stock'},{s:'SMCI',n:'Super Micro',t:'Stock'},
  {s:'ORCL',n:'Oracle',t:'Stock'},{s:'CRM',n:'Salesforce',t:'Stock'},{s:'ADBE',n:'Adobe',t:'Stock'},
  {s:'IBM',n:'IBM',t:'Stock'},{s:'CSCO',n:'Cisco',t:'Stock'},{s:'PLTR',n:'Palantir',t:'Stock'},
  {s:'SNOW',n:'Snowflake',t:'Stock'},{s:'DDOG',n:'Datadog',t:'Stock'},{s:'NET',n:'Cloudflare',t:'Stock'},
  {s:'CRWD',n:'CrowdStrike',t:'Stock'},{s:'SHOP',n:'Shopify',t:'Stock'},{s:'UBER',n:'Uber',t:'Stock'},
  // Finance / Fintech
  {s:'JPM',n:'JPMorgan',t:'Stock'},{s:'BAC',n:'Bank of America',t:'Stock'},{s:'GS',n:'Goldman Sachs',t:'Stock'},
  {s:'WFC',n:'Wells Fargo',t:'Stock'},{s:'MS',n:'Morgan Stanley',t:'Stock'},{s:'C',n:'Citigroup',t:'Stock'},
  {s:'SCHW',n:'Charles Schwab',t:'Stock'},{s:'BX',n:'Blackstone',t:'Stock'},
  {s:'V',n:'Visa',t:'Stock'},{s:'MA',n:'Mastercard',t:'Stock'},{s:'PYPL',n:'PayPal',t:'Stock'},
  {s:'SQ',n:'Block',t:'Stock'},{s:'COIN',n:'Coinbase',t:'Stock'},{s:'HOOD',n:'Robinhood',t:'Stock'},
  {s:'MSTR',n:'MicroStrategy',t:'Stock'},{s:'BRK-B',n:'Berkshire Hathaway',t:'Stock'},
  // Healthcare / Pharma
  {s:'LLY',n:'Eli Lilly',t:'Stock'},{s:'JNJ',n:'Johnson & Johnson',t:'Stock'},{s:'UNH',n:'UnitedHealth',t:'Stock'},
  {s:'PFE',n:'Pfizer',t:'Stock'},{s:'MRK',n:'Merck',t:'Stock'},{s:'ABBV',n:'AbbVie',t:'Stock'},
  {s:'NVO',n:'Novo Nordisk',t:'Stock'},
  // Energy / Materials / Industrials
  {s:'XOM',n:'ExxonMobil',t:'Stock'},{s:'CVX',n:'Chevron',t:'Stock'},{s:'SHEL',n:'Shell',t:'Stock'},
  {s:'BP',n:'BP plc',t:'Stock'},{s:'CAT',n:'Caterpillar',t:'Stock'},{s:'DE',n:'Deere & Co',t:'Stock'},
  {s:'BA',n:'Boeing',t:'Stock'},{s:'GE',n:'GE Aerospace',t:'Stock'},
  // Consumer
  {s:'WMT',n:'Walmart',t:'Stock'},{s:'COST',n:'Costco',t:'Stock'},{s:'TGT',n:'Target',t:'Stock'},
  {s:'HD',n:'Home Depot',t:'Stock'},{s:'LOW',n:'Lowes',t:'Stock'},
  {s:'KO',n:'Coca-Cola',t:'Stock'},{s:'PEP',n:'PepsiCo',t:'Stock'},{s:'MCD',n:'McDonalds',t:'Stock'},
  {s:'SBUX',n:'Starbucks',t:'Stock'},{s:'NKE',n:'Nike',t:'Stock'},{s:'PG',n:'Procter & Gamble',t:'Stock'},
  {s:'DIS',n:'Disney',t:'Stock'},
  // Auto / Travel
  {s:'F',n:'Ford',t:'Stock'},{s:'GM',n:'General Motors',t:'Stock'},{s:'TM',n:'Toyota',t:'Stock'},
  {s:'UAL',n:'United Airlines',t:'Stock'},{s:'DAL',n:'Delta Air Lines',t:'Stock'},
  // Healthcare / pharma / biotech / med-devices
  {s:'TMO',n:'Thermo Fisher Scientific',t:'Stock'},{s:'DHR',n:'Danaher',t:'Stock'},{s:'ABT',n:'Abbott Laboratories',t:'Stock'},
  {s:'ISRG',n:'Intuitive Surgical',t:'Stock'},{s:'MDT',n:'Medtronic',t:'Stock'},{s:'GILD',n:'Gilead Sciences',t:'Stock'},
  {s:'AMGN',n:'Amgen',t:'Stock'},{s:'REGN',n:'Regeneron Pharmaceuticals',t:'Stock'},{s:'BMY',n:'Bristol-Myers Squibb',t:'Stock'},
  {s:'CVS',n:'CVS Health',t:'Stock'},{s:'ELV',n:'Elevance Health',t:'Stock'},{s:'CI',n:'Cigna',t:'Stock'},
  {s:'SYK',n:'Stryker',t:'Stock'},{s:'ZTS',n:'Zoetis',t:'Stock'},
  // Telecom / industrials / consulting / payments
  {s:'ACN',n:'Accenture',t:'Stock'},{s:'TXN',n:'Texas Instruments',t:'Stock'},{s:'VZ',n:'Verizon',t:'Stock'},
  {s:'CMCSA',n:'Comcast',t:'Stock'},{s:'PM',n:'Philip Morris International',t:'Stock'},{s:'MO',n:'Altria',t:'Stock'},
  {s:'RTX',n:'RTX Corporation',t:'Stock'},{s:'LMT',n:'Lockheed Martin',t:'Stock'},
  {s:'UPS',n:'United Parcel Service',t:'Stock'},{s:'HON',n:'Honeywell',t:'Stock'},{s:'ADP',n:'ADP',t:'Stock'},
  {s:'SPGI',n:'S&P Global',t:'Stock'},{s:'BLK',n:'BlackRock',t:'Stock'},{s:'MMC',n:'Marsh & McLennan',t:'Stock'},
  {s:'CB',n:'Chubb',t:'Stock'},{s:'PGR',n:'Progressive',t:'Stock'},
  {s:'BKNG',n:'Booking Holdings',t:'Stock'},{s:'NOW',n:'ServiceNow',t:'Stock'},
  {s:'TJX',n:'TJX Companies',t:'Stock'},{s:'MDLZ',n:'Mondelez International',t:'Stock'},
  {s:'LIN',n:'Linde plc',t:'Stock'},{s:'PLD',n:'Prologis',t:'Stock'},{s:'SO',n:'Southern Company',t:'Stock'},
  {s:'ADI',n:'Analog Devices',t:'Stock'},{s:'KLAC',n:'KLA Corporation',t:'Stock'},
  {s:'CDNS',n:'Cadence Design Systems',t:'Stock'},{s:'SNPS',n:'Synopsys',t:'Stock'},{s:'PANW',n:'Palo Alto Networks',t:'Stock'},
  {s:'ABNB',n:'Airbnb',t:'Stock'},{s:'RBLX',n:'Roblox',t:'Stock'},
  // Crypto-linked equities
  {s:'MARA',n:'Marathon Digital Holdings',t:'Stock'},{s:'RIOT',n:'Riot Platforms',t:'Stock'},
  // EV / Auto — Chinese EV makers
  {s:'RIVN',n:'Rivian Automotive',t:'Stock'},{s:'NIO',n:'NIO Inc',t:'Stock'},
  {s:'LI',n:'Li Auto',t:'Stock'},{s:'XPEV',n:'XPeng',t:'Stock'},
  // International ADRs
  {s:'BABA',n:'Alibaba Group',t:'Stock'},{s:'JD',n:'JD.com',t:'Stock'},
  {s:'PDD',n:'PDD Holdings',t:'Stock'},{s:'NTES',n:'NetEase',t:'Stock'},
  {s:'SAP',n:'SAP SE',t:'Stock'},{s:'SE',n:'Sea Limited',t:'Stock'},{s:'MELI',n:'MercadoLibre',t:'Stock'},
  // ETFs + indices
  {s:'SPY',n:'S&P 500 ETF',t:'ETF'},{s:'QQQ',n:'Nasdaq 100 ETF',t:'ETF'},{s:'IWM',n:'Russell 2000 ETF',t:'ETF'},
  {s:'DIA',n:'Dow Jones ETF',t:'ETF'},{s:'TLT',n:'20Y Treasury ETF',t:'ETF'},{s:'HYG',n:'High Yield ETF',t:'ETF'},
  {s:'GLD',n:'Gold ETF',t:'ETF'},{s:'SLV',n:'Silver ETF',t:'ETF'},
  {s:'XLF',n:'Financial ETF',t:'ETF'},{s:'XLE',n:'Energy ETF',t:'ETF'},{s:'XLK',n:'Technology ETF',t:'ETF'},
  {s:'XLV',n:'Health Care ETF',t:'ETF'},{s:'XLY',n:'Consumer Discretionary ETF',t:'ETF'},
  {s:'XLP',n:'Consumer Staples ETF',t:'ETF'},{s:'XLI',n:'Industrial ETF',t:'ETF'},{s:'XLU',n:'Utilities ETF',t:'ETF'},
  {s:'VTI',n:'Vanguard Total Market ETF',t:'ETF'},{s:'VOO',n:'Vanguard S&P 500 ETF',t:'ETF'},
  {s:'IVV',n:'iShares Core S&P 500 ETF',t:'ETF'},{s:'SCHD',n:'Schwab Dividend ETF',t:'ETF'},
  {s:'VGT',n:'Vanguard Tech ETF',t:'ETF'},{s:'ARKK',n:'ARK Innovation ETF',t:'ETF'},
  // Global indices
  {s:'^GSPC',n:'S&P 500',t:'Index'},{s:'^IXIC',n:'Nasdaq Composite',t:'Index'},
  {s:'^DJI',n:'Dow Jones Industrial',t:'Index'},{s:'^RUT',n:'Russell 2000',t:'Index'},
  {s:'^VIX',n:'VIX Volatility',t:'Index'},
  {s:'^GDAXI',n:'DAX',t:'Index'},{s:'^FTSE',n:'FTSE 100',t:'Index'},
  {s:'^FCHI',n:'CAC 40',t:'Index'},{s:'^STOXX50E',n:'Euro Stoxx 50',t:'Index'},
  {s:'^N225',n:'Nikkei 225',t:'Index'},{s:'^HSI',n:'Hang Seng',t:'Index'},
  {s:'000001.SS',n:'Shanghai Composite',t:'Index'},
  // Crypto
  {s:'BTC-USD',n:'Bitcoin',t:'Crypto'},{s:'ETH-USD',n:'Ethereum',t:'Crypto'},{s:'SOL-USD',n:'Solana',t:'Crypto'},
  {s:'BNB-USD',n:'Binance Coin',t:'Crypto'},{s:'XRP-USD',n:'Ripple',t:'Crypto'},{s:'ADA-USD',n:'Cardano',t:'Crypto'},
  {s:'AVAX-USD',n:'Avalanche',t:'Crypto'},{s:'DOGE-USD',n:'Dogecoin',t:'Crypto'},
  {s:'LINK-USD',n:'Chainlink',t:'Crypto'},{s:'MATIC-USD',n:'Polygon',t:'Crypto'},
  {s:'LTC-USD',n:'Litecoin',t:'Crypto'},{s:'DOT-USD',n:'Polkadot',t:'Crypto'},
  {s:'ARB-USD',n:'Arbitrum',t:'Crypto'},{s:'OP-USD',n:'Optimism',t:'Crypto'},
  {s:'TRX-USD',n:'TRON',t:'Crypto'},
  {s:'ATOM-USD',n:'Cosmos',t:'Crypto'},{s:'UNI-USD',n:'Uniswap',t:'Crypto'},
  {s:'ETC-USD',n:'Ethereum Classic',t:'Crypto'},{s:'FIL-USD',n:'Filecoin',t:'Crypto'},
  {s:'APT-USD',n:'Aptos',t:'Crypto'},
  // Forex
  {s:'EURUSD=X',n:'EUR/USD',t:'Forex'},{s:'GBPUSD=X',n:'GBP/USD',t:'Forex'},{s:'USDJPY=X',n:'USD/JPY',t:'Forex'},
  {s:'USDCHF=X',n:'USD/CHF',t:'Forex'},{s:'AUDUSD=X',n:'AUD/USD',t:'Forex'},{s:'USDCAD=X',n:'USD/CAD',t:'Forex'},
  {s:'NZDUSD=X',n:'NZD/USD',t:'Forex'},{s:'EURGBP=X',n:'EUR/GBP',t:'Forex'},{s:'EURJPY=X',n:'EUR/JPY',t:'Forex'},
  {s:'GBPJPY=X',n:'GBP/JPY',t:'Forex'},{s:'AUDJPY=X',n:'AUD/JPY',t:'Forex'},{s:'CHFJPY=X',n:'CHF/JPY',t:'Forex'},
  // Futures — Index + Rates + Commodities + Agriculturals
  {s:'ES=F',n:'S&P 500 E-mini',t:'Futures'},{s:'NQ=F',n:'Nasdaq 100 E-mini',t:'Futures'},
  {s:'YM=F',n:'Dow Jones E-mini',t:'Futures'},{s:'RTY=F',n:'Russell 2000 E-mini',t:'Futures'},
  {s:'ZN=F',n:'US 10Y Treasury',t:'Futures'},{s:'GE=F',n:'Eurodollar',t:'Futures'},
  {s:'GC=F',n:'Gold Futures',t:'Futures'},{s:'SI=F',n:'Silver Futures',t:'Futures'},
  {s:'HG=F',n:'Copper Futures',t:'Futures'},{s:'PL=F',n:'Platinum Futures',t:'Futures'},
  {s:'CL=F',n:'WTI Crude Oil',t:'Futures'},{s:'NG=F',n:'Natural Gas',t:'Futures'},
  {s:'HO=F',n:'Heating Oil',t:'Futures'},{s:'RB=F',n:'Gasoline Futures',t:'Futures'},
  {s:'ZC=F',n:'Corn Futures',t:'Futures'},{s:'ZW=F',n:'Wheat Futures',t:'Futures'},
  {s:'ZS=F',n:'Soybean Futures',t:'Futures'},{s:'KC=F',n:'Coffee Futures',t:'Futures'},
  {s:'SB=F',n:'Sugar Futures',t:'Futures'},
]

// ─── Color palette for drawings ────────────────────────────────────
const DRAWING_COLORS = [
  '#58a6ff', '#d29922', '#3fb950', '#f85149', '#a371f7', '#f0b429', '#8b949e', '#f0f6fc',
]

// ═══════════════════════════════════════════════════════════════════
// Charts page
// ═══════════════════════════════════════════════════════════════════
export function Charts() {
  const [searchParams] = useSearchParams()
  const paramSym = searchParams.get('sym')
  const [symbol, setSymbol] = useState(paramSym?.toUpperCase() || 'AAPL')
  const [input, setInput] = useState(paramSym?.toUpperCase() || 'AAPL')

  useEffect(() => {
    if (paramSym) {
      const s = paramSym.toUpperCase()
      setSymbol(s); setInput(s)
    }
  }, [paramSym])

  const [tf, setTf] = useState('6mo')
  const [mode, setMode] = useState<ChartType>('candlestick')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTool, setActiveTool] = useState('crosshair')
  const [indicators, setIndicators] = useState(DEFAULT_INDICATORS)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [selectedBounds, setSelectedBounds] = useState<SelectedBounds | null>(null)

  // Dropdowns
  const [symSearch, setSymSearch] = useState(false)
  const [tfOpen, setTfOpen] = useState(false)
  const [ctOpen, setCtOpen] = useState(false)
  const [indOpen, setIndOpen] = useState(false)

  // Chart
  const [chartSize, setChartSize] = useState({ w: 800, h: 500 })
  const [chartApi, setChartApi] = useState<IChartApi | null>(null)
  const [seriesApi, setSeriesApi] = useState<ISeriesApi<any> | null>(null)
  const [showScenarios, setShowScenarios] = useState(false)
  const [scenarios, setScenarios] = useState<ScenarioSet>([])
  // Broker order panel: opens when user clicks BUY/SELL. Shows broker selector
  // (Interactive Brokers, TD Ameritrade, etc.) → connect dialog → order entry.
  // Same TradingView-style flow.
  const [orderSide, setOrderSide] = useState<'buy' | 'sell' | null>(null)
  // When true, the broker modal opens directly on the POSITIONS tab instead of order entry.
  // Toggled by clicking the POSITIONS badge in the bid/ask bar.
  const [openToPositions, setOpenToPositions] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const onChartReady = useCallback((c: IChartApi, s: ISeriesApi<any>) => {
    setChartApi(c); setSeriesApi(s)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const close = () => { setTfOpen(false); setCtOpen(false); setIndOpen(false); setSymSearch(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    setLoading(true); setDrawings([]); setChartApi(null); setSeriesApi(null); setSelectedBounds(null)
    if (isForex(symbol) || isCrypto(symbol)) {
      if (mode === 'area') setMode('candlestick')
    }
    fetchPriceHistory(symbol, tf as any).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [symbol, tf])

  useEffect(() => {
    try { const s = localStorage.getItem(`ft-scenarios-${symbol}`); setScenarios(s ? JSON.parse(s) : []) } catch { setScenarios([]) }
  }, [symbol])

  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setChartSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const go = () => { const s = input.trim().toUpperCase(); if (s) { setSymbol(s); setInput(s); setSymSearch(false) } }
  const toggleIndicator = (id: string) => setIndicators(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i))

  // Update a single drawing by id
  const updateDrawing = (id: string, patch: Partial<Drawing>) => {
    setDrawings(drawings.map(d => d.id === id ? { ...d, ...patch } : d))
  }
  const deleteDrawing = (id: string) => setDrawings(drawings.filter(d => d.id !== id))

  const price = data?.close?.[data.close.length - 1]
  const prevPrice = data?.close?.[data.close.length - 2]
  const chg = price && prevPrice ? price - prevPrice : 0
  const pct = prevPrice ? (chg / prevPrice) * 100 : 0
  const col = chg >= 0 ? '#3fb950' : '#f85149'

  const activeCount = indicators.filter(i => i.active).length
  const currentTfLabel = TF_OPTIONS.find(t => t.key === tf)?.label ?? tf.toUpperCase()
  const currentCtLabel = CHART_TYPES.find(c => c.key === mode)?.label ?? 'Candles'

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* ═══ Left drawboard toolbar ═══ */}
      <div style={{ width: 44, background: '#0b0f14', borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 1, flexShrink: 0 }}>
        {DRAW_TOOLS.map(t => (
          <button key={t.id} title={t.title} onClick={() => setActiveTool(t.id)}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeTool === t.id ? 'rgba(56,139,253,0.15)' : 'transparent',
              color: activeTool === t.id ? '#58a6ff' : '#8b949e',
              border: 'none',
              borderLeft: activeTool === t.id ? '2px solid #58a6ff' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 120ms ease-out',
            }}
            onMouseOver={e => { if (activeTool !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseOut={e => { if (activeTool !== t.id) e.currentTarget.style.background = 'transparent' }}>
            {t.icon}
          </button>
        ))}

        {/* Divider */}
        <div style={{ width: 20, height: 1, background: '#21262d', margin: '6px 0' }}/>

        {/* Zoom in — narrow visible time range to ~75% */}
        <button title="Zoom in"
          disabled={!chartApi}
          onClick={() => {
            if (!chartApi) return
            try {
              const r = chartApi.timeScale().getVisibleLogicalRange()
              if (r) {
                const span = (r.to as number) - (r.from as number)
                const shrink = span * 0.125
                chartApi.timeScale().setVisibleLogicalRange({ from: (r.from as number) + shrink, to: (r.to as number) - shrink })
              }
            } catch {}
          }}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: chartApi ? '#8b949e' : '#30363d',
            border: 'none', cursor: chartApi ? 'pointer' : 'not-allowed',
          }}
          onMouseOver={e => { if (chartApi) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
          <Icon><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14M5 7h4M7 5v4" strokeLinecap="round"/></Icon>
        </button>

        {/* Zoom out — expand visible time range to ~133% */}
        <button title="Zoom out"
          disabled={!chartApi}
          onClick={() => {
            if (!chartApi) return
            try {
              const r = chartApi.timeScale().getVisibleLogicalRange()
              if (r) {
                const span = (r.to as number) - (r.from as number)
                const grow = span * 0.166
                chartApi.timeScale().setVisibleLogicalRange({ from: (r.from as number) - grow, to: (r.to as number) + grow })
              }
            } catch {}
          }}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: chartApi ? '#8b949e' : '#30363d',
            border: 'none', cursor: chartApi ? 'pointer' : 'not-allowed',
          }}
          onMouseOver={e => { if (chartApi) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
          <Icon><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14M5 7h4" strokeLinecap="round"/></Icon>
        </button>

        {/* Reset zoom — fit content + re-enable autoscale on price axis */}
        <button title="Reset zoom"
          disabled={!chartApi}
          onClick={() => {
            if (!chartApi) return
            try {
              chartApi.timeScale().fitContent()
              chartApi.priceScale('right').applyOptions({ autoScale: true })
              // Re-disable autoScale so user can pan vertically again
              setTimeout(() => { try { chartApi.priceScale('right').applyOptions({ autoScale: false }) } catch {} }, 50)
            } catch {}
          }}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: chartApi ? '#8b949e' : '#30363d',
            border: 'none', cursor: chartApi ? 'pointer' : 'not-allowed',
          }}
          onMouseOver={e => { if (chartApi) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
          <Icon><path d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3" strokeLinecap="round" strokeLinejoin="round"/></Icon>
        </button>

        {/* Divider */}
        <div style={{ width: 20, height: 1, background: '#21262d', margin: '6px 0' }}/>

        {/* Delete all button */}
        <button title="Delete selected (Del)"
          disabled={!drawings.some(d => d.selected)}
          onClick={() => setDrawings(drawings.filter(d => !d.selected))}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: drawings.some(d => d.selected) ? '#f85149' : '#30363d',
            border: 'none', cursor: drawings.some(d => d.selected) ? 'pointer' : 'not-allowed',
          }}>
          <Icon><path d="M4 4l8 8M12 4l-8 8"/></Icon>
        </button>
        <button title="Clear all drawings"
          disabled={drawings.length === 0}
          onClick={() => { if (confirm('Clear all drawings on this chart?')) setDrawings([]) }}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: drawings.length ? '#8b949e' : '#30363d',
            border: 'none', cursor: drawings.length ? 'pointer' : 'not-allowed',
          }}>
          <Icon><path d="M3 5h10M5 5V3h6v2M6 5v8M10 5v8M4 5l1 9h6l1-9"/></Icon>
        </button>
      </div>

      {/* ═══ Main column ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>

        {/* ─── Top toolbar ─── */}
        <div style={{ height: 36, background: '#0e1117', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 0, flexShrink: 0 }}>

          {/* Symbol search */}
          <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', marginRight: 6 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onClick={e => { e.stopPropagation(); setSymSearch(true) }}
              onFocus={() => setSymSearch(true)}
              onKeyDown={e => { if (e.key === 'Enter') go() }}
              placeholder="Symbol"
              style={{
                height: 28, width: 120, padding: '0 10px',
                background: '#0b0f14',
                border: `1px solid ${symSearch ? '#388bfd' : '#21262d'}`,
                borderRadius: 2,
                color: '#c9d1d9', fontSize: 12, fontWeight: 600, fontFamily: mono,
                letterSpacing: '0.3px', outline: 'none',
                transition: 'border-color 120ms ease-out',
              }}
            />
            {symSearch && input && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% - 3px)',
                  left: 0,
                  width: 300,
                  background: '#161b22',
                  border: '1px solid #30363d',
                  borderTop: 'none',
                  zIndex: 200,
                  maxHeight: 320,
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}>
                {(() => {
                  const matches = SYM_UNIVERSE.filter(u => u.s.includes(input) || u.n.toUpperCase().includes(input))
                  if (matches.length === 0) {
                    return (
                      <div style={{ padding: '10px 12px', fontSize: 11, color: '#8b949e', fontFamily: mono }}>
                        No matches. <span style={{ color: '#58a6ff' }}>Press Enter</span> to try "{input}".
                      </div>
                    )
                  }
                  return matches.slice(0, 12).map(t => (
                    <div key={t.s}
                      onClick={() => { setSymbol(t.s); setInput(t.s); setSymSearch(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '7px 12px',
                        cursor: 'pointer', gap: 10,
                        borderBottom: '1px solid #1c2128',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Logo sym={t.s}/>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#c9d1d9', fontFamily: mono, minWidth: 62 }}>{t.s}</span>
                      <span style={{ fontSize: 10, color: '#8b949e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.n}</span>
                      {t.t && (
                        <span style={{
                          fontSize: 9, color: '#8b949e',
                          background: '#0b0f14', border: '1px solid #30363d',
                          padding: '1px 5px', borderRadius: 2, letterSpacing: '0.3px', textTransform: 'uppercase',
                        }}>{t.t}</span>
                      )}
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>

          {/* Price */}
          {price && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', borderRight: '1px solid #21262d', height: '100%' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', fontFamily: mono }}>{formatPrice(symbol, price)}</span>
              <span style={{ fontSize: 10, color: col, fontFamily: mono }}>{chg >= 0 ? '+' : ''}{chg.toFixed(getPrecision(symbol))} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)</span>
            </div>
          )}

          {/* Timeframe dropdown */}
          <Dropdown
            label={currentTfLabel}
            open={tfOpen}
            onToggle={() => setTfOpen(!tfOpen)}
            items={TF_OPTIONS.map(t => ({ key: t.key, label: t.label }))}
            selected={tf}
            onSelect={(k) => { setTf(k); setTfOpen(false) }}
            width={64}
          />

          {/* Chart type dropdown */}
          <Dropdown
            label={currentCtLabel}
            open={ctOpen}
            onToggle={() => setCtOpen(!ctOpen)}
            items={CHART_TYPES.map(c => ({ key: c.key, label: c.label }))}
            selected={mode}
            onSelect={(k) => { setMode(k as ChartType); setCtOpen(false) }}
            width={88}
          />

          {/* Interval badge */}
          {data?.interval && (
            <span style={{ padding: '0 8px', fontSize: 9, color: '#484f58', display: 'flex', alignItems: 'center', borderRight: '1px solid #21262d', height: '100%', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              {data.interval}
            </span>
          )}

          {/* Indicators dropdown */}
          <div style={{ position: 'relative', height: '100%' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIndOpen(!indOpen)}
              style={{
                height: '100%', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6,
                background: indOpen ? '#161b22' : 'transparent', border: 'none',
                borderRight: '1px solid #21262d',
                color: activeCount > 0 ? '#c9d1d9' : '#8b949e', fontSize: 11,
                cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
              }}>
              <Icon><path d="M2 11l3-5 3 3 3-6 3 4"/></Icon>
              Indicators
              {activeCount > 0 && <span style={{ fontSize: 9, color: '#58a6ff', marginLeft: 2 }}>({activeCount})</span>}
            </button>
            {indOpen && (
              <div style={{ position: 'absolute', top: 36, left: 0, width: 220, background: '#161b22', border: '1px solid #30363d', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {['overlay', 'oscillator', 'volume'].map(group => {
                  const items = AVAILABLE_INDICATORS.filter(i => i.group === group)
                  return (
                    <div key={group}>
                      <div style={{ padding: '5px 10px 3px', fontSize: 9, color: '#484f58', fontFamily: mono, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{group}</div>
                      {items.map(ind => {
                        const active = indicators.find(i => i.id === ind.id)?.active
                        return (
                          <div key={ind.id} onClick={() => toggleIndicator(ind.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <span style={{ fontSize: 11, color: active ? '#c9d1d9' : '#8b949e' }}>{ind.label}</span>
                            <span style={{
                              width: 20, height: 12, borderRadius: 6,
                              background: active ? '#388bfd' : '#21262d',
                              position: 'relative', transition: 'all 120ms ease-out',
                            }}>
                              <span style={{
                                position: 'absolute', top: 1, left: active ? 9 : 1,
                                width: 10, height: 10, borderRadius: '50%',
                                background: '#fff', transition: 'left 120ms ease-out',
                              }}/>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Scenarios */}
          <span onClick={() => {
            const next = !showScenarios
            setShowScenarios(next)
            window.dispatchEvent(new CustomEvent('ft-scenario-panel', { detail: { open: next } }))
          }}
            style={{ padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer',
              color: showScenarios ? '#c9d1d9' : '#8b949e', borderRight: '1px solid #21262d' }}>
            <Icon><path d="M2 8l3-3 3 3 5-6"/></Icon>
            Scenarios{scenarios.length > 0 && <span style={{ fontSize: 9, color: '#58a6ff' }}>({scenarios.length})</span>}
          </span>

          {/* Info */}
          <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', height: '100%', gap: 8, marginLeft: 'auto' }}>
            {loading && <span style={{ fontSize: 10, color: '#484f58' }}>Loading...</span>}
            {activeTool !== 'crosshair' && activeTool !== 'select' && (
              <span style={{ fontSize: 10, color: '#58a6ff', fontFamily: mono, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                Drawing: {activeTool}
              </span>
            )}
            {drawings.length > 0 && (
              <span style={{ fontSize: 10, color: '#484f58', fontFamily: mono }}>
                {drawings.length} drawing{drawings.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {/* ─── Bid/Ask quick-trade bar (sits right below toolbar, above chart) ─── */}
        {price && (
          <div style={{ display: 'flex', alignItems: 'center', height: 38, background: 'transparent', padding: '0 12px', gap: 6 }}>
            {/* SELL — bid */}
            <button onClick={() => setOrderSide('sell')}
              title={`Sell ${symbol} — opens broker selector`}
              style={{
                background: 'transparent', border: '1px solid #f85149', borderRadius: 3,
                padding: '3px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                cursor: 'pointer', minWidth: 64,
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(248,81,73,0.08)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize: 11, color: '#f85149', fontFamily: mono, fontWeight: 600, lineHeight: 1.1 }}>
                {formatPrice(symbol, price * 0.9998)}
              </span>
              <span style={{ fontSize: 8, color: '#f85149', letterSpacing: 0.6, fontWeight: 600, marginTop: 1 }}>SELL</span>
            </button>
            {/* Spread between buttons — like TradingView's small "1" tick spread label */}
            <span style={{ fontSize: 10, color: '#484f58', fontFamily: mono, padding: '0 2px' }}>
              {Math.max(1, Math.round(price * 0.0004 * 100))}
            </span>
            {/* BUY — ask */}
            <button onClick={() => setOrderSide('buy')}
              title={`Buy ${symbol} — opens broker selector`}
              style={{
                background: 'transparent', border: '1px solid #58a6ff', borderRadius: 3,
                padding: '3px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                cursor: 'pointer', minWidth: 64,
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(88,166,255,0.08)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize: 11, color: '#58a6ff', fontFamily: mono, fontWeight: 600, lineHeight: 1.1 }}>
                {formatPrice(symbol, price * 1.0002)}
              </span>
              <span style={{ fontSize: 8, color: '#58a6ff', letterSpacing: 0.6, fontWeight: 600, marginTop: 1 }}>BUY</span>
            </button>

            {/* Broker status indicator — visible whenever a broker is connected */}
            <BrokerStatusBadge
              onOpenPositions={() => { setOpenToPositions(true); setOrderSide('buy') }}
            />
          </div>
        )}

        {/* ─── Chart area ─── */}
        <div ref={chartContainerRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {data ? (
            <>
              <TvCandleChart
                data={data} height={chartSize.h || 500}
                showVolume={indicators.some(i => i.id === 'vol' && i.active)}
                chartType={mode} symbol={symbol}
                onChartReady={onChartReady}
                indicators={indicators}
              />
              <DrawingOverlay
                activeTool={activeTool}
                width={chartSize.w || 800}
                height={chartSize.h || 500}
                drawings={drawings}
                onDrawingsChange={setDrawings}
                onSelectedBoundsChange={setSelectedBounds}
                chart={chartApi}
                series={seriesApi}
                storageKey={`${symbol}-${tf}`}
                onDrawingComplete={() => setActiveTool('crosshair')}
              />
              {scenarios.length > 0 && chartApi && seriesApi && (
                <ScenarioOverlay scenarios={scenarios} width={chartSize.w || 800} height={chartSize.h || 500} chart={chartApi} series={seriesApi} />
              )}

              {/* ═══ Floating properties toolbar (above selected drawing) ═══ */}
              {selectedBounds && (
                <FloatingDrawingToolbar
                  bounds={selectedBounds}
                  containerWidth={chartSize.w || 800}
                  onUpdate={(patch) => updateDrawing(selectedBounds.id, patch)}
                  onDelete={() => deleteDrawing(selectedBounds.id)}
                  onClose={() => setDrawings(drawings.map(d => ({ ...d, selected: false })))}
                />
              )}
            </>
          ) : loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: 12 }}>Loading {symbol}...</div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: 12 }}>Enter symbol + Enter</div>
          )}
        </div>
      </div>

      {/* ═══ Scenario panel ═══ */}
      {showScenarios && (
        <ScenarioPanel
          symbol={symbol} currentPrice={price ?? 0}
          onClose={() => { setShowScenarios(false); window.dispatchEvent(new CustomEvent('ft-scenario-panel', { detail: { open: false } })) }}
          scenarios={scenarios} onScenariosChange={setScenarios}
        />
      )}

      {/* ═══ Broker order modal ═══ */}
      {orderSide && price != null && (
        <BrokerOrderModal
          symbol={symbol} price={price} side={orderSide}
          initialMode={openToPositions ? 'positions' : undefined}
          onClose={() => { setOrderSide(null); setOpenToPositions(false) }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Dropdown (reusable)
// ═══════════════════════════════════════════════════════════════════
function Dropdown({ label, open, onToggle, items, selected, onSelect, width }: {
  label: string; open: boolean; onToggle: () => void
  items: { key: string; label: string }[]
  selected: string; onSelect: (k: string) => void
  width: number
}) {
  return (
    <div style={{ position: 'relative', height: '100%' }} onClick={e => e.stopPropagation()}>
      <button onClick={onToggle}
        style={{
          height: '100%', width, padding: '0 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
          background: open ? '#161b22' : 'transparent', border: 'none',
          borderRight: '1px solid #21262d',
          color: '#c9d1d9', fontSize: 11, cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif', fontWeight: 500,
        }}>
        <span>{label}</span>
        <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease-out', color: '#8b949e' }}>
          <path d="M2.5 3.5L5 6l2.5-2.5"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 36, left: 0, minWidth: width,
          background: '#161b22', border: '1px solid #30363d', zIndex: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {items.map(item => (
            <div key={item.key} onClick={() => onSelect(item.key)}
              style={{
                padding: '6px 12px', fontSize: 11, cursor: 'pointer',
                background: selected === item.key ? 'rgba(56,139,253,0.15)' : 'transparent',
                color: selected === item.key ? '#58a6ff' : '#c9d1d9',
                fontFamily: 'system-ui, sans-serif',
                borderLeft: selected === item.key ? '2px solid #58a6ff' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (selected !== item.key) e.currentTarget.style.background = '#1c2128' }}
              onMouseLeave={e => { if (selected !== item.key) e.currentTarget.style.background = 'transparent' }}>
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Floating drawing properties toolbar
// ═══════════════════════════════════════════════════════════════════
function FloatingDrawingToolbar({ bounds, containerWidth, onUpdate, onDelete, onClose }: {
  bounds: SelectedBounds
  containerWidth: number
  onUpdate: (patch: Partial<Drawing>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [colorOpen, setColorOpen] = useState(false)

  // Position: center above the bounds, but clamp to container width
  const toolbarW = 250
  let left = bounds.x + bounds.w / 2 - toolbarW / 2
  if (left < 6) left = 6
  if (left + toolbarW > containerWidth - 6) left = containerWidth - toolbarW - 6
  // Place above the bounds; if not enough space, place below
  const ABOVE_OFFSET = 38
  let top = bounds.y - ABOVE_OFFSET
  if (top < 8) top = bounds.y + bounds.h + 8

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', left, top, width: toolbarW, zIndex: 50,
        height: 30, background: '#161b22', border: '1px solid #30363d',
        borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: 2, padding: '0 4px',
      }}>
      {/* Color swatch */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setColorOpen(v => !v)} title="Color"
          style={{
            width: 22, height: 22, border: '1px solid #30363d', borderRadius: 2,
            background: bounds.color, cursor: 'pointer',
          }}/>
        {colorOpen && (
          <div style={{
            position: 'absolute', top: 26, left: 0, padding: 6,
            background: '#161b22', border: '1px solid #30363d', borderRadius: 3,
            display: 'grid', gridTemplateColumns: 'repeat(4, 20px)', gap: 4, zIndex: 60,
          }}>
            {DRAWING_COLORS.map(c => (
              <button key={c} onClick={() => { onUpdate({ color: c }); setColorOpen(false) }}
                style={{ width: 20, height: 20, background: c, border: bounds.color === c ? '2px solid #fff' : '1px solid #30363d', borderRadius: 2, cursor: 'pointer', padding: 0 }}/>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: 1, height: 16, background: '#30363d', margin: '0 2px' }}/>

      {/* Line width */}
      {([1, 2, 3] as const).map(w => (
        <button key={w} onClick={() => onUpdate({ lineWidth: w })} title={`${w}px`}
          style={{
            width: 22, height: 22, border: 'none', background: bounds.lineWidth === w ? 'rgba(56,139,253,0.2)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 2,
          }}>
          <div style={{ width: 14, height: w, background: bounds.lineWidth === w ? '#58a6ff' : '#8b949e', borderRadius: 1 }}/>
        </button>
      ))}

      <div style={{ width: 1, height: 16, background: '#30363d', margin: '0 2px' }}/>

      {/* Line style */}
      {([
        { key: 'solid' as const,  dashArr: '' },
        { key: 'dashed' as const, dashArr: '4,2' },
        { key: 'dotted' as const, dashArr: '1,2' },
      ]).map(s => (
        <button key={s.key} onClick={() => onUpdate({ lineStyle: s.key })} title={s.key}
          style={{
            width: 22, height: 22, border: 'none',
            background: bounds.lineStyle === s.key ? 'rgba(56,139,253,0.2)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 2,
          }}>
          <svg width={16} height={16} viewBox="0 0 16 16">
            <line x1={2} y1={8} x2={14} y2={8} stroke={bounds.lineStyle === s.key ? '#58a6ff' : '#8b949e'} strokeWidth={1.5} strokeDasharray={s.dashArr}/>
          </svg>
        </button>
      ))}

      <div style={{ width: 1, height: 16, background: '#30363d', margin: '0 2px' }}/>

      {/* Lock */}
      <button onClick={() => onUpdate({ locked: !bounds.locked })} title={bounds.locked ? 'Unlock' : 'Lock'}
        style={{
          width: 22, height: 22, border: 'none',
          background: bounds.locked ? 'rgba(210,153,34,0.2)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 2,
          color: bounds.locked ? '#d29922' : '#8b949e',
        }}>
        {bounds.locked
          ? <Icon><rect x={3} y={7} width={10} height={6} rx={1}/><path d="M5 7V5a3 3 0 116 0v2"/></Icon>
          : <Icon><rect x={3} y={7} width={10} height={6} rx={1}/><path d="M5 7V5a3 3 0 015.5-1.8"/></Icon>
        }
      </button>

      <div style={{ flex: 1 }}/>

      {/* Delete */}
      <button onClick={onDelete} title="Delete (Del)"
        style={{
          width: 22, height: 22, border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 2,
          color: '#f85149',
        }}
        onMouseOver={e => (e.currentTarget.style.background = 'rgba(248,81,73,0.15)')}
        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
        <Icon><path d="M3 5h10M5 5V3h6v2M6 5v8M10 5v8M4 5l1 9h6l1-9"/></Icon>
      </button>

      <div style={{ width: 1, height: 16, background: '#30363d', margin: '0 2px' }}/>

      {/* Close — dismiss toolbar without deleting the drawing */}
      <button onClick={onClose} title="Close (Esc)"
        style={{
          width: 22, height: 22, border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 2,
          color: '#8b949e',
        }}
        onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
        <Icon><path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"/></Icon>
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Broker order modal — TradingView-style flow
// ═══════════════════════════════════════════════════════════════════
// Three views: (1) broker selector grid, (2) connect/login dialog for chosen
// broker, (3) order entry form. Currently all simulated — connecting any of
// these brokers shows "Demo mode" since real broker integration requires
// API keys + OAuth handshakes.

const BROKERS = [
  // domain field used to fetch real broker logos from Clearbit CDN.
  // Cards fall back to the colored letter placeholder if logo fetch fails.
  { id: 'paper',     name: 'Paper Trading', tag: 'DEMO',    color: '#3fb950', rating: null,  featured: false, sub: 'Brokerage simulator by Termimal', domain: '' },
  { id: 'capital',   name: 'Capital.com',   tag: 'GLOBAL',  color: '#0b40a8', rating: 4.7,   featured: true,  sub: '', domain: 'capital.com' },
  { id: 'okx',       name: 'OKX',           tag: 'CRYPTO',  color: '#000000', rating: 4.9,   featured: false, sub: '', domain: 'okx.com' },
  { id: 'btcc',      name: 'BTCC',          tag: 'CRYPTO',  color: '#1366d6', rating: 4.7,   featured: false, sub: '', domain: 'btcc.com' },
  { id: 'thinkmkt',  name: 'ThinkMarkets',  tag: 'GLOBAL',  color: '#3a7d2e', rating: 4.6,   featured: false, sub: '', domain: 'thinkmarkets.com' },
  { id: 'amp',       name: 'AMP',           tag: 'FUTURES', color: '#3082d8', rating: 4.6,   featured: false, sub: '', domain: 'ampfutures.com' },
  { id: 'icmkt',     name: 'IC Markets',    tag: 'FX',      color: '#101010', rating: 4.6,   featured: false, sub: '', domain: 'icmarkets.com' },
  { id: 'fxcm',      name: 'FXCM',          tag: 'FX',      color: '#0066b3', rating: 4.6,   featured: false, sub: '', domain: 'fxcm.com' },
  { id: 'activ',     name: 'ActivTrades',   tag: 'GLOBAL',  color: '#1d2740', rating: 4.5,   featured: false, sub: '', domain: 'activtrades.com' },
  { id: 'oanda',     name: 'OANDA',         tag: 'FX',      color: '#1f3a93', rating: 4.5,   featured: false, sub: '', domain: 'oanda.com' },
  { id: 'avafutures',name: 'AvaFutures',    tag: 'FUTURES', color: '#9aa9b9', rating: 4.5,   featured: false, sub: '', domain: 'avafutures.com' },
  { id: 'forex',     name: 'FOREX.com',     tag: 'FX',      color: '#0d8b3c', rating: 4.5,   featured: false, sub: '', domain: 'forex.com' },
  { id: 'fxpro',     name: 'FxPro',         tag: 'GLOBAL',  color: '#d22e2e', rating: 4.5,   featured: false, sub: '', domain: 'fxpro.com' },
  { id: 'colmex',    name: 'ColmexPro',     tag: 'STOCKS',  color: '#e0e0e0', rating: 4.4,   featured: false, sub: '', domain: 'colmexpro.com' },
  { id: 'eightcap',  name: 'Eightcap',      tag: 'GLOBAL',  color: '#3fb950', rating: 4.4,   featured: false, sub: '', domain: 'eightcap.com' },
  { id: 'tickmill',  name: 'Tickmill',      tag: 'FX',      color: '#1d1d1d', rating: 4.4,   featured: false, sub: '', domain: 'tickmill.com' },
  { id: 'cmc',       name: 'CMC Markets',   tag: 'GLOBAL',  color: '#1d4f9e', rating: 4.3,   featured: false, sub: '', domain: 'cmcmarkets.com' },
  { id: 'ibkr',      name: 'Interactive Brokers', tag: 'GLOBAL', color: '#d22e2e', rating: 4.2, featured: false, sub: '', domain: 'interactivebrokers.com' },
  { id: 'tdam',      name: 'TD Ameritrade', tag: 'US',      color: '#76c043', rating: 4.4, featured: false, sub: '', domain: 'tdameritrade.com' },
  { id: 'schwab',    name: 'Charles Schwab',tag: 'US',      color: '#00a3e0', rating: 4.3, featured: false, sub: '', domain: 'schwab.com' },
  { id: 'tradier',   name: 'Tradier',       tag: 'US',      color: '#00bcd4', rating: 4.2, featured: false, sub: '', domain: 'tradier.com' },
  { id: 'alpaca',    name: 'Alpaca',        tag: 'US',      color: '#ffc107', rating: 4.4, featured: false, sub: '', domain: 'alpaca.markets' },
  { id: 'binance',   name: 'Binance',       tag: 'CRYPTO',  color: '#f0b90b', rating: 4.5, featured: false, sub: '', domain: 'binance.com' },
  { id: 'coinbase',  name: 'Coinbase',      tag: 'CRYPTO',  color: '#0052ff', rating: 4.3, featured: false, sub: '', domain: 'coinbase.com' },
  { id: 'kraken',    name: 'Kraken',        tag: 'CRYPTO',  color: '#5741d9', rating: 4.4, featured: false, sub: '', domain: 'kraken.com' },
  { id: 'tradovate', name: 'Tradovate',     tag: 'FUTURES', color: '#3a86ff', rating: 4.3, featured: false, sub: '', domain: 'tradovate.com' },
  { id: 'ninja',     name: 'NinjaTrader',   tag: 'FUTURES', color: '#ff6b35', rating: 4.4, featured: false, sub: '', domain: 'ninjatrader.com' },
]

function BrokerOrderModal({ symbol, price, side, onClose, initialMode }: {
  symbol: string
  price: number
  side: 'buy' | 'sell'
  onClose: () => void
  initialMode?: 'select' | 'connect' | 'order' | 'positions'
}) {
  const mono = "'SF Mono', Menlo, Consolas, monospace"
  // Three modes: 'select' = broker grid, 'connect' = chosen broker login screen,
  // 'order' = order entry, 'positions' = view open trades / history. User-selected
  // broker is persisted in localStorage so returning users skip the selector.
  const [mode, setMode] = useState<'select' | 'connect' | 'order' | 'positions'>(() => {
    if (initialMode) return initialMode
    try { return localStorage.getItem('ft-broker-active') ? 'order' : 'select' } catch { return 'select' }
  })
  const [broker, setBroker] = useState<typeof BROKERS[0] | null>(() => {
    try {
      const id = localStorage.getItem('ft-broker-active')
      return id ? BROKERS.find(b => b.id === id) ?? null : null
    } catch { return null }
  })
  const [qty, setQty] = useState('100')
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market')
  const [limitPrice, setLimitPrice] = useState(price.toFixed(2))
  const [submitted, setSubmitted] = useState(false)
  const [brokerQuery, setBrokerQuery] = useState('')

  const sideColor = side === 'buy' ? '#3fb950' : '#f85149'
  const fillPrice = side === 'buy' ? price * 1.0002 : price * 0.9998

  // Filter brokers by search query (matches name or tag)
  const filteredBrokers = brokerQuery.trim()
    ? BROKERS.filter(b => {
        const q = brokerQuery.trim().toUpperCase()
        return b.name.toUpperCase().includes(q) || b.tag.includes(q)
      })
    : BROKERS

  // Esc closes modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pickBroker = (b: typeof BROKERS[0]) => {
    setBroker(b)
    setMode('connect')
  }
  const confirmConnect = () => {
    if (!broker) return
    try { localStorage.setItem('ft-broker-active', broker.id) } catch {}
    setMode('order')
  }
  // Persisted paper-trade store — keyed under 'ft-paper-trades-equity' so it doesn't
  // collide with the existing Polymarket paper trading store. Each entry is an
  // open position; close removes it from this list and appends to history.
  type PaperTrade = {
    id: string; symbol: string; side: 'buy' | 'sell'; qty: number;
    entryPrice: number; entryTime: string; orderType: 'market' | 'limit' | 'stop'
  }
  type PaperHistory = PaperTrade & { exitPrice: number; exitTime: string; pnl: number }
  const POS_KEY  = 'ft-paper-trades-equity'
  const HIST_KEY = 'ft-paper-history-equity'
  const loadPositions = (): PaperTrade[] => { try { return JSON.parse(localStorage.getItem(POS_KEY) || '[]') } catch { return [] } }
  const loadHistory   = (): PaperHistory[] => { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]') } catch { return [] } }

  const submitOrder = () => {
    if (!broker) return
    if (broker.id === 'paper') {
      // Real paper trade: persist to localStorage so user can view in POSITIONS tab.
      const fillP = orderType === 'market' ? fillPrice : Number(limitPrice)
      const trade: PaperTrade = {
        id: Date.now().toString(),
        symbol, side, qty: Number(qty),
        entryPrice: fillP, entryTime: new Date().toISOString(),
        orderType,
      }
      const positions = loadPositions()
      positions.push(trade)
      try { localStorage.setItem(POS_KEY, JSON.stringify(positions)) } catch {}
    }
    setSubmitted(true)
    setTimeout(() => onClose(), 1200)
  }
  const switchBroker = () => {
    try { localStorage.removeItem('ft-broker-active') } catch {}
    setBroker(null); setMode('select')
  }

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: '#0d1117', border: '1px solid #30363d', borderRadius: 6,
          // Wider for the broker grid (mode 'select'); narrower otherwise.
          width: mode === 'select' ? 880 : 460,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', gap: 12 }}>
          {mode === 'select' ? (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#c9d1d9', fontWeight: 600 }}>Trade with your broker</div>
                <div style={{ fontSize: 10, color: '#8b949e', marginTop: 2 }}>
                  <span style={{ color: sideColor, fontWeight: 600 }}>{side.toUpperCase()}</span>
                  <span style={{ color: '#484f58' }}> · </span>
                  <span style={{ fontFamily: mono }}>{symbol}</span>
                  <span style={{ color: '#484f58' }}> · </span>
                  <span style={{ fontFamily: mono }}>{formatPrice(symbol, side === 'buy' ? price * 1.0002 : price * 0.9998)}</span>
                </div>
              </div>
              <input type="text" placeholder="Search broker..." value={brokerQuery} onChange={e => setBrokerQuery(e.target.value)}
                style={{ width: 200, padding: '6px 10px', background: '#0b0f14', border: '1px solid #30363d', color: '#c9d1d9', fontSize: 11, borderRadius: 3, outline: 'none', fontFamily: 'system-ui, sans-serif' }}/>
            </>
          ) : (
            <>
              <span style={{ width: 6, height: 24, background: sideColor, borderRadius: 1 }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: sideColor, fontWeight: 700, letterSpacing: 0.5 }}>
                  {side.toUpperCase()} {symbol}
                </div>
                <div style={{ fontSize: 9, color: '#8b949e', fontFamily: mono, marginTop: 2 }}>
                  {mode === 'connect' && `CONNECT ${broker?.name.toUpperCase()}`}
                  {mode === 'order' && `${broker?.name.toUpperCase()} · ORDER ENTRY`}
                </div>
              </div>
            </>
          )}
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: mode === 'select' ? '16px 18px 18px' : 14, overflowY: 'auto' }}>
          {mode === 'select' && (
            <>
              {/* Optional promo banner — keeps layout aligned with TradingView's reference */}
              <div style={{ padding: '10px 14px', marginBottom: 14, background: 'linear-gradient(90deg, rgba(125,211,252,0.08), rgba(192,132,252,0.08))', border: '1px solid rgba(125,211,252,0.15)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#c9d1d9' }}>
                <span style={{ flex: 1 }}>
                  Prove your edge in the market with paper trading — risk-free practice.
                </span>
                <button onClick={() => pickBroker(BROKERS[0])}
                  style={{ background: 'transparent', border: 'none', color: '#7dd3fc', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  Try Paper Trading →
                </button>
              </div>

              {/* Broker grid — 6 columns, square cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {filteredBrokers.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center', fontSize: 11, color: '#484f58' }}>
                    No brokers match "{brokerQuery}"
                  </div>
                )}
                {filteredBrokers.map(b => (
                  <button key={b.id} onClick={() => pickBroker(b)}
                    style={{
                      padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, background: '#161b22', border: '1px solid #21262d', borderRadius: 4,
                      cursor: 'pointer', position: 'relative', minHeight: 110,
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#1c2128'; e.currentTarget.style.borderColor = '#58a6ff' }}
                    onMouseOut={e => { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.borderColor = '#21262d' }}>
                    {b.featured && (
                      <span style={{
                        position: 'absolute', top: 6, left: 6, fontSize: 7, fontWeight: 700, letterSpacing: 0.5,
                        color: '#0e1117', background: '#d29922', padding: '2px 5px', borderRadius: 2,
                      }}>FEATURED</span>
                    )}
                    {/* Real broker logo via Clearbit, falls back to colored letter */}
                    <BrokerLogo broker={b}/>
                    <div style={{ fontSize: 11, color: '#c9d1d9', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                      {b.name}
                    </div>
                    {b.rating != null ? (
                      <div style={{ fontSize: 10, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ color: '#d29922' }}>★</span>
                        <span style={{ fontFamily: mono }}>{b.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 8, color: '#484f58', letterSpacing: 0.4, lineHeight: 1.3, textAlign: 'center' }}>
                        {b.sub}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 16, padding: '10px 0', textAlign: 'center', borderTop: '1px solid #21262d' }}>
                <span style={{ fontSize: 10, color: '#8b949e' }}>+ Need a broker not listed?</span>
              </div>
            </>
          )}
          {mode === 'connect' && broker && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: 12, background: '#161b22', border: '1px solid #21262d', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: broker.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 12, color: '#c9d1d9', fontWeight: 600 }}>{broker.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#484f58' }}>{broker.tag}</span>
              </div>
              <div style={{ fontSize: 10, color: '#8b949e', lineHeight: 1.6 }}>
                Connecting to {broker.name} requires OAuth or API key authentication. Termimal will open a secure connection in a new window — your credentials never touch the terminal.
              </div>
              <div style={{ padding: 8, background: '#21262d', border: '1px solid #30363d', borderRadius: 3, fontSize: 9, color: '#d29922', fontFamily: mono, letterSpacing: 0.3 }}>
                DEMO MODE · Real broker integration is not yet connected. Continuing will simulate the order entry experience without placing a live trade.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setMode('select')}
                  style={{ flex: 1, padding: '8px 0', background: 'transparent', border: '1px solid #30363d', color: '#8b949e', cursor: 'pointer', fontSize: 10, borderRadius: 3, letterSpacing: 0.3 }}>
                  ← Back
                </button>
                <button onClick={confirmConnect}
                  style={{ flex: 2, padding: '8px 0', background: broker.color, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 10, borderRadius: 3, fontWeight: 700, letterSpacing: 0.3 }}>
                  CONNECT (DEMO)
                </button>
              </div>
            </div>
          )}
          {(mode === 'order' || mode === 'positions') && broker && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Tab strip */}
              {!submitted && (
                <div style={{ display: 'flex', borderBottom: '1px solid #21262d', marginBottom: 4 }}>
                  {(['order', 'positions'] as const).map(tab => (
                    <button key={tab} onClick={() => setMode(tab)}
                      style={{
                        padding: '6px 12px', background: 'transparent', border: 'none',
                        borderBottom: '2px solid ' + (mode === tab ? '#58a6ff' : 'transparent'),
                        color: mode === tab ? '#c9d1d9' : '#8b949e',
                        fontSize: 10, letterSpacing: 0.4, cursor: 'pointer',
                        fontWeight: mode === tab ? 600 : 400,
                      }}>
                      {tab === 'order' ? 'ORDER ENTRY' : `POSITIONS (${loadPositions().length})`}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'positions' ? (
                <PaperPositions
                  symbol={symbol} price={price} broker={broker}
                  onSwitchBroker={switchBroker}
                  onClose={onClose}
                />
              ) : submitted ? (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, color: sideColor, marginBottom: 8 }}>✓</div>
                  <div style={{ fontSize: 12, color: '#c9d1d9', fontWeight: 600 }}>ORDER SIMULATED</div>
                  <div style={{ fontSize: 10, color: '#8b949e', marginTop: 6, fontFamily: mono }}>
                    {side.toUpperCase()} {qty} {symbol} @ {orderType === 'market' ? '~$' + fillPrice.toFixed(2) : '$' + limitPrice} · {broker.name}
                  </div>
                </div>
              ) : (
                <>
                  {/* Order type toggles */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['market', 'limit', 'stop'] as const).map(t => (
                      <button key={t} onClick={() => setOrderType(t)}
                        style={{
                          flex: 1, padding: '6px 0',
                          background: orderType === t ? '#21262d' : 'transparent',
                          border: '1px solid ' + (orderType === t ? '#58a6ff' : '#30363d'),
                          color: orderType === t ? '#c9d1d9' : '#8b949e',
                          cursor: 'pointer', fontSize: 10, borderRadius: 3,
                          letterSpacing: 0.3, textTransform: 'uppercase',
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {/* Quantity input */}
                  <div>
                    <div style={{ fontSize: 9, color: '#8b949e', marginBottom: 4, letterSpacing: 0.4 }}>QUANTITY</div>
                    <input type="number" value={qty} onChange={e => setQty(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: '#0b0f14', border: '1px solid #30363d', color: '#c9d1d9', fontSize: 13, fontFamily: mono, borderRadius: 3, outline: 'none' }}/>
                  </div>
                  {orderType !== 'market' && (
                    <div>
                      <div style={{ fontSize: 9, color: '#8b949e', marginBottom: 4, letterSpacing: 0.4 }}>{orderType === 'limit' ? 'LIMIT' : 'STOP'} PRICE</div>
                      <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} step="0.01"
                        style={{ width: '100%', padding: '8px 10px', background: '#0b0f14', border: '1px solid #30363d', color: '#c9d1d9', fontSize: 13, fontFamily: mono, borderRadius: 3, outline: 'none' }}/>
                    </div>
                  )}
                  {/* Estimated cost */}
                  <div style={{ padding: '8px 10px', background: '#161b22', border: '1px solid #21262d', borderRadius: 3, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: mono }}>
                    <span style={{ color: '#8b949e' }}>EST. {side === 'buy' ? 'COST' : 'PROCEEDS'}</span>
                    <span style={{ color: '#c9d1d9', fontWeight: 600 }}>
                      ${(Number(qty) * (orderType === 'market' ? fillPrice : Number(limitPrice))).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {/* Action */}
                  <button onClick={submitOrder}
                    style={{
                      padding: '10px 0', background: sideColor, border: 'none',
                      color: '#0e1117', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      borderRadius: 3, letterSpacing: 0.4,
                    }}>
                    {side === 'buy' ? 'PLACE BUY ORDER' : 'PLACE SELL ORDER'}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#484f58' }}>
                    <span>
                      {broker.name}
                      {broker.id !== 'paper' && <span style={{ color: '#d29922', marginLeft: 4 }}>· DEMO</span>}
                      {broker.id === 'paper' && <span style={{ color: '#3fb950', marginLeft: 4 }}>· LIVE PAPER</span>}
                    </span>
                    <button onClick={switchBroker}
                      title="Disconnect broker — pick a different one"
                      style={{ background: 'transparent', border: '1px solid #30363d', color: '#f85149', cursor: 'pointer', fontSize: 9, padding: '3px 8px', borderRadius: 2, letterSpacing: 0.3 }}>
                      LOG OUT
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── BrokerLogo: fetches real logo from Clearbit, falls back to colored letter ───
function BrokerLogo({ broker }: { broker: typeof BROKERS[0] }) {
  const [failed, setFailed] = useState(false)
  const useFallback = !broker.domain || failed
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 6,
      // Background color shows during image load AND as fallback letter background
      background: useFallback ? broker.color : '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, fontWeight: 700,
      color: useFallback
        ? (broker.color === '#e0e0e0' || broker.color === '#9aa9b9' ? '#1d1d1d' : '#fff')
        : '#fff',
      letterSpacing: -0.5, flexShrink: 0, overflow: 'hidden', position: 'relative',
    }}>
      {useFallback ? broker.name.charAt(0) : (
        <img
          src={`https://logo.clearbit.com/${broker.domain}`}
          alt={broker.name}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
        />
      )}
    </div>
  )
}

// ─── PaperPositions: list of open paper trades + history, with close + log-out actions ───
function PaperPositions({ symbol, price, broker, onSwitchBroker, onClose }: {
  symbol: string
  price: number
  broker: typeof BROKERS[0]
  onSwitchBroker: () => void
  onClose: () => void
}) {
  const mono = "'SF Mono', Menlo, Consolas, monospace"
  const POS_KEY = 'ft-paper-trades-equity'
  const HIST_KEY = 'ft-paper-history-equity'
  const [tick, setTick] = useState(0)  // refresh trigger after closing a trade

  type PaperTrade = {
    id: string; symbol: string; side: 'buy' | 'sell'; qty: number
    entryPrice: number; entryTime: string; orderType: string
  }
  type PaperHistory = PaperTrade & { exitPrice: number; exitTime: string; pnl: number }

  const positions: PaperTrade[] = (() => { try { return JSON.parse(localStorage.getItem(POS_KEY) || '[]') } catch { return [] } })()
  const history:   PaperHistory[] = (() => { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]') } catch { return [] } })()
  void tick  // ensure re-render after closeTrade

  const closeTrade = (t: PaperTrade) => {
    // Need a price to close at — use the current price for the trade's symbol if it
    // matches the open ticker context, otherwise fall back to entry price (not great
    // but better than crashing when closing a position for a different symbol).
    const exitP = t.symbol === symbol ? price : t.entryPrice
    const dir = t.side === 'buy' ? 1 : -1
    const pnl = (exitP - t.entryPrice) * t.qty * dir
    const closed: PaperHistory = { ...t, exitPrice: exitP, exitTime: new Date().toISOString(), pnl }
    const newPos  = positions.filter(p => p.id !== t.id)
    const newHist = [closed, ...history].slice(0, 200)  // cap at 200
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(newPos))
      localStorage.setItem(HIST_KEY, JSON.stringify(newHist))
    } catch {}
    setTick(t2 => t2 + 1)
  }

  const totalUnrealized = positions.reduce((sum, t) => {
    if (t.symbol !== symbol) return sum  // can only mark-to-market the current ticker
    const dir = t.side === 'buy' ? 1 : -1
    return sum + (price - t.entryPrice) * t.qty * dir
  }, 0)
  const totalRealized = history.reduce((s, h) => s + h.pnl, 0)

  const fmtUsd = (n: number) => `${n >= 0 ? '+' : ''}$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return iso }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, padding: '8px 10px', background: '#161b22', border: '1px solid #21262d', borderRadius: 3 }}>
          <div style={{ fontSize: 8, color: '#484f58', letterSpacing: 0.4 }}>OPEN POSITIONS</div>
          <div style={{ fontSize: 14, color: '#c9d1d9', fontFamily: mono, fontWeight: 600 }}>{positions.length}</div>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', background: '#161b22', border: '1px solid #21262d', borderRadius: 3 }}>
          <div style={{ fontSize: 8, color: '#484f58', letterSpacing: 0.4 }}>UNREALIZED ({symbol})</div>
          <div style={{ fontSize: 12, color: totalUnrealized >= 0 ? '#3fb950' : '#f85149', fontFamily: mono, fontWeight: 600 }}>
            {fmtUsd(totalUnrealized)}
          </div>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', background: '#161b22', border: '1px solid #21262d', borderRadius: 3 }}>
          <div style={{ fontSize: 8, color: '#484f58', letterSpacing: 0.4 }}>REALIZED P&L</div>
          <div style={{ fontSize: 12, color: totalRealized >= 0 ? '#3fb950' : '#f85149', fontFamily: mono, fontWeight: 600 }}>
            {fmtUsd(totalRealized)}
          </div>
        </div>
      </div>

      {/* Open positions */}
      <div>
        <div style={{ fontSize: 9, color: '#8b949e', letterSpacing: 0.5, fontWeight: 600, padding: '4px 0' }}>OPEN POSITIONS</div>
        {positions.length === 0 ? (
          <div style={{ padding: '14px 10px', textAlign: 'center', fontSize: 10, color: '#484f58', background: '#0b0f14', border: '1px dashed #21262d', borderRadius: 3 }}>
            No open positions. Place a trade from the ORDER ENTRY tab.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {positions.map(t => {
              const dir = t.side === 'buy' ? 1 : -1
              const mark = t.symbol === symbol ? price : t.entryPrice
              const pnl  = (mark - t.entryPrice) * t.qty * dir
              const pnlPct = ((mark - t.entryPrice) / t.entryPrice) * 100 * dir
              const sideC = t.side === 'buy' ? '#3fb950' : '#f85149'
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#161b22', border: '1px solid #21262d', borderRadius: 3, fontSize: 10, fontFamily: mono }}>
                  <span style={{ color: sideC, fontWeight: 700, minWidth: 32 }}>{t.side.toUpperCase()}</span>
                  <span style={{ color: '#c9d1d9', fontWeight: 600, minWidth: 56 }}>{t.symbol}</span>
                  <span style={{ color: '#8b949e', minWidth: 36 }}>{t.qty}</span>
                  <span style={{ color: '#8b949e' }}>@</span>
                  <span style={{ color: '#c9d1d9' }}>${t.entryPrice.toFixed(2)}</span>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    {t.symbol === symbol ? (
                      <span style={{ color: pnl >= 0 ? '#3fb950' : '#f85149', fontWeight: 600 }}>
                        {fmtUsd(pnl)} <span style={{ fontSize: 9, opacity: 0.7 }}>({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                      </span>
                    ) : (
                      <span style={{ color: '#484f58', fontSize: 9 }}>switch to {t.symbol} for live P&L</span>
                    )}
                  </div>
                  <button onClick={() => closeTrade(t)}
                    title={`Close at ${t.symbol === symbol ? '$' + price.toFixed(2) : 'entry price'}`}
                    style={{ background: 'transparent', border: '1px solid #30363d', color: '#f85149', cursor: 'pointer', fontSize: 9, padding: '3px 8px', borderRadius: 2, fontFamily: 'system-ui' }}>
                    CLOSE
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: '#8b949e', letterSpacing: 0.5, fontWeight: 600, padding: '4px 0' }}>
            RECENT TRADES ({history.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 200, overflowY: 'auto' }}>
            {history.slice(0, 50).map((h, i) => {
              const sideC = h.side === 'buy' ? '#3fb950' : '#f85149'
              const pnlC  = h.pnl >= 0 ? '#3fb950' : '#f85149'
              return (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 10px', background: '#0b0f14', border: '1px solid #1c2128', borderRadius: 2, fontSize: 9, fontFamily: mono, color: '#8b949e' }}>
                  <span style={{ color: sideC, fontWeight: 600, minWidth: 30 }}>{h.side.toUpperCase()}</span>
                  <span style={{ color: '#c9d1d9', minWidth: 50 }}>{h.symbol}</span>
                  <span style={{ minWidth: 30 }}>{h.qty}</span>
                  <span>${h.entryPrice.toFixed(2)} → ${h.exitPrice.toFixed(2)}</span>
                  <span style={{ flex: 1, textAlign: 'right', color: pnlC, fontWeight: 600 }}>{fmtUsd(h.pnl)}</span>
                  <span style={{ color: '#484f58', minWidth: 60, textAlign: 'right' }}>{fmtTime(h.exitTime)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer with broker info + LOG OUT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, fontSize: 9, color: '#484f58' }}>
        <span>
          {broker.name}
          {broker.id !== 'paper' && <span style={{ color: '#d29922', marginLeft: 4 }}>· DEMO</span>}
          {broker.id === 'paper' && <span style={{ color: '#3fb950', marginLeft: 4 }}>· LIVE PAPER</span>}
        </span>
        <button onClick={() => { onSwitchBroker(); onClose() }}
          title="Disconnect broker — pick a different one"
          style={{ background: 'transparent', border: '1px solid #30363d', color: '#f85149', cursor: 'pointer', fontSize: 9, padding: '3px 8px', borderRadius: 2, letterSpacing: 0.3 }}>
          LOG OUT
        </button>
      </div>
    </div>
  )
}

// ─── BrokerStatusBadge: shows the connected broker on the bid/ask bar with quick actions ───
function BrokerStatusBadge({ onOpenPositions }: { onOpenPositions: () => void }) {
  const [activeId, setActiveId] = useState<string | null>(() => {
    try { return localStorage.getItem('ft-broker-active') } catch { return null }
  })
  // Poll localStorage every 500ms for changes (after order modal connects/logs out)
  useEffect(() => {
    const t = setInterval(() => {
      try { setActiveId(localStorage.getItem('ft-broker-active')) } catch {}
    }, 500)
    return () => clearInterval(t)
  }, [])
  if (!activeId) return null
  const broker = BROKERS.find(b => b.id === activeId)
  if (!broker) return null

  // Open positions count from localStorage (only relevant for paper trading)
  let openCount = 0
  if (activeId === 'paper') {
    try { openCount = JSON.parse(localStorage.getItem('ft-paper-trades-equity') || '[]').length } catch {}
  }

  const logOut = () => {
    try { localStorage.removeItem('ft-broker-active') } catch {}
    setActiveId(null)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', paddingLeft: 12, borderLeft: '1px solid #21262d' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3fb950', flexShrink: 0 }}/>
      <span style={{ fontSize: 10, color: '#8b949e', fontFamily: "system-ui, sans-serif" }}>
        {broker.name}
      </span>
      <button onClick={onOpenPositions}
        title="View open positions and trade history"
        style={{
          background: 'transparent', border: '1px solid #30363d', borderRadius: 2,
          padding: '2px 6px', fontSize: 9, color: '#8b949e', cursor: 'pointer',
          letterSpacing: 0.3,
        }}
        onMouseOver={e => { e.currentTarget.style.color = '#c9d1d9'; e.currentTarget.style.borderColor = '#58a6ff' }}
        onMouseOut={e => { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.borderColor = '#30363d' }}>
        POSITIONS{openCount > 0 ? ` (${openCount})` : ''}
      </button>
      <button onClick={logOut}
        title="Log out — disconnect broker"
        style={{
          background: 'transparent', border: '1px solid #30363d', borderRadius: 2,
          padding: '2px 6px', fontSize: 9, color: '#f85149', cursor: 'pointer',
          letterSpacing: 0.3,
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'rgba(248,81,73,0.10)' }}
        onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
        LOG OUT
      </button>
    </div>
  )
}
