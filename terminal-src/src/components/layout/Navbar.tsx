// components/layout/Navbar.tsx — TradingView tabs with drag-to-reorder
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, selectRegime } from '@/store/useStore'
import { Logo } from '@/components/common/Logo'
import { supabase } from '@/lib/supabase'

const ALL_PAGES = [
  { path: '/',             label: 'Dashboard' },
  { path: '/macro',        label: 'Macro' },
  { path: '/screener',     label: 'Screener' },
  { path: '/risk',         label: 'Risk' },
  { path: '/cot',          label: 'COT' },
  { path: '/portfolio',    label: 'Portfolio' },
  { path: '/indicators',    label: 'Global Indicators' },
  { path: '/news',          label: 'News Flow' },
  { path: '/polymarket',   label: 'Polymarket' },
  { path: '/charts',        label: 'Charts' },
  { path: '/settings',     label: 'Settings' },
  { path: '/newtab',       label: 'New Tab' },
]

const DEFAULT_TABS = ['/', '/polymarket', '/macro', '/risk', '/cot', '/portfolio']

interface Ticker { s:string; n:string; mc?:string; t?:string }
const UNIVERSE: Ticker[] = [
  // Mega cap tech
  {s:'AAPL',n:'Apple Inc',mc:'$3.1T',t:'Stock'},{s:'MSFT',n:'Microsoft Corp',mc:'$3.1T',t:'Stock'},{s:'NVDA',n:'NVIDIA Corp',mc:'$2.9T',t:'Stock'},
  {s:'GOOGL',n:'Alphabet Inc',mc:'$2.1T',t:'Stock'},{s:'GOOG',n:'Alphabet Inc Class C',mc:'$2.1T',t:'Stock'},{s:'META',n:'Meta Platforms',mc:'$1.4T',t:'Stock'},
  {s:'AMZN',n:'Amazon.com',mc:'$2.1T',t:'Stock'},{s:'TSLA',n:'Tesla Inc',mc:'$800B',t:'Stock'},{s:'NFLX',n:'Netflix Inc',mc:'$380B',t:'Stock'},
  {s:'CRM',n:'Salesforce Inc',mc:'$280B',t:'Stock'},{s:'ADBE',n:'Adobe Inc',mc:'$250B',t:'Stock'},{s:'ORCL',n:'Oracle Corp',mc:'$380B',t:'Stock'},
  {s:'NOW',n:'ServiceNow Inc',mc:'$165B',t:'Stock'},{s:'IBM',n:'International Business Machines',mc:'$160B',t:'Stock'},{s:'CSCO',n:'Cisco Systems',mc:'$200B',t:'Stock'},
  // Software / cybersecurity
  {s:'PANW',n:'Palo Alto Networks',mc:'$115B',t:'Stock'},{s:'CRWD',n:'CrowdStrike Holdings',mc:'$90B',t:'Stock'},{s:'NET',n:'Cloudflare Inc',mc:'$30B',t:'Stock'},
  {s:'DDOG',n:'Datadog Inc',mc:'$42B',t:'Stock'},{s:'SNOW',n:'Snowflake Inc',mc:'$55B',t:'Stock'},{s:'SHOP',n:'Shopify Inc',mc:'$95B',t:'Stock'},
  {s:'PLTR',n:'Palantir Tech',mc:'$155B',t:'Stock'},{s:'ACN',n:'Accenture Plc',mc:'$220B',t:'Stock'},{s:'SAP',n:'SAP SE',mc:'$250B',t:'Stock'},
  // Semis
  {s:'AMD',n:'AMD Inc',mc:'$245B',t:'Stock'},{s:'INTC',n:'Intel Corp',mc:'$140B',t:'Stock'},{s:'AVGO',n:'Broadcom Inc',mc:'$800B',t:'Stock'},
  {s:'QCOM',n:'Qualcomm Inc',mc:'$200B',t:'Stock'},{s:'TSM',n:'Taiwan Semiconductor',mc:'$750B',t:'Stock'},{s:'MU',n:'Micron Technology',mc:'$120B',t:'Stock'},
  {s:'TXN',n:'Texas Instruments',mc:'$185B',t:'Stock'},{s:'ADI',n:'Analog Devices',mc:'$115B',t:'Stock'},{s:'KLAC',n:'KLA Corporation',mc:'$105B',t:'Stock'},
  {s:'CDNS',n:'Cadence Design Systems',mc:'$75B',t:'Stock'},{s:'SNPS',n:'Synopsys Inc',mc:'$88B',t:'Stock'},{s:'ASML',n:'ASML Holding',mc:'$360B',t:'Stock'},
  {s:'ARM',n:'ARM Holdings',mc:'$140B',t:'Stock'},{s:'SMCI',n:'Super Micro Computer',mc:'$28B',t:'Stock'},
  // Finance / Banks / Asset mgrs
  {s:'JPM',n:'JPMorgan Chase',mc:'$590B',t:'Stock'},{s:'BAC',n:'Bank of America',mc:'$310B',t:'Stock'},{s:'GS',n:'Goldman Sachs',mc:'$165B',t:'Stock'},
  {s:'MS',n:'Morgan Stanley',mc:'$200B',t:'Stock'},{s:'WFC',n:'Wells Fargo',mc:'$215B',t:'Stock'},{s:'C',n:'Citigroup Inc',mc:'$125B',t:'Stock'},
  {s:'BLK',n:'BlackRock Inc',mc:'$130B',t:'Stock'},{s:'BX',n:'Blackstone Inc',mc:'$170B',t:'Stock'},{s:'SCHW',n:'Charles Schwab',mc:'$145B',t:'Stock'},
  {s:'BRK-B',n:'Berkshire Hathaway',mc:'$900B',t:'Stock'},{s:'SPGI',n:'S&P Global',mc:'$160B',t:'Stock'},
  {s:'V',n:'Visa Inc',mc:'$580B',t:'Stock'},{s:'MA',n:'Mastercard Inc',mc:'$450B',t:'Stock'},{s:'PYPL',n:'PayPal Holdings',mc:'$78B',t:'Stock'},
  {s:'SQ',n:'Block Inc',mc:'$46B',t:'Stock'},{s:'COIN',n:'Coinbase Global',mc:'$60B',t:'Stock'},{s:'HOOD',n:'Robinhood Markets',mc:'$30B',t:'Stock'},
  {s:'MSTR',n:'MicroStrategy Inc',mc:'$32B',t:'Stock'},{s:'MMC',n:'Marsh McLennan',mc:'$115B',t:'Stock'},{s:'CB',n:'Chubb Limited',mc:'$113B',t:'Stock'},
  {s:'PGR',n:'Progressive Corp',mc:'$140B',t:'Stock'},
  // Energy
  {s:'XOM',n:'Exxon Mobil',mc:'$490B',t:'Stock'},{s:'CVX',n:'Chevron Corp',mc:'$280B',t:'Stock'},{s:'SHEL',n:'Shell plc',mc:'$225B',t:'Stock'},
  {s:'BP',n:'BP plc',mc:'$95B',t:'Stock'},{s:'SLB',n:'Schlumberger',mc:'$65B',t:'Stock'},
  // Consumer / Retail / Travel
  {s:'WMT',n:'Walmart Inc',mc:'$720B',t:'Stock'},{s:'COST',n:'Costco Wholesale',mc:'$410B',t:'Stock'},{s:'HD',n:'Home Depot',mc:'$380B',t:'Stock'},
  {s:'LOW',n:'Lowe\'s Companies',mc:'$140B',t:'Stock'},{s:'TGT',n:'Target Corp',mc:'$72B',t:'Stock'},{s:'TJX',n:'TJX Companies',mc:'$145B',t:'Stock'},
  {s:'NKE',n:'Nike Inc',mc:'$115B',t:'Stock'},{s:'SBUX',n:'Starbucks Corp',mc:'$90B',t:'Stock'},{s:'MCD',n:'McDonald\'s Corp',mc:'$200B',t:'Stock'},
  {s:'KO',n:'Coca-Cola Co',mc:'$280B',t:'Stock'},{s:'PEP',n:'PepsiCo Inc',mc:'$230B',t:'Stock'},{s:'PG',n:'Procter & Gamble',mc:'$380B',t:'Stock'},
  {s:'PM',n:'Philip Morris International',mc:'$200B',t:'Stock'},{s:'MO',n:'Altria Group',mc:'$95B',t:'Stock'},{s:'MDLZ',n:'Mondelez International',mc:'$90B',t:'Stock'},
  {s:'BKNG',n:'Booking Holdings',mc:'$170B',t:'Stock'},{s:'ABNB',n:'Airbnb Inc',mc:'$85B',t:'Stock'},{s:'UBER',n:'Uber Technologies',mc:'$170B',t:'Stock'},
  {s:'DIS',n:'Walt Disney',mc:'$200B',t:'Stock'},{s:'CMCSA',n:'Comcast Corp',mc:'$150B',t:'Stock'},{s:'VZ',n:'Verizon',mc:'$175B',t:'Stock'},
  {s:'RBLX',n:'Roblox Corp',mc:'$30B',t:'Stock'},
  // Healthcare / Pharma / Biotech
  {s:'JNJ',n:'Johnson & Johnson',mc:'$355B',t:'Stock'},{s:'UNH',n:'UnitedHealth',mc:'$460B',t:'Stock'},{s:'PFE',n:'Pfizer Inc',mc:'$150B',t:'Stock'},
  {s:'LLY',n:'Eli Lilly',mc:'$840B',t:'Stock'},{s:'ABBV',n:'AbbVie Inc',mc:'$300B',t:'Stock'},{s:'MRK',n:'Merck & Co',mc:'$300B',t:'Stock'},
  {s:'NVO',n:'Novo Nordisk',mc:'$580B',t:'Stock'},{s:'TMO',n:'Thermo Fisher Scientific',mc:'$205B',t:'Stock'},{s:'DHR',n:'Danaher Corp',mc:'$175B',t:'Stock'},
  {s:'ABT',n:'Abbott Laboratories',mc:'$200B',t:'Stock'},{s:'ISRG',n:'Intuitive Surgical',mc:'$190B',t:'Stock'},{s:'MDT',n:'Medtronic Plc',mc:'$110B',t:'Stock'},
  {s:'GILD',n:'Gilead Sciences',mc:'$100B',t:'Stock'},{s:'AMGN',n:'Amgen Inc',mc:'$150B',t:'Stock'},{s:'REGN',n:'Regeneron Pharmaceuticals',mc:'$95B',t:'Stock'},
  {s:'BMY',n:'Bristol-Myers Squibb',mc:'$115B',t:'Stock'},{s:'CVS',n:'CVS Health',mc:'$80B',t:'Stock'},{s:'ELV',n:'Elevance Health',mc:'$88B',t:'Stock'},
  {s:'CI',n:'Cigna Group',mc:'$95B',t:'Stock'},{s:'SYK',n:'Stryker Corp',mc:'$115B',t:'Stock'},{s:'ZTS',n:'Zoetis Inc',mc:'$80B',t:'Stock'},
  // Industrial / Aerospace / Defense / Utilities
  {s:'CAT',n:'Caterpillar Inc',mc:'$170B',t:'Stock'},{s:'BA',n:'Boeing Co',mc:'$103B',t:'Stock'},{s:'GE',n:'GE Aerospace',mc:'$190B',t:'Stock'},
  {s:'RTX',n:'RTX Corporation',mc:'$160B',t:'Stock'},{s:'LMT',n:'Lockheed Martin',mc:'$115B',t:'Stock'},{s:'HON',n:'Honeywell Intl',mc:'$135B',t:'Stock'},
  {s:'DE',n:'Deere & Co',mc:'$105B',t:'Stock'},{s:'UPS',n:'United Parcel Service',mc:'$115B',t:'Stock'},{s:'ADP',n:'Automatic Data Processing',mc:'$115B',t:'Stock'},
  {s:'LIN',n:'Linde plc',mc:'$210B',t:'Stock'},{s:'PLD',n:'Prologis Inc',mc:'$110B',t:'Stock'},{s:'SO',n:'Southern Company',mc:'$80B',t:'Stock'},
  // Auto
  {s:'F',n:'Ford Motor',mc:'$44B',t:'Stock'},{s:'GM',n:'General Motors',mc:'$55B',t:'Stock'},{s:'TM',n:'Toyota Motor',mc:'$260B',t:'Stock'},
  {s:'RIVN',n:'Rivian Automotive',mc:'$14B',t:'Stock'},{s:'NIO',n:'NIO Inc',mc:'$10B',t:'Stock'},{s:'LI',n:'Li Auto',mc:'$24B',t:'Stock'},
  {s:'XPEV',n:'XPeng Inc',mc:'$12B',t:'Stock'},
  // International ADRs
  {s:'BABA',n:'Alibaba Group',mc:'$200B',t:'Stock'},{s:'JD',n:'JD.com Inc',mc:'$60B',t:'Stock'},{s:'PDD',n:'PDD Holdings',mc:'$185B',t:'Stock'},
  {s:'NTES',n:'NetEase Inc',mc:'$60B',t:'Stock'},{s:'SE',n:'Sea Limited',mc:'$75B',t:'Stock'},{s:'MELI',n:'MercadoLibre',mc:'$115B',t:'Stock'},
  // Crypto-linked miners
  {s:'MARA',n:'Marathon Digital Holdings',mc:'$5B',t:'Stock'},{s:'RIOT',n:'Riot Platforms',mc:'$3B',t:'Stock'},
  // Airlines
  {s:'UAL',n:'United Airlines Holdings',mc:'$15B',t:'Stock'},{s:'DAL',n:'Delta Air Lines',mc:'$30B',t:'Stock'},
  // Major ETFs
  {s:'SPY',n:'S&P 500 ETF',mc:'$540B',t:'ETF'},{s:'QQQ',n:'Nasdaq 100 ETF',mc:'$270B',t:'ETF'},{s:'IWM',n:'Russell 2000 ETF',mc:'$60B',t:'ETF'},
  {s:'DIA',n:'Dow Jones ETF',mc:'$35B',t:'ETF'},{s:'VTI',n:'Vanguard Total Market ETF',mc:'$400B',t:'ETF'},{s:'VOO',n:'Vanguard S&P 500 ETF',mc:'$450B',t:'ETF'},
  {s:'IVV',n:'iShares Core S&P 500 ETF',mc:'$480B',t:'ETF'},{s:'SCHD',n:'Schwab Dividend ETF',mc:'$60B',t:'ETF'},{s:'VGT',n:'Vanguard Tech ETF',mc:'$70B',t:'ETF'},
  {s:'ARKK',n:'ARK Innovation ETF',mc:'$6B',t:'ETF'},
  {s:'GLD',n:'Gold ETF',mc:'$75B',t:'ETF'},{s:'SLV',n:'Silver ETF',mc:'$12B',t:'ETF'},
  {s:'TLT',n:'20+ Year Treasury ETF',mc:'$50B',t:'ETF'},{s:'HYG',n:'High Yield Bond ETF',mc:'$15B',t:'ETF'},
  {s:'XLF',n:'Financial Sector ETF',mc:'$40B',t:'ETF'},{s:'XLE',n:'Energy Sector ETF',mc:'$35B',t:'ETF'},
  {s:'XLK',n:'Technology Sector ETF',mc:'$65B',t:'ETF'},{s:'XLV',n:'Healthcare Sector ETF',mc:'$40B',t:'ETF'},
  {s:'XLY',n:'Consumer Discretionary ETF',mc:'$20B',t:'ETF'},{s:'XLP',n:'Consumer Staples ETF',mc:'$15B',t:'ETF'},
  {s:'XLI',n:'Industrial Sector ETF',mc:'$18B',t:'ETF'},{s:'XLU',n:'Utilities Sector ETF',mc:'$13B',t:'ETF'},
  {s:'VEA',n:'Developed Markets ETF',mc:'$100B',t:'ETF'},{s:'EEM',n:'Emerging Markets ETF',mc:'$20B',t:'ETF'},
  // Indices
  {s:'^GSPC',n:'S&P 500 Index',t:'Index'},{s:'^IXIC',n:'Nasdaq Composite',t:'Index'},{s:'^DJI',n:'Dow Jones Industrial',t:'Index'},
  {s:'^RUT',n:'Russell 2000',t:'Index'},{s:'^VIX',n:'CBOE Volatility Index',t:'Index'},
  {s:'^GDAXI',n:'DAX 40',t:'Index'},{s:'^FTSE',n:'FTSE 100',t:'Index'},{s:'^FCHI',n:'CAC 40',t:'Index'},
  {s:'^STOXX50E',n:'Euro Stoxx 50',t:'Index'},{s:'^N225',n:'Nikkei 225',t:'Index'},{s:'^HSI',n:'Hang Seng Index',t:'Index'},
  {s:'000001.SS',n:'Shanghai Composite',t:'Index'},
  // Crypto
  {s:'BTC-USD',n:'Bitcoin',t:'Crypto'},{s:'ETH-USD',n:'Ethereum',t:'Crypto'},{s:'SOL-USD',n:'Solana',t:'Crypto'},
  {s:'XRP-USD',n:'Ripple',t:'Crypto'},{s:'ADA-USD',n:'Cardano',t:'Crypto'},{s:'DOGE-USD',n:'Dogecoin',t:'Crypto'},
  {s:'BNB-USD',n:'BNB',t:'Crypto'},{s:'AVAX-USD',n:'Avalanche',t:'Crypto'},{s:'LINK-USD',n:'Chainlink',t:'Crypto'},
  {s:'LTC-USD',n:'Litecoin',t:'Crypto'},{s:'DOT-USD',n:'Polkadot',t:'Crypto'},{s:'MATIC-USD',n:'Polygon',t:'Crypto'},
  {s:'TRX-USD',n:'TRON',t:'Crypto'},{s:'ATOM-USD',n:'Cosmos',t:'Crypto'},{s:'UNI-USD',n:'Uniswap',t:'Crypto'},
  {s:'ETC-USD',n:'Ethereum Classic',t:'Crypto'},{s:'FIL-USD',n:'Filecoin',t:'Crypto'},{s:'APT-USD',n:'Aptos',t:'Crypto'},
  {s:'ARB-USD',n:'Arbitrum',t:'Crypto'},{s:'OP-USD',n:'Optimism',t:'Crypto'},
  // Forex — Majors
  {s:'EURUSD=X',n:'Euro / US Dollar',t:'Forex'},{s:'GBPUSD=X',n:'Pound / US Dollar',t:'Forex'},
  {s:'USDJPY=X',n:'US Dollar / Yen',t:'Forex'},{s:'USDCHF=X',n:'US Dollar / Swiss Franc',t:'Forex'},
  {s:'AUDUSD=X',n:'Australian Dollar / USD',t:'Forex'},{s:'USDCAD=X',n:'US Dollar / Canadian Dollar',t:'Forex'},
  {s:'NZDUSD=X',n:'New Zealand Dollar / USD',t:'Forex'},
  // Forex — Crosses
  {s:'EURGBP=X',n:'Euro / Pound',t:'Forex'},{s:'EURJPY=X',n:'Euro / Yen',t:'Forex'},
  {s:'GBPJPY=X',n:'Pound / Yen',t:'Forex'},
  // Commodities
  {s:'GC=F',n:'Gold Futures',t:'Futures'},{s:'SI=F',n:'Silver Futures',t:'Futures'},{s:'CL=F',n:'Crude Oil WTI Futures',t:'Futures'},
  {s:'NG=F',n:'Natural Gas Futures',t:'Futures'},{s:'HG=F',n:'Copper Futures',t:'Futures'},{s:'PL=F',n:'Platinum Futures',t:'Futures'},
  {s:'HO=F',n:'Heating Oil Futures',t:'Futures'},{s:'RB=F',n:'RBOB Gasoline Futures',t:'Futures'},
  {s:'ZC=F',n:'Corn Futures',t:'Futures'},{s:'ZW=F',n:'Wheat Futures',t:'Futures'},{s:'ZS=F',n:'Soybean Futures',t:'Futures'},
  // Index futures
  {s:'ES=F',n:'E-mini S&P 500 Futures',t:'Futures'},{s:'NQ=F',n:'E-mini Nasdaq 100 Futures',t:'Futures'},
  {s:'YM=F',n:'E-mini Dow Futures',t:'Futures'},{s:'RTY=F',n:'E-mini Russell 2000 Futures',t:'Futures'},
  // Treasury futures
  {s:'ZN=F',n:'10Y T-Note Futures',t:'Futures'},{s:'ZB=F',n:'30Y T-Bond Futures',t:'Futures'},
]

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const regime   = useStore(selectRegime)
  const { apiOnline } = useStore()
  const apiFailedChecks = useStore(s => (s as any).apiFailedChecks ?? 0)
  const apiOffline = !apiOnline && apiFailedChecks >= 3
  // Real Supabase user for the account menu
  const [authUser, setAuthUser] = useState<{ email: string | null; full_name: string | null }>({ email: null, full_name: null })
  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const u = data.user
      setAuthUser({
        email: u?.email ?? null,
        full_name: (u?.user_metadata as any)?.full_name ?? null,
      })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      setAuthUser({
        email: u?.email ?? null,
        full_name: (u?.user_metadata as any)?.full_name ?? null,
      })
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [])

  const displayName = authUser.full_name || (authUser.email ? authUser.email.split('@')[0] : 'Account')
  const initials = (authUser.full_name || authUser.email || 'U')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('') || 'U'

  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('ft-tabs')
      if (!s) return DEFAULT_TABS
      const parsed = JSON.parse(s)
      // Migration: force-inject Polymarket tab if missing
      if (Array.isArray(parsed) && !parsed.includes('/polymarket')) {
        const idx = parsed.indexOf('/') >= 0 ? parsed.indexOf('/') + 1 : 0
        parsed.splice(idx, 0, '/polymarket')
      }
      return parsed
    } catch { return DEFAULT_TABS }
  })
  
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const [query, setQuery] = useState('')
  const [hits, setHits]   = useState<Ticker[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [sel, setSel]     = useState(-1)
  const [searchCat, setSearchCat] = useState('all')
  const [clock, setClock] = useState('')
  const [acctOpen, setAcctOpen] = useState(false)
  const acctRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => { localStorage.setItem('ft-tabs', JSON.stringify(openTabs)) }, [openTabs])
  // Listen for tab changes from NewTab page
  useEffect(() => {
    const onStorage = () => {
      try { const t = JSON.parse(localStorage.getItem('ft-tabs') || '[]'); if (t.length) setOpenTabs(t) } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000)
    setClock(new Date().toLocaleTimeString('en-US', { hour12: false }))
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault(); inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  // Close account menu on click outside
  useEffect(() => {
    const h = (e: MouseEvent) => { if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAcctOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  // Sector keyword → matching ticker prefixes. Lets users search "bank", "semiconductor",
  // "energy", "pharma", "auto", "crypto", "ai", etc. and get the relevant tickers in results.
  const SECTOR_KEYWORDS: Record<string, string[]> = {
    BANK:         ['JPM','BAC','GS','MS','WFC','C','SCHW','BLK','BX'],
    BANKS:        ['JPM','BAC','GS','MS','WFC','C','SCHW','BLK','BX'],
    PAYMENT:      ['V','MA','PYPL','SQ','HOOD','COIN'],
    PAYMENTS:     ['V','MA','PYPL','SQ','HOOD','COIN'],
    SEMICONDUCTOR:['NVDA','AMD','AVGO','QCOM','INTC','TSM','ASML','MU','TXN','ADI','KLAC','CDNS','SNPS','ARM','SMCI'],
    SEMI:         ['NVDA','AMD','AVGO','QCOM','INTC','TSM','ASML','MU','TXN','ADI','KLAC','CDNS','SNPS','ARM','SMCI'],
    SOFTWARE:     ['MSFT','ORCL','CRM','ADBE','NOW','SNOW','NET','DDOG','PANW','CRWD','SHOP','PLTR','SAP'],
    PHARMA:       ['LLY','MRK','ABBV','BMY','PFE','NVO','AMGN','GILD','REGN'],
    BIOTECH:      ['AMGN','GILD','REGN','BMY','VRTX'],
    HEALTHCARE:   ['JNJ','UNH','LLY','MRK','ABBV','PFE','NVO','TMO','DHR','ABT','ISRG','MDT','GILD','AMGN','REGN','BMY','CVS','ELV','CI','SYK','ZTS'],
    HEALTH:       ['JNJ','UNH','LLY','MRK','ABBV','PFE','NVO','TMO','DHR','ABT','ISRG','MDT','GILD','AMGN','REGN','BMY','CVS','ELV','CI'],
    ENERGY:       ['XOM','CVX','SHEL','BP','SLB'],
    OIL:          ['XOM','CVX','SHEL','BP','SLB','CL=F'],
    AEROSPACE:    ['BA','LMT','RTX','GE'],
    DEFENSE:      ['LMT','RTX','BA'],
    INDUSTRIAL:   ['CAT','DE','BA','GE','RTX','LMT','HON','UPS','ADP'],
    INDUSTRIALS:  ['CAT','DE','BA','GE','RTX','LMT','HON','UPS','ADP'],
    CONSUMER:     ['WMT','COST','HD','LOW','TGT','TJX','NKE','SBUX','MCD','KO','PEP','PG','PM','MO','MDLZ','BKNG','ABNB','UBER','DIS'],
    RETAIL:       ['WMT','COST','HD','LOW','TGT','TJX'],
    AUTO:         ['TSLA','F','GM','TM','RIVN','NIO','LI','XPEV'],
    AUTOMOTIVE:   ['TSLA','F','GM','TM','RIVN','NIO','LI','XPEV'],
    EV:           ['TSLA','RIVN','NIO','LI','XPEV'],
    'CRYPTO-LINKED':['MSTR','COIN','MARA','RIOT','HOOD','SQ'],
    AI:           ['NVDA','MSFT','GOOGL','META','AMD','PLTR','SMCI','TSM'],
    CHINA:        ['BABA','JD','PDD','NTES','NIO','LI','XPEV'],
    ADR:          ['BABA','JD','PDD','NTES','SAP','TSM','ASML','TM','NVO','SHEL','BP','ARM','SE','MELI'],
    CRYPTO:       ['BTC-USD','ETH-USD','SOL-USD','XRP-USD','ADA-USD','DOGE-USD','BNB-USD','AVAX-USD','LINK-USD','LTC-USD','DOT-USD','MATIC-USD','TRX-USD','ATOM-USD','UNI-USD','ETC-USD','FIL-USD','APT-USD','ARB-USD','OP-USD'],
    FOREX:        ['EURUSD=X','GBPUSD=X','USDJPY=X','USDCHF=X','AUDUSD=X','USDCAD=X','NZDUSD=X','EURGBP=X','EURJPY=X','GBPJPY=X'],
    FX:           ['EURUSD=X','GBPUSD=X','USDJPY=X','USDCHF=X','AUDUSD=X','USDCAD=X'],
    GOLD:         ['GC=F','GLD'],
    SILVER:       ['SI=F','SLV'],
    COMMODITIES:  ['GC=F','SI=F','CL=F','NG=F','HG=F','PL=F','HO=F','RB=F','ZC=F','ZW=F','ZS=F'],
  }

  const onSearch = useCallback((q: string, cat?: string) => {
    setQuery(q); setSel(-1)
    const up = q.toUpperCase().trim()
    const c = cat ?? searchCat
    let pool = UNIVERSE as typeof UNIVERSE
    if (c !== 'all') pool = pool.filter(u => u.t === c)
    // Sector keyword expansion: if the query exactly matches a sector keyword,
    // surface the relevant tickers first. This makes "bank" → JPM/BAC/WFC/... etc.
    const sectorHits = up && SECTOR_KEYWORDS[up]
      ? new Set(SECTOR_KEYWORDS[up])
      : null
    let r = up
      ? pool.filter(u =>
          u.s.replace('=X','').includes(up) ||
          u.s.includes(up) ||
          u.n.toUpperCase().includes(up) ||
          (u.t?.toUpperCase().includes(up)) ||
          (sectorHits?.has(u.s) ?? false)
        )
      : pool
    // If a sector match was found, sort sector hits to the top
    if (sectorHits) {
      r = [...r].sort((a, b) => Number(sectorHits.has(b.s)) - Number(sectorHits.has(a.s)))
    }
    setHits(r.slice(0, 20)); setSearchOpen(true)
  }, [searchCat])

  const goTo = useCallback((sym: string) => {
    setQuery(''); setHits([]); setSearchOpen(false); inputRef.current?.blur()
    navigate(`/ticker/${sym}`)
  }, [navigate])

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { setSel(i => Math.min(i + 1, hits.length - 1)); e.preventDefault() }
    if (e.key === 'ArrowUp')   { setSel(i => Math.max(i - 1, -1)); e.preventDefault() }
    if (e.key === 'Enter') { const sym = sel >= 0 ? hits[sel]?.s : hits[0]?.s; if (sym) goTo(sym); else if (query.trim()) goTo(query.trim().toUpperCase()) }
    if (e.key === 'Escape') { setSearchOpen(false); inputRef.current?.blur() }
  }, [hits, sel, query, goTo])

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = openTabs.filter(t => t !== path)
    if (next.length === 0) next.push('/')
    setOpenTabs(next)
    if (location.pathname === path) navigate(next[next.length - 1])
  }

  // ── Drag & Drop ──
  const onDragStart = (idx: number) => { setDragIdx(idx) }
  const onDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }
  const onDrop = (idx: number) => {
    if (dragIdx == null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return }
    const newTabs = [...openTabs]
    const [moved] = newTabs.splice(dragIdx, 1)
    newTabs.splice(idx, 0, moved)
    setOpenTabs(newTabs)
    setDragIdx(null); setDragOverIdx(null)
  }
  const onDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  const regCol = regime === 'RISK-ON' ? '#3fb950' : regime === 'RISK-OFF' ? '#f85149' : '#d29922'

  return (
    <div style={{ flexShrink: 0 }}>
      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 44, background: '#161b22', borderBottom: '1px solid #21262d', padding: '0 12px', gap: 10 }}>
        {/* Back-to-website link (hard navigation — breaks out of /terminal SPA basename) */}
        <a
          href="/"
          title="Back to termimal.com"
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', textDecoration: 'none', color: '#8b949e', fontSize: 11, border: '1px solid #21262d', borderRadius: 2, marginRight: 4 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#c9d1d9'; e.currentTarget.style.borderColor = '#30363d' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.borderColor = '#21262d' }}
        >
          <span aria-hidden style={{ fontSize: 11 }}>←</span>
          <span style={{ fontSize: 10, letterSpacing: 0.3 }}>Site</span>
        </a>
        {/* Logo — also hard-navigates home */}
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', cursor: 'pointer', marginRight: 4 }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', letterSpacing: 0.4 }}>TERMIMAL</span>
          <span title="Build version" style={{ fontSize: 8, color: '#484f58', marginLeft: 4, fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>v6.9</span>
        </a>
        <div style={{ width: 1, height: 20, background: '#21262d' }} />
        {/* Search */}
        <div ref={searchBoxRef} style={{ position: 'relative', width: 240 }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="#8b949e"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input ref={inputRef} value={query} onChange={e => onSearch(e.target.value)}
              onFocus={() => { onSearch(query) }} onKeyDown={onKey}
              placeholder="Search symbol or name...  ⌘K"
              style={{ width: '100%', background: '#0e1117', border: '1px solid #21262d', borderRadius: 2, fontSize: 11, color: '#c9d1d9', padding: '4px 8px 4px 26px', outline: 'none' }} />
          </div>
          {searchOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, width: 360, marginTop: 4, background: '#161b22', border: '1px solid #21262d', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 200, maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
              {/* Category tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #21262d', flexShrink: 0, overflowX: 'auto' }}>
                {[{k:'all',l:'All'},{k:'Stock',l:'Stocks'},{k:'ETF',l:'ETFs'},{k:'Index',l:'Indices'},{k:'Crypto',l:'Crypto'},{k:'Forex',l:'Forex'},{k:'Futures',l:'Futures'}].map(c=>(
                  <span key={c.k} onClick={()=>{setSearchCat(c.k);onSearch(query,c.k)}}
                    style={{padding:'5px 10px',fontSize:10,cursor:'pointer',flexShrink:0,
                      color:searchCat===c.k?'#c9d1d9':'#484f58',fontWeight:searchCat===c.k?500:400,
                      borderBottom:searchCat===c.k?'1px solid #34d399':'1px solid transparent'}}>{c.l}</span>
                ))}
              </div>
              {/* Results */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
              {hits.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: '#484f58' }}>
                  {query ? <>No results for "{query}" · <button onClick={() => goTo(query.toUpperCase())} style={{ color: '#34d399', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>Try {query.toUpperCase()}</button></> : 'Type to search'}
                </div>
              ) : hits.map((t, i) => (
                <div key={t.s} onClick={() => goTo(t.s)} onMouseEnter={() => setSel(i)}
                  style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', cursor: 'pointer', background: i === sel ? '#21262d' : 'transparent', gap: 8 }}>
                  <Logo sym={t.s} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#c9d1d9', minWidth: 56 }}>{t.s}</span>
                  <span style={{ fontSize: 10, color: '#8b949e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.n}</span>
                  {t.t && <span style={{ fontSize: 9, color: '#484f58', border: '1px solid #30363d', padding: '1px 4px', flexShrink: 0 }}>{t.t}</span>}
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 2, fontSize: 10, fontWeight: 500, color: regCol, background: regCol + '15' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: regCol }} className="pulse-dot" /> {regime}
        </div>
        <div
          title={
            apiOnline ? 'Backend reachable.'
              : apiOffline ? 'Backend unreachable. Check VITE_BACKEND_URL or try again.'
              : 'Trying to reach the backend...'
          }
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: apiOnline ? '#3fb950' : apiOffline ? '#f85149' : '#d29922' }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: apiOnline ? '#3fb950' : apiOffline ? '#f85149' : '#d29922' }} />
          {apiOnline ? 'Live' : apiOffline ? 'Offline' : 'Connecting...'}
        </div>
        <span style={{ fontSize: 11, color: '#484f58', fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace", fontVariantNumeric: 'tabular-nums', letterSpacing: 0.3 }}>{clock}</span>

        {/* ═══ Account Menu ═══ */}
        <div ref={acctRef} style={{ position: 'relative', marginLeft: 4 }}>
          <div onClick={() => setAcctOpen(!acctOpen)}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 9, fontWeight: 600, letterSpacing: '0.02em',
              color: acctOpen ? '#c9d1d9' : '#8b949e',
              background: acctOpen ? '#34d399' : '#161b22',
              border: `1px solid ${acctOpen ? '#34d399' : '#21262d'}`,
              transition: 'all 0.1s',
            }}
            onMouseEnter={e => { if (!acctOpen) { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#c9d1d9' } }}
            onMouseLeave={e => { if (!acctOpen) { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.color = '#8b949e' } }}>
            {initials}
          </div>
          {acctOpen && (
            <div style={{
              position: 'absolute', top: 34, right: 0, width: 248,
              background: '#0e1117', border: '1px solid #1c2128',
              zIndex: 999, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }}>
              {/* Identity block */}
              <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #161b22' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161b22', border: '1px solid #21262d', fontSize: 12, fontWeight: 700, color: '#8b949e', flexShrink: 0 }}>{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', lineHeight: 1.3 }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: '#484f58', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUser.email ?? 'Not signed in'}</div>
                  </div>
                </div>
              </div>

              {/* Account / billing / support all live on the marketing site.
                  Plain hrefs — same origin, full-page navigation, breaks out
                  of the SPA's React Router (which is scoped to /terminal). */}
              <div style={{ padding: '4px 0' }}>
                <a href="/dashboard/profile"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0e1117')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#30363d', border: '1px solid #21262d', flexShrink: 0 }}>U</span>
                  <span style={{ fontSize: 12, color: '#8b949e' }}>Profile</span>
                </a>
                <a href="/dashboard/billing"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0e1117')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#30363d', border: '1px solid #21262d', flexShrink: 0 }}>$</span>
                  <span style={{ fontSize: 12, color: '#8b949e' }}>Subscription &amp; billing</span>
                </a>
                <a href="/pricing"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0e1117')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#30363d', border: '1px solid #21262d', flexShrink: 0 }}>↑</span>
                  <span style={{ fontSize: 12, color: '#8b949e' }}>Upgrade plan</span>
                </a>
                <a href="/support"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0e1117')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#30363d', border: '1px solid #21262d' }}>?</span>
                  <span style={{ fontSize: 12, color: '#8b949e' }}>Help &amp; contact</span>
                </a>
              </div>
              {/* Sign out — calls supabase.auth.signOut() then hard-navigates
                  to /login on the marketing site so the cookie is cleared
                  everywhere (terminal cookie clears too — same origin). */}
              <div style={{ padding: '4px 0', borderTop: '1px solid #161b22' }}>
                <a href="#"
                  onClick={async (e) => {
                    e.preventDefault()
                    try { await supabase.auth.signOut() } catch {}
                    window.location.href = '/login'
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#0e1117')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#f8514966', border: '1px solid #21262d' }}>→</span>
                  <span style={{ fontSize: 12, color: '#f85149' }}>Sign out</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar with drag-to-reorder ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: 42, background: '#0e1117', borderBottom: '1px solid #21262d', paddingLeft: 6 }}>
        {openTabs.map((tabPath, idx) => {
          const page = ALL_PAGES.find(p => p.path === tabPath)
          if (!page) return null
          const active = location.pathname === tabPath
          const isDragOver = dragOverIdx === idx && dragIdx !== idx
          return (
            <div key={tabPath}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={onDragEnd}
              onClick={() => navigate(tabPath)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: '100%',
                padding: '0 18px', cursor: 'grab', fontSize: 13, whiteSpace: 'nowrap',
                fontWeight: active ? 600 : 500,
                transition: 'color 120ms ease-out, background 120ms ease-out', position: 'relative',
                background: active ? '#161b22' : 'transparent',
                color: active ? '#f0f6fc' : '#8b949e',
                borderBottom: active ? '2px solid #34d399' : '2px solid transparent',
                borderLeft: isDragOver ? '2px solid #34d399' : 'none',
                letterSpacing: 0.2,
                opacity: dragIdx === idx ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#c9d1d9' }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' }}}>
              <span>{page.label}</span>
              {openTabs.length > 1 && (
                <span onClick={e => closeTab(tabPath, e)}
                  style={{ marginLeft: 6, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, fontSize: 12, color: '#484f58' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#30363d'; e.currentTarget.style.color = '#c9d1d9' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' }}>×</span>
              )}
            </div>
          )
        })}

        {/* + button → opens new tab landing page */}
        <div style={{ position: 'relative', zIndex: 300, display: 'flex', alignItems: 'center', height: '100%' }}>
          <div onClick={() => { if (!openTabs.includes('/newtab')) { setOpenTabs([...openTabs, '/newtab']); } navigate('/newtab') }}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 3, marginLeft: 6, fontSize: 17, lineHeight: 1, color: '#8b949e' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.color = '#c9d1d9' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' }}>+</div>
        </div>
      </div>
    </div>
  )
}
