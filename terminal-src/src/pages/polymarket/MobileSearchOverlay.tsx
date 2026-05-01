/**
 * MobileSearchOverlay — full-screen search experience for the mobile
 * Polymarket terminal. Consumers pass `query` + `onChange` so this
 * component is purely presentational; debouncing happens at the call
 * site.
 *
 * Open animation: fade in + slide up (CSS, 200 ms).
 * Input font-size: 16 px so iOS Safari does NOT zoom on focus.
 * Auto-focus on mount.
 */
import { useEffect, useRef } from 'react'
import { PM } from './_ui/tokens'

interface MobileSearchOverlayProps {
  open: boolean
  query: string
  onChange: (q: string) => void
  onClose: () => void
  /**
   * Optional: rendered below the input. Typically a list of MarketCards
   * filtered by the parent.
   */
  children?: React.ReactNode
}

export function MobileSearchOverlay({ open, query, onChange, onClose, children }: MobileSearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Auto-focus when opening, and lock body scroll so users can't
  // accidentally scroll the page underneath.
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ESC closes (in case the user is on a tablet keyboard).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search markets"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(10, 10, 15, 0.96)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'pm-overlay-in 200ms ease-out',
        // Respect iPhone notch.
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Input row — full-width, generous spacing, 16 px font to defeat iOS zoom. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: `1px solid ${PM.border.subtle}`,
        }}
      >
        <button
          type="button"
          aria-label="Close search"
          onClick={onClose}
          style={{
            width: 40, height: 40,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: PM.text.secondary,
            cursor: 'pointer',
            fontSize: PM.size.price,
          }}
        >
          ←
        </button>
        <label htmlFor="pm-mobile-search" style={{
          position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
          overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
        }}>
          Search markets
        </label>
        <input
          ref={inputRef}
          id="pm-mobile-search"
          value={query}
          onChange={e => onChange(e.target.value)}
          placeholder="Search markets…"
          inputMode="search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1,
            // 16px MANDATORY — anything smaller triggers iOS auto-zoom on focus.
            fontSize: 16,
            fontFamily: PM.font.ui,
            color: PM.text.primary,
            background: PM.bg.elevated,
            border: `1px solid ${PM.border.subtle}`,
            borderRadius: 8,
            padding: '10px 12px',
            outline: 'none',
            minHeight: PM.hit.btn,
          }}
        />
        {query.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange('')}
            style={{
              width: 40, height: 40,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: PM.text.muted,
              cursor: 'pointer',
              fontSize: PM.size.price,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Results scroller — children rendered as-is so the parent owns layout. */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children ?? (
          <div style={{
            padding: 32, textAlign: 'center',
            fontSize: PM.size.body,
            color: PM.text.muted,
            fontFamily: PM.font.mono,
          }}>
            Type to search across {Math.min(query.length, 80)} characters.
          </div>
        )}
      </div>
    </div>
  )
}
