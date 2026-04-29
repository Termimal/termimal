// pages/COTPage.tsx — CFTC Commitment of Traders
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, selectCOT } from '@/store/useStore'
import { fetchCOT, fetchCOTDates, fetchPositioning } from '@/api/client'
import type { COTEntry } from '@/types'
import { RiskWarning } from '@/components/common/RiskWarning'
import { MethodologyExpander } from '@/components/common/MethodologyExpander'
import { methodologies } from '@/components/common/methodologies'
import { DataSource } from '@/components/common/DataSource'

// Mapping: COT contract name → positioning instrument ID
const COT_TO_POSITIONING: Record<string, string> = {
  'WTI Crude': 'wti', 'Gold': 'gold', 'Copper': 'copper',
  'S&P 500': 'spx', '10Y T-Note': 'us10y', 'Euro FX': 'eurusd', 'Japanese Yen': 'usdjpy',
}

// ─── Helpers ─────────────────────────────────────────────
function fmtK(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n < 0 ? '−' : '+') + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return (n < 0 ? '−' : '+') + (abs / 1_000).toFixed(0) + 'K'
  return (n >= 0 ? '+' : '−') + abs
}

function fmtNet(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n < 0 ? '−' : '') + (abs / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return (n < 0 ? '−' : '') + (abs / 1_000).toFixed(0) + 'K'
  return n.toLocaleString()
}

function sigColor(sig: string): string {
  if (!sig) return '#8b949e'
  if (sig.includes('BUY') || sig.includes('BULLISH')) return '#388bfd'
  if (sig.includes('SELL') || sig.includes('BEARISH')) return '#f85149'
  return '#d29922'
}

// ─── Net position bar ────────────────────────────────────
function NetBar({ value, max }: { value: number; max: number }) {
  if (!value || !max) return <div style={{ height: 5 }} />
  const pct = Math.min(100, (Math.abs(value) / max) * 100)
  const col = value >= 0 ? '#388bfd' : '#f85149'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 12, width: 80 }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {value < 0 && <div style={{ width: `${pct}%`, height: 4, background: col, borderRadius: 2 }} />}
      </div>
      <div style={{ width: 1, height: 10, background: '#21262d' }} />
      <div style={{ flex: 1 }}>
        {value >= 0 && <div style={{ width: `${pct}%`, height: 4, background: col, borderRadius: 2 }} />}
      </div>
    </div>
  )
}

// ─── Category row ────────────────────────────────────────
function CatRow({ cat, maxNet, idx = 0 }: { cat: any; maxNet: number; idx?: number }) {
  if (!cat) return null
  const netCol = (cat.net ?? 0) >= 0 ? '#388bfd' : '#f85149'
  const chgCol = (cat.chg ?? 0) >= 0 ? '#3fb950' : '#f85149'
  const chgLong = cat.chg_long ?? 0
  const chgShort = cat.chg_short ?? 0
  const clCol = chgLong >= 0 ? '#3fb950' : '#f85149'
  const csCol = chgShort >= 0 ? '#f85149' : '#3fb950' // short increase = bearish
  const zebra = idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent'
  return (
    <tr style={{ borderBottom: '1px solid #161b22', background: zebra, transition: 'background 80ms' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
      onMouseLeave={e => (e.currentTarget.style.background = zebra)}>
      <td style={{ padding: '6px 10px', fontSize: 12, color: '#8b949e' }}>{cat.name || '—'}</td>
      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
        <div style={{ fontSize: 12, fontFamily: "'SF Mono', Menlo, Consolas, monospace", color: '#c9d1d9' }}>{(cat.long ?? 0).toLocaleString()}</div>
        {chgLong !== 0 && <div style={{ fontSize: 10, fontFamily: "'SF Mono', Menlo, Consolas, monospace", color: clCol }}>{chgLong > 0 ? '+' : ''}{chgLong.toLocaleString()}</div>}
      </td>
      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
        <div style={{ fontSize: 12, fontFamily: "'SF Mono', Menlo, Consolas, monospace", color: '#c9d1d9' }}>{(cat.short ?? 0).toLocaleString()}</div>
        {chgShort !== 0 && <div style={{ fontSize: 10, fontFamily: "'SF Mono', Menlo, Consolas, monospace", color: csCol }}>{chgShort > 0 ? '+' : ''}{chgShort.toLocaleString()}</div>}
      </td>
      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'right', fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontWeight: 600, color: netCol }}>{fmtNet(cat.net)}</td>
      <td style={{ padding: '6px 10px', fontSize: 12, textAlign: 'right', fontFamily: "'SF Mono', Menlo, Consolas, monospace", color: chgCol }}>{fmtK(cat.chg)}</td>
      <td style={{ padding: '6px 10px' }}><NetBar value={cat.net ?? 0} max={maxNet} /></td>
    </tr>
  )
}

