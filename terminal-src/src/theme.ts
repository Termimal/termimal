// theme.ts — Termimal design tokens (v2 institutional dark)
// All colors, typography, and spacing flow through this file.

export const c = {
  bg: {
    base:     '#0B0E14',
    panel:    '#131722',
    elevated: '#1C2030',
    hover:    'rgba(255,255,255,0.04)',
    active:   'rgba(255,255,255,0.07)',
    zebra:    'rgba(255,255,255,0.018)',
  },
  border: {
    subtle:  '#1A1F2C',
    default: '#252A3A',
    strong:  '#363A45',
    scale:   '#2B2B43',
  },
  text: {
    primary:   '#D1D4DC',
    secondary: '#B2B5BE',
    muted:     '#787B86',
    disabled:  '#4F5966',
    inverse:   '#0B0E14',
  },
  accent: {
    blue:      '#388bfd',
    blueHover: '#1f6feb',
    blueSoft:  'rgba(41,98,255,0.12)',
    link:      '#5AA9E6',
  },
  up: {
    solid: '#26A69A',
    tint:  'rgba(38,166,154,0.12)',
    flash: 'rgba(38,166,154,0.28)',
  },
  down: {
    solid: '#EF5350',
    tint:  'rgba(239,83,80,0.12)',
    flash: 'rgba(239,83,80,0.28)',
  },
  status: {
    warn:     '#F0AD4E',
    warnSoft: 'rgba(240,173,78,0.12)',
    danger:   '#EF5350',
    success:  '#26A69A',
    info:     '#4FA8D8',
    neutral:  '#787B86',
  },
  chart: {
    wick:       '#737375',
    crosshair:  '#758696',
    crossLabel: '#4C525E',
    gridH:      'rgba(42,46,57,0.6)',
    gridV:      'rgba(42,46,57,0)',
    watermark:  'rgba(255,255,255,0.035)',
  },
} as const

export const t = {
  sans: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  mono: `'JetBrains Mono', 'IBM Plex Mono', Menlo, Consolas, monospace`,
  size: {
    xs: 10, sm: 11, base: 12, md: 13, lg: 14,
    xl: 16, h3: 18, h2: 22, h1: 28, display: 36,
  },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  tabular: {
    fontVariantNumeric: 'tabular-nums' as const,
    fontFeatureSettings: '"tnum"' as const,
  },
} as const

export const s = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32] as const

// Common primitives
export const panel = {
  background: c.bg.panel,
  border: `1px solid ${c.border.default}`,
  borderRadius: 4,
} as const

export const tableHeader = {
  height: 28,
  padding: '0 8px',
  background: c.bg.panel,
  borderBottom: `1px solid ${c.border.default}`,
  fontSize: t.size.sm,
  fontWeight: t.weight.medium,
  color: c.text.muted,
  letterSpacing: 0.6,
  textTransform: 'uppercase' as const,
  position: 'sticky' as const,
  top: 0,
} as const

export const buttonPrimary = {
  height: 32,
  padding: '0 14px',
  background: c.accent.blue,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: t.size.base,
  fontWeight: t.weight.medium,
  cursor: 'pointer',
  transition: 'background 120ms ease-out',
} as const

export const buttonSecondary = {
  height: 32,
  padding: '0 14px',
  background: 'transparent',
  color: c.text.primary,
  border: `1px solid ${c.border.default}`,
  borderRadius: 4,
  fontSize: t.size.base,
  fontWeight: t.weight.medium,
  cursor: 'pointer',
  transition: 'background 120ms ease-out',
} as const

export const buttonGhost = {
  height: 28,
  padding: '0 10px',
  background: 'transparent',
  color: c.text.secondary,
  border: 'none',
  fontSize: t.size.base,
  cursor: 'pointer',
  transition: 'background 120ms ease-out, color 120ms ease-out',
} as const

export const input = {
  height: 30,
  padding: '0 10px',
  background: c.bg.base,
  border: `1px solid ${c.border.default}`,
  borderRadius: 4,
  color: c.text.primary,
  fontSize: t.size.base,
  outline: 'none',
  fontFamily: t.sans,
} as const

// Price-flash helper keyframes (inject once via index.css)
export const motion = {
  base: '120ms ease-out',
  press: '80ms ease-out',
  modalIn: '160ms ease-out',
  modalOut: '100ms ease-out',
} as const
