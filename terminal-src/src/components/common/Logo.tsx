// components/common/Logo.tsx — Real brand logos (CDN) with SVG fallback for FX / crypto / commodities
// Equity / ETF: tries Parqet CDN first → custom SVG → letter avatar
// FX, crypto, commodity futures, indices: keep custom SVGs (better than any CDN)
import { useState } from 'react'

const COLORS: Record<string,string> = {A:'#388bfd',B:'#8957e5',C:'#3fb950',D:'#d29922',E:'#f85149',F:'#388bfd',G:'#8957e5',H:'#3fb950',I:'#d29922',J:'#f85149',K:'#388bfd',L:'#8957e5',M:'#3fb950',N:'#d29922',O:'#f85149',P:'#388bfd',Q:'#8957e5',R:'#3fb950',S:'#d29922',T:'#f85149',U:'#388bfd',V:'#8957e5',W:'#3fb950',X:'#d29922',Y:'#f85149',Z:'#388bfd'}

const sz = 18

function LetterAv({sym}:{sym:string}) {
  const c = COLORS[sym[0]] ?? '#484f58'
  return <div style={{width:sz,height:sz,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:'#0e1117',background:c,flexShrink:0,borderRadius:'50%'}}>{sym[0]}</div>
}

// ═══ Country flag SVGs (simplified, recognizable) ═══
function FlagEUR() {
  return <><rect width="18" height="18" fill="#003399"/>{[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
    const a = (i * 30 - 90) * Math.PI / 180
    return <circle key={i} cx={9 + 4 * Math.cos(a)} cy={9 + 4 * Math.sin(a)} r="0.8" fill="#FFCC00"/>
  })}</>
}
function FlagUSD() {
  return <><rect width="18" height="18" fill="#B22234"/><rect y="2.6" width="18" height="2.6" fill="#fff"/><rect y="7.8" width="18" height="2.6" fill="#fff"/><rect y="13" width="18" height="2.6" fill="#fff"/><rect width="8" height="10.4" fill="#3C3B6E"/><circle cx="2.5" cy="2" r="0.5" fill="#fff"/><circle cx="5" cy="2" r="0.5" fill="#fff"/><circle cx="2.5" cy="4.5" r="0.5" fill="#fff"/><circle cx="5" cy="4.5" r="0.5" fill="#fff"/><circle cx="2.5" cy="7" r="0.5" fill="#fff"/><circle cx="5" cy="7" r="0.5" fill="#fff"/><circle cx="7" cy="2" r="0.5" fill="#fff"/><circle cx="7" cy="4.5" r="0.5" fill="#fff"/><circle cx="7" cy="7" r="0.5" fill="#fff"/></>
}
function FlagGBP() {
  return <><rect width="18" height="18" fill="#012169"/><path d="M0 0L18 18M18 0L0 18" stroke="#fff" strokeWidth="3"/><path d="M0 0L18 18M18 0L0 18" stroke="#C8102E" strokeWidth="1.5"/><path d="M9 0v18M0 9h18" stroke="#fff" strokeWidth="4"/><path d="M9 0v18M0 9h18" stroke="#C8102E" strokeWidth="2.5"/></>
}
function FlagJPY() {
  return <><rect width="18" height="18" fill="#fff"/><circle cx="9" cy="9" r="5" fill="#BC002D"/></>
}
function FlagCHF() {
  return <><rect width="18" height="18" fill="#D52B1E"/><rect x="7" y="3" width="4" height="12" fill="#fff"/><rect x="3" y="7" width="12" height="4" fill="#fff"/></>
}
function FlagAUD() {
  return <><rect width="18" height="18" fill="#00008B"/><path d="M1 1L5 3L1 5z" fill="#fff"/><circle cx="13" cy="5" r="1" fill="#fff"/><circle cx="15" cy="9" r="1" fill="#fff"/><circle cx="13" cy="13" r="1" fill="#fff"/><circle cx="10" cy="11" r="1" fill="#fff"/><circle cx="11.5" cy="8" r="0.6" fill="#fff"/></>
}
function FlagCAD() {
  return <><rect width="18" height="18" fill="#fff"/><rect width="5" height="18" fill="#FF0000"/><rect x="13" width="5" height="18" fill="#FF0000"/><path d="M9 4L10 7H8L9 4zM7 8L9 10L11 8L10 12H8L7 8z" fill="#FF0000"/></>
}
function FlagNZD() {
  return <><rect width="18" height="18" fill="#00247D"/><path d="M1 1L4 2.5L1 4z" fill="#C8102E" stroke="#fff" strokeWidth="0.3"/><circle cx="13" cy="5" r="1" fill="#C8102E" stroke="#fff" strokeWidth="0.3"/><circle cx="14.5" cy="8" r="1" fill="#C8102E" stroke="#fff" strokeWidth="0.3"/><circle cx="13" cy="11" r="1" fill="#C8102E" stroke="#fff" strokeWidth="0.3"/><circle cx="11" cy="8.5" r="0.8" fill="#C8102E" stroke="#fff" strokeWidth="0.3"/></>
}

