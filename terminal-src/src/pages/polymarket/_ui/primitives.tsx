// pages/polymarket/_ui/primitives.tsx
// Shared Polymarket UI primitives — dense, monospace, keyboard-first

import { ReactNode, CSSProperties } from 'react'
import { PM } from './tokens'

// ─── Metric Cell ─────────────────────────────────────────────────────────────
export function MetricCell({
  label, value, delta, sublabel, valueColor, compact = false, flex = 1,
}: {
  label: string
  value: ReactNode
  delta?: ReactNode
  sublabel?: ReactNode
  valueColor?: string
  compact?: boolean
  flex?: number
}) {
  return (
    <div style={{
      flex, minWidth: 140, height: compact ? 52 : 58,
      background: PM.bg.panel,
      borderRight: `1px solid ${PM.border.subtle}`,
      padding: compact ? '6px 12px' : '8px 14px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 500, letterSpacing: '0.5px',
        textTransform: 'uppercase', color: PM.text.muted,
        fontFamily: PM.font.ui,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{
          fontSize: compact ? 16 : 18, fontWeight: 600,
          fontFamily: PM.font.mono, fontVariantNumeric: 'tabular-nums',
          color: valueColor ?? PM.text.primary, lineHeight: 1.1,
        }}>{value}</div>
        {delta !== undefined && (
          <div style={{
            fontSize: 10, fontFamily: PM.font.mono,
            fontVariantNumeric: 'tabular-nums', color: PM.text.muted,
          }}>{delta}</div>
        )}
      </div>
      {sublabel && (
        <div style={{
          fontSize: 9, color: PM.text.tertiary, fontFamily: PM.font.mono,
        }}>{sublabel}</div>
      )}
    </div>
  )
}

// ─── Probability Bar ─────────────────────────────────────────────────────────
export function ProbabilityBar({
  odds, width = 90, showPct = true, centerTick = true,
}: {
  odds: number // 0 to 1
  width?: number
  showPct?: boolean
  centerTick?: boolean
}) {
  const pct = Math.max(0, Math.min(1, odds))
  const pctInt = Math.round(pct * 100)
  const color = pct > 0.85 ? PM.up : pct < 0.15 ? PM.down : PM.accent
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        position: 'relative', width, height: 6,
        background: PM.border.subtle, borderRadius: 1,
      }}>
        <div style={{
          width: `${pct * 100}%`, height: 6,
          background: color, borderRadius: 1,
        }}/>
        {centerTick && (
          <div style={{
            position: 'absolute', left: '50%', top: 0,
            width: 1, height: 6, background: PM.border.prominent,
          }}/>
        )}
      </div>
      {showPct && (
        <span style={{
          fontFamily: PM.font.mono, fontSize: 11, fontWeight: 600, color,
          fontVariantNumeric: 'tabular-nums', minWidth: 30,
        }}>{pctInt}%</span>
      )}
    </div>
  )
}

// ─── Segmented Control ───────────────────────────────────────────────────────
export function SegmentedControl<T extends string | number>({
  options, value, onChange, size = 'md',
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  const height = size === 'sm' ? 22 : 26
  const fontSize = size === 'sm' ? 10 : 11
  return (
    <div style={{ display: 'inline-flex', height, border: `1px solid ${PM.border.prominent}`, borderRadius: 2 }}>
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button key={String(o.value)} onClick={() => onChange(o.value)}
            style={{
              padding: '0 10px', height: height - 2,
              fontSize, fontWeight: 500, fontFamily: PM.font.mono,
              letterSpacing: '0.3px',
              background: active ? PM.row.selected : 'transparent',
              color: active ? PM.accentText : PM.text.muted,
              border: 'none',
              borderLeft: i > 0 ? `1px solid ${PM.border.prominent}` : 'none',
              cursor: 'pointer',
              transition: `background ${PM.motion}, color ${PM.motion}`,
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = PM.bg.elevated }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >{o.label}</button>
        )
      })}
    </div>
  )
}

