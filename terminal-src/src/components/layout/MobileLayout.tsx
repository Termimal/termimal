/**
 * MobileLayout — the entire chrome around the terminal SPA when the
 * viewport is narrower than 900 px. Replaces Navbar + Watchlist +
 * footer with a TradingView-style mobile shell:
 *
 *   ┌─────────────────────────────────────┐
 *   │ [≡]  TERMIMAL                  [🔍] │  top bar — 52 px
 *   ├─────────────────────────────────────┤
 *   │                                     │
 *   │           page content              │  scrollable, full-width
 *   │                                     │
 *   ├─────────────────────────────────────┤
 *   │ Home  Macro  Charts  Markets  More  │  bottom tab bar — 64 px
 *   └─────────────────────────────────────┘
 *
 * Design choices:
 *   - Search lives in a fullscreen overlay (MobileSearch), opened from
 *     the top bar's search icon. No persistent input — uses the
 *     viewport better.
 *   - Account / billing / settings all live behind the "More" tab so
 *     there's a single source of navigation; no duplicate menus.
 *   - Bottom tab labels stay 11 px so all 5 tabs fit comfortably at
 *     iPhone SE width (375 px). Active state uses a top accent bar
 *     and a colour shift so the change is obvious without animation.
 *   - 16 px input font rule lives in the search overlay; tap targets
 *     are all ≥ 44 px (iOS HIG).
 */

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useStore, selectRegime } from '@/store/useStore'
import { MobileSearch, type SearchTicker } from './MobileSearch'

interface Props {
  children: React.ReactNode
  universe: SearchTicker[]
  popular?: string[]
}

const PRIMARY_TABS = [
  { path: '/',           label: 'Home',     icon: HomeIcon },
  { path: '/macro',      label: 'Macro',    icon: BarsIcon },
  { path: '/charts',     label: 'Charts',   icon: CandleIcon },
  { path: '/polymarket', label: 'Markets',  icon: TargetIcon },
  { path: '__more__',    label: 'More',     icon: MoreIcon },
] as const

const MORE_PAGES = [
  { path: '/screener',    label: 'Screener'         },
  { path: '/risk',        label: 'Risk engine'      },
  { path: '/cot',         label: 'COT positioning'  },
  { path: '/portfolio',   label: 'Portfolio'        },
  { path: '/indicators',  label: 'Global indicators'},
  { path: '/news',        label: 'News flow'        },
  { path: '/fundamentals',label: 'Fundamentals'     },
  { path: '/settings',    label: 'Settings'         },
]