const FLAG_COMPONENT: Record<string, () => JSX.Element> = {
  EUR: FlagEUR, USD: FlagUSD, GBP: FlagGBP, JPY: FlagJPY,
  CHF: FlagCHF, AUD: FlagAUD, CAD: FlagCAD, NZD: FlagNZD,
}

const FX_PAIRS: Record<string, [string, string]> = {
  'EURUSD=X':['EUR','USD'], 'GBPUSD=X':['GBP','USD'], 'USDJPY=X':['USD','JPY'],
  'USDCHF=X':['USD','CHF'], 'AUDUSD=X':['AUD','USD'], 'USDCAD=X':['USD','CAD'],
  'NZDUSD=X':['NZD','USD'], 'EURGBP=X':['EUR','GBP'], 'EURJPY=X':['EUR','JPY'],
  'GBPJPY=X':['GBP','JPY'], 'AUDJPY=X':['AUD','JPY'], 'CADJPY=X':['CAD','JPY'],
  'CHFJPY=X':['CHF','JPY'], 'NZDJPY=X':['NZD','JPY'],
}

function FXPairLogo({ sym }: { sym: string }) {
  const pair = FX_PAIRS[sym]
  if (!pair) return <LetterAv sym={sym.replace('=X','')} />
  const [base, quote] = pair
  const Flag1 = FLAG_COMPONENT[base]
  const Flag2 = FLAG_COMPONENT[quote]
  return (
    <div style={{ display: 'flex', flexShrink: 0, position: 'relative', width: 24, height: sz }}>
      {/* Base flag (left, circular) */}
      <svg width={14} height={14} viewBox="0 0 18 18" style={{ position: 'absolute', left: 0, top: 2, borderRadius: '50%', overflow: 'hidden', boxShadow: '1px 0 2px rgba(0,0,0,0.5)' }}>
        {Flag1 ? <Flag1 /> : <><rect width="18" height="18" fill="#484f58"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">{base[0]}</text></>}
      </svg>
      {/* Quote flag (right, circular, on top) */}
      <svg width={14} height={14} viewBox="0 0 18 18" style={{ position: 'absolute', left: 10, top: 2, borderRadius: '50%', overflow: 'hidden', border: '1px solid #0e1117' }}>
        {Flag2 ? <Flag2 /> : <><rect width="18" height="18" fill="#484f58"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">{quote[0]}</text></>}
      </svg>
    </div>
  )
}

// ═══ Crypto logos ═══
const cryptoLogos: Record<string, () => JSX.Element> = {
  'BTC-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#F7931A"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial">₿</text></svg>
  ),
  'ETH-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#627EEA"/><path d="M9 3L5 9.5L9 11.5L13 9.5z" fill="#fff" opacity="0.6"/><path d="M9 11.5L5 9.5L9 15L13 9.5z" fill="#fff"/></svg>
  ),
  'SOL-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#9945FF"/></linearGradient></defs><circle cx="9" cy="9" r="9" fill="url(#sg)"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">S</text></svg>
  ),
  'XRP-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#23292F"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">XRP</text></svg>
  ),
  'ADA-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#0033AD"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">ADA</text></svg>
  ),
  'DOGE-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#C2A633"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial">D</text></svg>
  ),
  'AVAX-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#E84142"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">A</text></svg>
  ),
  'LINK-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#2A5ADA"/><path d="M9 4L5 7v4l4 3 4-3V7z" fill="#fff"/></svg>
  ),
  'BNB-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#F3BA2F"/><path d="M9 5L12 8L9 11L6 8z M5 9L6 10L5 11L4 10z M13 9L14 10L13 11L12 10z M9 13L11 11L9 9L7 11z" fill="#fff"/></svg>
  ),
  'MATIC-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#8247E5"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">M</text></svg>
  ),
  'DOT-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#E6007A"/><circle cx="9" cy="4.5" r="1.5" fill="#fff"/><circle cx="13" cy="7" r="1.5" fill="#fff"/><circle cx="13" cy="11" r="1.5" fill="#fff"/><circle cx="9" cy="13.5" r="1.5" fill="#fff"/><circle cx="5" cy="11" r="1.5" fill="#fff"/><circle cx="5" cy="7" r="1.5" fill="#fff"/></svg>
  ),
  'LTC-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#345D9D"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">Ł</text></svg>
  ),
  'TRX-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#FF060A"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">T</text></svg>
  ),
  'ARB-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#28A0F0"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">A</text></svg>
  ),
  'OP-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#FF0420"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">O</text></svg>
  ),
  'ATOM-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#2E3148"/><circle cx="9" cy="9" r="2" fill="#fff"/><ellipse cx="9" cy="9" rx="6" ry="2" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.7"/><ellipse cx="9" cy="9" rx="6" ry="2" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.7" transform="rotate(60 9 9)"/><ellipse cx="9" cy="9" rx="6" ry="2" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.7" transform="rotate(120 9 9)"/></svg>
  ),
  'UNI-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#FF007A"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">UNI</text></svg>
  ),
  'ETC-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#328332"/><path d="M9 3L4 9l5 6 5-6z" fill="none" stroke="#fff" strokeWidth="1"/><path d="M5 9h8" stroke="#fff" strokeWidth="0.8"/></svg>
  ),
  'FIL-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#0090FF"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">⨎</text></svg>
  ),
  'APT-USD': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#0e1117"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">A</text></svg>
  ),
}

