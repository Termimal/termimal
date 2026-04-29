// pages/PositioningPage.tsx — Positioning Pressure
// COT-derived speculative positioning analysis · 7 major futures markets
// Weekly update · Not predictive · Not a trading signal
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPositioning, fetchPositioningDetail } from '@/api/client'
import { TvLineChart } from '@/components/charts/TvLineChart'
import { onActivate } from '@/lib/a11y'

const mono = "'SF Mono', Menlo, Consolas, monospace"

// Positioning ID → COT contract name for cross-navigation
const POSITIONING_TO_COT: Record<string, string> = {
  wti: 'WTI Crude', gold: 'Gold', copper: 'Copper',
  spx: 'S&P 500', us10y: '10Y T-Note', eurusd: 'Euro FX', usdjpy: 'Japanese Yen',
}

// ─── Types ───────────────────────────────────────────────
interface InstrumentOverview {
  id: string; name: string; category: string; cotContract: string
  percentile: number; zScore: number; direction: string
  driverCategory: string; driverNet: number
  oiTrend: string; oiChange4w: number
  weeksAtExtreme: number; weeklyChange: number
  latestCotDate: string; sparkline: number[]
}

interface TraderCategory {
  name: string; net: number; long: number; short: number
  change4w: number; pctOI: number; isDriver: boolean
}

interface InstrumentDetail extends InstrumentOverview {
  percentileHistory: number[]; percentileDates: string[]
  netPositioning: number[]; netDates: string[]
  priceHistory: number[]; priceDates: string[]
  traderCategories: TraderCategory[]
  oiCurrent: number; oi52wRange: [number, number]
  longestRecentStreak: number
  historicalBehavior: string
  coverageLimitation: string; methodologyLabel: string
}

// ─── Helpers ─────────────────────────────────────────────
function fmtContracts(n: number): string {
  const a = Math.abs(n)
  if (a >= 1_000_000) return (n < 0 ? '-' : '') + (a / 1_000_000).toFixed(1) + 'M'
  if (a >= 1_000) return (n < 0 ? '-' : '') + (a / 1_000).toFixed(0) + 'K'
  return n.toLocaleString()
}

