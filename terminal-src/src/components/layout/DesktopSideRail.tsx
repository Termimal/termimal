/**
 * DesktopSideRail — vertical icon navigation for >= 900 px viewports.
 *
 * Sits to the left of the main content area, always visible. Inspired
 * by TradingView's left rail and Webull's icon strip: every primary
 * destination is one click away regardless of which tabs the user has
 * open. Complements (does not replace) the horizontal tab bar — that
 * still owns "currently open workspaces" with drag-to-reorder.
 *
 * Two display modes:
 *   - Default (collapsed): 56 px wide, icons only with tooltip on hover.
 *   - Expanded: 200 px wide, icons + labels. Toggled by the chevron at
 *     the bottom; preference persists in localStorage.
 *
 * Active route gets an accent-blue left border + tinted background.
 * Hover state uses a soft white tint without animation.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface RailItem {
  path: string
  label: string
  icon: ReactNode
  group?: 'top' | 'tools' | 'bottom'
}

const ITEMS: RailItem[] = [
  { path: '/',             label: 'Dashboard',  icon: <HomeIcon />,    group: 'top' },
  { path: '/macro',        label: 'Macro',      icon: <BarsIcon />,    group: 'top' },
  { path: '/charts',       label: 'Charts',     icon: <CandleIcon />,  group: 'top' },
  { path: '/polymarket',   label: 'Markets',    icon: <TargetIcon />,  group: 'top' },
  { path: '/news',         label: 'News',       icon: <NewsIcon />,    group: 'top' },

  { path: '/screener',     label: 'Screener',   icon: <FilterIcon />,  group: 'tools' },
  { path: '/risk',         label: 'Risk',       icon: <ShieldIcon />,  group: 'tools' },
  { path: '/cot',          label: 'COT',        icon: <FileIcon />,    group: 'tools' },
  { path: '/portfolio',    label: 'Portfolio',  icon: <FolderIcon />,  group: 'tools' },
  { path: '/indicators',   label: 'Indicators', icon: <GlobeIcon />,   group: 'tools' },
  { path: '/fundamentals', label: 'Fundamentals', icon: <BookIcon />,  group: 'tools' },

  { path: '/settings',     label: 'Settings',   icon: <CogIcon />,     group: 'bottom' },
]

const STORAGE_KEY = 'ft-side-rail-expanded'

export function DesktopSideRail() {
  const navigate = useNavigate()
  const location = useLocation()

  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY) === '1'
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, expanded ? '1' : '0') } catch {}
  }, [expanded])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const top    = ITEMS.filter(i => i.group === 'top')
  const tools  = ITEMS.filter(i => i.group === 'tools')
  const bottom = ITEMS.filter(i => i.group === 'bottom')

  return (
    <aside
      role="navigation"
      aria-label="Primary"
      style={{
        width: expanded ? 200 : 56,
        transition: 'width 160ms ease-out',
        flexShrink: 0,
        background: '#0a0d12',
        borderRight: '1px solid #21262d',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <nav style={{ flex: 1, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {top.map(it => (
          <RailButton
            key={it.path}
            item={it}
            active={isActive(it.path)}
            expanded={expanded}
            onClick={() => navigate(it.path)}
          />
        ))}

        <Divider expanded={expanded} label="TOOLS" />

        {tools.map(it => (
          <RailButton
            key={it.path}
            item={it}
            active={isActive(it.path)}
            expanded={expanded}
            onClick={() => navigate(it.path)}
          />
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 0', borderTop: '1px solid #161b22' }}>
        {bottom.map(it => (
          <RailButton
            key={it.path}
            item={it}
            active={isActive(it.path)}
            expanded={expanded}
            onClick={() => navigate(it.path)}
          />
        ))}

        <button
          type="button"
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
          onClick={() => setExpanded(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: expanded ? 'flex-end' : 'center',
            padding: expanded ? '10px 16px' : '10px 0',
            margin: '4px 8px 8px',
            background: 'transparent',
            border: '1px solid #21262d',
            borderRadius: 6,
            color: '#8b949e',
            cursor: 'pointer',
            transition: 'all 120ms ease-out',
            minHeight: 36,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#388bfd66'; e.currentTarget.style.color = '#e6edf3' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#21262d'; e.currentTarget.style.color = '#8b949e' }}
        >
          {expanded ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <ChevronLeft />
              <span>Collapse</span>
            </span>
          ) : (
            <ChevronRight />
          )}
        </button>
      </div>
    </aside>
  )
}

/* ── Internals ─────────────────────────────────────────────────── */

