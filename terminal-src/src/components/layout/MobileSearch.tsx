/**
 * MobileSearch — full-screen ticker search overlay for the mobile
 * terminal. Opens from the top bar's search icon. Replaces the desktop
 * Navbar's inline search dropdown which doesn't fit on a phone.
 *
 * Behavior:
 *   - Auto-focus on open + lock body scroll.
 *   - 16 px input font so iOS Safari does not zoom on focus.
 *   - ESC and the back-arrow both close.
 *   - Tap a result -> navigate to /ticker/<symbol> + close.
 *   - Empty input -> show a curated list of popular tickers.
 *
 * Universe is passed in by the caller (Navbar already maintains a
 * 200-ticker UNIVERSE constant — we don't want to duplicate it).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'

export interface SearchTicker {
  s: string         // symbol
  n: string         // long name
  t?: string        // type (Stock / ETF / Index / Crypto / Forex / Futures)
  mc?: string       // market cap label
}

interface Props {
  open: boolean
  onClose: () => void
  universe: SearchTicker[]
  /** Optional: passed-through ticker set the user has favorited. */
  popular?: string[]
}

const CATS = [
  { k: 'all',    l: 'All'     },
  { k: 'Stock',  l: 'Stocks'  },
  { k: 'ETF',    l: 'ETFs'    },
  { k: 'Index',  l: 'Indices' },
  { k: 'Crypto', l: 'Crypto'  },
  { k: 'Forex',  l: 'Forex'   },
  { k: 'Futures',l: 'Futures' },
]

export function MobileSearch({ open, onClose, universe, popular }: Props) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  // Reset state on each open/close so users get a fresh search.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setCat('all')
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  // ESC closes (in case a Bluetooth keyboard is connected).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    let pool = universe
    if (cat !== 'all') pool = pool.filter(t => (t.t ?? '').toLowerCase() === cat.toLowerCase())
    if (!q) {
      // Empty query: prefer the user's "popular" set first, then top of pool.
      const pop = (popular ?? [])
        .map(s => pool.find(t => t.s === s))
        .filter(Boolean) as SearchTicker[]
      const seen = new Set(pop.map(t => t.s))
      const rest = pool.filter(t => !seen.has(t.s)).slice(0, 50 - pop.length)
      return [...pop, ...rest]
    }
    return pool
      .filter(t =>
        t.s.toLowerCase().includes(q) ||
        t.n.toLowerCase().includes(q),
      )
      .slice(0, 80)
  }, [query, cat, universe, popular])

  const goTo = (sym: string) => {
    navigate(`/ticker/${sym.toUpperCase()}`)
    onClose()
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search tickers"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: '#0a0d12',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Header: back arrow + input + clear */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px',
        borderBottom: '1px solid #1a1f2c',
        background: '#0e1117',
      }}>
        <button
          type="button"
          aria-label="Close search"
          onClick={onClose}
          style={{
            width: 40, height: 40,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: '#c9d1d9', cursor: 'pointer',
            fontSize: 22, lineHeight: 1,
          }}
        >
          ←
        </button>

        <div style={{ position: 'relative', flex: 1 }}>
          <svg
            aria-hidden="true"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16 }}
            fill="none" viewBox="0 0 24 24" stroke="#8b949e"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search symbol or company"
            inputMode="search"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Search symbol or company"
            style={{
              width: '100%',
              fontSize: 16,
              fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              color: '#e6edf3',
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: 8,
              padding: '10px 12px 10px 34px',
              outline: 'none',
              minHeight: 44,
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && hits[0]) goTo(hits[0].s)
            }}
          />
        </div>

        {query.length > 0 && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => setQuery('')}
            style={{
              width: 40, height: 40,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              color: '#8b949e', cursor: 'pointer', fontSize: 20, lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Category chips */}
      <div
        role="tablist"
        aria-label="Asset class filter"
        style={{
          display: 'flex', gap: 6, padding: '10px 12px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          borderBottom: '1px solid #161b22',
        }}
      >
        {CATS.map(c => (
          <button
            key={c.k}
            type="button"
            role="tab"
            aria-selected={cat === c.k}
            onClick={() => setCat(c.k)}
            style={{
              padding: '8px 14px',
              fontSize: 13, fontWeight: 500,
              borderRadius: 999,
              border: '1px solid ' + (cat === c.k ? '#388bfd' : '#21262d'),
              background:    cat === c.k ? 'rgba(56,139,253,0.12)' : 'transparent',
              color:         cat === c.k ? '#58a6ff' : '#8b949e',
              cursor: 'pointer', flexShrink: 0,
              minHeight: 36,
              whiteSpace: 'nowrap',
            }}
          >
            {c.l}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {hits.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#484f58', fontSize: 14 }}>
            No matches{query ? <> for <span style={{ color: '#c9d1d9' }}>"{query}"</span></> : null}
            {query && (
              <>
                <div style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => goTo(query.toUpperCase())}
                    style={{
                      padding: '10px 20px',
                      fontSize: 14, fontWeight: 500,
                      borderRadius: 8,
                      border: '1px solid #388bfd',
                      background: 'rgba(56,139,253,0.12)',
                      color: '#58a6ff',
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    Try {query.toUpperCase()} anyway →
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {!query && (
              <li style={{ padding: '12px 16px 6px', fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: '#484f58' }}>
                {(popular?.length ? 'Popular' : 'Browse')}
              </li>
            )}
            {hits.map(t => (
              <li key={t.s}>
                <button
                  type="button"
                  onClick={() => goTo(t.s)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: 'transparent', border: 'none',
                    borderBottom: '1px solid #161b22',
                    cursor: 'pointer',
                    minHeight: 56,
                    textAlign: 'left',
                  }}
                >
                  <Logo sym={t.s} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3', lineHeight: 1.2 }}>
                      {t.s}
                    </div>
                    <div style={{
                      fontSize: 12, color: '#8b949e', marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.n}
                    </div>
                  </div>
                  {t.t && (
                    <span style={{
                      fontSize: 10, color: '#8b949e',
                      border: '1px solid #21262d', borderRadius: 4,
                      padding: '3px 8px', flexShrink: 0,
                      letterSpacing: 0.4,
                    }}>
                      {t.t}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