// ─── Contract card ───────────────────────────────────────
// ── COT Positioning Impact Estimate ────────────────────────
function CotImpactEstimate({ row, posData }: { row: any; posData: any }) {
  const mono = "'SF Mono', Menlo, Consolas, monospace"

  const am = row.am ?? 0        // Asset Manager net position
  const amc = row.amc ?? 0      // AM net WoW change
  const lm = row.lm ?? 0        // Leveraged Money net
  const lmc = row.lmc ?? 0      // LM net WoW change
  const oi = row.oi ?? 1        // Open interest
  const pctile = posData?.percentile
  const isFinancial = row.report_type === 'tff'

  // ── LEVEL: Where are managers positioned? ──
  const levelBias = am > 0 ? 'Long' : am < 0 ? 'Short' : 'Flat'

  // ── CHANGE: What are managers DOING right now? ──
  // This matters more for short-term expected impact
  const changeBias = amc > 0 ? 'Adding longs' : amc < 0 ? 'Reducing / shorting' : 'Flat'
  const changeDir = amc > 0 ? 'Bullish' : amc < 0 ? 'Bearish' : 'Neutral'

  // ── Combined signal ──
  // Level long + change positive = strong bullish
  // Level long + change negative = position unwinding (bearish pressure)
  // Level short + change negative = adding shorts (bearish)
  // Level short + change positive = short covering (bullish pressure)
  let signal: string, signalCol: string
  if (am > 0 && amc > 0)      { signal = 'Bullish — adding to longs';       signalCol = '#3fb950' }
  else if (am > 0 && amc < 0)  { signal = 'Caution — unwinding longs';      signalCol = '#d29922' }
  else if (am < 0 && amc < 0)  { signal = 'Bearish — adding to shorts';     signalCol = '#f85149' }
  else if (am < 0 && amc > 0)  { signal = 'Covering — reducing shorts';     signalCol = '#388bfd' }
  else                         { signal = 'Neutral — no clear direction';    signalCol = '#8b949e' }

  // ── Expected move: driven by CHANGE magnitude, not level ──
  const changePct = oi > 0 ? Math.abs(amc) / oi * 100 : 0  // % of OI changed this week
  const basePct = isFinancial ? 0.5 : 1.0  // financial assets move less
  const changeScale = Math.min(changePct * 3, 4.0) // scale up, cap at 4%
  const crowdMult = pctile != null ? (pctile >= 85 || pctile <= 15 ? 1.3 : 1.0) : 1.0

  const expectedMove = Math.max(0.3, (basePct + changeScale) * crowdMult)
  const moveLo = (expectedMove * 0.4).toFixed(1)
  const moveHi = expectedMove.toFixed(1)

  // Direction of expected move follows the CHANGE, not the level
  const moveDir = amc > 0 ? '+' : amc < 0 ? '−' : '±'
  const scenarioText = amc !== 0
    ? `${moveDir}${moveLo}% to ${moveDir}${moveHi}%`
    : `±${moveLo}% to ±${moveHi}%`

  // ── Crowding pressure ──
  let crowding = 'Neutral'
  let crowdCol = '#8b949e'
  if (pctile != null) {
    if (pctile >= 90)      { crowding = 'Extreme long';    crowdCol = '#f85149' }
    else if (pctile >= 75) { crowding = 'Elevated long';   crowdCol = '#d29922' }
    else if (pctile <= 10) { crowding = 'Extreme short';   crowdCol = '#3fb950' }
    else if (pctile <= 25) { crowding = 'Elevated short';  crowdCol = '#388bfd' }
  }

  return (
    <div style={{ padding: '8px 14px 12px', borderTop: '1px solid #161b22', background: '#0e1117' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: '#484f58', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          POSITIONING-IMPLIED IMPACT
        </span>
        <span style={{ fontSize: 7, color: '#d29922', background: '#d2992210', border: '1px solid #d2992220', padding: '1px 5px' }}>
          Model estimate
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <div>
          <div style={{ fontSize: 8, color: '#30363d', marginBottom: 2 }}>SIGNAL</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: signalCol }}>{signal}</div>
          <div style={{ fontSize: 8, color: '#484f58', marginTop: 2 }}>
            Level: <span style={{ color: am > 0 ? '#3fb950' : am < 0 ? '#f85149' : '#8b949e' }}>{am > 0 ? '+' : ''}{(am/1000).toFixed(0)}k</span>
            {' '}WoW: <span style={{ color: amc > 0 ? '#3fb950' : amc < 0 ? '#f85149' : '#8b949e' }}>{amc > 0 ? '+' : ''}{(amc/1000).toFixed(0)}k</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#30363d', marginBottom: 2 }}>EXPECTED MOVE</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: signalCol, fontFamily: mono }}>{scenarioText}</div>
          <div style={{ fontSize: 8, color: '#484f58' }}>WoW Δ = {changePct.toFixed(1)}% of OI</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#30363d', marginBottom: 2 }}>CROWDING</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: crowdCol, fontFamily: mono }}>{crowding}</div>
          {pctile != null && <div style={{ fontSize: 8, color: '#484f58' }}>{pctile}th percentile</div>}
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#30363d', marginBottom: 2 }}>FLOW CONTEXT</div>
          <div style={{ fontSize: 10, color: '#8b949e' }}>
            {am > 0 && amc > 0 && 'Smart money adding conviction'}
            {am > 0 && amc < 0 && 'Smart money taking profit / reducing risk'}
            {am < 0 && amc < 0 && 'Smart money increasing bearish bets'}
            {am < 0 && amc > 0 && 'Short squeeze / bearish unwind underway'}
            {am === 0 || amc === 0 ? 'No clear institutional flow signal' : ''}
          </div>
          <div style={{ fontSize: 8, color: '#30363d' }}>next 2-4 weeks</div>
        </div>
      </div>
    </div>
  )
}