// ═══ Equity logos (unchanged) ═══
const logos: Record<string, () => JSX.Element> = {
  AAPL: () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><path d="M12.5 4.5c-.7-.8-1.5-1-2-1-.6 0-1.2.3-1.8.3-.6 0-1.2-.3-2-.3-1 0-2.1.6-2.8 1.6-1 1.4-.8 4.1.8 6.4.5.8 1.2 1.6 2.1 1.6.8 0 1-.5 2-.5s1.2.5 2 .5c.9 0 1.5-.7 2-1.5.4-.6.5-1.1.5-1.2-1.2-.5-1.4-2.2-.2-3.2-.5-.8-1.3-1.2-2-1.2.5-.5.9-1.2 1.4-1.5z" fill="#fff"/></svg>
  ),
  MSFT: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="8.5" height="8.5" fill="#f25022"/><rect x="9.5" width="8.5" height="8.5" fill="#7fba00"/><rect y="9.5" width="8.5" height="8.5" fill="#00a4ef"/><rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#ffb900"/></svg>),
  NVDA: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#76b900"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">N</text></svg>),
  GOOGL: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#fff" rx="2"/><text x="2" y="14" fill="#4285f4" fontSize="14" fontWeight="700" fontFamily="Arial">G</text></svg>),
  META: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#0668E1"/><path d="M5 6c1.5 0 2 2 3 4s1.5 2 3 2 2-1 2-3-1-5-3-5-2 2-3 4-1.5 2-3 2-2-1-2-3 1-5 3-5z" fill="none" stroke="#fff" strokeWidth="1.5"/></svg>),
  AMZN: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#232f3e"/><path d="M4 11c2.5 1.5 5.5 2 8 1" stroke="#ff9900" strokeWidth="1.5" fill="none"/><path d="M11 10l1.5 2.5" stroke="#ff9900" strokeWidth="1.5" fill="none"/></svg>),
  TSLA: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#cc0000"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial">T</text></svg>),
  JPM: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#002d72"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600" fontFamily="Arial">JPM</text></svg>),
  GS: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#6f9fce"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial">GS</text></svg>),
  AMD: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><text x="9" y="12" textAnchor="middle" fill="#00b140" fontSize="7" fontWeight="700" fontFamily="Arial">AMD</text></svg>),
  NFLX: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#e50914"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial">N</text></svg>),
  BAC: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#012169"/><text x="9" y="12" textAnchor="middle" fill="#e31837" fontSize="7" fontWeight="700" fontFamily="Arial">BAC</text></svg>),
  V: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#1a1f71"/><text x="9" y="14" textAnchor="middle" fill="#f7b600" fontSize="13" fontWeight="700" fontFamily="Arial">V</text></svg>),
  MA: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><circle cx="7" cy="9" r="5" fill="#eb001b"/><circle cx="11" cy="9" r="5" fill="#f79e1b" opacity="0.8"/></svg>),
  SPY: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00539b"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">S&P</text></svg>),
  QQQ: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00adef"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">QQQ</text></svg>),
  IWM: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">iSh</text></svg>),
  TLT: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">TLT</text></svg>),
  GLD: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#C9A227"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">Au</text></svg>),
  SLV: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#9BA5AE"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">Ag</text></svg>),
  DIA: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#003478"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">DJI</text></svg>),
  HYG: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">HY</text></svg>),
  XLF: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#005EB8"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">XLF</text></svg>),
  XLE: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#2E6E3B"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">XLE</text></svg>),
  XLK: () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#8A4FFF"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">XLK</text></svg>),
  // More equities — big tech + finance + consumer + pharma + industrials + international
  AVGO:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#C00"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">B</text></svg>),
  TSM:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#CC0000"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">TSMC</text></svg>),
  INTC:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#0071C5"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">intel</text></svg>),
  ORCL:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#F80000"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">O</text></svg>),
  CRM:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00A1E0"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">sf</text></svg>),
  ADBE:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#FA0F00"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial">A</text></svg>),
  IBM:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#052FAD"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">IBM</text></svg>),
  CSCO:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#1BA0D7"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">cis</text></svg>),
  QCOM:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#3253DC"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">Q</text></svg>),
  PLTR:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#101820"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">P</text></svg>),
  COIN:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#0052FF"/><circle cx="9" cy="9" r="5" fill="none" stroke="#fff" strokeWidth="1.2"/></svg>),
  UBER:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">Uber</text></svg>),
  HOOD:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00C805"/><text x="9" y="13" textAnchor="middle" fill="#000" fontSize="11" fontWeight="700" fontFamily="Arial">H</text></svg>),
  SHOP:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#96BF48"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">shop</text></svg>),
  PYPL:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#003087"/><text x="9" y="13" textAnchor="middle" fill="#009CDE" fontSize="7" fontWeight="700" fontFamily="Arial">Pay</text></svg>),
  SQ:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><rect x="5" y="5" width="8" height="8" fill="#fff"/></svg>),
  MSTR:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#F7931A"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">₿</text></svg>),
  // Pharma / Healthcare
  LLY:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#D52B1E"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">L</text></svg>),
  JNJ:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#CC0033"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">JNJ</text></svg>),
  PFE:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#0093D0"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">P</text></svg>),
  MRK:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00857C"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">M</text></svg>),
  UNH:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#002677"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">UNH</text></svg>),
  ABBV:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#071D49"/><text x="9" y="12" textAnchor="middle" fill="#00A3E0" fontSize="6" fontWeight="700" fontFamily="Arial">AbbV</text></svg>),
  NVO:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#003865"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">NVO</text></svg>),
  // Energy / Industrials / Materials
  XOM:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#ED1C24"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">XOM</text></svg>),
  CVX:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#0054A0"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">CVX</text></svg>),
  SHEL:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#FBCE07"/><path d="M4 14 Q9 3 14 14 Z" fill="#DD1D21"/></svg>),
  BP:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#009900"/><text x="9" y="13" textAnchor="middle" fill="#FFE600" fontSize="9" fontWeight="700" fontFamily="Arial">bp</text></svg>),
  CAT:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#FFCD11"/><text x="9" y="13" textAnchor="middle" fill="#000" fontSize="6" fontWeight="700" fontFamily="Arial">CAT</text></svg>),
  DE:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#367C2B"/><text x="9" y="13" textAnchor="middle" fill="#FFDE00" fontSize="10" fontWeight="700" fontFamily="Arial">J</text></svg>),
  BA:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#0039A6"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">B</text></svg>),
  GE:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#005EB8"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial">GE</text></svg>),
  // Consumer / Retail / Food
  WMT:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#0071CE"/><text x="9" y="12" textAnchor="middle" fill="#FFC220" fontSize="6" fontWeight="700" fontFamily="Arial">WMT</text></svg>),
  COST:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#E31837"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">Cos</text></svg>),
  TGT:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#fff"/><circle cx="9" cy="9" r="6" fill="#CC0000"/><circle cx="9" cy="9" r="3.5" fill="#fff"/><circle cx="9" cy="9" r="1.5" fill="#CC0000"/></svg>),
  HD:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#F96302"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial">H</text></svg>),
  LOW:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#004990"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">L</text></svg>),
  KO:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#F40009"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">K</text></svg>),
  PEP:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#004B93"/><text x="9" y="13" textAnchor="middle" fill="#E32934" fontSize="10" fontWeight="700" fontFamily="Arial">P</text></svg>),
  MCD:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#DA291C"/><text x="9" y="14" textAnchor="middle" fill="#FFC72C" fontSize="14" fontWeight="700" fontFamily="Arial">M</text></svg>),
  SBUX:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#006241"/><circle cx="9" cy="9" r="4.5" fill="none" stroke="#fff" strokeWidth="1.5"/></svg>),
  NKE:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><path d="M3 12 Q8 7 14 6 Q11 10 6 13 Z" fill="#fff"/></svg>),
  PG:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00437C"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial">P&G</text></svg>),
  // Berkshire / Finance
  'BRK-B': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#004987"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">BRK</text></svg>),
  WFC:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#C40404"/><text x="9" y="12" textAnchor="middle" fill="#FFCD11" fontSize="6" fontWeight="700" fontFamily="Arial">WFC</text></svg>),
  MS:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00428E"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">MS</text></svg>),
  C:     () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#056DAE"/><text x="9" y="13" textAnchor="middle" fill="#EC1C2E" fontSize="10" fontWeight="700" fontFamily="Arial">C</text></svg>),
  SCHW:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00A0DF"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial">S</text></svg>),
  BX:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">BX</text></svg>),
  // Europe / International
  ASML:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#0059A3"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="700" fontFamily="Arial">ASML</text></svg>),
  TM:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#EB0A1E"/><ellipse cx="9" cy="9" rx="5" ry="3" fill="none" stroke="#fff" strokeWidth="1"/><ellipse cx="9" cy="9" rx="2.5" ry="4" fill="none" stroke="#fff" strokeWidth="1"/></svg>),
  // Airlines / Travel
  DIS:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="cursive">Disney</text></svg>),
  UAL:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#002244"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">UAL</text></svg>),
  DAL:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#003A70"/><text x="9" y="13" textAnchor="middle" fill="#E31837" fontSize="10" fontWeight="700" fontFamily="Arial">▲</text></svg>),
  F:     () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#003478"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="cursive">F</text></svg>),
  GM:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#fff"/><text x="9" y="13" textAnchor="middle" fill="#004996" fontSize="8" fontWeight="700" fontFamily="Arial">GM</text></svg>),
  // Semis / AI
  MU:    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#1B3EB4"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">μ</text></svg>),
  ARM:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#0091BD"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">arm</text></svg>),
  SMCI:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><text x="9" y="12" textAnchor="middle" fill="#00FF00" fontSize="5" fontWeight="700" fontFamily="Arial">SMCI</text></svg>),
  // Services
  SNOW:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#29B5E8"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">❆</text></svg>),
  DDOG:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#632CA6"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">D</text></svg>),
  NET:   () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#F38020"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">☁</text></svg>),
  CRWD:  () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#FF0000"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">C</text></svg>),
  // VIX
  '^VIX': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#000"/><text x="9" y="13" textAnchor="middle" fill="#f85149" fontSize="6" fontWeight="700" fontFamily="Arial">VIX</text></svg>),
  '^GSPC': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00539b"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">S&P</text></svg>),
  '^IXIC': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><rect width="18" height="18" fill="#00adef"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">NDX</text></svg>),
}

