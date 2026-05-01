// pages/polymarket/_ui/tokens.ts
// Termimal Polymarket design tokens — use verbatim from spec §2

export const PM = {
  bg: {
    app: '#0a0a0a',
    panel: '#0d1117',
    elevated: '#161b22',
  },
  border: {
    subtle: '#21262d',
    prominent: '#30363d',
  },
  text: {
    primary: '#f0f6fc',
    secondary: '#c9d1d9',
    muted: '#8b949e',
    tertiary: '#6e7681',
    disabled: '#484f58',
  },
  up: '#2ea043',
  upFill: 'rgba(46,160,67,0.12)',
  down: '#da3633',
  downFill: 'rgba(218,54,51,0.12)',
  accent: '#388bfd',
  accentText: '#58a6ff',
  warning: '#d29922',
  grid: 'rgba(139,148,158,0.08)',
  row: {
    zebra: 'rgba(255,255,255,0.015)',
    hover: 'rgba(56,139,253,0.06)',
    selected: 'rgba(56,139,253,0.12)',
  },
  font: {
    ui: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    mono: '"SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
  },
  /**
   * Typography scale — readable institutional terminal type.
   * The previous design leaned heavily on 9–11 px text for "density",
   * which read as illegible on normal monitors and unusable on phones.
   * Every text element should reference one of these — no hardcoded
   * font sizes anywhere in the Polymarket components.
   */
  size: {
    label:   11,  // column headers, badges, timestamps
    meta:    12,  // secondary info, muted context
    body:    13,  // trade-feed rows, order-book rows, helper text
    data:    15,  // market titles, primary data labels
    price:   17,  // order-book prices, inline prices
    hero:    20,  // YES/NO percentages on cards
    display: 28,  // YES/NO tiles in the mobile market detail
  } as const,
  /** Touch-target / hit-area sizes. */
  hit: {
    rowDesktop: 48,
    rowMobile:  88,   // mobile market cards: thumb-friendly
    bookRowDesktop: 36,
    bookRowMobile:  44,
    tab: 56,
    btn: 44,
  } as const,
  motion: '120ms ease-out',
}

/**
 * Category badge colors — consistent across MarketRow (desktop) and
 * MarketCard (mobile). Uppercase keys; falls back to "OTHER" colour
 * for anything not listed.
 */
export const CATEGORY_COLOR: Record<string, string> = {
  POLITICS:      '#3b82f6',
  CRYPTO:        '#f97316',
  SPORTS:        '#22c55e',
  FINANCE:       '#eab308',
  SCIENCE:       '#a855f7',
  ENTERTAINMENT: '#ec4899',
  OTHER:         '#6b7280',
}
export function categoryColor(tag: string | null | undefined): string {
  if (!tag) return CATEGORY_COLOR.OTHER
  return CATEGORY_COLOR[tag.toUpperCase()] ?? CATEGORY_COLOR.OTHER
}

// Formatting helpers — all numbers in mono, all dollar-values abbreviated
export const fmtUsd = (n: number): string => {
  if (!isFinite(n) || n === 0) return '$0'
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(0)}k`
  return `${sign}$${a.toFixed(0)}`
}

export const fmtUsdSigned = (n: number): string => {
  if (!isFinite(n)) return '—'
  if (n === 0) return '$0'
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}k`
  return `${sign}$${a.toFixed(2)}`
}

export const fmtPct = (n: number, dp = 0): string => {
  if (!isFinite(n)) return '—'
  return `${(n * 100).toFixed(dp)}%`
}

export const fmtProb = (n: number): string => {
  if (!isFinite(n)) return '—'
  return n.toFixed(3)
}

// Expires formatter — "42d 04h" > 24h, "14h 23m" < 24h, "38m" < 1h
export const fmtExpires = (endDate: string): { text: string; color: string } => {
  try {
    const end = new Date(endDate).getTime()
    const now = Date.now()
    const ms = end - now
    if (ms <= 0) return { text: 'ENDED', color: PM.text.disabled }
    const s = Math.floor(ms / 1000)
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (s < 3600) return { text: `${m}m`, color: PM.down }
    if (s < 86400) return { text: `${h}h ${String(m).padStart(2, '0')}m`, color: PM.warning }
    return { text: `${d}d ${String(h).padStart(2, '0')}h`, color: PM.text.secondary }
  } catch {
    return { text: '—', color: PM.text.muted }
  }
}

export const fmtTime = (ts: number | string): string => {
  try {
    return new Date(ts).toLocaleTimeString('en-GB', { hour12: false })
  } catch { return '' }
}

export const fmtTimeAgo = (ts: number): string => {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
