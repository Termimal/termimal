/**
 * MarketCard — mobile-first card layout for a Polymarket market.
 *
 * Replaces the dense table-row pattern on small screens. The previous
 * mobile pass shrank the desktop grid; users complained it read as
 * tiny and cramped. This component is a true card:
 *
 *   ┌─────────────────────────────┐
 *   │ POLITICS              ▲4.2% │   ← row 1: badge + change
 *   │ Will Trump sign the ...     │   ← row 2: title (2 lines max)
 *   │ ┌────────┐ ┌────────┐  $2.1M│   ← row 3: YES/NO chips + volume
 *   │ │YES 67%│ │NO  33%│        │
 *   │ └────────┘ └────────┘        │
 *   └─────────────────────────────┘
 *
 *   - 88 px min height (well above the 44 px tap-target floor).
 *   - YES/NO are the largest, most readable elements (20 px bold).
 *   - Whole card is the tappable surface — no tiny hit zones.
 *   - Selected state: 3 px left accent bar + subtle background lift.
 */
import { useEffect, useRef } from 'react'
import { PM, fmtUsd, categoryColor } from './_ui/tokens'
import { onActivate } from '@/lib/a11y'

interface MarketCardProps {
  question: string
  tag: string | null | undefined
  yesPrice: number
  volume24h: number
  change24h?: number | null
  selected?: boolean
  onOpen: () => void
}

export function MarketCard({
  question, tag, yesPrice, volume24h, change24h, selected = false, onOpen,
}: MarketCardProps) {
  // Tick flash on price change — same pattern as the desktop row.
  const ref = useRef<HTMLDivElement | null>(null)
  const prev = useRef(yesPrice)
  useEffect(() => {
    if (prev.current === yesPrice) return
    const flashEl = ref.current?.querySelector('.pm-card-prices') as HTMLElement | null
    if (flashEl) {
      const cls = yesPrice > prev.current ? 'pm-flash-up' : 'pm-flash-down'
      flashEl.classList.remove('pm-flash-up', 'pm-flash-down')
      void flashEl.offsetHeight
      flashEl.classList.add(cls)
    }
    prev.current = yesPrice
  }, [yesPrice])

  const noPrice = 1 - yesPrice
  const tagLabel = (tag || 'OTHER').toUpperCase()
  const tagColor = categoryColor(tagLabel)
  const change = change24h ?? null
  const changeColor = change == null ? PM.text.muted : change >= 0 ? PM.up : PM.down
  const changeArrow = change == null ? '' : change >= 0 ? '▲' : '▼'

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onActivate(onOpen)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 16px',
        minHeight: PM.hit.rowMobile,
        borderBottom: `1px solid ${PM.border.subtle}`,
        // 3px accent bar on the left when this card is selected.
        borderLeft: selected ? `3px solid ${PM.accent}` : '3px solid transparent',
        background: selected ? PM.row.selected : 'transparent',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 120ms ease',
      }}
    >
      {/* Row 1 — category badge + 24 h change */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: PM.size.label,
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: tagColor,
            textTransform: 'uppercase',
            fontFamily: PM.font.ui,
          }}
        >
          {tagLabel}
        </span>
        {change != null && (
          <span
            style={{
              fontSize: PM.size.body,
              fontWeight: 600,
              fontFamily: PM.font.mono,
              fontVariantNumeric: 'tabular-nums',
              color: changeColor,
            }}
          >
            {changeArrow} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Row 2 — title (2-line clamp) */}
      <div
        style={{
          fontSize: PM.size.data,
          fontWeight: 500,
          color: PM.text.primary,
          lineHeight: 1.4,
          fontFamily: PM.font.ui,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}
      >
        {question}
      </div>

      {/* Row 3 — YES / NO chips + volume */}
      <div className="pm-card-prices" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0' }}>
        <PriceChip kind="yes" pct={yesPrice} />
        <PriceChip kind="no"  pct={noPrice} />
        <div style={{ flex: 1, textAlign: 'right' }}>
          <span
            style={{
              fontSize: PM.size.body,
              fontFamily: PM.font.mono,
              fontVariantNumeric: 'tabular-nums',
              color: PM.text.muted,
            }}
          >
            {fmtUsd(volume24h)}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Hero YES/NO price chip with green/red translucent background. */
function PriceChip({ kind, pct }: { kind: 'yes' | 'no'; pct: number }) {
  const isYes = kind === 'yes'
  const color = isYes ? PM.up : PM.down
  const bg    = isYes ? PM.upFill : PM.downFill
  return (
    <div
      // Labelled so screen readers don't have to rely on colour to
      // distinguish YES from NO.
      aria-label={`${isYes ? 'Yes' : 'No'} probability ${(pct * 100).toFixed(0)} percent`}
      style={{
        flex: '0 0 auto',
        minWidth: 88,
        padding: '8px 12px',
        borderRadius: 6,
        background: bg,
        border: `1px solid ${color}33`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: PM.size.label,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color,
          fontFamily: PM.font.ui,
        }}
      >
        {isYes ? 'YES' : 'NO'}
      </span>
      <span
        style={{
          fontSize: PM.size.hero,
          fontWeight: 700,
          fontFamily: PM.font.mono,
          fontVariantNumeric: 'tabular-nums',
          color,
          lineHeight: 1.1,
        }}
      >
        {Math.round(pct * 100)}%
      </span>
    </div>
  )
}