// ═══ Commodity futures logos — TradingView style (clean circles) ═══
const commodityLogos: Record<string, () => JSX.Element> = {
  'GC=F': () => (
    <svg width={sz} height={sz} viewBox="0 0 24 24">
      <rect width="24" height="24" fill="#D4A017"/>
      {/* Top bar */}
      <path d="M9 6.5h6l1.6 3.5H7.4z M7.4 10h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H7.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 7.4 10z" fill="#fff"/>
      {/* Bottom-left bar */}
      <path d="M3 12.5h6l1.6 3.5H1.4z M1.4 16h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H1.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 1.4 16z" fill="#fff"/>
      {/* Bottom-right bar */}
      <path d="M15 12.5h6l1.6 3.5H13.4z M13.4 16h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H13.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 13.4 16z" fill="#fff"/>
    </svg>
  ),
  'SI=F': () => (
    <svg width={sz} height={sz} viewBox="0 0 24 24">
      <rect width="24" height="24" fill="#A8AAB0"/>
      <path d="M9 6.5h6l1.6 3.5H7.4z M7.4 10h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H7.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 7.4 10z" fill="#fff"/>
      <path d="M3 12.5h6l1.6 3.5H1.4z M1.4 16h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H1.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 1.4 16z" fill="#fff"/>
      <path d="M15 12.5h6l1.6 3.5H13.4z M13.4 16h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H13.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 13.4 16z" fill="#fff"/>
    </svg>
  ),
  'CL=F': () => (
    <svg width={sz} height={sz} viewBox="0 0 24 24">
      <rect width="24" height="24" fill="#1a1a1a"/>
      {/* Oil droplet */}
      <path d="M12 4C9 8 6 11 6 14.5C6 18 8.7 20.5 12 20.5C15.3 20.5 18 18 18 14.5C18 11 15 8 12 4z" fill="#fff" opacity="0.95"/>
    </svg>
  ),
  'NG=F': () => (
    <svg width={sz} height={sz} viewBox="0 0 24 24">
      <rect width="24" height="24" fill="#0d3b66"/>
      {/* Flame */}
      <path d="M12 4c1 3 4 5 4 9c0 3.5-2 6-4 6s-4-2.5-4-6c0-1.5 0.5-2.5 1.5-3.5C9 11.5 9.5 13 10.5 13C9.5 10 11 7 12 4z" fill="#4db8ff"/>
    </svg>
  ),
  // Index futures (E-mini S&P, Nasdaq, Dow, Russell)
  'ES=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#00539b"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">ES</text></svg>),
  'NQ=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#00adef"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">NQ</text></svg>),
  'YM=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#003478"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">YM</text></svg>),
  'RTY=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#000"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">RTY</text></svg>),
  // More commodities
  'HG=F': () => (
    <svg width={sz} height={sz} viewBox="0 0 24 24">
      <rect width="24" height="24" fill="#B87333"/>
      <path d="M9 6.5h6l1.6 3.5H7.4z M7.4 10h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H7.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 7.4 10z" fill="#fff"/>
      <path d="M3 12.5h6l1.6 3.5H1.4z M1.4 16h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H1.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 1.4 16z" fill="#fff"/>
      <path d="M15 12.5h6l1.6 3.5H13.4z M13.4 16h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H13.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 13.4 16z" fill="#fff"/>
    </svg>
  ),
  'PL=F': () => (
    <svg width={sz} height={sz} viewBox="0 0 24 24">
      <rect width="24" height="24" fill="#E5E4E2"/>
      <path d="M9 6.5h6l1.6 3.5H7.4z M7.4 10h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H7.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 7.4 10z" fill="#666"/>
      <path d="M3 12.5h6l1.6 3.5H1.4z M1.4 16h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H1.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 1.4 16z" fill="#666"/>
      <path d="M15 12.5h6l1.6 3.5H13.4z M13.4 16h9.2a1.2 1.2 0 0 1 1.2 1.2v0a1.2 1.2 0 0 1-1.2 1.2H13.4a1.2 1.2 0 0 1-1.2-1.2v0A1.2 1.2 0 0 1 13.4 16z" fill="#666"/>
    </svg>
  ),
  'HO=F': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="9" fill="#3B1F04"/>
      <text x="9" y="12" textAnchor="middle" fill="#c09860" fontSize="5.5" fontWeight="700" fontFamily="'SF Mono', Menlo, Consolas, monospace" letterSpacing="0.2">HO</text>
    </svg>
  ),
  'RB=F': () => (
    <svg width={sz} height={sz} viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="9" fill="#5c2e00"/>
      <text x="9" y="12" textAnchor="middle" fill="#ffb060" fontSize="5.5" fontWeight="700" fontFamily="'SF Mono', Menlo, Consolas, monospace" letterSpacing="0.2">RB</text>
    </svg>
  ),
  // Agriculturals
  'ZC=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#FDB515"/><text x="9" y="13" textAnchor="middle" fill="#3A5F0B" fontSize="11" fontWeight="700" fontFamily="Arial">🌽</text></svg>),
  'ZW=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#D4A054"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">🌾</text></svg>),
  'ZS=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#4F7942"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">🫘</text></svg>),
  'KC=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#3E2B1F"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">☕</text></svg>),
  'SB=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#fff"/><text x="9" y="13" textAnchor="middle" fill="#000" fontSize="7" fontWeight="700" fontFamily="Arial">Sug</text></svg>),
  // Interest rate futures
  'ZN=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#065F46"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700" fontFamily="Arial">10Y</text></svg>),
  'GE=F': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#0C4A6E"/><text x="9" y="13" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700" fontFamily="Arial">EUR$</text></svg>),
  // ═══ Global indices — institutional brand colors ═══
  '^GSPC':     () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#00539b"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Arial">S&P</text></svg>),
  '^IXIC':     () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#00adef"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">NDX</text></svg>),
  '^DJI':      () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#003478"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700" fontFamily="Arial">DJIA</text></svg>),
  '^RUT':      () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#1F2937"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700" fontFamily="Arial">RUT</text></svg>),
  '^VIX':      () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#0e1117"/><text x="9" y="12" textAnchor="middle" fill="#f85149" fontSize="6" fontWeight="700" fontFamily="Arial">VIX</text></svg>),
  '^GDAXI':    () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#000"/><text x="9" y="12" textAnchor="middle" fill="#DD0000" fontSize="6" fontWeight="700" fontFamily="Arial">DAX</text></svg>),
  '^FTSE':     () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#012169"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700" fontFamily="Arial">FTSE</text></svg>),
  '^FCHI':     () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#002395"/><text x="9" y="12" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700" fontFamily="Arial">CAC</text></svg>),
  '^STOXX50E': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#003399"/><text x="9" y="12" textAnchor="middle" fill="#FFCC00" fontSize="5.5" fontWeight="700" fontFamily="Arial">SX5E</text></svg>),
  '^N225':     () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#fff"/><circle cx="9" cy="9" r="3.5" fill="#BC002D"/><text x="9" y="16" textAnchor="middle" fill="#000" fontSize="5" fontWeight="700" fontFamily="Arial">N225</text></svg>),
  '^HSI':      () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#DE2910"/><text x="9" y="12" textAnchor="middle" fill="#FFDE00" fontSize="6" fontWeight="700" fontFamily="Arial">HSI</text></svg>),
  '000001.SS': () => (<svg width={sz} height={sz} viewBox="0 0 18 18"><circle cx="9" cy="9" r="9" fill="#FFDE00"/><text x="9" y="12" textAnchor="middle" fill="#DE2910" fontSize="6" fontWeight="700" fontFamily="Arial">SSE</text></svg>),
}

