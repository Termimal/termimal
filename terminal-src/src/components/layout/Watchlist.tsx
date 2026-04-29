// components/layout/Watchlist.tsx — Professional dual-mode watchlist with drag-to-reorder sections
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, selectWL } from '@/store/useStore'
import { fetchPriceHistory } from '@/api/client'
import { Logo } from '@/components/common/Logo'
import { formatPrice, getPrecision } from '@/utils/formatPrice'
import { usePlan } from '@/lib/plan'
import { onActivate } from '@/lib/a11y'

const mono = "'SF Mono', 'Fira Code', Menlo, Consolas, monospace"
const COLORS: Record<string, string> = {A:'#388bfd',B:'#8957e5',C:'#3fb950',D:'#d29922',E:'#f85149',F:'#388bfd',G:'#8957e5',H:'#3fb950',I:'#d29922',J:'#f85149',K:'#388bfd',L:'#8957e5',M:'#3fb950',N:'#d29922',O:'#f85149',P:'#388bfd',Q:'#8957e5',R:'#3fb950',S:'#d29922',T:'#f85149',U:'#388bfd',V:'#8957e5',W:'#3fb950',X:'#d29922',Y:'#f85149',Z:'#388bfd'}

function Av({s}:{s:string}) {
  return <div style={{width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:600,color:'#0e1117',background:COLORS[s[0]]??'#484f58',flexShrink:0}}>{s[0]}</div>
}

function Sp({data,color}:{data:number[];color:string}) {
  if(!data||data.length<3) return null
  const w=38,h=13,mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1
  const pts=data.map((v,i)=>`${(w*i)/(data.length-1)},${h-((v-mn)/rng)*(h-2)-1}`).join(' ')
  return <svg width={w} height={h} style={{display:'block'}}><polyline points={pts} fill="none" stroke={color} strokeWidth="1"/></svg>
}

const fmtVol=(v?:number)=>{if(!v)return'';if(v>=1e9)return(v/1e9).toFixed(1)+'B';if(v>=1e6)return(v/1e6).toFixed(0)+'M';return(v/1e3).toFixed(0)+'K'}

