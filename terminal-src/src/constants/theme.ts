// constants/theme.ts — Financial Terminal Design System tokens
// Import this in any page: import { T } from '@/constants/theme'

export const T = {
  // Backgrounds
  bg:       '#0e1117',
  bg2:      '#161b22',
  bg3:      '#1c2128',
  bgHover:  '#1c2128',
  bgActive: '#22272e',

  // Borders
  border:   '#21262d',
  border2:  '#30363d',

  // Text
  text:     '#c9d1d9',
  text2:    '#8b949e',
  text3:    '#484f58',

  // Semantic
  up:       '#3fb950',
  dn:       '#f85149',
  accent:   '#34d399',
  warn:     '#d29922',

  upBg:     'rgba(63,185,80,0.08)',
  dnBg:     'rgba(248,81,73,0.08)',
  accentBg: 'rgba(56,139,253,0.08)',

  // Fonts
  mono:     "'SF Mono', 'Fira Code', Menlo, Consolas, monospace",
  sans:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
} as const

// Common inline style patterns
export const S = {
  // Page container
  page: { padding: '16px 20px' } as const,

  // Section header
  sectionHead: { fontSize: 13, fontWeight: 500 as const, color: T.text2, paddingBottom: 6, marginBottom: 8, borderBottom: `1px solid ${T.border}` } as const,

  // Mono number
  num: { fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' as const } as const,

  // Subtle row hover
  rowHover: (e: React.MouseEvent, on: boolean) => {
    (e.currentTarget as HTMLElement).style.background = on ? T.bg3 : 'transparent'
  },
} as const