// ─── Filter Chip ─────────────────────────────────────────────────────────────
export function Chip({
  label, active, onClick, onRemove,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
}) {
  return (
    <button onClick={onClick}
      style={{
        height: 22, padding: onRemove && active ? '0 4px 0 8px' : '0 8px',
        fontFamily: PM.font.mono, fontSize: 11, fontWeight: 500,
        letterSpacing: '0.3px',
        border: `1px solid ${active ? PM.accent : PM.border.prominent}`,
        background: active ? PM.row.selected : 'transparent',
        color: active ? PM.accentText : PM.text.secondary,
        borderRadius: 2, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        transition: `all ${PM.motion}`,
        textTransform: 'uppercase',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = PM.text.primary }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = PM.text.secondary }}
    >
      {label}
      {onRemove && active && (
        <span onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ fontSize: 11, lineHeight: 1, color: PM.accentText, padding: '0 2px' }}>×</span>
      )}
    </button>
  )
}

// ─── Tag Badge ───────────────────────────────────────────────────────────────
const TAG_STYLES: Record<string, { bg: string; text: string; border?: string }> = {
  MACRO:       { bg: 'rgba(210,153,34,0.12)',  text: '#d29922' },
  CRYPTO:      { bg: 'rgba(88,166,255,0.12)',  text: '#58a6ff' },
  GEO:         { bg: 'rgba(218,54,51,0.12)',   text: '#da3633' },
  POLITICAL:   { bg: 'rgba(139,148,158,0.15)', text: '#c9d1d9' },
  TECH:        { bg: 'rgba(46,160,67,0.12)',   text: '#2ea043' },
  SPORTS:      { bg: 'rgba(210,153,34,0.12)',  text: '#d29922' },
  COMMODITIES: { bg: 'rgba(46,160,67,0.12)',   text: '#2ea043' },
  OTHER:       { bg: 'rgba(139,148,158,0.12)', text: '#8b949e' },
  'NEG-RISK':  { bg: 'transparent',            text: '#d29922', border: '#d29922' },
  'VOL SPIKE': { bg: 'rgba(218,54,51,0.12)',   text: '#da3633' },
  'DIR SHIFT': { bg: 'rgba(210,153,34,0.12)',  text: '#d29922' },
}

export function Badge({ label, variant }: { label: string; variant?: string }) {
  const key = (variant ?? label).toUpperCase()
  const style = TAG_STYLES[key] ?? TAG_STYLES.OTHER
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      height: 16, padding: '0 6px',
      fontSize: 9, fontWeight: 600, letterSpacing: '0.4px',
      fontFamily: PM.font.mono, textTransform: 'uppercase',
      background: style.bg, color: style.text,
      border: style.border ? `1px solid ${style.border}` : 'none',
      borderRadius: 2, flexShrink: 0,
    }}>{label}</span>
  )
}

// ─── Signal Level Badge (STRONG/WEAK/NONE) ───────────────────────────────────
export function SignalBadge({ level }: { level: string }) {
  const L = level.toUpperCase()
  const c = L === 'STRONG' ? PM.up : L === 'WEAK' ? PM.warning : PM.text.disabled
  const bg = L === 'STRONG' ? 'rgba(46,160,67,0.14)' : L === 'WEAK' ? 'rgba(210,153,34,0.12)' : 'transparent'
  const bd = L === 'STRONG' ? 'rgba(46,160,67,0.4)' : L === 'WEAK' ? 'rgba(210,153,34,0.35)' : PM.border.subtle
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      height: 16, padding: '0 6px',
      fontSize: 9, fontWeight: 700, letterSpacing: '0.4px',
      fontFamily: PM.font.mono, textTransform: 'uppercase',
      background: bg, color: c, border: `1px solid ${bd}`, borderRadius: 2,
      flexShrink: 0,
    }}>{L}</span>
  )
}

