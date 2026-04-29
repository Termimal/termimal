// pages/polymarket/_ui/useUnderlying.ts
// Detects common financial underlyings referenced in a Polymarket question
// and fetches their current price from the backend /api/price endpoint.
import { useEffect, useState } from 'react'

// Ordered list of matchers — first match wins.
// Regex uses word-boundary / lookbehind patterns so we don't match "BTC" inside "BTCHEAD".
const MATCHERS: { pattern: RegExp; symbol: string; display: string }[] = [
  { pattern: /\b(bitcoin|btc)\b/i,              symbol: 'BTC-USD',  display: 'BTC' },
  { pattern: /\b(ethereum|\beth)\b/i,           symbol: 'ETH-USD',  display: 'ETH' },
  { pattern: /\b(solana|sol)\b/i,               symbol: 'SOL-USD',  display: 'SOL' },
  { pattern: /\b(dogecoin|doge)\b/i,            symbol: 'DOGE-USD', display: 'DOGE' },
  { pattern: /\b(xrp|ripple)\b/i,               symbol: 'XRP-USD',  display: 'XRP' },
  { pattern: /\b(gold|xau)\b/i,                 symbol: 'GC=F',     display: 'GOLD' },
  { pattern: /\b(silver|xag)\b/i,               symbol: 'SI=F',     display: 'SILVER' },
  { pattern: /\b(crude oil|wti|oil price)\b/i,  symbol: 'CL=F',     display: 'WTI' },
  { pattern: /\b(s&p ?500|spx|sp500|s and p)\b/i, symbol: '^GSPC',  display: 'SPX' },
  { pattern: /\b(nasdaq|nas100|ndx)\b/i,        symbol: '^IXIC',    display: 'NASDAQ' },
  { pattern: /\b(dow ?jones|dow\b)\b/i,         symbol: '^DJI',     display: 'DJI' },
  { pattern: /\b(tesla|tsla)\b/i,               symbol: 'TSLA',     display: 'TSLA' },
  { pattern: /\b(apple|aapl)\b/i,               symbol: 'AAPL',     display: 'AAPL' },
  { pattern: /\b(nvidia|nvda)\b/i,              symbol: 'NVDA',     display: 'NVDA' },
  { pattern: /\b(microsoft|msft)\b/i,           symbol: 'MSFT',     display: 'MSFT' },
  { pattern: /\b(amazon|amzn)\b/i,              symbol: 'AMZN',     display: 'AMZN' },
  { pattern: /\b(meta|facebook)\b/i,            symbol: 'META',     display: 'META' },
  { pattern: /\beur\/?usd|euro dollar\b/i,      symbol: 'EURUSD=X', display: 'EURUSD' },
  { pattern: /\bgbp\/?usd\b/i,                  symbol: 'GBPUSD=X', display: 'GBPUSD' },
  { pattern: /\busd\/?jpy\b/i,                  symbol: 'USDJPY=X', display: 'USDJPY' },
]

export interface UnderlyingPrice {
  display: string
  symbol: string
  price: number
  pct: number
}

export function detectUnderlying(question: string | undefined): { symbol: string; display: string } | null {
  if (!question) return null
  for (const m of MATCHERS) if (m.pattern.test(question)) return { symbol: m.symbol, display: m.display }
  return null
}

export function useUnderlying(question: string | undefined): UnderlyingPrice | null {
  const [data, setData] = useState<UnderlyingPrice | null>(null)
  const detected = detectUnderlying(question)

  useEffect(() => {
    setData(null)
    if (!detected) return
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/price/${encodeURIComponent(detected!.symbol)}`)
        if (!r.ok) return
        const j = await r.json()
        const d = j?.data
        if (cancelled || !d || d.error || typeof d.price !== 'number') return
        setData({
          display: detected!.display,
          symbol: detected!.symbol,
          price: d.price,
          pct: typeof d.pct === 'number' ? d.pct : 0,
        })
      } catch { /* silent fail — underlying is optional context */ }
    }
    load()
    const id = setInterval(load, 60_000) // 1-min refresh (underlying doesn't move that fast)
    return () => { cancelled = true; clearInterval(id) }
  }, [detected?.symbol])

  return data
}
