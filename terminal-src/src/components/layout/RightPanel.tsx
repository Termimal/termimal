// components/layout/RightPanel.tsx — TradingView-style right sidebar
import { useState } from 'react'
import { useStore, selectMacro, selectRegime } from '@/store/useStore'

function MacroItem({ label, value, unit, delta }: { label: string; value: number | null; unit?: string; delta?: number }) {
  if (value == null) return null
  const col = delta != null ? (delta >= 0 ? '#3fb950' : '#f85149') : '#c9d1d9'
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[10px] text-[#8b949e]">{label}</span>
      <div className="text-right">
        <span className="text-xs font-mono text-[#c9d1d9]">{value.toFixed(2)}{unit || ''}</span>
        {delta != null && (
          <span className="text-[10px] font-mono ml-1" style={{ color: col }}>
            {delta >= 0 ? '▲' : '▼'}
          </span>
        )}
      </div>
    </div>
  )
}

export function RightPanel() {
  const macro = useStore(selectMacro)
  const regime = useStore(selectRegime)
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div className="w-10 bg-[#0e1117] border-l border-[#21262d] flex flex-col items-center pt-3 shrink-0">
        <button onClick={() => setCollapsed(false)}
          className="w-7 h-7 rounded hover:bg-[#161b22] flex items-center justify-center text-[#8b949e] hover:text-[#8b949e]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    )
  }

  const regCol = regime === 'RISK-ON' ? '#3fb950' : regime === 'RISK-OFF' ? '#f85149' : '#d29922'

  return (
    <aside className="w-48 bg-[#0e1117] border-l border-[#21262d] flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#21262d]">
        <span className="text-xs font-medium text-[#c9d1d9]">Market</span>
        <button onClick={() => setCollapsed(true)}
          className="w-5 h-5 rounded hover:bg-[#161b22] flex items-center justify-center text-[#8b949e] hover:text-[#8b949e]">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {/* Regime */}
        <div className="py-3 border-b border-[#21262d]">
          <div className="text-[10px] text-[#8b949e] uppercase tracking-wider mb-1">Regime</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: regCol }} />
            <span className="text-sm font-semibold" style={{ color: regCol }}>{regime}</span>
          </div>
        </div>

        {/* Quick Macro */}
        {macro && (
          <>
            <div className="py-2 border-b border-[#21262d]">
              <div className="text-[10px] text-[#8b949e] uppercase tracking-wider mb-1">Rates</div>
              <MacroItem label="US 10Y" value={macro.us10y ?? null} unit="%" />
              <MacroItem label="US 2Y" value={macro.us2y ?? null} unit="%" />
              <MacroItem label="Spread" value={macro.spread ?? null} unit="%" />
            </div>

            <div className="py-2 border-b border-[#21262d]">
              <div className="text-[10px] text-[#8b949e] uppercase tracking-wider mb-1">Volatility</div>
              <MacroItem label="VIX" value={macro.vix ?? null} />
              <MacroItem label="DXY" value={macro.dxy ?? null} />
            </div>

            <div className="py-2 border-b border-[#21262d]">
              <div className="text-[10px] text-[#8b949e] uppercase tracking-wider mb-1">Commodities</div>
              <MacroItem label="WTI" value={macro.wti ?? null} unit="$" />
              <MacroItem label="Brent" value={macro.brent ?? null} unit="$" />
            </div>

            <div className="py-2">
              <div className="text-[10px] text-[#8b949e] uppercase tracking-wider mb-1">Credit</div>
              <MacroItem label="HY OAS" value={macro.oas ?? null} unit="%" />
              <MacroItem label="HYG/LQD" value={macro.hyg_lqd ?? null} />
            </div>
          </>
        )}

        {!macro && (
          <div className="py-6 text-center text-[10px] text-[#484f58]">
            Macro data loading...
          </div>
        )}
      </div>
    </aside>
  )
}
