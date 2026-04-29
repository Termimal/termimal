// pages/NewTab.tsx — TradingView-style tile grid
import { useNavigate } from 'react-router-dom'

const TILES = [
  { path: '/',             label: 'Dashboard',         desc: 'Market overview, regime, risk engine', key: '1' },
  { path: '/polymarket',   label: 'Polymarket',        desc: 'Orderflow · Volume Profile · Paper Trading', key: 'P' },
  { path: '/saturday',     label: 'Weekly Review',      desc: 'Saturday quantitative macro briefing', key: '2' },
  { path: '/macro',        label: 'Macro Intelligence', desc: 'Rates, VIX, credit, breadth charts', key: '3' },
  { path: '/charts',        label: 'Charts',            desc: 'Professional charting + drawing tools', key: '4' },
  { path: '/portfolio',    label: 'Portfolio',           desc: 'Positions, P/L, allocation, sizing', key: '5' },
  { path: '/cot',          label: 'COT Report',         desc: 'CFTC futures positioning data', key: '6' },
  { path: '/indicators',   label: 'Indicators',          desc: 'GDP, CPI, rates, employment', key: '7' },
  { path: '/calendar',     label: 'Calendar',            desc: 'Upcoming economic events', key: '8' },
  { path: '/news',         label: 'News Flow',            desc: 'Market-moving news monitor', key: 'N' },
  { path: '/risk',         label: 'Risk Engine',        desc: 'VaR, Monte Carlo, correlation', key: '0' },
  { path: '/screener',     label: 'Screener',           desc: 'Filter stocks by criteria' },
  { path: '/settings',     label: 'Settings',           desc: 'API keys & preferences' },
]

export function NewTab() {
  const navigate = useNavigate()

  const openPage = (path: string) => {
    // Add tab + remove /newtab + navigate
    try {
      const tabs: string[] = JSON.parse(localStorage.getItem('ft-tabs') || '[]')
      const filtered = tabs.filter(t => t !== '/newtab')
      if (!filtered.includes(path)) filtered.push(path)
      localStorage.setItem('ft-tabs', JSON.stringify(filtered))
    } catch {}
    navigate(path)
    // Force tab bar re-render
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <div style={{ padding: '48px 32px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.03em', marginBottom: 4 }}>TERMIMAL</div>
      <div style={{ fontSize: 12, color: '#484f58', marginBottom: 32 }}>Swing Trading & Macro Intelligence Termimal</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {TILES.map((t: any) => (
          <div key={t.path} onClick={() => openPage(t.path)}
            style={{ background: '#0e1117', padding: '12px 12px', cursor: 'pointer', border: '1px solid #21262d', transition: 'border-color 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#388bfd' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#21262d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#c9d1d9' }}>{t.label}</span>
              {t.key && <span style={{ fontSize: 9, color: '#30363d', border: '1px solid #21262d', padding: '0 4px', fontFamily: "'SF Mono', monospace" }}>{t.key}</span>}
            </div>
            <div style={{ fontSize: 10, color: '#484f58', lineHeight: 1.4 }}>{t.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, fontSize: 10, color: '#30363d', textAlign: 'center' }}>Press / to search · Click + to open tabs</div>
    </div>
  )
}
