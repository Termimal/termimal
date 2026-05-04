// components/layout/Navbar.tsx — TradingView tabs with drag-to-reorder
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, selectRegime } from '@/store/useStore'
import { Logo } from '@/components/common/Logo'
import { supabase } from '@/lib/supabase'
import { onActivate } from '@/lib/a11y'
import { UNIVERSE, type Ticker } from '@/constants/universe'

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

  // ── Responsive viewport tracking ────────────────────────
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const isMobile = viewportWidth < 900   // below tablet portrait
  const isTablet = viewportWidth < 1200  // squeeze the tab row a bit

  // Hamburger drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Close drawer when navigating
  useEffect(() => {
    if (drawerOpen) setDrawerOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])
  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [drawerOpen])

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
      <div style={{ display: 'flex', alignItems: 'center', height: 48, background: '#161b22', borderBottom: '1px solid #21262d', padding: '0 12px', gap: 10 }}>
        {/* Mobile hamburger — opens slide-out drawer */}
        {isMobile && (
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            style={{
              width: 36, height: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4, background: 'transparent', border: '1px solid #21262d', borderRadius: 4, cursor: 'pointer', padding: 0,
            }}
          >
            <span style={{ width: 16, height: 2, background: '#c9d1d9', borderRadius: 1 }} />
            <span style={{ width: 16, height: 2, background: '#c9d1d9', borderRadius: 1 }} />
            <span style={{ width: 16, height: 2, background: '#c9d1d9', borderRadius: 1 }} />
          </button>
        )}
        {/* Back-to-website link (hard navigation — breaks out of /terminal SPA basename) */}
        {!isMobile && (
          <a
            href="/"
            title="Back to termimal.com"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', textDecoration: 'none', color: '#8b949e', fontSize: 12, border: '1px solid #21262d', borderRadius: 2, marginRight: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c9d1d9'; e.currentTarget.style.borderColor = '#30363d' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.borderColor = '#21262d' }}
          >
            <span aria-hidden style={{ fontSize: 12 }}>←</span>
            <span style={{ fontSize: 11, letterSpacing: 0.3 }}>Site</span>
          </a>
        )}
        {/* Logo — also hard-navigates home */}
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', cursor: 'pointer', marginRight: 4 }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', letterSpacing: 0.4 }}>TERMIMAL</span>
          <span title="Build version" style={{ fontSize: 8, color: '#484f58', marginLeft: 4, fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>v6.9</span>
        </a>
        {!isMobile && <div style={{ width: 1, height: 20, background: '#21262d' }} />}
        {/* Search — narrows progressively. On phones it gets a flex:1
            slot so it fills the rest of the top-bar; on tablet it's
            180px; on desktop 240px. Hidden only when hamburger drawer
            is the chosen entry point — but search is too useful to
            hide entirely, so we keep it on phones too. */}
        <div
          ref={searchBoxRef}
          style={{
            position: 'relative',
            width: isMobile ? undefined : isTablet ? 180 : 240,
            flex: isMobile ? 1 : undefined,
            minWidth: 0,
          }}
        >
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="#8b949e"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input ref={inputRef} value={query} onChange={e => onSearch(e.target.value)}
              onFocus={() => { onSearch(query) }} onKeyDown={onKey}
              placeholder={isMobile ? 'Search…' : 'Search symbol or name...  ⌘K'}
              aria-label="Search symbol or name"
              style={{ width: '100%', background: '#0e1117', border: '1px solid #21262d', borderRadius: 2, fontSize: isMobile ? 13 : 11, color: '#c9d1d9', padding: isMobile ? '8px 10px 8px 28px' : '4px 8px 4px 26px', outline: 'none' }} />
          </div>
          {searchOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, width: 360, marginTop: 4, background: '#161b22', border: '1px solid #21262d', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 200, maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
              {/* Category tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #21262d', flexShrink: 0, overflowX: 'auto' }}>
                {[{k:'all',l:'All'},{k:'Stock',l:'Stocks'},{k:'ETF',l:'ETFs'},{k:'Index',l:'Indices'},{k:'Crypto',l:'Crypto'},{k:'Forex',l:'Forex'},{k:'Futures',l:'Futures'}].map(c=>(
                  <span key={c.k} role="button" tabIndex={0} onClick={()=>{setSearchCat(c.k);onSearch(query,c.k)}} onKeyDown={onActivate(()=>{setSearchCat(c.k);onSearch(query,c.k)})}
                    style={{padding:'5px 10px',fontSize:10,cursor:'pointer',flexShrink:0,
                      color:searchCat===c.k?'#c9d1d9':'#484f58',fontWeight:searchCat===c.k?500:400,
                      borderBottom:searchCat===c.k?'1px solid #388bfd':'1px solid transparent'}}>{c.l}</span>
                ))}
              </div>
              {/* Results */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
              {hits.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: '#484f58' }}>
                  {query ? <>No results for "{query}" · <button onClick={() => goTo(query.toUpperCase())} style={{ color: '#388bfd', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>Try {query.toUpperCase()}</button></> : 'Type to search'}
                </div>
              ) : hits.map((t, i) => (
                <div key={t.s} role="button" tabIndex={0} onClick={() => goTo(t.s)} onKeyDown={onActivate(() => goTo(t.s))} onMouseEnter={() => setSel(i)}
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
        {!isMobile && <div style={{ flex: 1 }} />}
        {/* Regime + connection + clock — hidden on mobile to save horizontal room */}
        {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 2, fontSize: 11, fontWeight: 500, color: regCol, background: regCol + '15' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: regCol }} className="pulse-dot" /> {regime}
        </div>
        )}
        <div
          title={
            apiOnline ? 'Backend reachable.'
              : apiOffline ? 'Backend unreachable. Check VITE_BACKEND_URL or try again.'
              : 'Trying to reach the backend...'
          }
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: apiOnline ? '#3fb950' : apiOffline ? '#f85149' : '#d29922' }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: apiOnline ? '#3fb950' : apiOffline ? '#f85149' : '#d29922' }} />
          {!isMobile && (apiOnline ? 'Live' : apiOffline ? 'Offline' : 'Connecting...')}
        </div>
        {!isMobile && (
        <span style={{ fontSize: 12, color: '#484f58', fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace", fontVariantNumeric: 'tabular-nums', letterSpacing: 0.3 }}>{clock}</span>
        )}

        {/* ═══ Account Menu ═══ Desktop only — on mobile, profile / billing / sign-out
            live inside the hamburger drawer so we don't have two separate menus. */}
        {!isMobile && (
        <div ref={acctRef} style={{ position: 'relative', marginLeft: 4 }}>
          <div role="button" tabIndex={0} onClick={() => setAcctOpen(!acctOpen)} onKeyDown={onActivate(() => setAcctOpen(!acctOpen))}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 9, fontWeight: 600, letterSpacing: '0.02em',
              color: acctOpen ? '#c9d1d9' : '#8b949e',
              background: acctOpen ? '#388bfd' : '#161b22',
              border: `1px solid ${acctOpen ? '#388bfd' : '#21262d'}`,
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
        )}
      </div>

      {/* ── Tab bar with drag-to-reorder — hidden on mobile (use hamburger) ── */}
      {!isMobile && (
      <div style={{ display: 'flex', alignItems: 'stretch', height: 42, background: '#0e1117', borderBottom: '1px solid #21262d', paddingLeft: 6, overflowX: 'auto' }}>
        {openTabs.map((tabPath, idx) => {
          const page = ALL_PAGES.find(p => p.path === tabPath)
          if (!page) return null
          const active = location.pathname === tabPath
          const isDragOver = dragOverIdx === idx && dragIdx !== idx
          return (
            <div key={tabPath}
              role="button" tabIndex={0}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={onDragEnd}
              onClick={() => navigate(tabPath)}
              onKeyDown={onActivate(() => navigate(tabPath))}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: '100%',
                padding: '0 18px', cursor: 'grab', fontSize: 13, whiteSpace: 'nowrap',
                fontWeight: active ? 600 : 500,
                transition: 'color 120ms ease-out, background 120ms ease-out', position: 'relative',
                background: active ? '#161b22' : 'transparent',
                color: active ? '#f0f6fc' : '#8b949e',
                borderBottom: active ? '2px solid #388bfd' : '2px solid transparent',
                borderLeft: isDragOver ? '2px solid #388bfd' : 'none',
                letterSpacing: 0.2,
                opacity: dragIdx === idx ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#c9d1d9' }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' }}}>
              <span>{page.label}</span>
              {openTabs.length > 1 && (
                <span role="button" tabIndex={0} onClick={e => closeTab(tabPath, e)} onKeyDown={onActivate(e => closeTab(tabPath, e as any))}
                  style={{ marginLeft: 6, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, fontSize: 12, color: '#484f58' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#30363d'; e.currentTarget.style.color = '#c9d1d9' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' }}>×</span>
              )}
            </div>
          )
        })}

        {/* + button → opens new tab landing page */}
        <div style={{ position: 'relative', zIndex: 300, display: 'flex', alignItems: 'center', height: '100%' }}>
          <div role="button" tabIndex={0} onClick={() => { if (!openTabs.includes('/newtab')) { setOpenTabs([...openTabs, '/newtab']); } navigate('/newtab') }} onKeyDown={onActivate(() => { if (!openTabs.includes('/newtab')) { setOpenTabs([...openTabs, '/newtab']); } navigate('/newtab') })}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 3, marginLeft: 6, fontSize: 17, lineHeight: 1, color: '#8b949e' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#161b22'; e.currentTarget.style.color = '#c9d1d9' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' }}>+</div>
        </div>
      </div>
      )}

      {/* ── Mobile hamburger drawer ── */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-label="Mobile navigation"
          aria-modal="true"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.55)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: 'min(86vw, 320px)',
              background: '#0e1117',
              borderRight: '1px solid #21262d',
              display: 'flex', flexDirection: 'column',
              boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #21262d' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#c9d1d9', letterSpacing: 0.4 }}>TERMIMAL</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#8b949e', fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            {/* User identity */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #21262d' }}>
              <div style={{ fontSize: 13, color: '#c9d1d9', fontWeight: 500 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{authUser.email ?? 'Not signed in'}</div>
            </div>
            {/* Navigation list */}
            <nav style={{ flex: 1, padding: '8px 0' }}>
              {ALL_PAGES.map(p => {
                const active = location.pathname === p.path
                return (
                  <a
                    key={p.path}
                    href={p.path === '/' ? '/terminal' : `/terminal${p.path}`}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(p.path)
                      setDrawerOpen(false)
                    }}
                    style={{
                      display: 'block', padding: '12px 18px',
                      fontSize: 14, color: active ? '#388bfd' : '#c9d1d9',
                      background: active ? '#161b22' : 'transparent',
                      borderLeft: active ? '3px solid #388bfd' : '3px solid transparent',
                      textDecoration: 'none',
                    }}
                  >
                    {p.label}
                  </a>
                )
              })}
            </nav>
            {/* Account / billing / site */}
            <div style={{ borderTop: '1px solid #21262d', padding: '8px 0' }}>
              <a href="/" style={{ display: 'block', padding: '12px 18px', fontSize: 13, color: '#8b949e', textDecoration: 'none' }}>← Back to termimal.com</a>
              <a href="/dashboard/profile" style={{ display: 'block', padding: '12px 18px', fontSize: 13, color: '#8b949e', textDecoration: 'none' }}>Profile</a>
              <a href="/dashboard/billing" style={{ display: 'block', padding: '12px 18px', fontSize: 13, color: '#8b949e', textDecoration: 'none' }}>Subscription &amp; billing</a>
              <a href="/pricing" style={{ display: 'block', padding: '12px 18px', fontSize: 13, color: '#388bfd', textDecoration: 'none' }}>Upgrade plan</a>
              <a href="/support" style={{ display: 'block', padding: '12px 18px', fontSize: 13, color: '#8b949e', textDecoration: 'none' }}>Help &amp; contact</a>
              <a
                href="#"
                onClick={async (e) => {
                  e.preventDefault()
                  try { await supabase.auth.signOut() } catch {}
                  window.location.href = '/login'
                }}
                style={{ display: 'block', padding: '12px 18px', fontSize: 13, color: '#f85149', textDecoration: 'none' }}
              >
                Sign out
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
