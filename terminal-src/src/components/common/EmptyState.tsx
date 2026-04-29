// components/common/EmptyState.tsx
// Terminal-styled empty state. Replaces the current "PRESS RUN DEEP SCAN" /
// "NO WALLET DATA" / "NO SIGNAL HISTORY" one-liners with structured guidance:
// title + body + CTA buttons + optional hint.

import type { ReactNode } from 'react'

const mono = "'SF Mono', Menlo, Consolas, monospace"

export interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'secondary'
}

export function EmptyState({
  icon,
  title,
  body,
  actions,
  hint,
  style,
}: {
  icon?: ReactNode
  title: string
  body: string
  actions?: EmptyStateAction[]
  hint?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      role="status"
      style={{
        padding: '48px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        fontFamily: mono,
        color: '#c9d1d9',
        ...style,
      }}
    >
      {icon && (
        <div
          aria-hidden
          style={{
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#34d39915', color: '#34d399',
            border: '1px solid #34d39933',
            fontSize: 16, fontWeight: 700,
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>{body}</div>
      </div>
      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {actions.map(a => {
            const baseStyle: React.CSSProperties = {
              padding: '6px 14px',
              fontSize: 10, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
              border: a.variant === 'secondary' ? '1px solid #30363d' : 'none',
              background: a.variant === 'secondary' ? 'transparent' : '#34d399',
              color: a.variant === 'secondary' ? '#c9d1d9' : '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }
            if (a.href) {
              return <a key={a.label} href={a.href} style={baseStyle}>{a.label}</a>
            }
            return (
              <button key={a.label} type="button" onClick={a.onClick} style={baseStyle}>
                {a.label}
              </button>
            )
          })}
        </div>
      )}
      {hint && (
        <div style={{ fontSize: 9, color: '#484f58', maxWidth: 480 }}>{hint}</div>
      )}
    </div>
  )
}

export default EmptyState
