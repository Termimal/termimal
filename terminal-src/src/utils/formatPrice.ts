// utils/formatPrice.ts — Instrument-aware price precision
// Forex: 5 decimals (3 for JPY pairs)
// Crypto: 5 decimals (2 for BTC > 1000)
// Stocks/ETFs/Indices: 2 decimals
// Commodities: 2 decimals

const JPY_PAIRS = ['USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY']

function detectAssetClass(symbol: string): 'forex' | 'forex-jpy' | 'crypto' | 'stock' {
  const s = symbol.toUpperCase().replace('=X', '').replace('=F', '').replace('-USD', '')
  
  // Forex detection
  if (symbol.includes('=X') || /^[A-Z]{6}$/.test(s)) {
    if (JPY_PAIRS.some(p => s.includes(p.replace('=X', '')))) return 'forex-jpy'
    return 'forex'
  }
  
  // Crypto detection
  if (symbol.includes('-USD') || ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC', 'LINK'].includes(s)) {
    return 'crypto'
  }
  
  return 'stock'
}

export function getPrecision(symbol: string): number {
  const cls = detectAssetClass(symbol)
  switch (cls) {
    case 'forex': return 5
    case 'forex-jpy': return 3
    case 'crypto': return 2  // BTC/ETH display 2 decimals at high prices, 5 at low
    case 'stock': return 2
  }
}

export function formatPrice(symbol: string, value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  const cls = detectAssetClass(symbol)
  switch (cls) {
    case 'forex': return value.toFixed(5)
    case 'forex-jpy': return value.toFixed(3)
    case 'crypto':
      if (value > 1000) return value.toFixed(2)
      if (value > 1) return value.toFixed(4)
      return value.toFixed(5)
    case 'stock':
      if (value > 999) return value.toFixed(0)
      return value.toFixed(2)
  }
}

export function isForex(symbol: string): boolean {
  return detectAssetClass(symbol) === 'forex' || detectAssetClass(symbol) === 'forex-jpy'
}

export function isCrypto(symbol: string): boolean {
  return detectAssetClass(symbol) === 'crypto'
}