function ContractCard({ row, isExpanded, onToggle, positioningData, onOpenPositioning }: { row: COTEntry; isExpanded: boolean; onToggle: () => void; positioningData?: any; onOpenPositioning?: (id: string) => void }) {
  const cats = row.categories ? Object.values(row.categories) : []
  const maxNet = cats.length > 0 ? Math.max(...cats.map(c => Math.abs(c?.net ?? 0)), 1) : 1
  const sc = sigColor(row.signal)
  const isTff = row.report_type === 'tff'
  const posId = COT_TO_POSITIONING[row.n]
  const posData = posId && positioningData ? positioningData[posId] : null

  return (
    <div style={{ borderBottom: '1px solid #21262d', marginBottom: 0 }}>
      {/* Header */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#c9d1d9' }}>{row.n}</span>
          <span style={{ fontSize: 9, padding: '1px 5px', color: isTff ? '#388bfd' : '#d29922', background: isTff ? '#388bfd15' : '#d2992215' }}>
            {isTff ? 'FINANCIAL' : 'COMMODITY'}
          </span>
          {posData && (
            <span onClick={e => { e.stopPropagation(); onOpenPositioning?.(posId) }}
              style={{ fontSize: 9, color: posData.percentile >= 90 ? '#f85149' : posData.percentile >= 75 ? '#d29922' : '#484f58', cursor: 'pointer',
                padding: '1px 6px', border: '1px solid #21262d', background: '#161b22' }}
              title="Open Positioning detail">
              Positioning: {posData.percentile}th · {posData.direction}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#8b949e' }}>{isTff ? 'Asset Mgr' : 'Managed $'}</div>
            <div style={{ fontSize: 12, fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontWeight: 600, color: (row.am ?? 0) >= 0 ? '#388bfd' : '#f85149' }}>{fmtNet(row.am)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#8b949e' }}>{isTff ? 'Leveraged' : 'Producer'}</div>
            <div style={{ fontSize: 12, fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontWeight: 600, color: (row.lm ?? 0) >= 0 ? '#388bfd' : '#f85149' }}>{fmtNet(row.lm)}</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: sc }}>{row.signal?.includes('BUY') || row.signal?.includes('BULLISH') ? '▲' : row.signal?.includes('SELL') || row.signal?.includes('BEARISH') ? '▼' : '—'}</span>
          <span style={{ color: '#8b949e', fontSize: 14, transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
        </div>
      </div>

      {/* Expanded categories */}
      {isExpanded && cats.length > 0 && (
        <div style={{ borderTop: '1px solid #21262d' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d' }}>
                {['Category', 'Long (WoW Δ)', 'Short (WoW Δ)', 'Net', 'Net Δ', 'Position'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Category' ? 'left' : 'right', fontSize: 9, color: '#6e7681', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cats.map((cat, i) => <CatRow key={i} cat={cat} maxNet={maxNet} idx={i} />)}
            </tbody>
          </table>
          {row.oi != null && row.oi > 0 && (
            <div style={{ padding: '6px 14px 10px', fontSize: 11, color: '#8b949e' }}>
              Open Interest: <span style={{ color: '#c9d1d9', fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}>{row.oi.toLocaleString()}</span>
            </div>
          )}

          {/* ── Estimated Positioning Impact ── */}
          <CotImpactEstimate row={row} posData={posData} />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export function COTPage() {
  const storeCot = useStore(selectCOT)
  const apiOnline = useStore(s => s.apiOnline)
  const navigate = useNavigate()

  const [cotData, setCotData] = useState<COTEntry[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [availDates, setAvailDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set([0, 1]))
  const [filter, setFilter] = useState<string>('all')
  const [posData, setPosData] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchCOTDates().then(d => { if (d && d.length) setAvailDates(d) }).catch(() => {})
    // Fetch positioning data for cross-link badges
    fetchPositioning().then((resp: any) => {
      if (resp?.data) {
        const map: Record<string, any> = {}
        for (const inst of resp.data) map[inst.id] = inst
        setPosData(map)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedDate) {
      setLoading(true)
      fetchCOT(selectedDate)
        .then(d => { if (d && d.length) setCotData(d) })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else if (storeCot && storeCot.length) {
      setCotData(storeCot)
    }
  }, [selectedDate, storeCot])

  const toggleExpand = useCallback((idx: number) => {
    setExpandedIdx(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }, [])

  const filtered = cotData
    .filter(c => !c.error) // filter out error entries
    .filter(c => {
      if (filter === 'tff') return c.report_type === 'tff'
      if (filter === 'disagg') return c.report_type === 'disagg'
      return true
    })

  const errors = cotData.filter(c => c.error)
  const reportDate = (cotData.length > 0 && cotData[0]?.date) ? cotData[0].date : (selectedDate || '—')

  const currentDateIdx = availDates.indexOf(selectedDate || reportDate)
  const goWeek = (dir: number) => {
    const newIdx = currentDateIdx + dir
    if (newIdx >= 0 && newIdx < availDates.length) setSelectedDate(availDates[newIdx])
  }

  return (
    <div style={{ padding: 16, minHeight: '100%' }}>
      {/* Trust + methodology row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <RiskWarning variant="signal" compact />
        <MethodologyExpander title="How COT positioning is computed" {...methodologies.cot} />
      </div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.02em' }}>COT REPORT</span>
          <span style={{ fontSize: 10, color: apiOnline ? '#3fb950' : '#d29922' }}>
            {apiOnline ? '● LIVE' : '● OFFLINE'}
          </span>
          <span style={{ fontSize: 11, color: '#8b949e' }}>CFTC.gov · Published Friday</span>
          <DataSource source="CFTC weekly report" updated={reportDate} quality="HIGH" />
        </div>

        {/* Date picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => goWeek(1)} disabled={currentDateIdx >= availDates.length - 1}
            style={{ width: 28, height: 28, borderRadius: 2, border: '1px solid #21262d', background: '#161b22', color: '#8b949e', cursor: 'pointer', fontSize: 14 }}>←</button>
          <select value={selectedDate || reportDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', fontSize: 12, borderRadius: 2, padding: '4px 8px', cursor: 'pointer', outline: 'none' }}>
            {!selectedDate && <option value="">Latest ({reportDate})</option>}
            {availDates.slice(0, 200).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => goWeek(-1)} disabled={currentDateIdx <= 0}
            style={{ width: 28, height: 28, borderRadius: 2, border: '1px solid #21262d', background: '#161b22', color: '#8b949e', cursor: 'pointer', fontSize: 14 }}>→</button>
          {selectedDate && (
            <button onClick={() => setSelectedDate('')}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 2, border: '1px solid #388bfd33', background: '#388bfd15', color: '#388bfd', cursor: 'pointer' }}>
              Latest
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 12, alignItems: 'center' }}>
        {[['all', 'All Contracts'], ['tff', 'Financial Futures'], ['disagg', 'Commodities']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              fontSize: 11, padding: '6px 14px', border: 'none', cursor: 'pointer',
              background: filter === key ? 'rgba(56,139,253,0.12)' : 'transparent',
              color: filter === key ? '#58a6ff' : '#8b949e',
              fontWeight: filter === key ? 600 : 400,
              borderBottom: `2px solid ${filter === key ? '#388bfd' : 'transparent'}`,
              letterSpacing: 0.3,
              transition: 'all 100ms ease-out',
            }}
            onMouseEnter={e => { if (filter !== key) { e.currentTarget.style.color = '#c9d1d9'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
            onMouseLeave={e => { if (filter !== key) { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.background = 'transparent' } }}>
            {label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#484f58', fontFamily: "'SF Mono', Menlo, monospace", letterSpacing: 0.4 }}>DATE: {reportDate}</span>
      </div>

      {/* Signal legend */}
      <div style={{ display: 'flex', gap: 16, padding: '6px 0', marginBottom: 8, fontSize: 11, color: '#8b949e' }}>
        <span><span style={{ color: '#388bfd', fontWeight: 500, fontSize: 13 }}>▲</span> <span style={{ fontSize: 11 }}>Smart $ long, Spec short</span></span>
        <span><span style={{ color: '#f85149', fontWeight: 500, fontSize: 13 }}>▼</span> <span style={{ fontSize: 11 }}>Smart $ short, Spec long</span></span>
        <span><span style={{ color: '#d29922', fontWeight: 500, fontSize: 13 }}>—</span> <span style={{ fontSize: 11 }}>Conflicting / neutral</span></span>
      </div>

      {/* Loading */}
      {loading && <div style={{ textAlign: 'center', color: '#8b949e', padding: 20, fontSize: 12 }}>Loading COT data from CFTC.gov...</div>}

      {/* No data / error message */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#8b949e' }}>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            {apiOnline ? 'No COT data available' : 'Backend offline — start backend for COT data'}
          </div>
          {errors.length > 0 && (
            <div style={{ fontSize: 11, color: '#f85149', marginBottom: 12 }}>
              {errors.map((e, i) => <div key={i}>{e.n ?? 'Unknown'}: {e.error}</div>)}
            </div>
          )}
          {apiOnline && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => {
                setLoading(true)
                fetch('/api/cot/refresh').then(r => r.json()).then(j => {
                  if (j?.data?.length) setCotData(j.data)
                  setLoading(false)
                }).catch(() => setLoading(false))
              }} style={{ fontSize: 11, padding: '6px 14px', background: '#388bfd', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Retry (force refresh)
              </button>
              <button onClick={() => {
                window.open('/api/cot/debug', '_blank')
              }} style={{ fontSize: 11, padding: '6px 14px', background: 'transparent', color: '#484f58', border: '1px solid #21262d', cursor: 'pointer' }}>
                Debug API
              </button>
            </div>
          )}
          <div style={{ fontSize: 10, color: '#484f58', marginTop: 12 }}>
            If COT stays empty: delete backend/cache/termimal.db and restart.<br/>
            Check terminal logs for "COT:" messages.
          </div>
        </div>
      )}

      {/* Contract cards */}
      {filtered.map((row, i) => (
        <ContractCard key={row.n + i} row={row} isExpanded={expandedIdx.has(i)} onToggle={() => toggleExpand(i)}
          positioningData={posData}
          onOpenPositioning={(id) => {
            // Store target for PositioningPage to read
            (window as any).__ftPositioningTarget = id
            navigate('/macro')
            // Give Macro page time to mount, then trigger positioning tab
            setTimeout(() => window.dispatchEvent(new CustomEvent('ft-open-positioning', { detail: id })), 50)
          }} />
      ))}

      {/* Footer */}
      {filtered.length > 0 && (
        <div style={{ fontSize: 10, color: '#484f58', marginTop: 12 }}>
          Source: CFTC Public Reporting API · TFF + Disaggregated · {filtered.length} contracts
        </div>
      )}
    </div>
  )
}
