// components/common/RiskWarning.tsx
// Persistent, terminal-styled risk warning for any view that shows
// signals, regime scores, recommendations, or paper-trading output.

const mono = "'SF Mono', Menlo, Consolas, monospace"

type Variant = 'signal' | 'demo' | 'data' | 'paper'

const COPY: Record<Variant, { title: string; body: string }> = {
  signal: {
    title: 'NOT FINANCIAL ADVICE',
    body: 'Signals, regime scores, wallet rankings, and anomaly flags are research outputs derived from public data. They are not recommendations to buy, sell, or hold any asset. Markets carry risk of loss; verify independently before acting.',
  },
  demo: {
    title: 'DEMO DATA',
    body: 'Figures shown are illustrative samples used to preview the interface. They are not live and must not be used for trading decisions.',
  },
  data: {
    title: 'INFORMATIONAL ONLY',
    body: 'Termimal does not execute trades, custody funds, or provide individualised investment advice. Past performance does not guarantee future results.',
  },
  paper: {
    title: 'PAPER TRADING',
    body: 'Simulated orders only. No real funds are committed and no orders are routed to any venue. Slippage, fills, and PnL are approximations and may diverge from live execution.',
  },
}

export function RiskWarning({
  variant = 'signal',
  compact,
  style,
}: {
  variant?: Variant
  compact?: boolean
  style?: React.CSSProperties
}) {
  const { title, body } = COPY[variant]
  // Compact = quiet inline note (matches Bloomberg / Refinitiv aesthetic).
  // Full = subtle bordered note. Neither uses the loud amber gold any more —
  // it killed the design density for power users. We rely on the per-page
  // methodology + the persistent footer for the legally-required visibility.
  const accent = variant === 'paper' ? '#d29922' : '#5a6470'
  const bg = variant === 'paper' ? '#d2992208' : '#161b22'
  const border = variant === 'paper' ? '#d2992233' : '#21262d'
  return (
    <div
      role="note"
      aria-label={title}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: compact ? '4px 8px' : '7px 10px',
        background: bg,
        border: `1px solid ${border}`,
        fontFamily: mono,
        fontSize: compact ? 9 : 10,
        lineHeight: 1.5,
        color: '#8b949e',
        ...style,
      }}
    >
      <span aria-hidden style={{ color: accent, fontWeight: 600 }}>·</span>
      <span>
        <span style={{ color: accent, fontWeight: 600, marginRight: 6, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: compact ? 8 : 9 }}>{title}</span>
        {body}
      </span>
    </div>
  )
}

export default RiskWarning