// ─── Status Dot ──────────────────────────────────────────────────────────────
export function StatusDot({ state, size = 6 }: { state: 'live' | 'polling' | 'down' | 'idle'; size?: number }) {
  const c = state === 'live' ? PM.up : state === 'polling' ? PM.warning : state === 'idle' ? PM.text.disabled : PM.down
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      borderRadius: '50%', background: c, flexShrink: 0,
    }} title={state.toUpperCase()} />
  )
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
export function PrimaryButton({
  children, onClick, disabled, loading, height = 28, fullWidth,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  height?: number
  fullWidth?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{
        position: 'relative', overflow: 'hidden',
        height, padding: '0 14px',
        fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
        fontFamily: PM.font.ui, textTransform: 'uppercase',
        background: disabled ? PM.bg.elevated : PM.accent,
        color: disabled ? PM.text.disabled : '#ffffff',
        border: 'none', borderRadius: 2,
        cursor: disabled || loading ? 'default' : 'pointer',
        transition: `filter ${PM.motion}`,
        width: fullWidth ? '100%' : undefined,
      }}
      onMouseEnter={e => { if (!disabled && !loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = '' }}
    >
      {children}
      {loading && <div className="pm-progress-bar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}/>}
    </button>
  )
}

export function SecondaryButton({
  children, onClick, disabled, destructive, height = 28, fullWidth, style,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
  height?: number
  fullWidth?: boolean
  style?: CSSProperties
}) {
  const color = destructive ? PM.down : PM.text.secondary
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        height, padding: '0 12px',
        fontSize: 11, fontWeight: 500, letterSpacing: '0.3px',
        fontFamily: PM.font.ui,
        background: 'transparent',
        color: disabled ? PM.text.disabled : color,
        border: `1px solid ${destructive ? PM.down : PM.border.prominent}`,
        borderRadius: 2,
        cursor: disabled ? 'default' : 'pointer',
        transition: `background ${PM.motion}`,
        width: fullWidth ? '100%' : undefined,
        textTransform: 'uppercase',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = PM.bg.elevated }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >{children}</button>
  )
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────
export const Icon = {
  Chevron: ({ size = 12, color = PM.text.muted, rotate = 0 }: { size?: number; color?: string; rotate?: number }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ transform: `rotate(${rotate}deg)`, flexShrink: 0 }}>
      <path d="M4 2.5 L8 6 L4 9.5" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  External: ({ size = 10, color = PM.text.muted }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
      <path d="M3 1 H1 V9 H9 V7 M6 1 H9 V4 M4 6 L9 1" fill="none" stroke={color} strokeWidth="1" strokeLinecap="square"/>
    </svg>
  ),
  Close: ({ size = 12, color = PM.text.muted }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
      <path d="M2 2 L10 10 M10 2 L2 10" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  ArrowLeft: ({ size = 12, color = PM.text.muted }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
      <path d="M7.5 2.5 L4 6 L7.5 9.5" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ArrowRight: ({ size = 12, color = PM.text.muted }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
      <path d="M4.5 2.5 L8 6 L4.5 9.5" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Refresh: ({ size = 12, color = PM.text.muted }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
      <path d="M10 4 A4 4 0 1 0 10.5 8" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M7 2 L10 4 L8 6" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Bolt: ({ size = 10, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
      <path d="M9 1L3 9h4l-1 6 6-8h-4l1-6z" fill={color}/>
    </svg>
  ),
  TriUp: ({ size = 8, color = PM.up }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 8 8" style={{ flexShrink: 0 }}>
      <path d="M4 1 L7 7 L1 7 Z" fill={color}/>
    </svg>
  ),
  TriDown: ({ size = 8, color = PM.down }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 8 8" style={{ flexShrink: 0 }}>
      <path d="M4 7 L7 1 L1 1 Z" fill={color}/>
    </svg>
  ),
  Flag: ({ size = 12, color = PM.warning }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
      <path d="M2 1 V11 M2 1 L9 1 L7 3.5 L9 6 L2 6" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}