// ═══ Equity logo with real-brand CDN fallback chain ═══
// ═══ Equity logo with real-brand CDN fallback chain ═══
// Cascade: try multiple public CDNs in order. If all fail → custom SVG → letter avatar.
// Many CDNs require referrer headers that browsers send automatically but server-side
// curl tests fail — what matters is that at least ONE works in the real browser.
function EquityLogo({ sym }: { sym: string }) {
  const [cdnIdx, setCdnIdx] = useState(0)
  const [allFailed, setAllFailed] = useState(false)
  const [cdnLoaded, setCdnLoaded] = useState(false)

  const clean = sym.replace(/^\^/, '').replace('=X', '').replace('=F', '').toUpperCase()

  // Tickers needing yahoo-style normalization for some CDNs
  // BRK-B → some CDNs use BRK.B
  const dotForm = clean.replace('-', '.')

  // CDN cascade — order matters. Parqet returns real brand PNGs by ticker symbol
  // and was the original source that worked well. Clearbit serves real brand art
  // via corporate domain. FMP and EODHD are last-resort fallbacks (they return
  // generic monogram circles when no real logo exists, which we'd rather avoid
  // unless nothing else works).
  const cdnList = [
    `https://assets.parqet.com/logos/symbol/${clean}`,                  // 1st: real brand PNGs by ticker
    `https://logo.clearbit.com/${tickerToDomain(clean)}`,                // 2nd: real brand art via corp domain
    `https://financialmodelingprep.com/image-stock/${clean}.png`,        // 3rd: fallback (sometimes generic)
    `https://eodhd.com/img/logos/US/${dotForm}.png`,                     // 4th: last resort
  ]

  if (allFailed) {
    // All CDNs failed — try custom SVG dict, then letter avatar
    const L = logos[sym]
    if (L) {
      return (
        <span style={{
          display: 'inline-flex', width: sz, height: sz, flexShrink: 0,
          borderRadius: '50%', overflow: 'hidden',
        }}>
          <L />
        </span>
      )
    }
    return <LetterAv sym={sym} />
  }

  return (
    <span style={{
      display: 'inline-flex', width: sz, height: sz, position: 'relative',
      // White only when image loaded (ensures contrast for dark brand logos);
      // matches dark UI background while loading so user doesn't see a flash.
      background: cdnLoaded ? '#fff' : '#161b22',
      borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      // Subtle border keeps the white circle from looking like a hot spot in dense rows
      border: cdnLoaded ? '1px solid #21262d' : 'none',
    }}>
      <img
        key={cdnIdx /* force reload when we move to next CDN */}
        src={cdnList[cdnIdx]}
        alt={sym}
        onLoad={() => setCdnLoaded(true)}
        onError={() => {
          if (cdnIdx + 1 < cdnList.length) setCdnIdx(cdnIdx + 1)
          else setAllFailed(true)
        }}
        // objectFit: cover fills the circular container completely so the white background
        // never shows at the corners. Logos that have transparent backgrounds will look like
        // they sit cleanly inside the circle.
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </span>
  )
}