interface RailButtonProps {
  item: RailItem
  active: boolean
  expanded: boolean
  onClick: () => void
}

function RailButton({ item, active, expanded, onClick }: RailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={expanded ? undefined : item.label}
      aria-current={active ? 'page' : undefined}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: expanded ? '10px 16px' : '10px 0',
        margin: '0 8px',
        justifyContent: expanded ? 'flex-start' : 'center',
        background: active ? 'rgba(56,139,253,0.10)' : 'transparent',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        color: active ? '#58a6ff' : '#8b949e',
        transition: 'background 120ms ease-out, color 120ms ease-out',
        textAlign: 'left',
        minHeight: 38,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#e6edf3' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b949e' } }}
    >
      {/* Active accent stripe on the left */}
      {active && (
        <span style={{
          position: 'absolute', left: -8, top: 6, bottom: 6, width: 2,
          background: '#388bfd', borderRadius: 2,
        }} />
      )}
      <span style={{ display: 'inline-flex', flexShrink: 0, width: 20, height: 20 }}>
        {item.icon}
      </span>
      {expanded && (
        <span style={{
          fontSize: 13, fontWeight: active ? 600 : 500,
          letterSpacing: 0.2, whiteSpace: 'nowrap',
        }}>
          {item.label}
        </span>
      )}
    </button>
  )
}

function Divider({ expanded, label }: { expanded: boolean; label: string }) {
  return (
    <div style={{
      padding: expanded ? '14px 24px 6px' : '14px 8px 6px',
      fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
      textTransform: 'uppercase', color: '#484f58',
      textAlign: expanded ? 'left' : 'center',
    }}>
      {expanded ? label : '·'}
    </div>
  )
}

/* ── Icon set ────────────────────────────────────────────────────── */

const baseSvg: React.SVGProps<SVGSVGElement> = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': true,
}

function HomeIcon() {
  return <svg {...baseSvg}><path d="M3 11l9-8 9 8" /><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" /></svg>
}
function BarsIcon() {
  return <svg {...baseSvg}><line x1="6" y1="20" x2="6" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="18" y1="20" x2="18" y2="14" /></svg>
}
function CandleIcon() {
  return <svg {...baseSvg}><path d="M3 17l4-4 4 3 4-7 4 5 2-2" /><path d="M21 21H3V3" /></svg>
}
function TargetIcon() {
  return <svg {...baseSvg}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>
}
function NewsIcon() {
  return <svg {...baseSvg}><path d="M3 5h18v14H3z" /><line x1="7" y1="9"  x2="17" y2="9"  /><line x1="7" y1="13" x2="17" y2="13" /><line x1="7" y1="17" x2="13" y2="17" /></svg>
}
function FilterIcon() {
  return <svg {...baseSvg}><path d="M4 5h16l-6 8v6l-4-2v-4z" /></svg>
}
function ShieldIcon() {
  return <svg {...baseSvg}><path d="M12 3l8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7z" /></svg>
}
function FileIcon() {
  return <svg {...baseSvg}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" /></svg>
}
function FolderIcon() {
  return <svg {...baseSvg}><path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
}
function GlobeIcon() {
  return <svg {...baseSvg}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 010 18" /><path d="M12 3a14 14 0 000 18" /></svg>
}
function BookIcon() {
  return <svg {...baseSvg}><path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2z" /><path d="M8 7h6M8 11h6M8 15h4" /></svg>
}
function CogIcon() {
  return <svg {...baseSvg}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1.2l2.1-1.6-2-3.5-2.5.9a7 7 0 00-2.1-1.2L14 3h-4l-.4 2.4a7 7 0 00-2.1 1.2L5 5.7l-2 3.5L5.1 10.8a7 7 0 000 2.4L3 14.8l2 3.5 2.5-.9a7 7 0 002.1 1.2L10 21h4l.4-2.4a7 7 0 002.1-1.2l2.5.9 2-3.5-2.1-1.6c.07-.4.1-.79.1-1.2z" /></svg>
}
function ChevronLeft() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
}
function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
}