export function Watchlist() {
  const navigate=useNavigate()
  const watchlist=useStore(selectWL)
  const watchSections=useStore(s=>s.watchSections)
  const prices=useStore(s=>s.prices)
  const currentTicker=useStore(s=>s.currentTicker)
  const {addToWatchlist,removeFromWatchlist,addSection,removeSection,renameSection,toggleSectionCollapse,moveTicker,reorderInSection}=useStore()
  // Plan caps are enforced at the store level; the hook is imported only to
  // drive the optional "X / Y symbols" usage hint shown in the section header.
  const { limits } = usePlan()
  const symbolCap = limits.watchlistSymbols === Infinity ? '∞' : limits.watchlistSymbols
  const [collapsed,setCollapsed]=useState(false)
  const [mode,setMode]=useState<'chart'|'research'>('chart')
  const [showAdd,setShowAdd]=useState(false)
  const [addInput,setAddInput]=useState('')
  const [sparkData,setSparkData]=useState<Record<string,number[]>>({})
  const [hovSym,setHovSym]=useState<string|null>(null)

  // Auto-collapse when scenario panel opens, restore when it closes
  useEffect(() => {
    const onScenario = (e: Event) => {
      const open = (e as CustomEvent).detail?.open
      if (open) setCollapsed(true)
      // Don't auto-expand on close — let user control
    }
    window.addEventListener('ft-scenario-panel', onScenario)
    return () => window.removeEventListener('ft-scenario-panel', onScenario)
  }, [])

  // Symbol suggestions for add dropdown
  const ADD_UNIVERSE = [
    // ═══ Stocks — Tech / AI ═══
    {s:'AAPL',n:'Apple',g:'Stocks'},{s:'MSFT',n:'Microsoft',g:'Stocks'},{s:'NVDA',n:'NVIDIA',g:'Stocks'},
    {s:'GOOGL',n:'Alphabet',g:'Stocks'},{s:'META',n:'Meta Platforms',g:'Stocks'},{s:'AMZN',n:'Amazon',g:'Stocks'},
    {s:'TSLA',n:'Tesla',g:'Stocks'},{s:'AMD',n:'AMD',g:'Stocks'},{s:'NFLX',n:'Netflix',g:'Stocks'},
    {s:'AVGO',n:'Broadcom',g:'Stocks'},{s:'TSM',n:'Taiwan Semi',g:'Stocks'},{s:'ASML',n:'ASML Holding',g:'Stocks'},
    {s:'INTC',n:'Intel',g:'Stocks'},{s:'QCOM',n:'Qualcomm',g:'Stocks'},{s:'MU',n:'Micron',g:'Stocks'},
    {s:'ARM',n:'ARM Holdings',g:'Stocks'},{s:'SMCI',n:'Super Micro',g:'Stocks'},
    {s:'ORCL',n:'Oracle',g:'Stocks'},{s:'CRM',n:'Salesforce',g:'Stocks'},{s:'ADBE',n:'Adobe',g:'Stocks'},
    {s:'IBM',n:'IBM',g:'Stocks'},{s:'CSCO',n:'Cisco',g:'Stocks'},{s:'PLTR',n:'Palantir',g:'Stocks'},
    {s:'SNOW',n:'Snowflake',g:'Stocks'},{s:'DDOG',n:'Datadog',g:'Stocks'},{s:'NET',n:'Cloudflare',g:'Stocks'},
    {s:'CRWD',n:'CrowdStrike',g:'Stocks'},{s:'SHOP',n:'Shopify',g:'Stocks'},{s:'UBER',n:'Uber',g:'Stocks'},
    // ═══ Stocks — Finance / Fintech ═══
    {s:'JPM',n:'JPMorgan',g:'Stocks'},{s:'BAC',n:'Bank of America',g:'Stocks'},{s:'GS',n:'Goldman Sachs',g:'Stocks'},
    {s:'WFC',n:'Wells Fargo',g:'Stocks'},{s:'MS',n:'Morgan Stanley',g:'Stocks'},{s:'C',n:'Citigroup',g:'Stocks'},
    {s:'SCHW',n:'Charles Schwab',g:'Stocks'},{s:'BX',n:'Blackstone',g:'Stocks'},
    {s:'V',n:'Visa',g:'Stocks'},{s:'MA',n:'Mastercard',g:'Stocks'},{s:'PYPL',n:'PayPal',g:'Stocks'},
    {s:'SQ',n:'Block',g:'Stocks'},{s:'COIN',n:'Coinbase',g:'Stocks'},{s:'HOOD',n:'Robinhood',g:'Stocks'},
    {s:'MSTR',n:'MicroStrategy',g:'Stocks'},{s:'BRK-B',n:'Berkshire Hathaway',g:'Stocks'},
    // ═══ Stocks — Healthcare / Pharma ═══
    {s:'LLY',n:'Eli Lilly',g:'Stocks'},{s:'JNJ',n:'Johnson & Johnson',g:'Stocks'},{s:'UNH',n:'UnitedHealth',g:'Stocks'},
    {s:'PFE',n:'Pfizer',g:'Stocks'},{s:'MRK',n:'Merck',g:'Stocks'},{s:'ABBV',n:'AbbVie',g:'Stocks'},
    {s:'NVO',n:'Novo Nordisk',g:'Stocks'},
    // ═══ Stocks — Energy / Materials / Industrials ═══
    {s:'XOM',n:'ExxonMobil',g:'Stocks'},{s:'CVX',n:'Chevron',g:'Stocks'},{s:'SHEL',n:'Shell',g:'Stocks'},
    {s:'BP',n:'BP plc',g:'Stocks'},{s:'CAT',n:'Caterpillar',g:'Stocks'},{s:'DE',n:'Deere & Co',g:'Stocks'},
    {s:'BA',n:'Boeing',g:'Stocks'},{s:'GE',n:'GE Aerospace',g:'Stocks'},
    // ═══ Stocks — Consumer / Retail / Food ═══
    {s:'WMT',n:'Walmart',g:'Stocks'},{s:'COST',n:'Costco',g:'Stocks'},{s:'TGT',n:'Target',g:'Stocks'},
    {s:'HD',n:'Home Depot',g:'Stocks'},{s:'LOW',n:'Lowe’s',g:'Stocks'},
    {s:'KO',n:'Coca-Cola',g:'Stocks'},{s:'PEP',n:'PepsiCo',g:'Stocks'},{s:'MCD',n:'McDonald’s',g:'Stocks'},
    {s:'SBUX',n:'Starbucks',g:'Stocks'},{s:'NKE',n:'Nike',g:'Stocks'},{s:'PG',n:'Procter & Gamble',g:'Stocks'},
    {s:'DIS',n:'Disney',g:'Stocks'},
    // Additions — large-cap completers, healthcare, telecom, industrials, REIT, intl ADRs, semis, fintech
    {s:'TMO',n:'Thermo Fisher Scientific',g:'Stocks'},{s:'DHR',n:'Danaher',g:'Stocks'},{s:'ABT',n:'Abbott Laboratories',g:'Stocks'},
    {s:'ISRG',n:'Intuitive Surgical',g:'Stocks'},{s:'MDT',n:'Medtronic',g:'Stocks'},{s:'GILD',n:'Gilead Sciences',g:'Stocks'},
    {s:'AMGN',n:'Amgen',g:'Stocks'},{s:'REGN',n:'Regeneron Pharmaceuticals',g:'Stocks'},{s:'BMY',n:'Bristol-Myers Squibb',g:'Stocks'},
    {s:'CVS',n:'CVS Health',g:'Stocks'},{s:'ELV',n:'Elevance Health',g:'Stocks'},{s:'CI',n:'Cigna',g:'Stocks'},
    {s:'SYK',n:'Stryker',g:'Stocks'},{s:'ZTS',n:'Zoetis',g:'Stocks'},
    {s:'ACN',n:'Accenture',g:'Stocks'},{s:'TXN',n:'Texas Instruments',g:'Stocks'},{s:'VZ',n:'Verizon',g:'Stocks'},
    {s:'CMCSA',n:'Comcast',g:'Stocks'},{s:'PM',n:'Philip Morris International',g:'Stocks'},{s:'MO',n:'Altria',g:'Stocks'},
    {s:'RTX',n:'RTX Corporation',g:'Stocks'},{s:'LMT',n:'Lockheed Martin',g:'Stocks'},
    {s:'UPS',n:'United Parcel Service',g:'Stocks'},{s:'HON',n:'Honeywell',g:'Stocks'},{s:'ADP',n:'ADP',g:'Stocks'},
    {s:'SPGI',n:'S&P Global',g:'Stocks'},{s:'BLK',n:'BlackRock',g:'Stocks'},{s:'MMC',n:'Marsh & McLennan',g:'Stocks'},
    {s:'CB',n:'Chubb',g:'Stocks'},{s:'PGR',n:'Progressive',g:'Stocks'},
    {s:'BKNG',n:'Booking Holdings',g:'Stocks'},{s:'NOW',n:'ServiceNow',g:'Stocks'},
    {s:'TJX',n:'TJX Companies',g:'Stocks'},{s:'MDLZ',n:'Mondelez International',g:'Stocks'},{s:'TGT',n:'Target',g:'Stocks'},
    {s:'LIN',n:'Linde plc',g:'Stocks'},{s:'PLD',n:'Prologis',g:'Stocks'},{s:'SO',n:'Southern Company',g:'Stocks'},
    {s:'ADI',n:'Analog Devices',g:'Stocks'},{s:'KLAC',n:'KLA Corporation',g:'Stocks'},
    {s:'CDNS',n:'Cadence Design Systems',g:'Stocks'},{s:'SNPS',n:'Synopsys',g:'Stocks'},{s:'PANW',n:'Palo Alto Networks',g:'Stocks'},
    {s:'ABNB',n:'Airbnb',g:'Stocks'},
    // Crypto-linked equities
    {s:'MARA',n:'Marathon Digital Holdings',g:'Stocks'},{s:'RIOT',n:'Riot Platforms',g:'Stocks'},
    // EV / Auto — Chinese EV makers
    {s:'RIVN',n:'Rivian Automotive',g:'Stocks'},{s:'NIO',n:'NIO Inc',g:'Stocks'},
    {s:'LI',n:'Li Auto',g:'Stocks'},{s:'XPEV',n:'XPeng',g:'Stocks'},
    // International ADRs — China + Europe + LatAm + SE Asia
    {s:'BABA',n:'Alibaba Group',g:'Stocks'},{s:'JD',n:'JD.com',g:'Stocks'},
    {s:'PDD',n:'PDD Holdings',g:'Stocks'},{s:'NTES',n:'NetEase',g:'Stocks'},
    {s:'SAP',n:'SAP SE',g:'Stocks'},{s:'SE',n:'Sea Limited',g:'Stocks'},
    {s:'MELI',n:'MercadoLibre',g:'Stocks'},
    {s:'RBLX',n:'Roblox',g:'Stocks'},
    // ═══ Stocks — Auto / Travel ═══
    {s:'F',n:'Ford',g:'Stocks'},{s:'GM',n:'General Motors',g:'Stocks'},{s:'TM',n:'Toyota',g:'Stocks'},
    {s:'UAL',n:'United Airlines',g:'Stocks'},{s:'DAL',n:'Delta Air Lines',g:'Stocks'},

    // ═══ ETFs / Indices ═══
    {s:'SPY',n:'S&P 500 ETF',g:'ETFs'},{s:'QQQ',n:'Nasdaq 100 ETF',g:'ETFs'},
    {s:'IWM',n:'Russell 2000 ETF',g:'ETFs'},{s:'DIA',n:'Dow Jones ETF',g:'ETFs'},
    {s:'VTI',n:'Vanguard Total Market ETF',g:'ETFs'},{s:'VOO',n:'Vanguard S&P 500 ETF',g:'ETFs'},
    {s:'IVV',n:'iShares Core S&P 500 ETF',g:'ETFs'},{s:'SCHD',n:'Schwab US Dividend ETF',g:'ETFs'},
    {s:'VGT',n:'Vanguard Information Tech ETF',g:'ETFs'},{s:'ARKK',n:'ARK Innovation ETF',g:'ETFs'},
    {s:'TLT',n:'20Y Treasury ETF',g:'ETFs'},{s:'HYG',n:'High Yield Bond ETF',g:'ETFs'},
    {s:'GLD',n:'Gold ETF',g:'ETFs'},{s:'SLV',n:'Silver ETF',g:'ETFs'},
    {s:'XLF',n:'Financial Sector ETF',g:'ETFs'},{s:'XLE',n:'Energy Sector ETF',g:'ETFs'},
    {s:'XLK',n:'Technology Sector ETF',g:'ETFs'},
    {s:'XLV',n:'Health Care Sector ETF',g:'ETFs'},{s:'XLY',n:'Consumer Discretionary ETF',g:'ETFs'},
    {s:'XLP',n:'Consumer Staples ETF',g:'ETFs'},{s:'XLI',n:'Industrial Sector ETF',g:'ETFs'},
    {s:'XLU',n:'Utilities Sector ETF',g:'ETFs'},

    // ═══ Indices — US + Europe + Asia ═══
    {s:'^GSPC',n:'S&P 500',g:'Indices'},{s:'^IXIC',n:'Nasdaq Composite',g:'Indices'},
    {s:'^DJI',n:'Dow Jones Industrial',g:'Indices'},{s:'^RUT',n:'Russell 2000',g:'Indices'},
    {s:'^VIX',n:'VIX Volatility',g:'Indices'},
    {s:'^GDAXI',n:'DAX',g:'Indices'},{s:'^FTSE',n:'FTSE 100',g:'Indices'},
    {s:'^FCHI',n:'CAC 40',g:'Indices'},{s:'^STOXX50E',n:'Euro Stoxx 50',g:'Indices'},
    {s:'^N225',n:'Nikkei 225',g:'Indices'},{s:'^HSI',n:'Hang Seng',g:'Indices'},
    {s:'000001.SS',n:'Shanghai Composite',g:'Indices'},

    // ═══ Futures — Index + Commodities + Rates + Agriculturals ═══
    {s:'ES=F',n:'S&P 500 E-mini',g:'Futures'},{s:'NQ=F',n:'Nasdaq 100 E-mini',g:'Futures'},
    {s:'YM=F',n:'Dow Jones E-mini',g:'Futures'},{s:'RTY=F',n:'Russell 2000 E-mini',g:'Futures'},
    {s:'ZN=F',n:'US 10Y Treasury',g:'Futures'},{s:'GE=F',n:'Eurodollar',g:'Futures'},
    {s:'GC=F',n:'Gold Futures',g:'Futures'},{s:'SI=F',n:'Silver Futures',g:'Futures'},
    {s:'HG=F',n:'Copper Futures',g:'Futures'},{s:'PL=F',n:'Platinum Futures',g:'Futures'},
    {s:'CL=F',n:'WTI Crude Oil',g:'Futures'},{s:'NG=F',n:'Natural Gas',g:'Futures'},
    {s:'HO=F',n:'Heating Oil',g:'Futures'},{s:'RB=F',n:'Gasoline Futures',g:'Futures'},
    {s:'ZC=F',n:'Corn Futures',g:'Futures'},{s:'ZW=F',n:'Wheat Futures',g:'Futures'},
    {s:'ZS=F',n:'Soybean Futures',g:'Futures'},{s:'KC=F',n:'Coffee Futures',g:'Futures'},
    {s:'SB=F',n:'Sugar Futures',g:'Futures'},

    // ═══ Forex ═══
    {s:'EURUSD=X',n:'EUR/USD',g:'Forex'},{s:'GBPUSD=X',n:'GBP/USD',g:'Forex'},{s:'USDJPY=X',n:'USD/JPY',g:'Forex'},
    {s:'USDCHF=X',n:'USD/CHF',g:'Forex'},{s:'AUDUSD=X',n:'AUD/USD',g:'Forex'},{s:'USDCAD=X',n:'USD/CAD',g:'Forex'},
    {s:'NZDUSD=X',n:'NZD/USD',g:'Forex'},{s:'EURGBP=X',n:'EUR/GBP',g:'Forex'},{s:'EURJPY=X',n:'EUR/JPY',g:'Forex'},
    {s:'GBPJPY=X',n:'GBP/JPY',g:'Forex'},{s:'AUDJPY=X',n:'AUD/JPY',g:'Forex'},{s:'CHFJPY=X',n:'CHF/JPY',g:'Forex'},

    // ═══ Crypto ═══
    {s:'BTC-USD',n:'Bitcoin',g:'Crypto'},{s:'ETH-USD',n:'Ethereum',g:'Crypto'},{s:'SOL-USD',n:'Solana',g:'Crypto'},
    {s:'BNB-USD',n:'Binance Coin',g:'Crypto'},{s:'XRP-USD',n:'Ripple',g:'Crypto'},{s:'ADA-USD',n:'Cardano',g:'Crypto'},
    {s:'AVAX-USD',n:'Avalanche',g:'Crypto'},{s:'DOGE-USD',n:'Dogecoin',g:'Crypto'},
    {s:'LINK-USD',n:'Chainlink',g:'Crypto'},{s:'MATIC-USD',n:'Polygon',g:'Crypto'},
    {s:'LTC-USD',n:'Litecoin',g:'Crypto'},{s:'DOT-USD',n:'Polkadot',g:'Crypto'},
    {s:'ARB-USD',n:'Arbitrum',g:'Crypto'},{s:'OP-USD',n:'Optimism',g:'Crypto'},
    {s:'TRX-USD',n:'TRON',g:'Crypto'},
    {s:'ATOM-USD',n:'Cosmos',g:'Crypto'},{s:'UNI-USD',n:'Uniswap',g:'Crypto'},
    {s:'ETC-USD',n:'Ethereum Classic',g:'Crypto'},{s:'FIL-USD',n:'Filecoin',g:'Crypto'},
    {s:'APT-USD',n:'Aptos',g:'Crypto'},
  ]

  const addSuggestions = useMemo(() => {
    const q = addInput.trim().toLowerCase()
    const inWL = new Set(watchlist.map(w => w.sym))
    const filtered = ADD_UNIVERSE.filter(u => !inWL.has(u.s)).filter(u => {
      if (!q) return true
      return u.s.toLowerCase().includes(q) || u.n.toLowerCase().includes(q) ||
        u.s.replace('=X','').toLowerCase().includes(q) || u.g.toLowerCase().includes(q)
    })
    // Group
    const groups: Record<string,typeof filtered> = {}
    filtered.forEach(u => { (groups[u.g] ??= []).push(u) })
    return groups
  }, [addInput, watchlist])

  const addSym = (s: string) => { addToWatchlist(s); setAddInput(''); setShowAdd(false) }
  const addManual = () => { const s = addInput.trim().toUpperCase(); if (s) addSym(s) }

  const fxDisplay = (s: string) => s.endsWith('=X') ? s.replace('=X','') : s

  useEffect(()=>{
    watchlist.forEach(({sym})=>{
      if(sparkData[sym])return
      fetchPriceHistory(sym,'1mo').then(d=>{
        if(d?.close?.length)setSparkData(p=>({...p,[sym]:d.close.slice(-20)}))
      }).catch(()=>{})
    })
  },[watchlist])

  if(collapsed){
    return(
      <div style={{width:28,background:'#0e1117',borderLeft:'1px solid #21262d',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:8,flexShrink:0}}>
        <div role="button" tabIndex={0} onClick={()=>setCollapsed(false)} onKeyDown={onActivate(()=>setCollapsed(false))} style={{cursor:'pointer',color:'#30363d',fontSize:11,writingMode:'vertical-rl',letterSpacing:0.7,marginTop:8}}
          onMouseEnter={e=>(e.currentTarget.style.color='#8b949e')} onMouseLeave={e=>(e.currentTarget.style.color='#30363d')}>WATCHLIST</div>
      </div>
    )
  }

  return(
    <aside style={{width:250,background:'#0e1117',borderLeft:'1px solid #21262d',display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 8px',borderBottom:'1px solid #21262d'}}>
        <div style={{display:'flex',gap:0}}>
          {(['chart','research'] as const).map(m=>(
            <span key={m} role="button" tabIndex={0} onClick={()=>setMode(m)} onKeyDown={onActivate(()=>setMode(m))}
              style={{padding:'3px 8px',fontSize:10,cursor:'pointer',color:mode===m?'#c9d1d9':'#484f58',fontWeight:mode===m?500:400,
                borderBottom:mode===m?'1px solid #388bfd':'1px solid transparent',letterSpacing:'0.02em'}}>
              {m==='chart'?'CHART':'RESEARCH'}
            </span>
          ))}
        </div>
        <div style={{display:'flex',gap:2,alignItems:'center'}}>
          <span role="button" tabIndex={0} onClick={()=>{setShowAdd(!showAdd);setAddInput('')}} onKeyDown={onActivate(()=>{setShowAdd(!showAdd);setAddInput('')})} style={{cursor:'pointer',color:showAdd?'#388bfd':'#30363d',fontSize:14,lineHeight:1}}
            onMouseEnter={e=>(e.currentTarget.style.color='#388bfd')} onMouseLeave={e=>{if(!showAdd)e.currentTarget.style.color='#30363d'}}>+</span>
          <span role="button" tabIndex={0} onClick={()=>setCollapsed(true)} onKeyDown={onActivate(()=>setCollapsed(true))} style={{cursor:'pointer',color:'#30363d',fontSize:10,marginLeft:4}}
            onMouseEnter={e=>(e.currentTarget.style.color='#8b949e')} onMouseLeave={e=>(e.currentTarget.style.color='#30363d')}>▷</span>
        </div>
      </div>

      {/* Add — Smart dropdown with suggestions */}
      {showAdd&&(
        <div style={{borderBottom:'1px solid #21262d',maxHeight:280,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',padding:'4px 8px',gap:4}}>
            <input value={addInput} onChange={e=>setAddInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')addManual();if(e.key==='Escape')setShowAdd(false)}}
              placeholder="Search symbols..." aria-label="Search symbols" style={{flex:1,fontSize:10,padding:'3px 6px'}} autoFocus/>
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            {Object.entries(addSuggestions).map(([group, items]) => (
              <div key={group}>
                <div style={{fontSize:8,color:'#30363d',padding:'4px 10px',textTransform:'uppercase',letterSpacing:0.4}}>{group}</div>
                {items.slice(0, group === 'Forex' ? 12 : group === 'Stocks' ? 20 : group === 'Indices' ? 12 : 15).map(u => (
                  <div key={u.s} role="button" tabIndex={0} onClick={() => addSym(u.s)} onKeyDown={onActivate(() => addSym(u.s))}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'3px 10px',cursor:'pointer',fontSize:10}}
                    onMouseEnter={e=>(e.currentTarget.style.background='#161b22')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                    <Logo sym={u.s} />
                    <span style={{color:'#c9d1d9',fontWeight:500,fontFamily:mono,fontSize:9}}>{fxDisplay(u.s)}</span>
                    <span style={{color:'#484f58',fontSize:9,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.n}</span>
                  </div>
                ))}
              </div>
            ))}
            {Object.keys(addSuggestions).length === 0 && addInput && (
              <div style={{padding:'8px 10px',fontSize:9,color:'#484f58'}}>
                No matches. Press Enter to add "{addInput.toUpperCase()}" manually.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rows — grouped by section, with drag-to-reorder */}
      <div style={{flex:1,overflowY:'auto'}}>
        {watchSections.map(section => (
          <SectionBlock
            key={section.id}
            section={section}
            mode={mode}
            prices={prices}
            sparkData={sparkData}
            currentTicker={currentTicker}
            hovSym={hovSym}
            setHovSym={setHovSym}
            navigate={navigate}
            removeFromWatchlist={removeFromWatchlist}
            renameSection={renameSection}
            removeSection={removeSection}
            toggleSectionCollapse={toggleSectionCollapse}
            moveTicker={moveTicker}
            reorderInSection={reorderInSection}
            allowSectionRemove={watchSections.length > 1}
            fxDisplay={fxDisplay}
          />
        ))}
        {/* "+ Add section" footer */}
        <div style={{padding:'8px 10px',borderTop:'1px solid #161b22',display:'flex',gap:6}}>
          <span role="button" tabIndex={0} onClick={() => {
              const name = window.prompt('Section name:', 'NEW SECTION')
              if (name && name.trim()) addSection(name)
            }} onKeyDown={onActivate(() => {
              const name = window.prompt('Section name:', 'NEW SECTION')
              if (name && name.trim()) addSection(name)
            })}
            style={{fontSize:10,color:'#388bfd',cursor:'pointer',letterSpacing:0.4,fontFamily:mono}}
            onMouseEnter={e=>(e.currentTarget.style.color='#58a6ff')}
            onMouseLeave={e=>(e.currentTarget.style.color='#388bfd')}>
            + add section
          </span>
        </div>
      </div>
    </aside>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SectionBlock — renders one collapsible section with drag-and-drop rows
// ═══════════════════════════════════════════════════════════════════
function SectionBlock({ section, mode, prices, sparkData, currentTicker, hovSym, setHovSym, navigate, removeFromWatchlist, renameSection, removeSection, toggleSectionCollapse, moveTicker, reorderInSection, allowSectionRemove, fxDisplay }: any) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(section.name)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [headerDragOver, setHeaderDragOver] = useState(false)

  const commitRename = () => {
    setEditing(false)
    if (editValue.trim() && editValue.trim() !== section.name) renameSection(section.id, editValue)
  }

  // Drag handlers — payload format "sym|fromSectionId|fromIdx" so a drop knows
  // exactly what's moving and can either reorder within section or move between.
  const onDragStartRow = (e: React.DragEvent, sym: string, fromIdx: number) => {
    e.dataTransfer.setData('text/plain', `${sym}|${section.id}|${fromIdx}`)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOverRow = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }
  const onDropRow = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    setDragOverIdx(null)
    const data = e.dataTransfer.getData('text/plain')
    if (!data) return
    const [sym, fromSectionId, fromIdxStr] = data.split('|')
    const fromIdx = parseInt(fromIdxStr, 10)
    if (fromSectionId === section.id) {
      reorderInSection(section.id, fromIdx, targetIdx)
    } else {
      moveTicker(sym, section.id, targetIdx)
    }
  }
  const onDropHeader = (e: React.DragEvent) => {
    e.preventDefault()
    setHeaderDragOver(false)
    const data = e.dataTransfer.getData('text/plain')
    if (!data) return
    const [sym, fromSectionId] = data.split('|')
    if (fromSectionId !== section.id) moveTicker(sym, section.id)  // append to end
  }

  return (
    <div>
      {/* Section header — collapsible + renameable + drag-target for inter-section moves */}
      <div
        onDragOver={e => { e.preventDefault(); setHeaderDragOver(true) }}
        onDragLeave={() => setHeaderDragOver(false)}
        onDrop={onDropHeader}
        style={{
          display:'flex', alignItems:'center', gap:4,
          padding:'4px 8px', background: headerDragOver ? 'rgba(56,139,253,0.10)' : '#0b0f14',
          borderTop:'1px solid #21262d', borderBottom:'1px solid #21262d',
          fontSize:9, letterSpacing:0.5, color:'#8b949e', textTransform:'uppercase',
          cursor:'default', userSelect:'none',
        }}>
        <span role="button" tabIndex={0} onClick={() => toggleSectionCollapse(section.id)} onKeyDown={onActivate(() => toggleSectionCollapse(section.id))}
          style={{ cursor:'pointer', fontSize:8, color:'#484f58', width:10, textAlign:'center', display:'inline-block', transform: section.collapsed ? 'rotate(0)' : 'rotate(90deg)', transition:'transform 120ms' }}>▶</span>
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setEditValue(section.name) }}}
            style={{
              flex:1, fontSize:9, padding:'2px 4px',
              background:'#0e1117', border:'1px solid #388bfd', borderRadius:2,
              color:'#c9d1d9', outline:'none', fontFamily:'inherit', textTransform:'uppercase', letterSpacing:0.5,
            }}
          />
        ) : (
          <span onDoubleClick={() => { setEditValue(section.name); setEditing(true) }}
            style={{ flex:1, fontWeight:600, cursor:'text' }}
            title="Double-click to rename">
            {section.name}
            <span style={{ marginLeft:6, color:'#30363d', fontWeight:400 }}>({section.tickers.length})</span>
          </span>
        )}
        {allowSectionRemove && !editing && (
          <span role="button" tabIndex={0} onClick={() => {
              if (window.confirm(`Remove section "${section.name}"? Tickers will move to the next section.`)) removeSection(section.id)
            }} onKeyDown={onActivate(() => {
              if (window.confirm(`Remove section "${section.name}"? Tickers will move to the next section.`)) removeSection(section.id)
            })}
            style={{ cursor:'pointer', color:'#30363d', fontSize:11, padding:'0 3px' }}
            onMouseEnter={e=>(e.currentTarget.style.color='#f85149')}
            onMouseLeave={e=>(e.currentTarget.style.color='#30363d')}>×</span>
        )}
      </div>

      {/* Rows in this section — drag-and-drop reorderable */}
      {!section.collapsed && section.tickers.map((sym: string, idx: number) => {
        const p=prices[sym], price=p?.price??null, chg=p?.chg??0, pct=p?.pct??0, vol=p?.vol
        const active=currentTicker===sym, hov=hovSym===sym
        const col=pct>0?'#3fb950':pct<0?'#f85149':'#30363d'
        const spark=sparkData[sym]
        const isDragOver = dragOverIdx === idx

        const dragProps = {
          draggable: true,
          onDragStart: (e: React.DragEvent) => onDragStartRow(e, sym, idx),
          onDragOver:  (e: React.DragEvent) => onDragOverRow(e, idx),
          onDragLeave: () => setDragOverIdx(null),
          onDrop:      (e: React.DragEvent) => onDropRow(e, idx),
          onDragEnd:   () => setDragOverIdx(null),
        }

        if (mode==='chart') {
          return (
            <div key={sym} role="button" tabIndex={0} {...dragProps}
              onClick={()=>navigate(`/charts?sym=${sym}`)}
              onKeyDown={onActivate(()=>navigate(`/charts?sym=${sym}`))}
              onMouseEnter={()=>setHovSym(sym)} onMouseLeave={()=>setHovSym(null)}
              style={{display:'grid',gridTemplateColumns:'24px 1fr 50px 46px 38px',alignItems:'center',padding:'3px 8px',height:30,cursor:'grab',
                borderBottom:'1px solid #161b22', borderTop: isDragOver ? '2px solid #388bfd' : '2px solid transparent',
                borderLeft:active?'2px solid #388bfd':'2px solid transparent',
                background:active?'#161b22':hov?'#0e1117':'transparent',transition:'background 0.05s'}}>
              <Logo sym={sym}/>
              <div style={{display:'flex',alignItems:'center',gap:3,paddingLeft:3,minWidth:0}}>
                <span style={{fontSize:11,fontWeight:active?600:500,color:'#c9d1d9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fxDisplay(sym)}</span>
                {hov&&<span role="button" tabIndex={0} onClick={e=>{e.stopPropagation();removeFromWatchlist(sym)}} onKeyDown={onActivate(e=>{e.stopPropagation();removeFromWatchlist(sym)})} style={{fontSize:9,color:'#30363d',flexShrink:0,cursor:'pointer'}}
                  onMouseEnter={e=>(e.currentTarget.style.color='#f85149')} onMouseLeave={e=>(e.currentTarget.style.color='#30363d')}>×</span>}
              </div>
              <span style={{fontSize:10,textAlign:'right',color:'#c9d1d9',fontFamily:mono,fontVariantNumeric:'tabular-nums'}}>{formatPrice(sym, price)}</span>
              <span style={{fontSize:10,textAlign:'right',color:col,fontFamily:mono,fontVariantNumeric:'tabular-nums',fontWeight:500}}>{price!=null?(pct>=0?'+':'')+pct.toFixed(2)+'%':''}</span>
              <div style={{display:'flex',justifyContent:'flex-end'}}>{spark&&<Sp data={spark} color={col}/>}</div>
            </div>
          )
        }

        // Research mode
        return (
          <div key={sym} role="button" tabIndex={0} {...dragProps}
            onClick={()=>navigate(`/ticker/${sym}`)}
            onKeyDown={onActivate(()=>navigate(`/ticker/${sym}`))}
            onMouseEnter={()=>setHovSym(sym)} onMouseLeave={()=>setHovSym(null)}
            style={{padding:'6px 8px',cursor:'grab',borderBottom:'1px solid #21262d',
              borderTop: isDragOver ? '2px solid #388bfd' : '2px solid transparent',
              borderLeft:active?'2px solid #388bfd':'2px solid transparent',
              background:active?'#161b22':hov?'#0e1117':'transparent',transition:'background 0.05s'}}>
            <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
              <Logo sym={sym}/>
              <span style={{fontSize:12,fontWeight:500,color:'#c9d1d9'}}>{fxDisplay(sym)}</span>
              <span style={{marginLeft:'auto',fontSize:12,fontWeight:600,color:'#c9d1d9',fontFamily:mono}}>{formatPrice(sym, price)}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingLeft:21}}>
              <div style={{display:'flex',gap:6,fontSize:10,fontFamily:mono}}>
                <span style={{color:col}}>{price!=null?(chg>=0?'+':'')+chg.toFixed(getPrecision(sym)):''}</span>
                <span style={{color:col,fontWeight:500}}>{price!=null?(pct>=0?'+':'')+pct.toFixed(2)+'%':''}</span>
                {vol!=null&&<span style={{color:'#30363d'}}>{fmtVol(vol)}</span>}
              </div>
              <div style={{display:'flex',gap:4,alignItems:'center'}}>
                {spark&&<Sp data={spark} color={col}/>}
                <span role="button" tabIndex={0} onClick={e=>{e.stopPropagation();removeFromWatchlist(sym)}} onKeyDown={onActivate(e=>{e.stopPropagation();removeFromWatchlist(sym)})} style={{color:'#30363d',cursor:'pointer',fontSize:10}}
                  onMouseEnter={e=>(e.currentTarget.style.color='#f85149')} onMouseLeave={e=>(e.currentTarget.style.color='#30363d')}>×</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