// Map common tickers to their official corporate domains (used by Clearbit logo CDN).
// Falls through to <ticker>.com guess if not in the map.
const TICKER_TO_DOMAIN: Record<string, string> = {
  AAPL: 'apple.com', MSFT: 'microsoft.com', NVDA: 'nvidia.com', GOOGL: 'google.com', GOOG: 'google.com',
  META: 'meta.com', AMZN: 'amazon.com', TSLA: 'tesla.com', AMD: 'amd.com', NFLX: 'netflix.com',
  AVGO: 'broadcom.com', TSM: 'tsmc.com', INTC: 'intel.com', QCOM: 'qualcomm.com', ORCL: 'oracle.com',
  CRM: 'salesforce.com', ADBE: 'adobe.com', IBM: 'ibm.com', CSCO: 'cisco.com', PLTR: 'palantir.com',
  COIN: 'coinbase.com', UBER: 'uber.com', HOOD: 'robinhood.com', SHOP: 'shopify.com', PYPL: 'paypal.com',
  SQ: 'block.xyz', MSTR: 'microstrategy.com', ABNB: 'airbnb.com', RBLX: 'roblox.com',
  V: 'visa.com', MA: 'mastercard.com', JPM: 'jpmorganchase.com', BAC: 'bankofamerica.com',
  GS: 'goldmansachs.com', WFC: 'wellsfargo.com', MS: 'morganstanley.com', C: 'citigroup.com',
  SCHW: 'schwab.com', BX: 'blackstone.com', BLK: 'blackrock.com', SPGI: 'spglobal.com',
  LLY: 'lilly.com', JNJ: 'jnj.com', UNH: 'unitedhealthgroup.com', PFE: 'pfizer.com',
  MRK: 'merck.com', ABBV: 'abbvie.com', NVO: 'novonordisk.com', ABT: 'abbott.com',
  TMO: 'thermofisher.com', DHR: 'danaher.com', ISRG: 'intuitive.com', MDT: 'medtronic.com',
  GILD: 'gilead.com', AMGN: 'amgen.com', REGN: 'regeneron.com', BMY: 'bms.com',
  CVS: 'cvshealth.com', ELV: 'elevancehealth.com', CI: 'cigna.com', SYK: 'stryker.com',
  ZTS: 'zoetis.com',
  XOM: 'exxonmobil.com', CVX: 'chevron.com', SHEL: 'shell.com', BP: 'bp.com',
  CAT: 'caterpillar.com', DE: 'deere.com', BA: 'boeing.com', GE: 'ge.com',
  RTX: 'rtx.com', LMT: 'lockheedmartin.com', UPS: 'ups.com', HON: 'honeywell.com',
  WMT: 'walmart.com', COST: 'costco.com', TGT: 'target.com', HD: 'homedepot.com', LOW: 'lowes.com',
  KO: 'coca-cola.com', PEP: 'pepsico.com', MCD: 'mcdonalds.com', SBUX: 'starbucks.com',
  NKE: 'nike.com', PG: 'pg.com', DIS: 'disney.com',
  F: 'ford.com', GM: 'gm.com', TM: 'toyota.com', UAL: 'united.com', DAL: 'delta.com',
  ASML: 'asml.com', ARM: 'arm.com', SMCI: 'supermicro.com', SNOW: 'snowflake.com',
  DDOG: 'datadoghq.com', NET: 'cloudflare.com', CRWD: 'crowdstrike.com',
  ACN: 'accenture.com', TXN: 'ti.com', VZ: 'verizon.com', CMCSA: 'comcast.com',
  PM: 'pmi.com', MO: 'altria.com', ADP: 'adp.com', MMC: 'mmc.com',
  CB: 'chubb.com', PGR: 'progressive.com', BKNG: 'booking.com', NOW: 'servicenow.com',
  TJX: 'tjx.com', MDLZ: 'mondelezinternational.com',
  LIN: 'linde.com', PLD: 'prologis.com', SO: 'southerncompany.com',
  ADI: 'analog.com', KLAC: 'kla.com', CDNS: 'cadence.com', SNPS: 'synopsys.com',
  PANW: 'paloaltonetworks.com', MARA: 'mara.com', RIOT: 'riotplatforms.com',
  RIVN: 'rivian.com', NIO: 'nio.com', LI: 'lixiang.com', XPEV: 'heyxpeng.com',
  BABA: 'alibabagroup.com', JD: 'jd.com', PDD: 'pddholdings.com', NTES: 'netease.com',
  SAP: 'sap.com', SE: 'sea.com', MELI: 'mercadolibre.com',
  MU: 'micron.com',
  'BRK-B': 'berkshirehathaway.com',
  // ETFs — issuer logos
  SPY: 'spdrs.com', QQQ: 'invesco.com', IWM: 'ishares.com', DIA: 'spdrs.com',
  VTI: 'vanguard.com', VOO: 'vanguard.com', IVV: 'ishares.com', SCHD: 'schwab.com',
  VGT: 'vanguard.com', ARKK: 'ark-funds.com',
  XLK: 'spdrs.com', XLF: 'spdrs.com', XLE: 'spdrs.com', XLV: 'spdrs.com',
  XLY: 'spdrs.com', XLP: 'spdrs.com', XLI: 'spdrs.com', XLU: 'spdrs.com',
  TLT: 'ishares.com', HYG: 'ishares.com', GLD: 'spdrs.com', SLV: 'ishares.com',
}
function tickerToDomain(t: string): string {
  return TICKER_TO_DOMAIN[t] ?? `${t.toLowerCase()}.com`
}

// Helper to wrap any SVG in a circular clip
function CircularWrap({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', width: sz, height: sz, flexShrink: 0,
      borderRadius: '50%', overflow: 'hidden',
    }}>
      {children}
    </span>
  )
}

export function Logo({sym}:{sym:string}) {
  // Forex pair — dual flag (already circular from its internal styles)
  if (sym.endsWith('=X')) return <FXPairLogo sym={sym} />
  // Crypto — already circular from SVG circle fill, but wrap for consistency
  const CryptoLogo = cryptoLogos[sym]
  if (CryptoLogo) return <CircularWrap><CryptoLogo /></CircularWrap>
  // Commodity / index futures — already circular from SVG
  const CommodityLogo = commodityLogos[sym]
  if (CommodityLogo) return <CircularWrap><CommodityLogo /></CircularWrap>
  // Equity / ETF / index — try CDN real-brand logo, fall back to custom SVG, then letter
  return <EquityLogo sym={sym} />
}