function DeltaChip({ val }: { val: number }) {
  if (val === 0) return <span style={{ fontSize: 10, color: '#30363d', fontFamily: mono }}>—</span>
  const col = val > 0 ? '#3fb950' : '#f85149'
  return <span style={{ fontSize: 10, color: col, fontFamily: mono }}>{val > 0 ? '+' : ''}{val}</span>
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span style={{ color: '#21262d', fontSize: 8, marginLeft: 2 }}>&#8597;</span>
  return <span style={{ color: '#388bfd', fontSize: 8, marginLeft: 2 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

function PressureBar({ percentile }: { percentile: number }) {
  const col = percentile >= 90 ? '#f85149' : percentile >= 75 ? '#d29922' : '#388bfd'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 70, height: 6, background: '#161b22', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, percentile)}%`, height: '100%', background: col, borderRadius: 1 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: mono, color: '#c9d1d9', minWidth: 30 }}>{percentile}th</span>
    </div>
  )
}

function DirectionLabel({ direction }: { direction: string }) {
  const col = direction === 'Long crowded' ? '#d29922' : direction === 'Short crowded' ? '#388bfd' : '#484f58'
  return <span style={{ fontSize: 9, color: col, fontFamily: mono }}>{direction}</span>
}

function getMomentumLabel(history: number[]): { label: string; color: string } {
  if (history.length < 6) return { label: 'Insufficient data', color: '#30363d' }
  const recent = history.slice(-4)
  const older = history.slice(-8, -4)
  if (older.length === 0) return { label: 'Insufficient data', color: '#30363d' }
  const rA = recent.reduce((a, b) => a + b, 0) / recent.length
  const oA = older.reduce((a, b) => a + b, 0) / older.length
  const d = rA - oA
  if (d > 2) return { label: 'Rising risk', color: '#d29922' }
  if (d < -2) return { label: 'Falling risk', color: '#388bfd' }
  return { label: 'Stable outlook', color: '#484f58' }
}

// ═══ DETAIL VIEW ═════════════════════════════════════════
function PositioningDetail({ instrumentId, onBack }: { instrumentId: string; onBack: () => void }) {
  const [data, setData] = useState<InstrumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    fetchPositioningDetail(instrumentId).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [instrumentId])

  if (loading) return (
    <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: 12 }}>
      Loading positioning data...
    </div>
  )
  if (!data) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#484f58' }}>
      <span role="button" tabIndex={0} onClick={onBack} onKeyDown={onActivate(onBack)} style={{ fontSize: 12, color: '#388bfd', cursor: 'pointer', display: 'block', marginBottom: 20 }}>← Positioning Pressure</span>
      Unable to load detailed data for this instrument.
    </div>
  )

  const d7col = data.weeklyChange > 0 ? '#3fb950' : data.weeklyChange < 0 ? '#f85149' : '#484f58'
  const { label: momLabel, color: momCol } = getMomentumLabel(data.sparkline)
  const barCol = data.percentile >= 90 ? '#f85149' : data.percentile >= 75 ? '#d29922' : '#388bfd'

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Back nav */}
      <span role="button" tabIndex={0} onClick={onBack} onKeyDown={onActivate(onBack)} style={{ fontSize: 12, color: '#388bfd', cursor: 'pointer' }}>← Positioning Pressure</span>

      {/* Header */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#c9d1d9', lineHeight: 1.3 }}>{data.name}</div>
          <div style={{ marginTop: 5, fontSize: 10, color: '#484f58', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#8b949e' }}>{data.category}</span>
            <span>·</span><span>{data.cotContract}</span>
            <span>·</span><span>Last COT: {data.latestCotDate}</span>
            <span>·</span><span>Weekly</span>
            <span>·</span><span>Futures only</span>
          </div>
          <div style={{ marginTop: 5, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 8, color: '#484f58', border: '1px solid #21262d', padding: '0 5px' }}>COT-DERIVED</span>
            <DirectionLabel direction={data.direction} />
          </div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 100 }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: '#c9d1d9', fontFamily: mono, lineHeight: 1 }}>{data.percentile}<span style={{ fontSize: 13, color: '#8b949e' }}>th</span></div>
          <div style={{ fontSize: 11, color: d7col, fontFamily: mono, marginTop: 4 }}>{data.weeklyChange > 0 ? '+' : ''}{data.weeklyChange} <span style={{ fontSize: 9, color: '#30363d' }}>from prior week</span></div>
          <div style={{ fontSize: 9, color: momCol, marginTop: 2 }}>{momLabel}</div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 1, marginTop: 16, marginBottom: 20, background: '#161b22' }}>
        {[
          { l: 'Percentile', v: `${data.percentile}th`, c: '#c9d1d9' },
          { l: 'Z-Score', v: `${data.zScore > 0 ? '+' : ''}${data.zScore}`, c: '#c9d1d9' },
          { l: 'Direction', v: data.direction, c: data.direction === 'Long crowded' ? '#d29922' : data.direction === 'Short crowded' ? '#388bfd' : '#484f58' },
          { l: 'Driver', v: data.driverCategory, c: '#8b949e' },
          { l: 'OI Trend', v: data.oiTrend, c: '#8b949e' },
          { l: 'Wks at Extreme', v: data.weeksAtExtreme > 0 ? `${data.weeksAtExtreme}` : '—', c: '#8b949e' },
        ].map(k => (
          <div key={k.l} style={{ flex: 1, padding: '8px 10px', background: '#0e1117' }}>
            <div style={{ fontSize: 8, color: '#30363d', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k.l}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: k.c, fontFamily: mono }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Primary chart: Positioning Percentile History */}
      <div style={{ fontSize: 9, color: '#484f58', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Positioning Percentile History <span style={{ color: '#30363d', textTransform: 'none', letterSpacing: 'normal' }}>— weekly · COT-derived · vs 3-year range</span>
      </div>
      {data.percentileHistory && data.percentileHistory.length > 2 ? (
        <TvLineChart title="" sub="" unit="%" dec={0} height={320} fill
          lines={[{ label: 'Percentile', color: '#388bfd', data: data.percentileHistory }]}
          refs={[
            { val: 90, color: '#f85149', label: 'Extreme (90th)', dash: true },
            { val: 75, color: '#d29922', label: 'Extended (75th)', dash: true },
            { val: 50, color: '#21262d', label: 'Median', dash: true },
            { val: 25, color: '#21262d', label: 'Neutral (25th)', dash: true },
          ]} />
      ) : (
        <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58' }}>No percentile history available</div>
      )}

      {/* Secondary: Price vs Net Positioning */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 9, color: '#484f58', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Price vs Net Positioning <span style={{ color: '#30363d', textTransform: 'none', letterSpacing: 'normal' }}>— divergence may indicate fragile trends</span>
        </div>
        {data.priceHistory && data.priceHistory.length > 2 ? (
          <TvLineChart title="" sub="" unit="" dec={2} height={160} fill={false}
            lines={[{ label: 'Price', color: '#8b949e', data: data.priceHistory }]}
            refs={[]} />
        ) : (
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: 10 }}>Price data unavailable</div>
        )}
        {data.netPositioning && data.netPositioning.length > 2 ? (
          <div style={{ marginTop: 4 }}>
            <TvLineChart title="" sub="" unit=" contracts" dec={0} height={120} fill
              lines={[{ label: 'Net Speculative', color: '#388bfd', data: data.netPositioning }]}
              refs={[{ val: 0, color: '#21262d', label: 'Zero', dash: true }]} />
          </div>
        ) : (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: 10 }}>Net positioning data unavailable</div>
        )}
        <div style={{ fontSize: 9, color: '#30363d', fontStyle: 'italic', marginTop: 4 }}>Price and positioning may diverge for extended periods. Divergence alone is not a signal.</div>
      </div>

      {/* Trader Category Breakdown */}
      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #21262d' }}>
        <div style={{ fontSize: 9, color: '#484f58', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Trader Category Breakdown</div>
        {data.traderCategories && data.traderCategories.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d' }}>
                {['Category', 'Net Position', '4-Week Change', '% of OI'].map(h => (
                  <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Category' ? 'left' : 'right', fontSize: 9, color: '#484f58', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.traderCategories.map(tc => (
                <tr key={tc.name} style={{ borderBottom: '1px solid #161b22', borderLeft: tc.isDriver ? '2px solid #388bfd' : '2px solid transparent' }}>
                  <td style={{ padding: '6px 8px', color: tc.isDriver ? '#c9d1d9' : '#8b949e', fontWeight: tc.isDriver ? 500 : 400 }}>{tc.name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: mono, color: tc.net >= 0 ? '#c9d1d9' : '#c9d1d9' }}>{fmtContracts(tc.net)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}><DeltaChip val={tc.change4w} /></td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: mono, color: '#484f58' }}>{tc.pctOI}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 10, color: '#30363d' }}>Trader category data unavailable for this report.</div>
        )}
      </div>

      {/* Context section */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #161b22', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: '#484f58', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Open Interest</div>
          <div style={{ fontSize: 10, color: '#8b949e', lineHeight: 1.6 }}>
            <div>Current: <span style={{ fontFamily: mono, color: '#c9d1d9' }}>{data.oiCurrent?.toLocaleString() ?? '—'}</span></div>
            <div>4-week change: <span style={{ fontFamily: mono, color: data.oiChange4w >= 0 ? '#3fb950' : '#f85149' }}>{data.oiChange4w > 0 ? '+' : ''}{data.oiChange4w}%</span></div>
            <div>52-week range: <span style={{ fontFamily: mono, color: '#484f58' }}>{data.oi52wRange?.[0]?.toLocaleString()} — {data.oi52wRange?.[1]?.toLocaleString()}</span></div>
            <div>Trend: <span style={{ fontFamily: mono }}>{data.oiTrend}</span></div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#484f58', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Time at Extreme</div>
          <div style={{ fontSize: 10, color: '#8b949e', lineHeight: 1.6 }}>
            {data.weeksAtExtreme > 0
              ? <div>Current streak: <span style={{ fontFamily: mono, color: '#c9d1d9' }}>{data.weeksAtExtreme} consecutive weeks</span> above 80th percentile</div>
              : <div>Not currently at extreme levels.</div>
            }
            <div style={{ marginTop: 4 }}>Longest in past year: <span style={{ fontFamily: mono, color: '#484f58' }}>{data.longestRecentStreak} weeks</span></div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#484f58', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Historical Behavior</div>
          <div style={{ fontSize: 10, color: '#8b949e', lineHeight: 1.6 }}>{data.historicalBehavior}</div>
        </div>
      </div>

      {/* Data & Methodology */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #161b22' }}>
        <div style={{ fontSize: 9, color: '#484f58', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Data & Methodology</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { l: 'Source', v: 'CFTC Commitment of Traders' },
            { l: 'Freshness', v: 'Weekly (Tue snapshot, Fri release)' },
            { l: 'Method', v: '3-year rolling percentile of net speculative positioning' },
            { l: 'Lag', v: '3 business days (CFTC reporting)' },
            { l: 'Coverage', v: data.coverageLimitation || 'Regulated futures only' },
          ].map(f => (
            <div key={f.l}>
              <div style={{ fontSize: 8, color: '#21262d', marginBottom: 2, textTransform: 'uppercase' }}>{f.l}</div>
              <div style={{ fontSize: 10, color: '#8b949e', lineHeight: 1.4 }}>{f.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 9, color: '#30363d', fontStyle: 'italic' }}>
          Positioning can remain at extreme levels for extended periods during strong trends. Extreme positioning is a risk condition, not a timing signal. This module does not predict reversals or generate trade signals.
        </div>
      </div>

      {/* COT cross-navigation */}
      {POSITIONING_TO_COT[instrumentId] && (
        <div style={{ marginTop: 12 }}>
          <span role="button" tabIndex={0} onClick={() => navigate('/cot')} onKeyDown={onActivate(() => navigate('/cot'))} style={{ fontSize: 10, color: '#388bfd', cursor: 'pointer' }}>
            View raw COT data for {POSITIONING_TO_COT[instrumentId]} →
          </span>
        </div>
      )}
    </div>
  )
}

// ═══ OVERVIEW ════════════════════════════════════════════
export function PositioningPage() {
  const [data, setData] = useState<InstrumentOverview[]>([])
  const [detail, setDetail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<'percentile' | 'name' | 'zScore' | 'weeklyChange'>('percentile')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const scrollRef = React.useRef(0)

  useEffect(() => {
    fetchPositioning().then((resp: any) => {
      if (resp && resp.data && resp.data.length > 0) {
        setData(resp.data)
        setError(null)
        // Auto-open detail if navigated from COT page
        const target = (window as any).__ftPositioningTarget
        if (target) {
          delete (window as any).__ftPositioningTarget
          setDetail(target)
        }
      } else if (resp && resp.errors && resp.errors.length > 0) {
        const reasons = resp.errors.map((e: any) => `${e.id}: ${e.reason}`).join(' · ')
        setError(`Positioning data unavailable — ${reasons}`)
      } else if (resp && resp.data && resp.data.length === 0) {
        setError('Positioning data unavailable — CFTC API may be down. Check backend logs or visit /api/positioning/debug')
      } else {
        setError('Positioning data unavailable — check backend connection')
      }
      setLoading(false)
    }).catch(() => { setError('Backend offline — start backend for positioning data'); setLoading(false) })
  }, [])

  const openDetail = (id: string) => {
    const main = document.querySelector('main')
    if (main) scrollRef.current = main.scrollTop
    setDetail(id)
    requestAnimationFrame(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 0 })
  }
  const closeDetail = () => {
    setDetail(null)
    requestAnimationFrame(() => { const m = document.querySelector('main'); if (m) m.scrollTop = scrollRef.current })
  }
  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  if (detail) return <PositioningDetail instrumentId={detail} onBack={closeDetail} />

  const sorted = [...data].sort((a, b) => {
    const m = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'name') return a.name.localeCompare(b.name) * m
    return ((b[sortKey] ?? 0) - (a[sortKey] ?? 0)) * m
  })

  const latestDate = data[0]?.latestCotDate ?? '—'
  const isStale = (() => {
    if (!latestDate || latestDate === '—') return false
    const d = new Date(latestDate)
    const now = new Date()
    return (now.getTime() - d.getTime()) > 10 * 86400 * 1000
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#8b949e', fontWeight: 500 }}>POSITIONING PRESSURE</span>
          <span style={{ fontSize: 10, color: '#30363d' }}>{sorted.length} markets</span>
          <span style={{ fontSize: 8, color: '#484f58', border: '1px solid #21262d', padding: '0 5px' }}>COT-DERIVED · FUTURES ONLY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isStale && <span style={{ fontSize: 9, color: '#d29922' }}>⚠ Data may be stale</span>}
          <span style={{ fontSize: 9, color: '#30363d' }}>Last COT: {latestDate} · Updated weekly after CFTC release</span>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <div style={{ textAlign: 'center', color: '#484f58', padding: 40, fontSize: 12 }}>Loading positioning data...</div>}
      {error && !loading && <div style={{ textAlign: 'center', color: '#484f58', padding: 40, fontSize: 13 }}>{error}</div>}

      {/* Table */}
      {!loading && !error && sorted.length > 0 && (
        <div style={{ background: '#0e1117', border: '1px solid #21262d' }}>
          <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d' }}>
                <th onClick={() => toggleSort('name')} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, color: '#484f58', fontWeight: 500, cursor: 'pointer' }}>Instrument <SortIcon active={sortKey === 'name'} dir={sortDir} /></th>
                <th style={{ padding: '7px 8px', textAlign: 'left', fontSize: 9, color: '#484f58', fontWeight: 500, width: 100 }}>Direction</th>
                <th onClick={() => toggleSort('percentile')} style={{ padding: '7px 8px', textAlign: 'left', fontSize: 9, color: '#484f58', fontWeight: 500, width: 130, cursor: 'pointer' }}>Pressure <SortIcon active={sortKey === 'percentile'} dir={sortDir} /></th>
                <th onClick={() => toggleSort('zScore')} style={{ padding: '7px 8px', textAlign: 'right', fontSize: 9, color: '#484f58', fontWeight: 500, width: 55, cursor: 'pointer' }}>Z-Score <SortIcon active={sortKey === 'zScore'} dir={sortDir} /></th>
                <th style={{ padding: '7px 8px', textAlign: 'left', fontSize: 9, color: '#484f58', fontWeight: 500, width: 80 }}>Driver</th>
                <th style={{ padding: '7px 8px', textAlign: 'center', fontSize: 9, color: '#484f58', fontWeight: 500, width: 70 }}>OI Trend</th>
                <th style={{ padding: '7px 8px', textAlign: 'center', fontSize: 9, color: '#484f58', fontWeight: 500, width: 50 }}>Wks Ext</th>
                <th onClick={() => toggleSort('weeklyChange')} style={{ padding: '7px 8px', textAlign: 'right', fontSize: 9, color: '#484f58', fontWeight: 500, width: 50, cursor: 'pointer' }}>Δ Wk <SortIcon active={sortKey === 'weeklyChange'} dir={sortDir} /></th>
                <th style={{ padding: '7px 8px', textAlign: 'center', fontSize: 9, color: '#484f58', fontWeight: 500, width: 55 }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(inst => {
                const spark = inst.sparkline ?? []
                const mn = Math.min(...spark), mx = Math.max(...spark), range = mx - mn || 1
                const sW = 48, sH = 14
                const pts = spark.map((v, i) => `${(i / Math.max(1, spark.length - 1)) * sW},${sH - ((v - mn) / range) * sH}`).join(' ')
                return (
                  <tr key={inst.id} onClick={() => openDetail(inst.id)}
                    style={{ borderBottom: '1px solid #161b22', cursor: 'pointer', transition: 'background 0.08s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#131720')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ color: '#c9d1d9', fontWeight: 500, fontSize: 11 }}>{inst.name}</span>
                      <span style={{ fontSize: 8, color: '#30363d', marginLeft: 6 }}>{inst.category}</span>
                    </td>
                    <td style={{ padding: '8px 8px' }}><DirectionLabel direction={inst.direction} /></td>
                    <td style={{ padding: '8px 8px' }}><PressureBar percentile={inst.percentile} /></td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: mono, color: '#8b949e', fontSize: 10 }}>{inst.zScore > 0 ? '+' : ''}{inst.zScore}</td>
                    <td style={{ padding: '8px 8px', fontSize: 9, color: '#8b949e' }}>{inst.driverCategory}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', fontSize: 9, fontFamily: mono, color: '#484f58' }}>
                      {inst.oiTrend === 'Expanding' ? '↑' : inst.oiTrend === 'Contracting' ? '↓' : '—'} {inst.oiTrend}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', fontFamily: mono, color: inst.weeksAtExtreme > 0 ? '#d29922' : '#30363d', fontSize: 10 }}>
                      {inst.weeksAtExtreme > 0 ? inst.weeksAtExtreme : '—'}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}><DeltaChip val={inst.weeklyChange} /></td>
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      <svg width={sW} height={sH} style={{ display: 'block', margin: '0 auto' }}>
                        <polyline fill="none" stroke="#388bfd" strokeWidth={1} opacity={0.4} points={pts} />
                      </svg>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!loading && sorted.length > 0 && (
        <div style={{ fontSize: 8, color: '#21262d', display: 'flex', justifyContent: 'space-between', padding: '0 2px' }}>
          <span>Futures positioning only · OTC, swaps, and options delta not captured · Percentiles vs rolling 3-year range</span>
          <span>Source: CFTC Commitment of Traders · Weekly · 3-day reporting lag</span>
        </div>
      )}
    </div>
  )
}