export function MobileLayout({ children, universe, popular }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const regime = useStore(selectRegime)
  const apiOnline = useStore(s => s.apiOnline)
  // Same offline heuristic as the desktop Navbar: only declare offline
  // after several consecutive failed health checks so a single network
  // blip doesn't redden the indicator.
  const apiFailedChecks = useStore(s => (s as unknown as { apiFailedChecks?: number }).apiFailedChecks ?? 0)
  const apiOffline = !apiOnline && apiFailedChecks >= 3

  const [searchOpen, setSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen]     = useState(false)
  const [authUser, setAuthUser]     = useState<User | null>(null)

  // Pull the current Supabase user once, then keep in sync with auth
  // changes (sign-in / sign-out from another tab).
  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setAuthUser(data.user)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUser(session?.user ?? null)
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [])

  // Close all overlays on route change.
  useEffect(() => {
    setSearchOpen(false)
    setMoreOpen(false)
  }, [location.pathname])

  const regimeColor =
    regime === 'RISK-ON'  ? '#3fb950' :
    regime === 'RISK-OFF' ? '#f85149' :
    '#d29922'

  const apiColor =
    apiOnline  ? '#3fb950' :
    apiOffline ? '#f85149' :
    '#d29922'

  // Display name + initials for the More drawer.
  const email = authUser?.email ?? ''
  const fullName: string =
    (authUser?.user_metadata?.full_name as string | undefined) ||
    (authUser?.user_metadata?.name as string | undefined) ||
    email.split('@')[0] ||
    'Guest'
  const initials = fullName
    .split(' ')
    .map(s => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'GU'

  const onTabClick = (path: string) => {
    if (path === '__more__') {
      setMoreOpen(true)
      return
    }
    navigate(path)
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100dvh',
      background: '#0a0d12',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* ── Top bar ── */}
      <header style={{
        flexShrink: 0,
        height: 52,
        display: 'flex', alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: '#0e1117',
        borderBottom: '1px solid #1a1f2c',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <a
          href="/"
          aria-label="Back to termimal.com"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            textDecoration: 'none',
            flex: 1, minWidth: 0,
          }}
        >
          <span style={{
            fontSize: 15, fontWeight: 700, letterSpacing: 0.5,
            color: '#e6edf3',
          }}>
            TERMIMAL
          </span>
          <span
            title={
              apiOnline ? 'Live data' :
              apiOffline ? 'Backend unreachable' :
              'Connecting…'
            }
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: apiColor,
              flexShrink: 0,
            }}
            className={apiOnline ? 'pulse-dot' : undefined}
          />
          {regime && regime !== 'NEUTRAL' && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              padding: '2px 8px', borderRadius: 4,
              color: regimeColor,
              background: regimeColor + '15',
              letterSpacing: 0.4,
            }}>
              {regime}
            </span>
          )}
        </a>

        <button
          type="button"
          aria-label="Search tickers"
          onClick={() => setSearchOpen(true)}
          style={{
            width: 40, height: 40,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: '1px solid #21262d', borderRadius: 8,
            color: '#c9d1d9', cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <SearchIcon />
        </button>
      </header>

      {/* ── Page content ── */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        // Reserve space for the bottom tab bar plus the iPhone home
        // indicator so content never sits under the chrome.
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
        background: '#0a0d12',
      }}>
        {children}
      </main>

      {/* ── Bottom tab bar ── */}
      <nav
        role="navigation"
        aria-label="Primary"
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          height: 'calc(64px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: '#0e1117',
          borderTop: '1px solid #1a1f2c',
          display: 'flex',
          zIndex: 40,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
        }}
      >
        {PRIMARY_TABS.map(tab => {
          const Icon = tab.icon
          const active = tab.path === '__more__'
            ? moreOpen
            : isActive(tab.path)
          return (
            <button
              key={tab.path}
              type="button"
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              onClick={() => onTabClick(tab.path)}
              style={{
                flex: 1,
                minHeight: 56,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? '#58a6ff' : '#8b949e',
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%',
                  height: 2, background: '#58a6ff', borderRadius: 0,
                }} />
              )}
              <Icon active={active} />
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ── Search overlay ── */}
      <MobileSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        universe={universe}
        popular={popular}
      />

      {/* ── More drawer ── */}
      {moreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More options"
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.55)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              background: '#0e1117',
              borderTop: '1px solid #1a1f2c',
              borderTopLeftRadius: 16, borderTopRightRadius: 16,
              maxHeight: '85vh',
              display: 'flex', flexDirection: 'column',
              paddingBottom: 'env(safe-area-inset-bottom)',
              boxShadow: '0 -12px 32px rgba(0,0,0,0.5)',
              animation: 'pm-overlay-in 200ms ease-out',
            }}
          >
            {/* Drag handle */}
            <div style={{
              display: 'flex', justifyContent: 'center', padding: '10px 0 4px',
            }}>
              <span style={{
                width: 36, height: 4, background: '#30363d', borderRadius: 2,
              }} />
            </div>

            {/* Identity block */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 20px 16px',
              borderBottom: '1px solid #161b22',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#161b22', border: '1px solid #21262d',
                fontSize: 13, fontWeight: 700, color: '#c9d1d9',
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 600, color: '#e6edf3', lineHeight: 1.2,
                }}>
                  {fullName}
                </div>
                <div style={{
                  fontSize: 12, color: '#8b949e', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {email || 'Not signed in'}
                </div>
              </div>
            </div>

            {/* Scrollable list */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {/* Secondary pages */}
              <ul style={{ listStyle: 'none', margin: 0, padding: '8px 0' }}>
                <li style={{
                  padding: '12px 20px 6px',
                  fontSize: 11, fontWeight: 600, letterSpacing: 0.6,
                  textTransform: 'uppercase', color: '#484f58',
                }}>
                  Tools
                </li>
                {MORE_PAGES.map(p => (
                  <li key={p.path}>
                    <button
                      type="button"
                      onClick={() => { setMoreOpen(false); navigate(p.path) }}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '14px 20px',
                        background: 'transparent', border: 'none',
                        color: '#c9d1d9', fontSize: 14,
                        cursor: 'pointer', minHeight: 48,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <span>{p.label}</span>
                      <span style={{ color: '#484f58', fontSize: 18 }}>›</span>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Account links — hard navigations to the marketing site */}
              <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0', borderTop: '1px solid #161b22' }}>
                <li style={{
                  padding: '12px 20px 6px',
                  fontSize: 11, fontWeight: 600, letterSpacing: 0.6,
                  textTransform: 'uppercase', color: '#484f58',
                }}>
                  Account
                </li>
                {[
                  { href: '/dashboard/profile', label: 'Profile' },
                  { href: '/dashboard/billing', label: 'Subscription & billing' },
                  { href: '/pricing',           label: 'Upgrade plan',  accent: true },
                  { href: '/support',           label: 'Help & contact' },
                  { href: '/',                  label: '← Back to termimal.com' },
                ].map(item => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px',
                        color: item.accent ? '#58a6ff' : '#c9d1d9',
                        textDecoration: 'none',
                        fontSize: 14,
                        minHeight: 48,
                      }}
                    >
                      <span>{item.label}</span>
                      <span style={{ color: '#484f58', fontSize: 18 }}>›</span>
                    </a>
                  </li>
                ))}
                <li style={{ borderTop: '1px solid #161b22', marginTop: 4 }}>
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault()
                      try { await supabase.auth.signOut() } catch {}
                      window.location.href = '/login'
                    }}
                    style={{
                      display: 'block', padding: '14px 20px',
                      color: '#f85149', textDecoration: 'none',
                      fontSize: 14, fontWeight: 500,
                      minHeight: 48,
                    }}
                  >
                    Sign out
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Inline icon set ── */
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
    </svg>
  )
}

function BarsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6"  y1="20" x2="6"  y2="10" />
      <line x1="12" y1="20" x2="12" y2="4"  />
      <line x1="18" y1="20" x2="18" y2="14" />
    </svg>
  )
}

function CandleIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17l4-4 4 3 4-7 4 5 2-2" />
      <path d="M21 21H3V3" />
    </svg>
  )
}

function TargetIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5"  cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16" y2="16" />
    </svg>
  )
}
